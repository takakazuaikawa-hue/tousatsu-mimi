// 画像・動画の「遅れて出る」を、回線を絞ったヘッドレス Edge で測る。
// node qa/loadaudit.mjs [--mbps 4] [--latency 60] [--dwell 5000] [--only scene,scene] [--out qa/out/loadaudit]
// 各シーンごとにキャッシュ無効・新規読み込みから始め（初回訪問の想定）、トリガーの直後から
//   ・要素（img / video / CSS 背景）が現れた時刻（MutationObserver）
//   ・その画像が読み終わった時刻（load / loadeddata）
//   ・Network のリクエスト（開始・終了・転送バイト）
// を集める。要素が現れてから 100ms 超えて読み終わったものを「遅れて出た」とする。
// 出力：qa/out/loadaudit/loadaudit.json と loadaudit.md
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const MBPS = +(args.mbps || 4), LAT = +(args.latency || 60), DWELL = +(args.dwell || 5000);
const only = args.only ? String(args.only).split(',') : null;
const OUT = path.resolve(REPO, args.out || 'qa/out/loadaudit');
const LATE_MS = 100;
fs.mkdirSync(OUT, { recursive: true });

// ---- ページ側の記録装置（毎回の読み込みで先に入る） ----
const RECORDER = `(() => {
  if (window.__LA) return;
  const E = () => performance.timeOrigin + performance.now();
  const LA = window.__LA = { scene: 'boot', els: [], t0: E(), E };
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return u; } };
  const recOf = new WeakMap();           // 要素 → 最新の記録
  const bgSeen = new WeakMap();          // 要素 → 見た背景URL集合
  const vis = (el) => { try { return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; } catch (e) { return false; } };
  const cls = (el) => (el.className && el.className.baseVal === undefined ? String(el.className) : '').slice(0, 70) + (el.id ? '#' + el.id : '');
  function noteMedia(el, via) {
    const url = abs(el.getAttribute('src') || el.currentSrc || '');
    if (!el.getAttribute('src')) return;
    const r = { kind: el.tagName === 'VIDEO' ? 'video' : 'img', url, cls: cls(el), scene: LA.scene, t0: E(), vis: vis(el), via,
      loaded: null, first: null, playing: null, err: null };
    if (r.kind === 'img' && el.complete && el.naturalWidth > 0) r.loaded = r.t0;
    if (r.kind === 'video' && el.readyState >= 2) r.first = r.t0;
    recOf.set(el, r); LA.els.push(r);
  }
  function noteBg(el) {
    for (const pseudo of [null, '::before', '::after']) {
      let bi = ''; try { bi = getComputedStyle(el, pseudo).backgroundImage; } catch (e) {}
      if (!bi || bi === 'none') continue;
      const urls = [...bi.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)].map(m => m[1]).filter(u => !u.startsWith('data:') && !u.startsWith('#'));
      if (!urls.length) continue;
      let set = bgSeen.get(el); if (!set) { set = new Set(); bgSeen.set(el, set); }
      for (const u of urls) {
        const url = abs(u), key = (pseudo || '') + url;
        if (set.has(key)) continue; set.add(key);
        LA.els.push({ kind: 'bg', url, cls: cls(el) + (pseudo || ''), scene: LA.scene, t0: E(), vis: vis(el), via: 'css' });
      }
    }
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    const all = [node, ...(node.querySelectorAll ? [...node.querySelectorAll('*')].slice(0, 600) : [])];
    for (const el of all) {
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO') noteMedia(el, 'insert');
      noteBg(el);
    }
  }
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(scan);
      else if (m.type === 'attributes') {
        const el = m.target;
        if (m.attributeName === 'src' && (el.tagName === 'IMG' || el.tagName === 'VIDEO')) noteMedia(el, 'src');
        else if (m.attributeName === 'class' || m.attributeName === 'style') noteBg(el);
      }
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class', 'style'] });
  const on = (type, f) => document.addEventListener(type, f, true);
  on('load', (e) => { const r = recOf.get(e.target); if (r && r.loaded == null) r.loaded = E(); });
  on('error', (e) => { const r = recOf.get(e.target); if (r) r.err = E(); });
  on('loadeddata', (e) => { const r = recOf.get(e.target); if (r && r.first == null) r.first = E(); });
  on('playing', (e) => { const r = recOf.get(e.target); if (r && r.playing == null) r.playing = E(); });
  // 起動直後（document 作成時点）にもう DOM にあるものを拾う
  document.addEventListener('DOMContentLoaded', () => scan(document.documentElement));
  LA.setScene = (s) => { LA.scene = s; return E(); };
})();`;

