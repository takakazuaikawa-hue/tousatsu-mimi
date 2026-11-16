// 絵を data URI で埋め込んで qa/h1nozoki/h1nozoki.html を作る（1つの HTML）
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '..', '..');
// 顔の中心（透明でない所の重心 x／1000）。窓に出す位置の計算に使う
const CX = { polka_drunk: 641, polka_drunk2: 633, polka_smug: 662, polka_panic: 683, rico_drunk: 587, rico_drunk2: 598, rico_smug: 602, rico_panic: 587,
  grano_drunk: 638, grano_drunk2: 577, grano_smug: 682, grano_panic: 641, selina_drunk: 684, selina_drunk2: 621, selina_smug: 715, selina_panic: 674,
  velvet_drunk: 603, velvet_drunk2: 582, velvet_smug: 604, velvet_panic: 631, velvet_hide: 532 };
const A = {
  t_polka: 'assets/backgrounds/table_polka.webp', t_rico: 'assets/backgrounds/table_rico_serious.webp', t_grano: 'assets/backgrounds/table_grano.webp',
  t_selina: 'assets/backgrounds/table_selina.webp', t_velvet: 'assets/backgrounds/table_velvet.webp',
  rico_think: 'assets/battle/chibi/rico_think.webp', rico_smug_c: 'assets/battle/chibi/rico_smug.webp',
};
for (const k of Object.keys(CX)) { const [p, n] = k.split('_'); A['f_' + k] = `assets/characters/${p}_cutin_${n === 'hide' ? 'smirk_hide' : n}.webp`; }
let vars = Object.entries(A).map(([k, f]) => { if (!fs.existsSync(path.join(root, f))) throw new Error('no ' + f); return `--a-${k}:url(data:image/webp;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`; });
vars = vars.concat(Object.entries(CX).map(([k, c]) => `--x-${k}:${Math.round(-(c * 0.64 - 150))}px`));
let html = fs.readFileSync(path.join(here, 'app.html'), 'utf8');
const rep = (k, v) => { html = html.replace(`/*@${k}*/`, () => v); };
rep('VARS', ':root{' + vars.join(';\n') + '}');
for (const [k, f] of [['CSS', 'app.css'], ['ENGINE', 'engine.js'], ['SCENES', 'scenes.js'], ['JS', 'app.js']]) rep(k, fs.readFileSync(path.join(here, f), 'utf8'));
fs.writeFileSync(path.join(here, 'h1nozoki.html'), html);
console.log('h1nozoki.html', (html.length / 1024 / 1024).toFixed(2) + ' MB');
