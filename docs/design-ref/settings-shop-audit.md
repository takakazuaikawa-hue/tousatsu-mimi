# 設定画面・交換所 監査レポート（コード読み＋node 照合のみ。ブラウザ未起動）

調べた日: 2026-10-18 / 対象: game.js, home.js, index.html, docs/design-ref/panyu-mesh.html
注意: 調査中に別のエージェントが game.js を編集していたらしく、行番号が約20行ずれた箇所があります。行番号は「読んだ時点の目安」で、関数名を正としてください。

## 要約

- 設定（showSettingsModal）の全コントロールは配線済みで、保存・即時反映・再読込後の復元とも問題なし。ただし「文字速度」「セーブの書き出し／読み込み」は存在しない（実装なし。不具合ではなく機能なし）。
- 実害のある不具合: 中 3件、低 6件。致命的なもの（コインが減らない・二重購入・存在しない関数の呼び出し・素材の欠落）は見つからなかった。
- node 照合の結果、SHOP_ITEMS 68件に重複なし、SHOP_UNLOCK／SHOP_COMMENTS／EQUIP_CATEGORIES／CHIP_CARRY_ITEMS／SHOP_TIERS／SHOP_PREREQ の ID はすべて SHOP_ITEMS と一致、サムネ11枚・ぱにゅ衣装の絵12枚は実在。

---

## 不具合・要注意（重い順）

### 1. [中] 「完全に最初から」「セーブをリセット」の後、ロビーBGMが鳴りっぱなしで表示だけOFFになる
- 場所: wipeAllProgress（game.js 約439行）／ resetProgress（約427行）／ case 'new-game-full'（約7715行）
- 内容: wipeAllProgress は `save = defaultSave()`（bgmOn:false）に戻すだけで、鳴っている音を止めない。その後 `state = defaultState(); render()` でタイトルに戻るが、render の title は `if (isBgmOn()) playSceneBgm('title')` なので、BGMがOFFだと何もせず `_stopNonSceneBgm()` も呼ばれない。
- 再現: ロビーでBGMをONにして鳴らす → 設定 → セーブデータをリセット → 確認で「消して最初から」。タイトルに戻っても `#lobby-bgm-audio` が再生され続け、音量アイコンは「音 切」。BGM切替を押すと ON になり（鳴っているのに）、もう一度押して初めて止まる。
- 直し方: wipeAllProgress の末尾（または resetProgress と new-game-full の `render()` の前）で `_stopNonSceneBgm(); stopSceneBgm(); if (typeof mpStopBgm==='function') mpStopBgm();` を呼ぶ。

### 2. [中] 戦術ノート（ポットオッズ入門）は撃破で無料解放されるのに、交換所では買えてしまう
- 場所: SHOP_ITEMS `note_pot_odds`（350コイン、SHOP_UNLOCK='always'）／ isItemOwned（約5411行）／ OPPONENTS の `unlockNoteOnClear: 'pot_odds'`（約556行、グラーノ撃破）、12760行付近で unlockedNotes に追加
- 内容: isItemOwned も shopItemBlock も `save.unlockedNotes` を見ない。撃破で `pot_odds` が unlockedNotes に入っても、交換所の「ポットオッズ入門」は「購入」ボタンのまま。買っても hasNote('pot_odds') は既に true なので何も増えず、350コインが無駄になる（逆順に買ってから撃破しても二重取りになる）。
- 再現: グラーノを撃破 → 交換所「戦術ノート」→ ポットオッズ入門が購入可能。買うとコインだけ減る。
- 直し方: isItemOwned に `if (itemId.startsWith('note_') && (save.unlockedNotes||[]).includes(itemId.slice(5))) return true;` を足す（表示は「購入済み」。撃破で貰う側の ID は board_danger / range_basic も同形式なので共通で安全）。または shopItemBlock に kind:'superseded'、label:'撃破で解放済み' を追加。

