// 4回目の外部の批評の直しを確かめる。node qa/round4.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round4'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka'], ownedItems: ['memory_minipoker'] };
const log = {};
async function boot(save = SAVE) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const run = (k) => !ONLY || ONLY.split(',').includes(k);
// 設定：各切替の中央を押した時に当たる要素
if (run('settings')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(1500);
  await page.eval(`(() => { showSettingsModal(); return true; })()`).catch(() => {});
  for (let i = 0; i < 20 && await page.eval("!!document.querySelector('.loading-veil.on')"); i++) await sleep(500);
  await sleep(800);
  log.settings = await page.eval(`(() => { const out = []; const body = document.querySelector('.settings-modal-body') || document.querySelector('.settings-modal'); document.querySelectorAll('.settings-modal-toggle').forEach(sw => { sw.scrollIntoView({ block: 'center' }); const r = sw.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.push((sw.getAttribute('aria-label') || sw.className) + ' => ' + (hit === sw || sw.contains(hit) ? 'OK' : 'NG ' + (hit && (hit.className || hit.tagName)) + ' ' + (hit && hit.textContent.slice(0, 20)))); }); return JSON.stringify(out); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_settings.png`));
  log.errS = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
const SETUP = (hand, board, opp, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) })); state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${opp}'); ${extra} return true; })()`;
const okBtns = (page, n = 6) => (async () => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } })();
// 1 「はじめる」の二重押し
if (run('double')) {
  const s = await boot({ introPlayed: false, clearedStages: [], coins: 0 }); const { page } = s;
  await page.eval(`(() => { const b = document.querySelector('[data-action="start"]'); window.__btn = b ? (b.dataset.action || b.className) : 'none'; if (b) { b.click(); b.click(); } return true; })()`);
  log.dblBtn = await page.eval('window.__btn');
  await sleep(4000);
  for (let i = 0; i < 40; i++) { const st = await page.eval(`!!document.querySelector('.story-overlay')`); if (!st) break; await page.eval(`(() => { const b = document.querySelector('.story-skip, [data-story-skip], .story-overlay button'); if (b) b.click(); else document.querySelector('.story-overlay').click(); return 1; })()`); await sleep(800); }
  await sleep(2500);
  log.dblAfter = await page.eval(`state.screen + ' intro=' + !!state.introHandMode`);
  log.errD = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 2 容疑者しぼり：払い50・ポット1000・ターンで負けている → 付いていくが正解
if (run('narrow')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♥ 7♦', 'Q♠ 8♠ 3♠ 2♦', 'K♠ 5♠', `try { localStorage.setItem('mbRulesSeen:narrow2', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 1000; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.selina.logic = ['narrow']; READ_GAME_OK.narrow = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4000); await okBtns(page, 2);
  log.narrowHost = await page.eval(`(document.querySelector('.read-battle-host')?.className || 'none') + ' tiles=' + document.querySelectorAll('.nq-tile').length`);
  await page.screenshot(path.join(OUT, `${W}x${H}_narrow0.png`));
  if (!(await page.eval(`document.querySelectorAll('.nq-tile').length`))) { console.log(JSON.stringify(log)); process.exit(0); }
  // 危ない役を全部タップ
  for (let i = 0; i < 12; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.nq-tile:not([disabled])')][0]; if (b && !document.querySelector('.nq-tiles.is-q2')) b.click(); return 1; })()`); await sleep(500); if (await page.eval(`!!document.querySelector('.nq-tiles.is-q2')`)) break; }
  await sleep(1500);
  // 強い役（危ない）を選ぶ
  await page.eval(`(() => { const t = [...document.querySelectorAll('.nq-tile')].find(x => !x.classList.contains('is-safe')) || document.querySelector('.nq-tile'); t.click(); return 1; })()`); await sleep(1500);
  log.narrowCoach = await page.eval(`document.querySelector('.mb-coach, .rb-coach, [class*="coach"]')?.textContent.replace(/\s+/g, ' ').slice(0, 120)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_narrow.png`));
  log.errN = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 3 賭け額スナイパー：持ち点1000・ポット800 → 選べる額は卓のボタンの額だけ
if (run('sniper')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('A♥ A♦', 'A♠ 8♠ 3♦ 10♣ 2♥', 'K♠ 5♠', `try { localStorage.setItem('mbRulesSeen:sniper', '1'); } catch (e) {} state.handPhase = 'river'; state.pot = 800; state.playerChips = 1000; state.currentBetOpponent = 0; state.currentBetPlayer = 0; state.handActs = [{ ph: 'river', t: 'check' }]; READ_BATTLE_POOLS.selina.logic = ['sniper']; state.psychPending = true; startReadBattle('logic');`));
  await sleep(5000); await okBtns(page, 2);
  log.sniperOpts = await page.eval(`(() => { const r = document.querySelector('#mb-sn-range'); if (!r) return 'none'; const seen = new Set(); for (let v = +r.min; v <= +r.max; v += +r.step) { r.value = v; r.dispatchEvent(new Event('input')); seen.add(document.querySelector('#mb-sn-bet').textContent); } return [...seen].join(','); })()`);
  log.betOpts = await page.eval(`JSON.stringify(readBattleTable('sniper').betOpts)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_sniper.png`));
  log.errSn = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 4 卓の表示：リバーで同じマーク2枚は警告しない・場のKの余り札を「強め」と言わない・チップ拡張の説明
if (run('table')) {
  const s = await boot({ ...SAVE, houseRulesSeen: false, ownedItems: ['chips_plus_1500'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(5000);
  log.houseNote = await page.eval(`(document.querySelector('.mk-layer, [class*="must-know"]')?.textContent || '').replace(/\s+/g, ' ').slice(0, 200)`);
  log.chips = await page.eval(`state.playerChips + ' vs ' + state.opponentChips`);
  await page.eval(SETUP('4♣ 6♦', 'J♦ K♦ 7♠ 3♥ J♠', 'Q♠ 5♠', `state.handPhase = 'river'; state.isPlayerTurn = true; render();`)); await sleep(1200);
  log.danger = await page.eval(`(document.querySelector('.v2-danger-label')?.textContent || '(なし)')`);
  log.kicker = await page.eval(`(document.querySelector('.hk-kicker')?.textContent || '(なし)')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_table.png`));
  log.errT = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 5 ファイブポーカーを閉じたら交換所の財布が今の額
if (run('shop')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'shop'; render(); return true; })()`); await sleep(2000);
  log.walletBefore = await page.eval(`document.querySelector('[data-bind="saveCoins"]')?.textContent`);
  await page.eval(`(() => { showMiniPokerGame(); return true; })()`); await sleep(1500);
  await page.eval(`(() => { save.coins -= 18; document.querySelector('.minipoker-overlay').remove(); return true; })()`); await sleep(1500);
  log.walletAfter = await page.eval(`document.querySelector('[data-bind="saveCoins"]')?.textContent + ' / save ' + save.coins`);
  log.errSh = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 6 零時の卓：初めての1ハンド目に席の札の案内
if (run('allstar')) {
  const s = await boot({ ...SAVE, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingSeen: true, allstarUnlocked: true }); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = document.createElement('button'); b.dataset.action = 'allstar-open'; onAction({ currentTarget: b }); return true; })()`); await sleep(1500);
  await page.eval(`(() => { const b = document.querySelector('[data-action="allstar-seat"]'); if (b) b.click(); return !!b; })()`);
  for (let i = 0; i < 30 && !(await page.eval(`!!document.querySelector('.as-posguide')`)); i++) await sleep(1000);
  log.posguide = await page.eval(`(document.querySelector('.as-posguide')?.textContent || 'none').replace(/\s+/g, ' ')`);
  log.lit = await page.eval(`[...document.querySelectorAll('.is-guide')].map(x => x.textContent).join(',')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_posguide.png`));
  log.posClip = await page.eval(`JSON.stringify((window.__clipText(document.querySelector('.as-posguide') || document.body) || []).filter(o => o.px > 2))`);
  log.errA = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// 7 アウツさがし：見せた見込みと線で採点・自信は聞かない・卓では自動でコール
if (run('outs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('A♥ 5♥', 'K♥ 9♥ 2♣ 7♦', 'K♠ K♦', `try { localStorage.setItem('mbRulesSeen:outs', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 450; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.grano.logic = ['outs']; READ_GAME_OK.outs = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4500); await okBtns(page, 2);
  await page.eval(`(() => { document.querySelector('#mb-o-give')?.click(); return 1; })()`); await sleep(3500);
  log.outsBar = await page.eval(`(document.querySelector('.outs-bar')?.textContent || 'none').replace(/\s+/g, ' ')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_outs.png`));
  await page.eval(`(() => { document.querySelector('#mb-o-call')?.click(); return 1; })()`); await sleep(2500);
  log.outsEntrust = await page.eval(`(document.querySelector('.mb-entrust')?.textContent || 'none').replace(/\s+/g, ' ')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_outs2.png`));
  log.outsPending = await page.eval(`(() => { document.querySelector('#mb-next')?.click(); return 1; })()`); await sleep(2500);
  log.outsAfter = await page.eval(`JSON.stringify({ truth: state.pendingRead && state.pendingRead.truth, tt: state.pendingRead && state.pendingRead.truthText, pb: state.currentBetPlayer, ph: state.handPhase })`);
  log.errO = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
console.log(JSON.stringify(log, null, 1));
process.exit(0);
