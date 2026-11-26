// 異議あり・押し出すふりを、本物の配りと本物の相手の打ち方で数える（2026-11-17）。node qa/reading-count.mjs [igi|furi|both] [配り数=2000]
// 卓の AI（decideOpponentAction）に、本物の札（52枚を切ってミミ2枚・相手2枚・場札5枚）で、ターン・リバーの「自分から賭ける」場面を聞く。
// ポットの3分の2以上を賭けた時だけが出どころ。そこで RD.plan.igi / RD.plan.furi が作れるか（＝出せる割合）と、答えの内訳を数える。
// 本編の2つの絞り込みも数える（2026-11-17）：ふりはミミがペア以上（evaluateHand の rank が1以上）の時だけ／異議あり は「作れる」が正解の場を3割だけ（game.js rdFuriAvailable・maybeRdAfterBet）。
// 注意：ミミが途中で降りた手は無い（全部の配りを最後まで見る）ので、実際のゲームの出る割合より少し甘い。
import { openSession, sleep } from './lib/session.mjs';
const [which = 'both', N0 = '2000'] = process.argv.slice(2);
const N = +N0;
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 20261117, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object" && !!window.RD && !!RD.plan.furi').catch(() => false)); i++) await sleep(500);
await sleep(800);
const CHUNK = 150;
const code = (chars, doIgi, doFuri, n) => `(() => {
  const out = {};
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };
  const rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  state.deisui = false; state.horoyoi = false;
  for (const ck of ${JSON.stringify(chars)}) {
    const prof = OPPONENTS[ck].profile;
    const O = out[ck] = { deals: 0, bets: { turn: 0, river: 0 }, big: { turn: 0, river: 0 }, igi: {}, furi: {}, intents: {}, raise: {} };
    const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
    for (let h = 0; h < ${n}; h++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), board5 = d.slice(4, 9);
      O.deals++;
      // ミミが先に 1/2 ポットを賭けて、相手が上乗せした場面（リバー。賭け方が半ポット固定のグラーノはここだけで『大きく賭ける』）
      { const pot = 600, mb = 300, board = board5;
        const c2 = { handStrength: handStrength01([...her, ...board]), toCall: mb, boardDanger: evaluateBoardDanger(board), canCheck: false, hole: her, board, pot: pot + mb, potBeforeBet: pot, playerShoves: 0, playerAllIn: false, playerCalls: 0, playerFolds: 0, handNo: 6 };
        const a2 = decideOpponentAction(prof, c2, {});
        inc(O.raise, 'faced:' + a2.type);
        if (a2.type === 'bet') {
          let amount = betSizeToChips(a2.size, pot + mb, 5000);
          if (amount >= mb) { const minRaiseTotal = mb + Math.max(50, mb); if (amount < minRaiseTotal) amount = minRaiseTotal; inc(O.raise, 'raised');
            const T = { board: board.map(rb), mine: mine.map(rb), her: her.map(rb), toCall: amount - mb, pot: pot + mb + amount - mb };
            const sc = RD.plan.furi(T, { charKey: ck, intent: a2.intent, toCall: amount - mb, pot: T.pot });
            if (sc && evaluateHand(mine.concat(board)).rank >= 1) { inc(O.raise, 'furi'); const A = RD.furiEngine.analyze(sc); inc(O.raise, sc.bluff ? 'furi:bluff' : (A.sameCat ? 'furi:same' : A.polkaHigher ? 'furi:polkaHigher' : 'furi:mimiHigher')); }
          } }
      }
      for (const street of ['turn', 'river']) {
        const board = street === 'turn' ? board5.slice(0, 4) : board5;
        const pot = 600;
        const ctx = { handStrength: handStrength01([...her, ...board]), toCall: 0, boardDanger: evaluateBoardDanger(board), canCheck: true, hole: her, board, pot, potBeforeBet: pot, playerShoves: 0, playerAllIn: false, playerCalls: 0, playerFolds: 0, handNo: 6 };
        const a = decideOpponentAction(prof, ctx, {});
        if (a.type !== 'bet') continue;
        O.bets[street]++;
        const amount = betSizeToChips(a.size, pot, 5000);
        const big = amount >= Math.floor(pot * 2 / 3);
        if (!big) continue;
        O.big[street]++; inc(O.intents, street + ':' + a.intent);
        const T = { board: board.map(rb), mine: mine.map(rb), her: her.map(rb), toCall: amount, pot: pot + amount };
        const cx = { charKey: ck, intent: a.intent, toCall: amount, pot: pot + amount };
        ${doIgi ? `if (ck === 'polka') { const sc = RD.plan.igi(T, cx); if (sc && sc.ans === 'O' && Math.random() >= 0.3) { inc(O.igi, street + ':thinned'); } else if (sc) { inc(O.igi, street + ':' + sc.kind + ':' + sc.ans); inc(O.igi, street + ':all'); } else inc(O.igi, street + ':none:' + a.intent); }` : ''}
        ${doFuri ? `if (street === 'river') { const sc = RD.plan.furi(T, cx); if (sc && evaluateHand(mine.concat(board)).rank < 1) { inc(O.furi, 'noPair'); } else if (sc) { const A = RD.furiEngine.analyze(sc); const k = sc.bluff ? 'bluff' : (A.sameCat ? 'real:same' : A.polkaHigher ? 'real:polkaHigher' : 'real:mimiHigher'); inc(O.furi, k); inc(O.furi, 'all'); inc(O.furi, 'score:' + (RD.furiEngine.scoreable(Object.assign({}, sc, { char: ck })) ? 'yes' : 'no')); if (A.win) inc(O.furi, 'ans:pay'); else inc(O.furi, 'ans:fold'); if (!sc.bluff && !A.glint.length) inc(O.furi, 'noglint'); } else inc(O.furi, 'none:' + a.intent); }` : ''}
      }
    }
  }
  return JSON.stringify(out);
})()`;
const chars = ['polka', 'grano', 'selina', 'velvet'];
const agg = {};
for (const ck of chars) {
  if (ck !== 'polka' && which === 'igi') continue;
  const A = agg[ck] = { deals: 0, bets: { turn: 0, river: 0 }, big: { turn: 0, river: 0 }, igi: {}, furi: {}, intents: {}, raise: {} };
  for (let done = 0; done < N; done += CHUNK) {
    const n = Math.min(CHUNK, N - done);
    const r = JSON.parse(await page.eval(code([ck], which !== 'furi', which !== 'igi', n)))[ck];
    A.deals += r.deals;
    for (const st of ['turn', 'river']) { A.bets[st] += r.bets[st]; A.big[st] += r.big[st]; }
    for (const g of ['igi', 'furi', 'intents', 'raise']) for (const [k, v] of Object.entries(r[g])) A[g][k] = (A[g][k] || 0) + v;
  }
}
const pc = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
for (const [ck, A] of Object.entries(agg)) {
  console.log(`\n== ${ck}：配り ${A.deals} 手。自分から賭けた（ターン ${A.bets.turn}・リバー ${A.bets.river}）／うちポット2/3以上（ターン ${A.big.turn}・リバー ${A.big.river}）／賭けのつもり ${JSON.stringify(A.intents)}`);
  if (ck === 'polka' && which !== 'furi') {
    for (const st of ['turn', 'river']) {
      const all = A.igi[st + ':all'] || 0;
      console.log(`  異議あり ${st}：出せた ${all}／${A.big[st]} ＝ ${pc(all, A.big[st])}（全配りに対して ${pc(all, A.deals)}）`);
      const parts = Object.entries(A.igi).filter(([k]) => k.startsWith(st + ':') && !k.includes(':all') && !k.includes(':none')).sort();
      console.log('    答えの内訳 ' + parts.map(([k, v]) => k.slice(st.length + 1) + ' ' + v).join('／') + '（kind:正解 X＝異議あり O＝作れる）');
      console.log(`    X（異議あり）が正解 ${Object.entries(A.igi).filter(([k]) => k.startsWith(st + ':') && k.endsWith(':X')).reduce((a, [, v]) => a + v, 0)}／O（作れる）が正解 ${Object.entries(A.igi).filter(([k]) => k.startsWith(st + ':') && k.endsWith(':O')).reduce((a, [, v]) => a + v, 0)}／絞って出さなかった作れる ${A.igi[st + ':thinned'] || 0}`);
      const none = Object.entries(A.igi).filter(([k]) => k.startsWith(st + ':none')).map(([k, v]) => k.split(':').slice(2).join('') + ' ' + v);
      console.log('    出せなかった内訳（賭けのつもり別）' + none.join('／'));
    }
  }
  if (which !== 'igi') {
    const all = A.furi.all || 0;
    console.log(`  ふり（リバー）：出せた ${all}／${A.big.river} ＝ ${pc(all, A.big.river)}（全配りに対して ${pc(all, A.deals)}）`);
    console.log(`    本物か・はったりか・ミミの役：はったり ${A.furi.bluff || 0}／本物・ミミが上 ${A['furi']['real:mimiHigher'] || 0}／本物・相手が上 ${A.furi['real:polkaHigher'] || 0}／本物・同じ種類 ${A.furi['real:same'] || 0}`);
    console.log(`    採点できる（合図に合うどの手でもミミの勝ち負けが同じ）：できる ${A.furi['score:yes'] || 0}／運しだい（採点なし） ${A.furi['score:no'] || 0}`);
    console.log(`    正解：払う ${A.furi['ans:pay'] || 0}／降りる ${A.furi['ans:fold'] || 0}　光る場札なしの本物 ${A.furi.noglint || 0}／ミミが役なしで出さなかった ${A.furi.noPair || 0}`);
    const none = Object.entries(A.furi).filter(([k]) => k.startsWith('none:')).map(([k, v]) => k.slice(5) + ' ' + v);
    console.log('    出せなかった内訳（賭けのつもり別）' + none.join('／'));
    console.log(`  ふり（リバー・ミミが先に1/2ポットを賭けて、相手が上乗せした場面）：ミミの賭けに対して ${JSON.stringify(Object.fromEntries(Object.entries(A.raise).filter(([k]) => k.startsWith('faced'))))}／上乗せ ${A.raise.raised || 0}（配りの ${pc(A.raise.raised || 0, A.deals)}）／ふりを出せた ${A.raise.furi || 0}（上乗せの ${pc(A.raise.furi || 0, A.raise.raised || 0)}）　内訳 はったり ${A.raise['furi:bluff'] || 0}・本物ミミが上 ${A.raise['furi:mimiHigher'] || 0}・本物相手が上 ${A.raise['furi:polkaHigher'] || 0}・同じ種類 ${A.raise['furi:same'] || 0}`);
  }
}
console.log('\nerrors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
await s.close();
process.exit(0);
