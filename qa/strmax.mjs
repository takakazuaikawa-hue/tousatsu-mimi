// 文の一番長い物を数える（大前提5「文の長さの最大」）。遊びのファイルの中の日本語の文字列を全部拾い、ファイルごとに長い順に出す。
// node qa/strmax.mjs [ファイル...]   既定は battles/games の本当の手の遊び
import fs from 'node:fs';
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['stare', 'objection', 'graduation', 'gacha', 'doubt', 'ask', 'handvs', 'narrow', 'outs', 'sniper', 'verdict'].map(n => `battles/games/${n}.js`);
const JP = /[぀-ヿ一-鿿]/;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8').replace(/\/\/[^\n]*/g, '');
  const strs = new Set();
  for (const m of s.matchAll(/'([^'\n]{2,})'|`([^`]{2,})`/g)) { const t = (m[1] || m[2] || '').replace(/<[^>]+>/g, '').replace(/\$\{[^}]*\}/g, '〇〇').trim(); if (JP.test(t) && !/[{};]/.test(t)) strs.add(t); }
  const top = [...strs].sort((a, b) => b.length - a.length).slice(0, 5);
  console.log(`== ${f}（日本語の文 ${strs.size} 個）`); top.forEach(t => console.log(`  ${String(t.length).padStart(3)}字  ${t.slice(0, 60)}`));
}
