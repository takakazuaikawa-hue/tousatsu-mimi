// ほろ酔い・泥酔の夜：ロビーから卓に入った時（その夜で初めて）に、夜の題名が1句ずつ（案A・酔ったミミ）で流れるか。node qa/nighttitle.mjs [幅] [高さ] [horoyoi|deisui]
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), mode = process.argv[4] || 'horoyoi';
const out = `qa/out/nighttitle/${W}x${H}`; fs.mkdirSync(out, { recursive: true });
const session = await openSession({ width: W, height: H, mobile: W < 1000 });
const { page } = session;
const ev = (js) => page.eval(`(() => { ${js}; return 1; })()`).catch(e => console.log('ERR', e.message.slice(0, 200)));
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
for (let n = 0; n < ALL.length; n++) {
  const id = ALL[n], before = JSON.stringify(ALL.slice(0, n));
  await ev(`try { localStorage.setItem('mp_deisui_dev', '1'); } catch (e) {} document.querySelectorAll('.episode-overlay,.tr-layer').forEach(e=>e.remove());
    save.coins = 900; save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.rewardCgSeen = ${JSON.stringify(ALL)}; save.episodesSeen = ${JSON.stringify(ALL)}; save.endingUnlocked = true; save.homeStageSeen = 5; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 };
    save.horoyoiMode = true; save.horoyoiCleared = ${mode === 'deisui' ? JSON.stringify(ALL) : before}; save.deisuiMode = ${mode === 'deisui'}; save.deisuiCleared = ${mode === 'deisui' ? before : '[]'};
    state = defaultState(); state.screen = 'lobby'; render(); startBattle('${id}')`);
  let ok = false;
  for (let k = 0; k < 30 && !ok; k++) { await sleep(500); ok = await page.eval(`!!document.querySelector('.episode-overlay .tr-layer')`); }
  await sleep(1400);
  const info = await page.eval(`JSON.stringify({ night: isDeisui() ? '泥酔' : (isHoroyoi() ? 'ほろ酔い' : 'なし'), ctr: (document.querySelector('.tr-ctr')||{}).textContent || '', one: ((document.querySelector('.tr-one')||{}).textContent || '').slice(0, 30), chibi: ((document.querySelector('.tr-chibi')||{}).getAttribute?.('src') || '') })`);
  console.log(id, ok ? '流れた' : '流れない', info);
  await page.screenshot(`${out}/${mode}_${id}_1.png`);
  await ev(`document.querySelector('.tr-layer')?.click()`); await sleep(1500);
  await page.screenshot(`${out}/${mode}_${id}_2.png`);
  await ev(`document.querySelector('.tr-skip')?.click()`); await sleep(900);
  console.log('   終わり:', await page.eval(`JSON.stringify({ card: !!document.querySelector('.episode-overlay:not(.is-reading) .episode-card'), no: (document.querySelector('.episode-no')||{}).textContent?.slice(0, 40) })`));
  await page.screenshot(`${out}/${mode}_${id}_end.png`);
}
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
