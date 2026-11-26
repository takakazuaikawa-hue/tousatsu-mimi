// ロビー左のメニュー（名札＋5枚の札）を撮って、文字が赤い面の真ん中にあるか・はみ出していないか・画面上の字の大きさを測る。
// node qa/lobbymenu.mjs [名前]   出力 qa/out/lobbymenu/<名前>_<WxH>.png
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const tag = process.argv[2] || 'now';
const OUT = path.resolve(process.env.QA_OUT || 'qa/out/lobbymenu'); fs.mkdirSync(OUT, { recursive: true });
const SAVE = { clearedStages: ['rico_tutorial', 'polka'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, homeStageSeen: 2, coins: 3000, loginBonus: { lastDate: '2099-01-01', streak: 1 }, firstClearRewardClaimed: ['rico_tutorial', 'polka'], rewardCgSeen: ['rico_tutorial', 'polka'], episodesSeen: ['rico_tutorial', 'polka'] };
for (const size of ['1280x800', '844x390']) {
  const [W, H] = size.split('x').map(Number);
  const s = await openSession({ width: W, height: H, save: SAVE });
  const { page } = s;
  for (let i = 0; i < 60 && !(await page.eval('typeof goLobby === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`(goLobby(), 1)`);
  for (let i = 0; i < 30 && !(await page.eval(`!!document.querySelector('.h15-places .h15-pl') && !document.querySelector('.loading-veil')`).catch(() => false)); i++) await sleep(1000);
  await sleep(1500);
  for (let i = 0; i < 3; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /受け取る|閉じる/.test(b.textContent) && b.offsetParent && b.closest('[class*=overlay], [class*=modal], [class*=bonus]')); if (b) b.click(); return 1; })()`).catch(() => 0); await sleep(1200); }
  if (process.env.QA_CSS) await page.eval(`(() => { const st = document.createElement('style'); st.textContent = ${JSON.stringify(fs.readFileSync(process.env.QA_CSS, 'utf8'))}; document.head.appendChild(st); return 1; })()`);
  await sleep(1500);
  const info = await page.eval(`JSON.stringify([...document.querySelectorAll('.h15-nameplate, .h15-places .h15-pl')].map(p => { const l = p.querySelector('.h15-lbl'); const lr = l.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(l); const tr = rg.getBoundingClientRect(); const pr = p.getBoundingClientRect(); return { t: l.textContent.trim(), textCenter: +((tr.left + tr.width / 2 - pr.left) / pr.width * 100).toFixed(1), boxCenter: +((lr.left + lr.width / 2 - pr.left) / pr.width * 100).toFixed(1), overflow: Math.round(tr.width - lr.width), screenPx: +(parseFloat(getComputedStyle(l).fontSize) * tr.height / (parseFloat(getComputedStyle(l).fontSize) * 1.0) ).toFixed(1), glyphH: Math.round(tr.height) }; }))`);
  console.log(tag, size, info);
  try { await page.screenshot(path.join(OUT, `${tag}_${size}.png`)); } catch (e) { console.log('写真失敗', e.message); }
  await s.close();
}
process.exit(0);
