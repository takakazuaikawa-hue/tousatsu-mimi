// 心理：異議あり！（ヴェルベット卓の看板）— 卓の本当の手の版（2026-10-23）
// ヴェルベットが「自分の手」について3つ言う。ウソは1つだけ。ウソの発言と、それと食い違う証拠を1組選んで突きつける。
// 発言と証拠は、台本ではなく卓の本当の手（相手の手札・場札・ミミの手札・この手の相手の賭け方）から毎回作る。
// ウソの向き：ブラフ（ミミの方が強い）なら、持っていない物を「持ってる」と強がる。本物（ミミより強い）なら、持っている物を「持ってない」と弱いふりをする。
// → 見つけたウソの逆が本当。天秤に重り（確かさ◆◆◆）が乗る。読みを預けて卓に戻り、答え合わせは手の決着の後（verdict.js）。
// 本当の手が渡らない時（単独ページ）は、架空の手を配って同じ作り方で遊び、その場で答え合わせする。
(() => {
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  const DIR = { bluff: '強がりのウソ', strong: '弱いふりのウソ' };
  const STAKES = [0, 1, 3];
  const LIE_ACC = .95;          // 見つけたウソの重り（◆◆◆）
  const PRIOR = .45;            // ヴェルベットのブラフの多さ（全部の心理バトルで同じ）
  const STREETS = ['flop', 'turn', 'river'];
  const STN = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };
  const pips = (n) => `<span class="oj-pips" aria-label="確かさ${n}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  // 賭けの大きさ（賭ける前のポットに対して）。卓の記録の文字は4字まで（スマホの札1枚の幅に収める）
  const ratio = (a) => a.a / Math.max(1, a.p);
  const actWord = (a) => a.t === 'check' ? 'チェック' : a.t === 'call' ? 'コール' : a.t === 'allin' ? '全部' : a.t === 'raise' ? 'レイズ'
    : ratio(a) < .4 ? '小さく' : ratio(a) < .75 ? '半分' : ratio(a) < 1.25 ? '同額' : '大きく';
  const actSay = (a) => a.t === 'check' ? 'チェック|したの' : a.t === 'call' ? 'コール|しただけ' : a.t === 'allin' ? '全部|賭けたの' : a.t === 'raise' ? '上乗せ|したの'
    : ratio(a) < .4 ? '小さく|賭けただけ' : ratio(a) < .75 ? 'ポットの|半分を|賭けたの' : ratio(a) < 1.25 ? 'ポットと|同じだけ|賭けたの' : 'ポットより|多く|賭けたの';
  const POW = { check: 0, call: 1, bet: 2, raise: 3, allin: 4 };
  // 文の中の | は「ここで折ってよい」印。画面では <wbr> にし、ほかの所では折らない（word-break: keep-all）。自動の文節判定は語の途中で折ることがあった
  const W = (t) => String(t).split('|').join('<wbr>');
  const P = (t) => String(t).split('|').join('');
  const NEUTRAL = ['足を|組んだまま、|姿勢を|崩さない', '賭けるたびに、|ミミの顔を|じっと|見てくる', 'グラスの|ワインを、|ゆっくり|回している', 'チップを|積む手は、|最初から|最後まで|同じ速さ'];
  const TAUNT = ['ざぁこ♡ それのどこが食い違いなの？', 'え〜？ ぜんぜん読めてないの、かわいそ♡', 'ぶっぶー♡ もっと頭使いなさいよ', 'はずれ♡ あたしの言葉、ぜーんぶ本当なの'];
  const END = { bc: 'う、うそ……あたしのブラフが……！', bw: 'ふふっ、降りちゃった♡ ざぁこ♡', sc: '……ちっ。逃げ足だけは速いのね', sw: 'ざぁんねん♡ 本物なの' };
  let lastLie = null;

  MB.register({ id: 'objection', group: 'psych', order: 4, title: '異議あり！', sub: '心理 · 証拠', isNew: true, chars: ['velvet'], start });

  // 架空の手（単独ページ用）：ミミに役がある場面を配り、通りごとの相手の賭け方も作る（最後の通りで大きく賭けた所）
  function dealFake(api) {
    const want = Math.random() < PRIOR ? 'bluff' : 'strong';
    for (let k = 0; k < 300; k++) {
      const d = api.shuffle(api.deck());
      const phase = api.pick(STREETS), n = 3 + STREETS.indexOf(phase);
      const mine = d.slice(0, 2), her = d.slice(2, 4), board = d.slice(4, 4 + n);
      if (api.category(mine.concat(board)) < 1) continue;
      const truth = api.headsUp(mine, her, board) >= .5 ? 'bluff' : 'strong';
      if (truth !== want && k < 250) continue;
      let pot = 300; const acts = [];
      STREETS.slice(0, n - 2).forEach((ph, i, arr) => {
        const last = i === arr.length - 1;
        const t = last ? 'bet' : api.pick(['check', 'check', 'bet', 'call']);
        const a = t === 'check' ? 0 : t === 'call' ? Math.round(pot * .3) : last ? Math.round(pot * api.pick([.7, 1, 1.4])) : Math.round(pot * .3);
        acts.push({ ph, t, a, p: pot }); pot += a * (t === 'call' ? 2 : 1);
      });
      return { board, mine, her, acts, bet: acts[acts.length - 1].a };
    }
    return null;
  }

  // 発言3つ（ウソ1つ）と証拠3つを、本当の手から作る
  function build(api, truth, board, mine, her, acts) {
    const cat = (cs) => api.category(cs), sc = (cs) => api.score(cs);
    const R = (r) => api.rn(r);
    const lab = (c) => `<b class="oj-cl${c.s === 'h' || c.s === 'd' ? ' red' : ''}">${api.rn(c.r)}${api.SYM[c.s]}</b>`;
    const sym = (s) => `<b class="oj-cl${s === 'h' || s === 'd' ? ' red' : ''}">${api.SYM[s]}</b>`;
    const herAll = her.concat(board), mineSc = sc(mine.concat(board));
    const bRanks = new Set(board.map(c => c.r));
    const used = new Set([...board, ...mine, ...her].map(api.key));
    const cnt = {}; board.forEach(c => { cnt[c.s] = (cnt[c.s] || 0) + 1; });
    const X = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], nX = cnt[X] || 0, herX = her.filter(c => c.s === X).length, SN = api.SUIT_NAME[X];
    const sts = STREETS.slice(0, board.length - 2);
    const stOf = (i) => (i < 3 ? 'flop' : i === 3 ? 'turn' : 'river');
    const streetActs = (st) => acts.filter(a => a.ph === st);
    const top = (st) => streetActs(st).slice().sort((a, b) => POW[b.t] - POW[a.t] || b.a - a.a)[0] || null;
    const clearlySmall = (st) => { const a = top(st); return !!a && (a.t === 'check' || a.t === 'call' || ((a.t === 'bet' || a.t === 'raise') && ratio(a) < .4)); };
    // i 枚目の場札で、ヴェルベットの手（手札と合わせて）が上がったか。場札だけで役が上がった時は数えない
    const helps = (i) => cat(her.concat(board.slice(0, i + 1))) > cat(her.concat(board.slice(0, i))) && cat(board.slice(0, i + 1)) === cat(board.slice(0, i));
    // 手札の1枚が決め手か：その1枚を役に関わらない札に替えると、ミミに負ける
    const blank = api.deck().find(c => !used.has(api.key(c)) && !bRanks.has(c.r) && c.s !== X && !her.some(h => h.r === c.r) && !mine.some(m => m.r === c.r) && c.r <= 7);
    const decisive = (d) => blank && sc(herAll) > mineSc && sc([her.find(h => h !== d), blank].concat(board)) < mineSc;
    const pair0 = her[0].r === her[1].r;
    const hi = her.slice().sort((a, b) => b.r - a.r);
    const L = [];
    if (truth === 'strong') {
      const d = hi.find(c => (bRanks.has(c.r) || pair0) && decisive(c));
      if (d) L.push({ id: 's_rank', topic: { rank: d.r }, key: 'wit', say: `${R(d.r)}？ |そんなの|持ってないの♡`, short: `「${R(d.r)}は|持ってない」`, fact: `本当は|${lab(d)}を|持っている`,
        wit: { head: '鏡の目撃', text: `後ろの鏡に、|札が|一瞬|映った。|${lab(d)}|だった` }, panic: 'か、鏡なんてずるいの！ 反則なの！' });
      if (nX >= 3 && herX >= 1 && cat(herAll) === 5) L.push({ id: 's_suit', topic: { suit: X }, key: 'wit', say: `${SN}は|1枚も|持ってないの♡`, short: `「${SN}は|1枚も|持ってない」`, fact: `本当は|${SN}を|持っている|（フラッシュ）`,
        wit: { head: 'めくれた札', text: `配る時、|札が|1枚|めくれかけた。|角に|${sym(X)}が|見えた` }, panic: 'な、なんで見てるのよ！ ディーラーのくせに！' });
      [4, 3].forEach(i => { if (i < board.length && helps(i)) { const c = board[i], st = stOf(i); L.push({ id: 's_fell', topic: { card: api.key(c), rank: c.r, street: st }, key: 'wit', say: `${STN[st]}の${lab(c)}？ |あたしには|関係ないの`, short: `「${STN[st]}の${api.label(c)}は|関係ない」`, fact: `本当は|${lab(c)}で|手が|強くなった`,
        wit: { head: '仕草', text: `${STN[st]}の${lab(c)}が|落ちた瞬間、|<b>チップへ手が伸びた</b>` }, panic: 'て、手が勝手に動いただけなの！' }); } });
      const flop = board.slice(0, 3);
      if (!pair0 && cat(flop) === 0 && her.some(h => flop.some(f => f.r === h.r))) L.push({ id: 's_flop', topic: { street: 'flop' }, key: 'wit', say: 'フロップ？ |関係ない|札ばっかりなの', short: '「フロップは|関係ない札|ばっかり」', fact: '本当は|フロップで|手ができた',
        wit: { head: '仕草', text: 'フロップが|開いた瞬間、|<b>目がきらっと光った</b>' }, panic: 'ひ、光ってないの！' });
      if (pair0 || Math.min(her[0].r, her[1].r) >= 10) L.push({ id: 's_deal', topic: { deal: 1 }, key: 'wit', say: '配られた札、|最悪だったの♡', short: '「配られた札は|最悪」', fact: '本当は|配られた札が|良かった',
        wit: { head: '仕草', text: '手札が|配られた瞬間、|口元だけ|<b>にやっと笑った</b>' }, panic: 'わ、笑ってなんかないの！ 見間違いなの！' });
      if (!L.length) { const h = hi[0]; L.push({ id: 's_high', topic: { rank: h.r }, key: 'wit', say: `${R(h.r)}は|持ってないの。|ざんねん♡`, short: `「${R(h.r)}は|持ってない」`, fact: `本当は|${lab(h)}を|持っている`,
        wit: { head: '鏡の目撃', text: `後ろの鏡に、|札が|一瞬|映った。|${lab(h)}|だった` }, panic: 'か、鏡なんてずるいの！ 反則なの！' }); }
    } else {
      const m = mine.find(c => bRanks.has(c.r)) || mine.slice().sort((a, b) => b.r - a.r)[0];
      L.push({ id: 'b_mine', topic: { rank: m.r, card: api.key(m) }, key: 'mine', say: bRanks.has(m.r) ? `${lab(m)}を|持ってるの。|${R(m.r)}が${board.filter(c => c.r === m.r).length + 1}枚よ♡` : `${lab(m)}を|持ってるの。|あなたより|上よ♡`, short: `「${api.label(m)}を|持ってる」`, fact: `${lab(m)}は|ミミの手札＝|持っていない`,
        panic: 'う、うそ……あなたの札なんて見てなかったの……！' });
      const b = board.slice().sort((a, b2) => b2.r - a.r)[0];
      L.push({ id: 'b_board', topic: { rank: b.r, card: api.key(b) }, key: 'log', say: `手札に|${lab(b)}が|あるの。|これで|勝ちよ♡`, short: `「手札に|${api.label(b)}が|ある」`, fact: `${lab(b)}は|場札にある＝|持っていない`,
        panic: 'う、うそ……場札なんて見てなかったの……！' });
      if (nX >= 3 && herX <= 1) { const d = her.find(c => c.s !== X); L.push({ id: 'b_suit2', topic: { suit: X }, key: 'wit', say: `2枚とも|${SN}なの。|フラッシュよ♡`, short: `「2枚とも|${SN}」`, fact: `${SN}でない札が|ある＝|フラッシュは|無い`,
        wit: { head: 'めくれた札', text: `配る時、|札が|1枚|めくれかけた。|角に|${sym(d.s)}が|見えた` }, panic: 'み、見てたの！？ ディーラーのくせに！' }); }
      const small = sts.slice(0, -1).find(clearlySmall);
      if (small) L.push({ id: 'b_log', topic: { street: 'all' }, key: 'log', say: 'フロップから|ずっと|大きく|賭けてるの♡', short: '「フロップから|ずっと|大きく|賭けてる」', fact: `${STN[small]}は|「${actWord(top(small))}」|だった＝|最初から|強くはない`,
        panic: 'き、記録なんて反則なの！' });
      [4, 3].forEach(i => { if (i < board.length && !helps(i) && cat(her.concat(board.slice(0, i + 1))) === cat(her.concat(board.slice(0, i)))) { const c = board[i], st = stOf(i); L.push({ id: 'b_fell', topic: { card: api.key(c), rank: c.r, street: st }, key: 'wit', say: `${STN[st]}の${lab(c)}で、|手が|できたの♡`, short: `「${STN[st]}の${api.label(c)}で|手ができた」`, fact: `${lab(c)}では|手は|できていない`,
        wit: { head: '仕草', text: `${STN[st]}の${lab(c)}が|落ちた時、|<b>小さくため息</b>を|ついた` }, panic: 'た、ため息なんてついてないの！' }); } });
    }
    const pool = L.filter(l => l.id !== lastLie);
    const lie = api.pick(pool.length ? pool : L); lastLie = lie.id;

    // 本当の発言（2つ）：ウソと同じ話題（札・マーク・通り）は避ける。どれも本当の手のとおり
    const t = lie.topic, F = [];
    board.forEach(c => { if (!her.some(h => h.r === c.r) && c.r !== t.rank && !F.some(f => f.rank === c.r)) F.push({ id: 'f_rank', rank: c.r, say: api.pick([`${R(c.r)}は|持ってないの。|ほんとよ♡`, `${R(c.r)}？ |持ってないの`]) }); });
    if (t.street !== 'all') sts.forEach(st => { const a = top(st); if (a && st !== t.street) F.push({ id: 'f_log', st, say: `${STN[st]}は、|${actSay(a)}` }); });
    [3, 4].forEach(i => { if (i < board.length && !helps(i) && api.key(board[i]) !== t.card && stOf(i) !== t.street) F.push({ id: 'f_meh', st: stOf(i), say: `${STN[stOf(i)]}の${lab(board[i])}？ |ふーん、|って感じ` }); });
    if (nX >= 2 && t.suit !== X && herX <= 1) F.push({ id: 'f_suit', say: herX ? `${SN}は|1枚だけなの` : `${SN}は|1枚も|持ってないの` });
    const truths = [];
    for (const f of api.shuffle(F)) { if (truths.length >= 2) break; if (truths.some(g => g.id === f.id)) continue; if (f.id === 'f_log' && t.street && t.street === f.st) continue; truths.push(f); }
    while (truths.length < 2) truths.push({ id: 'f_wine', say: truths.some(g => g.id === 'f_wine') ? 'この席、|いちばん|好きなの' : 'ワインは、|赤しか|飲まないの' });

    const says = [{ say: lie.say, lie: true }, ...truths.map(f => ({ say: f.say, lie: false }))];
    const wit = lie.wit || { head: '仕草', text: api.pick(NEUTRAL), neutral: true };
    return { lie, says, wit, lab, sts, top };
  }

  async function start({ api }) {
    const T = api.table;
    let board, mine, her, acts, bet;
    if (T) { board = T.board; mine = T.mine; her = T.her; acts = T.acts || []; bet = T.toCall || '—'; }
    else { const f = dealFake(api); board = f.board; mine = f.mine; her = f.her; acts = f.acts; bet = f.bet; }
    api.setOpp('velvet', 'ざぁこ♡ あたしの言葉、ぜーんぶ本当なの', bet, 'smug');
    const jp = api.char.jp;
    const record = [...recordOf(PRIOR), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    const prior = Math.min(.9, Math.max(.1, record.filter(Boolean).length / record.length));
    const mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    const truth = mimiEq >= 50 ? 'bluff' : 'strong';
    const B = build(api, truth, board, mine, her, acts);
    const { lie, wit, lab } = B;
    const mimiHandName = api.CAT_NAME[api.category(mine.concat(board))];

    api.css('objection', CSS);
    const root = api.root;
    root.classList.add('rb-frame', 'oj-root');
    const order = api.shuffle([0, 1, 2]);
    const stepNames = ['ウソを探す', '読む', '賭ける', '答え合わせ'];
    // 卓の記録：通りごとに場札と、その通りのヴェルベットの一番強い動き
    const logHTML = B.sts.map(st => { const cs = st === 'flop' ? board.slice(0, 3) : st === 'turn' ? [board[3]] : [board[4]]; const a = B.top(st);
      return `<div class="oj-st is-${st}"><span class="oj-cs">${cs.map(c => api.cardHTML(c, 'small')).join('')}</span><span class="oj-aw${a && a.t !== 'check' && a.t !== 'call' ? ' is-bet' : ''}">${a ? actWord(a) : '—'}</span></div>`; }).join('');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-oj-steps">${api.steps(stepNames, 0)}</div></div>
      <div class="rb-play oj-says" id="mb-oj-says">
        <div class="oj-h"><span class="oj-hn">${jp}の発言</span><b>ウソは1つ</b></div>
        ${order.map((i, n) => `<div class="oj-say" role="button" tabindex="0" data-i="${i}"><span class="oj-no">${n + 1}</span><p>「${W(B.says[i].say)}」</p></div>`).join('')}
      </div>
      <div class="rb-info oj-evs" id="mb-oj-evs">
        <div class="oj-ev k-log" role="button" tabindex="0" data-e="log"><div class="oj-eh">卓の記録<small>場札と${jp}の賭け</small></div><div class="oj-log">${logHTML}</div></div>
        <div class="oj-ev k-mine" role="button" tabindex="0" data-e="mine"><div class="oj-eh">ミミの手札</div><span class="oj-cs">${mine.map(c => api.cardHTML(c, 'small')).join('')}</span><span class="oj-mn">${mimiHandName}</span></div>
        <div class="oj-ev k-wit" role="button" tabindex="0" data-e="wit"><div class="oj-eh">${wit.head}</div><p>${W(wit.text)}</p></div>
      </div>
      <div class="rb-act oj-act" id="mb-oj-act"><div class="oj-bar">
        <div class="oj-cred" aria-label="信用 3"><span>信用</span><i></i><i></i><i></i></div>
        <button class="btn oj-go" id="mb-oj-go" type="button" disabled>つきつける！<small>OBJECTION</small></button>
      </div></div>
      <svg class="oj-thread" id="mb-oj-thread" aria-hidden="true"></svg>`;
    const $ = (s) => root.querySelector(s);
    const thread = $('#mb-oj-thread'), go = $('#mb-oj-go');
    const MS = ['ウソの発言を選ぶ', '食い違う証拠を選ぶ', 'つきつける！'];
    let selS = null, selE = null, misses = 0, busy = false, done = false;
    const setStep = (n, m) => { $('#mb-oj-steps').innerHTML = api.steps(stepNames, n); api.mission(m); };
    setStep(0, MS[0]);

    await api.rules({
      key: 'objection', title: '異議あり！',
      goal: `${jp}の伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む`,
      how: `${jp}の3つの発言のうち、<em>ウソは1つ</em>。ウソと、食い違う証拠を選んで突きつける`,
      risk: '外すと信用が1つ減る。3回外すと、記録だけで読む',
      look: [['発言と証拠', '札・マーク・通りが食い違う組'], ['本物かブラフか', '強がりのウソ＝ブラフ／弱いふりのウソ＝本物'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    api.tipOnce('objection', 'ウソの<b>逆</b>が本当', 'think');

    // 選んだ発言と証拠を、赤い糸で結ぶ
    const drawThread = (gold) => {
      const a = selS == null ? null : root.querySelector(`.oj-say[data-i="${selS}"]`);
      const b = selE == null ? null : root.querySelector(`.oj-ev[data-e="${selE}"]`);
      if (!a || !b) { thread.innerHTML = ''; return; }
      const Rt = root.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const z = Rt.width / (root.offsetWidth || Rt.width) || 1;   // zoom の中でも CSS px で描く
      const x1 = (ra.right - Rt.left) / z - 4, y1 = (ra.top + ra.height / 2 - Rt.top) / z, x2 = (rb.left - Rt.left) / z + 4, y2 = (rb.top + rb.height / 2 - Rt.top) / z;
      const mx = (x1 + x2) / 2, len = Math.hypot(x2 - x1, y2 - y1) * 1.3 + 20;
      thread.setAttribute('viewBox', `0 0 ${root.offsetWidth} ${root.offsetHeight}`);
      thread.classList.toggle('is-gold', !!gold);
      thread.innerHTML = `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" style="--len:${len}"></path><circle cx="${x1}" cy="${y1}" r="5"></circle><circle cx="${x2}" cy="${y2}" r="5"></circle>`;
    };
    const onResize = () => { if (!api.alive()) { window.removeEventListener('resize', onResize); return; } drawThread(thread.classList.contains('is-gold')); };
    window.addEventListener('resize', onResize);
    const refresh = () => {
      root.querySelectorAll('.oj-say').forEach(el => el.classList.toggle('sel', +el.dataset.i === selS));
      root.querySelectorAll('.oj-ev').forEach(el => el.classList.toggle('sel', el.dataset.e === selE));
      $('#mb-oj-says').classList.toggle('is-next', selS == null && !done);
      $('#mb-oj-evs').classList.toggle('is-next', selS != null && selE == null && !done);
      go.disabled = busy || done || selS == null || selE == null;
      if (!done) setStep(0, MS[selS == null ? 0 : selE == null ? 1 : 2]);
      drawThread(false);
    };
    const pickEl = (el) => {
      if (busy || done) return;
      api.sfx.tap(); api.coach('');
      if (el.classList.contains('oj-say')) selS = +el.dataset.i; else selE = el.dataset.e;
      refresh();
    };
    root.addEventListener('click', (e) => { const el = e.target.closest('.oj-say, .oj-ev'); if (el && root.contains(el)) pickEl(el); });
    root.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target.closest('.oj-say, .oj-ev'); if (el) { e.preventDefault(); pickEl(el); } });
    refresh();

    const lieEl = () => root.querySelector('.oj-say[data-i="0"]');
    const markFound = () => {
      const sEl = lieEl(), eEl = root.querySelector(`.oj-ev[data-e="${lie.key}"]`);
      sEl.classList.add('is-lie'); sEl.insertAdjacentHTML('beforeend', '<span class="oj-stamp">ウソ</span>');
      eEl.classList.add('is-key'); eEl.insertAdjacentHTML('beforeend', '<span class="oj-stamp gold">決め手</span>');
      selS = 0; selE = lie.key;
      root.querySelectorAll('.oj-say, .oj-ev').forEach(el => { el.classList.remove('sel'); if (el !== sEl && el !== eEl) el.classList.add('is-off'); });
      $('#mb-oj-says').classList.remove('is-next'); $('#mb-oj-evs').classList.remove('is-next');
      drawThread(true);
    };
    const tried = new Set();
    const outcome = await new Promise((resolve) => {
      go.addEventListener('click', async () => {
        if (busy || done || selS == null || selE == null || !api.alive()) return;
        const k = selS + ':' + selE;
        if (tried.has(k)) { api.sfx.nope(); api.coach('その組は、もう試した'); return; }
        tried.add(k); busy = true; refresh();
        api.sfx.drum(); root.classList.add('is-charge');
        await api.wait(api.reduce ? 150 : 750);
        if (!api.alive()) return;
        root.classList.remove('is-charge');
        const hitS = selS === 0, hitE = selE === lie.key;
        if (hitS && hitE) {
          done = true; slam(api, lie.panic); markFound();
          await api.wait(api.reduce ? 500 : 1750);
          if (!api.alive()) return;
          return resolve('found');
        }
        misses++;
        miss(api, api.pick(TAUNT));
        const pip = root.querySelectorAll('.oj-cred i')[3 - misses]; if (pip) pip.classList.add('broken');
        root.querySelector('.oj-cred').setAttribute('aria-label', '信用 ' + (3 - misses));
        root.querySelectorAll('.oj-say.sel, .oj-ev.sel').forEach(el => { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); });
        if (misses >= 3) {
          done = true;
          api.say('もう何を言っても信じないの♡ ざぁこ♡', 'smug');
          api.coach('ウソは見つからず。ここからは<b>記録</b>だけで読む', 'lose');
          selS = null; selE = null; thread.innerHTML = '';
          root.querySelectorAll('.oj-say, .oj-ev').forEach(el => el.classList.remove('sel'));
          $('#mb-oj-says').classList.remove('is-next'); $('#mb-oj-evs').classList.remove('is-next');
          await api.wait(api.reduce ? 300 : 1200);
          if (!api.alive()) return;
          return resolve('lost');
        }
        api.coach(hitS || hitE ? '<b>惜しい！</b> 片方は合ってる' : '食い違っていない', 'panic');
        await api.wait(api.reduce ? 100 : 500);
        if (!api.alive()) return;
        busy = false; refresh();
      });
    });
    if (!api.alive()) return;
    const found = outcome === 'found';
    const base = found ? 40 - misses * 5 : 15;

    // 読む：右の枠を天秤に替える（記録の重り＋見つけたウソの重り）
    const pB = (() => { let o = prior / (1 - prior); if (found) o *= truth === 'bluff' ? LIE_ACC / (1 - LIE_ACC) : (1 - LIE_ACC) / LIE_ACC; return o / (1 + o); })();
    const W0 = Math.log(prior / (1 - prior)), WL = Math.log(LIE_ACC / (1 - LIE_ACC));
    const weights = [{ side: W0 >= 0 ? 'b' : 's', w: Math.abs(W0), rec: true }, ...(found ? [{ side: truth === 'bluff' ? 'b' : 's', w: WL }] : [])];
    const ang = -(pB - .5) * 2 * 18;
    const pan = (k, dx) => { const a = ang * Math.PI / 180, x = 130 + dx * Math.cos(a), y = 19.5 + dx * Math.sin(a); let yy = 18;
      const ws = weights.filter(w => w.side === k).map(w => { const wd = Math.min(46, 14 + w.w * 11); yy -= 9; return `<rect class="${w.rec ? 'rec' : 'lie'}" x="${(-wd / 2).toFixed(1)}" y="${yy}" width="${wd.toFixed(1)}" height="8" rx="1"/>`; }).join('');
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path class="str" d="M0 0 L-24 18 M0 0 L24 18"/>${ws}<path class="dish" d="M-28 18 H28 Q21 27 0 27 Q-21 27 -28 18 Z"/></g>`; };
    const nB = record.filter(Boolean).length, side = pB >= .5 ? 'bluff' : 'strong', pSide = Math.round(Math.max(pB, 1 - pB) * 100);
    const evs = $('#mb-oj-evs');
    evs.classList.remove('is-next'); evs.classList.add('is-read');
    thread.innerHTML = '';
    evs.innerHTML = `
      ${found ? `<div class="oj-found"><div class="oj-eh">見つけたウソ<span class="oj-sure">確かさ${pips(3)}</span></div><p>${W(lie.short)}</p><p class="oj-fact">→ ${W(lie.fact)}</p><b class="oj-dir is-${truth}">${DIR[truth]} → ${NAME[truth]}</b></div>`
        : `<div class="oj-found is-none"><div class="oj-eh">ウソは見つからず</div><p>記録だけで読む</p></div>`}
      <div class="oj-scale"><div class="oj-scalebox"><svg class="oj-svg" viewBox="34 0 192 76" aria-hidden="true"><path class="post" d="M130 20 V68 M114 74 H146 L139 68 H121 Z"/>
        <g transform="rotate(${ang.toFixed(2)} 130 19.5)"><rect class="beam" x="58" y="17" width="144" height="5" rx="1"/><circle class="beam" cx="130" cy="19.5" r="5"/></g>${pan('b', -66)}${pan('s', 66)}</svg><span class="oj-pan is-b">ブラフ</span><span class="oj-pan is-s">本物</span></div>
        <div class="oj-odds"><small>見込み</small><b class="is-${side}">${NAME[side]} ${pSide}%</b></div></div>
      <div class="oj-record" aria-label="${jp}が大きく賭けた20回のうち、ブラフは${nB}回"><span class="h">大きな賭け20回</span><span class="d">${record.map(b => `<i class="${b ? 'b' : 's'}"></i>`).join('')}</span><b>ブラフ${nB}</b></div>`;
    setStep(1, '天秤の傾きで読む');
    const act = $('#mb-oj-act');
    act.innerHTML = `<div><div class="actions">
      <button class="btn" id="mb-oj-bluff" type="button">ブラフと読む<small>ミミの方が強い</small></button>
      <button class="btn quiet" id="mb-oj-strong" type="button">本物と読む<small>ミミより強い</small></button></div></div>`;
    if (found) api.coach('ウソの<b>逆</b>が本当', 'smug');
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-oj-bluff').onclick = on('bluff'); $('#mb-oj-strong').onclick = on('strong');
    });
    if (!api.alive()) return;
    act.innerHTML = '';
    setStep(2, '見込みで自信を決める');
    const pMine = Math.round((decide === 'bluff' ? pB : 1 - pB) * 100);
    await api.wager({ mission: '見込みで自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超→ぜったい　50%超→確信', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const why = found ? `決め手は${P(lie.short)}。` : `ウソは${P(lie.short)}。`;

    // 本当の手の勝負：読みを預けて卓に戻る。答え合わせは手の決着の後
    if (T) {
      api.say(found ? 'ふ、ふん……読めたつもり？' : 'ふふ、あたしの言葉、信じればいいの♡', found ? 'panic' : 'smug');
      api.entrust({
        pick: NAME[decide], win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる',
        pending: {
          title: '異議あり！', charId: api.charId, pick: decide, truth, mimiEq, endLines: END, board, mine, her, base, mult: m, stakes: STAKES,
          perfect: found && misses === 0 && m === 3,
          notes: [{ label: found ? `ウソ${P(lie.short)} → ${NAME[truth]}` : `ウソは${P(lie.short)}だった`, lean: truth }],
          why: decide === side ? why : `天秤の見込みは${NAME[side]} ${pSide}%だった。${why}`,
        },
      });
      return;
    }

    // 単独ページ：その場で答え合わせ（ヴェルベットの札を右の枠の上にめくる）
    setStep(3, '答え合わせ');
    api.sfx.drum();
    const reveal = document.createElement('div'); reveal.className = 'oj-reveal';
    reveal.innerHTML = `<span class="oj-eh">${jp}の手札</span><span class="oj-cs" id="mb-oj-her">${api.backHTML('small')}${api.backHTML('small')}</span><b id="mb-oj-hn"></b>`;
    evs.prepend(reveal);
    await api.wait(api.reduce ? 200 : 1000); if (!api.alive()) return;
    const hb = $('#mb-oj-her');
    hb.innerHTML = api.cardHTML(her[0], 'small flip') + api.backHTML('small'); api.sfx.tick();
    await api.wait(api.reduce ? 150 : 700); if (!api.alive()) return;
    hb.innerHTML = api.cardHTML(her[0], 'small') + api.cardHTML(her[1], 'small flip' + (truth === 'strong' ? ' glow' : '')); api.sfx.tick();
    const hn = $('#mb-oj-hn'); hn.textContent = api.CAT_NAME[api.category(her.concat(board))]; hn.className = 'is-' + truth;
    if (!found) { const sEl = lieEl(); sEl.classList.add('is-lie'); sEl.insertAdjacentHTML('beforeend', '<span class="oj-stamp">ウソ</span>'); }
    const correct = decide === truth;
    api.say(END[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')], correct ? 'busted' : 'smug');
    await api.wait(api.reduce ? 200 : 900); if (!api.alive()) return;
    api.finish({
      correct, base, perfect: correct && found && misses === 0 && m === 3,
      title: correct && found && !(misses === 0 && m === 3) ? 'ウソ、暴いた！' : undefined,
      detail: `ヴェルベットは${NAME[truth]}（${truth === 'strong' ? 'ミミより強い' : 'ミミの方が強い'}）だった。${why}`,
    });
  }

  // 当たり：斜めの深紅の帯に OBJECTION と「ウソ、見つけた！」、ヴェルベットが崩れる
  function slam(api, panic) {
    api.say(panic, 'panic');
    api.sfx.whoosh(); setTimeout(() => api.sfx.good(), 180); setTimeout(() => api.sfx.jackpot(), 420);
    const el = document.createElement('div');
    el.className = 'oj-slam';
    el.innerHTML = `<div class="oj-art"><img src="${api.char.panic}" alt=""></div>
      <div class="oj-band"><div class="oj-en">OBJECTION!</div><div class="oj-jp">ウソ、見つけた！</div></div><div class="oj-flash"></div>`;
    api.layer.appendChild(el);
    const st = api.stage;
    if (st && !api.reduce) { st.classList.remove('oj-quake'); void st.offsetWidth; st.classList.add('oj-quake'); setTimeout(() => st.classList.remove('oj-quake'), 700); }
    setTimeout(() => { const b = el.querySelector('.oj-band'); if (b && el.isConnected) { const r = b.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, Math.min(r.top + r.height / 2, api.layer.getBoundingClientRect().bottom - 40), 36); } }, 350);
    setTimeout(() => el.classList.add('out'), api.reduce ? 500 : 1500);
    setTimeout(() => el.remove(), api.reduce ? 700 : 1800);
  }
  // 外れ：ヴェルベットが得意顔でのぞき込んで笑う
  function miss(api, line) {
    api.sfx.nope(); api.say(line, 'smug');
    const el = document.createElement('div');
    el.className = 'oj-peek';
    el.innerHTML = `<div class="oj-peek-say">${line}</div><div class="oj-peek-win"><img src="${api.char.smug}" alt=""></div>`;
    api.layer.appendChild(el);
    setTimeout(() => el.remove(), api.reduce ? 900 : 1700);
  }

  // 寸法は文字の段（--ty-*）で書く。スマホ横は右の枠 270px・真ん中 260px に収める（発言は2行・証拠3つ）
  const CSS = `
    .oj-root { position: relative; }
    .oj-cl { font-family: var(--disp); font-weight: 400; font-size: 1.15em; letter-spacing: .02em; color: var(--text); white-space: nowrap; }
    .oj-cl.red { color: #ff8f9c; }
    .oj-ev .oj-cl, .oj-found .oj-cl { color: #1a1a1a; } .oj-ev .oj-cl.red, .oj-found .oj-cl.red { color: #a8182a; }

    .oj-says { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
    .oj-h { display: flex; align-items: baseline; gap: 10px; font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note); line-height: 1.4; color: var(--gold); }
    .oj-h b { color: var(--gold-hi); font-size: var(--ty-head); }
    .oj-say { position: relative; flex: 1 1 auto; min-height: 0; display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 8px; cursor: pointer; outline: none;
      background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); border: 1px solid var(--line); border-radius: 2px; box-shadow: inset 3px 0 0 var(--crimson), 0 4px 10px rgba(0,0,0,.4); transition: border-color .16s, opacity .2s; }
    .oj-say p { margin: 0; font-weight: 700; font-size: var(--ty-body); line-height: 1.5; color: var(--text); word-break: keep-all; overflow-wrap: anywhere; text-wrap: balance; }
    .oj-no { flex: 0 0 auto; width: 26px; height: 26px; display: grid; place-items: center; font-family: var(--disp); font-size: var(--ty-head); color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); transform: rotate(45deg) scale(.8); }
    .oj-say:hover, .oj-say:focus-visible { border-color: var(--gold-hi); }
    .oj-say.sel { border-color: var(--gold-hi); box-shadow: inset 3px 0 0 var(--gold-hi), 0 0 0 1px var(--gold-hi), 0 4px 10px rgba(0,0,0,.4); }
    .oj-say.is-lie { border-color: var(--red-hi); box-shadow: inset 3px 0 0 var(--red-hi), 0 0 0 2px var(--red-hi), 0 0 18px rgba(200,37,58,.5); }
    .oj-say.is-off { opacity: .45; }

    .oj-evs { gap: 6px !important; }
    .oj-ev { position: relative; flex: 0 0 auto; padding: 4px 10px 6px; cursor: pointer; outline: none; background: var(--parch); color: var(--parch-ink); border-radius: 2px;
      box-shadow: inset 0 0 0 1px var(--line), 0 4px 10px rgba(0,0,0,.4); transition: box-shadow .16s, opacity .2s; }
    .oj-ev:hover, .oj-ev:focus-visible { box-shadow: inset 0 0 0 1px var(--gold-hi), 0 4px 10px rgba(0,0,0,.4); }
    .oj-ev.sel, .oj-ev.is-key { box-shadow: 0 0 0 2px #130406, 0 0 0 3px var(--gold-hi), 0 4px 10px rgba(0,0,0,.4); }
    .oj-ev.is-off { opacity: .45; }
    .oj-eh { display: flex; align-items: baseline; gap: 8px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-note); line-height: 1.4; color: var(--crimson); letter-spacing: .06em; }
    .oj-eh small { font-size: var(--ty-note); font-weight: 700; color: #6b5a44; letter-spacing: 0; }
    .oj-ev p { margin: 0; font-weight: 700; font-size: var(--ty-body); line-height: 1.5; word-break: keep-all; overflow-wrap: anywhere; text-wrap: pretty; }
    .oj-ev p b { color: #a8182a; white-space: nowrap; }
    .oj-cs { display: inline-flex; gap: 2px; }
    .oj-log { display: flex; gap: 8px; align-items: flex-start; margin-top: 2px; }
    .oj-st { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 56px; }
    .oj-aw { font-weight: 800; font-size: var(--ty-note); line-height: 1.4; color: #5a4a36; white-space: nowrap; }
    .oj-aw.is-bet { color: #a8182a; }
    .k-mine { display: flex; align-items: center; gap: 10px; }
    .k-mine .oj-mn { font-weight: 800; font-size: var(--ty-note); color: #5a4a36; }
    .oj-evs.is-next .oj-ev, .oj-says.is-next .oj-say { outline: 1px solid rgba(239,205,130,.22); outline-offset: 2px; animation: mb-ojPulse 1.3s ease-in-out infinite; }
    @keyframes mb-ojPulse { 50% { outline-color: rgba(239,205,130,.95); } }
    .oj-stamp { position: absolute; right: 8px; top: -14px; padding: 0 8px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head); line-height: 1.15; letter-spacing: .1em; color: #f0d08a; background: linear-gradient(180deg, var(--crimson), var(--crimson-lo)); border: 1px solid var(--gold); border-radius: 2px; box-shadow: 0 0 0 2px #130406, 0 4px 10px rgba(0,0,0,.5); transform: rotate(-6deg); animation: mb-ojStamp .4s cubic-bezier(.2,1.6,.4,1) both; pointer-events: none; }
    .oj-stamp.gold { color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border-color: var(--crimson); }
    @keyframes mb-ojStamp { from { transform: rotate(-6deg) scale(2.6); opacity: 0; } }
    .oj-root.is-charge .sel { animation: mb-ojCharge .12s linear infinite; }
    @keyframes mb-ojCharge { 50% { filter: brightness(1.25); translate: 1px 0; } }
    .oj-say.nope, .oj-ev.nope { animation: mb-ojNope .4s ease; }
    @keyframes mb-ojNope { 25% { translate: -6px 0; } 50% { translate: 5px 0; } 75% { translate: -3px 0; } }

    .oj-thread { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 3; }
    .oj-thread path { fill: none; stroke: var(--red-hi); stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 3px rgba(200,37,58,.7)); stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: mb-ojDraw .35s ease-out forwards; }
    .oj-thread.is-gold path { stroke: var(--gold-hi); stroke-width: 4; filter: drop-shadow(0 0 6px rgba(239,205,130,.8)); }
    .oj-thread circle { fill: var(--gold-hi); stroke: #130406; stroke-width: 2; }
    @keyframes mb-ojDraw { to { stroke-dashoffset: 0; } }

    .oj-act .oj-bar { display: flex; align-items: center; justify-content: center; gap: 12px 28px; height: 100%; }
    .oj-cred { display: flex; align-items: center; gap: 6px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-note); color: var(--gold-pale); }
    .oj-cred i { width: 24px; height: 16px; background: linear-gradient(90deg, var(--gold-hi), var(--gold)); border: 1px solid var(--gold-pale); border-radius: 2px; box-shadow: 0 0 8px rgba(217,178,105,.35); }
    .oj-cred i.broken { background: #241010; border-color: #6e1c24; box-shadow: none; animation: mb-ojBreak .5s ease; }
    @keyframes mb-ojBreak { 0% { background: var(--red-hi); transform: scale(1.5); } 60% { transform: translateY(4px) rotate(8deg); } }
    .oj-go { min-width: 230px; min-height: 58px; font-size: var(--ty-btn); letter-spacing: .08em; }
    .oj-go small { font-family: var(--mincho); letter-spacing: .24em; font-size: var(--ty-note); }
    .oj-go:not([disabled]) { animation: mb-ojGo 1s ease-in-out infinite; }
    @keyframes mb-ojGo { 50% { transform: scale(1.03); } }
    .rb-act > div > .actions { display: flex; gap: 12px; justify-content: center; }

    .oj-found { padding: 4px 10px 6px; background: var(--parch); color: var(--parch-ink); border-radius: 2px; box-shadow: 0 0 0 2px #130406, 0 0 0 3px var(--gold-hi); }
    .oj-found p { margin: 0; font-weight: 700; font-size: var(--ty-body); line-height: 1.45; word-break: keep-all; overflow-wrap: anywhere; text-wrap: pretty; }
    .oj-found .oj-fact { font-size: var(--ty-note); color: #5a4a36; }
    .oj-found.is-none { box-shadow: inset 0 0 0 1px var(--line); }
    .oj-dir { display: inline-block; margin-top: 2px; padding: 0 8px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head); line-height: 1.5; color: #f6e7c2; background: linear-gradient(180deg, var(--crimson), var(--crimson-lo)); border-radius: 2px; }
    .oj-sure { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; color: #5a4a36; }
    .oj-pips { display: inline-flex; gap: 2px; } .oj-pips i { width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid #8a6a3a; } .oj-pips i.on { background: #a8182a; border-color: #a8182a; }
    .oj-scale { display: flex; align-items: center; gap: 8px; }
    .oj-scalebox { position: relative; flex: 1 1 auto; min-width: 0; padding-bottom: calc(var(--ty-note) * 1.3); }
    .oj-svg { display: block; width: 100%; max-height: 56px; }
    .oj-pan { position: absolute; bottom: 0; white-space: nowrap; font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note); line-height: 1.3; } .oj-pan.is-b { left: 0; color: #ff8f9c; } .oj-pan.is-s { right: 0; color: var(--gold-hi); }
    .oj-svg .post { fill: none; stroke: var(--gold); stroke-width: 2; } .oj-svg .beam { fill: var(--gold-hi); }
    .oj-svg .str { stroke: var(--gold); stroke-width: 1; } .oj-svg .dish { fill: var(--gold); }
    .oj-svg rect.rec { fill: #8a7a5e; } .oj-svg rect.lie { fill: var(--red-hi); }
    .oj-odds { display: flex; flex-direction: column; align-items: flex-end; font-family: var(--mincho); }
    .oj-odds small { font-size: var(--ty-note); color: var(--dim); }
    .oj-odds b { font-size: var(--ty-head); font-weight: 800; white-space: nowrap; } .oj-odds b.is-bluff { color: #ff8f9c; } .oj-odds b.is-strong { color: var(--gold-hi); }
    .oj-record { display: flex; align-items: center; gap: 6px; font-size: var(--ty-note); color: var(--dim); }
    .oj-record .h { white-space: nowrap; } .oj-record .d { display: flex; gap: 1px; flex: 1 1 auto; } .oj-record b { color: var(--gold-hi); white-space: nowrap; }
    .oj-record .d i { flex: 1 1 0; height: 12px; background: var(--gold); } .oj-record .d i.b { background: var(--red-hi); }
    .oj-reveal { display: flex; align-items: center; gap: 8px; } .oj-reveal .oj-eh { color: var(--gold); }
    .oj-reveal b { font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head); } .oj-reveal b.is-bluff { color: #ff8f9c; } .oj-reveal b.is-strong { color: var(--gold-hi); }

    .oj-slam { position: absolute; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; }
    .oj-slam::before { content: ""; position: absolute; inset: 0; background: rgba(8,2,4,.74); animation: mb-fadeIn .15s; }
    .oj-slam.out { animation: mb-ojOut .3s ease forwards; }
    @keyframes mb-ojOut { to { opacity: 0; } }
    .oj-flash { position: absolute; inset: 0; background: #fff; animation: mb-ojFlash .4s ease-out forwards; }
    @keyframes mb-ojFlash { to { opacity: 0; } }
    .oj-art { position: absolute; right: -4%; top: 3%; width: min(92vw, 860px); animation: mb-ojArt .45s .08s cubic-bezier(.2,1.2,.3,1) both, mb-ojQuake .45s .55s ease 2; }
    .oj-art img { display: block; width: 100%; height: auto; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 24%), linear-gradient(180deg, #000 68%, transparent 98%); -webkit-mask-composite: source-in; mask-image: linear-gradient(90deg, transparent 0, #000 24%), linear-gradient(180deg, #000 68%, transparent 98%); mask-composite: intersect; }
    @keyframes mb-ojArt { from { transform: translateX(60%); opacity: 0; } }
    @keyframes mb-ojQuake { 25% { transform: translate(-9px, 3px) rotate(-1.5deg); } 50% { transform: translate(8px, -2px) rotate(1deg); } 75% { transform: translate(-4px, 2px); } }
    .oj-band { position: absolute; left: -10%; right: -10%; top: 56%; padding: 12px 0 14px; transform: skewY(-7deg); display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(90deg, #3d0510, #9a1422 38%, #c8253a 50%, #9a1422 62%, #3d0510); border-block: 5px solid var(--gold-hi); box-shadow: 0 0 70px rgba(200,37,58,.7); animation: mb-ojBand .38s cubic-bezier(.2,1.2,.3,1) both; }
    @keyframes mb-ojBand { from { transform: skewY(-7deg) translateX(-115%); } }
    .oj-en { font-family: var(--disp); font-size: clamp(66px, 14vw, 156px); line-height: .92; letter-spacing: .05em; color: #fff; text-shadow: 0 5px 0 #3d0510, 0 0 34px rgba(245,215,122,.85); animation: mb-ojWord .45s .12s cubic-bezier(.2,1.5,.3,1) both; }
    .oj-jp { font-family: var(--mincho); font-weight: 800; font-size: clamp(20px, 3.4vw, 34px); letter-spacing: .24em; color: var(--gold-pale); text-shadow: 0 2px 0 #3d0510; animation: mb-ojWord .4s .26s both; }
    @keyframes mb-ojWord { from { opacity: 0; transform: scale(2.4) rotate(-4deg); } }
    #mb-stage.oj-quake { animation: mb-ojStageQuake .5s ease; }
    @keyframes mb-ojStageQuake { 20% { transform: translate(-6px, 4px); } 40% { transform: translate(6px, -3px); } 60% { transform: translate(-4px, 2px); } 80% { transform: translate(3px, -1px); } }
    .oj-peek { position: absolute; right: 0; bottom: 0; z-index: 60; pointer-events: none; width: min(64vw, 460px); animation: mb-ojPeek 1.7s ease forwards; }
    .oj-peek-win { height: min(36vw, 250px); margin-right: -24px; overflow: hidden; transform: skewX(-12deg); transform-origin: 0 100%; border: 3px solid var(--gold); border-right: 0; border-bottom: 0; background: linear-gradient(160deg, #5a1726, #1d080e); box-shadow: 0 0 40px rgba(0,0,0,.7); }
    .oj-peek-win img { display: block; width: 118%; margin-left: -6%; transform: skewX(12deg); }
    .oj-peek-say { position: absolute; left: -6px; top: -48px; max-width: 100%; padding: 7px 14px 7px 18px; background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); color: var(--text); font-family: var(--mincho); font-weight: 700; font-size: var(--ty-body); line-height: 1.4; transform: skewX(-8deg); box-shadow: inset 4px 0 0 var(--crimson), 0 6px 16px rgba(0,0,0,.5); border: 1px solid var(--line); border-radius: 2px; }
    @keyframes mb-ojPeek { 0% { transform: translateX(105%); } 14% { transform: none; } 84% { transform: none; opacity: 1; } 100% { transform: translateX(30%); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .oj-art, .oj-band, .oj-en, .oj-jp, .oj-peek { animation: none !important; } }
  `;
})();
