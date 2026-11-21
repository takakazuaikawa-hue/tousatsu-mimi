// 卓から狙撃（セリナ）とアウツさがし（グラーノ）を起動し、最初の画面と遊びの途中を撮る（2026-10-31：判定が毎回失敗していて本番の卓では出ていなかった）
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/realpool'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: 844, height: 390, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
const log = {};
for (const [who, game, o] of [
  ['selina', 'sniper', { board: C('A♣ 7♦ 2♠'), mine: C('A♦ A♥'), her: C('K♣ Q♦'), phase: 'flop', pot: 200, bet: 0, acts: [{ ph: 'flop', t: 'check' }] }],
  ['grano', 'outs', { board: C('2♥ K♥ 6♣ Q♠'), mine: C('9♥ 8♥'), her: C('K♦ 10♣'), phase: 'turn', pot: 400, bet: 120, acts: [{ ph: 'turn', t: 'bet', a: 120 }] }],
]) {
  await page.eval(`startBattle('${who}'); true`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await click('対戦開始') || await click('開始'); await sleep(900); }
  await page.eval(`(() => { const o = ${JSON.stringify(o)}; state.playerHand = o.mine; state.community = o.board; state.opponentHand = o.her; state.handPhase = o.phase; state.pot = o.pot; state.currentBetOpponent = o.bet; state.currentBetPlayer = 0; state.handActs = o.acts; state.psychPending = true; return true; })()`);
  log[game] = await page.eval(`JSON.stringify({ ok: READ_GAME_OK['${game}'](), ready: readBattleReady('logic'), pick: pickReadBattle('logic') })`);
  await page.eval(`startReadBattle('logic'); true`); await sleep(3500);
  await click('わかった'); await sleep(1500);
  await page.screenshot(path.join(OUT, `${game}_1.png`));
  log[game + '_host'] = await page.eval(`String(!!document.querySelector('.read-battle-host .mb-game-root'))`);
  await page.eval(`(() => { document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.readBattle = null; return true; })()`);
  await page.eval(`typeof backToLobby === 'function' && backToLobby(); true`).catch(() => {}); await sleep(1500);
}
console.log(JSON.stringify(log, null, 1));
await s.close(); process.exit(0);
