// スマホの文字の基準の監査（コードは変更しない）。画面上（CSS px）の文字の大きさ・押す所の高さ・画面外へのはみ出しを測る。
// 基準（docs: 見本ページ G）：補足11px／小見出し13px／本文14px／主文16px／数字18px、押す所44px。ここでは「11px 未満」と「押す所 44px 未満」を不合格として数える。
// node qa/textaudit.mjs [--size 844x390] [result] [read] [read:<gameId>...]
// 出力: qa/out/textaudit/<size>/report.json / report.md / <scene>_<n>.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const args = process.argv.slice(2);
const sizeArg = (args.find((a, i) => args[i - 1] === '--size') || '844x390');
const [W, H] = sizeArg.split('x').map(Number);
const want = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--size');
const doResult = !want.length || want.includes('result');
const readOnly = want.filter(a => a.startsWith('read:')).map(a => a.slice(5));
const doRead = !want.length || want.includes('read') || readOnly.length;
const OUT = path.resolve('qa/out/textaudit', sizeArg);
fs.mkdirSync(OUT, { recursive: true });
const MIN_TEXT = 11, MIN_TAP = 44;

const GAMES = [
  ['detective', 'polka', 'psych'], ['stare', 'polka', 'psych'], ['doubt', 'polka', 'psych'], ['gacha', 'polka', 'psych'], ['objection', 'velvet', 'psych'],
  ['handbuild', 'polka', 'logic'], ['highlow', 'polka', 'logic'], ['danger', 'selina', 'logic'], ['sniper', 'selina', 'logic'], ['outs', 'grano', 'logic'], ['suspects', 'velvet', 'logic'],
];

// root（セレクタ）の中の、見えている文字と押せる物を測る
const MEASURE = (rootSel) => `(() => {
  const root = document.querySelector(${JSON.stringify(rootSel)}); if (!root) return null;
  const VW = innerWidth, VH = innerHeight;
  const effOpacity = (e) => { let o = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; } return o; };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const selOf = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')).slice(0, 48);
  const texts = []; const seen = new Set();
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue;
    { const d = el.closest('details:not([open])'); if (d && !el.closest('summary')) continue; }
    const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width >= 2 && r.height >= 2); if (!rs.length) continue;
    const op = effOpacity(el); if (op < 0.3) continue;
    seen.add(el);
    const cs = getComputedStyle(el); const px = parseFloat(cs.fontSize) * scaleOf(el);
    const r = rs[0]; const last = rs[rs.length - 1];
    const off = r.left < -1 || r.top < -1 || last.right > VW + 1 || last.bottom > VH + 1;
    // 見えない所に隠れている（親が overflow で切っている）文字は数えない
    let clipped = false; for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.overflow !== 'visible' || c.overflowY !== 'visible') { const b = x.getBoundingClientRect(); if (r.bottom <= b.top + 1 || r.top >= b.bottom - 1 || r.right <= b.left + 1 || r.left >= b.right - 1) { clipped = true; break; } } }
    if (clipped) continue;
    texts.push({ t: t.slice(0, 24), px: +px.toFixed(1), sel: selOf(el), off, y: Math.round(r.top) });
  }
  const isTap = (e) => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer'));
  const taps = [...root.querySelectorAll('*')].filter(isTap).filter(e => effOpacity(e) >= 0.3 && !e.disabled).map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 16), sel: selOf(e), w: Math.round(r.width), h: Math.round(r.height), off: r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1 }; }).filter(b => b.w >= 4 && b.h >= 4);
  const sc = root.querySelector('.mb-scroll'); const k = sc ? scaleOf(sc) : 1;
  return { texts, taps, scrollOver: sc ? Math.round((sc.scrollHeight - sc.clientHeight) * k) : 0 };
})()`;

