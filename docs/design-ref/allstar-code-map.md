# 零時の卓：今のコードの下調べ（2026-10-16、mp_panyu の game.js 基準。行番号は grep で確かめ直す）

## 面：

対象リポジトリは C:/Users/takakazu/projects/mp_panyu（読み取りのみ。編集・起動・node 実行はしていない）。AI の判断は game.js 1056-1148 に集まっている。
1. decideOpponentAction(profile, ctx, opts)（1103-1148）は state を一切触らない純関数。依存するのは rand / equityVsRandom / countStrongOuts / aiPickSize / aiStyleOf だけなので、席ごとに profile と ctx を変えればそのまま呼べる。
2. 相手ごとの差は AI_STYLES（1063-1070）の1か所。OPPONENTS[id].profile.style（478/493/508/523/538行）が名前で引き、aiStyleOf（1071）が解決する。
3. 値は loose/respect/valueEq/valueFreq/bluffFreq/raiseEq/trap/sizing/shoveCall の順。polka(1064)=.72/.04/.66/.75/.36/.82/0/loud/.47、selina(1065)=.8/.2/.64/.65/.12/.9/.1/honest/.47、grano(1066)=1.0/.08/.66/.8/.08/.86/.45/flat/.47、velvet(1067)=.95/.14/.66/.85/.34/.8/.15/polar/.47、rico_serious(1068)=.97/.12/.62/.85/.3/.8/.2/mixed/.47、rico_tutorial(1069)=.9/.1/.66/.6/.2/.9/0/flat/shoveCall無し（コードで 0.55 扱い）。
4. profile の bluffTendency・aggression・foldDiscipline 等の数値は style がある限り判断に効かない。表示専用（applyNoteTellHint 4570、練習パネル 6013、bluffFoldEquity 7305、range-hint 15594）。OPPONENT_PERSONALITY（6877）の説明文も実装と食い違う。「ドライボードで消極的」は未実装で、boardDanger は ctx に入るが decideOpponentAction は読まない。
5. 強さの見積もりは全ストリート共通で eq=equityVsRandom(hole, board, 160)（1108）。「ランダムな1人の手」に対する勝率で、160回の抽選なので誤差は約±4%。Chen式の opponentPreflopStrength（14174）は ctx.handStrength 用だが、hole がある限り使われない死んだ経路。
6. 札の枚数でストリートを決め（1109）、ストレート以上のアウツ数 draw=countStrongOuts（1110）を数える。ストリートごとの差はコードにある。プリフロップはブラフ禁止（1146）、リバーはドロー系の賭けとトラップ禁止（1143/1145）、アウツ8枚以上でコール基準を0.04緩める（1136）。
7. 賭けられた時（1123-1140）は、eqAdj=eq−respect×sizeRatio（ミミのオールイン連打で respect が減る）。eqAdj≥raiseEq なら75%で上乗せ、eqAdj<0.3 なら bluffFreq×0.2 で上乗せブラフ（flat は除く）、eqAdj≥max(odds×loose, shoveCall)でコール、それ以外はフォールド。
8. チェックで回ってきた時（1143-1147）は、eq≥0.8 で trap の確率でチェック、eq≥valueEq で valueFreq の確率で価値ベット、アウツ8枚以上で半ブラフ、eq<0.42 で bluffFreq のブラフ、それ以外はチェック。
9. ミミ専用の学習が入っている。sticky（1113-1116）はミミのコール率でブラフを減らし価値ベットを増やす。入力は state.playerCalls(13764) / playerFolds(13744) / playerShoves(13830)。他の人に対しては何も学習しない。
10. 出力は {type:'fold'|'check_call'|'bet', size:'pot_1_3'|'pot_1_2'|'pot_2_3'|'pot_1', intent, eq}。bet は新規ベットと上乗せの両方を指す。チップ額への変換と最小レイズ補正は呼び出し側（betSizeToChips 1159、opponentTurnDecide 14036-14058）にあり、AI は allin を選ばない。
11. 本編のヘッズアップでは、AI がプリフロップで先に賭ける場面が無い（ミミが先に動き、チェックかコールでそのままフロップ: playerCheckCall 13771→advanceAfterCall 14283）。ポジション・ブラインドの概念も無い（アンテのみ）。6人卓のオープン・リンプ・レイズの判断は完全に新規。
12. 6人卓で渡す入力。そのまま使えるのは hole / board / toCall / canCheck / pot。作り直しが必要なのは次の3点。
   ・potBeforeBet は「今の最高額の賭けが入る前のポット」を席ごとに記録する（pot−toCall は2人でしか成り立たない）。
   ・playerAllIn は「今向き合っている賭けがオールインか」に読み替える。
   ・playerCalls 等はミミが同じハンドに残っている時だけ渡し、AI 同士の判断には 0 を渡す。
   これに加えて、残り人数 nOpp、スタックと有効スタック、前に出た人数（コーラー数）、攻撃者がミミかどうかが要る。
13. 最大の問題は勝率が1対1前提なこと。eq・valueEq(.62-.66)・raiseEq(.8-.9)・shoveCall(.47)・ブラフ上限(.42/.3)・trap(.8)・フォース(.5)・テル判定(.42/.62)が全部「ランダムな1人に対する勝率」で較正されている。5人相手の勝率は桁が変わるので、そのまま使うと多人数でコールとベットが過剰になる。
14. リコ先輩（Ⅰ）は OPPONENTS.rico_tutorial.profile が教える用の弱い方（rico_tutorial、chips 800）。本気は startBattleInternal 12488-12489 にだけ直書きの { style:'rico_serious',… }（基本チップ 2000: startingBaseChips 12403）。卓にはこちらを使い、AI_STYLES は書き換えずに {...AI_STYLES.x} の写しを作る。
15. セリフは polkaSpeech 1644 / selinaSpeech 1256 / granoSpeech 1301 / velvetSpeech 5660 / ricoSpeech 1183 / ricoSeriousSpeech 1221 が action だけで動く（ricoSpeech は 1185 で state を見る）。opponentSpeech 1175・1414・1474 は state.opponentId 経由なので席別に使えない。テルの出やすさ TELL_LEAK（17568）は imgKey で引く。
16. 検査の足場: qa/probe/sim.js が decideOpponentAction を ctx で直接呼ぶヘッドレスの2人卓を持つ（48・91-95行）。6人版の雛形にできる。const の AI_STYLES は window に生えないので、同じファイルは eval(name) で拾っている（5行）。

### 借りられる
- decideOpponentAction(profile, ctx, opts)（game.js 1103-1148）：state を触らない純関数。席ごとに profile=OPPONENTS[id].profile と席の ctx を渡して呼べる。読む ctx は hole, board, toCall, canCheck, pot, potBeforeBet, playerCalls, playerFolds, playerShoves, playerAllIn, handStrength(hole が無い時だけ)。boardDanger, oppChips, street は読まない。opts.forceLargeBet(1119)は入門用なので渡さない。そのままだと eq が1対1の勝率なので、多人数では下の must_rebuild の複製版を使う。hole を渡さず ctx.handStrength に自前の多人数勝率を入れる近道もあるが、その場合 draw=0 になり半ブラフとアウツ補正(1136/1145)が消える。
- AI_STYLES と aiStyleOf（game.js 1063-1070 / 1071-1079）：相手ごとの性格値の唯一の置き場所。キーは polka, selina, grano, velvet, rico_serious, rico_tutorial。aiStyleOf({style:'selina'}) で引ける。卓用に調整する時は {...AI_STYLES.polka, valueEq:…} のように写しを作り、本編の値を書き換えない。AI_STYLES は const なので window.AI_STYLES は無く、後から読み込む別ファイルが裸の名前 AI_STYLES で参照する。
- aiPickSize（game.js 1080-1101）：st.sizing に応じて 'pot_1_3' | 'pot_1_2' | 'pot_2_3' | 'pot_1' を返す純関数。kind は 'value' | 'bluff' | 'semi'。loud(ポルカ)=弱いほど大きい、honest(セリナ)=強いほど大きい、flat(グラーノ)=常に半分、polar(ヴェルベット)=強いか空っぽなら大きい、default(リコ本気 mixed)=ランダム。そのまま再利用できる。
- betSizeToChips(size, pot, allInMax)（game.js 1159-1172）：ポット比率→チップ額。floor(pot×比率)、最低50、スタック上限。純関数。多人数でもポットは全員分の合計を渡せばよい。
- equityVsRandom / fastHandScore / countStrongOuts（game.js 1022-1039 / 965-1019 / 1042-1054）：fastHandScore(7枚)は役の強さを1つの数にする高速版で、純関数としてそのまま使える。equityVsRandom は相手1人固定なので、そのままは使えない。ただし部品として、多人数版(2×N枚配って最大と比べる)を作る土台になる。countStrongOuts は場札3-4枚の時のストレート以上のアウツ数で、多人数でも流用可。
- 役判定と山札（game.js evaluateHand 843 / combinations 855 / evalFive 868 / mkScore 904 / newDeck 828 / shuffle 813 / rand 811 / pick 812 / SUITS 825）：6人分のショーダウンの比較は evaluateHand(7枚).score をそのまま比べればよい。山札は newDeck() で配れる。Math.random 固定でシードは無い。
- OPPONENTS（名前・立ち絵キー・チップ・性格）（game.js 474-548（rico 475-488, polka 489, selina 504, grano 519, velvet 534））：name, imgKey('rico','polka','selina','grano','velvet'), chips(800/1000/1200/1300/1500), profile.style を席の定義に流用できる。リコだけは本気用の profile を別に作る(12488-12489)。
- アンテ表（game.js 1152-1156（ANTE_STEP, ANTE_LEVELS, anteForHand））：ブラインド無しのアンテ制の段階上げ(4ハンドごとに 50→400)。6人卓の締め(勝ち残り戦を終わらせる)にそのまま借りられる。
- 席別セリフ生成と顔の出やすさ（game.js polkaSpeech 1644 / selinaSpeech 1256 / granoSpeech 1301 / velvetSpeech 5660 / ricoSpeech 1183 / ricoSeriousSpeech 1221 / TELL_LEAK 17568-17574）：action({type,intent})を渡せば文字列を返す純関数群(ricoSpeech だけ state.seriousRicoMode を見るので、本気は ricoSeriousSpeech を直接呼ぶ)。TELL_LEAK は imgKey→確率のデータ表(polka .85, rico .6, grano .45, selina .3, velvet .12)。intent は value/bluff/draw/trap/call/check。
- qa/probe/sim.js の2人卓シミュレータ（qa/probe/sim.js 48 / 91-95 / 165-172）：decideOpponentAction を ctx で直接呼ぶ例と、関数をページから拾う fn() の書き方(5行目: window.__mimiEngine → window → eval)。6人版の検証ハーネスの雛形になる。参照のみ。

### 作り直す
- 多人数勝率（equityVsN）（新規。元は game.js 1022 equityVsRandom と 1108 の呼び出し）：equityVsRandom は deck[0],deck[1] の1人としか比べない(1035)。残り nOpp 人ぶん 2×nOpp 枚を配り、全員の最大と比べて(同点は分け合い)勝率を出す関数が要る。抽選160回(誤差約±4%)も、人数が増えるほど上げた方がよい。ctx に nOpp(まだ降りていない他の人数。オールイン済みを含む)を渡す。
- 多人数用に補正した判断関数（decideOpponentAction の複製）（新規。元は game.js 1103-1148）：勝率の物差しが「ランダム1人」前提で、閾値が全部それで較正されている: 1116 valueEq(.62-.66)、1132 raiseEq(.8-.9)と75%、1133 eqAdj<0.3、1137 shoveCall(.47、無い時.55)、1138 の eqAdj≥.6 のラベル、1143 eq≥.8 の trap、1146 eq<.42 のブラフ、1120 の .5。多人数で勝率の見積もりを変えても、これらを人数で補正しないとコール・ベットが過剰になる。型はそのままに、nOpp とコーラー数で閾値をずらす関数を allstar.js に作り、AI_STYLES/aiPickSize/countStrongOuts/betSizeToChips を借りる。1119 の forceLargeBet は不要。
- 6席用の ctx 組み立て（新規。元は game.js 13944-13950 の ctx 構築）：本編は state.pot - need（13948）を potBeforeBet にしているが、多人数ではコーラーや複数回のレイズがあるので成り立たない。「最高額の賭けが入る前のポット」を卓で記録する。playerAllIn(13949)は state.playerChips<=0 という「ミミがオールイン」の意味なので「向き合う賭けがオールインか」に読み替える(1132/1133/1137 が再レイズ禁止とコール下限に使う)。toCall は min(最高額−自分の額, 自分のスタック)、pot は全員分の合計。
- 相手ごとの学習の持ち方（新規。元は game.js 13744 / 13764 / 13830 の playerFolds / playerCalls / playerShoves と 1113-1116, 1129-1130）：sticky と respect の割引はミミ1人を見る前提。ミミが同じハンドに残っている時だけミミの数字を渡し、AI 同士の判断には 0 を渡す。AI 同士で学習し合わせたいなら、(観察する席, 観察される席)ごとの表を新設する。
- 6人卓のプリフロップ（オープン・リンプ・レイズ・ポジション）（新規。元は game.js 1123-1147 と 13771 / 14283 の進行）：本編は AI が先に賭けるプリフロップが無い(ミミが先に動き、チェック/コールでフロップへ)。AI がオープンする・リンプする・三番手以降が3ベットする場面の入力と判断が既存コードに無い。ポジション・ブラインドの概念も game.js に無い(講義文 2037, 2251 のみ)。アンテ制のままでも手番順だけは必要で、ポジションを判断に入れるなら複製関数に position を足す。opponentPreflopStrength(14174)は AI の判断に使われていない死んだ経路で、実際にはプリフロップも equityVsRandom(board=[])で見積もっている。
- 手番・最小レイズ・サイドポット・フォールド処理の進行（新規。元は game.js opponentTurn 13906 / opponentTurnDecide 13920-14172 / refundUncalledBet 14273 / advanceAfterCall 14283）：opponentTurnDecide は state.opponentChips、画面、battleTimeout、flyChips、心理バトル、ボス演出と密着していて借りられない。最小レイズ(14056: need+max(50,need))は2人専用、返金(14273)は2人専用で、サイドポットは存在しない。6人の手番ループ・ベットの締め判定・サイドポットは丸ごと allstar.js に作る。AI の action→チップ額の変換規則(14036-14058)だけ、仕様として写す。
- オールイン（allin）のサイズ（新規。元は aiPickSize 1080-1101 と betSizeToChips 1166）：AI は allin を返さない(サイズは pot_1_3〜pot_1 の4種)。betSizeToChips が上限を切るので結果的に全額になることはあるが、AI が押す判断は無い。勝ち残り戦で短いスタックの AI が押す判断を入れるなら、スタック/ポット比(SPR)を ctx に足して複製関数に押す条件を作る。
- 席別の発話・反応・表情（game.js opponentSpeech 1175 / opponentReadyLine 1360 / opponentReactToPlayerFold 1414 / opponentReactToPlayerAggression 1474 / playEmote 17654 / maybeOpponentTell 17803）：opponentSpeech 系は state.opponentId を見て分岐する。席別に使うには ricoSpeech / polkaSpeech 等を直接呼ぶ(上の reusable)。ミミの行動への反応(1414/1474)は state 依存で、1人分の表示領域(.char-opponent)を前提にした UI。6席の吹き出しと顔は新規に作る。テル(14086-14089)は action.eq が <0.42 か ≥0.62 の時だけ出る約束なので、eq を多人数勝率に替えた時は閾値も揃える。
- リコ先輩（本気）の profile（game.js 12488-12489 に直書き。OPPONENTS.rico_tutorial.profile(478)は別物）：卓用のリコには { style:'rico_serious' } を allstar.js で作る必要がある(名前付きの定数が無い)。478 行の style は 'rico_tutorial' で、sizing='flat'・ブラフ上乗せ無し・shoveCall 無しの弱い性格。

