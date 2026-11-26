// リーディング「見せ合いっこ」をほろ酔いの夜のポルカ戦で通す（2026-11-17）。node qa/reading-mise.mjs [all|left|right|hide|wrong|caught] [WxH] [horoyoi|deisui]
//  卓を「リバーでミミが賭けた手」にして、ポルカの AI を「降りる」に差し替え、本物の opponentTurnDecide を通す（出る見込み50%は乱数 0 で固定）。
//  left／right／hide：正解の選び方（左の札を見せる／右の札を見せる／見せない）。wrong：勝っている手で見せない（逃げられる）／caught：負けている手で札を見せる（ばれて払われ、負ける）。
//  初回（left）はお手本が自動で流れる。2回目からはお手本を見た印を付ける。終わったら、ポルカの払う／降りるが卓で本当に起きたか（チップ・手の結果）を見る。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [mode = 'all', size = '844x390', night = 'horoyoi'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);

async function run(which, first) {
  const T = await open('polka', { W, H, night, save: first ? {} : { rdDemo: { mise: true } } });
  const { ev, log, shot, waitFor, q, click, close } = T;
  const tag = `fix8_mise_${which}${night === 'deisui' ? '_deisui' : ''}`;
  log(`--- ${tag}  ほろ酔い ${await ev('return isHoroyoi() + " deisui " + state.deisui')}`);
  const want = which === 'left' ? 0 : which === 'right' ? 1 : (which === 'hide' || which === 'caught') ? 2 : 1;
  const found = JSON.parse(await ev(`
    const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
    for (let n = 0; n < 200000; n++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      const sc = RD.plan.mise({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'polka', pot0: 600, bet: 400 });
      if (!sc || sc.ans !== ${want}) continue;
      state.playerHand = mine; state.opponentHand = her; state.community = b5; state.handPhase = 'river';
      return JSON.stringify({ n, sc });
    }
    return JSON.stringify(null);`));
  if (!found) { log('場面が見つからない'); await close(); return; }
  log('場面', JSON.stringify(found.sc));
  await ev(`
    state.pot = 1000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 900); state.opponentChips = Math.max(state.opponentChips, 900);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdForce = null; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
    render(); return 1;`);
  await sleep(400);
  log('ok?', await ev(`return JSON.stringify({ pool: readPools().logic, horoyoi: isHoroyoi() })`));
  const before = await ev(`return JSON.stringify([state.playerChips, state.opponentChips, state.pot])`);
  await ev(`window.__rand0 = rand; rand = () => 0.01; window.__decOrig = decideOpponentAction; decideOpponentAction = () => ({ type: 'fold', intent: 'fear' }); opponentTurnDecide(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await ev(`rand = window.__rand0; decideOpponentAction = window.__decOrig; return 1;`);
  await sleep(400);
  log('出た', await ev(`return JSON.stringify({ cnt: state.rdCount, readHand: state.readHandNo })`));
  if (first) {
    await shot(tag, 'demo_intro');
    await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot(tag, 'demo_stop1');
    await waitFor(q('.sg.demo .clone.on'), 25000); await sleep(1700); await shot(tag, 'demo_show');
    await waitFor(q('.sg.demo .opts.on'), 40000); await sleep(1200); await shot(tag, 'demo_pick');
    await waitFor(q('.sg.demo .reason.on'), 40000); await sleep(800); await shot(tag, 'demo_reveal');
    await waitFor(q('.sg.demo .panel.on'), 40000); await sleep(300); await shot(tag, 'demo_card4');
    await click('.sg.demo .pgo');
  } else await shot(tag, 'say_intro_nodemo');
  await waitFor(q('.sg.live .chip.hc.on'), 25000); await sleep(1400); await shot(tag, 'say_herflip');
  await waitFor(q('.sg.live .opts.on'), 25000); await sleep(1500); await shot(tag, 'pick');
  const d = JSON.parse(await ev(`return JSON.stringify({ n: document.querySelectorAll('.rd-host .sg.live .mc').length })`));
  const ans = found.sc.ans;
  const pick = which === 'wrong' ? 2 : which === 'caught' ? 0 : ans;
  if (pick < 2) {
    await click(`.sg.live .m${pick}`); await sleep(700); await shot(tag, 'lifted');
    if (first) { await click('.sg.live .askrico'); await sleep(500); await shot(tag, 'coach'); await click('.sg.live .rico'); }
    await click('.sg.live .shw');
  } else await click('.sg.live .hide');
  await sleep(1500); await shot(tag, 'show_1');
  await waitFor(q('.sg.live .go.on'), 30000); await sleep(1200); await shot(tag, 'reveal_end');
  await click('.sg.live .go');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  await sleep(2500);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, screen: state.screen, chips: [state.playerChips, state.opponentChips], pot: state.pot, last: (state.handResults || []).slice(-1)[0], thought: state.mimiThought, panyu: state.panyu, success: state.psychSuccessCount })`));
  log('前', before);
  await shot(tag, 'table_after');
  await sleep(2500);
  await shot(tag, 'hand_result');
  await close();
}
const list = mode === 'all' ? ['left', 'right', 'hide', 'wrong'] : [mode];
let first = true;
for (const m of list) { await run(m, first); first = false; }
process.exit(0);
