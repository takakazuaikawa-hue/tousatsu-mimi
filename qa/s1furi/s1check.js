// S1 押し出すふり（ポルカ・一周目）の検算  `node s1check.js`
// 役のくらべ方はふつうのポーカーどおり。
const RANKS = '23456789TJQKA';
const CAT = ['役なし', 'ワンペア', 'ツーペア', 'スリーカード', 'ストレート', 'フラッシュ', 'フルハウス', 'フォーカード', 'ストレートフラッシュ'];
const p = (s) => ({ r: RANKS.indexOf(s[0]) + 2, s: s[1], t: s });
const P = (str) => str.trim().split(/\s+/).map(p);

function eval5(cs) {
  const rs = cs.map((c) => c.r).sort((a, b) => b - a);
  const flush = cs.every((c) => c.s === cs[0].s);
  const uniq = [...new Set(rs)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (rs[0] - rs[4] === 4) straightHigh = rs[0];
    else if (rs[0] === 14 && rs[1] === 5 && rs[4] === 2) straightHigh = 5;
  }
  const cnt = {};
  rs.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map((g) => g[1]);
  let cat;
  if (straightHigh && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const tb = straightHigh ? [straightHigh] : kick;
  return { cat, key: [cat, ...tb] };
}
function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}
function best(cards) {
  let bestE = null, bestC = null;
  const n = cards.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
      const ev = eval5(five);
      if (!bestE || cmp(ev.key, bestE.key) > 0) { bestE = ev; bestC = five; }
    }
  return { ...bestE, five: bestC };
}
// 役を作っている札（キッカーを除く）
function madeCards(b) {
  if (b.cat === 0) return [];
  if (b.cat === 4 || b.cat === 5 || b.cat === 8) return b.five;
  const cnt = {};
  b.five.forEach((c) => (cnt[c.r] = (cnt[c.r] || 0) + 1));
  return b.five.filter((c) => cnt[c.r] >= 2);
}

const POT = 600, BET = 600;
const scenes = [
  { id: 'お手本', board: 'Ks 9d 6c 4h 2s', mimi: '9s 8s', polka: 'Qh Jh', face: 'あわてる', say: null, ans: '払う' },
  { id: '場面1', board: 'Ah Th 7c 4h 2d', mimi: 'Ac Td', polka: 'Kh 8h', face: 'にやける', say: 'フラッシュ', ans: '降りる' },
  { id: '場面2', board: 'Kd 9c 6s 3h 2c', mimi: '6d 6h', polka: 'Kc 9d', face: 'にやける', say: 'ツーペア', ans: '払う' },
  { id: '場面3', board: 'Qs Js 8s 5d 3c', mimi: '5h 4h', polka: 'Kd 9d', face: 'あわてる', say: null, ans: '払う' },
  { id: '場面4', board: '9h 8c 7d Ks 2h', mimi: 'Kh Kc', polka: 'Jd Ts', face: 'にやける', say: 'ストレート', ans: '降りる' },
  { id: '場面5', board: '6c 7c 8d Qc 2s', mimi: 'Ac 4c', polka: '9h Td', face: 'にやける', say: 'ストレート', ans: '払う' },
  { id: '場面6', board: 'Jh Js 8h 4h 3d', mimi: 'Ah 9h', polka: 'Jd 8s', face: 'にやける', say: 'フルハウス', ans: '降りる' },
];

let allOk = true;
const rows = [];
for (const sc of scenes) {
  const B = P(sc.board), M = P(sc.mimi), Q = P(sc.polka);
  const all = [...B, ...M, ...Q].map((c) => c.t);
  const dup = new Set(all).size !== all.length;
  const bm = best([...B, ...M]), bq = best([...B, ...Q]), bb = eval5(B);
  const c = cmp(bm.key, bq.key);
  const face = bq.cat === 0 ? 'あわてる' : 'にやける';
  const say = bq.cat === 0 ? null : CAT[bq.cat];
  const ans = c > 0 ? '払う' : '降りる';
  const glint = madeCards(bq).filter((x) => B.some((y) => y.t === x.t)).map((x) => x.t);
  const ok = !dup && c !== 0 && face === sc.face && say === sc.say && ans === sc.ans && bb.cat < bq.cat + (bq.cat === 0 ? 1 : 0) && bb.cat < bm.cat && bm.cat !== bq.cat;
  if (!ok) allOk = false;
  rows.push({ id: sc.id, mimi: CAT[bm.cat], polka: CAT[bq.cat], face, say, glint: glint.join(' '), ans, ok, mc: bm.cat, qc: bq.cat, win: c > 0 });
  console.log(`${sc.id}  場[${sc.board}]  ミミ[${sc.mimi}]=${CAT[bm.cat]}  ポルカ[${sc.polka}]=${CAT[bq.cat]}  場だけ=${CAT[bb.cat]}  顔=${face}  口=${say || '—'}  目が行く札=[${glint.join(' ')}]  正解=${ans}  ${ok ? 'OK' : '★NG'}`);
}
console.log('全場面', allOk ? 'OK' : '★NG あり');

