提案は、**「黒に近い深紅の紙面＋細い二重の金線＋四隅だけの金細工」**です。ホームの装飾とつながりを持たせつつ、本文と操作部分には十分な面積を残します。

添付画像、`style.css`・`game.js`、台帳と音量設定を生成している `home.js` を確認しました。以下は変更案です。ファイルの編集や実機での表示検証は行っていません。

**1．共通の小窓の型**

まず、装飾を統一する前にサイズの基準をそろえます。

現状の舞台は844×390で `scale = 0.4875`。舞台内に置いた `font-size:14px` は、補正がなければ画面上で約6.8pxです。[末尾の実寸化CSS](C:/Users/takakazu/projects/mp_panyu/style.css:18990)はこの問題への対処ですが、次が残っています。

- `.home-overlay` が対象外なので、台帳・音量設定には実寸化が適用されない。
- `max-width:97%; max-height:95%` は上限指定なので、小窓を画面いっぱいには広げない。
- 直下の `> *` 全部に `overflow:auto` を付けており、既存の本文スクロールと二重になる可能性がある。
- `.is-compact .home-dialog button` の `min-height:92px` は縮小前提。実寸化するときは44〜48pxへ戻す必要がある。

**共通クラスを「外幕・紙面・見出し・本文・操作欄」に付け、実寸化は紙面に一度だけ適用する**形が適切です。`body` 直下へ出す確認窓には逆倍率を掛けません。

寸法の推奨値は次です。以下のpxは、実寸化後の画面上のCSS pxです。

| 部位 | 推奨値 |
|---|---|
| PCの紙面幅 | 確認・音量 `520px`、設定・辞典 `760px`、台帳・装備・名鑑・手帳 `960px` |
| PCの高さ | `max-height:calc(100dvh - 48px)` |
| スマホ横の紙面 | `width:100vw; height:100dvh; max-width:none; max-height:none` |
| 見出し欄 | PC `min-height:64px`、スマホ `52px` |
| 操作欄 | `min-height:60px; padding:8px 16px` |
| 本文余白 | PC `20px 24px`、スマホ `12px 16px`＋セーフエリア |
| 本文 | `14px / 1.75`、説明補助 `12px / 1.6`、最小ラベル `11px` |
| 操作対象 | 最小 `44×44px`、標準ボタン高さ `48px`、間隔 `8px` |

紙面の基本CSSは、この水準にします。クラス名は新設する共通クラスの例です。

```css
.ui-modal {
  --m-bg: #140909;
  --m-text: #f2e6cf;
  --m-muted: #bfae92;
  --m-gold: #b78b4b;
  --m-gold-hi: #e7c98a;
  --m-line: #584027;

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  color: var(--m-text);
  background: linear-gradient(180deg, #251010 0%, #140909 100%);
  border: 1px solid var(--m-gold);
  border-image: none;
  border-radius: 4px;
  box-shadow:
    0 24px 64px rgb(0 0 0 / 65%),
    inset 0 1px 0 rgb(255 226 168 / 12%);

  font-family: "Noto Sans JP", "Yu Gothic", sans-serif;
  font-size: 14px;
  line-height: 1.75;
}

.ui-modal::before {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid rgb(183 139 75 / 32%);
  border-radius: 1px;
  pointer-events: none;
  z-index: 2;
}

.ui-modal__header,
.ui-modal__footer {
  flex: 0 0 auto;
  background: #200b0b;
}

.ui-modal__header {
  min-height: 64px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--m-line);
}

.ui-modal__title {
  margin: 0;
  color: var(--m-gold-hi);
  font-family: "Shippori Mincho B1", "Yu Mincho", serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: .08em;
  text-shadow: 0 1px 2px #000;
}

.ui-modal__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: #9b7944 #100808;
}

.ui-modal__footer {
  min-height: 60px;
  padding: 8px 16px;
  border-top: 1px solid var(--m-line);
}

.ui-modal__body::-webkit-scrollbar { width: 8px; }
.ui-modal__body::-webkit-scrollbar-track { background: #100808; }
.ui-modal__body::-webkit-scrollbar-thumb {
  background: #9b7944;
  border: 2px solid #100808;
  border-radius: 4px;
}
```

