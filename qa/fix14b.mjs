// 14回目の直しの続き：卒業試験の縮め直し・零時の卓の中断・ファイブポーカーの配当の内訳・コレクション。
// 場面ごとに新しく開き直す（前の場面の名残で見張りの窓が出ないように）。検査ブラウザは1つずつ。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/fix14b.mjs [667x375] [grad,allstar,five]   出力 qa/out/fix14/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '667x375').split('x').map(Number);
const parts = (process.argv[3] || 'grad,allstar,five').split(',');
const OUT = path.resolve('qa/out/fix14'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const log = {};
const C = (x) => x.split(' ').map(v => ({ rank: { A: 14, K: 13, Q: 12, J: 11 }[v.slice(0, -1)] || +v.slice(0, -1), suit: v.slice(-1) }));
const SAVE_ALL = `save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 3000; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { rico_tutorial:'A', polka:'A', selina:'B', grano:'A', velvet:'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; saveProgress()`;
async function open(o = {}) {
  const s = await openSession({ width: o.w || W, height: o.h || H, mobile: (o.w || W) < 900, speed: 1, seed: o.seed || 7, save: { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, gradCount: 1 } });
  const { page } = s;
  const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 200)));
  const val = (js) => page.eval(js).catch(() => null);
  const until = async (js, ms = 20000, step = 150) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
  const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
  const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.trim().includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
  for (let i = 0; i < 60 && !(await val('typeof startBattle === "function"')); i++) await sleep(500);
  await sleep(1500);
  return { s, page, ev, val, until, shot, click };
}

if (parts.includes('grad')) {
  const { s, page, ev, val, shot, click } = await open({ w: 1280, h: 800 });
  try {
    await ev(`window.__ricoSeriousMode = true; startBattle('rico_tutorial')`); await sleep(2500);
    for (let i = 0; i < 6; i++) { await click('最初から') || await click('対戦開始') || await click('開始'); await sleep(800); }
    log.serious = await val('state.seriousRicoMode');
    await ev(`const o = { board: ${JSON.stringify(C('5♥ 6♥ 9♣ K♥ 2♦'))}, mine: ${JSON.stringify(C('A♣ 9♦'))}, her: ${JSON.stringify(C('K♦ Q♠'))} }; state.playerHand = o.mine; state.community = o.board; state.opponentHand = o.her; state.handPhase = 'river'; state.pot = 300; state.currentBetOpponent = 200; state.currentBetPlayer = 0; state.pendingRead = null; state.readHandNo = -1; state.psychPending = true; startReadBattle('psych')`);
    await sleep(3500);
    await click('わかった'); await sleep(1500);
    await shot('5a_graduation_pc');
    await page.setViewport(W, H, true); await sleep(2500);
    await shot('5b_graduation_shrunk');
    log.gradLessons = await val(`[...document.querySelectorAll('.gd-lesson')].map(e => { const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return Math.round(r.top) + '-' + Math.round(r.bottom) + (e.contains(h) ? '押せる' : '押せない'); }).join(' ') + ' ／ 画面の高さ ' + innerHeight`);
    log.gradEx = s.exceptions.slice(0, 3);
  } finally { await s.close(); }
}

