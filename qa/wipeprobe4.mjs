import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
await page.eval(`(() => { state.screen = 'title'; render(); return true; })()`); await sleep(1200);
for (const [n, js] of [['a_noLife', "w.style.animation='none'"], ['b_noMove', "w.querySelector('.scr-wipe-move').style.animation='none'"], ['c_both', ""]]) {
  const r = await page.eval(`(() => { state.screen = state.screen === 'shop' ? 'title' : 'shop'; render(); const w = document.querySelector('#stage > .scr-wipe'); ${js}; w.style.animationPlayState='paused'; w.querySelector('.scr-wipe-move').style.animationPlayState='paused'; const c = getComputedStyle(w); return [c.opacity, getComputedStyle(w.querySelector('.scr-wipe-move')).transform].join(' '); })()`);
  await sleep(300); await page.screenshot(path.resolve('qa/out/wipeshot/p4_' + n + '.png')); console.log(n, r);
  await sleep(1500);
}
await session.close();
