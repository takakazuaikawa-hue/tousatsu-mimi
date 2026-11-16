# 声・曲・効果音の釣り合い（2026-11-16）

ユーザーの指摘：「BGMに比べてボイスが大きすぎる。効果音とも比べて整えて」「起動時に曲が鳴らない」「プロローグからロビーに戻ったら無音」。
聴き比べのページ：https://claude.ai/artifact/LVoEsw5nRQwZcpQLgYdBdF

## 測り方
- 曲・声：ffmpeg の ebur128（`ffmpeg -i f -af ebur128=peak=true -f null -`）で積分の大きさ（LUFS）。
- 効果音：その場で合成しているので、検査ブラウザで OfflineAudioContext に mpSfx を鳴らして wav に書き出し、瞬間（400ms）の最大で測った。
- 既定の設定は 曲35・効果音50・声60。声の間は曲を 0.7 倍に下げる（voice.js の DUCK_TO）。

## 素材の大きさ
| 素材 | LUFS |
|---|---|
| 声（7人×12本） | -14.0〜-16.8、平均 -15.4（全員そろっている） |
| bunny-trump（タイトル） | -15.1 |
| battle | -13.3 |
| boss | -12.6 |
| minigame | -14.7 |
| velvet-deal | -15.9 |
| hokorobu-hoho（幕間） | -16.6 |
| royal-flush（勝ち） | -16.3 |
| velvet-dice-run（零時の卓） | -15.0 |
| realtime-attack（女神バカラ1曲目「リアルタイムアタック」、gain 0.79） | -15.8 |
| bug-riyou-shimasu（女神バカラ2曲目「バグ利用します」、gain 0.81） | -16.1 |
| velvet-night-casino（ロビー、gain 1） | -16.5 |
| ending | -16.2（エンディングは別に 1.6 倍） |

効果音（効果音50、旧 SFX_BOOST 4、瞬間の最大）：チェック -43.5／コール -44.3／ベット -41.9／配る -39.8／勝ち -34.2／オールイン -30.2／ロイヤル -26.9。声の瞬間の最大は素で約 -11。

## 既定の設定で聞こえる大きさ
| | 直す前 | 直した後 |
|---|---|---|
| 声 | -19.8 | -25.0（声に 0.55 を掛けた） |
| 曲（タイトル） | -27.1 | -27.1 |
| 曲（声の間） | -30.2 | -30.2 |
| 声 − 声の間の曲 | +10.4 dB | +5.2 dB |
| チェックの音（瞬間） | -43.5 | -37.5（SFX_BOOST 4→8） |
| ロイヤル（瞬間） | -26.9 | -20.9（声の瞬間の最大 -20.6 とほぼ同じ） |

狙い：声は曲（声の間）より約5dB上、いちばん派手な効果音が声と同じくらい、卓の短い音は曲に埋もれない。

## 変えた値
- voice.js `VOICE_MIX = 0.55`（音量つまみに掛ける）。
- game.js `SFX_BOOST` 4→8。
- game.js `SCENE_BGM` の gain を、既定の音量で全曲が約 -27 LUFS になるようにそろえた（boss 0.72→0.60、minigame 0.55→0.68、intermission 0.75→0.85、victory 0.78→0.83、allstar 0.70→0.72）。

## 起動時の曲
- 原因：ブラウザ版は 2026-05-27 から曲の既定が OFF（DLsite 版だけ 11/06 から ON）。だからタイトルもプロローグ後のロビーも無音だった。
- 直し：曲の既定を ON に。ブラウザは最初の操作の前に鳴らせないので、initGlobalAudioBar で最初に押した時（navigator.userActivation が立った時）に startBgmForScreen() を一度だけ呼ぶ。
- 以前のセーブで曲 OFF のまま残っている人は、normalizeSave で一度だけ ON に戻す（bgmDefaultOn の印。音をまるごと消している人は除く）。
- 検査：`node qa/bootbgm.mjs [local|stage|web]`、`node qa/prologuebgm.mjs [local|web]`（web は押した扱いの操作の前は play() を断るまね）。
