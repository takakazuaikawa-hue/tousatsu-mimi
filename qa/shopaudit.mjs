// 交換所の総点検（2026-11-16）：クリア後の装備のセーブで、分類ごと・品ごとに選んで測る。
// QA_SIZE=844x390 node qa/shopaudit.mjs [outDir]   出力 <outDir>/<大きさ>/<分類>.png と report.json
// 数える物：stdcheck の基準（はみ出し・切れ・小さい文字）＋ 札・台の表示とセーブの食い違い（入手済・値段・鍵）
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const PHONE = W < 900;
const STD = stdCheck({ minText: 14, bodyMin: 16, phone: PHONE });
const OUT = path.resolve(process.argv[2] || 'qa/out/shopaudit', `${W}x${H}`); fs.mkdirSync(OUT, { recursive: true });
const OWN = ['panyu_sense_lv2', 'panyu_combo_x2', 'note_pot_odds', 'note_tell', 'chips_plus_500', 'chips_plus_10000', 'skin_red_gold_card', 'table_neon', 'chip_skin_jade',
  'outfit_rico_bunny', 'outfit_rico_dress', 'outfit_rico_swimsuit', 'mimi_skin_pink', 'mimi_skin_gold', 'pwear_pajama', 'pwear_gym', 'pwear_bikini', 'cutin_neon',
  'bgm_lobby_jazz', 'se_pack_casino', 'gallery_rico', 'gallery_opponents', 'cg_selina_salon', 'cgset_bath', 'cgset_horoyoi', 'omake_drama_1', 'omake_voice_pack', 'memory_minipoker'];
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet', 'rico_serious'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 2400,
  horoyoiCleared: ['polka', 'selina', 'grano'], ownedItems: OWN, unlockedNotes: ['bluff_basic', 'board_danger', 'range_basic', 'tell', 'pot_odds'],
  panyuSkills: { senseLevel: 2, rangeLevel: 1, breakLevel: 1 }, panyuComboMultiplier: 2, equippedRicoOutfit: 'bunny', equippedCardSkin: 'red_gold', equippedTableSkin: 'neon', equippedMimiSkin: 'pink', shopSeenItems: [] };
const { page, close, exceptions } = await openSession({ width: W, height: H, mobile: PHONE, speed: 2, save: SAVE });
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
const report = { size: `${W}x${H}`, groups: {}, items: {}, mismatch: [], exceptions: [] };
const measure = async () => { const r = await page.eval(STD); const c = typeof r === 'string' ? JSON.parse(r) : r; return ['covered', 'tiny', 'body', 'off', 'clip', 'overflowBox', 'safe', 'broken'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k]).slice(0, 260)); };
try {
  for (let i = 0; i < 80 && !(await page.eval('typeof render === "function" && typeof save === "object" && typeof bindShop === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await ev(`state.screen = 'shop'; render(); return true;`);
  await sleep(PHONE ? 4000 : 6000);
  const groups = JSON.parse(await ev(`return JSON.stringify(SHOP3_GROUPS.map(g => g.id));`));
  for (const g of groups) {
    await ev(`const b = document.querySelector('.sh3-cat[data-g="${g}"]'); if (b && !b.classList.contains('is-on')) b.click(); return true;`);
    await sleep(1800);
    await page.screenshot(path.join(OUT, `${g}.png`));
    report.groups[g] = await measure();
    console.log(g, report.groups[g].join(' ') || '基準 0');
    const ids = JSON.parse(await ev(`return JSON.stringify([...document.querySelectorAll('.sh3-card')].map(c => c.dataset.sh3));`));
    for (const id of ids) {
      const st = JSON.parse(await ev(`
        const it = SHOP_ITEMS.find(i => i.id === ${JSON.stringify(id)});
        const c = document.querySelector('.sh3-card[data-sh3="${id}"]');
        const unlocked = isShopItemUnlocked(it.id);
        if (unlocked) { c.click(); }
        return JSON.stringify({ unlocked, owned: isItemOwned(it.id), inSave: save.ownedItems.includes(it.id), cardOwned: c.classList.contains('is-owned'), back: c.classList.contains('is-back'),
          cap: (c.querySelector('.sh3-cap') || {}).textContent || '', price: it.price, clearBonus: !!it.clearBonus });`));
      if (!st.unlocked) { report.items[id] = { back: st.back, cap: st.cap }; continue; }
      await sleep(350);
      const stage = JSON.parse(await ev(`return JSON.stringify({ buy: (document.querySelector('.sh3-buy') || {}).textContent || '', cls: (document.querySelector('.sh3-buy') || {}).className || '', name: (document.querySelector('.sh3-name') || {}).textContent || '', kick: (document.querySelector('.sh3-kick') || {}).textContent || '', desc: (document.querySelector('.sh3-desc') || {}).textContent || '' });`));
      const bad = await measure();
      const mm = [];
      if (st.owned !== st.cardOwned) mm.push(`札の入手済(${st.cardOwned})≠所持(${st.owned})`);
      if (st.owned && !/入手済|観る|読む|聴く|遊ぶ|再生|停止/.test(stage.buy)) mm.push(`所持なのに台が「${stage.buy}」`);
      if (!st.owned && !st.clearBonus && !stage.buy.replace(/,/g, '').includes(String(st.price))) mm.push(`値段${st.price}が台に無い「${stage.buy}」`);
      if (!st.owned && /入手済/.test(stage.buy)) mm.push('未所持なのに入手済');
      report.items[id] = { ...st, stage, bad, mm };
      if (mm.length) report.mismatch.push(id + ' ' + mm.join(' / '));
      if (bad.length || mm.length) { console.log('  ', id, mm.join(' / '), bad.join(' ')); await page.screenshot(path.join(OUT, `${g}__${id}.png`)); }
    }
  }
  report.exceptions = exceptions.concat(JSON.parse(await page.eval('JSON.stringify(window.__QA.errors)')));
  console.log('食い違い', report.mismatch.length, '例外', report.exceptions.length, JSON.stringify(report.exceptions).slice(0, 600));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
} finally { await close(); }