### 注意
- 勝率の物差しが1対1の前提。AI_STYLES の閾値(valueEq .62-.66、raiseEq .8-.9、shoveCall .47 ほか)は全部「ランダムな1人の手に勝つ確率」で較正されている。多人数用に補正せずに 1103 の関数を呼ぶと、5人相手で平均的な手でもコール・ベットするため、全員が過剰に参加して勝ち残り戦が短く荒れる。AA が1人相手で約0.85、5人相手で約0.5という数字は一般的なポーカーの知識で、コードからは確認していない。
- profile の数値(bluffTendency, aggression, foldDiscipline, valueBetTendency, drawAggression, trapTendency, pressureTalkTendency)は style があれば判断に効かない。卓の調整を OPPONENTS 側の数値でやっても何も変わらない。変えるのは AI_STYLES か、その写し。
- OPPONENT_PERSONALITY(6877)と OPPONENTS のコメント・desc は実装と一致しない。例えばセリナの「ドロー警戒で大ベット」「ドライボードで消極的」は未実装(boardDanger は ctx に入るが読まれない)。ヴェルベットの「標準で2/3ポット以上」も実装は polar で、価値ベットは eq≥.82 で pot_1、それ以下は pot_1_3。人格の説明文を卓のセリフや表示に流用すると、挙動とずれる。
- AI_STYLES は共有の const オブジェクト。卓用に値を書き換えると本編の対戦(ポルカ〜ヴェルベット)の強さがそのまま変わる。必ず {...AI_STYLES.x} の写しを使うこと。window.AI_STYLES は無いので、別ファイルから参照する時は裸の名前を使う(qa/probe/sim.js は eval でこれを回避している)。
- decideOpponentAction は自分のスタックも相手のスタックも見ない(qa が oppChips を渡しているが未使用)。スタックの違う6人(800/1000/1200/1300/1500、本気リコは 2000 開始)で、全財産を懸けるコールが同じ基準で行われる。短いスタックで押し返される場面や、深いスタックの AI がオールインに全額コールする場面の質が下がる。
- ミミの数字の混入。sticky/respect/shoves は state.playerCalls/Folds/Shoves(ミミ専用)から来る。AI 同士の判断にも同じ数字を渡すと、ミミが同じハンドにいなくても AI の頻度が動く。渡す条件を決めておくこと。
- equityVsRandom の抽選は160回で誤差約±4%。閾値の近く(valueEq .64-.66 や odds×loose)では毎回の判断が揺れる。多人数版で2×nOpp 枚を配る時に回数を据え置くと、さらに揺れる。ハンドごとの再現性が要るなら、rand() が Math.random 固定(811)でシードが無い点に注意する。
- opponentTurnDecide(13920-14172)は判断と進行・演出・心理バトル・ボス専用の発火(triggerBoss はヴェルベットだけ)が一体。AI の部分だけを抜き出すと、forceLargeBet(13972)・最小レイズ(14056)・オールインへの check_call 強制(13988)・テル(14086)といった副作用の規則を見落としやすい。本編を壊さない前提では、この関数に手を入れず仕様だけ読んで写すのが安全。
- 本編のヘッズアップはプリフロップで AI が先に賭けない設計。1146 の「プリフロップではブラフ禁止」や 1144 の価値ベットは、本編では実質死んだ経路で、実戦で一度も鍛えられていない。6人卓でプリフロップを AI に開かせると、ここが初めて本格的に動く。qa/probe/sim.js もプリフロップは AI が応じる側だけを模している。
- 作業ディレクトリは C:\Users\takakazu\projects\mimi_porker（main の古い game.js 約101万字)で、依頼文の mp_panyu は別のワークツリー(.git が mimi_porker/.git/worktrees/mp_panyu を指す。game.js 1014330 バイト、home.js・ui-modal.css あり)。この報告の行番号はすべて mp_panyu 側のもの。mimi_porker 側は別版でずれる。

## 面：

【結論】6人卓の「進行」はほぼ作り直し。「判定と頭脳」は借りられる。
【行番号の基準】行番号は指定どおり C:/Users/takakazu/projects/mp_panyu/game.js（panyu-release の worktree、18515行）で数えた。作業フォルダ mimi_porker の game.js は18305行で行がずれる（例：showdown は mp_panyu 15842、mimi_porker 15634）。ポーカー中核の中身は diff で差分なしと確認した。
【今の仕組み】完全なヘッズアップ専用。ブラインドもディーラーボタンもサイドポットも無い。強制ベットはアンテだけ（13601-13606）で、ポットは state.pot の1つの数。手番は決め打ちで、プリフロップはミミから（13631）、フロップ以降は相手から（14303・14319・14337・14353）。
【ストリート】state.handPhase は 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'turnRiver'（ターン＋リバー同時のライト版）| 'showdown'。2901行のコメントは古い。本編の4人は fullHand:true なので turn と river は別々に開く（14315-14365）。
【借りられる】デッキ（828）・役判定（843）・高速スコア（965）・相手AIの判断（1103）と賭け額（1159）・アンテ段階（1154）。座席に依存しない純関数が中心。
【作り直す】座席一覧、ボタン位置、手番の回し方、ベット1周の終了判定、フォールド勝ち、オールイン／サイドポット／戻し、ショーダウンの複数勝者、複数人相手の勝率、脱落と勝ち残りの終了判定、結果・実績への接続。
【最大の注意】AIの強さ見積もり equityVsRandom（1022）は「ランダムな相手1人」との勝率。6人卓にそのまま使うとコールが緩くなりすぎるので、相手人数ぶんの勝率計算の追加が必須。
【置き場】allstar.js は index.html 491行の game.js の後ろに追加。deploy.yml:31 のコピー一覧にも足さないと配信チェック（39-47行）で止まる。
【未実施】編集・実行はしていない（読み取りのみ）。

### 借りられる
- デッキ生成・乱数（mp_panyu/game.js: rand 811、pick 812、shuffle 813-820、newDeck 828-834、SUITS 825、RANK_NAMES 826）：そのまま使える。newDeck は52枚 {suit,rank,label} を混ぜて返す純関数。配りは本編と同じ deck.pop()（13619-13620）で、バーン札なし。6人は手札12枚＋ボード5枚＝17回 pop。
- 役判定（役の強さを返す関数）（evaluateHand 843-854、combinations 855-867、evalFive 868-903、mkScore 904-911、HAND_NAMES 836）：7枚（5枚以上）を渡すと {rank 0-9, name, score, bestFive} を返す。score が同点なら === で引き分け判定できる。6人のショーダウンは生き残り席ごとに呼んで score を比べるだけ。5枚未満だと {rank:0,name:'-',score:0} で bestFive が無い点だけ注意。
- 高速スコア（fastHandScore 965-1019）：7枚の最強役を1つの数で返す。複数人エクイティの Monte Carlo にはこれを使う。evaluateHand の score とは尺度が違う（SFは8e10+上段、フラッシュは5e10+など）ので、両者の値を混ぜて比べない。
- 勝率計算の雛形とアウツ（equityVsRandom 1022-1039、countStrongOuts 1042-1054）：equityVsRandom は「ランダム1人」との勝率なのでそのままでは6人用に使えないが、引き方・シャッフル・引き分け0.5の骨組みを複数人版の雛形に使える。countStrongOuts は純関数でそのまま使える。
- 相手AIの頭脳（decideOpponentAction 1103-1148、AI_STYLES 1063-1070、aiStyleOf 1071-1079、aiPickSize 1080-1101、betSizeToChips 1159-1172）：座席に依存しない純関数。ctx={hole, board, toCall, pot, potBeforeBet, canCheck, playerShoves, playerAllIn, playerCalls, playerFolds, handStrength} を渡すと {type:'fold'|'check_call'|'bet', size:'pot_1_3'|'pot_1_2'|'pot_2_3'|'pot_1', intent, eq} を返す。5人の性格：リコ（真剣）= style 'rico_serious'（プロフィールは startBattleInternal 12489 に直書き）、ポルカ 'polka'、セリナ 'selina'、グラーノ 'grano'、ヴェルベット 'velvet'（OPPONENTS 474- の profile）。強さ eq は 1108 で equityVsRandom（相手1人）を呼ぶので、6人卓用の eq を差し込む手当てが必要（risks 参照）。
- プリフロップ強度・場の危険度・手札強度・解説（opponentPreflopStrength 14174-14211、evaluateBoardDanger 1713-1733、handStrength01 914-919、mimiAssess 13670-13728）：どれも手札・ボードを引数に取る純関数（mimiAssess は save のノート所持だけ参照）。opponentPreflopStrength は Chen 式で 0.15-0.90 を返す。mimiAssess は数値（相手の出し額・ポット・コール必要額）を渡せば使える。
- アンテの段階と初期チップの元値（ANTE_STEP 1152、ANTE_LEVELS 1153、anteForHand 1154-1156、OPPONENTS 474-（chips: ポルカ1000・セリナ1200・グラーノ1300・ヴェルベット1500）、startingBaseChips 12403-12406（本気リコ2000））：anteForHand は handNo だけの純関数で借りられる（50→400、4ハンドごと）。金額と段階は2人戦の調整なので6人卓では見直す。
- 進行の道具（battleGen 2927、battleTimeout 2928-2931、log 2933、waitOrSkip 7017）：battleTimeout は世代が違えば実行しないガード付きタイマー。そのまま使える（開始と終了で battleGen++ すること）。log は state.logs[category] を前提にするので、allstar 用に使うなら別のログ先を用意する。
- 相手席ごとのセリフ（polkaSpeech 1644、selinaSpeech 1256、granoSpeech 1301、velvetSpeech 5660、ricoSeriousSpeech 1221（振り分け役 opponentSpeech 1175-1181））：各関数は action だけで決まり、state を読まない（ricoSpeech 1183 だけ state.seriousRicoMode を1回参照）。振り分け opponentSpeech は state.opponentId 依存なので、座席IDで自前に振り分ける。
- 物理チップ表示とボード公開などの見た目部品（decomposeToChips 6074-6089、pushPotChips 6090-6094、resetPotChips 6095、revealCommunity 7070-7107、visibleCommunity 7136、cardKey 7141、flyChips 7209、floatText 7242）：チップの積み上げは state.potChips に積むだけで、ポットの総額に依存しない。revealCommunity は 7098 で state.screen==='battle' を要求し、computeRevealTier（6974-7014）が state.playerHand / state.opponentHand を読む。state.opponentHand が2枚でなければ相手側の判定は走らない（6989）ので空にしておく。flyChips / floatText は CSS セレクタ（.char-opponent 等）が単一の相手前提。
- クリア後の解放判定（isEndingUnlocked 346、markStageCleared 348-352、STAGE_ORDER 4015）：velvet 撃破で save.endingUnlocked が立つ。オールスター卓の解放条件にそのまま使える。

### 作り直す
- 座席の状態とボタン位置（defaultState 2878-2923（playerChips 2889、opponentChips 2890、playerHand 2894、opponentHand 2895、currentBetPlayer 2915、currentBetOpponent 2916、isPlayerTurn 2917））：状態がミミと相手1人の2人分しか無い。state.playerChips は71行、opponentChips 52行、currentBetOpponent 50行、isPlayerTurn 38行から参照されているので、本編の state に座席を足すのは危険。allstar.js に seats[]（id・chips・hole・folded・allIn・street中の出し額・ハンド通算の出し額・acted）とディーラーボタンを持つ別状態を作る。
- ハンド開始（アンテ・配り・ボタン・脱落席の飛ばし）（startHand 13585-13655（アンテ2人ぶん 13601-13606、配り 13619-13620、終了判定 13588））：アンテは2人だけ、配りは2＋2枚、どちらかが0チップなら対戦終了、とすべて2人前提。ブラインドは本編に無い（アンテ方式、2251-2253の講義文にも明記）。6席のアンテ徴収、ボタン移動、脱落席の除外、最初に動く席を作る。ブラインドを入れるかアンテのままにするかも決める。
- ベット1周の進行エンジン（手番・1周終了判定・最小レイズ）（playerFold 13733-13754、playerCall 13755-13770、playerCheckCall 13771-13782、playerRaise 13783-13801、playerBet 13802-13827、playerAllIn 13828-13848、opponentTurn 13906-13919、opponentTurnDecide 13920-14172、advanceAfterCall 14283-14368）：手番ポインタも「全員が出し額をそろえ、全員が一度動いたら終わり」の判定も無い。2人の交互が前提で、ミミが先にチェックしただけで即ストリート終了（13771-13781）、相手のコールで即終了（14019-14021）になる。最小レイズも場当たり（13806-13810、14056-14057、プリフロップは固定50×BB 13786）。手番ポインタ、1周終了判定、最小レイズ幅の記録、レイズでの手番復活を持つ applyAction(seat, action) を作る。
- 全員フォールド勝ち（playerFold 13748-13750、opponentTurnDecide のフォールド処理 13992-14005）：降りたら相手に全ポットを渡す2人用の処理。生き残りが1人になったらその席へ配当して終わる処理を作る。
- オールイン・サイドポット・戻し（refundUncalledBet 14273-14281、opponentTurnDecide の自動進行 13925-13941・13988、advanceAfterCall の street 出し額リセット 14287-14288）：サイドポットは存在しない。ポットは state.pot のスカラー1つで、出し額もストリートごとにリセットされ、ハンド通算の出し額を持っていない。2人用の戻し処理と自動めくりの分岐があるだけ。座席ごとの通算出し額から、金額の層ごとのポットと参加資格者を作り、誰も呼ばなかった層は1人だけの層として戻す処理を作る。残りが全員オールインの時の場札の自動めくりも作り直す。
- ショーダウンと配当（showdown 15842-15937（比較 15844-15858、配当 15912-15931、端数 15925-15926）、showdownTiming 15940-15955、showShowdownCallout 7253-7266、sdHighlight 15894）：ミミ対相手の比較と 'player'/'opponent'/'split' の3択、端数は相手へ、という2人専用。複数勝者・ポットごとの勝者判定・端数ルール・複数人のカード公開を作る。演出系も2人前提。
- 複数人相手のエクイティ（勝率）（computeEquity 6321-6370、recordEquitySnapshot 6372-6379、realisticEquity01 923-946、computeSuggestVerb 7531-7540、playerFold の評価 13740）：computeEquity は2人の全列挙で、プリフロップは Chen 強度の比（6363-6366）で代用している。realisticEquity01 はヘッズアップの帯。AIの eq（1108）、提案（7533）、フォールド評価（13740）は全部「ランダム1人」との勝率。fastHandScore を使い、相手n人の Monte Carlo（トップ同点は山分け）を新規に作る。
- AIの閾値の再調整と相手の記憶（AI_STYLES 1063-1070（valueEq・raiseEq・shoveCall・loose）、ctx の playerShoves / playerCalls / playerFolds（13949-13950、更新箇所 13744・13764・13830））：閾値は2人戦で qa/sim.mjs を使って調整してある。相手が複数残る6人卓では同じ手でも勝率が下がるので、そのままだと過剰にコールする。癖カウンタも「人間1人」ぶんなので、座席ごと（またはミミだけ）に作り直す。
- 脱落・勝ち残り・終了と報酬（continueAfterHand 16370-16386、canRebuy / showRebuy 14225-14270、endBattle 16570-16868、isDominanceMode 16390-16398）：終了条件は「どちらかが0」、報酬・ランク・初回クリア記録は OPPONENTS[state.opponentId] 前提、座り直しはミミ1回だけ。脱落席の除外、ミミ脱落＝敗北、5人全員脱落＝優勝、オールスター卓用の報酬を allstar.js に作る。
- ミミの操作ボタンの金額計算（renderActionArea 7333-7487（need 7360、ポット比の額 7361-7363、BB 7365）、renderVerbActions 7494-7528）：need が currentBetOpponent - currentBetPlayer（2人前提）、レイズ額はポット比と固定50の倍数。6人用の need（場の最大出し額－ミミの出し額）と最小レイズに直す。UIは別の面だが、金額の計算はこの面の部分。
- 結果の記録と実績の接続（state.handResults への push（13747・13995・15915-15928）、endHand 15987-16042、showHandResultBanner 16045-16359、checkHandAchievements 116（16318から呼ぶ））：{winner:'player'|'opponent'|'split'} の2人形式を連勝・実績・称号が読む。6人卓の結果をここに混ぜると本編の記録が壊れるので、別の履歴にして接続を切る。

