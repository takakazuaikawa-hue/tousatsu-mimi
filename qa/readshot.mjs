// 本編の卓で読み合い（battles/）を開いて撮る。node qa/readshot.mjs <opponentId> <psych|logic> [width height] [out]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [opp = 'selina', group = 'logic', W = 1280, H = 800, out = 'qa/out/readshot'] = process.argv.slice(2);
const { page, close } = await openSession({ width: +W, height: +H, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500 } });
await sleep(2500);
await page.eval(`(async () => { startBattle(${JSON.stringify(opp)}); })()`);
await sleep(2500);
// 対戦開始の確認や演出を進めてからハンドを始める
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
await sleep(3200);
await page.screenshot(path.resolve(out + `_${opp}_${group}_${W}a.png`));
// 少し遊んで結果まで
for (let i = 0; i < 160; i++) {
  const done = await page.eval(`!!document.querySelector('.read-battle-host .mb-result, .read-battle-host [class*="result"] button')`);
  if (done) break;
  await page.eval(`(() => { const h = document.querySelector('.read-battle-host'); if (!h) return; const v = [...h.querySelectorAll('*')].filter(e => (e.tagName === 'BUTTON' || getComputedStyle(e).cursor === 'pointer') && !e.disabled && e.getBoundingClientRect().width > 4); const bt = v.filter(e => e.tagName === 'BUTTON'); const pool = bt.length && Math.random() < .5 ? bt : v; const e = pool[Math.floor(Math.random() * pool.length)]; if (e) e.click(); })()`);
  await sleep(250);
}
await sleep(2500);
await page.screenshot(path.resolve(out + `_${opp}_${group}_${W}b.png`));
console.log(await page.eval(`JSON.stringify({ host: !!document.querySelector('.read-battle-host'), errors: (window.__QA && window.__QA.errors || []).slice(0, 3) })`));
await close();
