// 1回の検査セッション：静的サーバー＋ヘッドレス Edge＋初期化スクリプト（早送り・乱数固定・例外収集・セーブ注入）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';
import { serve } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const SAVE_KEY = 'tousatsu_mimi_save_v1';

function initScript(cfg) {
  return `(() => {
  const cfg = ${JSON.stringify(cfg)};
  window.__QA = { errors: [], dialogs: [], cfg };
  const S = cfg.speed || 1;
  if (S !== 1) {
    const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
    window.setTimeout = function (fn, ms, ...a) { return st(fn, Math.max(0, (+ms || 0) / S), ...a); };
    window.setInterval = function (fn, ms, ...a) { return si(fn, Math.max(4, (+ms || 0) / S), ...a); };
  }
  if (cfg.seed != null) {
    let a = cfg.seed >>> 0;
    Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  window.addEventListener('error', e => { if (e.message) window.__QA.errors.push({ type: 'error', msg: String(e.message), src: (e.filename || '') + ':' + e.lineno + ':' + e.colno, stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1500) : '' }); });
  window.addEventListener('unhandledrejection', e => { window.__QA.errors.push({ type: 'rejection', msg: String(e.reason && (e.reason.stack || e.reason)).slice(0, 1500) }); });
  const ce = console.error.bind(console);
  console.error = (...a) => { window.__QA.errors.push({ type: 'console', msg: a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ').slice(0, 1500) }); ce(...a); };
  try {
    if (!sessionStorage.getItem('__qa_boot')) {
      sessionStorage.setItem('__qa_boot', '1');
      if (cfg.clear) localStorage.clear();
      if (cfg.save) localStorage.setItem(${JSON.stringify(SAVE_KEY)}, JSON.stringify(cfg.save));
    }
  } catch (e) {}
})();`;
}

export async function openSession({ width = 1280, height = 800, mobile = false, speed = 1, seed = 12345, save = null, clear = true, probes = [], cacheControl = 'no-store' } = {}) {
  const server = await serve(REPO, 0, cacheControl);
  const browser = await launch({ width, height });
  const page = await browser.newPage();
  await page.setViewport(width, height, mobile);
  await page.useLocalFonts(path.join(REPO, 'qa', 'out', 'fonts', 'fonts.css'));
  await page.addInit(initScript({ speed, seed, save, clear }));
  for (const p of probes) await page.addInit(fs.readFileSync(path.join(REPO, 'qa', 'probe', p), 'utf8'));
  // ネイティブの confirm/alert は検査を止めるので、記録して自動で OK にする（製品不備として報告対象）
  page.on('Page.javascriptDialogOpening', async (p) => {
    page._dialogs = page._dialogs || [];
    page._dialogs.push({ type: p.type, message: p.message });
    try { await page.send('Page.handleJavaScriptDialog', { accept: true }); } catch {}
  });
  const exceptions = [];
  page.on('Runtime.exceptionThrown', (p) => {
    const d = p.exceptionDetails || {};
    exceptions.push({ text: d.text, desc: d.exception && d.exception.description ? String(d.exception.description).slice(0, 1500) : '', url: d.url, line: d.lineNumber });
  });
  if (speed !== 1) {
    await page.send('Animation.enable').catch(() => {});
    await page.send('Animation.setPlaybackRate', { playbackRate: speed }).catch(() => {});
  }
  const url = `http://127.0.0.1:${server.port}/index.html`;
  await page.goto(url);
  await sleep(800 / Math.min(speed, 4));
  return {
    page, browser, server, url, exceptions,
    get dialogs() { return page._dialogs || []; },
    async close() { await browser.close(); await server.close(); },
  };
}

export { sleep };
