// 段のそろいを全画面で見る（2026-10-29 ユーザー「すべての画面を対象にしないといけないことに気づけませんか？」）。
// qa/fulltour.mjs の report.json（texts＝見えている文字の実寸）を読み、役目の段（type-roles.css）に無い大きさを画面ごとに挙げる。
// 段：PC 15/17/20/22、スマホ 14/15/17/18、小さいスマホ（幅720未満）14/16。主役の数字・題字（24px 以上）と、数字だけの文字は段の外でよい。
// 使い方: node qa/tiercheck.mjs <report.json> [pc|phone|small]
import fs from 'node:fs';
const [file, kind = 'pc'] = process.argv.slice(2);
const TIERS = { pc: [15, 17, 20, 22], phone: [14, 15, 17, 18], small: [14, 16] }[kind];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const report = Array.isArray(data) ? data : data.report;
const numeric = (t) => /^[\d,.\s%×xX+\-－／/:：〜~()（）枚人位BbHhAND♠♥♦♣JQKA]*$/.test(t);
const card = (c) => /^\.(r|s|c) < \.as-card|card|\.rank|\.suit/.test(c);
let total = 0;
const byCls = {};
for (const r of report) {
  const off = (r.texts || []).filter(x => x.px < 23.5 && !numeric(x.t) && !card(x.cls) && !TIERS.some(v => Math.abs(v - x.px) <= 0.35));
  const over = (r.texts || []).filter(x => x.over);
  if (!off.length && !over.length) continue;
  total += off.length;
  console.log(`## ${r.name}（段の外 ${off.length}・はみ出し ${over.length}）`);
  const g = {};
  for (const x of off) { (g[x.cls] = g[x.cls] || { px: new Set(), t: x.t }).px.add(x.px); (byCls[x.cls] = byCls[x.cls] || new Set()).add(r.name); }
  for (const [c, v] of Object.entries(g)) console.log(`  ${[...v.px].join('/').padEnd(10)} ${c.padEnd(44)} ${v.t}`);
  for (const x of over) console.log(`  はみ出し ${x.px} ${x.cls} ${x.t}`);
}
console.log(`\n合計 段の外 ${total}・部品 ${Object.keys(byCls).length}`);
