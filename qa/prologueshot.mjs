// 第1話の始まり（rico_tutorial の場面）と題字の画面を1歩ずつ撮る。node qa/prologueshot.mjs [幅] [高さ]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800);
const out = `qa/out/prologue/${W}x${H}`; fs.mkdirSync(out, { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
await ev(`save.soundHintSeen = true; showStoryScene('rico_tutorial', () => { window.__done = 1; }, true)`);
for (let k = 0; k < 22; k++) {
  await sleep(k === 0 ? 1800 : 2600);
  await page.screenshot(`${out}/s${String(k).padStart(2, '0')}.png`);
  const txt = await page.eval(`(()=>{const o=document.querySelector('.story-overlay');return o?o.className+' | '+o.innerText.replace(/\s+/g,' ').slice(0,90):'(終わり)'})()`);
  console.log(k, txt);
  if (txt === '(終わり)') break;
  await ev(`const o=document.querySelector('.story-overlay'); if(o) o.click()`);
}
// 第1話の題字の画面（扉絵）
await ev(`document.querySelectorAll('.story-overlay').forEach(e=>e.remove()); showEpisodeTitle('rico_tutorial', () => {}, null)`);
await sleep(2000); await page.screenshot(`${out}/ep_brief.png`);
await ev(`document.querySelector('.episode-more').click()`);
await sleep(1200); await page.screenshot(`${out}/ep_full.png`);
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
