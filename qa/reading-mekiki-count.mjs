// 目利きの計算の検算（2026-11-17）。node qa/reading-mekiki-count.mjs [手数=5000] [grano|selina|velvet=grano]
// 相手ごとの印：グラーノ＝役ができた全部の札／セリナ＝最後の1枚だけ／ヴェルベット＝グラーノと同じ小さな印＋大げさな演技の印（役の上がらない札に1つ。数えない）
// 本物の配り（52枚を切ってミミ2枚・相手2枚・場札5枚）を作り、次を数える：
//  1. 出せる割合（plan が作れる）と、出せない理由の内訳
//  2. 出せた手すべてで、見立て3つのうち本当の手が必ず1つだけ印と合う（別の実装の役判定で、同じ印になる手を全部数え直す）
//  3. 役判定そのもの（engine.evalCat）を、総当たりの別実装と7枚で突き合わせる
import fs from 'node:fs';
import vm from 'node:vm';
const N = +(process.argv[2] || 5000);
const CK = process.argv[3] || 'grano';
globalThis.window = globalThis;
for (const f of ['battles/reading/reading.js', 'battles/reading/games/mekiki.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const E = RD.mekikiEngine;
let seed = 20261117;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---- 別の実装の役判定（総当たり：5枚の組を全部試して最高の分類）
function cat5(c) {
  const rs = c.map(x => x.r).sort((a, b) => a - b), ss = new Set(c.map(x => x.s));
  const cnt = {}; rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
  const g = Object.values(cnt).sort((a, b) => b - a);
  const flush = ss.size === 1;
  const uniq = [...new Set(rs)];
  let straight = false;
  if (uniq.length === 5) { if (rs[4] - rs[0] === 4) straight = true; if (rs.join() === '0,1,2,3,12') straight = true; }
  if (straight && flush) return 8;
  if (g[0] === 4) return 7;
  if (g[0] === 3 && g[1] === 2) return 6;
  if (flush) return 5;
  if (straight) return 4;
  if (g[0] === 3) return 3;
  if (g[0] === 2 && g[1] === 2) return 2;
  if (g[0] === 2) return 1;
  return 0;
}
function bestCat(cards) {
  const n = cards.length;
  if (n < 5) { // 5枚未満：同じ数字の組だけで分類（ペア以上）
    const cnt = {}; cards.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1);
    const g = Object.values(cnt).sort((a, b) => b - a);
    if (g[0] === 4) return 7; if (g[0] === 3 && g[1] === 2) return 6; if (g[0] === 3) return 3; if (g[0] === 2 && g[1] === 2) return 2; if (g[0] === 2) return 1; return 0;
  }
  let best = 0;
  const idx = [];
  const rec = (s) => { if (idx.length === 5) { best = Math.max(best, cat5(idx.map(i => cards[i]))); return; } for (let i = s; i < n; i++) { idx.push(i); rec(i + 1); idx.pop(); } };
  rec(0);
  return best;
}
const pinsAll = (hole, board) => { let prev = bestCat(hole); const out = []; for (let k = 1; k <= board.length; k++) { const b = board.slice(0, k), h = bestCat(hole.concat(b)), bo = bestCat(b); if (h > prev && h > bo) out.push(k - 1); prev = Math.max(prev, h); } return out; };
// 相手ごとに見える印（別実装）：セリナは最後の1枚だけ
const pinsB = (hole, board) => { const a = pinsAll(hole, board); return CK === 'selina' ? a.slice(-1) : a; };

// ---- 3. 役判定の突き合わせ
let evalBad = 0;
for (let i = 0; i < 20000; i++) {
  const d = E.DECK.slice(); for (let j = d.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [d[j], d[k]] = [d[k], d[j]]; }
  const c = d.slice(0, 5 + Math.floor(rnd() * 3));
  const a = E.evalCat(c).cat, b = bestCat(c);
  if (a !== b) { evalBad++; if (evalBad <= 3) console.log('役判定の食い違い', c.map(x => x.t).join(' '), a, b); }
}
console.log('役判定の突き合わせ 20000組：食い違い', evalBad);

// ---- 1・2
const toT = (c) => ({ r: c.r + 2, s: c.s });   // engine の r(0〜12) → 卓の rank(2〜14)
const why = {}; const truthFam = {}; const pinCount = {}; const ansPos = [0, 0, 0];
const VCAP = process.env.FULL ? 1e9 : +(process.env.VCAP || 400);
let okBare = 0, bareAll = 0, fakeN = 0, decoyN = 0, fakeOverlap = 0, decoyBad = 0;
let ok = 0, wrongStructure = 0, checked = 0, badTruth = 0, badCount = 0, badOpts = 0, pinMismatch = 0;
for (let h = 0; h < N; h++) {
  const d = E.DECK.slice(); for (let j = d.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [d[j], d[k]] = [d[k], d[j]]; }
  const mine = d.slice(0, 2), her = d.slice(2, 4), board = d.slice(4, 9);
  const T = { board: board.map(toT), her: her.map(toT), mine: mine.map(toT) };
  if (bestCat(board.map(c => Object.assign({}, c))) === 0) bareAll++;
  const sc = RD.plan.mekiki(T, { charKey: CK, rng: rnd });
  if (!sc) {
    // 出せない理由
    const hb = her.map((c, i) => Object.assign({}, c)), bb = board.map(c => Object.assign({}, c));
    let r;
    if (hb[0].r === hb[1].r) r = '手の中のペア';
    else { const bo = bestCat(bb), fin = bestCat(hb.concat(bb)); r = (fin > bo || (fin === 0 && bo === 0)) ? '見立ての外れが2つ作れない' : '場札だけの役が相手の役以上'; }
    why[r] = (why[r] || 0) + 1; continue;
  }
  ok++;
  if (bestCat(board.map(c => Object.assign({}, c))) === 0) okBare++;
  if (CK === 'velvet') { fakeN++; if (sc.pins.includes(sc.fake)) fakeOverlap++; if (sc.decoy) decoyN++; }
  truthFam[sc.truthKey.replace(/[0-9TJQKA]+$|[shdc]$/, '')] = (truthFam[sc.truthKey.replace(/[0-9TJQKA]+$|[shdc]$/, '')] || 0) + 1;
  pinCount[sc.pins.length] = (pinCount[sc.pins.length] || 0) + 1;
  ansPos[sc.ans]++;
  if (checked >= VCAP) continue;   // 総当たりの検算は時間がかかるので VCAP 手まで（FULL=1 で全部）
  checked++;
  if (sc.opts.length !== 3 || new Set(sc.opts.map(o => o.key)).size !== 3) { badOpts++; continue; }
  // 本当の手の印を別実装で出し直す
  const bh = her.map(c => Object.assign({}, c)), bbd = board.map(c => Object.assign({}, c));
  const pb = pinsB(bh, bbd);
  if (pb.join() !== sc.pins.join()) pinMismatch++;
  const truth = E.finKey(her, board);
  if (sc.opts[sc.ans].key !== truth) badTruth++;
  // 同じ印になる手を、場札を除いた全部の2枚組で数える（別実装の印）
  const rest = E.DECK.filter(c => !board.some(b => b.t === c.t));
  const tally = {};
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
    const hh = [rest[i], rest[j]];
    if (pinsB(hh, board).join() !== pb.join()) continue;
    const k = E.finKey(hh, board); tally[k] = (tally[k] || 0) + 1;
  }
  const counts = sc.opts.map(o => tally[o.key] || 0);
  const okCount = counts.filter(c => c > 0).length === 1 && counts[sc.ans] > 0;
  if (CK === 'velvet' && sc.decoy) {
    // 演技の印に合う見立て：本当の印と食い違い、演技の印（本当の印＋演技の札）と合う手が1つ以上ある
    const want = pb.concat([sc.fake]).sort((a, b) => a - b).join(',');
    let c2 = 0;
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) { const hh = [rest[i], rest[j]]; if (pinsAll(hh, board).join(',') === want && E.finKey(hh, board) === sc.decoy) c2++; }
    if (!(c2 > 0) || tally[sc.decoy]) decoyBad++;
  }
  if (!okCount) { badCount++; if (badCount <= 3) console.log('見立ての食い違い', board.map(c => c.t).join(' '), her.map(c => c.t).join(' '), sc.opts.map(o => o.label), counts); }
}
console.log('---- 配り', N, '手（検算は出せた手のうち', checked, '手）');
const total = Object.values(why).reduce((a, b) => a + b, 0) + ok;
console.log('出せた', ok, '／', total, '＝', (ok / total * 100).toFixed(1) + '%');
for (const [k, v] of Object.entries(why)) console.log('  出せない：', k, v, (v / total * 100).toFixed(1) + '%');
console.log('場札に役が無い配りは', bareAll, '手（', (bareAll / N * 100).toFixed(1) + '%）。そのうち出せた', okBare, '手＝', (okBare / bareAll * 100).toFixed(1) + '%（全体の', (okBare / N * 100).toFixed(1) + '%）');
console.log('答えの種類（出せた手のうち）', JSON.stringify(truthFam));
console.log('印の数', JSON.stringify(pinCount), '／ 正解の位置（1・2・3番目）', JSON.stringify(ansPos));
console.log('相手', CK, '／演技の印を付けた手', fakeN, '／うち演技に合う見立てを1つ置けた手', decoyN, '／演技の印が本当の印と重なった手', fakeOverlap, '／演技に合う見立てが演技の印と合わない手', decoyBad);
console.log('検算：見立ての数やだぶり', badOpts, '／ 印の食い違い', pinMismatch, '／ 本当の手の取り違え', badTruth, '／ 「1つだけ印と合う」が崩れた手', badCount);
