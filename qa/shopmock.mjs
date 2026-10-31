// 交換所の改善案を実際の画面に重ねて撮る。使い方: node qa/shopmock.mjs [pc|phone] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const phone = process.argv[2] === 'phone';
const OUT = path.resolve(process.argv[3] || 'qa/out/shopmock');
fs.mkdirSync(OUT, { recursive: true });
const css = (f) => fs.readFileSync(path.resolve('qa/mock', f), 'utf8');
const ALL = JSON.stringify(css('shop_common.css') + css('shop_a.css') + css('shop_b.css'));
const session = await openSession({ width: phone ? 844 : 1280, height: phone ? 390 : 800, mobile: phone, speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
await ev(`const s = document.createElement('style'); s.textContent = ${ALL}; document.head.appendChild(s);`);
const tag = phone ? 'phone' : 'pc';
for (const mode of ['now', 'A', 'B']) {
  await ev(`save.coins = 3000; save.clearedStages = ['rico_tutorial','polka','selina']; save.shopSeenItems = ['panyu_lv2','panyu_gauge']; state.screen = 'shop'; render();`);
  await sleep(4000);
  if (mode !== 'now') await ev(`const sc = document.querySelector('.shop-screen'); sc.classList.add('mk', 'mk${mode}');
    sc.querySelector('.shop-v2-brand').textContent = 'グラーノ商会'; sc.querySelector('.shop-v2-coins-label').textContent = '手持ちのコイン'; sc.querySelector('.shop-v2-back').textContent = 'ロビーへ戻る';
    window.__mkMove = () => { if (sc.classList.contains('mkA')) sc.querySelectorAll('.shop-item').forEach(it => { const t = it.querySelector(':scope > .shop-item-newtag'); if (t) it.querySelector('.shop-item-body').prepend(t); }); }; window.__mkMove();`);
  await sleep(800);
  await page.screenshot(path.join(OUT, `${tag}_${mode}_panyu.png`));
  await ev(`document.querySelector('.shop-cat-btn[data-cat="skin"]').click()`);
  await sleep(1200); await ev('window.__mkMove && window.__mkMove()');
  await page.screenshot(path.join(OUT, `${tag}_${mode}_skin.png`));
}
console.log('done', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
