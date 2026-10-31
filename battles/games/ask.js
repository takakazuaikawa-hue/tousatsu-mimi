// 心理：問いかけ（手がかり探偵の作り替え・卓の本当の手の版）2026-10-27
// 3つの問いかけ（顔をのぞきこむ／数字で揺さぶる／雑談をふる）から1つを選んで投げると、相手が反応する（反応が出る／出ない）。
// 反応の出方は人で違う（相手の癖は全種類で同じ：ポルカは顔に出る、セリナは顔に出ないが、数字の話になると眼鏡を押し上げる）。
// 反応が出たらブラフ寄り、出なければ本物寄りの重りが天秤に乗る。重さは問いかけの札に◆で書く（見えない物で失敗させない）。
// 2つ目も聞けるが、ご褒美が減る（60→40）。試算：効く問いかけを1つだけ聞くのが一番得（ポルカ 143.8・セリナ 140.6）、効かない問いかけは聞かないのとほぼ同じ。
(() => {
  const STAKES = [0, 1, 3];
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  const PRIOR = { polka: .65, selina: .25 };
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };
  // 問いかけ：b＝ブラフの時に反応が出る割合、s＝本物の時に反応が出る割合
  const QS = [
    { id: 'face', short: '顔', name: '顔をのぞきこむ', ask: '（じっと顔をのぞきこむ）' },
    { id: 'num', short: '数字', name: '数字で揺さぶる', ask: '「その手、勝つ見込みは何%？」' },
    { id: 'talk', short: '雑談', name: '雑談をふる', ask: '「ねえ、好きなケーキは？」' },
  ];
  const CH = {
    polka: {
      p: { face: [.9, .1], num: [.55, .4], talk: [.6, .3] },
      re: {
        face: ['目が泳いだ。「な、なに見てるの！？」', 'にっこり見返してきた。「なーに？ ボクの顔、かわいい？」'],
        num: ['「え、えっと……ろ、60くらい？」声が裏返った', '「勝つ見込み？ 高いよ！」すぐ答えた'],
        talk: ['雑談に乗ってこない。チップをいじっている', '「いちご！ ミミちゃんは？」楽しそうに話す'],
      },
      open: 'なになに？ ボクに聞きたいこと、ある？',
      end: { bc: 'うわーん、バレてたー！', bw: 'えへへ、降りてくれてありがと！', sc: 'ちぇっ、降りちゃうんだ……', sw: '残念っ、本物だよー！' },
    },
    selina: {
      p: { face: [.3, .2], num: [.8, .08], talk: [.45, .35] },
      re: {
        face: ['まばたきが、一度だけ多かった', '表情は、まったく動かない'],
        num: ['眼鏡を、指で押し上げた', '「……計算済み」すぐに答えた'],
        talk: ['「……今は、関係ない」', '「……そう」短く返した'],
      },
      open: '……質問なら、手短に。',
      end: { bc: '……見抜かれたわね', bw: '……ふふ、降りてくれて助かったわ', sc: '……賢明ね', sw: '……だから言ったでしょう' },
    },
  };
  const CSS = `
    .aq-play { position: relative; display: flex; align-items: stretch; justify-content: center; min-height: 0; }
    .aq-win { position: relative; flex: 0 1 62%; min-width: 0; overflow: hidden; transform: skewX(-8deg); border: 3px solid var(--gold); background: linear-gradient(180deg, var(--band), var(--ebony-lo)); box-shadow: 0 10px 22px rgba(0,0,0,.6); }
    .aq-win img { position: absolute; left: -12%; top: -4%; width: 124%; height: 112%; object-fit: cover; object-position: 50% 22%; transform: skewX(8deg); transition: opacity .12s; }
    .aq-win img.alt { opacity: 0; }
    .aq-play.is-react .aq-win img.alt { opacity: 1; } .aq-play.is-react .aq-win img.main { opacity: 0; }
    .aq-play.is-shake .aq-win { animation: mb-aqShake .32s ease; }
    @keyframes mb-aqShake { 30% { transform: skewX(-8deg) translate(-7px, 2px); } 65% { transform: skewX(-8deg) translate(5px, -2px); } }
    .aq-pop { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 6px 12px 8px; font-size: var(--ty-body, 17px); line-height: 1.45; text-align: center; }
    .aq-pop small { display: block; font-size: 14px; line-height: 1.3; }
    .aq-pop.pop { animation: mb-aqPop .35s cubic-bezier(.2,1.4,.4,1) backwards; }
    @keyframes mb-aqPop { from { transform: scale(1.08); opacity: 0; } }
    .aq-ask { position: absolute; left: 0; top: 4px; z-index: 3; max-width: 60%; padding: 4px 10px; font-family: var(--mincho); font-weight: 800; font-size: var(--ty-body, 17px); line-height: 1.4; color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); }
    .aq-sit { display: flex; flex-direction: column; gap: 2px; }
    .aq-sit-cap { font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .aq-sit-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .aq-sep { width: 8px; flex: 0 0 auto; }
    .aq-log { display: flex; flex-direction: column; gap: 3px; }
    .aq-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 8px; min-height: 26px; border: 1px solid var(--line-dim); background: rgba(19,4,6,.7); font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .aq-row .l { font-weight: 800; } .aq-row .l.bluff { color: #a01f35; } .aq-row .l.strong { color: #7a5410; }
    .aq-row.is-empty .l { color: var(--dim); }
    .aq-qs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, .6fr); gap: 6px; height: 100%; width: 100%; }
    .aq-qs .btn { margin: 0; min-height: 0; min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1px; padding: 2px 6px; }
    .aq-qs .btn > span { font-size: var(--ty-btn2, 17px); line-height: 1.2; }
    .aq-qs .btn > small b { font-weight: 700; white-space: nowrap; }
    .aq-qs .btn > small { font-size: 14px; line-height: 1.3; white-space: nowrap; }
    .aq-qs .btn > small b { font-weight: 800; }
    .aq-qs .btn[disabled] { opacity: .45; }
    /* 動揺＝ブラフ寄り（赤の◆）・平気＝本物寄り（金の◆）。寄りは色で見せる（4点の札の「やり方」で説明） */
    .aq-qs .aq-b .mb-pips i.on { background: #e0485c; } .aq-qs .aq-s .mb-pips i.on { background: #f5d77a; }
    .aq-qs .btn.gold .aq-b .mb-pips i.on { background: #a01f35; } .aq-qs .btn.gold .aq-s .mb-pips i.on { background: #7a5410; }
  `;

  async function start({ api }) {
    const who = api.charId === 'selina' ? 'selina' : 'polka';
    const ch = CH[who];
    const jp = api.char.jp;
    const T = api.table;
    const record = [...recordOf(PRIOR[who]), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    let board, mine, her, truth, mimiEq;
    if (T) { board = T.board; mine = T.mine; her = T.her; }
    else { const d = api.shuffle(api.deck()); mine = d.slice(0, 2); her = d.slice(2, 4); board = d.slice(4, 8); }
    mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    truth = mimiEq >= 50 ? 'bluff' : 'strong';
    const mimiHandName = api.CAT_NAME[api.category([...mine, ...board])];
    // 反応の重さ（その結果が出た時に当たる率に直す）
    const accOf = (q, react) => { const [b, s] = ch.p[q]; const lr = react ? b / s : (1 - b) / (1 - s); const x = lr >= 1 ? lr : 1 / lr; return x / (1 + x); };
    const pipsOf = (q, react) => api.pips(api.sure(accOf(q, react)));

    api.css('ask', CSS);
    api.say(ch.open, who === 'selina' ? 'think' : 'smug'); api.bet(T ? (T.toCall || '—') : 400);
    const root = api.root;
    const bal = api.balance({ record, name: jp });
    const STEPS = ['問いかける', '読む', '賭ける', '答え合わせ'];
    root.classList.add('rb-frame');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-aq-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play aq-play" id="mb-aq-play"><div class="aq-win"><img class="main" src="${api.asset('art/face/' + api.charId + '_smug.webp')}" alt="${jp}"><img class="alt" src="${api.asset('art/face/' + api.charId + '_panic.webp')}" alt=""></div></div>
      <div class="rb-info">
        <div class="aq-sit"><div class="aq-sit-cap">場札 ／ ミミの手（${mimiHandName}）</div>
          <div class="aq-sit-row">${board.map(c => api.cardHTML(c, 'small')).join('')}<i class="aq-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</div></div>
        ${bal.html}
        <div class="aq-log" id="mb-aq-log">${[0, 1].map(i => `<div class="aq-row is-empty" data-i="${i}"><span>問いかけ${i + 1}</span><span class="l">まだ聞いていない</span></div>`).join('')}</div>
      </div>
      <div class="rb-act" id="mb-aq-act"></div>`;
    bal.draw();
    const $ = (s) => root.querySelector(s);
    const play = $('#mb-aq-play'), act = $('#mb-aq-act');
    await api.rules({
      key: 'ask', title: '問いかけ',
      goal: `${jp}の伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む。答え合わせはこの手の決着の後`,
      how: `3つの問いかけから1つを選ぶと、${jp}が反応する。<em>反応が出たらブラフ寄り、出なければ本物寄り</em>の重りが天秤に乗る`,
      risk: '2つ目も聞けるが、ご褒美が減る（60→40）。効かない問いかけでは、天秤はほとんど動かない',
      look: [['どれを聞くか', '札の◆（その人に効く問いかけほど多い）'], ['本物かブラフか', '天秤'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    api.tipOnce('ask', `${jp}に<b>効く問いかけ</b>を1つ。◆の多い札`, 'think');
    const asked = [];
    while (asked.length < 2) {
      api.mission(asked.length ? '2つ目も聞く？' : `どれを聞く？`);
      if (asked.length) api.coach('2つ目を聞くと、ご褒美は 60→40', 'think');
      const pb = bal.p(), pNow = Math.round(Math.max(pb, 1 - pb) * 100);
      act.innerHTML = `<div class="aq-qs">${QS.map(q => `<button class="btn${asked.includes(q.id) ? '' : ' gold'}" data-q="${q.id}" type="button"${asked.includes(q.id) ? ' disabled' : ''}><span>${q.name}</span><small><b class="aq-b">動揺${pipsOf(q.id, true)}</b> <b class="aq-s">平気${pipsOf(q.id, false)}</b></small></button>`).join('')}
        <button class="btn quiet" data-q="stop" type="button"><span>読む</span><small>見込み${pNow}%</small></button></div>`;
      const q = await new Promise(res => act.querySelectorAll('button').forEach(b => { b.onclick = () => { api.sfx.tap(); res(b.dataset.q); }; }));
      if (!api.alive()) return;
      if (q === 'stop') break;
      act.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const Q = QS.find(x => x.id === q);
      const [pB, pS] = ch.p[q];
      const react = Math.random() < (truth === 'bluff' ? pB : pS);
      // 問いかけ → ため → 反応
      play.querySelector('.aq-ask')?.remove(); play.querySelector('.aq-pop')?.remove();
      play.classList.remove('is-react');
      const ask = document.createElement('div'); ask.className = 'aq-ask'; ask.textContent = Q.ask; play.appendChild(ask);
      api.say('……', 'think'); api.sfx.tick();
      await api.wait(api.reduce ? 200 : 1000); if (!api.alive()) return;
      if (react) { play.classList.add('is-react'); play.classList.remove('is-shake'); void play.offsetWidth; play.classList.add('is-shake'); api.emote('panic'); api.sfx.good(); }
      else { api.emote(who === 'selina' ? 'think' : 'smug'); api.sfx.tap(); }
      const pop = document.createElement('div'); pop.className = 'aq-pop mb-ebony pop';
      pop.innerHTML = `<small class="mb-label">${react ? '動揺した' : '平気だった'}</small>${ch.re[q][react ? 0 : 1]}`;
      play.appendChild(pop);
      const lean = react ? 'bluff' : 'strong', acc = accOf(q, react);
      bal.add(lean, acc);
      asked.push(q);
      const row = root.querySelector(`.aq-row[data-i="${asked.length - 1}"]`);
      row.className = 'aq-row mb-parchment is-flat';
      row.innerHTML = `<span>${Q.short}：${react ? '動揺' : '平気'} ${api.pips(api.sure(acc))}</span>${api.lean(lean)}`;
      row._note = { label: `${Q.name}：${react ? '動揺した' : '平気だった'} → ${NAME[lean]}寄り`, lean };
      await api.wait(api.reduce ? 200 : 700); if (!api.alive()) return;
    }
    root.querySelectorAll('.aq-row.is-empty .l').forEach(t => { t.textContent = '聞かなかった'; });
    const base = asked.length >= 2 ? 40 : 60;

    $('#mb-aq-steps').innerHTML = api.steps(STEPS, 1);
    api.mission('天秤の傾きで読む');
    act.innerHTML = `<div class="actions">
      <button class="btn" id="mb-aq-b" type="button">ブラフと読む<small>ミミの方が強い</small></button>
      <button class="btn quiet" id="mb-aq-s" type="button">本物と読む<small>ミミより強い</small></button></div>`;
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-aq-b').onclick = on('bluff'); $('#mb-aq-s').onclick = on('strong');
    });
    if (!api.alive()) return;
    act.innerHTML = '';
    $('#mb-aq-steps').innerHTML = api.steps(STEPS, 2);
    const pNow = bal.p(), pMine = Math.round((decide === 'bluff' ? pNow : 1 - pNow) * 100);
    await api.wager({ mission: '見込みで自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超→ぜったい　50%超→確信', base, stakes: STAKES, into: act });
    if (!api.alive()) return;
    const best0 = pNow >= .5 ? 'bluff' : 'strong', pBest0 = Math.round(Math.max(pNow, 1 - pNow) * 100);
    const m = api.mult || 1;
    const notes = [...root.querySelectorAll('.aq-row')].map(r => r._note).filter(Boolean);
    const why = decide === best0 ? `天秤の見込みが高い方（${NAME[best0]} ${pBest0}%）を選んだ判断は正しい。` : `天秤の見込みは${NAME[best0]}が${pBest0}%だった。`;
    if (T) {
      api.entrust({
        pick: NAME[decide], win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる',
        pending: { title: '問いかけ', charId: api.charId, pick: decide, truth, mimiEq, endLines: ch.end, board, mine, her, base, mult: m, stakes: STAKES,
          perfect: asked.length === 1 && m === 3, notes, why },
      });
      return;
    }
    api.lossK = STAKES;
    const correct = decide === truth;
    api.say(ch.end[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')], correct ? 'busted' : 'smug');
    api.finish({ correct, base, perfect: correct && asked.length === 1 && m === 3, detail: `${jp}は${NAME[truth]}（${her.map(api.label).join(' ')}）だった。${why}` });
  }

  MB.register({ id: 'ask', group: 'psych', order: 1, title: '問いかけ', sub: '心理 · 揺さぶり', isNew: true, chars: ['polka', 'selina'], start });
})();
