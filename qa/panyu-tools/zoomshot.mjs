// 衣装の留めを n 個外して落ち着いた所を、絵の座標の範囲で拡大して撮る。引数：衣装名 外す数 出力 x y w h [倍率=4]
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF, N, OUT, X, Y, WW, HH, SC] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}${process.env.DBG ? "&dbg=1" : ""}`, 8000); await sleep(5000);
const xf = `const iw=1400,ih=788,z=1.28,w=innerWidth,h=innerHeight;const s=Math.max(w/iw,h/ih)*z;const F=__panyuDbg.focus;let ox=w/2-F[0]*s,oy=h*0.56-F[1]*s;ox=Math.min(0,Math.max(w-iw*s,ox));oy=Math.min(0,Math.max(h-ih*s,oy));`;
const tapK = (k) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}const b=__panyuDbg.parts[${k}];const p=b.c||[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];const q=[ox+p[0]*s,oy+p[1]*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:71,bubbles:true}));})()`);
for (let k = 0; k < +N; k++) { await tapK(k); await sleep(400); }
await sleep(4500);
const clip = JSON.parse(await page.eval(`(()=>{${xf}return JSON.stringify({x:ox+${X}*s,y:oy+${Y}*s,width:${WW}*s,height:${HH}*s,scale:${(+SC || 4) / 1.28}});})()`));
const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
await br.close(); await server.close(); process.exit(0);
