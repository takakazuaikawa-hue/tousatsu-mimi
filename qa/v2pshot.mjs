// 三択の心理・論理バトル（研修・講義で使う）を出して撮る。node qa/v2pshot.mjs [844x390] [名前]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const tag = process.argv[3] || 'now';
const OUT = path.resolve('qa/out/v2pshot'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, speed: 1, probes: ['cliptext.js'], save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('selina'); return true; })()`); await sleep(2500);
const qs = JSON.parse(await page.eval(`JSON.stringify(Object.keys(PSYCH_QUESTIONS))`));
const psychQ = qs.find(q => !/^logic/.test(q)), logicQ = 'logic_hand_compare';
for (const [k, q] of [['logic', logicQ], ['psych', psychQ]]) {
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay, .mk-layer, .battle-modal-overlay').forEach(e => e.remove()); state.psychRoot = null; const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1), label: x.slice(0, -1) })); state.playerHand = C('A♠ J♦'); state.community = C('3♦ 4♠ 10♠'); state.handPhase = 'flop'; state.pot = 200; state.currentBetOpponent = 100; triggerPsychBattle('${q}'); return true; })()`);
  await sleep(2500);
  await page.screenshot(path.join(OUT, `${W}x${H}_${k}_${tag}.png`));
  // QA_DUMP=1：上の帯の中の部品と字の色を出す
  if (process.env.QA_DUMP) console.log(k, await page.eval(`JSON.stringify([...document.querySelectorAll('.psych-speech, .psych-speech *')].map(e => [String(e.className).slice(0, 40), getComputedStyle(e).color, getComputedStyle(e).display, (e.textContent || '').trim().slice(0, 20)]))`));
}
await s.close(); process.exit(0);
