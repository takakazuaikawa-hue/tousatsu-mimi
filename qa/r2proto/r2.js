/* リーディング：値付け 試作（本編にはつながない単独ページ）
   数字は r2lib.js（Node で数えた値札表モデル）をそのまま埋め込んで使う。出方は §2-1 の決まりから計算する。 */
(function () {
'use strict';
const L = window.R2LIB;
const Q = new URLSearchParams(location.search);
const PLAIN = Q.get('mode') === 'plain';
const SEEN_KEY = 'r2proto_demo_seen_v1';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
if (Q.get('reset') === '1') lsDel(SEEN_KEY);

/* ---------- 場面（1つの表） ---------- */
const M = (n, size, say) => ({ n, who: 'mimi', size, say });
const G = n => ({ n, who: 'grano' });
const SCENES = [
 { id: 1, stage: 'guide', mine: 'Kd 8s', board: 'Ks 8d 4c 2h 6s', pot: 600, her: '4h 10h', hist: [M(3, 1, 'tight'), M(4, 1, 'tight')],
   rico: '小に「これが精一杯」が2回。小までの品だね' },
 { id: 2, stage: 'guide', mine: '9s 9h', board: 'Qh 9c 3d 5s 2c', pot: 900, her: 'Qd Jc', hist: [M(3, 1, 'cheap'), M(4, 2, 'tight')],
   rico: '小は「安い」、中は「これが精一杯」。上限は中' },
 { id: 3, stage: 'guide', mine: 'Ks Qs', board: '10s 9d 4c Jh 2d', pot: 900, her: '10h 10d', hist: [M(3, 1, 'cheap'), M(4, 2, 'cheap')],
   rico: '中にも「安い」。まだ上がある＝上物。ミミの手は一番強い。遠慮は要らないよ' },
 { id: 4, stage: 'solo', mine: '7s 7h', board: 'Kc 7d 3s 9h Ad', pot: 900, her: 'Kh Jd', hist: [M(3, 1, 'cheap'), M(4, 2, 'tight')],
   reveal: 'A が出て、K のペアは「小さい品」に値崩れ。上限は小（300）', foldLine: '惜しい。A が出てしまいましてな……' },
 { id: 5, stage: 'solo', mine: '8s 8d', board: 'Qh 8h 3c 6s 2d', pot: 1200, her: 'Ah 10h', hist: [M(3, 2, 'tight'), M(4, 2, 'tight')],
   reveal: 'どの値でも降りていた', tagText: '空箱：♥の待ちが外れた', alt: 'miss' },
 { id: 6, stage: 'solo', mine: 'As Ad', board: 'Jc 7d 4s 9h 2c', pot: 600, her: '2h 2d', hist: [M(3, 1, 'tight'), M(4, 1, 'tight')],
   reveal: '最後の 2 で、小さい品がスリーカードに化けた。上乗せは上物だけ' },
 { id: 7, stage: 'solo', mine: 'As Ad', board: 'Ah 10h 6c 3s 8h', pot: 1200, her: 'Kh Jh', hist: [M(3, 2, 'tight'), M(4, 2, 'tight')],
   reveal: '♥が3枚そろって、待ちが完成。払ってくれる品（A のペア）は、ミミが A を2枚持っているので少なかった', alt: 'flush' },
 { id: 8, stage: 'solo', mine: '9h 8h', board: '9s 8d 3c 4h Kd', pot: 600, her: '9d 4d', hist: [M(3, 1, null), G(4)],
   reveal: '自分から賭けた＝上物。上物は大まで払う', alt: 'win' },
];
const DEMO = { id: 0, stage: 'demo', mine: 'Js Jh', board: 'Ac Jd 5s 8h 3d', pot: 600, her: 'Ah 9h', hist: [M(3, 1, 'cheap'), M(4, 2, 'tight')] };

const SPEC = { // 仕様 §6 の表（増える分）。[受ける, 降りる]。選べない場面の見送りは r2lib の値
 1: { check: [0, 0], small: [200, 200], mid: [0, 0], big: [0, 0] },
 2: { check: [0, 0], small: [300, 300], mid: [600, 600], big: [0, 0] },
 3: { check: [450, -900], small: [600, -1200], mid: [600, 600], big: [900, 900] },
 4: { check: [0, 0], small: [300, 300], mid: [0, 0], big: [0, 0] },
 5: { check: [0, 0], small: [0, 0], mid: [0, 0], big: [0, 0] },
 6: { check: [-300, 0], small: [-400, -200], mid: [-400, -400], big: [-600, -600] },
 7: { check: [-600 * 0 + (-600), 0], small: [-800, -400], mid: [-800, -800], big: [-1200, -1200] },
 8: { check: [300, -600], small: [400, -800], mid: [400, 400], big: [600, 600] },
};
SPEC[7].check = [-600, 0];

/* ---------- 場面の計算（出方は値札表から） ---------- */
const OPTS = ['check', 'small', 'mid', 'big'];
const SIZE = { small: 1, mid: 2, big: 3 };
const LIMN = ['', '小', '中', '大'];
const OPTN = { check: '見送り', small: '小', mid: '中', big: '大' };
const cache = new Map();
function info(s) {
  if (cache.has(s)) return cache.get(s);
  const mine = L.P(s.mine), board = L.P(s.board), her = L.P(s.her);
  const t = L.tier(her, board);
  const c = L.cmp(L.best(mine.concat(board)), L.best(her.concat(board)));
  const I = { mine, board, her, t, res: c > 0 ? 1 : c < 0 ? -1 : 0 };
  cache.set(s, I); return I;
}
const amt = (s, opt) => opt === 'small' ? s.pot / 3 : opt === 'mid' ? s.pot * 2 / 3 : opt === 'big' ? s.pot : 0;
function outcome(s, opt) {
  const t = info(s).t;
  if (opt === 'check') return t === 3 ? { kind: 'bet' } : { kind: 'show' };
  const size = SIZE[opt];
  if (t === 0 || size > t) return { kind: 'fold', gap: t === 0 ? 99 : size - t };
  if (t === 3 && size === 1) return { kind: 'raise' };
  return { kind: 'pay', tight: size === t };
}
function reaction(s, opt, oc) {
  const t = info(s).t;
  if (oc.kind === 'raise') return { face: 'offer', line: 'おや、お安い！　では倍、上乗せましょう', pause: 0 };
  if (oc.kind === 'bet') return { face: 'offer', line: 'では私から。本物の品ですぞ', pause: 1000 };
  if (oc.kind === 'show') return { face: 'default', line: 'では、見せ合いといきましょう', pause: 0 };
  if (oc.kind === 'pay') {
    if (!oc.tight) return { face: 'cheap', line: '安いものですな。喜んで', kw: '安い', pause: 500 };
    return { face: 'haggle', line: t === 3 ? 'むう……正札ですな。……買いましょう' : 'むう……これが精一杯ですな。……買いましょう', kw: '精一杯', pause: 2000 };
  }
  if (t === 0) return { face: 'smug', line: 'これは値の付かぬ品でしてな', pause: 0 };
  if (oc.gap === 1) return { face: 'concerned', line: s.foldLine || '惜しい。あと少し安ければ、買いましたのに', pause: 1500 };
  return { face: 'smug', line: 'はっはっは、ご冗談を', pause: 0 };
}
// follow: 上乗せ／彼女の賭けに「受ける」か（null＝そういう場面ではない）
function chipDelta(s, opt, follow) { const I = info(s); return L.delta(opt, I.t, I.res, s.pot, follow !== false); }
function resolve(s, opt, follow) {
  const oc = outcome(s, opt), I = info(s);
  const needsFollow = oc.kind === 'raise' || oc.kind === 'bet';
  const folded = oc.kind === 'fold' || (needsFollow && follow === false);
  const showdown = !folded;
  return { oc, needsFollow, folded, showdown, delta: chipDelta(s, opt, needsFollow ? follow : true), react: reaction(s, opt, oc) };
}
const TIER_NAME = L.TN;
function roleName(mine, board) {
  const RN = r => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r);
  const v = L.best(mine.concat(board));
  switch (v[0]) {
    case 8: return 'ストレートフラッシュ';
    case 7: return RN(v[1]) + ' のフォーカード';
    case 6: return 'フルハウス';
    case 5: return 'フラッシュ';
    case 4: { const lo = v[1] - 4; return (lo < 2 ? 'A' : RN(lo)) + '〜' + RN(v[1]) + ' のストレート'; }
    case 3: return RN(v[1]) + ' のスリーカード';
    case 2: return RN(v[1]) + ' と ' + RN(v[2]) + ' のツーペア';
    case 1: return RN(v[1]) + ' のペア';
    default: return 'ハイカード';
  }
}
const cardHtml = (c, extra) => {
  const sym = { s: '♠', h: '♥', d: '♦', c: '♣' }[c.s], rn = ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[c.r] || String(c.r);
  return `<i class="cd${c.s === 'h' || c.s === 'd' ? ' r' : ''} ${extra || ''}"><b>${rn}</b><s>${sym}</s></i>`;
};
const fmt = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

/* 明かしで並べる「同じ跡を残す手」 */
const altCache = new Map();
function altInfo(s) {
  if (altCache.has(s)) return altCache.get(s);
  const R = L.range(s); let out = null;
  if (s.alt === 'miss') out = { title: '同じ跡の手', rows: [['良い品', R.filter(x => x.t === 2).length], ['外れた待ち', R.filter(x => x.t === 0).length]] };
  else if (s.alt === 'flush') out = { title: '同じ跡の手', rows: [['良い品', R.filter(x => x.t === 2).length], ['上物', R.filter(x => x.t === 3).length]] };
  else if (s.alt === 'win') out = { title: '同じ跡の上物', rows: [['ミミの勝ち', R.filter(x => x.t === 3 && x.res > 0).length], ['ミミの負け', R.filter(x => x.t === 3 && x.res < 0).length]] };
  altCache.set(s, out); return out;
}

/* ---------- 絵（ビルドで data URI を CSS 変数に入れてある） ---------- */
// 窓は 304x370。顔から胸元まで。sc＝縮尺、sx/sy＝元絵の切り出し開始位置
const FACES = {
  smug:      { img: '--a-cut_smug',   w: 1000, h: 563, sx: 330, sy: 0, sc: .66 },
  haggle:    { img: '--a-cut_haggle', w: 1000, h: 563, sx: 300, sy: 0, sc: .66 },
  panic:     { img: '--a-cut_panic',  w: 1000, h: 563, sx: 300, sy: 0, sc: .66 },
  default:   { img: '--a-g_default',  w: 667,  h: 1000, sx: 120, sy: 0, sc: .92 },
  cheap:     { img: '--a-g_recommend', w: 667, h: 1000, sx: 110, sy: 0, sc: .92 },
  concerned: { img: '--a-g_concerned', w: 667, h: 1000, sx: 100, sy: 0, sc: .92 },
  offer:     { img: '--a-g_offer',    w: 825,  h: 1100, sx: 210, sy: 0, sc: .86 },
};

/* ---------- 音（小さな効果音。無くても動く） ---------- */
let AC = null;
function tone(f, d, type, vol, delay, f2) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(vol || .05, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + .02);
  } catch (e) {}
}
const SFX = {
  tap: () => tone(740, .06, 'triangle', .05),
  chip: () => { tone(1900, .07, 'square', .025); tone(2500, .09, 'square', .02, .05); },
  line: () => tone(260, .9, 'sine', .04, 0, 1100),
  pay: () => { tone(660, .12, 'triangle', .05); tone(880, .16, 'triangle', .05, .1); tone(1320, .22, 'triangle', .05, .2); },
  fold: () => tone(240, .35, 'sawtooth', .03, 0, 110),
  flip: () => tone(500, .08, 'triangle', .04, 0, 800),
  lose: () => { tone(300, .2, 'sawtooth', .04); tone(200, .3, 'sawtooth', .04, .18); },
};

