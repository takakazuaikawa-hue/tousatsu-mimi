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
    const extra = GAME === 'onedari' ? { mode: 'pick', scene: Object.assign({}, RD.onedariEngine.DEMO, { bet: 266, pot: 400 }) } : GAME === 'mise' ? { scene: Object.assign({}, RD.miseEngine.DEMO) } : {};
    const seen = { rdDemo: { mekiki: true, igi: true, furi: true, onedari: true, mise: true }, rdRule: { 'mekiki:grano': true, 'mekiki:selina': true, 'mekiki:velvet': true, 'furi:polka': true, 'furi:grano': true, 'furi:selina': true, 'furi:velvet': true }, rdCount: { mekiki: 5, igi: 5, furi: 5, onedari: 5, mise: 5 } };
    const t0 = performance.now(); const root = host;
    const inst = RD.mount(host, Object.assign({ game: GAME, charKey: CK, drunk: GAME === 'onedari' || GAME === 'mise', table: T, ctx: { charKey: CK, intent: 'bluff', toCall: 300, pot: 600 }, save: seen, saveProgress() {}, volume: 0, onExit() {} }, extra));
    const sl = (ms) => new Promise(r => setTimeout(r, ms));
    const ready = () => { const e = root.querySelector('.sg:not(.demo) .opts.on, .sg:not(.demo) .modes.on'); if (!e) return false; const bs = [...e.querySelectorAll('button')]; return bs.length > 0 && bs.some(x => !x.disabled) && getComputedStyle(e).pointerEvents !== 'none'; };
    let endT = null;
    for (let i = 0; i < 600 && endT == null; i++) { if (ready()) endT = Math.round(performance.now() - t0); else await sl(50); }
    const txt = "";
    try { inst.destroy(); } catch (e) {} host.remove();
    return JSON.stringify({ endT, txt });
  })()`.replace('__GAME__', JSON.stringify(game)).replace('__CK__', JSON.stringify(ck));
  const r = JSON.parse(await page.eval(code, 120000));
  console.log(`${item}：選べるようになるまで ${r.endT == null ? '未到達' : (r.endT / 1000).toFixed(1) + '秒'}　｜ ${r.txt}`);
  out.push({ item, ...r });
  await sleep(500);
}
fs.writeFileSync(path.resolve('qa/out/reading/demo7_time_' + (process.env.TAG || 'run') + '.json'), JSON.stringify(out, null, 1));
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
await s.close();
