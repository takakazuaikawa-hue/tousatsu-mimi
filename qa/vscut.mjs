// 読み合いの始まり（初回の説明の札と、VS のカットイン）を撮って文字の大きさを数える。QA_SIZE=844x390 node qa/vscut.mjs
// カットインは 2.5 秒で消えるので、出た直後に撮る
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OUT = path.resolve(`qa/out/vscut/${W}x${H}`); fs.mkdirSync(OUT, { recursive: true });
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true } });
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } return true; })()`);
const click = (re) => ev(`const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent) && !b.disabled && b.offsetParent); if (b) b.click(); return !!b;`);
const shot = async (n) => {
  await page.screenshot(path.join(OUT, n + '.png'));
  const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
  const sizes = await page.eval(`JSON.stringify([...document.querySelectorAll('.mb-intro *, .mk-layer *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()) && e.getBoundingClientRect().width > 2).map(e => { let s = 1, x = e; while (x && !(x.offsetWidth >= 40)) x = x.parentElement; if (x) s = x.getBoundingClientRect().width / x.offsetWidth; return Math.round(parseFloat(getComputedStyle(e).fontSize) * s * 10) / 10 + 'px ' + e.textContent.trim().slice(0, 14); }))`);
  console.log(n, 'tiny', JSON.stringify(c.tiny), '\n  ', JSON.parse(sizes).join(' / '));
};
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await ev(`startBattle('selina')`); await sleep(2500);
  for (let i = 0; i < 20 && !(await page.eval('(state.playerHand || []).length === 2')); i++) { await click('/開始|対戦開始/'); await sleep(900); }
  await ev(`while ((state.community || []).length < 3) state.community.push(state.deck.pop()); state.handPhase = 'flop'; state.currentBetOpponent = (state.currentBetPlayer || 0) + 100; render(); state.psychPending = true; startReadBattle('psych');`);
  await sleep(1200); await shot('1_intro_card');
  // 説明の札を1枚ずつ送り、カットインが出たらすぐ撮る（押しすぎるとカットインを飛ばす）
  for (let i = 0; i < 4 && !(await page.eval('!!document.querySelector(".mb-intro")')); i++) { await click('/次へ|読み合いへ/'); await sleep(250); }
  await sleep(450); await shot('2_vs');
  await sleep(4000);
  await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = true; READ_BATTLE_POOLS.selina.logic = ['sniper']; startReadBattle('logic');`);
  for (let i = 0; i < 20 && !(await page.eval('!!document.querySelector(".mb-intro")')); i++) await sleep(100); await sleep(450); await shot('3_vs_logic');
} finally { await close(); }
