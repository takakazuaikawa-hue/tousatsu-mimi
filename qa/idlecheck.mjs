// 卓の相手の待機動画が、下の一枚絵とずれずに重なっているかを撮って確かめる。
// この環境のブラウザは mp4（H.264）を再生できないので、qa/out/idle/webm/idle_<相手>.webm（同じ動画を WebM にしたもの）を使う：
//   for n in rico_tutorial polka selina grano velvet; do ffmpeg -i assets/motion/idle_$n.mp4 -c:v libvpx-vp9 -b:v 0 -crf 24 -an qa/out/idle/webm/idle_$n.webm; done
// 相手ごとに「動画あり（1コマ目で止める）」「動画なし（一枚絵）」「考え中で動画あり／なし」を撮り、差の平均を出す。
// node qa/idlecheck.mjs [outDir] [相手...]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [outDir = 'qa/out/idlecheck', ...only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const save = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 800 };
const { page, close, exceptions } = await openSession({ width: 1280, height: 800, speed: 1, save });
await sleep(3000);
const clipOf = async () => JSON.parse(await page.eval(`(() => { const s = document.getElementById('stage').getBoundingClientRect(); const k = s.width / 1280; return JSON.stringify({ x: s.left + 340 * k, y: s.top + 84 * k, width: 600 * k, height: 450 * k, scale: 1 }); })()`));
const shot = async (file) => { const r = await page.send('Page.captureScreenshot', { format: 'png', clip: await clipOf() }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; };
for (const opp of (only.length ? only : ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'])) {
  // 研修のリコ先輩は講義を飛ばす合図を立ててから始める
  await page.eval(`(() => { if (${JSON.stringify(opp)} === 'rico_tutorial') window.__ricoSkipLecture = true; startBattle(${JSON.stringify(opp)}); return 1; })()`);
  // 準備中（読み込み待ち）の間は待つ。各話の扉が出たら「開始」を押す
  for (let i = 0; i < 40; i++) {
    const st = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent) && b.offsetParent && !b.closest('.battle-screen')); if (b) { b.click(); return 'click'; } return state.screen === 'battle' && state.opponentId === ${JSON.stringify(opp)} && document.querySelector('.battle-screen') ? 'ok' : 'wait'; })()`);
    if (st === 'ok') break;
    await sleep(500);
  }
  await sleep(1500);
  // 読み込み係の動画の在りかを WebM に差し替えて、待機動画を付け直す
  const info = await page.eval(`(async () => {
    const MA = window.MimiAssets; const orig = MA.__origVideoSrc || (MA.__origVideoSrc = MA.videoSrc);
    MA.videoSrc = (u) => /assets\\/motion\\/idle_/.test(u) ? u.replace('assets/motion/', 'qa/out/idle/webm/').replace('.mp4', '.webm') : orig(u);
    __idleFailed.clear(); // この環境は mp4 を再生できないので、本物の読み込みで「再生できなかった」と記録されている
    document.querySelectorAll('.coach-overlay, .battle-modal-overlay, .psych-modal, .tutorial-overlay').forEach(e => e.style.display = 'none');
    state.opponentExpr = 'default'; render();
    const v = document.querySelector('.battle-screen .t8-idle');
    if (!v) return JSON.stringify({ opp: state.opponentId, video: false });
    for (let i = 0; i < 60 && !v.classList.contains('is-playing'); i++) await new Promise(r => setTimeout(r, 100));
    const playing = v.classList.contains('is-playing');
    v.pause(); v.currentTime = 0; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); });
    const scr = document.querySelector('.battle-screen'); scr.classList.remove('is-deciding');
    return JSON.stringify({ opp: state.opponentId, video: true, playing, src: v.getAttribute('src'), w: v.videoWidth, h: v.videoHeight, cs: getComputedStyle(v).maskImage.slice(0, 40) });
  })()`);
  console.log(info);
  await sleep(900);
  await shot(path.join(outDir, `${opp}_a_video.png`));
  await page.eval(`(() => { const v = document.querySelector('.battle-screen .t8-idle'); if (v) v.style.visibility = 'hidden'; return 1; })()`);
  await sleep(300);
  await shot(path.join(outDir, `${opp}_b_still.png`));
  await page.eval(`(() => { document.querySelector('.battle-screen').classList.add('is-deciding'); return 1; })()`);
  await sleep(900);
  await shot(path.join(outDir, `${opp}_d_still.png`));
  await page.eval(`(() => { const v = document.querySelector('.battle-screen .t8-idle'); if (v) v.style.visibility = ''; return 1; })()`);
  await sleep(900);
  await shot(path.join(outDir, `${opp}_c_video.png`));
  await page.eval(`(() => { goLobby(); return 1; })()`);
  await sleep(1500);
}
const errs = await page.eval('JSON.stringify(window.__QA.errors)');
console.log('errors', errs, exceptions.length);
await close();
