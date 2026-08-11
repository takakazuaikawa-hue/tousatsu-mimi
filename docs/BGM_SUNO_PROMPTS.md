# BGM 発注書（Suno 生成用）— ミミのテキサスホールデムポーカー

> 生成先の想定：`assets/bgm/` 配下。**MP3 で書き出し、3MB 以内**（GitHub Pages 配信のため。128kbps で約1MB/分が目安）。
> 生成後の**結線（コードへの組み込み）は別作業**。ファイルが揃ったら「結線して」と言えば、タイトル/バトル/ボスの各シーンで鳴るよう組み込みます（既存BGMとの二重再生を防ぐ fadeOut 世代ガードも入れます）。

## 世界観の共通トーン（全曲共通・Style欄の頭に置くと安定）
夜のVIPカジノ、金×深紅×黒。上品で妖艶、少しチュウニでケレン味あり。主人公は転生バニーガールのミミ。
可愛さ（キュート）とスリル（読み合いの緊張）が同居する。生楽器っぽい質感＋控えめな電子色。

## Suno の使い方メモ
- **Style of Music** 欄＝下記「Style」を貼る（英語タグが最も安定）。
- **Lyrics** 欄＝インスト曲なので下記「Lyrics」を貼る（`[Instrumental]` と構成タグのみ）。
- 「Instrumental」トグルは ON 推奨。歌モノにしたい曲（＝主題歌）だけ歌詞を入れる。
- ループ用途：**イントロを短く**、終端は切って使うので長尺でOK。気に入った箇所を後でトリミング。

---

## ① タイトル画面 BGM　★最優先（今は無音）
**用途**：起動直後のタイトル画面。第一印象。掴みの高揚感。
**ファイル名**：`assets/bgm/title.mp3`

**Style**
```
Night VIP casino, gold and crimson, elegant and alluring. Cinematic anime title theme, mysterious and inviting. Slow-building intro, warm brass swell, soft jazzy piano, sultry upright bass, brushed drums, faint glittering chimes, a touch of orchestral drama. Sophisticated, hopeful, a little mischievous. 80 BPM. Loopable, no vocals.
```
**Lyrics**
```
[Instrumental]
[Intro: soft piano and distant chimes]
[Build: brass swell, bass enters]
[Main theme: warm and cinematic]
[Outro: gentle resolve]
```

---

## ② 通常バトル BGM　★最優先（今はロビー曲を流用）
**用途**：ポルカ/セリナ/グラーノ戦の対局中。読み合いの緊張とワクワク。ループで長く聴くので、主張しすぎず飽きないこと。
**ファイル名**：`assets/bgm/battle.mp3`

**Style**
```
Tense but stylish poker showdown in a night casino. Smooth jazz-noir groove with suspense: walking upright bass, muted trumpet stabs, brushed drums, tremolo strings for tension, occasional tick of a clock, subtle heartbeat pulse. Cool, focused, playful mind-game energy. Not aggressive, keeps a lounge sophistication. 95 BPM. Seamless loop, instrumental, understated so it can play for minutes without fatigue.
```
**Lyrics**
```
[Instrumental]
[Intro: bass and brushed drums groove]
[Verse: muted trumpet, restrained]
[Tension: strings tremolo swell, hold]
[Groove returns: cool and steady]
```

---

## ③ ボス戦 BGM（ヴェルベット／女王）　★優先（専用曲なし）
**用途**：ラスボス「ヴェルベット」との対局。最奥のVIPルーム、玉座の女王、格上の威圧感。クライマックス。
**ファイル名**：`assets/bgm/boss.mp3`

**Style**
```
Final boss duel against a queen in the deepest VIP room. Dark, regal, seductive tango-noir with high stakes. Dramatic minor-key strings, tango accordion or bandoneon, staccato piano, deep timpani and low brass, sultry slow-burn intensity rising to a powerful climax. Dangerous elegance, crimson velvet and gold. 100 BPM. Instrumental, cinematic, loopable with a strong pulse.
```
**Lyrics**
```
[Instrumental]
[Intro: low strings and distant timpani]
[Theme: tango bandoneon, dangerous and elegant]
[Rise: staccato piano and brass build]
[Climax: full dramatic swell]
[Loop back to theme]
```

---

## ④ ミニポーカー（ファイブポーカー）BGM　◎任意（現状Web Audioシンセ）
**用途**：交換所のミニゲーム。軽快で中毒性のある可愛いループ。射幸心をくすぐる賑やかさ。
**ファイル名**：`assets/bgm/minigame.mp3`

**Style**
```
Cute, catchy casino minigame loop. Bouncy chiptune-meets-jazz, playful pizzicato strings, bright vibraphone, ragtime piano, hand claps, cheerful bells, coin-jingle accents. Light, addictive, upbeat and adorable. 120 BPM. Short seamless loop, instrumental, mascot-cute.
```
**Lyrics**
```
[Instrumental]
[Intro: bright bells]
[Main loop: bouncy pizzicato and piano]
[Fill: coin jingles and claps]
```

---

## （参考）既存曲＝再生成する場合のプロンプト
差し替え不要なら触らなくてOK。統一感を出したい時のために置いておきます。

### ロビー BGM（現 `velvet-night-casino.m4a`）— `assets/bgm/lobby.mp3`
```
Late-night casino lounge. Slow smooth jazz, sultry saxophone, brushed drums, warm upright bass, mellow Rhodes piano, dim and luxurious. Relaxed, classy, velvet-and-gold atmosphere. 70 BPM. Instrumental, seamless loop, quiet enough to sit under menus.
```
> ※差し替える場合はファイル名を `lobby.mp3` にすると `<audio id="lobby-bgm-audio">` が自動で拾います。

### エンディング主題歌（現 `ending.m4a`「ポーカーフェイスの終わり〜変な件〜」）— `assets/bgm/ending.mp3`
歌モノにするなら Instrumental トグルOFF。ミミの成長と別れの余韻。
```
Style: Heartfelt anime ending theme, warm and bittersweet. Gentle piano ballad blooming into full band, soft female vocal, strings, light jazz swing, hopeful and tearful. Casino nostalgia. 78 BPM.
```
(歌詞を入れる場合は、ミミの一人称で「ポーカーフェイスの裏の本音」「賭けてきた日々への感謝」を主題に。日本語歌詞はサビだけ強い一節を用意すると Suno が乗せやすい。)

---

## 納品チェック
1. ファイル名が本書どおり（`title.mp3` / `battle.mp3` / `boss.mp3` / `minigame.mp3` …）
2. MP3・3MB以内・無音の頭が長すぎない
3. 生成後に「結線して」と依頼 → 各シーンで再生されるようコード側で組み込み＋二重再生ガード＋音量（既定0.35倍）調整
