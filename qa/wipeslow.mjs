import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/wipeshot');
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
await page.eval(`(() => { const st = document.createElement('style'); st.textContent = '#stage > .scr-wipe{animation-duration:7.8s!important}.scr-wipe-move{animation-duration:6.2s!important;animation-delay:.6s!important}#app.scr-enter > .screen{animation-duration:7s!important}'; document.head.appendChild(st); state.screen = 'title'; render(); return true; })()`);
await sleep(1500);
await page.eval(`(() => { const st0 = window.setTimeout; window.setTimeout = (f, ms, ...a) => st0(f, ms === 1200 ? 60000 : ms, ...a); state.screen = 'shop'; render(); window.setTimeout = st0; return true; })()`);
for (const t of [1, 2, 3, 4]) { await sleep(t === 1 ? 10 : 1400); await page.screenshot(path.join(OUT, `slow_${t}.png`)); }
await session.close();
