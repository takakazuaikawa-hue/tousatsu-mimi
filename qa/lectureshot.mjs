// リコ先輩の講義の最初の窓を撮る（額縁と中の地のずれ・札の位置）。node qa/lectureshot.mjs <WxH> <出力.png>
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [size = '1280x800', out = 'qa/out/lecture.png'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: [], introPlayed: true, houseRulesSeen: true, coins: 500 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle('rico_tutorial'); true`); await sleep(2500);
for (let i = 0; i < 6 && !(await page.eval(`!!document.querySelector('.lecture-bubble')`)); i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(900); }
await sleep(800);
await page.screenshot(path.resolve(out));
console.log(await page.eval(`JSON.stringify((() => { const b = document.querySelector('.lecture-bubble'), t = b && b.querySelector('.tutorial-step'); if (!b) return 'none'; const r = b.getBoundingClientRect(), q = t.getBoundingClientRect(); return { bubble: [r.left, r.top, r.width, r.height].map(Math.round), step: [q.left, q.top, q.width, q.height].map(Math.round), radius: getComputedStyle(b).borderRadius }; })())`));
await s.close(); process.exit(0);
