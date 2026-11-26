// 読み込み画面：全部の豆知識を入れて、札が画面に収まるか・行数・文字の実寸を測り、一番行の多い文で撮る。
// node qa/loadfit.mjs W H out.png
import fs from 'node:fs'; import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs'; import { serve } from './lib/server.mjs'; import { REPO } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/loadfit.png'] = process.argv.slice(2);
const server = await serve(REPO, 0); const br = await launch({ width: +W, height: +H }); const page = await br.newPage();
await page.setViewport(+W, +H, +W < 900);
await page.send('Fetch.enable', { patterns: [{ urlPattern: '*title_bg.webp*' }] });
page.on('Fetch.requestPaused', () => {});
await page.goto(`http://127.0.0.1:${server.port}/index.html`, 300);
await sleep(3500);
const r = await page.eval(`(() => {
  const t = document.getElementById('preload-tip'), box = document.querySelector('.preload-tip-box'), inner = document.querySelector('.preload-inner');
  const res = []; let worst = 0, wi = 0;
  PRELOAD_TIPS.forEach((s, i) => { setWrapLine(t, s.replace(/^[\u2600-\u27BF\s]+/, '')); t.classList.remove('is-swapping');
    const lh = parseFloat(getComputedStyle(t).lineHeight); const lines = Math.round(t.scrollHeight / lh);
    const b = box.getBoundingClientRect(); res.push(lines); if (lines > worst) { worst = lines; wi = i; }
    if (b.bottom > innerHeight - 4 || t.scrollWidth > t.clientWidth + 1) res.push('NG' + i); });
  setWrapLine(t, PRELOAD_TIPS[wi]);
  const ib = inner.getBoundingClientRect();
  const fs = [...document.querySelectorAll('#preload-overlay *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => e.className + ':' + getComputedStyle(e).fontSize);
  return JSON.stringify({ worst, wi, top: Math.round(ib.top), bottom: Math.round(ib.bottom), compact: document.documentElement.classList.contains('is-compact'), ng: res.filter(x => typeof x === 'string'), fs });
})()`);
await sleep(300);
await page.screenshot(path.resolve(out)); console.log(r);
await br.close(); await server.close(); process.exit(0);
