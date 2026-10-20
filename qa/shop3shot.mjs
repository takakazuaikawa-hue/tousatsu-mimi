// 交換所 v3 を撮る（分類ごと・交換の直後・コイン不足）。使い方: node qa/shop3shot.mjs [pc|phone|se] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const size = { pc: [1280, 800], phone: [844, 390], se: [667, 375] }[mode];
const OUT = path.resolve(process.argv[3] || 'qa/out/shop3');
fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: mode !== 'pc', speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
await ev(`save.coins = 3000; save.clearedStages = ['rico_tutorial','polka','selina']; save.shopSeenItems = []; state.screen = 'shop'; render();`);
await sleep(mode === 'pc' ? 6000 : 3500);
const shot = async (name) => { await page.screenshot(path.join(OUT, `${mode}_${name}.png`)); };
await sleep(900);
await shot('1_open');
// 衣装の2枚目を選ぶ
await ev(`document.querySelectorAll('.sh3-card')[1].click()`); await sleep(900); await shot('2_select');
// ぱにゅ衣装（額）
await ev(`const c = [...document.querySelectorAll('.sh3-card')].find(c => c.dataset.sh3 && c.dataset.sh3.startsWith('pwear_')); if (c) c.click()`); await sleep(900); await shot('3_scene');
// ぱにゅ強化（札の紋）
await ev(`document.querySelector('.sh3-cat[data-g="panyu"]').click()`); await sleep(1200); await shot('4_panyu');
// 卓の装い
await ev(`document.querySelector('.sh3-cat[data-g="look"]').click()`); await sleep(1200); await shot('5_look');
// 交換する
await ev(`document.querySelector('[data-sh3-buy]') && document.querySelector('[data-sh3-buy]').click()`); await sleep(1300); await shot('6_bought');
// ノート・メモリ
await ev(`document.querySelector('.sh3-cat[data-g="note"]').click()`); await sleep(1200); await shot('8_note');
await ev(`save.clearedStages.push('grano','velvet'); document.querySelector('.sh3-cat[data-g="memory"]').click()`); await sleep(1200); await shot('9_memory');
// コイン不足
await ev(`save.coins = 100; document.querySelector('.sh3-cat[data-g="stack"]').click()`); await sleep(1200);
await ev(`document.querySelector('[data-sh3-buy]') && document.querySelector('[data-sh3-buy]').click()`); await sleep(300); await shot('7_short');
const info = await page.eval(`JSON.stringify({ cards: document.querySelectorAll('.sh3-card').length, owned: save.ownedItems.slice(-2) })`).catch(e => e.message);
console.log(mode, info, 'exceptions', JSON.stringify(session.exceptions).slice(0, 600));
await session.close();
