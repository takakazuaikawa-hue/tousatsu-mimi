import { launch, sleep } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/cdp.mjs';
import { serve } from 'file:///C:/Users/takakazu/projects/mp_panyu/qa/lib/server.mjs';
const server = await serve('C:/Users/takakazu/projects/mp_panyu', 0); const br = await launch({ width: 800, height: 600 }); const page = await br.newPage();
await page.addInit(`window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message).slice(0,600)));`);
await page.goto(`http://127.0.0.1:${server.port}/docs/design-ref/panyu-mesh.html?c=${process.argv[2] || 'dress'}`, 8000); await sleep(2000);
console.log(await page.eval(`JSON.stringify(__errs)`));
await br.close(); await server.close(); process.exit(0);
