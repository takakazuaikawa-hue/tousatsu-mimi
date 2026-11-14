// 9回目の外部の批評の直しを確かめる。node qa/round9.mjs [667x375] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '667x375').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round9'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka', 'selina', 'grano'], ownedItems: ['memory_minipoker', 'note_pot_odds', 'mimi_skin_pink'], equippedMimiSkin: 'pink', panyuSkills: { senseLevel: 2, rangeLevel: 1, breakLevel: 0 } };
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
const SETUP = (opp, hand, board, her, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
  state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${her}'); ${extra} return 1; })()`;
// はみ出し：中身が枠より広い・高い文字の部品
const CLIP = (root) => `JSON.stringify([...document.querySelectorAll('${root} *')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().width && (e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflowX !== 'visible').map(e => [e.className, e.textContent.trim().slice(0, 20), e.scrollWidth, e.clientWidth]).slice(0, 8))`;

// 卓：桃色の衣装・コールの札の要る勝ち目
if (run('table')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('grano', 'Q♥ 9♣', '2♣ 7♦ Q♠', 'K♠ 5♦', `state.handPhase = 'flop'; state.pot = 150; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.isPlayerTurn = true; state.betChooserOpen = false; render(); setMimiExpression('default');`));
  await sleep(1500);
  log.table = await page.eval(`JSON.stringify({ mimi: (() => { const i = document.querySelector('.v2-mimi-frame img'); return i && [i.currentSrc.split('/').pop(), i.className, Math.round(i.getBoundingClientRect().height)]; })(), cc: document.querySelector('.verb-cc')?.textContent })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_table.png`));
  log.errTable = errs(s);
  await s.close();
}

// 容疑者しぼり：助言の文が切れない
if (run('narrow')) {
  const s = await boot({ ...SAVE, clearedStages: [...SAVE.clearedStages] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('velvet'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('velvet', 'Q♥ 9♣', '2♣ 7♦ Q♠ 9♥ 4♠', 'K♠ 5♦', `try { localStorage.removeItem('mbRulesSeen:narrow'); } catch (e) {} state.handPhase = 'river'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; READ_BATTLE_POOLS.velvet.logic = ['narrow']; state.logicPending = true; startReadBattle('logic');`));
  await sleep(4000); await okBtns(page, 3); await sleep(1500);
  log.narrow = await page.eval(CLIP('.read-battle-host'));
  log.narrowCoach = await page.eval(`JSON.stringify(${R('.read-battle-host .mb-coach-text, .read-battle-host [class*=coach] p, .read-battle-host .mb-coach')})`);
  await page.screenshot(path.join(OUT, `${W}x${H}_narrow.png`));
  log.errNarrow = errs(s);
  await s.close();
}

// アウツ：札の大きさ
if (run('outs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('grano', '9♥ 8♥', '2♥ 7♣ K♥ 4♦', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:outs', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; READ_BATTLE_POOLS.grano.logic = ['outs']; state.logicPending = true; startReadBattle('logic');`));
  await sleep(4000); await okBtns(page, 3); await sleep(1500);
  log.outs = await page.eval(`JSON.stringify(${R('.read-battle-host .card')}.slice(0, 60).map(r => [r[2] - r[0], r[3] - r[1]]).slice(0, 6))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_outs.png`));
  log.errOuts = errs(s);
  await s.close();
}

// 卒業試験：選ぶ札の高さ
if (run('grad')) {
  const s = await boot({ ...SAVE, clearedStages: [...SAVE.clearedStages, 'velvet'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; window.__ricoSeriousMode = true; startBattle('rico_tutorial'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('rico', 'Q♥ 9♣', '2♣ 7♦ Q♠ 9♥', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:graduation', '1'); } catch (e) {} state.seriousRicoMode = true; state.handPhase = 'turn'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.psychPending = true; startReadBattle('psych');`));
  await sleep(4000); await okBtns(page, 3); await sleep(1500);
  log.grad = await page.eval(`JSON.stringify([...document.querySelectorAll('.read-battle-host button')].filter(b => b.getBoundingClientRect().width).map(b => [b.textContent.trim().slice(0, 14), Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_grad.png`));
  log.errGrad = errs(s);
  await s.close();
}

