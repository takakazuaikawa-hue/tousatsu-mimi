// 指定した画像だけを大きく並べる（桃色の上）。使い方: node qa/alpha/big.mjs 出力名 画像パス... （assets/ からの相対でも可）
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import { REPO } from '../lib/session.mjs';

const [name, ...files] = process.argv.slice(2);
const COLS = 4, CW = 392, CH = 420;
const server = await serve(REPO, 0);
const browser = await launch({ width: 1600, height: 900 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/qa/alpha/page.html`);
  let html = `<div style="display:grid;grid-template-columns:repeat(${COLS},${CW}px);gap:6px;padding:6px;background:#333;font:11px sans-serif;color:#fff">`;
  for (const f of files) {
    const p = f.startsWith('assets/') ? f : 'assets/' + f;
    html += `<div><div style="width:${CW}px;height:${CH}px;background:#ff00ff"><img src="/${p}" style="width:100%;height:100%;object-fit:contain"></div>${p}</div>`;
  }
  html += '</div>';
  const h = Math.ceil(files.length / COLS) * (CH + 24) + 20;
  await page.setViewport(1600, h);
  await page.eval(`(async()=>{document.body.style.margin='0';document.body.innerHTML=${JSON.stringify(html)};await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));})()`);
  const r = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1600, height: h, scale: 1 } });
  fs.writeFileSync(path.join(REPO, 'qa', 'out', 'alpha', name + '.png'), Buffer.from(r.data, 'base64'));
} finally { await browser.close(); await server.close(); }
