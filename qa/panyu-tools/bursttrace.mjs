import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const REPO = 'C:/Users/takakazu/projects/mp_panyu';
const server = await serve(REPO, 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(1500);
const r = await page.eval(`(async()=>{const st=document.getElementById('stage');const D=window.__panyuDbg;const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;let ox=w/2-701*s,oy=h*0.56-548*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));
 const q=[ox+700*s,oy+663*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:9,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:9,bubbles:true}));
 const tr=[];const t0=performance.now();while(performance.now()-t0<1500){await new Promise(r=>requestAnimationFrame(r));tr.push([Math.round(performance.now()-t0),Math.round(D.P[0].d[0]-8),Math.round(D.P[1].d[0]+8)]);}
 return tr.filter((_,i)=>i%5==0).map(v=>v.join(':')).join(' ');})()`);
console.log('時間ms:左の横位置:右の横位置（外向きがマイナス/プラス）'); console.log(r);
await br.close(); await server.close(); process.exit(0);
