// おねだりの仕込み（Codex 指摘5・2026-11-17）：仕込むのは相手の手札とターンまでの場札だけ。リバーは残りの山から本当に引く。
//  node qa/reading-fix6-rig.mjs [試行数=100]
//  1) 仕込みが成り立つ割合と1回の時間  2) 仕込んだ手で、本当のリバーを引いた時に plan が作れる割合・待ちが来る割合・絞り（来ない場は30%）を通って出る割合
//  3) 1対戦で、仕込み（2〜5手目のどれかから、出るまで毎手）で何手後に出るか
import { open } from './lib/readingtable.mjs';
const N = +(process.argv[2] || 100);
const T = await open('polka', { night: 'horoyoi', save: {} });
const KEYS = ['polka', 'rico', 'selina', 'grano', 'velvet'];
const one = (key) => `
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, KEY = ${JSON.stringify(key)};
  state.opponentImgKey = KEY; state.horoyoi = true; state.seriousRicoMode = false; state.isAllstar = false;
  const cv = (c) => ({ r: c.rank, s: RB[c.suit] });
  const O = { n: ${N}, rigged: 0, ms: 0, msMax: 0, board4: 0, ok: 0, hit: 0, shown: 0, shownHit: 0, sign: {}, ans: {} };
  for (let i = 0; i < ${N}; i++) {
    state.handNo = 4; state.rdRigNo = 2; state.rdCount = {}; state.rdRigHand = null; state.deck = [];
    const t0 = performance.now(); const okRig = rdRigOnedariDeal(); const dt = performance.now() - t0; O.ms += dt; O.msMax = Math.max(O.msMax, dt);
    if (!okRig) continue; O.rigged++;
    const deck = state.deck.slice(); const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop()]; const river = deck[deck.length - 1];   // 山の末尾から場札4枚、次の1枚がリバー（切り混ぜた山の中から）
    if (board.length === 4 && river) O.board4++;
    const Tb = { board: board.map(cv), mine: state.playerHand.map(cv), her: state.opponentHand.map(cv), pot: 0 };
    const sc = RD.plan.onedari(Tb, { charKey: KEY, fin: cv(river), pot: 600, toCall: 0 });
    if (sc) { O.ok++; if (sc.hit) O.hit++; O.sign[sc.sign] = (O.sign[sc.sign] || 0) + 1; O.ans[sc.answer] = (O.ans[sc.answer] || 0) + 1; if (sc.hit || Math.random() < RD_ONEDARI_MISS_SHOW) { O.shown++; if (sc.hit) O.shownHit++; } }
  }
  O.ms = +(O.ms / ${N}).toFixed(1); O.msMax = +O.msMax.toFixed(0);
  // 1対戦：2〜5手目のどれか（rdRigNo）から、出るまで毎手仕込む
  const hist = {}; let never = 0; const M = Math.min(${N}, 100);
  for (let m = 0; m < M; m++) {
    state.rdRigNo = 2 + Math.floor(Math.random() * 4); let shownAt = 0;
    for (let h = state.rdRigNo; h <= 14; h++) {
      state.handNo = h; state.rdCount = {}; state.rdRigHand = null; state.deck = [];
      if (!rdRigOnedariDeal()) continue;
      const deck = state.deck.slice(); const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop()]; const river = deck[deck.length - 1];
      const Tb = { board: board.map(cv), mine: state.playerHand.map(cv), her: state.opponentHand.map(cv), pot: 0 };
      const sc = RD.plan.onedari(Tb, { charKey: KEY, fin: cv(river), pot: 600, toCall: 0 });
      if (sc && (sc.hit || Math.random() < RD_ONEDARI_MISS_SHOW)) { shownAt = h; break; }
    }
    if (!shownAt) never++; else { const k = shownAt - state.rdRigNo; hist[k] = (hist[k] || 0) + 1; }
  }
  return JSON.stringify({ O, hist, never, M });`;
try {
  for (const key of KEYS) {
    const r = JSON.parse(await T.ev(one(key))), O = r.O;
    const pc = (a, b) => (a / Math.max(1, b) * 100).toFixed(0) + '%';
    console.log(`${key}：仕込めた ${O.rigged}／${O.n}（1回 平均${O.ms}ms・最大${O.msMax}ms）／場札4枚の仕込み＋リバーは山から ${O.board4}／plan が作れた ${O.ok}（${pc(O.ok, O.rigged)}）うち待ちが来た ${O.hit}（${pc(O.hit, O.ok)}）／絞りを通って出た ${O.shown}（${pc(O.shown, O.rigged)}）うち来た ${O.shownHit}（${pc(O.shownHit, O.shown)}）／印 ${JSON.stringify(O.sign)}／答え ${JSON.stringify(O.ans)}`);
    console.log(`   1対戦（${r.M}回）：仕込み開始の手から何手後に出たか ${JSON.stringify(r.hist)}／14手目までに出なかった ${r.never}`);
  }
} finally { await T.close(); }
process.exit(0);
