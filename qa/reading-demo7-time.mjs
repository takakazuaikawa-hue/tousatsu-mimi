// お手本の長さを、遊びごと（目利きは3人それぞれ）に等速で測る（2026-11-17）。node qa/reading-demo7-time.mjs [all|onedari|mekiki:grano|igi|mise|furi:polka ...]
// 測る物：RD.mount を直接呼び、お手本（初回）が流れ始めてから、4点の札（.panel.on）が出るまで。止まる所＝リコの吹き出し（.rico.on）が出た回数と、それぞれの出ていた時間。
// 等速＝速さ1・速度の細工なし。押しても進める操作はしない（自動で流れる部分の長さ）。
// ふり（手引き付きの1回）だけは、プレイヤーの操作が要るので、想定の操作を入れる：見てから 1.2秒でチップを押す／0.8秒おいてもう一度／選ぶ前に 1.2秒考える。
import { openSession, sleep } from './lib/session.mjs';
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2);
const list = (args.length && args[0] !== 'all') ? args : ['onedari', 'mekiki:grano', 'mekiki:selina', 'mekiki:velvet', 'igi', 'mise', 'furi:polka', 'furi:grano', 'furi:selina', 'furi:velvet'];
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 7, save: { introPlayed: true, houseRulesSeen: true, readIntroSeen: true, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'] } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('!!window.RD && !!RD.games.onedari && !!RD.games.furi').catch(() => false)); i++) await sleep(500);
await sleep(1500);
const out = [];
for (const item of list) {
  const [game, ck0] = item.split(':'); const ck = ck0 || (game === 'onedari' ? 'polka' : game === 'mekiki' ? 'grano' : 'polka');
  const code = `(async () => {
    const R = { T: 10, J: 11, Q: 12, K: 13, A: 14 }; const cv = (t) => ({ r: R[t[0]] || +t[0], s: t[1] }); const cvs = (str) => str.trim().split(' ').filter(Boolean).map(cv);
    const GAME = __GAME__, CK = __CK__;
    const stage = document.getElementById('stage') || document.body;
    const host = document.createElement('div'); host.className = 'read-battle-host rd-wrap'; stage.appendChild(host);
    const T = { mekiki: { board: cvs('Ac 7d 4s 9h 2d'), her: cvs('Ah Js'), mine: cvs('Kd Qc') }, igi: { board: cvs('Ks 9h 4h 2c 7d'), her: cvs('Qh 6h'), mine: cvs('Ad Jc'), toCall: 300 }, furi: { board: cvs('Ks 9d 6c 4h 2s'), her: cvs('Qh Jh'), mine: cvs('9s 8s'), toCall: 600, pot: 1200 } }[GAME] || {};
    const extra = GAME === 'onedari' ? { mode: 'demo', scene: Object.assign({}, RD.onedariEngine.DEMO) } : GAME === 'mekiki' ? { mode: 'demo' } : GAME === 'mise' ? { scene: Object.assign({}, RD.miseEngine.DEMO) } : {};
    const t0 = performance.now(); const log = []; let endT = null;
    const root = host;
    const mo = new MutationObserver(() => {
      const t = Math.round(performance.now() - t0);
      const rico = root.querySelector('.sg.demo .rico');
      const on = !!(rico && rico.classList.contains('on')); const txt = on ? (rico.querySelector('.rsay') || {}).textContent : '';
      const last = log[log.length - 1];
      if (on && (!last || last.end != null || last.txt !== txt)) { if (last && last.end == null) last.end = t; log.push({ start: t, txt }); }
      else if (!on && last && last.end == null) last.end = t;
      if (endT == null && root.querySelector('.sg.demo .panel.on')) endT = t;
    });
    mo.observe(root, { subtree: true, attributes: true, childList: true, characterData: true });
    const inst = RD.mount(host, Object.assign({ game: GAME, charKey: CK, drunk: GAME === 'onedari' || GAME === 'mise', table: T, ctx: { charKey: CK, intent: 'bluff', toCall: 300, pot: 600 }, save: {}, saveProgress() {}, volume: 0, onExit() {} }, extra));
    const sl = (ms) => new Promise(r => setTimeout(r, ms));
    const userT = [];
    if (GAME === 'furi') {
      const tap = () => { const p = root.querySelector('.sg.demo .pile'); const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); };
      const until = async (sel, ms) => { const t1 = performance.now(); while (performance.now() - t1 < ms && !root.querySelector(sel)) await sl(50); return !!root.querySelector(sel); };
      await until('.sg.demo .lane.on', 30000); await sl(1200); userT.push(['押す1', Math.round(performance.now() - t0)]); tap(); await sl(800); tap();
      await until('.sg.demo .opts.on', 30000); await sl(1200); userT.push(['選ぶ', Math.round(performance.now() - t0)]);
      const b = root.querySelector('.sg.demo .opt[data-a="払う"]'); if (b) b.click();
    }
    for (let i = 0; i < 600 && endT == null; i++) await sl(100);
    mo.disconnect(); const pg = root.querySelector(".sg.demo .pgo"); if (pg) pg.click(); await sl(600); inst.destroy(); host.remove();
    return JSON.stringify({ endT, userT, stops: log.map(l => ({ s: l.start, d: (l.end == null ? endT : l.end) - l.start, txt: l.txt })) });
  })()`.replace('__GAME__', JSON.stringify(game)).replace('__CK__', JSON.stringify(ck));
  const r = JSON.parse(await page.eval(code, 120000));
  const secs = r.endT == null ? '未到達' : (r.endT / 1000).toFixed(1);
  const note = game === 'furi' ? '（手引き付き・想定の操作の待ちを含む）' : '';
  console.log(`${item}：${note}自動で流れる部分 ${secs}秒／止まる所 ${r.stops.length}（${r.stops.map(x => (x.d / 1000).toFixed(1) + 's').join(' ')}）`);
  r.stops.forEach(x => console.log('    ' + (x.s / 1000).toFixed(1) + 's ' + (x.d / 1000).toFixed(1) + 's  ' + String(x.txt).replace(/\s+/g, ' ')));
  if (r.userT.length) console.log('    操作の時刻 ' + JSON.stringify(r.userT));
  out.push({ item, ...r });
  await sleep(500);
}
fs.writeFileSync(path.resolve('qa/out/reading/demo7_time_' + (process.env.TAG || 'run') + '.json'), JSON.stringify(out, null, 1));
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
await s.close();
