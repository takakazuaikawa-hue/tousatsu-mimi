// 異議あり！の8場面すべてを決め打ちで開き、最初の画面を測る（スクロール・はみ出し）。 node qa/objscen.mjs --size 667x375
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { BODY_SEL } from './lib/stdcheck.mjs';
const args = process.argv.slice(2); const arg = (k, d) => (args.find((a, i) => args[i - 1] === k) || d);
const sizeArg = arg('--size', '844x390'); const [W, H] = sizeArg.split('x').map(Number);
const OUT = path.resolve(arg('--out', `qa/out/textaudit/objscen-${sizeArg}`)); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync('qa/textaudit.mjs', 'utf8').split('\r').join('');
const MEASURE = new Function('rootSel', 'BODY_SEL', 'return `' + src.match(/const MEASURE = \(rootSel\) => `([\s\S]*?)`;\n\nconst PICK/)[1] + '`;');
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, coins: 500, readIntroSeen: true, houseRulesSeen: true } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
await page.eval(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); startBattle('velvet'); true`);
await sleep(4000);
for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await sleep(700); }
for (const id of ['hearts', 'redcorner', 'acespade', 'river8', 'allin', 'mirror', 'smile', 'nostraight']) {
  await page.eval(`(() => { document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); window.MB_FORCE = { objection: { id: '${id}' } }; READ_BATTLE_POOLS.velvet.psych = ['objection']; save.readIntroSeen = true; state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(3200);
  const r = await page.eval(MEASURE('.read-battle-host', BODY_SEL));
  if (!r) { console.log(id, 'nohost'); continue; }
  const small = r.texts.filter(x => x.px < 11.85), off = [...r.texts.filter(x => x.off), ...r.taps.filter(b => b.off)];
  const chars = r.texts.reduce((a, x) => a + (x.n || x.t.length), 0);
  await page.screenshot(path.join(OUT, id + '.png'));
  console.log(id, 'chars', chars, 'scroll', r.scrollOver, 'small', small.length, 'off', off.length, 'tap<44', r.taps.filter(b => b.h < 43.5 || b.w < 43.5).length);
}
await close();
