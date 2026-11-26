// 14回目の批評の直しを撮って確かめる（容疑者しぼり・スナイパー・アウツ・役くらべ・卒業試験・零時の卓の中断・ファイブポーカー・コレクション）。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/fix14.mjs [667x375]   出力 qa/out/fix14/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '667x375').split('x').map(Number);
const OUT = path.resolve('qa/out/fix14'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, seed: 7, save: { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000 } });
const { page } = s;
const log = {};
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 200)));
const val = (js) => page.eval(js).catch(() => null);
const until = async (js, ms = 20000, step = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const click = (t, root = 'document') => page.eval(`(() => { const b = [...${root}.querySelectorAll('button')].find(b => !b.disabled && b.textContent.trim().includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
const C = (x) => x.split(' ').map(v => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[v.slice(0, -1)] || +v.slice(0, -1), suit: v.slice(-1) }));
// 文字が枠からはみ出していないか（要素の右端が親の札より外）
const CLIP = (sel, box) => `JSON.stringify([...document.querySelectorAll(${JSON.stringify(sel)})].map(e => { const b = e.closest(${JSON.stringify(box)}).getBoundingClientRect(), r = e.getBoundingClientRect(); return { t: e.textContent, over: Math.round(Math.max(b.left - r.left, r.right - b.right, e.scrollWidth - e.clientWidth)) }; }).filter(x => x.over > 0))`;
for (let i = 0; i < 60 && !(await val('typeof startBattle === "function"')); i++) await sleep(500);
await sleep(1500);
async function enter(who) {
  await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); startBattle('${who}')`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await click('最初から') || await click('対戦開始') || await click('開始'); await sleep(800); }
}
async function setTable(o) {
  await ev(`const o = ${JSON.stringify(o)}; state.playerHand = o.mine; state.community = o.board; state.opponentHand = o.her; state.handPhase = o.phase; state.pot = o.pot; state.currentBetOpponent = o.bet; state.currentBetPlayer = 0; state.handActs = o.acts || []; state.pendingRead = null; state.readHandNo = -1; state.psychPending = true`);
}
async function read(group, id) {
  await ev(`READ_GAME_OK['${id}'] = () => true; READ_BATTLE_POOLS[readPoolKey()]['${group}'] = ['${id}']; state.__nextReadGame = null; startReadBattle('${group}')`);
  await sleep(3500);
}
try {
  log.polkaPool = await val(`JSON.stringify(READ_BATTLE_POOLS.polka)`);

  // 1 容疑者しぼり：ミミ 5 のペア、相手にも同じ5のペアの札が出る場
  await enter('selina');
  await setTable({ board: C('5♣ 9♦ 6♠ A♣ Q♥'), mine: C('5♦ 2♠'), her: C('5♥ K♦'), phase: 'river', pot: 300, bet: 100, acts: [{ ph: 'river', t: 'bet', a: 100 }] });
  await read('logic', 'narrow');
  await click('わかった'); await sleep(1200);
  await shot('1_narrow');
  log.narrowTiles = await val(`JSON.stringify([...document.querySelectorAll('.nq-tile .nm')].map(e => e.textContent))`);
  log.narrowClip = await val(CLIP('.nq-tile .nm', '.nq-tile'));

  // 2 賭け額スナイパー：ルールのボタン
  await enter('selina');
  await setTable({ board: C('K♣ 9♦ 4♠ 2♣ 7♥'), mine: C('K♦ K♠'), her: C('8♥ 8♦'), phase: 'river', pot: 300, bet: 0 });
  await read('logic', 'sniper');
  await click('わかった'); await sleep(1200);
  await shot('2_sniper');
  log.sniperRules = await val(`(() => { const b = document.querySelector('.read-battle-host .mb-rules-btn'); if (!b) return 'なし'; const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return Math.round(r.width) + 'x' + Math.round(r.height) + (h === b ? ' 押せる' : ' 覆われている'); })()`);
  await ev(`document.querySelector('.read-battle-host .mb-rules-btn')?.click()`); await sleep(800);
  await shot('2b_sniper_rules');
  await click('わかった'); await sleep(600);

  // 3 アウツさがし：ルールのボタン
  await enter('grano');
  await setTable({ board: C('5♥ 6♥ 9♣ K♥'), mine: C('A♥ 7♣'), her: C('K♦ Q♠'), phase: 'turn', pot: 300, bet: 100 });
  await read('logic', 'outs');
  await click('わかった'); await sleep(1200);
  await shot('3_outs');
  log.outsRules = await val(`(() => { const b = document.querySelector('.read-battle-host .mb-rules-btn'); if (!b) return 'なし'; const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return Math.round(r.width) + 'x' + Math.round(r.height) + (h === b ? ' 押せる' : ' 覆われている'); })()`);

  // 4 役くらべ：役の一覧
  await enter('grano');
  await setTable({ board: C('5♥ 6♥ 9♣ K♥ 2♦'), mine: C('A♥ 9♦'), her: C('K♦ Q♠'), phase: 'river', pot: 300, bet: 100 });
  await read('logic', 'handvs');
  await click('わかった'); await sleep(1200); await click('わかった'); await sleep(1000);
  await shot('4_handvs');
  log.hvGuide = await val(`!!document.querySelector('.hv-guide-btn')`);
  await ev(`document.querySelector('.hv-guide-btn')?.click()`); await sleep(800);
  await shot('4b_handvs_guide');
  log.hvGuideTop = await val(`(() => { const o = document.querySelector('.hand-guide-overlay'); if (!o) return 'なし'; const r = o.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + 40); return o.contains(h) ? '一番上' : '下に隠れた'; })()`);
  await ev(`document.querySelector('.hand-guide-overlay')?.click()`); await sleep(500);
  await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); goLobby()`); await sleep(2500);

  if (process.argv[3] === 'reads') throw 'reads only';
  // 5 卒業試験：PC の大きさで開いて、小さいスマホに縮める
  await page.setViewport(1280, 800, false); await sleep(1500);
  await ev(`state.seriousRicoMode = true`);
  await enter('rico_tutorial');
  await ev(`state.seriousRicoMode = true`);
  await setTable({ board: C('5♥ 6♥ 9♣ K♥ 2♦'), mine: C('A♣ 9♦'), her: C('K♦ Q♠'), phase: 'river', pot: 300, bet: 200 });
  await read('psych', 'graduation');
  await click('わかった'); await sleep(1200);
  await page.setViewport(W, H, true); await sleep(2000);
  await shot('5_graduation_shrunk');
  log.gradLessons = await val(`JSON.stringify([...document.querySelectorAll('.gd-lesson')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.top) + '-' + Math.round(r.bottom); }) + ' 画面の高さ ' + innerHeight)`);
  await ev(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.seriousRicoMode = false; goLobby()`); await sleep(2500);

  // 6 零時の卓：降りた直後に「やめる」→ 答え合わせが重ならない
  await ev(`save.allstarUnlocked = true; save.endingUnlocked = true; save.allstar = { unlockSeen: true }; save.rewardCgSeen = [...save.clearedStages]; saveProgress(); state.screen = 'lobby'; render()`);
  await sleep(2500);
  await ev(`onAction({ currentTarget: { dataset: { action: 'allstar-open' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(1000);
  await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
  const Q = 'AllstarUI._qa';
  let paused = false;
  for (let i = 0; i < 12 && !paused; i++) {
    if (!await until(`${Q}.waiting()`, 60000)) break;
    // プロの判断と逆になりやすい「降りる」を選んで、すぐに中断の確認を開く
    await ev(`${Q}.actMimi('fold')`); await sleep(80);
    await ev(`document.querySelector('[data-as="menu"]').click()`); await sleep(2500);
    const both = await val(`!!document.querySelector('.as-menu') + ',' + !!document.querySelector('.as-review')`);
    log['allstar' + i] = both;
    if (both === 'true,false') {
      // 待っている答え合わせがあるか：続けるを押すと出る
      await shot('6_allstar_menu');
      const pending = await val(`!!AllstarUI._qa.T()`);
      await ev(`document.querySelector('.as-menu [data-as="menu-close"]').click()`); await sleep(1500);
      log.afterContinue = await val(`!!document.querySelector('.as-review') + ',' + !!document.querySelector('.as-review-ok')`);
      await shot('6b_allstar_continue');
      paused = true;
    } else {
      await ev(`document.querySelector('.as-menu [data-as="menu-close"]')?.click()`);
      await ev(`document.querySelector('[data-as="review-next"]')?.click()`);
    }
  }
  await ev(`document.querySelector('[data-as="review-next"]')?.click()`); await sleep(500);
  await ev(`try { goLobby(); } catch (e) {}`); await sleep(3000);

  // 7 ファイブポーカー（コレクションから開いて、閉じたらコレクションの所持金が変わるか）
  await ev(`save.ownedItems = [...new Set([...(save.ownedItems || []), 'memory_minipoker', 'memory_ending', 'memory_ending_theme', 'gallery_rico', 'omake_credit'])]; save.rewardCgSeen = [...save.clearedStages]; if (save.minipoker) save.minipoker.dailyBonusDate = ''; saveProgress()`);
  await ev(`showCollectionModal()`); await sleep(1500);
  await shot('7_collection');
  log.collNav = await val(`JSON.stringify([...document.querySelectorAll('.coll-jump button')].map(b => b.textContent))`);
  log.collCoins0 = await val(`document.querySelector('.collection-coins').textContent`);
  await ev(`document.querySelector('.collection-overlay [data-action="play-minipoker"]').click()`); await sleep(1800);
  await click('はじめる'); await sleep(500);
  await shot('7b_five_wager');
  log.fivePaytable = await val(`document.querySelector('.mp-paytable').innerText.slice(0, 120)`);
  let won = false;
  for (let i = 0; i < 25 && !won; i++) {
    await ev(`document.querySelector('[data-mp="deal"]')?.click()`); await sleep(2600);
    await ev(`document.querySelector('[data-mp="hold-all"]')?.click()`); await sleep(3800);
    await until(`!document.querySelector('.mp-garapon-row') || true`, 500);
    const r = await val(`(document.querySelector('.mp-result-banner') || {}).innerText || ''`);
    if (/勝利！/.test(r)) { won = true; log.fiveResult = r.replace(/\n/g, ' / '); await shot('7c_five_win'); log.fiveCalcVisible = await val(`(() => { const e = document.querySelector('.mp-result-calc'); return e ? getComputedStyle(e).display + ' ' + e.textContent : 'なし'; })()`); }
    await ev(`document.querySelector('[data-mp="next"]')?.click()`); await sleep(800);
  }
  await ev(`document.querySelector('.minipoker-close')?.click()`); await sleep(1000);
  await ev(`document.querySelector('[data-mp-sum="quit"]')?.click()`); await sleep(1500);
  log.collCoins1 = await val(`(document.querySelector('.collection-coins') || {}).textContent + ' 本当の残高 ' + save.coins`);
  // 8 コレクションの会話から読み返す
  await ev(`[...document.querySelectorAll('.collection-overlay .coll-jump button')].find(b => b.textContent === '会話')?.click()`); await sleep(1000);
  await shot('8_collection_talk');
  await ev(`document.querySelector('.collection-overlay [data-action="recall-episode"]').click()`); await sleep(2500);
  await shot('8b_recall');
  log.exceptions = s.exceptions.slice(0, 5);
} finally {
  fs.writeFileSync(path.join(OUT, `${W}x${H}_log.json`), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 1));
  await s.close();
}
