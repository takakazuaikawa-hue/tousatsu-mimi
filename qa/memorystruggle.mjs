// CG集（コレクション）の「苦戦の思い出」の欄を撮る。node qa/memorystruggle.mjs <WxH> <outDir>
// セリナ戦だけ見た・ポルカ〜セリナに勝った・グラーノとヴェルベットはまだ、のセーブで見る
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number);
const out = path.resolve(process.argv[3] || 'qa/out/memorystruggle');
fs.mkdirSync(out, { recursive: true });
const tag = `${w}x${h}`;
const session = await openSession({ width: w, height: h, mobile: w < 1000, speed: 1 });
const { page } = session;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
  await page.eval(`(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ['rico_tutorial','polka','selina']; save.firstClearRewardClaimed = save.clearedStages.slice(); save.rewardCgSeen = save.clearedStages.slice(); save.struggleSeen = ['selina']; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; state = defaultState(); state.screen = 'lobby'; render(); return 1; })()`);
  await sleep(2000);
  await page.eval(`(() => { showCollectionModal(); return 1; })()`);
  await sleep(1500);
  const info = await page.eval(`(() => {
    const sec = [...document.querySelectorAll('.coll-section')].find(s => /苦戦の思い出/.test(s.textContent));
    if (!sec) return { found: false, titles: [...document.querySelectorAll('.coll-section-title')].map(t => t.textContent.trim().slice(0, 12)) };
    const body = document.querySelector('.collection-body');
    if (body) body.scrollTop = sec.offsetTop - body.offsetTop - 8;
    return { found: true, cards: [...sec.querySelectorAll('.memory-card')].map(c => (c.classList.contains('is-locked') ? '鍵 ' : '見る ') + c.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60)) };
  })()`);
  await sleep(700);
  console.log(tag, JSON.stringify(info, null, 1));
  await page.screenshot(path.join(out, `${tag}-struggle.png`));
} finally {
  await session.close();
}
