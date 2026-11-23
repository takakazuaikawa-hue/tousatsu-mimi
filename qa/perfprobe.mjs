// 低い性能の端末のふり（CPU を N 倍遅く）で、場面ごとの描画の滑らかさを測る（11/23 対応機種を決めるため）。
// node qa/perfprobe.mjs [倍率,...]   例 1,4,6   出力：場面ごとの平均 fps・遅いコマ（50ms 超）の割合・長い処理（50ms 超）の合計
// 目安（世の中の作り手のやり方：一番低い対象の端末で遊べるかを測り、余裕を足して最低の条件にする）：
//   CPU 4倍遅く ≒ 数年前の普通のスマホ、6倍 ≒ 低価格のスマホ（Chrome の性能の道具の目安）
import { openSession, sleep } from './lib/session.mjs';
const RATES = (process.argv[2] || '1,4,6').split(',').map(Number);
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const FRAMES = `(async (ms) => { const t = []; let last = performance.now(); const end = last + ms; let lt = 0;
  const po = new PerformanceObserver(l => { for (const e of l.getEntries()) lt += e.duration; }); try { po.observe({ entryTypes: ['longtask'] }); } catch (e) { }
  await new Promise(res => { const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  po.disconnect(); const n = t.length, slow = t.filter(x => x > 50).length;
  return JSON.stringify({ fps: Math.round(n * 1000 / ms), slowPct: Math.round(slow * 100 / Math.max(1, n)), worst: Math.round(Math.max(...t)), longTaskMs: Math.round(lt) }); })`;
for (const R of RATES) {
  const { page, close } = await openSession({ width: 844, height: 390, mobile: true, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000 } });
  const q = (js) => page.eval(js, 90000).catch(e => 'ERR ' + e.message.slice(0, 100));
  try {
    await page.send('Emulation.setCPUThrottlingRate', { rate: R });
    const t0 = Date.now();
    for (let i = 0; i < 400 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(250);
    const boot = Math.round((Date.now() - t0) / 100) / 10;
    await sleep(3000);
    const res = { boot };
    res.title = JSON.parse(await q(`${FRAMES}(4000)`));
    await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(6000);
    res.home = JSON.parse(await q(`${FRAMES}(5000)`));
    await q(`(() => { startBattle('velvet'); return 1; })()`); await sleep(9000);
    await q(`(() => { const b = document.querySelector('[data-action="start-hand"]'); if (b) b.click(); return 1; })()`); await sleep(3000);
    res.battle = JSON.parse(await q(`${FRAMES}(5000)`));
    console.log(`CPU x${R}`, JSON.stringify(res));
  } catch (e) { console.log(`CPU x${R}`, 'ERR', e.message); } finally { await close(); }
}
