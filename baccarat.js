// =============================================================
// baccarat.js — クリア後のおまけ「バカラ」の規則と罫線（画面なし・乱数は種から・本編の state に触らない）。
// 画面・絞り・女神・リコ先輩の解説は baccarat-ui.js。外に出す名前は window.Baccarat だけ。
// 規則：8デックのシュー、プント・バンコの3枚目の決まり、配当は プレイヤー 1倍／バンカー 1倍（5%の手数料）／
//       引き分け 8倍（プレイヤー・バンカーの賭けは戻る）／ペア 11倍。
// 罫線：珠盤路・大路・大眼仔・小路・甲由路と、次がどちらなら何の印が付くかの予告。
// 検査：node qa/baccarat-rules.mjs（決まりの表・罫線・配当・控除率）。
// =============================================================
(function (root) {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const CONFIG = {
    decks: 8,
    cutFromEnd: 16,        // 残りがこの枚数を切ったら、次の手の前に新しいシューにする
    commission: 0.05,      // バンカーで勝った時の手数料
    pay: { P: 1, B: 1, T: 8, PP: 11, BP: 11 },
    minBet: 10, maxMain: 500, maxSide: 100,
    chips: [10, 50, 100, 500],
  };

  // 種から決まる乱数（同じ種なら同じシュー：途中で閉じても続きから配れる）
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const valueOf = (c) => (c.rank >= 10 ? 0 : c.rank);       // rank 1..13（A=1、J=11、Q=12、K=13）
  const total = (cards) => cards.reduce((s, c) => s + valueOf(c), 0) % 10;

  function createShoe(seed) {
    seed = (seed >>> 0) || 1;
    const r = rng(seed);
    const cards = [];
    for (let d = 0; d < CONFIG.decks; d++) for (const s of SUITS) for (let k = 1; k <= 13; k++) cards.push({ suit: s, rank: k, label: LABELS[k - 1] });
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
    const shoe = { seed, cards, pos: 0, hands: 0, burn: null, burned: 0 };
    // 最初の1枚を開き、その数だけ捨てる（絵札・10 は10枚）
    const first = cards[shoe.pos++];
    const n = first.rank >= 10 ? 10 : first.rank;
    shoe.burn = first; shoe.burned = n; shoe.pos += n;
    return shoe;
  }
  // 保存した { seed, pos, hands } から同じシューを作り直す
  function restoreShoe(s) {
    const shoe = createShoe(s.seed);
    if (s.pos > shoe.pos && s.pos < shoe.cards.length) shoe.pos = s.pos;
    shoe.hands = s.hands || 0;
    return shoe;
  }
  const shoeLeft = (shoe) => shoe.cards.length - shoe.pos;
  const needNewShoe = (shoe) => shoeLeft(shoe) < CONFIG.cutFromEnd;

  // ---- 3枚目の決まり ----
  const playerDraws = (pt) => pt <= 5;
  // p3v＝プレイヤーの3枚目の数（引いていなければ null）
  function bankerDraws(bt, p3v) {
    if (p3v == null) return bt <= 5;
    if (bt <= 2) return true;
    if (bt === 3) return p3v !== 8;
    if (bt === 4) return p3v >= 2 && p3v <= 7;
    if (bt === 5) return p3v >= 4 && p3v <= 7;
    if (bt === 6) return p3v === 6 || p3v === 7;
    return false;
  }

  // 1手ぶんを配り切る（シューの並びで結果は決まっている。画面は順に開くだけ）
  function dealHand(shoe) {
    const draw = () => shoe.cards[shoe.pos++];
    const p = [draw()], b = [draw()];
    p.push(draw()); b.push(draw());
    const p2 = total(p), b2 = total(b);
    const natural = p2 >= 8 || b2 >= 8;
    if (!natural) {
      let p3v = null;
      if (playerDraws(p2)) { p.push(draw()); p3v = valueOf(p[2]); }
      if (bankerDraws(b2, p3v)) b.push(draw());
    }
    const pt = total(p), bt = total(b);
    shoe.hands++;
    return {
      p, b, pt, bt, natural,
      w: pt > bt ? 'P' : bt > pt ? 'B' : 'T',
      pp: p[0].rank === p[1].rank, bp: b[0].rank === b[1].rank,
    };
  }
  // 次の1手をのぞく（シューは進めない）。運命の女神だけが知っている「次の結果」
  const peekHand = (shoe) => dealHand({ cards: shoe.cards, pos: shoe.pos, hands: 0 });
  const resultOf = (h) =>({ w: h.w, pp: h.pp, bp: h.bp, nat: h.natural, pt: h.pt, bt: h.bt });

  // ---- 配当 ----
  // bets: { P, B, T, PP, BP }（賭けたコイン）。戻り値 back＝卓から戻るコイン（賭け金込み）、net＝差し引き
  function settle(bets, h) {
    const back = {}; let stake = 0, ret = 0, fee = 0;
    for (const k of ['P', 'B', 'T', 'PP', 'BP']) {
      const a = Math.max(0, Math.floor(bets[k] || 0));
      if (!a) continue;
      stake += a;
      let r = 0;
      if (k === 'P') r = h.w === 'P' ? a * 2 : h.w === 'T' ? a : 0;
      else if (k === 'B') {
        if (h.w === 'B') { const f = Math.ceil(a * CONFIG.commission); fee += f; r = a * 2 - f; }
        else if (h.w === 'T') r = a;
      }
      else if (k === 'T') r = h.w === 'T' ? a * (CONFIG.pay.T + 1) : 0;
      else if (k === 'PP') r = h.pp ? a * (CONFIG.pay.PP + 1) : 0;
      else if (k === 'BP') r = h.bp ? a * (CONFIG.pay.BP + 1) : 0;
      back[k] = r; ret += r;
    }
    return { back, stake, ret, net: ret - stake, fee };
  }

  // ---- 途中の見込み：今めくっている1枚が v だったら、勝負はもう決まるか ----
  // pv・bv：これまでに開いた数（まだの札は null）。slot＝'P0'|'P1'|'P2'|'B0'|'B1'|'B2'（今めくっている札）
  // 戻り値 'P'|'B'|'T'（決まる）／null（まだ続く：ほかの札が残っているか、次の1枚を引く）
  function outcomeIf(pv, bv, slot, v) {
    const P = pv.slice(), B = bv.slice();
    (slot[0] === 'P' ? P : B)[+slot[1]] = v;
    if (P.slice(0, 2).some(x => x == null) || B.slice(0, 2).some(x => x == null)) return null;
    const sum = (a) => a.filter(x => x != null).reduce((s, x) => s + x, 0) % 10;
    const p2 = (P[0] + P[1]) % 10, b2 = (B[0] + B[1]) % 10;
    const fin = () => { const pt = sum(P), bt = sum(B); return pt > bt ? 'P' : bt > pt ? 'B' : 'T'; };
    if (p2 >= 8 || b2 >= 8) return fin();
    let p3v = null;
    if (playerDraws(p2)) { if (P[2] == null) return null; p3v = P[2]; }
    if (bankerDraws(b2, p3v)) { if (B[2] == null) return null; }
    return fin();
  }

  // =============================================================
  // 罫線
  // =============================================================
  // 大路の「理屈の上の列」：同じ側の勝ちが続く間は同じ列。引き分けは直前の印に重ねる（列は増えない）
  function bigRoadCols(results) {
    const cols = []; let lead = 0;
    for (const r of results) {
      if (r.w === 'T') { if (cols.length) { const c = cols[cols.length - 1]; c.e[c.e.length - 1].t++; } else lead++; continue; }
      const e = { t: 0, pp: !!r.pp, bp: !!r.bp, nat: !!r.nat };
      const last = cols[cols.length - 1];
      if (last && last.w === r.w) last.e.push(e);
      else cols.push({ w: r.w, e: [e] });
    }
    if (lead && cols.length) cols[0].e[0].t += lead;
    return { cols, lead: cols.length ? 0 : lead };
  }
  // 下の3つの路（k＝1 大眼仔／2 小路／3 甲由路）：赤 'R'＝そろっている、青 'B'＝乱れている
  function derivedMarks(cols, k) {
    const marks = [];
    for (let c = 0; c < cols.length; c++) {
      for (let r = 0; r < cols[c].e.length; r++) {
        if (r === 0) { if (c >= k + 1) marks.push(cols[c - 1].e.length === cols[c - 1 - k].e.length ? 'R' : 'B'); }
        else if (c >= k) { const L = cols[c - k].e.length; marks.push(r === L ? 'B' : 'R'); }
      }
    }
    return marks;
  }
  // 印の並び（同じ色が続く間は同じ列）を列に分ける
  function runsOf(marks) {
    const cols = [];
    for (const m of marks) { const last = cols[cols.length - 1]; if (last && last.w === m) last.e.push({}); else cols.push({ w: m, e: [{}] }); }
    return cols;
  }
  // 盤に置く：上から下へ。下が埋まっているか6段目まで来たら右へ曲がる（ドラゴンテール）
  function layout(cols, rows) {
    rows = rows || 6;
    const occ = new Set(), out = []; let startX = -1;
    const K = (x, y) => x * 100 + y;
    for (let ci = 0; ci < cols.length; ci++) {
      let x = startX + 1; while (occ.has(K(x, 0))) x++;
      startX = x;
      let y = 0, turned = false;
      for (let i = 0; i < cols[ci].e.length; i++) {
        if (i > 0) { if (!turned && y + 1 < rows && !occ.has(K(x, y + 1))) y++; else { turned = true; x++; } }
        occ.add(K(x, y));
        out.push({ x, y, w: cols[ci].w, e: cols[ci].e[i], ci, i });
      }
    }
    return out;
  }
  // 珠盤路：結果を上から下へ6つずつ、そのまま並べる
  function beadPlate(results, rows) {
    rows = rows || 6;
    return results.map((r, i) => ({ x: Math.floor(i / rows), y: i % rows, w: r.w, pp: !!r.pp, bp: !!r.bp, nat: !!r.nat }));
  }
  // 画面に出す形へ一度にまとめる。ask＝次がそちらなら下の3つの路に付く印（付かない時は null）
  function roads(results) {
    const big = bigRoadCols(results);
    const d = [1, 2, 3].map(k => derivedMarks(big.cols, k));
    const ask = {};
    for (const w of ['P', 'B']) {
      const cols2 = bigRoadCols(results.concat([{ w }])).cols;
      ask[w] = [1, 2, 3].map((k, i) => { const m = derivedMarks(cols2, k); return m.length > d[i].length ? m[m.length - 1] : null; });
    }
    return {
      bead: beadPlate(results),
      big: layout(big.cols), bigCols: big.cols, lead: big.lead,
      eye: layout(runsOf(d[0])), small: layout(runsOf(d[1])), roach: layout(runsOf(d[2])),
      ask, stats: stats(results),
    };
  }
  function stats(results) {
    const s = { n: results.length, P: 0, B: 0, T: 0, PP: 0, BP: 0, nat: 0, streak: { w: null, n: 0 }, chop: 0 };
    let prev = null, run = 0, chop = 0;
    for (const r of results) {
      s[r.w]++; if (r.pp) s.PP++; if (r.bp) s.BP++; if (r.nat) s.nat++;
      if (r.w === 'T') continue;
      if (r.w === prev) { run++; chop = 0; } else { chop = prev ? chop + 1 : 0; run = 1; prev = r.w; }
    }
    s.streak = { w: prev, n: run };   // 引き分けを飛ばして、今つづいている側と回数
    s.chop = chop;                     // 交互（テレコ）がつづいている回数
    return s;
  }

  const API = {
    CONFIG, SUITS, LABELS, rng, valueOf, total,
    createShoe, restoreShoe, shoeLeft, needNewShoe,
    playerDraws, bankerDraws, dealHand, peekHand, resultOf, settle, outcomeIf,
    bigRoadCols, derivedMarks, runsOf, layout, beadPlate, roads, stats,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Baccarat = API;
})(typeof window !== 'undefined' ? window : globalThis);
