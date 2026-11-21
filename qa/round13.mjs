// 13回目の外部の批評の直しを確かめる。node qa/round13.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round13'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka', 'selina', 'grano'], ownedItems: [] };
const log = {};
async function boot(save = SAVE) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const run = (k) => !ONLY || ONLY.split(',').includes(k);
const errs = (s) => s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
const R = (sel) => `(() => [...document.querySelectorAll('${sel}')].filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }))()`;
// 画面上の実寸の文字の大きさ（拡大縮小を掛けた後）
const FS = (sel) => `(() => [...document.querySelectorAll('${sel}')].filter(e => e.getBoundingClientRect().width && e.textContent.trim()).slice(0, 6).map(e => { const k = e.getBoundingClientRect().width / (e.offsetWidth || 1); return Math.round(parseFloat(getComputedStyle(e).fontSize) * k * 10) / 10; }))()`;


const okBtns = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } };
const SETUP = (opp, hand, board, her, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) }));
  state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${her}'); ${extra} return 1; })()`;


// ダウト：ルールを読んでいる間は時間が止まる。読みの稼ぎの欄が収まる
if (run('doubt')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('polka', 'Q♥ K♣', '2♣ 7♦ Q♠', 'K♠ 5♦', `try { localStorage.setItem('mbRulesSeen:doubt', '1'); } catch (e) {} state.handPhase = 'flop'; state.pot = 300; state.currentBetOpponent = 100; state.currentBetPlayer = 0; state.handActs = [{ ph: 'flop', t: 'bet', a: 100 }]; READ_BATTLE_POOLS.polka.psych = ['doubt']; state.psychPending = true; startReadBattle('psych');`));
  await sleep(3000);
  for (let i = 0; i < 10 && !(await page.eval(`!!document.querySelector('#mb-doubt-timer')`)); i++) { await page.eval(`(() => { const bs = [...document.querySelectorAll('.read-battle-host button:not([disabled])')].filter(b => b.getBoundingClientRect().width && !/ルール/.test(b.textContent)); (bs.find(b => /わかった|はじめ|次へ|聞く|始める/.test(b.textContent)))?.click(); return 1; })()`); await sleep(800); }
  await sleep(1200);
  const samp = async () => page.eval(`(() => { const i = document.querySelector('#mb-doubt-timer i'); return i ? Math.round(parseFloat(getComputedStyle(i).width)) + '/' + document.querySelector('#mb-doubt-n')?.textContent : '-'; })()`);
  const tl = []; for (let k = 0; k < 3; k++) { tl.push(await samp()); await sleep(250); }
  const w0 = tl.join(' ');
  await page.eval(`(() => { document.querySelector('.mb-rules-btn')?.click(); return 1; })()`); const tl2 = []; for (let k = 0; k < 8; k++) { await sleep(600); tl2.push(await samp()); } log.tl2 = tl2.join(' ');
  const during = await page.eval(`JSON.stringify({ rules: !!document.querySelector('.mb-rules'), w: getComputedStyle(document.querySelector('#mb-doubt-timer i')).width, stamps: [...document.querySelectorAll('.doubt-stamp.is-on')].map(e => e.textContent) })`);
  await page.eval(`(() => { document.querySelector('#mb-rules-ok')?.click(); return 1; })()`); const tl3 = []; for (let k = 0; k < 6; k++) { await sleep(300); tl3.push(await samp()); } log.tl3 = tl3.join(' ');
  const after = await page.eval(`JSON.stringify({ rules: !!document.querySelector('.mb-rules'), w: getComputedStyle(document.querySelector('#mb-doubt-timer i'))?.width, marks: [...document.querySelectorAll('.dx-row .mark.is-on, .doubt-row .mark.is-on')].map(e => e.textContent) })`);
  log.doubt = { w0, during, after, purse: await page.eval(`JSON.stringify({ t: [...document.querySelectorAll('.mb-purse > div')].map(e => [e.textContent.trim(), e.scrollWidth > e.clientWidth + 1]) })`) };
  await page.screenshot(path.join(OUT, `${W}x${H}_doubt.png`));
  log.errDoubt = errs(s);
  await s.close();
}

console.log(JSON.stringify(log, null, 1));
process.exit(0);
