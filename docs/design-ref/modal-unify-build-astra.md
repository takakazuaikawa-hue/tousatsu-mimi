# ASTRA への組み込み依頼：小窓（モーダル）の共通の型

## 目的
ホーム（グランドクロック・カジノシアター：黒・深紅・金、しっぽり明朝）と同じ品格に、全部の小窓をそろえる。プロデューサーの声：「安っぽいのだけは本当にやめてね」「旧システムのまま新しくなってなかったり…が絶対ないように」「妥協をするくらいなら作り直しを」。

## 書いてよいファイル
- **ui-modal.css だけ**（index.html で style.css・read-compact.css の後に読み込み済み）。game.js・home.js・style.css・index.html は別の人が同時に直しているので**触らないこと**。マークアップの変更が要る所は、最後の報告に「どこを・どう変えてほしいか」を書く。

## 型（FABLE 案 modal-unify-fable.md と ASTRA 案 modal-unify-astra.md を合わせた決定）
- 幕：rgba(8,2,4,.72)。紫や青みの幕（rgba(4,2,10,…) 等）はやめる。
- 紙面：地 linear-gradient(180deg,#22090c,#130406)、角は四角（radius 0〜2px）、外 2px 暗金 #8a5a1e＋6px 内側に 1px 明金 rgba(227,185,100,.55) の二重線（box-shadow / outline で。既存の ::before/::after を使う飾りを壊さないよう、まず box-shadow で実装）。影は黒（0 24px 64px rgba(0,0,0,.65)）。金色の大きな発光は外す。frame_gold.webp の太い border-image は外す。
- 四隅の金飾り：assets/ui/modal_corner_tl.webp・_tr・_bl・_br（各 128px 正方形、透過、まもなく置く）。紙面の背景に background-image で4隅に重ねる（PC 44px、スマホの実寸 28px）。ファイルが無い間も崩れないこと。
- 見出し：しっぽり明朝 B1（"Shippori Mincho B1","Yu Mincho",serif）700、#efcd82、字間 .08em。見出しの帯は深紅 #3e0306 に下線 1px #8a5a1e。絵文字の見出しアイコンは CSS で消せる物は消す（消せない物は報告）。
- 本文：Noto Sans JP 14px／行間 1.7、#ead9b8。補足 12px #b19a74。数字は明朝の金。
- ボタン（四角、最小 44px、標準 48px）：主＝#7a0e16→#4e0509 の地、1px #d9b269 の線、明朝 15px #f0d08a／副＝暗い地に 1px #8a5a1e の線、文字 #d9b269／危険（セーブ削除など）＝地 #241010、線 #6e1c24、文字 #cdb3a6。ピンク・マゼンタのグラデーション、ピル型、白い iOS 風の光沢は全部やめる。押下は translateY(1px)。フォーカスは outline 2px #f3d58e。
- ON/OFF：真鍮のつまみ（枠 #a68148 1px、ON の地 #7a5a26、OFF の地 #211411、玉は金のグラデーション）。当たり 44px。
- タブ：選択中は地 #4a1712・文字 #f1d69e・下に 2px #d7b370、未選択は地 #170d0b・文字 #c9b89b・線 #584027。高さ 44px。
- 閉じる：右上 44×44、地 #1b0d0b、線 1px #80613c、× は #e8d7b7。
- 紫・緑・青の置き換え：--c-purple 系、装備の #1a0820、設定の rgba(80,20,34)、手帳の緑の「済み」などを深紅と金に。
- スクロールバー：細く、つまみ #9b7944、溝 #100808。

## 対象（オーバーレイ → 紙面のクラス）
settings-overlay→.settings-modal／equip-overlay→.equip-modal／collection-overlay→.collection-modal／glossary-overlay→.glossary-modal／hand-guide-overlay→.hand-guide-panel／hand-history-overlay→.hand-history-modal／login-bonus-overlay→.login-bonus-modal／char-profile-overlay→.char-profile-modal／rico-mode-overlay→.rico-mode-modal／minipoker-overlay→.minipoker-modal（中身のゲームの配置は保つ。枠・見出し・ボタンだけ）／ending-prompt-overlay→.ending-prompt-modal／episode-overlay→.episode-card／newgame-overlay→.newgame-modal／mimi-confirm-overlay→.mimi-confirm／note-article-overlay→.note-article-panel／rule-primer-overlay→.rp-card／intro-win-overlay→.intro-win-modal／dominance-choice-overlay→.dominance-choice-modal／hands-on-overlay→.ho-modal／home-overlay→.home-dialog（物語の台帳・音量設定。home.js が作る）。
各窓のマークアップは game.js の show〜 関数（overlay.className = '…' の直後の innerHTML）を読んで確認すること。

## スマホ横（html.is-compact）
- style.css 末尾に、上の各オーバーレイを画面の端まで広げ、紙面の子に zoom: var(--inv-scale) を掛ける規則が入っている（CSS 1px＝画面 1px）。これを前提に、スマホでは紙面を画面いっぱい（max 97%×95%）に使い、文字 11px 以上・押す所 44px 以上にする。home-overlay は対象外で、別に .is-compact .home-dialog の規則がある（舞台の px で書かれている：画面の 2.05 倍）。
- 並べ方の直し（CSS でできる範囲）：
  - 役の早見表：表を全幅に（.rp-ladder-help の max-width:620px を外す）、行を「役名・説明・札」の3列に、弱い役の行を薄くしない。スマホでは2列×5行でスクロールなしにできれば最良。
  - キャラ名鑑：スマホ横でも左 34% に立ち絵（object-fit: contain、高さいっぱい）、右に本文。幅 920px 以下で縦積みにする規則（style.css 1348 付近）を compact で打ち消す。
  - ゲーム設定：スマホ横では本文を2列（左：心理・論理・消音の切替、右：手帳・辞典・装備への移動、リセットは右下に区切って）。
  - 装備変更：選択肢を 44px 以上に。未購入を opacity .35 で消さず、錠と文字で示す。
  - ポーカー辞典：閉じる × が「50音順」に重なっている。PC で左上に貼り付く位置ずれを中央へ。
  - ログインボーナス：報酬額を大きく（28px）、日付 12px、受け取る 200×48。
  - 各話の導入・回想（.episode-card）：本文 14px／行間 1.8、閉じる・開始は固定して本文だけスクロール。

## 確かめ方
- 写真：qa/out/fulltour/pc_sheet1〜3.png・phone_sheet1〜4.png（今の姿）、qa/out/compactprobe/sheet.png（スマホの実寸化を入れた後）。
- 見本（目標の品格）：qa/out/home-r5e/pc-stage5.png。
- 可能なら node qa/fulltour.mjs pc / phone を実行して撮り直し、文字 11px 未満と押す所 44px 未満を減らす（ブラウザは QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1。実行できない環境なら、しなくてよい）。

## 報告
docs/design-ref/modal-unify-build-report.md に：やったこと、残した課題、マークアップの変更が要る所（ファイル・関数・どう変えるか）。
