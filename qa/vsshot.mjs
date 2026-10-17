// 読み合い開始の VS カットインを、時計を止めて決めた瞬間ごとに撮る。
// node qa/vsshot.mjs <opponentId> <psych|logic> [width height] [out]
// 撮影は1枚に数秒かかるので、カットインを消さずに止め、各瞬間へ演出と動画の時計を合わせて撮る。
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [opp = 'polka', group = 'psych', W = 1280, H = 800, out = 'qa/out/vs'] = process.argv.slice(2);
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 768, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500 } });
await sleep(2500);
await page.eval(`(async () => { startBattle(${JSON.stringify(opp)}); })()`);
await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
let found = false;
for (let i = 0; i < 60 && !found; i++) { found = await page.eval(`!!document.querySelector('.mb-intro')`); if (!found) await sleep(50); }
if (!found) { console.log('カットインが出なかった'); await close(); process.exit(1); }
await page.eval(`(() => { const e = document.querySelector('.mb-intro'); e.remove = () => {}; window.__vsIntro = e; return true; })()`);
await sleep(1200); // 動画の読み込みを待つ
for (const t of [150, 450, 900, 1500, 2300]) {
  const info = await page.eval(`(async () => {
    const e = window.__vsIntro;
    e.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ${t}; });
    for (const v of e.querySelectorAll('video')) {
      v.pause(); v.classList.add('is-playing');
      const p = new Promise(r => v.addEventListener('seeked', r, { once: true }));
      v.currentTime = Math.min(v.duration - .03, ${t} / 1000 * v.playbackRate);
      await Promise.race([p, new Promise(r => setTimeout(r, 1500))]);
    }
    return [...e.querySelectorAll('video')].map(v => v.src.split('/').pop() + '@' + v.currentTime.toFixed(2) + ' rs' + v.readyState).join(' ');
  })()`);
  await page.screenshot(path.resolve(`${out}_${opp}_${group}_${W}_${t}.png`));
  console.log(t, info || '(動画なし)');
}
console.log(await page.eval(`JSON.stringify({ errors: (window.__QA && window.__QA.errors || []).slice(0, 3) })`));
await close();
