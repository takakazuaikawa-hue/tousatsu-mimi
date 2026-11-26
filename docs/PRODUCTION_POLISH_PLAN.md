# 製品化仕上げ 実装指示書（Sonnet 実行用）

> 作成: Fable 5（監査・実測済み） ／ 実行: Sonnet
> 対象: `game.js` / `style.css` / `index.html`（すべてプロジェクトルート直下）
> 検証方法: 本書末尾の「検証手順」を各タスク完了ごとに必ず実行すること。
> 画像が必要なタスクは `docs/IMAGE_GEN_BRIEF_CODEX.md` のファイル名を参照（画像が未配置でも動く onerror フォールバック必須）。

---

## P0-1: バトル画面センターテーブルの縦オーバーフロー修正【最重要・実測済み】

### 症状（実測値）
- `.center-table`: top=176, bottom=569（visual）, clientHeight=449, scrollHeight=482 → **33px 溢れ**
- 子の `.bet-unified`（ベット帯）: bottom=596 → **親の下端569を27px突き抜けて**下のミミ思考ゾーンに重なる
- 見た目: ベット帯（ポルカ ベット／ポット 100／ミミ ベット／コール —）が枠からはみ出して浮いている

### 原因
`.center-table` は grid/flex で高さが決まっているが、子要素（相手情報パネル＋場札グリッド＋ベット帯）の合計が枠を超えている。`overflow: visible` なのでそのまま重なる。

### 修正方針
1. `style.css` の `.center-table` に `display: flex; flex-direction: column; overflow: hidden;` を確認/設定し、
   子要素の高さ配分を明示する:
   - 相手情報パネル（上部）: `flex: 0 1 auto; min-height: 0;`
   - 場札グリッド（中央）: `flex: 1 1 auto; min-height: 90px;`
   - `.bet-unified`（ベット帯）: `flex: 0 0 auto;`（自然高・圧縮禁止）
2. それでも溢れる場合は相手情報パネル内の余白（padding/gap）を 2〜4px 刻みで詰める。
   **テキストの flex 圧縮（子が縮んで文字が切れる）は絶対に発生させない**こと
   （心理バトルモーダルで既出のバグパターン。`flex-shrink: 0` を文字要素に）。
3. `.bu-cell-pot` は h=147 に対し内容169（ラベル＋金額＋コール表示）。
   `bu-callneed` の margin-top を圧縮 or ポット金額のフォントを 38px→32px に。

### 受け入れ基準
- `.bet-unified` の getBoundingClientRect().bottom ≦ `.center-table` の bottom + 2
- `.center-table` の scrollHeight ≦ clientHeight + 4
- 全テキスト（コール/ポット/ベット）が視認可能（クリップなし）

---

## P0-2: 右パネル「戦績」ラベルの見切れ修正

### 症状
スクリーンショットで `📋 戦績 （まだ集計な𝕏` と途中で切れている。

### 修正
該当ボタン/行（`game.js` 内で「まだ集計」を grep）のテキストを短縮:
「戦績（まだ集計なし）」→「戦績 <small>未集計</small>」。
CSS 側は `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` を付けて
どんな文言でも枠内に収まるようにする。

---

## P0-3: 空状態（エンプティステート）の「—」ダッシュ羅列をやめる

### 症状
ハンド開始前、ベット帯に「ポルカ ベット —」「ミミ ベット —」「コール —」と
ダッシュだけが並び、未完成に見える（ユーザー指摘の「見出しだけがある」状態）。

### 修正
`game.js` のベット帯レンダリング（`.bu-cell-label` / `.bu-callneed` を生成している箇所を grep）で:
- 値が null/0 のセルは `visibility: hidden` ではなく **淡い待機表示**にする:
  ラベルは残し、値の「—」を `<span class="bu-waiting">待機中</span>`（opacity 0.35, font-size 11px）に。
- `bu-callneed-idle`（コール不要時）はダッシュではなく **非表示**（display:none）にし、
  コール必要時のみ「コール 50」を表示。

### 受け入れ基準
プリフロップ配布直後の画面に「—」が1つも表示されない。

---

## P1-1: 衣装チェンジの完全実装【売っているのに機能しない商品がある】

### 実態（grep 済み）
| フラグ | 設定箇所 | 適用箇所 | 状態 |
|---|---|---|---|
| `equippedRicoOutfit` | buyItem L3359 | ロビー pickLobbyRico L2990 | ✅ 動く |
| `equippedCardSkin` | L3362-3366 | 要確認 | △ |
| `equippedTableSkin` | L3368-3371 | 要確認 | △ |
| `equippedMimiSkin` | L3377-3379 | **どこにも無い** | ❌ 未実装 |
| `equippedChipSkin` | 要確認 | 要確認 | △ |
| `equippedCutin` | 要確認 | body[data-cutin-skin] | △ |

### 修正
1. **equippedMimiSkin（必須）**: ぱにゅぱにゅミニゲーム（`showPanyuClicker`）と
   ミニポーカーのミミ（`mp-char-img`）に CSS フィルタクラスを適用する。
   - `game.js`: ミミ画像を出す時に `mimi-skin-${save.equippedMimiSkin}` クラスを付与
   - `style.css` に追加:
     ```css
     .mimi-skin-pink  { filter: hue-rotate(310deg) saturate(1.3); }
     .mimi-skin-panda { filter: grayscale(1) contrast(1.25); }
     .mimi-skin-gold  { filter: sepia(1) saturate(2.2) hue-rotate(10deg) brightness(1.15); }
     ```
   ※ 専用画像（mimi_pink.png 等）が CODEX から届いたら画像差し替えに格上げ。
   届くまではフィルタで「機能する」状態にする。