### 注意
- 行番号のずれ：作業フォルダ mimi_porker（18305行）と指定リポジトリ mp_panyu（worktree、18515行）で game.js の行がずれる。本回答は mp_panyu 基準。実装時は必ず grep し直してから参照すること。
- 名前の衝突：game.js は 'use strict' の通常スクリプトで、top-level の const / let（state・SUITS・OPPONENTS・AI_STYLES・ANTE_LEVELS・save など）も関数宣言もすべてグローバル。allstar.js で同名の const を宣言すると SyntaxError でファイルごと動かず、同名の関数を宣言すると黙って本編の関数を上書きする（例：showdown / startHand / endHand）。allstar.js 全体を IIFE で包み、公開する名前は window.AllStar 1つにする。game.js の const / let は裸の名前で参照できる（home.js と qa/probe/sim.js が同じ手を使っている）。
- AIの強さの狂い：decideOpponentAction は 1108 で必ず equityVsRandom（相手1人）を使う。hole を渡さず handStrength に複数人エクイティを入れる抜け道もあるが、1110 の draw が 0 になり、セミブラフ（1145）とドロー加点（1136）が消える。確実なのは、1108 に ctx.eq があればそれを使う分岐を足すこと（1行、挙動は変わらない）か、関数ごと allstar.js にコピーすること。どちらを選ぶかは編集方針と相談。
- 本編の巻き込み：render の case 'battle'（2942-2963）、revealCommunity の画面チェック（7098）、updateDangerState、各種演出は state.screen==='battle' と単一の相手を前提にしている。6人卓を本編の state に載せると、HU の演出・保存・実績が誤作動する。6席専用の状態を別に持ち、使う本編ヘルパーには必要最小限のフィールド（pot・community・playerHand など）だけ渡す。
- タイマーの混線：battleTimeout は battleGen が違うと実行しない。6人卓の開始と終了でも battleGen++ しないと、前の対戦の予約が新しい卓を動かす（startBattleInternal と endBattle の作法に合わせる）。
- 賭けの規則が場当たり：端数チップ、オールインでのレイズ再開、最小レイズ（50または need）がバラバラに書かれている（13806-13810、14056-14057、7365）。6人では誤りが目立つので、単一の applyAction に集約し、全席とミミの操作が同じ関数を通るようにする。
- mimiAssess の副作用：13684 の allCards.sort が配列を内側で並べ替える。呼び出し側は展開コピー（[...hand, ...board]）を渡しているので現状は無害だが、座席の配列を直接渡すと順番が変わる。
- 配信：index.html の読み込み順は loader.js（489）→ home.js（490）→ game.js（491）。allstar.js は game.js の後ろ（492行目以降）に追加し、?v= の値も更新する。deploy.yml:31 のコピー一覧に allstar.js が無いと、配信前チェック（39-47行）で「missing」となり配信が止まる。
- 6人卓のバランス：アンテ4ハンドごとの上げ（ANTE_STEP 1152）と、相手が2倍積む設定（12505）は2人戦の調整。6人では総ポットが3倍になるので、段階とスタックは別に決める。
- 時間の見積もり：evaluateHand は7枚で21通りを毎回評価するので、ショーダウン（最大6席）には十分速いが、勝率の Monte Carlo には遅い。必ず fastHandScore を使う。AI5人が毎手番で複数人 Monte Carlo を回すと重くなるので、サンプル数（今は160）の調整が必要。

## 面：

Yes Boss! 面「解放・セーブ・ご褒美・入口」の調査結果（読むだけ。編集・実行なし）。対象は C:/Users/takakazu/projects/mp_panyu（panyu-release）。注意：game.js・style.css・index.html は他者が 06:44 まで未コミットで編集していて途中で行番号がずれた。下の行は 06:52 時点（game.js 更新 06:44:04）、ずれたら関数名で探すこと。
【解放】今ある印は save.endingUnlocked（velvet 撃破で立つ派生旗、normalizeSave 292 と markStageCleared 373）と save.clearedStages だけ。skipStageWithCoins（12384、velvet は 4500 コイン）でも両方立つので、コインで飛ばしても開く。「ending を見た印」は存在しない（EPISODES.ending は episodesSeen に入らない）。実勝利の証拠は save.bestRanks.velvet：endBattle の !practice の勝利でだけ書かれ（16703）、スキップは書かない。推奨：allstarUnlocked() = !!save.bestRanks?.velvet（移行不要・新ゲームで自動的に閉じる）。見た印が要るなら showEndingFinalButtons（8584）に save.allstar.endingSeen を立てる。
【セーブ】キーは tousatsu_mimi_save_v1 の 1 個。loadProgress（381）は {...defaultSave(), ...data} の浅い合併なので、新キーは defaultSave（225）に足し、入れ子の穴は normalizeSave で埋める（前例：save.minipoker と mpEnsureSave 9485）。提案：save.allstar = {introSeen, endingSeen, runs, wins, bestPlace, places[6], finalistVs{}, history[10], firstWinClaimed, run:null}。「コインと所持品を持って最初から」の KEEP_KEYS（7644）には入れない（進捗と一緒に消える。所持品の衣装は残る）。
【入口】ホームの主ボタン＝ .h15-ticket（index.html 160 の tpl-lobby、data-action=battle-start）。クリア後は renderHomeLobby（home.js 32）が sid を velvet に固定するので「今夜の卓へ」はヴェルベット再戦のまま。allstarUnlocked() の時だけ札の data-action を allstar-open、ラベルを「時鐘杯へ」（PC 6字・スマホ 5字まで）、賞金欄 .h15-prize を差し替える。lobbyNextStageId は introPlayed 未済だと null にならないので next の有無を条件にしない。6つ目の札はスマホ（h15-sm）に入らない（札5枚で y≈610、台帳の上端が y≈615）。台帳の絵は5枠固定（home.js 68 の positions）なので VI は足さず、showHomeLedger（223）の末尾に大会の行を足す。本編5人の再戦はそこに残る。
【戻り】大会の結果は専用の窓（.home-overlay/.home-dialog＝ui-modal.css の型に自動で入る。openHomeDialog 245）→「ホームへ」で goLobby()（8618。battleGen++ で battleTimeout の予約が死ぬ）。中断も goLobby。render()（2967）に case 'allstar' を1つ足す。
【ご褒美】コイン：save.coins += n → saveProgress（endBattle 16728 と同じ。バンクロール+10% は掛けない）。称号：ACHIEVEMENTS（40）に cat '大会' ＋ GOLD_MARK_CAT（29）＋ showCollectionModal の achievements（11898）。衣装：buyItem（5486）と同じく ownedItems.push → applyItemEffect（5148）→ applyEquippedStyles。ミミ・黄金（mimi_skin_gold）は既存、所持済みなら 1500 コイン。交換所の requires は 'ending' しか見ない（shopItemBlock 5353）ので 'allstar' を足す。既存の案は docs/design-ref/allstar-astra.md（時鐘杯・賞金 1200/600/300/100/50/0）。
【ファイル】新規 allstar.js（IIFE で window.Allstar。home.js と同じく game.js の前に読む）、必要なら allstar.css。game.js は defaultSave/normalizeSave、onAction（7595）に allstar-* の case、render() に case、goLobby の掃除、injectAudioBars（8780）の host、lobbyRicoLine（4687）・nextGoalText（16933）に一行。home.js は renderHomeLobby と showHomeLedger。loader.js は MA.sets（105）に allstarNow を足し、assets/manifest.js を qa/genmanifest.mjs で作り直す。deploy.yml 31 行の cp に allstar.js（と css）を足す。index.html は script を home.js の次に足し、?v= を全20箇所そろえて上げる。

### 借りられる
- セーブの読み書き一式（C:/Users/takakazu/projects/mp_panyu/game.js defaultSave:225 normalizeSave:292 loadProgress:381 saveProgress:402 wipeAllProgress:440 SAVE_KEY:11）：新キー save.allstar を defaultSave に足し、normalizeSave で入れ子を補う。saveProgress は save 全体を書くだけなので run（中断保存）もそのまま入る。前例は save.minipoker と mpEnsureSave（9485）。
- 解放の判定部品（game.js isEndingUnlocked:371 markStageCleared:373 endBattle 内の bestRanks 書き込み:16703）：allstarUnlocked() は !!save.bestRanks?.velvet で実勝利だけを数える。ゆるくするなら isEndingUnlocked()（コインで飛ばしても開く）。
- ホームの札・額・台帳・開幕の儀（C:/Users/takakazu/projects/mp_panyu/home.js renderHomeLobby:32（ticket:54-59 額:44-52） showHomeLedger:223 homeCeremonyPlan:131）：札の dataset.action・ラベル・.h15-prize を解放時だけ差し替える。額は data-action を allstar-record に替え、金の紋章 assets/ui/emblem_rabbit_gold.webp を流用すれば新規絵なし。初回の解放通知は儀式の finish 後に出す（mountHomeMotion がログボの窓を待つのと同じ作法）。
- 小窓の型 openHomeDialog（home.js openHomeDialog:245 / ui-modal.css の :is(.home-overlay, .home-dialog)）：入場案内・結果・大会記録を .home-overlay＋.home-dialog＋[data-home-close] で作れば、深紅・二重金線・明朝の型が CSS 追記なしで入る。内側の [data-action] は押すと窓を閉じて onAction へ渡る。新しい窓クラスを作ると ui-modal.css の :is リストに足し忘れる。
- ロビーへの戻りと時間割の殺し方（game.js goLobby:8618 battleTimeout:2953 battleGen）：終了・中断は goLobby() を呼ぶ。大会内の setTimeout は battleTimeout で包めば、ロビーへ戻った時に自動で無効になる。
- 報酬の付け方（game.js buyItem:5486 applyItemEffect:5148 isItemOwned:5347 unlockAchievement:100 SHOP_ITEMS:4987 EQUIP_CATEGORIES:9270）：衣装は ownedItems.push(id) → applyItemEffect(id) → applyEquippedStyles() → saveProgress()。所持済みなら代わりにコイン。称号は unlockAchievement('id')（state.peekUsed が真だと無言で false を返す点に注意）。
- 読み込み係とローディングの幕（C:/Users/takakazu/projects/mp_panyu/loader.js MA.warm:68 ready:78 release:87 sets:105 / game.js showLoadingVeil:12470 battleAssetsGate:12452 warmNextBattle:12478）：MA.sets に allstarNow() を足し、入場前に MA.ready で待ち、showLoadingVeil で準備中を出し、ホームに戻る時 MA.release('allstar')。ホームにいる間の先読みは warmNextBattle（クリア後は velvet を温めるだけ）に大会分を足す。
- 題字と幕間の演出（game.js EPISODES:3409 showEpisodeTitle:3578（ep-bg-* は style.css 7873-7898） INTERMISSIONS:3820）：EPISODES.allstar を足し、assets/episodes/allstar.webp を置けば初回入場の題字が出せる（bg は CSS クラス名）。showIntermission は OPPONENTS[id] を引くので大会には不向き、自前の窓にする。
- UI の小道具（game.js showConfirm:18122 toast:18154 mpSfx:9732 animateCoinCountUp:17016 playSceneBgm:8713 SCENE_BGM:8698）：中断の確認・賞金のカウントアップ・効果音・BGM は既存関数をそのまま呼ぶ。BGM は SCENE_BGM に 1 行足して playSceneBgm('allstar')。
- 配信の検査工程（C:/Users/takakazu/projects/mp_panyu/.github/workflows/deploy.yml 39-47）：index.html の src/href を全部たどり、_site に無ければ配信を止める。allstar.js を足し忘れても公開事故にならずビルドが落ちる。ただし index.html が静的に参照するファイルだけが対象（動的に読むと守られない）。
- 既存の設計メモ（C:/Users/takakazu/projects/mp_panyu/docs/design-ref/allstar-brief.md と allstar-astra.md）：大会名「時鐘杯」、賞金表、初優勝特典（称号と ミミ・黄金）、台帳に VI を足さない方針、入場案内の寸法がすでにある。本調査はそれらをコード上の接続点に落とした。

