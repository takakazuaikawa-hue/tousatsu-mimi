// ショップの「ぱにゅ」棚と、ぱにゅぱにゅの衣装替えを撮る（ぱにゅ衣装の確認用）。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/shopshot.mjs [pc|phone] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const phone = process.argv[2] === 'phone';
const OUT = path.resolve(process.argv[3] || 'qa/out/shopshot');
fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: phone ? 844 : 1280, height: phone ? 390 : 800, mobile: phone, speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
await ev(`save.coins = 5000; save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; save.ownedItems.push('pwear_pajama','pwear_nurse'); state.screen = 'shop'; render();`);
await sleep(1200);
await page.screenshot(path.join(OUT, '01_shop_panyu.png'));
await ev(`document.querySelector('.shop-items, [data-bind="shopItems"]').scrollTop = 99999`);
await sleep(500);
await page.screenshot(path.join(OUT, '02_shop_panyu_scrolled.png'));
const info = await page.eval(`JSON.stringify({ owned: panyuOwnedOutfits().map(o=>o.id), cur: panyuOutfit(), thumbs: [...document.querySelectorAll('.shop-item-thumb')].map(i=>i.naturalWidth).length })`).catch(e => e.message);
console.log(info);
const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
console.log('errors', JSON.stringify(errors).slice(0, 800), 'exceptions', JSON.stringify(session.exceptions).slice(0, 800));
await session.close();
