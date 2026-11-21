// 卓の部品（次のハンドへ・詳細データ・音のボタン）を測って撮る。
// node qa/tableprobe.mjs <WxH> <outDir> [detail]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/tableprobe');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;
const ADVANCE = `(() => {
  const re = /^(▶ ?開始|開始|始める|次へ|スキップ|OK|閉じる|はじめる|対戦へ)$/;
  const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim())).pop();
  if (b) { b.click(); return false; }
  return !!document.querySelector('[data-action="start-hand"]') && !document.querySelector('.house-rules, [class*="rules-overlay"], .pre-battle-overlay');
})()`;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await page.eval(`(() => { save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = save.clearedStages.slice(); state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(2500);
  await page.eval(`(() => { startBattle('grano'); return 1; })()`);
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) { ok = await page.eval(ADVANCE); if (!ok) await sleep(700); }
  await sleep(1800);
  for (let i = 0; i < 40 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
  if (!ok) { await page.screenshot(path.join(out, `${tag}-stuck.png`)); throw new Error('start-hand not reached'); }
  const info = await page.eval(`(() => {
    const b = document.querySelector('[data-action="start-hand"]');
    const chain = []; let e = b;
    while (e && e !== document.documentElement) {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      const odd = (c.transform !== 'none') || (c.zoom !== '1') || (c.scale !== 'none') || (c.filter !== 'none') || (c.willChange !== 'auto') || (c.backdropFilter !== 'none') || (c.animationName !== 'none') || e === b;
      if (odd) chain.push({ el: e.tagName + '.' + String(e.className).slice(0, 50), tf: c.transform, zoom: c.zoom, scale: c.scale, filter: c.filter, wc: c.willChange, anim: c.animationName, rect: [r.x, r.y, r.width, r.height].map(v => +v.toFixed(2)).join(',') });
      e = e.parentElement;
    }
    const cs = getComputedStyle(b);
    const snd = [...document.querySelectorAll('.sound-toggle')].filter(x => x.offsetParent).map(x => { const c = getComputedStyle(x); return { cls: String(x.className).slice(0, 60), act: x.dataset.action, txt: x.textContent.trim().slice(0, 12), op: c.opacity, color: c.color, bg: c.backgroundColor, bgi: c.backgroundImage.slice(0, 80), border: c.borderColor, filter: c.filter }; });
    const det = [...document.querySelectorAll('[data-action*="detail"], [class*="detail"]')].filter(x => x.offsetParent).map(x => ({ cls: String(x.className).slice(0, 60), act: x.dataset.action, txt: x.textContent.trim().slice(0, 30) }));
    const st = document.querySelector('.sound-toggle'); let cover = null; if (st) { const r = st.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); cover = hit ? (hit === st || st.contains(hit) ? 'self' : hit.tagName + '.' + String(hit.className).slice(0, 60) + ' z' + getComputedStyle(hit).zIndex + ' bg' + getComputedStyle(hit).backgroundColor) : 'none'; }
    let svgInfo = null; if (st) { const sv = st.querySelector('svg'); const pb = getComputedStyle(st, '::before'), pa = getComputedStyle(st, '::after'); svgInfo = { svg: sv ? (() => { const c = getComputedStyle(sv); const r = sv.getBoundingClientRect(); return { stroke: c.stroke, sw: c.strokeWidth, op: c.opacity, color: c.color, w: r.width, h: r.height, filter: c.filter }; })() : null, before: pb.content + ' ' + pb.backgroundColor + ' ' + pb.backgroundImage.slice(0,60) + ' op' + pb.opacity, after: pa.content + ' ' + pa.backgroundColor + ' op' + pa.opacity, btnOp: getComputedStyle(st).opacity, mix: getComputedStyle(st).mixBlendMode }; }
    return { svgInfo, cover, btn: { font: cs.font, ts: cs.textShadow, color: cs.color, bg: cs.backgroundImage.slice(0, 80), filter: cs.filter }, chain, snd, det };
  })()`);
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot(path.join(out, `${tag}-table.png`));
  if (process.argv[4] === 'detail') {
    const opened = await page.eval(`(() => { const t = [...document.querySelectorAll('button,[data-action]')].find(x => x.offsetParent && /詳細/.test(x.textContent)); if (!t) return 'no button'; t.click(); return (t.dataset.action || '') + '@' + t.textContent.trim().slice(0, 20); })()`);
    await sleep(900);
    const panel = await page.eval(`(() => { const p = document.querySelector('aside.right-panel'); if (!p) return null; return { cls: p.className, html: p.innerHTML.replace(/\\s+/g, ' ').slice(0, 1500), kids: [...p.children].map(k => k.className + ':' + getComputedStyle(k).display + ':' + k.textContent.trim().slice(0, 40)) }; })()`);
    console.log('detail opened by', opened);
    console.log(JSON.stringify(panel, null, 1));
    await page.screenshot(path.join(out, `${tag}-detail.png`));
  }
} finally {
  await session.close();
}
