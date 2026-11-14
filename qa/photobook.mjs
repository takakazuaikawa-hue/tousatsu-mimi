// ヴェルベット写真集（二周目のクリア報酬）を確かめる：コレクションの鍵の札→受け取りの幕→開いた写真集→持っている札。
// node qa/photobook.mjs [844x390]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/photobook', { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const shot = async (n) => { await page.screenshot(`qa/out/photobook/${W}x${H}_${n}.png`); console.log('shot', n); };
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ['rico_tutorial','polka','selina','grano']; save.ownedItems = save.ownedItems.filter(i => i !== 'cgset_velvet_book'); state = defaultState(); state.screen = 'lobby'; render(); showCollectionModal()`);
await sleep(2500);
await ev(`const c=[...document.querySelectorAll('.coll-cg-card')].find(e=>/写真集/.test(e.textContent)); if(c) c.scrollIntoView({block:'center'})`);
await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='CG集')?.click()`); await sleep(1200); await shot('1_locked');
console.log('locked card', await page.eval(`(()=>{const c=[...document.querySelectorAll('.coll-cg-card')].find(e=>/写真集/.test(e.textContent));return c?c.textContent.trim().replace(/\\s+/g,' '):'なし'})()`));
// 受け取り（勝った時と同じ記録）→幕
await ev(`save.ownedItems.push('cgset_velvet_book'); state.screen = 'lobby'; render(); showPhotobookGift()`);
await sleep(2200); await shot('2_gift');
await ev(`document.querySelector('.photobook-gift').click()`);
await sleep(2200); await shot('3_viewer');
console.log('viewer', await page.eval(`(()=>{const h=document.querySelector('.reward-cg-viewer-hint');const i=document.querySelector('.reward-cg-viewer-img');return (h?h.textContent:'なし')+' / '+(i?i.src.split('/').pop()+':'+i.naturalWidth:'')})()`));
await ev(`document.querySelector('.reward-cg-viewer-overlay')?.remove(); state.screen = 'lobby'; render(); showCollectionModal()`);
await sleep(2000);
await ev(`const c=[...document.querySelectorAll('.coll-cg-card')].find(e=>/写真集/.test(e.textContent)); if(c) c.scrollIntoView({block:'center'})`);
await sleep(1500); await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='CG集')?.click()`); await sleep(1500); await ev(`const c=[...document.querySelectorAll('.coll-cg-card')].filter(e=>/写真集/.test(e.textContent)).pop(); if(c) c.scrollIntoView({block:'center'})`); await sleep(800); await shot('4_owned'); console.log('owned card', await page.eval(`(()=>{const c=[...document.querySelectorAll('.coll-cg-card')].filter(e=>/写真集/.test(e.textContent)).pop();return c?c.className+' '+c.textContent.trim().replace(/\s+/g,' '):'なし'})()`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
