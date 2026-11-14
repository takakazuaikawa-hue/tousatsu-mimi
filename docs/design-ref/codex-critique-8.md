**現状は販売見送りです。勝利後にご褒美へ進めない不具合と、証拠・採点の誤りが残っています。**

新規セーブでプロローグ、研修3ハンド、ポルカ戦22ハンドを進めて勝利。クリア済み条件ではヴェルベット戦11ハンドで勝利、本気リコ戦は座り直しを含む5ハンドで敗北まで確認しました。零時の卓は21ハンド目に3位で退席し、残りの自動決着、最終順位、賞金受領まで確認しています。セリナ・グラーノの再戦、読み合い10種類、幕間、エンディング、絵の閲覧、交換所、ファイブポーカー、ぱにゅぱにゅも操作しました。[試遊範囲の記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/coverage.json)

前回分では、半額返金、撤退後の助言、アウツの境目、スマホ衣装、座り直しの案内、ダウト、667幅の設定、同じ役の説明、自動で卓へ戻る処理、衣装の印は改善を確認しました。**「異議あり」と667幅の賭け欄は一部未解決です。**

以下の画像はすべて `qa/out/codex8/` にあります。本体は変更していません。検査用ブラウザは閉じました。

1. **ヴェルベットに勝った後、スマホではご褒美へ進めない**

   勝利結果の情報が縦にあふれ、「幕間へ」が画面外へ落ちます。932×430では下端に数ピクセルだけ、844×390ではボタン全体が隠れ、スクロールでも出せませんでした。

   **根拠：** [112-velvet-result-932-settled.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/112-velvet-result-932-settled.png)、[114-velvet-result-844.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/114-velvet-result-844.png)。PCサイズへ切り替えて進みました。

   **客の反応：** 苦労して勝った直後に止まれば、ご褒美への期待ごと失います。

   **直し方：** 進むボタンの場所を下端に確保し、成績・報酬・台詞だけをスクロールさせてください。報酬の札が多い好成績の結果でも、必ず進める配置が必要です。

2. **【未解決】「異議あり」は、フラッシュがある相手に「フラッシュは無い」と説明する**

   場にクラブが4枚あるのに、相手の片方がダイヤという証拠から「フラッシュは無い」と断定しました。もう片方のクラブと合わせれば5枚そろいます。

   **根拠：** 条件を与えて遊んだ[178-objection-four-clubs-conclusion.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/178-objection-four-clubs-conclusion.png)。相手はQ♣・J♦で、[180-objection-flush-reveal-settled.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/180-objection-flush-reveal-settled.png)でも確認できます。[objection.js:104](C:/Users/takakazu/projects/mp_panyu/battles/games/objection.js:104)の逆向きの説明が残っています。

   **客の反応：** 札を正しく数えた客ほど、ゲームの説明を信用できなくなります。

   **直し方：** この証拠で否定できるのは、場の同じ印が3枚の場合までです。4枚なら相手の両方の札が必要で、5枚ならフラッシュを否定する問題自体を出せません。場3枚で相手の2枚を見せる修正と「本物寄り」の表示は、今回は確認できました。

3. **勝つ見込みを丸めてから採点し、弱い側を「強かった」と褒める**

   ポルカ戦で、ミミが勝つ見込みは内部計算で約49.85%でした。それを50%に丸め、「ミミの方が強かった」として満点と180コインを渡しました。

   **根拠：** 自然に出た[027-stare-verdict.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/027-stare-verdict.png)、[計算記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/stare-natural-calculation.json)。[stare.js:296](C:/Users/takakazu/projects/mp_panyu/battles/games/stare.js:296)で丸めた値を正誤判定に使っています。

   **客の反応：** 間違った理解をゲームに褒められるため、練習として成立しません。

   **直し方：** 採点は丸める前の値で行い、表示だけを丸めてください。同じ処理のある6種類をまとめて直し、半分より少し下・同じ・少し上を確かめるべきです。

4. **【未解決】卒業試験の「実際の件数」は、記録が少ないと架空の20回へ戻る**

   実際の履歴は4件、降りたのは2件なのに、「最近の大きな賭け20回：降りた12・付いた8」と表示されました。6回目の修正は、記録5件未満に届いていません。

   **根拠：** [136-graduation-play-932.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/136-graduation-play-932.png)、[実際の4件](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/graduation-initial-actual-habit.json)。[graduation.js:61](C:/Users/takakazu/projects/mp_panyu/battles/games/graduation.js:61)では5件未満を作り物の履歴へ置き換えます。

   **客の反応：** 「自分の打ち方を読まれている」という、この勝負の売りが崩れます。

   **直し方：** 1件でもあれば実際の記録を使い、0件なら「まだ記録なし」としてください。説明用の例を使うなら、「見本」と明記する必要があります。

