// 読み合い11種の「画面に収まるか」監査（コードは変更しない）。1280x800 で実際に最後まで遊び、
// 手順が変わるたびに scroller のはみ出し量・各ブロックの高さ・ボタンが切れていないかを測る。
// node qa/readfit.mjs [gameId ...]      出力: qa/out/readfit/readfit.json / readfit.md / <game>_<n>.png
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const OUT = path.resolve('qa/out/readfit');
fs.mkdirSync(OUT, { recursive: true });
const GAMES = [
  ['detective', 'polka', 'psych'], ['stare', 'polka', 'psych'], ['doubt', 'polka', 'psych'], ['gacha', 'polka', 'psych'], ['objection', 'velvet', 'psych'],
  ['handbuild', 'polka', 'logic'], ['highlow', 'polka', 'logic'], ['danger', 'selina', 'logic'], ['sniper', 'selina', 'logic'], ['outs', 'grano', 'logic'], ['suspects', 'velvet', 'logic'],
];
const only = process.argv.slice(2);
const MAX_SHOTS = 14;

// ステージ座標(1280x800)へ換算して測る
const MEASURE = `(() => {
  const h = document.querySelector('.read-battle-host'); if (!h) return null;
  const st = document.getElementById('stage'); const sr = st.getBoundingClientRect(); const k = sr.width / st.offsetWidth;
  const bx = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: +((r.left - sr.left) / k).toFixed(1), y: +((r.top - sr.top) / k).toFixed(1), w: +(r.width / k).toFixed(1), h: +(r.height / k).toFixed(1) }; };
  const sc = h.querySelector('.mb-scroll'); const scr = sc.getBoundingClientRect(); const root = h.querySelector('.mb-game-root');
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width >= 4 && r.height >= 4 && !e.closest('[hidden]') && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const blocks = [...root.children].filter(vis).map(e => ({ sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : ''), ...bx(e) }));
  const cand = [...h.querySelectorAll('button, [role=button]')].filter(e => vis(e));
  const btns = cand.map(e => {
    const r = e.getBoundingClientRect(); const inScroll = sc.contains(e);
    const top = (r.top - scr.top) / k, bot = (r.bottom - scr.top) / k; const vh = sc.clientHeight / k; const st0 = sc.scrollTop / k;
    const fits = (t, b) => t >= -0.5 && b <= vh + 0.5;
    return { text: (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 16), cls: (e.className || '').toString().slice(0, 30), inScroller: inScroll, disabled: !!e.disabled, ...bx(e),
      fitsNow: inScroll ? fits(top, bot) : true, fitsAtTop: inScroll ? fits(top + st0, bot + st0) : true };
  });
  const layerBtn = btns.filter(b => !b.inScroller);
  return {
    scale: +k.toFixed(3), scrollH: +(sc.scrollHeight / k).toFixed(1), clientH: +(sc.clientHeight / k).toFixed(1), scrollTop: +(sc.scrollTop / k).toFixed(1),
    overflow: +((sc.scrollHeight - sc.clientHeight) / k).toFixed(1),
    purse: bx(h.querySelector('.mb-purse')), scroller: bx(sc), oppRow: bx(h.querySelector('.mb-opp-row')), coach: bx(h.querySelector('.mb-coach')), gameRoot: bx(root), stage: bx(h.querySelector('.mb-stage')),
    blocks, buttons: btns, steps: [...h.querySelectorAll('.steps .step.on')].map(e => e.textContent.trim()),
    flags: { wager: !!h.querySelector('.mb-wager'), result: !!h.querySelector('.mb-result'), intro: !!h.querySelector('.mb-intro') },
    sig: [...btns.filter(b => !b.disabled).map(b => b.text)].join('|') + '#' + [...h.querySelectorAll('.steps .step.on')].map(e => e.textContent.trim()).join(',') + '#' + (h.querySelector('.mb-wager') ? 'W' : '') + (h.querySelector('.mb-result') ? 'R' : ''),
  };
})()`;

const PICK = `(() => {
  const h = document.querySelector('.read-battle-host'); if (!h) return 'gone';
  const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled || e.closest('[hidden]')) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
  const all = [...h.querySelectorAll('*')].filter(e => e.tagName === 'BUTTON' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')));
  let vis = all.filter(ok);
  const off = all.filter(e => !ok(e) && e.getBoundingClientRect().width > 4 && !e.disabled);
  if (!vis.length && off.length) { off[0].scrollIntoView({ block: 'center' }); vis = all.filter(ok); }
  const ex = vis.find(e => /卓にもどる/.test(e.textContent || '')); if (ex) { ex.click(); return 'exit'; }
  const bt = vis.filter(e => e.tagName === 'BUTTON'); const pool = bt.length && Math.random() < .5 ? bt : vis;
  const e = pool[Math.floor(Math.random() * pool.length)]; if (!e) return 'none';
  const rr = e.getBoundingClientRect(); return JSON.stringify({ x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 });
})()`;

