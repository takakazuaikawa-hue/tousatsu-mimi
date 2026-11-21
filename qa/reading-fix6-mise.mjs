// 見せ合いっこ（Codex 指摘2・3の直し・2026-11-17）：見せない時は、ポルカは卓の AI が元々決めた払う／降りるのまま。
//  node qa/reading-fix6-mise.mjs <ahead|behind> <fold|pay> <hide|show> [WxH]
//  ahead＝ミミが勝っている配り／behind＝負けている配り。fold／pay＝ポルカの AI の元の判断（決定を差し替えて固定）。hide＝見せない／show＝正解の札を見せる。
//  終わったら、卓で本当に起きた事（ポルカが払った・降りた／ミミのチップ）を見て、決まりどおりか確かめる。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [ahead = 'ahead', ai = 'pay', how = 'hide', size = '844x390'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const T = await open('polka', { W, H, night: 'horoyoi', save: { rdDemo: { mise: true } } });
const { ev, log, shot, waitFor, q, click, close } = T;
const tag = `fix6_mise_${ahead}_${ai}_${how}`;
try {
  const found = JSON.parse(await ev(`
    const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
    const t0 = performance.now(); for (let n = 0; n < 300000 && performance.now() - t0 < 25000; n++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      const sc = RD.plan.mise({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'polka', pot0: 600, bet: 400 });
      if (!sc) continue;
      const D = RD.miseEngine.derive(Object.assign({}, sc, { ai: '${ai}' }));
      if ((D.ahead > 0) !== ${ahead === 'ahead'}) continue;
      if ('${how}' === 'show' && sc.ans === 2) continue;
      if ('${how}' === 'hide' && sc.ans === 2 && ${ahead === 'ahead' ? 'false' : 'false'}) continue;
      state.playerHand = mine; state.opponentHand = her; state.community = b5; state.handPhase = 'river';
      return JSON.stringify({ n, sc, ahead: D.ahead });
    }
    return JSON.stringify(null);`));
  if (!found) { log('場面が見つからない'); process.exit(1); }
  log('場面', JSON.stringify(found));
  await ev(`
    state.pot = 1000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 1500); state.opponentChips = Math.max(state.opponentChips, 1500);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdForce = null; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
    render(); return 1;`);
  await sleep(400);
  const before = await ev(`return JSON.stringify([state.playerChips, state.opponentChips, state.pot])`);
  const act = ai === 'fold' ? "{ type: 'fold', intent: 'fear' }" : "{ type: 'check_call', intent: 'reluctant_call' }";
  await ev(`window.__rand0 = rand; rand = () => 0.01; window.__decOrig = decideOpponentAction; decideOpponentAction = () => (${act}); opponentTurnDecide(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await ev(`rand = window.__rand0; decideOpponentAction = window.__decOrig; return 1;`);
  await sleep(400);
  await waitFor(q('.sg.live .chip.hc.on'), 25000); await sleep(1400);
  await waitFor(q('.sg.live .opts.on'), 25000); await sleep(1500); await shot(tag, 'pick');
  const sc = found.sc, pick = how === 'hide' ? 2 : sc.ans;
  if (pick < 2) { await click(`.sg.live .m${pick}`); await sleep(500); await click('.sg.live .shw'); } else await click('.sg.live .hide');
  await sleep(2500); await shot(tag, 'reveal_mid');
  await waitFor(q('.sg.live .go.on'), 40000); await sleep(1200); await shot(tag, 'reveal_end');
  log('明かし', await ev(`const r = document.querySelector('.rd-host .sg.live .reason'); const i = document.querySelector('.rd-host .sg.live .ins'); return (i ? i.textContent : '') + ' ／ ' + (r ? r.textContent : '')`));
  await click('.sg.live .go');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  await sleep(3500);
  log('卓', await ev(`const last = (state.handResults || []).slice(-1)[0] || null; return JSON.stringify({ chips: [state.playerChips, state.opponentChips], pot: state.pot, last: last && { winner: last.winner, reason: last.reason, pot: last.pot }, thought: state.mimiThought, success: state.psychSuccessCount, intent: state.lastOpponentIntent })`));
  log('前（ミミ・ポルカ・ポット）', before, ' ポルカの元の判断', ai, ' 選んだ', how);
  await shot(tag, 'table_after');
  await waitFor(`!!document.querySelector('.hand-result-overlay')`, 20000); await sleep(3000);
  // 結果の画面の文字の実寸（画面上の px）：VS・札・名前
  log('結果の文字', await ev(`const out = {}; for (const sel of ['.hr-vs', '.hr-player-name', '.hr-player-eval', '.hr-pcard', '.hr-title']) { const e = document.querySelector('.hand-result-overlay ' + sel); if (!e) { out[sel] = null; continue; } const r = e.getBoundingClientRect(); const fs0 = parseFloat(getComputedStyle(e).fontSize); const m = new DOMMatrixReadOnly(getComputedStyle(e.closest('.hr-card') || e).transform === 'none' ? undefined : getComputedStyle(e.closest('.hr-card')).transform); out[sel] = { css: fs0, scale: +m.a.toFixed(3), screen: +(fs0 * m.a).toFixed(1) }; } return JSON.stringify(out)`));
  await shot(tag, 'hand_result');
} finally { await close(); }
process.exit(0);
