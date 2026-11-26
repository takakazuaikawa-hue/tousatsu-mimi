# BGM 配置

## ロビー BGM

ファイル名：`lobby.mp3`

このフォルダに `lobby.mp3` を置くと、ロビー入室時に自動で小音量ループ再生されます。
（無くてもゲーム動作には支障ありません。フッターの「♪」横の🔊ボタンでON/OFF可能）

## エンディング主題歌

ファイル名：`ending.mp3` （曲名：「ポーカーフェイスの終わり〜変な件〜」）

エンディング画面で自動再生されます。クリア後は交換所「メモリ」カテゴリで
400コインで購入すると、いつでも視聴できるようになります。

## 推奨フリー音源（商用OK・帰属表記の有無を確認のうえ使用）

ラウンジジャズ／カジノBGM系で雰囲気が合うもの：

### DOVA-SYNDROME（日本語、登録不要）
- https://dova-s.jp/
- 「ジャズ」「ラウンジ」「カジノ」で検索
- 推薦：「Midnight Lounge」「Velvet Bar」系のスローテンポJazz

### 効果音ラボ
- https://soundeffect-lab.info/
- 短尺BGM多数

### Pixabay Music（CC0/Royalty-Free）
- https://pixabay.com/music/search/jazz%20lounge/
- ダウンロード時に「lobby.mp3」にリネーム

### Free Music Archive
- https://freemusicarchive.org/genre/Jazz/

## ファイル仕様

- 形式：MP3（または OGG なら index.html の audio src を変更）
- 推奨：1〜3分のループ向きスローJazz
- 音量：実装側で 0.35 倍に絞っているのでマスター音量は気にしなくてOK
- サイズ：3MB 以内推奨（GitHub Pages配信のため）