### 作り直す
- allstar.js 本体（6人用の進行と状態）（C:/Users/takakazu/projects/mp_panyu/allstar.js（新規・最上位））：startBattleInternal（12505）は state を ヘッズアップ前提（playerChips/opponentChips）で作る。大会専用の状態を window.Allstar の IIFE に閉じ、state.screen='allstar' だけ共有する。クラシックスクリプトはトップレベルの const/let を共有するので、game.js と名前が重なると後に読む方が SyntaxError で丸ごと落ちる。
- save.allstar の形と補正（game.js defaultSave:225 / normalizeSave:292）：loadProgress が浅い合併なので入れ子の穴を normalizeSave で埋めないと、古いセーブで undefined を読む。補正は game.js 側に書く（save = loadProgress() は game.js の最終行近く:18503 で同期実行され、そこから allstar.js の関数を呼ぶと読み込み順に依存する）。
- 解放の判定と見た印（game.js endBattle:16600（bestRanks 書き込み:16703）/ showEndingFinalButtons:8584）：ending を見た印が存在しない。ゆるい判定は isEndingUnlocked()、厳密な判定は bestRanks.velvet。見た印を使うなら showEndingFinalButtons に印を立てる一行が要る。
- ホームの入口の分岐（home.js renderHomeLobby:32 / showHomeLedger:223 / game.js lobbyRicoLine:4687 warmNextBattle:12478）：札・額・賞金欄は毎回描き直されるので、解放時の分岐を renderHomeLobby に入れる。台帳の絵は5枠固定で VI を足せない。リコの台詞は衣装によって上書きされる（applyHomeCostume）ので、入口は札のラベルだけで成立させる。
- onAction と render の接続（game.js onAction:7595 render:2967 goLobby:8618 injectAudioBars:8780）：allstar-open/resume/record/quit の case、render() の case 'allstar'、goLobby の掃除（overlay のクラス名を列挙している）、音のボタンの host セレクタ（.battle-screen.v2, .shop-screen.v2, .result-screen のみ）がそれぞれ1行必要。back-lobby は state.screen==='battle' の時だけ確認を出すので、大会は専用の中断アクションにする。player-* の名前は introHandMode の横取りに掛かるので再利用しない。
- 賞金・初優勝特典の払い出し（allstar.js の payout() と game.js ACHIEVEMENTS:40 / GOLD_MARK_CAT:29 / showCollectionModal:11898 / shopItemBlock:5353 / SHOP_UNLOCK:5257）：endBattle の報酬計算はヘッズアップ専用で流用できない。順位別コイン、初優勝の称号と衣装、再戦時の逓減の有無を決めて書く。交換所の requires は 'ending' しか見ないので、大会限定の品を作るなら shopItemBlock と isShopItemUnlocked を拡張する。
- 入場案内・結果・記録の窓（allstar.js（.home-overlay/.home-dialog を流用）、必要なら allstar.css（新規））：結果は tpl-result（index.html 411）がランク・心理バトル・最大役などヘッズアップ前提なので使えない。専用の窓を作る。CSS を別ファイルにするなら index.html の link と deploy.yml の cp（ui-modal.css の 32 行と同型）も要る。style.css は 88 万字で他者が編集中なので追記は衝突しやすい。
- 素材の先読み組（loader.js MA.sets（105）と assets/manifest.js（qa/genmanifest.mjs で再生成））：6人分の顔・卓の背景・札の裏を入場前に読み切る組が無い。manifest に無い素材は MA.sets の filter(u => MAN[u]) で黙って落ちる。
- 配信の配線（deploy.yml 31 行 / index.html 476-491 / ?v= 20箇所（現在 20261016b））：deploy.yml は最上位 .js をファイル名で列挙している（cp index.html game.js home.js loader.js style.css read-compact.css）。足さないと allstar.js が 404 になる（過去に home.js で本番 404、a621468 で修正済）。script は home.js の次・game.js の前に置き、?v= は全部同じ新しい値にそろえる。battles/games/*.js の glob は MB.register の読み合い専用なので入れない。
- 解放後の通し検査（C:/Users/takakazu/projects/mp_panyu/qa/endingtour.mjs（未追跡）と qa/lib/session.mjs の openSession({save})）：velvet 撃破済みのセーブを入れてホーム→入場→結果→ホームを通す検査がまだ無い。手が離れてから、検査ブラウザは1つずつ実行する。

### 注意
- game.js・style.css・index.html は他者が未コミットで編集中（git status が M、game.js の更新は 06:44:04）。調査の途中でも行番号が 2〜3 行ずれた。実装前に関数名で再検索し、競合を避けるため編集の担当を決めること。
- クラシックスクリプトの落とし穴が2つ。1) allstar.js のトップレベル const/let が game.js と重なると後に読む方が丸ごと落ちる（IIFE と window.Allstar を使う）。2) home.js と loader.js は game.js より前に読まれるので、トップレベルで game.js の名前（OPPONENTS など）に触ると一時的未初期化エラーになる。関数の中でだけ触る。
- 解放の抜け道：endingUnlocked と clearedStages は 4500 コインの skipStageWithCoins でも立つ。「ヴェルベットに勝った後」を守るなら bestRanks.velvet を使う。ただし既存のクリア特典（clearBonus）はゆるい判定なので、大会だけ厳しくすると不一致が出る。プロデューサーの判断事項。
- 練習用「相手の手札を見る」（backdoorOn）：state.peekUsed が残ったままだと unlockAchievement が無言で失敗する（goLobby は state を作り直さない）。入場時に state = defaultState() するか peekUsed を明示的に落とし、大会ではピークを無効にするか記録対象外にする。
- ご褒美の経済：交換所は 57 品・価格合計 53,450 コイン、本編の初回クリア報酬の合計は 3,900。大会の 1 位 1,200 を逓減なしで払うと、再戦報酬の逓減（rematchPreview 12419：100%→20%）の設計意図を崩し、約45勝で全品を買える。逓減・日次上限・初回ボーナスのどれにするか要決定。
- 名札に称号を出す案：home.js 42 の save.playerName は読むだけで誰も書かない。称号の保持には新しい項目（例 save.allstar.title）と、スマホで幅 300px の名札に収める CSS が要る。
- 中断保存：saveProgress は save 全体を毎回書くので、ハンドの切れ目だけ保存する。rand() は Math.random（game.js 836）で種が無く、再読込で配り直すと山札が変わる。山札の並びも run に保存する。
- スマホ横（844x390）：ホームの札列は 5 枚で入れ替わる余地が無い。札のラベルは 5 字まで、賞金欄は 2 行（display:block の span）まで。h15-sm は innerHeight<500 で判定される。
- BGM：Velvet Deal.mp3 など新曲 5 本は mimi_porker/assets/bgm にだけあり（未追跡）、mp_panyu には無い。使うなら mp_panyu の assets/bgm にコピーして SCENE_BGM に登録する。各 2〜4MB なのでスマホの読み込み予算（perf-loading-principles）に注意。
- 配信経路が2つある（deploy.yml と、メモリにある pages-build-deployment のブランチ配信）。ブランチ配信ならリポジトリ全体が出るので allstar.js 欠落は起きないが、Actions 経路では必ず欠落する。どちらが本番か確かめるか、両方に通る形（deploy.yml に足す）にする。

## 面：

対象は C:/Users/takakazu/projects/mp_panyu（作業フォルダ mimi_porker より新しい版）。読むだけで、編集・実行はしていない。行番号は 2026-10-16 06:5x の作業ツリー（game.js・style.css は未コミットで、調査中も別所で編集が続き ±数行ずれた）。「≈L」は目安で、関数名・定数名で探すこと。
卓は #stage（1280×800 固定・transform:scale(--game-scale)）の中に、tpl-battle（index.html L222-352）を render() が innerHTML で丸ごと作り直す。位置は .battle-screen.v2.t8 の絶対配置（style.css L17159-17450、!important 多用）。相手は1枠（.v2-opp 600×318）で「席」という概念が無い。
スマホ横 844×390 は倍率 0.4875（左右に約110pxの黒帯）で同じ 1280×800 を縮小するだけ。html.is-compact（倍率<0.62）では文字を px÷--game-scale で大きくし（--fx-*）、一部の位置を直す。実寸（CSS px）で描く先例は read-compact.css L6-11（zoom:1/--game-scale＋inset:-gut）。
借りやすい部品：札（renderCardsInto／.card 系）、チップ飛行・浮遊数字（flyChips／floatText、セレクタ渡しで席に使える）、勝敗の演出（showWinBurst・showClutchCutIn・showCinemaBars・shakeImpact など）、SE（mpSfx）、BGM（SCENE_BGM／playSceneBgm）、先読み（MimiAssets）、表情の台帳（CHAR_EMOTES／TELL_LEAK／core.js の FACE_MAP）、台詞の表（○○Speech、MP_LINES）、卓の布・レール・卓スキン（.t8-* 層）、押す所の部品（.verb-*）。
ただし台詞・表情・カットイン・崩壊演出の関数は state.opponentId／state.opponentImgKey／.char-opponent／.bu-pot-physical に直結していて、6席では誤動作か何も起きない。「表だけ写して席IDで引く」か「席の要素を引数に取る形に書き直す」のが前提。
リコは id が rico_tutorial、画像キーが rico（表ごとに引くキーが違う）。MP_LINES にはリコが無い。
新規に作るもの：6席のDOM/CSS（PCとスマホ実寸の別座標）、席の状態表示、多人数ポット（サイド）、席ごとの演出の配線、開幕・ブラインド上昇・脱落・残り2人・優勝の演出、順位つき結果、共有背景、大会BGM、6人分の先読み組、新画面の進行への結線。
既存の設計案が docs/design-ref/allstar-brief.md と allstar-astra.md にある（席の座標表・状態表現・演出秒数。スマホ座標は実px）。実装前に読むこと。
素材：battle/face 34枚（320×400）、battle/chibi 30枚（6人×5姿）、ui/face_*.webp（256²）、characters/<key>_cutin_*（1000×563）。卓の背景は相手別4種のみ。mp_panyu の assets/bgm に大会用の曲は無い（mimi_porker 側に未追跡の候補5曲）。待機動画 idle_*.mp4 は部屋ごと撮った 600×450 で、席の小窓には使えない。

### 借りられる
- 札を描く renderCardsInto(el, cards, slotCount, key)（C:/Users/takakazu/projects/mp_panyu/game.js ≈L7169（cardKey ≈L7167、newDeck ≈L853、SUITS L850、RANK_NAMES L851）／style.css .card L5852、卓の札の顔 L17342-17359、スマホ L18415-18419、配り .card-deal L12285・めくり .card-flip L12294・.card-dim L12305・.sd-win L12310）：札は {suit:'♠',rank:14,label:'A'}。出力は <div class="card [red] [card-deal|card-flip] [highlight sd-win|card-dim]" style="--di:i" data-r data-s> の中に .rank/.suit/.center-suit。空きは .card.empty、溜め中の場札は .card.card-back.tease-card。そのまま呼べるが、state.__dealSeen[key]・state.sdHighlight（cardKey の Set）・state.pendingRevealFrom を読む。席ごとに key を分けるか、持ち方を席別にする。札の大きさは入れ物側の指定（.community-cards .card 62×86、.player-hand .card 92×128、.v2-band-hand .card 50×70／公開時64×90、L17329-17371）なので、6席の入れ物には自前のサイズ指定が要る。
- 伏せ札・溜めてめくる・小さい札（style.css .card.card-back L5881（assets/ui/card_back_default.webp 345×561、body[data-card-skin] L9326-9330）／game.js revealCommunity(cards,{thought,rico,done}) ≈L7096・computeRevealTier ≈L7000・waitOrSkip ≈L7043・.card.tease-card L13743（body.is-tease-reach|hot）／rpMiniCardHTML(suit,rank,extra,style) ≈L12618・.rp-mini-card 58×82 L14253）：伏せ札は <div class="card card-back"> をそのまま置ける（札の裏のスキンも効く）。溜めの手順は state.community・state.pendingRevealFrom・render() 前提なので手順だけ写す。席の公開手札（小さい札）は rpMiniCardHTML を呼び、CSS で 24〜40px 幅に縮める。
- 相手の全身の表情 OPPONENT_EXPRESSIONS / setOpponentExpression(mood)（game.js ≈L802 / ≈L812）：mood は default / pressure / rattled / pleased / defeat。画像は assets/characters/<key>_<差分>.webp（polka: panic, blush／grano: concerned, bow, recommend／rico: serious, smile／selina・velvet は差分なし＝空の表）。関数は state.opponentImgKey と [data-bind="opponentImg"], [data-opp-face] 固定なので、表だけ借りて席ごとに img.src を差し替える。
- 顔の表情の言葉と画像の場所（FACE_MAP ほか）（battles/core.js FACE_MAP L93-100・CHIBI_ALIAS L101・portraitSrc L102-106・setPortrait L108-116・assetPath L26-35（IIFE の中で、window.MB には出ていない）／assets/battle/face/・assets/battle/chibi/・assets/ui/face_*.webp）：言葉は think／smug／panic／busted／lose／win／plead。顔 assets/battle/face/<id>_<名>.webp は34枚（320×400）：polka bawl busted panic plead smug／selina bitter busted compose panic smug／grano busted grovel haggle panic smug／velvet bawl bawl_max busted busted_max defiant panic smirk_hide smug／rico applaud busted panic smug／mimi bawl calm sad shock smug think win。ミニキャラ assets/battle/chibi/<id>_{think,smug,panic,lose,win}.webp は6人×5。小さな顔 assets/ui/face_<key>.webp（256×256。polka selina grano velvet rico mimi。リコは衣装別 face_rico_<衣装>.webp）。FACE_MAP は表をそのまま新モジュールへ写す。落とす順は ミニキャラ→顔→ui/face（setPortrait と同じ）。
- 顔アップ・テルの台帳 CHAR_EMOTES / TELL_LEAK / emoteFaceSrc / playEmote（game.js CHAR_EMOTES ≈L17622・TELL_LEAK ≈L17603・charEmote ≈L17672・playEmote ≈L17689・buildEmoteFaceCard ≈L17729・emoteFaceSrc ≈L17765・OPP_CUTIN_FALLBACK ≈L17788・MIMI_EMOTE_FALLBACK ≈L17786・applyEmoteScreenFx ≈L17795／style.css .emote-cutin L15617）：出来事は tellStrong／tellStrongMax（ヴェルベットのみ）／tellBluff／busted／defeat／desperate → {expr, motion:'em-*', screen:'gold|pale|soft|shake|focus', i:'l'|'h'}。顔のゆれやすさ TELL_LEAK は polka .85／rico .60／grano .45／selina .30／velvet .12。顔アップの絵は characters/<key>_cutin_<expr>[_max].webp（1000×563）→ OPP_CUTIN_FALLBACK → <key>_default.webp の順。表（キーは imgKey：polka/selina/grano/velvet/rico/mimi）はそのまま使える。playEmote と emoteFaceSrc は state.opponentImgKey と .battle-screen .char-opponent の位置（軽い顔バッジは枠の left+74）に直結なので、席の要素とキーを渡す形に書き直して使う。
- ミミの表情 setMimiExpression(expr)（game.js ≈L727（state.mimiExpr に記録））：expr は default/think/calm/shock/win/sad/blush/smug。.battle-screen.v2 の中では assets/characters/mimi_bust_{calm,think,shock,win,sad,smug}.webp（750×1000。default は手番中 think・それ以外 calm）、無ければ mimi_<expr>.webp、装備スキン mimi_pink/panda/gold。対象は .battle-mimi-img と [data-mimi-face]。ミミの絵の img に data-mimi-face を付け、画面の根を .battle-screen.v2 にすればそのまま呼べる。
- 相手別の台詞の表 opponentSpeech ほか（game.js opponentSpeech ≈L1200 → ricoSpeech ≈L1208／ricoSeriousSpeech ≈L1246／selinaSpeech ≈L1281／granoSpeech ≈L1326／polkaSpeech ≈L1669／velvetSpeech ≈L5686、opponentReadyLine ≈L1385、opponentReactToPlayerFold ≈L1439、opponentReactToPlayerAggression(kind,amount) ≈L1499）：action は {type:'fold'|'check_call'|'bet', intent:'bluff'|'forced_bluff'|'value'|'draw'|'trap'|'check'|'call', size}（decideOpponentAction ≈L1128 が返す形）。kind は bet_small／bet_big／raise／allin。文面は使えるが、分岐は state.opponentId／state.seriousRicoMode／state.handNo を読み、反応の台詞は「ミミが賭けた」前提で書かれている。席のキーを引数に取る形で写す。
- 場面別の台詞 MP_LINES / mpLine(charKey, situation)（game.js MP_LINES ≈L9552・MP_MIMI_LINES ≈L9586・mpLine ≈L9594・mpMimiLine ≈L9601）：charKey は polka／selina／grano／velvet、situation は start／win／lose／tie／reach／big（リコは無く空文字を返す）。state 非依存でそのまま呼べる。勝った時・負けた時・配る時の一言に向く。脱落・ブラインド上昇・他のAIへの反応は無い。
- 人物の情報とプロフィール窓（game.js OPPONENTS ≈L499（name, chips, imgKey）・OPPONENT_APPEARANCE ≈L6889・OPPONENT_PERSONALITY ≈L6903・OPP_LATIN ≈L6454（RICO/POLKA/…）・showCharacterProfile(charId) ≈L8964（.char-profile-overlay）・onAction の case 'char-profile'（≈L7707））：id は rico_tutorial／polka／selina／grano／velvet。席の名札に data-action="char-profile" data-char="<id>" を付ければ、'__opponent__' 以外は id をそのまま渡せるので、結線だけでプロフィールが開く。
- 卓の背景（相手別）（game.js startBattleInternal 内の document.body.dataset.oppBg（goLobby で ''）／style.css L388-399（暗幕グラデ＋assets/backgrounds/table_<id>.webp＋poker_table_bg.webp の3層）、部屋の層 .bg-poker L17176（blur 5px・brightness .5・130%））：table_polka／selina／grano／velvet.webp と poker_table_bg.webp は各 1600×900。リコの専用背景は無く poker_table_bg.webp。共有の1枚で足りるなら oppBg='' で poker_table_bg.webp がそのまま出る。専用を足すなら L396-399 と同じ3層を1行足す。
- 卓の布・レール・卓スキン（style.css .t8-room L17183・.t8-opp-light L17201・.t8-rail L17208・.t8-felt L17213（布目SVG・光だまり・assets/ui/emblem_rabbit_gold.webp の透かし）・.t8-vignette L17223・.t8-topbar L17226、変数 --t8-felt-hi/mid/lo・--t8-pool・--t8-inlay とスキン別 body[data-table-skin]（emerald/vip/neon/speakeasy）L17166-17170・L17451-17479／game.js applyEquippedStyles ≈L5234）：楕円卓の布・革縁は、この層の CSS をコピーして楕円に直す。同じ変数・同じ body[data-table-skin] 指定を使えば、交換所で買った卓の色も効く。
- ポットとチップの表示・飛行（game.js renderPotBlock() ≈L6524・flyChips(fromSel,toSel,amount,opts) ≈L7235・floatText(sel,text,cls) ≈L7268・juiceScale/juiceRect ≈L7216/L7220・chipColorClass ≈L7227・mpChipClack ≈L9787／style.css .fly-chip L12320・.float-text L12336・.t8-stack L17317）：flyChips と floatText はセレクタ（か要素）を渡せば席にも使える（body直下に fixed で出る。矩形が取れないと何もしない）。枚数は clamp(round(√(額/20)),3,14)、着地音あり。ポットの見た目は assets/ui/chip_{red,gold,white,blue}.webp（各600×600）を額で2〜5段に積む。renderPotBlock は総額1つ前提なので見た目だけ借りる。
- 卓の上の情報（参加費・街・危険度・持ち点の帯）（game.js renderAnteInfo ≈L13591（.t8-ante L18160）・anteForHand ≈L1179・ANTE_STEP L1177・ANTE_LEVELS L1178・renderStreetList ≈L6509・renderDangerBar ≈L6628・renderTugOfWar(host) ≈L6475）：「いまの額と次に上がるハンド」の出し方（renderAnteInfo）はブラインド表示の型にそのまま読み替えられる。renderStreetList は PREFLOP…SHOWDOWN の表示。renderDangerBar は場札だけから作るので使える（ノート所持で文言が変わる）。renderTugOfWar は2人の割合の帯なので、6人の積み上げ帯に作り直す。
- 勝敗の演出（卓の上）（game.js showShowdownCallout(winner,pEv,oEv) ≈L7279（.sd-callout L12357）・showWinBurst(big) ≈L7136（.confetti L14017・.battle-screen.win-zoom）・showRevealBurst ≈L7152・showClutchCutIn(ms) ≈L774（assets/characters/mimi_clutch.webp、.clutch-cutin L14569）・showStreakBadge ≈L15992・showCinemaBars(on) ≈L17898・flashImpact ≈L17915・shakeImpact ≈L17924（.battle-screen.impact-shake）・playCollapse(who,event) ≈L17867・bumpTaunt ≈L17817・applyTauntAura ≈L17829（body.taunt-1..3））：showWinBurst・showRevealBurst・showClutchCutIn・showCinemaBars・flashImpact・shakeImpact は、根の要素が .battle-screen ならそのまま呼べる。showShowdownCallout は文言が「ミミの勝ち／相手の勝ち／引き分け」固定（winner は 'player'|'opponent'|'split'）なので、.sd-callout の見た目だけ使い6人用の文面にする。playCollapse は state.opponentImgKey 直結だが、「ためて暗転→一閃→叩きつけ」の段取りは脱落演出の型になる。
- 全画面のカットイン（大ベット・オールイン）（game.js showOpponentCutIn(text,betSize) ≈L17981（style.css .rico-cutin.v2-cutin L13273。assets/characters/<key>_cutin_smug.webp、斜め帯、'ALL IN/POT/2/3 POT/BET +額'）・showAllInCutIn(side,amount) ≈L13876（.allin-cutin L1990、mimi_allin.webp／<key>_default.webp）・triggerBetShake(betSize) ≈L18055（#stage に shake-strong|pot|allin））：どれも state.opponentImgKey／state.opponentName を読むので、キーと名前を引数に直せば席から呼べる。body 直下に fixed で出る（100vw×100vh）。
- 結果・優勝の型（game.js showHandResultBanner ≈L16070（.hand-result-overlay L7287・L17640、.hr-*）・endBattle ≈L16595・startResultFx ≈L16952（.result-reveal の段階表示・.rank-stamp）・animateCoinCountUp ≈L17017・triggerVelvetVictoryEffect ≈L17044（.tousatsu-effect L8662）／index.html tpl-result L411-474（背景 .bg-result-stage ＝ assets/backgrounds/bg_result_stage.jpg））：どれも2人用なので順位表つきの結果は作り直しだが、段階表示・ランクの判子・コインの数え上げ・全画面の優勝演出の型は借りる。スマホの結果の札の詰め方は style.css L18263-18285。
- 小さな通知と確認（game.js toast(msg,'big') ≈L18159（4.2秒。参加費アップで使用中）・showEpisodeChip(text) ≈L12865・showLoadingVeil() ≈L12465・showConfirm({...}) ≈L18127）：そのまま呼べる。ブラインド上昇の知らせや、やめる確認に使える。
- 効果音（game.js mpSfx(kind) ≈L9727・mpTone ≈L9697・mpSweep ≈L9712・mpChipClack ≈L9787・startTeaseHeartbeat ≈L7078・startDangerHeartbeat ≈L3012・isSfxOn/sfxVolFloat L364-365）：kind は tap／deal／flip／reach／bet／win／bigwin／royal／lose／tie／milestone／allin／check／call／battle-bet／battle-allin／fold／hand-win／hand-lose など。そのまま呼べる（save.equippedSePack==='casino' ならチップ音が厚くなる）。振動は navigator.vibrate を直接呼んでいる。
- BGM（game.js SCENE_BGM ≈L8693（{file,gain}：title／battle／boss／minigame）・playSceneBgm(key) ≈L8708・stopSceneBgm ≈L8724・startBgmForScreen ≈L8730・startBattleBgmSkin ≈L9954（isBoss で boss.mp3）・stopBattleBgmSkin ≈L9969・bgmVolFloat ≈L8673／index.html L76 の <audio id="scene-bgm-audio"> 1本）：SCENE_BGM に {file,gain} を1行足せば playSceneBgm('allstar') で鳴る（同じ曲なら頭出しせず継続）。決勝の2人で boss.mp3 に切り替える、なども同じ関数でできる。BGMは assets/manifest.js の対象外（<audio> が直接読む）。
- 先読み window.MimiAssets（loader.js warm(urls,{front,set,light}) L68・ready(urls,ms,{set}) L78・allReady L83・videoSrc L85・release(set) L87・pick(re) L98・MA.sets（battleNow L114・battleIdle L122・battleLater L124・reward L128）／game.js battleAssetsGate ≈L12447・warmNextBattle ≈L12473・showLoadingVeil ≈L12465）：呼び出しの形はそのまま使える。MA.sets に6人分の組を足し、卓に入る前に ready で待ち（準備中の幕）、裏で warm({light:true})。素材一覧 assets/manifest.js は node qa/genmanifest.mjs で作り直す（対象は characters／battle／motion／ui／backgrounds／episodes。bgm と characters/hd は対象外）。
- 倍率とスマホ判定 fitStage とトークン（game.js fitStage() ≈L18170／style.css #stage L202・#app L213、文字トークン --fx-cap/sub/body/main/num/tap L18190-18193・L18395）：fitStage は --game-scale=min(幅/1280,高さ/800)、倍率<0.62 で html.is-compact、--gut-x/--gut-y（黒帯の幅）、--rb-h、--inv-scale=1/倍率 を設定する。844×390 は倍率 .4875・舞台幅624・帯110px、667×375 は .469。席の文字は画面上 11px 以上（舞台pxなら 11÷倍率 以上）にする。同じ --fx-* の式をそのまま使える。
- スマホを実寸で描く型（read-compact.css L6-11（html.is-compact #stage > .read-battle-host.mb-host { zoom: calc(1/var(--game-scale)); inset: calc(-1*var(--gut-y)) calc(-1*var(--gut-x)) !important }）・game.js startReadBattle ≈L14436（host を #stage に足す）・ui-modal.css L413・L512-530（zoom／calc(Npx*var(--inv-scale))））：6人卓のスマホ版を 844×390 の実px座標で組む時の型。docs/design-ref/allstar-astra.md の座標表（スマホは実px）をそのまま写せる。getBoundingClientRect を使う flyChips などは画面座標なので、このホストの中でも合う。
- 操作ボタン（降りる／チェック・コール／賭ける→額選び）（game.js renderActionArea ≈L7359・renderVerbActions(slots,need) ≈L7520・onAction ≈L7596／style.css .verb-grid .verb-btn .verb-cc .verb-fold .verb-bet .bet-chooser .bet-chooser-grid .verb-size .size-allin .verb-back L17387-17425、スマホ（押す所44px）L18395-18404）：マークアップとCSSは6人卓でもそのまま使える（コールの額は「今から払う差額」）。額のスロット計算は相手1人（need=相手のベット−自分）前提なので、6人用に計算し直して slots を渡す。
- 音のボタン .sound-toggle（style.css L19028・game.js injectAudioBars ≈L8775・refreshAudioBars ≈L8822・toggleAllAudio）：injectAudioBars が対象にするのは .battle-screen.v2／.shop-screen.v2／.result-screen だけ。根に .battle-screen.v2 を付ければ自動で付く。
- 斜めの顔窓・名札・小窓の型（battles/core.css L92-105（.mb-portrait.is-face 112×140・skewX(-12deg)・金縁・逆スキューの img、.is-chibi、.swap／panic／busted の揺れ。.mb-host の中でだけ効く）・L192-201（.mb-vs-pic）／ui-modal.css L6-56（二重の金線・四隅 assets/ui/modal_corner_*.webp の枠）／assets/ui/home/{nameplate,plate,oct,seal}.webp、game.js goldMark(ch) ≈L14）：CSS を写して席の斜め窓・名札にする（キャラを丸で囲まない規則に合う）。ui-modal.css の枠は :is() のクラス一覧に新しい窓のクラスを足すと効く。
- 動く一枚絵と動画（game.js attachMotion ≈L635・attachMotionBg ≈L675・applyOpponentIdle ≈L4624・IDLE_MOTION ≈L4620／assets/motion/idle_<id>.mp4・assets/battle/motion/<key>_{vs,busted,chibi_win,chibi_lose}.mp4）：data-motion の仕組み（再生できた時だけ重ね、最後は原画に戻す）は脱落・優勝の一枚絵に使える。待機動画 idle_* は部屋ごと撮った 600×450（マスク前提）で、席の小窓には使わない。battle/motion の短い動画は脱落演出に向くが、先読みの組が要る（MimiAssets.videoSrc が null なら出さない）。
- 既存の設計案と見本（docs/design-ref/allstar-brief.md・docs/design-ref/allstar-astra.md・docs/design-ref/table-v8.html（現行卓の見本）・docs/design-ref/postclear-audit.md）：allstar-astra.md に、席順（ミミ手前・奥3席・左右各1席）、PC 1280×800 とスマホ 844×390（実px）の座標表、席の情報の並び、手番・降りた・オールイン・脱落の見せ方、開幕・ブラインド上昇・脱落・残り2人・優勝の演出秒数がある。実装前に読んで、こちらで決める部分と照らす。

### 作り直す
- 6席の座席と画面（DOM・CSS・座標）（新しい allstar.js／CSS と新テンプレート。参照元は index.html tpl-battle L222-352、style.css .battle-screen.v2.t8 L17159-17450）：今の卓は相手1枠（.v2-opp 600×318 を left340/top84 に固定）＋ミミ1人で、席の概念が DOM・CSS・JS のどこにも無い。t8 の層は !important の絶対配置なので、専用クラスに分けて新規に書く。PC（1280×800）と、スマホ実寸（844×390）の別々の座標が要る。
- 席ごとの状態表示（新規（席の顔窓・名札・残チップ・直近の行動・伏せ札2枚・D/SB/BB の印・手番・フォールド・オールイン・脱落））：既存で近いのは renderTugOfWar（2人の割合の帯）だけ。renderStackGauge（game.js ≈L6458）は定義だけで使われていない。席の顔窓の型は battles/core.css の .mb-portrait から写せるが、中身は全部作る。
- 多人数ポット（メイン／サイド）と席からのチップ移動（新規。参照元は renderPotBlock ≈L6524・flyChips ≈L7235）：renderPotBlock は総額1つ、flyChips の行き先 .bu-pot-physical も1つ、state.pot／potChips も1系統。メイン・サイド、席の前の投入額、ポットから複数の勝者への移動は作り直しになる。
- 席ごとの演出の配線（表情・台詞・テル・カットイン・崩壊・オールイン）（新規の呼び出し層。対象は setOpponentExpression ≈L812・playEmote ≈L17689・emoteFaceSrc ≈L17765・maybeOpponentTell ≈L17838・playCollapse ≈L17867・showOpponentCutIn ≈L17981・showAllInCutIn ≈L13876・opponentSpeech ≈L1200・applyOpponentIdle ≈L4624）：どれも state.opponent* と .char-opponent 固定で、「どの席が」を渡せない。席のキー・要素を引数に取る形に書き直す。
- 大会の山場の演出（新規（開幕の着席、ブラインド上昇、脱落、残り2人、優勝・順位の発表））：該当するものが無い（参加費アップは toast('参加費アップ！…','big') だけ）。部品は借りられる：カットイン・崩壊の段取り・.tousatsu-effect・シネスコ帯・toast。
- 順位つきの結果画面（新規。参照元は index.html tpl-result L411-474・game.js showHandResultBanner ≈L16070・endBattle ≈L16595）：結果は2人用（勝利／敗北・ランク・コイン、.hr-showdown は2ブロック）。6人の順位表・賞金・「ホームへ／もう一度」は作り直し。段階表示（startResultFx）の型は借りる。
- 脱落・ブラインド上昇・他AIへの反応・優勝の台詞（新規の台詞表（5人分。口調は docs/design-ref/allstar-brief.md の各キャラ指定））：既存の台詞は「ミミが賭けた／降りた」への反応と、ベット時の一言だけ（ショーダウンは共通の定型）。他のAI同士のやりとり・脱落・優勝は無い。リコは MP_LINES に無く、ricoSpeech は講義向けの文面。ヴェルベットの口調の不一致は docs/design-ref/postclear-audit.md L23 に指摘がある。
- 共有の卓の背景と、開幕の一枚絵（assets/backgrounds/（新規または poker_table_bg.webp の流用）、style.css L388-399 の型）：table_<id>.webp は相手別の4種のみ（リコ用なし）。6人が同席する絵は無い。設計案は開幕の一枚絵を1枚描く案。新しい絵は node qa/genmanifest.mjs で一覧に入れる必要がある。
- 大会用のBGM（assets/bgm/ と game.js SCENE_BGM ≈L8693）：mp_panyu の assets/bgm には title／battle／boss／minigame／lobby／ending しか無い。作業フォルダ mimi_porker/assets/bgm に未追跡の候補5曲（Velvet Deal.mp3、Velvet Dice Run.mp3、ほころぶ頬.mp3、バニーガールの切り札.mp3、ロイヤルフラッシュ.mp3。各2〜4MB台）があるが mp_panyu には無い。assets/bgm/README.md の目安は3MB以内。ファイル名は半角英数に改めるのが無難。
- 6人分の先読みの組と待ち（loader.js MA.sets（L105-129）・game.js battleAssetsGate ≈L12447）：battleNow／battleLater は相手1人分（battleLater の正規表現は ${key}_ と mimi_ だけ）。5人分の顔・battle/face・chibi の一部・背景・BGM をまとめた allstar 用の組と、入る前の読み込み待ちを足す。battleNow は manifest に無い素材を黙って落とす（filter(u => MAN[u])）。
- 新しい画面の進行への結線（game.js render() ≈L2967・onAction の 'back-lobby'（≈L7665 付近）・goLobby ≈L8613・updateDangerState ≈L3023・injectAudioBars ≈L8775）：render() の switch に画面が無い。やめる確認は state.screen==='battle' の時だけ。goLobby は消す幕のクラス一覧を持つ（新しい幕のクラスを足さないと残る）。ピンチ演出は screen==='battle' 限定。タイマーは battleTimeout（battleGen の世代管理）に乗せないと、ロビーへ戻った後も動く。
- 席の公開手札と、場札の溜めの多人数版（新規。参照元は renderOpponentHand ≈L7203（.v2-band-hand、left700/top34）・revealCommunity ≈L7096）：公開手札は相手1人の2枚分の置き場しか無い。6席が同時に見せ合う表示と、複数人のオールイン時の公開順は新規。溜めの演出は state.community／render() 前提。

### 注意
- 行番号は未コミットの作業ツリーのスナップショット。調査中に game.js が別所で編集され（先頭付近に +3行、のち -5行の動き）、数行ずれた。style.css も同時刻に更新。関数名・定数名で探すこと。なお C:/Users/takakazu/projects/mimi_porker（セッションの作業フォルダ）は古い版（HEAD 14d7511）で、mp_panyu（HEAD 7d60e8b）とは別物。
- 借りたつもりの関数が静かに間違う：flyChips は矩形が取れないと何もせず、playEmote／emoteFaceSrc／setOpponentExpression は state.opponentImgKey が古いと別の相手の顔を出す。6席に使う関数は、席のキーを必ず引数で渡す形にそろえてから使う。
- キー名の不一致：リコは id が rico_tutorial、画像キーが rico。OPP_LATIN／OPPONENT_APPEARANCE／OPPONENT_PERSONALITY／IDLE_MOTION／loader の素材名は id、OPPONENT_EXPRESSIONS／CHAR_EMOTES／TELL_LEAK／FACE_MAP／画像ファイルは key。リコの OPPONENTS は isLecture で、startBattleInternal が講義へ分岐する（真剣モード以外）。
- 素材の欠け：battle/face にリコの think／calm が無い（FACE_MAP で smug に落とす）、selina／velvet の全身差分が無い（OPPONENT_EXPRESSIONS は空）、characters/mimi_cutin_* は bawl の1枚だけ（以降は mimi_bust_* に落ちる）、_max 系は velvet のみ、table_rico.webp が無い。MP_LINES にリコが無い。
- CSSの重なり：t8 の層は .battle-screen.v2.t8 > .xxx の絶対配置と !important だらけ。根に同じクラスを付けると .v2-pot／.center-table／.v2-band など同名の子に単人用の位置が掛かる。逆に body.is-tease-*／taunt-*／emofx-*／is-danger の効果は .battle-screen.v2 の .v2-opp／.char-opponent／.v2-comments を狙っているので、新しい席には届かない。
- body 直下の幕（.emote-cutin L15617・.rico-cutin.v2-cutin L13273・.allin-cutin L1990・.clutch-cutin L14569・.cinema-bars L15773・.fly-chip L12320）は position:fixed の画面px。html.is-compact の専用指定があるのは .hand-result-overlay 系（L18263-18285）だけで、他は 1280×800 前提の大きさが残る（例：.emote-cutin.heavy の顔 760〜780px）。844×390 で実測が要る。
- 負荷と発熱（ユーザーの方針：スマホが熱くならない設計、遅れて描画は興ざめ）：待機動画は idle_*.mp4 が各 0.6〜0.85MB で部屋ごと撮影のため席に使えない。chip_*.webp は 600×600 で、40px 表示でも展開は大きい。render() は #app を innerHTML で作り直すので、席が6つあると毎回、顔の再展開とCSSアニメの再始動が起きる（現行は __dealSeen で札だけ防いでいる）。席ごとの更新にするか、先読みで展開済みにする。検査は qa/perfaudit.mjs・qa/loadaudit.mjs・qa/textaudit.mjs。
- 配信：.github/workflows/deploy.yml は配信ファイルを名指しでコピーする（index.html game.js home.js loader.js style.css read-compact.css ui-modal.css と battles／assets）。新しい allstar.js／allstar.css を足してもコピーされず、index.html が読む名前が無いと「Check index.html can find every file」で配信が止まる。index.html の ?v= の更新と、node qa/genmanifest.mjs での manifest 更新も要る。
- 設定の取りこぼし：mpSfx は save.minipoker.muted が true だと卓の効果音も消える（L9727 付近の既存の癖）。交換所のチップスキン（body[data-chip-skin]）が効くのは旧クラス .bu-chip／.bu-vc-chip／.bu-rchip だけで、現行の卓のポット（assets/ui/chip_*.webp）には効かない。renderBetUnified／renderStackOnTable／renderChipStack／buildVerticalChipsFromArray は現行テンプレに束縛が無い旧UI（buildHorizontalChips だけ研修の操作ボタンで使用）。
- 台詞の口調：velvetSpeech は「私」「〜わ」が混じり、仕様（あたし・〜なの・ざぁこ♡）は MP_LINES 側にある。リコの ricoSpeech は講義の先生の文面（「練習だから容赦するけどさ」など）で、大会の参加者には合わない。ricoSeriousSpeech のほうが近い。反応の台詞は全部「ミミ／新人／お嬢さん」への呼びかけ。
- スマホは横画面固定で、縦向けは作らない（ユーザー指示）。キャラを丸で囲まない（斜めの窓や額装に）、紫を足さない、絵文字を使わない、が既存の約束。丸いのはチップ（.fly-chip）と考え中の点だけ。astra の案のスマホ座標は実px（844×390）で、舞台px（1280×800 の縮小）とは別物なので、混ぜると全部ずれる。
- 2回目以降の席の出し方：ミミの一括の持ち点をどう分けるか（持ち込みチップ carryInChips ≈L5210 を大会で使わない案）、リバイ（canRebuy／showRebuy）、圧倒モード（isDominanceMode）は2人用の仕組みで、大会に持ち込むと誤作動する。continueAfterHand ≈L16395 は丸ごと使わない。

## 設計のまとめ

Yes Boss!

# 零時の卓（オールスター卓）土台の設計

## 0. 前提と、下調べの食い違いの決め方
- 行番号の基準は C:/Users/takakazu/projects/mp_panyu の 07:00:37 時点の写し（game.js 18,783行、style.css 19,225行）です。写しは C:/Users/takakazu/AppData/Local/Temp/claude/C--Users-takakazu-projects-mimi-porker/8253e851-6f1c-4559-b820-b730f601bcda/scratchpad/snap/ にあります。
- game.js と style.css は今も別の作業で書き換えられています。調査の間だけでも game.js は 18,515 → 18,718 → 18,783 行と伸びました。
  - 1〜3,000行目あたりは動いていません。
  - それより後ろの行番号はずれるので、必ず関数名で grep し直してください。下調べ4人の行番号とも 25〜65 行ずれています。
- 決まりと見た目は docs/design-ref/allstar-plan.md（「決定版」、06:58）に従います。
  - 名前は「零時の卓」。全員 1,500 から始め、SB／BB を 5 ハンドごとに上げます。
  - 参加費は 300（初回は無料）、賞金は 1,800/900/500/300/100/0 です。
  - meta の下調べにあった「時鐘杯・賞金 1,200」案はこの決定版に置き換わりました。allstar-fable.md は 0 バイトです。
- 下調べ同士で割れていた点は、次のように決めます。
  - allstar.js は game.js の後ろで読み込みます。game.js の最初の render() は末尾の startPreload().then(...) の中で非同期に走るので、それまでに Allstar ができています。
  - セーブの補正は game.js の normalizeSave に足さず、allstar.js の ensureSave で行います。mpEnsureSave（9713）と同じやり方です。
  - 先読みの組は loader.js に足さず、allstar.js の中で作ります。
- 今回は読むだけで、編集・実行はしていません。

---

## 1. ファイルの構成と借りる関数

### 1-1 新しく作るもの
| ファイル | 中身 |
|---|---|
| allstar.js（最上位） | IIFE 1つで、外に出す名前は `window.Allstar` だけ。中身は 1-2 のとおり |
| allstar.css（最上位） | `.as-*` だけを書く。style.css（88万字、他の人が編集中）には足さない |
| qa/allstar-sim.mjs | qa/sim.mjs と同じく openSession でページを開き、`Allstar._engine.simulate({n})` を呼んで表にする。検査ブラウザは同時に1つまで |
| assets/backgrounds/（新規の絵） | 六人着席の一枚絵（16:9）。部屋の背景は、bg_lobby_clock.jpg を先にぼかして暗くした webp。動く画面で blur をかけると発熱するため |
| assets/bgm/（任意） | 大会用と決勝用の2曲。候補は mimi_porker/assets/bgm にしか無く（未追跡、4MB台、日本語名）、mp_panyu には無い。名前を英数字にして 3MB 以内に詰め直す |

### 1-2 allstar.js の中の区分（上から順に）
- A. 定数
  - 席の定義 `SEATS`、ブラインド表、賞金表、性格の味付け `TUNE`。
  - battles/core.js の FACE_MAP（93-100）の写し。IIFE の中にあって外から引けないためです。
  - 台詞の表。plan にある脱落の台詞6本と、相手同士の掛け合い約40行です。
- B. 乱数
  - mulberry32(seed)。ハンドごとの種は `hash(T.seed, handNo)` で作ります。
- C. エンジン（DOM に触らない）
  - `newTournament`、`startHand`、`legal`、`applyAction`、`endStreet`、`settle`、`finishHand`、`buildPots`、`nextBlindSeats`、`levelFor`。
- D. AI
  - `equityVsField`、`asPreflop`、`asDecide`（decideOpponentAction の写し）、`asToChips`。
- E. 進行係
  - エンジンが返す出来事の列を、時間を合わせて画面へ流します。早送り、考える時間、`battleTimeout` での予約を受け持ちます。
- F. 画面
  - `mount()`、`teardown()`、`paintSeat(i)`、`paintPot()`、`paintBoard()`、`paintMimi()`、`paintActions()`。
  - mount した後は、host を丸ごと innerHTML で作り直しません。
- G. 入口・保存・ご褒美
  - `ensureSave`、`isUnlocked`、`decorateHome`、`openEntry`、`openRecord`、`onAction`、`payout`、`saveRun`、`resume`。
- H. 検査の出入口
  - `Allstar._engine = { newTournament, simulate, checkChips }`。

### 1-3 既存ファイルに差す所（全部1〜3行）
- game.js
  1. render()（2967）：2980 の `case 'ending'` の次に
     `case 'allstar': app.innerHTML = ''; if (window.Allstar) Allstar.mount(); break;`
     （mount は何度呼ばれても壊れないように書く）
  2. onAction（7596）：7609 の次、7610 の `switch (action) {` の前に
     `if (/^allstar-/.test(action || '')) { if (window.Allstar) Allstar.onAction(action, data, e); return; }`
     7606-7607 のカットイン中の押下防止は、この前で効いたまま残ります。
  3. goLobby（8818）：8820 の `battleGen++;` の次に `if (window.Allstar) Allstar.teardown();`
  4. ACHIEVEMENTS（40）の末尾（79 の次）に2件。
     `{ id:'allstar_bell', icon:'鐘', name:'十二の鐘', desc:'零時の卓で優勝', cat:'大会' }`
     `{ id:'allstar_six', icon:'鐘', name:'六席の主', desc:'5人それぞれと決勝で戦って優勝', cat:'大会' }`
     GOLD_MARK_CAT（29）には `'大会': '鐘'` を足します。コレクションは ACHIEVEMENTS をそのまま並べる（showCollectionModal 12098 の中、+179 行目）ので、ほかの変更は要りません。
  5. lobbyRicoLine（4687）：4695 の else を、解放後は「零時になったら、アタシも席に着く。今夜は教えないからね」に替えます。
  6. SCENE_BGM（8926）に `allstar:` と `allstarFinal:` の {file, gain} を足します。曲が決まるまでは battle と boss を使います。
- home.js
  - renderHomeLobby（32）の 59 行（ticket の aria-label）の次に
    `if (window.Allstar && Allstar.isUnlocked()) Allstar.decorateHome(root);`
  - showHomeLedger（223）に大会の行を1行足すかは任意です。台帳の5枠（68 の positions）はさわりません。
- index.html
  - 46 の次に `<link rel="stylesheet" href="allstar.css?v=…">`、491 の次に `<script src="allstar.js?v=…"></script>`。
  - ?v= は今 20 か所すべて 20261016b です。足した後の 22 か所を同じ新しい値にそろえます。
- .github/workflows/deploy.yml
  - 31 行の cp に `allstar.js allstar.css` を足します。足さないと、39-47 の検査で missing になって配信が止まります。
- loader.js・defaultSave・normalizeSave・endBattle は変えません。理由は 5-1 と 5-4 に書きます。

### 1-4 借りる関数とデータ（呼び出し方の注意つき）
| 名前 | 行 | 使い方 |
|---|---|---|
| SUITS / RANK_NAMES | 850 / 851 | 種つきの山札を自分で作るのに使う。newDeck（853）は shuffle（838）→ rand（836）＝Math.random なので、種が要る山札には使わない |
| evaluateHand（+ combinations 880・evalFive 893・mkScore 929）、HAND_NAMES 861 | 868 | ショーダウンの比較と役の名前。`.score` は === で同点とみなせる。5枚未満だと bestFive が無い |
| fastHandScore | 990 | 複数人の勝率の計算専用。evaluateHand の score とは物差しが違うので混ぜない |
| equityVsRandom | 1047 | 雛形として読むだけ（相手1人で固定） |
| countStrongOuts | 1067 | そのまま呼べる |
| AI_STYLES | 1088 | 必ず `{...AI_STYLES.x, ...TUNE.x}` の写しで使う。書き換えると本編の強さが変わる |
| aiPickSize | 1105 | そのまま呼べる。中で rand() を使うので、額の選び方は再現しない（山札は再現する） |
| decideOpponentAction | 1128-1173 | 呼ばずに写す（3-4） |
| betSizeToChips | 1184 | そのまま呼べる |
| opponentPreflopStrength | 14432 | Chen 式。強さ＝0.15＋0.75×(Chen点＋1)/21 |
| ricoSeriousSpeech 1246・selinaSpeech 1281・granoSpeech 1326・polkaSpeech 1669・velvetSpeech 5686 | — | action だけで文字列が決まり、state を読まない。リコは ricoSpeech（1208）でなく ricoSeriousSpeech を使う |
| mpLine / MP_LINES | 9827 / 9785 | start/win/lose/tie/reach/big の一言。リコの分は無い |
| TELL_LEAK / CHAR_EMOTES / OPP_CUTIN_FALLBACK / MIMI_EMOTE_FALLBACK | 17836 / 17855 / 18021 / 18019 | 表のデータだけ借りる。キーは画像キー（rico, polka…） |
| renderCardsInto / cardKey | 7169 / 7167 | 場札とミミの手札を描く。key は 'as-board'・'as-mimi'・'as-s1'… にする（'community' と 'opp' は溜め・めくりの動きが付くので使わない）。state.__dealSeen・state.sdHighlight（Set）を読む |
| rpMiniCardHTML | 12851 | 席の公開札（40×56）に使う |
| flyChips / floatText（+ juiceRect 7220・chipColorClass 7227） | 7235 / 7268 | 文字列のセレクタの代わりに要素を渡せる |
| battleGen / battleTimeout | 2952 / 2953 | 大会の予約はすべてこれで行う |
| mpSfx | 9960 | deal, flip, bet, call, check, fold, allin, win, bigwin, lose, milestone などの効果音 |
| playSceneBgm / stopSceneBgm | 8941 / 8957 | BGM |
| toast 18392・showConfirm 18360（Promise<boolean>）・showLoadingVeil 12698・animateCoinCountUp 17250・showHandGuide 12880 | — | そのまま呼べる |
| unlockAchievement / ensureAchievements | 100 / 83 | state.peekUsed が真だと何も言わずに失敗する（6章） |
| isItemOwned 5347・applyItemEffect 5148・applyEquippedStyles 5234・saveProgress 402 | — | 初優勝の衣装を渡すのに使う |
| hasNote('pot_odds') | 7323 | 「必要◯%」を出すかどうか |
| showCharacterProfile | 9197 | 席の小窓の「プロフィール」 |
| openHomeDialog（home.js） | 245 | 入場案内と大会記録。.home-overlay＋.home-dialog の型なので、ui-modal.css（11 行の :is）が自動で効く |
| OPPONENTS | 499 | name、imgKey。リコの id は rico_tutorial、画像キーは rico |

### 1-5 借りずに、仕様として読むだけのもの
startHand 13843、playerFold 13991〜playerAllIn 14086、opponentTurnDecide 14178、refundUncalledBet 14531、advanceAfterCall 14541、showdown 16100、endHand 16245、continueAfterHand 16628、endBattle 16828、renderActionArea 7359、renderVerbActions 7520、revealCommunity 7096、playEmote 17922、emoteFaceSrc 17998、setOpponentExpression 812、setMimiExpression 727、showShowdownCallout 7279、showOpponentCutIn 18214、showAllInCutIn 14109。

どれも相手1人（state.opponent*）が前提で、`state.screen === 'battle'` でなければ何もしないものもあります。

---

## 2. 6人の進行（エンジン）

### 2-1 状態の持ち方（すべて IIFE の中の `T`）
```
T = { v:1, seed, handNo, lv, sb, bb, btn, sbSeat, bbSeat, deck, board:[], street:'preflop'|'flop'|'turn'|'river'|'showdown',
      high, lastFullRaise, potAtHigh, lastAggressor, seats:[6], busts:[], mimiStats:{calls,folds,shoves}, ev:[] }
seat = { i, id, key, name, style, speech, chips, startChips, hole:[], folded, allIn, out, place,
         street:0 /*このストリートの出し額*/, total:0 /*このハンドの通算の出し額*/, needsAct, canRaise, last }
