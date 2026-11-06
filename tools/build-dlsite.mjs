// DLsite で売る製品版を書き出す（Windows のアプリ。zip を解いて MimiTexasHoldem.exe をダブルクリックで遊べる形。通信なし）。
// 使い方: node tools/build-dlsite.mjs   （先に tools/electron で npm install しておく）
// 出来るもの: dist/dlsite/Mimi_Texas_Holdem/（exe・readme.txt・LICENSES.txt・Electron の権利表記）と dist/dlsite/Mimi_Texas_Holdem.zip
//  ・index.html を直接開く（file://）形は、Chrome の決まりで WebGL の絵の加工ができず、ホームの動き・動く一枚絵・ぱにゅぱにゅが止まる
//    （2026-11-06 確かめた）。なので Electron で包み、自前の場所（app://game/）から配る（tools/electron/main.js）
//  ・index.html に window.MIMI_LOCAL を書き込む → 直接開いた時（file://）の作りに切り替える
//    （声と動画は fetch を使わずに読む・まとめてダウンロードの案内を出さない・共有の先は無し）
//  ・字体は Google Fonts から落として fonts/ に同梱し、外へ取りに行かない（字体ごとのライセンス本文も同梱）
//  ・声の一覧は assets/voice/manifest.js（JS）にも書く（直接開いた時は JSON を fetch で読めない）
//  ・配るファイルは git に入っているものだけ。docs/・qa/・tools/・制作用の画像・指示文は入れない
//  ・説明書（readme.txt）とライセンス（LICENSES.txt）を同梱する。ファイル名は英数字だけ（zip を解く端末で文字化けしないように）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DL = path.join(repo, 'dist', 'dlsite');
const out = path.join(DL, 'stage', 'game');          // ゲームの中身（アプリの resources/app/game に入る）
const FINAL = path.join(DL, 'Mimi_Texas_Holdem');     // 買った人が受け取るフォルダ

