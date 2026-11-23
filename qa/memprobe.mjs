// 場面ごとのメモリの見積もり（11/23 「iPhone 13 で落ちるくらいの負荷がかかっていないか」）。node qa/memprobe.mjs
// 測る物：読み込み係が展開して持つ絵（幅×高さ×4）、画面に出ている img の展開量、JS のヒープ、DOM の数、読んだ量
import { openSession, sleep } from './lib/session.mjs';
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SAVE = { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000 };
const { page, close } = await openSession({ width: 844, height: 390, mobile: true, save: SAVE });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
await page.send('Performance.enable').catch(() => {});
const snap = async (label) => {
  const m = await page.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
  const g = (n) => Math.round(((m.metrics || []).find(x => x.name === n) || {}).value || 0);
  const r = await q(`(() => {
    const held = window.MimiAssets && MimiAssets.held ? MimiAssets.held() : {};
    let domPx = 0, domN = 0; document.querySelectorAll('img').forEach(i => { if (i.complete && i.naturalWidth) { domPx += i.naturalWidth * i.naturalHeight; domN++; } });
    let bgN = 0; document.querySelectorAll('*').forEach(e => { const b = getComputedStyle(e).backgroundImage; if (b && b.includes('url(')) bgN++; });
    const res = performance.getEntriesByType('resource'); const bytes = res.reduce((a, x) => a + (x.encodedBodySize || 0), 0);
    return JSON.stringify({ held, domImgMB: Math.round(domPx * 4 / 1048576), domImgs: domN, bgEls: bgN, videos: document.querySelectorAll('video').length, readMB: Math.round(bytes / 1048576), resources: res.length });
  })()`);
  console.log(label.padEnd(14), 'heapMB', Math.round(g('JSHeapUsedSize') / 1048576), 'nodes', g('Nodes'), r);
};
try {
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(4000); await snap('title');
  await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(9000); await snap('home');
  await q(`(() => { startBattle('velvet'); return 1; })()`); await sleep(12000); await snap('battle-velvet');
  await sleep(20000); await snap('battle+20s');
  await q(`(() => { goLobby(); return 1; })()`); await sleep(6000); await snap('home-again');
  await q(`(() => { startBattle('grano'); return 1; })()`); await sleep(15000); await snap('battle-grano');
  await q(`(() => { goLobby(); return 1; })()`); await sleep(5000);
  await q(`(() => { knOpenWindow(); return 1; })()`); await sleep(4000); await snap('kn-window');
  await q(`(() => { knStart(true); return 1; })()`); await sleep(12000); await snap('kn-table1');
  await q(`(() => { goLobby(); return 1; })()`); await sleep(4000);
  await q(`(() => { if (window.BaccaratUI) BaccaratUI.open && BaccaratUI.open(); return 1; })()`); await sleep(9000); await snap('baccarat');
} finally { await close(); }
