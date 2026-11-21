// 横にはみ出して見えない物がある列を洗う。node qa/rowaudit.mjs <WxH> <outDir>
// 横すべりの列（overflow-x が auto/scroll/hidden で、中身が枠より広い）と、送りボタンの有無を挙げる
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/rowaudit');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;

const AUDIT = `(() => {
  const name = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  const res = [];
  for (const e of document.querySelectorAll('body *')) {
    const c = getComputedStyle(e);
    if (!/(auto|scroll|hidden)/.test(c.overflowX)) continue;
    if (e.clientWidth < 60 || e.clientHeight < 30) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 60 || r.bottom < 0 || r.top > innerHeight) continue;
    if (c.visibility === 'hidden' || c.display === 'none') continue;
    const extra = e.scrollWidth - e.clientWidth;
    if (extra < 8) continue;
    // 文字が1行に収まらず省略されているだけの物（text-overflow）は除く
    if (e.children.length < 2) continue;
    const arrows = !!(e.__arrows || (e.parentElement && e.parentElement.querySelector(':scope > .row-arrow')));
    res.push({ el: name(e), w: Math.round(e.clientWidth), sw: e.scrollWidth, hidden: extra, ox: c.overflowX, kids: e.children.length, arrows, sl: Math.round(e.scrollLeft) });
  }
  return res;
})()`;

const report = {};
async function scene(label, js, wait = 2000) {
  try { await page.eval(`(() => { ${js}; return 1; })()`); } catch (e) { report[label] = { error: String(e).slice(0, 160) }; return; }
  await sleep(wait);
  for (let i = 0; i < 30 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
  report[label] = await page.eval(AUDIT);
  await page.screenshot(path.join(out, `${tag}-${label}.png`));
}
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  // クリア後のセーブ：品が多い状態で見る
  await page.eval(`(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; save.firstClearRewardClaimed = save.clearedStages.slice(); save.rewardCgSeen = save.clearedStages.slice(); save.coins = 99999; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(2000);
  await scene('shop', `state.screen = 'shop'; render()`, 2800);
  const groups = await page.eval(`[...document.querySelectorAll('.sh3-cat')].map(b => b.dataset.g)`);
  for (const g of groups) await scene('shop-' + g, `document.querySelector('.sh3-cat[data-g="${g}"]').click()`, 1500);
  await scene('collection', `state.screen = 'lobby'; render(); showCollectionModal()`, 2500);
  await scene('outfits', `document.querySelectorAll('.collection-overlay').forEach(e => e.remove()); showRicoViewer()`, 2500);
  await scene('memory', `document.querySelectorAll('.rico-viewer-overlay').forEach(e => e.remove()); state.screen = 'lobby'; render(); showCollectionModal(); const t = [...document.querySelectorAll('.collection-overlay button, .collection-overlay [role=tab]')].find(b => /一枚絵|CG/.test(b.textContent)); if (t) t.click()`, 2500);
} finally {
  await session.close();
}
fs.writeFileSync(path.join(out, `${tag}-report.json`), JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(k, 'ERROR', v.error); continue; }
  console.log(`== ${k}  はみ出す列 ${v.length}`);
  for (const r of v) console.log('  ', r.el, `幅${r.w} 中身${r.sw} 見えない${r.hidden}px 子${r.kids} ${r.ox} 送り${r.arrows ? 'あり' : 'なし'}`);
}
