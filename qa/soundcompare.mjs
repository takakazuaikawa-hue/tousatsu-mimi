// 卓の音のボタン：同じ画面で、古い指定（線1.7・枠5割）と今の指定を撮り比べる。node qa/soundcompare.mjs <WxH> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/soundbtn');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;
const ADVANCE = `(() => {
  const re = /^(▶ ?開始|開始|始める|次へ|スキップ|OK|閉じる|はじめる|対戦へ)$/;
  const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim())).pop();
  if (b) { b.click(); return false; }
  return !!document.querySelector('[data-action="start-hand"]');
})()`;
const OLD = `.sound-toggle { background: rgba(12,9,10,.6) !important; border-color: rgba(217,179,90,.5) !important; color: #f0e2b8 !important; }
.sound-toggle svg { width: 20px !important; height: 20px !important; stroke-width: 1.7 !important; }
html.is-compact .sound-toggle svg { width: calc(20px / var(--game-scale, 1)) !important; height: calc(20px / var(--game-scale, 1)) !important; }
.sound-toggle.is-off { color: #9b8b74 !important; border-color: rgba(217,179,90,.3) !important; }
.battle-screen.v2 > .sound-toggle { z-index: 2 !important; }`;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await page.eval(`(() => { save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = save.clearedStages.slice(); state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(2500);
  await page.eval(`(() => { startBattle('grano'); return 1; })()`);
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) { ok = await page.eval(ADVANCE); if (!ok) await sleep(700); }
  for (let i = 0; i < 40 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
  await page.eval(`document.querySelectorAll('.mk-layer').forEach(e => e.remove()); true`);
  await sleep(600);
  const rect = await page.eval(`(() => { const r = document.querySelector('.sound-toggle').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); })()`);
  await page.screenshot(path.join(out, `${tag}-new.png`));
  await page.eval(`(() => { const s = document.createElement('style'); s.id = 'qa-old'; s.textContent = ${JSON.stringify(OLD)}; document.head.appendChild(s); return 1; })()`);
  await sleep(300);
  await page.screenshot(path.join(out, `${tag}-old.png`));
  await page.eval(`(() => { document.getElementById('qa-old').remove(); document.querySelector('.sound-toggle').style.zIndex = 99999; return 1; })()`); await sleep(300);
  await page.screenshot(path.join(out, `${tag}-top.png`));
  const covers = await page.eval(`(() => { const t = document.querySelector('.sound-toggle'); const r = t.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const res = []; for (const e of document.querySelectorAll('body *')) { if (e === t || t.contains(e) || e.contains(t)) continue; for (const p of ['', '::before', '::after']) { const c = getComputedStyle(e, p || null); if (p && (c.content === 'none' || !c.content)) continue; if (c.display === 'none') continue; const er = e.getBoundingClientRect(); if (!p && (cx < er.left || cx > er.right || cy < er.top || cy > er.bottom)) continue; if (p && (c.position !== 'absolute' && c.position !== 'fixed')) continue; if (p && (cx < er.left || cx > er.right || cy < er.top || cy > er.bottom) && c.position !== 'fixed') continue; const bg = c.backgroundColor + ' ' + c.backgroundImage.slice(0, 50); if (/rgba(0, 0, 0, 0) none/.test(bg) && c.backdropFilter === 'none') continue; res.push(e.tagName + '.' + String(e.className).slice(0, 40) + p + ' z' + c.zIndex + ' pe' + c.pointerEvents + ' ' + bg); } } return res.slice(0, 20); })()`);
  console.log(covers.join(' || '));
  fs.writeFileSync(path.join(out, `${tag}-rect.json`), JSON.stringify(rect));
  console.log(tag, 'sound-toggle rect', rect.join(','));
} finally {
  await session.close();
}
