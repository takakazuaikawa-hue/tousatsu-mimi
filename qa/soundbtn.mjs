// 幕間・物語の場面に付けた音のボタンを撮る（押して小窓も）。QA_SIZE=844x390 node qa/soundbtn.mjs
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OUT = path.resolve(`qa/out/soundbtn/${W}x${H}`); fs.mkdirSync(OUT, { recursive: true });
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, bgmOn: false } });
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } return true; })()`);
const box = (sel) => page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return '-'; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); })()`);
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof showIntermission === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await ev(`showIntermission('polka', () => {}, true)`); await sleep(2500);
  console.log('幕間 音', await box('.intermission-overlay > .sound-toggle'), 'スキップ', await box('.ims-skip-btn'));
  await page.screenshot(path.join(OUT, '1_ims.png'));
  await ev(`document.querySelector('.intermission-overlay > .sound-toggle').click()`); await sleep(600);
  console.log('小窓', await box('.sound-panel'));
  await page.screenshot(path.join(OUT, '2_ims_panel.png'));
  await ev(`document.querySelector('.intermission-overlay').remove(); document.querySelectorAll('.sound-panel').forEach(e => e.remove());`); await sleep(500);
  await ev(`showStoryScene('rico_tutorial', () => {}, true)`); await sleep(2500);
  console.log('物語 音', await box('.story-overlay > .sound-toggle'), 'スキップ', await box('.story-skip'));
  await page.screenshot(path.join(OUT, '3_story.png'));
} finally { await close(); }
