// V字の左右の布の縁を、外から内へ向かって最初に肌になる所として測る。引数：絵 中心x y0 y1 [幅=90]
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [IMG, GX, Y0, Y1, WD] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 400, height: 300 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html`, 8000); await sleep(800);
const out = await page.eval(`new Promise(res=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=1400;c.height=788;const x=c.getContext('2d');x.drawImage(i,0,0);
const skin=(r,g,b)=>r>140&&g>75&&b<g-4&&r-g>25;
const rows=[];const W=${WD || 90};for(let y=${Y0};y<=${Y1};y++){const d=x.getImageData(0,y,1400,1).data;const sk=k=>skin(d[k*4],d[k*4+1],d[k*4+2]);
let l=-1,r=-1;for(let k=${GX}-W;k<=${GX};k++){if(sk(k)&&sk(k+1)&&sk(k+2)){l=k;break;}}for(let k=${GX}+W;k>=${GX};k--){if(sk(k)&&sk(k-1)&&sk(k-2)){r=k;break;}}
rows.push(y+': '+(l<0?'-':(${GX}-l))+' / '+(r<0?'-':(r-${GX})));}
res(rows.join('|'));};i.src='../../assets/characters/${IMG}';})`);
console.log(out);
await br.close(); await server.close(); process.exit(0);
