// 起動時の読み込み画面を撮る。タイトルの背景の読み込みを止めて、読み込み画面を出したままにする（検査の中だけ）。
// node qa/loadshot.mjs [width height] [out.png]
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/loading.png'] = process.argv.slice(2);
const server = await serve(REPO, 0); const br = await launch({ width: +W, height: +H }); const page = await br.newPage();
await page.setViewport(+W, +H, +W < 900);
const fontsDir = path.join(REPO, 'qa', 'out', 'fonts'); const css = fs.existsSync(path.join(fontsDir, 'fonts.css')) ? fs.readFileSync(path.join(fontsDir, 'fonts.css')) : Buffer.from('');
await page.send('Fetch.enable', { patterns: [{ urlPattern: '*fonts.googleapis.com*' }, { urlPattern: '*title_bg.webp*' }] });
page.on('Fetch.requestPaused', (p) => {
  if (/title_bg\.webp/.test(p.request.url)) return; // 応答しない＝読み込み画面のまま（最長8秒）
  const m = p.request.url.match(/\/qa\/out\/fonts\/([^?#]+)/); const f = m ? path.join(fontsDir, path.basename(m[1])) : null; const isFont = f && fs.existsSync(f);
  page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: isFont ? 'font/woff2' : 'text/css' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: (isFont ? fs.readFileSync(f) : css).toString('base64') }).catch(() => {});
});
await page.goto(`http://127.0.0.1:${server.port}/index.html`, 300);
await sleep(3000);
if (process.env.UI_ONLY) { // 一枚絵を隠して、文字と影だけを透明な背景で撮る（動画に重ねる確認用）
  await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await page.eval(`(() => { const o = document.getElementById('preload-overlay'); o.style.background = 'transparent'; document.documentElement.style.background = document.body.style.background = 'transparent'; o.querySelectorAll('.preload-kv, .preload-kv-motion').forEach(e => e.style.visibility = 'hidden'); const st = document.createElement('style'); st.textContent = 'html,body{background:transparent !important;background-image:none !important} body::before,body::after{display:none !important} #stage,#portrait-warning,#fullscreen-btn-group{display:none !important}'; document.head.appendChild(st); const t = document.getElementById('preload-tip'); t.classList.remove('is-swapping'); return true; })()`);
  await sleep(400);
}
await page.screenshot(path.resolve(out));
console.log(await page.eval(`JSON.stringify({ pct: (document.getElementById('preload-pct')||{}).textContent, tip: (document.getElementById('preload-tip')||{}).textContent, video: !!document.querySelector('.preload-kv-motion') })`));
await br.close(); await server.close(); process.exit(0);
