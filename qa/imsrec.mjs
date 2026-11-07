// 幕間の会話（カメラの寄り・振り）を動画にする（見本ページ用）。
// ブラウザの時計を止め、1/30 秒ずつ進めては撮る（Emulation.setVirtualTimePolicy）。PC が重くても動きは実時間どおりに並ぶ。
// node qa/imsrec.mjs [相手=polka] [--size 1280x800] [--step 2800]   出力: qa/out/imsrec/<相手>_<size>.mp4
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const opp = args.find((a, i) => !a.startsWith('--') && !['--size', '--step'].includes(args[i - 1])) || 'polka';
const sizeArg = opt('--size', '1280x800'); const [W, H] = sizeArg.split('x').map(Number);
const STEP = +opt('--step', '2800');
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const OUT = path.resolve('qa/out/imsrec'); const dir = path.join(OUT, `${opp}_${sizeArg}`);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = s;
await sleep(5000);
const FPS = 30, DT = 1000 / FPS;
let expired = null;
page.on('Emulation.virtualTimeBudgetExpired', () => { if (expired) { const f = expired; expired = null; f(); } });
const advance = (ms) => new Promise((res) => {
  const t = setTimeout(() => { expired = null; res(); }, 15000);
  expired = () => { clearTimeout(t); res(); };
  page.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }).catch(() => { clearTimeout(t); expired = null; res(); });
});
await page.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
await page.eval(`(() => { showIntermission(${JSON.stringify(opp)}, () => {}, true); return 1; })()`);
const n = await page.eval(`INTERMISSIONS[${JSON.stringify(opp)}].lines.length`);
const clickEvery = Math.round(STEP / DT), totalFrames = n * clickEvery;
for (let k = 0; k < totalFrames; k++) {
  if (k > 0 && k % clickEvery === 0) await page.eval(`(() => { const o = document.querySelector('.intermission-overlay'); if (o) o.click(); return 1; })()`);
  await advance(DT);
  // 透明度・位置の動きはブラウザが本当の時間で進めてしまう（PC が重いと1コマの間に終わる）。
  // 全部の動きを止め、止めた時計（performance.now）に合わせて置き直してから撮る。初めて見た動きは「いま始まった」とみなす
  await page.eval(`(() => { const now = performance.now(); for (const a of document.getAnimations()) { if (a.__t0 == null) a.__t0 = now - Math.min(a.currentTime || 0, ${DT}); a.pause(); a.currentTime = now - a.__t0; } return 1; })()`);
  await page.screenshot(path.join(dir, `f${String(k).padStart(5, '0')}.png`));
}
await s.close();
const mp4 = path.join(OUT, `${opp}_${sizeArg}.mp4`);
execFileSync(FF, ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'), '-vf', `scale=${Math.min(W, 1280)}:-2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', mp4]);
console.log('コマ', totalFrames, '長さ', (totalFrames / FPS).toFixed(1) + '秒', '→', mp4, (fs.statSync(mp4).size / 1024 | 0) + 'KB');
