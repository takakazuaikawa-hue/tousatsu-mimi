// 見つめ合い（本当の手）の通し：読みを預けて卓へ → 降りる → 手の結果 → 次へ → 答え合わせが出るか。QA_SIZE=WxH node qa/stareflow.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/stareflow', { recursive: true });
const session = await openSession({ width: w, height: h, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 500 } });
const { page } = session;
const click = (re) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).find(b => ${re}.test(b.textContent)); if (b) { b.click(); return b.textContent.trim().slice(0, 30); } return ''; })()`);
let n = 0; const shot = async (name) => { n++; await page.screenshot(`qa/out/stareflow/${String(n).padStart(2, '0')}_${name}.png`); };
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`startBattle('polka'); true`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await click('/開始|対戦開始/'); await sleep(900); }
  await page.eval(`(() => { if ((state.community || []).length < 3) { state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()]; state.handPhase = 'flop'; } state.currentBetOpponent = (state.currentBetPlayer || 0) + 100; render(); READ_BATTLE_POOLS.polka.psych = ['stare']; state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(4000);
  for (const re of ['/わかった/', '/もう一度/', '/もう一度/', '/ブラフと読む|本物と読む|ここでやめる/', '/ブラフと読む/', '/確信/', '/卓にもどる/']) { const t = await click(re); console.log('押した', re, '→', t); await sleep(t ? 2200 : 500); }
  await shot('back_to_table');
  console.log('預かった読み', await page.eval(`JSON.stringify(state.pendingRead && { pick: state.pendingRead.pick, truth: state.pendingRead.truth, mimiEq: state.pendingRead.mimiEq, mult: state.pendingRead.mult })`));
  console.log('ミミの一言', await page.eval(`state.mimiThought + ' / ' + state.ricoAdvice`));
  await page.eval(`state.isPlayerTurn = true; playerFold(); true`); await sleep(3000);
  await shot('hand_result');
  const t2 = await click('/次のハンド|次へ|つぎへ/'); console.log('結果の札で押した', t2); await sleep(5000);
  await shot('verdict');
  console.log('答え合わせの画面', await page.eval(`!!document.querySelector('.read-battle-host .vd-wrap')`));
  await sleep(2500); await shot('verdict_result');
  const t3 = await click('/^次へ$/'); console.log('答え合わせで押した', t3); await sleep(2500);
  await shot('next_hand');
  console.log('記録', await page.eval(`JSON.stringify(save.readRecord)`), '手の番号', await page.eval('state.handNo'));
} finally { await session.close(); }
