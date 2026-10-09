// 目視用の一覧画像：各画像を「桃色の上」と「暗い背景の上」に並べて、重さ順に qa/out/alpha/sheet-N.png へ
// あわせて、縁の残りが多い所を3倍に拡大した zoom.png（ワースト20）
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import { REPO } from '../lib/session.mjs';

const OUT = path.join(REPO, 'qa', 'out', 'alpha');
const rows = JSON.parse(fs.readFileSync(path.join(OUT, 'scored.json'), 'utf8'));
const PER_SHEET = 36, COLS = 6, TW = 128, TH = 150;
const server = await serve(REPO, 0);
const browser = await launch({ width: 1600, height: 1200 });
const shortName = (f) => f.replace('assets/', '').replace('battle/', 'b/').replace('.webp', '');
async function shot(page, html, w, h, file) {
  await page.setViewport(w, h);
  await page.eval(`(async()=>{document.body.innerHTML=${JSON.stringify(html)};await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
    [...document.querySelectorAll('canvas[data-src]')].forEach(c=>{const i=document.getElementById(c.dataset.src);const [x,y,s,o]=c.dataset.crop.split(',').map(Number);const g=c.getContext('2d');g.fillStyle='#ff00ff';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;g.drawImage(i,x,y,s,s,0,0,c.width,c.height);});})()`);
  const r = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/qa/alpha/page.html`);
  await page.eval(`document.body.style.cssText='margin:0;background:#333;font:11px sans-serif;color:#fff'`);
  // 一覧
  const nSheets = Math.ceil(rows.length / PER_SHEET);
  for (let s = 0; s < nSheets; s++) {
    const part = rows.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
    let html = `<div style="display:grid;grid-template-columns:repeat(${COLS},1fr);gap:6px;padding:6px;width:1588px">`;
    for (const r of part) {
      html += `<div style="background:#111;padding:3px"><div style="display:flex;gap:4px">` +
        `<div style="width:${TW}px;height:${TH}px;background:#ff00ff"><img src="/${r.file}" style="width:100%;height:100%;object-fit:contain"></div>` +
        `<div style="width:${TW}px;height:${TH}px;background:#0b0510"><img src="/${r.file}" style="width:100%;height:100%;object-fit:contain"></div></div>` +
        `<div style="margin-top:2px;white-space:nowrap;overflow:hidden">${r.score} ${shortName(r.file)}</div></div>`;
    }
    html += '</div>';
    const h = Math.ceil(part.length / COLS) * (TH + 28) + 20;
    await shot(page, html, 1600, h, path.join(OUT, `sheet-${s + 1}.png`));
  }
  // ズーム：縁の残り（外周の不透明は除く）が多い順
  const resid = (r) => r.issues.filter(i => !['border', 'opaque', 'noalpha', 'flat'].includes(i.k)).reduce((a, i) => a + i.pts, 0);
  const worst = rows.filter(r => r.metrics.hasAlpha && r.metrics.zoom && r.metrics.zoom.score > 0).map(r => ({ r, v: resid(r) })).sort((a, b) => b.v - a.v).slice(0, 20).map(x => x.r);
  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px;width:1588px">`;
  worst.forEach((r, i) => {
    const z = r.metrics.zoom; const size = Math.round(z.size * 1.5);
    const x = Math.max(0, Math.min(r.metrics.w - size, z.x - Math.round(z.size * 0.25))), y = Math.max(0, Math.min(r.metrics.h - size, z.y - Math.round(z.size * 0.25)));
    html += `<div style="background:#111;padding:3px"><div style="display:flex;gap:4px"><img id="im${i}" src="/${r.file}" style="display:none">` +
      `<canvas data-src="im${i}" data-crop="${x},${y},${size},0" width="288" height="288"></canvas>` +
      `<div style="width:90px;height:110px;background:#ff00ff"><img src="/${r.file}" style="width:100%;height:100%;object-fit:contain"></div></div>` +
      `<div style="margin-top:2px;white-space:nowrap;overflow:hidden">${resid(r)} ${shortName(r.file)}</div></div>`;
  });
  html += '</div>';
  await shot(page, html, 1600, Math.ceil(worst.length / 4) * 320 + 20, path.join(OUT, 'zoom.png'));
  console.log('sheets', nSheets, 'zoom', worst.map(r => r.file).join(' '));
} finally { await browser.close(); await server.close(); }
