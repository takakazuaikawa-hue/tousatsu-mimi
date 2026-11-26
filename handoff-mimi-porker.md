# active-memory handoff: ミミのテキサスホールデムポーカー（DLsite 販売の仕上げ・二周目「ほろ酔いの夜」づくり）

**Handoff #24** · 2026-11-08 · Lineage: #1 (2026-10-02): 有料級品質への改修ループ。AI是正・研修作り直し・読み合い11種類・話す顔・Higgsfield 動画まで配信; #2 (2026-10-12): スマホの文字の基準、心理バトルの炎、ぱにゅぱにゅ「網目＋ばね」試作、ホームはリコ先輩主役の方針; #3〜#8 (2026-10-12〜16): 触り比べ試作・衣装・肌検査スキル・ホームを時計の裏の舞台に・小窓の統一; #9〜#12 (2026-10-16〜21): 一枚絵描き直し、声、オフラインパック、読み合い11種、交換所作り替え、額の肖像; #13〜#15 (2026-10-21〜28): 読み合いを本当の手の勝負に、文字の段（type-roles.css）、異議あり・卒業試験・声201本; #16〜#18 (2026-10-28〜11-02): 零時の卓の考え方、ファイブポーカー、live-cg.js、Codex 辛口試遊1〜13回、体験版、Pages を Actions に; #19 (2026-11-02〜07): Codex 14〜16回、DLsite 版（Electron）、作業場所を main に、ぱにゅぱにゅ段1; #20〜#22 (2026-11-07〜08): 構図違い（衣装@構図）、楽屋・プール、とがる衣装と panyu-tip-outfit、頬の構図、没入モード; #23 (2026-11-08): とがる色 pinkT、揺れる範囲を「バニーのやり方＋face」に（20261108n）、weightshot.mjs、台帳 D16〜D19; #24 (2026-11-08): D19 Yシャツのボタン外し（元の構図・頬・後ろ手）、新しい構図4つ、D16 零時の卓（誰から・速さ・参加費なし・ICM・開始2,000点）、D17 CG集5セット27枚、ずっとモードの＋−、D20 交換所の値段の段と「次の目標」、「ご褒美CG」→「一枚絵」、ほろ酔いの夜（二周目）の案を承認、夜のホームの絵2枚（20261108w）

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
- 作者・プロデューサー。絵・文言・声の採否は自分で決める。品質に非常に厳しい。作業中の画面（ツールの結果の写真）を見ていて、途中で指摘や新しい注文を次々に送ってくる（作業中の割り込みにも、今の作業を終えてから続けて応える）。スマホ実機でも遊ぶ。
- 自分の出した案（例：ほろ酔いの夜）を覚えていて、関係する設計では必ずつなげて考えることを期待している。
- ChatGPT の会話に自分で注文を足すことがある（同じ Chrome のタブで）。それは正しい注文。その後の最新の絵を採る。自分で選んだ絵を画像で送ってくることもある。
- Windows 11、PC（CPU 4つ、メモリ16GB）。Claude デスクトップアプリ（Code）、Chrome、ChatGPT（月額）、Codex アプリ、Higgsfield を使う。
- 別のプロジェクト mimi_gamble_guild の計算を同じ PC で回すことがある（止めない）。
- 体験版は HP 担当の「どっと」さんが公開する（こちらは公開しない）。

