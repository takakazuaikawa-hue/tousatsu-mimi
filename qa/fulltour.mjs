// 全部の画面と小窓を順に開いて撮り、スマホ版の基準（docs/design-ref/mobile-standard.md）で数える（qa/lib/stdcheck.mjs）：
// 隠れて押せない・押す所44px未満・文字12px未満（PCは11px）・本文14px未満・左右47pxの安全域・はみ出し・切れ・黒い帯・壊れた画像。
// node qa/fulltour.mjs [pc|phone] [outDir] [--size 844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck, countsOf, comfortOf } from './lib/stdcheck.mjs';
const mode = process.argv[2] || 'pc';
const phone = mode === 'phone';
const sizeArg = process.argv.find((a, i) => process.argv[i - 1] === '--size') || (phone ? '844x390' : '1280x800');
const OUT = path.resolve(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : `qa/out/fulltour/${mode}${phone ? '-' + sizeArg : ''}`);
fs.mkdirSync(OUT, { recursive: true });
const [W, H] = sizeArg.split('x').map(Number);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: W, height: H, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 40 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);

// 2026-10-21 基準を上げた（最小14px・本文16px。docs/design-ref/typography.md）。QA_MIN / QA_BODY で上書きできる
const CHECK = stdCheck({ phone, minText: +(process.env.QA_MIN || 14), bodyMin: +(process.env.QA_BODY || 16) });
const report = [];
let idx = 0;
async function snap(name) {
  await page.eval('Promise.all([...document.images].filter(i=>i.src && !i.complete).map(i=>i.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)').catch(() => {});
  await sleep(700);
  idx++;
  const file = `${String(idx).padStart(2, '0')}_${name}.png`;
  let r = null;
  try { r = await page.eval(CHECK); } catch (e) { r = { error: String(e.message).slice(0, 120) }; }
  await page.screenshot(path.join(OUT, file));
  r.name = name; r.file = file; report.push(r);
  r.comfort = comfortOf(r, phone ? {} : { note: 15, allowed: [14, 15, 18, 19, 22, 26], display: 30 });
  console.log(name, JSON.stringify(countsOf(r)), '快適', JSON.stringify(r.comfort));
}
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 120)));
const act = (action, data = {}) => ev(`onAction({ currentTarget: { dataset: ${JSON.stringify({ action, ...data })} }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
const closeAll = () => ev(`document.querySelectorAll('[class*="-overlay"], .home-overlay, .modal-overlay, .read-battle-host, .credits-roll, [class*="credits-"], .as-host, .pv2-root').forEach(e => { if (!e.closest('.home-stage') && e.id !== 'preload-overlay') e.remove(); })`);
const setSave = (cleared, extra = '') => ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(cleared)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; ${extra}; saveProgress()`);
const lobby = async () => { await closeAll(); await ev(`state = defaultState(); state.screen = 'lobby'; render()`); for (let i = 0; i < 30 && !(await page.eval('!!document.querySelector(".h15-ticket .h15-en")')); i++) await sleep(500); await sleep(1500); };

// タイトル
await setSave([], 'save.introPlayed = false'); await ev(`state = defaultState(); render()`); await sleep(3000); await snap('title_new');
await setSave(['rico_tutorial', 'polka', 'selina']); await ev(`state = defaultState(); render()`); await sleep(2500); await snap('title_continue');
// ホームと小窓
await setSave(['rico_tutorial', 'polka', 'selina']);
await lobby(); await snap('home');
for (const [a, d, name] of [
  ['home-ledger', {}, 'ledger'], ['home-settings', {}, 'home_settings'], ['open-settings', {}, 'game_settings'], ['equip-change', {}, 'equip'],
  ['open-collection', {}, 'collection'], ['open-rico-viewer', {}, 'rico_viewer'], ['char-profile', { char: 'polka' }, 'profile_polka'], ['char-profile', { char: 'velvet' }, 'profile_velvet'],
  ['rico-mode-chooser', {}, 'rico_mode'], ['open-glossary', {}, 'glossary'], ['open-history', {}, 'history'], ['show-hand-guide', {}, 'hand_guide'],
]) { await lobby(); await act(a, d); await sleep(1500); await snap(name); }
// ログインボーナス
await setSave(['rico_tutorial', 'polka'], 'save.loginBonus = { lastDate: "2000-01-01", streak: 3 }'); await lobby(); await closeAll(); await act('home-gift'); await sleep(1500); await snap('login_bonus');
// 交換所（各タブ）
await setSave(['rico_tutorial', 'polka', 'selina']); await lobby(); await act('open-shop'); await sleep(2500); await snap('shop');
for (const cat of ['note', 'skin', 'stack', 'memory']) { await ev(`document.querySelector('.shop-cat-btn[data-cat="${cat}"]')?.click()`); await sleep(900); await snap('shop_' + cat); }
// コレクションのタブ
await lobby(); await act('open-collection'); await sleep(1500);
const tabs = await page.eval(`JSON.stringify([...document.querySelectorAll('.collection-overlay [role=tab], .collection-overlay .coll-tab, .collection-overlay button[data-tab]')].map((b,i)=>i))`).catch(() => '[]');
for (const i of JSON.parse(tabs).slice(1, 6)) { await ev(`[...document.querySelectorAll('.collection-overlay [role=tab], .collection-overlay .coll-tab, .collection-overlay button[data-tab]')][${i}]?.click()`); await sleep(900); await snap('collection_tab' + i); }
// ぱにゅぱにゅ（無料）
await lobby(); await act('panyu-free'); await sleep(5000); await snap('panyu_free');
// 対戦：始まり・卓・賭け額・役の一覧
await closeAll(); await setSave(['rico_tutorial', 'polka', 'selina']);
await ev(`state = defaultState(); startBattle('grano')`); await sleep(4500); await snap('battle_intro');
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click()`); await sleep(800); }
for (let i = 0; i < 40; i++) { if (await page.eval(`!!(state.isPlayerTurn)`)) break; await sleep(500); }
await sleep(1200); await snap('table_turn');
await ev(`state.betChooserOpen = true; render()`); await sleep(900); await snap('table_bet');
await ev(`state.betChooserOpen = false; render()`); await act('show-hand-guide'); await sleep(1200); await snap('table_hand_guide');
await closeAll(); await ev(`document.querySelectorAll('.hand-guide-overlay,.modal-overlay').forEach(e=>e.remove())`);
// 結果（勝ち・負け）
for (const won of [true, false]) {
  await closeAll(); await ev(`state = defaultState(); startBattle('selina')`); await sleep(4000);
  for (let i = 0; i < 6; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click()`); await sleep(700); }
  await ev(`document.querySelectorAll('.read-battle-host,.battle-modal-overlay').forEach(e => e.remove()); state.psychPending = false; state.handNumber = 9; state.playerChips = ${won ? 3000 : 0}; state.opponentChips = ${won ? 0 : 3000}; endBattle()`);
  await sleep(7000); await snap(won ? 'result_win' : 'result_lose');
}
// 幕間・回想・エンディング
await closeAll(); await setSave(ALL); await lobby();
await act('recall-episode', { episode: 'polka' }); await sleep(3500); await snap('recall_polka');
await closeAll(); await lobby(); await act('play-minipoker'); await sleep(2500); await snap('minipoker');

