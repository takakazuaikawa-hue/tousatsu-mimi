// DLsite 版（dist/dlsite/Mimi_Texas_Holdem の exe）を起動し、通信を切って、壊れる所が無いかを確かめる（DevTools の口から操る）。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/dlsitecheck.mjs [WxH]   出力 qa/out/dlsite/
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Conn, Page, sleep } from './lib/cdp.mjs';
import { REPO } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
const ROOT = path.join(REPO, 'dist', 'dlsite', 'Mimi_Texas_Holdem');
const OUT = path.join(REPO, 'qa', 'out', 'dlsite'); fs.mkdirSync(OUT, { recursive: true });
const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const log = { failed: [], online: [], errors: [], console: [] };
const UD = fs.mkdtempSync(path.join(process.env.QA_TMP || path.join(REPO, 'qa', 'out'), 'electron-prof-'));
const port = 9900 + Math.floor(Math.random() * 90);
const proc = spawn(path.join(ROOT, 'MimiTexasHoldem.exe'), ['--remote-debugging-port=' + port, '--user-data-dir=' + UD, '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'], { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 150 && !target; i++) { try { const l = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); target = l.find(t => t.type === 'page' && t.url.startsWith('app://game/')); } catch {} if (!target) await sleep(200); }
if (!target) { proc.kill(); throw new Error('アプリの窓が見つからない'); }
const ver = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
const conn = new Conn(ws);
const { sessionId } = await conn.send('Target.attachToTarget', { targetId: target.id, flatten: true });
const page = new Page(conn, sessionId); await page.send('Page.enable');
const browser = { close: async () => { try { proc.kill(); } catch {} await sleep(1500); for (let i = 0; i < 5; i++) { try { fs.rmSync(UD, { recursive: true, force: true }); } catch {} if (!fs.existsSync(UD)) break; await sleep(800); } } };
await page.send('Network.enable');
await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await page.send('Runtime.enable');
page.on('Network.requestWillBeSent', (p) => { if (!/^(file|data|blob|app|devtools):/.test(p.request.url)) log.online.push(p.request.url.slice(0, 120)); });
page.on('Network.loadingFailed', (p) => { log.failed.push((p.errorText || '') + ' ' + (p.requestId || '')); });
page.on('Network.responseReceived', (p) => { if (p.response.status >= 400) log.failed.push(p.response.status + ' ' + p.response.url.slice(-80)); });
page.on('Runtime.exceptionThrown', (p) => { const d = p.exceptionDetails || {}; log.errors.push(String((d.exception && d.exception.description) || d.text).slice(0, 200)); });
page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') log.console.push(p.args.map(a => a.value || a.description || '').join(' ').slice(0, 200)); });
const val = (js) => page.eval(js).catch(e => 'ERR ' + e.message);
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
try {
  await page.send('Page.reload', {}); await sleep(1500);
  for (let i = 0; i < 60 && !(await val('typeof startBattle === "function"')); i++) await sleep(500);
  await sleep(4000);
  await shot('1_title');
  log.title = await val(`JSON.stringify({ local: !!window.MIMI_LOCAL, fontsMincho: document.fonts.check('700 20px "Shippori Mincho B1"'), fontsNoto: document.fonts.check('400 16px "Noto Sans JP"'), fontStatus: [...document.fonts].filter(f => f.status === 'loaded').length, pack: !!document.querySelector('[class*="pack"]') })`);
  await page.click(W / 2, H / 2); await sleep(500);
  // 新しいセーブで最初の手の練習まで、の代わりに、クリア済みのセーブでホーム・声・動画・ぱにゅぱにゅを見る
  await val(`(() => { save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; save.introPlayed = true; save.houseRulesSeen = true; save.readIntroSeen = true; save.rewardCgSeen = [...save.clearedStages]; save.homeStageSeen = 5; save.coins = 3000; save.ownedItems = ['omake_voice_pack']; saveProgress(); goLobby(); return 1; })()`);
  await sleep(6000);
  await shot('2_home');
  await val(`window.__voiceLog.length = 0; document.querySelector('.h15-rico-talk').click(); 1`); await sleep(2500);
  log.voiceHome = await val(`JSON.stringify(window.__voiceLog.map(l => l.id + ' 遅れ' + l.late))`);
  await val(`window.__voiceLog.length = 0; showMemoryViewer('omake_voice_pack'); 1`); await sleep(1000);
  await val(`document.querySelectorAll('.memory-voice[data-voice]')[0].click(); 1`); await sleep(2500);
  log.voiceMemory = await val(`JSON.stringify(window.__voiceLog.map(l => l.id)) + ' 鳴っている ' + MimiVoice.isPlaying()`);
  await val(`document.querySelector('.memory-viewer-close').click(); 1`);
  log.bgm = await val(`(() => { const a = [...document.querySelectorAll('audio')]; return a.map(x => (x.id || '?') + ':' + x.readyState + (x.error ? ' 失敗' + x.error.code : '')).join(' '); })()`);
  // ご褒美の一枚絵（動画）
  await val(`showRewardCgViewer('polka'); 1`); await sleep(4000);
  await shot('3_cg');
  log.video = await val(`(() => { const v = [...document.querySelectorAll('video')]; return v.length ? v.map(x => x.readyState + (x.error ? ' 失敗' : '') + ' ' + (x.currentSrc || '').slice(-40)).join(' ／ ') : '動画なし'; })()`);
  await val(`document.querySelectorAll('.reward-cg-viewer, .cg-viewer, [class*="viewer-overlay"]').forEach(e => e.remove()); 1`);
  // ぱにゅぱにゅ（網目の頁を iframe で読む）
  await val(`onAction({ currentTarget: { dataset: { action: 'panyu-free' } }, preventDefault(){}, stopPropagation(){}, target: document.body }); 1`); await sleep(5000);
  await shot('4_panyu');
  log.panyu = await val(`(() => { const f = document.querySelector('iframe'); return f ? (f.getAttribute('src') || '').slice(0, 60) + ' 中身 ' + (f.contentDocument ? 'あり' : '読めない') : 'iframe なし'; })()`);
  // 対戦（ポルカ）を開いて卓を出す
  await val(`document.querySelectorAll('.panyu-clicker-overlay, [class*="pv2"]').forEach(e => e.remove()); startBattle('polka'); 1`); await sleep(3000);
  for (let i = 0; i < 5; i++) { await val(`(() => { const b = [...document.querySelectorAll('button')].find(b => /最初から|開始|はじめる/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1; })()`); await sleep(1200); }
  await sleep(2000);
  await shot('5_table');
  log.table = await val(`state.screen + ' ' + state.handPhase`);
} catch (e) { log.fatal = String(e && e.stack || e); }
finally {
  log.failed = [...new Set(log.failed)].slice(0, 20); log.online = [...new Set(log.online)].slice(0, 20);
  fs.writeFileSync(path.join(OUT, `${W}x${H}_log.json`), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 1));
  await browser.close();
}
