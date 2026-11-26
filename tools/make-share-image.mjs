// 体験版の共有画像（正方形 1080×1080）を tools/share-image.html から撮って assets/ui/share_trial.jpg に書く。
// QA_BROWSER=... QA_NO_SANDBOX=1 node tools/make-share-image.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openSession, sleep, REPO } from '../qa/lib/session.mjs';
const FF = process.env.FF || 'C:/Users/takakazu/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe';
const s = await openSession({ width: 1080, height: 1080 });
const png = path.join(REPO, 'qa', 'out', 'share_trial.png');
const jpg = path.join(REPO, 'assets', 'ui', 'share_trial.jpg');
try {
  await s.page.goto(s.url.replace('index.html', 'tools/share-image.html'), 60000);
  await s.page.eval('document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode()))).then(() => true)');
  await sleep(800);
  fs.mkdirSync(path.dirname(png), { recursive: true });
  await s.page.screenshot(png);
} finally { await s.close(); }
execFileSync(FF, ['-loglevel', 'error', '-y', '-i', png, '-vf', 'crop=1080:1080:0:0', '-q:v', '3', jpg]);
fs.rmSync(png);
console.log('書き出し:', path.relative(REPO, jpg), fs.statSync(jpg).size, 'bytes');
