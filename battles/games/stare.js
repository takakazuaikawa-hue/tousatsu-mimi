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
  const LEAN = { bluff: 'ブラフっぽい', strong: '本物っぽい' };
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  // 手がかりの確かさ（当たる率）を ◆ の数で：9割以上＝3、7割以上＝2、それ未満＝1
  const sure = (acc) => (acc >= .9 ? 3 : acc >= .7 ? 2 : 1);
  const pips = (n, cls = '') => `<span class="st-pips ${cls}" aria-label="確かさ${n}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  // 賭けの重さ：たぶん＝外れても失わない／確信＝元の額を失う／ぜったい＝元の3倍を失う（見込みが3分の2を超えたら「ぜったい」が得）
  const STAKES = [0, 1, 3];
  // これまでの記録の並び（毎回同じ並び。ブラフの回数は prior から）
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };

  // hold＝見つめた時にミミがこらえる率（1回目・2回目・3回目）。試算（各15万回、天秤どおりに読み見込みで賭けた時の期待コイン）で、
  // 続けるのが得になる分かれ目はこらえる率 およそ 0.35〜0.5。画面の決まり「金5つ以上なら見つめる」はこれに合わせた。
  // ポルカ＝最後まで見つめる、ヴェルベット＝2つで止める、セリナ＝2つで止める（2回目は五分）になるよう決めた
  // 性格：prior＝ブラフの多さ、dur＝動揺が100%になるまでの長押し時間、acc＝段ごとの的中率、act＝演技の混ざりやすさ
  const CH = {
    polka: {
      prior: .65, dur: 4200, hold: [.9, .8, .7], acc: [.6, .75, .95], act: 0, ox: 62, openE: 'smug', emo: ['smug', 'panic', 'panic'], alt: [1, 1, 1],
      trait: 'ブラフ率65%・すぐ崩れる', open: 'ふっふーん。ボクの目、見てみなよ！',
      tip: 'ポルカは崩れやすい子。離すと、そこで止まるよ',
      react: ['う、うぅ……', 'み、見すぎだってば！', 'わーっ！ もう無理ぃ！'], gloat: 'へへーん、先にそらしたね！',
      end: { bc: 'うわーん、バレてたー！', bw: 'えへへ、降りてくれてありがと！', sc: 'ちぇっ、降りちゃうんだ……', sw: '残念っ、本物だよー！' },
      clue: [
        { bluff: ['……まばたきが、ちょっと増えた', '口元が、むずむず動いている', '耳の先が、ほんのり赤くなった', '椅子の上で、もぞもぞ座り直した', 'チップを指でいじって、カチカチ鳴らしている'], strong: ['……小さく、鼻歌が聞こえた', '肩の力が、ふっと抜けた', '足をぶらぶら揺らして、ご機嫌そう', '頬づえをついて、のんびり見返してくる', 'チップを、きれいに積み直した'] },
        { bluff: ['「な、なに？ じっと見ないでよ！」目が泳いだ', 'こめかみを、汗がひとすじ流れた', '「ボ、ボクの手？ さ、最強だよ？」声が裏返った', '場札の{X}を、ちらちら何度も見ている', '笑ってるのに、目が笑ってない'], strong: ['「えへへ、見つめても無駄だよー」', 'にこにこ見つめ返してくる。目をそらさない', '「ミミちゃん、目がきれいだねー」余裕たっぷり', '「早くしないと、日が暮れちゃうよ？」あくびまでした', '自分の伏せ札を、指でとんとん叩いて楽しそう'] },
        { bluff: ['「ご、ごめん！ ほんとは何も無い……あっ」', '「こっち見ないでぇ！ 何も持ってないもん！」', '「お、降りてよぉ……お願いだから……」', '「ボクの負けでいいから、もう見ないでー！」', '涙目で、伏せ札をぎゅっと隠した'], strong: ['「……ミミちゃん、降りた方がいいよ。本気で」', '「コールしてくれたら、うれしいなぁ……ふふっ」', '「ねえ、全部賭けてもいいんだよ？」目が本気だ', '「見ても変わらないよ。ボク、勝ってるもん」', '胸を張って、伏せ札をこちらへ少し押し出した'] },
      ],
    },
    selina: {
      prior: .25, dur: 7000, hold: [.8, .5, .3], acc: [.55, .72, .88], act: 0, ox: 66, openE: 'think', emo: ['think', 'think', 'panic'], alt: [0, 0, 1],
      trait: 'ブラフ率25%・崩れにくい', open: '……どうぞ。見つめても、無駄よ',
      tip: 'セリナは崩れにくい子。段3でも、ほんの少ししか出ない',
      react: ['……', '……しつこいわね', '……っ'], gloat: '……ふふ。先に、そらしたわね',
      end: { bc: '……見抜かれたわね', bw: '……ふふ、降りてくれて助かったわ', sc: '……賢明ね', sw: '……だから言ったでしょう' },
      clue: [
        { bluff: ['……眼鏡を、一度だけ押し上げた', '……まばたきが、一度だけ増えた', '……指先が、ほんの少しだけ止まった', '……紅茶の湯気を、じっと見つめている', '……膝の上で、指を組み直した'], strong: ['……微動だにしない', '……呼吸が、ゆっくりで一定', '……眼鏡の奥の目が、静かに細くなった', '……背筋が、いつもより真っすぐ', '……ページをめくるように、そっと髪を払った'] },
        { bluff: ['視線が一瞬、場札の{X}に落ちた', '指先で、チップの縁をなぞり続けている', '「……何かしら」返事が、半拍だけ早い', '眼鏡を外して、拭きはじめた', 'カップを持ち上げて、口をつけずに置いた'], strong: ['静かに、チップを揃え直した', 'こちらを見たまま、紅茶に口をつけた', '「……ずいぶん熱心ね」声に、揺れがない', '本を閉じるように、伏せ札にそっと手を置いた', '小さく、ため息をついた。退屈そうに'] },
        { bluff: ['「……見すぎよ」声が、ほんの少し上ずった', '「……もういいでしょう」先に、まばたきをした', '「……降りるのも、勇気よ」目が、伏せ札へ落ちた', '頬に、うっすら赤みがさした', '「……計算違いね」小さな声でつぶやいた'], strong: ['「……どうぞ、コールして」かすかに微笑んだ', '「……後悔しても知らないわよ」目が笑っている', '「……あなたの勇気に、敬意を払うわ」', '「……答えは、もう出ているのよ」眼鏡が光った', '「……私に勝てる手かしら？」静かに見返した'] },
      ],
    },
    velvet: {
      prior: .45, dur: 5600, hold: [.9, .7, .4], acc: [.6, .75, .95], act: .45, ox: 64, openE: 'smug', emo: ['smug', 'smug', 'panic'], alt: [0, 0, 1],
      trait: 'ブラフ率45%・演技派', open: 'ふふ。あたしの目、読めるかしら？',
      tip: 'ヴェルベットは演技をする。<b>わざとらしい</b>顔は、逆に読んで',
      react: ['あら、熱心ね', 'ちょっと……近いわよ', 'もう！ 降参よ！'], gloat: 'あら、もうおしまい？',
      end: { bc: 'もう！ 演技が台無し！', bw: 'ふふ、あたしの演技、上手でしょ？', sc: 'あら、賢いのね', sw: '本気だって言ったじゃない' },
      clue: [
        { bluff: ['指先が、髪を何度もいじっている', 'つま先が、小さくリズムを刻んでいる', 'グラスの縁を、指でなぞり続けている', '唇を、一瞬だけかんだ', '扇子を開いて、すぐ閉じた'], strong: ['脚を組み替えて、ゆったり座り直した', 'グラスを、ゆっくり回している', '背もたれに体をあずけて、くつろいでいる', '髪をかき上げて、うっとり笑った', '扇子で、ゆっくり自分をあおいでいる'] },
        { bluff: ['「……な、なによ」一瞬だけ、声が裏返った', '笑顔が、ほんの一瞬こわばった', '「あら、まだ見るの？」声が少し早口', '場札の{X}から、さっと目をそらした', 'グラスを持つ指に、力が入った'], strong: ['「ふふ、見つめても無駄よ」楽しそうに目を細めた', '見つめ返して、ウインクまでしてきた', '「もっと近くで見てもいいのよ？」', '「いい目ね。気に入ったわ」余裕の笑み', 'グラスを掲げて、乾杯のしぐさをした'] },
        { bluff: ['「もう見ないで！ 演技が続かないじゃない！」', '「……降参。こんな手で賭けるんじゃなかった」', '「お願い、今日は見逃して……」', '扇子で顔を隠したまま、出てこない', '「ずるいわ、そんな目で見るなんて……」'], strong: ['「演技はおしまい。……あたし、本当に強いの」', '「本気で言うわ。降りなさい、ミミ」', '「この手で負けたら、女王の名がすたるわ」', '「ほら、コールしなさいな。待ってるわ」', 'まっすぐ見返して、少しも笑わない'] },
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
    .stare-tag.is-vs { color: var(--gold-hi); font-size: 18px; margin: 0; }
    .stare-sit .formula { font-size: 14px; }
    .stare-sit .formula b { color: var(--gold-hi); }
    .stare-duel { display: grid; grid-template-columns: 30px minmax(0, 1fr) 30px; gap: 8px; }
    .stare-arena { position: relative; height: clamp(236px, 31vw, 320px); overflow: hidden; border: 1px solid var(--line); background: #12040a; user-select: none; -webkit-user-select: none; --shk: 0px; }
    .stare-arena.is-on:not(.is-calm) { animation: mb-stare-shk .14s linear infinite; }
    @keyframes mb-stare-shk { 25% { transform: translate(var(--shk), 0); } 50% { transform: translate(0, calc(var(--shk) * -1)); } 75% { transform: translate(calc(var(--shk) * -1), 0); } }
    .stare-panel { position: absolute; top: -6px; bottom: -6px; width: calc(50% + 4px); overflow: hidden; transform: skewX(-12deg); border: 2px solid var(--gold); }
    .stare-panel.is-mimi { left: -14px; background: linear-gradient(160deg, #5a0b19, #22090c 72%); }
    .stare-panel.is-opp { right: -14px; background: linear-gradient(200deg, #3e0306, #130406 72%); }
    .stare-panel img { position: absolute; left: 50%; max-width: none; width: auto; pointer-events: none; transition: opacity .12s; }
    .stare-panel.is-mimi img { height: 176%; top: -30%; transform: translateX(-50%) skewX(12deg); }
    .stare-panel.is-opp img { height: 140%; top: -13%; transform: translateX(calc(var(--ox, 62) * -1%)) skewX(12deg); }
    .stare-panel img.alt { opacity: 0; }
    .stare-panel.is-alt img.alt { opacity: 1; } .stare-panel.is-alt img.main { opacity: 0; }
    .stare-panel.is-crack { animation: mb-stare-crack .45s ease; }
    @keyframes mb-stare-crack { 15% { filter: brightness(2.2); transform: skewX(-12deg) translateX(8px); } 40% { transform: skewX(-12deg) translateX(-6px); } 70% { transform: skewX(-12deg) translateX(3px); } }
    .stare-spark { position: absolute; left: 30%; width: 40%; top: calc(40% - 22px); height: 44px; z-index: 3; opacity: 0; transition: opacity .2s; pointer-events: none; overflow: visible; filter: drop-shadow(0 0 5px #f5d77a) drop-shadow(0 0 12px rgba(200,37,58,.9)); }
    .stare-arena.is-on .stare-spark { opacity: 1; }
    .stare-spark polyline { fill: none; stroke: #fff3c2; stroke-width: 3; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .stare-spark polyline.b { stroke: var(--red-hi); stroke-width: 1.6; }
    .stare-clash { position: absolute; left: 50%; top: 40%; width: 34px; height: 34px; margin: -17px 0 0 -17px; z-index: 3; opacity: 0; background: radial-gradient(circle, #fff 0 18%, rgba(245,215,122,.9) 30%, transparent 68%); clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); pointer-events: none; }
    .stare-arena.is-on .stare-clash { opacity: 1; animation: mb-stare-clash .3s linear infinite; }
    @keyframes mb-stare-clash { 50% { transform: scale(1.5) rotate(45deg); } }
    .stare-meter { position: relative; width: 20px; background: rgba(0,0,0,.6); border: 1px solid var(--line); }
    .stare-meter.is-mimi { justify-self: end; } .stare-meter.is-opp { justify-self: start; }
    .stare-meter .fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; }
    .stare-meter.is-mimi .fill { background: linear-gradient(0deg, var(--pink), var(--red-hi)); }
    .stare-meter.is-opp .fill { background: linear-gradient(0deg, #8a5a1e, var(--gold-hi)); }
    .stare-meter.is-hot { border-color: var(--red-hi); animation: mb-stare-hot .3s steps(2) infinite; }
    @keyframes mb-stare-hot { 50% { box-shadow: 0 0 14px rgba(200,37,58,.85); } }
    .stare-meter.is-beat { box-shadow: 0 0 10px rgba(227,164,164,.75); }
    .stare-meter .lbl { position: absolute; left: 0; right: 0; bottom: 6px; width: 1em; word-break: break-all; text-align: center; margin: 0 auto; font-size: 14px; font-weight: 900; letter-spacing: 0; color: #fff; text-shadow: 0 0 3px #000, 0 0 3px #000; z-index: 1; line-height: 1.25; }
    .stare-meter .tick { position: absolute; left: -4px; right: -4px; height: 2px; margin-bottom: -1px; background: rgba(244,228,189,.75); z-index: 2; }
    .stare-meter .tick b { position: absolute; left: calc(100% + 1px); top: -8px; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 16px; color: var(--dim); }
    .stare-meter .tick.is-got { background: var(--gold-hi); box-shadow: 0 0 8px var(--gold-hi); } .stare-meter .tick.is-got b { color: var(--gold-hi); }
    .stare-meter .pct { position: absolute; left: 50%; top: -20px; transform: translateX(-50%); font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 16px; color: var(--text); white-space: nowrap; }
    .stare-duel { padding-top: 20px; }
    /* 手がかりのポップ：白い丸い吹き出しをやめ、黒檀の札（core.css の .mb-ebony が面・線・書体を持つ。要素に mb-ebony、見出しに mb-label を付けている） */
    .stare-pop { position: absolute; z-index: 4; right: 12px; bottom: 12px; max-width: min(62%, 340px); padding: 7px 12px 8px; font-size: 14px; line-height: 1.45; }
    .stare-pop::before { content: none; }
    .stare-pop small { display: block; letter-spacing: .12em; font-size: 14px; line-height: 1.1; }
    .stare-burst { position: absolute; z-index: 4; right: 16%; top: 6%; font-family: var(--disp); font-size: clamp(34px, 5vw, 50px); line-height: 1; color: var(--gold-hi); text-shadow: 0 3px 0 rgba(0,0,0,.5), 0 0 18px rgba(245,215,122,.9); transform: rotate(-8deg); pointer-events: none; animation: mb-stare-burst .9s ease forwards; }
    .stare-burst small { display: block; font-size: .45em; letter-spacing: .2em; color: var(--gold-pale); }
    @keyframes mb-stare-burst { 0% { opacity: 0; transform: rotate(-8deg) scale(2.2); } 18% { opacity: 1; transform: rotate(-8deg) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: rotate(-8deg) translateY(-10px); } }
    .stare-doki { position: absolute; z-index: 4; left: 10px; top: 8px; font-weight: 900; font-size: 18px; color: var(--pink); text-shadow: 0 2px 0 #000, 0 0 10px rgba(200,37,58,.9); transform: rotate(-10deg); pointer-events: none; animation: mb-stare-burst .7s ease forwards; }
    .stare-banner { position: absolute; z-index: 5; left: -4%; right: -4%; top: 70%; padding: 8px 6%; text-align: center; transform: skewY(-4deg); background: linear-gradient(90deg, #5a0b19, var(--red) 45%, #5a0b19); border-block: 3px solid var(--gold-hi); font-family: var(--mincho); font-weight: 800; font-size: clamp(17px, 3vw, 28px); line-height: 1.25; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,.45); animation: mb-stare-ban .4s cubic-bezier(.2,1.3,.3,1) both; }
    .stare-banner small { display: block; font-family: var(--sans); font-weight: 700; font-size: 14px; color: var(--gold-pale); letter-spacing: .04em; }
    .stare-banner.is-win { background: linear-gradient(90deg, #6b4a0a, #e8c46a 45%, #6b4a0a); color: #1d080e; text-shadow: none; }
    .stare-banner.is-win small { color: #2b1a10; }
    .stare-banner.is-stop { background: linear-gradient(90deg, #1a060c, #3a0c18 45%, #1a060c); }
    @keyframes mb-stare-ban { from { transform: skewY(-4deg) translateX(-110%); } }
    .stare-ctrl { display: flex; justify-content: center; }
    .stare-hold { position: relative; border: 0; cursor: pointer; width: min(440px, 100%); min-height: 80px; padding: 10px 20px; color: #f0d08a; background: transparent; isolation: isolate; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    /* 長押しの札：押せる物なので斜めをやめ、四角（角 2px・金の線）に。面は深紅 */
    .stare-hold::before { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 2px; background: linear-gradient(180deg, var(--crimson), var(--crimson-lo)); border: 1px solid var(--gold); box-shadow: 0 8px 20px rgba(0,0,0,.5); transition: transform .1s, border-color .15s; }
    .stare-hold:hover::before { border-color: var(--gold-hi); box-shadow: inset 0 0 0 1px rgba(227,185,100,.25), 0 8px 20px rgba(0,0,0,.5); }
    .stare-hold span { display: block; font-family: var(--mincho); font-weight: 800; font-size: 26px; letter-spacing: .14em; line-height: 1.2; }
    .stare-hold small { display: block; font-size: 14px; font-weight: 700; color: #dcc7a2; }
    .stare-hold.is-nudge::before { animation: mb-stare-nudge 1.1s ease-in-out infinite; }
    @keyframes mb-stare-nudge { 50% { box-shadow: 0 0 0 3px rgba(239,205,130,.3), 0 0 26px rgba(239,205,130,.65); } }
    .stare-hold.is-hint::before { animation: mb-stare-nudge .6s ease-in-out infinite; border-color: var(--gold-pale); }
    .stare-hold.is-on::before { background: linear-gradient(180deg, #a8182a, var(--crimson)); border-color: var(--gold-hi); box-shadow: 0 0 30px rgba(200,37,58,.85); transform: scale(.98); }
    .stare-hold:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 4px; }
    .stare-ask { font-family: var(--mincho); font-weight: 800; font-size: 17px; text-align: center; margin: 0 0 8px; }
    .stare-clues { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    /* 手がかりの札：出る前は暗い札に破線の枠、開いたら羊皮紙（JS が mb-parchment is-flat を付ける。墨・見出し・注記の色は core.css が持つ）。
       出なかった札（is-lost）は opacity で薄めず、暗い型の色で読めるまま。答え合わせの縁は mb-win（金の二重線）／mb-lose（灰の一重線） */
    .stare-clue { position: relative; padding: 7px 12px 9px; border: 1px dashed var(--line); background: var(--panel); color: var(--dim); font-size: 14px; line-height: 1.5; }
    .stare-clue .h { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; letter-spacing: .12em; font-size: 15px; line-height: 1.2; }
    .stare-clue .h em { font-style: normal; font-size: 14px; font-weight: 700; letter-spacing: 0; }
    .stare-clue .t { font-weight: 800; margin-top: 3px; }
    .stare-clue:not(.is-open) .t { font-weight: 500; color: var(--dim); }
    
    .stare-clue.is-open { animation: mb-pop .35s cubic-bezier(.2,1.6,.4,1); }
    .stare-clue.is-lost { background: var(--off-bg); border-color: var(--off-line); color: var(--dim); }
    .stare-clue.is-lost .h, .stare-clue.is-lost .h em, .stare-clue.is-lost .t { color: var(--dim); }
    /* 読みの札：塗りの四角バッジをやめ、字と下線だけ（羊皮紙の上で読める濃い色。ブラフ＝深紅／強い手＝墨／演技＝茶の点線／本当＝金茶の二重線／外れ＝灰茶の破線） */
    .stare-chip { display: inline-block; margin: 5px 6px 0 0; padding: 1px 2px; font-family: var(--mincho); font-size: 14px; font-weight: 800; letter-spacing: .04em; line-height: 1.6; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .stare-chip.bluff { color: var(--crimson); } .stare-chip.strong { color: var(--parch-ink); } .stare-chip.act { color: #7a4a14; text-decoration-style: dotted; }
    .stare-chip.ok { color: #6b4306; text-decoration-style: double; text-decoration-thickness: 3px; } .stare-chip.ng { color: #5a4a36; text-decoration-style: dashed; }
    .stare-hand-name { font-family: var(--mincho); font-size: 14px; font-weight: 800; color: var(--gold-hi); margin-left: 6px; white-space: nowrap; }
    .stare-herbox { position: relative; display: inline-flex; }
    .stare-herbox .mb-threat.ov { position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); z-index: 2; }
    .stare-hand-name.is-threat { color: #ff9aa6; text-shadow: 0 0 6px rgba(200,37,58,.6); }
    .stare-who { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 12px; }
    .st-frag { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mincho); font-weight: 700; font-size: 14px; color: var(--gold-hi); white-space: nowrap; }
    .st-frag em { font-style: normal; padding: 0 7px; line-height: 1.6; background: rgba(19,4,6,.8); border: 1px solid var(--gold); }
    .st-frag .pips { display: inline-flex; gap: 3px; }
    .st-frag .pips i { width: 10px; height: 10px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: var(--line-dim); }
    .st-frag .pips i.on { background: var(--gold-hi); }
    .st-gg { display: flex; flex-wrap: wrap; gap: 2px 12px; margin-top: 2px; }
    .stare-hands { flex-wrap: wrap; justify-content: center; row-gap: 4px; }

    /* これまでの記録：大きく賭けた20回を札の点で（ブラフ＝赤、本物＝金）。赤が多い子は、よくブラフをする */
    .st-record { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    .st-rec-h { white-space: nowrap; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); }
    .st-rec-dots { display: grid; grid-template-columns: repeat(20, 3px); gap: 1px; }
    .st-rec-dots i { width: 3px; height: 12px; border-radius: 0; }
    .st-rec-dots i.b { background: linear-gradient(180deg, #e0485c, #8a1424); box-shadow: inset 0 0 0 1px rgba(255,200,205,.35); }
    .st-rec-dots i.s { background: linear-gradient(180deg, var(--gold-hi), #8a5a1e); }
    .st-rec-sum { white-space: nowrap; display: flex; gap: 6px; font-family: var(--mincho); font-size: 14px; line-height: 1.3; }
    .st-rec-sum .b { color: #ff8f9c; } .st-rec-sum .s { color: var(--gold-hi); }
    /* 見込みの天秤 */
    .st-scale { display: flex; flex-direction: column; gap: 2px; padding: 2px 8px 4px; background: var(--panel); border: 1px solid var(--line); }
    .st-scale-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0 8px; }
    .st-svg { width: 100%; max-height: 92px; display: block; overflow: visible; }
    .st-svg .post { fill: #6b4a1e; stroke: var(--gold); stroke-width: 1.5; }
    .st-svg .beam rect { fill: var(--gold); } .st-svg .beam circle { fill: var(--gold-hi); stroke: #3a2208; }
    .st-svg .beam { transition: transform .7s cubic-bezier(.3,1.4,.5,1); }
    .st-svg .pan { transition: transform .7s cubic-bezier(.3,1.4,.5,1); }
    .st-svg .str { stroke: var(--gold); stroke-width: 1; fill: none; }
    .st-svg .dish { fill: #3a2208; stroke: var(--gold-hi); stroke-width: 1.2; }
    .st-svg text { font-family: var(--mincho); font-weight: 800; font-size: 15px; text-anchor: middle; }
    .st-odds small { font-size: 14px; line-height: 1.2; color: var(--dim); white-space: nowrap; }
    .stare-clue .h { flex-wrap: nowrap; white-space: nowrap; }
    .rb-info .stare-hand-name { white-space: nowrap; }
    .st-svg .is-b text { fill: #ff8f9c; } .st-svg .is-s text { fill: var(--gold-hi); }
    .st-svg rect.rec { fill: #b0202f; stroke: #ffb3bc; stroke-width: .6; }
    .st-svg .is-s rect.rec { fill: var(--gold); }
    .st-svg rect.clue { fill: #f4e4bd; stroke: #6b4306; stroke-width: .6; }
    .st-odds { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 92px; }
    .st-odds .lbl { font-size: var(--ty-note, 14px); color: var(--dim); font-family: var(--mincho); font-weight: 700; margin-right: 4px; }
    .st-odds b { font-family: var(--mincho); font-weight: 800; font-size: 17px; line-height: 1.1; white-space: nowrap; }
    .st-odds b.b { color: #ff8f9c; } .st-odds b.s { color: var(--gold-hi); }
    .st-odds .bar { position: relative; display: block; width: 92px; height: 7px; background: #0d0405; border: 1px solid var(--line-dim); }
    .st-odds .bar u { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-hi)); transition: width .6s; }
    .st-odds .bar s { display: none; position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: #fff3c2; }
    .st-scale.is-wager .st-odds .bar s { display: block; }
    /* 手がかりの札の見出し：番号・確かさ（◆）・そこで止めた時のご褒美 */
    .stare-clue .h { display: flex; gap: 4px 10px; align-items: center; justify-content: flex-start; }
    .st-sure { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; letter-spacing: 0; }
    .st-lean { margin-left: auto; font-size: 14px; letter-spacing: 0; } .st-lean .stare-chip { margin: 0; }
    .st-pips { display: inline-flex; gap: 2px; }
    .st-pips i { width: 9px; height: 9px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); background: var(--line-dim); }
    .st-pips i.on { background: var(--gold-hi); }
    .mb-parchment .st-pips i.on { background: #8a5a1e; } .mb-parchment .st-pips i { background: #cbb98f; }
    /* ミミの緊張：次の線に届く頃までに上がりそうな分を、薄い帯で重ねる（金＝もちそう／琥珀＝ぎりぎり／赤＝もたなそう） */
    .stare-meter .proj { position: absolute; left: 0; right: 0; bottom: 0; height: 0; z-index: 1; background: repeating-linear-gradient(135deg, rgba(239,205,130,.55) 0 3px, rgba(239,205,130,.15) 3px 6px); border-top: 2px solid var(--gold-hi); }
    .stare-meter .proj.warn { background: repeating-linear-gradient(135deg, rgba(240,160,60,.6) 0 3px, rgba(240,160,60,.15) 3px 6px); border-top-color: #f0a03c; }
    .stare-meter .proj.ng { background: repeating-linear-gradient(135deg, rgba(200,37,58,.7) 0 3px, rgba(200,37,58,.2) 3px 6px); border-top-color: var(--red-hi); animation: mb-stare-hot .5s steps(2) infinite; }

    .stare-meter.is-mimi { z-index: 6; }
    .st-verdict { position: absolute; z-index: 6; left: calc(100% + 9px); bottom: 0; transform: translateY(50%); display: flex; flex-direction: column; padding: 3px 9px 4px; white-space: nowrap; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold-pale); background: rgba(19,4,6,.94); border: 1px solid var(--gold-hi); border-left-width: 4px; pointer-events: none; transition: bottom .25s; }
    .st-verdict::before { content: ""; position: absolute; left: -11px; top: 50%; margin-top: -6px; border: 6px solid transparent; border-right-color: var(--gold-hi); border-left-width: 0; }
    .st-verdict.warn { border-color: #f0a03c; } .st-verdict.warn::before { border-right-color: #f0a03c; }
    .st-verdict b { font-weight: 800; font-size: 14px; color: var(--gold-hi); }
    .st-verdict.warn b { color: #f0a03c; } .st-verdict.ng { border-color: var(--red-hi); } .st-verdict.ng::before { border-right-color: var(--red-hi); } .st-verdict.ng b { color: #ff8f9c; }
    .st-verdict.is-off { display: none; }
    .stare-clue .t:empty { display: none; }

    /* 選ぶ所：左に「もう一度 見つめる」（10個の印＝こらえる回数）、右に「ここでやめる」 */
    .st-choice { display: flex; gap: 8px; width: 100%; align-items: stretch; }
    .st-choice .st-go { flex: 1.7 1 0; width: auto; min-height: 0; padding: 6px 10px 7px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .st-choice .st-go > span:first-child { font-size: 20px; letter-spacing: .1em; }
    .st-choice .st-go small { font-size: 14px; line-height: 1.3; color: var(--gold-pale); }
    .st-choice .st-go small b { font-weight: 800; margin-right: 4px; }
    .st-choice .st-go small.ok b { color: var(--gold-hi); } .st-choice .st-go small.ng b { color: #ff8f9c; }
    .st-choice .st-stop { flex: 1 1 0; min-width: 0; }
    .st-choice button:disabled { opacity: .55; }
    .st-odds10 { display: grid !important; grid-template-columns: repeat(10, 12px); gap: 3px; }
    .st-odds10 i { height: 14px; border-radius: 1px; }
    .st-odds10 i.ok { background: linear-gradient(180deg, var(--gold-hi), #8a5a1e); }
    .st-odds10 i.ng { background: linear-gradient(180deg, #e0485c, #8a1424); }

    /* 骨組み（.rb-frame）の中の並べ方：遊びの絵は真ん中の高さいっぱい、材料は右の枠に上から */
    .rb-play.stare-duel { display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; gap: 8px; padding: 0; height: 100%; min-height: 0; }
    .rb-play .stare-arena { height: 100%; min-height: 0; }
    .rb-info { overflow-x: hidden; }
    .st-sit-cap { font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note, 14px); color: var(--gold); white-space: nowrap; }
    .st-sit-row { gap: 3px; flex-wrap: nowrap; }
    .st-sit-sep { display: block; width: 1px; align-self: stretch; margin: 2px 5px; background: var(--line); }
    .rb-info .stare-sit { align-items: flex-start; gap: 4px; }
    .rb-info .stare-grp { flex-wrap: nowrap; gap: 3px; }
    .rb-info .stare-tag { white-space: nowrap; font-family: var(--mincho); font-weight: 700; font-size: 14px; letter-spacing: .06em; margin-right: 2px; }
    .rb-info .stare-hand-name { font-size: 14px; margin-left: 4px; }
    .rb-info .stare-clues { grid-template-columns: minmax(0, 1fr); gap: 4px; }
    .rb-act .st-choice { height: 100%; }
    .rb-act > div > .actions { display: flex; gap: 12px; justify-content: center; }
    @media (max-width: 560px) {
      .stare-duel { grid-template-columns: 24px minmax(0, 1fr) 24px; gap: 6px; }
      .stare-meter { width: 16px; } .stare-meter .lbl { line-height: 16px; font-size: 14px; letter-spacing: .1em; }
      .stare-meter .tick b { font-size: 14px; }
      .stare-clues { grid-template-columns: 1fr; gap: 8px; }
      .stare-pop { font-size: 14px; max-width: 68%; right: 8px; bottom: 8px; padding: 6px 10px 7px; }
      .stare-hold span { font-size: 23px; }
      .stare-cards { gap: 6px 10px; }
    }
  `;

  async function start({ api }) {
    const who = CH[api.charId] ? api.charId : 'polka';
    const ch = CH[who];
    const jp = api.char.jp;
    // 卓の本当の手（本編）か、架空の場面（単独ページ）か
    const T = api.table;
    // ブラフの多さの記録（本編はセーブに残る本当の記録、無ければ性格の値から作る）。天秤の最初の重りはこの割合
    const record = [...recordOf(ch.prior), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    const prior = Math.min(.9, Math.max(.1, record.filter(Boolean).length / record.length));
    let truth = Math.random() < ch.prior ? 'bluff' : 'strong';

    // 札：ミミは Q のワンペア（ブラフには勝ち、強い手には負け）
    let X = api.pick(api.SUITS); const o = api.SUITS.filter(s => s !== X);
    let board = [{ r: 12, s: X }, { r: 8, s: X }, { r: 3, s: X }, { r: 10, s: o[0] }, { r: 2, s: o[1] }];
    let mine = [{ r: 12, s: o[1] }, { r: 14, s: o[2] }];
    let her, mimiEq;
    if (T) {
      // 本物＝読んだ時点でミミより強い手（ミミが勝つ見込みが半分未満）、ブラフ＝ミミの方が強い
      board = T.board; mine = T.mine; her = T.her;
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
      truth = mimiEq >= 50 ? 'bluff' : 'strong';
      const cnt = {}; board.forEach(c => { cnt[c.s] = (cnt[c.s] || 0) + 1; }); X = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || X;
    } else {
      her = dealHer(api, truth, X, board, mine);
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    }
    const mimiHandName = api.CAT_NAME[api.category([...mine, ...board])];

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

    api.css('stare', CSS);
    api.say(ch.open, ch.openE); api.bet(500);
    const root = api.root;
    const pct = (a) => Math.round(a * 100);
    // 見込みの天秤：左の皿＝ブラフ、右の皿＝強い手。最初は「これまでの記録」の重り1つ、手がかりが出るたびに重りが1つずつ乗る。
    // 重りの大きさは、その手がかりの確かさ（当たる率の対数オッズ）。傾きは今の見込み（ブラフの確率）から
    const W0 = Math.log(prior / (1 - prior));
    const scaleSVG = () => `<svg class="st-svg" viewBox="34 0 192 78" aria-hidden="true">
        <path class="post" d="M130 20 V68 M114 74 H146 L139 68 H121 Z"/>
        <g class="beam" id="mb-st-beam"><rect x="58" y="17" width="144" height="5" rx="1"/><circle cx="130" cy="19.5" r="5"/></g>
        ${['b', 's'].map(k => `<g class="pan is-${k}" id="mb-st-pan-${k}"><path class="str" d="M0 0 L-24 18 M0 0 L24 18"/><g class="wts" id="mb-st-w-${k}"></g><path class="dish" d="M-28 18 H28 Q21 27 0 27 Q-21 27 -28 18 Z"/><text x="0" y="42">${k === 'b' ? 'ブラフ' : '本物'}</text></g>`).join('')}
      </svg>`;
    const weights = [{ side: W0 >= 0 ? 'b' : 's', w: Math.abs(W0), rec: true }];
    const pBluff = () => { let o = prior / (1 - prior); clues.slice(0, stage).forEach(c => { o *= c.lean === 'bluff' ? c.acc / (1 - c.acc) : (1 - c.acc) / c.acc; }); return o / (1 + o); };
    const drawScale = () => {
      const pb = pBluff();
      const ang = -(pb - .5) * 2 * 18 * Math.PI / 180;   // 左（ブラフ）が下がるほど負
      const beam = root.querySelector('#mb-st-beam'); if (!beam) return;
      beam.setAttribute('transform', `rotate(${(ang * 180 / Math.PI).toFixed(2)} 130 19.5)`);
      [['b', -66], ['s', 66]].forEach(([k, dx]) => {
        const x = 130 + dx * Math.cos(ang), y = 19.5 + dx * Math.sin(ang);
        root.querySelector('#mb-st-pan-' + k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        const ws = weights.filter(w => w.side === k);
        let yy = 18;
        root.querySelector('#mb-st-w-' + k).innerHTML = ws.map(w => { const wd = Math.min(46, 14 + w.w * 11), h = 8; yy -= h + 1; return `<rect class="${w.rec ? 'rec' : 'clue'}" x="${(-wd / 2).toFixed(1)}" y="${yy}" width="${wd.toFixed(1)}" height="${h}" rx="1"/>`; }).join('');
      });
      const side = pb >= .5 ? 'ブラフ' : '本物', p = Math.round(Math.max(pb, 1 - pb) * 100);
      const odds = root.querySelector('#mb-stare-odds');
      if (odds) odds.innerHTML = `<b class="${pb >= .5 ? 'b' : 's'}"><small class="lbl">見込み</small>${side} ${p}%</b><small>${pb >= .5 ? 'ミミの勝ち' : 'ミミの負け'}の側</small>`;
      return pb;
    };
    const nB = record.filter(Boolean).length;
    root.classList.add('rb-frame');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-stare-steps">${api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 0)}</div></div>
      <div class="rb-play stare-duel">
        <div class="stare-meter is-mimi" id="mb-stare-m-mimi"><i class="fill"></i><span class="lbl">ミミの緊張</span></div>
        <div class="stare-arena" id="mb-stare-arena">
          <div class="stare-panel is-mimi" id="mb-stare-mimi"><img class="main" src="${api.MIMI.calm}" alt="ミミ"><img class="alt" src="${api.MIMI.shock}" alt=""></div>
          <div class="stare-panel is-opp" id="mb-stare-opp" style="--ox:${ch.ox}"><img class="main" src="${api.char.smug}" alt="${jp}"><img class="alt" src="${api.char.panic}" alt=""></div>
          <svg class="stare-spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true"><polyline class="b" id="mb-stare-bolt2" points="0,22 200,22"/><polyline id="mb-stare-bolt" points="0,22 200,22"/></svg>
          <i class="stare-clash"></i>
        </div>
        <div class="stare-meter is-opp" id="mb-stare-m-opp"><i class="fill"></i><span class="lbl">相手の動揺</span>
          ${TH.map((t, i) => `<i class="tick" style="bottom:${t}%"><b>${i + 1}</b></i>`).join('')}</div>
      </div>
      <div class="rb-info">
        <div class="stare-sit">
          <div class="st-sit-cap">場札 ／ ミミの手（${mimiHandName}）</div>
          <div class="stare-grp st-sit-row">${board.map(c => api.cardHTML(c, 'small' + (!T && c.s === X ? ' hot' : ''))).join('')}<i class="st-sit-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</div>
          <span class="stare-grp" id="mb-stare-her" hidden></span><span id="mb-stare-her-name" hidden></span>
        </div>
        <div class="st-scale"><div class="st-scale-top">${scaleSVG()}<div class="st-odds" id="mb-stare-odds"></div></div>
          <div class="st-record" aria-label="${jp}が大きく賭けた20回のうち、ブラフは${nB}回"><span class="st-rec-h">大きな賭け20回</span><span class="st-rec-dots">${record.map(b => `<i class="${b ? 'b' : 's'}"></i>`).join('')}</span><span class="st-rec-sum"><b class="b">ブラフ${nB}</b></span></div>
        </div>
        <div class="stare-clues" id="mb-stare-clues">${clues.map((c, i) => `
          <div class="stare-clue" data-i="${i}"><div class="h mb-label"><span>手がかり${i + 1}</span><span class="st-sure">確かさ${pips(sure(ch.acc[i]))}</span><span class="st-lean"></span></div></div>`).join('')}
        </div>
      </div>
      <div class="rb-act stare-ctrl" id="mb-stare-ctrl"></div>`;
    api.tipOnce('stare', `金が<b>5つ以上</b>なら見つめる。4つ以下なら、やめどき`);
    api.mission('もう一度見つめる？ ここでやめる？');

    const $ = (s) => root.querySelector(s);
    const arena = $('#mb-stare-arena'), mimiP = $('#mb-stare-mimi'), oppP = $('#mb-stare-opp');
    const mM = $('#mb-stare-m-mimi'), mO = $('#mb-stare-m-opp'), fM = mM.querySelector('.fill'), fO = mO.querySelector('.fill');
    const bolt = $('#mb-stare-bolt'), bolt2 = $('#mb-stare-bolt2');
    const ctrl0 = $('#mb-stare-ctrl');
    if (api.reduce) arena.classList.add('is-calm');

    let stage = 0, over = null;
    drawScale();
    // ミミの緊張の棒＝「次に見つめた時、目をそらしてしまう率」。相手の動揺の棒＝出た手がかりの数（線 1・2・3）
    const paint = () => {
      fM.style.height = (over === 'mimi' ? 100 : stage < 3 ? Math.round((1 - ch.hold[stage]) * 100) : 0) + '%';
      fO.style.height = (stage ? TH[stage - 1] : 0) + '%';
      mM.classList.toggle('is-hot', stage < 3 && ch.hold[stage] <= .6 && !over);
    };
    const drawBolt = () => {
      const amp = 8 + stage * 5;
      const line = (k) => { const p = []; for (let i = 0; i <= 10; i++) p.push(`${i * 20},${(22 + (i === 0 || i === 10 ? 0 : (Math.random() * 2 - 1) * amp * k)).toFixed(1)}`); return p.join(' '); };
      bolt.setAttribute('points', line(1)); bolt2.setAttribute('points', line(1.3));
    };
    const crack = (s) => {
      const c = clues[s];
      const box = root.querySelector(`.stare-clue[data-i="${s}"]`);
      box.classList.add('is-open', 'mb-parchment', 'is-flat');
      if (c.acted) box.querySelector('.st-sure').innerHTML = `確かさ${pips(sure(ACT_ACC))}`;
      box.querySelector('.st-lean').innerHTML = c.acted ? `<span class="stare-chip act">演技 → ${NAME[c.lean]}</span>` : `<span class="stare-chip ${c.surface}">→ ${NAME[c.surface]}</span>`;
      weights.push({ side: c.lean === 'bluff' ? 'b' : 's', w: Math.log(c.acc / (1 - c.acc)) });
      let pop = arena.querySelector('.stare-pop');
      if (!pop) { pop = document.createElement('div'); pop.className = 'stare-pop mb-ebony'; arena.appendChild(pop); }
      pop.innerHTML = `<small class="mb-label">手がかり${s + 1}</small>${c.text}`;
      mO.querySelectorAll('.tick')[s].classList.add('is-got');
      const b = document.createElement('div'); b.className = 'stare-burst'; b.innerHTML = `BREAK!<small>手がかり${s + 1}</small>`;
      arena.appendChild(b); setTimeout(() => b.remove(), 950);
      if (ch.alt[s]) oppP.classList.add('is-alt');
      oppP.classList.remove('is-crack'); void oppP.offsetWidth; oppP.classList.add('is-crack');
      if (s === 0) setTimeout(() => { if (stage < 2 && over !== 'opp') oppP.classList.remove('is-alt'); }, 700);
      api.say(ch.react[s], ch.emo[s]);
      api.sfx.good();
      const r = oppP.getBoundingClientRect(); api.sparkles(r.left + r.width * .55, r.top + r.height * .3, 12);
    };
    // 選ぶ所：「もう一度 見つめる」（ミミがこらえる回数を10個の印で）／「ここでやめる」
    const reward = (s) => 20 + s * 10;
    const half = (s) => Math.max(10, Math.round(reward(s) / 2));
    const drawChoice = () => {
      const n = Math.round(ch.hold[stage] * 10);
      ctrl0.innerHTML = `<div class="st-choice">
        <button class="stare-hold st-go" id="mb-stare-go" type="button"><span>もう一度 見つめる</span>
          <span class="st-odds10" aria-label="10回のうち、こらえる${n}回・目をそらす${10 - n}回">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'ok' : 'ng'}"></i>`).join('')}</span>
          <small class="ok"><b>金${n}</b> こらえる → 手がかり＋1・ご褒美${reward(stage + 1)}</small><small class="ng"><b>赤${10 - n}</b> 目をそらす → ご褒美${half(stage)}で終わり</small></button>
        <button class="btn quiet st-stop" id="mb-stare-stop" type="button">ここでやめる<small>ご褒美${reward(stage)}で読む</small></button>
      </div>`;
    };
    const look = () => new Promise(res => {
      ctrl0.querySelectorAll('button').forEach(b => { b.disabled = true; });
      arena.classList.add('is-on');
      const iv = setInterval(() => { if (!api.alive()) return clearInterval(iv); if (!api.reduce) drawBolt(); }, 70);
      let k = 0; const beat = setInterval(() => { if (!api.alive()) return clearInterval(beat); api.sfx.tick(); mM.classList.add('is-beat'); setTimeout(() => mM.classList.remove('is-beat'), 90); if (++k === 4 && Math.random() < .5) { const d = document.createElement('div'); d.className = 'stare-doki'; d.textContent = 'ドキッ！'; arena.appendChild(d); setTimeout(() => d.remove(), 720); } }, 260);
      mimiP.classList.add('is-alt');
      setTimeout(() => { clearInterval(iv); clearInterval(beat); arena.classList.remove('is-on'); mimiP.classList.remove('is-alt'); res(Math.random() < ch.hold[stage]); }, api.reduce ? 300 : 1500);
    });
    paint();
    await api.rules({
      key: 'stare', title: '見つめ合い',
      goal: T ? `${jp}の伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む。答え合わせはこの手の決着の後。当たればコイン` : `${jp}の伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む。当たればコイン`,
      how: `見つめるたびに${jp}が動揺して、顔や言葉に<em>手がかり</em>が出る（最大3つ）。出るたびに、ご褒美が増える`,
      risk: 'ミミも緊張する。ミミが先に目をそらすと、そこで終わり。ご褒美は半分',
      look: [['もう一度見つめるか', 'ボタンの金と赤の印（10回のうち、こらえる回数）'], ['本物かブラフか', '天秤（記録と手がかりの重さ）'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    while (!over) {
      drawChoice();
      const act = await new Promise(res => { $('#mb-stare-go').onclick = () => { api.sfx.tap(); res('go'); }; $('#mb-stare-stop').onclick = () => { api.sfx.tap(); res('stop'); }; });
      if (!api.alive()) return;
      if (act === 'stop') { over = 'stop'; break; }
      const ok = await look();
      if (!api.alive()) return;
      if (!ok) { over = 'mimi'; break; }
      crack(stage); stage++; drawScale(); paint();
      api.coach('');
      if (stage >= 3) { over = 'opp'; break; }
    }
    paint();
    ctrl0.innerHTML = '';

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
      banner.className = 'stare-banner is-stop'; banner.innerHTML = `ここで止めた<small>${stage ? `手がかりは${stage}つ` : '手がかりは、まだ何も出ていない'}</small>`;
      api.sfx.tap();
    }
    arena.appendChild(banner);
    clues.forEach((c, i) => { if (i >= stage) { const bx = root.querySelector(`.stare-clue[data-i="${i}"]`); bx.classList.add('is-lost'); bx.querySelector('.st-lean').textContent = '出なかった'; } });
    let base = 20 + stage * 10;
    if (over === 'mimi') base = Math.max(10, Math.round(base / 2));

    $('#mb-stare-steps').innerHTML = api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 1);
    api.mission('天秤が下がった方が、ありそうな手');
    const ctrl = $('#mb-stare-ctrl');
    ctrl.innerHTML = `<div><div class="actions">
      <button class="btn" id="mb-stare-call" type="button">ブラフと読む<small>ミミの方が強い</small></button>
      <button class="btn quiet" id="mb-stare-fold" type="button">本物と読む<small>ミミより強い</small></button></div></div>`;
    api.coach(stage ? '' : '手がかりなし。天秤は、これまでの記録だけで傾いている');
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
    const pNow = pBluff(), pMine = Math.round((decide === 'bluff' ? pNow : 1 - pNow) * 100);
    root.querySelector('.st-scale').classList.add('is-wager');
    api.mission('天秤の見込みで、自信を決める');
    await api.wager({ mission: '天秤の見込みで、自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超え→ぜったい　50%超え→確信', base, stakes: STAKES, into: ctrl });
    if (!api.alive()) return;

    // 本当の手の勝負：読みを預けて卓に戻る。答え合わせは手の決着の後（battles/games/verdict.js）
    if (T) {
      const best0 = pNow >= .5 ? 'bluff' : 'strong', pBest0 = Math.round(Math.max(pNow, 1 - pNow) * 100);
      const m = api.mult || 1, lose = base * STAKES[m - 1];
      api.say(decide === 'bluff' ? ch.react[Math.min(2, stage)] : ch.open, decide === 'bluff' ? 'panic' : 'smug');
      api.entrust({
        pick: NAME[decide], win: base * m, lose,
        advice: decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる',
        pending: {
          title: '見つめ合い', charId: api.charId, pick: decide, truth, mimiEq, endLines: ch.end, gloat: ch.gloat, board, mine, her, base, mult: m, stakes: STAKES,
          perfect: stage === 3 && m === 3,
          notes: clues.slice(0, stage).map((c, i) => ({ label: `手がかり${i + 1}「${c.text}」→ ${LEAN[c.lean]}`, lean: c.lean })),
          why: decide === best0 ? `天秤の見込みが高い方（${NAME[best0]} ${pBest0}%）を選んだ判断は正しい。` : `天秤の見込みは${NAME[best0]}が${pBest0}%だった。`,
        },
      });
      return;
    }

    // 答え合わせ：ためてから、相手の手札を1枚ずつめくる
    $('#mb-stare-steps').innerHTML = api.steps(['見つめ合う', '読む', '賭ける', '答え合わせ'], 3);
    root.querySelector('.stare-sit').scrollIntoView({ block: 'nearest', behavior: api.reduce ? 'auto' : 'smooth' });
    api.coach(''); api.sfx.drum();
    await api.wait(1000); if (!api.alive()) return;
    const herBox = $('#mb-stare-her'); herBox.hidden = false; $('#mb-stare-her-name').hidden = false;
    const thr = root.querySelector('.stare-herbox .mb-threat'); if (thr) thr.remove();
    $('#mb-stare-her-name').classList.remove('is-threat');
    herBox.innerHTML = api.cardHTML(her[0], 'small flip') + api.backHTML('small');
    api.sfx.tap();
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
      box.classList.add(good ? 'is-key' : 'is-trap', good ? 'mb-win' : 'mb-lose');
      box.insertAdjacentHTML('beforeend', c.acted ? (good ? `<span class="stare-chip ok">演技だった＝逆が本当</span>` : `<span class="stare-chip ng">裏の裏：顔のとおりだった</span>`)
        : good ? `<span class="stare-chip ok">本当だった</span>` : `<span class="stare-chip ng">外れの手がかり</span>`);
    });
    await api.wait(500); if (!api.alive()) return;

    // 判断の正しさ：ブラフ率と、出た手がかりの的中率から「見込み」を出して比べる（運で外れても、見込みどおりなら褒める）
    const correct = decide === truth;
    const got = clues.slice(0, stage);
    let odds = prior / (1 - prior);
    got.forEach(c => { odds *= c.lean === 'bluff' ? c.acc / (1 - c.acc) : (1 - c.acc) / c.acc; });
    const pb = odds / (1 + odds);
    const best = pb >= .5 ? 'bluff' : 'strong';
    const pBest = Math.round(Math.max(pb, 1 - pb) * 100);
    const handText = truth === 'bluff' ? '役なしのブラフ' : `${api.CAT_NAME[cat]}（本当に強い手）`;
    let why;
    if (correct) why = decide === best ? `見込みの高い方（${NAME[best]} ${pBest}%）を選んだ、正しい読み。` : `見込みは${NAME[best]}が${pBest}%だったが、勘が当たった。`;
    else why = decide === best ? `見込みの高い方（${NAME[best]} ${pBest}%）を選んだのは正しい判断。今回は運が悪かった。` : `ブラフ率と手がかりから見ると、${NAME[best]}の見込みが${pBest}%だった。`;
    api.say(ch.end[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')]);
    api.finish({
      correct, perfect: correct && stage === 3 && api.mult === 3, base,
      detail: `${jp}は${handText}だった。${why}`,
    });
  }

  MB.register({ id: 'stare', group: 'psych', order: 2, title: '見つめ合い', sub: '心理 · 度胸', isNew: true, chars: ['polka', 'selina', 'velvet'], start });
})();
