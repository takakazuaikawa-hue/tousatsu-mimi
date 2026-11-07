# active-memory handoff: ミミのテキサスホールデムポーカー（DLsite 販売の仕上げ・ぱにゅぱにゅの構図と衣装を増やす）

**Handoff #22** · 2026-11-08 · Lineage: #1 (2026-10-02): 有料級品質への改修ループ。AI是正・研修作り直し・読み合い11種類・話す顔・Higgsfield 動画まで配信; #2 (2026-10-12): スマホの文字の基準、心理バトルの炎、ぱにゅぱにゅ「網目＋ばね」試作、ホームはリコ先輩主役の方針; #3 (2026-10-12): 触り比べ試作の大改修; #4 (2026-10-12): お腹の開き、衣装5着、ドレスの巻き返り; #5 (2026-10-13〜14): パジャマ・ドレスの胸元作り直し、ホルター・白サテン、PR#10 積み直し; #6 (2026-10-14〜15): 本編埋め込み配信、新衣装4着、うさ耳、横向きスマホ; #7 (2026-10-15): ナースの当て布、肌検査をスキル化、ホームを時計の裏の舞台に; #8 (2026-10-15〜16): ホームの段階・開幕の儀・動き・アイコン、小窓20種の統一; #9 (2026-10-16〜20): ご褒美CG描き直し、声第1弾101本、ホーム3DCG風部品、オフラインパック; #10 (2026-10-20): 読み合い11種、声に感情、幕間・エンディングのカメラ; #11 (2026-10-20〜21): 交換所を全面作り替え; #12 (2026-10-21): 額の肖像6人・対戦中の音量の小窓; #13 (2026-10-21〜23): 読み合いを「卓の本当の手の勝負・決着後に答え合わせ」に、文字の段を全画面へ; #14 (2026-10-24〜27): 異議あり・iPhone 16e・本気のリコの卒業試験・声201本; #15 (2026-10-27〜28): 読み合い残り全部を本当の手に、type-roles.css の1か所に、文字とレイアウトのスキル化; #16 (2026-10-28〜30): 零時の卓の考え方、苦戦の一枚絵、ファイブポーカー、ご褒美CG差し替え; #17 (2026-10-30〜31): ホームの動き・ロード画面、セリナのご褒美CG2枚＋秘蔵2枚、live-cg.js、販売前の点検、iPhone の zoom→scale; #18 (2026-10-31〜11-02): 容疑者しぼり2問、Codex 辛口試遊1〜13回、体験版、Pages を Actions に; #19 (2026-11-02〜11-07): Codex 辛口14〜16回、声の残り、DLsite 版（Electron）、遷移の透け、省略の全文吹き出し、作業場所を main に、ポメラシバスタジオ表記、ロビーの紋章の札、メモリの手放し、ぱにゅぱにゅ段1・遊び方3つ・揺れ方3つ; #20 (2026-11-07): ぱにゅぱにゅの構図違いの仕組み（衣装@構図）、バニーの楽屋・プール、楽屋×前開き6着、ベッド・卓はやめて一枚絵用にしまう、ChatGPT の自動操作の新しいやり方、ほろ酔いの夜の案（20261107j）; #21〜22 (2026-11-07 夜〜11-08): 楽屋（ナース・サンタ・ホルター・白サテン・ドレス）とプール6着を配信、とがる衣装4着（ジムウェア・Yシャツ・Tシャツ・肌着）と仕組み・スキル panyu-tip-outfit、頬をはさむ構図＋衣装ごとの背景（ジム）、楽屋・プールの加工の三段階、揺れる範囲を傾いた楕円＋丸い山（3D）、キュンッのエフェクト（20261108c）。エンドレス没入モードは別の会話 panyu-immersive に渡した

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: Start every reply with exactly "Yes Boss!"
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** 有料ブラウザゲーム『ミミのテキサスホールデムポーカー』を DLsite で売れる品質まで仕上げる（Windows の exe＋Web 版）。
- **Done looks like:** やること台帳（docs/design-ref/backlog.md）の残りを全部終え、少なくとも5時間遊べる量があり（ぱにゅぱにゅだけで1時間）、最後に DLsite 版を1回作り直して渡せる状態。
- **Why it matters / context:** 製作元は「ポメラシバスタジオ／POMERASHIBA Studio」。DLsite で販売する。

