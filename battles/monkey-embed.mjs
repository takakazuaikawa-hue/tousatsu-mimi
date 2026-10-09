// 組み込み版の「でたらめに押す人」：embed-test.html を全種類 × その種類の相手で最後まで遊び、出口ボタンと onExit の中身まで確かめる
//   node battles/monkey-embed.mjs [rounds=2] [ids...]            ← embed-test.html（本編に近い形）
//   node battles/monkey-embed.mjs --dev [rounds=1] [ids...]      ← dev.html（タブ版）。出口までは見ない
// 止まった(STUCK)・例外・onExit の欠けがあれば最後に一覧を出し、終了コード 1。画像は battles/shots/ へ。
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../qa/lib/cdp.mjs';
import { serve } from '../qa/lib/server.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const out = path.join(process.env.QA_TMP || HERE, 'shots'); fs.mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const DEV = args[0] === '--dev'; if (DEV) args.shift();
const rounds = +(args[0] || (DEV ? 1 : 2));
const only = args.slice(1);
const W = 1280, H = 800;
const srv = await serve(ROOT, 0);
const b = await launch({ width: W, height: H });
const p = await b.newPage();
const errors = [];
p.on('Runtime.exceptionThrown', (e) => errors.push((e.exceptionDetails.exception && e.exceptionDetails.exception.description) || e.exceptionDetails.text));
p.on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error') errors.push('console.error: ' + e.args.map(a => a.value || a.description).join(' ')); });
await p.setViewport(W, H, false);
// 外のフォントの読み込み待ちでページが固まらないよう、Google Fonts は止める（見た目の確認は別に撮る）
await p.send('Network.enable').catch(() => {});
await p.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] }).catch(() => {});
for (const ev of ['uncaughtException', 'unhandledRejection']) process.on(ev, async (e) => { console.error(e); try { await b.close(); } catch {} process.exit(2); });
const base = `http://127.0.0.1:${srv.port}/battles/`;
const ev = (x) => p.eval(x, 20000).catch(e => 'ERR ' + e.message);

// 押せる物を1つ選んで、その中心を本物のマウスで押す（舞台の中でスクロールで隠れている物は、見える所まで寄せる）
const PICK = `(() => {
  if (document.querySelector('.mb-result')) return JSON.stringify({ done: true });
  const sc = document.querySelector('.mb-scroll'); const sr = sc ? sc.getBoundingClientRect() : null;
  const top = document.querySelector('.mb-layer .mb-roulette, .mb-layer .mb-intro');
  const ok = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || e.disabled || e.closest('[hidden]')) return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (!top && sr && sc.contains(e) && (r.bottom > sr.bottom + 1 || r.top < sr.top - 1) && sc.scrollHeight > sc.clientHeight + 1) return 'off';
    if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return 'off';
    const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
  const scope = top || document.querySelector('#mb-stage');
  const all = [...scope.querySelectorAll('*')].filter(e => e.tagName === 'BUTTON' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')));
  if (top && top.classList.contains('mb-intro')) all.push(top);
  const vis = all.filter(e => ok(e) === true);
  const off = all.filter(e => ok(e) === 'off');
  if (!vis.length && !off.length) return JSON.stringify({ none: true });
  const both = vis.concat(off); const btns = both.filter(e => e.tagName === 'BUTTON'); const pool = btns.length && Math.random() < .5 ? btns : both; const e = pool[Math.floor(Math.random() * pool.length)];
  if (off.includes(e)) { e.scrollIntoView({ block: 'center' }); return JSON.stringify({ scrolled: true }); }
  const r = e.getBoundingClientRect();
  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, what: (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' ' + (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 16) });
})()`;

// 結果が出た後：ルーレットがあれば止めて受け取る
let sawRoulette = 0;
async function stepRoulette() {
  const has = await ev(`!!document.querySelector('.mb-roulette')`);
  if (!has) return false;
  sawRoulette++;
  if (!(await ev(`!!(document.querySelector('#mb-next') && document.querySelector('#mb-next').disabled)`))) problems.push('exit button enabled during roulette');
  await ev(`(document.querySelector('#mb-rl-stop:not([disabled])') || document.querySelector('#mb-rl-ok'))?.click()`);
  return true;
}
async function clearRoulette() {
  for (let k = 0; k < 30; k++) { if (!(await stepRoulette())) return; await sleep(700); }
}

async function playOne(label) {
  let steps = 0, none = 0, done = false; const trail = [];
  const t0 = Date.now();
  while (steps < 200 && Date.now() - t0 < 90000) {
    const s = JSON.parse(await ev(PICK) || '{}');
    if (s.done) { done = true; break; }
    if (s.none) { none++; if (none > 40) break; await sleep(250); continue; }
    if (s.scrolled) { await sleep(150); continue; }
    none = 0; steps++; trail.push(s.what);
    if (process.env.MB_SHOTS && steps === 9) await p.screenshot(path.join(process.env.MB_SHOTS, label + '-mid.png'));
    await p.click(s.x, s.y);
    await sleep(220);
  }
  if (done && process.env.MB_SHOTS) { await sleep(900); await p.screenshot(path.join(process.env.MB_SHOTS, label + '-result.png')); }
  const res = done ? await ev(`(() => { const r = document.querySelector('.mb-result'); return r.className + ' | ' + r.innerText.replace(/\\s+/g, ' ').slice(0, 120); })()`) : 'STUCK';
  if (!done) await p.screenshot(path.join(out, `monkey-stuck-${label}.png`));
  return { steps, done, secs: ((Date.now() - t0) / 1000).toFixed(1), res, trail };
}

