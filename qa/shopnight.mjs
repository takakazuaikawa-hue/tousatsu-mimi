// 交換所の総点検の続き（2026-11-16）：夜の卓の色替えミミ・持ち越し開始の伏せ札・コレクションの数え方・装備中の表示を確かめる。
// node qa/shopnight.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve(process.argv[2] || 'qa/out/shopnight'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const run = async (name, save, fn) => {
  if (process.env.QA_ONLY && !process.env.QA_ONLY.split(',').includes(name)) return;   // QA_ONLY=coll などで1つだけ
  const s = await openSession({ width: 844, height: 390, mobile: true, speed: 2, save });
  const ev = (js) => s.page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
  try {
    for (let i = 0; i < 80 && !(await s.page.eval('typeof render === "function" && typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
    await sleep(1500);
    await fn(s.page, ev);
    const errs = JSON.parse(await s.page.eval('JSON.stringify(window.__QA.errors)'));
    console.log(name, '例外', s.exceptions.length + errs.length, JSON.stringify(s.exceptions.concat(errs)).slice(0, 400));
  } finally { await s.close(); }
};
// 1) ほろ酔いの夜の卓：桃色ミミを装備していても酔った顔
await run('night', { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000, horoyoiMode: true, ownedItems: ['mimi_skin_pink'], equippedMimiSkin: 'pink' }, async (page, ev) => {
  await ev(`const b = [...document.querySelectorAll('button')].find(b => /受け取る/.test(b.textContent) && b.offsetParent); if (b) b.click(); if (typeof goLobby === 'function') goLobby(); return 1;`); await sleep(1500);
  await ev(`const h = [...document.querySelectorAll('button, [data-action]')].find(b => /ほろ酔いの卓へ/.test(b.textContent) && b.offsetParent); if (h) h.click(); else startBattle('rico_tutorial'); return 1;`); await sleep(3000);
  for (let i = 0; i < 25 && !(await ev("return (state.playerHand || []).length === 2 && !!document.querySelector('.battle-mimi-img')")); i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /受け取る|開始|次へ|スキップ|閉じる/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(900); }
  await sleep(1500);
  console.log('  夜の卓のミミ', await ev(`return JSON.stringify([...document.querySelectorAll('.battle-mimi-img')].map(i => i.getAttribute('src')) .concat([String(state.horoyoi)]));`));
  await page.screenshot(path.join(OUT, 'night_table.png'));
});
// 2) 持ち越し開始（撃破の記録なし・所持あり）：買った品が伏せ札にならない
await run('carry', { clearedStages: [], introPlayed: true, coins: 900, ownedItems: ['cg_selina_salon', 'outfit_rico_swimsuit', 'gallery_rico', 'chips_plus_3000'], equippedRicoOutfit: 'swimsuit' }, async (page, ev) => {
  await ev(`if (typeof goLobby === 'function') goLobby(); return 1;`); await sleep(1200); await ev(`state.screen = 'shop'; render(); return 1;`); await sleep(4000);
  for (const g of ['memory', 'wear']) {
    await ev(`document.querySelector('.sh3-cat[data-g="${g}"]').click(); return 1;`); await sleep(1800);
    console.log('  ', g, await ev(`return JSON.stringify([...document.querySelectorAll('.sh3-card')].filter(c => save.ownedItems.includes(c.dataset.sh3)).map(c => c.dataset.sh3 + (c.classList.contains('is-back') ? ':伏せ札' : ':表')));`));
    await page.screenshot(path.join(OUT, `carry_${g}.png`));
  }
  await ev(`document.querySelector('.sh3-card[data-sh3="outfit_rico_swimsuit"]').click(); return 1;`); await sleep(800);
  console.log('  水着の台', await ev(`return document.querySelector('.sh3-buy').textContent.trim();`));
  await page.screenshot(path.join(OUT, 'carry_equipped.png'));
});
// 3) コレクション：チップ拡張を上から買った・称号は神の手以外ぜんぶ・品はぜんぶ → 100%
await run('coll', { clearedStages: ALL.concat(['rico_serious']), introPlayed: true, coins: 0 }, async (page, ev) => {
  await ev(`save.ownedItems = SHOP_ITEMS.filter(i => !/^chips_plus_(500|1500|3000|5000)$/.test(i.id)).map(i => i.id);
    ensureAchievements(); ACHIEVEMENTS.forEach(a => { if (a.id !== 'win_royal') save.achievements[a.id] = true; }); save.backdoorUnlocked = true; if (${!!process.env.QA_FULL}) { save.rewardCgSeen = ['rico_tutorial','polka','selina','grano','velvet'].flatMap(k => [k, 'h_' + k]); save.gradCgSeen = true; save.unlockedNotes = Object.keys(TACTIC_NOTES); save.ownedItems.push('cgset_velvet_book'); } save.horoyoiMode = true; save.deisuiMode = false; return 1;`);
  await ev(`if (typeof goLobby === 'function') goLobby(); return 1;`); await sleep(1500); await ev(`const b = [...document.querySelectorAll('button')].find(b => /受け取る/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(2500); await ev(`document.querySelectorAll('.modal-overlay, .login-bonus-overlay').forEach(e => e.remove()); showCollectionModal(); return 1;`); await sleep(2500);
  console.log('  完成度', await ev(`return (document.querySelector('.collection-progress-text') || {}).textContent;`));
  console.log('  CG集', await ev(`return [...document.querySelectorAll('.coll-section-title')].map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join(' | ');`));
  console.log('  ノートの未解放の文', await ev(`return [...document.querySelectorAll('.coll-note.off .coll-note-desc')].map(e => e.textContent).join(' / ');`));
  await page.screenshot(path.join(OUT, 'collection.png'));
});