```
- 席の順は時計回りで 0 ミミ（手前）、1 リコ（左）、2 ポルカ（左奥）、3 セリナ（正面奥）、4 グラーノ（右奥）、5 ヴェルベット（右）です。一枚絵の並びと同じにしてあります。
- plan の「初回例」に合わせて、2回目以降に席を抽選するかはまだ決まっていません。既定は固定にします。
- リコは `{ id:'rico_tutorial', key:'rico', style:'rico_serious' }` で作ります。本気の性格は startBattleInternal の 12746-12747 にしか書かれていないので、写して使います。

### 2-2 ブラインド
```
const AS_BLINDS = [[25,50],[50,100],[75,150],[100,200],[150,300],[200,400],[300,600],[400,800],[600,1200],[800,1600]];
levelFor(handNo): i = floor((handNo-1)/5)
  i < 10 なら AS_BLINDS[i]
  それ以降は BB = 1600 × 1.5^(i-9) を 100 単位で丸め、SB = BB / 2
```
- アンテは使いません。上がるのは「5ハンド終わるごと」で、ハンドの途中では変えません。
- 段階が上がった時の演出（1,800ms）は、ハンドの頭で出します。

### 2-3 ボタン・SB・BB（デッドボタン）
- 1ハンド目
  - 6人に1枚ずつ表向きに配り、いちばん強い札（同じ数字なら ♠>♥>♦>♣）の人がボタンになります。
  - `sb = nextAlive(btn)`、`bb = nextAlive(sb)` です。
- 2ハンド目から
  ```
  bb  = nextAlive(prevBB)
  sb  = prevBB   // 前の BB が脱落していれば、このハンドは SB を払わない（デッドSB）
  btn = prevSB   // 脱落していても空席でもその席に置く（デッドボタン）
  ```
- 残り2人の時
  - `bb = nextAlive(prevBB)` とし、もう1人がボタン兼 SB です。同じ人が2回続けて BB にならない、という規則がこれで守られます。
- ブラインドを払い切れない人は、持っている分だけ払ってオールインにします。

### 2-4 1ハンドの流れ（startHand → … → finishHand）
1. 段階を決め、ブラインドの席を決めて、払わせます。
2. 種つきの山札から、SB から時計回りに1枚ずつ2周配ります（`pop`、バーンなし）。
3. `high = bb`、`lastFullRaise = bb`、`potAtHigh = 合計` とし、動ける全員を `needsAct = true` にします。最初に動くのは BB の次で、動ける人です。
4. ストリートを終える時
   - 各席の street を 0 に戻し、`high = 0`、`lastFullRaise = bb` にします。
   - フロップ以降の最初はボタンの席の次の、動ける人です。
   - 残り2人の時はこれで、プリフロップは SB、フロップ以降は BB から動きます。
5. 降りていない人が1人になったら、札を見せずにその人が勝ちます。
6. 全員の出し額がそろい、動ける人（降りていない・オールインでない）が1人以下なら、降りていない人の札を全部表にして、残りの場札を自動で開きます。
7. ショーダウンをして（2-6）、finishHand（2-7）へ進みます。

### 2-5 applyAction(T, i, {type, to})：本編の場当たりな規則（14314 など）を1か所にまとめる
- `toCall = min(high - s.street, s.chips)`
- fold は toCall > 0 の時だけです。0 の時はチェックとして扱い、画面のボタンも押せなくします。
- check は toCall === 0 の時だけです。
- call は toCall を払います。残りが 0 になれば allIn です。
- raise（ベットも同じ扱い）は「合計をいくらにするか（to）」で受けます。
  - `minTo = high + lastFullRaise`、`maxTo = s.street + s.chips` です。
  - minTo に届かない to は、オールインの時だけ認めます。
  - `to - high >= lastFullRaise` なら一人前の上げです。`lastFullRaise = to - high` とし、ほかの動ける人全員を `needsAct = true, canRaise = true` に戻します。
  - 足りないオールインなら、high を上げてほかの人を `needsAct = true` にします。ただし、最後の一人前の上げの後にもう動いた人は `canRaise = false`（コールか降りるだけ）にします。これが Poker TDA の決まりです。
  - `potAtHigh` と `lastAggressor` を更新します。
- 動いた本人は `needsAct = false` にし、手番を「次の、needsAct で、動ける人」へ進めます。誰も残っていなければ、そのストリートは終わりです。
- 端数がきれいに見えるよう、AI と額のボタンの to は 25 単位に丸めます（オールインは丸めません）。

### 2-6 戻し・サイドポット・配当（settle）
```js
// 誰にもコールされなかった分を戻す：通算の出し額がいちばん大きい人が1人だけなら、2番目との差を返す
function buildPots(seats) {
  const live = seats.filter(s => !s.folded && s.total > 0);
  const caps = [...new Set(live.map(s => s.total))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const cap of caps) {
    let amt = 0; for (const s of seats) amt += Math.max(0, Math.min(s.total, cap) - prev);
    if (amt) pots.push({ amt, elig: live.filter(s => s.total >= cap).map(s => s.i) });
    prev = cap;
  }
  return pots; // 念のため Σamt と Σtotal の差を最後の山に足す
}
```
- 山ごとに、参加できる人の `evaluateHand([...hole, ...board]).score` の最大を勝ちとします。
- 分け合う時は1人ずつ floor し、端数は「ボタンの左（時計回り）から最初の勝者」に1枚ずつ渡します。
- 配る順はサイドポットの最後から、最後にメインです。
- 札を開く順は、最後のストリートで最後に賭けた人からです。いなければボタンの次の人から、時計回りに 160ms ずつ開きます。

### 2-7 脱落・順位・終わり（finishHand）
- 持ち点が 0 の席は `out` にします。
- そのハンドで同時に脱落した人は、ハンド開始時の持ち点（startChips）の多い順に上の順位にします。
  - 順位は「残った人数＋1」からです。
  - 同じ額なら同じ順位で、賞金はその順位分を合わせて均等に分けます。
- 残りが1人なら優勝です。
- 残りが2人になった瞬間に、決勝の演出（2,000ms）を出し、BGM を allstarFinal に替えます。
- 毎ハンドの終わりに `checkChips(T)` で `Σchips + Σtotal(未精算) === 9000` を確かめます。崩れたら console.error を出し、qa を落とします。

### 2-8 ミミが降りた後と、脱落した後
- ミミが降りた後は早送りです。進行係の待ち時間を 1/3 にし、どこかを押すと元の速さに戻します。
- ミミが脱落したら、残りを演出なしで計算します。
  - `runToEnd(T)`：AI だけで回し、勝率の抽選は 60 回、上限は 600 ハンド。上限まで決着しなければ持ち点順にします。
  - 10 ハンドずつ setTimeout で区切って、画面が固まらないようにします。
  - 観戦の画面は作らず、そのまま結果へ進みます。

### 2-9 中断と再開
- ハンドの切れ目ごとに `save.allstar.run` に書きます。中身は 5-4 にあります。
- 山札は種から作り直すので、再開すると「同じ札で、そのハンドの頭から」始まります。
- AI の額の選び方（aiPickSize・rand）までは再現しません。plan の約束は札だけなので、これで足ります。

### 2-10 自動対戦
- `simulate({n, mimiPolicy:'ai'|'tight'|'allin'})` を作ります。ミミの席も AI か、決まった方針で動かします。
- 測るもの
  - チップの合計が保たれているか
  - サイドポットが起きた回数
  - 同時脱落の回数
  - ハンド数の分布（目標は中央値 25〜38）
  - 性格別の優勝率
- ブラインド表と TUNE は、この数字を見て調整します。

---

## 3. 各相手の判断を6人卓で動かす方法

### 3-1 席ごとに作る入力（view）
- 本編のまま渡せるもの：`hole, board, toCall, canCheck, canRaise, pot`（pot は全員分の合計）。
- `potBeforeBet = T.potAtHigh`
  - 「今の最高額の賭けが入る前のポット」です。pot − toCall で出せるのは2人の時だけです。
- `facingAllIn`：今の high を作った人がオールインかどうか。本編の playerAllIn の読み替えです。
- 新しく足すもの：`nOpp`（降りていないほかの人数。オールインの人も含む）、`behind`（この後に動く人数）、`pos`（'early'|'late'|'sb'|'bb'）、`stackBB`、`effBB`、`alive`、`isLeader`、`limpers`、`raisers`。
- ミミの癖の数字
  - `playerCalls/Folds/Shoves` は、ミミがそのハンドに残っていて、今の high をミミが作った時だけ `T.mimiStats` から渡します。それ以外は 0 です。
  - 数え方は本編の 13744・13764・13830 と同じです。

### 3-2 複数人を相手にした勝率（equityVsRandom の書き換え）
```js
function equityVsField(hole, board, nOpp, samples, rng) {
  const used = new Set([...hole, ...board].map(c => c.rank + c.suit)), deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) if (!used.has(r + s)) deck.push({ rank: r, suit: s });
  const need = 5 - board.length, take = 2 * nOpp + need; let share = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < take; j++) { const k = j + Math.floor(rng() * (deck.length - j)); const t = deck[j]; deck[j] = deck[k]; deck[k] = t; }
    const run = need ? board.concat(deck.slice(2 * nOpp, take)) : board, me = fastHandScore(hole.concat(run));
    let ties = 0, lose = false;
    for (let o = 0; o < nOpp && !lose; o++) { const v = fastHandScore([deck[2*o], deck[2*o+1]].concat(run)); if (v > me) lose = true; else if (v === me) ties++; }
    if (!lose) share += 1 / (ties + 1);
  }
  return share / samples;
}
```
- 抽選回数は、本番が 160、早送りと runToEnd が 60 です。
- 結果は「席・ストリート・nOpp」ごとに覚えておき、誰かが降りて nOpp が変わった時だけ計算し直します。

### 3-3 プリフロップ（新しく作る。本編では AI が先に賭ける場面が無かった）
- 強さは `pf = opponentPreflopStrength(hole)`（14432）です。しきい値は Chen 点で書き、0.15＋0.75×(点＋1)/21 で pf に直して比べます。
- 誰も上げていない時（オープン）
  - 開く条件は、behind が 5 なら 9 点、4 なら 8 点、3 なら 7 点、ボタンは 6 点、SB は 6.5 点です。
  - 額は 2.5BB、15BB 以下なら 2.2BB です。
  - リンプ（BB と同額だけ払う）はグラーノだけ、`valueFreq × 0.2` の確率で許します。
- 誰かが上げた時
  - 3ベット（もう一段上げる）は 11 点以上です。額は、ポジションが後ろなら相手の 3 倍、前なら 3.5 倍です。
  - コールは「equityVsField（nOpp）が、ポットに対して払う額の割合（odds）× loose 以上」で、しかも 8 点以上の時です。
  - それ以外は降ります。
- 10BB 以下の短い持ち点
  - 押すかどうかだけを決めます。押す条件は、前の席なら 7 点、後ろの席なら 5 点です。
  - オールインにコールするかは、equityVsField を shoveCall＋0.05 と比べて決めます。
- BB でチェックが回ってきた時は、9 点以上なら上げ、それ以外はチェックです。

### 3-4 フロップ以降：decideOpponentAction（1128-1173）を写した asDecide
置き換えるのは次の行だけです。ほかはそのまま写します。
- 1133：`eqShare = equityVsField(hole, board, nOpp, n, rng)`、`eqRel = nOpp > 1 ? eqShare ** (1 / nOpp) : eqShare`
  - eqRel は「1人あたりの強さ」で、AI_STYLES のしきい値と同じ物差しに戻すための数字です。
- 1150 と 1161-1163：コールの判定には `eqShare + drawBonus >= odds × loose` を使います。分け前は本当の勝率で比べるためです。
- 1157・1158・1166-1171 の raiseEq、eqAdj<0.3、trap .8、valueEq、bluff .42：すべて `eqRel − TUNE.multi × (nOpp − 1)` と比べます。
- 1162 の shoveCall：eqRel と比べます。
- 多人数の時に止めるもの
  - nOpp ≥ 3 ではブラフ（1158 と 1171）を止めます。
  - 半ブラフ（1170）は nOpp ≤ 2 の時だけにします。
  - trap は nOpp ≤ 2 の時だけにします。
- 1144-1146 の forceLargeBet は写しません。
- 1157 と 1158 の条件 `!ctx.playerAllIn` は `!facingAllIn && canRaise` に替えます。
- 返す形は本編と同じ `{type, size, intent, eq: eqRel}` です。

### 3-5 行動をチップの額に直す（asToChips）
- check_call は、toCall が 0 ならチェック、あればコールです。
- bet で toCall === 0 の時は、`betSizeToChips(size, pot, chips)` を 25 単位に丸め、BB 以上にします。
- bet で toCall > 0 の時は、`to = high + max(lastFullRaise, round25(比率 × (pot + toCall)))` です。比率は pot_1_3＝1/3、pot_1_2＝1/2、pot_2_3＝2/3、pot_1＝1。
  - `canRaise` が偽ならコールに格下げします。
  - to が持ち点を超えるならオールインにします。

### 3-6 性格の味付け TUNE（初めの値。自動対戦で詰める）
| 相手 | 写しの元 | 足すもの |
|---|---|---|
| リコ先輩 | rico_serious | behind ≥ 4 で開く条件を +1 点、multi 0.02 |
| ポルカ | polka | 後ろの席から盗む：behind ≤ 2 で誰も入っていなければ −2 点。nOpp ≥ 3 では bluffFreq × 0.3、multi 0.03 |
| セリナ | selina | 全体で +0.5 点、3ベットは 12 点以上。多人数では valueEq +0.04 × (nOpp − 1)、multi 0.04 |
| グラーノ | grano | 残り5人（次の脱落が5位＝賞金が参加費より少ない）で持ち点 20BB 以下なら、+2 点と shoveCall +0.08。10BB 以下の相手には bluffFreq × 1.5 |
| ヴェルベット | velvet | 持ち点がいちばん多い時は −1.5 点で、中くらいの持ち点の人へ価値ベットを増やす。ブラフを見せた後 3 ハンドは trap +0.2・valueFreq +0.1 |

### 3-7 テル・台詞・考える時間
- テル（本心が顔に出る）
  - eqRel < 0.42 か eqRel ≥ 0.62 の時だけ出します。本編の 14346 と同じ約束です。
  - 出るかどうかは `TELL_LEAK[key]` で抽選します。出たら席の横に軽い顔のカットインを自前で出します（`.emote-cutin.light` の見た目、140×140、900ms）。
- 台詞
  - 席のキーごとの関数（1-4）を直接呼び、字幕の帯に出します。
  - 相手同士の掛け合いと脱落の台詞は、新しい表から出します。
- 考える時間は 350〜900ms、オールインへのコールは最大 1,400ms です。
- AI がほかの人の伏せ札を見ることはありません。

### 3-8 調整のやり方
qa/allstar-sim.mjs を 300 大会ずつ回し、ハンド数の中央値・性格別の優勝率・プリフロップに参加した率（VPIP）を出して、TUNE とブラインド表を詰めます。

---

## 4. 画面の構成

### 4-1 DOM の作り
- host は `#stage` の直接の子として `<div class="as-host">` を置きます。
  - `#app` は overflow:hidden（style.css 213）なので、スマホで黒い帯まで広げる host を中に置くと切れます。
  - read-battle-host と同じ置き方です。