const PICK = `(() => {
  const h = document.querySelector('.read-battle-host'); if (!h) return 'gone';
  const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled || e.closest('[hidden]')) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
  const all = [...h.querySelectorAll('*')].filter(e => e.tagName === 'BUTTON' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')));
  let vis = all.filter(ok);
  const off = all.filter(e => !ok(e) && e.getBoundingClientRect().width > 4 && !e.disabled);
  if (!vis.length && off.length) { off[0].scrollIntoView({ block: 'center' }); vis = all.filter(ok); }
  const ex = vis.find(e => /卓にもどる/.test(e.textContent || '')); if (ex) { ex.click(); return 'exit'; }
  const bt = vis.filter(e => e.tagName === 'BUTTON'); const pool = bt.length && Math.random() < .5 ? bt : vis;
  const e = pool[Math.floor(Math.random() * pool.length)]; if (!e) return 'none';
  const rr = e.getBoundingClientRect(); return JSON.stringify({ x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 });
})()`;

const summarize = (m) => {
  const small = m.texts.filter(x => x.px < MIN_TEXT - 0.05);
  const smallTap = m.taps.filter(b => b.h < MIN_TAP - 0.5 || b.w < MIN_TAP - 0.5);
  const off = [...m.texts.filter(x => x.off), ...m.taps.filter(b => b.off)];
  return { small, smallTap, off, minPx: m.texts.length ? Math.min(...m.texts.map(x => x.px)) : null, scrollOver: m.scrollOver };
};

