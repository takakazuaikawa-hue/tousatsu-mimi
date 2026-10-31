// まとめてダウンロード（オフラインパック）の画面側。Service Worker（sw.js）に頼んで、全ファイルを端末へ保存する。
// ・初回に一度だけ案内を出す（タイトルが出て落ち着いてから）。自動では始めない
// ・進み具合の表示。閉じても保存は裏（SW）で続く。開き直せばまた進み具合が見える
// ・設定の1行（まとめてダウンロード）から window.MimiPack.openPanel() を開く
// 詳しくは docs/design-ref/offline-pack.md
(function () {
  'use strict';
  const PROMPTED_KEY = 'mimi.packPrompted';
  const WANTED_KEY = 'mimi.packWanted'; // 押して始めた印。途中で切れたら次の起動で続きを取る
  const supported = 'serviceWorker' in navigator && window.isSecureContext;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const mb = (b) => (b / 1048576);
  const fmtMB = (b) => mb(b).toFixed(mb(b) >= 100 ? 0 : 1) + 'MB';

  let reg = null;
  let listCache = null; // { files, totalBytes }
  let st = { downloaded: false, partial: false, count: 0, bytes: 0, staleCount: 0, running: false, progress: null };
  let doneFlash = false; // 完了直後の「完了しました」表示
  let deferredInstall = null;
  let panel = null; // { overlay, mode }
  const listeners = new Set();
  const emit = () => { listeners.forEach((f) => { try { f(); } catch (e) {} }); if (panel) renderPanel(); };

  // ---- SW との会話 ----
  function post(msg, wantReply) {
    const sw = reg && (reg.active || reg.waiting || reg.installing);
    if (!sw) return Promise.resolve(null);
    if (!wantReply) { sw.postMessage(msg); return Promise.resolve(null); }
    return new Promise((resolve) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 8000);
      ch.port1.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
      sw.postMessage(msg, [ch.port2]);
    });
  }
  function applyStatus(s) {
    if (!s) return;
    st = Object.assign(st, s);
    if (!s.running) st.progress = null;
  }
  async function refresh() {
    applyStatus(await post({ t: 'pack-status' }, true));
    emit();
    return st;
  }
  async function loadList() {
    if (listCache) return listCache;
    try {
      const r = await fetch('offline-files.json', { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !Array.isArray(j.files)) return null;
      listCache = { files: j.files, totalBytes: j.totalBytes || j.files.reduce((a, f) => a + (f.size || 0), 0) };
      return listCache;
    } catch (e) { return null; }
  }

  function onSWMessage(e) {
    const d = e.data || {};
    if (d.t === 'pack-progress') {
      st.running = true;
      st.progress = { done: d.done, total: d.total, bytesDone: d.bytesDone, bytesTotal: d.bytesTotal };
      if (panel) renderPanel(); // 進み具合だけ（行の更新は不要）
    } else if (d.t === 'pack-done') {
      applyStatus(d);
      st.running = false;
      if (d.failed) { ls.set(WANTED_KEY, '1'); } else {
        ls.del(WANTED_KEY);
        doneFlash = true;
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (err) {}
      }
      st.failedCount = d.failed || 0;
      emit();
    } else if (d.t === 'pack-status') {
      applyStatus(d);
      emit();
    }
  }

  // ---- 操作 ----
  async function download() {
    const list = await loadList();
    if (!list) { st.error = '一覧を取得できませんでした。通信を確かめてもう一度お試しください'; emit(); return false; }
    st.error = '';
    doneFlash = false;
    ls.set(WANTED_KEY, '1');
    st.running = true;
    st.progress = { done: 0, total: list.files.length, bytesDone: 0, bytesTotal: list.totalBytes };
    emit();
    post({ t: 'pack-download', files: list.files }, false);
    return true;
  }
  async function clear() {
    ls.del(WANTED_KEY);
    doneFlash = false;
    applyStatus(await post({ t: 'pack-clear' }, true));
    emit();
  }

  // 起動時：保存があれば一覧と突き合わせ、差し替わった分・増えた分を裏で取り直す（通信できる時だけ）
  async function bootCheck() {
    await refresh();
    const has = st.downloaded || st.partial;
    if (!has && ls.get(WANTED_KEY) !== '1') return;
    if (navigator.onLine === false) return;
    const list = await loadList();
    if (!list) return;
    if (has) applyStatus(await post({ t: 'pack-check', files: list.files }, true));
    emit();
    if (!st.running && (!st.downloaded || st.staleCount > 0)) {
      post({ t: 'pack-download', files: list.files }, false);
    }
  }

  // ---- 状態の言葉 ----
  function stateLabel() {
    if (!supported) return 'この端末では使えません';
    if (st.running) return 'ダウンロード中';
    if (st.staleCount > 0) return '更新あり';
    if (st.downloaded) return `ダウンロード済み（${fmtMB(st.bytes)}）`;
    if (st.partial) return '途中まで保存済み';
    return '未ダウンロード';
  }

  // ---- 設定の1行 ----
  function bindRow(root) {
    if (!root) return;
    root.querySelectorAll('[data-pack-row]').forEach((btn) => {
      if (!supported) { btn.hidden = true; return; }
      const label = btn.querySelector('[data-pack-state]');
      const paint = () => { if (label) label.textContent = stateLabel(); if (!btn.isConnected) listeners.delete(paint); };
      listeners.add(paint);
      paint();
      refresh();
      btn.addEventListener('click', () => openPanel());
    });
  }

  // ---- 窓 ----
  function connectionNote() {
    const c = navigator.connection;
    if (!c) return { text: '', caution: false };
    if (c.type === 'cellular' || c.saveData === true) return { text: 'いまはモバイル回線のようです。Wi-Fiにつないでから始めるのがおすすめです', caution: true };
    if (c.type === 'wifi') return { text: 'Wi-Fiにつながっています', caution: false };
    return { text: '', caution: false };
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openPanel(mode) {
    if (!supported) return;
    closePanel();
    const host = document.getElementById('stage') || document.body;
    const overlay = document.createElement('div');
    overlay.className = 'pack-overlay';
    host.appendChild(overlay);
    panel = { overlay, mode: mode || 'panel', confirmClear: false, prev: document.activeElement };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
    renderPanel();
    refresh();
    loadList().then(() => { if (panel) renderPanel(); });
  }
  function closePanel() {
    if (!panel) return;
    const p = panel; panel = null;
    p.overlay.remove();
    if (p.prev && p.prev.isConnected && p.prev.focus) { try { p.prev.focus(); } catch (e) {} }
  }

  function renderPanel() {
    if (!panel) return;
    const o = panel.overlay;
    const total = listCache ? listCache.totalBytes : 0;
    const conn = connectionNote();
    const prog = st.progress;
    const pct = prog && prog.bytesTotal ? Math.min(100, Math.round(prog.bytesDone / prog.bytesTotal * 100)) : 0;
    const lines = [];
    if (panel.confirmClear) {
      lines.push('<p class="pack-lead">保存した分を削除しますか？</p><p class="pack-note">削除しても遊べます。次からは遊ぶたびに通信で読み込みます。</p>');
    } else {
      if (!st.downloaded && !st.running) {
        lines.push(`<p class="pack-lead">${total ? `約${Math.max(1, Math.round(mb(total)))}MB` : '全部'}をまとめて端末に保存します。</p>`);
        lines.push('<p class="pack-lead">Wi-Fiでのダウンロードをおすすめします。一度落としておくと、外でも通信をほとんど使わずに遊べます。</p>');
        if (conn.text) lines.push(`<p class="pack-note${conn.caution ? ' is-caution' : ''}">${esc(conn.text)}</p>`);
      }
      if (st.running || prog) {
        lines.push(`<div class="pack-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`);
        lines.push(`<p class="pack-size">${prog ? `${fmtMB(prog.bytesDone)} / ${fmtMB(prog.bytesTotal)}` : ''}</p>`);
        lines.push('<p class="pack-note">この窓を閉じても、保存は続きます。</p>');
      } else if (st.downloaded && st.staleCount === 0) {
        lines.push(`<p class="pack-lead">${doneFlash ? '完了しました' : 'ダウンロード済みです'}</p><p class="pack-size">${fmtMB(st.bytes)} を保存しています</p>`);
      } else if (st.staleCount > 0) {
        lines.push('<p class="pack-lead">新しい内容があります。通信できる時に自動で更新します。</p>');
      }
      if (st.partial && !st.running) lines.push('<p class="pack-note">途中まで保存してあります。続きから取得できます。</p>');
      if (st.error) lines.push(`<p class="pack-note is-caution">${esc(st.error)}</p>`);
      if (st.failedCount) lines.push('<p class="pack-note is-caution">取得できなかったファイルがあります。もう一度お試しください</p>');
      if (isIOS && !isStandalone()) {
        lines.push('<p class="pack-note">iPhoneは、しばらく遊ばないと保存した分が消えることがあります。共有ボタンから『ホーム画面に追加』すると消えにくくなります。</p>');
      }
    }
    const btn = (cls, act, text) => `<button type="button" class="btn ${cls}" data-pack="${act}">${text}</button>`;
    const acts = [];
    if (panel.confirmClear) {
      acts.push(btn('btn-danger', 'clear-yes', '削除する'), btn('btn-secondary', 'clear-no', 'やめる'));
    } else {
      if (st.running) { /* 進行中は閉じるだけ */ }
      else if (!st.downloaded || st.partial) acts.push(btn('btn-primary', 'download', st.partial ? '続きをダウンロード' : 'ダウンロードする'));
      if (!st.running && (st.downloaded || st.partial)) acts.push(btn('btn-secondary', 'clear', '保存した分を削除'));
      if (deferredInstall && !isStandalone()) acts.push(btn('btn-secondary', 'install', 'ホーム画面に追加'));
      acts.push(btn(panel.mode === 'prompt' && !st.running && !st.downloaded ? 'btn-ghost' : 'btn-secondary', 'close', panel.mode === 'prompt' && !st.running && !st.downloaded ? '今はしない' : '閉じる'));
    }
    // 進み具合の更新で入力の位置が飛ばないよう、中身が同じなら描き直さない
    const html = `<div class="pack-modal" role="dialog" aria-modal="true" aria-labelledby="pack-title"><h2 id="pack-title" class="pack-title">まとめてダウンロード</h2><div class="pack-body">${lines.join('')}</div><div class="pack-actions">${acts.join('')}</div></div>`;
    if (panel.last === html) return;
    const hadFocus = o.contains(document.activeElement) ? document.activeElement.getAttribute('data-pack') : null;
    panel.last = html;
    o.innerHTML = html;
    o.querySelectorAll('[data-pack]').forEach((b) => b.addEventListener('click', () => act(b.dataset.pack)));
    const f = (hadFocus && o.querySelector(`[data-pack="${hadFocus}"]`)) || o.querySelector('.btn-primary') || o.querySelector('[data-pack="close"]');
    if (f) f.focus({ preventScroll: true });
  }

  async function act(a) {
    if (a === 'download') { await download(); }
    else if (a === 'close') closePanel();
    else if (a === 'clear') { panel.confirmClear = true; renderPanel(); }
    else if (a === 'clear-no') { panel.confirmClear = false; renderPanel(); }
    else if (a === 'clear-yes') { panel.confirmClear = false; await clear(); }
    else if (a === 'install' && deferredInstall) {
      const d = deferredInstall; deferredInstall = null;
      try { d.prompt(); await d.userChoice; } catch (e) {}
      renderPanel();
    }
  }

  // ---- 初回の案内：タイトルが出て落ち着いてから一度だけ ----
  function calm() {
    if (document.hidden) return false;
    const pre = document.getElementById('preload-overlay');
    if (pre && pre.isConnected) {
      const cs = getComputedStyle(pre);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    return !!document.querySelector('.title-screen');
  }
  function schedulePrompt() {
    if (ls.get(PROMPTED_KEY) === '1') return;
    let calmSince = 0;
    const iv = setInterval(async () => {
      if (ls.get(PROMPTED_KEY) === '1') { clearInterval(iv); return; }
      if (!calm()) { calmSince = 0; return; }
      if (!calmSince) { calmSince = Date.now(); return; }
      if (Date.now() - calmSince < 1500) return;
      clearInterval(iv);
      await refresh();
      if (st.downloaded || st.partial || st.running) { ls.set(PROMPTED_KEY, '1'); return; }
      const list = await loadList();
      if (!list) return; // 一覧が無い（ローカルなど）時は出さない。次の起動でまた試す
      if (!calm() || panel || document.querySelector('.settings-overlay')) return;
      ls.set(PROMPTED_KEY, '1');
      openPanel('prompt');
    }, 800);
  }

  // ---- 起動 ----
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (panel) renderPanel(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; if (panel) renderPanel(); });

  window.MimiPack = {
    supported,
    status: () => refresh().then(() => Object.assign({ label: stateLabel() }, st)),
    download,
    clear,
    openPanel,
    bindRow,
    stateLabel,
  };

  if (supported) {
    navigator.serviceWorker.addEventListener('message', onSWMessage);
    const start = () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(() => navigator.serviceWorker.ready)
        .then((r) => { reg = r; return bootCheck(); })
        .then(schedulePrompt)
        .catch(() => {});
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
  }
})();