// 本編の配信（.github/workflows/deploy.yml）と同じ顔ぶれ。ぱにゅぱにゅの網目の頁だけは docs/ から持って行く
const ROOT_FILES = ['index.html', 'voice.js', 'game.js', 'home.js', 'home-live.js', 'live-cg.js', 'loader.js', 'style.css', 'read-compact.css',
  'allstar.js', 'allstar-ui.js', 'allstar.css', 'offline.js', 'offline.css', 'type-roles.css', 'ui-modal.css',
  'battles/core.js', 'battles/core.css', 'battles/read-pc.css', 'docs/design-ref/panyu-mesh.html'];
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo }).toString().split('\0').filter(Boolean);
const want = new Set(ROOT_FILES.filter(f => fs.existsSync(path.join(repo, f))));
tracked.forEach(f => { if (/^battles\/games\/[^/]+\.js$/.test(f)) want.add(f); });
tracked.forEach(f => {
  if (!f.startsWith('assets/')) return;
  const rel = f.slice('assets/'.length);
  if (/(^|\/)(_source_png|_original)\//.test(rel) || rel.endsWith('.md') || rel.endsWith('.txt')) return;
  // 体験版の共有画像は製品版では使わない
  if (rel === 'ui/share_trial.jpg') return;
  want.add(f);
});

fs.rmSync(out, { recursive: true, force: true });
for (const f of want) {
  const dst = path.join(out, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(repo, f), dst);
}

// index.html：直接開く版の旗（game.js より前）、共有先は持ち込まない、Service Worker の登録をしない
const idxPath = path.join(out, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
const shareLine = /<script>window\.MIMI_SHARE_URL = [^<]*<\/script>(<!--[^>]*-->)?\r?\n?/;
if (!shareLine.test(idx)) throw new Error('index.html に共有先の行が見つからない');
idx = idx.replace(shareLine, '');
if (!idx.includes('</head>')) throw new Error('index.html に </head> がない');
idx = idx.replace('</head>', '<script>window.MIMI_LOCAL = true; window.MIMI_SHARE_URL = "";</script>\n<script src="assets/voice/manifest.js"></script>\n</head>');
idx = idx.replace(/<link rel="manifest"[^>]*>\r?\n?/, '');

// 字体を同梱（体験版の --local-fonts と同じ）
{
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
  fs.writeFileSync(path.join(fdir, 'fonts.css'), css.replace(GS, (x, u) => 'url(' + name(u) + ')'));
  const LIC = { 'Noto Sans JP': 'notosansjp', 'Shippori Mincho B1': 'shipporiminchob1', 'Barlow Condensed': 'barlowcondensed', 'Bebas Neue': 'bebasneue' };
  for (const [fam, key] of Object.entries(LIC)) {
    if (!css.includes(`font-family: '${fam}'`)) throw new Error('字体の CSS に ' + fam + ' が無い');
    fs.copyFileSync(path.join(repo, 'tools/font-licenses', key + '.OFL.txt'), path.join(fdir, `OFL-${fam.replace(/ /g, '')}.txt`));
  }
  idx = idx.replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\r?\n?/g, '')
    .replace(/href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"/g, 'href="fonts/fonts.css"');
  console.log(`字体を同梱: ${urls.length} files`);
}
if (/https?:\/\//.test(idx.replace(/<!--[\s\S]*?-->/g, '').replace(/xmlns="[^"]*"/g, ''))) {
  const left = [...idx.matchAll(/https?:\/\/[^"'\s)<]+/g)].map(x => x[0]).filter(u => !/w3\.org/.test(u));
  if (left.length) throw new Error('index.html に外への読み込みが残っている: ' + [...new Set(left)].join(' '));
}
fs.writeFileSync(idxPath, idx);

// 声の一覧を JS でも（直接開いた時に fetch で JSON を読めないため）
const vm = JSON.parse(fs.readFileSync(path.join(out, 'assets/voice/manifest.json'), 'utf8'));
fs.writeFileSync(path.join(out, 'assets/voice/manifest.js'), 'window.VOICE_MANIFEST = ' + JSON.stringify(vm) + ';\n');

// 同梱の説明書とライセンス（docs/dlsite/ の原稿）

// index.html が読むファイルが全部あるか
const missing = [...idx.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
  .filter(u => !/^(https?:|\/\/|data:|mailto:|#|\$)/.test(u)).map(u => u.replace(/[?#].*/, ''))
  .filter(u => u && !fs.existsSync(path.join(out, u)));
if (missing.length) { console.error('missing:', [...new Set(missing)].join(' ')); process.exit(1); }
// ファイル名が英数字・記号だけか（日本語の名前は zip を解く端末で文字化けする）
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(out);
const bad = files.map(f => path.relative(out, f)).filter(f => /[^\x20-\x7e]/.test(f));
if (bad.length) { console.error('英数字でないファイル名:', bad.join(' ')); process.exit(1); }
const bytes = files.reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`ゲームの中身: ${files.length} files・${(bytes / 1048576).toFixed(1)}MB`);

// ── Electron で包む ──
const EL = path.join(repo, 'tools', 'electron');
const STAGE = path.join(DL, 'stage');
fs.copyFileSync(path.join(EL, 'main.js'), path.join(STAGE, 'main.js'));
fs.copyFileSync(path.join(repo, 'assets/ui/icon-512.png'), path.join(STAGE, 'icon.png'));
const pkg = JSON.parse(fs.readFileSync(path.join(EL, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify({ name: pkg.name, productName: pkg.productName, version: pkg.version, description: pkg.description, author: 'あいかわ', main: 'main.js', private: true }, null, 2));
// exe の絵（.ico）を作る
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const ico = path.join(DL, 'icon.ico');
execFileSync(FF, ['-loglevel', 'error', '-y', '-i', path.join(repo, 'assets/ui/icon-512.png'), '-vf', 'scale=256:256', ico]);
const { packager } = await import('file:///' + path.join(EL, 'node_modules/@electron/packager/dist/index.js').replace(/\\/g, '/'));
const PACK = path.join(DL, 'pack');
fs.rmSync(PACK, { recursive: true, force: true });
const [built] = await packager({
  dir: STAGE, out: PACK, platform: 'win32', arch: 'x64', electronVersion: pkg.devDependencies.electron,
  executableName: 'MimiTexasHoldem', name: 'MimiTexasHoldem', icon: ico, asar: false, overwrite: true, prune: false,
  appVersion: pkg.version, appCopyright: '© 2026 あいかわ',
  win32metadata: { FileDescription: 'ミミのテキサスホールデムポーカー', ProductName: 'ミミのテキサスホールデムポーカー', InternalName: 'MimiTexasHoldem', OriginalFilename: 'MimiTexasHoldem.exe' },
});
fs.rmSync(FINAL, { recursive: true, force: true });
fs.renameSync(built, FINAL);
// Chromium の言語のファイルは日本語と英語だけ残す（約47MB 減る）
for (const f of fs.readdirSync(path.join(FINAL, 'locales'))) if (!['ja.pak', 'en-US.pak'].includes(f)) fs.rmSync(path.join(FINAL, 'locales', f));
// 買った人が受け取る zip（中は Mimi_Texas_Holdem/ のフォルダ1つ）
// 同梱の説明書とライセンス（docs/dlsite/ の原稿）。Windows のメモ帳でも文字化けしないよう、UTF-8（BOM 付き）・改行 CRLF
const all = walk(FINAL), totalMB = Math.ceil(all.reduce((a, x) => a + fs.statSync(x).size, 0) / 1048576);
for (const f of ['readme.txt', 'LICENSES.txt']) {
  const src = path.join(repo, 'docs/dlsite', f);
  if (!fs.existsSync(src)) throw new Error('原稿が無い: docs/dlsite/' + f);
  const txt = fs.readFileSync(src, 'utf8').replace(/^\ufeff/, '').replace('【DATA_MB】', String(totalMB));
  if (/【/.test(txt)) throw new Error(f + ' に【】の印が残っている');
  fs.writeFileSync(path.join(FINAL, f), '\ufeff' + txt.replace(/\r?\n/g, '\r\n'));
}
const badNames = walk(FINAL).map(x => path.relative(FINAL, x)).filter(x => /[^\x20-\x7e]/.test(x));
if (badNames.length) throw new Error('英数字でないファイル名: ' + badNames.slice(0, 5).join(' '));
const ZIP = path.join(DL, 'Mimi_Texas_Holdem.zip');
fs.rmSync(ZIP, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${FINAL}' -DestinationPath '${ZIP}' -Force`], { stdio: 'inherit' });
console.log(`DLsite 版: ${walk(FINAL).length} files・約${totalMB}MB → ${path.relative(repo, FINAL)}　zip ${(fs.statSync(ZIP).size / 1048576).toFixed(0)}MB`);
