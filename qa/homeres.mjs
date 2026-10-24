// ホームの絵ごとに「元の絵の大きさ」と「画面に出ている大きさ×画素の細かさ」を比べる。足りない（倍率<1）ほど粗く見える
import { openSession, sleep } from './lib/session.mjs';
const mode = process.argv[2] || 'pc';
const [w, h, dpr] = { pc: [1600, 900, 1.5], phone: [844, 390, 3] }[mode];
const session = await openSession({ width: w, height: h, mobile: mode !== 'pc', speed: 2, deviceScaleFactor: dpr });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.clearedStages = ['rico_tutorial','polka']; state.screen = 'lobby'; render(); return 1; })()`);
await sleep(9000);
const r = await page.eval(`(async () => {
  const out = [], seen = new Set();
  const add = async (el, url) => {
    if (!url || seen.has(url + el.className)) return; seen.add(url + el.className);
    const im = new Image(); im.src = url; try { await im.decode(); } catch (e) { return; }
    const b = el.getBoundingClientRect(); if (b.width < 8) return;
    const need = Math.max(b.width, b.height * im.naturalWidth / im.naturalHeight) * ${dpr};
    out.push({ f: url.split('/').slice(-2).join('/').split('?')[0], nat: im.naturalWidth + 'x' + im.naturalHeight, shown: Math.round(b.width) + 'x' + Math.round(b.height), ratio: +(im.naturalWidth / need).toFixed(2) });
  };
  for (const el of document.querySelectorAll('#app *')) {
    if (el.tagName === 'IMG') await add(el, el.currentSrc || el.src);
    const bg = getComputedStyle(el).backgroundImage; const m = bg && bg.match(/url\("?([^")]+)"?\)/); if (m) await add(el, m[1]);
  }
  return JSON.stringify(out.sort((a, b) => a.ratio - b.ratio));
})()`);
for (const x of JSON.parse(r)) console.log(mode, x.ratio.toFixed(2), x.f, x.nat, '→', x.shown);
await session.close();
