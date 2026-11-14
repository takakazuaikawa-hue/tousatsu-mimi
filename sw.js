// まとめてダウンロード（オフライン用の保存）を受け持つ Service Worker。
// 方針：保存した分（mimi-pack-v1）だけを返す。保存していないものは何もせず通信へ素通し（従来どおり）。
// ・本体（html/js/css）は通信を先に試し、だめなら保存分（オフラインでも起動できる）
// ・絵・音・動画は保存分を先に返す。更新で差し替わった印（stale）のものだけ通信を先に試す
// 詳しくは docs/design-ref/offline-pack.md
'use strict';
const CACHE = 'mimi-pack-v1';
const SCOPE = self.registration.scope;
const BASE_PATH = new URL(SCOPE).pathname;
const MAP_URL = SCOPE + '__pack_map.json';
const CONCURRENCY = 3;

// 保存の記録：{ files:{key:hash}, sizes:{key:size}, complete:bool, stale:[key], at }
let packMap = null;
let packMapPromise = null;
let job = null; // 実行中のダウンロード { done,total,bytesDone,bytesTotal,cancel }

function keyOf(urlStr) {
  let u;
  try { u = new URL(urlStr, SCOPE); } catch (e) { return null; }
  if (u.origin !== new URL(SCOPE).origin) return null;
  if (!u.pathname.startsWith(BASE_PATH)) return null;
  let k = u.pathname.slice(BASE_PATH.length);
  if (k === '' || k.endsWith('/')) k += 'index.html';
  return k;
}
const isCore = (k) => /\.(html|js|css|webmanifest)$/i.test(k);

async function loadMap() {
  if (packMap) return packMap;
  if (!packMapPromise) {
    packMapPromise = (async () => {
      let m = { files: {}, sizes: {}, complete: false, stale: [], at: 0 };
      try {
        const c = await caches.open(CACHE);
        const r = await c.match(MAP_URL);
        if (r) { const j = await r.json(); m = Object.assign(m, j); }
      } catch (e) {}
      packMap = m;
      return m;
    })();
  }
  return packMapPromise;
}
async function saveMap() {
  const c = await caches.open(CACHE);
  await c.put(MAP_URL, new Response(JSON.stringify(packMap), { headers: { 'content-type': 'application/json' } }));
}

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim().then(loadMap)); });

// ---- 配る ----
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const key = keyOf(req.url);
  if (!key || key === 'sw.js' || key === 'offline-files.json' || key === '__pack_map.json') return;
  // 記録を読み終えていて空なら素通し（従来どおり）
  if (packMap && !Object.keys(packMap.files).length) return;
  event.respondWith(handle(req, key));
});

async function handle(req, key) {
  const m = await loadMap();
  if (!m.files[key]) return fetch(req);
  const c = await caches.open(CACHE);
  const stale = m.stale.includes(key);
  const canon = SCOPE + key;
  if (isCore(key) || req.mode === 'navigate' || stale) {
    try {
      const res = await fetch(req);
      if (res && res.ok && res.status === 200 && isCore(key) && !stale) {
        // 通信できたついでに保存分も新しくしておく（次回の突き合わせでハッシュも直る）
        c.put(canon, res.clone()).catch(() => {});
      }
      return res;
    } catch (e) {
      const hit = await c.match(canon);
      if (hit) return rangeOf(req, hit);
      throw e;
    }
  }
  const hit = await c.match(canon);
  if (hit) return rangeOf(req, hit);
  return fetch(req);
}

// 動画・音は Range 付きで要求される（特に Safari）。保存分から切り出して 206 で返す
async function rangeOf(req, res) {
  const range = req.headers.get('range');
  if (!range) return res;
  const mt = /bytes=(\d*)-(\d*)/.exec(range);
  if (!mt) return res;
  const blob = await res.blob();
  const size = blob.size;
  const start = mt[1] === '' ? Math.max(0, size - Number(mt[2])) : Number(mt[1]);
  const end = mt[1] === '' || mt[2] === '' ? size - 1 : Math.min(Number(mt[2]), size - 1);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + size } });
  const headers = new Headers(res.headers);
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  headers.set('accept-ranges', 'bytes');
  return new Response(blob.slice(start, end + 1), { status: 206, headers });
}

