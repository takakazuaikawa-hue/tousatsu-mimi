// 本編のぱにゅぱにゅ（網目＋ばねの埋め込み）を開き、胸を押して数が減るか・留めが外れるか・衣装の切り替えまでを撮る。
// node qa/panyushot.mjs [width height] [out]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/panyu'] = process.argv.slice(2);
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 768 || +H < 500, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, coins: 500 } });
for (let i = 0; i < 30; i++) { await sleep(1000); if (await page.eval(`typeof showPanyuClicker === 'function'`)) break; }
await sleep(1500);
await page.eval(`(() => { showPanyuClicker(30, () => ({ reward: 10, left: 3, mul: 1 }), { lobby: true }); return true; })()`);
const st = () => page.eval(`JSON.stringify({ mesh: document.querySelector('.pv2').classList.contains('is-mesh'), frame: !!document.querySelector('.pv2-mesh'), n: (document.querySelector('.pv2-meter-n') || {}).textContent, outfit: (document.querySelector('.pv2-outfit b') || {}).textContent })`);
for (let i = 0; i < 20; i++) { await sleep(1000); if (JSON.parse(await st()).mesh) break; }
console.log('開いた', await st());
await page.screenshot(path.resolve(`${out}_open.png`));
// iframe の中の胸・留めを押す（本物と同じ pointerdown/up）
const tapIn = (k) => page.eval(`(() => {
  const w = document.querySelector('.pv2-mesh').contentWindow, D = w.__panyuDbg;
  let s = 1;
  const V = D.view(), ox = V.ox, oy = V.oy; s = V.s;
  const k = ${k}, b = k >= 0 ? D.parts[k] : null;
  const p = k < 0 ? [D.cups[0][0], D.cups[0][1] + 20] : (b.c || [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2]);
  const el = w.document.getElementById('stage'), q = [ox + p[0] * s, oy + p[1] * s];
  el.dispatchEvent(new w.PointerEvent('pointerdown', { clientX: q[0], clientY: q[1], pointerId: 90, bubbles: true }));
  el.dispatchEvent(new w.PointerEvent('pointerup', { clientX: q[0], clientY: q[1], pointerId: 90, bubbles: true }));
  return true; })()`);
for (let i = 0; i < 5; i++) { await tapIn(-1); await sleep(150); }
console.log('胸を5回', await st());
for (let k = 0; k < 3; k++) { await tapIn(k); await sleep(500); }
await sleep(2500);
console.log('留めを3つ', await st());
await page.screenshot(path.resolve(`${out}_popped.png`));
await page.eval(`(() => { document.querySelector('.pv2-outfit').click(); return true; })()`);
for (let i = 0; i < 20; i++) { await sleep(1000); if (JSON.parse(await st()).mesh) break; }
console.log('衣装を替えた', await st());
await page.screenshot(path.resolve(`${out}_outfit.png`));
console.log(await page.eval(`JSON.stringify({ errors: (window.__QA && window.__QA.errors || []).slice(0, 3) })`));
await close();
