#!/usr/bin/env node
// 「零時の卓」（6人大会）の自動対戦。ブラウザは使わない。
// game.js から必要な純関数だけを文字列で切り出して vm で評価し、allstar.js に Allstar.configure() で差し込む。
// 全員 AI（ミミの席は 'mimi_auto'）の大会を種を変えて多数回まわし、毎ハンド・毎行動で
// 「全員の残り＋未精算の投入額＝9,000」を検算する。違反したら止めて、その大会の種と出来事を出す。
// 使い方: node qa/allstar-sim.mjs [--n 2000] [--seed 1] [--workers 3] [--samples 300] [--quiet]
// 結果: qa/out/allstar-sim.json と日本語の要約（標準出力）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..');

// ---- game.js から宣言を切り出す ------------------------------------------------
// 宣言の頭（function NAME( / const NAME =）から、対応する閉じ括弧までを返す。文字列・注釈・テンプレートは飛ばす。
function sliceDecl(src, head) {
  const at = src.indexOf(head);
  if (at < 0) throw new Error('game.js に見つからない: ' + head);
  let i = at, depth = 0, started = false;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) i = n; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '{' || c === '[' || c === '(') { depth++; started = true; }
    else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (started && depth === 0) {
        // function は本体の } で終わる。const は ; まで含める
        if (head.startsWith('function')) {
          if (c === '}') return src.slice(at, i + 1);
        } else {
          let j = i + 1;
          while (j < n && src[j] !== ';' && src[j] !== '\n') j++;
          return src.slice(at, j + 1);
        }
      }
    }
    i++;
  }
  throw new Error('閉じ括弧が見つからない: ' + head);
}

const GAME_DECLS = [
  'function shuffle(', 'const SUITS =', 'const RANK_NAMES =', 'function newDeck(', 'const HAND_NAMES =',
  'function evaluateHand(', 'function combinations(', 'function evalFive(', 'function mkScore(',
  'function fastHandScore(', 'function equityVsRandom(', 'function countStrongOuts(',
  'const AI_STYLES =', 'function aiStyleOf(', 'function aiPickSize(', 'function decideOpponentAction(',
  'function betSizeToChips(', 'function opponentPreflopStrength(',
];
const GAME_EXPORTS = ['shuffle', 'SUITS', 'RANK_NAMES', 'newDeck', 'HAND_NAMES', 'evaluateHand', 'fastHandScore',
  'equityVsRandom', 'countStrongOuts', 'AI_STYLES', 'aiStyleOf', 'aiPickSize', 'decideOpponentAction',
  'betSizeToChips', 'opponentPreflopStrength'];

// game.js の純関数を vm で評価して返す。rand は差し替えられる（__setRand）。
export function loadGameFns(gamePath = path.join(REPO, 'game.js')) {
  const src = fs.readFileSync(gamePath, 'utf8');
  const parts = GAME_DECLS.map(h => sliceDecl(src, h));
  const ctx = vm.createContext({ Math, Object, Array, Set, Map, Number, String, console });
  vm.runInContext(`let __rand = Math.random; function rand() { return __rand(); } function __setRand(f) { __rand = f; }\n`
    + parts.join('\n') + `\n;globalThis.__fns = { ${GAME_EXPORTS.join(', ')}, __setRand };`, ctx, { filename: 'game.js(切り出し)' });
  return ctx.__fns;
}

// allstar.js を読み込む。sameContext=true なら game の関数と同じ全体に置く（ブラウザと同じ見え方）
export function loadAllstar({ fns = null, sameContext = false } = {}) {
  const src = fs.readFileSync(path.join(REPO, 'allstar.js'), 'utf8');
  if (sameContext) {
    const gsrc = fs.readFileSync(path.join(REPO, 'game.js'), 'utf8');
    const parts = GAME_DECLS.map(h => sliceDecl(gsrc, h));
    const ctx = vm.createContext({ Math, Object, Array, Set, Map, Number, String, JSON, console });
    vm.runInContext(`function rand() { return Math.random(); }\n` + parts.join('\n') + '\n' + src + '\n;globalThis.__A = Allstar;', ctx, { filename: 'allstar.js' });
    return ctx.__A;
  }
  const ctx = vm.createContext({ Math, Object, Array, Set, Map, Number, String, JSON, console });
  vm.runInContext(src + '\n;globalThis.__A = Allstar;', ctx, { filename: 'allstar.js' });
  const A = ctx.__A;
  if (fns) A.configure(fns);
  return A;
}

