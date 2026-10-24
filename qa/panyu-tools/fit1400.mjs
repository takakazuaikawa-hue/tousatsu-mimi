// 生成絵（1672x941など）を 1400x788 に縮めて webp と png（測る用）で書き出す。切り抜き指定があればその範囲だけ。引数：入力png（qa/panyu-tools内） 出力webp [x y w h]
import fs from 'node:fs';
import { launch } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [SRC, OUT, X, Y, W, H] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu/qa/panyu-tools', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/align2.html`, 8000);
const crop = X ? [+X, +Y, +W, +H] : null;
const d = await page.eval(`(async()=>{const i=new Image();i.src=${JSON.stringify(SRC)};await i.decode();const c=document.createElement('canvas');c.width=1400;c.height=788;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(i,0,0,1400,788);
const cr=${JSON.stringify(crop)};let o=c;if(cr){o=document.createElement('canvas');o.width=cr[2];o.height=cr[3];o.getContext('2d').drawImage(c,cr[0],cr[1],cr[2],cr[3],0,0,cr[2],cr[3]);}
return o.toDataURL('image/webp',0.92)+'|'+o.toDataURL('image/png');})()`);
const [w, p] = d.split('|');
fs.writeFileSync(OUT, Buffer.from(w.split(',')[1], 'base64')); fs.writeFileSync(OUT.replace(/\.webp$/, '_1400.png'), Buffer.from(p.split(',')[1], 'base64')); console.log(fs.statSync(OUT).size);
await br.close(); await server.close(); process.exit(0);
