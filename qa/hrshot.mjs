// 手の結果の窓（最後のハンド＝「対戦結果を見る」）を撮り、ボタンと手札・持ち点の欄の重なりを測る。node qa/hrshot.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/hrshot'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, speed: 1, seed: 1, save: { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, coins: 500, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1200);
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
await page.eval(`startBattle('polka'); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await click('対戦開始') || await click('開始'); await sleep(900); }
const res = {};
for (const kind of ['showdown', 'fold']) {
  await page.eval(`(() => {
    const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1), label: x.slice(0, -1) }));
    state.playerHand = C('A♠ A♦'); state.opponentHand = C('Q♦ Q♣'); state.community = C('2♥ 7♣ A♥ 9♦ Q♠');
    const pEv = evaluateHand(state.playerHand.concat(state.community)), oEv = evaluateHand(state.opponentHand.concat(state.community));
    state.equityHistory = [{ street: 'プリフロップ', pct: 82 }, { street: 'フロップ', pct: 91 }, { street: 'ターン', pct: 95 }, { street: 'リバー', pct: 0 }];
    state.handNo = state.maxHands; state.playerChips = 900; state.opponentChips = 3100;
    state.handResults = [{ hand: state.handNo, winner: 'opponent', reason: '${kind}' === 'fold' ? 'fold' : 'showdown', pot: 400, pEv, oEv, foldQuality: 'good' }];
    document.querySelectorAll('.hand-result-overlay').forEach(e => e.remove());
    showHandResultBanner(); return true; })()`);
  if (process.env.QA_TALL) await page.eval(`(() => { const st = document.createElement('style'); st.textContent = '.hr-card .hr-body * { line-height: 2 !important; }'; document.head.appendChild(st); return true; })()`);
  await sleep(1500);
  await page.screenshot(path.join(OUT, `${W}x${H}${process.env.QA_TALL ? '_tall' : ''}_${kind}.png`));
  res[kind] = await page.eval(`JSON.stringify((() => {
    const b = document.querySelector("#continue-hand-btn"), card = document.querySelector(".hr-card");
    if (!b) return 'no btn';
    const br = b.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const hits = [...card.querySelectorAll('*')].filter(e => e !== b && !b.contains(e) && !e.contains(b)).map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.width > 2 && r.height > 2 && r.bottom > br.top + 1 && r.top < br.bottom - 1 && r.right > br.left && r.left < br.right).map(([e, r]) => e.className + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom));
    return { label: b.textContent, btn: [Math.round(br.top), Math.round(br.bottom)], card: [Math.round(cr.top), Math.round(cr.bottom)], scroll: [card.scrollHeight, card.clientHeight], hits: hits.slice(0, 8), pos: getComputedStyle(b).position };
  })())`);
}
console.log(JSON.stringify(res, null, 1));
await s.close(); process.exit(0);
