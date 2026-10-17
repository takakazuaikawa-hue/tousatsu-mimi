// 配信フォルダ（既定 _site）の全ファイルを数え、offline-files.json を書く（デプロイの時に実行）。
// 使い方: node tools/make-offline-files.mjs [配信フォルダ]
// 出力: { generated, totalBytes, files:[{url, hash(sha1先頭12), size}] }（offline-files.json 自身と sw.js は含めない）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || '_site');
const skip = new Set(['offline-files.json', 'sw.js']);
const out = [];
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(full); continue; }
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (skip.has(rel)) continue;
    const buf = fs.readFileSync(full);
    out.push({
      url: rel.split('/').map(encodeURIComponent).join('/'),
      hash: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12),
      size: buf.length,
    });
  }
})(root);
out.sort((a, b) => (a.url < b.url ? -1 : 1));
const totalBytes = out.reduce((a, f) => a + f.size, 0);
fs.writeFileSync(path.join(root, 'offline-files.json'), JSON.stringify({ generated: new Date().toISOString(), totalBytes, files: out }));
console.log(`offline-files.json: ${out.length} files, ${(totalBytes / 1048576).toFixed(1)} MB`);
