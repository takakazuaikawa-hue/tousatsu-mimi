// ホームのリコの動き（home-live.js）の時計（uT）が、描くたびに一定の幅で進んでいるかを確かめる。
// 本当の時間で 3 秒動かし、描いた時刻の間隔（ms）と uT の進みを記録する。間隔がばらつくと動きが「びくびく」して見える。
// node qa/homejit.mjs
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 1280, height: 800 });
const { page } = s;
await page.eval(`(() => { const o = WebGLRenderingContext.prototype.uniform1f; window.__uT = []; WebGLRenderingContext.prototype.uniform1f = function (l, v) { window.__uT.push([performance.now(), v]); return o.call(this, l, v); }; return 1; })()`);
await sleep(4000);
await page.eval(`(() => {
  document.querySelectorAll('.home-overlay,.collection-overlay,.settings-overlay,.episode-overlay,.login-bonus-overlay').forEach(e => e.remove());
  save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.coins = 850; save.equippedRicoOutfit = 'default'; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 };
  state = defaultState(); state.screen = 'lobby'; render(); return true;
})()`);
await sleep(6000);
await page.eval(`(window.__uT = [], 1)`);
if (process.env.VT) {
  // 動画を撮った時と同じ：時計を止め、1/30 秒ずつ進めて撮る
  let ex = null; page.on('Emulation.virtualTimeBudgetExpired', () => { if (ex) { const f = ex; ex = null; f(); } });
  await page.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  for (let k = 0; k < 40; k++) { await new Promise(res => { ex = res; page.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 1000 / 30 }); setTimeout(res, 15000); }); await page.screenshot('qa/out/homejit_tmp.png'); }
} else await sleep(3000);
const r = await page.eval(`window.__uT.slice()`);
const dt = r.slice(1).map((x, i) => +(x[0] - r[i][0]).toFixed(1));
const du = r.slice(1).map((x, i) => +((x[1] - r[i][1]) * 1000).toFixed(1));
const st = a => { const m = a.reduce((p, c) => p + c, 0) / a.length; const sd = Math.sqrt(a.reduce((p, c) => p + (c - m) ** 2, 0) / a.length); return `平均 ${m.toFixed(1)} ・ばらつき ${sd.toFixed(1)} ・最小 ${Math.min(...a)} ・最大 ${Math.max(...a)}`; };
console.log('描いた回数（3秒）', r.length);
console.log('描く間隔 ms', st(dt));
console.log('uT の進み ms', st(du));
console.log('先頭20回の間隔', dt.slice(0, 20).join(' '));
await s.close();
