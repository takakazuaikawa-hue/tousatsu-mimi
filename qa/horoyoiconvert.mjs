// ほろ酔いの夜の絵をゲーム用に変換する（2026-11-08）。
//  node qa/horoyoiconvert.mjs cg <key_n> ...       qa/out/horoyoi_cg/<key_n>.png → assets/backgrounds/horoyoi/<key_n>.jpg（1600x900）＋ thumb/<key_n>.webp（480x270）
//  node qa/horoyoiconvert.mjs face <key> <n> ...    qa/out/horoyoi_face/<key>_drunk_<n>.png（白地）→ assets/characters/<key>_cutin_drunk[<n>].webp（1000x563・白地を外周から抜く）
//  node qa/horoyoiconvert.mjs icon <src> <out>      純緑の地の金のアイコン → 192x192 webp（緑を抜いて縁の緑かぶりを消す）
import fs from 'node:fs';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [mode, ...rest] = process.argv.slice(2);
const server = await serve(process.cwd(), 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/README.md`, 8000).catch(() => {});
const save = (out, d) => { fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(out, fs.statSync(out).size); };
const LOAD = `const ld=async s=>{const i=new Image();i.src='/'+s;await i.decode();return i;};`;
if (mode === 'cg') {
  fs.mkdirSync('assets/backgrounds/horoyoi/thumb', { recursive: true });
  for (const name of rest) {
    const r = await page.eval(`(async()=>{${LOAD}const i=await ld(${JSON.stringify(`qa/out/horoyoi_cg/${name}.png`)});const out=[];for(const [W,H,t,q] of [[1600,900,'image/jpeg',0.86],[480,270,'image/webp',0.8]]){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';const s=Math.max(W/i.width,H/i.height);const w=i.width*s,h=i.height*s;g.drawImage(i,(W-w)/2,(H-h)/2,w,h);out.push(c.toDataURL(t,q));}return JSON.stringify(out);})()`, 60000);
    const [jpg, webp] = JSON.parse(r);
    save(`assets/backgrounds/horoyoi/${name}.jpg`, jpg); save(`assets/backgrounds/horoyoi/thumb/${name}.webp`, webp);
  }
} else if (mode === 'face') {
  for (let k = 0; k < rest.length; k += 2) {
    const [key, n] = [rest[k], rest[k + 1]];
    // 外周につながった「白っぽい」画素だけを抜く（服や肌の中の白は残る）。縁は白さに応じて半透明にし、白の混ざりを割り戻す
    const d = await page.eval(`(async()=>{${LOAD}const i=await ld(${JSON.stringify(`qa/out/horoyoi_face/${key}_drunk_${n}.png`)});
      const W=1000,H=Math.round(1000*i.height/i.width);const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,0,0,W,H);
      const im=g.getImageData(0,0,W,H),p=im.data;const wh=q=>{const r=p[q],gg=p[q+1],b=p[q+2];return Math.min(r,gg,b)>=232&&Math.max(r,gg,b)-Math.min(r,gg,b)<=14;};
      const seen=new Uint8Array(W*H);const st=[];for(let x=0;x<W;x++){st.push(x,(H-1)*W+x);}for(let y=0;y<H;y++){st.push(y*W,y*W+W-1);}
      while(st.length){const v=st.pop();if(seen[v])continue;if(!wh(v*4))continue;seen[v]=1;const x=v%W,y=(v-x)/W;if(x>0)st.push(v-1);if(x<W-1)st.push(v+1);if(y>0)st.push(v-W);if(y<H-1)st.push(v+W);}
      for(let v=0;v<W*H;v++){if(seen[v]){p[v*4+3]=0;continue;}const x=v%W,y=(v-x)/W;let nb=0;for(const dv of [-1,1,-W,W]){const u=v+dv;if(u>=0&&u<W*H&&seen[u])nb++;}
        if(nb){const q=v*4,m=Math.min(p[q],p[q+1],p[q+2]);const a=Math.max(0.35,Math.min(1,(255-m)/60));p[q+3]=Math.round(a*255);for(let ch=0;ch<3;ch++)p[q+ch]=Math.max(0,Math.min(255,Math.round((p[q+ch]-255*(1-a))/a)));}}
      g.putImageData(im,0,0);return c.toDataURL('image/webp',0.9);})()`, 120000);
    save(`assets/characters/${key}_cutin_drunk${n === '1' ? '' : n}.webp`, d);
  }
} else if (mode === 'green') {
  // 純緑の地で描き直させた酔い顔（<key>_drunk_<n>_green.png）を抜く：緑らしさで透明度を決め、縁の緑かぶりを消す（キー→割り戻し→デスピル）
  for (let k = 0; k < rest.length; k += 2) {
    const [key, n] = [rest[k], rest[k + 1]];
    const d = await page.eval(`(async()=>{${LOAD}const i=await ld(${JSON.stringify(`qa/out/horoyoi_face/${key}_drunk_${n}_green.png`)});
      const W=1000,H=Math.round(1000*i.height/i.width);const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,0,0,W,H);
      const im=g.getImageData(0,0,W,H),p=im.data;
      for(let q=0;q<p.length;q+=4){const r=p[q],gg=p[q+1],b=p[q+2];const k2=gg-Math.max(r,b);
        let a=k2>=110?0:k2<=25?1:1-(k2-25)/85; if(a<1){ // 割り戻し：緑(0,255,0)との混ざりを外す
          if(a<=0.02){p[q+3]=0;continue;} p[q]=Math.min(255,r/a); p[q+1]=Math.max(0,Math.min(255,(gg-255*(1-a))/a)); p[q+2]=Math.min(255,b/a); }
        // デスピル：緑が赤と青の大きい方を超えないように
        const m=Math.max(p[q],p[q+2]); if(p[q+1]>m) p[q+1]=m; p[q+3]=Math.round(a*255);}
      g.putImageData(im,0,0);return c.toDataURL('image/webp',0.9);})()`, 120000);
    save(`assets/characters/${key}_cutin_drunk${n === '1' ? '' : n}.webp`, d);
  }
} else if (mode === 'greenfile') {
  // 任意の純緑地の絵を抜く：greenfile <src> <out.webp> <幅>
  const [src, out, Wd] = rest;
  const d = await page.eval(`(async()=>{${LOAD}const i=await ld(${JSON.stringify(src)});const W=${+Wd || 1000},H=Math.round(W*i.height/i.width);const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(i,0,0,W,H);
    const im=g.getImageData(0,0,W,H),p=im.data;for(let q=0;q<p.length;q+=4){const r=p[q],gg=p[q+1],b=p[q+2];const k2=gg-Math.max(r,b);let a=k2>=110?0:k2<=25?1:1-(k2-25)/85;if(a<1){if(a<=0.02){p[q+3]=0;continue;}p[q]=Math.min(255,r/a);p[q+1]=Math.max(0,Math.min(255,(gg-255*(1-a))/a));p[q+2]=Math.min(255,b/a);}const m=Math.max(p[q],p[q+2]);if(p[q+1]>m)p[q+1]=m;p[q+3]=Math.round(a*255);}
    g.putImageData(im,0,0);return c.toDataURL('image/webp',0.9);})()`, 120000);
  save(out, d);
} else if (mode === 'icon') {
  const [src, out] = rest;
  const d = await page.eval(`(async()=>{${LOAD}const i=await ld(${JSON.stringify(src)});const S=192;const c=document.createElement('canvas');c.width=S;c.height=S;const g=c.getContext('2d');g.imageSmoothingQuality='high';
    const s=Math.min(S/i.width,S/i.height);g.drawImage(i,(S-i.width*s)/2,(S-i.height*s)/2,i.width*s,i.height*s);const im=g.getImageData(0,0,S,S),p=im.data;
    for(let q=0;q<p.length;q+=4){const r=p[q],gg=p[q+1],b=p[q+2];const k=gg-Math.max(r,b);if(k>60){p[q+3]=0;continue;}if(k>8){const a=1-(k-8)/52;p[q+3]=Math.round(p[q+3]*a);p[q+1]=Math.max(r,b);}}
    g.putImageData(im,0,0);return c.toDataURL('image/webp',0.92);})()`, 60000);
  save(out, d);
}
await br.close(); await server.close(); process.exit(0);