// ---- ページとのやりとり ----
async function broadcast(msg) {
  const cl = await self.clients.matchAll({ includeUncontrolled: true });
  cl.forEach((c) => c.postMessage(msg));
}
function reply(event, msg) {
  if (event.ports && event.ports[0]) event.ports[0].postMessage(msg);
  else if (event.source) event.source.postMessage(msg);
}
async function statusOf() {
  const m = await loadMap();
  const keys = Object.keys(m.files);
  let bytes = 0;
  for (const k of keys) bytes += m.sizes[k] || 0;
  return {
    t: 'pack-status',
    downloaded: keys.length > 0 && m.complete,
    partial: keys.length > 0 && !m.complete,
    count: keys.length, bytes, staleCount: m.stale.length,
    running: !!job,
    progress: job ? { done: job.done, total: job.total, bytesDone: job.bytesDone, bytesTotal: job.bytesTotal } : null,
  };
}

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.t === 'pack-status') {
    event.waitUntil(statusOf().then((s) => reply(event, s)));
  } else if (d.t === 'pack-download') {
    event.waitUntil(syncPack(d.files || [], event));
  } else if (d.t === 'pack-check') {
    event.waitUntil(checkStale(d.files || []).then(statusOf).then((s) => reply(event, s)));
  } else if (d.t === 'pack-clear') {
    event.waitUntil(clearPack().then(statusOf).then((s) => { reply(event, s); broadcast(s); }));
  }
});

async function clearPack() {
  if (job) job.cancel = true;
  packMap = { files: {}, sizes: {}, complete: false, stale: [], at: 0 };
  packMapPromise = Promise.resolve(packMap);
  await caches.delete(CACHE);
}

// 配信側の一覧と突き合わせ、ハッシュが違うものに「古い」印を付ける（印が付いた間は通信を先に試す）
async function checkStale(files) {
  const m = await loadMap();
  if (!Object.keys(m.files).length) return;
  const now = new Set();
  const stale = [];
  let added = false;
  for (const f of files) {
    const k = keyOf(f.url); if (!k) continue;
    now.add(k);
    if (!m.files[k]) added = true;
    else if (m.files[k] !== f.hash) stale.push(k);
  }
  for (const k of Object.keys(m.files)) if (!now.has(k)) stale.push(k); // 消えたもの
  m.stale = Array.from(new Set([...m.stale.filter((k) => m.files[k]), ...stale]));
  if (added || stale.length) m.complete = false; // 続き（差分の取得）が要る
  await saveMap();
}

// 一覧どおりに揃える：消えたものは削除、無い・ハッシュが違うものは取り直す
async function syncPack(files, event) {
  if (job) { reply(event, await statusOf()); return; }
  const m = await loadMap();
  const c = await caches.open(CACHE);
  const list = files.map((f) => ({ key: keyOf(f.url), url: f.url, hash: f.hash, size: Number(f.size) || 0 })).filter((f) => f.key);
  const want = new Set(list.map((f) => f.key));
  for (const k of Object.keys(m.files)) {
    if (!want.has(k)) { await c.delete(SCOPE + k).catch(() => {}); delete m.files[k]; delete m.sizes[k]; }
  }
  const todo = list.filter((f) => m.files[f.key] !== f.hash);
  const bytesTotal = list.reduce((a, f) => a + f.size, 0);
  const alreadyBytes = list.reduce((a, f) => a + (m.files[f.key] === f.hash ? f.size : 0), 0);
  job = { done: list.length - todo.length, total: list.length, bytesDone: alreadyBytes, bytesTotal, cancel: false };
  reply(event, await statusOf());
  let failed = 0;
  let sinceSave = 0;
  let lastPost = 0;
  const queue = todo.slice();
  const myJob = job;
  const worker = async () => {
    while (queue.length && !myJob.cancel) {
      const f = queue.shift();
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok && !myJob.cancel; attempt++) {
        try {
          const res = await fetch(new URL(f.url, SCOPE).href, { cache: 'reload' });
          if (!res.ok || res.status !== 200) throw new Error('http ' + res.status);
          await c.put(SCOPE + f.key, res);
          ok = true;
        } catch (e) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); }
      }
      if (myJob.cancel) return;
      if (ok) {
        m.files[f.key] = f.hash; m.sizes[f.key] = f.size;
        m.stale = m.stale.filter((k) => k !== f.key);
        myJob.bytesDone += f.size;
      } else failed++;
      myJob.done++;
      if (++sinceSave >= 40) { sinceSave = 0; await saveMap(); }
      const now = Date.now();
      if (now - lastPost > 250 || myJob.done === myJob.total) {
        lastPost = now;
        broadcast({ t: 'pack-progress', done: myJob.done, total: myJob.total, bytesDone: myJob.bytesDone, bytesTotal: myJob.bytesTotal });
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    const cancelled = myJob.cancel;
    job = null;
    if (!cancelled) {
      m.complete = failed === 0;
      if (m.complete) m.stale = [];
      m.at = Date.now();
      await saveMap();
      const s = await statusOf();
      s.t = 'pack-done'; s.failed = failed;
      broadcast(s);
    }
  }
}
