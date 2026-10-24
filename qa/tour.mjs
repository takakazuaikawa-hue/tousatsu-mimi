// 主な画面を順に撮る（デザインの見直し用）。node qa/tour.mjs [width height] [outPrefix]
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/tour/pc'] = process.argv.slice(2);
const save = { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, coins: 1200 };
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 900, speed: 1, save });
const shot = async (name) => { await page.screenshot(path.resolve(`${out}_${name}.png`)); console.log('shot', name); };
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return String(e); } return true; })()`);
await sleep(4000); await shot('01_title');
await ev(`goLobby()`); await sleep(2500);
await ev(`document.querySelectorAll('.intermission-overlay, .episode-title-overlay').forEach(e => e.remove())`); await shot('02_lobby');
await ev(`state.screen = 'shop'; render()`); await sleep(2000); await shot('03_shop');
await ev(`goLobby()`); await sleep(1500);
await ev(`startBattle('grano')`); await sleep(2500); await shot('04_battle_intro');
for (let i = 0; i < 6; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click();`); await sleep(1000); }
await sleep(2000); await shot('05_battle_table');
await ev(`state.psychPending = true; startReadBattle('psych')`); await sleep(3500); await shot('06_read_psych');
await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = false; render()`); await sleep(800);
await ev(`state.psychPending = true; startReadBattle('logic')`); await sleep(3500); await shot('07_read_logic');
await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = false; state.playerChips = state.playerChips + state.opponentChips; state.opponentChips = 0; endBattle()`); await sleep(3500); await shot('08_result');
await close();