// ---- 1大会 ------------------------------------------------------------------
function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function runOne(A, seed, opt) {
  const t = A.createTournament({ seed });
  const stat = { seed, hands: 0, actions: 0, allins: 0, sidePotHands: 0, multiBust: 0, deadSB: 0, deadButton: 0,
    awards: 0, splitAwards: 0, returns: 0, places: null, winner: null, violations: [], shortRaises: 0, maxActionsHand: 0,
    restoreChecks: 0 };
  const log = [];
  const check = (where) => {
    const a = A.audit(t);
    if (!a.ok) stat.violations.push({ where, hand: t.handNo, total: a.total, expected: a.expected, detail: a.detail });
    return a.ok;
  };
  const eat = (evs) => {
    for (const e of evs) {
      if (opt.keepLog) log.push(e);
      if (e.type === 'action') { stat.actions++; if (e.allIn) stat.allins++; if (e.shortAllIn) stat.shortRaises++; }
      if (e.type === 'award') { stat.awards++; if (e.winners.length > 1) stat.splitAwards++; }
      if (e.type === 'return') stat.returns++;
      if (e.type === 'hand-start') { if (e.deadSB) stat.deadSB++; if (e.deadButton) stat.deadButton++; }
    }
  };
  let guard = 0;
  while (!t.finished) {
    if (++guard > 400) { stat.violations.push({ where: 'ハンド数が400を超えた', hand: t.handNo }); break; }
    // ハンド境界で保存→復元しても同じ札になるか（たまに）
    if (opt.restoreEvery && t.handNo % opt.restoreEvery === 3) {
      const s1 = JSON.stringify(A.serialize(t));
      const t2 = A.restore(JSON.parse(s1));
      const s2 = JSON.stringify(A.serialize(t2));
      if (s1 !== s2) stat.violations.push({ where: '保存→復元で状態が変わった', hand: t.handNo });
      const e1 = A.startHand(t2);
      const peek = t2.hand.holes.map(h => h ? h.map(c => c.rank + c.suit).join('') : '-').join('|');
      stat._peek = peek;
      stat.restoreChecks++;
    }
    const evs = A.startHand(t);
    if (stat._peek != null) {
      const peek = t.hand.holes.map(h => h ? h.map(c => c.rank + c.suit).join('') : '-').join('|');
      if (peek !== stat._peek) stat.violations.push({ where: '復元後の札が違う', hand: t.handNo });
      delete stat._peek;
    }
    eat(evs);
    stat.hands++;
    if (!check('ハンド開始')) break;
    let acts = 0, handGuard = 0;
    while (t.hand && !t.hand.done) {
      if (++handGuard > 200) { stat.violations.push({ where: '1ハンドの行動が200を超えた', hand: t.handNo }); break; }
      const r = A.stepAI(t, { allowHuman: true });
      eat(r.events);
      acts++;
      if (!check('行動の後')) break;
    }
    if (stat.violations.length) break;
    stat.maxActionsHand = Math.max(stat.maxActionsHand, acts);
    const h = t.lastHand;
    if (h && h.pots > 1) stat.sidePotHands++;
    if (h && h.busted >= 2) stat.multiBust++;
    if (!check('ハンド終了')) break;
  }
  stat.places = A.standings(t).map(s => ({ id: s.id, place: s.place, prize: s.prize, bustHand: s.bustHand }));
  const w = stat.places.find(p => p.place === 1);
  stat.winner = w ? w.id : null;
  if (opt.keepLog) stat.log = log;
  return stat;
}

function runBatch({ from, count, samples, restoreEvery }) {
  const fns = loadGameFns();
  const A = loadAllstar({ fns });
  if (samples) A.configure({ samples });
  const out = [];
  for (let k = 0; k < count; k++) {
    const seed = from + k;
    // game.js の aiPickSize が使う rand も大会ごとに種を固定（再現できるように）
    let s = (seed * 2654435761) >>> 0;
    fns.__setRand(() => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; });
    const st = runOne(A, seed, { restoreEvery });
    out.push(st);
    if (st.violations.length) {
      // 再実行して出来事の列を付ける
      s = (seed * 2654435761) >>> 0;
      const again = runOne(A, seed, { keepLog: true, restoreEvery });
      st.log = again.log.slice(-80);
      break;
    }
  }
  return out;
}