const { page, close } = await openSession({ width: W, height: H, mobile: true, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, coins: 500, readIntroSeen: true, houseRulesSeen: true } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
console.log('scale', await page.eval(`getComputedStyle(document.documentElement).getPropertyValue('--game-scale')`), 'compact', await page.eval(`document.documentElement.classList.contains('is-compact')`));

const report = {};
const enterTable = async (opp) => {
  await page.eval(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); startBattle(${JSON.stringify(opp)}); true`);
  await sleep(4000);
  for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await sleep(700); }
};

if (doResult) {
  for (const won of [true, false]) {
    const key = won ? 'result_win' : 'result_lose';
    await enterTable('selina');
    await page.eval(`(() => { state.handNumber = 9; state.psychSuccessCount = 2; state.goodFolds = 1; state.readBattleBonus = 120; state.playerChips = ${won ? 3000 : 0}; state.opponentChips = ${won ? 0 : 3000}; endBattle(); return true; })()`);
    await sleep(6000);
    const shots = [];
    for (let i = 0; i < 3; i++) {
      const m = await page.eval(MEASURE('#stage'));
      const s = summarize(m); s.shot = `${key}_${i + 1}.png`;
      await page.screenshot(path.join(OUT, s.shot));
      shots.push(s);
      // 下へ送る演出（報酬の行が順に出る等）があれば、少し待ってもう一度
      await sleep(2500);
    }
    report[key] = { steps: shots };
    console.log(key, 'small', shots[shots.length - 1].small.length, 'tap', shots[shots.length - 1].smallTap.length, 'off', shots[shots.length - 1].off.length);
  }
}

// 卓（手番・賭け額選び・フロップで相手が賭けた時）
if (want.includes('table')) {
  await enterTable('grano');
  for (let i = 0; i < 40; i++) { if (await page.eval(`!!(state.isPlayerTurn && document.querySelector('.verb-grid'))`)) break; await sleep(500); }
  const steps = [];
  const snap = async (name) => { const m = await page.eval(MEASURE('#stage')); const s = summarize(m); s.n = steps.length + 1; s.shot = `table_${name}.png`; await page.screenshot(path.join(OUT, s.shot)); steps.push(s); };
  await sleep(800); await snap('turn');
  await page.eval(`(() => { state.betChooserOpen = true; render(); return true; })()`); await sleep(600); await snap('bet');
  await page.eval(`(() => { state.betChooserOpen = false; while (state.community.length < 3) state.community.push(state.deck.pop()); state.handPhase = 'flop'; state.currentBetOpponent = 60; state.pot += 60; render(); return true; })()`); await sleep(900); await snap('flop');
  report.table = { steps };
  console.log('table', steps.map(s => `small ${s.small.length} tap ${s.smallTap.length} min ${s.minPx}`).join(' / '));
}

// 従来の心理バトル（研修・講義・本気リコ・ヴェルベットの本気の読み合いで使う三択の札）：問いの時と、答えた後
if (!want.length || want.includes('psych')) {
  for (const qid of ['rico_serious_polarized', 'logic_pot_odds_basic', 'lesson_1_1', 'velvet_river_evidence']) {
    await enterTable('polka');
    await page.eval(`(() => { document.querySelectorAll('.battle-modal-overlay').forEach(e => e.remove()); state.psychRoot = null; triggerPsychBattle(${JSON.stringify(qid)}); return true; })()`);
    await sleep(2500);
    const steps = [];
    for (const phase of ['q', 'a']) {
      const m = await page.eval(MEASURE(phase === 'q' ? '.battle-modal-overlay' : '#stage'));
      if (!m) break;
      const s = summarize(m); s.n = steps.length + 1; s.shot = `psych_${qid}_${phase}.png`;
      await page.screenshot(path.join(OUT, s.shot)); steps.push(s);
      if (phase === 'q') { await page.eval(`(() => { const b = document.querySelector('.battle-modal-overlay .psych-choices button'); if (b) { b.click(); setTimeout(() => b.isConnected && b.click(), 400); } return !!b; })()`); await sleep(2500); }
    }
    report['psych_' + qid] = { steps };
    console.log('psych', qid, steps.map(s => `small ${s.small.length} tap ${s.smallTap.length} off ${s.off.length} min ${s.minPx}`).join(' / '));
  }
}

if (doRead) {
  for (const [gameId, opp, group] of GAMES) {
    if (readOnly.length && !readOnly.includes(gameId)) continue;
    await enterTable(opp);
    await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(gameId)}]; save.readIntroSeen = true; state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
    await sleep(2600);
    const steps = []; let prevSig = null, stable = 0, res = 'STUCK';
    for (let i = 0; i < 400; i++) {
      const m = await page.eval(MEASURE('.read-battle-host'));
      if (m && !(await page.eval(`!!document.querySelector('.read-battle-host .mb-intro')`))) {
        const sig = m.taps.map(b => b.t).join('|') + '#' + m.texts.length;
        if (sig === prevSig) stable++; else { stable = 0; prevSig = sig; }
        if (stable === 1 && sig !== (steps.length ? steps[steps.length - 1].sig : null)) {
          const s = summarize(m); s.sig = sig; s.n = steps.length + 1;
          if (s.n <= 12) { s.shot = `${gameId}_${s.n}.png`; try { await page.screenshot(path.join(OUT, s.shot)); } catch {} }
          steps.push(s);
        }
      }
      const w = await page.eval(PICK);
      if (w && w[0] === '{') { const o = JSON.parse(w); await page.click(o.x, o.y); }
      if (w === 'exit') { res = 'OK'; break; }
      if (w === 'gone') { res = 'GONE'; break; }
      await sleep(220);
    }
    const worst = steps.reduce((a, s) => Math.max(a, s.small.length), 0);
    const minPx = Math.min(...steps.map(s => s.minPx ?? 99));
    console.log(gameId, res, 'steps', steps.length, 'worstSmall', worst, 'minPx', minPx, 'maxScroll', Math.max(0, ...steps.map(s => s.scrollOver)));
    report['read_' + gameId] = { result: res, steps };
    await sleep(600);
    await page.eval(`(() => { document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = false; return true; })()`);
  }
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const L = [`# 文字の基準の監査 ${sizeArg}（11px 未満の文字・44px 未満の押す所・画面外）`, ''];
for (const [k, r] of Object.entries(report)) {
  L.push(`## ${k}${r.result ? ' (' + r.result + ')' : ''}`, '', '| # | 最小px | 11px未満 | 押す所<44 | 画面外 | 読み合いのスクロール | 例 | 画像 |', '|--|--|--|--|--|--|--|--|');
  r.steps.forEach((s, i) => {
    const ex = [...new Map(s.small.map(x => [x.sel, x])).values()].slice(0, 4).map(x => `${x.sel} ${x.px}「${x.t}」`).join(' / ');
    L.push(`| ${s.n || i + 1} | ${s.minPx} | ${s.small.length} | ${s.smallTap.length} | ${s.off.length} | ${s.scrollOver} | ${ex} | ${s.shot || ''} |`);
  });
  L.push('');
}
fs.writeFileSync(path.join(OUT, 'report.md'), L.join('\n'));
console.log('errors', await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 3))`));
await close();
