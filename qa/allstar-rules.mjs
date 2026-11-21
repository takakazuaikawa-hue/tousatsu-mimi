#!/usr/bin/env node
// 「零時の卓」の規則の穴を突く試験。札と行動を手で決め打ちした場面で、allstar.js が Poker TDA の
// 通常の大会規則どおりに進むかを確かめる。毎行動のあとに「全員の残り＋未精算の投入額＝合計」も検算する。
// 使い方: node qa/allstar-rules.mjs   （失敗があれば終了コード 1）
// 結果: qa/out/allstar-rules.json と日本語の一覧（標準出力）
import fs from 'node:fs';
import path from 'node:path';
import { loadGameFns, loadAllstar, REPO } from './allstar-sim.mjs';

const fns = loadGameFns();
const A = loadAllstar({ fns });
// game.js の rand（aiPickSize が使う）を種つきに
function seedRand(seed) {
  let s = seed >>> 0;
  fns.__setRand(() => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; });
}
seedRand(1);

// ---- 札 ----
const SUIT_OF = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_OF = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
const LABEL = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10' };
function card(code) {
  const r = RANK_OF[code[0]] || +code[0], s = SUIT_OF[code[1]];
  if (!r || !s) throw new Error('札の書き方: ' + code);
  return { suit: s, rank: r, label: LABEL[r] || String(r) };
}
const cards = (str) => str.trim().split(/\s+/).map(card);
const cstr = (cs) => cs.map(c => (LABEL[c.rank] || c.rank) + c.suit).join(' ');

// ---- 結果の記録 ----
const results = [];
let group = '';
function ok(name, cond, info = '') {
  results.push({ group, name, ok: !!cond, info: cond ? '' : (typeof info === 'string' ? info : JSON.stringify(info)) });
}
function section(name, fn) {
  group = name;
  try { fn(); } catch (e) { results.push({ group, name: '例外なく進む', ok: false, info: String(e && e.stack || e).slice(0, 600) }); }
}

// ---- 場面の組み立て ----
// stacks[i]=0 の席は脱落済み。pos={button,sb,bb[,deadSB,deadButton]}。holes[i]='As Kd'、board='2c 3d 4h 5s 6c'
// handNo を渡すとそのハンドのブラインドで始める
function deal(stacks, pos, { holes = null, board = null, handNo = 1, seed = 777, prevPos = null } = {}) {
  const t = A.createTournament({ seed });
  let place = 6;
  t.players.forEach((p, i) => { p.stack = stacks[i]; if (!stacks[i]) { p.place = place--; p.prize = 0; p.bustHand = 0; } });
  t.totalChips = stacks.reduce((a, b) => a + b, 0);
  t.handNo = handNo - 1;
  t.levelIndex = Math.floor((handNo - 1) / t.cfg.handsPerLevel);
  if (pos) { t._forcePos = pos; t.lastPos = { button: pos.button, sb: pos.sb, bb: pos.bb }; }
  if (prevPos) t.lastPos = prevPos;
  const ev = A.startHand(t);
  rig(t, holes, board);
  audit(t, 'ハンド開始');
  return { t, ev };
}
// 配った後の札を決め打ちにする（伏せ札と、まだ配っていない場札）
function rig(t, holes, board) {
  const h = t.hand;
  if (holes) holes.forEach((hc, s) => { if (hc && h.holes[s]) h.holes[s] = cards(hc); });
  if (board) {
    const b = cards(board);
    // 捨て札1枚＋フロップ3枚、捨て札＋ターン、捨て札＋リバー
    h.deck[h.dp + 1] = b[0]; h.deck[h.dp + 2] = b[1]; h.deck[h.dp + 3] = b[2]; h.deck[h.dp + 5] = b[3]; h.deck[h.dp + 7] = b[4];
  }
}
let auditFails = 0;
function audit(t, where) {
  const a = A.audit(t);
  if (!a.ok) { auditFails++; ok(`検算（${where}）`, false, a); }
  return a.ok;
}
// 行動。seat を渡すと手番の席も確かめる
function act(t, seat, kind, to) {
  const L = A.legalActions(t);
  if (seat != null && (!L || L.seat !== seat)) throw new Error(`手番が違う：期待 席${seat}、実際 ${L ? '席' + L.seat : 'なし'}`);
  const ev = A.applyAction(t, to != null ? { kind, to } : { kind });
  audit(t, `席${L.seat} ${kind}${to != null ? ' ' + to : ''}`);
  return ev;
}
// 残りを全員チェック（またはコール）で最後まで
function checkDown(t) {
  let ev = [];
  for (let g = 0; g < 60 && t.hand && !t.hand.done; g++) {
    const L = A.legalActions(t);
    ev = ev.concat(act(t, null, L.canCheck ? 'check' : 'call'));
  }
  return ev;
}
// 手番の人が全員降りる（BB はチェック）
function foldAround(t) {
  let ev = [];
  for (let g = 0; g < 60 && t.hand && !t.hand.done; g++) {
    const L = A.legalActions(t);
    ev = ev.concat(act(t, null, L.canCheck ? 'check' : 'fold'));
  }
  return ev;
}
const throws = (f) => { try { f(); return false; } catch (e) { return true; } };
const awards = (ev) => ev.filter(e => e.type === 'award');
const stacksOf = (t) => t.players.map(p => p.stack);
const sumAwards = (ev) => awards(ev).reduce((a, e) => a + e.amount, 0);
const sharesOf = (e) => Object.fromEntries(e.shares.map(s => [s.seat, s.amount]));

// =============================================================
// 1. 3人以上の異なる額のオールインと、正しいサイドポット（降りた人の投入も入る）
// =============================================================
section('サイドポット（4つの層）', () => {
  // ボタン0・SB1・BB2・UTG3。持ち点 1500/200/400/700/1000/1500
  const { t } = deal([1500, 200, 400, 700, 1000, 1500], { button: 0, sb: 1, bb: 2 }, {
    holes: ['7h 2d', 'As Ad', 'Ks Kd', 'Qs Qd', 'Js Jd', '9c 8c'], board: '2c 3d 8h 9s 4c' });
  act(t, 3, 'raise', 150);
  act(t, 4, 'call');
  act(t, 5, 'call');
  act(t, 0, 'call');
  const e1 = act(t, 1, 'allin');           // SB 200：50 の上乗せは短い
  ok('SB の 200 は短いオールイン', e1[0].shortAllIn && !e1[0].fullRaise && e1[0].to === 200, e1[0]);
  const L2 = A.legalActions(t);
  ok('まだ行動していない BB は上乗せでき、最小は 200＋100＝300', L2.seat === 2 && L2.canRaise && L2.minRaiseTo === 300, L2);
  const e2 = act(t, 2, 'allin');           // BB 400：200 からの 200 は全額
  ok('BB の 400 は全額レイズ（以後の最小幅 200）', e2[0].fullRaise && A.legalActions(t).minRaiseInc === 200, e2[0]);
  const L3 = A.legalActions(t);
  ok('UTG（150 で行動済み）は 250 の上乗せを受けたので再レイズ権あり', L3.seat === 3 && L3.canRaise && !L3.reraiseClosed && L3.minRaiseTo === 600, L3);
  act(t, 3, 'allin');                       // 700
  act(t, 4, 'allin');                       // 1000
  act(t, 5, 'fold');                        // 150 を置いて降りる
  const pots = A.computePots(t);
  // 席0はまだ 150 しか入れていないので、いちばん下の層は 150
  ok('席0がコールする前のポット：層ごと（途中の見え方）', JSON.stringify(pots) === JSON.stringify([
    { amount: 900, eligible: [0, 1, 2, 3, 4] }, { amount: 200, eligible: [1, 2, 3, 4] }, { amount: 600, eligible: [2, 3, 4] }, { amount: 600, eligible: [3, 4] }, { amount: 300, eligible: [4] }]), pots);
  const ev = act(t, 0, 'call');            // 1000 にそろえる（残り 500）
  const aw = awards(ev);
  ok('サイドから先に配る（3→2→1→0）', aw.map(a => a.pot).join() === '3,2,1,0', aw.map(a => a.pot));
  const by = Object.fromEntries(aw.map(a => [a.pot, a]));
  ok('メイン 1150（200×5＋降りた席5の 150）に席0〜4', by[0].amount === 1150 && by[0].eligible.join() === '0,1,2,3,4', by[0]);
  ok('サイド1 800（200×4）に席0・2・3・4', by[1].amount === 800 && by[1].eligible.join() === '0,2,3,4', by[1]);
  ok('サイド2 900（300×3）に席0・3・4', by[2].amount === 900 && by[2].eligible.join() === '0,3,4', by[2]);
  ok('サイド3 600（300×2）に席0・4', by[3].amount === 600 && by[3].eligible.join() === '0,4', by[3]);
  ok('勝者：メイン AA（席1）・サイド1 KK（席2）・サイド2 QQ（席3）・サイド3 JJ（席4）',
    by[0].winners.join() === '1' && by[1].winners.join() === '2' && by[2].winners.join() === '3' && by[3].winners.join() === '4', aw.map(a => a.winners));
  ok('配当の合計＝全員の投入 3450', sumAwards(ev) === 3450, sumAwards(ev));
  ok('誰もコールしなかった分は無い（席0と席4が 1000 で並ぶ）', !ev.some(e => e.type === 'return'));
  ok('配当後の持ち点', stacksOf(t).join() === '500,1150,800,900,600,1350', stacksOf(t));
  ok('降りた席5の伏せ札は公開されない', !ev.find(e => e.type === 'showdown').reveals.some(r => r.seat === 5));
  ok('オールインで賭けが終わったら、残りを配る前に全員表', ev.findIndex(e => e.type === 'reveal') < ev.findIndex(e => e.type === 'street'));
  ok('脱落なし', !ev.some(e => e.type === 'bust'));
});

