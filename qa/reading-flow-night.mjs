// ほろ酔いの夜・泥酔の夜の卓を、本物の流れのまま自動で進め、おねだり・見せ合いっこが「自然に」出て、固まらず・例外なく手が進むことを確かめる（2026-11-17）。
// node qa/reading-flow-night.mjs [onedari|mise] [horoyoi:相手|deisui:相手] [手数=8] [速さ=4]
// 出る確率が低い（おねだり：場札4枚で待ちだけ・ミミがペア以上。見せ合いっこ：降りると決めた手が1枚で役）ので、新しい山を切る所（newDeck）だけ「出せる配り」に差し替える。
// ほかは本物：ターンの賭けが済んだらリバー前におねだりが（出る見込み60%・外れは30%に絞る）、見せ合いっこはミミがリバーで賭け（半ポット）、ポルカは降りる（その1か所だけ差し替え）。
// 毎手チップを足して、勝負がつかないようにする。出た時は、画面を進めて（言う→めくる→払う／降りる交互・見せない）、手の後の答え合わせも通す。
import path from 'node:path';
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [kind = 'onedari', which = 'horoyoi:polka', HANDS0 = '8', SPEED0 = '4'] = process.argv.slice(2);
const HANDS = +HANDS0, SPEED = +SPEED0;
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const [nmode, narg] = which.split(':');
const opp = narg || 'polka';
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const save = { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true, rdDemo: { onedari: true, mise: true } };
const s = await openSession({ width: 844, height: 390, mobile: true, speed: SPEED, seed: 4242, save });
const { page } = s;
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object" && !!window.RD && !!RD.plan.onedari').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await ev(`save.endingUnlocked = true; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; ${nmode === 'deisui' ? `localStorage.setItem('mp_deisui_dev', '1'); save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL.slice(0, Math.max(0, ALL.indexOf(opp))))};` : ''} return 1;`);
await ev(`window.__skipEpisodeOnce = true; startBattle(${JSON.stringify(opp)}); return 1;`);
await sleep(2500 / SPEED + 500);
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(800 / SPEED); }
for (let i = 0; i < 40 && (await ev('return state.screen')) !== 'battle'; i++) await sleep(700);
console.log('開始後', await ev(`return state.screen + ' hand ' + state.handNo + ' horoyoi ' + isHoroyoi() + ' deisui ' + !!state.deisui + ' key ' + state.opponentImgKey`));
// 新しい山を「出せる配り」に差し替える（pop の順：ミミ2枚→相手2枚→場札5枚）。おねだりは当たり／外れを交互に
await ev(`
  const orig = newDeck; window.__n = 0;
  const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  newDeck = () => {
    for (let t = 0; t < 60000; t++) {
      const d = orig(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      let sc = null;
      if (${JSON.stringify(kind)} === 'onedari') { sc = RD.plan.onedari({ board: b5.slice(0, 4).map(rb), mine: mine.map(rb), her: her.map(rb), toCall: 0, pot: 300 }, { charKey: state.opponentImgKey, fin: rb(b5[4]), pot: 300 }); if (sc && !!sc.hit !== (window.__n % 2 === 0)) sc = null; }
      else sc = RD.plan.mise({ board: b5.map(rb), mine: mine.map(rb), her: her.map(rb) }, { charKey: 'polka', pot0: 300, bet: 150 });
      if (sc) { window.__n++; return d.slice(9).concat([b5[4], b5[3], b5[2], b5[1], b5[0], her[1], her[0], mine[1], mine[0]]); }
    }
    return orig();
  };
  ${kind === 'mise' ? `window.__decOrig = decideOpponentAction; decideOpponentAction = (p, c, o) => (c.board && c.board.length === 5 && c.toCall > 0) ? { type: 'fold', intent: 'fear' } : window.__decOrig(p, c, o);` : ''}
  return 1;`);