## 2. About the user (as relevant to this work)
- 作者・プロデューサー。絵・文言・声の採否は自分で決める。品質に非常に厳しい。作業中の画面（ツールの結果の写真）を見ていて、途中で指摘を次々に送ってくる。スマホ実機でも遊んで確かめる。
- Windows 11、PC（CPU 4つ、メモリ16GB、空きは1.5〜1.7GB前後）。Claude デスクトップアプリ（Code）、Chrome（全画面で YouTube を見ていることが多い）、ChatGPT（月額）、Codex アプリ、Higgsfield を使う。
- 別のプロジェクト mimi_gamble_guild の計算（scripts/deckAudit.ts、node が最大5つ）を同じ PC で回すことがあり、CPU をほぼ使い切ると ChatGPT のタブが固まる。
- 体験版は HP 担当の「どっと」さんが公開する（こちらは公開しない）。

## 3. Style & communication
- **Language:** 全部日本語（経過・作業中の一言まで）。
- **Tone:** 丁寧で短く、やさしい言葉。専門用語は言い換える。
- **Reply length:** 区切りごとに要点だけ。長い報告は見出し＋箇条書き。
- **Formatting:** 見出しと箇条書き、表。絵文字は使わない。ファイルはリンク（[名前](相対パス)）。見た目の確認は Artifact のページ（見比べページ https://claude.ai/artifact/1RXpnoGHwqoYuwAMVZg6dq）、**動きの確認は本番の遊べるリンク**（`https://takakazuaikawa-hue.github.io/tousatsu-mimi/docs/design-ref/panyu-mesh.html?c=<衣装>%40<構図>`）。localhost を渡さない。
- **Working style:** 決まった残りは聞かずに進める。聞くのは絵・文言・声の選択と、外に見える操作だけ。聞く時は中身（案の要点・写真）を見せる。作り終えてから1回撮って確かめる。裏の作業の知らせが来たら止まらずに次の手を打つ。区切りで台帳と引き継ぎを書き換える。ChatGPT が動くうちは、組み込みの作業と並行して絵を描かせ続ける。微調整の決まりは必ずスキルに入れる。
- **Avoid:** 安っぽい見た目、キャラを丸で囲む、文字だけの説明（絵で見せる）、語の途中の改行、14px 未満の文字、確かめずに「済」と言うこと、動きを写真で見せること。