**金線は二重で十分です。** 外周1pxと6px内側の薄い1px。現在の14〜20px幅の `border-image` は解除し、角飾りを独立して載せます。外幕は `background:rgb(5 3 2 / 78%)`。金色の大きな発光は外し、黒い影で奥行きを作ります。

見出しには既に読み込まれている「しっぽり明朝B1」を使い、スマホは `20px`。長文本文はゴシック14pxを基本にします。ホームの `--serif-jp` は `.home-stage` 内の変数なので、兄弟要素になる小窓にも共通定義が必要です。

操作部品は次の値で統一します。

| 部品 | 具体値・見せ方 |
|---|---|
| 共通ボタン | `min-height:48px; min-width:44px; padding:10px 18px; border-radius:3px; font-size:14px; font-weight:700` |
| 主ボタン | 地 `linear-gradient(#761919, #460909)`、線 `1px solid #c49a57`、文字 `#fff0d3` |
| 副ボタン | 地 `linear-gradient(#2b1813, #1b100d)`、線 `1px solid #80613c`、文字 `#e8d7b7` |
| ボタンの立体感 | `box-shadow:inset 0 1px 0 #ffffff14, 0 2px 4px #0008` |
| 危険ボタン | 地 `#241010`、線 `1px solid #a65e50`、文字 `#f1baaa`。リセット操作を明記する |
| 選択済みタブ | 地 `#4a1712`、文字 `#f1d69e`、下端に `2px solid #d7b370` |
| 未選択タブ | 地 `#170d0b`、文字 `#c9b89b`、線 `1px solid #584027` |
| タブ寸法 | `min-height:44px; padding:8px 16px; border-radius:3px 3px 0 0` |
| 閉じる | 右上に `44×44px`。地 `#1b0d0b`、線 `1px solid #80613c`、角丸 `3px`、×は `20px` |
| 区切り線 | `1px solid #584027`。一覧の行間は薄めの `#39281c` |
| キーボードフォーカス | `outline:2px solid #f3d58e; outline-offset:3px` |

主ボタンのホバーは地を `#8b2220 → #57100d` に変更。押下は `translateY(1px)` 程度にします。既存の白い波紋や拡大効果は、この共通ボタンでは解除します。

危険確認では、現在の `mimiConfirm()` が危険時にキャンセルを主ボタンにしている意図を残します。実行側は危険ボタンとして表現し、「データを削除」のように結果が分かる文言にします。

ON/OFFは、既存スイッチを次の寸法に変更するのが最小です。

- 本体 `80×44px`、角丸 `22px`、線 `1px solid #a68148`。
- つまみ `32×32px`、上 `5px`、OFF時の左 `5px`、ON時の左 `41px`。
- ONの地 `#967137`、文字 `#100b06`。
- OFFの地 `#211411`、文字 `#d2c0a1`。
- つまみは `linear-gradient(#f6ead1, #c5ac80)`。状態文字は `11px`、移動は `120ms`。

音量バーは操作領域の高さ44px、見える溝4px、つまみ22px。本文スクロールだけを動かし、見出し・閉じる・確定操作は残します。下端のフェードを付けるなら高さ16pxまでとし、最終行が隠れないよう本文末尾に24pxの余白を置きます。

**2．ChatGPTで描く価値がある部品**

**最初は「四隅の金飾り」1セットだけで十分です。** 既存の `frame_gold.webp` は角にスート模様を持つ額縁ですが、現状は縮小された細い枠として使われ、細工が読み取りにくくなっています。

新規部品は次の仕様にします。

- 四隅を別部品として生成。表示サイズはPC `48×48px`、スマホ `28×28px`。
- アカンサスの葉と短い渦巻きを主とし、外周線へつながるL字形。
- 暗部は焦げ茶、金の中間色は `#b78b4b`、ハイライトは `#ead39a` の方向。
- 4つとも光源を左上で統一する。単純な反転で光の方向まで逆転させない。
- 紙面の角から `4px` 内側へ配置、`pointer-events:none`。文字や閉じるボタンに重ねない。
- 28px表示で残る大きな形を優先し、細い鎖や小さな宝石を詰め込まない。

描画指示の例です。

