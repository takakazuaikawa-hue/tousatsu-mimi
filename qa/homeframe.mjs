// ホームの「今夜の相手」の額を撮る。使い方: node qa/homeframe.mjs <out.png> [css]
import { openSession, sleep } from './lib/session.mjs';
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.clearedStages = ['rico_tutorial','polka']; state.screen = 'lobby'; render(); const c = ${JSON.stringify(process.argv[3] || '')}; if (c) { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); } return 1; })()`);
await sleep(9000);
await page.screenshot(process.argv[2]);
await session.close();