function summarize(all, meta) {
  const hands = all.map(s => s.hands).sort((a, b) => a - b);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const ids = ['mimi', 'rico', 'polka', 'selina', 'grano', 'velvet'];
  const perChar = {};
  for (const id of ids) {
    const ps = all.map(s => (s.places.find(p => p.id === id) || {}).place).filter(x => x != null);
    perChar[id] = {
      winPct: +(100 * ps.filter(p => p === 1).length / all.length).toFixed(1),
      avgPlace: +mean(ps).toFixed(2),
      itmPct: +(100 * ps.filter(p => p <= 4).length / all.length).toFixed(1),
    };
  }
  const totActions = all.reduce((a, s) => a + s.actions, 0), totHands = all.reduce((a, s) => a + s.hands, 0);
  const violations = all.filter(s => s.violations.length).map(s => ({ seed: s.seed, violations: s.violations, log: s.log }));
  const hist = {};
  for (const h of hands) { const b = Math.floor(h / 5) * 5; hist[`${b}-${b + 4}`] = (hist[`${b}-${b + 4}`] || 0) + 1; }
  return {
    meta,
    tournaments: all.length,
    hands: { mean: +mean(hands).toFixed(1), median: quantile(hands, 0.5), p10: quantile(hands, 0.1), p90: quantile(hands, 0.9),
      min: hands[0], max: hands[hands.length - 1], inTarget25to38Pct: +(100 * hands.filter(h => h >= 25 && h <= 38).length / hands.length).toFixed(1), histogram: hist },
    perChar,
    sidePotHands: all.reduce((a, s) => a + s.sidePotHands, 0),
    multiBust: all.reduce((a, s) => a + s.multiBust, 0),
    allins: all.reduce((a, s) => a + s.allins, 0),
    shortAllInRaises: all.reduce((a, s) => a + s.shortRaises, 0),
    splitAwards: all.reduce((a, s) => a + s.splitAwards, 0),
    uncalledReturns: all.reduce((a, s) => a + s.returns, 0),
    deadSB: all.reduce((a, s) => a + s.deadSB, 0),
    deadButton: all.reduce((a, s) => a + s.deadButton, 0),
    restoreChecks: all.reduce((a, s) => a + s.restoreChecks, 0),
    totalHands: totHands,
    actionsPerHand: +(totActions / Math.max(1, totHands)).toFixed(2),
    maxActionsInHand: Math.max(...all.map(s => s.maxActionsHand)),
    violations,
  };
}

function printJa(r) {
  const L = [];
  const name = { mimi: 'ミミ（自動）', rico: 'リコ先輩', polka: 'ポルカ', selina: 'セリナ', grano: 'グラーノ', velvet: 'ヴェルベット' };
  L.push(`零時の卓 自動対戦 ${r.tournaments} 大会（種 ${r.meta.seedFrom}〜、MC ${r.meta.samples} 回/判断、${r.meta.ms} ms）`);
  if (r.rules) L.push(`規則の確認（TDA の決まりを決めた札と行動で）：${r.rules.passed}/${r.rules.total} 通った`);
  L.push(`検算（残り＋未精算の投入額＝9,000）：違反 ${r.violations.length} 件` + (r.violations.length ? `  最初の違反 種=${r.violations[0].seed} ${JSON.stringify(r.violations[0].violations[0])}` : ''));
  L.push(`ハンド数：平均 ${r.hands.mean}、中央値 ${r.hands.median}、10% ${r.hands.p10}、90% ${r.hands.p90}（最少 ${r.hands.min}・最多 ${r.hands.max}）、目安 25〜38 に入った大会 ${r.hands.inTarget25to38Pct}%`);
  L.push('ハンド数の分布：' + Object.entries(r.hands.histogram).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([k, v]) => `${k}:${v}`).join('  '));
  L.push('キャラ別（優勝率・平均順位・4位以内）：');
  for (const [id, c] of Object.entries(r.perChar)) L.push(`  ${name[id].padEnd(8, '　')} 優勝 ${String(c.winPct).padStart(5)}%  平均 ${c.avgPlace} 位  4位以内 ${c.itmPct}%`);
  L.push(`サイドポットが出たハンド ${r.sidePotHands}、同時脱落 ${r.multiBust}、オールイン ${r.allins}（最小レイズ未満の短いオールイン ${r.shortAllInRaises}）`);
  L.push(`山分けの配当 ${r.splitAwards}、戻した額（誰もコールしなかった分）${r.uncalledReturns} 回、デッドSB ${r.deadSB}・デッドボタン ${r.deadButton}、保存→復元の確認 ${r.restoreChecks} 回`);
  L.push(`1ハンドの平均行動数 ${r.actionsPerHand}（最多 ${r.maxActionsInHand}）、総ハンド ${r.totalHands}`);
  return L.join('\n');
}

