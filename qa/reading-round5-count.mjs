// ほろ酔い・泥酔の本物の流れ（配りは差し替えない）を自動で進め、1対戦あたり おねだり（仕込みの手）／見せ合いっこ が出るかを数える（2026-11-17）。
// node qa/reading-round5-count.mjs onedari|mise 相手(カンマ) 対戦数 [horoyoi|deisui] [最大手数=10] [速さ=6]
// おねだり：2〜5手目の仕込みの手で出る回数・答え（来る／来ない）。見せ合いっこ：ミミはリバーでポット3分の2を賭ける（出番が来た時）。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [kind = 'onedari', oppArg = 'polka', NB0 = '4', night = 'horoyoi', MAXH0 = '10', SPEED0 = '6'] = process.argv.slice(2);
const NB = +NB0, MAXH = +MAXH0, SPEED = +SPEED0;
const OPPS = oppArg.split(',');
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const save = { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true, rdDemo: { onedari: true, mise: true } };
const s = await openSession({ width: 844, height: 390, mobile: true, speed: SPEED, seed: 900 + Math.floor(Math.random() * 1000), save });
const { page } = s;
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object" && !!window.RD && !!RD.plan.onedari').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await ev(`save.endingUnlocked = true; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; ${night === 'deisui' ? `localStorage.setItem('mp_deisui_dev', '1'); save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL)};` : ''} return 1;`);
const results = []; let shots = 0, frozen = false;
for (let b = 0; b < NB && !frozen; b++) {
  const opp = OPPS[b % OPPS.length];
  await ev(`window.__skipEpisodeOnce = true; startBattle(${JSON.stringify(opp)}); return 1;`);
  await sleep(2500 / SPEED + 400);
  for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(700 / SPEED); }
  for (let i = 0; i < 40 && (await ev('return state.screen')) !== 'battle'; i++) await sleep(500);
  let last = '', lastT = Date.now(), maxHand = 0, boosted = -1, picks = 0, rec = { opp, hands: 0, fired: 0, hit: null, rigNo: null, rigHand: null, log: [] };
  const t0 = Date.now();
  while (Date.now() - t0 < 200000 && maxHand < MAXH + 1) {
    const st = JSON.parse(await ev(`return JSON.stringify({ hand: state.handNo, ph: state.handPhase, pot: state.pot, turn: state.isPlayerTurn, scr: state.screen, rd: !!document.querySelector('.rd-host'), game: (document.querySelector('.rd-host .sg') || {}).className || '', cnt: state.rdCount || null, toCall: Math.max(0, (state.currentBetOpponent || 0) - (state.currentBetPlayer || 0)), chips: [state.playerChips, state.opponentChips], rig: state.rdRigHand, rigNo: state.rdRigNo, od: state.rdOnedari ? { hand: state.rdOnedari.hand, hit: state.rdOnedari.hit } : null })`));
    maxHand = Math.max(maxHand, st.hand || 0); rec.hands = maxHand; rec.rigNo = st.rigNo;
    if (st.rig != null) rec.rigHand = st.rig;
    if (st.od && rec.hit == null) rec.hit = st.od.hit;
    rec.fired = kind === 'onedari' ? ((st.cnt || {}).onedari || 0) : ((st.cnt || {}).mise || 0);
    const key = JSON.stringify([st.hand, st.ph, st.pot, st.turn, st.rd, st.scr]);
    if (key !== last) { last = key; lastT = Date.now(); if (process.env.QA_VERBOSE) console.log(' ', key); }
    if (st.scr !== 'battle' && st.hand > 0) { break; }
    if (Date.now() - lastT > 25000) { frozen = true; await page.screenshot(path.join(OUT, `r5count_${kind}_${opp}_frozen.png`)); console.log('固まり', key); break; }
    if (st.ph === 'preflop' && st.hand !== boosted) { boosted = st.hand; await ev(`state.playerChips = Math.max(state.playerChips, 2000); state.opponentChips = Math.max(state.opponentChips, 2000); render(); return 1;`); }
    if (st.rd) {
      const g = (st.game.match(/\b(onedari|mise|igi|furi|mekiki)\b/) || [''])[0];
      if (!rec.log.includes(g + '@' + st.hand)) { rec.log.push(g + '@' + st.hand); if (shots < 8) { shots++; await sleep(1300); await page.screenshot(path.join(OUT, `r5count_${kind}_${opp}_${shots}.png`)); } }
      const sel = picks % 2 === 0 ? '.pay' : '.fold';
      const r = await ev(`const b = [...document.querySelectorAll('.rd-host button')].find(b => b.offsetParent && !b.disabled && /卓へ|次へ|はじめる|めくる|もどる/.test(b.textContent)); if (b) { b.click(); return 'go'; } const o = document.querySelector('.rd-host .opts.on ${sel}') || document.querySelector('.rd-host .opts.on .hide') || document.querySelector('.rd-host .opts.on button'); if (o && !o.disabled) { o.click(); return 'pick'; } return 'none';`);
      if (r === 'pick') picks++;
      await sleep(500 / Math.max(1, SPEED / 4)); continue;
    }
    // 出た後の手が終わるまで進める（済んだら対戦を切り上げる）
    if (rec.fired >= 1 && st.hand > (kind === 'onedari' ? ((st.od || {}).hand || 0) : st.hand) && kind === 'onedari') break;
    const clicked = await ev(`const re = /最初から|次のハンド|圧倒モードへ|閉じる|わかった|OK|スキップ|次へ|続ける|はじめる|対戦開始|^\s*▶?\s*開始/; const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && !b.disabled && re.test(b.textContent) && !b.closest('.rd-host')); if (b) { b.click(); return true; } return false;`);
    if (clicked === true) { await sleep(300); continue; }
    if (st.turn && st.scr === 'battle') {
      if (kind === 'mise' && st.ph === 'river' && st.toCall === 0) await ev(`playerBet('pot_2_3'); return 1;`);
      else await ev(`playerCheckCall(); return 1;`);
    }
    await sleep(300);
  }
  results.push(rec);
  console.log(`対戦${b + 1} ${opp}：手 ${rec.hands}／仕込みの目標手 ${rec.rigNo}／仕込んだ手 ${rec.rigHand}／出た ${rec.fired}／答え（来る=true） ${rec.hit}／場面 ${JSON.stringify(rec.log)}`);
  await ev(`try { endBattle && 0 } catch (e) {} state.screen = 'home'; document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); return 1;`);
  await sleep(300);
}
const fired = results.filter(r => r.fired >= 1).length;
console.log(`${kind} ${night} ${OPPS.join(',')}：${results.length} 対戦中 ${fired} 対戦で出た（${(fired / Math.max(1, results.length) * 100).toFixed(0)}%）` + (kind === 'onedari' ? `／来る ${results.filter(r => r.hit === true).length}・来ない ${results.filter(r => r.hit === false).length}` : ''));
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
console.log('exceptions', JSON.stringify(s.exceptions.slice(0, 3)));
await s.close();
process.exit(frozen ? 1 : 0);
