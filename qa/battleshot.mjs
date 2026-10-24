// 対戦画面を撮る。使い方: node qa/battleshot.mjs <out.png> [pc|phone] [相手] [css]
import { openSession, sleep } from './lib/session.mjs';
const phone = process.argv[3] === 'phone';
const opp = process.argv[4] || 'polka';
const session = await openSession(phone ? { width: 844, height: 390, speed: 1 } : { width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.clearedStages = ['rico_tutorial','polka','selina','grano','velvet']; save.firstClearRewardClaimed = save.clearedStages.slice(); state.screen = 'lobby'; render(); const c = ${JSON.stringify(process.argv[5] || '')}; if (c) { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); } return 1; })()`);
await sleep(3000);
await page.eval(`(() => { startBattle(${JSON.stringify(opp)}); return 1; })()`);
await sleep(9000);
await page.screenshot(process.argv[2]);
console.log(await page.eval(`[...document.querySelectorAll('#stage button, #stage [data-action]')].filter(b => b.offsetParent).map(b => (b.dataset.action || b.className.toString().slice(0,30)) + '@' + Math.round(b.getBoundingClientRect().x) + ',' + Math.round(b.getBoundingClientRect().y)).join(' | ')`));
await session.close();
