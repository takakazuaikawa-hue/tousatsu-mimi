// 卓の「場の危険」の帯（ポットオッズ入門を持っている時）を撮る。node qa/dangershot.mjs <WxH> <outDir>
// 場札を ♦9 ♦10 ♦2 J（フラッシュ気配＋ストレート気配＝いちばん強い段）と、♣2 ♥7 ♠K（何も無い段）の2通りで撮る
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/dangershot');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;
const ADVANCE = `(() => {
  const re = /^(▶ ?開始|開始|始める|次へ|スキップ|OK|閉じる|はじめる|対戦へ)$/;
  const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim())).pop();
  if (b) { b.click(); return false; }
  return !!document.querySelector('[data-action="start-hand"]');
})()`;
const BOARDS = {
  danger: `[{ suit: '♦', rank: 9, label: '9' }, { suit: '♦', rank: 10, label: '10' }, { suit: '♦', rank: 2, label: '2' }, { suit: '♣', rank: 11, label: 'J' }]`,
  safe: `[{ suit: '♣', rank: 2, label: '2' }, { suit: '♥', rank: 7, label: '7' }, { suit: '♠', rank: 13, label: 'K' }]`,
};
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await page.eval(`(() => { save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = save.clearedStages.slice(); save.unlockedNotes = ['board_danger']; state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(2500);
  await page.eval(`(() => { startBattle('grano'); return 1; })()`);
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) { ok = await page.eval(ADVANCE); if (!ok) await sleep(700); }
  await page.eval(`(() => { document.querySelector('[data-action="start-hand"]').click(); return 1; })()`);
  for (let i = 0; i < 30; i++) { if (await page.eval(`!!document.querySelector('.action-area button:not([disabled])') && !document.querySelector('[data-action="start-hand"]')`)) break; await sleep(600); }
  for (let i = 0; i < 40 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
  await page.eval(`document.querySelectorAll('.mk-layer').forEach(e => e.remove()); true`);
  for (const [k, board] of Object.entries(BOARDS)) {
    const info = await page.eval(`(() => { state.community = ${board}; state.pendingRevealFrom = -1; state.handPhase = state.community.length >= 4 ? 'turn' : 'flop'; applyBindings(); const d = document.querySelector('.v2-danger'); if (!d) return null; const r = d.getBoundingClientRect(); return { html: d.innerHTML.replace(/\\s+/g, ' ').slice(0, 400), rect: [r.x, r.y, r.width, r.height].map(Math.round) }; })()`);
    await sleep(500);
    console.log(tag, k, JSON.stringify(info));
    await page.screenshot(path.join(out, `${tag}-${k}.png`));
    if (info) fs.writeFileSync(path.join(out, `${tag}-${k}-rect.json`), JSON.stringify(info.rect));
  }
} finally {
  await session.close();
}
