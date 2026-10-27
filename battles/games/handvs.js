// 論理：役くらべ（役づくりパズル＋ハイ＆ローをまとめた、卓の本当の手の版）2026-10-27
// ①卓のミミの札（手札2枚＋いまの場札）から一番強い5枚を選ぶ（場札が3枚の時は5枚しかないので飛ばす）。
// ②相手の賭け方に合う手の候補5つを1つずつめくり、「ミミの勝ち／引き分け／ミミの負け」を選ぶ。その場で○×と理由。
//   正しく続けるほどご褒美が上がり（20→30→45→70→100→150）、1回でも外すとそこで止まる。比べ違えても、勝ち負けの印は正しい方で付ける（見えない失敗はしない）。
// ③比べた結果（5つのうち勝てる数＝10個の印のうち2個ずつ、引き分けは1個）と、割に合う線（払う額÷(ポット＋払う額)）を比べて、付いていくか降りるかを決める。
// ④自信を賭けて卓に戻る。答え合わせは手の決着の後（verdict.js、kind:'logic'）。正解＝読んだ時にミミが相手の本当の手に勝つ見込みが線を超えていたか。
// 候補には相手の本当の手は入れない（入れると答えが漏れる）。候補のうちミミが勝てる数は、相手の大きな賭けの記録（ブラフの多さ）に合わせる。
(() => {
  const LADDER = [20, 30, 45, 70, 100, 150];
  const STAKES = [0, 1, 3];
  const PRIOR = { polka: .65, grano: .5, selina: .25, velvet: .45 };
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };
  const END = {
    polka: { bc: 'うわーん、読まれてたー！', bw: 'えへへ、降りてくれてありがと！', sc: 'ちぇっ、降りちゃうんだ……', sw: '残念っ、ボクの方が強いよー！' },
    grano: { bc: 'なんと、見抜かれましたか……', bw: 'ふふ、良い取引でした', sc: '慎重なお方ですな', sw: 'まいど、ありがとうございます' },
  };
  const OPEN = { polka: 'ボクの手、当ててみてよ！ 勝てるかな〜？', grano: 'さて、お嬢さんの手と私の品、どちらが上ですかな？' };
  const RES = { win: 'ミミの勝ち', tie: '引き分け', lose: 'ミミの負け' };

  function sig(api, cards) {
    const s = api.score(cards), cat = Math.floor(s / 1e10);
    if (cat === 4 || cat === 8) return { cat, ranks: [s - cat * 1e10] };
    if (cat === 5 || cat === 0) return { cat, ranks: cards.map(c => c.r).sort((a, b) => b - a) };
    const cnt = {}; cards.forEach(c => { cnt[c.r] = (cnt[c.r] || 0) + 1; });
    return { cat, ranks: Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a) };
  }
  // 札の組み（5枚以上）から、一番強い5枚
  function best5(api, cards) {
    const s = api.score(cards), n = cards.length;
    if (n <= 5) return cards.slice();
    const idx = [];
    const rec = (st, cur) => { if (cur.length === 5) { idx.push(cur.slice()); return; } for (let i = st; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
    for (const ix of idx) { const f = ix.map(i => cards[i]); if (api.score(f) === s) return f; }
    return cards.slice(0, 5);
  }
  function handName(api, cards) {
    const R = api.rn; const { cat, ranks } = sig(api, best5(api, cards));
    switch (cat) {
      case 0: return `役なし（上は${R(ranks[0])}）`;
      case 1: return `${R(ranks[0])}のワンペア`;
      case 2: return `${R(ranks[0])}と${R(ranks[1])}のツーペア`;
      case 3: return `${R(ranks[0])}のスリーカード`;
      case 4: return ranks[0] === 5 ? 'A〜5のストレート' : `${R(ranks[0] - 4)}〜${R(ranks[0])}のストレート`;
      case 5: return 'フラッシュ';
      case 6: return `${R(ranks[0])}と${R(ranks[1])}のフルハウス`;
      case 7: return `${R(ranks[0])}のフォーカード`;
      default: return 'ストレートフラッシュ';
    }
  }
  // 勝ち負けの理由（同じ役どうしは、比べた札まで言う）
  function why(api, mine, cand, board) {
    const a = sig(api, best5(api, mine.concat(board))), b = sig(api, best5(api, cand.concat(board)));
    const CN = api.CAT_NAME;
    if (a.cat !== b.cat) return `${CN[Math.max(a.cat, b.cat)]}は${CN[Math.min(a.cat, b.cat)]}より強い`;
    let i = 0; while (i < a.ranks.length && a.ranks[i] === b.ranks[i]) i++;
    if (i >= a.ranks.length) return `同じ${CN[a.cat]}で、5枚とも同じ強さ`;
    const R = api.rn;
    return i === 0 ? `同じ${CN[a.cat]}どうし。${R(a.ranks[0])} 対 ${R(b.ranks[0])}` : `同じ${CN[a.cat]}どうし。残りの札 ${R(a.ranks[i])} 対 ${R(b.ranks[i])}`;
  }

  // 候補5つ：ミミが勝てる数を記録（ブラフの多さ）に合わせ、半分以上を「同じ役どうし」か「強そうに見えて負ける」にする
  function makeCands(api, mine, board, her, prior) {
    const used = new Set([...mine, ...board, ...her].map(api.key));
    const rest = api.deck().filter(c => !used.has(api.key(c)));
    const sm = api.score(mine.concat(board)), cm = Math.floor(sm / 1e10);
    const pool = { win: [], tie: [], lose: [] };
    const seen = new Set();
    for (let t = 0; t < 900; t++) {
      const h = api.shuffle(rest).slice(0, 2);
      const k = h.map(api.key).sort().join();
      if (seen.has(k)) continue; seen.add(k);
      const s = api.score(h.concat(board)), c = Math.floor(s / 1e10);
      const res = sm > s ? 'win' : sm === s ? 'tie' : 'lose';
      const looks = h[0].r === h[1].r || Math.max(h[0].r, h[1].r) >= 13 || h[0].s === h[1].s;
      const think = c === cm || (res === 'win' && looks) || (res === 'lose' && !looks && c - cm <= 1);
      pool[res].push({ h, res, think, c });
    }
    const nWin = Math.max(1, Math.min(4, Math.round(5 * prior + (Math.random() - .5) * 1.6)));
    const take = (arr, n) => { const th = api.shuffle(arr.filter(x => x.think)), pl = api.shuffle(arr.filter(x => !x.think)); return th.slice(0, Math.ceil(n * .7)).concat(pl).concat(th.slice(Math.ceil(n * .7))).slice(0, n); };
    let wins = take(pool.win, nWin);
    const ties = pool.tie.length && Math.random() < .25 ? [api.pick(pool.tie)] : [];
    let loses = take(pool.lose, 5 - wins.length - ties.length);
    const all = wins.concat(ties, loses);
    while (all.length < 5) { const x = pool.win.concat(pool.lose).find(y => !all.includes(y)); if (!x) break; all.push(x); }
    return api.shuffle(all).slice(0, 5);
  }

  const CSS = `
    .hv-play { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
    .hv-ladder { display: flex; align-items: center; gap: 6px; font-family: var(--mincho); font-weight: 700; font-size: 14px; color: var(--gold); white-space: nowrap; }
    .hv-ladder i { font-style: normal; padding: 0 6px; border: 1px solid var(--line-dim); color: var(--dim); font-family: var(--mincho); font-weight: 800; font-variant-numeric: tabular-nums; }
    .hv-ladder i.on { color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border-color: var(--gold-hi); }
    .hv-ladder i.done { color: var(--gold-pale); border-color: var(--gold); }
    .hv-ladder.is-stop i.on { background: #6e655a; border-color: #8a8073; color: #f0e6d0; }
    .hv-ladder .t { color: var(--dim); }
    .hv-row { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; }
    .hv-cap { font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; margin-right: 6px; min-width: 3.5em; }
    .hv-name { font-family: var(--mincho); font-weight: 800; font-size: var(--ty-body, 17px); color: var(--gold-hi); margin-left: 8px; white-space: nowrap; }
    .hv-name.q { color: var(--dim); }
    .hv-vs { font-family: var(--disp); font-size: 22px; color: var(--red-hi); line-height: 1; transform: skewX(-12deg); align-self: center; padding-left: 3.5em; }
    .hv-pick .card { cursor: pointer; transition: transform .15s, box-shadow .15s, opacity .15s; }
    .hv-pick .card.is-on { transform: translateY(-8px); box-shadow: 0 0 0 2px var(--gold-hi), 0 8px 16px rgba(0,0,0,.5); }
    .hv-pick .card.is-off { opacity: .55; }
    .hv-pick .card.is-best { box-shadow: 0 0 0 3px var(--gold-hi), 0 0 16px rgba(245,215,122,.7); }
    .hv-res { font-family: var(--mincho); font-weight: 800; font-size: var(--ty-body, 17px); line-height: 1.4; min-height: 1.4em; }
    .hv-res .ok { color: var(--gold-hi); } .hv-res .ng { color: #ff8f9c; }
    .hv-res small { display: block; font-size: 14px; font-weight: 700; color: var(--gold-pale); }
    .hv-sit { display: flex; flex-direction: column; gap: 2px; font-family: var(--mincho); font-size: 14px; line-height: 1.35; color: var(--gold-pale); }
    .hv-sit b { color: var(--gold-hi); font-size: 16px; }
    .hv-cands { display: flex; flex-direction: column; gap: 3px; }
    .hv-cand { display: grid; grid-template-columns: 3.4em auto minmax(0, 1fr) 22px; gap: 6px; align-items: center; padding: 1px 8px; min-height: 26px; background: var(--panel); border: 1px solid var(--line-dim); font-size: 14px; line-height: 1.3; }
    .hv-cand .n { font-family: var(--mincho); font-weight: 700; color: var(--dim); white-space: nowrap; }
    .hv-cand .c { display: flex; gap: 2px; font-weight: 800; font-family: var(--mincho); white-space: nowrap; }
    .hv-cand .c .rd { color: #ff8f9c; }
    .hv-cand .r { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hv-out { display: inline-block; padding: 0 6px; font-family: var(--mincho); font-weight: 800; border: 1px solid; line-height: 1.35; }
    .hv-out.win { color: var(--gold-hi); border-color: rgba(245,215,122,.6); background: rgba(122,90,30,.3); } .hv-out.lose { color: #ff8f9c; border-color: rgba(255,143,156,.6); background: rgba(122,14,22,.35); } .hv-out.tie { color: #d8cbb0; border-color: rgba(216,203,176,.5); }
    .hv-cand .m { font-weight: 900; font-size: 17px; text-align: center; }
    .hv-cand .m.ok { color: var(--good); } .hv-cand .m.ng { color: var(--bad); }
    .hv-cand.is-now { border-color: var(--gold); background: linear-gradient(90deg, var(--band), var(--panel)); }
    .hv-bars { display: flex; flex-direction: column; gap: 4px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line); }
    .hv-bar { position: relative; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; height: 16px; }
    .hv-bar i { background: #2a0c12; border: 1px solid var(--line-dim); }
    .hv-bar i.on { background: linear-gradient(180deg, var(--gold-hi), #8a5a1e); border-color: var(--gold); }
    .hv-bar i.q { background: repeating-linear-gradient(135deg, #2a0c12 0 4px, #3a1418 4px 8px); }
    .hv-bar s { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; background: #fff3c2; box-shadow: 0 0 6px rgba(255,243,194,.8); }
    .hv-bar-t { display: flex; justify-content: space-between; gap: 8px; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold-pale); white-space: nowrap; }
    .hv-bar-t b { color: var(--gold-hi); }
    .hv-act3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; height: 100%; }
    .hv-act3 .btn, .hv-act2 .btn { margin: 0; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; }
    .hv-act3 .btn > span, .hv-act2 .btn > span { font-size: var(--ty-btn, 19px); line-height: 1.2; }
    .hv-act3 .btn > small, .hv-act2 .btn > small { font-size: 14px; line-height: 1.3; white-space: nowrap; }
    .hv-act2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; height: 100%; }
    .hv-act1 { display: flex; justify-content: center; height: 100%; }
    .hv-act1 .btn { margin: 0; width: min(420px, 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .hv-act1 .btn small { font-size: 14px; }
  `;

  async function start({ api }) {
    const who = api.charId === 'grano' ? 'grano' : 'polka';
    const jp = api.char.jp;
    const T = api.table;
    const record = [...recordOf(PRIOR[who]), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    const prior = Math.min(.9, Math.max(.1, record.filter(Boolean).length / record.length));
    // 札：卓の本当の手（本編）か、架空の場面（単独ページ：川まで5枚）
    let board, mine, her, pot, toCall;
    if (T) { board = T.board; mine = T.mine; her = T.her; pot = T.pot || 0; toCall = T.toCall || 0; }
    else {
      const d = api.shuffle(api.deck());
      mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 9); pot = 400; toCall = 200;
    }
    const mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    // 払う額が0（相手がチェック）の時は「賭けるか、様子見か」の判断にする。線は50%（勝っている方が多ければ賭ける）
    const free = toCall <= 0;
    const need = free ? 50 : Math.round(100 * toCall / (pot + toCall));
    const NAMES = free ? { call: '賭ける', fold: '様子見' } : { call: '付いていく', fold: '降りる' };
    const truth = mimiEq >= need ? 'call' : 'fold';
    const cands = makeCands(api, mine, board, her, prior);

    api.css('handvs', CSS);
    api.say(OPEN[who], 'smug'); api.bet(free ? '—' : toCall);
    const root = api.root;
    const seven = mine.concat(board);
    const doBuild = seven.length > 5;
    const STEPS = doBuild ? ['5枚を作る', 'くらべる', '決める', '賭ける'] : ['くらべる', '決める', '賭ける'];
    const S = (k) => STEPS.indexOf(k);
    const mimiName = handName(api, seven);
    root.classList.add('rb-frame');
    const ladderHTML = () => `<div class="hv-ladder" id="mb-hv-ladder"><span class="t">ご褒美</span>${LADDER.map((v, i) => `<i data-i="${i}">${v}</i>`).join('')}</div>`;
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-hv-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play hv-play" id="mb-hv-play"></div>
      <div class="rb-info">
        <div class="hv-sit"><span>ポット <b>${pot}</b>　${free ? '相手は様子見' : `払う額 <b>${toCall}</b>`}</span><span>割に合う線 <b>${need}%</b><span class="hv-why">${free ? '（勝っている方が多ければ賭ける）' : '（払う額 ÷ 払った後のポット）'}</span></span></div>
        <div class="hv-cands" id="mb-hv-cands">${cands.map((c, i) => `<div class="hv-cand" data-i="${i}"><span class="n">候補${i + 1}</span><span class="c">？？</span><span class="r"></span><b class="m"></b></div>`).join('')}</div>
        <div class="hv-bars"><div class="hv-bar-t"><span>勝てる候補 <b id="mb-hv-wn">？</b></span><span>線 ${need}%</span></div>
          <div class="hv-bar" id="mb-hv-bar">${Array.from({ length: 10 }, () => '<i class="q"></i>').join('')}<s style="left:${need}%"></s></div></div>
      </div>
      <div class="rb-act" id="mb-hv-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const play = $('#mb-hv-play'), act = $('#mb-hv-act');
    let lad = 0, stopped = false;
    const drawLadder = () => { const el = $('#mb-hv-ladder'); if (!el) return; el.classList.toggle('is-stop', stopped); el.querySelectorAll('i').forEach((x, i) => { x.className = i === lad ? 'on' : i < lad ? 'done' : ''; }); };
    const stepUp = (ok) => { if (ok && !stopped) lad = Math.min(LADDER.length - 1, lad + 1); if (!ok) stopped = true; drawLadder(); };
    const cardsTxt = (h) => h.map(c => `<span class="${c.s === 'h' || c.s === 'd' ? 'rd' : ''}">${api.rn(c.r)}${api.SYM[c.s]}</span>`).join('');

    await api.rules({
      key: 'handvs', title: '役くらべ',
      goal: `<em>${NAMES.call}</em>か<em>${NAMES.fold}</em>か、得な方を決める。答え合わせはこの手の決着の後`,
      how: `${doBuild ? 'ミミの一番強い5枚を選ぶ。次に、' : ''}${jp}の手の候補5つとミミの手を1つずつ比べる。勝てる候補の数が棒になる`,
      risk: '比べ違えると、ご褒美の上がり（20→150）がそこで止まる',
      look: [['どちらが勝つか', '役の強さ。同じ役なら大きい数字'], [`${NAMES.call}か${NAMES.fold}か`, `棒が線（${need}%）を超えるか`], ['自信', '棒と線の差']],
    });
    if (!api.alive()) return;

    // ① 5枚を作る（場札が4枚以上の時）
    if (doBuild) {
      api.mission('一番強い5枚を選ぶ');
      api.tipOnce('handvs', '役の強さ順は、上の「役の一覧」と同じ', 'think');
      const sel = new Set();
      play.innerHTML = `${ladderHTML()}<div class="hv-cap">ミミの札（手札＋場札）</div><div class="hv-row hv-pick" id="mb-hv-seven">${seven.map((c, i) => api.cardHTML(c, '').replace('class="card', `data-i="${i}" class="card`)).join('')}</div>
        <div class="hv-res" id="mb-hv-bres">選んだ5枚：<span id="mb-hv-bname" class="hv-name q">あと5枚</span></div>`;
      drawLadder();
      const draw = () => {
        play.querySelectorAll('#mb-hv-seven .card').forEach((el, i) => { el.classList.toggle('is-on', sel.has(i)); el.classList.toggle('is-off', sel.size >= 5 && !sel.has(i)); });
        const nm = $('#mb-hv-bname');
        if (sel.size === 5) { nm.textContent = handName(api, [...sel].map(i => seven[i])); nm.classList.remove('q'); } else { nm.textContent = `あと${5 - sel.size}枚`; nm.classList.add('q'); }
        const b = $('#mb-hv-build'); if (b) b.disabled = sel.size !== 5;
      };
      act.innerHTML = `<div class="hv-act1"><button class="btn gold" id="mb-hv-build" type="button" disabled><span>この5枚で決める</span><small>一番強ければ ご褒美 20→30</small></button></div>`;
      play.querySelectorAll('#mb-hv-seven .card').forEach((el, i) => el.addEventListener('click', () => { if (sel.has(i)) sel.delete(i); else if (sel.size < 5) sel.add(i); api.sfx.tap(); draw(); }));
      await new Promise(res => { $('#mb-hv-build').onclick = () => { api.sfx.tap(); res(); }; });
      if (!api.alive()) return;
      const picked = [...sel].map(i => seven[i]);
      const ok = api.score(picked) === api.score(seven);
      const best = best5(api, seven);
      play.querySelectorAll('#mb-hv-seven .card').forEach((el, i) => { el.classList.remove('is-on', 'is-off'); el.classList.toggle('is-best', best.includes(seven[i])); el.style.pointerEvents = 'none'; });
      $('#mb-hv-bres').innerHTML = ok ? `<span class="ok">○ 一番強い5枚：${mimiName}</span>` : `<span class="ng">× 一番強いのは光った5枚：${mimiName}</span>`;
      if (ok) api.sfx.good(); else api.sfx.nope();
      stepUp(ok);
      act.innerHTML = '';
      await api.wait(api.reduce ? 300 : 1300); if (!api.alive()) return;
    }

    // ② くらべる：候補を1つずつ
    $('#mb-hv-steps').innerHTML = api.steps(STEPS, S('くらべる'));
    api.mission(`どちらが強い？`);
    if (!doBuild) api.tipOnce('handvs', '同じ役なら、比べる札の大きい方が勝ち', 'think');
    let wins = 0;
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      const row = root.querySelector(`.hv-cand[data-i="${i}"]`);
      root.querySelectorAll('.hv-cand').forEach(r => r.classList.remove('is-now'));
      row.classList.add('is-now'); row.querySelector('.c').innerHTML = cardsTxt(c.h);
      play.innerHTML = `${ladderHTML()}
        <div class="hv-row"><span class="hv-cap">場札</span>${board.map(x => api.cardHTML(x, 'small')).join('')}</div>
        <div class="hv-row"><span class="hv-cap">ミミ</span>${mine.map(x => api.cardHTML(x, '')).join('')}<span class="hv-name">${mimiName}</span></div>
        <div class="hv-vs">VS</div>
        <div class="hv-row"><span class="hv-cap">候補${i + 1}</span>${c.h.map(x => api.cardHTML(x, '')).join('')}<span class="hv-name q" id="mb-hv-cname">？</span></div>
        <div class="hv-res" id="mb-hv-res"></div>`;
      drawLadder();
      const nextV = LADDER[Math.min(LADDER.length - 1, lad + 1)];
      act.innerHTML = `<div class="hv-act3">
        <button class="btn" data-a="win" type="button"><span>ミミの勝ち</span><small>${stopped ? '' : `当たれば ${api.coin(nextV)}`}</small></button>
        <button class="btn quiet" data-a="tie" type="button"><span>引き分け</span><small>まったく同じ強さ</small></button>
        <button class="btn quiet" data-a="lose" type="button"><span>ミミの負け</span><small>${jp}の方が強い</small></button></div>`;
      const a = await new Promise(res => act.querySelectorAll('button').forEach(b => { b.onclick = () => { api.sfx.tap(); res(b.dataset.a); }; }));
      if (!api.alive()) return;
      const ok = a === c.res;
      if (c.res === 'win') wins += 1; else if (c.res === 'tie') wins += .5;
      $('#mb-hv-cname').textContent = handName(api, c.h.concat(board)); $('#mb-hv-cname').classList.remove('q');
      $('#mb-hv-res').innerHTML = `<span class="${ok ? 'ok' : 'ng'}">${ok ? '○' : '×'} ${RES[c.res]}</span><small>${why(api, mine, c.h, board)}</small>`;
      row.querySelector('.r').className = 'r ' + c.res; row.querySelector('.r').innerHTML = `<span class="hv-out ${c.res}">${{ win: '勝ち', lose: '負け', tie: '分け' }[c.res]}</span>`;
      const m = row.querySelector('.m'); m.textContent = ok ? '○' : '×'; m.className = 'm ' + (ok ? 'ok' : 'ng');
      // 勝てる候補の棒：2個ずつ（引き分けは1個）
      const on = Math.round(wins * 2);
      root.querySelectorAll('#mb-hv-bar i').forEach((el, k) => { el.className = k < on ? 'on' : k < (i + 1) * 2 ? '' : 'q'; });
      $('#mb-hv-wn').textContent = `${wins % 1 ? wins.toFixed(1) : wins}／${i + 1}`;
      if (ok) api.sfx.good(); else api.sfx.nope();
      stepUp(ok);
      act.querySelectorAll('button').forEach(b => { b.disabled = true; });
      await api.wait(api.reduce ? 300 : 1500); if (!api.alive()) return;
    }
    root.querySelectorAll('.hv-cand').forEach(r => r.classList.remove('is-now'));
    const winPct = Math.round(wins / cands.length * 100);
    $('#mb-hv-wn').textContent = `${wins % 1 ? wins.toFixed(1) : wins}／5（${winPct}%）`;

    // ③ 決める
    $('#mb-hv-steps').innerHTML = api.steps(STEPS, S('決める'));
    const over = winPct > need;
    api.mission(`棒が線を超えている？`);
    play.innerHTML = `${ladderHTML()}
      <div class="hv-row"><span class="hv-cap">場札</span>${board.map(x => api.cardHTML(x, 'small')).join('')}</div>
      <div class="hv-row"><span class="hv-cap">ミミ</span>${mine.map(x => api.cardHTML(x, '')).join('')}<span class="hv-name">${mimiName}</span></div>
      <div class="hv-res">勝てる候補 ${winPct}% ／ 線 ${need}%<small>${over ? `棒が線を超えている＝${NAMES.call}のが得` : `棒が線に届かない＝${NAMES.fold}のが得`}（決着までの札で変わることもある）</small></div>`;
    drawLadder();
    act.innerHTML = `<div class="hv-act2">
      <button class="btn" id="mb-hv-call" type="button"><span>${NAMES.call}</span><small>${free ? 'チップを賭ける' : `${toCall} 払って続ける`}</small></button>
      <button class="btn quiet" id="mb-hv-fold" type="button"><span>${NAMES.fold}</span><small>${free ? 'タダで次の札へ' : 'ここまでの分をあきらめる'}</small></button></div>`;
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-hv-call').onclick = on('call'); $('#mb-hv-fold').onclick = on('fold');
    });
    if (!api.alive()) return;
    act.innerHTML = '';
    $('#mb-hv-steps').innerHTML = api.steps(STEPS, S('賭ける'));
    const base = LADDER[lad];
    const gap = Math.abs(winPct - need);
    await api.wager({ mission: '棒と線の差で自信を決める', question: `「${NAMES[decide]}」— 棒 ${winPct}% ／ 線 ${need}%`, note: '差が大きいほど、自信を上げてよい', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const sensible = over ? 'call' : 'fold';
    const whyTxt = (decide === sensible ? `棒と線のとおりの判断（差 ${gap}）。` : `棒と線からは「${NAMES[sensible]}」だった。`);
    const notes = cands.map((c, i) => ({ label: `候補${i + 1} ${c.h.map(api.label).join(' ')}：${RES[c.res]}`, lean: c.res === 'lose' ? 'fold' : 'call' }));
    if (T) {
      api.entrust({
        pick: NAMES[decide], win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'call' ? (free ? '「賭ける」と決めた。卓で賭けよう' : '「付いていく」と決めた。卓でコールしよう') : (free ? '「様子見」と決めた。卓でチェックしよう' : '「降りる」と決めた。卓で降りよう'),
        pending: { kind: 'logic', names: NAMES, title: '役くらべ', charId: api.charId, pick: decide, truth, mimiEq, need, endLines: END[who], board, mine, her, base, mult: m, stakes: STAKES,
          perfect: !stopped && m === 3, notes: [], why: whyTxt, extra: `勝てる候補 ${winPct}% ／ 線 ${need}%・ご褒美のもと ${base}` },
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.finish({ correct, base, perfect: correct && !stopped && m === 3,
      detail: `${jp}は ${her.map(api.label).join(' ')}（${handName(api, her.concat(board))}）。ミミが勝つ見込み ${mimiEq}%・線 ${need}%。${whyTxt}` });
    void notes;
  }

  MB.register({ id: 'handvs', group: 'logic', order: 6, title: '役くらべ', sub: '論理 · 役の強さ', isNew: true, chars: ['polka', 'grano'], start });
})();
