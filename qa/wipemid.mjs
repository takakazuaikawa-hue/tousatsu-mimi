import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const phone = process.argv[2] === 'phone';
const session = await openSession({ width: phone ? 844 : 1280, height: phone ? 390 : 800, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
await page.eval(`(() => { state.screen = 'title'; render(); return true; })()`); await sleep(1200);
for (const t of [200, 380]) {
  await page.eval(`(() => { const st0 = window.setTimeout; window.setTimeout = (f, ms, ...a) => st0(f, ms === 1200 ? 60000 : ms, ...a); state.screen = state.screen === 'shop' ? 'title' : 'shop'; render(); window.setTimeout = st0; document.getAnimations().forEach(a => { const tg = a.effect && a.effect.target; if (tg && tg.closest && (tg.closest('.scr-wipe') || tg.classList.contains('screen'))) { a.pause(); a.currentTime = ${t}; } }); return true; })()`);
  await sleep(300); await page.screenshot(path.resolve(`qa/out/wipeshot/mid_${phone ? 'ph_' : ''}${t}.png`)); await sleep(1500);
}
await session.close();
