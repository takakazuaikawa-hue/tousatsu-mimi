// 勝利の結果画面の「解放」の札（交換所の新入荷）を撮る。node qa/winunlock.mjs <WxH> <出力.png> [相手]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [size = '1280x800', out = 'qa/out/winunlock.png', opp = 'polka'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 500 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(800); }
await page.eval(`(() => { state.handNumber = 8; state.playerChips = 4000; state.opponentChips = 0; endBattle(); return 1; })()`);
await sleep(7000);
await page.screenshot(path.resolve(out));
console.log(await page.eval(`JSON.stringify((() => { const c = document.querySelector('.result-unlock'); if (!c) return 'none'; const r = c.getBoundingClientRect(); const b = [...document.querySelectorAll('[data-bind="resultButtons"] button')].map(x => { const q = x.getBoundingClientRect(); return [x.innerText.replace(/\s+/g, ''), Math.round(q.top), Math.round(q.bottom)]; }); return { card: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], text: c.innerText.replace(/\s+/g, ' '), btns: b, vh: innerHeight }; })())`));
await s.close(); process.exit(0);
