// 素材の一覧（assets/manifest.js）を作り直す。素材を足したり消したりしたら実行する。
// 読み込み係（loader.js）は、この一覧から「場面ごとに要る素材」を名前のパターンで選ぶ。
// node qa/genmanifest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['assets/characters', 'assets/battle/chibi', 'assets/battle/face', 'assets/battle/motion', 'assets/motion', 'assets/ui', 'assets/backgrounds', 'assets/episodes'];
const files = [];
for (const d of DIRS) {
  for (const f of fs.readdirSync(path.join(REPO, d)).sort()) {
    if (/\.(webp|png|jpe?g|mp4)$/i.test(f)) files.push(`${d}/${f}`);
  }
}
const sizes = Object.fromEntries(files.map(f => [f, fs.statSync(path.join(REPO, f)).size]));
const out = `// 自動生成（qa/genmanifest.mjs）。手で書き換えない。\nwindow.ASSET_MANIFEST = ${JSON.stringify(sizes)};\n`;
fs.writeFileSync(path.join(REPO, 'assets/manifest.js'), out);
console.log(`${files.length} files, ${(Object.values(sizes).reduce((a, b) => a + b, 0) / 1048576).toFixed(1)} MB`);
