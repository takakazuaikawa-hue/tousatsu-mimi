// ドレス：左の肩紐を外し、角の位置（網目で動いた後）を中心に6倍で撮る。引数：出力 [待つ秒]
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OUT, W] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=dress`, 8000); await sleep(3000);
const xf = `const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;let ox=w/2-701*s,oy=h*0.56-548*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));`;
await page.eval(`(()=>{const st=document.getElementById('stage');${xf}const b=__panyuDbg.parts[0];const p=[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];const q=[ox+p[0]*s,oy+p[1]*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));return 1;})()`);
await sleep((+W || 4) * 1000);
const clip = JSON.parse(await page.eval(`(()=>{${xf}const m=__panyuDbg.meshAt(570,535);return JSON.stringify({x:ox+(m[0]-45)*s,y:oy+(m[1]-40)*s,width:90*s,height:80*s,scale:4});})()`));
const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
await br.close(); await server.close(); process.exit(0);
