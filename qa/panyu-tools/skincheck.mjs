// 肌と胸のラインの検査。衣装ごとに、留めを0〜3個外した状態と、揺らしている途中を撮り、胸元の範囲で数える。
//  ・肌色はずれ：肌らしい画素のうち、この絵の素肌（外す前の胸の上の肌）から色味が外れている割合（灰色・くすみ・緑がかり・赤すぎ）
//  ・継ぎ目：肌の中（縁から離れた所）で急に明るさが変わる画素が、外す前よりどれだけ増えたか（段差・すじ・四角い跡）
//  ・ラインの角：胸の下の輪郭（肌と下の境目）を列ごとにたどり、急に折れ曲がる所の数
// 問題の画素を赤・青で塗った写真も書き出す。引数：衣装名 出力の頭
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OF, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800); await page.goto('about:blank', 1);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}`, 8000); await sleep(5000);
const xf = `const V=__panyuDbg.view(),s=V.s,ox=V.ox,oy=V.oy;`;   // 画面の今の写し方（寄りが動いている途中でも押す所がずれない）
const tap = (ix, iy) => page.eval(`(()=>{const st=document.getElementById('stage');${xf}const q=[ox+${ix}*s,oy+${iy}*s];st.dispatchEvent(new PointerEvent('pointerdown',{clientX:q[0],clientY:q[1],pointerId:75,bubbles:true}));st.dispatchEvent(new PointerEvent('pointerup',{clientX:q[0],clientY:q[1],pointerId:75,bubbles:true}));})()`);
const part = async (k) => JSON.parse(await page.eval(`JSON.stringify((()=>{const b=__panyuDbg.parts[${k}];return b.c||[(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2];})())`));
const cups = JSON.parse(await page.eval(`JSON.stringify(__panyuDbg.cups)`));
const F = JSON.parse(await page.eval(`JSON.stringify(__panyuDbg.focus)`));
// 調べる範囲（絵の座標）：注目点のまわりの胸元
const R = { x: F[0] - 190, y: F[1] - 130, w: 380, h: 300 };
const clip = JSON.parse(await page.eval(`(()=>{${xf}return JSON.stringify({x:ox+${R.x}*s,y:oy+${R.y}*s,width:${R.w}*s,height:${R.h}*s,scale:1.4});})()`));
const grab = async () => (await page.send('Page.captureScreenshot', { format: 'png', clip })).data;
console.error('clip', JSON.stringify(clip)); const shots = [];
shots.push(['0', await grab()]);
const lv = async () => +(await page.eval("document.getElementById('lv').textContent")).split('/')[0];
for (let k = 0; k < 3; k++) { const p = await part(k); for (let t = 0; t < 6 && await lv() <= k; t++) { await tap(p[0], p[1]); await sleep(400); } console.error('外れた数', await lv()); await sleep(4100); shots.push([String(k + 1), await grab()]); }
// 揺らしている途中（全部外した後、左右の胸を3回ずつ）
for (const c of cups) for (let i = 0; i < 3; i++) { await tap(c[0], c[1] + 20); await sleep(80); }
await sleep(120); shots.push(['3揺れ', await grab()]);
await sleep(200); shots.push(['3揺れ2', await grab()]);

// 解析は別の白紙のページで（絵を読み込んで画素を数える）
shots.forEach(sh=>fs.writeFileSync(OUT+'-raw-'+sh[0]+'.png',Buffer.from(sh[1],'base64'))); if(process.env.RAWONLY){await br.close();await server.close();process.exit(0);} console.error('shots ok', shots.map(s => s[1].length)); const an = await br.newPage(); await an.goto('about:blank', 1);
const t0 = Date.now(); const res = JSON.parse(await an.eval(`(async()=>{
  const shots=${JSON.stringify(shots)};
  const load=b=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+b;});
  const imgs=await Promise.all(shots.map(s=>load(s[1])));const W=imgs[0].width,H=imgs[0].height;
  const px=im=>{const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.drawImage(im,0,0);return g.getImageData(0,0,W,H).data;};
  const D=imgs.map(px);
  const lum=(d,k)=>0.3*d[k]+0.59*d[k+1]+0.11*d[k+2];
  // 肌らしさ（ゆるく）：赤>緑>青、明るめ
  const skinish=(d,k)=>{const r=d[k],g=d[k+1],b=d[k+2];return r>120&&r>=g&&g>=b-6&&r-b>18&&r-g<110;};
  // この絵の素肌の色味：外す前の画像で、胸の上半分の肌らしい画素
  let n=0,mu=[0,0],m2=[0,0],ml=0;const d0=D[0];
  for(let y=0;y<H*0.45;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;if(!skinish(d0,k))continue;const s=d0[k]+d0[k+1]+d0[k+2];const c=[d0[k]/s,d0[k+1]/s];mu[0]+=c[0];mu[1]+=c[1];m2[0]+=c[0]*c[0];m2[1]+=c[1]*c[1];ml+=lum(d0,k);n++;}
  mu=mu.map(v=>v/n);const sd=m2.map((v,i)=>Math.sqrt(Math.max(1e-8,v/n-mu[i]*mu[i])));
  const out=[];const pics=[];
  // 外す前の継ぎ目の数（もともとの線画・つやの分）
  const seamCount=(d)=>{const S=new Int32Array((W+1)*(H+1));for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=skinish(d,(y*W+x)*4)?1:0;S[(y+1)*(W+1)+x+1]=S[y*(W+1)+x+1]+row;}}
    const box=(x0,y0,x1,y1)=>S[y1*(W+1)+x1]-S[y0*(W+1)+x1]-S[y1*(W+1)+x0]+S[y0*(W+1)+x0];const r=8;
    let c=0;const mask=new Uint8Array(W*H);for(let y=Math.max(r+1,Math.floor(H*0.28));y<H-r-1;y++)for(let x=r+1;x<W-r-1;x++){if(box(x-r,y-r,x+r+1,y+r+1)<(2*r+1)*(2*r+1))continue;const k=(y*W+x)*4;const gx=lum(d,k+8)-lum(d,k-8),gy=lum(d,k+W*8)-lum(d,k-W*8);if(Math.hypot(gx,gy)>34){c++;mask[y*W+x]=1;}}return [c,mask];};
  const [base0]=seamCount(D[0]);
  // 胸の下の輪郭：列ごとに、上から見て「肌が続いた後に、肌でない（布）か暗い溝」に変わる最初の位置
  const lineKinks=(d)=>{const ys=[];for(let x=Math.floor(W*0.08);x<W*0.92;x+=2){let run=0,yy=-1;for(let y=Math.floor(H*0.3);y<H-2;y++){const k=(y*W+x)*4;if(skinish(d,k)){run++;}else{if(run>12){yy=y;break;}run=0;}}ys.push(yy);}
    let k=0;for(let i=2;i<ys.length-2;i++){if(ys[i]<0||ys[i-2]<0||ys[i+2]<0)continue;const a=ys[i]-ys[i-2],b=ys[i+2]-ys[i];if(Math.abs(b-a)>9&&Math.abs(a)<14&&Math.abs(b)<14)k++;}return k;};
  const kink0=lineKinks(D[0]);
  shots.forEach((s,i)=>{const d=D[i];let sk=0,off=0;const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.drawImage(imgs[i],0,0);const od=g.getImageData(0,0,W,H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;if(!skinish(d,k))continue;const L=lum(d,k);if(L<95)continue;sk++;const t=d[k]+d[k+1]+d[k+2];const z=Math.max(Math.abs(d[k]/t-mu[0])/sd[0],Math.abs(d[k+1]/t-mu[1])/sd[1]);const sat=Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2]);
      if(z>4.5||(sat<22&&L>120&&L<205)){off++;od.data[k]=40;od.data[k+1]=90;od.data[k+2]=255;}}
    const [sc,mask]=seamCount(d);for(let j=0;j<W*H;j++)if(mask[j]){od.data[j*4]=255;od.data[j*4+1]=0;od.data[j*4+2]=0;}
    g.putImageData(od,0,0);pics.push(c.toDataURL('image/png'));
    out.push({状態:s[0],肌色はずれ:(100*off/Math.max(1,sk)).toFixed(2)+'%',継ぎ目の増え:sc-base0,ラインの角:lineKinks(d)-kink0});});
  return JSON.stringify({out,pics});})()`, 300000));
console.error('analysis ms', Date.now() - t0); res.pics.forEach((p, i) => fs.writeFileSync(`${OUT}-${shots[i][0]}.png`, Buffer.from(p.split(',')[1], 'base64')));
console.log(OF); console.table(res.out);
await br.close(); await server.close(); process.exit(0);
