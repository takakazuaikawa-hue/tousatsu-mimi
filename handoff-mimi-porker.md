# active-memory handoff: ミミのテキサスホールデムポーカー（DLsite 販売の仕上げ・ぱにゅぱにゅの構図と衣装を増やす）

**Handoff #23** · 2026-11-08 · Lineage: #1 (2026-10-02): 有料級品質への改修ループ。AI是正・研修作り直し・読み合い11種類・話す顔・Higgsfield 動画まで配信; #2 (2026-10-12): スマホの文字の基準、心理バトルの炎、ぱにゅぱにゅ「網目＋ばね」試作、ホームはリコ先輩主役の方針; #3 (2026-10-12): 触り比べ試作の大改修; #4 (2026-10-12): お腹の開き、衣装5着、ドレスの巻き返り; #5 (2026-10-13〜14): パジャマ・ドレスの胸元作り直し、ホルター・白サテン、PR#10 積み直し; #6 (2026-10-14〜15): 本編埋め込み配信、新衣装4着、うさ耳、横向きスマホ; #7 (2026-10-15): ナースの当て布、肌検査をスキル化、ホームを時計の裏の舞台に; #8 (2026-10-15〜16): ホームの段階・開幕の儀・動き・アイコン、小窓20種の統一; #9 (2026-10-16〜20): ご褒美CG描き直し、声第1弾101本、ホーム3DCG風部品、オフラインパック; #10 (2026-10-20): 読み合い11種、声に感情、幕間・エンディングのカメラ; #11 (2026-10-20〜21): 交換所を全面作り替え; #12 (2026-10-21): 額の肖像6人・対戦中の音量の小窓; #13 (2026-10-21〜23): 読み合いを「卓の本当の手の勝負・決着後に答え合わせ」に、文字の段を全画面へ; #14 (2026-10-24〜27): 異議あり・iPhone 16e・本気のリコの卒業試験・声201本; #15 (2026-10-27〜28): 読み合い残り全部を本当の手に、type-roles.css の1か所に、文字とレイアウトのスキル化; #16 (2026-10-28〜30): 零時の卓の考え方、苦戦の一枚絵、ファイブポーカー、ご褒美CG差し替え; #17 (2026-10-30〜31): ホームの動き・ロード画面、セリナのご褒美CG2枚＋秘蔵2枚、live-cg.js、販売前の点検、iPhone の zoom→scale; #18 (2026-10-31〜11-02): 容疑者しぼり2問、Codex 辛口試遊1〜13回、体験版、Pages を Actions に; #19 (2026-11-02〜11-07): Codex 辛口14〜16回、声の残り、DLsite 版（Electron）、遷移の透け、省略の全文吹き出し、作業場所を main に、ポメラシバスタジオ表記、ロビーの紋章の札、メモリの手放し、ぱにゅぱにゅ段1・遊び方3つ・揺れ方3つ; #20 (2026-11-07): ぱにゅぱにゅの構図違いの仕組み（衣装@構図）、バニーの楽屋・プール、楽屋×前開き6着、ベッド・卓はやめて一枚絵用にしまう、ChatGPT の自動操作の新しいやり方、ほろ酔いの夜の案（20261107j）; #21〜22 (2026-11-07 夜〜11-08): 楽屋とプールを配信、とがる衣装4着と仕組み・スキル panyu-tip-outfit、頬をはさむ構図（ジム）、楽屋・プールの加工の三段階、キュンッ（20261108c）。没入モードは別の会話 panyu-immersive（20261108f で配信済み）; #23 (2026-11-08): とがる色＝服の色＋薄ピンク少し、揺れる範囲の大混乱→最終的に「バニーの元の構図のやり方＋胸の向き face」（20261108n）、範囲の検査道具 weightshot.mjs、頬のYシャツを配信、生成した絵14枚の仕分け（ぱにゅ用・CG集行き9枚）、台帳 D16〜D19

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
- 作者・プロデューサー。絵・文言・声の採否は自分で決める。品質に非常に厳しい。作業中の画面（ツールの結果の写真）を見ていて、途中で指摘を次々に送ってくる。スマホ実機でも遊ぶ。
- **ChatGPT の会話に自分で注文を足す**ことがある（同じ Chrome のタブで「ダブルピースにしましょう」「もっと身体の質感をリアルに」など）。それは正しい注文。その後の最新の絵を採る。自分で選んだ絵を画像で送ってくることもある（「これがいちばんよかったね」）。
- Windows 11、PC（CPU 4つ、メモリ16GB）。Claude デスクトップアプリ（Code）、Chrome、ChatGPT（月額）、Codex アプリ、Higgsfield を使う。
- 別のプロジェクト mimi_gamble_guild の計算を同じ PC で回すことがある（止めない）。
- 体験版は HP 担当の「どっと」さんが公開する（こちらは公開しない）。