section('サイドポット（3人の異なるオールイン＋余りの戻し）', () => {
  // 短い順に 300／600／900 のオールイン、2000 の人がコール、余りは無い。いちばん大きい人の分は戻る
  const { t } = deal([2000, 300, 600, 900, 0, 0], { button: 0, sb: 1, bb: 2 }, {
    holes: ['Ah Kh', 'Qc Qh', 'Jc Jh', 'Tc Th'], board: 'Ks 7d 2c 4s 9h' });
  act(t, 3, 'allin');     // 900
  act(t, 0, 'allin');     // 2000
  act(t, 1, 'call');      // 300 でオールイン
  const ev = act(t, 2, 'call');   // 600 でオールイン
  const ret = ev.find(e => e.type === 'return');
  ok('席0の 2000 のうち、次に多い 900 を超えた 1100 を戻す', ret && ret.seat === 0 && ret.amount === 1100, ret);
  ok('戻しはショーダウンの前', ev.findIndex(e => e.type === 'return') < ev.findIndex(e => e.type === 'showdown'));
  const aw = awards(ev);
  const by = Object.fromEntries(aw.map(a => [a.pot, a]));
  ok('メイン 1200・サイド1 900・サイド2 600', by[0].amount === 1200 && by[1].amount === 900 && by[2].amount === 600, aw.map(a => [a.pot, a.amount, a.eligible]));
  ok('ワンペア K（席0）が全部取る', aw.every(a => a.winners.join() === '0'), aw.map(a => a.winners));
  ok('3人が脱落、席0が優勝', t.finished && t.players[0].stack === 3800 && ev.filter(e => e.type === 'bust').length === 3, stacksOf(t));
  const busts = ev.filter(e => e.type === 'bust');
  ok('同時脱落の順位は開始時の持ち点順（900→2位、600→3位、300→4位）',
    busts.map(b => `${b.seat}:${b.place}`).join() === '1:4,2:3,3:2', busts.map(b => `${b.seat}:${b.place}`));
});

// =============================================================
// 2. 降りた人の投入がポットに残る
// =============================================================
section('降りた人の投入', () => {
  const { t } = deal([1500, 1500, 1500, 0, 0, 0], { button: 0, sb: 1, bb: 2 }, {
    holes: ['As Ks', '7h 2d', 'Qc Qd'], board: 'Ah 8d 3c 5s 9h' });
  act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'check');
  ok('フロップは SB から', t.hand.street === 'flop' && t.hand.toAct === 1, t.hand);
  act(t, 1, 'check'); act(t, 2, 'raise', 100); act(t, 0, 'raise', 300);
  act(t, 1, 'fold');
  act(t, 2, 'call');
  ok('降りた SB の 50 はポットに残る（150＋600＝750）', A.computePots(t)[0].amount === 750 && A.computePots(t)[0].eligible.join() === '0,2', A.computePots(t));
  const ev = checkDown(t);
  const aw = awards(ev);
  ok('ショーダウンで AK が 750 を取る', aw.length === 1 && aw[0].amount === 750 && aw[0].winners.join() === '0', aw);
  ok('持ち点 1900／1450／1150', stacksOf(t).slice(0, 3).join() === '1900,1450,1150', stacksOf(t));
});

section('降りた人の投入がサイドポットの層を超える', () => {
  // 席3がレイズ 400、席0が短いオールイン 250、席1（SB）がコール 400 してからターンで降りる
  const { t } = deal([250, 2000, 2000, 2000, 0, 0], { button: 0, sb: 1, bb: 2 }, {
    holes: ['As Ad', 'Kc Qc', '7h 2d', 'Jh Td'], board: '3c 8d 9h 2s 4h' });
  act(t, 3, 'raise', 400);
  act(t, 0, 'allin');                  // 250：コールの額に届かない
  act(t, 1, 'call');
  act(t, 2, 'fold');                   // BB の 50 は死に金
  // フロップ：SB と UTG
  act(t, 1, 'check'); act(t, 3, 'raise', 300); act(t, 1, 'call');
  // ターン：UTG が賭け、SB が降りる
  act(t, 1, 'check'); act(t, 3, 'raise', 500);
  const ev = act(t, 1, 'fold');
  const ret = ev.find(e => e.type === 'return');
  ok('ターンの 500 は誰もコールしないので戻す', ret && ret.seat === 3 && ret.amount === 500, ret);
  const aw = awards(ev);
  const by = Object.fromEntries(aw.map(a => [a.pot, a]));
  ok('メイン 250×3＋BB の 50＝800 は席0と席3で、サイド 150×2＋600＝900 は席3だけ',
    by[0] && by[0].amount === 800 && by[0].eligible.join() === '0,3' && by[1] && by[1].amount === 900 && by[1].eligible.join() === '3', aw.map(a => [a.pot, a.amount, a.eligible, a.winners]));
  ok('サイドは争いなしで席3、メインはショーダウンで AA（席0）', by[1].winners.join() === '3' && by[1].uncontested && by[0].winners.join() === '0', aw);
  ok('持ち点（席3は 2000−700＋900）', stacksOf(t).slice(0, 4).join() === '800,1300,1950,2200', stacksOf(t));
});

// =============================================================
// 3. 誰もコールしなかった分の戻し
// =============================================================
section('誰もコールしなかった分の戻し', () => {
  {
    const { t } = deal([1500, 1500, 1500, 1500, 0, 0], { button: 0, sb: 1, bb: 2 });
    const ev = foldAround(t);
    const ret = ev.find(e => e.type === 'return');
    ok('全員降りて BB へ：SB の 25 を超えた 25 を BB に戻す', ret && ret.seat === 2 && ret.amount === 25, ret);
    const aw = awards(ev)[0];
    ok('BB は争いなしで 50 を取る（差し引き +25）', aw.uncontested && aw.amount === 50 && t.players[2].stack === 1525 && t.players[1].stack === 1475, [aw, stacksOf(t)]);
  }
  {
    const { t } = deal([1500, 1500, 1500, 0, 0, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'check');
    act(t, 1, 'raise', 75); act(t, 2, 'fold');
    const ev = act(t, 0, 'fold');
    const ret = ev.find(e => e.type === 'return');
    ok('フロップの 75 の賭けに誰もコールしない：75 を全部戻す', ret && ret.seat === 1 && ret.amount === 75, ret);
    ok('ポット 150 を SB が取る', awards(ev)[0].amount === 150 && t.players[1].stack === 1600, [awards(ev), stacksOf(t)]);
  }
  {
    // 大きいオールインに短いオールインのコール：余りを戻す
    const { t } = deal([1500, 1500, 1500, 400, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '8h 3d', 'Ks Kd'], board: '4c 9d Th Js 2c' });
    act(t, 3, 'allin'); act(t, 0, 'allin'); act(t, 1, 'fold');
    const ev = act(t, 2, 'fold');
    const ret = ev.find(e => e.type === 'return');
    ok('1500 のオールインに 400 のコールだけ：1100 を戻す', ret && ret.seat === 0 && ret.amount === 1100, ret);
    ok('メイン 400＋400＋25＋50＝875 を AA が取り、席3が脱落', awards(ev).length === 1 && awards(ev)[0].amount === 875 && t.players[0].stack === 1975 && t.players[3].place === 4, [awards(ev), stacksOf(t)]);
  }
});

