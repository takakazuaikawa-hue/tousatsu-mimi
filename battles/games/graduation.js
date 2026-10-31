// 心理：卒業試験（本気のリコ先輩だけの読み合い）— 2026-10-25（docs/design-ref/rico-serious-read.md）
// 本気の先輩は、ミミの癖を全部見てきた人。大きな賭けにすぐ降りる子にはブラフで、付いてきがちな子には本物で来る（AI のブラフの多さもミミの癖から決めている：game.js seriousRicoBluff）。
// 流れ：① ミミ自身の記録（大きな賭けを受けた20回の 降りた／付いていった）と、先輩の予想（ミミの癖から言い切る）を見る
//       ② 先輩に教わった3つの教えから1つ使って、本当の手から手がかりを1つ得る ③ 本物かブラフかを読み、自信を決めて卓へ預ける。
// 答え合わせは手の決着の後（verdict.js）。先輩の予想を外して当てたら「卒業」に1つ近づく（3つで称号。数えは game.js の showReadVerdict）。
(() => {
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  const other = (t) => (t === 'bluff' ? 'strong' : 'bluff');
  const STAKES = [0, 1, 3];
  const BASE = 30;
  const GOAL = 3;
  const sure = (acc) => (acc >= .88 ? 3 : acc >= .7 ? 2 : 1);
  const pips = (n) => `<span class="gd-pips" aria-label="確かさ${n}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  // 記録が無いうちは、教わったとおり慎重な子として 降りた12／付いていった8（毎回同じ並び）
  const seedHabit = () => { const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, 12)); return Array.from({ length: 20 }, (_, i) => s.has(i)); };
  // 教え（1つだけ使える）。手がかりは本当の手から、確かさ acc の割合で本当の向きを指す
  const LESSONS = [
    { id: 'size', name: 'ベット額の意味', acc: .72, how: '賭けの大きさから読む',
      say: { bluff: ['大きすぎる額。|降ろしたい時の|大きさだ', '取りに来る額じゃない。|脅しの額だ'], strong: ['付いてきてほしい額。|取り切る時の|大きさだ', '小さく見せて、|呼び込む額だ'] } },
    { id: 'board', name: '場の危なさ', acc: .9, how: '場の強い形を先輩が持っていそうか', needShape: true,
      say: { bluff: ['{S}|が落ちた時、|先輩は|賭けていない。|形は|まだ無い', '{S}|の形に、|先輩の賭け方が|合っていない'], strong: ['{S}|が落ちた瞬間から、|先輩の賭け方が|変わった', '{S}|の形を、|もう持っている人の|打ち方だ'] } },
    { id: 'face', name: '言葉と顔', acc: .6, how: '本気の先輩はほとんど顔に出ない',
      say: { bluff: ['一瞬だけ、|まばたきが|増えた', '「……どうしたの？」|声が半拍、|早い'], strong: ['呼吸が、|まったく|変わらない', '目が笑っている。|待っている顔だ'] } },
  ];
  const OPEN = ['アタシ、ミミのこと全部見てたから', '練習は終わり。ここからは試験よ', '教える立場、|やめたから'];
  // ルールの文：| で区切った句の途中では折らない（語の途中で1字だけ次の行に落ちていた）
  const nw = (s) => s.split('|').map(t => `<span style="white-space:nowrap">${t}</span>`).join('');
  const END = { bc: '……見抜いたのね。成長したわ', bw: '降りると思った。ミミの癖、全部知ってるから', sc: '……いい判断よ。降りる勇気も実力', sw: '付いてくると思ったわ。甘いわよ、ミミ' };

  MB.register({ id: 'graduation', group: 'psych', order: 6, title: '卒業試験', sub: '心理 · 本気のリコ', isNew: true, chars: ['rico'], start });

  // 場の強い形（場の危なさの教えで使う）：同じマーク3枚以上／数字が3つ続く並び／同じ数字2枚
  function boardShape(api, board) {
    const cnt = {}; board.forEach(c => { cnt[c.s] = (cnt[c.s] || 0) + 1; });
    const X = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    if (cnt[X] >= 3) return `${api.SYM[X]}${cnt[X]}枚`;
    const rs = [...new Set(board.map(c => c.r))].sort((a, b) => a - b);
    for (let i = 0; i + 2 < rs.length; i++) if (rs[i + 2] - rs[i] <= 3) return `${api.rn(rs[i])}・${api.rn(rs[i + 1])}・${api.rn(rs[i + 2])}の並び`;
    const pr = board.find((c, i) => board.findIndex(d => d.r === c.r) !== i);
    if (pr) return `${api.rn(pr.r)}が2枚`;
    return '';
  }

  // 架空の手（単独ページ用）：ミミに役がある場面を配る
  function dealFake(api) {
    for (let k = 0; k < 300; k++) {
      const d = api.shuffle(api.deck()); const n = api.pick([3, 4, 5]);
      const mine = d.slice(0, 2), her = d.slice(2, 4), board = d.slice(4, 4 + n);
      if (api.category(mine.concat(board)) >= 1) return { board, mine, her, bet: 400 };
    }
    const d = api.deck(); return { board: d.slice(4, 7), mine: d.slice(0, 2), her: d.slice(2, 4), bet: 400 };
  }

  async function start({ api }) {
    const T = api.table;
    let board, mine, her, bet;
    if (T) { board = T.board; mine = T.mine; her = T.her; bet = T.toCall || '—'; }
    else { const f = dealFake(api); board = f.board; mine = f.mine; her = f.her; bet = f.bet; }
    api.setOpp('rico', api.pick(OPEN), bet, 'smug');
    const jp = 'リコ先輩';
    const habit = (T && Array.isArray(T.habit) && T.habit.length >= 5) ? T.habit.slice(-20) : seedHabit();
    const folds = habit.filter(Boolean).length, foldRate = folds / habit.length;
    const pred = foldRate >= .5 ? 'strong' : 'bluff';            // 先輩の予想：ミミの癖どおりの読み
    const predLine = pred === 'strong' ? 'ミミは『本物』と読んで、|降りる' : 'ミミは『ブラフ』と読んで、|付いてくる';
    // 天秤の最初の重り：先輩はミミの癖の逆を突く（降りがちならブラフ寄り）。AI のブラフの多さと同じ式
    const prior = Math.max(.25, Math.min(.85, .25 + .7 * foldRate));
    const mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    const truth = mimiEq >= 50 ? 'bluff' : 'strong';
    const grad0 = T ? (T.grad || 0) : 0;
    const shape = boardShape(api, board);
    const mimiHandName = api.CAT_NAME[api.category(mine.concat(board))];

    api.css('graduation', CSS);
    const root = api.root;
    root.classList.add('rb-frame', 'gd-root');
    // スマホ横は真ん中が 260px。教えの説明の1行を省き、場の形は名前の横に出す（api.css は html.is-compact を書けないので印で分ける）
    if (document.documentElement.classList.contains('is-compact')) root.classList.add('is-cp');
    const steps = ['記録と予想', '教えを使う', '読む', '賭ける'];
    const lessonHTML = LESSONS.map((l, i) => { const off = l.needShape && !shape; const n = sure(l.acc);
      return `<button type="button" class="gd-lesson" data-i="${i}" ${off ? 'disabled' : ''}><span class="gd-ln">${l.name}${l.id === 'board' && shape ? `<i class="gd-shape">（${shape}）</i>` : ''}</span><span class="gd-sure">${off ? '<i class="gd-off">強い形なし</i>' : `<i class="gd-sw">確かさ</i>${pips(n)}`}</span><small>${off ? '今の場には強い形が無い' : l.id === 'board' ? `場の${shape}を、先輩が持っていそうか` : l.how}</small></button>`; }).join('');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-gd-steps">${api.steps(steps, 0)}</div></div>
      <div class="rb-play gd-play">
        <div class="gd-por" aria-hidden="true"><img class="main" src="${api.char.smug}" alt=""><img class="alt" src="${api.char.panic}" alt=""></div>
        <div class="gd-pred" id="mb-gd-pred">
          <div class="gd-pred-body"><div class="gd-h gd-tab">先輩の予想</div><p>「${predLine.split('|').join('<wbr>')}」</p></div><span class="gd-grad">卒業<i class="gd-made">まで</i> あと<b>${Math.max(0, GOAL - grad0)}</b></span></div>
        <div class="gd-lessons" id="mb-gd-lessons"><div class="gd-h"><span class="gd-hl">教わった3つの教え</span><b>使えるのは1つ</b></div>${lessonHTML}</div>
        <div class="gd-clue" id="mb-gd-clue" hidden></div>
      </div>
      <div class="rb-info gd-info">
        <div class="gd-sit"><span class="gd-cap">場札 ／ ミミの手（${mimiHandName}）</span><span class="gd-cards">${board.map(c => api.cardHTML(c, 'small')).join('')}<i class="gd-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</span></div>
        <div class="gd-scale"><div class="gd-scalebox"><svg class="gd-svg" viewBox="34 0 192 76" aria-hidden="true" id="mb-gd-svg"></svg><span class="gd-pan is-b">ブラフ</span><span class="gd-pan is-s">本物</span></div><div class="gd-odds" id="mb-gd-odds"></div></div>
        <div class="gd-habit" aria-label="ミミが大きな賭けを受けた20回のうち、降りた${folds}回"><span class="h">大きな賭け20回：<b class="f">降りた${folds}</b>・<b class="c">付いた${habit.length - folds}</b></span><span class="d">${habit.map(f => `<i class="${f ? 'f' : 'c'}"></i>`).join('')}</span></div>
      </div>
      <div class="rb-act gd-act" id="mb-gd-act"></div>`;
    const $ = (s) => root.querySelector(s);
    const setStep = (n, m) => { $('#mb-gd-steps').innerHTML = api.steps(steps, n); api.mission(m); };

    // 天秤：記録の重り（ミミの癖）と、教えの手がかりの重り
    const weights = [{ side: prior >= .5 ? 'b' : 's', w: Math.abs(Math.log(prior / (1 - prior))), rec: true }];
    let clue = null;
    const pB = () => { let o = prior / (1 - prior); if (clue) o *= clue.lean === 'bluff' ? clue.acc / (1 - clue.acc) : (1 - clue.acc) / clue.acc; return o / (1 + o); };
    const draw = () => {
      const pb = pB(), ang = -(pb - .5) * 2 * 18;
      const pan = (k, dx) => { const a = ang * Math.PI / 180, x = 130 + dx * Math.cos(a), y = 19.5 + dx * Math.sin(a); let yy = 18;
        const ws = weights.filter(w => w.side === k).map(w => { const wd = Math.min(46, 14 + w.w * 11); yy -= 9; return `<rect class="${w.rec ? 'rec' : 'clue'}" x="${(-wd / 2).toFixed(1)}" y="${yy}" width="${wd.toFixed(1)}" height="8" rx="1"/>`; }).join('');
        return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path class="str" d="M0 0 L-24 18 M0 0 L24 18"/>${ws}<path class="dish" d="M-28 18 H28 Q21 27 0 27 Q-21 27 -28 18 Z"/></g>`; };
      $('#mb-gd-svg').innerHTML = `<path class="post" d="M130 20 V68 M114 74 H146 L139 68 H121 Z"/><g transform="rotate(${ang.toFixed(2)} 130 19.5)"><rect class="beam" x="58" y="17" width="144" height="5" rx="1"/><circle class="beam" cx="130" cy="19.5" r="5"/></g>${pan('b', -66)}${pan('s', 66)}`;
      const side = pb >= .5 ? 'bluff' : 'strong';
      $('#mb-gd-odds').innerHTML = `<small>見込み</small><b class="is-${side}">${NAME[side]} ${Math.round(Math.max(pb, 1 - pb) * 100)}%</b>`;
      return pb;
    };
    draw();

    await api.rules({
      key: 'graduation', title: '卒業試験',
      goal: nw('先輩の賭けが<em>本物</em>か<em>ブラフ</em>かを読む。|<em>先輩の予想を外して当てる</em>と|卒業へ（3回）'),
      how: 'ミミの記録と先輩の予想を見て、教えを1つ使って読む',
      risk: nw('先輩はミミの癖の逆を突く。|予想どおりの読みは|卒業に数えない'),
      look: [['教え', '確かさと、今の場面'], ['読み', '天秤と先輩の予想'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    setStep(0, '先輩の予想と、ミミの記録を見る');
    api.coach(''); // 相手は先輩本人なので、リコ先輩の助言は出さない
    await api.wait(api.reduce ? 200 : 900);
    if (!api.alive()) return;

    // ② 教えを1つ選ぶ → 本当の手から手がかり
    setStep(1, '使う教えを1つ選ぶ');
    $('#mb-gd-lessons').classList.add('is-next');
    const li = await new Promise(res => root.querySelectorAll('.gd-lesson:not([disabled])').forEach(b => b.addEventListener('click', () => { api.sfx.tap(); res(+b.dataset.i); })));
    if (!api.alive()) return;
    const L = LESSONS[li];
    const lean = Math.random() < L.acc ? truth : other(truth);
    clue = { lean, acc: L.acc, text: api.pick(L.say[lean]).replace('{S}', shape) };
    weights.push({ side: lean === 'bluff' ? 'b' : 's', w: Math.log(L.acc / (1 - L.acc)) });
    root.querySelectorAll('.gd-lesson').forEach((b) => { b.disabled = true; });
    $('#mb-gd-lessons').hidden = true; // 教えの一覧は、得た手がかりの札に置き換える
    $('#mb-gd-lessons').classList.remove('is-next');
    const cl = $('#mb-gd-clue'); cl.hidden = false;
    cl.innerHTML = `<div class="gd-h">${L.name}<span class="gd-sure">${pips(sure(L.acc))}</span><b class="gd-lean is-${lean}">→ ${NAME[lean]}</b></div><p>${clue.text.split('|').join('<wbr>')}</p>`;
    api.sfx.good();
    const pb = draw();
    api.say(lean === 'bluff' ? '……何を見てるの？' : 'ふぅん。それで？', lean === 'bluff' ? 'panic' : 'smug');
    root.querySelector('.gd-por').classList.toggle('is-alt', lean === 'bluff');
    api.coach('');

    // ③ 読む：先輩の予想どおりか、外すかが見えるボタン
    setStep(2, '天秤と先輩の予想を見て、読む');
    const act = $('#mb-gd-act');
    const btn = (k, cls) => `<button class="btn ${cls}" id="mb-gd-${k}" type="button">${NAME[k]}と読む<small>${k === pred ? '先輩の予想どおり' : '先輩の予想を外す'}</small></button>`;
    act.innerHTML = `<div><div class="actions">${btn('bluff', '')}${btn('strong', 'quiet')}</div></div>`;
    const shownAt = performance.now();
    const decide = await new Promise(res => { const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); }; $('#mb-gd-bluff').onclick = on('bluff'); $('#mb-gd-strong').onclick = on('strong'); });
    if (!api.alive()) return;
    act.innerHTML = '';
    const defy = decide !== pred;
    $('#mb-gd-pred').classList.add(defy ? 'is-defied' : 'is-kept');
    $('#mb-gd-pred').insertAdjacentHTML('beforeend', `<span class="gd-stamp${defy ? '' : ' is-kept'}">${defy ? '予想を外した' : '予想どおり'}</span>`);
    api.say(defy ? '……へぇ。|そう来るの' : 'やっぱりね', defy ? 'panic' : 'smug');
    root.querySelector('.gd-por').classList.toggle('is-alt', defy);

    // ④ 自信
    setStep(3, '見込みで自信を決める');
    const pMine = Math.round((decide === 'bluff' ? pb : 1 - pb) * 100);
    await api.wager({ mission: '見込みで自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超→ぜったい　50%超→確信', base: BASE, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const m = api.mult || 1;
    const side = pb >= .5 ? 'bluff' : 'strong', pSide = Math.round(Math.max(pb, 1 - pb) * 100);
    const correct = decide === truth;
    const gradNow = grad0 + (correct && defy ? 1 : 0);
    const extra = correct && defy
      ? (gradNow >= GOAL ? '先輩の予想を外して当てた！ <b>卒業</b>' : `先輩の予想を外して当てた！ 卒業まで あと <b>${GOAL - gradNow}</b>`)
      : correct ? '当たり。でも先輩の予想どおりの読み（卒業には数えない）' : defy ? '予想は外したが、読みは外れ' : '先輩の予想どおりに読まれた';

    if (T) {
      api.entrust({
        pick: NAME[decide], win: BASE * m, lose: BASE * STAKES[m - 1],
        advice: (decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる') + (defy ? '（先輩の予想を外した）' : ''),
        pending: {
          title: '卒業試験', charId: 'rico', pick: decide, pred, truth, mimiEq, endLines: END, board, mine, her, base: BASE, mult: m, stakes: STAKES,
          perfect: correct && defy && m === 3, extra,
          notes: [{ label: `${L.name}「${clue.text.split('|').join('')}」→ ${NAME[clue.lean]}`, lean: clue.lean }],
          why: decide === side ? '' : `天秤の見込みは${NAME[side]} ${pSide}%だった。`,
        },
      });
      return;
    }
    // 単独ページ：その場で答え合わせ
    api.say(END[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')], correct ? 'busted' : 'smug');
    api.finish({ correct, base: BASE, perfect: correct && defy && m === 3, detail: `リコ先輩は${NAME[truth]}だった（${her.map(api.label).join(' ')}）。${extra.replace(/<[^>]+>/g, '')}` });
  }

  // 寸法は文字の段（--ty-*）で書く。スマホ横は真ん中 260px・右の枠 270px に収める
  const CSS = `
    .gd-root { position: relative; }
    .gd-play { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); grid-template-rows: auto minmax(0, 1fr); grid-template-areas: "por pred" "por les"; gap: 12px 16px; min-height: 0; }
    .gd-play > .gd-pred { grid-area: pred; } .gd-play > .gd-lessons, .gd-play > .gd-clue { grid-area: les; align-self: start; }
    /* PC：本気の先輩の大きな立ち絵（斜めの窓・胸元まで）。スマホ横は高さが無いので出さない */
    .gd-por { grid-area: por; position: relative; min-height: 0; overflow: hidden; clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%); background: linear-gradient(160deg, #5a1726, #1d080e 70%); border: 2px solid var(--gold); }
    .gd-por img { position: absolute; left: 50%; top: -2%; height: 112%; width: auto; max-width: none; transform: translateX(-50%); transition: opacity .15s; }
    .gd-por img.alt { opacity: 0; } .gd-por.is-alt img.alt { opacity: 1; } .gd-por.is-alt img.main { opacity: 0; }
    .gd-root.is-cp .gd-play { display: flex; flex-direction: column; gap: 8px; }
    .gd-root.is-cp .gd-por { display: none; }
    .gd-h { display: flex; align-items: baseline; gap: 10px; font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note); line-height: 1.4; color: var(--gold); }
    .gd-h b { color: var(--gold-hi); font-size: var(--ty-head); }
    .gd-pred { position: relative; margin-top: 10px; padding: 10px 12px 6px; background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); border: 1px solid var(--line); box-shadow: inset 3px 0 0 var(--crimson); }
    .gd-pred .gd-tab { position: absolute; left: 8px; top: -12px; padding: 0 8px; background: #130406; border: 1px solid var(--line); white-space: nowrap; }
    .gd-pred .gd-grad { position: absolute; right: 8px; top: -12px; padding: 0 8px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-note); line-height: 1.5; color: var(--gold-pale); background: #130406; border: 1px solid var(--gold); white-space: nowrap; }
    .gd-pred .gd-grad b { font-size: var(--ty-head); color: var(--gold-hi); margin-left: 4px; }
    .gd-pred p { margin: 2px 0 0; font-weight: 800; font-size: var(--ty-body); line-height: 1.4; color: var(--text); word-break: keep-all; overflow-wrap: anywhere; }
    .gd-pred.is-defied { border-color: var(--gold-hi); }
    .gd-stamp { position: absolute; right: 8px; top: -12px; padding: 0 8px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head); line-height: 1.3; color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border: 1px solid var(--crimson); transform: rotate(-5deg); animation: mb-gdStamp .4s cubic-bezier(.2,1.6,.4,1) both; }
    .gd-stamp.is-kept { color: #f0d08a; background: linear-gradient(180deg, var(--crimson), var(--crimson-lo)); border-color: var(--gold); }
    @keyframes mb-gdStamp { from { transform: rotate(-5deg) scale(2.4); opacity: 0; } }
    .gd-lessons { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
    .gd-lesson { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "n s" "d d"; gap: 0 8px; align-items: baseline; text-align: left; padding: 5px 12px 6px; cursor: pointer; color: var(--parch-ink); background: var(--parch); border: 0; border-radius: 2px; box-shadow: inset 0 0 0 1px var(--line), 0 4px 10px rgba(0,0,0,.4); font: inherit; }
    .gd-lesson .gd-ln { grid-area: n; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-btn2); line-height: 1.3; color: var(--crimson); }
    .gd-lesson .gd-sure { grid-area: s; }
    .gd-shape { font-style: normal; font-size: var(--ty-note); color: #5a4a36; display: none; }
    .gd-root.is-cp .gd-lesson small, .gd-root.is-cp .gd-sw { display: none; }
    .gd-clue[hidden], .gd-lessons[hidden] { display: none !important; }
    .gd-off { font-style: normal; } .gd-made { font-style: normal; }
    @media (max-width: 759px) { .gd-clue .gd-sure, .gd-hl, .gd-made { display: none; } .gd-clue p { line-height: 1.3; } .gd-play { gap: 4px; } .gd-pred { margin-top: 8px; } .gd-lessons { gap: 4px; } .gd-root.is-cp .gd-lesson { padding: 3px 10px; } }
    .gd-root.is-cp .gd-lesson { padding: 4px 12px; }
    .gd-lesson small { grid-area: d; font-size: var(--ty-note); font-weight: 700; line-height: 1.35; color: #5a4a36; }
    .gd-lesson:not([disabled]):hover, .gd-lesson:not([disabled]):focus-visible { box-shadow: inset 0 0 0 2px var(--gold-hi), 0 4px 10px rgba(0,0,0,.4); }
    .gd-lesson[disabled] { cursor: default; }
    .gd-lesson.is-off, .gd-lesson[disabled]:not(.is-used) { opacity: .45; }
    .gd-lesson.is-used { box-shadow: 0 0 0 2px #130406, 0 0 0 3px var(--gold-hi); }
    .gd-lessons.is-next .gd-lesson:not([disabled]) { outline: 1px solid rgba(239,205,130,.22); outline-offset: 2px; animation: mb-gdPulse 1.3s ease-in-out infinite; }
    @keyframes mb-gdPulse { 50% { outline-color: rgba(239,205,130,.95); } }
    .gd-sure { display: inline-flex; align-items: center; gap: 4px; font-size: var(--ty-note); font-weight: 700; color: #5a4a36; white-space: nowrap; }
    .gd-pips { display: inline-flex; gap: 2px; } .gd-pips i { width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid #8a6a3a; } .gd-pips i.on { background: #a8182a; border-color: #a8182a; }

    .gd-info { gap: 6px !important; overflow-x: hidden; }
    .gd-sit { display: flex; flex-direction: column; gap: 2px; }
    .gd-cap { font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note); color: var(--gold); white-space: nowrap; }
    .gd-cards { display: flex; gap: 2px; align-items: center; }
    .gd-sep { width: 8px; }
    .gd-scale { display: flex; align-items: center; gap: 8px; }
    .gd-scalebox { position: relative; flex: 1 1 auto; min-width: 0; }
    .gd-svg { display: block; width: 100%; max-height: 40px; }
    .gd-svg .post { fill: none; stroke: var(--gold); stroke-width: 2; } .gd-svg .beam { fill: var(--gold-hi); }
    .gd-svg .str { stroke: var(--gold); stroke-width: 1; } .gd-svg .dish { fill: var(--gold); }
    .gd-svg rect.rec { fill: #8a7a5e; } .gd-svg rect.clue { fill: #f4e4bd; stroke: #6b4306; stroke-width: .6; }
    .gd-pan { position: absolute; bottom: -3px; white-space: nowrap; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-note); line-height: 1.3; } .gd-pan.is-b { left: 0; color: #ff8f9c; } .gd-pan.is-s { right: 0; color: var(--gold-hi); }
    .gd-odds { display: flex; flex-direction: column; align-items: flex-end; font-family: var(--mincho); }
    .gd-odds small { font-size: var(--ty-note); color: var(--dim); }
    .gd-odds b { font-size: var(--ty-head); font-weight: 800; white-space: nowrap; } .gd-odds b.is-bluff { color: #ff8f9c; } .gd-odds b.is-strong { color: var(--gold-hi); }
    .gd-habit { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; font-size: var(--ty-note); color: var(--dim); }
    .gd-habit .d { display: flex; gap: 1px; } .gd-habit .d i { flex: 1 1 0; height: 12px; background: var(--gold); } .gd-habit .d i.f { background: var(--red-hi); }
    .gd-habit .h { white-space: nowrap; } .gd-habit b { font-weight: 800; } .gd-habit b.f { color: #ff8f9c; } .gd-habit b.c { color: var(--gold-hi); }
    .gd-clue { padding: 4px 10px 6px; background: var(--parch); color: var(--parch-ink); border-radius: 2px; box-shadow: 0 0 0 2px #130406, 0 0 0 3px var(--gold-hi); }
    .gd-clue .gd-h { color: var(--crimson); }
    .gd-clue p { margin: 0; font-weight: 700; font-size: var(--ty-body); line-height: 1.4; word-break: keep-all; overflow-wrap: anywhere; }
    .gd-lean { margin-left: auto; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head); white-space: nowrap; } .gd-lean.is-bluff { color: #a8182a; } .gd-lean.is-strong { color: #6b4306; }
    .rb-act > div > .actions { display: flex; gap: 12px; justify-content: center; }
    @media (prefers-reduced-motion: reduce) { .gd-stamp, .gd-lessons.is-next .gd-lesson { animation: none !important; } }
  `;
})();
