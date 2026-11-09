// ほろ酔いの夜の卓（酔った立ち絵・酔ったミミ）を撮る。node qa/nightbattle.mjs [相手id ...]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['polka', 'velvet'];
fs.mkdirSync('qa/out/d10', { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
for (const id of ids) {
  await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; state = defaultState(); state.screen = 'lobby'; render()`);
  await sleep(1500);
  await ev(`startBattleInternal('${id}')`);
  await sleep(5000);
  for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2500); }
  await sleep(4000);
  await page.screenshot(`qa/out/d10/night_battle_${id}.png`);
  console.log(id, await page.eval(`JSON.stringify({ horoyoi: state.horoyoi, imgs: [...document.querySelectorAll('img')].filter(i=>i.offsetParent&&/characters/.test(i.src)).map(i => i.src.split('/').pop() + ':' + i.naturalWidth), mimi: [...document.querySelectorAll('.battle-mimi-img')].map(i => i.src.split('/').pop() + ':' + i.naturalWidth) })`));
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
