// 使い方: node qa/facepaste/facepaste.mjs <元の絵(透明あり)> <表情を変えた絵> <出力の頭> [box x0,y0,x1,y1] [楕円 cx,cy,rx,ry,ぼかし]
// 2枚の絵はこのフォルダに写してから読む（検査ブラウザで canvas を使う）
import fs from 'node:fs'; import path from 'node:path';
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const [BASE, VAR, OUT, BOX = '250,220,470,450', ELL = '355,335,110,118,22'] = process.argv.slice(2);
fs.copyFileSync(BASE, path.join(DIR, 'in_base' + path.extname(BASE)));
fs.copyFileSync(VAR, path.join(DIR, 'in_var' + path.extname(VAR)));
const server = await serve(DIR, 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/facepaste.html`, 15000);
const r = await page.eval(`window.run(${JSON.stringify('in_base' + path.extname(BASE))}, ${JSON.stringify('in_var' + path.extname(VAR))}, [${BOX}], [${ELL}])`, 300000);
fs.writeFileSync(OUT + '.png', Buffer.from(r.full.split(',')[1], 'base64'));
fs.writeFileSync(OUT + '-cmp.jpg', Buffer.from(r.cmp.split(',')[1], 'base64'));
console.log(JSON.stringify(r.best));
await br.close(); await server.close(); process.exit(0);
