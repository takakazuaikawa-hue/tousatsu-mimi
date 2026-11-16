// バカラの規則・配当・罫線を数で確かめる（画面なし）。node qa/baccarat-rules.mjs [手数=400000]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../baccarat.js');
const N = +(process.argv[2] || 400000);
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('NG  ' + m); } else console.log('ok  ' + m); };

// 1. 3枚目の決まり（バンカー）：表のとおりか
const TABLE = { 0: 'all', 1: 'all', 2: 'all', 3: [0, 1, 2, 3, 4, 5, 6, 7, 9], 4: [2, 3, 4, 5, 6, 7], 5: [4, 5, 6, 7], 6: [6, 7], 7: [] };
let t1 = true;
for (let bt = 0; bt <= 7; bt++) for (let v = 0; v <= 9; v++) {
  const want = TABLE[bt] === 'all' ? true : TABLE[bt].includes(v);
  if (B.bankerDraws(bt, v) !== want) t1 = false;
}
ok(t1, 'バンカーの3枚目の表（プレイヤーが引いた時）');
ok([0, 1, 2, 3, 4, 5].every(x => B.bankerDraws(x, null)) && !B.bankerDraws(6, null) && !B.bankerDraws(7, null), 'バンカーの3枚目（プレイヤーが引かない時は5以下で引く）');
ok([0, 1, 2, 3, 4, 5].every(B.playerDraws) && !B.playerDraws(6) && !B.playerDraws(7), 'プレイヤーは5以下で引く');

// 2. 配当
const h = (w, pp, bp) => ({ w, pp: !!pp, bp: !!bp });
ok(B.settle({ P: 100 }, h('P')).net === 100 && B.settle({ P: 100 }, h('B')).net === -100 && B.settle({ P: 100 }, h('T')).net === 0, 'プレイヤー 1倍・引き分けは戻る');
ok(B.settle({ B: 100 }, h('B')).net === 95 && B.settle({ B: 10 }, h('B')).net === 9 && B.settle({ B: 100 }, h('T')).net === 0, 'バンカー 手数料5%（端数は切り上げ）');
ok(B.settle({ T: 10 }, h('T')).net === 80 && B.settle({ T: 10 }, h('P')).net === -10, '引き分け 8倍');
ok(B.settle({ PP: 10, BP: 10 }, h('P', 1, 0)).net === 100, 'ペア 11倍');

// 3. 通しの試算：出る割合と控除率
let sh = B.createShoe(12345), seed = 12345;
const cnt = { P: 0, B: 0, T: 0, PP: 0, BP: 0, nat: 0, c4: 0, c5: 0, c6: 0 };
const net = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
let shoes = 1, handsInShoe = [];
for (let i = 0; i < N; i++) {
  if (B.needNewShoe(sh)) { handsInShoe.push(sh.hands); sh = B.createShoe(++seed); shoes++; }
  const x = B.dealHand(sh);
  cnt[x.w]++; if (x.pp) cnt.PP++; if (x.bp) cnt.BP++; if (x.natural) cnt.nat++;
  cnt['c' + (x.p.length + x.b.length)]++;
  for (const k of Object.keys(net)) net[k] += B.settle({ [k]: 100 }, x).net;
  if (x.pt !== B.total(x.p) || x.bt !== B.total(x.b)) bad++;
}
const pc = (n) => (n / N * 100).toFixed(2) + '%';
console.log(`\n${N} 手・${shoes} シュー（1シュー平均 ${(handsInShoe.reduce((a, b) => a + b, 0) / Math.max(1, handsInShoe.length)).toFixed(1)} 手）`);
console.log(`出る割合  バンカー ${pc(cnt.B)}（理論 45.86）　プレイヤー ${pc(cnt.P)}（44.62）　引き分け ${pc(cnt.T)}（9.52）　ペア P ${pc(cnt.PP)} B ${pc(cnt.BP)}（7.47）　ナチュラル ${pc(cnt.nat)}`);
console.log(`札の枚数  4枚 ${pc(cnt.c4)}　5枚 ${pc(cnt.c5)}　6枚 ${pc(cnt.c6)}`);
const he = (k) => (net[k] / (N * 100) * 100).toFixed(2) + '%';
console.log(`賭けの損得（100を賭け続けた平均） バンカー ${he('B')}（理論 -1.06）　プレイヤー ${he('P')}（-1.24）　引き分け ${he('T')}（-14.36）　ペア ${he('PP')}／${he('BP')}（-10.36）`);
const near = (v, t, e) => Math.abs(v - t) <= e;
ok(near(cnt.B / N, 0.4586, 0.004) && near(cnt.P / N, 0.4462, 0.004) && near(cnt.T / N, 0.0952, 0.003), '出る割合が理論に近い');
ok(near(net.B / N, -1.06, 0.6) && near(net.P / N, -1.24, 0.6), 'バンカー・プレイヤーの控除率が理論に近い');

