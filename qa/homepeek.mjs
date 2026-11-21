// ホームを1枚撮る（動きの見直し用）。node qa/homepeek.mjs [W H name] → qa/out/homepeek/<name>.png。台詞は一番長い一言にして折れ方を見る
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/homepeek'); fs.mkdirSync(OUT, { recursive: true });
const [W = 1280, H = 800, NAME = 'home'] = process.argv.slice(2);
const s = await openSession({ width: +W, height: +H, mobile: +W < 900 }); const { page } = s;
await sleep(4000);
await page.eval(`(() => {
  document.querySelectorAll('.home-overlay,.collection-overlay,.settings-overlay,.episode-overlay,.login-bonus-overlay').forEach(e => e.remove());
  save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.coins = 850; save.equippedRicoOutfit = 'default'; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 };
  state = defaultState(); state.screen = 'lobby'; render(); return true;
})()`);
await sleep(7000);
await page.eval("(setWrapLine(document.querySelector('.h15-dialogue'), '「全卓制覇、やるじゃん。|零時になったら、|アタシも席に着くからね」'), 1)");
await sleep(300);
await page.screenshot(path.join(OUT, NAME + '.png'));
console.log(await page.eval("JSON.stringify(['.h15-dialogue','.h15-ledger','.h15-ticket','.h15-ticket .h15-prize','.h15-ticket .h15-lbl'].map(q => { const e = document.querySelector('.home-stage ' + q); const r = e.getBoundingClientRect(); return q + ' ' + [r.left,r.top,r.right,r.bottom].map(Math.round).join(',') + ' ' + getComputedStyle(e).fontSize + ' ' + (e.innerHTML.length < 200 ? e.innerHTML : ''); }))"));
await s.close(); console.log('ok');
