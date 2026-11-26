// 8回目の外部の批評の直しを確かめる。node qa/round8.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round8'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka', 'selina', 'grano'], ownedItems: ['memory_minipoker'] };
const log = {};
async function boot(save = SAVE) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const run = (k) => !ONLY || ONLY.split(',').includes(k);
const errs = (s) => s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
const R = (sel) => `(() => [...document.querySelectorAll('${sel}')].filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }))()`;
const okBtns = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } };

// ヴェルベットの初回の勝ち：「幕間へ」が画面の中に出る
if (run('result')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('velvet'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); state.handNumber = 11; state.playerChips = 4000; state.opponentChips = 0; endBattle(); return 1; })()`);
  await sleep(9000);
  log.result = await page.eval(`JSON.stringify({ vh: innerHeight, btn: ${R('.result-main-btn')}, panel: ${R('.rz-panel')}, scroll: (() => { const p = document.querySelector('.rz-panel'); return p && [p.scrollHeight, p.clientHeight, getComputedStyle(p).overflowY]; })() })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_result.png`));
  log.errResult = errs(s);
  await s.close();
}

// 役くらべ：7枚とも枠の中
if (run('handvs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    state.playerHand = C('Q♥ K♣'); state.community = C('2♣ 7♦ Q♠ 9♥ 4♠'); state.opponentHand = C('K♠ 5♦');
    state.handPhase = 'river'; state.pot = 300; state.currentBetOpponent = 50; state.currentBetPlayer = 0; READ_BATTLE_POOLS.selina.logic = ['handvs']; state.logicPending = true; startReadBattle('logic'); return 1; })()`);
  await sleep(4000); await okBtns(page, 4); await sleep(1500);
  log.handvs = await page.eval(`JSON.stringify({ cards: ${R('#mb-hv-seven .card')}, host: ${R('.read-battle-host .mb-game-root')}, vw: innerWidth })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_handvs.png`));
  log.errHandvs = errs(s);
  await s.close();
}

// 設定：音量のつまみの幅・行の重なり
if (run('settings')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showSettingsModal(); return 1; })()`); await sleep(1200);
  log.settings = await page.eval(`JSON.stringify({ vol: ${R('.settings-modal-volume')}, rows: ${R('.settings-modal-group:first-child .settings-modal-row')}, groups: ${R('.settings-modal-group')}, modal: ${R('.settings-modal')} })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_settings.png`));
  log.errSettings = errs(s);
  await s.close();
}

// 上乗せの欄：4種類の額で、上の道具と重ならない
if (run('bet')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); state.handPhase = 'flop'; state.pot = 200; state.playerChips = 1800; state.opponentChips = 1800; state.currentBetOpponent = 0; state.currentBetPlayer = 0; state.isPlayerTurn = true; state.betChooserOpen = true; render(); return 1; })()`);
  await sleep(1500);
  log.bet = await page.eval(`JSON.stringify({ chooser: ${R('.bet-chooser')}, head: ${R('.bet-chooser-head')}, opts: ${R('.bet-chooser .btn, .bet-chooser button')}, tools: ${R('.audio-bar, .v2-topbar, .battle-topbar, .eq-meter, .equity-meter, .hud-top')} })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_bet.png`));
  log.errBet = errs(s);
  await s.close();
}

// ファイブポーカーの配当表：横に切れない
if (run('five')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return true; })()`); await sleep(2000); await page.eval(`(() => { document.querySelectorAll('[class*=toast]').forEach(e => e.remove()); return 1; })()`);
  await page.eval(`(() => { const b = [...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(1200);
  await page.eval(`(() => { [...document.querySelectorAll(".minipoker-overlay button")].find(b => b.textContent.trim() === "500")?.click(); return 1; })()`); await sleep(800);
  log.five = await page.eval(`JSON.stringify([document.querySelector(".mp-paytable")?.textContent.replace(/s+/g, " ").slice(0, 120)].concat([...document.querySelectorAll('.minipoker-overlay *')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map(e => [e.className, e.scrollWidth, e.clientWidth])))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_five.png`));
  log.errFive = errs(s);
  await s.close();
}

// PC の幕間：相手の立ち絵が大きい版で、引き伸ばしが小さい
if (run('ims')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showIntermission('selina', () => {}); return 1; })()`); await sleep(2500);
  for (let i = 0; i < 8; i++) {
    const r = await page.eval(`(() => { const im = [...document.querySelectorAll('.ims-scene:not(.out) .eps-portrait')].pop(); return im ? JSON.stringify([im.currentSrc.split('/').slice(-2).join('/'), im.naturalHeight, Math.round(im.getBoundingClientRect().height)]) : null; })()`);
    (log.ims = log.ims || []).push(r);
    if (i === 1) await page.screenshot(path.join(OUT, `${W}x${H}_ims.png`));
    await page.eval(`(() => { document.querySelector('.intermission-overlay')?.click(); return 1; })()`); await sleep(1300);
  }
  log.errIms = errs(s);
  await s.close();
}

// 効果音だけ OFF でも声は鳴る・まるごと消音では止まる／クリア後のリコの札／卒業試験の記録
if (run('logic')) {
  const s = await boot({ ...SAVE, clearedStages: [...SAVE.clearedStages, 'velvet'] }); const { page } = s;
  log.voice = await page.eval(`(() => { const o = []; save.sfxOn = false; save.allMute = false; save.voiceOn = true; o.push(MimiVoice.enabled());
    save.sfxOn = true; toggleAllAudio(); o.push(MimiVoice.enabled(), save.allMute); toggleAllAudio(); o.push(MimiVoice.enabled(), save.allMute); return JSON.stringify(o); })()`);
  await page.eval(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(1500);
  log.ricoLabel = await page.eval(`[...document.querySelectorAll('.h15-pl .h15-lbl')].map(e => e.textContent).join(' / ')`);
  log.errLogic = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
