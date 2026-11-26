**PCでは「文章を縮めて収める」方針をやめ、余っている横幅を使うのがよいです。** 劇場らしさは、背景・枠・操作部品を統一し、キャラの表情と決着演出を主役にすると出せます。

ブリーフ、指定のCSS、11本のゲームJS、添付画像と一部の1280×800原寸画像、既存の監査結果を確認しました。以下は実装案です。ファイルは編集しておらず、提案値での実画面検証は未実施です。

問い1の「文字サイズと747pxへの収め方」は、次の方針を勧めます。

共通の寸法は、舞台の上下余白24px、枠4px、相手・リコの行96px、行間12px。**遊び本体に約611pxを残し、通常は580px以内を狙います。** 最大状態のための余裕を約30px持たせます。

以下のセレクタには、すべて次の接頭辞を付ける前提です。

```css
html:not(.is-compact) #stage > .read-battle-host.mb-host
```

共通指定は以下です。

```css
/* 上記の接頭辞を各セレクタに付ける */
.mb-stage {
  padding: 12px 24px;
  gap: 12px;
}

.mb-opp-row {
  grid-template-columns: 80px minmax(0, 1fr) 380px 64px;
  gap: 16px;
  min-height: 96px;
}

.mb-portrait.is-face { width: 76px; height: 94px; }
.mb-portrait.is-face img {
  left: -13px;
  top: -3px;
  width: 102px;
  height: 128px;
}
.mb-portrait.is-chibi {
  width: 80px;
  height: 96px;
  margin: 0;
}

.mb-game-root { gap: 8px; min-height: 0; }
.prompt { font-size: 20px; line-height: 1.4; }
.formula { font-size: 13px; line-height: 1.5; }
.step { font-size: 12px; line-height: 18px; padding: 4px 10px; }
.btn { min-height: 52px; font-size: 16px; line-height: 1.4; }
.btn small { font-size: 13px; line-height: 1.35; }
.btn.ghost { min-height: 44px; }
```

`font-size:11px`は番号・短いラベルの下限にとどめ、説明は13〜14pxにします。本文に固定高や省略表示を付けて収める方法は採りません。

**実装位置には注意があります。** `battles/core.js` の `scopeCss()` は先頭の `html` を `.mb-host` に書き換えます。したがって、このPC用接頭辞を各JSの `api.css()` に直接入れるのは避け、通常のCSSとして定義するのが確実です。`read-compact.css` の配置・逆zoomはそのまま維持できます。

- **見抜く／`detective.js`：縮小なし。5枚を整列した調査票にする。**

  `.dt-clues` は `grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px`。`.dt-clue` は `padding:12px; gap:8px; transform:none`。回転とテープをなくすことで、実際の幅いっぱいを使えます。

  `.dt-text` は `font-size:14px; line-height:1.5; min-height:63px`。`.dt-acts` は `display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px`、その `button` は `min-width:0; min-height:44px; padding:4px; font-size:13px`。`.open-btn` と `#mb-dt-panyu` は `grid-column:1/-1`。

  この遊びに限り `.row .card.big { --w:56px }`、`.dt-verdict { font-size:13px; line-height:1.4 }`。**答え合わせで相手の札が1行増える状態**まで含めて設計します。5枚の説明を読ませる画面なので、札より調査票に面積を渡すのが適切です。

- **見つめ合う／`stare.js`：`.stare-duel` の `.83` を解除。顔と手がかりを左右に置く。**

  `.mb-game-root:has(.stare-duel)` を次のグリッドにします。

  ```css
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-template-areas:
    "steps steps"
    "sit   sit"
    "duel  clues"
    "ctrl  clues";
  gap: 10px 20px;
  ```

  `#mb-stare-steps`、`.stare-sit`、`.stare-duel`、`.stare-ctrl`、`.stare-clues` に対応する `grid-area` を指定。

  `.stare-duel { zoom:1; grid-template-columns:36px minmax(0,1fr) 36px; padding-top:24px }`、`.stare-arena { height:300px }`、`.stare-meter { width:24px }`。`.stare-meter .lbl` は12px、`.pct` は16px、`.tick b` は12px。

  `.stare-clues { grid-template-columns:1fr; gap:10px; align-content:start }`、`.stare-clue { padding:12px; font-size:14px; line-height:1.5 }`、`.stare-clue .h { flex-wrap:wrap; letter-spacing:.04em }`、`.h em` と `.stare-banner small` は13px。

  `.stare-hold { min-height:64px; width:100% }`。手がかり3件と操作欄が同時に出ても、顔を縦に潰さずに収められる配置です。

