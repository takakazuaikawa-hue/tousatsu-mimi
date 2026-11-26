// 11回目の外部の批評の直しを確かめる。node qa/round11.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round11'); fs.mkdirSync(OUT, { recursive: true });
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


// 当たり札：フルハウスにしかならない手では出さない。フラッシュ待ちでは出す
if (run('outs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  log.outs = await page.eval(`(() => { const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    const t = (h, b) => { state.playerHand = C(h); state.community = C(b); state.currentBetOpponent = 60; state.currentBetPlayer = 0; return READ_GAME_OK.outs(); };
    return JSON.stringify({ fullhouseOnly: t('J♠ 7♦', '10♣ 7♣ 5♥ 10♦'), flushDraw: t('A♥ 9♥', '2♥ 7♥ K♣ 4♦') }); })()`);
  await s.close();
}

// 余り札：手札の J を「場の札・相手も同じ」と言わない
if (run('kicker')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('velvet'); return true; })()`); await sleep(4500);
  log.kicker = await page.eval(`(() => { const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    state.playerHand = C('10♣ J♣'); state.community = C('A♦ Q♠ 3♥ 5♠ 7♦'); state.handPhase = 'river'; const a = renderCurrentHandKicker();
    state.playerHand = C('2♣ 4♣'); const b = renderCurrentHandKicker();
    state.playerHand = C('K♣ 4♣'); const c = renderCurrentHandKicker();
    return JSON.stringify([a, b, c].map(x => String(x).replace(/<[^>]+>/g, ''))); })()`);
  await s.close();
}

// Lv3：自信の目安・札・預けた後の損失が同じ計算
if (run('fever')) {
  const s = await boot({ ...SAVE, panyuSkills: { senseLevel: 3 } }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    state.playerHand = C('Q♥ K♣'); state.community = C('2♣ 7♦ Q♠'); state.opponentHand = C('K♠ 5♦');
    try { localStorage.setItem('mbRulesSeen:ask', '1'); } catch (e) {}
    state.handPhase = 'flop'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'flop', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['ask']; state.psychPending = true; state.readBattlePurse = { coins: 100, combo: 0, fever: 2, best: 0, perfect: 0 }; startReadBattle('psych'); return 1; })()`);
  await sleep(4000);
  // 進められるボタンを順に押して、自信の札まで
  for (let i = 0; i < 14; i++) {
    const has = await page.eval(`!!document.querySelector('.mb-wchip')`); if (has) break;
    await page.eval(`(() => { const bs = [...document.querySelectorAll('.read-battle-host button:not([disabled])')].filter(b => b.getBoundingClientRect().width && !/ルール/.test(b.textContent)); (bs.find(b => /わかった|はじめ|次へ|聞く|決める/.test(b.textContent)) || bs[0])?.click(); return 1; })()`); await sleep(900);
  }
  log.feverWager = await page.eval(`JSON.stringify({ note: document.querySelector('.mb-wager-note')?.textContent, chips: [...document.querySelectorAll('.mb-wchip')].map(b => b.textContent) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_fever.png`));
  await page.eval(`(() => { document.querySelector('.mb-wchip.x3')?.click(); return 1; })()`); await sleep(1500);
  log.feverEntrust = await page.eval(`document.querySelector('.mb-entrust-coin')?.textContent`);
  log.err_fever = errs(s);
  await s.close();
}


// Lv3：自信の目安・札・預けた後の損失が同じ計算
if (run('zero')) {
  const s = await boot({ ...SAVE, panyuSkills: { senseLevel: 3 } }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    state.playerHand = C('Q♥ K♣'); state.community = C('2♣ 7♦ Q♠'); state.opponentHand = C('K♠ 5♦');
    try { localStorage.setItem('mbRulesSeen:ask', '1'); } catch (e) {}
    state.handPhase = 'flop'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'flop', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['ask']; state.psychPending = true; state.readBattlePurse = { coins: 0, combo: 0, fever: 0, best: 0, perfect: 0 }; startReadBattle('psych'); return 1; })()`);
  await sleep(4000);
  // 進められるボタンを順に押して、自信の札まで
  for (let i = 0; i < 14; i++) {
    const has = await page.eval(`!!document.querySelector('.mb-wchip')`); if (has) break;
    await page.eval(`(() => { const bs = [...document.querySelectorAll('.read-battle-host button:not([disabled])')].filter(b => b.getBoundingClientRect().width && !/ルール/.test(b.textContent)); (bs.find(b => /わかった|はじめ|次へ|聞く|決める/.test(b.textContent)) || bs[0])?.click(); return 1; })()`); await sleep(900);
  }
  log.zeroWager = await page.eval(`JSON.stringify({ note: document.querySelector('.mb-wager-note')?.textContent, chips: [...document.querySelectorAll('.mb-wchip')].map(b => b.textContent) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_zero.png`));
  await page.eval(`(() => { document.querySelector('.mb-wchip.x3')?.click(); return 1; })()`); await sleep(1500);
  log.zeroEntrust = await page.eval(`document.querySelector('.mb-entrust-coin')?.textContent`);
  log.err_zero = errs(s);
  await s.close();
}


