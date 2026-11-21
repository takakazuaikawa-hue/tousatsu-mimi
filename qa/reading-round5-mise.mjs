// 見せ合いっこ：ミミがリバーでポットの3分の2を賭けた時、ポルカの AI の判断にかかわらず出せる配りの割合（plan が作れる割合）を数える（2026-11-17）
import { openSession, sleep } from './lib/session.mjs';
const N = +(process.argv[2] || 4000);
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 77, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 800 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && !!window.RD && !!RD.plan.mise').catch(() => false)); i++) await sleep(500);
await sleep(800);
const r = JSON.parse(await page.eval(`(() => {
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  const polka = { ...OPPONENTS.polka.profile, style: 'polka_drunk' };
  const o = { n: 0, ok: 0, foldNow: 0, okFold: 0, ans: {}, ahead: { win: 0, lose: 0 } };
  for (let h = 0; h < ${N}; h++) {
    const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), board = d.slice(4, 9); o.n++;
    const pot = 600, mb = 400;
    const T = { board: board.map(rb), mine: mine.map(rb), her: her.map(rb), toCall: mb, pot: pot + mb };
    const sc = RD.plan.mise(T, { charKey: 'polka', pot0: pot, bet: mb });
    const c2 = { handStrength: handStrength01([...her, ...board]), toCall: mb, boardDanger: evaluateBoardDanger(board), canCheck: false, hole: her, board, pot: pot + mb, potBeforeBet: pot, playerShoves: 0, playerAllIn: false, playerCalls: 0, playerFolds: 0, handNo: 5 };
    const a = decideOpponentAction(polka, c2, {}); const fold = a.type === 'fold'; if (fold) o.foldNow++;
    if (sc) { o.ok++; if (fold) o.okFold++; const k = ['左', '右', '見せない'][sc.ans]; o.ans[k] = (o.ans[k] || 0) + 1; }
  }
  return JSON.stringify(o); })()`));
console.log(JSON.stringify(r));
console.log(`配り ${r.n}：出せる ${r.ok}（${(r.ok / r.n * 100).toFixed(2)}%）／うち AI が降りると決めた ${r.okFold}（今まで出せた分は降りる ${r.foldNow} 手のうち ${(r.okFold / r.foldNow * 100).toFixed(2)}%）／答え ${JSON.stringify(r.ans)}`);
await s.close(); process.exit(0);