// ---- 規則の確認（決めた札と行動で、TDA の規則どおりに進むか） ----------------------------
const SUIT_OF = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_OF = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
function card(code) {
  const r = RANK_OF[code[0]] || +code[0], s = SUIT_OF[code[1]];
  return { suit: s, rank: r, label: ({ 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10' })[r] || String(r) };
}
const cards = (str) => str.split(' ').map(card);
// stacks[i]=0 の席は脱落済み（place を入れる）。pos を指定して1ハンド始める
function setupHand(A, stacks, pos, { holes = null, board = null } = {}) {
  const t = A.createTournament({ seed: 777 });
  let place = 6;
  t.players.forEach((p, i) => { p.stack = stacks[i]; if (!stacks[i]) { p.place = place--; p.prize = 0; } });
  t.totalChips = stacks.reduce((a, b) => a + b, 0);
  t._forcePos = pos;
  t.lastPos = { button: pos.button, sb: pos.sb, bb: pos.bb };
  const ev = A.startHand(t);
  const h = t.hand;
  if (holes) holes.forEach((hc, s) => { if (hc && h.holes[s]) h.holes[s] = cards(hc); });
  if (board) {
    const b = cards(board);
    // 捨て札1枚＋フロップ3枚、捨て札＋ターン、捨て札＋リバー
    h.deck[h.dp + 1] = b[0]; h.deck[h.dp + 2] = b[1]; h.deck[h.dp + 3] = b[2]; h.deck[h.dp + 5] = b[3]; h.deck[h.dp + 7] = b[4];
  }
  return { t, ev };
}
function ruleChecks(A) {
  const res = [];
  const ok = (name, cond, info = '') => res.push({ name, ok: !!cond, info: cond ? '' : String(info) });
  const act = (t, kind, to) => A.applyAction(t, to != null ? { kind, to } : { kind });
  const NP = A._internal.nextPositions;
  const T6 = A.createTournament({ seed: 1 });
  const eqPos = (p, e) => p.button === e.button && p.sb === e.sb && p.bb === e.bb && !!p.deadSB === !!e.deadSB && !!p.deadButton === !!e.deadButton;
  // 1. デッドボタン
  ok('デッドボタン：通常は1席ずつ進む', eqPos(NP(T6, { button: 0, sb: 1, bb: 2 }, [0, 1, 2, 3, 4, 5]), { button: 1, sb: 2, bb: 3 }));
  ok('デッドボタン：BB が飛んだら次は SB が空（デッドSB）', eqPos(NP(T6, { button: 0, sb: 1, bb: 2 }, [0, 1, 3, 4, 5]), { button: 1, sb: 2, bb: 3, deadSB: true }));
  ok('デッドボタン：その次はボタンが空（デッドボタン）', eqPos(NP(T6, { button: 1, sb: 2, bb: 3 }, [0, 1, 3, 4, 5]), { button: 2, sb: 3, bb: 4, deadButton: true }));
  ok('デッドボタン：UTG が飛んでも BB は1人ずつ', eqPos(NP(T6, { button: 0, sb: 1, bb: 2 }, [0, 1, 2, 4, 5]), { button: 1, sb: 2, bb: 4 }));
  ok('ヘッズアップへ：前の BB の次が BB、もう1人がボタン＝SB', eqPos(NP(T6, { button: 3, sb: 4, bb: 5 }, [0, 4]), { button: 4, sb: 4, bb: 0 }));
  ok('ヘッズアップ：BB は交互', eqPos(NP(T6, { button: 4, sb: 4, bb: 0 }, [0, 4]), { button: 0, sb: 0, bb: 4 }));
  // 2. ヘッズアップの手番：プリフロップはボタン(SB)から、フロップ以降は BB から
  {
    const { t } = setupHand(A, [1500, 0, 0, 1500, 0, 0], { button: 3, sb: 3, bb: 0 });
    ok('ヘッズアップ：プリフロップはボタン＝SB から', t.hand.toAct === 3, t.hand.toAct);
    act(t, 'call'); act(t, 'check');
    ok('ヘッズアップ：フロップは BB から', t.hand.street === 'flop' && t.hand.toAct === 0, `${t.hand.street} ${t.hand.toAct}`);
    const L = A.legalActions(t);
    ok('フロップの最小ベット＝BB', L.isBet && L.minRaiseTo === 50, JSON.stringify(L));
  }
  // 3. 最小レイズと短いオールイン（既に行動した人の再レイズ権を開かない）
  {
    const { t } = setupHand(A, [1000, 200, 1000, 0, 0, 0], { button: 0, sb: 1, bb: 2 });
    ok('3人：プリフロップはボタンから（BB の左）', t.hand.toAct === 0, t.hand.toAct);
    const L0 = A.legalActions(t);
    ok('最小レイズ＝BB の倍（to 100）', L0.minRaiseTo === 100, L0.minRaiseTo);
    act(t, 'raise', 150);
    const L1 = A.legalActions(t);
    ok('短い人の上乗せは全部（200）だけ', L1.minRaiseTo === 200 && L1.maxRaiseTo === 200, JSON.stringify(L1));
    const e1 = act(t, 'allin');
    ok('短いオールイン（200）は全額レイズではない', e1[0].shortAllIn && !e1[0].fullRaise, JSON.stringify(e1[0]));
    const L2 = A.legalActions(t);
    ok('まだ行動していない BB は上乗せできる（最小 300）', L2.seat === 2 && L2.canRaise && L2.minRaiseTo === 300, JSON.stringify(L2));
    act(t, 'call');
    const L3 = A.legalActions(t);
    ok('既に行動した人には再レイズ権が開かない', L3.seat === 0 && !L3.canRaise && L3.reraiseClosed && L3.toCall === 50, JSON.stringify(L3));
    let threw = false; try { act(t, 'raise', 400); } catch (e) { threw = true; }
    ok('再レイズは拒まれる', threw);
    act(t, 'call');
    ok('全員そろえばフロップへ', t.hand.street === 'flop', t.hand.street);
  }
  // 4. 短いオールインが重なって全額レイズ分になれば開く
  {
    const { t } = setupHand(A, [200, 260, 1000, 1000, 0, 0], { button: 0, sb: 1, bb: 2 });
    ok('4人：UTG から', t.hand.toAct === 3, t.hand.toAct);
    act(t, 'raise', 150); act(t, 'allin'); act(t, 'allin'); act(t, 'call');
    const L = A.legalActions(t);
    ok('短いオールイン2つで合計が全額レイズ以上なら開く（最小 360）', L.seat === 3 && L.canRaise && L.minRaiseTo === 360, JSON.stringify(L));
  }
  // 5. サイドポット（層ごと）と、誰もコールしなかった分の戻し
  {
    const { t } = setupHand(A, [100, 300, 600, 1000, 0, 0], { button: 0, sb: 1, bb: 2 },
      { holes: ['As Ad', 'Ks Kd', 'Qs Qd', '7h 2d'], board: '4c 8d 9h Js 3c' });
    act(t, 'allin'); act(t, 'call'); act(t, 'call');
    const ev = act(t, 'call');
    const ret = ev.find(e => e.type === 'return');
    ok('一番大きい人の余り（1000−600）を戻す', ret && ret.seat === 3 && ret.amount === 400, JSON.stringify(ret));
    const aw = ev.filter(e => e.type === 'award').sort((a, b) => a.pot - b.pot);
    ok('メイン 400（4人）・サイド1 600（3人）・サイド2 600（2人）',
      aw.length === 3 && aw[0].amount === 400 && aw[0].eligible.length === 4 && aw[1].amount === 600 && aw[1].eligible.length === 3 && aw[2].amount === 600 && aw[2].eligible.length === 2,
      JSON.stringify(aw.map(a => [a.pot, a.amount, a.eligible])));
    ok('各ポットを強い順の人が取る', aw[0].winners[0] === 0 && aw[1].winners[0] === 1 && aw[2].winners[0] === 2, JSON.stringify(aw.map(a => a.winners)));
    ok('配当後の持ち点', t.players.slice(0, 4).map(p => p.stack).join() === '400,600,600,400', t.players.map(p => p.stack).join());
    ok('オールインの後は残りを配る前に全員表', ev.some(e => e.type === 'reveal'));
  }
  // 6. 端数はボタンの左から近い勝者へ（降りた人の投入も含む）
  {
    const { t } = setupHand(A, [1000, 1000, 1000, 1000, 0, 0], { button: 0, sb: 1, bb: 2 },
      { holes: ['2c 3d', '4c 5d', '6c 7d', '2h 3h'], board: 'As Ks Qs Js Ts' });
    act(t, 'call'); act(t, 'call'); act(t, 'fold'); act(t, 'fold');
    let ev = [];
    for (let i = 0; i < 6 && !t.hand.done; i++) ev = ev.concat(act(t, 'check'));
    const aw = ev.find(e => e.type === 'award');
    const sh = aw ? Object.fromEntries(aw.shares.map(s => [s.seat, s.amount])) : {};
    ok('175 を2人で：ボタンの左に近い席3が 100、ボタン（席0）が 75', aw && aw.amount === 175 && sh[3] === 100 && sh[0] === 75, JSON.stringify(aw));
  }
  // 7. BB が払えない時は持っている分でオールイン。ほかの人がコールする額は BB の満額
  {
    const { t, ev } = setupHand(A, [1000, 1000, 30, 0, 0, 0], { button: 0, sb: 1, bb: 2 },
      { holes: ['As Ad', 'Ks Kd', '7h 2d'], board: '4c 8d 9h Js 3c' });
    const pb = ev.filter(e => e.type === 'post-blind');
    ok('BB は 30 でオールイン', pb[1].amount === 30 && pb[1].allIn, JSON.stringify(pb));
    const L = A.legalActions(t);
    ok('コールする額は BB の満額（50）', L.seat === 0 && L.toCall === 50, JSON.stringify(L));
    act(t, 'call');
    const ev2 = act(t, 'fold');
    const ret = ev2.find(e => e.type === 'return');
    ok('SB が降りたら、BB の 30 を超えた 20 を戻す', ret && ret.seat === 0 && ret.amount === 20, JSON.stringify(ret));
    const aw = ev2.find(e => e.type === 'award');
    ok('ポットは 30＋30＋SB の 25＝85', aw && aw.amount === 85 && aw.winners[0] === 0, JSON.stringify(aw));
  }
  // 8. 同時脱落：ハンド開始時の持ち点が多い人が上位、同額は同順位で賞金を均等
  {
    const { t } = setupHand(A, [1000, 300, 300, 500, 0, 0], { button: 0, sb: 1, bb: 2 },
      { holes: ['As Ad', '7h 2d', '7c 2s', '8h 3d'], board: '4c Kd 9h Js Qc' });
    act(t, 'allin'); act(t, 'call'); act(t, 'call');
    const ev = act(t, 'call');
    const busts = ev.filter(e => e.type === 'bust');
    const by = Object.fromEntries(busts.map(b => [b.seat, b]));
    ok('500 の人が 2位（900）', by[3] && by[3].place === 2 && by[3].prize === 900, JSON.stringify(busts));
    ok('300 の2人は同じ 3位、賞金は 3位と4位の平均（400）', by[1] && by[2] && by[1].place === 3 && by[2].place === 3 && by[1].prize === 400 && by[1].tie, JSON.stringify(busts));
    ok('優勝が決まって大会が終わる', t.finished && ev.some(e => e.type === 'finish'));
  }
  // 9. 誰もコールしなかったレイズは戻る
  {
    const { t } = setupHand(A, [1500, 1500, 1500, 1500, 1500, 1500], { button: 0, sb: 1, bb: 2 });
    act(t, 'raise', 150);
    const Lr = A.legalActions(t);
    ok('次の最小レイズ＝直前のレイズ幅（150+100=250）', Lr.minRaiseTo === 250, Lr.minRaiseTo);
    act(t, 'fold'); act(t, 'fold'); act(t, 'fold'); act(t, 'fold');
    const ev = act(t, 'fold');
    const ret = ev.find(e => e.type === 'return');
    ok('UTG の 150 のうち、BB の 50 を超えた 100 を戻す', ret && ret.seat === 3 && ret.amount === 100, JSON.stringify(ret));
    ok('残りは 25＋50＋50＝125 を UTG が取る', t.players[3].stack === 1500 + 75, t.players[3].stack);
  }
  // 10. 保存はハンド境界：途中で保存すると、そのハンドの前に戻る
  {
    const t = A.createTournament({ seed: 4242 });
    A.startHand(t);
    const holes1 = JSON.stringify(t.hand.holes);
    A.applyAction(t, A.decideAction(t));
    const saved = A.serialize(t);
    ok('途中の保存はハンド前の状態', saved.handNo === 0 && saved.players.every(p => p.stack === 1500), JSON.stringify(saved.players.map(p => p.stack)));
    const t2 = A.restore(saved);
    A.startHand(t2);
    ok('復元して始めると同じ札', JSON.stringify(t2.hand.holes) === holes1);
  }
  // 11. ブラインド表（plan のまま）
  {
    const tb = A.levelTable(11).map(l => `${l.sb}/${l.bb}`).join(' ');
    ok('ブラインド表', tb === '25/50 50/100 75/150 100/200 150/300 200/400 300/600 400/800 600/1200 800/1600 1200/2400', tb);
  }
  return res;
}

// ---- 実行 -------------------------------------------------------------------
const isMain = isMainThread && process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (!isMainThread && workerData && workerData.__allstarSim) {
  parentPort.postMessage(runBatch(workerData));
} else if (isMain) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, []));
  const n = +(args.n || 2000), seedFrom = +(args.seed || 1);
  const workers = Math.max(1, Math.min(+(args.workers || Math.max(1, Math.min(3, os.cpus().length - 1))), 8));
  const samples = args.samples ? +args.samples : 0;
  const restoreEvery = args.norestore ? 0 : 7;
  const t0 = Date.now();
  // まず同じ全体に置いた読み込み（ブラウザと同じ見え方）で依存が自動で見つかるかを確かめる
  {
    const A2 = loadAllstar({ sameContext: true });
    const miss = A2.missingDeps();
    if (miss.length) { console.error('同じ全体に置いた時に見つからない依存:', miss.join(', ')); process.exit(2); }
  }
  // 規則の確認
  const rules = ruleChecks(loadAllstar({ fns: loadGameFns() }));
  const bad = rules.filter(r => !r.ok);
  console.log(`規則の確認：${rules.length - bad.length}/${rules.length} 通った`);
  for (const r of bad) console.log(`  ✗ ${r.name}  ${r.info.slice(0, 400)}`);
  if (bad.length && !args.force) process.exit(1);
  globalThis.__rules = rules;
  const per = Math.ceil(n / workers);
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const from = seedFrom + w * per, count = Math.max(0, Math.min(per, seedFrom + n - from));
    if (!count) continue;
    jobs.push(new Promise((res, rej) => {
      const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { __allstarSim: true, from, count, samples, restoreEvery } });
      wk.once('message', res); wk.once('error', rej);
    }));
  }
  const all = (await Promise.all(jobs)).flat();
  const fns0 = loadGameFns();
  const A0 = loadAllstar({ fns: fns0 });
  const r = summarize(all, { seedFrom, n, workers, samples: samples || A0.config().samples, ms: Date.now() - t0 });
  r.rules = { passed: rules.length - bad.length, total: rules.length, failed: bad.map(b => ({ name: b.name, info: b.info.slice(0, 400) })) };
  fs.mkdirSync(path.join(REPO, 'qa', 'out'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'qa', 'out', 'allstar-sim.json'), JSON.stringify(r, null, 1));
  const ja = printJa(r);
  fs.writeFileSync(path.join(REPO, 'qa', 'out', 'allstar-sim.txt'), ja + '\n');
  console.log(ja);
  if (r.violations.length) process.exit(1);
}
