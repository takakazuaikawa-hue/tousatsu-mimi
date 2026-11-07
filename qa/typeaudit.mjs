// 文字の大きさの「そろい」を測る（2026-10-27 ユーザー指摘「リコの声は大きく、論理バトルでは小さい。文字のばらつき」）。
// 画面に見えている文字を全部拾い、画面上の実際の大きさ（縮めて描く卓・zoom も込み）を、部品ごとに並べる。
// QA_SIZE=844x390 node qa/typeaudit.mjs <出力.json> [相手] [読み合いの種類] [psych|logic]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [out = 'qa/out/typeaudit.json', opp = 'polka', game = 'handvs', grp = 'logic'] = process.argv.slice(2);
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
// 画面上の大きさ：文字の要素の中に 100px の印を置き、画面での幅を測って倍率を出す（transform・zoom 込み）
const SNAP = `(() => {
  const res = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set(); let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement; const t = n.nodeValue.replace(/\\s+/g, ' ').trim();
    if (!p || !t || seen.has(p) || p.closest('script,style')) continue;
    const r = p.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
    let vis = true; for (let e = p; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .05) { vis = false; break; } } if (!vis) continue;
    seen.add(p);
    const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:1px;display:inline-block;padding:0;border:0;margin:0';
    p.appendChild(m); const k = m.getBoundingClientRect().width / 100; m.remove();
    const fs = parseFloat(getComputedStyle(p).fontSize);
    const path = []; for (let e = p; e && e !== document.body && path.length < 4; e = e.parentElement) path.push((e.tagName.toLowerCase()) + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''));
    res.push({ px: Math.round(fs * k * 10) / 10, css: fs, k: Math.round(k * 1000) / 1000, t: t.slice(0, 24), at: path.join(' < ') });
  }
  return JSON.stringify(res);
})()`;
const report = {};
await sleep(1500);
report.table = JSON.parse(await page.eval(SNAP));
await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(grp)}] = [${JSON.stringify(game)}]; if ((state.community || []).length < 3) { state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()]; state.handPhase = 'flop'; render(); } state.psychPending = true; startReadBattle(${JSON.stringify(grp)}); return true; })()`);
await sleep(4500);
await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /わかった/.test(b.textContent)); if (b) b.click(); return true; })()`);
await sleep(2000);
report.read = JSON.parse(await page.eval(SNAP));
fs.writeFileSync(out, JSON.stringify(report, null, 1));
await page.screenshot(out.replace(/\.json$/, '_read.png'));
for (const k of ['table', 'read']) {
  const by = {}; report[k].forEach(x => { (by[x.px] = by[x.px] || []).push(x.t); });
  console.log('==', k, Object.keys(by).sort((a, b) => a - b).map(px => `${px}px×${by[px].length}`).join(' '));
}
await s.close(); process.exit(0);
