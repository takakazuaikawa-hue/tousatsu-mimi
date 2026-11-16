// =============================================================
// baccarat-ui.js — クリア後のおまけ「バカラ」の画面・進行・絞り・運命の女神ウンメ・リコ先輩の解説。
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
    goddess: 'assets/characters/goddess_lean.webp',   // 運命の女神（横から身を乗り出す。2026-11-16 ユーザーが選んだピンクのツインテール＋十字の飾りの輪）
    rico: 'assets/ui/face_chibi_rico.webp',
    mimi: 'assets/ui/face_chibi_mimi.webp',
  };
  const DEALER_NAME = 'ディーラー';
  // ---- ディーラー（2026-11-16 ユーザー：4案とも採用・全員うさ耳あり・入る時に卓を選ぶ＋山が替わる時に交代も選べる）----
  // 台詞は [話す人, 文] にすると名前を替えられる（双子）。{n}{l} は数や札に置き換える。名前と口調は仮（ユーザーの確認待ち）
  const DEALERS = [
    { id: 'tika', name: 'ティカ', kind: 'ぜんまい人形', intro: '正確無比。|絞りの間だけ、|歯車が速くなる', art: 'assets/characters/dealer_tika.webp', L: {
      hello: 'いらっしゃいませ。当機がお相手いたします。|カチ', nomore: 'ノーモアベットでございます。カチ', look: '見（ケン）でございますね。では、配ります',
      natural: 'ナチュラル{n}でございます', p3: 'プレイヤーに、もう1枚', b3: 'バンカーに、もう1枚', shoe: '新しい山でございます。最初の札は{l}、|{n}枚を捨てます。カチ' } },
    { id: 'ocho', name: 'お蝶', kind: '賭場の姐さん', intro: '東方の賭場の|壺振り上がり。|「勝負」の一声', art: 'assets/characters/dealer_ocho.webp', L: {
      hello: 'いらっしゃい。お手柔らかにね、兎さん', nomore: 'よござんすか。……勝負', look: 'おや、見（ケン）かい。目の肥えたお客だね',
      natural: 'ナチュラル{n}。きれいな目だねぇ', p3: 'プレイヤーに、もう一枚', b3: 'バンカーに、もう一枚', shoe: '山を替えるよ。頭の札は{l}、|{n}枚、流すからね' } },
    { id: 'twins', name: 'プントとバンコ', kind: '双子', intro: '青のプントが|プレイヤー側、|赤のバンコが|バンカー側', art: 'assets/characters/dealer_twins.webp', wide: true, L: {
      hello: ['プント', 'いらっしゃーい！|プレイヤー側はプントが配るよ'], nomore: ['プント', 'はい、そこまで！　ノーモアベット！'], look: ['バンコ', '見（ケン）ね。ちゃんと見てなさいよ'],
      natural: (v) => [v.side === 'P' ? 'プント' : 'バンコ', 'ナチュラル{n}！'], p3: ['プント', 'プレイヤーにもう1枚、いくよ！'], b3: ['バンコ', 'バンカーにもう1枚。見てて'], shoe: ['プント', '新しい山だよ！　最初は{l}だから、|{n}枚ポイっと捨てるね'] } },
    { id: 'pico', name: 'ピコ', kind: '見習い天使', intro: '女神さまの部下。|おどおどしながら|一生けんめい', art: 'assets/characters/dealer_pico.webp', L: {
      hello: 'い、いらっしゃいませ！|見習いのピコですっ', nomore: 'ノ、ノーモアベットですぅ！', look: 'け、見（ケン）ですね！　配りますっ',
      natural: 'わっ、ナチュラル{n}です！', p3: 'プレイヤーさんに、もう1枚ですっ', b3: 'バンカーさんに、もう1枚ですっ', shoe: 'あ、新しい山です！　最初の札は{l}なので、|{n}枚捨てますっ' } },
  ];
  const DTALK = {
    tika: {
      idle: ['歯車は正常。賭け金をどうぞ。カチ', '当機の計算では、次の結果は……|申し上げられません。規則でございます', '絞りの時間は、当機の歯車が|なぜか速く回ります。カチカチ', 'ミミ様の耳、角度が変わりました。|迷いの印と記録します'],
      win: ['お見事でございます。カチ', '配当をお受け取りください。|……当機も少し、うれしいようです', '的中。記録に残します。カチ'],
      lose: ['残念でございます。次の勝負をどうぞ', '回収いたします。カチ', '確率どおりの|結果でございます。|お気を落とさず'],
      tie: ['引き分けでございます。賭け金は戻ります'],
      banter: [['女神さま、卓に身を乗り出すのは|規則違反でございます', 'かたいこと言わなーい！|カチカチうるさーい！'], ['女神さまの声量は、基準値の3倍でございます', 'ほめてる？　ほめてるよねぇ！'], ['女神さま、結果の漏洩は|お控えください', 'もらしてませーん！　まだ！']],
    },
    ocho: {
      idle: ['さ、張った張った。|どっちだい？', '兎さん、いい目をしてるね。|博打打ちの目だ', '煙の流れる方に|張る客もいたよ。|当たったかは、|聞かないでおくれ', '迷った時はね、張らないのも手だよ'],
      win: ['おや、やるじゃないか', 'いい勝ちっぷりだねぇ。持っていきな', '読みが冴えてるね、兎さん'],
      lose: ['惜しかったね。次は取りな', '博打は負けて覚えるもんさ', '顔に出てるよ。深呼吸しな'],
      tie: ['引き分けだ。張った金は戻るよ'],
      banter: [['女神の姐さん、少し静かにしておくれ。|札が逃げちまう', '逃げませーん！|運命からは逃げられませーん！'], ['あんた、結果を知ってるんだろ？|野暮は言いっこなしだよ', 'えへへ、ないしょでーす！'], ['兎さんをからかうのは、ほどほどにね', 'からかってませーん！　かわいがってまーす！']],
    },
    twins: {
      idle: [['プント', 'ねえねえ、プレイヤーに賭けてよ！|プントが配るんだから！'], ['バンコ', 'バンカーの方が|少し勝ちやすいの。|……計算できるでしょ？'], ['プント', 'バンコはすぐ|理屈を言うんだよー'], ['バンコ', 'プント、札を振り回さないで']],
      res: (h, net) => (h.w === 'T' ? ['バンコ', '引き分け。……プント、真似しないで'] : net > 0 ? (h.w === 'P' ? ['プント', 'やったー！　いっしょに勝ったね！'] : ['バンコ', '見る目あるじゃない。|……ほめてあげる']) : net < 0 ? (h.w === 'P' ? ['プント', 'へへー、こっちの勝ち！|次はプントに賭けてね'] : ['バンコ', '言ったでしょ、バンカーは強いの']) : ['プント', '増えも減りもしなかったね！']),
      banter: [[['プント', '女神さま、|どっちが勝つか|教えてー！'], 'だーめ！　でもプントちゃんは|かわいいから……|やっぱだーめ！'], [['バンコ', '女神さま、うるさい'], 'バンコちゃんこわーい！'], [['プント', '女神さまのツインテール、|おそろいにしたい！'], 'いいよぉ！　ピンクに染めちゃう？']],
    },
    pico: {
      idle: ['え、えっと、賭け金をどうぞですっ', '女神さまが横にいると、|き、緊張しますぅ……', 'さっき札を1枚|落としそうになりました……|ないしょですよ？', 'ミミさんのうさ耳、ふわふわですね……|あ、仕事中でしたっ'],
      win: ['わぁ、おめでとうございますっ！', 'す、すごいです！　配当ですっ', 'やりましたね！　……あ、公平にしなきゃ'],
      lose: ['あぅ……ざ、残念でした……', 'つ、次はきっと当たりますっ！　たぶん！', 'ご、ごめんなさい……|ピコのせいじゃ|ないですよね？'],
      tie: ['ひ、引き分けです！|賭け金はお返ししますっ'],
      banter: [['女神さまぁ、|次の結果を|言っちゃだめですよぅ', 'ピコのくせに生意気ー！|あとでお説教でーす！'], ['女神さま、輪っかが曲がってますぅ', 'えっ、うそ！？|……曲がってませーん！　ピコー！'], ['女神さま、|お仕事の邪魔ですぅ……', 'これがウンメちゃんの|お仕事でーす！']],
    },
  };
  DEALERS.forEach(d => { d.T = DTALK[d.id]; });
  let DL = DEALERS[0], pickResolve = null;
  function dsay(key, vars, ms) {
    let v = DL.L[key]; if (typeof v === 'function') v = v(vars || {});
    let name = DL.name; if (Array.isArray(v)) { name = v[0]; v = v[1]; }
    say('dealer', v.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : '')), ms, name);
  }
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
    const d = { v: 1, demoSeen: false, godSeen: false, hands: 0, net: 0, best: 0, kept: 0, broken: 0, outwit: 0, oracles: 0, favor: 0, shoe: null, res: [], last: null, chip: 10, sqMode: 'auto', asked: 0 };
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
        <div class="bc-dealer"><span class="bc-dealer-pic"></span><b class="bc-dealer-n"></b></div>
        <div class="bc-side bc-p" data-side="P"><div class="bc-side-head"><span class="bc-side-n">プレイヤー</span><b class="bc-tot"></b></div><div class="bc-cards"></div></div>
        <div class="bc-side bc-b" data-side="B"><div class="bc-side-head"><span class="bc-side-n">バンカー</span><b class="bc-tot"></b></div><div class="bc-cards"></div></div>
        <div class="bc-banner" aria-live="polite"></div>
      </section>
      <aside class="bc-god">
        <div class="bc-god-pic${ART.goddess ? ' has-art' : ''}">${ART.goddess ? `<img src="${ART.goddess}" alt="運命の女神ウンメ"><img class="bc-god-face" src="${ART.goddess}" alt="">` : wheelSVG()}</div>
        <b class="bc-god-n">運命の女神 ウンメ</b>
        <div class="bc-favor" aria-label="女神のご機嫌"><span>ご機嫌</span><i></i><i></i><i></i></div>
        <span class="bc-fnote" hidden></span>
      </aside>
      <div class="bc-pins"></div>
      <div class="bc-sub" aria-live="polite"><span class="bc-sub-face"></span><b class="bc-sub-n"></b><span class="bc-sub-t"></span></div>
      <div class="bc-ask" hidden></div>
      <section class="bc-bets">${SPOTS.map(([k, n, p]) => `<button type="button" class="bc-spot bc-spot-${k}" data-bc="spot" data-k="${k}"><span class="bc-spot-n">${k === 'PP' || k === 'BP' ? `<small>${k === 'PP' ? 'プレイヤーの' : 'バンカーの'}</small>ペア` : n}</span><span class="bc-spot-p">${p}</span><i class="bc-spot-chips"></i><b class="bc-spot-a"></b></button>`).join('')}</section>
      <section class="bc-rack">
        <div class="bc-wallet"><span>手持ち</span><b class="bc-coins">0</b><i class="bc-delta"></i></div>
        <div class="bc-chipsel">${C.chips.map(v => `<button type="button" class="bc-chip" data-bc="chip" data-v="${v}"><b>${v}</b></button>`).join('')}</div>
        <button type="button" class="bc-btn2 bc-on-staked" data-bc="undo">戻す</button>
        <button type="button" class="bc-btn2 bc-on-staked" data-bc="double">倍</button>
        <button type="button" class="bc-btn2 bc-on-staked" data-bc="clear">消す</button>
        <button type="button" class="bc-btn2 bc-on-empty" data-bc="rebet">前と同じ</button>
        <button type="button" class="bc-btn2 bc-look" data-bc="look"><b>見（ケン）</b><span>賭けずに見る</span></button>
        <button type="button" class="bc-go" data-bc="deal"><b>配る</b><span class="bc-go-s"></span></button>
      </section>
      <div class="bc-sq" hidden>
        <div class="bc-sq-score"></div>
        <canvas class="bc-sq-cv"></canvas>
        <div class="bc-brief" hidden></div>
        <div class="bc-verdict" hidden></div>
        <div class="bc-sq-side">
          <b class="bc-sq-m">札の端をめくって、数を読む</b>
          <div class="bc-cands"></div>
          <div class="bc-odds"></div>
          <div class="bc-sq-legend"><span><i class="k-win"></i>勝ち</span><span><i class="k-lose"></i>負け</span><span><i class="k-tie"></i>引き分け</span><span><i class="k-next"></i>次の札へ</span></div>
          <div class="bc-sq-btns"><button type="button" class="bc-btn2 bc-sq-take" data-bc="sqtake">自分でめくる</button><button type="button" class="bc-go bc-sq-open" data-bc="sqopen"><b>開く</b></button></div>
        </div>
      </div>
      <div class="bc-layer"></div>
    </div>`;
    document.getElementById('stage').appendChild(host);
    ['shoe', 'count', 'next', 'table', 'banner', 'god', 'favor', 'pins', 'sub', 'sub-face', 'sub-n', 'sub-t', 'ask', 'bets', 'rack', 'coins', 'delta', 'sq', 'sq-score', 'sq-cv', 'sq-m', 'cands', 'brief', 'verdict', 'odds', 'fnote', 'layer', 'sqmode', 'roads'].forEach(n => { ui[n] = host.querySelector('.bc-' + n); });
    ui.go = host.querySelector('.bc-rack .bc-go'); ui.goS = host.querySelector('.bc-go-s');
    ui.sides = { P: host.querySelector('.bc-p'), B: host.querySelector('.bc-b') };
    host.addEventListener('click', onClick);
    let holdT = 0, holdI = 0;
    const holdEnd = () => { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = 0; };
    host.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.bc-spot'); holdEnd();
      if (!b || !S || S.phase !== 'bet' || host.dataset.demo) return;
      holdT = setTimeout(() => { holdI = setInterval(() => { if (S && S.phase === 'bet') { S.holdFired = Date.now(); addBet(b.dataset.k); } else holdEnd(); }, 130); }, 380);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => host.addEventListener(t, holdEnd));
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
  const WHO = { goddess: 'ウンメ', rico: 'リコ先輩', mimi: 'ミミ', dealer: DEALER_NAME };
  let subTimer = 0, subQueue = [];
  function say(who, text, ms, name) {
    subQueue.push({ who, text, name, ms: ms || Math.min(4200, 1500 + text.length * 75) });
    if (!subTimer) nextSub();
  }
  function nextSub() {
    clearTimeout(subTimer); subTimer = 0;
    if (!live()) { subQueue = []; return; }
    const s = subQueue.shift();
    if (!s) { ui.sub.dataset.on = '0'; return; }
    ui.sub.dataset.on = '1'; ui.sub.dataset.who = s.who;
    ui['sub-face'].innerHTML = ART[s.who] && s.who !== 'goddess' ? `<img src="${ART[s.who]}" alt="">` : '';
    ui['sub-n'].textContent = s.name || WHO[s.who];
    ui['sub-t'].innerHTML = esc(s.text).replace(/\|/g, '<wbr>');
    if (s.who === 'goddess') { ui.god.classList.remove('is-talk'); void ui.god.offsetWidth; ui.god.classList.add('is-talk'); }
    if (s.who === 'dealer') { const d = host.querySelector('.bc-dealer'); d.classList.remove('is-talk'); void d.offsetWidth; d.classList.add('is-talk'); }
    subTimer = setTimeout(nextSub, s.ms);
  }
  function hush() { subQueue = []; clearTimeout(subTimer); subTimer = 0; if (live()) ui.sub.dataset.on = '0'; }

  // ---- ウンメのカットイン（決め所だけ）：斜めの帯にウンメの上半身がはみ出す。1.5秒ほどで消え、操作は止めない ----
  //   kind＝oracle（金：大きな神託）／betray（赤：約束の裏切り）／climax（桃：めくりの溜め）／jackpot（金：大当たり）
  //   face＝表情の差分の名前（UMME にあれば使い、無ければ今の絵）
  //   横の絵の表情違い（同じ構図で顔だけ違う。2026-11-17 ユーザー選択：ウインク＝umme_doya_2・驚き＝umme_odoroki_1）。むくれ・祈る・ジト目・あくびは描いたら足す
  const UMME = { base: ART.goddess, doya: 'assets/characters/umme_lean_doya.webp', odoroki: 'assets/characters/umme_lean_odoroki.webp' };
  // 横の絵の顔を少しのあいだ変えて、元の顔へ戻す（上に重ねた層をふわっと出し入れ。UMME に無い顔は何もしない）
  let faceT = 0;
  function godFace(name, ms) {
    const el = host && host.querySelector('.bc-god-face'), src = UMME[name];
    if (!el || !src || name === 'base') return;
    if (!el.src.endsWith(src)) el.src = src;
    el.classList.add('is-on'); clearTimeout(faceT);
    faceT = setTimeout(() => el.classList.remove('is-on'), ms || 2600);
  }
  // カットイン専用の絵（場面ごとの束。出るたびに1枚を選ぶ。2026-11-17 ユーザー「カットインの顔は特別なものの方がいい。種類も欲しい」）。空の場面は表情の差分→今の絵の順で代わりに出す
  const CI_ART = {
    oracle: ['assets/characters/umme_ci_oracle_1.webp'],     // こっそり教える（指を突きつけてささやく。ユーザー選択「神託2」）
    // 各場面の _1 が基本の絵（束に2回入れて、半分ほどはこれが出る）。_2・_3 は混ぜる種類（ユーザー「3を基本に1，2も使えそうなら使っていいよ」）
    jackpot: ['assets/characters/umme_ci_jackpot_1.webp', 'assets/characters/umme_ci_jackpot_1.webp', 'assets/characters/umme_ci_jackpot_2.webp', 'assets/characters/umme_ci_jackpot_3.webp'],   // 驚いて喜ぶ（元 jackpot_3・1・2）
    hit: ['assets/characters/umme_ci_jackpot_2.webp', 'assets/characters/umme_ci_jackpot_3.webp'],   // 神託どおりに当たった（大当たりの元 1・2 の絵）
    betray: ['assets/characters/umme_ci_betray_1.webp', 'assets/characters/umme_ci_betray_1.webp', 'assets/characters/umme_ci_betray_2.webp', 'assets/characters/umme_ci_betray_3.webp'],   // ぷんぷん怒って指さす（元 betray_3・1・2）
    climax: ['assets/characters/umme_ci_climax_1.webp', 'assets/characters/umme_ci_climax_1.webp', 'assets/characters/umme_ci_climax_2.webp', 'assets/characters/umme_ci_climax_3.webp'],   // 祈って見守る（元 climax_3・1・2）
  };
  let ciLast = {};
  // 束から1枚：同じ絵は続けて出さない（束に2回入っている基本の絵も、前と同じなら引き直す）
  const ciPick = (kind) => {
    const a = CI_ART[kind] || []; if (!a.length) return null;
    const kinds = new Set(a).size;
    let src = a[Math.floor(Math.random() * a.length)];
    for (let t = 0; t < 8 && kinds > 1 && src === ciLast[kind]; t++) src = a[Math.floor(Math.random() * a.length)];
    ciLast[kind] = src; return src;
  };
  // 先読み：卓に入った時に全部読んでおく（決め所で遅れて出ると興ざめ）
  const ciPreload = () => { [...new Set(Object.values(CI_ART).flat().concat(Object.values(UMME)))].forEach(src => { if (src) { const im = new Image(); im.decoding = 'async'; im.src = src; } }); };
  let cutinT = 0;
  function cutin(kind, head, main, sub, face, ms) {
    if (!host || !live() || !ART.goddess) return;
    host.querySelectorAll('.bc-cutin').forEach(e => e.remove()); clearTimeout(cutinT);
    const el = document.createElement('div');
    const special = ciPick(kind);
    godFace(face, (ms || 1500) + 2000);
    el.className = 'bc-cutin is-' + kind + (special ? ' has-ci' : ''); el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<i class="bc-ci-band"></i><img class="bc-ci-pic" src="${special || UMME[face] || UMME.base}" alt=""><div class="bc-ci-t"><b class="bc-ci-h">${esc(head)}</b><strong class="bc-ci-m">${esc(main).replace(/\|/g, '<wbr>')}</strong>${sub ? `<span class="bc-ci-s">${esc(sub).replace(/\|/g, '<wbr>')}</span>` : ''}</div>`;
    host.appendChild(el);
    cutinT = setTimeout(() => { el.classList.add('is-out'); cutinT = setTimeout(() => el.remove(), 380); }, ms || 1500);
  }
  // 台詞を「見出し｜残り」に分ける（カットインの大きな1行と小さな1行）
  const splitLine = (t) => { const k = t.indexOf('|'); return k < 0 ? [t, ''] : [t.slice(0, k), t.slice(k + 1)]; };

  // ---- ディーラーの身のこなし：配る・開く時に配る側へ乗り出す／決着で反応する ----
  function dealerMove(w) {
    const d = host && host.querySelector('.bc-dealer'); if (!d) return;
    d.dataset.move = w; d.classList.remove('is-deal'); void d.offsetWidth; d.classList.add('is-deal');
  }
  function dealerReact(r) {
    const d = host && host.querySelector('.bc-dealer'); if (!d) return;
    d.dataset.react = r; d.classList.remove('is-react'); void d.offsetWidth; d.classList.add('is-react');
  }

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
      if (!el.dataset.res) el.querySelector('.bc-spot-a').textContent = a ? fmt(a) : '';   // 決着の間は増減（＋28 など）を出したままにする
      el.querySelector('.bc-spot-chips').innerHTML = chipsHTML(a);
      el.dataset.on = a ? '1' : '0';
    }
    const st = stakeOf(S.bets);
    ui.coins.textContent = fmt(coins() - (S.phase === 'bet' ? st : 0));
    host.querySelectorAll('.bc-chip').forEach(b => { b.dataset.on = (+b.dataset.v === S.chip) ? '1' : '0'; b.disabled = coins() - st < +b.dataset.v; });
    ui.go.disabled = S.phase !== 'bet' || st < C.minBet;
    host.dataset.staked = st ? '1' : '0';
    if (S.pledges) paintPins();
    ui.goS.textContent = st ? `賭け ${fmt(st)}` : '賭ける所を押す';
    ui.sqmode.textContent = '絞り：' + ({ auto: '自動', manual: '自分で', off: 'なし' }[S.A.sqMode] || '自動');
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
    (S.hist = S.hist || []).push([k, add]);
    // 押した手応え：置いた額が賭け所から浮かぶ
    const el = host.querySelector('.bc-spot-' + k), f = document.createElement('i');
    f.className = 'bc-plus'; f.textContent = '＋' + fmt(add); el.appendChild(f); setTimeout(() => f.remove(), 700);
    el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit');
    paintBets();
  }

  // =============================================================
  // 運命の女神ウンメ：気分・問いかけ・約束・おしゃべり・神託
  // 人物は「ドラゴンレース紀行」の解説席のウンメちゃんと同じ（2026-11-16 ユーザー）。口調の元：mimi_dragon_race_game/js/data_commentators.js
  //   はじけた女神。言い切らない・すぐ煽る・全部その場のノリ。敬語はほぼ使わない。「〇〇でーす」「〜まーす！」「〜ませーん！」のような人をくった言い方と「知らんけど！」「〜だよぉ」、自分を「ウンメちゃん」と呼ぶ。口癖「リアルタイムアタック！」
  // ご機嫌（0〜3）の上がり方は、上がった時に理由つきで見せる（2026-11-16 ユーザー「約束を守ると機嫌がよくなるんですかね？」）：
  //   気分に合う返事 ＋1／約束を守る ＋1／お願いを聞く ＋1／おしゃべりで気に入られる ＋1（6手に1回まで）／裏切る −2。3つ満ちると神託
  // 約束は3つまで同時に持てる（前の約束が果たされる前に次の問いが来ても消えない）
  // =============================================================
  const MOODS = {
    bored: { tag: '退屈', like: 'bold', hint: '大胆な返事が好きそう', open: ['ふわぁ〜、ウンメちゃん退屈ぅ。', 'なんか刺激が足りなーい！', 'もっとこう、どーんと来てよぉ'] },
    happy: { tag: 'ごきげん', like: 'ride', hint: '流れに乗る返事が好きそう', open: ['るんるん、いい流れでーす。', 'ウンメちゃん、今日はごきげんでーす！', 'この調子この調子ぃ！'] },
    uneasy: { tag: '胸さわぎ', like: 'careful', hint: '慎重な返事が好きそう', open: ['……運命の糸が、ピンって鳴ったの。', 'うーん、風向きがあやしいかも。', 'なんか、ざわざわするぅ'] },
  };
  // ふつうのおしゃべり（約束にはならない）。[返事, 気に入るか, ウンメの一言]
  const SMALLTALK = [
    { q: 'ねえねえ、ウンメちゃんのこの髪型、|どう思う？', o: [['すごく似合ってます', 1, 'でしょでしょー！|見る目あるじゃーん！'], ['輪っかが気になります', 0, '輪っかは女神のしるしでーす！'], ['それより次の勝負です', 0, 'つれなーい！']] },
    { q: '竜のレース、見たことある？|はやい子はえらいんだよー！', o: [['速いのは気持ちいいですよね', 1, 'わかってるぅ！|リアルタイムアタック！'], ['見たことないです', 0, 'えー、もったいなーい！'], ['賭けの方が好きです', 0, 'ふーん、そういう子かぁ']] },
    { q: 'ウンメちゃんって、うるさい？|……正直に！', o: [['にぎやかで楽しいです', 1, 'えへへ、もっと喋っちゃいまーす！'], ['ちょっとだけ……', 0, 'がーん！|……3秒だけ黙りまーす'], ['静かにしてください', 0, 'やでーす！']] },
    { q: '運命って、変えられると|思う？', o: [['変えてみせます', 1, 'いい返事！|そういう子、女神は好きでーす！'], ['女神さま次第では？', 0, 'えー、ウンメちゃんのせいにするぅ？'], ['考えたことないです', 0, 'じゃあ今考えてー！']] },
    { q: 'そのうさ耳、本物なんでしょ？|さわってもいい？', o: [['す、少しだけなら……', 1, 'やったぁ！|ふわっふわだぁ！'], ['だめです！', 0, 'けちー！'], ['勝ったらいいですよ', 1, 'おっ、言ったね？|覚えときまーす！']] },
    { q: 'ここのディーラーの子たち、|誰が好き？', o: [['みんな素敵です', 0, '八方美人だねぇ〜'], ['ウンメさまが一番です', 1, 'きゃー！　わかってるぅ！'], ['……ないしょです', 0, 'あやしーい！']] },
    { q: 'ウンメちゃんが次の結果を知ってるって、|信じてる？', o: [['信じてます', 1, 'えっへん！|ほんとに知ってまーす！'], ['半分くらい……', 0, '半分ってなにさー！'], ['教えてくれたら信じます', 0, 'ずるーい！|タダじゃ教えませーん！']] },
    { q: '運命の糸がピンピン鳴ってるの。|聞こえる？', o: [['聞こえる気がします', 1, 'でしょー！|ミミちゃん素質あるよぉ！'], ['聞こえません', 0, 'だよねぇ。|女神にしか聞こえませーん'], ['それ耳鳴りでは', 0, 'しっつれーい！']] },
    { q: 'バカラって、のんびりしてるよねぇ。|もっと速くならないの？', o: [['速く配ってもらいましょう', 1, 'それそれ！|リアルタイムアタック！'], ['このくらいが好きです', 0, 'えー、のんびり屋さーん'], ['絞りはゆっくりがいいです', 0, 'むぅ……それは一理あるかも']] },
    { q: 'ミミちゃんって、ここに来る前は|何してたの？', o: [['三日徹夜で働いてました', 1, 'ひえー！|ここの方が|ずっといいじゃーん！'], ['覚えてないです', 0, 'あらら。まあ、|今が楽しければ！'], ['ないしょです', 0, 'ウンメちゃんは|知ってるけどねー！']] },
  ];
  const LIKE_JA = { bold: '大胆な返事', ride: '流れに乗る返事', careful: '慎重な返事' };
  // 稼ぎの釣り合いのつまみ（試算 qa/baccaratecon.mjs で決める）
  //   lookQuiet＝見（ケン）がこの手数つづく間、女神は問いかけない（運命は賭けた人にしか微笑まない）
  //   cool＝大きな神託のあと、この手数は口がかたい（問いかけず、ご機嫌が満ちても神託は待つ）
  // 2026-11-17 試算で決定（ユーザー「基本的にはプレイヤーに稼がせてあげたい」）：上手に返事を続けた人で1時間に約4,600〜4,900（絞り＝自動）、普通に賭ける人でも数百の浮き。
  //   口止めの間も問いかけは続け（約3手に1回）、大きな神託だけ待たせる。口止め20手＝約6,300〜7,000／30手＝約4,600〜4,900／40手＝約2,800〜3,500。つまみなしでは約18,000
  //   見（ケン）が続いても黙らない（ユーザー「基本は見のゲームになると思っているので、黙られると困ります」）→ lookQuiet は使わない
  //   askInCool＝口止めの間も問いかけは続ける（大きな神託だけ待たせる）
  const TUNE = { lookQuiet: Infinity, cool: 30, askInCool: true };
  // 口止めの残り：ご機嫌の横に「内緒 あと n手」（神託をもらった直後、なぜ神託が来ないかが分かるように）
  function paintCool() {
    if (!host || !S) return;
    const left = Math.max(0, (S.A.coolTo || 0) - S.A.hands);
    ui.favor.dataset.cool = left ? `内緒 あと${left}手` : '';
  }
  let favorT = 0;
  const cooling = () => (S.A.coolTo || 0) > S.A.hands;
  // ご機嫌が満ちたら大きな神託。ただし口止めの間は満ちたまま待ち、明けた手の頭で出す（返事・おしゃべりでも同じ）
  function tryBig() { if (S.A.favor >= 3 && !cooling()) { setFavor(0); giveOracle(true); return true; } return false; }
  // why＝上がり下がりの理由（ご機嫌の横に「約束を守った ＋1」のように出す）
  function setFavor(n, why) {
    const A = S.A, was = A.favor;
    A.favor = Math.max(0, Math.min(3, n));
    ui.favor.dataset.n = A.favor;
    const d = A.favor - was;
    if (d > 0) { ui.favor.classList.remove('is-up'); void ui.favor.offsetWidth; ui.favor.classList.add('is-up'); sfx('reach'); }
    if (d < 0) { ui.favor.classList.remove('is-down'); void ui.favor.offsetWidth; ui.favor.classList.add('is-down'); }
    if (why && d) {
      const left = 3 - A.favor;
      ui.fnote.innerHTML = `${esc(why)} <b>${d > 0 ? '＋' : '−'}${Math.abs(d)}</b>${d > 0 && left > 0 ? `<small>あと${left}で神託</small>` : d > 0 && cooling() ? '<small>内緒が明けたら神託</small>' : ''}`;
      ui.fnote.dataset.s = d > 0 ? 'up' : 'dn'; ui.fnote.hidden = false;
      clearTimeout(favorT); favorT = setTimeout(() => { if (live()) ui.fnote.hidden = true; }, 3200);
    }
  }
  // 神託：女神だけが知っている次の結果。big＝勝つ側にかかわること／small＝小さな手がかり。いつも本当のことだけ言う
  function giveOracle(big) {
    const h = BC.peekHand(S.shoe);
    let text, say1, kind, w = h.w;
    if (big) {
      if (h.w === 'T') { kind = 'tie'; text = '次は引き分け'; say1 = pick(['ないしょだよぉ？　次、|引き分け！　……言っちゃった！', '耳かして。次はね、|引き分けでーす！']); }
      else if (Math.random() < .5) { kind = 'win'; text = `次は${SIDE_JA[h.w]}が勝つ`; say1 = pick([`ないしょだよぉ？　次は|${SIDE_JA[h.w]}！　……言っちゃった！`, `女神の予言！　次は${SIDE_JA[h.w]}！|これはほんとのやつでーす！`]); }
      else { kind = 'notwin'; w = other(h.w); text = `次は${SIDE_JA[w]}は勝たない`; say1 = pick([`ひとつだけ！　次、${SIDE_JA[w]}は|勝ちませーん！`, `${SIDE_JA[w]}はね、次は勝たないんだよぉ。|それ以上は言わなーい！`]); }
    } else {
      const opts = [];
      opts.push(h.natural ? ['nat', '次はナチュラル（8か9）が出る', 'あ、次ね、|ナチュラル出るよぉ。|どっちにかは|言わなーい！'] : ['third', '次は3枚目まで配られる', '次はね、|3枚目まで行くよぉ。|もつれるもつれる！']);
      if (h.w !== 'T') opts.push(['notie', '次は引き分けではない', '次は引き分けじゃないよぉ。|それだけ！']);
      const r = h.p[0].rank;
      opts.push(['p1', `プレイヤーの1枚目は${r >= 10 ? '0の札（10か絵札）' : r >= 6 ? '6より上' : '5より下'}`, `プレイヤーの1枚目、|${r >= 10 ? '0の札' : r >= 6 ? '大きい数' : '小さい数'}だよぉ`]);
      [kind, text, say1] = pick(opts);
    }
    S.oracle = { text, big, kind, w, hand: S.shoe.hands + 1 };
    S.A.oracles++;
    if (big && TUNE.cool) S.A.coolTo = S.A.hands + 1 + TUNE.cool;   // この手（神託の手）の後、cool 手は口がかたい
    if (big) cutin('oracle', '神託', text, say1.replace(/\|/g, ''), 'doya', 1700); else godFace('doya', 3000);
    say('goddess', say1, 3600);
    if (big && TUNE.cool) { say('goddess', pick(TUNE.askInCool ? ['……しゃべりすぎちゃった！|しばらく神託はおあずけでーす！', 'あ、言いすぎた！|次の神託はしばらく先でーす！'] : ['……しゃべりすぎちゃった！|しばらく内緒でーす！', 'あ、言いすぎた！|しばらくお口チャックでーす！']), 2600); paintCool(); }
    paintPins(); sfx('garapon');
    if (!S.A.orSeen) { S.A.orSeen = true; say('rico', 'ウンメさまの神託は|ウソをつかない。|ただし、ぜんぶは|教えてくれないよ', 3600); }
    const mh = mimiHint(); if (mh && mh[1] >= 1) say('mimi', `（${mh[0]}）`, 4400);
  }
  function paintPins() {
    const o = S.oracle;
    const st0 = stakeOf(S.bets || {}), mainBet = (S.bets || {}).P || (S.bets || {}).B;
    const mission = S.phase !== 'bet' ? '' : coins() < C.minBet && !st0 ? 'コインが足りない。「見（ケン）」で流れを見る'
      : !st0 ? 'どちらが勝つ？　賭ける所を押す' : '「配る」で勝負！';
    ui.pins.innerHTML = (mission ? `<b class="bc-mission">${mission}</b>` : '') + (o ? `<span class="bc-oracle"><b>神託</b>${esc(o.text)}</span>` : '')
      + S.pledges.map(p => `<span class="bc-pledge" data-st="${p.armed ? 'armed' : 'wait'}"><b>約束</b>${p.html || esc(p.tag)}</span>`).join('')
      + (S.judged || []).map(j => `<span class="bc-pledge" data-judge="${j}">${j === 'kept' ? '有言実行' : '裏切り'}</span>`).join('');
  }
  // 問いかけを作る。{ q, opts:[{ t, kind, make? }], chip?, hint? }。kind＝bold/ride/careful/wish/none。同じ中身の約束がもうある問いは出さない
  function makeQuestion() {
    const st = S.road.stats, sw = st.streak.w, n = st.streak.n, T = [];
    const last = S.res[S.res.length - 1], lastWasTie = last && last.w === 'T';
    const has = (key) => S.pledges.some(p => p.key === key);
    const dot = (w, k) => `<i class="bc-dot is-${w}"></i>${k ? '×' + k : ''}`;
    const side = (key, cond, promise, tag, now) => () => {
      const m = /^s:(\w):(\d+)$/.exec(key);
      const act = promise === 'look' ? '見（ケン）' : promise === 'pair' ? 'ペアに賭ける' : promise === 'nopair' ? 'ペアに賭けない' : promise === 'noT' ? '引き分けに賭けない' : `${dot(promise)}に賭ける`;
      return { type: 'side', key, cond, promise, tag, html: (m ? `${dot(m[1], m[2])} なら` : 'この1回') + ' → ' + act, armed: !!now, left: 14 };
    };
    const stakeP = (key, on, p, tag) => () => ({ type: 'stake', key, on, promise: p, tag, html: (on === 'win' ? '当たったら → ' : '外れたら → ') + { up: '上げる', same: '同じ額', down: '下げるか見' }[p], armed: false, left: 14, base: 0 });
    const look = (key, cond, pre) => ({ t: '見（ケン）する', kind: 'careful', make: side(key, cond, 'look', `${pre} → 見（ケン）する`, !cond) });
    if (sw && n >= 2 && !has(`s:${sw}:${n + 1}`)) {
      const o = other(sw), k = n + 1, key = `s:${sw}:${k}`, cond = (s) => s.streak.w === sw && s.streak.n >= k, pre = `${SIDE_JA[sw]}${k}連勝なら`;
      T.push({ q: pick([`いま${SIDE_JA[sw]}が${n}連勝！|${k}連勝まで伸びたら、その次どうする？`, `${SIDE_JA[sw]}、${n}回続いてるねぇ。|もう1回来たら、その次は？`]), opts: [
        { t: `${SIDE_JA[sw]}に乗る`, kind: 'ride', make: side(key, cond, sw, `${pre} → ${SIDE_JA[sw]}に賭ける`) },
        { t: `逆の${SIDE_JA[o]}に賭ける`, kind: 'bold', make: side(key, cond, o, `${pre} → ${SIDE_JA[o]}に賭ける`) }, look(key, cond, pre)] });
    }
    if (!sw || n < 3) {
      const w = [Math.random() < .6 ? 'B' : 'P'].map(x => (has(`s:${x}:3`) ? other(x) : x))[0], o = other(w), key = `s:${w}:3`, cond = (s) => s.streak.w === w && s.streak.n >= 3, pre = `${SIDE_JA[w]}3連勝なら`;
      if (!has(key)) T.push({ q: pick([`ねえねえ、この先${SIDE_JA[w]}が3回続いたら、|${SIDE_JA[o]}に賭ける？　どうする？`, `もしもの話！　${SIDE_JA[w]}が3連勝したら、|その次はどっちに張る？`]), opts: [
        { t: `${SIDE_JA[o]}に賭ける`, kind: 'bold', make: side(key, cond, o, `${pre} → ${SIDE_JA[o]}に賭ける`) },
        { t: `${SIDE_JA[w]}に乗る`, kind: 'ride', make: side(key, cond, w, `${pre} → ${SIDE_JA[w]}に賭ける`) }, look(key, cond, pre)] });
    }
    if (!has('now')) {
      if (st.chop >= 3 && sw) {
        const o = other(sw);
        T.push({ q: `行ったり来たりしてるの！|次も交互なら${SIDE_JA[o]}。どうする？`, opts: [
          { t: `交互に乗る（${SIDE_JA[o]}）`, kind: 'ride', make: side('now', null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) },
          { t: `切れると見る（${SIDE_JA[sw]}）`, kind: 'bold', make: side('now', null, sw, `この1回 → ${SIDE_JA[sw]}に賭ける`, true) }, look('now', null, 'この1回')] });
      }
      if (lastWasTie && sw) {
        const o = other(sw);
        T.push({ q: '引き分けのあとって、どっちだと思う？|この1回、どうする？', opts: [
          { t: `前の続きで${SIDE_JA[sw]}`, kind: 'ride', make: side('now', null, sw, `この1回 → ${SIDE_JA[sw]}に賭ける`, true) },
          { t: `逆の${SIDE_JA[o]}`, kind: 'bold', make: side('now', null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) }, look('now', null, 'この1回')] });
        T.push({ q: '引き分けって続くんだよぉ。知らんけど！|この1回、引き分けにも賭ける？', opts: [
          { t: '賭ける（引き分け）', kind: 'bold', make: side('now', null, 'T', 'この1回 → 引き分けに賭ける', true) },
          { t: 'やめておく', kind: 'careful', make: side('now', null, 'noT', 'この1回 → 引き分けに賭けない', true) }] });
      }
      if (coins() >= 60 && S.res.length >= 4) T.push({ q: '次の1回、ペアに賭けてみない？|11倍だよぉ、11倍！', opts: [
        { t: '賭ける（どちらかのペア）', kind: 'bold', make: side('now', null, 'pair', 'この1回 → ペアに賭ける', true) },
        { t: 'やめておく', kind: 'careful', make: side('now', null, 'nopair', 'この1回 → ペアに賭けない', true) }] });
      if (last && last.nat && last.w !== 'T') {
        const w = last.w, o = other(w);
        T.push({ q: `さっきのナチュラル、きれいだったねぇ！|この1回、また${SIDE_JA[w]}に乗る？`, opts: [
          { t: `乗る（${SIDE_JA[w]}）`, kind: 'ride', make: side('now', null, w, `この1回 → ${SIDE_JA[w]}に賭ける`, true) },
          { t: `逆の${SIDE_JA[o]}`, kind: 'bold', make: side('now', null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) }, look('now', null, 'この1回')] });
      }
      // お願い：神託ではない（当たるとは限らない）。聞いてあげると喜ぶ
      if (S.res.length >= 3) {
        const w = pick(['P', 'B']), o = other(w);
        T.push({ wish: true, q: pick([`お願いがあるんだけどぉ。次の1回だけ、|${SIDE_JA[w]}に賭けてくれる？`, `ウンメちゃんの気まぐれ！　次の1回、|${SIDE_JA[w]}に張ってみない？　理由はないでーす！`]), opts: [
          { t: `いいですよ（${SIDE_JA[w]}）`, kind: 'wish', make: side('now', null, w, `この1回 → ${SIDE_JA[w]}に賭ける`, true) },
          { t: `いやです（${SIDE_JA[o]}）`, kind: 'none2', make: side('now', null, o, `この1回 → ${SIDE_JA[o]}に賭ける`, true) }, { t: '見（ケン）します', kind: 'none2', make: side('now', null, 'look', 'この1回 → 見（ケン）する', true) }] });
      }
    }
    if (S.lastStake > 0 && !has('stake')) T.push({ q: pick(['ねえ、次に外れちゃったら、|その次の賭け金どうする？', '外れた後って、人が出るよねぇ。|次に外れたら、賭け金は？']), opts: [
      { t: '上げて取り返す', kind: 'bold', make: stakeP('stake', 'lose', 'up', '外れたら → 次は賭け金を上げる') },
      { t: '同じ額で続ける', kind: 'ride', make: stakeP('stake', 'lose', 'same', '外れたら → 次も同じ額にする') },
      { t: '下げるか、見する', kind: 'careful', make: stakeP('stake', 'lose', 'down', '外れたら → 次は下げるか見（ケン）する') }] });
    if (S.lastStake > 0 && !has('stakeW')) T.push({ q: 'じゃあ逆に！　次に当たったら、|その次の賭け金どうする？', opts: [
      { t: '上げて攻める', kind: 'bold', make: stakeP('stakeW', 'win', 'up', '当たったら → 次は賭け金を上げる') },
      { t: '同じ額で続ける', kind: 'ride', make: stakeP('stakeW', 'win', 'same', '当たったら → 次も同じ額にする') },
      { t: '下げて守る', kind: 'careful', make: stakeP('stakeW', 'win', 'down', '当たったら → 次は下げるか見（ケン）する') }] });
    const q = pick(T);
    if (!q) return null;
    if (!q.wish) q.opts.push({ t: 'その時に決める', kind: 'none' });
    q.mood = pick(Object.keys(MOODS));
    return q;
  }
  function askQuestion() {
    const A = S.A;
    // 4回に1回は、約束にならないふつうのおしゃべり
    let q = null;
    if (A.godSeen && Math.random() < .27) { const cands = SMALLTALK.map((x, k) => k).filter(k => k !== A.lastTalk); A.lastTalk = pick(cands); q = { talk: SMALLTALK[A.lastTalk] }; }
    if (!q) q = makeQuestion();
    if (!q) return;
    A.askedAt = A.hands;   // 通しの手数で覚える（札の山の手数は山ごとに0へ戻るので、2つ目の山から問いが来なくなっていた）
    if (!A.godSeen) {
      A.godSeen = true; keep(); hush();
      say('rico', '女神のウンメさまは|次の結果を知ってる。|気分に合う返事で、|口をすべらせるよ', 4200);
      const g = G; setTimeout(() => { if (g === G && live() && S.phase === 'bet' && !S.q) showAsk(q); }, 4300);
      return;
    }
    showAsk(q);
  }
  function showAsk(q) {
    const A = S.A, favor = `<span class="bc-favor" data-n="${A.favor}"><span>ご機嫌</span><i></i><i></i><i></i></span>`;
    hush();
    ui.ask.hidden = false; host.dataset.ask = '1';
    let chip, hint, text, opts;
    if (q.talk) { chip = '<span class="bc-mood is-talk">おしゃべり</span>'; hint = '気に入る返事なら、ご機嫌が上がるかも'; text = q.talk.q; opts = q.talk.o.map(o => o[0]); }
    else {
      const M = MOODS[q.mood];
      chip = q.wish ? '<span class="bc-mood is-wish">お願い（神託ではない）</span>' : `<span class="bc-mood is-${q.mood}">気分：${M.tag}</span>`;
      hint = q.wish ? '聞いてあげると喜びそう' : M.hint; text = q.q; opts = q.opts.map(o => o.t);
      if (!q.wish) say('goddess', pick(M.open), 2200);
    }
    ui.ask.innerHTML = `<div class="bc-ask-h"><b>運命の女神 ウンメ</b>${favor}${chip}<span class="bc-ask-hint">ミミ「${hint}」</span></div>
      <p class="bc-ask-q">${esc(text).replace(/\|/g, '<br>')}</p>
      <div class="bc-ask-o" data-n="${opts.length}">${opts.map((t, i) => `<button type="button" data-bc="answer" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
    S.q = q; sfx('tap');
  }
  function answer(i) {
    const q = S.q; if (!q) return;
    const A = S.A;
    S.q = null; ui.ask.hidden = true; delete host.dataset.ask;
    if (q.talk) {
      const o = q.talk.o[i];
      say('goddess', o[2], 2800);
      // おしゃべりで上がるのは6手に1回まで（約束なしで神託を量産させない）
      if (o[1] && A.hands - (A.talkAt == null ? -99 : A.talkAt) >= 6) { A.talkAt = A.hands; setFavor(A.favor + 1, '気に入られた'); tryBig(); }
      keep(); return;
    }
    const o = q.opts[i], M = MOODS[q.mood];
    if (o.kind === 'none') { godFace('jito', 2600); say('goddess', pick(['はぐらかしたー！|つまんなーい！', 'ふーん、慎重だねぇ。|知らんけど！', 'えー、決めてくれないのぉ？'])); return; }
    S.pledges.push(o.make()); if (S.pledges.length > 3) S.pledges.shift();
    paintPins();
    const liked = o.kind === 'wish' || (!q.wish && o.kind === M.like);
    if (liked) {
      say('goddess', o.kind === 'wish' ? pick(['やったぁ！　話がわかるぅ！', 'えへへ、ありがとー！|約束だよぉ？']) : pick(['それそれ！|そういうの大好きでーす！', 'わかってるぅ！|ウンメちゃん感激！', 'いい返事！|運命の糸がピンって鳴った！', 'そう来なくっちゃ！']));
      setFavor(A.favor + 1, o.kind === 'wish' ? 'お願いを聞いた' : '気分に合う返事'); godFace('doya', 2600);
      if (!tryBig() && Math.random() < .3) giveOracle(false);
    } else say('goddess', q.wish ? pick(['えー、けちー！|まあ、好きにすればー？', 'ふーんだ。じゃあ、それで']) : pick(['へぇ〜、そうするんだ。|覚えときまーす！', 'ふうん。約束だよぉ？', 'はーい、女神が聞いたからね！', 'なるほどぉ。……守ってよね？']));
    keep();
  }
  // 賭ける場面の頭：約束の時が来たかを見る。果たされていない約束は残す（時効は14手）
  function pledgeTick() {
    S.judged = [];
    let armedNow = null, expired = false;
    S.pledges = S.pledges.filter(p => {
      if (p.type === 'side' && !p.armed && p.cond && p.cond(S.road.stats)) { p.armed = true; armedNow = p; }
      if (!p.armed && --p.left <= 0) { expired = true; return false; }
      return true;
    });
    if (armedNow) { say('goddess', pick([`約束の時だよぉ！|${armedNow.tag.split(' → ')[1]}んだよね？`, `はーい、あの約束の出番でーす！|${armedNow.tag.split(' → ')[1]}んだったよね？`]), 3400); sfx('reach'); }
    else if (expired) say('goddess', 'あの約束、もう時効！|忘れてあげまーす！');
    if (S.pledges.some(p => p.armed) && !S.A.betraySeen) { S.A.betraySeen = true; keep(); say('rico', '約束は守るとご機嫌が上がる。|破ってもいいけど、下がるよ', 3800); }
    paintPins();
  }
  // 配る時：効いている約束を1つずつ判定する。戻り値 { kept, broken }（数）
  function pledgeJudge(bets, stake) {
    const out = { kept: 0, broken: 0 };
    S.judged = [];
    const pair = !!(bets.PP || bets.BP);
    S.pledges = S.pledges.filter(p => {
      if (!p.armed) return true;
      let ok;
      if (p.type === 'side') ok = p.promise === 'look' ? stake === 0 : p.promise === 'pair' ? pair : p.promise === 'nopair' ? !pair : p.promise === 'noT' ? !bets.T : !!bets[p.promise];
      else ok = p.promise === 'up' ? stake > p.base : p.promise === 'same' ? stake === p.base : stake < p.base;
      S.judged.push(ok ? 'kept' : 'broken');
      if (ok) { out.kept++; S.A.kept++; } else { out.broken++; S.A.broken++; }
      return false;
    });
    paintPins();
    return out;
  }
  // ---- 賭ける場面の会話：ウンメの茶々／ディーラーの一言・掛け合い／ミミの心の声（助言） ----
  const dline = (v, ms) => { const a = Array.isArray(v) ? v : [DL.name, v]; say('dealer', a[1], ms, a[0]); };
  // ミミの心の声：いま見るべき物を1つだけ言う（神託の読み方・約束・ご機嫌・流れ）
  function mimiHint() {
    const o = S.oracle, armed = S.pledges.filter(p => p.armed), st = S.road.stats, A = S.A;
    const sideP = armed.find(p => p.type === 'side' && (p.promise === 'P' || p.promise === 'B'));
    if (o && o.kind === 'win') {
      if (sideP && sideP.promise !== o.w) return [`約束は${SIDE_JA[sideP.promise]}。でも神託は${SIDE_JA[o.w]}……|守ってご機嫌か、裏切って勝ちか`, 1];
      return [`神託は「${SIDE_JA[o.w]}が勝つ」。|ウソはつかない……|ここは${SIDE_JA[o.w]}！`, 1];
    }
    if (o && o.kind === 'notwin') return [`神託は「${SIDE_JA[o.w]}は勝たない」。|なら${SIDE_JA[other(o.w)]}……引き分けもあるけど`, 1];
    if (o && o.kind === 'tie') return ['神託は「引き分け」！|8倍……引き分けに賭ける好機', 1];
    if (o && o.kind === 'notie') return ['引き分けは無い……|引き分けに賭ける意味はない、と', 1];
    if (armed.length) return [`約束の時。${armed[0].tag.split(' → ')[1]}……|守ればご機嫌が上がる`, 1];
    if (A.favor === 2) return ['ご機嫌はあと1つ。|満ちれば、神託がもらえる', .7];
    if (coins() < 50) return ['手持ちが少ない……|見（ケン）で様子を見よう', .8];
    if (S.lossRun >= 3) return ['続けて外れてる……|上げずに、落ち着こう', .6];
    if (st.streak.w && st.streak.n >= 4) return [`${SIDE_JA[st.streak.w]}が${st.streak.n}回……でも次の確率は同じ、|って先輩が言ってた`, .5];
    if (st.chop >= 4) return ['交互に来てる……|でも、いつ切れてもおかしくない', .4];
    if (S.res.length && S.res.length % 9 === 0) return ['バンカーは少し有利、引き分けは当たりにくい。|先輩の解説、もう一度見ようかな', .5];
    return null;
  }
  function chatter() {
    const st = S.road.stats, sw = st.streak.w, n = st.streak.n, L = [];
    if (sw && n >= 4) L.push([`${SIDE_JA[sw]}のツラ、${n}本目！|どこまで伸びるかなぁ、知らんけど！`, 'ツラは「続いた記録」。|次の1回の確率は変わらないよ'], [`${n}連勝！　${SIDE_JA[sw]}が止まりませーん！|止めるのは誰かなぁ？`, null]);
    if (st.chop >= 4) L.push(['行ったり来たり！|運命の糸、いま大渋滞でーす！', null]);
    if (S.looks >= 3) L.push(['見てるだけ〜？|運命は|賭けた人にしか|微笑みませーん！', '見（ケン）は|立派な手だよ。|賭けなければ|減らないじゃん']);
    if (S.lossRun >= 3) L.push([`${S.lossRun}回つづけて外れ！|……ねえ、まだやる？`, '取り返そうと|上げても、|勝ちやすくは|ならないよ'], ['あらら、|ツイてないねぇ。|ウンメちゃんの|せいじゃないよぉ？', null]);
    if (S.winRun >= 3) L.push([`${S.winRun}連勝！|調子に乗っちゃえー！`, '勝ってる時こそ、賭け金は決めた額でね'], ['のってるねぇ！|女神の加護かなぁ？　……知らんけど！', null]);
    if (coins() < C.minBet) L.push(['すっからかん？|見てるだけでもいいよぉ', null]);
    if (!L.length) L.push(['次はどっちかなー。|ウンメちゃんは知ってまーす！', null], ['ねえねえ、どっちに賭けるの？', null], ['その顔、迷ってるねぇ！', null],
      ['さっさと賭けちゃえー！|リアルタイムアタック！', 'バカラは|速さを競う遊びじゃないよ。|ゆっくり決めな'], ['バンカーは|少しだけ勝ちやすいんだって。|知らんけど！', 'ほんとだよ。|だから勝つと|5%引かれるじゃん'],
      ['サイコロは振ったよ、もう戻せないよ！|……あ、これ札でしたぁ', null], ['罫線って、きれいな模様だよねぇ。|ウンメちゃんの落書きみたい！', '模様は記録。先のことは書いてないよ'],
      ['この時計塔、|たまに二分ずれるんだって。|知らんけど！', null], ['引き分けは8倍だよぉ、8倍！|夢があるねぇ！', '当たるのは|10回に1回くらい。|店の取り分が|いちばん大きいよ'],
      ['ミミちゃん、|手が止まってるよぉ。|運命は|待ってくれませーん！', null], ['こういうの、|あとで「あれが|分かれ目でした」|って言われるやつ〜！', null]);
    // ディーラーの一言か、ウンメとの掛け合い（3回に1回くらい）
    const DT = DL.T || {};
    if (Math.random() < .36 && (DT.idle || DT.banter)) {
      if (DT.banter && Math.random() < .5) { const b = pick(DT.banter); dline(b[0], 3000); say('goddess', b[1], 3000); }
      else if (DT.idle) dline(pick(DT.idle), 3200);
    } else {
      const [g, r] = pick(L);
      say('goddess', g);
      if (r && Math.random() < .6) say('rico', r, 3400);
    }
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
    sfx('deal'); paintTotals(); dealerMove(w);
    await wait(260);
  }
  async function flip(w, i) {
    const c = S.cards[w][i];
    c.el.classList.add('is-flip'); sfx('flip'); dealerMove(w);
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
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const rankJa = (r) => (r === 1 ? 'A' : r === 11 ? '絵札' : String(r));
  // めくりの右の候補の札：めくっている札と同じマークのトランプの絵（足・横の数と見比べる）＋右下に合計。絵札は K の絵で代表
  const candTile = (r, st, suit, t) => `<span class="bc-cd is-${st}" data-r="${r}" aria-label="${rankJa(r)}（合計${t}）"><i class="bc-cd-f" style="background-image:url(${SQ.faceURL({ suit, rank: r === 11 ? 13 : r }, 96)})"></i><small>${t}</small></span>`;
  // 「何が来てほしいか」を大きく言う。set＝まだあり得る数
  function wantHTML(states, set) {
    const wins = set.filter(r => states[r] === 'win'), ties = set.filter(r => states[r] === 'tie'), loses = set.filter(r => states[r] === 'lose');
    if (wins.length && wins.length <= 5) return `<em>${wins.map(rankJa).join('・')}</em>来い！`;
    if (wins.length && loses.length) return `<em>${loses.map(rankJa).join('・')}</em>以外、来い！`;
    if (wins.length) return '<em>勝ち</em>は目の前！';
    if (ties.length && loses.length) return `<em>${ties.map(rankJa).join('・')}</em>なら引き分け`;
    if (loses.length) return '……勝ちの札が、もう無い';
    if (RANKS.some(r => states[r] === 'win')) return '……届かず。次の札へ';
    return '札の端をめくって、数を読む';
  }
  // 絞り：賭けた側の札をめくる。4つの拍で見せる（2026-11-16 ユーザー「何が来てほしいのか分からないうちにめくれる・当たりかハズレかが飲み込めない・ドキドキが弱い」）
  //   拍0 予告：めくる前に「何が出たら勝ち／負け／もう1枚」を大きな札で見せる（自動なら約3秒、押せばすぐ）
  //   拍1 めくる：足 → 横の数。見えるたびに候補が消え、「当たり n／残り m」の印が減る。鼓動がだんだん速くなる
  //   拍2 溜め：勝ちと負けが両方残った最後の所で止めて、「どっち！？」
  //   拍3 判定：開いた札と一緒に「当たり！／ハズレ……／引き分け／まだ決まらない」と、その理由（合計と勝った側）を大きく出す
  // auto＝自動でめくって見せる（指で触れば、そこから自分でめくれる）。候補が最後の1つになったら、その場で確定して開く
  function thump() {
    try {
      if (typeof isSfxOn === 'function' && !isSfxOn()) return;
      if (typeof mpTone === 'function') { mpTone(64, .13, 'sine', .12); mpTone(50, .16, 'sine', .1, .005, .06, 150); }
    } catch (e) { }
  }
  let briefResolve = null;
  async function squeeze(w, i, mine, auto) {
    const c = S.cards[w][i], landscape = i === 2, g = G;
    const others = S.vals[w].filter((v, k) => k !== i && v != null).reduce((a, b) => a + b, 0);
    const tot = (r) => (others + (r >= 10 ? 0 : r)) % 10;
    const lab = (r) => (r === 1 ? 'A' : r === 11 ? '絵' : String(r));
    const wt = (r) => (r === 11 ? 3 : 1);   // 絵札は J・Q・K の3種ぶん
    const states = {}; RANKS.forEach(r => { states[r] = candState(w, i, r, mine); });
    const by = (k, set) => (set || RANKS).filter(r => states[r] === k);
    let beatT = 0, mySq = null;
    const setHeat = (set) => {
      const alive = by('win', set).length, h = !alive ? 0 : set.length <= 2 ? 3 : set.length <= 4 ? 2 : 1;
      ui.sq.dataset.heat = h; clearInterval(beatT); beatT = 0;
      if (h) beatT = setInterval(thump, [0, 1100, 780, 460][h]);
    };
    // 当たりの見込み：残っている札の種類を、勝ち・引き分け・負け・もう1枚の印で並べる
    const paintOdds = (set) => {
      const pips = ['win', 'tie', 'lose', 'next'].map(k => by(k, set).map(r => `<i class="k-${k}"></i>`.repeat(wt(r))).join('')).join('');
      const n = by('win', set).reduce((a, r) => a + wt(r), 0), m = set.reduce((a, r) => a + wt(r), 0);
      ui.odds.innerHTML = RANKS.some(r => states[r] === 'win') ? `<span>当たり <b>${n}</b>／残り <b>${m}</b></span><span class="bc-odds-p">${pips}</span>` : '';
    };
    try {
      host.dataset.sq = '1'; ui.sq.hidden = false; ui.sq.dataset.auto = auto ? '1' : '0'; delete ui.sq.dataset.climax;
      ui.verdict.hidden = true;
      const row = (x) => `<span class="bc-sc is-${x}${x === w ? ' is-now' : ''}"><b>${SIDE_JA[x]}</b>${S.cards[x].map((cc, k) => (S.vals[x][k] != null ? `<i class="bc-card is-face" style="background-image:url(${SQ.faceURL(cc.card, 160)})"></i>` : `<i class="bc-card is-back${x === w && k === i ? ' is-target' : ''}"></i>`)).join('')}<em>${ui.sides[x].querySelector('.bc-tot').textContent}</em></span>`;
      ui['sq-score'].innerHTML = row(other(w)) + row(w) + `<span class="bc-sc-bet">${SIDE_JA[mine]}に賭けた</span>`;
      ui.cands.innerHTML = RANKS.map(r => candTile(r, states[r], c.card.suit, tot(r))).join('');
      ui['sq-m'].innerHTML = wantHTML(states, RANKS); paintOdds(RANKS); ui.sq.dataset.heat = '0';
      // ---- 拍0：何が来てほしいか ----
      const tiles = (k) => by(k).map(r => `<i class="bc-bt is-${k}"><b>${lab(r)}</b><small>合計${tot(r)}</small></i>`).join('');
      const rowsB = [['win', 'で 勝ち'], ['tie', 'で 引き分け'], ['lose', 'で 負け'], ['next', 'は もう1枚引く']].filter(([k]) => by(k).length)
        .map(([k, t]) => `<div class="bc-br is-${k}"><span class="bc-br-t">${tiles(k)}</span><b>${t}</b></div>`).join('');
      ui.brief.innerHTML = `<b class="bc-brief-h">${by('win').length ? 'この1枚に、勝ちがある' : 'この1枚で、勝負が動く'}</b>${rowsB}<button type="button" class="bc-go" data-bc="sqgo"><b>${auto ? 'めくって（待っても進む）' : '自分でめくる'}</b></button>${auto ? '<i class="bc-brief-bar"></i>' : ''}`;
      const decisive = RANKS.some(r => states[r] !== 'next');
      if (decisive) { ui.brief.hidden = false; ui['sq-cv'].dataset.dim = '1'; }
      hush();
      const wins0 = by('win').map(rankJa);
      if (wins0.length && wins0.length <= 4) { say('goddess', `${wins0.join('か')}！　${wins0.join('か')}来いっ！|ウンメちゃんも祈ってまーす！`, 2800); say('mimi', `お願い……${wins0.join('か')}……！`, 1800); }
      else if (wins0.length) say('goddess', pick(['ここが運命の分かれ目でーす！|……たぶん！', 'さあさあ、何が出るかなぁ！']), 2400);
      else if (decisive) say('goddess', pick(['あらら、勝ちの目がもう無いよぉ', 'この札、どうなっても知らないよぉ？']), 2400);
      if (decisive) { sfx('reach'); thump(); }
      if (decisive) await new Promise((res, rej) => {
        let t = 0;
        briefResolve = () => { clearTimeout(t); briefResolve = null; (g === G && live()) ? res() : rej(STOP); };
        if (auto) t = setTimeout(() => briefResolve && briefResolve(), 3200);
      });
      ui.brief.hidden = true; delete ui['sq-cv'].dataset.dim;
      // ---- 拍1・2：めくる ----
      let lastN = 99, told = {}, climaxed = false, curSet = RANKS, openRes = null;
      const openedP = new Promise(r => { openRes = r; });
      const hot = (set) => by('win', set).length && set.some(r => states[r] !== 'win');
      const climaxFx = (set) => {
        climaxed = true; ui.sq.dataset.climax = '1'; hush();
        const wn = by('win', set).map(rankJa).join('か');
        ui['sq-m'].innerHTML = `<em>${wn}</em>なら勝ち！`;
        const cl = pick([`${wn}！？　${wn}なの！？|知ってるけど言わなーい！`, `いま運命の分岐点！|${wn}、来い来い来いっ！`]);
        say('goddess', cl, 2600);
        // 自動の時だけカットイン（自分でめくっている最中は札を隠さない）
        if (auto) cutin('climax', '運命の分岐点', `${wn}なら勝ち！`, splitLine(cl)[1], 'inori', 1350);
        sfx('reach'); thump(); setTimeout(thump, 330); setTimeout(thump, 660);
      };
      setHeat(RANKS);
      mySq = sq = SQ.create(ui['sq-cv'], {
        card: c.card, landscape, back: ART.back,
        onGrab: () => { sfx('tap'); ui.sq.dataset.auto = '0'; },
        onSeen: (info) => {
          const set = info.cands.map(r => Math.min(11, r)).filter((r, k, a) => a.indexOf(r) === k);
          ui.cands.querySelectorAll('.bc-cd').forEach(e => e.classList.toggle('is-out', !set.includes(+e.dataset.r)));
          if (set.length >= lastN) return;
          const first = lastN === 99; lastN = set.length; curSet = set; sfx('check');
          ui['sq-m'].innerHTML = wantHTML(states, set); setHeat(set); paintOdds(set);
          // 残った候補の結果が全部同じ（全部当たり・全部ハズレ・全部引き分け）になったら、その瞬間に確定して開く（候補が1つの時も同じ）
          const sts = new Set(set.map(r => states[r]));
          if (set.length === 1 || (decisive && sts.size === 1)) {
            if (sts.has('lose') && by('win').length && !told.dead) { told.dead = 1; hush(); say('goddess', 'あーあ、消えちゃった〜。|言わんこっちゃない！', 2400); }
            setTimeout(() => { if (sq === mySq && mySq) mySq.open(); }, 420); return;
          }
          if (!auto && !climaxed && hot(set) && set.reduce((a, r) => a + wt(r), 0) <= 3) { climaxFx(set); return; }
          const key = set.join(','), has = (a) => set.every(r => a.includes(r));
          const alive = by('win', set).map(rankJa).join('か'), hadWin = by('win').length;
          let line = null;
          if (hadWin && !alive && !told.dead) { told.dead = 1; line = 'あーあ、消えちゃった〜。|言わんこっちゃない！'; sfx('lose'); }
          else if (key === '4,5,6,7,8,9,10') line = alive ? `足あり！　4より上！|${alive}、まだ生きてるよぉ！` : '足あり！　4より上だよぉ';
          else if (has([1, 2, 3]) && set.length <= 3 && !told.low) { told.low = 1; line = alive ? `足なし！　ちっちゃい数！|${alive}、あるある！` : '足なし……ちっちゃい数だぁ'; }
          else if (key === '6,7,8') line = alive ? `横に3つ！　6か7か8！|${alive}来いっ！` : '横に3つ！　6か7か8！';
          else if (key === '9,10') line = alive ? `横に4つ！　9か10！|${alive}来いっ！` : '横に4つ！　9か10！';
          else if (key === '4,5') line = alive ? `横に2つ！　4か5！|${alive}来いっ！` : '横に2つ。4か5だよぉ';
          else if (alive && !first) line = pick(['まだ生きてる！　生きてるよぉ！', 'いま運命の分岐点！|……たぶん！　知らんけど！']);
          if (line && !told[key]) { told[key] = 1; hush(); say('goddess', line, 2400); if (alive) sfx('reach'); }
        },
        onOpen: () => openRes(),
      });
      if (auto) {
        // 自動：短い辺（足）→ 長い辺（横の数）→ ゆっくり全部。勝ちと負けが両方残った最後の所で、いったん止めて溜める
        const steps = landscape
          ? [{ from: [0, .5], to: [.36, .5], ms: 1500, hold: 1500 }, { from: [.5, 1], to: [.5, .5], ms: 1500, hold: 1500 }, { from: [0, .5], to: [.99, .5], ms: 3000, hold: 200, keep: true }]
          : [{ from: [.5, 1], to: [.5, .64], ms: 1500, hold: 1500 }, { from: [1, .5], to: [.5, .5], ms: 1500, hold: 1500 }, { from: [1, .5], to: [.01, .5], ms: 3000, hold: 200, keep: true }];
        await wait(450);
        for (let k = 0; k < steps.length; k++) {
          const I = mySq.info();
          if (sq !== mySq || I.opened || I.cancelled) break;
          if (!climaxed && hot(curSet) && (k === steps.length - 1 || curSet.reduce((a, r) => a + wt(r), 0) <= 3)) { climaxFx(curSet); await wait(1700); if (sq !== mySq || mySq.info().cancelled) break; }
          await mySq.demo([steps[k]]);
        }
        const I = mySq.info();
        if (sq === mySq && !I.opened && !I.cancelled) mySq.open();
      }
      await openedP;
      if (g !== G || !live()) throw STOP;
      // ---- 拍3：判定 ----
      clearInterval(beatT); beatT = 0; ui.sq.dataset.heat = '0'; delete ui.sq.dataset.climax;
      if (sq) { sq.destroy(); sq = null; }
      const me = Math.min(11, c.card.rank), st = states[me];
      ui.cands.querySelectorAll('.bc-cd').forEach(e => { e.classList.toggle('is-out', +e.dataset.r !== me); e.classList.toggle('is-hit', +e.dataset.r === me); });
      showFace(c.el, c.card); S.vals[w][i] = BC.valueOf(c.card); paintTotals();
      ui['sq-cv'].classList.add('is-open'); ui['sq-cv'].style.backgroundImage = `url(${SQ.faceURL(c.card, 320)})`;
      ui['sq-cv'].dataset.land = landscape ? '1' : '0';
      const sum = (x) => S.vals[x].filter(v => v != null).reduce((a, b) => a + b, 0) % 10;
      const score = `${SIDE_JA.P} ${sum('P')} 対 ${SIDE_JA.B} ${sum('B')}`;
      const V = { win: ['当たり！', `${score}。${SIDE_JA[mine]}の勝ち`], lose: ['ハズレ……', `${score}。${SIDE_JA[other(mine)]}の勝ち`], tie: ['引き分け', `${score}。同じ数`], next: ['まだ決まらない', `${rankJa(c.card.rank >= 11 ? 11 : c.card.rank)}で合計${tot(me)}。もう1枚引く`] }[st];
      ui.verdict.dataset.st = st; ui.verdict.innerHTML = `<b>${V[0]}</b><span>${V[1]}</span>`; ui.verdict.hidden = !decisive;
      ui['sq-m'].innerHTML = st === 'win' ? `<em>${rankJa(me)}</em>来たーっ！` : st === 'lose' ? `<em>${rankJa(me)}</em>……届かず` : st === 'tie' ? `<em>${rankJa(me)}</em>で引き分け` : `<em>${rankJa(me)}</em>。次の札へ`;
      ui.odds.innerHTML = '';
      hush(); sfx('flip');
      if (st === 'win') { sfx('bigwin'); say('goddess', pick(['来たぁーっ！　決まりーっ！', 'はい確定！|……ウンメちゃんは|前から知ってたけどね？']), 2400); say('mimi', pick(['来たっ……！', 'やった、これ……！']), 1400); }
      else if (st === 'lose') { sfx('lose'); say('goddess', pick(['あーあ、言わんこっちゃない！', '出ちゃった〜！　これが今日の運命でーす！']), 2400); say('mimi', pick(['あぅ……', 'そんなぁ……']), 1400); }
      else if (st === 'tie') sfx('tie');
      await wait(!decisive ? 650 : st === 'win' ? 2300 : st === 'next' ? 1200 : 2000);
    } finally {
      clearInterval(beatT); briefResolve = null;
      if (mySq && sq === mySq) { sq.destroy(); sq = null; }
      if (live()) {
        ui.brief.hidden = true; ui.verdict.hidden = true; ui.sq.hidden = true; delete host.dataset.sq; delete ui.sq.dataset.climax; ui.sq.dataset.heat = '0';
        delete ui['sq-cv'].dataset.dim; ui['sq-cv'].classList.remove('is-open'); ui['sq-cv'].style.backgroundImage = '';
      }
    }
  }
  // 絞りの出し方（右上の「絞り」で替える）：自動＝勝負が決まるかもしれない札だけ自動でめくって見せる／自分で＝賭けた側は全部自分でめくる／なし＝すぐ開く
  async function reveal(w, i, mine) {
    const mode = S.A.sqMode || 'auto';
    if (mine !== w || mode === 'off') return flip(w, i);
    if (mode === 'manual') return squeeze(w, i, mine, false);
    if (RANKS.some(r => candState(w, i, r, mine) !== 'next')) return squeeze(w, i, mine, true);
    return flip(w, i);
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
    // 連勝の約束は罫線ごと白紙に。賭け金の約束は残す
    S.oracle = null; S.pledges = S.pledges.filter(p => p.type === 'stake'); S.judged = []; paintPins();
    if (!first) dsay('shoe', { l: S.shoe.burn.label, n: S.shoe.burned }, 3400);
  }
  async function hand() {
    const A = S.A;
    // ---- 賭ける ----
    if (BC.needNewShoe(S.shoe)) { await switchAsk(); newShoe(false); }
    S.bets = {}; S.hist = []; S.cards = { P: [], B: [] }; S.vals = { P: [], B: [] };
    for (const w of ['P', 'B']) { ui.sides[w].querySelector('.bc-cards').innerHTML = ''; ui.sides[w].dataset.res = ''; }
    host.querySelectorAll('.bc-spot').forEach(e => { delete e.dataset.res; });
    ui.delta.textContent = ''; delete ui.delta.dataset.s;
    ui.banner.dataset.on = '0'; ui.table.dataset.win = '';
    setPhase('bet'); paintRoads(); paintTotals();
    pledgeTick();
    const cool = cooling();
    paintCool();
    if (!S.oracle && tryBig()) { /* 満ちていたご機嫌の神託（口止めが明けた手など） */ }
    else {
      if (S.pledges.length < 3 && !S.q && (!cool || TUNE.askInCool) && S.looks < TUNE.lookQuiet && A.hands - (A.askedAt == null ? -99 : A.askedAt) >= 2 && S.res.length >= 2 && Math.random() < .62) askQuestion();
      else if (Math.random() < .62) chatter();
      // ミミの心の声（助言）：問いの札が出ていない時だけ
      if (!S.q && ui.ask.hidden) { const mh = mimiHint(); if (mh && Math.random() < mh[1]) say('mimi', `（${mh[0]}）`, 4400); }
    }
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
    dsay(stake ? 'nomore' : 'look', null, 1700);
    await dealCard('P', 0, h.p[0]); await dealCard('B', 0, h.b[0]); await dealCard('P', 1, h.p[1]); await dealCard('B', 1, h.b[1]);
    const mine = bets.P ? 'P' : bets.B ? 'B' : null;
    const first = mine ? other(mine) : 'P', second = other(first);
    await flip(first, 0); await flip(first, 1);
    await reveal(second, 0, mine); await reveal(second, 1, mine);
    if (h.natural) { const pn = BC.total(h.p.slice(0, 2)), bn = BC.total(h.b.slice(0, 2)); dsay('natural', { n: Math.max(pn, bn), side: pn >= bn ? 'P' : 'B' }, 1700); await wait(500); }
    if (h.p[2]) { dsay('p3', null, 1500); await dealCard('P', 2, h.p[2], true); await reveal('P', 2, mine); }
    if (h.b[2]) { dsay('b3', null, 1500); await dealCard('B', 2, h.b[2], true); await reveal('B', 2, mine); }
    // ---- 決着 ----
    setPhase('settle');
    save.coins = coins() + pay.ret; S.pending = 0; A.pendingRet = 0;
    const r = BC.resultOf(h);
    S.res.push(r); A.res = S.res; A.hands++; A.net += pay.net; A.best = Math.max(A.best, pay.net);
    const orc = S.oracle;   // この手に出ていた神託（「神託どおり！」のカットインに使う）
    S.fresh = true; S.oracle = null; paintPins(); paintRoads();
    ui.table.dataset.win = h.w;
    for (const w of ['P', 'B']) ui.sides[w].dataset.res = h.w === 'T' ? 'tie' : h.w === w ? 'win' : 'lose';
    const title = h.w === 'T' ? `引き分け　${h.pt} 対 ${h.bt}` : `${SIDE_JA[h.w]}の勝ち　${h.w === 'P' ? h.pt : h.bt} 対 ${h.w === 'P' ? h.bt : h.pt}`;
    for (const k of ['P', 'B', 'T', 'PP', 'BP']) if (bets[k]) { const d = pay.back[k] - bets[k], el = host.querySelector('.bc-spot-' + k); el.dataset.res = d > 0 ? 'up' : d < 0 ? 'dn' : 'eq'; el.querySelector('.bc-spot-a').textContent = (d > 0 ? '＋' : d < 0 ? '−' : '±') + fmt(Math.abs(d)); }
    ui.banner.innerHTML = `<b class="is-${h.w}">${title}</b>${stake ? '' : '<span class="bc-pay-n">見（増減なし）</span>'}`;
    if (stake) { ui.delta.textContent = (pay.net > 0 ? '＋' : pay.net < 0 ? '−' : '±') + fmt(Math.abs(pay.net)); ui.delta.dataset.s = pay.net > 0 ? 'up' : pay.net < 0 ? 'dn' : 'eq'; }
    if (!stake) { ui.delta.textContent = '見 ±0'; ui.delta.dataset.s = 'eq'; }
    sfx(pay.net > 0 ? (pay.net >= stake * 3 ? 'bigwin' : 'win') : pay.net < 0 ? 'lose' : 'tie');
    if (stake) { if (pay.net > 0) { S.winRun++; S.lossRun = 0; } else if (pay.net < 0) { S.lossRun++; S.winRun = 0; } }
    // 「外れたら次の賭け金」の約束は、外れた時に効き始める
    if (stake && pay.net !== 0) S.pledges.forEach(p => { if (p.type === 'stake' && !p.armed && (p.on === 'win') === (pay.net > 0)) { p.armed = true; p.base = stake; } });
    if (stake) S.lastStake = stake;
    if (stake) dealerReact(pay.net > 0 ? 'sad' : pay.net < 0 ? 'glad' : 'calm');   // 客が勝てばのけぞる・負ければ小さく弾む
    paintBets();
    // ウンメの反応：約束を守ったか × 当たったか（約束が重なった時は、破った方が勝つ）
    if (judged.kept || judged.broken) {
      setFavor(A.favor + judged.kept - 2 * judged.broken, judged.broken ? '約束を破った' : '約束を守った');
      if (judged.kept && !judged.broken && !A.keepSeen) { A.keepSeen = true; say('rico', '約束を守ると、ウンメさまのご機嫌が上がる。|3つ満ちると神託だよ', 4000); }
      if (judged.broken) {
        const bl = pay.net > 0 ? pick(['あーっ、裏切ったー！|……なのに当ててる。ずるーい！', '言ったことと違うー！|勝ったからって許しませーん！']) : pick(['裏切って、外した！|あーあ、言わんこっちゃない！', '約束やぶったよね？|バチが当たったんだよぉ']);
        if (pay.net > 0) A.outwit++;
        const [bm, bs] = splitLine(bl);
        cutin('betray', '約束やぶり', bm, bs, pay.net > 0 ? 'muku' : 'jito', 1500);
        say('goddess', bl, 3200);
      } else { godFace(pay.net >= 0 ? 'doya' : 'base', 3000); } if (!judged.broken) say('goddess', pay.net > 0 ? pick(['有言実行！　|しかも当たり！|かっこいいでーす！', '言ったとおりにして|勝った！|そういう子、|大好き！']) : pay.net < 0 ? pick(['約束は守ったのにねぇ。|よしよし', '外れたけど|ウソはつかなかった！|えらいえらい！']) : '約束どおり！|ちゃんと見てたよぉ', 3200);
    } else if (stake && pay.net >= stake * 8) { cutin('jackpot', '大当たり', `＋${fmt(pay.net)}`, '運命もびっくりでーす！', 'odoroki', 1600); say('goddess', 'わ、大当たり！|運命もびっくりでーす！'); }
    else if (h.w === 'T' && !orc) { godFace('odoroki', 2400); if (stake && Math.random() < .5) say('goddess', pick(['引き分けーっ！|これはびっくり！', 'えっ、引き分け！？|……知ってたけどね！'])); }
    else if (stake && Math.random() < .5) { const DT = DL.T || {}, rl = DT.res ? DT.res(h, pay.net) : pick((pay.net > 0 ? DT.win : pay.net < 0 ? DT.lose : DT.tie) || []); if (rl) dline(rl, 2800); }
    else if (stake && Math.random() < .3) say('goddess', pick(['決まりーっ！　|これが今日の|運命でーす！', 'はい確定。|……いやほんと、|ウンメちゃんは|前から知ってたんだけどね？', '文句は|受け付けませーん！']));
    // 大きな神託に従って勝った：「神託どおり！」（ほかのカットインが出ている時は重ねない）
    if (orc && orc.big && stake && pay.net > 0 && !host.querySelector('.bc-cutin')) {
      const hl = pick(['ほらね？|ウンメちゃんの言ったとおりでーす！', 'ね、ほんとだったでしょ？|女神はウソつきませーん！', '大当たりぃ！|……知ってたけどね！']);
      cutin('hit', '神託どおり', `＋${fmt(pay.net)}`, hl.replace(/\|/g, ''), 'doya', 1600);
      say('goddess', hl, 3000);
    }
    keep();
    await waitTap(stake ? 2600 : 1700);
    S.fresh = false;
  }
  async function loop() {
    const g = G;
    try {
      if (!S.A.demoSeen) await demo();
      if (!S.dealerChosen) await chooseDealer();
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
      await cap('バカラは、|プレイヤーとバンカーの|どちらが勝つかに|賭ける遊びだよ', 3000);
      S.bets = { P: 50 }; paintBets(); sfx('bet'); host.querySelector('.bc-spot-P').classList.add('is-demo');
      await cap('勝つと思う方に|チップを置いて|「配る」。|今回はプレイヤーに50', 3000);
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
      ui.cands.innerHTML = RANKS.map(r => candTile(r, candState('P', 1, r, 'P'), '♠', (4 + (r >= 10 ? 0 : r)) % 10)).join('');
      ui['sq-m'].innerHTML = '<em>4・5</em>来い！';
      sq = SQ.create(ui['sq-cv'], { card: c.card, back: ART.back, onSeen: (info) => { const set = info.cands.map(r => Math.min(11, r)); ui.cands.querySelectorAll('.bc-cd').forEach(e => e.classList.toggle('is-out', !set.includes(+e.dataset.r))); } });
      await wait(500);
      hush(); say('rico', '短い辺からめくると|「足」が見える。|マークが2つ＝4より上', 3600);
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
      await cap('横から|話しかけてくるのは、|運命の女神の|ウンメさま。|決まりや確率の話は|アタシに聞きな', 3800);
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
    ['運命の女神 ウンメ', () => `<div class="bc-g-sq"><span><b>気分：退屈</b>大胆な返事（逆に賭ける・上げる）が好き</span><span><b>気分：ごきげん</b>流れに乗る返事（続きに賭ける・同じ額）が好き</span><span><b>気分：胸さわぎ</b>慎重な返事（見・下げる）が好き</span></div>
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
      <span class="bc-br-l">下の3つ</span><span class="bc-br-3"><canvas class="bc-rd r-eye"></canvas><canvas class="bc-rd r-small"></canvas><canvas class="bc-rd r-roach"></canvas></span></div>${verifyHTML()}</section>`;
    ui.layer.appendChild(el);
    requestAnimationFrame(() => paintBigRoads(el));
  }
  // この山の検算：山の番号（種）から札を並べ直して最初から配り直し、画面の罫線と1手ずつ照らし合わせる（偏りを疑った時に確かめられるように）
  function verifyShoe() {
    // 罫線に書かれた手まで照らし合わせる（配っている最中は、山の手数が罫線より1つ先に進んでいる）
    const sh = BC.createShoe(S.shoe.seed), n = S.res.length, cnt = { P: 0, B: 0, T: 0 };
    let bad = -1;
    for (let k = 0; k < n; k++) { const h = BC.dealHand(sh); cnt[h.w]++; if (bad < 0 && S.res[k].w !== h.w) bad = k; }
    const ahead = S.shoe.hands - n;
    if (bad < 0 && ahead !== 0 && ahead !== 1) bad = n;
    return { n, cnt, bad, seed: S.shoe.seed };
  }
  function verifyHTML() {
    try {
      const v = verifyShoe();
      if (!v.n) return '';
      return v.bad < 0
        ? `<p class="bc-verify" data-ok="1"><b>この山の検算：一致</b>山の番号 ${v.seed} から札を並べ直して配り直すと、${v.n}手すべて上の罫線と同じ（バンカー ${v.cnt.B}・プレイヤー ${v.cnt.P}・引き分け ${v.cnt.T}）。長い目で見ると、バンカー約46%・プレイヤー約45%・引き分け約10%</p>`
        : `<p class="bc-verify" data-ok="0"><b>この山の検算：不一致</b>山の番号 ${v.seed} から配り直すと、${v.bad + 1}手目から上の罫線と合いません</p>`;
    } catch (e) { return ''; }
  }
  // ---- 卓（ディーラー）を選ぶ：入る時と、山が替わる時 ----
  function paintDealer() {
    if (!host) return;
    host.querySelector('.bc-dealer-n').textContent = DL.name; host.dataset.dealer = DL.id;
    const pic = host.querySelector('.bc-dealer-pic'); pic.innerHTML = DL.art ? `<img src="${DL.art}" alt="${esc(DL.name)}">` : ''; pic.classList.toggle('is-wide', !!DL.wide); pic.parentElement.classList.toggle('has-art', !!DL.art);
  }
  function chooseDealer() {
    return new Promise((res, rej) => {
      const g = G; closeLayer(); hush();
      const el = document.createElement('div'); el.className = 'bc-over bc-pick';
      el.innerHTML = `<section class="bc-panel"><header><b>卓を選ぶ</b><span class="bc-g-pg">どの卓も決まりと配当は同じ</span></header>
        <div class="bc-pick-g">${DEALERS.map(d => `<button type="button" data-bc="pick" data-id="${d.id}"${d.id === DL.id ? ' class="is-cur"' : ''}>${d.art ? `<span class="bc-pick-pic${d.wide ? ' is-wide' : ''}"><img src="${d.art}" alt=""></span>` : ''}<span class="bc-pick-k">${d.kind}</span><b>${d.name}</b><span class="bc-pick-i">${d.intro.replace(/\|/g, '<wbr>')}</span></button>`).join('')}</div></section>`;
      ui.layer.appendChild(el);
      pickResolve = (id) => {
        pickResolve = null; el.remove();
        if (g !== G || !live()) return rej(STOP);
        DL = DEALERS.find(d => d.id === id) || DL; S.A.dealer = DL.id; S.dealerChosen = true; keep(); paintDealer(); sfx('flip');
        dsay('hello', null, 2600); res();
      };
    });
  }
  function switchAsk() {
    return new Promise((res, rej) => {
      const g = G; closeLayer(); hush();
      const el = document.createElement('div'); el.className = 'bc-over bc-pick';
      el.innerHTML = `<section class="bc-panel bc-sw"><header><b>札の山が替わります</b></header><p class="bc-sw-t">罫線は新しくなります。ディーラーはどうしますか？</p>
        <footer><button type="button" data-bc="pick" data-id="@other">卓を替える</button><button type="button" class="bc-go" data-bc="pick" data-id="@stay"><b>${DL.name}のまま</b></button></footer></section>`;
      ui.layer.appendChild(el);
      pickResolve = (id) => {
        pickResolve = null; el.remove();
        if (g !== G || !live()) return rej(STOP);
        if (id === '@other') chooseDealer().then(res, rej); else res();
      };
    });
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
      case 'spot': if (!(S.holdFired && Date.now() - S.holdFired < 300)) addBet(b.dataset.k); break;   // 押しっぱなしで置いた直後の離す動きでは足さない
      case 'chip': S.chip = S.A.chip = +b.dataset.v; sfx('tap'); paintBets(); break;
      case 'clear': if (S.phase === 'bet') { S.bets = {}; S.hist = []; paintBets(); } break;
      case 'undo': {
        if (S.phase !== 'bet' || !S.hist || !S.hist.length) break;
        const [k, add] = S.hist.pop(); S.bets[k] = Math.max(0, (S.bets[k] || 0) - add); if (!S.bets[k]) delete S.bets[k];
        sfx('tap'); paintBets(); break;
      }
      case 'double': {
        if (S.phase !== 'bet') break;
        let any = false;
        for (const k of ['P', 'B', 'T', 'PP', 'BP']) {
          const cur = S.bets[k] || 0; if (!cur) continue;
          const cap = (k === 'P' || k === 'B') ? C.maxMain : C.maxSide, add = Math.min(cur, cap - cur, coins() - stakeOf(S.bets));
          if (add >= C.minBet) { S.bets[k] = cur + add; (S.hist = S.hist || []).push([k, add]); any = true; }
        }
        if (any) sfx('bet'); else say('rico', 'これ以上は|増やせないよ|（上限か、|手持ちまで）', 2200);
        paintBets(); break;
      }
      case 'rebet': {
        if (S.phase !== 'bet' || !S.A.last) break;
        const st = stakeOf(S.A.last);
        if (st > coins()) { say('rico', 'コインが足りないじゃん', 1800); break; }
        S.bets = Object.assign({}, S.A.last); S.hist = Object.keys(S.bets).map(k => [k, S.bets[k]]); sfx('bet'); paintBets(); break;
      }
      case 'look': if (S.phase === 'bet' && betResolve) betResolve({ look: true }); break;
      case 'deal': if (S.phase === 'bet' && betResolve && stakeOf(S.bets) >= C.minBet) betResolve({ look: false }); break;
      case 'answer': answer(+b.dataset.i); break;
      case 'pick': if (pickResolve) pickResolve(b.dataset.id); break;
      case 'sqopen': if (sq) sq.open(); break;
      case 'sqgo': if (briefResolve) briefResolve(); break;
      case 'sqtake': if (sq && sq.takeover) { sq.takeover(); ui.sq.dataset.auto = '0'; hush(); say('rico', '札の端を引いて、自分でめくりな', 2200); } break;
      case 'sqmode': {
        const order = ['auto', 'manual', 'off'], m = order[(order.indexOf(S.A.sqMode || 'auto') + 1) % 3];
        S.A.sqMode = m; keep(); paintBets(); hush();
        say('rico', m === 'auto' ? '勝負が決まりそうな札だけ、|自動でめくって見せるよ' : m === 'manual' ? '賭けた側の札は、ぜんぶ自分でめくるよ' : '札はディーラーがすぐ開くよ', 2800); break;
      }
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
  function restart() { G++; tapResolve = null; betResolve = null; pickResolve = null; closeLayer(); loop(); }
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
    try { if (isBgmOn()) playSceneBgm(SCENE_BGM.baccarat ? 'baccarat' : 'allstar'); } catch (e) { }
  }
  function mount() {
    const A = store();
    if (!A) return;
    if (host && host.isConnected) return;
    G++;
    S = { A, bets: {}, cards: { P: [], B: [] }, vals: { P: [], B: [] }, phase: 'bet', chip: A.chip || 10, res: A.res || [], looks: 0, winRun: 0, lossRun: 0, lastStake: 0, pledges: [], judged: [], oracle: null, q: null, pending: 0 };
    DL = DEALERS.find(d => d.id === A.dealer) || DEALERS[0];
    build(); paintDealer(); ciPreload();
    try { S.shoe = A.shoe ? BC.restoreShoe(A.shoe) : null; } catch (e) { S.shoe = null; }
    if (!S.shoe || BC.needNewShoe(S.shoe)) newShoe(true);
    ui.favor.dataset.n = A.favor;
    paintBets(); paintPins();
    requestAnimationFrame(() => { paintRoads(); loop(); });
  }
  function teardown() {
    closeHub();
    G++;
    if (S && S.pending) { save.coins = coins() + S.pending; S.pending = 0; if (S.A) S.A.pendingRet = 0; keep(); }
    if (sq) { sq.destroy(); sq = null; }
    hush(); tapResolve = null; betResolve = null; pickResolve = null;
    if (ui.ro) { ui.ro.disconnect(); ui.ro = null; }
    if (host) { host.remove(); host = null; }
    document.querySelectorAll('#stage > .bc-host').forEach(e => e.remove());
    S = null;
  }
  // =============================================================
  // 今夜の演目：クリア後の遊び5つ（零時の卓・ほろ酔いの夜・泥酔の夜・5ポーカー・女神バカラ）を1か所から選ぶ（2026-11-16 ユーザー）
  // ホームの札（昼）と月のボタンから開く。夜への切り替えも、ここの札で行う。画面の本当の px で描く（バカラの卓と同じ作り）
  // =============================================================
  let hub = null;
  const gameAction = (action) => { try { onGameAction({ currentTarget: { dataset: { action } }, preventDefault() { }, stopPropagation() { }, target: document.body }); } catch (e) { console.error(e); } };
  const onGameAction = (e) => window.onAction ? window.onAction(e) : onAction_(e);
  function onAction_(e) { /* game.js の onAction（同じページの関数）を名前で呼ぶ */ return (0, eval)('onAction')(e); }
  function hubCards() {
    const night = !!save.horoyoiMode, deisui = night && !!save.deisuiMode;
    const hDone = (save.horoyoiCleared || []).length, dDone = (save.deisuiCleared || []).length, N = STAGE_ORDER.length;
    const ri = window.AllstarUI && AllstarUI.runInfo ? AllstarUI.runInfo() : null;
    const A = store() || {};
    let dOpen = false, hAll = false, dDev = false;
    try { dOpen = deisuiOpen(); hAll = horoyoiAllCleared(); dDev = deisuiDev(); } catch (e) { }
    const mpOwn = (() => { try { return isItemOwned('memory_minipoker'); } catch (e) { return false; } })();
    return [
      { id: 'allstar', title: '零時の卓', desc: '六人で一つの卓。|最後の一人が優勝', art: 'assets/ui/allstar_opening.webp', pos: '50% 30%',
        st: ri ? `続き・残り${ri.alive}人` : '優勝 2,000', act: 'game:' + (ri ? 'allstar-resume' : 'allstar-open'), lock: !(window.AllstarUI && AllstarUI.isUnlocked()) && 'ヴェルベットに|勝つと開く' },
      { id: 'horoyoi', title: 'ほろ酔いの夜', desc: '酔った5人と、|もう一周', art: 'assets/episodes/night/h_rico_tutorial.webp', pos: '50% 20%',
        st: night && !deisui ? 'いま、ここ' : hDone >= N ? '制覇' : `第${hDone + 1}夜／全${N}夜`, cur: night && !deisui, act: 'night-h' },
      { id: 'deisui', title: '泥酔の夜', desc: '記憶が飛ぶ、|むちゃくちゃな夜', art: 'assets/episodes/night/d_rico_tutorial.webp', pos: '50% 20%',
        st: deisui ? 'いま、ここ' : dDone >= N ? '制覇' : `第${dDone + 1}夜／全${N}夜`, cur: deisui, act: 'night-d', lock: !dOpen && (!hAll ? 'ほろ酔いの夜を|制覇すると開く' : '準備中') },
      { id: 'five', title: 'ファイブポーカー', desc: '5枚を替えて、|役を作る', art: 'assets/characters/mimi_mini.webp', pos: '50% 20%', fit: 'contain',
        st: mpOwn ? 'コインを賭ける' : '交換所で入手', act: 'game:' + (mpOwn ? 'play-minipoker' : 'open-shop'), need: !mpOwn },
      { id: 'baccarat', title: '女神バカラ', desc: 'ウンメの横で、|勝つ方に賭ける', art: ART.goddess, pos: '62% 12%',
        st: A.hands ? `${A.hands}手・通算 ${A.net >= 0 ? '＋' : '−'}${fmt(Math.abs(A.net || 0))}` : '卓は4つ', act: 'baccarat', fresh: !A.hands },
    ];
  }
  function closeHub() { if (hub) { hub.remove(); hub = null; } document.querySelectorAll('#stage > .enc-host').forEach(e => e.remove()); }
  function openHub() {
    if (!isUnlocked()) { try { toast('今夜の演目は、エンディングの後に開きます'); } catch (e) { } return; }
    closeHub();
    const night = !!save.horoyoiMode;
    hub = document.createElement('div');
    hub.className = 'bc-host enc-host';
    hub.innerHTML = `<section class="bc-panel enc-panel" role="dialog" aria-modal="true" aria-label="今夜の演目">
      <header><b>今夜の演目</b><span class="bc-g-pg">クリア後の遊びを選ぶ</span><button type="button" data-enc="close">閉じる</button></header>
      <div class="enc-g">${hubCards().map(c => `<button type="button" class="enc-c${c.cur ? ' is-cur' : ''}${c.lock ? ' is-lock' : ''}" data-enc="go" data-act="${c.lock ? '' : c.act}" data-id="${c.id}"${c.lock ? ' aria-disabled="true"' : ''}>
        <span class="enc-pic" style="background-image:url('${c.art}');background-position:${c.pos};${c.fit ? 'background-size:' + c.fit + ';' : ''}"></span>
        ${c.fresh ? '<i class="enc-new">NEW</i>' : ''}
        <b>${c.title}</b><span class="enc-d">${c.desc.replace(/\|/g, '<br>')}</span>
        <span class="enc-s${c.lock ? ' is-lock' : c.need ? ' is-need' : ''}">${(c.lock || c.st).replace(/\|/g, '<br>')}</span></button>`).join('')}</div>
      ${night ? '<footer><button type="button" data-enc="go" data-act="night-off">一周目（昼）に戻る</button></footer>' : ''}</section>`;
    hub.addEventListener('click', (e) => {
      const b = e.target.closest('[data-enc]');
      if (!b) { if (e.target === hub) closeHub(); return; }
      if (b.dataset.enc === 'close') return closeHub();
      const act = b.dataset.act; if (!act) { sfx('tap'); return; }
      closeHub();
      if (act === 'baccarat') open();
      else if (act.startsWith('night-')) nightSet(act.slice(6));
      else if (act.startsWith('game:')) gameAction(act.slice(5));
    });
    document.getElementById('stage').appendChild(hub);
    sfx('flip');
  }
  // 昼⇔ほろ酔い⇔泥酔の切り替え（game.js の home-night-toggle と同じ後始末）
  function nightSet(mode) {
    if (!isUnlocked()) return;
    if (mode === 'd' && !(typeof deisuiOpen === 'function' && deisuiOpen())) return;
    save.horoyoiMode = mode !== 'off'; save.deisuiMode = mode === 'd';
    keep();
    try { if (state) state.horoyoi = isHoroyoi(); } catch (e) { }
    if (save.horoyoiMode) { sfx('pour'); setTimeout(() => sfx('clink'), 1150); }
    try { toast(save.deisuiMode ? '泥酔の夜へ' : save.horoyoiMode ? 'ほろ酔いの夜へ' : '一周目（昼）に戻りました'); } catch (e) { }
    try { render(); } catch (e) { }
  }
  // ホーム：エンディングの後、月のボタンと（昼の）卓の札を「今夜の演目」の入口にする。home.js の renderHomeLobby から呼ぶ
  function decorateHome(root) {
    if (!root || !isUnlocked()) return;
    const sw = root.querySelector('.h15-night');
    if (sw) { sw.dataset.action = 'baccarat-hub'; sw.hidden = false; sw.title = '今夜の演目（遊びを選ぶ）'; sw.setAttribute('aria-label', '今夜の演目：クリア後の遊びを選ぶ'); }
    const ticket = root.querySelector('.h15-ticket');
    if (ticket && !save.horoyoiMode) {
      ticket.dataset.action = 'baccarat-hub'; delete ticket.dataset.opponent;
      ticket.querySelector('.h15-lbl').textContent = '今夜の演目';
      ticket.querySelector('.h15-prize').innerHTML = '<span>遊びを選ぶ</span>';
      ticket.setAttribute('aria-label', '今夜の演目へ。零時の卓・ほろ酔いの夜・泥酔の夜・ファイブポーカー・女神バカラから選ぶ');
    }
  }
  function onAction(action) {
    if (action === 'baccarat-open') open();
    else if (action === 'baccarat-hub') openHub();
  }

  // ---- 検査の出入口（qa/baccaratshot.mjs だけが使う） ----
  const _qa = {
    S: () => S, host: () => host, sq: () => sq, tune: TUNE, cutin, umme: UMME, face: godFace,
    bet(k, n) { for (let i = 0; i < (n || 1); i++) addBet(k); },
    deal() { if (betResolve) betResolve({ look: false }); }, look() { if (betResolve) betResolve({ look: true }); },
    ask: askQuestion, oracle: giveOracle, answer, setFavor, guide: openGuide, roads: openRoads,
    pick(id) { if (pickResolve) pickResolve(id); }, picking: () => !!pickResolve, dealers: DEALERS,
    feed(str) { S.res = S.A.res = str.split('').map(w => ({ w, pp: false, bp: false, nat: false })); paintRoads(); },
  };
  window.BaccaratUI = { mount, teardown, onAction, open, openHub, closeHub, decorateHome, isUnlocked, ART, _qa };
})();
