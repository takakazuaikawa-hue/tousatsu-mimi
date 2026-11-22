// 純緑（#00FF00）の背景を抜いて webp にする道具（2026-11-22 勝ち抜き戦の絵で作り直し。sharp が無いのでヘッドレスの canvas で処理）
// 使い方：
//   node tools/keycut.mjs cut   <in.png> <out.webp> [幅x高さ]        … 抜いて余白を詰め、指定の枠に収める（省略時は詰めただけ）
//   node tools/keycut.mjs split <in.png> <出力の頭> <名1,名2,...> [高さ]  … 横一列の絵を体ごとに切り分け、<頭><名>.webp を書く
//   node tools/keycut.mjs mini  <in.png> <番号> <out.webp>               … 切り分けた番号の体を 1000x1000 の真ん中に置く（会話の丸のミニキャラ）
//   node tools/keycut.mjs bg    <in.png> <out.webp>                      … 背景の絵を 1600x900 に（抜かない）
// 抜き方：緑の強さ d=G-max(R,B) から不透明度を出し、縁は緑を割り戻す（逆プリマルチプライ）＋緑かぶりを消す（デスピル）。
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../qa/lib/cdp.mjs';
import { serve } from '../qa/lib/server.mjs';

const [mode, IN, ...rest] = process.argv.slice(2);
const ROOT = path.resolve('.');
const server = await serve(ROOT, 0);
const br = await launch({ width: 800, height: 600 });
const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/qa/panyu-tools/align2.html`, 10000);
const rel = '/' + path.relative(ROOT, path.resolve(IN)).replace(/\\/g, '/');

const LIB = `
async function load(src){const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.drawImage(i,0,0);return {c,x,w:c.width,h:c.height,d:x.getImageData(0,0,c.width,c.height)};}
function key(im){const p=im.d.data;for(let k=0;k<p.length;k+=4){let r=p[k],g=p[k+1],b=p[k+2];const d=g-Math.max(r,b);let a;if(d<=24)a=1;else if(d>=200)a=0;else a=1-(d-24)/(255-24);
 if(a<=0){p[k+3]=0;continue;}
 if(a<1){g=(g-(1-a)*255)/a;r=r/a;b=b/a;}
 const m=Math.max(r,b);if(g>m)g=m+(g-m)*0.0;   // デスピル
 p[k]=Math.min(255,Math.max(0,r));p[k+1]=Math.min(255,Math.max(0,g));p[k+2]=Math.min(255,Math.max(0,b));p[k+3]=Math.round(a*255);}
 // 小さな点（はぐれた半透明のごみ）を消す：まわり3x3に不透明が少ない画素は透明に
 im.x.putImageData(im.d,0,0);return im;}
function bbox(im,x0=0,x1=im.w){const p=im.d.data;let L=1e9,R=-1,T=1e9,B=-1;for(let y=0;y<im.h;y++)for(let x=x0;x<x1;x++){if(p[(y*im.w+x)*4+3]>40){if(x<L)L=x;if(x>R)R=x;if(y<T)T=y;if(y>B)B=y;}}return R<0?null:{L,R,T,B};}
function crop(im,b,pad){const L=Math.max(0,b.L-pad),T=Math.max(0,b.T-pad),R=Math.min(im.w-1,b.R+pad),B=Math.min(im.h-1,b.B+pad);const c=document.createElement('canvas');c.width=R-L+1;c.height=B-T+1;c.getContext('2d').drawImage(im.c,L,T,c.width,c.height,0,0,c.width,c.height);return c;}
function fit(src,W,H,anchor){const c=document.createElement('canvas');c.width=W;c.height=H;const s=Math.min(W/src.width,H/src.height);const w=Math.round(src.width*s),h=Math.round(src.height*s);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,Math.round((W-w)/2),anchor==='bottom'?H-h:Math.round((H-h)/2),w,h);return c;}
function scaleH(src,H){const s=Math.min(1,H/src.height);const c=document.createElement('canvas');c.width=Math.round(src.width*s);c.height=Math.round(src.height*s);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;}
function cols(im,n){const p=im.d.data;const s=new Array(im.w).fill(0);for(let x=0;x<im.w;x++){let t=0;for(let y=0;y<im.h;y++)if(p[(y*im.w+x)*4+3]>40)t++;s[x]=t;}
 // 空いた列で区切る→数が足りなければ、一番広い区画の中ほどの一番すいた列で割る
 let segs=[];let st=-1;for(let x=0;x<im.w;x++){if(s[x]>0&&st<0)st=x;if((s[x]===0||x===im.w-1)&&st>=0){segs.push([st,x]);st=-1;}}
 segs=segs.filter(g=>g[1]-g[0]>im.w*0.03);
 while(segs.length<n){segs.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));const [a,b]=segs.shift();const q=Math.floor((b-a)/4);let bx=a+q,bv=1e9;for(let x=a+q;x<b-q;x++)if(s[x]<bv){bv=s[x];bx=x;}segs.push([a,bx],[bx+1,b]);}
 while(segs.length>n){segs.sort((a,b)=>a[0]-b[0]);let bi=0,bg=1e9;for(let i=0;i<segs.length-1;i++){const g=segs[i+1][0]-segs[i][1];if(g<bg){bg=g;bi=i;}}segs.splice(bi,2,[segs[bi][0],segs[bi+1][1]]);}
 return segs.sort((a,b)=>a[0]-b[0]);}
`;
const run = (body) => page.eval(`(async()=>{${LIB}${body}})()`, 120000);
const save = (out, dataUrl) => { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64')); console.log(out, fs.statSync(out).size); };

if (mode === 'cut') {
  const [OUT, SIZE] = rest;
  const [W, H] = SIZE ? SIZE.split('x').map(Number) : [0, 0];
  save(OUT, await run(`const im=key(await load(${JSON.stringify(rel)}));const b=bbox(im);let c=crop(im,b,6);${W ? `c=fit(c,${W},${H},'bottom');` : ''}return c.toDataURL('image/webp',0.92);`));
} else if (mode === 'split') {
  const [HEAD, NAMES, HH] = rest; const names = NAMES.split(',');
  const urls = JSON.parse(await run(`const im=key(await load(${JSON.stringify(rel)}));const sg=cols(im,${names.length});return JSON.stringify(sg.map(g=>{const b=bbox(im,g[0],g[1]+1);return scaleH(crop(im,b,6),${+HH || 560}).toDataURL('image/webp',0.92);}));`));
  urls.forEach((u, i) => save(`${HEAD}${names[i]}.webp`, u));
} else if (mode === 'mini') {
  const [IDX, OUT] = rest;
  save(OUT, await run(`const im=key(await load(${JSON.stringify(rel)}));const sg=cols(im,5);const g=sg[${+IDX}];const b=bbox(im,g[0],g[1]+1);const c=fit(crop(im,b,6),1000,1000,'center');const d=document.createElement('canvas');d.width=d.height=1000;const x=d.getContext('2d');x.drawImage(c,60,60,880,880);return d.toDataURL('image/webp',0.92);`));
} else if (mode === 'bg') {
  const [OUT] = rest;
  save(OUT, await run(`const im=await load(${JSON.stringify(rel)});const c=document.createElement('canvas');c.width=1600;c.height=900;const x=c.getContext('2d');const s=Math.max(1600/im.w,900/im.h);x.imageSmoothingQuality='high';x.drawImage(im.c,(1600-im.w*s)/2,(900-im.h*s)/2,im.w*s,im.h*s);return c.toDataURL('image/webp',0.9);`));
}
await br.close(); await server.close(); process.exit(0);
