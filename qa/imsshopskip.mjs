// 勝利画面→交換所→ロビーで幕間が飛ばされないかを確かめる。node qa/imsshopskip.mjs [相手id]
// 勝利画面の交換所への札（「解放」「交換所で N点 交換できます」）が、幕間の前は押せないことと、
// 幕間を見た後は押せて交換所→ロビーへ進めることを見る。
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'polka';
const O = 'qa/out/imsshopskip'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ORDER = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const before = ORDER.slice(0, ORDER.indexOf(id));
// 手持ちを多めにして「交換所で N点 交換できます」の札が出るようにする
await ev(`save.coins = 99999; save.introPlayed = true; save.clearedStages = ${JSON.stringify(before)}; save.rewardCgSeen = ${JSON.stringify(before)}; save.episodesSeen = ${JSON.stringify(before)}; save.homeStageSeen = ${before.length}; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
await ev(`startBattle('${id}')`);
await sleep(3000);
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/開始|対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2200); }
await ev(`state.opponentChips = 0; state.playerChips += 5000; endBattle()`);
await sleep(4500);
await page.screenshot(`${O}/1_result.png`);
const info = () => q(`JSON.stringify({ screen: state.screen, main: document.querySelector('.result-main-btn')?.innerText.replace(/\\s+/g,''), goal: (b => b && { text: b.innerText.replace(/\\s+/g,' '), disabled: b.disabled })(document.querySelector('.result-coin-goal')), unlock: (b => b && { text: b.innerText.replace(/\\s+/g,' '), disabled: b.disabled })(document.querySelector('.result-unlock')), seen: (save.rewardCgSeen||[]).includes('${id}') })`);
console.log('勝利画面', await info());
// 交換所への札を押す（人が押すのと同じく、押せない札は押しても何も起きない）
await ev(`const b = document.querySelector('.result-coin-goal') || document.querySelector('.result-unlock'); if (b && !b.disabled) b.click()`);
await sleep(2500);
console.log('札を押した後', await q('state.screen'));
await page.screenshot(`${O}/2_after_goal_click.png`);
if (await q('state.screen') === 'shop') {
  await ev(`const b=document.querySelector('[data-action=back-lobby]'); if(b) b.click()`);
  await sleep(3000);
  console.log('ロビーへ', await q(`JSON.stringify({ screen: state.screen, ims: !!document.querySelector('.intermission-overlay'), seen: (save.rewardCgSeen||[]).includes('${id}') })`));
  await page.screenshot(`${O}/3_lobby.png`);
  console.log('結論: 幕間を見ないまま交換所→ロビーへ進めた（幕間は飛ばされた）');
} else {
  // 幕間を見る
  await ev(`const b=document.querySelector('[data-action=go-intermission]'); if(b) b.click()`);
  await sleep(3000);
  await page.screenshot(`${O}/3_ims.png`);
  console.log('幕間', await q(`!!document.querySelector('.intermission-overlay')`));
  for (let k = 0; k < 60 && await q(`!!document.querySelector('.intermission-overlay')`); k++) {
    await ev(`const o=document.querySelector('.intermission-overlay'); const s=o && o.querySelector('.ims-skip-btn:not(.ims-hide)'); if (s) s.click(); else if (o) o.click()`);
    await sleep(900);
  }
  await sleep(2500);
  console.log('幕間の後', await info());
  await page.screenshot(`${O}/4_after_ims.png`);
  await ev(`const b = document.querySelector('.result-coin-goal') || document.querySelector('.result-unlock'); if (b && !b.disabled) b.click()`);
  await sleep(2500);
  console.log('幕間の後に札を押す', await q('state.screen'));
  await ev(`const b=document.querySelector('[data-action=back-lobby]'); if(b) b.click()`);
  await sleep(3000);
  console.log('ロビーへ', await q('state.screen'));
  await page.screenshot(`${O}/5_lobby.png`);
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
await session.close();