## 3. Style & communication
- **Language:** 全部日本語（経過・作業中の一言まで）。
- **Tone:** 丁寧で短く、やさしい言葉。専門用語は言い換える（例：ICM＝「賞金の見込み」）。
- **Reply length:** 区切りごとに要点だけ。長い報告は見出し＋箇条書き＋表。
- **Formatting:** 見出しと箇条書き、表。絵文字は使わない。ファイルはリンク（[名前](相対パス)）。見た目の確認は写真（SendUserFile）か Artifact、**動きの確認は本番の遊べるリンク**（`https://takakazuaikawa-hue.github.io/tousatsu-mimi/docs/design-ref/panyu-mesh.html?c=<衣装>%40<構図>`、**`&tip=1` は付けない**）。localhost を渡さない。
- **Working style:** 決まった残りは聞かずに進める。聞くのは絵・文言・声・値段・遊びの形の選択と、外に見える操作だけ。聞く時は中身（案の要点・写真・数字）を見せ、選択肢を並べる（AskUserQuestion）。絵の候補は比べ絵（qa/montage.mjs）で今の絵と並べて見せる。揺れる範囲を変える時は weightshot の写真で許可を取ってから配信。作り終えてから1回撮って確かめる。裏の作業の知らせが来たら止まらずに次の手を打つ。区切りで台帳と引き継ぎを書き換える。ChatGPT の生成は Sonnet の生成係に任せ、並行で描かせる。
- **Avoid:** 安っぽい見た目、キャラを丸で囲む、文字だけの説明、語の途中の改行、14px 未満の文字、確かめずに「済」と言うこと、動きを写真で見せること、頼まれていない所まで広げる・替えること、「ご褒美CG」という言い方。

