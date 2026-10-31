// 論理：容疑者しぼり（卓の本当の手）2026-10-31 作り直し
// 前の版（組を並べて「この賭け方をめったにしない組を外す」＋%の棒と割に合う線）は小学生には難しすぎた（ユーザー指摘）。
// ユーザー案：場札と相手のセリフを示して「どの役が来たら危ない？」「どの役が来てると思う？」の2問にする。
//   1問目：この場札で相手が作れる役の札（3〜4枚・各札に手札の例）から、ミミが負ける役を全部タップ。その場で○×。
//   2問目：相手のセリフ（手の強さで変わる）・賭け方・癖を見て、来ていそうな役を1枚選ぶ。危ない役なら降りる、危なくない役なら付いていく。
// ミミの手札の2枚は出さない（判断に要るのはミミの役だけ。ノイズになる。10/31 ユーザー）。役を作っている札だけ光らせる。
// 答え合わせは手の決着の後（verdict.js、kind:'logic'）。
(() => {
  const STAKES = [0, 1, 3];
  // 賭けた（ベット・レイズ・オールイン）時に、その強さの手がそう動く割合。様子見・コールの時は 1 − これ（読み合いが成り立つかの判定に使う）
  const BET = {
    selina: { strong: .95, set: .9, big: .7, small: .3, draw: .2, air: .08 },
    velvet: { strong: .9, set: .85, big: .6, small: .45, draw: .5, air: .45 },
  };
  const HABIT = { selina: '強い時しか賭けない', velvet: '弱くても大きく賭ける（演技）' };
  // セリナのセリフは手の強さで変わる（強い／中くらい／弱い）。ヴェルベットは演技なのでいつも同じ
  const LINES = {
    selina: {
      bet: { hi: ['……これで|終わりよ。', 'smug'], mid: ['……どうぞ。', 'think'], lo: ['……っ。ど、どうぞ。', 'panic'] },
      check: { hi: ['……お先にどうぞ。', 'smug'], mid: ['……様子を見るわ。', 'think'], lo: ['……今はやめておく。', 'panic'] },
    },
    velvet: {
      bet: { hi: ['ほら、どうするの？ ざぁこ♡', 'smug'], mid: ['ほら、どうするの？ ざぁこ♡', 'smug'], lo: ['ほら、どうするの？ ざぁこ♡', 'smug'] },
      check: { hi: ['ふふっ、どうぞ♡', 'smug'], mid: ['ふふっ、どうぞ♡', 'smug'], lo: ['ふふっ、どうぞ♡', 'smug'] },
    },
  };
  const END = {
    selina: { bc: '……読まれたわね', bw: '……降りてくれて助かったわ', sc: '……賢明ね', sw: '……だから言ったでしょう' },
    velvet: { bc: 'う、うそ……読まれた……！', bw: 'ふふっ、降りちゃった♡ ざぁこ♡', sc: '……ちっ。逃げ足だけは速いのね', sw: 'ざぁんねん♡ 本物なの' },
  };
  const ACTN = { check: '様子見', call: '付いてきた', bet: '賭けた', raise: '上乗せした', allin: '全部賭けた' };
  const PH = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };

  // 手の強さの組（賭け方の割合を引くため）。役の札とは別
  function strengthOf(M, h, board) {
    const cards = h.concat(board), cat = M.category(cards);
    if (cat >= 4) return 'strong';
    if (cat >= 2) return 'set';
    if (cat === 1) {
      if (M.category(board) >= 1 && !h.some(c => board.some(b => b.r === c.r)) && h[0].r !== h[1].r) return hasDraw(h, board) ? 'draw' : 'air';
      return pairRank(cards) >= Math.max(...board.map(c => c.r)) ? 'big' : 'small';
    }
    return hasDraw(h, board) ? 'draw' : 'air';
  }
  function hasDraw(h, bd) {
    if (bd.length >= 5) return false;
    for (const s of ['s', 'h', 'd', 'c']) {
      const nb = bd.filter(c => c.s === s).length, nh = h.filter(c => c.s === s).length;
      if (nh >= 1 && nb + nh === 4) return true;
    }
    const ranks = (cs) => { const m = new Set(cs.map(c => c.r)); if (m.has(14)) m.add(1); return m; };
    const all = ranks(h.concat(bd)), onBoard = ranks(bd);
    for (let lo = 1; lo <= 10; lo++) {
      let n = 0, nb = 0;
      for (let r = lo; r < lo + 5; r++) { if (all.has(r)) n++; if (onBoard.has(r)) nb++; }
      if (n === 4 && nb < 4) return true;
    }
    return false;
  }
  function pairRank(cards) {
    const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    return Math.max(...Object.keys(cnt).filter(r => cnt[r] >= 2).map(Number));
  }

  // 役の札：役の種類で分ける。ミミと同じ役の時だけ「ミミより上／下」に分ける（ワンペアはペアの数字で）
  function tileOf(M, h, board, me) {
    const cards = h.concat(board), cat = M.category(cards);
    const name = M.CAT_NAME[cat];
    if (cat !== me.cat) return { key: 'c' + cat, name, danger: cat > me.cat };
    if (cat === 1) {
      const r = pairRank(cards);
      if (r > me.pr) return { key: 'p+', name: `${M.rn(me.pr)}より|大きいペア`, danger: true };
      if (r < me.pr) return { key: 'p-', name: `${M.rn(me.pr)}より|小さいペア`, danger: false };
      return { key: 'p=', name: `同じ|${M.rn(me.pr)}のペア`, danger: false };
    }
    const s = M.score(cards);
    if (cat === 0) return s > me.score ? { key: 's+', name: '役なし|（ミミより|大きい札）', danger: true } : { key: 's-', name: '役なし|（ミミより|小さい札）', danger: false };
    return s > me.score ? { key: 's+', name: `ミミより上の|${name}`, danger: true } : { key: 's-', name: `ミミと同じか|下の${name}`, danger: false };
  }
  // 相手の手として考えられる全部の組み合わせを、役の札に分ける
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
  // 並べる札：危ない役から多い順に3つまで、危なくない役も多い順に。合わせて4枚まで・どちらも1枚以上。相手の本当の役は必ず入れる
  function chooseTiles(all, herKey) {
    const L = Object.values(all).sort((a, b) => b.n - a.n);
    const d = L.filter(t => t.danger), s = L.filter(t => !t.danger);
    if (!d.length || !s.length) return null;
    const pick = [...d.slice(0, 3), ...s].slice(0, 4);
    if (herKey && !pick.some(t => t.key === herKey)) {
      const her = all[herKey];
      if (pick.length < 4) pick.push(her);
      else {
        // 同じ側の一番少ない札と替える（どちらの側も1枚以上は残す）
        const same = pick.filter(t => t.danger === her.danger);
        const pool = same.length ? same : pick.filter(t => pick.filter(x => x.danger === t.danger).length > 1);
        pick[pick.indexOf(pool[pool.length - 1])] = her;
      }
    }
    return pick;
  }
  // ミミの役を作っている札（光らせる札）
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
  const kw = (t) => `<span class="nq-k">${wb(t)}</span>`;  // リコの一言：| の所でだけ折る
  const CSS = `
    .nq-play { display: flex; flex-direction: column; min-height: 0; }
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
    .nq-tile.is-pick { outline: 3px solid var(--gold-hi); outline-offset: 2px; opacity: 1; }
    .nq-tiles.is-q2 .nq-tile { opacity: 1; }
    @keyframes nq-shake { 0%,100% { transform: none; } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .nq-k { word-break: keep-all; }
    .nq-sit { display: flex; flex-direction: column; gap: 4px; }
    .nq-cap { font-family: var(--mincho); font-weight: 700; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .nq-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .nq-row .card:not(.glow) { opacity: .55; }
    .nq-me { font-family: var(--mincho); font-weight: 800; line-height: 1.3; color: var(--gold-hi); }
    .nq-me small { color: var(--gold-pale); font-weight: 700; margin-left: 4px; }
    .nq-her { display: flex; flex-direction: column; gap: 3px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mincho); line-height: 1.35; }
    .nq-her b { color: var(--gold-hi); }
    .nq-her .sp { color: var(--gold-hi); font-weight: 800; word-break: keep-all; }
    .nq-her .hb { color: var(--gold-pale); }
    .nq-her .hb::before { content: "癖"; display: inline-block; margin-right: 6px; padding: 0 6px; border: 1px solid var(--gold); color: var(--gold); font-weight: 800; }
    .nq-act1 { display: flex; justify-content: center; align-items: center; height: 100%; }
    .nq-act1 .btn { margin: 0; width: min(440px, 100%); }
  `;

  async function start({ api }) {
    const who = api.charId === 'velvet' ? 'velvet' : 'selina';
    const jp = api.char.jp;
    const T = api.table;
    let board, mine, her, pot, toCall, acts, S, tiles;
    if (T) { board = T.board; mine = T.mine; her = T.her; pot = T.pot || 0; toCall = T.toCall || 0; acts = T.acts || []; }
    // 卓の外（遊びの一覧から）：危ない役と危なくない役が両方ある場面を配る
    for (let t = 0; t < 60; t++) {
      if (!T) { const d = api.shuffle(api.deck()); mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 9); pot = 400; toCall = 200; acts = [{ ph: 'turn', t: 'bet', a: 100 }, { ph: 'river', t: 'bet', a: 200 }]; }
      S = survey(api, board, mine);
      const herT = tileOf(api, her, board, S.me);
      tiles = chooseTiles(S.tiles, herT.key);
      if (tiles || T) break;
    }
    const meName = roleName(api, mine.concat(board));
    const herTile = tileOf(api, her, board, S.me);
    if (!tiles) tiles = Object.values(S.tiles).sort((a, b) => b.n - a.n).slice(0, 4);  // 卓で読み合いが成り立たない場面（出さないはずの保険）
    tiles = api.shuffle(tiles.slice());
    tiles.forEach(t => { t.ex = t.hands[Math.floor(Math.random() * t.hands.length)]; });
    const free = toCall <= 0;
    const NAMES = free ? { call: '賭ける', fold: '様子見' } : { call: '付いていく', fold: '降りる' };
    const lastAct = acts.length ? acts[acts.length - 1] : { t: free ? 'check' : 'bet', ph: T ? T.phase : 'river', a: toCall };
    const betted = ['bet', 'raise', 'allin'].includes(lastAct.t) || (!acts.length && !free);
    // 相手の本当の強さでセリフを変える
    const herS = strengthOf(api, her, board);
    const lv = ['strong', 'set'].includes(herS) ? 'hi' : ['big', 'small'].includes(herS) ? 'mid' : 'lo';
    const [line, face] = LINES[who][betted ? 'bet' : 'check'][lv];
    const truth = herTile.danger ? 'fold' : 'call';
    const mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    const core = new Set(coreCards(api, mine.concat(board)).map(api.key));
    const mineCore = mine.filter(c => core.has(api.key(c)));

    api.css('narrow', CSS);
    api.say(who === 'velvet' ? 'ほら、どうするの？ ざぁこ♡' : '……。', 'think'); api.bet(free ? '—' : toCall);
    const root = api.root;
    const STEPS = ['危ない役', '来てる役', '賭ける'];
    root.classList.add('rb-frame');
    const actsHTML = acts.length ? acts.map(a => `<span>${PH[a.ph] || ''}：${ACTN[a.t] || a.t}${a.a ? ` <b>${a.a}</b>` : ''}</span>`).join('') : `<span>${betted ? `いま <b>${toCall}</b> 賭けてきた` : '様子見'}</span>`;
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-nq-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play nq-play">
        <div class="nq-tiles" id="mb-nq-tiles">${tiles.map(t => `<button class="nq-tile" type="button" data-k="${t.key}"><span class="nm">${wb(t.name)}</span><span class="ex"><small>例</small>${t.ex.map(c => api.cardHTML(c, 'small')).join('')}</span></button>`).join('')}</div>
      </div>
      <div class="rb-info">
        <div class="nq-sit"><div class="nq-cap">場札</div><div class="nq-row">${board.map(c => api.cardHTML(c, 'small' + (core.has(api.key(c)) ? ' glow' : ''))).join('')}</div>
          <div class="nq-me">ミミの役：${meName}${mineCore.length ? `<small>${mineCore.length < core.size ? `手札の${mineCore.map(api.label).join('・')}も使う` : `手札の${mineCore.map(api.label).join('・')}で`}</small>` : ''}</div></div>
        <div class="nq-her" id="mb-nq-her" hidden><span class="sp">${jp}「${wb(line)}」</span><span>${jp}の賭け方</span>${actsHTML}<span class="hb">${HABIT[who]}</span></div>
      </div>
      <div class="rb-act" id="mb-nq-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const act = $('#mb-nq-act');
    await api.rules({
      key: 'narrow2', title: '容疑者しぼり',
      goal: `${jp}にミミより強い役が来ているかを読んで、<em>${NAMES.call}</em>か<em>${NAMES.fold}</em>かを決める`,
      how: `①この場札でミミが負ける役を<em>全部タップ</em>　②${jp}のセリフと賭け方から、来ている役を<em>1つ選ぶ</em>`,
      risk: '負けない役をタップすると×。答え合わせはこの手の決着の後',
      look: [['危ない役', `ミミの役（${meName}）より強い役`], ['来てる役', `${jp}の癖とセリフ`], ['自信', '迷わなかったら上げる']],
    });
    if (!api.alive()) return;

    // 1問目：どの役が来たら危ない？
    const nDanger = tiles.filter(t => t.danger).length;
    let found = 0, miss = 0;
    const left = () => api.mission(`危ない役を全部タップ（あと${nDanger - found}つ）`);
    left();
    api.coach(kw(`ミミは${meName}。|これより強い役が|危ない（ミミの負け）`), 'think');
    await new Promise(res => {
      root.querySelectorAll('.nq-tile').forEach(b => b.addEventListener('click', () => {
        if (b.disabled || found >= nDanger) return;
        const t = tiles.find(x => x.key === b.dataset.k);
        b.disabled = true;
        if (t.danger) {
          found++; api.sfx.good();
          b.classList.add('is-danger'); b.insertAdjacentHTML('beforeend', '<span class="st">○ 危ない</span>');
        } else {
          miss++; api.sfx.nope();
          b.classList.add('is-safe', 'is-miss'); b.insertAdjacentHTML('beforeend', '<span class="st">× 負けない</span>');
          api.coach(`${plain(t.name)}なら、ミミの${meName}は負けないよ`, 'think');  // 役の名前が長いと、折らない指定では枠からはみ出す
        }
        if (found >= nDanger) res(); else left();
      }));
    });
    if (!api.alive()) return;
    root.querySelectorAll('.nq-tile').forEach(b => {
      if (b.disabled) return;
      b.disabled = true; b.classList.add('is-safe'); b.insertAdjacentHTML('beforeend', '<span class="st">負けない</span>');
    });
    api.coach(kw(miss ? `危ない役は${nDanger}つ。|赤い札が来ていたら|ミミの負け` : '全部見つけた！|赤い札が来ていたら|ミミの負け'), miss ? 'think' : 'win');
    await api.wait(api.reduce ? 400 : 1200); if (!api.alive()) return;

    // 2問目：どの役が来てると思う？
    $('#mb-nq-steps').innerHTML = api.steps(STEPS, 1);
    $('#mb-nq-her').hidden = false;
    $('#mb-nq-tiles').classList.add('is-q2');
    api.say(line, face);
    api.mission(`${jp}に来ている役はどれ？`);
    api.coach(kw(`${jp}の癖は|「${HABIT[who]}」。|セリフも聞いてみて`), 'think');
    const pickT = await new Promise(res => {
      root.querySelectorAll('.nq-tile').forEach(b => {
        b.disabled = false;
        b.onclick = () => { root.querySelectorAll('.nq-tile').forEach(x => { x.disabled = true; x.classList.toggle('is-pick', x === b); }); api.sfx.tap(); res(tiles.find(x => x.key === b.dataset.k)); };
      });
    });
    if (!api.alive()) return;
    const decide = pickT.danger ? 'fold' : 'call';
    api.coach(pickT.danger ? `${plain(pickT.name)}ならミミの負け。${NAMES.fold}のが得` : `${plain(pickT.name)}ならミミは負けない。${NAMES.call}のが得`, 'think');
    $('#mb-nq-steps').innerHTML = api.steps(STEPS, 2);
    const good = tiles.length - miss;
    const base = 20 + good * 10;
    await api.wager({ mission: 'その読みの自信を選ぶ', question: `「${plain(pickT.name)}」<span style="white-space:nowrap">と読んだ → ${NAMES[decide]}</span>`, note: '迷わなかったら上げる', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const whyTxt = pickT.key === herTile.key ? `${jp}の役を当てた（${plain(herTile.name)}）。` : `${jp}は「${plain(herTile.name)}」だった（ミミの読みは「${plain(pickT.name)}」）。`;
    const herRole = roleName(api, her.concat(board));
    const pending = { kind: 'logic', names: NAMES, title: '容疑者しぼり', charId: api.charId, pick: decide, truth, mimiEq, endLines: END[who], board, mine, her, base, mult: m, stakes: STAKES,
      herWeak: !herTile.danger, perfect: miss === 0 && pickT.key === herTile.key && m === 3, notes: [], why: whyTxt,
      truthText: `${jp}は ${herRole}${herTile.danger ? '（ミミより強い）' : '（ミミは負けない）'}<small>${NAMES[truth]}のが正解だった</small>`,
      extra: `ミミの読み：${plain(pickT.name)}${pickT.key === herTile.key ? ' ○' : ''}` };
    if (T) {
      api.entrust({
        pick: `${plain(pickT.name)} → ${NAMES[decide]}`, win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'call' ? (free ? '「賭ける」と決めた。卓で賭けよう' : '「付いていく」と決めた。卓でコールしよう') : (free ? '「様子見」と決めた。卓でチェックしよう' : '「降りる」と決めた。卓で降りよう'),
        pending,
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.finish({ correct, base, perfect: correct && pending.perfect,
      detail: `${jp}は ${her.map(api.label).join(' ')}（${herRole}）。${whyTxt}` });
  }

  // この手で読み合いが成り立つか：危ない役と危なくない役が両方あり、癖で読むと「危ないかどうか」の見立てが変わる時だけ出す
  // （2026-10-31 読んでも読まなくても答えが同じ手で出ていた）。ヴェルベットは「癖が当てにならない」と知るのが読みなので、並べられればいつも出す
  function matters(M, T, who) {
    const board = T.board, mine = T.mine, acts = T.acts || [], free = (T.toCall || 0) <= 0;
    const S = survey(M, board, mine);
    if (!chooseTiles(S.tiles, null)) return false;
    if (who === 'velvet') return true;
    const last = acts[acts.length - 1];
    const betted = last ? ['bet', 'raise', 'allin'].includes(last.t) : !free;
    let nA = 0, dA = 0, wA = 0, dW = 0;
    Object.values(S.tiles).forEach(t => t.hands.forEach(h => {
      const p = betted ? BET[who][strengthOf(M, h, board)] : 1 - BET[who][strengthOf(M, h, board)];
      nA++; wA += p; if (t.danger) { dA++; dW += p; }
    }));
    if (!wA) return false;
    return (dA / nA > .5) !== (dW / wA > .5);
  }
  MB.narrowMatters = (T, charId) => matters(MB, T, charId === 'velvet' ? 'velvet' : 'selina');

  MB.register({ id: 'narrow', group: 'logic', order: 7, title: '容疑者しぼり', sub: '論理 · 危ない役', isNew: true, chars: ['selina', 'velvet'], start });
})();
