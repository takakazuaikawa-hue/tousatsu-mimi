// タイトル画面を本編で撮る：初めての人・続きからの人・スマホ横持ち。
// 背景の光は CSS（.t3-lights）で動くので、動画の差し替えは要らない（2026-10 に光だけのループ動画をやめた）。
// node qa/titleshots.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [outDir = 'qa/out/title'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const ONLY = process.argv[3];
const cases = [
  { name: 'new', save: null, w: 1280, h: 800 },
  { name: 'return', save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, coins: 1200, ownedItems: [] }, w: 1280, h: 800 },
  { name: 'ending', save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingUnlocked: true, introPlayed: true, coins: 5400, ownedItems: [] }, w: 1280, h: 800 },
  { name: 'phone', save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, coins: 1200, ownedItems: [] }, w: 844, h: 390, mobile: true },
];
for (const c of cases.filter(c => !ONLY || c.name === ONLY)) {
  const s = await openSession({ width: c.w, height: c.h, mobile: !!c.mobile, speed: 1, save: c.save, probes: [] });
  // 読み込み画面 → タイトルの出方（約2.3秒）が終わるまで待つ
  for (let i = 0; i < 60; i++) { if (await s.page.eval(`!!document.querySelector('.title-screen') && !document.getElementById('preload-overlay')`)) break; await sleep(250); }
  await sleep(3200);
  const info = await s.page.eval(`(() => { const v = document.querySelector('.t3-motion'); const bar = document.querySelector('.t3-utils .audio-bar');
    return JSON.stringify({ intro: document.querySelector('.title-screen').classList.contains('t3-intro'), video: v ? (v.classList.contains('is-playing') ? 'playing' : 'waiting') : 'none', bar: !!bar, btns: [...document.querySelectorAll('.t3-btn')].map(b => b.textContent.trim()), record: (document.querySelector('.t3-record') || {}).textContent, errors: window.__QA.errors.length }); })()`);
  console.log(c.name, info);
  await s.page.screenshot(path.join(outDir, `title_${c.name}.png`));
  await s.close();
}
