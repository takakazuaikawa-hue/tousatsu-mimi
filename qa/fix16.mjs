// 16回目の直し：設定の声を0にしたら鳴っている声が止まるか、ダブルアップ失敗の配当の欄。node qa/fix16.mjs
import { openSession, sleep } from './lib/session.mjs';
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: 844, height: 390, mobile: true, save: { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, coins: 3000, homeStageSeen: 5, ownedItems: ['omake_voice_pack'] } });
const { page } = s;
const val = (js) => page.eval(js).catch(e => 'ERR ' + e.message);
try {
  for (let i = 0; i < 60 && !(await val('typeof goLobby === "function" && !!window.MimiVoice')); i++) await sleep(500);
  await page.eval(`MimiVoice.loadManifest(); goLobby(); true`); await sleep(6000);
  await page.click(422, 120); await sleep(300);
  await page.eval(`showMemoryViewer('omake_voice_pack'); true`); await sleep(1000);
  await page.eval(`document.querySelectorAll('.memory-voice[data-voice]')[7].click(); true`); await sleep(900);
  const before = await val(`MimiVoice.isPlaying()`);
  await page.eval(`document.querySelector('.memory-viewer-close').click(); save.voiceVolume = 80; true`);
  await page.eval(`document.querySelectorAll('.memory-voice[data-voice]').length; true`);
  // 鳴らし直してから、設定の声のつまみを0に
  await page.eval(`playVoice('rico', 'serif_bluff', { noRepeat: false, maxLateMs: 3000 }); true`); await sleep(900);
  const playing = await val(`MimiVoice.isPlaying()`);
  await page.eval(`onAction({ currentTarget: { dataset: { action: 'open-settings' } }, preventDefault(){}, stopPropagation(){}, target: document.body }); true`); await sleep(1000);
  const has = await val(`!!document.querySelector('[data-volume="voice"]')`);
  await page.eval(`const i = document.querySelector('[data-volume="voice"]'); if (i) { i.value = 0; i.dispatchEvent(new Event('input')); } true`); await sleep(300);
  console.log('セリフ集', before, '／ 設定のつまみ', has, '0にする前', playing, '→ 後', await val(`MimiVoice.isPlaying()`));
  console.log('例外', JSON.stringify(s.exceptions.slice(0, 3)));
} finally { await s.close(); }
