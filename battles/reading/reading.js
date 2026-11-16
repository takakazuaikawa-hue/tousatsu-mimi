// リーディング：共通の盤（2026-11-17・docs/design-ref/read-integrate.md §2）
// window.RD = { games, ok, plan, reg(id, game), mount(host, opts), verdict(host, opts), stage(host, opts), util }
//   ok[id](T, ctx)   : その遊びを出せる場か（plan が作れるか）
//   plan[id](T, ctx) : 卓の本当の札から scene を作る（作れなければ null）
//   mount(host, { game, charKey, drunk, table, ctx, save, saveProgress, volume, onExit(r) })
//        r = { correct } | { pending }   ← 当たりは卓の手札が表になる／外れは pending を預けて手の後に答え合わせ
//   verdict(host, { pending, charKey, save, result, onExit(r) })   r = { correct }
// 盤は 800x370 を transform で拡大縮小する（zoom は使わない）。板の中の最小の文字は 18px、今やることの1行 22px、ボタン 52px 以上。
(function () {
  'use strict';
  const RD = { games: {}, ok: {}, plan: {} };
  const TABLE_BG = { polka: 'table_polka', selina: 'table_selina', grano: 'table_grano', velvet: 'table_velvet', rico: 'table_rico_serious' };
  RD.reg = function (id, game) {
    RD.games[id] = game;
    RD.ok[id] = (T, ctx) => { try { return !!game.plan(T, ctx || {}); } catch (e) { return false; } };
    RD.plan[id] = (T, ctx) => { try { return game.plan(T, ctx || {}); } catch (e) { console.error('RD.plan', id, e); return null; } };
  };

  // ---- 小さな道具
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const fm = (t) => String(t == null ? '' : t).split('|').join('<wbr>');   // 折り目の印 | を <wbr> に（語の途中で折らない）
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const RN = (c) => (c.t ? (c.t[0] === 'T' ? '10' : c.t[0]) : '?');
  const cardHTML = (c) => `<b>${RN(c)}</b><s>${SJ[c.s]}</s>`;
  const isRed = (c) => c.s === 'h' || c.s === 'd';

  // ---- 時間（タップで早送り・お手本の間は本編を止める）
  class Run {
    constructor() { this.dead = false; this.waits = new Set(); this.ff = false; this.noPause = false; }
    kill() { this.dead = true;[...this.waits].forEach(w => w.cancel()); }
    kick() {[...this.waits].forEach(w => w.fin()); }
  }

  // ---- 舞台：host に背景と 800x370 の盤を作る
  function stage(host, opts) {
    opts = opts || {};
    const bg = TABLE_BG[opts.charKey] || 'table_polka';
    host.classList.add('rd-host');
    host.classList.toggle('rd-drunk', !!opts.drunk);
    host.innerHTML = `<div class="rd-bg" style="background-image:url('assets/backgrounds/${bg}.webp')"></div><div class="rd-vig"></div><div class="rd-board"></div>`;
    const board = host.querySelector('.rd-board');
    let scale = 1;
    const fit = () => {
      const w = host.clientWidth || 800, h = host.clientHeight || 370;
      scale = Math.min(w / 800, h / 370);
      board.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    let ro = null;
    try { ro = new ResizeObserver(fit); ro.observe(host); } catch (e) { window.addEventListener('resize', fit); }
    const ST = {
      host, board, runs: new Set(), pauseP: null, resume: null, dead: false,
      scale: () => scale,
      newRun() { const r = new Run(); ST.runs.add(r); return r; },
      // 1回の待ち。ff なら4倍速、お手本が上に重なっている間（pauseP）は本編の待ちを止める
      wait(run, ms) {
        if (run.ff) ms *= .25;
        return new Promise((res, rej) => {
          const w = { fired: false };
          const fin = async () => {
            if (w.fired) return; w.fired = true; clearTimeout(w.t); run.waits.delete(w);
            if (run.dead) return rej(new Error('cancel'));
            while (ST.pauseP && !run.noPause) { await ST.pauseP; }
            if (run.dead) return rej(new Error('cancel'));
            res();
          };
          w.fin = fin;
          w.cancel = () => { if (w.fired) return; w.fired = true; clearTimeout(w.t); run.waits.delete(w); rej(new Error('cancel')); };
          w.t = setTimeout(fin, ms);
          run.waits.add(w);
        });
      },
      later(fn, ms) { const id = setTimeout(() => { if (!ST.dead) fn(); }, ms); return id; },
      pause() { if (ST.pauseP) return false; ST.pauseP = new Promise(r => { ST.resume = r; }); return true; },
      unpause() { const r = ST.resume; ST.pauseP = null; ST.resume = null; if (r) r(); },
      destroy() { ST.dead = true; ST.runs.forEach(r => r.kill()); ST.runs.clear(); try { ro && ro.disconnect(); } catch (e) { try { window.removeEventListener('resize', fit); } catch (e2) {} } },
    };
    return ST;
  }

  RD.util = { el, fm, LS, SJ, RN, cardHTML, isRed, Run };
  RD.stage = stage;

  RD.mount = function (host, opts) {
    const g = RD.games[opts.game];
    if (!g) throw new Error('RD: no game ' + opts.game);
    const ST = stage(host, opts);
    let done = false;
    const fin = (r) => { if (done) return; done = true; try { opts.onExit && opts.onExit(r || {}); } catch (e) { console.error(e); } };
    Promise.resolve().then(() => g.mount(ST, opts, fin)).catch(e => { if (!(e && e.message === 'cancel')) { console.error('RD.mount', e); fin({ error: String(e && e.message || e) }); } });
    return { destroy() { ST.destroy(); } };
  };
  RD.verdict = function (host, opts) {
    const p = opts.pending || {};
    const g = RD.games[p.game];
    if (!g || !g.verdict) throw new Error('RD: no verdict ' + p.game);
    const ST = stage(host, { charKey: opts.charKey || p.oppKey, drunk: opts.drunk });
    let done = false;
    const fin = (r) => { if (done) return; done = true; try { opts.onExit && opts.onExit(r || {}); } catch (e) { console.error(e); } };
    Promise.resolve().then(() => g.verdict(ST, opts, fin)).catch(e => { if (!(e && e.message === 'cancel')) { console.error('RD.verdict', e); fin({}); } });
    return { destroy() { ST.destroy(); } };
  };

  // ---- セーブの小さな口（お手本を見た印・遊んだ回数・相手ごとの決まりの札）
  RD.saveGet = (save, key, sub) => (save && save[key] && save[key][sub]) || null;
  RD.saveSet = (save, key, sub, v, saveProgress) => {
    if (!save) return;
    try { if (!save[key] || typeof save[key] !== 'object') save[key] = {}; save[key][sub] = v; if (typeof saveProgress === 'function') saveProgress(); } catch (e) {}
  };

  window.RD = RD;
})();
