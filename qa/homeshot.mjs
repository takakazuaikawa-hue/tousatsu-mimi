// ホームを撮る（11/23 今夜の演目のずれ・名前の切れの確認）。QA_ROOT=別の置き場 で古い版も撮れる
// QA_SIZE=844x390 OUT=qa/out/home_x.png node qa/homeshot.mjs
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, coins: 30000 } });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message);
try {
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(3000); await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(9000);
  await page.screenshot(process.env.OUT || 'qa/out/home_x.png');
  console.log(await q(`JSON.stringify([...document.querySelectorAll('.h15-goal .h15-lbl, .h15-goal .h15-prize, .h15-frame .h15-name, .h15-frame .h15-sub, .h15-ticket *')].filter(e => e.offsetParent && e.textContent.trim()).slice(0, 8).map(e => { const r = e.getBoundingClientRect(); return [e.className, e.textContent.trim().slice(0, 12), Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right), e.scrollWidth > e.clientWidth + 1 ? 'OVERFLOW' : '']; }))`));
} finally { await close(); }