// 全グループを回す時は、グループごとに別プロセス（別ブラウザ）で測る（前の読み込みの残りが回線を食わないように）
const GROUP_IDS = ['boot_title','lobby','episode_polka','episode_grano','episode_ending','intermission_polka','rewardcg_velvet','ending','panyu','rico_viewer','collection','battle_polka','battle_velvet'];
if (!args.group && !only) {
  const extra = args.nocache ? ['--nocache'] : [];
  const { spawnSync } = await import('node:child_process');
  const parts = [];
  for (const id of GROUP_IDS) {
    const sub = path.join(OUT, 'parts'); fs.mkdirSync(sub, { recursive: true });
    const r = spawnSync(process.execPath, [process.argv[1], '--group', id, '--out', path.relative(REPO, sub), '--mbps', String(MBPS), '--latency', String(LAT), '--dwell', String(DWELL), ...extra], { stdio: 'inherit', timeout: 900000 });
    const f = path.join(sub, id + '.json');
    if (fs.existsSync(f)) parts.push(JSON.parse(fs.readFileSync(f, 'utf8')));
    else console.log('失敗', id, r.status);
  }
  const scenes = parts.flatMap(p => p.scenes);
  fs.writeFileSync(path.join(OUT, 'loadaudit.json'), JSON.stringify({ at: new Date().toISOString(), mbps: MBPS, latencyMs: LAT, lateThresholdMs: 100, scenes }, null, 1));
  let md = '';
  for (const id of GROUP_IDS) { try { const t = fs.readFileSync(path.join(OUT, 'parts', id + '.md'), 'utf8'); const k = t.indexOf('## '); md += (md ? '' : t.slice(0, k)) + t.slice(k); } catch {} }
  fs.writeFileSync(path.join(OUT, 'loadaudit.md'), md);
  process.exit(0);
}
const sess = await openSession({ width: 1280, height: 800, speed: 1, seed: 1,
  cacheControl: args.nocache ? 'no-store' : 'public, max-age=600', save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500, rewardCgSeen: ['polka'] } });
const { page } = sess;
await page.addInit(RECORDER);

// ---- Network 側の記録 ----
const reqs = new Map();
await page.send('Network.enable');
await page.send('Network.setCacheDisabled', { cacheDisabled: !!args.nocache });
await page.send('Network.emulateNetworkConditions', { offline: false, latency: LAT, downloadThroughput: MBPS * 1024 * 1024 / 8, uploadThroughput: 1024 * 1024 / 8 });
page.on('Network.requestWillBeSent', (p) => {
  if (reqs.has(p.requestId) || !/^http:\/\/127/.test(p.request.url)) return;
  reqs.set(p.requestId, { url: p.request.url, type: p.type, ts: p.timestamp, start: p.wallTime * 1000, init: (p.initiator && p.initiator.type) || '', range: (p.request.headers && (p.request.headers.Range || p.request.headers.range)) || '', end: null, bytes: 0, failed: false });
});
page.on('Network.loadingFinished', (p) => { const r = reqs.get(p.requestId); if (r) { r.end = r.start + (p.timestamp - r.ts) * 1000; r.bytes = p.encodedDataLength; } });
page.on('Network.loadingFailed', (p) => { const r = reqs.get(p.requestId); if (r) { r.failed = true; r.end = r.start + (p.timestamp - r.ts) * 1000; } });
page.on('Network.dataReceived', (p) => { const r = reqs.get(p.requestId); if (r && !r.bytes) r.rx = (r.rx || 0) + p.encodedDataLength; });

