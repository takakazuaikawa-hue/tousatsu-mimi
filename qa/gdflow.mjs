// 卒業試験（本気のリコ先輩・本当の手）の通し：記録と予想 → 教えを1つ使う → 読む → 自信 → 預けて卓へ → 降りる → 答え合わせ。
// QA_SIZE=WxH QA_CARDS=3|4|5 QA_LESSON=0|1|2 QA_DEFY=1 QA_HABIT=fold|call node qa/gdflow.mjs   出力 qa/out/gdflow/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [w, h] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const nb = +(process.env.QA_CARDS || 4), lesson = +(process.env.QA_LESSON || 0);
const OUT = `qa/out/gdflow/${w}x${h}_${nb}_${lesson}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const habit = process.env.QA_HABIT === 'call' ? Array.from({ length: 20 }, (_, i) => i % 4 === 0) : Array.from({ length: 20 }, (_, i) => i % 4 !== 0);
const session = await openSession({ width: w, height: h, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 500, mimiHabit: habit, gradCount: +(process.env.QA_GRAD || 0) } });
const { page } = session;
const click = (re) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled).find(b => ${re}.test(b.textContent)); if (b) { b.click(); return b.textContent.trim().slice(0, 30); } return ''; })()`);
const tap = (sel) => page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
let n = 0;
const shot = async (name) => {
  n++; await page.screenshot(`${OUT}/${String(n).padStart(2, '0')}_${name}.png`);
  const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
  const bad = ['tiny', 'wrap', 'orphan', 'overflowBox', 'off'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k]));
  const ov = await page.eval(`(() => { const f = (x) => x && x.scrollHeight > x.clientHeight + 1 ? x.className.split(' ')[0] + ' ' + x.scrollHeight + '>' + x.clientHeight : ''; return [...document.querySelectorAll('.gd-play, .gd-info')].map(f).filter(Boolean).join(' '); })()`);
  console.log(name, bad.join(' ') || '問題なし', ov ? 'はみ出し ' + ov : '');
};
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`window.__ricoSeriousMode = true; startBattle('rico_tutorial'); true`); await sleep(2500);
  for (let i = 0; i < 20 && !(await page.eval('(state.playerHand || []).length === 2 && (state.deck || []).length > 10')); i++) { await click('/開始|対戦開始/'); await sleep(900); }
  console.log('本気モード', await page.eval('state.seriousRicoMode'), 'ブラフの多さ', await page.eval('state.opponentProfile.bluffTendency'));
  await page.eval(`(() => { while ((state.community || []).length < ${nb}) state.community.push(state.deck.pop()); state.handPhase = ['flop','turn','river'][${nb} - 3];
    state.currentBetOpponent = (state.currentBetPlayer || 0) + 150; render(); state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(4000);
  await shot('rules'); await click('/わかった/'); await sleep(1800);
  await shot('start');
  await tap(`.gd-lesson[data-i="${lesson}"]:not([disabled])`) || await tap('.gd-lesson:not([disabled])'); await sleep(1000);
  await shot('clue');
  const pred = await page.eval(`[...document.querySelectorAll('.rb-act button')].map(b => b.textContent).join(' / ')`);
  console.log('ボタン', pred);
  await click(process.env.QA_DEFY ? '/予想を外す/' : '/予想どおり/'); await sleep(1200); await shot('wager');
  await click('/確信/'); await sleep(1500); await shot('entrust');
  await click('/卓にもどる/'); await sleep(2500);
  console.log('預かった読み', await page.eval(`JSON.stringify(state.pendingRead && { pick: state.pendingRead.pick, pred: state.pendingRead.pred, truth: state.pendingRead.truth, extra: state.pendingRead.extra })`));
  await page.eval(`state.isPlayerTurn = true; playerFold(); true`); await sleep(3000);
  await click('/次のハンド|次へ|つぎへ/'); await sleep(5000); await shot('verdict'); await sleep(2500); await shot('verdict_result'); await click('/^次へ$/'); await sleep(2000);
  console.log('卒業の数', await page.eval('save.gradCount || 0'), '称号', await page.eval('!!(save.achievements && save.achievements.graduate)'), '癖', await page.eval('JSON.stringify(save.mimiHabit.slice(-3))'));
} finally { await session.close(); }
