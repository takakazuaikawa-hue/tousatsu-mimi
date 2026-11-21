// 15回目の批評の直しを確かめる：消音の後に読み込み待ちの声が鳴らない／セリフ集を閉じたら声が止まる／ファイブポーカーの勝ち（±0）と配当の欄。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/fix15.mjs [667x375]   出力 qa/out/fix15/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '667x375').split('x').map(Number);
const OUT = path.resolve('qa/out/fix15'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: W, height: H, mobile: true, seed: 5, save: { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, coins: 3000, ownedItems: ['omake_voice_pack', 'memory_minipoker'], homeStageSeen: 5 } });
const { page } = s;
const val = (js) => page.eval(js).catch(e => 'ERR ' + e.message);
const log = {};
try {
  for (let i = 0; i < 60 && !(await val('typeof goLobby === "function" && !!window.MimiVoice')); i++) await sleep(500);
  await page.eval(`MimiVoice.loadManifest(); goLobby(); true`); await sleep(6000);
  await page.click(422, 120); await sleep(300);   // 音の許可
  // 1 読み込み待ちの間に音を切る：取得を遅らせ、鳴らす→すぐ消音→待つ
  log.mute = await val(`(async () => {
    const f0 = window.fetch; window.fetch = (...a) => new Promise(r => setTimeout(() => r(f0(...a)), 600));
    window.__voiceLog.length = 0;
    playVoice('mimi', 'panyu_n_1', { maxLateMs: 3000, noRepeat: false }); playVoice('grano', 'shop_memory_ending', { maxLateMs: 3000, noRepeat: false, queue: true }); playVoice('selina', 'allstar_banter_06_b', { maxLateMs: 3000, noRepeat: false, queue: true });
    save.allMute = true; stopVoice();
    await new Promise(r => setTimeout(r, 2500));
    const n = window.__voiceLog.length; save.allMute = false; window.fetch = f0;
    return '消音の後に鳴った声 ' + n + '本 ' + window.__voiceLog.map(l => l.id).join(',') + '（読み込みは ' + ['mimi/panyu_n_1','grano/shop_memory_ending'].map(id => MimiVoice.has(id)).join(',') + '）';
  })()`);
  // 2 セリフ集：鳴らしてから × で閉じる
  await page.eval(`showMemoryViewer('omake_voice_pack'); true`); await sleep(1200);
  await page.eval(`document.querySelectorAll('.memory-voice[data-voice]')[7].click(); true`); await sleep(900);
  const playing = await val(`MimiVoice.isPlaying()`);
  await page.eval(`document.querySelector('.memory-viewer-close').click(); true`); await sleep(400);
  log.viewer = '閉じる前 ' + playing + ' → 閉じた後 ' + await val(`MimiVoice.isPlaying()`);
  // 3 ファイブポーカー：勝ち（±0）と、配当の欄
  await page.eval(`showMiniPokerGame(); true`); await sleep(1500);
  await page.eval(`document.querySelector('.mp-tutorial [data-mp-tut]')?.click(); true`); await sleep(400);
  const seen = {};
  for (let i = 0; i < 70 && Object.keys(seen).length < 4; i++) {
    await page.eval(`document.querySelector('[data-mp="deal"]')?.click(); true`); await sleep(2300);
    await page.eval(`document.querySelector('[data-mp="hold-all"]')?.click(); true`); await sleep(3500);
    for (let k = 0; k < 8 && await val(`!!document.querySelector('.mp-garapon-slot')`); k++) { await page.eval(`document.querySelector('.mp-garapon-slot').click(); true`); await sleep(1500); }
    const r = await val(`(() => { const b = document.querySelector('.mp-result-banner'); if (!b) return ''; const sub = b.querySelector('.mp-result-sub'); return b.querySelector('.mp-result-headline').textContent + '｜' + (sub ? getComputedStyle(sub).display + ' ' + sub.textContent : '内訳なし'); })()`);
    const key = r.split('｜')[0].replace(/^.+ の勝ち$/, '相手の勝ち');
    if (r && !seen[key]) { seen[key] = r; await page.screenshot(path.join(OUT, `${W}x${H}_five_${Object.keys(seen).length}.png`)); }
    await page.eval(`document.querySelector('[data-mp="next"]')?.click(); true`); await sleep(800);
  }
  log.five = seen;
  log.totalWins = await val(`save.minipoker.totalWins + ' 勝 ／ ' + save.minipoker.totalGames + ' 戦'`);
  log.exceptions = s.exceptions.slice(0, 3);
} finally {
  console.log(JSON.stringify(log, null, 1));
  await s.close();
}
