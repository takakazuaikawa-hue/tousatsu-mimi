// 勝ち抜き戦の説明画面を撮る（11/22 作り直し）。QA_SIZE=844x390 node qa/knwinshot.mjs   出力 qa/out/knwin/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/knwin', { recursive: true });
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SAVE = { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000 };
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, save: SAVE });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
const STD = stdCheck({ minText: 14, bodyMin: 14 });
try {
  for (let i = 0; i < 200 && !(await q('typeof knOpenWindow==="function" && !document.querySelector(".loading-screen:not(.hidden), #loading:not(.done)")')); i++) await sleep(200); await sleep(1500);
  await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(2500);
  await q('knOpenWindow()'); await sleep(2200);
  await page.screenshot(`qa/out/knwin/${W}_fresh.png`);
  console.log('fresh', JSON.stringify(await page.eval(STD)).slice(0, 600));
  console.log('fit', await q(`(() => { const r = document.querySelector('.knp').getBoundingClientRect(); const o = [...document.querySelectorAll('.knp *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.bottom > r.bottom + 1 || b.left < r.left - 1); }).map(e => e.className).slice(0, 8); return JSON.stringify({ card: [r.top, r.bottom, r.left, r.right].map(Math.round), vh: innerHeight, out: o, scroll: document.querySelector('.knp').scrollHeight - document.querySelector('.knp').clientHeight }); })()`));
  await q(`(() => { save.kachinuki = Object.assign(save.kachinuki || {}, { best: { lap: 1, idx: 7, wins: 6 }, totalWins: 14, runs: 5, run: { lap: 1, idx: 6, chips: 2350, wins: 6, coins: 600, rec: [] } }); document.querySelectorAll('.kn-ov').forEach(e => e.remove()); knOpenWindow(); return 1; })()`); await sleep(2200);
  await page.screenshot(`qa/out/knwin/${W}_resume.png`);
  console.log('resume', JSON.stringify(await page.eval(STD)).slice(0, 600));
} finally { await close(); }