> 英国バロック様式の高級カジノ劇場で使う、古金の鋳造金具。長方形パネルの四隅に付くL字形の装飾を、左上・右上・左下・右下の4部品として離して配置する。全て正面から見た平面配置、同一縮尺、光源は画面左上。アカンサスの葉、控えめな渦巻き、薄い面取り。厚みと彫りの陰影はあるが、発光はない。文字、人物、額縁の中央面は含めない。背景は均一な純緑 #00FF00、背景への影と緑の映り込みなし。小さく表示しても輪郭が読める形。

切り抜き後は透過WebPにし、緑の縁残りを `#140909` の背景上で確認します。原画の大きさより、**28px表示時の仕上がり**で採用を判断します。

銘板は後回しでよいです。既存の `assets/ui/home/nameplate.webp` は兎の紋章付きで主張が強いため、全ての見出しには向きません。必要になったら「文字なし・紋章なし」の低い銘板を1種類追加し、PC `240×48px`、スマホ `180×36px`。文字は画像に焼かずHTMLで重ねます。

地のテクスチャ、各種ボタン、タブはCSSで十分です。

**3．型をかぶせるだけでは足りない小窓**

最も明確なのは次の4つです。

**プロフィール／画像10**

原因は[幅920px以下で縦積みにする指定](C:/Users/takakazu/projects/mp_panyu/style.css:1348)です。横844×390でも立ち絵が上段になり、低い上段に全身を収めるため人物が小さくなっています。

横持ちでは左右配置を維持します。

```css
/* 実寸化したスマホ横の名鑑本文 */
.cp-layout {
  display: grid;
  grid-template-columns: clamp(180px, 28vw, 240px) minmax(0, 1fr);
  gap: 20px;
  min-height: 0;
}

.cp-art {
  min-height: 0;
  background: transparent;
  border-radius: 0;
}

.cp-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cp-panel {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}
```

共通見出しの下にこの本文を置きます。名前22px、肩書12px、説明14px。右の説明だけをスクロールさせ、左の人物は残します。人物を丸枠には入れません。現状の絵文字アイコンも、32pxの枠なしアイコン程度に抑えます。

**役の早見表／画像15**

右側が空く直接の原因は、[外枠860pxに対して `.rp-ladder` が `max-width:620px`](C:/Users/takakazu/projects/mp_panyu/style.css:14260)だからです。役名・説明・カードを全幅で整列させます。

```css
.hand-guide-panel .rp-ladder-help {
  width: 100%;
  max-width: none;
}

.hand-guide-panel .rp-ladder-help .rp-ladder-row {
  grid-template-columns: 168px minmax(0, 1fr) 196px;
  gap: 16px;
  min-height: 64px;
  padding: 8px 12px;
  opacity: 1;
}

.hand-guide-panel .rp-ladder-cards .card {
  width: 36px;
  height: 50px;
  flex: 0 0 36px;
}
```

役名14px、説明13px、カードの数字・隅のスートは11px以上。強い役だけ金色にし、弱い役の行全体を薄くする指定は解除します。

9役を390px高に押し込む必要はありません。見出しを残し、一覧を縦スクロールさせます。また、現在の「タップして閉じる」は本文タップでは閉じない実装なので、右上の閉じるに集約するのが明快です。[該当処理](C:/Users/takakazu/projects/mp_panyu/game.js:12574)

**音量設定・ゲーム設定／画像05・06**

画像06の細い縦列は、余白不足ではなく、内容を一列に積んでいることが問題です。

スマホ横では本文を `grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); gap:24px` にします。

- 左列：心理・論理・消音時の音声設定。各行 `min-height:56px`、説明12px。
- 右列：手帳・辞典・装備などへの移動。高さ48px、間隔8px。
- リセット：右列の末尾に16px空けて配置。通常操作とは区切り線で分ける。
- 閉じる：共通見出しの右上。

音量設定も同様に、左にBGM・効果音、右に設定への移動を置けます。各音量行は `grid-template-columns:64px 80px minmax(120px,1fr)`。現在は本文ラッパーがないため、[生成HTML](C:/Users/takakazu/projects/mp_panyu/home.js:227)に列を作る小さな変更が必要です。

**装備変更／画像07**

[現状の `.equip-chip`](C:/Users/takakazu/projects/mp_panyu/style.css:9284) は13px文字に上下6pxの余白で、実寸にしても高さ44pxに届きません。衣装だけ選択肢が多く、他の項目と同じ密度で並べると視線も散ります。

