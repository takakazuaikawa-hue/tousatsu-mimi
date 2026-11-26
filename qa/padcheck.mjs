// ゲームパッドの選び・決定・戻るを、MimiPad（gamepad.js）の関数で確かめる。node qa/padcheck.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = 'qa/out/pad'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object" && !!window.MimiPad').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render()`);
for (let i = 0; i < 40 && !(await q(`!!document.querySelector('.home-stage .h15-costume')?.complete`)); i++) { if (i % 8 === 7) await ev('state.screen = "lobby"; render()'); await sleep(1000); }
await sleep(3000);
const cur = () => q(`(() => { const e = document.querySelector('.pad-focus'); return e ? (e.className.slice(0,40) + ' | ' + (e.innerText || e.title || '').replace(/\s+/g,' ').slice(0,30)) : 'none'; })()`);
await ev(`document.documentElement.classList.add('is-pad'); MimiPad.move(1,0)`); console.log('候補', await q('MimiPad.cands()'), '1', await cur());
for (const [dx, dy, n] of [[1,0,'右'],[1,0,'右'],[0,1,'下'],[-1,0,'左'],[0,-1,'上']]) { await ev(`MimiPad.move(${dx},${dy})`); console.log(n, await cur()); }
await page.screenshot(`${O}/lobby.png`);
await ev(`MimiPad.press()`); await sleep(2500); console.log('決定のあと', await q(`[...document.querySelectorAll('#stage > *')].map(e=>e.className.split(' ')[0]).slice(-3).join(',')`));
await page.screenshot(`${O}/after_press.png`);
await ev(`MimiPad.back()`); await sleep(1500); console.log('戻るのあと', await q(`[...document.querySelectorAll('#stage > *')].map(e=>e.className.split(' ')[0]).slice(-3).join(',')`));
await ev(`startBattle("polka")`); await sleep(9000); for (let i = 0; i < 6; i++) { await ev(`MimiPad.move(1,0)`); } console.log("卓", await cur(), "候補", await q("MimiPad.cands()")); await page.screenshot(`${O}/battle.png`);
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
