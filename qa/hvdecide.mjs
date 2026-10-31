// 卓の本当の手で役くらべを最後（付いていくか決める画面）まで進め、撮って切れ・もぐりを数える。node qa/hvdecide.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/hvdecide'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, speed: 1, seed: 3, probes: ['cliptext.js'], save: { clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(2500);
await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) })); state.playerHand = C('4♣ A♥'); state.community = C('2♣ A♦ 9♣'); state.opponentHand = C('K♠ 5♦'); state.handPhase = 'flop'; state.pot = 150; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'flop', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.polka.logic = ['handvs']; state.psychPending = true; startReadBattle('logic'); return true; })()`);
await sleep(3500);
for (let i = 0; i < 40; i++) {
  const done = await page.eval(`(() => { if (document.querySelector('.hv-big')) return true; const b = [...document.querySelectorAll('.read-battle-host button')].find(b => !b.disabled && b.offsetParent && !/ルール/.test(b.textContent) && (b.closest('.rb-act') || /わかった|次へ|比べる|はじめ/.test(b.textContent))); if (b) b.click(); return false; })()`);
  await sleep(900); if (done) break;
}
await sleep(800);
await page.screenshot(path.join(OUT, `${W}x${H}_decide.png`));
console.log(await page.eval(`JSON.stringify(window.__clipText(document.querySelector('.read-battle-host')).filter(o => o.px > 4 || o.why === 'もぐり'))`));
await s.close(); process.exit(0);
