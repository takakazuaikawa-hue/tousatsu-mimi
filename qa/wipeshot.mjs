// 画面切り替えの幕と、ホームのミミの名札（プロフィールが開くか）を撮る
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/wipeshot.mjs [pc|phone]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const phone = process.argv[2] === 'phone';
const OUT = path.resolve('qa/out/wipeshot' + (phone ? '_phone' : '')); fs.mkdirSync(OUT, { recursive: true });
const session = await openSession({ width: phone ? 844 : 1280, height: phone ? 390 : 800, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { state.screen = 'lobby'; render(); return true; })()`);
await sleep(2500);
await page.screenshot(path.join(OUT, '0_lobby.png'));
// ミミの名札
const np = await page.eval(`(() => { const b = document.querySelector('.h15-nameplate'); if (!b) return 'none'; b.click(); return b.tagName; })()`);
await sleep(800);
const prof = await page.eval(`!!document.querySelector('.char-profile-overlay')`);
await page.screenshot(path.join(OUT, '1_profile.png'));
await page.eval(`(() => { document.querySelectorAll('.char-profile-overlay').forEach(e => e.remove()); return true; })()`);
// 切り替え
await page.eval(`(() => { state.screen = 'title'; render(); return true; })()`); await sleep(1500);
await page.eval(`(() => { state.screen = 'shop'; render(); return true; })()`);
for (const t of [60, 180, 320, 520, 900]) { await sleep(t === 60 ? 60 : 120); await page.screenshot(path.join(OUT, `2_wipe_${t}.png`)); }
const errors = await page.eval('JSON.stringify(window.__QA ? window.__QA.errors : [])');
console.log('nameplate', np, 'profile', prof); console.log('errors', errors.slice(0, 600));
await session.close();