// ファイブポーカーの配当表：1・25・100・500で切れない
if (run('five')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return true; })()`); await sleep(2000); await page.eval(`(() => { document.querySelectorAll('[class*=toast]').forEach(e => e.remove()); return 1; })()`);
  await page.eval(`(() => { const b = [...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(1200);
  log.five = {};
  for (const v of ['1', '25', '100', '500']) {
    await page.eval(`(() => { [...document.querySelectorAll(".minipoker-overlay button")].find(b => b.textContent.trim() === "${v}")?.click(); return 1; })()`); await sleep(700);
    log.five[v] = await page.eval(`JSON.stringify([...document.querySelectorAll('.mp-paytable *')].filter(e => e.children.length === 0 && e.textContent.trim() && (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > document.querySelector('.mp-paytable').getBoundingClientRect().right + 1)).map(e => [e.className, e.textContent.trim(), e.scrollWidth, e.clientWidth]).slice(0, 6))`);
    if (v === '500') await page.screenshot(path.join(OUT, `${W}x${H}_five.png`));
  }
  log.errFive = errs(s);
  await s.close();
}

// コレクション：リコ先輩の欄
if (run('coll')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showCollectionModal(); return 1; })()`); await sleep(1500);
  log.coll = await page.eval(`[...document.querySelectorAll('.coll-stage-meta')].map(e => e.textContent).join(' | ')`);
  log.errColl = errs(s);
  await s.close();
}

// ぱにゅぱにゅ：長押し3秒で数が進む
if (run('panyu')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showPanyuClicker(30, () => {}); return 1; })()`); await sleep(6000);
  const cnt = () => page.eval(`[...document.querySelectorAll('.panyu-clicker-count')].map(e => e.textContent).join('/')`);
  log.panyuMesh = await page.eval(`!!document.querySelector('.panyu-clicker-overlay.is-mesh, .is-mesh')`);
  const fr = JSON.parse(await page.eval(`JSON.stringify((() => { const r = document.querySelector('.pv2-mesh').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })())`));
  const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  let hit = null;
  for (const [fx, fy] of [[.43, .62], [.57, .62], [.43, .7], [.45, .55], [.43, .76]]) {
    const x = fr[0] + fr[2] * fx, y = fr[1] + fr[3] * fy, c0 = await cnt();
    await mouse('mousePressed', x, y); await sleep(150); await mouse('mouseReleased', x, y); await sleep(500);
    if ((await cnt()) !== c0) { hit = [x, y]; break; }
  }
  log.panyuHit = hit;
  if (hit) {
    const c0 = await cnt();
    await mouse('mousePressed', hit[0], hit[1]); await sleep(3000); await mouse('mouseReleased', hit[0], hit[1]); await sleep(500);
    log.panyuHold = [c0, await cnt()];
    const c1 = await cnt();
    await mouse('mousePressed', hit[0], hit[1]);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', hit[0] + (i % 2 ? 40 : -40), hit[1]); await sleep(80); }
    await mouse('mouseReleased', hit[0], hit[1]); await sleep(500);
    log.panyuDrag = [c1, await cnt()];
  }
  log.errPanyu = errs(s);
  await s.close();
}

// ぱにゅぱにゅLv2：外した時の減りが半分／場札だけで引き分けの手は読み合いを出さない
if (run('logic')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  log.split = await page.eval(SETUP('polka', '2♥ 3♣', 'A♠ K♦ Q♠ J♥ 10♣', '4♠ 5♦', `state.handPhase = 'river'; state.readHandNo = -1; state.pendingRead = null; return JSON.stringify([lockedSplit(), readBattleReady('psych')]);`));
  log.noSplit = await page.eval(SETUP('polka', 'A♥ 3♣', 'A♠ K♦ 7♠ J♥ 2♣', '4♠ 5♦', `state.handPhase = 'river'; return JSON.stringify([lockedSplit(), readBattleReady('psych')]);`));
  log.lossCut = await page.eval(`JSON.stringify([senseLossCut(), (save.panyuSkills.senseLevel = 3, senseLossCut()), (save.panyuSkills.senseLevel = 1, senseLossCut())])`);
  log.shopPanyu = await page.eval(`JSON.stringify(SHOP_ITEMS.filter(i => i.cat === 'panyu' && !i.id.startsWith('pwear')).map(i => i.name))`);
  log.errLogic = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
