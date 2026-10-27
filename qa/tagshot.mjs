// ボタンの上にはみ出す札（リコのおすすめ・狙った額に一番近い・ここを押そう）が前に出ているかを撮る。node qa/tagshot.mjs <WxH>
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [size = '844x390'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
// 1) リコのおすすめ（ポルカの卓）・狙った額（セリナの卓の額を選ぶ所）
let s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, coins: 500 } });
let { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await page.eval(`startBattle('polka'); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(800); }
await sleep(1500);
await page.eval(`(() => { state.isPlayerTurn = true; state.__suggest = 'call'; render(); return 1; })()`); await sleep(700);
await page.screenshot(path.resolve(`qa/out/tag_suggest_${size}.png`));
await page.eval(`(() => { state.__suggest = null; state.sniperBet = 100; state.sniperBetHand = state.handNo; state.betChooserOpen = true; render(); return 1; })()`); await sleep(700);
await page.screenshot(path.resolve(`qa/out/tag_sniper_${size}.png`));
await s.close();
// 2) ここを押そう（研修）
s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: [], introPlayed: false, coins: 0 } });
page = s.page;
await sleep(2000);
await page.eval(`(() => { startIntroHand(); return true; })()`);
for (let i = 0; i < 60; i++) {
  await sleep(500);
  const st = await page.eval(`(() => { const L = document.querySelector('.coach-layer'); if (!L) return 'none'; if (L.classList.contains('is-wait') && document.querySelector('.is-intro-go')) return 'go'; L.click(); return 'tap'; })()`);
  if (st === 'go') { await sleep(800); await page.screenshot(path.resolve(`qa/out/tag_introgo_${size}.png`)); console.log('ここを押そう 撮った'); break; }
}
await s.close(); process.exit(0);
