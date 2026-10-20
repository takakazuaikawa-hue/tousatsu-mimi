// 新しいセーブで「はじめから」→ プロローグ（物語の画面）を画面タップで最後まで進められるかを確かめる。
// node qa/storyprobe.mjs   出力：押すたびの文と、物語の画面が閉じたか
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 1280, height: 800 });
const { page } = s;
await sleep(6000);
const btns = await page.eval(`[...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => b.innerText.replace(/\\s+/g, ' ').trim())`);
console.log('タイトルのボタン', JSON.stringify(btns));
await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /はじめる|はじめから|始める/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return !!b; })()`);
let last = '';
for (let i = 0; i < 60; i++) {
  await sleep(1200);
  const st = await page.eval(`(() => { const ov = document.querySelector('.story-overlay'); if (!ov) return { open: false, n: 0, screen: state.screen }; const t = (ov.querySelector('.story-text') || {}).textContent || ''; const v = (ov.querySelector('.story-voice-text') || {}).textContent || ''; const m = [...ov.querySelectorAll('.story-mono p')].map(p => p.textContent).pop() || ''; return { open: true, n: document.querySelectorAll('.story-overlay').length, cls: ov.className, text: (t || v || m).slice(0, 40) }; })()`);
  if (!st.open) { console.log(i, '物語の画面は閉じた', JSON.stringify(st)); if (i > 2) break; }
  else { if (st.text !== last) console.log(i, st.n, st.cls.replace('story-overlay', '').trim(), st.text); last = st.text; }
  await page.eval(`(() => { const ov = document.querySelector('.story-overlay'); if (ov) { const r = ov.getBoundingClientRect(); ov.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.6 })); } return 1; })()`);
}
console.log('最後の画面', await page.eval(`state.screen`), '例外', s.exceptions.length);
await s.close();
