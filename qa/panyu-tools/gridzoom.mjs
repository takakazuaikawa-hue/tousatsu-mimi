// 絵の一部に方眼（step点ごと、数字つき）を重ねて拡大して撮る。引数：出力 絵 x y w h 倍率 [step=20]
import fs from 'node:fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OUT, IMG, X, Y, W, H, SC, ST] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(500);
const d = await page.eval(`(async()=>{const i=new Image();i.src='../../assets/characters/${IMG}';await i.decode();const s=${SC},x0=${X},y0=${Y},w=${W},h=${H},st=${ST || 20};
const c=document.createElement('canvas');c.width=w*s;c.height=h*s;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(i,x0,y0,w,h,0,0,w*s,h*s);
g.font='11px sans-serif';for(let x=Math.ceil(x0/st)*st;x<x0+w;x+=st){g.strokeStyle=x%100?'rgba(0,255,255,.35)':'rgba(255,255,0,.8)';g.beginPath();g.moveTo((x-x0)*s,0);g.lineTo((x-x0)*s,h*s);g.stroke();g.fillStyle='#ff0';g.fillText(x,(x-x0)*s+2,11);}
for(let y=Math.ceil(y0/st)*st;y<y0+h;y+=st){g.strokeStyle=y%100?'rgba(0,255,255,.35)':'rgba(255,255,0,.8)';g.beginPath();g.moveTo(0,(y-y0)*s);g.lineTo(w*s,(y-y0)*s);g.stroke();g.fillStyle='#ff0';g.fillText(y,2,(y-y0)*s-2);}
return c.toDataURL('image/png');})()`);
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64'));
await br.close(); await server.close(); process.exit(0);
