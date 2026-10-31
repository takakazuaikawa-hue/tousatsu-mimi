// 胸を押して揺らした間、絵の各点がどれだけ動いたかを、絵の上に色で重ねて書き出す。引数：衣装名 出力png 押す胸(0/1/both)
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF, OUT, WHICH] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(5000);
const d = await page.eval(`(async()=>{const D=__panyuDbg;const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;const F=D.focus;let ox=w/2-F[0]*s,oy=h*0.56-F[1]*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));
const st=document.getElementById('stage');const G=8,X0=300,X1=1100,Y0=330,Y1=788;const pts=[];for(let y=Y0;y<=Y1;y+=G)for(let x=X0;x<=X1;x+=G)pts.push([x,y]);const mx=pts.map(()=>0);
const cups=${JSON.stringify(WHICH || 'both')}==='both'?[0,1]:[+${JSON.stringify(WHICH || '0')}];
for(const i of cups){const c=D.cups[i];for(let k=0;k<3;k++){const q=[ox+c[0]*s,oy+(c[1]+20)*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:90+k,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:90+k,bubbles:true}));await new Promise(r=>setTimeout(r,90));}
const t0=performance.now();while(performance.now()-t0<1100){pts.forEach((p,j)=>{const m=D.meshAt(p[0],p[1]);mx[j]=Math.max(mx[j],Math.hypot(m[0]-p[0],m[1]-p[1]));});await new Promise(r=>setTimeout(r,20));}await new Promise(r=>setTimeout(r,1500));}
const img=new Image();img.src=document.querySelector('canvas')?'../../assets/characters/'+(${JSON.stringify(OF)}==='pajama2'?'panyu_pajama2_reach.webp':'panyu_reach.webp'):'';await img.decode();
const cv=document.createElement('canvas');cv.width=X1-X0;cv.height=Y1-Y0;const g=cv.getContext('2d');g.drawImage(img,X0,Y0,X1-X0,Y1-Y0,0,0,X1-X0,Y1-Y0);
const top=Math.max(...mx);pts.forEach((p,j)=>{const v=mx[j]/top;if(v<0.03)return;g.fillStyle='hsla('+(240-240*v)+',100%,50%,'+(0.25+0.4*v)+')';g.fillRect(p[0]-X0-G/2,p[1]-Y0-G/2,G,G);});
g.fillStyle='#fff';g.font='16px sans-serif';g.fillText('最大 '+top.toFixed(0),8,20);return cv.toDataURL('image/png');})()`);
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64'));
await br.close(); await server.close(); process.exit(0);
