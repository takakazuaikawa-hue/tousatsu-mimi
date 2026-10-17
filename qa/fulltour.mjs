// 全部の画面と小窓を順に開いて撮り、各場面で「見えているのに押せない（他の物に隠れている）ボタン」「押す所 44px 未満」
// 「文字 11px 未満」「画面からのはみ出し」「壊れた画像」を数える。node qa/fulltour.mjs [pc|phone] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const phone = mode === 'phone';
const OUT = path.resolve(process.argv[3] || `qa/out/fulltour/${mode}`);
fs.mkdirSync(OUT, { recursive: true });
const W = phone ? 844 : 1280, H = phone ? 390 : 800;
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: W, height: H, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 40 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);

const CHECK = `(() => {
  const VW = innerWidth, VH = innerHeight;
  const vis = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.title || e.className || '').replace(/\\s+/g, ' ').trim()).slice(0, 24);
  const taps = [...document.querySelectorAll('button, [data-action], [role=button], a[href], input, select')].filter(e => !e.disabled && vis(e));
  const covered = [], small = [], off = [];
  for (const e of taps) {
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= VW || r.top >= VH) { continue; }
    if (getComputedStyle(e).pointerEvents === 'none') continue;
    const cx = Math.min(VW - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(VH - 1, Math.max(0, r.top + r.height / 2));
    const t = document.elementFromPoint(cx, cy);
    if (t && t !== e && !e.contains(t) && !t.contains(e)) covered.push(label(e) + ' ← ' + ((t.className && typeof t.className === 'string') ? t.className.split(' ')[0] : t.tagName));
    if (r.width < 43.5 || r.height < 43.5) small.push(label(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) off.push(label(e));
  }
  const tiny = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const seen = new Set();
  while ((n = tw.nextNode())) { const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el || seen.has(el) || !vis(el)) continue; seen.add(el);
    const rg = document.createRange(); rg.selectNodeContents(n); const rr = rg.getClientRects()[0]; if (!rr || rr.width < 2) continue;
    if (rr.right <= 0 || rr.bottom <= 0 || rr.left >= VW || rr.top >= VH) continue;
    const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el); if (px < 10.95) tiny.push(t.slice(0, 16) + ' ' + px.toFixed(1)); }
  const broken = [...document.images].filter(im => im.src && vis(im) && im.complete && !im.naturalWidth).map(im => im.src.split('/').slice(-2).join('/'));
  return { screen: state.screen, covered, small, off, tiny, broken, scrollX: document.documentElement.scrollWidth > VW };
})()`;
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
  console.log(name, JSON.stringify({ covered: r.covered?.length, small: r.small?.length, tiny: r.tiny?.length, off: r.off?.length, broken: r.broken?.length }));
}
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 120)));
const act = (action, data = {}) => ev(`onAction({ currentTarget: { dataset: ${JSON.stringify({ action, ...data })} }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
const closeAll = () => ev(`document.querySelectorAll('[class*="-overlay"], .home-overlay, .modal-overlay, .read-battle-host').forEach(e => { if (!e.closest('.home-stage') && e.id !== 'preload-overlay') e.remove(); })`);
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
await closeAll(); await ev(`state = defaultState(); state.screen = 'ending'; render()`); await sleep(4000); await snap('ending');
await act('play-credits'); await sleep(4000); await snap('credits');
await closeAll(); await lobby(); await act('play-minipoker'); await sleep(2500); await snap('minipoker');
// 衣装を替えたホーム
await closeAll(); await setSave(ALL, 'save.ownedItems = RICO_OUTFITS.map(o => o.id).filter(Boolean); save.equippedRicoOutfit = (RICO_OUTFITS.find(o => o.file !== "rico_default.webp") || {}).id || "default"'); await lobby(); await sleep(1500); await snap('home_costume');

const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: [...errors, ...session.exceptions], report }, null, 1));
console.log('errors', JSON.stringify([...errors, ...session.exceptions]).slice(0, 800));
await session.close();
