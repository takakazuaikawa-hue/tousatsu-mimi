// 論理：容疑者しぼり（ヴェルベット卓）
// 相手の手の候補を「容疑者ファイル」として並べ、相手の動きに合わない容疑者を赤いバツで消していく。
// 最後に残った容疑者のうち、ミミが勝てる割合と、払う額を比べて決める。
MB.register({
  id: 'suspects', group: 'logic', order: 6, title: '容疑者しぼり', sub: 'LOGIC · 手の幅',
  chars: ['velvet'],
  async start({ api }) {
    const SCEN = [
      {
        mine: [[14, 'h'], [12, 'c']], board: [[14, 's'], [7, 'd'], [2, 'c'], [13, 'h'], [7, 's']], call: 800, pot: 1200,
        tiles: [
          { id: 'AA', name: 'Aのペア', sub: 'A A', w: 3, win: false, hand: [[14, 'd'], [14, 'c']] },
          { id: 'KK', name: 'Kのペア', sub: 'K K', w: 3, win: false, hand: [[13, 's'], [13, 'd']] },
          { id: '7x', name: '7を持つ手', sub: '7 7 ／ A 7', w: 6, win: false, hand: [[7, 'h'], [7, 'c']] },
          { id: 'AK', name: 'A と K', sub: 'A K', w: 8, win: false, hand: [[14, 'd'], [13, 'c']] },
          { id: 'mid', name: '中くらいのペア', sub: '8 8 〜 Q Q', w: 10, win: true, hand: [[10, 's'], [10, 'd']] },
          { id: 'low', name: '小さいペア', sub: '3 3 〜 6 6', w: 8, win: true, hand: [[5, 's'], [5, 'h']] },
          { id: 'draw', name: '同じマークの連番', sub: '♠J ♠10（空振り）', w: 6, win: true, hand: [[11, 's'], [10, 's']] },
          { id: 'junk', name: 'ばらばらの弱い手', sub: '9 4 など', w: 20, win: true, hand: [[9, 'h'], [4, 'd']] },
        ],
        beats: [
          { street: 'プリフロップ', board: 0, act: '大きくレイズ（参加費の4倍）', must: ['junk'], line: 'ほら、ついてこれる？', teach: 'ばらばらの弱い手で、最初から大きくは賭けない' },
          { street: 'フロップ A♠ 7♦ 2♣', board: 3, act: '小さく賭けた', must: [], line: 'ちょっとだけ♡', teach: '小さい賭けは、強い手でも弱い手でもできる。これだけでは<b>消せない</b>' },
          { street: 'リバー 7♠', board: 5, act: 'オールイン', must: ['mid', 'low'], line: 'ぜーんぶ。降りたら？', teach: '中くらいの手は、全部は賭けない。オールインは<b>すごく強い</b>か<b>何もない</b>か' },
        ],
      },
      {
        mine: [[13, 's'], [13, 'd']], board: [[9, 'h'], [8, 'h'], [2, 'c'], [3, 'h'], [12, 's']], call: 600, pot: 900,
        tiles: [
          { id: 'fl', name: 'ハート2枚', sub: '♥A ♥5 など', w: 10, win: false, hand: [[14, 'h'], [5, 'h']] },
          { id: 'set', name: '同じ数字3枚', sub: '9 9 ／ 8 8', w: 4, win: false, hand: [[9, 'd'], [9, 's']] },
          { id: 'aa', name: 'Aのペア', sub: 'A A', w: 3, win: true, hand: [[14, 'c'], [14, 'd']] },
          { id: 'top', name: '9を持つ手', sub: 'A 9 ／ K 9', w: 8, win: true, hand: [[14, 'c'], [9, 'c']] },
          { id: 'hdraw', name: 'ハート1枚だけ', sub: '♥K ♣J（空振り）', w: 8, win: true, hand: [[11, 'h'], [10, 'c']] },
          { id: 'junk', name: 'ばらばらの弱い手', sub: '6 4 など', w: 18, win: true, hand: [[6, 'd'], [4, 'c']] },
        ],
        beats: [
          { street: 'プリフロップ', board: 0, act: 'ただ付いてきた（コール）', must: [], line: 'ふーん、付き合ってあげる', teach: 'ただ付いてくるだけなら、いろんな手がありえる。まだ<b>消せない</b>' },
          { street: 'ターン 3♥（ハートが3枚目）', board: 4, act: 'ハートが出た瞬間に大きく', must: ['aa'], line: 'きゃは、いいカード来ちゃった♡', teach: 'Aのペアなら、もっと前から大きく賭けてるはず' },
          { street: 'リバー Q♠', board: 5, act: 'さらにポットと同じ額', must: ['top'], line: 'ざぁこ♡ 降りなよ', teach: '9を持つくらいの手で、二度も大きくは賭けない' },
        ],
      },
      {
        mine: [[10, 'c'], [10, 'd']], board: [[6, 's'], [5, 'd'], [2, 'h'], [13, 'c'], [3, 's']], call: 500, pot: 800,
        tiles: [
          { id: 'kk', name: 'Kを持つ手', sub: 'A K ／ K Q', w: 12, win: false, hand: [[13, 'h'], [12, 'h']] },
          { id: 'st', name: '4を持つ手', sub: '4 7 ／ A 4', w: 6, win: false, hand: [[4, 'c'], [7, 'c']] },
          { id: 'jj', name: 'J〜Aのペア', sub: 'J J 〜 A A', w: 6, win: false, hand: [[11, 's'], [11, 'h']] },
          { id: 'low', name: '小さいペア', sub: '7 7 〜 9 9', w: 6, win: true, hand: [[8, 's'], [8, 'h']] },
          { id: 'air', name: 'ばらばらの弱い手', sub: 'Q 9 など', w: 16, win: true, hand: [[12, 'd'], [9, 'c']] },
        ],
        beats: [
          { street: 'フロップ 6♠ 5♦ 2♥', board: 3, act: 'チェック（賭けなかった）', must: ['jj'], line: '様子見〜', teach: '大きいペアなら、ここで賭けて取りに来る' },
          { street: 'ターン K♣', board: 4, act: 'Kが出た瞬間に大きく', must: [], line: 'きゃは、いいの来た♡', teach: 'Kを持っていても、何もなくても言いそう。まだ<b>消せない</b>' },
          { street: 'リバー 3♠', board: 5, act: 'もう一度大きく', must: ['low'], line: 'ほら、降りちゃいなよ', teach: '小さいペアで二度も大きくは賭けない' },
        ],
      },
    ];
    const sc = api.pick(SCEN);
    const conv = (a) => a.map(([r, s]) => ({ r, s }));
    const mine = conv(sc.mine), board = conv(sc.board);
    api.css('suspects', `
      .sp-log { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--dim); max-width: 640px; margin: 0 auto; width: 100%; }
      .sp-log .now { color: var(--text); font-weight: 900; }
      .sp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      .sp-tile { position: relative; cursor: pointer; text-align: left; color: #2b1a10; padding: 10px 12px 10px 14px; min-height: 76px; border: 0; background: #f2e6cf; box-shadow: 0 5px 12px rgba(0,0,0,.45); }
      .sp-tile::before { content: "SUSPECT"; position: absolute; top: 6px; right: 8px; font-family: var(--disp); font-size: 11px; letter-spacing: .14em; color: #a33; }
      .sp-tile b { display: block; font-size: 15px; } .sp-tile span { font-size: 12px; color: #6a5440; }
      .sp-tile.out { opacity: .5; }
      .sp-tile.out::after { content: "×"; position: absolute; inset: 0; display: grid; place-items: center; font-size: 64px; font-weight: 900; color: #d8283e; line-height: 1; transform: rotate(-8deg); animation: mb-pop .3s; }
      .sp-tile.win { outline: 3px solid var(--good); } .sp-tile.lose { outline: 3px solid var(--bad); }
      .sp-tile.her { outline: 4px solid var(--gold-hi); box-shadow: 0 0 24px rgba(245,215,122,.9); }
      .sp-bar { position: relative; margin-top: 26px !important; height: 30px; background: rgba(0,0,0,.45); border: 1px solid var(--faint); max-width: 560px; width: 100%; margin: 0 auto; }
      .sp-fill { position: absolute; inset: 0 auto 0 0; width: 0; background: linear-gradient(90deg, #a47a22, var(--gold-hi)); transition: width .9s; }
      .sp-line { position: absolute; top: -8px; bottom: -8px; width: 3px; background: var(--red-hi); box-shadow: 0 0 10px var(--red-hi); transition: left .8s .2s; left: 0; }
      .sp-line span { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 12px; font-weight: 700; color: var(--red-hi); }
      .sp-val { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-family: var(--disp); font-size: 20px; }
    `);
    const root = api.root;
    const out = new Set(); let beat = 0, miss = 0;
    const draw = () => {
      const b = sc.beats[beat];
      api.say(b.line, 'smug'); api.bet(beat === sc.beats.length - 1 ? sc.call : '—');
      root.innerHTML = `
        ${api.steps(['動きを見る', '容疑者を消す', '決める', '答え合わせ'], beat === 0 ? 0 : 1)}
        <div class="row">${board.map((c, i) => i < b.board ? api.cardHTML(c, 'big') : api.backHTML('big')).join('')}<span style="width:12px"></span>${mine.map(c => api.cardHTML(c, 'big')).join('')}</div>
        <div class="sp-log">${sc.beats.slice(0, beat + 1).map((x, i) => `<div class="${i === beat ? 'now' : ''}">${x.street}：ヴェルベットは${x.act}</div>`).join('')}</div>
        <p class="prompt">${b.must.length ? `「${b.act}」をしない手は？ 容疑者から外そう` : `「${b.act}」。外せる容疑者はいる？`}</p>
        <div class="sp-tiles" id="mb-sp-tiles">${sc.tiles.map(t => `<button class="sp-tile ${out.has(t.id) ? 'out' : ''}" data-id="${t.id}"><b>${t.name}</b><span>${t.sub}</span></button>`).join('')}</div>
        <div class="actions"><button class="btn quiet" id="mb-sp-next">${b.must.length ? 'これで全部外した' : '外せる人はいない'}<small>次の動きへ</small></button></div>`;
      api.coach(beat === 0 ? 'ヴェルベットの手札は見えない。でも<b>動き</b>で容疑者を減らせる' : sc.beats[beat].street + '。この動き、どの手ならする？');
    };
    draw();
    await new Promise(res => {
      root.addEventListener('click', (e) => {
        const b = sc.beats[beat]; if (!b) return;
        const tile = e.target.closest('.sp-tile');
        if (tile) {
          const id = tile.dataset.id; if (out.has(id)) return;
          if (b.must.includes(id)) { out.add(id); tile.classList.add('out'); api.sfx.good(); api.coach('そう！ ' + b.teach, 'smug'); }
          else { tile.classList.remove('nope'); void tile.offsetWidth; tile.classList.add('nope'); api.sfx.nope(); miss++; api.coach(`${sc.tiles.find(t => t.id === id).name}でも、この動きはしそう。まだ外せない`, 'panic'); }
          return;
        }
        if (e.target.closest('#mb-sp-next')) {
          const left = b.must.filter(id => !out.has(id));
          if (left.length) { api.sfx.nope(); miss++; api.coach('まだ外せる容疑者がいるよ。' + b.teach); return; }
          api.sfx.tap(); beat++;
          if (beat >= sc.beats.length) res(); else draw();
        }
      });
    });
    if (!api.alive()) return;
    const left = sc.tiles.filter(t => !out.has(t.id));
    const tot = left.reduce((a, t) => a + t.w, 0), win = left.filter(t => t.win).reduce((a, t) => a + t.w, 0);
    const winPct = Math.round(win / tot * 100);
    const need = sc.call / (sc.pot + sc.call * 2);
    root.querySelector('.steps').outerHTML = api.steps(['動きを見る', '容疑者を消す', '決める', '答え合わせ'], 2);
    root.querySelectorAll('.sp-tile').forEach(b => { const t = sc.tiles.find(x => x.id === b.dataset.id); if (!out.has(t.id)) b.classList.add(t.win ? 'win' : 'lose'); });
    root.querySelector('.prompt').innerHTML = `残った容疑者のうち、ミミが勝てるのは <b>${left.filter(t => t.win).length} / ${left.length}</b>（手の組み合わせの数で ${winPct}%）`;
    root.querySelector('.actions').outerHTML = `<div class="sp-bar"><div class="sp-fill" id="mb-sp-fill"></div><div class="sp-line" id="mb-sp-line"><span>割に合う線 ${Math.round(need * 100)}%</span></div><div class="sp-val">ミミが勝つ ${winPct}%</div></div>
      <div class="actions"><button class="btn" id="mb-sp-call">コール<small>${sc.call} 払って見せ合う</small></button><button class="btn quiet" id="mb-sp-fold">降りる<small>ここまでで止める</small></button></div>`;
    api.coach('緑の枠がミミの勝てる容疑者。何もない手（ブラフ）の分だけ勝ち目がある');
    await api.wait(200);
    root.querySelector('#mb-sp-fill').style.width = winPct + '%'; root.querySelector('#mb-sp-line').style.left = Math.round(need * 100) + '%';
    const called = await new Promise(res => { root.querySelector('#mb-sp-call').onclick = () => res(true); root.querySelector('#mb-sp-fold').onclick = () => res(false); });
    if (!api.alive()) return;
    root.querySelector('.actions').remove();
    const right = called === (winPct / 100 >= need);
    await api.wager({ question: `「${called ? '付いていく' : '降りる'}」と決めた。自信は？`, base: 35 });
    if (!api.alive()) return;
    let r = Math.random() * tot, her = left[0];
    for (const t of left) { r -= t.w; if (r <= 0) { her = t; break; } }
    api.sfx.drum(); api.coach(called ? '見せ合い……！' : '降りた。ヴェルベットの手札は……');
    await api.wait(1000);
    root.querySelector(`.sp-tile[data-id="${her.id}"]`).classList.add('her');
    root.querySelector('.row').insertAdjacentHTML('afterend', `<div class="row"><span class="formula">ヴェルベット</span>${conv(her.hand).map(c => api.cardHTML(c, 'big flip')).join('')}</div>`);
    api.say(her.win ? (called ? 'う、うそ……っ' : 'ふふ、降りちゃった♡') : (called ? 'ざーんねん♡' : 'ちぇっ、読まれた'), her.win ? (called ? 'panic' : 'smug') : (called ? 'win' : 'panic'));
    await api.wait(800);
    api.finish({
      extra: api.tally(winPct, sc.pot + sc.call, sc.call, called),
      correct: right, perfect: right && miss === 0 && api.mult === 3, base: 35,
      title: right ? '判断◎' : '判断△',
      detail: `犯人は「${her.name}」。${right ? '容疑者を正しく絞れていれば、この判断が得。' : '絞った容疑者から見ると、逆を選んだ方が得だった。'}`,
    });
  },
});
