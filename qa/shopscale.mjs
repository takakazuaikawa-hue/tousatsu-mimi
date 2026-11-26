// 交換所（スマホ）：札とタブの文字の実寸と、札の重なり・はみ出しを測って撮る（2026-10-31 zoom → scale）。node qa/shopscale.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/shopscale'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: true, speed: 2 });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.coins = 5000; save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; state.screen = 'shop'; render(); return true; })()`);
await sleep(1800);
await page.screenshot(path.join(OUT, `${W}x${H}_1.png`));
const m = await page.eval(`JSON.stringify((() => {
  const fs = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return Math.round(parseFloat(getComputedStyle(e).fontSize) * (r.height / e.offsetHeight) * 10) / 10; };
  const items = [...document.querySelectorAll('.shop-items > .shop-item')].map(e => e.getBoundingClientRect());
  let overlap = 0; for (let i = 1; i < items.length; i++) if (items[i].top < items[i - 1].bottom - 1) overlap++;
  const tabs = [...document.querySelectorAll('.shop-cat-btn')].map(e => e.getBoundingClientRect());
  const box = document.querySelector('.shop-items').getBoundingClientRect();
  return { name: fs('.shop-item-name'), desc: fs('.shop-item-desc'), price: fs('.shop-item-price'), tab: fs('.shop-cat-btn'), itemH: items[0] && Math.round(items[0].height), gap: items[1] && Math.round(items[1].top - items[0].bottom), overlap, itemW: items[0] && Math.round(items[0].width), boxW: Math.round(box.width), tabsRight: Math.round(Math.max(...tabs.map(t => t.right))), vw: innerWidth, tabH: tabs[0] && Math.round(tabs[0].height) };
})())`);
console.log(m);
await page.eval(`(() => { document.querySelector('.shop-items').scrollTop = 99999; return true; })()`); await sleep(500);
await page.screenshot(path.join(OUT, `${W}x${H}_2_end.png`));
await s.close(); process.exit(0);
