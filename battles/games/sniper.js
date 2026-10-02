// 論理：賭け額スナイパー
// ミミは強い手。セリナから少しでも多く取りたい。でも大きく賭けすぎると、用心深いセリナは降りてしまう。
// 照準（またはスライダー）で賭け額を選ぶ。「付いてくる確率」と「もらえる見込み＝確率×賭け額（四角の面積）」を見て、
// 面積が一番大きい所を撃つ → 読みに賭ける → セリナが実際に付いてくるかを乱数で決める → 本当のベストの額と比べる。
(() => {
  // セリナが付いてくる確率の曲線（毎回少し違う）。x は「賭け額 ÷ ポット」
  function makeCurve(pot, step) {
    const R = (a, b) => a + Math.random() * (b - a);
    for (let t = 0; t < 400; t++) {
      const pmax = R(.88, .97), x0 = R(.45, 1.2), k = R(3.2, 6);
      const p = (bet) => pmax / (1 + Math.exp(k * (bet / pot - x0)));
      const ev = (bet) => p(bet) * bet;
      let best = 0, bestBet = 0;
      for (let b = pot / 4; b <= pot * 2 + 1e-6; b += step) { if (ev(b) > best) { best = ev(b); bestBet = b; } }
      const x = bestBet / pot;
      if (x < .35 || x > 1.5) continue;
      if (ev(pot / 4) / best > .85 || ev(pot * 2) / best > .85) continue;
      return { p, ev, best, bestBet: Math.round(bestBet) };
    }
    const p = (bet) => .92 / (1 + Math.exp(4.5 * (bet / pot - .75)));
    const ev = (bet) => p(bet) * bet; let best = 0, bestBet = pot;
    for (let b = pot / 4; b <= pot * 2 + 1e-6; b += step) if (ev(b) > best) { best = ev(b); bestBet = b; }
    return { p, ev, best, bestBet: Math.round(bestBet) };
  }
  // 撃った音（短い雑音と低い衝撃）
  let AC = null;
  function bang() {
    const V = MB.vol; if (!V) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime, n = Math.floor(AC.sampleRate * .28);
      const buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = AC.createBufferSource(); src.buffer = buf;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = AC.createGain(); g.gain.value = .28 * V;
      src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t);
      const o = AC.createOscillator(), og = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .2);
      og.gain.setValueAtTime(.35 * V, t); og.gain.exponentialRampToValueAtTime(.0001, t + .25);
      o.connect(og); og.connect(AC.destination); o.start(t); o.stop(t + .3);
    } catch (e) {}
  }
  function handName(api, seven) {
    const s = api.score(seven), cat = Math.floor(s / 1e10);
    if (cat === 5) { const cnt = {}; seven.forEach(c => { cnt[c.s] = (cnt[c.s] || 0) + 1; }); const S = Object.keys(cnt).find(k => cnt[k] >= 5); return `${api.SYM[S]}のフラッシュ`; }
    if (cat === 4) { const top = s - 4e10; return top === 5 ? 'A-2-3-4-5のストレート' : `${api.rn(top - 4)}〜${api.rn(top)}のストレート`; }
    const cnt = {}; seven.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    const top = (k) => Math.max(...Object.keys(cnt).filter(r => cnt[r] >= k).map(Number));
    if (cat === 3) return `${api.rn(top(3))}のスリーカード`;
    if (cat === 6) return `${api.rn(top(3))}のフルハウス`;
    if (cat === 7) return `${api.rn(top(4))}のフォーカード`;
    return api.CAT_NAME[cat];
  }

  async function start({ api }) {
    const pot = api.pick([400, 480, 600, 800]);
    const step = pot / 40;
    const minBet = pot / 4, maxBet = pot * 2;
    const C = makeCurve(pot, step);
    // ミミの強い手（ほぼ勝てる）と、セリナが付いてきた時の手（ミミより弱い）を先に決めておく
    let hole = null, board = null, eq = -1;
    for (let t = 0; t < 400; t++) {
      const d = api.shuffle(api.deck());
      const h = d.slice(0, 2), b = d.slice(2, 7);
      if (api.category(h.concat(b)) < 3 || api.category(b) >= 3) continue;
      const e = api.equity(h, b, 300);
      if (e > eq) { hole = h; board = b; eq = e; }
      if (eq >= .86) break;
    }
    if (!hole) { const d = api.shuffle(api.deck()); hole = d.slice(0, 2); board = d.slice(2, 7); eq = api.equity(hole, board, 300); }
    const used = new Set(hole.concat(board).map(api.key));
    const rest = api.deck().filter(c => !used.has(api.key(c)));
    const myScore = api.score(hole.concat(board));
    let her = null;
    for (let t = 0; t < 400 && !her; t++) {
      const h = api.shuffle(rest).slice(0, 2);
      const s = api.score(h.concat(board));
      if (s < myScore && Math.floor(s / 1e10) >= 1) her = h;
    }
    if (!her) her = api.shuffle(rest).slice(0, 2);

    api.say('……ずいぶん考えるのね。', 'think');
    api.bet('?');
    api.css('sniper', `
      .sn-me { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 14px; }
      .sn-me .hl { display: flex; gap: 4px; align-items: center; }
      .sn-me .plus { color: var(--dim); font-weight: 900; }
      .sn-me-name { font-weight: 900; font-size: 14px; }
      .sn-me-name small { display: block; font-weight: 700; font-size: 11px; color: var(--dim); }
      .sn-pot { font-family: var(--disp); letter-spacing: .1em; color: var(--dim); font-size: 14px; line-height: 1; text-align: center; }
      .sn-pot b { display: block; font-weight: 400; font-size: 30px; color: var(--gold-hi); letter-spacing: .04em; }
      .sn-read { display: flex; align-items: flex-end; justify-content: center; gap: 8px 14px; flex-wrap: wrap; font-variant-numeric: tabular-nums; }
      .sn-read > div { text-align: center; line-height: 1; }
      .sn-read small { display: block; font-size: 11px; font-weight: 700; color: var(--dim); margin-bottom: 3px; }
      .sn-read b { font-family: var(--disp); font-weight: 400; font-size: 40px; color: #fff; letter-spacing: .03em; }
      .sn-read .op { font-family: var(--disp); font-size: 30px; color: var(--gold); padding-bottom: 4px; }
      .sn-read em { font-style: normal; font-weight: 900; font-size: 14px; color: var(--gold-hi); display: inline-block; padding: 6px 10px; border: 1px solid rgba(217,179,90,.6); background: rgba(217,179,90,.16); }
      .sn-meter { display: block; width: 110px; height: 5px; margin: 4px auto 0; background: rgba(255,255,255,.12); transform: skewX(-12deg); }
      .sn-meter i { display: block; height: 100%; background: linear-gradient(90deg, var(--red-hi), var(--gold-hi)); transition: width .08s; }
      .sn-wrap { position: relative; padding: 24px 14px 30px 46px; }
      .sn-chart { position: relative; height: 225px; touch-action: pan-y; cursor: crosshair; user-select: none; -webkit-user-select: none; }
      .sn-chart svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
      .sn-ylab, .sn-xlab { position: absolute; font-family: var(--disp); font-size: 13px; letter-spacing: .06em; color: var(--dim); line-height: 1; white-space: nowrap; pointer-events: none; }
      .sn-ylab { left: -8px; transform: translate(-100%, -50%); }
      .sn-xlab { bottom: -20px; transform: translateX(-50%); }
      .sn-axis-y { position: absolute; left: 0; top: -19px; font-size: 11px; font-weight: 700; color: var(--dim); pointer-events: none; white-space: nowrap; }
      .sn-floor { position: absolute; left: 0; top: 4px; width: 12.5%; text-align: center; font-size: 10px; font-weight: 700; color: rgba(247,238,207,.5); pointer-events: none; }
      .sn-area { position: absolute; transform: translate(-50%, -50%); font-weight: 900; font-size: 13px; color: var(--gold-pale); text-shadow: 0 1px 3px rgba(0,0,0,.8); pointer-events: none; white-space: nowrap; transition: opacity .15s; }
      .sn-ret { position: absolute; width: 0; height: 0; pointer-events: none; z-index: 2; }
      .sn-ret .x1, .sn-ret .x2 { position: absolute; left: -44px; top: -1px; width: 88px; height: 2px; background: linear-gradient(90deg, var(--red-hi) 0 38%, transparent 38% 62%, var(--red-hi) 62%); }
      .sn-ret .x1 { transform: rotate(45deg); } .sn-ret .x2 { transform: rotate(-45deg); }
      .sn-ret .dia { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border: 2px solid #fff; transform: rotate(45deg); box-shadow: 0 0 10px rgba(255,74,96,.9); }
      .sn-ret .dot { position: absolute; left: -2px; top: -2px; width: 4px; height: 4px; background: #fff; }
      .sn-ret .num { position: absolute; left: 20px; bottom: 14px; font-family: var(--disp); line-height: .9; white-space: nowrap; padding: 3px 10px 2px; background: rgba(20,6,10,.85); border-left: 3px solid var(--red-hi); transform: skewX(-12deg); }
      .sn-ret .num > span { display: block; transform: skewX(12deg); }
      .sn-ret .num b { font-weight: 400; font-size: 28px; color: #fff; letter-spacing: .04em; }
      .sn-ret .num small { display: block; font-size: 13px; color: var(--gold-hi); letter-spacing: .1em; }
      .sn-ret.flip-x .num { left: auto; right: 20px; border-left: 0; border-right: 3px solid var(--red-hi); }
      .sn-ret.flip-y .num { bottom: auto; top: 14px; }
      .sn-ret.is-cue .dia { animation: mb-snCue 1s ease-in-out infinite; }
      @keyframes mb-snCue { 50% { transform: rotate(45deg) scale(1.45); box-shadow: 0 0 18px rgba(245,215,122,1); border-color: var(--gold-hi); } }
      .sn-hint { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); font-weight: 900; font-size: 12px; color: var(--gold-hi); white-space: nowrap; animation: mb-snHint 1.2s ease-in-out infinite; }
      @keyframes mb-snHint { 50% { transform: translateX(-50%) translateX(6px); } }
      .sn-ret.locked .x1, .sn-ret.locked .x2 { background: linear-gradient(90deg, #fff 0 38%, transparent 38% 62%, #fff 62%); }
      .sn-ret.locked .dia { border-color: var(--red-hi); background: rgba(255,74,96,.35); }
      .sn-best { position: absolute; width: 0; height: 0; pointer-events: none; z-index: 3; }
      .sn-best .dia { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; border: 3px solid var(--gold-hi); background: rgba(245,215,122,.25); transform: rotate(45deg); box-shadow: 0 0 20px rgba(245,215,122,.9); animation: mb-snBest .6s cubic-bezier(.2,1.6,.4,1) both; }
      .sn-best .lab { position: absolute; left: -40px; width: 80px; bottom: 22px; text-align: center; font-family: var(--disp); font-size: 18px; line-height: 1; color: #1d080e; background: linear-gradient(90deg, var(--gold-hi), var(--gold)); padding: 3px 0 1px; transform: skewX(-12deg); }
      .sn-best.below .lab { bottom: auto; top: 22px; }
      @keyframes mb-snBest { from { transform: rotate(45deg) scale(3); opacity: 0; } }
      .sn-range { width: 100%; margin: 0; accent-color: var(--red-hi); height: 28px; cursor: pointer; }
      @media (max-width: 560px) { .sn-range { height: 44px; } }
      .sn-rangebox { padding: 0 14px 0 46px; }
      .sn-fire.is-cue::before { animation: mb-snFire 1s ease-in-out infinite; }
      @keyframes mb-snFire { 50% { box-shadow: 0 0 0 3px rgba(255,74,96,.6), 0 0 26px rgba(255,74,96,.8); } }
      .sn-freeze, .sn-freeze * { animation-play-state: paused !important; }
      .sn-freeze .sn-wrap { filter: grayscale(1) contrast(1.4) brightness(1.2); }
      .sn-flash { position: absolute; inset: 0; z-index: 5; background: #fff; pointer-events: none; animation: mb-snFlash .45s ease-out forwards; }
      @keyframes mb-snFlash { 0% { opacity: .9; } 100% { opacity: 0; } }
      .sn-shake { animation: mb-snShake .32s ease; }
      @keyframes mb-snShake { 20% { transform: translate(-6px, 3px); } 40% { transform: translate(5px, -3px); } 60% { transform: translate(-3px, 2px); } 80% { transform: translate(2px, -1px); } }
      .sn-out { text-align: center; display: grid; gap: 4px; }
      .sn-out .roll { font-weight: 900; font-size: 15px; }
      .sn-out .roll b { font-family: var(--disp); font-weight: 400; font-size: 24px; letter-spacing: .06em; }
      .sn-out .roll .call { color: var(--good); } .sn-out .roll .fold { color: var(--bad); }
      .sn-out .her { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--dim); }
      .sn-cmp { display: flex; justify-content: center; gap: 8px 18px; flex-wrap: wrap; font-variant-numeric: tabular-nums; }
      .sn-cmp > div { text-align: center; line-height: 1.1; padding: 4px 14px; position: relative; isolation: isolate; }
      .sn-cmp > div::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: rgba(0,0,0,.45); border: 1px solid var(--faint); }
      .sn-cmp > div.best::before { border-color: var(--gold-hi); background: rgba(217,179,90,.16); }
      .sn-cmp small { display: block; font-size: 11px; color: var(--dim); font-weight: 700; }
      .sn-cmp b { font-family: var(--disp); font-weight: 400; font-size: 28px; }
      .sn-cmp .best b { color: var(--gold-hi); }
      .sn-verdict { text-align: center; font-family: var(--mincho); font-weight: 800; font-size: 20px; }
      .sn-verdict.good { color: var(--good); } .sn-verdict.bad { color: var(--bad); }
      .sn-verdict small { display: block; font-family: var(--sans); font-size: 13px; color: var(--text); font-weight: 700; }
      .sn-react { position: absolute; z-index: 6; right: -6px; top: 34%; width: 260px; height: 190px; pointer-events: none; animation: mb-snIn .4s cubic-bezier(.2,1.3,.3,1) both; }
      .sn-react::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56%; transform: skewX(-12deg); background: linear-gradient(90deg, #7d1022, var(--red)); border-block: 2px solid var(--gold-hi); box-shadow: 0 10px 24px rgba(0,0,0,.55); }
      .sn-react img { position: absolute; bottom: 0; right: -10px; height: 100%; filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }
      .sn-react b { position: absolute; left: 14px; bottom: 6px; font-family: var(--disp); font-weight: 400; font-size: 40px; line-height: 1; color: #fff; letter-spacing: .06em; text-shadow: 0 3px 0 rgba(0,0,0,.5); }
      .sn-react.out { transition: opacity .3s, transform .3s; opacity: 0; transform: translateX(40px); }
      @keyframes mb-snIn { from { transform: translateX(110%); } }
      @media (max-width: 560px) {
        .sn-read b { font-size: 32px; } .sn-read .op { font-size: 24px; }
        .sn-read em { font-size: 12px; padding: 4px 8px; }
        .sn-meter { width: 84px; }
        .sn-wrap { padding: 22px 8px 28px 38px; }
        .sn-rangebox { padding: 0 8px 0 38px; }
        .sn-chart { height: 210px; }
        .sn-ylab { font-size: 11px; }
        .sn-xlab { font-size: 11px; }
        
        .sn-ret .num b { font-size: 22px; } .sn-ret .num small { font-size: 11px; }
        .sn-react { width: 190px; height: 140px; }
        .sn-react b { font-size: 30px; }
        .sn-cmp b { font-size: 22px; }
        .sn-verdict { font-size: 18px; }
      }
    `);

    const root = api.root;
    const STEPS = ['額をねらう', '撃つ', '読みを賭ける', '答え合わせ'];
    const X = (bet) => bet / maxBet * 100;           // 横：0〜2倍ポット → 0〜100%
    const Y = (p) => (1 - p) * 100;                   // 縦：確率 100%〜0%
    const curvePts = []; for (let b = 0; b <= maxBet + 1e-6; b += maxBet / 120) curvePts.push(`${(X(b) * 10).toFixed(1)},${(Y(C.p(b)) * 10).toFixed(1)}`);
    const init = Math.round((pot * (.95 + Math.random() * .6)) / step) * step;
    root.innerHTML = `
      <div id="mb-sn-steps">${api.steps(STEPS, 0)}</div>
      <div class="sn-me">
        <span class="hl">${hole.map(c => api.cardHTML(c, 'small')).join('')}<span class="plus">＋</span>${board.map(c => api.cardHTML(c, 'small')).join('')}</span>
        <span class="sn-me-name">ミミ：${handName(api, hole.concat(board))}<small>ランダムな手への勝率 ${Math.round(eq * 100)}%（ほぼ勝てる）</small></span>
        <span class="sn-pot">POT<b>${pot}</b></span>
      </div>
      <p class="prompt" id="mb-sn-prompt">額を上げると取り分は増える。でも付いてくる確率は下がる。掛け算が一番大きい所を狙って</p>
      <div class="sn-read">
        <div><small>賭け額</small><b id="mb-sn-bet">${init}</b></div>
        <span class="op">×</span>
        <div><small>${api.char.jp}が付いてくる確率</small><b id="mb-sn-p">0%</b><i class="sn-meter"><i id="mb-sn-pm"></i></i></div>
        <span class="op">＝</span>
        <div><small>もらえる見込み</small><em>金色の四角の広さ</em></div>
      </div>
      <div class="sn-wrap" id="mb-sn-wrap">
        <div class="sn-chart" id="mb-sn-chart">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id="mb-sn-hatch" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="rgba(0,0,0,.35)"/><rect width="6" height="24" fill="rgba(217,179,90,.12)"/></pattern>
              <linearGradient id="mb-sn-under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,74,96,.22)"/><stop offset="1" stop-color="rgba(255,74,96,0)"/></linearGradient>
            </defs>
            <rect x="0" y="0" width="1000" height="1000" fill="rgba(0,0,0,.35)" stroke="rgba(217,179,90,.45)" vector-effect="non-scaling-stroke"/>
            <rect x="0" y="0" width="${X(minBet) * 10}" height="1000" fill="url(#mb-sn-hatch)"/>
            ${[250, 500, 750].map(v => `<line x1="0" x2="1000" y1="${v}" y2="${v}" stroke="rgba(247,238,207,.1)" vector-effect="non-scaling-stroke"/><line y1="0" y2="1000" x1="${v}" x2="${v}" stroke="rgba(247,238,207,.1)" vector-effect="non-scaling-stroke"/>`).join('')}
            <path d="M0,1000 L${curvePts.join(' L')} L1000,1000 Z" fill="url(#mb-sn-under)"/>
            <rect id="mb-sn-bestrect" x="0" y="0" width="0" height="0" fill="none" stroke="var(--gold-hi)" stroke-width="2" stroke-dasharray="6 5" vector-effect="non-scaling-stroke" opacity="0"/>
            <rect id="mb-sn-rect" x="0" y="0" width="0" height="0" fill="rgba(245,215,122,.30)" stroke="var(--gold-hi)" stroke-width="2" vector-effect="non-scaling-stroke"/>
            <path d="M${curvePts.join(' L')}" fill="none" stroke="var(--red-hi)" stroke-width="3" vector-effect="non-scaling-stroke"/>
          </svg>
          <span class="sn-axis-y">↑ 付いてくる確率　　→ 賭け額</span>
          ${[[1, '100%'], [.5, '50%'], [0, '0%']].map(([p, t]) => `<span class="sn-ylab" style="top:${Y(p)}%">${t}</span>`).join('')}
          ${[[minBet, '¼'], [pot / 2, '½'], [pot, 'POT'], [pot * 1.5, '1.5×'], [maxBet, '2×']].map(([b, t]) => `<span class="sn-xlab" style="left:${X(b)}%">${t}</span>`).join('')}
          <span class="sn-floor">最低額</span>
          <span class="sn-area" id="mb-sn-area">見込み</span>
          <div class="sn-ret is-cue" id="mb-sn-ret"><i class="x1"></i><i class="x2"></i><i class="dia"></i><i class="dot"></i><div class="num"><span><b id="mb-sn-rb">0</b><small id="mb-sn-rp">CALL 0%</small></span></div></div>
          <span class="sn-hint" id="mb-sn-hint">◀ 照準をドラッグ ▶</span>
        </div>
      </div>
      <div class="sn-rangebox"><input class="sn-range" id="mb-sn-range" type="range" min="${minBet}" max="${maxBet}" step="${step}" value="${init}" aria-label="賭け額"></div>
      <div class="actions" id="mb-sn-acts"><button class="btn sn-fire" id="mb-sn-fire">撃つ<small>この額で賭ける</small></button></div>
      <div class="sn-out" id="mb-sn-out"></div>`;
    api.coach('金色の四角の広さ＝もらえる見込み。一番広くなる所を探して', 'think');

    const $ = (s) => root.querySelector(s);
    const chart = $('#mb-sn-chart'), rect = $('#mb-sn-rect'), ret = $('#mb-sn-ret'), range = $('#mb-sn-range'), area = $('#mb-sn-area');
    const fire = $('#mb-sn-fire');
    let bet = init, locked = false, moved = false, lastTick = 0;
    const set = (v, byUser) => {
      v = Math.max(minBet, Math.min(maxBet, Math.round(v / step) * step));
      v = Math.round(v * 100) / 100;
      const changed = v !== bet; bet = v;
      const p = C.p(bet);
      const x = X(bet), y = Y(p);
      rect.setAttribute('x', 0); rect.setAttribute('y', y * 10); rect.setAttribute('width', x * 10); rect.setAttribute('height', 1000 - y * 10);
      ret.style.left = x + '%'; ret.style.top = y + '%';
      ret.classList.toggle('flip-x', x > 68); ret.classList.toggle('flip-y', y < 22);
      area.style.left = (x / 2) + '%'; area.style.top = ((y + 100) / 2) + '%';
      area.style.opacity = x > 14 && (100 - y) > 14 ? 1 : 0;
      $('#mb-sn-rb').textContent = Math.round(bet);
      $('#mb-sn-rp').textContent = `CALL ${Math.round(p * 100)}%`;
      $('#mb-sn-bet').textContent = Math.round(bet);
      $('#mb-sn-p').textContent = Math.round(p * 100) + '%';
      $('#mb-sn-pm').style.width = (p * 100) + '%';
      range.value = bet;
      if (byUser && changed) {
        const now = performance.now(); if (now - lastTick > 45) { api.sfx.tick(); lastTick = now; }
        if (!moved) {
          moved = true; ret.classList.remove('is-cue'); const h = $('#mb-sn-hint'); if (h) h.remove();
          fire.classList.add('is-cue');
          api.coach('四角が一番広くなったら「撃つ」', 'smug');
        }
      }
    };
    set(init, false);
    const toBet = (clientX) => { const r = chart.getBoundingClientRect(); return (clientX - r.left) / r.width * maxBet; };
    let dragging = false;
    chart.addEventListener('pointerdown', (e) => { if (locked) return; dragging = true; try { chart.setPointerCapture(e.pointerId); } catch (err) {} set(toBet(e.clientX), true); });
    chart.addEventListener('pointermove', (e) => { if (dragging && !locked) set(toBet(e.clientX), true); });
    const end = () => { dragging = false; };
    chart.addEventListener('pointerup', end); chart.addEventListener('pointercancel', end);
    range.addEventListener('input', () => { if (!locked) set(+range.value, true); });

    await new Promise(res => { fire.onclick = res; });
    if (!api.alive()) return;
    // 撃つ：一瞬止まる
    locked = true; range.disabled = true; fire.disabled = true; fire.classList.remove('is-cue');
    ret.classList.remove('is-cue'); ret.classList.add('locked');
    const hint = $('#mb-sn-hint'); if (hint) hint.remove();
    bang();
    const wrap = $('#mb-sn-wrap');
    if (!api.reduce) {
      const fl = document.createElement('div'); fl.className = 'sn-flash'; wrap.appendChild(fl);
      root.classList.add('sn-freeze');
      await api.wait(360);
      root.classList.remove('sn-freeze'); fl.remove();
      wrap.classList.add('sn-shake');
    }
    if (!api.alive()) return;
    const myBet = Math.round(bet), p = C.p(bet), myEV = C.ev(bet), ratio = myEV / C.best;
    api.bet(myBet);
    $('#mb-sn-acts').hidden = true;
    $('#mb-sn-prompt').hidden = true; range.closest('.sn-rangebox').hidden = true;
    $('#mb-sn-steps').innerHTML = api.steps(STEPS, 2);
    api.coach(`${myBet} で撃った。付いてくる確率は ${Math.round(p * 100)}%`);
    await api.wager({ question: 'ここがベストの額？', base: '20〜40' });
    if (!api.alive()) return;
    $('#mb-sn-steps').innerHTML = api.steps(STEPS, 3);

    // セリナが付いてくるか：画面の確率どおりに乱数で決める
    const out = $('#mb-sn-out');
    api.say('……'); api.coach(`${api.char.jp}の番……`); api.sfx.drum();
    await api.wait(api.reduce ? 200 : 1100);
    if (!api.alive()) return;
    const call = Math.random() < p;
    const react = (src, word) => {
      const el = document.createElement('div'); el.className = 'sn-react';
      el.innerHTML = `<img src="${src}" alt=""><b>${word}</b>`; root.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 1500);
    };
    if (call) {
      api.say('……コール。', 'panic'); api.sfx.good(); // 強い手に付いてきてしまった：セリナが唯一、表情を崩す所
      out.innerHTML = `<div class="roll">付いてくる確率 ${Math.round(p * 100)}% → <b class="call">CALL</b> 付いてきた！</div>
        <div class="her">${api.char.jp}の手 ${her.map(c => api.cardHTML(c, 'small' + (api.reduce ? '' : ' flip'))).join('')} ${api.CAT_NAME[api.category(her.concat(board))]}。ミミの勝ちで ${pot + myBet * 2} 獲得</div>`;
      react(api.char.panic, 'CALL');
    } else {
      api.say('……降りるわ。', 'think'); api.sfx.nope();
      out.innerHTML = `<div class="roll">付いてくる確率 ${Math.round(p * 100)}% → <b class="fold">FOLD</b> 降りられた</div>
        <div class="her">ミミはポットの ${pot} だけ獲得</div>`;
      react(api.char.smug, 'FOLD');
    }
    await api.wait(api.reduce ? 400 : 1600);
    if (!api.alive()) return;

    // 答え合わせ：本当のベストの額に照準マーク
    api.coach('本当のベストの額は……'); api.sfx.drum();
    await api.wait(api.reduce ? 200 : 800);
    if (!api.alive()) return;
    const bp = C.p(C.bestBet);
    const br = $('#mb-sn-bestrect');
    br.setAttribute('y', Y(bp) * 10); br.setAttribute('width', X(C.bestBet) * 10); br.setAttribute('height', 1000 - Y(bp) * 10); br.setAttribute('opacity', 1);
    const below = !ret.classList.contains('flip-y') && Y(bp) < 80;
    $('#mb-sn-rb').textContent = 'YOU ' + myBet;
    chart.insertAdjacentHTML('beforeend', `<div class="sn-best ${below ? 'below' : ''}" style="left:${X(C.bestBet)}%;top:${Y(bp)}%"><i class="dia"></i><span class="lab">BEST ${C.bestBet}</span></div>`);
    api.sfx.tick();
    const pct = Math.round(ratio * 100);
    const correct = ratio >= .9;
    const perfect = ratio >= .97 && api.mult === 3;
    const dir = myBet > C.bestBet ? '大きすぎた。セリナが降りやすくなる' : '小さすぎた。もっと取れた';
    const luck = correct && !call ? 'セリナは降りたけど、それは運。額の選び方は正解' : !correct && call ? `付いてきたのは運。見込みではベストの ${pct}%` : '';
    const verdictText = correct ? (ratio >= .97 ? 'ど真ん中！' : 'ほぼベスト！') : `ずれた：${dir}`;
    out.insertAdjacentHTML('beforeend', `
      <div class="sn-cmp">
        <div class="best"><small>ベストの額 · 見込み</small><b>${C.bestBet} · ${Math.round(C.best)}</b></div>
        <div><small>あなたの額 · 見込み</small><b>${myBet} · ${Math.round(myEV)}</b></div>
        <div><small>ベストとくらべて</small><b>${pct}%</b></div>
      </div>
      <div class="sn-verdict ${correct ? 'good' : 'bad'}">${verdictText}${luck ? `<small>${luck}</small>` : ''}</div>`);
    api.coach(correct ? (ratio >= .97 ? 'ど真ん中！ さすがミミ' : 'いい狙い！ ほぼベスト') : `あちゃー、ベストは ${C.bestBet} だったね`, correct ? (ratio >= .97 ? 'win' : 'smug') : 'panic');
    if (correct) { api.sfx.good(); const r = $('.sn-verdict').getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height / 2, 14); }
    else api.sfx.nope();
    api.reveal(out, 'nearest');
    await api.wait(api.reduce ? 700 : 2200);
    if (!api.alive()) return;
    api.finish({
      correct, perfect, base: 20 + Math.round(Math.min(1, ratio) * 20),
      detail: `ベストは ${C.bestBet}（見込み ${Math.round(C.best)}）。あなたは ${myBet}（見込み ${Math.round(myEV)}＝ベストの${pct}%）。${luck ? luck + '。' : call ? `${api.char.jp}は付いてきた。` : `${api.char.jp}は降りた。`}`,
    });
  }

  MB.register({ id: 'sniper', group: 'logic', order: 4, title: '賭け額スナイパー', sub: 'LOGIC · 賭け額', isNew: true, chars: ['selina'], start });
})();
