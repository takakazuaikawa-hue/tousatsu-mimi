// お手本の止まる所を全部撮る（2026-11-17）。node qa/reading-demo7-shots.mjs [WxH=844x390] [all|onedari|mekiki:grano|igi|mise|furi:polka ...]
// 撮る物：リコの吹き出し（.rico.on）の文が変わるたびに1枚／ふりは指の印と決める所も／最後に4点の札。各写真の画面の文字（盤の中の見える文字）を .txt に書き出す（初めての人の目で読む用）。
// 等速。ふりだけは、プレイヤーの操作（チップを押す・払う）を入れる。
import { openSession, sleep } from './lib/session.mjs';
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2);
const size = /^\d+x\d+$/.test(args[0] || '') ? args.shift() : '844x390';
const [W, H] = size.split('x').map(Number);
const list = (args.length && args[0] !== 'all') ? args : ['onedari', 'mekiki:grano', 'mekiki:selina', 'mekiki:velvet', 'igi', 'mise', 'furi:polka', 'furi:grano'];
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, seed: 7, save: { introPlayed: true, houseRulesSeen: true, readIntroSeen: true, clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'] } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('!!window.RD && !!RD.games.onedari && !!RD.games.furi').catch(() => false)); i++) await sleep(500);
await sleep(1500);
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
// 盤の中の、いま見えている文字（上から順）
const TEXT = `const out = []; const root = document.querySelector('.qa-demo-host .sg.demo'); if (!root) return '[]';
  const vis = (e) => { for (let x = e; x && x !== root.parentNode; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.2) return false; } return true; };
  for (const e of root.querySelectorAll('*')) { const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (!own) continue; if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; out.push({ y: Math.round(r.top), x: Math.round(r.left), t: (e.innerText || own).replace(/\\s+/g, ' ').trim(), c: String(e.className || e.tagName).slice(0, 24) }); }
  const seen = new Set(); return JSON.stringify(out.sort((a, b) => a.y - b.y || a.x - b.x).filter(o => { if (seen.has(o.t)) return false; seen.add(o.t); return true; }));`;
const report = [];
for (const item of list) {
  const [game, ck0] = item.split(':'); const ck = ck0 || (game === 'mekiki' ? 'grano' : 'polka');
  const tag = `demo7_${game}${ck0 ? '_' + ck0 : ''}_${W}x${H}`;
  await ev(`
    const R = { T: 10, J: 11, Q: 12, K: 13, A: 14 }; const cv = (t) => ({ r: R[t[0]] || +t[0], s: t[1] }); const cvs = (str) => str.trim().split(' ').filter(Boolean).map(cv);
    const GAME = ${JSON.stringify(game)}, CK = ${JSON.stringify(ck)};
    const stage = document.getElementById('stage') || document.body;
    const host = document.createElement('div'); host.className = 'read-battle-host rd-wrap qa-demo-host'; stage.appendChild(host);
    const T = { mekiki: { board: cvs('Ac 7d 4s 9h 2d'), her: cvs('Ah Js'), mine: cvs('Kd Qc') }, igi: { board: cvs('Ks 9h 4h 2c 7d'), her: cvs('Qh 6h'), mine: cvs('Ad Jc'), toCall: 300 }, furi: { board: cvs('Ks 9d 6c 4h 2s'), her: cvs('Qh Jh'), mine: cvs('9s 8s'), toCall: 600, pot: 1200 } }[GAME] || {};
    const extra = GAME === 'onedari' ? { mode: 'demo', scene: Object.assign({}, RD.onedariEngine.DEMO) } : GAME === 'mekiki' ? { mode: 'demo' } : GAME === 'mise' ? { scene: Object.assign({}, RD.miseEngine.DEMO) } : {};
    window.__qaInst = RD.mount(host, Object.assign({ game: GAME, charKey: CK, drunk: GAME === 'onedari' || GAME === 'mise', table: T, ctx: { charKey: CK, intent: 'bluff', toCall: 300, pot: 600 }, save: {}, saveProgress() {}, volume: 0, onExit() {} }, extra));
    return 1;`);
  let last = '', n = 0, tapped = false, picked = false; const t0 = Date.now(); const shots = [];
  const snap = async (name) => {
    n++; const f = path.join(OUT, `${tag}_${String(n).padStart(2, '0')}_${name}.png`);
    await page.screenshot(f);
    const tx = JSON.parse(await ev(TEXT));
    shots.push({ f: path.basename(f), name, text: tx.map(o => o.t) });
  };
  while (Date.now() - t0 < 90000) {
    const st = JSON.parse(await ev(`const r = document.querySelector('.qa-demo-host .sg.demo'); if (!r) return JSON.stringify({ none: true });
      const rc = r.querySelector('.rico'); const on = rc && rc.classList.contains('on');
      return JSON.stringify({ rico: on ? (rc.querySelector('.rsay') || {}).textContent : '', panel: !!r.querySelector('.panel.on'), lane: !!r.querySelector('.lane.on'), opts: !!r.querySelector('.opts.on'), pile: !!r.querySelector('.pile') });`));
    if (st.none) { await sleep(150); continue; }
    if (st.panel) { await sleep(400); await snap('card4'); break; }
    if (st.rico && st.rico !== last) { last = st.rico; await sleep(350); await snap('stop'); }
    if (game === 'furi' && st.lane && !tapped && Date.now() - t0 > 2500) {
      if (!shots.some(x => x.name === 'hint')) await snap('hint');
      tapped = true;
      await ev(`const p = document.querySelector('.qa-demo-host .sg.demo .pile'); const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); return 1;`);
      await sleep(800);
      await ev(`const p = document.querySelector('.qa-demo-host .sg.demo .pile'); if (p) { const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); } return 1;`);
    }
    if (game === 'furi' && st.opts && !picked) {
      const en = await ev(`const b = document.querySelector('.qa-demo-host .sg.demo .opt[data-a="払う"]'); return !!(b && !b.disabled);`);
      if (en === true) { await sleep(1200); await snap('pick'); picked = true; await ev(`document.querySelector('.qa-demo-host .sg.demo .opt[data-a="払う"]').click(); return 1;`); }
    }
    await sleep(120);
  }
  await ev(`const b = document.querySelector('.qa-demo-host .sg.demo .pgo'); if (b) b.click(); return 1;`);
  await sleep(500);
  await ev(`try { window.__qaInst.destroy(); } catch (e) {} document.querySelectorAll('.qa-demo-host').forEach(e => e.remove()); return 1;`);
  console.log(`== ${item} ${W}x${H}`);
  for (const x of shots) console.log(`  ${x.f}\n     ${x.text.join(' ／ ')}`);
  report.push({ item, shots });
  await sleep(600);
}
fs.writeFileSync(path.join(OUT, `demo7_shots_${W}x${H}.json`), JSON.stringify(report, null, 1));
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.filter(e => !/cancel/.test(e.msg)).slice(0, 5)')));
await s.close();