// ファイブポーカー：配る → 交換を選ぶ → 交換 → 結果
const clickSel = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.click()`);
await ev(`document.querySelectorAll('[class*="mp-tut"]').forEach(e => e.remove())`);
await clickSel('.minipoker-overlay [data-mp="deal"]'); await sleep(3500); await snap('minipoker_choose');
await clickSel('.minipoker-overlay [data-mp="hold-all"]'); await sleep(6000); await snap('minipoker_result');
await clickSel('.minipoker-overlay [data-mp="missions"]'); await sleep(900); await snap('minipoker_missions');
// 零時の卓：入場案内 → 着席 → ミミの手番 → 額の選択 → ブラインド表 → メニュー
await closeAll(); await setSave(ALL, 'save.bestRanks = { rico_tutorial:"A", polka:"A", selina:"B", grano:"A", velvet:"A" }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }'); await lobby();
await act('allstar-open'); await sleep(1200); await snap('allstar_entry');
await clickSel('.as-entry [data-action="allstar-seat"]');
for (let i = 0; i < 160 && !(await page.eval('!!(window.AllstarUI && AllstarUI._qa && AllstarUI._qa.waiting())').catch(() => false)); i++) await sleep(250);
await sleep(600); await snap('allstar_turn');
await clickSel('.as-raise:not(:disabled)'); await sleep(700); await snap('allstar_sizer');
await clickSel('.as-sizer .as-back'); await clickSel('.as-clock'); await sleep(600); await snap('allstar_levels');
await ev('AllstarUI._qa.closePops()'); await clickSel('.as-tool[data-as="menu"]'); await sleep(600); await snap('allstar_menu');
await clickSel('.as-menu [data-as="leave"]'); await sleep(1500);
// 衣装を替えたホーム
await closeAll(); await setSave(ALL, 'save.ownedItems = RICO_OUTFITS.map(o => o.id).filter(Boolean); save.equippedRicoOutfit = (RICO_OUTFITS.find(o => o.file !== "rico_default.webp") || {}).id || "default"'); await lobby(); await sleep(1500); await snap('home_costume');
// エンディング・スタッフロール（終わりの演出が後の場面に残らないよう最後に）
await closeAll(); await ev(`state = defaultState(); state.screen = 'ending'; render()`); await sleep(4000); await snap('ending');
await act('play-credits'); await sleep(4000); await snap('credits');

const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: [...errors, ...session.exceptions], report }, null, 1));
const tot = {}; for (const r of report) for (const [k, v] of Object.entries(countsOf(r))) tot[k] = (tot[k] || 0) + v;
fs.writeFileSync(path.join(OUT, 'summary.md'), [`# ${mode} ${sizeArg}`, '', '| 場面 | ' + Object.keys(tot).join(' | ') + ' |', '|--|' + Object.keys(tot).map(() => '--').join('|') + '|', ...report.map(r => `| ${r.name} | ${Object.values(countsOf(r)).join(' | ')} |`), `| 合計 | ${Object.values(tot).join(' | ')} |`].join('\n'));
console.log('TOTAL', JSON.stringify(tot));
console.log('errors', JSON.stringify([...errors, ...session.exceptions]).slice(0, 800));
await session.close();
