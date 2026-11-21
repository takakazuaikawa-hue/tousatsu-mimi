// 省略された文（…）の全文の吹き出しを、卓で確かめる。node qa/trunctip.mjs [WxH]   出力 qa/out/trunctip/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '1280x800'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/trunctip'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, loginBonus: { lastDate: '2099-01-01', streak: 1 }, firstClearRewardClaimed: ['rico_tutorial', 'polka'], episodesSeen: ['polka'] } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(2000);
await page.eval(`(startBattle('polka'), 1)`); await sleep(4000);
for (let i = 0; i < 40; i++) { const ok = await page.eval(`!!document.querySelector('.verb-btn:not([disabled])')`).catch(() => false); if (ok) break; await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|はじめる|閉じる|OK|次へ/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1; })()`); await sleep(1000); }
const cuts = await page.eval(`JSON.stringify([...document.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return e.offsetParent && ((cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 1)); }).map(e => { const r = e.getBoundingClientRect(); return { c: e.className.toString().slice(0, 40), t: e.textContent.trim().slice(0, 30), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }))`);
console.log('省略', cuts);
const list = JSON.parse(cuts);
await page.screenshot(path.join(OUT, `${size}_0.png`));
let n = 0;
for (const c of list.slice(0, 3)) {
  n++;
  if (W < 900) { await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] }); await sleep(700); }
  else { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y }); await sleep(400); }
  const tip = await page.eval(`(() => { const t = document.querySelector('.trunc-tip'); if (!t) return 'なし'; const r = t.getBoundingClientRect(); return t.textContent.slice(0, 60) + ' @' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' 字' + getComputedStyle(t).fontSize; })()`);
  console.log(n, c.c, '→', tip);
  await page.screenshot(path.join(OUT, `${size}_${n}.png`));
  if (W < 900) { await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300); }
}
await s.close(); process.exit(0);