// 決め打ち（場面1〜6）
const six = rows.slice(1);
const strategies = {
  '顔と役をくらべて決める人': (r) => (r.face === 'あわてる' ? '払う' : r.mc > r.qc ? '払う' : '降りる'),
  'いつも払う': () => '払う',
  'いつも降りる': () => '降りる',
  '顔だけ（あわてたら払う・にやけたら降りる）': (r) => (r.face === 'あわてる' ? '払う' : '降りる'),
  '顔の逆（にやけたら払う）': (r) => (r.face === 'あわてる' ? '降りる' : '払う'),
  '自分の役だけ（スリーカード以上なら払う）': (r) => (r.mc >= 3 ? '払う' : '降りる'),
  '自分の役だけ（フラッシュ以上なら払う）': (r) => (r.mc >= 5 ? '払う' : '降りる'),
  '自分の役だけ（ツーペア以上なら払う）': (r) => (r.mc >= 2 ? '払う' : '降りる'),
  '彼女の言った役だけ（ストレート以上なら降りる）': (r) => (r.qc >= 4 ? '降りる' : '払う'),
  '彼女の言った役だけ（フラッシュ以上なら降りる）': (r) => (r.qc >= 5 ? '降りる' : '払う'),
  '交互（払う始まり）': (r, i) => (i % 2 === 0 ? '払う' : '降りる'),
  '交互（降りる始まり）': (r, i) => (i % 2 === 0 ? '降りる' : '払う'),
};
console.log('\n決め打ち（場面1〜6）  当たり／チップ');
for (const [name, f] of Object.entries(strategies)) {
  let hit = 0, chips = 0;
  six.forEach((r, i) => {
    const a = f(r, i);
    if (a === r.ans) hit++;
    if (a === '払う') chips += r.win ? POT + BET : -BET;
  });
  console.log(`  ${name}: ${hit}／6   ${chips >= 0 ? '+' : ''}${chips}`);
}
console.log('  正解の並び:', six.map((r) => r.ans).join('・'));

// 本編の目安：最後の札まで行った手を配って、ポルカが「大きく賭ける」手の内訳（手の種類だけの目安。賭けの流れは見ていない）
// 目安の決め方：役なし＝はったり（36%で賭ける）／ツーペア以上＝本物で大きく賭ける（75%）／ワンペアは小さく賭けるので対象外
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const R = rng(20261116);
const deck = [];
for (const r of RANKS) for (const s of 'shdc') deck.push(p(r + s));
const N = 200000;
let w = { panic: 0, panicWin: 0, panicLose: 0, hi: 0, lo: 0, same: 0, sameWin: 0, boardOnly: 0 }, tot = 0;
for (let i = 0; i < N; i++) {
  const d = deck.slice();
  for (let k = 0; k < 9; k++) { const j = k + Math.floor(R() * (52 - k)); [d[k], d[j]] = [d[j], d[k]]; }
  const B = d.slice(0, 5), M = d.slice(5, 7), Q = d.slice(7, 9);
  const bq = best([...B, ...Q]), bb = eval5(B);
  let wt = 0;
  if (bq.cat === 0) wt = 0.36; else if (bq.cat >= 2) wt = 0.75; else continue;
  if (bq.cat > 0 && bq.cat === bb.cat) { w.boardOnly += wt; continue; } // 場札だけの役は「口がすべる」にしない
  const bm = best([...B, ...M]);
  const c = cmp(bm.key, bq.key);
  tot += wt;
  if (bq.cat === 0) { w.panic += wt; if (c > 0) w.panicWin += wt; else w.panicLose += wt; }
  else if (bm.cat > bq.cat) w.hi += wt;
  else if (bm.cat < bq.cat) w.lo += wt;
  else { w.same += wt; if (c > 0) w.sameWin += wt; }
}
const pc = (x) => (100 * x / tot).toFixed(1) + '%';
console.log('\n本編の目安（重み付き・20万回）');
console.log('  あわてる（はったり）:', pc(w.panic), ' うち払えばミミの勝ち:', (100 * w.panicWin / w.panic).toFixed(1) + '%');
console.log('  にやける・ミミの役が上:', pc(w.hi));
console.log('  にやける・ミミの役が下:', pc(w.lo));
console.log('  にやける・同じ種類の役:', pc(w.same), ' うちミミの勝ち:', (100 * w.sameWin / w.same).toFixed(1) + '%');
