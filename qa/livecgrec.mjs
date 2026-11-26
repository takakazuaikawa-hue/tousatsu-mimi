// ご褒美CGの網目の動きを動画にする（見せる用）。時計（window.__liveT）を 1/15 秒ずつ進めて撮る＝端末で見える動きと同じ。
// node qa/livecgrec.mjs [--sec 9] id ...   出力: qa/out/livecgrec/<id>.mp4（絵の所だけ切り抜き、960×540）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const args = process.argv.slice(2);
const SEC = args.includes('--sec') ? +args[args.indexOf('--sec') + 1] : 4.6;
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--sec');
const FPS = +(process.env.FPS || 10);
const OUT = path.resolve('qa/out/livecgrec'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: 960, height: 600 });
const { page } = s;
await sleep(5000);
for (const id of ids) {
  const dir = path.join(OUT, id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.eval(`(() => { document.querySelectorAll('.reward-cg-viewer-overlay,.home-overlay,.login-bonus-overlay').forEach(e => e.remove()); window.__liveT = 0; showRewardCgViewer(${JSON.stringify(id)}); return true; })()`);
  await sleep(2500);
  const r = JSON.parse(await page.eval(`(() => { const c = document.querySelector('.reward-cg-viewer-overlay canvas.live-cg'); const b = c.getBoundingClientRect(); const s = Math.min(b.width / 1600, b.height / 900); const w = 1600 * s, h = 900 * s; return JSON.stringify({ x: Math.round(b.left + (b.width - w) / 2), y: Math.round(b.top + (b.height - h) / 2), w: Math.round(w), h: Math.round(h) }); })()`));
  const N = Math.round(SEC * FPS);
  for (let k = 0; k < N; k++) {
    await page.eval(`(window.__liveT = ${(k / FPS).toFixed(4)}, 1)`);
    await sleep(90);
    await page.screenshot(path.join(dir, `f${String(k).padStart(4, '0')}.png`));
  }
  const mp4 = path.join(OUT, `${id}.mp4`);
  execFileSync(FF, ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', `crop=${r.w}:${r.h}:${r.x}:${r.y},scale=960:540,minterpolate=fps=30`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '25', '-movflags', '+faststart', mp4]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(id, (fs.statSync(mp4).size / 1024 | 0) + 'KB');
}
await page.eval('(window.__liveT = null, 1)');
await s.close();
