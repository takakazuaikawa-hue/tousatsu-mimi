// バカラだけを1枚のページにまとめる（開けるリンクで試してもらう用）。node qa/baccarat-standalone.mjs → qa/out/baccarat/baccarat-play.html
// 本編の save・効果音・ロビーの代わりに小さな代用品を入れ、絵は data URI で埋め込む。本編のファイルは書き換えない。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };
const uri = (f) => `data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(REPO, f)).toString('base64')}`;
// ソースに出てくる assets/ の絵を全部（あるものだけ）data URI にする
const embed = (t) => t.replace(/assets\/[\w\/.-]+\.(?:webp|jpg|png)/g, (m) => (fs.existsSync(path.join(REPO, m)) ? uri(m) : m));
const css = embed(rd('baccarat.css'));
const js = [rd('baccarat.js'), rd('baccarat-squeeze.js'), embed(rd('baccarat-ui.js'))].join('\n;\n').replace(/<\/script/g, '<\\/script');

const html = `<title>ミミのバカラ 試遊</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&family=Barlow+Condensed:wght@600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap">
<style>
/* 1画面のゲーム。黒・深紅・金の一つの見た目だけ（明るい版は作らない） */
:root { --pg-bg: #070304; --pg-fg: #f3ece0; --pg-gold: #efcd82; --pg-gold-d: #8a5a1e; --pg-crim: #3a0a0f; color-scheme: dark;
  --r-mission: 22px; --r-body: 17px; --r-speech: 17px; --r-label: 15px; --r-note: 15px; --r-btn: 20px; --r-btn2: 17px; --inv-scale: 1; --safe-x: 0px; }
:root.is-compact { --r-mission: 18px; --r-body: 15px; --r-speech: 15px; --r-label: 14px; --r-note: 14px; --r-btn: 17px; --r-btn2: 15px; }
html, body { height: 100%; }
body { background: var(--pg-bg); color: var(--pg-fg); font-family: "Noto Sans JP", sans-serif; overflow: hidden; }
#stage { position: fixed; inset: 0; overflow: hidden; }
.pg-start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center;
  padding-block: 16px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  background: radial-gradient(90% 90% at 50% 40%, #5c0e16, var(--pg-bg) 75%); }
.pg-start h1 { margin: 0; font: 800 34px/1.2 "Shippori Mincho B1", "Yu Mincho", serif; letter-spacing: .14em; color: var(--pg-gold); text-wrap: balance; }
.pg-start p { margin: 0; max-width: 34em; font-size: 15px; line-height: 1.7; }
.pg-start .row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.pg-start button { font: 700 17px/1 "Shippori Mincho B1", "Yu Mincho", serif; letter-spacing: .1em; min-height: 46px; padding: 0 22px; border-radius: 2px; cursor: pointer; color: var(--pg-fg); background: var(--pg-crim); border: 1px solid var(--pg-gold-d); }
.pg-start button.go { color: #2a1608; background: linear-gradient(180deg, #f1d590, #c79a4c 52%, #8f6628); border-color: #f6e2ab; }
.pg-start button:focus-visible { outline: 2px solid var(--pg-gold); outline-offset: 2px; }
.pg-turn { position: fixed; inset: 0; z-index: 99; display: none; align-items: center; justify-content: center; text-align: center; padding: 24px; background: var(--pg-bg); font-size: 17px; line-height: 1.8; }
@media (orientation: portrait) and (max-width: 700px) { .pg-turn { display: flex; } }
.pg-toast { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 98; padding: 8px 16px; background: #170507; border: 1px solid var(--pg-gold-d); font-size: 15px; }
${css}
</style>
<div id="stage"><div id="app"></div>
  <div class="pg-start" id="pg-start">
    <h1>バカラ（試遊）</h1>
    <p>クリア後のおまけ「バカラ」を、これだけで試せるページです。コインはこのページの中だけの物で、本編のセーブには関係しません。ディーラーと女神の絵は、案を選んでいただいてから入れます。</p>
    <p id="pg-coins"></p>
    <div class="row"><button type="button" class="go" id="pg-go">卓に着く</button><button type="button" id="pg-demo">お手本から見る</button><button type="button" id="pg-reset">コインを2,400に戻す</button></div>
  </div>
</div>
<div class="pg-turn">端末を横向きにしてください。<br>（このゲームは横画面で遊びます）</div>
<script>
// ---- 本編の代わりの小道具（このページだけ） ----
var KEY = 'mimi_baccarat_trial_v1';
var save = { coins: 2400, baccarat: null };
try { var _s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (_s && typeof _s.coins === 'number') save = _s; } catch (e) {}
function saveProgress() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
function isEndingUnlocked() { return true; }
function isBgmOn() { return false; }
function playSceneBgm() {}
var battleGen = 0, state = { screen: 'start' };
function defaultState() { return { screen: 'start' }; }
function render() { if (state.screen === 'baccarat') { document.getElementById('pg-start').hidden = true; BaccaratUI.mount(); } }
function goLobby() { BaccaratUI.teardown(); state = { screen: 'start' }; paintStart(); document.getElementById('pg-start').hidden = false; }
function toast(m) { var t = document.createElement('div'); t.className = 'pg-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400); }
// 効果音：短い電子音（最初に押した後から鳴る）
var _ac = null;
function _tone(f, d, type, vol, delay) { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); var t = _ac.currentTime + (delay || 0) / 1000, o = _ac.createOscillator(), g = _ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .05, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(_ac.destination); o.start(t); o.stop(t + d + .02); } catch (e) {} }
function mpSfx(k) {
  if (k === 'tap') _tone(720, .06, 'square', .02); else if (k === 'bet') _tone(380, .07, 'square', .035); else if (k === 'deal') _tone(520, .05, 'triangle', .04);
  else if (k === 'flip') { _tone(620, .08, 'sine', .05); _tone(880, .06, 'triangle', .04, 80); } else if (k === 'check') _tone(500, .07, 'sine', .04);
  else if (k === 'reach') { _tone(500, .2, 'sine', .05); _tone(800, .25, 'triangle', .04, 120); } else if (k === 'garapon') { _tone(700, .2, 'triangle', .05); _tone(1050, .25, 'triangle', .05, 150); _tone(1400, .4, 'sine', .05, 320); }
  else if (k === 'win') { _tone(660, .1, 'triangle', .06); _tone(880, .12, 'triangle', .06, 100); _tone(1100, .2, 'triangle', .06, 220); }
  else if (k === 'bigwin') [523, 659, 784, 1046].forEach(function (f, i) { _tone(f, .2, 'triangle', .07, i * 90); });
  else if (k === 'lose') { _tone(330, .18, 'sawtooth', .03); _tone(220, .3, 'sawtooth', .03, 140); } else if (k === 'tie') { _tone(440, .15, 'sine', .04); _tone(440, .15, 'sine', .04, 180); }
}
// 画面の大きさ（本編の fitStage の代わり）
function fit() { var r = document.documentElement, W = innerWidth, H = innerHeight; r.style.setProperty('--rb-w', W + 'px'); r.style.setProperty('--rb-h', H + 'px'); r.classList.toggle('is-compact', H < 520 || W < 900); }
addEventListener('resize', fit); fit();
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(document.documentElement);
function paintStart() { document.getElementById('pg-coins').textContent = '手持ち ' + Number(save.coins || 0).toLocaleString('ja-JP') + ' コイン'; }
</script>
<script>
${js}
</script>
<script>
paintStart();
document.getElementById('pg-go').addEventListener('click', function () { BaccaratUI.open(); });
document.getElementById('pg-demo').addEventListener('click', function () { if (save.baccarat) save.baccarat.demoSeen = false; BaccaratUI.open(); });
document.getElementById('pg-reset').addEventListener('click', function () { save.coins = 2400; saveProgress(); paintStart(); });
</script>
`;
const out = path.join(REPO, 'qa', 'out', 'baccarat', 'baccarat-play.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024 / 1024).toFixed(2) + ' MB');
