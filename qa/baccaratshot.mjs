// バカラ（クリア後のおまけ）の画面を場面ごとに撮り、文字の大きさ・はみ出し・例外を見る。
// node qa/baccaratshot.mjs [phone|small|pc]（既定 phone＝844x390、small＝667x375、pc＝1280x800）。出力 qa/out/baccarat/<種類>/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';

const kind = process.argv[2] || 'phone';
const [W, H] = kind === 'pc' ? [1280, 800] : kind === 'small' ? [667, 375] : [844, 390];
const OUT = path.join(REPO, 'qa', 'out', 'baccarat', kind);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];

// 見えている文字の実寸・画面の外・親からのはみ出し
const CHECK = `(() => {
  const host = document.querySelector('.bc-host'); if (!host) return { none: 1 };
  const VW = innerWidth, VH = innerHeight, small = [], off = [], clip = [];
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return false; for (let p = el.parentElement; p && p !== host.parentElement; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < .05) return false; } return true; };
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!vis(el)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const k = el.getBoundingClientRect().height / (el.offsetHeight || 1) || 1;
    const fs = parseFloat(getComputedStyle(el).fontSize) * (Number.isFinite(k) && k > 0 ? k : 1);
    if (fs < 13.6) small.push(t.slice(0, 14) + ' ' + fs.toFixed(1));
    if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) off.push(t.slice(0, 14));
    const box = el.closest('button, .bc-sub, .bc-pins > span, .bc-cd, .bc-side-head, .bc-panel, .bc-ask, .bc-wallet, .bc-roads, .bc-sq-side, .bc-sc, .bc-brief, .bc-verdict, .bc-fnote');
    if (box) { const b = box.getBoundingClientRect(); if (r.left < b.left - 1.5 || r.right > b.right + 1.5 || r.top < b.top - 1.5 || r.bottom > b.bottom + 1.5) clip.push(t.slice(0, 14) + ' @' + (box.className || box.tagName).toString().split(' ')[0]); }
  }
  return { small: [...new Set(small)], off: [...new Set(off)], clip: [...new Set(clip)], scrollX: document.documentElement.scrollWidth > VW };
})()`;