const report = []; const problems = [];
const FIELDS = ['gameId', 'group', 'charId', 'correct', 'perfect', 'mult', 'gain'];
if (DEV) {
  await p.goto(base + 'dev.html'); await sleep(1500);
  const ids = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.tab')].map(t => t.dataset.id))`));
  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    for (let r = 0; r < rounds; r++) {
      await ev(`document.querySelector('.tab[data-id="${id}"]').click()`); await sleep(400);
      const o = await playOne(`dev-${id}-${r}`);
      report.push({ id, r, ...o, trail: undefined });
      if (!o.done) problems.push(`STUCK dev ${id}#${r}: ${o.trail.slice(-6).join(' / ')}`);
      console.log('dev', id, r, o.done ? 'OK' : 'STUCK', o.steps + ' taps', o.secs + 's', '|', o.done ? o.res.slice(0, 80) : o.trail.slice(-6).join(' / '));
      await clearRoulette();
    }
  }
} else {
  await p.goto(base + 'embed-test.html?clean=1'); await sleep(1200);
  const games = JSON.parse(await ev(`JSON.stringify(MB.games)`));
  for (const g of games) {
    if (only.length && !only.includes(g.id)) continue;
    for (const ch of (g.chars || ['polka'])) {
      await p.goto(base + `embed-test.html?clean=1&game=${g.id}&char=${ch}${process.env.MB_FEVER ? '&fever=1&combo=5' : ''}`); await sleep(900);
      for (let r = 0; r < rounds; r++) {
        if (r > 0) { // 同じ財布のまま作り直す（destroy → mount）
          await ev(`(() => { MB_INST.destroy(); MB_INST = MB.mount(document.getElementById('mb-host-box'), { gameId: '${g.id}', charId: '${ch}', purse: MB_PURSE, exitLabel: '卓にもどる', volume: 0, onExit(res) { MB_EXIT.push(res); } }); })()`);
          await sleep(500);
        }
        const label = `${g.id}-${ch}-${r}`;
        const nExit0 = await ev(`MB_EXIT.length`);
        const o = await playOne(label);
        let exitOk = false, exitInfo = '';
        if (o.done) {
          await clearRoulette();
          // 出口ボタン：ルーレットが終わるまで押せない（disabled）。押せるまで待って本物のマウスで押す
          let pos = null;
          for (let k = 0; k < 40 && !pos; k++) {
            pos = JSON.parse(await ev(`(() => { const e = document.querySelector('#mb-next'); if (!e || e.disabled) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.innerText.replace(/\\s+/g, ' ').trim() }); })()`) || 'null');
            if (!pos) { await stepRoulette(); await sleep(400); }
          }
          if (!pos) exitInfo = 'exit button never enabled';
          else {
            if (pos.t !== '卓にもどる') exitInfo = 'exit label = ' + pos.t;
            await p.click(pos.x, pos.y); await sleep(300);
            await p.click(pos.x, pos.y); await sleep(200); // 二度押しても onExit は1回だけ
            const logged = JSON.parse(await ev(`JSON.stringify(MB_EXIT.slice(${nExit0}))`));
            if (logged.length !== 1) exitInfo += ` onExit calls=${logged.length}`;
            else {
              const x = logged[0]; const miss = FIELDS.filter(f => !(f in x) || x[f] === undefined || x[f] === null);
              if (miss.length) exitInfo += ' missing ' + miss.join(',');
              else if (x.gameId !== g.id || x.charId !== ch || typeof x.gain !== 'number' || typeof x.correct !== 'boolean' || typeof x.perfect !== 'boolean') exitInfo += ' bad ' + JSON.stringify(x);
              else exitOk = true;
              exitInfo = exitOk ? JSON.stringify(x) : exitInfo;
            }
          }
        }
        report.push({ id: g.id, ch, r, ...o, exitOk, trail: undefined });
        if (!o.done) problems.push(`STUCK ${label}: ${o.trail.slice(-6).join(' / ')}`);
        else if (!exitOk) problems.push(`EXIT ${label}: ${exitInfo}`);
        console.log(g.id, ch, r, o.done ? (exitOk ? 'OK' : 'EXIT-NG') : 'STUCK', o.steps + ' taps', o.secs + 's', '|', o.done ? exitInfo.slice(0, 110) : o.trail.slice(-6).join(' / '));
      }
    }
  }
  console.log('roulettes seen', sawRoulette);
  console.log('purse', JSON.stringify(await ev('MB_PURSE')));
}
const okN = report.filter(x => x.done && (DEV || x.exitOk)).length;
console.log(`rounds OK ${okN}/${report.length}`);
console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
if (problems.length) console.log('problems:\n' + problems.join('\n'));
fs.writeFileSync(path.join(out, DEV ? 'monkey-dev.json' : 'monkey-embed.json'), JSON.stringify({ report, errors, problems }, null, 1));
await b.close(); await srv.close();
process.exit(errors.length || problems.length ? 1 : 0);
