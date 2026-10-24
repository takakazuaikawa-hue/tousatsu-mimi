// 零時の卓の撮影：ホーム（入口）→ 入場案内 → 開幕 → 数ハンド（ミミの手番・額の選択・相手の手番・ショーダウン）
// → 中断して「続きから」→ 脱落 → 決勝 → 優勝 → 結果 → 記録、を PC 1280x800 とスマホ横 844x390 で撮る。
// 各場面で「見えているのに押せない」「押す所 44px 未満」「文字 11px 未満」「画面からのはみ出し」「壊れた画像」を数える（fulltour.mjs の CHECK と同じ）。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/allstarshot.mjs [pc|phone|both] [outDir]
// 検査ブラウザは同時に1つだけ（both でも PC → スマホの順に1つずつ開く）。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const mode = process.argv[2] || 'both';
const OUT_ROOT = path.resolve(process.argv[3] || 'qa/out/allstar');
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];

const CHECK = `(() => {
  const VW = innerWidth, VH = innerHeight;
  const vis = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.title || e.className || '').replace(/\\s+/g, ' ').trim()).slice(0, 24);
  const taps = [...document.querySelectorAll('button, [data-action], [data-as], [role=button], a[href], input, select')].filter(e => !e.disabled && vis(e));
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
  // はみ出し：零時の卓の文字が自分の箱からはみ出している所（横）
  const clip = [];
  document.querySelectorAll('.as-host :is(.as-name, .as-stack, .as-sub-text, .as-res-name, .as-res-hand, .as-verb, .as-amt, .as-head-1, .as-head-2, .as-lv, .as-left), .as-dialog :is(li, b, span)').forEach(el => {
    if (!vis(el) || !(el.textContent || '').trim() || el.children.length) return; if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') clip.push((el.textContent || '').trim().slice(0, 14));
  });
  const broken = [...document.images].filter(im => im.src && vis(im) && im.complete && !im.naturalWidth).map(im => im.src.split('/').slice(-2).join('/'));
  return { screen: state.screen, covered, small, off, tiny, clip, broken, scrollX: document.documentElement.scrollWidth > VW };
})()`;

