// メモリの積み上がり検査：ロビー→対戦→ご褒美CG→ぱにゅぱにゅ→ロビー を N 回くり返し、そのたびに
// JS ヒープ・DOM の数・生きている video/img/canvas/iframe/audio の数を記録する。
// 使い方: QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 node qa/memcheck.mjs [回数=4]
import { openSession, sleep } from './lib/session.mjs';
const N = +(process.argv[2] || 4);
const s = await openSession({ width: 1280, height: 800, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, loginBonus: { lastDate: '2099-01-01' } } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof goLobby === "function"').catch(() => false)); i++) await sleep(500);
await sleep(4000);
await page.send('Performance.enable').catch(() => {});
const rows = [];
async function sample(tag, cyc) {
  await page.send('HeapProfiler.collectGarbage').catch(() => {});
  await sleep(300);
  const m = await page.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
  const g = (k) => (m.metrics.find(x => x.name === k) || {}).value || 0;
  const d = JSON.parse(await page.eval(`JSON.stringify((() => {
    const c = (sel) => document.querySelectorAll(sel).length;
    let ifr = 0, ifv = 0, ifc = 0;
    document.querySelectorAll('iframe').forEach(f => { try { ifv += f.contentDocument.querySelectorAll('video').length; ifc += f.contentDocument.querySelectorAll('canvas').length; } catch (e) {} });
    return { video: c('video'), playing: [...document.querySelectorAll('video')].filter(v => !v.paused).length, img: c('img'), canvas: c('canvas'), iframe: c('iframe'), iframeCanvas: ifc, audio: c('audio'),
      overlay: c('[class*="overlay"]'), assets: window.MimiAssets ? window.MimiAssets.stats() : null, pm: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; })())`));
  const r = { cyc, tag, heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(1), nodes: g('Nodes'), listeners: g('JSEventListeners'), docs: g('Documents'), frames: g('Frames'), ...d };
  rows.push(r); console.log(JSON.stringify(r));
}
await sample('start', 0);
for (let c = 1; c <= N; c++) {
  await page.eval(`(goLobby(), 1)`); await sleep(3000); await sample('lobby', c);
  await page.eval(`(startBattle('polka'), 1)`); await sleep(6000); await sample('battle', c);
  await page.eval(`(showRewardCgViewer('polka'), 1)`); await sleep(5000); await sample('cg', c);
  await page.eval(`(() => { for (let i = 0; i < 6; i++) { const o = document.querySelector('.reward-cg-viewer-overlay'); if (o) o.click(); } document.querySelectorAll('.reward-cg-viewer-overlay').forEach(e => e.remove()); return 1; })()`); await sleep(800);
  await page.eval(`(showPanyuClicker(5, () => null, {}), 1)`); await sleep(7000); await sample('panyu', c);
  await page.eval(`(() => { const q = document.querySelector('.pv2-quit'); if (q) q.click(); return 1; })()`); await sleep(1500);
  await page.eval(`(goLobby(), 1)`); await sleep(3000); await sample('lobby-after', c);
}
console.log('errors', JSON.stringify(await page.eval('JSON.stringify(window.__QA.errors.slice(0,5))')));
await s.close(); process.exit(0);
