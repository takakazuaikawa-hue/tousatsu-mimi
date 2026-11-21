// リーディングの検査用：卓を決めた札の場面にして、相手に「賭けさせる」（本物の opponentTurnDecide を通す）。2026-11-17
// 相手の打ち方（decideOpponentAction）だけを、決めた賭けに差し替える。ほかは本物のコード。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './session.mjs';
import { stdCheck } from './stdcheck.mjs';

export const OUT = path.resolve('qa/out/reading');
fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];

// 'Ks 9h' のような文字列を卓の札に
export const cardsJs = `const R = { T: 10, J: 11, Q: 12, K: 13, A: 14 }, SU = { s: '♠', h: '♥', d: '♦', c: '♣' };
const C = (t) => { const r = R[t[0]] || +t[0]; return { rank: r, suit: SU[t[1]], label: ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r) }; };
const CS = (str) => str.trim().split(/\\s+/).map(C);`;

// night＝'horoyoi'｜'deisui'：ほろ酔いの夜・泥酔の夜の卓にする（ほろ酔い・泥酔はクリア後の遊び。セーブを夜の状態にしてから入る）
export async function open(opp, { W = 844, H = 390, save = {}, speed = 1, night = null } = {}) {
  const idx = ALL.indexOf(opp);
  const sv = Object.assign({ clearedStages: ALL.slice(0, Math.max(1, idx)), introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true }, save);
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed, seed: 7, save: sv });
  const { page } = s;
  const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object" && !!window.RD').catch(() => false)); i++) await sleep(500);
  await sleep(1200);
  if (night) await ev(`const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet']; save.endingUnlocked = true; save.rewardCgSeen = ALL; save.episodesSeen = ALL; save.horoyoiMode = true; save.horoyoiCleared = ALL.slice(); ${night === 'deisui' ? "localStorage.setItem('mp_deisui_dev', '1'); save.deisuiMode = true; save.deisuiCleared = ALL.slice(0, Math.max(0, ALL.indexOf(" + JSON.stringify(opp) + ")));" : ''} return 1;`);
  await ev(`window.__skipEpisodeOnce = true; startBattle(${JSON.stringify(opp)}); return 1;`);
  await sleep(2500);
  for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった|スキップ/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(800); }
  for (let i = 0; i < 60 && !(await page.eval(`state.screen === 'battle' && state.handNo >= 1 && (state.handPhase === 'preflop' || state.handPhase === 'flop') && state.isPlayerTurn`).catch(() => false)); i++) await sleep(500);
  await sleep(800);
  const STD = stdCheck({ minText: 14, bodyMin: 16 });
  let n = 0;
  const log = (...a) => console.log(...a);
  const T = {
    s, page, ev, log,
    async shot(tag, name) {
      n++;
      const f = path.join(OUT, `${tag}_${W}x${H}_${String(n).padStart(2, '0')}_${name}.png`);
      await page.screenshot(f);
      let bad = '';
      try { const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0; bad = ['covered', 'tiny', 'off', 'clip', 'overflowBox', 'safe'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k]).slice(0, 260)).join(' '); } catch (e) { bad = 'stdErr ' + e.message; }
      // 盤の中の文字は 18px 以上（盤の拡大前の CSS の大きさ）。ボタンは高さ 52px 以上
      let small = '';
      try { small = await page.eval(`(() => { const out = []; for (const e of document.querySelectorAll('.rd-host .sg *')) { if (!e.childNodes || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue; const r = e.getBoundingClientRect(); if (!r.width) continue; const f = parseFloat(cs.fontSize); if (f < 17.9) out.push(e.className + ':' + f); } return out.slice(0, 6).join(' '); })()`); } catch (e) {}
      log(String(n).padStart(2, '0'), name, bad || '基準 0', small ? '／盤の中で18px未満 ' + small : '');
      return f;
    },
    async waitFor(js, ms = 30000, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.eval(`!!(() => { try { return ${js}; } catch (e) { return false; } })()`)) return true; await sleep(step); } log('  待ちきれず:', js); return false; },
    q: (sel) => `!!document.querySelector('.rd-host ${sel}')`,
    click: (sel) => ev(`const b = document.querySelector('.rd-host ${sel}'); if (!b) return 'none'; b.click(); return 'ok';`),
    // 卓を決めた場面にして、相手に賭けさせる。phase＝turn｜river
    async bet({ phase = 'river', board, her, mine, pot = 400, intent = 'bluff', size = 'pot_2_3', riverCard = '2d', rdCount = null }) {
      return ev(`
        ${cardsJs}
        state.playerHand = CS(${JSON.stringify(mine)}); state.opponentHand = CS(${JSON.stringify(her)});
        state.community = CS(${JSON.stringify(board)}); state.handPhase = ${JSON.stringify(phase)};
        state.deck = [C(${JSON.stringify(riverCard)})];
        state.pot = ${pot}; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 800); state.opponentChips = Math.max(state.opponentChips, 800);
        state.pendingRead = null; state.readHandNo = -1; state.rdCount = ${JSON.stringify(rdCount)}; state.rdOpen = null; state.rdShown = null; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
        render();
        if (!window.__decOrig) window.__decOrig = decideOpponentAction;
        decideOpponentAction = () => ({ type: 'bet', size: ${JSON.stringify(size)}, intent: ${JSON.stringify(intent)}, eq: 0.3 });
        opponentTurnDecide(); return 1;`);
    },
    async restoreAI() { await ev(`if (window.__decOrig) decideOpponentAction = window.__decOrig; return 1;`); },
    // 次の手へ（手の結果の「次のハンドへ」を押す）
    async nextHand() { await ev(`const b = [...document.querySelectorAll('button')].find(b => /次のハンド/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); },
    async close() { log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)'))); log('exceptions', JSON.stringify(s.exceptions.slice(0, 3))); await s.close(); },
  };
  return T;
}
