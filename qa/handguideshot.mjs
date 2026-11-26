// 役の早見表（研修の解説つき）を撮る。node qa/handguideshot.mjs [幅] [高さ] [lesson]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800), lesson = process.argv[4] === 'lesson';
const out = 'qa/out/handguide'; fs.mkdirSync(out, { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
await ev(lesson ? `showHandGuide({ lesson: true, onDone: () => { window.__lessonDone = 1; } })` : `showHandGuide()`);
await sleep(900);
const tag = `${W}x${H}${lesson ? '_lesson' : ''}`;
await page.screenshot(`${out}/${tag}_0.png`);
if (lesson) for (let k = 1; k <= 3; k++) {
  await ev(`const n=document.querySelector('.hg-lesson'); if(n) n.click(); else document.querySelector('.hand-guide-overlay')?.click()`);
  await sleep(900);
  await page.screenshot(`${out}/${tag}_${k}.png`);
  console.log(k, await page.eval(`JSON.stringify({ open: !!document.querySelector('.hand-guide-overlay'), done: !!window.__lessonDone, txt: (document.querySelector('.hg-lesson')||{}).innerText||'' })`));
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
