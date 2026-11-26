// 卒業の一枚絵（3回目の卒業の直後）とコレクションの札を撮る。QA_SIZE=844x390 node qa/gradscene.mjs   出力 qa/out/gradscene/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OUT = `qa/out/gradscene/${w}x${h}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: w, height: h, mobile: w < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, gradCount: 3, gradCgSeen: true } });
const { page } = session;
const chk = async (name) => { await page.screenshot(`${OUT}/${name}.png`); const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
  console.log(name, ['tiny', 'wrap', 'orphan', 'overflowBox', 'off'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k])).join(' ') || '問題なし'); };
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof showGraduationScene === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`showGraduationScene(() => { window.__gradDone = true; }); true`); await sleep(3500);
  await chk('1_scene');
  console.log('文字の箱', await page.eval(`JSON.stringify([...document.querySelectorAll('.grad-scene-overlay > div')].map(e => { const r = e.getBoundingClientRect(); return e.className + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',') + ' ' + getComputedStyle(e).fontSize; }))`));
  await page.eval(`document.querySelector('.grad-scene-overlay').click(); true`); await sleep(800);
  console.log('閉じた', await page.eval('!!window.__gradDone && !document.querySelector(".grad-scene-overlay")'));
  await page.eval(`showRewardCgViewer('graduation'); true`); await sleep(1500); await chk('2_viewer');
} finally { await session.close(); }
