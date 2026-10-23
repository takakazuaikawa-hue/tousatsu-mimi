// 読み合い11種類を、初めて遊ぶ人の目で1画面ずつ撮る。node qa/readaudit.mjs [gameId ...]
// 出力: qa/out/readaudit/<種類>/NN.png と <種類>/log.json
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck } from './lib/stdcheck.mjs';
const STD = stdCheck({ minText: 14, bodyMin: 16 });
const GAMES = [
  ['detective', 'polka', 'psych'], ['stare', 'polka', 'psych'], ['doubt', 'polka', 'psych'], ['gacha', 'polka', 'psych'], ['objection', 'velvet', 'psych'],
  ['handbuild', 'polka', 'logic'], ['highlow', 'polka', 'logic'], ['danger', 'selina', 'logic'], ['sniper', 'selina', 'logic'], ['outs', 'grano', 'logic'], ['suspects', 'velvet', 'logic'],
];
const only = process.argv.slice(2);
const OUT = path.resolve('qa/out/readaudit');
const PRI = /卓にもどる|卓へ|読み合いへ|次へ|つぎへ|はじめ|スタート|決定|確定|答え|めくる|開く|読みに賭ける|賭ける|OK/;
const AVOID = /スキップ|ルール|とじる|閉じる|やめる|戻る/;

