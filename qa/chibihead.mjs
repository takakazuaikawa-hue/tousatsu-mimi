// ミニキャラの絵から頭の所だけを正方形で切り出す（会話の名前の横の顔の見本用）。node qa/chibihead.mjs <出力フォルダ>
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';
const out = process.argv[2];
// 人ごとの切り方 [顔の中心の高さ, 一辺]（絵の中の体の高さに対する割合）。うさ耳の2人は耳の分だけ下へ
const CUT = JSON.parse(process.env.CUT || 'null') || { mimi: [0.38, 0.36], rico: [0.38, 0.36], polka: [0.26, 0.36], selina: [0.26, 0.36], grano: [0.26, 0.36], velvet: [0.26, 0.36] };
fs.mkdirSync(out, { recursive: true });
const server = await serve(REPO, 0);
const browser = await launch({ width: 800, height: 600 });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.port}/qa/out/blank.html`, 30000).catch(() => {});
const chars = Object.keys(CUT), exps = ['smug', 'think', 'win', 'panic', 'lose'];
for (const c of chars) for (const e of exps) {
  const f = `${c}_${e}`, [cyK, sK] = CUT[c];
  const r = await page.eval(`(async () => {
    const img = new Image(); img.src = '/assets/battle/chibi/${process.env.SUB || ''}${f}.webp'; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, W, H).data;
    const op = (i, y) => d[(y * W + i) * 4 + 3] > 40;
    let top = -1, bot = -1;
    for (let y = 0; y < H && top < 0; y++) for (let i = 0; i < W; i++) if (op(i, y)) { top = y; break; }
    for (let y = H - 1; y >= 0 && bot < 0; y--) for (let i = 0; i < W; i++) if (op(i, y)) { bot = y; break; }
    const bh = bot - top, side = bh * ${sK}, cy = top + bh * ${cyK}, y0 = cy - side / 2;
    // 横の中心＝その帯の中で、絵のある所の重心（髪が片側に流れても顔が真ん中に来る）
    let sx = 0, n = 0;
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(H, y0 + side); y++) for (let i = 0; i < W; i++) if (op(i, y)) { sx += i; n++; }
    const cx = n ? sx / n : W / 2;
    const o = document.createElement('canvas'); o.width = o.height = 256;
    o.getContext('2d').drawImage(img, cx - side / 2, y0, side, side, 0, 0, 256, 256);
    const u = o.toDataURL('image/png'); (window.__crops = window.__crops || {})['${f}'] = u; return u;
  })()`);
  fs.writeFileSync(path.join(out, f + '.png'), Buffer.from(r.split(',')[1], 'base64'));
}
// 見比べ用に1枚へ並べる（6人×5表情）
const sheet = await page.eval(`(async () => {
  const names = ${JSON.stringify(chars.flatMap(c => exps.map(e => c + '_' + e)))};
  const o = document.createElement('canvas'); o.width = 5 * 132; o.height = names.length / 5 * 132; const g = o.getContext('2d');
  g.fillStyle = '#3d0f1c'; g.fillRect(0, 0, o.width, o.height);
  for (let i = 0; i < names.length; i++) { const im = new Image(); im.src = window.__crops[names[i]]; await im.decode(); g.drawImage(im, (i % 5) * 132 + 2, Math.floor(i / 5) * 132 + 2, 128, 128); }
  return o.toDataURL('image/png'); })()`);
fs.writeFileSync(path.join(out, '_sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
console.log('ok');
await browser.close(); await server.close();
