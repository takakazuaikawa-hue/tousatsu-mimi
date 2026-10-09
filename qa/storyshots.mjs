// 第1話の導入（物語の場面）を撮る：新しいセーブでタイトル →「はじめる」→ 黒地のモノローグ → 転生の光と女神の声 → 扉絵と題字 → 会話 → 研修の卓。
// 場面ごとに1枚ずつ撮り、例外が無いかも見る。
// node qa/storyshots.mjs [outDir] [幅x高さ] [mobile]
//   例：node qa/storyshots.mjs qa/out/story 1280x800
//       node qa/storyshots.mjs qa/out/story_sp 844x390 mobile
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [outDir = 'qa/out/story', size = '1280x800', mob = ''] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
fs.mkdirSync(outDir, { recursive: true });
const { page, close, exceptions } = await openSession({ width: W, height: H, mobile: !!mob, speed: 1, save: null, clear: true });
const shot = async (name) => {
  const r = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(r.data, 'base64'));
};
const click = () => page.eval(`(() => { const o = document.querySelector('.story-overlay'); if (o) o.click(); return !!o; })()`);
const info = () => page.eval(`(() => { const o = document.querySelector('.story-overlay'); if (!o) return JSON.stringify({ gone: true, screen: state.screen });
  const t = o.querySelector(o.classList.contains('is-voice') ? '.story-voice-text' : '.story-text'); const fs = parseFloat(getComputedStyle(t).fontSize); const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale')) || 1;
  return JSON.stringify({ cls: o.className, text: t.textContent, textPx: +(fs * k).toFixed(1) }); })()`);

for (let i = 0; i < 80; i++) { if (await page.eval(`!!document.querySelector('[data-action="start"]')`)) break; await sleep(500); }
await sleep(2500);
await shot('00_title');
await page.eval(`(() => { document.querySelector('[data-action="start"]').click(); return 1; })()`);
await sleep(1800);
const log = [];
let n = 1;
for (let guard = 0; guard < 40; guard++) {
  const st = JSON.parse(await info());
  if (st.gone) break;
  const tag = /is-voice/.test(st.cls) ? 'voice' : /is-mono/.test(st.cls) ? 'mono' : /is-title/.test(st.cls) ? 'title' : 'talk';
  await sleep(tag === 'title' ? 3000 : tag === 'voice' ? 2600 : tag === 'mono' ? 300 : 1400);
  const st2 = JSON.parse(await info());
  log.push({ n, tag, text: st2.text, textPx: st2.textPx });
  await shot(`${String(n).padStart(2, '0')}_${tag}`);
  n++;
  await click();
  await sleep(tag === 'mono' ? 1300 : 700);
}
await sleep(2500);
await shot(`${String(n).padStart(2, '0')}_table`);
const errs = await page.eval('JSON.stringify(window.__QA.errors)');
console.log(JSON.stringify(log, null, 1));
console.log('screen', await page.eval('state.screen'), 'errors', errs, 'exceptions', exceptions.length);
await close();
