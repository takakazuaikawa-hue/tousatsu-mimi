// 5件の見た目の直しを撮る。node qa/batch2shot.mjs <WxH> <outDir> [modes]
//  result  … 結果の画面（ご褒美の札が一番多い時）。欄とボタンの重なりを測る
//  volume  … エンディングの曲の小窓・設定の音量のつまみを 0/16/50/100 で
//  credits … エンドロールの途中を数か所
//  allstar … 零時の卓の順位（1位・6位）
//  cgview  … 一枚絵（CG集）の見る画面
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/batch2');
const modes = (process.argv[4] || 'result,volume,credits,allstar,cgview').split(',');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000 && h < w, speed: 1 });
const { page } = session;
const shot = (name) => page.screenshot(path.join(out, `${tag}-${name}.png`));
const log = (...a) => console.log(tag, ...a);
const CLEAR = `document.querySelectorAll('.ending-prompt-overlay,.settings-overlay,.reward-cg-viewer-overlay,#stage > .as-host,.credits-roll,#ending-stage').forEach(e => e.remove()); true`;
const ADVANCE = `(() => {
  const re = /^(▶ ?開始|開始|始める|次へ|スキップ|OK|閉じる|はじめる|対戦へ)$/;
  const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled && re.test(b.textContent.trim())).pop();
  if (b) { b.click(); return false; }
  return !!document.querySelector('[data-action="start-hand"]');
})()`;
const lobby = `(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina','grano']; save.firstClearRewardClaimed = save.clearedStages.slice(); save.rewardCgSeen = save.clearedStages.slice(); save.unlockedNotes = ['bankroll','board_danger']; save.coins = 5000; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render(); return 1; })()`;

