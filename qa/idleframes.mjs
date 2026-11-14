// 相手の待機動画の元になる絵を、本編の卓から切り出す（部屋の背景＋相手だけ・2倍の解像度）。
// 卓 v8 の相手の枠（x340・y84）から 600×450 → 1200×900。node qa/idleframes.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [outDir = 'qa/out/idle'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const save = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 800 };
const { page, close } = await openSession({ width: 1280, height: 800, speed: 1, save });
await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
await sleep(3000);
const only = process.argv.slice(3);
for (const opp of (only.length ? only : ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'])) {
  // 研修のリコ先輩は講義を飛ばす合図を立ててから始める（講義の案内が開いたら下の撮影用の指定で隠す）
  await page.eval(`(() => { if (${JSON.stringify(opp)} === 'rico_tutorial') window.__ricoSkipLecture = true; startBattle(${JSON.stringify(opp)}); return 1; })()`);
  // 準備中（読み込み待ち）の間は待つ。各話の扉が出たら「開始」を押す
  for (let i = 0; i < 40; i++) {
    const st = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent) && b.offsetParent && !b.closest('.battle-screen')); if (b) { b.click(); return 'click'; } return state.screen === 'battle' && state.opponentId === ${JSON.stringify(opp)} && document.querySelector('.battle-screen') ? 'ok' : 'wait'; })()`);
    if (st === 'ok') break;
    await sleep(500);
  }
  await sleep(2500);
  // 手番だと render が「考え中」（部屋と相手を暗くする）を付けるので、相手の手番にしてから描き直し、いつもの表情で撮る
  await page.eval(`(() => {
    let st = document.getElementById('__idle_cap'); if (!st) { st = document.createElement('style'); st.id = '__idle_cap'; document.head.appendChild(st); }
    st.textContent = '#stage > :not(#app){display:none !important} .tutorial-overlay, .coach-overlay{display:none !important} .battle-screen > :not(.bg-poker):not(.t8-room):not(.v2-opp){visibility:hidden !important} .battle-screen .v2-tells{display:none !important} .battle-screen .t8-idle{display:none !important}';
    state.isPlayerTurn = false; state.opponentExpr = 'default'; render();
    document.querySelector('.battle-screen').classList.remove('is-deciding');
    setOpponentExpression('default'); return 1; })()`);
  await sleep(1500);
  const r = await page.eval(`(() => { const s = document.getElementById('stage').getBoundingClientRect(); const k = s.width / 1280; const img = document.querySelector('.v2-opp .char-opponent img'); return JSON.stringify({ x: s.left + 340 * k, y: s.top + 84 * k, k, ok: img && img.complete && img.naturalWidth > 0, src: img && img.getAttribute('src') }); })()`);
  const o = JSON.parse(r);
  const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: o.x, y: o.y, width: 600 * o.k, height: 450 * o.k, scale: 1 } });
  const f = path.join(outDir, `frame_${opp}.png`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  console.log(opp, o.src, o.ok, f);
  await page.eval(`(() => { document.getElementById('__idle_cap').textContent = ''; goLobby(); return 1; })()`);
  await sleep(1500);
}
await close();