### 3. [中] 「コインと所持品を持って最初から」で、ぱにゅぱにゅの1日5回の無料コイン上限が戻る
- 場所: case 'new-game-keep-coins' の KEEP_KEYS（約7726行）／ panyuFreeUseReward（約10312行）
- 内容: ログボは「同じ日にもう一度受け取れた」バグを避けるため loginBonus を持ち越しているが、同じ性質の `panyuFreeDaily`（1日5回まで）が KEEP_KEYS に無い。defaultSave に戻って count が 0 になる。
- 再現: ロビーのぱにゅぱにゅで今日の5回分のコインを受け取る → 新しく始める → 「コインと所持品を持って最初から」→ また5回受け取れる。何度でも繰り返せる稼ぎ道になり、交換所の値付けを崩す（コード側コメントが守ろうとしている点）。
- 直し方: KEEP_KEYS に `'panyuFreeDaily'` を追加。ついでに `'panyuSenseFreeUsed'`、`'panyuPity'`、`'panyuBgTheme'` も持ち越すか検討（演出の好みと、確定演出までの歩数なので優先度は低い）。

### 4. [低] 設定の音量スライダーを動かしても、他の音量バー／ロビー下パネルの値が同期されない
- 場所: showSettingsModal の `[data-volume]` の input ハンドラ（約4855行）
- 内容: save.bgmVolume を書いて applyBgmVolume() するが、`refreshAudioBars()` を呼ばない（toggle 側は呼んでいる）。同じ画面の `.audio-bar-volume`・`.lb-vol` が古い値のまま残る。次に別のバーを触るまで食い違う。効果音スライダーは試し鳴りもしない（音量が分からない）。
- 直し方: ハンドラ末尾に `refreshAudioBars()`、sfx 側は `change` で `mpSfx('tap')` を1回。

### 5. [低] normalizeSave が設定系の型を直さない
- 場所: normalizeSave（約285〜330行）
- 内容: bgmVolume・sfxVolume・sfxOn・forceSound は丸めているが、`bgmOn`・`psychEnabled`・`logicEnabled`・`backdoorOn`・`backdoorUnlocked`・`panyuGaugeMax`・`unlockedNotes`（配列か）は検証なし。`unlockedNotes` が null/文字列だと applyItemEffect（`save.unlockedNotes.includes/push`）が起動時に例外になり、reapplyAllOwnedEffects 以降が止まる。手で書き換えたデータ・古い版のデータでだけ起きる。
- 直し方: `if (!Array.isArray(s.unlockedNotes)) s.unlockedNotes = ['bluff_basic'];` と `bgmOn`/`backdoorOn`/`backdoorUnlocked` の boolean 化、panyuGaugeMax の数値化を追加。

### 6. [低] リセットが localStorage の一部を残す
- 場所: wipeAllProgress（約441行）
- 内容: 消すのは SAVE_KEY・`mimi.panyuOutfit`・`mbGachaBook` のみ。残るもの: `mbTab`（battles/core.js、読み合い一覧の最後のタブ）、読み込み失敗時に作る `tousatsu_mimi_save_v1_broken_<時刻>`（残骸が増え続け、容量を食う。「すべて消す」と言いながら昔のセーブの控えが端末に残る）。
- 直し方: `Object.keys(localStorage)` から `SAVE_KEY + '_broken_'` で始まるものと `mbTab` も消す。

### 7. [低] ぱにゅぱにゅの衣装替えボタンを押すと、遊びの途中でメッシュが作り直される
- 場所: showPanyuClicker の `.pv2-outfit` ハンドラ（約15364行）／ mountMesh
- 内容: iframe を毎回作り直すので、外れたボタンなど衣装側の状態は初期化される一方、タップ数（tapped / count）は続く。進行バーと見た目が食い違う。完走後や0タップなら問題なし。
- 直し方: 1タップ以上したら衣装ボタンを押せなくする、または衣装替えは開始前だけにする。

### 8. [低] 死んだ（どこからも呼ばれない）コード
- `showHomeSettings`（home.js 241行）: 呼び出し元なし。`home-settings` は showSettingsModal へ行く。内側の `toggle-bgm`/`toggle-sfx` 分岐（openHomeDialog の audio 引数）も道連れ。
- `renderLobbySettings` と `case 'lobbySettings'`（約3330行）、`toggle-psych`／`toggle-logic` の onAction: `data-bind="lobbySettings"` を持つ要素が index.html にも game.js にも無い。
- `renderStageList`（約4108行）、`case 'stageList'`、`chipBonusTotal()`（約12769行）、`chipChoice`: 同じく `data-bind="stageList"` が無く到達しない。chipBonusTotal は「持っているチップ拡張を全部足す」旧仕様で、今の carryInChips（最大1つだけ）と食い違うため、将来誰かが使うと +500+1500+… になってしまう。
- 直し方: 削除（または「旧仕様・不使用」の注記）。

