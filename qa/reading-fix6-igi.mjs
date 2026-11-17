// 異議あり：外した時に見せた札を、相手の AI が本当に使っているかを数える（Codex 指摘4・2026-11-17）。node qa/reading-fix6-igi.mjs
// 1) decideOpponentAction に、ミミの見せた1枚（knownOpp）を渡した時と渡さない時で、払う／降りる／上乗せの割合を数える
// 2) 本物の opponentTurnDecide（state.rdShown がある手）が、equityVsRandom に見せた札を渡して呼ぶ回数を数える（無い手では0）
import { open, cardsJs } from './lib/readingtable.mjs';
const T = await open('polka', { save: {} });
try {
  const r1 = JSON.parse(await T.ev(`${cardsJs}
    const prof = OPPONENTS.polka.profile; const out = {};
    const board = CS('Kd 9c 6s 3h 2c'), hole = CS('9d 8h');
    const run = (known) => { const c = {}; for (let i = 0; i < 400; i++) {
      const ctx = { handStrength: handStrength01([...hole, ...board]), toCall: 400, boardDanger: evaluateBoardDanger(board), canCheck: false, hole, board, pot: 1000, potBeforeBet: 600, playerShoves: 0, playerAllIn: false, playerCalls: 0, playerFolds: 0, handNo: 3, knownOpp: known };
      const a = decideOpponentAction(prof, ctx, {}); c[a.type] = (c[a.type] || 0) + 1; } return c; };
    out.none = run(null); out.kingShown = run(C('Kh')); out.fourShown = run(C('4c'));
    // 相手の勝つ見込み（eq）そのもの：9のペア対「Kが1枚見えている相手」「4が1枚見えている相手」「何も見えていない相手」
    const eqOf = (k) => { let s = 0; for (let i = 0; i < 40; i++) s += equityVsRandom(hole, board, 200, k); return +(s / 40).toFixed(3); };
    out.eq = { none: eqOf(null), kingShown: eqOf(C('Kh')), fourShown: eqOf(C('4c')) };
    return JSON.stringify(out);`));
  console.log('決め打ちの場面：ポルカ 9d 8h（9のペア）／場札 Kd 9c 6s 3h 2c／ミミが400賭けた（ポット1000）');
  console.log('  払う・降りる・上乗せ（400回ずつ）');
  for (const k of ['none', 'kingShown', 'fourShown']) console.log('   ', { none: '見えていない      ', kingShown: 'ミミのKが見えた   ', fourShown: 'ミミの4が見えた   ' }[k], JSON.stringify(r1[k]));
  console.log('  相手の勝つ見込み eq', JSON.stringify(r1.eq));
  // 2) 本物の卓の流れ
  for (const shown of [true, false]) {
    const r = await T.ev(`${cardsJs}
      battleGen++; window.__known = 0; if (!window.__eqOrig) window.__eqOrig = equityVsRandom;
      equityVsRandom = (a, b, c, d) => { if (d) window.__known++; return window.__eqOrig(a, b, c, d); };
      state.playerHand = CS('Kh 8c'); state.opponentHand = CS('9d 8h'); state.community = CS('Kd 9c 6s 3h 2c'); state.handPhase = 'river'; state.deck = [];
      state.pot = 1000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.pot = 1400; state.playerChips = 2000; state.opponentChips = 2000;
      state.rdShown = ${shown ? "{ hand: state.handNo, idx: 0, game: 'igi' }" : 'null'}; state.pendingRead = null; state.readHandNo = state.handNo; state.psychPending = false; state.handActs = [];
      state.isPlayerTurn = false; opponentTurnDecide(); const k = window.__known; equityVsRandom = window.__eqOrig; return String(k);`);
    console.log(`卓の流れ（state.rdShown ${shown ? 'あり' : 'なし'}）：見せた札を渡した equityVsRandom の呼び出し ${r} 回`);
  }
} finally { await T.close(); }
process.exit(0);