const fileSize = (url) => { try { return fs.statSync(path.join(REPO, decodeURIComponent(new URL(url).pathname))).size; } catch { return null; } };
const rel = (url) => decodeURIComponent(new URL(url).pathname).replace(/^\//, '');

// ---- シーン定義 ----
const SAVE_BATTLE = `startBattle(%OPP%);`;
const battleClicks = `for (let i = 0; i < 6; i++) { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); await new Promise(r => setTimeout(r, 900)); }`;
const J = JSON.stringify;
// steps: [{ name, js, dwell }]。同じ起動の中で順に実行する（前のシーンで読んだ物は後のシーンでは温まっている）
const GROUPS = [
  { id: 'boot_title', boot: true, steps: [{ name: 'boot_title', js: null, dwell: DWELL }] },
  { id: 'lobby', steps: [{ name: 'lobby', js: `state.screen='lobby'; render();`, dwell: DWELL + 2000 }] },
  { id: 'episode_polka', steps: [{ name: 'episode_polka', js: `showEpisodeTitle('polka', () => {});`, dwell: DWELL }] },
  { id: 'episode_grano', steps: [{ name: 'episode_grano', js: `showEpisodeTitle('grano', () => {});`, dwell: DWELL }] },
  { id: 'episode_ending', steps: [{ name: 'episode_ending', js: `showEpisodeTitle('ending', () => {});`, dwell: DWELL }] },
  { id: 'intermission_polka', steps: [{ name: 'intermission_polka', js: `showIntermission('polka', () => {});`, dwell: DWELL }] },
  { id: 'rewardcg_velvet', steps: [{ name: 'rewardcg_velvet', js: `showRewardCgViewer('velvet');`, dwell: DWELL }] },
  { id: 'ending', steps: [{ name: 'ending', js: `state.screen='ending'; render();`, dwell: DWELL + 2000 }] },
  { id: 'panyu', steps: [{ name: 'panyu_clicker', js: `showPanyuClicker(5, () => {});`, dwell: DWELL }] },
  { id: 'rico_viewer', steps: [{ name: 'rico_viewer', js: `showRicoViewer();`, dwell: DWELL }] },
  { id: 'collection', steps: [{ name: 'collection', js: `showCollectionModal();`, dwell: DWELL }] },
  ...['polka', 'velvet'].map(opp => ({
    id: 'battle_' + opp,
    steps: [
      { name: `battle_start_${opp}`, js: `startBattle(${J(opp)}); ${battleClicks}`, dwell: DWELL },
      { name: `emote_opp_busted_${opp}`, js: `playEmote('opponent','busted',{force:true});`, dwell: 3000 },
      { name: `emote_opp_tellStrong_${opp}`, js: `playEmote('opponent','tellStrong',{force:true});`, dwell: 2500 },
      { name: `emote_mimi_defeat`, js: `playEmote('mimi','defeat',{force:true});`, dwell: 3000 },
      { name: `cutin_opponent_${opp}`, js: `showOpponentCutIn('テスト', 'big');`, dwell: 2500 },
      { name: `cutin_allin_${opp}`, js: `showAllInCutIn('opponent', 500);`, dwell: 2500 },
      { name: `readbattle_psych_${opp}`, js: `state.psychPending = true; startReadBattle('psych');`, dwell: DWELL + 1500 },
      { name: `readbattle_logic_${opp}`, js: `state.psychPending = true; startReadBattle('logic');`, dwell: DWELL + 1500 },
      // 結果の札の動画（読み合いの結果は実プレイでしか出ないので、同じ造りの要素を差し込んで測る）
      { name: `result_motion_psych_${opp}`, js: `(() => { const h = document.createElement('div'); h.className = 'mb-result'; h.innerHTML = '<div class="mb-result-card"><div class="mb-result-art has-motion"><img src="assets/battle/face/${opp}_busted.webp" alt=""><video class="mb-result-motion" src="assets/battle/motion/${opp}_busted.mp4" muted playsinline autoplay preload="auto"></video></div></div>'; (document.querySelector('.read-battle-host') || document.body).appendChild(h); })();`, dwell: 3500 },
      { name: `result_motion_logic_${opp}`, js: `(() => { const h = document.createElement('div'); h.className = 'mb-result'; h.innerHTML = '<div class="mb-result-card"><div class="mb-result-art has-motion"><img src="assets/battle/chibi/${opp}_lose.webp" alt=""><video class="mb-result-motion" src="assets/battle/motion/${opp}_chibi_lose.mp4" muted playsinline autoplay preload="auto"></video></div></div>'; (document.querySelector('.read-battle-host') || document.body).appendChild(h); })();`, dwell: 3500 },
    ],
  })),
];

async function bootFresh(url) {
  console.log("  goto", new Date().toISOString().slice(17,23));
  await page.send('Network.clearBrowserCache').catch(() => {});
  const t = Date.now();
  await page.goto(url, 90000);
  // タイトルのロード画面が閉じるまで（最大90秒）
  while (Date.now() - t < 90000) {
    const gone = await page.eval(`!document.getElementById("preload-overlay")`, 8000).catch(() => false);
    if (gone) break; await sleep(150);
  }
  return Date.now() - t;
}

const results = [];
const origin = Date.now();
for (const g of GROUPS) {
  if (args.group && g.id !== args.group) continue;
  if (only && !g.steps.some(s => only.some(o => s.name.startsWith(o))) && !only.includes(g.id)) continue;
  reqs.clear();
  const gStart = Date.now();
  // 新規ページ（読み込み前にシーン名を boot にしておく）
  let bootMs = null;
  if (g.boot) {
    await page.eval(`1`).catch(() => {});
    bootMs = await bootFresh(sess.url);
    // boot はナビゲーション開始からの測定になるので、シーン区間は reqs 全体
  } else {
    bootMs = await bootFresh(sess.url);
    await sleep(3000); // 起動後の「そっと先読み」が走り出す頃合い
  }
  const steps = [];
  for (const s of g.steps) {
    let tStart;
    if (g.boot) {
      tStart = await page.eval(`window.__LA.t0`);
      await page.eval(`window.__LA.setScene(${J(s.name)})`).catch(() => {});
      // boot のレコードは setScene 前に入っているので scene 名を後から付け替える
      await page.eval(`window.__LA.els.forEach(e => { if (e.scene === 'boot') e.scene = ${J(s.name)}; })`);
    } else {
      tStart = await page.eval(`window.__LA.setScene(${J(s.name)})`);
    }
    if (s.js) { try { await page.eval(`(async () => { ${s.js} })()`, 20000); } catch (e) { console.log('  trigger error', s.name, String(e.message).slice(0, 160)); } }
    await sleep(s.dwell);
    const tEnd = await page.eval(`window.__LA.E()`);
    steps.push({ name: s.name, tStart, tEnd, dwell: s.dwell });
  }
  const els = await page.eval(`JSON.stringify(window.__LA.els)`).then(JSON.parse);
  const errs = await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 5))`).then(JSON.parse).catch(() => []);
  const net = [...reqs.values()].filter(r => (r.type === 'Image' || r.type === 'Media'));
  // 動画の Range 要求は URL ごとにまとめる
  const byUrl = new Map();
  for (const r of net) {
    const b = r.bytes || r.rx || 0;
    const e = byUrl.get(r.url) || { url: r.url, type: r.type, start: r.start, end: r.end, bytes: 0, n: 0, init: r.init, failed: r.failed };
    e.start = Math.min(e.start, r.start); e.end = (e.end == null || r.end == null) ? null : Math.max(e.end, r.end); e.bytes += b; e.n++;
    byUrl.set(r.url, e);
  }
  const scenes = [];
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const winStart = g.boot ? 0 : st.tStart - 5, winEnd = st.tEnd;
    const isBoot = !!g.boot;
    // この区間に要素として現れたもの
    const mine = els.filter(e => e.scene === st.name);
    const items = [];
    const claimed = new Set();
    for (const e of mine) {
      const n = byUrl.get(e.url);
      let delay, finish, state;
      if (e.kind === 'video') finish = e.first; else if (e.kind === 'img') finish = e.loaded; else finish = null;
      if (e.kind === 'bg') {
        // CSS 背景は読み終わりを知る手段が無いので Network の終了時刻で代用（要求が区間内から始まったものだけ）
        if (n && n.start >= e.t0 - 30 - (isBoot ? 1e12 : 0) && n.end != null) { finish = n.end; delay = Math.max(0, n.end - Math.max(e.t0, n.start)); state = 'net'; }
        else if (n && n.start >= e.t0 - 30) { delay = null; state = '未完了'; }
        else { delay = 0; state = '既読'; }
      } else if (finish != null) { delay = Math.max(0, finish - e.t0); state = delay === 0 ? '既読' : 'ok'; }
      else if (e.err) { delay = null; state = 'エラー'; }
      // 同じ要素の src が付け替わると古い記録の load が来ない。Network の終了時刻で代用する（要求が無ければ読み込み済み）
      else if (n && n.start >= e.t0 - 30 && n.end != null) { delay = Math.max(0, n.end - e.t0); state = 'net推定'; }
      else if (n && n.start >= e.t0 - 30) { delay = null; state = '未完了'; }
      else { delay = 0; state = '既読'; }
      if (n && !claimed.has(e.url)) claimed.add(e.url);
      items.push({ kind: e.kind, url: rel(e.url), cls: e.cls, vis: e.vis, via: e.via, delayMs: delay == null ? null : Math.round(delay),
        playingMs: e.playing != null ? Math.round(e.playing - e.t0) : undefined,
        state, size: fileSize(e.url), netBytes: n ? n.bytes : null, netMs: n && n.end ? Math.round(n.end - n.start) : null,
        late: delay != null ? delay > LATE_MS : state === '未完了' });
    }
    // 要素として現れなかったがこの区間に読み込まれたもの（先読み・裏読み）
    const hidden = [];
    for (const n of byUrl.values()) {
      if (n.start < winStart || n.start > winEnd) continue;
      if (mine.some(e => e.url === n.url)) continue;
      if (els.some(e => e.url === n.url && e.scene !== st.name && e.t0 <= n.start)) continue;
      hidden.push({ url: rel(n.url), init: n.init, bytes: n.bytes, size: fileSize(n.url), ms: n.end ? Math.round(n.end - n.start) : null, type: n.type });
    }
    const dispBytes = [...new Set(mine.map(e => e.url))].reduce((a, u) => a + ((byUrl.get(u) && byUrl.get(u).start >= winStart) ? byUrl.get(u).bytes : 0), 0);
    const allBytes = [...byUrl.values()].filter(n => n.start >= winStart && n.start <= winEnd).reduce((a, n) => a + n.bytes, 0);
    scenes.push({ name: st.name, group: g.id, bootMs: i === 0 ? bootMs : undefined, dwell: st.dwell, items, backgroundLoads: hidden, bytesDisplayed: dispBytes, bytesAllRequests: allBytes });
  }
  results.push(...scenes);
  console.log(`${g.id}: boot ${bootMs}ms / ${scenes.map(s => `${s.name}[遅れ${s.items.filter(x => x.late && x.vis).length}件 ${(s.bytesAllRequests / 1024) | 0}KB]`).join(' ')}${errs.length ? ' ERR ' + errs.length : ''}`);
}

// ---- 出力 ----
const TAG = args.group || 'loadaudit';
fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ at: new Date().toISOString(), mbps: MBPS, latencyMs: LAT, lateThresholdMs: LATE_MS, scenes: results }, null, 1));
const kb = (n) => n == null ? '-' : (n / 1024).toFixed(0) + 'KB';
let md = `# 画像・動画の遅れ表示 測定結果\n\n条件：下り ${MBPS}Mbps / 遅延 ${LAT}ms / 起動前にHTTPキャッシュを空にした初回訪問（以後は本番相当の max-age=600、--nocache で完全無効）/ 1280x800。各グループは新規読み込みから開始し、起動後3秒でトリガー。\n` +
  `「遅れ」＝要素が現れてから読み終わるまで ${LATE_MS}ms 超（画像は load、動画は loadeddata、CSS 背景は Network の終了時刻）。\n\n`;