// 4. 罫線：手で確かめた例
// 大路 B B B | P | B B | P P P | B  → 列の長さ 3,1,2,3,1
const seq = 'BBBPBBPPPB'.split('').map(w => ({ w }));
const big = B.bigRoadCols(seq).cols;
ok(big.map(c => c.e.length).join(',') === '3,1,2,3,1', '大路の列の長さ');
// 大眼仔（k=1）：2列目の2つ目から。P(c1r0):まだ／B(c2r0): 列1(1)と列0(3) 違う→B／B(c2r1): 列1 は長さ1、r=1===L→B／
//   P(c3r0): 列2(2)と列1(1) 違う→B／P(c3r1): 列2 長さ2、r=1<2→R／P(c3r2): r=2===L→B／B(c4r0): 列3(3)と列2(2) 違う→B
ok(B.derivedMarks(big, 1).join('') === 'BBBRBB', '大眼仔の印: ' + B.derivedMarks(big, 1).join(''));
// 小路（k=2）：c2r1: 列0 長さ3、r=1<3→R／c3r0: 列2(2)と列0(3)→B／c3r1: 列1 長さ1、r=1===L→B／c3r2: r=2>1→R／c4r0: 列3(3)と列1(1)→B
ok(B.derivedMarks(big, 2).join('') === 'RBBRB', '小路の印: ' + B.derivedMarks(big, 2).join(''));
// 引き分け：直前の印に重なり、列は増えない
const tie = B.bigRoadCols('PTTBT'.split('').map(w => ({ w }))).cols;
ok(tie.length === 2 && tie[0].e[0].t === 2 && tie[1].e[0].t === 1, '引き分けは直前の印に重ねる');
// ドラゴンテール：8連勝は6段で右へ曲がる。次の列は曲がった尾を避ける
const lay = B.layout(B.bigRoadCols('BBBBBBBBPPPPPPP'.split('').map(w => ({ w }))).cols);
const at = (i) => lay[i].x + ',' + lay[i].y;
ok(at(5) === '0,5' && at(6) === '1,5' && at(7) === '2,5', '6段目で右へ曲がる');
ok(at(8) === '1,0' && at(12) === '1,4' && at(13) === '2,4' && at(14) === '3,4', '次の列は尾の手前で曲がる: ' + [8, 12, 13, 14].map(at).join(' '));
// 予告：次がどちらなら何の印か
const rd = B.roads(seq);
ok(rd.ask.P.length === 3 && rd.ask.B.length === 3, '予告が3つの路ぶん出る: P ' + rd.ask.P.join('') + ' / B ' + rd.ask.B.join(''));
// 途中の見込み
ok(B.outcomeIf([4, null, null], [7, 2, null], 'P1', 5) === 'T' && B.outcomeIf([4, null, null], [7, 2, null], 'P1', 4) === 'B', 'ナチュラルが出れば決まる');
ok(B.outcomeIf([4, null, null], [3, 3, null], 'P1', 0) === null, '次の1枚を引くなら、まだ決まらない');
ok(B.outcomeIf([2, 3, null], [3, 4, null], 'P2', 4) === 'P' && B.outcomeIf([2, 3, null], [3, 4, null], 'P2', 1) === 'B', 'バンカーが引かない7なら、プレイヤーの3枚目で決まる');
ok(B.outcomeIf([2, 3, null], [3, 0, null], 'P2', 4) === null && B.outcomeIf([2, 3, null], [3, 0, null], 'P2', 8) === 'T', 'バンカー3：プレイヤーの3枚目が8の時だけ引かない');
// シューの続き：同じ種・同じ位置から同じ札
const s1 = B.createShoe(777); for (let i = 0; i < 9; i++) B.dealHand(s1);
const s2 = B.restoreShoe({ seed: 777, pos: s1.pos, hands: s1.hands });
ok(JSON.stringify(B.dealHand(s1)) === JSON.stringify(B.dealHand(s2)), '保存した位置から同じ札が出る');

console.log(bad ? `\n失敗 ${bad} 件` : '\nぜんぶ通りました');
process.exit(bad ? 1 : 0);
