// =============================================================
// allstar-ui.js — クリア後の6人大会「零時の卓」の画面・演出・入口・保存・ご褒美。
// 進行と AI は allstar.js（Allstar）。ここは出来事（event）の列を順に演出するだけで、規則は持たない。
// 設計：docs/design-ref/allstar-plan.md（座標 PC 1280x800／スマホ横 844x390、演出の時間、台詞）。
// 外に出す名前は window.AllstarUI だけ。本編の state・結果・実績・連勝には混ぜない（大会は自前の T で動く）。
// game.js から呼ばれる所：render() の case 'allstar' → mount()、onAction の allstar-* → onAction()、goLobby → teardown()。
// home.js から：renderHomeLobby → decorateHome(root)。
// =============================================================
(() => {
  'use strict';
  const AS = (typeof Allstar !== 'undefined') ? Allstar : null;
  if (!AS) { console.warn('allstar-ui: allstar.js が読まれていません'); return; }

  // ---- 差し替えやすい絵（ここ1か所） ----
  const ART = {
    room: 'assets/backgrounds/bg_lobby_clock.jpg', // 部屋：暗く・ぼかして卓の奥に敷く
    opening: 'assets/ui/allstar_opening.webp',  // 六人着席の一枚絵（ChatGPT、2026-10-17）
    band: null,     // 入場案内の帯。null なら opening → room の順に代わりを使う
  };
  const FEE = 300;
  const PRIZES = AS.CONFIG.prizes;           // [1800, 900, 500, 300, 100, 0]
  const RIVALS = ['rico', 'polka', 'selina', 'grano', 'velvet'];
  const NAMES = { mimi: 'ミミ', rico: 'リコ先輩', polka: 'ポルカ', selina: 'セリナ', grano: 'グラーノ', velvet: 'ヴェルベット' };
  const SLOTS = ['me', 'left', 'bl', 'bc', 'br', 'right'];   // 席 0..5（Allstar.DEFAULT_SEATS の順＝時計回り）
  // battles/core.js の FACE_MAP の写し（IIFE の中で外から引けないため）
  const FACE_MAP = {
    polka: { think: 'smug', smug: 'smug', panic: 'panic', busted: 'busted' },
    selina: { think: 'compose', smug: 'smug', panic: 'panic', busted: 'busted' },
    grano: { think: 'haggle', smug: 'smug', panic: 'panic', busted: 'panic' },
    velvet: { think: 'smirk_hide', smug: 'smug', panic: 'panic', busted: 'busted' },
    rico: { think: 'smug', smug: 'smug', panic: 'panic', busted: 'busted' },
  };
  const MIMI_BUST = { calm: 1, think: 1, shock: 1, win: 1, sad: 1, smug: 1 };
  const MOTION_BUSTED = { polka: 1, selina: 1, grano: 1, velvet: 1 };
  const idleFace = (k) => `assets/ui/face_${k === 'rico' ? 'rico_default' : k}.webp`;
  const exprFace = (k, e) => k === 'mimi' ? `assets/battle/face/mimi_${{ think: 'think', smug: 'smug', panic: 'shock', busted: 'shock' }[e] || 'calm'}.webp`
    : `assets/battle/face/${k}_${(FACE_MAP[k] || FACE_MAP.polka)[e] || 'smug'}.webp`;
  const bustSrc = (e) => `assets/characters/mimi_bust_${MIMI_BUST[e] ? e : 'calm'}.webp`;

  // ---- 台詞（口調：リコ先輩＝アタシ・〜じゃん・〜だよ／ポルカ＝ボク／セリナ＝私・です・ます／グラーノ＝お嬢さん・〜ですよ／ヴェルベット＝あたし・〜なの） ----
  const LINES = {
    open: [['velvet', '六人で一つの卓。……あたしの劇場の、最後の演目なの'], ['rico', '今日は教えないよ。アタシも取りに行くから']],
    level5: ['velvet', 'そろそろ、守ってるだけじゃ負けるのよ'],
    midnight: ['rico', '零時じゃん。ここからが本番だよ'],
    bust: {
      rico: 'はい、アタシはここまで。……あとは自分で読みな',
      polka: 'うそっ、ボクが先!? ……ぜったい見てろよ！',
      selina: '……計算どおりに負けました。理屈では、ここまでですね',
      grano: 'これは……値付けを誤りましたな。お嬢さん、お手柔らかに',
      velvet: '……は？ あたしが、先に立つの？ ……覚えてなさいなの',
      mimi: 'ふぇ……わ、私が先に……！',
    },
    final: {
      rico: '最後はアタシとじゃん。……手加減はしないよ',
      polka: 'ボクとミミちゃんの決勝！ ぜったい負けないんだから！',
      selina: '残ったのは私とあなた。……計算の外で、決めましょう',
      grano: '最後の商談ですよ、お嬢さん。値は張りますよ',
      velvet: 'やっと二人きりなの。……幕を下ろすのは、あたしなの',
    },
    champion: {
      mimi: '……鐘が、十二回。私の、勝ちです！',
      rico: 'アタシの勝ちじゃん。……でも、いい卓だったよ',
      polka: 'やったー！ ボクがいちばん！',
      selina: '最後まで、計算どおりでした。',
      grano: '今夜の売り上げは、ぜんぶ私のものですよ',
      velvet: '当然なの。零時の主は、あたしなの',
    },
    act: {
      rico: { raise: ['ここは取りに行くよ', 'アタシの番じゃん', '悪いけど、今日は教えないよ'], allin: ['全部いくよ。ついて来れる？'], call: ['見せてもらうじゃん'], win: ['ふふ、もらったよ', 'これはアタシのだよ'] },
      polka: { raise: ['いっくよー！', 'ボクの番だね！', 'ここはボクがもらう！'], allin: ['ぜんぶ！ どーん！'], call: ['うーん……ついてく！'], win: ['やったー！ ボクの！', 'へへっ、いただき！'] },
      selina: { raise: ['この額が妥当です。', '少し、上げさせてもらいます。'], allin: ['全額です。計算は済んでいます。'], call: ['確かめさせてもらいます。'], win: ['想定どおりです。', '理屈どおりですね。'] },
      grano: { raise: ['お値段、少し上げますよ。', 'ここは仕入れ時ですよ。'], allin: ['在庫一掃、ぜんぶですよ。'], call: ['その値なら買いですよ。'], win: ['毎度ありがとうございますよ。', 'いい取引でしたよ、お嬢さん。'] },
      velvet: { raise: ['あたしの舞台なの。', '上げるの。ついて来られる？'], allin: ['全部なの。降りてもいいのよ？'], call: ['見せてもらうの。'], win: ['当然の結果なの。', 'ふふ、いただくの。'] },
    },
    // 相手同士の掛け合い（文字だけ）。[話す人, 台詞]。両方が卓に残っている時だけ出す
    banter: [
      [['polka', 'グラーノのおじさん、今日は値切らないの？'], ['grano', '卓の上では定価ですよ、お嬢さん']],
      [['selina', 'ヴェルベットさん、その笑い方は計算に入れにくいです。'], ['velvet', '入れなくていいの。外れるから']],
      [['rico', 'ポルカ、手が速すぎ。考えてから賭けな'], ['polka', '考えるより先に当たるんだもん！']],
      [['grano', 'セリナさん、確率のお勉強代はおいくらで？'], ['selina', '授業料はチップでいただきます。']],
      [['velvet', 'リコ、今日は先輩の顔をしないのね'], ['rico', '今夜は全員が客だよ。アタシもね']],
      [['polka', 'セリナ先輩の顔、ぜんぜん読めない……'], ['selina', '読ませないのが仕事ですから。']],
      [['grano', 'ヴェルベット嬢、その山、少し分けていただけませんか'], ['velvet', '欲しければ取りに来るの']],
      [['rico', '零時の卓って、空気が違うじゃん'], ['velvet', 'あたしが選んだ六人だもの。当然なの']],
      [['selina', '残り時間ではなく、残りのチップで考えるべきですね。'], ['grano', 'ごもっとも。在庫は大事ですよ']],
      [['polka', 'ねえリコ、ボクのこと見てた？'], ['rico', '見てたよ。だから今の手は降りたじゃん']],
      [['velvet', 'グラーノ、さっきから計算の顔ばかりなの'], ['grano', '商いは顔に出さないものですよ']],
      [['rico', 'セリナ、今の降り方は上手かったよ'], ['selina', '先輩に褒められると、少し困ります。']],
    ],
  };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (n) => Number(n || 0).toLocaleString('ja-JP');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isRed = (c) => c && (c.suit === '♥' || c.suit === '♦');
  const cKey = (c) => c ? `${c.suit}${c.rank}` : '';
  const STREET_JA = { preflop: 'プリフロップ', flop: 'フロップ', turn: 'ターン', river: 'リバー' };
  const KIND_JA = { fold: '降りた', check: 'チェック', call: 'コール', bet: 'ベット', raise: 'レイズ' };

  // ---- 称号（本編の ACHIEVEMENTS に2件足す。game.js は書き換えない） ----
  try {
    if (typeof ACHIEVEMENTS !== 'undefined' && !ACHIEVEMENTS.some(a => a.id === 'allstar_bell')) {
      ACHIEVEMENTS.push({ id: 'allstar_bell', icon: '鐘', name: '十二の鐘', desc: '零時の卓で優勝', cat: '大会' });
      ACHIEVEMENTS.push({ id: 'allstar_six', icon: '鐘', name: '六席の主', desc: '零時の卓の決勝で、5人それぞれに勝つ', cat: '大会' });
    }
    if (typeof GOLD_MARK_CAT !== 'undefined') GOLD_MARK_CAT['大会'] = '鐘';
  } catch (e) { /* 読み込み順が違う時は称号なしで動く */ }

  // =============================================================
  // 保存（save.allstar）。本編の state・結果には混ぜない
  // =============================================================
  function ensureSave() {
    if (typeof save === 'undefined' || !save) return null;
    const d = { v: 1, unlockSeen: false, invitationUsed: false, entries: 0, wins: 0, bestPlace: 0, places: [0, 0, 0, 0, 0, 0],
      finalVs: {}, sixDone: false, champion: 'velvet', history: [], firstWinAt: 0, firstWinHand: '', run: null };
    let A = save.allstar;
    if (!A || typeof A !== 'object') A = save.allstar = {};
    for (const k of Object.keys(d)) if (A[k] === undefined) A[k] = JSON.parse(JSON.stringify(d[k]));
    if (!Array.isArray(A.places) || A.places.length !== 6) A.places = [0, 0, 0, 0, 0, 0];
    if (!A.finalVs || typeof A.finalVs !== 'object') A.finalVs = {};
    for (const k of RIVALS) if (!A.finalVs[k]) A.finalVs[k] = { w: 0, l: 0 };
    if (!Array.isArray(A.history)) A.history = [];
    // 解放：ヴェルベットに通常対戦で勝った記録（bestRanks.velvet。勝った時だけ書かれ、コインのスキップでは書かれない）
    if (!save.allstarUnlocked && (save.clearedStages || []).includes('velvet') && save.bestRanks && save.bestRanks.velvet) {
      save.allstarUnlocked = true;
      try { saveProgress(); } catch (e) { }
    }
    return A;
  }
  const isUnlocked = () => { ensureSave(); return !!(save && save.allstarUnlocked); };
  function runInfo() {
    const A = ensureSave();
    if (!A || !A.run || !A.run.t) return null;
    const t = A.run.t;
    const alive = (t.players || []).filter(p => p.place == null && p.stack > 0).length;
    let lv = 1;
    try { lv = AS.levelInfo(t, (t.handNo || 0) + 1).level; } catch (e) { }
    return { alive, level: lv, hand: (t.handNo || 0) + 1 };
  }

  // =============================================================
  // 読み込み（入場案内を開いた時点で裏読み、着席で「すぐ要る」組を待つ）
  // =============================================================
  const MAN = () => window.ASSET_MANIFEST || {};
  const inMan = (u) => !window.ASSET_MANIFEST || !!MAN()[u];
  function setNow() {
    return [ART.room, 'assets/ui/card_back_default.webp', 'assets/ui/chip_red.webp', 'assets/ui/chip_white.webp', 'assets/ui/chip_gold.webp',
      'assets/characters/mimi_bust_calm.webp', 'assets/characters/mimi_bust_think.webp',
      ...['mimi', ...RIVALS].map(idleFace), ...RIVALS.map(k => exprFace(k, 'think'))].filter(inMan);
  }
  function setLater() {
    const u = [];
    for (const k of RIVALS) {
      u.push(exprFace(k, 'smug'), exprFace(k, 'panic'), exprFace(k, 'busted'), `assets/characters/${k}_cutin_busted.webp`);
      if (MOTION_BUSTED[k]) u.push(`assets/battle/motion/${k}_busted.mp4`);
    }
    u.push(...['shock', 'win', 'sad', 'smug'].map(bustSrc), 'assets/characters/mimi_cutin_bawl.webp', 'assets/backgrounds/bg_result_stage.jpg',
      'assets/characters/mimi_gold.webp', 'assets/ui/home/seal.webp');
    if (ART.opening) u.push(ART.opening);
    return u.filter(inMan);
  }
  const warmLater = () => { try { window.MimiAssets && MimiAssets.warm(setLater(), { set: 'allstar', light: true }); } catch (e) { } };

  // =============================================================
  // 進行の状態
  // =============================================================
  let T = null;          // 大会（Allstar.createTournament / restore）
  let host = null;       // .as-host
  let G = 0;             // 世代：teardown・新しい大会で進める。古い予約は動かない
  const STOP = { stop: true };
  let speed = 1;         // 早送り（ミミが降りた後は 3）
  let skipping = false;  // 演出を押して飛ばした（その区間の待ちを全部 0 にする）
  let humanResolve = null;
  let pendingStart = null;
  let D = null;          // 画面に出している数字（出来事で更新する。エンジンは先に進んでいるので T は読まない）
  let handLog = [];
  let lastShown = {};    // 席 → 最後にショーダウンで見せた役
  let finalOpp = null;   // 決勝の相手の席
  let finishEv = null;
  let summary = null;    // 結果の掲示板に出す内容
  let sizerOpen = false;
  const ui = {};         // よく触る要素

  function wait(ms) {
    const g = G;
    if (g !== G) return Promise.reject(STOP);
    if (skipping || ms <= 0) return Promise.resolve();
    return new Promise((res, rej) => setTimeout(() => (g === G ? res() : rej(STOP)), Math.max(0, ms / speed)));
  }
  const live = () => !!(host && host.isConnected);

  // =============================================================
  // 画面の組み立て（mount した後は丸ごと作り直さない）
  // =============================================================
  function seatHTML(s) {
    const k = SLOTS[s];
    if (s === 0) return '';
    const id = T.players[s].id;
    return `<div class="as-seat" data-seat="${s}" data-slot="${k}" data-state="wait">
      <button type="button" class="as-win" data-as="seat" data-s="${s}" aria-label="${esc(NAMES[id])}の席"><span class="as-win-in"><img class="as-face" src="${idleFace(id)}" alt=""></span><i class="as-spot"></i><i class="as-slab"><b>ALL IN</b></i></button>
      <div class="as-plate"><b class="as-name">${esc(NAMES[id])}</b><span class="as-stack">${fmt(T.players[s].stack)}</span><span class="as-rank"></span><i class="as-pos"></i><i class="as-fuse"></i></div>
      <div class="as-hole"></div>
      <div class="as-bet"><span class="as-verb"></span><i class="as-chips"></i><b class="as-amt"></b></div>
      <i class="as-d">D</i>
      <div class="as-out"><b></b></div>
    </div>`;
  }
  function build() {
    document.querySelectorAll('#stage > .as-host').forEach(e => e.remove());
    const stage = document.getElementById('stage');
    host = document.createElement('div');
    host.className = 'as-host';
    host.dataset.phase = 'table';
    host.innerHTML = `
      <canvas class="as-room" width="320" height="180" aria-hidden="true"></canvas><i class="as-room-glow" aria-hidden="true"></i>
      <i class="as-rail" aria-hidden="true"></i><i class="as-felt" aria-hidden="true"></i>
      <div class="as-head"><b class="as-head-1"></b><span class="as-head-2"></span></div>
      <button type="button" class="as-clock" data-as="levels" aria-label="ブラインドの段階表">
        <svg class="as-dial" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" class="as-dial-rim"/><circle cx="20" cy="20" r="16" class="as-dial-face"/>${Array.from({ length: 12 }, (_, i) => `<line x1="20" y1="5.2" x2="20" y2="${i % 3 ? 7 : 8.4}" transform="rotate(${i * 30} 20 20)"/>`).join('')}<line class="as-hh" x1="20" y1="20" x2="20" y2="11"/><line class="as-mh" x1="20" y1="20" x2="20" y2="7"/><circle cx="20" cy="20" r="1.6" class="as-dial-pin"/></svg>
        <span class="as-clock-t"><b class="as-lv"></b><span class="as-left"></span></span>
      </button>
      <div class="as-tools">
        <button type="button" class="as-tool" data-as="guide">役の一覧</button>
        <button type="button" class="as-tool as-sound" data-as="sound" aria-label="音の入り切り"></button>
        <button type="button" class="as-tool" data-as="menu">やめる</button>
      </div>
      ${T.players.map((p, s) => seatHTML(s)).join('')}
      <button type="button" class="as-pot" data-as="log"><span class="as-pot-l">ポット</span><b class="as-pot-n">0</b><span class="as-side"></span></button>
      <div class="as-sides" data-on="0"></div>
      <div class="as-board">${'<i class="as-slot"></i>'.repeat(5)}</div>
      <div class="as-sub" aria-live="polite"><div class="as-sub-in"><b class="as-sub-name"></b><span class="as-sub-text"></span></div></div>
      <div class="as-mimi">
        <div class="as-bust"><img src="${bustSrc('calm')}" alt="ミミ"></div>
        <div class="as-made"></div>
        <div class="as-mbet as-bet"><span class="as-verb"></span><i class="as-chips"></i><b class="as-amt"></b></div>
        <div class="as-mstack"><span>持ち点</span><b>${fmt(T.players[0].stack)}</b><i class="as-pos"></i></div>
        <div class="as-hand"></div>
        <i class="as-md as-d">D</i>
      </div>
      <div class="as-actions" data-on="0">
        <button type="button" class="as-cc" data-as="cc"><b class="as-cc-l">チェック</b><span class="as-cc-s"></span></button>
        <button type="button" class="as-fold" data-as="fold">降りる</button>
        <button type="button" class="as-raise" data-as="raise">賭ける</button>
      </div>
      <div class="as-sizer" data-on="0">
        <div class="as-sizer-h"><b>いくら賭ける？</b><button type="button" class="as-back" data-as="back">もどる</button></div>
        <div class="as-sizer-g"></div>
      </div>
      <button type="button" class="as-ff" data-as="ff" hidden><b>早送り中 ×3</b><span>押すと等速に戻す</span></button>
      <div class="as-fx" aria-hidden="true"></div>
      <div class="as-layer"></div>
      <i class="as-probe" aria-hidden="true"></i>`;
    stage.appendChild(host);
    ['head-1', 'head-2', 'lv', 'left', 'pot-n', 'sides', 'board', 'sub', 'sub-name', 'sub-text', 'mimi', 'made', 'mbet', 'mstack', 'hand', 'actions', 'sizer', 'ff', 'fx', 'layer', 'clock', 'probe', 'pot'].forEach(n => { ui[n] = host.querySelector('.as-' + n); });
    ui.bust = host.querySelector('.as-bust img');
    ui.seats = [];
    for (let s = 0; s < 6; s++) ui.seats[s] = s ? host.querySelector(`.as-seat[data-seat="${s}"]`) : ui.mimi;
    host.addEventListener('click', onHostClick);
    host.addEventListener('pointerdown', onHostDown, true);
    paintRoom();
    paintSound();
  }
  // 部屋：先にぼかして暗くした絵を1回だけ描く（動く画面で CSS の blur を使わない＝発熱しない）
  function paintRoom() {
    const cv = host.querySelector('.as-room');
    const im = new Image();
    im.onload = () => {
      if (!cv.isConnected) return;
      try {
        const ctx = cv.getContext('2d');
        const sm = document.createElement('canvas'); sm.width = 80; sm.height = 45;
        const sx = sm.getContext('2d');
        sx.imageSmoothingQuality = 'high';
        sx.drawImage(im, 0, 0, 80, 45);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sm, 0, 0, 320, 180);
        ctx.fillStyle = 'rgba(6,2,3,.66)'; ctx.fillRect(0, 0, 320, 180);
        cv.classList.add('is-ready');
      } catch (e) { }
    };
    im.src = ART.room;
  }
  function paintSound() {
    const b = host && host.querySelector('.as-sound');
    if (!b) return;
    const on = typeof isAnyAudioOn === 'function' ? isAnyAudioOn() : false;
    b.textContent = on ? '音 入' : '音 切';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // 画面の中の座標（host の px）。舞台の縮小・スマホの zoom を打ち消す
  function scaleK() { const r = ui.probe.getBoundingClientRect(); return r.width / 100 || 1; }
  function lrect(el) {
    const hr = host.getBoundingClientRect(), k = scaleK(), r = el.getBoundingClientRect();
    return { x: (r.left - hr.left) / k, y: (r.top - hr.top) / k, w: r.width / k, h: r.height / k };
  }

  // =============================================================
  // 描く小道具
  // =============================================================
  function cardHTML(c, cls = '') {
    if (!c) return `<i class="as-card is-back ${cls}"></i>`;
    return `<i class="as-card${isRed(c) ? ' is-red' : ''} ${cls}" data-k="${cKey(c)}"><span class="r">${c.label}</span><span class="s">${c.suit}</span><span class="c">${c.suit}</span></i>`;
  }
  function chipColors(n, bb) {
    const x = n / Math.max(1, bb);
    const cnt = Math.max(1, Math.min(6, Math.round(Math.log2(1 + x) * 1.6)));
    const cols = [];
    for (let i = 0; i < cnt; i++) cols.push(x >= 20 && i >= cnt - 2 ? 'gold' : x >= 4 && i % 2 ? 'red' : i % 3 === 2 ? 'gold' : i % 2 ? 'white' : 'red');
    return cols;
  }
  const chipsHTML = (n, bb) => n > 0 ? chipColors(n, bb).map((c, i) => `<i class="as-chip as-chip-${c}" style="--i:${i}"></i>`).join('') : '';
  function setBet(s, verb, amt, cls) {
    const el = s === 0 ? ui.mbet : ui.seats[s].querySelector('.as-bet');
    el.querySelector('.as-verb').textContent = verb || '';
    el.querySelector('.as-amt').textContent = amt > 0 ? fmt(amt) : '';
    el.querySelector('.as-chips').innerHTML = chipsHTML(amt, D ? D.bb : 50);
    el.dataset.on = (verb || amt > 0) ? '1' : '0';
    el.dataset.kind = cls || '';
  }
  function paintStack(s) {
    const n = D ? D.stacks[s] : T.players[s].stack;
    if (s === 0) ui.mstack.querySelector('b').textContent = fmt(n);
    else ui.seats[s].querySelector('.as-stack').textContent = fmt(n);
  }
  function setState(s, st) { if (s > 0) ui.seats[s].dataset.state = st; else ui.mimi.dataset.state = st; }
  function paintRanks() {
    if (!T) return;
    const st = AS.standings(T);
    // 全員が同じ持ち点（開幕直後）なら順位の札は出さない
    const even = new Set(st.filter(r => r.place == null).map(r => r.stack)).size <= 1;
    for (const r of st) {
      if (r.seat === 0) continue;
      const el = ui.seats[r.seat].querySelector('.as-rank');
      el.textContent = even || (r.place != null && !(r.place === 1 && T.finished)) ? '' : `${r.rank}位`;
    }
  }
  function paintHead() {
    const alive = T.players.filter(p => p.place == null).length;
    const st = AS.standings(T);
    const me = st.find(r => r.seat === 0);
    ui['head-1'].innerHTML = `零時の卓<span class="as-hand-no">HAND ${Math.max(1, T.handNo)}</span>`;
    ui['head-2'].textContent = finalOpp != null ? `決勝・ミミ ${me ? me.rank : '-'}位` : `残り${alive}人・ミミ ${me && me.place == null ? me.rank + '位' : (me ? me.place + '位' : '-')}`;
  }
  function paintClock(handNo) {
    const L = AS.levelInfo(T, handNo || Math.max(1, T.handNo));
    ui.lv.innerHTML = `<span class="as-lv-n">Lv.${L.level}</span><span class="as-lv-b">${fmt(L.sb)}／${fmt(L.bb)}</span>`;
    ui.left.textContent = L.handsLeftAfterThis > 0 ? `あと${L.handsLeftAfterThis}ハンド` : '次で上昇';
    ui.clock.dataset.mid = L.pastMidnight ? 'past' : L.midnight ? 'now' : '';
    setHands(L.clock);
  }
  function setHands(clock, spin) {
    const [hh, mm] = clock.split(':').map(Number);
    const mDeg = mm * 6 + (hh >= 12 ? 360 : 0) + (spin || 0);
    const hDeg = ((hh % 12) + mm / 60) * 30 + (hh >= 12 ? 360 : 0);
    host.querySelector('.as-mh').style.transform = `rotate(${mDeg}deg)`;
    host.querySelector('.as-hh').style.transform = `rotate(${hDeg}deg)`;
  }
  function paintPot() {
    ui['pot-n'].textContent = fmt(D.pot);
    ui.pot.dataset.on = D.pot > 0 ? '1' : '0';
    const pots = sidePots();
    const sides = pots.slice(1);
    let txt = '';
    if (sides.length === 1) txt = `サイド ${fmt(sides[0].amount)}`;
    else if (sides.length === 2) txt = sides.map((p, i) => `サイド${i + 1} ${fmt(p.amount)}`).join('　');
    else if (sides.length > 2) txt = `サイド計 ${fmt(sides.reduce((a, p) => a + p.amount, 0))}／${sides.length}`;
    ui.sides.textContent = txt;
    ui.sides.dataset.on = txt ? '1' : '0';
    host.querySelector('.as-side').textContent = sides.length ? `＋サイド ${fmt(sides.reduce((a, p) => a + p.amount, 0))}` : '';
  }
  // 画面の数字からサイドポットを組む（allstar.js の computePots と同じ考え方。エンジンは先に進んでいるので自前で数える）
  // サイドポットは、オールインした人の投入額で区切った層（オールインが無ければメインだけ）
  function sidePots() {
    if (!D) return [];
    const total = D.totalIn.reduce((a, b) => a + b, 0);
    const caps = [...new Set(D.totalIn.filter((x, s) => D.allIn[s] && !D.folded[s] && x > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0, used = 0;
    for (const cap of caps) {
      let amount = 0;
      for (let s = 0; s < 6; s++) amount += Math.max(0, Math.min(D.totalIn[s], cap) - prev);
      const el = []; for (let s = 0; s < 6; s++) if (!D.folded[s] && D.inHand[s] && D.totalIn[s] >= cap) el.push(s);
      if (amount > 0) pots.push({ amount, el });
      used += amount; prev = cap;
    }
    const rest = total - used;
    const restEl = []; for (let s = 0; s < 6; s++) if (!D.folded[s] && D.inHand[s] && D.totalIn[s] > prev) restEl.push(s);
    if (rest > 0) { if (restEl.length > 1 || !pots.length) pots.push({ amount: rest, el: restEl }); else pots[pots.length - 1].amount += rest; }
    return pots;
  }
  function paintBoard(cards, newFrom = 99) {
    ui.board.innerHTML = Array.from({ length: 5 }, (_, i) => cards[i] ? cardHTML(cards[i], i >= newFrom ? 'is-new' : '') : '<i class="as-slot"></i>').join('');
  }
  function paintHole(s, mode, cards) {
    // mode: 'none' | 'back' | 'face'
    const el = s === 0 ? ui.hand : ui.seats[s].querySelector('.as-hole');
    el.dataset.mode = mode;
    if (mode === 'none') { el.innerHTML = ''; return; }
    if (mode === 'back') { el.innerHTML = cardHTML(null) + cardHTML(null); return; }
    el.innerHTML = (cards || []).map(c => cardHTML(c)).join('');
  }
  function paintMade() {
    if (!D || !D.hole0 || D.board.length < 3 || D.folded[0]) { ui.made.textContent = ''; ui.made.dataset.on = '0'; return; }
    let name = '';
    try { name = evaluateHand(D.hole0.concat(D.board)).name; } catch (e) { }
    ui.made.innerHTML = name ? `<span>役</span><b>${esc(name)}</b>` : '';
    ui.made.dataset.on = name ? '1' : '0';
  }
  function setFace(s, expr) {
    const id = T.players[s].id;
    if (s === 0) { ui.bust.src = bustSrc(expr === 'busted' ? 'sad' : expr === 'panic' ? 'shock' : expr || 'calm'); return; }
    const img = ui.seats[s].querySelector('.as-face');
    const src = expr ? exprFace(id, expr) : idleFace(id);
    if (img.getAttribute('src') !== src) img.src = src;
    img.dataset.e = expr || '';
  }
  const faceTimers = {};
  function flashFace(s, expr, ms = 1300) {
    setFace(s, expr);
    clearTimeout(faceTimers[s]);
    const g = G;
    faceTimers[s] = setTimeout(() => { if (g === G && live() && T.players[s].place == null) setFace(s, s === 0 ? 'calm' : null); }, ms / speed);
  }
  // 字幕の帯（相手の台詞）。ms 後に消える。await すると読み終わるまで待つ
  let subTimer = 0;
  function say(k, text, ms = 1800) {
    if (!live()) return Promise.resolve();
    ui['sub-name'].textContent = NAMES[k] || '';
    ui['sub-text'].textContent = `「${text}」`;
    ui.sub.dataset.on = '1';
    ui.sub.dataset.k = k;
    clearTimeout(subTimer);
    const g = G;
    subTimer = setTimeout(() => { if (g === G && live()) ui.sub.dataset.on = '0'; }, Math.max(600, ms / speed));
    return wait(ms);
  }
  function aliveId(k) { const p = T.players.find(x => x.id === k); return p && p.place == null; }

  // 飛ぶもの（配る札・チップ）。from/to は要素
  function fly(from, to, html, cls, dur) {
    if (!live() || skipping) return Promise.resolve();
    const a = lrect(from), b = lrect(to);
    const el = document.createElement('i');
    el.className = 'as-fly ' + (cls || '');
    el.innerHTML = html;
    el.style.left = (a.x + a.w / 2) + 'px'; el.style.top = (a.y + a.h / 2) + 'px';
    ui.fx.appendChild(el);
    const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    const d = Math.max(60, dur / speed);
    const an = el.animate([{ transform: 'translate(-50%,-50%) scale(.9)', opacity: 0.2 }, { opacity: 1, offset: 0.2 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1 }], { duration: d, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    return an.finished.catch(() => { }).then(() => el.remove());
  }
  const betEl = (s) => s === 0 ? ui.mbet : ui.seats[s].querySelector('.as-bet');
  const holeEl = (s) => s === 0 ? ui.hand : ui.seats[s].querySelector('.as-hole');
  const winEl = (s) => s === 0 ? ui.mstack : ui.seats[s].querySelector('.as-win');
  function flyChips(fromEl, toEl, amt) {
    return fly(fromEl, toEl, chipsHTML(Math.max(amt, D.bb * 2), D.bb), 'is-chips', 300);
  }
  function countUp(el, from, to, ms) {
    const t0 = performance.now(), g = G;
    const step = (now) => {
      if (g !== G || !el.isConnected) return;
      const k = Math.min(1, (now - t0) / Math.max(1, ms / speed));
      el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1 && !skipping) requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }
  function sfx(k) { try { if (typeof mpSfx === 'function') mpSfx(k); } catch (e) { } }
  function bell(n = 1, gap = 200) {
    try {
      if (typeof isSfxOn === 'function' && !isSfxOn()) return;
      if (typeof mpTone !== 'function') return;
      for (let i = 0; i < n; i++) {
        mpTone(392, 1.6, 'sine', 0.06, 0.004, 1.4, i * gap);
        mpTone(784, 1.1, 'sine', 0.025, 0.004, 1.0, i * gap);
        mpTone(1176, 0.7, 'triangle', 0.012, 0.004, 0.6, i * gap);
      }
    } catch (e) { }
  }

  // 重ね窓（帯・判・カットイン）を layer に出す
  function layerEl(cls, html) {
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    ui.layer.appendChild(el);
    return el;
  }

  // =============================================================
  // 出来事の演出
  // =============================================================
  async function play(evs) {
    for (const e of evs) {
      if (!live()) throw STOP;
      switch (e.type) {
        case 'level-up': await onLevelUp(e); break;
        case 'button-draw': await onButtonDraw(e); break;
        case 'hand-start': await onHandStart(e); break;
        case 'post-blind': onBlind(e); break;
        case 'deal': await onDeal(e); break;
        case 'action': await onAct(e); break;
        case 'return': onReturn(e); break;
        case 'reveal': await onReveal(e); break;
        case 'street': await onStreet(e); break;
        case 'showdown': await onShowdown(e); break;
        case 'award': await onAward(e); break;
        case 'hand-end': await onHandEnd(e); break;
        case 'bust': await onBust(e); break;
        case 'heads-up': await onHeadsUp(e); break;
        case 'finish': finishEv = e; break;
        case 'to-act': break;
      }
    }
  }

  async function onLevelUp(e) {
    // 針が1目盛り進む → 真鍮の札 → SB／BB 更新（1,800ms）。零時（Lv7）だけ鐘
    const prevClock = AS.levelInfo(T, (e.prevLevel - 1) * T.cfg.handsPerLevel + 1).clock;
    setHands(prevClock);
    await wait(60);
    setHands(e.clock);
    ui.clock.classList.add('is-tick');
    const b = layerEl('as-banner' + (e.midnight ? ' is-midnight' : ''), `<span class="as-banner-k">${e.midnight ? '零時' : 'ブラインド上昇'}</span><b>${fmt(e.sb)}／${fmt(e.bb)}</b><span class="as-banner-lv">Lv.${e.level}　${e.clock}</span>`);
    sfx('milestone');
    if (e.midnight) bell(1);
    await wait(1500);
    b.classList.add('out');
    ui.clock.classList.remove('is-tick');
    await wait(300);
    b.remove();
    if (e.level === 5 && aliveId('velvet')) await say(...LINES.level5, 1700);
    if (e.midnight && aliveId('rico')) await say(...LINES.midnight, 1500);
  }

  async function onButtonDraw(e) {
    // 6枚を表向きに配って、ハイカードがボタン
    for (const d of e.draws) {
      const el = holeEl(d.seat);
      el.dataset.mode = 'draw';
      el.innerHTML = cardHTML(d.card, 'is-new');
      sfx('flip');
      await wait(110);
    }
    await wait(500);
    holeEl(e.button).querySelector('.as-card').classList.add('is-high');
    showDealer(e.button);
    await say('rico', `ボタンは${e.button === 0 ? 'ミミ' : NAMES[T.players[e.button].id]}からだよ`, 1100);
    for (const d of e.draws) paintHole(d.seat, 'none');
  }
  function showDealer(seat) {
    host.querySelectorAll('.as-d').forEach(x => { x.dataset.on = '0'; });
    if (seat == null) return;
    const d = seat === 0 ? host.querySelector('.as-md') : ui.seats[seat].querySelector('.as-d');
    d.dataset.on = '1';
  }

  async function onHandStart(e) {
    speed = 1; ui.ff.hidden = true;
    D = { hand: e.hand, sb: e.sb, bb: e.bb, stacks: e.stacks.slice(), bets: [0, 0, 0, 0, 0, 0], totalIn: [0, 0, 0, 0, 0, 0],
      inHand: e.stacks.map(x => x > 0), folded: [false, false, false, false, false, false],
      allIn: [false, false, false, false, false, false], board: [], pot: 0, hole0: null, shown: {}, showdown: false };
    handLog = [];
    hideActions();
    paintBoard([]);
    ui.made.dataset.on = '0';
    host.querySelectorAll('.as-card.is-win').forEach(x => x.classList.remove('is-win'));
    for (let s = 0; s < 6; s++) {
      setBet(s, '', 0);
      if (s > 0) {
        if (!D.inHand[s]) { setState(s, 'out'); paintHole(s, 'none'); }
        else { setState(s, 'wait'); paintHole(s, 'none'); setFace(s, null); }
        ui.seats[s].querySelector('.as-pos').textContent = '';
      } else {
        setState(0, 'wait'); paintHole(0, 'none'); setFace(0, 'calm');
        ui.mstack.querySelector('.as-pos').textContent = '';
      }
      paintStack(s);
    }
    showDealer(e.deadButton ? null : e.button);
    const tag = (s, t) => { const el = s === 0 ? ui.mstack.querySelector('.as-pos') : ui.seats[s].querySelector('.as-pos'); el.textContent = t; };
    if (e.sbSeat != null) tag(e.sbSeat, e.headsUp ? 'SB・D' : 'SB');
    tag(e.bbSeat, 'BB');
    paintClock(e.hand);
    paintHead();
    paintRanks();
    paintPot();
    // 相手同士の掛け合い（たまに・文字だけ）
    if (e.hand > 1 && finalOpp == null && Math.random() < 0.14) {
      const cand = LINES.banter.filter(b => b.every(([k]) => aliveId(k)));
      if (cand.length) {
        const b = pickOne(cand);
        say(b[0][0], b[0][1], 1700).then(() => live() && say(b[1][0], b[1][1], 1700)).catch(() => { });
      }
    }
  }
  function onBlind(e) {
    D.stacks[e.seat] -= e.amount;
    D.bets[e.seat] += e.amount; D.totalIn[e.seat] += e.amount;
    D.pot += e.amount;
    if (e.allIn) D.allIn[e.seat] = true;
    setBet(e.seat, e.blind === 'sb' ? 'SB' : 'BB', D.bets[e.seat]);
    paintStack(e.seat);
    paintPot();
  }
  async function onDeal(e) {
    // 上の文字盤から各席へ 220ms の飛行、70ms 間隔で2周
    sfx('deal');
    const flights = [];
    for (let r = 0; r < 2; r++) {
      for (const s of e.order) {
        flights.push(fly(ui.clock, holeEl(s), cardHTML(null), 'is-card' + (s === 0 ? ' is-mine' : ''), 220));
        await wait(70);
      }
    }
    await Promise.all(flights);
    for (const s of e.order) if (s !== 0) paintHole(s, 'back');
    if (e.mine) { D.hole0 = e.mine.hole.slice(); paintHole(0, 'face', D.hole0); ui.hand.querySelectorAll('.as-card').forEach(c => c.classList.add('is-new')); sfx('flip'); }
    else paintHole(0, 'none');
    paintMade();
  }

  const BIG = (e) => e.allIn || ((e.kind === 'raise' || e.kind === 'bet') && e.to >= Math.max(D.bb * 8, e.pot * 0.45));
  async function onAct(e) {
    const s = e.seat, id = T.players[s].id;
    const before = D.bets[s];
    D.stacks[s] = e.stack;
    D.bets[s] = e.to;
    D.totalIn[s] += e.amount;
    D.pot = e.pot;
    if (e.allIn) D.allIn[s] = true;
    const who = s === 0 ? 'ミミ' : NAMES[id];
    handLog.push(`${STREET_JA[streetNow()] || ''}　${who}　${e.allIn ? 'オールイン ' + fmt(e.to) : KIND_JA[e.kind] + (e.kind === 'call' || e.kind === 'bet' || e.kind === 'raise' ? ' ' + fmt(e.to) : '')}`);
    setTurn(null);
    // 表情 160ms → 行動語 200ms → チップ 300ms
    if (s > 0 && e.kind !== 'check') {
      const expr = e.kind === 'fold' ? (Math.random() < 0.5 ? 'panic' : null) : BIG(e) ? pickOne(['smug', 'smug', 'think']) : (Math.random() < 0.35 ? 'think' : null);
      if (expr) flashFace(s, expr, 1300);
      await wait(160);
    }
    if (e.kind === 'fold') {
      D.folded[s] = true;
      setState(s, 'folded');
      setBet(s, '降りた', before > 0 ? before : 0, 'fold');
      const hole = holeEl(s);
      if (s === 0) { ui.made.dataset.on = '0'; }
      hole.classList.add('is-mucking');
      sfx('fold');
      await wait(260);
      hole.classList.remove('is-mucking');
      paintHole(s, 'none');
      if (s === 0) startFastForward();
    } else {
      const verb = e.allIn ? 'オールイン' : KIND_JA[e.kind];
      setBet(s, verb, e.kind === 'check' ? D.bets[s] : e.to, e.allIn ? 'allin' : e.kind);
      paintStack(s);
      sfx(e.allIn ? 'allin' : e.kind === 'check' ? 'check' : e.kind === 'call' ? 'call' : 'bet');
      if (e.allIn) { setState(s, 'allin'); wipeSlab(s); }
      await wait(200);
      if (e.amount > 0) { await flyChips(winEl(s), betEl(s), e.amount); }
      paintPot();
      if (s > 0 && BIG(e) && Math.random() < 0.6) lightCut(s, e.allIn ? 'smug' : pickOne(['smug', 'think']));
    }
    // 台詞（たまに。手の強さとは結び付けない）
    if (s > 0) {
      const L = LINES.act[id];
      const r = Math.random();
      const kind = e.allIn ? 'allin' : (e.kind === 'bet' || e.kind === 'raise') ? 'raise' : e.kind === 'call' ? 'call' : null;
      const p = kind === 'allin' ? 0.5 : kind === 'raise' ? 0.22 : kind === 'call' ? 0.07 : 0;
      if (L && kind && r < p) say(id, pickOne(L[kind]), 1500).catch(() => { });
    }
    await wait(e.kind === 'fold' ? 120 : 260);
  }
  function wipeSlab(s) {
    const el = s === 0 ? null : ui.seats[s].querySelector('.as-slab');
    if (!el) { layerEl('as-mimi-allin', '<b>ALL IN</b>'); setTimeout(() => host && host.querySelector('.as-mimi-allin')?.remove(), 1100); return; }
    el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
  }
  function lightCut(s, expr) {
    const id = T.players[s].id;
    const w = ui.seats[s].querySelector('.as-win');
    const r = lrect(w);
    const el = layerEl('as-light', `<span class="as-light-in"><img src="${exprFace(id, expr)}" alt=""></span>`);
    const right = r.x > 640 || (host.offsetWidth && r.x > host.offsetWidth / 2);
    el.style.left = (right ? r.x - 150 : r.x + r.w + 10) + 'px';
    el.style.top = Math.max(4, r.y - 10) + 'px';
    setTimeout(() => el.remove(), 900 / speed + 200);
  }
  function onReturn(e) {
    D.stacks[e.seat] += e.amount;
    D.bets[e.seat] = Math.max(0, D.bets[e.seat] - e.amount);
    D.totalIn[e.seat] = Math.max(0, D.totalIn[e.seat] - e.amount);
    D.pot = Math.max(0, D.pot - e.amount);
    if (D.stacks[e.seat] > 0) D.allIn[e.seat] = false;
    setBet(e.seat, D.bets[e.seat] > 0 ? '戻り' : '', D.bets[e.seat]);
    paintStack(e.seat);
    paintPot();
  }
  async function revealSeat(s, hole) {
    if (D.shown[s]) return;
    D.shown[s] = true;
    if (s === 0) return;
    const el = holeEl(s);
    el.dataset.mode = 'face';
    el.innerHTML = hole.map(c => cardHTML(c, 'is-flip')).join('');
    sfx('flip');
    await wait(160);
  }
  async function onReveal(e) {
    // オールインで賭けが終わった：残りを配る前に全員を表に
    await sweepBets();
    for (const r of e.reveals) await revealSeat(r.seat, r.hole);
    await wait(400);
  }
  async function sweepBets() {
    const moving = [];
    for (let s = 0; s < 6; s++) if (D.bets[s] > 0) { moving.push(flyChips(betEl(s), ui.pot, D.bets[s])); }
    for (let s = 0; s < 6; s++) { D.bets[s] = 0; if (D.allIn[s] && !D.folded[s]) setBet(s, 'オールイン', 0, 'allin'); else setBet(s, '', 0); }
    if (moving.length) { sfx('bet'); await Promise.all(moving); }
  }
  let curStreet = 'preflop';
  const streetNow = () => curStreet;
  async function onStreet(e) {
    await sweepBets();
    curStreet = e.name;
    const from = D.board.length;
    D.board = e.board.slice();
    D.pot = e.pot;
    paintPot();
    if (e.name === 'flop') {
      for (let i = 0; i < 3; i++) { paintBoard(D.board.slice(0, from + i + 1), from + i); sfx('flip'); await wait(120); }
    } else {
      paintBoard(D.board, from); sfx('flip'); await wait(200);
    }
    paintMade();
    await wait(D.folded[0] ? 200 : 380);
  }
  async function onShowdown(e) {
    D.showdown = true;
    await sweepBets();
    for (const r of e.reveals) {
      lastShown[r.seat] = r.name;
      if (r.seat !== 0) await revealSeat(r.seat, r.hole);
      const verb = r.name || '';
      setBet(r.seat, verb, 0, 'show');
    }
    await wait(500);
  }
  async function onAward(e) {
    // 勝った役の5枚に金の縁（600ms 脈打つ）→ チップが勝った人へ
    host.querySelectorAll('.as-card.is-win').forEach(x => x.classList.remove('is-win'));
    if (e.bestFive && !e.uncontested) {
      const keys = new Set(e.bestFive.map(cKey));
      host.querySelectorAll('.as-board .as-card, .as-hole .as-card, .as-hand .as-card').forEach(c => { if (keys.has(c.dataset.k)) c.classList.add('is-win'); });
    }
    const label = e.pot === 0 ? 'メイン' : `サイド${e.pot}`;
    const names = e.winners.map(s => s === 0 ? 'ミミ' : NAMES[T.players[s].id]).join('・');
    handLog.push(`${label}　${names}が ${fmt(e.amount)} を取る${e.hand ? '（' + e.hand + '）' : ''}`);
    if (e.uncontested) await sweepBets();
    const flies = [];
    for (const sh of e.shares) {
      flies.push(flyChips(ui.pot, winEl(sh.seat), sh.amount));
      D.stacks[sh.seat] += sh.amount;
    }
    D.pot = Math.max(0, D.pot - e.amount);
    if (e.pot === 0) D.totalIn.fill(0);
    sfx(e.winners.includes(0) ? (e.amount >= D.bb * 20 ? 'bigwin' : 'win') : 'bet');
    if (e.winners.includes(0)) setFace(0, e.amount >= D.bb * 10 ? 'win' : 'smug');
    else if (D.inHand[0] && !D.folded[0] && !e.uncontested) setFace(0, 'shock');
    for (const w of e.winners) if (w > 0) { flashFace(w, 'smug', 1500); if (Math.random() < (e.amount >= D.bb * 12 ? 0.55 : 0.18) && LINES.act[T.players[w].id]) say(T.players[w].id, pickOne(LINES.act[T.players[w].id].win), 1500).catch(() => { }); }
    await Promise.all(flies);
    for (const sh of e.shares) paintStack(sh.seat);
    paintPot();
    ui.pot.querySelector('.as-pot-l').textContent = e.hand && !e.uncontested ? e.hand : 'ポット';
    await wait(e.uncontested ? 400 : 900);
  }
  async function onHandEnd(e) {
    D.stacks = e.stacks.slice();
    for (let s = 0; s < 6; s++) paintStack(s);
    await wait(D.showdown ? 1000 : 700);
    curStreet = 'preflop';
    ui.pot.querySelector('.as-pot-l').textContent = 'ポット';
    D.pot = 0; D.totalIn.fill(0); paintPot();
    paintRanks();
    paintHead();
  }

  // ---- 脱落（約4,500ms、1,000ms 以後は押して飛ばせる） ----
  async function onBust(e) {
    const s = e.seat, k = e.id;
    skippable(1000);
    setFace(s, 'busted');
    await wait(300);
    await cutIn(k, LINES.bust[k], `${e.place}位`, s === 0);
    setState(s, 'out');
    if (s > 0) {
      const out = ui.seats[s].querySelector('.as-out b');
      out.textContent = `${e.place}位 ${NAMES[k]}`;
      paintHole(s, 'none'); setBet(s, '', 0);
    }
    await wait(600);
    endSkippable();
    paintHead();
    if (s === 0) throw MIMI_OUT;
  }
  const MIMI_OUT = { mimiOut: true };
  function cutIn(k, line, place, mimi) {
    return new Promise((resolve) => {
      const g = G;
      const vidUrl = MOTION_BUSTED[k] ? `assets/battle/motion/${k}_busted.mp4` : null;
      const vsrc = vidUrl && window.MimiAssets ? MimiAssets.videoSrc(vidUrl) : null;
      const img = mimi ? 'assets/characters/mimi_cutin_bawl.webp' : `assets/characters/${k}_cutin_busted.webp`;
      const media = vsrc ? `<video src="${vsrc}" muted playsinline autoplay preload="auto" poster="${img}"></video>` : `<img src="${img}" alt="">`;
      const el = layerEl('as-cut', `<i class="as-cut-scrim"></i><div class="as-cut-band"><div class="as-cut-media">${media}</div></div><div class="as-cut-line"><b>${esc(NAMES[k])}</b><span>「${esc(line)}」</span></div><i class="as-seal">${esc(place)}</i>`);
      if (!vsrc && vidUrl && window.MimiAssets) MimiAssets.warm([vidUrl], { set: 'allstar' });
      requestAnimationFrame(() => el.classList.add('on'));
      sfx(mimi ? 'lose' : 'double-lose');
      const done = () => { if (g !== G) return; el.classList.add('out'); setTimeout(() => el.remove(), 260); resolve(); };
      let ms = 3200, t0 = performance.now();
      const tick = () => { if (g !== G || !el.isConnected) return resolve(); if (skipping || performance.now() - t0 >= ms / speed) done(); else setTimeout(tick, 60); };
      setTimeout(tick, 60);
    });
  }
  // 押して飛ばせる区間
  let skipFrom = 0, skipOn = false;
  function skippable(after) { skipOn = true; skipFrom = performance.now() + after; }
  function endSkippable() { skipOn = false; skipping = false; }
  function onHostDown() { if (skipOn && performance.now() >= skipFrom) skipping = true; }

  // ---- 決勝（2,000ms） ----
  async function onHeadsUp(e) {
    if (!e.seats.includes(0)) return;
    finalOpp = e.seats.find(s => s !== 0);
    host.classList.add('is-final');
    ui.seats[finalOpp].dataset.final = '1';
    const sl = layerEl('as-final-slab', '<span>FINAL</span><b>決勝</b>');
    sfx('reach');
    try { if (typeof playSceneBgm === 'function' && isBgmOn()) playSceneBgm('boss'); } catch (err) { }
    await wait(1700);
    sl.classList.add('out');
    await wait(300);
    sl.remove();
    paintHead();
    await say(T.players[finalOpp].id, LINES.final[T.players[finalOpp].id], 2000);
    if (run()) { run().finalVs = T.players[finalOpp].id; }
  }

  // ---- 優勝（3,200ms → 結果） ----
  async function champion(winSeat) {
    const k = T.players[winSeat].id;
    skippable(800);
    host.classList.add('is-crown');
    if (winSeat > 0) ui.seats[winSeat].dataset.crown = '1';
    setHands('12:00', 360);
    ui.clock.dataset.mid = 'now';
    bell(12, 200);
    const fl = layerEl('as-crown', `<i class="as-crown-glow"></i><div class="as-crown-t"><span>十二の鐘</span><b>${winSeat === 0 ? '優勝　ミミ' : '優勝　' + esc(NAMES[k])}</b></div>`);
    requestAnimationFrame(() => fl.classList.add('on'));
    await wait(1200);
    await say(k, LINES.champion[k], 2000);
    endSkippable();
  }

  // =============================================================
  // ミミの手番
  // =============================================================
  function setTurn(s) {
    host.querySelectorAll('[data-turn]').forEach(x => x.removeAttribute('data-turn'));
    if (s == null) { host.removeAttribute('data-turn'); return; }
    host.dataset.turn = s;
    if (s > 0) ui.seats[s].dataset.turn = '1'; else ui.mimi.dataset.turn = '1';
  }
  async function thinkPhase(seat) {
    setTurn(seat);
    const L = AS.legalActions(T);
    const allinCall = L && L.toCall > 0 && (L.callIsAllIn || D.allIn.some((a, i) => a && i !== seat && !D.folded[i]));
    const ms = allinCall ? 700 + Math.random() * 700 : 350 + Math.random() * 550;
    const fuse = ui.seats[seat].querySelector('.as-fuse');
    fuse.style.setProperty('--fuse', (ms / speed) + 'ms');
    fuse.classList.remove('is-on'); void fuse.offsetWidth; fuse.classList.add('is-on');
    if (Math.random() < 0.4) flashFace(seat, 'think', ms + 200);
    await wait(ms);
    fuse.classList.remove('is-on');
  }
  function humanTurn() {
    const L = AS.legalActions(T);
    setTurn(0);
    setFace(0, 'think');
    showActions(L);
    const g = G;
    return new Promise((res, rej) => { humanResolve = (a) => { humanResolve = null; hideActions(); g === G ? res(a) : rej(STOP); }; });
  }
  function showActions(L) {
    const cc = ui.actions.querySelector('.as-cc');
    const potOdds = typeof hasNote === 'function' && hasNote('pot_odds') && L.toCall > 0;
    cc.querySelector('.as-cc-l').textContent = L.canCheck ? 'チェック' : L.callIsAllIn ? 'コール（全部）' : 'コール';
    cc.querySelector('.as-cc-s').textContent = L.canCheck ? '' : `${fmt(L.toCall)}${potOdds ? `　必要${Math.round(L.toCall / (L.pot + L.toCall) * 100)}%` : ''}`;
    const raise = ui.actions.querySelector('.as-raise');
    raise.textContent = L.isBet ? '賭ける' : '上げる';
    raise.disabled = !L.canRaise;
    ui.actions.querySelector('.as-fold').disabled = false;
    ui.actions.dataset.on = '1';
    ui.actions._L = L;
    closeSizer();
  }
  function hideActions() { if (!ui.actions) return; ui.actions.dataset.on = '0'; closeSizer(); }
  function openSizer() {
    const L = ui.actions._L;
    const P = AS.raisePresets(T);
    if (!P || !L) return;
    const rows = [['小', '最小', P.min], ['中', 'ポットの2/3', P.twoThirds], ['大', 'ポット', P.pot], ['ぜんぶ', 'オールイン', P.allin]];
    ui.sizer.querySelector('.as-sizer-g').innerHTML = rows.map(([a, b, to]) => `<button type="button" class="as-size${a === 'ぜんぶ' ? ' is-all' : ''}" data-as="size" data-to="${to}"><b>${a}</b><span>${b}</span><em>${fmt(to)}まで</em></button>`).join('');
    ui.sizer.dataset.on = '1';
    ui.actions.dataset.on = '0';
    sizerOpen = true;
  }
  function closeSizer() { if (!ui.sizer) return; ui.sizer.dataset.on = '0'; if (sizerOpen && humanResolve) ui.actions.dataset.on = '1'; sizerOpen = false; }
  function startFastForward() { if (T.finished) return; speed = 3; ui.ff.hidden = false; }

  // =============================================================
  // 押した所（host に1つの委任）
  // =============================================================
  function onHostClick(ev) {
    const b = ev.target.closest('[data-as]');
    closePops(ev.target);
    if (!b || !host.contains(b) || b.disabled) return;
    const a = b.dataset.as;
    if (a === 'cc' && humanResolve) { const L = ui.actions._L; sfx('tap'); humanResolve({ kind: L.canCheck ? 'check' : 'call' }); }
    else if (a === 'fold' && humanResolve) { sfx('tap'); humanResolve({ kind: 'fold' }); }
    else if (a === 'raise' && humanResolve) { sfx('tap'); openSizer(); }
    else if (a === 'back') { closeSizer(); }
    else if (a === 'size' && humanResolve) { sfx('tap'); humanResolve({ kind: 'raise', to: +b.dataset.to }); }
    else if (a === 'ff') { speed = 1; ui.ff.hidden = true; }
    else if (a === 'guide') { try { showHandGuide(); } catch (e) { } }
    else if (a === 'sound') { try { toggleAllAudio(); } catch (e) { } paintSound(); if (isBgmOn()) playSceneBgm(finalOpp != null ? 'boss' : 'allstar'); }
    else if (a === 'menu') openMenu();
    else if (a === 'levels') openLevels();
    else if (a === 'log') openLog();
    else if (a === 'seat') openSeatPop(+b.dataset.s);
    else if (a === 'leave') leaveTable();
    else if (a === 'again') { openEntry(); }
    else if (a === 'home') { goHome(); }
    else if (a === 'menu-close') closePops();
  }
  function closePops(target) {
    host.querySelectorAll('.as-pop').forEach(p => { if (!target || !p.contains(target) || target.closest('[data-as="menu-close"]')) p.remove(); });
  }
  function pop(cls, html, anchor) {
    closePops();
    const el = layerEl('as-pop ' + cls, html);
    if (anchor) {
      const r = lrect(anchor), W = lrect(host).w || 1280;
      el.style.left = Math.max(8, Math.min(r.x, W - 268)) + 'px';
      el.style.top = (r.y + r.h + 6) + 'px';
    }
    return el;
  }
  function openSeatPop(s) {
    if (!T) return;
    const p = T.players[s];
    const pos = AS.positionLabels(T)[s];
    const POSJA = { BTN: 'ボタン', SB: 'スモールブラインド', BB: 'ビッグブラインド', UTG: '最初に話す席', HJ: '後ろから3番目', CO: 'ボタンの右' };
    const bb = D ? D.bb : AS.levelInfo(T).bb;
    const rec = (T.recent[s] || []).slice(-3).reverse().map(r => `<li>${STREET_JA[r.street] || ''}　${r.allIn ? 'オールイン' : KIND_JA[r.kind] || r.kind}${r.to ? ' ' + fmt(r.to) : ''}</li>`).join('') || '<li>まだ動いていません</li>';
    const stack = D ? D.stacks[s] : p.stack;
    pop('as-seatpop', `<b class="as-pop-h">${esc(NAMES[p.id])}</b><p>持ち点 ${fmt(stack)}（${(stack / bb).toFixed(1)} BB）</p><p>位置 ${pos ? POSJA[pos] || pos : p.place != null ? `${p.place}位で退席` : '—'}</p><ul>${rec}</ul><button type="button" class="as-pop-x" data-as="menu-close">閉じる</button>`, ui.seats[s].querySelector('.as-win'));
  }
  function openLevels() {
    const cur = AS.levelInfo(T, Math.max(1, T.handNo)).level;
    pop('as-levels', `<b class="as-pop-h">ブラインドの段階（5ハンドごと）</b><table>${AS.levelTable(10).map(r => `<tr${r.level === cur ? ' class="is-cur"' : ''}><td>Lv.${r.level}</td><td>${r.fromHand}〜${r.toHand}</td><td>${fmt(r.sb)}／${fmt(r.bb)}</td><td>${r.midnight ? '零時' : r.clock}</td></tr>`).join('')}</table><button type="button" class="as-pop-x" data-as="menu-close">閉じる</button>`);
  }
  function openLog() {
    pop('as-log', `<b class="as-pop-h">このハンドの流れ</b><ol>${handLog.slice(-12).map(l => `<li>${esc(l)}</li>`).join('') || '<li>まだ何もありません</li>'}</ol><button type="button" class="as-pop-x" data-as="menu-close">閉じる</button>`);
  }
  function openMenu() {
    const on = typeof isAnyAudioOn === 'function' && isAnyAudioOn();
    pop('as-menu', `<b class="as-pop-h">卓を離れますか？</b><p>このハンドの頭から、続きを再開できます。</p><div class="as-menu-b"><button type="button" data-as="leave" class="as-gold">中断してホームへ</button><button type="button" data-as="sound">${on ? '音を切る' : '音を入れる'}</button><button type="button" data-as="menu-close">続ける</button></div>`);
  }
  function leaveTable() {
    saveRun();
    goHome();
  }
  function goHome() {
    try { goLobby(); } catch (e) { teardown(); }
  }

  // =============================================================
  // 開幕・再開・進行の本体
  // =============================================================
  async function opening() {
    // 一枚絵（今は部屋）→ 溶けて卓へ → 文字盤が落ちる → ミミから時計回りに席へ灯り → 台詞2つ → 第1ハンド
    skippable(800);
    host.dataset.op = 'title';
    const art = ART.opening;
    const ov = layerEl('as-open', `${art ? `<img class="as-open-art" src="${art}" alt="">` : ''}<div class="as-open-t"><span class="as-open-en">THE MIDNIGHT TABLE</span><b>零時の卓</b><span class="as-open-sub">六席の決勝卓</span></div>`);
    requestAnimationFrame(() => ov.classList.add('on'));
    bell(1);
    await wait(1300);
    ov.classList.add('out');
    host.dataset.op = 'table';
    await wait(500);
    host.dataset.op = 'clock';
    sfx('bet');
    await wait(400);
    host.dataset.op = 'seats';
    for (let s = 0; s < 6; s++) {
      const el = s === 0 ? ui.mimi : ui.seats[s];
      el.classList.add('is-lit');
      const num = s === 0 ? ui.mstack.querySelector('b') : el.querySelector('.as-stack');
      countUp(num, 0, T.players[s].stack, 300);
      sfx('tap');
      await wait(340);
    }
    for (const [k, t] of LINES.open) await say(k, t, 1100);
    endSkippable();
    ov.remove();
    host.dataset.op = '';
    host.querySelectorAll('.is-lit').forEach(x => x.classList.remove('is-lit'));
    for (let s = 0; s < 6; s++) { D = null; paintStack(s); }
  }
  async function resumeIntro() {
    host.dataset.op = '';
    const b = layerEl('as-banner', `<span class="as-banner-k">再開</span><b>HAND ${T.handNo + 1}</b><span class="as-banner-lv">このハンドの頭から</span>`);
    await wait(1300);
    b.classList.add('out');
    await wait(260);
    b.remove();
  }
  function run() { const A = ensureSave(); return A && A.run; }
  function saveRun() {
    const A = ensureSave();
    if (!A || !A.run || !T || T.finished) return;
    try { A.run.t = AS.serialize(T); A.run.finalVs = finalOpp != null ? T.players[finalOpp].id : (A.run.finalVs || null); saveProgress(); } catch (e) { console.warn(e); }
  }
  async function loop() {
    const g = G;
    try {
      while (g === G && !T.finished) {
        if (!T.hand || T.hand.done) {
          saveRun();
          const ev = AS.startHand(T);
          await play(ev);
          continue;
        }
        const seat = T.hand.toAct;
        if (seat == null) { await wait(60); continue; }
        if (T.players[seat].human) {
          const act = await humanTurn();
          await play(AS.applyAction(T, act));
        } else {
          await thinkPhase(seat);
          const r = AS.stepAI(T);
          await play(r.events);
        }
      }
      if (g !== G) return;
      // 最後のハンド：優勝
      const w = finishEv ? finishEv.winner : AS.standings(T)[0].seat;
      await champion(w);
      await showResult();
    } catch (e) {
      if (e === MIMI_OUT) { if (g === G) await afterMimiOut(); return; }
      if (e !== STOP && e && !e.stop) { console.error(e); try { toast('零時の卓でエラーが起きました。続きはホームから再開できます', 'big'); } catch (x) { } if (g === G) { saveRun(); goHome(); } }
    }
  }
  // ミミが脱落：残りを裏で計算して順位を確定 → 結果（観戦は作らない）
  async function afterMimiOut() {
    const g = G;
    hideActions();
    // 決勝で負けた：相手の優勝を見せてから結果へ
    if (T.finished) { const w = AS.standings(T).find(r => r.place === 1); if (w) await champion(w.seat); await showResult(); return; }
    const b = layerEl('as-banner is-calc', '<span class="as-banner-k">残りの卓</span><b>順位を確定しています</b><span class="as-banner-lv">零時の針が進む</span>');
    for (let i = 0; i < 400 && !T.finished; i++) {
      const ev = AS.playHandAuto(T);
      for (const e of ev) {
        if (e.type === 'showdown') for (const r of e.reveals) lastShown[r.seat] = r.name;
        if (e.type === 'finish') finishEv = e;
      }
      await new Promise(r => setTimeout(r, 0));
      if (g !== G) return;
    }
    if (!T.finished) AS.fastForward(T, { keepEvents: false });
    b.remove();
    await showResult();
  }

  // =============================================================
  // 結果：順位の掲示板・賞金・記録
  // =============================================================
  function payout() {
    const A = ensureSave();
    const r = A.run;
    if (!r || r.paid) return summary;
    r.paid = true;
    const me = T.players[0];
    const place = me.place || 1;
    const prize = me.prize || 0;
    const st = AS.standings(T);
    const winner = st.find(x => x.place === 1) || st[0];
    const finalVs = r.finalVs || null;
    const extras = [];
    let bonus = 0;
    const lastHand = place === 1 ? (lastShown[0] || '') : (lastShown[0] || '');
    A.places[place - 1]++;
    if (!A.bestPlace || place < A.bestPlace) A.bestPlace = place;
    A.champion = winner.id;
    if (finalVs && A.finalVs[finalVs]) { if (place === 1) A.finalVs[finalVs].w++; else A.finalVs[finalVs].l++; }
    if (place === 1) {
      A.wins++;
      if (A.wins === 1) {
        A.firstWinAt = Date.now(); A.firstWinHand = lastHand;
        try { unlockAchievement('allstar_bell'); } catch (e) { }
        extras.push('称号「十二の鐘」');
        let owned = false;
        try { owned = isItemOwned('mimi_skin_gold'); } catch (e) { }
        if (!owned) {
          try { save.ownedItems.push('mimi_skin_gold'); applyItemEffect('mimi_skin_gold', { equip: false }); applyEquippedStyles(); } catch (e) { }
          extras.push('衣装「ミミ・黄金」');
        } else { bonus += 1500; extras.push('衣装は所持済み → 1,500 コイン'); }
      }
      if (!A.sixDone && RIVALS.every(k => A.finalVs[k].w > 0)) {
        A.sixDone = true; bonus += 2000;
        try { unlockAchievement('allstar_six'); } catch (e) { }
        extras.push('称号「六席の主」＋2,000 コイン');
      }
    }
    save.coins = (save.coins || 0) + prize + bonus;
    A.history.unshift({ at: Date.now(), place, hands: T.handNo, finalVs, lastHand, prize: prize + bonus });
    A.history = A.history.slice(0, 10);
    A.run = null;
    saveProgress();
    summary = { place, prize, bonus, extras, winner: winner.id, st, hands: T.handNo };
    return summary;
  }
  async function showResult() {
    const S = payout() || summary;
    if (!S || !live()) return;
    hideActions();
    host.dataset.phase = 'result';
    try { if (isBgmOn()) playSceneBgm(S.place === 1 ? 'victory' : 'allstar'); } catch (e) { }
    const rows = S.st.slice().sort((a, b) => (a.place || 9) - (b.place || 9));
    const big = S.place === 1 ? '優勝' : `第<span class="as-tcu">${S.place}</span>位`;
    const mimiImg = S.place === 1 ? bustSrc('win') : S.place <= 3 ? bustSrc('smug') : bustSrc('sad');
    const el = layerEl('as-result', `
      <div class="as-res-mimi"><img src="${mimiImg}" alt="ミミ"></div>
      <div class="as-res-big"><b>${big}</b><span>金時計杯</span></div>
      <ol class="as-res-board">${rows.map(r => `<li class="as-res-row${r.seat === 0 ? ' is-me' : ''}" data-place="${r.place}" style="--d:${(6 - r.place) * 180}ms">
        <span class="as-res-pl">${r.place}<small>位</small></span>
        <span class="as-res-face"><img src="${idleFace(r.id)}" alt=""></span>
        <b class="as-res-name">${esc(NAMES[r.id])}</b>
        <span class="as-res-hand">${esc(lastShown[r.seat] || '—')}</span>
        <span class="as-res-prize">${r.prize ? fmt(r.prize) : '0'}</span>
        <span class="as-res-sealc">${r.place === 1 ? '<img class="as-res-seal" src="assets/ui/home/seal.webp" alt="">' : ''}</span>
      </li>`).join('')}</ol>
      <div class="as-res-pay"><span>賞金</span><b class="as-res-coins">0</b><span>コイン</span>${S.extras.length ? `<em>${esc(S.extras.join('・'))}</em>` : ''}</div>
      <div class="as-res-btns"><button type="button" class="as-gold" data-as="again">もう一度</button><button type="button" data-as="home">ホームへ</button></div>`);
    requestAnimationFrame(() => el.classList.add('on'));
    sfx(S.place === 1 ? 'bigwin' : S.place <= 4 ? 'win' : 'lose');
    const g = G;
    setTimeout(() => { if (g === G && el.isConnected) countUp(el.querySelector('.as-res-coins'), 0, S.prize + S.bonus, 800); }, 1300);
  }

  // =============================================================
  // 入口：ホームの札・額、入場案内、記録
  // =============================================================
  function decorateHome(root) {
    const A = ensureSave();
    if (!A || !root) return;
    const ticket = root.querySelector('.h15-ticket');
    if (!save.allstarUnlocked) {
      // ヴェルベットを（勝たずに）済ませている時だけ、錠の一言を添える
      if ((save.clearedStages || []).includes('velvet') && ticket) {
        const pz = ticket.querySelector('.h15-prize');
        if (pz && !pz.querySelector('.as-lock')) pz.insertAdjacentHTML('beforeend', '<span class="as-lock">零時の卓：ヴェルベットに勝つと開く</span>');
      }
      return;
    }
    const ri = runInfo();
    if (ticket) {
      ticket.dataset.action = ri ? 'allstar-resume' : 'allstar-open';
      delete ticket.dataset.opponent;
      ticket.querySelector('.h15-lbl').textContent = '零時の卓へ';
      ticket.querySelector('.h15-prize').innerHTML = ri ? `<span>続きから・残り${ri.alive}人・Lv${ri.level}</span>` : `<span><i class="h15-if">優勝 </i>${fmt(PRIZES[0])} コイン</span>`;
      ticket.setAttribute('aria-label', ri ? `零時の卓の続きから。残り${ri.alive}人、Lv${ri.level}` : `零時の卓へ。優勝 ${fmt(PRIZES[0])} コイン`);
    }
    const frame = root.querySelector('.h15-frame');
    if (frame) {
      const ch = A.champion || 'velvet';
      frame.querySelector('.h15-pic').src = idleFace(ch);
      frame.querySelector('.h15-pic').alt = NAMES[ch];
      frame.querySelector('.h15-lbl').textContent = NAMES[ch];
      frame.querySelector('.h15-sub').textContent = ch === 'mimi' ? '王者' : '現王者';
      frame.classList.toggle('has-long-name', NAMES[ch].length > 5);
      frame.dataset.action = 'allstar-record';
      frame.classList.add('as-champ');
      delete frame.dataset.char;
      frame.setAttribute('aria-label', `現王者 ${NAMES[ch]}。零時の卓の記録を見る`);
    }
    if (!A.unlockSeen) {
      A.unlockSeen = true;
      try { saveProgress(); } catch (e) { }
      setTimeout(() => { try { if (state && state.screen === 'lobby') toast('零時の卓が開きました。ホームの札から入れます', 'big'); } catch (e) { } }, 2600);
    }
    warmLater();
  }

  function facesRow() {
    return ['mimi', ...RIVALS].map(k => `<span class="as-ef"><span class="as-ef-w"><img src="${idleFace(k)}" alt=""></span><b>${esc(NAMES[k])}</b></span>`).join('');
  }
  function fitDialog(overlay) {
    const dlg = overlay.querySelector('.home-dialog');
    if (!dlg || !document.documentElement.classList.contains('is-compact')) return;
    const r = overlay.getBoundingClientRect();
    dlg.style.setProperty('--as-w', Math.round(Math.min(r.width, innerWidth) - 16) + 'px');
    dlg.style.setProperty('--as-h', Math.round(Math.min(r.height, innerHeight) - 12) + 'px');
  }
  function openEntry() {
    const A = ensureSave();
    if (!A) return;
    if (!isUnlocked()) { try { toast('零時の卓は、ヴェルベットに勝つと開きます'); } catch (e) { } return; }
    warmLater();
    const ri = runInfo();
    const free = !A.invitationUsed;
    const can = free || (save.coins || 0) >= FEE;
    const band = ART.band || ART.opening || ART.room;
    const feeLine = free ? '<b class="as-inv">招待状</b>　初回は参加費が無料です' : `参加費 ${fmt(FEE)} コイン（所持 ${fmt(save.coins)}）`;
    const btns = ri
      ? `<button type="button" class="as-gold" data-action="allstar-resume">続きから（残り${ri.alive}人・Lv${ri.level}）</button><button type="button" data-action="allstar-new"${can ? '' : ' disabled'}>新しく始める</button>`
      : `<button type="button" class="as-gold" data-action="allstar-seat"${can ? '' : ' disabled'}>着席する</button>`;
    const overlay = document.createElement('div');
    overlay.className = 'home-overlay as-overlay';
    overlay.innerHTML = `<section class="home-dialog as-dialog as-entry" role="dialog" aria-modal="true" aria-labelledby="as-entry-title">
      <header><h2 id="as-entry-title">入場案内</h2><button type="button" data-home-close>閉じる</button></header>
      <div class="as-band" style="--art:url('${band}')"><span class="as-band-en">THE MIDNIGHT TABLE</span><b>零時の卓</b><span class="as-band-sub">六席の決勝卓</span></div>
      <div class="as-efaces">${facesRow()}</div>
      <div class="as-ecols">
        <ul class="as-rules"><li>全員 1,500 点から。持ち込み・買い足しはなし</li><li>5ハンドごとにブラインドが上がる</li><li>持ち点が尽きたら退席。最後の1人が優勝</li></ul>
        <div class="as-prizes"><b class="as-prizes-h">賞金（コイン）</b><ol>${PRIZES.map((p, i) => `<li${i === 3 ? ' class="is-bubble"' : ''}><span>${i + 1}位</span><b>${fmt(p)}</b></li>`).join('')}</ol></div>
      </div>
      <p class="as-emeta">目安 12〜15分　／　${feeLine}${can ? '' : '　<span class="as-warn">コインが足りません</span>'}</p>
      <div class="as-ebtns">${btns}</div>
    </section>`;
    openHomeDialog(overlay);
    fitDialog(overlay);
  }
  function openRecord() {
    const A = ensureSave();
    if (!A) return;
    const ch = A.champion || 'velvet';
    const hist = A.history.map(h => `<li><span>${new Date(h.at).toLocaleDateString('ja-JP')}</span><b>${h.place}位</b><span>${h.hands}ハンド</span><span>${h.finalVs ? '決勝 ' + esc(NAMES[h.finalVs]) : ''}</span><span>${h.prize ? fmt(h.prize) + ' コイン' : ''}</span></li>`).join('') || '<li>まだ大会の記録はありません</li>';
    const overlay = document.createElement('div');
    overlay.className = 'home-overlay as-overlay';
    overlay.innerHTML = `<section class="home-dialog as-dialog as-record" role="dialog" aria-modal="true" aria-labelledby="as-rec-title">
      <header><h2 id="as-rec-title">金時計杯の記録</h2><button type="button" data-home-close>閉じる</button></header>
      <div class="as-rec-top"><span class="as-ef"><span class="as-ef-w"><img src="${idleFace(ch)}" alt=""></span><b>${ch === 'mimi' ? '王者' : '現王者'}　${esc(NAMES[ch])}</b></span>
        <dl><div><dt>優勝</dt><dd>${A.wins}回</dd></div><div><dt>最高順位</dt><dd>${A.bestPlace ? A.bestPlace + '位' : '—'}</dd></div><div><dt>参加</dt><dd>${A.entries}回</dd></div></dl></div>
      <div class="as-rec-cols">
        <div class="as-rec-vs"><b class="as-prizes-h">決勝の相手別（勝ち－負け）</b><ol>${RIVALS.map(k => `<li${A.finalVs[k].w ? ' class="is-won"' : ''}><span>${esc(NAMES[k])}</span><b>${A.finalVs[k].w}－${A.finalVs[k].l}</b></li>`).join('')}</ol></div>
        <ol class="as-rec-hist">${hist}</ol>
      </div>
      <div class="as-ebtns"><button type="button" class="as-gold" data-action="allstar-open">入場案内へ</button></div>
    </section>`;
    openHomeDialog(overlay);
    fitDialog(overlay);
  }

  // 着席：参加費 → 大会を作って保存 → 先読みを待つ → 卓へ
  async function seat(resume) {
    const A = ensureSave();
    if (!A) return;
    if (!resume) {
      const free = !A.invitationUsed;
      if (!free && (save.coins || 0) < FEE) { try { toast(`コインが足りません（${FEE}コイン必要）`); } catch (e) { } return; }
    }
    const MA = window.MimiAssets;
    let close = () => { };
    try { close = showLoadingVeil(); } catch (e) { }
    try { if (MA) await MA.ready(setNow(), 6000, { set: 'allstar' }); } catch (e) { }
    close();
    let t;
    if (resume && A.run && A.run.t) {
      try { t = AS.restore(A.run.t); } catch (e) { console.warn(e); try { toast('保存した大会が読めなかったので、記録なしで終わりにしました', 'big'); } catch (x) { } A.run = null; saveProgress(); return; }
    } else {
      const free = !A.invitationUsed;
      if (free) A.invitationUsed = true; else save.coins -= FEE;
      A.entries++;
      t = AS.createTournament({ seed: Math.floor(Math.random() * 2 ** 31) });
      A.run = { v: 1, t: AS.serialize(t), startedAt: Date.now(), fee: free ? 0 : FEE, paid: false, finalVs: null };
      saveProgress();
    }
    begin(t, !!resume);
  }
  function begin(t, resumed) {
    teardownTable();
    T = t;
    G++;
    speed = 1; skipping = false; skipOn = false;
    finalOpp = null; finishEv = null; summary = null; lastShown = {}; D = null; curStreet = 'preflop';
    // 決勝の途中で再開したら、決勝の見た目から
    const alive = T.players.filter(p => p.place == null);
    try { battleGen++; } catch (e) { }
    state = defaultState();
    state.screen = 'allstar';
    pendingStart = async () => {
      if (alive.length === 2 && alive.some(p => p.seat === 0)) {
        finalOpp = alive.find(p => p.seat !== 0).seat;
        host.classList.add('is-final');
        ui.seats[finalOpp].dataset.final = '1';
      }
      for (const p of T.players) if (p.place != null && p.seat > 0) { setState(p.seat, 'out'); ui.seats[p.seat].querySelector('.as-out b').textContent = `${p.place}位 ${NAMES[p.id]}`; }
      const g = G;
      try { if (resumed) await resumeIntro(); else await opening(); } catch (e) { if (e !== STOP) console.error(e); return; }
      if (g === G) loop();
    };
    render();
    try { if (isBgmOn()) playSceneBgm(finalOpp != null ? 'boss' : 'allstar'); } catch (e) { }
  }
  function mount() {
    if (!T) { setTimeout(goHome, 0); return; }
    if (host && host.isConnected) return;
    build();
    for (let s = 0; s < 6; s++) paintStack(s);
    paintClock(Math.max(1, T.handNo + 1));
    paintHead();
    paintRanks();
    if (pendingStart) { const p = pendingStart; pendingStart = null; p(); }
  }
  function teardownTable() {
    G++;
    humanResolve = null;
    if (host) { host.remove(); host = null; }
    document.querySelectorAll('#stage > .as-host').forEach(e => e.remove());
  }
  function teardown() {
    const r = T && run();
    if (r && !r.paid) {
      // ミミが退席した後や、優勝が決まった後に離れた：残りを計算して、賞金と記録を確定する
      if (T.finished || T.players[0].place != null) { try { if (!T.finished) AS.fastForward(T, { keepEvents: false }); payout(); } catch (e) { console.warn(e); } }
      else saveRun();
    }
    teardownTable();
    T = null; D = null;
    try { window.MimiAssets && MimiAssets.release('allstar'); } catch (e) { }
  }

  function onAction(action, data) {
    switch (action) {
      case 'allstar-open': openEntry(); break;
      case 'allstar-record': openRecord(); break;
      case 'allstar-seat': seat(false); break;
      case 'allstar-resume': {
        if (!runInfo()) { openEntry(); break; }
        seat(true); break;
      }
      case 'allstar-new': {
        showConfirm({ title: '前の大会を捨てて始める？', body: '途中の大会は記録なしで終わります。参加費は戻りません。', ok: '新しく始める', cancel: 'やめる', danger: true }).then(yes => {
          if (!yes) return;
          const A = ensureSave(); A.run = null; saveProgress();
          seat(false);
        });
        break;
      }
    }
  }

  // ---- 検査の出入口（qa/allstarshot.mjs だけが使う） ----
  const _qa = {
    T: () => T,
    get speed() { return speed; },
    autoMimi: false,
    // 次のハンドの前に持ち点を組み替える（合計は保つ）。stacks: 席ごとの持ち点（0 は退席扱いにしない）
    rig(stacks) { if (!T || (T.hand && !T.hand.done)) return false; const tot = stacks.reduce((a, b) => a + b, 0); if (tot !== T.totalChips) return false; T.players.forEach((p, i) => { if (p.place == null) p.stack = stacks[i]; }); return true; },
    actMimi(kind) { if (humanResolve) { const L = ui.actions._L; if (kind === 'auto') humanResolve(AS.decideAction(T, 0)); else if (kind === 'allin') humanResolve({ kind: L.canRaise ? 'raise' : 'call', to: L.canRaise ? L.maxRaiseTo : undefined }); else if (kind === 'fold') humanResolve({ kind: 'fold' }); else humanResolve({ kind: L.canCheck ? 'check' : 'call' }); return true; } return false; },
    waiting: () => !!humanResolve,
    phase: () => host ? host.dataset.phase : null,
    openSizer, closePops,
    banner: () => layerEl('as-banner', '<span class="as-banner-k">試験</span><b>75／150</b><span class="as-banner-lv">Lv.3</span>'),
  };

  window.AllstarUI = { mount, teardown, onAction, decorateHome, openEntry, openRecord, ensureSave, isUnlocked, runInfo, ART, _qa };
})();
