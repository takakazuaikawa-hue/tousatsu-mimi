// 絵の一覧の比べ絵（番号付き）。node qa/montage.mjs <出力.jpg> <列数> <幅> <絵1> <絵2> ...（パスはリポジトリからの相対）
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [OUT, COLS, W, ...files] = process.argv.slice(2);
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/index.html?blank`, 8000).catch(() => {});
const r = await page.eval(`(async()=>{const fs=${JSON.stringify(files)},C=${+COLS},W=${+W};const ims=await Promise.all(fs.map(f=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src='/'+f;})));const H=Math.round(W*0.6*941/(0.5*1672));const rows=Math.ceil(fs.length/C);const c=document.createElement('canvas');c.width=C*W;c.height=rows*(H+30);const g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,c.width,c.height);ims.forEach((im,k)=>{const x=(k%C)*W,y=Math.floor(k/C)*(H+30);if(im){const sx=im.width*0.25,sy=im.height*0.4,sw=im.width*0.5,sh=im.height*0.6;g.drawImage(im,sx,sy,sw,sh,x,y,W,H);}g.fillStyle='#fff';g.font='bold 18px sans-serif';g.fillText((k+1)+'  '+fs[k].split('/').pop(),x+6,y+H+21);});return c.toDataURL('image/jpeg',0.85);})()`, 120000);
fs.writeFileSync(OUT, Buffer.from(r.split(',')[1], 'base64'));
await br.close(); await server.close(); process.exit(0);
