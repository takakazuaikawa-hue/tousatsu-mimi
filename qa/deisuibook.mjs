// 泥酔の夜の写真集（三周目のクリア報酬）を確かめる。node qa/deisuibook.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = 'qa/out/deisuitest'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 240 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`localStorage.setItem('mp_deisui_dev','1'); save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ${JSON.stringify(ALL)}; save.deisuiMode = true; save.deisuiCleared = ${JSON.stringify(ALL.slice(0, 4))}; if(!save.ownedItems.includes('cgset_velvet_book')) save.ownedItems.push('cgset_velvet_book'); state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(1500);
await ev(`startBattleInternal('velvet')`);
console.log('isDeisui', await q('isDeisui()'), 'mode', await q('save.deisuiMode'));
await sleep(3000);
for (let t = 0; t < 4; t++) { await ev("const b=[...document.querySelectorAll('button')].find(b=>/開始|対戦へ|対戦開始|はじめる|OK/.test(b.textContent)&&b.offsetParent); if(b) b.click()"); await sleep(2200); }
console.log('deisui', await q('state.deisui'));
await ev(`state.opponentChips = 0; state.playerChips += 5000; state.hAggr = 3; endBattle()`);
await sleep(4000);
console.log('報酬', await q(`document.querySelector('.result-screen, .result-overlay')?.innerText?.replace(/\s+/g,' ').slice(0,300)`));
console.log('pending', await q('JSON.stringify(save.photobookPending)'), 'owned', await q(`save.ownedItems.includes('cgset_deisui_book')`));
await ev(`const b=document.querySelector('[data-action=go-intermission]'); if(b) b.click()`);
await sleep(3000);
for (let k = 0; k < 30 && await q(`!!document.querySelector('.intermission-overlay')`); k++) { await ev(`(document.querySelector('.intermission-overlay .im-skip, .intermission-overlay [data-action*=skip]')||document.querySelector('.intermission-overlay')).click()`); await sleep(900); }
await sleep(1500);
await page.screenshot(`${O}/book_gift.png`);
console.log('幕', await q(`document.querySelector('.photobook-gift')?.innerText?.replace(/\s+/g,' ')`), await q(`document.querySelector('.photobook-gift img')?.getAttribute('src')`));
await ev(`document.querySelector('.photobook-gift')?.click()`);
await sleep(2000);
await page.screenshot(`${O}/book_viewer.png`);
console.log('ビューア', await q(`document.querySelector('.reward-cg-viewer-overlay')?.innerText?.replace(/\s+/g,' ').slice(0,120)`), await q(`[...document.querySelectorAll('.reward-cg-viewer-overlay img')].map(i=>i.getAttribute('src')+':'+i.naturalWidth).slice(0,3).join(' ')`));
const miss = await q(`(async()=>{const bad=[];for(let k=1;k<=CG_SETS.cgset_deisui_book.n;k++){for(const u of [cgSetSrc('cgset_deisui_book',k),cgSetThumb('cgset_deisui_book',k)]){const r=await fetch(u,{method:'HEAD'});if(!r.ok)bad.push(u);}}return bad.join(' ')||'なし';})()`);
console.log('欠け', miss);
console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
await session.close();
