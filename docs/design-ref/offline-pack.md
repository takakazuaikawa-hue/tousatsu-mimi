# まとめてダウンロード（オフラインパック）

ゲームの全ファイル（約84MB）を端末に保存して、外でも通信をほとんど使わずに遊べるようにする仕組み。任意（押した人だけ）。ホーム画面への追加（PWA）も同じ作りで使える。

## ファイル
| ファイル | 役割 |
|---|---|
| `sw.js` | Service Worker。保存・配る・更新の突き合わせ。`scope: ./` |
| `offline.js` / `offline.css` | 画面側。初回の案内、進み具合の窓、設定の1行、`window.MimiPack` |
| `manifest.webmanifest` | ホーム画面に追加する時の名前・色・向き（横画面） |
| `assets/ui/icon-192.png` `icon-512.png` | `emblem_rabbit_gold.webp` を濃い深紅(#2a0509)の地に乗せたアイコン |
| `tools/make-offline-files.mjs` | デプロイ時に `_site/offline-files.json` を作る |
| `.github/workflows/deploy.yml` | 上の新規ファイルをコピーし、一覧を作る手順を追加済み |

新しい最上位ファイルを増やしたら、deploy.yml のコピー一覧に足すこと（名前で列挙している）。

## GitHub Pages の公開設定

リポジトリの **Settings → Pages → Build and deployment → Source** は **GitHub Actions** にする（API の `build_type: workflow`）。既存の `.github/workflows/deploy.yml` を使うので、新しい workflow の作成は不要。

`Deploy from a branch` の自動 Jekyll 配信では `tools/make-offline-files.mjs` が実行されず、`offline-files.json` が含まれない。同じ main 更新で独自 workflow と自動配信が動くと、一覧を含まない配信物で上書きされる可能性がある。deploy.yml は公開元設定を確認し、GitHub Actions 以外ならエラーで止まる。この確認だけでは公開設定は変わらないため、管理者が上の設定を変更する必要がある。

公開を行う際は、先に Source を確認し、承認済みの main に対して既存の **Deploy site to GitHub Pages** を実行する。完了後、公開 URL の `offline-files.json` が HTTP 200 の JSON で返り、空でない `files` 配列を持つことを確認する。新しいブラウザプロファイルでダウンロード完了後、通信を切って再読み込みし、起動できることも確認する（実際のセーブデータは使わない）。

設定手順：[GitHub Docs — Publishing with a custom GitHub Actions workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)

## 保存と配り方
- 保存先は Cache `mimi-pack-v1`。**保存したファイルだけ**を SW が返す。保存していないものは SW が何もせず通信へ素通し（従来どおり）。保存が空の間はfetchに介入しない。
- 本体（html/js/css/webmanifest、ページ移動）：通信を先に試し、失敗したら保存分（オフラインでも起動する）。通信できたら保存分も新しくする。
- 絵・音・動画：保存分を先に返す。Range 要求（動画・音）は保存分から切り出して 206 で返す（Safari 対策）。
- 保存分のキーは「クエリ無しのパス」。`?v=` が変わっても同じファイルとして引ける。
- 保存の記録 `__pack_map.json`（同じ Cache 内）：`{files:{パス:hash}, sizes, complete, stale:[パス], at}`。

## offline-files.json
デプロイ時に `node tools/make-offline-files.mjs _site` で作る。`{generated, totalBytes, files:[{url, hash(sha1先頭12桁), size}]}`。`sw.js` と自分自身は含めない。ローカルには無い（無い時は初回の案内を出さない）。

## メッセージ（ページ→SW、`MessageChannel` で返信。進み具合だけは全ページへ一斉送信）
- `{t:'pack-status'}` → `{t:'pack-status', downloaded, partial, count, bytes, staleCount, running, progress}`
- `{t:'pack-download', files}` → 一覧どおりに揃える（消えたものを削除、無い・ハッシュ違いを同時3本で取得、失敗は3回まで再試行）。進行中は `{t:'pack-progress', done,total,bytesDone,bytesTotal}`、終わると `{t:'pack-done', ..., failed}`。40ファイルごとに記録を保存するので、途中で切れても続きから。
- `{t:'pack-check', files}` → ハッシュが違うもの・消えたものに `stale` の印を付けて status を返す。
- `{t:'pack-clear'}` → Cache を削除。

## 更新の扱い
同じファイル名での差し替え（例：`reward_cg_grano.jpg`）があるので、起動時に通信できて保存があれば、`offline-files.json`（`no-store`）と記録を突き合わせる。違うものは `stale` にし、**stale の間はそのファイルだけ通信を先に試す**。同時に裏で取り直し、終われば印を外す。消えたものは削除、増えたものは追加。途中までの保存や、押したのに完了していない場合（`localStorage mimi.packWanted`）も次の起動で続きを取る。

## 画面
- 初回の案内：タイトルが出て1.5秒落ち着いてから一度だけ（`localStorage mimi.packPrompted`）。自動では始めない。`navigator.connection` があり cellular／saveData なら注意の一行、wifi なら表示に応じて一行。iOS は一覧なし（推奨文のみ）。
- 窓：進み具合（バー＋◯MB / ◯MB）。閉じても保存は続き、開き直すと続きが見える。完了で `navigator.storage.persist()` を呼ぶ。「保存した分を削除」は窓内の確認つき。
- iOS Safari（ホーム画面に追加していない時）：消えやすい旨の一行。Android/Chrome：`beforeinstallprompt` を捕まえて「ホーム画面に追加」ボタン。
- 設定の1行：ゲーム設定（`showSettingsModal`）の「ひらく」と、ホームの「音量・設定」に `data-pack-row` のボタン。状態は 未ダウンロード／ダウンロード中／ダウンロード済み（◯MB）／更新あり。`MimiPack.bindRow(overlay)` が結びつける（game.js・home.js の編集は各2か所）。
- `window.MimiPack = { status(), download(), clear(), openPanel(), bindRow(), stateLabel(), supported }`

## 限界
- Wi-Fi の判定は Android Chrome のみ（Network Information API）。iOS Safari・Firefox は推奨文だけ。
- iOS は、しばらく遊ばないと保存が消されることがある（ホーム画面に追加すると消えにくい）。
- 要 HTTPS（または localhost）。ブラウザの保存容量の上限に当たると取得に失敗し、「取得できなかったファイル」と出る。
- SW は端末ごとに独立。更新の確認は起動時の1回（長く開きっぱなしの間は見ない）。

## テスト
1. 配信物を作る：deploy.yml と同じコピーをしたフォルダに対し `node tools/make-offline-files.mjs <フォルダ>`。
2. ローカルでは `offline-files.json` をリポジトリ直下に一時的に置く（コミットしない）。
3. `QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 node qa/packshot.mjs qa/out/packshot download` — SW 登録、初回の案内の出現と収まり、取得・Cache 件数・削除までを通す。
4. 実機：機内モードにして再読み込みし、起動できること。ファイルを差し替えて再デプロイ後、起動すると設定の行が「更新あり」→「ダウンロード済み」に戻ること。
