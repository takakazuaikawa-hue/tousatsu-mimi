// ご褒美CGの網目の動き（live-cg.js）を確かめる。見る画面で開き、息の半分ずらして2枚撮り、差を強めた絵を作る
// （動いた所だけ明るい＝人物の胸・頭・髪だけが光り、背景の直線は暗いままなら正しい）。
// node qa/livecg.mjs [id ...]   出力: qa/out/livecg/<id>_a.png・<id>_diff.png
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet', 'cg_selina_fireside'];
const OUT = path.resolve('qa/out/livecg'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: 1280, height: 800 });
const { page } = s;
await sleep(5000);
for (const id of ids) {
  await page.eval(`(() => { document.querySelectorAll('.reward-cg-viewer-overlay,.home-overlay,.login-bonus-overlay').forEach(e => e.remove()); showRewardCgViewer(${JSON.stringify(id)}); return true; })()`);
  await sleep(2500);
  const st = await page.eval(`JSON.stringify({ on: !!document.querySelector('.reward-cg-viewer-overlay canvas.live-cg.on'), video: !!document.querySelector('.reward-cg-viewer-overlay video') })`);
  const a = path.join(OUT, `${id}_a.png`), b = path.join(OUT, `${id}_b.png`);
  await page.screenshot(a); await sleep(1150); await page.screenshot(b);
  execFileSync(FF, ['-loglevel', 'error', '-y', '-i', a, '-i', b, '-filter_complex', 'blend=all_mode=difference,eq=contrast=6:brightness=0.03', '-frames:v', '1', path.join(OUT, `${id}_diff.png`)]);
  console.log(id, st);
}
console.log('errors', await page.eval(`JSON.stringify((window.__errors || []).slice(0, 5))`));
await s.close();
