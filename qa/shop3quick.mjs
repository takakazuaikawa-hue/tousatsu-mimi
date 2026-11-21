// 交換所 v3 を開いてリコの衣装を選んだ所だけ撮る。使い方: node qa/shop3quick.mjs <out.png> [pc|phone]
import { openSession, sleep } from './lib/session.mjs';
const out = process.argv[2]; const mode = process.argv[3] || 'pc';
const size = { pc: [1280, 800], phone: [844, 390], se: [667, 375] }[mode];
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.coins = 3000; save.clearedStages = ['rico_tutorial','polka','selina']; save.shopSeenItems = []; state.screen = 'shop'; render(); return 1; })()`);
await sleep(mode === 'pc' ? 6000 : 3500);
await page.eval(`(() => { const c = document.querySelector('.sh3-card[data-sh3="outfit_rico_dress"]'); if (c) c.click(); return 1; })()`);
await sleep(1500);
await page.screenshot(out);
console.log('ok', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
