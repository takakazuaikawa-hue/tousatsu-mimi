// PC の小さい窓（縦が 800 より低く舞台が縮む）で、主な画面の文字の実寸を測る（2026-10-30 ユーザーの実画面で文字が小さすぎた）。
// node qa/pcsmall.mjs [WxH]   出力: qa/out/pcsmall/<WxH>/NN_<場面>.png と small.json（14px 未満の文字）・fontrules.json（指定ごとの実寸）
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '1536x730';
const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/pcsmall', size); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, probes: ['fontrules.js'], save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, ownedItems: ['memory_minipoker'], endingUnlocked: true, loginBonus: { lastDate: '2099-01-01', streak: 1 } } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(2500);
let n = 0;
const SMALL = `JSON.stringify((() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { const s = t.nodeValue.trim(); if (!s || /^[✦✕✓×・\\-—–…♠♥♦♣\\s]+$/.test(s)) continue; const e = t.parentElement; if (!e || e.closest('script,style')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) continue; let op = 1, a = e; while (a && a !== document.body) { op *= +getComputedStyle(a).opacity; a = a.parentElement; } if (op < .1) continue; const px = parseFloat(cs.fontSize) * (e.offsetHeight ? r.height / e.offsetHeight : 1); if (px < 13.95) out.push([Math.round(px * 10) / 10, (e.className || e.tagName).toString().slice(0, 40), s.slice(0, 18)]); } return out; })())`;
const all = {};
const snap = async (name) => { await sleep(900); n++; const f = String(n).padStart(2, '0') + '_' + name + '.png'; await page.screenshot(path.join(OUT, f)); const sm = JSON.parse(await page.eval(SMALL)); all[name] = sm; console.log(name, 'small', sm.length, sm.slice(0, 3).map(x => x.join(' ')).join(' / ')); };
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ev fail', name, String(e).slice(0, 80)));
const close = () => ev(`document.querySelectorAll('.settings-overlay,.collection-overlay,.minipoker-overlay,.mimi-confirm-overlay,.home-overlay,.reward-cg-viewer-overlay,.as-dialog-host,.as-overlay').forEach(e => e.remove())`);
await ev(`state.screen = 'lobby'; render()`); await sleep(3500); await snap('home');
await ev(`showSettingsModal()`); await snap('settings'); await close();
await ev(`showCollectionModal()`); await snap('collection'); await close();
await ev(`showSaveTransfer()`); await snap('transfer'); await close();
await ev(`onAction({ currentTarget: { dataset: { action: 'open-shop' } } })`); await sleep(3500); await snap('shop');
await ev(`state.screen = 'lobby'; render()`); await sleep(2000);
await ev(`onAction({ currentTarget: { dataset: { action: 'play-minipoker' } } })`); await sleep(2500); await snap('minipoker');
await ev(`document.querySelector('.minipoker-overlay [data-mp="deal"]')?.click()`); await sleep(3500); await snap('minipoker_choose');
await close();
await ev(`state.screen = 'lobby'; render(); onAction({ currentTarget: { dataset: { action: 'allstar-open' } } })`); await sleep(2000); await snap('allstar_entry');
await ev(`[...document.querySelectorAll('button')].find(b => /記録/.test(b.textContent))?.click()`); await sleep(1200); await snap('allstar_record');
await close();
// 卓 → 心理・論理の読み合い
for (const [opp, group, id] of [['polka', 'psych', 'ask'], ['polka', 'psych', 'stare'], ['polka', 'logic', 'handbuild'], ['selina', 'logic', 'danger']]) {
  await ev(`state = defaultState(); startBattle(${JSON.stringify(opp)})`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click()`); await sleep(700); }
  await snap('table_' + opp);
  await ev(`READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(id)}]; state.psychPending = true; startReadBattle(${JSON.stringify(group)})`); await sleep(4000);
  await snap('read_' + id + '_1');
  for (let k = 2; k <= 4; k++) { await ev(`const PRI = /はじめる|次へ|つぎへ|スタート|決定|確定|めくる|開く|見つめる|読みに賭ける|OK/; const b = [...document.querySelectorAll('.read-battle-host button, .mk-layer button')].filter(b => b.offsetParent && !b.disabled).find(b => PRI.test(b.textContent)) || [...document.querySelectorAll('.read-battle-host button')].filter(b => b.offsetParent && !b.disabled && !/ルール|戻る|やめる/.test(b.textContent))[0]; b && b.click()`); await sleep(2200); await snap('read_' + id + '_' + k); }
  await ev(`document.querySelectorAll('.read-battle-host,.mk-layer').forEach(e => e.remove()); state.screen = 'lobby'; render()`); await sleep(1500);
}
fs.writeFileSync(path.join(OUT, 'small.json'), JSON.stringify(all, null, 1));
fs.writeFileSync(path.join(OUT, 'fontrules.json'), await page.eval(`JSON.stringify({ rules: window.__FS, small: window.__FS_SMALL })`));
console.log('scale', await page.eval(`getComputedStyle(document.documentElement).getPropertyValue('--game-scale')`), 'errors', await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 3))`));
await s.close();
process.exit(0);