- **ダウト／`doubt.js`：縮小なし。出題中と答え合わせで舞台高を変える。**

  `.doubt-area { height:300px }`、`.doubt-pad { width:min(720px,100%); gap:16px }`、`.doubt-btn { min-height:72px }`。

  `.doubt-bubble { width:min(58%,640px); padding:18px 22px; font-size:24px; line-height:1.5 }`。この台詞は判断材料なので、大きさを保ちます。

  答え合わせは `.doubt-area.is-sum { height:104px }`、`.doubt-list { gap:6px }`、`.doubt-row { min-height:56px; padding:6px 12px; grid-template-columns:28px minmax(0,1fr) 40px }`。`.q` は14px、`.sub`、`.doubt-rule-note`、`.doubt-btn .w small` は13px。

  **5件の台詞・回答・例外説明が全部出る状態**を基準にします。通常の300pxの顔窓を答え合わせまで維持しないことが要点です。

- **ガチャ／`gacha.js`：台だけ `.7 → .85`。心の声と確率表を横並びにする。**

  ここは厳密には、現在も縮小されているのは `.gc-mach` だけです。心の声の細かさには、別途文字サイズと配置の修正が必要です。

  `.gc-mach { zoom:.85 }`、`.gc-plate span { font-size:16px }`、`.gc-face b { font-size:14px }`。これなら台内の文字も11pxを下回りません。

  `.gc-wrap` は `grid-template-columns:260px minmax(0,1fr) 240px; gap:10px 16px`。`.gc-right { display:contents }` とし、以下に割り当てます。

  | 要素 | 配置 |
  |---|---|
  | `.gc-left` | 1列目、1〜4行 |
  | `.gc-panyu` | 2〜3列目、1行目 |
  | `.gc-voices` | 2列目、2行目 |
  | `.gc-odds` | 3列目、2行目 |
  | `.gc-book` | 2〜3列目、3行目 |
  | `#mb-gc-decide` | 2〜3列目、4行目 |

  最後の判断ボタンは、テンプレート上で `.gc-wrap` 内へ移します。場札と手札も、新しい表示用ラッパー `.gc-context` にまとめ、`display:grid; grid-template-columns:300px minmax(0,1fr); align-items:center; gap:16px` にします。ゲーム処理は変えません。

  `.gc-acts { flex-direction:row; gap:8px }`、`.gc-acts .btn { min-width:0; min-height:76px; font-size:15px; padding:6px }`。`.gc-voices { gap:10px }`、`.gc-bub p { font-size:14px; line-height:1.5 }`、`.gc-meta`、`.gc-basebox`、`.gc-ceil` は13px。`.gc-book small` は12px。

  確率表は専用列ができるので、心の声出現後も `.gc-odds` を1列、`.gc-orow` を `44px 36px minmax(0,1fr)` に戻せます。現在隠している説明と天井も、このPC配置では表示する案です。**3回分の声、SSRの札、確率表、判断ボタン**を同時に確認します。

- **つきつける／`objection.js`：`.ob-court` の `.77` を解除。証拠4枚を2×2にする。**

  `.ob-court { zoom:1; grid-template-columns:minmax(0,.9fr) 40px minmax(0,1.1fr) }`。

  `.ob-evs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px }`、`.ob-evs > .ob-colhead { grid-column:1/-1 }`。証言側は `.ob-says { gap:12px }`。

  `.ob-say { min-height:72px; margin:0; padding:10px 14px }`、`.ob-say p { font-size:14px; line-height:1.5 }`、`.ob-say .ob-tag { font-size:12px }`。

  `.ob-ev { margin:0; padding:12px; min-height:104px; transform:none }`。`.ob-tab` は `position:static; display:block; margin:0 0 8px; padding:0; transform:none`。本文をタブと重ねません。

  `.ob-tab em`、`.ob-log`、`.ob-log .st`、`.ob-note` は13px、`.ob-evtext` は14px。`.ob-log li` は `grid-template-columns:64px minmax(0,1fr); gap:2px 8px`、`.ob-log .ac { grid-column:2 }`。狭い証拠札の中で記録を3列に押し込まない構成です。

  `.ob-ev .card.ob-mini { --w:34px }`、`.ob-bar { gap:12px 24px }`、`.ob-go { min-height:56px; font-size:20px }`。信用ゼロの `.ob-luck` も13pxで1行分を確保します。**証拠4枚＋信用ゼロ＋判断欄**が最大状態です。

