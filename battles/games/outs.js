// 論理：アウツさがし＋確率スロット（グラーノ卓）
// 残りの山から「当たり札」を指で集め、払う額と比べて付いていくか決める。
// 最後の1枚は、当たり札だけが金色のスロットで回る＝当たる確率が目で見える。
MB.register({
  id: 'outs', group: 'logic', order: 5, title: 'アウツさがし＋スロット', sub: 'LOGIC · 確率', isNew: true,
  chars: ['grano'],
  async start({ api }) {
    const { deck, key, category, cardHTML, backHTML, SUITS, SYM, rn } = api;
    // 問題を作る：手札2枚とも生きる待ち（フラッシュ9枚／両はしのストレート8枚／両方15枚）
    const gen = () => {
      const wantCall = Math.random() < 0.5;
      for (let t = 0; t < 5000; t++) {
        const d = api.shuffle(deck());
        const hole = [d[0], d[1]], board = [d[2], d[3], d[4], d[5]];
        const known = [...hole, ...board];
        if (category(board) > 0 || category(known) > 1) continue;
        const rest = deck().filter(c => !known.some(k => key(k) === key(c)));
        const outs = rest.filter(c => category([...known, c]) >= 4 && category([...board, c]) < 4 && category([hole[0], ...board, c]) < 4 && category([hole[1], ...board, c]) < 4);
        if (![8, 9, 15].includes(outs.length)) continue;
        const eq = outs.length / rest.length, rule = outs.length * 2 / 100;
        const P = api.pick([200, 240, 300, 360]);
        for (const f of api.shuffle(wantCall ? [0.12, 0.15, 0.2, 0.25, 0.33] : [0.5, 0.66, 0.75, 1])) {
          const B = Math.max(10, Math.round(P * f / 10) * 10);
          const need = B / (P + 2 * B);
          if (Math.abs(eq - need) < 0.035 || (eq >= need) !== (rule >= need) || (eq >= need) !== wantCall) continue;
          return { hole, board, rest, outs, eq, need, P, B };
        }
      }
      return null;
    };
    const s = gen();
    const pct = (x) => Math.round(x * 1000) / 10;
    api.say(api.pick(['この値段で付いてくるかい？', 'お代はこれだけ。安いもんだろう？', '払うかどうか、よく計算してごらん']), 'smug');
    api.bet(s.B);
    api.css('outs', `
      .outs-deck { display: grid; grid-template-columns: repeat(13, minmax(0, 1fr)); gap: 4px; max-width: 760px; margin: 0 auto; width: 100%; }
      .outs-deck .card { --w: 100%; width: 100%; height: auto; aspect-ratio: 5 / 7; border-radius: 4px; }
      .outs-deck .card b { font-size: clamp(11px, 2.4vw, 20px); } .outs-deck .card i { font-size: clamp(9px, 1.9vw, 15px); }
      .outs-deck .card.known { opacity: .2; cursor: default; }
      .outs-deck .card.found { background: linear-gradient(180deg, #fff7d6, #f5d77a); border-color: #b8860b; transform: translateY(-3px); box-shadow: 0 0 12px rgba(245,215,122,.8); }
      .outs-deck .card.shown { border-color: var(--gold-hi); border-style: dashed; }
      .outs-deck .card.hint { box-shadow: 0 0 0 2px rgba(245,215,122,.6); }
      .outs-deck.is-collapsed { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; max-width: none; }
      .outs-deck.is-collapsed .card { display: none; }
      .outs-deck.is-collapsed .card.found, .outs-deck.is-collapsed .card.shown { display: flex; width: 42px; flex: 0 0 42px; transform: none; }
      .outs-deck.is-collapsed .card b { font-size: 16px; } .outs-deck.is-collapsed .card i { font-size: 12px; }
      .outs-count { font-family: var(--disp); font-size: 30px; text-align: center; color: var(--gold-hi); font-variant-numeric: tabular-nums; }
      .outs-count small { font-family: var(--sans); font-size: 12px; color: var(--dim); margin-left: 6px; }
      .outs-meter { max-width: 620px; width: 100%; margin: 0 auto; display: grid; gap: 8px; }
      .outs-bar { position: relative; margin-top: 24px; height: 34px; background: rgba(0,0,0,.45); border: 1px solid var(--faint); }
      .outs-fill { position: absolute; inset: 0 auto 0 0; width: 0; background: linear-gradient(90deg, #a47a22, var(--gold-hi)); transition: width 1s cubic-bezier(.2,.8,.2,1); }
      .outs-line { position: absolute; top: -8px; bottom: -8px; width: 3px; background: var(--red-hi); box-shadow: 0 0 10px var(--red-hi); left: 0; transition: left .8s ease .2s; }
      .outs-line span { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 12px; font-weight: 700; color: var(--red-hi); }
      .outs-val { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-family: var(--disp); font-size: 22px; }
      /* 確率スロット：当たり札だけ金色のリール */
      .reel-wrap { position: relative; max-width: 720px; width: 100%; margin: 0 auto; height: 108px; overflow: hidden; background: linear-gradient(180deg, #0c0306, #26070f 50%, #0c0306); border-block: 3px solid var(--gold); box-shadow: inset 0 0 30px rgba(0,0,0,.9); }
      .reel-wrap::before, .reel-wrap::after { content: ""; position: absolute; top: 0; bottom: 0; width: 22%; z-index: 2; pointer-events: none; }
      .reel-wrap::before { left: 0; background: linear-gradient(90deg, #0c0306, transparent); }
      .reel-wrap::after { right: 0; background: linear-gradient(-90deg, #0c0306, transparent); }
      .reel-mark { position: absolute; left: 50%; top: 0; bottom: 0; width: 64px; margin-left: -32px; border: 3px solid #fff3c2; z-index: 3; box-shadow: 0 0 22px rgba(255,243,194,.8); pointer-events: none; }
      .reel { position: absolute; top: 14px; left: 0; display: flex; gap: 8px; will-change: transform; }
      .reel .card { --w: 56px; flex: 0 0 auto; }
      .reel .card.out { background: linear-gradient(180deg, #fff7d6, #f5d77a); border-color: #b8860b; }
      .reel-legend { text-align: center; font-size: 13px; color: var(--dim); }
      .reel-legend b { color: var(--gold-hi); }
    `);
    const root = api.root;
    const known = new Set([...s.hole, ...s.board].map(key));
    const grid = SUITS.flatMap(su => Array.from({ length: 13 }, (_, i) => ({ r: i + 2, s: su })));
    root.innerHTML = `
      ${api.steps(['当たり札をさがす', '値段とくらべる', '決める', 'スロット'], 0)}
      <div class="row">${s.board.map(c => cardHTML(c, 'big')).join('')}${backHTML('big')}<span style="width:14px"></span>${s.hole.map(c => cardHTML(c, 'big')).join('')}</div>
      <p class="prompt">最後の1枚で「ストレート」か「フラッシュ」になる札は、残りの山に何枚ある？</p>
      <div class="outs-count" id="mb-o-count">0 / ${s.outs.length}<small>タップして集めよう</small></div>
      <div class="outs-deck" id="mb-o-deck">${grid.map(c => cardHTML(c, known.has(key(c)) ? 'known' : 'tap')).join('')}</div>
      <div class="actions"><button class="btn ghost" id="mb-o-give">わからない（答えを見る）</button></div>`;
    api.coach('グラーノは計算の子。まずは当たり札を<b>全部</b>見つけてみよ。うすい札は場とミミの手札');
    const outKeys = new Set(s.outs.map(key));
    const found = new Set(); let miss = 0, gaveUp = false;
    await new Promise(res => {
      root.querySelector('#mb-o-deck').addEventListener('click', (e) => {
        const el = e.target.closest('.card');
        if (!el || el.classList.contains('known') || el.classList.contains('found') || found.size === s.outs.length || gaveUp) return;
        if (outKeys.has(el.dataset.k)) {
          el.classList.add('found'); found.add(el.dataset.k); api.sfx.good();
          root.querySelector('#mb-o-count').firstChild.textContent = `${found.size} / ${s.outs.length}`;
          if (found.size === s.outs.length) { api.emote('panic'); api.coach('全部見つけた！', 'smug'); res(); } else if (found.size === Math.ceil(s.outs.length / 2)) api.emote('think');
        } else {
          el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); api.sfx.nope(); miss++;
          api.coach('それだと役がそろわない。狙いは<b>ストレート</b>か<b>フラッシュ</b>！', 'panic');
          if (miss === 2) {
            const outSuit = SUITS.find(su => s.outs.filter(c => c.s === su).length >= 9);
            const ranks = new Set(s.outs.map(c => c.r));
            root.querySelectorAll('#mb-o-deck .card.tap').forEach(x => { const r = +x.dataset.k.slice(0, -1), su = x.dataset.k.slice(-1); if ((outSuit && su === outSuit) || (!outSuit && ranks.has(r))) x.classList.add('hint'); });
            api.coach(outSuit ? `ヒント：手札と場札、<b>${SYM[outSuit]}</b>は何枚？` : 'ヒント：数字を順に並べて。<b>両はし</b>が空いてる');
          }
        }
      });
      root.querySelector('#mb-o-give').onclick = () => { gaveUp = true; root.querySelectorAll('#mb-o-deck .card').forEach(x => { if (outKeys.has(x.dataset.k) && !x.classList.contains('found')) x.classList.add('shown'); }); res(); };
    });
    if (!api.alive()) return;
    api.sfx.fanfare();
    root.querySelector('.steps').outerHTML = api.steps(['当たり札をさがす', '値段とくらべる', '決める', 'スロット'], 1);
    root.querySelector('.actions').remove();
    // 探し終えたら 52 枚の一覧は畳み、当たり札だけを1列に並べる（1画面に収めるため。何が当たりかも一目で分かる）
    root.querySelector('#mb-o-deck').classList.add('is-collapsed');
    const cnt = root.querySelector('#mb-o-count'); if (cnt) cnt.innerHTML = `当たり札 ${s.outs.length}枚<small>この札が最後に来れば勝ち</small>`;
    const meter = document.createElement('div');
    meter.className = 'outs-meter pop';
    meter.innerHTML = `<p class="prompt">${s.outs.length}枚！ じゃあ、この値段は割に合う？</p>
      <div class="outs-bar"><div class="outs-fill" id="mb-o-fill"></div><div class="outs-line" id="mb-o-line"><span>割に合う線 ${pct(s.need)}%</span></div><div class="outs-val">約 ${s.outs.length * 2}%</div></div>
      <div class="formula">当たり札 ${s.outs.length}枚 × 2 ＝ <b>約${s.outs.length * 2}%</b>（正確には ${s.outs.length}÷${s.rest.length}＝${pct(s.eq)}%）</div>
      <div class="formula">払う ${s.B} ÷（もらえる ${s.P + s.B} ＋ 払う ${s.B}）＝ <b>${pct(s.need)}%</b> 以上当たれば得</div>
      <div class="actions"><button class="btn" id="mb-o-call">コール<small>${s.B} 払って最後の1枚へ</small></button><button class="btn quiet" id="mb-o-fold">降りる<small>ここまでの分をあきらめる</small></button></div>`;
    root.querySelector('#mb-o-deck').after(meter);
    api.coach('当たり札の枚数に<b>2をかける</b>と、最後の1枚で当たる確率（%）。金の棒が赤い線をこえてる？');
    await api.wait(250);
    meter.querySelector('#mb-o-fill').style.width = pct(s.eq) + '%';
    meter.querySelector('#mb-o-line').style.left = pct(s.need) + '%';
    const called = await new Promise(res => { meter.querySelector('#mb-o-call').onclick = () => res(true); meter.querySelector('#mb-o-fold').onclick = () => res(false); });
    if (!api.alive()) return;
    meter.querySelector('.actions').remove();
    const right = called === (s.eq >= s.need);
    await api.wager({ question: called ? '「付いていく」と決めた。この判断、自信は？' : '「降りる」と決めた。この判断、自信は？', base: 30 });
    if (!api.alive()) return;
    // 確率スロット：残り46枚のうち当たり札だけ金。止まる札は本当に引く1枚
    root.querySelector('.steps').outerHTML = api.steps(['当たり札をさがす', '値段とくらべる', '決める', 'スロット'], 3);
    const river = api.pick(s.rest);
    const hit = outKeys.has(key(river));
    const strip = [];
    for (let k = 0; k < 3; k++) strip.push(...api.shuffle(s.rest));
    const stopIdx = s.rest.length * 2 + api.rand(s.rest.length);
    strip[stopIdx] = river;
    // ニアミス：外れの時は、隣に当たり札を置いて「あと1枚」を見せる
    if (!hit && Math.random() < 0.7) strip[stopIdx + 1] = api.pick(s.outs);
    const reelBox = document.createElement('div');
    reelBox.innerHTML = `<div class="reel-legend">${called ? '最後の1枚……！' : '降りた。でも、もし付いていったら……'}　金色＝当たり札 <b>${s.outs.length}</b> / ${s.rest.length}枚</div>
      <div class="reel-wrap"><div class="reel-mark"></div><div class="reel" id="mb-o-reel">${strip.map(c => cardHTML(c, outKeys.has(key(c)) ? 'out' : '')).join('')}</div></div>`;
    meter.after(reelBox);
    api.reveal(reelBox, 'center');
    const reel = reelBox.querySelector('#mb-o-reel');
    const cardW = 56 + 8;
    const wrapW = reelBox.querySelector('.reel-wrap').clientWidth;
    const target = -(stopIdx * cardW) + wrapW / 2 - 28;
    api.sfx.drum();
    reel.style.transition = 'none'; reel.style.transform = 'translateX(0)';
    await api.wait(50);
    reel.style.transition = api.reduce ? 'none' : 'transform 3.2s cubic-bezier(.12,.72,.08,1)';
    reel.style.transform = `translateX(${target}px)`;
    // 回っている間、カチカチ鳴らす
    let ticking = !api.reduce;
    (async () => { let d = 40; while (ticking && api.alive()) { api.sfx.tick(); await api.wait(d); d = Math.min(260, d * 1.12); } })();
    await api.wait(api.reduce ? 100 : 3300);
    ticking = false;
    if (!api.alive()) return;
    const stopCard = reel.children[stopIdx];
    stopCard.classList.add(hit ? 'glow' : 'danger', 'pop');
    if (hit) { api.sfx.jackpot(); const r = stopCard.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height / 2, 30); }
    else api.sfx.nope();
    api.say(called ? (hit ? 'く……計算どおりに来たか' : 'ほらね、割に合わないって言ったろう') : '賢いね。その値段じゃ払えないか', called ? (hit ? 'panic' : 'smug') : 'think');
    await api.wait(900);
    const wins = Math.round(s.eq * 100);
    const ev = wins * (s.P + s.B) - (100 - wins) * s.B;
    api.finish({
      correct: right, perfect: right && !gaveUp && miss === 0 && api.mult === 3, base: gaveUp ? 15 : 30,
      title: right ? (called && !hit ? '判断◎（運は外れ）' : !called && hit ? '判断◎（今回は当たりが来たけど）' : '判断◎') : (called ? (hit ? '判断△（今回は運が味方）' : '判断△') : (hit ? '判断△' : '判断△（今回は外れで助かった）')),
      detail: `${called ? (hit ? '当たり！' : '外れ……') : (hit ? '降りたけど、最後の1枚は当たりだった。' : '最後の1枚は外れだった。')} ${right ? (called ? '割に合う値段だったから、付いていくのが正解。' : '割に合わない値段だったから、降りるのが正解。') : (called ? 'この値段は高すぎた。' : 'この値段なら付いていく方が得だった。')}`,
      extra: api.tally(wins, s.P + s.B, s.B, called),
    });
  },
});
