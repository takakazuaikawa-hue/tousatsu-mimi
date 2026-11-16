// リーディング「目利き」をグラーノ戦の卓で通す（2026-11-17）。node qa/reading-mekiki.mjs [hit|miss|both] [WxH]
// 卓を「ターンまで済んだ手」にして、リバーをめくる（advanceAfterCall）→ リバー直後に目利きが出る。出るまでの乱数（40%）は 0 に固定する。
//  hit : 初回（お手本が自動で流れる）→ 本番（めくり・見立て・明かし）→ 当たり → 卓に戻って相手の手札が表
//  miss: 2回目（お手本は右上のボタン）→ 外す → 卓へ → 手の後の答え合わせ
// 3つ目の引数＝相手（grano｜selina｜velvet。既定 grano）。お手本を見た後の別の相手は、その相手の決まりの1枚（4点の札）から始まる。
// 出力 qa/out/reading/。基準（文字14px未満・はみ出し）は stdcheck で数える
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const [mode = 'both', size = '844x390', CK = 'grano'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const log = (...a) => console.log(...a);

async function run(which) {
  const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
  const save = { clearedStages: ALL.slice(0, ALL.indexOf(CK)), introPlayed: true, houseRulesSeen: true, coins: 800, readIntroSeen: true };
  if (which === 'miss' || which === 'max') save.rdDemo = { mekiki: true };
  const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 7, save });
  const { page } = s;
  const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
  let n = 0;
  const shot = async (t) => {
    n++;
    const f = path.join(OUT, `${CK === 'grano' ? '' : CK + '_'}${which}_${W}x${H}_${String(n).padStart(2, '0')}_${t}.png`);
    await page.screenshot(f);
    let bad = '';
    try { const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0; bad = ['covered', 'tiny', 'off', 'clip', 'overflowBox', 'safe'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k]).slice(0, 260)).join(' '); } catch (e) { bad = 'stdErr ' + e.message; }
    log(String(n).padStart(2, '0'), t, bad || '基準 0');
  };
  const waitFor = async (js, ms = 30000, step = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.eval(`!!(() => { try { return ${js}; } catch (e) { return false; } })()`)) return true; await sleep(step); } log('  待ちきれず:', js); return false; };
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await sleep(1200);
  await ev(`startBattle(${JSON.stringify(CK)}); return 1;`);
  await sleep(2500);
  for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(800); }
  // 卓をターンまで済んだ手にする。リバーは 2♦
  await ev(`
    const C = (r, s) => ({ rank: r, suit: s, label: ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r) });
    state.playerHand = [C(13, '♦'), C(12, '♣')]; state.opponentHand = [C(14, '♥'), C(11, '♠')];
    state.community = [C(14, '♣'), C(7, '♦'), C(4, '♠'), C(9, '♥')]; state.handPhase = 'turn';
    state.deck = [C(6, '♠'), C(2, '♦')];
    state.pot = 400; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 800); state.opponentChips = Math.max(state.opponentChips, 800);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; ${which === 'max' ? 'state.zazazo = state.zazazoMax - 1;' : ''} state.psychResolved = false; state.isPlayerTurn = false;
    render(); return 1;`);
  await sleep(500);
  log('ok?', await ev(`return JSON.stringify({ ok: rdOk('mekiki'), table: !!readBattleTable('mekiki'), pool: readPools().psych, horoyoi: isHoroyoi() });`));
  // 乱数の「出る見込み 40%」は 0 にして出す
  await ev(`window.__rand0 = rand; rand = () => 0.01; advanceAfterCall(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await ev(`rand = window.__rand0; return 1;`);
  await sleep(400);
  const q = (sel) => `!!document.querySelector('.rd-host ${sel}')`;
  const click = (sel) => ev(`const b = document.querySelector('.rd-host ${sel}'); if (!b) return 'none'; b.click(); return 'ok';`);
  if (which === 'hit') {
    await shot('demo_intro');
    await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot('demo_stop1');
    await waitFor(q('.sg.demo .opts.on'), 25000); await sleep(1600); await shot('demo_pick');
    await waitFor(q('.sg.demo .opt.ok'), 25000); await sleep(800); await shot('demo_reveal');
    await waitFor(q('.sg.demo .panel.on'), 25000); await sleep(300); await shot('demo_card4');
    log('お手本を見た印', await ev(`return JSON.stringify(save.rdDemo)`));
    await click('.sg.demo .pgo');
  } else {
    if (await waitFor(q('.sg.demo .panel.on'), 3000)) { await sleep(300); await shot('rule_card'); await click('.sg.demo .pgo'); }
    await shot('live_intro_nodemo');
  }
  await waitFor(q('.sg.live .mk'), 20000); await sleep(500); await shot('live_flip');
  if (CK === 'velvet') { await waitFor(q('.sg.live .mk.fk'), 20000); await sleep(400); await shot('live_fake'); }
  await waitFor(q('.sg.live .opts.on'), 20000); await sleep(1500); await shot('live_pick');
  if (which === 'hit') {
    await click('.sg.live .askrico'); await sleep(500); await shot('live_coach');
    await click('.sg.live .rico');
  }
  const labels = JSON.parse(await ev(`return JSON.stringify([...document.querySelectorAll('.rd-host .sg.live .opt b')].map(b => b.textContent))`));
  log('見立て', JSON.stringify(labels));
  const want = labels.findIndex(t => t.replace(/\s/g, '') === 'Aのペア');
  const idx = which !== 'miss' ? want : labels.findIndex((t, i) => i !== want);
  await ev(`document.querySelectorAll('.rd-host .sg.live .opt')[${idx}].click(); return 1;`); await sleep(500);
  await shot('live_selected');
  await click('.sg.live .go');
  if (which !== 'miss') {
    await waitFor(q('.sg.live .opt.ok'), 15000); await sleep(1500); await shot('live_reveal');
    await waitFor(q('.sg.live .go.on'), 8000);
  } else { await sleep(1200); await shot('live_miss'); }
  await click('.sg.live .go');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  await sleep(1500);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, turn: state.isPlayerTurn, open: state.rdOpen, pending: state.pendingRead && { game: state.pendingRead.game, pick: state.pendingRead.pick, ans: state.pendingRead.ans }, panyu: state.panyu, zazazo: state.zazazo, success: state.psychSuccessCount })`));
  if (which === 'max') {
    await sleep(1800); await shot('max_bluffbreak');
    await waitFor(`!!document.querySelector('.personality-reveal-banner')`, 8000); await sleep(800); await shot('max_banner');
    log('読み切り', await ev(`return JSON.stringify({ revealed: state.opponentPersonalityRevealed, bb: state.bluffBreakHappened, zazazo: state.zazazo })`));
    await ev(`document.querySelector('.personality-reveal-banner .prb-close-btn').click(); return 1;`); await sleep(1000);
    const h0 = await ev('return state.handNo');
    await waitFor(`state.isPlayerTurn`, 10000);
    await ev(`playerFold(); return 1;`); await sleep(1800);
    await ev(`const b = [...document.querySelectorAll('button')].find(b => /次のハンド/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`);
    await waitFor(`state.handNo > ${h0}`, 10000); await sleep(2500); await shot('max_nexthand');
    log('次の手', await ev(`return JSON.stringify({ hand: state.handNo, phase: state.handPhase, turn: state.isPlayerTurn, rd: !!document.querySelector('.rd-host') })`));
  }
  await waitFor(`state.isPlayerTurn`, 10000);
  await sleep(600);
  await shot('table_back');
  log('相手の手札（表）', await ev(`const e = document.querySelector('.battle-screen .opponent-hand, .battle-screen [class*="opp-hole"], .battle-screen .opp-hand'); return e ? (e.className + ' | ' + e.innerText.replace(/\\s+/g, ' ')) : 'none'`));
  if (which === 'miss') {
    // 手を終える（降りる）→ 手の後の答え合わせ
    await ev(`playerFold(); return 1;`);
    await sleep(1800); await shot('hand_result');
    await ev(`const b = [...document.querySelectorAll('button')].find(b => /次のハンド/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`);
    await waitFor(q('.sg'), 15000); await sleep(1800); await shot('verdict');
    await waitFor(q('.opt.ok'), 8000); await sleep(1200); await shot('verdict_reveal');
    await click('.sg .go');
    await waitFor(`!document.querySelector('.rd-host')`, 6000);
    await sleep(1500);
    await shot('after_verdict');
  }
  log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
  log('exceptions', JSON.stringify(s.exceptions.slice(0, 3)));
  await s.close();
}
if (mode === 'hit' || mode === 'both') await run('hit');
if (mode === 'miss' || mode === 'both') await run('miss');
if (mode === 'max') await run('max');
process.exit(0);
