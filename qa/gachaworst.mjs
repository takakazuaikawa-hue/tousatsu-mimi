// 心の声ガチャの一番中身が多い状態（3回引いて、3回目が SSR）を決め打ちで作り、各段階と「詳しく」を開いた状態を測る。
// node qa/gachaworst.mjs --size 844x390 [--out dir] [--game gacha]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { BODY_SEL } from './lib/stdcheck.mjs';
const args = process.argv.slice(2);
const arg = (k, d) => (args.find((a, i) => args[i - 1] === k) || d);
const sizeArg = arg('--size', '844x390'); const [W, H] = sizeArg.split('x').map(Number);
const OUT = path.resolve(arg('--out', `qa/out/textaudit/gachaworst-${sizeArg}`)); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync('qa/textaudit.mjs', 'utf8').split('\r').join('');
const MEASURE = new Function('rootSel', 'BODY_SEL', 'return `' + src.match(/const MEASURE = \(rootSel\) => `([\s\S]*?)`;\n\nconst PICK/)[1] + '`;');
const m = (sel) => MEASURE(sel, BODY_SEL);
const { page, close } = await openSession({ width: W, height: H, mobile: W < 900, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, coins: 500, readIntroSeen: true, houseRulesSeen: true } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
await page.eval(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); startBattle('polka'); true`);
await sleep(4000);
for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await sleep(700); }
await page.eval(`(() => { window.MB_FORCE = { gacha: { truth: 'strong', rolls: ['N', 'SR', 'SSR'] } }; READ_BATTLE_POOLS.polka.psych = ['gacha']; save.readIntroSeen = true; state.psychPending = true; startReadBattle('psych'); return true; })()`);
await sleep(3000);
const rows = [];
const measure = async (name) => {
  for (const open of [false, true]) {
    await page.eval(`document.querySelectorAll('.read-battle-host details.mb-more').forEach(d => d.open = ${open}); true`); await sleep(300);
    const r = await page.eval(MEASURE_SRC('.read-battle-host'));
    if (!r) { rows.push({ name, open, err: 'no host' }); continue; }
    const small = r.texts.filter(x => x.px < 11.85), bodySmall = r.texts.filter(x => x.body && x.px >= 11.85 && x.px < 13.85);
    const smallTap = r.taps.filter(b => b.h < 43.5 || b.w < 43.5), off = [...r.texts.filter(x => x.off), ...r.taps.filter(b => b.off)];
    const chars = r.texts.reduce((a, x) => a + (x.n || x.t.length), 0);
    const shot = `${name}${open ? '_open' : ''}.png`; await page.screenshot(path.join(OUT, shot));
    rows.push({ name, open, chars, scroll: r.scrollOver, small: small.map(x => x.sel + ' ' + x.px + ' ' + x.t), bodySmall: bodySmall.length, smallTap: smallTap.map(b => b.t + ' ' + b.w + 'x' + b.h), off: off.map(o => o.t || o.sel) });
  }
  await page.eval(`document.querySelectorAll('.read-battle-host details.mb-more').forEach(d => d.open = false); true`);
};
function MEASURE_SRC(sel) { return MEASURE(sel, BODY_SEL); }
await measure('0_start');
for (let k = 1; k <= 3; k++) {
  await page.eval(`(() => { const b = document.querySelector('#mb-gc-pull'); if (b && !b.disabled) b.click(); return true; })()`);
  await sleep(k === 3 ? 7500 : 5200);
  await measure(`${k}_pull`);
}
await page.eval(`(() => { const b = document.querySelector('#mb-gc-stop'); if (b && !b.disabled) b.click(); return true; })()`);
await sleep(1200); await measure('4_decide');
await page.eval(`(() => { const b = document.querySelector('#mb-gc-decide button'); if (b) b.click(); return true; })()`);
await sleep(1500); await measure('5_wager');
for (const r of rows) console.log(r.name + (r.open ? '(open)' : ''), 'chars', r.chars, 'scroll', r.scroll, 'small', JSON.stringify(r.small), 'bodySmall', r.bodySmall, 'tap', JSON.stringify(r.smallTap), 'off', JSON.stringify(r.off), r.err || '');
fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 1));
await close();
