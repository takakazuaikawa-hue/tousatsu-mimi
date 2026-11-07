# FABLE 講評：読み合い11種を劇場の型へ（2026-10-16）

## 総評
文字が小さい原因の9割は battles/core.css 末尾の zoom（.gc-mach .7／.ob-court .77／.hl-duel .8／.stare-duel .83／.sn-wrap .86）。遊び本体に使える高さは約597px（747 − 舞台の上下余白28 − 枠4 − 相手の行104 − 隙間10）あり、zoom をやめて「詰める・並べ替える」で全部入る。安っぽさは「白い吹き出し・ピンク・水色・緑・Bebas の英語見出し・斜めのピル」という旧アーケード語彙。.mb-host の変数を小窓の値に差し替えるだけで半分は消える。残りは吹き出し→「黒檀の札」、付箋→「羊皮紙＋金の鋲」、青い格子→「金の設計図の床」。

## 書き方の約束
- PC の寸法・文字サイズは `html:not(.is-compact) .mb-host …`（通常の CSS ファイルで。各遊びの js の api.css() は先頭の html を .mb-host に書き換えるので使えない）。read-compact.css は .stare-duel/.ob-court/.hl-duel/.sn-wrap に zoom:1、.gc-mach に zoom:.36 を自分で持っているので、core.css の zoom を消してもスマホ横は変わらない。
- 色・形（吹き出し→札、ピンク→金）は PC・スマホ共通にしたいので、各遊びの js 内 CSS 文字列を直接直す。
- 「一番中身が多い状態」：見抜く＝答え合わせ（手札3段＋付箋5枚に判定付き）、見つめ合う＝長押し中、ガチャ＝心の声3つ、つきつける＝証拠4枚＋信用ゼロの一行＋読みの2択、役づくり＝役の表を開いた所、ハイ＆ロー＝勝った後の「続ける？」、ねらい撃ち＝答え合わせ、当たり札＝スロット、容疑者＝決める、ダウト＝まとめ。

## 1. 遊びごと（PC 1280x800、文字11px以上／読む文13px以上、597px予算）
- 見抜く：答え合わせで差し込まれる相手の手札の行を、ミミの手札と同じ段に（2列グリッド）。`.dt-acts button { min-height:44px; padding:0 14px; font-size:14px }`、`.dt-verdict 13px`、`.dt-kind 14px 明朝 letter-spacing:.12em`。
- 見つめ合う：zoom .83 削除、`.stare-arena { height:256px }`、`.stare-hold { min-height:64px }`、`.stare-meter { width:24px } .stare-meter .lbl { writing-mode:vertical-rl; width:auto; font-size:12px; word-break:normal }`、`.tick b 12px`、`.stare-clue .h em 12px`。`.stare-pop` は黒檀の札に。
- ダウト：`.doubt-area { height:240px }`、`.doubt-count span 13px`、`.doubt-row .sub 13px`。`.doubt-bubble` は黒檀の札＋左に深紅の短冊、明朝 22px。`.doubt-stamp` は本編の判子 assets/ui/stamp_correct.webp / stamp_wrong.webp を流用。○× は金 #efcd82／灰 #b9b0a2。
- ガチャ：`.gc-mach { zoom:.8 }`（ここだけ zoom を残す）、`.gc-plate span 16px`、`.gc-face b 16px`、`.gc-book small 12px`、`.gc-meta 12px`、`.gc-orow small 12px`、`.gc-basebox 13px`、`.gc-ceil 13px`、`.gc-res-extra 13px`。`.gc-bub` は黒檀の札。
- つきつける：zoom .77 削除。`.ob-col { gap:8px }`、`.ob-ev { margin-top:8px; padding:14px 12px 8px }`、`.ob-log { line-height:20px }`、`.ob-say { padding:5px 12px 7px }`、`.ob-go { min-height:52px }`、`.ob-luck { width:auto }`（信用ゼロの一行を帯の同じ行に）。文字：`.ob-colhead 13px`、`.ob-tab em 12px`、`.ob-log .st 13px`、`.ob-note 13px`、`.ob-res-extra 13px`。
- 役づくり：`.hb-slot .hb-tag 12px`、`.hb-ref summary { font-size:13px; min-height:40px; padding:0 14px }`、`.hb-ref li 13px`、`li span 12px`、`.hb-arrow 12px`、`.hb-bname small 12px`。札を `--w:66px` に。
- ハイ＆ロー：zoom .8 削除。`.mb-game-root:has(> .hl-duel) { gap:8px }`、`.hl-rung small 12px`、`.hl-pot b 40px`、`.hl-pot small 12px`、`.hl-board { flex-direction:row; align-items:center; gap:12px }`、`.hl-cards .card.big { --w:54px }`、`.hl-chibi { height:56px; max-width:52px }`、`.hl-hand { padding:6px 8px 8px; gap:4px }`、`.hl-hn 14px`、`.hl-wait 13px`、`.hl-pick .btn { min-height:48px }`。LOST の絵の切れ：`.hl-react.right { right:8px; width:240px; height:200px } .hl-react img { left:auto; right:0; transform:none; max-width:100%; object-fit:contain }`。
- 危ない場札：`.dg-line span 13px`、札 `--w:68px`、`.dg-pill { font-size:14px; min-height:36px }`、ピルは黒檀の札に。
- ねらい撃ち：zoom .86 削除。はみ出しの正体は答え合わせの `.sn-out`。`.mb-game-root:has(> .sn-wrap) { gap:8px }`、`.sn-read b 34px`、`.sn-wrap { padding:20px 14px 24px 46px } .sn-chart { height:200px }`、`.sn-out { display:grid; grid-template-columns:auto auto; justify-content:center; gap:4px 24px }`、`.sn-cmp, .sn-verdict { grid-column:1 / -1 }`。文字：`.sn-floor 12px`、`.sn-axis-y 12px`、`.sn-read small 12px`、`.sn-me-name small 12px`、`.sn-cmp small 12px`。
- 当たり札：`.outs-count small 13px`、`.outs-line span 13px`、`.reel-wrap { height:96px }`、`.outs-bar { margin-top:14px }`。
- 容疑者：`.sp-tile span 13px`、`.sp-line span 13px`、`.sp-log .now 14px`。`.sp-tile::before { content:"SUSPECT" }` は消す。

