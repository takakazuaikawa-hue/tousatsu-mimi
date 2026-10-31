// 研修の3択（rico_tutorial_flop）を、研修と同じ札で出して撮る。QA_SIZE=WxH node qa/tut3shot.mjs <出力名>
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const out = process.argv[2] || 'qa/out/tut3';
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 500 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle('polka'); true`); await sleep(2500);
for (let i = 0; i < 8; i++) { await page.eval(`(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(b => /スキップする/.test(b.textContent)) || bs.find(b => /全スキップ|開始|対戦開始|はじめる/.test(b.textContent)); if (b) b.click(); document.querySelector('.coach-layer')?.click(); return true; })()`); await sleep(800); }
await page.eval(`(() => { state.playerHand=[{suit:'♥',rank:14,label:'A'},{suit:'♦',rank:13,label:'K'}]; state.community=[{suit:'♠',rank:14,label:'A'},{suit:'♦',rank:8,label:'8'},{suit:'♣',rank:3,label:'3'}]; state.handPhase='flop'; state.pot=200; state.currentBetOpponent=140; state.currentBetPlayer=0; state.introHandMode = true; state.lectureMode = false; render(); triggerPsychBattle('rico_tutorial_flop'); return true; })()`);
await sleep(3000);
await page.screenshot(path.resolve(out + '_1.png'));
console.log(await page.eval(`JSON.stringify((() => { const m = document.querySelector('.psych-modal'); if (!m) return 'none'; return { text: m.innerText.replace(/\s+/g, ' ').slice(0, 600) }; })())`));
await page.eval(`(() => { const b = document.querySelector('.choice-btn'); if (b) { b.click(); b.click(); } return true; })()`);
await sleep(2500);
await page.screenshot(path.resolve(out + '_2.png'));
console.log(await page.eval(`document.body.innerText.replace(/\s+/g, ' ').slice(0, 400)`));
await s.close(); process.exit(0);
