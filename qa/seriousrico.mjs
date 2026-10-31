// 本気のリコ先輩戦の直し（2026-10-20 試遊の感想）を確かめる：
//  1) 講義の報酬も第1話の題字も未受け取りのセーブで本気リコを選んでも、第1話の題字・一枚絵が出ない
//  2) 負けた時のボタンが、ほかの相手の負けと同じ「リベンジ」系（勝ちのボタンが出ない）
//  3) 勝った時の初回報酬が 2000（講義の 300 とは別の記録）
// node qa/seriousrico.mjs [outDir]   出力: <outDir>/*.png と report.json
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve(process.argv[2] || 'qa/out/seriousrico'); fs.mkdirSync(OUT, { recursive: true });
const save = { introPlayed: true, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingUnlocked: true, firstClearRewardClaimed: [], episodesSeen: [], coins: 1000 };
const s = await openSession({ width: 1280, height: 800, save });
const { page } = s;
await sleep(5000);
const rep = {};
const shot = async (n) => { await page.screenshot(path.join(OUT, n + '.png')); };
const enterSerious = async () => {
  await page.eval(`(() => { document.querySelectorAll('.result-overlay, .battle-result, .episode-overlay').forEach(e => e.remove()); window.__ricoSeriousMode = true; startBattle('rico_tutorial'); return 1; })()`);
  await sleep(2500);
  rep.episodeShown = rep.episodeShown || await page.eval(`!!document.querySelector('.episode-overlay')`);
  for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /対戦開始|開始|次へ|わかった|対戦へ/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return 1; })()`); await sleep(700); }
};
// 0) ついでに：第6話（エピローグ）の題字（締めの前に出る）を撮る
await page.eval(`(() => { showEpisodeTitle('ending', () => {}); return 1; })()`);
await sleep(4500);
await shot('0_ep6');
await page.eval(`(() => { document.querySelectorAll('.episode-overlay').forEach(e => e.remove()); return 1; })()`);
// 1) 開始：題字が出ないこと
await enterSerious();
rep.seriousMode = await page.eval(`!!state.seriousRicoMode`);
await shot('1_start');
// 2) 負け
await page.eval(`(() => { state.playerChips = 0; state.opponentChips = 4000; endBattle(); return 1; })()`);
await sleep(6000);
rep.loseButtons = await page.eval(`[...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean)`);
await shot('2_lose');
// 3) 勝ち（初回）
await enterSerious();
await page.eval(`(() => { state.handNumber = 8; state.playerChips = 4000; state.opponentChips = 0; endBattle(); return 1; })()`);
await sleep(6000);
rep.winText = await page.eval(`(document.querySelector('#stage').innerText || '').replace(/\\s+/g, ' ').match(/初回クリア報酬[^ ]*|再戦勝利報酬[^ ]*/g)`);
rep.claimed = await page.eval(`save.firstClearRewardClaimed`);
await shot('3_win');
for (let i = 0; i < 3; i++) { await page.eval(`(() => { const sc = document.querySelector('.result-scroll, .result-body, .battle-result'); if (sc) sc.scrollTop += 400; return 1; })()`); await sleep(500); }
await shot('3_win_more');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 1));
console.log(JSON.stringify(rep, null, 1));
await s.close();
