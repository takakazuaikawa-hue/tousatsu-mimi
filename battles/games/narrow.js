// 論理：容疑者しぼり（危険札さがし＋容疑者しぼりをまとめた、卓の本当の手の版）2026-10-27
// 場札から、相手が持っていそうな手の組（容疑者）を作って並べる：強い役（ストレート以上）／スリーカード・ツーペア／大きいペア／小さいペア／あと1枚（待ち）／役なし。
// 相手のこの手での賭け方（卓の記録）を見て、その賭け方を「めったにしない」組を外す。外し方は人で違う（相手の癖は全種類で同じ：
//   セリナは弱い手ではほとんど賭けない＝賭けてきたら役なしは外せる／ヴェルベットは演技で弱くても賭ける＝外せる組がほとんど無い）。
// 決めた後に、組ごとの「この賭け方をする割合（10回のうち）」を見せて○×。棒は正しく残した組で作る（見えない失敗はしない）。
// 残った組の中でミミが勝てる割合（組み合わせの数で重み）と、割に合う線（払う額÷払った後のポット）を比べて、付いていくか降りるかを決める。
// 答え合わせは手の決着の後（verdict.js、kind:'logic'）。
(() => {
  const STAKES = [0, 1, 3];
  const GROUPS = [
    { id: 'strong', name: '強い役', sub: 'ストレート以上' },
    { id: 'set', name: '3枚・2組', sub: 'スリーカード・ツーペア' },
    { id: 'big', name: '大きいペア', sub: '場の一番上と同じ・それより上' },
    { id: 'small', name: '小さいペア', sub: 'それより下のペア' },
    { id: 'draw', name: 'あと1枚', sub: 'フラッシュ・ストレート待ち' },
    { id: 'air', name: '役なし', sub: '何もそろっていない' },
  ];
  // 賭けた（ベット・レイズ・オールイン）時に、その組がそう動く割合。様子見・コールの時は 1 − これ
  const BET = {
    selina: { strong: .95, set: .9, big: .7, small: .3, draw: .2, air: .08 },
    velvet: { strong: .9, set: .85, big: .6, small: .45, draw: .5, air: .45 },
  };
  const HABIT = {
    selina: '弱い手では、ほとんど賭けない。強い時だけ押す',
    velvet: '弱い手でも、平気で大きく賭ける（演技）',
  };
  const END = {
    selina: { bc: '……読まれたわね', bw: '……降りてくれて助かったわ', sc: '……賢明ね', sw: '……だから言ったでしょう' },
    velvet: { bc: 'う、うそ……読まれた……！', bw: 'ふふっ、降りちゃった♡ ざぁこ♡', sc: '……ちっ。逃げ足だけは速いのね', sw: 'ざぁんねん♡ 本物なの' },
  };
  const ACTN = { check: '様子見（チェック）', call: '付いてきた（コール）', bet: '賭けた（ベット）', raise: '上乗せ（レイズ）', allin: '全部賭けた（オールイン）' };
  const PH = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };

  function groupOf(api, h, board) {
    const cards = h.concat(board);
    const cat = api.category(cards);
    if (cat >= 4) return 'strong';
    if (cat >= 2) return 'set';
    if (cat === 1) {
      const top = Math.max(...board.map(c => c.r));
      const pairR = (() => { const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; }); return +Object.keys(cnt).find(r => cnt[r] >= 2); })();
      // 場札だけでペアがある時は、手札で作ったペアではない（役なし扱い）
      const boardPair = (() => { const cnt = {}; board.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; }); return Object.values(cnt).some(n => n >= 2); })();
      if (boardPair && api.category(board) >= 1 && !h.some(c => board.some(b => b.r === c.r)) && h[0].r !== h[1].r) return drawOrAir(cards);
      return pairR >= top ? 'big' : 'small';
    }
    return drawOrAir(cards);
  }
  function drawOrAir(cards) {
    const suit = {}; cards.forEach(c => { suit[c.s] = (suit[c.s] || 0) + 1; });
    if (Object.values(suit).some(n => n >= 4)) return 'draw';
    const rs = new Set(cards.map(c => c.r)); if (rs.has(14)) rs.add(1);
    for (let lo = 1; lo <= 11; lo++) { let n = 0; for (let r = lo; r < lo + 4; r++) if (rs.has(r)) n++; if (n === 4) return 'draw'; }
    return 'air';
  }

  const CSS = `
    .nr-play { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
    .nr-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; flex: 1 1 auto; min-height: 0; }
    .nr-tile { position: relative; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 8px; min-height: 0; text-align: left; cursor: pointer; border: 1px solid var(--line); background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); color: var(--text); }
    .nr-tile .nm { font-family: var(--mincho); font-weight: 800; font-size: var(--ty-body, 17px); line-height: 1.25; color: var(--gold-hi); }
    .nr-tile .sb { font-size: 14px; line-height: 1.3; color: var(--dim); }
    .nr-tile .ct { display: flex; gap: 2px; }
    .nr-tile.is-out { background: #1a0709; border-color: #6e655a; }
    .nr-tile.is-out .nm, .nr-tile.is-out .sb, .nr-tile.is-out .ct { opacity: .45; text-decoration: line-through; }
    .nr-tile.is-out::after { content: "×"; position: absolute; right: 5px; top: 3px; font-size: 26px; font-weight: 900; color: var(--red-hi); line-height: 1; }
    .nr-tile[disabled] { cursor: default; }
    .nr-tile .fb { display: flex; align-items: center; gap: 6px; font-size: 14px; font-family: var(--mincho); font-weight: 800; }
    .nr-tile .fb.ok { color: var(--gold-hi); } .nr-tile .fb.ng { color: #ff8f9c; }
    .nr-tile .fb .mb-dots { flex: 0 0 auto; }
    .nr-tile.is-out .fb { opacity: 1; text-decoration: none; }
    .nr-acts { display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; background: var(--panel); border: 1px solid var(--line-dim); font-family: var(--mincho); font-size: 14px; line-height: 1.35; }
    .nr-acts .h { font-weight: 700; color: var(--gold); }
    .nr-acts b { color: var(--gold-hi); }
    .nr-acts .hb { color: var(--gold-pale); }
    .nr-sit2 { display: flex; flex-direction: column; gap: 2px; }
    .nr-sep { width: 8px; flex: 0 0 auto; }
    .nr-dots { display: grid; grid-template-columns: repeat(10, 6px); gap: 2px; }
    .nr-dots i { height: 8px; background: #3a1418; border: 1px solid var(--line-dim); }
    .nr-dots i.on { background: var(--gold-hi); border-color: var(--gold); }
    .nr-tile.is-out .nr-dots { opacity: 1; }
    .nr-habit { padding: 3px 8px; font-size: 14px; line-height: 1.4; }
    .nr-habit b { display: block; font-family: var(--mincho); }
    .nr-sit { display: flex; flex-direction: column; gap: 2px; font-family: var(--mincho); font-size: 14px; line-height: 1.35; color: var(--gold-pale); }
    .nr-sit b { color: var(--gold-hi); font-size: 16px; }
    .nr-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .nr-cap { font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; margin-right: 4px; }
    .nr-bars { display: flex; flex-direction: column; gap: 4px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line); }
    .nr-bar { position: relative; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; height: 16px; }
    .nr-bar i { background: #2a0c12; border: 1px solid var(--line-dim); }
    .nr-bar i.on { background: linear-gradient(180deg, var(--gold-hi), #8a5a1e); border-color: var(--gold); }
    .nr-bar i.q { background: repeating-linear-gradient(135deg, #2a0c12 0 4px, #3a1418 4px 8px); }
    .nr-bar s { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; background: #fff3c2; box-shadow: 0 0 6px rgba(255,243,194,.8); }
    .nr-bar-t { display: flex; justify-content: space-between; gap: 8px; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold-pale); white-space: nowrap; }
    .nr-bar-t b { color: var(--gold-hi); }
    .nr-act1 { display: flex; justify-content: center; height: 100%; }
    .nr-act1 .btn { margin: 0; width: min(440px, 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .nr-act1 .btn small, .nr-act2 .btn small { font-size: 14px; white-space: nowrap; }
    .nr-act2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; height: 100%; }
    .nr-act2 .btn { margin: 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; }
    .nr-act2 .btn > span { font-size: var(--ty-btn, 19px); line-height: 1.2; }
  `;

  async function start({ api }) {
    const who = api.charId === 'velvet' ? 'velvet' : 'selina';
    const jp = api.char.jp;
    const T = api.table;
    let board, mine, her, pot, toCall, acts;
    if (T) { board = T.board; mine = T.mine; her = T.her; pot = T.pot || 0; toCall = T.toCall || 0; acts = T.acts || []; }
    else { const d = api.shuffle(api.deck()); mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 8); pot = 600; toCall = 300; acts = [{ ph: 'flop', t: 'bet', a: 150, p: 300 }, { ph: 'turn', t: 'bet', a: 300, p: 600 }]; }
    const mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    const free = toCall <= 0;
    const need = free ? 50 : Math.round(100 * toCall / (pot + toCall));
    const NAMES = free ? { call: '賭ける', fold: '様子見' } : { call: '付いていく', fold: '降りる' };
    const truth = mimiEq >= need ? 'call' : 'fold';
    // この手の一番強い動き（賭けたか、様子見・コールだけか）
    const lastAct = acts.length ? acts[acts.length - 1] : { t: free ? 'check' : 'bet', ph: T ? T.phase : 'turn', a: toCall };
    const betted = ['bet', 'raise', 'allin'].includes(lastAct.t) || (!acts.length && !free);
    const pAct = (g) => betted ? BET[who][g] : 1 - BET[who][g];
    // 組ごとの組み合わせ数と、ミミが勝てる数（いまの札で比べる）
    const used = new Set([...mine, ...board].map(api.key));
    const rest = api.deck().filter(c => !used.has(api.key(c)));
    const sm = api.score(mine.concat(board));
    const G = Object.fromEntries(GROUPS.map(g => [g.id, { ...g, n: 0, win: 0, ex: null }]));
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
      const h = [rest[i], rest[j]]; const g = G[groupOf(api, h, board)];
      g.n++; const s = api.score(h.concat(board)); g.win += sm > s ? 1 : sm === s ? .5 : 0;
      if (!g.ex || Math.random() < 2 / g.n) g.ex = h;
    }
    const tiles = GROUPS.map(g => G[g.id]).filter(g => g.n > 0);
    const shouldOut = (g) => pAct(g.id) < .2;
    const mimiName = api.CAT_NAME[api.category(mine.concat(board))];
    const exTxt = (h) => h.map(c => `${api.rn(c.r)}${api.SYM[c.s]}`).join(' ');

    api.css('narrow', CSS);
    api.say(who === 'velvet' ? 'ほら、どうするの？ ざぁこ♡' : '……どうぞ。', who === 'velvet' ? 'smug' : 'think'); api.bet(free ? '—' : toCall);
    const root = api.root;
    const STEPS = ['容疑者を外す', '決める', '賭ける'];
    root.classList.add('rb-frame');
    const actsHTML = acts.length ? acts.map(a => `<span>${PH[a.ph] || ''}：${ACTN[a.t] || a.t}${a.a ? ` <b>${a.a}</b>` : ''}</span>`).join('') : `<span>${betted ? `いま <b>${toCall}</b> 賭けてきた` : '様子見（チェック）'}</span>`;
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-nr-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play nr-play">
        <div class="nr-tiles" id="mb-nr-tiles">${tiles.map(g => `<button class="nr-tile" type="button" data-g="${g.id}"><span class="nm">${g.name}</span><span class="sb">${g.sub}</span><span class="ct">${g.ex.map(c => api.cardHTML(c, 'small')).join('')}</span></button>`).join('')}</div>
      </div>
      <div class="rb-info">
        <div class="nr-sit2"><div class="nr-cap">場札 ／ ミミの手（${mimiName}）</div><div class="nr-row">${board.map(c => api.cardHTML(c, 'small')).join('')}<i class="nr-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</div></div>
        <div class="nr-acts"><span class="h">${jp}のこの手の賭け方</span>${actsHTML}<span class="hb">癖：${HABIT[who]}</span></div>
        <div class="nr-sit"><span>割に合う線 <b>${need}%</b>${free ? '' : `（払う ${toCall} ÷ 払った後のポット ${pot + toCall}）`}</span></div>
        <div class="nr-bars"><div class="nr-bar-t"><span>残った容疑者に勝てる <b id="mb-nr-wn">？</b></span><span>線 ${need}%</span></div>
          <div class="nr-bar" id="mb-nr-bar">${Array.from({ length: 10 }, () => '<i class="q"></i>').join('')}<s style="left:${need}%"></s></div></div>
      </div>
      <div class="rb-act" id="mb-nr-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const act = $('#mb-nr-act');
    await api.rules({
      key: 'narrow', title: '容疑者しぼり',
      goal: `<em>${NAMES.call}</em>か<em>${NAMES.fold}</em>か、得な方を決める。答え合わせはこの手の決着の後`,
      how: `${jp}が持っていそうな手の組（容疑者）から、<em>この賭け方をめったにしない組</em>を外す。残った組にミミが勝てる割合が棒になる`,
      risk: '外しすぎ・外し忘れは、その場で×と正しい答えが出て、ご褒美が増えない',
      look: [['どれを外すか', `${jp}の癖と、この手の賭け方`], [`${NAMES.call}か${NAMES.fold}か`, `棒が線（${need}%）を超えるか`], ['自信', '棒と線の差']],
    });
    if (!api.alive()) return;
    api.tipOnce('narrow', `${jp}の癖：${HABIT[who]}`, 'think');
    api.mission('合わない組を外す');
    const out = new Set();
    root.querySelectorAll('.nr-tile').forEach(b => b.addEventListener('click', () => { if (b.disabled) return; const g = b.dataset.g; if (out.has(g)) out.delete(g); else out.add(g); b.classList.toggle('is-out', out.has(g)); api.sfx.tap(); }));
    act.innerHTML = `<div class="nr-act1"><button class="btn gold" id="mb-nr-go" type="button"><span>これで決める</span><small>外した組に×・残した組が容疑者</small></button></div>`;
    await new Promise(res => { $('#mb-nr-go').onclick = () => { api.sfx.tap(); res(); }; });
    if (!api.alive()) return;
    act.innerHTML = '';
    // 答え：組ごとに「この賭け方をする割合（10回のうち）」
    let good = 0;
    tiles.forEach(g => {
      const b = root.querySelector(`.nr-tile[data-g="${g.id}"]`); b.disabled = true;
      const k = Math.round(pAct(g.id) * 10), ok = out.has(g.id) === shouldOut(g);
      if (ok) good++;
      b.insertAdjacentHTML('beforeend', `<span class="fb ${ok ? 'ok' : 'ng'}">${ok ? '○' : '×'} ${k}/10</span><span class="nr-dots" aria-label="10回のうち${k}回">${Array.from({ length: 10 }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`);
      b.classList.toggle('is-out', shouldOut(g));
    });
    if (good === tiles.length) api.sfx.good(); else api.sfx.nope();
    api.coach(good === tiles.length ? '全部正しく外せた！' : `${tiles.length}組のうち${good}組が正解。棒は正しい残し方で作るよ`, good === tiles.length ? 'win' : 'think');
    const kept = tiles.filter(g => !shouldOut(g));
    const nAll = kept.reduce((a, g) => a + g.n, 0), wAll = kept.reduce((a, g) => a + g.win, 0);
    const winPct = Math.round(100 * wAll / Math.max(1, nAll));
    const on = Math.round(winPct / 10);
    root.querySelectorAll('#mb-nr-bar i').forEach((el, k) => { el.className = k < on ? 'on' : ''; });
    $('#mb-nr-wn').textContent = `${winPct}%`;
    await api.wait(api.reduce ? 300 : 900); if (!api.alive()) return;

    $('#mb-nr-steps').innerHTML = api.steps(STEPS, 1);
    const over = winPct > need;
    api.mission(`棒が線を超えている？`);
    act.innerHTML = `<div class="nr-act2">
      <button class="btn" id="mb-nr-call" type="button"><span>${NAMES.call}</span><small>${free ? 'チップを賭ける' : `${toCall} 払って続ける`}</small></button>
      <button class="btn quiet" id="mb-nr-fold" type="button"><span>${NAMES.fold}</span><small>${free ? 'タダで次の札へ' : 'ここまでの分をあきらめる'}</small></button></div>`;
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const onb = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-nr-call').onclick = onb('call'); $('#mb-nr-fold').onclick = onb('fold');
    });
    if (!api.alive()) return;
    act.innerHTML = '';
    api.coach('');
    $('#mb-nr-steps').innerHTML = api.steps(STEPS, 2);
    const base = 20 + good * 10;
    await api.wager({ mission: '棒と線の差で自信を決める', question: `「${NAMES[decide]}」— 棒 ${winPct}% ／ 線 ${need}%`, note: '差が大きいほど、自信を上げてよい', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const sensible = over ? 'call' : 'fold';
    const whyTxt = decide === sensible ? `棒と線のとおりの判断（差 ${Math.abs(winPct - need)}）。` : `棒と線からは「${NAMES[sensible]}」だった。`;
    if (T) {
      api.entrust({
        pick: NAMES[decide], win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'call' ? (free ? '「賭ける」と決めた。卓で賭けよう' : '「付いていく」と決めた。卓でコールしよう') : (free ? '「様子見」と決めた。卓でチェックしよう' : '「降りる」と決めた。卓で降りよう'),
        pending: { kind: 'logic', names: NAMES, title: '容疑者しぼり', charId: api.charId, pick: decide, truth, mimiEq, need, endLines: END[who], board, mine, her, base, mult: m, stakes: STAKES,
          perfect: good === tiles.length && m === 3, notes: [], why: whyTxt, extra: `残った容疑者に勝てる ${winPct}% ／ 線 ${need}%・正しく外せた ${good}/${tiles.length}` },
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.finish({ correct, base, perfect: correct && good === tiles.length && m === 3,
      detail: `${jp}は ${her.map(api.label).join(' ')}。ミミが勝つ見込み ${mimiEq}%・線 ${need}%。${whyTxt}` });
  }

  MB.register({ id: 'narrow', group: 'logic', order: 7, title: '容疑者しぼり', sub: '論理 · 手の幅', isNew: true, chars: ['selina', 'velvet'], start });
})();
