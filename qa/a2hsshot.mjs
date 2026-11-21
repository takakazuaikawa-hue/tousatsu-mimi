// 全画面の案内を撮る（11/22）。node qa/a2hsshot.mjs [iphone|android]   出力 qa/out/a2hs/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const kind = process.argv[2] || 'iphone';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/a2hs', { recursive: true });
const { page, close } = await openSession({ width: W, height: H, mobile: true, speed: 1, probes: kind === 'iphone' ? ['iphone-safari.js'] : [] });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 120));
try {
  for (let i = 0; i < 60 && !(await q('typeof render === "function" && !!document.querySelector(".title-screen")')); i++) await sleep(500);
  await sleep(3200);
  console.log('title', await q(`JSON.stringify({ modal: !!document.querySelector('.a2hs'), corner: !document.querySelector('.t3-icon.fs-corner')?.hidden, iphone: IS_IPHONE, standalone: IS_STANDALONE })`));
  await page.screenshot(`qa/out/a2hs/${kind}_${W}_title.png`);
  if (kind === 'iphone') {
    console.log('fit', await q(`(() => { const r = document.querySelector('.a2hs-inner').getBoundingClientRect(); return JSON.stringify([r.top, r.bottom, r.left, r.right].map(Math.round)); })()`));
    await q(`document.querySelector('.ios-help-close').click()`); await sleep(400);
  }
  await q(`(() => { save.introPlayed = true; save.clearedStages = ['rico_tutorial']; state.screen = 'lobby'; render(); return 1; })()`); await sleep(2500);
  console.log('home', await q(`JSON.stringify({ corner: !document.querySelector('.h15-oct.fs-corner')?.hidden })`));
  await page.screenshot(`qa/out/a2hs/${kind}_${W}_home.png`);
} finally { await close(); }
