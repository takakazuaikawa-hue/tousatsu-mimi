// ほろ酔いの夜の勝負の途中の一枚絵と会話（HOROYOI_MID_SCENES）を撮る。node qa/horoyoimid.mjs [相手id]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'velvet';
fs.mkdirSync('qa/out/horoyoimid', { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
await ev(`startBattleInternal('${id}')`);
await sleep(5000);
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2500); }
// 3ハンド目の後に大きく勝った場面を作って、次の手へ進める
await ev(`state.handNo = 3; state.handStartChips = state.playerChips; state.playerChips += 400; state.opponentChips -= 400; continueAfterHand()`);
console.log('due/shown', await page.eval(`JSON.stringify({ shown: state.__hmidShown, overlay: !!document.querySelector('.story-overlay') })`));
for (let k = 0; k < 8; k++) {
  await sleep(2200);
  await page.screenshot(`qa/out/horoyoimid/${id}_${k}.png`);
  const txt = await page.eval(`(()=>{const o=document.querySelector('.story-overlay');return o?o.innerText.replace(/\\s+/g,' ').slice(0,120):'(終わり)'})()`);
  console.log(k, txt);
  if (txt === '(終わり)') break;
  await ev(`const o=document.querySelector('.story-overlay'); if(o) o.click()`);
}
console.log('state', await page.eval(`JSON.stringify({ screen: state.screen, hand: state.handNo, seen: save.horoyoiMidSeen })`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
