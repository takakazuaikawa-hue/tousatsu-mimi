// 論理：危険札さがし（セリナ卓）
// 場札の中から「相手が持っていたら怖い形」を指で見つけ、賭け額の癖と合わせて付いていくか決める。
MB.register({
  id: 'danger', group: 'logic', order: 3, title: '危険札さがし', sub: 'LOGIC · 場札',
  chars: ['selina'],
  async start({ api }) {
    const T = [
      { board: [[13, 'A'], [8, 'A'], [3, 'A'], [5, 'B'], [11, 'C']], mine: [[13, 'B'], [12, 'D']], threats: [{ type: 'flush', idx: [0, 1, 2] }], bet: 1, strong: 0.75 },
      { board: [[9, 'A'], [10, 'B'], [11, 'C'], [3, 'D'], [2, 'A']], mine: [[11, 'D'], [14, 'B']], threats: [{ type: 'straight', idx: [0, 1, 2] }], bet: 1, strong: 0.7 },
      { board: [[8, 'A'], [9, 'A'], [10, 'B'], [2, 'A'], [13, 'C']], mine: [[13, 'D'], [12, 'B']], threats: [{ type: 'flush', idx: [0, 1, 3] }, { type: 'straight', idx: [0, 1, 2] }], bet: 1, strong: 0.85 },
      { board: [[13, 'A'], [7, 'B'], [2, 'C'], [4, 'D'], [9, 'A']], mine: [[13, 'C'], [12, 'D']], threats: [], bet: 0.33, strong: 0.25 },
      { board: [[12, 'A'], [12, 'B'], [6, 'C'], [3, 'D'], [9, 'A']], mine: [[14, 'D'], [9, 'C']], threats: [{ type: 'pair', idx: [0, 1] }], bet: 1, strong: 0.45 },
    ];
    const t = api.pick(T);
    const perm = api.shuffle(api.SUITS); const map = { A: perm[0], B: perm[1], C: perm[2], D: perm[3] };
    const board = t.board.map(([r, x]) => ({ r, s: map[x] }));
    const mine = t.mine.map(([r, x]) => ({ r, s: map[x] }));
    const P = api.pick([300, 360, 400]); const B = Math.round(P * t.bet / 10) * 10;
    const need = B / (P + 2 * B);
    const threats = t.threats.map(th => ({ ...th, cards: th.idx.map(i => board[i]), found: false }));
    const TXT = {
      flush: (cs) => `${api.SYM[cs[0].s]}が3枚 → ${api.SYM[cs[0].s]}を2枚持っていたらフラッシュ`,
      straight: (cs) => `${cs.map(c => api.rn(c.r)).join('・')}が並ぶ → あと2枚でストレート`,
      pair: (cs) => `${api.rn(cs[0].r)}が2枚 → もう1枚でスリーカード`,
    };
    api.say(B >= P ? '……ポット。' : '少しだけ。', 'think'); api.bet(B);
    api.css('danger', `
      .dg-board .card { cursor: pointer; }
      .dg-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; min-height: 30px; }
      .dg-pill { font-size: 13px; padding: 4px 12px; border: 1px solid rgba(255,74,96,.6); background: rgba(200,37,58,.25); }
      .dg-pill.calm { border-color: rgba(143,227,168,.5); background: rgba(143,227,168,.1); }
      .dg-radar { position: relative; max-width: 560px; width: 100%; margin: 0 auto; }
      .dg-bar { position: relative; margin-top: 24px; height: 30px; background: rgba(0,0,0,.45); border: 1px solid var(--faint); }
      .dg-fill { position: absolute; inset: 0 auto 0 0; width: 0; background: linear-gradient(90deg, #a47a22, var(--gold-hi)); transition: width .9s cubic-bezier(.2,.8,.2,1); }
      .dg-line { position: absolute; top: -8px; bottom: -8px; width: 3px; background: var(--red-hi); box-shadow: 0 0 10px var(--red-hi); left: 0; transition: left .8s ease .2s; }
      .dg-line span { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 12px; font-weight: 700; color: var(--red-hi); }
      .dg-val { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-family: var(--disp); font-size: 20px; }
    `);
    const root = api.root;
    root.innerHTML = `
      ${api.steps(['怖い形をさがす', '賭け額を読む', '決める', '答え合わせ'], 0)}
      <div class="row dg-board" id="mb-dg-board">${board.map((c, i) => api.cardHTML(c, 'big tap').replace('<span class', `<span data-i="${i}" class`)).join('')}</div>
      <div class="row">${mine.map(c => api.cardHTML(c, 'big')).join('')}<span class="formula">ミミ：${api.CAT_NAME[api.category([...mine, ...board])]}</span></div>
      <p class="prompt">この場札、セリナが持っていたら怖い役は？ 怖い形をつくる場札をタップ</p>
      <div class="dg-pills" id="mb-dg-pills"></div>
      <div class="actions"><button class="btn quiet" id="mb-dg-none">怖い形はない</button><button class="btn quiet" id="mb-dg-done" hidden>もう無い</button></div>`;
    api.coach('同じマークが<b>3枚</b>、数字が<b>3つ並ぶ</b>、同じ数字が<b>2枚</b>。怖い形はこの3つ');
    const sel = new Set(); let miss = 0, helped = false;
    const markFound = (th) => {
      th.found = true; api.sfx.good(); api.coach('見つけた！ ' + TXT[th.type](th.cards), 'smug');
      th.idx.forEach(j => { const c = root.querySelector(`[data-i="${j}"]`); c.classList.remove('sel', 'hint'); c.classList.add('danger'); sel.delete(j); });
      root.querySelector('#mb-dg-pills').insertAdjacentHTML('beforeend', `<span class="dg-pill pop">${TXT[th.type](th.cards)}</span>`);
      root.querySelector('#mb-dg-done').hidden = false; root.querySelector('#mb-dg-none').hidden = true;
    };
    // 2回まちがえたら、残っている形の札を1枚光らせる。4回まちがえたら、その形を見せて先へ進める
    const help = () => {
      const th = threats.find(x => !x.found); if (!th) return;
      if (miss >= 4) { helped = true; markFound(th); api.coach('ここが怖い形。' + TXT[th.type](th.cards)); return; }
      if (miss >= 2) th.idx.filter(j => !sel.has(j)).slice(0, 1).forEach(j => root.querySelector(`[data-i="${j}"]`).classList.add('hint'));
    };
    await new Promise(res => {
      root.querySelector('#mb-dg-board').addEventListener('click', (e) => {
        const el = e.target.closest('.card'); if (!el) return;
        const i = +el.dataset.i;
        if (!threats.some(th => !th.found && th.idx.includes(i))) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); api.sfx.nope(); miss++; help(); return; }
        el.classList.toggle('sel'); api.sfx.tap();
        if (el.classList.contains('sel')) sel.add(i); else sel.delete(i);
        for (const th of threats) if (!th.found && th.idx.every(j => sel.has(j))) markFound(th);
      });
      root.querySelector('#mb-dg-none').onclick = () => {
        if (threats.length) { miss++; api.sfx.nope(); help(); if (helped) return; api.coach('よく見て。' + (threats[0].type === 'flush' ? '同じマークが集まってない？' : threats[0].type === 'straight' ? '数字が並んでない？' : '同じ数字が2枚ない？')); return; }
        root.querySelector('#mb-dg-pills').innerHTML = '<span class="dg-pill calm pop">怖い形なし：マークはばらばら、数字も離れてる</span>'; res();
      };
      root.querySelector('#mb-dg-done').onclick = () => {
        const left = threats.filter(x => !x.found);
        if (left.length) { miss++; api.sfx.nope(); help(); if (helped && !threats.some(x => !x.found)) return; api.coach('あと1つ隠れてる。' + (left[0].type === 'straight' ? '数字の並び' : left[0].type === 'flush' ? 'マーク' : '同じ数字') + 'を見て'); return; }
        res();
      };
    });
    if (!api.alive()) return;
    api.sfx.fanfare();
    root.querySelector('.actions').remove();
    root.querySelector('.steps').outerHTML = api.steps(['怖い形をさがす', '賭け額を読む', '決める', '答え合わせ'], 1);
    const big = B >= P * 0.9, winPct = Math.round(100 - t.strong * 100);
    const box = document.createElement('div'); box.className = 'dg-radar pop';
    box.innerHTML = `<p class="prompt">${big ? 'ポットと同じ額' : 'ポットの3分の1'}を賭けてきた</p>
      <div class="formula">これまでのセリナ：<b>${big ? '大きく' : '小さく'}賭けた時、10回中${Math.round(t.strong * 10)}回</b>は${threats.length ? 'その形ができていた' : 'ミミより強かった'}</div>
      <div class="dg-bar"><div class="dg-fill" id="mb-dg-fill"></div><div class="dg-line" id="mb-dg-line"><span>割に合う線 ${Math.round(need * 100)}%</span></div><div class="dg-val">ミミが勝つ ${winPct}%</div></div>
      <div class="actions"><button class="btn" id="mb-dg-call">コール<small>${B} 払って見せ合う</small></button><button class="btn quiet" id="mb-dg-fold">降りる<small>ここまでで止める</small></button></div>`;
    root.appendChild(box);
    api.coach(big && threats.length ? '怖い形があって、大きく賭けた。セリナは<b>賭け額に正直</b>な子' : '形はできてなさそうで、賭け額も小さい。どうする？');
    await api.wait(200);
    box.querySelector('#mb-dg-fill').style.width = winPct + '%'; box.querySelector('#mb-dg-line').style.left = Math.round(need * 100) + '%';
    const called = await new Promise(res => { box.querySelector('#mb-dg-call').onclick = () => res(true); box.querySelector('#mb-dg-fold').onclick = () => res(false); });
    if (!api.alive()) return;
    box.querySelector('.actions').remove();
    const right = called === (winPct / 100 >= need);
    await api.wager({ question: `「${called ? '付いていく' : '降りる'}」と決めた。自信は？`, base: 30 });
    if (!api.alive()) return;
    // 相手の本当の手：形ができている確率 t.strong
    const strong = Math.random() < t.strong;
    const used = new Set([...board, ...mine].map(api.key));
    const free = api.deck().filter(c => !used.has(api.key(c)));
    const myCat = api.category([...mine, ...board]);
    const needCat = threats.some(x => x.type === 'flush' || x.type === 'straight') ? 4 : threats.length ? 3 : myCat + 1;
    let her = null;
    for (let k = 0; k < 8000 && !her; k++) {
      const h = [api.pick(free), api.pick(free)]; if (api.key(h[0]) === api.key(h[1])) continue;
      const c = api.category([...h, ...board]);
      if (strong ? (c >= needCat && api.score([...h, ...board]) > api.score([...mine, ...board])) : api.score([...h, ...board]) < api.score([...mine, ...board])) her = h;
    }
    api.sfx.drum(); api.coach(called ? '見せ合い……！' : '降りた。セリナの手札、こっそり見ちゃお');
    await api.wait(1000);
    root.querySelector('#mb-dg-board').insertAdjacentHTML('afterend', `<div class="row"><span class="formula">セリナ</span>${her.map(c => api.cardHTML(c, 'big flip')).join('')}<span class="formula">${api.CAT_NAME[api.category([...her, ...board])]}</span></div>`);
    api.say(strong ? (called ? '……当然。' : '……賢明。') : (called ? '……っ。' : '……ふふ。'), strong ? (called ? 'win' : 'think') : (called ? 'panic' : 'smug'));
    await api.wait(800);
    api.finish({
      extra: api.tally(winPct, P + B, B, called),
      correct: right, perfect: right && miss === 0 && !helped && api.mult === 3, base: 30,
      title: right ? (called === !strong ? '判断◎' : '判断◎（今回は運が外れ）') : (called === !strong ? '判断△（今回は運が味方）' : '判断△'),
      detail: `セリナは${strong ? '形ができていた' : 'ブラフだった'}。${right ? (called ? 'この賭け方なら付いていく方が得。' : 'この形とこの賭け額なら、降りるのが得。') : (called ? 'この形とこの賭け額なら、降りる方が得だった。' : 'この賭け方なら、付いていく方が得だった。')}`,
    });
  },
});