- **役づくり／`handbuild.js`：縮小なし。役一覧を右の参照欄に置く。**

  `.mb-game-root:has(.hb-deal)` を `display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:8px 24px`。`#mb-hb-steps` は全幅、`.hb-head { display:contents }`。左に `.hb-lv`、`.hb-deal`、`.hb-tray`、`.hb-band`、`.hb-verdict`、`.actions` を順に置き、`.hb-ref` は右列のそれらにまたがる領域に置きます。

  `.hb-ref summary { min-height:44px; display:flex; align-items:center; padding:8px 12px; font-size:14px; transform:none }`、その `> span` も `transform:none`。

  `.hb-ref ol { position:static; width:100%; margin:8px 0 0; padding:12px; gap:6px }`。`.hb-ref li` と `li span` は13px、`.hb-arrow` は12px。

  `.hb-deal .card.big`、`.hb-slot`、`.hb-slot > .card` は `--w:56px`。`.hb-slot .hb-tag { font-size:13px; bottom:-20px }`、`.hb-tray { padding:8px 12px 24px }`、`.hb-bname small { font-size:13px }`。

  「役の強さ順」を開いたまま札を選べる配置にします。今の画像では一覧がゲームの中央を覆っており、教材としても損をしています。

- **ハイ＆ロー／`highlow.js`：`.hl-duel` の `.8` を解除。上下の補助情報を左右に分ける。**

  `.mb-game-root:has(.hl-duel)` を2列グリッドにし、上から「手順＝全幅」「`.hl-top`｜`.hl-round`」「`.hl-board`＝全幅」「`.hl-duel`＝全幅」「`.hl-pick`＝全幅」「`.hl-verdict`｜`.hl-next`」と配置。`gap:8px 20px`。

  `.hl-duel { zoom:1; width:min(760px,100%) }`。`.hl-hand` は `display:grid; grid-template-columns:80px minmax(0,1fr); gap:6px 12px; padding:10px`。`.hl-who` と札を横に置き、`.hl-hn { grid-column:1/-1; min-height:36px; font-size:14px }`。

  `.hl-chibi { height:64px }`、`.hl-hn .hl-wait { font-size:13px }`、`.hl-rung small { font-size:12px }`、`.hl-pot small { font-size:13px }`。`.hl-next .actions .btn { min-width:0; flex:1; padding:8px 12px }`。

  **勝った後の説明＋続ける／やめる**を横に並べることで、途中の最大状態に対応します。

  右端の切れは `.hl-react.right { right:24px }`、左も `left:24px`。`.hl-react img { width:100%; height:100%; object-fit:contain }`。コンテナだけ内側に寄せても、画像の自然幅がはみ出す可能性があるため、画像にも幅を指定します。

- **危ない場札／`danger.js`：縮小なし。左に札、右に読みと判断。**

  `.mb-game-root:has(.dg-board)` を `display:grid; grid-template-columns:minmax(0,1fr) 460px; gap:12px 28px`。手順は全幅、`.dg-board` と手札の `.row` は左列、問い・`.dg-pills`・`.dg-radar` は右列です。

  `.dg-board .card.big { --w:72px }`、手札は `--w:56px`。`.dg-pills { justify-content:flex-start; gap:8px }`、`.dg-pill { font-size:14px; line-height:1.5; padding:8px 12px }`。

  `.dg-radar { max-width:none; margin:0; display:grid; gap:12px }`、`.dg-bar { height:32px; margin-top:24px }`、`.dg-line span { font-size:13px }`。

  画面中央に小さく浮いている状態を解消し、押す対象である場札を十分大きくします。**危険な形が2種類ある場合と、相手の手札公開後**を確認対象にします。

