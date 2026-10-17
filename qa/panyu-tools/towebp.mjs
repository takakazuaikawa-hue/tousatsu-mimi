// png を webp（品質0.92）に。使い方：node towebp.mjs <qa/panyu-tools内のpng名> <出力パス>
import fs from 'node:fs';
import { launch } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [SRC, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu/qa/panyu-tools', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/align2.html`, 8000);
const d = await page.eval(`(async()=>{const i=new Image();i.src=${JSON.stringify(SRC)};await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0);return c.toDataURL('image/webp',0.92);})()`);
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64')); console.log(fs.statSync(OUT).size);
await br.close(); await server.close(); process.exit(0);
