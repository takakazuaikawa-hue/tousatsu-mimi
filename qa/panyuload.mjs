// ぱにゅぱにゅを選んでから遊べるまでの重さを測る（CPU をスマホ相当に落として）
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/panyuload.mjs [cpuRate=4]
import { openSession, sleep } from './lib/session.mjs';

const rate = +(process.argv[2] || 4);
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`);
await sleep(6000);
await page.send('Emulation.setCPUThrottlingRate', { rate });
await page.eval(`(() => {
  window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  window.__t0 = performance.now(); window.__marks = {};
  window.addEventListener('message', ev => { const d = ev.data || {}; if (d.panyu && !window.__marks[d.t]) window.__marks[d.t] = Math.round(performance.now() - window.__t0); });
  const b = document.querySelector('[data-action="panyu-free"]'); b.click(); return true; })()`);
let r = null;
for (let i = 0; i < 60; i++) {
  await sleep(500);
  r = await page.eval(`JSON.stringify({ t: Math.round(performance.now() - window.__t0), overlay: !!document.querySelector('.panyu-clicker-overlay'), mesh: !!document.querySelector('.panyu-clicker-overlay.is-mesh'), marks: window.__marks })`).then(JSON.parse);
  if (r.mesh && r.marks.ready) break;
}
const res = await page.eval(`JSON.stringify(performance.getEntriesByType('resource').filter(e => e.startTime > window.__t0).map(e => [e.name.replace(location.origin + '/', ''), Math.round(e.transferSize / 1024) + 'KB', Math.round(e.startTime - window.__t0), Math.round(e.duration)]))`);
const fr = await page.eval(`(() => { const f = document.querySelector('.panyu-clicker-overlay iframe'); try { return JSON.stringify(f.contentWindow.performance.getEntriesByType('resource').map(e => [e.name.split('/').pop(), Math.round(e.transferSize / 1024) + 'KB', Math.round(e.duration)])); } catch (e) { return 'no-iframe ' + e.message; } })()`);
const lt = await page.eval(`JSON.stringify(window.__lt.filter(x => x[0] > window.__t0))`);
console.log('result', JSON.stringify(r));
console.log('resources', res);
console.log('iframe', fr);
console.log('longtasks', lt);
await session.close();