- **ねらい撃ち／`sniper.js`：`.sn-wrap` の `.86` を解除。グラフ左・操作／結果右を固定する。**

  `.mb-game-root:has(>.sn-wrap)` は `display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:12px 24px`。

  `#mb-sn-steps` と `.sn-me` は全幅。左列に `.sn-read` と `.sn-wrap`、右列に `#mb-sn-prompt`、`.sn-rangebox`、`#mb-sn-acts`。結果が出たら `.sn-out:not(:empty)` を右列のその領域全体に配置します。既存の操作欄の `hidden` 切替を利用できます。

  `.sn-wrap { zoom:1; padding:28px 24px 32px 48px }`、`.sn-chart { height:280px }`。`.sn-axis-y`、`.sn-floor`、`.sn-read small`、`.sn-me-name small`、`.sn-cmp small` は13px、軸目盛りは12px。

  `.sn-rangebox { padding:0 }`、`.sn-range { height:44px }`。`.sn-cmp { display:grid; grid-template-columns:1fr; gap:8px }`、`.sn-cmp > div { display:flex; justify-content:space-between; align-items:baseline; padding:10px 12px }`、`.sn-verdict { font-size:18px; line-height:1.5 }`。

  **34pxの超過が出ているのは、結果比較まで追加された状態です。** グラフをさらに縮めるより、下に追加される結果を右へ移すのが根本的な修正になります。

- **当たり札／`outs.js`：縮小なし。探す時は13列、結果時は計算とリールを左右にする。**

  `.mb-game-root .outs-deck` は `grid-template-columns:repeat(13,48px); gap:6px; max-width:696px`。`.outs-deck .card { width:48px; height:64px; aspect-ratio:auto }`、数字20px、マーク15px。52枚でも高さ274pxです。

  `.mb-game-root .outs-deck.is-collapsed { max-width:840px; gap:6px }`、その `.card.found,.card.shown` は `width:48px; flex-basis:48px; height:64px`。最大15枚でも横804pxに収まります。

  `.outs-count small`、`.outs-line span`、`.reel-legend` は13px。`.outs-meter .formula { font-size:13px; line-height:1.5 }`。

  `.mb-game-root:has(.reel-wrap)` は2列グリッドに切り替え、手順・札・当たり札一覧は全幅、`.outs-meter` を左、`> div:has(>.reel-wrap)` を右に配置します。`.reel-wrap { height:108px; max-width:none }`。

  **リール内の `.reel .card` の56pxとgap8pxは維持します。** 停止位置のJSがこの寸法で計算されているため、一覧の札と一緒に変えてはいけません。

- **容疑者／`suspects.js`：縮小なし。最大8枚を4×2にそろえる。**

  `.sp-tiles { grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px }`、`.sp-tile { min-height:84px; padding:12px 14px }`、`b` は15px、`span` は13px。

  場札の `.row` と `.sp-log` を新しい表示用ラッパー `.sp-context` にまとめ、`display:grid; grid-template-columns:minmax(0,1fr) 400px; gap:8px 24px`。札は左列、`.sp-log` は右列で `font-size:13px; line-height:1.5; gap:4px`。答え合わせで追加される相手の札も左列に入れます。

  この遊びの `.row .card.big { --w:56px }`、`.sp-bar { height:32px; margin-top:24px!important }`、`.sp-line span { font-size:13px }`。

  添付の5枚だけを基準にせず、**8枚・履歴3件・判断ボタン・手札公開**を扱える構成にします。

問い2の「劇場の型」は、**`ui-modal.css` の色・線・書体をそのまま移し、情報の種類で表面だけ変える**のがよいです。既存モーダルの対象セレクタを舞台に広げると寸法まで混ざるため、値を共通化します。

| 部品 | 推奨する値 |
|---|---|
| 舞台・主要パネル | `linear-gradient(180deg,#22090c,#130406)` |
| 内側の情報面 | `#1b0d0b` |
| 外枠 | `2px solid #8a5a1e` |
| 内側の金線 | `inset 0 0 0 5px #190608, inset 0 0 0 6px rgba(227,185,100,.55)` |
| 通常の文字 | `#ead9b8` |
| 補助文字 | `#b19a74`。文章にはopacityを掛けない |
| 金の見出し | `#efcd82` |
| 通常ボタン | 背景`#1b0d0b`、線`#8a5a1e`、文字`#d9b269` |
| 主操作ボタン | `linear-gradient(180deg,#7a0e16,#4e0509)`、線`#d9b269`、文字`#f0d08a` |
| 角 | パネル・ボタンとも`border-radius:2px` |
| 書体 | 見出し・主操作＝しっぽり明朝、説明＝Noto Sans JP |

