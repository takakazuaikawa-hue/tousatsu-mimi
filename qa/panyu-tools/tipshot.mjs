// とがる衣装：tip=0 と tip=1 の胸元を撮る。引数：衣装名 出力先の頭
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const [OF, OUT] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mimi_porker', 0); const br = await launch({ width: 1280, height: 800 }); const page = await br.newPage();
await page.setViewport(1280, 800);
for (const t of [0, 0.5, 1]) {
  await page.goto('about:blank', 1);
  await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${OF}&tip=${t}`, 15000); await sleep(6000);
  console.log('err:', await page.eval(`getComputedStyle(document.getElementById('err')).display+' '+document.getElementById('err').textContent.slice(0,200)`));
  const clip = JSON.parse(await page.eval(`(()=>{const V=__panyuDbg.view(),s=V.s,F=__panyuDbg.focus;const x0=V.ox+(F[0]-200)*s,y0=V.oy+(F[1]-100)*s;return JSON.stringify({x:x0,y:y0,width:400*s,height:200*s,scale:2});})()`));
  const r = await page.send('Page.captureScreenshot', { format: 'png', clip }); fs.writeFileSync(`${OUT}-${t}.png`, Buffer.from(r.data, 'base64'));
}
await br.close(); await server.close(); process.exit(0);
