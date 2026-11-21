// 10回目の外部の批評の直しを確かめる。node qa/round10.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round10'); fs.mkdirSync(OUT, { recursive: true });
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

// 講義：本文と選択肢の実寸
if (run('lecture')) {
  const s = await boot({ ...SAVE, lectureProgress: null }); const { page } = s;
  await page.eval(`(() => { startLecture('rico_tutorial'); return true; })()`); await sleep(2500);
  await page.eval(`(() => { document.querySelector('.lecture-intro-overlay .full-btn')?.click(); return 1; })()`); await sleep(3000);
  for (let i = 0; i < 4; i++) { await page.eval(`(() => { document.querySelector('.chapter-start')?.click(); return 1; })()`); await sleep(1500); await page.eval(`(() => { const b = [...document.querySelectorAll('.tutorial-overlay button, .lecture-overlay button')].find(b => /続け|次へ|わかった|はじめ|章を始める/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(1200); }
  log.lecture = await page.eval(`JSON.stringify({ q: ${FS('.psych-question, .psych-q-text, .psych-situation')}, opts: ${FS('.psych-option, .psych-choice, .psych-options button')}, optRects: ${R('.psych-option, .psych-choice, .psych-options button')}, cls: [...document.querySelectorAll('body *')].filter(e => /psych|lecture/.test(e.className) && e.getBoundingClientRect().width > 300).slice(0, 8).map(e => e.className.slice(0, 60)) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_lecture.png`));
  log.errLecture = errs(s);
  await s.close();
}

// 実戦演習③：札と額
if (run('exercise')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { startLecture('rico_tutorial'); document.querySelectorAll('.lecture-intro-overlay').forEach(e => e.remove()); showHandsOnExercise(HANDS_ON_AFTER[6], () => {}); return 1; })()`); await sleep(2000);
  log.exercise = await page.eval(`JSON.stringify([...document.querySelectorAll('body *')].filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => [e.className.slice(0, 40), e.scrollHeight, e.clientHeight]))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_exercise.png`));
  log.errExercise = errs(s);
  await s.close();
}

// 講義の受講位置：1問答えたら保存される
if (run('resume')) {
  const s = await boot({ ...SAVE, lectureProgress: null }); const { page } = s;
  await page.eval(`(() => { startLecture('rico_tutorial'); return true; })()`); await sleep(2500);
  await page.eval(`(() => { document.querySelector('.lecture-intro-overlay .full-btn')?.click(); return 1; })()`); await sleep(3000);
  await page.eval(`(() => { document.querySelector('.chapter-start')?.click(); return 1; })()`); await sleep(2000);
  for (let i = 0; i < 2; i++) { await page.eval(`(() => { document.querySelector('.choice-btn')?.click(); return 1; })()`); await sleep(600); }
  await sleep(1500);
  log.resume = await page.eval(`JSON.stringify(save.lectureProgress)`);
  await s.close();
}

// 設定：練習のスイッチの真ん中を押すと練習が切り替わる
if (run('settings')) {
  const s = await boot({ ...SAVE, backdoorUnlocked: true, backdoorOn: false }); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showSettingsModal(); return 1; })()`); await sleep(1200);
  await page.eval(`(() => { document.querySelector('[data-toggle="backdoor"]')?.scrollIntoView({ block: 'center' }); return 1; })()`); await sleep(1000);
  for (let i = 0; i < 30 && await page.eval(`!!document.querySelector('.loading-veil.on')`); i++) await sleep(500);
  log.veil = await page.eval(`!!document.querySelector('.loading-veil.on')`);
  const pt = await page.eval(`(() => { const sw = document.querySelector('[data-toggle="backdoor"]'); const r = sw.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementsFromPoint(x, y).filter(e => getComputedStyle(e).pointerEvents !== 'none')[0]; return JSON.stringify({ x, y, top: top && (top.className || top.tagName), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), label: ${R('.settings-modal-practice .settings-modal-label')} }); })()`);
  log.settingsPt = pt;
  const { x, y } = JSON.parse(pt);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(800);
  log.settingsAfter = await page.eval(`JSON.stringify({ on: save.backdoorOn, fs: !!document.fullscreenElement, modal: !!document.querySelector('.settings-modal') })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_settings.png`));
  log.errSettings = errs(s);
  await s.close();
}

// Lv3：自信の目安・札・預けた後の損失が同じ計算
if (run('lv3')) {
  const s = await boot({ ...SAVE, panyuSkills: { senseLevel: 3 } }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
    state.playerHand = C('Q♥ K♣'); state.community = C('2♣ 7♦ Q♠'); state.opponentHand = C('K♠ 5♦');
    try { localStorage.setItem('mbRulesSeen:ask', '1'); } catch (e) {}
    state.handPhase = 'flop'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'flop', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['ask']; state.psychPending = true; startReadBattle('psych'); return 1; })()`);
  await sleep(4000);
  // 進められるボタンを順に押して、自信の札まで
  for (let i = 0; i < 14; i++) {
    const has = await page.eval(`!!document.querySelector('.mb-wchip')`); if (has) break;
    await page.eval(`(() => { const bs = [...document.querySelectorAll('.read-battle-host button:not([disabled])')].filter(b => b.getBoundingClientRect().width && !/ルール/.test(b.textContent)); (bs.find(b => /わかった|はじめ|次へ|聞く|決める/.test(b.textContent)) || bs[0])?.click(); return 1; })()`); await sleep(900);
  }
  log.lv3wager = await page.eval(`JSON.stringify({ note: document.querySelector('.mb-wager-note')?.textContent, chips: [...document.querySelectorAll('.mb-wchip')].map(b => b.textContent) })`);
  await page.screenshot(path.join(OUT, `${W}x${H}_lv3wager.png`));
  await page.eval(`(() => { document.querySelector('.mb-wchip.x3')?.click(); return 1; })()`); await sleep(1500);
  log.lv3entrust = await page.eval(`document.querySelector('.mb-entrust-coin')?.textContent`);
  log.errLv3 = errs(s);
  await s.close();
}

