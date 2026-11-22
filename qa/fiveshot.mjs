// ファイブポーカーの今の画面を撮る（D18 の整理の前後比べ）。node qa/fiveshot.mjs [pc|phone] [tag]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'phone', tag = process.argv[3] || 'before';
const size = { pc: [1280, 720], pc800: [1280, 800], phone: [844, 390], small: [667, 375], wide: [932, 430] }[mode];
const O = process.env.QA_TAG ? 'qa/out/five-tidy/' + process.env.QA_TAG : 'qa/out/fiveshot'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: size[0], height: size[1], mobile: !mode.startsWith('pc'), speed: 2, seed: +(process.env.QA_SEED || 12345) });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 160)));
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
// 見えている文字の実寸（14px 未満）・画面や枠の外・押す所の大きさ（44px 未満）・手札の重なり
const CHECK = `(() => {
  const host = document.querySelector('.minipoker-modal'); if (!host) return { none: 1 };
  const VW = innerWidth, VH = innerHeight, small = [], off = [], clip = [];
  const vis = (el) => { for (let p = el; p && p !== host.parentElement; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < .05) return false; } return true; };
  const H = host.getBoundingClientRect();
  const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!vis(el) || el.closest('.mp-card, .mp-fx-layer')) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const k = el.getBoundingClientRect().height / (el.offsetHeight || 1) || 1, fs = parseFloat(getComputedStyle(el).fontSize) * (Number.isFinite(k) && k > 0 ? k : 1);
    if (fs < 13.6) small.push(t.slice(0, 12) + ' ' + fs.toFixed(1));
    if (r.left < H.left - 1 || r.top < H.top - 1 || r.right > H.right + 1 || r.bottom > H.bottom + 1) off.push(t.slice(0, 12));
    const box = el.closest('button, .mp-status, .mp-reach, .mp-result-banner, .mp-handname, .mp-center, .mp-paytable');
    if (box) { const b = box.getBoundingClientRect(); if (r.left < b.left - 1.5 || r.right > b.right + 1.5 || r.top < b.top - 1.5 || r.bottom > b.bottom + 1.5) clip.push(t.slice(0, 12) + ' @' + box.className.toString().split(' ')[0]); }
  }
  const rc = (e) => e.getBoundingClientRect();
  const tiny = [...host.querySelectorAll('button')].filter(b => vis(b) && rc(b).width && (rc(b).height < 43.5 || rc(b).width < 43.5)).map(b => (b.dataset.mp || b.className.split(' ')[0]) + ' ' + Math.round(rc(b).width) + 'x' + Math.round(rc(b).height));
  const pc = [...host.querySelectorAll('.mp-player .mp-card')].map(rc), cc = [...host.querySelectorAll('.mp-cpu .mp-card')].map(rc);
  const lap = (a) => a.some((r, i) => i && r.left < a[i - 1].right - 1);
  const ctr = host.querySelector('.mp-center'), ps = host.querySelector('.mp-player'), cs = host.querySelector('.mp-cpu');
  const hit = (a, b) => a && b && rc(a).top < rc(b).bottom - 1 && rc(b).top < rc(a).bottom - 1;
  const cardOut = [...pc, ...cc].some(r => r.top < H.top - 1 || r.bottom > H.bottom + 1 || r.left < H.left - 1 || r.right > H.right + 1);
  return { small: [...new Set(small)], off: [...new Set(off)], clip: [...new Set(clip)], tiny: [...new Set(tiny)], card: pc[0] ? Math.round(pc[0].width) + 'x' + Math.round(pc[0].height) : '', cardLap: lap(pc) || lap(cc), cardOut, rowsHit: [hit(cs, ctr) && 'cpu-center', hit(ctr, ps) && 'center-player'].filter(Boolean) };
})()`;
const report = [];
const shot = async (n) => { const r = await q(CHECK); r.name = n; report.push(r); console.log(mode, n, JSON.stringify(r)); await page.screenshot(`${O}/${mode}_${tag}_${n}.png`); };
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await ev(`save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.ownedItems = [...(save.ownedItems||[]), 'memory_minipoker']; save.minipoker = Object.assign(save.minipoker || {}, { tutorialSeen: true, tutorialDone: true }); state = defaultState(); state.screen = 'lobby'; render()`);
await sleep(3000);
await ev(`document.querySelectorAll('.mp-tut, .modal-overlay').forEach(e=>{}); showMiniPokerGame()`);
await sleep(4000);
// 入門が出たら閉じる
await ev(`document.querySelectorAll('.mp-tut-skip, .mp-tut-close, [data-mp-tut="skip"]').forEach(b=>b.click())`); await sleep(1500);
await shot('1bet');
if (tag !== 'before') { await ev(`document.querySelector('.mp-pt-btn')?.click()`); await sleep(500); await shot('0paytable'); await ev(`document.querySelector('.mp-pt-x')?.click(); document.querySelector('.minipoker-modal').dataset.pt = ''`); await sleep(300); }
// QA_STACK=1：山を並べて、リーチ（札が光る）・勝ち・ダブルアップの場面を撮る
if (process.env.QA_STACK) {
  await ev(`const C = (s, r) => ({ suit: s, rank: r, label: RANK_NAMES[r - 2] }); newDeck = () => [C('♥',14),C('♥',13),C('♥',9),C('♥',4),C('♠',14), C('♣',2),C('♦',7),C('♠',9),C('♣',11),C('♦',4), C('♠',3),C('♦',5),C('♣',8),C('♠',6),C('♦',10),C('♠',12),C('♣',13),C('♦',3),C('♣',5),C('♦',8),C('♠',8),C('♣',6),C('♦',12),C('♣',3),C('♠',5),C('♥',10),C('♥',6),C('♥',3)]`);
  await ev(`document.querySelector('[data-mp="deal"]')?.click()`); await sleep(6000);
  await shot('r1_reach');
  for (let r = 0; r < 2; r++) {
    if (await q('document.querySelector(".minipoker-modal")?.dataset.phase') !== 'choose') break;
    await ev(`document.querySelectorAll('.mp-player .mp-card:not(.mp-held)').forEach(c => c.click())`); await sleep(700);
    if (!r) await shot('r2_heldall');
    await ev(`document.querySelector('[data-mp="draw"]')?.click()`); await sleep(9000);
  }
  await sleep(3000); await shot('r3_win');
  await ev(`document.querySelector('[data-mp="double"]')?.click()`); await sleep(1500); await shot('r4_hilo');
  console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
  fs.writeFileSync(`${O}/${mode}_${tag}_stack_report.json`, JSON.stringify(report, null, 1));
  await session.close(); process.exit(0);
}
await ev(`document.querySelector('[data-mp="deal"]')?.click()`); await sleep(6000);
await shot('2choose');
await ev(`document.querySelectorAll('.mp-card-player, .mp-player .mp-card').forEach((c,i)=>{ if(i<2) c.click(); })`); await sleep(800);
await shot('3held');
console.log("card", await q(`JSON.stringify([...document.querySelectorAll(".mp-player .mp-card")].map(c=>{const r=c.getBoundingClientRect();return [Math.round(r.x),Math.round(r.width)]}).concat([[innerWidth, document.documentElement.className.slice(0,80)]]))`));
await ev(`document.querySelector('[data-mp="draw"]')?.click()`); await sleep(9000);
await shot('4result');
await ev(`document.querySelector('[data-mp="draw"]')?.click()`); await sleep(9000); await shot('6final'); console.log("phase6", await q(`document.querySelector(".minipoker-modal")?.dataset.phase`));
await ev(`document.querySelector(".mp-menu-btn")?.click()`); await sleep(600); await shot('5menu');
console.log('phase', await q('document.querySelector(".mp-center")?.innerText.slice(0,200)'));
console.log('err', JSON.stringify(session.exceptions).slice(0, 600));
fs.writeFileSync(`${O}/${mode}_${tag}_report.json`, JSON.stringify(report, null, 1));
await session.close();
