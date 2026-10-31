// 交換所の「カットイン・古典派／ネオン」の品の絵：本物のカットインをその見た目で撮って切り出す（買う前に本当の見た目が分かるように）。
// node qa/cutinshot.mjs  → qa/out/cutin_<種類>.png（相手のカットインを出した瞬間の卓）
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
for (const skin of ['default', 'classic', 'neon']) {
  const s = await openSession({ width: 1280, height: 800, speed: 1, seed: 2, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, coins: 500, equippedCutin: skin, ownedItems: ['cutin_classic', 'cutin_neon'] } });
  const { page } = s;
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  await page.eval(`startBattle('velvet'); true`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(800); }
  await page.eval(`(() => { document.body.dataset.cutinSkin = ${JSON.stringify(skin)}; showOpponentCutIn('ぜーんぶ賭けるの。ついてこれる？', 'allin'); return 1; })()`);
  await sleep(700);
  await page.screenshot(path.resolve(`qa/out/cutin_${skin}.png`));
  console.log('撮った', skin);
  await s.close();
}
process.exit(0);
