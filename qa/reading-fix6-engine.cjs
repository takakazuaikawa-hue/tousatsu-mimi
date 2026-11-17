// Codex 批評（qa/out/codexread5）の再現を、直した後の計算で試す（ブラウザ無し）。node qa/reading-fix6-engine.cjs
// 1) おねだり：見える情報で答えが決まらない場（セリナ・ヴェルベット）が出ないこと  2) 見せ合いっこ：隠れ札で答えが変わる場が出ないこと
// 3) 目利き：ストレートで光る札が5枚  4) ふり：同じ種類の役でも、決まる場は採点  5) 計算の数え（乱数の配りで、出る割合・答えの内訳）
const { load } = require('./lib/rdnode.cjs');
const { RD, reg } = load('onedari', 'mise', 'furi', 'mekiki');
const RANKS = '23456789TJQKA';
const mk = (s) => ({ r: RANKS.indexOf(s[0]) + 2, s: s[1] });
const MS = (str) => str.trim().split(/\s+/).map(mk);
let bad = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) bad++; };
// 1) おねだり（logic-probe.json の4場面）
for (const [key, b, mine, fin, hers] of [['selina', 'Ks 9h 4h 2s', 'Kd Jc', '6h', ['Ah 7h', 'As 7s']], ['velvet', 'Ks 9c 4s 2c', 'Kd Jh', '6s', ['As 7s', 'Ac 7c']]]) {
  for (const her of hers) {
    const sc = reg.onedari.plan({ board: MS(b), mine: MS(mine), her: MS(her) }, { charKey: key, fin: mk(fin) });
    ok(sc === null, `おねだり ${key} 場札 ${b}／ミミ ${mine}／最後 ${fin}／伏せ札 ${her} → 出さない（${sc ? '出た' : '出ない'}）`);
  }
}
// 2) 見せ合いっこ（Codex の場面：Kのペア同士で、隠れ札だけ 3d／Jd）
for (const her of ['Kc 3d', 'Kc Jd']) {
  const sc = reg.mise.plan({ board: MS('Kd 9c 7s 5h 2c'), mine: MS('Kh Td'), her: MS(her) }, { charKey: 'polka', pot0: 600, bet: 400 });
  ok(sc === null, `見せ合いっこ 場札 Kd 9c 7s 5h 2c／ミミ Kh Td／ポルカ ${her} → 出さない（${sc ? '出た ans=' + sc.ans : '出ない'}）`);
}
// 3) 目利きの光る札：A♠ K♦ Q♣ J♥ 10♠ 9♦
{
  const E = RD.mekikiEngine, P = E.P;
  const cards = 'As Kd Qc Jh Ts 9d'.split(' ').map((t, i) => Object.assign(P(t), { id: 'c' + i }));
  const set = E.made(cards);
  ok(set.size === 5, `目利き ストレートで光る札 ${set.size} 枚（A♠K♦Q♣J♥10♠ の5枚）9♦ は光らない=${!set.has('c5')}`);
  const wheel = 'Ac 2d 3h 4s 5c 9d 9h'.split(' ').map((t, i) => Object.assign(P(t), { id: 'w' + i }));
  ok(E.made(wheel).size === 5, `目利き A-5 のストレート ${E.made(wheel).size} 枚`);
  const fh = '9c 9d 9h Kc Kd Ks 2d'.split(' ').map((t, i) => Object.assign(P(t), { id: 'f' + i }));
  ok(E.made(fh).size === 5, `目利き フルハウス（スリーカード2組）${E.made(fh).size} 枚`);
  const sf = '5h 6h 7h 8h 9h Th Jh'.split(' ').map((t, i) => Object.assign(P(t), { id: 's' + i }));
  ok(E.made(sf).size === 5, `目利き ストレートフラッシュ ${E.made(sf).size} 枚`);
  const fl = 'Ah Kh 9h 5h 3h 2h 2c'.split(' ').map((t, i) => Object.assign(P(t), { id: 'l' + i }));
  ok(E.made(fl).size === 5, `目利き フラッシュ（同じマーク6枚）${E.made(fl).size} 枚`);
}
// 4) ふり：セリナ・Kd 9c 6s 3h 2c／ポルカ Kc Qd／ミミ 9d 8h（光った K と ミミの 9 のペア）
{
  const T = { board: MS('Kd 9c 6s 3h 2c'), mine: MS('9d 8h'), her: MS('Kc Qd') };
  const sc = reg.furi.plan(T, { charKey: 'selina', intent: 'value', toCall: 400, pot: 1000 });
  ok(!!sc, 'ふり 場面が作れる');
  const t0 = Date.now(); const st = sc && RD.furiEngine.scoreable(Object.assign({}, sc, { char: 'selina' }));
  ok(st === true, `ふり セリナ・同じペア（Kのペア対9のペア）→ 採点する（${st}）${Date.now() - t0}ms`);
  // 決まらない形：ミミがペア、相手の合図が「ワンペア」だけ（ポルカ）で、ミミのペアが中くらい
  const T2 = { board: MS('Kd 9c 6s 3h 2c'), mine: MS('Kh 8h'), her: MS('Qc Qd') };
  const sc2 = reg.furi.plan(T2, { charKey: 'polka', intent: 'value', toCall: 400, pot: 1000 });
  const st2 = sc2 && RD.furiEngine.scoreable(Object.assign({}, sc2, { char: 'polka' }));
  console.log('    ふり ポルカ・ミミ Kのペア／ポルカ Qのペア(ポケット) → scoreable', st2);
}
// 5) 乱数の配りで数える：おねだりは「場札4枚で待ちだけ・ミミがペア以上」の形で、見える情報で決まる割合
{
  const O = RD.onedariEngine; const FULL = O.FULL; const rnd = (k) => { const a = FULL.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
  const cvt = (c) => ({ r: c.r + 2, s: c.s });
  const keys = ['polka', 'grano', 'rico', 'selina', 'velvet'];
  const cnt = {}; keys.forEach(k => cnt[k] = { n: 0, old: 0, ok: 0, hit: 0 });
  let tot = 0, shapes = 0; const t0 = Date.now();
  while (shapes < 160 && tot < 2e6) {
    tot++; const c = rnd(9), b4 = c.slice(0, 4), her = c.slice(4, 6), mi = c.slice(6, 8);
    if (O.score(b4.concat(her))[0] !== 0 || O.score(b4.concat(mi))[0] < 1 || !O.outsOf(b4, her).length) continue;
    shapes++;
    const rest = FULL.filter(x => ![...b4, ...her, ...mi].some(y => y.t === x.t));
    const fin = rest[Math.random() * rest.length | 0];
    const T = { board: b4.map(cvt), mine: mi.map(cvt), her: her.map(cvt) };
    for (const k of keys) {
      const sc = reg.onedari.plan(T, { charKey: k, fin: cvt(fin) });
      // 旧い判定（総当たり無し）：unambiguous を素通しにして数える
      cnt[k].n++; if (sc) { cnt[k].ok++; if (sc.hit) cnt[k].hit++; }
    }
  }
  console.log(`おねだり：待ちだけ・ミミペア以上の形 ${shapes} 通り（乱数のリバー）を ${Date.now() - t0}ms`);
  keys.forEach(k => console.log(`  ${k}: 出せた ${cnt[k].ok}／${cnt[k].n}（${(cnt[k].ok / cnt[k].n * 100).toFixed(0)}%）うち「来た」 ${cnt[k].hit}`));
}
console.log(bad ? 'NG ' + bad : '全部OK'); process.exit(bad ? 1 : 0);
