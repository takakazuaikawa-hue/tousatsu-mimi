// プロローグ→体験ハンド→ロビーで曲が鳴っているかを調べる（2026-11-16 ユーザー：プロローグからロビーに戻ったら無音）
// 使い方: node qa/prologuebgm.mjs [local|web]   web は押した扱いの操作の前は play() を断る
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';
const mode = process.argv[2] || 'local';
const server = await serve(REPO, 0);
const browser = await launch({ width: 1280, height: 800 });
const page = await browser.newPage();
await page.setViewport(1280, 800, false);
const webBlock = `(() => { const P = HTMLMediaElement.prototype, orig = P.play;
  P.play = function () { if (!navigator.userActivation.hasBeenActive) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return orig.call(this); }; })();`;
await page.addInit(`if (!sessionStorage.getItem('__bb')) { sessionStorage.setItem('__bb','1'); try{localStorage.clear()}catch(e){} } ${mode === 'local' ? 'window.MIMI_LOCAL=true;' : webBlock}`);
await page.goto(`http://127.0.0.1:${server.port}/index.html`, 120000);
const look = (tag) => page.eval(`(() => { const q = id => { const a = document.getElementById(id); return a && !a.paused ? id.replace('-audio','') + ':' + (a.currentSrc||a.src||'').split('/').pop() + '@' + a.volume.toFixed(3) : null; };
  return JSON.stringify({ screen: state.screen, bgmOn: save.bgmOn, story: !!document.querySelector('.story-overlay'), playing: ['scene-bgm-audio','scene-bgm-audio-b','lobby-bgm-audio'].map(q).filter(Boolean) }); })()`).then(r => console.log(tag.padEnd(14), r));
const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
await sleep(5000); await look('title');
// 「はじめる」を本物の押下で（ボタンの位置を測って押す）
const pos = JSON.parse(await page.eval(`(() => { const b = document.querySelector('[data-action="start"]'); const r = b.getBoundingClientRect(); return JSON.stringify([r.x + r.width/2, r.y + r.height/2]); })()`));
await click(pos[0], pos[1]);
await sleep(4000); await look('prologue');
await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(5000); await look('intro hand');
await page.eval(`showIntroHandWinScreen()`);
await sleep(2500); await look('win screen');
const p2 = JSON.parse(await page.eval(`(() => { const b = document.querySelector('[data-action="intro-to-lobby"]'); if (!b) return 'null'; const r = b.getBoundingClientRect(); return JSON.stringify([r.x + r.width/2, r.y + r.height/2]); })()`));
if (p2) await click(p2[0], p2[1]); else console.log('no lobby button');
for (let i = 0; i < 3; i++) { await sleep(2500); await look('lobby ' + (i + 1)); }
await browser.close(); await server.close();
