// 卓の相手の待機動画を、本編の卓に重なった姿のまま1コマずつ撮って動画にする（見本ページ用）。
// この環境のブラウザは mp4 を再生できないので qa/out/idle/webm/idle_<相手>.webm を使う（作り方は qa/idlecheck.mjs）。
// 動画を止めて currentTime を 1/24 秒ずつ進め、そのたびに撮る。ほかの CSS アニメは止める。
// node qa/idlerec.mjs <相手> [outDir] [clip=table|opp]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const [opp = 'grano', outDir = 'qa/out/idlerec', clip = 'table'] = process.argv.slice(2);
const dir = path.join(outDir, `${opp}_${clip}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const save = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 800, unlockedNotes: ['board_danger', 'range_basic', 'tell'] };
const { page, close } = await openSession({ width: 1280, height: 800, speed: 1, save });
await sleep(3000);
await page.eval(`(() => { if (${JSON.stringify(opp)} === 'rico_tutorial') window.__ricoSkipLecture = true; startBattle(${JSON.stringify(opp)}); return 1; })()`);
for (let i = 0; i < 40; i++) {
  const st = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent) && b.offsetParent); if (b) { b.click(); return 'click'; } return state.screen === 'battle' && state.isPlayerTurn && document.querySelector('.verb-grid') ? 'ok' : 'wait'; })()`);
  if (st === 'ok') break;
  await sleep(500);
}
await sleep(1500);
const info = await page.eval(`(async () => {
  document.querySelectorAll('.tutorial-overlay, .coach-layer').forEach(e => e.remove());
  const MA = window.MimiAssets; const orig = MA.videoSrc.bind(MA);
  MA.videoSrc = (u) => /assets\\/motion\\/idle_/.test(u) ? u.replace('assets/motion/', 'qa/out/idle/webm/').replace('.mp4', '.webm') : orig(u);
  __idleFailed.clear(); state.opponentExpr = 'default'; render();
  const v = document.querySelector('.battle-screen .t8-idle');
  for (let i = 0; i < 60 && !(v && v.classList.contains('is-playing')); i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 800));
  v.pause();
  // 撮っている間に動くものを止める（ミミの呼吸・光の明滅など）。動画だけを進める
  document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} });
  const st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none !important}'; document.head.appendChild(st);
  return JSON.stringify({ dur: v.duration, playing: true });
})()`);
const { dur } = JSON.parse(info);
const frames = Math.floor(dur * 24);
const box = clip === 'opp' ? await page.eval(`(() => { const s = document.getElementById('stage').getBoundingClientRect(); const k = s.width / 1280; return JSON.stringify({ x: s.left + 340 * k, y: s.top + 84 * k, width: 600 * k, height: 380 * k, scale: 1 }); })()`) : null;
for (let f = 0; f < frames; f++) {
  await page.eval(`new Promise(r => { const v = document.querySelector('.battle-screen .t8-idle'); v.addEventListener('seeked', () => requestAnimationFrame(() => requestAnimationFrame(r)), { once: true }); v.currentTime = ${(f / 24).toFixed(4)}; setTimeout(r, 1500); })`);
  const r = await page.send('Page.captureScreenshot', box ? { format: 'png', clip: JSON.parse(box) } : { format: 'png' });
  fs.writeFileSync(path.join(dir, `f_${String(f).padStart(4, '0')}.png`), Buffer.from(r.data, 'base64'));
}
await close();
const out = path.join(outDir, `${opp}_${clip}.mp4`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(dir, 'f_%04d.png'), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
console.log(opp, frames, 'frames ->', out);
