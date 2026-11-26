// 2つの型を全場面で洗う。node qa/centeraudit.mjs <WxH> <outDir>
//  A. 帯・札・ボタンの中で、1行の文字が上下の中央からずれている（2.5px 以上）
//  B. 暗い文字に黒いぼかし影（文字がぼやけて見える）
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/centeraudit');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;

const AUDIT = `(() => {
  const lum = (c) => { const m = c.match(/[\\d.]+/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const alpha = (c) => { const m = c.match(/[\\d.]+/g); return m && m.length > 3 ? +m[3] : 1; };
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.05; };
  const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + (e.dataset && e.dataset.action ? '[' + e.dataset.action + ']' : '');
  const center = [], blur = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e)) continue;
    const texts = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (!texts.length) continue;
    const c = getComputedStyle(e);
    // B. 暗い文字＋黒いぼかし影
    if (c.textShadow && c.textShadow !== 'none' && lum(c.color) < 0.3) {
      const parts = c.textShadow.split(/,(?![^(]*\\))/);
      const bad = parts.some(p => { const col = (p.match(/rgba?\\([^)]*\\)/) || ['rgb(0,0,0)'])[0]; const nums = p.replace(/rgba?\\([^)]*\\)/, '').match(/-?[\\d.]+px/g) || []; const bl = nums[2] ? parseFloat(nums[2]) : 0; return lum(col) < 0.3 && alpha(col) >= 0.3 && bl >= 2; });
      if (bad) blur.push({ el: name(e), text: e.textContent.trim().slice(0, 16), color: c.color, ts: c.textShadow.slice(0, 90) });
    }
    // A. 1行の文字の上下の中央。中身が文字だけの箱で、背景・枠・帯の疑似要素がある物
    if (e.children.length > 1) continue;
    const range = document.createRange(); range.selectNodeContents(e);
    const rects = [...range.getClientRects()].filter(r => r.width > 0);
    if (!rects.length) continue;
    const top = Math.min(...rects.map(r => r.top)), bot = Math.max(...rects.map(r => r.bottom));
    const fs = parseFloat(c.fontSize);
    if (bot - top > fs * 2.2) continue;      // 2行以上は対象外
    const r = e.getBoundingClientRect();
    if (r.height > 140 || r.height < fs * 1.3) continue;
    const pe = (p) => { const s = getComputedStyle(e, p); return s.content && s.content !== 'none' && s.position === 'absolute' && (s.backgroundImage !== 'none' || s.borderImageSource !== 'none' || alpha(s.backgroundColor) > 0.2) ? s : null; };
    const decorated = alpha(c.backgroundColor) > 0.2 || c.backgroundImage !== 'none' || c.borderImageSource !== 'none' || parseFloat(c.borderTopWidth) + parseFloat(c.borderBottomWidth) >= 2 || pe('::before') || pe('::after');
    if (!decorated) continue;
    const bt = parseFloat(c.borderTopWidth), bb = parseFloat(c.borderBottomWidth);
    const boxMid = (r.top + bt + r.bottom - bb) / 2;
    const textMid = (top + bot) / 2;
    const d = +(textMid - boxMid).toFixed(1);
    if (Math.abs(d) >= 2.5) center.push({ el: name(e), text: e.textContent.trim().slice(0, 16), d, h: +r.height.toFixed(1), pad: c.paddingTop + '/' + c.paddingBottom, fs, va: c.display });
  }
  const tg = document.querySelector(".v2-detail-toggle"); const toggle = tg ? (tg.offsetParent ? getComputedStyle(tg).visibility : "none") : "absent";
  const panel = document.querySelector(".v2-detail"); const detailText = panel ? [...panel.children].filter(k => !k.classList.contains("v2-detail-close") && getComputedStyle(k).display !== "none").map(k => k.textContent.trim()).join(" ").slice(0, 40) : "";
  return { center, blur, toggle, detailText };
})()`;

const ADVANCE = `(() => {
  const re = /^(▶ ?開始|開始|始める|次へ|スキップ|OK|閉じる|はじめる|対戦へ)$/;
  const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim())).pop();
  if (b) { b.click(); return false; }
  return !!document.querySelector('[data-action="start-hand"]');
})()`;
const CLEAR = `document.querySelectorAll('.chapter-banner,.settings-overlay,.mimi-confirm-overlay,.pack-overlay').forEach(e => e.remove()); true`;

const report = {};
async function scene(label, setup, wait = 1500) {
  await page.eval(CLEAR);
  try { await setup(); } catch (e) { report[label] = { error: String(e).slice(0, 200) }; return; }
  await page.eval('document.fonts.ready.then(()=>true)');
  await sleep(wait);
  for (let i = 0; i < 40 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
  report[label] = await page.eval(AUDIT);
  await page.screenshot(path.join(out, `${tag}-${label}.png`));
}
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  const lobby = `(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = save.clearedStages.slice(); save.rewardCgSeen = save.clearedStages.slice(); save.coins = 850; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render(); return 1; })()`;
  await scene('lobby', () => page.eval(lobby), 2500);
  await scene('chapter', () => page.eval(`(() => { showChapterBanner('特別', '特別講座：用語集（手札関連）', () => {}, '手札の強さを表す言葉を覚えよう'); return 1; })()`), 1800);
  await scene('settings', () => page.eval(`(() => { showSettingsModal(); return 1; })()`));
  await scene('shop', () => page.eval(`(() => { state.screen = 'shop'; render(); return 1; })()`), 2500);
  await scene('table', async () => {
    await page.eval(lobby); await sleep(1500);
    await page.eval(`(() => { startBattle('grano'); return 1; })()`);
    let ok = false; for (let i = 0; i < 80 && !ok; i++) { ok = await page.eval(ADVANCE); if (!ok) await sleep(700); }
  }, 1800);
  await scene('hand', async () => {
    await page.eval(`(() => { document.querySelector('[data-action="start-hand"]').click(); return 1; })()`);
    for (let i = 0; i < 30; i++) { const ok = await page.eval(`!!document.querySelector('.action-area button:not([disabled])') && !document.querySelector('[data-action="start-hand"]')`); if (ok) break; await sleep(600); }
  }, 1500);
  await scene('result', () => page.eval(`(() => { state.opponentChips = 0; endBattle(); return 1; })()`), 4500);
  await scene('title', () => page.eval(`(() => { document.querySelectorAll('.result-fx, .intermission-overlay').forEach(e => e.remove()); state.screen = 'title'; render(); return 1; })()`), 2500);
  await scene('minipoker', () => page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return 1; })()`), 2500);
} finally {
  await session.close();
}
fs.writeFileSync(path.join(out, `${tag}-report.json`), JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(k, 'ERROR', v.error); continue; }
  console.log(`== ${k}  ずれ ${v.center.length}  ぼかし影 ${v.blur.length}  詳細ボタン ${v.toggle}  中身「${v.detailText}」`);
  for (const c of v.center) console.log('  A', c.d, c.el, '「' + c.text + '」', 'h' + c.h, c.pad);
  for (const b of v.blur) console.log('  B', b.el, '「' + b.text + '」', b.color, b.ts);
}
