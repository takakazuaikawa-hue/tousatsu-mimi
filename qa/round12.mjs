// 12回目の外部の批評の直しを確かめる。node qa/round12.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round12'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka', 'selina', 'grano'], ownedItems: [] };
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
// 画面上の実寸の文字の大きさ（拡大縮小を掛けた後）
const FS = (sel) => `(() => [...document.querySelectorAll('${sel}')].filter(e => e.getBoundingClientRect().width && e.textContent.trim()).slice(0, 6).map(e => { const k = e.getBoundingClientRect().width / (e.offsetWidth || 1); return Math.round(parseFloat(getComputedStyle(e).fontSize) * k * 10) / 10; }))()`;


const okBtns = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } };
const SETUP = (opp, hand, board, her, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
  state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${her}'); ${extra} return 1; })()`;

// 別のタブが新しく保存したら、このタブは書かずに案内を出す
if (run('tab')) {
  const s = await boot(); const { page } = s;
  log.tab = await page.eval(`(() => { const a = readSaveSeq(); save.coins = 1111; saveProgress(); const b = readSaveSeq(); const okWrite = JSON.parse(localStorage.getItem(SAVE_KEY)).coins;
    localStorage.setItem(SAVE_SEQ_KEY, String(b + 3)); save.coins = 9; saveProgress(); const after = JSON.parse(localStorage.getItem(SAVE_KEY)).coins;
    return JSON.stringify({ a, b, okWrite, after, overlay: !!document.querySelector('.tab-stale-overlay'), text: document.querySelector('.tab-stale-card')?.textContent }); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_tab.png`));
  await s.close();
}

// 卒業試験：3つの教えの真ん中を押すと、その教えのボタンに当たる
if (run('grad')) {
  const s = await boot({ ...SAVE }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; window.__ricoSeriousMode = true; startBattle('rico_tutorial'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('rico', 'Q♥ 9♣', '2♣ 7♦ Q♠ 9♥', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:graduation', '1'); } catch (e) {} state.seriousRicoMode = true; state.handPhase = 'turn'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.psychPending = true; startReadBattle('psych');`));
  await sleep(4000); await okBtns(page, 3); await sleep(1500);
  log.grad = await page.eval(`JSON.stringify([...document.querySelectorAll('#mb-gd-lessons button')].map(b => { const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return [b.textContent.trim().slice(0, 8), b.disabled, !!top && (top === b || b.contains(top)), top && (top.id || top.className).toString().slice(0, 24)]; }))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_grad.png`));
  log.errGrad = errs(s);
  await s.close();
}

// 必ず引き分け：場札3枚でも読み合いを出さない
if (run('split')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('rico_tutorial'); return true; })()`); await sleep(4500);
  log.split = await page.eval(`(() => { const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    const t = (a, b, bd) => { state.playerHand = C(a); state.opponentHand = C(b); state.community = C(bd); const t0 = performance.now(); const r = lockedSplit(); return [r, Math.round(performance.now() - t0)]; };
    return JSON.stringify({ flopTie: t('K♠ 3♥', 'K♣ 3♣', 'Q♦ 6♦ J♠'), flopNot: t('K♠ 3♥', 'K♣ 4♣', 'Q♦ 6♦ J♠'), turnTie: t('K♠ 3♥', 'K♣ 3♣', 'Q♦ 6♦ J♠ 2♥') }); })()`);
  await s.close();
}

// 復習：5問を正解しても、まだ残りがあれば続きを出す
if (run('review')) {
  const s = await boot({ ...SAVE, lectureProgress: null }); const { page } = s;
  await page.eval(`(() => { const ids = LESSON_LITE_CHAPTERS.flatMap(c => c.ids); startLecture('rico_tutorial', ids.slice(0, 5), ids.slice(5, 9)); state.lectureCorrect = 5; state.lectureWrong = []; state.lectureIdx = 5; finishLecture(false); return 1; })()`); await sleep(1500);
  log.review = await page.eval(`JSON.stringify({ lead: document.querySelector('.lecture-finish-overlay .lec-lead')?.textContent, btns: [...document.querySelectorAll('.lecture-finish-overlay button')].map(b => b.textContent) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_review.png`));
  await s.close();
}

// コレクション：区切りへ飛ぶ見出し
if (run('coll')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showCollectionModal(); return 1; })()`); await sleep(1500);
  const btns = await page.eval(`JSON.stringify([...document.querySelectorAll('.coll-jump button')].map(b => b.textContent))`);
  await page.eval(`(() => { [...document.querySelectorAll('.coll-jump button')].find(b => /称号/.test(b.textContent))?.click(); return 1; })()`); await sleep(1200);
  log.coll = { btns, after: await page.eval(`(() => { const b = document.querySelector('.collection-body'); const h = [...document.querySelectorAll('.coll-section-title')].find(t => /称号/.test(t.textContent)); return JSON.stringify({ top: b.scrollTop, titleY: Math.round(h.getBoundingClientRect().top - b.getBoundingClientRect().top), fs: ${FS('.coll-jump button')} }); })()`) };
  await page.screenshot(path.join(OUT, `${W}x${H}_coll.png`));
  await s.close();
}

// 設定：文字の速さ・対戦の速さ
if (run('speed')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showSettingsModal(); return 1; })()`); await sleep(1500);
  await page.eval(`(() => { document.querySelector('[data-seg="battleSpeed"]')?.scrollIntoView({ block: 'center' }); return 1; })()`); await sleep(800);
  await page.eval(`(() => { document.querySelector('[data-seg="battleSpeed"][data-val="fast"]')?.click(); document.querySelector('[data-seg="textSpeed"][data-val="instant"]')?.click(); return 1; })()`); await sleep(500);
  log.speed = await page.eval(`JSON.stringify({ b: save.battleSpeed, t: save.textSpeed, stored: JSON.parse(localStorage.getItem(SAVE_KEY)).battleSpeed, rects: ${R('.settings-seg-btn')}, fs: ${FS('.settings-seg-btn')}, clip: [...document.querySelectorAll('.settings-modal-row')].filter(r => r.scrollWidth > r.clientWidth + 1).length })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_speed.png`));
  log.errSpeed = errs(s);
  await s.close();
}

// 賭け額の札：「相手が降りる 高・中・低」が切れない
if (run('bet')) {
  const s = await boot({ ...SAVE, unlockedNotes: ['bluff_basic'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(5000);
  await page.eval(SETUP('polka', 'K♥ K♣', '2♣ 7♦ K♠', 'Q♠ 5♦', `state.handPhase = 'flop'; state.currentBetOpponent = 0; state.currentBetPlayer = 0; state.pot = 200; state.playerTurn = true; state.isPlayerTurn = true; render();`));
  await sleep(1500);
  await page.eval(`(() => { document.querySelector('.verb-bet:not([disabled])')?.click(); return 1; })()`); await sleep(1200);
  log.bet = await page.eval(`JSON.stringify({ hints: [...document.querySelectorAll('.slot-note-hint, .verb-fe')].filter(e => e.getBoundingClientRect().width).map(e => [e.textContent, Math.round(e.getBoundingClientRect().width), e.scrollWidth > e.clientWidth + 1, Math.round(e.getBoundingClientRect().right), innerWidth]) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_bet.png`));
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
