// 肩紐を外して、紐の先の動きを記録する（落ちる速さ・揺れ幅・止まるまで）。引数：衣装名
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(5000);
const out = await page.eval(`(async()=>{const D=__panyuDbg;const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;const F=D.focus;let ox=w/2-F[0]*s,oy=h*0.56-F[1]*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));
const st=document.getElementById('stage');const b=D.parts[0];const p=[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];const q=[ox+p[0]*s,oy+p[1]*s];
st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:81,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:81,bubbles:true}));
const t0=performance.now();const rec=[];let last=null,still=0,stop=null;
while(performance.now()-t0<4000){const r=D.ropes()[0];if(r){const e=r.pts[r.pts.length-1];rec.push([performance.now()-t0,e.x,e.y]);if(last&&Math.hypot(e.x-last[0],e.y-last[1])<0.05){still++;if(still>10&&stop==null)stop=performance.now()-t0;}else still=0;last=[e.x,e.y];}await new Promise(r=>setTimeout(r,16));}
const fin=rec[rec.length-1];const at=(ms)=>{const r=rec.find(v=>v[0]>=ms);return r?(r[1]-fin[1]).toFixed(0)+','+(r[2]-fin[2]).toFixed(0):'-';};
let minX=1e9,maxX=-1e9;rec.forEach(v=>{if(v[0]>300){minX=Math.min(minX,v[1]);maxX=Math.max(maxX,v[1]);}});
return '止まるまで'+(stop==null?'4秒以上':(stop/1000).toFixed(2)+'秒')+' / 0.3秒後の揺れ幅（横）'+(maxX-minX).toFixed(1)+' / 最終位置からのずれ 0.1s:'+at(100)+' 0.2s:'+at(200)+' 0.4s:'+at(400)+' 0.8s:'+at(800);})()`);
console.log(OF, out);
await br.close(); await server.close(); process.exit(0);
