// ファイブポーカー：勝つまで配り直してダブルアップの画面を撮り、切れ・もぐりを数える。node qa/mpdouble.mjs [WxH]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '844x390'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/mpdouble'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, probes: ['cliptext.js'], save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(() => 0);
const has = (sel) => page.eval(`!!document.querySelector('.minipoker-overlay ${sel}:not([disabled])')`).catch(() => false);
await ev(`state.screen = 'lobby'; render(); onAction({ currentTarget: { dataset: { action: 'play-minipoker' } } })`); await sleep(2500);
await ev(`[...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent))?.click()`); await sleep(1500);
let ok = false;
for (let h = 0; h < 40 && !ok; h++) {
  if (await has('[data-mp="deal"]')) { await ev(`document.querySelector('.minipoker-overlay [data-mp="deal"]').click()`); await sleep(2200); }
  if (await has('[data-mp="draw"]')) { await ev(`document.querySelector('.minipoker-overlay [data-mp="draw"]').click()`); await sleep(2600); }
  if (await has('[data-mp="double"]')) { await ev(`document.querySelector('.minipoker-overlay [data-mp="double"]').click()`); await sleep(1500); ok = true; break; }
  await ev(`document.querySelectorAll('.minipoker-overlay .mp-garapon button, .minipoker-overlay [data-mp="garapon"]').forEach(b => b.click())`); await sleep(400);
  if (await has('[data-mp="next"]')) { await ev(`document.querySelector('.minipoker-overlay [data-mp="next"]').click()`); await sleep(1500); }
}
await page.screenshot(path.join(OUT, `${size}.png`));
console.log('double', ok, await page.eval(`JSON.stringify(window.__clipText(document.querySelector('.minipoker-overlay')).filter(o => o.px > 4 || o.why === 'もぐり'))`));
await s.close(); process.exit(0);
