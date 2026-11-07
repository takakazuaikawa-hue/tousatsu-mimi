// 零時の卓で優勝した後のホーム（王者の額）を撮る。使い方: node qa/homechamp.mjs <out.png> [pc|phone] [champion]
import { openSession, sleep } from './lib/session.mjs';
const phone = process.argv[3] === 'phone';
const champ = process.argv[4] || 'mimi';
const session = await openSession(phone ? { width: 844, height: 390, speed: 1 } : { width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; save.allstarUnlocked = true; save.allstar = { unlockSeen: true, champion: ${JSON.stringify(champ)}, wins: 1 }; state.screen = 'lobby'; render(); return 1; })()`);
await sleep(8000);
await page.screenshot(process.argv[2]);
await session.close();
