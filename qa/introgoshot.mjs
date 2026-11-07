// 研修の「ここを押そう」の札が、光る穴の中に入っているかを撮る。node qa/introgoshot.mjs <WxH>
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [size = '844x390'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 500 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await page.eval(`startBattle('polka'); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(800); }
await sleep(1500);
await page.eval(`(() => { const b = document.querySelector('.verb-cc'); b.classList.add('is-intro-go'); introCoach('まずはチェック。タダで次の札を見よう', '.verb-cc', { tap: false }); return 1; })()`);
await sleep(1200);
await page.screenshot(path.resolve(`qa/out/introgo_${size}.png`));
console.log(await page.eval(`JSON.stringify((() => { const b = document.querySelector('.is-intro-go').getBoundingClientRect(), hl = document.querySelector('.coach-hole').getBoundingClientRect(); return { btnTop: Math.round(b.top), holeTop: Math.round(hl.top) }; })())`));
await s.close(); process.exit(0);
