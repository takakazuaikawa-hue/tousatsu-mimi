// 勝ち抜き戦（2026-11-22）の検査。
//   QA_SIZE=844x390 QA_PART=ui|tables|all node qa/kachinuki.mjs
//   ui     ：今夜の演目→勝ち抜き戦の窓→始める→本当に遊んで1人倒す→次の卓（チップ持ち越し）→負けて記録→続きから
//   tables ：11人全員の卓を1回ずつ開き、絵・台詞・エラーを数えて撮る（2周目は3人だけ）
//   出力 qa/out/kachinuki/<大きさ>/*.png と report.json。headless は1つだけ
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const PART = process.env.QA_PART || 'all';
const OUT = path.resolve(`qa/out/kachinuki/${W}x${H}`); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000 };
const { page, close, exceptions } = await openSession({ width: W, height: H, mobile: W < 900, speed: 4, save: SAVE });
const q = (js) => page.eval(js).catch(e => 'ERR ' + String(e.message).slice(0, 200));
const bad = [];
await page.send('Network.enable').catch(() => {});
page.on('Network.responseReceived', (p) => { if (p.response && p.response.status >= 400) bad.push(p.response.status + ' ' + p.response.url.replace(/^.*127\.0\.0\.1:\d+\//, '')); });
page.on('Network.loadingFailed', (p) => { if (!p.canceled) bad.push('failed ' + (p.errorText || '') + ' ' + p.requestId); });
const report = { ui: {}, tables: [] };
const log = (...a) => console.log(...a);
const shot = (n) => page.screenshot(path.join(OUT, n + '.png'));
// 押せる物を押して進める（本編の窓・説明・次のハンド）
const STEP = (style) => `(() => {
  const vis = (b) => b && b.offsetParent && !b.disabled;
  const pref = ${JSON.stringify(style)} === 'allin' ? ['[data-action="player-allin"]', '[data-action="player-bet"]', '[data-action="player-call"]', '[data-action="player-checkcall"]'] : ['[data-action="player-call"]', '[data-action="player-checkcall"]'];
  const modal = [...document.querySelectorAll('.result-modal button, .mimi-confirm-actions button.mimi-confirm-ok, .coach-layer, .rd-go, .rd-choice, [class*="rd-"] button, .hand-result button, [data-action="next-hand"], [data-action="continue"], [data-action="deal"], [data-action="start-hand"]')].find(vis);
  if (state.isPlayerTurn) { for (const p of pref) { const b = document.querySelector(p); if (vis(b)) { b.click(); return 'act'; } } }
  if (modal) { modal.click(); return 'modal'; }
  const t = [...document.querySelectorAll('button')].find(b => vis(b) && /次のハンド|対戦結果|対戦開始|^OK|閉じる|次へ|わかった|はじめる|卓へ/.test(b.textContent.trim()) && !b.closest('.kn-ov'));
  if (t) { t.click(); return 'btn'; }
  return '';
})()`;
const stateOf = () => q(`JSON.stringify({ scr: state.screen, n: state.handNo, ph: state.handPhase, kn: !!state.kachinuki, opp: state.opponentId, pc: state.playerChips, oc: state.opponentChips, inter: !!document.querySelector('.kn-inter'), end: !!document.querySelector('.kn-end'), say: state.opponentSpeech })`).then(s => { try { return JSON.parse(s); } catch { return {}; } });
const waitFor = async (pred, ms = 20000, step = 250) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await stateOf(); if (pred(s)) return s; await sleep(step); } return null; };
const playUntil = async (pred, style, ms) => { const t0 = Date.now(); let s = {}, last = '', k = 0; while (Date.now() - t0 < ms) { s = await stateOf(); if (pred(s)) return s; last = await q(STEP(style)); if (++k % 40 === 0) console.log('  ..', JSON.stringify(s), 'step=' + last); await sleep(220); } console.log('  stuck', JSON.stringify(s), 'step=' + last); await shot('stuck_' + Date.now()); return null; };
try {
  for (let i = 0; i < 100 && !(await q('typeof startBattle==="function"')); i++) await sleep(300);
  await sleep(1500);
  await q('save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; goLobby()'); await sleep(1500);
  if (PART === 'ui' || PART === 'all') {
    // 1) 今夜の演目 → 勝ち抜き戦の札
    await q('BaccaratUI.openHub()'); await sleep(900); await shot('01_hub');
    report.ui.hubBanner = await q(`!!document.querySelector('.enc-wide') && document.querySelector('.enc-wide').textContent.replace(/\\s+/g,' ').trim()`);
    log('hub banner', report.ui.hubBanner);
    await q(`document.querySelector('.enc-wide').click()`); await sleep(900); await shot('02_window');
    report.ui.windowText = await q(`document.querySelector('.kn-win') && document.querySelector('.kn-win').innerText.replace(/\\s+/g,' ')`);
    log('window', report.ui.windowText);
    // 2) 始める → リコ先輩の卓
    await q(`document.querySelector('[data-kn="fresh"]').click()`);
    let s = await waitFor(x => x.scr === 'battle' && x.kn, 20000);
    report.ui.firstTable = s; log('first table', JSON.stringify(s));
    await sleep(1500); await shot('03_first_table');
    // 3) 本当に遊んで1人倒す。負けたら「もう一度挑戦」で繰り返す（全部押す遊び方）
    let won = null;
    for (let attempt = 1; attempt <= 8 && !won; attempt++) {
      s = await playUntil(x => x.inter || x.end, 'allin', 150000);
      log('attempt', attempt, JSON.stringify(s));
      if (s && s.inter) { won = s; break; }
      if (s && s.end) { if (attempt === 1) { await shot('04_end_early'); report.ui.earlyEndRecord = await q(`JSON.stringify(save.kachinuki)`); } await q(`document.querySelector('[data-kn="again"]').click()`); await waitFor(x => x.scr === 'battle' && x.kn && !x.end, 20000); await sleep(800); }
      else break;
    }
    if (won) {
      await sleep(900); await shot('05_interlude');
      report.ui.interlude = await q(`document.querySelector('.kn-inter').innerText.replace(/\\s+/g,' ')`);
      report.ui.runAfterWin = await q(`JSON.stringify(save.kachinuki.run)`);
      log('interlude', report.ui.interlude); log('run', report.ui.runAfterWin);
      const carried = JSON.parse(report.ui.runAfterWin).chips;
      await q(`document.querySelector('[data-kn="next"]').click()`);
      s = await waitFor(x => x.scr === 'battle' && x.kn && !x.inter, 20000);
      await sleep(1500);
      const t2 = await q(`JSON.stringify({ idx: state.kachinuki.idx, lap: state.kachinuki.lap, opp: state.opponentId, mimi: state.playerChips, oppc: state.opponentChips })`);
      report.ui.secondTable = JSON.parse(t2); report.ui.carried = carried;
      log('second table', t2, 'carried', carried);
      await shot('06_second_table');
      // 4) 次の卓の途中でブラウザを閉じた想定：読み込み直して「続きから」
      await playUntil(x => x.n >= 2, 'call', 60000);
      const beforeReload = await q(`JSON.stringify(save.kachinuki.run)`);
      await q('location.reload()'); await sleep(6000);
      for (let i = 0; i < 100 && !(await q('typeof startBattle==="function"')); i++) await sleep(300);
      await sleep(1500);
      await q('goLobby()'); await sleep(1200);
      await q('BaccaratUI.openHub()'); await sleep(700); await shot('07_hub_resume');
      report.ui.hubBannerResume = await q(`document.querySelector('.enc-wide').textContent.replace(/\\s+/g,' ').trim()`);
      await q(`document.querySelector('.enc-wide').click()`); await sleep(700); await shot('08_window_resume');
      report.ui.windowResume = await q(`document.querySelector('.kn-win').innerText.replace(/\\s+/g,' ')`);
      log('beforeReload', beforeReload); log('resume window', report.ui.windowResume);
      await q(`document.querySelector('[data-kn="resume"]').click()`);
      await waitFor(x => x.scr === 'battle' && x.kn, 20000); await sleep(1200);
      report.ui.resumed = JSON.parse(await q(`JSON.stringify({ idx: state.kachinuki.idx, lap: state.kachinuki.lap, mimi: state.playerChips, oppc: state.opponentChips })`));
      log('resumed', JSON.stringify(report.ui.resumed));
      // 5) 「やめる」の確認 → 記録
      await q(`onAction({ currentTarget: { dataset: { action: 'back-lobby' } } })`); await sleep(700); await shot('09_quit_confirm');
      await q(`document.querySelector('.mimi-confirm-ok').click()`); await sleep(1200); await shot('10_end_quit');
      report.ui.afterQuit = JSON.parse(await q(`JSON.stringify({ run: save.kachinuki.run, best: save.kachinuki.best, totalWins: save.kachinuki.totalWins, runs: save.kachinuki.runs, scr: state.screen, endText: document.querySelector('.kn-end') && document.querySelector('.kn-end').innerText.replace(/\\s+/g,' ') })`));
      log('afterQuit', JSON.stringify(report.ui.afterQuit));
      await q(`document.querySelector('[data-kn="home"]').click()`); await sleep(1000);
      await q('BaccaratUI.openHub()'); await sleep(700); await shot('11_hub_record');
      report.ui.hubBannerAfter = await q(`document.querySelector('.enc-wide').textContent.replace(/\\s+/g,' ').trim()`);
      await q('BaccaratUI.closeHub()');
    } else log('1人も倒せなかった（検査の運）');
  }
  if (PART === 'look') {
    // 大きさ違いの見た目だけ：今夜の演目・窓・勝った後・終わり・卓（早送りの作り物の記録で出す）
    await q('BaccaratUI.openHub()'); await sleep(900); await shot('01_hub');
    await q(`document.querySelector('.enc-wide').click()`); await sleep(800); await shot('02_window');
    await q(`document.querySelector('[data-kn="close"]').click(); (() => { const S = knSave(); S.best = { lap: 2, idx: 5, wins: 16 }; S.totalWins = 27; S.runs = 5; S.run = { lap: 2, idx: 4, chips: 3120, wins: 15, coins: 2200, tableMimi: 3120, tableOpp: null }; })()`);
    await q('BaccaratUI.openHub()'); await sleep(700); await shot('03_hub_resume');
    await q(`document.querySelector('.enc-wide').click()`); await sleep(800); await shot('04_window_resume');
    await q(`document.querySelector('.kn-win').remove(); knShowInterlude({ slot: KN_ORDER[10], coin: 200, bonus: 0, lapClear: true, lapCoin: 2000, clearedLap: 1, newRec: true }); 1`); await sleep(800); await shot('05_interlude_lapclear');
    await q(`document.querySelector('.kn-inter').remove(); knShowInterlude({ slot: KN_ORDER[3], coin: 300, bonus: 40, lapClear: false, lapCoin: 0, clearedLap: 3, newRec: false }); 1`); await sleep(800); await shot('06_interlude');
    await q(`document.querySelector('.kn-inter').remove(); knShowEnd({ reason: 'lose', slot: KN_ORDER[8], lap: 2, idx: 9, wins: 19, coins: 4100, chips: 0, newRec: true }); 1`); await sleep(800); await shot('07_end_lose');
    await q(`document.querySelector('.kn-end').remove(); 1`);
  }
  if (PART === 'tables' || PART === 'all') {
    await q('goLobby()'); await sleep(1000);
    const plan = [...Array(11).keys()].map(i => [1, i]).concat([[2, 0], [2, 5], [2, 10]]);
    for (const [lap, idx] of plan) {
      const tag = `L${lap}_${String(idx + 1).padStart(2, '0')}`;
      await q(`(() => { const S = knSave(); S.run = { lap: ${lap}, idx: ${idx}, chips: 1500, wins: ${idx}, coins: 0, tableMimi: 1500, tableOpp: null }; knStartTable(); return 1; })()`);
      const s = await waitFor(x => x.scr === 'battle' && x.kn && x.opp, 25000);
      await sleep(1200);
      // 卓の始まり（対戦開始の前）
      await shot(tag + '_a_prestart');
      for (let i = 0; i < 8 && (await stateOf()).n < 1; i++) { await q(STEP('call')); await sleep(600); }
      await sleep(900);
      const says = new Set();
      const t0 = Date.now(); let maxHand = 0;
      while (Date.now() - t0 < 9000) { const x = await stateOf(); if (x.say) says.add(String(x.say).replace(/<[^>]+>/g, '')); maxHand = Math.max(maxHand, x.n || 0); if (x.end || x.inter) break; await q(STEP('call')); await sleep(250); }
      const info = JSON.parse(await q(`(() => { const imgs = [...document.querySelectorAll('.battle-screen img')].filter(i => i.offsetParent && /assets\\/characters\\//.test(i.src)); return JSON.stringify({ name: state.opponentName, key: state.opponentImgKey, mimi: state.playerChips + (state.pot||0), opp: state.opponentChips, ante: anteForHand(Math.max(1, state.handNo)), imgs: imgs.map(i => i.src.replace(/^.*assets\\/characters\\//, '') + ':' + i.naturalWidth), oppImgOk: imgs.some(i => i.naturalWidth > 0 && new RegExp(state.opponentImgKey + '_').test(i.src)), bg: document.body.dataset.oppBg, style: state.opponentProfile && state.opponentProfile.style, hand: state.handNo, speech: state.opponentSpeech }); })()`));
      await shot(tag + '_b_play');
      const row = { tag, ...info, says: [...says], hands: maxHand, errs: await q('window.__QA.errors.length') };
      report.tables.push(row);
      log(tag, JSON.stringify({ n: row.name, oppImgOk: row.oppImgOk, ante: row.ante, opp: row.opp, bg: row.bg, says: row.says.slice(0, 4), errs: row.errs }));
    }
  }
  report.errors = await q('JSON.stringify(window.__QA.errors)');
  report.exceptions = exceptions;
  report.badRequests = [...new Set(bad)];
  log('errors', report.errors); log('exceptions', JSON.stringify(exceptions)); log('badRequests', JSON.stringify(report.badRequests));
  fs.writeFileSync(path.join(OUT, `report_${PART}.json`), JSON.stringify(report, null, 1));
} finally { await close(); }
