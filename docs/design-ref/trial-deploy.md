# 体験版の配置メモ（ポメラシバスタジオのHP用）

- 置き場所：`/demos/texas-holdem/`（フォルダーの中身をそのまま置く。入口は `index.html`）
- 作り方：`node tools/build-trial.mjs dist/demos-texas-holdem --store ../../games/texas-holdem/ --local-fonts`
- 検査：`QA_TRIAL_SITE=<根> QA_TRIAL_PATH=demos/texas-holdem node qa/trial.mjs 844x390`

## 中身
- 静的ファイルだけ（HTML・CSS・JavaScript・画像・音楽・字体）。サーバー側の処理・データベース・ビルドは不要
- パスはすべて相対。どのサブフォルダーに置いても動く。外部への通信なし（字体も同梱、SIL OFL：`fonts/LICENSE.txt`）
- 「製品版のページへ」は `../../games/texas-holdem/`（作品紹介ページ）へ同じタブで移る。置き場所を変える時は `--store` を変えて書き出し直す
- セーブは遊ぶ人の端末のブラウザの中（localStorage、`tousatsu_mimi_trial_save_v1`）。サーバーには何も送らない

## 容量
- 全体 約103MB（約1,300ファイル）。うち字体 約23MB（必要な文字の分だけ読まれる）・曲 約37MB
- 最初に開いた時に読むのは数MB。絵や曲は場面ごとに後から読む

## サーバーの設定（あれば良いもの・無くても動く）
- MIME：`.webp` `image/webp`、`.mp4` `video/mp4`、`.woff2` `font/woff2`、`.webmanifest` `application/manifest+json`、`.m4a` `audio/mp4`
- `sw.js`（まとめてダウンロード用の Service Worker）は `/demos/texas-holdem/` の中だけで動く。HTTPS が必要（HTTP では使われないだけで遊べる）
- 動画の早送りのため Range 要求に応じること（一般的な静的ホスティングは対応済み）
- 更新した時に古い JS を掴まないよう、`index.html` はキャッシュを短く（JS・CSS は `?v=` 付きで読むので長くて良い）
