// リーディング：見せ合いっこ（ほろ酔いの夜・泥酔の夜／相手はポルカ）（2026-11-17・試作 qa/h4mise、仕様 docs/design-ref/read-h4-spec.md §6、read-integrate.md §3-5）
// リバーでミミが賭けた後、ポルカの AI が「降りる」と決めた所で開く。酔ったポルカが「1枚ずつ見せっこしよ？」と言い出し、自分の1枚を先にめくる。
// 決まり：彼女は「見えた1枚＋場札」の役を、自分の本当の役とくらべる。下なら払う。上（同じ）なら降りる。見せなければ降りる。乱数は無い。
// 決めるのは3択：左の札／右の札／見せない。ポルカの払う／降りるは、この決まりで計算して卓の AI と置き換える（払う → 本当に払って勝負・降りる → ポットはミミへ）。
(function () {
  'use strict';
  // ================= 計算 =================
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const P = (s) => ({ r: RANKS.indexOf(s[0]), s: s[1], t: s });
  function straightTop(rs) {
    const u = [...new Set(rs)]; if (u.includes(12)) u.push(-1); u.sort((a, b) => b - a);
    for (let i = 0; i + 4 < u.length; i++) { let ok = true; for (let k = 1; k < 5; k++) if (!u.includes(u[i] - k)) { ok = false; break; } if (ok) return u[i]; }
    return -2;
  }
  function score(cards) {
    const cnt = {}, su = {}; for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; (su[c.s] = su[c.s] || []).push(c.r); }
    const rs = Object.keys(cnt).map(Number).sort((a, b) => b - a);
    const by = (n) => rs.filter(r => cnt[r] === n);
    let fl = null; for (const s in su) if (su[s].length >= 5) fl = s;
    if (fl) { const st = straightTop(su[fl]); if (st > -2) return [8, st]; }
    const q = by(4), t = by(3), p = by(2);
    if (q.length) return [7, q[0], rs.filter(r => r !== q[0])[0]];
    if (t.length && (p.length || t.length > 1)) { const pr = Math.max(...(t.slice(1).concat(p))); return [6, t[0], pr]; }
    if (fl) return [5, ...su[fl].sort((a, b) => b - a).slice(0, 5)];
    const st = straightTop(cards.map(c => c.r)); if (st > -2) return [4, st];
    if (t.length) return [3, t[0], ...rs.filter(r => r !== t[0]).slice(0, 2)];
    if (p.length >= 2) return [2, p[0], p[1], rs.filter(r => r !== p[0] && r !== p[1])[0]];
    if (p.length) return [1, p[0], ...rs.filter(r => r !== p[0]).slice(0, 3)];
    return [0, ...rs.slice(0, 5)];
  }
  const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] == null ? -9 : a[i]) - (b[i] == null ? -9 : b[i]); if (d) return d; } return 0; };
  const RN = (r) => ({ 8: '10', 9: 'J', 10: 'Q', 11: 'K', 12: 'A' }[r] || String(r + 2));
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  function hname(sc) {
    const c = sc[0];
    if (c === 0) return '役なし'; if (c === 1) return RN(sc[1]) + ' のペア'; if (c === 2) return RN(sc[1]) + ' と ' + RN(sc[2]) + ' のツーペア';
    if (c === 3) return RN(sc[1]) + ' のスリーカード'; if (c === 4) return 'ストレート'; if (c === 5) return 'フラッシュ'; if (c === 6) return 'フルハウス'; return 'それ以上';
  }
  function sname(sc) { const c = sc[0]; if (c === 2) return 'ツーペア'; if (c === 3) return 'スリーカード'; return hname(sc); }
  const core = (sc) => sc[0] === 1 ? [1, sc[1]] : sc[0] === 2 ? [2, sc[1], sc[2]] : sc[0] === 3 ? [3, sc[1]] : sc;
  // 彼女が見せる1枚：その1枚＋場札だけで、本当の役と同じになる札。無ければ（2枚とも使う役・場札だけの役）null
  function herShow(board, her) {
    const real = score(board.concat(her)), b = score(board);
    if (real[0] < 1 || cmp(core(real), core(b)) <= 0) return null;
    for (const c of her) { if (cmp(core(score(board.concat([c]))), core(real)) === 0) return { card: c, real }; }
    return null;
  }
  function react(board, herReal, shown) { if (!shown) return 'fold'; return cmp(score(board.concat([shown])), herReal) < 0 ? 'call' : 'fold'; }
  function solve(board, mimi, her) {
    const hs = herShow(board, her); if (!hs) return null;
    const mReal = score(board.concat(mimi)), ahead = cmp(mReal, hs.real);
    const out = [0, 1].map(i => react(board, hs.real, mimi[i]));
    const val = (o) => o === 'call' ? (ahead > 0 ? 2 : ahead < 0 ? -1 : 0) : 1;
    const vals = [val(out[0]), val(out[1]), 1]; const best = Math.max(...vals);
    const ans = vals.map((v, i) => v === best ? i : -1).filter(i => i >= 0);
    return { hs, mReal, ahead, out, vals, best, ans };
  }
  // 「この札が場札とつながる」所：糸で結ぶ場札の番号（つながらなければ空）と、見える役
  function linkOf(board, card) {
    const sb = score(board), sc = score(board.concat([card]));
    const improved = cmp(core(sc), core(sb)) > 0; const idx = [];
    if (improved) {
      const k = sc[0];
      if (k === 5) board.forEach((c, i) => { if (c.s === card.s) idx.push(i); });
      else if (k === 4) { const top = sc[1]; const set = new Set(); for (let d = 0; d < 5; d++) { let r = top - d; if (r < 0) r = 12; set.add(r); } board.forEach((c, i) => { if (set.has(c.r) && c.r !== card.r) idx.push(i); }); }
      else board.forEach((c, i) => { if (c.r === card.r) idx.push(i); });
    }
    return { idx, improved, score: sc, name: hname(sc) };
  }
  // 場面の全部（表示に使う物）を計算から出す
  function derive(sc) {
    const board = sc.board.split(' ').map(P), mimi = sc.mimi.split(' ').map(P), her = sc.polka.split(' ').map(P);
    const r = solve(board, mimi, her);
    const hsIdx = her.findIndex(c => c.t === r.hs.card.t);
    return { board, mimi, her, r, hsIdx, hsLink: linkOf(board, r.hs.card),
      herName: hname(r.hs.real), herShort: sname(r.hs.real), mimiName: hname(r.mReal),
      seen: [0, 1].map(i => linkOf(board, mimi[i])), ahead: r.ahead, ans: r.ans[0], pot0: sc.pot0 || 0, bet: sc.bet || 0 };
  }
  // T＝卓の table（board は5枚）。ctx.charKey は polka だけ。ctx.pot0＝この通りの賭けの前のポット・ctx.bet＝ミミの賭け（ポルカが払う額）。作れなければ null
  function plan(T, ctx) {
    ctx = ctx || {};
    if ((ctx.charKey || 'polka') !== 'polka') return null;
    if (!T || !T.board || T.board.length !== 5 || !T.her || T.her.length !== 2 || !T.mine || T.mine.length !== 2) return null;
    const mk = (c) => P(RANKS[c.r - 2] + c.s);
    const board = T.board.map(mk), her = T.her.map(mk), mimi = T.mine.map(mk);
    const all = board.concat(her, mimi); if (new Set(all.map(c => c.t)).size !== all.length) return null;
    const r = solve(board, mimi, her);
    if (!r || r.ahead === 0 || r.ans.length !== 1) return null;     // 同点・どちらでも払う／どちらでも降りる場では出さない
    const sc = { board: board.map(c => c.t).join(' '), mimi: mimi.map(c => c.t).join(' '), polka: her.map(c => c.t).join(' '), ans: r.ans[0], pot0: ctx.pot0 || 0, bet: ctx.bet || 0 };
    return sc;
  }

  // ================= 台詞・お手本 =================
  const DEMO = { board: 'Kh 9c 4d 2s Jc', mimi: 'Ks 4c', polka: '9d 6h', ans: 1, pot0: 600, bet: 300 };
  const OPEN = ['う〜、こわいよぉ……。|ねえ、1枚ずつ 見せっこしよ？', 'あたし、これ〜！|弱そうだったら、払うから〜'];
  const RK = (c) => RN(c.r);
  const herUp = (d) => d.r.hs.real[0] === 2 ? 'あたしはツーペアだもん♪' : `あたしの ${RK(d.r.hs.card)} のほうが上〜♪`;
  const herCant = (d) => d.r.hs.real[0] === 2 ? 'あたしのツーペアじゃ、勝てないよぉ……' : `あたしの ${RK(d.r.hs.card)} じゃ、勝てないよぉ……`;
  function seenCall(d, i) {
    const s = d.seen[i];
    if (s.score[0] === 0) return ['なーんだ、何もないじゃん！|はったりだ〜♪'];
    return [`なーんだ、${s.name}${s.improved ? '' : 'だけ'}？|${herUp(d)}`];
  }
  // 結果を計算で決める。pick: 0,1＝その札 / 2＝見せない
  function outcome(d, pick) {
    const a = d.ahead > 0;
    if (pick === 2) {
      const steps = [{ face: 'plead', t: 'え〜！ あたしだけ|見せたのに〜！ ずるい〜！' }, { face: 'bawl', t: '……やっぱり こわいから、|降りる〜' }];
      if (!a) steps.push({ face: 'plead', t: 'ねえ、ほんとは|何 持ってたの〜？' });
      const good = d.r.out.map((o, i) => o === 'call' ? i : -1).filter(i => i >= 0);
      const other = good.length ? d.mimi[good[0]] : null;
      return { kind: a ? 'fled' : 'drop', mark: a ? '△ 逃げられた' : '◎ 降ろした', delta: d.pot0, sign: 1, cls: a ? 'warn' : 'good', steps, flip: false, act: 'fold',
        reason: a ? (other ? `${RK(other)} を見せていれば、安心して払ってくれた` : '見せなかったので、降りられた') :
          (d.r.mReal[0] === 0 ? 'ミミは役なし。見せなかったので、こわがったまま降りた' : `ミミは ${d.mimiName}。${d.herName}には負けている。見せなかったので、こわがったまま降りた`) };
    }
    const card = d.mimi[pick], oth = d.mimi[1 - pick], s = d.seen[pick], call = d.r.out[pick] === 'call';
    if (!call) {
      const okOth = d.r.out[1 - pick] === 'call';
      return { kind: 'fled', mark: '△ 逃げられた', delta: d.pot0, sign: 1, cls: 'warn', flip: false, act: 'fold',
        steps: [{ face: 'panic', t: `${s.name}！？|${herCant(d)}` }, { face: 'plead', t: '降りる〜……ひっく' }],
        reason: `${RK(card)} は『${s.name}』に見える。${d.herShort}より上なので、降りた。${okOth ? RK(oth) + ' なら払ってくれた' : ''}` };
    }
    const lines = seenCall(d, pick);
    const pay = { face: 'drunk', t: lines[0] };
    const why = s.score[0] === 0 ? `${RK(card)} は場札とつながらない。『役なし』に見えるので、安心して払った` :
      (s.improved ? `${RK(card)} は『${s.name}』に見える。${d.herShort}より下なので、安心して払った` :
        `${RK(card)} は場札とつながらない。場の『${s.name}』だけに見える。${d.herShort}より下なので、安心して払った`);
    if (a) {
      const fl = d.r.mReal[0] === 5 ? SJ[d.mimi[0].s] : RK(oth);
      const flipLine = d.r.mReal[0] === 5 ? `えっ……${fl}！？|${sname(d.r.mReal)}！？` : `えっ……${fl} も！？|${sname(d.r.mReal)}！？`;
      return { kind: 'paid', mark: '◎ 払わせた', delta: d.pot0 + d.bet, sign: 1, cls: 'good', flip: true, act: 'call',
        steps: [pay, { face: 'drunk', t: '払う払う〜！' }, { face: 'panic', t: flipLine, flip: true }, { face: 'bawl', t: 'ず、ずる〜い！|うわぁ〜ん！' }], reason: why };
    }
    return { kind: 'caught', mark: '✕ ばれた', delta: d.bet, sign: -1, cls: 'bad', flip: true, act: 'call',
      steps: [pay, { face: 'drunk', t: '払う払う〜！' }, { face: 'drunk', t: 'やった〜！|あたしの勝ち〜♪', flip: true }],
      reason: '見せた札で、弱いのがばれた。負けている時は、見せない' };
  }
  const DEMO_COACH = {
    s1: 'ポルカは 9 のペア。ミミは勝ってるね。|払ってくれたら、もっともうかるよ',
    s2: 'K を見せると、K のペアに見える。|9 より上だから、こわがって降りちゃう',
    s3: '4 なら、4 のペアに見える。|9 より下だから、安心して払ってくれるよ',
    s4: '大きい札がこわい札、とは限らないの。|場札とつながる札がこわいんだよ' };
  const CARD4 = [['目的', '迷っているポルカに、払ってもらう。|ただし、ミミが負けている時は、降りてもらう。'], ['やり方', 'ミミの札を1枚選んで見せる。|または「見せない」。'], ['危なさ', '負けている時に見せると、弱いのが|ばれて、払われて負ける。'], ['見る物', 'ポルカの役の札と、ミミの札が場札と|つながるか（同じ数字・並び・同じマーク）。']];
  // 酔ったポルカの顔（assets/characters/polka_cutin_*。窓に収まる位置は試作 qa/h4mise のまま）
  const FACES = {
    drunk: { img: 'assets/characters/polka_cutin_drunk.webp', pos: '-246px 8px' },
    drunk2: { img: 'assets/characters/polka_cutin_drunk2.webp', pos: '-250px 8px' },
    bawl: { img: 'assets/characters/polka_cutin_bawl.webp', pos: '-190px 8px' },
    panic: { img: 'assets/characters/polka_cutin_panic.webp', pos: '-260px 8px' },
    plead: { img: 'assets/characters/polka_cutin_plead.webp', pos: '-190px 8px' },
  };
  const HAND = '<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const BX = (i) => 452 + 66 * i + 30, HX = (j) => 308 + 66 * j + 30;
  const ROW_TOP = 72, ROW_BOT = 154, BUS = 160, CLONE_X = 764, CLONE_TOP = 166;

  // ================= 画面 =================
  function makeScreen(ST, demo) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const br = (t) => String(t).split('|').join('<br>');
    const root = el('div', 'sg mise ' + (demo ? 'demo' : 'live'));
    root.innerHTML = `
  <div class="felt"></div><div class="spot"></div>
  <div class="win">${Object.keys(FACES).map(k => `<div class="face f-${k}${k === 'drunk' ? ' on' : ''}"></div>`).join('')}</div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button type="button" class="tbtn">お手本</button></div>
  <div class="bd"></div>
  <svg class="thr" viewBox="0 0 800 370"><g class="gh"></g><g class="gm"></g></svg>
  <div class="chip hc"></div><div class="chip sc"></div>
  <div class="rule">見せた1枚＋場札の役が、彼女の役より<em>下</em>に見えれば、払う。<em class="u">上</em>なら、降りる</div>
  <div class="reason"></div>
  <div class="clone"></div>
  <div class="mc m0"></div><div class="mc m1"></div>
  <div class="chip mch"></div>
  <div class="opts"><button type="button" class="shw">これを見せる</button><button type="button" class="hide"><b>見せない</b><span>こわがったまま、<br>降りる</span></button></div>
  <div class="speech"></div>
  <button type="button" class="go">卓へ</button>
  <button type="button" class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button type="button" class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：見せ合いっこ</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button type="button" class="pgo btnA">はじめる</button></div>`;
    const q = (s) => root.querySelector(s);
    Object.keys(FACES).forEach(k => { const f = FACES[k], e = q('.f-' + k); e.style.backgroundImage = `url('${f.img}')`; e.style.backgroundSize = 'auto 360px'; e.style.backgroundPosition = f.pos; });
    q('.rimg').style.backgroundImage = "url('assets/battle/chibi/rico_think.webp')";
    const S = { root, demo, sc: null, d: null, q, sel: null };
    S.face = (n) => { Object.keys(FACES).forEach(k => q('.f-' + k).classList.toggle('on', k === n)); };
    S.shake = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('shake'); };
    S.bounce = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('bounce'); };
    S.ins = (t, k) => { const i = q('.ins'); i.textContent = t; i.className = 'ins' + (k ? ' ' + k : ''); };
    S.rib = (h) => { const r = q('.rib'); r.innerHTML = h; r.style.display = h ? '' : 'none'; };
    S.say = (t, mode) => { const s = q('.speech'); if (t) { s.innerHTML = br(t); s.className = 'speech ' + (mode || '') + ' on'; } else s.classList.remove('on'); };
    S.rule = (on) => q('.rule').classList.toggle('on', !!on);
    S.reason = (t) => { const r = q('.reason'); if (t) { r.innerHTML = fm(t); r.classList.add('on'); } else r.classList.remove('on'); };
    S.ask = (on) => q('.askrico').classList.toggle('on', !!on);
    S.tbtn = (on) => { q('.tbtn').style.display = on ? '' : 'none'; };
    S.rico = (t, smug) => { const r = q('.rico'); if (t) { q('.rsay').innerHTML = br(t); q('.rimg').style.backgroundImage = `url('assets/battle/chibi/rico_${smug ? 'smug' : 'think'}.webp')`; r.classList.add('on'); root.classList.add('coaching'); } else { r.classList.remove('on'); root.classList.remove('coaching'); } };
    S.go = (label, on) => { const g = q('.go'); if (label) g.textContent = label; g.classList.toggle('on', !!on); };
    S.intro = (on, sn) => { const i = q('.intro'); if (sn != null) q('.intro .sn').textContent = sn; i.classList.toggle('on', !!on); };
    const rel = (e) => { const r = e.getBoundingClientRect(), b = root.getBoundingClientRect(), sc = ST.scale() || 1; return { x: (r.left - b.left) / sc, y: (r.top - b.top) / sc, w: r.width / sc, h: r.height / sc }; };
    const cardEl = (c, cls) => el('div', 'cd' + (isRed(c) ? ' r' : '') + (cls ? ' ' + cls : ''), cardHTML(c));
    S.load = (sc) => {
      S.sc = sc; const d = derive(sc); S.d = d; S.sel = null;
      const bd = q('.bd'); bd.innerHTML = '';
      S.bcards = d.board.map(c => { const e = cardEl(c, 'hid'); bd.appendChild(e); return e; });
      root.querySelectorAll('.hc0,.hc1').forEach(e => e.remove());
      S.hcs = d.her.map((c, j) => { const e = cardEl(c, 'back hc' + j + ' hid'); root.insertBefore(e, q('.thr')); return e; });
      S.mcs = [0, 1].map(i => { const m = q('.m' + i); m.className = 'mc m' + i; m.innerHTML = ''; m.appendChild(cardEl(d.mimi[i])); return m; });
      S.lkH = []; S.lkM = [];
      q('.gh').innerHTML = ''; q('.gm').innerHTML = '';
      ['.hc', '.sc', '.mch'].forEach(s => { const c = q('.chip' + s); c.className = 'chip ' + s.slice(1); c.style.top = ''; c.textContent = ''; });
      q('.clone').classList.remove('on'); q('.clone').innerHTML = '';
      S.rule(false); S.say(null); S.reason(null); S.go(null, false); S.face('drunk'); S.rico(null);
      S.opts(false); S.optsEnable(false, false);
      q('.hand').classList.remove('on', 'tap');
    };
    S.opts = (on) => q('.opts').classList.toggle('on', !!on);
    S.optsEnable = (shw, hide) => { const a = q('.shw'), b = q('.hide'); a.disabled = !shw; b.disabled = !hide; a.classList.toggle('ready', !!shw); a.classList.remove('press'); b.classList.remove('press'); };
    S.showBoard = async (run, anim) => {
      for (const e of S.bcards) { e.classList.remove('hid'); if (anim) e.classList.add('swap'); await ST.wait(run, anim ? 70 : 0); }
      for (const e of S.hcs) { e.classList.remove('hid'); if (anim) e.classList.add('swap'); }
      if (anim) await ST.wait(run, 400);
    };
    S.lk = () => S.bcards.forEach((e, i) => e.classList.toggle('lk', S.lkH.includes(i) || S.lkM.includes(i)));
    // 彼女の札をめくる＋金の糸（彼女の札と場札）
    S.herFlip = async (run) => {
      const d = S.d, e = S.hcs[d.hsIdx]; e.classList.remove('back'); e.classList.add('flip'); await ST.wait(run, 450);
      const idx = d.hsLink.idx; S.lkH = idx; S.lk();
      const x1 = HX(d.hsIdx);
      q('.gh').innerHTML = idx.map(i => `<path pathLength="1" d="M${x1} ${ROW_TOP} C${x1} 48 ${BX(i)} 48 ${BX(i)} ${ROW_TOP}"/>`).join('');
      const c = q('.chip.hc'); c.textContent = 'ポルカ：' + d.herName; c.classList.add('on');
      await ST.wait(run, 500);
    };
    // 役の札2枚の並び（強い方が上にせり上がる）
    S.compare = (i) => {
      const hc = q('.chip.hc'), sc = q('.chip.sc'), d = S.d;
      hc.classList.remove('up', 'dn'); sc.classList.remove('up', 'dn');
      if (i == null) { hc.style.top = ''; sc.style.top = ''; return; }
      const hi = cmp(d.seen[i].score, d.r.hs.real) >= 0;
      hc.style.top = hi ? '200px' : '170px'; sc.style.top = hi ? '170px' : '200px';
      (hi ? sc : hc).classList.add('up'); (hi ? hc : sc).classList.add('dn');
    };
    // ミミの札の「こう見える」：帯の右はしに札、場札へ金の糸、役の札
    S.shownTo = (i, label) => {
      const d = S.d, s = d.seen[i];
      const cl = q('.clone'); cl.innerHTML = ''; cl.appendChild(cardEl(d.mimi[i])); cl.classList.add('on');
      S.lkM = s.idx; S.lk();
      const xs = s.idx.map(BX); let h = '';
      if (xs.length) {
        h = s.idx.map(k => `<path pathLength="1" d="M${BX(k)} ${ROW_BOT} V${BUS}"/>`).join('') +
          `<path pathLength="1" d="M${Math.min(...xs)} ${BUS} H${CLONE_X}"/><path pathLength="1" d="M${CLONE_X} ${BUS} V${CLONE_TOP}"/>`;
      }
      q('.gm').innerHTML = h;
      const c = q('.chip.sc'); c.textContent = label + '：' + s.name; c.classList.add('on');
      S.compare(i);
    };
    S.shownOff = () => { q('.clone').classList.remove('on'); q('.gm').innerHTML = ''; S.lkM = []; S.lk(); q('.chip.sc').classList.remove('on'); S.compare(null); };
    S.mimiIn = async (run) => {
      q('.mc.m0').classList.add('on'); await ST.wait(run, 120); q('.mc.m1').classList.add('on');
      const c = q('.chip.mch'); c.textContent = 'ミミ：' + S.d.mimiName; c.classList.add('on');
    };
    S.lift = (i) => { S.sel = i; S.mcs.forEach((m, k) => m.classList.toggle('up', k === i)); };
    S.mimiBack = (i, on) => S.mcs[i].querySelector('.cd').classList.toggle('back', !!on);
    S.mimiFlip = async (run, i) => { const e = S.mcs[i].querySelector('.cd'); e.classList.remove('back'); e.classList.add('flip'); const c = q('.chip.mch'); c.textContent = 'ミミ：' + S.d.mimiName; c.classList.add('on'); await ST.wait(run, 450); };
    // 選んだ札が帯へすべる
    S.flyTo = async (run, i, label) => {
      const m = S.mcs[i], cl = q('.clone');
      if (!cl.classList.contains('on')) {
        S.shownTo(i, label);
        const a = rel(m.querySelector('.cd')), t = rel(cl.firstChild);
        const dx = a.x - t.x, dy = a.y - t.y, sx = a.w / t.w, sy = a.h / t.h;
        cl.firstChild.style.transformOrigin = '0 0';
        try { cl.firstChild.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transform: 'none' }], { duration: run.ff ? 130 : 520, easing: 'ease-in-out' }); } catch (e) {}
        await ST.wait(run, 560);
      } else { q('.chip.sc').textContent = label + '：' + S.d.seen[i].name; }
      m.classList.remove('up'); m.classList.add('gone');
    };
    return S;
  }

  // 明かし
  async function reveal(ST, run, S, d, pick, isDemo) {
    const out = outcome(d, pick);
    S.rule(false); S.opts(false); S.rico(null); S.say(null); S.q('.chip.mch').classList.remove('on');
    if (pick < 2) {
      S.ins('ポルカが見くらべる……');
      S.mimiBack(1 - pick, true);
      await S.flyTo(run, pick, 'こう見えた');
      await ST.wait(run, 1300);
    } else {
      S.ins('見せない'); S.mimiBack(0, true); S.mimiBack(1, true); S.lift(null);
      await ST.wait(run, 900);
    }
    S.q('.chip.hc').classList.remove('up', 'dn');
    const oth = pick < 2 ? 1 - pick : null;
    for (const st of out.steps) {
      S.face(st.face); if (st.face === 'bawl' || st.face === 'panic') S.shake(); else S.bounce();
      S.say(st.t, 'narrow');
      if (st.flip && oth != null) { await S.mimiFlip(run, oth); }
      await ST.wait(run, 1700);
    }
    S.say(null);
    S.ins(out.mark + '　' + (out.sign > 0 ? '＋' : '−') + out.delta, out.cls);
    S.q('.chip.hc').classList.remove('on'); S.q('.chip.sc').classList.remove('on');
    await ST.wait(run, 350);
    S.reason(out.reason);
    await ST.wait(run, isDemo ? 1200 : 600);
    return out;
  }

  // ================= お手本 =================
  async function runDemo(ST, replay) {
    const { fm } = window.RD.util;
    if (runDemo.on) return;
    runDemo.on = true;
    const run = ST.newRun(); run.noPause = true;
    const D = makeScreen(ST, true); ST.board.appendChild(D.root);
    D.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; run.kick(); });
    D.q('.skip').addEventListener('click', () => { run.kill(); });
    D.load(DEMO); D.rib('<b>お手本</b>'); D.q('.rib').classList.add('demo'); D.ins(''); D.tbtn(false);
    const hand = D.q('.hand'), C = DEMO_COACH;
    const card4 = async () => {
      D.q('.skip').classList.add('off'); D.rico(null); D.say(null);
      D.q('.pl').innerHTML = CARD4.map(([a, b]) => `<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
      D.q('.pgo').textContent = replay ? 'もどる' : 'はじめる';
      D.q('.panel').classList.add('on');
      await new Promise(res => D.q('.pgo').addEventListener('click', res, { once: true }));
    };
    try {
      D.intro(true, 'お手本'); await ST.wait(run, 1000); D.intro(false); await ST.wait(run, 250);
      await D.showBoard(run, true);
      D.say(OPEN[0]); await ST.wait(run, 1600);
      await D.herFlip(run);
      D.say(OPEN[1]); await ST.wait(run, 1500); D.say(null);
      D.face('drunk2'); await D.mimiIn(run);
      D.q('.chip.hc').classList.add('lit'); D.q('.chip.mch').classList.add('lit');
      D.rico(C.s1); await ST.wait(run, 4000);
      D.rico(null); D.q('.chip.hc').classList.remove('lit'); D.q('.chip.mch').classList.remove('lit'); await ST.wait(run, 200);
      D.lift(0); D.shownTo(0, 'こう見える'); await ST.wait(run, 1500);
      D.face('panic'); D.say('ひぃっ', 'tiny'); D.rico(C.s2, true); await ST.wait(run, 4000);
      D.rico(null); D.say(null); D.face('drunk2');
      D.shownOff(); D.lift(1); D.shownTo(1, 'こう見える'); await ST.wait(run, 1500);
      D.face('drunk'); D.say('ほっ', 'tiny'); D.rico(C.s3, true); await ST.wait(run, 4000);
      D.rico(null); D.say(null);
      D.opts(true); D.optsEnable(true, true); await ST.wait(run, 500);
      hand.style.left = '520px'; hand.style.top = '296px'; hand.classList.add('on'); await ST.wait(run, 700);
      hand.classList.add('tap'); D.q('.shw').classList.add('press'); await ST.wait(run, 350);
      hand.classList.remove('on'); D.opts(false);
      await reveal(ST, run, D, D.d, 1, true);
      D.rico(C.s4, true); await ST.wait(run, 3200);
    } catch (e) { if (!e || e.message !== 'cancel') { runDemo.on = false; D.root.remove(); throw e; } }
    if (!ST.dead) await card4();
    D.root.remove();
    runDemo.on = false;
  }

  // ================= 本番 =================
  function mount(ST, opts, fin) {
    const save = opts.save;
    const sc = opts.scene || plan(opts.table, Object.assign({}, opts.ctx || {}, { charKey: 'polka' }));
    if (!sc) return fin({});
    Object.values(FACES).forEach(f => { const im = new Image(); im.src = f.img; });
    const cnt0 = (save && save.rdCount && save.rdCount.mise) || 0;
    window.RD.saveSet(save, 'rdCount', 'mise', cnt0 + 1, opts.saveProgress);
    const S = makeScreen(ST, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.mc')) return; if (S.phase === 'say') { run.ff = true; run.kick(); } });
    let demoOn = false;
    S.q('.tbtn').addEventListener('click', () => {
      if (demoOn || ST.pauseP) return; demoOn = true; ST.pause();
      runDemo(ST, true).then(() => { demoOn = false; ST.unpause(); });
    });
    const go = async () => {
      S.load(sc); S.ins(''); S.tbtn(false); S.ask(false);
      if (!window.RD.saveGet(save, 'rdDemo', 'mise')) {
        await runDemo(ST, false);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'mise', true, opts.saveProgress);
      }
      S.phase = 'intro';
      S.intro(true, ''); await ST.wait(run, 1000); S.intro(false); await ST.wait(run, 300);
      S.tbtn(true);
      // 言い出す
      S.phase = 'say';
      S.ins('ミミが賭けた。ポルカは迷っている');
      await S.showBoard(run, true);
      run.ff = false;
      S.say(OPEN[0]); await ST.wait(run, 1500);
      await S.herFlip(run);
      S.say(OPEN[1]); await ST.wait(run, 1400);
      run.ff = false; S.say(null);
      // 決める
      S.phase = 'pick';
      const d = S.d;
      S.face('drunk2'); S.ins('どっちを見せる？ それとも、見せない？');
      S.rule(true); S.opts(true); S.optsEnable(false, false);
      const guided = cnt0 < 2;   // 手引きの段：最初の2回だけ「リコに聞く」と、札を持ち上げた時の「こう見える」
      S.ask(guided);
      await S.mimiIn(run);
      const showPrev = (i2) => { if (!guided) return; if (i2 == null) { S.shownOff(); S.rule(true); } else { S.rule(false); S.shownTo(i2, 'こう見える'); } };
      const coach = d.ahead < 0 ? `ミミは ${d.mimiName}。ポルカは ${d.herName}。|見せたら、安心して払われて負けちゃうよ` : `札を持ち上げると「こう見える」が出るよ。|ポルカの役より下に見える札が、安心して払われる札`;
      S.q('.askrico').onclick = () => { S.rico(coach, true); S.ask(false); };
      S.q('.rico').onclick = () => { S.rico(null); S.ask(guided); };
      await ST.wait(run, 400); S.optsEnable(false, true);
      const pick = await new Promise(res => {
        S.mcs.forEach((m, k) => { m.onclick = () => {
          if (S.sel === k) { S.lift(null); S.optsEnable(false, true); showPrev(null); }
          else { S.lift(k); S.optsEnable(true, true); showPrev(k); }
        }; });
        S.q('.shw').onclick = () => { if (S.sel == null) return; S.optsEnable(false, false); S.q('.shw').classList.add('press'); res(S.sel); };
        S.q('.hide').onclick = () => { if (S.q('.hide').disabled) return; S.optsEnable(false, false); S.q('.hide').classList.add('press'); res(2); };
      });
      S.mcs.forEach(m => m.onclick = null); S.q('.shw').onclick = null; S.q('.hide').onclick = null; S.rico(null); S.ask(false);
      S.tbtn(false);
      S.phase = 'reveal';
      const out = await reveal(ST, run, S, d, pick, false);
      S.go('卓へ', true);
      S.phase = 'done';
      await new Promise(res => { S.q('.go').onclick = res; });
      S.q('.go').onclick = null;
      fin({ act: out.act, correct: pick === d.ans, pick });
    };
    go();
  }

  window.RD.reg('mise', { id: 'mise', title: 'リーディング：見せ合いっこ', plan, mount });
  window.RD.miseEngine = { P, score, cmp, herShow, react, solve, linkOf, derive, plan, outcome, DEMO };
})();
