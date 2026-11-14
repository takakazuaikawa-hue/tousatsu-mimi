// ロード画面の％の数字が左の丸飾りに収まるか（0・58・100%）。node qa/preloadpct.mjs   出力 qa/out/preloadpct/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/preloadpct'); fs.mkdirSync(OUT, { recursive: true });
for (const size of ['1280x800', '844x390', '1920x1080']) {
  const [W, H] = size.split('x').map(Number);
  const s = await openSession({ width: W, height: H });
  const { page } = s;
  await sleep(1500);
  for (const v of [8, 58, 100]) {
    const r = await page.eval(`(() => { const o = document.getElementById('preload-overlay'); if (!o) return 'なし'; o.classList.remove('out'); o.style.display = ''; o.style.opacity = 1; document.getElementById('preload-pct').textContent = '${v}'; const box = document.querySelector('.preload-count > span:last-child'); const prog = document.querySelector('.preload-progress').getBoundingClientRect(); const win = { left: prog.left + prog.width * .079, right: prog.left + prog.width * .184, top: prog.top + prog.height * .255, bottom: prog.top + prog.height * .70 }; const rg = document.createRange(); rg.selectNodeContents(box); const t = rg.getBoundingClientRect(); const b = box.getBoundingClientRect(); return JSON.stringify({ plateW: Math.round(prog.width), slot: [Math.round(b.left), Math.round(b.right)], text: [Math.round(t.left), Math.round(t.right)], window: [Math.round(win.left), Math.round(win.right)], overWin: Math.round(Math.max(win.left - t.left, t.right - win.right, win.top - t.top, t.bottom - win.bottom)),  num: getComputedStyle(document.getElementById('preload-pct')).fontSize }); })()`);
    console.log(size, v + '%', r);
    if (process.env.SHOT) await page.screenshot(path.join(OUT, `${size}_${v}.png`));
  }
  await s.close();
}
process.exit(0);
