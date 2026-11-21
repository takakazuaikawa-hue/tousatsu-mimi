// 卓の本当の手で、容疑者しぼり（2画面・2026-10-31 作り直し）を最後まで通し、狙撃・アウツさがしが卓から出るかも確かめる。
// node qa/narrowtable.mjs [844x390]   出力: qa/out/narrowtable/*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/narrowtable'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
const errs = [];
page.on && page.on('console', (m) => { if (m.type && m.type() === 'error') errs.push(m.text()); });
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
async function enter(who) {
  await page.eval(`startBattle('${who}'); true`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await click('対戦開始') || await click('開始'); await sleep(900); }
}
async function setTable(o) {
  await page.eval(`(() => { const o = ${JSON.stringify(o)}; state.playerHand = o.mine; state.community = o.board; state.opponentHand = o.her; state.handPhase = o.phase; state.pot = o.pot; state.currentBetOpponent = o.bet; state.currentBetPlayer = 0; state.handActs = o.acts; state.psychPending = true; return true; })()`);
}
const log = {};

// 1 容疑者しぼり（セリナ・出る場面）：場札 5♣ 5♦ 6♠ A♣ Q♥、ミミ 2♦ K♠、セリナ 9♣ 6♦（6と5のツーペア＝危ない）
await enter('selina');
await setTable({ board: C('5♣ 5♦ 6♠ A♣ Q♥'), mine: C('2♦ K♠'), her: C('9♣ 6♦'), phase: 'river', pot: 300, bet: 100, acts: [{ ph: 'turn', t: 'bet', a: 50 }, { ph: 'river', t: 'bet', a: 100 }] });
log.ready = await page.eval(`JSON.stringify({ ok: READ_GAME_OK.narrow(), pick: (READ_BATTLE_POOLS.selina.logic = ['narrow'], pickReadBattle('logic')) })`);
await page.eval(`startReadBattle('logic'); true`); await sleep(3500);
await click('わかった'); await sleep(1200);
await shot('1_q1');
log.tiles = await page.eval(`JSON.stringify([...document.querySelectorAll('.nq-tile .nm')].map(e => e.textContent))`);
// 押す順：1枚目を押して、残りを押す（間違いも1回入れる）
for (let i = 0; i < 4; i++) {
  const done = await page.eval(`(() => { const b = [...document.querySelectorAll('.nq-tile')].find(b => !b.disabled); if (!b || document.querySelector('.nq-tiles.is-q2')) return true; b.click(); return false; })()`);
  await sleep(500); if (done) break;
}
await shot('2_q1done');
await sleep(1800);
await shot('3_q2');
log.her = await page.eval(`document.querySelector('.nq-her') ? document.querySelector('.nq-her').innerText : 'none'`);
await page.eval(`(() => { const b = [...document.querySelectorAll('.nq-tile')].find(b => !b.disabled && b.classList.contains('is-danger')) || [...document.querySelectorAll('.nq-tile')].find(b => !b.disabled); b && b.click(); return true; })()`);
await sleep(900);
await shot('4_wager');
await click('確信'); await sleep(1500);
await shot('5_entrust');
await click('卓にもどる'); await sleep(1500);
log.pending = await page.eval(`JSON.stringify(state.pendingRead ? { pick: state.pendingRead.pick, truth: state.pendingRead.truth, herWeak: state.pendingRead.herWeak, truthText: state.pendingRead.truthText, extra: state.pendingRead.extra } : null)`);
// 答え合わせの画面を出す
log.verdict = await page.eval(`(() => { try { if (typeof showReadVerdict === 'function') { showReadVerdict(); return 'shown'; } return 'no fn'; } catch (e) { return 'err ' + e.message; } })()`);
await sleep(4500);
await shot('6_verdict');

// 2 ユーザーの指摘の場面（セリナ）：出ない判定（三択の論理バトルになる）
await setTable({ board: C('5♥ 8♣ 7♥ 6♥ 5♣'), mine: C('3♠ 10♠'), her: C('Q♠ K♣'), phase: 'river', pot: 250, bet: 100, acts: [{ ph: 'turn', t: 'bet', a: 50 }, { ph: 'river', t: 'bet', a: 100 }] });
log.userScene = await page.eval(`String(READ_GAME_OK.narrow())`);
// 3 狙撃：相手が様子見・ミミが強い（Aのスリーカード）
await setTable({ board: C('A♣ 7♦ 2♠'), mine: C('A♦ A♥'), her: C('K♣ Q♦'), phase: 'flop', pot: 200, bet: 0, acts: [{ ph: 'flop', t: 'check' }] });
log.sniper = await page.eval(`String(READ_GAME_OK.sniper())`);
log.errs = errs;
fs.writeFileSync(path.join(OUT, `${W}x${H}_log.json`), JSON.stringify(log, null, 1));
console.log(JSON.stringify(log, null, 1));
await s.close(); process.exit(0);