## 4. Hard rules (word for word)
（#19 までの 1〜60 はそのまま有効。主なもの）
1. 「キャラクター表示を〇で囲むのは安っぽくて好きになれません」
2. 「経過も日本語でお願いします」／返事の頭に「Yes Boss!」。
3. 紫系の色を UI に新しく足さない。
4. 配信：main に push で GitHub Pages。index.html の `?v=` を上げる（網目のページを直したら game.js の `PANYU_MESH_V` も）。最上位に .js/.css を足したら .github/workflows/deploy.yml にも足す。配信後は gh run と本番を curl で確かめる。「直したら配信してね」
5. 検査ブラウザ（headless）は同時に1つだけ。
6. 「スマホは横画面固定ですよ」→ 縦向けの直しはしない（検査は 844x390）。
7. 「ミミはバニーガールですから耳がないのは全部NGですよ」
8. 露出の線：乳首は描かない（#21 で「露出の線を越えてもよいです」→ 胸がほとんど出る形は可）。
9. 「安っぽいのだけは本当にやめてね」「何よりも大事なのはクオリティです」
10. ChatGPT のパソコン用アプリを閉じるかは毎回ユーザーに確認。
11. 絵の作り直しは候補をユーザーに見せて選んでもらってから差し替える。
13. 「ビジュアルで表せるところは表して文字情報だけに頼るのは気をつけましょうね」
15. 「意味ないのが面白いしあとの作品の引きになるんだから勝手に変えないでください」（ぱにゅぱにゅ）
16. 「良いですか？と聞くのなら見せてください」
17. 「忘れてましたじゃないでしょ。しっかりしてください。」
18. ご褒美CG＝お色気サービスショット。
20. サブエージェントは Sonnet。
22. 「声も画面も私にちゃんと提示できるリンクを渡してください」
24. 「私に判断を仰ぐときはちゃんと分かるように質問してください」
27. 「進めるに決まってることを聞かないでください」
28. 「作り込みの分も全部やってから完成にしてください」
29. 「検証に余計な時間を使わないでください。できてから撮影検証でしょ？」
31. 「止まっていないか常に自身で確認してくださいね。完成までもっていきたいです」
32. 「1回だけ試す決まりなんてないのでできるまで試してください」（ChatGPT の断り）
33. 「ごめん胸元超重要だからいれてね」
43. 「PC容量が圧迫されているので不要ファイルは削除してください」
51. 作業場所は `C:\Users\takakazu\projects\mimi_porker` の main だけ。分身フォルダー・worktree を増やさない。配信は `git push origin main`。
54. 製作元の表記は「ポメラシバスタジオ」「POMERASHIBA Studio」。個人名は出さない。
56. 「DLsite版の作り直しはすべて追ってからにしましょう。衣装や交換所やコレクションもぱにゅぱにゅの後詰めたいし、ボリュームが十分か検証しないといけません。少なくとも5時間は遊びたいよね」
60. mimi_gamble_guild には触らない。その node が CPU を使っていても止めない。止めるのは自分の作業のプロセスだけ。
#20〜#22 で増えたもの：
61. 「もっと構図も衣装も増やす。これだけで1時間はあそべるくらい」（ぱにゅぱにゅ）
62. 「とめはしないのでゆっくりやってください」（mimi_gamble_guild の計算の優先度は下げない）
63. 「見ていると、生成中にあきらめてることが多いです」→ ChatGPT は送ったら描き終わるまで会話の画面のまま待つ。
64. 「胸がしっかり張り出した構図じゃないとうまく作れないと思うんだ」→ 構図は胸が前へ張り出した形だけ。
65. 「まあせっかく作った画像は無駄にしないようにね」
66. 「動くうちに絵は並行で生成した方がいいよ」
69. 「チャットGPTでGIFが作れるようになったよ。あとででいいので、GIFにした方がクオリティが上がるところを探しておいてね」（台帳 D11）
70. 「生成されたものが正しくて、加工すると変になってますよ」→ 開いた絵は生成した1枚をそのまま見せる。
73. 「露出の線を越えてもよいです」
74. 「新しい衣装とギミックの提案です。ぴったりとして薄手の素材の、ジムウェア、Yシャツ、Tシャツ　胸の先端が徐々にとがっていくギミックをお願いします」＋「エアリズム風肌着も追加で」
75. 「おそらく胸のとがった絵は生成拒否されるので、こちらでうまく加工が必要です」
76. とがり方の決まり（全部スキル panyu-tip-outfit）：置く場所は胸のいちばん高い所（元の絵に出っぱりがあればそこ。真ん中ではない）、丸みに合わせて歪む、黒み・白いつやNG、透けは突端だけ（1段目は透けない）、1段目は大きく柔らかく、突端は固そうに斜め上へ（高すぎ→下げた）、へこんで見えない・二つに見えない、「色が濃いだけに見える」のはNG（陰影で立体感）、「ピンクが強すぎ。服の色を生かす」。Tシャツは透けすぎ→ tipSee 0.3。
77. 構図：「顔を隠す」は難しいので「両手で顔を少し挟むくらい」、もう一つ「もの凄く恥ずかしそうに両手の手首を合わせて頭上にあげるポーズ」。背景は「衣装ごとの場所に」（ジムウェア＝ジム、Yシャツ＝夜の部屋、Tシャツ＝朝の寝室、肌着＝湯上がりの洗面所）。
78. ホルターの楽屋は「書き直し版の方がきれい」。
79. 「プールも楽屋も三段階じゃないと少しおかしい」＋「1段目と2段目は加工でどうにかならない？時間がかかりすぎるかも」→ 加工の三段階（openStage）。
80. 「3回おきくらいに小さなエフェクトを突起周りに」→「小さすぎて見えません。キュンキュンしたことが分かるエフェクトを」→ ハート3つ＋輪＋光。
81. 「揺れる範囲の位置判定が甘いので胸の上の方が固かったり、腕まで歪んだり」「胸が上向きか下向きかによって揺れの中心位置を変えるべき」「そもそも揺れる範囲は楕円です。正円でやろうとすると破綻します」「胸の形の網を3Dでとらえられるように努力してください」
82. 「その辺りの微調整もしっかりスキルのうちに入れておいてね」「できたらスキル化しておきましょう」
83. 「写真じゃ動きはわかりませんよ」→ 動きは遊べるリンクで見せる。
84. 「下からずり上がってきて下乳が出てくるギミックの水着もできますよね？」（D14）
85. 「実機検証をスマホでやってみましたが、短すぎるし文字が大量で没入できませんでした。エンドレス没入モードがあった方がいいですね」「ゲームパッド対応で左右のスティックで胸を動かせるようにしましょうね」（D15）

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1–185 | （#20 までの訂正。section 3・4・6・7 とメモリに反映済み） | — |
| 186 | ナースの開いた絵でボタンが1つ残った版をそのまま使いかけた | 描き直して全部外れた版に（採用済み） |
| 187 | プールのパジャマ・ゴスロリを前の会話の絵（公式と違う：灰色・ベスト風）のまま使いかけた | 開いた絵から「留めた絵」を描かせて公式にそろえた |
| 188 | ホルターの外れた絵が胸が出すぎと判断して控えめに描き直そうとした | 「露出の線を越えてもよい」（描き直し版の方がきれい、で採用） |
| 189 | とがる所を灰色の影・白いつやで描いた | 薄いピンク→のちに「ピンク強すぎ、服の色を生かす」 |
| 190 | 突端を細く・低く→高すぎ→突端の中を濃くしてへこんで見えた | 突端は中を明るく、影は外の右下だけ。高さは2段階下げた値で承認 |
| 191 | 胸の先を真ん中や頂点からずれた所に置いた（ジムウェア外れ、Yシャツ外寄り） | 元の絵の出っぱりの位置／いちばん高い所。丸みで楕円に歪ませる |
| 192 | 元の絵の出っぱりと描き足しがずれて二つに見えた | 元の出っぱりを周りの色でならしてから描く |
| 193 | 揺れる範囲を正円・中心ずれで置いた（胸の上が固い・腕が歪む・プールが斜めに歪む） | 傾いた楕円＋丸い山（dome）、腕は傾いた keep、中心は谷間から左右対称 |
| 194 | 直ったかを押した瞬間の写真で見せようとした | 写真では動きは分からない。遊べるリンクで渡す |
| 195 | 書き足したコメントの中に `let a` を飲み込ませ、揺れが全部止まる不具合を入れた（配信前に発見） | 宣言を // の後ろに入れない（スキルに記載） |
| 196 | Tシャツを「胸が張っている」と頼んで ChatGPT に断られた | 普通の服の言い方で頼む |

