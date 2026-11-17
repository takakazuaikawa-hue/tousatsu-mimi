// 本編の卓を自動で数手進め、リーディングが出ても出なくても固まらずに進むことを確かめる（2026-11-17）。
// node qa/reading-flow.mjs [相手|horoyoi[:相手]|deisui[:相手]] [手数=8] [速さ=3]   相手：polka selina grano velvet rico_tutorial / horoyoi（ほろ酔いの夜。:grano のように相手を選ぶ。既定ポルカ）/ deisui（泥酔の夜）
// 数える：進んだ手の数・リーディングの起動回数（state.rdCount。目利き・異議あり・ふり）・固まり（25秒変化なし）・例外
// ふりのボタンが出たら押して、押し出す→払う／降りるで進める（毎回押す）。手の後の答え合わせも通す
import path from 'node:path';
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [which = 'polka', HANDS0 = '8', SPEED0 = '3'] = process.argv.slice(2);
const HANDS = +HANDS0, SPEED = +SPEED0;
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const [nmode, narg] = which.split(':');
const night = nmode === 'horoyoi' || nmode === 'deisui';
const opp = night ? (narg || 'polka') : which;
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const save = { clearedStages: night ? ALL : ALL.slice(0, ALL.indexOf(opp)), introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true, rdDemo: { mekiki: true, igi: true, furi: true, onedari: true, mise: true }, rdRule: { 'mekiki:grano': true, 'mekiki:selina': true, 'mekiki:velvet': true, 'furi:polka': true, 'furi:grano': true, 'furi:selina': true, 'furi:velvet': true } };
if (opp === 'polka' && !night) save.clearedStages = ['rico_tutorial'];
const s = await openSession({ width: 844, height: 390, mobile: true, speed: SPEED, seed: 4242, save });
const { page } = s;
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
if (night) await ev(`save.endingUnlocked = true; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; ${nmode === 'deisui' ? `localStorage.setItem('mp_deisui_dev', '1'); save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL.slice(0, Math.max(0, ALL.indexOf(opp))))};` : ''} return 1;`);
if (night) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /続きから/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(2500); }
await ev(`window.__skipEpisodeOnce = true; startBattle(${JSON.stringify(opp)}); return 1;`);
await sleep(2500 / SPEED + 500);
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(800 / SPEED); }
for (let i = 0; i < 40 && (await ev('return state.screen')) !== 'battle'; i++) { await sleep(700); if (i % 6 === 3 && (await ev('return state.screen')) === 'lobby') await ev(`window.__skipEpisodeOnce = true; startBattle(${JSON.stringify(opp)}); return 1;`); await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|はじめる|スキップ|OK/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); }
console.log('unlock', await ev(`return String(horoyoiUnlocked(${JSON.stringify(opp)})) + ' ' + JSON.stringify(save.horoyoiCleared) + ' ' + save.horoyoiMode`));
console.log('開始後', await ev(`return state.screen + ' hand ' + state.handNo + ' horoyoi ' + isHoroyoi()`));
let hrRead = 0, hrReadSeen = new Set();
let last = '', lastT = Date.now(), maxHand = 0, rdSeen = 0, rdVerd = 0, frozen = false, steps = 0, furiPressed = 0;
const t0 = Date.now();
while (Date.now() - t0 < 280000 && maxHand < HANDS + 1) {
  steps++;
  const st = JSON.parse(await ev(`return JSON.stringify({ hand: state.handNo, ph: state.handPhase, pot: state.pot, turn: state.isPlayerTurn, scr: state.screen, rd: !!document.querySelector('.rd-host'), cnt: state.rdCount || null, pend: !!state.pendingRead, open: !!state.rdOpen, toCall: Math.max(0, (state.currentBetOpponent || 0) - (state.currentBetPlayer || 0)), chips: [state.playerChips, state.opponentChips] })`));
  maxHand = Math.max(maxHand, st.hand || 0);
  if (await ev(`return !!document.querySelector('.hand-result-overlay .hr-read')`) === true && !hrReadSeen.has(st.hand)) { hrReadSeen.add(st.hand); hrRead++; await page.screenshot(path.join(OUT, `fix8_flow_${which.replace(':', '_')}_hr${st.hand}.png`)); }
  if (st.rd) rdSeen++;
  const key = JSON.stringify([st.hand, st.ph, st.pot, st.turn, st.rd, st.scr]);
  if (key !== last) { last = key; lastT = Date.now(); }
  if (st.ph === 'idle' && (st.chips[0] <= 0 || st.chips[1] <= 0)) { console.log('勝負がついた（チップが尽きた）'); break; }
  if (Date.now() - lastT > 25000) { frozen = true; await page.screenshot(path.join(OUT, `flow_${which}_frozen.png`)); console.log('固まり', key, JSON.stringify(st)); break; }
  // 目利き（卓に重ねる形）：見立ての札が卓の上に出たら、1つ選んで「これだ！」
  const mkp = await ev(`const p = document.querySelector('.rdt-panel'); if (!p) return false; const o = p.querySelectorAll('.rdt-opt'); o[${steps} % o.length].click(); setTimeout(() => { const g = p.querySelector('.rdt-btn.go'); if (g) g.click(); }, 300); return true;`);
  if (mkp === true) { rdSeen++; lastT = Date.now(); await sleep(900); continue; }
  // 読み合いの画面：進める（お手本・卓へ・次へ）
  if (st.rd) {
    // ふりの画面：押し方を選び（ちょい押し・ぐい押しを交互。足りなければ押せるほう）、山を押して顔を出す（押さないと払う／降りるが光らない）
    await ev(`const m = [...document.querySelectorAll('.rd-host .sg.live.furi .modes.on .mode')].filter(b => !b.disabled); if (m.length) { m[${steps} % m.length].click(); } return 1;`);
    await ev(`const p = document.querySelector('.rd-host .sg.live.furi .pile'); const lane = document.querySelector('.rd-host .sg.live.furi .lane.on'); if (p && lane && !document.querySelector('.rd-host .sg.live.furi .opts.on')) { const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); } return 1;`);
    await ev(`const b = [...document.querySelectorAll('.rd-host button')].find(b => b.offsetParent && !b.disabled && /卓へ|次へ|はじめる|これだ|もどる|めくる/.test(b.textContent)); if (b) b.click(); else { const o = document.querySelector('.rd-host .opts.on .opt, .rd-host .opts.on .pay, .rd-host .opts.on .hide'); if (o && !o.disabled) o.click(); } return 1;`);
    await sleep(500); continue;
  }
  // 結果・読み合いの出口・演出：閉じる
  const clicked = await ev(`const re = /次のハンド|圧倒モードへ|閉じる|わかった|OK|スキップ|次へ|続ける|はじめる|対戦開始|^\\s*▶?\\s*開始/; const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && !b.disabled && re.test(b.textContent) && !b.closest('.rd-host')); if (b) { b.click(); return true; } return false;`);
  if (clicked === true) { await sleep(400); continue; }
  if (st.turn && st.scr === 'battle' && !st.rd) {
    const fb = await ev(`const b = document.querySelector('[data-action="rd-furi"]'); if (b && b.offsetParent && !b.disabled) { b.click(); return true; } return false;`);
    if (fb === true) { furiPressed++; await sleep(500); continue; }
    // 毎手：チェック／コール。3手に1回は降りて、手を進める
    const fold = (steps % 7 === 0) && st.toCall > 0;
    await ev(`${fold ? 'playerFold()' : 'playerCheckCall()'}; return 1;`);
  }
  await sleep(350);
}
const fin = JSON.parse(await ev(`return JSON.stringify({ hand: state.handNo, cnt: state.rdCount || null, readHand: state.readHandNo, errs: 0 })`));
console.log(`相手 ${which}（ほろ酔い ${await ev('return isHoroyoi()')}・泥酔 ${await ev('return !!state.deisui')}）：進んだ手 ${maxHand}（目標 ${HANDS}）／リーディング起動 ${JSON.stringify(fin.cnt)}／ふりのボタンを押した ${furiPressed}／読み合い画面が見えた回数 ${rdSeen}／手の結果に答えの欄が出た ${hrRead}／固まり ${frozen ? 'あり' : 'なし'}`);
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
console.log('exceptions', JSON.stringify(s.exceptions.slice(0, 3)));
await s.close();
process.exit(frozen ? 1 : 0);
