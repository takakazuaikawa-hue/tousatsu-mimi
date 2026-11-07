// 体験版を書き出す（製品版と同じソースから。直しは本体に入れれば両方に入る）。
// 使い方: node tools/build-trial.mjs [出力フォルダ（既定 dist/trial）] [--store <作品紹介ページへの移動先>] [--share <共有先の公開URL>] [--local-fonts]
//   --store：終わりの窓の「製品版のページへ」の移動先（HP の中なら相対でよい）
//   --share：X とタイトルの共有に載せる、一般公開の作品紹介ページの URL（https のみ）。省くと「共有先を用意中」と出す。
//            ローカル・非公開のプレビュー・旧個人の URL は受け付けない（間違って混ざらないように）
//   --local-fonts：Google Fonts の字体を fonts/ に落として同梱し、外部へ取りに行かない（よそのHPに置く時。字体は SIL OFL）
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
let out = 'dist/trial', store = '', share = '', localFonts = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--store') store = args[++i] || '';
  else if (args[i] === '--share') share = args[++i] || '';
  else if (args[i] === '--local-fonts') localFonts = true;
  else out = args[i];
}
out = path.resolve(repo, out);
if (share && (!/^https:\/\//.test(share) || /localhost|127\.0\.0\.1|\.local\b|preview|chatgpt\.site|takakazuaikawa|github\.io/i.test(share)))
  throw new Error('--share は一般公開の作品紹介ページの https の URL にしてください（ローカル・非公開のプレビュー・旧個人の URL は不可）: ' + share);
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
const flag = `<script>window.MIMI_TRIAL = true; window.MIMI_STORE_URL = ${JSON.stringify(store)}; window.MIMI_SHARE_URL = ${JSON.stringify(share)};</script>\n`;
// 製品版の共有先（index.html の window.MIMI_SHARE_URL の行）は体験版に持ち込まない
const shareLine = /<script>window\.MIMI_SHARE_URL = [^<]*<\/script>(<!--[^>]*-->)?\r?\n?/;
if (!shareLine.test(idx)) throw new Error('index.html に製品版の共有先の行が見つからない');
idx = idx.replace(shareLine, '');
if (!idx.includes('</head>')) throw new Error('index.html に </head> がない');
idx = idx.replace('</head>', flag + '</head>');
idx = idx.replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${t}（体験版）</title>`);
// 字体を同梱する：Google Fonts の CSS と woff2 を fonts/ に落とし、index.html の読み込みを fonts/fonts.css に替える
if (localFonts) {
  const GF = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/;
  const GS = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
  const m = idx.match(GF);
  if (!m) throw new Error('index.html に Google Fonts の読み込みが見つからない');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
  let css = await (await fetch(m[1].replace(/&amp;/g, '&'), { headers: { 'User-Agent': UA } })).text();
  const urls = [...new Set([...css.matchAll(GS)].map(x => x[1]))];
  const fdir = path.join(out, 'fonts'); fs.mkdirSync(fdir, { recursive: true });
  const name = (u) => u.replace('https://fonts.gstatic.com/', '').replace(/\//g, '_');
  for (let i = 0; i < urls.length; i += 16) {
    await Promise.all(urls.slice(i, i + 16).map(async (u) => {
      const r = await fetch(u); if (!r.ok) throw new Error('字体の取得に失敗: ' + u);
      fs.writeFileSync(path.join(fdir, name(u)), Buffer.from(await r.arrayBuffer()));
    }));
  }
  css = css.replace(GS, (x, u) => 'url(' + name(u) + ')');
  fs.writeFileSync(path.join(fdir, 'fonts.css'), css);
  // ライセンスは字体ごとの元の本文（著作権表示を含む。google/fonts の OFL.txt を tools/font-licenses/ に保存したもの）をそのまま同梱する
  const LIC = { 'Noto Sans JP': 'notosansjp', 'Shippori Mincho B1': 'shipporiminchob1', 'Barlow Condensed': 'barlowcondensed', 'Bebas Neue': 'bebasneue' };
  for (const [fam, key] of Object.entries(LIC)) {
    if (!css.includes(`font-family: '${fam}'`)) throw new Error('字体の CSS に ' + fam + ' が無い（ライセンスの表と食い違い）');
    fs.copyFileSync(path.join(repo, 'tools/font-licenses', key + '.OFL.txt'), path.join(fdir, `OFL-${fam.replace(/ /g, '')}.txt`));
  }
  fs.writeFileSync(path.join(fdir, 'LICENSE.txt'), 'この中の字体は Google Fonts から取得したもので、どれも SIL Open Font License 1.1 で配布されています。\n' +
    '字体ごとの著作権表示とライセンス本文は、同じフォルダーの OFL-*.txt にあります。\n\n' + Object.keys(LIC).map(fam => `- ${fam}：OFL-${fam.replace(/ /g, '')}.txt`).join('\n') + '\n');
  idx = idx.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n?/, '')
    .replace(/href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"/g, 'href="fonts/fonts.css"');
  if (/fonts\.googleapis\.com/.test(idx)) throw new Error('外部の字体の読み込みが残っている');
  console.log(`字体を同梱: ${urls.length} files`);
}
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
console.log(`体験版: ${want.size} files → ${path.relative(repo, out)}（素材 ${skipped} 件を除外）${store ? '　作品紹介へ ' + store : '　作品紹介へ 未設定（製品版は準備中と表示）'}${share ? '　共有先 ' + share : '　共有先 未設定（用意中と表示）'}`);
