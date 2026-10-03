// 心理：ダウト！（早押し）
// ポルカのおしゃべり5つを、制限時間内に「本音」「ウソ」へ振り分ける（左右のボタン、または ←→）。
// 規則はひとつ「ポルカは、ウソの時ほど声が大きい」。ただし 1〜4つ目のうち1つくらいは例外（ひっかけ）。
// 5つ目は「今の賭け」の台詞。その本音／ウソが、そのままポルカの手がブラフかどうかの答えになる。
// 振り分けの結果はすぐには見せない。自信を賭けてから、1問ずつ答え合わせ → 最後にポルカの手札をめくる。
(() => {
  const LIMIT = [3200, 2950, 2700, 2450, 2200];
  const POOL = {
    // 規則どおりのウソ：「！」が多い・語尾がのびる・（棒）・やたら自信満々
    lie: [
      'ボク、ポーカーで負けたこと、一回もないもーん！！',
      '今日のボク、ぜーんぜん緊張してないしー！！',
      'ミミちゃんの手、ぜーんぶ見えてるんだからね！！',
      '昨日も大勝ちしたよー！ ほんとだよー！！',
      'チップ、まだまだいーっぱいあるし！ 余裕だし！',
      'わーい、すっごく楽しいなー（棒）',
      'ボク、ウソなんて絶対つけないタイプだからー！！',
      'このテーブル、ボクの庭みたいなもんだしー！！',
      'ミミちゃんなんて、ぜーんぜん怖くないもーん！！',
      'お腹なんて、ぜーんぜん空いてないよー（棒）',
      'ボク、毎朝5時に起きてるんだー！ ほんとー！！',
      'リコ先輩より、ボクの方がずーっと強いし！！',
      'さっきの負け？ わざとだよー、わざと！！',
      'ボク、激辛だーいすきー！ 余裕ー！（棒）',
    ],
    // 規則どおりの本音：短い・「……」が多い
    honest: [
      '……ちょっと、眠い。',
      '……チップ、減ってきた。',
      '……ミミちゃんの耳、かわいい。',
      '……今の、ちょっと悔しかった。',
      '……お腹すいた。',
      '……リコ先輩、こわい。',
      '……ケーキは、いちご派。',
      '……さっきの、降りればよかった。',
      '……雨、やむかな。',
      '……この椅子、ちょっと高い。',
      '……計算、苦手。',
      '……この曲、好き。',
      '……昨日、あんまり寝てない。',
      '……負けず嫌いなんだ、ボク。',
    ],
    // 例外（ひっかけ）：元気な本音
    trapHonest: [
      'やったー！ 今日のケーキ、いちごだー！！',
      'あっ！ ミミちゃん、袖にクリームついてるよー！',
      'うわーっ、このジュース、すっごくおいしー！！',
      'ボク、このお店だーいすきー！！',
      'わーっ、今の風、気持ちいいー！！',
    ],
    // 例外（ひっかけ）：静かなウソ
    trapLie: [
      '……べつに、怒ってない。',
      '……ピーマン、平気。',
      '……さっきの負け、気にしてない。',
      '……ぜんぜん、痛くなかった。',
      '……おばけとか、信じてないし。',
    ],
    // 5つ目：今の賭けの話（ウソ＝ブラフ／本音＝本当に強い）
    betLie: [
      'この手、さいきょーだもん！！ 降りた方がいいよー！！',
      'ボクの手、ぜーったい勝てるやつだからー！（棒）',
      'フラッシュだよー！ たぶん！ いや、ぜったい！！',
      'コールしたら後悔するよー！？ ほんとだよー！！',
    ],
    betHonest: [
      '……この手、けっこういい。',
      '……今回は、降りた方がいいかも。',
      '……ごめんね。これ、いいの来てる。',
      '……コール、する？',
    ],
  };

  // 小さな効果音（押すたびに気持ちよく。音程は問題が進むほど上がる）
  let ac = null;
  function tone(freq, dur = .08, type = 'triangle', vol = .05, delay = 0) {
    const V = MB.vol; if (!V) return; vol *= V;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0); g.gain.setValueAtTime(vol, t0);
      o.connect(g); g.connect(ac.destination); o.start(t0);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.stop(t0 + dur + .02);
    } catch (e) {}
  }

  // ポルカの手札：強い手＝場のマークがそろうフラッシュ／ブラフ＝役なし（半分は「あと1枚でフラッシュ」の外れ）
  function dealHer(api, bluff, X, board) {
    const used = new Set(board.map(api.key));
    const free = api.deck().filter(c => !used.has(api.key(c)));
    const xs = free.filter(c => c.s === X), ns = free.filter(c => c.s !== X);
    const draw = Math.random() < .5;
    for (let k = 0; k < 600; k++) {
      const h = !bluff ? api.shuffle(xs).slice(0, 2) : draw ? [api.pick(xs), api.pick(ns)] : api.shuffle(ns).slice(0, 2);
      const cat = api.category([...h, ...board]);
      if (bluff ? cat === 0 : cat >= 5) return h.sort((a, b) => (b.s === X) - (a.s === X));
    }
    return !bluff ? xs.slice(0, 2) : [ns.find(c => c.r === 5), ns.find(c => c.r === 4)];
  }

  const CSS = `
    .doubt-sit { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; justify-content: center; }
    .doubt-grp { display: flex; gap: 4px; align-items: center; }
    .doubt-tag { font-family: var(--disp); letter-spacing: .14em; font-size: 14px; color: var(--gold); margin-right: 4px; line-height: 1; }
    .doubt-hand { font-size: 13px; font-weight: 900; color: var(--gold-hi); margin-left: 6px; white-space: nowrap; }
    .doubt-hands { flex-wrap: wrap; justify-content: center; row-gap: 4px; }
    .doubt-area { position: relative; height: clamp(270px, 29vw, 300px); overflow: hidden; border: 1px solid rgba(217,179,90,.5); background: linear-gradient(180deg, #2a0a13, #12040a); user-select: none; -webkit-user-select: none; transition: height .3s ease; }
    .doubt-win { position: absolute; z-index: 1; right: 7%; top: 12px; bottom: 18px; width: min(34%, 300px); transform: skewX(-12deg); overflow: hidden; border: 3px solid var(--gold); background: linear-gradient(180deg, #5a1424, #1c060c); box-shadow: 0 10px 22px rgba(0,0,0,.6); transition: top .3s ease, bottom .3s ease, right .3s ease, width .3s ease; }
    .doubt-win::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,.3), transparent 35%); mix-blend-mode: soft-light; pointer-events: none; }
    .doubt-face { position: absolute; left: -14%; top: -6%; width: 128%; height: 112%; max-width: none; object-fit: cover; object-position: 50% 30%; transform: skewX(12deg); pointer-events: none; transition: opacity .08s; }
    .doubt-face.alt { opacity: 0; }
    .doubt-area.is-panic .doubt-face.alt { opacity: 1; } .doubt-area.is-panic .doubt-face.main { opacity: 0; }
    .doubt-area.is-twitch .doubt-win { animation: mb-doubt-twitch .3s ease; }
    @keyframes mb-doubt-twitch { 30% { transform: skewX(-12deg) translate(-8px, 3px); } 65% { transform: skewX(-12deg) translate(4px, -2px); } }
    .doubt-count { position: absolute; z-index: 3; left: 16px; top: 10px; display: flex; align-items: baseline; gap: 10px; }
    .doubt-count b { font-family: var(--disp); font-weight: 400; font-size: 30px; line-height: 1; color: var(--gold-hi); letter-spacing: .06em; }
    .doubt-count span { font-size: 12px; font-weight: 900; color: var(--text); background: rgba(0,0,0,.55); padding: 1px 8px; border-left: 3px solid var(--red-hi); }
    .doubt-bubble { position: absolute; z-index: 2; left: 16px; top: 52%; width: min(58%, 540px); transform: translateY(-50%); padding: 16px 20px; background: #fffdf3; color: #1d080e; border-radius: 18px; box-shadow: 0 10px 24px rgba(0,0,0,.55); font-weight: 900; font-size: clamp(18px, 2.3vw, 24px); line-height: 1.45; }
    .doubt-bubble::after { content: ""; position: absolute; right: -17px; top: 40%; border: 11px solid transparent; border-left: 18px solid #fffdf3; border-right: 0; }
    .doubt-bubble.is-in { animation: mb-doubt-in .22s cubic-bezier(.2,1.5,.4,1); }
    @keyframes mb-doubt-in { from { transform: translateY(-50%) scale(.7); opacity: 0; } }
    .doubt-bubble.go-l { transition: transform .26s ease-in, opacity .26s; transform: translate(-120%, -50%) rotate(-10deg); opacity: 0; }
    .doubt-bubble.go-r { transition: transform .26s ease-in, opacity .26s; transform: translate(40%, -60%) rotate(10deg) scale(.8); opacity: 0; }
    .doubt-bubble.go-miss { transition: transform .3s ease-in, opacity .3s; transform: translate(0, 10%); opacity: 0; }
    .doubt-last { display: inline-block; margin-bottom: 4px; padding: 0 8px; font-style: normal; font-size: 12px; font-weight: 900; color: #fff; background: var(--red); letter-spacing: .06em; }
    .doubt-text { display: block; }
    .doubt-stamp { position: absolute; right: -6px; top: -20px; padding: 0 12px; font-size: 24px; font-weight: 900; line-height: 1.5; transform: rotate(9deg); border: 3px solid; background: #fff; opacity: 0; }
    .doubt-stamp.is-on { opacity: 1; animation: mb-doubt-stamp .2s cubic-bezier(.2,1.8,.4,1); }
    .doubt-stamp.lie { color: var(--red); border-color: var(--red); }
    .doubt-stamp.honest { color: #7a5a10; border-color: #b8862b; }
    .doubt-stamp.miss { color: #666; border-color: #888; }
    @keyframes mb-doubt-stamp { from { transform: rotate(9deg) scale(2.2); opacity: 0; } }
    .doubt-timer { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 9px; background: rgba(0,0,0,.65); }
    .doubt-timer i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, var(--red-hi), var(--gold-hi)); }
    .doubt-timer.is-low i { background: var(--red-hi); box-shadow: 0 0 10px var(--red-hi); }
    .doubt-big { position: absolute; z-index: 4; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-family: var(--disp); font-size: clamp(56px, 10vw, 96px); line-height: 1; color: var(--gold-hi); text-shadow: 0 4px 0 rgba(0,0,0,.5), 0 0 26px rgba(245,215,122,.8); pointer-events: none; animation: mb-pop .3s cubic-bezier(.2,1.6,.4,1); }
    .doubt-rule { position: absolute; z-index: 2; left: 16px; top: 50%; transform: translateY(-50%); width: min(62%, 560px); padding: 12px 16px 14px; background: rgba(12,3,6,.9); border: 1px solid var(--gold); box-shadow: 0 10px 24px rgba(0,0,0,.55); }
    .doubt-rule > small { font-family: var(--disp); letter-spacing: .2em; color: var(--gold); font-size: 14px; }
    .doubt-rule-main { font-family: var(--mincho); font-weight: 800; font-size: clamp(19px, 2.6vw, 26px); line-height: 1.35; }
    .doubt-rule-main b { color: var(--gold-hi); }
    .doubt-rule-ex { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 13px; font-weight: 800; }
    .doubt-rule-ex span { padding: 2px 10px; }
    .doubt-rule-ex .is-lie { background: rgba(200,37,58,.75); color: #fff; }
    .doubt-rule-ex .is-honest { background: rgba(245,215,122,.16); color: var(--gold-pale); }
    .doubt-rule-note { margin-top: 8px; font-size: 12px; color: var(--dim); }
    .doubt-pad { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: min(640px, 100%); margin: 0 auto; }
    .doubt-btn { position: relative; border: 0; cursor: pointer; min-height: 78px; padding: 8px 14px; color: #fff; background: transparent; isolation: isolate; display: flex; align-items: center; justify-content: center; gap: 12px; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    .doubt-btn::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); border: 2px solid var(--gold); box-shadow: 0 8px 18px rgba(0,0,0,.5); transition: transform .08s, filter .08s; }
    .doubt-btn.is-honest::before { background: linear-gradient(90deg, #3a2410, #1d1008); }
    .doubt-btn.is-lie::before { background: linear-gradient(90deg, var(--red), #8a1427); }
    .doubt-btn.is-start { grid-column: 1 / -1; width: min(420px, 100%); justify-self: center; }
    .doubt-btn.is-start::before { background: linear-gradient(90deg, var(--gold-hi), var(--gold)); border-color: #fff3c2; }
    .doubt-btn.is-start { color: #1d080e; }
    .doubt-btn .w { display: flex; flex-direction: column; align-items: center; line-height: 1.15; }
    .doubt-btn .w span { font-family: var(--mincho); font-weight: 800; font-size: 27px; letter-spacing: .12em; }
    .doubt-btn .w small { font-size: 12px; font-weight: 700; opacity: .85; }
    .doubt-btn kbd { font-family: var(--disp); font-size: 30px; line-height: 1; color: var(--gold-hi); }
    .doubt-btn.is-hit::before { filter: brightness(1.7); transform: skewX(-12deg) scale(.94); }
    /* 光は別の層に描いておき、濃さだけを動かす（影を毎フレーム描き直すとスマホが熱くなる） */
    .doubt-pad.is-live .doubt-btn::after, .doubt-btn.is-start::after { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); pointer-events: none; box-shadow: 0 0 0 3px rgba(245,215,122,.3), 0 0 24px rgba(245,215,122,.7); opacity: 0; animation: mb-doubt-glow 1.2s ease-in-out infinite; }
    @keyframes mb-doubt-glow { 50% { opacity: 1; } }
    .doubt-btn:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 4px; }
    .doubt-btn[disabled] { opacity: .45; cursor: default; }
    .doubt-pad .wager { grid-column: 1 / -1; }
    .doubt-area.is-sum { height: 132px; }
    .doubt-area.is-sum .doubt-win { top: 8px; bottom: 8px; right: 6%; width: min(22%, 150px); }
    .doubt-tally { position: absolute; z-index: 2; left: 16px; top: 50%; transform: translateY(-50%); display: flex; align-items: baseline; gap: 10px; }
    .doubt-tally small { font-weight: 900; font-size: 14px; }
    .doubt-tally b { font-family: var(--disp); font-weight: 400; font-size: 64px; line-height: 1; color: var(--gold-hi); text-shadow: 0 0 18px rgba(245,215,122,.6); }
    .doubt-tally b.is-bump { animation: mb-pop .3s cubic-bezier(.2,1.6,.4,1); }
    .doubt-tally i { font-style: normal; font-family: var(--disp); font-size: 30px; color: var(--dim); }
    .doubt-list { display: grid; gap: 6px; }
    .doubt-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) 44px; gap: 8px; align-items: center; padding: 6px 10px; background: rgba(0,0,0,.35); border: 1px solid var(--faint); }
    .doubt-row .n { font-family: var(--disp); font-size: 24px; line-height: 1; color: var(--gold); text-align: center; }
    .doubt-row .q { font-weight: 800; font-size: 14px; line-height: 1.45; }
    .doubt-row .sub { display: block; font-size: 12px; color: var(--dim); font-weight: 700; }
    .doubt-row .sub em { font-style: normal; color: var(--text); }
    .doubt-row .sub .trap { display: inline-block; white-space: nowrap; color: #1d080e; background: var(--pink); padding: 0 6px; margin-left: 4px; }
    .doubt-row .mark { font-size: 32px; font-weight: 900; text-align: center; line-height: 1; }
    .doubt-row .mark.ok { color: var(--good); } .doubt-row .mark.ng { color: var(--bad); }
    .doubt-row .mark.is-on { animation: mb-doubt-stamp2 .28s cubic-bezier(.2,1.8,.4,1); }
    @keyframes mb-doubt-stamp2 { from { transform: scale(2.4) rotate(-20deg); opacity: 0; } }
    .doubt-row.is-bet { border-color: rgba(245,215,122,.7); background: rgba(90,20,34,.55); }
    .doubt-row.is-ok { border-color: rgba(143,227,168,.45); } .doubt-row.is-ng { border-color: rgba(255,138,150,.45); }
    @media (max-width: 560px) {
      .doubt-area { height: 300px; }
      .doubt-win { right: 9%; top: 12px; bottom: auto; height: 58%; width: 42%; }
      .doubt-bubble { left: 10px; right: 10px; width: auto; top: auto; bottom: 18px; transform: none; padding: 12px 14px; font-size: 18px; }
      .doubt-bubble::after { right: auto; left: 64%; top: -16px; border: 10px solid transparent; border-bottom: 17px solid #fffdf3; border-top: 0; }
      .doubt-bubble.is-in { animation-name: mb-doubt-in-m; }
      @keyframes mb-doubt-in-m { from { transform: scale(.7); opacity: 0; } }
      .doubt-bubble.go-l { transform: translate(-120%, 0) rotate(-10deg); }
      .doubt-bubble.go-r { transform: translate(120%, 0) rotate(10deg); }
      .doubt-bubble.go-miss { transform: translate(0, 20%); }
      .doubt-rule { left: 10px; right: 10px; width: auto; top: auto; bottom: 12px; transform: none; padding: 10px 12px 12px; }
      .doubt-pad { gap: 12px; }
      .doubt-btn { min-height: 72px; gap: 8px; padding: 8px 10px; }
      .doubt-btn .w span { font-size: 23px; }
      .doubt-btn kbd { font-size: 24px; }
      .doubt-area.is-sum { height: 116px; }
      .doubt-area.is-sum .doubt-win { top: 8px; bottom: 8px; height: auto; right: 6%; width: 34%; }
      .doubt-tally b { font-size: 52px; }
      .doubt-row { grid-template-columns: 22px minmax(0, 1fr) 36px; padding: 6px 8px; gap: 6px; }
      .doubt-row .q { font-size: 13px; }
    }
  `;

  async function start({ api }) {
    const bluff = Math.random() < .65;
    const P = Object.fromEntries(Object.entries(POOL).map(([k, v]) => [k, v.slice()]));
    const take = (a) => a.splice(api.rand(a.length), 1)[0];
    // 1〜4つ目：本音かウソかを裏で決める（全部同じにはしない）。例外は多くて1つ
    let kinds;
    do { kinds = [0, 1, 2, 3].map(() => Math.random() < .5); } while (kinds.every(k => k === kinds[0]));
    const trapAt = Math.random() < .75 ? api.rand(4) : -1;
    const lines = kinds.map((lie, i) => {
      const trap = i === trapAt;
      return { lie, trap, text: take(lie ? (trap ? P.trapLie : P.lie) : (trap ? P.trapHonest : P.honest)) };
    });
    lines.push({ lie: bluff, trap: false, bet: true, text: take(bluff ? P.betLie : P.betHonest) });
    // 顔：ウソなら焦り顔、本音なら得意顔が 65% で出る（規則ほど確かではない、おまけの手がかり）
    lines.forEach(l => { l.face = Math.random() < .65 ? (l.lie ? 'panic' : 'smug') : (l.lie ? 'smug' : 'panic'); });

    const X = api.pick(api.SUITS); const o = api.SUITS.filter(s => s !== X);
    const board = [{ r: 12, s: X }, { r: 8, s: X }, { r: 3, s: X }, { r: 10, s: o[0] }, { r: 2, s: o[1] }];
    const her = dealHer(api, bluff, X, board);

    api.css('doubt', CSS);
    api.say('ねえねえミミちゃん、聞いて聞いて！', 'smug'); api.bet(300);
    const root = api.root;
    const STEPS = ['聞き分ける', '自信を賭ける', '答え合わせ'];
    root.innerHTML = `
      <div id="mb-doubt-steps">${api.steps(STEPS, 0)}</div>
      <div class="doubt-sit">
        <div class="doubt-grp"><span class="doubt-tag">BOARD</span>${board.map(c => api.cardHTML(c, 'small')).join('')}</div>
        <div class="doubt-grp doubt-hands"><span class="doubt-tag">${api.char.name}</span><span class="doubt-grp" id="mb-doubt-her">${api.backHTML('small')}${api.backHTML('small')}</span><span class="doubt-hand" id="mb-doubt-hand"></span></div>
      </div>
      <div class="doubt-area" id="mb-doubt-area">
        <div class="doubt-win"><img class="doubt-face main" src="${api.asset('art/face/' + api.charId + '_smug.webp')}" alt="${api.char.jp}"><img class="doubt-face alt" src="${api.asset('art/face/' + api.charId + '_panic.webp')}" alt=""></div>
        <div class="doubt-rule" id="mb-doubt-rule"><small>RULE</small>
          <div class="doubt-rule-main">ポルカは、ウソの時ほど<b>声が大きい</b></div>
          <div class="doubt-rule-ex"><span class="is-lie">ウソ：「！」が多い・語尾がのびる・（棒）</span><span class="is-honest">本音：短い・「……」が多い</span></div>
          <div class="doubt-rule-note">5つに1つくらい例外あり。5つ目は「今の賭け」の話</div>
        </div>
      </div>
      <div class="doubt-pad" id="mb-doubt-pad"><button class="doubt-btn is-start" id="mb-doubt-start" type="button"><span class="w"><span>はじめる</span><small>本音は ← ／ ウソは →</small></span></button></div>
      <div class="doubt-list" id="mb-doubt-list" hidden></div>`;
    api.coach('ルールはひとつ。ポルカは、ウソの時ほど声が大きい', 'think');

    const $ = (s) => root.querySelector(s);
    const area = $('#mb-doubt-area'), pad = $('#mb-doubt-pad');
    const setFace = (f, twitch = true) => {
      area.classList.toggle('is-panic', f === 'panic');
      if (twitch && !api.reduce) { area.classList.remove('is-twitch'); void area.offsetWidth; area.classList.add('is-twitch'); }
    };

    await new Promise(res => {
      const go = () => { document.removeEventListener('keydown', onK); res(); };
      const onK = (e) => { if (!api.alive()) return document.removeEventListener('keydown', onK); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      $('#mb-doubt-start').onclick = go;
      document.addEventListener('keydown', onK);
    });
    if (!api.alive()) return;
    tone(660, .06); tone(990, .08, 'triangle', .05, .06);
    $('#mb-doubt-rule').remove();
    api.coach('←本音 ／ ウソ→ 。迷ったら、声の大きさ！');

    // READY → GO
    for (const [w, ms] of [['READY', 520], ['GO!', 420]]) {
      const b = document.createElement('div'); b.className = 'doubt-big'; b.textContent = w; area.appendChild(b);
      tone(w === 'GO!' ? 1175 : 587, .12, 'square', .03);
      await api.wait(ms); b.remove(); if (!api.alive()) return;
    }

    area.insertAdjacentHTML('beforeend', `<div class="doubt-count"><b id="mb-doubt-n">1/5</b><span>ウソほど声が大きい</span></div>
      <div class="doubt-bubble" id="mb-doubt-bubble"></div><div class="doubt-timer" id="mb-doubt-timer"><i></i></div>`);
    pad.innerHTML = `<button class="doubt-btn is-honest" data-a="honest" type="button"><kbd>←</kbd><span class="w"><span>本音</span><small>ほんとのこと</small></span></button>
      <button class="doubt-btn is-lie" data-a="lie" type="button"><span class="w"><span>ウソ</span><small>ダウト！</small></span><kbd>→</kbd></button>`;
    pad.classList.add('is-live');
    const bubble = $('#mb-doubt-bubble'), timer = $('#mb-doubt-timer'), bar = timer.querySelector('i');
    let answer = null;
    const hit = (a) => {
      if (!answer) return;
      const b = pad.querySelector(`[data-a="${a}"]`);
      if (b) { b.classList.remove('is-hit'); void b.offsetWidth; b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 140); }
      answer(a);
    };
    pad.addEventListener('click', (e) => { const b = e.target.closest('.doubt-btn'); if (b && b.dataset.a) hit(b.dataset.a); });
    const onKey = (e) => {
      if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); hit('honest'); } else if (e.key === 'ArrowRight') { e.preventDefault(); hit('lie'); }
    };
    document.addEventListener('keydown', onKey);

    const picks = [];
    for (let i = 0; i < 5; i++) {
      const l = lines[i];
      bubble.className = 'doubt-bubble';
      bubble.innerHTML = `${l.bet ? '<em class="doubt-last">LAST · 今の賭けの話</em>' : ''}<span class="doubt-text">${l.text}</span><b class="doubt-stamp"></b>`;
      void bubble.offsetWidth; bubble.classList.add('is-in');
      $('#mb-doubt-n').textContent = `${i + 1}/5`;
      setFace(l.face);
      api.say(l.bet ? 'で、今の賭けなんだけど……' : '……');
      tone(440 + i * 40, .05, 'sine', .03);
      bar.style.transition = 'none'; bar.style.width = '100%'; timer.classList.remove('is-low'); void bar.offsetWidth;
      bar.style.transition = `width ${LIMIT[i]}ms linear`; bar.style.width = '0%';
      const lowT = setTimeout(() => timer.classList.add('is-low'), LIMIT[i] * .65);
      const a = await new Promise(res => {
        let done = false;
        const fin = (v) => { if (done) return; done = true; clearTimeout(to); answer = null; res(v); };
        const to = setTimeout(() => fin('miss'), LIMIT[i]);
        answer = fin;
      });
      clearTimeout(lowT);
      if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      bar.style.transition = 'none'; bar.style.width = getComputedStyle(bar).width;
      picks.push(a);
      const st = bubble.querySelector('.doubt-stamp');
      st.textContent = a === 'lie' ? 'ダウト！' : a === 'honest' ? '本音？' : '見逃し…';
      st.className = 'doubt-stamp is-on ' + a;
      const up = 1 + i * .07;
      if (a === 'lie') { tone(392 * up, .06, 'square', .04); tone(784 * up, .12, 'square', .035, .05); }
      else if (a === 'honest') { tone(784 * up, .07); tone(1046 * up, .1, 'triangle', .05, .06); }
      else api.sfx.nope();
      await api.wait(230); if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      bubble.classList.add(a === 'lie' ? 'go-r' : a === 'honest' ? 'go-l' : 'go-miss');
      await api.wait(260); if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
    }
    document.removeEventListener('keydown', onKey);

    // 5つ終わり：結果はまだ見せず、自信を賭ける
    const got = lines.map((l, i) => picks[i] === (l.lie ? 'lie' : 'honest'));
    const hits = got.filter(Boolean).length;
    const correct = hits >= 4;
    const base = correct ? hits * 8 : 30;
    area.querySelector('.doubt-count').remove(); timer.remove();
    bubble.className = 'doubt-bubble is-in';
    bubble.innerHTML = '<span class="doubt-text">おしゃべり、おしまい！ ……ボクのウソ、見抜けた？</span>';
    setFace('smug');
    api.say('ふふーん、どうだった？');
    pad.classList.remove('is-live'); pad.innerHTML = '';
    $('#mb-doubt-steps').innerHTML = api.steps(STEPS, 1);
    api.coach('何問当てたと思う？ その自信を賭けて');
    // 賭けの札は舞台の上に重ねて出す（操作盤に継ぎ足すと画面からはみ出していた）。説明はダウト用の決まりに差し替える
    const wp = api.wager({ question: '4問以上当てた自信は？', base: 40 });
    const note = api.layer.querySelector('.mb-wager-ov .mb-wager-note');
    if (note) note.textContent = `4問以上なら 正解数×8×倍率 がもらえる。3問以下なら 15×倍率 を失う${MB.P.fever > 0 ? '（フィーバー中は当たりがさらに2倍）' : ''}`;
    await wp;
    if (!api.alive()) return;

    // 答え合わせ：1問ずつ ○× を押していく
    $('#mb-doubt-steps').innerHTML = api.steps(STEPS, 2);
    const YOU = { honest: '本音', lie: 'ウソ', miss: '見逃し' };
    const list = $('#mb-doubt-list');
    list.innerHTML = lines.map((l, i) => `<div class="doubt-row ${l.bet ? 'is-bet' : ''}" data-i="${i}"><b class="n">${i + 1}</b>
      <span class="q">「${l.text}」<span class="sub">あなた：<em>${YOU[picks[i]]}</em><span class="ans"></span></span></span><b class="mark"></b></div>`).join('');
    list.hidden = false;
    area.classList.add('is-sum');
    bubble.remove();
    area.insertAdjacentHTML('beforeend', `<div class="doubt-tally"><small>当てた数</small><b id="mb-doubt-t">0</b><i>/ 5</i></div>`);
    api.reveal(area, 'start');
    api.coach('答え合わせ……！'); api.sfx.drum();
    await api.wait(950); if (!api.alive()) return;
    let run = 0, missed = false;
    for (let i = 0; i < 5; i++) {
      const l = lines[i];
      if (l.bet) {
        api.coach('最後は、今の賭けの話……！'); api.sfx.drum(); setFace('smug', false);
        await api.wait(1000); if (!api.alive()) return;
      }
      const row = list.querySelector(`.doubt-row[data-i="${i}"]`);
      row.querySelector('.ans').innerHTML = ` → 正解：<em>${l.lie ? 'ウソ' : '本音'}</em>${l.trap ? `<span class="trap">例外！${l.lie ? '静かなウソ' : '元気な本音'}</span>` : ''}`;
      const m = row.querySelector('.mark');
      m.textContent = got[i] ? '○' : '×'; m.className = 'mark is-on ' + (got[i] ? 'ok' : 'ng');
      row.classList.add(got[i] ? 'is-ok' : 'is-ng');
      if (got[i]) { run++; const tb = $('#mb-doubt-t'); tb.textContent = run; tb.classList.remove('is-bump'); void tb.offsetWidth; tb.classList.add('is-bump'); tone(660 + run * 110, .09); tone(990 + run * 110, .1, 'triangle', .05, .06); }
      else {
        api.sfx.nope();
        if (!missed) { missed = true; api.coach(l.trap ? 'それは例外！ 引っかかりやすい所だった' : picks[i] === 'miss' ? 'あちゃー、見逃しちゃった' : 'あちゃー、惜しい！', 'panic'); }
      }
      if (l.bet) setFace(got[i] ? 'panic' : 'smug', true);
      await api.wait(l.bet ? 700 : 520); if (!api.alive()) return;
      if (i === 3 && run === 4) api.coach('ここまで全部○……！ 最後も当たれば、満点', 'smug');
    }

    // ポルカの手札をめくる（5つ目の答えと同じ）
    api.coach(`5つ目は${bluff ? 'ウソ＝ブラフ' : '本音＝本当に強い'}……めくるよ！`);
    const herBox = $('#mb-doubt-her');
    api.reveal(herBox, 'nearest');
    await api.wait(700); if (!api.alive()) return;
    herBox.innerHTML = api.cardHTML(her[0], 'small flip') + api.backHTML('small'); api.sfx.tap();
    await api.wait(her[0].s === X ? 900 : 600); if (!api.alive()) return;
    herBox.innerHTML = api.cardHTML(her[0], 'small') + api.cardHTML(her[1], 'small flip ' + (bluff ? '' : 'glow'));
    const cat = api.category([...her, ...board]);
    $('#mb-doubt-hand').textContent = bluff ? (her[0].s === X ? '役なし（あと1枚でフラッシュ）' : '役なし') : api.CAT_NAME[cat] + '！';
    api.sfx[bluff ? 'tap' : 'whoosh']();
    setFace(bluff ? 'panic' : 'smug');
    api.say(bluff ? (got[4] ? 'うわーん、バレてたー！' : 'えへへ、ブラフでしたー！') : (got[4] ? '……うん、ほんとに強かったの' : '……だから言ったのに'), bluff ? (got[4] ? 'busted' : 'smug') : (got[4] ? 'think' : 'smug'));
    await api.wait(800); if (!api.alive()) return;

    // なぜ当たった／外れたか
    const missIdx = got.map((g, i) => (g ? -1 : i)).filter(i => i >= 0);
    const trapMiss = missIdx.find(i => lines[i].trap && picks[i] !== 'miss');
    const timeouts = missIdx.filter(i => picks[i] === 'miss').length;
    const hand = bluff ? '役なしのブラフ' : `${api.CAT_NAME[cat]}（本当に強い手）`;
    let why;
    if (!missIdx.length) why = '規則も例外も、全部見抜いた。';
    else if (trapMiss != null) why = `${trapMiss + 1}つ目は例外の${lines[trapMiss].lie ? '静かなウソ' : '元気な本音'}で、規則どおりに読んだのは正しい判断。`;
    else if (timeouts) why = `見逃しが${timeouts}つ。迷ったら、声の大きさで即決！`;
    else { const k = missIdx[0]; why = `${k + 1}つ目は${lines[k].lie ? '「！」が多い＝ウソ' : '「……」で短い＝本音'}の形だった。`; }
    api.finish({
      correct, perfect: hits === 5 && api.mult === 3, base,
      title: hits === 5 ? (api.mult === 3 ? undefined : '全問正解！') : hits === 3 ? 'あと1問……！' : undefined,
      detail: `${hits}/5問、5つ目は${bluff ? 'ウソ' : '本音'}＝ポルカは${hand}だった。${why}`,
    });
  }

  MB.register({ id: 'doubt', group: 'psych', order: 3, title: 'ダウト！', sub: 'PSYCH · 早押し', isNew: true, chars: ['polka'], start });
})();
