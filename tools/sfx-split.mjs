// Stable Audio で作った「似た音を間を空けて並べた」wav を、無音の所で1音ずつに切り分けて m4a にする。
// node tools/sfx-split.mjs <raw のフォルダ> <出力フォルダ>   （ffmpeg は WinGet の Gyan.FFmpeg）
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process';
const [IN, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const wg = path.join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Packages');
const pkg = fs.readdirSync(wg).find(d => d.startsWith('Gyan.FFmpeg'));
const sub = fs.readdirSync(path.join(wg, pkg)).find(d => d.startsWith('ffmpeg-'));
const FF = path.join(wg, pkg, sub, 'bin', 'ffmpeg.exe');
const out = {};
for (const f of fs.readdirSync(IN).filter(f => f.endsWith('.wav'))) {
  const k = f.replace('.wav', ''), src = path.join(IN, f);
  const r = spawnSync(FF, ['-hide_banner', '-i', src, '-af', 'silencedetect=noise=-42dB:d=0.18', '-f', 'null', '-'], { encoding: 'utf8' });
  const log = r.stderr; const dur = +(/Duration: (\d+):(\d+):([\d.]+)/.exec(log) || []).slice(1).reduce((a, v, i) => a + (+v) * [3600, 60, 1][i], 0);
  const sil = []; let s0 = null;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) { if (m[1] === 'start') s0 = +m[2]; else { sil.push([s0 ?? 0, +m[2]]); s0 = null; } }
  if (s0 != null) sil.push([s0, dur]);
  // 鳴っている区間＝無音の間
  const segs = []; let t = 0;
  for (const [a, b] of sil) { if (a - t > 0.06) segs.push([t, a]); t = b; }
  if (dur - t > 0.06) segs.push([t, dur]);
  out[k] = [];
  segs.forEach(([a, b], i) => {
    const st = Math.max(0, a - 0.02), len = Math.min(b - st + 0.12, 6);
    const o = path.join(OUT, `${k}_${i + 1}.m4a`);
    execFileSync(FF, ['-y', '-loglevel', 'error', '-ss', st.toFixed(3), '-t', len.toFixed(3), '-i', src, '-af', `afade=t=in:d=0.005,afade=t=out:st=${Math.max(0, len - 0.08).toFixed(3)}:d=0.08,loudnorm=I=-18:TP=-1.5:LRA=11`, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', o]);
    out[k].push({ file: path.basename(o), len: +len.toFixed(2) });
  });
  console.log(k, segs.length, segs.map(([a, b]) => (b - a).toFixed(2)).join(' '));
}
fs.writeFileSync(path.join(OUT, 'list.json'), JSON.stringify(out, null, 1));
