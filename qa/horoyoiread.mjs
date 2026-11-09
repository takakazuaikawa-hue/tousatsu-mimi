// ほろ酔いの夜の読み合い（見えちゃった札 peek・ぼやけた手札 blur）を卓の本当の手で最後まで通して撮る。
// node qa/horoyoiread.mjs <peek|blur> [844x390] [相手id] [water]   出力: qa/out/horoyoiread/<game>_<size>_<who>_*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const game = process.argv[2] || 'peek';
const [W, H] = (process.argv[3] || '844x390').split('x').map(Number);
const who = process.argv[4] || 'selina';
const water = process.argv.includes('water');
const OUT = path.resolve('qa/out/horoyoiread'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3 });
const { page } = s;
const tag = `${game}_${W}x${H}_${who}${water ? '_water' : ''}`;
const shot = (n) => page.screenshot(path.join(OUT, `${tag}_${n}.png`));
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.offsetParent && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await ev(`save.coins = 900; save.introPlayed = true; save.houseRulesSeen = true; save.readIntroSeen = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1200);
await ev(`startBattleInternal('${who === 'rico' ? 'rico_tutorial' : who}')`); await sleep(3500);
for (let t = 0; t < 5; t++) { await click('対戦へ') || await click('対戦開始') || await click('はじめる'); await sleep(1500); }
await sleep(1500);
// 卓の本当の手：この読み合いが成り立つ場面を探して置く
const found = await page.eval(`(() => {
  const M = window.MB, D = M.deck(), ph = ['flop', 'turn', 'river'];
  const rnd = (n) => Math.floor(Math.random() * n);
  for (let t = 0; t < 4000; t++) {
    const d = D.slice(); for (let i = d.length - 1; i > 0; i--) { const j = rnd(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
    const nb = 3 + rnd(3), mine = d.slice(0, 2), her = d.slice(2, 4), board = d.slice(4, 4 + nb);
    const T = { board, mine, her };
    if (!M.${game === 'peek' ? 'peekMatters' : 'blurMatters'}(T, '${who}')) continue;
    const S = { s: '♠', h: '♥', d: '♦', c: '♣' }, toC = (c) => ({ rank: c.r, suit: S[c.s] });
    state.playerHand = mine.map(toC); state.opponentHand = her.map(toC); state.community = board.map(toC);
    state.handPhase = ph[nb - 3]; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0;
    state.handActs = [{ ph: ph[nb - 3], t: 'bet', a: 100 }]; state.psychPending = true; state.pendingRead = null; state.readHandNo = -1;
    return JSON.stringify({ nb, mine: mine.map(M.label), her: her.map(M.label), board: board.map(M.label) });
  } return 'none';
})()`);
console.log('scene', found);
console.log('ready', await page.eval(`JSON.stringify({ horoyoi: isHoroyoi(), key: readPoolKey(), logic: readBattleReady('logic'), psych: readBattleReady('psych'), pick: pickReadBattle('logic'), peekOK: READ_GAME_OK.peek(), blurOK: READ_GAME_OK.blur() })`));
await ev(`READ_BATTLE_POOLS_HOROYOI[state.opponentImgKey].logic = ['${game}']; startReadBattle('logic')`);
await sleep(3500);
await shot('0_start');
await click('わかった'); await sleep(1200);
await shot('1_q1');
const text = async () => page.eval(`document.querySelector('.mb-host') ? document.querySelector('.mb-host').innerText.replace(/\s+/g, ' ').slice(0, 900) : 'none'`);
console.log('q1 text:', await text());
// 1問目：先頭から順に押す（間違いも入る）。2回押した所で撮る
const sel = game === 'peek' ? '.nq-tile' : '.bl-c';
let shots = 0;
for (let i = 0; i < 24; i++) {
  const done = await page.eval(`(() => { const q2 = document.querySelector('.is-q2'); if (q2) return true; const b = [...document.querySelectorAll('${sel}')].find(b => !b.disabled); if (!b) return true; b.click(); return false; })()`);
  await sleep(450);
  if (!done && ++shots === 2) await shot('2_q1mid');
  if (done) break;
}
await sleep(500); await shot('3_q1done');
await sleep(2200);
await shot('4_q2');
console.log('q2 text:', await text());
if (game === 'blur' && water) { await click('お水を飲む'); await sleep(900); await shot('4b_water'); console.log('water text:', await text()); }
await click('付いていく') || await click('賭ける'); await sleep(1200);
await shot('5_wager');
await click('確信'); await sleep(1500);
await shot('6_entrust');
await click('卓にもどる'); await sleep(1500);
console.log('pending', await page.eval(`JSON.stringify(state.pendingRead ? { pick: state.pendingRead.pick, truth: state.pendingRead.truth, mimiEq: state.pendingRead.mimiEq, need: state.pendingRead.need, herWeak: state.pendingRead.herWeak, base: state.pendingRead.base, truthText: state.pendingRead.truthText, extra: state.pendingRead.extra } : null)`));
await ev(`showReadVerdict()`); await sleep(5200);
await shot('7_verdict');
console.log('verdict text:', await text());
console.log('errors', JSON.stringify(s.exceptions).slice(0, 800));
await s.close(); process.exit(0);
