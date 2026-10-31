// 心理：ダウト！（早押し）
// ポルカのおしゃべり5つを、制限時間内に「本音」「ウソ」へ振り分ける（左右のボタン、または ←→）。
// 規則はひとつ「ポルカは、ウソの時ほど声が大きい」。ただし 1〜4つ目のうち1つくらいは例外（ひっかけ）。
// 5つ目は「今の賭け」の台詞。その本音／ウソが、そのままポルカの手がブラフかどうかの答えになる。
// 2026-10-27 本当の手の版：1〜4つ目はその場で○×（今日の癖の確かめ・当てた数だけご褒美）。5つ目の振り分けが天秤の重り（確かさ◆◆＝85%）。読みを預けて卓に戻り、答え合わせは手の決着の後。
(() => {
  const LIMIT = [3200, 2950, 2700, 2450, 2200];
  const POOL = {
    // 規則どおりのウソ：「！」が多い・語尾がのびる・（棒）・やたら自信満々
    lie: [
      'ボク、ポーカーで負けたこと、一回もないもーん！！',
      '今日のボク、ぜーんぜん緊張してないしー！！',
      'ミミちゃんの手、ぜーんぶ見えてるんだからね！！',
      '昨日も大勝ちしたよー！ ほんとだよー！！',
      'チップ、まだまだいーっぱいあるし！ 余裕だし！',
      'わーい、すっごく楽しいなー（棒）',
      'ボク、ウソなんて絶対つけないタイプだからー！！',
      'このテーブル、ボクの庭みたいなもんだしー！！',
      'ミミちゃんなんて、ぜーんぜん怖くないもーん！！',
      'お腹なんて、ぜーんぜん空いてないよー（棒）',
      'ボク、毎朝5時に起きてるんだー！ ほんとー！！',
      'リコ先輩より、ボクの方がずーっと強いし！！',
      'さっきの負け？ わざとだよー、わざと！！',
      'ボク、激辛だーいすきー！ 余裕ー！（棒）',
    ],
    // 規則どおりの本音：短い・「……」が多い
    honest: [
      '……ちょっと、眠い。',
      '……チップ、減ってきた。',
      '……ミミちゃんの耳、かわいい。',
      '……今の、ちょっと悔しかった。',
      '……お腹すいた。',
      '……リコ先輩、こわい。',
      '……ケーキは、いちご派。',
      '……さっきの、降りればよかった。',
      '……雨、やむかな。',
      '……この椅子、ちょっと高い。',
      '……計算、苦手。',
      '……この曲、好き。',
      '……昨日、あんまり寝てない。',
      '……負けず嫌いなんだ、ボク。',
    ],
    // 例外（ひっかけ）：元気な本音
    trapHonest: [
      'やったー！ 今日のケーキ、いちごだー！！',
      'あっ！ ミミちゃん、袖にクリームついてるよー！',
      'うわーっ、このジュース、すっごくおいしー！！',
      'ボク、このお店だーいすきー！！',
      'わーっ、今の風、気持ちいいー！！',
    ],
    // 例外（ひっかけ）：静かなウソ
    trapLie: [
      '……べつに、怒ってない。',
      '……ピーマン、平気。',
      '……さっきの負け、気にしてない。',
      '……ぜんぜん、痛くなかった。',
      '……おばけとか、信じてないし。',
    ],
    // 5つ目：今の賭けの話（ウソ＝ブラフ／本音＝本当に強い）
    betLie: [
      'この手、さいきょーだもん！！ 降りた方がいいよー！！',
      'ボクの手、ぜーったい勝てるやつだからー！（棒）',
      'フラッシュだよー！ たぶん！ いや、ぜったい！！',
      'コールしたら後悔するよー！？ ほんとだよー！！',
    ],
    betHonest: [
      '……この手、けっこういい。',
      '……今回は、降りた方がいいかも。',
      '……ごめんね。これ、いいの来てる。',
      '……コール、する？',
    ],
  };

  // 小さな効果音（押すたびに気持ちよく。音程は問題が進むほど上がる）
  let ac = null;
  function tone(freq, dur = .08, type = 'triangle', vol = .05, delay = 0) {
    const V = MB.vol; if (!V) return; vol *= V;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0); g.gain.setValueAtTime(vol, t0);
      o.connect(g); g.connect(ac.destination); o.start(t0);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.stop(t0 + dur + .02);
    } catch (e) {}
  }

  // ポルカの手札：強い手＝場のマークがそろうフラッシュ／ブラフ＝役なし（半分は「あと1枚でフラッシュ」の外れ）
  function dealHer(api, bluff, X, board) {
    const used = new Set(board.map(api.key));
    const free = api.deck().filter(c => !used.has(api.key(c)));
    const xs = free.filter(c => c.s === X), ns = free.filter(c => c.s !== X);
    const draw = Math.random() < .5;
    for (let k = 0; k < 600; k++) {
      const h = !bluff ? api.shuffle(xs).slice(0, 2) : draw ? [api.pick(xs), api.pick(ns)] : api.shuffle(ns).slice(0, 2);
      const cat = api.category([...h, ...board]);
      if (bluff ? cat === 0 : cat >= 5) return h.sort((a, b) => (b.s === X) - (a.s === X));
    }
    return !bluff ? xs.slice(0, 2) : [ns.find(c => c.r === 5), ns.find(c => c.r === 4)];
  }

  const CSS = `
    /* ---- 2026-10-27 本当の手の版の並び（共通の骨組み .rb-frame に載せる） ---- */
    .rb-frame > .doubt-area { height: auto; min-height: 0; }
    .rb-frame .doubt-bubble { width: min(60%, 520px); }
    .rb-frame .doubt-rule { width: min(64%, 540px); }
    .dx-sit { display: flex; flex-direction: column; gap: 2px; }
    .dx-sit-cap { font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .dx-sit-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .dx-sep { width: 8px; flex: 0 0 auto; }
    .dx-list { display: flex; flex-direction: column; gap: 3px; }
    .dx-four { display: flex; align-items: center; gap: 4px; padding: 2px 8px; min-height: 28px; background: var(--panel); border: 1px solid var(--line-dim); font-size: 14px; }
    .dx-four .q { font-family: var(--mincho); font-weight: 700; color: var(--dim); white-space: nowrap; margin-right: 2px; }
    .dx-chip { display: inline-flex; align-items: center; gap: 2px; padding: 0 5px; min-width: 2.6em; justify-content: center; border: 1px solid var(--line-dim); }
    .dx-chip .n { font-family: var(--disp); font-weight: 400; font-size: 15px; color: var(--gold); }
    .dx-chip .mark { position: relative; font-size: 17px; font-weight: 900; line-height: 1; min-width: 1em; text-align: center; }
    .dx-chip .mark.ok { color: var(--good); } .dx-chip .mark.ng { color: var(--bad); }
    .dx-chip.is-ok { border-color: var(--gold-hi); } .dx-chip.is-ng { border-color: #8a8073; }
    .dx-chip.is-trap { background: rgba(217,178,105,.25); }
    .dx-chip .tr { font-family: var(--mincho); font-weight: 800; font-size: 14px; color: var(--gold-hi); }
    .dx-read, .dx-read .actions { height: 100%; }
    .dx-read .actions { margin: 0; }
    .dx-row { display: grid; grid-template-columns: 18px auto minmax(0, 1fr); gap: 6px; align-items: center; padding: 1px 8px; min-height: 26px; background: var(--panel); border: 1px solid var(--line-dim); font-size: 14px; line-height: 1.3; }
    .dx-row .n { font-family: var(--disp); font-weight: 400; font-size: 17px; color: var(--gold); text-align: center; }
    .dx-row .q { font-family: var(--mincho); font-weight: 700; color: var(--dim); white-space: nowrap; }
    .dx-row .a { display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; color: var(--text); font-weight: 700; }
    .dx-row .dd { font-style: normal; padding: 0 5px; font-family: var(--mincho); font-weight: 800; background: rgba(19,4,6,.8); border: 1px solid var(--gold); color: var(--gold-pale); }
    .dx-row .dd.lie { border-color: var(--red-hi); color: #ff9aa6; }
    .dx-row .trap { color: #1d080e; background: var(--gold); font-family: var(--mincho); font-weight: 700; padding: 0 5px; }
    .dx-row .mark { position: relative; font-size: 20px; font-weight: 900; text-align: center; line-height: 1; }
    .dx-row .mark.ok { color: var(--good); } .dx-row .mark.ng { color: var(--bad); }
    .dx-row .mark.is-on { animation: mb-doubt-stamp2 .28s cubic-bezier(.2,1.8,.4,1); }
    .dx-row.is-bet { border-color: var(--gold); background: linear-gradient(90deg, var(--band), var(--panel)); }
    .dx-row.is-bet .q { color: var(--gold-hi); }
    .dx-row.is-ok { border-color: var(--gold-hi); } .dx-row.is-ng { border-color: #8a8073; }
    .rb-act .doubt-pad { width: 100%; height: 100%; max-width: none; }
    .rb-act .doubt-btn { min-height: 0; height: 100%; }
    .rb-act .doubt-btn.is-start { grid-column: 1 / -1; width: min(420px, 100%); }
    .rb-act .doubt-pad .actions { grid-column: 1 / -1; height: 100%; }

    .doubt-sit { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; justify-content: center; }
    .doubt-grp { display: flex; gap: 4px; align-items: center; }
    /* 名札・場所の名前：明朝の小さな金文字（英語は名札の POLKA だけ） */
    .doubt-tag { font-family: var(--mincho); font-weight: 700; letter-spacing: .12em; font-size: 14px; color: var(--gold); margin-right: 4px; line-height: 1; }
    .doubt-hand { font-family: var(--mincho); font-size: 14px; font-weight: 700; color: var(--gold-hi); margin-left: 6px; white-space: nowrap; }
    .doubt-hands { flex-wrap: wrap; justify-content: center; row-gap: 4px; }
    .doubt-area { position: relative; height: clamp(270px, 29vw, 300px); overflow: hidden; border: 1px solid var(--line); background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); user-select: none; -webkit-user-select: none; transition: height .3s ease; }
    .doubt-win { position: absolute; z-index: 1; right: 7%; top: 12px; bottom: 18px; width: min(34%, 300px); transform: skewX(-12deg); overflow: hidden; border: 3px solid var(--gold); background: linear-gradient(180deg, var(--band), var(--ebony-lo)); box-shadow: 0 10px 22px rgba(0,0,0,.6); transition: top .3s ease, bottom .3s ease, right .3s ease, width .3s ease; }
    .doubt-win::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,.3), transparent 35%); mix-blend-mode: soft-light; pointer-events: none; }
    .doubt-face { position: absolute; left: -14%; top: -6%; width: 128%; height: 112%; max-width: none; object-fit: cover; object-position: 50% 30%; transform: skewX(12deg); pointer-events: none; transition: opacity .08s; }
    .doubt-face.alt { opacity: 0; }
    .doubt-area.is-panic .doubt-face.alt { opacity: 1; } .doubt-area.is-panic .doubt-face.main { opacity: 0; }
    .doubt-area.is-twitch .doubt-win { animation: mb-doubt-twitch .3s ease; }
    @keyframes mb-doubt-twitch { 30% { transform: skewX(-12deg) translate(-8px, 3px); } 65% { transform: skewX(-12deg) translate(4px, -2px); } }
    .doubt-count { position: absolute; z-index: 3; left: 16px; top: 10px; display: flex; align-items: baseline; gap: 10px; }
    .doubt-count b { font-family: var(--disp); font-weight: 400; font-size: 30px; line-height: 1; color: var(--gold-hi); letter-spacing: .06em; }
    .doubt-count span { font-family: var(--mincho); font-size: 14px; font-weight: 700; letter-spacing: .06em; color: var(--gold-pale); background: rgba(19,4,6,.72); padding: 1px 8px; border-left: 3px solid var(--gold); }
    /* 台詞：黒檀の札（.mb-ebony）。白い丸い吹き出しと尻尾はやめた（面・線・影・書体は core.css の部品が描く） */
    .doubt-bubble { position: absolute; z-index: 2; left: 16px; top: 52%; width: min(58%, 540px); transform: translateY(-50%); padding: 16px 20px; font-size: clamp(18px, 2.3vw, 24px); line-height: 1.45; }
    .doubt-bubble.is-in { animation: mb-doubt-in .22s cubic-bezier(.2,1.5,.4,1); }
    @keyframes mb-doubt-in { from { transform: translateY(-50%) scale(.7); opacity: 0; } }
    .doubt-bubble.go-l { transition: transform .26s ease-in, opacity .26s; transform: translate(-120%, -50%) rotate(-10deg); opacity: 0; }
    .doubt-bubble.go-r { transition: transform .26s ease-in, opacity .26s; transform: translate(40%, -60%) rotate(10deg) scale(.8); opacity: 0; }
    .doubt-bubble.go-miss { transition: transform .3s ease-in, opacity .3s; transform: translate(0, 10%); opacity: 0; }
    /* 「最後 · 今の賭けの話」：赤い札をやめ、金の明朝の小さな見出し */
    .doubt-last { display: inline-block; margin-bottom: 4px; padding: 0 2px 1px; font-style: normal; font-family: var(--mincho); font-size: 14px; font-weight: 700; letter-spacing: .1em; color: var(--gold); border-bottom: 1px solid var(--line); }
    .doubt-text { display: block; }
    /* 押した答えの判子（ダウト！／本音？／見逃し…）。羊皮紙に墨：ウソ＝深紅、本音＝金茶、見逃し＝灰。正解かどうかはまだ見せない */
    .doubt-stamp { position: absolute; right: -6px; top: -20px; padding: 0 12px; font-family: var(--mincho); font-size: 24px; font-weight: 800; letter-spacing: .08em; line-height: 1.5; transform: rotate(9deg); border: 3px double; background: var(--parch); box-shadow: 0 4px 10px rgba(0,0,0,.5); opacity: 0; }
    .doubt-stamp.is-on { opacity: 1; animation: mb-doubt-stamp .2s cubic-bezier(.2,1.8,.4,1); }
    .doubt-stamp.lie { color: var(--crimson); border-color: var(--crimson); }
    .doubt-stamp.honest { color: #5e430b; border-color: var(--line); }
    .doubt-stamp.miss { color: #5a5248; border-color: #6e655a; background: #cfc3a6; }
    @keyframes mb-doubt-stamp { from { transform: rotate(9deg) scale(2.2); opacity: 0; } }
    .doubt-timer { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 9px; background: rgba(0,0,0,.65); }
    .doubt-timer i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, var(--red-hi), var(--gold-hi)); }
    .doubt-timer.is-low i { background: var(--red-hi); box-shadow: 0 0 10px var(--red-hi); }
    .doubt-big { position: absolute; z-index: 4; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-family: var(--disp); font-size: clamp(56px, 10vw, 96px); line-height: 1; color: var(--gold-hi); text-shadow: 0 4px 0 rgba(0,0,0,.5), 0 0 26px rgba(245,215,122,.8); pointer-events: none; animation: mb-pop .3s cubic-bezier(.2,1.6,.4,1); }
    /* ルールの札：黒檀に金茶の線。PC では小窓の枠（.mb-frame＝二重の金線＋四隅の金飾り）にする（start() が付ける。スマホ横は余白が狭く、金飾りが字に掛かるので付けない） */
    .doubt-rule { position: absolute; z-index: 2; left: 16px; top: 50%; transform: translateY(-50%); width: min(62%, 560px); padding: 12px 16px 14px; background: linear-gradient(180deg, var(--ebony-hi), var(--ebony-lo)); border: 1px solid var(--line); box-shadow: inset 0 0 0 1px rgba(227,185,100,.18), 0 10px 24px rgba(0,0,0,.55); }
    .doubt-rule > small { font-family: var(--mincho); font-weight: 700; letter-spacing: .3em; color: var(--gold); font-size: 14px; }
    .doubt-rule-main { font-family: var(--mincho); font-weight: 800; font-size: clamp(19px, 2.6vw, 26px); line-height: 1.35; }
    .doubt-rule-main b { color: var(--gold-hi); }
    .doubt-rule-main { display: flex; align-items: flex-end; gap: 10px; }
    .dv-end { font-family: var(--mincho); font-weight: 800; font-size: 15px; color: var(--gold-pale); padding-bottom: 2px; }
    .dv-end.lie { color: #ff9aa6; }
    .dv-bars { display: inline-flex; align-items: flex-end; gap: 4px; flex: 1 1 auto; max-width: 220px; }
    .dv-bars i { flex: 1 1 0; background: linear-gradient(180deg, var(--gold-hi), #8a1a22); }
    .dv-bars i:nth-child(1) { height: 6px; } .dv-bars i:nth-child(2) { height: 10px; } .dv-bars i:nth-child(3) { height: 14px; } .dv-bars i:nth-child(4) { height: 18px; } .dv-bars i:nth-child(5) { height: 22px; } .dv-bars i:nth-child(6) { height: 26px; }
    .doubt-row .sub .dd { font-style: normal; padding: 0 6px; font-family: var(--mincho); font-weight: 800; background: rgba(19,4,6,.8); border: 1px solid var(--gold); color: var(--gold-pale); }
    .doubt-row .sub .dd.lie { border-color: var(--red-hi); color: #ff9aa6; }
    .doubt-rule-ex { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 14px; font-weight: 800; }
    .doubt-rule-ex span { padding: 2px 10px; border-left: 3px solid var(--gold); }
    .doubt-rule-ex .is-lie { background: var(--band); border-left-color: var(--red-hi); color: var(--gold-pale); }
    .doubt-rule-ex .is-honest { background: rgba(217,178,105,.12); color: var(--gold-pale); }
    .doubt-rule-note { margin-top: 8px; font-size: 14px; color: var(--dim); }
    .doubt-pad { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: min(640px, 100%); margin: 0 auto; }
    /* 本音／ウソ／はじめる：四角い押す札（斜めは押せない物だけ）。ウソ＝深紅、本音＝黒檀、はじめる＝金 */
    .doubt-btn { position: relative; border: 0; cursor: pointer; min-height: 78px; padding: 8px 14px; color: #f0d08a; background: transparent; isolation: isolate; display: flex; align-items: center; justify-content: center; gap: 12px; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    .doubt-btn::before { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 2px; border: 1px solid var(--gold); box-shadow: 0 4px 12px rgba(0,0,0,.4); transition: transform .08s, filter .08s; }
    .doubt-btn.is-honest { color: var(--gold); }
    .doubt-btn.is-honest::before { background: var(--panel); border-color: var(--line); }
    .doubt-btn.is-lie::before { background: linear-gradient(180deg, var(--crimson), var(--crimson-lo)); }
    .doubt-btn.is-start { grid-column: 1 / -1; width: min(420px, 100%); justify-self: center; }
    .doubt-btn.is-start::before { background: linear-gradient(180deg, var(--gold-hi), var(--gold)); border-color: var(--crimson); }
    .doubt-btn.is-start { color: #1d080e; }
    .doubt-btn .w { display: flex; flex-direction: column; align-items: center; line-height: 1.15; }
    .doubt-btn .w span { font-family: var(--mincho); font-weight: 800; font-size: 27px; letter-spacing: .12em; }
    .doubt-btn .w small { font-size: 14px; font-weight: 700; color: #dcc7a2; }
    .doubt-btn.is-honest .w small { color: var(--dim); }
    .doubt-btn.is-start .w small { color: rgba(29,8,14,.78); }
    .doubt-btn kbd { font-family: var(--disp); font-size: 30px; line-height: 1; color: var(--gold-hi); }
    .doubt-btn:hover:not([disabled])::before { border-color: var(--gold-hi); }
    .doubt-btn.is-hit::before { filter: brightness(1.5); transform: scale(.96); }
    /* 光は別の層に描いておき、濃さだけを動かす（影を毎フレーム描き直すとスマホが熱くなる） */
    .doubt-pad.is-live .doubt-btn::after, .doubt-btn.is-start::after { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 2px; pointer-events: none; box-shadow: 0 0 0 1px rgba(239,205,130,.5), 0 0 22px rgba(239,205,130,.55); opacity: 0; animation: mb-doubt-glow 1.2s ease-in-out infinite; }
    @keyframes mb-doubt-glow { 50% { opacity: 1; } }
    .doubt-btn:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 4px; }
    .doubt-btn[disabled] { cursor: default; color: var(--off-text); }
    .doubt-btn[disabled]::before { background: var(--off-bg); border-color: var(--off-line); box-shadow: none; }
    .doubt-pad .wager { grid-column: 1 / -1; }
    .doubt-area.is-sum { height: 132px; }
    .doubt-area.is-sum .doubt-win { top: 8px; bottom: 8px; right: 6%; width: min(22%, 150px); }
    .doubt-tally { position: absolute; z-index: 2; left: 16px; top: 50%; transform: translateY(-50%); display: flex; align-items: baseline; gap: 10px; }
    .doubt-tally small { font-family: var(--mincho); font-weight: 700; letter-spacing: .08em; font-size: 14px; color: var(--gold); }
    .doubt-tally b { font-family: var(--disp); font-weight: 400; font-size: 64px; line-height: 1; color: var(--gold-hi); text-shadow: 0 0 18px rgba(239,205,130,.5); }
    .doubt-tally b.is-bump { animation: mb-pop .3s cubic-bezier(.2,1.6,.4,1); }
    .doubt-tally i { font-style: normal; font-family: var(--disp); font-size: 30px; color: var(--dim); }
    .doubt-list { display: grid; gap: 6px; }
    .doubt-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) 44px; gap: 8px; align-items: center; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line-dim); border-radius: 2px; }
    .doubt-row .n { font-family: var(--disp); font-size: 24px; line-height: 1; color: var(--gold); text-align: center; }
    .doubt-row .q { font-weight: 800; font-size: 14px; line-height: 1.45; }
    .doubt-row .sub { display: block; font-size: 14px; color: var(--dim); font-weight: 700; }
    .doubt-row .sub em { font-style: normal; color: var(--text); }
    /* 「例外！」の札：ピンクをやめ、金のタブ */
    .doubt-row .sub .trap { display: inline-block; white-space: nowrap; color: #1d080e; background: var(--gold); font-family: var(--mincho); font-weight: 700; letter-spacing: .06em; border-radius: 2px; padding: 0 6px; margin-left: 4px; }
    .doubt-row .mark { position: relative; font-size: 32px; font-weight: 900; text-align: center; line-height: 1; }
    .doubt-row .mark.ok { color: var(--good); } .doubt-row .mark.ng { color: var(--bad); }
    .doubt-row .mark.is-on { animation: mb-doubt-stamp2 .28s cubic-bezier(.2,1.8,.4,1); }
    @keyframes mb-doubt-stamp2 { from { transform: scale(2.4) rotate(-20deg); opacity: 0; } }
    /* ○×は本編の判子の絵（assets/ui/stamp_correct.webp・stamp_wrong.webp）を型抜きにして、金（当たり）・灰（外れ）で塗る。
       絵が読めた時だけ（.has-stamp：start() が確かめる）。読めなければ文字の ○× のまま */
    .doubt-list.has-stamp .mark.ok, .doubt-list.has-stamp .mark.ng { color: transparent; }
    .doubt-list.has-stamp .mark.ok::after, .doubt-list.has-stamp .mark.ng::after { content: ""; position: absolute; left: 50%; top: 50%; width: 1.25em; height: 1.25em; margin: -.625em 0 0 -.625em; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; -webkit-mask-size: contain; mask-size: contain; }
    .doubt-list.has-stamp .mark.ok::after { background: var(--good); }
    .doubt-list.has-stamp .mark.ng::after { background: var(--bad); }
    /* 答え合わせの縁：当たり＝金の二重線、外れ＝灰の一重線（緑・ピンクをやめた）。賭けの行は深紅から */
    .doubt-row.is-bet { border-color: var(--gold); background: linear-gradient(90deg, var(--band), var(--panel)); }
    .doubt-row.is-ok { border-color: var(--gold-hi); box-shadow: inset 0 0 0 2px #190608, inset 0 0 0 3px rgba(239,205,130,.5); }
    .doubt-row.is-ng { border-color: #8a8073; }
    @media (max-width: 560px) {
      .doubt-area { height: 300px; }
      .doubt-win { right: 9%; top: 12px; bottom: auto; height: 58%; width: 42%; }
      .doubt-bubble { left: 10px; right: 10px; width: auto; top: auto; bottom: 18px; transform: none; padding: 12px 14px; font-size: 18px; }
      .doubt-bubble.is-in { animation-name: mb-doubt-in-m; }
      @keyframes mb-doubt-in-m { from { transform: scale(.7); opacity: 0; } }
      .doubt-bubble.go-l { transform: translate(-120%, 0) rotate(-10deg); }
      .doubt-bubble.go-r { transform: translate(120%, 0) rotate(10deg); }
      .doubt-bubble.go-miss { transform: translate(0, 20%); }
      .doubt-rule { left: 10px; right: 10px; width: auto; top: auto; bottom: 12px; transform: none; padding: 10px 12px 12px; }
      .doubt-pad { gap: 12px; }
      .doubt-btn { min-height: 72px; gap: 8px; padding: 8px 10px; }
      .doubt-btn .w span { font-size: 23px; }
      .doubt-btn kbd { font-size: 24px; }
      .doubt-area.is-sum { height: 116px; }
      .doubt-area.is-sum .doubt-win { top: 8px; bottom: 8px; height: auto; right: 6%; width: 34%; }
      .doubt-tally b { font-size: 52px; }
      .doubt-row { grid-template-columns: 22px minmax(0, 1fr) 36px; padding: 6px 8px; gap: 6px; }
      .doubt-row .q { font-size: 14px; }
    }
  `;

  // 2026-10-27 卓の本当の手の版：前の4つは今日の癖の確かめ（その場で○×・当てた数だけご褒美）、5つ目（今の賭けの話）の振り分けが天秤の重りになる
  const STAKES = [0, 1, 3];
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  const RULE_ACC = .85;   // 5つ目の台詞が規則（ウソほど声が大きい）どおりに出る割合
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };
  const END = { bc: 'うわーん、バレてたー！', bw: 'えへへ、ブラフでしたー！', sc: '……うん、ほんとに強かったの', sw: '……だから言ったのに' };

  async function start({ api }) {
    const T = api.table;
    const record = [...recordOf(.65), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    // 札：卓の本当の手（本編）か、架空の場面（単独ページ）
    let board, mine, her, truth, mimiEq;
    if (T) {
      board = T.board; mine = T.mine; her = T.her;
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
      truth = mimiEq >= 50 ? 'bluff' : 'strong';
    } else {
      truth = Math.random() < .65 ? 'bluff' : 'strong';
      const X = api.pick(api.SUITS); const o = api.SUITS.filter(s => s !== X);
      board = [{ r: 12, s: X }, { r: 8, s: X }, { r: 3, s: X }, { r: 10, s: o[0] }, { r: 2, s: o[1] }];
      mine = [{ r: 12, s: o[1] }, { r: 14, s: o[2] }];
      her = dealHer(api, truth === 'bluff', X, board);
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    }
    const mimiHandName = api.CAT_NAME[api.category([...mine, ...board])];
    const P = Object.fromEntries(Object.entries(POOL).map(([k, v]) => [k, v.slice()]));
    const take = (a) => a.splice(api.rand(a.length), 1)[0];
    // 1〜4つ目：本音かウソかを裏で決める（全部同じにはしない）。例外は多くて1つ
    let kinds;
    do { kinds = [0, 1, 2, 3].map(() => Math.random() < .5); } while (kinds.every(k => k === kinds[0]));
    const trapAt = Math.random() < .75 ? api.rand(4) : -1;
    const lines = kinds.map((lie, i) => {
      const trap = i === trapAt;
      return { lie, trap, text: take(lie ? (trap ? P.trapLie : P.lie) : (trap ? P.trapHonest : P.honest)) };
    });
    // 5つ目：今の賭けの話。ブラフならウソ。声は規則どおりに 85% で出る（残りは逆の声＝静かなウソ・元気な本音）
    const betLie = truth === 'bluff';
    const ruleOk = Math.random() < RULE_ACC;
    const loud = ruleOk ? betLie : !betLie;
    lines.push({ lie: betLie, trap: !ruleOk, bet: true, text: take(loud ? P.betLie : P.betHonest) });
    // 顔：ウソなら焦り顔、本音なら得意顔が 65% で出る（規則ほど確かではない、おまけの手がかり）
    lines.forEach(l => { l.face = Math.random() < .65 ? (l.lie ? 'panic' : 'smug') : (l.lie ? 'smug' : 'panic'); });

    const stampUrl = (k) => 'url("' + api.asset('assets/ui/stamp_' + k + '.webp') + '")';
    const stampOk = {};
    ['correct', 'wrong'].forEach(k => { try { fetch(api.asset('assets/ui/stamp_' + k + '.webp')).then(r => { stampOk[k] = !!r.ok; }).catch(() => {}); } catch (e) {} });
    api.css('doubt', CSS + `
      .doubt-list.has-stamp .mark.ok::after { -webkit-mask-image: ${stampUrl('correct')}; mask-image: ${stampUrl('correct')}; }
      .doubt-list.has-stamp .mark.ng::after { -webkit-mask-image: ${stampUrl('wrong')}; mask-image: ${stampUrl('wrong')}; }
    `);
    api.say('ねえねえミミちゃん、聞いて聞いて！', 'smug'); api.bet(T ? (T.toCall || '—') : 300);
    const root = api.root;
    const bal = api.balance({ record, name: api.char.jp });
    const STEPS = ['聞き分ける', '読む', '賭ける', '答え合わせ'];
    root.classList.add('rb-frame');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-doubt-steps">${api.steps(STEPS, 0)}</div></div>
      <div class="rb-play doubt-area" id="mb-dx-area">
        <div class="doubt-win"><img class="doubt-face main" src="${api.asset('art/face/' + api.charId + '_smug.webp')}" alt="${api.char.jp}"><img class="doubt-face alt" src="${api.asset('art/face/' + api.charId + '_panic.webp')}" alt=""></div>
        <div class="doubt-rule" id="mb-doubt-rule"><small>ポルカの癖</small>
          <div class="doubt-rule-main" aria-label="声が大きいほどウソ"><span class="dv-end">本音</span><span class="dv-bars"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="dv-end lie">ウソ</span></div>
          <div class="doubt-rule-ex"><span class="is-honest">……　短い ＝ 本音</span><span class="is-lie">！！　のびる　（棒）＝ ウソ</span></div>
          <div class="doubt-rule-note">例外は、多くて1つ</div>
        </div>
      </div>
      <div class="rb-info">
        <div class="dx-sit"><div class="dx-sit-cap">場札 ／ ミミの手（${mimiHandName}）</div>
          <div class="dx-sit-row">${board.map(c => api.cardHTML(c, 'small')).join('')}<i class="dx-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</div></div>
        ${bal.html}
        <div class="doubt-list dx-list" id="mb-doubt-list"><div class="dx-four"><span class="q">前の4つ</span>${[0, 1, 2, 3].map(i => `<span class="dx-chip" data-i="${i}"><b class="n">${i + 1}</b><b class="mark"></b></span>`).join('')}</div>
          <div class="dx-row is-bet" data-i="4"><b class="n">5</b><span class="q">今の賭けの話</span><span class="a"></span></div></div>
      </div>
      <div class="rb-act" id="mb-doubt-act"><div class="doubt-pad" id="mb-doubt-pad"><button class="doubt-btn is-start" id="mb-doubt-start" type="button"><span class="w"><span>はじめる</span><small>本音は ← ／ ウソは →</small></span></button></div></div>`;
    bal.draw();
    const $ = (s) => root.querySelector(s);
    const area = $('#mb-dx-area'), pad = $('#mb-doubt-pad'), list = $('#mb-doubt-list');
    const setFace = (f, twitch = true) => {
      area.classList.toggle('is-panic', f === 'panic');
      if (twitch && !api.reduce) { area.classList.remove('is-twitch'); void area.offsetWidth; area.classList.add('is-twitch'); }
    };
    await api.rules({
      key: 'doubt', title: 'ダウト！',
      goal: `ポルカの伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む。答え合わせはこの手の決着の後`,
      how: 'おしゃべり5つを、時間内に「本音」か「ウソ」に振り分ける。<em>5つ目は今の賭けの話</em>（ウソならブラフ）',
      risk: '前の4つは、外すとご褒美が増えない。5つ目を逆に振り分けると、天秤が逆に傾く',
      look: [['本音かウソか', '声の大きさ（……短い＝本音／！！ のびる＝ウソ。例外は多くて1つ）'], ['本物かブラフか', '天秤'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    api.tipOnce('doubt', '声が大きいほどウソ', 'think');
    api.mission('おしゃべりを聞く');

    await new Promise(res => {
      const go = () => { document.removeEventListener('keydown', onK); res(); };
      const onK = (e) => { if (!api.alive()) return document.removeEventListener('keydown', onK); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      $('#mb-doubt-start').onclick = go;
      document.addEventListener('keydown', onK);
    });
    if (!api.alive()) return;
    tone(660, .06); tone(990, .08, 'triangle', .05, .06);
    $('#mb-doubt-rule').remove();
    api.coach('');
    for (const [w, ms] of [['READY', 520], ['GO!', 420]]) {
      const b = document.createElement('div'); b.className = 'doubt-big'; b.textContent = w; area.appendChild(b);
      tone(w === 'GO!' ? 1175 : 587, .12, 'square', .03);
      await api.wait(ms); b.remove(); if (!api.alive()) return;
    }

    api.mission('本音か、ウソか？');
    area.insertAdjacentHTML('beforeend', `<div class="doubt-count"><b id="mb-doubt-n">1/5</b><span>ウソほど声が大きい</span></div>
      <div class="doubt-bubble mb-ebony" id="mb-doubt-bubble"></div><div class="doubt-timer" id="mb-doubt-timer"><i></i></div>`);
    pad.innerHTML = `<button class="doubt-btn is-honest" data-a="honest" type="button"><kbd>←</kbd><span class="w"><span>本音</span><small>ほんとのこと</small></span></button>
      <button class="doubt-btn is-lie" data-a="lie" type="button"><span class="w"><span>ウソ</span><small>ダウト！</small></span><kbd>→</kbd></button>`;
    pad.classList.add('is-live');
    list.classList.toggle('has-stamp', !!(stampOk.correct && stampOk.wrong));
    const bubble = $('#mb-doubt-bubble'), timer = $('#mb-doubt-timer'), bar = timer.querySelector('i');
    let answer = null;
    const hit = (a) => {
      if (!answer) return;
      const b = pad.querySelector(`[data-a="${a}"]`);
      if (b) { b.classList.remove('is-hit'); void b.offsetWidth; b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 140); }
      answer(a);
    };
    pad.addEventListener('click', (e) => { const b = e.target.closest('.doubt-btn'); if (b && b.dataset.a) hit(b.dataset.a); });
    const onKey = (e) => {
      if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); hit('honest'); } else if (e.key === 'ArrowRight') { e.preventDefault(); hit('lie'); }
    };
    document.addEventListener('keydown', onKey);
    const YOU = { honest: '本音', lie: 'ウソ', miss: '聞き逃し' };
    const picks = [];
    let hits = 0, run = 0;
    for (let i = 0; i < 5; i++) {
      const l = lines[i];
      bubble.className = 'doubt-bubble mb-ebony';
      bubble.innerHTML = `${l.bet ? '<em class="doubt-last">最後 · 今の賭けの話</em>' : ''}<span class="doubt-text">${l.text}</span><b class="doubt-stamp"></b>`;
      void bubble.offsetWidth; bubble.classList.add('is-in');
      $('#mb-doubt-n').textContent = `${i + 1}/5`;
      setFace(l.face);
      api.say(l.bet ? 'で、今の賭けなんだけど……' : '……');
      tone(440 + i * 40, .05, 'sine', .03);
      bar.style.transition = 'none'; bar.style.width = '100%'; timer.classList.remove('is-low'); void bar.offsetWidth;
      bar.style.transition = `width ${LIMIT[i]}ms linear`; bar.style.width = '0%';
      const lowT = setTimeout(() => timer.classList.add('is-low'), LIMIT[i] * .65);
      const a = await new Promise(res => {
        let done = false;
        const fin = (v) => { if (done) return; done = true; clearTimeout(to); answer = null; res(v); };
        const to = setTimeout(() => fin('miss'), LIMIT[i]);
        answer = fin;
      });
      clearTimeout(lowT);
      if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      bar.style.transition = 'none'; bar.style.width = getComputedStyle(bar).width;
      picks.push(a);
      const st = bubble.querySelector('.doubt-stamp');
      st.textContent = a === 'lie' ? 'ダウト！' : a === 'honest' ? '本音？' : '聞き逃し…';
      st.className = 'doubt-stamp is-on ' + a;
      const up = 1 + i * .07;
      if (a === 'lie') { tone(392 * up, .06, 'square', .04); tone(784 * up, .12, 'square', .035, .05); }
      else if (a === 'honest') { tone(784 * up, .07); tone(1046 * up, .1, 'triangle', .05, .06); }
      else api.sfx.nope();
      const row = list.querySelector(`[data-i="${i}"]`);
      if (!l.bet) {
        // 前の4つ：その場で○×（今日の癖の確かめ）
        const ok = a === (l.lie ? 'lie' : 'honest');
        if (ok) { hits++; run++; tone(660 + run * 110, .09); }
        row.title = `${YOU[a]}と選んだ・答えは${l.lie ? 'ウソ' : '本音'}${l.trap ? '（例外）' : ''}`;
        if (l.trap) { row.classList.add('is-trap'); row.insertAdjacentHTML('beforeend', '<small class="tr">例外</small>'); }
        const m = row.querySelector('.mark'); m.textContent = ok ? '○' : '×'; m.className = 'mark is-on ' + (ok ? 'ok' : 'ng');
        row.classList.add(ok ? 'is-ok' : 'is-ng');
      } else {
        // 5つ目：答えはまだ見せない。振り分けが天秤の重りになる（ウソ→ブラフ寄り、本音→本物寄り）
        row.querySelector('.a').innerHTML = a === 'miss' ? '聞き逃した' : `<em class="dd ${a === 'lie' ? 'lie' : ''}">${YOU[a]}</em> ${api.lean(a === 'lie' ? 'bluff' : 'strong')} ${api.pips(api.sure(RULE_ACC))}`;
        if (a !== 'miss') bal.add(a === 'lie' ? 'bluff' : 'strong', RULE_ACC);
      }
      await api.wait(230); if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
      bubble.classList.add(a === 'lie' ? 'go-r' : a === 'honest' ? 'go-l' : 'go-miss');
      await api.wait(260); if (!api.alive()) { document.removeEventListener('keydown', onKey); return; }
    }
    document.removeEventListener('keydown', onKey);
    area.querySelector('.doubt-count').remove(); timer.remove();
    bubble.className = 'doubt-bubble mb-ebony is-in';
    bubble.innerHTML = '<span class="doubt-text">おしゃべり、おしまい！</span>';
    setFace('smug');
    api.say('ふふーん、どうだった？');
    pad.classList.remove('is-live');
    const base = 20 + hits * 10;

    // 読む
    $('#mb-doubt-steps').innerHTML = api.steps(STEPS, 1);
    api.mission('天秤の傾きで読む');
    const actEl = $('#mb-doubt-act');
    pad.hidden = true;
    actEl.insertAdjacentHTML('beforeend', `<div class="dx-read"><div class="actions">
      <button class="btn" id="mb-doubt-b" type="button">ブラフと読む<small>ミミの方が強い</small></button>
      <button class="btn quiet" id="mb-doubt-s" type="button">本物と読む<small>ミミより強い</small></button></div></div>`);
    api.coach(`前の4つは ${hits}/4。ご褒美のもと ${base}`);
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-doubt-b').onclick = on('bluff'); $('#mb-doubt-s').onclick = on('strong');
    });
    if (!api.alive()) return;
    actEl.querySelector('.dx-read').remove();
    $('#mb-doubt-steps').innerHTML = api.steps(STEPS, 2);
    const pNow = bal.p(), pMine = Math.round((decide === 'bluff' ? pNow : 1 - pNow) * 100);
    await api.wager({ mission: '見込みで自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超→ぜったい　50%超→確信', base, stakes: STAKES, into: actEl });
    if (!api.alive()) return;
    api.coach('');
    const best0 = pNow >= .5 ? 'bluff' : 'strong', pBest0 = Math.round(Math.max(pNow, 1 - pNow) * 100);
    const m = api.mult || 1;
    const p5 = picks[4], l5 = lines[4];
    const notes = p5 === 'miss' ? [] : [{ label: `5つ目「${l5.text}」を${YOU[p5]}と聞いた → ${p5 === 'lie' ? 'ブラフ' : '本物'}寄り`, lean: p5 === 'lie' ? 'bluff' : 'strong' }];
    const why = (decide === best0 ? `天秤の見込みが高い方（${NAME[best0]} ${pBest0}%）を選んだ判断は正しい。` : `天秤の見込みは${NAME[best0]}が${pBest0}%だった。`) + (l5.trap ? '5つ目は例外（規則と逆の声）だった。' : '');
    if (T) {
      api.entrust({
        pick: NAME[decide], win: base * m, lose: base * STAKES[m - 1],
        advice: decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる',
        pending: { title: 'ダウト！', charId: api.charId, pick: decide, truth, mimiEq, endLines: END, board, mine, her, base, mult: m, stakes: STAKES,
          perfect: hits === 4 && m === 3, notes, why, extra: `前の4つ ${hits}/4 → ご褒美のもと ${base}` },
      });
      return;
    }
    // 単独ページ：その場で答え合わせ
    api.lossK = STAKES;
    const correct = decide === truth;
    api.say(END[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')], correct ? 'busted' : 'smug');
    api.finish({ correct, perfect: correct && hits === 4 && m === 3, base,
      detail: `ポルカは${NAME[truth]}（${her.map(api.label).join(' ')}）だった。${why}` });
  }

  MB.register({ id: 'doubt', group: 'psych', order: 3, title: 'ダウト！', sub: '心理・早押し', isNew: true, chars: ['polka'], start });
})();
