// 卓の相手の絵が真ん中にいるかを測る：絵の要素の中心・絵の中の人（不透明な所）の中心・卓（場札）の中心。node qa/oppcenter.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const size = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const session = await openSession({ width: size[0], height: size[1], mobile: size[0] < 1000, speed: 2 });
const { page } = session;
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 160));
for (let i = 0; i < 60 && !(await q('typeof render === "function" && typeof save === "object"')); i++) await sleep(500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
await q(`(() => { save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; return 1; })()`);
for (const id of ['polka', 'selina', 'grano', 'velvet', 'rico_tutorial']) {
  await q(`(() => { state = defaultState(); startBattle(${JSON.stringify(id)}); return 1; })()`);
  for (let i = 0; i < 30 && (await q('state.screen')) !== 'battle'; i++) { await q(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦へ/.test(b.innerText)); if (b) b.click(); else document.body.click(); return 1; })()`); await sleep(700); }
  await sleep(2500);
  const r = await q(`(async () => {
    const img = document.querySelector('.char-opponent img, .v2-opp img, .char-opponent');
    if (!img) return 'noimg';
    const R = img.getBoundingClientRect();
    let bx = null;
    if (img.tagName === 'IMG' && img.naturalWidth) {
      const c = document.createElement('canvas'); c.width = 200; c.height = Math.round(200 * img.naturalHeight / img.naturalWidth);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); const d = g.getImageData(0, 0, c.width, c.height).data;
      let sx = 0, n = 0; for (let y = 0; y < c.height * 0.45; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 128) { sx += x; n++; }
      bx = n ? +(sx / n / c.width).toFixed(3) : null;   // 上半分（顔と胸）の不透明な所の横の中心（0〜1）
    }
    const cc = document.querySelector('.community-cards')?.getBoundingClientRect();
    const nm = document.querySelector('.v2-opp-name, .opp-name, .v2-oppname')?.getBoundingClientRect();
    return JSON.stringify({ src: (img.currentSrc || img.src || '').split('/').pop(), elCx: Math.round(R.x + R.width / 2), elW: Math.round(R.width), personCx: bx == null ? null : Math.round(R.x + R.width * bx), artCenter: bx, cardsCx: cc ? Math.round(cc.x + cc.width / 2) : null, nameCx: nm ? Math.round(nm.x + nm.width / 2) : null, vw: innerWidth });
  })()`);
  console.log(id, r, await q(`JSON.stringify([".battle-screen", ".v2-opp", ".char-opponent", ".t8-idle", ".char-opponent img", "#stage"].map(s => { const e = document.querySelector(s); if (!e) return s + ":none"; const R = e.getBoundingClientRect(); return s + ":" + Math.round(R.x) + "+" + Math.round(R.width); }))`));
}
await session.close();
