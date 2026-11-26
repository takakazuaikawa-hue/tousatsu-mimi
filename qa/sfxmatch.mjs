// 候補の効果音の大きさ（鳴っている所の平均）を、基準の音にそろえて m4a にする。
// node qa/sfxmatch.mjs <基準.wav か 目標の平均dB（例 -29）> <出力フォルダ> <候補1> [候補2 ...]   （wav か m4a。ffmpeg は WinGet の Gyan.FFmpeg）
// 平均は |値| > 1e-4 の所だけで測る（qa/sfxloud.mjs と同じ決まり）。山が -1dB を超える時は山に合わせて下げる
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [REF, OUT, ...CANDS] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const wg = path.join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Packages');
const FF = path.join(wg, fs.readdirSync(wg).find(d => d.startsWith('Gyan.FFmpeg')), fs.readdirSync(path.join(wg, fs.readdirSync(wg).find(d => d.startsWith('Gyan.FFmpeg')))).find(d => d.startsWith('ffmpeg-')), 'bin', 'ffmpeg.exe');
function pcm(file) {   // モノラル 44.1kHz の float に読む
  const raw = execFileSync(FF, ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}
function level(d) { let pk = 0, ss = 0, n = 0; for (const v of d) { const a = Math.abs(v); if (a > pk) pk = a; if (a > 1e-4) { ss += v * v; n++; } } return { rms: 10 * Math.log10(ss / Math.max(1, n) || 1e-12), peak: 20 * Math.log10(pk || 1e-9), len: d.length / 44100 }; }
const ref = isFinite(+REF) ? { rms: +REF, peak: NaN, len: 0 } : level(pcm(REF));
console.log('基準', path.basename(REF), `平均 ${ref.rms.toFixed(1)}dB 山 ${ref.peak.toFixed(1)}dB`);
const list = [];
for (const c of CANDS) {
  const L = level(pcm(c));
  let gain = ref.rms - L.rms;
  if (L.peak + gain > -1) gain = -1 - L.peak;   // 割れないように
  const o = path.join(OUT, path.basename(c).replace(/\.(wav|m4a)$/, '.m4a'));
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', c, '-af', `volume=${gain.toFixed(2)}dB`, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '128k', o]);
  const A = level(pcm(o));
  console.log(path.basename(o).padEnd(18), `元 平均 ${L.rms.toFixed(1)} 山 ${L.peak.toFixed(1)} → 平均 ${A.rms.toFixed(1)} 山 ${A.peak.toFixed(1)} 長さ ${A.len.toFixed(2)}s`);
  list.push({ file: path.basename(o), rms: +A.rms.toFixed(1), peak: +A.peak.toFixed(1), len: +A.len.toFixed(2) });
}
fs.writeFileSync(path.join(OUT, 'list.json'), JSON.stringify({ ref: { file: path.basename(REF), ...ref }, list }, null, 1));
