// ほろ酔いの夜の顔：酔ったカットイン・酔ったミミの胸像から、読み合いの顔（320x400）と会話のアイコン（256x256）を切り出す。
// node qa/drunkfaces.mjs  → assets/battle/face/drunk/<id>_<v>.webp、assets/ui/face_<id>_drunk.webp
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
// 切り出す所：[元の絵, 中心x, 中心y, 顔の幅]（元の絵の座標）。顔窓は幅:高さ＝4:5、アイコンは顔の幅の正方形
const C = 'assets/characters/';
const JOBS = {
  rico_a: [C + 'rico_cutin_drunk.webp', 720, 190, 460], rico_b: [C + 'rico_cutin_drunk2.webp', 700, 190, 460],
  polka_a: [C + 'polka_cutin_drunk.webp', 630, 200, 460], polka_b: [C + 'polka_cutin_drunk2.webp', 640, 200, 460],
  selina_a: [C + 'selina_cutin_drunk.webp', 660, 180, 460], selina_b: [C + 'selina_cutin_drunk2.webp', 660, 180, 460],
  grano_a: [C + 'grano_cutin_drunk.webp', 640, 170, 460], grano_b: [C + 'grano_cutin_drunk2.webp', 640, 170, 460],
  velvet_a: [C + 'velvet_cutin_drunk.webp', 560, 190, 460], velvet_b: [C + 'velvet_cutin_drunk2.webp', 560, 190, 460],
};
['calm', 'sad', 'shock', 'smug', 'think', 'win'].forEach(e => { JOBS['mimi_' + e] = [C + `mimi_bust_${e}_drunk.webp`, 375, 330, 420]; });
const ICON = { rico: 'rico_a', polka: 'polka_a', selina: 'selina_a', grano: 'grano_a', velvet: 'velvet_a', mimi: 'mimi_calm' };
fs.mkdirSync('assets/battle/face/drunk', { recursive: true });
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
const cut = (src, cx, cy, w, h, ow, oh) => page.eval(`(async()=>{const i=new Image();i.src='/'+${JSON.stringify(src)};await i.decode();const c=document.createElement('canvas');c.width=${ow};c.height=${oh};const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,${cx - w / 2},${cy - h / 2},${w},${h},0,0,${ow},${oh});return c.toDataURL('image/webp',0.88);})()`, 60000);
const save = (out, d) => { fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(out); };
for (const [name, [src, cx, cy, fw]] of Object.entries(JOBS)) save(`assets/battle/face/drunk/${name}.webp`, await cut(src, cx, cy + fw * 0.12, fw, fw * 1.25, 320, 400));
for (const [id, name] of Object.entries(ICON)) { const [src, cx, cy, fw] = JOBS[name]; save(`assets/ui/face_${id}_drunk.webp`, await cut(src, cx, cy, fw * 0.8, fw * 0.8, 256, 256)); }
await br.close(); await server.close(); process.exit(0);
