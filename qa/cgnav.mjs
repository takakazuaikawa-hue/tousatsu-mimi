// 写真集・CG集の「一覧」「前の続き」と、コレクションの会話（昼／夜）を確かめる。
// node qa/cgnav.mjs [844x390]   撮影は qa/out/cgnav/<幅x高さ>_*.png
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
fs.mkdirSync('qa/out/cgnav', { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000, speed: 2 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const val = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const shot = async (n) => { await page.screenshot(`qa/out/cgnav/${W}x${H}_${n}.png`); console.log('shot', n); };
const rectOf = (sel) => val(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'なし';const r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' @'+Math.round(r.left)+','+Math.round(r.top)+' font '+getComputedStyle(e).fontSize})()`);
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify([...ALL, 'h_rico_tutorial', 'h_polka', 'h_velvet'])}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.horoyoiMode = true; save.horoyoiCleared = ['rico_tutorial','polka','velvet']; save.horoyoiMidSeen = ['rico_tutorial','polka','selina']; save.cgSetPos = {}; if (!save.ownedItems.includes('cgset_velvet_book')) save.ownedItems.push('cgset_velvet_book'); state = defaultState(); state.screen = 'lobby'; render(); showRewardCgViewer('cgset_velvet_book')`);
for (let i = 0; i < 40 && await val('!!document.querySelector(".preload-overlay, .loading-overlay")'); i++) await sleep(500); await sleep(2500); await shot('1_viewer');
console.log('x', await rectOf('.reward-cg-viewer-x'), '| 一覧', await rectOf('.reward-cg-viewer-listbtn'), '| hint', await rectOf('.reward-cg-viewer-hint'));
await ev(`document.querySelector('.reward-cg-viewer-listbtn').click()`); await sleep(1500); await shot('2_list');
console.log('back', await rectOf('.reward-cg-list-back'), '| cell', await rectOf('.reward-cg-list-cell'), '| num', await rectOf('.reward-cg-list-cell i'), '| head b', await rectOf('.reward-cg-list-head b'), '| head span', await rectOf('.reward-cg-list-head span'));
console.log('cells', await val(`document.querySelectorAll('.reward-cg-list-cell').length`), 'thumbs loaded', await val(`[...document.querySelectorAll('.reward-cg-list-cell img')].filter(i=>i.complete&&i.naturalWidth>0).length`));
// 40枚目へ飛ぶ
await ev(`const c=document.querySelectorAll('.reward-cg-list-cell')[39]; c.scrollIntoView({block:'center'}); c.click()`); await sleep(1200); await shot('3_jump40');
console.log('jump hint', await val(`document.querySelector('.reward-cg-viewer-hint').textContent`), '| pos', await val(`save.cgSetPos.cgset_velvet_book`), '| list gone', await val(`!document.querySelector('.reward-cg-list')`));
// ×で閉じて、開き直す
await ev(`document.querySelector('.reward-cg-viewer-x').click()`); await sleep(400);
console.log('after close pos', await val(`save.cgSetPos.cgset_velvet_book`), '| stored', await val(`JSON.parse(localStorage.getItem('tousatsu_mimi_save_v1')).cgSetPos.cgset_velvet_book`));
await ev(`showRewardCgViewer('cgset_velvet_book')`); await sleep(1500); await shot('4_resume');
console.log('resume hint', await val(`document.querySelector('.reward-cg-viewer-hint').textContent`));
// 一覧を開くと今の一枚が光る
await ev(`document.querySelector('.reward-cg-viewer-listbtn').click()`); await sleep(1000); await shot('5_list_now');
console.log('now cell', await val(`document.querySelector('.reward-cg-list-cell.is-now')?.dataset.k`), 'visible', await val(`(()=>{const c=document.querySelector('.reward-cg-list-cell.is-now'),g=document.querySelector('.reward-cg-list-grid');if(!c)return 'なし';const a=c.getBoundingClientRect(),b=g.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1})()`));
// 最後の1枚まで見て閉じる→次は1枚目から
await ev(`const c=document.querySelectorAll('.reward-cg-list-cell')[document.querySelectorAll(".reward-cg-list-cell").length-1]; c.click()`); await sleep(800);
console.log('last hint', await val(`document.querySelector('.reward-cg-viewer-hint').textContent`));
await ev(`const o=document.querySelector('.reward-cg-viewer-overlay'); const r=o.getBoundingClientRect(); o.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*0.8,clientY:r.top+r.height*0.5}))`); await sleep(500);   // 右の方をタップ→閉じる
console.log('overlay gone', await val(`!document.querySelector('.reward-cg-viewer-overlay')`), '| pos', await val(`save.cgSetPos.cgset_velvet_book`));
await ev(`showRewardCgViewer('cgset_velvet_book')`); await sleep(1200);
console.log('reopen hint', await val(`document.querySelector('.reward-cg-viewer-hint').textContent`));
await ev(`document.querySelector('.reward-cg-viewer-overlay')?.remove(); state.screen='lobby'; render(); showCollectionModal()`); await sleep(2500);
// 会話の欄
await ev(`document.querySelector('.coll-conv').scrollIntoView({block:'center'})`); await sleep(900); await shot('6_conv_day');
console.log('tab', await rectOf('.coll-conv-tab'), '| card', await rectOf('.coll-conv .memory-card'), '| title', await rectOf('.coll-conv .memory-card-title'), '| empty', await rectOf('.coll-conv-empty'));
await ev(`document.querySelector('.coll-conv-tab[data-tab="night"]').click()`); await sleep(700);
await ev(`document.querySelector('.coll-conv').scrollIntoView({block:'start'})`); await sleep(500); await shot('7_conv_night');
console.log('night cards', await val(`[...document.querySelectorAll('.coll-conv-pane[data-pane=night] .memory-card-title')].map(e=>e.textContent).join(' / ')`));
// 夜の幕間を開く
await ev(`document.querySelector('[data-action="recall-night-ims"]').click()`); await sleep(3500); await shot('8_night_ims');
console.log('ims overlay', await val(`!!document.querySelector('.intermission-overlay')`), 'above collection', await val(`(()=>{const a=document.querySelector('.intermission-overlay'),b=document.querySelector('.collection-overlay');if(!a||!b)return 'n/a';const z=e=>+getComputedStyle(e).zIndex||0;return z(a)+' vs '+z(b)})()`));
await ev(`document.querySelector('.ims-skip-btn')?.click()`); await sleep(2500);
console.log('ims state', await val(`!!document.querySelector('.intermission-overlay')`), 'coll still', await val(`!!document.querySelector('.collection-overlay')`));
await ev(`document.querySelector('.intermission-overlay')?.remove()`);
// 途中の会話
await ev(`document.querySelector('[data-action="recall-night-mid"]').click()`); await sleep(4000); await shot('9_night_mid');
console.log('story overlay', await val(`!!document.querySelector('.story-overlay')`), 'z', await val(`(()=>{const a=document.querySelector('.story-overlay'),b=document.querySelector('.collection-overlay');if(!a||!b)return 'n/a';const z=e=>+getComputedStyle(e).zIndex||0;return z(a)+' vs '+z(b)})()`));
await ev(`document.querySelector('.story-skip')?.click()`); await sleep(2500);
console.log('story state', await val(`!!document.querySelector('.story-overlay')`), 'coll still', await val(`!!document.querySelector('.collection-overlay')`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 400), JSON.stringify(await val(`window.__QA.errors`)).slice(0, 400));
await session.close();
