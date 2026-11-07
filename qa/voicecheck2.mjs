#!/usr/bin/env node
// 声の組み込みの検査 その2：プロローグ・幕間・エンディング（行ごとに鳴る・スキップで止まる）と設定画面。
// node qa/voicecheck2.mjs [out=qa/out/voice2]   ※速度は等倍（声の長さは実時間）。エンディングは数分かかる
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';
const outDir = path.resolve(REPO, process.argv[2] || 'qa/out/voice2');
fs.mkdirSync(outDir, { recursive: true });
const R = {};
const sess = await openSession({ width: 1280, height: 800, speed: 1, clear: true, probes: ['voiceprobe.js'] });
const { page } = sess;
const ev = (e) => page.eval(e);
const shot = async (n) => { const r = await page.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(outDir, n + '.png'), Buffer.from(r.data, 'base64')); };
const ids = async () => JSON.parse(await ev(`JSON.stringify(window.__voiceLog.map(x=>x.id))`));
const playing = () => ev(`MimiVoice.isPlaying()`);
const meas = () => ev(`(() => { const m = document.querySelector('.settings-modal'); const r = m.getBoundingClientRect();
    const row = document.querySelector('[data-volume="voice"]').closest('.settings-modal-row'); const rr = row.getBoundingClientRect();
    const lab = row.querySelector('.settings-modal-label'); const sl = row.querySelector('input'); const tg = row.querySelector('button');
    const sc = m.getBoundingClientRect().width / m.offsetWidth; const fs = parseFloat(getComputedStyle(lab).fontSize);
    return JSON.stringify({ modal: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight, scale: +sc.toFixed(3),
      rowH: Math.round(rr.height), rowW: Math.round(rr.width), labelPx: +(fs*sc).toFixed(1), labelH: Math.round(lab.getBoundingClientRect().height), sliderW: Math.round(sl.getBoundingClientRect().width), sliderH: Math.round(sl.getBoundingClientRect().height), toggle: [Math.round(tg.getBoundingClientRect().width), Math.round(tg.getBoundingClientRect().height)],
      rowRight: Math.round(rr.right), modalRight: Math.round(r.right), scrollH: m.scrollHeight, clientH: m.clientHeight, text: row.innerText.replace(/\\s+/g,' ') }); })()`).then(JSON.parse);