// エンディング：全画面の案内を出さない
if (run('ending')) {
  const s = await boot(); const { page } = s;
  log.ending = await page.eval(`(() => { const g = document.getElementById('fullscreen-btn-group'); if (g) g.hidden = false; const before = g && getComputedStyle(g).display; const d = document.createElement('div'); d.className = 'screen ending-screen'; document.getElementById('stage').appendChild(d); const after = g && getComputedStyle(g).display; d.remove(); return JSON.stringify({ before, after }); })()`);
  await s.close();
}

// 講義の締め：34%なら復習を勧め、まちがえた問題だけもう一度
if (run('lecfinish')) {
  const s = await boot({ ...SAVE, lectureProgress: null }); const { page } = s;
  await page.eval(`(() => { startLecture('rico_tutorial'); document.querySelectorAll('.lecture-intro-overlay').forEach(e => e.remove()); state.lectureTotal = 35; state.lectureCorrect = 12; state.lectureWrong = LESSON_ORDER.slice(3, 26); state.lectureIdx = 35; finishLecture(false); return 1; })()`); await sleep(1500);
  log.lecfinish = await page.eval(`JSON.stringify({ lead: document.querySelector('.lecture-finish-overlay .lec-lead')?.textContent, btns: [...document.querySelectorAll('.lecture-finish-overlay button')].map(b => b.textContent), fs: ${FS('.lecture-finish-overlay button, .lecture-finish-overlay .lec-lead')} })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_lecfinish.png`));
  await page.eval(`(() => { document.querySelector('.lec-review-btn')?.click(); return 1; })()`); await sleep(2500);
  log.review = await page.eval(`JSON.stringify({ order: lectureOrder().length, total: state.lectureTotal, modal: !!document.querySelector('.lec-cp .psych-modal'), banner: !!document.querySelector('.chapter-banner'), hud: document.getElementById('lecture-hud')?.textContent })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_review.png`));
  log.errLec = errs(s);
  await s.close();
}

// ファイブポーカー：相手の癖の一言
if (run('five')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return 1; })()`); await sleep(2500);
  await page.eval(`(() => { [...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent))?.click(); return 1; })()`); await sleep(1200);
  await page.eval(`(() => { [...document.querySelectorAll('.minipoker-overlay button')].find(b => /配る|勝負|DEAL/.test(b.textContent))?.click(); return 1; })()`); await sleep(2500);
  log.five = await page.eval(`JSON.stringify({ tag: [...document.querySelectorAll('.mp-char-style')].map(e => e.textContent), fs: ${FS('.mp-char-style')}, rect: ${R('.mp-char-style')}, w: innerWidth, clip: [...document.querySelectorAll('.minipoker-overlay button, .minipoker-overlay .mp-char-style')].filter(e => e.getBoundingClientRect().width && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => e.textContent.trim().slice(0, 20)) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_five.png`));
  log.errFive = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
