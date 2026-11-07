// 本編の卓で、指定した読み合いを Bot と同じやり方（見えて押せる物だけ）で最後まで遊ぶ。
// node qa/readplay.mjs <opponentId> <group> <gameId> [rounds=2] [width height]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [opp = 'polka', group = 'psych', gameId = 'detective', rounds = 2, W = 1280, H = 800] = process.argv.slice(2);
const { page, close } = await openSession({ width: +W, height: +H, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500 } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`);
await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
const PICK = `(() => {
  const h = document.querySelector('.read-battle-host'); if (!h) return 'gone';
  const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled || e.closest('[hidden]')) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
  const all = [...h.querySelectorAll('*')].filter(e => e.tagName === 'BUTTON' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')));
  let vis = all.filter(ok);
  const off = all.filter(e => !ok(e) && e.getBoundingClientRect().width > 4 && !e.disabled);
  if (!vis.length && off.length) { off[0].scrollIntoView({ block: 'center' }); vis = all.filter(ok); }
  const ex = vis.find(e => /卓にもどる/.test(e.textContent || '')); if (ex) { const ma = h.querySelector('.mb-result-art.has-motion'); if (ma && !window.__mShot) { window.__mShot = 1; return 'motion:' + ma.className; } window.__mShot = 0; ex.click(); return 'exit'; }
  const bt = vis.filter(e => e.tagName === 'BUTTON'); const pool = bt.length && Math.random() < .5 ? bt : vis;
  const e = pool[Math.floor(Math.random() * pool.length)]; if (!e) return 'none:' + off.map(x => (x.className || x.tagName) + ' ' + (x.textContent || '').trim().slice(0, 12)).slice(0, 4).join(' / ');
  const rr = e.getBoundingClientRect(); return JSON.stringify({ x: rr.left + rr.width / 2, y: rr.top + rr.height / 2, w: (e.className || e.tagName) + ' ' + (e.textContent || '').trim().slice(0, 14) });
})()`;
for (let r = 0; r < +rounds; r++) {
  await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(gameId)}]; state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
  await sleep(2600);
  let last = [], res = 'STUCK';
  for (let i = 0; i < 400; i++) {
    const w = await page.eval(PICK);
    let w2 = w; if (w && w[0] === '{') { const o = JSON.parse(w); await page.click(o.x, o.y); w2 = o.w; }
    last.push(w2); if (last.length > 8) last.shift();
    if (String(w).startsWith('motion:')) { await sleep(2500); const st = await page.eval("(() => { const a = document.querySelector('.mb-result-art.has-motion'); const v = a && a.querySelector('video'); return a ? a.className + ' t=' + (v ? v.currentTime.toFixed(1) : 'none') : 'gone'; })()"); console.log('MOTION', st); await page.screenshot(path.resolve('qa/out/readplay_motion_' + gameId + '.png')); }
    if (w === 'exit') { res = 'OK ' + i + ' taps'; break; }
    await sleep(220);
  }
  if (res === 'STUCK') await page.screenshot(path.resolve(`qa/out/readplay_${gameId}_stuck.png`));
  console.log(gameId, r, res, res === 'STUCK' ? '| ' + last.join(' / ') : '');
  await sleep(800);
  await page.eval(`(() => { document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = false; return true; })()`);
}
console.log('errors', await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 3))`));
await close();
