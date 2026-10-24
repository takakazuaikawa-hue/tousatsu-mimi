// 卓を開き、指定した要素の文字の大きさを決めている CSS の規則を全部出す（調べ用）。
// QA_SIZE=844x390 node qa/fontwho.mjs ".t8-ante-k" ".v2-st-kana" ...
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const sels = process.argv.slice(2);
const session = await openSession({ width: w, height: h, mobile: true, speed: 1 });
const { page } = session;
const WHO = (sel) => String.raw`(() => {
  const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'なし ' + ${JSON.stringify(sel)};
  const hits = [];
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    const walk = (rs, media) => { for (const x of rs) {
      if (x.cssRules && !x.selectorText) { if (!x.media || matchMedia(x.media.mediaText).matches) walk(x.cssRules, x.media ? x.media.mediaText : media); continue; }
      try { if (x.selectorText && x.style && x.style.fontSize && el.matches(x.selectorText)) hits.push((sh.href || 'inline').split('/').pop().split('?')[0] + (media ? ' @' + media : '') + ' :: ' + x.selectorText.slice(0, 140) + ' => ' + x.style.fontSize + (x.style.getPropertyPriority('font-size') ? ' !important' : '')); } catch (e) {}
    } };
    walk(rules, '');
  }
  const k = el.getBoundingClientRect().width / (el.offsetWidth || 1);
  return ${JSON.stringify(sel)} + '  計算 ' + getComputedStyle(el).fontSize + ' × 縮み ' + k.toFixed(3) + (el.style.fontSize ? '  直書き ' + el.style.fontSize : '') + '\n    ' + hits.join('\n    ');
})()`;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await page.eval(`(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = [...save.clearedStages]; state = defaultState(); if (${!!process.env.QA_HOME}) { state.screen = 'lobby'; render(); } else startBattle('grano'); return true; })()`);
  await sleep(4500);
  for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await sleep(800); }
  for (let i = 0; i < 40; i++) { if (await page.eval(`!!(state.isPlayerTurn)`)) break; await sleep(500); }
  if (process.env.QA_BET) { await page.eval(`(() => { state.betChooserOpen = true; render(); return true; })()`); await sleep(900); }
  if (process.env.QA_GUIDE) { await page.eval(`(() => { onAction({ currentTarget: { dataset: { action: 'show-hand-guide' } }, preventDefault(){}, stopPropagation(){}, target: document.body }); return true; })()`); await sleep(1200); }
  await sleep(1000);
  for (const s of sels) console.log(await page.eval(WHO(s)));
} finally { await session.close(); }