- 中身
  ```
  .as-host > .as-screen[data-phase=table|result]
    .as-room（先にぼかした背景）→ .as-felt → .as-rail
    .as-head（大会名・HAND・残り人数・ミミの順位） / .as-clock（button：段階表） / .as-tools（役の一覧→showHandGuide、やめる、.sound-toggle）
    .as-seat[data-seat=1..5][data-state=wait|turn|folded|allin|out]
        button.as-win > img.as-face ／ .as-plate（名前・持ち点・順位） ／ .as-hole（.card.card-back ×2）
        .as-bet（行動語・チップ・額） ／ .as-dealer ／ .as-blind ／ .as-fuse（考える時間）
    .as-pot（メイン＋サイドは最大2つ、3つ以上は「サイド計」） ／ .as-board（5枠） ／ .as-sub（字幕の帯）
    .as-mimi（img.as-mimi-bust ／ .as-mimi-hand ／ .as-mimi-stack ／ .as-mimi-bet ／ .as-mimi-made）
    .as-actions（チェック／コール・降りる・賭ける▸） ／ .as-sizer（2×2＋もどる）
    重ねる窓：.as-pop（席の詳細）／.as-log／.as-levels／.as-banner／.as-final
  ```
- 押す所には `data-action` を使わず、`data-as-act` を付けて host に1つの委任リスナーで受けます。
  - `player-*` は研修の横取り（7609）に掛かります。
  - render() の bindActions（7591）とも混ざりません。
  - 例外は `.sound-toggle` です。`data-action="toggle-audio-all"` のままにし、`addEventListener('click', onAction)` を自分で付けます。アイコンは refreshAudioBars が全部の .sound-toggle を更新してくれます。
