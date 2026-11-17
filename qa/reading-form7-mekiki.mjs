// 目利き（卓に重ねる形）を、本物の卓の流れで通して撮る（2026-11-17）。
// node qa/reading-form7-mekiki.mjs [相手=grano|selina|velvet] [WxH=844x390] [hit|miss=hit] [first=お手本から（既定は見た後）] [最後に見立てを選ぶ前に止める: pickonly]
// 流れ：配りを「目利きが出せる形」に差し替え（山の上の5枚で印が成り立つ・印が2つ以上で、フロップとリバーにも印）→ プリフロップの終わり（advanceAfterCall）→ 卓でフロップ・ターン・リバーが本当にめくれる
//   → 各ストリートの反応と印を卓の上に重ねる → リバーの後に見立て3つ → 選ぶ → 結果（当たりは相手の手札が卓で表に）。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [ck = 'grano', size = '844x390', want = 'hit', first = ''] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const isFirst = first === 'first';
const T = await open(ck, { W, H, speed: +process.env.SPEED || 1, save: isFirst ? {} : { rdDemo: { mekiki: true }, rdRule: { ['mekiki:' + ck]: true } } });
const { ev, log, shot, waitFor, page } = T;
const tag = `form7_mekiki_${ck}_${want}${isFirst ? '_first' : ''}`;
log('--- ' + tag);
const found = JSON.parse(await ev(`
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  for (let n = 0; n < 20000; n++) {
    const d = shuffle(newDeck()); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
    const sc = RD.plan.mekiki({ board: b5.map(rb), her: her.map(rb), mine: mine.map(rb) }, { charKey: state.opponentImgKey });
    if (!sc) continue;
    if (state.opponentImgKey === 'selina' ? sc.pins.length < 1 : (sc.pins.length < 2 || !sc.pins.some(i => i < 3) || !sc.pins.includes(4) && !sc.pins.includes(3))) continue;   // セリナの印は、役が上がった最後の1回だけ
    if (state.opponentImgKey === 'velvet' && sc.fake == null) continue;
    state.playerHand = mine; state.opponentHand = her; state.community = []; state.handPhase = 'preflop';
    state.deck = d.slice(9).concat([b5[4], b5[3], b5[2], b5[1], b5[0]]);
    return JSON.stringify({ n, sc: { board: sc.board, hole: sc.hole, pins: sc.pins, fake: sc.fake, ans: sc.ans, opts: sc.opts.map(o => o.label) } });
  }
  return JSON.stringify(null);`));
if (!found) { log('場面が見つからない'); await T.close(); process.exit(1); }
log('場面', JSON.stringify(found));
await ev(`
  state.pot = 200; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 900); state.opponentChips = Math.max(state.opponentChips, 900);
  state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; state.rdShown = null; state.rdMk = null; state.rdMkGate = -1; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
  render(); return 1;`);
await sleep(500);
await ev(`window.__rand0 = rand; rand = () => 0.01; try { advanceAfterCall(); } finally { rand = window.__rand0; } return 1;`);
if (isFirst) {
  await waitFor(`!!document.querySelector('.rd-host .sg.demo .rico.on')`, 20000); await sleep(400); await shot(tag, 'demo_board');
  await waitFor(`!!document.querySelector('.rd-host .sg.demo .panel.on')`, 60000); await sleep(300); await shot(tag, 'demo_card4');
  await ev(`const b = document.querySelector('.rd-host .panel.on .pgo'); if (b) b.click(); return 1;`);
}
log('rdMk', await ev(`return JSON.stringify(state.rdMk && { hand: state.rdMk.hand, ck: state.rdMk.ck, board: state.rdMk.board, pins: state.rdMk.sc.pins })`));
// 流れを進める：反応が出ている間は撮る。ミミの番は毎回チェック／コール。見立ての札が出たら選ぶ
let lastMarks = -1, shots = 0, picked = false, t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const st = JSON.parse(await ev(`return JSON.stringify({ ph: state.handPhase, turn: state.isPlayerTurn, pend: state.psychPending, marks: document.querySelectorAll('.rdt-mk').length, panel: !!document.querySelector('.rdt-panel.on'), win: !!document.querySelector('.rdt-win.on'), open: !!state.rdOpen, pr: !!state.pendingRead, toCall: Math.max(0, (state.currentBetOpponent || 0) - (state.currentBetPlayer || 0)), n: state.community.length })`));
  if (st.marks !== lastMarks && st.marks > 0) { lastMarks = st.marks; await sleep(900); await shot(tag, `${st.ph}_marks${st.marks}`); }
  if (st.panel && !picked) {
    picked = true;
    await sleep(800); await shot(tag, 'pick_panel');
    // 選ぶ：当たり＝正しい番号／外れ＝ちがう番号
    const sel = JSON.parse(await ev(`return JSON.stringify(document.querySelectorAll('.rdt-opt').length)`));
    const ans = +(await ev(`return state.rdMk ? state.rdMk.sc.ans : ${found.sc.ans}`)),   // 卓で出した場面（見立ての外れの2つは作り直されるので、卓の方の答えを使う）
    idx = want === 'hit' ? ans : (ans + 1) % 3;
    await ev(`document.querySelectorAll('.rdt-opt')[${idx}].click(); return 1;`);
    await sleep(500); await shot(tag, 'pick_selected');
    await ev(`document.querySelector('.rdt-btn.go').click(); return 1;`);
    await sleep(900); await shot(tag, 'result');
    await sleep(1500);
    await shot(tag, 'after_result');
    break;
  }
  if (st.turn && !st.pend && !st.panel && st.ph !== 'idle') { await ev(`playerCheckCall(); return 1;`); }
  await sleep(300);
}
await ev(`rand = window.__rand0; return 1;`);
log('終わり', await ev(`return JSON.stringify({ phase: state.handPhase, open: !!state.rdOpen, pend: !!state.pendingRead, count: state.rdCount, layer: !!document.querySelector('.rdt-layer') })`));
await T.close();
