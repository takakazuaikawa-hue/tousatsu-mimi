// リコの「おすすめ」の言葉が、払う額が出た後も「タダで次の札を見よう」のまま残らないことを確かめる（2026-11-17）。node qa/reading-ricoadvice.mjs
// 1) 賭けが無い局面で8秒待つ → 「タダで次の札を見よう」 2) 相手が賭けた（払う額が出た）→ 言葉が消える 3) 8秒後 → 払う額に合った言葉（コール／フォールドのおすすめ）
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const T = await open('polka', { W: 844, H: 390 });
const { ev, log, close } = T;
await ev(`
  const R = { T: 10, J: 11, Q: 12, K: 13, A: 14 }, SU = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const C = (t) => { const r = R[t[0]] || +t[0]; return { rank: r, suit: SU[t[1]], label: ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r) }; };
  state.playerHand = [C('Ts'), C('8d')]; state.opponentHand = [C('Kc'), C('3d')]; state.community = ['Ac','Th','7c','4h','2d'].map(C); state.handPhase = 'river';
  state.pot = 600; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.isPlayerTurn = true; state.psychPending = false; state.pendingRead = null; state.ricoAdvice = ''; state.__turnKey = null; state.__suggestLine = null;
  render(); return 1;`);
await sleep(9000);
log('1) 賭け無し・8秒後', await ev(`return state.ricoAdvice`));
await ev(`state.currentBetOpponent = 400; state.pot = 1000; render(); return 1;`);
await sleep(600);
log('2) 相手が400賭けた直後', JSON.stringify(await ev(`return state.ricoAdvice`)));
await sleep(8500);
log('3) 8秒後', await ev(`return state.ricoAdvice`));
await close();
process.exit(0);
