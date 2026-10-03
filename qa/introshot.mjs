// 研修（初日の3ハンド）を自動で進め、リコ先輩の吹き出しが出るたびに撮る。
// 吹き出しが「話題の札・セリフ帯・押すボタン」を隠していないかを数値でも出す。
// node qa/introshot.mjs [width height] [out] [match]   match=撮る吹き出しの文の一部（正規表現、省略で全部）
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W = 1280, H = 800, out = 'qa/out/intro', match = ''] = process.argv.slice(2);
const re = match ? new RegExp(match) : null;
const { page, close } = await openSession({ width: +W, height: +H, mobile: +W < 768, speed: 1, save: { clearedStages: [], introPlayed: false, coins: 0 } });
await sleep(2000);
await page.eval(`(() => { startIntroHand(); return true; })()`);
let n = 0, last = '';
const report = [];
for (let step = 0; step < 400; step++) {
  await sleep(400);
  const s = await page.eval(`(() => {
    const L = document.querySelector('.coach-layer');
    if (!L) return { none: true, screen: state && state.screen, intro: state && state.introHandMode, win: !!document.querySelector('.intro-win-overlay') };
    const card = L.querySelector('.coach-card').getBoundingClientRect();
    const hit = (sel) => [...document.querySelectorAll(sel)].map(e => { const q = e.getBoundingClientRect(); const ox = Math.min(card.right, q.right) - Math.max(card.left, q.left), oy = Math.min(card.bottom, q.bottom) - Math.max(card.top, q.top); return ox > 0 && oy > 0 && q.width > 2 ? Math.round(ox * oy / (q.width * q.height) * 100) : 0; }).reduce((a, b) => Math.max(a, b), 0);
    return { text: L.querySelector('.coach-text').textContent, kind: L.className, target: L.dataset.target || '',
      covers: { board: hit('.community-cards'), myhand: hit('.v2-myhand'), band: hit('.v2-band'), go: hit('.verb-btn.is-intro-go'), face: hit('.emote-cutin .ec-face-wrap') } };
  })()`);
  if (s.none) { if (s.win || !s.intro) break; continue; }
  if (s.text !== last) {
    last = s.text; n++;
    await sleep(500); // 吹き出しと顔の出入りが落ち着くのを待つ
    const covered = Object.entries(s.covers).filter(([, v]) => v >= 15).map(([k, v]) => k + v + '%');
    report.push(`${String(n).padStart(2)} ${covered.length ? '隠す:' + covered.join(',') : 'OK'}  [${s.target}] ${s.text}`);
    if (!re || re.test(s.text)) await page.screenshot(path.resolve(`${out}_${W}_${String(n).padStart(2, '0')}.png`));
  }
  // 進める：タップ型は吹き出しを押す、待ち型は光るボタンを押す、2択は1つ目
  await page.eval(`(() => {
    const L = document.querySelector('.coach-layer'); if (!L) return;
    if (L.classList.contains('is-choice')) { const b = [...L.querySelectorAll('.coach-choice')].find(b => !b.disabled && /強がり|ブラフ|ウソ/.test(b.textContent)) || L.querySelector('.coach-choice:not([disabled])'); if (b) b.click(); return; }
    if (L.classList.contains('is-wait')) { const g = document.querySelector('.is-intro-go'); if (g) g.click(); return; }
    L.click();
  })()`);
}
console.log(report.join('\n'));
console.log(await page.eval(`JSON.stringify({ errors: (window.__QA && window.__QA.errors || []).slice(0, 3) })`));
await close();