async function tour(kind) {
  const phone = kind === 'phone';
  const OUT = path.join(OUT_ROOT, kind);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const W = phone ? 844 : 1280, H = phone ? 390 : 800;
  const session = await openSession({ width: W, height: H, mobile: phone, speed: 2 });
  const { page } = session;
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && !!window.AllstarUI').catch(() => false)); i++) await sleep(500);
  const report = [];
  let idx = 0;
  const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 160)));
  const val = (js) => page.eval(js).catch(() => null);
  async function snap(name, settle = 500) {
    await page.eval('Promise.all([...document.images].filter(i=>i.src && !i.complete).map(i=>i.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)').catch(() => {});
    await sleep(settle);
    idx++;
    const file = `${String(idx).padStart(2, '0')}_${name}.png`;
    let r = null;
    try { r = await page.eval(CHECK); } catch (e) { r = { error: String(e.message).slice(0, 160) }; }
    await page.screenshot(path.join(OUT, file));
    r.name = name; r.file = file; report.push(r);
    console.log(kind, name, JSON.stringify({ covered: r.covered?.length, small: r.small?.length, tiny: r.tiny?.length, off: r.off?.length, clip: r.clip?.length, broken: r.broken?.length }));
  }
  const act = (action, data = {}) => ev(`onAction({ currentTarget: { dataset: ${JSON.stringify({ action, ...data })} }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
  const until = async (js, ms = 30000, step = 120) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
  const lobby = async () => { await ev(`document.querySelectorAll('.home-overlay').forEach(e => e.remove()); goLobby()`); await until('!!document.querySelector(".h15-ticket .h15-en")', 20000); await sleep(1800); };
  const Q = 'AllstarUI._qa';
  // ミミの手番を自動で進める（mode: auto=AI と同じ判断、passive=チェックか降りる、call=チェックかコール）
  let mimiMode = 'auto';
  let levelShot = false, drawShot = false;
  async function playUntil(cond, ms, onTurn) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await val(cond)) return true;
      if (!levelShot && await val(`!!document.querySelector('.as-banner:not(.is-calc):not(.out)') && ${Q}.T().handNo > 1`)) { levelShot = true; await snap('level_up', 150); }
      if (!drawShot && await val(`!!document.querySelector('.as-card.is-high')`)) { drawShot = true; await snap('button_draw', 0); }
      if (await val(`${Q}.waiting()`)) {
        if (onTurn && await onTurn()) continue;
        const m = mimiMode === 'passive' ? `(${Q}.T().hand && Allstar.legalActions(${Q}.T()) && Allstar.legalActions(${Q}.T()).canCheck ? 'call' : 'fold')` : JSON.stringify(mimiMode);
        await ev(`${Q}.actMimi(${m})`);
      }
      await sleep(100);
    }
    return false;
  }
  // ハンドの切れ目で持ち点を組み替える
  async function rigAtBoundary(stacksJs) {
    for (let i = 0; i < 400; i++) {
      const ok = await val(`(() => { const T = ${Q}.T(); if (!T || !T.hand || !T.hand.done) return false; return ${Q}.rig(${stacksJs}); })()`);
      if (ok) return true;
      if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi(${JSON.stringify(mimiMode === 'passive' ? 'fold' : mimiMode)})`);
      await sleep(40);
    }
    return false;
  }

  // ---- セーブ：全員に勝った（ヴェルベットは勝利の記録あり）＋零時の卓の解放 ----
  await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { rico_tutorial:'A', polka:'A', selina:'B', grano:'A', velvet:'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; saveProgress()`);
  await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(2500);
  await snap('home');
  // 入場案内
  await act('allstar-open'); await sleep(900); await snap('entry');
  // 着席 → 開幕
  await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
  await until('!!document.querySelector(".as-open.on")', 15000, 50);
  await sleep(250); await snap('opening_title', 100);
  await until('document.querySelector(".as-host") && document.querySelector(".as-host").dataset.op === "seats"', 8000, 50);
  await sleep(700); await snap('opening_seats', 100);
  await until('document.querySelector(".as-sub[data-on=\\"1\\"]")', 6000, 50); await snap('opening_line', 100);
  // 第1ハンド：ミミの手番
  await playUntil(`${Q}.waiting()`, 40000);
  await snap('mimi_turn');
  await ev(`document.querySelector('.as-raise:not(:disabled)')?.click()`); await sleep(500);
  await snap('sizer');
  await ev(`document.querySelector('.as-sizer .as-back')?.click()`);
  await ev(`document.querySelector('.as-clock').click()`); await sleep(400); await snap('levels');
  await ev(`${Q}.closePops()`);
  await ev(`document.querySelector('.as-seat[data-seat="5"] .as-win').click()`); await sleep(400); await snap('seat_pop');
  await ev(`${Q}.closePops()`);
  await ev(`${Q}.actMimi('call')`);
  // 相手の手番（スポット）とショーダウン
  if (await playUntil(`(() => { const h = document.querySelector('.as-host'); return h && h.dataset.turn && h.dataset.turn !== '0'; })()`, 20000)) await snap('ai_turn', 150);
  if (await playUntil(`!!document.querySelector('.as-bet[data-kind="show"][data-on="1"]')`, 90000)) await snap('showdown', 200);
  // 数ハンド進める
  await playUntil(`${Q}.T() && ${Q}.T().handNo >= 4`, 90000);
  await playUntil(`${Q}.waiting()`, 30000);
  await snap('hand4_turn');
  // やめる → ホームの「続きから」 → 再開
  await ev(`document.querySelector('.as-tool[data-as="menu"]').click()`); await sleep(400); await snap('menu');
  await ev(`document.querySelector('.as-menu [data-as="leave"]').click()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")', 20000); await sleep(2200);
  await snap('home_resume');
  await act('allstar-resume');
  await until('!!document.querySelector(".as-host .as-banner")', 15000, 50); await snap('resume', 150);
  // 脱落：リコ・ポルカ・セリナを短くする
  mimiMode = 'passive';
  await rigAtBoundary(`(() => { const T = ${Q}.T(); const live = T.players.filter(p => p.place == null); const tot = T.totalChips; const s = T.players.map(p => p.place == null ? p.stack : 0); s[1] = 25; s[2] = 25; s[3] = 25; const rest = tot - 75; s[0] = Math.floor(rest * 0.45 / 25) * 25; s[4] = Math.floor(rest * 0.2 / 25) * 25; s[5] = rest - s[0] - s[4]; return s; })()`);
  if (await playUntil(`!!document.querySelector('.as-cut.on')`, 120000)) { await snap('bust_cutin', 900); }
  await playUntil(`!!document.querySelector('.as-seat[data-state="out"]') && !document.querySelector('.as-cut')`, 30000);
  await snap('after_bust', 300);
  // 決勝：グラーノも短く。ミミとヴェルベットが残る
  await rigAtBoundary(`(() => { const T = ${Q}.T(); const s = T.players.map(p => p.place == null ? p.stack : 0); const out = [1,2,3,4].filter(i => T.players[i].place == null); out.forEach(i => s[i] = 25); const tot = T.totalChips - out.length * 25; s[0] = Math.floor(tot * 0.5 / 25) * 25; s[5] = tot - s[0]; return s; })()`);
  if (await playUntil(`!!document.querySelector('.as-final-slab')`, 240000)) await snap('final_slab', 300);
  await playUntil(`document.querySelector('.as-host.is-final') && !document.querySelector('.as-final-slab') && ${Q}.waiting()`, 30000);
  await snap('final_table', 200);
  // 優勝：ミミに寄せる
  mimiMode = 'call';
  await rigAtBoundary(`(() => { const T = ${Q}.T(); const s = T.players.map(p => p.place == null ? p.stack : 0); s[0] = T.totalChips - 50; s[5] = 50; return s; })()`);
  if (await playUntil(`!!document.querySelector('.as-crown.on')`, 240000)) await snap('champion', 700);
  await until(`!!document.querySelector('.as-result.on')`, 30000);
  await sleep(2600); await snap('result', 400);
  // 記録
  await ev(`document.querySelector('.as-result [data-as="home"]').click()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")', 20000); await sleep(2200);
  await snap('home_after');
  await act('allstar-record'); await sleep(800); await snap('record');
  const saved = await val(`JSON.stringify({ coins: save.coins, allstar: Object.assign({}, save.allstar, { history: save.allstar.history.slice(0, 2) }), ach: save.achievements && save.achievements.allstar_bell ? 1 : 0, gold: save.ownedItems.includes('mimi_skin_gold') })`);
  console.log(kind, 'save', saved);
  const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: [...errors, ...session.exceptions], save: saved, report }, null, 1));
  console.log(kind, 'errors', JSON.stringify([...errors, ...session.exceptions]).slice(0, 1500));
  await session.close();
}

