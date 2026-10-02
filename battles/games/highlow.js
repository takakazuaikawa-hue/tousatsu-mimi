// 論理：ハイ＆ロー（ダブルアップ）
// 場札5枚と、ミミ・相手の手札2枚ずつが見える。「どっちが勝つ？」をミミ／相手／引き分けで当てる。
// 当たると 20→40→80→160→320（最大4回）。当たるたびに「続ける」か「受け取ってやめる」。外すと貯めた分は全部なくなる。
// 出題は「同じ役どうしのキッカー勝負」「一見強そうで負ける」など、考えがいのある形を半分以上にする。
(() => {
  const LADDER = [20, 40, 80, 160, 320];
  const COMBOS = [];
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) for (let d = c + 1; d < 7; d++) for (let e = d + 1; e < 7; e++) COMBOS.push([a, b, c, d, e]);
  const CAT_DESC = ['', '同じ数字2枚', 'ペアが2組', '同じ数字3枚', '数字が5つ連続', '同じマーク5枚', '3枚＋2枚', '同じ数字4枚', '同じマークで5つ連続'];
  // 出題の種類（キッカー勝負と「一見強そうで負ける」で6割強）
  const TYPES = [['kicker', 34], ['fake', 30], ['close', 14], ['tie', 10], ['plain', 12]];

  function sig(api, cards) {
    const s = api.score(cards), cat = Math.floor(s / 1e10);
    if (cat === 4 || cat === 8) return { cat, ranks: [s - cat * 1e10] };
    if (cat === 5 || cat === 0) return { cat, ranks: cards.map(c => c.r).sort((a, b) => b - a) };
    const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    return { cat, ranks: Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a) };
  }
  function handName(api, cards) {
    const R = api.rn; const { cat, ranks } = sig(api, cards);
    switch (cat) {
      case 0: return `役なし（一番上は${R(ranks[0])}）`;
      case 1: return `${R(ranks[0])}のワンペア`;
      case 2: return `${R(ranks[0])}と${R(ranks[1])}のツーペア`;
      case 3: return `${R(ranks[0])}のスリーカード`;
      case 4: return ranks[0] === 5 ? 'A-2-3-4-5のストレート' : `${R(ranks[0] - 4)}〜${R(ranks[0])}のストレート`;
      case 5: return `${api.SYM[cards[0].s]}のフラッシュ`;
      case 6: return `${R(ranks[0])}と${R(ranks[1])}のフルハウス`;
      case 7: return `${R(ranks[0])}のフォーカード`;
      default: return 'ストレートフラッシュ';
    }
  }
  const firstDiff = (sa, sb) => { let i = 0; while (i < sa.ranks.length && sa.ranks[i] === sb.ranks[i]) i++; return i; };
  function tieWhy(api, sa, sb) {
    const R = api.rn; const cat = sa.cat; const i = firstDiff(sa, sb);
    const a = R(sa.ranks[i]), b = R(sb.ranks[i]), h = R(sa.ranks[0]);
    const kick = i === 1 ? `残りの一番強い札 ${a} 対 ${b}` : `残りの札を大きい順に比べて ${a} 対 ${b}`;
    switch (cat) {
      case 0: return i === 0 ? `役なしどうし。一番大きい札 ${a} 対 ${b}` : `役なしどうし。大きい順に比べて ${a} 対 ${b}`;
      case 1: return i === 0 ? `ペアどうし。${a}のペア＞${b}のペア` : `同じ${h}のペア。${kick}`;
      case 2: return i === 0 ? `ツーペアどうし。上のペア ${a} 対 ${b}` : i === 1 ? `上のペアは同じ${h}。下のペア ${a} 対 ${b}` : `ペアは2組とも同じ。残りの札 ${a} 対 ${b}`;
      case 3: return i === 0 ? `スリーカードどうし。${a}の3枚＞${b}の3枚` : `同じ${h}のスリーカード。${kick}`;
      case 4: return `ストレートどうし。一番上の札 ${a} 対 ${b}`;
      case 5: return i === 0 ? `フラッシュどうし。一番大きい札 ${a} 対 ${b}` : `フラッシュどうし。大きい順に比べて ${a} 対 ${b}`;
      case 6: return i === 0 ? `フルハウスどうし。3枚の方 ${a} 対 ${b}` : `3枚は同じ${h}。2枚の方 ${a} 対 ${b}`;
      case 7: return i === 0 ? `フォーカードどうし。${a}＞${b}` : `同じ${h}のフォーカード。残りの札 ${a} 対 ${b}`;
      default: return `ストレートフラッシュどうし。一番上の札 ${a} 対 ${b}`;
    }
  }
  const best5 = (api, seven) => { const s = api.score(seven); for (const ix of COMBOS) { const f = ix.map(i => seven[i]); if (api.score(f) === s) return f; } return seven.slice(0, 5); };
  // 手札2枚の「見た目の強さ」（ペアや大きい札ほど強そうに見える）
  const look = (h) => (h[0].r === h[1].r ? 20 + h[0].r : Math.max(h[0].r, h[1].r) + Math.min(h[0].r, h[1].r) / 15 + (h[0].s === h[1].s ? .8 : 0));

  function classify(api, m, o, b) {
    const A = api.score(m.concat(b)), B = api.score(o.concat(b));
    if (A === B) return 'tie';
    const ca = Math.floor(A / 1e10), cb = Math.floor(B / 1e10);
    const [wh, lh, wc] = A > B ? [m, o, ca] : [o, m, cb];
    if (ca === cb) {
      const sw = sig(api, best5(api, wh.concat(b))), sl = sig(api, best5(api, lh.concat(b)));
      const lead = { 1: 1, 2: 2, 3: 1, 7: 1 }[ca];
      return lead && firstDiff(sw, sl) >= lead ? 'kicker' : 'close';
    }
    const lhStrong = lh[0].r === lh[1].r || Math.max(lh[0].r, lh[1].r) >= 13;
    if (lhStrong && look(lh) >= look(wh) + 3) return 'fake';
    return wc >= 1 ? 'plain' : 'dull';
  }
  function makeDeal(api, want) {
    let last = null;
    for (let t = 0; t < 9000; t++) {
      const d = api.shuffle(api.deck());
      const deal = { m: d.slice(0, 2), o: d.slice(2, 4), b: d.slice(4, 9) };
      const type = classify(api, deal.m, deal.o, deal.b);
      if (type === 'dull') continue;
      last = { ...deal, type };
      if (type === want) return last;
    }
    return last;
  }
  const pickType = (api) => { let r = api.rand(100); for (const [k, w] of TYPES) { if (r < w) return k; r -= w; } return 'plain'; };

  // 心音（4回目の勝負だけ、BGMの代わりに鳴らす）
  let AC = null;
  function heartbeat() {
    const V = MB.vol; if (!V) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime;
      [[62, 0, .3], [50, .17, .22]].forEach(([f, d, v]) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * .6, t + d + .15);
        g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(v * V, t + d + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d + .17);
        o.connect(g); g.connect(AC.destination); o.start(t + d); o.stop(t + d + .2);
      });
    } catch (e) {}
  }

  async function start({ api }) {
    const R = api.rn;
    const opp = api.char, oppName = opp.jp;
    const isGrano = api.charId === 'grano';
    api.say(isGrano ? 'どちらが勝つか……見えますかな？' : 'どっちが勝つか、当ててみて！', isGrano ? 'think' : 'smug');
    api.bet(LADDER[0]);

    api.css('highlow', `
      .hl-top { display: flex; align-items: center; justify-content: center; gap: 6px 22px; flex-wrap: wrap; }
      .hl-ladder { display: flex; gap: 5px; }
      .hl-rung { position: relative; min-width: 56px; padding: 4px 8px 3px; text-align: center; font-family: var(--disp); font-size: 22px; line-height: 1; color: rgba(247,238,207,.45); isolation: isolate; transition: color .2s; }
      .hl-rung::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: rgba(0,0,0,.4); border: 1px solid var(--faint); transition: background .25s, border-color .25s; }
      .hl-rung small { display: block; font-size: 10px; letter-spacing: .12em; color: var(--dim); }
      .hl-rung.won { color: var(--gold-hi); } .hl-rung.won::before { border-color: rgba(217,179,90,.7); background: rgba(217,179,90,.16); }
      .hl-rung.now { color: #fff; } .hl-rung.now::before { background: linear-gradient(90deg, var(--red), #7d1022); border-color: var(--gold-hi); box-shadow: 0 0 14px rgba(200,37,58,.6); }
      .hl-rung.next { color: var(--gold-pale); } .hl-rung.next::before { border: 1px dashed var(--gold-hi); }
      .hl-rung.lost { color: var(--bad); text-decoration: line-through; }
      .hl-pot { text-align: center; line-height: 1; }
      .hl-pot small { display: block; font-size: 11px; color: var(--dim); font-weight: 700; margin-bottom: 2px; }
      .hl-pot b { font-family: var(--disp); font-weight: 400; font-size: 50px; color: var(--gold-hi); display: inline-block; text-shadow: 0 0 18px rgba(245,215,122,.5); font-variant-numeric: tabular-nums; }
      .hl-pot.is-beat b { animation: mb-hlPotBeat .82s ease-out infinite; }
      @keyframes mb-hlPotBeat { 10% { transform: scale(1.12); } 22% { transform: scale(1); } 32% { transform: scale(1.07); } 60% { transform: scale(1); } }
      .hl-pot.is-lost b { color: var(--bad); text-decoration: line-through; text-shadow: none; }
      .hl-jump { animation: mb-hlJump .7s cubic-bezier(.2,1.8,.4,1); }
      @keyframes mb-hlJump { 0% { transform: none; } 30% { transform: translateY(-16px) scale(1.7) rotate(-4deg); color: #fff; } 100% { transform: none; } }
      .hl-round { text-align: center; }
      .hl-round span { display: inline-block; font-family: var(--disp); letter-spacing: .14em; font-size: 16px; padding: 1px 16px 0; color: #1d080e; background: linear-gradient(90deg, var(--gold-hi), var(--gold)); transform: skewX(-12deg); }
      .hl-round span.final { color: #fff; background: linear-gradient(90deg, #7d1022, var(--red-hi), #7d1022); animation: mb-hlFinal 1.64s ease-in-out infinite; }
      @keyframes mb-hlFinal { 0%, 22%, 100% { box-shadow: 0 0 0 rgba(255,74,96,0); } 8% { box-shadow: 0 0 22px rgba(255,74,96,.9); } }
      .hl-board { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .hl-cards { display: flex; gap: 6px; justify-content: center; }
      .hl-duel { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 10px; width: min(640px, 100%); margin: 0 auto; }
      .hl-hand { position: relative; isolation: isolate; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 6px 10px; transition: transform .25s; }
      .hl-hand::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-8deg); background: rgba(0,0,0,.35); border: 1px solid rgba(217,179,90,.3); transition: border-color .25s, box-shadow .25s, background .25s; }
      .hl-hand.win::before { border-color: var(--gold-hi); background: rgba(217,179,90,.14); box-shadow: 0 0 24px rgba(245,215,122,.45); }
      .hl-hand.lose { transform: scale(.97); }
      .hl-hand.lose::before { background: rgba(0,0,0,.55); }
      .hl-who { display: flex; align-items: center; gap: 8px; }
      .hl-who { align-items: flex-end; }
      .hl-who b { align-self: center; }
      .hl-chibi { display: block; height: 76px; width: auto; max-width: 64px; object-fit: contain; object-position: 50% 100%; transform-origin: 50% 100%; filter: drop-shadow(0 5px 6px rgba(0,0,0,.5)); }
      .hl-chibi[data-e="win"] { animation: mb-chHop .62s cubic-bezier(.3,.7,.4,1) 3; }
      .hl-chibi[data-e="lose"] { animation: mb-chSob .5s ease-in-out infinite; }
      .hl-chibi.swap { animation: mb-chPop .32s cubic-bezier(.2,1.5,.4,1); }
      .hl-who b { font-family: var(--disp); letter-spacing: .14em; color: var(--gold); font-weight: 400; font-size: 17px; line-height: 1; }
      .hl-hn { min-height: 2.9em; display: grid; place-items: center; text-align: center; font-weight: 900; font-size: 14px; line-height: 1.3; color: var(--text); text-wrap: balance; }
      .hl-hn span { display: inline-block; padding: 2px 10px; background: rgba(0,0,0,.5); border: 1px solid rgba(217,179,90,.4); }
      .hl-hand.win .hl-hn span { background: linear-gradient(90deg, var(--gold-hi), var(--gold)); color: #1d080e; border-color: #fff3c2; }
      .hl-hn .hl-wait { color: var(--dim); font-weight: 700; font-size: 12px; }
      .hl-vs { align-self: center; font-family: var(--disp); font-size: 36px; color: var(--gold-hi); text-shadow: 0 0 16px rgba(245,215,122,.6); transform: rotate(-8deg); }
      .hl-pick { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; width: min(640px, 100%); margin: 0 auto; }
      .hl-pick .btn { min-width: 0; padding: 8px 10px; min-height: 54px; font-size: 17px; }
      .hl-pick .btn.hl-tie { min-width: 104px; font-size: 15px; }
      .hl-pick.is-cue .btn::before { animation: mb-hlCue 1.3s ease-in-out infinite; }
      @keyframes mb-hlCue { 50% { box-shadow: 0 0 0 2px rgba(245,215,122,.55), 0 0 20px rgba(245,215,122,.55); } }
      .hl-pick .btn.chosen::before { box-shadow: 0 0 0 3px var(--gold-hi), 0 0 22px rgba(245,215,122,.8); }
      .hl-verdict { text-align: center; min-height: 3.2em; display: grid; gap: 2px; align-content: center; }
      .hl-verdict b { font-family: var(--mincho); font-weight: 800; font-size: 24px; line-height: 1.2; }
      .hl-verdict.good b { color: var(--good); } .hl-verdict.bad b { color: var(--bad); } .hl-verdict.draw b { color: var(--gold-hi); }
      .hl-verdict span { font-weight: 700; font-size: 14px; text-wrap: balance; }
      .hl-next { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      .hl-next .actions .btn { min-width: 170px; }
      .hl-tempt { font-family: var(--disp); letter-spacing: .1em; font-size: 18px; color: var(--pink); text-align: center; }
      .hl-next .btn.gold::before { animation: mb-hlCue 1.1s ease-in-out infinite; }
      .hl-heart { position: absolute; inset: -16px -30px; z-index: -1; pointer-events: none; background: radial-gradient(72% 68% at 50% 50%, transparent 55%, rgba(255,40,70,.5) 100%); opacity: 0; animation: mb-hlBeat .82s ease-out infinite; }
      @keyframes mb-hlBeat { 0% { opacity: .15; } 10% { opacity: 1; } 22% { opacity: .35; } 32% { opacity: .85; } 100% { opacity: .1; } }
      .hl-react { position: absolute; z-index: 6; top: 42%; width: 200px; height: 185px; pointer-events: none; }
      .hl-react.left { left: -20px; animation: mb-hlInL .4s cubic-bezier(.2,1.3,.3,1) both; }
      .hl-react.right { right: -20px; animation: mb-hlInR .4s cubic-bezier(.2,1.3,.3,1) both; }
      .hl-react::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56%; transform: skewX(-12deg); background: linear-gradient(90deg, #7d1022, var(--red)); border-block: 2px solid var(--gold-hi); box-shadow: 0 10px 24px rgba(0,0,0,.55); }
      .hl-react img { position: absolute; bottom: 0; left: 50%; height: 100%; transform: translateX(-50%); filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }
      .hl-react b { position: absolute; left: 14px; bottom: 6px; font-family: var(--disp); font-weight: 400; font-size: 38px; line-height: 1; color: #fff; letter-spacing: .06em; text-shadow: 0 3px 0 rgba(0,0,0,.5); }
      .hl-react.out { transition: opacity .3s, transform .3s; opacity: 0; transform: translateY(20px); }
      @keyframes mb-hlInL { from { transform: translateX(-110%); } }
      @keyframes mb-hlInR { from { transform: translateX(110%); } }
      @media (max-width: 560px) {
        .hl-rung { min-width: 0; padding: 3px 7px 2px; font-size: 18px; }
        .hl-pot b { font-size: 40px; }
        .hl-duel { gap: 4px; }
        .hl-vs { font-size: 24px; }
        .hl-chibi { height: 64px; max-width: 54px; }
        .hl-hn { font-size: 12px; }
        .hl-pick { gap: 6px; }
        .hl-pick .btn { font-size: 14px; padding: 6px 4px; }
        .hl-pick .btn.hl-tie { min-width: 76px; font-size: 13px; }
        .hl-verdict b { font-size: 20px; }
        .hl-react { width: 180px; height: 150px; top: 44%; }
        .hl-react b { font-size: 28px; }
        .hl-next .actions .btn { min-width: 140px; }
      }
    `);

    const root = api.root;
    const STEPS = ['どっちが勝つ？', '答え合わせ', '続ける？やめる？'];
    root.innerHTML = `
      <div id="mb-hl-steps">${api.steps(STEPS, 0)}</div>
      <div class="hl-top">
        <div class="hl-ladder" id="mb-hl-ladder">${LADDER.map((v, i) => `<span class="hl-rung" data-i="${i}"><small>${i === 0 ? 'START' : '×' + 2 ** i}</small>${v}</span>`).join('')}</div>
        <div class="hl-pot" id="mb-hl-potbox"><small>いま持っている</small><b id="mb-hl-pot">${LADDER[0]}</b></div>
      </div>
      <div class="hl-round" id="mb-hl-round"></div>
      <div class="hl-board"><span class="zone-label">BOARD · 場札（2人とも使える）</span><div class="hl-cards" id="mb-hl-b"></div></div>
      <div class="hl-duel">
        <div class="hl-hand" id="mb-hl-m"><div class="hl-who"><img class="hl-chibi" src="${api.asset('art/chibi/mimi_think.webp')}" alt=""><b>MIMI</b></div><div class="hl-cards"></div><div class="hl-hn"></div></div>
        <div class="hl-vs">VS</div>
        <div class="hl-hand" id="mb-hl-o"><div class="hl-who"><img class="hl-chibi" src="${api.asset('art/chibi/' + api.charId + '_think.webp')}" alt=""><b>${opp.name}</b></div><div class="hl-cards"></div><div class="hl-hn"></div></div>
      </div>
      <div class="hl-pick" id="mb-hl-pick">
        <button class="btn" data-p="m">ミミ<small>が勝つ</small></button>
        <button class="btn quiet hl-tie" data-p="t">引き分け</button>
        <button class="btn" data-p="o">${oppName}<small>が勝つ</small></button>
      </div>
      <div class="hl-verdict" id="mb-hl-verdict"></div>
      <div class="hl-next" id="mb-hl-next" hidden></div>`;
    api.coach('場札5枚は2人とも使える。強い5枚を作れる方が勝ち', 'think');

    const $ = (s) => root.querySelector(s);
    const potEl = $('#mb-hl-pot');
    const pickBox = $('#mb-hl-pick');
    const verdict = $('#mb-hl-verdict');
    const nextBox = $('#mb-hl-next');
    const setLadder = (won, lost = false) => {
      root.querySelectorAll('.hl-rung').forEach((el, i) => {
        el.className = 'hl-rung' + (i < won ? ' won' : i === won ? (lost ? ' lost' : ' now') : i === won + 1 && !lost ? ' next' : '');
      });
    };
    const react = (src, side, word) => {
      if (!api.alive()) return;
      const el = document.createElement('div');
      el.className = 'hl-react ' + side;
      el.innerHTML = `<img src="${src}" alt=""><b>${word}</b>`;
      root.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 1300);
    };
    // 2人の手札の脇に立つミニキャラ（丸で囲まない）。表情は think/smug/win/lose
    const POSE = ['think', 'smug', 'panic', 'win', 'lose'];
    POSE.forEach(e => { new Image().src = api.asset(`art/chibi/mimi_${e}.webp`); new Image().src = api.asset(`art/chibi/${api.charId}_${e}.webp`); });
    const chibi = (side, expr) => {
      const img = $(`#hl-${side} .hl-chibi`); if (!img) return;
      const src = api.asset(`art/chibi/${side === 'm' ? 'mimi' : api.charId}_${expr}.webp`);
      if (img.dataset.e === expr) return;
      img.dataset.e = expr; img.src = src;
      img.classList.remove('swap'); void img.offsetWidth; img.classList.add('swap');
    };
    const countTo = async (from, to) => {
      const n = api.reduce ? 1 : 8;
      for (let k = 1; k <= n; k++) { potEl.textContent = Math.round(from + (to - from) * k / n); api.sfx.tick(); await api.wait(35); }
    };

    let streak = 0;
    for (let round = 1; round <= 4; round++) {
      const pot = LADDER[round - 1];
      const D = makeDeal(api, pickType(api));
      const isFinal = round === 4;
      $('#mb-hl-steps').innerHTML = api.steps(STEPS, 0);
      setLadder(round - 1);
      api.bet(pot);
      $('#mb-hl-round').innerHTML = `<span class="${isFinal ? 'final' : ''}">${isFinal ? 'FINAL ROUND' : `ROUND ${round} / 4`} · 当たれば ${pot * 2}</span>`;
      verdict.className = 'hl-verdict'; verdict.innerHTML = '';
      nextBox.hidden = true; nextBox.innerHTML = '';
      root.querySelectorAll('.hl-hand').forEach(h => { h.classList.remove('win', 'lose'); h.querySelector('.hl-hn').innerHTML = '<span class="hl-wait">？？？</span>'; });
      chibi('m', 'think'); chibi('o', isGrano ? 'think' : 'smug');
      // 札を裏向きで並べてから、パタパタめくる
      const spots = { m: $('#mb-hl-m .hl-cards'), o: $('#mb-hl-o .hl-cards'), b: $('#mb-hl-b') };
      spots.m.innerHTML = api.backHTML('big') + api.backHTML('big');
      spots.o.innerHTML = api.backHTML('big') + api.backHTML('big');
      spots.b.innerHTML = [0, 1, 2, 3, 4].map(() => api.backHTML('big')).join('');
      pickBox.hidden = false; pickBox.classList.remove('is-cue');
      pickBox.querySelectorAll('.btn').forEach(b => { b.disabled = true; b.classList.remove('chosen'); });
      api.sfx.whoosh();
      await api.wait(api.reduce ? 60 : 260);
      if (!api.alive()) return;
      const order = [['m', 0], ['o', 0], ['m', 1], ['o', 1], ['b', 0], ['b', 1], ['b', 2], ['b', 3], ['b', 4]];
      for (const [w, k] of order) {
        const c = D[w][k];
        spots[w].children[k].outerHTML = api.cardHTML(c, 'big' + (api.reduce ? '' : ' flip'));
        api.sfx.tick();
        await api.wait(api.reduce ? 20 : 95);
        if (!api.alive()) return;
      }
      api.say(round === 1 ? (isGrano ? 'さて、どちらが上でしょう' : 'さあ、どっちだ？') : isFinal ? (isGrano ? '……最後の一番ですな' : 'これで最後だよ……！') : (isGrano ? '次の一番です' : 'まだ続ける？ 強気だね〜'));
      api.coach(round === 1 ? 'それぞれ「手札2枚＋場札5枚」の中の一番強い5枚で比べる' : isFinal ? `当たれば ${pot * 2}。外せば全部なくなる` : `今は ${pot}。当たれば ${pot * 2}`);
      pickBox.querySelectorAll('.btn').forEach(b => { b.disabled = false; });
      pickBox.classList.add('is-cue');
      // 4回目は心音
      let beat = null; let heartEl = null;
      if (isFinal) {
        if (!api.reduce) { heartEl = document.createElement('div'); heartEl.className = 'hl-heart'; root.prepend(heartEl); $('#mb-hl-potbox').classList.add('is-beat'); }
        heartbeat();
        beat = setInterval(() => { if (!api.alive()) { clearInterval(beat); return; } heartbeat(); }, 820);
      }
      const choice = await new Promise(res => {
        pickBox.onclick = (e) => { const b = e.target.closest('.btn[data-p]'); if (!b || b.disabled) return; b.classList.add('chosen'); res(b.dataset.p); };
      });
      if (beat) clearInterval(beat);
      if (heartEl) { heartEl.remove(); $('#mb-hl-potbox').classList.remove('is-beat'); }
      if (!api.alive()) return;
      api.sfx.tap();
      pickBox.classList.remove('is-cue');
      pickBox.querySelectorAll('.btn').forEach(b => { b.disabled = true; });
      $('#mb-hl-steps').innerHTML = api.steps(STEPS, 1);

      // ためてから答え合わせ
      const mAll = D.m.concat(D.b), oAll = D.o.concat(D.b);
      const A = api.score(mAll), B = api.score(oAll);
      const truth = A > B ? 'm' : A < B ? 'o' : 't';
      const m5 = best5(api, mAll), o5 = best5(api, oAll);
      api.coach('見せ合い……！'); api.sfx.drum();
      await api.wait(api.reduce ? 200 : 800);
      if (!api.alive()) return;
      $('#mb-hl-m .hl-hn').innerHTML = `<span>${handName(api, m5)}</span>`; api.sfx.tick();
      await api.wait(api.reduce ? 60 : 380);
      if (!api.alive()) return;
      $('#mb-hl-o .hl-hn').innerHTML = `<span>${handName(api, o5)}</span>`; api.sfx.tick();
      await api.wait(api.reduce ? 60 : 420);
      if (!api.alive()) return;
      // 勝った5枚を光らせる（引き分けは両方）
      const lit = new Set((truth === 'm' ? m5 : truth === 'o' ? o5 : m5.concat(o5)).map(api.key));
      const litCards = (box) => box.querySelectorAll('.card').forEach(el => { el.classList.remove('flip'); el.classList.add(lit.has(el.dataset.k) ? 'glow' : 'dim'); });
      litCards(spots.b);
      if (truth !== 'o') litCards(spots.m); else spots.m.querySelectorAll('.card').forEach(el => el.classList.add('dim'));
      if (truth !== 'm') litCards(spots.o); else spots.o.querySelectorAll('.card').forEach(el => el.classList.add('dim'));
      if (truth !== 't') { $(truth === 'm' ? '#mb-hl-m' : '#mb-hl-o').classList.add('win'); $(truth === 'm' ? '#mb-hl-o' : '#mb-hl-m').classList.add('lose'); chibi(truth, 'win'); chibi(truth === 'm' ? 'o' : 'm', 'lose'); }
      else { $('#mb-hl-m').classList.add('win'); $('#mb-hl-o').classList.add('win'); chibi('m', 'smug'); chibi('o', 'smug'); }
      // 何で決まったかを1文で
      const wName = truth === 'm' ? 'ミミ' : oppName;
      let why;
      if (truth === 't') {
        const same = m5.every(c => o5.some(x => api.key(x) === api.key(c)));
        why = same ? `どちらも場の5枚がそのまま一番強い（${handName(api, m5)}）。手札は関係なく引き分け` : `どちらも同じ強さの「${handName(api, m5)}」。引き分け`;
      } else {
        const w5 = truth === 'm' ? m5 : o5, l5 = truth === 'm' ? o5 : m5;
        const lh = truth === 'm' ? D.o : D.m;
        const sw = sig(api, w5), sl = sig(api, l5);
        if (sw.cat === sl.cat) why = `${tieWhy(api, sw, sl)} で、${wName}が上`;
        else {
          const hi = Math.max(lh[0].r, lh[1].r);
          const pre = lh[0].r === lh[1].r ? `${R(lh[0].r)}のペアを持っていても、` : hi >= 13 && D.type === 'fake' ? `${R(hi)}を持っていても、` : '';
          why = `${pre}${api.CAT_NAME[sw.cat]}（${CAT_DESC[sw.cat]}）は${api.CAT_NAME[sl.cat]}より強い`;
        }
      }
      const ok = choice === truth;
      if (ok) {
        streak++;
        const now = LADDER[round];
        verdict.className = 'hl-verdict good';
        verdict.innerHTML = `<b>当たり！ ${truth === 't' ? '引き分け' : wName + 'の勝ち'}</b><span>${why}</span>`;
        api.sfx.good();
        react(api.MIMI.win, 'left', `×${2 ** round}!`);
        api.say(isGrano ? (round >= 3 ? 'ほう……！ これは参りましたな' : 'お見事です') : (round >= 3 ? 'うそっ、また当てた……！' : 'むむっ、当たりか〜'), round >= 3 ? 'panic' : 'think');
        api.coach(round >= 3 ? 'すごい、まだ当たってる！' : 'いい読み！', round >= 3 ? 'win' : 'smug');
        setLadder(round);
        await countTo(pot, now);
        if (!api.alive()) return;
        potEl.classList.remove('hl-jump'); void potEl.offsetWidth; potEl.classList.add('hl-jump');
        { const r = potEl.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height / 2, 10 + round * 6); }
        api.bet(now);
        if (isFinal) {
          api.sfx.jackpot();
          api.coach('4連続正解！ 320 を持ち帰り！');
          await api.wait(api.reduce ? 500 : 1500);
          if (!api.alive()) return;
          api.finish({ correct: true, perfect: true, base: now, title: '4連続 的中！', detail: `4回続けて当てて、20 を 320 まで増やした。最後は「${why}」。` });
          return;
        }
        // 続けるか、受け取ってやめるか（射幸性の核）
        $('#mb-hl-steps').innerHTML = api.steps(STEPS, 2);
        await api.wait(api.reduce ? 100 : 500);
        if (!api.alive()) return;
        const tempt = round === 3 ? `次が最後。当たれば 320 ＆ PERFECT` : `あと${4 - round}回当てれば 320`;
        nextBox.innerHTML = `<div class="hl-tempt">${tempt}</div>
          <div class="actions">
            <button class="btn gold" data-a="go">続ける<small>当たれば ${now * 2}／外せば 0</small></button>
            <button class="btn quiet" data-a="take">受け取ってやめる<small>${now} を持ち帰る</small></button>
          </div>`;
        nextBox.hidden = false; pickBox.hidden = true;
        api.coach(`${now} を持ち帰るか、${now * 2} を狙うか`, 'think');
        const act = await new Promise(res => { nextBox.onclick = (e) => { const b = e.target.closest('.btn[data-a]'); if (b) res(b.dataset.a); }; });
        if (!api.alive()) return;
        api.sfx.tap();
        if (act === 'take') {
          nextBox.hidden = true;
          api.say(isGrano ? '賢明なご判断です' : 'えー、やめちゃうの？', isGrano ? 'think' : 'plead');
          await api.wait(api.reduce ? 100 : 400);
          if (!api.alive()) return;
          api.finish({ correct: true, perfect: false, base: now, title: '持ち帰り！', detail: `${streak === 1 ? '1回当てて' : streak + '回続けて当てて'}、${now} を持ち帰った。引き際を決めるのも立派な判断。` });
          return;
        }
        continue;
      }
      // 外れ：貯めた分は全部なくなる
      verdict.className = 'hl-verdict bad';
      verdict.innerHTML = `<b>はずれ…… ${truth === 't' ? '引き分けだった' : wName + 'の勝ち'}</b><span>${why}</span>`;
      api.sfx.nope();
      react(opp.smug, 'right', 'LOST');
      api.say(isGrano ? '……勝負とは、厳しいものですな' : 'へへーん、残念でした！', 'smug');
      api.coach('あちゃー、次は光る5枚をよく見よ', 'panic');
      setLadder(round - 1, true);
      $('#mb-hl-potbox').classList.add('is-lost');
      await api.wait(api.reduce ? 600 : 2300);
      if (!api.alive()) return;
      api.finish({
        correct: false, perfect: false, base: pot * 2,
        detail: `${why}。持っていた ${pot} はなくなった。${streak ? `（ここまで${streak}回当てたのは見事）` : ''}`,
      });
      return;
    }
  }

  MB.register({ id: 'highlow', group: 'logic', order: 2, title: 'ハイ＆ロー', sub: 'LOGIC · ダブルアップ', isNew: true, chars: ['polka', 'grano'], start });
})();