2. **カード裏/テーブル/チップ**: `equippedCardSkin` 等が実際に battle 画面へ
   反映されるか grep（`data-card-skin` / `body[data-` 等）で確認し、
   未配線なら body への data 属性付与＋CSS を配線。
   既に動いているなら本項スキップ（確認結果を報告に書く）。
3. **装備変更モーダル**（`showEquipModal`）に「⚠ 効果はバトル/ミニゲーム画面で反映」の注記を追加。

### 受け入れ基準
- ショップで売っている「見た目」カテゴリ全商品が、購入→装備→**画面上の見た目が変わる**
- 1つでも「買っても何も変わらない」商品が残っていたら不合格

---

## P1-2: 参照切れ画像の修復

### 実態（差分検出済み）
- `assets/ui/panyu_ball.png` が **存在しない**（style.css L8114/8123/8137 が参照）。
  実在するのは `panyu_ball_l.png` / `panyu_ball_r.png`。

### 修正
style.css の該当3箇所を `panyu_ball_l.png` に変更（もしくは CODEX 納品後に差し替え）。

---

## P1-3: バトル中のミミ表情差分（画像待ちでも配線先行）

### 実態
ミミは `mimi_default` / `mimi_blush` のみ。勝敗・ピンチで表情が変わらない。

### 修正（CODEX 画像納品前提の先行配線）
`game.js` に表情切替ヘルパを追加:
```js
// 表情: default / win / sad / shock / think（画像が無ければ default にフォールバック）
function setMimiExpression(expr) {
  document.querySelectorAll('.battle-mimi-img, [data-mimi-face]').forEach(img => {
    img.src = `assets/characters/mimi_${expr}.png`;
    img.onerror = () => { img.onerror = null; img.src = 'assets/characters/mimi_default.png'; };
  });
}
```
呼び出しポイント:
- ハンド勝利 → `win` ／ ハンド敗北 → `sad`
- 相手のオールイン・大レイズ → `shock`
- 心理バトル開始 → `think` ／ 解決後 → `default` に戻す
バトル画面のミミ立ち絵 img に `data-mimi-face` 属性を付けること。

---

## P2: ファーストインプレッション導線【最初に"面白そう"と思わせる】

### 現状の問題
初回起動 → タイトル → ロビー → 「📚 受講する」(35問の講義) が最短導線。
**遊びの快感に到達するまでが遠すぎる**。商業ゲームは最初の60秒で魅せる。

### 実装内容: 「体験ハンド」ファネル
1. **初回起動判定**: `save.clearedStages.length === 0 && !save.introPlayed` のとき、
   タイトルの「はじめる」ボタンを押すと **ロビーではなく体験ハンドに直行**。
2. **体験ハンド仕様**（新関数 `startIntroHand()`）:
   - 固定シナリオ: ミミの手札 A♠A♥（プリフロップ最強）を配る（デッキ操作）
   - 相手はポルカ、チップ 500 vs 500、アンテ済みでフロップまで自動進行
   - フロップ A♦ 7♣ 2♠（セット完成！）
   - リコの吹き出し1つだけ:「**すごい手が来てる。大きく行こ！**」
   - 選択肢は「大レイズ」「オールイン」の2つだけ（他ボタンは disabled）
   - 相手コール → ターン/リバー自動 → **勝利演出＋コイン獲得（+200）**
   - 勝利画面に「ポーカー、もっと知りたい？」→「📚 リコの講義へ」「🎮 このままロビーへ」
3. `save.introPlayed = true` を defaultSave / normalizeSave に追加。
4. 体験ハンド中は 中断ボタン・設定等は非表示（没入優先）。60秒以内に終わる尺にする。

### 受け入れ基準
- 新規セーブで起動 →「はじめる」→ 60秒以内に「勝った！コイン増えた！」を体験できる
- 2回目以降の起動では従来どおりロビーへ
- 体験ハンドの結果はレース/バトル戦績に**カウントしない**（表示専用）

---

## P3: 相手情報パネルの整理（見出しだけ問題の残り）

「見た目・雰囲気」パネルは講義前の初心者に情報過多。
- ミミミゲージ 0 のとき: パネルを1行の「👁 相手をよく観察しよう」に折りたたむ
- ミミミ 1 以上で現在の詳細パネルを展開表示
- 「▶ 詳細データ」「▶ 戦績」の空アコーディオンは、**中身が空のときはボタン自体を出さない**

---

## 検証手順（各タスク後に必ず実行）

ローカルサーバー（`.claude/launch.json` の `mimi-static`、port 8765）を起動し、
ブラウザ eval で以下を確認（スクリーンショットは詰まるので **DOM実測** で行う）:

```js
// 1. オーバーフロー検査（transform scale 対応版: clientHeight vs scrollHeight で比較）
[...document.querySelectorAll('.center-table, .bet-unified, .stage-card, .psych-modal')].map(el => ({
  cls: el.className, ch: el.clientHeight, sh: el.scrollHeight, ok: el.scrollHeight <= el.clientHeight + 4
}))
// 2. 親からのはみ出し検査
(() => { const c = document.querySelector('.bet-unified'), p = document.querySelector('.center-table');
  return c.getBoundingClientRect().bottom <= p.getBoundingClientRect().bottom + 2; })()
// 3. コンソールエラーゼロ確認（新規エラーのみ。旧バージョンの履歴ログは無視）
```

プレイフロー確認: タイトル→(新規なら体験ハンド)→ロビー→ポルカ戦1ハンド→心理バトル1問→ショップ→装備変更→ミニポーカー1戦。
全画面で「—」の羅列・テキスト見切れ・ボタン圏外がないこと。

## 完了報告フォーマット
タスクごとに「実測値 before/after」を記載すること。「直しました」だけの報告は不可。