/* ---------- 記録（window に出す） ---------- */
const LOG = { mode: PLAIN ? 'plain' : 'read', scenes: [], demoOpened: 0, tagOpened: 0, ricoAsked: 0, total: 0, start: Date.now() };
window.R2LOG = LOG;

/* ---------- 舞台（板の中身。本番用とお手本用の2つを作る） ---------- */
const TEMPLATE = `
<div class="felt"></div><div class="spot"></div>
<div class="win"><div class="face fa"></div><div class="face fb"></div></div>
<svg class="wf" viewBox="0 0 800 370" preserveAspectRatio="none"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e9c46a"/><stop offset="1" stop-color="#9a6a1c"/></linearGradient></defs>
<polygon points="0,0 304,0 267,370 0,370" fill="none" stroke="#1c0409" stroke-width="9"/>
<polygon points="0,0 304,0 267,370 0,370" fill="none" stroke="url(#gg)" stroke-width="4"/>
<line x1="311" y1="0" x2="274" y2="370" stroke="#e9c46a" stroke-width="1.5" opacity=".7"/></svg>
<div class="val"></div><div class="rail"></div>
<div class="rib r1"></div><div class="rib r2" style="top:48px"></div><div class="demoband">お手本</div>
<div class="top"><div class="ins"></div><button class="tbtn demo">お手本</button><button class="tbtn tag">値札<i></i></button></div>
<div class="bub"><span></span></div>
<div class="row1"><div class="bd"></div><div class="hd"></div><div class="rn"></div><div class="alt"></div></div>
<div class="trail"></div>
<div class="rv"><div class="hc"></div><div class="tg"></div></div>
<div class="pz"><div class="gl"></div><div class="gll"></div><div class="piles"></div><div class="pot"></div></div>
<div class="fc"></div>
<div class="ft"><span class="hint"></span><button class="go" disabled></button></div>
<button class="ask">リコに聞く</button>
<div class="rico"><div class="rc"></div><div class="rb"></div></div>
<div class="sheet"><button class="x">閉じる</button></div>
<div class="finger"></div><div class="loupe"></div><div class="flt"></div>
<button class="skip">とばす</button>
<div class="card4"></div><div class="endp"></div>
<div class="intro"><div class="band"><div class="rd">READING</div></div><div class="sub">リーディング：値付け</div></div>`;

