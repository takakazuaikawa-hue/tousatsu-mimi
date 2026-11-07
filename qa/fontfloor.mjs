// 文字の下限の見張り（2026-10-21）：CSS と読み合いの JS の中の「14px 未満の font-size」を見つける。--fix で 14px に直す。
// node qa/fontfloor.mjs [--fix]
import fs from 'node:fs';
const fix = process.argv.includes('--fix');
const files = ['style.css', 'ui-modal.css', 'allstar.css', 'offline.css', 'read-compact.css', 'battles/core.css', 'battles/read-pc.css',
  ...fs.readdirSync('battles/games').filter(f => f.endsWith('.js')).map(f => 'battles/games/' + f)];
let total = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'); let n = 0;
  s = s.replace(/font-size:(\s*)([0-9.]+)px/g, (m, sp, x) => { if (+x > 0 && +x < 14) { n++; return fix ? 'font-size:' + sp + '14px' : m; } return m; });
  s = s.replace(/(font:\s*[0-9]+\s+)([0-9.]+)px/g, (m, a, x) => { if (+x < 14) { n++; return fix ? a + '14px' : m; } return m; });
  s = s.replace(/font-size:\s*([^;}]*?)calc\(\s*([0-9.]+)px\s*\/\s*var\(--game-scale/g, (m, pre, x) => { if (+x < 14) { n++; return fix ? 'font-size: ' + pre + 'calc(14px / var(--game-scale' : m; } return m; });
  // max(12px, …) / min(…) / clamp(12px, …) の最小側が 14px 未満のもの
  s = s.replace(/font-size:([^;}]*?)(max|clamp)\(\s*([0-9.]+)px/g, (m, pre, fn, x) => { if (+x < 14) { n++; return fix ? 'font-size:' + pre + fn + '(14px' : m; } return m; });
  if (n) { console.log(n, f); total += n; if (fix) fs.writeFileSync(f, s); }
}
console.log(fix ? '直した' : '見つけた', total);
process.exit(!fix && total ? 1 : 0);