## 6. Decisions
| Decision | Why |
|---|---|
| 構図違いは「衣装@構図」のキー。開くたびに構図を1つ選ぶ（前回と同じは続けない） | ユーザー「もっと構図も衣装も増やす」 |
| 構図は胸が前へ張り出した形だけ（元の構図・楽屋・プール・頬をはさむ） | 規則64 |
| 楽屋・プールの前開きは開いた絵1枚＋加工の三段階（openStage：真ん中の縦の筋だけを外したボタンの所まで見せ、下はすぼまる） | 規則79 |
| 肩紐の衣装（水着・ホルター・白サテン・ドレス）の楽屋は、外れた絵をそのまま（三段階にしていない） | 筋の加工が合わない |
| とがる衣装は生成せずシェーダーで陰影を描き足す（tip 24回で満タン） | 規則75 |
| 揺れる範囲 pose.cups は [x,y,横,縦,傾き] の楕円、dome 0.6 | 規則81 |
| とがる衣装の交換所：ジムウェア 1300（グラーノ後）、Yシャツ・Tシャツ 1400、肌着 1500（ヴェルベット後） | Claude が決めて配信（異論なし） |
| エンドレス没入モードは新しい会話（panyu-immersive）で作る | ユーザー「新しい会話で」 |
| DLsite 版は Electron（app://）で exe。作り直しは全部詰めてから最後に1回 | 規則56 |

