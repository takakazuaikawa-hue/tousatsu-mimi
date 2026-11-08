// ほろ酔いの夜のホーム（夜の版の絵）を撮る。node qa/nighthome.mjs [pc|phone]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const size = { pc: [1280, 800], phone: [844, 390] }[mode];
fs.mkdirSync('qa/out/d10', { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(6000);
await page.screenshot(`qa/out/d10/${mode}_night_home.png`);
await ev(`state.homePreviewOutfit = 'rico_dress.webp'; applyHomeCostume()`); await sleep(3000);
await page.screenshot(`qa/out/d10/${mode}_night_home_dress.png`);
console.log('night', await page.eval(`JSON.stringify({ night: document.querySelector('.home-stage').classList.contains('is-night'), live: !!document.querySelector('.h15-bg canvas, canvas.home-live') })`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