- ミミの胸像は自前の `asMimiFace(expr)` で `assets/characters/mimi_bust_{calm,think,shock,win,sad,smug}.webp` に替えます。
  - `.battle-mimi-img` や `[data-mimi-face]` は付けません。付けると setMimiExpression（727）に横から書き換えられます。
- 席の顔
  - 待っている間は `assets/ui/face_<key>.webp`（リコは face_rico_default.webp）。
  - 動く時は `assets/battle/face/<key>_<FACE_MAP語>.webp`（think/smug/panic/busted）。
  - 顔は斜めの窓（skewX −12°、中の img は逆スキュー）に入れ、丸い枠は使いません。
- 卓の色を交換所の卓スキンに合わせるため、`body[data-table-skin="…"] .as-screen { --t8-felt-hi:…; }` の5行を style.css 17085-17092 から写します。元は `.battle-screen.v2.t8` の中でしか効きません。
- 操作ボタンの見た目は、style.css 16370-16385 と 17310-17315（`.battle-screen.v2` の中でしか効かない）から `.as-screen` 用に写します。

### 4-2 PC 1280×800（舞台の px。#stage の拡大縮小の中）
plan の座標をそのまま使います。
| 要素 | 位置 / 大きさ |
|---|---|
| 頭の情報 | 24,12 / 320×48 |
| 文字盤 | 560,0 / 160×68 |
| 道具 | 1000,12 / 256×44 |
| 奥の席の窓 | 268,100 ／ 578,100 ／ 888,100、各124×155 |
| 奥の席の銘板・伏せ札・ベット | 銘板は窓x−8, 240、伏せ札は窓x+8, 268、ベットは窓x+56, 290 |
| 横の席の窓 | 56,244 ／ 1090,244、各134×168 |
| 横の席の銘板 | 48,396 ／ 1082,396 |
| ポット | 560,326 / 160×26 |
| サイドポット | 730,328 / 100×22 |
| 場札 | 465,364 / 350×86（62×86 ×5、間10） |
| 字幕 | 290,462 / 700×30 |
| ミミのベット | 560,500 |
| ミミの役 | 540,556 |
| ミミの手札 | 536,604 / 208×128 |
| ミミの持ち点 | 420,640 |
| ミミの胸像 | 0,430 / 330×370 |
| チェック／コール | 912,636 / 328×64 |
| 降りる ／ 賭ける | 912,712 ／ 1084,712、各156×58 |
| 額の選択 | 912,590 / 328×180 |

