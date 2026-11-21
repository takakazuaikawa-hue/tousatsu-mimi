// エンディングの立ち絵の場面（リコ先輩→ミミ）のカメラを、止めた写真で確かめる。
// ブラウザの時計を止めて早送りし、立ち絵の場面が出たら、出た直後・振りの途中・落ち着いた後を撮る。
// node qa/endcam.mjs   出力: qa/out/endcam/*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/endcam'); fs.mkdirSync(OUT, { recursive: true });
const save = { introPlayed: true, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingUnlocked: true, firstClearRewardClaimed: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'] };
const s = await openSession({ width: 1280, height: 800, save });
const { page } = s;
await sleep(5000);
let ex = null;
page.on('Emulation.virtualTimeBudgetExpired', () => { if (ex) { const f = ex; ex = null; f(); } });
const adv = (ms) => new Promise(res => { const t = setTimeout(res, 20000); ex = () => { clearTimeout(t); res(); }; page.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }).catch(res); });
await page.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
await page.eval(`(() => { state.screen = 'ending'; render(); startEndingShow(false); return 1; })()`);
const sideOf = `(() => { const w = [...document.querySelectorAll('.ending-portrait-scene.eps-cam-scene')].filter(e => !e.classList.contains('out')).pop(); return w ? w.dataset.side + ':' + (w.querySelector('.ek-text') || {}).textContent.slice(0, 12) : ''; })()`;
let last = '', shots = 0;
for (let t = 0; t < 240000 && shots < 9; t += 500) {
  await adv(500);
  const sd = await page.eval(sideOf);
  if (sd && sd !== last) {
    last = sd;
    for (const [dt, tag] of [[0, 'a_出た直後'], [600, 'b_振りの途中'], [2400, 'c_落ち着いた後']]) {
      if (dt) await adv(dt);
      await page.screenshot(path.join(OUT, `${String(++shots).padStart(2, '0')}_${sd.split(':')[0]}_${tag}.png`));
    }
    console.log('場面', sd);
  }
}
await s.close();