const SNAP = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false; return true; };
  const hit = (e) => { const r = e.getBoundingClientRect(); const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false; const t = document.elementFromPoint(cx, cy); return !!t && (t === e || e.contains(t) || t.contains(e)); };
  const layer = [...document.querySelectorAll('.mk-layer')].find(l => { const c = l.querySelector('.mk-card'); if (!c || !vis(l) || !vis(c) || l.classList.contains('out') || l.classList.contains('closing')) return false; let o = 1; for (let e = l; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o > 0.3; }) || null;
  const host = document.querySelector('.read-battle-host');
  const root = layer || host;
  if (!root) return JSON.stringify({ gone: true, screen: state.screen });
  const txt = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('script,style')) continue; const t = n.nodeValue.replace(/\\s+/g, ' ').trim(); if (!t) continue; let ok = true; for (let e = p; e && e !== el.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05 || e.hidden) { ok = false; break; } } if (ok) { const r = p.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) out.push(t); } } return out.join(' | '); };
  const cands = [...root.querySelectorAll('*')].filter(e => (e.tagName === 'BUTTON' || e.tagName === 'A' || getComputedStyle(e).cursor === 'pointer') && !e.disabled && vis(e) && hit(e) && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer' && e.tagName !== 'BUTTON'))
    .map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, tag: e.tagName, cls: String(e.className || '').slice(0, 60), t: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) }; });
  return JSON.stringify({ layer: !!layer, text: (layer ? 'カード: ' : '') + txt(root), cands, scroll: host ? host.scrollHeight + '/' + host.clientHeight : '' });
})()`;

function pick(cands, clicked, sig) {
  if (!cands.length) return null;
  const T0 = /調べる|めくる|開く|見る|引く|回す|スタート|はじめ|次へ|つぎへ|読み合いへ|探る|並べる|選ぶ/;
  const T1 = /決定|確定|賭ける|卓へ|卓にもどる|答え|読みに|勝負|OK|天秤|宣言|撃つ|指名|告発|異議/;
  const score = (c) => {
    const k = c.t + '|' + c.cls + '|' + Math.round(c.y / 20);
    const n = clicked[k] || 0;
    let s = n * 100;
    if (AVOID.test(c.t)) s += 60;
    else if ((T0.test(c.t) && !/で探る/.test(c.t)) || /^ぱにゅぱにゅ！/.test(c.t)) s += 0;
    else if (T1.test(c.t)) s += 5;
    else s += 20;
    if (/で探る/.test(c.t)) s += 15;
    return s + (c.tag === 'BUTTON' ? 0 : 3);
  };
  return cands.map((c, i) => [score(c) + i * 0.01, c]).sort((a, b) => a[0] - b[0])[0][1];
}

function bump(clicked, c) { const k = c.t + '|' + c.cls + '|' + Math.round(c.y / 20); clicked[k] = (clicked[k] || 0) + 1; }
async function runGame(gameId, opp, group, first) {
  const dir = path.join(OUT, gameId); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const session = await openSession({ width: +(process.env.QA_SIZE || '844x390').split('x')[0], height: +(process.env.QA_SIZE || '844x390').split('x')[1], speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 500, ...(first ? {} : { readIntroSeen: true }) } });
  const { page } = session;
  const rec = [];
  try {
    for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
    await sleep(1500);
    await page.eval(`startBattle(${JSON.stringify(opp)}); true`);
    await sleep(2500);
    for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
    await page.eval(`(() => { READ_BATTLE_POOLS[${JSON.stringify(opp)}][${JSON.stringify(group)}] = [${JSON.stringify(gameId)}]; ${process.env.QA_REAL ? 'if ((state.community || []).length < 3) { state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()]; state.handPhase = "flop"; render(); }' : ''} state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`);
    await sleep(2500);
    let lastSig = '', stuck = 0, n = 0, wasIn = false, gone = 0;
    const clicked = {};
    for (let it = 0; it < 600 && n < 30; it++) {
      const s = JSON.parse(await page.eval(SNAP));
      if (s.gone) {
        gone++;
        // QA_REAL：読みを預けて卓に戻ったら、手の決着を待たずに答え合わせを出して続けて撮る
        if (process.env.QA_REAL && gone === 2 && await page.eval('!!state.pendingRead')) { await page.eval('showReadVerdict(); true'); await sleep(800); gone = 0; continue; }
        if (wasIn && gone === 3) {
          await sleep(400); n++; const f = String(n).padStart(2, '0') + '.png'; await page.screenshot(path.join(dir, f));
          const t = await page.eval(`document.body.innerText.replace(/\\s+/g,' ').slice(0,600)`);
          rec.push({ n, file: f, text: '(読み合いの外・卓に戻った画面。body の文字) ' + t, click: '(終了)' }); break;
        }
        await sleep(400); continue;
      }
      gone = 0; wasIn = true;
      // QA_MEASURE=1：遊びの部品ごとの高さと、舞台からのはみ出しを記録する（収まりの調べ用）
      if (process.env.QA_MEASURE) { const m = await page.eval(`(() => { const r = document.querySelector('.read-battle-host .mb-game-root'); if (!r) return '{}'; const sc = document.querySelector('.read-battle-host .mb-scroll'); const o = { scroll: sc ? [sc.scrollHeight, sc.clientHeight] : null }; [...r.children].forEach(c => { const b = c.getBoundingClientRect(); o[(c.id || c.className || c.tagName).toString().slice(0, 24)] = [Math.round(b.top), Math.round(b.height)]; }); return JSON.stringify(o); })()`); rec.push({ n: 'measure', text: m }); try { const c = await page.eval(STD); const bad = { tiny: c.tiny, wrap: c.wrap, orphan: c.orphan, overflowBox: c.overflowBox, off: c.off }; if (Object.values(bad).some(a => a && a.length)) rec.push({ n: 'std', text: JSON.stringify(bad) }); } catch (e) {} }
      if (!s.layer && (gameId === 'objection' || gameId === 'outs')) {
        const st = (globalThis.__st = globalThis.__st || { a: 0, ph: 0, tapped: 0 });
        let c = null;
        if (gameId === 'objection') {
          const says = s.cands.filter(x => /ob-say/.test(x.cls)), evs = s.cands.filter(x => /ob-ev/.test(x.cls)), ob = s.cands.find(x => /OBJECTION/.test(x.t));
          if (says.length) {
            if (st.ph === 0) { c = says[Math.floor(st.a / 3) % says.length]; st.ph = 1; }
            else if (st.ph === 1) { c = evs[st.a % evs.length]; st.ph = 2; }
            else if (ob) { c = ob; st.ph = 0; st.a++; st.w = 0; } else { st.w = (st.w || 0) + 1; if (st.w > 4) { st.ph = 0; st.a++; st.w = 0; } else { await sleep(500); continue; } }
          }
        } else {
          const tiles = s.cands.filter(x => /^(10|[2-9JQKA])[♠♥♦♣]$/.test(x.t));
          if (tiles.length && st.tapped < 3) { c = tiles[st.tapped * 5]; st.tapped++; }
        }
        if (c) {
          n++; const f = String(n).padStart(2, '0') + '.png'; await sleep(250);
          await page.screenshot(path.join(dir, f));
          rec.push({ n, file: f, text: s.text, scroll: s.scroll, cands: s.cands.map(x => x.t || x.cls), click: `${c.tag}.${c.cls.split(' ')[0]} 「${c.t}」 (${Math.round(c.x)},${Math.round(c.y)})` });
          await page.click(c.x, c.y); await sleep(900); lastSig = ''; stuck = 0; continue;
        }
      }
      const sig = s.text + '#' + s.cands.map(c => c.t).join(',');
      if (sig !== lastSig) {
        await sleep(600);
        const s2 = JSON.parse(await page.eval(SNAP)); if (s2.gone) continue;
        n++; const f = String(n).padStart(2, '0') + '.png';
        await page.screenshot(path.join(dir, f));
        const c = pick(s2.cands, clicked, sig);
        rec.push({ n, file: f, text: s2.text, scroll: s2.scroll, cands: s2.cands.map(c => c.t || c.cls), click: c ? `${c.tag}.${c.cls.split(' ')[0]} 「${c.t}」 (${Math.round(c.x)},${Math.round(c.y)})` : '(押せる物なし・待った)' });
        lastSig = sig; stuck = 0;
        if (c) { bump(clicked, c); await page.click(c.x, c.y); }
        await sleep(500);
      } else {
        stuck++;
        if (stuck > 1) { const c = pick(s.cands, clicked, sig); if (c) { bump(clicked, c); await page.click(c.x, c.y); } }
        if (stuck > 40) { rec.push({ n, file: '', text: '(止まった: 同じ画面が続いた)', click: '' }); break; }
        await sleep(400);
      }
    }
    const errs = await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).slice(0, 6))`);
    fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify({ rec, errs: JSON.parse(errs), exceptions: session.exceptions.slice(0, 6), dialogs: session.dialogs }, null, 1));
    console.log(gameId, 'shots', rec.length, 'errors', errs);
  } catch (e) {
    console.log(gameId, 'FAIL', e.message);
    fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify({ rec, fail: e.message }, null, 1));
  } finally { await session.close(); }
}

globalThis.__st = null;
let first = true;
for (const [g, o, grp] of GAMES) {
  if (only.length && !only.includes(g)) continue;
  globalThis.__st = null;
  await runGame(g, o, grp, first && (!only.length || only[0] === 'detective'));
  first = false;
}
process.exit(0);