try {
  for (let i = 0; i < 60; i++) { if (await ev(`!!document.querySelector('[data-action="start"]')`)) break; await sleep(500); }
  await sleep(1500);
  await ev(`save.sfxOn = true; save.bgmOn = false; saveProgress(); 1`);
  // ── プロローグ
  const t0 = Date.now();
  await ev(`document.querySelector('[data-action="start"]').click(); 1`);
  let appeared = null;
  for (let i = 0; i < 80; i++) { if (await ev(`!!document.querySelector('.story-overlay')`)) { appeared = Date.now() - t0; break; } await sleep(100); }
  R.prologue = { overlayAfterMs: appeared };
  await sleep(1500);
  const per = [];
  let skipped = false;
  for (let n = 0; n < 40; n++) {
    if (!(await ev(`!!document.querySelector('.story-overlay')`))) break;
    const before = (await ids()).length;
    await ev(`document.querySelector('.story-overlay').click(); 1`);
    await sleep(900);
    await ev(`(document.querySelector('.story-overlay')||{click(){}}).click(); 1`);
    await sleep(1400);
    const l = await ids();
    per.push({ n, plays: l.length - before, last: l[l.length - 1] });
    if (l.length >= 8 && !skipped) {
      skipped = true;
      const pBefore = await playing();
      await ev(`document.querySelector('.story-skip').click(); 1`);
      await sleep(300);
      R.prologue.skip = { playingBefore: pBefore, playingAfter: await playing(), overlayGone: await ev(`!document.querySelector('.story-overlay')`) };
      break;
    }
  }
  R.prologue.per = per;
  R.prologue.log = await ids();
  await sleep(800);

  // ── 幕間（polka）
  await ev(`window.__voiceLog.length = 0; state.screen='lobby'; render(); 1`);
  await ev(`showIntermission('polka', () => {}); 1`);
  for (let i = 0; i < 50; i++) { if (await ev(`!!document.querySelector('.intermission-overlay')`)) break; await sleep(100); }
  await sleep(1500);
  const imsA = { log1: await ids(), playing1: await playing() };
  await ev(`document.querySelector('.intermission-overlay').click(); 1`);
  await sleep(700);
  imsA.afterNextLine = { log: await ids(), playing: await playing() };
  await ev(`document.querySelector('.ims-skip-btn').click(); 1`);
  await sleep(300);
  imsA.afterSkip = { playing: await playing() };
  R.intermission = imsA;
  await ev(`document.querySelector('.intermission-overlay').click(); 1`);
  await sleep(900);
  await ev(`document.querySelector('.intermission-overlay') && document.querySelector('.intermission-overlay').click(); 1`);
  await sleep(700);

  // ── 設定画面（PC と 844x390）
  await ev(`showSettingsModal(); 1`);
  await sleep(400);
  R.settingsPC = await meas();
  await shot('settings_pc');
  R.settingsOps = JSON.parse(await ev(`(() => { const b = document.querySelector('[data-toggle="voice"]'); b.click(); const off = save.voiceOn; b.click(); const on = save.voiceOn;
    const s = document.querySelector('[data-volume="voice"]'); s.value = 55; s.dispatchEvent(new Event('input')); return JSON.stringify({ afterFirst: off, afterSecond: on, vol: save.voiceVolume }); })()`));
  await ev(`document.querySelector('.settings-modal-close').click(); save.voiceVolume=80; 1`);
  await page.setViewport(844, 390, true);
  await sleep(600);
  await ev(`showSettingsModal(); 1`);
  await sleep(500);
  R.settingsSP = await meas();
  await shot('settings_sp');
  await ev(`document.querySelector('.settings-modal-close').click(); 1`);
  await page.setViewport(1280, 800, false);
  await sleep(500);

  // ── エンディング（等倍）
  await ev(`save.clearedStages=['rico_tutorial','polka','selina','grano','velvet']; saveProgress(); window.__voiceLog.length = 0; window.__vstarts.length = 0; state.endingReplay = { screen: 'lobby', collection: false }; state.screen = 'ending'; render(); 1`);
  await sleep(800);
  await ev(`document.querySelector('#ending-without-music').click(); 1`);
  const te = Date.now();
  const marks = [];
  for (let i = 0; i < 400; i++) {
    await sleep(1000);
    const l = JSON.parse(await ev(`JSON.stringify(window.__voiceLog.map(x=>x.id))`));
    if (l.length !== marks.length) marks.push(...l.slice(marks.length).map(x => [x, Math.round((Date.now() - te) / 1000)]));
    if (await ev(`!!document.querySelector('.ending-final-buttons')`)) break;
  }
  R.ending = { startedVoices: marks, secTotal: Math.round((Date.now() - te) / 1000) };
  await sleep(4000);
  R.ending.lastLinePlayed = (await ids()).includes('rico/end_12');
  await shot('ending_final');
  await ev(`document.querySelector('[data-ep-exit="back"]').click(); 1`);
  await sleep(800);
  R.ending.afterExitPlaying = await playing();

  // ── スキップ版
  await ev(`window.__voiceLog.length = 0; state.endingReplay = { screen: 'lobby', collection: false }; state.screen = 'ending'; render(); 1`);
  await sleep(600);
  await ev(`document.querySelector('#ending-without-music').click(); 1`);
  await sleep(11000);
  const pb = await playing(), lb = await ids();
  await ev(`document.querySelector('.ec-skip').click(); 1`);
  await sleep(300);
  R.endingSkip = { playingBefore: pb, logBefore: lb, playingAfterSkip: await playing() };
  await sleep(2500);
  R.endingSkip.finalLine = (await ids()).includes('rico/end_12');
  const qa = await ev('window.__QA');
  R.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ type: 'exception', msg: e.desc || e.text })));
} catch (e) {
  R.fatal = String(e && e.stack || e);
} finally {
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(R, null, 1));
  await sess.close();
}
