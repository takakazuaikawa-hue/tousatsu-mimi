// 絵を data URI で埋め込んで qa/r2proto/r2proto.html を作る。数字（期待値）は Node の r2lib で数えて埋め込む。
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '..', '..');
const A = {
  table: 'assets/backgrounds/table_grano.webp',
  cut_smug: 'assets/characters/grano_cutin_smug.webp', cut_haggle: 'assets/characters/grano_cutin_haggle.webp', cut_panic: 'assets/characters/grano_cutin_panic.webp',
  g_default: 'assets/characters/grano_default.webp', g_recommend: 'assets/characters/grano_recommend.webp', g_concerned: 'assets/characters/grano_concerned.webp', g_offer: 'assets/characters/grano_offer.webp',
  chip_white: 'assets/ui/chip_white.webp', chip_blue: 'assets/ui/chip_blue.webp', chip_red: 'assets/ui/chip_red.webp', chip_gold: 'assets/ui/chip_gold.webp',
  rico_think: 'assets/battle/chibi/rico_think.webp', rico_smug: 'assets/battle/chibi/rico_smug.webp',
};
const vars = Object.entries(A).map(([k, f]) => `--a-${k}:url(data:image/webp;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`).join(';\n');
// 期待値（Node で数えた表）
const L = require('./r2lib.js');
const scenes = require('./r2scenes_data.cjs');
const EX = {};
for (const s of scenes) {
  const a = L.analyze(s), R = L.range(s), her = L.P(s.her);
  const hk = [L.key(her[0]), L.key(her[1])].sort().join();
  const x = R.find(y => [L.key(y.h[0]), L.key(y.h[1])].sort().join() === hk);
  const ev = {}, real = {};
  for (const o of ['check', 'small', 'mid', 'big']) { ev[o] = a.ev[o].ev; real[o] = [L.delta(o, x.t, x.res, s.pot, true), L.delta(o, x.t, x.res, s.pot, false)]; }
  EX[s.id] = { N: a.N, counts: a.counts, ev, real, tier: x.t, res: x.res };
}
const lib = fs.readFileSync(path.join(here, 'r2lib.js'), 'utf8');
let html = fs.readFileSync(path.join(here, 'r2.html'), 'utf8');
const rep = (k, v) => { html = html.replace(`/*@${k}*/`, () => v); };
rep('VARS', ':root{' + vars + '}'); rep('CSS', fs.readFileSync(path.join(here, 'r2.css'), 'utf8'));
rep('EXPECT', 'window.R2EXPECT=' + JSON.stringify(EX) + ';');
rep('LIB', 'window.R2LIB=(function(){const module={exports:{}};' + lib + '\nreturn module.exports})();');
rep('JS', fs.readFileSync(path.join(here, 'r2.js'), 'utf8'));
fs.writeFileSync(path.join(here, 'r2proto.html'), html);
console.log('r2proto.html', (html.length / 1024 / 1024).toFixed(2) + ' MB');
