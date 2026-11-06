// DLsite 版の起動係（Electron）。ゲームの中身は同じフォルダの game/ にあり、app://game/ という自前の場所から配る。
// ・index.html を直接開く（file://）と、Chrome の決まりで絵を WebGL で加工できない（ホームの動き・動く一枚絵・ぱにゅぱにゅが止まる）。
//   自前の場所（standard・secure）から配れば、ブラウザで遊ぶ時と同じに動く。通信は使わない。
// ・セーブはこの場所（app://game）に結びつく localStorage。保存先は %APPDATA%\MimiTexasHoldem（フォルダを移しても消えない）
// ・動画の早送り・ループのため、Range（部分の読み込み）に応じる
'use strict';
const { app, BrowserWindow, protocol, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { Readable } = require('node:stream');

const ROOT = path.join(__dirname, 'game');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);
app.setName('MimiTexasHoldem');
// 曲・声は最初のクリックを待たずに鳴らしてよい（ブラウザで遊ぶ時の「一度押してから」の決まりはアプリには要らない）
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.disableHardwareAcceleration && process.env.MIMI_NO_GPU && app.disableHardwareAcceleration();

function serve(req) {
  const u = new URL(req.url);
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('not found', { status: 404 });
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.get('range');
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), { status: 206,
      headers: { 'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500, useContentSize: true,
    backgroundColor: '#12040a', title: 'ミミのテキサスホールデムポーカー', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  // 外のページ（作品紹介など）はアプリの中で開かず、いつものブラウザで開く。ゲームの中身の移動はさせない
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://game/')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
  // F11 で全画面の切り替え、F5 で読み直し（止まった時の逃げ道）
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F5') { win.webContents.reload(); e.preventDefault(); }
  });
  win.loadURL('app://game/index.html');
}

// 二重に起動すると、同じセーブを2つの窓が書き合うので、2つ目は1つ目を前に出して閉じる
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle('app', serve);
    createWindow();
    // メモリの記録（MIMI_MEMLOG=1 で起動した時だけ）：10秒ごとにプロセス別の使用量を userData/memlog.txt へ。重くなる場面を探す用（2026-11-07）
    if (process.env.MIMI_MEMLOG) {
      const file = path.join(app.getPath('userData'), 'memlog.txt');
      setInterval(() => { const rows = app.getAppMetrics().map(m => m.type + ':' + Math.round((m.memory.workingSetSize || 0) / 1024) + 'MB'); fs.appendFile(file, new Date().toISOString() + ' ' + rows.join(' ') + '\n', () => {}); }, 10000);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
