// 画面に出ている絵の「原寸」と「表示の大きさ」を並べる（11/23 メモリの見直し：表示より何倍も大きい絵を探す）
// W=1280 H=720 SCENE=home node qa/imgsize.mjs   SCENE: home | shop | battle
import { openSession, sleep } from './lib/session.mjs';
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const W = +(process.env.W || 1280), H = +(process.env.H || 720), SCENE = process.env.SCENE || 'home';
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, coins: 30000 } });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message);
const LIST = () => {
  const m = new Map();
  const add = (k, w, h, shown) => { const o = m.get(k) || { k, nat: w + 'x' + h, mb: w * h * 4 / 1048576, shown: 0, n: 0 }; o.shown = Math.max(o.shown, shown); o.n++; m.set(k, o); };
  document.querySelectorAll('img').forEach(i => { if (!i.naturalWidth || !i.offsetParent) return; const r = i.getBoundingClientRect(); add(i.currentSrc.replace(/^.*assets\//, '').replace(/\?.*$/, ''), i.naturalWidth, i.naturalHeight, Math.round(r.width * devicePixelRatio)); });
  return [...m.values()].sort((a, b) => b.mb - a.mb).slice(0, 30).map(o => `${o.k}  ${o.nat}  ${o.mb.toFixed(1)}MB  shown ${o.shown}px x${o.n}`).join('\n') + '\nTOTAL ' + [...m.values()].reduce((a, o) => a + o.mb * 1, 0).toFixed(0) + 'MB';
};
try {
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(3000); await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(8000);
  if (SCENE === 'shop') { await q(`document.querySelector('[data-action="open-shop"]').click()`); await sleep(5000); }
  if (SCENE === 'battle') { await q(`startBattle('velvet')`); await sleep(9000); }
  console.log(await q(`(${LIST.toString()})()`));
} finally { await close(); }
