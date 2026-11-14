// 設定画面の文字の折り返し・はみ出しを3つの画面で撮る（台帳7）。node qa/settingswrap.mjs   出力 qa/out/settingswrap/
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const OUT = 'qa/out/settingswrap'; fs.mkdirSync(OUT, { recursive: true });
const sess = await openSession({ width: 844, height: 390, mobile: true, speed: 1, save: { introPlayed: true, houseRulesSeen: true } });
const { page } = sess;
try {
  await sleep(2500);
  for (const [name, w, h, mob] of [['844x390', 844, 390, true], ['667x375', 667, 375, true], ['pc', 1280, 800, false]]) {
    await page.setViewport(w, h, mob); await sleep(700);
    await page.eval(`document.querySelectorAll('.settings-overlay').forEach(e => e.remove()); showSettingsModal(); 1`); await sleep(700);
    for (let i = 0; i < 4; i++) {
      await page.screenshot(`${OUT}/${name}_${i}.png`);
      const r0 = await page.eval(STD); const c = typeof r0 === 'string' ? JSON.parse(r0) : r0;
      console.log(name, i, ['tiny', 'wrap', 'orphan', 'overflowBox', 'off'].filter(k => c[k] && c[k].length).map(k => k + ':' + JSON.stringify(c[k])).join(' ') || '問題なし');
      const more = await page.eval(`(() => { const m = document.querySelector('.settings-modal'); if (m.scrollTop + m.clientHeight >= m.scrollHeight - 2) return false; m.scrollTop += m.clientHeight * .8; return true; })()`);
      if (!more) break; await sleep(400);
    }
  }
} finally { await sess.close(); }
