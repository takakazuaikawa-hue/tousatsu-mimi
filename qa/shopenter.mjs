// 交換所に入る瞬間をコマ撮りする（ロビーの「交換所」を押した所から）。使い方: node qa/shopenter.mjs [pc|phone] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const size = { pc: [1280, 800], phone: [844, 390] }[mode];
const OUT = path.resolve(process.argv[3] || 'qa/out/shopenter');
fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.coins = 3000; save.clearedStages = ['rico_tutorial','polka']; save.shopSeenItems = []; state.screen = 'lobby'; render(); return 1; })()`);
await sleep(8000); // ロビーで裏の先読みが進む時間
const t0 = Date.now();
await page.eval(`(() => { onAction({ currentTarget: { dataset: { action: 'open-shop' } } }); return 1; })()`);
for (const ms of [150, 450, 750, 1050, 1400, 2000]) {
  const w = ms - (Date.now() - t0); if (w > 0) await sleep(w);
  await page.screenshot(path.join(OUT, `${mode}_${String(ms).padStart(4, '0')}.png`));
}
const info = await page.eval(`JSON.stringify({ screen: state.screen, veil: !!document.querySelector('.loading-veil'), stats: window.MimiAssets && window.MimiAssets.stats() })`).catch(e => e.message);
console.log(mode, info, 'exceptions', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
