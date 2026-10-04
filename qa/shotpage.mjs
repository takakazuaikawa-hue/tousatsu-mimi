// リポジトリ内の HTML を1枚撮る（見本の確認用）。node qa/shotpage.mjs <path.html> <out.png> [width height]
import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';
const [file, out, W = 1280, H = 800] = process.argv.slice(2);
const server = await serve(REPO, 0); const br = await launch({ width: +W, height: +H }); const page = await br.newPage();
await page.setViewport(+W, +H);
await page.useLocalFonts(path.join(REPO, 'qa', 'out', 'fonts', 'fonts.css'));
const url = `http://127.0.0.1:${server.port}/${path.relative(REPO, path.resolve(file)).split(path.sep).join('/')}`;
if (process.env.TRANSPARENT) await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await page.goto('about:blank', 1);
await page.goto(url, 8000);
await page.eval('document.fonts.ready.then(() => true)');
await sleep(800);
await page.screenshot(path.resolve(out));
await br.close(); await server.close(); process.exit(0);