const CANCEL = { cancel: true };
class Stage {
  constructor(host, opt) {
    this.opt = opt || {};
    this.root = document.createElement('div');
    this.root.className = 'sg' + (this.opt.demo ? ' demo' : '') + (PLAIN ? ' plain' : '');
    this.root.innerHTML = TEMPLATE;
    host.appendChild(this.root);
    this.q = s => this.root.querySelector(s);
    this.faces = [this.q('.fa'), this.q('.fb')]; this.layer = 1; this.waker = null; this.dead = false; this.skipped = false;
    this.root.addEventListener('pointerdown', e => { if (!e.target.closest('button')) this.wake(); });
    this.q('.tbtn.demo').addEventListener('click', () => { SFX.tap(); this.opt.onDemo && this.opt.onDemo(); });
    this.q('.tbtn.tag').addEventListener('click', () => { SFX.tap(); this.openSheet(); });
    this.q('.ask').addEventListener('click', () => { SFX.tap(); this.ask(); });
    this.q('.sheet .x').addEventListener('click', () => this.q('.sheet').classList.remove('on'));
    this.q('.skip').addEventListener('click', () => { this.skipped = true; this.wake(); });
    this.q('.rib.r1').style.display = this.q('.rib.r2').style.display = 'none';
    if (PLAIN) { this.q('.tbtn.demo').classList.add('off'); this.q('.tbtn.tag').classList.add('off'); }
    this.buildSheet();
  }
  /* 待ち：押すと早送り。お手本の「とばす」では全部すっ飛ばす */
  w(ms) {
    return new Promise((res, rej) => {
      if (this.dead) return rej(CANCEL);
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(t); if (this.waker === fin) this.waker = null; this.dead ? rej(CANCEL) : this.skipped && this.opt.demo ? rej(this.SKIP) : res(); };
      const t = setTimeout(fin, ms); this.waker = fin;
    });
  }
  wake() { if (this.waker) this.waker(); }
  destroy() { this.dead = true; this.wake(); this.root.remove(); }
  /* 窓 */
  face(key) {
    const F = FACES[key] || FACES.default, nx = this.layer ? 0 : 1, el = this.faces[nx];
    el.style.backgroundImage = `var(${F.img})`; el.style.backgroundSize = `${F.w * F.sc}px ${F.h * F.sc}px`;
    el.style.backgroundPosition = `${-F.sx * F.sc}px ${-F.sy * F.sc}px`;
    el.classList.add('on'); this.faces[this.layer].classList.remove('on'); this.layer = nx; this.faceKey = key;
  }
  ins(t) { this.q('.ins').textContent = t; }
  bub(t, kind) {
    const b = this.q('.bub');
    if (!t) { b.classList.remove('on'); return; }
    b.className = 'bub on' + (kind === 'fact' ? ' fact' : '');
    b.querySelector('span').innerHTML = t;
  }
  rib(i, total) {
    this.q('.rib.r1').style.display = this.q('.rib.r2').style.display = PLAIN && false ? 'none' : 'block';
    this.q('.rib.r1').innerHTML = `場面 <b>${i}</b>／8`;
    this.q('.rib.r2').innerHTML = `増えた分 <b>${fmt(total)}</b>`;
  }
  /* 札・跡・山 */
  load(s, kind) {
    this.s = s; this.kind = kind; const I = info(s);
    this.root.classList.toggle('kwg', kind === 'guide' || kind === 'demo');
    this.q('.bd').innerHTML = I.board.map((c, i) => i === 4 ? cardHtml(c, 'back') : cardHtml(c)).join('');
    this.river = false;
    this.q('.hd').innerHTML = I.mine.map(c => cardHtml(c)).join('');
    this.rnSet();
    this.q('.alt').classList.remove('on'); this.q('.rn').style.display = '';
    this.q('.trail').innerHTML = ''; this.q('.trail').style.display = ''; this.q('.trail').classList.remove('dim');
    this.q('.rv').classList.remove('on'); this.q('.fc').classList.remove('on');
    const gl = this.q('.gl'); gl.style.opacity = 0; this.q('.gll').style.opacity = 0; this.q('.piles').style.display = '';
    this.buildPiles(); this.setPot();
    this.bub(null); this.face('smug'); this.sel = null;
    const go = this.q('.go'); go.disabled = true; go.textContent = PLAIN ? '額を選んでください' : '山を選んでね'; go.classList.remove('ready');
    this.q('.hint').textContent = '';
    this.q('.ask').classList.toggle('on', kind === 'guide');
    this.q('.tbtn.tag').classList.toggle('dot', kind === 'guide' && !this.tagSeen);
    this.q('.rico').classList.remove('on');
  }
  rnSet() {
    const I = info(this.s), n = this.river ? 5 : 4;
    this.q('.rn').innerHTML = `<small>ミミの手</small>${roleName(I.mine, I.board.slice(0, n))}`;
  }
  flipRiver(quiet) {
    const I = info(this.s), el = this.q('.bd').children[4];
    el.outerHTML = cardHtml(I.board[4], 'last' + (quiet ? '' : ' flip'));
    this.river = true; this.rnSet(); if (!quiet) SFX.flip();
  }
  setPot() {
    const p = this.q('.pot'), n = 4;
    let h = ''; for (let i = 0; i < n; i++) h += `<div class="chip" style="bottom:${i * 5}px;background-image:var(--a-chip_${i % 2 ? 'gold' : 'white'})"></div>`;
    p.innerHTML = `<div class="stk">${h}</div><div class="pl">${PLAIN ? 'ポット' : 'ポット'} <s>${this.s.pot}</s></div>`;
  }
  buildPiles() {
    const s = this.s, P = this.q('.piles'); P.innerHTML = ''; P.classList.add('dim');
    const opts = this.kind === 'guide' || this.kind === 'demo' ? ['small', 'mid', 'big'] : OPTS;
    for (const opt of opts) {
      const b = document.createElement('button'); b.className = 'pile'; b.dataset.opt = opt;
      if (PLAIN) {
        b.classList.add('plainb');
        const nm = { check: 'チェック', small: '1/3', mid: '2/3', big: 'ポット' }[opt];
        b.innerHTML = `<div class="pl">${nm}<br><s>${opt === 'check' ? '' : amt(s, opt)}</s></div>`;
      } else if (opt === 'check') {
        b.classList.add('chk'); b.innerHTML = `<div class="slab">♠</div><div class="pl">見送る</div>`;
      } else {
        const n = { small: 3, mid: 6, big: 9 }[opt], col = { small: 'white', mid: 'blue', big: 'red' }[opt];
        let h = ''; for (let i = 0; i < n; i++) h += `<div class="chip" style="bottom:${i * 5}px;background-image:var(--a-chip_${col})"></div>`;
        b.innerHTML = `<div class="stk">${h}</div><div class="pl">${OPTN[opt]} <s>${amt(s, opt)}</s></div>`;
      }
      b.addEventListener('click', () => { if (!this.pickResolve && !this.opt.demo) return; SFX.tap(); this.select(opt); });
      P.appendChild(b);
    }
  }
  select(opt) {
    this.sel = opt;
    this.root.querySelectorAll('.pile').forEach(b => b.classList.toggle('sel', b.dataset.opt === opt));
    const go = this.q('.go'); go.disabled = false; go.classList.add('ready');
    go.textContent = opt === 'check' ? (PLAIN ? 'チェックする' : '値を付けずに見せ合う') : `${amt(this.s, opt)} を${PLAIN ? '賭ける' : '付ける'}`;
  }
  enablePiles(on) { this.q('.piles').classList.toggle('dim', !on); }
  /* 跡 */
  trailLine(h, extra) {
    const d = document.createElement('div'); d.className = 'tl' + (extra ? ' ' + extra : ''); d.innerHTML = h;
    this.q('.trail').appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('on'))); return d;
  }
  trailHtml(st) {
    const nm = st.n === 3 ? 'フロップ' : 'ターン';
    if (st.who === 'grano') return { html: `<span class="dm">◆</span><span>${nm}：ミミは見送り。グラーノが賭けた。ミミは払った</span>`, say: '良い品には値を付けます', face: 'offer' };
    const sz = ['', 'small', 'mid', 'big'][st.size], word = { cheap: '安い', tight: '精一杯' }[st.say];
    const quote = st.say === 'cheap' ? '安いものですな' : st.say === 'tight' ? '……これが精一杯ですな' : null;
    const qh = quote ? '『' + quote.replace(word, `<span class="kw">${word}</span>`) + '』' : '';
    return { html: `<i class="mk ${sz === 'small' ? '' : sz}"></i><span>${nm}：${LIMN[st.size]}に払った${qh}</span>`, say: quote, face: st.say === 'cheap' ? 'cheap' : st.say === 'tight' ? 'haggle' : 'smug' };
  }
  async runTrail() {
    const s = this.s;
    for (const st of s.hist) {
      const t = this.trailHtml(st); this.trailLine(t.html);
      if (t.say) { this.face(t.face); this.bub(t.say.replace(/(安い|精一杯)/, '<span class="kw">$1</span>')); }
      SFX.chip(); await this.w(1000);
    }
    this.flipRiver(); await this.w(900);
  }
  /* 値踏み：ルーペと金の線 */
  lineY(t) { return t === 0 ? 66 : 66 - (({ 1: 3, 2: 6, 3: 9 })[t] - 1) * 5 - 31; }
  async showLine(t, wait) {
    const gl = this.q('.gl'), s = this.s;
    gl.style.transition = 'none'; gl.style.top = '80px'; gl.style.opacity = 0; void gl.offsetWidth;
    const gll = this.q('.gll'); gll.style.opacity = 0; gll.innerHTML = t === 0 ? 'グラーノの上限<br>なし（空箱）' : `グラーノの上限<br>${LIMN[t]}（${amt(s, ['', 'small', 'mid', 'big'][t])}）`;
    gl.style.transition = 'top .9s cubic-bezier(.2,.8,.2,1), opacity .25s'; gl.style.top = this.lineY(t) + 'px'; gl.style.opacity = 1; gll.style.opacity = 1; SFX.line();
    if (wait !== false) await this.w(1000);
  }
  async appraise(r, t, opt) {
    const lp = this.q('.loupe'); lp.classList.remove('on'); void lp.offsetWidth; lp.classList.add('on');
    this.bub(null); this.q('.trail').classList.add('dim');
    await this.w(900); lp.classList.remove('on');
    if (opt !== 'check') await this.showLine(t);
    this.face(r.react.face);
    const kw = r.react.kw ? r.react.line.replace(r.react.kw, `<span class="kw g">${r.react.kw}</span>`) : r.react.line;
    this.bub(kw); window.R2.phase = 's' + this.s.id + '-said';
    if (r.react.kw) SFX.pay(); else if (r.oc.kind === 'fold') SFX.fold(); else SFX.chip();
    await this.w(900 + r.react.pause);
  }
  /* 受ける／降りる */
  askFollow(title, yesB, yesS, noB, noS, hint) {
    return new Promise(res => {
      this.ins(title); this.q('.piles').style.display = 'none'; const fc = this.q('.fc');
      fc.innerHTML = `<button class="yes"><b>${yesB}</b><span>${yesS}</span></button><button class="no"><b>${noB}</b><span>${noS}</span></button>`;
      fc.classList.add('on'); this.q('.hint').textContent = hint || '';
      const go = this.q('.go'); go.disabled = true; go.classList.remove('ready'); go.textContent = '選んでね';
      const done = v => { SFX.tap(); fc.classList.remove('on'); this.q('.hint').textContent = ''; res(v); };
      fc.querySelector('.yes').onclick = () => done(true); fc.querySelector('.no').onclick = () => done(false);
    });
  }
  /* 明かし */
  async reveal(s, opt, r, follow, total) {
    const I = info(s), t = I.t, root = this.root;
    this.q('.trail').style.display = 'none'; this.q('.piles').style.display = '';
    this.enablePiles(false); this.q('.fc').classList.remove('on');
    const rv = this.q('.rv'); rv.classList.add('on');
    const tagText = PLAIN ? '' : (s.tagText || (t === 0 ? '空箱：払わない' : `${TIER_NAME[t]}：${LIMN[t]}まで`));
    const showHer = r.showdown;
    this.q('.rv .hc').innerHTML = I.her.map(c => cardHtml(c, 'sm back')).join('');
    let foldTag = '';
    if (!showHer) foldTag = (t === 0 || r.oc.kind !== 'fold') ? '' : `<span style="font-size:16px;font-weight:700">${LIMN[t]}までなら買いましたぞ</span>`;
    const win = s.pot, dText = r.delta === 0 ? '0' : fmt(r.delta);
    this.q('.rv .tg').innerHTML = (PLAIN ? '' : `<b>${tagText}</b>`) + (foldTag && !PLAIN ? foldTag + '<br>' : '') +
      `<span class="gain ${r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : ''}">値付けで増えた分 ${dText}</span>`;
    if (PLAIN && !showHer) this.q('.rv .tg').innerHTML = `<span style="font-size:17px">相手は降りた</span><br>` + `<span class="gain ${r.delta > 0 ? 'plus' : r.delta < 0 ? 'minus' : ''}">増えた分 ${dText}</span>`;
    // 値の線は、まだ出していなければここで出す
    if (!PLAIN && opt === 'check') this.showLine(t, false);
    // 彼女の札
    await this.w(350);
    if (showHer) {
      const kids = this.q('.rv .hc').children; for (const k of kids) { k.classList.remove('back'); k.classList.add('flip'); }
      this.q('.rv .hc').innerHTML = I.her.map(c => cardHtml(c, 'sm flip')).join(''); SFX.flip();
    }
    // 一行（事実だけ）
    let fact;
    if (PLAIN) fact = showHer ? `見せ合い：${I.res > 0 ? 'ミミの勝ち' : I.res < 0 ? 'ミミの負け' : '引き分け'}` : '相手は降りました';
    else if (s.reveal) fact = s.reveal;
    else if (opt === 'check') fact = '値を付けずに見せ合った';
    else fact = `上限は${LIMN[t]}（${amt(s, ['', 'small', 'mid', 'big'][t])}）。付けた値は${OPTN[opt]}（${amt(s, opt)}）`;
    // 彼女が見せ合いで負けた時のひと言
    if (showHer && I.res > 0 && !PLAIN) { this.face('panic'); this.bub('これは一本取られましたな……'); SFX.lose(); }
    else if (showHer && I.res < 0 && !PLAIN) { this.face('smug'); this.bub('ふふ、いい取引でしたな'); }
    // 数字が飛ぶ
    const ft = this.q('.flt'); ft.className = 'flt' + (r.delta < 0 ? ' minus' : ''); ft.textContent = r.delta === 0 ? '±0' : fmt(r.delta);
    ft.style.left = '480px'; ft.style.top = '150px'; void ft.offsetWidth; ft.classList.add('on');
    if (r.delta > 0) SFX.pay(); else if (r.delta < 0) SFX.lose();
    await this.w(PLAIN ? 600 : 1500);
    this.bub(fact, 'fact');
    const alt = !PLAIN && s.alt ? altInfo(s) : null;
    if (alt) {
      const a = this.q('.alt'); a.innerHTML = `<small>${alt.title}</small>` + alt.rows.map(x => `<div>${x[0]} ${x[1]}</div>`).join('');
      a.classList.add('on'); this.q('.rn').style.display = 'none';
    }
  }
  /* 値札の板 */
  buildSheet() {
    this.q('.sheet').insertAdjacentHTML('beforeend', `<h3>グラーノの値札</h3>
<div class="r"><b>上物</b><span>ツーペアより上。大（ポット同額）まで払う。小には上乗せ。見送ると自分から賭けてくる</span></div>
<div class="r"><b>良い品</b><span>場の一番上の札とのペア、またはそれより上のポケットペア。中（3分の2）まで払う</span></div>
<div class="r"><b>小さい品</b><span>それより下のペア。小（3分の1）まで払う</span></div>
<div class="r"><b>空箱</b><span>ペアなし。どの値でも払わない</span></div>
<div class="n">待ち（あと1枚でフラッシュかストレート）は、途中の札で中まで払う。最後の札で外れたら空箱。自分から賭けてきたら、必ず上物。</div>
<div class="n">口ぐせ：「安いものですな」＝上限は今の値より上。「……これが精一杯ですな」＝上限はちょうど今の値。</div>`);
  }
  openSheet() { this.q('.sheet').classList.add('on'); if (!this.opt.demo) { LOG.tagOpened++; this.curNote = (this.curNote || 0) + 1; } this.tagSeen = true; this.q('.tbtn.tag').classList.remove('dot'); }
  /* リコ */
  ricoSay(t, img) {
    const r = this.q('.rico');
    if (!t) { r.classList.remove('on'); return; }
    r.querySelector('.rc').style.backgroundImage = `var(--a-${img || 'rico_think'})`;
    r.querySelector('.rb').textContent = t; r.classList.add('on');
  }
  ask() {
    LOG.ricoAsked++; this.curAsk = (this.curAsk || 0) + 1;
    this.ricoSay(this.s.rico, 'rico_think'); this.q('.ask').classList.remove('on');
    const off = () => { this.q('.rico').classList.remove('on'); this.q('.ask').classList.add('on'); this.root.removeEventListener('pointerdown', off, true); };
    setTimeout(() => this.root.addEventListener('pointerdown', off, true), 300);
  }
  /* 入り */
  async intro(ms) {
    const it = this.q('.intro'); it.classList.add('on');
    await this.w(ms).catch(e => { it.classList.remove('on'); throw e; });
    it.classList.remove('on');
  }
  // お手本・本番どちらでも使う座標（板の中）
  pos(el) { let x = 0, y = 0; while (el && el !== this.root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; }
}
Stage.prototype.SKIP = { skip: true };

