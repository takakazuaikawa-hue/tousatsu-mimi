// ファイブポーカーをスマホの大きさで撮る（入門を閉じてから）。node qa/mpshot.mjs [WxH]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '844x390'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/mpshot', size); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, ownedItems: ['memory_minipoker'], loginBonus: { lastDate: '2099-01-01', streak: 1 } } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(() => 0);
await ev(`state.screen = 'lobby'; render(); onAction({ currentTarget: { dataset: { action: 'play-minipoker' } } })`); await sleep(2500);
await ev(`[...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent))?.click()`); await sleep(1500);
await page.screenshot(path.join(OUT, '01_bet.png'));
const info = await page.eval(`JSON.stringify([...document.querySelectorAll('.minipoker-overlay *')].filter(e => e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY !== 'visible').map(e => e.className.toString().slice(0,40) + ' ' + e.clientHeight + '/' + e.scrollHeight))`);
console.log('scrolls', info);
await ev(`document.querySelector('.minipoker-overlay [data-mp="deal"]')?.click()`); await sleep(3500);
await page.screenshot(path.join(OUT, '02_choose.png'));
await s.close(); process.exit(0);
