// 絵に CSS の filter を焼き込む（11/23 メモリ：画面で filter をかけると GPU に別の描き先ができるため）
// node tools/bakefilter.mjs <in> <out> "<filter>"
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../qa/lib/cdp.mjs';
import { serve } from '../qa/lib/server.mjs';
const [IN, OUT, FILTER] = process.argv.slice(2);
const server = await serve(path.resolve('.'), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/qa/panyu-tools/align2.html`, 10000);
const d = await page.eval(`(async()=>{const i=new Image();i.src='/${IN.split(path.sep).join('/')}';await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.filter=${JSON.stringify(FILTER)};x.drawImage(i,0,0);return c.toDataURL('image/webp',0.9);})()`, 60000);
fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64')); console.log(OUT, fs.statSync(OUT).size);
await br.close(); await server.close(); process.exit(0);