四隅は既存の `modal_corner_tl/tr/bl/br.webp` を44pxで使います。大きな舞台と主要パネルに限定し、小さな証拠札すべてには付けません。

具体的には次の置換です。

- **白い吹き出し**：`.gc-bub`、`.ob-say`、`.doubt-bubble`、`.stare-pop` を、背景`#1b0d0b`・文字`#ead9b8`・金線1px・角2pxに統一。尻尾や丸い点を描く疑似要素は `content:none`。`.ob-say.sel` や `.gc-voice.v-SR .gc-bub` など、状態別に白へ戻す指定も上書きします。
- **見抜くの付箋**：`.dt-clue` は同じ暗い調査票。`.dt-clue::before { content:none }`、`.dt-clue.hidden-clue { background:#28120e }`。`.dt-kind` は明朝15px・金、選択ボタンは通常ボタンと同型にします。
- **つきつけるの証拠**：`.ob-ev.k-tell` のピンク、`.k-memo` の黄色、`.k-log` の明るい罫線紙を、同じ暗い資料面へ統一。`.ob-tab` は背景なしの金文字。`.ob-log .st` は`#d9b269`、`.ob-cl` は`#ead9b8`、赤いスートは`#e6aaa0`にして読めるようにします。
- **選択状態**：`.dt-acts button.on`、`.ob-say.sel`、`.ob-ev.sel` は背景`#4a1712`・線`#efcd82`・`box-shadow:inset 0 -2px #d7b370`。膨張や常時の強い発光を抑え、押した対象の輪郭を安定させます。
- **見つめ合いの小ラベル**：`.stare-chip.bluff/.act/.ok` の赤・ピンク・緑ベタをやめ、透明背景と金／赤茶の文字・下線に変更。判断内容の文字は残します。
- **容疑者**：`.sp-tile` も暗い資料札にし、`.sp-tile.out { opacity:1; color:#b19a74 }`。大きな中央の×は右端へ寄せ、元の候補名を読める状態にします。

共通 `.btn` の斜め背景は、`.btn::before { transform:none; border-radius:2px }` に変更。`.doubt-btn::before` と `.stare-hold::before` も同様です。キャラの顔窓や一瞬の決着帯には斜めの形を残せます。

ガチャの希少度は、**色相の多さより、金属と枠の違い**で表現します。

| 希少度 | 色・仕上げ |
|---|---|
| N | 鈍い銀褐色 `#b8aa91` |
| R | 銅 `#b97a47` |
| SR | 金 `#d9b269` |
| SSR | 淡金 `#f3dfaa`＋二重線＋短い光沢 |

対象は `.gc-balls .b-*`、`.gc-cap.c-* .t`、`.gc-rar.r-*`、`.gc-badge.r-*`、`.gc-book-r .r-*`。`.gc-body` は`#4e0509〜#22090c`、`.gc-ear::after` は`#7a0e16〜#3e0306`、`.gc-face i::after` のピンクの頬は消します。

さらに `.gc-spot.g-SSR::after`、`.gc-burst.c-SSR`、`mb-gcRainbow` も暖色へ変えます。通常画面だけ直しても、当選時に青・緑・虹が戻るためです。ガチャ台はCSS製なので、まず追加画像なしで対応できます。

英語は表示文字列を日本語に置き換えます。CSSの疑似要素で隠して上書きする方法は使いません。

- `TESTIMONY／EVIDENCE` →「発言／証拠」
- `BOARD／HAND` →「場札／手札」
- `LOST` → 表示対象に応じて「はずれ」または「敗北」
- `CALL／FOLD` →「コール／降りた」
- `BEST／YOU` →「最適額／選んだ額」
- `SUSPECT／NEW` →「候補／初入手」

論理の背景は、**黒いフェルトに、上方から落ちる弱い琥珀色の照明**を勧めます。細い金の二重枠を主体にし、床の格子・消失点・発光粒はなくします。心理は深紅の幕、論理は黒い卓面という差です。