- 遠近：奥の3席は 1.0、横の2席は 1.08 倍にします。
- 重なりの順（下から）：部屋 → 布 → 伏せ札とチップ → レール → 窓・銘板 → 手番のスポット → 字幕 → 胸像 → 手札と操作 → 重ねる窓 → 結果。
- 文字は舞台の px で 12px 以上にします。--fx-* が効くのは is-compact の時だけです。

### 4-3 スマホ横 844×390（画面の本当の px で描く）
- 型は read-compact.css 6-11 と同じです。
  ```css
  html.is-compact #stage > .as-host { zoom: calc(1 / var(--game-scale, 1)); inset: calc(-1 * var(--gut-y, 0px)) calc(-1 * var(--gut-x, 0px)) !important; }
  ```
  fitStage（18403）は倍率 < 0.62 で is-compact を付けます。844×390 の倍率は .4875 です。
- plan の座標は 844×390 の値です。縮めた舞台の px と混ぜてはいけません。
  | 要素 | 位置 / 大きさ |
  |---|---|
  | 頭の情報 | 8,4 / 330×38 |
  | 文字盤 | 382,0 / 80×44 |
  | 役の一覧 ／ やめる | 692,0 / 84×44 ／ 782,0 / 54×44 |
  | 奥の席 | 172,48 ／ 357,48 ／ 542,48、各130×75 |
  | 横の席 | リコ 8,134 ／ ヴェルベット 706,134、各130×75（ヴェルベットは左右反転） |
  | ポット | 300,148 |
  | 場札 | 302,168（44×62） |
  | 字幕 | 196,236 |
  | ミミの役 | 300,262 |
  | ミミのベット ／ 持ち点 | 300,282 ／ 300,300 |
  | ミミの手札 | 372,280 ／ 434,280（56×78） |
  | ミミの胸像 | 0,212 / 196×178 |
  | チェック／コール | 520,292 / 316×48 |
  | 降りる ／ 賭ける | 520,346 / 152×44 ／ 678,346 / 158×44 |
  | 額の選択 | 520,232 / 316×158 |
- ほかの機種のための寄せ方
  - 奥の席・ポット・場札・字幕・文字盤は中央寄せです。844 の時の x を `left: calc(50% + (x − 422)px)` で書きます。
  - リコと胸像は左寄せ、ヴェルベット・操作・道具は右寄せ（right = 844 − (x + 幅)）です。
  - 字幕から下は下寄せ（bottom = 390 − (y + 高さ)）です。
- 幅 800 未満（667〜799）
  - 胸像を 150 幅、ミミの列を x156 から、手札を 48×67、操作の列を 280 幅（右 8）にします。
  - 667×375 で計算すると、胸像 0–150、手札 220–322、操作 379–659 で重なりません。
- 高さ 390 未満
  - 上の段を 10px 詰めます。奥の席 y44、横の席 y126、ポット y140、場札 y158（札 42×59）です。
  - 残りの重なりは occlude.js で測って直します。
- 932×430 でも同じ規則で収まります。縦向けは作りません。

### 4-4 状態の見せ方と演出の時間（plan のとおり）
- 状態
  - 手番：窓が 6px 浮き、上から暖色のスポットが当たります（240ms）。ほかの席は明るさ 0.82 にし、導火線が縮みます。
  - 降りた：伏せ札が中央へ滑り（260ms）、窓は彩度 60%・明るさ 75% にします。
  - オールイン：深紅の帯が席を拭います（220ms）。
  - 脱落：窓が 4° 傾いて沈み（500ms）、レールに「5位 ポルカ」の板が立ちます。
- 1ハンドの時間
  - 配る：220ms で飛び、70ms 間隔。
  - 相手の番：考える 350〜900ms → 表情 160ms → 行動語 200ms → チップ 300ms。
  - フロップは 120ms 間隔、ターンとリバーは 200ms です。
  - ショーダウン 1,600ms、次のハンドまで 700ms。ハンドごとの全画面の結果窓は出しません。
- 大会の山場
  - 開幕 6,400ms（800ms 以降は押して飛ばせる）。
  - ブラインド上昇 1,800ms（零時の段だけ鐘が鳴る）。
  - 脱落 約4,500ms（1,000ms 以降は押して飛ばせる）。カットインの動画は battle/motion/<key>_busted.mp4 で、リコだけ characters/rico_cutin_busted.webp です。
  - 決勝 2,000ms、優勝 3,200ms のあと、順位の掲示板へ進みます。
- 掲示板の座標も plan のとおりです。PC は板 700,60 / 540×408、スマホは 280,40 / 556×246。
- 大会中に出さないもの：勝率（computeEquity は呼ばない）、リコの助言、癖の付箋、「通る見込み」、読み合い。
- 「必要◯%」は `hasNote('pot_odds')` が真の時だけ出します。

### 4-5 押す所と文字の決まり
- 押す所はすべて 44px 以上です。席の窓（130×75）を押すと詳細の小窓が開きます（持ち点の BB 換算・位置・直近3つの行動）。
- スマホの文字は画面の px で 11px 以上にします。
- 守ること：紫を足さない、絵文字を使わない、白くて丸い吹き出しを使わない。
- 確かめるのは qa/textaudit.mjs と occlude.js で、844×390、667×375、1280×800 の3つです。

---

## 5. 入口・解放・ご褒美・セーブ・配信

### 5-1 解放
- `isUnlocked()` を `ensureSave()` の中で決めます。
  - `save.bestRanks.velvet` があれば `A.unlocked = true` にして保存します。
  - bestRanks は endBattle の中の、練習でない勝ちの時にしか書かれません（16933-16936）。skipStageWithCoins（12612）では書かれないので、コインで飛ばしても開きません。
  - 今あるセーブも、このやり方で自動的に移せます。
- endingUnlocked（371・373）はコインで飛ばしても立つので使いません。
- 解放の知らせ
  - 開幕の儀が終わった後（`save.homeStageSeen === 制覇数`）で、`.home-overlay` と `.login-bonus-overlay` が出ていない時に、1回だけ出します（`A.unlockSeen`）。

### 5-2 ホームの入口：decorateHome(root)
- 札 `.h15-ticket`
  - `dataset.action = run ? 'allstar-resume' : 'allstar-open'`
  - `.h15-lbl` を「零時の卓へ」（5字、スマホに収まる）にします。
  - `.h15-prize` は「優勝 1,800 コイン」、中断中なら「続きから・残り4人・Lv3」です。2行まで。
- 右上の額 `.h15-frame`
  - 現王者（`A.champion`、はじめはヴェルベット）の顔と「現王者」を出し、`dataset.action = 'allstar-record'` にします。
- 台帳は5人のまま、本編の再戦の入口として残します。

### 5-3 入場案内から着席まで
1. `allstar-open` で openEntry を開きます。
   - .home-dialog に、帯の絵、六席の顔、決まり3行、賞金表、目安12〜15分を出します。ボタンは `data-action="allstar-seat"`（着席する）と閉じるです。
   - 窓を開いた時に `MimiAssets.warm(LATER, {set:'allstar', light:true})` で裏の読み込みを始めます。
2. 着席を押したら、参加費を確かめます。初回は招待状で無料、それ以降は coins ≥ 300 が必要で、足りなければ押せません。
3. `MimiAssets.ready(NOW, 6000, {set:'allstar'})` で待ち、その間は showLoadingVeil を出します。
4. 揃ったら順に行います：参加費を引く → run を作って saveProgress → `battleGen++` → `state = defaultState()`（peekUsed などが消える）→ `state.screen = 'allstar'` → `render()` → 開幕の演出。
- 読み込みの組（allstar.js の中で `window.ASSET_MANIFEST` に載っている物だけ）
  - NOW：部屋の背景、card_back_default、ui/face_ ×6、mimi_bust_calm と think、battle/face の5人×think 相当、chip_*。
  - LATER：*_cutin_busted ×5、battle/motion/*_busted.mp4 ×4、*_cutin_smug、mimi_bust の残り、bg_result_stage.jpg、mimi_gold.webp、一枚絵。
- 中断：やめるを押すと `showConfirm({title:'卓を離れる？', body:'このハンドの頭から続きを再開できます', ok:'中断してホームへ', cancel:'続ける'})` を出し、はいなら goLobby します。
- teardown で行うこと：host を消す、`.hand-guide-overlay` と `.as-*` の窓を消す、`MimiAssets.release('allstar')`、BGM を戻す。

### 5-4 セーブの形
キーは今と同じ SAVE_KEY（11）で、その中の `save.allstar` に持ちます。ensureSave が無ければ作り、足りない項目を埋めます。
```
{ v:1, unlocked:false, unlockSeen:false, invitationUsed:false,
  entries:0, wins:0, bestPlace:0, places:[0,0,0,0,0,0],
  finalVs:{ rico_tutorial:{w:0,l:0}, polka:{…}, selina:{…}, grano:{…}, velvet:{…} },
  sixDone:false, champion:'velvet', history:[/* 直近10：{at,place,hands,finalVs,lastHand,prize} */],
  firstWinAt:0, firstWinHand:'',
  run:null /* {v, seed, handNo, btn, sbSeat, bbSeat, seats:[{id,chips,out,place}], busts, mimiStats, feePaid, paid:false, startedAt} */ }
```
- loadProgress（381）は浅い合併なので、入れ子は ensureSave で補います。
- KEEP_KEYS（7644）には入れません。「コインと所持品を持って最初から」を選ぶと、大会の記録も消えます。
- 中断中に新しく始める時は、「前の大会は記録なし・参加費は戻らない」と確かめてから run を消します。

### 5-5 ご褒美（payout は1回だけ。`run.paid` で二重払いを防ぐ）
- `save.coins += [1800, 900, 500, 300, 100, 0][順位 − 1]`
  - 同じ順位が何人かいれば、その順位分を合わせて均等に分けます。
  - 評価のボーナス・倍率・周回での減額はかけません。
  - animateCoinCountUp で数え上げて見せます。
- 初優勝
  - `unlockAchievement('allstar_bell')`。
  - `isItemOwned('mimi_skin_gold')` が偽なら、`ownedItems.push` → `applyItemEffect('mimi_skin_gold', {equip:false})` → `applyEquippedStyles()` の順で渡します。持っていれば 1,500 コインです。
  - `A.champion = 'mimi'` にします。額には「王者 ミミ」と出ます。
- 5人それぞれと決勝で戦って優勝したら、`allstar_six` と 2,000 コインです。
- 記録に残すもの：places、bestPlace、finalVs、history、最後の役。

### 5-6 配信の手順に足すもの
1. deploy.yml 31 の cp に `allstar.js allstar.css` を足します。
2. index.html の link と script を足し、?v= の 22 か所を同じ新しい値にします。
3. 絵を足したら `node qa/genmanifest.mjs` で assets/manifest.js を作り直します。BGM はこの一覧の対象外です。
4. BGM のファイルを mp_panyu の assets/bgm に置き、SCENE_BGM に登録します。
5. main へ push すると GitHub Pages に自動で出ます。

### 5-7 作る順と確かめ方
plan の順に作ります。
1. エンジンと allstar-sim
2. PC の卓
3. スマホ 844×390
4. 演出
5. 入口・保存・結果
6. 絵
7. 読み込みと負荷の監査（qa/loadaudit.mjs、qa/perfaudit.mjs）

通しの検査は qa/endingtour.mjs と同じく、ヴェルベット撃破済みのセーブを入れて、ホーム → 入場 → 結果 → ホームを1つのブラウザで通します。

---

## 6. 落とし穴
1. **行番号がずれる**：game.js と style.css は今も他の人が編集中です。差し込む前に関数名で grep し直してください。差し込みを1か所にまとめた 1-3 の一覧で、ぶつかる所を減らします。
2. **名前のぶつかり**：game.js はふつうのスクリプトなので、上の階層の const・let・function はすべてグローバルです。
   - allstar.js の上の階層で同じ名前の const を書くと SyntaxError になり、ファイルごと動きません。
   - 同じ名前の function は、本編の showdown や startHand を何も言わずに上書きします。
   - 全体を IIFE で包み、外に出すのは window.Allstar だけにします。
3. **#app の overflow:hidden**：host を #app の中に置くと、スマホで黒い帯まで広げた部分が切れます。#stage の直接の子にします。
4. **「battle の時だけ動く」関数は黙って何もしない**：playEmote は 17925 で screen を見ます。revealCommunity も同じで、updateDangerState（3023）は battle 以外で消えます。逆に setMimiExpression は `[data-mimi-face]` と `.battle-mimi-img` を全部書き換えます。こうした関数は呼ばずに自前で書き、その属性も付けません。
5. **CSS の効く範囲**：`.battle-screen.v2` と `.t8` を根に付けると、1人用の位置（!important が多い）が子にかかります。必要な見た目は `.as-` に写します。body に付く演出のクラス（is-danger、taunt-*、is-tease-*）は新しい席には届きません。
6. **data-action と onAction**：`player-*` は研修中に横取りされます。bindActions はすべての [data-action] に付きます。大会の中は data-as-act で受け、入口だけ `allstar-*` を onAction に通します。
7. **AI の物差し**：AI_STYLES は1対1の勝率で調整してあります。
   - 写しを作り、eqShare と eqRel を使い分けます（3-4）。
   - profile の数字（bluffTendency など）は判断に効きません。
   - ミミの癖の数字を AI 同士の判断に渡してはいけません。
8. **乱数**：rand（836）は Math.random で種がありません。山札は自前の種つき乱数で作ります。aiPickSize・flyChips・pick は種なしのままなので、再開して同じになるのは札だけです。
9. **タイマー**：大会の予約はすべて battleTimeout で行い、開始・終了・goLobby で battleGen を進めます。画面を隠したタブではタイマーが間引かれるので、進行は待ち時間に頼らず、出来事の列で進めます。
10. **称号が付かない**：unlockAchievement（100）は state.peekUsed が真だと何も言わずに false を返します。入場の時に必ず `state = defaultState()` にします。
11. **お金のつり合い**：周回で減らさない 1 位 1,800 は、本編の再戦の減額（rematchPreview 12647）の考え方とずれます。歯止めは参加費 300 だけです。自動対戦で大会あたりの期待値を出し、プロデューサーに見せて確かめます。
12. **規則の間違いが出やすい所**：デッドボタン、決勝で2人になる時、足りないオールインの後に上げ直せるか、同時脱落、端数。checkChips の合計 9,000 が崩れたら qa を落とします。evaluateHand（5枚以上）と fastHandScore の数字は混ぜません。
13. **renderCardsInto の副作用**：state.__dealSeen と state.sdHighlight を書き換えます。ショーダウンが終わったら sdHighlight を消し、key には 'community' と 'opp' を使いません。
14. **重さと熱**：
    - 毎回の行動で host を丸ごと描き直さず、変わった席だけ直します。
    - 背景は先にぼかした絵を使い、CSS の blur は使いません。
    - 脱落の動画は1本ずつ流します。
    - chip_*.webp は 600×600 なので、席の小さなチップは CSS か小さい絵にします。
    - flyChips のチップの大きさは #stage の倍率で決まるので、スマホでは約 11px になります。
    - runToEnd は 10 ハンドずつ区切ります。
15. **音**：mpSfx は save.minipoker.muted が真だと卓の効果音も消えます。これは本編の今の癖です。BGM の候補5曲は mp_panyu に無く、名前も大きさも README の目安から外れています。
16. **配信**：allstar.js・css を deploy.yml に書き忘れると、本番で 404 になります（home.js で前にあった事故）。?v= が1か所でも古いと、古い方が読み込まれます。
17. **リコの id と画像キー**：id は rico_tutorial、画像キーは rico です。表ごとにどちらで引くかが違い、MP_LINES にはリコがいません。OPPONENTS.rico_tutorial は isLecture の弱い方なので、卓では rico_serious の写しを使います。
18. **スマホの約束**：横向きだけです。844×390 の本当の px と 1280×800 の舞台の px を混ぜないでください。キャラを丸で囲まず、斜めの窓か額に入れます。