let last = '', lastT = Date.now(), maxHand = 0, rdSeen = 0, frozen = false, hands = new Set(), shots = 0;
const t0 = Date.now(); let picks = 0, boosted = -1;
const log = [];
while (Date.now() - t0 < 300000 && maxHand < HANDS + 1) {
  const st = JSON.parse(await ev(`return JSON.stringify({ hand: state.handNo, ph: state.handPhase, pot: state.pot, turn: state.isPlayerTurn, scr: state.screen, rd: !!document.querySelector('.rd-host'), game: (document.querySelector('.rd-host .sg') || {}).className || '', cnt: state.rdCount || null, pend: !!state.pendingRead, toCall: Math.max(0, (state.currentBetOpponent || 0) - (state.currentBetPlayer || 0)), chips: [state.playerChips, state.opponentChips] })`));
  maxHand = Math.max(maxHand, st.hand || 0);
  if (st.rd) rdSeen++;
  const key = JSON.stringify([st.hand, st.ph, st.pot, st.turn, st.rd, st.scr]);
  if (key !== last) { last = key; lastT = Date.now(); }
  if (st.ph === 'idle' && (st.chips[0] <= 0 || st.chips[1] <= 0)) { console.log('勝負がついた（チップが尽きた）'); break; }
  if (Date.now() - lastT > 25000) { frozen = true; await page.screenshot(path.join(OUT, `flownight_${kind}_${opp}_frozen.png`)); console.log('固まり', key, JSON.stringify(st)); break; }
  // 毎手のはじめにチップを足す
  if (st.ph === 'preflop' && st.hand !== boosted) { boosted = st.hand; await ev(`state.playerChips = Math.max(state.playerChips, 2000); state.opponentChips = Math.max(state.opponentChips, 2000); render(); return 1;`); }
  if (st.rd) {
    if (!log.includes(st.game + '@' + st.hand)) { log.push(st.game + '@' + st.hand); if (shots < 6) { shots++; await sleep(1200); await page.screenshot(path.join(OUT, `flownight_${kind}_${opp}_${shots}.png`)); } }
    // 進める：「めくる」「卓へ」「次へ」。決める所は、払う／降りるを交互に・見せない
    const sel = picks % 2 === 0 ? '.pay' : '.fold';
    const r = await ev(`const b = [...document.querySelectorAll('.rd-host button')].find(b => b.offsetParent && !b.disabled && /卓へ|次へ|はじめる|めくる|もどる/.test(b.textContent)); if (b) { b.click(); return 'go'; } const o = document.querySelector('.rd-host .opts.on ${sel}') || document.querySelector('.rd-host .opts.on .hide'); if (o && !o.disabled) { o.click(); return 'pick'; } return 'none';`);
    if (r === 'pick') picks++;
    await sleep(500); continue;
  }
  const clicked = await ev(`const re = /次のハンド|圧倒モードへ|閉じる|わかった|OK|スキップ|次へ|続ける|はじめる|対戦開始|^\\s*▶?\\s*開始/; const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && !b.disabled && re.test(b.textContent) && !b.closest('.rd-host')); if (b) { b.click(); return true; } return false;`);
  if (clicked === true) { await sleep(400); continue; }
  if (st.turn && st.scr === 'battle') {
    if (kind === 'mise' && st.ph === 'river' && st.toCall === 0) await ev(`playerBet('pot_2_3'); return 1;`);
    else await ev(`playerCheckCall(); return 1;`);
  }
  await sleep(350);
}
const fin = JSON.parse(await ev(`return JSON.stringify({ hand: state.handNo, cnt: state.rdCount || null, success: state.psychSuccessCount, n: window.__n })`));
console.log(`${kind} ${which}：進んだ手 ${maxHand}（目標 ${HANDS}）／リーディング起動 ${JSON.stringify(fin.cnt)}／出た場面 ${JSON.stringify(log)}／決めた回数 ${picks}／読み合い画面が見えた回数 ${rdSeen}／固まり ${frozen ? 'あり' : 'なし'}`);
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
console.log('exceptions', JSON.stringify(s.exceptions.slice(0, 3)));
await s.close();
process.exit(frozen ? 1 : 0);
