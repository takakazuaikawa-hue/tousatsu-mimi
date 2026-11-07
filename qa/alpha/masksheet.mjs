// whitekey の確認用画像（_mask/*.jpg）を一覧にする。node qa/alpha/masksheet.mjs <maskDir> <out.png> name1 name2 ...
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import { REPO } from '../lib/session.mjs';
const [dir, out, ...names] = process.argv.slice(2);
const rel = path.relative(REPO, path.resolve(dir)).split(path.sep).join('/');
const server = await serve(REPO, 0); const br = await launch({}); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/qa/alpha/page.html`); await sleep(200);
const u = await page.eval(`(async () => { const names = ${JSON.stringify(names)}; const TH = 300, COLS = 5; const imgs = [];
  for (const n of names) { const i = new Image(); i.src = '/${rel}/' + n + '.jpg'; await i.decode(); imgs.push([n, i]); }
  const cells = imgs.map(([n, i]) => ({ n, i, w: Math.round(i.naturalWidth * TH / i.naturalHeight) })); const CW = Math.max(...cells.map(c => c.w)) + 8;
  const rows = Math.ceil(cells.length / COLS); const c = document.createElement('canvas'); c.width = CW * COLS; c.height = rows * (TH + 22); const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.font = '14px sans-serif'; x.fillStyle = '#fff';
  cells.forEach((e, k) => { const cx = (k % COLS) * CW, cy = ((k / COLS) | 0) * (TH + 22); x.drawImage(e.i, cx + 4, cy + 18, e.w, TH); x.fillText(e.n, cx + 4, cy + 14); });
  return c.toDataURL('image/png'); })()`);
fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64'));
await br.close(); await server.close();