const { page, close } = await openSession({ width: 1280, height: 800, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, coins: 500 } });
for (let i = 0; i < 20 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);

let report = {};
try { if (only.length) report = JSON.parse(fs.readFileSync(path.join(OUT, 'readfit.json'), 'utf8')); } catch {}
let curOpp = null;
for (const [gameId, opp, group] of GAMES) {
  if (only.length && !only.includes(gameId)) continue;
  if (curOpp !== opp) {
    await page.eval(`document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); startBattle(${JSON.stringify(opp)}); true`);
    await sleep(4000);
    for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
    curOpp = opp;
  }
  await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(gameId)}]; state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
  await sleep(2600);
  const steps = []; let prevSig = null, stable = 0, maxOv = -1, res = 'STUCK';
  for (let i = 0; i < 400; i++) {
    const m = await page.eval(MEASURE);
    if (m && !m.flags.intro) {
      if (m.sig === prevSig) stable++; else { stable = 0; prevSig = m.sig; }
      // 2回続けて同じ見え方になったら「落ち着いた手順」として記録
      if (stable === 1 && m.sig !== (steps.length ? steps[steps.length - 1].sig : null)) {
        const n = steps.length + 1;
        m.n = n;
        if (n <= MAX_SHOTS || m.overflow > maxOv) { m.shot = `qa/out/readfit/${gameId}_${n}.png`; try { await page.screenshot(path.resolve(m.shot)); } catch {} }
        maxOv = Math.max(maxOv, m.overflow);
        steps.push(m);
      }
    }
    const w = await page.eval(PICK);
    if (w && w[0] === '{') { const o = JSON.parse(w); await page.click(o.x, o.y); }
    if (w === 'exit') { res = 'OK'; break; }
    if (w === 'gone') { res = 'GONE'; break; }
    await sleep(220);
  }
  console.log(gameId, res, 'steps', steps.length, 'maxOverflow', maxOv);
  report[gameId] = { opp, group, result: res, steps };
  await sleep(800);
  await page.eval(`(() => { document.querySelectorAll('.read-battle-host').forEach(e => e.remove()); state.psychPending = false; return true; })()`);
  curOpp = null; // 取り除いたので次のゲームでは卓を作り直す
}
fs.writeFileSync(path.join(OUT, 'readfit.json'), JSON.stringify(report, null, 1));

// Japanese summary
const L = ['# 読み合い 画面収まり監査 (1280x800)', ''];
let chrome = null;
for (const [g, r] of Object.entries(report)) { const s = r.steps.find(x => x.purse); if (s && !chrome) chrome = s; }
if (chrome) L.push(`固定部分の高さ: 財布バー ${chrome.purse.h}px / 相手行 ${chrome.oppRow.h}px / リコ帯 ${chrome.coach.h}px / スクロール枠の見える高さ ${chrome.clientH}px`, '');
for (const [g, r] of Object.entries(report)) {
  L.push(`## ${g} (${r.group}, 相手 ${r.opp}, ${r.result})`, '', '| # | 手順 | はみ出し px | 切れたボタン(現在/最上部) | 背の高いブロック | 画像 |', '|--|--|--|--|--|--|');
  for (const s of r.steps) {
    const en = s.buttons.filter(b => !b.disabled && b.inScroller);
    const cutNow = en.filter(b => !b.fitsNow).map(b => b.text), cutTop = en.filter(b => !b.fitsAtTop).map(b => b.text);
    const tall = [...s.blocks].sort((a, b) => b.h - a.h).slice(0, 3).map(b => `${b.sel.slice(0, 28)} ${b.h}`).join(', ');
    const lab = (s.flags.result ? '結果札 ' : '') + (s.flags.wager ? '賭け ' : '') + s.steps.join(',') + ' [' + en.map(b => b.text).slice(0, 3).join('/') + ']';
    L.push(`| ${s.n} | ${lab} | ${s.overflow} | ${cutNow.length}/${cutTop.length} ${cutTop.slice(0, 3).join('/')} | ${tall} | ${s.shot || ''} |`);
  }
  L.push('');
}
fs.writeFileSync(path.join(OUT, 'readfit.md'), L.join('\n'));
console.log('errors', await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 3))`));
await close();
