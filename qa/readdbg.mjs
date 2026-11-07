// 読み合いを1つ開いて、主な部品の位置（画面 px）を出す・撮る。
// node qa/readdbg.mjs <gameId> <opp> <psych|logic> [WxH] [out.png]
// 環境変数 WAIT=開いてから撮るまでの ms ／ UNTIL=<セレクタ> その部品が出るまで押せる物をでたらめに押す（卓にもどるは押さない）／ AFTER=出てから撮るまでの ms
import { openSession, sleep } from './lib/session.mjs';
const [gameId = 'detective', opp = 'polka', group = 'psych', size = '844x390', out = 'qa/out/readdbg.png'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const { page, close } = await openSession({ width: W, height: H, mobile: true, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, coins: 500, readIntroSeen: true, houseRulesSeen: true } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`); await sleep(4000);
for (let i = 0; i < 8; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await sleep(700); }
await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(gameId)}]; state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
await sleep(+(process.env.WAIT || 4500));

const PICK = `(() => {
  const h = document.querySelector('.read-battle-host'); if (!h) return null;
  const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
  const v = [...h.querySelectorAll('*')].filter(e => (e.tagName === 'BUTTON' || getComputedStyle(e).cursor === 'pointer') && !/卓にもどる/.test(e.textContent || '')).filter(ok);
  const e = v[Math.floor(Math.random() * v.length)]; if (!e) return null;
  const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
})()`;
if (process.env.UNTIL) {
  for (let i = 0; i < 300; i++) {
    if (await page.eval(`!!document.querySelector(${JSON.stringify(process.env.UNTIL)})`)) break;
    const w = await page.eval(PICK);
    if (w) { const o = JSON.parse(w); await page.click(o.x, o.y); }
    await sleep(250);
  }
  await sleep(+(process.env.AFTER || 1500));
}
console.log(await page.eval(`JSON.stringify(['.read-battle-host','.mb-purse','.mb-scroll','.mb-stage','.mb-opp-row','.mb-coach','.mb-game-root','.mb-result-card','.mb-wager'].map(s => { const e = document.querySelector(s); if (!e) return s + ' -'; const r = e.getBoundingClientRect(); return s + ' ' + [r.left, r.top, r.width, r.height].map(Math.round).join(',') + (e.scrollTop ? ' st=' + Math.round(e.scrollTop) : ''); }))`));
await page.screenshot(out);
await close();
