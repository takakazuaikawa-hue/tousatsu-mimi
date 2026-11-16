// =============================================================
// baccarat-ui.js — クリア後のおまけ「バカラ」の画面・進行・絞り・運命の女神・リコ先輩の解説。
// 規則と罫線は baccarat.js（Baccarat）、札をめくる絞りは baccarat-squeeze.js（BaccaratSqueeze）。
// 役の分担（2026-11-16 ユーザー）：
//   ・運命の女神＝横から茶々を入れ、方針を聞いてくる。次の結果を知っているのは女神だけ。
//     気分に合う返事をして、言ったことを守るとご機嫌が上がり、満ちると口をすべらせて「神託」をくれる。
//     返事と違う賭け方（裏切り）もできる。裏切るとご機嫌が下がる。
//   ・リコ先輩＝まっとうな解説（決まり・配当・罫線の読み方・絞りの見方・確率の本当の話）。
//   ・ディーラー＝新キャラ（案を選んでもらってから絵と口調を入れる。それまでは名前の札だけ）。
// 外に出す名前は window.BaccaratUI だけ。本編の state・結果・実績には混ぜない。
// game.js から：render() の case 'baccarat' → mount()、onAction の baccarat-* → onAction()、goLobby → teardown()。
// 画面は「画面の本当の px」で組む（舞台の縮みを --inv-scale で打ち消す）。文字は type-roles.css の役目の段（--r-*）。
// =============================================================
(() => {
  'use strict';
  const BC = window.Baccarat, SQ = window.BaccaratSqueeze;
  if (!BC || !SQ) { console.warn('baccarat-ui: baccarat.js / baccarat-squeeze.js が読まれていません'); return; }

  // ---- 差し替えやすい絵（ここ1か所。null の間は名前の札・紋章で出す） ----
  const ART = {
    room: 'assets/backgrounds/bg_lobby_clock.jpg',
    back: 'assets/ui/card_back_default.webp',
    dealer: null,          // ディーラーの上半身（案が決まったら）
    goddess: null,         // 運命の女神（横から身を乗り出す絵）
    rico: 'assets/ui/face_chibi_rico.webp',
    mimi: 'assets/ui/face_chibi_mimi.webp',
  };
  const DEALER_NAME = 'ディーラー';
  const SIDE_JA = { P: 'プレイヤー', B: 'バンカー', T: '引き分け' };
  const SPOTS = [['PP', 'プレイヤーのペア', '11倍'], ['P', 'プレイヤー', '1倍'], ['T', '引き分け', '8倍'], ['B', 'バンカー', '1倍 −5%'], ['BP', 'バンカーのペア', '11倍']];
  const C = BC.CONFIG;
  const fmt = (n) => Number(n || 0).toLocaleString('ja-JP');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const other = (w) => (w === 'P' ? 'B' : 'P');
  const sfx = (k) => { try { if (typeof mpSfx === 'function') mpSfx(k); } catch (e) { } };
  const STOP = { stop: 1 };

  let host = null, ui = {}, G = 0, S = null, sq = null, tapResolve = null, betResolve = null;
  const live = () => !!(host && host.isConnected);
  function wait(ms) {
    const g = G;
    return new Promise((res, rej) => setTimeout(() => (g === G && live() ? res() : rej(STOP)), ms));
  }

  // =============================================================
  // 保存（save.baccarat）
  // =============================================================
  function store() {
    if (typeof save === 'undefined' || !save) return null;
    const d = { v: 1, demoSeen: false, godSeen: false, hands: 0, net: 0, best: 0, kept: 0, broken: 0, outwit: 0, oracles: 0, favor: 0, shoe: null, res: [], last: null, chip: 10, sq: true, asked: 0 };
    let A = save.baccarat;
    if (!A || typeof A !== 'object') A = save.baccarat = {};
    for (const k of Object.keys(d)) if (A[k] === undefined) A[k] = JSON.parse(JSON.stringify(d[k]));
    if (!Array.isArray(A.res)) A.res = [];
    return A;
  }
  const keep = () => { try { saveProgress(); } catch (e) { } };
  const coins = () => Math.max(0, Math.floor(save.coins || 0));
  const isUnlocked = () => { try { return !!isEndingUnlocked(); } catch (e) { return false; } };

  // =============================================================
  // 画面の組み立て
  // =============================================================
  function build() {
    document.querySelectorAll('#stage > .bc-host').forEach(e => e.remove());
    host = document.createElement('div');
    host.className = 'bc-host';
    host.dataset.phase = 'bet';
    host.innerHTML = `<div class="bc-view">
      <canvas class="bc-room" width="320" height="180" aria-hidden="true"></canvas>
      <header class="bc-top">
        <b class="bc-title">バカラ</b><span class="bc-shoe"></span>
        <nav class="bc-tools">
          <button type="button" data-bc="demo">お手本</button>
          <button type="button" data-bc="guide">リコ先輩の解説</button>
          <button type="button" data-bc="sqmode" class="bc-sqmode"></button>
          <button type="button" data-bc="quit">やめる</button>
        </nav>
      </header>
      <button type="button" class="bc-roads" data-bc="roads" aria-label="罫線を大きく見る">
        <span class="bc-roads-h"><b>罫線</b><span class="bc-count"></span></span>
        <canvas class="bc-rd bc-rd-bead"></canvas>
        <canvas class="bc-rd bc-rd-big"></canvas>
        <span class="bc-rd3"><canvas class="bc-rd bc-rd-eye"></canvas><canvas class="bc-rd bc-rd-small"></canvas><canvas class="bc-rd bc-rd-roach"></canvas></span>
        <span class="bc-next"></span>
      </button>
      <section class="bc-table">
        <div class="bc-dealer"><b>${DEALER_NAME}</b></div>
        <div class="bc-side bc-p" data-side="P"><span class="bc-side-n">プレイヤー</span><b class="bc-tot"></b><div class="bc-cards"></div></div>
        <div class="bc-side bc-b" data-side="B"><span class="bc-side-n">バンカー</span><b class="bc-tot"></b><div class="bc-cards"></div></div>
        <div class="bc-banner" aria-live="polite"></div>
      </section>
      <aside class="bc-god">
        <div class="bc-god-pic">${ART.goddess ? `<img src="${ART.goddess}" alt="運命の女神">` : wheelSVG()}</div>
        <b class="bc-god-n">運命の女神</b>
        <div class="bc-favor" aria-label="女神のご機嫌"><span>ご機嫌</span><i></i><i></i><i></i></div>
      </aside>
      <div class="bc-pins"><span class="bc-oracle" hidden></span><span class="bc-pledge" hidden></span></div>
      <div class="bc-sub" aria-live="polite"><span class="bc-sub-face"></span><b class="bc-sub-n"></b><span class="bc-sub-t"></span></div>
      <div class="bc-ask" hidden></div>
      <section class="bc-bets">${SPOTS.map(([k, n, p]) => `<button type="button" class="bc-spot bc-spot-${k}" data-bc="spot" data-k="${k}"><span class="bc-spot-n">${k === 'PP' || k === 'BP' ? `<small>${k === 'PP' ? 'プレイヤーの' : 'バンカーの'}</small>ペア` : n}</span><span class="bc-spot-p">${p}</span><i class="bc-spot-chips"></i><b class="bc-spot-a"></b></button>`).join('')}</section>
      <section class="bc-rack">
        <div class="bc-wallet"><span>手持ち</span><b class="bc-coins">0</b></div>
        <div class="bc-chipsel">${C.chips.map(v => `<button type="button" class="bc-chip" data-bc="chip" data-v="${v}"><b>${v}</b></button>`).join('')}</div>
        <button type="button" class="bc-btn2" data-bc="clear">消す</button>
        <button type="button" class="bc-btn2" data-bc="rebet">前と同じ</button>
        <button type="button" class="bc-btn2 bc-look" data-bc="look"><b>見（ケン）</b><span>賭けずに見る</span></button>
        <button type="button" class="bc-go" data-bc="deal"><b>配る</b><span class="bc-go-s"></span></button>
      </section>
      <div class="bc-sq" hidden>
        <div class="bc-sq-score"></div>
        <canvas class="bc-sq-cv"></canvas>
        <div class="bc-sq-side">
          <b class="bc-sq-m">札の端をめくって、数を読む</b>
          <div class="bc-cands"></div>
          <div class="bc-sq-legend"><span><i class="k-win"></i>勝ち</span><span><i class="k-lose"></i>負け</span><span><i class="k-tie"></i>引き分け</span><span><i class="k-next"></i>次の札へ</span></div>
          <button type="button" class="bc-go bc-sq-open" data-bc="sqopen"><b>開く</b></button>
        </div>
      </div>
      <div class="bc-layer"></div>
    </div>`;
    document.getElementById('stage').appendChild(host);
    ['shoe', 'count', 'next', 'table', 'banner', 'god', 'favor', 'oracle', 'pledge', 'sub', 'sub-face', 'sub-n', 'sub-t', 'ask', 'bets', 'rack', 'coins', 'sq', 'sq-score', 'sq-cv', 'sq-m', 'cands', 'layer', 'sqmode', 'roads'].forEach(n => { ui[n] = host.querySelector('.bc-' + n); });
    ui.go = host.querySelector('.bc-rack .bc-go'); ui.goS = host.querySelector('.bc-go-s');
    ui.sides = { P: host.querySelector('.bc-p'), B: host.querySelector('.bc-b') };
    host.addEventListener('click', onClick);
    paintRoom();
    if (typeof ResizeObserver !== 'undefined') { ui.ro = new ResizeObserver(() => { if (live()) paintRoads(); }); ui.ro.observe(ui.roads); }
  }
  // 運命の輪（女神の絵が決まるまでの紋章）
  function wheelSVG() {
    const sp = Array.from({ length: 8 }, (_, i) => `<line x1="50" y1="50" x2="50" y2="12" transform="rotate(${i * 45} 50 50)"/>`).join('');
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="33"/>${sp}<circle cx="50" cy="50" r="7" class="hub"/></svg>`;
  }
  function paintRoom() {
    const cv = host.querySelector('.bc-room'), im = new Image();
    im.onload = () => {
      if (!cv.isConnected) return;
      try {
        const g = cv.getContext('2d'), sm = document.createElement('canvas'); sm.width = 64; sm.height = 36;
        sm.getContext('2d').drawImage(im, 0, 0, 64, 36);
        g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, 320, 180);
        g.fillStyle = 'rgba(8,2,3,.72)'; g.fillRect(0, 0, 320, 180);
        cv.classList.add('is-ready');
      } catch (e) { }
    };
    im.src = ART.room;
  }

  // =============================================================
  // 罫線を描く（キャンバス：結果が増えた時と大きさが変わった時だけ）
  // =============================================================
  const COL = { B: '#c5232f', P: '#2456b8', T: '#1f8a4c', R: '#c5232f' };
  function paintRoad(cv, kind, items, rows) {
    rows = rows || 6;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = h / rows, cols = Math.max(1, Math.floor(w / cell));
    g.fillStyle = '#f6efe1'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,90,40,.28)'; g.lineWidth = 1;
    for (let i = 1; i < rows; i++) { g.beginPath(); g.moveTo(0, Math.round(i * cell) + .5); g.lineTo(w, Math.round(i * cell) + .5); g.stroke(); }
    for (let i = 1; i <= cols; i++) { g.beginPath(); g.moveTo(Math.round(i * cell) + .5, 0); g.lineTo(Math.round(i * cell) + .5, h); g.stroke(); }
    const maxX = items.reduce((m, it) => Math.max(m, it.x), -1), off = Math.max(0, maxX + 1 - cols);
    const lw = Math.max(1.4, cell * .14);
    items.forEach((it, idx) => {
      const x = (it.x - off + .5) * cell, y = (it.y + .5) * cell, r = cell * .36;
      if (it.x < off) return;
      const col = COL[it.w];
      g.lineWidth = lw; g.strokeStyle = col; g.fillStyle = col;
      if (kind === 'bead' || kind === 'small') { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      else if (kind === 'roach') { g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * .8, y + r * .8); g.lineTo(x + r * .8, y - r * .8); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
      if (kind === 'big' && it.e) {
        if (it.e.t) { g.strokeStyle = COL.T; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r, y + r); g.lineTo(x + r, y - r); g.stroke(); if (it.e.t > 1 && cell >= 22) { g.fillStyle = COL.T; g.font = `700 ${Math.round(cell * .42)}px "Barlow Condensed",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.e.t, x, y); } }
        if (it.e.bp) { g.fillStyle = COL.B; g.beginPath(); g.arc(x - r * .8, y - r * .8, cell * .1, 0, 7); g.fill(); }
        if (it.e.pp) { g.fillStyle = COL.P; g.beginPath(); g.arc(x + r * .8, y + r * .8, cell * .1, 0, 7); g.fill(); }
      }
      if (kind === 'bead') {
        if (it.bp) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * .7, y - r * .7, cell * .1, 0, 7); g.fill(); }
        if (it.pp) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + r * .7, y + r * .7, cell * .1, 0, 7); g.fill(); }
      }
      // いちばん新しい印は金の輪で知らせる
      if (idx === items.length - 1 && S && S.fresh) { g.strokeStyle = '#d9a23a'; g.lineWidth = Math.max(1.5, cell * .1); g.beginPath(); g.arc(x, y, cell * .47, 0, 7); g.stroke(); }
    });
  }
  const markHTML = (kind, m) => m ? `<i class="bc-mk bc-mk-${kind} is-${m}"></i>` : '<i class="bc-mk is-none"></i>';
  function paintRoads() {
    if (!live() || !S) return;
    const rd = BC.roads(S.res), st = rd.stats;
    S.road = rd;
    paintRoad(host.querySelector('.bc-rd-bead'), 'bead', rd.bead);
    paintRoad(host.querySelector('.bc-rd-big'), 'big', rd.big);
    paintRoad(host.querySelector('.bc-rd-eye'), 'eye', rd.eye);
    paintRoad(host.querySelector('.bc-rd-small'), 'small', rd.small);
    paintRoad(host.querySelector('.bc-rd-roach'), 'roach', rd.roach);
    ui.count.innerHTML = `<i class="is-B"></i>${st.B}<i class="is-P"></i>${st.P}<i class="is-T"></i>${st.T}`;
    ui.next.innerHTML = ['B', 'P'].map(w => `<span class="bc-nx is-${w}"><b>次が${w === 'B' ? 'バンカー' : 'プレイヤー'}</b>${markHTML('eye', rd.ask[w][0])}${markHTML('small', rd.ask[w][1])}${markHTML('roach', rd.ask[w][2])}</span>`).join('');
    ui.shoe.textContent = `シュー 残り${BC.shoeLeft(S.shoe)}枚・${S.res.length}手目まで`;
    const big = ui.layer.querySelector('.bc-bigroads');
    if (big) paintBigRoads(big);
  }

  // =============================================================
  // 台詞（下の帯に1人ずつ）
  // =============================================================
  const WHO = { goddess: '運命の女神', rico: 'リコ先輩', mimi: 'ミミ', dealer: DEALER_NAME };
  let subTimer = 0, subQueue = [];
  function say(who, text, ms) {
    subQueue.push({ who, text, ms: ms || Math.min(4200, 1500 + text.length * 75) });
    if (!subTimer) nextSub();
  }
  function nextSub() {
    clearTimeout(subTimer); subTimer = 0;
    if (!live()) { subQueue = []; return; }
    const s = subQueue.shift();
    if (!s) { ui.sub.dataset.on = '0'; return; }
    ui.sub.dataset.on = '1'; ui.sub.dataset.who = s.who;
    ui['sub-face'].innerHTML = ART[s.who] ? `<img src="${ART[s.who]}" alt="">` : '';
    ui['sub-n'].textContent = WHO[s.who];
    ui['sub-t'].innerHTML = esc(s.text).replace(/\|/g, '<wbr>');
    if (s.who === 'goddess') { ui.god.classList.remove('is-talk'); void ui.god.offsetWidth; ui.god.classList.add('is-talk'); }
    subTimer = setTimeout(nextSub, s.ms);
  }
  function hush() { subQueue = []; clearTimeout(subTimer); subTimer = 0; if (live()) ui.sub.dataset.on = '0'; }

  // =============================================================
  // 賭ける
  // =============================================================
  const stakeOf = (b) => ['P', 'B', 'T', 'PP', 'BP'].reduce((s, k) => s + (b[k] || 0), 0);
  function chipsHTML(a) {
    const out = []; let rest = a;
    for (const v of [500, 100, 50, 10]) while (rest >= v && out.length < 6) { out.push(v); rest -= v; }
    return out.map((v, i) => `<i class="bc-ch bc-ch-${v}" style="--i:${i}"></i>`).join('');
  }
  function paintBets() {
    for (const [k] of SPOTS) {
      const el = host.querySelector('.bc-spot-' + k), a = S.bets[k] || 0;
      el.querySelector('.bc-spot-a').textContent = a ? fmt(a) : '';
      el.querySelector('.bc-spot-chips').innerHTML = chipsHTML(a);
      el.dataset.on = a ? '1' : '0';
    }
    const st = stakeOf(S.bets);
    ui.coins.textContent = fmt(coins() - (S.phase === 'bet' ? st : 0));
    host.querySelectorAll('.bc-chip').forEach(b => { b.dataset.on = (+b.dataset.v === S.chip) ? '1' : '0'; b.disabled = coins() - st < +b.dataset.v; });
    ui.go.disabled = S.phase !== 'bet' || st < C.minBet;
    ui.goS.textContent = st ? `賭け ${fmt(st)}` : '賭ける所を押す';
    ui.sqmode.textContent = S.A.sq ? '絞り：自分で' : '絞り：おまかせ';
  }
  function addBet(k) {
    if (S.phase !== 'bet') return;
    const main = k === 'P' || k === 'B';
    if (main && S.bets[other(k)]) { say('rico', 'プレイヤーとバンカーは、どちらか片方だけ|賭けられるよ', 2600); return; }
    const cap = main ? C.maxMain : C.maxSide, cur = S.bets[k] || 0;
    const room = Math.min(cap - cur, coins() - stakeOf(S.bets));
    const add = Math.min(S.chip, room);
    if (add < C.minBet && !(add > 0 && cur)) { say('rico', cur >= cap ? `ここは${fmt(cap)}までだよ` : 'コインが足りないじゃん', 2000); return; }
    S.bets[k] = cur + add; sfx('bet');
    paintBets();
  }

  // =============================================================
  // 運命の女神：気分・問いかけ・約束・神託
  // =============================================================
  // 気分ごとの「好きな返事」。問いかけの頭の一言と、札の印で見せる
  const MOODS = {
    bored: { tag: '退屈', like: 'bold', open: ['ふわぁ……退屈。', 'なんか刺激が足りないなぁ。'] },
    happy: { tag: 'ごきげん', like: 'ride', open: ['ふふっ、いい流れ。', 'るんるん。今日は気分がいいの。'] },
    uneasy: { tag: '胸さわぎ', like: 'careful', open: ['……なんだか胸さわぎ。', 'うーん、風向きがあやしいかも。'] },
  };
  const LIKE_JA = { bold: '大胆な返事', ride: '流れに乗る返事', careful: '慎重な返事' };
  function setFavor(n, why) {
    const A = S.A, was = A.favor;
    A.favor = Math.max(0, Math.min(3, n));
    ui.favor.dataset.n = A.favor;
    if (A.favor > was) { ui.favor.classList.remove('is-up'); void ui.favor.offsetWidth; ui.favor.classList.add('is-up'); sfx('reach'); }
    if (A.favor < was) { ui.favor.classList.remove('is-down'); void ui.favor.offsetWidth; ui.favor.classList.add('is-down'); }
  }
  // 神託：女神だけが知っている次の結果。big＝勝つ側にかかわること／small＝小さな手がかり。いつも本当のことだけ言う
  function giveOracle(big) {
    const h = BC.peekHand(S.shoe);
    let text, say1;
    if (big) {
      if (h.w === 'T' || Math.random() < .5) { text = h.w === 'T' ? '次は引き分け' : `次は${SIDE_JA[h.w]}が勝つ`; say1 = h.w === 'T' ? '……ないしょだよ？　次、|引き分け。' : `……ないしょだよ？　次は|${SIDE_JA[h.w]}。`; }
      else { const lose = other(h.w); text = `次は${SIDE_JA[lose]}は勝たない`; say1 = `ひとつだけ。次、${SIDE_JA[lose]}は|勝たないよ。`; }
    } else {
      const opts = [];
      opts.push(h.natural ? ['次はナチュラル（8か9）が出る', 'あ、次ね、ナチュラルが出るよ。|どっちにかは言わないけど'] : ['次は3枚目まで配られる', '次はね、3枚目まで行くよ。|もつれるねぇ']);
      if (h.w !== 'T') opts.push(['次は引き分けではない', '次は引き分けじゃないよ。|それだけ']);
      opts.push([`プレイヤーの1枚目は${h.p[0].rank >= 10 ? '0の札（10か絵札）' : h.p[0].rank >= 6 ? '6より上' : '5より下'}`, `プレイヤーの1枚目、|${h.p[0].rank >= 10 ? '0の札だよ' : h.p[0].rank >= 6 ? '大きい数だよ' : '小さい数だよ'}`]);
      [text, say1] = pick(opts);
    }
    S.oracle = { text, big, hand: S.shoe.hands + 1 };
    S.A.oracles++;
    say('goddess', say1, 3600);
    paintPins(); sfx('garapon');
    if (!S.A.orSeen) { S.A.orSeen = true; say('rico', '女神さまの神託はウソをつかない。|ただし、ぜんぶは教えてくれないよ', 3600); }
  }
  function paintPins() {
    const o = S.oracle, p = S.pledge;
    ui.oracle.hidden = !o; if (o) ui.oracle.innerHTML = `<b>神託</b>${esc(o.text)}`;
    ui.pledge.hidden = !p;
    if (p) { ui.pledge.innerHTML = `<b>約束</b>${esc(p.tag)}`; ui.pledge.dataset.st = p.armed ? 'armed' : 'wait'; delete ui.pledge.dataset.judge; }
  }
  // 問いかけを作る。{ q, opts:[{ t, kind, make? }] }。kind＝bold/ride/careful/none
  function makeQuestion() {
    const st = S.road.stats, sw = st.streak.w, n = st.streak.n, T = [];
    const lastWasTie = S.res.length && S.res[S.res.length - 1].w === 'T';
    const sidePledge = (when, cond, promise, tag, now) => ({ type: 'side', cond, promise, tag, armed: !!now, left: 10 });
    if (sw && n >= 2) {
      const o = other(sw), k = n + 1;
      const cond = (s) => s.streak.w === sw && s.streak.n >= k;
      T.push({ q: `いま${SIDE_JA[sw]}が${n}連勝。|もう1回続いて${k}連勝になったら、|その次はどうする？`, opts: [
        { t: `${SIDE_JA[sw]}に乗る`, kind: 'ride', make: () => sidePledge(0, cond, sw, `${SIDE_JA[sw]}${k}連勝なら → ${SIDE_JA[sw]}に賭ける`) },
        { t: `逆の${SIDE_JA[o]}に賭ける`, kind: 'bold', make: () => sidePledge(0, cond, o, `${SIDE_JA[sw]}${k}連勝なら → ${SIDE_JA[o]}に賭ける`) },
        { t: '見（ケン）する', kind: 'careful', make: () => sidePledge(0, cond, 'look', `${SIDE_JA[sw]}${k}連勝なら → 見（ケン）`) },
      ] });
    }
    if (!sw || n < 3) {
      const w = Math.random() < .6 ? 'B' : 'P', o = other(w);
      const cond = (s) => s.streak.w === w && s.streak.n >= 3;
      T.push({ q: `ねえ、この先${SIDE_JA[w]}が3回続いたら、|${SIDE_JA[o]}に賭ける？　どうする？`, opts: [
        { t: `${SIDE_JA[o]}に賭ける`, kind: 'bold', make: () => sidePledge(0, cond, o, `${SIDE_JA[w]}3連勝なら → ${SIDE_JA[o]}に賭ける`) },
        { t: `${SIDE_JA[w]}に乗る`, kind: 'ride', make: () => sidePledge(0, cond, w, `${SIDE_JA[w]}3連勝なら → ${SIDE_JA[w]}に賭ける`) },
        { t: '見（ケン）する', kind: 'careful', make: () => sidePledge(0, cond, 'look', `${SIDE_JA[w]}3連勝なら → 見（ケン）`) },
      ] });
    }
    if (st.chop >= 3 && sw) {
      const o = other(sw);
      T.push({ q: `交互に来てるね。|次も交互なら${SIDE_JA[o]}。この1回、どうする？`, opts: [
        { t: `交互に乗る（${SIDE_JA[o]}）`, kind: 'ride', make: () => sidePledge(0, null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) },
        { t: `切れると見る（${SIDE_JA[sw]}）`, kind: 'bold', make: () => sidePledge(0, null, sw, `この1回 → ${SIDE_JA[sw]}に賭ける`, true) },
        { t: '見（ケン）する', kind: 'careful', make: () => sidePledge(0, null, 'look', 'この1回 → 見（ケン）', true) },
      ] });
    }
    if (lastWasTie && sw) {
      const o = other(sw);
      T.push({ q: `引き分けの後って、どっちが来ると思う？|この1回、どうする？`, opts: [
        { t: `前の続きで${SIDE_JA[sw]}`, kind: 'ride', make: () => sidePledge(0, null, sw, `この1回 → ${SIDE_JA[sw]}に賭ける`, true) },
        { t: `逆の${SIDE_JA[o]}`, kind: 'bold', make: () => sidePledge(0, null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) },
        { t: '見（ケン）する', kind: 'careful', make: () => sidePledge(0, null, 'look', 'この1回 → 見（ケン）', true) },
      ] });
    }
    if (S.lastStake > 0) {
      const mk = (p, tag) => () => ({ type: 'stake', promise: p, tag, armed: false, left: 10, base: 0 });
      T.push({ q: `ねえ、次に外れたら、|その次の賭け金はどうする？`, opts: [
        { t: '上げて取り返す', kind: 'bold', make: mk('up', '外れたら → 次は賭け金を上げる') },
        { t: '同じ額で続ける', kind: 'ride', make: mk('same', '外れたら → 次も同じ額') },
        { t: '下げるか、見する', kind: 'careful', make: mk('down', '外れたら → 次は下げるか見') },
      ] });
    }
    const q = pick(T);
    if (!q) return null;
    q.opts.push({ t: 'その時に決める', kind: 'none' });
    q.mood = pick(Object.keys(MOODS));
    return q;
  }
  function askQuestion() {
    const q = makeQuestion();
    if (!q) return;
    const A = S.A, M = MOODS[q.mood];
    A.asked = S.shoe.hands;
    if (!A.godSeen) {
      A.godSeen = true; keep(); hush();
      say('rico', '女神さまは次の結果を知ってる。|気分に合う返事で、口をすべらせるよ', 4200);
      const g = G; setTimeout(() => { if (g === G && live() && S.phase === 'bet' && !S.q) showAsk(q); }, 4300);
      return;
    }
    showAsk(q);
  }
  function showAsk(q) {
    const A = S.A, M = MOODS[q.mood];
    hush();
    ui.ask.hidden = false; host.dataset.ask = '1';
    ui.ask.innerHTML = `<div class="bc-ask-h"><b>運命の女神</b><span class="bc-mood is-${q.mood}">気分：${M.tag}${(A.qn = (A.qn || 0) + 1) <= 3 ? `（${LIKE_JA[M.like]}が好き）` : ''}</span><span class="bc-favor" data-n="${A.favor}"><span>ご機嫌</span><i></i><i></i><i></i></span></div>
      <p class="bc-ask-q">${esc(pick(M.open) + q.q).replace(/\|/g, '<wbr>')}</p>
      <div class="bc-ask-o">${q.opts.map((o, i) => `<button type="button" data-bc="answer" data-i="${i}">${esc(o.t)}</button>`).join('')}</div>
      <span class="bc-ask-n">返事と違う賭け方もできる（裏切るとご機嫌が下がる）</span>`;
    S.q = q; sfx('tap');
  }
  function answer(i) {
    const q = S.q; if (!q) return;
    const o = q.opts[i], M = MOODS[q.mood];
    S.q = null; ui.ask.hidden = true; delete host.dataset.ask;
    if (o.kind === 'none') { say('goddess', pick(['ふーん、慎重だね。|つまんないの', 'はぐらかした。|まあいいけど'])); return; }
    S.pledge = o.make(); paintPins();
    if (o.kind === M.like) {
      say('goddess', pick(['そう、それ！　そういうの好き', 'ふふ、わかってるじゃない', 'いい返事。気に入っちゃった']));
      setFavor(S.A.favor + 1);
      if (S.A.favor >= 3) { setFavor(0); giveOracle(true); }
      else if (Math.random() < .3) giveOracle(false);
    } else say('goddess', pick(['へえ、そうするんだ。|覚えとくね', 'ふうん。約束だよ？', 'そっか。じゃあ、見てるからね']));
    if (S.pledge.armed) ui.pledge.dataset.st = 'armed';
    keep();
  }
  // 賭ける場面の頭：約束の時が来たかを見る
  function pledgeTick() {
    const p = S.pledge; if (!p) return;
    if (p.type === 'side' && !p.armed && p.cond && p.cond(S.road.stats)) { p.armed = true; say('goddess', `約束の時だよ。|${p.tag.split(' → ')[1]}んだよね？`, 3400); sfx('reach'); }
    if (!p.armed && --p.left <= 0) { S.pledge = null; say('goddess', 'あの約束、もう時効だね。|忘れてあげる'); }
    paintPins();
  }
  // 配る時：約束を守ったか。戻り値 'kept'|'broken'|null
  function pledgeJudge(bets, stake) {
    const p = S.pledge; if (!p || !p.armed) return null;
    let ok;
    if (p.type === 'side') ok = p.promise === 'look' ? stake === 0 : !!bets[p.promise];
    else ok = p.promise === 'up' ? stake > p.base : p.promise === 'same' ? stake === p.base : stake < p.base;
    S.pledge = null;
    ui.pledge.dataset.judge = ok ? 'kept' : 'broken'; ui.pledge.hidden = false;
    ui.pledge.innerHTML = `<b>約束</b>${ok ? '有言実行' : '裏切り'}`;
    if (ok) S.A.kept++; else S.A.broken++;
    return ok ? 'kept' : 'broken';
  }
  // 茶々（問いかけの無い時）
  function chatter() {
    const st = S.road.stats, sw = st.streak.w, n = st.streak.n, L = [];
    if (sw && n >= 4) L.push([`${SIDE_JA[sw]}のツラ、${n}本目。|どこまで伸びるかなぁ`, 'ツラは「続いた記録」。|次の1回の確率は変わらないよ']);
    if (st.chop >= 4) L.push(['行ったり来たり。|運命も迷ってるみたい', null]);
    if (S.looks >= 3) L.push(['見てるだけ？|運命は、賭けた人にしか微笑まないよ', '見（ケン）は立派な手だよ。|賭けなければ減らないじゃん']);
    if (S.lossRun >= 3) L.push([`${S.lossRun}回つづけて外れ。|……ねえ、まだやる？`, '取り返そうと上げても、|勝ちやすくはならないよ']);
    if (S.winRun >= 3) L.push([`${S.winRun}連勝！|調子に乗っちゃう？`, null]);
    if (coins() < C.minBet) L.push(['すっからかん？|見てるだけでもいいよ', null]);
    if (!L.length) L.push(['次はどっちかなー。|わたしは知ってるけど', null], ['ねえねえ、どっちに賭けるの？', null], ['その顔。迷ってるでしょ', null], ['バンカーは少しだけ勝ちやすいんだって。|ほんとかなぁ', 'ほんとだよ。だから勝つと5%引かれるじゃん']);
    const [g, r] = pick(L);
    say('goddess', g);
    if (r && Math.random() < .6) say('rico', r, 3400);
  }

  // =============================================================
  // 札
  // =============================================================
  function cardEl(slot, landscape) {
    const el = document.createElement('i');
    el.className = 'bc-card is-back' + (landscape ? ' is-side' : '');
    el.dataset.slot = slot;
    return el;
  }
  function showFace(el, card) {
    el.classList.remove('is-back'); el.classList.add('is-face');
    el.style.backgroundImage = `url(${SQ.faceURL(card, 160)})`;
  }
  function paintTotals() {
    for (const w of ['P', 'B']) {
      const vals = S.vals[w], shown = vals.filter(v => v != null), n = S.cards[w].length;
      const el = ui.sides[w].querySelector('.bc-tot');
      if (!n) { el.textContent = ''; continue; }
      const sum = shown.reduce((a, b) => a + b, 0) % 10;
      el.textContent = shown.length ? String(sum) + (shown.length < n ? '+?' : '') : '?';
    }
  }
  async function dealCard(w, i, card, landscape) {
    const el = cardEl(w + i, landscape);
    ui.sides[w].querySelector('.bc-cards').appendChild(el);
    S.cards[w][i] = { card, el }; S.vals[w][i] = null;
    sfx('deal'); paintTotals();
    await wait(260);
  }
  async function flip(w, i) {
    const c = S.cards[w][i];
    c.el.classList.add('is-flip'); sfx('flip');
    await wait(150);
    showFace(c.el, c.card); c.el.classList.remove('is-flip'); S.vals[w][i] = BC.valueOf(c.card);
    paintTotals();
    await wait(330);
  }
  // 今めくる札が v だったら勝負はどうなるか（賭けた側から見て）
  function candState(w, i, rank, mine) {
    const v = rank >= 10 ? 0 : rank;
    const o = BC.outcomeIf(S.vals.P.concat([null, null, null]).slice(0, 3), S.vals.B.concat([null, null, null]).slice(0, 3), w + i, v);
    return o == null ? 'next' : o === 'T' ? 'tie' : o === mine ? 'win' : 'lose';
  }
  // 絞り：賭けた側の札を自分でめくる
  function squeeze(w, i, mine) {
    const c = S.cards[w][i], landscape = i === 2;
    return new Promise((resolve, reject) => {
      const g = G;
      host.dataset.sq = '1'; ui.sq.hidden = false;
      const others = S.vals[w].filter((v, k) => k !== i && v != null).reduce((a, b) => a + b, 0);
      const row = (x) => `<span class="bc-sc is-${x}${x === w ? ' is-now' : ''}"><b>${SIDE_JA[x]}</b>${S.cards[x].map((cc, k) => (S.vals[x][k] != null ? `<i class="bc-card is-face" style="background-image:url(${SQ.faceURL(cc.card, 160)})"></i>` : `<i class="bc-card is-back${x === w && k === i ? ' is-target' : ''}"></i>`)).join('')}<em>${ui.sides[x].querySelector('.bc-tot').textContent}</em></span>`;
      ui['sq-score'].innerHTML = row(other(w)) + row(w) + `<span class="bc-sc-bet">${SIDE_JA[mine]}に賭けた</span>`;
      const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const states = {}; RANKS.forEach(r => { states[r] = candState(w, i, r, mine); });
      ui.cands.innerHTML = RANKS.map(r => `<span class="bc-cd is-${states[r]}" data-r="${r}"><b>${r === 1 ? 'A' : r === 11 ? '絵' : r}</b><small>合計${(others + (r >= 10 ? 0 : r)) % 10}</small></span>`).join('');
      const wins = RANKS.filter(r => states[r] === 'win').length;
      ui['sq-m'].textContent = wins && wins <= 4 ? '金の数が出れば勝ち。端からめくる' : '札の端をめくって、数を読む';
      let lastN = 13, told = {};
      const done = () => {
        if (g !== G) return reject(STOP);
        sfx('flip');
        if (sq) { sq.destroy(); sq = null; }
        const st = states[Math.min(11, c.card.rank)];
        ui.cands.querySelectorAll('.bc-cd').forEach(e => { e.classList.toggle('is-out', +e.dataset.r !== Math.min(11, c.card.rank)); e.classList.toggle('is-hit', +e.dataset.r === Math.min(11, c.card.rank)); });
        showFace(c.el, c.card); S.vals[w][i] = BC.valueOf(c.card); paintTotals();
        ui['sq-cv'].classList.add('is-open'); ui['sq-cv'].style.backgroundImage = `url(${SQ.faceURL(c.card, 320)})`;
        ui['sq-cv'].dataset.land = landscape ? '1' : '0';
        if (st === 'win') { sfx('win'); say('mimi', pick(['来たっ……！', 'やった、これ……！'])); }
        else if (st === 'lose') { sfx('lose'); say('mimi', pick(['あぅ……', 'そんなぁ……'])); }
        setTimeout(() => {
          if (g !== G || !live()) return reject(STOP);
          ui.sq.hidden = true; delete host.dataset.sq; ui['sq-cv'].classList.remove('is-open'); ui['sq-cv'].style.backgroundImage = '';
          resolve();
        }, st === 'next' ? 800 : 1300);
      };
      S.sqDone = done;
      sq = SQ.create(ui['sq-cv'], {
        card: c.card, landscape, back: ART.back,
        onGrab: () => { sfx('tap'); },
        onSeen: (info) => {
          const set = info.cands.map(r => Math.min(11, r)).filter((r, k, a) => a.indexOf(r) === k);
          ui.cands.querySelectorAll('.bc-cd').forEach(e => e.classList.toggle('is-out', !set.includes(+e.dataset.r)));
          if (set.length < lastN) {
            lastN = set.length; sfx('check');
            const key = set.join(','), has = (a) => set.every(r => a.includes(r));
            const alive = set.filter(r => states[r] === 'win').length;
            let line = null;
            if (set.length === 1 && set[0] === 11) line = '枠が見えた。絵札だね、ゼロ！';
            else if (key === '4,5,6,7,8,9,10') line = '足あり！　4より上だよ';
            else if (has([1, 2, 3]) && set.length <= 3 && !told.low) { told.low = 1; line = '足なし……。ちっちゃい数だ'; }
            else if (key === '6,7,8') line = '横に3つ！　6か7か8！';
            else if (key === '9,10') line = '横に4つ！　9か10！';
            else if (key === '4,5') line = '横に2つ。4か5だね';
            else if (set.length === 2 && alive === 1) line = 'あとは真ん中！　あるか、ないか！';
            if (alive === 0 && set.some(r => states[r] === 'lose') && !told.dead && Object.values(states).includes('win')) { told.dead = 1; line = 'あー……金の数、消えちゃった'; }
            if (line && !told[key]) { told[key] = 1; hush(); say('goddess', line, 2200); }
          }
        },
        onOpen: done,
      });
    });
  }
  async function reveal(w, i, mine) {
    if (mine === w && S.A.sq) await squeeze(w, i, mine);
    else await flip(w, i);
  }

  // =============================================================
  // 1手の流れ
  // =============================================================
  function setPhase(p) { S.phase = p; host.dataset.phase = p; paintBets(); }
  function waitBet() { return new Promise((res, rej) => { const g = G; betResolve = (v) => { betResolve = null; g === G ? res(v) : rej(STOP); }; }); }
  function waitTap(ms) {
    return new Promise((res, rej) => {
      const g = G; let t = 0;
      const fin = () => { clearTimeout(t); tapResolve = null; g === G && live() ? res() : rej(STOP); };
      tapResolve = fin; t = setTimeout(fin, ms);
    });
  }
  function newShoe(first) {
    const A = S.A;
    S.shoe = BC.createShoe(Math.floor(Math.random() * 2 ** 31) + 1);
    S.res = A.res = []; A.shoe = { seed: S.shoe.seed, pos: S.shoe.pos, hands: 0 };
    S.oracle = null; S.pledge = null; paintPins();
    if (!first) say('dealer', `新しいシューです。最初の1枚は${S.shoe.burn.label}、|${S.shoe.burned}枚を捨てます`, 3200);
  }
  async function hand() {
    const A = S.A;
    // ---- 賭ける ----
    if (BC.needNewShoe(S.shoe)) newShoe(false);
    S.bets = {}; S.cards = { P: [], B: [] }; S.vals = { P: [], B: [] };
    for (const w of ['P', 'B']) { ui.sides[w].querySelector('.bc-cards').innerHTML = ''; ui.sides[w].dataset.res = ''; }
    host.querySelectorAll('.bc-spot').forEach(e => { delete e.dataset.res; });
    ui.banner.dataset.on = '0'; ui.table.dataset.win = '';
    setPhase('bet'); paintRoads(); paintTotals();
    pledgeTick();
    if (S.A.favor >= 3 && !S.oracle) { setFavor(0); giveOracle(true); }
    else if (!S.pledge && !S.q && S.shoe.hands - (A.asked || 0) >= 2 && S.res.length >= 2 && Math.random() < .62) askQuestion();
    else if (Math.random() < .5) chatter();
    const go = await waitBet();
    if (S.q) { S.q = null; ui.ask.hidden = true; delete host.dataset.ask; }
    hush();
    // ---- 配る（結果はここで決まっている。コインは先に引き、戻りは決着で足す）----
    const bets = go.look ? {} : Object.assign({}, S.bets), stake = stakeOf(bets);
    const judged = pledgeJudge(bets, stake);
    save.coins = coins() - stake;
    const h = BC.dealHand(S.shoe), pay = BC.settle(bets, h);
    S.pending = pay.ret; A.pendingRet = pay.ret;
    A.shoe = { seed: S.shoe.seed, pos: S.shoe.pos, hands: S.shoe.hands };
    if (stake) A.last = bets;
    keep();
    setPhase('deal');
    S.looks = stake ? 0 : S.looks + 1;
    say('dealer', stake ? 'ノーモアベット' : '見（ケン）ですね。では', 1400);
    await dealCard('P', 0, h.p[0]); await dealCard('B', 0, h.b[0]); await dealCard('P', 1, h.p[1]); await dealCard('B', 1, h.b[1]);
    const mine = bets.P ? 'P' : bets.B ? 'B' : null;
    const first = mine ? other(mine) : 'P', second = other(first);
    await flip(first, 0); await flip(first, 1);
    await reveal(second, 0, mine); await reveal(second, 1, mine);
    if (h.natural) { say('dealer', `ナチュラル${Math.max(BC.total(h.p.slice(0, 2)), BC.total(h.b.slice(0, 2)))}`, 1500); await wait(500); }
    if (h.p[2]) { say('dealer', 'プレイヤーに、もう1枚', 1400); await dealCard('P', 2, h.p[2], true); await reveal('P', 2, mine); }
    if (h.b[2]) { say('dealer', 'バンカーに、もう1枚', 1400); await dealCard('B', 2, h.b[2], true); await reveal('B', 2, mine); }
    // ---- 決着 ----
    setPhase('settle');
    save.coins = coins() + pay.ret; S.pending = 0; A.pendingRet = 0;
    const r = BC.resultOf(h);
    S.res.push(r); A.res = S.res; A.hands++; A.net += pay.net; A.best = Math.max(A.best, pay.net);
    S.fresh = true; S.oracle = null; paintPins(); paintRoads();
    ui.table.dataset.win = h.w;
    for (const w of ['P', 'B']) ui.sides[w].dataset.res = h.w === 'T' ? 'tie' : h.w === w ? 'win' : 'lose';
    const title = h.w === 'T' ? `引き分け　${h.pt} 対 ${h.bt}` : `${SIDE_JA[h.w]}の勝ち　${h.w === 'P' ? h.pt : h.bt} 対 ${h.w === 'P' ? h.bt : h.pt}`;
    for (const k of ['P', 'B', 'T', 'PP', 'BP']) if (bets[k]) { const d = pay.back[k] - bets[k], el = host.querySelector('.bc-spot-' + k); el.dataset.res = d > 0 ? 'up' : d < 0 ? 'dn' : 'eq'; el.querySelector('.bc-spot-a').textContent = (d > 0 ? '＋' : d < 0 ? '−' : '±') + fmt(Math.abs(d)); }
    ui.banner.innerHTML = `<b class="is-${h.w}">${title}</b>${stake ? `<span class="bc-pay ${pay.net > 0 ? 'is-up' : pay.net < 0 ? 'is-dn' : ''}">${pay.net > 0 ? '＋' : pay.net < 0 ? '−' : '±'}${fmt(Math.abs(pay.net))}<small>コイン</small></span>` : '<span class="bc-pay-n">見（増減なし）</span>'}`;
    ui.banner.dataset.on = '1';
    sfx(pay.net > 0 ? (pay.net >= stake * 3 ? 'bigwin' : 'win') : pay.net < 0 ? 'lose' : 'tie');
    if (stake) { if (pay.net > 0) { S.winRun++; S.lossRun = 0; } else if (pay.net < 0) { S.lossRun++; S.winRun = 0; } }
    // 「外れたら次の賭け金」の約束は、外れた時に効き始める
    if (S.pledge && S.pledge.type === 'stake' && !S.pledge.armed && stake && pay.net < 0) { S.pledge.armed = true; S.pledge.base = stake; }
    if (stake) S.lastStake = stake;
    paintBets();
    // 女神の反応：約束を守ったか × 当たったか
    if (judged === 'kept') {
      setFavor(A.favor + 1);
      say('goddess', pay.net > 0 ? pick(['有言実行！　しかも当たり。|かっこいいじゃない', '言ったとおりにして、勝った。|そういう子、好きよ']) : pay.net < 0 ? pick(['約束は守ったのにね。|よしよし', '外れたけど、ウソはつかなかった。|えらいえらい']) : '約束どおり。|ちゃんと見てたよ', 3200);
    } else if (judged === 'broken') {
      setFavor(A.favor - 2);
      if (pay.net > 0) { A.outwit++; say('goddess', pick(['あーっ、裏切った！|……なのに当ててる。ずるい', '言ったことと違うじゃない。|勝ったからって、許さないんだから']), 3200); }
      else say('goddess', pick(['裏切って、外した。|ほーら、見たことか', '約束、破ったよね？|バチが当たったんだよ']), 3200);
    } else if (stake && pay.net >= stake * 8) say('goddess', 'わ、大当たり。|運命もびっくり');
    keep();
    await waitTap(stake ? 2600 : 1700);
    S.fresh = false;
  }
  async function loop() {
    const g = G;
    try {
      if (!S.A.demoSeen) await demo();
      while (g === G && live()) await hand();
    } catch (e) { if (e !== STOP) console.error(e); }
  }

  // =============================================================
  // お手本（初回は自動で1回。2回目からは右上の「お手本」）：リコ先輩が1手を通して見せる。コインと記録は動かない
  // =============================================================
  async function demo() {
    const A = S.A, card = (suit, rank) => ({ suit, rank, label: BC.LABELS[rank - 1] });
    const P = [card('♥', 4), card('♠', 5)], B = [card('♣', 13), card('♦', 7)];
    host.dataset.demo = '1'; hush();
    S.bets = {}; S.cards = { P: [], B: [] }; S.vals = { P: [], B: [] };
    for (const w of ['P', 'B']) { ui.sides[w].querySelector('.bc-cards').innerHTML = ''; ui.sides[w].dataset.res = ''; }
    ui.banner.dataset.on = '0'; setPhase('demo'); paintTotals();
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'bc-demo-skip'; skip.dataset.bc = 'demoskip'; skip.textContent = 'お手本をとばす';
    ui.layer.appendChild(skip);
    const cap = async (t, ms) => { hush(); say('rico', t, ms + 400); await wait(ms); };
    try {
      await cap('バカラは、プレイヤーとバンカーの|どちらが勝つかに賭ける遊びだよ', 3000);
      S.bets = { P: 50 }; paintBets(); sfx('bet'); host.querySelector('.bc-spot-P').classList.add('is-demo');
      await cap('勝つと思う方にチップを置いて「配る」。|今回はプレイヤーに50', 3000);
      host.querySelector('.bc-spot-P').classList.remove('is-demo');
      await dealCard('P', 0, P[0]); await dealCard('B', 0, B[0]); await dealCard('P', 1, P[1]); await dealCard('B', 1, B[1]);
      await cap('2枚ずつ配って、合計の下1桁が|9に近い方が勝ち。10と絵札は0', 3200);
      await flip('B', 0); await flip('B', 1);
      await cap('相手側はディーラーが開く。|バンカーは7', 2400);
      await flip('P', 0);
      await cap('賭けた側は自分でめくる。|1枚目は4。あと5が出れば9！', 3000);
      // 絞りの見本：短い辺から足を見て、横から数を見て、真ん中まで
      const c = S.cards.P[1], g = G;
      host.dataset.sq = '1'; ui.sq.hidden = false;
      ui['sq-score'].innerHTML = '<span class="bc-sc is-B"><b>バンカー</b><em>7</em></span><span class="bc-sc is-P is-now"><b>プレイヤー</b><em>4+?</em></span>';
      const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      ui.cands.innerHTML = RANKS.map(r => `<span class="bc-cd is-${candState('P', 1, r, 'P')}" data-r="${r}"><b>${r === 1 ? 'A' : r === 11 ? '絵' : r}</b><small>合計${(4 + (r >= 10 ? 0 : r)) % 10}</small></span>`).join('');
      ui['sq-m'].textContent = '金の数が出れば勝ち。端からめくる';
      sq = SQ.create(ui['sq-cv'], { card: c.card, back: ART.back, onSeen: (info) => { const set = info.cands.map(r => Math.min(11, r)); ui.cands.querySelectorAll('.bc-cd').forEach(e => e.classList.toggle('is-out', !set.includes(+e.dataset.r))); } });
      await wait(500);
      hush(); say('rico', '短い辺からめくると「足」が見える。|マークが2つ＝4より上', 3600);
      await sq.demo([{ from: [.5, 1], to: [.5, .62], ms: 1300, hold: 1500 }]);
      hush(); say('rico', '長い辺からめくると、横の数。|2つなら4か5', 3400);
      await sq.demo([{ from: [1, .5], to: [.5, .5], ms: 1300, hold: 1500 }]);
      hush(); say('rico', '真ん中にマークがあれば5。|……あった！', 3000);
      await sq.demo([{ from: [1, .5], to: [.02, .5], ms: 1500, hold: 300, keep: true }]);
      if (g !== G) throw STOP;
      if (sq) { sq.open(); sq.destroy(); sq = null; }
      showFace(c.el, c.card); S.vals.P[1] = 5; paintTotals(); sfx('win');
      ui['sq-cv'].classList.add('is-open'); ui['sq-cv'].style.backgroundImage = `url(${SQ.faceURL(c.card, 320)})`;
      await wait(1300);
      ui.sq.hidden = true; delete host.dataset.sq; ui['sq-cv'].classList.remove('is-open'); ui['sq-cv'].style.backgroundImage = '';
      ui.banner.innerHTML = '<b class="is-P">プレイヤーの勝ち　9 対 7</b><span class="bc-pay is-up">＋50<small>コイン</small></span>'; ui.banner.dataset.on = '1';
      ui.sides.P.dataset.res = 'win'; ui.sides.B.dataset.res = 'lose';
      await cap('9対7、プレイヤーの勝ち。50が倍で戻る。|結果は左の罫線に並ぶよ', 3600);
      await cap('横から話しかけてくるのは運命の女神さま。|決まりや確率の話は、アタシに聞きな', 3600);
    } catch (e) { if (e !== STOP || !live() || !host.dataset.demo) throw e; }
    endDemo();
    A.demoSeen = true; keep();
  }
  function endDemo() {
    if (sq) { sq.destroy(); sq = null; }
    hush(); delete host.dataset.demo; delete host.dataset.sq; ui.sq.hidden = true;
    ui['sq-cv'].classList.remove('is-open'); ui['sq-cv'].style.backgroundImage = '';
    ui.layer.querySelectorAll('.bc-demo-skip').forEach(e => e.remove());
    S.bets = {}; paintBets();
  }

  // =============================================================
  // リコ先輩の解説・罫線の大きな表
  // =============================================================
  const mini = (suit, rank) => `<i class="bc-card is-face bc-mini" style="background-image:url(${SQ.faceURL({ suit, rank, label: BC.LABELS[rank - 1] }, 160)})"></i>`;
  const GUIDE = [
    ['勝ち負け', () => `<div class="bc-g-row">${mini('♠', 7)}${mini('♥', 8)}<b class="bc-g-eq">7＋8＝15 → <em>5</em></b></div>
      <p>配られた札の合計の<b>下1桁</b>が、9に近い方の勝ち。10と絵札は0、Aは1。</p><p>プレイヤー・バンカーは席の名前。どちらに賭けてもいい。</p>`],
    ['3枚目の決まり', () => `<table class="bc-g-t"><tr><th>プレイヤー</th><td>0〜5 なら引く／6・7 は引かない</td></tr><tr><th>バンカー</th><td>0〜2 引く／3〜6 はプレイヤーの3枚目しだい／7 引かない</td></tr><tr><th>8・9</th><td>ナチュラル。どちらも引かずに決着</td></tr></table>
      <p>覚えなくていい。ディーラーが決まりどおりに配る。選ぶのは「どこに、いくら賭けるか」だけ。</p>`],
    ['配当と、当たりやすさ', () => `<div class="bc-g-bars">${[['バンカー', 45.9, '1倍（勝つと5%引かれる）', 'B'], ['プレイヤー', 44.6, '1倍', 'P'], ['引き分け', 9.5, '8倍', 'T'], ['ペア', 7.5, '11倍', 'T']].map(([n, p, pay, c]) => `<span><b>${n}</b><i class="is-${c}" style="width:${p * 1.6}%"></i><em>100回に${Math.round(p)}回・${pay}</em></span>`).join('')}</div>
      <p>店の取り分は、バンカー・プレイヤーが約1%、引き分けは約14%、ペアは約10%。長く遊ぶならバンカーかプレイヤー。</p>`],
    ['罫線の読み方', () => `<div class="bc-g-row"><span class="bc-g-lg"><i class="bc-mk bc-mk-eye is-R"></i>バンカー</span><span class="bc-g-lg"><i class="bc-mk bc-mk-eye is-B"></i>プレイヤー</span><span class="bc-g-lg"><i class="bc-mk bc-mk-roach is-T"></i>引き分け</span></div>
      <p>上の大きな表（大路）は、同じ側が続くと<b>下へ</b>、替わると<b>右の列へ</b>。下の3つの小さな表は、並びが<b>そろっていれば赤、乱れていれば青</b>。</p><p>罫線は「これまでの記録」。次の1回の確率は、どんな並びでも変わらない。</p>`],
    ['絞り（札のめくり方）', () => `<div class="bc-g-sq"><span><b>短い辺から＝足</b>マークなし → A／1つ → 2・3／2つ → 4〜10</span><span><b>長い辺から＝横の数</b>なし → A・2・3／2つ → 4・5／3つ → 6・7・8／4つ → 9・10</span><span><b>枠の線</b>が見えたら絵札（0）</span></div>
      <p>札の端を指で引くとめくれる。離すと戻る。右の候補は、見えた分だけ消えていく。右上の「絞り」でおまかせにもできる。</p>`],
    ['運命の女神', () => `<div class="bc-g-sq"><span><b>気分：退屈</b>大胆な返事（逆に賭ける・上げる）が好き</span><span><b>気分：ごきげん</b>流れに乗る返事（続きに賭ける・同じ額）が好き</span><span><b>気分：胸さわぎ</b>慎重な返事（見・下げる）が好き</span></div>
      <p>気分に合う返事で<b>ご機嫌＋1</b>、言ったとおりに賭けると<b>＋1</b>、裏切ると<b>−2</b>。3つ満ちると、次の結果にかかわる<b>神託</b>をくれる。神託はウソをつかない。</p>`],
  ];
  function openGuide(page) {
    page = page || 0;
    closeLayer();
    const el = document.createElement('div'); el.className = 'bc-over bc-guide';
    const paint = () => {
      el.innerHTML = `<section class="bc-panel"><header><span class="bc-g-rico"><img src="${ART.rico}" alt=""></span><b>リコ先輩の解説</b><span class="bc-g-pg">${page + 1}／${GUIDE.length}</span><button type="button" data-bc="close">閉じる</button></header>
        <h3>${GUIDE[page][0]}</h3><div class="bc-g-body">${GUIDE[page][1]()}</div>
        <footer><button type="button" data-bc="gprev" ${page ? '' : 'disabled'}>前へ</button><button type="button" class="bc-go" data-bc="gnext"><b>${page < GUIDE.length - 1 ? '次へ' : '閉じる'}</b></button></footer></section>`;
    };
    el._nav = (d) => { page += d; if (page >= GUIDE.length) return closeLayer(); page = Math.max(0, page); paint(); };
    paint(); ui.layer.appendChild(el);
  }
  function paintBigRoads(el) {
    const rd = S.road;
    paintRoad(el.querySelector('.r-bead'), 'bead', rd.bead);
    paintRoad(el.querySelector('.r-big'), 'big', rd.big);
    paintRoad(el.querySelector('.r-eye'), 'eye', rd.eye);
    paintRoad(el.querySelector('.r-small'), 'small', rd.small);
    paintRoad(el.querySelector('.r-roach'), 'roach', rd.roach);
  }
  function openRoads() {
    closeLayer();
    const st = S.road.stats, el = document.createElement('div'); el.className = 'bc-over bc-bigroads';
    el.innerHTML = `<section class="bc-panel"><header><b>罫線</b><span class="bc-count"><i class="is-B"></i>バンカー ${st.B}<i class="is-P"></i>プレイヤー ${st.P}<i class="is-T"></i>引き分け ${st.T}</span><button type="button" data-bc="guide4">読み方</button><button type="button" data-bc="close">閉じる</button></header>
      <div class="bc-br-grid"><span class="bc-br-l">結果の順</span><canvas class="bc-rd r-bead"></canvas><span class="bc-br-l">大路</span><canvas class="bc-rd r-big"></canvas>
      <span class="bc-br-l">下の3つ</span><span class="bc-br-3"><canvas class="bc-rd r-eye"></canvas><canvas class="bc-rd r-small"></canvas><canvas class="bc-rd r-roach"></canvas></span></div></section>`;
    ui.layer.appendChild(el);
    requestAnimationFrame(() => paintBigRoads(el));
  }
  function closeLayer() { ui.layer.querySelectorAll('.bc-over').forEach(e => e.remove()); }

  // =============================================================
  // 押した時
  // =============================================================
  function onClick(e) {
    const b = e.target.closest('[data-bc]');
    if (!b) { if (tapResolve && S.phase === 'settle') tapResolve(); return; }
    const k = b.dataset.bc;
    if (host.dataset.demo && !['demoskip'].includes(k)) return;
    switch (k) {
      case 'spot': addBet(b.dataset.k); break;
      case 'chip': S.chip = S.A.chip = +b.dataset.v; sfx('tap'); paintBets(); break;
      case 'clear': if (S.phase === 'bet') { S.bets = {}; paintBets(); } break;
      case 'rebet': {
        if (S.phase !== 'bet' || !S.A.last) break;
        const st = stakeOf(S.A.last);
        if (st > coins()) { say('rico', 'コインが足りないじゃん', 1800); break; }
        S.bets = Object.assign({}, S.A.last); sfx('bet'); paintBets(); break;
      }
      case 'look': if (S.phase === 'bet' && betResolve) betResolve({ look: true }); break;
      case 'deal': if (S.phase === 'bet' && betResolve && stakeOf(S.bets) >= C.minBet) betResolve({ look: false }); break;
      case 'answer': answer(+b.dataset.i); break;
      case 'sqopen': if (sq) sq.open(); break;
      case 'sqmode': S.A.sq = !S.A.sq; keep(); paintBets(); say('rico', S.A.sq ? '賭けた側の札は、自分でめくるよ' : '札はディーラーがすぐ開くよ', 2000); break;
      case 'roads': openRoads(); break;
      case 'guide': openGuide(0); break;
      case 'guide4': openGuide(3); break;
      case 'gprev': b.closest('.bc-over')._nav(-1); break;
      case 'gnext': b.closest('.bc-over')._nav(1); break;
      case 'close': closeLayer(); break;
      case 'demo': if (S.phase === 'bet') replayDemo(); else say('rico', 'お手本は、賭ける前に押してね', 1800); break;
      case 'demoskip': G++; endDemo(); S.A.demoSeen = true; keep(); restart(); break;
      case 'quit': quit(); break;
    }
  }
  function replayDemo() { G++; if (betResolve) betResolve = null; S.A.demoSeen = false; restart(); }
  function restart() { G++; tapResolve = null; betResolve = null; loop(); }
  function quit() { try { goLobby(); } catch (e) { teardown(); } }

  // =============================================================
  // 入口・後片づけ
  // =============================================================
  function open() {
    if (!isUnlocked()) { try { toast('バカラは、エンディングの後に開きます'); } catch (e) { } return; }
    const A = store(); if (!A) return;
    // 前に途中で離れた手の戻りを足す（コインは配る時に引いてある）
    if (A.pendingRet) { save.coins = coins() + A.pendingRet; A.pendingRet = 0; keep(); }
    try { battleGen++; } catch (e) { }
    state = defaultState(); state.screen = 'baccarat';
    render();
    try { if (isBgmOn()) playSceneBgm('allstar'); } catch (e) { }
  }
  function mount() {
    const A = store();
    if (!A) return;
    if (host && host.isConnected) return;
    G++;
    S = { A, bets: {}, cards: { P: [], B: [] }, vals: { P: [], B: [] }, phase: 'bet', chip: A.chip || 10, res: A.res || [], looks: 0, winRun: 0, lossRun: 0, lastStake: 0, pledge: null, oracle: null, q: null, pending: 0 };
    build();
    try { S.shoe = A.shoe ? BC.restoreShoe(A.shoe) : null; } catch (e) { S.shoe = null; }
    if (!S.shoe || BC.needNewShoe(S.shoe)) newShoe(true);
    ui.favor.dataset.n = A.favor;
    paintBets(); paintPins();
    requestAnimationFrame(() => { paintRoads(); loop(); });
  }
  function teardown() {
    G++;
    if (S && S.pending) { save.coins = coins() + S.pending; S.pending = 0; if (S.A) S.A.pendingRet = 0; keep(); }
    if (sq) { sq.destroy(); sq = null; }
    hush(); tapResolve = null; betResolve = null;
    if (ui.ro) { ui.ro.disconnect(); ui.ro = null; }
    if (host) { host.remove(); host = null; }
    document.querySelectorAll('#stage > .bc-host').forEach(e => e.remove());
    S = null;
  }
  function onAction(action) { if (action === 'baccarat-open') open(); }

  // ---- 検査の出入口（qa/baccaratshot.mjs だけが使う） ----
  const _qa = {
    S: () => S, host: () => host, sq: () => sq,
    bet(k, n) { for (let i = 0; i < (n || 1); i++) addBet(k); },
    deal() { if (betResolve) betResolve({ look: false }); }, look() { if (betResolve) betResolve({ look: true }); },
    ask: askQuestion, oracle: giveOracle, answer, setFavor, guide: openGuide, roads: openRoads,
    feed(str) { S.res = S.A.res = str.split('').map(w => ({ w, pp: false, bp: false, nat: false })); paintRoads(); },
  };
  window.BaccaratUI = { mount, teardown, onAction, open, isUnlocked, ART, _qa };
})();
