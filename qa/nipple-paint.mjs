// 胸の先を描き足す（ChatGPT は断るので手で描く）。周りの肌の色を測り、乗算で乳輪・先を重ねるので元のつや・陰は残る。
// node qa/nipple-paint.mjs <元の絵> <出力png> '<spots の JSON>'
//   spots: [{ x, y, r, sq, ang, px, py }]  x,y=乳輪の中心（元の絵の座標） r=乳輪の半径 sq=縦横比（横から見るほど小さく、既定0.8）
//          ang=楕円の向き（度） px,py=先の位置を中心からずらす量（先が向く方向、r に対する割合、既定 0,0）
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
const [src, out, spotsJson] = process.argv.slice(2);
const spots = JSON.parse(spotsJson);
const dir = path.dirname(path.resolve(src));
const server = await serve(dir, 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/${path.basename(src)}`, 8000).catch(() => {});
const r = await page.eval(`(async()=>{
  const i=new Image(); i.src='/'+${JSON.stringify(path.basename(src))}; await i.decode();
  const c=document.createElement('canvas'); c.width=i.width; c.height=i.height; const g=c.getContext('2d'); g.drawImage(i,0,0);
  const ID=g.getImageData(0,0,c.width,c.height).data; const px=(x,y)=>{const o=(Math.round(y)*c.width+Math.round(x))*4; return [ID[o],ID[o+1],ID[o+2]];};
  const spots=${JSON.stringify(spots)};
  const info=[];
  for (const s of spots) {
    const sq=s.sq??0.8, ang=(s.ang??0)*Math.PI/180, R=s.r;
    // 周りの肌：半径 1.5〜2.2R の輪で、明るすぎる所（つやの白）を除いた中央値
    const vals=[]; for(let a=0;a<64;a++){ for(const k of [1.5,1.8,2.2]){ const t=a/64*Math.PI*2; const d=px(s.x+Math.cos(t)*R*k, s.y+Math.sin(t)*R*k*sq); const l=d[0]+d[1]+d[2]; if(l<700) vals.push([d[0],d[1],d[2],l]); } }
    vals.sort((p,q)=>p[3]-q[3]); const m=vals[Math.floor(vals.length/2)]||[230,170,150];
    const skin=[m[0],m[1],m[2]];
    if (s.fill) { // 先の位置にある黒い点などを、周りの肌の色で埋めてから描く
      const FR=R*0.6; for(let y=Math.floor(s.y-FR);y<=s.y+FR;y++) for(let x=Math.floor(s.x-FR);x<=s.x+FR;x++){ if(Math.hypot(x-s.x,y-s.y)>FR) continue; const o=(y*c.width+x)*4; if(Math.max(ID[o],ID[o+1],ID[o+2])<170){ g.fillStyle='rgb('+skin.join(',')+')'; g.fillRect(x,y,1,1); } } }
    // 乳輪の色：肌を少し暗く・赤みに寄せる。乗算の色＝目標/肌
    const tgtA=[skin[0]*(s.ka?.[0]??0.92), skin[1]*(s.ka?.[1]??0.76), skin[2]*(s.ka?.[2]??0.78)];
    const tgtN=[skin[0]*(s.kn?.[0]??0.85), skin[1]*(s.kn?.[1]??0.62), skin[2]*(s.kn?.[2]??0.66)];
    const mul=(t)=>t.map((v,k)=>Math.min(255,Math.round(v/skin[k]*255)));
    const mA=mul(tgtA), mN=mul(tgtN);
    if (s.cloth) { // 布越しのふくらみ：布の色のまま、下に影・上に光
      g.save(); g.translate(s.x,s.y); g.rotate(ang); g.scale(1,sq); const t=R*0.55;
      g.globalCompositeOperation='multiply'; let q=g.createRadialGradient(t*0.15,t*0.35,0,t*0.15,t*0.35,t*1.1); q.addColorStop(0,'rgba(120,90,90,0.55)'); q.addColorStop(0.6,'rgba(150,120,120,0.3)'); q.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=q; g.beginPath(); g.arc(t*0.15,t*0.35,t*1.1,0,Math.PI*2); g.fill();
      g.globalCompositeOperation='screen'; q=g.createRadialGradient(-t*0.2,-t*0.3,0,-t*0.2,-t*0.3,t*0.8); q.addColorStop(0,'rgba(255,245,240,0.75)'); q.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=q; g.beginPath(); g.arc(-t*0.2,-t*0.3,t*0.8,0,Math.PI*2); g.fill();
      g.restore(); info.push({cloth:true}); continue; }
    g.save(); g.translate(s.x,s.y); g.rotate(ang); g.scale(1,sq);
    g.globalCompositeOperation='multiply';
    let gr=g.createRadialGradient(0,0,0,0,0,R);
    gr.addColorStop(0,'rgba('+mA+',1)'); gr.addColorStop(0.62,'rgba('+mA+',0.95)'); gr.addColorStop(0.86,'rgba('+mA+',0.45)'); gr.addColorStop(1,'rgba('+mA+',0)');
    g.fillStyle=gr; g.beginPath(); g.arc(0,0,R,0,Math.PI*2); g.fill();
    // 先：少しずらした小さな丸。下側を濃く（立体）
    const nx=(s.px??0)*R, ny=(s.py??0)*R, nr=R*(s.nr??0.42);
    gr=g.createRadialGradient(nx-nr*0.25,ny-nr*0.3,nr*0.1,nx,ny,nr);
    gr.addColorStop(0,'rgba('+mN+',0.75)'); gr.addColorStop(0.7,'rgba('+mN+',1)'); gr.addColorStop(1,'rgba('+mN+',0)');
    g.fillStyle=gr; g.beginPath(); g.arc(nx,ny,nr,0,Math.PI*2); g.fill();
    // 先の下の影
    gr=g.createRadialGradient(nx+nr*0.2,ny+nr*0.55,0,nx+nr*0.2,ny+nr*0.55,nr*0.9);
    gr.addColorStop(0,'rgba('+mN.map(v=>Math.round(v*0.85))+',0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(nx+nr*0.2,ny+nr*0.55,nr*0.9,0,Math.PI*2); g.fill();
    // つやの点（左上）
    g.globalCompositeOperation='screen';
    gr=g.createRadialGradient(nx-nr*0.35,ny-nr*0.4,0,nx-nr*0.35,ny-nr*0.4,nr*0.42);
    gr.addColorStop(0,'rgba(255,240,235,0.85)'); gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(nx-nr*0.35,ny-nr*0.4,nr*0.42,0,Math.PI*2); g.fill();
    g.restore();
    info.push({skin, mA, mN});
  }
  // 金の鎖・飾り・服（肌でない色）の上には塗らない：元の画素に戻す
  const NEW=g.getImageData(0,0,c.width,c.height);
  const isSkin=(r,gg,b)=>{ const mx=Math.max(r,gg,b), mn=Math.min(r,gg,b); if(mx<90) return false; const sat=(mx-mn)/mx; if(sat<0.18) return true; let h=0; if(mx===r) h=((gg-b)/(mx-mn))*60; else if(mx===gg) h=(2+(b-r)/(mx-mn))*60; else h=(4+(r-gg)/(mx-mn))*60; if(h<0) h+=360; if(h>=28&&h<=70&&sat>0.35) return false; if(h>70&&h<330&&sat>0.25) return false; return true; };
  for (const s of spots) { if (s.cloth) continue; const R=s.r*1.1; for(let y=Math.floor(s.y-R);y<=s.y+R;y++) for(let x=Math.floor(s.x-R);x<=s.x+R;x++){ const o=(y*c.width+x)*4; if((s.maskY!=null&&y<s.maskY)||(!s.fill&&!isSkin(ID[o],ID[o+1],ID[o+2]))){ NEW.data[o]=ID[o]; NEW.data[o+1]=ID[o+1]; NEW.data[o+2]=ID[o+2]; } } }
  g.putImageData(NEW,0,0);
  return JSON.stringify({ png: c.toDataURL('image/jpeg', 0.93), info });
})()`, 60000);
const res = JSON.parse(r);
fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info));
await br.close(); await server.close(); process.exit(0);