### 9. [低] 到達しない分岐
- shopItemBlock の `requires:'ending'` →「ヴェルベット撃破で解放」ロック表示（約5418行）: requires 付きの商品はすべて SHOP_UNLOCK='velvet' で、撃破前は renderShopItems に並ばないため出ることがない。害はなし。buyItem 内の `block.label.replace('', '')` も何もしない式。

---

## 設定画面 チェック済み（問題なし）

| 項目 | 読み書きする保存キー | 結果 |
|---|---|---|
| BGM ON/OFF | bgmOn（toggleLobbyBgm→saveProgress） | OK。切ると lobby/ED/skin/scene/mp をすべて止める。ONで今の画面の1曲だけ鳴らす |
| BGM 音量 | bgmVolume | 保存・applyBgmVolume で即反映。skin BGM は毎拍 bgmVolFloat() を読むので追従。再読込後 normalize で0〜100に丸め（#4 を除く） |
| 効果音 ON/OFF | sfxOn | OK（toggleSfx→saveProgress→refreshAudioBars） |
| 効果音 音量 | sfxVolume | OK（mpSfx が呼び出し時に sfxVolFloat() を読む）。試し鳴りなし（#4） |
| 端末が消音でも音を出す | forceSound | setForceSound が保存＋セッション即反映。再読込後は boolean 化される |
| 心理バトル／論理バトル | psychEnabled / logicEnabled | 保存され、14478・14489行付近で毎回読むので即反映。講義・tutorialMode は無視する旨の注記も実装と一致 |
| 練習用「相手の手札を見る」 | backdoorOn（backdoorUnlocked のとき表示） | 対戦中でも updateBackdoorPanel＋notePeekUse で即反映 |
| ひらく（コレクション／辞典／装備変更／ファイブポーカー／全画面） | — | 行き先の関数・アクションはすべて実在（requestGameFullscreen、showMiniPokerGame など）。UI_ICON の gear/trophy/book/dress/card も定義済み |
| リセット | SAVE_KEY ほか | 確認ダイアログ（danger）あり、「やめる」で何も消えない。消す対象は SAVE_KEY・mimi.panyuOutfit・mbGachaBook。コイン・購入品・称号・装備見た目は defaultSave＋reapplyAllOwnedEffects で戻る（ただし #1 #6） |
| 文字速度 | — | 存在しない（機能なし） |
| セーブの書き出し／読み込み | — | 存在しない。検証すべき入口がないので、壊れたデータの取り込みも起きない。読み込み失敗時のみ `_broken_<時刻>` に控えを残して新規開始（トースト付き） |
| 廃止5商品の返金 | normalizeSave | ownedItems から除去しコイン加算。`__pendingRefundNotice` は保存されうるが、トースト表示後に delete される。再読込で二重返金にはならない（保存前にリロードしても同じ結果に再計算されるだけ） |

## 交換所 チェック済み（問題なし）

