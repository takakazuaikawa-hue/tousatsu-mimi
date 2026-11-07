// まとめてダウンロード（offline.js / sw.js）の検査。リポジトリ直下に offline-files.json を置いてから実行する
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/packshot.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const OUT = path.resolve(process.argv[2] || 'qa/out/packshot');
fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
const ev = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 200));
let shown = false;
for (let i = 0; i < 80; i++) { if (await ev('!!document.querySelector(".pack-modal")')) { shown = true; break; } await sleep(500); }
console.log('prompt shown', shown);
await sleep(400);
await page.screenshot(path.join(OUT, '01_prompt.png'));
console.log('sw', await ev('navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))'));
console.log('overflow', await ev(`(() => { const m = document.querySelector('.pack-modal'); if (!m) return 'none'; const r = m.getBoundingClientRect(); return JSON.stringify({ r: [r.left|0, r.top|0, r.right|0, r.bottom|0], scrollOverflow: m.scrollHeight > m.clientHeight + 1 }); })()`));
console.log('text', await ev('document.querySelector(".pack-modal")?.innerText'));
if (process.argv[3] === 'download') {
  await ev('document.querySelector("[data-pack=download]").click()');
  for (let i = 0; i < 60; i++) { await sleep(1000); const s = await ev('MimiPack.status().then(s=>JSON.stringify({d:s.downloaded,run:s.running,c:s.count,b:s.bytes}))'); if (i % 5 === 0) console.log(s); if (/"d":true/.test(s)) break; }
  await page.screenshot(path.join(OUT, '02_done.png'));
  console.log('label', await ev('MimiPack.stateLabel()'));
  console.log('cache keys', await ev('caches.open("mimi-pack-v1").then(c=>c.keys()).then(k=>k.length)'));
  console.log('offline-fetch via SW', await ev('fetch("assets/manifest.js").then(r=>r.status)'));
  await ev('MimiPack.clear()'); await sleep(800);
  console.log('after clear', await ev('MimiPack.stateLabel()'));
}
const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
console.log('errors', JSON.stringify(errors).slice(0, 800), 'exceptions', JSON.stringify(session.exceptions).slice(0, 800));
await session.close();
