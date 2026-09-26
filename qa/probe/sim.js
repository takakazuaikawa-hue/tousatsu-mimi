// 対戦シミュレータ（ページ内で本物の AI 関数を呼ぶ）。window.__qaSim.run({opp, policy, n, pCorrect})
// 進行の模型は game.js の startHand / playerX / opponentTurnDecide / advanceAfterCall / endHand を写したもの。
// AI の判断（decideOpponentAction ほか）は game.js の実物を使うので、AI を直せば結果もそのまま変わる。
// game.js に window.__mimiEngine（純粋関数の出入口）が生えたら、そちらを優先して使う。
(() => {
  const E = () => window.__mimiEngine || {};
  const fn = (name) => E()[name] || window[name] || (() => { try { return eval(name); } catch (e) { return null; } })();

  function playerDecide(pol, S, need) {
    const evaluateHand = fn('evaluateHand'), realisticEquity01 = fn('realisticEquity01'), opponentPreflopStrength = fn('opponentPreflopStrength');
    if (pol === 'allin') return { t: 'allin' };
    if (pol === 'station') return need > 0 ? { t: 'call' } : { t: 'check' };
    let eq;
    if (S.comm.length >= 3) eq = realisticEquity01([...S.ph, ...S.comm]);
    else eq = opponentPreflopStrength(S.ph);
    const potOdds = need > 0 ? need / (S.pot + need) : 0;
    if (pol === 'learner') {
      const eqv = fn('equityVsRandom') ? fn('equityVsRandom')(S.ph, S.comm, 200) : eq;
      let e2 = eqv;
      if (need > 0) {
        const sizeRatio = need / Math.max(1, S.pot - need);
        const sty = S.oppStyle || '';
        // 卓で学ぶ読み：ポルカの大きい賭けは弱い、セリナの大きい賭けは強い、ヴェルベットは両極
        if (sty === 'loud' && sizeRatio >= 0.66) e2 += 0.12;
        if (sty === 'honest' && sizeRatio >= 0.66) e2 -= 0.12;
        if (sty === 'polar' && sizeRatio >= 0.9) e2 = e2 >= 0.6 ? e2 + 0.05 : e2 - 0.05;
        if (e2 < potOdds) return { t: 'fold' };
        if (e2 > 0.85) return { t: 'raise' };
        return { t: 'call' };
      }
      if (e2 > 0.66) return { t: 'bet', size: 'pot_2_3' };
      return { t: 'check' };
    }
    if (pol === 'beginner') { // 役があれば賭け、無ければ降りる素朴な初心者
      const ev = S.comm.length >= 3 ? evaluateHand([...S.ph, ...S.comm]) : null;
      if (!ev) return need > 100 ? { t: 'fold' } : need > 0 ? { t: 'call' } : { t: 'check' };
      if (need > 0) return ev.rank >= 1 ? { t: 'call' } : { t: 'fold' };
      return ev.rank >= 1 ? { t: 'bet', size: 'pot_1_2' } : { t: 'check' };
    }
    return need > 0 ? { t: 'call' } : { t: 'check' };
  }

  function battle(oppId, pol, pCorrect, rng) {
    const OPP = fn('OPPONENTS') || OPPONENTS;
    const newDeck = fn('newDeck'), evaluateHand = fn('evaluateHand'), handStrength01 = fn('handStrength01');
    const opponentPreflopStrength = fn('opponentPreflopStrength'), evaluateBoardDanger = fn('evaluateBoardDanger');
    const decideOpponentAction = fn('decideOpponentAction'), betSizeToChips = fn('betSizeToChips');
    const anteFor = fn('anteForHand'); // フェーズ2で追加予定（参加費の段階上げ）
    const opp = OPP[oppId]; const base = opp.chips || 1000; const prof = opp.profile; const isBoss = !!opp.isBoss;
    const oppMult = opp.oppChipMult || 2;
    const S = { P: base, O: base * oppMult, rebuy: 1, wins: 0, handNo: 0, zaz: 0, revealed: false, oppStyle: (fn('aiStyleOf') ? fn('aiStyleOf')(prof).sizing : '') };
    const st = { hands: 0, psych: 0, logic: 0, showdowns: 0, oppFolds: 0, plFolds: 0, dom: false, rebuy: false, cap: false, allinCalledLost: 0 };
    while (S.P > 0 && S.O > 0) {
      S.handNo++; st.hands++; if (st.hands > 400) { st.cap = true; break; }
      const ante0 = anteFor ? anteFor(S.handNo, oppId) : 50;
      const a = Math.min(ante0, S.P, S.O); S.P -= a; S.O -= a; S.pot = 2 * a; S.cbP = 0; S.cbO = 0;
      const deck = newDeck(); S.ph = [deck.pop(), deck.pop()]; S.oh = [deck.pop(), deck.pop()]; S.comm = []; S.phase = 'preflop';
      S.psychResolved = false; S.logicResolved = false; S.bossFired = false;
      let winner = null;
      const advance = () => {
        const d = S.cbP - S.cbO;
        if (d > 0 && S.O <= 0) { S.P += d; S.pot -= d; S.cbP -= d; } else if (d < 0 && S.P <= 0) { S.O -= d; S.pot += d; S.cbO += d; }
        S.cbP = 0; S.cbO = 0;
        if (S.phase === 'preflop') { S.comm.push(deck.pop(), deck.pop(), deck.pop()); S.phase = 'flop'; return false; }
        if (S.phase === 'flop') { S.comm.push(deck.pop()); S.phase = 'turn'; S.psychResolved = false; S.logicResolved = false; return false; }
        if (S.phase === 'turn') { S.comm.push(deck.pop()); S.phase = 'river'; S.psychResolved = false; S.logicResolved = false; return false; }
        return true;
      };
      let who = 'player', done = false, guard = 0;
      while (!done && guard++ < 60) {
        if (who === 'player') {
          const need = S.cbO - S.cbP;
          if (S.P <= 0) { if (advance()) { done = true; break; } who = 'opp'; continue; }
          const d = playerDecide(pol, S, need);
          if (d.t === 'fold' && need > 0) { S.O += S.pot; winner = 'opponent'; st.plFolds++; done = true; break; }
          if (d.t === 'fold' || d.t === 'check' || d.t === 'call') {
            const pay = Math.min(Math.max(0, need), S.P); S.P -= pay; S.cbP += pay; S.pot += pay;
            if (advance()) { done = true; break; } who = 'opp'; continue;
          }
          if (d.t === 'allin') { S.shoves = (S.shoves || 0) + 1; const amt = S.P; S.P = 0; S.cbP += amt; S.pot += amt; S.shoved = true; who = 'opp'; continue; }
          if (d.t === 'raise') { const amt = Math.min(Math.max(need * 2, need + Math.max(50, need)), S.P); S.P -= amt; S.cbP += amt; S.pot += amt; who = 'opp'; continue; }
          if (d.t === 'bet') { const amt = Math.min(betSizeToChips(d.size, S.pot, S.P) + Math.max(0, need), S.P); S.P -= amt; S.cbP += amt; S.pot += amt; who = 'opp'; continue; }
        } else {
          const need = S.cbP - S.cbO;
          if (S.O <= 0) { if (advance()) { done = true; break; } who = 'opp'; continue; }
          if (S.P <= 0 && need <= 0) { if (advance()) { done = true; break; } who = 'opp'; continue; }
          const all = [...S.oh, ...S.comm];
          const hs = S.comm.length >= 3 ? handStrength01(all) : opponentPreflopStrength(S.oh);
          const ctx = { handStrength: hs, toCall: need, boardDanger: evaluateBoardDanger(S.comm), canCheck: need === 0, pot: S.pot, oppChips: S.O, playerChips: S.P, street: S.phase, playerAllIn: S.P <= 0,
            hole: S.oh, board: S.comm, potBeforeBet: S.pot - need, playerShoves: S.shoves || 0 };
          const post = S.phase !== 'preflop';
          const force = (S.handNo === 1 && S.phase === 'flop' && !S.psychResolved && S.cbP === 0);
          let act = decideOpponentAction(prof, ctx, { forceLargeBet: force });
          if (S.P <= 0 && act.type !== 'fold') act = { ...act, type: 'check_call' };
          if (act.type === 'fold' && need > 0) { S.P += S.pot; winner = 'player'; st.oppFolds++; done = true; break; }
          if (act.type === 'check_call' || act.type === 'fold') {
            const pay = Math.max(0, Math.min(need, S.O)); S.O -= pay; S.cbO += pay; S.pot += pay;
            if (pay > 0) { if (advance()) { done = true; break; } who = 'opp'; continue; }
            who = 'player'; continue;
          }
          let amount = betSizeToChips(act.size, S.pot, S.O);
          if (need > 0) {
            if (amount < need) { const pay = Math.min(need, S.O); S.O -= pay; S.cbO += pay; S.pot += pay; if (advance()) { done = true; break; } who = 'opp'; continue; }
            const mr = need + Math.max(50, need); if (amount < mr) amount = Math.min(mr, S.O);
          }
          S.O -= amount; S.cbO += amount; S.pot += amount;
          const big = (act.size === 'pot_2_3' || act.size === 'pot_1' || act.size === 'allin' || S.O === 0);
          const bluff = (act.intent === 'bluff' || act.intent === 'forced_bluff');
          if (post && big && !S.psychResolved && !S.revealed && ((S.handNo === 1 && S.phase === 'flop') || (bluff && rng() < 0.5) || isBoss)) {
            st.psych++; S.psychResolved = true; if (rng() < pCorrect) { S.zaz++; if (S.zaz >= 3) S.revealed = true; }
          } else if (post && !S.logicResolved && !S.psychResolved && rng() < 0.55) {
            st.logic++; S.logicResolved = true; S.psychResolved = true;
          }
          who = 'player'; continue;
        }
      }
      if (!winner) {
        const pe = evaluateHand([...S.ph, ...S.comm]), oe = evaluateHand([...S.oh, ...S.comm]); st.showdowns++;
        if (pe.score > oe.score) { S.P += S.pot; winner = 'player'; }
        else if (pe.score < oe.score) { S.O += S.pot; winner = 'opponent'; if (S.shoved) st.allinCalledLost++; }
        else { S.P += Math.floor(S.pot / 2); S.O += Math.ceil(S.pot / 2); winner = 'split'; }
      }
      S.pot = 0; S.shoved = false;
      if (winner === 'player') S.wins++; else if (winner === 'opponent') S.wins = 0;
      if (S.P <= 0 && S.O > 0 && S.rebuy > 0) { S.rebuy = 0; S.P = base; st.rebuy = true; continue; }
      if (S.P <= 0 || S.O <= 0) break;
      const domCheck = fn('isDominanceMode');
      const domNow = (window.__mimiEngine && window.__mimiEngine.dominanceReady) ? window.__mimiEngine.dominanceReady({ P: S.P, O: S.O, base, wins: S.wins }) : (S.P > base && S.P >= S.O * 2 && S.wins >= 5);
      if (domNow) { st.dom = true; break; }
    }
    st.won = st.dom ? (S.P > 0) : S.P > S.O;
    st.domWhileBehind = st.dom && S.P < S.O;
    return st;
  }

  function run({ opp = 'polka', policy = 'learner', n = 2000, pCorrect = 0.6, seed = 7 } = {}) {
    let a = seed >>> 0;
    const rng = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const R0 = Math.random; Math.random = rng;
    try {
      const acc = { hands: 0, psych: 0, logic: 0, showdowns: 0, oppFolds: 0, plFolds: 0, allinCalledLost: 0 };
      let W = 0, D = 0, DB = 0, RB = 0, CAP = 0; const H = [];
      for (let i = 0; i < n; i++) {
        const s = battle(opp, policy, pCorrect, rng);
        for (const k in acc) acc[k] += s[k];
        if (s.won) W++; if (s.dom) D++; if (s.domWhileBehind) DB++; if (s.rebuy) RB++; if (s.cap) CAP++; H.push(s.hands);
      }
      H.sort((x, y) => x - y);
      const f = (k) => +(acc[k] / n).toFixed(2);
      return { opp, policy, n, winPct: +(100 * W / n).toFixed(1), domPct: +(100 * D / n).toFixed(1), domBehindPct: +(100 * DB / n).toFixed(1), rebuyPct: +(100 * RB / n).toFixed(0), capPct: +(100 * CAP / n).toFixed(1), handsAvg: f('hands'), handsMedian: H[n >> 1], handsP90: H[Math.floor(n * 0.9)], psych: f('psych'), logic: f('logic'), oppFolds: f('oppFolds'), plFolds: f('plFolds'), showdowns: f('showdowns') };
    } finally { Math.random = R0; }
  }

  // 相手の「賭けられた時」の反応の内訳（性格の説明文と挙動の一致を確かめる）
  function reaction({ opp = 'polka', n = 20000, betSize = 'pot_1_2', street = 'flop' } = {}) {
    const OPP = fn('OPPONENTS') || OPPONENTS;
    const newDeck = fn('newDeck'), handStrength01 = fn('handStrength01'), evaluateBoardDanger = fn('evaluateBoardDanger');
    const decideOpponentAction = fn('decideOpponentAction'), betSizeToChips = fn('betSizeToChips');
    const prof = OPP[opp].profile; const cnt = { fold: 0, call: 0, raise: 0 };
    for (let i = 0; i < n; i++) {
      const deck = newDeck(); const oh = [deck.pop(), deck.pop()]; const comm = [deck.pop(), deck.pop(), deck.pop()];
      if (street !== 'flop') comm.push(deck.pop()); if (street === 'river') comm.push(deck.pop());
      const pot = 200; const need = betSizeToChips(betSize, pot, 5000);
      const ctx = { handStrength: handStrength01([...oh, ...comm]), toCall: need, boardDanger: evaluateBoardDanger(comm), canCheck: false, pot: pot + need, street, hole: oh, board: comm, potBeforeBet: pot };
      const act = decideOpponentAction(prof, ctx, {});
      if (act.type === 'fold') cnt.fold++; else if (act.type === 'check_call') cnt.call++; else cnt.raise++;
    }
    return { opp, betSize, street, foldPct: +(100 * cnt.fold / n).toFixed(1), callPct: +(100 * cnt.call / n).toFixed(1), raisePct: +(100 * cnt.raise / n).toFixed(1) };
  }

  window.__qaSim = { run, reaction };
})();