- ID 整合: SHOP_ITEMS 68件、重複なし。SHOP_UNLOCK の過不足なし（全商品が明示登録）。SHOP_COMMENTS 全68件に台詞あり、余りなし。不正なステージ名なし。
- 段階: requires:'ending' の商品はすべて 'velvet'。SHOP_PREREQ の前提品は常に同じかより早い段階で入荷（sense_lv3/range_lv3 は grano、前提 lv2 は always/selina。gauge+50 は velvet、前提 +20 は always）。SHOP_TIERS の価格は上位ほど高く、入荷段階も上位ほど遅いか同じ。
- clearBonus（memory_ending / ending_theme / omake_credit）: price 0 は clearBonus 商品だけ。isItemOwned がヴェルベット撃破で所持扱いにし、buyItem は先頭で拒否、値札は「クリア特典 無料」。ownedItems に買った記録が残っていても矛盾しない。
- buyItem: 所持・clearBonus・未入荷・ブロック（前提不足／上位所持／ending 未達）・コイン不足の順で弾く。コインの減算・push・保存は同期処理なので、連打しても二重購入・二重減算は起きない（2回目は isItemOwned で即 return）。bindActions は同じ関数参照を addEventListener するだけなので購入後のリスナー重複もなし。
- 効果の適用: 全 itemId が applyItemEffect に載っているか、他で参照されている。
  - panyu_gauge_plus_20/50 → panyuGaugeMax（12908・13630行で state.panyuMax に反映）
  - panyu_sense_lv2/3 → senseLevel（15179行で Lv3 は2つ除外）、panyu_range_lv2/3 → rangeLevel（15981行）
  - panyu_combo_x2 → panyuComboMultiplier（7944行付近で乗算）、panyu_chrono → 15084行で ownedItems 直読み
  - note_pot_odds / tell / bankroll → unlockedNotes（14088・4650・17084行で使用）
  - 見た目・BGM・SE は EQUIP_CATEGORIES の choice.id と applyItemEffect の代入値が node で全件一致（不一致0）。
- 起動時 reapplyAllOwnedEffects は `{equip:false}` で装備を上書きしない。sanitizeEquipped が未所持の装備を default へ戻す。
- チップ拡張（chips_plus_*）: 非加算で「持っている最大1つ」。carryInChips が ownedItems から決め、卓の開始（startBattle）・コレクション表示・ロビーの座る前の表示が同じ関数を使う。carryChips が所持額に無い値でも最大へ落ちる。装備変更で「最大を選ぶ→null（自動）」に戻すので、後で上位を買うと自動で乗り換わる。自動以外を選んでいた人が買った場合のみ新しい額に切り替わる。講義（tutorialMode）は0。
- 装備変更: 未所持は disabled＋鍵。ヴェルベット入荷前の velvet 品は選択肢ごと隠す。
- 新入荷タグ: isShopItemNew は入荷済み＆未閲覧のみ。ショップ内では消えず、`back-lobby` でショップから出る時に markShopItemsSeen。ロビーのバッジ（newItemCount）と一致。
- ぱにゅ衣装（pwear_*）: SHOP_ITEMS 10件 ⇔ PANYU_OUTFITS（bunny を除く）10件が完全一致、panyu-mesh.html の OUTFITS に12種すべてのキーあり、PANYU_OUTFIT_IMG の12枚と shop サムネ11枚が実在。panyuOutfitOwned は isItemOwned 経由（リセット・持ち越しとも整合）。panyuOutfit() は所持していない値なら bunny に戻すので、localStorage を直接いじっても未購入衣装は着られない。衣装が1つ（バニーのみ）の時は案内トーストを出して循環しない。WebGL なし／legacy では衣装ボタンを隠す。
- メモリ品の「遊ぶ／読む」: memory_ending→play-ending、memory_ending_theme→play-ending-theme（toggleEndingThemePreview）、memory_minipoker→play-minipoker（showMiniPokerGame）、omake_credit→play-credits（playStaffRollReplay）、MEMORY_CONTENT の gallery_rico／gallery_opponents／gallery_mimi／omake_drama_1／omake_drama_2／omake_voice_pack→view-memory（showMemoryViewer）。すべて関数が実在。音源の assets/bgm の参照ファイルも全部ディスクに存在。
- 「新しく始める」（持ち越し）: KEEP_KEYS で購入品・装備・持ち込み額・音設定・ログボ記録を持ち越し、reapplyAllOwnedEffects で効果を再構築（ただし #3）。

## 優先して直すなら

1. #1（リセット後にBGMが止まらない）: 1〜3行。
2. #2（撃破で解放済みのノートを買える）: isItemOwned に1行。
3. #3（持ち越し時の無料コイン回数）: KEEP_KEYS に1語。
4. #5（unlockedNotes の型）: 起動時の例外を防ぐ保険。

調査用スクリプト: C:\Users\takakazu\AppData\Local\Temp\claude\C--Users-takakazu-projects-mimi-porker\8253e851-6f1c-4559-b820-b730f601bcda\scratchpad\chk.js（ID の相互照合と素材の存在確認。読み取りのみで game.js は無変更）。
