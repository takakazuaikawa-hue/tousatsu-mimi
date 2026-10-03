// 放置（プレイヤーが何もしない）状態の実行負荷を、スマホ横持ち(844x390)＋CPU 4倍絞りで測る。
// node qa/perfaudit.mjs [width height] [seconds] [out]
// 出力: qa/out/perfaudit/perfaudit.json と perfaudit.md。ゲームのコードは変更しない。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';

const [W = 844, H = 390, SEC = 8, out = 'qa/out/perfaudit'] = process.argv.slice(2);
const outDir = path.resolve(REPO, out);
fs.mkdirSync(outDir, { recursive: true });

// 起動前に差し込む計測：タイマー・rAF 呼び出し数と、生きている setInterval の一覧
const COUNTERS = `(() => {
  const C = window.__PERF = { raf: 0, timeout: 0, interval: 0, live: new Map(), vis: [] };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { C.raf++; return raf(f); };
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
  window.setTimeout = function (f, ms, ...a) { C.timeout++; return st(f, ms, ...a); };
  window.setInterval = function (f, ms, ...a) { C.interval++; const id = si(f, ms, ...a); C.live.set(id, { ms: +ms || 0, src: (new Error().stack || '').split('\\n').slice(2, 4).map(s => s.trim().replace(/^at /, '').replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+\\//, '')).join(' < ') }); return id; };
  window.clearInterval = function (id) { C.live.delete(id); return ci(id); };
  document.addEventListener('visibilitychange', () => C.vis.push(document.visibilityState));
})();`;

