// 各話の扉絵：題字の表示中は動画が流れず、背景クリックで絵だけ表示した時に再生されるかを確かめる
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/epmotion.mjs [key]
import path from 'node:path';
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';

const key = process.argv[2] || 'polka';
const OUT = path.resolve('qa/out/epmotion'); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof showEpisodeTitle === "function"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { showEpisodeTitle(${JSON.stringify(key)}, () => {}); return true; })()`);
await sleep(4000);
const before = await page.eval(`JSON.stringify({ art: !!document.querySelector('.episode-overlay.has-art'), video: !!document.querySelector('.episode-overlay > video.motion-bg') })`);
await page.screenshot(path.join(OUT, '1_title.png'));
await page.eval(`(() => { const o = document.querySelector('.episode-overlay'); o.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; })()`);
await sleep(1500);
const after = await page.eval(`JSON.stringify((() => { const v = document.querySelector('.episode-overlay > video.motion-bg'); return { artOnly: document.querySelector('.episode-overlay').classList.contains('art-only'), video: !!v, playing: v ? (!v.paused && v.currentTime > 0) : false, t: v ? v.currentTime : null }; })())`);
await page.screenshot(path.join(OUT, '2_art_only.png'));
const errors = await page.eval('JSON.stringify(window.__QA ? window.__QA.errors : [])');
console.log('before', before); console.log('after', after); console.log('errors', errors.slice(0, 500));
await session.close();