## 3. Style & communication
- **Language:** 全部日本語（経過・作業中の一言まで）。
- **Tone:** 丁寧で短く、やさしい言葉。専門用語は言い換える。
- **Reply length:** 区切りごとに要点だけ。長い報告は見出し＋箇条書き＋表。
- **Formatting:** 見出しと箇条書き、表。絵文字は使わない。ファイルはリンク（[名前](相対パス)）。見た目の確認は写真（SendUserFile）か Artifact、**動きの確認は本番の遊べるリンク**（`https://takakazuaikawa-hue.github.io/tousatsu-mimi/docs/design-ref/panyu-mesh.html?c=<衣装>%40<構図>`、**`&tip=1` は付けない**）。localhost を渡さない。
- **Working style:** 決まった残りは聞かずに進める。聞くのは絵・文言・声の選択と、外に見える操作だけ。聞く時は中身（案の要点・写真）を見せる。**揺れる範囲を変える時は weightshot の写真を見せて許可を取ってから配信**。作り終えてから1回撮って確かめる。裏の作業の知らせが来たら止まらずに次の手を打つ。区切りで台帳と引き継ぎを書き換える。ChatGPT が動くうちは並行で絵を描かせ続ける（「無駄な時間に生成すべき絵は本当にありませんか？」）。微調整の決まりは必ずスキルに入れる。さっきと重なる指示の時はやりすぎない。
- **Avoid:** 安っぽい見た目、キャラを丸で囲む、文字だけの説明、語の途中の改行、14px 未満の文字、確かめずに「済」と言うこと、動きを写真で見せること、頼まれていない所まで広げる・替えること。

