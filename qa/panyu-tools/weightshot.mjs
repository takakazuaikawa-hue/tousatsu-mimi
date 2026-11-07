// 実際に動く量（重み w×a、cup() と同じ式）を赤の濃さで絵に重ねる。胸の上まで入っているかを見る。node weightshot.mjs <衣装キー> <出力png>
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const [KEY, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mimi_porker', 0); const br = await launch({ width: 1400, height: 788 }); const page = await br.newPage();
await page.setViewport(1400, 788);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${encodeURIComponent(KEY)}`, 15000); await sleep(4000);
const r = await page.eval(`(async()=>{const d=window.__panyuZone;const img=new Image();img.src='../../assets/characters/'+d.img;await img.decode();const c=document.createElement('canvas');c.width=1400;c.height=788;const g=c.getContext('2d');g.drawImage(img,0,0,1400,788);
const id=g.getImageData(0,0,1400,788),D=id.data,MS=d.mass||[0,0.18],dome=d.dome||0;const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const cups=d.cups.map(([x,y,r0,ry,an])=>({x,y,r:ry||r0,ex:ry?r0/ry:1.12,an:(an||0)*Math.PI/180}));
const keepW=(x,y)=>Math.max(0,...(d.keep||[]).map(k=>{if(!k[2])return 0;const a=(k[4]||0)*Math.PI/180,dx=x-k[0],dy=y-k[1],kx=dx*Math.cos(a)+dy*Math.sin(a),ky=-dx*Math.sin(a)+dy*Math.cos(a);return 1-sm(0.55,1,Math.hypot(kx/k[2],ky/k[3]));}));
for(let y=0;y<788;y+=2)for(let x=0;x<1400;x+=2){let W=0,RL=0;for(const C of cups){const qx=x-C.x,qy=y-C.y,ca=Math.cos(C.an),sa=Math.sin(C.an),ux=qx*ca+qy*sa,uy=-qx*sa+qy*ca;const P=d.pear;const rho=P?Math.hypot(ux/(C.r*C.ex*(1-P[1]*Math.min(1,Math.max(0,-uy/(C.r*P[0]))))),uy<0?uy/(C.r*P[0]):uy/C.r):Math.hypot(ux/(C.r*C.ex),uy/C.r);let w=1-sm(MS[0],1,rho/(d.edge||1));if(Math.abs(rho-1)<0.012)RL=1;if(dome)w=w*(1-dome)+dome*Math.sqrt(Math.max(0,1-rho*rho));const t=Math.min(1,Math.max(0,(uy+C.r*0.95)/(C.r*1.7)));const a=MS[1]+(1-MS[1])*t*t*(3-2*t);W=Math.max(W,w*a);}W*=1-keepW(x,y);
 if(RL)for(const[ox,oy]of[[0,0],[1,0],[0,1],[1,1]]){const i=((y+oy)*1400+x+ox)*4;D[i]=0;D[i+1]=230;D[i+2]=255;}else if(W>0.015&&W<0.05)for(const[ox,oy]of[[0,0],[1,0],[0,1],[1,1]]){const i=((y+oy)*1400+x+ox)*4;D[i]=255;D[i+1]=240;D[i+2]=0;}else if(W>0.02)for(const[ox,oy]of[[0,0],[1,0],[0,1],[1,1]]){const i=((y+oy)*1400+x+ox)*4;D[i]=D[i]*(1-W*0.75)+255*W*0.75;D[i+1]*=1-W*0.75;D[i+2]*=1-W*0.75;}}
g.putImageData(id,0,0);g.font="14px sans-serif";for(let x=0;x<1400;x+=50){g.strokeStyle=x%100?"rgba(0,255,120,.25)":"rgba(0,255,120,.6)";g.beginPath();g.moveTo(x,0);g.lineTo(x,788);g.stroke();if(!(x%100)){g.fillStyle="#0f8";g.fillText(x,x+2,14);}}for(let y=0;y<788;y+=50){g.strokeStyle=y%100?"rgba(0,255,120,.25)":"rgba(0,255,120,.6)";g.beginPath();g.moveTo(0,y);g.lineTo(1400,y);g.stroke();if(!(y%100)){g.fillStyle="#0f8";g.fillText(y,2,y-2);}}return c.toDataURL('image/png');})()`, 120000);
fs.writeFileSync(OUT, Buffer.from(r.split(',')[1], 'base64')); await br.close(); await server.close(); process.exit(0);