// ミミが先に脱落する道：参加費（2回目）→ 開幕を押して飛ばす → ミミを短くして脱落 → 残りを計算 → 結果
async function tourOut(kind) {
  const phone = kind === 'phone';
  const OUT = path.join(OUT_ROOT, kind + '-out');
  fs.mkdirSync(OUT, { recursive: true });
  const session = await openSession({ width: phone ? 844 : 1280, height: phone ? 390 : 800, mobile: phone, speed: 2 });
  const { page } = session;
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && !!window.AllstarUI').catch(() => false)); i++) await sleep(500);
  const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 160)));
  const val = (js) => page.eval(js).catch(() => null);
  const until = async (js, ms = 30000, step = 120) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
  const report = []; let idx = 0;
  async function snap(name, settle = 400) { await sleep(settle); idx++; const file = `${String(idx).padStart(2, '0')}_${name}.png`; let r; try { r = await page.eval(CHECK); } catch (e) { r = { error: e.message }; } await page.screenshot(path.join(OUT, file)); r.name = name; report.push(r); console.log(kind + '-out', name, JSON.stringify({ covered: r.covered?.length, small: r.small?.length, tiny: r.tiny?.length, off: r.off?.length, clip: r.clip?.length })); }
  const Q = 'AllstarUI._qa';
  await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.readIntroSeen = true; save.coins = 2400; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { velvet:'A' }; save.endingUnlocked = true; save.allstar = { unlockSeen: true, invitationUsed: true, entries: 1, wins: 1, champion: 'mimi' }; saveProgress()`);
  await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(2500);
  await snap('home_unlocked_migrated');
  await ev(`onAction({ currentTarget: { dataset: { action: 'allstar-open' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(800);
  await snap('entry_fee');
  await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
  await until('!!document.querySelector(".as-open.on")', 15000, 50);
  const coinsAfterFee = await val('save.coins');
  await sleep(1000);
  // 開幕を押して飛ばす
  const t0 = Date.now();
  await page.click(phone ? 422 : 640, phone ? 200 : 400);
  await until(`!document.querySelector('.as-open')`, 8000, 50);
  console.log(kind + '-out', 'skip opening ms', Date.now() - t0, 'coins after fee', coinsAfterFee);
  await val(`${Q}.rig((() => { const T = ${Q}.T(); return [50, 1790, 1790, 1790, 1790, 1790]; })())`);
  let shot = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 240000) {
    if (!shot && await val(`!!document.querySelector('.as-cut.on')`)) { await snap('mimi_bust', 900); shot = true; }
    if (await val(`!!document.querySelector('.as-banner.is-calc')`) && idx < 4) await snap('calc', 0);
    if (await val(`!!document.querySelector('.as-result.on')`)) break;
    if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('call')`);
    await sleep(80);
  }
  await sleep(2600); await snap('result_lose');
  const saved = await val(`JSON.stringify({ coins: save.coins, places: save.allstar.places, best: save.allstar.bestPlace, champion: save.allstar.champion, run: save.allstar.run, hist: save.allstar.history[0] })`);
  console.log(kind + '-out', 'save', saved);
  const errors = await page.eval('window.__QA ? window.__QA.errors : []').catch(() => []);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ errors: [...errors, ...session.exceptions], save: saved, report }, null, 1));
  console.log(kind + '-out', 'errors', JSON.stringify([...errors, ...session.exceptions]).slice(0, 1500));
  await session.close();
}

if (mode === 'out') await tourOut('pc');
if (mode === 'out-phone') await tourOut('phone');
if (mode === 'pc' || mode === 'both') await tour('pc');
if (mode === 'phone' || mode === 'both') await tour('phone');