/* ---------- 画面の大きさに合わせる ---------- */
const boardEl = document.getElementById('board');
function fit() {
  const s = Math.min(innerWidth / 800, innerHeight / 370);
  boardEl.style.transform = `translate(-50%,-50%) scale(${s})`; window.R2SCALE = s;
}
addEventListener('resize', fit); fit();

/* ---------- お手本 ---------- */
let demoRunning = false;
async function runDemo(first) {
  if (demoRunning) return; demoRunning = true;
  const d = new Stage(boardEl, { demo: true });
  const fin = () => d.q('.finger');
  const goto = (el, dx, dy) => { const p = d.pos(el), f = fin(); f.classList.add('on'); f.style.left = (p.x + (dx ?? el.offsetWidth / 2) - 20) + 'px'; f.style.top = (p.y + (dy ?? el.offsetHeight / 2) - 20) + 'px'; };
  const s = DEMO; window.R2DEMO = d;
  try {
    d.load(s, 'demo'); d.q('.ask').classList.remove('on'); d.q('.go').textContent = '山を選んでね';
    window.R2.phase = 'demo-0';
    d.face('smug'); await d.intro(1500);
    window.R2.phase = 'demo-1';
    d.ins('ミミは強い手。いくらなら、グラーノは払う？');
    d.root.querySelectorAll('.hd .cd').forEach(c => c.classList.add('glow')); d.q('.rn').classList.add('hl');
    d.ricoSay('強い手の時は、相手が払える一番高い値を付けたいよね', 'rico_think');
    await d.w(2200);
    d.root.querySelectorAll('.hd .cd').forEach(c => c.classList.remove('glow')); d.q('.rn').classList.remove('hl');
    window.R2.phase = 'demo-2';
    for (const st of s.hist) {
      const t = d.trailHtml(st); d.trailLine(t.html, st.size === 2 ? 'turn' : 'flop');
      d.face(t.face); d.bub(t.say.replace(/(安い|精一杯)/, '<span class="kw">$1</span>')); SFX.chip(); await d.w(1500);
    }
    window.R2.phase = 'demo-stop1';
    d.trail = d.q('.trail'); const turn = d.q('.tl.turn'); turn.classList.add('hl');
    d.root.querySelector('.pile[data-opt=mid]').classList.add('hl'); d.q('.bub .kw').classList.add('g');
    d.ricoSay('「これが精一杯」は、そこが上限ってこと。中までしか出せない品だね', 'rico_smug');
    await d.w(4000);
    turn.classList.remove('hl'); d.root.querySelector('.pile[data-opt=mid]').classList.remove('hl');
    window.R2.phase = 'demo-3';
    d.ricoSay(null); d.flipRiver(); await d.w(1500);
    window.R2.phase = 'demo-stop2';
    d.q('.bd').children[4].classList.add('glow'); d.q('.bd').children[0].classList.add('glow');
    d.ricoSay('最後の札は小さい 3。彼女の品は変わらない。上限は中のまま', 'rico_think');
    await d.w(4000);
    d.root.querySelectorAll('.bd .cd').forEach(c => c.classList.remove('glow'));
    window.R2.phase = 'demo-4';
    d.ricoSay('だから、中', 'rico_smug'); d.bub(null); d.q('.trail').classList.add('dim');
    d.ins('山を選んで、決めるボタンを押す'); d.enablePiles(true);
    const midP = d.root.querySelector('.pile[data-opt=mid]'); goto(midP, 40, 40); await d.w(900);
    fin().classList.add('press'); await d.w(180); fin().classList.remove('press'); SFX.tap(); d.select('mid'); await d.w(500);
    goto(d.q('.go'), 75, 23); await d.w(900);
    fin().classList.add('press'); await d.w(180); fin().classList.remove('press'); SFX.tap(); fin().classList.remove('on'); await d.w(300);
    window.R2.phase = 'demo-5';
    d.ricoSay(null); d.enablePiles(false);
    const r = resolve(s, 'mid', null), t = info(s).t;
    await d.appraise(r, t, 'mid'); await d.w(500);
    const ft = d.q('.flt'); ft.className = 'flt'; ft.textContent = fmt(r.delta); ft.style.left = '470px'; ft.style.top = '150px'; void ft.offsetWidth; ft.classList.add('on'); SFX.pay();
    d.rib(0, 0); d.q('.rib.r1').style.display = d.q('.rib.r2').style.display = 'none';
    await d.w(1600);
    window.R2.phase = 'demo-stop3';
    d.q('.bub').classList.remove('on'); d.q('.trail').style.display = 'none';
    const tip = (x, y, h) => { const e = document.createElement('div'); e.className = 'tip'; e.style.left = x + 'px'; e.style.top = y + 'px'; e.innerHTML = h; d.root.appendChild(e); return e; };
    const pm = d.pos(d.q('.piles'));
    tip(pm.x - 4, 172, '払う。でも<br>200の取りこぼし'); tip(pm.x + 172, 172, '高すぎ。<br>降りられて0');
    d.ricoSay('線より低い値なら払う。高いと降りる。線の高さぴったりが一番もうかる', 'rico_smug');
    await d.w(4000);
    d.root.querySelectorAll('.tip').forEach(e => e.remove());
    window.R2.phase = 'demo-6';
    d.q('.gl').style.opacity = 0.9; d.q('.gll').style.opacity = 1; d.ricoSay('答えは彼女の札。読む材料は、口ぐせと場札だよ', 'rico_think');
    d.q('.trail').style.display = 'none'; d.q('.rv').classList.add('on');
    d.q('.rv .hc').innerHTML = info(s).her.map(c => cardHtml(c, 'sm')).join('');
    d.q('.rv .tg').innerHTML = `<b>良い品：中まで</b><span class="gain plus">値付けで増えた分 +400</span>`;
    d.bub('上限は中（400）。付けた値は中（400）', 'fact'); SFX.flip();
    await d.w(2600);
  } catch (e) { if (e !== d.SKIP && e !== CANCEL) throw e; }
  // 4点の札
  d.skipped = false; d.dead = false;
  window.R2.phase = 'demo-card4'; d.ricoSay(null); d.root.querySelectorAll('.tip').forEach(e => e.remove());
  const c4 = d.q('.card4');
  c4.innerHTML = `<h3>リーディング：値付け　はじめる前に</h3>
<p><b>目的</b>　ミミが強い手の時、グラーノが払える一番高い値を付けて、チップを多くもらう。</p>
<p><b>やり方</b>　値の山（小・中・大）を選んで出す。上限までなら払う。上限は彼女の手で決まっている。</p>
<p><b>危なさ</b>　上限より高いと降りられて、増えない。彼女の方が強い手なら、付けた分を失う。</p>
<p><b>見る物</b>　払った時の口ぐせ（安い＝まだ上がある／これが精一杯＝そこが上限）と、最後の札。分からなければ右上の「値札」。</p>
<button class="gob">${first ? 'はじめる' : 'もどる'}</button>`;
  c4.classList.add('on'); d.q('.skip').style.display = 'none';
  await new Promise(res => c4.querySelector('.gob').addEventListener('click', () => { SFX.tap(); res(); }));
  lsSet(SEEN_KEY, '1');
  d.destroy(); window.R2DEMO = null; demoRunning = false; window.R2.phase = 'back';
}

