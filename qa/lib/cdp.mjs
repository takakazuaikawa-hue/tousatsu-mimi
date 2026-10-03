// 最小の CDP ドライバ（依存なし・Node 22+ の global WebSocket を使う）
// ヘッドレス Edge を自前プロファイルで起動し、終わったら自分で起動したプロセスだけを落とす。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class Conn {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(typeof e.data === 'string' ? e.data : e.data.toString());
      if (m.id) {
        const p = this.pending.get(m.id);
        if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      } else {
        const key = (m.sessionId || '') + '|' + m.method;
        (this.listeners.get(key) || []).forEach(f => { try { f(m.params); } catch {} });
      }
    };
  }
  send(method, params = {}, sessionId, timeoutMs = 60000) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('CDP timeout: ' + method)); } }, timeoutMs);
    });
  }
  on(method, fn, sessionId = '') {
    const key = sessionId + '|' + method;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(fn);
  }
}

export class Page {
  constructor(conn, sid) { this.conn = conn; this.sid = sid; }
  send(m, p, timeoutMs) { return this.conn.send(m, p, this.sid, timeoutMs); }
  on(m, f) { this.conn.on(m, f, this.sid); }
  async eval(expr, timeoutMs = 60000) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, timeoutMs);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error((d.exception && d.exception.description) || d.text || 'eval error');
    }
    return r.result ? r.result.value : undefined;
  }
  async goto(url, timeoutMs = 30000) {
    let done;
    const loaded = new Promise(res => { done = res; });
    if (!this._loadHooked) {
      this._loadHooked = true;
      this.on('Page.loadEventFired', () => { if (this._onLoad) { const f = this._onLoad; this._onLoad = null; f(); } });
    }
    this._onLoad = done;
    await this.send('Page.navigate', { url });
    await Promise.race([loaded, sleep(timeoutMs)]);
  }
  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile, maxTouchPoints: mobile ? 5 : 1 });
  }
  async addInit(source) { await this.send('Page.addScriptToEvaluateOnNewDocument', { source }); }
  async screenshot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  }
  async click(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }
}

export async function launch({ port = 9400 + Math.floor(Math.random() * 500), width = 1280, height = 800, profileRoot } = {}) {
  const exe = EDGE_CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('Edge/Chrome not found');
  const root = profileRoot || process.env.QA_TMP || path.join(os.tmpdir(), 'mimi-qa');
  const profile = path.join(root, 'edge-prof-' + port);
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { stdio: 'ignore' });
  let ver = null;
  for (let i = 0; i < 150 && !ver; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(100); }
  }
  if (!ver) { proc.kill(); throw new Error('browser did not start'); }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const conn = new Conn(ws);
  return {
    proc, conn, profile,
    async newPage() {
      const { targetId } = await conn.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
      const page = new Page(conn, sessionId);
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      return page;
    },
    async close() {
      try { await conn.send('Browser.close'); } catch {}
      try { ws.close(); } catch {}
      await sleep(400);
      try { proc.kill(); } catch {}
      await sleep(300);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    },
  };
}