## 2. 劇場の型
### .mb-host の変数
--gold:#d9b269; --gold-hi:#efcd82; --gold-pale:#f4e4bd; --red:#7a0e16; --red-hi:#c8253a（針・ウソ・×だけ）; --text:#ead9b8; --dim:#b19a74; --faint:rgba(217,178,105,.18); --good:#efcd82（緑をやめる）; --bad:#b9b0a2（ピンクをやめる）; --pink:#e3a4a4（残すならミミの色。緊張メーターと VS の枠だけ）; --mincho:"Shippori Mincho B1","Yu Mincho",serif。
--disp（Bebas）は 24px 以上の数字だけ。20px 以下の --disp（.zone-label .mb-opp-name .mb-coach-name .stare-tag .gc-who .ob-who .ob-tag .ob-colhead b .dt-kind .hl-rung small .sn-pot .sn-ylab .sn-xlab .hb-lv b .hl-round span）は `font-family:var(--mincho); font-size:12〜13px; letter-spacing:.12em; color:#d9b269`。

### 部品
- 舞台の枠：`.mb-stage { border:2px solid #8a5a1e; box-shadow: inset 0 0 0 5px #190608, inset 0 0 0 6px rgba(227,185,100,.55) }`、四隅は assets/ui/modal_corner_tl/tr/bl/br.webp を 56px で。結果の札・賭けの札は小窓の型（2px #8a5a1e＋二重線＋角飾り28px）。
- 押すもの（四角）：`.btn::before { content:none }`、`.btn { min-height:48px; border:1px solid #d9b269; border-radius:2px; background:linear-gradient(180deg,#7a0e16,#4e0509); color:#f0d08a; font:700 16px/1.3 var(--mincho); letter-spacing:.06em }`、`.btn.quiet { background:#1b0d0b; border-color:#8a5a1e; color:#d9b269 }`、`.btn.gold { background:linear-gradient(180deg,#efcd82,#d9b269); color:#1d080e; border-color:#7a0e16 }`、`.btn.ghost { background:transparent; border-color:#584027; color:#b19a74; min-height:40px }`、hover は `border-color:#efcd82; box-shadow:inset 0 0 0 1px rgba(227,185,100,.25)`、disabled は opacity でなく `background:#241010; border-color:#6e1c24; color:#8d7466`。.stare-hold、.doubt-btn、.sp-tile、.dt-acts button も同じ型。斜め（skewX）は押せない物（顔窓・台詞の短冊・名札・カットインの帯）だけ。
- 段：`.step { font:700 13px var(--mincho); padding:6px 14px; background:#170d0b; border:1px solid #584027; color:#c9b89b }`、`.step.on { background:#4a1712; color:#f1d69e; border-color:#8a5a1e; border-bottom:2px solid #d7b370 }`、`.step.done { color:#d9b269 }`。
- 見出し帯：`background:#3e0306; border-bottom:1px solid #8a5a1e; border-left:3px solid #d9b269; padding:6px 14px; font:700 15px var(--mincho); letter-spacing:.1em; color:#efcd82`、補足 12px #b19a74。
- 読む文 14px/1.7 #ead9b8、注記 12px #b19a74、角 2px。