if (parts.includes('allstar')) {
  const { s, ev, val, until, shot } = await open({ seed: 11 });
  const Q = 'AllstarUI._qa';
  try {
    await ev(SAVE_ALL);
    await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
    await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(2500);
    await ev(`onAction({ currentTarget: { dataset: { action: 'allstar-open' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(1200);
    log.entry = await val(`!!document.querySelector('.as-entry [data-action="allstar-seat"]')`);
    await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
    let done = false;
    for (let i = 0; i < 15 && !done; i++) {
      if (!await until(`(() => { const b = [...document.querySelectorAll('.as-host button')].find(b => b.textContent.trim() === 'わかった'); if (b) b.click(); return ${Q}.waiting(); })()`, 90000)) { log['allstarWait' + i] = 'ミミの手番が来ない'; await shot('6x_allstar_stuck'); break; }
      await ev(`${Q}.actMimi('fold')`); await sleep(60);
      const hand0 = await val(`${Q}.T().handNo`); await ev(`document.querySelector('[data-as="menu"]').click()`); await sleep(15000); log.handDuringMenu = hand0 + ' → ' + await val(`${Q}.T().handNo + (${Q}.T().hand && ${Q}.T().hand.done ? '（ハンド終わり）' : '（途中）')`);
      const both = await val(`!!document.querySelector('.as-menu') + ',' + !!document.querySelector('.as-review')`);
      log['allstar' + i] = both;
      if (both === 'true,false') {
        await shot('6a_allstar_menu');
        await ev(`document.querySelector('.as-menu [data-as="menu-close"]').click()`); await sleep(700);
        log.afterContinue = await val(`'答え合わせ ' + !!document.querySelector('.as-review') + ' ／ 同じ判断の印 ' + !!document.querySelector('.as-review-ok')`);
        await shot('6b_allstar_continue');
        done = true;
      } else {
        await ev(`document.querySelector('.as-menu [data-as="menu-close"]')?.click()`); await sleep(300);
        await ev(`document.querySelector('[data-as="review-next"]')?.click()`);
      }
    }
    log.allstarEx = s.exceptions.slice(0, 3);
  } finally { await s.close(); }
}

if (parts.includes('five')) {
  const { s, ev, val, until, shot, click } = await open({ seed: 3 });
  try {
    await ev(SAVE_ALL);
    await ev(`save.ownedItems = ['memory_minipoker', 'memory_ending', 'memory_ending_theme', 'gallery_rico', 'omake_credit']; saveProgress(); state = defaultState(); state.screen = 'lobby'; render()`);
    await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(2500);
    await ev(`showCollectionModal()`); await sleep(1500);
    await shot('7a_collection');
    log.collNav = await val(`[...document.querySelectorAll('.coll-jump button')].map(b => b.textContent).join(' ')`);
    await ev(`document.querySelector('.collection-overlay [data-action="play-minipoker"]').click()`); await sleep(1800);
    await click('はじめる'); await sleep(600);
    await shot('7b_five_wager');
    for (let i = 0; i < 30 && !log.fiveResult; i++) {
      // 開き直すたびに今日の初戦（×2）から始める
      if (i > 0) { await ev(`document.querySelector('.minipoker-overlay')?.remove(); save.minipoker.dailyBonusDate = ''`); await sleep(400); await ev(`showMiniPokerGame()`); await sleep(1500); }
      await ev(`document.querySelector('[data-mp="deal"]')?.click()`); await sleep(2400);
      await ev(`document.querySelector('[data-mp="hold-all"]')?.click()`); await sleep(3600);
      for (let k = 0; k < 10 && await val(`!!document.querySelector('.mp-garapon-slot')`); k++) { await ev(`document.querySelector('.mp-garapon-slot').click()`); await sleep(1500); }
      const r = await val(`(document.querySelector('.mp-result-banner') || {}).innerText || ''`);
      if (/勝利！/.test(r)) {
        log.fiveResult = r.split('\n').join(' / ');
        log.fiveCalc = await val(`(() => { const e = document.querySelector('.mp-result-calc'); if (!e) return 'なし'; const r = e.getBoundingClientRect(); return getComputedStyle(e).display + ' ' + Math.round(r.width) + 'px ' + e.textContent; })()`);
        await shot('7c_five_win');
      }
      log.fiveHands = i + 1;
    }
    // コレクションの上で開き直して1戦し、閉じた時にコレクションの所持金が変わるか
    await ev(`document.querySelector('.minipoker-overlay')?.remove()`); await sleep(400);
    await ev(`showCollectionModal()`); await sleep(1200);
    const coinsBefore = await val(`document.querySelector('.collection-coins').textContent`);
    await ev(`document.querySelector('.collection-overlay [data-action="play-minipoker"]').click()`); await sleep(1800);
    await ev(`document.querySelector('[data-mp="deal"]')?.click()`); await sleep(2400);
    await ev(`document.querySelector('[data-mp="hold-all"]')?.click()`); await sleep(3600);
    await ev(`document.querySelector('.minipoker-close')?.click()`); await sleep(1000);
    await ev(`document.querySelector('[data-mp-sum="quit"]')?.click()`); await sleep(1800);
    log.collCoins = coinsBefore + ' → ' + await val(`document.querySelector('.collection-coins').textContent + '（本当の残高 ' + save.coins + '）'`);
    await ev(`[...document.querySelectorAll('.collection-overlay .coll-jump button')].find(b => b.textContent === '会話')?.click()`); await sleep(1200);
    await shot('8a_collection_talk');
    await ev(`document.querySelector('.collection-overlay [data-action="recall-episode"]').click()`); await sleep(2500);
    await shot('8b_recall');
    log.fiveEx = s.exceptions.slice(0, 3);
  } finally { await s.close(); }
}
fs.writeFileSync(path.join(OUT, `${W}x${H}_logb.json`), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 1));
