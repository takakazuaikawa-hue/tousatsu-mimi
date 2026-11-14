// 泥酔の夜の土台を確かめる。node qa/deisuitest.mjs [相手id]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'polka';
const O = 'qa/out/deisuitest'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`localStorage.setItem('mp_deisui_dev','1'); save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL.slice(0, ALL.indexOf(id)))}; state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
console.log('isDeisui', await q('isDeisui()'), 'next', await q('horoyoiNext()'), 'prize', await q(`horoyoiPrizeFor('${id}')`));
await page.screenshot(`${O}/lobby.png`);
await ev(`startBattle('${id}')`);
await sleep(3000);
await page.screenshot(`${O}/${id}_episode.png`);
console.log('扉', await q(`(document.querySelector('.episode-overlay')||{}).innerText?.slice(0,80)`));
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/開始|対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2200); }
console.log('state', await q(`JSON.stringify({deisui: state.deisui, horoyoi: state.horoyoi, tier: drunkTier(), stand: document.querySelector('.char-opponent img')?.getAttribute('src')})`));
await page.screenshot(`${O}/${id}_table.png`);
// とんでもない賭けの合図とぼやけ
await ev(`state.__crazyHint = DEISUI_HINT[state.opponentId]; render()`);
await sleep(600);
console.log('合図', await q(`document.querySelector('[data-bind=mimiThought]')?.textContent`), '/', await q(`document.querySelector('[data-bind=ricoAdvice]')?.textContent`));
await page.screenshot(`${O}/${id}_hint.png`);
await ev(`state.__blurStreet = state.handPhase; state.isPlayerTurn = true; render()`);
await sleep(900);
console.log('ぼやけ', await q(`document.querySelector('.battle-screen.v2')?.classList.contains('is-deisui-blur')`));
console.log('手の欄の親', await q(`(()=>{let e=document.querySelector('.action-grid');const p=[];while(e&&!e.classList.contains('battle-screen')){p.push(e.tagName+'.'+[...e.classList].join('.'));e=e.parentElement;}return p.join(' < ');})()`));
await page.screenshot(`${O}/${id}_blur.png`);
await ev(`state.__blurStreet = ''; state.__crazyHint=''; render()`);
// 途中の場面1
await ev(`state.handNo = 2; state.handStartChips = state.playerChips; continueAfterHand()`);
for (let w = 0; w < 10 && !(await q(`!!document.querySelector('.story-overlay')`)); w++) await sleep(500);
await sleep(800);
await page.screenshot(`${O}/${id}_mid1.png`);
console.log('途中1', await q(`(document.querySelector('.story-overlay')||{}).innerText?.replace(/\\s+/g,' ').slice(0,90)`));
for (let k = 0; k < 10 && await q(`!!document.querySelector('.story-overlay')`); k++) { await ev(`document.querySelector('.story-overlay')?.click()`); await sleep(1400); }
// 途中の場面2
await ev(`state.handNo = state.__dmid1Hand + 5; state.handStartChips = state.playerChips; continueAfterHand()`);
for (let w = 0; w < 10 && !(await q(`!!document.querySelector('.story-overlay')`)); w++) await sleep(500);
await sleep(800);
console.log('途中2', await q(`(document.querySelector('.story-overlay')||{}).innerText?.replace(/\\s+/g,' ').slice(0,90)`));
for (let k = 0; k < 10 && await q(`!!document.querySelector('.story-overlay')`); k++) { await ev(`document.querySelector('.story-overlay')?.click()`); await sleep(1400); }
// 勝ち
await ev(`state.opponentChips = 0; state.playerChips += 5000; state.hAggr = 3; endBattle()`);
await sleep(4000);
await page.screenshot(`${O}/${id}_result.png`);
console.log('結果', await q(`document.querySelector('.result-next-goal')?.innerText`), '| 記録', await q(`JSON.stringify(save.deisuiCleared)`), '| ほろ', await q(`JSON.stringify(save.horoyoiCleared)`));
await ev(`const b=document.querySelector('[data-action=go-intermission]'); if(b) b.click()`);
await sleep(3500);
await page.screenshot(`${O}/${id}_ims.png`);
console.log('幕間', await q(`(document.querySelector('.intermission-overlay')||{}).innerText?.replace(/\\s+/g,' ').slice(0,100)`), await q(`[...document.querySelectorAll('.intermission-overlay img')].map(i=>i.getAttribute('src')).join(' ')`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
await session.close();
