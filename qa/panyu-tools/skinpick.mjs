// 元の絵の色を測る（5x5の平均）。引数：JSON {名前:[x,y]}
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const pts = process.argv[2];
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(300);
console.log(await page.eval(`(async()=>{const im=new Image();im.src='../../assets/characters/panyu_reach.webp';await im.decode();const c=document.createElement('canvas');c.width=1400;c.height=788;const x=c.getContext('2d');x.drawImage(im,0,0);const P=${pts};const o=[];for(const k in P){const d=x.getImageData(P[k][0]-2,P[k][1]-2,5,5).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}o.push(k+' '+(r/25|0)+','+(g/25|0)+','+(b/25|0));}return o.join(' | ');})()`));
await br.close(); await server.close(); process.exit(0);