## 4. Hard rules (word for word)
（#19 までの 1〜60、#22 までの 61〜85 はそのまま有効。主なもの）
1. 「キャラクター表示を〇で囲むのは安っぽくて好きになれません」
2. 「経過も日本語でお願いします」／返事の頭に「Yes Boss!」。
3. 紫系の色を UI に新しく足さない。
4. 配信：main に push で GitHub Pages。index.html の `?v=` を上げ、網目のページを直したら game.js の `PANYU_MESH_V` も。配信後は gh run と本番を curl で確かめる。「直したら配信してね」
5. 検査ブラウザ（headless）は同時に1つだけ。
6. 「スマホは横画面固定ですよ」
7. 「ミミはバニーガールですから耳がないのは全部NGですよ」
8. 露出の線：乳首は描かない（「露出の線を越えてもよいです」）。
9. 「何よりも大事なのはクオリティです」
11. 絵の作り直しは候補をユーザーに見せて選んでもらってから差し替える。
15. 「意味ないのが面白い…勝手に変えないでください」（ぱにゅぱにゅ）
16. 「良いですか？と聞くのなら見せてください」
20. サブエージェントは Sonnet。
22. 「声も画面も私にちゃんと提示できるリンクを渡してください」
27. 「進めるに決まってることを聞かないでください」
29. 「検証に余計な時間を使わないでください。できてから撮影検証でしょ？」
51. 作業場所は `C:\Users\takakazu\projects\mimi_porker` の main だけ。配信は `git push origin main`。
56. DLsite 版の作り直しはすべて追ってから最後に1回。
60. mimi_gamble_guild には触らない。止めるのは自分の作業のプロセスだけ。
63. ChatGPT は送ったら描き終わるまで会話の画面のまま待つ。
64. 構図は胸が前へ張り出した形だけ。
65. 「せっかく作った画像は無駄にしないようにね」
#23 で増えたもの：
86. とがる色：「服の色のまま明るく・暗くするだけというのは誤りです。単に黒くなっていくだけに見えてしまいます。濃くしたいなら服の色を生かしながら、ほんの少し中の薄ピンクを足す処理がよいです」→「もう少し濃く」→「とがるじゃなくてへこんで見えてます」（突端の中は濃くしない）。
87. 「最も大事なのは、胸をすべてカバーしていることです。それだけまずは守りましょうよ」
88. 「最初のバニーなんかはよくできています」「同じ構図なら適用していいですけど、違う構図はまずいと思いますよ」「過去のものはうまくいってるのでそれを踏襲してください」「胸の上向き下向きの角度だけ考慮して」
89. 「私の許可を見てからにしようか」（範囲の変更）
90. 「何で横と下も広げるのよ」／「大きくとってあとからわたしにしてきされるくらいがちょうどよいですよ」
91. 「さっきと重複した指示だった場合はやりすぎないようにね」
92. 「絵の生成に、ちゃんとミミの最初の元絵を入れないから、どんどん離れていってしまってますよ」→ 毎回 assets/characters/mimi_default.webp を1枚目に添付。
93. 「Yシャツはボタン外すギミックも同時に入れましょうね」
94. 「生成してくれた画像は、全部ポーズが同じなのはもったいないから変えようか」
95. 一枚絵：「一枚絵はセットにして交換所で変えるようにしましょう。コイン交換で、コレクションに載って、いつでも見られるようにね」
96. 零時の卓：「誰から回ってきたのかわかりにくいしスピード調整もどこでやればいいのかわかりにくいし、何より参加料をとる方式のため自由に参加できないというのが悪い点でした」「プロと同じ手を選んでも早々にオールインで敗退するのは納得がいきません。周りの戦況を見るプロの手が組み入れられていない」
97. 「5ポーカーがごちゃごちゃしすぎててやりにくかったな」

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1–196 | （#22 までの訂正。section 3・4・6・7 とメモリに反映済み） | — |
| 197 | とがる所の影を服の色の掛け算で暗くした | 服の色を生かし薄ピンクを少し足す（pinkT） |
| 198 | 薄ピンクを突端の中に増やして濃くした | 突端の中は濃くしない（へこんで見えた） |
| 199 | 渡すリンクに `&tip=1` を付けた | 初期状態がとがって見えた。リンクに付けない |
| 200 | 揺れる範囲を楕円にした時、網目のシェーダー側を古い丸（縦の半径）のままにした | 範囲が半分に縮み「先しか動かない」。cup() と meshAt() を同じ式に |
| 201 | 範囲を輪郭ぴったりの小さい楕円＋中を弱める加工（dome・洋ナシ）にした | 胸をすべて覆うのが最優先 |
| 202 | うまくいっているバニーの元の構図まで替えかけた | 変えない |
| 203 | 違う構図にバニーの数字をそのまま当てはめた | 違う構図はまずい（やり方を踏襲し、胸の大きさに合わせる） |
| 204 | 横と下まで広げた | 広げるのは上だけ（のちに方針ごと変更） |
| 205 | 許可を取らずに範囲を変えた | 写真で許可を取ってから |
| 206 | `//` を足して行の残り（keep 等）をコメントにしかけた | 宣言・値を `//` の後ろに入れない |
| 207 | 書き換えの終わりの目印を誤り、とがる衣装の定義まで消した | 行単位で置き換え、直後に定義の有無を確かめる |
| 208 | シェーダーに uFace（float）を足したら顔の絵の sampler uFace とぶつかりページが止まった | uFaceDir に改名 |
| 209 | 生成係への依頼文に公式の元絵を入れず、生成した絵を元に次を描かせた | 毎回 mimi_default.webp を1枚目に |
| 210 | 範囲を広げたら揺れも大きくなった | 形とは別に揺れの大きさ rPhys を下げる |
| 211 | つかめる範囲が服の形（三角）になっていた | 胸の形で |

## 6. Decisions
| Decision | Why |
|---|---|
| 揺れる範囲＝バニーの元の構図のやり方（胸より一回り大きい丸を胸の中ほどに、なだらかに弱める）＋胸の向き face だけ | ユーザー（規則88） |
| とがる色＝pinkT（明るさは服のまま色みだけ薄ピンクへ）。突端の中は濃くしない | 規則86 |
| 揺れの大きさは rPhys（形の半径とは別） | 範囲を広げると揺れが大きくなりすぎた |
| 頬の構図に Yシャツ（夜の部屋）を足して配信 | 頬ジムに位置合わせ済み・範囲は頬と同じ |
| ぱにゅぱにゅ用に使う絵：1・5・6・7・12・13（下の表） | ユーザーが仕分け |
| CG集行き：2・3・4・8・9・10・11＋ユーザーが送ったダブルピース2枚＝9枚 | ユーザー「CG集行きで」 |
| 生成係は毎回 mimi_default.webp を1枚目に添付し、新しいタブで描く（ユーザーの会話に送らない） | 規則92・会話のぶつかり |

