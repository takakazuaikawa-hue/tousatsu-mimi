// 直した画面の写真（844x390・qa/out/reading/fix6_*）。node qa/reading-fix6-shots.mjs <mekiki|furi|onedari>
//  mekiki：A♠K♦Q♣J♥10♠9♦ のストレートで、光る札が5枚か（Codex mekiki_six と同じ形）
//  furi：合図に合う手のどれでもミミの勝ち負けが決まらない形（運しだい）を作り、決める画面に「この形は運しだい」が出るか
//  onedari：セリナの初回（お手本→4点の札）。4点目が「あと9枚…」の読み方だけか
import { open, cardsJs } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [which = 'mekiki'] = process.argv.slice(2);
if (which === 'mekiki') {
  const T = await open('grano', { speed: 3, save: { rdDemo: { mekiki: true }, rdRule: { 'mekiki:grano': true } } });
  try {
    await T.ev(`${cardsJs} battleGen++; state.playerHand = CS('8c 7d'); state.opponentHand = CS('As Kd'); state.community = CS('Qc Jh Ts 9d'); state.deck = CS('2c'); state.handPhase = 'turn'; state.pot = 400; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.pendingRead = null; state.readHandNo = -1; state.rdCount = {}; state.rdOpen = null; state.psychPending = false; state.isPlayerTurn = false; render(); window.__r = rand; rand = () => 0.01; advanceAfterCall(); return 1;`);
    await T.waitFor(T.q('.sg.live .opts.on')); await T.ev('rand = window.__r; return 1;'); await sleep(500); await T.shot('fix6_mekiki_six', 'pick');
    await T.ev(`const b = [...document.querySelectorAll('.sg.live .opt')].find(b => b.querySelector('b').textContent === 'ストレート'); b.click(); return 1;`); await T.click('.sg.live .go');
    await T.waitFor(T.q('.sg.live .opt.ok')); await sleep(800); await T.shot('fix6_mekiki_six', 'reveal');
    console.log('光っている札', await T.ev(`return [...document.querySelectorAll('.sg.live .cd.glow')].map(e => e.textContent).join(' / ') + ' ＝ ' + document.querySelectorAll('.sg.live .cd.glow').length + '枚'`));
  } finally { await T.close(); }
}
if (which === 'furi') {
  const T = await open('selina', { speed: 3, save: { rdDemo: { furi: true }, rdRule: { 'furi:selina': true } } });
  try {
    const f = JSON.parse(await T.ev(`
      const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
      const cs = (a) => a.map(c => ({ rank: c.rank, suit: c.suit }));
      for (let n = 0; n < 40000; n++) {
        const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
        if (evaluateHand(mine.concat(b5)).rank < 1) continue;
        const sc = RD.plan.furi({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'selina', intent: 'value', toCall: 400, pot: 1000 });
        if (!sc || RD.furiEngine.scoreable(Object.assign({}, sc, { char: 'selina' }))) continue;
        const lab = (c) => c.label + c.suit;
        return JSON.stringify({ n, mine: mine.map(lab).join(' '), her: her.map(lab).join(' '), board: b5.map(lab).join(' ') });
      }
      return 'null';`));
    console.log('運しだいの形', JSON.stringify(f));
    if (f) {
      const L = (s) => s.replace(/♠/g, 's').replace(/♥/g, 'h').replace(/♦/g, 'd').replace(/♣/g, 'c').replace(/10/g, 'T');
      await T.bet({ phase: 'river', board: L(f.board), her: L(f.her), mine: L(f.mine), pot: 600, intent: 'value', rdCount: { igi: 3 } });
      await T.waitFor('state.isPlayerTurn'); await T.ev(`if (typeof dismissCutIn === 'function') dismissCutIn(); return 1;`); await sleep(700); await T.ev(`document.querySelector('[data-action="rd-furi"]').click(); return 1;`);   // 賭けのカットインが出ていると、1回目の押下は閉じるだけ
      await T.waitFor(T.q('.sg.live .lane.on'));
      for (let i = 0; i < 2; i++) { await T.ev(`const p = document.querySelector('.sg.live .pile'); p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 })); p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 })); return 1;`); await sleep(500); }
      await T.waitFor(T.q('.sg.live .opts.on')); await sleep(600); await T.shot('fix6_furi_luck', 'pick');
      console.log('決める画面の1行', await T.ev(`return document.querySelector('.sg.live .ins').textContent`));
      await T.ev(`document.querySelector('.sg.live .opt[data-a="降りる"]').click(); return 1;`); await T.waitFor("!document.querySelector('.rd-host')");
      await sleep(2500);
      console.log('pendingRead（運しだいなら null）', await T.ev('return JSON.stringify(state.pendingRead)'));
    }
  } finally { await T.close(); }
}
if (which === 'onedari') {
  const T = await open('selina', { night: 'horoyoi', speed: 4, save: {} });
  try {
    const f = JSON.parse(await T.ev(`
      const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
      for (let n = 0; n < 200000; n++) {
        const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
        const sc = RD.plan.onedari({ board: b5.slice(0, 4).map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'selina', fin: rb(b5[4]), pot: 600 });
        if (!sc) continue;
        state.playerHand = mine; state.opponentHand = her; state.community = b5.slice(0, 4); state.deck = [b5[4]]; state.handPhase = 'turn';
        return JSON.stringify({ n, sc });
      }
      return 'null';`));
    console.log('場面', JSON.stringify(f && f.sc));
    await T.ev(`state.handNo += 1; state.pot = 600; state.playerChips = 2000; state.opponentChips = 2000; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.pendingRead = null; state.rdCount = {}; state.readHandNo = -1; state.rdOnedari = null; state.rdRigHand = -1; state.rdShown = null; state.rdOpen = null; state.psychPending = false; state.psychResolved = false; state.isPlayerTurn = false; state.handActs = []; render(); window.__qr = rand; rand = () => 0.01; advanceAfterCall(); return 1;`);
    await T.waitFor(T.q('.sg.demo .panel.on'), 120000); await sleep(400); await T.shot('fix6_onedari_selina', 'card4');
    console.log('4点の札', await T.ev(`return [...document.querySelectorAll('.sg.demo .panel .pi')].map(e => e.textContent).join(' ／ ')`));
  } finally { await T.close(); }
}
process.exit(0);