for (const s of results) {
  const late = s.items.filter(x => x.late).sort((a, b) => (b.delayMs ?? 1e9) - (a.delayMs ?? 1e9));
  md += `## ${s.name}\n- 転送合計 ${kb(s.bytesAllRequests)}（うち表示に使った物 ${kb(s.bytesDisplayed)}）${s.bootMs != null ? ` / 起動のロード画面 ${s.bootMs}ms` : ''}\n`;
  if (!late.length) md += `- 遅れて出た物なし\n`;
  for (const x of late) md += `- ${x.delayMs == null ? '未完了' : x.delayMs + 'ms'} ${x.kind}${x.vis ? '' : '（非表示中）'} ${x.url}  ${kb(x.size)}  [${x.cls}]${x.playingMs != null ? ' 再生開始+' + x.playingMs + 'ms' : ''}\n`;
  if (s.backgroundLoads.length) md += `- 裏読み/先読み: ${s.backgroundLoads.length}件 ${kb(s.backgroundLoads.reduce((a, b) => a + b.bytes, 0))}\n`;
  md += '\n';
}
fs.writeFileSync(path.join(OUT, TAG + '.md'), md);
console.log('保存:', OUT, '経過', Math.round((Date.now() - origin) / 1000), '秒');
await sess.close();
