// 論理：ぼやけた手札（ほろ酔いの夜だけ）2026-11-09
// 酔ったミミの手札の1枚がぼやけて見えない。色と「絵札か数字札か」だけ分かる。
//   1問目：ぼやけた札かもしれない札（場札・もう1枚の手札を除く）を並べ、ミミの手が役（ワンペア以上）になる札を全部タップ。その場で○×。
//   お水：1回だけ。ぼやけた札がはっきりするが、相手に「確かめた」と気づかれてご褒美が半分。
//   2問目：ミミが勝つ見込み（ぼやけた札かもしれない札の平均。お水を飲んだら本当の札で）を払う額の線とくらべて決める。
// 作りは容疑者しぼり（narrow.js）に合わせる。相手の本当の手は答え合わせまで出さない。ぼやけた札の正体も答え合わせ（お水を飲んだ時はその時）まで出さない。
// 答え合わせは手の決着の後（verdict.js、kind:'logic'）。正解＝画面に出した見込みと線を比べた判断（隠れた札の運で減点しない）。
(() => {
  const STAKES = [0, 1, 3];
  const ACTN = { check: '様子見', call: '付いてきた', bet: '賭けた', raise: '上乗せした', allin: '全部賭けた' };
  const PH = { flop: 'フロップ', turn: 'ターン', river: 'リバー' };
  const OPEN = {
    polka: ['ミミちゃん、手札がぐにゃぐにゃ〜？ あははっ', 'smug'],
    selina: ['……大丈夫ですか、|ミミさん。|数え方は、|分かりますよね', 'think'],
    grano: ['おや、品物がよく|見えませんかな？|見えぬ物には|値が付けられませんぞ', 'smug'],
    rico: ['ミミ〜、|ふらふらだねえ。|お水、飲む〜？', 'think'],
    velvet: ['ふふ……|ぼやけて見えるの？|あたしの顔は、|見える？', 'smug'],
  };
  const WATER = {
    polka: ['あっ、ずるい〜！|お水飲んだ〜！|ひっく', 'panic'],
    selina: ['……確かめましたね。|賢明ですが、|顔に出ていますよ', 'think'],
    grano: ['ほう、品物を|確かめましたな。|慎重で結構', 'think'],
    rico: ['えらいえらい〜、|ちゃんとお水飲んで|確かめた〜', 'smug'],
    velvet: ['あら、お水なんて|飲んじゃうの？|つまんない♡', 'smug'],
  };
  const END = {
    polka: { bc: 'うぅ……ミミちゃん、見えてたのぉ……ぐすっ', bw: 'あはは！ 降りちゃったぁ、ボクの勝ち〜！ ひっく', sc: 'うわぁぁん、逃げられたぁ……', sw: 'えへへ〜、ほんとに強かったでしょ〜！' },
    selina: { bc: '……酔っていても、数えは確かなのね', bw: '……降りてくれて、助かったわ', sc: '……賢明ね。今夜は褒めるわ', sw: '……だから言ったでしょう' },
    grano: { bc: 'はっはっは、見抜かれましたな！ 良いお目をしておられる', bw: 'ほう、降りますか。良い買い物を逃しましたな', sc: 'いやあ残念、商売あがったりですな', sw: 'どうです、本物の品でしょう！' },
    rico: { bc: 'えへへ、ミミ酔ってても強いねえ〜', bw: 'えへへ、降りちゃった〜？', sc: 'ん〜、ちゃんと逃げたね、えらいえらい〜', sw: 'ほら〜、アタシ強かったでしょ〜' },
    velvet: { bc: 'ふふ……酔っていても見えるのね♡', bw: 'あら、降りちゃうの？ ざんねん♡', sc: 'ふふ、賢い子ね♡', sw: 'ほら、言ったでしょ？ 本物なの♡' },
  };

  // ぼやけた札で分かること：色（赤＝ハート・ダイヤ／黒＝スペード・クラブ）と、絵札かA（J・Q・K・A）か数字札（2〜10）か
  const isRed = (c) => c.s === 'h' || c.s === 'd';
  const isFace = (c) => c.r >= 11;
  const clsName = (c) => `${isRed(c) ? '赤い' : '黒い'}${isFace(c) ? '絵札かA' : '数字札'}`;
  const sameCls = (a, b) => isRed(a) === isRed(b) && isFace(a) === isFace(b);
  const SUIT_ORDER = { s: 0, h: 1, d: 2, c: 3 };

  // ぼやけた札が手札のどちらでも成り立つ場面を、成り立つ方ごとに全部返す。
  // 成り立つ＝なりうる札のうち、役（ワンペア以上）になる札とならない札の両方がある（ならなければ、考える所が無い）
  function plans(M, board, mine) {
    const out = [];
    for (const idx of [0, 1]) {
      const blurred = mine[idx], other = mine[1 - idx];
      const used = new Set([...board, other].map(M.key));
      const cands = M.deck().filter(c => !used.has(M.key(c)) && sameCls(c, blurred))
        .sort((a, b) => a.r - b.r || SUIT_ORDER[a.s] - SUIT_ORDER[b.s]);
      const hits = cands.filter(c => M.category([other, c, ...board]) >= 1);
      if (cands.length < 4 || !hits.length || hits.length === cands.length) continue;
      out.push({ idx, blurred, other, cands, hits: new Set(hits.map(M.key)) });
    }
    return out;
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
  const kw = (t) => `<span class="nq-k">${wb(t)}</span>`;
  const CSS = `
    .nq-play { display: flex; flex-direction: column; min-height: 0; gap: 6px; }
    .bl-cands { display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 8px 6px; flex: 1 1 auto; min-height: 0; }
    .bl-c { position: relative; padding: 0; border: 0; background: none; cursor: pointer; transition: opacity .2s, transform .2s; }
    .bl-c[disabled] { cursor: default; }
    .bl-c .bl-mk { position: absolute; right: -3px; top: -5px; font-family: var(--mincho); font-weight: 900; line-height: 1; padding: 1px 4px; background: rgba(19,4,6,.9); border: 1px solid currentColor; pointer-events: none; }
    .bl-c.is-hit .bl-mk { color: var(--gold-hi); }
    .bl-c.is-miss .bl-mk { color: #ff8f9c; }
    .bl-c.is-miss { animation: bl-shake .35s; }
    .bl-c.is-no { opacity: .4; }
    .bl-c.is-true .card { outline: 3px solid var(--gold-hi); outline-offset: 2px; }
    .bl-cands.is-q2 .bl-c { cursor: default; }
    .bl-found { font-family: var(--mincho); font-weight: 800; line-height: 1.3; color: var(--gold-hi); }
    .bl-found.is-ok { color: var(--gold-pale); }
    @keyframes bl-shake { 0%,100% { transform: none; } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .nq-k { word-break: keep-all; }
    .nq-sit { display: flex; flex-direction: column; gap: 4px; }
    .nq-cap { font-family: var(--mincho); font-weight: 700; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .nq-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .nq-row .card:not(.glow) { opacity: .55; }
    .bl-mine .card { opacity: 1 !important; }
    .pk-bets { display: flex; gap: 8px; align-items: flex-start; }
    .pk-bets > div { display: flex; flex-direction: column; }
    .bl-mine { gap: 4px; }
    .bl-cls { font-family: var(--mincho); font-weight: 800; line-height: 1.25; color: var(--gold-hi); margin-left: 4px; word-break: keep-all; }
    .bl-blur b, .bl-blur i { filter: blur(2.5px); }
    .nq-her { display: flex; flex-direction: column; gap: 3px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mincho); line-height: 1.35; }
    .nq-her .sp { color: var(--gold-hi); font-weight: 800; word-break: keep-all; }
    .pk-gauge { display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; background: var(--panel); border: 1px solid var(--line); font-family: var(--mincho); }
    .pk-g-h { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; line-height: 1.25; color: var(--gold-pale); }
    .pk-g-h b { color: var(--gold-hi); font-weight: 900; white-space: nowrap; }
    .pk-bar { position: relative; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; height: 12px; margin: 1px 0; }
    .pk-bar > i { display: block; background: rgba(255,255,255,.1); border: 1px solid var(--line-dim, rgba(255,255,255,.2)); }
    .pk-bar > i.on { background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border-color: var(--gold-hi); }
    .pk-bar > u { position: absolute; top: -4px; bottom: -4px; width: 0; border-left: 3px solid #ff8f9c; text-decoration: none; }
    .pk-bar.is-pay > i.on { background: linear-gradient(180deg, #ff8f9c, #d24a5a); border-color: #ff8f9c; }
    .pk-g-n { display: flex; justify-content: space-between; gap: 8px; line-height: 1.25; color: #ffb3bc; }
    .pk-g-n span { white-space: normal; word-break: keep-all; }
    .pk-g-n .go { color: var(--gold-pale); text-align: right; word-break: keep-all; white-space: normal; }
    .pk-act { display: flex; justify-content: center; align-items: center; gap: 12px; height: 100%; }
    .pk-act .btn { margin: 0; flex: 1 1 0; max-width: 240px; }
    .pk-act .btn.is-water { flex: 0 0 auto; max-width: none; white-space: nowrap; }
    .pk-act .btn[disabled] { opacity: .45; }
  `;

  async function start({ api }) {
    const who = OPEN[api.charId] ? api.charId : 'selina';
    const jp = api.char.jp;
    const T = api.table;
    let board, mine, her, pot, toCall, acts, P;
    if (T) { board = T.board; mine = T.mine; her = T.her; pot = T.pot || 0; toCall = T.toCall || 0; acts = T.acts || []; P = plans(api, board, mine); }
    // 卓の外（遊びの一覧から）：条件に合う場面を配る
    for (let t = 0; t < 400 && !(P && P.length); t++) {
      const d = api.shuffle(api.deck()), n = 3 + api.rand(3);
      mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 4 + n); pot = 400; toCall = 200;
      acts = [{ ph: 'flop', t: 'bet', a: 100 }]; if (n >= 4) acts.push({ ph: 'turn', t: 'bet', a: 200 });
      P = plans(api, board, mine);
    }
    const plan = P && P.length ? P[api.rand(P.length)] : null;
    if (!plan) { api.coach('ごめん、いい場面が作れなかった。卓にもどろう'); return; }
    const { blurred, other, cands, hits } = plan;
    const free = toCall <= 0;
    const NAMES = free ? { call: '賭ける', fold: '様子見' } : { call: '付いていく', fold: '降りる' };
    const lastAct = acts.length ? acts[acts.length - 1] : { t: free ? 'check' : 'bet', ph: T ? T.phase : 'river', a: toCall };
    const betted = ['bet', 'raise', 'allin'].includes(lastAct.t) || (!acts.length && !free);
    const need = free ? 50 : Math.round(toCall / Math.max(1, (pot || 0) + toCall) * 100);
    // 勝つ見込み：ぼやけた札かもしれない札の平均（相手の手が分からない時の見込み）。お水を飲んだら本当の札で
    const eqBlur = api.eqPct(cands.reduce((t, c) => t + api.equity([other, c], board, 220), 0) / cands.length);
    const eqTrue = api.eqPct(api.equity(mine, board, 3000));
    const mimiEq = api.eqPct(api.headsUp(mine, her, board));
    const cls = clsName(blurred);
    const idx = plan.idx;
    const [line0, face0] = OPEN[who];

    api.css('blur', CSS);
    api.say(line0, face0); api.bet(free ? '—' : toCall);
    const root = api.root;
    const STEPS = ['役になる札', '見込み', '賭ける'];
    root.classList.add('rb-frame', 'bl-frame');
    const blurHTML = `<span class="card small bl-blur ${isRed(blurred) ? 'red' : ''}" aria-label="ぼやけて見えない札（${cls}）"><b>？</b><i>？</i></span>`;
    const mineHTML = (clear) => [0, 1].map(i => i === idx ? (clear ? api.cardHTML(blurred, 'small glow') : blurHTML) : api.cardHTML(other, 'small')).join('');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-bl-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play nq-play">
        <div class="bl-cands" id="mb-bl-cands">${cands.map(c => `<button class="bl-c" type="button" data-k="${api.key(c)}">${api.cardHTML(c, 'small')}</button>`).join('')}</div>
        <div class="pk-gauge" id="mb-bl-gauge" hidden></div>
      </div>
      <div class="rb-info">
        <div class="nq-sit"><div class="nq-cap">場札</div><div class="nq-row">${board.map(c => api.cardHTML(c, 'small')).join('')}</div>
          <div class="nq-cap">ミミの手札</div><div class="nq-row bl-mine" id="mb-bl-mine">${mineHTML(false)}<span class="bl-cls" id="mb-bl-cls">ぼやけた札は<br>${cls}</span></div></div>
        <div class="nq-tip" id="mb-bl-tip"></div>
      </div>
      <div class="rb-act" id="mb-bl-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const act = $('#mb-bl-act');
    const tip = (html, ex) => { api.coach(html, ex); const el = $('#mb-bl-tip'); if (el) el.innerHTML = html; };
    await api.rules({
      key: 'blur1', title: 'ぼやけた手札',
      goal: `酔ったミミの手札の1枚が、ぼやけて見えない。その中で<em>${NAMES.call}</em>か<em>${NAMES.fold}</em>かを決める`,
      how: `①ぼやけた札かもしれない札のうち、<em>ミミの手が役になる札を全部タップ</em>　②役になる札の数と払う額の目安を見て決める。お水を飲むとぼやけた札が見え、役になるかがはっきりするが、ご褒美が半分`,
      risk: '役にならない札をタップすると×（ご褒美が減る）。お水は決める前に1回だけ。勝つ見込みは決めた後の答え合わせで出る。答え合わせはこの手の決着の後',
      look: [['役になる札', `ぼやけた札の色と種類（${cls}）`], ['見込み', '役になる札の数と、払う額の目安'], ['自信', '迷わなかったら上げる']],
    });
    if (!api.alive()) return;

    // 1問目：どの札なら、ミミの手が役になる？
    const nHit = hits.size;
    const seenRanks = [...new Set([other, ...board].map(c => c.r))].sort((a, b) => b - a).map(r => api.rn(r)).join('・');
    let found = 0, miss = 0;
    const left = () => api.mission(`役になる札を全部タップ（あと${nHit - found}枚）`);
    left();
    tip(kw(`ぼやけた札は「${cls}」。|ワンペア以上の役に|なる札を全部タップ`), 'think');
    await new Promise(res => {
      root.querySelectorAll('.bl-c').forEach(b => b.addEventListener('click', () => {
        if (b.disabled || found >= nHit) return;
        const c = cands.find(x => api.key(x) === b.dataset.k);
        b.disabled = true;
        if (hits.has(b.dataset.k)) {
          found++; api.sfx.good();
          b.classList.add('is-hit'); b.querySelector('.card').classList.add('glow'); b.insertAdjacentHTML('beforeend', '<u class="bl-mk">○</u>');
        } else {
          miss++; api.sfx.nope();
          b.classList.add('is-miss', 'is-no'); b.insertAdjacentHTML('beforeend', '<u class="bl-mk">×</u>');
          tip(`${api.label(c)}は役にならない。場と手札にある ${seenRanks} と同じ数字だけがペアになるよ`, 'think');
        }
        if (found >= nHit) res(); else left();
      }));
    });
    if (!api.alive()) return;
    root.querySelectorAll('.bl-c').forEach(b => { if (!b.disabled) { b.disabled = true; b.classList.add('is-no'); } });
    tip(kw(miss ? `役になる札は${cands.length}枚中${nHit}枚。|ぼやけた札が|その1枚なら役になる` : `全部見つけた！|${cands.length}枚中${nHit}枚が|役になる札`), miss ? 'think' : 'win');
    await api.wait(api.reduce ? 400 : 1200); if (!api.alive()) return;

    // 2問目：見込みと払う額の線をくらべる（お水は1回だけ）
    $('#mb-bl-steps').innerHTML = api.steps(STEPS, 1);
    $('#mb-bl-cands').classList.add('is-q2');
    // 決める前は、勝つ見込みの数字と棒は出さない。自分で数える材料（役になる札の数）と、払う額の基準（10個の印）だけ。見込みは答え合わせで「実は約◯%」と出す
    let drunk = false;
    const payK = Math.max(1, Math.min(9, Math.round(need / 10)));
    const g = $('#mb-bl-gauge'); g.hidden = false;
    const trueHit = hits.has(api.key(blurred));
    const drawGauge = () => {
      const found1 = drunk
        ? `<div class="pk-g-h"><span>見えた札 ${api.label(blurred)}</span><b>${trueHit ? '役になる' : '役にならない'}</b></div>`
        : `<div class="pk-g-h"><span>役になる札</span><b>${cands.length}枚中${nHit}枚</b></div>`;
      g.innerHTML = found1 + `<div class="pk-bar is-pay" role="img" aria-label="10回のうち約${payK}回 勝てば元が取れる">${Array.from({ length: 10 }, (_, i) => `<i class="${i < payK ? 'on' : ''}"></i>`).join('')}</div>
        <div class="pk-g-n"><span>${free ? '賭けて得な勝ち' : '元が取れる勝ち'}<wbr>：10回に約${payK}回</span></div>`;
    };
    drawGauge();
    api.mission('役になる札の数を見て決める');
    tip(kw(`役になる札は|${cands.length}枚中${nHit}枚。|これだけあれば|足りるか考えて`), 'think');
    act.innerHTML = `<div class="pk-act"><button class="btn" data-d="call">${NAMES.call}</button><button class="btn" data-d="fold">${NAMES.fold}</button><button class="btn is-water" id="mb-bl-water" type="button">お水を飲んで確かめる（ご褒美が半分）</button></div>`;
    const decide = await new Promise(res => {
      act.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { api.sfx.tap(); act.innerHTML = ''; res(b.dataset.d); }));
      act.querySelector('#mb-bl-water').addEventListener('click', (e) => {
        if (drunk) return;
        drunk = true; api.sfx.tap(); e.currentTarget.disabled = true;
        // ぼやけた札がはっきりする。相手に「確かめた」と気づかれる
        $('#mb-bl-mine').innerHTML = mineHTML(true) + `<span class="bl-cls">お水で見えた<br>${api.label(blurred)}</span>`;
        root.querySelectorAll('.bl-c').forEach(x => x.classList.toggle('is-true', x.dataset.k === api.key(blurred)));
        const [wl, wf] = WATER[who]; api.say(wl, wf);
        drawGauge();
        api.mission('お水で見えた！決める');
        tip(kw(trueHit ? `お水で見えた！|この札なら、|役になる。|ご褒美は半分` : `お水で見えた！|この札だと、|役にならない。|ご褒美は半分`), 'think');
      });
    });
    if (!api.alive()) return;
    $('#mb-bl-steps').innerHTML = api.steps(STEPS, 2);
    const base0 = 60 - Math.min(miss, 4) * 10;  // 役にならない札をタップするたびに10減る（20まで）
    const base = drunk ? Math.round(base0 / 2) : base0;
    const eqShown = drunk ? eqTrue : eqBlur;  // 答え合わせで出す見込み（お水を飲んだら本当の札で）
    // 画面に出した材料（役になる札の割合／お水で見えた札が役になるか）で決めた判断は、正確な見込みと違っても正解にする
    // （11/10 Codex 18回目：割合で考えて降りたら、見込み45%で減点された。案内と採点の物差しをそろえる）
    const eqRule = eqShown >= need ? 'call' : 'fold';
    const shownRule = drunk ? (hits.has(api.key(blurred)) ? 'call' : 'fold') : (Math.round(nHit / cands.length * 100) >= need ? 'call' : 'fold');
    const truth = (decide === eqRule || decide === shownRule) ? decide : eqRule;
    const split = eqRule !== shownRule;
    await api.wager({ mission: 'その判断の自信を選ぶ', question: `「${NAMES[decide]}」と決めた`, note: drunk ? '迷わなかったら上げる（お水で半分）' : '迷わなかったら上げる', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const herWeak = mimiEq > 50;
    const meName = roleName(api, mine.concat(board));
    const how = drunk ? '本当の札' : 'ぼやけた札かもしれない札の平均';
    const pending = { kind: 'logic', names: NAMES, title: 'ぼやけた手札', charId: api.charId, pick: decide, truth, mimiEq: eqShown, need, endLines: END[who], board, mine, her, base, mult: m, stakes: STAKES,
      herWeak, water: !!drunk, perfect: miss === 0 && m === 3 && !drunk, notes: [],
      why: `実は、${how}で数えると、勝つ見込みは約${eqShown}%だった（${free ? '半分' : `払う額の線 ${need}%`}）。`,
      truthText: `ぼやけた札は ${api.label(blurred)}。ミミは ${meName}<small>実は、${how}で数えた見込みは約${eqShown}%（${free ? '半分' : `払う額の線 ${need}%`}）。${split ? `${drunk ? '見えた札' : '役になる札の割合'}で考えると${NAMES[shownRule]}、見込みで考えると${NAMES[eqRule]}。どちらも筋が通るので正解。` : `${NAMES[truth]}のが正解。`}決着の勝ち負けは運の側</small>`,
      extra: `ぼやけた札：${api.label(blurred)}${drunk ? '（お水で確かめた）' : ''}` };
    if (T) {
      api.entrust({
        pick: `見込み ${eqShown}% → ${NAMES[decide]}${drunk ? '（お水）' : ''}`, win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'call' ? (free ? '「賭ける」と決めた。卓で賭けよう' : '「付いていく」と決めた。卓でコールしよう') : (free ? '「様子見」と決めた。卓でチェックしよう' : '「降りる」と決めた。卓で降りよう'),
        pending,
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.finish({ correct, base, perfect: correct && pending.perfect,
      detail: `ぼやけた札は ${api.label(blurred)}（ミミは ${meName}）。${pending.why}` });
  }

  // 卓でこの読み合いを出してよいか：ぼやけた札かもしれない札に「役になる札」と「ならない札」が両方ある時だけ
  MB.blurMatters = (T) => { try { return plans(MB, T.board, T.mine).length > 0; } catch (e) { return false; } };
  MB.blurKit = { plans, isRed, isFace, clsName };

  MB.register({ id: 'blur', group: 'logic', order: 21, title: 'ぼやけた手札', sub: '論理 · 役になる札', isNew: true, chars: ['polka', 'selina', 'grano', 'rico', 'velvet'], start });
})();
