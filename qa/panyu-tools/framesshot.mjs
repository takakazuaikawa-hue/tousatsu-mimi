// 押した直後の動きを連続で撮る（胸元の拡大）。node framesshot.mjs <衣装キー> <出力png> <押すx> <押すy> [方眼]
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const [KEY, OUT, PX, PY] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mimi_porker', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${encodeURIComponent(KEY)}${process.argv[7] ? "&dbggrid=1" : ""}`, 15000); await sleep(5000);
const clip = JSON.parse(await page.eval(`(()=>{const V=__panyuDbg.view(),s=V.s,F=__panyuDbg.focus;return JSON.stringify({x:V.ox+(F[0]-230)*s,y:V.oy+(F[1]-170)*s,width:460*s,height:340*s,scale:0.8});})()`));
for (let n = 0; n < (+process.argv[6] || 1); n++) await page.eval(`(()=>{const st=document.getElementById('stage');const V=__panyuDbg.view();const q=[V.ox+${PX}*V.s,V.oy+${PY}*V.s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:9,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:9,bubbles:true}));return 1;})()`);
const shots = [];
for (let i = 0; i < 6; i++) { await sleep(45); const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); shots.push(r.data); }
for (let i = 0; i < shots.length; i++) fs.writeFileSync(OUT.replace('.png', `-${i}.png`), Buffer.from(shots[i], 'base64'));
await br.close(); await server.close(); process.exit(0);
