// CG集の絵を 1600x900 の jpg（中央で切る）と 480x270 の webp の見本にする。node qa/cgconvert.mjs <出力名> <元の絵> [<出力名> <元の絵> ...]
// 出力は assets/backgrounds/cgset/<名>.jpg と assets/backgrounds/cgset/thumb/<名>.webp
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const args = process.argv.slice(2);
fs.mkdirSync('assets/backgrounds/cgset/thumb', { recursive: true });
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
for (let k = 0; k < args.length; k += 2) {
  const [name, src] = [args[k], args[k + 1]];
  const r = await page.eval(`(async()=>{const i=new Image();i.src='/'+${JSON.stringify(src)};await i.decode();const out=[];for(const [W,H,t,q] of [[1600,900,'image/jpeg',0.86],[480,270,'image/webp',0.8]]){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';const s=Math.max(W/i.width,H/i.height);const w=i.width*s,h=i.height*s;g.drawImage(i,(W-w)/2,(H-h)/2,w,h);out.push(c.toDataURL(t,q));}return JSON.stringify(out);})()`, 60000);
  const [jpg, webp] = JSON.parse(r);
  fs.writeFileSync(`assets/backgrounds/cgset/${name}.jpg`, Buffer.from(jpg.split(',')[1], 'base64'));
  fs.writeFileSync(`assets/backgrounds/cgset/thumb/${name}.webp`, Buffer.from(webp.split(',')[1], 'base64'));
  console.log(name);
}
await br.close(); await server.close(); process.exit(0);
