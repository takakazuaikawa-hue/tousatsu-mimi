// 講義の問いに答えた時、リコ先輩の正解・不正解の声が鳴るか（window.__voiceLog）。node qa/lecturevoice.mjs
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 844, height: 390, mobile: true, seed: 1, save: { clearedStages: [], introPlayed: true, houseRulesSeen: true, coins: 500 } });
const { page } = s;
const click = (re) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && ${re}.test(b.textContent)); if (b) { b.click(); return true; } return false; })()`);
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1200);
  await page.click(400, 200); await sleep(300);
  await page.eval(`MimiVoice.loadManifest(); startBattle('rico_tutorial'); true`); await sleep(2500);
  await click('/ライトコースで始める/'); await sleep(1500);
  const got = [];
  for (let i = 0; i < 40 && got.length < 2; i++) {
    const has = await page.eval(`!!document.querySelector('[data-bind="psychChoices"] button:not([disabled])')`);
    if (has) {
      await page.eval(`window.__voiceLog.length = 0; const bs = [...document.querySelectorAll('[data-bind="psychChoices"] button:not([disabled])')]; bs[${got.length === 0 ? 0 : 1}].click(); true`);
      await sleep(3500);
      got.push(await page.eval(`JSON.stringify(window.__voiceLog.map(l => l.id))`));
    } else { if (i % 5 === 0) console.log(i, await page.eval(`[...document.querySelectorAll('button, [data-choice], .psych-choice')].filter(b => b.offsetParent && !b.disabled).map(b => (b.className.split(' ')[0] || '') + ':' + b.textContent.trim().slice(0, 10)).join(' | ')`)); await click('/開始|始める|次へ|つぎへ|進む|OK|わかった|閉じる/'); await sleep(900); }
  }
  console.log('答えた後に鳴った声', got.join(' ／ '));
  console.log('例外', JSON.stringify(s.exceptions.slice(0, 3)));
} finally { await s.close(); }
