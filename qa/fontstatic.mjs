// コード全体の文字の大きさの指定を1つ残らず拾って分ける（2026-10-30 ユーザー「コードを全体でチェック」）。
// 対象：最上位と battles の CSS 全部、JS の中に書いた CSS（`...{ font-size: }` の文字列）、要素に直接書いた style（style="font-size" / .style.fontSize / font: の一括指定）。
// 分け方：役目の段（var(--r-* / --ty-* / --fx-*)）／px の数字（14 未満は印）／em・rem・%（親しだい）／その他。
// node qa/fontstatic.mjs  → qa/out/fontstatic.json と画面への要約
import fs from 'node:fs';
import path from 'node:path';
const files = [...fs.readdirSync('.').filter(f => /\.(css|js)$/.test(f) && f !== 'sw.js'), ...fs.readdirSync('battles').filter(f => /\.(css|js)$/.test(f)).map(f => 'battles/' + f), ...fs.readdirSync('battles/games').filter(f => /\.(css|js)$/.test(f)).map(f => 'battles/games/' + f)];
const out = [];
const sum = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((ln, i) => {
    // font-size: … と font: … の一括指定（大きさの入るもの）と、JS の style.fontSize / fontSize: '..'
    const re = /(font-size\s*:\s*([^;}"'`]+))|(\bfont\s*:\s*((?:italic|normal|bold|[1-9]00|\s)*\s*[\d.]+(?:px|em|rem|%)[^;}"'`]*))|(\.style\.fontSize\s*=\s*([^;]+))|(fontSize\s*:\s*['"]([^'"]+)['"])/g;
    let m;
    while ((m = re.exec(ln))) {
      const val = (m[2] || m[4] || m[6] || m[8] || '').trim();
      let kind;
      if (/var\(--(r|ty|fx)-/.test(val)) kind = 'role';
      else if (/^(inherit|initial|unset|0|smaller|larger)$/.test(val)) kind = 'other';
      else if (/(?:^|[\s(])[\d.]+px/.test(val) && !/em\b|rem\b|%|vw|vh|vmin|clamp|var\(/.test(val)) kind = 'px';
      else if (/em\b|rem\b|%/.test(val) && !/px/.test(val)) kind = 'rel';
      else kind = 'mixed';   // calc・clamp・vw・他の変数
      const px = kind === 'px' ? Math.min(...(val.match(/[\d.]+(?=px)/g) || ['99']).map(Number)) : null;
      const where = /\.css$/.test(f) ? 'css' : (ln.includes('style=') || /\.style\./.test(ln) || /fontSize/.test(m[0]) ? 'inline' : 'css-in-js');
      // 選択子：同じ行か、上の行で最後に開いた { の前
      let sel = '';
      for (let j = i; j >= Math.max(0, i - 40); j--) { const k = lines[j].lastIndexOf('{'); if (k >= 0 && (j < i || k < m.index)) { sel = lines[j].slice(0, k).trim().slice(-120); break; } }
      out.push({ f, line: i + 1, kind, where, val: val.slice(0, 80), px, sel });
      const key = f + ' ' + kind; sum[key] = (sum[key] || 0) + 1;
    }
  });
}
fs.mkdirSync('qa/out', { recursive: true });
fs.writeFileSync('qa/out/fontstatic.json', JSON.stringify(out, null, 1));
const by = (k) => out.filter(o => o.kind === k).length;
console.log('文字の大きさの指定', out.length, '件：役目の段', by('role'), '・px', by('px'), '・em/rem/%', by('rel'), '・その他', by('mixed') + by('other'));
const under = out.filter(o => o.kind === 'px' && o.px < 14);
console.log('px で 14 未満の指定', under.length, '件（ファイル別）', JSON.stringify(under.reduce((a, o) => (a[o.f] = (a[o.f] || 0) + 1, a), {})));
console.log('要素に直接書いた指定', out.filter(o => o.where === 'inline').length, '件');
