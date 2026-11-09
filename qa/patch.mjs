// 絵の一部を切り出す／描き直した部分をはめ戻す（ふちをぼかして）。
// node qa/patch.mjs batch <jobs.json>（[["crop",...],["paste",...]] を1回の起動でまとめて）
// node qa/patch.mjs crop <元.png> <x> <y> <w> <h> <出力.png>
// node qa/patch.mjs paste <元.png> <描き直し.png> <x> <y> <w> <h> <出力.png> [ぼかし幅px=40]
//   描き直しは w×h に縮めて (x,y) に置き、四辺 ぼかし幅 で元の絵に溶かす。パスはリポジトリからの相対
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [MODE, ...a] = process.argv.slice(2);
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/index.html?blank`, 60000).catch(() => {});
const load = `const L=s=>new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src='/'+s;});`;
const jobs = MODE === 'batch' ? JSON.parse(fs.readFileSync(a[0], 'utf8')) : [[MODE, ...a]];
for (const [M, ...b] of jobs) {
let js, out;
if (M === 'crop') {
  const [src, x, y, w, h, o] = b; out = o;
  js = `(async()=>{${load}const im=await L(${JSON.stringify(src)});const c=document.createElement('canvas');c.width=${+w};c.height=${+h};c.getContext('2d').drawImage(im,${+x},${+y},${+w},${+h},0,0,${+w},${+h});return c.toDataURL('image/png');})()`;
} else {
  const [src, pat, x, y, w, h, o, f = 40] = b; out = o;
  js = `(async()=>{${load}const im=await L(${JSON.stringify(src)}),p=await L(${JSON.stringify(pat)});const X=${+x},Y=${+y},W=${+w},H=${+h},F=${+f};
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
  const t=document.createElement('canvas');t.width=W;t.height=H;const tg=t.getContext('2d');tg.drawImage(p,0,0,W,H);
  const m=document.createElement('canvas');m.width=W;m.height=H;const mg=m.getContext('2d');const d=mg.createImageData(W,H);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const e=Math.min(i,j,W-1-i,H-1-j);const v=Math.max(0,Math.min(1,e/F));const s=v*v*(3-2*v);d.data[(j*W+i)*4+3]=Math.round(s*255);}
  mg.putImageData(d,0,0);tg.globalCompositeOperation='destination-in';tg.drawImage(m,0,0);g.drawImage(t,X,Y);return c.toDataURL('image/png');})()`;
}
const r = await page.eval(js, 300000);
fs.writeFileSync(out, Buffer.from(r.split(',')[1], 'base64')); console.log('ok', out);
}
await br.close(); await server.close(); process.exit(0);
