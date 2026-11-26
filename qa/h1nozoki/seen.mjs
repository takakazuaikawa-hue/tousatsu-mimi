// 2回目からはお手本が自動で流れないこと・?reset=1 で初回に戻ること
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: 844, height: 390 });
let code = 0;
try {
  const page = await browser.newPage(); await page.setViewport(844, 390, true);
  await page.addInit(`(()=>{const S=4;const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
  const base = `http://127.0.0.1:${server.port}/qa/h1nozoki/h1nozoki.html`;
  const ph = () => page.eval('H1NOZOKI.phase');
  const until = async re => { for (let i = 0; i < 600; i++) { if (re.test(await ph())) return; await sleep(30); } throw new Error('timeout ' + re); };
  await page.goto(base + '?reset=1', 60000); await until(/^demo-card4$/);
  await page.eval(`document.querySelector('#board > .sg:last-child .pgo').click()`); await until(/^s1-/);
  await page.goto(base, 60000); await sleep(600); const p2 = await ph(); console.log('2回目の最初の画面', p2, /^s1-/.test(p2) ? 'OK' : 'NG');
  await page.goto(base + '?reset=1', 60000); await sleep(300); const p3 = await ph(); console.log('reset後', p3, /^demo/.test(p3) ? 'OK' : 'NG');
} catch (e) { console.error('FAIL', e); code = 1; }
await browser.close(); await server.close(); process.exit(code);
