// 顔の中心（絵のどこを窓に出すか）を、透明でない所の重心から出す補助
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: 800, height: 400 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/qa/h4mise/app.html`, 20000);
  const names = ['polka','rico','grano','selina','velvet'].flatMap(p=>['drunk','drunk2','smug','panic','bawl'].map(k=>p+'_cutin_'+k)).concat(['velvet_cutin_smirk_hide']);
  const r = await page.eval(`(async()=>{const out={};for(const n of ${JSON.stringify(names)}){const im=new Image();im.src='/assets/characters/'+n+'.webp';try{await im.decode()}catch(e){continue}
   const c=document.createElement('canvas');c.width=250;c.height=141;const g=c.getContext('2d');g.drawImage(im,0,0,250,141);const d=g.getImageData(0,0,250,141).data;
   let sx=0,n2=0,minx=999,maxx=0;for(let y=0;y<85;y++)for(let x=0;x<250;x++){if(d[(y*250+x)*4+3]>128){sx+=x;n2++;if(x<minx)minx=x;if(x>maxx)maxx=x;}}
   out[n]=[Math.round(sx/n2*4),minx*4,maxx*4];}return out})()`);
  console.log(JSON.stringify(r));
} catch (e) { console.error(e); }
await browser.close(); await server.close(); process.exit(0);
