// 題名を1句ずつ読ませる（案A）を撮る。node qa/titleread.mjs [幅] [高さ] [話のキー|all]
// 題名（ep.title）と句の表が同じ文かも確かめる（ずれていたら「ずれ」と出す）
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800), which = process.argv[4] || 'polka';
const out = `qa/out/titleread/${W}x${H}`; fs.mkdirSync(out, { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
console.log('ずれ:', await page.eval(`JSON.stringify([...Object.values(EPISODES), ...Object.values(HOROYOI_EPISODES), ...Object.values(DEISUI_EPISODES)].filter(e => titleReadMismatch(e)).map(e => e.id))`));
// 一番長い句（文字が一番小さくなる段）が枠に収まるか
const keys = which === 'all' ? ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet', 'ending'] : [which];
for (const k of keys) {
  await ev(`document.querySelectorAll('.episode-overlay').forEach(e=>e.remove()); showEpisodeTitle('${k}', () => {}, () => {})`);
  await sleep(1500);
  await page.screenshot(`${out}/${k}_1.png`);
  // 一番長い句まで進める
  const n = await page.eval(`TITLE_READ[EPISODES['${k}'].id].cl.length`);
  const longest = await page.eval(`(() => { const c = TITLE_READ[EPISODES['${k}'].id].cl; let m = 0; c.forEach((x, j) => { if ((x[0]+x[1]+x[2]).length > (c[m][0]+c[m][1]+c[m][2]).length) m = j; }); return m; })()`);
  for (let j = 0; j < longest; j++) { await ev(`document.querySelector('.tr-layer').click()`); await sleep(150); }
  await sleep(1400);
  await page.screenshot(`${out}/${k}_long.png`);
  console.log(k, '句', n, '最長', longest + 1, await page.eval(`(() => { const o = document.querySelector('.tr-one'), r = o.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect(); const fs = parseFloat(getComputedStyle(o).fontSize) * (r.width / o.offsetWidth); return JSON.stringify({ 画面上の字px: +fs.toFixed(1), 下端: Math.round(r.bottom - st.top), 舞台の高さ: Math.round(st.height) }); })()`));
  await ev(`document.querySelector('.tr-skip').click()`);
  await sleep(900);
  await page.screenshot(`${out}/${k}_end.png`);
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 300));
await session.close();
