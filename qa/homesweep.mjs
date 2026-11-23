// ホームを場面ごとに撮り、文字の切れ・はみ出しを洗い出す（11/23「はみ出しやずれはすぐに回収の始まり」）
// QA_SIZE=844x390 node qa/homesweep.mjs   出力 qa/out/homesweep/<大きさ>_<場面>.png と一覧
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/homesweep', { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const CASES = [
  ['day1', { clearedStages: ['rico_tutorial'] }],
  ['day2', { clearedStages: ['rico_tutorial', 'polka'] }],
  ['day3', { clearedStages: ['rico_tutorial', 'polka', 'selina'] }],
  ['day4', { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'] }],
  ['clear', { clearedStages: ALL, endingUnlocked: true }],
  ['horoyoi', { clearedStages: ALL, endingUnlocked: true, horoyoiMode: true, horoyoiCleared: ['rico_tutorial', 'polka'] }],
  ['deisui', { clearedStages: ALL, endingUnlocked: true, horoyoiMode: true, deisuiMode: true, horoyoiCleared: ALL, deisuiCleared: ['rico_tutorial', 'polka', 'selina'] }],
];
// 文字が箱から切れている・はみ出している物（自分の箱で切れる／親の枠の外へ出る）
const CUT = `(() => {
  const out = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  document.querySelectorAll('.home-stage *').forEach(e => {
    if (!vis(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) return;
    const c = getComputedStyle(e), txt = e.textContent.trim().slice(0, 16);
    if (e.scrollWidth > e.clientWidth + 1 && c.overflow !== 'visible' && c.textOverflow !== 'ellipsis') out.push('切れ「' + txt + '」' + (e.scrollWidth - e.clientWidth) + 'px');
    const rg = document.createRange(); rg.selectNodeContents(e); const t = rg.getBoundingClientRect();
    if (t.right > innerWidth + 1 || t.left < -1 || t.bottom > innerHeight + 1) out.push('画面外「' + txt + '」');
  });
  return JSON.stringify([...new Set(out)]);
})()`;
const STD = stdCheck({ minText: 14, bodyMin: 14 });
for (const [name, extra] of CASES) {
  const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, save: { introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000, ...extra } });
  const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 100));
  try {
    for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
    await sleep(2500); await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(8000);
    await q(`document.querySelectorAll('.login-bonus-overlay, .mimi-confirm-overlay').forEach(e => e.remove())`); await sleep(500);
    await page.screenshot(`qa/out/homesweep/${W}_${name}.png`);
    const cut = JSON.parse(await q(CUT)); const std = await page.eval(STD);
    const s = typeof std === 'string' ? JSON.parse(std) : std;
    console.log(name.padEnd(8), 'cut', JSON.stringify(cut), 'clip', JSON.stringify(s.clip || []).slice(0, 200), 'small', JSON.stringify(s.small || []).slice(0, 160));
  } finally { await close(); }
}
