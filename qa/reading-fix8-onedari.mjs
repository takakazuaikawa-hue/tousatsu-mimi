// おねだり（2026-11-17 Codex 2回目の直し）：配りの仕込み・賭け額の固定・独立の二択盤をやめた形を、ほろ酔いの夜の本物の卓で通して撮る。
// node qa/reading-fix8-onedari.mjs [polka|rico|selina|grano|velvet] [hit|miss|both] [WxH] [horoyoi|deisui] [first] [nobet]
//  卓の上に印と吹き出し（初回はリコの一言）→ リバー → 相手が賭けたら、卓のふつうのボタン（コール／降りる）で決める → 手の結果に答えの欄。
//  相手の賭けは、検査のために1回だけ「賭ける」に差し替える（本物は元の AI。nobet を付けると賭けさせず、採点なしで終わることを確かめる）。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [who = 'polka', which0 = 'both', size = '844x390', night = 'horoyoi', ...flags] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const KEYS = { polka: 'polka', rico: 'rico_tutorial', selina: 'selina', grano: 'grano', velvet: 'velvet' };
const NOBET = flags.includes('nobet');

async function run(key, hit, first, want0 = 'any') {
  const T = await open(KEYS[key], { W, H, speed: +process.env.SPEED || 1, night, save: first ? {} : { rdDemo: { onedari: true } } });
  const { ev, log, shot, waitFor, close } = T;
  const tag = `fix8_one_${key}${want0 === 'any' ? '' : '_' + want0}_${hit ? 'hit' : 'miss'}${night === 'deisui' ? '_deisui' : ''}${NOBET ? '_nobet' : ''}`;
  log(`--- ${tag}  ほろ酔い ${await ev('return isHoroyoi() + " deisui " + state.deisui + " key " + state.opponentImgKey')}`);
  const found = JSON.parse(await ev(`
    const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
    for (let n = 0; n < 60000; n++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      const sc = RD.plan.onedari({ board: b5.slice(0, 4).map(rb), mine: mine.map(rb), her: her.map(rb), toCall: 0, pot: 400 }, { charKey: state.opponentImgKey, fin: rb(b5[4]), pot: 400 });
      if (!sc || !!sc.hit !== ${hit}) continue;
      if ('${want0}' !== 'any' && RD.onedariEngine.derive(sc).kind !== '${want0}') continue;
      state.playerHand = mine; state.opponentHand = her; state.community = b5.slice(0, 4); state.handPhase = 'turn';
      state.deck = d.slice(9).concat([b5[4]]);
      return JSON.stringify({ n, sc });
    }
    return JSON.stringify(null);`));
  if (!found) { log('場面が見つからない'); await close(); return; }
  log('場面', JSON.stringify({ sign: found.sc.sign, board: found.sc.board, mimi: found.sc.mimi, her: found.sc.her, hit: found.sc.hit, answer: found.sc.answer }));
  await ev(`
    state.pot = 400; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 900); state.opponentChips = Math.max(state.opponentChips, 900);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdSayGate = -1; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
    ${NOBET ? '' : `if (!window.__decOrig) window.__decOrig = decideOpponentAction; decideOpponentAction = (...a) => state.handPhase === 'river' ? { type: 'bet', size: 'pot_2_3', intent: ${hit ? "'value'" : "'bluff'"}, eq: 0.5 } : window.__decOrig(...a);`}
    render(); return 1;`);
  await sleep(500);
  await ev(`advanceAfterCall(); return 1;`);
  await waitFor(`!!document.querySelector('.rdt-sign.on')`, 20000); await sleep(600);
  log('出た', await ev(`return JSON.stringify({ cnt: state.rdCount, rdHost: !!document.querySelector('.rd-host'), advice: state.ricoAdvice })`));
  await shot(tag, 'say_table');
  await waitFor(`state.community.length === 5`, 15000); await sleep(600); await shot(tag, 'table_river_sign');
  if (!NOBET) {
    await waitFor(`state.isPlayerTurn && state.handPhase === 'river' && state.currentBetOpponent > state.currentBetPlayer`, 30000); await sleep(4500);
    log('相手の賭け', await ev(`return JSON.stringify({ toCall: state.currentBetOpponent - state.currentBetPlayer, pot: state.pot, sign: !!document.querySelector('.rdt-sign.on'), rdHost: !!document.querySelector('.rd-host') })`));
    await shot(tag, 'table_pick');
    // 卓のふつうのボタンで決める（来た→降りる／来ない→コール）
    await ev(`const b = document.querySelector('${hit ? '.verb-fold' : '.verb-cc'}'); if (b) b.click(); else ${hit ? 'playerFold()' : 'playerCheckCall()'}; return 1;`);
    await sleep(500);
    log('決めた直後', await ev(`return JSON.stringify({ pending: state.pendingRead && { game: state.pendingRead.game, pick: state.pendingRead.pick, ans: state.pendingRead.ans }, signGone: !document.querySelector('.rdt-sign.on') })`));
  } else {
    await waitFor(`state.isPlayerTurn && state.handPhase === 'river'`, 30000); await sleep(800);
    await ev(`playerCheckCall(); return 1;`);
  }
  await waitFor(`!!document.querySelector('.hand-result-overlay')`, 40000); await sleep(1500);
  const hr = await ev(`return JSON.stringify({ hrRead: !!document.querySelector('.hand-result-overlay .hr-read'), text: (document.querySelector('.hand-result-overlay .hr-read') || {}).innerText || '', pend: !!state.pendingRead })`);
  log('手の結果', hr);
  await shot(tag, 'hand_result');
  const h0 = await ev('return state.handNo');
  await T.nextHand(); await sleep(3500);
  log('次のハンド', await ev(`return JSON.stringify({ hand: state.handNo, was: ${h0}, board: !!document.querySelector('.rd-host'), panyu: state.panyu, success: state.psychSuccessCount })`));
  await close();
}
const hits = which0 === 'both' ? [true, false] : [which0 === 'hit'];
let first = flags.includes('first');
for (const h of hits) { await run(who, h, first, flags.find(f => ['flush', 'straight'].includes(f)) || 'any'); first = false; }
process.exit(0);
