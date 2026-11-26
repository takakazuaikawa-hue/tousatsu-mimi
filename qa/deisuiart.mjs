// 泥酔の途中の場面の絵が出るかを確かめる。node qa/deisuiart.mjs [相手id]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'selina';
const O = 'qa/out/deisuitest'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
for (const w of [1, 2]) {
  await page.eval(`(() => { showStoryScene('dmid${w}_${id}', () => {}); return 1; })()`);
  await sleep(3500);
  console.log('dmid' + w, await page.eval(`JSON.stringify([...document.querySelectorAll('.story-overlay img')].map(i => [i.getAttribute('src'), i.naturalWidth]))`), await page.eval(`window.MimiVoice ? 'voice ok' : 'no voice'`));
  await page.screenshot(`${O}/${id}_art${w}.png`);
  for (let k = 0; k < 12 && await page.eval(`!!document.querySelector('.story-overlay')`); k++) { await page.eval(`(() => { document.querySelector('.story-overlay')?.click(); return 1; })()`); await sleep(900); }
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