// 相手が降りた時：強い役ならブラフ成功と言わない
if (run('fold')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  log.fold = await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1), label: x.slice(0, -1) }));
    state.playerHand = C('7♠ 7♦'); state.community = C('7♥ 2♣ J♦ 4♠'); state.opponentHand = C('K♣ 9♣');
    const pEv = evaluateHand(state.playerHand.concat(state.community));
    state.handResults = [{ hand: state.handNo, winner: 'player', reason: 'opponentFold', pot: 400, by: '相手降伏', pEv }];
    document.querySelectorAll('.hand-result-overlay').forEach(e => e.remove()); showHandResultBanner(); return document.querySelector('.hr-line-mimi')?.textContent; })()`);
  await s.close();
}

// 講義35問：どれも画面の中に収まり、文字が14px以上
if (run('all35')) {
  const s = await boot({ ...SAVE, lectureProgress: null }); const { page } = s;
  await page.eval(`(() => { startLecture('rico_tutorial'); document.querySelectorAll('.lecture-intro-overlay').forEach(e => e.remove()); return 1; })()`); await sleep(2000);
  const ids = await page.eval(`JSON.stringify(LESSON_ORDER)`);
  const bad = [];
  const CHECK = `(() => { const m = document.querySelector('.lec-cp .psych-modal'); if (!m) return 'nomodal'; const mb = m.getBoundingClientRect();
    const out = [...m.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.height && e.textContent.trim() && (r.bottom > mb.bottom + 1 || r.right > mb.right + 1 || r.bottom > innerHeight); }).map(e => e.className.slice(0, 24));
    const small = [...m.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().height && parseFloat(getComputedStyle(e).fontSize) < 13.5).map(e => e.className.slice(0, 24) + ':' + getComputedStyle(e).fontSize);
    const sc = m.scrollHeight > m.clientHeight + 2;
    const ov = [...m.children].filter(e => e.getBoundingClientRect().height); const hit = [];
    for (let i = 0; i < ov.length; i++) for (let j = i + 1; j < ov.length; j++) { const a = ov[i].getBoundingClientRect(), b = ov[j].getBoundingClientRect(); if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) hit.push(ov[i].className.slice(0, 16) + 'x' + ov[j].className.slice(0, 16)); }
    return (out.length || small.length || sc || hit.length) ? JSON.stringify({ out: [...new Set(out)].slice(0, 4), small: [...new Set(small)].slice(0, 4), sc, hit }) : ''; })()`;
  for (const id of JSON.parse(ids)) {
    await page.eval(`(() => { document.querySelectorAll('.battle-modal-overlay').forEach(e => e.remove()); doLectureModal('${id}'); return 1; })()`); await sleep(700);
    const r = await page.eval(CHECK);
    if (r || (process.env.SHOTQ || '').split(',').includes(id)) { if (r) bad.push(id + ' ' + r); await page.screenshot(path.join(OUT, `${W}x${H}_q_${id}.png`)); }
  }
  log.all35 = { n: JSON.parse(ids).length, bad };
  log.errAll = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