5. **効果音を切ると、「キャラの声」がONでも声を止める**

   効果音だけをOFFにすると、声の再生も無効になります。別々の設定として見せながら、独立して働いていません。

   **根拠：** [066-sfx-off-voice-on-667.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/066-sfx-off-voice-on-667.png)、[再生状態の記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/audio-settings-check.json)。[voice.js:44](C:/Users/takakazu/projects/mp_panyu/voice.js:44)で効果音OFFを声の停止条件にしています。

   **客の反応：** 声だけ楽しもうと調整した客が、設定を何度も触り直すことになります。

   **直し方：** 全体の消音、効果音、声を別々に判定してください。声は「全体の消音・声のON/OFF・声の音量」だけに従わせるべきです。

6. **役くらべの最初の札選びは、基準の844幅でも切れる**

   7枚を大きく横並びにした結果、右端の4♠が枠で切れています。最初に触る説明用の札選びから、未調整の印象を与えます。

   **根拠：** 実際に5枚を選んだ[033-handvs-play.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/033-handvs-play.png)。[handvs.js:106](C:/Users/takakazu/projects/mp_panyu/battles/games/handvs.js:106)付近の固定幅76pxと間隔では、7枚が収まりません。

   **客の反応：** 判断材料が欠けた状態で正解を要求され、遊びより画面との格闘になります。

   **直し方：** スマホでは4枚＋3枚の2段にするなど、7枚全部を確実に見せてください。文字を小さくして押し込む解決は避けるべきです。

7. **667幅を直した設定画面が、PCではまだ崩れている**

   1280×800では音量つまみの幅が約41pxしかありません。「端末が消音でも音を出す」の欄も、隣の「絵を動かす」へ食い込んでいます。

   **根拠：** [167-settings-pc1280.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/167-settings-pc1280.png)、[操作幅の記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/pc-settings-controls.json)。[ui-modal.css:551](C:/Users/takakazu/projects/mp_panyu/ui-modal.css:551)の3列配置と、つまみを際限なく縮める指定が原因です。

   **客の反応：** 広いPC画面でも調整しづらければ、完成品としての確認不足を感じます。

   **直し方：** 音量は横幅を使う独立した行にし、つまみに最低120px程度を確保してください。この幅で3列を維持する必要はありません。

8. **読み合いが多すぎて、ポーカーの勝負が細切れになる**

   本気リコ戦は5ハンドすべてに卒業試験が入りました。心の声を1回引く操作でも約3.8秒を要し、読む・判断・自信・答え合わせが重なります。

   **根拠：** [本気リコの通し記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/rico-full-match.json)、[心の声1回の記録](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/gacha-first-pull.json)。

   **客の反応：** 種類の多さを楽しむ前に、「また卓が止まった」と感じ始めます。

   **直し方：** 引く演出には「すぐ結果」を付け、体験済みの種類は短縮版を用意してください。卒業後は試験の頻度を落とし、小さな成功の答え合わせは卓上の短い表示にまとめる方がよいです。

9. **初戦の終盤が、ほぼ決まった勝負の後片付けになっている**

   ポルカ戦は22ハンドかかり、ヴェルベット戦の11ハンドより長くなりました。17ハンド目に3978対22まで差がついてからも、終了までさらに5ハンド必要でした。

   **根拠：** [055-polka-h17.json](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/055-polka-h17.json)、[056-polka-h20.json](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/056-polka-h20.json)。降参の申し出は、[game.js:17963](C:/Users/takakazu/projects/mp_panyu/game.js:17963)で大差に加えて見せ合いの5連勝を要求します。

   **客の反応：** 最初のご褒美までの道が長く、勝ちを確信してからが退屈になります。

   **直し方：** 大差で相手の残り点が参加費にも満たない場合などは、連勝数に頼らず降参を申し出てください。「最後まで打つ」選択は残せます。

10. **本気リコという大きな遊びを、「リコの教室」に隠している**

    クリア後のホームは「全卓制覇」と零時の卓を強調しますが、本気リコへの入口は「リコの教室」のままです。押して初めて、講義以外の強敵戦があると分かります。

    **根拠：** [130-postclear-home-932.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/130-postclear-home-932.png)、[131-rico-chooser-932.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/131-rico-chooser-932.png)。入口の振り分けは[home.js:63](C:/Users/takakazu/projects/mp_panyu/home.js:63)。

    **客の反応：** 講義を終えた客は押し直さず、遊べる内容を見落としたまま終えます。

    **直し方：** クリア後は札を「本気のリコに挑む」などへ変えてください。講義も続けられることは、その先の選択画面で示せます。

