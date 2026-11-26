// 3回目の外部の批評の直しを確かめる：役くらべの2回目・見つめ合いの額と見切れ・「勝ち！」の早出し・払う額・オフライン案内・物語の回想。node qa/round3.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/round3'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true, rewardCgSeen: ['polka'] };
const log = {};
const clip = (page) => page.eval(`JSON.stringify((window.__clipText(document.querySelector('.read-battle-host') || document.body) || []).filter(o => o.px > 4 || o.why === 'もぐり'))`);
async function boot() {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save: SAVE });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const SETUP = (hand, board, opp, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) })); state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${opp}'); ${extra} return true; })()`;

// A 役くらべの2回目（候補を見て決める1回だけ）
{
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('4♣ A♥', '2♣ A♦ 9♣ 6♥ J♠', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:handvs', '1'); } catch (e) {} state.handPhase = 'river'; state.pot = 150; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'river', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.polka.logic = ['handvs']; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4000);
  for (let i = 0; i < 10 && !(await page.eval(`!!document.querySelector('#mb-hv-call')`)); i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(800); }
  await page.screenshot(path.join(OUT, `${W}x${H}_A_hv_repeat.png`));
  log.hvClip = await clip(page);
  log.hvSteps = await page.eval(`document.querySelector('#mb-hv-steps')?.textContent`);
  await sleep(600);
  await page.eval(`(() => { document.querySelector('#mb-hv-call')?.click(); return true; })()`); await sleep(1500);
  log.hvAfter = await page.eval(`(document.querySelector('.mb-entrust') ? 'entrust ' : 'NO-entrust ') + (document.querySelector('.mb-entrust')?.textContent || '').slice(0, 120)`);
  await page.screenshot(path.join(OUT, `${W}x${H}_A_hv_entrust.png`));
  log.errA = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// B 見つめ合い：左の欄の額は卓の本当の額・下の説明が切れない
{
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♥ 7♦', 'Q♠ 8♠ 3♠ 10♦', 'K♠ 2♠', `state.handPhase = 'turn'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['stare']; state.psychPending = true; startReadBattle('psych');`));
  await sleep(4000);
  for (let i = 0; i < 4; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); }
  log.stareBet = await page.eval(`document.querySelector('#mb-opp-bet')?.textContent`);
  await page.screenshot(path.join(OUT, `${W}x${H}_B_stare.png`));
  log.stareClip = await clip(page);
  log.errB = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
// C 相手の持ち点0・まだ勝負中：「勝ち！」を出さない。払う額は持ち点まで
{
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); state.opponentChips = 0; state.playerChips = 300; state.pot = 1500; state.currentBetOpponent = 700; state.currentBetPlayer = 0; state.handPhase = 'turn'; state.isPlayerTurn = true; render(); return true; })()`);
  await sleep(1200);
  log.tug = await page.eval(`document.querySelector('.tug-goal')?.textContent`);
  log.cc = await page.eval(`document.querySelector('.verb-cc')?.textContent.replace(/\\s+/g, ' ')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_C_allin.png`));
  // オフライン案内
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(1500);
  await page.eval(`(() => { window.MimiPack && MimiPack.openPanel(); return true; })()`); await sleep(1500);
  log.pack = await page.eval(`(() => { const m = document.querySelector('.pack-modal'); if (!m) return 'none'; const r = m.getBoundingClientRect(); const fs = [...m.querySelectorAll('p, h2')].map(e => e.getBoundingClientRect().height && parseFloat(getComputedStyle(e).fontSize)); const bs = [...m.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().height)); return JSON.stringify({ parent: m.parentElement.parentElement.tagName, box: [Math.round(r.width), Math.round(r.height)], fonts: fs, btnH: bs }); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_C_pack.png`));
  await page.eval(`(() => { document.querySelectorAll('.pack-overlay').forEach(e => e.remove()); return true; })()`);
  // 物語の回想 → 勝った後の会話
  await page.eval(`(() => { onAction({ currentTarget: { dataset: { action: 'recall-episode', episode: 'polka' } } }); return true; })()`); await sleep(2000);
  log.recallBtn = await page.eval(`document.querySelector('.episode-continue')?.textContent`);
  await page.eval(`(() => { document.querySelector('.episode-continue')?.click(); return true; })()`); await sleep(5000);
  log.recallIms = await page.eval(`!!document.querySelector('.intermission-overlay')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_C_recall.png`));
  log.errC = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
  await s.close();
}
console.log(JSON.stringify(log, null, 1));
process.exit(0);
