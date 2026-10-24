import fs from 'node:fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const REPO = 'C:/Users/takakazu/projects/mp_panyu', OUT = process.argv[2];
const server = await serve(REPO, 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(1500);
const clip = async (name) => { const r = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 70, clip: { x: 380, y: 400, width: 520, height: 400, scale: 0.6 } }); fs.writeFileSync(OUT + name, Buffer.from(r.data, 'base64')); };
const tap = (x, y) => page.eval(`(()=>{const st=document.getElementById('stage');const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;let ox=w/2-701*s,oy=h*0.56-548*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));
 const q=[ox+${x}*s,oy+${y}*s];const id=Math.random()*1e6|0;st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:id,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:id,bubbles:true}));return 1;})()`);
await tap(700, 663); for (let k = 0; k < 4; k++) { await sleep(70); await clip(`-p1_${k}.jpg`); }
await sleep(2500); await tap(700, 725); await sleep(1500); await tap(700, 775); await sleep(2500);
await clip('-rest3.jpg');
for (let k = 0; k < 10; k++) { await tap(k % 2 ? 795 : 607, 560); await sleep(120); }
for (let k = 0; k < 4; k++) { await clip(`-shake_${k}.jpg`); await sleep(90); }
await br.close(); await server.close(); process.exit(0);
