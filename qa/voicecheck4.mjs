#!/usr/bin/env node
// 幕間の声が二重に鳴らないか：二重呼び出し・連打・最後まで進める・もう一度呼ぶ
import { openSession, sleep } from './lib/session.mjs';
const sess = await openSession({ width: 1280, height: 800, speed: 1, clear: true, probes: ['voiceprobe.js'] });
const { page } = sess;
const ev = (e) => page.eval(e);
const out = {};
try {
  await sleep(2500);
  await ev(`save.sfxOn = true; save.bgmOn = false; save.introPlayed = true; saveProgress(); 1`);
  await ev(`window.__voiceLog.length = 0; window.__vstarts.length = 0; window.__done = 0; state.screen='lobby'; render();
    const f = () => window.__done++; showIntermission('polka', f); showIntermission('polka', f); 1`);
  await sleep(5000);
  out.afterDoubleCall = { overlays: await ev(`document.querySelectorAll('.intermission-overlay').length`), log: await ev(`window.__voiceLog.map(x=>x.id).join(',')`), starts: await ev(`window.__vstarts.length`) };
  for (let i = 0; i < 12; i++) { await ev(`document.querySelector('.intermission-overlay') && document.querySelector('.intermission-overlay').click(); 1`); await sleep(120); }
  await sleep(1500);
  for (let i = 0; i < 4; i++) { await ev(`document.querySelector('.intermission-overlay') && document.querySelector('.intermission-overlay').click(); 1`); await sleep(800); }
  out.afterRapidClicks = { overlays: await ev(`document.querySelectorAll('.intermission-overlay').length`), log: await ev(`window.__voiceLog.map(x=>x.id).join(',')`), done: await ev(`window.__done`) };
  // 終わる直前（消えかけの400ms）にもう一度呼ぶ：開かない
  await ev(`window.__voiceLog.length = 0; showIntermission('polka', () => {}); 1`);
  await sleep(1500);
  for (let i = 0; i < 6; i++) { await ev(`document.querySelector('.ims-skip-btn') && document.querySelector('.ims-skip-btn').click(); 1`); await sleep(700); await ev(`document.querySelector('.intermission-overlay') && document.querySelector('.intermission-overlay').click(); 1`); await sleep(100); if (await ev(`!!document.querySelector('.intermission-overlay.out')`)) break; }
  await ev(`showIntermission('polka', () => {}); 1`);
  await sleep(1500);
  out.duringFade = { overlays: await ev(`document.querySelectorAll('.intermission-overlay').length`), log: await ev(`window.__voiceLog.map(x=>x.id).join(',')`) };
  await sleep(800);
  // 終わったあとにもう一度呼ぶ（本物の流れでは起きない）→ 1回だけ増えるはず
  await ev(`window.__voiceLog.length = 0; showIntermission('polka', () => {}); 1`);
  await sleep(1500);
  out.again = await ev(`window.__voiceLog.map(x=>x.id).join(',')`);
  const qa = await ev('window.__QA');
  out.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ msg: e.desc || e.text })));
} catch (e) { out.fatal = String(e && e.stack || e); }
console.log(JSON.stringify(out));
await sess.close();
