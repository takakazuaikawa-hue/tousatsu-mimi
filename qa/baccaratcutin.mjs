// ウンメのカットインを場面ごとに撮る。node qa/baccaratcutin.mjs [phone|small|pc]。出力 qa/out/baccarat/cutin_<種類>/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';
const kind = process.argv[2] || 'phone';
const [W, H] = kind === 'pc' ? [1280, 800] : kind === 'small' ? [667, 375] : [844, 390];
const OUT = path.join(REPO, 'qa', 'out', 'baccarat', 'cutin_' + kind); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: W, height: H, mobile: kind !== 'pc', speed: 1 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
const val = (js) => page.eval(js).catch(() => null);
for (let i = 0; i < 60 && !(await val('typeof startBattle === "function" && !!window.BaccaratUI')); i++) await sleep(500);
await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.readIntroSeen = true; save.coins = 2400; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; save.baccarat = { demoSeen: true, godSeen: true, orSeen: true, betraySeen: true, qn: 0, sqMode: 'auto' }; saveProgress()`);
await ev(`state = defaultState(); state.screen = 'lobby'; render()`); await sleep(4500);
await ev('BaccaratUI.open()'); await sleep(1500);
if (await val('BaccaratUI._qa.picking()')) { await ev(`BaccaratUI._qa.pick('ocho')`); await sleep(800); }
const Q = 'BaccaratUI._qa';
const shots = [
  ['oracle', `${Q}.cutin('oracle', '神託', '次はバンカーが勝つ', '女神の予言！　次はバンカー！これはほんとのやつでーす！', 'doya', 9000)`],
  ['jackpot', `${Q}.cutin('jackpot', '大当たり', '＋800', '運命もびっくりでーす！', 'odoroki', 9000)`],
  ['betray', `${Q}.cutin('betray', '約束やぶり', 'あーっ、裏切ったー！', '……なのに当ててる。ずるーい！', 'muku', 9000)`],
  ['climax', `${Q}.cutin('climax', '運命の分岐点', '4か5なら勝ち！', '4か5、来い来い来いっ！', 'inori', 9000)`],
  ['hit', `${Q}.cutin('hit', '神託どおり', '＋500', 'ほらね？ ウンメちゃんの言ったとおりでーす！', 'doya', 9000)`],
];
// 場面ごとの専用の絵を全部撮る（出るたびに1枚選ばれるので、絵を差し替えて1枚ずつ）
const ART_OF = { oracle: [1], jackpot: [1, 2, 3], betray: [1, 2, 3], climax: [1, 2, 3], hit: [2, 3] };
for (const [n, js] of shots) {
  await ev(js); await sleep(900);
  const r = await val(`(() => { const t = document.querySelector('.bc-ci-t'), m = document.querySelector('.bc-ci-m'); const a = t.getBoundingClientRect(), b = m.getBoundingClientRect(); return JSON.stringify({ mainFont: parseFloat(getComputedStyle(m).fontSize).toFixed(1), mainLines: Math.round(b.height / parseFloat(getComputedStyle(m).lineHeight)), overflowX: b.right > innerWidth + 1 || b.left < -1 }); })()`);
  console.log(kind, n, r);
  for (const k of ART_OF[n]) {
    const src = `assets/characters/umme_ci_${n === 'hit' ? 'jackpot' : n}_${k}.webp`;
    const ok = await val(`(async () => { const im = document.querySelector('.bc-ci-pic'); if (!im) return 'no-img'; im.src = ${JSON.stringify(src)}; try { await im.decode(); } catch (e) { return 'decode-fail'; } return document.querySelector('.bc-cutin').classList.contains('has-ci') ? 'ok' : 'no-has-ci'; })()`);
    console.log('  ', src, ok);
    await sleep(200); await page.screenshot(path.join(OUT, `${n}_${k}.png`));
  }
}
const errs = [...(await val('window.__QA.errors') || []), ...session.exceptions];
console.log('errors', JSON.stringify(errs).slice(0, 600));
await session.close(); process.exit(0);
