// 初回は、成り立った最初の機会に必ず出す（Codex 指摘9・2026-11-17）。node qa/reading-fix6-first.mjs
//  出る見込みの乱数を全部「出ない側」（rand=0.99）に固定して、
//   お手本を見ていない（save.rdDemo に印が無い）なら、目利き・異議あり（「作れる」が正解の場）・見せ合いっこ（見せないが正解の場）が出ること
//   お手本を見た後（印あり）なら、同じ場面で出ないこと（＝乱数が効く）を確かめる。
import { open, cardsJs } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const out = [];
const reset = (T) => T.ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.readBattle = null; state.psychPending = false; battleGen++; return 1;`);
async function trial(T, label, setup, trigger, game) {
  const res = {};
  for (const demoSeen of [false, true]) {
    await reset(T);
    await T.ev(`save.rdDemo = ${demoSeen ? `{ ${game}: true }` : '{}'}; ${setup} window.__qr = rand; rand = () => 0.99; ${trigger} return 1;`);
    const appeared = await T.waitFor(`!!document.querySelector('.rd-host')`, 6000);
    await T.ev('rand = window.__qr; if (window.__decOrig) decideOpponentAction = window.__decOrig; return 1;');
    res[demoSeen ? '印あり' : '初回'] = appeared;
    await reset(T); await sleep(300);
  }
  out.push({ label, ...res });
  console.log(`${label}：初回（印なし）→ ${res['初回'] ? '出た' : '出ない'}／お手本を見た後（印あり）→ ${res['印あり'] ? '出た' : '出ない'}`);
}
// 目利き（グラーノ・一周目）
{
  const T = await open('grano', { speed: 3, save: {} });
  try {
    await trial(T, '目利き（グラーノ）', `${cardsJs} state.handNo += 1; state.playerHand = CS('8c 7d'); state.opponentHand = CS('As Kd'); state.community = CS('Qc Jh Ts 9d'); state.deck = CS('2c'); state.handPhase = 'turn'; state.pot = 400; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.pendingRead = null; state.readHandNo = -1; state.rdCount = {}; state.rdOpen = null; state.isPlayerTurn = false; state.handActs = []; render();`, 'advanceAfterCall();', 'mekiki');
  } finally { await T.close(); }
}
// 異議あり（ポルカ・一周目）：作れるフラッシュ（「作れる」が正解）
{
  const T = await open('polka', { speed: 3, save: {} });
  try {
    await trial(T, '異議あり（ポルカ）', `${cardsJs} state.handNo += 1; state.playerHand = CS('As 8c'); state.opponentHand = CS('Kh Qh'); state.community = CS('Ah 9h 6h 3c 2d'); state.handPhase = 'river'; state.deck = []; state.pot = 600; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = 1500; state.opponentChips = 1500; state.pendingRead = null; state.readHandNo = -1; state.rdCount = {}; state.rdOpen = null; state.rdShown = null; state.psychResolved = false; state.isPlayerTurn = false; state.handActs = []; render(); if (!window.__decOrig) window.__decOrig = decideOpponentAction; decideOpponentAction = () => ({ type: 'bet', size: 'pot_2_3', intent: 'value', eq: 0.8 });`, 'opponentTurnDecide();', 'igi');
  } finally { await T.close(); }
}
// 見せ合いっこ（ほろ酔いのポルカ）：見せないが正解の場を探して使う
{
  const T = await open('polka', { night: 'horoyoi', speed: 3, save: {} });
  try {
    const f = JSON.parse(await T.ev(`
      const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
      for (let n = 0; n < 300000; n++) {
        const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
        const sc = RD.plan.mise({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'polka', pot0: 600, bet: 400 });
        if (!sc || sc.ans !== 2) continue;
        const lab = (c) => ({ rank: c.rank, suit: c.suit });
        window.__mise = { mine: mine.map(lab), her: her.map(lab), b5: b5.map(lab) };
        return JSON.stringify({ n });
      }
      return 'null';`));
    console.log('見せないが正解の場', JSON.stringify(f));
    await trial(T, '見せ合いっこ（ほろ酔いポルカ・見せないが正解）', `const M = window.__mise; const fix = (a) => a.map(c => ({ rank: c.rank, suit: c.suit, label: ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[c.rank] || String(c.rank) })); state.handNo += 1; state.playerHand = fix(M.mine); state.opponentHand = fix(M.her); state.community = fix(M.b5); state.handPhase = 'river'; state.pot = 1000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.playerChips = 1500; state.opponentChips = 1500; state.pendingRead = null; state.readHandNo = -1; state.rdCount = {}; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdForce = null; state.psychResolved = false; state.isPlayerTurn = false; state.handActs = []; render(); window.__decOrig = window.__decOrig || decideOpponentAction; decideOpponentAction = () => ({ type: 'fold', intent: 'fear' });`, 'opponentTurnDecide();', 'mise');
  } finally { await T.close(); }
}
console.log(JSON.stringify(out));
process.exit(0);