## 4. Hard rules (word for word)
（#22 までの 1〜85、#23 の 86〜97 はそのまま有効。主なもの）
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
65. 「せっかく作った画像は無駄にしないようにね」
87. 「最も大事なのは、胸をすべてカバーしていることです。それだけまずは守りましょうよ」
88. 「最初のバニーなんかはよくできています」「同じ構図なら適用していいですけど、違う構図はまずいと思いますよ」「過去のものはうまくいってるのでそれを踏襲してください」「胸の上向き下向きの角度だけ考慮して」
89. 「私の許可を見てからにしようか」（範囲の変更）
92. 「絵の生成に、ちゃんとミミの最初の元絵を入れないから、どんどん離れていってしまってますよ」→ 毎回 assets/characters/mimi_default.webp を1枚目に添付（リコ先輩の絵なら rico_default.webp）。
#24 で増えたもの：
98. 開いた絵：「いったん閉じた画像出して、それを開く方がいいかも」（閉じた絵→同じ会話で深いV字に開かせる。見本なしで）
99. 「ぱにゅぱにゅずっとモードに寄りと引きのボタンがないから+と-で実装して」
100. 「全体的に交換所の値段の優劣をつけて、のめりこむまではちょっとずつ報酬がもらえるラインを見つけた方がいいよ。絶妙にあきらめきれないラインというか」
101. 「二周目の設定のことは考えてない？」「ほろ酔いの夜　案ってださなかった？」（値段・報酬は一周目→二周目→遊び込みで組む）
102. 「ご褒美というほどご褒美のCGでもないのでその表現はやめましょう」
103. 「二周目へはいる方法は、ホームでボタンから切り替える方法にしたいので、切り替え後のホーム画面背景も作ってほしいです」
104. 夜の劇場の絵：「おさけがない」（ほろ酔いの夜の絵にはお酒を入れる）

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1–211 | （#23 までの訂正。section 3・4・6・7 とメモリに反映済み） | — |
| 212 | 開いた絵を「大きく開いた見本」付きで ChatGPT に頼み、6回断られた | 見本なしで深いV字／閉じた絵を出してから同じ会話で開く（規則98） |
| 213 | 生成係が、ユーザーが ChatGPT に足した注文を他人の割り込みと見なした | ユーザーの正しい注文。最新の絵を回収する |
| 214 | 値段の段の案を一周目＋遊び込みだけで組んだ | 二周目（ほろ酔いの夜）を前提に（規則101） |
| 215 | ほろ酔いの夜の案を台帳に書いたまま見せていなかった | 関係する台帳の案は先に持ち出す（メモリ second-loop-horoyoi） |
| 216 | 「ご褒美CG」と呼び続けた | 「一枚絵」（規則102） |
| 217 | 人のいない夜の劇場をお酒なしで描かせた | お酒（グラス・シャンパンの桶）を入れる（規則104） |
| 218 | 小さいスマホで上の帯にボタンを足したら時計に重なった | 時計を左へ寄せて収めた（直してから見せる） |
| 219 | bash のヒアドキュメントで node の文字列に `\\` を書き、`\` が消えて正規表現が壊れた | 正規表現を含む書き換えは Write でファイルにしてから node で実行 |

## 6. Decisions
| Decision | Why |
|---|---|
| ほろ酔いの夜＝二周目。エンディング後、ホームの切り替えボタンで一周目⇔ほろ酔いの夜。コイン・衣装・CG集・ノートは全部持ち越し。5人を同じ順に、扉・幕間は酔った会話。ミミも酔って助言・心の声は「ふにゃ…」で読めず見込み%も出ない（上級者向け）。一枚絵 1人1枚（新規5枚）、報酬は一周目の1.5倍 | ユーザー承認（11/08） |
| 酔い方：リコ＝先生が外れ褒めて甘える／参加が広く強い時だけ黙る、ポルカ＝泣き上戸／ブラフが増えブラフの時は笑いが出る、セリナ＝眼鏡を外して饒舌・大胆／大きく賭け本当に強い時だけ口数が減る、グラーノ＝気前がよい／値段を考えずコールし続ける（ブラフ効かず強い手で稼ぐ）、ヴェルベット＝圧が色気に／オールイン連発・酔うほど雑 | 同上 |
| 夜のホームの絵：ほろ酔いのリコ＝候補 scene_2、人のいない劇場＝お酒を足した候補2 | ユーザーが選択 |
| 切り替えボタンはほろ酔いの夜の対戦ができてから出す | 中身なしで見た目だけ変わるのを避ける |
| 交換所の値段は4段（小物100〜250／ほしい物300〜600／目玉700〜1,300／やり込み1,800〜） | 規則100 |
| CG集は1セット100コイン | ユーザー「1セット100」 |
| CG集の中身：没CG8枚と頬のご注文4枚も入れる | ユーザー「全部入れる」「入れる」 |
| 零時の卓は参加費なし・賞金はそのまま（のちに D20 で賞金を上げた） | ユーザー「無料・賞金そのまま」 |
| 零時の卓の開始の持ち点 2,000 | プロの手どおりで15ハンド以内の脱落 27%→10% |
| 新しい構図の割り当て：gym@wrists・inner@peace・yshirt@back・tshirt@stretch | ユーザー「その割り当てしかないですよね？」 |
| 14番（Tシャツ伸び・身体は実写で）は CG集へ | ユーザー「CG集に入れます」 |
| Yシャツの頬は閉じた絵2・後ろ手は閉じた絵1 | ユーザー「頬2と後ろ手1で」 |

## 7. Changed / rejected
- 零時の卓：参加費300（初回だけ招待状で無料）→ 参加費なし
- 零時の卓：開始1,500点 → 2,000点
- 零時の卓の賞金：1,800/900/500/300/100/0 → 2,000/1,000/600/400/200/0
- 再戦の報酬：ポルカ400・セリナ600・グラーノ800・ヴェルベット1,400・本気のリコ1,400 → 250・350・450・600・700。S評価のボーナス 200/300/400/700（本気のリコ700）→ 100/150/200/300（300）
- 交換所の合計 65,250 → 43,700
- 「ご褒美CG」→「一枚絵」（画面の文言。幕間のリコの台詞「このあとはご褒美の時間」は声付きなので未変更）
- 値段の段の案「合計 約30,000〜35,000」→ 実際は品数が多く 43,700 に
- ❌ 一周目＋遊び込みだけで値段を組む（二周目を入れる）
- ❌ ほろ酔いの夜を「物語をやり直さないクリア後モード」にする（二周目で決定）
- ❌ 夜の夜景（ほろ酔いのリコ）の候補 scene_1・scene_3（真ん中寄りで右の札・額に重なる）
- ❌ お酒のない夜の劇場（horoyoi_empty_1/2）
- ❌ 大きく開いた見本を添付して開いた絵を頼む（必ず断られる）
- （#23 までの却下はそのまま有効：バニーの元の構図を変える、違う構図にバニーの数字を当てる、範囲の横と下を広げる、動きを写真で確かめる、`&tip=1` 付きのリンク、「胸を張って」系の頼み方）

## 8. Data & facts (exact)
| 項目 | 値 |
|---|---|
| 最新の配信の版の印（index.html の ?v=） | 20261108w |
| game.js の PANYU_MESH_V | 20261108t |
| 公開URL（Web版） | https://takakazuaikawa-hue.github.io/tousatsu-mimi/ |
| リポジトリ | takakazuaikawa-hue/tousatsu-mimi |
| PANYU_POSES（game.js） | bunny/vintage/pajama/gothic/jirai/nurse/santa: ['', 'dressing', 'pool']、bikini/halter/white/dress: ['', 'dressing']、gym: ['', 'cheek', 'wrists']、yshirt: ['', 'cheek', 'back']、inner: ['', 'peace']、tshirt: ['', 'stretch'] |
| Yシャツのボタン外し | 元の構図 20261108o（panyu_yshirt_open.webp）、頬・後ろ手 20261108q（panyu_yshirt_cheek_open.webp・panyu_yshirt_back_open.webp、YB() で定義） |
| 零時の卓（allstar.js CONFIG） | startStack 2000、prizes [2000, 1000, 600, 400, 200, 0]、5ハンドごとにブラインド上昇、参加費なし、PUSH_ICM_POW 3 |
| 零時の卓の画面 | 誰から＝払う額を決めた人の席が金に脈打ち、操作の上に「顔・名前・何をしたか→ミミが払う額」。速さ ×1/×2/×3（save.allstar.pace、降りた後の早送りは max(3, pace+1)） |
| プロの手どおり300大会（qa/allstar-coach-sim.mjs） | 15ハンド以内の脱落 27%→10%、6位 15%→10%、4位以内 69%→76%、平均 31→36ハンド、入場案内「目安 13〜17分」 |

CG集（game.js CG_SETS、絵は assets/backgrounds/cgset/<key>_<n>.jpg 1600x900、見本 thumb/*.webp 480x270、qa/cgconvert.mjs）
| id | 名前 | 枚数 | 入荷 | 中身 |
|---|---|---|---|---|
| cgset_morning | 朝と夕暮れ | 4 | 最初から | Tシャツ朝の寝室・Tシャツ伸び・ジム手首頭上・ジム顔隠し |
| cgset_bath | 湯上がり | 8 | ポルカ | 肌着の頬・腰に手×2・ダブルピース×2・ダブルピース表情違い×3 |
| cgset_yshirt | 夜のYシャツ | 7 | セリナ | 後ろ手・前開き・前開き別案・頬のご注文4枚 |
| cgset_midnight | 零時の寝台と卓 | 5 | グラーノ | バニー寝台・バニー卓・水着寝台・水着卓・ホルター寝台 |
| cgset_rival | ライバルと卓で | 3 | ヴェルベット | ポルカの没案2・ヴェルベットの没案1 |

交換所の値段（D20 後・入荷ごとの合計）：最初から 2,150／ポルカ 3,750／セリナ 8,800／グラーノ 14,100／ヴェルベット 14,900、合計 43,700（66品＋CG集。クリア特典は無料）。例：ぱにゅぱにゅLv2 150、ぱにゅ衣装 パジャマ300・古着300・サンタ450・ゴスロリ500・ナース550・ホルター800・ジム900・Yシャツ1,000・Tシャツ1,000・肌着1,050・ドレス1,100・水着1,300、リコ・バニー1,150・リコ・水着1,300、ミミ・黄金2,500、チップ拡張 +500 250・+1500 800・+3000 1,800・+5000 3,000・+10000 4,500。

コインの稼ぎ（調べ係の洗い出し）
| 稼ぎ | 値 |
|---|---|
| 開始の所持 | 0 |
| 初回クリア報酬 | 研修300（スキップ100）・ポルカ500・セリナ700・グラーノ900・ヴェルベット1,500・本気のリコ2,000 |
| 一周目クリアまでの累計 | 約3,900（Sなし）〜5,500（S全部、改定前のSボーナスで計算）。講義完走で +約800 |
| 再戦の下がり方 rematchMult | 0〜5勝目100%、6〜11勝目80%、12勝目以降60% |
| ログインボーナス | 7日周期 50/60/80/100/120/150/300 |
| ぱにゅぱにゅ | 1日5回、基本30×倍率 |
| 次の目標 | shopCoinGoal()：入荷済み・未所持・買える条件の品で手持ちで届かない一番安い品と不足額。交換できる品があれば「交換所で◯点 交換できます」 |

夜のホーム（ほろ酔いの夜）
| 項目 | 値 |
|---|---|
| ほろ酔いのリコの絵 | assets/ui/home/scene_night.webp（1672x941、元 qa/out/d10/horoyoi_scene_2.png） |
| 人のいない夜の劇場 | assets/ui/home/stage-empty_night.webp（元 qa/out/d10/horoyoi_empty_drink_2.png） |
| 切り替え | home.js homeIsNight()＝save.horoyoiMode かつエンディング後。.home-stage.is-night |
| 呼吸の座標（home-live.js RS） | rail 760、body [640,585,300,230]、neck [600,440]、head [585,300,230,220]、ear [560,120]、earBox [380,0,800,230]、hairL [250,390,470,740]、hairR [830,460,910,740] |

その他
| 項目 | 値 |
|---|---|
| 揺れる範囲 | #23 の表のまま（元の構図 cups [[607,600,132],[795,600,132]] face0、とがる TIP_POSE rPhys95、頬 CHEEK_POSE rPhys78 hitR0.95、楽屋前開き face30 rPhys60、楽屋肩紐 face30 rPhys38、プール face35 rPhys40）。新しい構図4つは NP() で face0 rPhys95（値は panyu-mesh.html） |
| ずっとモードの寄り | ＋−（0.15ずつ）、上限1.9、下限は絵の上下が切れない所（横長の画面で1未満まで）、衣装を替えても同じ寄り |
| DLsite 版 | dist/dlsite/Mimi_Texas_Holdem.zip（作り直しが必要）、electron 44.9.0、@electron/packager 20.3.0、exe 名 MimiTexasHoldem |
| 権利表記 | '© 2026 POMERASHIBA Studio'、「制作・著作　ポメラシバスタジオ」 |
| 検査ブラウザ | QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 |
| 公式のミミ／リコ | assets/characters/mimi_default.webp／rico_default.webp |
| 素材一覧 | assets/manifest.js 435 files, 71.3 MB（qa/genmanifest.mjs、cgset と cgset/thumb も入れた） |

## 9. People, terms & names
- **People:** ミミ（主人公・新人バニーディーラー）、リコ先輩、ポルカ、セリナ、グラーノ（交換所の店主）、ヴェルベット。どっと（HP担当）。
- **Terms:** ぱにゅぱにゅ、網目＋ばね、構図違い（衣装@構図）、楽屋（dressing）、プール（pool）、頬（cheek）、とがる衣装（tip）、三段階、没入モード（ずっとモード）、CG集（一枚絵のセット）、一枚絵、ほろ酔いの夜（二周目）、零時の卓、プロの手（考え方＝coach）、次の目標、段3（ぱにゅぱにゅの構図×衣装のアルバム）
- **Names in use:** panyu-mesh.html（OUTFITS、NP()、YB()、setZoom・zMin、panyuZoomFree）、game.js（PANYU_POSES・PANYU_MESH_V・CG_SETS・cgSetSrc・cgSetThumb・SHOP3_GROUPS の cgset・shopCoinGoal・showRewardCgViewer・showPanyuImmersive）、allstar.js（icmValues・icmNeed・pushIcmScale・coach）、allstar-ui.js（showFrom・cycleSpeed・pace）、home.js（homeIsNight・refreshHomeStatus の .h15-goal）、home-live.js（RS・VSof）
- **道具:** qa/allstar-coach-sim.mjs（プロの手どおりの大会）、qa/d16probe.mjs、qa/d17shot.mjs、qa/d20shot.mjs、qa/nighthome.mjs、qa/panyuimm.mjs（＋−も検査）、qa/montage.mjs（比べ絵）、qa/cgconvert.mjs、qa/panyu-tools/*（weightshot・align3・gridzoom・towebp・skincheck など）
- **スキル:** chatgpt-image-gen（開いた絵の二段の描かせ方を追記）、panyu-tip-outfit、panyu-skin-check、game-text-layout、irodori-voice
- **メモリ:** second-loop-horoyoi.md（二周目＝ほろ酔いの夜、値段は一周目→二周目→遊び込み）ほか MEMORY.md の一覧

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| D19 Yシャツのボタン外し | 済・配信 | 20261108o／q | 頬・後ろ手は閉じた絵も差し替え |
| 新しい構図4つ | 済・配信 | 20261108p | gym@wrists・inner@peace・yshirt@back・tshirt@stretch |
| D16 零時の卓 | 済・配信 | 20261108r／s | 誰から・速さ・参加費なし・ICM・2,000点 |
| D17 CG集 | 済・配信 | 20261108t | 5セット27枚 |
| ずっとモードの＋− | 済・配信 | 20261108t | |
| D20 値段の段・稼ぎ・次の目標 | 済・配信 | 20261108u | ほろ酔いの夜ができたら二周目の稼ぎと入荷を見直す |
| 「一枚絵」への言い換え | 済・配信 | 20261108v | |
| ほろ酔いの夜（D10） | 進行中 | 夜のホームの絵と切り替えの仕組みは配信（20261108w）、ボタンは未表示 | 対戦・会話・一枚絵5枚・酔い顔が未 |
| D18 ファイブポーカー整理 | 未 | | 手本を調べ案を写真で見せてから（game-text-layout） |
| 段3 ぱにゅぱにゅのアルバム | 未 | | 構図×衣装の表・まだ見ていない構図の印 |
| 衣装・交換所・コレクションの仕上げ／5時間の検証／D8／DLsite 版の作り直し | 未 | | この順 |
| 手元 | 未コミットなし（qa/out・qa/panyu-tools の生成絵は未追跡のまま） | | |

ChatGPT の生成係（Sonnet サブエージェント）への頼み方：Skill chatgpt-image-gen を読ませる → 新しいタブを1つ → 公式の絵を1枚目に添付 → 依頼文は短く → 同じ依頼で2〜3枚を別々に → 保存先を qa/out/<名>/ に指定 → 終わったらタブを閉じる。

## 11. Next steps
1. **Next action:** ほろ酔いの夜の対戦づくりに入る。まず game.js の OPPONENTS の profile・相手の打ち方（decideOpponentAction）・扉と幕間（INTERMISSIONS）・リコの助言と心の声の欄の作りを読み、酔った打ち方（決定の表の5人分）と「ふにゃ…」で読めない助言、報酬1.5倍、save.horoyoiMode での進行（一周目と別の勝ち記録）を作る。並行して生成係に「ほろ酔いの一枚絵」5枚（1人1枚）の候補を描かせ（公式の絵を1枚目に、お酒を入れる）、比べ絵で選んでもらう。
2. 酔った会話（扉・幕間）の文案を表で見せて決めてもらう（声を付けるかも聞く）。
3. ホームの切り替えボタンを出して配信（夜のホームの絵は済み）。
4. 二周目の稼ぎを入れて、交換所の入荷・値段の段を見直す。
5. D18 → 段3 → 衣装・交換所・コレクション → 5時間の検証 → D8 → DLsite 版を作り直す。

## 12. Open questions ⚠️
- ほろ酔いの夜の細部：相手の順は一周目と同じ固定か自由か／酔った会話に声を付けるか（Irodori-TTS、1行4〜9分）／酔い顔（表情の絵）を5人分描くか
- 幕間のリコの台詞「このあとはご褒美の時間」（声付き）を変えるか
- 段3の背景：1枚を全衣装で使うか、構図ごとに替えるか（未回答）
- 販売前の決めごと：無料の Web 版を止めるか／年齢区分／AI区分／価格／問い合わせ先／コード署名／体験版の共有先URL
- GitHub の古い枝・手元の claude/sweet-euler-qwzxua を消すか
- 体験版（納品済み）を新しい表記で作り直すか

## 13. Re-attach checklist
- Nothing to attach.（必要な物は全部 C:\Users\takakazu\projects\mimi_porker の中）

---
<sub>Audit: 13/13 sections · 104 rules · 219 corrections · 70 data points · secrets removed: none found · generated by active-memory</sub>
