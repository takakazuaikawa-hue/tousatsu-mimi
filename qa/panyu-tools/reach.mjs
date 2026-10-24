// 胸の真ん中を3回連打した後、1.2秒のあいだに網目がどれだけ動いたか（胸の中の各点の最大のずれ）を測る。引数：衣装名
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(5000);
const out = await page.eval(`(async()=>{const D=__panyuDbg;const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;const F=D.focus;let ox=w/2-F[0]*s,oy=h*0.56-F[1]*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));
const st=document.getElementById('stage');const res=[];
for(let i=0;i<2;i++){const c=D.cups[i];const pts=[];for(let gy=-1;gy<=1;gy+=0.5)for(let gx=-1;gx<=1;gx+=0.5)pts.push([c[0]+gx*110,c[1]+gy*110]);
const mx=pts.map(()=>0);for(let k=0;k<3;k++){const q=[ox+c[0]*s,oy+(c[1]+20)*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:80,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:80,bubbles:true}));await new Promise(r=>setTimeout(r,90));}
const t0=performance.now();while(performance.now()-t0<1200){pts.forEach((p,j)=>{const m=D.meshAt(p[0],p[1]);mx[j]=Math.max(mx[j],Math.hypot(m[0]-p[0],m[1]-p[1]));});await new Promise(r=>setTimeout(r,16));}
res.push('cup'+i+' '+c.join(',')+' 中心'+mx[12].toFixed(0)+' 全点平均'+(mx.reduce((a,b)=>a+b)/mx.length).toFixed(1)+' 上段'+mx.slice(0,5).map(v=>v.toFixed(0)).join('/')+' 下段'+mx.slice(20).map(v=>v.toFixed(0)).join('/'));await new Promise(r=>setTimeout(r,2500));}
return res.join(' | ');})()`);
console.log(OF, out);
await br.close(); await server.close(); process.exit(0);
