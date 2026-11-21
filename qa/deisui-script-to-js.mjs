// 泥酔の夜の文案（docs/design-ref/deisui-script.md）を、game.js に入れるデータ（JSON）にする。
// node qa/deisui-script-to-js.mjs → qa/out/deisui_script.json
import fs from 'node:fs';
const md = fs.readFileSync('docs/design-ref/deisui-script.md', 'utf8').replace(/\r/g, '');
const IDS = { 'リコ先輩': 'rico_tutorial', 'ポルカ': 'polka', 'セリナ': 'selina', 'グラーノ': 'grano', 'ヴェルベット': 'velvet' };
const WHO = { 'リコ': 'rico', 'ミミ': 'mimi', 'ポルカ': 'polka', 'セリナ': 'selina', 'グラーノ': 'grano', 'ヴェルベット': 'velvet' };
const out = {};
const secs = md.split(/^## \d+\. /m).slice(1);
for (const sec of secs) {
  const name = sec.split(/[（\n]/)[0].trim();
  const id = IDS[name];
  if (!id) continue;
  const part = (label) => { const i = sec.indexOf('**' + label); if (i < 0) return ''; const rest = sec.slice(i + 2); const j = rest.search(/\n\*\*/); return j < 0 ? rest : rest.slice(0, j); };
  const rows = (txt) => txt.split('\n').filter(l => /^\| (?!誰|---)/.test(l)).map(l => { const c = l.split('|').map(s => s.trim()); const w = c[1].replace(/（.*）/, ''); return { who: WHO[w] || w, t: c[2] }; });
  const title = part('扉の題字').split('\n').filter(l => l.startsWith('> ')).map(l => l.slice(2)).join('\n');
  const close = part('締めの一言').split('\n').filter(l => l.startsWith('- ')).map(l => l.replace(/^- [^：]+：/, ''));
  const hint = (part('とんでもない賭け').match(/「(（[^」]+）)」/) || [])[1] || '';
  out[id] = { title, mid1: rows(part('途中の場面1')), mid2: rows(part('途中の場面2')), ims: rows(part('幕間')), close, hint };
}
fs.mkdirSync('qa/out', { recursive: true });
fs.writeFileSync('qa/out/deisui_script.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, 'title', v.title.split('\n').length, 'mid1', v.mid1.length, 'mid2', v.mid2.length, 'ims', v.ims.length, 'close', v.close.length, 'hint', v.hint);
