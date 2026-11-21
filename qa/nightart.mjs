// 夜（ほろ酔い）の酔った版の絵の検査（2026-11-16）：夜の卓の色替えミミ・酔った泣き顔のカットイン・夜のプロフィールの立ち絵
// node qa/nightart.mjs [outDir]   3つの大きさ（844x390・667x375・1280x800）で撮る
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve(process.argv[2] || 'qa/out/nightart'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SIZES = [[844, 390, true], [667, 375, true], [1280, 800, false]];
const skin = process.env.SKIN || 'pink';
for (const [w, h, mobile] of SIZES) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(String(w))) continue;   // ONLY=1280 などで1つだけ
  const save = { clearedStages: ALL, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000, horoyoiMode: true, ownedItems: ['mimi_skin_pink', 'mimi_skin_panda', 'mimi_skin_gold'], equippedMimiSkin: skin };
  const s = await openSession({ width: w, height: h, mobile, speed: 2, save });
  const ev = (js) => s.page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
  const tag = `${w}x${h}`;
  try {
    for (let i = 0; i < 80 && !(await s.page.eval('typeof render === "function" && typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
    await sleep(1500);
    await ev(`const b = [...document.querySelectorAll('button')].find(b => /受け取る/.test(b.textContent) && b.offsetParent); if (b) b.click(); goLobby(); return 1;`); await sleep(1500);
    // 夜のプロフィール：6人
    for (const id of ['mimi'].concat(ALL)) {
      await ev(`document.querySelectorAll('.modal-overlay, .login-bonus-overlay, .char-profile-overlay').forEach(e => e.remove()); showCharacterProfile(${JSON.stringify(id)}); return 1;`); await sleep(1600);
      console.log(tag, 'プロフィール', id, await ev(`const i = document.querySelector('.cp-art img'); return i ? i.getAttribute('src').split('/').pop() + ' ' + i.naturalWidth + 'x' + i.naturalHeight : 'なし';`));
      if (id === 'mimi' || id === 'polka') await s.page.screenshot(path.join(OUT, `${tag}_profile_${id}.png`));
    }
    await ev(`document.querySelectorAll('.char-profile-overlay').forEach(e => e.remove()); return 1;`);
    // 夜の卓
    await ev(`const hb = [...document.querySelectorAll('button, [data-action]')].find(b => /ほろ酔いの卓へ/.test(b.textContent) && b.offsetParent); if (hb) hb.click(); else startBattle('rico_tutorial'); return 1;`); await sleep(3000);
    for (let i = 0; i < 25 && !(await ev("return (state.playerHand || []).length === 2 && !!document.querySelector('.battle-mimi-img')")); i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /受け取る|開始|次へ|スキップ|閉じる/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(900); }
    await sleep(1500);
    console.log(tag, '夜の卓のミミ', await ev(`const i = document.querySelector('.battle-mimi-img, [data-mimi-face]'); const f = document.querySelector('.v2-com-rico .v2-rico-face img'); if (f) console.log(f.getAttribute('src')); return JSON.stringify({ src: i && i.getAttribute('src'), w: i && i.naturalWidth, horoyoi: state.horoyoi, voiceFace: f && f.getAttribute('src') });`));
    await s.page.screenshot(path.join(OUT, `${tag}_table.png`));
    // 酔った泣き顔のカットイン
    await ev(`const c = buildEmoteFaceCard('mimi', { expr: 'bawl' }, true, {}); document.body.appendChild(c); requestAnimationFrame(() => c.classList.add('on')); return 1;`); await sleep(1800);
    console.log(tag, 'カットイン', await ev(`const i = document.querySelector('.emote-cutin img'); return i ? i.getAttribute('src').split('/').pop() + ' ' + i.naturalWidth : 'なし';`));
    await s.page.screenshot(path.join(OUT, `${tag}_cutin.png`));
    const errs = JSON.parse(await s.page.eval('JSON.stringify(window.__QA.errors)'));
    console.log(tag, '例外', s.exceptions.length + errs.length, JSON.stringify(s.exceptions.concat(errs)).slice(0, 300));
  } finally { await s.close(); }
}
