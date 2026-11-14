import { openSession, sleep } from './lib/session.mjs';
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { state.screen = 'title'; render(); return true; })()`);
await sleep(2000);
console.log(await page.eval(`JSON.stringify((() => { const last = typeof __lastRenderedScreen !== 'undefined' ? __lastRenderedScreen : 'undef'; state.screen = 'shop'; render(); const w = document.querySelector('#stage > .scr-wipe'); const r = w && w.getBoundingClientRect(); const top = document.elementFromPoint(640,400); const s = w && w.querySelector('.scr-wipe-slab'); const cs = x => { const c = getComputedStyle(x); const b = x.getBoundingClientRect(); return [c.display,c.opacity,c.visibility,c.zIndex,c.position,Math.round(b.width),Math.round(b.height),c.backgroundImage.slice(0,30),c.clipPath.slice(0,40)].join('|'); }; return { w: w && cs(w), slab: s && cs(s), stage: cs(document.getElementById('stage')), app: cs(document.getElementById('app')), parent: w && w.parentElement.id }; })())`));
await session.close();
