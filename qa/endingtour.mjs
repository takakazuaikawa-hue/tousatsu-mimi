// クリアからエンディング・スタッフロール・締め・ホームまでを本物の流れで通し、見え方が変わるたびに撮って
// 「押せない・小さい・はみ出し・絵文字・壊れた画像」を数える。node qa/endingtour.mjs [pc|phone] [outDir]
// 流れ：Ⅴヴェルベットに勝った結果 → 幕間へ → 幕間の会話 → エンディングの題 → 曲の確認（流さない）→ 本編 → スタッフロール
//       → 締め → ロビーへ戻る → ホーム（5勝・開幕の儀）→ コレクションのクリア特典 → スタッフロール再生
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const phone = mode === 'phone';
const OUT = path.resolve(process.argv[3] || `qa/out/endingtour/${mode}`);
fs.mkdirSync(OUT, { recursive: true });
const W = phone ? 844 : 1280, H = phone ? 390 : 800;
const FOUR = ['rico_tutorial', 'polka', 'selina', 'grano'];
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
    if (r.right <= 0 || r.bottom <= 0 || r.left >= VW || r.top >= VH) continue;
    if (getComputedStyle(e).pointerEvents === 'none') continue;
    const cx = Math.min(VW - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(VH - 1, Math.max(0, r.top + r.height / 2));
    const t = document.elementFromPoint(cx, cy);
    if (t && t !== e && !e.contains(t) && !t.contains(e)) covered.push(label(e) + ' ← ' + ((t.className && typeof t.className === 'string') ? t.className.split(' ')[0] : t.tagName));
    if (r.width < 43.5 || r.height < 43.5) small.push(label(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) off.push(label(e));
  }
  const tiny = [], emoji = [], texts = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const seen = new Set();
  const EMO = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F2FF}]/u;
  while ((n = tw.nextNode())) { const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el || seen.has(el) || !vis(el)) continue; seen.add(el);
    const rg = document.createRange(); rg.selectNodeContents(n); const rr = rg.getClientRects()[0]; if (!rr || rr.width < 2) continue;
    if (rr.right <= 0 || rr.bottom <= 0 || rr.left >= VW || rr.top >= VH) continue;
    texts.push(t.slice(0, 30));
    if (EMO.test(t)) emoji.push(t.slice(0, 20));
    const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el); if (px < 10.95) tiny.push(t.slice(0, 16) + ' ' + px.toFixed(1)); }
  const broken = [...document.images].filter(im => im.src && vis(im) && im.complete && !im.naturalWidth).map(im => im.src.split('/').slice(-2).join('/'));
  const btns = taps.filter(e => e.tagName === 'BUTTON').map(label).slice(0, 12);
  return { screen: state.screen, covered, small, off, tiny, emoji, broken, btns, sig: btns.join('|') + '#' + texts.slice(0, 40).join('|') };
})()`;

const report = [];
let idx = 0;
async function snap(name) {
  idx++;
  const file = `${String(idx).padStart(3, '0')}_${name}.png`;
  let r = null;
  try { r = await page.eval(CHECK); } catch (e) { r = { error: String(e.message).slice(0, 120) }; }
  try { await page.screenshot(path.join(OUT, file)); } catch {}
  r.name = name; r.file = file; delete r.sig; report.push(r);
  console.log(file, JSON.stringify({ btns: r.btns, covered: r.covered?.length, small: r.small?.length, tiny: r.tiny?.length, off: r.off?.length, emoji: r.emoji, broken: r.broken?.length }));
}
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 120)));

// 見え方が変わって落ち着くたびに撮り、決まった順の「進める」物を押す。stopWhen が真になったら終わる
async function drive(tag, { stopWhen, maxMs = 240000, press = [], avoid = /スキップ|SKIP/, tapAnywhere = false } = {}) {
  const t0 = Date.now(); let prev = null, stable = 0, lastShot = 0, shots = 0, lastPress = Date.now();
  while (Date.now() - t0 < maxMs) {
    const m = await page.eval(CHECK).catch(() => null);
    if (m) {
      if (m.sig === prev) stable++; else { stable = 0; prev = m.sig; }
      if ((stable === 1 || Date.now() - lastShot > 6000) && shots < 60) { await snap(`${tag}_${m.screen}`); lastShot = Date.now(); shots++; }
      if (stopWhen && await page.eval(stopWhen).catch(() => false)) return true;
      if (stable >= 2 || Date.now() - lastPress > 4500) {
        // 押す候補：文言の決まった順に探す
        const pick = await page.eval(`(() => {
          const press = ${JSON.stringify(press.map(r => r.source))}.map(s => new RegExp(s));
          const avoid = new RegExp(${JSON.stringify(avoid.source)});
          const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || +cs.opacity < .2) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
          const all = [...document.querySelectorAll('button, [data-action], [role=button], .ims-dialogue, .ims-cg, .ep-title-overlay, [class*="tap"]')].filter(ok);
          for (const re of press) { const e = all.find(e => re.test((e.textContent || '') + ' ' + (e.className || '')) && !avoid.test(e.textContent || '')); if (e) { const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, t: (e.textContent || e.className).trim().slice(0, 16) }); } }
          return null; })()`).catch(() => null);
        if (pick) { const o = JSON.parse(pick); await page.click(o.x, o.y); stable = 0; lastPress = Date.now(); console.log("press", o.t); }
        else if (tapAnywhere && stable >= 7 && Date.now() - lastPress > 7000) { await page.click(W / 2, H * 0.62); lastPress = Date.now(); console.log("press (画面)"); }
      }
    }
    await sleep(900);
  }
  console.log('TIMEOUT', tag);
  return false;
}

// 1) Ⅴヴェルベットに勝った結果
await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(FOUR)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages, 'velvet']; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = 4; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; saveProgress()`);
await ev(`state = defaultState(); startBattle('velvet')`); await sleep(4500);
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click()`); await sleep(700); }
await ev(`document.querySelectorAll('.read-battle-host,.battle-modal-overlay').forEach(e => e.remove()); state.psychPending = false; state.handNumber = 12; state.psychSuccessCount = 3; state.goodFolds = 2; state.playerChips = 4000; state.opponentChips = 0; endBattle()`);
await sleep(7000); await snap('result_velvet_win');

// 2) 幕間 → エンディングの題 → 曲の確認 → 本編 → スタッフロール → 締め
await drive('ending', {
  press: [/幕間へ/, /開始/, /流さない/, /ims-dialogue/, /ims-cg/, /つづける|続ける|次へ|進む|タップ|はじめる|閉じる/],
  stopWhen: `!!document.querySelector('.ending-final-buttons button')`, tapAnywhere: true,
  maxMs: 420000,
});
await sleep(2500); await snap('epilogue');

// 3) ロビーへ戻る → ホーム（5勝・開幕の儀）
await ev(`document.querySelector('.ending-final-buttons [data-action="back-lobby"]')?.click()`);
await drive('home', { press: [], stopWhen: `!!document.querySelector('.h15-ticket .h15-en') && !document.querySelector('.h15-rite, .home-rite, [class*="ceremony"]')`, maxMs: 30000 });
await sleep(6000); await snap('home_after_clear');
console.log('save', await page.eval(`JSON.stringify({ cleared: save.clearedStages, stage: save.homeStageSeen, ending: save.endingSeen ?? save.endingWatched ?? null, coins: save.coins })`).catch(() => ''));

// 4) コレクションのクリア特典（エンディング・主題歌・スタッフロール）と交換所の思い出の棚
await ev(`onAction({ currentTarget: { dataset: { action: 'open-collection' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(1800); await snap('collection');
const tabs = await page.eval(`JSON.stringify([...document.querySelectorAll('.collection-overlay [role=tab], .collection-overlay .coll-tab, .collection-overlay button[data-tab]')].map(b => (b.textContent || '').trim().slice(0, 10)))`).catch(() => '[]');
const tl = JSON.parse(tabs); console.log('collection tabs', tl);
for (let i = 1; i < tl.length; i++) { await ev(`[...document.querySelectorAll('.collection-overlay [role=tab], .collection-overlay .coll-tab, .collection-overlay button[data-tab]')][${i}]?.click()`); await sleep(1000); await snap('collection_tab' + i); }
await ev(`document.querySelectorAll('.collection-overlay').forEach(e => e.remove())`);
await ev(`onAction({ currentTarget: { dataset: { action: 'open-shop' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(2500);
await ev(`document.querySelector('.shop-cat-btn[data-cat="memory"]')?.click()`); await sleep(1200); await snap('shop_memory');
await ev(`onAction({ currentTarget: { dataset: { action: 'play-credits' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
await sleep(5000); await snap('credits_replay_a'); await sleep(15000); await snap('credits_replay_b');

const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: [...errors, ...session.exceptions], dialogs: session.dialogs, report }, null, 1));
console.log('errors', JSON.stringify([...errors, ...session.exceptions]).slice(0, 800));
await session.close();
