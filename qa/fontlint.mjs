// 文字の大きさを px で直接書いた所が増えていないかを見張る（2026-10-27 決まり：大きさは type-roles.css の役目だけで書く）。
// 今ある px の指定は多いので、2026-10-27 の数を基準（qa/fontlint-baseline.json）にして、1つでも増えたら止める。減るのはよい。
// node qa/fontlint.mjs          … 調べる（増えていたら終わりの番号 1）
// node qa/fontlint.mjs --save   … 今の数を基準にする（減らした後に使う。増やした時には使わない）
import fs from 'node:fs';
import path from 'node:path';
const FILES = ['style.css', 'read-compact.css', 'battles/core.css', 'battles/read-pc.css', 'allstar.css', 'ui-modal.css', 'battles/core.js',
  ...fs.readdirSync('battles/games').filter(f => f.endsWith('.js')).map(f => 'battles/games/' + f)];
const RE = /font-size\s*:\s*(?:calc\()?\s*\d+(?:\.\d+)?px/g;
const now = {};
for (const f of FILES) { if (!fs.existsSync(f)) continue; now[f] = (fs.readFileSync(f, 'utf8').match(RE) || []).length; }
const BASE = path.resolve('qa/fontlint-baseline.json');
if (process.argv.includes('--save') || !fs.existsSync(BASE)) { fs.writeFileSync(BASE, JSON.stringify(now, null, 1)); console.log('基準を保存', Object.values(now).reduce((a, b) => a + b, 0), '件'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
let bad = 0;
for (const [f, n] of Object.entries(now)) {
  const b = base[f] ?? 0;
  if (n > b) { bad++; console.log(`増えた: ${f} ${b} → ${n}（px で文字の大きさを書かず、type-roles.css の役目に足す）`); }
}
console.log(bad ? `px の文字の大きさが増えたファイル ${bad} 個` : 'px の文字の大きさは増えていない');
process.exit(bad ? 1 : 0);