// =============================================================
// 4. 引き分け（山分け）と端数
// =============================================================
section('山分けと端数', () => {
  {
    // 4人、場にロイヤルフラッシュ。SB は降りる。175 を3人で：ボタンの左から近い順に 25 ずつ
    const { t } = deal([1000, 1000, 1000, 1000, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['2c 3d', '4c 5d', '6c 7d', '2h 3h'], board: 'As Ks Qs Js Ts' });
    act(t, 3, 'call'); act(t, 0, 'call'); act(t, 1, 'fold'); act(t, 2, 'check');
    const ev = checkDown(t);
    const aw = awards(ev)[0];
    const sh = sharesOf(aw);
    ok('3人の山分け：席2 75・席3 50・ボタン 50（端数はボタンの左に近い席2）', aw.amount === 175 && aw.winners.length === 3 && sh[2] === 75 && sh[3] === 50 && sh[0] === 50, aw);
    ok('配った額の合計＝ポット', aw.shares.reduce((a, s) => a + s.amount, 0) === 175);
  }
  {
    // ボタンの左を回り込む：ボタン3。勝者は席1と席4 → ボタンの左（席4）が近い
    const { t } = deal([1000, 1000, 1000, 1000, 1000, 0], { button: 3, sb: 4, bb: 0 }, {
      holes: ['8c 8d', 'Ah 2c', '9c 9d', '3c 4d', 'Ad 2h'], board: 'Ac Kd Qh Js 5c' });
    act(t, 1, 'call'); act(t, 2, 'fold'); act(t, 3, 'fold'); act(t, 4, 'call'); act(t, 0, 'fold');
    const ev = checkDown(t);
    const aw = awards(ev)[0];
    const sh = sharesOf(aw);
    ok('ポット 150 を2人で：25 単位で 3 つ → ボタンの左の席4が 75、席1が 75（割り切れる）', aw.amount === 150 && sh[4] === 75 && sh[1] === 75, aw);
  }
  {
    const { t } = deal([1000, 1000, 1000, 1000, 1000, 0], { button: 3, sb: 4, bb: 0 }, {
      holes: ['8c 8d', 'Ah 2c', '9c 9d', '3c 4d', 'Ad 2h'], board: 'Ac Kd Qh Js 5c' });
    act(t, 1, 'call'); act(t, 2, 'call'); act(t, 3, 'fold'); act(t, 4, 'call'); act(t, 0, 'fold');
    // 4つ目の参加者（席2）は降りずに負ける：ポット 50×4＝200 ではなく、BB 50＋50×3＝200
    act(t, 4, 'check'); act(t, 1, 'check'); act(t, 2, 'raise', 25 * 3);   // 75
    act(t, 4, 'call'); act(t, 1, 'call');
    const ev = checkDown(t);
    const aw = awards(ev)[0];
    const sh = sharesOf(aw);
    // 200＋75×3＝425 → 25 単位で 17 → 9 と 8：ボタンの左の席4が 225、席1が 200
    ok('ポット 425 を2人で：端数 25 はボタンの左の席4へ（225／200）', aw.amount === 425 && sh[4] === 225 && sh[1] === 200, aw);
  }
  {
    // 25 で割り切れない額（短いブラインドのオールイン）の山分け
    const { t } = deal([1000, 1000, 30, 0, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['2c 3d', '4c 5d', '6h 7h'], board: 'As Ks Qs Js Ts' });
    act(t, 0, 'call'); act(t, 1, 'call');
    const ev = checkDown(t);
    const aw = awards(ev);
    const main = aw.find(a => a.pot === 0), side = aw.find(a => a.pot === 1);
    ok('メイン 90 を3人で 30 ずつ、サイド 40 を2人で 20 ずつ', main && main.amount === 90 && main.shares.every(s => s.amount === 30) && side && side.amount === 40 && side.shares.every(s => s.amount === 20), aw);
  }
  {
    // メインは3人の山分けで割り切れない（端数 1 単位はボタンの左から）
    const { t } = deal([1000, 1000, 1000, 1000, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['2c 3d', '4c 5d', '6c 7d', '8h 9h'], board: 'As Ks Qs Js Ts' });
    act(t, 3, 'raise', 100); act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'call');
    act(t, 1, 'raise', 50); act(t, 2, 'fold'); act(t, 3, 'call'); act(t, 0, 'call');
    const ev = checkDown(t);
    const aw = awards(ev)[0];
    const sh = sharesOf(aw);
    // 100×4＋50×3＝550 → 22 単位を3人で 8・7・7：ボタンの左から 席1 200・席3 175・席0 175
    ok('ポット 550 を3人で：席1 200・席3 175・席0 175', aw.amount === 550 && sh[1] === 200 && sh[3] === 175 && sh[0] === 175, aw);
  }
});

