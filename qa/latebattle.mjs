// クリア後の装備・解放がそろったセーブで、本編の卓を場面ごとに撮って数える（2026-10-25 試遊の指摘：装備で増える部品が重なる）。
// QA_SIZE=844x390 node qa/latebattle.mjs [相手...]   出力 qa/out/latebattle/<大きさ>/<相手>_<場面>.png
// 数える物：stdcheck の基準＋「文字どうし・文字とカードの重なり」（親子は除く）。重なりは面積 20px² 以上だけ
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const OPPS = process.argv.slice(2).length ? process.argv.slice(2) : ['polka', 'selina', 'grano', 'velvet', 'rico_serious'];
const OUT = path.resolve(`qa/out/latebattle/${W}x${H}`); fs.mkdirSync(OUT, { recursive: true });
const ITEMS = ['panyu_sense_lv2', 'panyu_range_lv2', 'panyu_gauge_plus_20', 'note_pot_odds', 'panyu_combo_x2', 'panyu_sense_lv3', 'panyu_range_lv3', 'panyu_chrono', 'panyu_gauge_plus_50', 'note_tell', 'note_bankroll', 'chips_plus_500', 'chips_plus_1500', 'chips_plus_3000', 'chips_plus_5000'];
const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000,
  ownedItems: ITEMS, unlockedNotes: ['bluff_basic', 'board_danger', 'range_basic', 'tell', 'pot_odds', 'bankroll'], panyuSkills: { senseLevel: 3, rangeLevel: 3, breakLevel: 2 }, panyuGaugeMax: 170, panyuComboMultiplier: 2 };
const OVERLAP = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .2) return false; } return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; };
  const scope = document.querySelector('.battle-screen') || document.body;
  const texts = [...scope.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()) && vis(e));
  const cards = [...scope.querySelectorAll('.card, .v2-card, .playing-card, [class*="card-face"], [class*="card-back"]')].filter(vis);
  const box = (e) => { const r = e.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(e); const t = rg.getBoundingClientRect(); return t.width > 1 ? { l: Math.max(r.left, t.left), t: Math.max(r.top, t.top), r: Math.min(r.right, t.right), b: Math.min(r.bottom, t.bottom) } : r; };
  const inter = (a, b) => Math.max(0, Math.min(a.r ?? a.right, b.r ?? b.right) - Math.max(a.l ?? a.left, b.l ?? b.left)) * Math.max(0, Math.min(a.b ?? a.bottom, b.b ?? b.bottom) - Math.max(a.t ?? a.top, b.t ?? b.top));
  const name = (e) => (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 16) || e.className;
  const out = [];
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j]; if (a.contains(b) || b.contains(a)) continue;
    const s = inter(box(a), box(b)); if (s >= 20) out.push('文字×文字 「' + name(a) + '」×「' + name(b) + '」 ' + Math.round(s));
  }
  for (const t of texts) for (const c of cards) { if (c.contains(t) || t.contains(c)) continue; const s = inter(box(t), c.getBoundingClientRect()); if (s >= 20) out.push('文字×カード 「' + name(t) + '」 ' + Math.round(s)); }
  return JSON.stringify([...new Set(out)].slice(0, 30));
})()`;
const DUMP = `(() => { const S = ['.t8-table-name', '.t8-ante', '.v2-opp .character-frame', '.v2-tells', '.v2-range-band', '.opponent-info', '.v2-band', '.v2-band-name', '.opponent-speech', '.v2-pot', '.v2-pot-sub', '.community-cards', '.v2-role', '.char-mimi', '.player-hand', '.bottom-bar.v2-actions', '.v2-comments', '.v2-seal-row', '.t8-opp-hole, .opp-hole, .v2-opp-hand, .opponent-cards']; return JSON.stringify(S.map(q => { const e = document.querySelector('.battle-screen ' + q); if (!e) return q + ' -'; const r = e.getBoundingClientRect(); return q + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); })); })()`;
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, save: SAVE });
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } return true; })()`);
const click = (re) => ev(`const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent) && !b.disabled && b.offsetParent); if (b) b.click(); return !!b;`);
const report = {};
const shot = async (opp, n) => {
  if (process.env.QA_TINY) await ev(`const b = document.querySelector('.battle-screen .t8-table-name'); if (b && !b.querySelector('.qa-tiny')) b.insertAdjacentHTML('beforeend', '<span class="qa-tiny" style="font-size:20px">J</span>');`);
  await page.screenshot(path.join(OUT, `${opp}_${n}.png`));
  const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
  const ov = JSON.parse(await page.eval(OVERLAP));
  const bad = ['covered', 'tiny', 'off', 'clip', 'overflowBox', 'safe'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k]).slice(0, 300));
  report[`${opp}_${n}`] = { bad, ov };
  console.log(`${opp}_${n}`, bad.join(' ') || '基準 0', ov.length ? '\n   重なり ' + ov.join(' / ') : '');
  if (process.env.QA_DUMP) console.log('   位置', JSON.parse(await page.eval(DUMP)).join('\n     '));
  if (process.env.QA_RANK) console.log('   札の数字', await page.eval(`JSON.stringify([...document.querySelectorAll('.battle-screen .card .rank')].filter(e => e.offsetParent).map(e => { let t = []; for (let x = e; x && x !== document.body; x = x.parentElement) { const v = getComputedStyle(x).transform; if (v && v !== 'none') t.push((x.className || '').toString().slice(0, 20) + ' ' + v); } return e.textContent + ' ' + getComputedStyle(e).fontSize + ' ' + t.join(' | '); }))`));
};
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(2000);
  for (const opp of OPPS) {
    await ev(`if (state.screen !== 'lobby' && typeof goLobby === 'function') goLobby();`); await sleep(1200);
    await ev(`startBattle(${JSON.stringify(opp)})`); await sleep(2500);
    // 物語の導入は飛ばし、卓の「対戦開始」の前で撮る
    for (let i = 0; i < 6 && !(await page.eval(`!![...document.querySelectorAll('button')].find(b => /対戦開始/.test(b.textContent) && b.offsetParent)`)); i++) { await click('/^\\s*▶?\\s*開始|次へ|スキップ/'); await sleep(900); }
    await shot(opp, '0_prestart');
    for (let i = 0; i < 20 && !(await page.eval('(state.playerHand || []).length === 2')); i++) { await click('/開始|対戦開始/'); await sleep(900); }
    for (let i = 0; i < 40; i++) { const ok = await page.eval(`!!(state.isPlayerTurn && document.querySelector('.verb-grid'))`); if (ok) break; await click('/次のハンド|閉じる/'); await sleep(500); }
    await sleep(800); await shot(opp, '1_turn');
    await ev(`state.betChooserOpen = true; render();`); await sleep(600); await shot(opp, '2_bet');
    await ev(`state.betChooserOpen = false; while (state.community.length < 3) state.community.push(state.deck.pop()); state.handPhase = 'flop'; state.currentBetOpponent = (state.currentBetPlayer || 0) + 66; state.pot += 66; state.isPlayerTurn = true;
      state.opponentSpeech = 'おっと、ミミちゃん降りないの？ ボクはまだまだいけるよ〜！'; state.tellTags = ['相手は弱い', '相手は五分']; render();`); await sleep(1200); await shot(opp, '3_flop');
    await ev(`while (state.community.length < 5) state.community.push(state.deck.pop()); state.handPhase = 'showdown'; state.opponentRevealed = true; state.isPlayerTurn = false; render();`); await sleep(1500); await shot(opp, '4_showdown');
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
} finally { await close(); }
