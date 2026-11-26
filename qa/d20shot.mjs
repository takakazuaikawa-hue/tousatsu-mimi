// D20 の確かめ：ホームの次の目標と、勝った後の結果の次の目標。node qa/d20shot.mjs [pc|phone]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const size = { pc: [1280, 800], phone: [844, 390] }[mode];
const OUT = `qa/out/d20`; fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await ev(`save.coins = 380; save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka']; save.rewardCgSeen = ['rico_tutorial','polka']; save.episodesSeen = ['rico_tutorial','polka']; save.homeStageSeen = 2; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.ownedItems = ['cgset_morning','panyu_sense_lv2','skin_blue_silver_card','note_pot_odds','chips_plus_500','pwear_pajama','pwear_vintage','outfit_rico_pajama','outfit_rico_casual','cgset_bath','bgm_lobby_jazz','table_emerald','chip_skin_ivory','mimi_skin_pink']; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(5000);
console.log('goal', await page.eval(`JSON.stringify(shopCoinGoal() && { r: shopCoinGoal().ready, i: shopCoinGoal().item && shopCoinGoal().item.name, n: shopCoinGoal().need })`));
await page.screenshot(`${OUT}/${mode}_home.png`);
await ev(`save.coins = 2000; refreshHomeStatus()`); await sleep(600);
await page.screenshot(`${OUT}/${mode}_home_ready.png`);
console.log('css', await page.eval(`(() => { const g = document.querySelector('.h15-goal'); if (!g) return 'none'; const c = getComputedStyle(g), b = g.querySelector('b'); const r = g.getBoundingClientRect(); return JSON.stringify({ bg: c.backgroundImage.slice(0, 60), bgc: c.backgroundColor, op: c.opacity, fs: c.fontSize, col: c.color, bcol: b && getComputedStyle(b).color, bop: b && getComputedStyle(b).opacity, r: [r.left, r.top, r.width, r.height].map(Math.round), parent: g.parentElement.className, filt: c.filter, mix: c.mixBlendMode }); })()`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
