// プロローグの音量（2026-10-20）：つまみと消音が出て、押しても物語が進まず、音量が保存されるか。PC とスマホ横で撮る
// node qa/storyvol.mjs   出力: qa/out/storyvol/*.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/storyvol'); fs.mkdirSync(OUT, { recursive: true });
for (const [W, H] of [[1280, 800], [844, 390]]) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000 });
  const { page } = s;
  await sleep(6000);
  await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return !!b; })()`);
  await sleep(5000);
  await page.screenshot(path.join(OUT, `${W}_1_start.png`));
  const before = await page.eval(`document.querySelectorAll('.story-mono p').length`);
  const r = await page.eval(`(() => { const ov = document.querySelector('.story-overlay'); const rg = ov.querySelector('.story-vol-range'); const m = ov.querySelector('.story-vol-mute'); const b = rg.getBoundingClientRect(); rg.value = 30; rg.dispatchEvent(new Event('input', { bubbles: true })); rg.dispatchEvent(new Event('change', { bubbles: true })); rg.dispatchEvent(new MouseEvent('click', { bubbles: true })); return { range: [Math.round(b.width), Math.round(b.height)], mute: Math.round(m.getBoundingClientRect().height), voice: save.voiceVolume, sfx: save.sfxVolume, bgm: save.bgmVolume, on: save.sfxOn, hint: !!ov.querySelector('.story-vol-hint') }; })()`);
  await sleep(800);
  const after = await page.eval(`document.querySelectorAll('.story-mono p').length`);
  await page.eval(`document.querySelector('.story-vol-mute').click(); 1`);
  await sleep(400);
  const muted = await page.eval(`({ on: save.sfxOn, cls: document.querySelector('.story-vol').className })`);
  await page.screenshot(path.join(OUT, `${W}_2_muted.png`));
  console.log(W, JSON.stringify({ ...r, 押す前の行: before, 押した後の行: after, 消音: muted }));
  await s.close();
}
