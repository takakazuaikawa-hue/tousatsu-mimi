// 黒い背景に描いた光の絵（ChatGPT 等）を、「明るさ＝透け具合」の透明な webp に直す。
// 黒は透明、明るい所ほど不透明。色は透け具合で割り戻すので、暗い所に重ねても元の光の色のまま見える。
// node qa/alpha/glowkey.mjs <in.png> <out.webp> [幅=1280] [品質=0.86]
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../lib/cdp.mjs';

const [inFile, outFile, w = '1280', q = '0.86'] = process.argv.slice(2);
if (!inFile || !outFile) { console.log('usage: node qa/alpha/glowkey.mjs <in.png> <out.webp> [width] [quality]'); process.exit(1); }
const b64 = fs.readFileSync(inFile).toString('base64');
const mime = /\.webp$/i.test(inFile) ? 'image/webp' : /\.jpe?g$/i.test(inFile) ? 'image/jpeg' : 'image/png';
const browser = await launch({ width: 800, height: 600 });
try {
  const page = await browser.newPage();
  await page.eval(`window.__src = ${JSON.stringify(`data:${mime};base64,${b64}`)}; true`);
  const out = await page.eval(`(async () => {
    const img = new Image(); img.src = window.__src; await img.decode();
    const W = ${+w}, H = Math.round(img.naturalHeight * W / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const m = Math.max(p[i], p[i + 1], p[i + 2]);
      // ほぼ黒（圧縮のにじみ）は完全に透明に
      const a = m < 6 ? 0 : m;
      if (a === 0) { p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0; continue; }
      p[i] = Math.min(255, Math.round(p[i] * 255 / a)); p[i + 1] = Math.min(255, Math.round(p[i + 1] * 255 / a)); p[i + 2] = Math.min(255, Math.round(p[i + 2] * 255 / a)); p[i + 3] = a;
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/webp', ${+q});
  })()`);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(out.split(',')[1], 'base64'));
  console.log(outFile, fs.statSync(outFile).size, 'bytes');
} finally { await browser.close(); }
