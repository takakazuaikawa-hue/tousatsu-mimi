// セーブの引き継ぎ・クレジットの窓を撮り、コードの往復で進み具合が戻るかを確かめる。
// node qa/transfer.mjs W H   出力: qa/out/transfer/<W>x<H>_*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800] = process.argv.slice(2).map(Number);
const OUT = path.resolve('qa/out/transfer'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000, clear: false });
const { page } = s;
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const boot = async () => { for (let i = 0; i < 40 && !(await page.eval('typeof render === "function" && !!window.save')); i++) await sleep(500); await sleep(2500); };
await page.eval(`(localStorage.clear(), location.reload(), 1)`).catch(() => {}); await sleep(1500); await boot();
// 進み具合を作る
await page.eval(`(() => { document.querySelectorAll('.home-overlay,.login-bonus-overlay').forEach(e => e.remove()); save.introPlayed = true; save.coins = 4321; save.clearedStages = ['rico_tutorial','polka','selina']; save.ownedItems = ['cg_selina_salon']; saveProgress(); localStorage.setItem('mimi.panyuOutfit', 'nurse'); state.screen = 'lobby'; render(); return 1; })()`);
await sleep(2500);
// 設定 → セーブの引き継ぎ
await page.eval(`(showSettingsModal(), 1)`); await sleep(800);
await shot('settings');
await page.eval(`(document.querySelector('[data-action="save-transfer"]').click(), 1)`); await sleep(1200);
const m = await page.eval(`JSON.stringify((() => { const px = (q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return +(parseFloat(getComputedStyle(e).fontSize) * r.height / e.offsetHeight).toFixed(1); }; const box = document.querySelector('.is-transfer .mimi-confirm').getBoundingClientRect(); const btn = document.querySelector('.tr-btns .btn').getBoundingClientRect(); return { title: px('.is-transfer .mimi-confirm-title'), body: px('.is-transfer .mimi-confirm-body'), head: px('.tr-head'), btn: px('.tr-btns .btn'), btnH: Math.round(btn.height), fits: box.bottom <= innerHeight && box.top >= 0, over: document.querySelector('.is-transfer .mimi-confirm').scrollHeight > document.querySelector('.is-transfer .mimi-confirm').clientHeight + 2, codeLen: document.querySelector('#tr-code-out').value.length }; })())`);
console.log('transfer', m);
await shot('transfer');
// 往復：コードを取り、進み具合を消して、コードで戻す
const code = await page.eval(`document.querySelector('#tr-code-out').value`);
await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); localStorage.removeItem('tousatsu_mimi_save_v1'); localStorage.removeItem('mimi.panyuOutfit'); save = defaultSave(); return 1; })()`);
await page.eval(`(showSaveTransfer(), 1)`); await sleep(800);
await page.eval(`(() => { document.querySelector('#tr-code-in').value = 'MIMI1:こわれた.123'; document.querySelector('[data-tr="load"]').click(); return 1; })()`); await sleep(600);
console.log('bad', await page.eval(`document.querySelector('.tr-note').textContent`));
await page.eval(`(() => { document.querySelector('#tr-code-in').value = ${JSON.stringify(code)}; document.querySelector('[data-tr="load"]').click(); return 1; })()`); await sleep(900);
await shot('confirm');
console.log('confirm', await page.eval(`JSON.stringify({ body: document.querySelector('.mimi-confirm-overlay:not(.is-panel) .mimi-confirm-body')?.innerText })`));
await page.eval(`(document.querySelector('.mimi-confirm-overlay:not(.is-panel) .mimi-confirm-ok').click(), 1)`);
await sleep(2500); await boot();
console.log('restored', await page.eval(`JSON.stringify({ coins: save.coins, cleared: save.clearedStages, owned: save.ownedItems, outfit: localStorage.getItem('mimi.panyuOutfit') })`));
// クレジット
await page.eval(`(() => { document.querySelectorAll('.home-overlay,.login-bonus-overlay').forEach(e => e.remove()); showCreditsPanel(); return 1; })()`); await sleep(1000);
await shot('credits');
console.log('errors', await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 4))`));
await s.close();
process.exit(0);