// =============================================================
// 5. 2つのポットで勝者が違う
// =============================================================
section('2つのポットで勝者が違う', () => {
  {
    // 短いオールインの席3が一番強い（メインを取る）。サイドは席0と席1で、席1が取る
    const { t } = deal([1500, 1500, 1500, 300, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['Qs Qd', 'Ks Kd', '7h 2d', 'As Ad'], board: '3c 8d 9h 4s 5h' });
    act(t, 3, 'allin'); act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'fold');
    act(t, 1, 'raise', 400); act(t, 0, 'call');
    const ev = checkDown(t);
    const aw = awards(ev);
    const by = Object.fromEntries(aw.map(a => [a.pot, a]));
    ok('メイン 300×3＋50＝950 を AA（席3）', by[0].amount === 950 && by[0].winners.join() === '3', by[0]);
    ok('サイド 400×2＝800 を KK（席1）', by[1].amount === 800 && by[1].winners.join() === '1' && by[1].eligible.join() === '0,1', by[1]);
    ok('持ち点', stacksOf(t).slice(0, 4).join() === '800,1600,1450,950', stacksOf(t));
  }
  {
    // メインは短い人、サイドは2人の山分け
    const { t } = deal([1500, 1500, 1500, 300, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As 4c', 'Ah 5c', '7h 2d', 'Kh 3c'], board: 'Ks Kd 7c 7d 2h' });
    act(t, 3, 'allin'); act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'fold');
    const ev = checkDown(t);
    const by = Object.fromEntries(awards(ev).map(a => [a.pot, a]));
    ok('メイン 950 はフルハウスの席3', by[0].amount === 950 && by[0].winners.join() === '3', by[0]);
    ok('サイドは無い（席0と席1は 300 のまま）', !by[1], awards(ev));
  }
  {
    const { t } = deal([1500, 1500, 1500, 300, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As 4c', 'Ah 5c', '7h 2d', 'Kh 3c'], board: 'Ks Kd 7c 7d 2h' });
    act(t, 3, 'allin'); act(t, 0, 'call'); act(t, 1, 'call'); act(t, 2, 'fold');
    act(t, 1, 'raise', 200); act(t, 0, 'call');
    const ev = checkDown(t);
    const by = Object.fromEntries(awards(ev).map(a => [a.pot, a]));
    ok('メイン 950 はフルハウスの席3、サイド 400 は KK77A の2人で 200 ずつ',
      by[0].winners.join() === '3' && by[1] && by[1].amount === 400 && by[1].winners.length === 2 && by[1].shares.every(s => s.amount === 200), awards(ev));
  }
});

// =============================================================
// 6. 短いオールインの後の再レイズ権
// =============================================================
section('短いオールインの後の再レイズ権', () => {
  {
    // プリフロップ：UTG 200（幅 150）→ ボタン 300 オールイン（幅 100 は短い）
    const { t } = deal([300, 1500, 1500, 1500, 0, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 3, 'raise', 200);
    const e = act(t, 0, 'allin');
    ok('ボタンの 300 は短いオールイン', e[0].shortAllIn && !e[0].fullRaise, e[0]);
    act(t, 1, 'fold');
    const L = A.legalActions(t);
    ok('まだ行動していない BB：上乗せでき、最小は 300＋150＝450', L.seat === 2 && L.canRaise && L.minRaiseTo === 450, L);
    act(t, 2, 'call');
    const L2 = A.legalActions(t);
    ok('UTG（行動済み）は上乗せできない：コール 100 か降りる', L2.seat === 3 && !L2.canRaise && L2.reraiseClosed && L2.toCall === 100, L2);
    ok('UTG のレイズ・オールインは拒まれる', throws(() => A.applyAction(t, { kind: 'raise', to: 600 })) && throws(() => A.applyAction(t, { kind: 'allin' })));
    ok('拒まれても持ち点は変わらない', A.audit(t).ok && t.players[3].stack === 1300);
    act(t, 3, 'call');
    ok('そろってフロップへ', t.hand.street === 'flop', t.hand.street);
  }
  {
    // BB の後に行動する人がいる場合：BB がレイズ（全額）すれば UTG にも開く
    const { t } = deal([300, 1500, 1500, 1500, 0, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 3, 'raise', 200); act(t, 0, 'allin'); act(t, 1, 'fold'); act(t, 2, 'raise', 450);
    const L = A.legalActions(t);
    ok('BB の全額レイズの後は UTG も上乗せできる（最小 450＋150＝600）', L.seat === 3 && L.canRaise && L.minRaiseTo === 600, L);
  }
  {
    // フロップ：A が 100 を賭け、B が 150 でオールイン（短い）、C がコール → A はコールか降りるだけ
    const { t } = deal([1500, 1500, 250, 1500, 0, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 3, 'call'); act(t, 0, 'call'); act(t, 1, 'fold'); act(t, 2, 'check');
    ok('フロップは BB から（SB は降りた）', t.hand.street === 'flop' && t.hand.toAct === 2, t.hand.toAct);
    act(t, 2, 'check'); act(t, 3, 'raise', 100);
    const L0 = A.legalActions(t);
    ok('次の最小レイズは 200', L0.seat === 0 && L0.minRaiseTo === 200, L0);
    act(t, 0, 'call');
    const e = act(t, 2, 'allin');
    ok('BB の 200 オールイン（幅 100）は全額', e[0].to === 200 && e[0].fullRaise, e[0]);
    const L = A.legalActions(t);
    ok('全額のオールインの後は A に再レイズ権（最小 300）', L.seat === 3 && L.canRaise && L.minRaiseTo === 300, L);
    act(t, 3, 'fold');
    const Lc = A.legalActions(t);
    ok('相手が全員オールインなら、上乗せはできない（コールか降りる）', Lc.seat === 0 && !Lc.canRaise && !Lc.reraiseClosed && Lc.toCall === 100, Lc);
  }
  {
    const { t } = deal([1500, 1500, 200, 1500, 0, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 3, 'call'); act(t, 0, 'call'); act(t, 1, 'fold'); act(t, 2, 'check');
    act(t, 2, 'check'); act(t, 3, 'raise', 100); act(t, 0, 'call');
    const e = act(t, 2, 'allin');   // 150：幅 50 は短い
    ok('BB の 150 オールインは短い', e[0].to === 150 && e[0].shortAllIn, e[0]);
    const L = A.legalActions(t);
    ok('賭けた人（行動済み）は上乗せできない：コール 50 か降りる', L.seat === 3 && !L.canRaise && L.reraiseClosed && L.toCall === 50, L);
    act(t, 3, 'call');
    const L2 = A.legalActions(t);
    ok('コールした人（行動済み）も上乗せできない', L2.seat === 0 && !L2.canRaise && L2.reraiseClosed && L2.toCall === 50, L2);
    act(t, 0, 'call');
    ok('そろってターンへ', t.hand.street === 'turn', t.hand.street);
  }
  {
    // 短いオールインが2つ重なって合計が全額分（100 以上）になれば開く
    const { t } = deal([1500, 1500, 180, 230, 1500, 0], { button: 0, sb: 1, bb: 2 });
    act(t, 3, 'call'); act(t, 4, 'call'); act(t, 0, 'call'); act(t, 1, 'fold'); act(t, 2, 'check');
    act(t, 2, 'check'); act(t, 3, 'check'); act(t, 4, 'raise', 100); act(t, 0, 'call');
    act(t, 2, 'allin');    // 130（幅 30）
    act(t, 3, 'allin');    // 180（幅 50）。100 からの合計は 80 でまだ短い
    const L = A.legalActions(t);
    ok('合計 80 の上乗せではまだ開かない', L.seat === 4 && !L.canRaise && L.toCall === 80, L);
    const { t: t2 } = deal([1500, 1500, 180, 260, 1500, 0], { button: 0, sb: 1, bb: 2 });
    act(t2, 3, 'call'); act(t2, 4, 'call'); act(t2, 0, 'call'); act(t2, 1, 'fold'); act(t2, 2, 'check');
    act(t2, 2, 'check'); act(t2, 3, 'check'); act(t2, 4, 'raise', 100); act(t2, 0, 'call');
    act(t2, 2, 'allin');   // 130
    act(t2, 3, 'allin');   // 210：100 からの合計 110 は全額分
    const L2 = A.legalActions(t2);
    ok('合計 110 で開く：最小は 210＋100＝310', L2.seat === 4 && L2.canRaise && L2.minRaiseTo === 310, L2);
  }
  {
    // 最小レイズ＝直前のレイズ幅（最低 BB）
    const { t } = deal([1500, 1500, 1500, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 });
    ok('最初の最小レイズは 100（BB の倍）', A.legalActions(t).minRaiseTo === 100);
    ok('BB 未満の上乗せ（to 80）は拒まれる', throws(() => A.applyAction(t, { kind: 'raise', to: 80 })));
    act(t, 3, 'raise', 150);
    ok('幅 100 の後は最小 250', A.legalActions(t).minRaiseTo === 250);
    act(t, 4, 'raise', 400);
    ok('幅 250 の後は最小 650', A.legalActions(t).minRaiseTo === 650);
    ok('to 600 は拒まれる', throws(() => A.applyAction(t, { kind: 'raise', to: 600 })));
    act(t, 5, 'raise', 650);
    ok('幅 250 のまま：最小 900', A.legalActions(t).minRaiseTo === 900);
  }
});

// =============================================================
// 7. ヘッズアップ：ボタン＝SB、プリフロップはボタンから、フロップ以降は BB から
// =============================================================
section('ヘッズアップ', () => {
  {
    // 3人から1人脱落して2人に（実際のハンドの流れで）
    const { t } = deal([1500, 1500, 50, 0, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '8h 3c'], board: 'Kc 9d 4h 5s Js' });
    act(t, 0, 'call');
    const ev = act(t, 1, 'fold');   // BB はオールインなので、ここで最後まで配られる
    ok('BB（席2）が脱落して3位', t.players[2].place === 3 && ev.some(e => e.type === 'heads-up'), ev.filter(e => e.type === 'bust' || e.type === 'heads-up'));
    const ev2 = A.startHand(t);
    const hs = ev2.find(e => e.type === 'hand-start');
    // 前の BB は席2（脱落）。BB は前の BB の次の席0、もう1人の席1がボタン＝SB
    ok('次のハンドは ヘッズアップ：ボタン＝SB＝席1、BB＝席0', hs.headsUp && hs.button === 1 && hs.sbSeat === 1 && hs.bbSeat === 0, hs);
    const pb = ev2.filter(e => e.type === 'post-blind');
    ok('ボタンが SB 25、相手が BB 50 を払う', pb.length === 2 && pb[0].seat === 1 && pb[0].blind === 'sb' && pb[0].amount === 25 && pb[1].seat === 0 && pb[1].amount === 50, pb);
    ok('配る順は BB から', ev2.find(e => e.type === 'deal').order.join() === '0,1');
    ok('プリフロップはボタン（SB）から', t.hand.toAct === 1, t.hand.toAct);
    ok('位置の表示は SB／BB', JSON.stringify(A.positionLabels(t)) === JSON.stringify({ 0: 'BB', 1: 'SB' }), A.positionLabels(t));
    act(t, 1, 'call');
    const L = A.legalActions(t);
    ok('SB がそろえた後、BB にチェックか上乗せの権利', L.seat === 0 && L.canCheck && L.canRaise, L);
    act(t, 0, 'check');
    ok('フロップ以降は BB から', t.hand.street === 'flop' && t.hand.toAct === 0, t.hand.toAct);
    act(t, 0, 'check'); act(t, 1, 'check');
    ok('ターンも BB から', t.hand.street === 'turn' && t.hand.toAct === 0);
    foldAround(t);
    A.startHand(t);
    ok('次のハンドはボタンが入れ替わる（ボタン＝SB＝席0、BB＝席1）', t.hand.button === 0 && t.hand.sbSeat === 0 && t.hand.bbSeat === 1 && t.hand.toAct === 0, t.hand);
  }
  {
    // ヘッズアップで SB が SB の額を払えない（20）
    const { t, ev } = deal([1500, 20, 0, 0, 0, 0], { button: 1, sb: 1, bb: 0 }, {
      holes: ['As Ad', '7h 2d'], board: 'Kc 9d 4h 5s Js' });
    const pb = ev.filter(e => e.type === 'post-blind');
    ok('SB は 20 でオールイン', pb[0].seat === 1 && pb[0].amount === 20 && pb[0].allIn, pb);
    ok('BB は行動しない（相手がもうオールイン）でハンドは最後まで', t.hand.done, t.hand);
    const ret = ev.find(e => e.type === 'return');
    ok('BB の 50 のうち 30 を戻す', ret && ret.seat === 0 && ret.amount === 30, ret);
    ok('AA が 40 を取って優勝', t.finished && t.players[0].stack === 1520 && t.players[1].place === 2, stacksOf(t));
  }
  {
    // ヘッズアップで BB が 30 しか無い：SB はあと 5 をそろえるか降りるだけ
    const { t } = deal([1500, 30, 0, 0, 0, 0], { button: 0, sb: 0, bb: 1 }, {
      holes: ['7h 2d', 'As Ad'], board: 'Kc 9d 4h 5s Js' });
    const L = A.legalActions(t);
    ok('SB のコール額は 5、上乗せはできない', L.seat === 0 && L.toCall === 5 && !L.canRaise, L);
    const ev = act(t, 0, 'call');
    ok('ポット 60 を AA（席1）が取る', awards(ev)[0].amount === 60 && t.players[1].stack === 60, awards(ev));
  }
});

// =============================================================
// 8. ブラインドを払えない人
// =============================================================
section('ブラインドを払えない人', () => {
  {
    // SB が 10 しか無い
    const { t, ev } = deal([1500, 10, 1500, 1500, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['7h 2d', 'As Ad', 'Ks Kd', '8c 3c'], board: 'Qc 9d 4h 5s Js' });
    const pb = ev.filter(e => e.type === 'post-blind');
    ok('SB は 10 でオールイン、BB は 50', pb[0].amount === 10 && pb[0].allIn && pb[1].amount === 50, pb);
    ok('SB には手番が来ない', (() => { act(t, 3, 'call'); act(t, 0, 'call'); return t.hand.toAct === 2; })(), t.hand.toAct);
    act(t, 2, 'check');
    const ev2 = checkDown(t);
    const by = Object.fromEntries(awards(ev2).map(a => [a.pot, a]));
    ok('メイン 10×4＝40 は AA（席1）、サイド 40×3＝120 は KK（席2）',
      by[0].amount === 40 && by[0].winners.join() === '1' && by[1].amount === 120 && by[1].winners.join() === '2', awards(ev2));
  }
  {
    // BB が 30 しか無い：コールする額は満額 50。最小レイズは 100
    const { t, ev } = deal([1500, 1500, 30, 1500, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['7h 2d', '8c 3c', 'As Ad', '9h 4d'], board: 'Qc Td 5h 6s Js' });
    ok('BB は 30 でオールイン', ev.filter(e => e.type === 'post-blind')[1].amount === 30);
    const L = A.legalActions(t);
    ok('UTG のコール額は 50、最小レイズは 100', L.seat === 3 && L.toCall === 50 && L.minRaiseTo === 100, L);
    act(t, 3, 'call'); act(t, 0, 'call');
    const L1 = A.legalActions(t);
    ok('SB はあと 25', L1.seat === 1 && L1.toCall === 25, L1);
    act(t, 1, 'call');
    ok('BB には手番が来ずフロップへ（SB から）', t.hand.street === 'flop' && t.hand.toAct === 1, t.hand);
    const ev2 = checkDown(t);
    const by = Object.fromEntries(awards(ev2).map(a => [a.pot, a]));
    ok('メイン 30×4＝120 は AA（席2）、サイド 20×3＝60 は別の人', by[0].amount === 120 && by[0].winners.join() === '2' && by[1].amount === 60 && !by[1].eligible.includes(2), awards(ev2));
  }
  {
    // BB が SB より少ない（20）。全員降りたら SB の 5 を戻す
    const { t, ev } = deal([1500, 1500, 20, 0, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['7h 2d', '8c 3c', 'As Ad'], board: 'Qc Td 5h 6s Js' });
    // ボタンが降りると SB には手番が来ない（相手はオールインで、そろえる額も無い）
    const ev2 = act(t, 0, 'fold');
    ok('ボタンが降りたらハンドは終わる', t.hand.done);
    const ret = ev2.find(e => e.type === 'return');
    ok('SB は 25 を払っていて、BB の 20 を超えた 5 を戻す', ret && ret.seat === 1 && ret.amount === 5, ret);
    ok('BB が 40 を取る', awards(ev2)[0].amount === 40 && t.players[2].stack === 40, awards(ev2));
  }
  {
    // SB も BB も短い：SB 10、BB 30
    const { t } = deal([1500, 10, 30, 1500, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['7h 2d', 'As Ad', 'Ks Kd', '8c 3c'], board: 'Qc 9d 4h 5s Js' });
    act(t, 3, 'call');
    let ev = act(t, 0, 'call');
    ok('SB も BB もオールインでも、席3と席0は続けて賭けられる', t.hand.street === 'flop' && !t.hand.done);
    ev = ev.concat(checkDown(t));
    const by = Object.fromEntries(awards(ev).map(a => [a.pot, a]));
    ok('メイン 40・サイド1 60（20×3）・サイド2 40（20×2）', by[0].amount === 40 && by[1].amount === 60 && by[2].amount === 40, awards(ev).map(a => [a.pot, a.amount, a.eligible]));
    ok('AA が メイン、KK がサイド1、残り2人の強い方がサイド2', by[0].winners.join() === '1' && by[1].winners.join() === '2' && by[2].winners.length >= 1 && !by[2].eligible.includes(1), awards(ev));
    ok('SB が4倍（40）、BB が 30→60', t.players[1].stack === 40 && t.players[2].stack === 60, stacksOf(t));
  }
});

// =============================================================
// 9. 同じハンドでの同時脱落と順位
// =============================================================
section('同時脱落と順位', () => {
  {
    // 6人中3人が同じハンドで脱落：500 → 4位、300 の2人 → 5位タイ（賞金は 5位と6位の平均 50）
    const { t } = deal([2000, 300, 300, 500, 2000, 2000], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d', '9c 4c', 'Tc 5c'], board: '4h Kd 9h Js Qc' });
    act(t, 3, 'allin'); act(t, 4, 'fold'); act(t, 5, 'fold'); act(t, 0, 'call');
    act(t, 1, 'allin');
    const ev = act(t, 2, 'allin');
    const busts = ev.filter(e => e.type === 'bust');
    ok('悪い順に並ぶ（5位・5位・4位）', busts.map(b => b.place).join() === '5,5,4', busts);
    const by = Object.fromEntries(busts.map(b => [b.seat, b]));
    ok('500 の席3が 4位・賞金 300', by[3].place === 4 && by[3].prize === 300 && !by[3].tie, by[3]);
    ok('300 の2人は 5位タイ・賞金 50 ずつ', by[1].place === 5 && by[2].place === 5 && by[1].prize === 50 && by[2].prize === 50 && by[1].tie && by[2].tie, busts);
    const st = A.standings(t);
    ok('順位表：生き残りは持ち点順（同額は同じ順位）、脱落は確定した順位', st.map(r => r.rank).join() === '1,2,2,4,5,5', st.map(r => [r.seat, r.rank]));
    ok('脱落した人は次のハンドに配られない', (() => { A.startHand(t); return [1, 2, 3].every(s => !t.hand.inHand[s]) && t.hand.aliveAtStart === 3; })());
  }
  {
    // バブル（4位の境目）での同額の同時脱落：4位タイ → 賞金は 4位と5位の平均 200
    const { t } = deal([2000, 300, 300, 2000, 2000, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d', '9c 4c'], board: '4h Kd 9h Js Qc' });
    act(t, 3, 'fold'); act(t, 4, 'fold'); act(t, 0, 'raise', 300);
    act(t, 1, 'call');
    const ev = act(t, 2, 'call');
    const busts = ev.filter(e => e.type === 'bust');
    ok('2人とも 4位・賞金 200', busts.length === 2 && busts.every(b => b.place === 4 && b.prize === 200 && b.tie), busts);
    ok('ポット 900 を AA が取る', t.players[0].stack === 2600, stacksOf(t));
  }
  {
    // 3人同時に脱落して優勝が決まる（同額なし）
    const { t } = deal([1000, 300, 400, 500, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d'], board: '4h Kd 9h Js Qc' });
    act(t, 3, 'allin'); act(t, 0, 'call'); act(t, 1, 'call');
    const ev = act(t, 2, 'call');
    const busts = ev.filter(e => e.type === 'bust');
    ok('500→2位（900）、400→3位（500）、300→4位（300）', busts.map(b => `${b.seat}:${b.place}:${b.prize}`).join() === '1:4:300,2:3:500,3:2:900', busts);
    const fin = ev.find(e => e.type === 'finish');
    ok('優勝の出来事は脱落の後', fin && fin.winner === 0 && ev.indexOf(fin) > ev.indexOf(busts[busts.length - 1]), fin);
    ok('優勝は 1位・1800', t.players[0].place === 1 && t.players[0].prize === 1800);
    ok('大会が終わった後は新しいハンドを始められない', throws(() => A.startHand(t)));
    const prizes = t.players.slice(0, 4).map(p => p.prize).reduce((a, b) => a + b, 0);
    ok('賞金の合計 1800＋900＋500＋300', prizes === 3500, prizes);
  }
  {
    // 開始時の持ち点の比べ方：ハンドの途中の投入ではなく、開始時
    // 席1（開始 600）はプリフロップで 600 全部、席3（開始 800）はフロップで残りを入れて脱落
    const { t } = deal([3000, 600, 3000, 800, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', 'Kc Kh', '8h 3d'], board: '4h Qd 9h Js 5c' });
    act(t, 3, 'raise', 600); act(t, 0, 'call'); act(t, 1, 'allin'); act(t, 2, 'call');
    act(t, 2, 'check'); act(t, 3, 'allin'); act(t, 0, 'call');
    let ev = act(t, 2, 'call');
    ev = ev.concat(checkDown(t));
    const busts = ev.filter(e => e.type === 'bust');
    ok('開始 800 の席3が 3位、開始 600 の席1が 4位', busts.map(b => `${b.seat}:${b.place}`).join() === '1:4,3:3', busts);
  }
});

// =============================================================
// 10. デッドボタン（実際のハンドの流れで）
// =============================================================
section('デッドボタン', () => {
  // ハンド1：ボタン0・SB1・BB2。BB（席2、50 だけ）が負けて脱落
  const { t } = deal([1500, 1500, 50, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 }, {
    holes: ['As Ad', '7h 2d', '8h 3c', '9c 4c', 'Tc 5c', 'Jc 6c'], board: 'Kc Qd 4h 5s 2s' });
  act(t, 3, 'fold'); act(t, 4, 'fold'); act(t, 5, 'fold'); act(t, 0, 'call'); act(t, 1, 'fold');
  checkDown(t);
  ok('ハンド1で席2が脱落（6位）', t.players[2].place === 6, t.players[2]);
  // ハンド2：BB は席3へ。SB は前の BB の席2（空）＝デッドSB、ボタンは前の SB の席1
  const ev2 = A.startHand(t);
  const hs2 = ev2.find(e => e.type === 'hand-start');
  ok('ハンド2：ボタン席1・デッドSB・BB 席3', hs2.button === 1 && hs2.deadSB && hs2.sbSeat === null && hs2.bbSeat === 3 && !hs2.deadButton, hs2);
  const pb2 = ev2.filter(e => e.type === 'post-blind');
  ok('ハンド2：払うのは BB だけ', pb2.length === 1 && pb2[0].seat === 3 && pb2[0].blind === 'bb', pb2);
  ok('ハンド2：プリフロップは BB の左（席4）から', t.hand.toAct === 4, t.hand.toAct);
  ok('ハンド2：位置の表示に SB が無い', (() => { const p = A.positionLabels(t); return p[1] === 'BTN' && p[3] === 'BB' && !Object.values(p).includes('SB'); })(), A.positionLabels(t));
  act(t, 4, 'call'); act(t, 5, 'fold'); act(t, 0, 'fold'); act(t, 1, 'call'); act(t, 3, 'check');
  ok('ハンド2：フロップはボタンの左の生きている席（BB 席3）から', t.hand.street === 'flop' && t.hand.toAct === 3, t.hand.toAct);
  foldAround(t);
  // ハンド3：BB 席4、SB 席3、ボタンは前の SB の席2（空）＝デッドボタン
  const ev3 = A.startHand(t);
  const hs3 = ev3.find(e => e.type === 'hand-start');
  ok('ハンド3：デッドボタン（席2）・SB 席3・BB 席4', hs3.button === 2 && hs3.deadButton && hs3.sbSeat === 3 && hs3.bbSeat === 4 && !hs3.deadSB, hs3);
  ok('ハンド3：プリフロップは席5から', t.hand.toAct === 5, t.hand.toAct);
  ok('ハンド3：位置の表示に BTN が無い', !Object.values(A.positionLabels(t)).includes('BTN'), A.positionLabels(t));
  act(t, 5, 'fold'); act(t, 0, 'fold'); act(t, 1, 'call'); act(t, 3, 'call'); act(t, 4, 'check');
  ok('ハンド3：フロップは空のボタンの左の SB（席3）から', t.hand.street === 'flop' && t.hand.toAct === 3, t.hand.toAct);
  foldAround(t);
  // ハンド4：ふつうに戻る（ボタン席3・SB 席4・BB 席5）
  const hs4 = A.startHand(t).find(e => e.type === 'hand-start');
  ok('ハンド4：ボタン席3・SB 席4・BB 席5', hs4.button === 3 && hs4.sbSeat === 4 && hs4.bbSeat === 5 && !hs4.deadSB && !hs4.deadButton, hs4);
  foldAround(t);
  // SB が脱落した場合：次のハンドはボタンが空になる
  const { t: u } = deal([1500, 25, 1500, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 }, {
    holes: ['As Ad', '7h 2d', '8h 3c', '9c 4c', 'Tc 5c', 'Jc 6c'], board: 'Kc Qd 4h 5s 2s' });
  act(u, 3, 'fold'); act(u, 4, 'fold'); act(u, 5, 'fold'); act(u, 0, 'call'); act(u, 2, 'check');
  checkDown(u);
  ok('SB（25 だけ）が脱落', u.players[1].place === 6, u.players[1]);
  const hsU = A.startHand(u).find(e => e.type === 'hand-start');
  ok('次のハンド：デッドボタン（席1）・SB 席2・BB 席3', hsU.button === 1 && hsU.deadButton && hsU.sbSeat === 2 && hsU.bbSeat === 3, hsU);
  foldAround(u);
  // 2人同時に脱落（SB と BB）：次は デッドSB とデッドボタンが重なる
  const { t: w } = deal([1500, 50, 50, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 }, {
    holes: ['As Ad', '7h 2d', '8h 3c', '9c 4c', 'Tc 5c', 'Jc 6c'], board: 'Kc Qd 4h 5s 2s' });
  act(w, 3, 'fold'); act(w, 4, 'fold'); act(w, 5, 'fold'); act(w, 0, 'call'); act(w, 1, 'call');
  checkDown(w);
  ok('SB と BB が同時に脱落（同額で 5位タイ）', w.players[1].place === 5 && w.players[2].place === 5, [w.players[1], w.players[2]]);
  const evW = A.startHand(w);
  const hsW = evW.find(e => e.type === 'hand-start');
  ok('次のハンド：BB 席3、SB（席2）もボタン（席1）も空', hsW.bbSeat === 3 && hsW.deadSB && hsW.deadButton, hsW);
  ok('プリフロップは席4から、BB が最後', w.hand.toAct === 4, w.hand.toAct);
  act(w, 4, 'call'); act(w, 5, 'call'); act(w, 0, 'call');
  ok('BB にオプション', A.legalActions(w).seat === 3 && A.legalActions(w).canCheck);
  act(w, 3, 'check');
  ok('フロップは BB（空のボタンの左の生きている席）から', w.hand.street === 'flop' && w.hand.toAct === 3, w.hand.toAct);
  // 同じ人が2回続けて BB を払わない（3人→2人）
  const { t: x } = deal([1500, 1500, 1500, 0, 0, 0], { button: 0, sb: 1, bb: 2 }, {
    holes: ['7h 2d', 'As Ad', '8h 3c'], board: 'Kc Qd 4h 5s 2s' });
  act(x, 0, 'allin'); act(x, 1, 'call'); act(x, 2, 'fold');
  ok('ボタンの席0が脱落', x.players[0].place === 3);
  const hsX = A.startHand(x).find(e => e.type === 'hand-start');
  ok('2人になる：前の BB の席2はボタン＝SB、席1が BB', hsX.headsUp && hsX.button === 2 && hsX.sbSeat === 2 && hsX.bbSeat === 1, hsX);
});

// =============================================================
// 11. ブラインドの上がる時期
// =============================================================
section('ブラインドの上がる時期', () => {
  const t = A.createTournament({ seed: 99 });
  const seen = [];
  for (let n = 1; n <= 12; n++) {
    const ev = A.startHand(t);
    const hs = ev.find(e => e.type === 'hand-start');
    const lu = ev.find(e => e.type === 'level-up');
    seen.push({ n, sb: hs.sb, bb: hs.bb, lu: lu ? lu.level : null, li: A.levelInfo(t) });
    // 手の途中ではハンドの番号も段階も変わらない
    if (n === 5) {
      act(t, null, A.legalActions(t).canCheck ? 'check' : 'fold');
      ok('ハンド5の途中：段階は Lv1・このハンドの後で上がる', A.levelInfo(t).level === 1 && A.levelInfo(t).handsLeftAfterThis === 0 && A.levelInfo(t).nextBb === 100, A.levelInfo(t));
    }
    foldAround(t);
    if (n === 5) ok('ハンド5の後（次のハンド）は Lv2', A.levelInfo(t).level === 2 && A.levelInfo(t).bb === 100, A.levelInfo(t));
  }
  ok('ハンド1〜5は 25/50', seen.slice(0, 5).every(s => s.sb === 25 && s.bb === 50), seen.map(s => s.bb));
  ok('ハンド6〜10は 50/100', seen.slice(5, 10).every(s => s.sb === 50 && s.bb === 100), seen.map(s => s.bb));
  ok('ハンド11から 75/150', seen[10].bb === 150 && seen[11].bb === 150);
  ok('上昇の出来事はハンド6と11の頭だけ', seen.filter(s => s.lu).map(s => `${s.n}:${s.lu}`).join() === '6:2,11:3', seen.filter(s => s.lu));
  ok('上昇の出来事は hand-start より前', (() => { const t2 = A.createTournament({ seed: 5 }); for (let i = 0; i < 5; i++) { A.startHand(t2); foldAround(t2); } const ev = A.startHand(t2); return ev.findIndex(e => e.type === 'level-up') < ev.findIndex(e => e.type === 'hand-start'); })());
  // 表と零時
  const tb = A.levelTable(13);
  ok('Lv7（ハンド31〜35）は 300/600 で零時', tb[6].fromHand === 31 && tb[6].toHand === 35 && tb[6].bb === 600 && tb[6].midnight && tb[6].clock === '12:00', tb[6]);
  ok('Lv10 800/1600、Lv11 1200/2400、Lv12 1800/3600、Lv13 2700/5400', [9, 10, 11, 12].map(i => `${tb[i].sb}/${tb[i].bb}`).join() === '800/1600,1200/2400,1800/3600,2700/5400', tb.slice(9).map(l => `${l.sb}/${l.bb}`));
  {
    const { ev } = deal([1500, 1500, 1500, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 }, { handNo: 31 });
    const hs = ev.find(e => e.type === 'hand-start');
    ok('ハンド31：300/600', hs.sb === 300 && hs.bb === 600 && hs.level === 7, hs);
  }
  {
    // 途中から始めた時、前のハンドと段階が違えば上昇の出来事が付く
    const tt = A.createTournament({ seed: 3 });
    tt.handNo = 30; tt.levelIndex = 5; tt.lastPos = { button: 0, sb: 1, bb: 2 };
    const ev = A.startHand(tt);
    const lu = ev.find(e => e.type === 'level-up');
    ok('ハンド31の頭に Lv7（零時）の上昇', lu && lu.level === 7 && lu.midnight && lu.sb === 300, lu);
  }
});

// =============================================================
// 12. 保存と復元で同じ札から再開
// =============================================================
section('保存と復元', () => {
  {
    const t = A.createTournament({ seed: 4242 });
    for (let i = 0; i < 3; i++) { A.startHand(t); foldAround(t); }
    const before = JSON.stringify(A.serialize(t));
    A.startHand(t);
    const holes1 = JSON.stringify(t.hand.holes), hs1 = t.hand.button;
    act(t, null, 'call');
    const mid = A.serialize(t);
    ok('ハンドの途中の保存は、そのハンドの前の状態', JSON.stringify(mid) === before, '');
    const t2 = A.restore(JSON.parse(JSON.stringify(mid)));
    ok('復元直後はハンドの外', t2.hand === null && t2.handNo === 3);
    A.startHand(t2);
    ok('復元して始めると同じ伏せ札・同じボタン', JSON.stringify(t2.hand.holes) === holes1 && t2.hand.button === hs1);
    // 場札も同じか（両方とも最後までチェックで進める）
    const tA = A.restore(mid), tB = A.restore(mid);
    A.startHand(tA); A.startHand(tB);
    checkDown(tA); checkDown(tB);
    ok('場札の5枚も同じ', cstr(tA.hand.board) === cstr(tB.hand.board) && tA.hand.board.length === 5, [cstr(tA.hand.board), cstr(tB.hand.board)]);
    ok('結果の持ち点も同じ', stacksOf(tA).join() === stacksOf(tB).join());
  }
  {
    // AI だけで最後まで：保存→復元した2つは同じ流れになる（game.js の rand も同じ種にそろえる）
    const t = A.createTournament({ seed: 31337 });
    seedRand(11);
    for (let i = 0; i < 9 && !t.finished; i++) A.playHandAuto(t);
    const save = JSON.stringify(A.serialize(t));
    const runFrom = () => { const u = A.restore(JSON.parse(save)); seedRand(12345); const r = A.fastForward(u); return JSON.stringify({ e: r.events, s: r.standings }); };
    const r1 = runFrom(), r2 = runFrom();
    ok('保存から2回やり直すと、出来事の列も順位も同じ', r1 === r2 && r1.length > 100, [r1.length, r2.length]);
    const u = A.restore(JSON.parse(save));
    ok('復元した大会は持ち点・ハンド番号・前の席を引き継ぐ', u.handNo === t.handNo && stacksOf(u).join() === stacksOf(t).join() && JSON.stringify(u.lastPos) === JSON.stringify(t.lastPos));
  }
  {
    // 脱落者がいる大会でも、順位・賞金を引き継ぐ
    const { t } = deal([1500, 1500, 50, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '8h 3c', '9c 4c', 'Tc 5c', 'Jc 6c'], board: 'Kc Qd 4h 5s 2s' });
    act(t, 3, 'fold'); act(t, 4, 'fold'); act(t, 5, 'fold'); act(t, 0, 'call'); act(t, 1, 'fold');
    checkDown(t);
    const u = A.restore(JSON.parse(JSON.stringify(A.serialize(t))));
    ok('脱落者の順位・賞金を引き継ぐ', u.players[2].place === 6 && u.players[2].prize === 0);
    const hs = A.startHand(u).find(e => e.type === 'hand-start');
    ok('復元後もデッドSBの規則どおり', hs.deadSB && hs.bbSeat === 3 && hs.button === 1, hs);
  }
  {
    const t = A.createTournament({ seed: 1 });
    const bad = A.serialize(t);
    bad.players[0].stack += 25;
    ok('チップが合わない保存データは拒む', throws(() => A.restore(bad)));
    const bad2 = A.serialize(t); bad2.v = 999;
    ok('版の違う保存データは拒む', throws(() => A.restore(bad2)));
  }
});

// =============================================================
// 13. その他の穴（合法な行動・出来事）
// =============================================================
section('合法な行動と出来事', () => {
  const { t } = deal([1500, 1500, 1500, 1500, 3000, 1500], { button: 0, sb: 1, bb: 2 });
  ok('手番でない席の行動は拒まれる', throws(() => A.applyAction(t, { kind: 'fold', seat: 4 })));
  ok('コールの額がある時のチェックは拒まれる', throws(() => A.applyAction(t, { kind: 'check' })));
  ok('知らない行動は拒まれる', throws(() => A.applyAction(t, { kind: 'dance' })));
  ok('持ち点を超える額は拒まれる', throws(() => A.applyAction(t, { kind: 'raise', to: 1600 })));
  const ev = act(t, 3, 'raise', 1500);
  ok('全部の上乗せは allIn の印付き', ev[0].allIn && ev[0].to === 1500 && ev[0].stack === 0, ev[0]);
  const last = ev[ev.length - 1];
  ok('出来事の最後は次の手番', last.type === 'to-act' && last.seat === 4, last);
  const v = A.view(t, 4);
  ok('見え方：自分の伏せ札だけ見える', v.players[4].hole && v.players.filter(p => p.hole).length === 1, v.players.map(p => !!p.hole));
  ok('見え方：合法な行動は手番の人にだけ', v.legal && v.legal.seat === 4 && A.view(t, 0).legal === null);
  const pr = A.raisePresets(t);
  ok('額の選択：最小 2950（1500＋1450）・全部 3000、どれも範囲内', pr && pr.min === 2950 && pr.allin === 3000 && [pr.twoThirds, pr.pot].every(x => x >= 2950 && x <= 3000), pr);
  act(t, 4, 'call');
  ok('持ち点 1500 の人は 1500 のオールインに上乗せできない（額の選択なし）', A.legalActions(t).seat === 5 && A.raisePresets(t) === null && A.legalActions(t).callIsAllIn);
  // ベット額の選択（フロップ）
  const { t: u } = deal([1500, 1500, 1500, 0, 0, 0], { button: 0, sb: 1, bb: 2 });
  act(u, 0, 'call'); act(u, 1, 'call'); act(u, 2, 'check');
  const p2 = A.raisePresets(u);
  ok('フロップの額の選択：最小 50・2/3 100・ポット 150・全部 1450', p2.min === 50 && p2.twoThirds === 100 && p2.pot === 150 && p2.allin === 1450, p2);
  ok('BB 未満のベット（to 30）は拒まれる', throws(() => A.applyAction(u, { kind: 'bet', to: 30 })));
  // BB 未満の持ち点で賭ける（オールイン 30）：次の人はコール 30、上乗せは 30＋BB＝80 から（短いので再レイズ権は開かない）
  const { t: w } = deal([1500, 1500, 1500, 80, 0, 0], { button: 0, sb: 1, bb: 2 });
  act(w, 3, 'call'); act(w, 0, 'call'); act(w, 1, 'call'); act(w, 2, 'check');
  act(w, 1, 'check'); act(w, 2, 'check');
  const eS = act(w, 3, 'allin');
  ok('BB 未満のオールインの賭け（30）は短い', eS[0].kind === 'bet' && eS[0].to === 30 && eS[0].shortAllIn, eS[0]);
  const Lw = A.legalActions(w);
  ok('次の人：コール 30、最小の上乗せは 80', Lw.seat === 0 && Lw.toCall === 30 && Lw.canRaise && Lw.minRaiseTo === 80, Lw);
  act(w, 0, 'call');
  const Lw2 = A.legalActions(w);
  ok('チェック済みの SB は全額の賭けを受けていない（行動済み）ので上乗せ不可（TDA 47 の文言どおり）', Lw2.seat === 1 && !Lw2.canRaise && Lw2.reraiseClosed && Lw2.toCall === 30, Lw2);
});

// =============================================================
// 14. 追加の穴：SB だけ短い時の全員降り、3人同額の同時脱落、AI がほかの人の伏せ札を見ない
// =============================================================
section('追加の穴', () => {
  {
    // SB が 10 でオールイン、全員降りて BB へ：BB の 50 のうち 40 を戻し、20 をショーダウンで争う
    const { t } = deal([1500, 10, 1500, 1500, 0, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['7h 2d', 'As Ad', 'Ks Kd', '8c 3c'], board: 'Qc 9d 4h 5s Js' });
    act(t, 3, 'fold');
    const ev = act(t, 0, 'fold');
    const ret = ev.find(e => e.type === 'return');
    ok('BB に手番は来ず、40 を戻す', t.hand.done && ret && ret.seat === 2 && ret.amount === 40, ret);
    ok('20 のポットは表で勝負（AA の SB が取る）', awards(ev).length === 1 && awards(ev)[0].amount === 20 && awards(ev)[0].winners.join() === '1' && ev.some(e => e.type === 'showdown'), awards(ev));
  }
  {
    // 3人が同じ 300 で同時に脱落（4位タイ）：賞金は 4〜6位の平均（(300+100+0)/3 の切り捨て 133）
    const { t } = deal([3000, 300, 300, 300, 3000, 3000], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d', '9c 4c', 'Tc 5c'], board: '4h Kd 9h Js Qc' });
    act(t, 3, 'allin'); act(t, 4, 'fold'); act(t, 5, 'fold'); act(t, 0, 'call'); act(t, 1, 'call');
    const ev = act(t, 2, 'call');
    const busts = ev.filter(e => e.type === 'bust');
    ok('3人とも 4位・賞金 133', busts.length === 3 && busts.every(b => b.place === 4 && b.prize === 133 && b.tie), busts);
    ok('残り3人（ヘッズアップではない）', !ev.some(e => e.type === 'heads-up') && A.standings(t).filter(r => r.alive).length === 3);
    // 5人のうち3人が同額で脱落 → 3位タイ（3〜5位の平均 300）
    const { t: u } = deal([3000, 300, 300, 300, 3000, 0], { button: 0, sb: 1, bb: 2 }, {
      holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d', '9c 4c'], board: '4h Kd 9h Js Qc' });
    act(u, 3, 'allin'); act(u, 4, 'fold'); act(u, 0, 'call'); act(u, 1, 'call');
    const evU = act(u, 2, 'call');
    const bU = evU.filter(e => e.type === 'bust');
    ok('5人中3人が同額で脱落：3人とも 3位・賞金 300（(500+300+100)/3）', bU.length === 3 && bU.every(b => b.place === 3 && b.prize === 300), bU);
    ok('残り2人でヘッズアップへ', evU.some(e => e.type === 'heads-up'));
  }
  {
    // AI の判断は、ほかの人の伏せ札を入れ替えても変わらない（同じ乱数なら同じ答え）
    const M = A._internal.mulberry32;
    let checked = 0, differ = 0;
    const firstDiff = [];
    for (let seed = 1; seed <= 12; seed++) {
      const t = A.createTournament({ seed: 5000 + seed });
      seedRand(seed);
      for (let g = 0; g < 4000 && !t.finished && checked < 600; g++) {
        if (!t.hand || t.hand.done) { A.startHand(t); continue; }
        const h = t.hand, me = h.toAct;
        if (me == null) continue;
        const rs = 0xC0FFEE + g;
        h.aiRng = M(rs); seedRand(rs);
        const d1 = JSON.stringify(A.decideAction(t));
        // ほかの人の伏せ札を、見えていない札から配り直す
        const saved = h.holes.map(x => x && x.slice());
        const seen = new Set(h.holes[me].concat(h.board).map(c => c.rank + c.suit));
        const pool = [];
        for (const su of ['♠', '♥', '♦', '♣']) for (let r = 2; r <= 14; r++) if (!seen.has(r + su)) pool.push({ suit: su, rank: r, label: LABEL[r] || String(r) });
        const rr = M(rs ^ 0x55);
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        let k = 0;
        for (let q = 0; q < h.holes.length; q++) if (q !== me && h.holes[q]) h.holes[q] = [pool[k++], pool[k++]];
        h.aiRng = M(rs); seedRand(rs);
        const d2 = JSON.stringify(A.decideAction(t));
        h.holes = saved;
        checked++;
        if (d1 !== d2) { differ++; if (firstDiff.length < 3) firstDiff.push({ seed, hand: h.no, seat: me, d1, d2 }); }
        h.aiRng = M(rs + 1); seedRand(rs + 1);
        A.applyAction(t, A.decideAction(t));
        audit(t, 'AI の行動');
      }
    }
    ok(`AI の判断はほかの人の伏せ札に左右されない（${checked} 回）`, checked >= 300 && differ === 0, firstDiff);
  }
});

// ---- 出力 ----
const failed = results.filter(r => !r.ok);
const byGroup = {};
for (const r of results) { (byGroup[r.group] = byGroup[r.group] || { ok: 0, ng: 0 }); r.ok ? byGroup[r.group].ok++ : byGroup[r.group].ng++; }
const lines = [];
lines.push(`零時の卓 規則の試験：${results.length - failed.length}/${results.length} 通った（検算の違反 ${auditFails} 件）`);
for (const [g, c] of Object.entries(byGroup)) lines.push(`  ${c.ng ? '✗' : '○'} ${g}：${c.ok}/${c.ok + c.ng}`);
for (const r of failed) lines.push(`  ✗ [${r.group}] ${r.name}  ${r.info.slice(0, 500)}`);
fs.mkdirSync(path.join(REPO, 'qa', 'out'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'qa', 'out', 'allstar-rules.json'), JSON.stringify({ passed: results.length - failed.length, total: results.length, auditFails, results }, null, 1));
console.log(lines.join('\n'));
if (process.argv.includes('--list')) for (const r of results) console.log(`${r.ok ? '○' : '✗'} [${r.group}] ${r.name}`);
process.exit(failed.length ? 1 : 0);
