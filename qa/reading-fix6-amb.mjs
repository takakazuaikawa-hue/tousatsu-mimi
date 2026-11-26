// Codex の再現（qa/out/codexread5/ambiguous-play.mjs）と同じ場面を、直した後の本物の卓の流れで試す（2026-11-17）。node qa/reading-fix6-amb.mjs
//  おねだり：セリナ「あと9枚」・ヴェルベット「赤いの」の2問ずつ／見せ合いっこ：Kのペア同士で隠れ札だけ 3d・Jd。
//  どれも同じ形で配り、乱数は最低（出る側）に固定して、リーディングが出ないこと（.rd-host も state.rdOnedari も無い）を確かめる。対照として、答えが決まる場面（出る）も1つ通す。
import { open, cardsJs } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const sv = { rdDemo: { onedari: true, mise: true }, rdCount: {} };
const res = [];
async function oneCase(T, kind, a) {
  const js = kind === 'one'
    ? `${cardsJs} battleGen++; state.handNo += 1; state.playerHand = CS(${JSON.stringify(a.mine)}); state.opponentHand = CS(${JSON.stringify(a.her)}); state.community = CS(${JSON.stringify(a.board)}); state.deck = [C(${JSON.stringify(a.fin)})]; state.handPhase = 'turn';
       state.pot = 600; state.playerChips = 2000; state.opponentChips = 2000; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.pendingRead = null; state.rdCount = {}; state.readHandNo = -1; state.rdOnedari = null; state.rdRigHand = -1; state.rdShown = null; state.rdOpen = null; state.psychPending = false; state.psychResolved = false; state.isPlayerTurn = false; state.handActs = []; render(); window.__qr = rand; rand = () => 0.01; advanceAfterCall(); return 1;`
    : `${cardsJs} battleGen++; state.handNo += 1; state.playerHand = CS('Kh Td'); state.opponentHand = CS(${JSON.stringify(a.her)}); state.community = CS('Kd 9c 7s 5h 2c'); state.handPhase = 'river';
       state.pot = 1000; state.playerChips = 2000; state.opponentChips = 2000; state.currentBetPlayer = 400; state.currentBetOpponent = 0; state.pendingRead = null; state.rdCount = {}; state.readHandNo = -1; state.rdOnedari = null; state.rdRigHand = -1; state.rdShown = null; state.rdOpen = null; state.psychPending = false; state.psychResolved = false; state.isPlayerTurn = false; state.handActs = []; render(); window.__qr = rand; rand = () => 0.01; opponentTurnDecide(); return 1;`;
  await T.ev(js);
  const shown = await T.waitFor(`!!document.querySelector('.rd-host .sg.live')`, 5000);
  await T.ev('rand = window.__qr; return 1;');
  const st = await T.ev(`return JSON.stringify({ host: !!document.querySelector('.rd-host'), rdOnedari: !!state.rdOnedari, cnt: state.rdCount, phase: state.handPhase })`);
  res.push({ kind, ...a, appeared: !!shown, st: JSON.parse(st) });
  console.log(kind, a.key || 'polka', a.her, shown ? '出た' : '出ない', st);
  if (shown) { await T.shot(`fix6_amb_${kind}_${a.key || 'polka'}`, 'appeared'); }
}
for (const [charKey, board, mine, fin, hands] of [
  ['selina', 'Ks 9h 4h 2s', 'Kd Jc', '6h', ['Ah 7h', 'As 7s']],
  ['velvet', 'Ks 9c 4s 2c', 'Kd Jh', '6s', ['As 7s', 'Ac 7c']],
  ['polka', 'Qd Th 5h 3s', 'As Qc', '2h', ['Kh 8h']],   // 対照：答えが決まる場面（♥待ちが来る）
]) {
  const T = await open(charKey, { night: 'horoyoi', speed: 3, save: sv });
  try { for (const her of hands) await oneCase(T, 'one', { key: charKey, board, mine, fin, her }); } finally { await T.close(); }
}
{
  const T = await open('polka', { night: 'horoyoi', speed: 3, save: sv });
  try { for (const her of ['Kc 3d', 'Kc Jd']) await oneCase(T, 'mise', { her }); } finally { await T.close(); }
}
console.log(JSON.stringify(res.map(r => ({ kind: r.kind, key: r.key || 'polka', her: r.her, appeared: r.appeared }))));
process.exit(0);
