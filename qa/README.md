# qa/ 検証の道具（配信しない）

ヘッドレス Edge で本物の `index.html` / `game.js` を動かして測る。依存パッケージは無い（Node 22 以上）。
一時ファイルの置き場所は環境変数 `QA_TMP`（未設定なら OS の一時フォルダ）。結果は `qa/out/`（git 管理外）。

| コマンド | 何を見るか |
|---|---|
| `node qa/smoke.mjs --policy learner --until ending --speed 10 --layout` | 新規セーブからエンディングまで Bot で通す。例外・停止・二重オーバーレイ・ネイティブの確認ダイアログ・レイアウト不備・画面に出た文字を `qa/out/<run>/report.json` に集める |
| `node qa/smoke.mjs --until stage:polka --size 667x375 --mobile --layout` | スマホ横持ちで同じ検査 |
| `node qa/sim.mjs --n 2000` | 本物の AI 関数で対戦を回し、方針（allin/station/beginner/learner）ごとの勝率・ハンド数・割り込み回数と、賭けられた時の反応を表にする |

- `--until`：`ending` / `stage:<id>` / `lobby` / `intro` / `hands:<n>`
- `--save <file.json>`：始点のセーブを注入する（途中の卓から検査したい時）
- `--speed`：タイマーと CSS アニメを何倍速にするか（既定10）
- `--verbose`：Bot が押したものを1行ずつ出す

Bot（`qa/probe/bot.js`）は画面の最前面で実際に押せるものだけを、CDP の本物のマウス操作で押す。
押せるのに進まない（同じボタンを30回）か、12秒間なにも変わらなければ「停止」として撮影して止まる。

`qa/probe/sim.js` の進行は game.js の手番の流れを写した模型で、AI の判断だけ本物を呼ぶ。
game.js 側の進行を変えたら、この模型も合わせて直すこと。