実際の背景指定は [style.css](/C:/Users/takakazu/projects/mp_panyu/style.css:17111) にあります。論理側は画像だけでなく、下地の`#3a1430`なども置換が必要です。

```css
html:not(.is-compact) #stage > .read-battle-host.rb-logic .mb-stage {
  background:
    radial-gradient(
      ellipse at 50% 0%,
      rgba(217,178,105,.10),
      transparent 65%
    ),
    linear-gradient(180deg, #1b100d, #100808);
}
```

心理側の炎を残すなら、`background-size:100% 220px`で下端に限定し、上に掛ける暗幕を`rgba(19,4,6,.82)`程度にします。今の炎は情報欄の背後まで明るく、手がかりより先に目に入っています。

問い3の「ほかに気になる点」は、次のものです。

- **無効化と「読めない」が混ざっています。** 見つめ合いの `.stare-clue.is-lost { opacity:.45 }`、つきつけるの `.is-off { opacity:.38 }` は、答え合わせに必要な文章まで消しています。`opacity:1`に戻し、色・破線・状態語で区別します。
- **情報の階層が逆です。** 小さな英語見出しに強い字間と装飾があり、肝心の説明が細い。`.ob-colhead b`、`.stare-clue .h`、`.gc-who`などは日本語化したら`letter-spacing:.04em`程度に落とします。
- **操作可能な札と表示用の札が似ています。** 危ない場札と役づくりは、選べる領域に「場札を選ぶ」「ここから5枚」の短い説明を常設し、hover時の金線とfocus表示をそろえると迷いが減ります。
- **役づくりの説明窓が札を隠しています。** 添付の `handbuild_3` は典型例です。参照欄の横出しが最も効きます。
- **ダウトの空白は静止画だけでは断定できません。** `doubt_2` の台詞が空なのは切替アニメーション中の可能性があります。台詞の出入りと受付時間を録画で確認し、見えている時間が短くなっていないか確かめるべきです。
- **リコが縦長に見えるコマがあります。** `objection_4` などは登場時の変形を撮った可能性があります。画像の比率崩れと断定せず、`.swap`のアニメーション終了後も同じか確認します。
- **容疑者の「1/3」と「47%」の関係が弱いです。** 数字はそのまま、「候補の種類では1/3」「組み合わせ数では47%」を別行にして、同じ尺度に見えないようにします。
- **当たり札の42px幅は、主に集め終わった表示用の札です。** クリック対象の52枚一覧と分けて評価すべきです。上の案では両方48pxにそろえますが、操作上の優先度は一覧の方が高いです。

実装を読んで気づいた別件として、見抜くのボタンは `id="mb-dt-panyu"` なのに、クリック処理では `e.target.id === 'dt-panyu'` を確認しています。CSSとは別に、ボタンが反応するか確認が必要です。

問い4の優先順位は、見た目と出現範囲を分けると判断しやすいです。

| 優先 | 対応 | 理由 |
|---|---|---|
| 最優先 | ねらい撃ちの結果配置、11px未満の文字 | 読み取りと画面内への収まりに直接影響 |
| 1 | 共通背景・ボタン・枠・書体 | 全11種に効き、ホームとの不一致を最も大きく減らす |
| 2 | ガチャ | 全4キャラで出現。台・声・希少度の旧デザインが目立つ |
| 3 | 見つめ合う | 3キャラで出現。顔の対決が強い見せ場になる |
| 4 | 見抜く、役づくり、ハイ＆ロー、ダウト | ポルカ卓で見る候補群。操作の分かりやすさを整える |
| 5 | つきつける | 見た目の問題は大きい。ヴェルベット卓に着手する際は最優先 |
| 6 | 危ない場札、当たり札、容疑者 | 共通変更後、配置と状態表示を仕上げる |

出現範囲は [READ_BATTLE_POOLS](/C:/Users/takakazu/projects/mp_panyu/game.js:14377) を確認しました。未経験の遊びを優先し、その対戦での出現回数が少ないものを選ぶ実装なので、実際の閲覧頻度を固定順位として断定はできません。

実装後の合格条件は、通常画面だけでなく、上記の最大状態で**文章13px以上、短いラベル11px以上、操作対象44px以上、747px内に全内容が収まること**です。既存監査は小文字や34pxのスクロールがあっても見出しに「OK」と出ているため、その表示ではなく、各測定値と原寸画像で判定します。