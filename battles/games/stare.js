// 心理：見つめ合い（度胸のチキンレース）
// 操作は長押しだけ。押している間、相手の「動揺」とミミの「緊張」が同時に上がる。
// 動揺が 33/66/100% を越えるたびに相手の顔が崩れて、手がかりが1つずつ出る。
// ミミの緊張は毎回速さが違い、ときどき跳ねる。ミミが先に100%になったら「目をそらした」で打ち切り。
// 手がかりは裏で決めた「本当の手」から、段ごとの的中率で作る（段1 あいまい／段2 だいたい／段3 決定的）。
(() => {
  const TH = [33, 66, 100];
  const KIND = ['あいまい', 'だいたい', '決定的'];
  const ACT_ACC = .85; // 演技（わざとらしい顔）を逆に読んだ時の的中率。15% は「裏の裏」で顔のとおり
  const other = (t) => (t === 'bluff' ? 'strong' : 'bluff');
  const LEAN = { bluff: 'ブラフっぽい', strong: '強い手っぽい' };
  const NAME = { bluff: 'ブラフ', strong: '強い手' };

  // 性格：prior＝ブラフの多さ、dur＝動揺が100%になるまでの長押し時間、acc＝段ごとの的中率、act＝演技の混ざりやすさ
  const CH = {
    polka: {
      prior: .65, dur: 4200, acc: [.6, .75, .95], act: 0, ox: 62, openE: 'smug', emo: ['smug', 'panic', 'panic'], alt: [1, 1, 1],
      trait: 'ブラフ率65%・すぐ崩れる', open: 'ふっふーん。ボクの目、見てみなよ！',
      tip: 'ポルカは崩れやすい子。離すと、そこで止まるよ',
      react: ['う、うぅ……', 'み、見すぎだってば！', 'わーっ！ もう無理ぃ！'], gloat: 'へへーん、先にそらしたね！',
      end: { bc: 'うわーん、バレてたー！', bw: 'えへへ、降りてくれてありがと！', sc: 'ちぇっ、降りちゃうんだ……', sw: '残念っ、本物だよー！' },
      clue: [
        { bluff: ['……まばたきが、ちょっと増えた', '口元が、むずむず動いている'], strong: ['……小さく、鼻歌が聞こえた', '肩の力が、ふっと抜けた'] },
        { bluff: ['「な、なに？ じっと見ないでよ！」目が泳いだ', 'こめかみを、汗がひとすじ流れた'], strong: ['「えへへ、見つめても無駄だよー」', 'にこにこ見つめ返してくる。目をそらさない'] },
        { bluff: ['「ご、ごめん！ ほんとは何も無い……あっ」', '「こっち見ないでぇ！ 何も持ってないもん！」'], strong: ['「……ミミちゃん、降りた方がいいよ。本気で」', '「コールしてくれたら、うれしいなぁ……ふふっ」'] },
      ],
    },
    selina: {
      prior: .25, dur: 7000, acc: [.55, .72, .88], act: 0, ox: 66, openE: 'think', emo: ['think', 'think', 'panic'], alt: [0, 0, 1],
      trait: 'ブラフ率25%・崩れにくい', open: '……どうぞ。見つめても、無駄よ',
      tip: 'セリナは崩れにくい子。段3でも、ほんの少ししか出ない',
      react: ['……', '……しつこいわね', '……っ'], gloat: '……ふふ。先に、そらしたわね',
      end: { bc: '……見抜かれたわね', bw: '……ふふ、降りてくれて助かったわ', sc: '……賢明ね', sw: '……だから言ったでしょう' },
      clue: [
        { bluff: ['……眼鏡を、一度だけ押し上げた', '……まばたきが、一度だけ増えた'], strong: ['……微動だにしない', '……呼吸が、ゆっくりで一定'] },
        { bluff: ['視線が一瞬、場札の{X}に落ちた', '指先で、チップの縁をなぞり続けている'], strong: ['静かに、チップを揃え直した', 'こちらを見たまま、紅茶に口をつけた'] },
        { bluff: ['「……見すぎよ」声が、ほんの少し上ずった', '「……もういいでしょう」先に、まばたきをした'], strong: ['「……どうぞ、コールして」かすかに微笑んだ', '「……後悔しても知らないわよ」目が笑っている'] },
      ],
    },
    velvet: {
      prior: .45, dur: 5600, acc: [.6, .75, .95], act: .45, ox: 64, openE: 'smug', emo: ['smug', 'smug', 'panic'], alt: [0, 0, 1],
      trait: 'ブラフ率45%・演技派', open: 'ふふ。あたしの目、読めるかしら？',
      tip: 'ヴェルベットは演技をする。<b>わざとらしい</b>顔は、逆に読んで',
      react: ['あら、熱心ね', 'ちょっと……近いわよ', 'もう！ 降参よ！'], gloat: 'あら、もうおしまい？',
      end: { bc: 'もう！ 演技が台無し！', bw: 'ふふ、あたしの演技、上手でしょ？', sc: 'あら、賢いのね', sw: '本気だって言ったじゃない' },
      clue: [
        { bluff: ['指先が、髪を何度もいじっている', 'つま先が、小さくリズムを刻んでいる'], strong: ['脚を組み替えて、ゆったり座り直した', 'グラスを、ゆっくり回している'] },
        { bluff: ['「……な、なによ」一瞬だけ、声が裏返った', '笑顔が、ほんの一瞬こわばった'], strong: ['「ふふ、見つめても無駄よ」楽しそうに目を細めた', '見つめ返して、ウインクまでしてきた'] },
        { bluff: ['「もう見ないで！ 演技が続かないじゃない！」', '「……降参。こんな手で賭けるんじゃなかった」'], strong: ['「演技はおしまい。……あたし、本当に強いの」', '「本気で言うわ。降りなさい、ミミ」'] },
      ],
      // 演技：本当の手と逆の顔を、わざとらしく作ってみせる
      acted: { bluff: ['わざとらしく、目を泳がせてみせた', '大げさに、ため息をついてみせた'], strong: ['わざとらしく、余裕の笑みを作ってみせた', '大げさに、胸を張ってみせた'] },
    },
  };

  // 相手の手札：強い手＝場のマークがそろうフラッシュ／ブラフ＝役なし（半分は「あと1枚でフラッシュ」の外れ）
  function dealHer(api, truth, X, board, mine) {
    const used = new Set([...board, ...mine].map(api.key));
    const ms = api.score([...mine, ...board]);
    const free = api.deck().filter(c => !used.has(api.key(c)));
    const xs = free.filter(c => c.s === X), ns = free.filter(c => c.s !== X);
    const draw = Math.random() < .5;
    for (let k = 0; k < 600; k++) {
      const h = truth === 'strong' ? api.shuffle(xs).slice(0, 2) : draw ? [api.pick(xs), api.pick(ns)] : api.shuffle(ns).slice(0, 2);
      const all = [...h, ...board];
      const sc = api.score(all);
      if (truth === 'strong' ? sc > ms : (sc < ms && api.category(all) === 0)) return h.sort((a, b) => (b.s === X) - (a.s === X));
    }
    return truth === 'strong' ? xs.slice(0, 2) : [ns.find(c => c.r === 5), ns.find(c => c.r === 4)];
  }

  const CSS = `
    .stare-sit { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .stare-cards { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; justify-content: center; }
    .stare-grp { display: flex; gap: 4px; align-items: center; }
    .stare-tag { font-family: var(--disp); letter-spacing: .14em; font-size: 14px; color: var(--gold); margin-right: 4px; line-height: 1; }
    .stare-tag.is-vs { color: var(--red-hi); font-size: 18px; margin: 0; }
    .stare-sit .formula { font-size: 13px; }
    .stare-sit .formula b { color: var(--gold-hi); }
    .stare-duel { display: grid; grid-template-columns: 30px minmax(0, 1fr) 30px; gap: 8px; }
    .stare-arena { position: relative; height: clamp(236px, 31vw, 320px); overflow: hidden; border: 1px solid rgba(217,179,90,.5); background: #12040a; user-select: none; -webkit-user-select: none; --shk: 0px; }
    .stare-arena.is-on:not(.is-calm) { animation: mb-stare-shk .14s linear infinite; }
    @keyframes mb-stare-shk { 25% { transform: translate(var(--shk), 0); } 50% { transform: translate(0, calc(var(--shk) * -1)); } 75% { transform: translate(calc(var(--shk) * -1), 0); } }
    .stare-panel { position: absolute; top: -6px; bottom: -6px; width: calc(50% + 4px); overflow: hidden; transform: skewX(-12deg); border: 2px solid var(--gold); }
    .stare-panel.is-mimi { left: -14px; background: linear-gradient(160deg, #6a1a2c, #22070f 72%); }
    .stare-panel.is-opp { right: -14px; background: linear-gradient(200deg, #4a1022, #12040a 72%); }
    .stare-panel img { position: absolute; left: 50%; max-width: none; width: auto; pointer-events: none; transition: opacity .12s; }
    .stare-panel.is-mimi img { height: 176%; top: -30%; transform: translateX(-50%) skewX(12deg); }
    .stare-panel.is-opp img { height: 140%; top: -13%; transform: translateX(calc(var(--ox, 62) * -1%)) skewX(12deg); }
    .stare-panel img.alt { opacity: 0; }
    .stare-panel.is-alt img.alt { opacity: 1; } .stare-panel.is-alt img.main { opacity: 0; }
    .stare-panel.is-crack { animation: mb-stare-crack .45s ease; }
    @keyframes mb-stare-crack { 15% { filter: brightness(2.2); transform: skewX(-12deg) translateX(8px); } 40% { transform: skewX(-12deg) translateX(-6px); } 70% { transform: skewX(-12deg) translateX(3px); } }
    .stare-spark { position: absolute; left: 30%; width: 40%; top: calc(40% - 22px); height: 44px; z-index: 3; opacity: 0; transition: opacity .2s; pointer-events: none; overflow: visible; filter: drop-shadow(0 0 5px #f5d77a) drop-shadow(0 0 12px rgba(255,74,96,.9)); }
    .stare-arena.is-on .stare-spark { opacity: 1; }
    .stare-spark polyline { fill: none; stroke: #fff3c2; stroke-width: 3; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .stare-spark polyline.b { stroke: #ff4a60; stroke-width: 1.6; }
    .stare-clash { position: absolute; left: 50%; top: 40%; width: 34px; height: 34px; margin: -17px 0 0 -17px; z-index: 3; opacity: 0; background: radial-gradient(circle, #fff 0 18%, rgba(245,215,122,.9) 30%, transparent 68%); clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); pointer-events: none; }
    .stare-arena.is-on .stare-clash { opacity: 1; animation: mb-stare-clash .3s linear infinite; }
    @keyframes mb-stare-clash { 50% { transform: scale(1.5) rotate(45deg); } }
    .stare-meter { position: relative; width: 20px; background: rgba(0,0,0,.6); border: 1px solid rgba(217,179,90,.6); }
    .stare-meter.is-mimi { justify-self: end; } .stare-meter.is-opp { justify-self: start; }
    .stare-meter .fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; }
    .stare-meter.is-mimi .fill { background: linear-gradient(0deg, #ff9fc2, #ff4a60); }
    .stare-meter.is-opp .fill { background: linear-gradient(0deg, #b8862b, #fff3c2); }
    .stare-meter.is-hot { border-color: var(--red-hi); animation: mb-stare-hot .3s steps(2) infinite; }
    @keyframes mb-stare-hot { 50% { box-shadow: 0 0 14px rgba(255,74,96,.95); } }
    .stare-meter.is-beat { box-shadow: 0 0 10px rgba(255,159,194,.8); }
    .stare-meter .lbl { position: absolute; left: 0; right: 0; bottom: 6px; writing-mode: vertical-rl; margin: 0 auto; font-size: 11px; font-weight: 900; letter-spacing: .2em; color: #fff; text-shadow: 0 0 3px #000, 0 0 3px #000; z-index: 1; line-height: 20px; }
    .stare-meter .tick { position: absolute; left: -4px; right: -4px; height: 2px; margin-bottom: -1px; background: rgba(255,255,255,.7); z-index: 2; }
    .stare-meter .tick b { position: absolute; left: calc(100% + 1px); top: -8px; font-family: var(--disp); font-weight: 400; font-size: 13px; line-height: 16px; color: var(--dim); }
    .stare-meter .tick.is-got { background: var(--gold-hi); box-shadow: 0 0 8px var(--gold-hi); } .stare-meter .tick.is-got b { color: var(--gold-hi); }
    .stare-meter .pct { position: absolute; left: 50%; top: -20px; transform: translateX(-50%); font-family: var(--disp); font-size: 14px; line-height: 16px; color: var(--text); white-space: nowrap; }
    .stare-duel { padding-top: 20px; }
    .stare-pop { position: absolute; z-index: 4; right: 12px; bottom: 12px; max-width: min(62%, 340px); padding: 7px 12px 8px; background: #fff7e0; color: #2b1a10; font-weight: 800; font-size: 14px; line-height: 1.45; border-radius: 12px; box-shadow: 0 8px 18px rgba(0,0,0,.6); }
    .stare-pop::before { content: ""; position: absolute; top: -9px; right: 32%; border: 10px solid transparent; border-top: 0; border-bottom-color: #fff7e0; }
    .stare-pop small { display: block; font-family: var(--disp); letter-spacing: .12em; color: #a33; font-size: 13px; font-weight: 400; line-height: 1.1; }
    .stare-burst { position: absolute; z-index: 4; right: 16%; top: 6%; font-family: var(--disp); font-size: clamp(34px, 5vw, 50px); line-height: 1; color: var(--gold-hi); text-shadow: 0 3px 0 rgba(0,0,0,.5), 0 0 18px rgba(245,215,122,.9); transform: rotate(-8deg); pointer-events: none; animation: mb-stare-burst .9s ease forwards; }
    .stare-burst small { display: block; font-size: .45em; letter-spacing: .2em; color: #fff; }
    @keyframes mb-stare-burst { 0% { opacity: 0; transform: rotate(-8deg) scale(2.2); } 18% { opacity: 1; transform: rotate(-8deg) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: rotate(-8deg) translateY(-10px); } }
    .stare-doki { position: absolute; z-index: 4; left: 10px; top: 8px; font-weight: 900; font-size: 18px; color: var(--pink); text-shadow: 0 2px 0 #000, 0 0 10px rgba(255,74,96,.9); transform: rotate(-10deg); pointer-events: none; animation: mb-stare-burst .7s ease forwards; }
    .stare-banner { position: absolute; z-index: 5; left: -4%; right: -4%; top: 70%; padding: 8px 6%; text-align: center; transform: skewY(-4deg); background: linear-gradient(90deg, #5a0b19, var(--red) 45%, #5a0b19); border-block: 3px solid var(--gold-hi); font-family: var(--mincho); font-weight: 800; font-size: clamp(17px, 3vw, 28px); line-height: 1.25; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.45); animation: mb-stare-ban .4s cubic-bezier(.2,1.3,.3,1) both; }
    .stare-banner small { display: block; font-family: var(--sans); font-weight: 700; font-size: 12px; color: var(--gold-pale); letter-spacing: .04em; }
    .stare-banner.is-win { background: linear-gradient(90deg, #6b4a0a, #e8c46a 45%, #6b4a0a); color: #1d080e; text-shadow: none; }
    .stare-banner.is-win small { color: #2b1a10; }
    .stare-banner.is-stop { background: linear-gradient(90deg, #1a060c, #3a0c18 45%, #1a060c); }
    @keyframes mb-stare-ban { from { transform: skewY(-4deg) translateX(-110%); } }
    .stare-ctrl { display: flex; justify-content: center; }
    .stare-hold { position: relative; border: 0; cursor: pointer; width: min(440px, 100%); min-height: 80px; padding: 10px 20px; color: #fff; background: transparent; isolation: isolate; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    .stare-hold::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: skewX(-12deg); background: linear-gradient(90deg, var(--red), #8a1427); border: 2px solid var(--gold-hi); box-shadow: 0 8px 20px rgba(0,0,0,.5); transition: transform .1s; }
    .stare-hold span { display: block; font-family: var(--mincho); font-weight: 800; font-size: 26px; letter-spacing: .14em; line-height: 1.2; }
    .stare-hold small { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,.85); }
    .stare-hold.is-nudge::before { animation: mb-stare-nudge 1.1s ease-in-out infinite; }
    @keyframes mb-stare-nudge { 50% { box-shadow: 0 0 0 4px rgba(245,215,122,.35), 0 0 30px rgba(245,215,122,.85); } }
    .stare-hold.is-hint::before { animation: mb-stare-nudge .6s ease-in-out infinite; border-color: #fff; }
    .stare-hold.is-on::before { background: linear-gradient(90deg, #ff4a60, var(--red)); box-shadow: 0 0 34px rgba(255,74,96,.9); transform: skewX(-12deg) scale(.97); }
    .stare-hold:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 4px; }
    .stare-ask { font-family: var(--mincho); font-weight: 800; font-size: 17px; text-align: center; margin: 0 0 8px; }
    .stare-clues { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .stare-clue { position: relative; padding: 7px 12px 9px; border: 1px dashed rgba(217,179,90,.45); background: rgba(0,0,0,.3); color: var(--dim); font-size: 13px; line-height: 1.5; }
    .stare-clue .h { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font-family: var(--disp); letter-spacing: .12em; font-size: 15px; color: var(--gold); line-height: 1.2; }
    .stare-clue .h em { font-style: normal; font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 0; color: var(--dim); }
    .stare-clue .t { font-weight: 800; margin-top: 3px; }
    .stare-clue.is-open { background: #fff7e0; color: #2b1a10; border: 1px solid #fff7e0; box-shadow: 0 6px 14px rgba(0,0,0,.45); animation: mb-pop .35s cubic-bezier(.2,1.6,.4,1); }
    .stare-clue.is-open .h { color: #a33; } .stare-clue.is-open .h em { color: #7a5a30; }
    .stare-clue.is-lost { opacity: .45; }
    .stare-chip { display: inline-block; margin: 5px 6px 0 0; padding: 1px 8px; font-size: 12px; font-weight: 900; line-height: 1.6; }
    .stare-chip.bluff { background: #b0182e; color: #fff; } .stare-chip.strong { background: #2b1a10; color: #ffe9a8; } .stare-chip.act { background: #ff9fc2; color: #2b1a10; }
    .stare-chip.ok { background: #1f6b3a; color: #fff; } .stare-chip.ng { background: #555; color: #fff; }
    .stare-clue.is-key { outline: 3px solid var(--gold-hi); } .stare-clue.is-trap { outline: 3px solid var(--red-hi); }
    .stare-hand-name { font-size: 13px; font-weight: 900; color: var(--gold-hi); margin-left: 6px; white-space: nowrap; }
    .stare-hands { flex-wrap: wrap; justify-content: center; row-gap: 4px; }
    @media (max-width: 560px) {
      .stare-duel { grid-template-columns: 24px minmax(0, 1fr) 24px; gap: 6px; }
      .stare-meter { width: 16px; } .stare-meter .lbl { line-height: 16px; font-size: 10px; letter-spacing: .1em; }
      .stare-meter .tick b { font-size: 11px; }
      .stare-clues { grid-template-columns: 1fr; gap: 8px; }
      .stare-pop { font-size: 12.5px; max-width: 68%; right: 8px; bottom: 8px; padding: 6px 10px 7px; }
      .stare-hold span { font-size: 23px; }
      .stare-cards { gap: 6px 10px; }
    }
  `;

  async function start({ api }) {
    const who = CH[api.charId] ? api.charId : 'polka';
    const ch = CH[who];
    const jp = api.char.jp;
    const truth = Math.random() < ch.prior ? 'bluff' : 'strong';

    // 札：ミミは Q のワンペア（ブラフには勝ち、強い手には負け）
    const X = api.pick(api.SUITS); const o = api.SUITS.filter(s => s !== X);
    const board = [{ r: 12, s: X }, { r: 8, s: X }, { r: 3, s: X }, { r: 10, s: o[0] }, { r: 2, s: o[1] }];
    const mine = [{ r: 12, s: o[1] }, { r: 14, s: o[2] }];
    const her = dealHer(api, truth, X, board, mine);

    // 手がかりを本当の手から作る（ヴェルベットは段1・段2に演技を混ぜる）
    const usedText = new Set();
    const take = (arr) => { const a = arr.filter(t => !usedText.has(t)); const t = api.pick(a.length ? a : arr); usedText.add(t); return t.replace('{X}', api.SYM[X]); };
    const clues = [0, 1, 2].map(s => {
      if (ch.act && s < 2 && Math.random() < ch.act) {
        const surface = Math.random() < ACT_ACC ? other(truth) : truth;
        return { s, acted: true, surface, lean: other(surface), acc: ACT_ACC, text: take(ch.acted[surface]) };
      }
      const surface = Math.random() < ch.acc[s] ? truth : other(truth);
      return { s, acted: false, surface, lean: surface, acc: ch.acc[s], text: take(ch.clue[s][surface]) };
    });

    // ミミの緊張：毎回速さが違い、揺れながら上がり、ときどき跳ねる
    // 速さは「相手によらない分」と「相手の崩れにくさに比例する分」を混ぜる。
    // 目をつぶって最後まで粘った時に段3まで届く率（試算）：ポルカ約79%／ヴェルベット約53%／セリナ約33%。段2まではどの相手でも9割以上
    const mimiDur = (2200 + 0.6 * ch.dur) * (0.9 + Math.random() * 0.75);
    const spikeRate = 0.37; // 1秒あたりの「ドキッ」の起きやすさ
    const ph = Math.random() * 6.28;

    api.css('stare', CSS);
    api.say(ch.open, ch.openE); api.bet(500);
    const root = api.root;
    const pct = (a) => Math.round(a * 100);
    root.innerHTML = `
      <div id="mb-stare-steps">${api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 0)}</div>
      <div class="stare-sit">
        <div class="stare-cards">
          <div class="stare-grp"><span class="stare-tag">BOARD</span>${board.map(c => api.cardHTML(c, 'small')).join('')}</div>
          <div class="stare-grp stare-hands"><span class="stare-tag">MIMI</span>${mine.map(c => api.cardHTML(c, 'small')).join('')}
            <span class="stare-tag is-vs">VS</span><span class="stare-tag">${api.char.name}</span><span class="stare-grp" id="mb-stare-her">${api.backHTML('small')}${api.backHTML('small')}</span><span class="stare-hand-name" id="mb-stare-her-name"></span></div>
        </div>
        <div class="formula">${jp}（${ch.trait}）が大きく賭けてきた。ミミは<b>Qのワンペア</b>：ブラフには勝ち、強い手には負け</div>
      </div>
      <div class="stare-duel">
        <div class="stare-meter is-mimi" id="mb-stare-m-mimi"><span class="pct" id="mb-stare-p-mimi">0</span><i class="fill"></i><span class="lbl">ミミの緊張</span></div>
        <div class="stare-arena" id="mb-stare-arena">
          <div class="stare-panel is-mimi" id="mb-stare-mimi"><img class="main" src="${api.MIMI.calm}" alt="ミミ"><img class="alt" src="${api.MIMI.shock}" alt=""></div>
          <div class="stare-panel is-opp" id="mb-stare-opp" style="--ox:${ch.ox}"><img class="main" src="${api.char.smug}" alt="${jp}"><img class="alt" src="${api.char.panic}" alt=""></div>
          <svg class="stare-spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true"><polyline class="b" id="mb-stare-bolt2" points="0,22 200,22"/><polyline id="mb-stare-bolt" points="0,22 200,22"/></svg>
          <i class="stare-clash"></i>
        </div>
        <div class="stare-meter is-opp" id="mb-stare-m-opp"><span class="pct" id="mb-stare-p-opp">0</span><i class="fill"></i><span class="lbl">相手の動揺</span>
          ${TH.map((t, i) => `<i class="tick" style="bottom:${t}%"><b>${i + 1}</b></i>`).join('')}</div>
      </div>
      <div class="stare-ctrl" id="mb-stare-ctrl">
        <button class="stare-hold is-nudge" id="mb-stare-hold" type="button"><span>見つめる</span><small>長押し ・ 離すと、そこで止まる</small></button>
      </div>
      <div class="stare-clues" id="mb-stare-clues">${clues.map((c, i) => `
        <div class="stare-clue" data-i="${i}"><div class="h">段${i + 1} ${KIND[i]}<em>動揺${TH[i]}%で出る・的中${pct(ch.acc[i])}%</em></div><div class="t">？？？</div></div>`).join('')}
      </div>`;
    api.coach('長押しで見つめ合い。相手が崩れるまで粘って。でも、ミミが先に崩れたら負け');

    const $ = (s) => root.querySelector(s);
    const arena = $('#mb-stare-arena'), hold = $('#mb-stare-hold'), mimiP = $('#mb-stare-mimi'), oppP = $('#mb-stare-opp');
    const mM = $('#mb-stare-m-mimi'), mO = $('#mb-stare-m-opp'), fM = mM.querySelector('.fill'), fO = mO.querySelector('.fill');
    const pM = $('#mb-stare-p-mimi'), pO = $('#mb-stare-p-opp');
    const bolt = $('#mb-stare-bolt'), bolt2 = $('#mb-stare-bolt2');
    if (api.reduce) arena.classList.add('is-calm');

    let oppV = 0, ten = 0, stage = 0, holding = false, over = null, t = 0, beat = 0, last = 0, boltT = 0, warned = false, flashT = 0;
    let endRes;
    const ended = new Promise(res => { endRes = res; });

    const drawBolt = () => {
      const amp = 6 + (oppV + ten) / 200 * 14;
      const pts = []; for (let i = 0; i <= 10; i++) pts.push(`${i * 20},${(22 + (i === 0 || i === 10 ? 0 : (Math.random() * 2 - 1) * amp)).toFixed(1)}`);
      bolt.setAttribute('points', pts.join(' '));
      const pts2 = []; for (let i = 0; i <= 10; i++) pts2.push(`${i * 20},${(22 + (i === 0 || i === 10 ? 0 : (Math.random() * 2 - 1) * amp * 1.3)).toFixed(1)}`);
      bolt2.setAttribute('points', pts2.join(' '));
    };
    const paint = () => {
      fM.style.height = Math.min(100, ten) + '%'; fO.style.height = oppV + '%';
      pM.textContent = Math.floor(Math.min(100, ten)); pO.textContent = Math.floor(oppV);
      mM.classList.toggle('is-hot', ten >= 75 && !over);
      mimiP.classList.toggle('is-alt', ten >= 75 || flashT > 0 || over === 'mimi');
      arena.style.setProperty('--shk', (0.6 + ten / 100 * 2.6).toFixed(2) + 'px');
    };
    const crack = (s) => {
      const c = clues[s];
      const box = root.querySelector(`.stare-clue[data-i="${s}"]`);
      box.classList.add('is-open');
      box.querySelector('.t').textContent = c.text;
      if (c.acted) box.querySelector('.h em').textContent = `演技は、逆に読むと的中${pct(ACT_ACC)}%`;
      box.insertAdjacentHTML('beforeend', c.acted ? `<span class="stare-chip act">わざとらしい……演技？</span>` : `<span class="stare-chip ${c.surface}">${LEAN[c.surface]}${s === 0 ? '（あいまい）' : ''}</span>`);
      let pop = arena.querySelector('.stare-pop');
      if (!pop) { pop = document.createElement('div'); pop.className = 'stare-pop'; arena.appendChild(pop); }
      pop.innerHTML = `<small>段${s + 1} · ${KIND[s]}</small>${c.text}`;
      pop.classList.remove('pop'); void pop.offsetWidth; pop.classList.add('pop');
      mO.querySelectorAll('.tick')[s].classList.add('is-got');
      const b = document.createElement('div'); b.className = 'stare-burst'; b.innerHTML = `BREAK!<small>段${s + 1}</small>`;
      arena.appendChild(b); setTimeout(() => b.remove(), 950);
      if (ch.alt[s]) oppP.classList.add('is-alt');
      oppP.classList.remove('is-crack'); void oppP.offsetWidth; oppP.classList.add('is-crack');
      if (s === 0) setTimeout(() => { if (stage < 2 && over !== 'opp') oppP.classList.remove('is-alt'); }, 700);
      api.say(ch.react[s], ch.emo[s]);
      api.sfx.good();
      const r = oppP.getBoundingClientRect(); api.sparkles(r.left + r.width * .55, r.top + r.height * .3, 12);
      if (s === 0) api.coach(ch.tip);
      if (s === 1) api.coach('あと1段で<b>決定的な一言</b>。でも、ミミの緊張に注意！');
    };
    const spike = () => {
      ten += 5 + Math.random() * 8; flashT = 320;
      const d = document.createElement('div'); d.className = 'stare-doki'; d.textContent = 'ドキッ！';
      arena.appendChild(d); setTimeout(() => d.remove(), 720);
      api.sfx.tick(); setTimeout(() => api.alive() && api.sfx.tick(), 70);
    };
    const finishStare = (kind) => {
      if (over) return;
      over = kind; holding = false;
      hold.classList.remove('is-on'); arena.classList.remove('is-on');
      paint(); endRes();
    };
    const frame = (now) => {
      if (!api.alive() || over) return;
      const dt = last ? Math.min(50, now - last) : 16; last = now;
      if (flashT > 0) flashT -= dt;
      if (holding) {
        t += dt;
        oppV = Math.min(100, oppV + dt / ch.dur * 100);
        ten += dt / mimiDur * 100 * (1 + .35 * Math.sin(t / 1000 * 2.4 + ph));
        if (Math.random() < spikeRate * dt / 1000) spike();
        while (stage < 3 && oppV >= TH[stage]) crack(stage++);
        beat += dt;
        if (beat >= Math.max(140, 560 - ten * 4.2)) {
          beat = 0; api.sfx.tick();
          mM.classList.add('is-beat'); setTimeout(() => mM.classList.remove('is-beat'), 90);
        }
        boltT += dt; if (boltT > 70) { boltT = 0; if (!api.reduce) drawBolt(); }
        if (!warned && ten >= 80 && stage < 3) { warned = true; api.coach('ミミが限界！ 離すなら今', 'panic'); }
        if (stage >= 3) { paint(); finishStare('opp'); return; }
        if (ten >= 100) { ten = 100; paint(); finishStare('mimi'); return; }
      }
      paint();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // 段階つきの助け：短く離すのが2回続いたら「押したまま」を強調、4回続いたら「タップで始める／もう一回タップで止める」に切り替える
    let misses = 0, toggle = false, pressAt = 0;
    const press = (e) => {
      if (e) e.preventDefault();
      if (over || !api.alive()) return;
      if (holding) return;
      holding = true; last = 0; pressAt = performance.now();
      hold.classList.add('is-on'); hold.classList.remove('is-nudge', 'is-hint'); arena.classList.add('is-on');
      hold.querySelector('span').textContent = toggle ? '見つめ中……もう一回タップで止める' : '見つめ中……';
      if (api.reduce) drawBolt();
      try { if (!toggle && e && e.pointerId != null) hold.setPointerCapture(e.pointerId); } catch (err) {}
    };
    const release = (force) => {
      if (!holding || over) return;
      if (toggle && force !== true) return; // タップ式では、離しただけでは止まらない
      holding = false;
      hold.classList.remove('is-on'); arena.classList.remove('is-on');
      if (stage === 0 && !toggle) {
        hold.querySelector('span').textContent = '見つめる'; hold.classList.add('is-nudge');
        if (performance.now() - pressAt < 700) misses++;
        if (misses >= 4) {
          toggle = true;
          hold.querySelector('span').textContent = '見つめる（タップ）'; hold.querySelector('small').textContent = 'タップで始まる ・ もう一回タップで止める';
          api.coach('長押しがむずかしければ、タップで始めて、もう一回タップで止めてもOK', 'think');
        } else if (misses >= 2) {
          hold.classList.add('is-hint'); hold.querySelector('small').textContent = '押したまま ・ 指を離さない';
          api.coach('指を離さずに<b>押したまま</b>。光るボタンを、しばらく押し続けて', 'think');
        } else api.coach('まだ何も見えてない。もう一度、長押しで続き');
        return;
      }
      finishStare('stop');
    };
    hold.addEventListener('pointerdown', (e) => { if (holding && toggle) { e.preventDefault(); release(true); } else press(e); });
    hold.addEventListener('pointerup', () => release());
    hold.addEventListener('pointercancel', () => release());
    hold.addEventListener('lostpointercapture', () => release());
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    const onKey = (e) => {
      if (!api.alive() || over) { document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey); return; }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) { if (holding && toggle) release(true); else press(e); } else if (e.type === 'keyup') release();
    };
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey);

    await ended;
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey);
    if (!api.alive()) return;

    // 見つめ合いの決着
    arena.querySelector('.stare-pop')?.remove();
    const banner = document.createElement('div');
    if (over === 'opp') {
      banner.className = 'stare-banner is-win'; banner.innerHTML = `${jp}が先に目をそらした！<small>手がかりが全部出た</small>`;
      oppP.classList.add('is-alt'); mimiP.classList.remove('is-alt'); api.sfx.jackpot();
      const r = arena.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height * .4, 26);
    } else if (over === 'mimi') {
      banner.className = 'stare-banner'; banner.innerHTML = `ミミが先に目をそらした！<small>ここまでの手がかりで読む。ご褒美は半分</small>`;
      oppP.classList.remove('is-alt'); mimiP.classList.add('is-alt'); api.say(ch.gloat, 'smug'); api.sfx.nope();
    } else {
      banner.className = 'stare-banner is-stop'; banner.innerHTML = `ここで止めた<small>${stage ? `段${stage}まで。手がかりは${stage}つ` : '手がかりは、まだ何も出ていない'}</small>`;
      api.sfx.tap();
    }
    arena.appendChild(banner);
    clues.forEach((c, i) => { if (i >= stage) root.querySelector(`.stare-clue[data-i="${i}"]`).classList.add('is-lost'); });
    let base = 20 + stage * 10;
    if (over === 'mimi') base = Math.max(10, Math.round(base / 2));

    $('#mb-stare-steps').innerHTML = api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 1);
    const ctrl = $('#mb-stare-ctrl');
    ctrl.innerHTML = `<div><p class="stare-ask">${jp}の手は、ブラフ？ 強い手？</p><div class="actions">
      <button class="btn" id="mb-stare-call" type="button">ブラフと読む<small>コールして勝負</small></button>
      <button class="btn quiet" id="mb-stare-fold" type="button">強い手と読む<small>降りて守る</small></button></div></div>`;
    api.coach(stage ? '出た手がかりで読んで。ブラフならコール、強いなら降りる' : '手がかりなし。ここは勘で読むしかない');
    // 指を離した直後の「おまけのクリック」で、同じ場所に出た読みのボタンが押されないようにする
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-stare-call').onclick = on('bluff');
      $('#mb-stare-fold').onclick = on('strong');
    });
    if (!api.alive()) return;
    ctrl.innerHTML = '';
    $('#mb-stare-steps').innerHTML = api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 2);
    await api.wager({ question: `「${NAME[decide]}」と読んだ。自信は？`, base, into: ctrl });
    if (!api.alive()) return;

    // 答え合わせ：ためてから、相手の手札を1枚ずつめくる
    $('#mb-stare-steps').innerHTML = api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 3);
    root.querySelector('.stare-sit').scrollIntoView({ block: 'nearest', behavior: api.reduce ? 'auto' : 'smooth' });
    api.coach('見せ合い……！', 'think'); api.sfx.drum();
    await api.wait(1000); if (!api.alive()) return;
    const herBox = $('#mb-stare-her');
    herBox.innerHTML = api.cardHTML(her[0], 'small flip') + api.backHTML('small');
    api.sfx.tap();
    if (her[0].s === X) api.coach(`${api.SYM[X]}……！ もう1枚も${api.SYM[X]}なら、フラッシュ`);
    await api.wait(her[0].s === X ? 1100 : 700); if (!api.alive()) return;
    herBox.innerHTML = api.cardHTML(her[0], 'small') + api.cardHTML(her[1], 'small flip ' + (truth === 'strong' ? 'glow' : ''));
    const cat = api.category([...her, ...board]);
    $('#mb-stare-her-name').textContent = truth === 'strong' ? api.CAT_NAME[cat] + '！' : (her[0].s === X ? '役なし（あと1枚でフラッシュ）' : '役なし');
    api.sfx[truth === 'strong' ? 'whoosh' : 'tap']();
    oppP.classList.toggle('is-alt', decide === truth);
    await api.wait(600); if (!api.alive()) return;

    // 手がかりの答え合わせ
    clues.slice(0, stage).forEach((c, i) => {
      const box = root.querySelector(`.stare-clue[data-i="${i}"]`);
      const good = c.lean === truth;
      box.classList.add(good ? 'is-key' : 'is-trap');
      box.insertAdjacentHTML('beforeend', c.acted ? (good ? `<span class="stare-chip ok">演技だった＝逆が本当</span>` : `<span class="stare-chip ng">裏の裏：顔のとおりだった</span>`)
        : good ? `<span class="stare-chip ok">本当だった</span>` : `<span class="stare-chip ng">外れの手がかり</span>`);
    });
    await api.wait(500); if (!api.alive()) return;

    // 判断の正しさ：ブラフ率と、出た手がかりの的中率から「見込み」を出して比べる（運で外れても、見込みどおりなら褒める）
    const correct = decide === truth;
    const got = clues.slice(0, stage);
    let odds = ch.prior / (1 - ch.prior);
    got.forEach(c => { odds *= c.lean === 'bluff' ? c.acc / (1 - c.acc) : (1 - c.acc) / c.acc; });
    const pb = odds / (1 + odds);
    const best = pb >= .5 ? 'bluff' : 'strong';
    const pBest = Math.round(Math.max(pb, 1 - pb) * 100);
    const handText = truth === 'bluff' ? '役なしのブラフ' : `${api.CAT_NAME[cat]}（本当に強い手）`;
    let why;
    if (correct) why = decide === best ? `見込みの高い方（${NAME[best]} ${pBest}%）を選んだ、正しい読み。` : `見込みは${NAME[best]}が${pBest}%だったが、勘が当たった。`;
    else why = decide === best ? `見込みの高い方（${NAME[best]} ${pBest}%）を選んだのは正しい判断。今回は運が悪かった。` : `ブラフ率と手がかりから見ると、${NAME[best]}の見込みが${pBest}%だった。`;
    if (over === 'mimi' && oppV >= 80) why += `あと${Math.ceil(100 - oppV)}%で崩せた……！`;
    api.say(ch.end[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')]);
    api.finish({
      correct, perfect: correct && stage === 3 && api.mult === 3, base,
      detail: `${jp}は${handText}だった。${why}`,
    });
  }

  MB.register({ id: 'stare', group: 'psych', order: 2, title: '見つめ合い', sub: 'PSYCH · 度胸', isNew: true, chars: ['polka', 'selina', 'velvet'], start });
})();
