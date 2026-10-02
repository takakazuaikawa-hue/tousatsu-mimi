// 論理：役づくりパズル（入門）
// 手札2枚＋場札5枚の7枚から5枚を選び、一番強い役を作る。選んでいる間、今の5枚の役名が帯に出る。
// 「これで勝負」→ 読みに賭ける → 7枚から作れる最強の5枚と比べる（同じ強さなら正解）。
// 遊ぶたびに段が1つ上がる（このページ内だけ覚える）。問題は乱数で作り、段ごとの条件に合うまで作り直す。
(() => {
  let played = 0;
  const COMBOS = [];
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) for (let d = c + 1; d < 7; d++) for (let e = d + 1; e < 7; e++) COMBOS.push([a, b, c, d, e]);
  // 役の強さ順の色（弱い＝くすんだ赤 → 強い＝金 → 白）
  const CAT_COLOR = ['#5e4b4d', '#7d2432', '#a01f35', '#c8253a', '#e0602e', '#d9b35a', '#f5d77a', '#fff3c2', '#ffffff'];
  const CAT_DESC = ['どれにも当てはまらない', '同じ数字2枚', 'ペアが2組', '同じ数字3枚', '数字が5つ連続', '同じマーク5枚', '3枚＋2枚', '同じ数字4枚', '同じマークで5つ連続'];
  const LV_NAME = ['', '入門', '中級', '上級'];

  // 5枚の役の中身：比べる順の数字の並び
  function sig(api, cards) {
    const s = api.score(cards), cat = Math.floor(s / 1e10);
    if (cat === 4 || cat === 8) return { cat, ranks: [s - cat * 1e10] };
    if (cat === 5 || cat === 0) return { cat, ranks: cards.map(c => c.r).sort((a, b) => b - a) };
    const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    return { cat, ranks: Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a), cnt };
  }
  function handName(api, cards) {
    const R = api.rn;
    if (cards.length < 5) {
      const cat = api.category(cards);
      if (!cat) return '';
      const s = sig(api, cards.concat()); // 途中の札でもペアなどは分かる
      return cat === 1 ? `${R(s.ranks[0])}のワンペア` : cat === 2 ? `${R(s.ranks[0])}と${R(s.ranks[1])}のツーペア` : cat === 3 ? `${R(s.ranks[0])}のスリーカード` : cat === 6 ? `${R(s.ranks[0])}と${R(s.ranks[1])}のフルハウス` : cat === 7 ? `${R(s.ranks[0])}のフォーカード` : api.CAT_NAME[cat];
    }
    const { cat, ranks } = sig(api, cards);
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
  // 同じ役どうしで、何で差がついたか（sa が強い側）
  function tieWhy(api, sa, sb) {
    const R = api.rn; const cat = sa.cat;
    let i = 0; while (i < sa.ranks.length && sa.ranks[i] === sb.ranks[i]) i++;
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
  function analyze(api, hole, board) {
    const all = hole.concat(board);
    const best = api.score(all);
    const cats = new Set(); const bests = [];
    for (const ix of COMBOS) { const s = api.score(ix.map(i => all[i])); cats.add(Math.floor(s / 1e10)); if (s === best) bests.push(ix); }
    const holeUse = bests.map(ix => ix.filter(i => i < 2).length);
    const suitCnt = {}; all.forEach(c => { suitCnt[c.s] = (suitCnt[c.s] || 0) + 1; });
    return { all, best, cat: Math.floor(best / 1e10), cats, bests, holeMin: Math.min(...holeUse), holeMax: Math.max(...holeUse), maxSuit: Math.max(...Object.values(suitCnt)) };
  }

  // 問題づくり：指定の札（数字と、決まっていればマーク）から7枚を作る。重なったら null
  function build(api, spec) {
    const used = new Set(), out = [];
    for (const x of spec) {
      let s = x.s;
      if (!s) {
        const opts = api.SUITS.filter(ss => !used.has(x.r + ss) && !(x.not || []).includes(ss));
        if (!opts.length) return null;
        s = api.pick(opts);
      }
      if (used.has(x.r + s)) return null;
      used.add(x.r + s); out.push({ r: x.r, s });
    }
    return out;
  }
  const ranksBut = (api, ban, n) => api.shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter(r => !ban.includes(r))).slice(0, n);
  // 7枚を手札2枚と場札5枚に分ける（holeIdx は 7枚の中の手札の位置）
  function split(api, cards, holeIdx) {
    const hole = holeIdx.map(i => cards[i]);
    const board = api.shuffle(cards.filter((c, i) => !holeIdx.includes(i)));
    return { hole: api.shuffle(hole), board };
  }
  const randHole = (api) => api.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 2);

  function makeProblem(api, level) {
    const R = (a, b) => a + api.rand(b - a + 1);
    for (let t = 0; t < 1500; t++) {
      let kind, deal = null, ok = () => false;
      if (level === 1) {
        kind = api.pick(['flush', 'trips']);
        if (kind === 'flush') {
          const S = api.pick(api.SUITS);
          const rs = ranksBut(api, [], 5);
          const cards = build(api, [...rs.map(r => ({ r, s: S })), { r: R(2, 14), not: [S] }, { r: R(2, 14), not: [S] }]);
          if (!cards) continue;
          deal = split(api, cards, api.rand(2) ? [0, 1] : [0, 5]);
          ok = (a) => a.cat === 5 && a.maxSuit === 5 && !a.cats.has(4) && a.holeMin >= 1;
        } else {
          const X = R(2, 14); const rs = ranksBut(api, [X], 4);
          const cards = build(api, [{ r: X }, { r: X }, { r: X }, ...rs.map(r => ({ r }))]);
          if (!cards) continue;
          deal = split(api, cards, api.rand(2) ? [0, 1] : [0, 3]);
          ok = (a) => a.cat === 3 && a.holeMin >= 1 && a.maxSuit < 5;
        }
      } else if (level === 2) {
        kind = api.pick(['wheel', 'straight', 'straight', 'board', 'board']);
        if (kind === 'wheel') {
          const extra = [api.pick([14, 2, 3, 4, 5, 9, 10, 11, 12, 13]), R(7, 13)];
          const cards = build(api, [14, 2, 3, 4, 5, ...extra].map(r => ({ r })));
          if (!cards) continue;
          deal = split(api, cards, [0, api.pick([1, 2, 3, 4, 5, 6])]);
          ok = (a) => a.best === 4e10 + 5 && (a.cats.has(1) || a.cats.has(2)) && a.holeMin >= 1;
        } else if (kind === 'straight') {
          const lo = R(2, 10); const run = [0, 1, 2, 3, 4].map(k => lo + k);
          const extra = [api.pick(run), R(2, 14)];
          const cards = build(api, [...run, ...extra].map(r => ({ r })));
          if (!cards) continue;
          deal = split(api, cards, [api.pick([0, 1, 2, 3]), api.pick([4, 5, 6])]);
          ok = (a) => a.cat === 4 && a.best === 4e10 + lo + 4 && a.cats.has(1) && a.holeMin >= 1;
        } else {
          const v = api.pick(['twopair', 'twopair', 'flush', 'straight']);
          let spec;
          if (v === 'twopair') { const [x, y] = ranksBut(api, [14, 13, 2], 2).sort((a, b) => b - a); const z = R(2, y - 1); spec = [{ r: x }, { r: x }, { r: y }, { r: y }, { r: api.pick([14, 13]) }, { r: z }, { r: z }]; }
          else if (v === 'flush') { const S = api.pick(api.SUITS); const rs = ranksBut(api, [], 5); const z = R(2, 13); spec = [...rs.map(r => ({ r, s: S })), { r: z, not: [S] }, { r: z, not: [S] }]; }
          else { const lo = R(3, 10); const z = R(2, 14); spec = [0, 1, 2, 3, 4].map(k => ({ r: lo + k })).concat([{ r: z }, { r: z }]); }
          const cards = build(api, spec);
          if (!cards) continue;
          deal = { hole: [cards[5], cards[6]], board: api.shuffle(cards.slice(0, 5)) };
          ok = (a) => a.holeMin === 0 && a.cat >= 2 && a.cat <= 5;
        }
      } else {
        kind = api.pick(['flushStraight', 'flushStraight', 'flushTrips', 'fullChoice', 'fullChoice', 'straightTrips', 'six']);
        let spec;
        if (kind === 'flushStraight') {
          const lo = R(2, 10); const S = api.pick(api.SUITS); const run = [0, 1, 2, 3, 4].map(k => lo + k);
          const inS = api.shuffle([0, 1, 2, 3, 4]).slice(0, 3);
          const ex = ranksBut(api, run, 2);
          spec = [...run.map((r, k) => (inS.includes(k) ? { r, s: S } : { r, not: [S] })), ...ex.map(r => ({ r, s: S }))];
        } else if (kind === 'flushTrips') {
          const S = api.pick(api.SUITS); const rs = ranksBut(api, [], 5); const X = api.pick(rs);
          spec = [...rs.map(r => ({ r, s: S })), { r: X, not: [S] }, { r: X, not: [S] }];
        } else if (kind === 'fullChoice') {
          const [x, y, z] = ranksBut(api, [], 3);
          spec = api.rand(2) ? [x, x, x, y, y, z, z].map(r => ({ r })) : [x, x, x, y, y, y, R(2, 14)].map(r => ({ r }));
        } else if (kind === 'straightTrips') {
          const lo = R(2, 10); const run = [0, 1, 2, 3, 4].map(k => lo + k); const X = api.pick(run);
          spec = [...run, X, X].map(r => ({ r }));
        } else {
          if (api.rand(2)) { const S = api.pick(api.SUITS); const rs = ranksBut(api, [], 6); spec = [...rs.map(r => ({ r, s: S })), { r: api.pick(rs), not: [S] }]; }
          else { const lo = R(2, 9); spec = [0, 1, 2, 3, 4, 5].map(k => ({ r: lo + k })).concat([{ r: R(2, 14) }]); }
        }
        const cards = build(api, spec);
        if (!cards) continue;
        deal = split(api, cards, randHole(api));
        ok = (a) => {
          if (a.holeMax < 1) return false;
          if (kind === 'flushStraight') return a.cat === 5 && a.cats.has(4);
          if (kind === 'flushTrips') return a.cat === 5 && a.cats.has(3);
          if (kind === 'fullChoice') return a.cat === 6;
          if (kind === 'straightTrips') return a.cat === 4 && a.cats.has(3);
          return (a.cat === 5 && a.maxSuit >= 6) || (a.cat === 4 && a.cats.size > 1);
        };
      }
      const a = analyze(api, deal.hole, deal.board);
      if (ok(a)) return { ...deal, a, kind };
    }
    const d = api.shuffle(api.deck());
    const hole = d.slice(0, 2), board = d.slice(2, 7);
    return { hole, board, a: analyze(api, hole, board), kind: 'random' };
  }

  async function start({ api }) {
    played++;
    const level = Math.min(3, played);
    const base = level * 15;
    const P = makeProblem(api, level);
    const { hole, board, a } = P;
    const all = a.all;
    const opp = api.charId;
    api.say(opp === 'rico' ? `${LV_NAME[level]}の問題。7枚から一番強いの、見せてみな` : level === 1 ? 'ボクの出す問題、解けるかな？' : level === 2 ? 'ふふーん、今度のはちょっと意地悪だよ' : 'これが解けたら、ボクの負けでいいよ……！', opp === 'rico' ? 'think' : level === 3 ? 'think' : 'smug');
    api.bet(base);

    api.css('handbuild', `
      .hb-head { display: flex; align-items: center; justify-content: center; gap: 10px 16px; flex-wrap: wrap; position: relative; }
      .hb-lv { display: inline-flex; align-items: center; gap: 8px; }
      .hb-lv b { font-family: var(--disp); font-weight: 400; letter-spacing: .12em; font-size: 17px; color: #1d080e; background: linear-gradient(90deg, var(--gold-hi), var(--gold)); padding: 1px 14px 0; transform: skewX(-12deg); display: inline-block; }
      .hb-lv i { width: 16px; height: 8px; transform: skewX(-12deg); background: rgba(255,255,255,.12); border: 1px solid rgba(217,179,90,.5); display: inline-block; }
      .hb-lv i.on { background: var(--gold-hi); box-shadow: 0 0 8px rgba(245,215,122,.8); }
      .hb-ref { position: relative; }
      .hb-ref summary { list-style: none; cursor: pointer; font-size: 12px; font-weight: 700; color: var(--dim); padding: 3px 12px; border: 1px solid var(--faint); background: rgba(0,0,0,.3); transform: skewX(-12deg); }
      .hb-ref summary > span { display: inline-block; transform: skewX(12deg); }
      .hb-ref summary::-webkit-details-marker { display: none; }
      .hb-ref[open] summary { color: var(--gold-hi); border-color: var(--gold); }
      .hb-ref ol { position: absolute; right: 0; top: calc(100% + 6px); z-index: 8; margin: 0; padding: 8px 10px; list-style: none; width: min(300px, calc(100vw - 48px)); background: rgba(20,6,10,.97); border: 1px solid var(--gold); box-shadow: 0 12px 30px rgba(0,0,0,.6); display: grid; gap: 3px; }
      .hb-ref li { display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center; font-size: 12px; }
      .hb-ref li i { width: 10px; height: 10px; transform: skewX(-12deg); }
      .hb-ref li b { font-weight: 900; } .hb-ref li span { color: var(--dim); font-size: 11px; }
      .hb-ref .hb-arrow { font-family: var(--disp); letter-spacing: .14em; color: var(--gold); font-size: 11px; text-align: center; }
      .hb-deal { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-end; gap: 8px 26px; }
      .hb-grp { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .hb-cards { display: flex; gap: 6px; }
      .hb-deal .card { cursor: pointer; }
      .hb-deal .card.hb-ghost { opacity: .25; transform: scale(.92); border: 2px dashed var(--gold); box-shadow: none; }
      .hb-deal.is-cue .card:not(.hb-ghost) { animation: mb-hbCue 1.5s ease-in-out infinite; }
      .hb-deal.is-locked .card { cursor: default; }
      .hb-deal .card.hint:not(.hb-ghost) { animation: mb-hintPulse 1s ease-in-out infinite; border-color: var(--gold-hi); }
      @keyframes mb-hbCue { 50% { box-shadow: 0 0 0 2px rgba(245,215,122,.85), 0 0 18px rgba(245,215,122,.55); } }
      .hb-tray { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 14px 20px; margin: 0 auto; }
      .hb-tray::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: linear-gradient(180deg, rgba(0,0,0,.5), rgba(40,8,16,.6)); border: 1px solid rgba(217,179,90,.45); }
      .hb-slots { display: flex; gap: 8px; }
      .hb-slot { --w: 62px; position: relative; width: calc(var(--w) + 4px); height: calc(var(--w) * 1.4 + 4px); border: 2px dashed rgba(217,179,90,.35); border-radius: 7px; display: grid; place-items: center; }
      .hb-slot > .card { position: absolute; left: 0; top: 0; --w: 62px; cursor: pointer; }
      .hb-slot.full { border-style: solid; border-color: rgba(245,215,122,.55); }
      .hb-slot:empty::after { content: attr(data-n); font-family: var(--disp); font-size: 22px; color: rgba(217,179,90,.3); }
      .hb-slot .hb-tag { position: absolute; left: -6px; right: -6px; bottom: -17px; text-align: center; font-size: 10px; font-weight: 700; color: var(--dim); white-space: nowrap; }
      .hb-snap { animation: mb-hbSnap .3s cubic-bezier(.2,1.8,.4,1); }
      @keyframes mb-hbSnap { from { transform: translateY(-30px) scale(1.2) rotate(-6deg); } 60% { transform: translateY(3px) scale(.95); } }
      .hb-band { --c: #5e4b4d; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 14px; width: min(560px, 100%); margin: 0 auto; padding: 8px 18px; position: relative; isolation: isolate; transition: color .2s; }
      .hb-band::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: linear-gradient(90deg, var(--c), rgba(0,0,0,.55) 85%); border: 1px solid var(--c); box-shadow: 0 0 18px color-mix(in srgb, var(--c) 45%, transparent); transition: background .25s, box-shadow .25s; }
      .hb-meter { display: flex; align-items: flex-end; gap: 3px; height: 30px; }
      .hb-meter i { width: 7px; transform: skewX(-12deg); background: rgba(255,255,255,.12); transition: background .2s; }
      .hb-meter i.on { background: var(--c); box-shadow: 0 0 6px var(--c); }
      .hb-bname { font-family: var(--mincho); font-weight: 800; font-size: clamp(17px, 2.6vw, 22px); line-height: 1.2; text-shadow: 0 2px 0 rgba(0,0,0,.45); }
      .hb-bname small { display: block; font-family: var(--sans); font-weight: 700; font-size: 11px; color: var(--dim); text-shadow: none; letter-spacing: .04em; }
      .hb-band.is-light .hb-bname { color: #fff; }
      .hb-band.hb-bump { animation: mb-hbBump .35s cubic-bezier(.2,1.6,.4,1); }
      @keyframes mb-hbBump { 40% { transform: scale(1.05); } }
      .hb-verdict { text-align: center; font-weight: 900; font-size: 15px; min-height: 1.6em; text-wrap: balance; }
      .hb-verdict.good { color: var(--good); font-family: var(--mincho); font-size: 20px; }
      .hb-verdict.bad { color: var(--bad); }
      .hb-verdict b { color: var(--gold-hi); }
      .hb-go.is-cue::before { animation: mb-hbGo 1.1s ease-in-out infinite; }
      @keyframes mb-hbGo { 50% { box-shadow: 0 0 0 3px rgba(245,215,122,.6), 0 0 24px rgba(245,215,122,.7); } }
      .hb-react { position: absolute; z-index: 6; right: -6px; bottom: 56px; width: 230px; height: 190px; pointer-events: none; animation: mb-hbIn .4s cubic-bezier(.2,1.3,.3,1) both; }
      .hb-react::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 58%; transform: skewX(-12deg); background: linear-gradient(90deg, #7d1022, var(--red)); border-block: 2px solid var(--gold-hi); box-shadow: 0 10px 24px rgba(0,0,0,.55); }
      .hb-react img { position: absolute; bottom: 0; left: 50%; height: 100%; transform: translateX(-50%); filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }
      .hb-react b { position: absolute; left: 12px; bottom: 6px; font-family: var(--disp); font-weight: 400; font-size: 34px; line-height: 1; color: #fff; letter-spacing: .06em; text-shadow: 0 3px 0 rgba(0,0,0,.5); }
      .hb-react.out { animation: mb-hbOut .3s ease forwards; }
      @keyframes mb-hbIn { from { transform: translateX(110%); } }
      @keyframes mb-hbOut { to { transform: translateX(110%); opacity: 0; } }
      @media (max-width: 560px) {
        .hb-slot, .hb-slot > .card { --w: 46px; }
        .hb-slots { gap: 6px; }
        .hb-deal { gap: 6px 14px; }
        .hb-band { padding: 6px 12px; gap: 10px; }
        .hb-meter { height: 24px; } .hb-meter i { width: 5px; }
        .hb-react { width: 170px; height: 140px; bottom: 60px; }
        .hb-react b { font-size: 26px; }
      }
    `);

    const root = api.root;
    const refList = [8, 7, 6, 5, 4, 3, 2, 1, 0].map(c => `<li><i style="background:${CAT_COLOR[c]}"></i><b>${api.CAT_NAME[c]}</b><span>${CAT_DESC[c]}</span></li>`).join('');
    const pips = [1, 2, 3].map(n => `<i class="${n <= level ? 'on' : ''}"></i>`).join('');
    root.innerHTML = `
      <div id="mb-hb-steps">${api.steps(['5枚を選ぶ', '読みを賭ける', '答え合わせ'], 0)}</div>
      <div class="hb-head">
        <span class="hb-lv"><b>STAGE ${level} · ${LV_NAME[level]}</b>${pips}</span>
        <details class="hb-ref"><summary><span>役の強さ順 ▾</span></summary><ol><li class="hb-arrow" style="display:block">STRONG ▲</li>${refList}<li class="hb-arrow" style="display:block">▼ WEAK</li></ol></details>
      </div>
      <div class="hb-deal is-cue" id="mb-hb-deal">
        <div class="hb-grp"><span class="zone-label">HAND · 手札</span><div class="hb-cards" data-from="0"></div></div>
        <div class="hb-grp"><span class="zone-label">BOARD · 場札</span><div class="hb-cards" data-from="2"></div></div>
      </div>
      <div class="hb-tray"><span class="zone-label">YOUR 5 · 選んだ5枚</span><div class="hb-slots" id="mb-hb-slots"></div></div>
      <div class="hb-band" id="mb-hb-band"><div class="hb-meter">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => `<i style="height:${30 + k * 8.75}%"></i>`).join('')}</div><div class="hb-bname" id="mb-hb-bname"></div></div>
      <div class="hb-verdict" id="mb-hb-verdict"></div>
      <div class="actions"><button class="btn gold hb-go" id="mb-hb-go" disabled>これで勝負<small>5枚そろったら押せる</small></button></div>`;
    api.coach('7枚から5枚を選んで、一番強い役を作って', 'think');

    const deal = root.querySelector('#mb-hb-deal');
    const slotsEl = root.querySelector('#mb-hb-slots');
    const band = root.querySelector('#mb-hb-band');
    const bname = root.querySelector('#mb-hb-bname');
    const verdict = root.querySelector('#mb-hb-verdict');
    const goBtn = root.querySelector('#mb-hb-go');
    let sel = [];
    let locked = false;
    let lastCat = -1;
    let tipped = false;
    // 段階つきの助け：札を触った回数が12回で最強の札を光らせ、24回で5枚を入れてあげる（そのときは満点にしない）
    let touches = 0, assisted = false;
    const hintSet = new Set();

    const drawDeal = (mark = {}) => {
      deal.querySelectorAll('.hb-cards').forEach(box => {
        const from = +box.dataset.from, n = from === 0 ? 2 : 5;
        box.innerHTML = all.slice(from, from + n).map((c, k) => {
          const i = from + k;
          const cls = ['big', mark[i] || (sel.includes(i) ? 'hb-ghost' : hintSet.has(i) ? 'hint' : '')].join(' ');
          return api.cardHTML(c, cls).replace('<span class="card', `<span data-i="${i}" role="button" tabindex="0" class="card`);
        }).join('');
      });
    };
    // 役に入っている札と「おまけ」の札を分ける
    const kickerIdx = (cards) => {
      if (cards.length < 5) return [];
      const cat = api.category(cards);
      if (![1, 2, 3, 7].includes(cat)) return [];
      const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
      return cards.map((c, k) => (cnt[c.r] === 1 ? k : -1)).filter(k => k >= 0);
    };
    const drawSlots = (snapIdx = -1, mark = {}) => {
      const cards = sel.map(i => all[i]);
      const kick = kickerIdx(cards);
      slotsEl.innerHTML = [0, 1, 2, 3, 4].map(k => {
        if (k >= sel.length) return `<span class="hb-slot" data-n="${k + 1}"></span>`;
        const i = sel[k];
        const cls = [k === snapIdx ? 'hb-snap' : '', mark[i] || ''].join(' ');
        return `<span class="hb-slot full" data-n="${k + 1}">${api.cardHTML(all[i], cls).replace('<span class="card', `<span data-i="${i}" role="button" tabindex="0" class="card`)}${kick.includes(k) ? '<span class="hb-tag">おまけ</span>' : ''}</span>`;
      }).join('');
    };
    const setBand = (cards, prefix = '') => {
      let cat = 0, name, sub;
      if (cards.length === 5) { cat = api.category(cards); name = handName(api, cards); sub = prefix || `いまの5枚 · ${CAT_DESC[cat]}`; }
      else if (cards.length === 0) { name = 'まだ選んでいない'; sub = '札を押すと下の枠に入る'; }
      else { cat = api.category(cards); name = handName(api, cards) || '役なし'; sub = `あと${5 - cards.length}枚`; }
      band.style.setProperty('--c', CAT_COLOR[cat]);
      band.querySelectorAll('.hb-meter i').forEach((m, k) => m.classList.toggle('on', k <= cat && (cards.length > 0)));
      bname.innerHTML = `${name}<small>${sub}</small>`;
      if (cat !== lastCat && cards.length) { band.classList.remove('hb-bump'); void band.offsetWidth; band.classList.add('hb-bump'); }
      lastCat = cat;
    };
    const refresh = (snapIdx) => {
      drawDeal(); drawSlots(snapIdx); setBand(sel.map(i => all[i]));
      goBtn.disabled = sel.length !== 5;
      goBtn.classList.toggle('is-cue', sel.length === 5);
      deal.classList.toggle('is-cue', sel.length < 5 && !hintSet.size);
      goBtn.querySelector('small').textContent = sel.length === 5 ? `${handName(api, sel.map(i => all[i]))}で勝負` : `あと${5 - sel.length}枚選ぶ`;
    };
    const helpCheck = () => {
      touches++;
      if (touches === 12 && !hintSet.size) {
        a.bests[0].forEach(i => hintSet.add(i)); refresh(-1);
        api.coach('迷ったら、光っている札が<b>最強の組み合わせ</b>のヒント', 'think');
      } else if (touches === 24 && !assisted) {
        assisted = true; sel = a.bests[0].slice(); hintSet.clear(); refresh(-1);
        api.coach('答えの5枚を入れたよ。「これで勝負」を押してみよ（ヒントあり）', 'think');
      }
    };
    const toggle = (i) => {
      if (locked) return;
      if (assisted) { api.sfx.tick(); api.coach('答えの5枚を入れてあるよ。「これで勝負」を押してね', 'think'); return; } // 助けで入れた後は、迷わず進めるよう札を固定
      toggle1(i); helpCheck();
    };
    const toggle1 = (i) => {
      if (sel.includes(i)) { sel = sel.filter(x => x !== i); api.sfx.tick(); refresh(-1); return; }
      if (sel.length >= 5) { api.sfx.nope(); const s = slotsEl; s.classList.remove('nope'); void s.offsetWidth; s.classList.add('nope'); api.coach('5枠がいっぱい。入っている札を押すと外せるよ', 'panic'); return; }
      sel.push(i); api.sfx.tap(); refresh(sel.length - 1);
      if (!tipped) {
        tipped = true;
        api.coach(level === 1 ? '役に入らない「おまけ」の札は、大きい数字ほど強いよ' : level === 2 ? '手札を使わなくてもいい。7枚全部から考えて' : '役が2つ以上できる形。<b>役の強さ順</b>で上の方を');
      }
    };
    const onPick = (e) => {
      const c = e.target.closest('.card[data-i]'); if (!c) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();
      toggle(+c.dataset.i);
    };
    deal.addEventListener('click', onPick); slotsEl.addEventListener('click', onPick);
    deal.addEventListener('keydown', onPick); slotsEl.addEventListener('keydown', onPick);
    refresh(-1);

    await new Promise(res => { goBtn.onclick = () => { if (sel.length === 5) res(); }; });
    if (!api.alive()) return;
    locked = true; api.sfx.tap();
    deal.classList.remove('is-cue'); deal.classList.add('is-locked');
    goBtn.closest('.actions').hidden = true;
    root.querySelector('#mb-hb-steps').innerHTML = api.steps(['5枚を選ぶ', '読みを賭ける', '答え合わせ'], 1);
    const mine = sel.map(i => all[i]);
    const myScore = api.score(mine);
    api.coach(`「${handName(api, mine)}」が最強だと読んだ。自信は？`);
    await api.wager({ question: 'これが最強の5枚？', base });
    if (!api.alive()) return;
    root.querySelector('#mb-hb-steps').innerHTML = api.steps(['5枚を選ぶ', '読みを賭ける', '答え合わせ'], 2);

    // ためてから答え合わせ：7枚から作れる最強の5枚を1枚ずつ光らせる
    const bestIx = a.bests.slice().sort((x, y) => y.filter(i => sel.includes(i)).length - x.filter(i => sel.includes(i)).length)[0];
    const bestCards = bestIx.map(i => all[i]);
    const correct = myScore === a.best;
    api.coach('7枚から作れる、一番強い5枚は……', 'think'); api.emote('think'); api.sfx.drum();
    const dimMark = {}; all.forEach((c, i) => { dimMark[i] = 'dim'; });
    drawDeal(dimMark);
    await api.wait(api.reduce ? 200 : 950);
    if (!api.alive()) return;
    const lit = { ...dimMark };
    for (const i of bestIx) {
      lit[i] = 'glow';
      drawDeal(lit);
      const el = deal.querySelector(`.card[data-i="${i}"]`); if (el && !api.reduce) el.classList.add('hb-snap');
      api.sfx.tick();
      await api.wait(api.reduce ? 40 : 230);
      if (!api.alive()) return;
    }
    setBand(bestCards, '7枚から作れる最強');
    bname.insertAdjacentHTML('afterbegin', '<small style="color:var(--gold-hi)">BEST · 最強</small>');
    await api.wait(api.reduce ? 100 : 450);
    if (!api.alive()) return;

    const slotMark = {};
    sel.forEach(i => { slotMark[i] = correct ? 'glow' : bestIx.includes(i) ? '' : 'danger'; });
    drawSlots(-1, slotMark);
    let reason = '';
    if (correct) {
      verdict.className = 'hb-verdict good';
      const same = bestIx.every(i => sel.includes(i));
      verdict.innerHTML = same ? 'ぴったり最強の5枚！' : `最強と同じ強さ！（${handName(api, mine)}）`;
      api.sfx.good();
      api.say(opp === 'rico' ? 'やるじゃん。見る目あるね' : 'えぇっ、解かれちゃった……！', opp === 'rico' ? 'smug' : 'panic');
      api.coach('ぴったり！ さすがミミ', 'win');
    } else {
      const sb = sig(api, bestCards), sm = sig(api, mine);
      reason = sb.cat !== sm.cat ? `${api.CAT_NAME[sb.cat]}＞${api.CAT_NAME[sm.cat]}（${api.CAT_NAME[sb.cat]}は${CAT_DESC[sb.cat]}）` : tieWhy(api, sb, sm);
      verdict.className = 'hb-verdict bad';
      verdict.innerHTML = `こっちの方が強い：<b>${reason}</b>`;
      api.sfx.nope();
      api.say(opp === 'rico' ? 'おしい。光ってる5枚を見てみな' : 'へへーん、光ってる方が強いんだよ', 'smug');
      api.coach('あちゃー、光ってる5枚をよく見てね', 'panic');
    }
    // ミミの反応（上半身を枠からはみ出させるカットイン）
    const cut = document.createElement('div');
    cut.className = 'hb-react';
    cut.innerHTML = `<img src="${correct ? api.MIMI.win : api.MIMI.shock}" alt=""><b>${correct ? 'NICE!' : 'OOPS…'}</b>`;
    root.appendChild(cut);
    if (correct) { const r = verdict.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height / 2, 16); }
    await api.wait(api.reduce ? 600 : correct ? 1500 : 2300);
    if (!api.alive()) return;
    cut.classList.add('out');
    await api.wait(250);
    if (!api.alive()) return;
    const bestName = handName(api, bestCards);
    api.finish({
      correct,
      perfect: correct && api.mult === 3 && level === 3 && !assisted,
      base,
      detail: correct
        ? `7枚の最強は「${bestName}」。あなたの5枚も同じ強さ。（STAGE ${level}）`
        : `7枚の最強は「${bestName}」。${reason}。あなたは「${handName(api, mine)}」だった。`,
      nextHint: level < 3 ? `次は STAGE ${level + 1}（${LV_NAME[level + 1]}）` : 'STAGE 3 をもう一回',
    });
  }

  MB.register({ id: 'handbuild', group: 'logic', order: 1, title: '役づくりパズル', sub: 'LOGIC · 入門', isNew: true, chars: ['polka', 'rico'], start });
})();
