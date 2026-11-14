// 異議あり（本当の手）の通し：ウソを見つける → 読む → 自信 → 預けて卓へ → 降りる → 答え合わせ。
// QA_SIZE=WxH QA_CARDS=3|4|5 node qa/ojflow.mjs   出力 qa/out/ojflow/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const nb = +(process.env.QA_CARDS || 4);
const OUT = `qa/out/ojflow/${w}x${h}_${nb}${process.env.QA_TRUTH ? '_' + process.env.QA_TRUTH : ''}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: w, height: h, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 500 } });
const { page } = session;
const click = (re) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).find(b => ${re}.test(b.textContent)); if (b) { b.click(); return b.textContent.trim().slice(0, 30); } return ''; })()`);
let n = 0; const shot = async (name) => { n++; await page.screenshot(`${OUT}/${String(n).padStart(2, '0')}_${name}.png`); const r0 = await page.eval(STD); const c = typeof r0 === "string" ? JSON.parse(r0) : r0; const bad = ['tiny', 'wrap', 'orphan', 'overflowBox', 'off'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k])); const ov = await page.eval(`(() => { const e = document.querySelector('#mb-oj-evs'), q = document.querySelector('#mb-oj-says'); const f = (x) => x && x.scrollHeight > x.clientHeight + 1 ? x.id + ' ' + x.scrollHeight + '>' + x.clientHeight : ''; const g = [...document.querySelectorAll('.oj-say, .oj-ev, .oj-found')].filter(x => { const r = x.getBoundingClientRect(); return [...x.querySelectorAll('p, .oj-log')].some(c => c.getBoundingClientRect().bottom > r.bottom + 1); }).map(x => '板の中 ' + (x.textContent || '').slice(0, 14)); return [f(e), f(q), ...g].filter(Boolean).join(' '); })()`); console.log(name, bad.join(' ') || '問題なし', ov ? 'はみ出し ' + ov : ''); };
const tap = (sel) => page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`startBattle('velvet'); true`); await sleep(2500);
  // 対戦が始まって手札が配られるまで「開始」を押す（小さい画面では1回目が効かないことがある）
  for (let i = 0; i < 20 && !(await page.eval('(state.playerHand || []).length === 2 && (state.deck || []).length > 10')); i++) { await click('/開始|対戦開始/'); await sleep(900); }
  if (!(await page.eval('(state.playerHand || []).length === 2'))) throw new Error('対戦が始まらなかった');
  await page.eval(`(() => { while ((state.community || []).length < ${nb}) state.community.push(state.deck.pop()); state.handPhase = ['flop','turn','river'][${nb} - 3];
    if (${JSON.stringify(process.env.QA_TRUTH || '')} === 'strong') { const b = state.community, me = evaluateHand([...state.playerHand, ...b]).score; for (let k = 0; k < 600; k++) { const i = Math.floor(Math.random() * state.deck.length), j = Math.floor(Math.random() * state.deck.length); if (i === j) continue; const h = [state.deck[i], state.deck[j]]; if (evaluateHand([...h, ...b]).rank >= 2 && evaluateHand([...h, ...b]).score > me) { state.deck = state.deck.filter((c, x) => x !== i && x !== j).concat(state.opponentHand); state.opponentHand = h; break; } } }
    state.handActs = [{ ph: 'flop', t: 'check', a: 0, p: 100 }, ...(${nb} >= 4 ? [{ ph: 'turn', t: ${nb} === 4 ? "'bet'" : "'call'", a: 100, p: 100 }] : []), ...(${nb} === 5 ? [{ ph: 'river', t: 'bet', a: 300, p: 300 }] : [])].map(a => ({ ...a, t: a.t.replace(/'/g, '') }));
    state.currentBetOpponent = (state.currentBetPlayer || 0) + 150; render(); READ_BATTLE_POOLS.velvet.psych = ['objection']; state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(4000);
  await shot('rules'); await click('/わかった/'); await sleep(1200);
  if (process.env.QA_BREAK) await page.eval("(() => { const p = document.querySelector('.oj-say p'); p.parentElement.style.flex = '1 1 0'; p.textContent = '「わざと長くした発言。わざと長くした発言。わざと長くした発言。わざと長くした発言」'; return true; })()");
  await shot('start');
  for (const e of ['log', 'mine', 'wit']) {
    await tap('.oj-say[data-i="0"]'); await sleep(300); await tap(`.oj-ev[data-e="${e}"]`); await sleep(600);
    await shot('pick_' + e);
    await click('/つきつける/'); await sleep(1300);
    if (await page.eval(`!!document.querySelector('.oj-say.is-lie')`)) { await shot('slam'); await sleep(1800); break; }
    await sleep(1200);
  }
  await shot('read');
  await click(process.env.QA_TRUTH === 'strong' ? '/本物と読む/' : '/ブラフと読む/'); await sleep(1200); await shot('wager');
  await click('/確信/'); await sleep(1500); await shot('entrust');
  await click('/卓にもどる/'); await sleep(2500); await shot('table');
  console.log('預かった読み', await page.eval(`JSON.stringify(state.pendingRead && { pick: state.pendingRead.pick, truth: state.pendingRead.truth, mimiEq: state.pendingRead.mimiEq, notes: state.pendingRead.notes })`));
  await page.eval(`state.isPlayerTurn = true; playerFold(); true`); await sleep(3000);
  await click('/次のハンド|次へ|つぎへ/'); await sleep(5000); await shot('verdict'); await sleep(2500); await shot('verdict_result');
} finally { await session.close(); }
