// 夜（ほろ酔い・泥酔）の扉絵をゲーム用に変換する（2026-11-16）。
//  node qa/doorconvert.mjs <元の絵>=<名前> ...   例：qa/out/night_doors/h_polka_1.png=h_polka
//  → assets/episodes/night/<名前>.webp（1600x900）
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
const save = (out, d) => { fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(out, fs.statSync(out).size); };
fs.mkdirSync('assets/episodes/night', { recursive: true });
for (const arg of process.argv.slice(2)) {
  const [src, name] = arg.split('=');
  const r = await page.eval(`(async()=>{const i=new Image();i.src='/'+${JSON.stringify(src)};await i.decode();const out=[];for(const [W,H,t,q] of [[1600,900,'image/webp',0.86]]){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';const s=Math.max(W/i.width,H/i.height);const w=i.width*s,h=i.height*s;g.drawImage(i,(W-w)/2,(H-h)/2,w,h);out.push(c.toDataURL(t,q));}return JSON.stringify(out);})()`, 60000);
  const [webp] = JSON.parse(r);
  save(`assets/episodes/night/${name}.webp`, webp);
}
await br.close(); await server.close(); process.exit(0);