try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await page.eval(lobby);
  await sleep(1500);

  if (modes.includes('result')) {
    await page.eval(`(() => { startBattle('velvet'); return 1; })()`);
    let ok = false;
    for (let i = 0; i < 80 && !ok; i++) { ok = await page.eval(ADVANCE); if (!ok) await sleep(700); }
    await page.eval(`(() => { state.readBattleBonus = 300; state.opponentChips = 0; endBattle(); return 1; })()`);
    await sleep(4500);
    // ご褒美の札を一番多い場面まで増やす（初回クリア＋評価＋戦術ノート＋読み合い＋バンクロール＋写真集など）。描き直すと結果が消えるので、画面の上で札を足す
    await page.eval(`(() => {
      const box = document.querySelector('.reward-chips'); if (!box) return 0;
      const more = [['評価ボーナス', '+400 (SS)'], ['戦術ノート解放', 'ブラフの見抜き方'], ['読み合いボーナス', '+300'], ['バンクロール管理ボーナス', '+120 (+10%)'], ['写真集入荷', '夜のYシャツ'], ['称号', '女王陛下の卓']];
      for (const [l, v] of more) { const c = document.createElement('span'); c.className = 'v2-chip v2-chip-gold'; c.innerHTML = '<span class="reward-chip-label">' + l + '</span><span class="reward-chip-value">' + v + '</span>'; box.appendChild(c); }
      return box.children.length; })()`);
    await sleep(2500);
    for (let i = 0; i < 30 && await page.eval('!!document.querySelector(".loading-veil.on")'); i++) await sleep(500);
    const m = await page.eval(`(() => {
      const p = document.querySelector('.rz-panel'); if (!p) return null;
      const btn = p.querySelector('.result-buttons'), bd = p.querySelector('.result-breakdown');
      const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.top, b.bottom].map(Math.round); };
      const kids = [...p.children].filter(k => k !== btn && k.getClientRects().length);
      const lastBottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
      const bt = btn ? btn.getBoundingClientRect().top : 0;
      return { rewards: document.querySelectorAll('.reward-chips > *').length, panel: r(p), buttons: r(btn), breakdown: r(bd), scrollable: p.scrollHeight > p.clientHeight + 2, sh: p.scrollHeight, ch: p.clientHeight, overlapAtTop: Math.round(lastBottom - bt) };
    })()`);
    log('result', JSON.stringify(m));
    await shot('result');
    // 一番下まで送った時、内訳が下のボタンの上に見えるか
    const m2 = await page.eval(`(() => { const p = document.querySelector('.rz-panel'); if (!p) return null; p.scrollTop = p.scrollHeight; const bd = p.querySelector('.result-breakdown'), btn = p.querySelector('.result-buttons'); return bd && btn ? { breakdownBottom: Math.round(bd.getBoundingClientRect().bottom), buttonsTop: Math.round(btn.getBoundingClientRect().top) } : null; })()`);
    await sleep(400);
    log('result-scrolled', JSON.stringify(m2));
    await shot('result-scrolled');
    await page.eval(lobby);
    await sleep(1500);
  }

  if (modes.includes('volume')) {
    for (const v of [0, 16, 50, 100]) {
      await page.eval(CLEAR);
      await page.eval(`(() => { showEndingMusicPrompt(); return 1; })()`);
      await sleep(700);
      await page.eval(`(() => { const r = document.querySelector('.ending-prompt-vol'); if (!r) return 0; r.value = ${v}; r.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await sleep(300);
      await shot(`vol-ending-${v}`);
    }
    await page.eval(CLEAR);
    await page.eval(`(() => { showSettingsModal(); document.querySelectorAll('.settings-modal-volume').forEach((r, i) => { r.value = [0, 16, 100][i] ?? 50; r.dispatchEvent(new Event('input', { bubbles: true })); }); return 1; })()`);
    await sleep(700);
    await shot('vol-settings');
    const info = await page.eval(`[...document.querySelectorAll('input[type=range]')].filter(r => r.offsetParent).map(r => r.className + '=' + r.value + ' fill ' + (r.style.getPropertyValue('--fill') || '-'))`);
    log('volume', JSON.stringify(info));
    await page.eval(CLEAR);
  }

  if (modes.includes('credits')) {
    await page.eval(CLEAR);
    await page.eval(`(() => { playStaffRollReplay(); return 1; })()`);
    for (const t of [5, 12, 20, 30]) {
      await sleep(t === 5 ? 5000 : (t === 12 ? 7000 : (t === 20 ? 8000 : 10000)));
      const al = await page.eval(`[...document.querySelectorAll('.credits-inner .cr-line, .credits-inner .cr-section, .credits-inner .cr-title')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).slice(0, 6).map(e => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(e); const tr = range.getBoundingClientRect(); return e.className.replace('cr-', '') + ' ' + c.display + '/' + c.textAlign + ' 中心のずれ ' + Math.round((tr.left + tr.right) / 2 - (r.left + r.right) / 2) + 'px「' + e.textContent.trim().slice(0, 12) + '」'; })`);
      log('credits', t, JSON.stringify(al));
      await shot(`credits-${t}`);
    }
    await page.eval(CLEAR);
  }

  if (modes.includes('allstar')) {
    for (const place of [1, 6]) {
      await page.eval(CLEAR);
      await page.eval(`(() => {
        const host = document.createElement('div'); host.className = 'as-host'; host.dataset.phase = 'result';
        const big = ${place} === 1 ? '優勝' : '第<span class="as-tcu">${place}</span>位';
        host.innerHTML = '<div class="as-layer"><div class="as-result on"><div class="as-res-big"><b>' + big + '</b><span>金時計杯</span></div></div></div>';
        document.getElementById('stage').appendChild(host); return 1; })()`);
      await sleep(800);
      const sz = await page.eval(`(() => { const b = document.querySelector('.as-res-big b'); const t = b && b.querySelector('.as-tcu'); return { b: b ? getComputedStyle(b).fontSize : null, num: t ? getComputedStyle(t).fontSize : null, numColor: t ? getComputedStyle(t).color : null }; })()`);
      log('allstar', place, JSON.stringify(sz));
      await shot(`allstar-${place}`);
    }
    await page.eval(CLEAR);
  }

  if (modes.includes('cgview')) {
    await page.eval(CLEAR);
    await page.eval(`(() => { save.cgSetPos = { cgset_bath: 3 }; showRewardCgViewer('cgset_bath'); return 1; })()`);
    await sleep(1500);
    const v = await page.eval(`(() => { const o = document.querySelector('.reward-cg-viewer-overlay'); if (!o) return null; return { hint: (o.querySelector('.reward-cg-viewer-hint') || {}).textContent, nav: [...o.querySelectorAll('.reward-cg-nav')].map(b => b.className + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)) }; })()`);
    log('cgview', JSON.stringify(v));
    await shot('cgview');
    await page.eval(`(() => { const b = document.querySelector('.reward-cg-nav.is-next'); if (b) b.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); return 1; })()`);
    await sleep(900);
    log('cgview-next', await page.eval(`(document.querySelector('.reward-cg-viewer-hint') || {}).textContent`));
    await shot('cgview-next');
    await page.eval(CLEAR);
  }
} finally {
  await session.close();
}