## 7. Changed / rejected
- 開いた絵は「1枚で十分」→ 三段階（生成で途中の絵）→ 加工の三段階（openStage）。openSteps（生成した途中の絵を替える仕組み）はコードに残るが使っていない
- 揺れる範囲：正円 → 傾いた楕円＋dome
- とがる所の色：灰色・白いつや → 薄いピンク → 服の色のまま陰影
- 3回ごとの効果：小さなきらめき → ハート＋輪（キュンッ）
- 構図「顔を覆う」→ 「両手で頬をはさむ」
- ベッド・卓の構図 → やめた（一枚絵用に assets/_source_png/panyu_poses/ にしまった）
- 開いた所の形（ひし形・V字の加工）→ ChatGPT の開いた絵をそのまま
- ❌ mimi_gamble_guild の計算の優先度を下げる／止める
- ❌ 動きの確認を写真で済ませる
- ❌ 「胸が張っている」等の言い方で ChatGPT に頼む（断られる）
- ❌ 六角に顔の切り抜きの紋章案、「省略をなくす」、スマホの小窓の文字を縮める、ぱにゅぱにゅの紋章候補（プリン・ハート・トルソー・リボンのハンガー）
- 段2の声の台詞108行の案 → 保留（docs/design-ref/panyu-voice-lines.md）

