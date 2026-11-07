// ぱにゅぱにゅの構図違い：開くたびに構図が替わり、網目の絵と待ちの絵が同じ構図か。node qa/panyupose.mjs [WxH] [回数]   出力 qa/out/panyupose/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '1280x800', N = +(process.argv[3] || 4); const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/panyupose'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, homeStageSeen: 3, coins: 3000, loginBonus: { lastDate: '2099-01-01', streak: 1 } } });
const { page } = s;
const errs = [];
for (let k = 0; k < N; k++) {
  await page.eval(`(()=>{document.querySelectorAll('.panyu-clicker-overlay').forEach(o=>o.remove()); window.__pe=[]; showPanyuClicker(30, ()=>{}, { lobby: true }); return 1;})()`);
  await sleep(300);
  const early = await page.eval(`(()=>{const o=document.querySelector('.panyu-clicker-overlay');return JSON.stringify({bg:(o.querySelector('.panyu-bg-char')||{}).getAttribute('src'), frame:(o.querySelector('.pv2-mesh')||{}).getAttribute('src'), balls:getComputedStyle(o.querySelector('.panyu-clicker-pair')).visibility})})()`);
  await sleep(6000);
  const late = await page.eval(`JSON.stringify({mesh:!!document.querySelector('.panyu-clicker-overlay.is-mesh')})`);
  console.log(k + 1, early, late);
  await page.screenshot(path.join(OUT, `${size}_${k + 1}.png`));
}
await s.close(); process.exit(0);
