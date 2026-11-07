// 揺れる範囲（胸の楕円：実際の重み w の 0.5/0 の線）と、動かさない所（keep）を絵に重ねて撮る。node zoneshot.mjs <衣装キー> <出力png>
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const [KEY, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mimi_porker', 0); const br = await launch({ width: 1400, height: 788 }); const page = await br.newPage();
await page.setViewport(1400, 788);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${encodeURIComponent(KEY)}`, 15000); await sleep(4000);
const r = await page.eval(`(async()=>{const d=window.__panyuZone;const img=new Image();img.src='../../assets/characters/'+d.img;await img.decode();const c=document.createElement('canvas');c.width=1400;c.height=788;const g=c.getContext('2d');g.drawImage(img,0,0,1400,788);
g.lineWidth=2;const MS=d.mass||[0,0.18];
d.cups.forEach(([x,y,r])=>{g.strokeStyle='#00ff66';g.beginPath();g.ellipse(x,y,r*1.12,r,0,0,7);g.stroke();g.setLineDash([6,5]);g.beginPath();g.ellipse(x,y,r*1.12*(MS[0]+1)/2,r*(MS[0]+1)/2,0,0,7);g.stroke();g.setLineDash([]);
 g.strokeStyle='#ffee00';g.beginPath();g.moveTo(x-r*1.1,y-r*0.95+r*1.7*0.5);g.lineTo(x+r*1.1,y-r*0.95+r*1.7*0.5);g.stroke();g.fillStyle='#00ff66';g.fillRect(x-3,y-3,6,6);});
(d.keep||[]).forEach(([x,y,w,h])=>{if(!w)return;g.strokeStyle='#ff3355';g.beginPath();g.ellipse(x,y,w,h,0,0,7);g.stroke();});
(d.tipP||[]).forEach(([x,y])=>{g.strokeStyle='#33ccff';g.beginPath();g.arc(x,y,6,0,7);g.stroke();});
return c.toDataURL('image/png');})()`, 60000);
fs.writeFileSync(OUT, Buffer.from(r.split(',')[1], 'base64')); await br.close(); await server.close(); process.exit(0);
