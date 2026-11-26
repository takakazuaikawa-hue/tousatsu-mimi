// 絵を data URI で埋め込んで qa/mekiki/mekiki.html を作る（1つの HTML）
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '..', '..');
const A = {
  table: 'assets/backgrounds/table_grano.webp',
  f_calm: 'assets/characters/grano_cutin_smug.webp',
  f_peek: 'assets/characters/grano_cutin_busted.webp',
  f_hit: 'assets/characters/grano_cutin_haggle.webp',
  f_miss: 'assets/characters/grano_shop_smile.webp',
  rico_think: 'assets/battle/chibi/rico_think.webp',
  rico_smug: 'assets/battle/chibi/rico_smug.webp',
};
const vars = Object.entries(A).map(([k, f]) => `--a-${k}:url(data:image/webp;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`).join(';\n');
let html = fs.readFileSync(path.join(here, 'app.html'), 'utf8');
const rep = (k, v) => { html = html.replace(`/*@${k}*/`, () => v); };
rep('VARS', ':root{' + vars + '}');
rep('CSS', fs.readFileSync(path.join(here, 'app.css'), 'utf8'));
rep('ENGINE', fs.readFileSync(path.join(here, 'engine.js'), 'utf8'));
rep('SCENES', fs.readFileSync(path.join(here, 'scenes.js'), 'utf8'));
rep('JS', fs.readFileSync(path.join(here, 'app.js'), 'utf8'));
fs.writeFileSync(path.join(here, 'mekiki.html'), html);
console.log('mekiki.html', (html.length / 1024 / 1024).toFixed(2) + ' MB');
