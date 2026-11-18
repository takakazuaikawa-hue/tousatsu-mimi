// 泥酔の夜の公開前の確かめ（11/18）：泥酔のホームの絵・衣装替え・ぱにゃぱにゃ（ぱにゅぱにゅの衣装「泥酔」）。node qa/deisuiready.mjs [pc|phone]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'phone';
const size = { pc: [1280, 800], phone: [844, 390] }[mode];
const O = 'qa/out/deisuiready'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL)}; save.deisuiAllCleared = true; state = defaultState(); state.screen = 'lobby'; render()`);
for (let i = 0; i < 40 && !(await q(`!!document.querySelector('.home-stage .h15-costume')?.complete && !!document.querySelector('.home-stage')`)); i++) { if (i % 8 === 7) await ev('state.screen = "lobby"; render()'); await sleep(1000); }
await sleep(4000);
console.log('ready', await q('DEISUI_READY'), 'isDeisui', await q('isDeisui()'), 'bg', await q(`document.querySelector('.h15-costume')?.getAttribute('src')`), 'live', await q(`!!document.querySelector('.h15-bg canvas, canvas.home-live')`));
await page.screenshot(`${O}/${mode}_home.png`);
await ev(`state.homePreviewOutfit = 'rico_dress.webp'; applyHomeCostume()`); await sleep(3000);
console.log('衣装', await q(`document.querySelector('.h15-costume')?.getAttribute('src')`));
await page.screenshot(`${O}/${mode}_home_dress.png`);
await ev(`state.homePreviewOutfit = null; applyHomeCostume()`); await sleep(1500);
console.log('持っている衣装', await q(`panyuOwnedOutfits().map(o=>o.id).join(',')`));
await ev(`setPanyuOutfit('deisui'); showPanyuImmersive()`);
await sleep(15000);
console.log('ぱにゃ', await q(`JSON.stringify({ out: panyuOutfit(), img: document.querySelector('.panyu-bg-char')?.getAttribute('src'), frame: document.querySelector('.panyu-clicker-overlay iframe')?.getAttribute('src') })`));
await page.screenshot(`${O}/${mode}_panya.png`);
console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
await session.close();