推奨は左右分割です。

- 左：幅144pxのカテゴリ一覧。「衣装／カード／卓／音」など。
- 右：選択肢を `repeat(auto-fit,minmax(144px,1fr))`、間隔8pxで配置。
- 選択肢：`min-height:48px; border-radius:3px; font-size:13px`。
- 選択済み：金線＋「✓ 装備中」。発光は付けない。
- 未購入：文字を `#aa9780` で残し、錠と「未購入」を表示。現状の `opacity:.35` は解除。
- 下の2つの注意書き：共通操作欄に12pxでまとめる。

カテゴリ切替にはJS変更が必要です。先にCSSだけで直す場合も、ラベル列を104px、選択肢を44px以上にして、縦スクロールを許容します。

ほかの窓は次の調整が必要です。

| 小窓 | 配置の直し方 |
|---|---|
| 台帳／04 | 行を「名前・状態」と「操作」に分ける。スマホ横では `180px minmax(0,1fr)` の2列。操作は高さ44px以上で折り返し、本文だけスクロール |
| トロフィー手帳／08 | 「対戦／CG／実績」の44px高タブへ分割。CGは `minmax(144px,1fr)`、画像比率16:9。全項目を一度に縮めて並べない |
| 辞典／13 | 左160pxにカテゴリ、右に検索と本文。検索44px・文字16px、本文14px。小さなカテゴリボタンを上部に何段も積まない |
| ログインボーナス／16 | 報酬額28px、日付12px、7日分は `repeat(7,minmax(0,1fr))`。カード高さ72px、受け取るは `200×48px`。未来の日も文字を薄くしすぎない |
| 回想／29 | スマホ横は左36%に絵、右に本文14px・行間1.8。既存の `.episode-scroll` と `.episode-foot` を生かし、閉じるを固定 |
| ファイブポーカー入門／32 | 全画面の紙面内に説明幅560px程度を確保。本文14px、開始48px。親のミニゲームで実寸化したら、入門窓には再度逆倍率を掛けない |
| リコの選択／12、終幕前／30 | 共通紙面内で内容幅560px程度に制限。選択カードは説明込みで高さ72px以上。終幕の音量操作は44px高 |

ハンド履歴の空状態／14は、大きなレイアウト変更は不要です。見出し・閉じるを固定し、本文14pxで「対戦後にここへ記録されます」と表示すれば十分です。

なお、画像09・11では該当ビューア／プロフィールが開いた状態を確認できません。これらの配置判断は、画像ではなく実装に基づくものです。

**4．優先順位**

利用ログはないため、頻度は導線からの推定です。**共通基盤を先に作り、遭遇率と見た目の差が大きい窓から適用する**順を推奨します。

| 順位 | 対象 | 理由 |
|---|---|---|
| 0 | 実寸化・共通紙面・44px操作・本文スクロール | 全ての修正の土台。台帳と音量設定の対象漏れもここで解消 |
| 1 | 音量設定・ゲーム設定・台帳・ログインボーナス | ホームからの接触機会が多い。新ホームとの品質差がすぐ見える |
| 2 | 装備変更・トロフィー手帳 | 項目数が多く、細かすぎる操作と旧配色が目立つ |
| 3 | プロフィール | キャラの見せ場なのに、スマホで立ち絵が小さくなっている |
| 4 | 役の早見表・辞典・リコの選択 | 初心者の利用頻度が高く、文字と操作サイズが理解しやすさに直結 |
| 5 | 導入・回想・研修・講義 | 閲覧時の占有面積が大きい。共通部品に加えて画像と本文の配置調整が必要 |
| 6 | 履歴・戦術ノート・各種確認・終幕前 | 共通型を展開しやすい。利用場面が限定される |
| 7 | ミニゲーム・CG／衣装鑑賞・幕間 | 内容固有の配置を保ち、枠・見出し・操作だけ共通化する |

最初の仕上がり確認には、**音量設定・装備変更・プロフィール**の3画面を使うのがよいです。短い操作、密な一覧、人物と長文という異なる条件で同じ金線・文字・余白が成立すれば、残りへ展開する基準になります。