// リーディング：異議あり（ポルカ・一周目）（2026-11-17・試作 qa/s2igi と docs/design-ref/read-s2-spec.md［末尾の「11/16 作者の決定」が優先］・read-integrate.md §3-2）
// ポルカが大きく賭けた直後、ミミを降ろそうとして役を言い張る。決まり：手札は2枚だけ。役の5枚のうち、3枚は場札に要る。
// 判断は2択：「異議あり！（この場札では作れない）」／「作れる（ウソとは言えない）」。
//  当てた異議 → ポルカの伏せ札が1枚、この手の間 卓で表のまま。外した異議 → ミミの札が1枚「見せた」扱い。
//  「作れる」を選んだ時は、当たりでも外れでも同じ画面で卓へ。答え合わせ（盛っていたのに見逃した「ぷぷっ」を含む）は手の後。
// 計算（このファイルの上半分）は卓の本当の札から言い分を作る。作れないなら出さない。
(function () {
  'use strict';
  // ================= 計算 =================
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const rn = (r) => (RANKS[r] === 'T' ? '10' : RANKS[r]);
  const P = (s) => ({ r: RANKS.indexOf(s[0]), s: s[1], t: s });
  const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(P(r + s));
  function straightTop(rs) {
    const u = [...new Set(rs)]; if (u.includes(12)) u.push(-1); u.sort((a, b) => b - a);
    for (let i = 0; i + 4 < u.length; i++) { let ok = true; for (let k = 1; k < 5; k++) if (!u.includes(u[i] - k)) { ok = false; break; } if (ok) return u[i]; }
    return -2;
  }
  function evalCat(cards) {
    const cnt = {}, su = {};
    for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; (su[c.s] = su[c.s] || []).push(c.r); }
    const by = (n) => Object.keys(cnt).filter(r => cnt[r] === n).length;
    let fl = null; for (const s in su) if (su[s].length >= 5) fl = s;
    if (fl && straightTop(su[fl]) > -2) return 8;
    const q = by(4), t = by(3), p = by(2);
    if (q) return 7; if (t && (p || t > 1)) return 6; if (fl) return 5;
    if (straightTop(cards.map(c => c.r)) > -2) return 4;
    if (t) return 3; if (p >= 2) return 2; if (p) return 1; return 0;
  }
  // 言った役を作れる手札2枚の組の数（場札を除いた全部の2枚組で数える。場札は4枚（ターン）でも5枚（リバー）でもよい）
  function countMakers(board, cat) {
    const rest = DECK.filter(c => !board.some(b => b.t === c.t)); let n = 0;
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) if (evalCat(board.concat([rest[i], rest[j]])) === cat) n++;
    return n;
  }
  // 決まりだけで場札を見て言える事（作れるか）
  function ruleSays(board, cat) {
    if (cat === 5) { const su = {}; board.forEach(c => su[c.s] = (su[c.s] || 0) + 1); return Math.max(...Object.values(su)) >= 3; }
    if (cat === 6) { const cn = {}; board.forEach(c => cn[c.r] = (cn[c.r] || 0) + 1); return Math.max(...Object.values(cn)) >= 2; }
    if (cat === 4) { return bestWindow(board).idx.length >= 3; }
    return false;
  }
  // 5つ続きの窓のうち、場札が一番多く入る窓（A は下にも使える）
  function bestWindow(board, hole) {
    let best = null;
    for (let lo = -1; lo <= 8; lo++) {
      const idx = []; let hc = 0;
      for (let r = lo; r < lo + 5; r++) { const rr = r < 0 ? 12 : r; const i = board.findIndex(c => c.r === rr); if (i >= 0) idx.push(i); if (hole && hole.some(c => c.r === rr)) hc++; }
      if (!best || idx.length > best.idx.length || (idx.length === best.idx.length && hc > best.hc)) best = { lo, idx, hc };
    }
    return best;
  }
  // 枠に入る場札を計算で決める。fill＝場札の番号（最大3）、ok＝3つ埋まるか、n＝そろった数
  function plan3(board, hole, cat) {
    const fill = []; let ok = false, n = 0, tag = {};
    if (cat === 5) {
      let best = null;
      for (const s of SUITS) { const bc = board.filter(c => c.s === s).length, hc = hole.filter(c => c.s === s).length; if (!best || bc > best.bc || (bc === best.bc && hc > best.hc)) best = { s, bc, hc }; }
      board.forEach((c, i) => { if (c.s === best.s && fill.length < 3) fill.push(i); });
      n = best.bc; ok = n >= 3; tag = { kind: 'flush', suit: best.s, n };
    } else if (cat === 4) {
      const best = bestWindow(board, hole);
      best.idx.slice(0, 3).forEach(i => fill.push(i));
      n = best.idx.length; ok = n >= 3; tag = { kind: 'straight', n, lo: best.lo };
    } else if (cat === 6) {
      const g = {}; board.forEach((c, i) => (g[c.r] = g[c.r] || []).push(i));
      const ranks = Object.keys(g).map(Number).sort((a, b) => (g[b].length - g[a].length) || (b - a));
      const top = ranks[0];
      if (g[top].length >= 2) { g[top].forEach(i => { if (fill.length < 3) fill.push(i); }); ranks.slice(1).forEach(r => g[r].forEach(i => { if (fill.length < 3) fill.push(i); })); ok = true; n = g[top].length; tag = { kind: 'fh', pair: true }; }
      else { ranks.slice(0, 2).forEach(r => fill.push(g[r][0])); ok = false; n = 1; tag = { kind: 'fh', pair: false }; }
    }
    return { fill, ok, n, tag };
  }
  const CATN = { 5: 'フラッシュ', 4: 'ストレート', 6: 'フルハウス' };
  const CLAIM = { 5: '降りたほうがいいよ〜|フラッシュだもん♪', 4: 'やめときなって〜|ストレートなんだから', 6: '降りて〜！|フルハウスだよ！' };
  const BLUFF_INTENT = new Set(['bluff', 'forced_bluff', 'tutorial_bluff']);
  // 言い分は本当の手から順に決める（read-integrate §3-2）。作れないなら null
  function claimFor(hole, board, intent) {
    if (evalCat(board) >= 4) return null;      // 場札だけで役ができている場は出さない
    const fin = evalCat(hole.concat(board));
    if (fin === 6 || fin === 5 || fin === 4) return { cat: fin, kind: 'real' };
    if (BLUFF_INTENT.has(intent)) {
      for (const s of SUITS) { const t = hole.concat(board).filter(c => c.s === s).length; if (t === 4 && hole.some(c => c.s === s)) return { cat: 5, kind: 'draw', suit: s }; }
      const all = hole.concat(board);
      let bw = null;
      for (let lo = -1; lo <= 8; lo++) { const set = new Set(); for (let r = lo; r < lo + 5; r++) { const rr = r < 0 ? 12 : r; if (all.some(c => c.r === rr)) set.add(rr); } if (set.size === 4 && hole.some(c => set.has(c.r))) { bw = { lo, set }; break; } }
      if (bw) return { cat: 4, kind: 'draw', win: bw };
    }
    if (fin === 2) return { cat: 6, kind: 'two' };
    return null;
  }
  const LINES = {
    ok_O: ['でしょ〜？|ちゃんと作れるもん♪', 'だから、降りたほうが|いいってば〜'],
    miss_X: ['ざんねーん！|ちゃんと作れるもんね〜！', 'ミミちゃんの札、|1枚 見〜せて♪'],
    miss_O: ['……ぷぷっ。信じた？|いまの、盛っちゃった♪'],
    hide: ['ほんとかどうかは、|ひみつ♪'],
  };
  function reasonFor(cat, tag, ok, board) {
    if (cat === 5) return ok ? `${SJ[tag.suit]}が場に${tag.n}枚。|手札が${SJ[tag.suit]}2枚なら、フラッシュは作れる` : `${SJ[tag.suit]}は場に${tag.n}枚だけ。|3枚ないと、フラッシュは作れない`;
    if (cat === 4) return ok ? '5つ続きの中に、場札が3枚ある。|残りは手札2枚で埋まる' : `5つ続きの中に入る場札は、|どこを取っても${tag.n}枚まで。3枚ないと作れない`;
    const cn = {}; board.forEach(c => cn[c.r] = (cn[c.r] || 0) + 1);
    const pr = Object.keys(cn).map(Number).filter(r => cn[r] >= 2).sort((a, b) => b - a)[0];
    return ok ? `場に ${rn(pr)} が2枚。|手札で埋まれば、フルハウスは作れる` : 'フルハウスは、同じ数字3枚＋2枚。|場に同じ数字が2枚ないと作れない';
  }
  // T = 卓の table（{ board:[{r,s}], her:[{r,s}x2], mine:[{r,s}x2], toCall }）。ctx.intent＝ポルカの賭けのつもり。作れなければ null
  function plan(T, ctx) {
    ctx = ctx || {};
    const rng = ctx.rng || Math.random;
    if ((ctx.charKey || 'polka') !== 'polka') return null;
    if (!T || !T.board || (T.board.length !== 4 && T.board.length !== 5) || !T.her || T.her.length !== 2 || !T.mine || T.mine.length !== 2) return null;
    const mk = (c) => P(RANKS[c.r - 2] + c.s);
    const board = T.board.map(mk), hole = T.her.map(mk), mine = T.mine.map(mk);
    const cl = claimFor(hole, board, ctx.intent);
    if (!cl) return null;
    const n = countMakers(board, cl.cat), possible = n > 0;
    if (cl.kind === 'real' && !possible) return null;
    if (ruleSays(board, cl.cat) !== possible) return null;     // 決まりと数え上げが食い違う場は出さない（念のため）
    const pl = plan3(board, hole, cl.cat);
    if (pl.ok !== possible || (possible ? pl.fill.length !== 3 : pl.fill.length >= 3)) return null;
    // めくる札（当てた異議の罰）：言い分のわけになった手札1枚
    let openIdx = 0;
    if (cl.kind === 'draw' && cl.cat === 5) { const i = hole.findIndex(c => c.s === cl.suit); if (i >= 0) openIdx = i; }
    else if (cl.kind === 'draw' && cl.cat === 4) { const i = hole.findIndex(c => cl.win.set.has(c.r)); if (i >= 0) openIdx = i; }
    else if (cl.kind === 'two') { const all = hole.concat(board); const i = hole.findIndex(c => all.filter(x => x.r === c.r).length >= 2); if (i >= 0) openIdx = i; }
    const why = cl.kind === 'draw' && cl.cat === 5 ? ['な、なんで|分かったの〜！？', `${SJ[cl.suit]}、4枚までは|あったんだよ〜！`]
      : cl.kind === 'draw' ? ['な、なんで|分かったの〜！？', 'あと1枚で、|ほんとだったのに〜！']
      : ['な、なんで|分かったの〜！？', 'ペアが2つあったから、|つい……！'];
    const toCall = ctx.toCall != null ? ctx.toCall : (T.toCall || 0);
    return {
      board: board.map(c => c.t).join(' '), polka: hole.map(c => c.t).join(' '), mimi: mine.map(c => c.t).join(' '),
      cat: cl.cat, ans: possible ? 'O' : 'X', kind: cl.kind, bet: toCall, claim: CLAIM[cl.cat],
      reason: reasonFor(cl.cat, pl.tag, possible, board), why, openIdx, mimiIdx: Math.floor(rng() * 2), makers: n,
      char: 'polka',
    };
  }

  // ================= お手本（固定の場面）=================
  const DEMO = { board: 'Ks 9h 4h 2c 7d', polka: 'Qh 6h', mimi: 'Ad Jc', cat: 5, ans: 'X', kind: 'draw', bet: 300, claim: CLAIM[5],
    reason: '♥は場に2枚だけ。|3枚ないと、フラッシュは作れない', why: ['な、なんで|分かったの〜！？', '♥、4枚までは|あったんだよ〜！'], openIdx: 0, mimiIdx: 0 };
  const DEMO_AFTER = { board: 'Qc 9d 8c 4s 2c', polka: 'Kc 5c' };
  // 止まる所は3つ（2026-11-17 docs/design-ref/read-demo-length.md）。l3「罰で1枚見えた」は止めずに帯で流す（ins と吹き出し）。l4 は2行に削った
  const COACH = {
    l1: '手札は2枚だけ。あと3枚は場札に要るよ',
    l2: '♥は2枚だけ。枠が埋まらない。作れない',
    l4: '場に3枚あったら『作れる』。異議は言わないでね。|外すと、ミミの札を1枚見せることになるよ',
  };
  const CARD4 = [
    ['危なさ', '作れる役に異議を言うと、ミミの札を|1枚、見せることになる。'],
    ['決まり', 'ポルカがターンで大きく賭けた時だけ。|1対戦に3回まで。'],
  ];
  const FACES = {
    smug: { img: 'assets/characters/polka_cutin_smug.webp', size: 'auto 360px', pos: '-232px 10px' },
    busted: { img: 'assets/characters/polka_cutin_busted.webp', size: 'auto 360px', pos: '-168px 10px' },
    plead: { img: 'assets/characters/polka_cutin_plead.webp', size: 'auto 360px', pos: '-158px 10px' },
    panic: { img: 'assets/characters/polka_cutin_panic.webp', size: 'auto 360px', pos: '-250px 10px' },
  };
  const HAND = '<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';

  // ================= 画面 =================
  function makeScreen(ST, demo) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const br = (t) => String(t).split('|').join('<br>');
    const root = el('div', 'sg igi ' + (demo ? 'demo' : 'live'));
    root.innerHTML = `
  <div class="felt"></div><div class="spot"></div>
  <div class="win">${Object.keys(FACES).map(k => `<div class="face f-${k}${k === 'smug' ? ' on' : ''}"></div>`).join('')}</div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button type="button" class="tbtn">お手本</button></div>
  <div class="claim"><div class="ctext"></div><div class="slots"><div class="grp h"><label>手札</label></div><div class="grp b"><label>場から3枚</label></div></div></div>
  <div class="bd"></div>
  <div class="rule">手札は2枚だけ。役の5枚のうち、<em>3枚は場札に要る</em></div>
  <div class="pen">異議を外すと、ミミの札を1枚見せる</div>
  <div class="reason"></div>
  <div class="opts"><button type="button" class="opt" data-a="X"><b>異議あり！</b><span>この場札では作れない</span></button><button type="button" class="opt" data-a="O"><b>作れる</b><span>ウソとは言えない</span></button></div>
  <div class="speech"></div><div class="mimi"></div>
  <button type="button" class="go">卓へ</button>
  <div class="band">異議あり！</div>
  <button type="button" class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button type="button" class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：異議あり</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">お手本の後で、おぼえておくこと</div><div class="pl"></div><button type="button" class="pgo btnA">はじめる</button></div>`;
    const q = (s) => root.querySelector(s);
    Object.keys(FACES).forEach(k => { const f = FACES[k], e = q('.f-' + k); e.style.backgroundImage = `url('${f.img}')`; e.style.backgroundSize = f.size; e.style.backgroundPosition = f.pos; });
    q('.rimg').style.backgroundImage = "url('assets/battle/chibi/rico_think.webp')";
    const S = { root, demo, sc: null, q };
    S.face = (n) => { Object.keys(FACES).forEach(k => q('.f-' + k).classList.toggle('on', k === n)); };
    S.shake = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('shake'); };
    S.bounce = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('bounce'); };
    S.ins = (t, k) => { const i = q('.ins'); i.textContent = t; i.className = 'ins' + (k ? ' ' + k : ''); };
    S.rib = (h) => { const r = q('.rib'); r.innerHTML = h; r.style.display = h ? '' : 'none'; };
    S.say = (t, narrow) => { const s = q('.speech'); if (t) { s.innerHTML = narrow ? br(t) : fm(t); s.classList.toggle('narrow', !!narrow); s.classList.add('on'); } else s.classList.remove('on'); };
    S.rule = (on) => { q('.rule').classList.toggle('on', !!on); q('.pen').classList.toggle('on', !!on && !demo); };
    S.reason = (t) => { const r = q('.reason'); if (t) { r.innerHTML = fm(t); r.classList.add('on'); } else r.classList.remove('on'); };
    S.opts = (on) => q('.opts').classList.toggle('on', !!on);
    S.optsEnable = (on) => q('.opts').querySelectorAll('.opt').forEach(b => { b.disabled = !on; b.classList.remove('press'); });
    S.ask = (on) => q('.askrico').classList.toggle('on', !!on);
    S.tbtn = (on) => { q('.tbtn').style.display = on ? '' : 'none'; };
    S.rico = (t, smug) => { const r = q('.rico'); if (t) { q('.rsay').innerHTML = fm(t); q('.rimg').style.backgroundImage = `url('assets/battle/chibi/rico_${smug ? 'smug' : 'think'}.webp')`; r.classList.add('on'); } else r.classList.remove('on'); };
    S.go = (label, on) => { const g = q('.go'); if (label) g.textContent = label; g.classList.toggle('on', !!on); };
    S.intro = (on, sn) => { const i = q('.intro'); if (sn != null) q('.intro .sn').textContent = sn; i.classList.toggle('on', !!on); };
    S.mimi = (c) => { const m = q('.mimi'); if (c) { m.innerHTML = ''; const e = el('div', 'cd' + (isRed(c) ? ' r' : ''), cardHTML(c)); m.appendChild(e); m.insertAdjacentHTML('beforeend', '<i class="shown">見せた</i>'); m.classList.add('on'); } else { m.classList.remove('on'); m.innerHTML = ''; } };
    S.band = () => { const b = q('.band'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); ST.later(() => b.classList.remove('on'), 1150); };
    S.bandOff = () => q('.band').classList.remove('on');
    S.setBoard = (str, anim) => {
      const bd = q('.bd'); bd.innerHTML = '';
      S.boardC = str.split(' ').map((t, i) => Object.assign(P(t), { id: 'b' + i }));
      S.bcards = S.boardC.map(c => { const e = el('div', 'cd' + (isRed({ s: c.s }) ? ' r' : ''), cardHTML(c)); if (anim) e.classList.add('swap'); bd.appendChild(e); return { c, e }; });
    };
    S.resetSlots = () => {
      const gh = q('.grp.h'), gb = q('.grp.b');
      gh.querySelectorAll('.sl').forEach(e => e.remove()); gb.querySelectorAll('.sl').forEach(e => e.remove());
      const lh = gh.querySelector('label'), lb = gb.querySelector('label');
      S.hslots = [0, 1].map(() => { const e = el('div', 'sl hole'); gh.insertBefore(e, lh); return e; });
      S.bslots = [0, 1, 2].map(() => { const e = el('div', 'sl bs'); gb.insertBefore(e, lb); return e; });
      lh.textContent = '手札'; lh.className = ''; lb.textContent = '場から3枚'; lb.className = '';
      S.lh = lh; S.lb = lb;
    };
    S.load = (sc) => {
      S.sc = sc;
      S.holeC = sc.polka.split(' ').map((t, i) => Object.assign(P(t), { id: 'h' + i }));
      S.mimiC = (sc.mimi || '').split(' ').filter(Boolean).map(P);
      S.setBoard(sc.board, false); S.resetSlots();
      q('.ctext').innerHTML = br(sc.claim); q('.claim').classList.remove('on');
      S.rule(false); S.say(null); S.reason(null); S.mimi(null); S.go(null, false); S.face('smug'); S.rico(null); S.bandOff();
      S.optsEnable(false); q('.opts').classList.remove('on'); q('.hand').classList.remove('on', 'tap');
      S.plan = plan3(S.boardC, S.holeC, sc.cat);
    };
    S.claimIn = async (run) => {
      q('.claim').classList.add('on'); await ST.wait(run, 500);
      for (const e of S.hslots.concat(S.bslots)) { e.classList.add('in'); await ST.wait(run, 110); }
    };
    S.glowSlots = (on) => S.bslots.concat(S.hslots).forEach(e => e.classList.toggle('glowf', !!on));
    S.liftBoard = (idxs) => S.bcards.forEach((b, i) => b.e.classList.toggle('glow', !!idxs && idxs.includes(i)));
    S.dimExcept = (cards) => S.bcards.forEach(b => b.e.classList.toggle('dim', !!cards && !cards.includes(b) && !b.e.classList.contains('lent')));
    const rel = (e) => { const r = e.getBoundingClientRect(), b = root.getBoundingClientRect(), sc = ST.scale() || 1; return { x: (r.left - b.left) / sc, y: (r.top - b.top) / sc, w: r.width / sc, h: r.height / sc }; };
    S.flyOne = async (run, b, slot) => {
      const a = rel(b.e), t = rel(slot);
      const dur = S.fast ? 300 : 520;
      const cl = el('div', 'cd fly' + (isRed({ s: b.c.s }) ? ' r' : ''), cardHTML(b.c));
      cl.style.cssText = `left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px`; root.appendChild(cl);
      b.e.classList.remove('glow'); b.e.classList.add('lent');
      const dx = t.x - a.x, dy = t.y - a.y, sx = t.w / a.w, sy = t.h / a.h;
      try { cl.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(0,-24px) scale(1.1)', offset: .28 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }], { duration: run.ff ? 130 : dur, easing: 'ease-in-out', fill: 'forwards' }); } catch (e) {}
      try { await ST.wait(run, dur); } finally { cl.remove(); }
      slot.className = 'sl bs in full' + (isRed({ s: b.c.s }) ? ' r' : ''); slot.innerHTML = cardHTML(b.c);
    };
    S.sortBoard = async (run) => {
      const first = new Map(S.bcards.map(b => [b, rel(b.e)]));
      const sorted = [...S.bcards].sort((a, b) => a.c.r - b.c.r);
      const bd = q('.bd'); sorted.forEach(b => bd.appendChild(b.e)); S.bcards = sorted;
      sorted.forEach(b => { const f = first.get(b), n = rel(b.e); const dx = f.x - n.x; if (Math.abs(dx) > 1) { try { b.e.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 520, easing: 'ease-in-out' }); } catch (e) {} } });
      await ST.wait(run, 620);
    };
    S.fillCards = (pl) => pl.fill.map(i => S.boardC[i]).map(c => S.bcards.find(b => b.c === c));
    S.flyAll = async (run, pl, upto) => {
      let cards = S.fillCards(pl);
      if (S.sc.cat === 4) cards = cards.sort((a, b) => a.c.r - b.c.r);
      const n = upto == null ? cards.length : upto;
      for (let k = 0; k < n; k++) { await S.flyOne(run, cards[k], S.bslots[k]); await ST.wait(run, S.fast ? 60 : 140); }
      return cards;
    };
    S.settle = (pl) => {
      S.bslots.forEach((e, i) => { if (i >= pl.fill.length) { e.className = 'sl bs in miss'; e.innerHTML = ''; } });
      const t = pl.tag; let txt;
      if (t.kind === 'flush') txt = pl.ok ? `${SJ[t.suit]} ${t.n}枚そろう` : `${SJ[t.suit]} ${t.n}枚だけ`;
      else if (t.kind === 'straight') txt = pl.ok ? '3枚そろう' : `${t.n}枚だけ`;
      else txt = pl.ok ? 'ペアあり' : 'ペアなし';
      S.lb.textContent = txt; S.lb.className = pl.ok ? 'ok' : 'red';
      S.dimExcept(S.fillCards(pl));
    };
    S.flipHole = (i) => { const e = S.hslots[i], c = S.holeC[i]; e.className = 'sl open flipin in' + (isRed({ s: c.s }) ? ' r' : ''); e.innerHTML = cardHTML(c); S.lh.textContent = '罰で1枚'; S.lh.className = 'red'; };
    return S;
  }

  // 明かし。pick＝'X'｜'O'。live＝その場（Xだけ）、verdict＝手の後（Oの答え合わせ）
  async function reveal(ST, run, S, sc, pick) {
    const pl = S.plan;
    S.say(null); S.rule(false); S.optsEnable(false); S.opts(false); S.liftBoard(null);
    if (pick === 'X') { S.band(); await ST.wait(run, 850); }
    if (sc.cat === 4) { S.ins('場札を数字の順に'); await S.sortBoard(run); }
    S.ins('場札が枠へ入る');
    await S.flyAll(run, pl);
    S.settle(pl); await ST.wait(run, 500);
    S.reason(sc.reason);
    if (pick === 'X' && sc.ans === 'X') {
      S.ins('◎ 見破った！', 'good');
      S.face('busted'); S.shake(); S.say(sc.why[0]); await ST.wait(run, 1900);
      S.flipHole(sc.openIdx || 0); S.face('plead'); S.say(sc.why[1]); await ST.wait(run, 2300);
    } else if (pick === 'O' && sc.ans === 'O') {
      S.ins('○ 正しく見た（ウソとは言えない）', 'good');
      S.face('smug'); S.say(LINES.ok_O[0]); await ST.wait(run, 1800);
      S.say(LINES.ok_O[1]); await ST.wait(run, 1900);
    } else if (pick === 'X') {
      S.ins('✕ ミミの札を1枚見せる', 'bad');
      S.face('smug'); S.bounce(); S.say(LINES.miss_X[0], true); await ST.wait(run, 1900);
      S.say(LINES.miss_X[1], true); S.mimi(S.mimiC[sc.mimiIdx || 0]); await ST.wait(run, 2200);
    } else {
      S.ins('✕ 見逃した…', 'bad');
      S.face('smug'); S.bounce(); S.say(LINES.miss_O[0]); await ST.wait(run, 2500);
    }
  }

  async function runDemo(ST, replay) {
    const U = window.RD.util, { fm } = U;
    if (runDemo.on) return;
    runDemo.on = true;
    const run = ST.newRun(); run.noPause = true;
    const D = makeScreen(ST, true); ST.board.appendChild(D.root);
    D.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; run.kick(); });
    D.q('.skip').addEventListener('click', () => { run.kill(); });
    const sc = DEMO;
    D.load(sc); D.rib('<b>お手本</b>'); D.q('.rib').classList.add('demo'); D.ins(''); D.tbtn(false);
    const hand = D.q('.hand');
    const card4 = async () => {
      D.q('.skip').classList.add('off'); D.rico(null); D.say(null); D.bandOff();
      D.q('.pl').innerHTML = CARD4.map(([a, b]) => `<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
      D.q('.pgo').textContent = replay ? 'もどる' : 'はじめる';
      D.q('.panel').classList.add('on');
      await new Promise(res => D.q('.pgo').addEventListener('click', res, { once: true }));
    };
    try {
      const hold = (t, look) => ST.wait(run, window.RD.util.stopMs(t, look));
      D.fast = true;
      D.intro(true, 'お手本'); await ST.wait(run, 600); D.intro(false); await ST.wait(run, 100);
      D.ins(`ポルカが${sc.bet}賭けて、揺さぶってきた`);
      D.q('.claim').classList.add('on'); await ST.wait(run, 800);
      for (const e of D.hslots.concat(D.bslots)) { e.classList.add('in'); await ST.wait(run, 70); }
      D.glowSlots(true); D.rico(COACH.l1); await hold(COACH.l1, true);
      D.rico(null); D.glowSlots(false); await ST.wait(run, 100);
      D.ins('場札が枠へ入る');
      await D.flyAll(run, D.plan);
      D.settle(D.plan); D.rico(COACH.l2, true); await hold(COACH.l2, true);
      D.rico(null);
      D.ins('その役、この場札で作れる？'); D.rule(true); D.opts(true); D.optsEnable(false); await ST.wait(run, 400);
      hand.classList.add('on'); hand.style.left = '520px'; hand.style.top = '296px'; await ST.wait(run, 500);
      hand.classList.add('tap'); D.q('.opt[data-a="X"]').classList.add('press'); await ST.wait(run, 300);
      hand.classList.remove('on'); D.rule(false); D.opts(false);
      D.q('.opt[data-a="X"]').classList.remove('press');
      // l3：罰で1枚見える（止めずに帯と吹き出しで流す）
      D.band(); D.face('busted'); D.shake(); await ST.wait(run, 600);
      D.say(sc.why[0]); D.ins('◎ 見破った！ 罰で札が1枚、開く', 'good'); D.reason(sc.reason); await ST.wait(run, 1100);
      D.flipHole(0); D.face('plead'); D.say(sc.why[1]); await ST.wait(run, 1300); D.say(null);
      D.reason(null); D.face('smug'); D.ins('場に3枚あったら', '');
      D.setBoard(DEMO_AFTER.board, true); D.resetSlots(); D.hslots.concat(D.bslots).forEach(e => e.classList.add('in'));
      await ST.wait(run, 400);
      D.holeC = DEMO_AFTER.polka.split(' ').map(P);
      const pl2 = plan3(D.boardC, D.holeC, 5);
      D.sc = Object.assign({}, sc, { cat: 5 });
      await D.flyAll(run, pl2); D.settle(pl2);
      D.rico(COACH.l4, true); await hold(COACH.l4);
    } catch (e) { if (!e || e.message !== 'cancel') { runDemo.on = false; D.root.remove(); throw e; } }
    if (!ST.dead) await card4();
    D.root.remove();
    runDemo.on = false;
  }

  function mount(ST, opts, fin) {
    const save = opts.save;
    const sc = plan(opts.table, Object.assign({}, opts.ctx || {}, { charKey: 'polka' }));
    if (!sc) return fin({});
    Object.values(FACES).forEach(f => { const im = new Image(); im.src = f.img; });
    const cnt0 = (save && save.rdCount && save.rdCount.igi) || 0;
    window.RD.saveSet(save, 'rdCount', 'igi', cnt0 + 1, opts.saveProgress);
    const S = makeScreen(ST, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (S.phase === 'claim') { run.ff = true; run.kick(); } });
    let demoOn = false;
    S.q('.tbtn').addEventListener('click', () => {
      if (demoOn || ST.pauseP) return; demoOn = true; ST.pause();
      runDemo(ST, true).then(() => { demoOn = false; ST.unpause(); });
    });
    const go = async () => {
      S.load(sc); S.locked = false; S.ins(''); S.tbtn(false); S.ask(false);
      if (!window.RD.saveGet(save, 'rdDemo', 'igi')) {
        await runDemo(ST, false);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'igi', true, opts.saveProgress);
      }
      S.phase = 'intro';
      S.intro(true, ''); await ST.wait(run, 1000); S.intro(false); await ST.wait(run, 300);
      S.tbtn(true);
      S.phase = 'claim';
      S.ins(sc.bet ? `ポルカが${sc.bet}賭けて、揺さぶってきた` : 'ポルカが大きく賭けて、揺さぶってきた');
      S.face('smug');
      await S.claimIn(run);
      run.ff = false; await ST.wait(run, 350);
      S.phase = 'pick';
      S.ins('その役、この場札で作れる？'); S.rule(true); S.opts(true); S.optsEnable(false);
      const coachOn = cnt0 < 2;   // 手引きの段：最初の2回だけ「リコに聞く」
      S.ask(coachOn);
      const coachLine = sc.cat === 5 ? '同じマークを数えてみて。|場に3枚ある？' : sc.cat === 4 ? '5つ続きの中に、場札は3枚入る？|数字を並べて数えてみて' : '場に同じ数字が2枚（ペア）ある？|フルハウスは、そこから作るよ';
      S.q('.askrico').onclick = () => { S.liftBoard(S.plan.fill); S.rule(false); S.rico(coachLine, true); S.ask(false); };
      S.q('.rico').onclick = () => { S.rico(null); S.liftBoard(null); S.rule(true); S.ask(coachOn); };
      await ST.wait(run, 400); S.optsEnable(true);
      const pick = await new Promise(res => { S.q('.opts').onclick = (e) => { const b = e.target.closest('.opt'); if (!b || b.disabled) return; S.optsEnable(false); b.classList.add('press'); res(b.dataset.a); }; });
      S.q('.opts').onclick = null; S.locked = true; S.rico(null); S.ask(false); S.tbtn(false);
      S.phase = 'reveal';
      let out;
      if (pick === 'X') {
        await reveal(ST, run, S, sc, 'X');
        out = sc.ans === 'X' ? { correct: true, open: [sc.openIdx || 0] } : { correct: false, shown: sc.mimiIdx || 0 };
      } else {
        // 「作れる」は当たりでも外れでも同じ画面。答え合わせは手の後
        S.rule(false); S.opts(false); S.liftBoard(null); S.face('smug'); S.say(LINES.hide[0]);
        S.ins('見送った。答えは手の後で');
        await ST.wait(run, 900);
        out = { correct: false, pending: { game: 'igi', title: 'リーディング：異議あり', charKey: 'polka', pick: 'O', ans: sc.ans, scene: sc, deferred: true } };
      }
      S.go('卓へ', true);
      S.phase = 'done';
      await new Promise(res => { S.q('.go').onclick = res; });
      S.q('.go').onclick = null;
      fin(out);
    };
    go();
  }

  // 手の結果の画面に併記する答え（「作れる」を選んだ時）
  function summary(p, ctx) {
    const sc = p.scene, hole = sc.polka.split(' ').map(t => rn(P(t).r) + SJ[t[1]]).join(' '), ok = sc.ans === 'O';
    return { correct: ok, mark: ok ? '◎ 当たり（作れる役だった）' : '✕ 見逃し（盛っていた）',
      real: 'ポルカの手札は ' + hole + '。言い分は' + CATN[sc.cat] + (ok ? '（作れた）' : '（作れない盛り）'),
      reason: String(sc.reason).split('|').join('') + '。', gain: ok ? '' : '損はなし' };
  }
  function verdict(ST, opts, fin) {
    const p = opts.pending, sc = p.scene;
    Object.values(FACES).forEach(f => { const im = new Image(); im.src = f.img; });
    const S = makeScreen(ST, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.load(sc); S.tbtn(false);
    S.q('.claim').classList.add('on'); S.hslots.concat(S.bslots).forEach(e => e.classList.add('in'));
    const resTxt = String(opts.result || '').replace(/（.*）/, '');
    S.rib(resTxt ? '<b>' + resTxt + '</b>' : '');
    const go = async () => {
      S.ins('答え合わせ：「作れる」と見送った'); await ST.wait(run, 800);
      await reveal(ST, run, S, sc, 'O');
      S.go('次へ', true);
      await new Promise(res => { S.q('.go').onclick = res; });
      fin({ correct: sc.ans === 'O' });
    };
    go();
  }

  window.RD.reg('igi', { id: 'igi', title: 'リーディング：異議あり', plan, mount, verdict, summary });
  window.RD.igiEngine = { P, evalCat, countMakers, ruleSays, plan3, claimFor, plan, DECK };
})();
