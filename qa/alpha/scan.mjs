// 背景抜きの検査：画像ごとの数値を qa/out/alpha/metrics.json に書く
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import { REPO } from '../lib/session.mjs';

export const DIRS = ['assets/characters', 'assets/battle/chibi', 'assets/battle/face', 'assets/ui'];
export function listImages() {
  const out = [];
  for (const d of DIRS) {
    for (const f of fs.readdirSync(path.join(REPO, d)).sort()) {
      if (/\.(webp|png)$/i.test(f)) out.push(d + '/' + f);
    }
  }
  return out;
}

const OUT = path.join(REPO, 'qa', 'out', 'alpha');
fs.mkdirSync(OUT, { recursive: true });
const files = listImages();
const server = await serve(REPO, 0);
const browser = await launch({ width: 1200, height: 800 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/qa/alpha/page.html`);
  const metrics = {};
  for (let i = 0; i < files.length; i += 6) {
    const batch = files.slice(i, i + 6);
    const r = await page.eval(`Promise.all(${JSON.stringify(batch)}.map(f => scanImage('/' + f).catch(e => ({ error: String(e) }))))`, 120000);
    batch.forEach((f, j) => { metrics[f] = r[j]; });
    process.stdout.write(`\r${Math.min(i + 6, files.length)}/${files.length}`);
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 1));
  console.log('\nok', Object.keys(metrics).length);
} finally {
  await browser.close(); await server.close();
}
