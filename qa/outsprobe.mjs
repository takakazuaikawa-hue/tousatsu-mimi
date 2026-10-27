// アウツの「値段とくらべる」画面の並び（コール・降りるの置き場）を測る
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 844, height: 390, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle('grano'); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { READ_BATTLE_POOLS.grano.logic = ['outs']; state.playerHand=[{rank:9,suit:'♥'},{rank:8,suit:'♥'}];state.community=[{rank:2,suit:'♥'},{rank:13,suit:'♥'},{rank:6,suit:'♣'},{rank:12,suit:'♠'}];state.opponentHand=[{rank:13,suit:'♦'},{rank:10,suit:'♣'}];state.handPhase='turn';state.pot=400;state.currentBetOpponent=120;state.currentBetPlayer=0; state.psychPending = true; startReadBattle('logic'); return true; })()`);
await sleep(4000);
for (const t of ['わかった', 'わからない']) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(t)})); if (b) b.click(); return true; })()`); await sleep(2500); }
console.log(await page.eval(`JSON.stringify((() => { const a = document.querySelector('.ox-act'); if (!a) return 'none'; const p = a.parentElement; const cs = getComputedStyle(a); const r = a.getBoundingClientRect(); return { parent: p.className, parentDisp: getComputedStyle(p).display, parentPos: getComputedStyle(p).position, matches: p.matches(':has(> .outs-meter)'), pos: cs.position, ga: cs.gridArea, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], kids: [...p.children].map(c => c.className.slice(0, 30)) }; })())`));
await s.close(); process.exit(0);
