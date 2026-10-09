// 読み合いの「フィーバー突入」と「ボーナスルーレット」を、時計を止めて決めた瞬間ごとに撮る。
// node qa/fevershot.mjs [width height] [out]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/fever'] = process.argv.slice(2);
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 768, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, coins: 500 } });
await sleep(2500);
await page.eval(`(async () => { startBattle('polka'); })()`);
await sleep(3000);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { state.psychPending = true; startReadBattle('psych'); return true; })()`);
await sleep(4000);
// フィーバー突入の要素を本物と同じ作りで差し込み、0.35 / 0.9 秒の瞬間を撮る
await page.eval(`(() => { const layer = document.querySelector('.mb-layer'); const fb = document.createElement('div'); fb.className = 'mb-fever-in';
  fb.innerHTML = '<i class="mb-fv-flash"></i><i class="mb-fv-rays"></i><div class="mb-fv-slab"><b>PANYU FEVER!</b><small>3回、ご褒美2倍</small><span class="mb-fv-lamps"><i></i><i></i><i></i></span></div>';
  layer.appendChild(fb); window.__fb = fb; return true; })()`);
for (const t of [120, 900]) {
  await page.eval(`(() => { window.__fb.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ${t}; }); return true; })()`);
  await page.screenshot(path.resolve(`${out}_in_${t}.png`));
}
await page.eval(`(() => { window.__fb.remove(); const h = document.querySelector('.mb-host'); h.classList.add('is-fever'); const l = document.querySelector('#mb-p-lamps'); if (l) [...l.children].forEach((x, i) => x.classList.toggle('on', i < 2)); window.MB.roulette(20); return true; })()`);
await sleep(1500);
await page.eval(`(() => { document.querySelectorAll('.mb-roulette').forEach(r => r.getAnimations({ subtree: true }).forEach(a => a.pause())); return true; })()`);
await page.screenshot(path.resolve(`${out}_rl_spin.png`));
// 大当たりの後光と JACKPOT 札を再現
await page.eval(`(() => { const el = document.querySelector('.mb-roulette'); const card = el.querySelector('.mb-rl-card'); card.classList.add('is-jackpot'); const rays = document.createElement('i'); rays.className = 'mb-fv-rays mb-rl-rays'; el.insertBefore(rays, card); el.classList.add('is-stopped');
  el.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = 700; }); return true; })()`);
await page.screenshot(path.resolve(`${out}_rl_jackpot.png`));
console.log(await page.eval(`JSON.stringify({ errors: (window.__QA && window.__QA.errors || []).slice(0, 3) })`));
await close();
