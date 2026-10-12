// ボタンを1つずつ外し、お腹のすき間を拡大して撮る。引数：出力先の頭（例 C:/tmp/gap）
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const REPO = 'C:/Users/takakazu/projects/mp_panyu';
const OUT = process.argv[2];
const server = await serve(REPO, 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800);
await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000);
await sleep(1500);
const xf = `const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;let ox=w/2-701*s,oy=h*0.56-548*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));`;
const tap = (pts) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}
 ${JSON.stringify(pts)}.forEach(([x,y],k)=>{const q=[ox+x*s,oy+y*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:50+k,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:50+k,bubbles:true}));});return 1;})()`);
// 画像座標 [610..790] x [560..800] を3倍で
const clip = JSON.parse(await page.eval(`(()=>{${xf}const x0=ox+610*s,y0=oy+560*s;return JSON.stringify({x:x0,y:y0,width:180*s,height:Math.min(240*s,h-y0),scale:3});})()`));
const shot = async (name) => { const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(`${OUT}-${name}.png`, Buffer.from(r.data, 'base64')); };
await shot('0');
await tap([[700, 663]]); await sleep(90); await shot('1pop'); await sleep(4500); await shot('1');
await tap([[700, 725]]); await sleep(4500); await shot('2');
await tap([[700, 775]]); await sleep(4500); await shot('3');
await br.close(); await server.close(); process.exit(0);
