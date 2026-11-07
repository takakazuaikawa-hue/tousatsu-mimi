// 切り抜いた絵（透明の背景）に、白い背景の抜け残りがないかを数える。
// 「白に近い不透明の点で、すぐ近く（3px 以内）に透明がある」点を数え、多い順に並べる。抜け残りの場所は、点が固まっている所の枠で出す。
// node qa/whiteleft.mjs [フォルダ=assets/characters] [--top 30]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--top') || 'assets/characters';
const TOP = args.includes('--top') ? +args[args.indexOf('--top') + 1] : 30;
const files = fs.readdirSync(dir).filter(f => /\.(webp|png)$/i.test(f));
const res = [];
for (const f of files) {
  const p = path.join(dir, f);
  let W, H;
  try { execFileSync(FF, ['-hide_banner', '-i', p], { stdio: 'pipe' }); } catch (e) { const m = String(e.stderr).match(/, (\d{2,5})x(\d{2,5})/); if (m) { W = +m[1]; H = +m[2]; } }
  if (!W) continue;
  const buf = execFileSync(FF, ['-loglevel', 'error', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  const A = (x, y) => buf[(y * W + x) * 4 + 3];
  let hasAlpha = false; for (let i = 3; i < buf.length; i += 4 * 97) if (buf[i] < 250) { hasAlpha = true; break; }
  if (!hasAlpha) continue;
  let n = 0; const cells = new Map(); const CS = 32;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const i = (y * W + x) * 4;
    if (buf[i + 3] < 200) continue;
    const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    if (r < 225 || g < 225 || b < 225) continue;
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) if (A(x + dx, y + dy) < 40) { near = true; break; }
    if (!near) continue;
    n++; const k = `${(x / CS) | 0},${(y / CS) | 0}`; cells.set(k, (cells.get(k) || 0) + 1);
  }
  const hot = [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c]) => { const [cx, cy] = k.split(',').map(Number); return `(${cx * CS},${cy * CS}) ${c}点`; });
  res.push({ f, W, H, n, per: +(n / (W * H) * 1e4).toFixed(2), hot });
}
res.sort((a, b) => b.n - a.n);
for (const r of res.slice(0, TOP)) console.log(`${r.f}\t${r.W}x${r.H}\t白の抜け残り候補 ${r.n}点\t多い所 ${r.hot.join(' / ')}`);
