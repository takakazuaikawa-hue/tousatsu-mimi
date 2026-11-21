#!/usr/bin/env node
// 幕間の声だけを確かめる（5場面それぞれ：表示→1行目で鳴る→次の行で止まる→スキップで止まる）
import { openSession, sleep } from './lib/session.mjs';
const sess = await openSession({ width: 1280, height: 800, speed: 1, clear: true, probes: ['voiceprobe.js'] });
const { page } = sess;
const ev = (e) => page.eval(e);
const out = {};
try {
  await sleep(2500);
  await ev(`save.sfxOn = true; save.bgmOn = false; save.introPlayed = true; saveProgress(); 1`);
  for (const id of ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet']) {
    await ev(`window.__voiceLog.length = 0; window.__vstarts.length = 0; state.screen='lobby'; render(); 1`);
    await ev(`showIntermission('${id}', () => {}); 1`);
    for (let i = 0; i < 50; i++) { if (await ev(`!!document.querySelector('.intermission-overlay')`)) break; await sleep(100); }
    await sleep(1200);
    const r = { enabled: await ev(`MimiVoice.enabled()`), l1: await ev(`window.__voiceLog.map(x=>x.id).join(',')`), starts1: await ev(`window.__vstarts.length`), playing1: await ev(`MimiVoice.isPlaying()`) };
    await ev(`document.querySelector('.intermission-overlay').click(); 1`);
    await sleep(400);
    r.playingAfterNext = await ev(`MimiVoice.isPlaying()`);
    r.logAfterNext = await ev(`window.__voiceLog.map(x=>x.id).join(',')`);
    await ev(`document.querySelector('.ims-skip-btn').click(); 1`);
    await sleep(200);
    await ev(`document.querySelector('.intermission-overlay').click(); 1`);
    await sleep(900);
    await ev(`document.querySelector('.intermission-overlay') && document.querySelector('.intermission-overlay').click(); 1`);
    await sleep(700);
    r.overlayLeft = await ev(`document.querySelectorAll('.intermission-overlay').length`);
    out[id] = r;
  }
  const qa = await ev('window.__QA');
  out.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ msg: e.desc || e.text })));
} catch (e) { out.fatal = String(e && e.stack || e); }
console.log(JSON.stringify(out));
await sess.close();
