// 開いた絵（ChatGPT の部分修正）を閉じた絵に合わせて 1400x788 の webp にする。node align3.mjs <閉じた絵.webp（assets/characters）> <開いた絵.png（このフォルダー）> <出力.webp>
import fs from 'node:fs';
import { launch } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const [ORIG, SRC, OUT] = process.argv.slice(2);
fs.copyFileSync('C:/Users/takakazu/projects/mimi_porker/assets/characters/' + ORIG, 'C:/Users/takakazu/projects/mimi_porker/qa/panyu-tools/_orig3.webp');
const server = await serve('C:/Users/takakazu/projects/mimi_porker/qa/panyu-tools', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/align3.html`, 8000);
const r = await page.eval(`(async()=>{window.ORIG='_orig3.webp';const r=await window.run(${JSON.stringify(SRC)});const i=new Image();i.src=r.full;await i.decode();const c=document.createElement('canvas');c.width=1400;c.height=788;c.getContext('2d').drawImage(i,0,0);r.webp=c.toDataURL('image/webp',0.92);delete r.full;return JSON.stringify(r);})()`, 180000);
const o = JSON.parse(r); fs.writeFileSync(OUT, Buffer.from(o.webp.split(',')[1], 'base64')); fs.writeFileSync(OUT.replace(/\.webp$/, '_cmp.jpg'), Buffer.from(o.cmp.split(',')[1], 'base64'));
console.log(JSON.stringify({ best: o.best, ident: o.ident, size: [o.nw, o.nh] }));
await br.close(); await server.close(); process.exit(0);
