// 酔いの段（drunkTier）を確かめる：途中会話の後に2段、その4ハンド後に3段。名札のグラスと知らせを撮る。node qa/horoyoitier.mjs [相手id]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'polka';
fs.mkdirSync('qa/out/horoyoitier', { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 120));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; save.horoyoiMidSeen = ${JSON.stringify(ALL)}; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
await ev(`startBattleInternal('${id}')`);
await sleep(5000);
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2500); }
await ev(`window.__toasts=[]; new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.classList&&n.classList.contains('toast')) window.__toasts.push(n.textContent); }))).observe(document.body,{childList:true})`);
const styleNow = `JSON.stringify((()=>{const s=aiStyleOf(state.opponentProfile);return {tier:drunkTier(),bluff:+s.bluffFreq.toFixed(2),loose:+s.loose.toFixed(2),valueEq:+s.valueEq.toFixed(2),shove:+(s.shoveCall||0).toFixed(2),allin:+(s.allinFreq||0).toFixed(2),glass:document.querySelectorAll('.tug-drunk i.on').length}})())`;
console.log('段1', await q(styleNow));
await page.screenshot(`qa/out/horoyoitier/${id}_t1.png`);
await ev(`state.handNo = 3; state.handStartChips = state.playerChips; state.playerChips += 200; state.opponentChips -= 200; continueAfterHand()`);
for (let w = 0; w < 10 && !(await q(`!!document.querySelector('.story-overlay')`)); w++) await sleep(500);
console.log('会話が開いた', await q(`!!document.querySelector('.story-overlay')`));
for (let k = 0; k < 14; k++) {
  await sleep(1500);
  const open = await q(`!!document.querySelector('.story-overlay')`);
  if (!open) break;
  await ev(`const o=document.querySelector('.story-overlay'); if(o) o.click()`);
}
await sleep(1500);
console.log('told', await q('state.__tierTold'));
console.log('段2', await q(styleNow), await q(`window.__toasts.splice(0).join('|')`));
await page.screenshot(`qa/out/horoyoitier/${id}_t2.png`);
await sleep(4500);
await ev(`state.handNo = state.__hmidHand + 4; continueAfterHand()`);
await sleep(900);
await page.screenshot(`qa/out/horoyoitier/${id}_t3toast.png`);
await sleep(1300);
console.log('段3', await q(styleNow), await q(`window.__toasts.splice(0).join('|')`));
await page.screenshot(`qa/out/horoyoitier/${id}_t3.png`);
// 途中保存→再開で段が保たれるか
await ev(`saveBattleResume()`);
console.log('保存', await q(`JSON.stringify({h:save.battleResume.snap.__hmidHand, shown:save.battleResume.snap.__hmidShown, told:save.battleResume.snap.__tierTold})`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
