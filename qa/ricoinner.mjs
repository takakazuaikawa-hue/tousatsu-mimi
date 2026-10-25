// 本気のリコ戦の左下の欄（ミミの顔と心の声）を撮る。QA_SIZE=844x390 node qa/ricoinner.mjs   出力 qa/out/ricoinner/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OUT = `qa/out/ricoinner/${w}x${h}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: w, height: h, mobile: w < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 500 } });
const { page } = session;
const shot = async (name) => { await page.screenshot(`${OUT}/${name}.png`); const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
  console.log(name, ['tiny', 'wrap', 'orphan', 'overflowBox', 'off'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k])).join(' ') || '問題なし');
  console.log('  欄', await page.eval(`(() => { const r = document.querySelector('.v2-com-rico'); if (!r) return '-'; const b = r.getBoundingClientRect(); return [r.classList.contains('is-mimi-voice'), r.querySelector('img').getAttribute('src'), JSON.stringify(r.querySelector('.v2-rico-bubble').textContent), [b.left, b.top, b.right, b.bottom].map(Math.round).join(','), getComputedStyle(r).display].join(' | '); })()`)); };
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`window.__ricoSeriousMode = true; startBattle('rico_tutorial'); true`); await sleep(2500);
  for (let i = 0; i < 20 && !(await page.eval('(state.playerHand || []).length === 2 && (state.deck || []).length > 10')); i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /開始|対戦開始/.test(b.textContent)); b && b.click(); return 1; })()`); await sleep(900); }
  await sleep(2500); await shot('1_hand');
  await page.eval(`(() => { while ((state.community || []).length < 3) state.community.push(state.deck.pop()); state.handPhase = 'flop'; state.currentBetOpponent = (state.currentBetPlayer || 0) + 120; state.mimiThought = '「リコ先輩が120ベット……どう出る？」' + String.fromCharCode(10) + mimiAssess([...state.playerHand, ...state.community], state.community, 120, state.pot); state.isPlayerTurn = true; render(); return 1; })()`);
  await sleep(1500); await shot('2_facing');
} finally { await session.close(); }