/* ---------- 本番の流れ ---------- */
let main, total = 0;
window.R2 = { phase: 'boot', LOG, SCENES, DEMO, info, outcome, resolve, fmt };
async function playScene(idx) {
  const s = SCENES[idx], I = info(s);
  const kind = PLAIN ? 'plain' : s.stage;
  main.load(s, kind); main.rib(idx + 1, total);
  const rec = { id: s.id, opt: null, secs: null, follow: null, delta: null, tag: 0, ask: 0, demo: 0 };
  main.curNote = 0; main.curAsk = 0; const demo0 = LOG.demoOpened;
  if (!PLAIN) { window.R2.phase = 's' + s.id + '-intro'; await main.intro(1200); }
  main.ins(PLAIN ? '賭ける額を選んでください' : 'いくらなら、グラーノは払う？');
  window.R2.phase = 's' + s.id + '-trail';
  if (PLAIN) main.flipRiver(true); else await main.runTrail();
  // 値を付ける
  main.ins(PLAIN ? '賭ける額を選んでください' : '山を選んで、決めるボタンを押す');
  main.enablePiles(true); main.q('.trail').classList.remove('dim');
  main.q('.hint').textContent = PLAIN ? '' : (kind === 'guide' ? '上限より高いと、降りられる' : '');
  window.R2.phase = 's' + s.id + '-pick';
  const t0 = performance.now();
  const opt = await new Promise(res => {
    main.pickResolve = res;
    main.q('.go').onclick = () => { if (!main.sel) return; SFX.tap(); res(main.sel); };
  });
  main.pickResolve = null; main.q('.go').onclick = null;
  rec.secs = +((performance.now() - t0) / 1000).toFixed(1); rec.opt = opt;
  main.enablePiles(false); main.q('.go').disabled = true; main.q('.go').classList.remove('ready'); main.q('.hint').textContent = '';
  main.q('.go').textContent = '…';
  const oc = outcome(s, opt);
  let r = resolve(s, opt, oc.kind === 'raise' || oc.kind === 'bet' ? true : null);
  window.R2.phase = 's' + s.id + '-appraise';
  if (PLAIN) {
    main.ins({ fold: '相手：フォールド', pay: '相手：コール', show: '相手：チェック', raise: '相手：レイズ', bet: '相手：ベット' }[oc.kind]); await main.w(900);
  } else await main.appraise(r, I.t, opt);
  let follow = null;
  if (oc.kind === 'raise' || oc.kind === 'bet') {
    window.R2.phase = 's' + s.id + '-follow';
    const a = amt(s, opt);
    if (oc.kind === 'raise') {
      const more = s.pot * 2 / 3 - a;
      follow = await main.askFollow(PLAIN ? '相手がレイズ。受ける？' : 'グラーノが上乗せてきた。受ける？', '受ける', `あと${more}出して見せ合う`, '降りる', `付けた${a}を失う`,
        kind === 'guide' ? 'グラーノの上乗せは、上物だけ' : '');
    } else {
      const b = s.pot / 2;
      follow = await main.askFollow(PLAIN ? '相手がベット。受ける？' : 'グラーノが賭けてきた。受ける？', '受ける', `${b}出して見せ合う`, '降りる', 'ここで勝負をやめる',
        kind === 'guide' ? 'グラーノが自分から賭けたら、上物' : '');
    }
    rec.follow = follow; r = resolve(s, opt, follow);
  }
  rec.delta = r.delta; total += r.delta; LOG.total = total;
  window.R2.phase = 's' + s.id + '-reveal';
  main.ins(PLAIN ? '結果' : '明かし');
  await main.reveal(s, opt, r, follow, total);
  main.rib(idx + 1, total);
  rec.tag = main.curNote || 0; rec.ask = main.curAsk || 0; rec.demo = LOG.demoOpened - demo0;
  LOG.scenes.push(rec);
  const go = main.q('.go'); go.disabled = false; go.classList.add('ready'); go.textContent = idx === 7 ? '結果を見る' : '卓へ';
  window.R2.phase = 's' + s.id + '-done';
  await new Promise(res => { go.onclick = () => { SFX.tap(); res(); }; });
  go.onclick = null;
}
function endScreen() {
  const e = main.q('.endp'); const picks = LOG.scenes.slice(-8);
  const cell = p => `<span>場面${p.id}　${OPTN[p.opt]}${p.follow === true ? '（受）' : p.follow === false ? '（降）' : ''}　${p.delta === 0 ? '0' : fmt(p.delta)}</span>`;
  e.innerHTML = `<h3>8場面の結果${PLAIN ? '（比べる版）' : ''}</h3><div class="tot">${fmt(total)}</div>
<div class="picks">${picks.map(cell).join('')}</div>
<p class="ref">同じ8場面の目安：いつも小 +1200／いつも中 +400／いつも大 −300／読む人 +2400</p>
<button class="gob">もう1回</button>`;
  e.classList.add('on'); window.R2.phase = 'end';
  return new Promise(res => e.querySelector('.gob').addEventListener('click', () => { SFX.tap(); e.classList.remove('on'); res(); }));
}
async function playAll() {
  for (;;) {
    total = 0; LOG.total = 0; LOG.scenes = [];
    for (let i = 0; i < SCENES.length; i++) await playScene(i);
    await endScreen();
  }
}
async function boot() {
  main = new Stage(boardEl, { onDemo: async () => { LOG.demoOpened++; await runDemo(false); } });
  main.load(SCENES[0], 'guide');
  window.R2.stage = () => main;
  if (!PLAIN && (!lsGet(SEEN_KEY))) { LOG.autoDemo = true; await runDemo(true); }
  await playAll();
}

