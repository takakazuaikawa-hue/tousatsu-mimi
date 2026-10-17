// 元の絵の一部を拡大して撮る。引数：出力 x y w h 倍率
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const [OUT, x, y, w, h, sc, IMG] = process.argv.slice(2);
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 1400, height: 788 }); const page = await br.newPage();
await page.setViewport(1400, 788);
await page.goto(`http://127.0.0.1:${server.port}/assets/characters/${IMG || 'panyu_reach.webp'}`, 8000); await sleep(500);
await page.eval(`document.body.style.margin=0;const i=document.querySelector('img');i.style.cssText='position:fixed;left:0;top:0;width:1400px;height:788px;margin:0';1`);
await sleep(200);
const r = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: +x, y: +y, width: +w, height: +h, scale: +sc } });
fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
await br.close(); await server.close(); process.exit(0);
