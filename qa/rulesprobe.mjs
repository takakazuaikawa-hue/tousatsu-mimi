// 遊びの4点の札の寸法を測る（「わかった」が画面に入っているか）。QA_SIZE=WxH node qa/rulesprobe.mjs <種類> <相手> <psych|logic>
import { openSession, sleep } from './lib/session.mjs';
const [g = 'ask', opp = 'polka', grp = 'psych'] = process.argv.slice(2);
const [w, h] = (process.env.QA_SIZE || '667x375').split('x').map(Number);
const s = await openSession({ width: w, height: h, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(grp)}] = [${JSON.stringify(g)}]; if ((state.community || []).length < 3) { state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()]; state.handPhase = 'flop'; render(); } state.psychPending = true; startReadBattle(${JSON.stringify(grp)}); return true; })()`);
await sleep(4500);
console.log(await page.eval(`JSON.stringify((() => { const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: Math.round(r.top), h: Math.round(r.height), disp: cs.display, maxH: cs.maxHeight, place: cs.placeItems }; }; return { vh: innerHeight, layer: q('.mb-layer'), res: q('.mb-rules'), card: q('.mb-rules .mb-result-card'), body: q('.mb-rules .mb-result-card > div'), act: q('.mb-rules .mb-result-actions'), host: q('.read-battle-host'), name: q('.mb-opp-row .mb-opp-name'), nameParent: (() => { const e = document.querySelector('.mb-speech'); const p = e && e.parentElement; if (!p) return null; const r = p.getBoundingClientRect(); return { cls: p.className, top: Math.round(r.top), h: Math.round(r.height), cssH: getComputedStyle(p).height, ov: getComputedStyle(p).overflow }; })(), speech: q('.mb-opp-row .mb-speech'), bet: q('.mb-opp-row .mb-betchip'), coach: q('.mb-opp-row .mb-coach') }; })())`));
await s.close(); process.exit(0);
