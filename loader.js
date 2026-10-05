// =============================================================
// 読み込み係（2026-10-03）
// 持ち方は2段階：入った瞬間に要る組は展開まで済ませて持つ。あとで要る組（light）はダウンロードだけ済ませて手放し、
// 出す時はブラウザの保存分からすぐ出す。動画は blob で持つ（数本・計1MB程度）
// 絵や動画が「出た後で遅れて描かれる」と興ざめなので、場面に入る前に次の場面の分を読んでおく。
// ・絵は展開（decode）まで済ませて持つ。動画はファイルごと手元（blob）に持ち、出す時はそれを使う
// ・同時に読むのは3本まで。「すぐ要る」ものは列の前へ、「そのうち要る」ものは後ろへ並べる
// ・スマホのメモリを食い過ぎないよう、場面の組ごとに持ち、使い終わった組は手放す
// ・出す瞬間に動画が間に合っていなければ、動画は出さず原画のまま（途中から動き出すのを見せない）
// 場面ごとに読む素材は assets/manifest.js（qa/genmanifest.mjs で作る一覧）から名前で選ぶ。
// =============================================================
(function () {
  const MAN = window.ASSET_MANIFEST || {};
  const ALL = Object.keys(MAN);
  const entries = new Map(); // url -> { kind, state: 'queued'|'loading'|'ready'|'error', img, blobUrl, done, p, sets:Set }
  const queue = [];
  let active = 0;
  const MAX = 3;
  const isVideo = (u) => /\.(mp4|webm)(\?|$)/i.test(u);
  const isImage = (u) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u);

  function pump() {
    while (active < MAX && queue.length) {
      const e = queue.shift();
      if (e.state !== 'queued') continue;
      e.state = 'loading'; active++;
      // 1本が詰まっても列全体が止まらないよう、時間切れで枠を空ける（その素材は「失敗」扱い＝出す時は原画のまま）
      let freed = false;
      const free = (ok) => { if (freed) return; freed = true; clearTimeout(wd); e.state = ok ? 'ready' : 'error'; active--; e.done(ok); pump(); };
      const wd = setTimeout(() => free(false), e.kind === 'video' ? 30000 : 20000);
      (e.kind === 'video' ? loadVideo(e) : loadImage(e)).then(free);
    }
  }
  function loadImage(e) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      let settled = false;
      // light の絵はダウンロードだけ済ませて手放す（展開した絵を何十枚も抱えるとスマホのメモリを圧迫する）
      const fin = (ok) => { if (settled) return; settled = true; if (ok && !e.light) e.img = im; res(ok); };
      im.onerror = () => fin(false);
      // 展開（decode）は裏のタブでは返ってこないことがあるので、1.5 秒で見切る（読み込み自体は済んでいる）
      im.onload = () => { if (im.decode) { im.decode().then(() => fin(true), () => fin(true)); setTimeout(() => fin(true), 1500); } else fin(true); };
      im.src = e.url;
    });
  }
  function loadVideo(e) {
    return fetch(e.url).then(r => r.ok ? r.blob() : Promise.reject()).then(b => { e.blobUrl = URL.createObjectURL(b); return true; }, () => false);
  }
  function entry(url, front) {
    let e = entries.get(url);
    if (!e) {
      const kind = isVideo(url) ? 'video' : isImage(url) ? 'image' : null;
      if (!kind) return null;
      e = { url, kind, state: 'queued', sets: new Set() };
      e.p = new Promise(r => { e.done = r; });
      entries.set(url, e);
      front ? queue.unshift(e) : queue.push(e);
    } else if (front && e.state === 'queued') {
      // 後ろに並んでいたものを「すぐ要る」に繰り上げる
      const i = queue.indexOf(e); if (i > 0) { queue.splice(i, 1); queue.unshift(e); }
    }
    return e;
  }

  const MA = {
    // 読んでおく。front=true なら列の前に割り込む。set=組の名前（あとで手放せるように）
    warm(urls, opts = {}) {
      const list = (urls || []).filter(Boolean);
      const es = (opts.front ? list.slice().reverse() : list).map(u => entry(u, !!opts.front)).filter(Boolean);
      if (opts.set) es.forEach(e => e.sets.add(opts.set));
      // 一度でも「手元に持つ」で頼まれたら持つ。light だけで頼まれたものは持たない
      es.forEach(e => { if (opts.light) { if (e.light == null) e.light = true; } else e.light = false; });
      pump();
      return Promise.all(es.map(e => e.p));
    },
    // 全部そろうまで待つ（最長 ms）。そろったら true
    ready(urls, ms = 4000, opts = {}) {
      const all = MA.warm(urls, { front: true, set: opts.set });
      return Promise.race([all.then(() => true), new Promise(r => setTimeout(() => r(false), ms))]);
    },
    isReady(url) { const e = entries.get(url); return !!e && e.state === 'ready'; },
    allReady(urls) { return (urls || []).every(u => { const e = entries.get(u); return e && (e.state === 'ready' || e.state === 'error'); }); },
    // 動画を出す時に使う src。手元に無ければ null（＝動画は出さず原画のまま）
    videoSrc(url) { const e = entries.get(url); return e && e.state === 'ready' && e.blobUrl ? e.blobUrl : null; },
    // 組を手放す（ほかの組でも使っているものは残す）
    release(set) {
      for (const [url, e] of entries) {
        if (!e.sets.has(set)) continue;
        e.sets.delete(set);
        if (e.sets.size) continue;
        if (e.state === 'queued') { const i = queue.indexOf(e); if (i >= 0) queue.splice(i, 1); }
        if (e.state === 'loading') continue; // 読み終わりを待つ（取り消さない）
        if (e.blobUrl) URL.revokeObjectURL(e.blobUrl);
        entries.delete(url);
      }
    },
    pick(re) { return ALL.filter(u => re.test(u)); },
    size(urls) { return (urls || []).reduce((a, u) => a + (MAN[u] || 0), 0); },
    stats() { const s = { queued: 0, loading: 0, ready: 0, error: 0 }; for (const e of entries.values()) s[e.state]++; return s; },
  };

  // ---------- 場面ごとの組 ----------
  const RICO_OUTFITS = /^(bunny|casual|dress|gym|kimono|pajama|santa|school|swimsuit|witch|ending)$/;
  MA.sets = {
    // タイトル：ロード画面で待つ
    title: () => ['assets/backgrounds/title_bg.webp', 'assets/ui/title_logo_hd.webp'],
    // ロビー：タイトルにいる間に読む
    lobby: () => ['assets/backgrounds/bg_lobby_clock.jpg', 'assets/motion/lobby_loop.mp4', 'assets/characters/rico_greet.webp',
      ...['rico', 'polka', 'selina', 'grano', 'velvet'].map(k => `assets/characters/${k}_default.webp`), 'assets/ui/card_back_default.webp'],
    // 対戦に入る瞬間に要るもの（そろうまで「準備中」で待つ）
    battleNow: (oppId, key) => [
      'assets/backgrounds/poker_table_bg.webp', `assets/backgrounds/table_${key}.webp`,
      `assets/characters/${key}_default.webp`, `assets/characters/${key}_panic.webp`,
      'assets/characters/mimi_bust_calm.webp', 'assets/characters/mimi_bust_think.webp',
      `assets/ui/face_${key}.webp`, 'assets/ui/face_mimi.webp', 'assets/ui/face_rico.webp', 'assets/ui/card_back_default.webp',
      `assets/episodes/${oppId}.webp`, `assets/motion/ep_${oppId}.mp4`,
    ].filter(u => MAN[u]),
    // 卓の相手の待機動画（呼吸・まばたき）。入った瞬間には要らないが、見える場所なので裏の列の先頭で読む
    battleIdle: (oppId) => [`assets/motion/idle_${oppId}.mp4`].filter(u => MAN[u]),
    // 対戦中に出るもの（裏で読む）：表情の顔アップ・読み合いの顔とミニキャラ・動画・演出の素材
    battleLater: (oppId, key) => MA.pick(new RegExp(
      `^assets/(characters/(${key}_|mimi_bust_|mimi_cutin_|mimi_clutch|mimi_allin|mimi_intermission|panyu)|battle/(face|chibi|motion)/(${key}|mimi)_|battle/chibi/rico_|ui/(fx_|stamp_|panyu_|frame_(psych|logic))|backgrounds/(bg_psych_stage|bg_result_stage|bg_intermission))`))
      .filter(u => !(key === 'rico' && RICO_OUTFITS.test((u.match(/rico_([a-z]+)\.webp$/) || [])[1] || ''))),
    // 勝った後のご褒美（いちばん後ろ）
    reward: (oppId) => [`assets/backgrounds/reward_cg_${oppId}.jpg`, `assets/motion/cg_${oppId}.mp4`].filter(u => MAN[u]),
  };
  window.MimiAssets = MA;
})();
