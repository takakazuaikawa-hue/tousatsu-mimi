// 絵の点の色を測る。引数：絵 x,y x,y ...
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [IMG, ...PTS] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 400, height: 300 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(800);
const out = await page.eval(`new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=1400;c.height=788;const x=c.getContext('2d');x.drawImage(i,0,0);
res(${JSON.stringify(PTS)}.map(s=>{const [a,b]=s.split(',').map(Number);const d=x.getImageData(a,b,1,1).data;return s+'='+d[0]+','+d[1]+','+d[2];}).join(' | '));};i.src='../../assets/characters/${IMG}';})`);
console.log(out);
await br.close(); await server.close(); process.exit(0);
