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

  // 止まる所の待ち：文の長さで決める（1行目安2.5秒＋1行ごとに1.2秒、最大5秒。2026-11-17 docs/design-ref/read-demo-length.md）。
  // 行数＝リコの吹き出し（板の中で全角約24字）に、'|' の区切りを折り目として詰めて並べた時の行数（半角は0.55字）。押せばすぐ次へ進む（お手本の画面の pointerdown が run.kick）
  // look＝読みながら盤の物（枠・印・札）も見る一言。1行分（1.2秒）足す（大事な考え方の一言が、見比べる前に進まないように。最大5秒は同じ）
  const stopMs = (t, look) => {
    const segs = String(t == null ? '' : t).replace(/{[A-Z]}/g, 'ああ').split('|');
    const wd = (s) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? .55 : 1), 0);
    let n = 0, cur = 0;
    segs.forEach(sg => { const w = wd(sg); if (cur && cur + w <= 24) { cur += w; return; } if (cur) n++; cur = w; while (cur > 24) { n++; cur -= 24; } });
    if (cur) n++;
    return Math.min(5000, 2500 + 1200 * (Math.max(1, n) - 1) + (look ? 1200 : 0));
  };
  RD.util = { el, fm, LS, SJ, RN, cardHTML, isRed, Run, stopMs };
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

  // ---- 卓の上に重ねる部品（2026-11-17・目利きとおねだり：盤を開かず、本物の卓の上に印・顔の窓・吹き出し・見立ての札を出す）
  // 画面の実寸（px）で置く。位置は卓の場札（.community-cards .card）と相手の絵（.v2-opp）の実際の場所から取り、250msごとと画面の大きさが変わった時に置き直す
  // （卓の場札は画面の大きさで場所も大きさも変わる。卓は render() のたびに作り直されるので、重ねる物は body の下の別の層に置く）
  const TBL = { layer: null, timer: null, hooks: [], bodyCls: [] };
  const scaleCss = (str, k) => String(str).replace(/(-?\d+(?:\.\d+)?)px/g, (m, n) => (Math.round(+n * k * 10) / 10) + 'px');
  TBL.scaleCss = scaleCss;
  TBL.ensure = function () {
    if (TBL.layer && TBL.layer.isConnected) return TBL.layer;
    const L = el('div', 'rdt-layer'); document.body.appendChild(L); TBL.layer = L;
    document.body.classList.add('rdt-on');
    TBL.timer = setInterval(TBL.relayout, 250);
    window.addEventListener('resize', TBL.relayout);
    return L;
  };
  TBL.relayout = function () { if (TBL.layer && !document.querySelector(".battle-screen")) return TBL.close(); TBL.hooks.forEach(h => { try { h(); } catch (e) {} }); };
  TBL.add = function (fn) { TBL.hooks.push(fn); try { fn(); } catch (e) {} return fn; };
  TBL.body = function (cls, on) { document.body.classList.toggle(cls, !!on); if (on && !TBL.bodyCls.includes(cls)) TBL.bodyCls.push(cls); };
  TBL.close = function () {
    if (TBL.timer) { clearInterval(TBL.timer); TBL.timer = null; }
    try { window.removeEventListener('resize', TBL.relayout); } catch (e) {}
    TBL.hooks = [];
    if (TBL.layer) { TBL.layer.remove(); TBL.layer = null; }
    document.body.classList.remove('rdt-on'); TBL.bodyCls.forEach(c => document.body.classList.remove(c)); TBL.bodyCls = [];
  };
  TBL.open = () => !!(TBL.layer && TBL.layer.isConnected);
  const rectOf = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2 }; };
  TBL.cardRects = () => [...document.querySelectorAll('.battle-screen .community-cards .card')].map(rectOf);
  TBL.oppRect = () => { const e = document.querySelector('.battle-screen .v2-opp'); return e ? rectOf(e) : { left: 200, top: 40, width: 290, height: 150, right: 490, bottom: 190, cx: 345 }; };
  // 安全に使える横の範囲（左右の安全域 47px と舞台の外）
  TBL.span = () => { const st = document.getElementById('stage'); const r = st ? rectOf(st) : { left: 0, right: window.innerWidth }; return { left: Math.max(r.left, 47) + 6, right: Math.min(r.right, window.innerWidth - 47) - 6 }; };
  // 相手の顔の窓（卓の相手の絵の場所に重ねる。斜めスラブ。faces＝{名前:{img,size,pos}}。size・pos は高さ370の窓を基準にした値）
  TBL.win = function (faces, first) {
    const L = TBL.ensure(), w = el('div', 'rdt-win');
    w.innerHTML = Object.keys(faces).map(k => '<div class="face f-' + k + '"></div>').join('');
    L.appendChild(w);
    const W = { el: w, rect: null, cur: first || Object.keys(faces)[0] };
    W.layout = () => {
      const o = TBL.oppRect(), h = Math.max(96, Math.min(150, o.height - 2)), wd = h * 304 / 370, k = h / 370;
      w.style.left = (o.cx - wd / 2) + 'px'; w.style.top = (o.top + 2) + 'px'; w.style.width = wd + 'px'; w.style.height = h + 'px';
      Object.keys(faces).forEach(n => { const f = faces[n], e = w.querySelector('.f-' + n); e.style.backgroundImage = "url('" + f.img + "')"; e.style.backgroundSize = scaleCss(f.size, k); e.style.backgroundPosition = scaleCss(f.pos, k); });
      W.rect = { left: o.cx - wd / 2, top: o.top + 2, width: wd, height: h, right: o.cx + wd / 2, bottom: o.top + 2 + h, cx: o.cx };
    };
    W.face = (n) => { W.cur = n; w.querySelectorAll('.face').forEach(e => e.classList.toggle('on', e.classList.contains('f-' + n))); };
    W.shake = () => { w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); };
    W.show = (on) => w.classList.toggle('on', !!on);
    W.layout(); W.face(W.cur); TBL.add(W.layout);
    return W;
  };
  // 窓の下の吹き出し（短い一言）
  TBL.say = function (W) {
    const L = TBL.ensure(), b = el('div', 'rdt-say'); L.appendChild(b);
    const S = { el: b };
    S.layout = () => { const r = W.rect; if (!r) return; b.style.left = r.cx + 'px'; b.style.top = (r.bottom + 1) + 'px'; };
    S.set = (t) => { if (t) { b.innerHTML = fm(t); b.classList.add('on'); } else b.classList.remove('on'); };
    TBL.add(S.layout);
    return S;
  };
  RD.tbl = TBL;

  // ---- セーブの小さな口（お手本を見た印・遊んだ回数・相手ごとの決まりの札）
  RD.saveGet = (save, key, sub) => (save && save[key] && save[key][sub]) || null;
  RD.saveSet = (save, key, sub, v, saveProgress) => {
    if (!save) return;
    try { if (!save[key] || typeof save[key] !== 'object') save[key] = {}; save[key][sub] = v; if (typeof saveProgress === 'function') saveProgress(); } catch (e) {}
  };

  window.RD = RD;
})();