## 7. Changed / rejected
- 範囲：正円 → 傾いた楕円＋dome → 洋ナシ型（pear）→ 大きく → 上だけ伸ばす → edge（線の外で弱める）・edgeUp・hitUp → 楕円寄り → **バニーのやり方＋face**（最終）。pear/edge/edgeUp/hitUp/dome/feelMul の仕組みはコードに残る（feelMul は楽屋の肩紐で使用中）
- とがる色：服の色のまま明暗 → 薄ピンクを少し足す（pinkT）
- 頬の3枚（Tシャツ・肌着）は「ポーズが同じでもったいない」→ ポーズ替え（腰に手・後ろ手・伸び）
- 6番・13番はユーザーが自分で選んだ絵に（生成係の描き直し q1〜q3・r1 は使わない）
- ❌ バニーの元の構図（PZ 既定）を変える
- ❌ 違う構図にバニーの数字をそのまま当てる
- ❌ 範囲の横と下を広げる
- ❌ 押す前から元の絵の出っぱりをならす（不具合ではなかった）
- ❌ 動きの確認を写真で済ませる／`&tip=1` 付きのリンク
- ❌ 「胸が張っている」「胸を張って」等の言い方で ChatGPT に頼む（断られる）

## 8. Data & facts (exact)
| 項目 | 値 |
|---|---|
| 最新の配信の版の印（index.html の ?v=、game.js の PANYU_MESH_V） | 20261108n |
| 公開URL（Web版） | https://takakazuaikawa-hue.github.io/tousatsu-mimi/ |
| リポジトリ | takakazuaikawa-hue/tousatsu-mimi |
| PANYU_POSES（game.js） | bunny/vintage/pajama/gothic/jirai/nurse/santa: ['', 'dressing', 'pool']、bikini/halter/white/dress: ['', 'dressing']、gym: ['', 'cheek']、yshirt: ['', 'cheek'] |
| ぱにゅぱにゅ衣装 | bunny, pajama, pajama2, gothic, jirai, vintage, nurse, santa, bikini, halter, white, dress, gym, yshirt, tshirt, inner（16着） |

揺れる範囲（docs/design-ref/panyu-mesh.html）
| 構図 | cups | face | rPhys | keep / その他 |
|---|---|---|---|---|
| 元の構図（PZ 既定・バニー等） | [[607,600,132],[795,600,132]] | 0 | 132（=r） | 変えない |
| とがる元構図 TIP_POSE（gym/yshirt/tshirt/inner） | [[607,600,132],[795,600,132]] | 0 | 95 | keep [[465,455,50,110,-20],[935,455,50,110,20]]（脇から肩・体の横） |
| 頬 CHEEK_POSE（gym/yshirt@cheek） | [[597,613,132],[806,613,132]] | 0 | 78 | keep [[470,460,40,185,45],[930,460,40,185,-45]]（前腕）、hitR 0.95 |
| 楽屋の前開き（DRS 6着） | [[652,597,117],[848,597,117]] | 30 | 60 | 手と腕輪の keep（元のまま） |
| 楽屋の肩紐（bikini/halter/white/dress@dressing） | [[655,615,108],[842,615,108]] | 30 | 38 | feelMul {k:0.85,c:1.35,push:0.7}（もっちり） |
| プール（PLS 6着） | [[678,493,89],[800,493,89]] | 35 | 40 | 腕の keep（元のまま） |
- face：動く中心を r×0.15×sin(face) 下げ、付け根→先の重み t の起点を (0.95−0.35·sin(face)) に。
- hit()：zoneRho < (hitR||1.2)、かつ keepAt(x,y) ≤ 0.25 の所だけつかめる（手・腕の上ではつかまない）。
- とがる色：pinkT(c,a)＝PK(1.0,0.80,0.84) を服の明るさに合わせて混ぜる。deep＝pinkT(col*0.95, 0.24+0.20*uTipS)、透け 0.13、突端の中 pinkT(col,0.6)*1.02 を 0.25、しわ pinkT(col*0.96,0.10)。
- 頬のYシャツ：OUTFITS['yshirt@cheek'] tipP [[566,620],[845,620]]、tipC [[600,650],[815,650]]、絵 assets/characters/panyu_yshirt_cheek_reach.webp（align3 で頬ジムに合わせた）。**OUTFITS.yshirt の定義より後に書く**。