11. **持ち点が尽きた直後の「もう教えることは何もない」が、敗北と噛み合わない**

    本気リコ戦で全点を失った直後に卒業の絵と合格の台詞が出て、次の画面では敗北と再挑戦を告げられました。何に合格し、何に負けたのかを、演出が整理していません。

    **根拠：** [142-rico-current.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/142-rico-current.png)→[144-rico-loss-932.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/144-rico-loss-932.png)。台詞は[game.js:4365](C:/Users/takakazu/projects/mp_panyu/game.js:4365)。

    **客の反応：** 大事な卒業場面が、勝負を見ていない定型の祝いに感じられます。

    **直し方：** 「読み合いの試験は合格」と対象を限定してください。勝敗を先に見せ、その後に別の達成として卒業を開く方が筋が通ります。

12. **【一部未解決】667幅の賭け欄は、上の道具へ重なり先が移った**

    手札を隠す問題は直りました。しかし4種類の額を出すと、「いくら賭ける？」と「もどる」が上部の音・勝率表示へ重なります。

    **根拠：** 自然なポルカ戦で開いた[054-four-bets-667.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/054-four-bets-667.png)。

    **客の反応：** 賭け額を選ぶたび、画面の別の機能が邪魔になり、操作に落ち着きがなくなります。

    **直し方：** 賭け欄のための場所を確保してください。開いている間は補助表示を畳み、見出しと戻るボタンも含めて重ならない配置にする必要があります。

13. **ファイブポーカーの配当表は、PCでも一度に読めない**

    1280×800でも配当額の右端が切れています。横へ動かして金額を出すと、今度は役名の先頭が切れます。

    **根拠：** [231-five-paytable-cut-pc.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/231-five-paytable-cut-pc.png)、[232-five-paytable-scrolled-pc.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/232-five-paytable-scrolled-pc.png)。表示幅198pxに対し中身は228pxでした。

    **客の反応：** 基本の配当確認に横移動が必要では、付録まで仕上げ切れていないと感じます。

    **直し方：** PCでは表を広げ、役名・倍率・配当額を同時に見せてください。賭け額100と500で、最大の金額まで確認するべきです。

14. **衣装の説明が、突然、条件のない攻略本になる**

    「AAでも勝率85%」「UTGの3倍」「5時間睡眠でブラフ約20%増」が、前提や略語の説明なしで並びます。初見向けの説明と、同じ作品の言葉になっていません。

    **根拠：** [206-wardrobe-pc1280-settled.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/206-wardrobe-pc1280-settled.png)、[070-rico-next-667.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/070-rico-next-667.png)。[game.js:4857](C:/Users/takakazu/projects/mp_panyu/game.js:4857)以降。

    **客の反応：** 初心者は分からない言葉を増やされ、経験者は数字の条件を疑います。

    **直し方：** 衣装欄は人物の話を中心にしてください。攻略を載せるなら対戦人数などの条件と略語の意味を添え、裏付けのない精密な数値は外すべきです。

15. **PCの幕間は、顔を大きく見せるほど絵の粗さが出る**

    ご褒美絵から会話画面へ移ると、人物の顔や輪郭が急にぼけます。全身用の絵を上半身へ寄せるため、大きく引き伸ばしています。

    **根拠：** [211-selina-intermission-pc.png](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/211-selina-intermission-pc.png)。元の667×1000の絵が、高さ約1524pxで表示されていました。[表示寸法](C:/Users/takakazu/projects/mp_panyu/qa/out/codex8/pc-story-image-scale.json)、[style.css:19836](C:/Users/takakazu/projects/mp_panyu/style.css:19836)。

    **客の反応：** 物語の見せ場で画像だけ粗くなると、作り込みの差が目立ちます。

    **直し方：** 上半身用の大きな絵を用意するか、拡大を抑えてください。会話画面とご褒美絵の解像感をそろえる必要があります。

総プレイ時間の見積もりは、**本編初回が再挑戦込みで約90〜150分、本気リコと零時の卓を各1回加えて約20〜40分**です。収集周回と任意の全講義は別枠です。これは今回の手数と判断・読み合いの時間からの推定で、新規セーブ1本を最後まで連続計測した実測値ではありません。

通常試遊で例外による停止は観測せず、零時の卓の中断・再読み込み・再開も通りました。音は設定と再生状態を検査していますが、音色の実聴、実機の発熱・電池消費は未確認です。画像は検査環境の代替書体での表示です。

**売る前に必ず直すべき物**

- スマホの勝利結果で「幕間へ」が消える進行不具合。
- 読み合いの証拠・採点・実際の履歴の食い違い。
- 効果音と声の独立動作、およびPC設定の操作幅と重なり。

**良い所**

時計台のカジノ劇場という舞台には、作品を覚えてもらう力があります。  
3ハンド研修は、初めての人を実際の操作へ連れていけます。  
ご褒美絵と零時の卓には、先へ進む動機になる見せ場があります。