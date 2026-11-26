// 苦戦の場面の一枚絵を撮る。QA_SIZE=844x390 node qa/struggleshot.mjs   出力 qa/out/struggleshot/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OUT = `qa/out/struggleshot/${w}x${h}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: w, height: h, mobile: w < 900, speed: 1, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true } });
const { page } = session;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof showStoryScene === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  for (const id of (process.env.QA_OPP || 'polka,selina,grano,velvet').split(',')) {
    await page.eval(`showStoryScene('struggle_${id}', () => { window.__sd = true; }); true`);
    await sleep(2500); await page.screenshot(`${OUT}/${id}_1.png`);
    await sleep(4000); await page.screenshot(`${OUT}/${id}_2.png`);
    // 行ごとに進めて撮る（QA_STEPS=6 なら6行）
    for (let n = 2; n <= Number(process.env.QA_STEPS || 0); n++) {
      await page.eval(`(() => { const o = document.querySelector('.story-overlay'); o && o.click(); o && o.click(); return true; })()`); await sleep(2600);
      await page.screenshot(`${OUT}/${id}_line${n}.png`);
      console.log(' 行', n, await page.eval(`[...document.querySelectorAll('.story-art')].map(a => a.style.backgroundImage.split('/').pop() || 'base').join(' ') + ' | ' + (document.querySelector('.story-text') || {}).textContent`));
    }
    console.log(id, await page.eval(`(() => { const a = document.querySelector('.story-art'); if (!a) return 'no art'; const s = getComputedStyle(a); return s.backgroundImage.split('/').pop() + ' ' + s.backgroundSize; })()`));
    await page.eval(`document.querySelectorAll('.story-overlay').forEach(e => e.remove()); true`); await sleep(500);
  }
} finally { await session.close(); }