## 8. Data & facts (exact)
| 項目 | 値 |
|---|---|
| 最新の配信の版の印（index.html の ?v=） | 20261108c |
| 網目のページの版（PANYU_MESH_V, game.js） | 20261108c |
| 最新コミット（main） | c79c831 の後に台帳だけのコミット1つ |
| 公開URL（Web版） | https://takakazuaikawa-hue.github.io/tousatsu-mimi/ |
| リポジトリ | takakazuaikawa-hue/tousatsu-mimi |
| PANYU_POSES（game.js） | bunny/vintage/pajama/gothic/jirai/nurse/santa: ['', 'dressing', 'pool']、bikini/halter/white/dress: ['', 'dressing']、gym: ['', 'cheek'] |
| ぱにゅぱにゅ衣装 | bunny, pajama, pajama2, gothic, jirai, vintage, nurse, santa, bikini, halter, white, dress, gym, yshirt, tshirt, inner（16着） |
| 構図の絵のファイル名 | assets/characters/panyu_<衣装>_<構図>_reach.webp（1400×788）、開いた絵 _open.webp |
| 揺れる範囲（pose.cups） | とがる元構図 [[598,600,105,92,8],[805,600,105,92,-8]]、楽屋 [[650,590,100,72,-12],[850,590,100,72,12]]、プール [[680,485,62,74,-15],[795,485,62,74,15]]、頬 [[595,605,110,100,10],[810,605,110,100,-10]] |
| keep（動かさない所） | プールの腕 [614,548,26,88,-20]/[858,548,26,88,20]、楽屋の腕輪 [522,540,46,62]/[985,540,46,62]、手 [655,728,92,46]/[848,724,92,46]、とがる元構図の腕 [452,522,55,45]/[950,522,55,45]、頬 [418,560,58,95]/[990,560,58,95] |
| 胸の先 tipP | ジムウェア [[561,595],[835,596]]、Yシャツ [[561,593],[836,591]]、Tシャツ [[574,546],[826,546]]、肌着 [[565,600],[835,600]]、ジム頬 [[564,622],[847,622]] |
| とがる値 | tip 24、tipR 13、cap (-0.045,-0.075)、tipQ 0.66、tipSee（Tシャツ 0.3） |
| openStage | 楽屋 [70, 1つ目と2つ目の間, 2つ目と3つ目の間, 9]、プール [44, …, 6] |
| 交換所 | pwear_gym 1300（grano）、pwear_yshirt 1400・pwear_tshirt 1400・pwear_inner 1500（velvet） |
| ぱにゅの当たり | N ぷに×1 w55 / R ぱにゅ×2 w28 / SR とろけ×3 w12 / SSR きらめき×5 w4.5 / LEG ぱにゅ神×10 w0.5、天井10回、1日5回コイン（基本30） |
| DLsite 版 zip | dist/dlsite/Mimi_Texas_Holdem.zip（表記変更前のビルド。作り直しが必要） |
| Electron / packager | electron 44.9.0、@electron/packager 20.3.0、exe 名 MimiTexasHoldem |
| 権利表記 | '© 2026 POMERASHIBA Studio'、スタッフロール「制作・著作　ポメラシバスタジオ」 |
| 文字の段 | スマホ最小14px。type-roles.css が唯一の決め所 |
| 検査ブラウザ | QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 |
| ffmpeg | WinGet の Gyan.FFmpeg（PATH に ffmpeg あり） |

## 9. People, terms & names
- **People:** ミミ（主人公・新人バニーディーラー）、リコ先輩、ポルカ、セリナ、グラーノ、ヴェルベット。どっと（HP担当）。
- **Terms:** ぱにゅぱにゅ、網目＋ばね、留め、構図違い（衣装@構図）、楽屋（dressing）、プール（pool）、頬（cheek）、とがる衣装（tip）、1段目・突端、キュンッ、三段階、没入モード、ほろ酔いの夜（クリア後の二週目の案）
- **Names in use:** docs/design-ref/panyu-mesh.html（OUTFITS、DRS(...)・PLS(...)・STR(...)・TIP_POSE・CHEEK_POSE、uTipP/uTipC/uTipR/uTipQ/uTipS、uOpenCut、?tip=0〜1、?dbggrid=1、window.__panyuZone・__panyuDbg）、game.js（PANYU_OUTFITS・PANYU_OUTFIT_IMG・PANYU_POSES・PANYU_MESH_V）
- **道具:** qa/panyu-tools/align3.mjs（生成絵を元の絵に合わせる）・fit1400.mjs・gridzoom.mjs・ofshot.mjs（留めを外す流れ）・tipshot.mjs（とがる0/0.5/1）・zoneshot.mjs（揺れる範囲を絵に重ねる）・framesshot.mjs（押した直後の連続撮影、g で方眼）、qa/panyutip.mjs（本編で24回押す、again で2回開く）、qa/panyupose.mjs
- **スキル:** ~/.claude/skills/panyu-tip-outfit（とがる衣装・揺れる範囲・三段階）、chatgpt-image-gen、panyu-skin-check、game-text-layout、irodori-voice

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| 楽屋：前開き6着（パジャマ・ゴスロリ・地雷系・古着・ナース・サンタ）＋肩紐4着 | 済・配信 | _dressing_reach/_open.webp | 前開きは加工の三段階 |
| プール：前開き6着 | 済・配信 | _pool_reach/_open.webp | パジャマ・ゴスロリは閉じた絵を描き直し |
| とがる衣装4着（ジムウェア・Yシャツ・Tシャツ・肌着） | 済・配信 | panyu_<id>_reach.webp | 交換所あり |
| 頬をはさむ構図 | ジムウェア（夕方のジム）のみ済・配信 | panyu_gym_cheek_reach.webp | Yシャツ（夜の部屋）・Tシャツ（朝の寝室）・肌着（湯上がりの洗面所）は未。元絵 qa/panyu-tools/src_gym_cheek.png・src_gym_cheek_bg.png |
| 手首を合わせて頭上へ×4着 | 未 | — | |
| D15 エンドレス没入モード＋ゲームパッド（左右スティック） | 別の会話 panyu-immersive で作業中 | — | 終わったら D14 へ進んでよいと伝えた |
| D14 ずり上がる水着 | 未 | — | |
| 見比べページ | 更新済み | https://claude.ai/artifact/1RXpnoGHwqoYuwAMVZg6dq | |
| ベッド・卓の5枚 | しまった | assets/_source_png/panyu_poses/ | 一枚絵として使う予定 |
| 段3（アルバム）／ほろ酔いの夜（D10）／衣装・交換所・コレクション／5時間の検証／D8／DLsite 版の作り直し | 未 | — | この順 |

