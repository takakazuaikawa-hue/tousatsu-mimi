// 起動直後に曲が鳴っているかを調べる
// 使い方: node qa/bootbgm.mjs [local|stage|web]
//   local … MIMI_LOCAL を入れて起動（DLsite 版と同じ作り。自動再生の制限なし）
//   stage … dist/dlsite/stage/game（作った DLsite 版）を配る
//   web   … ブラウザ版。押した扱いの操作（userActivation）の前は play() を断る（Chrome の自動再生の決まりのまね）。6秒後に画面の空いた所を1回押す
// 古いセーブ（曲 OFF のまま保存）を試す時は環境変数 OLDSAVE=1
import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO, SAVE_KEY } from './lib/session.mjs';
const mode = process.argv[2] || 'local';
const root = mode === 'stage' ? path.join(REPO, 'dist/dlsite/stage/game') : REPO;
const server = await serve(root, 0);
const browser = await launch({ width: 1280, height: 800 });
const page = await browser.newPage();
await page.setViewport(1280, 800, false);
const old = process.env.OLDSAVE ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, JSON.stringify({ bgmOn: false, sfxOn: true, coins: 100, introPlayed: true }));` : '';
const webBlock = `(() => { const P = HTMLMediaElement.prototype, orig = P.play;
  P.play = function () { if (!navigator.userActivation.hasBeenActive) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return orig.call(this); }; })();`;
await page.addInit(`if (!sessionStorage.getItem('__bb')) { sessionStorage.setItem('__bb','1'); try{localStorage.clear()}catch(e){}; ${old} } ${mode === 'local' ? 'window.MIMI_LOCAL=true;' : ''} ${mode === 'web' ? webBlock : ''}`);
await page.goto(`http://127.0.0.1:${server.port}/index.html`, 120000);
for (let t = 0; t < 10; t++) {
  await sleep(1500);
  if (mode === 'web' && t === 4) {
    for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: 640, y: 60, button: 'left', clickCount: 1 });
    console.log('-- clicked');
  }
  const r = await page.eval(`(() => { const q = id => { const a = document.getElementById(id); return a && !a.paused ? id.replace('-audio','') + ':' + (a.currentSrc||a.src||'').split('/').pop() + '@' + a.volume.toFixed(3) : null; };
    return JSON.stringify({ screen: typeof state !== "undefined" && state && state.screen, bgmOn: typeof save !== "undefined" && save && save.bgmOn, playing: ['scene-bgm-audio','scene-bgm-audio-b','lobby-bgm-audio'].map(q).filter(Boolean) }); })()`);
  console.log(((t + 1) * 1.5).toFixed(1) + 's', r);
}
await browser.close(); await server.close();
