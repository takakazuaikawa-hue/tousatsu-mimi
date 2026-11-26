// 5回目の外部の批評の直しを確かめる。node qa/round5.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round5'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka'], ownedItems: ['memory_minipoker'] };
const ALL = { ...SAVE, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingSeen: true, allstarUnlocked: true };
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
const inView = (sel) => `(() => { const e = document.querySelector('${sel}'); if (!e) return 'none'; const r = e.getBoundingClientRect(); return Math.round(r.top) + '..' + Math.round(r.bottom) + ' / ' + innerHeight + (r.bottom <= innerHeight ? ' OK' : ' 外'); })()`;

// 1 ファイブポーカー：残す印が札の内側・選んでも配る演出が流れ直さない
if (run('mini')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { document.querySelector('[data-mp="deal"]')?.click(); return 1; })()`);
  for (let i = 0; i < 20 && !(await page.eval(`!!document.querySelector('[data-mp-tap]')`)); i++) await sleep(500);
  await sleep(800);
  await page.eval(`(() => { const c = document.querySelectorAll('[data-mp-tap]'); c.forEach(x => x.classList.contains('mp-held') && x.click()); return 1; })()`); await sleep(300);
  await page.eval(`(() => { document.querySelectorAll('[data-mp-tap]')[0].click(); return 1; })()`); await sleep(100);
  await page.eval(`(() => { document.querySelectorAll('[data-mp-tap]')[2].click(); return 1; })()`); await sleep(100);
  log.miniAnim = await page.eval(`[...document.querySelectorAll('.mp-card')].map(c => c.classList.contains('mp-card-dealt') ? 'anim' : '-').join(',')`);
  log.miniKeep = await page.eval(`JSON.stringify([...document.querySelectorAll('.mp-card-keep')].map(k => { const r = k.getBoundingClientRect(), c = k.parentElement.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(c.bottom), r.bottom <= c.bottom + 1 && r.bottom <= innerHeight ? 'OK' : 'NG']; }))`);
  await sleep(800);
  await page.screenshot(path.join(OUT, `${W}x${H}_mini.png`));
  log.errM = errs(s);
  await s.close();
}
// 2 ボーナス：小さな字が巨大化しない・受け取るが画面に収まる・惜しい演出なし
if (run('bonus')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♥ 7♦', 'Q♠ 8♠ 3♠ 10♦', 'K♠ 2♠', `state.handPhase = 'turn'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['stare']; state.psychPending = true; startReadBattle('psych');`));
  await sleep(4000);
  await page.eval(`(() => { window.__rl = MB.roulette(20); return 1; })()`); await sleep(1500);
  log.rlSmall = await page.eval(`(() => { const e = document.querySelector('.mb-rl-title small'); return e ? getComputedStyle(e).fontSize : 'none'; })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_bonus0.png`));
  await page.eval(`(() => { document.querySelector('#mb-rl-stop').click(); return 1; })()`); await sleep(3500);
  log.rlOk = await page.eval(inView('#mb-rl-ok'));
  log.rlTease = await page.eval(`!!document.querySelector('.mb-rl-tease, .is-tease')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_bonus.png`));
  log.errB = errs(s);
  await s.close();
}
// 3 初めての読み合いの説明：「強いなら降りる」と教えない
if (run('intro')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { state.currentBetOpponent = 100; state.currentBetPlayer = 0; return 1; })()`);
  log.intro = await page.eval(`readIntroPages('psych', 'ask').map(p => (p.fig + ' ' + (p.note || '')).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ')).join(' || ')`);
  log.introReal = await page.eval(`(() => { const g = [...REAL_READ_GAMES].find(x => !['outs','narrow','sniper','handvs'].includes(x)); return g + ': ' + readIntroPages('psych', g).map(p => (p.fig + ' ' + (p.note || '')).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ')).join(' || '); })()`);
  log.errI = errs(s);
  await s.close();
}
// 4 アウツ：場にペアがある時、場をペアにする当たり札は半分で数える
if (run('outs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('A♥ 5♥', 'K♥ 9♥ 9♣ 7♦', 'K♠ K♦', `try { localStorage.setItem('mbRulesSeen:outs', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 450; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.grano.logic = ['outs']; READ_GAME_OK.outs = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4500); await okBtns(page, 2);
  await page.eval(`(() => { document.querySelector('#mb-o-give')?.click(); return 1; })()`); await sleep(3500);
  log.outsCount = await page.eval(`(document.querySelector('#mb-o-count')?.textContent || 'none').replace(/\\s+/g, ' ')`);
  log.outsBar = await page.eval(`(document.querySelector('.outs-meter')?.textContent || 'none').replace(/\\s+/g, ' ').slice(0, 300)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_outs.png`));
  await page.eval(`(() => { document.querySelector('#mb-o-call')?.click(); return 1; })()`); await sleep(2500);
  await page.eval(`(() => { document.querySelector('#mb-next')?.click(); return 1; })()`); await sleep(2500);
  log.outsAfter = await page.eval(`JSON.stringify({ truth: state.pendingRead && state.pendingRead.truth, tt: state.pendingRead && state.pendingRead.truthText })`);
  log.errO = errs(s);
  await s.close();
}
// 5 賭け額スナイパー：選んだ額を卓でそのまま賭ける
if (run('sniper')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('A♥ A♦', 'A♠ 8♠ 3♦ 10♣ 2♥', 'K♠ 5♠', `try { localStorage.setItem('mbRulesSeen:sniper', '1'); } catch (e) {} state.handPhase = 'river'; state.pot = 800; state.playerChips = 1000; state.currentBetOpponent = 0; state.currentBetPlayer = 0; state.isPlayerTurn = true; state.handActs = [{ ph: 'river', t: 'check' }]; READ_BATTLE_POOLS.selina.logic = ['sniper']; state.psychPending = true; startReadBattle('logic');`));
  await sleep(5000); await okBtns(page, 2);
  await page.eval(`(() => { const r = document.querySelector('#mb-sn-range'); r.value = 400; r.dispatchEvent(new Event('input')); return 1; })()`); await sleep(500);
  for (let i = 0; i < 30 && !(await page.eval(`!state.psychPending`)); i++) {
    await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button:not([disabled])')].find(b => /決め|賭け|撃|ここ|×1|自信|卓|次|OK|つづ/.test(b.textContent)) || document.querySelector('#mb-next'); if (b) b.click(); return 1; })()`); await sleep(1500);
  }
  await sleep(3000);
  await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /卓へ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(3000);
  log.sniperAfter = await page.eval(`JSON.stringify({ pb: state.currentBetPlayer, chips: state.playerChips, thought: state.mimiThought, sb: state.sniperBet })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_sniper.png`));
  log.errSn = errs(s);
  await s.close();
}
// 6 容疑者しぼり：2つまで選んで決める
if (run('narrow')) {
  const s = await boot({ ...SAVE, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('velvet'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♥ 7♦', 'Q♠ 8♠ 3♠ 2♦', 'K♠ 5♠', `try { localStorage.setItem('mbRulesSeen:narrow2', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 600; state.currentBetOpponent = 200; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 200 }]; READ_BATTLE_POOLS.velvet.logic = ['narrow']; READ_GAME_OK.narrow = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4000); await okBtns(page, 2);
  for (let i = 0; i < 12; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.nq-tile:not([disabled])')][0]; if (b && !document.querySelector('.nq-tiles.is-q2')) b.click(); return 1; })()`); await sleep(500); if (await page.eval(`!!document.querySelector('.nq-tiles.is-q2')`)) break; }
  await sleep(1800);
  await page.eval(`(() => { const t = document.querySelectorAll('.nq-tile'); t[0].click(); t[1].click(); t[2].click(); return 1; })()`); await sleep(500);
  log.narrowPicks = await page.eval(`document.querySelectorAll('.nq-tile.is-pick').length + ' go=' + !document.querySelector('#mb-nq-go')?.disabled`);
  await page.screenshot(path.join(OUT, `${W}x${H}_narrow_pick.png`));
  await page.eval(`(() => { document.querySelector('#mb-nq-go')?.click(); return 1; })()`); await sleep(1500);
  log.narrowCoach = await page.eval(`(document.querySelector('.mb-coach-line, .mb-coach')?.textContent || '').replace(/\\s+/g, ' ').slice(0, 120)`);
  log.narrowQ = await page.eval(`(document.querySelector('.mb-wager, .read-battle-host .q')?.textContent || '').replace(/\\s+/g, ' ').slice(0, 120)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_narrow.png`));
  log.errN = errs(s);
  await s.close();
}
// 7 降参の申し出・開始の独白・本気のリコの成績の欄
if (run('battle')) {
  const s = await boot({ ...ALL, ownedItems: ['chips_plus_1500', 'chips_plus_3000'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(5000);
  log.chips = await page.eval(`state.playerChips + ' vs ' + state.opponentChips + ' ' + state.mimiThought`);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); state.playerChips = 2500; state.opponentChips = 300; state.showdownStreak = 6; state.consecutiveWins = 6; state.handNo = 8; state.handPhase = 'idle'; continueAfterHand(); return 1; })()`); await sleep(4000);
  log.surrender = await page.eval(`(document.querySelector('.dominance-choice-modal')?.textContent || 'none').replace(/\\s+/g, ' ')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_surrender.png`));
  const hn = await page.eval('state.handNo + "/" + state.handResults.length');
  await page.eval(`(() => { document.querySelector('[data-choice="accept"]')?.click(); return 1; })()`); await sleep(14000);
  log.afterAccept = { before: hn, after: await page.eval('state.handNo + "/" + state.handResults.length + " opp=" + state.opponentChips + " score=" + state.score + " screen=" + state.screen') };
  await page.screenshot(path.join(OUT, `${W}x${H}_surrender2.png`));
  log.errBt = errs(s);
  await s.close();
  const s2 = await boot({ ...ALL, bestRanks: { rico_tutorial: 'A', rico_serious: 'S', polka: 'B' } }); const p2 = s2.page;
  await p2.eval(`(() => { state.screen = 'lobby'; render(); onAction({ currentTarget: { dataset: { action: 'open-collection' } } }); return true; })()`); await sleep(2500);
  log.coll = await p2.eval(`[...document.querySelectorAll('.coll-stage')].slice(0, 3).map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')`);
  log.transferKeys = await p2.eval(`TRANSFER_EXTRA_KEYS.join(',')`);
  await s2.close();
}
// 8 零時の卓：最初の案内が席の札（D・SB・BB）を覆わない
if (run('allstar')) {
  const s = await boot(ALL); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = document.createElement('button'); b.dataset.action = 'allstar-open'; onAction({ currentTarget: b }); return true; })()`); await sleep(1500);
  await page.eval(`(() => { const b = document.querySelector('[data-action="allstar-seat"]'); if (b) b.click(); return !!b; })()`);
  for (let i = 0; i < 30 && !(await page.eval(`!!document.querySelector('.as-posguide.on')`)); i++) await sleep(1000);
  await sleep(800);
  log.posCover = await page.eval(`(() => { const g = document.querySelector('.as-posguide'); if (!g) return 'none'; const R = g.getBoundingClientRect(); return JSON.stringify([...document.querySelectorAll('.is-guide')].map(x => { const r = x.getBoundingClientRect(); const over = !(r.right < R.left || r.left > R.right || r.bottom < R.top || r.top > R.bottom); return x.textContent.trim() + (over ? ' 覆われ' : ' 見える'); })); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_posguide.png`));
  log.errA = errs(s);
  await s.close();
}
// 9 ぱにゅぱにゅ：勢いの表示
if (run('panyu')) {
  const s = await boot(ALL); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = document.querySelector('[data-action="panyu-clicker"], [data-action="open-panyu"], [data-action*="panyu"]'); window.__pb = b && b.dataset.action; if (b) onAction({ currentTarget: b }); return 1; })()`); await sleep(3000);
  log.panyuBtn = await page.eval('window.__pb');
  for (let i = 0; i < 12; i++) { await page.eval(`(() => { const f = document.querySelector('.pv2-mesh'); if (f) { f.contentWindow.eval("parent.postMessage({ panyu: 1, t: 'tap', side: 0, x: 200, y: 200 }, '*')"); return 1; } const b = document.querySelector('.panyu-blob-l'); if (b) { const r = b.getBoundingClientRect(); const o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1 }; b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointerup', o)); b.dispatchEvent(new MouseEvent('click', o)); } return 1; })()`); await sleep(90); }
  log.heat = await page.eval(`(document.querySelector('.pv2-heat')?.textContent || 'none') + ' w=' + (document.querySelector('.pv2-heat-fill')?.style.width)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_panyu.png`));
  log.errP = errs(s);
  await s.close();
}
console.log(JSON.stringify(log, null, 1));
process.exit(0);
