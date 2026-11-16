// 研修1ハンド目：「役の一覧」を光らせた後に押すと解説つきの早見表が開き、閉じると続きへ進むか。node qa/introguide.mjs [幅] [高さ]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390);
fs.mkdirSync('qa/out/introguide', { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const coach = () => page.eval(`(document.querySelector('.coach-layer .coach-text')||{}).textContent||''`);
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
await ev(`state = defaultState(); state.screen = 'lobby'; render(); beginIntroHand()`);
let saw = false;
for (let k = 0; k < 40; k++) {
  await sleep(900);
  const c = await coach();
  if (/押してみて/.test(c)) { saw = true; break; }
  await ev(`const l=document.querySelector('.coach-layer.is-tap'); if(l) l.click(); const g=document.querySelector('.is-intro-go'); if(!l && g) g.click()`);
}
console.log('光らせた:', saw);
await page.screenshot(`qa/out/introguide/${W}_a.png`);
await ev(`document.querySelector('.v2-help-btn').click()`);
await sleep(900);
console.log('解説つき:', await page.eval(`!!document.querySelector('.hand-guide-overlay.is-lesson')`));
await page.screenshot(`qa/out/introguide/${W}_b.png`);
for (let k = 0; k < 3; k++) { await ev(`document.querySelector('.hand-guide-overlay')?.click()`); await sleep(700); }
await sleep(800);
console.log('閉じた:', await page.eval(`!document.querySelector('.hand-guide-overlay')`), '次の一言:', await coach());
await page.screenshot(`qa/out/introguide/${W}_c.png`);
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
