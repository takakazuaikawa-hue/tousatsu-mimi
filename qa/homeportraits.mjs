// ホームの額（今夜の相手）と台帳の小さな顔の窓を、相手ごとに撮る。
// 使い方: node qa/homeportraits.mjs <outDir> [pc|phone]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const out = process.argv[2] || 'qa/out/homeportraits';
const phone = process.argv[3] === 'phone';
fs.mkdirSync(out, { recursive: true });
const session = await openSession(phone ? { width: 844, height: 390, speed: 1 } : { width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ORDER = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
for (let n = 0; n < ORDER.length; n++) {
  const cleared = ORDER.slice(0, n);
  await page.eval(`(() => { save.clearedStages = ${JSON.stringify(cleared)}; state.screen = 'title'; render(); state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(7000);
  await page.screenshot(path.join(out, `${phone ? 'phone' : 'pc'}_${n}_${ORDER[n]}.png`));
}
await session.close();
