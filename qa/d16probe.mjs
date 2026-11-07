// D16 の確かめ：零時の卓で「上げられてミミに回ってきた場面」の誰から回ってきたかの1行・席の光・速さのボタン・考え方の札を撮る。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/d16probe.mjs [pc|phone|small] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const kind = process.argv[2] || 'pc';
const OUT = path.resolve(process.argv[3] || 'qa/out/d16', kind);
fs.mkdirSync(OUT, { recursive: true });
const size = { pc: [1280, 800], phone: [844, 390], small: [667, 375] }[kind];
const session = await openSession({ width: size[0], height: size[1], mobile: kind !== 'pc', speed: 2 });
const { page } = session;
const val = (js) => page.eval(js).catch(e => { console.log('ERR', e.message.slice(0, 120)); return null; });
const until = async (js, ms = 30000, step = 120) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
for (let i = 0; i < 60 && !(await val('typeof startBattle === "function" && !!window.AllstarUI')); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await val(`(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true, posGuideSeen: true, invitationUsed: true, reviewOff: true }; saveProgress(); state = defaultState(); state.screen = 'lobby'; render(); return true; })()`);
await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(1500);
let n = 0;
const snap = async (name) => { await sleep(400); n++; await page.screenshot(path.join(OUT, `${String(n).padStart(2, '0')}_${name}.png`)); console.log(kind, name); };
await val(`(() => { AllstarUI.onAction('allstar-open'); return true; })()`); await sleep(900);
await snap('entry');
await val(`(() => { document.querySelector('.as-entry [data-action="allstar-seat"]').click(); return true; })()`);
const Q = 'AllstarUI._qa';
// 上げられて回ってきた場面まで進める（それ以外のミミの手番はコールかチェック）
let got = false;
const t0 = Date.now();
while (Date.now() - t0 < (process.env.PRIZE ? 420000 : 240000)) {
  if (await val(`${Q}.waiting()`)) {
    const facing = await val(`(() => { const T = ${Q}.T(), L = Allstar.legalActions(T); if (!(L && L.toCall > 0 && T.hand.raises >= 1 && T.hand.streetAggressor > 0)) return false; return ${process.env.PRIZE ? "Allstar.coach(T).key === 'prize'" : 'true'}; })()`);
    if (facing) { got = true; break; }
    await val(`${Q}.actMimi(${process.env.PRIZE ? "'fold'" : "'call'"})`);
  }
  await sleep(150);
}
console.log('上げられた場面', got);
const info = await val(`(() => { const f = document.querySelector('.as-from'); const s = document.querySelector('.as-seat[data-from]'); const r = f && f.getBoundingClientRect(); const a = document.querySelector('.as-actions').getBoundingClientRect(); const sp = document.querySelector('.as-speed'); return { from: f && f.textContent, seat: s && s.dataset.seat, fromBox: r && [r.left, r.top, r.right, r.bottom].map(Math.round), actions: [a.left, a.top, a.right, a.bottom].map(Math.round), speed: sp && sp.textContent, fonts: f && [...f.querySelectorAll('*')].map(e => e.className + ':' + getComputedStyle(e).fontSize).join(' ') }; })()`);
console.log(JSON.stringify(info));
await snap('facing_raise');
await val(`(() => { document.querySelector('.as-think').click(); return true; })()`); await sleep(500);
await val(`(() => { document.querySelector('[data-as="think-go"]').click(); return true; })()`);
await snap('coach');
await val(`(() => { document.querySelector('.as-think').click(); return true; })()`);
await val(`(() => { document.querySelector('.as-speed').click(); return true; })()`);
await snap('speed2');
console.log('速さ', await val(`${Q}.speed`));
await session.close();
