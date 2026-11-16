// おねだり・見せ合いっこを、本物の配り（52枚を切る）と本物の相手の打ち方（ほろ酔いの AI）で数える（2026-11-17）。node qa/reading-count-night.mjs [配り数=3000]
// おねだり：ミミ2枚・相手2枚・場札5枚を配り、「場札4枚の時点」で RD.plan.onedari が作れるか（＝出せる割合）。当たり（待ちが来る）／外れの内訳、5人それぞれの印の種類。
//   実際は「ターンの賭けまで両方が降りずに来た手」だけなので、出せる割合は配りの全部に対する上限。出す時は 外れを30%に絞り・全体で60%（game.js maybeRdOnedari）
// 見せ合いっこ：リバーでミミが半ポットを賭け、ほろ酔いのポルカの AI（decideOpponentAction）が「降りる」と決めた配りで、RD.plan.mise が作れるか。答えの内訳（左・右・見せない）
// 注意：ミミが途中で降りた手は無い（全部の配りを最後まで見る）。
import { openSession, sleep } from './lib/session.mjs';
const N = +(process.argv[2] || 3000);
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 20261117, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object" && !!window.RD && !!RD.plan.onedari && !!RD.plan.mise').catch(() => false)); i++) await sleep(500);
await sleep(800);
const CHUNK = 250;
const code = (n) => `(() => {
  const out = { deals: 0, one: {}, mise: {} };
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
  const rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  state.deisui = false; state.horoyoi = true;
  const KEYS = ['polka', 'rico', 'selina', 'grano', 'velvet'];
  const polka = { ...OPPONENTS.polka.profile, style: 'polka_drunk' };
  for (let h = 0; h < ${n}; h++) {
    const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), board5 = d.slice(4, 9);
    out.deals++;
    for (const ck of KEYS) {
      const T = { board: board5.slice(0, 4).map(rb), mine: mine.map(rb), her: her.map(rb), toCall: 0, pot: 600 };
      const sc = RD.plan.onedari(T, { charKey: ck, fin: rb(board5[4]), pot: 600 });
      if (sc) { inc(out.one, ck + ':ok'); inc(out.one, ck + ':' + (sc.hit ? 'hit' : 'miss')); inc(out.one, ck + ':sign:' + sc.sign); inc(out.one, ck + ':ans:' + sc.answer); }
    }
    // 見せ合いっこ：ミミがリバーで 1/2・2/3・ポット を賭けた時の、ほろ酔いのポルカの出方
    for (const [bn, frac] of [['半ポット', 0.5], ['3分の2', 2 / 3], ['ポット', 1]]) {
      const board = board5, pot = 600, mb = Math.floor(pot * frac);
      const M = out.mise[bn] = out.mise[bn] || { fold: 0, show: 0, noTie: 0, ok: 0, ans: {}, ahead: {} };
      const c2 = { handStrength: handStrength01([...her, ...board]), toCall: mb, boardDanger: evaluateBoardDanger(board), canCheck: false, hole: her, board, pot: pot + mb, potBeforeBet: pot, playerShoves: 0, playerAllIn: false, playerCalls: 0, playerFolds: 0, handNo: 6 };
      const a = decideOpponentAction(polka, c2, {});
      if (a.type !== 'fold') continue;
      M.fold++;
      const T = { board: board.map(rb), mine: mine.map(rb), her: her.map(rb), toCall: mb, pot: pot + mb };
      const E = RD.miseEngine, mk = (c) => E.P('23456789TJQKA'[c.r - 2] + c.s);
      const bb = T.board.map(mk), hh = T.her.map(mk), mm = T.mine.map(mk);
      if (E.herShow(bb, hh)) { M.show++; const r = E.solve(bb, mm, hh); if (r.ahead !== 0) M.noTie++; }
      const sc = RD.plan.mise(T, { charKey: 'polka', pot0: pot, bet: mb });
      if (sc) { M.ok++; inc(M.ans, ['左', '右', '見せない'][sc.ans]); const D = E.derive(sc); inc(M.ahead, D.ahead > 0 ? 'ミミが勝ち' : 'ミミが負け'); }
    }
  }
  return JSON.stringify(out);
})()`;
const A = { deals: 0, one: {}, mise: {} };
for (let done = 0; done < N; done += CHUNK) {
  const r = JSON.parse(await page.eval(code(Math.min(CHUNK, N - done))));
  A.deals += r.deals;
  for (const [k, v] of Object.entries(r.one)) A.one[k] = (A.one[k] || 0) + v;
  for (const [bn, M] of Object.entries(r.mise)) { const T = A.mise[bn] = A.mise[bn] || { fold: 0, show: 0, noTie: 0, ok: 0, ans: {}, ahead: {} }; for (const k of ['fold', 'show', 'noTie', 'ok']) T[k] += M[k]; for (const g of ['ans', 'ahead']) for (const [k, v] of Object.entries(M[g])) T[g][k] = (T[g][k] || 0) + v; }
}
const pc = (a, b) => b ? (a / b * 100).toFixed(2) + '%' : '-';
console.log(`配り ${A.deals} 手`);
for (const ck of ['polka', 'rico', 'selina', 'grano', 'velvet']) {
  const ok = A.one[ck + ':ok'] || 0, hit = A.one[ck + ':hit'] || 0, miss = A.one[ck + ':miss'] || 0;
  const signs = Object.entries(A.one).filter(([k]) => k.startsWith(ck + ':sign:')).map(([k, v]) => k.split(':')[2] + ' ' + v).join('・');
  const ans = ['call', 'fold'].map(x => (x === 'call' ? '払う ' : '降りる ') + (A.one[ck + ':ans:' + x] || 0)).join('・');
  const shown = hit + miss * 0.3;   // 外れは30%に絞る
  console.log(`おねだり ${ck}：出せる ${ok}（${pc(ok, A.deals)}）／待ちが来る ${hit}・来ない ${miss}（来る割合 ${pc(hit, ok)}）／印 ${signs}／答え ${ans}／外れを30%に絞った後：来る ${pc(hit, shown)}（出る見込み ${pc(shown * 0.6, A.deals)}）`);
}
for (const [bn, M] of Object.entries(A.mise)) console.log(`見せ合いっこ（ミミの賭け＝${bn}）：ポルカが降りると決めた ${M.fold}（${pc(M.fold, A.deals)}）→ 彼女の1枚＋場札で役 ${M.show} → 同点なし ${M.noTie} → 答えが1つ（出せる） ${M.ok}（降りる手の ${pc(M.ok, M.fold)}・全配りの ${pc(M.ok, A.deals)}）／答え ${JSON.stringify(M.ans)}／${JSON.stringify(M.ahead)}`);
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
await s.close();
process.exit(0);