生成した絵（qa/panyu-tools/）
| 番号 | 中身 | ファイル | 行き先 |
|---|---|---|---|
| 1 | 頬・Yシャツ（夜の部屋） | src_yshirt_cheek.png | ぱにゅ（配信済み） |
| 5 | 手首を合わせて頭上・ジム | src_gym_wrists_a.png | ぱにゅ（未組み込み） |
| 6 | 肌着・ダブルピース（ユーザー選） | src_inner_peace_final.png（1672x941） | ぱにゅ（未） |
| 7 | Yシャツのボタン外し（元の構図） | src_yshirt_open_a.png | ぱにゅ（D19 の開いた絵、未） |
| 12 | Yシャツ・後ろ手・得意げ | src_yshirt_back_b.png | ぱにゅ（未） |
| 13 | Tシャツ・伸び＋目をこする（ユーザー選） | src_tshirt_stretch_final.png | ぱにゅ（未） |
| 14 | Tシャツ・伸び（身体は実写で） | src_tshirt_stretch_b.png | 未定 |
| CG集 9枚 | 2・3・4・8・9・10・11＋ダブルピース2枚 | assets/_source_png/cg_set/（cg_tshirt_cheek_morning, cg_inner_cheek_bath, cg_gym_wrists_1, cg_yshirt_open, cg_inner_hips_1/2, cg_yshirt_back, cg_inner_peace_2/3） | D17 |
- 予備：src_tshirt_stretch_q1〜q3・r1、src_inner_peace_q1〜q3（使わない）。

その他
| 項目 | 値 |
|---|---|
| 交換所 | pwear_gym 1300（grano）、pwear_yshirt 1400・pwear_tshirt 1400・pwear_inner 1500（velvet） |
| ぱにゅの当たり | N ぷに×1 w55 / R ぱにゅ×2 w28 / SR とろけ×3 w12 / SSR きらめき×5 w4.5 / LEG ぱにゅ神×10 w0.5、天井10回、1日5回コイン（基本30） |
| DLsite 版 | dist/dlsite/Mimi_Texas_Holdem.zip（作り直しが必要）、electron 44.9.0、@electron/packager 20.3.0、exe 名 MimiTexasHoldem |
| 権利表記 | '© 2026 POMERASHIBA Studio'、「制作・著作　ポメラシバスタジオ」 |
| 検査ブラウザ | QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 |
| 公式のミミ | assets/characters/mimi_default.webp（黒と赤のうさ耳カチューシャ、左のお団子と金の花の髪飾り） |

## 9. People, terms & names
- **People:** ミミ（主人公・新人バニーディーラー）、リコ先輩、ポルカ、セリナ、グラーノ、ヴェルベット。どっと（HP担当）。
- **Terms:** ぱにゅぱにゅ、網目＋ばね、構図違い（衣装@構図）、楽屋（dressing）、プール（pool）、頬（cheek）、とがる衣装（tip）、キュンッ、三段階、没入モード、CG集（一枚絵のセット）、ほろ酔いの夜
- **Names in use:** panyu-mesh.html（OUTFITS、TIP_POSE・CHEEK_POSE・DRS/PLS/STR、cup()（VS）・meshAt()・zoneRho()・keepAt()・hit()、PZ.face/rPhys/hitR/feelMul、FACE_S、uniform uFaceDir/uEA0/uEA1/uKA/uPear/uEdge/uEdgeUp/uDome、pinkT()）、game.js（PANYU_POSES・PANYU_MESH_V・panyuVariantImg＝panyu_<id>_<pose>_reach）
- **道具:** qa/panyu-tools/weightshot.mjs（実際に動く量を赤、水色＝範囲の線、黄色＝動きの外の端、赤紫＝つかめる範囲、50px 方眼）、align3.mjs（生成絵を元の絵に合わせて 1400x788 webp）、fit1400.mjs、gridzoom.mjs、tipshot.mjs（tip 0/0.5/1）、framesshot.mjs（押した直後）
- **スキル:** ~/.claude/skills/panyu-tip-outfit（範囲の最終決まり・値を末尾に追記済み）、chatgpt-image-gen（公式の絵を1枚目の決まりを追記）、panyu-skin-check、game-text-layout
- **メモリ:** panyu-zone-rules.md（範囲の決まり）、chatgpt-regen-lessons.md（公式の絵の教訓追記）

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| 揺れる範囲（全構図） | 配信済み | 20261108n | ユーザーが触って確かめる段階 |
| とがる色 | 配信済み | 20261108g〜 | |
| 頬・Yシャツ | 配信済み | 20261108m | |
| D19 Yシャツのボタン外し（7番） | 未 | src_yshirt_open_a.png | 元の構図の開いた絵に。留め3つ＋楽屋と同じ加工の三段階。panyu-skin-check を通す |
| 新しい構図4つ（5・6・12・13） | 未 | 上の表 | 1枚ずつ fit1400（または位置そのまま）→ 範囲をバニーのやり方＋face で → weightshot の写真で許可 → 配信。背景は衣装ごとの場所のまま |
| 台帳 D16 零時の卓／D17 一枚絵セット（CG集9枚）／D18 ファイブポーカー整理 | 未 | docs/design-ref/backlog.md | |
| 段3（アルバム）／ほろ酔いの夜（D10）／衣装・交換所・コレクション／5時間の検証／D8／DLsite 版の作り直し | 未 | — | この順 |
| 手元 | 未コミットなし（qa/panyu-tools の生成絵は未追跡のまま） | | |

