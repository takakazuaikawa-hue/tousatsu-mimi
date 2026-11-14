// ホーム（ロビー）のリコの動き（home-live.js）を動画にし、背景が歪んでいないかを「差の絵」で確かめる。
// ブラウザの時計を止め、1/30 秒ずつ進めては撮る（imsrec.mjs と同じ）。
// node qa/homerec.mjs [--sec 6]   出力: qa/out/homerec/home.mp4・diff.png（最初と半分の時点の差を強めたもの。動いた所だけ明るい）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const args = process.argv.slice(2);
const SEC = args.includes('--sec') ? +args[args.indexOf('--sec') + 1] : 6;
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const OUT = path.resolve('qa/out/homerec'); const dir = path.join(OUT, 'frames');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const s = await openSession({ width: 1280, height: 800 });
const { page } = s;
await sleep(4000);
await page.eval(`(() => {
  document.querySelectorAll('.home-overlay,.collection-overlay,.settings-overlay,.episode-overlay,.login-bonus-overlay').forEach(e => e.remove());
  save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.coins = 850; save.equippedRicoOutfit = 'default'; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 };
  state = defaultState(); state.screen = 'lobby'; render(); return true;
})()`);
await page.eval('Promise.all([...document.querySelectorAll(".home-stage img")].filter(im=>im.src).map(im=>im.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)');
await sleep(5000);
const FPS = 30;
// リコの動きの時計（uT）をこちらで 1/30 秒ずつ進める。本当の時計で撮ると、PC が重い時に描く回数が減って動きが飛ぶ（びくびくに見える）
// ＝ 1秒に30回描ける端末で見える動きと同じ。画面の描き直しを待ってから撮る
await page.eval(`(() => { const o = WebGLRenderingContext.prototype.uniform1f; window.__draws = 0; WebGLRenderingContext.prototype.uniform1f = function (l, v) { window.__draws++; return o.call(this, l, window.__vt != null ? window.__vt : v); }; return 1; })()`);
const N = Math.round(SEC * FPS);
for (let k = 0; k < N; k++) {
  await page.eval(`(window.__vt = ${(k / FPS).toFixed(4)}, window.__d0 = window.__draws, 1)`);
  for (let w = 0; w < 100; w++) { if (await page.eval('window.__draws > window.__d0 + 1')) break; await sleep(30); }
  await page.screenshot(path.join(dir, `f${String(k).padStart(5, '0')}.png`));
}
const live = await page.eval(`!!(window.HomeLive && document.querySelector('.home-stage canvas, canvas'))`);
await s.close();
const mp4 = path.join(OUT, 'home.mp4');
execFileSync(FF, ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', mp4]);
// 差の絵：最初のコマと、一番動いていそうな半分の時点のコマの差を8倍に強める
const a = path.join(dir, 'f00000.png'), b = path.join(dir, `f${String(Math.floor(N / 2)).padStart(5, '0')}.png`);
execFileSync(FF, ['-loglevel', 'error', '-y', '-i', a, '-i', b, '-filter_complex', 'blend=all_mode=difference,eq=contrast=8:brightness=0.02', '-frames:v', '1', path.join(OUT, 'diff.png')]);
console.log('コマ', N, '動きの部品', live, '→', mp4, (fs.statSync(mp4).size / 1024 | 0) + 'KB');