/* ---------- 数字の突き合わせ（ページの中で全場面・全選択を計算して表と比べる） ---------- */
window.R2.verify = function () {
  const EX = window.R2EXPECT, rows = [], bad = [];
  const eq = (a, b) => Math.abs(a - b) < 0.5;
  const all = SCENES.concat([Object.assign({}, DEMO, { id: 0 })]);
  for (const s of all) {
    const I = info(s), a = L.analyze(s), ex = EX[s.id];
    const row = { id: s.id, N: a.N, counts: a.counts.join('/'), ev: {}, real: {} };
    if (!ex) { bad.push('期待値なし ' + s.id); continue; }
    if (a.N !== ex.N) bad.push(`場面${s.id} 通り数 ${a.N}≠${ex.N}`);
    if (a.counts.join() !== ex.counts.join()) bad.push(`場面${s.id} 格の内訳 ${a.counts}≠${ex.counts}`);
    for (const o of OPTS) {
      row.ev[o] = Math.round(a.ev[o].ev);
      if (!eq(a.ev[o].ev, ex.ev[o])) bad.push(`場面${s.id} 平均 ${o} ${a.ev[o].ev}≠${ex.ev[o]}`);
      // 実際の流れ（ゲームが使う resolve）の結果を、受ける／降りる両方で
      const oc = outcome(s, o), needs = oc.kind === 'raise' || oc.kind === 'bet';
      const acc = resolve(s, o, needs ? true : null).delta, fld = needs ? resolve(s, o, false).delta : acc;
      row.real[o] = needs ? [acc, fld] : [acc, acc];
      if (!eq(acc, ex.real[o][0]) || !eq(fld, ex.real[o][1])) bad.push(`場面${s.id} 本当の結果 ${o} [${acc},${fld}]≠[${ex.real[o]}]`);
      const sp = SPEC[s.id] && SPEC[s.id][o];
      if (sp && (!eq(acc, sp[0]) || !eq(fld, sp[1]))) bad.push(`場面${s.id} 仕様の表 ${o} [${acc},${fld}]≠[${sp}]`);
    }
    // 彼女の本当の手の格・勝敗
    if (I.t !== ex.tier || I.res !== ex.res) bad.push(`場面${s.id} 格/勝敗 ${I.t}/${I.res}≠${ex.tier}/${ex.res}`);
    rows.push(row);
  }
  // 決め打ちの合計（続きは一番得な方）
  const sum = {};
  for (const s of SCENES) for (const o of OPTS) {
    const oc = outcome(s, o), needs = oc.kind === 'raise' || oc.kind === 'bet';
    const best = needs ? Math.max(resolve(s, o, true).delta, resolve(s, o, false).delta) : resolve(s, o, null).delta;
    sum[o] = (sum[o] || 0) + best;
  }
  const bestPick = ['small', 'mid', 'big', 'small', 'mid', 'small', 'check', 'big'];
  let reader = 0; SCENES.forEach((s, i) => { const o = bestPick[i], oc = outcome(s, o), needs = oc.kind === 'raise' || oc.kind === 'bet'; reader += needs ? Math.max(resolve(s, o, true).delta, resolve(s, o, false).delta) : resolve(s, o, null).delta; });
  const tot = { 'いつも見送る': sum.check, 'いつも小': sum.small, 'いつも中': sum.mid, 'いつも大': sum.big, '読む人': reader };
  // 仕様の合計と比べる（いつも見送るは見送りを選べない場面1〜3を含む：場面3の450が入って +750 になる）
  if (tot['読む人'] !== 2400) bad.push('読む人の合計 ' + tot['読む人'] + '≠2400');
  if (tot['いつも小'] !== 1200 + 0) bad.push('いつも小の合計 ' + tot['いつも小'] + '≠1200');
  if (tot['いつも中'] !== 400) bad.push('いつも中の合計 ' + tot['いつも中'] + '≠400');
  if (tot['いつも大'] !== -300) bad.push('いつも大の合計 ' + tot['いつも大'] + '≠-300');
  if (tot['いつも見送る'] !== 750) bad.push('いつも見送るの合計 ' + tot['いつも見送る'] + '≠750');
  return { ok: bad.length === 0, bad, totals: tot, rows };
};

boot().catch(e => { if (e !== CANCEL) { console.error(e); window.R2.error = String(e && e.stack || e); } });
})();
