// バカラの曲：入ると1曲目が鳴り、終わると2曲目へ、2曲目が終わると1曲目へ戻るか。途中で画面の曲を鳴らし直しても頭に戻らないか。
// 使い方: node qa/baccaratbgm.mjs
import { openSession, sleep } from './lib/session.mjs';
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 1 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 200)));
const val = (js) => page.eval(js).catch(() => null);
const until = async (js, ms = 30000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
for (let i = 0; i < 60 && !(await val('typeof startBattle === "function" && !!window.BaccaratUI')); i++) await sleep(500);
const NOW = `(() => { const q = id => { const a = document.getElementById(id); return a && !a.paused ? id.replace('-audio','') + ':' + (a.currentSrc||a.src||'').split('/').pop() + ' vol ' + a.volume.toFixed(3) + ' loop ' + a.loop + ' t ' + a.currentTime.toFixed(1) + '/' + (a.duration||0).toFixed(1) : null; };
  return JSON.stringify({ screen: state && state.screen, key: _sceneBgmKey, playing: ['scene-bgm-audio','scene-bgm-audio-b','lobby-bgm-audio'].map(q).filter(Boolean) }); })()`;
const say = async (label) => console.log(label.padEnd(26), await val(NOW));
// 鳴っている曲を終わりの手前へ送って、終わるのを待つ
const toEnd = async () => { await ev(`const a = _sceneEl(); a.currentTime = Math.max(0, a.duration - 1.2)`); await sleep(3200); };
let bad = 0; const want = async (label, re) => { const r = await val(NOW) || ''; const ok = re.test(r); if (!ok) bad++; console.log((ok ? 'OK ' : 'NG ') + label.padEnd(30), r); };

await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.readIntroSeen = true; save.coins = 2400; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { velvet: 'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; save.bgmOn = true; save.bgmVolume = 35; save.baccarat = { demoSeen: true, godSeen: true, orSeen: true, betraySeen: true, qn: 0, sqMode: 'auto' }; saveProgress()`);
await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(5000);
await say('ホーム');
await ev('BaccaratUI.open()');
await until(`!!document.querySelector('.bc-host')`, 15000); await sleep(2500);
await want('入った直後＝1曲目', /realtime-attack\.mp3 vol 0\.27\d loop false/);
await toEnd();
await want('1曲目が終わる＝2曲目', /"key":"baccarat2".*bug-riyou-shimasu\.mp3 vol 0\.28\d loop false/);
await ev('startBgmForScreen()'); await sleep(1200);
await want('鳴らし直しても2曲目のまま', /"key":"baccarat2".*bug-riyou-shimasu\.mp3/);
await toEnd();
await want('2曲目が終わる＝1曲目', /"key":"baccarat".*realtime-attack\.mp3/);
await ev('goLobby()'); await sleep(2500);
await want('ホームへ戻る＝バカラの曲は止まる', /^(?!.*(realtime-attack|bug-riyou)).*$/);
await ev('BaccaratUI.open()'); await until(`!!document.querySelector('.bc-host')`, 15000); await sleep(2500);
await want('入り直す＝1曲目から', /realtime-attack\.mp3/);
console.log(bad ? `NG ${bad}件` : '全部 OK');
await session.close?.();
process.exit(bad ? 1 : 0);
