// ご褒美CGの2枚続き（幕間）・コレクションの印と続けて見るビューア・交換所の秘蔵の一枚を撮る。
// node qa/cgseq.mjs [W H]   出力: qa/out/cgseq/<W>x<H>_*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800] = process.argv.slice(2).map(Number);
const OUT = path.resolve('qa/out/cgseq'); fs.mkdirSync(OUT, { recursive: true });
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const s = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = s;
await sleep(5000);
const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));
// 1) 幕間：セリナに勝った時。会話を送り切って CG 1枚目 → 2枚目 → 閉じる
await page.eval(`(() => { document.querySelectorAll('.home-overlay,.login-bonus-overlay').forEach(e => e.remove());
  save.clearedStages = ['rico_tutorial','polka','selina']; save.coins = 5000; save.ownedItems = [...(save.ownedItems||[]), 'cg_selina_salon'];
  showIntermission('selina', () => { window.__imsDone = true; }, true); return true; })()`);
const n = await page.eval(`INTERMISSIONS.selina.lines.length`);
for (let i = 0; i < n; i++) { await sleep(500); await page.eval(`document.querySelector('.intermission-overlay').click(), true`); }
await sleep(5200);
log('cg1', await page.eval(`JSON.stringify({ src: document.querySelector('.ims-cg-img').getAttribute('src'), count: document.querySelector('.ims-cg-count').textContent })`));
await shot('ims1');
await page.eval(`document.querySelector('.intermission-overlay').click(), true`);
await sleep(3400);
log('cg2', await page.eval(`JSON.stringify({ src: document.querySelector('.ims-cg-img').getAttribute('src'), count: document.querySelector('.ims-cg-count').textContent, open: !!document.querySelector('.intermission-overlay') })`));
await shot('ims2');
await page.eval(`document.querySelector('.intermission-overlay').click(), true`);
await sleep(900);
log('closed', await page.eval(`JSON.stringify({ overlay: !!document.querySelector('.intermission-overlay'), done: !!window.__imsDone })`));
// 2) コレクション：ご褒美CGの欄
await page.eval(`(showCollectionModal(), true)`);
await sleep(1200);
await page.eval(`(document.querySelector('.coll-cgs').scrollIntoView({ block: 'center' }), true)`);
await sleep(600);
log('coll', await page.eval(`JSON.stringify([...document.querySelectorAll('.coll-cgs .coll-cg-card')].map(c => c.className.replace('coll-cg-card ', '') + ':' + c.textContent.trim().replace(/\\s+/g, ' ')))`));
await shot('coll');
await page.eval(`(document.querySelector('.coll-cg-card[data-cg-id="selina"]').click(), true)`);
await sleep(1200);
log('viewer1', await page.eval(`document.querySelector('.reward-cg-viewer-hint').textContent`));
await shot('viewer1');
await page.eval(`(document.querySelector('.reward-cg-viewer-overlay').click(), true)`);
await sleep(1000);
log('viewer2', await page.eval(`JSON.stringify({ hint: document.querySelector('.reward-cg-viewer-hint').textContent, src: document.querySelector('.reward-cg-viewer-img').getAttribute('src') })`));
await page.eval(`(document.querySelector('.reward-cg-viewer-overlay').click(), true)`);
await sleep(500);
await page.eval(`(document.querySelector('.coll-cg-card.is-secret').click(), true)`);
await sleep(1500);
log('secret', await page.eval(`JSON.stringify({ hint: document.querySelector('.reward-cg-viewer-hint').textContent, src: document.querySelector('.reward-cg-viewer-img').getAttribute('src'), video: !!document.querySelector('.reward-cg-viewer-overlay video') })`));
await shot('secret');
await page.eval(`(document.querySelectorAll('.reward-cg-viewer-overlay,.collection-overlay').forEach(e => e.remove()), true)`);
// 3) 交換所：メモリの棚で秘蔵の一枚（持っていない方＝暖炉のセリナ）を選ぶ
await page.eval(`(onAction({ currentTarget: { dataset: { action: 'open-shop' } } }), true)`);
await sleep(4500);
await page.eval(`(() => { shop3.group = 'memory'; shop3RenderCats(); shop3RenderRow(false); shop3Select('cg_selina_fireside', true); return true; })()`);
await sleep(1500);
log('shop', await page.eval(`JSON.stringify({ kick: document.querySelector('.sh3-kick')?.textContent, name: document.querySelector('.sh3-name')?.textContent, buy: document.querySelector('.sh3-buy')?.textContent.trim(), cards: [...document.querySelectorAll('.sh3-card')].map(c => c.dataset.sh3).filter(x => /^cg_/.test(x)) })`));
await shot('shop');
await page.eval(`(shop3Select('cg_selina_salon', true), true)`);
await sleep(1200);
log('shop_owned', await page.eval(`document.querySelector('.sh3-buy')?.textContent.trim()`));
await shot('shop_owned');
// 6字ちょうどの品名（語の途中で折れていた型）を全部選んで、品名が何行かを測る
log('names6', await page.eval(`(() => { const out = []; for (const id of ['panyu_chrono','note_tell','table_emerald','gallery_opponents','cg_selina_fireside']) { const it = SHOP_ITEMS.find(i => i.id === id); if (!it) { out.push(id + ':なし'); continue; } shop3.group = shop3GroupOf(it); shop3RenderCats(); shop3RenderRow(false); shop3Select(id, false); const el = document.querySelector('.sh3-name'); const lh = parseFloat(getComputedStyle(el).lineHeight); out.push(el.textContent + ':' + Math.round(el.getBoundingClientRect().height / (lh * el.getBoundingClientRect().height / el.offsetHeight)) + '行'); } return out.join(' / '); })()`));
log('errors',await page.eval(`JSON.stringify((window.__errors || []).slice(0, 5))`));
await s.close();
