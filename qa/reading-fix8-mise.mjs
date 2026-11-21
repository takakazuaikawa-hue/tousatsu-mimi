// 見せ合いっこ（2026-11-17 Codex 2回目 指摘6）：一度「弱く見える札」で払わされたポルカが、次の手で警戒するのを通す。node qa/reading-fix8-mise.mjs [WxH] [horoyoi|deisui]
//  1手目：ふつうに通して、弱く見える札を見せて払わせる（rdMiseWary が立つ）→ 手の結果 → 次のハンド
//  2手目：警戒中（顔の横にじと目の印・決まりの文が変わる・台詞）。弱く見える札を見せると疑われ、元の AI の判断に戻る。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [size = '844x390', night = 'horoyoi', firstArg = ''] = process.argv.slice(2);
const FIRST = firstArg === 'first';   // first＝お手本から（初回）
const [W, H] = size.split('x').map(Number);
const T = await open('polka', { W, H, night, save: FIRST ? {} : { rdDemo: { mise: true } } });
const { ev, log, shot, waitFor, q, click, close } = T;
const tag = `fix8_mise`;
log(`--- ${tag}  ほろ酔い ${await ev('return isHoroyoi() + " deisui " + state.deisui')}`);
async function setup(wary, mustOrig) {
  const found = JSON.parse(await ev(`
    const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
    for (let n = 0; n < 300000; n++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      const sc = RD.plan.mise({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'polka', pot0: 600, bet: 400, wary: ${wary} });
      if (!sc) continue;
      const dd = RD.miseEngine.derive(sc);
      ${wary ? (mustOrig ? "if (!dd.r.out.includes('orig')) continue;" : '') : "if (!(sc.ans < 2 && dd.r.out[sc.ans] === 'call' && dd.ahead > 0)) continue;"}
      state.playerHand = mine; state.opponentHand = her; state.community = b5; state.handPhase = 'river';
      return JSON.stringify({ n, sc, out: dd.r.out });
    }
    return JSON.stringify(null);`));
  if (!found) { log('場面が見つからない'); return null; }
  log('場面', JSON.stringify({ wary: found.sc.wary, ans: found.sc.ans, out: found.out, board: found.sc.board, mimi: found.sc.mimi, polka: found.sc.polka }));
  await ev(`
    state.pot = 1000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 900); state.opponentChips = Math.max(state.opponentChips, 900);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = { mise: ${wary ? 1 : 0} }; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdForce = null; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
    render(); return 1;`);
  await sleep(400);
  await ev(`window.__rand0 = rand; rand = () => 0.01; window.__decOrig = decideOpponentAction; decideOpponentAction = () => ({ type: 'fold', intent: 'fear' }); opponentTurnDecide(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await ev(`rand = window.__rand0; decideOpponentAction = window.__decOrig; return 1;`);
  await sleep(400);
  return found;
}
// 1手目
let f = await setup(false);
if (!f) { await close(); process.exit(1); }
if (FIRST) {
  await shot(tag, 'demo_intro');
  await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot(tag, 'demo_stop1');
  await waitFor(q('.sg.demo .clone.on'), 25000); await sleep(1700); await shot(tag, 'demo_show');
  await waitFor(q('.sg.demo .opts.on'), 40000); await sleep(1200); await shot(tag, 'demo_pick');
  await waitFor(q('.sg.demo .reason.on'), 40000); await sleep(800); await shot(tag, 'demo_reveal');
  await waitFor(q('.sg.demo .panel.on'), 40000); await sleep(300); await shot(tag, 'demo_card4');
  await click('.sg.demo .pgo');
}
log('警戒の印（1手目）', await ev(`return JSON.stringify({ wary: !!state.rdMiseWary, mark: (document.querySelector('.rd-host .sg .wary') ? getComputedStyle(document.querySelector('.rd-host .sg .wary')).display : 'none') })`));
await waitFor(q('.sg.live .opts.on'), 30000); await sleep(1500); await shot(tag, 'h1_pick');
await click(`.sg.live .m${f.sc.ans}`); await sleep(500); await click('.sg.live .shw');
await sleep(1500);
await waitFor(q('.sg.live .go.on'), 30000); await sleep(1200); await shot(tag, 'h1_reveal');
await click('.sg.live .go');
await waitFor(`!document.querySelector('.rd-host')`, 8000); await sleep(2000);
log('払わされた後', await ev(`return JSON.stringify({ wary: !!state.rdMiseWary, panyu: state.panyu })`));
await waitFor(`!!document.querySelector('.hand-result-overlay')`, 30000); await sleep(800);
await shot(tag, 'h1_result');
await T.nextHand(); await sleep(3500);
// 2手目：警戒
f = await setup(true, true);
if (!f) { await close(); process.exit(1); }
log('警戒の印（2手目）', await ev(`return JSON.stringify({ wary: !!state.rdMiseWary, mark: getComputedStyle(document.querySelector('.rd-host .sg .wary')).display, rule: document.querySelector('.rd-host .sg .rule').innerText })`));
await sleep(1200); await shot(tag, 'h2_say_wary');
await waitFor(q('.sg.live .opts.on'), 30000); await sleep(1500); await shot(tag, 'h2_pick');
const oi = f.out.indexOf('orig');
await click(`.sg.live .m${oi}`); await sleep(600); await shot(tag, 'h2_lifted'); await click('.sg.live .shw');
await sleep(2500); await shot(tag, 'h2_reveal_mid');
await waitFor(q('.sg.live .go.on'), 30000); await sleep(1200); await shot(tag, 'h2_reveal');
await click('.sg.live .go');
await waitFor(`!document.querySelector('.rd-host')`, 8000); await sleep(2000);
log('卓', await ev(`return JSON.stringify({ thought: state.mimiThought, last: (state.handResults || []).slice(-1)[0], wary: !!state.rdMiseWary })`));
await T.restoreAI();
await close();
process.exit(0);
