#!/usr/bin/env node
// 設定画面（音の行：BGM・効果音・キャラの声）のはみ出しと縦スクロールを、4つの画面サイズで測って撮る。
// node qa/settingsvoice.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';
const outDir = path.resolve(REPO, process.argv[2] || 'qa/out/settings');
fs.mkdirSync(outDir, { recursive: true });
const sess = await openSession({ width: 844, height: 390, mobile: true, speed: 1, clear: true });
const { page } = sess;
const ev = (e) => page.eval(e);
const R = {};
try {
  await sleep(2500);
  for (const [name, w, h, mob] of [['844x390', 844, 390, true], ['667x375', 667, 375, true], ['932x430', 932, 430, true], ['pc', 1280, 800, false]]) {
    await page.setViewport(w, h, mob);
    await sleep(700);
    await ev(`document.querySelectorAll('.settings-overlay').forEach(e => e.remove()); showSettingsModal(); 1`);
    await sleep(500);
    R[name] = JSON.parse(await ev(`(() => { const m = document.querySelector('.settings-modal'); const mr = m.getBoundingClientRect();
      const rows = [...m.querySelectorAll('.settings-modal-sound')].map(r => { const rr = r.getBoundingClientRect(); const t = r.querySelector('button').getBoundingClientRect(); const s = r.querySelector('input').getBoundingClientRect(); const l = r.querySelector('.settings-modal-label');
        return { toggleOverflow: Math.round(t.right - rr.right), sliderW: Math.round(s.width), labelWrap: l.getBoundingClientRect().height > 30, toggleH: Math.round(t.height), rowH: Math.round(rr.height) }; });
      const over = [...m.querySelectorAll('.settings-modal-group *')].filter(e => { const g = e.closest('.settings-modal-group').getBoundingClientRect(), b = e.getBoundingClientRect(); return b.width > 0 && (b.right > g.right + 1 || b.left < g.left - 1); }).map(e => e.className || e.tagName).slice(0, 6);
      const small = [...m.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length;
      const btns = [...m.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height < 43.5).length;
      return JSON.stringify({ vw: innerWidth, vh: innerHeight, modal: [Math.round(mr.left), Math.round(mr.top), Math.round(mr.right), Math.round(mr.bottom)], scrollH: m.scrollHeight, clientH: m.clientHeight, scrolls: m.scrollHeight > m.clientHeight + 1, rows, overflowEls: over, under12px: small, buttonsUnder44: btns }); })()`));
    const r = await page.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `settings_${name}.png`), Buffer.from(r.data, 'base64'));
  }
  const qa = await ev('window.__QA');
  R.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ msg: e.desc || e.text })));
} catch (e) { R.fatal = String(e && e.stack || e); }
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
await sess.close();
