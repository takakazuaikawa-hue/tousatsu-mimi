// リポジトリ内の HTML の CSS アニメを、時間を止めて1コマずつ撮る（確認用の動画を合成するため）。
// node qa/animshot.mjs <page.html?query> <outDir> [seconds=8] [fps=24] [width height]   TRANSPARENT=1 で背景を透明に
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';
const [file, outDir, secs = 8, fps = 24, W = 1280, H = 800] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(REPO, 0); const br = await launch({ width: +W, height: +H }); const page = await br.newPage();
await page.setViewport(+W, +H);
await page.useLocalFonts(path.join(REPO, 'qa', 'out', 'fonts', 'fonts.css'));
if (process.env.TRANSPARENT) await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
const [p, q] = file.split('?');
await page.goto(`http://127.0.0.1:${server.port}/${path.relative(REPO, path.resolve(p)).split(path.sep).join('/')}${q ? '?' + q : ''}`, 8000);
await page.eval('document.fonts.ready.then(() => true)');
await sleep(500);
await page.eval('document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); true');
const n = Math.round(+secs * +fps);
for (let i = 0; i < n; i++) {
  const t = i / +fps * 1000;
  await page.eval(`document.getAnimations().forEach(a => { a.currentTime = ${t}; }); true`);
  await page.screenshot(path.join(outDir, String(i).padStart(4, '0') + '.png'));
}
console.log('frames', n);
await br.close(); await server.close(); process.exit(0);
