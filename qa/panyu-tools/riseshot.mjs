// ずり上がり水着の進み（?tip=0〜1）を撮る。node riseshot.mjs <出力フォルダ>
import fs from 'fs';
import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mimi_porker/qa/lib/server.mjs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const server = await serve('C:/Users/takakazu/projects/mimi_porker', 0); const br = await launch({ width: 1400, height: 788 }); const page = await br.newPage();
await page.setViewport(1400, 788);
for (const k of ['rise', 'rise@stripe', 'rise@hair']) for (const t of [0, 0.5, 1]) {
  await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${encodeURIComponent(k)}&tip=${t}`, 15000); await sleep(3500);
  await page.screenshot(`${OUT}/${k.replace('@', '_')}_${t}.png`);
}
await br.close(); await server.close(); process.exit(0);
