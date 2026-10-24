// 水着版：左の肩紐→右の肩紐→リングの順に外し、全体と胸元の拡大を撮る。引数：出力先の頭
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const OUT = process.argv[2];
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
const errs = []; 
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=bikini`, 8000); await sleep(3000);
console.log('err:', await page.eval(`getComputedStyle(document.getElementById('err')).display`));
const xf = `const V=__panyuDbg.view(),s=V.s,ox=V.ox,oy=V.oy;`;   // 画面の今の写し方（寄りが動いている途中でも押す所がずれない）
const tap = (x, y) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}const q=[ox+${x}*s,oy+${y}*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));return document.getElementById('lv').textContent;})()`);
const clip = JSON.parse(await page.eval(`(()=>{${xf}const x0=ox+540*s,y0=oy+430*s;return JSON.stringify({x:x0,y:y0,width:320*s,height:Math.min(280*s,h-y0),scale:2});})()`));
const shot = async (n, z) => { const r = await page.send('Page.captureScreenshot', z ? { format: 'png', clip } : { format: 'png' }); fs.writeFileSync(`${OUT}-${n}.png`, Buffer.from(r.data, 'base64')); };
await shot('0z', 1);
console.log(await tap(601, 497)); await sleep(150); await shot('1whip'); await sleep(4500); await shot('1z', 1);
console.log(await tap(806, 497)); await sleep(4500); await shot('2z', 1);
console.log(await tap(702, 655)); await sleep(110); await shot('3pop'); await sleep(4500); await shot('3z', 1); await shot('3');
await br.close(); await server.close(); process.exit(0);