const session = await openSession({ width: W, height: H, mobile: kind !== 'pc', speed: 1 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 200)));
const val = (js) => page.eval(js).catch(() => null);
const until = async (js, ms = 30000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
for (let i = 0; i < 60 && !(await val('typeof startBattle === "function" && !!window.BaccaratUI')); i++) await sleep(500);
const report = []; let idx = 0;
async function snap(name, settle = 350) {
  await page.eval('Promise.all([...document.images].filter(i=>i.src && !i.complete).map(i=>i.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)').catch(() => {});
  await sleep(settle); idx++;
  const file = `${String(idx).padStart(2, '0')}_${name}.png`;
  const r = (await val(CHECK)) || {};
  await page.screenshot(path.join(OUT, file));
  r.name = name; report.push(r);
  console.log(kind, name, JSON.stringify(r));
}
const Q = 'BaccaratUI._qa';
const demoSeen = process.env.QA_DEMO ? 'false' : 'true';
await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.readIntroSeen = true; save.coins = 2400; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { velvet: 'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; save.baccarat = { demoSeen: ${demoSeen}, godSeen: true, orSeen: true, betraySeen: true, qn: 0, sqMode: ${JSON.stringify(process.env.QA_SQ || "manual")} }; saveProgress()`);
await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
// ホームの読み込みの幕が消えるのを待つ（幕が残ると写真に重なる）
await until(`!document.querySelector('.loading-veil, .load-veil, #preload-overlay:not([hidden])')`, 20000); await sleep(4500);
await ev('BaccaratUI.open()');
await until(`!!document.querySelector('.bc-host')`, 15000); await sleep(900);

if (process.env.QA_DEMO) {
  // お手本：場面ごとに撮る
  for (const [n, t] of [['demo_1', 1500], ['demo_bet', 4200], ['demo_deal', 6500], ['demo_sq1', 9500], ['demo_sq2', 4800], ['demo_sq3', 4500], ['demo_end', 5200]]) { await sleep(t); await snap(n, 0); }
  await until(`!document.querySelector('.bc-host').dataset.demo`, 30000); await sleep(600);
}
// 卓（ディーラー）を選ぶ窓
if (await until(`${Q}.picking()`, 6000)) { await snap('pick', 400); await ev(`${Q}.pick('${process.env.QA_DEALER || 'ocho'}')`); await sleep(700); }
// 罫線を入れて、賭ける場面
await ev(`${Q}.feed('BBBPBBPPPBTBBBBBBBPPBPBPPBBTPPPPBB')`); await sleep(300);
await snap('bet_empty');
await ev(`${Q}.bet('B', 3); ${Q}.bet('T', 1); ${Q}.bet('BP', 1)`); await snap('bet_placed');
// 女神の問いかけ → 返事 → 神託
await ev(`${Q}.ask()`); await snap('ask', 500);
await ev(`${Q}.setFavor(2); ${Q}.answer(1)`); await sleep(400); await snap('answered', 300);
await ev(`${Q}.oracle(true)`); await sleep(500); await snap('oracle', 200);
// 配る → 絞り
await ev(`${Q}.deal()`);
await until(`document.querySelector('.bc-host').dataset.sq === '1' && !document.querySelector('.bc-brief').hidden`, 20000); await snap('squeeze_brief', 500);
await ev(`document.querySelector('[data-bc="sqgo"]').click()`);
await until(`document.querySelector('.bc-host').dataset.sq === '1' && !!${Q}.sq()`, 20000); await sleep(500);
await snap('squeeze_start', 200);
// 指でめくる（短い辺の下から上へ）
const cv = await val(`(() => { const r = document.querySelector('.bc-sq-cv').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
const drag = async (fx, fy, tx, ty, hold = true) => {
  const P = (u, v) => ({ x: cv.x + cv.w * u, y: cv.y + cv.h * v });
  const a = P(fx, fy), b = P(tx, ty);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 8; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8, button: 'left', buttons: 1 }); await sleep(30); }
  if (!hold) await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  return b;
};
let p = await drag(.5, .86, .5, .6); await snap('squeeze_legs', 150);
await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await sleep(400);
p = await drag(.7, .5, .47, .45); await snap('squeeze_side', 150);
await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await sleep(400);
p = await drag(.34, .2, .6, .62); await snap('squeeze_corner', 150);
await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await sleep(400);
console.log('cands', JSON.stringify(await val(`${Q}.sq() && ${Q}.sq().info()`)));
// 残りは「開く」で進める。3枚目（横向き）が来たら撮る
let third = false, verdictShot = false;
for (let i = 0; i < 200; i++) {
  const ph = await val(`document.querySelector('.bc-host').dataset.phase`);
  if (ph === 'settle') break;
  if (await val(`!document.querySelector('.bc-brief').hidden`)) { await ev(`document.querySelector('[data-bc="sqgo"]').click()`); await sleep(300); }
  if (!verdictShot && await val(`!document.querySelector('.bc-verdict').hidden`)) { verdictShot = true; await snap('squeeze_verdict', 250); }
  if (await val(`document.querySelector('.bc-host').dataset.sq === '1' && !!${Q}.sq()`)) {
    if (!third && await val(`${Q}.S().cards.P.length + ${Q}.S().cards.B.length > 4`)) { third = true; p = await drag(.3, .5, .5, .5); await snap('squeeze_third', 150); await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await sleep(300); }
    await ev(`document.querySelector('.bc-sq-open').click()`); await sleep(500); if (i === 0) await snap('squeeze_opened', 0);
  }
  await sleep(150);
}
await sleep(500); await snap('settle', 300);
// 罫線の大きな表・解説
await until(`document.querySelector('.bc-host').dataset.phase === 'bet'`, 15000); await sleep(400);
await ev(`${Q}.roads()`); await snap('roads_big', 400); await ev(`document.querySelector('.bc-over [data-bc="close"]').click()`);
for (let g = 0; g < 6; g++) { await ev(`${Q}.guide(${g})`); await snap('guide_' + (g + 1), 300); }
await ev(`document.querySelector('.bc-over [data-bc="close"]').click()`);
// 見（ケン）で1手
await ev(`${Q}.look()`); await until(`document.querySelector('.bc-host').dataset.phase === 'settle'`, 20000); await snap('look_settle', 400);
const errs = [...(await val('window.__QA.errors') || []), ...session.exceptions];
console.log('errors', JSON.stringify(errs).slice(0, 1500));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: errs, report }, null, 1));
await session.close();
process.exit(0);
