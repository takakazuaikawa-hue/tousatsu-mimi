// 絵の見比べページ（大きな絵を埋め込んだ1枚の HTML。Artifact で渡す）。
// node qa/reviewpage.mjs <spec.json> <out.html>
// spec: { title, lead, sections: [{ h, note?, cols?, items: [{ src, label, tag?, base?, alpha?, w? }] }] }
//  alpha:true は透過の立ち絵（webp のまま縮める・暗い地に置く）、base:true は金の枠（採用済み・今の絵）
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [SPEC, OUT] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
const enc = (it) => page.eval(`(async()=>{const i=new Image();i.src='/'+${JSON.stringify(it.src)};await i.decode();const W=${it.w || (it.alpha ? 700 : 1400)};const s=Math.min(1,W/i.width);const c=document.createElement('canvas');c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,0,0,c.width,c.height);return c.toDataURL(${it.alpha ? "'image/webp',0.86" : "'image/jpeg',0.82"});})()`, 60000);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let body = '';
for (const sec of spec.sections) {
  let cards = '';
  for (const it of sec.items) {
    const d = await enc(it).catch(() => null);
    if (!d) { console.error('skip', it.src); continue; }
    cards += `<figure class="${it.base ? 'base' : ''} ${it.alpha ? 'alpha' : ''}"><img src="${d}" alt="${esc(it.label)}"><figcaption><b>${esc(it.label)}</b>${it.tag ? esc(it.tag) : ''}</figcaption></figure>`;
  }
  body += `<section><h2>${esc(sec.h)}</h2>${sec.note ? `<p class="note">${esc(sec.note)}</p>` : ''}<div class="grid" style="--min:${sec.min || 560}px">${cards}</div></section>`;
}
await br.close(); await server.close();
const html = `<title>${esc(spec.title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* 夜の劇場の見比べ帳：絵を大きく、押すと等倍で開く */
:root{--bg:#1b0f14;--panel:#2a1820;--line:#5a3a2a;--gold:#d9b46a;--fg:#f3e7d6;--mute:#bfa996;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:"Hiragino Sans","Yu Gothic",sans-serif;font-size:16px;line-height:1.7}
.wrap{max-width:1500px;margin:0 auto;padding-block:24px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1{color:var(--gold);font-size:28px;margin:0 0 4px}.lead{color:var(--mute);margin:0 0 12px;max-width:70ch}
h2{color:var(--gold);font-size:20px;margin:30px 0 6px;border-bottom:1px solid var(--line);padding-bottom:4px}.note{color:var(--mute);margin:0 0 10px;max-width:80ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--min)),1fr));gap:14px}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden;min-width:0}
figure.base{border-color:var(--gold)}figure.alpha{background:#120a0e}
figure.alpha img{max-height:640px;object-fit:contain;margin:0 auto}
img{display:block;width:100%;height:auto;cursor:zoom-in}
figcaption{padding:8px 12px;color:var(--mute);font-size:15px}figcaption b{color:var(--gold);margin-right:10px;font-size:17px}
.zoom{position:fixed;inset:0;background:#000e;display:flex;align-items:flex-start;justify-content:center;overflow:auto;z-index:9}
.zoom img{width:auto;max-width:none;cursor:zoom-out}
</style>
<div class="wrap"><h1>${esc(spec.title)}</h1><p class="lead">${esc(spec.lead)}</p>${body}</div>
<script>document.addEventListener('click',e=>{const z=document.querySelector('.zoom');if(z){z.remove();return;}if(e.target.tagName==='IMG'){const d=document.createElement('div');d.className='zoom';const i=new Image();i.src=e.target.src;d.appendChild(i);document.body.appendChild(d);}});</script>`;
fs.writeFileSync(OUT, html);
console.log('ok', (html.length / 1e6).toFixed(1) + 'MB');
process.exit(0);
