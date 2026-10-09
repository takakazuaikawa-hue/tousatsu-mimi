# qa/ 検証の道具（配信しない）

ヘッドレス Edge で本物の `index.html` / `game.js` を動かして測る。依存パッケージは無い（Node 22 以上）。
一時ファイルの置き場所は環境変数 `QA_TMP`（未設定なら OS の一時フォルダ）。結果は `qa/out/`（git 管理外）。

| コマンド | 何を見るか |
|---|---|
| `node qa/smoke.mjs --policy learner --until ending --speed 10 --layout` | 新規セーブからエンディングまで Bot で通す。例外・停止・二重オーバーレイ・ネイティブの確認ダイアログ・レイアウト不備・画面に出た文字を `qa/out/<run>/report.json` に集める |
| `node qa/smoke.mjs --until stage:polka --size 667x375 --mobile --layout` | スマホ横持ちで同じ検査 |
| `node qa/sim.mjs --n 2000` | 本物の AI 関数で対戦を回し、方針（allin/station/beginner/learner）ごとの勝率・ハンド数・割り込み回数と、賭けられた時の反応を表にする |
| `node qa/storyshots.mjs [outDir] [幅x高さ] [mobile]` | 第1話の導入（黒地のモノローグ→扉絵と題字→会話→研修の卓）を、新しいセーブで場面ごとに撮る。会話の文字の画面上の大きさも出す |
| `node qa/titleshots.mjs [outDir] [new\|return\|ending\|phone]` | タイトル画面（v3）を、初めての人・続きからの人・クリア後・スマホ横持ちで撮る |
| `node qa/battleshots.mjs <相手> [幅 高さ] [out]` | 卓（v8）を、手番・賭け額選び・フロップ・見せ合いの4場面で撮る |
| `node qa/idleframes.mjs [outDir] [相手...]` | 相手の待機動画の元の絵を、本編の卓から撮る（部屋＋相手だけ・2倍の解像度）。仕上げは `qa/alpha/idle_finish.py` |
| `node qa/idlecheck.mjs [outDir] [相手...]` | 待機動画が下の一枚絵とずれずに重なるかを、通常・考え中で撮って比べる（WebM に直した動画を使う） |
| `node qa/idlerec.mjs <相手> [outDir] [table\|opp]` | 待機動画が卓に重なった姿を1コマずつ撮って動画にする（見本ページ用） |

- `--until`：`ending` / `stage:<id>` / `lobby` / `intro` / `hands:<n>`
- `--save <file.json>`：始点のセーブを注入する（途中の卓から検査したい時）
- `--speed`：タイマーと CSS アニメを何倍速にするか（既定10）
- `--verbose`：Bot が押したものを1行ずつ出す

Bot（`qa/probe/bot.js`）は画面の最前面で実際に押せるものだけを、CDP の本物のマウス操作で押す。
押せるのに進まない（同じボタンを30回）か、12秒間なにも変わらなければ「停止」として撮影して止まる。

`qa/probe/sim.js` の進行は game.js の手番の流れを写した模型で、AI の判断だけ本物を呼ぶ。
game.js 側の進行を変えたら、この模型も合わせて直すこと。

### 本物の字体で撮る
検査用のブラウザが外（Google Fonts）へ出られない環境では、字体が代わりの物で写る。手元に落としておくと、`openSession` と `qa/shotpage.mjs` が fonts.googleapis.com への要求をそれで返す（`qa/out/` は git 管理外）。

```sh
mkdir -p qa/out/fonts && cd qa/out/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;700;900&family=Shippori+Mincho+B1:wght@600;700;800&family=Bebas+Neue&display=swap" -o g.css
grep -o "https://fonts.gstatic.com[^)]*" g.css | sort -u | xargs -P 24 -I{} sh -c 'f=$(echo "{}" | sed "s#https://fonts.gstatic.com/##; s#/#_#g"); curl -s -o "$f" "{}"'
python3 -c "import re;s=open('g.css').read();open('fonts.css','w').write(re.sub(r'url\(https://fonts.gstatic.com/([^)]*)\)',lambda m:'url(/qa/out/fonts/'+m.group(1).replace('/','_')+')',s))"
```

`node qa/shotpage.mjs <page.html> <out.png>` はリポジトリ内の HTML（見本など）を1枚撮る。
