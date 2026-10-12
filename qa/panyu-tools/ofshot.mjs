// 衣装ごと：留めを順に外し、全体と胸元の拡大を撮る。引数：衣装名 出力先の頭
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(3000);
console.log('err:', await page.eval(`getComputedStyle(document.getElementById('err')).display`));
const xf = `const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;let ox=w/2-701*s,oy=h*0.56-548*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));`;
const tapK = (k) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}const b=__panyuDbg.parts[${k}];const p=b.c||[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];const q=[ox+p[0]*s,oy+p[1]*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));return document.getElementById('lv').textContent;})()`);
const clip = JSON.parse(await page.eval(`(()=>{${xf}const x0=ox+540*s,y0=oy+430*s;return JSON.stringify({x:x0,y:y0,width:320*s,height:Math.min(358*s,h-y0),scale:2});})()`));
const shot = async (n, z) => { const r = await page.send('Page.captureScreenshot', z ? { format: 'png', clip } : { format: 'png' }); fs.writeFileSync(`${OUT}-${n}.png`, Buffer.from(r.data, 'base64')); };
await shot('0z', 1);
for (let k = 0; k < 3; k++) { console.log(await tapK(k)); await sleep(110); await shot(`${k + 1}pop`); await sleep(4500); await shot(`${k + 1}z`, 1); }
await shot('3');
await br.close(); await server.close(); process.exit(0);
