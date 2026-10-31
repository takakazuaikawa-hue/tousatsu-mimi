// 使い方：node align2.mjs <生成絵.png> <出力の頭>
import fs from 'node:fs'; import path from 'node:path';
import { launch } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const DIR = 'C:/Users/takakazu/projects/mp_panyu/qa/panyu-tools', [SRC, OUT] = process.argv.slice(2);
const server = await serve(DIR, 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/align2.html`, 8000);
const r = await page.eval(`window.run(${JSON.stringify(path.basename(SRC))})`, 120000);
fs.writeFileSync(OUT + '-aligned.png', Buffer.from(r.full.split(',')[1], 'base64'));
fs.writeFileSync(OUT + '-cmp.jpg', Buffer.from(r.cmp.split(',')[1], 'base64'));
console.log(JSON.stringify({ best: r.best, ident: r.ident, size: [r.nw, r.nh] }));
await br.close(); await server.close(); process.exit(0);
