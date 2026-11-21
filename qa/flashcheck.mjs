// 画面切り替えで「前の画面・別の画面が一瞬見える」所を探す検査。
// 使い方: QA_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe' QA_NO_SANDBOX=1 node qa/flashcheck.mjs <流れ名|all> [pc|phone|both]
// 見張り：毎フレーム、画面の3点（中央・左上・右下）で「見えている層」を取り、変わった時を記録する。
//   層 ＝ body または #stage の直下の要素（#app は state.screen の名前に置き換える）。実効の不透明度 0.6 未満の層は「見えていない」とみなして下の層を見る。
// 判定：A→B→C と変わり、B が 450ms 未満で、B が土台の画面か全面を覆う層なら「一瞬見えた」。
// 写真：Page.startScreencast の直近 6 秒を持っておき、見つけたら前・中・後の枠を qa/out/flash/ に書く。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const FLOW = process.argv[2] || 'all';
const SIZES = (process.argv[3] || 'both') === 'both' ? ['pc', 'phone'] : [process.argv[3]];
const OUT = path.resolve('qa/out/flash');
fs.mkdirSync(OUT, { recursive: true });
const MIN_MS = 450;

const WATCH = `(() => {
  if (window.__FW) return;
  const FW = window.__FW = { ev: [], last: null, on: true };
  const effOp = (el) => { let o = 1; for (let x = el; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; } return o; };
  const layerOf = (el) => { let x = el; while (x && x.parentElement && x.parentElement !== document.body && x.parentElement.id !== 'stage') x = x.parentElement; return x; };
  const nm = (L) => { if (!L) return '?'; if (L.id === 'app') { const f = L.firstElementChild; return 'app:' + (typeof state !== 'undefined' ? state.screen : '?') + '/' + (f ? (String(f.className).split(' ')[0] || f.tagName.toLowerCase()) : '空'); } if (L.id === 'stage') return 'stage'; return (typeof L.className === 'string' && L.className.trim().split(/\\s+/)[0]) || ('<' + L.tagName.toLowerCase() + (L.id ? '#' + L.id : '') + '>'); };
  const probe = (fx, fy) => {
    const x = Math.round(innerWidth * fx), y = Math.round(innerHeight * fy);
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === document.documentElement || el === document.body) continue;
      const L = layerOf(el); if (!L || L === document.body) continue;
      if (/^(SCRIPT|STYLE|AUDIO|VIDEO|LINK|NOSCRIPT)$/.test(L.tagName) && L.tagName !== 'VIDEO') continue;
      const eo = effOp(L); if (eo < 0.6) continue;
      if (L.id === 'stage') continue;
      if (L.classList && L.classList.contains('coach-layer')) continue;   // 研修の吹き出しと暗幕は、卓の上の説明なので画面の入れ替わりに数えない
      const r = L.getBoundingClientRect(); const cover = Math.min(1, (Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))) / (innerWidth * innerHeight));
      const cs = getComputedStyle(L);
      return { n: nm(L), eo: +eo.toFixed(2), cover: +cover.toFixed(2), bg: (cs.backgroundImage !== 'none' || (() => { const m = cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/); if (!m) return false; const p = m[1].split(',').map(Number); return p.length < 4 || p[3] >= 0.5; })()) ? 1 : 0, base: L.id === 'app' ? 1 : 0 };
    }
    return { n: 'app:' + (typeof state !== 'undefined' ? state.screen : '?') + '/空', eo: 1, cover: 1, bg: 0, base: 1 };
  };
  const tick = () => {
    try {
      const c = probe(.5, .5), a = probe(.08, .12), b = probe(.92, .88);
      const key = c.n + '|' + a.n + '|' + b.n;
      if (key !== FW.last) {
        FW.last = key;
        FW.ev.push({ t: performance.timeOrigin + performance.now(), c, a: a.n, b: b.n, screen: (typeof state !== 'undefined' ? state.screen : null) });
      }
    } catch (e) {}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

// 見えた物の並びを分析（中央の層が主。隅が違う時は補足に出す）
function analyze(ev, endT) {
  const segs = [];
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i], nxt = ev[i + 1];
    const end = nxt ? nxt.t : endT;
    segs.push({ name: e.c.n, a: e.a, b: e.b, start: e.t, end, dur: end - e.t, cover: e.c.cover, base: e.c.base, screen: e.screen, eo: e.c.eo });
  }
  // 中央が同じで隅だけ変わった区間をまとめる
  const m = [];
  for (const s of segs) { const l = m[m.length - 1]; if (l && l.name === s.name) { l.end = s.end; l.dur = l.end - l.start; l.cover = Math.max(l.cover, s.cover); l.corners = (l.corners || new Set()).add(s.a + '/' + s.b); } else { s.corners = new Set([s.a + '/' + s.b]); m.push({ ...s }); } }
  return m;
}
function flashes(m, tag) {
  const out = [];
  for (let i = 1; i < m.length - 1; i++) {
    const B = m[i];
    const isBase = B.base === 1 || B.cover >= 0.7;
    if (!isBase) continue;
    const long = B.dur >= MIN_MS;
    if (long && !(B.dur < 2500 && B.base === 1 && m[i - 1].name !== m[i + 1].name)) continue;
    out.push({ long, tag, A: m[i - 1].name, B: B.name, C: m[i + 1].name, dur: Math.round(B.dur), start: B.start, end: B.end, cover: B.cover, eo: B.eo, base: B.base, screen: B.screen, corners: [...(B.corners || [])].join(' ; ') });
  }
  return out;
}

export async function runFlow(name, size, fn) {
  const phone = size === 'phone';
  const W = phone ? 844 : 1280, H = phone ? 390 : 800;
  const dir = path.join(OUT, `${name}_${size}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = { name, size, phone, W, H, dir, notes: [], failed: [] };
  const s = await openSession({ width: W, height: H, mobile: phone, speed: 1, ...(ctx.sessionOpts || {}) , ...(fn.sessionOpts ? fn.sessionOpts(phone) : {}) });
  const { page } = s;
  ctx.s = s; ctx.page = page;
  await page.addInit(WATCH).catch(() => {});
  await page.eval(WATCH);   // すでに読み込み済みなので今のページにも入れる
  // 画面の録画（直近 6 秒だけ持つ）
  const ring = [];
  page.on('Page.screencastFrame', (p) => {
    ring.push({ t: p.metadata.timestamp * 1000, data: p.data });
    while (ring.length && ring[0].t < Date.now() - 8000) ring.shift();
    page.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
  });
  await page.send('Page.startScreencast', { format: 'jpeg', quality: 55, maxWidth: W, maxHeight: H, everyNthFrame: 1 }).catch(e => ctx.notes.push('screencast: ' + e.message));
  const all = []; const found = []; const pendingShots = []; let nShot = 0;
  const flush = async () => {
    const ev = await page.eval('window.__FW ? window.__FW.ev.splice(0) : []').catch(() => []);
    all.push(...ev);
    return ev.length;
  };
  const seen = new Set();
  const scan = async () => {
    await flush();
    const m = analyze(all, Date.now() + 0);
    const fl = flashes(m, name);   // 最後の区間は後ろが無いので対象にならない
    for (const f of fl) {
      const key = f.start.toFixed(0);
      if (seen.has(key)) continue; seen.add(key);
      f.id = ++nShot; f.size = size; f.flow = name;
      found.push(f);
      pendingShots.push({ f, at: Date.now() + 700 });
      console.log(`  [${f.long ? '参考(長め)' : 'FLASH'}] ${f.A} -> ${f.B}(${f.dur}ms, cover ${f.cover}, op ${f.eo}) -> ${f.C}  screen=${f.screen}`);
    }
    const now = Date.now();
    for (let i = pendingShots.length - 1; i >= 0; i--) {
      if (pendingShots[i].at > now) continue;
      const { f } = pendingShots.splice(i, 1)[0];
      const before = [...ring].reverse().find(r => r.t <= f.start - 5);
      let inside = ring.filter(r => r.t > f.start - 20 && r.t < f.end + 20);
      const after = ring.find(r => r.t >= f.end + 20);
      f.ringN = ring.length; f.insideN = inside.length;
      const pick = [['a_before', before], ['b_in1', inside[0]], ['b_in2', inside.length > 2 ? inside[Math.floor(inside.length / 2)] : null], ['c_after', after]];
      f.files = [];
      for (const [lab, fr] of pick) { if (!fr) continue; const fn2 = `${name}_${size}_${String(f.id).padStart(2, '0')}_${lab}.jpg`; fs.writeFileSync(path.join(OUT, fn2), Buffer.from(fr.data, 'base64')); f.files.push(fn2); }
    }
  };
  ctx.scan = scan;
  // 長い待ちの間も見張りを回す
  ctx.wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await sleep(Math.min(250, ms)); await scan(); } };
  ctx.click = (t) => page.eval(`(() => { const ok = (b) => !b.disabled && b.offsetParent !== null && getComputedStyle(b).pointerEvents !== 'none' && b.getBoundingClientRect().width > 3; const b = [...document.querySelectorAll('button, [data-action], [role=button]')].find(b => ok(b) && (b.textContent || '').includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
  ctx.clickSel = (sel) => page.eval(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (b && !b.disabled) { b.click(); return true; } return false; })()`);
  ctx.act = (a) => page.eval(`(() => { const b = document.querySelector('[data-action="${a}"]'); if (b && !b.disabled) { b.click(); return true; } return false; })()`);
  ctx.key = async (k) => { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : k === 'Enter' ? 13 : k === ' ' ? 32 : 0 }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : k === 'Enter' ? 13 : k === ' ' ? 32 : 0 }); };
  ctx.tapMid = () => page.click(W / 2, H * 0.6);
  ctx.state = () => page.eval(`JSON.stringify({ screen: state.screen, story: !!document.querySelector('.story-overlay'), overlays: [...document.querySelectorAll('#stage > *, body > *')].filter(e => e.id !== 'app' && !/^(SCRIPT|STYLE|AUDIO|LINK|NOSCRIPT)$/.test(e.tagName) && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed')).map(e => String(e.className).split(' ')[0] || e.id).filter(x => x && !/^(portrait|preload|loading-veil)/.test(x)).slice(0, 8), btns: [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && !b.disabled).map(b => (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 14)).slice(0, 14) })`).catch(() => '{}');
  ctx.shot = async (lab) => { const f = path.join(OUT, `${name}_${size}_${lab}.png`); await page.screenshot(f); return f; };
  const c0 = ctx; ctx.lobbyWarm = async () => { for (let i = 0; i < 240; i++) { const ok = await page.eval('window.MimiAssets ? MimiAssets.allReady(MimiAssets.sets.lobby()) : true').catch(() => true); if (ok) return true; await sleep(500); } ctx.notes.push('ロビーの素材が2分で読み終わらなかった'); return false; };
  ctx.ready = async () => { for (let i = 0; i < 80 && !(await page.eval('typeof startBattle === "function" && typeof state !== "undefined"').catch(() => false)); i++) await sleep(500); await sleep(1500); await c0.lobbyWarm(); };
  console.log(`== ${name} / ${size}`);
  try { await fn(ctx); } catch (e) { ctx.failed.push(String(e.message || e).slice(0, 300)); console.log('  ERROR', e.message); }
  await ctx.wait(1500);
  await scan(); await sleep(900); await scan();
  const all2 = analyze(all, Date.now());
  const trace = all2.map(x => `${x.name}:${Math.round(x.dur)}`).join(' > ');
  fs.writeFileSync(path.join(dir, 'trace.txt'), trace);
  const errs = await page.eval('window.__QA ? window.__QA.errors.map(e => e.msg.slice(0, 160)) : []').catch(() => []);
  await page.send('Page.stopScreencast').catch(() => {});
  await s.close();
  return { name, size, found, notes: ctx.notes, failed: ctx.failed, errs: errs.slice(0, 5), segments: all2.length };
}

// ---------------- 流れ ----------------
import { FLOWS } from './flashflows.mjs';

const results = [];
const names = FLOW === 'all' ? Object.keys(FLOWS) : FLOW.split(',');
for (const sz of SIZES) for (const n of names) {
  if (!FLOWS[n]) { console.log('unknown flow', n); continue; }
  results.push(await runFlow(n, sz, FLOWS[n]));
}
fs.writeFileSync(path.join(OUT, `result_${FLOW.replace(/,/g, '+')}_${SIZES.join('')}.json`), JSON.stringify(results, null, 1));
console.log('\n==== まとめ');
for (const r of results) {
  console.log(`${r.name}/${r.size}: 区間${r.segments} 一瞬${r.found.length} 失敗${r.failed.length} ${r.failed.join(' | ')}`);
  for (const f of r.found) console.log(`   ${f.A} -> ${f.B} (${f.dur}ms) -> ${f.C}  ${(f.files || []).join(',')}`);
}
process.exit(0);
