#!/usr/bin/env node
// 声の組み込みの検査：対戦の掛け声・先読み・ON/OFF・プロローグ/幕間/エンディング・設定画面・コンソールエラー。
// 検査用のブラウザは同時に1つだけ（このスクリプトは1つの Edge で順に確かめる）。
// node qa/voicecheck.mjs [out=qa/out/voice] [--hands 14]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';

const outDir = path.resolve(REPO, process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'qa/out/voice');
fs.mkdirSync(outDir, { recursive: true });
const R = { checks: {} };
const W = 1280, H = 800;
const sess = await openSession({ width: W, height: H, speed: 1, clear: true, probes: ['bot.js', 'voiceprobe.js'] });
const { page } = sess;
const ev = (e) => page.eval(e);
const shot = async (n) => { const r = await page.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(outDir, n + '.png'), Buffer.from(r.data, 'base64')); };
const log = () => ev(`JSON.stringify(window.__voiceLog.map(x=>x.id))`).then(JSON.parse);
const starts = () => ev(`window.__vstarts.length`);
try {
  await sleep(1500);
  // ── 準備：セーブを整える（声ON・効果音ON）
  R.init = JSON.parse(await ev(`JSON.stringify({ voiceOn: save.voiceOn, voiceVolume: save.voiceVolume, sfxOn: save.sfxOn, hasVoice: !!window.MimiVoice, preloadedAtBoot: MimiVoice._buffers.size })`));

  // (b) 先読み：ロビーの warmNextBattle 相当 → 対戦の前に読む
  const t0 = Date.now();
  await ev(`save.sfxOn = true; save.bgmOn = false; save.introPlayed = true; save.clearedStages = ['rico_tutorial']; save.episodesSeen = ['rico_tutorial','polka']; saveProgress(); 1`);
  await ev(`new Promise(r => MimiVoice.preloadBattle(['mimi','polka']).then(() => r(1)))`);
  R.preload = JSON.parse(await ev(`JSON.stringify({ n: MimiVoice._buffers.size, ids: [...MimiVoice._buffers.keys()].sort() })`));
  R.preload.ms = Date.now() - t0;
  // 再生要求から start までの時間（読み済み）
  const lat = JSON.parse(await ev(`(() => { window.__voiceLog.length = 0; window.__vstarts.length = 0;
    const t = performance.now(); const ok = MimiVoice.playId('polka/bark_call', { noRepeat: false });
    return JSON.stringify({ ok, startsAfter: window.__vstarts.length, dt: window.__vstarts.length ? +(window.__vstarts[0].t - t).toFixed(1) : null }); })()`));
  R.latencyPreloaded = lat;
  // 未読みの声は既定では鳴らさない（遅れて鳴らない）
  const cold = JSON.parse(await ev(`(() => { MimiVoice.stopVoice(); window.__vstarts.length = 0; const ok = playVoice('velvet','bark_raise_1',{ noRepeat:false, maxLateMs:0 }); return JSON.stringify({ ok, buffered: MimiVoice._buffers.has('velvet/bark_raise_1') }); })()`));
  R.coldNoLate = cold;
  await sleep(400);

  // (c) ON/OFF
  const gate = {};
  for (const [name, setup] of [['voiceOff', 'save.voiceOn=false'], ['sfxOff', 'save.sfxOn=false'], ['allOff', 'save.sfxOn=false;save.bgmOn=false'], ['vol0', 'save.voiceVolume=0'], ['on', 'save.voiceOn=true;save.sfxOn=true;save.voiceVolume=80']]) {
    gate[name] = JSON.parse(await ev(`(() => { ${setup}; MimiVoice.stopVoice(); window.__vstarts.length = 0; const ok = MimiVoice.playId('polka/bark_check', { noRepeat:false }); return JSON.stringify({ ok, enabled: MimiVoice.enabled() }); })()`));
    await sleep(150);
    gate[name].starts = await starts();
    await ev(`save.voiceOn=true;save.sfxOn=true;save.voiceVolume=80;1`);
  }
  R.gate = gate;
  await ev(`MimiVoice.stopVoice(); 1`);

  // (a) 対戦：ボットで polka と数ハンド
  await ev(`goLobby(); 1`); await sleep(800);
  await ev(`window.__voiceLog.length = 0; window.__vstarts.length = 0; 1`);
  const hands = +(process.argv.find(a => a.startsWith('--hands='))?.split('=')[1] || 14);
  let seenHand = new Set(), steps = 0, lastSnap = null;
  const tEnd = Date.now() + 240000;
  while (Date.now() < tEnd && seenHand.size < hands) {
    const res = await ev(`window.__qaBot ? window.__qaBot.step('learner') : null`).catch(() => null);
    if (!res) { await sleep(200); continue; }
    steps++; lastSnap = res.snap;
    if (res.snap.screen === 'battle' && res.snap.hand) seenHand.add(res.snap.opp + '#' + res.snap.hand);
    if (res.did) await page.click(res.did.x, res.did.y);
    await sleep(90);
  }
  R.battle = { steps, hands: seenHand.size, opp: lastSnap && lastSnap.opp, screen: lastSnap && lastSnap.screen };
  const vl = JSON.parse(await ev(`JSON.stringify(window.__voiceLog)`));
  R.battle.log = vl.map(x => x.id);
  R.battle.starts = await starts();
  R.battle.lateMs = vl.map(x => x.late).filter(x => x != null);
  await shot('battle');
  const qa = await ev('window.__QA');
  R.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ type: 'exception', msg: e.desc || e.text })));
} finally {
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
  await sess.close();
}
