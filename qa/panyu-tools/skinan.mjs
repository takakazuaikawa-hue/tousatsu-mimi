// skincheck.mjs が RAWONLY=1 で書いた生の写真（出力頭-raw-*.png）を、ブラウザ無しで解析する。引数：出力の頭
// 指標は skincheck.mjs と同じ（肌色はずれ・継ぎ目の増え・ラインの角）。問題の画素を塗った写真を 出力頭-an-*.png に書く
import fs from 'fs'; import zlib from 'zlib';
const OUT = process.argv[2]; const names = ['0', '1', '2', '3', '3揺れ', '3揺れ2'];
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function dec(buf) { let p = 8, W, H, bd, ct; const idat = []; while (p < buf.length) { const l = buf.readUInt32BE(p), t = buf.toString('latin1', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + l); if (t === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } if (t === 'IDAT') idat.push(d); p += 12 + l; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = W * bpp, out = new Uint8ClampedArray(W * H * 4); let prev = new Uint8Array(st);
  for (let y = 0; y < H; y++) { const f = raw[y * (st + 1)], row = new Uint8Array(raw.buffer, raw.byteOffset + y * (st + 1) + 1, st), cur = new Uint8Array(st);
    for (let i = 0; i < st; i++) { const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } cur[i] = v & 255; }
    for (let x = 0; x < W; x++) { out[(y * W + x) * 4] = cur[x * bpp]; out[(y * W + x) * 4 + 1] = cur[x * bpp + 1]; out[(y * W + x) * 4 + 2] = cur[x * bpp + 2]; out[(y * W + x) * 4 + 3] = 255; } prev = cur; }
  return { W, H, d: out }; }
function enc(W, H, d) { const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(d.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  const ch = (t, b) => { const l = Buffer.alloc(4); l.writeUInt32BE(b.length); const tb = Buffer.concat([Buffer.from(t, 'latin1'), b]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(tb)); return Buffer.concat([l, tb, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]); }
const imgs = names.map(n => dec(fs.readFileSync(`${OUT}-raw-${n}.png`))); const { W, H } = imgs[0]; const D = imgs.map(i => i.d);
const lum = (d, k) => 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
const skinish = (d, k) => { const r = d[k], g = d[k + 1], b = d[k + 2]; return r > 120 && r >= g && g >= b - 6 && r - b > 18 && r - g < 110; };
let n = 0, mu = [0, 0], m2 = [0, 0]; const d0 = D[0];
for (let y = 0; y < H * 0.45; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (!skinish(d0, k)) continue; const s = d0[k] + d0[k + 1] + d0[k + 2]; const c = [d0[k] / s, d0[k + 1] / s]; mu[0] += c[0]; mu[1] += c[1]; m2[0] += c[0] * c[0]; m2[1] += c[1] * c[1]; n++; }
mu = mu.map(v => v / n); const sd = m2.map((v, i) => Math.sqrt(Math.max(1e-8, v / n - mu[i] * mu[i])));
const seamCount = (d) => { const S = new Int32Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += skinish(d, (y * W + x) * 4) ? 1 : 0; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row; } }
  const box = (x0, y0, x1, y1) => S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0]; const r = 8;
  let c = 0; const mask = new Uint8Array(W * H); for (let y = Math.max(r + 1, Math.floor(H * 0.28)); y < H - r - 1; y++) for (let x = r + 1; x < W - r - 1; x++) { if (box(x - r, y - r, x + r + 1, y + r + 1) < (2 * r + 1) * (2 * r + 1)) continue; const k = (y * W + x) * 4; const gx = lum(d, k + 8) - lum(d, k - 8), gy = lum(d, k + W * 8) - lum(d, k - W * 8); if (Math.hypot(gx, gy) > 34) { c++; mask[y * W + x] = 1; } } return [c, mask]; };
const [base0] = seamCount(D[0]);
const lineKinks = (d) => { const ys = []; for (let x = Math.floor(W * 0.08); x < W * 0.92; x += 2) { let run = 0, yy = -1; for (let y = Math.floor(H * 0.3); y < H - 2; y++) { const k = (y * W + x) * 4; if (skinish(d, k)) run++; else { if (run > 12) { yy = y; break; } run = 0; } } ys.push(yy); }
  let k = 0; for (let i = 2; i < ys.length - 2; i++) { if (ys[i] < 0 || ys[i - 2] < 0 || ys[i + 2] < 0) continue; const a = ys[i] - ys[i - 2], b = ys[i + 2] - ys[i]; if (Math.abs(b - a) > 9 && Math.abs(a) < 14 && Math.abs(b) < 14) k++; } return k; };
const kink0 = lineKinks(D[0]); const out = [];
names.forEach((nm, i) => { const d = D[i]; let sk = 0, off = 0; const od = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (!skinish(d, k)) continue; const L = lum(d, k); if (L < 95) continue; sk++; const t = d[k] + d[k + 1] + d[k + 2]; const z = Math.max(Math.abs(d[k] / t - mu[0]) / sd[0], Math.abs(d[k + 1] / t - mu[1]) / sd[1]); const sat = Math.max(d[k], d[k + 1], d[k + 2]) - Math.min(d[k], d[k + 1], d[k + 2]);
    if (z > 4.5 || (sat < 22 && L > 120 && L < 205)) { off++; od[k] = 40; od[k + 1] = 90; od[k + 2] = 255; } }
  const [sc, mask] = seamCount(d); for (let j = 0; j < W * H; j++) if (mask[j]) { od[j * 4] = 255; od[j * 4 + 1] = 0; od[j * 4 + 2] = 0; }
  fs.writeFileSync(`${OUT}-an-${nm}.png`, enc(W, H, od));
  out.push({ 状態: nm, 肌色はずれ: (100 * off / Math.max(1, sk)).toFixed(2) + '%', 継ぎ目の増え: sc - base0, ラインの角: lineKinks(d) - kink0 }); });
console.table(out);