ChatGPT の自動操作（chatgpt-image-gen スキル）：タブは1つ。`chatgpt.com/` を開き、contenteditable を待ってから body に `input type=file`（id ccslot・aria-label「cc upload slot」）を足す → find → file_upload → その files を DataTransfer で入力欄へ paste、文も paste → 長さと `form img` 数を確かめて `button[aria-label="送信"]` を JS で click。描き終わり（「編集」ボタン）を待ち、`/api/auth/session` の accessToken で `/backend-api/conversation/<id>` → `/backend-api/files/download/<file>?conversation_id=<id>&inline=false` の download_url を fetch→a.download。タブが固まったら閉じて新しいタブで開き直す。scratchpad の素材は会話ごとに消えるので作り直す。

## 11. Next steps
1. **Next action:** 頬をはさむ構図の Yシャツ（夜の部屋）を ChatGPT で描く（src_gym_cheek_bg.png を添付し、衣装を Yシャツ・背景を夜の部屋に替える依頼）→ align/fit → zoneshot と gridzoom で tipP/tipC を測る → OUTFITS['yshirt@cheek'] と PANYU_POSES に足して配信。続けて Tシャツ（朝の寝室）・肌着（湯上がりの洗面所）。
2. 手首を合わせて頭上へ×4着（背景は衣装ごとの場所）。
3. panyu-immersive の会話の結果（没入モード・ずり上がる水着）を確かめる。
4. 段3（アルバム・一枚絵5枚の使い道・未見の印）→ ほろ酔いの夜の案を表で見せる → 衣装・交換所・コレクション → 5時間の検証 → D8 → DLsite 版を作り直す。

## 12. Open questions ⚠️
- 一枚絵5枚（ベッド・卓）の使い道：ぱにゅぱにゅのご褒美のアルバムでよいか（未回答）
- ほろ酔いの夜：相手ごとの酔い方・解放条件・ご褒美（案を表にして見せる予定）
- 段3の背景：1枚を全衣装で使うか、構図ごとに替えるか（未回答）
- 親密度のご褒美に新しい一枚絵を作るか（未回答）
- 販売前の決めごと（未回答）：無料の Web 版を止めるか／年齢区分／AI区分／価格／問い合わせ先／コード署名／体験版の共有先URL
- GitHub の古い枝（panyu-release・mobile-text-standard・trial-share など）・手元の claude/sweet-euler-qwzxua を消すか
- 体験版（納品済み）を新しい表記で作り直すか

## 13. Re-attach checklist
- Nothing to attach.（必要な物は全部 C:\Users\takakazu\projects\mimi_porker の中）

---
<sub>Audit: 13/13 sections · 85 rules · 196 corrections · 40 data points · secrets removed: none found · generated by active-memory</sub>
