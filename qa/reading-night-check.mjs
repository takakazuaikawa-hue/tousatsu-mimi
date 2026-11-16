// おねだり・見せ合いっこの台詞・理由・印が、本物の配りで計算と食い違わず、置き換え忘れ（undefined・{ }）や禁句が無いことを確かめる（ブラウザ不要）。node qa/reading-night-check.mjs [配り数=20000]
import fs from 'node:fs';
import vm from 'node:vm';
const N = +(process.argv[2] || 20000);
const win = { RD: { reg() {}, util: {} } };
for (const f of ['battles/reading/games/onedari.js', 'battles/reading/games/mise.js']) vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: win, Image: function () {}, console, Math, Set, Object, Array, String, Number, JSON, Promise });
const O = win.RD.onedariEngine, M = win.RD.miseEngine;
const BANNED = /寝|眠|ぐったり|つぶれ|潰れ|意識/;
let bad = 0; const fail = (m) => { bad++; if (bad < 30) console.log('NG', m); };
const chk = (t, where) => { if (/[{}]|undefined|NaN|null/.test(t)) fail('未置換 ' + where + ': ' + t); if (BANNED.test(t)) fail('禁句 ' + where + ': ' + t); };
const RB = { s: 's', h: 'h', d: 'd', c: 'c' };
const deck = O.FULL.map(c => ({ r: c.r + 2, s: c.s }));
const shuf = () => { const a = deck.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cnt = { one: {}, mise: { ok: 0, ans: {} } };
// おねだり（5人×全部の配り）
const KEYS = ['polka', 'rico', 'selina', 'grano', 'velvet'];
for (let n = 0; n < N; n++) {
  const d = shuf(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
  for (const key of KEYS) {
    const sc = O.plan({ board: b5.slice(0, 4), mine, her, toCall: 0, pot: 500 }, { charKey: key, fin: b5[4], pot: 500 });
    if (!sc) continue;
    sc.bet = 333; sc.pot = 500;
    const dd = O.derive(sc);
    const k = key + ':' + (dd.hit ? 'hit' : 'miss'); cnt.one[k] = (cnt.one[k] || 0) + 1;
    if (O.problems(dd).length) fail('おねだり 検算 ' + JSON.stringify(O.problems(dd)));
    if (dd.hit !== sc.hit || dd.answer !== sc.answer) fail('おねだり 宣言と計算');
    if (dd.hit && dd.answer !== 'fold') fail('本物なのに払うが正解');
    if (!dd.hit && dd.answer !== 'call') fail('はったりなのに降りるが正解');
    // 印が計算した待ちと合う
    const must = { suit: O.SJ[dd.outSuit], rank: dd.outRanks.map(O.RN)[0], color: dd.outSuit === 'h' || dd.outSuit === 'd' ? '赤' : '黒', count: String(dd.outs.length) }[sc.sign];
    const ask = O.WHO[key].ask(dd); if (!ask.includes(must)) fail('印が台詞に無い ' + ask);
    if (dd.sign.t === 'suit' || dd.sign.t === 'rank') { if (dd.signMatch !== dd.hit) fail('印と当たりが食い違う'); }
    chk(ask, 'ask'); const bl = O.WHO[key].bet(dd); chk(bl.t, 'bet');
    for (const pick of ['call', 'fold']) {
      const o = O.outcome(dd, pick); chk(o.reason, 'reason'); chk(o.delta, 'delta'); chk(o.mark, 'mark');
      for (const st of O.WHO[key][o.kind]) chk(typeof st.t === 'function' ? st.t(dd) : st.t, 'line ' + o.kind);
      if (!O.WHO[key][o.kind].length) fail('反応が無い ' + o.kind);
      if (!o.reason.includes(dd.finName)) fail('理由に最後の札が無い');
    }
    if (dd.lineup.length !== 5) fail('並びが5でない');
  }
}
// お手本
{ const dd = O.derive(O.DEMO); if (O.problems(dd).length) fail('お手本 おねだり ' + JSON.stringify(O.problems(dd))); }
// 見せ合いっこ：ポルカの見せる1枚が計算どおり・答えが1つ・台詞に未置換が無い
for (let n = 0; n < N * 6; n++) {
  const d = shuf(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
  const sc = M.plan({ board: b5, mine, her }, { charKey: 'polka', pot0: 600, bet: 300 });
  if (!sc) continue;
  cnt.mise.ok++; cnt.mise.ans[sc.ans] = (cnt.mise.ans[sc.ans] || 0) + 1;
  const dd = M.derive(sc);
  if (dd.ahead === 0) fail('同点'); if (dd.ans !== sc.ans) fail('答えの食い違い');
  for (const pick of [0, 1, 2]) { const o = M.outcome(dd, pick); chk(o.reason, 'mise reason'); chk(String(o.delta), 'mise delta'); o.steps.forEach(st => chk(st.t, 'mise step')); }
  // 正解の選びが、いちばん得（払わせる＞降ろす＞…）になっている
  const val = (p) => { const o = M.outcome(dd, p); return o.kind === 'paid' ? 3 : o.kind === 'drop' ? 2 : o.kind === 'fled' ? 1 : -1; };
  const best = [0, 1, 2].map(val); const mx = Math.max(...best);
  if (best[sc.ans] !== mx) fail('mise 正解が最善でない ' + JSON.stringify(best) + ' ans ' + sc.ans);
}
{ const dd = M.derive(M.DEMO); if (dd.ans !== M.DEMO.ans) fail('お手本 見せ合いっこ'); }
console.log('おねだり', JSON.stringify(cnt.one));
console.log('見せ合いっこ 出せる', cnt.mise.ok, '答え', JSON.stringify(cnt.mise.ans), '（0＝左 1＝右 2＝見せない）');
console.log(bad ? 'NG ' + bad + ' 件' : '全部OK');
process.exit(bad ? 1 : 0);
