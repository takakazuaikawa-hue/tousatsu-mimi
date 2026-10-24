// 幕間の会話（エンディングと同じ見せ方）を、相手ごとに1行目〜最後まで撮る。
// node qa/imsshot.mjs [--size 844x390] [相手 ...]   出力: qa/out/imsshot/<size>/<相手>_<n>.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const args = process.argv.slice(2);
const sizeArg = args[args.indexOf('--size') + 1] && args.includes('--size') ? args[args.indexOf('--size') + 1] : '1280x800';
const [W, H] = sizeArg.split('x').map(Number);
const who = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--size');
const OPP = who.length ? who : ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const OUT = path.resolve('qa/out/imsshot', sizeArg); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = s;
await sleep(5000);
for (const id of OPP) {
  await page.eval(`(() => { document.querySelectorAll('.intermission-overlay').forEach(e => e.remove()); showIntermission(${JSON.stringify(id)}, () => {}, true); return true; })()`);
  const n = await page.eval(`INTERMISSIONS[${JSON.stringify(id)}].lines.length`);
  for (let i = 0; i < n; i++) {
    await sleep(1400);
    const m = await page.eval(`(() => { const t = document.querySelector('.ims-scene.show .ek-text'); const r = t.getBoundingClientRect(); return { px: +(parseFloat(getComputedStyle(t).fontSize) * r.height / t.offsetHeight).toFixed(1), bottom: Math.round(r.bottom), h: innerHeight }; })()`);
    await page.screenshot(path.join(OUT, `${id}_${i + 1}.png`));
    console.log(id, i + 1, JSON.stringify(m));
    await page.eval(`document.querySelector('.intermission-overlay').click(); true`);
  }
}
await s.close();