ChatGPT の自動操作（生成係＝Sonnet サブエージェントに任せる）：Skill chatgpt-image-gen を読む → **新しいタブを1つ** → `chatgpt.com/` → contenteditable を待つ → body に `input type=file`（id ccslot・aria-label「cc upload slot」、multiple）→ find → file_upload → DataTransfer で入力欄へ paste、文も paste → 長さと `form img` 数を確かめ `button[aria-label="送信"]` を JS で click → 「編集」ボタンまで待つ → `/api/auth/session` の accessToken → `/backend-api/conversation/<id>` → `/backend-api/files/download/<file>?conversation_id=<id>&inline=false` の download_url → a.download → Downloads から qa/panyu-tools へ移し写しを消す。JS の async が {} を返す時は window 変数経由。**依頼文に毎回「1枚目は公式のキャラクター（ミミ）の絵…」と mimi_default.webp の1枚目添付を書く**。

## 11. Next steps
1. **Next action:** D19 Yシャツのボタン外し：src_yshirt_open_a.png を panyu_yshirt_reach.webp に align3 で合わせて panyu_yshirt_open.webp にし、OUTFITS.yshirt に留め3つ（parts）と open・openB・openStage（楽屋と同じ加工の三段階）を足す → tip（とがる）と同時に動くか tipshot・ofshot で確かめ → panyu-skin-check → 写真を見せて配信。
2. 新しい構図 5（頭上・ジム）・6（肌着ダブルピース）・12（Yシャツ後ろ手）・13（Tシャツ伸び）を1つずつ組み込む（PANYU_POSES に構図名を足す、範囲はバニーのやり方＋face、keep で腕・手を止める、weightshot で許可）。
3. 台帳の D16〜D18、段3（D17 の一枚絵セットと一緒に設計）→ ほろ酔いの夜の案を表で見せる → 衣装・交換所・コレクション → 5時間の検証 → D8 → DLsite 版を作り直す。

## 12. Open questions ⚠️
- 14番（Tシャツ・伸び「身体は実写で」src_tshirt_stretch_b.png）の行き先：CG集か、使わないか（未回答）
- 新しい構図4つの構図名（例：wrists／peace／back／stretch）と、それぞれをどの衣装の構図として出すか（5＝gym、6＝inner、12＝yshirt、13＝tshirt の想定。ユーザー未確認）
- 段3の背景：1枚を全衣装で使うか、構図ごとに替えるか（未回答）
- ほろ酔いの夜：相手ごとの酔い方・解放条件・ご褒美（案を表にして見せる予定）
- 販売前の決めごと：無料の Web 版を止めるか／年齢区分／AI区分／価格／問い合わせ先／コード署名／体験版の共有先URL
- GitHub の古い枝・手元の claude/sweet-euler-qwzxua を消すか
- 体験版（納品済み）を新しい表記で作り直すか

## 13. Re-attach checklist
- Nothing to attach.（必要な物は全部 C:\Users\takakazu\projects\mimi_porker の中）

---
<sub>Audit: 13/13 sections · 97 rules · 211 corrections · 55 data points · secrets removed: none found · generated by active-memory</sub>