const SNAP = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const anims = document.getAnimations();
  const running = anims.filter(a => a.playState === 'running');
  const desc = (el) => { if (!el) return '?'; let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 3).join('.'); return s; };
  const PAINT = new Set(['box-shadow', 'background-position', 'background-position-x', 'background-position-y', 'width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'color', 'background-color', 'background', 'border-color', 'outline', 'outline-color', 'text-shadow', 'clip-path', 'font-size', 'letter-spacing', 'background-size']);
  const rows = running.map(a => {
    const t = a.effect && a.effect.target;
    let props = [];
    try { props = [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).map(k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())))]; } catch (e) {}
    const r = t && t.getBoundingClientRect ? t.getBoundingClientRect() : null;
    const onscreen = r ? (r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh && r.width > 0 && r.height > 0) : false;
    const cs = t ? getComputedStyle(t) : null;
    const visible = cs ? (cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0) : false;
    const timing = a.effect.getComputedTiming();
    return { name: a.animationName || a.transitionProperty || '(web-anim)', target: desc(t), infinite: timing.iterations === Infinity, duration: timing.duration, props, paintProps: props.filter(p => PAINT.has(p)), hasFilter: props.includes('filter'), onscreen, visible, area: r ? Math.round(r.width * r.height) : 0 };
  });
  const vids = [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || v.src || '').split('/').pop(), paused: v.paused, ended: v.ended, loop: v.loop, rs: v.readyState, cls: v.className }));
  const auds = (window.__audioEls || []);
  const C = window.__PERF || {};
  return { running: rows, runningTotal: running.length, allAnimTotal: anims.length, videos: vids,
    liveIntervals: [...(C.live ? C.live.values() : [])], domNodes: document.getElementsByTagName('*').length,
    screen: (typeof state !== 'undefined' && state) ? state.screen : null, visibilityListeners: C.vis || [] };
})()`;

async function metrics(page) {
  const r = await page.send('Performance.getMetrics');
  return Object.fromEntries(r.metrics.map(m => [m.name, m.value]));
}

async function trace(page, conn, ms) {
  const events = [];
  conn.on('Tracing.dataCollected', (p) => { for (const e of p.value) events.push(e); });
  let done; const fin = new Promise(r => { done = r; });
  conn.on('Tracing.tracingComplete', () => done());
  await conn.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,viz,gpu', transferMode: 'ReportEvents' });
  await sleep(ms);
  await conn.send('Tracing.end');
  await Promise.race([fin, sleep(15000)]);
  const n = (name) => events.filter(e => e.name === name).length;
  const sum = (name) => events.filter(e => e.name === name && e.dur).reduce((a, e) => a + e.dur / 1000, 0);
  return { drawFrame: n('DrawFrame'), commit: n('Commit'), paint: n('Paint'), layerize: n('Layerize'), rasterTask: n('RasterTask'), rasterMs: Math.round(sum('RasterTask')), gpuMs: Math.round(sum('GPUTask')), paintMs: Math.round(sum('Paint')), updateLayoutTree: n('UpdateLayoutTree'), layout: n('Layout'), eventCount: events.length };
}

async function measure(name, page, browser, extra = {}) {
  const conn = browser.conn;
  await page.send('Performance.enable');
  await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(1200);
  const pre = await page.eval(SNAP);
  const c0 = await page.eval(`({ raf: __PERF.raf, timeout: __PERF.timeout, interval: __PERF.interval })`);
  const m0 = await metrics(page);
  const t0 = Date.now();
  const tr = await trace(page, conn, SEC * 1000);
  const wall = (Date.now() - t0) / 1000;
  const m1 = await metrics(page);
  const c1 = await page.eval(`({ raf: __PERF.raf, timeout: __PERF.timeout, interval: __PERF.interval })`);
  const post = await page.eval(SNAP);
  // 対照：全アニメを止めた時の素の負荷（これと差が出る分がアニメの代償）
  await page.eval(`document.getAnimations().forEach(a => a.pause())`);
  await sleep(500);
  const q0 = await metrics(page); await sleep(4000); const q1 = await metrics(page);
  const qt = q1.Timestamp - q0.Timestamp;
  const control = { busyPct: +(((q1.TaskDuration - q0.TaskDuration) / qt) * 100).toFixed(1), recalcPerSec: +(((q1.RecalcStyleCount - q0.RecalcStyleCount) / qt)).toFixed(1) };
  await page.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const d = (k) => (m1[k] || 0) - (m0[k] || 0);
  const mt = m1.Timestamp - m0.Timestamp;
  const infinite = post.running.filter(a => a.infinite);
  const result = {
    scene: name, screen: post.screen, controlAnimationsPaused: control, wallSec: +wall.toFixed(2), metricsSec: +mt.toFixed(2),
    busyPct: +(d('TaskDuration') / mt * 100).toFixed(1),
    scriptPct: +(d('ScriptDuration') / mt * 100).toFixed(1),
    layoutPct: +(d('LayoutDuration') / mt * 100).toFixed(2),
    styleRecalcPct: +(d('RecalcStyleDuration') / mt * 100).toFixed(1),
    layoutCount: d('LayoutCount'), recalcStyleCount: d('RecalcStyleCount'),
    layoutPerSec: +(d('LayoutCount') / mt).toFixed(1), recalcPerSec: +(d('RecalcStyleCount') / mt).toFixed(1),
    drawFramesPerSec: +(tr.drawFrame / SEC).toFixed(1), trace: tr,
    jsRafPerSec: +((c1.raf - c0.raf) / wall).toFixed(1), jsTimeoutPerSec: +((c1.timeout - c0.timeout) / wall).toFixed(1), jsSetIntervalCallsNew: c1.interval - c0.interval,
    runningAnimations: post.runningTotal, infiniteAnimations: infinite.length,
    infiniteOnscreen: infinite.filter(a => a.onscreen && a.visible).length,
    infiniteOffscreenOrHidden: infinite.filter(a => !(a.onscreen && a.visible)).length,
    infinitePaintHeavy: infinite.filter(a => a.paintProps.length || a.hasFilter).map(a => `${a.name} @ ${a.target} [${a.paintProps.concat(a.hasFilter ? ['filter'] : []).join(',')}] ${a.onscreen && a.visible ? 'on' : 'off'}screen area=${a.area}`),
    infiniteList: infinite.map(a => `${a.name} @ ${a.target} (${a.props.join(',')}) ${a.duration}ms ${a.onscreen && a.visible ? 'on' : 'off'}`),
    liveIntervals: post.liveIntervals, videos: post.videos, domNodes: post.domNodes, ...extra,
  };
  return result;
}

function newSession(save) {
  return openSession({ width: +W, height: +H, mobile: true, speed: 1, seed: 7, save, probes: [] });
}

const SAVE = { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500 };
const results = [];

async function scene(name, setup, save = SAVE, extra = {}) {
  const s = await newSession(save);
  try {
    // init スクリプトは openSession で既に走っているので、計測フックは新ドキュメントに差し込み直す
    await s.page.addInit(COUNTERS);
    await s.page.goto(s.url);
    await sleep(500);
    await setup(s.page);
    const r = await measure(name, s.page, s.browser, extra);
    r.errors = await s.page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 3))`);
    results.push(r);
    console.log(`${name}: busy ${r.busyPct}% script ${r.scriptPct}% style ${r.styleRecalcPct}% frames/s ${r.drawFramesPerSec} anims ${r.runningAnimations} (inf ${r.infiniteAnimations}, on ${r.infiniteOnscreen}) screen=${r.screen}`);
  } catch (e) {
    console.log(name, 'FAILED', e.message);
    results.push({ scene: name, error: String(e.message) });
  } finally { await s.close(); }
}

