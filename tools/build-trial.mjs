// 体験版を書き出す（製品版と同じソースから。直しは本体に入れれば両方に入る）。
// 使い方: node tools/build-trial.mjs [出力フォルダ（既定 dist/trial）] [--store <製品版のページのURL>]
// 体験版の中身：
//  ・index.html に window.MIMI_TRIAL（と販売ページ MIMI_STORE_URL）を書き込む → game.js の IS_TRIAL が立つ
//    （ポルカに勝ったら「続きは製品版で」、交換所・ぱにゅぱにゅ・零時の卓などは押すと製品版の案内、セーブは別の鍵）
//  ・配るファイルは git に入っているものだけ（手元の書きかけ・未登録の曲は混ぜない）
//  ・声・セリナ戦より後の一枚絵／扉絵／動画／カットイン・エンディングの映像は配らない（体験版から中身を抜けないように）
//  ・まとめてダウンロードの保存先は製品版と別の名前（同じ場所に置いても混ざらない）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
let out = 'dist/trial', store = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--store') store = args[++i] || '';
  else out = args[i];
}
out = path.resolve(repo, out);
if (!out.startsWith(repo) || out === repo) throw new Error('出力フォルダはリポジトリの中のサブフォルダにしてください: ' + out);

// 本編の配信（.github/workflows/deploy.yml）と同じ顔ぶれ
const ROOT_FILES = ['index.html', 'voice.js', 'game.js', 'home.js', 'home-live.js', 'live-cg.js', 'loader.js', 'style.css', 'read-compact.css',
  'allstar.js', 'allstar-ui.js', 'allstar.css', 'sw.js', 'offline.js', 'offline.css', 'type-roles.css', 'manifest.webmanifest', 'ui-modal.css',
  'battles/core.js', 'battles/core.css', 'battles/read-pc.css', 'docs/design-ref/panyu-mesh.html'];

// 体験版に入れない素材（assets/ からの相対。末尾 / はフォルダごと、* は前方一致）
const EXCLUDE = [
  'voice/',
  'backgrounds/reward_cg_selina', 'backgrounds/reward_cg_grano', 'backgrounds/reward_cg_velvet', 'backgrounds/secret_cg_',
  'backgrounds/ending_room', 'backgrounds/staffroll',
  'episodes/selina', 'episodes/grano', 'episodes/velvet', 'episodes/ending', 'episodes/struggle_selina', 'episodes/struggle_grano', 'episodes/struggle_velvet',
  'motion/cg_selina', 'motion/cg_grano', 'motion/cg_velvet', 'motion/ending_room', 'motion/ep_ending', 'motion/ep_grano', 'motion/ep_selina',
  'motion/idle_selina', 'motion/idle_grano', 'motion/idle_velvet',
  'characters/selina_cutin_', 'characters/grano_cutin_', 'characters/velvet_cutin_',

];
const excluded = (rel) => EXCLUDE.some(p => rel.startsWith(p));

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo }).toString().split('\0').filter(Boolean);
const want = new Set(ROOT_FILES.filter(f => fs.existsSync(path.join(repo, f))));
tracked.forEach(f => { if (/^battles\/games\/[^/]+\.js$/.test(f)) want.add(f); });
let skipped = 0;
tracked.forEach(f => {
  if (!f.startsWith('assets/')) return;
  const rel = f.slice('assets/'.length);
  if (/(^|\/)(_source_png|_original)\//.test(rel) || rel.endsWith('.md')) return;
  if (excluded(rel)) { skipped++; return; }
  want.add(f);
});

fs.rmSync(out, { recursive: true, force: true });
for (const f of want) {
  const dst = path.join(out, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(repo, f), dst);
}

// index.html：体験版の旗（game.js より前に読ませる）と題名
const idxPath = path.join(out, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
const flag = `<script>window.MIMI_TRIAL = true; window.MIMI_STORE_URL = ${JSON.stringify(store)};</script>\n`;
if (!idx.includes('</head>')) throw new Error('index.html に </head> がない');
idx = idx.replace('</head>', flag + '</head>');
idx = idx.replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${t}（体験版）</title>`);
fs.writeFileSync(idxPath, idx);

// 保存先の名前を製品版と分ける
const swPath = path.join(out, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes("const CACHE = 'mimi-pack-v1';")) throw new Error('sw.js の CACHE 名が見つからない');
fs.writeFileSync(swPath, sw.replace("const CACHE = 'mimi-pack-v1';", "const CACHE = 'mimi-trial-pack-v1';"));

const manPath = path.join(out, 'manifest.webmanifest');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
man.name += '（体験版）'; man.short_name += ' 体験版';
fs.writeFileSync(manPath, JSON.stringify(man, null, 2));

// 素材の台帳（assets/manifest.js）から配らない素材を消す。先読み係（loader.js）は台帳にあるものしか読まないので、抜いた絵を取りに行かない
const manJs = path.join(out, 'assets/manifest.js');
const mtxt = fs.readFileSync(manJs, 'utf8');
const mm = mtxt.match(/window\.ASSET_MANIFEST = (\{[\s\S]*?\});/);
if (!mm) throw new Error('assets/manifest.js の形が変わった');
const am = JSON.parse(mm[1]);
for (const k of Object.keys(am)) if (!fs.existsSync(path.join(out, k))) delete am[k];
fs.writeFileSync(manJs, mtxt.replace(mm[0], 'window.ASSET_MANIFEST = ' + JSON.stringify(am) + ';'));

execFileSync(process.execPath, [path.join(repo, 'tools/make-offline-files.mjs'), out], { stdio: 'inherit' });

// index.html が読むファイルが全部あるか（本編の配信と同じ確かめ）
const missing = [...idx.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
  .filter(u => !/^(https?:|\/\/|data:|mailto:|#|\$)/.test(u)).map(u => u.replace(/[?#].*/, ''))
  .filter(u => u && !fs.existsSync(path.join(out, u)));
if (missing.length) { console.error('missing:', [...new Set(missing)].join(' ')); process.exit(1); }
console.log(`体験版: ${want.size} files → ${path.relative(repo, out)}（素材 ${skipped} 件を除外）${store ? '　販売ページ ' + store : '　販売ページ未設定（近日発売と表示）'}`);
