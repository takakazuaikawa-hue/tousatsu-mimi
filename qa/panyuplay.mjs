// ぱにゅぱにゅを1回通しで遊んで撮る（始め・途中・留めが外れる所・完走・判定・結果）。node qa/panyuplay.mjs [WxH] [衣装]   出力 qa/out/panyuplay/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '1280x800'; const outfit = process.argv[3] || 'bunny'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/panyuplay'); fs.mkdirSync(OUT, { recursive: true });
const PW = ['pajama', 'pajama2', 'gothic', 'jirai', 'vintage', 'nurse', 'santa', 'bikini', 'halter', 'white', 'dress'].map(x => 'pwear_' + x);
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, homeStageSeen: 3, coins: 3000, loginBonus: { lastDate: '2099-01-01', streak: 1 }, ownedItems: PW } });
const { page } = s;
const shot = async (n) => { try { await page.screenshot(path.join(OUT, `${size}_${outfit}_${n}.png`)); } catch (e) { console.log('写真失敗', n); } };
const st = () => page.eval(`JSON.stringify({ n: (document.querySelector('.pv2-meter-n')||{}).textContent, mesh: !!document.querySelector('.panyu-clicker-overlay.is-mesh'), cls: (document.querySelector('.panyu-clicker-overlay')||{}).className })`).catch(() => '?');
for (let i = 0; i < 60 && !(await page.eval('typeof goLobby === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1000);
await page.eval(`(localStorage.setItem('mimi.panyuOutfit', '${outfit}'), window.__panyuForceMode = '${process.env.MODE || ''}' || undefined, goLobby(), 1)`);
for (let i = 0; i < 40 && !(await page.eval(`!!document.querySelector('[data-action="panyu-free"]') && !document.querySelector('.loading-veil')`).catch(() => false)); i++) await sleep(800);
await sleep(1500);
await page.eval(`(document.querySelector('[data-action="panyu-free"]').click(), 1)`);
for (let i = 0; i < 30 && !(await page.eval(`!!document.querySelector('.panyu-clicker-overlay.is-mesh')`).catch(() => false)); i++) await sleep(700);
await sleep(300); await shot('01_start'); console.log('start', await st());
await sleep(2400); await shot('01b_hint'); console.log('hint', await page.eval(`JSON.stringify({ line: (document.querySelector('.pv2-hintline')||{}).textContent, clasp: (document.querySelector('.pv2-clasp')||{}).innerText, hidden: (document.querySelector('.pv2-clasp')||{}).hidden })`).catch(() => '?'));
// 胸のあたり（画面の中央、少し下）を左右交互に叩く
const tap = async (x, y) => { await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const pts = [[W * .45, H * .72], [W * .55, H * .72]];
for (let i = 0; i < 31; i++) {
  const [x, y] = pts[i % 2]; await tap(x, y); await sleep(170);
  if (i === 4) { await shot('02_tap5'); }
  if (i === 14) { await shot('03_tap15'); console.log('15', await st());
    // 留めを1つ押す（網目のページの位置から画面の位置を出す）
    const pt = await page.eval(`(() => { const f = document.querySelector('iframe.pv2-mesh'); const d = f.contentWindow.__panyuDbg; const v = d.view(); const b = d.parts[0]; const c = b.c || [(b.a[0]*2+b.b[0])/3, (b.a[1]*2+b.b[1])/3]; const r = f.getBoundingClientRect(); return JSON.stringify([r.left + v.ox + c[0]*v.s, r.top + v.oy + c[1]*v.s]); })()`).then(JSON.parse).catch(() => null);
    if (pt) { await tap(pt[0], pt[1]); await sleep(900); await shot('03b_pop'); console.log('pop', await page.eval(`(document.querySelector('.pv2-clasp')||{}).innerText`)); }
  }
  if (i === 24) { await shot('04_tap25'); }
}
await sleep(600); await shot('05_done'); console.log('done', await st());
await sleep(1200); await shot('06_capsule');
await sleep(2200); await shot('07_result'); console.log('result', await st());
const card = await page.eval(`(document.querySelector('.pv2-result')||{}).innerText || ''`).catch(() => ''); console.log('card', card.replace(/\n+/g, ' / '));
await s.close(); process.exit(0);
