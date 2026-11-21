// ほろ酔いの夜で勝った時の結果画面の一言（HOROYOI_CLOSE）を撮る。node qa/horoyoiclose.mjs [相手id] [aggr|fold|water]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'polka', kind = process.argv[3] || 'water';
fs.mkdirSync('qa/out/horoyoiclose', { recursive: true });
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = s;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL.slice(0, ALL.indexOf(id)))}; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
await ev(`window.__skipEpisodeOnce = true; startBattleInternal('${id}')`);
await sleep(4000);
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2000); }
await ev(`state.hAggr = ${kind === 'aggr' ? 5 : 0}; state.hFolds = ${kind === 'fold' ? 5 : 0}; state.hWater = ${kind === 'water'}; state.opponentChips = 0; endBattle()`);
await sleep(4500);
await page.screenshot(`qa/out/horoyoiclose/${id}_${kind}.png`);
console.log(await page.eval(`(document.querySelector('.result-opp-say')||{}).textContent || 'なし'`));
console.log('err', JSON.stringify(s.exceptions).slice(0, 300));
await s.close();
