// 勝ち抜き戦の記録の札（終わりの画面）と「これまでの記録」を撮る（11/22）。QA_SIZE=844x390 node qa/knrecshot.mjs  出力 qa/out/knrec/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/knrec', { recursive: true });
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SAVE = { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000 };
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, save: SAVE });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
const STD = stdCheck({ minText: 14, bodyMin: 14 });
const fit = (sel) => q(`(() => { const c = document.querySelector('${sel}'); if (!c) return 'none'; const r = c.getBoundingClientRect(); const o = [...c.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.bottom > r.bottom + 1 || b.left < r.left - 1); }).map(e => e.className || e.tagName).slice(0, 8); return JSON.stringify({ card: [r.top, r.bottom, r.left, r.right].map(Math.round), vh: innerHeight, out: o, scroll: c.scrollHeight - c.clientHeight }); })()`);
try {
  for (let i = 0; i < 200 && !(await q('typeof knShowEnd==="function"')); i++) await sleep(200);
  await sleep(3000);
  await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(2000);
  const styles = (process.env.QA_STYLES || 'crazy').split(',');
  for (const sty of styles) {
    await q(`(() => { document.querySelectorAll('.kn-ov').forEach(e => e.remove()); const st = { hands: 64, fold: 21, call: 30, check: 18, bet: 25, raise: 9, allin: 7, sd: 14, sdWin: 9, foldWin: 17, bluff: 4, bigPot: 6, maxPot: 2000, comeback: 1, fastest: 3 }; knShowEnd({ reason: 'lose', slot: KN_ORDER[5], lap: 1, idx: 6, wins: 5, coins: 600, chips: 0, newRec: true, style: ${JSON.stringify(sty)}, st }); return 1; })()`); await sleep(1800);
    await page.screenshot(`qa/out/knrec/${W}_end_${sty}.png`);
  }
  console.log('end', JSON.stringify(await page.eval(STD)).slice(0, 500));
  console.log('endfit', await fit('.knr'));
  await q(`(() => { document.querySelectorAll('.kn-ov').forEach(e => e.remove()); const S = knSave(); S.best = { lap: 2, idx: 3, wins: 13 }; S.runs = 9; S.totalWins = 41; S.styles = { clever: 3, crazy: 2, iron: 1, hunter: 3 }; S.stats = { hands: 610, fold: 180, call: 260, check: 170, bet: 210, raise: 80, allin: 44, sd: 120, sdWin: 74, foldWin: 160, bluff: 31, bigPot: 52, maxPot: 2000, comeback: 6, fastest: 2 }; S.last = { lap: 2, idx: 3, wins: 13, style: 'hunter', st: S.stats }; knShowRecord(); return 1; })()`); await sleep(1800);
  await page.screenshot(`qa/out/knrec/${W}_record.png`);
  console.log('rec', JSON.stringify(await page.eval(STD)).slice(0, 500));
  console.log('recfit', await fit('.knr'));
  await q(`(() => { document.querySelectorAll('.kn-ov').forEach(e => e.remove()); knOpenWindow(); return 1; })()`); await sleep(1800);
  await page.screenshot(`qa/out/knrec/${W}_window.png`);
  console.log('winfit', await fit('.knp'));
} finally { await close(); }
