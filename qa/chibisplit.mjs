// ミニキャラのシート（横一列に5体・純緑か純青のベタ）を透過して5体に切り分け、374x560 の webp にする。
// node qa/chibisplit.mjs <シート.png> <出力の頭> [名前1,名前2,...]（既定 think,smug,panic,lose,win）
//   例：node qa/chibisplit.mjs qa/out/drunk_chibi/rico_a.png assets/battle/chibi/drunk/rico
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [SRC, OUT, NAMES = 'think,smug,panic,lose,win'] = process.argv.slice(2);
const names = NAMES.split(',');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
const r = await page.eval(`(async()=>{
  const i=new Image();i.src='/'+${JSON.stringify(SRC)};await i.decode();
  const W=i.width,H=i.height,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.drawImage(i,0,0);
  const im=g.getImageData(0,0,W,H),p=im.data;
  // 背景の色：四隅の平均（緑か青）
  const bgG=p[1]>p[2];
  for(let q=0;q<p.length;q+=4){const R=p[q],G=p[q+1],B=p[q+2];
    const k=bgG?G-Math.max(R,B):B-Math.max(R,G);
    let a=k>=90?0:k<=20?1:1-(k-20)/70;
    if(a<1){ if(bgG&&G>Math.max(R,B))p[q+1]=Math.max(R,B); if(!bgG&&B>Math.max(R,G))p[q+2]=Math.max(R,G); }
    p[q+3]=Math.round(a*255);}
  // 列ごとの不透明の数 → 空いた列で区切る
  const col=new Array(W).fill(0);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(p[(y*W+x)*4+3]>40)col[x]++;
  let segs=[],inS=false,s0=0;for(let x=0;x<W;x++){const on=col[x]>2;if(on&&!inS){inS=true;s0=x;}if(!on&&inS){inS=false;segs.push([s0,x]);}}if(inS)segs.push([s0,W]);
  segs=segs.filter(s=>s[1]-s[0]>25);
  // 多すぎる時は近いものを合わせる（小物が離れている時）
  while(segs.length>${names.length}){let bi=0,bd=1e9;for(let k=0;k<segs.length-1;k++){const d=segs[k+1][0]-segs[k][1];const w=Math.min(segs[k][1]-segs[k][0],segs[k+1][1]-segs[k+1][0]);const sc=d+w*.5;if(sc<bd){bd=sc;bi=k;}}segs.splice(bi,2,[segs[bi][0],segs[bi+1][1]]);}
  // 少なすぎる時は（髪や小物で体がつながっている）、一番広い塊を、中ほどで一番すいている列で割る
  while(segs.length<${names.length}){let bi=0;segs.forEach((s,k)=>{if(s[1]-s[0]>segs[bi][1]-segs[bi][0])bi=k;});const [a,b]=segs[bi];const n=Math.max(2,Math.round((b-a)/(W/${names.length})));
    const cut=[];for(let j=1;j<n;j++){const m=a+(b-a)*j/n,r=(b-a)/n*.3;let bx=Math.round(m),bv=1e9;for(let x=Math.round(m-r);x<=m+r;x++)if(col[x]<bv){bv=col[x];bx=x;}cut.push(bx);}
    const parts=[];let s=a;cut.forEach(x=>{parts.push([s,x]);s=x;});parts.push([s,b]);segs.splice(bi,1,...parts);}
  g.putImageData(im,0,0);
  // 5体を同じ縮尺で（しゃがんだ体だけ大きくならないように）。縮尺は一番背の高い体と一番広い体で決める
  const box=segs.map(([a,b])=>{let top=H,bot=0;for(let y=0;y<H;y++)for(let x=a;x<b;x++)if(p[(y*W+x)*4+3]>40){if(y<top)top=y;if(y>bot)bot=y;}return [a,b,top,bot];});
  const OW=374,OH=560,S=Math.min(...box.map(([a,b,t,u])=>Math.min((OW-16)/(b-a),(OH-12)/(u-t+1))));
  const out=[];
  for(const [a,b,top,bot] of box){
    const w=b-a,h=bot-top+1,s=S;
    const o=document.createElement('canvas');o.width=OW;o.height=OH;const og=o.getContext('2d');og.imageSmoothingQuality='high';
    og.drawImage(c,a,top,w,h,(OW-w*s)/2,OH-6-h*s,w*s,h*s);out.push(o.toDataURL('image/webp',0.9));}
  return JSON.stringify(out);})()`, 120000);
const list = JSON.parse(r);
if (list.length !== names.length) console.log('WARN 体の数', list.length, '期待', names.length);
list.forEach((d, k) => { if (!names[k]) return; const f = `${OUT}_${names[k]}.webp`; fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); console.log(f); });
await br.close(); await server.close(); process.exit(0);
