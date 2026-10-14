// 描き直された絵（位置合わせ済み png）から頭の上の耳の所だけを今の絵に重ねる。留め具・紐の測った値をそのまま使えるように、耳以外は今の絵のまま。
// 使い方：node earpaste.mjs <今の絵（qa/panyu-tools内）> <耳付きの位置合わせ済みpng（qa/panyu-tools内）> <出力webpパス> [x0 x1 y1 ぼかし]
//   x0〜x1・上端〜y1 の四角を重ね、四角の縁はぼかし幅でなめらかに混ぜる（1400x788 の座標）
import fs from 'node:fs';
import { launch } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [BASE, EARS, OUT, X0 = 440, X1 = 960, Y1 = 150, F = 36, EX = ''] = process.argv.slice(2);   // EX：重ねない四角 'x0,y0,x1,y1'（髪飾りなど）
const server = await serve('C:/Users/takakazu/projects/mp_panyu/qa/panyu-tools', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/align2.html`, 8000);
const d = await page.eval(`(async()=>{
  const ld = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const a = await ld(${JSON.stringify(BASE)}), b = await ld(${JSON.stringify(EARS)});
  const W = a.naturalWidth, H = a.naturalHeight, x0 = ${+X0}, x1 = ${+X1}, y1 = ${+Y1}, f = ${+F}, ex = ${JSON.stringify(EX ? EX.split(',').map(Number) : null)};
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(a, 0, 0);
  const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.drawImage(b, 0, 0, W, H);
  const A = g.getImageData(0, 0, W, H), B = mg.getImageData(0, 0, W, H);
  const ss = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  for (let y = 0; y < Math.min(H, y1 + f); y++) for (let x = Math.max(0, x0 - f); x < Math.min(W, x1 + f); x++) {
    const w = ss(x0 - f, x0, x) * (1 - ss(x1, x1 + f, x)) * (1 - ss(y1, y1 + f, y)) * (ex ? 1 - ss(ex[0] - 8, ex[0], x) * (1 - ss(ex[2], ex[2] + 8, x)) * ss(ex[1] - 8, ex[1], y) * (1 - ss(ex[3], ex[3] + 8, y)) : 1); if (w <= 0) continue;
    const k = (y * W + x) * 4; for (let j = 0; j < 3; j++) A.data[k + j] = A.data[k + j] * (1 - w) + B.data[k + j] * w;
  }
  g.putImageData(A, 0, 0); return c.toDataURL('image/webp', 0.92); })()`, 60000);
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64')); console.log(fs.statSync(OUT).size);
await br.close(); await server.close(); process.exit(0);
