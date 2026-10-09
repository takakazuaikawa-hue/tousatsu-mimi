// 心理：異議あり！（ヴェルベット卓の看板）
// ヴェルベットがこのハンドで言った「発言」と、卓に残る「証拠」を見比べ、矛盾する組を1つ見つけてつきつける。
// 矛盾（＝彼女のウソ）が分かると、ウソの向きの逆が本当の手（ブラフ／強い）だと分かる。
// どのシナリオも、先に「本当の手札2枚と場札」を決め、発言と証拠はそれに合わせて手で書いている（開始時に自己点検する）。
(() => {
  const RK = '23456789TJQKA';
  const C = (str) => str.trim().split(/\s+/).map(t => ({ r: RK.indexOf(t[0]) + 2, s: t[1] }));

  // truth：本当の手の向き。lie：ウソの発言の番号。key：それと矛盾する証拠の番号（複数可）。
  // mimiCat：ミミの役の種類（自己点検用）。rico：矛盾が何を意味するか（1文）。
  const SCEN = [
    {
      id: 'hearts', truth: 'strong', bet: 1200,
      board: 'Kh 9h 4c 2h Js', mimi: 'Kc Jd', her: 'Ah 6h', mimiCat: 2, mimiName: 'KとJのツーペア',
      says: [
        'ハートなんて1枚も持ってないの。フラッシュが怖いの？ ざぁこ♡',
        'Kなんて持ってないし。持ってたら最初から賭けてるの',
        'リバーのJ？ あんなの、あたしには関係ない札なの',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'ハートが3枚（同じマーク5枚でフラッシュ）' },
        { kind: 'log', rows: [['フロップ', '{Kh}{9h}{4c}', 'チェック'], ['ターン', '{2h}', 'いきなりポットと同じ額'], ['リバー', '{Js}', 'また同じ額']] },
        { kind: 'tell', text: '最初から最後まで、足を組んだまま。姿勢はまったく崩さない' },
      ],
      key: [1],
      rico: 'ハートが来た時だけ急に強気＝ハートを持ってる。フラッシュだ',
      lieShort: '「ハートなんて持ってない」',
      panic: 'な、なんで賭け方まで覚えてるのよ！',
    },
    {
      id: 'redcorner', truth: 'bluff', bet: 900,
      board: 'Ks 9s 4d 2s 7c', mimi: 'Kh Jd', her: '8h 6h', mimiCat: 1, mimiName: 'Kのワンペア',
      says: [
        'あたしの札、2枚ともスペードなの。フラッシュ完成よ♡',
        'Kは持ってないの。Kなんて、いらないし',
        'フロップもターンも、ちょっとずつ賭けてあげたでしょ？',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'スペードが3枚（同じマーク5枚でフラッシュ）' },
        { kind: 'log', rows: [['フロップ', '{Ks}{9s}{4d}', '小さく'], ['ターン', '{2s}', '小さく'], ['リバー', '{7c}', 'ポットの倍']] },
        { kind: 'memo', text: '配る時、ヴェルベットの札が1枚めくれかけた。角に<b>赤いマーク</b>が見えた' },
        { kind: 'tell', text: 'リバーで賭けた後、ワインを一口。グラスの持ち方はいつも通り' },
      ],
      key: [2],
      rico: '赤いマークが見えた＝2枚ともスペードはウソ。フラッシュは無い',
      lieShort: '「2枚ともスペード」',
      panic: 'み、見てたの！？ ディーラーのくせに！',
    },
    {
      id: 'acespade', truth: 'bluff', bet: 1500,
      board: 'As Ts 6s 3d 8c', mimi: 'Th 9h', her: 'Kh Qh', mimiCat: 1, mimiName: '10のワンペア',
      says: [
        'スペードのA、あたしが持ってるの。一番強いフラッシュよ、ざぁこ♡',
        '10なんて持ってないの。ペアなんて地味だし',
        'ターンで考えこんだのは、ワインを選んでたからなの',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'スペードが3枚（同じマーク5枚でフラッシュ）' },
        { kind: 'log', rows: [['フロップ', '{As}{Ts}{6s}', 'チェック'], ['ターン', '{3d}', '長く考えて、小さく'], ['リバー', '{8c}', 'オールイン']] },
        { kind: 'tell', text: 'ターンで長く考えこんだ。そのあいだ、ワインリストを眺めていた' },
      ],
      key: [0],
      rico: '{As}は場に出てる。無い札で強がった＝ブラフだ',
      lieShort: '「スペードのAを持ってる」',
      panic: 'う、うそ……場札なんて見てなかったの……！',
    },
    {
      id: 'river8', truth: 'strong', bet: 800,
      board: 'Qs Qd 5c 2h 8c', mimi: 'Qh Jh', her: '8d 8h', mimiCat: 3, mimiName: 'Qのスリーカード',
      says: [
        'リバーの8？ あたし、見てもいなかったの',
        'Qなんて持ってないの。持ってたら、もっとはしゃいでるし',
        'ずっと同じ額しか賭けてないでしょ？ 作戦とか無いの♡',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'Qが2枚。ほかの数字はバラバラ' },
        { kind: 'log', rows: [['フロップ', '{Qs}{Qd}{5c}', 'ポットの半分'], ['ターン', '{2h}', 'ポットの半分'], ['リバー', '{8c}', 'ポットの半分']] },
        { kind: 'tell', text: 'リバーの{8c}が落ちた瞬間、まだミミの番なのに<b>チップへ手が伸びた</b>' },
      ],
      key: [2],
      rico: '8が落ちた瞬間に手が伸びた。8で手ができた＝強い手だ',
      lieShort: '「リバーの8は見てもいない」',
      panic: 'て、手が勝手に動いただけなの！',
    },
    {
      id: 'allin', truth: 'bluff', bet: 2000,
      board: 'Jh Th 4s 9c 2c', mimi: 'Js 8d', her: 'Ah 5h', mimiCat: 1, mimiName: 'Jのワンペア',
      says: [
        'フロップからずっと大きく賭けてきたでしょ？ 最初から強いの♡',
        'Jなんて持ってないの。Jって顔が怖いし',
        'リバーの2？ あんなのゴミ札なの',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'ここまでに開いた5枚' },
        { kind: 'log', rows: [['フロップ', '{Jh}{Th}{4s}', 'チェック'], ['ターン', '{9c}', 'チェック'], ['リバー', '{2c}', 'いきなりオールイン']] },
        { kind: 'tell', text: 'オールインの後、ずっと髪先を指でくるくる巻いている' },
      ],
      key: [1],
      rico: '「ずっと大きく」はウソ。強く見せたいウソ＝ブラフだ',
      lieShort: '「フロップからずっと大きく賭けた」',
      panic: 'き、記録なんて取ってるの反則なの！',
    },
    {
      id: 'mirror', truth: 'strong', bet: 1000,
      board: '9c 8d 7s Kh 2c', mimi: 'Ks 9h', her: 'Jd Td', mimiCat: 2, mimiName: 'Kと9のツーペア',
      says: [
        '10なんて持ってないの。ストレート？ 無理無理♡',
        'Kは持ってないの。Kで喜ぶのはお子さまだけ',
        'ターンまでは、ちょっとだけ賭けてあげたの',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: '9・8・7と数字が続く（5つ続けばストレート）' },
        { kind: 'log', rows: [['フロップ', '{9c}{8d}{7s}', '小さく'], ['ターン', '{Kh}', '小さく'], ['リバー', '{2c}', 'ポットと同じ額']] },
        { kind: 'mirror', text: 'ヴェルベットの後ろの鏡に、札の端が一瞬映った。<b>{Td}</b>だった' },
        { kind: 'tell', text: 'チップを積む手は、最初から最後まで同じ速さ' },
      ],
      key: [2],
      rico: '鏡に{Td}。10を隠した＝ストレートができてる。強い手だ',
      lieShort: '「10なんて持ってない」',
      panic: 'か、鏡なんてずるいの！ 反則なの！',
    },
    {
      id: 'smile', truth: 'strong', bet: 1100,
      board: 'Ac 7d 7s 3h Tc', mimi: 'Ad Jh', her: 'Ah 7h', mimiCat: 2, mimiName: 'Aと7のツーペア',
      says: [
        '配られた札、最悪だったの。つまんない手なの',
        '3なんて持ってないの。小さい数字って、きらい',
        'フロップはチェックしたの。様子見ってやつ♡',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'Aが1枚、7が2枚' },
        { kind: 'log', rows: [['フロップ', '{Ac}{7d}{7s}', 'チェック'], ['ターン', '{3h}', 'ポットの半分'], ['リバー', '{Tc}', 'ポットと同じ額']] },
        { kind: 'tell', text: '手札が配られた瞬間、口元だけ<b>にやっと笑った</b>' },
      ],
      key: [2],
      rico: '配られた瞬間に笑ってた。最悪の手はウソ＝強い手だ',
      lieShort: '「配られた札は最悪」',
      panic: 'わ、笑ってなんかないの！ 見間違いなの！',
    },
    {
      id: 'nostraight', truth: 'bluff', bet: 1300,
      board: 'Ks 7d 2c 9h 4s', mimi: 'Kd Qc', her: '6h 5h', mimiCat: 1, mimiName: 'Kのワンペア',
      says: [
        'フロップで、もうストレートができてたの♡ ざぁこ♡',
        'Kは持ってないの。持ってても自慢しないし',
        'ターンの9？ ふーん、って感じ',
      ],
      lie: 0,
      ev: [
        { kind: 'board', note: 'ストレート＝数字が5つ続くこと（例：5・6・7・8・9）' },
        { kind: 'log', rows: [['フロップ', '{Ks}{7d}{2c}', 'ポットと同じ額'], ['ターン', '{9h}', 'ポットと同じ額'], ['リバー', '{4s}', 'オールイン']] },
        { kind: 'tell', text: '賭けるたびに、ミミの顔をじっと見てくる' },
      ],
      key: [0, 1],
      rico: 'K・7・2は離れすぎ。フロップでストレートは無理＝ブラフだ',
      lieShort: '「フロップでストレートができてた」',
      panic: 'け、計算なんてしないでよ！ ずるいの！',
    },
  ];
  const EVK = {
    board: ['BOARD', '場札'], log: ['BET LOG', '賭け方の記録'], tell: ['TELL', '仕草の記録'],
    memo: ['MEMO', 'ディーラーのメモ'], mirror: ['MIRROR', '鏡の目撃メモ'],
  };
  const TAUNT = ['ざぁこ♡ それのどこが矛盾なの？', 'え〜？ ぜんぜん読めてないの、かわいそ♡', 'ぶっぶー♡ もっと頭使いなさいよ', 'はずれ♡ あたしの言葉、ぜーんぶ本当なの'];
  let last = null;

  MB.register({ id: 'objection', group: 'psych', order: 4, title: '異議あり！', sub: 'PSYCH · 証拠', isNew: true, chars: ['velvet'], start });

  async function start({ api }) {
    const force = (window.MB_FORCE || {}).objection;
    let pool;
    if (force && force.id) pool = SCEN.filter(s => s.id === force.id);
    else {
      const truth = Math.random() < .5 ? 'bluff' : 'strong';
      pool = SCEN.filter(s => s.truth === truth && s.id !== last);
    }
    const S = api.pick(pool); last = S.id;
    const board = C(S.board), mimi = C(S.mimi), her = C(S.her);
    selfCheck(api, S, board, mimi, her);

    const lab = (c) => `<b class="ob-cl${c.s === 'h' || c.s === 'd' ? ' red' : ''}">${api.rn(c.r)}${api.SYM[c.s]}</b>`;
    const fill = (t) => t.replace(/\{([2-9TJQKA][shdc])\}/g, (_, k) => lab(C(k)[0]));
    const herCat = api.CAT_NAME[api.category(her.concat(board))];
    const herCards = her.map(api.label).join(' ');
    const keys = S.key;

    api.setOpp('velvet', 'ざぁこ♡ あたしの言葉、ぜーんぶ本当なの', S.bet, 'smug');
    api.css('objection', CSS);
    const root = api.root;
    const sayOrder = api.shuffle(S.says.map((t, i) => i));
    const evOrder = api.shuffle(S.ev.map((e, i) => i));
    const rots = [-1.2, 1, -.6, 1.4];
    const stepNames = ['発言を選ぶ', '証拠を選ぶ', 'つきつける', '読みを賭ける', '答え合わせ'];
    const evHTML = (e, i, n) => {
      const [en, jp] = EVK[e.kind];
      let body;
      if (e.kind === 'board') body = `<div class="ob-mini-row">${board.map(c => api.cardHTML(c, 'ob-mini')).join('')}</div>${e.note ? `<div class="ob-note">${fill(e.note)}</div>` : ''}`;
      else if (e.kind === 'log') body = `<ol class="ob-log">${e.rows.map(r => `<li><span class="st">${r[0]}</span><span class="cs">${fill(r[1])}</span><span class="ac">${r[2]}</span></li>`).join('')}</ol>`;
      else body = `<p class="ob-evtext">${fill(e.text)}</p>`;
      return `<div class="ob-ev k-${e.kind}" role="button" tabindex="0" data-i="${i}" style="--rot:${rots[n % 4]}deg" aria-label="証拠：${jp}">
        <span class="ob-tab"><span class="en">${en}</span><em>${jp}</em></span>${body}</div>`;
    };
    root.innerHTML = `
      <div id="mb-ob-steps">${api.steps(stepNames, 0)}</div>
      <div class="ob-hands" id="mb-ob-hands">
        <div class="ob-hand her"><span class="ob-who">VELVET</span><span class="ob-cards" id="mb-ob-her">${api.backHTML('small')}${api.backHTML('small')}</span><span class="ob-hn" id="mb-ob-her-name">？？？</span></div>
        <span class="ob-vs">VS</span>
        <div class="ob-hand me"><span class="ob-who">MIMI</span><span class="ob-cards">${mimi.map(c => api.cardHTML(c, 'small')).join('')}</span><span class="ob-hn">${S.mimiName}</span></div>
      </div>
      <p class="ob-sub">ミミの${S.mimiName}は、<b>ブラフには勝ち</b>、<b>強い手には負ける</b>。ヴェルベットはどっち？</p>
      <div class="ob-court" id="mb-ob-court">
        <div class="ob-col ob-says is-next" id="mb-ob-says">
          <div class="ob-colhead"><b>TESTIMONY</b>ヴェルベットの発言</div>
          ${sayOrder.map((i, n) => `<div class="ob-say" role="button" tabindex="0" data-i="${i}"><span class="ob-tag">No.${n + 1}</span><p>「${fill(S.says[i])}」</p></div>`).join('')}
        </div>
        <div class="ob-gutter" aria-hidden="true"></div>
        <div class="ob-col ob-evs" id="mb-ob-evs">
          <div class="ob-colhead"><b>EVIDENCE</b>卓に残る証拠</div>
          ${evOrder.map((i, n) => evHTML(S.ev[i], i, n)).join('')}
        </div>
        <svg class="ob-thread" id="mb-ob-thread" aria-hidden="true"></svg>
      </div>
      <div class="ob-bar" id="mb-ob-bar">
        <div class="ob-cred" aria-label="信用 3"><span>信用</span><i></i><i></i><i></i></div>
        <button class="btn ob-go" id="mb-ob-go" disabled>つきつける！<small>OBJECTION</small></button>
      </div>
      <div class="actions" id="mb-ob-decide" hidden>
        <button class="btn" data-d="bluff">ブラフと読む<small>コールして勝負</small></button>
        <button class="btn quiet" data-d="strong">強い手と読む<small>降りて守る</small></button>
      </div>`;
    api.coach('ウソの<b>発言</b>を1つ選んで、それと矛盾する<b>証拠</b>をつきつけよ！', 'think');

    const $ = (s) => root.querySelector(s);
    const court = $('#mb-ob-court'), thread = $('#mb-ob-thread'), go = $('#mb-ob-go');
    const setStep = (n) => { $('#mb-ob-steps').innerHTML = api.steps(stepNames, n); };
    let selS = null, selE = null, misses = 0, busy = false, done = false, stall = 0;
    const tried = new Set();
    // 段階つきの助け：外れ2回か、同じ組の押し直し2回で「ウソの発言」を光らせる。押し直し4回では「決め手の証拠」も光らせる
    const hintSay = () => { const el = court.querySelector(`.ob-say[data-i="${S.lie}"]`); if (el && !el.classList.contains('hint')) { el.classList.add('hint'); api.coach('光っている<b>発言</b>が怪しい。それとぶつかる<b>証拠</b>を探して', 'think'); } };
    const hintEv = () => { const el = court.querySelector(`.ob-ev[data-i="${keys[0]}"]`); if (el) el.classList.add('hint'); };

    // 選んだ発言と証拠を、赤い糸で結ぶ
    const drawThread = (gold) => {
      const a = selS == null ? null : court.querySelector(`.ob-say[data-i="${selS}"]`);
      const b = selE == null ? null : court.querySelector(`.ob-ev[data-i="${selE}"]`);
      if (!a || !b) { thread.innerHTML = ''; return; }
      const R = court.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.right - R.left - 6, y1 = ra.top + ra.height / 2 - R.top;
      const x2 = rb.left - R.left + 6, y2 = rb.top + rb.height / 2 - R.top;
      const mx = (x1 + x2) / 2;
      const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      const len = Math.hypot(x2 - x1, y2 - y1) * 1.3 + 20;
      thread.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
      thread.classList.toggle('is-gold', !!gold);
      thread.innerHTML = `<path d="${d}" style="--len:${len}"></path><circle cx="${x1}" cy="${y1}" r="6"></circle><circle cx="${x2}" cy="${y2}" r="6"></circle>`;
    };
    const onResize = () => { if (!api.alive()) { window.removeEventListener('resize', onResize); return; } drawThread(thread.classList.contains('is-gold')); };
    window.addEventListener('resize', onResize);

    const refresh = () => {
      court.querySelectorAll('.ob-say').forEach(el => el.classList.toggle('sel', +el.dataset.i === selS));
      court.querySelectorAll('.ob-ev').forEach(el => el.classList.toggle('sel', +el.dataset.i === selE));
      $('#mb-ob-says').classList.toggle('is-next', selS == null && !done);
      $('#mb-ob-evs').classList.toggle('is-next', selS != null && selE == null && !done);
      go.disabled = busy || done || selS == null || selE == null;
      if (!done) setStep(selS == null ? 0 : selE == null ? 1 : 2);
      drawThread(false);
    };

    const pick = (el) => {
      if (busy || done) return;
      api.sfx.tap();
      if (el.classList.contains('ob-say')) {
        selS = +el.dataset.i;
        api.coach(selE == null ? 'この発言とぶつかる<b>証拠</b>はどれ？' : '線がつながった。<b>つきつける！</b>で勝負');
      } else {
        selE = +el.dataset.i;
        api.coach(selS == null ? '次は、この証拠とぶつかる<b>発言</b>を選んで' : '線がつながった。<b>つきつける！</b>で勝負');
      }
      refresh();
    };
    court.addEventListener('click', (e) => { const el = e.target.closest('.ob-say, .ob-ev'); if (el) pick(el); });
    court.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('.ob-say, .ob-ev'); if (el) { e.preventDefault(); pick(el); }
    });

    const markAnswer = (found) => {
      const sEl = court.querySelector(`.ob-say[data-i="${S.lie}"]`);
      const eIdx = selE != null && keys.includes(selE) ? selE : keys[0];
      const eEl = court.querySelector(`.ob-ev[data-i="${eIdx}"]`);
      sEl.classList.add('is-lie'); sEl.insertAdjacentHTML('beforeend', '<span class="ob-stamp">ウソ</span>');
      eEl.classList.add('is-key'); eEl.insertAdjacentHTML('beforeend', `<span class="ob-stamp gold">${found ? '決め手' : '矛盾'}</span>`);
      selS = S.lie; selE = eIdx;
      court.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
      court.querySelectorAll('.ob-say, .ob-ev').forEach(el => { el.classList.remove('sel'); if (el !== sEl && el !== eEl) el.classList.add('is-off'); });
      $('#mb-ob-says').classList.remove('is-next'); $('#mb-ob-evs').classList.remove('is-next');
      drawThread(true);
    };

    // つきつける → 当たりなら大きなスラブ、外れなら信用を1つ失う
    const outcome = await new Promise((resolve) => {
      go.addEventListener('click', async () => {
        if (busy || done || selS == null || selE == null || !api.alive()) return;
        const k = selS + ':' + selE;
        if (tried.has(k)) { api.sfx.nope(); stall++; if (stall >= 2) hintSay(); if (stall >= 4) hintEv(); if (stall < 2) api.coach('その組はもう試した。別の組にしよ'); return; }
        tried.add(k); busy = true; refresh();
        api.sfx.drum(); court.classList.add('is-charge'); api.coach('……！');
        await api.wait(api.reduce ? 150 : 750);
        if (!api.alive()) return;
        court.classList.remove('is-charge');
        const hitS = selS === S.lie, hitE = keys.includes(selE);
        if (hitS && hitE) {
          done = true;
          slam(api, S);
          markAnswer(true);
          await api.wait(api.reduce ? 500 : 1750);
          if (!api.alive()) return;
          resolve('found');
          return;
        }
        misses++;
        miss(api, api.pick(TAUNT));
        const pips = root.querySelectorAll('.ob-cred i');
        pips[3 - misses].classList.add('broken');
        root.querySelector('.ob-cred').setAttribute('aria-label', '信用 ' + (3 - misses));
        court.querySelectorAll('.ob-say.sel, .ob-ev.sel').forEach(el => { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); });
        if (misses >= 3) {
          done = true;
          api.say('もう何を言っても信じないの♡ ざぁこ♡', 'smug');
          api.coach('信用ゼロ……ここからは<b>勘</b>で読むしかない', 'lose');
          selS = null; selE = null; thread.innerHTML = '';
          court.querySelectorAll('.ob-say, .ob-ev').forEach(el => el.classList.remove('sel'));
          $('#mb-ob-says').classList.remove('is-next'); $('#mb-ob-evs').classList.remove('is-next');
          await api.wait(api.reduce ? 300 : 1200);
          if (!api.alive()) return;
          resolve('lost');
          return;
        }
        api.coach(hitS || hitE ? '<b>惜しい！</b> 片方は合ってる。もう片方を変えてみよ' : `矛盾してない……信用はあと<b>${3 - misses}つ</b>`, 'panic');
        if (misses >= 2) hintSay();
        await api.wait(api.reduce ? 100 : 500);
        if (!api.alive()) return;
        busy = false; refresh();
      });
    });
    if (!api.alive()) return;
    const found = outcome === 'found';
    const base = found ? 40 - misses * 5 : 15;

    // 読みを決める
    setStep(3);
    go.disabled = true; $('#mb-ob-bar').classList.add('is-done');
    if (found) api.coach(fill(S.rico), 'smug');
    const decideEl = $('#mb-ob-decide');
    decideEl.hidden = false;
    decideEl.classList.add('pop');
    if (!found) decideEl.insertAdjacentHTML('afterbegin', '<p class="ob-luck">信用ゼロ。ここからは勘の勝負（ご褒美のもと 15）</p>');
    api.reveal(decideEl, 'nearest');
    const decide = await new Promise(res => decideEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { api.sfx.tap(); res(b.dataset.d); })));
    if (!api.alive()) return;
    decideEl.hidden = true;
    await api.wager({ question: `「${decide === 'bluff' ? 'ブラフ' : '強い手'}」と読んだ。自信は？`, base });
    if (!api.alive()) return;

    // ためてから、ヴェルベットの手札をめくる
    setStep(4);
    const hands = $('#mb-ob-hands');
    api.reveal(hands, 'center');
    api.coach('ヴェルベットの手札、めくるよ……！'); api.sfx.drum();
    hands.classList.add('is-reveal');
    await api.wait(api.reduce ? 200 : 1000);
    if (!api.alive()) return;
    const herEl = $('#mb-ob-her');
    herEl.children[0].outerHTML = api.cardHTML(her[0], 'small flip');
    api.sfx.tick();
    await api.wait(api.reduce ? 150 : 750);
    if (!api.alive()) return;
    herEl.children[1].outerHTML = api.cardHTML(her[1], 'small flip');
    api.sfx.tick();
    await api.wait(api.reduce ? 150 : 500);
    if (!api.alive()) return;
    const nm = $('#mb-ob-her-name');
    nm.textContent = herCat; nm.classList.add(S.truth === 'strong' ? 'is-strong' : 'is-bluff', 'pop');
    if (!found) markAnswer(false);
    const correct = decide === S.truth;
    api.say(S.truth === 'bluff'
      ? (correct ? 'う、うそ……あたしのブラフが……！' : 'ふふっ、降りちゃった♡ ざぁこ♡')
      : (correct ? '……ちっ。逃げ足だけは速いのね' : 'ざぁんねん♡ 本物なの'),
      S.truth === 'bluff' ? (correct ? 'busted' : 'smug') : 'smug');
    await api.wait(api.reduce ? 200 : 900);
    if (!api.alive()) return;
    const truthDesc = S.truth === 'strong' ? `本当に強い手（${herCat}・${herCards}）` : `ブラフ（${herCat}・${herCards}）`;
    const evName = EVK[S.ev[keys[0]].kind][1];
    let detail;
    if (found && correct) detail = `${S.lieShort}がウソ。ヴェルベットは${truthDesc}だった。`;
    else if (found) detail = `ウソは暴いたのに逆に読んだ。${S.lieShort}は${S.truth === 'bluff' ? '強がり' : '弱いふり'}のウソ＝ヴェルベットは${truthDesc}だった。`;
    else if (correct) detail = `勘が当たった！ ヴェルベットは${truthDesc}。矛盾は${S.lieShort}×${evName}だった。`;
    else detail = `ヴェルベットは${truthDesc}。矛盾は${S.lieShort}×${evName}。ウソの向きの逆が本当の手だよ。`;
    api.fitStage();
    api.finish({
      correct, base,
      perfect: correct && found && misses === 0 && api.mult === 3,
      title: correct && found && !(misses === 0 && api.mult === 3) ? 'ウソ、暴いた！' : undefined,
      detail,
      extra: `<div class="ob-res-extra">${found ? `矛盾を見つけた：${misses + 1}回目` : '矛盾は見つからず'}・信用 ${'◆'.repeat(3 - misses)}${'◇'.repeat(misses)}</div>`,
    });
  }

  // シナリオの自己点検：札の重なり・ミミの役・本当の手の向きが、書いた通りか
  function selfCheck(api, S, board, mimi, her) {
    const all = board.concat(mimi, her);
    const errs = [];
    if (all.some(c => c.r < 2 || c.r > 14 || !api.SUITS.includes(c.s))) errs.push('bad card');
    if (new Set(all.map(api.key)).size !== all.length) errs.push('duplicate card');
    if (api.category(mimi.concat(board)) !== S.mimiCat) errs.push('mimiCat ' + api.category(mimi.concat(board)));
    const a = api.score(her.concat(board)), b = api.score(mimi.concat(board));
    if (S.truth === 'strong' ? !(a > b) : !(a < b)) errs.push('truth mismatch');
    if (!S.says[S.lie] || S.key.some(k => !S.ev[k])) errs.push('bad index');
    if (errs.length) console.error('[objection] scenario ' + S.id + ': ' + errs.join(', '));
  }

  // 当たり：斜めの深紅の帯に OBJECTION と「ウソ、見つけた！」、ヴェルベットが崩れる
  function slam(api, S) {
    api.say(S.panic, 'panic');
    api.sfx.whoosh(); setTimeout(() => api.sfx.good(), 180); setTimeout(() => api.sfx.jackpot(), 420);
    const el = document.createElement('div');
    el.className = 'ob-slam';
    el.innerHTML = `<div class="ob-art"><img src="${api.char.panic}" alt=""></div>
      <div class="ob-band"><div class="ob-en">OBJECTION!</div><div class="ob-jp">ウソ、見つけた！</div></div><div class="ob-flash"></div>`;
    api.layer.appendChild(el);
    const st = api.stage;
    if (st && !api.reduce) { st.classList.remove('ob-quake'); void st.offsetWidth; st.classList.add('ob-quake'); setTimeout(() => st.classList.remove('ob-quake'), 700); }
    setTimeout(() => {
      const b = el.querySelector('.ob-band');
      if (b && el.isConnected) { const r = b.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, Math.min(r.top + r.height / 2, api.layer.getBoundingClientRect().bottom - 40), 36); }
    }, 350);
    setTimeout(() => el.classList.add('out'), api.reduce ? 500 : 1500);
    setTimeout(() => el.remove(), api.reduce ? 700 : 1800);
  }

  // 外れ：ヴェルベットが得意顔でのぞき込んで笑う
  function miss(api, line) {
    api.sfx.nope();
    api.say(line, 'smug');
    const el = document.createElement('div');
    el.className = 'ob-peek';
    el.innerHTML = `<div class="ob-peek-say">${line}</div><div class="ob-peek-win"><img src="${api.char.smug}" alt=""></div>`;
    api.layer.appendChild(el);
    setTimeout(() => el.remove(), api.reduce ? 900 : 1700);
  }

  const CSS = `
    .ob-hands { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 18px; }
    .ob-hand { display: flex; align-items: center; gap: 8px; }
    .ob-who { font-family: var(--disp); letter-spacing: .14em; color: var(--gold); font-size: 15px; }
    .ob-cards { display: flex; gap: 4px; }
    .ob-hn { font-weight: 900; font-size: 13px; }
    .ob-hand.her .ob-hn { color: var(--dim); }
    .ob-hn.is-strong { color: var(--red-hi) !important; font-size: 16px; } .ob-hn.is-bluff { color: var(--good) !important; font-size: 16px; }
    .ob-vs { font-family: var(--disp); font-size: 26px; color: var(--red-hi); transform: skewX(-12deg); line-height: 1; }
    .ob-hands.is-reveal .ob-hand.her { filter: drop-shadow(0 0 14px rgba(255,74,96,.6)); }
    .ob-sub { margin: -4px 0 0; text-align: center; font-size: 13px; color: var(--dim); text-wrap: balance; }
    .ob-sub b { color: var(--text); }

    .ob-court { position: relative; display: grid; grid-template-columns: minmax(0,1fr) 56px minmax(0,1fr); align-items: start; }
    .ob-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .ob-colhead { position: relative; isolation: isolate; display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 10px; padding: 3px 14px; font-size: 12px; font-weight: 700; color: var(--gold-pale); }
    .ob-colhead::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: linear-gradient(90deg, rgba(200,37,58,.85), rgba(200,37,58,0)); border-left: 4px solid var(--gold); }
    .ob-evs .ob-colhead::before { background: linear-gradient(90deg, rgba(217,179,90,.55), rgba(217,179,90,0)); }
    .ob-colhead b { font-family: var(--disp); font-weight: 400; font-size: 22px; letter-spacing: .14em; color: #fff; line-height: 1.2; }

    .ob-say { position: relative; cursor: pointer; padding: 6px 14px 9px; margin-top: 4px; background: #fff6f3; color: #2b0e18; border: 2px solid #e9c3c6; border-radius: 16px; box-shadow: 0 6px 14px rgba(0,0,0,.45); transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, opacity .2s; outline: none; }
    .ob-say::before { content: ""; position: absolute; left: 18px; top: -11px; width: 18px; height: 12px; background: #e9c3c6; clip-path: polygon(0 0, 100% 100%, 0 100%); }
    .ob-say::after { content: ""; position: absolute; left: 20px; top: -7px; width: 13px; height: 9px; background: #fff6f3; clip-path: polygon(0 0, 100% 100%, 0 100%); }
    .ob-say .ob-tag { font-family: var(--disp); letter-spacing: .14em; font-size: 13px; color: #b0182e; line-height: 1.4; }
    .ob-say p { margin: 0; font-weight: 800; font-size: 14.5px; line-height: 1.55; }
    .ob-say:hover, .ob-say:focus-visible { transform: translateY(-2px); border-color: var(--gold); }
    .ob-say.sel { background: #fffbe6; border-color: var(--gold-hi); box-shadow: 0 0 0 3px rgba(245,215,122,.45), 0 0 26px rgba(245,215,122,.55); transform: translateX(4px) scale(1.02); }
    .ob-say.sel::before { background: var(--gold-hi); } .ob-say.sel::after { background: #fffbe6; }

    .ob-ev { position: relative; cursor: pointer; margin-top: 10px; padding: 18px 12px 10px; background: #f3e2bd; color: #2b1a10; transform: rotate(var(--rot, 0deg)); box-shadow: 0 6px 14px rgba(0,0,0,.45); transition: transform .16s ease, box-shadow .16s ease, opacity .2s; outline: none; }
    .ob-ev:hover, .ob-ev:focus-visible { transform: rotate(0deg) translateY(-2px); }
    .ob-tab { position: absolute; top: -12px; left: 10px; padding: 1px 10px; background: var(--gold); color: #1d080e; font-family: var(--disp); letter-spacing: .12em; font-size: 14px; line-height: 1.5; transform: skewX(-12deg); box-shadow: 0 3px 6px rgba(0,0,0,.35); white-space: nowrap; }
    .ob-tab em { font-style: normal; font-family: var(--sans); font-weight: 900; font-size: 11px; letter-spacing: 0; margin-left: 6px; }
    .ob-ev.k-board { background: linear-gradient(160deg, #5a1726, #2a0a13); color: var(--text); border: 1px solid rgba(217,179,90,.6); }
    .ob-ev.k-log { background: repeating-linear-gradient(180deg, #fbf3de 0 23px, #e8d7ae 23px 24px); }
    .ob-ev.k-tell { background: #ffdbe7; }
    .ob-ev.k-tell .ob-tab { background: var(--pink); }
    .ob-ev.k-memo { background: #fff1a8; }
    .ob-ev.k-mirror { background: linear-gradient(135deg, #fbf8f0, #dcd5c4); border: 3px double var(--gold); }
    .ob-ev.sel { transform: rotate(0deg) translateX(-4px) scale(1.02); box-shadow: 0 0 0 3px var(--gold-hi), 0 0 26px rgba(245,215,122,.65); }
    .ob-mini-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .ob-ev .card.ob-mini { --w: 30px; border-width: 1px; box-shadow: 0 2px 4px rgba(0,0,0,.4); }
    .ob-note { margin-top: 6px; font-size: 12px; font-weight: 700; color: var(--gold-pale); line-height: 1.45; }
    .ob-log { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; font-size: 13px; line-height: 23px; }
    .ob-log li { display: grid; grid-template-columns: 4.6em auto minmax(0,1fr); gap: 8px; align-items: baseline; }
    .ob-log .st { font-weight: 900; font-size: 12px; color: #7d1022; }
    .ob-log .cs { white-space: nowrap; }
    .ob-log .ac { font-weight: 800; }
    .ob-cl { font-family: var(--disp); font-weight: 400; font-size: 1.2em; letter-spacing: .02em; color: #1a1a1a; margin-right: 2px; }
    .ob-cl.red { color: #c8253a; }
    .ob-evtext { margin: 0; font-weight: 800; font-size: 14px; line-height: 1.55; }
    .ob-evtext b, .ob-note b { color: #b0182e; }

    .ob-col.is-next .ob-say, .ob-col.is-next .ob-ev { animation: mb-obPulse 1.3s ease-in-out infinite; }
    @keyframes mb-obPulse { 50% { box-shadow: 0 0 0 3px rgba(245,215,122,.6), 0 0 18px rgba(245,215,122,.4); } }
    .ob-say.is-off, .ob-ev.is-off { opacity: .38; }
    .ob-court .ob-say.hint, .ob-court .ob-ev.hint { border-color: var(--gold-hi); animation: mb-obHint .8s ease-in-out infinite; }
    @keyframes mb-obHint { 50% { box-shadow: 0 0 0 4px rgba(245,215,122,.85), 0 0 28px rgba(245,215,122,.9); } }
    .ob-say.is-lie { border-color: var(--red-hi); box-shadow: 0 0 0 3px rgba(255,74,96,.5), 0 0 26px rgba(255,74,96,.5); }
    .ob-ev.is-key { transform: rotate(0deg); box-shadow: 0 0 0 3px var(--gold-hi), 0 0 30px rgba(245,215,122,.8); }
    .ob-stamp { position: absolute; right: 8px; top: -14px; padding: 0 8px; font-family: var(--mincho); font-weight: 800; font-size: 20px; line-height: 1.3; color: #c8253a; border: 3px solid #c8253a; background: rgba(255,255,255,.75); transform: rotate(-10deg); animation: mb-obStamp .4s cubic-bezier(.2,1.6,.4,1) both; pointer-events: none; }
    .ob-stamp.gold { color: #7a5200; border-color: #b8860b; background: rgba(255,243,194,.9); }
    @keyframes mb-obStamp { from { transform: rotate(-10deg) scale(2.6); opacity: 0; } }
    .ob-court.is-charge .sel { animation: mb-obCharge .12s linear infinite; }
    @keyframes mb-obCharge { 50% { filter: brightness(1.25); translate: 1px 0; } }

    .ob-thread { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 3; }
    .ob-thread path { fill: none; stroke: var(--red-hi); stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(255,74,96,.9)); stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: mb-obDraw .35s ease-out forwards; }
    .ob-thread.is-gold path { stroke: var(--gold-hi); stroke-width: 5; filter: drop-shadow(0 0 8px rgba(245,215,122,1)); }
    .ob-thread circle { fill: var(--gold-hi); stroke: #fff; stroke-width: 2; }
    @keyframes mb-obDraw { to { stroke-dashoffset: 0; } }

    .ob-bar { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 30px; padding-top: 4px; }
    .ob-bar.is-done .ob-go { display: none; }
    .ob-cred { display: flex; align-items: center; gap: 7px; font-weight: 900; font-size: 13px; color: var(--dim); }
    .ob-cred i { width: 26px; height: 18px; transform: skewX(-12deg); background: linear-gradient(90deg, var(--gold-hi), var(--gold)); border: 1px solid var(--gold-pale); box-shadow: 0 0 10px rgba(245,215,122,.5); }
    .ob-cred i.broken { background: #2b0e18; border-color: rgba(217,179,90,.3); box-shadow: none; animation: mb-obBreak .5s ease; }
    @keyframes mb-obBreak { 0% { background: var(--red-hi); transform: skewX(-12deg) scale(1.5); } 60% { transform: skewX(-12deg) translateY(4px) rotate(8deg); } }
    .ob-go { min-width: 230px; min-height: 60px; font-size: 22px; letter-spacing: .08em; }
    .ob-go small { font-family: var(--disp); letter-spacing: .24em; font-size: 13px; }
    .ob-go:not([disabled]) { animation: mb-obGo 1s ease-in-out infinite; }
    .ob-go:not([disabled])::before { background: linear-gradient(90deg, var(--red-hi), var(--red) 50%, #8a1427); box-shadow: 0 0 24px rgba(255,74,96,.6), 0 6px 16px rgba(0,0,0,.45); }
    @keyframes mb-obGo { 50% { transform: scale(1.05); } }
    .ob-luck { width: 100%; margin: 0; text-align: center; font-size: 13px; color: var(--bad); font-weight: 700; }
    .ob-res-extra { margin-top: 6px; font-size: 12px; color: var(--dim); }

    .ob-slam { position: absolute; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; }
    .ob-slam::before { content: ""; position: absolute; inset: 0; background: rgba(8,2,4,.74); animation: mb-fadeIn .15s; }
    .ob-slam.out { animation: mb-obOut .3s ease forwards; }
    @keyframes mb-obOut { to { opacity: 0; } }
    .ob-flash { position: absolute; inset: 0; background: #fff; animation: mb-obFlash .4s ease-out forwards; }
    @keyframes mb-obFlash { to { opacity: 0; } }
    .ob-art { position: absolute; right: -4%; top: 3%; width: min(92vw, 860px); animation: mb-obArt .45s .08s cubic-bezier(.2,1.2,.3,1) both, mb-obQuake .45s .55s ease 2; }
    .ob-art img { display: block; width: 100%; height: auto; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 24%), linear-gradient(180deg, #000 68%, transparent 98%); -webkit-mask-composite: source-in; mask-image: linear-gradient(90deg, transparent 0, #000 24%), linear-gradient(180deg, #000 68%, transparent 98%); mask-composite: intersect; }
    @keyframes mb-obArt { from { transform: translateX(60%); opacity: 0; } }
    @keyframes mb-obQuake { 25% { transform: translate(-9px, 3px) rotate(-1.5deg); } 50% { transform: translate(8px, -2px) rotate(1deg); } 75% { transform: translate(-4px, 2px); } }
    .ob-band { position: absolute; left: -10%; right: -10%; top: 56%; padding: 12px 0 14px; transform: skewY(-7deg); display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(90deg, #3d0510, #c8253a 38%, #ff4a60 50%, #c8253a 62%, #3d0510); border-block: 5px solid var(--gold-hi); box-shadow: 0 0 70px rgba(200,37,58,.85); animation: mb-obBand .38s cubic-bezier(.2,1.2,.3,1) both; }
    @keyframes mb-obBand { from { transform: skewY(-7deg) translateX(-115%); } }
    .ob-en { font-family: var(--disp); font-size: clamp(66px, 14vw, 156px); line-height: .92; letter-spacing: .05em; color: #fff; text-shadow: 0 5px 0 #3d0510, 0 0 34px rgba(245,215,122,.85); animation: mb-obWord .45s .12s cubic-bezier(.2,1.5,.3,1) both; }
    .ob-jp { font-family: var(--mincho); font-weight: 800; font-size: clamp(20px, 3.4vw, 34px); letter-spacing: .24em; color: var(--gold-pale); text-shadow: 0 2px 0 #3d0510; animation: mb-obWord .4s .26s both; }
    @keyframes mb-obWord { from { opacity: 0; transform: scale(2.4) rotate(-4deg); } }
    #mb-stage.ob-quake { animation: mb-obStageQuake .5s ease; }
    @keyframes mb-obStageQuake { 20% { transform: translate(-6px, 4px); } 40% { transform: translate(6px, -3px); } 60% { transform: translate(-4px, 2px); } 80% { transform: translate(3px, -1px); } }

    .ob-peek { position: absolute; right: 0; bottom: 0; z-index: 60; pointer-events: none; width: min(64vw, 460px); animation: mb-obPeek 1.7s ease forwards; }
    .ob-peek-win { height: min(36vw, 250px); margin-right: -24px; overflow: hidden; transform: skewX(-12deg); transform-origin: 0 100%; border: 3px solid var(--gold); border-right: 0; border-bottom: 0; background: linear-gradient(160deg, #5a1726, #1d080e); box-shadow: 0 0 40px rgba(0,0,0,.7); }
    .ob-peek-win img { display: block; width: 118%; margin-left: -6%; transform: skewX(12deg); }
    .ob-peek-say { position: absolute; left: -6px; top: -48px; max-width: 100%; padding: 7px 14px; background: #fff; color: #b0182e; font-weight: 900; font-size: 15px; line-height: 1.4; transform: skewX(-8deg); box-shadow: 0 6px 16px rgba(0,0,0,.5); border-left: 5px solid var(--red-hi); }
    @keyframes mb-obPeek { 0% { transform: translateX(105%); } 14% { transform: none; } 84% { transform: none; opacity: 1; } 100% { transform: translateX(30%); opacity: 0; } }

    @media (max-width: 560px) {
      .ob-court { grid-template-columns: minmax(0,1fr) 14px minmax(0,1fr); }
      .ob-colhead { padding: 2px 8px; font-size: 11px; }
      .ob-colhead b { font-size: 18px; letter-spacing: .08em; }
      .ob-say { padding: 5px 9px 7px; border-radius: 12px; }
      .ob-say p { font-size: 13px; line-height: 1.5; }
      .ob-ev { padding: 16px 8px 8px; }
      .ob-tab { font-size: 12px; padding: 1px 7px; left: 6px; }
      .ob-tab em { font-size: 11px; margin-left: 0; }
      .ob-tab .en { display: none; }
      .ob-ev .card.ob-mini { --w: 23px; }
      .ob-mini-row { gap: 3px; }
      .ob-log { font-size: 12px; line-height: 1.35; gap: 4px; }
      .ob-log li { grid-template-columns: auto minmax(0,1fr); gap: 0 6px; }
      .ob-log .ac { grid-column: 1 / -1; }
      .ob-evtext { font-size: 13px; }
      .ob-note { font-size: 11px; }
      .ob-stamp { font-size: 16px; right: 4px; top: -12px; }
      .ob-hands { flex-wrap: nowrap; gap: 10px; }
      .ob-hand { flex-direction: column; gap: 3px; min-width: 0; }
      .ob-hn { text-align: center; }
      .ob-art { width: 170vw; right: -35vw; top: 1%; }
      .ob-go { min-width: 200px; font-size: 20px; }
      .ob-band { top: 52%; }
      .ob-peek-say { font-size: 13px; top: -44px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ob-art, .ob-band, .ob-en, .ob-jp, .ob-peek { animation: none !important; }
    }
  `;
})();
