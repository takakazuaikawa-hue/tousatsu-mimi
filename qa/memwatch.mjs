// 各遊び→ホームへ戻る流れで、メモリの山（瞬間の跳ね上がり）を測る（11/23「ホームに戻る時に落ちやすい。突然跳ね上がってもクラッシュする」）
// node qa/memwatch.mjs [場面,...] [周回]   出力 qa/out/memwatch.json と、場面ごとの山の表
// 測る物：検査ブラウザの描画の係と GPU の係の実メモリ（Windows の私用メモリ）を 0.25 秒ごと。絵の展開・動画・DOM を全部含む実の量
import fs from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const SCENES = (process.argv[2] || 'battle,allstar,baccarat,five,kachinuki,panyu,shop,collection,horoyoi').split(',');
const LOOPS = +(process.argv[3] || 2);
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SAVE = { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 99999, horoyoiCleared: ST,
  ownedItems: ['memory_minipoker', 'cgset_velvet_book', 'cgset_deisui_book'], rewardCgSeen: ST, deisuiAllCleared: true };
const { page, browser, close } = await openSession({ width: 844, height: 390, mobile: true, save: SAVE });
const q = (js, t) => page.eval(js, t || 60000).catch(e => 'ERR ' + e.message.slice(0, 120));

// 検査ブラウザの子の係（自分の profile のものだけ）の PID を集める
function pids() {
  const prof = browser.profile.replace(/\\/g, '\\\\');
  const out = execFileSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe' or Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile}*' } | ForEach-Object { $t = if ($_.CommandLine -match '--type=(\\S+)') { $matches[1] } else { 'browser' }; "$($_.ProcessId) $t" }`], { encoding: 'utf8' });
  return out.trim().split(/\r?\n/).map(l => l.trim().split(' ')).filter(a => a[0]).map(([p, t]) => ({ pid: +p, type: t }));
}
let samples = [], mark = 'boot';
let watcher = null;
function startWatch(list) {
  const ids = list.filter(x => /renderer|gpu-process/.test(x.type)).map(x => x.pid);
  const ps = `while ($true) { $r = 0; $g = 0; foreach ($id in @(${ids.join(',')})) { $p = Get-Process -Id $id -ErrorAction SilentlyContinue; if ($p) { if (${JSON.stringify(list.filter(x => x.type === 'gpu-process').map(x => x.pid))}.Contains($id)) { $g += $p.PrivateMemorySize64 } else { $r += $p.PrivateMemorySize64 } } }; [Console]::Out.WriteLine("$r $g"); [Console]::Out.Flush(); Start-Sleep -Milliseconds 250 }`
    .replace(JSON.stringify(list.filter(x => x.type === 'gpu-process').map(x => x.pid)), '@(' + list.filter(x => x.type === 'gpu-process').map(x => x.pid).join(',') + ')');
  watcher = spawn('powershell', ['-NoProfile', '-Command', ps]);
  let buf = '';
  watcher.stdout.on('data', d => { buf += d; const L = buf.split('\n'); buf = L.pop(); for (const l of L) { const [r, g] = l.trim().split(' ').map(Number); if (r) samples.push({ t: Date.now(), r: Math.round(r / 1048576), g: Math.round((g || 0) / 1048576), mark }); } });
}
const step = async (label, js, waitMs) => { mark = label; if (js) await q(js); await sleep(waitMs); };
const ACT = {
  battle: [['battle', `(() => { startBattle('velvet'); return 1; })()`, 9000], ['battle-play', `(() => { const b = document.querySelector('[data-action="start-hand"]'); if (b) b.click(); return 1; })()`, 7000]],
  horoyoi: [['horoyoi', `(() => { save.horoyoiMode = true; save.deisuiMode = true; state.horoyoi = true; startBattle('velvet'); return 1; })()`, 9000], ['horoyoi-play', `(() => { const b = document.querySelector('[data-action="start-hand"]'); if (b) b.click(); return 1; })()`, 7000]],
  allstar: [['allstar', `(() => { AllstarUI.onAction('allstar-seat'); return 1; })()`, 14000]],
  baccarat: [['baccarat', `(() => { BaccaratUI.open(); return 1; })()`, 12000]],
  five: [['five', `(() => { showMiniPokerGame(); return 1; })()`, 9000]],
  kachinuki: [['kachinuki', `(() => { knStart(true); return 1; })()`, 11000]],
  panyu: [['panyu', `(() => { const b = document.querySelector('[data-action="panyu-free"]'); if (b) b.click(); return 1; })()`, 10000]],
  shop: [['shop', `(() => { const b = document.querySelector('[data-action="open-shop"]'); if (b) b.click(); return 1; })()`, 8000]],
  // クリア後→ホーム（11/23 ユーザー「それぞれのクリア後からホームに戻る瞬間が危うい」）
  clear: [['clear-battle', , 8000],
    ['clear-win', , 4000],
    ['clear-inter', , 4000],
    ['clear-story', , 14000],
    ['clear-cg', null, 6000]],
  knend: [['kn-end', , 5000]],
  dawn: [['dawn', , 12000],
    ['dawn-fin', , 4000]],
  photobook: [['photobook', , 5000],
    ['photobook-flip', , 9000]],
  collection: [['collection', `(() => { const b = document.querySelector('[data-action="open-collection"]'); if (b) b.click(); return 1; })()`, 5000], ['cg-view', `(() => { try { showRewardCgViewer('cgset_deisui_book'); } catch (e) { } return 1; })()`, 6000]],
};
const HOME = `(() => {
  document.querySelectorAll('.minipoker-close').forEach(b => b.click());
  document.querySelectorAll('.panyu-clicker-overlay .panyu-close, .panyu-clicker-overlay [data-action="panyu-close"], .cg-viewer-close, .reward-cg-close').forEach(b => b.click());
  document.querySelectorAll('.panyu-clicker-overlay, .cgv-overlay, .reward-cg-viewer, .collection-overlay, .kn-ov, .story-overlay, .deisui-fin, .grad-scene-overlay, [class*="cg-viewer"], [class*="rcg"]').forEach(e => e.remove());
  if (window.AllstarUI && document.querySelector('.as-host, .allstar-host')) { try { AllstarUI.teardown(); } catch (e) { } }
  save.horoyoiMode = false; save.deisuiMode = false; if (state) state.horoyoi = false;
  goLobby(); return 1; })()`;
try {
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(2000);
  startWatch(pids());
  await step('title', null, 3000);
  await step('home', `(() => { state.screen = 'lobby'; render(); return 1; })()`, 9000);
  for (let loop = 1; loop <= LOOPS; loop++) for (const sc of SCENES) {
    for (const [label, js, w] of ACT[sc]) await step(`${sc}#${loop}:${label}`, js, w);
    await step(`${sc}#${loop}:→home`, HOME, 2500);
    await step(`${sc}#${loop}:home`, null, 5000);
  }
} finally {
  if (watcher) watcher.kill();
  await close();
}
fs.writeFileSync('qa/out/memwatch.json', JSON.stringify(samples));
// 場面ごとの山（描画の係＋GPU）と、入る直前からの跳ね上がり
const by = new Map();
let prev = null;
for (const s of samples) { const k = s.mark; const v = s.r + s.g; if (!by.has(k)) by.set(k, { k, min: v, max: v, start: prev, n: 0 }); const o = by.get(k); o.max = Math.max(o.max, v); o.min = Math.min(o.min, v); o.n++; prev = v; }
for (const o of by.values()) console.log(o.k.padEnd(30), 'peak', String(o.max).padStart(5), 'MB', ' low', String(o.min).padStart(5), ' jump', o.start != null ? (o.max - o.start) : '-', ' n', o.n);
const all = samples.map(s => s.r + s.g); console.log('OVERALL peak', Math.max(...all), 'MB  first', all[0], ' last', all[all.length - 1]);
