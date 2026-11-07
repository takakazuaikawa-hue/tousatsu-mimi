// 2回目の外部の批評の直しを確かめる：講義の入口・一枚絵の窓の大きさ・コレクションの裏のホームの描き直し。node qa/round2.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/round2'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000 } });
const { page } = s;
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
const log = {};
// 描き直しの回数を数える（WebGL の描く命令）
await page.eval(`(() => { window.__draws = 0; for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype].filter(Boolean)) { for (const k of ['drawArrays', 'drawElements']) { const o = P[k]; P[k] = function () { window.__draws++; const c = this.canvas; const key = (c.className || c.id || 'canvas') + (c.isConnected ? '' : '(外れ)'); (window.__byCanvas = window.__byCanvas || {})[key] = ((window.__byCanvas || {})[key] || 0) + 1; return o.apply(this, arguments); }; } } return true; })()`);
// 1 ホーム → コレクションを開いて5秒
await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`); await sleep(3000);
const d0 = await page.eval('window.__draws'); await sleep(5000); const d1 = await page.eval('window.__draws');
log.homeDraws5s = d1 - d0;
await page.eval(`(() => { onAction({ currentTarget: { dataset: { action: 'open-collection' } } }); return true; })()`); await sleep(2500);
const d2 = await page.eval('window.__draws'); await sleep(5000); const d3 = await page.eval('window.__draws');
log.coveredDraws5s = d3 - d2;
log.byCanvas = await page.eval('JSON.stringify(window.__byCanvas || {})');
log.overlays = await page.eval(`JSON.stringify([...document.querySelectorAll('[class*="overlay"]')].map(e => e.className.slice(0, 40)))`);
log.homeLiveSrc = await page.eval(`fetch('home-live.js', { cache: 'no-store' }).then(r => r.text()).then(t => t.includes('COVER_SEL'))`);
log.homeLive = await page.eval(`JSON.stringify({ paused: window.HomeLive && window.HomeLive.isPaused(), canvases: [...document.querySelectorAll('canvas')].map(c => (c.className || c.id || '?') + ' ' + c.width + 'x' + c.height) })`);
// 2 一枚絵の窓
await page.eval(`(() => { showRewardCgViewer('polka'); return true; })()`); await sleep(2000); await shot('cg');
log.cg = await page.eval(`(() => { const i = document.querySelector('.reward-cg-viewer-overlay img, .reward-cg-viewer-overlay canvas'); if (!i) return 'none'; const r = i.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) + ' / 画面 ' + innerWidth + 'x' + innerHeight; })()`);
await page.eval(`(() => { document.querySelectorAll('.reward-cg-viewer-overlay, .collection-overlay').forEach(e => e.remove()); return true; })()`);
// 3 講義の入口
await page.eval(`(() => { startLecture('rico_tutorial'); return true; })()`); await sleep(2500); await shot('lecture');
log.lecture = await page.eval(`!!document.querySelector('.lecture-bubble')`);
log.errors = s.exceptions.map(e => (e.desc || e.text).slice(0, 140));
console.log(JSON.stringify(log, null, 1));
await s.close(); process.exit(0);
