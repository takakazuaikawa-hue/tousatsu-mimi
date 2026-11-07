// ホームの部品の見え方を、立体と揺れあり／なしで撮り比べる（粗さの原因を確かめる）
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = [1600, 1000];
const session = await openSession({ width: w, height: h, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.clearedStages = ['rico_tutorial','polka']; state.screen = 'lobby'; render(); return 1; })()`);
await sleep(9000);
await page.screenshot(process.argv[2] + '_a.png');
await page.eval(`(() => { const s = document.createElement('style'); s.textContent = '.h15-sw,.h15-en{animation:none!important;transform:none!important}.h15-part.h15-d3{transform:translate(var(--dx,0px),var(--dy,0px))!important}.h15-ui,.h15-places,.h15-top{transform-style:flat!important}'; document.head.appendChild(s); return 1; })()`);
await sleep(1500);
await page.screenshot(process.argv[2] + '_b.png');
await session.close();
