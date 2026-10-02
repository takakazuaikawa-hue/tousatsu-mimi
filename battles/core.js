// ミミの読み合い：全種類が共通で使う骨格（本編に組み込める版）
// 使い方：MB.mount(hostEl, { gameId, charId, purse, exitLabel, volume, onExit }) → { destroy() }
// 1回の流れ：開始カットイン → 種類ごとの遊び → 読みに賭ける（×1/×2/×3）→ 答え合わせ → ご褒美（コンボ・フィーバー）→ 出口ボタン
// 種類ごとのファイルは MB.register({...}) で登録する。遊びの中身は start(ctx) に書き、最後に ctx.api.finish({...}) を呼ぶ。
// 要素の id は全て mb- で始まり、CSS は全て .mb-host の下に閉じている（ページの CSS と混ざらない）。
(() => {
  const SUITS = ['s', 'h', 'd', 'c'];
  const SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const SUIT_NAME = { s: 'スペード', h: 'ハート', d: 'ダイヤ', c: 'クラブ' };
  const RN = { 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const rn = (r) => RN[r] || String(r);
  const key = (c) => c.r + c.s;
  const label = (c) => rn(c.r) + SYM[c.s];
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const deck = () => { const d = []; for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s }); return d; };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- 設定と画像の置き場 ----------
  // ページが battles/ の中なら MB.config({ base: '../' })。本編の index.html（リポジトリ直下）なら既定の '' のまま。
  const CFG = { base: '' };
  function config(o) { if (o && o.base != null) CFG.base = String(o.base); return CFG; }
  // 画像の道順：art/chibi/X → assets/battle/chibi/X、art/face/X → assets/battle/face/X、art/<file> → assets/characters/<file>、face_<key>.webp → assets/ui/face_<key>.webp
  function assetPath(p, base) {
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(p)) return p;
    let m;
    if ((m = /^art\/chibi\/(.+)$/.exec(p))) return base + 'assets/battle/chibi/' + m[1];
    if ((m = /^art\/face\/(.+)$/.exec(p))) return base + 'assets/battle/face/' + m[1];
    if ((m = /^art\/motion\/(.+)$/.exec(p))) return base + 'assets/battle/motion/' + m[1];
    if ((m = /^art\/(.+)$/.exec(p))) return base + 'assets/characters/' + m[1];
    if (/^face_[\w]+\.webp$/.test(p)) return base + 'assets/ui/' + p;
    return base + p;
  }

  // 役の種類（0 役なし … 8 ストレートフラッシュ）と、同じ種類どうしを比べられる点数
  function score(cards) {
    const cnt = {}, bySuit = { s: [], h: [], d: [], c: [] };
    let mask = 0;
    for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; bySuit[c.s].push(c.r); mask |= 1 << c.r; }
    const top = (m) => { if (m & (1 << 14)) m |= 2; for (let t = 14; t >= 5; t--) { const need = 31 << (t - 4); if ((m & need) === need) return t; } return 0; };
    for (const s of SUITS) if (bySuit[s].length >= 5) { let m = 0; for (const r of bySuit[s]) m |= 1 << r; const t = top(m); if (t) return 8e10 + t; }
    const q = [], t3 = [], p = [], sg = [];
    for (let r = 14; r >= 2; r--) { if (cnt[r] === 4) q.push(r); else if (cnt[r] === 3) t3.push(r); else if (cnt[r] === 2) p.push(r); else if (cnt[r] === 1) sg.push(r); }
    const pack = (a) => a.reduce((x, r) => x * 15 + r, 0);
    if (q.length) return 7e10 + q[0] * 15 + ([...t3, ...p, ...sg].sort((a, b) => b - a)[0] || 0);
    if (t3.length && (t3.length > 1 || p.length)) return 6e10 + t3[0] * 15 + Math.max(t3[1] || 0, p[0] || 0);
    for (const s of SUITS) if (bySuit[s].length >= 5) return 5e10 + pack(bySuit[s].slice().sort((a, b) => b - a).slice(0, 5));
    const st = top(mask); if (st) return 4e10 + st;
    if (t3.length) return 3e10 + pack([t3[0], ...sg.slice(0, 2)]);
    if (p.length >= 2) return 2e10 + pack([p[0], p[1], [...p.slice(2), ...sg].sort((a, b) => b - a)[0] || 0]);
    if (p.length) return 1e10 + pack([p[0], ...sg.slice(0, 3)]);
    return pack(sg.slice(0, 5));
  }
  const category = (cards) => Math.floor(score(cards) / 1e10);
  const CAT_NAME = ['役なし', 'ワンペア', 'ツーペア', 'スリーカード', 'ストレート', 'フラッシュ', 'フルハウス', 'フォーカード', 'ストレートフラッシュ'];
  // ランダムな相手の手に対する勝率（0-1）
  function equity(hole, board, samples = 300) {
    const used = new Set([...hole, ...board].map(key));
    const rest = deck().filter(c => !used.has(key(c)));
    const need = 5 - board.length; let w = 0;
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < 2 + need; j++) { const k = j + rand(rest.length - j); [rest[j], rest[k]] = [rest[k], rest[j]]; }
      const run = board.concat(rest.slice(2, 2 + need));
      const a = score(hole.concat(run)), b = score([rest[0], rest[1]].concat(run));
      w += a > b ? 1 : a === b ? .5 : 0;
    }
    return w / samples;
  }
  function cardHTML(c, cls = '') {
    const red = c.s === 'h' || c.s === 'd' ? 'red' : '';
    return `<span class="card ${red} ${cls}" data-k="${key(c)}" aria-label="${rn(c.r)} ${SUIT_NAME[c.s]}"><b>${rn(c.r)}</b><i>${SYM[c.s]}</i></span>`;
  }
  const backHTML = (cls = '') => `<span class="card back ${cls}"><b>?</b><i>?</i></span>`;

  // キャラクター（顔は丸で囲まず、斜めスラブの窓で見せる）。画像の道順は art/… のまま持ち、使う時に assetPath を通す
  const CHARS_RAW = {
    polka: { name: 'POLKA', jp: 'ポルカ', face: 'face_polka.webp', panic: 'art/polka_cutin_panic.webp', smug: 'art/polka_cutin_smug.webp', one: 'ボク' },
    selina: { name: 'SELINA', jp: 'セリナ', face: 'face_selina.webp', panic: 'art/selina_cutin_panic.webp', smug: 'art/selina_cutin_smug.webp', one: '私' },
    grano: { name: 'GRANO', jp: 'グラーノ', face: 'face_grano.webp', panic: 'art/grano_cutin_panic.webp', smug: 'art/grano_cutin_smug.webp', one: '私' },
    velvet: { name: 'VELVET', jp: 'ヴェルベット', face: 'face_velvet.webp', panic: 'art/velvet_cutin_panic.webp', smug: 'art/velvet_cutin_smug.webp', one: 'あたし' },
    rico: { name: 'RICO', jp: 'リコ先輩', face: 'face_rico.webp', panic: 'art/rico_cutin_panic.webp', smug: 'art/rico_cutin_smug.webp', one: 'アタシ' },
  };
  const MIMI_RAW = { win: 'art/mimi_bust_win.webp', sad: 'art/mimi_bust_sad.webp', think: 'art/mimi_bust_think.webp', shock: 'art/mimi_bust_shock.webp', smug: 'art/mimi_bust_smug.webp', calm: 'art/mimi_bust_calm.webp' };
  // 話す時の姿：心理バトルは大きな顔（art/face）、論理バトルは全身のミニキャラ（art/chibi）
  // 表情の言葉：think 様子見 / smug 余裕 / panic 焦り / busted 見抜かれた / lose 崩れる / win 勝ち誇る / plead すがる
  const FACE_MAP = {
    polka: { think: 'smug', smug: 'smug', panic: 'panic', busted: 'busted', lose: 'bawl', win: 'smug', plead: 'plead' },
    selina: { think: 'compose', smug: 'smug', panic: 'panic', busted: 'busted', lose: 'busted', win: 'smug', plead: 'panic' },
    grano: { think: 'haggle', smug: 'smug', panic: 'panic', busted: 'panic', lose: 'grovel', win: 'smug', plead: 'haggle' },
    velvet: { think: 'smirk_hide', smug: 'smug', panic: 'panic', busted: 'busted', lose: 'busted_max', win: 'smug', plead: 'bawl' },
    rico: { think: 'smug', smug: 'smug', panic: 'panic', busted: 'busted', lose: 'applaud', win: 'smug', plead: 'applaud' },
    mimi: { think: 'think', smug: 'smug', panic: 'shock', busted: 'shock', lose: 'sad', win: 'win', plead: 'sad' },
  };
  const CHIBI_ALIAS = { busted: 'panic', plead: 'lose', calm: 'think' };
  function portraitSrc(id, expr, mode) {
    if (mode === 'chibi') return `art/chibi/${id}_${CHIBI_ALIAS[expr] || expr}.webp`;
    const m = FACE_MAP[id] || FACE_MAP.polka;
    return `art/face/${id}_${m[expr] || m.think}.webp`;
  }
  // 姿を差し替える。ミニキャラが無ければ大きな顔へ、それも無ければ今の顔窓の絵へ落とす
  function setPortrait(A, el, img, id, expr, mode) {
    const src = A(portraitSrc(id, expr, mode));
    el.dataset.e = expr;
    if (img.dataset.src === src) return;
    el.classList.toggle('is-chibi', mode === 'chibi'); el.classList.toggle('is-face', mode !== 'chibi');
    img.onerror = () => { img.onerror = null; if (mode === 'chibi') setPortrait(A, el, img, id, expr, 'face'); else { img.dataset.src = ''; img.src = A((CHARS_RAW[id] || CHARS_RAW.polka).face); } };
    img.dataset.src = src; img.src = src;
    el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  }

  // 小さな効果音（最初の操作の後だけ鳴る）。VOL は mount の volume（0 なら無音）
  let VOL = 1;
  let ac = null;
  function tone(freq, dur = .08, type = 'triangle', vol = .05, delay = 0) {
    if (!VOL) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0); g.gain.setValueAtTime(vol * VOL, t0);
      o.connect(g); g.connect(ac.destination); o.start(t0);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.stop(t0 + dur + .02);
    } catch (e) {}
  }
  const sfx = {
    tap: () => tone(660, .06),
    good: () => { tone(880, .08); tone(1175, .1, 'triangle', .05, .07); },
    nope: () => tone(180, .14, 'square', .035),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'triangle', .05, i * .09)),
    drum: () => { for (let i = 0; i < 10; i++) tone(120 + i * 8, .05, 'square', .02, i * .07); },
    tick: () => tone(1400, .03, 'square', .02),
    whoosh: () => { for (let i = 0; i < 6; i++) tone(300 + i * 120, .05, 'sawtooth', .02, i * .02); },
    jackpot: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .2, 'triangle', .06, i * .07)),
  };

  // 財布：コイン・コンボ・フィーバー（mount の purse 引数が無ければ、この共有の物を使う）
  const P_DEFAULT = { coins: 0, combo: 0, fever: 0, best: 0, perfect: 0 };

  // CSS の全セレクタの頭に .mb-host を付ける（@keyframes の中身はそのまま。@media などは中を再帰する）
  // :root / html / body は .mb-host そのものに読み替える（body.is-fever → .mb-host.is-fever）
  function scopeCss(text) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    const splitTop = (s) => {
      const out = []; let depth = 0, q = '', cur = '';
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { cur += c; if (c === '\\') { cur += s[++i] || ''; } else if (c === q) q = ''; continue; }
        if (c === '"' || c === "'") { q = c; cur += c; continue; }
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        if (c === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
      }
      out.push(cur); return out;
    };
    const prefix = (sel) => {
      sel = sel.trim(); if (!sel) return '';
      if (sel.startsWith('.mb-host')) return sel;
      const m = /^(?::root|html|body)(?![\w-])/.exec(sel);
      if (m) return '.mb-host' + sel.slice(m[0].length);
      return '.mb-host ' + sel;
    };
    const walk = (s) => {
      let i = 0, out = '';
      const len = s.length;
      while (i < len) {
        let j = i, q = '';
        while (j < len) { const c = s[j]; if (q) { if (c === '\\') j++; else if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '{' || c === ';') break; j++; }
        const pre = s.slice(i, j).trim();
        if (j >= len) { out += pre ? pre : ''; break; }
        if (s[j] === ';') { if (pre) out += pre + ';\n'; i = j + 1; continue; }
        let depth = 1, k = j + 1; q = '';
        while (k < len && depth) { const c = s[k]; if (q) { if (c === '\\') k++; else if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '{') depth++; else if (c === '}') depth--; k++; }
        const body = s.slice(j + 1, k - 1);
        if (/^@(-\w+-)?keyframes|^@font-face|^@page/i.test(pre)) out += pre + ' {' + body + '}\n';
        else if (pre.startsWith('@')) out += pre + ' {\n' + walk(body) + '}\n';
        else out += splitTop(pre).map(prefix).filter(Boolean).join(',\n') + ' {' + body + '}\n';
        i = k;
      }
      return out;
    };
    return walk(text);
  }

  const games = [];
  function register(g) { games.push(g); }
  const findGame = (id) => games.find(g => g.id === id);

  // ---------- 1回分の舞台（mount の本体） ----------
  function mount(hostEl, opts = {}) {
    const g = typeof opts.gameId === 'string' ? findGame(opts.gameId) : (opts.game || null);
    if (!g) throw new Error('MB.mount: unknown gameId "' + opts.gameId + '"');
    if (!hostEl) throw new Error('MB.mount: hostEl is required');
    const P = opts.purse || P_DEFAULT;
    for (const k of ['coins', 'combo', 'fever', 'best', 'perfect']) if (typeof P[k] !== 'number' || !isFinite(P[k])) P[k] = 0;
    const base = opts.base != null ? String(opts.base) : CFG.base;
    const A = (p) => assetPath(p, base);
    const dev = !!opts.dev;
    if (opts.volume != null) VOL = Math.max(0, Math.min(1, +opts.volume || 0)); else VOL = 1;

    let dead = false, runId = 0, exited = false;
    const alive = () => !dead;

    hostEl.classList.add('mb-host');
    hostEl.classList.toggle('is-dev', dev);
    hostEl.innerHTML = `<div class="mb-purse" aria-live="polite">
        <div>コイン<b id="mb-p-coins">0</b></div>
        <div>コンボ<b id="mb-p-combo">0</b></div>
        <div class="mb-fever-box">フィーバー<b id="mb-p-fever">0/3</b><i class="mb-fever-bar" id="mb-p-fever-bar"></i></div>
      </div>
      <div class="mb-body">
        <div class="mb-scroll" id="mb-scroll">
          <section class="mb-stage" id="mb-stage">
            <div class="mb-opp-row">
              <span class="mb-portrait is-face" id="mb-opp-portrait"><img id="mb-opp-face" src="${A('art/face/polka_smug.webp')}" alt=""></span>
              <div>
                <div class="mb-opp-name" id="mb-opp-name">POLKA</div>
                <div class="mb-speech"><span id="mb-opp-line">……</span></div>
              </div>
              <div class="mb-betchip"><div class="lbl">BET</div><div class="num" id="mb-opp-bet">—</div></div>
            </div>
            <div class="mb-game-root" id="mb-game-root"></div>
            <div class="mb-coach">
              <span class="mb-coach-pop" id="mb-coach-pop"><img id="mb-coach-img" src="${A('art/chibi/rico_think.webp')}" alt="リコ先輩"></span>
              <div><div class="mb-coach-name">RICO · リコ先輩</div><div class="mb-coach-line" id="mb-coach">……</div></div>
            </div>
          </section>
        </div>
        <div class="mb-layer" id="mb-layer"></div>
      </div>`;
    const host = hostEl;
    const stage = host.querySelector('#mb-stage'), scroller = host.querySelector('#mb-scroll'), layer = host.querySelector('#mb-layer');
    const gameRoot = host.querySelector('#mb-game-root');
    const dummy = () => document.createElement('div');
    // 要素の探し方：host の中だけを探す。destroy 後に残ったタイマーが触っても落ちないよう、見つからなければ捨てる要素を返す
    const $ = (s, r) => (r || host).querySelector(s) || (dead ? dummy() : null);

    function purse() {
      if (dead) return;
      $('#mb-p-coins').textContent = P.coins;
      $('#mb-p-combo').textContent = P.combo;
      $('#mb-p-fever').textContent = P.fever > 0 ? `あと${P.fever}回` : `${Math.min(P.combo, 3)}/3`;
      $('#mb-p-fever-bar').style.width = (P.fever > 0 ? 100 : Math.min(P.combo, 3) / 3 * 100) + '%';
      host.classList.toggle('is-fever', P.fever > 0);
    }
    // 金の粒。x, y は画面座標（getBoundingClientRect の値）。本編のように舞台が拡縮されていても合うよう、見かけの倍率で割る
    function sparkles(x, y, n = 18) {
      if (dead) return;
      const r = layer.getBoundingClientRect();
      const sx = r.width / (layer.offsetWidth || r.width || 1) || 1, sy = r.height / (layer.offsetHeight || r.height || 1) || 1;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('i'); s.className = 'mb-sparkle';
        s.style.left = ((x - r.left) / sx) + 'px'; s.style.top = ((y - r.top) / sy) + 'px';
        const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
        s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
        layer.appendChild(s); setTimeout(() => s.remove(), 1000);
      }
    }
    // 舞台の中だけをスクロールして見える所へ寄せる（ページ全体は動かさない）
    function reveal(el, block = 'nearest') {
      if (dead || !el || !el.getBoundingClientRect) return;
      if (dev) { try { el.scrollIntoView({ block, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {} return; }
      if (scroller.scrollHeight <= scroller.clientHeight + 1) return;
      const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      const k = (s.height / (scroller.clientHeight || s.height || 1)) || 1;
      let dy = 0;
      if (block === 'start') dy = r.top - s.top;
      else if (block === 'center') dy = (r.top + r.height / 2) - (s.top + s.height / 2);
      else if (r.height > s.height || r.top < s.top) dy = r.top - s.top - 8 * k;
      else if (r.bottom > s.bottom) dy = r.bottom - s.bottom + 8 * k;
      dy /= k;
      if (Math.abs(dy) > 1) scroller.scrollTo({ top: scroller.scrollTop + dy, behavior: reduce ? 'auto' : 'smooth' });
    }

    // 次の手順のボタンが舞台の下にはみ出して出ると、押す物が見つからず止まってしまう（800px の卓で実測）。
    // 遊びの中身に新しく押せる物が出た／隠れていた物が出た時だけ、その所まで舞台の中を寄せる
    let revealTimer = 0, revealTarget = null;
    const actionable = (n) => n && n.nodeType === 1 && (n.matches('button:not([disabled]), input, [data-action]') || n.querySelector('button:not([disabled]), input'));
    const autoReveal = new MutationObserver((list) => {
      if (dead || dev) return;
      for (const m of list) {
        if (m.type === 'childList') { for (const n of m.addedNodes) if (actionable(n)) revealTarget = n; }
        else if (m.type === 'attributes' && !m.target.hidden && !m.target.disabled && actionable(m.target)) revealTarget = m.target;
      }
      if (!revealTarget) return;
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => { const t = revealTarget; revealTarget = null; if (t && t.isConnected) reveal(t, 'nearest'); }, 160);
    });
    autoReveal.observe(gameRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });

    // フィーバーを当て切ったご褒美：流れる倍率をタップで止める。止まる倍率は抽選で、×10 の隣で止まる「惜しい」も出る
    const RL_CELLS = [1, 2, 3, 1, 5, 2, 10, 3, 1, 2, 5, 3];
    function roulette(unit) {
      return new Promise(res => {
        const W = 84, N = RL_CELLS.length;
        const seq = []; for (let r = 0; r < 8; r++) seq.push(...RL_CELLS);
        const el = document.createElement('div'); el.className = 'mb-roulette';
        el.innerHTML = `<div class="mb-rl-card mb-pop">
            <div class="mb-rl-title">BONUS CHANCE!<small>フィーバー完走のご褒美。止めた倍率 × ${unit} コイン</small></div>
            <div class="mb-rl-window"><div class="mb-rl-track">${seq.map(v => `<span class="mb-rl-cell v${v}">×${v}</span>`).join('')}</div><div class="mb-rl-mark"></div></div>
            <div class="mb-rl-foot"><button class="btn gold" id="mb-rl-stop">ストップ！<small>好きな所でタップ</small></button></div>
          </div>`;
        layer.appendChild(el);
        const track = el.querySelector('.mb-rl-track'), win = el.querySelector('.mb-rl-window'), foot = el.querySelector('.mb-rl-foot');
        let x = 0, spinning = true, last = performance.now();
        const loop = N * W;
        const spin = (t) => { if (!spinning || !alive()) return; x = (x + (t - last) * 1.15) % loop; last = t; track.style.transform = `translateX(${-x}px)`; requestAnimationFrame(spin); };
        requestAnimationFrame(spin);
        const ticker = setInterval(() => { if (!alive()) { clearInterval(ticker); return; } sfx.tick(); }, 95);
        const stop = () => {
          if (!spinning) return; spinning = false; clearInterval(ticker); sfx.tap();
          const r = Math.random();
          const want = r < .07 ? 10 : r < .22 ? 5 : r < .47 ? 3 : r < .77 ? 2 : 1;
          const center = win.clientWidth / 2;
          const from = Math.floor((x + center) / W) + N * 2;
          const cands = []; for (let i = from; i < from + N; i++) if (RL_CELLS[i % N] === want) cands.push(i);
          // 惜しい：×10 の隣に止まる候補があれば半分の確率でそちらへ寄せ、しかも×10 側ぎりぎりで止める
          const near = cands.filter(i => RL_CELLS[(i + 1) % N] === 10 || RL_CELLS[(i + N - 1) % N] === 10);
          const tease = want !== 10 && near.length && Math.random() < .5;
          const i = tease ? near[0] : cands[0];
          const toward = tease ? (RL_CELLS[(i + 1) % N] === 10 ? 1 : -1) : 0;
          const jitter = tease ? toward * W * .38 : (Math.random() - .5) * W * .4;
          const target = i * W + W / 2 - center + jitter;
          const dur = reduce ? 0 : 2400;
          track.style.transition = `transform ${dur}ms cubic-bezier(.1,.72,.16,1)`;
          track.style.transform = `translateX(${-target}px)`;
          let t0 = null; const slow = setInterval(() => { if (!alive()) return clearInterval(slow); t0 = t0 || performance.now(); if (performance.now() - t0 > dur - 300) return clearInterval(slow); sfx.tick(); }, 140);
          setTimeout(() => {
            if (!alive()) return;
            const cell = track.children[i]; cell.classList.add('hit');
            const gain = unit * want; P.coins += gain; purse();
            if (want >= 5) sfx.jackpot(); else sfx.fanfare();
            const r2 = cell.getBoundingClientRect(); sparkles(r2.left + r2.width / 2, r2.top + r2.height / 2, want >= 5 ? 50 : 24);
            foot.innerHTML = `<div class="mb-rl-gain ${want >= 5 ? 'big' : ''}">×${want}　+${gain}<small> コイン</small></div>
              ${tease ? '<div class="mb-rl-tease">あと少しで ×10 だった……！</div>' : ''}
              <button class="btn gold" id="mb-rl-ok">受け取る</button>`;
            foot.querySelector('#mb-rl-ok').addEventListener('click', () => { sfx.tap(); el.remove(); res(gain); });
          }, dur + 60);
        };
        el.querySelector('#mb-rl-stop').addEventListener('click', stop);
      });
    }

    function makeApi(rid) {
      const live = () => !dead && rid === runId;
      const CHARS = {}; for (const k in CHARS_RAW) { const c = CHARS_RAW[k]; CHARS[k] = { ...c, face: A(c.face), panic: A(c.panic), smug: A(c.smug) }; }
      const MIMI = {}; for (const k in MIMI_RAW) MIMI[k] = A(MIMI_RAW[k]);
      const api = {
        alive: live, $, wait, rand, pick, shuffle, deck, key, label, rn, SYM, SUITS, SUIT_NAME, score, category, CAT_NAME, equity, cardHTML, backHTML, sfx, CHARS, MIMI, reduce, sparkles, reveal,
        root: gameRoot, host, stage, layer, asset: A,
        // 縦に長い舞台（スマホの単独ページ）で、結果の札が画面外に出ないよう舞台ごと見える所へ寄せる。組み込みでは何もしない
        fitStage() { if (dev && stage.getBoundingClientRect().height > window.innerHeight) stage.scrollIntoView({ block: 'center', behavior: 'auto' }); },
        // 遊びの中身だけに効く CSS を足す（同じ id は一度だけ）。セレクタは自動で .mb-host の下に閉じる
        css(id, text) { if (document.getElementById('mb-css-' + id)) return; const st = document.createElement('style'); st.id = 'mb-css-' + id; st.textContent = scopeCss(text); document.head.appendChild(st); },
        setOpp(id, line, bet, expr) {
          const c = CHARS[id] || CHARS.polka;
          api.char = c; api.charId = id;
          $('#mb-opp-name').textContent = c.name;
          api.emote(expr || 'think');
          api.say(line || '……'); $('#mb-opp-bet').textContent = bet == null ? '—' : bet;
        },
        // 相手の表情を変える（心理＝顔、論理＝ミニキャラ）
        emote(expr) {
          if (!live()) return;
          api.expr = expr;
          setPortrait(A, $('#mb-opp-portrait'), $('#mb-opp-face'), api.charId || 'polka', expr, g.group === 'logic' ? 'chibi' : 'face');
        },
        say(text, expr) { $('#mb-opp-line').textContent = text; if (expr) api.emote(expr); },
        bet(n) { $('#mb-opp-bet').textContent = n; },
        // リコ先輩の一言。expr は think（教える）/ smug / panic（あちゃー）/ lose（泣き笑い）/ win
        coach(html, expr) {
          $('#mb-coach').innerHTML = html;
          if (expr || !api.coachExpr) { api.coachExpr = expr || 'think'; setPortrait(A, $('#mb-coach-pop'), $('#mb-coach-img'), 'rico', api.coachExpr, 'chibi'); }
        },
        steps(names, on) { return `<div class="steps">${names.map((n, i) => `<span class="step ${i < on ? 'done' : i === on ? 'on' : ''}">${i + 1} ${n}</span>`).join('')}</div>`; },
        // 開始のカットイン（タップで飛ばせる）
        intro(kind) {
          return new Promise(res => {
            if (reduce) return res();
            const c = api.char || CHARS.polka;
            const el = document.createElement('div');
            el.className = 'mb-intro' + (kind === 'logic' ? ' is-logic' : '');
            el.innerHTML = `<div class="mb-intro-slab"></div><div class="mb-intro-mimi"><img src="${MIMI.smug}" alt=""></div><div class="mb-intro-opp"><img src="${c.smug}" alt=""></div>
              <div class="mb-intro-vs">VS</div><div class="mb-intro-word">${kind === 'logic' ? 'LOGIC BATTLE' : 'PSYCH BATTLE'}<small>${g.title}</small></div>`;
            layer.appendChild(el); sfx.whoosh();
            let done = false;
            const end = () => { if (done) return; done = true; el.remove(); res(); };
            el.addEventListener('click', end); setTimeout(end, 1300);
          });
        },
        // 「同じ場面を100回やったら」：運で勝ち負けしても、判断の得失は回数で見える（結果の extra に入れる）
        tally(winPct, winAmt, loseAmt, called) {
          const wins = Math.max(0, Math.min(100, Math.round(winPct)));
          const sum = wins * winAmt - (100 - wins) * loseAmt;
          const order = shuffle([...Array(100).keys()]); const winSet = new Set(order.slice(0, wins));
          const dots = [...Array(100).keys()].map(i => `<i class="${winSet.has(i) ? 'w' : 'l'}" style="--d:${i * 12}ms"></i>`).join('');
          const sg = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
          return `<div class="mb-tally"><div class="mb-tally-h">同じ場面を100回やったら（勝ち ${wins}回）</div><div class="mb-tally-dots">${dots}</div>
            <div class="mb-tally-sum"><span class="${called ? 'mine' : ''}">付いていく <b class="${sum >= 0 ? 'pos' : 'neg'}">${sg(sum)}</b></span><span class="${called ? '' : 'mine'}">降りる <b>±0</b></span></div></div>`;
        },
        // 読みに賭ける：自信の度合いを選ぶ。×1/×2/×3 を返す
        wager(o = {}) {
          return new Promise(res => {
            const b = o.base || 20;
            const box = document.createElement('div');
            box.className = 'mb-wager mb-pop';
            box.innerHTML = `<div class="mb-wager-q">${o.question || 'その読み、どのくらい自信ある？'}</div>
              <div class="mb-wager-chips">
                <button class="mb-wchip x1" data-m="1"><span>たぶん<b>×1</b></span></button>
                <button class="mb-wchip x2" data-m="2"><span>確信<b>×2</b></span></button>
                <button class="mb-wchip x3" data-m="3"><span>ぜったい<b>×3</b></span></button>
              </div>
              <div class="mb-wager-note">当たれば ${b}×倍率、外れたら その半分を失う${P.fever > 0 ? '（フィーバー中は当たりがさらに2倍）' : ''}</div>`;
            (o.into || gameRoot).appendChild(box);
            reveal(box, 'nearest');
            box.querySelectorAll('.mb-wchip').forEach(btn => btn.addEventListener('click', () => {
              if (!live()) return;
              sfx.tap(); const m = +btn.dataset.m; api.mult = m;
              // 自信の大きさに相手が反応する（×3 は焦る、×1 は余裕）
              if (m === 3) api.emote('panic'); else if (m === 1) api.emote('smug');
              box.querySelectorAll('.mb-wchip').forEach(x => { x.disabled = true; x.style.opacity = x === btn ? 1 : .3; });
              setTimeout(() => { box.remove(); res(m); }, 250);
            }));
          });
        },
        // 答え合わせとご褒美。correct / perfect / base / title / detail / art('win'|'lose')
        async finish(o) {
          if (!live()) return;
          const mult = api.mult || 1;
          const b = o.base || 20;
          const coins0 = P.coins;
          const feverOn = P.fever > 0; // この当たりが2倍になったか（表示用。入った瞬間の当たりは含まない）
          const feverDone = o.correct && P.fever === 1; // この当たりでフィーバーを当て切る
          let gain;
          if (o.correct) {
            P.combo++; P.best = Math.max(P.best, P.combo);
            const fever = P.fever > 0 ? 2 : 1;
            gain = b * mult * fever + (P.combo >= 2 ? (P.combo - 1) * 5 : 0) + (o.perfect ? 30 : 0);
            if (P.fever > 0) P.fever--;
            if (o.perfect) P.perfect++;
          } else {
            gain = -Math.round(b * mult / 2);
            P.combo = 0; P.fever = 0;
          }
          P.coins = Math.max(0, P.coins + gain);
          // 結果の前に、相手とリコ先輩の反応を一拍見せる
          if (o.correct) { api.emote('busted'); api.coach(o.perfect ? 'パーフェクト！ さすがミミ！' : '読み勝ち！', o.perfect ? 'win' : 'smug'); }
          else { api.emote('win'); api.coach('あちゃー……次は取り返そ', 'panic'); }
          await wait(reduce ? 0 : 750);
          if (!live()) return;
          if (o.correct) api.emote('lose');
          const enterFever = o.correct && P.combo > 0 && P.combo % 3 === 0 && P.fever === 0;
          if (enterFever) P.fever = 3;
          purse();
          const c = api.char || CHARS.polka;
          const cls = o.correct ? (o.perfect ? 'good perfect' : 'good') : 'bad';
          const art = o.correct ? c.panic : MIMI.sad;
          // 見抜かれる瞬間の動画（心理バトルで読み勝った時だけ）。動かない環境・読み込めない時は今までの絵のまま
          const MOTION = { polka: 1, selina: 1, grano: 1, velvet: 1 };
          const motion = o.correct && g.group === 'psych' && MOTION[api.charId] && !reduce ? A('art/motion/' + api.charId + '_busted.mp4') : '';
          const exitMode = !!opts.exitLabel; // 組み込み：ボタンは出口（onExit）。無ければ同じ種類をもう一回（単独ページ用）
          const el = document.createElement('div');
          el.className = 'mb-result ' + cls;
          el.innerHTML = `<div class="mb-result-card">
              ${P.combo >= 2 ? `<div class="mb-combo-pop">COMBO ${P.combo}</div>` : ''}
              <div class="mb-result-art${motion ? ' has-motion' : ''}"><img src="${art}" alt="">${motion ? `<video class="mb-result-motion" src="${motion}" muted playsinline autoplay preload="auto"></video>` : ''}</div>
              <div>
                <div class="mb-result-stamp">${o.title || (o.correct ? (o.perfect ? 'PERFECT READ!' : '読み勝ち！') : '読み違い……')}</div>
                <div class="mb-result-detail">${o.detail || ''}</div>
                <div class="mb-result-gain">${gain >= 0 ? '+' : '−'}${Math.abs(gain)}<small class="mb-result-sub"> コイン（×${mult}${o.correct && feverOn ? '・FEVER ×2' : ''}${o.perfect ? '・PERFECT +30' : ''}）</small></div>
                ${o.extra || ''}
              </div>
              <div class="mb-result-actions"><button class="btn gold" id="mb-next"${feverDone ? ' disabled' : ''}>${exitMode ? opts.exitLabel : `次の勝負へ<small>${o.nextHint || '同じ種類をもう一回'}</small>`}</button></div>
            </div>`;
          layer.appendChild(el);
          { const mv = el.querySelector('.mb-result-motion'); if (mv) { const box = mv.parentElement; mv.addEventListener('playing', () => box.classList.add('is-playing'), { once: true }); mv.addEventListener('error', () => mv.remove(), { once: true }); const pr = mv.play && mv.play(); if (pr && pr.catch) pr.catch(() => mv.remove()); } }
          // 縦に長い単独ページでは結果の札が画面外に出ることがあるので、見える所まで寄せる
          if (dev) { try { el.querySelector('.mb-result-card').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {} }
          if (o.correct) { sfx.fanfare(); const r = el.querySelector('.mb-result-stamp').getBoundingClientRect(); sparkles(r.left + r.width / 2, r.top + r.height / 2, o.perfect ? 40 : 20); }
          else sfx.nope();
          if (enterFever) {
            await wait(600);
            if (!live()) return;
            const fb = document.createElement('div'); fb.className = 'mb-fever-banner'; fb.innerHTML = 'PANYU FEVER!<small>3回、ご褒美2倍</small>';
            layer.appendChild(fb); sfx.jackpot(); setTimeout(() => fb.remove(), 1700);
          }
          if (feverDone) {
            await wait(900);
            if (!live()) return;
            await roulette(20);
            if (!live()) return;
          }
          const btn = el.querySelector('#mb-next'); btn.disabled = false;
          btn.addEventListener('click', () => {
            if (exited) return; exited = true; sfx.tap(); btn.disabled = true;
            const res = { gameId: g.id, group: g.group, charId: api.charId, correct: !!o.correct, perfect: !!o.perfect, mult, gain: P.coins - coins0 };
            if (typeof opts.onExit === 'function') { try { opts.onExit(res); } catch (e) { console.error(e); } }
          });
        },
      };
      return api;
    }

    async function play() {
      runId++;
      const rid = runId;
      layer.innerHTML = '';
      const api = makeApi(rid);
      gameRoot.innerHTML = '';
      api.coach('……');
      let who = (g.chars && g.chars.length) ? pick(g.chars) : 'polka';
      if (opts.charId && CHARS_RAW[opts.charId]) {
        if (!g.chars || g.chars.includes(opts.charId)) who = opts.charId;
        else console.warn('MB.mount: "' + g.id + '" has no scenes for "' + opts.charId + '" (chars: ' + g.chars.join(',') + '); using ' + who);
      }
      api.setOpp(who, '……', null);
      if (g.prepare) g.prepare({ api });
      purse();
      await api.intro(g.group);
      if (rid !== runId || dead) return;
      try { await g.start({ api }); } catch (e) { console.error(e); api.coach('（試作の不具合：' + e.message + '）'); }
    }
    purse();
    play();

    const inst = {
      gameId: g.id,
      roulette,
      restart() { if (!dead) { exited = false; play(); } },
      destroy() {
        if (dead) return; dead = true; runId++;
        try { autoReveal.disconnect(); clearTimeout(revealTimer); } catch (e) {}
        host.classList.remove('mb-host', 'is-dev', 'is-fever');
        host.innerHTML = '';
        if (lastInst === inst) lastInst = null;
      },
    };
    lastInst = inst;
    return inst;
  }
  let lastInst = null;

  // ---------- 単独ページ（battles/dev.html）用：種類のタブ付き ----------
  function boot(o = {}) {
    const nav = document.getElementById(o.tabsId || 'tabs');
    const hostEl = document.getElementById(o.hostId || 'mb-host');
    const groups = { psych: '心理', logic: '論理' };
    let inst = null, current = null;
    const select = (g) => {
      current = g;
      if (inst) inst.destroy();
      nav.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.id === g.id)));
      try { localStorage.setItem('mbTab', g.id); } catch (e) {}
      inst = mount(hostEl, { gameId: g.id, purse: P_DEFAULT, dev: true, onExit: () => select(current) });
      return inst;
    };
    for (const gk of ['psych', 'logic']) {
      const row = document.createElement('div'); row.className = 'tab-group';
      row.innerHTML = `<span>${gk === 'psych' ? 'PSYCH' : 'LOGIC'}</span>`;
      games.filter(g => g.group === gk).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(g => {
        const b = document.createElement('button');
        b.className = 'tab' + (g.isNew ? ' is-new' : ''); b.dataset.id = g.id; b.setAttribute('role', 'tab');
        b.innerHTML = `<small>${g.sub || groups[gk]}</small>${g.title}`;
        b.addEventListener('click', () => select(g));
        row.appendChild(b);
      });
      nav.appendChild(row);
    }
    let first = null;
    try { first = games.find(g => g.id === localStorage.getItem('mbTab')); } catch (e) {}
    select(first || games.find(g => g.group === 'psych') || games[0]);
  }

  window.MB = {
    register, mount, boot, config,
    get games() { return games.map(g => ({ id: g.id, group: g.group, title: g.title, chars: g.chars ? g.chars.slice() : null })); },
    get vol() { return VOL; }, set vol(v) { VOL = v; },
    P: P_DEFAULT,
    play: (g) => { const id = typeof g === 'string' ? g : g && g.id; const t = document.querySelector('#tabs .tab[data-id="' + id + '"]'); if (t) t.click(); },
    roulette: (u) => lastInst ? lastInst.roulette(u) : Promise.resolve(0),
  };
})();
