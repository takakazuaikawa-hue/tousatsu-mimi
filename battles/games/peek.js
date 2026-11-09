// 論理：見えちゃった札（ほろ酔いの夜だけ）2026-11-09
// 酔った相手が札を見る仕草で、伏せ札の一部が見えた。見えた札と合わない役は、もう作れない。
//   1問目：役の札（容疑者しぼりと同じ分け方・4枚）から「見えた札では作れなくなった役」を全部タップ。その場で○×。
//   2問目：残った役の「危ない／負けない」を見て、見えた札と矛盾しない相手の手だけで数えた「ミミが勝つ見込み」を、払う額の線とくらべて決める。
// 作りは容疑者しぼり（narrow.js）に合わせる。ミミの手札の2枚は出さない。相手の本当の手は答え合わせまで出さない（見えた札だけ出す）。
// 答え合わせは手の決着の後（verdict.js、kind:'logic'）。正解＝見えた札で数えた見込みと線を比べた判断（隠れた札の運で減点しない）。
(() => {
  const STAKES = [0, 1, 3];
  // 見え方（相手ごと）。kind: rank＝数字だけ・suit＝マークだけ・card＝1枚まるごと。items の1つが、相手の別々の1枚に当たる
  const SEE = { polka: ['suit', 'rank'], selina: ['rank'], grano: ['suit'], rico: ['rank'], velvet: ['card'] };
  const ACTN = { check: '様子見', call: '付いてきた', bet: '賭けた', raise: '上乗せした', allin: '全部賭けた' };
  const PH = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };
  // 答え合わせの相手の一言（b＝相手が弱かった・s＝強かった／c＝ミミの判断が当たり・w＝外れ）。酔った人物に合わせる
  const END = {
    polka: { bc: 'うぅ……バレてたぁ……ぐすっ', bw: 'あはは！ 降りちゃったぁ、ボクの勝ち〜！ ひっく', sc: 'うわぁぁん、逃げられたぁ……', sw: 'えへへ〜、ほんとに強かったでしょ〜！' },
    selina: { bc: '……眼鏡さえあれば、隠せたのに', bw: '……降りてくれて、助かったわ', sc: '……賢明ね。今夜は褒めるわ', sw: '……だから言ったでしょう' },
    grano: { bc: 'はっはっは、見抜かれましたな！ 良いお目をしておられる', bw: 'ほう、降りますか。良い買い物を逃しましたな', sc: 'いやあ残念、商売あがったりですな', sw: 'どうです、本物の品でしょう！' },
    rico: { bc: 'えへへ、ミミ成長したねえ〜', bw: 'えへへ、降りちゃった〜？', sc: 'ん〜、ちゃんと逃げたね、えらいえらい〜', sw: 'ほら〜、アタシ強かったでしょ〜' },
    velvet: { bc: 'ふふ……読まれちゃった♡', bw: 'あら、降りちゃうの？ ざんねん♡', sc: 'ふふ、賢い子ね♡', sw: 'ほら、言ったでしょ？ 本物なの♡' },
  };

  function pairRank(cards) {
    const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    return Math.max(...Object.keys(cnt).filter(r => cnt[r] >= 2).map(Number));
  }
  // 役の札：役の種類で分ける。ミミと同じ役の時だけ「ミミより上／下」に分ける（narrow.js の tileOf と同じ）
  function tileOf(M, h, board, me) {
    const cards = h.concat(board), cat = M.category(cards);
    const name = M.CAT_NAME[cat].replace('ストレートフラッシュ', 'ストレート|フラッシュ').replace('ロイヤルストレート', 'ロイヤル|ストレート');
    if (cat !== me.cat) return { key: 'c' + cat, name, danger: cat > me.cat };
    if (cat === 1) {
      const r = pairRank(cards);
      if (r > me.pr) return { key: 'p+', name: `${M.rn(me.pr)}より|大きいペア`, danger: true };
      if (r < me.pr) return { key: 'p-', name: `${M.rn(me.pr)}より|小さいペア`, danger: false };
      return M.score(cards) > me.score ? { key: 'p=+', name: `${M.rn(me.pr)}のペア・|残りの札は|相手が上`, danger: true } : { key: 'p=-', name: `${M.rn(me.pr)}のペア・|残りの札は|ミミが上`, danger: false };
    }
    const s = M.score(cards);
    if (cat === 0) return s > me.score ? { key: 's+', name: '役なし|（ミミより|大きい札）', danger: true } : { key: 's-', name: '役なし|（ミミより|小さい札）', danger: false };
    return s > me.score ? { key: 's+', name: `ミミより上の|${name}`, danger: true } : { key: 's-', name: `ミミと同じか|下の|${name}`, danger: false };
  }
  function survey(M, board, mine) {
    const seven = mine.concat(board);
    const me = { cat: M.category(seven), score: M.score(seven) };
    if (me.cat === 1) me.pr = pairRank(seven);
    const used = new Set(seven.map(M.key));
    const rest = M.deck().filter(c => !used.has(M.key(c)));
    const T = {};
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
      const h = [rest[i], rest[j]], t = tileOf(M, h, board, me);
      const o = T[t.key] || (T[t.key] = { ...t, n: 0, hands: [] });
      o.n++; o.hands.push(h);
    }
    return { me, tiles: T };
  }

  // 見え方の候補（どの1枚が見えるか）。相手の本当の札から作る
  function configs(who, her) {
    const kinds = SEE[who] || SEE.selina;
    if (kinds.length === 1) return [0, 1].map(i => ({ items: [{ kind: kinds[0], c: her[i] }] }));
    return [[0, 1], [1, 0]].map(p => ({ items: kinds.map((k, n) => ({ kind: k, c: her[p[n]] })) }));
  }
  const fits = (it, c) => it.kind === 'card' ? (c.r === it.c.r && c.s === it.c.s) : it.kind === 'rank' ? c.r === it.c.r : c.s === it.c.s;
  // 見えた札と矛盾しない相手の手か（見えた1つ1つは、相手の別々の1枚に当たる）
  function consistent(items, h) {
    if (items.length === 1) return h.some(c => fits(items[0], c));
    return (fits(items[0], h[0]) && fits(items[1], h[1])) || (fits(items[0], h[1]) && fits(items[1], h[0]));
  }
  // 並べる4枚：消える役（多くて2つ）＋残る役（危ないと負けない、必ず両方）。相手の本当の役は必ず入れる
  function pickTiles(imps, poss, herKey) {
    const impPick = imps.slice().sort((a, b) => b.t.n - a.t.n).slice(0, 2);
    const slots = 4 - impPick.length;
    const byN = (a, b) => b.cons.length - a.cons.length;
    const d = poss.filter(x => x.t.danger).sort(byN), s = poss.filter(x => !x.t.danger).sort(byN);
    const pick = [d[0], s[0]];
    const rest = [...d.slice(1), ...s.slice(1)].sort(byN);
    while (pick.length < slots && rest.length) pick.push(rest.shift());
    const her = herKey && poss.find(x => x.t.key === herKey);
    if (her && !pick.includes(her)) {
      if (pick.length < slots) pick.push(her);
      else {
        // 同じ側の一番少ない札と替える（危ない側・負けない側は1枚ずつ必ず残る）
        const sameSide = pick.filter(x => x.t.danger === her.t.danger);
        pick[pick.indexOf(sameSide[sameSide.length - 1])] = her;
      }
    }
    return [...impPick, ...pick];
  }
  // 出せる見え方を全部返す（無ければ空）。条件：作れなくなる役が1つ以上・残った役に危ない役と負けない役の両方
  function plans(M, board, mine, her, who) {
    const S = survey(M, board, mine);
    const herKey = tileOf(M, her, board, S.me).key;
    const all = Object.values(S.tiles);
    const out = [];
    for (const cfg of configs(who, her)) {
      const rows = all.map(t => ({ t, cons: t.hands.filter(h => consistent(cfg.items, h)) }));
      const imps = rows.filter(r => !r.cons.length), poss = rows.filter(r => r.cons.length);
      if (!imps.length || !poss.some(r => r.t.danger) || !poss.some(r => !r.t.danger)) continue;
      out.push({ cfg, rows, imps, poss, tiles: pickTiles(imps, poss, herKey), herKey, S, consAll: poss.flatMap(r => r.cons) });
    }
    return out;
  }

  // ミミの役を作っている札（光らせる札）・役の名前（narrow.js と同じ）
  function coreCards(M, seven) {
    const cat = M.category(seven);
    const cnt = {}; seven.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    if ([1, 2, 3, 6, 7].includes(cat)) return seven.filter(c => cnt[c.r] >= 2);
    if (cat === 5 || cat === 8) {
      const sc = {}; seven.forEach(c => { sc[c.s] = (sc[c.s] || 0) + 1; });
      const S = Object.keys(sc).find(k => sc[k] >= 5);
      return seven.filter(c => c.s === S).sort((a, b) => b.r - a.r).slice(0, 5);
    }
    if (cat === 4) {
      const top = M.score(seven) - 4e10, lo = top === 5 ? 1 : top - 4, out = [];
      for (let r = lo; r <= top; r++) { const c = seven.find(x => x.r === r || (r === 1 && x.r === 14)); if (c) out.push(c); }
      return out;
    }
    return [seven.slice().sort((a, b) => b.r - a.r)[0]];
  }
  function roleName(M, seven) {
    const cat = M.category(seven);
    const cnt = {}; seven.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    const rs = (k) => Object.keys(cnt).filter(r => cnt[r] >= k).map(Number).sort((a, b) => b - a);
    if (cat === 1) return `${M.rn(rs(2)[0])}のワンペア`;
    if (cat === 2) return `${M.rn(rs(2)[0])}と${M.rn(rs(2)[1])}のツーペア`;
    if (cat === 3) return `${M.rn(rs(3)[0])}のスリーカード`;
    if (cat === 0) return `役なし（${M.rn(rs(1)[0])}が一番上）`;
    return M.CAT_NAME[cat];
  }

  const wb = (t) => t.split('|').join('<wbr>');
  const plain = (t) => t.split('|').join('');
  const kw = (t) => `<span class="nq-k">${wb(t)}</span>`;
  const CSS = `
    .pk-sep { display: inline-block; width: 2px; align-self: stretch; margin: 0 4px; background: var(--gold); opacity: .6; }
    .nq-play { display: flex; flex-direction: column; min-height: 0; gap: 6px; }
    .nq-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 8px; flex: 1 1 auto; min-height: 0; }
    .nq-tile { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; padding: 6px 10px; min-height: 0; cursor: pointer; border: 1px solid var(--line); background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); color: var(--text); text-align: center; transition: border-color .2s, background .2s, opacity .2s; }
    .nq-tile .nm { font-family: var(--mincho); font-weight: 800; line-height: 1.25; color: var(--gold-hi); word-break: keep-all; }
    .nq-tile .ex { display: flex; align-items: center; gap: 4px; }
    .nq-tile .ex small { color: var(--dim); margin-right: 2px; }
    .nq-tile[disabled] { cursor: default; }
    .nq-tile .st { white-space: nowrap; position: absolute; right: 6px; top: 4px; font-family: var(--mincho); font-weight: 900; line-height: 1.2; padding: 1px 8px; border: 1px solid currentColor; background: rgba(19,4,6,.85); }
    .nq-tile.is-danger { border-color: #d24a5a; background: linear-gradient(180deg, #4a0f18, #26070c); box-shadow: inset 0 0 0 1px rgba(210,74,90,.45); }
    .nq-tile.is-danger .st { color: #ff8f9c; }
    .nq-tile.is-safe .st { color: var(--gold-pale); }
    .nq-tile.is-miss { animation: nq-shake .35s; }
    .nq-tile.is-safe { opacity: .8; }
    .nq-tile.is-gone { opacity: .5; border-style: dashed; }
    .nq-tile.is-gone .nm { text-decoration: line-through; color: var(--dim); }
    .nq-tile.is-gone .st { color: var(--gold-pale); }
    .nq-tile.is-left .st { color: var(--text); }
    .nq-tiles.is-q2 .nq-tile { opacity: 1; cursor: default; }
    .nq-tiles.is-q2 .nq-tile.is-gone { opacity: .5; }
    @keyframes nq-shake { 0%,100% { transform: none; } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .nq-k { word-break: keep-all; }
    .nq-sit { display: flex; flex-direction: column; gap: 4px; }
    .nq-cap { font-family: var(--mincho); font-weight: 700; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .nq-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .nq-row .card:not(.glow) { opacity: .55; }
    .nq-me { font-family: var(--mincho); font-weight: 800; line-height: 1.3; color: var(--gold-hi); }
    .nq-me small { color: var(--gold-pale); font-weight: 700; margin-left: 4px; }
    .nq-her { display: flex; flex-direction: column; gap: 3px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mincho); line-height: 1.35; }
    .nq-her .sp { color: var(--gold-hi); font-weight: 800; word-break: keep-all; }
    .pk-see { display: flex; align-items: center; gap: 4px; }
    .pk-see .nq-cap { margin-right: 4px; }
    .pk-see .card { opacity: 1 !important; }
    .pk-q { opacity: .4; }
    .pk-bets { display: flex; gap: 8px; align-items: flex-start; }
    .pk-bets > div { display: flex; flex-direction: column; }
    .pk-gauge { display: flex; flex-direction: column; gap: 3px; padding: 4px 8px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mincho); }
    .pk-g-h { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; line-height: 1.25; color: var(--gold-pale); }
    .pk-g-h b { color: var(--gold-hi); font-weight: 900; white-space: nowrap; }
    .pk-bar { position: relative; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; height: 14px; margin: 2px 0 2px; }
    .pk-bar > i { display: block; background: rgba(255,255,255,.1); border: 1px solid var(--line-dim, rgba(255,255,255,.2)); }
    .pk-bar > i.on { background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border-color: var(--gold-hi); }
    .pk-bar > u { position: absolute; top: -4px; bottom: -4px; width: 0; border-left: 3px solid #ff8f9c; text-decoration: none; }
    .pk-g-n { display: flex; justify-content: space-between; gap: 8px; line-height: 1.25; color: #ffb3bc; }
    .pk-g-n span { white-space: nowrap; }
    .pk-g-n .go { color: var(--gold-pale); text-align: right; word-break: keep-all; }
    .pk-act { display: flex; justify-content: center; align-items: center; gap: 14px; height: 100%; }
    .pk-act .btn { margin: 0; flex: 1 1 0; max-width: 260px; }
  `;

  // 見えた札の札の絵（見えた所だけ出し、見えない所は「？」）
  function seenCardHTML(api, it) {
    if (it.kind === 'card') return api.cardHTML(it.c, 'small');
    const red = it.kind === 'suit' && (it.c.s === 'h' || it.c.s === 'd') ? 'red' : '';
    const r = it.kind === 'rank' ? api.rn(it.c.r) : '<span class="pk-q">?</span>';
    const s = it.kind === 'suit' ? api.SYM[it.c.s] : '<span class="pk-q">?</span>';
    return `<span class="card ${red} small" aria-label="${it.kind === 'rank' ? '数字だけ見えた' : 'マークだけ見えた'}"><b>${r}</b><i>${s}</i></span>`;
  }
  const seeText = (api, items) => items.map(it => it.kind === 'card' ? `${api.label(it.c)}（1枚まるごと）` : it.kind === 'rank' ? `数字は ${api.rn(it.c.r)}` : `マークは ${api.SYM[it.c.s]}`).join('・');

  // 勝つ見込み（見えた札と矛盾しない相手の手だけで数える）。リバーは全部、それより前は組をかぎって数える（headsUp は残りの札の全部の出方を数える）
  function eqOver(api, mine, hands, board) {
    const cap = board.length >= 5 ? 1e9 : board.length === 4 ? 150 : 40;
    const hs = hands.length > cap ? api.shuffle(hands.slice()).slice(0, cap) : hands;
    return api.eqPct(hs.reduce((t, h) => t + api.headsUp(mine, h, board), 0) / hs.length);
  }

  async function start({ api }) {
    const who = SEE[api.charId] ? api.charId : 'selina';
    const jp = api.char.jp;
    const T = api.table;
    let board, mine, her, pot, toCall, acts, P;
    if (T) { board = T.board; mine = T.mine; her = T.her; pot = T.pot || 0; toCall = T.toCall || 0; acts = T.acts || []; P = plans(api, board, mine, her, who); }
    // 卓の外（遊びの一覧から）：条件に合う場面を配る
    for (let t = 0; t < 200 && !(P && P.length); t++) {
      const d = api.shuffle(api.deck()), n = 3 + api.rand(3);
      mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 4 + n); pot = 400; toCall = 200;
      acts = [{ ph: 'flop', t: 'bet', a: 100 }]; if (n >= 4) acts.push({ ph: 'turn', t: 'bet', a: 200 });
      P = plans(api, board, mine, her, who);
    }
    // 卓で成り立たない場面（出さないはずの保険）：見えた札に矛盾しない役が全部残る形で出す
    const plan = P && P.length ? P[api.rand(P.length)] : null;
    if (!plan) { api.coach('ごめん、いい場面が作れなかった。卓にもどろう'); return; }
    const items = plan.cfg.items;
    const S = plan.S, herTile = tileOf(api, her, board, S.me);
    const consAll = plan.consAll;
    const tiles = api.shuffle(plan.tiles.map(x => {
      const imp = !x.cons.length;
      // 例の手：見えた札と合うかどうかが例から分からないよう、合わない手があれば合わない手から選ぶ（合う例を見せると「まだ作れる」と教えてしまう）
      const bad = x.t.hands.filter(h => !consistent(items, h));
      const src = bad.length ? bad : x.t.hands;
      return { ...x.t, hands: undefined, imp, ex: src[api.rand(src.length)] };
    }));
    const free = toCall <= 0;
    const NAMES = free ? { call: '賭ける', fold: '様子見' } : { call: '付いていく', fold: '降りる' };
    const lastAct = acts.length ? acts[acts.length - 1] : { t: free ? 'check' : 'bet', ph: T ? T.phase : 'river', a: toCall };
    const betted = ['bet', 'raise', 'allin'].includes(lastAct.t) || (!acts.length && !free);
    const need = free ? 50 : Math.round(toCall / Math.max(1, (pot || 0) + toCall) * 100);
    const eqC = eqOver(api, mine, consAll, board);  // 見えた札と矛盾しない手だけで数えた、ミミが勝つ見込み
    const truth = eqC >= need ? 'call' : 'fold';
    const mimiEq = api.eqPct(api.headsUp(mine, her, board));
    const core = new Set(coreCards(api, mine.concat(board)).map(api.key));
    const mineCore = mine.filter(c => core.has(api.key(c)));
    const meName = roleName(api, mine.concat(board));
    const LINE = {
      polka: ['あっ、見た？ 見たでしょ〜！ ひっく', 'panic'],
      selina: ['……眼鏡が|無いと、持ち方が|分からなくて', 'panic'],
      grano: ['おっと、|品定めは|明るい所でせんとな', 'smug'],
      velvet: ['見せてあげる♡|……どう思う？', 'smug'],
      rico: herTile.danger ? ['えへへ、見えちゃった？', 'smug'] : ['ん〜？ なんか見てる〜？', 'think'],
    };
    const [line, face] = LINE[who];

    api.css('peek', CSS);
    api.say(line, face); api.bet(free ? '—' : toCall);
    const root = api.root;
    const STEPS = ['消える役', '見込み', '賭ける'];
    root.classList.add('rb-frame');
    const actsHTML = acts.length ? acts.map(a => `<span>${PH[a.ph] || ''}：${ACTN[a.t] || a.t}${a.a ? ` <b>${a.a}</b>` : ''}</span>`).join('') : `<span>${betted ? `いま <b>${toCall}</b> 賭けてきた` : '様子見'}</span>`;
    const shown = items.length === 1 ? [items[0], null] : items;
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-pk-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play nq-play">
        <div class="nq-tiles" id="mb-pk-tiles">${tiles.map(t => `<button class="nq-tile" type="button" data-k="${t.key}"><span class="nm">${wb(t.name)}</span><span class="ex"><small>例</small>${t.ex.map(c => api.cardHTML(c, 'small')).join('')}</span></button>`).join('')}</div>
        <div class="pk-gauge" id="mb-pk-gauge" hidden></div>
      </div>
      <div class="rb-info">
        <div class="nq-sit"><div class="nq-cap">場札 ／ ミミの手札</div><div class="nq-row">${board.map(c => api.cardHTML(c, 'small' + (core.has(api.key(c)) ? ' glow' : ''))).join('')}<span class="pk-sep" aria-hidden="true"></span>${mine.map(c => api.cardHTML(c, 'small' + (core.has(api.key(c)) ? ' glow' : ''))).join('')}</div>
          <div class="nq-me">ミミの役：${meName}</div></div>
        <div class="nq-tip" id="mb-pk-tip"></div>
        <div class="nq-her pk-her"><div class="pk-see"><span class="nq-cap">${jp}の札</span>${shown.map(it => it ? seenCardHTML(api, it) : api.backHTML('small')).join('')}</div>
          <div class="pk-bets"><span class="nq-cap">賭け方</span><div>${actsHTML}</div></div></div>
      </div>
      <div class="rb-act" id="mb-pk-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const act = $('#mb-pk-act');
    const tip = (html, ex) => { api.coach(html, ex); const el = $('#mb-pk-tip'); if (el) el.innerHTML = html; };
    await api.rules({
      key: 'peek1', title: '見えちゃった札',
      goal: `酔った${jp}の伏せ札が、少し見えた。見えた札をヒントに、<em>${NAMES.call}</em>か<em>${NAMES.fold}</em>かを決める`,
      how: `①見えた札と合わなくて<em>もう作れない役を全部タップ</em>　②残った役で、ミミが勝つ見込みと払う額の線をくらべて決める`,
      risk: 'まだ作れる役をタップすると×（ご褒美が減る）。見込みと線の見くらべをまちがえると外れ。答え合わせはこの手の決着の後',
      look: [['消える役', `見えた札（${jp}の札）`], ['見込み', '10個の印と払う額の線'], ['自信', '迷わなかったら上げる']],
    });
    if (!api.alive()) return;

    // 1問目：見えた札では、どの役がもう作れない？
    const nGone = tiles.filter(t => t.imp).length;
    let found = 0, miss = 0;
    const left = () => api.mission(`もう作れない役を全部タップ（あと${nGone - found}つ）`);
    left();
    tip(kw(`見えた札と|合わない役は、|もう作れない`), 'think');
    await new Promise(res => {
      root.querySelectorAll('.nq-tile').forEach(b => b.addEventListener('click', () => {
        if (b.disabled || found >= nGone) return;
        const t = tiles.find(x => x.key === b.dataset.k);
        b.disabled = true;
        if (t.imp) {
          found++; api.sfx.good();
          b.classList.add('is-gone'); b.insertAdjacentHTML('beforeend', '<span class="st">○ 消える</span>');
        } else {
          miss++; api.sfx.nope();
          b.classList.add('is-left', 'is-miss'); b.insertAdjacentHTML('beforeend', '<span class="st">× まだ作れる</span>');
          tip(`${plain(t.name)}は、見えた札と合う手があるよ。まだ作れる`, 'think');
        }
        if (found >= nGone) res(); else left();
      }));
    });
    if (!api.alive()) return;
    root.querySelectorAll('.nq-tile').forEach(b => {
      if (b.disabled) return;
      b.disabled = true; b.classList.add('is-left'); b.insertAdjacentHTML('beforeend', '<span class="st">まだ作れる</span>');
    });
    tip(kw(miss ? `消える役は${nGone}つ。|残った役の中に|危ない役もある` : '全部見つけた！|残った役の中に|危ない役もある'), miss ? 'think' : 'win');
    await api.wait(api.reduce ? 400 : 1200); if (!api.alive()) return;

    // 2問目：残った役で、ミミが勝つ見込みと払う額の線をくらべる
    $('#mb-pk-steps').innerHTML = api.steps(STEPS, 1);
    const tilesEl = $('#mb-pk-tiles'); tilesEl.classList.add('is-q2', 'pk-q2');
    tiles.forEach(t => {
      const b = tilesEl.querySelector(`[data-k="${t.key}"]`);
      b.querySelector('.st').remove();
      if (t.imp) { b.insertAdjacentHTML('beforeend', '<span class="st">消えた</span>'); return; }
      b.classList.remove('is-miss'); b.classList.add(t.danger ? 'is-danger' : 'is-safe');
      b.insertAdjacentHTML('beforeend', `<span class="st">${t.danger ? '危ない' : '負けない'}</span>`);
    });
    const on = Math.round(eqC / 10);
    const g = $('#mb-pk-gauge'); g.hidden = false;
    g.innerHTML = `<div class="pk-g-h"><span>ミミが勝つ見込み</span><b>約${eqC}%</b></div>
      <div class="pk-bar" role="img" aria-label="見込み 約${eqC}%、${free ? '半分' : '払う額の線'} ${need}%">${Array.from({ length: 10 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}<u style="left:${need}%"></u></div>
      <div class="pk-g-n"><span>赤い線＝${free ? '半分' : `払う額の線 ${need}%`}</span></div>`;
    api.mission(`見込みと線をくらべて決める`);
    tip(kw(`棒が赤い線より|右なら${NAMES.call}、|左なら${NAMES.fold}のが得`), 'think');
    act.innerHTML = `<div class="pk-act"><button class="btn" data-d="call">${NAMES.call}</button><button class="btn" data-d="fold">${NAMES.fold}</button></div>`;
    const decide = await new Promise(res => act.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { api.sfx.tap(); act.innerHTML = ''; res(b.dataset.d); })));
    if (!api.alive()) return;
    $('#mb-pk-steps').innerHTML = api.steps(STEPS, 2);
    const good = tiles.length - miss;
    const base = 20 + good * 10;
    await api.wager({ mission: 'その判断の自信を選ぶ', question: `「${NAMES[decide]}」と決めた`, note: '迷わなかったら上げる', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const herRole = roleName(api, her.concat(board));
    const seenTxt = seeText(api, items);
    const pending = { kind: 'logic', names: NAMES, title: '見えちゃった札', charId: api.charId, pick: decide, truth, mimiEq: eqC, need, endLines: END[who], board, mine, her, base, mult: m, stakes: STAKES,
      herWeak: !herTile.danger, perfect: miss === 0 && m === 3, notes: [],
      why: `見えた札（${seenTxt}）と合う相手の手で数えて、勝つ見込みは約${eqC}%。`,
      truthText: `${jp}は ${herRole}${herTile.danger ? '（ミミより強い）' : '（ミミは負けない）'}<small>見えた札で数えた見込み 約${eqC}%・${free ? '半分' : `線 ${need}%`}。${NAMES[truth]}のが正解。決着の勝ち負けは運の側</small>`,
      extra: `見えた札：${seenTxt}` };
    if (T) {
      api.entrust({
        pick: `見込み ${eqC}% → ${NAMES[decide]}`, win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'call' ? (free ? '「賭ける」と決めた。卓で賭けよう' : '「付いていく」と決めた。卓でコールしよう') : (free ? '「様子見」と決めた。卓でチェックしよう' : '「降りる」と決めた。卓で降りよう'),
        pending,
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.finish({ correct, base, perfect: correct && pending.perfect,
      detail: `${jp}は ${her.map(api.label).join(' ')}（${herRole}）。${pending.why}` });
  }

  // 卓でこの読み合いを出してよいか：見えた札で作れなくなる役が1つ以上あり、残った役に危ない役と負けない役の両方がある時だけ
  MB.peekMatters = (T, charId) => { try { return plans(MB, T.board, T.mine, T.her, SEE[charId] ? charId : 'selina').length > 0; } catch (e) { return false; } };
  MB.peekKit = { SEE, configs, consistent, plans, tileOf, survey, eqOver };

  MB.register({ id: 'peek', group: 'logic', order: 20, title: '見えちゃった札', sub: '論理 · 見えた札', isNew: true, chars: ['polka', 'selina', 'grano', 'rico', 'velvet'], start });
})();
