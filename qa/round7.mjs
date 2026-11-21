// 7回目の外部の批評の直しを確かめる。node qa/round7.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round7'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka'], ownedItems: ['memory_minipoker'] };
const log = {};
async function boot(save = SAVE) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const run = (k) => !ONLY || ONLY.split(',').includes(k);
const errs = (s) => s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
const SETUP = (hand, board, opp, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) })); state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${opp}'); ${extra} return true; })()`;
const okBtns = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } };
const R = (sel) => `(() => [...document.querySelectorAll('${sel}')].filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }))()`;

// 本編の上乗せ欄：手札と場札に重ならない
if (run('bet')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('velvet'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('A♠ A♦', '2♥ 7♣ A♥ 9♦ Q♠', 'K♠ 5♦', `state.handPhase = 'river'; state.pot = 1800; state.playerChips = 1400; state.currentBetOpponent = 0; state.currentBetPlayer = 0; state.isPlayerTurn = true; state.betChooserOpen = true; render();`));
  await sleep(1500);
  log.bet = await page.eval(`JSON.stringify({ chooser: ${R('.bet-chooser')}, head: ${R('.bet-chooser-head')}, hand: ${R('.v2-hand .card, .player-hand .card')}, board: ${R('.community-cards .card, .v2-board .card')} })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_bet.png`));
  log.errBet = errs(s);
  await s.close();
}

// ダウト：発言の欄が横に広い
if (run('doubt')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♥ K♣', '2♣ 7♦ Q♠ 9♥ J♣', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:doubt', '1'); } catch (e) {} state.handPhase = 'river'; state.pot = 300; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'river', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.polka.psych = ['doubt']; state.psychPending = true; startReadBattle('psych');`));
  await sleep(4000); await okBtns(page, 4);
  await page.eval(`(() => { document.querySelector('#mb-doubt-start')?.click(); return 1; })()`); await sleep(2600);
  log.doubt = await page.eval(`JSON.stringify({ bubble: ${R('.doubt-bubble')}, area: ${R('#mb-dx-area')}, win: ${R('.doubt-win')}, text: document.querySelector('.doubt-text')?.textContent })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_doubt.png`));
  log.errDoubt = errs(s);
  await s.close();
}

// 同じ役どうしの決着の1行
if (run('tie')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove());
    const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1), label: x.slice(0, -1) }));
    state.playerHand = C('8♠ 5♦'); state.opponentHand = C('J♣ 8♣'); state.community = C('8♥ 5♣ J♦ 2♠ 3♥');
    const pEv = evaluateHand(state.playerHand.concat(state.community)), oEv = evaluateHand(state.opponentHand.concat(state.community));
    state.equityHistory = []; state.playerChips = 900; state.opponentChips = 3100;
    state.handResults = [{ hand: state.handNo, winner: 'opponent', reason: 'showdown', pot: 400, pEv, oEv }];
    document.querySelectorAll('.hand-result-overlay').forEach(e => e.remove()); showHandResultBanner(); return true; })()`);
  await sleep(1500);
  log.tie = await page.eval(`(() => { const t = document.querySelector('.hr-tiebreak'); const c = document.querySelector('.hr-card'); const b = document.querySelector('#continue-hand-btn'); return JSON.stringify({ text: t?.textContent, fs: t && getComputedStyle(t).fontSize, rect: t && [Math.round(t.getBoundingClientRect().top), Math.round(t.getBoundingClientRect().bottom)], btn: b && [Math.round(b.getBoundingClientRect().top), Math.round(b.getBoundingClientRect().bottom)], scroll: c && [c.scrollHeight, c.clientHeight] }); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_tie.png`));
  log.errTie = errs(s);
  await s.close();
}

// 設定・衣装閲覧・交換所
if (run('misc')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(1500);
  await page.eval(`(() => { showSettingsModal(); return 1; })()`); await sleep(1000);
  log.settings = await page.eval(`JSON.stringify({ vol: ${R('.settings-modal-volume')}, groups: ${R('.settings-modal-group')} })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_settings.png`));
  await page.eval(`(() => { document.querySelectorAll('.settings-overlay').forEach(e => e.remove()); showRicoViewer(); return 1; })()`); await sleep(1200);
  log.wardrobe = await page.eval(`(() => { const fs = (sel) => [...document.querySelectorAll(sel)].map(e => Math.round(e.getBoundingClientRect().height ? parseFloat(getComputedStyle(e).fontSize) * (document.querySelector('#stage').getBoundingClientRect().width / document.querySelector('#stage').offsetWidth) : 0)); return JSON.stringify({ text: fs('.rico-viewer-card-text').slice(0, 2), tag: fs('.rico-viewer-card-tag').slice(0, 1), close: ${R('.rico-viewer-close')}, nav: ${R('.rico-viewer-nav')}, panel: ${R('.rico-viewer-panel')} }); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_wardrobe.png`));
  await page.eval(`(() => { document.querySelectorAll('.rico-viewer-overlay').forEach(e => e.remove()); onAction({ currentTarget: { dataset: { action: 'open-shop' } } }); return 1; })()`); await sleep(2500);
  log.shop = await page.eval(`JSON.stringify([...document.querySelectorAll('.sh3-who')].slice(0, 6).map(e => e.textContent + ' ' + Math.round(e.getBoundingClientRect().height)))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_shop.png`));
  log.errMisc = errs(s);
  await s.close();
}

// ファイブポーカー：勝負の途中で読み直すと半額が戻る
if (run('five')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = [...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(800);
  const c0 = await page.eval(`save.coins`);
  await page.eval(`(() => { document.querySelector('[data-mp="deal"]')?.click(); return 1; })()`); await sleep(2500);
  const c1 = await page.eval(`save.coins`); const st = await page.eval(`save.minipoker.openStake`);
  await page.eval(`(() => { location.reload(); return 1; })()`); await sleep(1500);
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(3000);
  const c2 = await page.eval(`save.coins`); const st2 = await page.eval(`save.minipoker.openStake || 0`);
  log.five = { before: c0, afterBet: c1, openStake: st, afterReload: c2, openStakeAfter: st2, toast: await page.eval(`[...document.querySelectorAll('.toast, [class*=toast]')].map(e => e.textContent).join(' | ').slice(0, 120)`) };
  log.errFive = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
