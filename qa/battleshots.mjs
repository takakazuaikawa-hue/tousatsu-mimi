// 本編の卓を場面ごとに撮る（見た目の確認用）。node qa/battleshots.mjs [opponent=grano] [width height] [outPrefix]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [opp = 'grano', W = 1280, H = 800, out = 'qa/out/bs/' + opp] = process.argv.slice(2);
const save = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 800, unlockedNotes: ['board_danger', 'range_basic', 'tell'] };
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 900, speed: 1, save });
const shot = async (n) => { await page.screenshot(path.resolve(`${out}_${n}.png`)); console.log('shot', n); };
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } return true; })()`);
const click = (re) => ev(`const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent) && !b.disabled && b.offsetParent); if (b) b.click(); return !!b;`);
await sleep(3000);
await ev(`startBattle(${JSON.stringify(opp)})`); await sleep(2500);
for (let i = 0; i < 8; i++) { await click('/開始|対戦開始/'); await sleep(900); }
// プレイヤーの番まで待つ
for (let i = 0; i < 40; i++) { const ok = await page.eval(`!!(state.isPlayerTurn && document.querySelector('.verb-grid'))`); if (ok) break; await click('/次のハンド|閉じる/'); await sleep(500); }
await sleep(800); await shot('1_turn');
await ev(`state.betChooserOpen = true; render();`); await sleep(500); await shot('2_bet');
await ev(`state.betChooserOpen = false; while (state.community.length < 3) state.community.push(state.deck.pop()); state.handPhase = 'flop'; state.currentBetOpponent = 60; state.pot += 60; state.opponentSpeech = 'この一枚、安いものですよ。払う価値はありますかな？'; render();`); await sleep(900); await shot('3_flop');
await ev(`while (state.community.length < 5) state.community.push(state.deck.pop()); state.handPhase = 'showdown'; state.opponentRevealed = true; state.isPlayerTurn = false; render();`); await sleep(1200); await shot('4_showdown');
console.log(await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 4))`));
await close();
