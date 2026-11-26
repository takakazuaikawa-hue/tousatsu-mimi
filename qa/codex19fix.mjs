// Codex 19回目の指摘4件が直ったかを確かめる。node qa/codex19fix.mjs   出力 qa/out/codex19fix/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = 'qa/out/codex19fix'; fs.mkdirSync(O, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const save = { introPlayed: true, houseRulesSeen: true, readIntroSeen: true, clearedStages: ALL, rewardCgSeen: ALL, episodesSeen: ALL, endingUnlocked: true, homeStageSeen: 5,
  horoyoiMode: true, deisuiMode: true, horoyoiCleared: ALL, deisuiCleared: ALL, deisuiAllCleared: true, deisuiDawnSeen: false, bgmOn: false, sfxOn: false, voiceOn: false, loginBonus: { lastDate: '2099-01-01', streak: 1 } };
const { page, close, exceptions } = await openSession({ width: 667, height: 375, mobile: true, save });
const R = {};
try {
  await sleep(3000);
  await page.eval(`try{ document.querySelectorAll('.modal-overlay,.login-bonus').forEach(e=>e.remove()); goLobby(); }catch(e){}`);
  await sleep(2500);
  // 2) 中断後の夜明けへの入口
  R.ticket = JSON.parse(await page.eval(`JSON.stringify((()=>{const t=document.querySelector('.h15-ticket');return t?{action:t.dataset.action,label:t.querySelector('.h15-lbl').textContent,prize:t.querySelector('.h15-prize').textContent}:null})())`));
  await page.screenshot(`${O}/home_dawn_pending_667.png`);
  // 3) 667幅の文字の実寸（画面上の大きさ＝字の大きさ×縮み）
  R.fonts = JSON.parse(await page.eval(`JSON.stringify([...document.querySelectorAll('.h15-ledger .h15-rn, .h15-ticket .h15-lbl, .h15-ticket .h15-prize span')].map(e=>{const cs=getComputedStyle(e);const r=e.getBoundingClientRect();const k=r.height/Math.max(1,e.offsetHeight);return {cls:e.className,text:e.textContent.slice(0,12),px:+(parseFloat(cs.fontSize)*k).toFixed(2)}}))`));
  // 4) 夜の制服
  R.uniform = await page.eval(`costumeSrc('rico_default.webp')`);
  // 1) 会話を続けて出す（一つ目を閉じた直後に二つ目が出るか）
  await page.eval(`window.__chain=[]; showStoryScene('dmid1_polka', ()=>{ window.__chain.push('done1'); showStoryScene('dmid2_polka', ()=>window.__chain.push('done2')); });`);
  await sleep(2500);
  const first = await page.eval(`document.querySelectorAll('.story-overlay:not(.out)').length`);
  await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await sleep(3500);
  R.chain = JSON.parse(await page.eval(`JSON.stringify({chain:window.__chain, open:document.querySelectorAll('.story-overlay:not(.out)').length, label:(document.querySelector('.story-overlay:not(.out)')||{}).getAttribute?.('aria-label')})`));
  R.chain.firstOpen = first;
  await page.screenshot(`${O}/chain_second_667.png`);
  R.errors = JSON.parse(await page.eval(`JSON.stringify(window.__QA.errors)`)); R.exceptions = exceptions;
} finally { await close(); }
fs.writeFileSync(`${O}/result.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
