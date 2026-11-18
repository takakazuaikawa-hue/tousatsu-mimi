// 夜に入る時の年齢と配信の注意（11/18）を撮る。node qa/agegate.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = 'qa/out/agegate'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = false; save.horoyoiCleared = ${JSON.stringify(ALL)}; state = defaultState(); state.screen = 'lobby'; render()`);
for (let i = 0; i < 40 && !(await q(`!!document.querySelector('.home-stage .h15-night')`)); i++) { if (i % 8 === 7) await ev('state.screen = "lobby"; render()'); await sleep(1000); }
console.log('月', await q(`!!document.querySelector('.h15-night')`));
await ev(`document.querySelector('.h15-night')?.click()`); await sleep(2000);
console.log('札', await q(`!!document.querySelector('[data-act="night-h"]')`));
await ev(`document.querySelector('[data-act="night-h"]')?.click()`); await sleep(1200);
console.log('窓', await q(`document.querySelector('.mimi-confirm')?.innerText.replace(/\s+/g,' ')`));
await page.screenshot(`${O}/gate.png`);
await ev(`document.querySelector('.mimi-confirm-cancel')?.click()`); await sleep(600);
console.log('やめた後', await q('save.horoyoiMode'));
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
