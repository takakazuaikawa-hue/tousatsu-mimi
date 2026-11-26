// 小窓の枠と飾りのずれを撮って測る。node qa/modalframe.mjs <outDir>
// 3つの大きさ（PC 1280x800・スマホ横 844x390・667x375）で、主な小窓を1つずつ開いて撮る。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const out = path.resolve(process.argv[2] || 'qa/out/modalframe');
fs.mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;

const SIZES = [
  { name: 'pc', w: 1280, h: 800, mobile: false },
  { name: 'p844', w: 844, h: 390, mobile: true },
  { name: 'p667', w: 667, h: 375, mobile: true },
];
const CLEAR = '.tutorial-overlay,.qa-lec,.pack-overlay,.home-overlay,.collection-overlay,.settings-overlay,.equip-overlay,.episode-overlay,.login-bonus-overlay,.glossary-overlay,.hand-guide-overlay,.hand-history-overlay,.rico-mode-overlay,.newgame-overlay,.mimi-confirm-overlay,.note-article-overlay,.rule-primer-overlay,.char-profile-overlay,.ending-prompt-overlay';
const MODALS = [
  ['pack', `MimiPack.openPanel('panel')`],
  ['settings', `showSettingsModal()`],
  ['confirm', `showConfirm({title:'確認',body:'セーブを消しますか？\\nこの操作は戻せません。',ok:'消す',cancel:'やめる',danger:true})`],
  ['credits', `showCreditsPanel()`],
  ['transfer', `showSaveTransfer()`],
  ['newgame', `showNewGameModal()`],
  ['equip', `showEquipModal()`],
  ['collection', `showCollectionModal()`],
  ['glossary', `showGlossaryModal()`],
  ['handguide', `showHandGuide()`],
  ['history', `showHandHistoryModal()`],
  ['ricomode', `showRicoModeChooser()`],
  ['profile', `showCharacterProfile('polka')`],
  ['primer', `showRulePrimer(()=>{})`],
  ['endmusic', `showEndingMusicPrompt()`],
  ['tutorial', `showTutorial('intro','<p>ポーカーは5枚で役を作る遊びよ。まずは配られた2枚を見てね。</p>',()=>{})`],
  // 講義の窓は流れが長いので、同じ class の窓を舞台に置いて枠だけを見る
  ['lecture', `(() => { const o=document.createElement('div'); o.className='battle-modal-overlay qa-lec'; o.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:500;background:rgba(0,0,0,.6)'; o.innerHTML='<div class="psych-modal lecture-mode" style="width:520px;max-width:90%;display:flex;flex-direction:column"><div class="psych-title">リコの講義</div><p style="margin:8px 0">相手の賭け方から、手の強さを読んでみよう。</p></div>'; (document.querySelector('html.is-compact')?document.body:document.getElementById('stage')).appendChild(o); })()`],
];

const report = [];
for (const sz of SIZES) {
  const session = await openSession({ width: sz.w, height: sz.h, mobile: sz.mobile, speed: 1 });
  const { page } = session;
  try {
    await page.eval(`window.MimiAssets ? window.MimiAssets.warm(window.MimiAssets.sets.lobby(),{front:true}).then(()=>true) : true`).catch(() => {});
    await page.eval(`(() => {
      save = defaultSave(); save.introPlayed=true; save.clearedStages=['rico_tutorial','polka','selina']; save.firstClearRewardClaimed=[...save.clearedStages]; save.rewardCgSeen=[...save.clearedStages]; save.coins=850; save.loginBonus={lastDate:mpTodayKey(),streak:1};
      state=defaultState(); state.screen='lobby'; render(); return true; })()`);
    await sleep(2500);
    for (const [name, open] of MODALS) {
      if (only && !only.includes(name)) continue;
      await page.eval(`document.querySelectorAll(${JSON.stringify(CLEAR)}).forEach(e=>e.remove()); true`);
      try { await page.eval(`(() => { ${open}; return true; })()`); } catch (e) { report.push({ size: sz.name, name, error: String(e).slice(0, 200) }); continue; }
      await page.eval('document.fonts.ready.then(()=>true)');
      await sleep(1100);
      const m = await page.eval(`(() => {
        const sel = '.tutorial-bubble,.psych-modal,.pack-modal,.settings-modal,.mimi-confirm,.newgame-modal,.equip-modal,.collection-modal,.glossary-modal,.hand-guide-panel,.hand-history-modal,.rico-mode-modal,.char-profile-modal,.rp-card,.ending-prompt-modal,.note-article-panel';
        const els = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length);
        return els.map(el => {
          const cs = getComputedStyle(el), r = el.getBoundingClientRect();
          const pe = (p) => { const c = getComputedStyle(el, p); return c.content && c.content !== 'none' ? { content: c.content.slice(0, 30), inset: [c.top, c.right, c.bottom, c.left].join(' '), w: c.width, h: c.height, pos: c.position, bg: c.backgroundImage.slice(0, 60), border: c.borderImageSource.slice(0, 60) + ' ' + c.borderWidth, transform: c.transform } : null; };
          return { cls: el.className, rect: [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10), border: cs.borderWidth, bimg: cs.borderImageSource.slice(0, 60), bslice: cs.borderImageSlice, bwidth: cs.borderImageWidth, bout: cs.borderImageOutset, bgclip: cs.backgroundClip, zoom: cs.zoom, transform: cs.transform, scale: cs.scale, before: pe('::before'), after: pe('::after') };
        });
      })()`);
      report.push({ size: sz.name, name, modals: m });
      await page.screenshot(path.join(out, `${sz.name}-${name}.png`));
    }
  } finally {
    await session.close();
  }
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log('done', out);