const waitPreload = async (page) => {
  for (let i = 0; i < 120; i++) { const g = await page.eval(`!document.getElementById('preload-overlay')`); if (g) break; await sleep(500); }
  await sleep(1500);
};
const clickStarts = async (page, n = 6) => { for (let i = 0; i < n; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); } };

await scene('title', async (page) => { await waitPreload(page); });
await scene('lobby', async (page) => { await waitPreload(page); await page.eval(`(() => { goLobby(); return true; })()`); await sleep(4000); });
await scene('battle_polka_idle', async (page) => {
  await waitPreload(page);
  await page.eval(`(async () => { startBattle('polka'); })()`);
  await sleep(2500); await clickStarts(page); await sleep(6000);
});
await scene('read_psych_idle', async (page) => {
  await waitPreload(page);
  await page.eval(`(async () => { startBattle('polka'); })()`);
  await sleep(2500); await clickStarts(page);
  await page.eval(`(() => { state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(6000);
}, SAVE, {});
await scene('read_logic_idle', async (page) => {
  await waitPreload(page);
  await page.eval(`(async () => { startBattle('selina'); })()`);
  await sleep(2500); await clickStarts(page);
  await page.eval(`(() => { state.psychPending = true; startReadBattle('logic'); return true; })()`);
  await sleep(6000);
});

// 非表示時の挙動：visibilitychange を聞いているコードの有無（静的）
const src = fs.readFileSync(path.join(REPO, 'game.js'), 'utf8') + fs.readFileSync(path.join(REPO, 'battles/core.js'), 'utf8');
const visHits = [...src.matchAll(/visibilitychange|document\.hidden|visibilityState/g)].length;

const json = { when: new Date().toISOString(), viewport: `${W}x${H} mobile`, cpuThrottle: 4, seconds: +SEC, visibilityCodeHits: visHits, results };
fs.writeFileSync(path.join(outDir, 'perfaudit.json'), JSON.stringify(json, null, 1));

const md = [];
md.push(`# 放置時の実行負荷 (${W}x${H} モバイル, CPU x4, ${SEC}秒/シーン)`, '', `visibilitychange 等を見るコード: ${visHits} 箇所（音声の再開のみ。描画・動画・タイマーは非表示で止めない）`, '',
  '| シーン | 忙しさ% | アニメ停止時% | JS% | スタイル再計算% | 描画フレーム/秒 | 実行中アニメ | うち無限 | 無限(画面内) | 無限(画面外/不可視) | JS rAF/秒 |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  if (r.error) { md.push(`| ${r.scene} | 失敗: ${r.error} |`); continue; }
  md.push(`| ${r.scene} | ${r.busyPct} | ${r.controlAnimationsPaused.busyPct} | ${r.scriptPct} | ${r.styleRecalcPct} | ${r.drawFramesPerSec} | ${r.runningAnimations} | ${r.infiniteAnimations} | ${r.infiniteOnscreen} | ${r.infiniteOffscreenOrHidden} | ${r.jsRafPerSec} |`);
}
for (const r of results) {
  if (r.error) continue;
  md.push('', `## ${r.scene} (screen=${r.screen})`, `- レイアウト ${r.layoutPerSec}/秒, スタイル再計算 ${r.recalcPerSec}/秒, ラスタ ${r.trace.rasterMs}ms, GPU ${r.trace.gpuMs}ms, Paint ${r.trace.paint}回`);
  md.push(`- 生きている setInterval: ${r.liveIntervals.map(i => i.ms + 'ms ' + i.src).join(' | ') || 'なし'}`);
  md.push(`- 動画: ${r.videos.map(v => `${v.src}${v.paused ? '(停止)' : '(再生中)'}`).join(', ') || 'なし'}`);
  md.push('- 無限アニメで描画系プロパティ/filter を動かすもの:'); (r.infinitePaintHeavy.length ? r.infinitePaintHeavy : ['なし']).forEach(x => md.push('  - ' + x));
  md.push('- 無限アニメ全件:'); r.infiniteList.forEach(x => md.push('  - ' + x));
}
fs.writeFileSync(path.join(outDir, 'perfaudit.md'), md.join('\n'));
console.log('saved', outDir);
