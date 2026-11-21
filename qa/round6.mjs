// 6回目の外部の批評の直しを確かめる。node qa/round6.mjs [844x390] [項目]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const ONLY = process.argv[3] || '';
const OUT = path.resolve('qa/out/round6'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, coins: 3800, readIntroSeen: true, rewardCgSeen: ['polka'], ownedItems: ['memory_minipoker'] };
const ALL = { ...SAVE, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], endingSeen: true, allstarUnlocked: true };
const log = {};
async function boot(save = SAVE) {
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 3, probes: ['cliptext.js'], save });
  for (let i = 0; i < 60 && !(await s.page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1000);
  return s;
}
const run = (k) => !ONLY || ONLY.split(',').includes(k);
const errs = (s) => s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
const SETUP = (hand, board, opp, extra) => `(() => { document.querySelectorAll('.mimi-confirm-overlay, [class*="must-know"], .mk-layer').forEach(e => e.remove()); const C = (s) => s.split(' ').map(x => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[x.slice(0, -1)] || +x.slice(0, -1), suit: x.slice(-1) })); state.playerHand = C('${hand}'); state.community = C('${board}'); state.opponentHand = C('${opp}'); ${extra} return true; })()`;
const okBtns = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /わかった|はじめ/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(700); } };

// 1 ファイブポーカー：残す印は横1行で、札の下の端だけに掛かる
if (run('mini')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showMiniPokerGame(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = [...document.querySelectorAll('.minipoker-overlay button')].find(b => /はじめる/.test(b.textContent)); if (b) b.click(); return 1; })()`); await sleep(800);
  await page.eval(`(() => { document.querySelector('[data-mp="deal"]')?.click(); return 1; })()`);
  for (let i = 0; i < 20 && !(await page.eval(`!!document.querySelector('[data-mp-tap]')`)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`(() => { const c = document.querySelectorAll('[data-mp-tap]'); if (!document.querySelector('.mp-card-keep')) { c[0].click(); c[2].click(); } return 1; })()`); await sleep(800);
  log.miniKeep = await page.eval(`JSON.stringify([...document.querySelectorAll('.mp-card-keep')].map(k => { const r = k.getBoundingClientRect(), c = k.parentElement.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), cardW: Math.round(c.width), fromTop: Math.round((r.top - c.top) / c.height * 100) + '%', ok: r.height <= 22 && r.top > c.top + c.height * .7 && r.bottom <= c.bottom + 1 }; }))`);
  await page.screenshot(path.join(OUT, `${W}x${H}_mini.png`));
  log.errM = errs(s);
  await s.close();
}
// 2 読み合いの初回説明：3ページとも枠とボタンが画面に収まる
if (run('intro')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('polka'); return true; })()`); await sleep(4500);
  for (const [grp, g] of [['psych', 'ask'], ['logic', 'outs']]) {
    await page.eval(`(() => { document.querySelectorAll('.mk-layer').forEach(e => e.remove()); state.currentBetOpponent = 100; state.currentBetPlayer = 0; const g = '${g}' === 'ask' ? [...REAL_READ_GAMES].find(x => !['outs','narrow','sniper','handvs'].includes(x)) : '${g}'; showMustKnow(readIntroPages('${grp}', g), { cls: 'is-read' }); return 1; })()`);
    for (let p = 0; p < 4; p++) {
      await sleep(1600);
      const m = await page.eval(`(() => { const c = document.querySelector('.mk-card'); if (!c) return null; const r = c.getBoundingClientRect(); const b = c.querySelector('.mk-next').getBoundingClientRect(); return { page: c.querySelector('.mk-count')?.textContent, card: Math.round(r.top) + '..' + Math.round(r.bottom), btn: Math.round(b.bottom), ok: r.bottom <= innerHeight + 1 && b.bottom <= innerHeight }; })()`);
      if (!m) break;
      (log['intro_' + grp] ||= []).push(m);
      await page.screenshot(path.join(OUT, `${W}x${H}_intro_${grp}_${p}.png`));
      await page.eval(`(() => { document.querySelector('.mk-card .mk-next')?.click(); return 1; })()`);
    }
  }
  log.errI = errs(s);
  await s.close();
}
// 3 役くらべ：5枚を作る段の札の幅（画面上で44px以上）
if (run('handvs')) {
  const s = await boot({ ...SAVE, clearedStages: ['rico_tutorial', 'polka', 'selina'] }); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('Q♦ K♣', '2♣ 7♦ Q♠ 9♥', 'K♠ 5♦', `try { localStorage.removeItem('mbRulesSeen:handvs'); } catch (e) {} state.handPhase = 'turn'; state.pot = 600; state.currentBetOpponent = 200; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 200 }]; READ_BATTLE_POOLS.grano.logic = ['handvs']; READ_GAME_OK.handvs = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4000); await okBtns(page, 3);
  for (let i = 0; i < 10 && !(await page.eval(`!!document.querySelector('#mb-hv-seven')`)); i++) await sleep(600);
  log.hvCards = await page.eval(`JSON.stringify([...document.querySelectorAll('#mb-hv-seven .card')].map(c => Math.round(c.getBoundingClientRect().width)))`);
  log.hvInfoHidden = await page.eval(`getComputedStyle(document.querySelector('.rb-info')).display`);
  await page.screenshot(path.join(OUT, `${W}x${H}_handvs.png`));
  log.errH = errs(s);
  await s.close();
}
// 4 アウツ：場にもうペアがある時は全部半分で数える
if (run('outs')) {
  const s = await boot(); const { page } = s;
  await page.eval(`(() => { window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`); await sleep(4500);
  await page.eval(SETUP('K♥ 5♥', 'A♥ A♣ 2♥ 7♣', 'A♠ 7♦', `try { localStorage.setItem('mbRulesSeen:outs', '1'); } catch (e) {} state.handPhase = 'turn'; state.pot = 450; state.currentBetOpponent = 50; state.currentBetPlayer = 0; state.handActs = [{ ph: 'turn', t: 'bet', a: 50 }]; READ_BATTLE_POOLS.grano.logic = ['outs']; READ_GAME_OK.outs = () => true; state.readHandNo = -1; state.psychPending = true; startReadBattle('logic');`));
  await sleep(4500); await okBtns(page, 2);
  for (let i = 0; i < 30 && !(await page.eval(`!!document.querySelector('#mb-o-count')?.textContent.includes('半分')`)); i++) {
    await page.eval(`(() => { const c = [...document.querySelectorAll('#mb-o-deck .card:not(.known):not(.found)')].find(x => x.dataset.k && /h$|♥/.test(x.dataset.k)); if (c) c.click(); else { const b = [...document.querySelectorAll('.read-battle-host button')].find(b => /数え終わった|決める|次へ|これで/.test(b.textContent)); if (b) b.click(); } return 1; })()`); await sleep(400);
  }
  log.outsCount = await page.eval(`(document.querySelector('#mb-o-count')?.textContent || '')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_outs.png`));
  log.errO = errs(s);
  await s.close();
}
// 5 コレクションの数・本気リコの入口・同額の賭け・平易な勝負の名前
if (run('misc')) {
  const s = await boot({ ...ALL, ownedItems: ['chips_plus_3000'], bestRanks: { polka: 'S', rico_serious: 'SS' }, firstClearRewardClaimed: ['rico_serious'] }); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); showCollectionModal(); return 1; })()`); await sleep(1500);
  log.collCount = await page.eval(`[...document.querySelectorAll('.coll-section-title')].map(e => e.textContent.replace(/\\s+/g, ' ')).join(' | ')`);
  await page.eval(`(() => { document.querySelectorAll('.coll-overlay, .collection-overlay, .modal-overlay').forEach(e => e.remove()); showRicoModeChooser(); return 1; })()`); await sleep(1000);
  log.ricoEntry = await page.eval(`[...document.querySelectorAll('.rico-mode-opt-desc')].map(e => e.textContent).join(' | ')`);
  await page.screenshot(path.join(OUT, `${W}x${H}_rico_entry.png`));
  log.betDedupe = await page.eval(`(() => { state.betChooserOpen = true; const h = renderVerbActions([{ kind: 'fold', enabled: true, action: 'player-fold' }, { kind: 'callcheck', enabled: true, action: 'player-call', chipAmount: 0 }, { kind: 'sm', enabled: true, chipAmount: 700, action: 'player-raise' }, { kind: 'md', enabled: true, chipAmount: 1400, action: 'player-raise' }, { kind: 'lg', enabled: true, chipAmount: 1400, action: 'player-raise' }, { kind: 'allin', enabled: true, chipAmount: 1400, action: 'player-allin' }], 200); state.betChooserOpen = false; const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll('button')].map(b => b.textContent.replace(/\\s+/g, ' ').trim()).join(' / '); })()`);
  log.errX = errs(s);
  await s.close();
}
// 6 零時の卓：手番の時、自分の札と操作欄が重ならない
if (run('allstar')) {
  const s = await boot(ALL); const { page } = s;
  await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(2000);
  await page.eval(`(() => { const b = document.createElement('button'); b.dataset.action = 'allstar-open'; onAction({ currentTarget: b }); return true; })()`); await sleep(1500);
  await page.eval(`(() => { const b = document.querySelector('[data-action="allstar-seat"]'); if (b) b.click(); return !!b; })()`);
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    await page.eval(`(() => { const g = document.querySelector('.as-posguide.on button, .as-posguide.on [data-act]'); if (g) g.click(); return 1; })()`);
    if (await page.eval(`(() => { const a = document.querySelector('.as-actions'); return !!a && a.dataset.on === '1' && document.querySelectorAll('.as-hand .as-card').length >= 2; })()`)) break;
  }
  log.asOverlap = await page.eval(`(() => { const h = document.querySelector('.as-hand'), a = document.querySelector('.as-actions'); if (!h || !a) return 'none'; const cs = [...h.querySelectorAll('.as-card')].map(c => c.getBoundingClientRect()); const R = a.getBoundingClientRect(); const right = Math.max(...cs.map(c => c.right)); const st = document.querySelector('.as-mstack')?.getBoundingClientRect(); return JSON.stringify({ cardsRight: Math.round(right), actLeft: Math.round(R.left), gap: Math.round(R.left - right), stackRight: st && Math.round(st.right), cardsLeft: Math.round(Math.min(...cs.map(c => c.left))), on: a.dataset.on, actW: Math.round(R.width), actR: Math.round(R.right), host: (() => { const r = document.querySelector('.as-host').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]; })() }); })()`);
  await page.screenshot(path.join(OUT, `${W}x${H}_allstar.png`));
  log.errA = errs(s);
  await s.close();
}
console.log(JSON.stringify(log, null, 1));
process.exit(0);