### 黒檀の札（白い丸い吹き出しの代わり：.gc-bub .ob-say .doubt-bubble .stare-pop）
background:linear-gradient(180deg,#22090c,#130406); color:#ead9b8; border:1px solid #8a5a1e; border-left:4px solid #7a0e16; border-radius:2px; box-shadow:inset 0 0 0 1px rgba(227,185,100,.18), 0 8px 18px rgba(0,0,0,.55); font-family:var(--mincho); font-weight:700。::before/::after（尻尾）は content:none。選択＝二重の金線。ウソ＝border-color:#c8253a。

### 見抜くの付箋
羊皮紙：`.dt-clue { background:linear-gradient(180deg,#ebdcbd,#dcc9a0); color:#2b1a10; border:1px solid #8a5a1e; border-radius:2px; transform:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.35), 0 6px 14px rgba(0,0,0,.45) }`。テープ→金の鋲：`.dt-clue::before { width:10px; height:10px; top:-5px; margin-left:-5px; background:linear-gradient(145deg,#f0d08a,#a68148 65%,#705024); border:1px solid #705024; transform:rotate(45deg) }`。白い丸ボタン→黒檀：`.dt-acts button { min-height:44px; border:1px solid #8a5a1e; border-radius:2px; background:#1b0d0b; color:#d9b269; font:700 14px var(--mincho) }`、.on は主ボタン。ぱにゅの付箋→深紅の札：`.dt-clue.hidden-clue { background:linear-gradient(180deg,#3e0306,#22090c); color:#ead9b8; border-color:#d9b269 }`。

### つきつけるの証拠
紙は1色 #e9dcc0。`.ob-ev.k-log` は罫線 `repeating-linear-gradient(180deg,#e9dcc0 0 19px,#d6c39a 19px 20px)`。`.ob-tab { background:#d9b269; color:#1d080e; font:700 12px var(--mincho); transform:none }`、`.ob-tab .en { display:none }`、TELL のピンクは消す。`.ob-colhead b { display:none }`（TESTIMONY/EVIDENCE を落とす）＋見出し帯の型。信用の駒 `.ob-cred i.broken { background:#241010; border-color:#6e1c24 }`。

### 論理の青い格子の代わり＝金の設計図の床
style.css の `#stage > .read-battle-host.rb-logic .mb-stage` の背景から fx_aura_logic.webp を外し、疑似要素で金に転色して下だけ薄く敷く（filter:sepia(1) saturate(1.8) hue-rotate(-12deg) brightness(.75); mix-blend-mode:screen; opacity:.5; 下から上へのマスク）。心理の炎も下半分だけに（上向きのマスク）。.mb-intro.is-logic の青も金と黒へ。心理と論理の違いは「熱（深紅）か冷（黒＋金線）か」。

### 英語
英語は叫ぶ言葉だけ残す：VS・OBJECTION・LOST/WIN/BUSTED のカットイン・JACKPOT・名札。TESTIMONY/EVIDENCE/TELL/BET LOG/BOARD/MEMO/NEW、HAND/BOARD/YOUR 5/STAGE/STRONG/WEAK、BOARD/START/ROUND、POT/CALL/BEST/YOU、SUSPECT、PSYCH/LOGIC BATTLE は日本語の明朝（金・字間 .1em・12〜13px）に。CALL の緑は金。

### ガチャ台
耳の内側 `.gc-ear::after` → `linear-gradient(180deg,#8a1a22,#4e0509)`。R の水色 #4aa3ff → 深紅 #7a0e16（光は rgba(200,37,58,.6)）。SSR の虹 → 金↔白。ぱにゅ残量 `.gc-segs i` → 金。図鑑のピンクの線 → 金。

## 3. ほか
炎が下半分で強すぎる／舞台の枠が細い金線1本だけ／財布の帯と名札が Bebas／ダウトの吹き出し前の黒い空洞／見つめ合うの縦書きが1文字ずつ折れる／「つきつける！」の disabled が opacity で泥色／ハイ＆ローのピンク（はしご・判定）／容疑者の緑とピンクの縁 → 金の二重線（勝てる）・灰の一重線（負け）／役づくり「役の強さ順」27px／結果の PERFECT の虹文字、コンボのピンク、ルーレットのピンク → 金↔白。トランプ（.mb-host .card）は触らない。

## 5. 配信してよい基準
- PC 1280x800 で 11種それぞれの最大状態を撮り、11px 未満が 0、読む文が 13px 以上、下端が 747px の内側、相手の行が潰れていない。
- zoom は .gc-mach の .8 だけ。スマホ横 844x390 の11種の写真が直す前と一致（崩れていない）。
- 白い角丸の吹き出し・ピンクのテープ／ピル・緑／ピンクの判定色・水色の玉や札・小さな Bebas の見出しが無い。英語は VS／OBJECTION／LOST・WIN／JACKPOT だけ。
- 押せる物は四角（角 2px・金線）で 44px 以上（PC は最低 40px）、disabled は暗い型。
- 舞台の枠が小窓と同じ二重の金線＋角飾り。心理＝炎（深紅・金）、論理＝黒に金の床。青・紫・緑が舞台にない。
