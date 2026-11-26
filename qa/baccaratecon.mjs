// 女神バカラの稼ぎの試算：本物の画面を早送りで自動に遊ばせ、1手あたりの増減と神託の回数を数える。
// node qa/baccaratecon.mjs [skilled|normal] [手数=600] [seed=1]
//   skilled＝上手な人：女神の気分に合う返事・約束は最小の賭け（10）で守る・他は見（ケン）・神託には上限まで張る
//   normal ＝普通の人：毎手 50 を賭ける・返事は気まぐれ・約束は守れる時だけ・神託には 100
// 時間：QA_TIME=1 で等倍（絞り＝自動）にして、1手の秒数も測る（手数は少なめに）
import { openSession, sleep } from './lib/session.mjs';
const strat = process.argv[2] || 'skilled';
const N = +(process.argv[3] || 600);
const seed = +(process.argv[4] || 1);
const timing = !!process.env.QA_TIME;
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: 844, height: 390, mobile: true, speed: timing ? 1 : 25, seed });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', e.message.slice(0, 300)));
const val = (js) => page.eval(js).catch(() => null);
for (let i = 0; i < 80 && !(await val('typeof startBattle === "function" && !!window.BaccaratUI')); i++) await sleep(500);
await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.readIntroSeen = true; save.coins = 100000; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; save.bgmOn = false; save.sfxOn = false; save.baccarat = { demoSeen: true, godSeen: true, orSeen: true, betraySeen: true, keepSeen: true, qn: 0, sqMode: ${timing ? "'auto'" : "'off'"} }; saveProgress()`);
await ev(`state = defaultState(); state.screen = 'lobby'; render()`); await sleep(timing ? 3000 : 600);
await ev('BaccaratUI.open()'); await sleep(timing ? 1500 : 300);
// つまみ：環境変数 TUNE='{"lookQuiet":3,"cool":10}' のように渡す
if (process.env.TUNE) await ev(`Object.assign(BaccaratUI._qa.tune, ${process.env.TUNE})`);

// ---- 画面の中で動く自動の遊び手 ----
await ev(`
window.__bot = { strat: ${JSON.stringify(strat)}, hands: 0, staked: 0, net: 0, oracle: { win: 0, notwin: 0, tie: 0, small: 0 }, oracleNet: 0, kept: 0, broken: 0, asked: 0, liked: 0, log: [], t0: performance.now(), times: [] };
(function () {
  const Q = BaccaratUI._qa, B = window.__bot, other = (w) => (w === 'P' ? 'B' : 'P');
  const LIKE = { bored: 'bold', happy: 'ride', uneasy: 'careful' };
  let lastKey = -1, tHand = performance.now(), pend = null;
  const rnd = Math.random;
  function answer(S) {
    const q = S.q; if (!q) return;
    B.asked++;
    let i;
    if (q.talk) i = B.strat === 'skilled' ? q.talk.o.findIndex(o => o[1]) : Math.floor(rnd() * q.talk.o.length);
    else if (B.strat === 'skilled') { const want = q.wish ? 'wish' : LIKE[q.mood]; i = q.opts.findIndex(o => o.kind === want); if (i < 0) i = q.opts.findIndex(o => o.kind === 'none'); }
    else i = Math.floor(rnd() * q.opts.length);
    if (!q.talk && q.opts[i] && (q.opts[i].kind === 'wish' || q.opts[i].kind === LIKE[q.mood])) B.liked++;
    Q.answer(i);
  }
  function plan(S) {
    const bets = {}, o = S.oracle, sk = B.strat === 'skilled';
    const MAX = sk ? 500 : 100, TMAX = sk ? 100 : 50;
    if (o && o.big) { if (o.kind === 'win') bets[o.w] = MAX; else if (o.kind === 'notwin') bets[other(o.w)] = MAX; else if (o.kind === 'tie') bets.T = TMAX; }
    if (!sk && !(o && o.big)) bets[rnd() < .55 ? 'B' : 'P'] = 50;
    const armed = S.pledges.filter(p => p.armed);
    let mustLook = false;
    const keepRate = sk ? 1 : .7;
    for (const p of armed) {
      if (rnd() > keepRate) continue;
      if (p.type === 'side') {
        if (p.promise === 'look') { if (!(o && o.big) && sk) mustLook = true; }
        else if (p.promise === 'pair') { if (!bets.PP && !bets.BP) bets.PP = 10; }
        else if (p.promise === 'nopair') { delete bets.PP; delete bets.BP; }
        else if (p.promise === 'noT') { if (!(o && o.kind === 'tie')) delete bets.T; }
        else if (!bets[p.promise]) bets[p.promise] = 10;
      }
    }
    if (mustLook) return {};
    // 上手な人は、見が続いて女神が黙らないよう、黙る手前で最小の 10 をバンカーに置く
    if (sk && !Object.keys(bets).length && S.looks + 1 >= Q.tune.lookQuiet) bets.B = 10;
    const stakeOf = (b) => Object.values(b).reduce((a, x) => a + x, 0);
    for (const p of armed) {
      if (p.type !== 'stake' || !p.base) continue;
      const s = stakeOf(bets);
      if (p.promise === 'up' && s <= p.base) bets.B = (bets.B || 0) + (p.base - s + 10);
      else if (p.promise === 'same' && s !== p.base && !(o && o.big)) { if (s < p.base) bets.B = (bets.B || 0) + (p.base - s); }
      else if (p.promise === 'down' && s >= p.base && !(o && o.big) && sk) return {};
    }
    return bets;
  }
  function place(bets) {
    const S = Q.S();
    for (const k of ['P', 'B', 'T', 'PP', 'BP']) {
      let a = bets[k] || 0;
      for (const c of [500, 100, 50, 10]) while (a >= c) { S.chip = c; Q.bet(k, 1); a -= c; }
    }
    S.chip = 10;
  }
  setInterval(() => {
    try {
      if (Q.picking()) { Q.pick(document.querySelector('.bc-sw') ? '@stay' : 'ocho'); return; }
      const S = Q.S(); if (!S || !S.shoe) return;
      const ph = Q.host().dataset.phase;
      if (pend && ph === 'settle') {
        const net = save.coins - pend.coins; B.net += net; B.hands++; if (pend.stake) B.staked++;
        if (pend.big) B.oracleNet += net;
        const now = performance.now(); B.times.push([now - tHand, pend.stake ? 1 : 0, pend.q ? 1 : 0]); tHand = now;
        if (B.log.length < 4000) B.log.push(net);
        pend = null;
      }
      if (ph !== 'bet' || S.q === undefined) return;
      const key = S.A.hands;
      if (key === lastKey) return;
      lastKey = key;
      const hadQ = !!S.q;
      if (S.q) answer(S);
      const o = S.oracle;
      if (o) { if (o.big) B.oracle[o.kind]++; else B.oracle.small++; }
      const bets = plan(S);
      const coins0 = save.coins;
      place(bets);
      const stake = ['P', 'B', 'T', 'PP', 'BP'].reduce((a, k) => a + (S.bets[k] || 0), 0);
      pend = { coins: coins0, stake, big: !!(o && o.big), q: hadQ };
      if (stake) Q.deal(); else Q.look();
    } catch (e) { (B.err = B.err || []).push(String(e && e.stack || e).slice(0, 300)); }
  }, 40);
})();
`);
let last = 0, lastT = Date.now(), shown = 0;
while (true) {
  await sleep(timing ? 3000 : 2000);
  const b = JSON.parse(await val('JSON.stringify({ hands: __bot.hands, net: __bot.net, err: __bot.err })') || '{}');
  if (b.err) { console.log('bot error', b.err.slice(0, 3)); break; }
  if (b.hands >= N) break;
  if (b.hands !== last) { last = b.hands; lastT = Date.now(); }
  else if (Date.now() - lastT > 60000) { console.log('止まった', b.hands); break; }
  if (b.hands - shown >= (timing ? 10 : 100)) { shown = b.hands; process.stdout.write(`… ${b.hands}手 ${b.net}\n`); }
}
const B = JSON.parse(await val('JSON.stringify(__bot)'));
const A = JSON.parse(await val('JSON.stringify(BaccaratUI._qa.S().A)'));
const per = B.net / B.hands;
const out = { strat, seed, tune: process.env.TUNE || '-', hands: B.hands, staked: B.staked, net: B.net, perHand: +per.toFixed(2), oracle: B.oracle, oracleNet: B.oracleNet, asked: B.asked, liked: B.liked, kept: A.kept, broken: A.broken };
// 1時間あたり：等倍で測った秒数（見 5.9 秒・賭けた手 27 秒〈絞り＝自動〉）に、人が考える時間（見 2.5 秒・賭け 4 秒・問いへの返事 4 秒）を足す。絞り「なし」は賭けた手を 11 秒とみる
{
  const look = B.hands - B.staked, secAuto = look * 8.4 + B.staked * 31 + B.asked * 4, secOff = look * 8.4 + B.staked * 11 + B.asked * 4;
  out.perHour = { auto: Math.round(B.net / secAuto * 3600), off: Math.round(B.net / secOff * 3600) };
}
if (timing) {
  const ts = B.times.slice(1), avg = (f) => { const a = ts.filter(f); return a.length ? +(a.reduce((s, x) => s + x[0], 0) / a.length / 1000).toFixed(1) : null; };
  out.sec = { all: avg(() => true), look: avg(x => !x[1]), staked: avg(x => x[1]), n: ts.length };
}
console.log(JSON.stringify(out));
const errs = [...(await val('window.__QA.errors') || []), ...session.exceptions];
if (errs.length) console.log('errors', JSON.stringify(errs).slice(0, 800));
await session.close();
process.exit(0);
