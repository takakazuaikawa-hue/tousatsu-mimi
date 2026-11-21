// ホームでリコ先輩を押す所（.h15-rico-talk）の位置と、押した時に一言が替わるかを撮る。押す所は赤い枠で見せる（撮影だけ）。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/ricotalk.mjs [844x390]   出力 qa/out/ricotalk/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/ricotalk'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 900, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, coins: 800 } });
const { page } = s;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof goLobby === "function"').catch(() => false)); i++) await sleep(500);
  await page.eval(`save.homeStageSeen = 2; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; goLobby(); true`);
  await sleep(6000);
  const info = await page.eval(`(() => { const t = document.querySelector('.h15-rico-talk'); if (!t) return 'なし'; const r = t.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const over = [...document.querySelectorAll('.home-stage button, .home-stage [data-action]')].filter(b => b !== t).filter(b => { const q = b.getBoundingClientRect(); return q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom; }).map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 12));
    t.style.outline = '2px solid red'; return JSON.stringify({ top: h && (h.className || h.tagName), topZ: h && getComputedStyle(h).zIndex, par: h && h.parentElement && h.parentElement.className, box: [r.left, r.top, r.width, r.height].map(Math.round), hit: h === t, overlaps: over }); })()`);
  console.log(info);
  const before = await page.eval(`document.querySelector('.h15-dialogue').textContent`);
  await page.screenshot(path.join(OUT, `${W}x${H}_a.png`));
  await page.eval(`document.querySelector('.h15-rico-talk').click(); true`); await sleep(700);
  const after = await page.eval(`document.querySelector('.h15-dialogue').textContent`);
  console.log('前', before, '／後', after);
  await page.screenshot(path.join(OUT, `${W}x${H}_b.png`));
  console.log('例外', JSON.stringify(s.exceptions.slice(0, 3)));
} finally { await s.close(); }
