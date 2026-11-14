// 対戦の途中保存：読み合いの報酬・座り直しの資格が、読み込み直し→続きから で戻り、勝った時に払われるか。node qa/resumecheck.mjs
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 0 } });
const { page } = s;
const ready = async () => { for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500); await sleep(1200); };
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.offsetParent && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
await ready();
await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(2500);
// 2ハンド終えた所：読み合いで 480 稼ぎ、1回読んだ
await page.eval(`(() => { state.handNo = 2; state.playerChips = 1700; state.opponentChips = 1200; state.readBattleBonus = 480; state.readBattlePurse = { coins: 480, combo: 1, fever: 0, best: 1, perfect: 1 }; state.psychTried = 1; state.handNo++; saveBattleResume(); return true; })()`);
const before = await page.eval(`JSON.stringify({ bonus: state.readBattleBonus, used: usedReads(), saved: !!save.battleResume })`);
// 読み込み直し（保存は残す）
await page.eval(`location.reload(); true`).catch(() => {}); await sleep(3000); await ready();
await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(2500);
await click('続きから'); await sleep(800);
const after = await page.eval(`JSON.stringify({ bonus: state.readBattleBonus, used: usedReads(), p: state.playerChips, o: state.opponentChips, hand: state.handNo, purse: state.readBattlePurse && state.readBattlePurse.coins })`);
// 勝った所まで進めて支払いを見る
await page.eval(`(() => { state.opponentChips = 0; save.coins = 0; endBattle(); return true; })()`); await sleep(2500);
const paid = await page.eval(`JSON.stringify({ coins: save.coins, resumeLeft: !!save.battleResume })`);
console.log('保存前', before, '\n続きから後', after, '\n勝った後', paid, '\n例外', JSON.stringify(s.exceptions.map(e => (e.desc || e.text).slice(0, 120))));
await s.close(); process.exit(0);
