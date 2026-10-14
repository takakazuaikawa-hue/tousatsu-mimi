// 胸を押して揺れている途中を何コマか撮り、横に並べる。引数：衣装名 外す数 出力 [押す胸=0]
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF, N, OUT, CUP] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(4000);
const xf = `const V=__panyuDbg.view(),s=V.s,ox=V.ox,oy=V.oy;`;   // 画面の今の写し方（寄りが動いている途中でも押す所がずれない）
const tap = (ix, iy) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}const q=[ox+${ix}*s,oy+${iy}*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:72,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:72,bubbles:true}));})()`);
const tapK = (k) => page.eval(`(()=>{const b=__panyuDbg.parts[${k}];return b.c||[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];})()`).then(p => tap(p[0], p[1]));
for (let k = 0; k < +N; k++) { await tapK(k); await sleep(500); }
await sleep(4000);
const clip = JSON.parse(await page.eval(`(()=>{${xf}const F2=F;return JSON.stringify({x:ox+(F2[0]-330)*s,y:oy+(F2[1]-160)*s,width:660*s,height:330*s,scale:0.9});})()`));
const cup = await page.eval(`JSON.stringify(__panyuDbg.P.length)`);
const c = JSON.parse(await page.eval(`JSON.stringify(${'[[607,600],[795,600]]'})`));
const pz = JSON.parse(await page.eval(`JSON.stringify(__panyuDbg.cups||null)`)) || c;
const target = pz[+CUP || 0];
// 3回連打して大きく揺らす
for (let i = 0; i < 3; i++) { await tap(target[0], target[1] + 20); await sleep(90); }
const t0 = Date.now(); let n = 0;
for (const at of [40, 120, 200, 300, 420, 560]) { while (Date.now() - t0 < at) await sleep(5); const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(OUT.replace('.png', `-${n++}.png`), Buffer.from(r.data, 'base64')); }
await br.close(); await server.close(); process.exit(0);
