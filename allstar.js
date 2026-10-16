// =============================================================
// allstar.js — クリア後の6人大会「零時の卓」の中身（進行・規則・AI）。DOM には触らない。
// 設計：docs/design-ref/allstar-plan.md。画面の係はこの名前空間 Allstar の関数だけを呼ぶ。
//
// ブラウザでは game.js の後に読む。evaluateHand・fastHandScore・countStrongOuts・AI_STYLES・aiPickSize・
// opponentPreflopStrength・SUITS・RANK_NAMES は game.js のものをそのまま使う（書き写さない）。
// node の試験では Allstar.configure({ evaluateHand, ... }) で差し込む（qa/allstar-sim.mjs）。
//
// 規則（Poker TDA の通常の大会規則）：SB/BB のみ（アンテなし）／デッドボタン（BB は毎ハンド1人ずつ進み、
// SB は前の BB の席・ボタンは前の SB の席。空席ならデッド）／ヘッズアップはボタン＝SB、プリフロップはボタンから、
// フロップ以降は BB から／最小レイズ＝直前の全額レイズの幅（最低 BB）／短いオールインは既に行動した人の
// 再レイズ権を開かない／誰もコールしなかった分は戻す／サイドポットは投入額の層ごと（降りた人の投入も含む）／
// 端数（25 単位）はボタンの左から近い勝者へ／ブラインドを払えない人は持っている分でオールイン／
// BB が短いオールインでも、ほかの人がコールする額は BB の満額／ブラインドは 5 ハンドごと（手の途中では変えない）／
// 同時脱落は「ハンド開始時の持ち点が多い人が上位、同額は同順位で賞金を均等」。
// 検算：いつでも「全員の残り＋未精算の投入額＝9,000」（Allstar.audit）。
//
// 出来事（event）の列：startHand・applyAction・stepAI は、画面が順に演出できる出来事の配列を返す。
//   {type:'level-up', level, prevLevel, sb, bb, clock, midnight}
//   {type:'button-draw', draws:[{seat, card}], button}            … 第1ハンドの前だけ（6枚を表で配ってハイカード）
//   {type:'hand-start', hand, level, sb, bb, button, sbSeat, bbSeat, deadSB, deadButton, headsUp, alive, stacks}
//   {type:'post-blind', seat, blind:'sb'|'bb', amount, allIn}
//   {type:'deal', order:[seat...], cards:2, mine:{seat, hole}|null}  … 伏せ札は人の席の分だけ載せる
//   {type:'action', seat, kind:'fold'|'check'|'call'|'bet'|'raise', amount, to, allIn, fullRaise, shortAllIn, pot, stack, intent?}
//   {type:'return', seat, amount}                                   … 誰もコールしなかった分を戻した
//   {type:'reveal', reason:'allin', reveals:[{seat, hole}]}         … オールインで賭けが終わった時、残りを配る前に全員表に
//   {type:'street', name:'flop'|'turn'|'river', cards, board, pot}
//   {type:'showdown', reveals:[{seat, hole, name, rank, bestFive}], board}
//   {type:'award', pot:0(メイン)|1..(サイド), amount, winners:[seat], shares:[{seat, amount}], hand:役名|null, bestFive, uncontested, eligible}
//   {type:'hand-end', hand, stacks}
//   {type:'bust', seat, id, place, prize, tie}
//   {type:'heads-up', seats}                                        … 残り2人（決勝）になった
//   {type:'finish', winner, standings}
//   {type:'to-act', seat, human}                                    … 次に判断する席（列の最後に付く）
// =============================================================
const Allstar = (() => {
  'use strict';
  const VERSION = 1;

  // ---- 既定の設定（plan のブラインド表・賞金） ----
  const CONFIG = {
    startStack: 1500,
    handsPerLevel: 5,
    // Lv1〜Lv10。以後 5 ハンドごとに 1.5 倍（100 単位に丸める）
    levels: [[25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [400, 800], [600, 1200], [800, 1600]],
    growth: 1.5,
    prizes: [1800, 900, 500, 300, 100, 0],
    chipUnit: 25,        // 端数を配る単位・AI の賭け額の丸め
    samples: 300,        // AI の勝率の Monte Carlo 回数（1判断）。相手が多い時は少し減らす
  };
  const DEFAULT_SEATS = [
    { id: 'mimi', name: 'ミミ', style: 'mimi_auto', human: true },
    { id: 'rico', name: 'リコ先輩', style: 'rico_serious' },
    { id: 'polka', name: 'ポルカ', style: 'polka' },
    { id: 'selina', name: 'セリナ', style: 'selina' },
    { id: 'grano', name: 'グラーノ', style: 'grano' },
    { id: 'velvet', name: 'ヴェルベット', style: 'velvet' },
  ];

  // ---- 依存（game.js）。ブラウザでは全体から自動で見つけ、node では configure で差し込む ----
  const DEP_NAMES = ['evaluateHand', 'fastHandScore', 'countStrongOuts', 'AI_STYLES', 'aiPickSize', 'opponentPreflopStrength', 'SUITS', 'RANK_NAMES'];
  const REQUIRED_DEPS = ['evaluateHand', 'fastHandScore', 'AI_STYLES', 'opponentPreflopStrength'];
  const deps = {};
  function autoDep(name) {
    // const で宣言された AI_STYLES などは window の属性にならないので、名前ごとに typeof で見る
    try {
      switch (name) {
        case 'evaluateHand': return typeof evaluateHand === 'function' ? evaluateHand : undefined;
        case 'fastHandScore': return typeof fastHandScore === 'function' ? fastHandScore : undefined;
        case 'countStrongOuts': return typeof countStrongOuts === 'function' ? countStrongOuts : undefined;
        case 'AI_STYLES': return typeof AI_STYLES === 'object' && AI_STYLES ? AI_STYLES : undefined;
        case 'aiPickSize': return typeof aiPickSize === 'function' ? aiPickSize : undefined;
        case 'opponentPreflopStrength': return typeof opponentPreflopStrength === 'function' ? opponentPreflopStrength : undefined;
        case 'SUITS': return typeof SUITS !== 'undefined' && Array.isArray(SUITS) ? SUITS : undefined;
        case 'RANK_NAMES': return typeof RANK_NAMES !== 'undefined' && Array.isArray(RANK_NAMES) ? RANK_NAMES : undefined;
      }
    } catch (e) { /* 宣言前（TDZ）など */ }
    return undefined;
  }
  function dep(name) {
    if (deps[name] !== undefined) return deps[name];
    const v = autoDep(name);
    if (v !== undefined) deps[name] = v;
    return v;
  }
  function need(name) {
    const v = dep(name);
    if (v === undefined) throw new Error(`Allstar: game.js の ${name} が見つかりません（Allstar.configure で差し込んでください）`);
    return v;
  }
  // 依存の差し込みと設定の上書き：Allstar.configure({ evaluateHand, fastHandScore, ..., samples: 200 })
  function configure(opts = {}) {
    for (const k of Object.keys(opts)) {
      if (DEP_NAMES.includes(k)) deps[k] = opts[k];
      else if (k in CONFIG) CONFIG[k] = opts[k];
    }
    if (opts.opponentPreflopStrength) PF_SORTED = null;
    return config();
  }
  function config() { return JSON.parse(JSON.stringify(CONFIG)); }
  function missingDeps() { return REQUIRED_DEPS.filter(n => dep(n) === undefined); }

  // ---- 乱数（種つき） ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(a, b) {
    let h = (a ^ 0x9E3779B9) >>> 0;
    h = Math.imul(h ^ ((b + 0x7F4A7C15) >>> 0), 0x85EBCA6B);
    h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16;
    return h >>> 0;
  }
  // 種つきの山札（札の形は game.js の newDeck と同じ {suit, rank, label}）。newDeck は Math.random を使うので、
  // 「再開は同じ札で頭から」のためにここで並べる。
  function makeDeck(rng) {
    const suits = dep('SUITS') || ['♠', '♥', '♦', '♣'];
    const names = dep('RANK_NAMES') || ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const d = [];
    for (const s of suits) for (let r = 2; r <= 14; r++) d.push({ suit: s, rank: r, label: names[r - 2] });
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const x = d[i]; d[i] = d[j]; d[j] = x;
    }
    return d;
  }

  // ---- ブラインドの段階 ----
  function levelIndexForHand(cfg, n) { return Math.floor((Math.max(1, n) - 1) / cfg.handsPerLevel); }
  function blindsAt(cfg, lv) {
    if (lv < cfg.levels.length) return { sb: cfg.levels[lv][0], bb: cfg.levels[lv][1] };
    let [sb] = cfg.levels[cfg.levels.length - 1];
    for (let i = cfg.levels.length; i <= lv; i++) sb = Math.round(sb * cfg.growth / 100) * 100;
    return { sb, bb: sb * 2 };
  }
  function clockOf(lv) {
    const m = 11 * 60 + 10 * lv;
    const hh = Math.floor(m / 60), mm = m % 60;
    return `${hh}:${String(mm).padStart(2, '0')}`;
  }
  // 段階の情報。handNo を省くと「今のハンド（途中なら）／次のハンド」
  function levelInfo(t, handNo) {
    const cfg = t ? t.cfg : CONFIG;
    const n = handNo != null ? handNo : (t ? (t.hand && !t.hand.done ? t.handNo : t.handNo + 1) : 1);
    const lv = levelIndexForHand(cfg, n);
    const { sb, bb } = blindsAt(cfg, lv);
    const nx = blindsAt(cfg, lv + 1);
    const inLevel = (n - 1) % cfg.handsPerLevel + 1;
    return { hand: n, level: lv + 1, sb, bb, clock: clockOf(lv), midnight: lv >= 6, pastMidnight: lv >= 7,
      handInLevel: inLevel, handsLeftAfterThis: cfg.handsPerLevel - inLevel, nextSb: nx.sb, nextBb: nx.bb };
  }
  function levelTable(count = 12, cfg = CONFIG) {
    const out = [];
    for (let lv = 0; lv < count; lv++) {
      const { sb, bb } = blindsAt(cfg, lv);
      out.push({ level: lv + 1, fromHand: lv * cfg.handsPerLevel + 1, toHand: (lv + 1) * cfg.handsPerLevel, sb, bb, clock: clockOf(lv), midnight: lv === 6 });
    }
    return out;
  }

  // ---- 大会の作成 ----
  // opts: { seed, seats:[{id,name,style,human}], startStack, ...CONFIG の上書き }
  function createTournament(opts = {}) {
    const cfg = Object.assign(config(), pickCfg(opts));
    const seats = (opts.seats || DEFAULT_SEATS).map((s, i) => ({
      seat: i, id: s.id, name: s.name || s.id, style: s.style || 'mimi_auto', human: !!s.human,
      stack: opts.startStack || cfg.startStack, place: null, prize: null, bustHand: null,
    }));
    const t = {
      v: VERSION,
      seed: (opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31)) >>> 0,
      cfg, players: seats, handNo: 0, levelIndex: 0, lastPos: null, finished: false,
      totalChips: seats.reduce((a, p) => a + p.stack, 0),
      memory: seats.map(() => ({ bluffShownHand: null })),
      recent: seats.map(() => []),
      lastHand: null,
      hand: null, boundary: null,
    };
    return t;
  }
  function pickCfg(o) {
    const c = {};
    for (const k of Object.keys(CONFIG)) if (o[k] !== undefined) c[k] = o[k];
    return c;
  }

  // ---- 席の小道具 ----
  const NS = (t) => t.players.length;
  function nextSeat(t, from, pred) {
    const n = NS(t);
    for (let k = 1; k <= n; k++) { const s = (from + k) % n; if (pred(s)) return s; }
    return -1;
  }
  function isLive(t, s) { const p = t.players[s]; return p.place == null && p.stack > 0; }
  function liveSeats(t) { return t.players.map(p => p.seat).filter(s => isLive(t, s)); }
  function humanSeat(t) { const p = t.players.find(x => x.human); return p ? p.seat : -1; }
  function potTotal(h) { return h.totalIn.reduce((a, b) => a + b, 0); }
  function inPlay(h, s) { return h.inHand[s] && !h.folded[s]; }
  function canAct(h, s) { return h.inHand[s] && !h.folded[s] && !h.allIn[s]; }

  // デッドボタン：BB は前の BB の次の生きている席。SB は前の BB の席、ボタンは前の SB の席（空ならデッド）。
  // 2人になったら ボタン＝SB、BB はもう1人（同じ人が続けて BB を払わないように前の BB の次から）。
  function nextPositions(t, prev, live) {
    const isL = (s) => live.includes(s);
    const bb = nextSeat(t, prev.bb, isL);
    if (live.length === 2) {
      const btn = live.find(s => s !== bb);
      return { button: btn, sb: btn, bb, deadSB: false, deadButton: false };
    }
    const sb = prev.bb, button = prev.sb;
    return { button, sb, bb, deadSB: !isL(sb), deadButton: !isL(button) };
  }

  // ---- ハンドの開始 ----
  function startHand(t) {
    if (t.finished) throw new Error('Allstar: 大会は終わっています');
    if (t.hand && !t.hand.done) throw new Error('Allstar: ハンドの途中です');
    const cfg = t.cfg;
    t.boundary = snapshot(t);
    const ev = [];
    const n = t.handNo + 1;
    t.handNo = n;
    const lv = levelIndexForHand(cfg, n);
    const { sb, bb } = blindsAt(cfg, lv);
    if (n > 1 && lv !== t.levelIndex) ev.push({ type: 'level-up', level: lv + 1, prevLevel: t.levelIndex + 1, sb, bb, clock: clockOf(lv), midnight: lv === 6 });
    t.levelIndex = lv;
    const seed = hash2(t.seed, n);
    const deck = makeDeck(mulberry32(seed));
    const live = liveSeats(t);
    let pos;
    if (t._forcePos) {
      // 試験用：次のハンドの席を指定する（qa/allstar-sim.mjs の規則の確認だけで使う）
      pos = Object.assign({ deadSB: false, deadButton: false }, t._forcePos);
      delete t._forcePos;
    } else if (!t.lastPos) {
      // 6枚を表で配ってハイカードがボタン（同じ数字はスートの強さ ♠>♥>♦>♣）
      const suits = dep('SUITS') || ['♠', '♥', '♦', '♣'];
      const drawDeck = makeDeck(mulberry32(hash2(t.seed, 0x5EA7)));
      const draws = live.map((s, i) => ({ seat: s, card: drawDeck[i] }));
      let best = draws[0];
      for (const d of draws) {
        if (d.card.rank > best.card.rank || (d.card.rank === best.card.rank && suits.indexOf(d.card.suit) < suits.indexOf(best.card.suit))) best = d;
      }
      ev.push({ type: 'button-draw', draws, button: best.seat });
      const button = best.seat;
      if (live.length === 2) pos = { button, sb: button, bb: live.find(s => s !== button), deadSB: false, deadButton: false };
      else {
        const sbS = nextSeat(t, button, s => live.includes(s));
        pos = { button, sb: sbS, bb: nextSeat(t, sbS, s => live.includes(s)), deadSB: false, deadButton: false };
      }
    } else {
      pos = nextPositions(t, t.lastPos, live);
    }
    const N = NS(t);
    const fill = (v) => new Array(N).fill(v);
    const h = {
      no: n, seed, level: lv, sb, bb,
      button: pos.button, sbSeat: pos.sb, bbSeat: pos.bb, deadSB: pos.deadSB, deadButton: pos.deadButton,
      headsUp: live.length === 2, aliveAtStart: live.length,
      deck, dp: 0, holes: fill(null), board: [], street: 'preflop',
      inHand: t.players.map(p => live.includes(p.seat)), folded: fill(false), allIn: fill(false), shown: fill(false),
      committed: fill(0), totalIn: fill(0),
      currentBet: 0, minRaiseInc: bb, acted: fill(false), matched: fill(0), needs: fill(false),
      raises: 0, limpers: 0, openerBehind: null, streetAggressor: null, lastAggressor: null,
      cursor: pos.bb, toAct: null, done: false, actionCount: 0,
      startStacks: t.players.map(p => p.stack), intents: fill(null), width: fill(1),
      aiRng: mulberry32(hash2(seed, 0xA1)), potCount: 1, bustedCount: 0,
    };
    t.hand = h;
    ev.push({ type: 'hand-start', hand: n, level: lv + 1, sb, bb, button: h.button, sbSeat: h.deadSB ? null : h.sbSeat, bbSeat: h.bbSeat,
      deadSB: h.deadSB, deadButton: h.deadButton, headsUp: h.headsUp, alive: live.length, stacks: t.players.map(p => p.stack) });
    if (!h.deadSB) postBlind(t, h.sbSeat, sb, 'sb', ev);
    postBlind(t, h.bbSeat, bb, 'bb', ev);
    h.currentBet = bb;   // BB が短くても、コールする額は BB の満額
    h.minRaiseInc = bb;
    // 配る：ボタンの左から時計回りに 1 枚ずつ 2 周（ヘッズアップは BB から）
    const order = [];
    for (let k = 1; k <= N; k++) { const s = (h.button + k) % N; if (h.inHand[s]) order.push(s); }
    for (const s of order) h.holes[s] = [];
    for (let r = 0; r < 2; r++) for (const s of order) h.holes[s].push(deck[h.dp++]);
    const hs = humanSeat(t);
    ev.push({ type: 'deal', order, cards: 2, mine: hs >= 0 && h.inHand[hs] ? { seat: hs, hole: h.holes[hs].slice() } : null });
    for (let s = 0; s < N; s++) h.needs[s] = canAct(h, s);
    h.cursor = h.bbSeat;
    advance(t, ev);
    return ev;
  }
  function postBlind(t, seat, amt, kind, ev) {
    const h = t.hand, p = t.players[seat];
    const pay = Math.min(amt, p.stack);
    p.stack -= pay; h.committed[seat] += pay; h.totalIn[seat] += pay;
    if (p.stack === 0) h.allIn[seat] = true;
    ev.push({ type: 'post-blind', seat, blind: kind, amount: pay, allIn: p.stack === 0 });
  }

  // 見えている行動（プリフロップ）から、その人の手の幅（上位何割か）を見積もる。AI が相手の手を配る時に使う。
  // 伏せ札は見ない。h.raises はこの行動の前の上乗せの回数
  const PUSH_BASE = [0, 0.52, 0.36, 0.27, 0.21, 0.17];
  const OPEN_BASE = [0, 0.45, 0.42, 0.26, 0.19, 0.15];
  function noteRange(t, seat, kind) {
    const h = t.hand;
    const bbs = h.startStacks[seat] / h.bb;
    let w;
    if (kind === 'call') {
      if (h.raises === 0) w = seat === h.sbSeat ? 0.7 : 0.5;
      else w = h.raises === 1 ? (h.allIn[h.streetAggressor] ? 0.22 : 0.3) : h.raises === 2 ? 0.09 : 0.04;
    } else {
      if (h.raises === 0) {
        const nB = Math.max(1, Math.min(5, h.openerBehind != null ? h.openerBehind : 3));
        w = h.allIn[seat] && bbs < 10 ? Math.min(1, PUSH_BASE[nB] * (1 + 0.09 * (10 - bbs))) : OPEN_BASE[nB];
      } else w = h.raises === 1 ? (h.allIn[seat] && bbs < 12 ? 0.18 : 0.07) : 0.03;
    }
    h.width[seat] = Math.min(h.width[seat], w);
  }

  // ---- 合法な行動 ----
  function othersWithChips(h, seat) {
    let c = 0;
    for (let s = 0; s < h.inHand.length; s++) if (s !== seat && canAct(h, s)) c++;
    return c;
  }
  function toCallOf(t, seat) {
    const h = t.hand;
    let target = h.currentBet;
    if (othersWithChips(h, seat) === 0) {
      // 残りが全員オールインなら、その中の一番大きい投入額まで（BB の満額の決まりは、受ける人がいる時だけ）
      let mx = 0;
      for (let s = 0; s < h.inHand.length; s++) if (s !== seat && inPlay(h, s)) mx = Math.max(mx, h.committed[s]);
      target = Math.min(target, mx);
    }
    return Math.max(0, Math.min(target - h.committed[seat], t.players[seat].stack));
  }
  // 今の手番の席と、選べる行動。額はすべて「このストリートの合計（to）」で表す。
  function legalActions(t, seat) {
    const h = t.hand;
    if (!h || h.done || h.toAct == null) return null;
    if (seat != null && seat !== h.toAct) return null;
    seat = h.toAct;
    const p = t.players[seat];
    const toCall = toCallOf(t, seat);
    const committed = h.committed[seat];
    const allInTo = committed + p.stack;
    const reopened = !h.acted[seat] || (h.currentBet - h.matched[seat] >= h.minRaiseInc);
    const canRaise = p.stack > toCall && othersWithChips(h, seat) > 0 && reopened && allInTo > h.currentBet;
    const fullMin = h.currentBet === 0 ? h.bb : h.currentBet + h.minRaiseInc;
    return {
      seat, street: h.street, human: !!p.human,
      toCall, canCheck: toCall === 0, canCall: toCall > 0, callIsAllIn: toCall > 0 && toCall >= p.stack, canFold: true,
      canRaise, isBet: h.currentBet === 0,
      minRaiseTo: canRaise ? Math.min(fullMin, allInTo) : 0,
      maxRaiseTo: canRaise ? allInTo : 0,
      reraiseClosed: !reopened && p.stack > toCall,   // 短いオールインのせいで上乗せできない
      currentBet: h.currentBet, committed, stack: p.stack, pot: potTotal(h), bb: h.bb, minRaiseInc: h.minRaiseInc,
    };
  }
  // 画面の「額の選択」2×2 用：小＝最小レイズ／中＝ポットの2/3／大＝ポット／ぜんぶ（すべて to）
  function raisePresets(t) {
    const L = legalActions(t);
    if (!L || !L.canRaise) return null;
    const unit = t.cfg.chipUnit;
    const clamp = (x) => Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, Math.round(x / unit) * unit));
    const potAfterCall = L.pot + L.toCall;
    const base = L.isBet ? 0 : L.currentBet;
    return {
      min: L.minRaiseTo,
      twoThirds: clamp(base + potAfterCall * 2 / 3),
      pot: clamp(base + potAfterCall),
      allin: L.maxRaiseTo,
    };
  }

  // ---- 行動の適用（ミミの入力も AI も同じ関数） ----
  // action: {kind:'fold'|'check'|'call'|'bet'|'raise'|'allin', to?:このストリートの合計, amount?:今出す額, intent?}
  function applyAction(t, action) {
    const L = legalActions(t);
    if (!L) throw new Error('Allstar: 今は行動できません');
    if (action.seat != null && action.seat !== L.seat) throw new Error(`Allstar: 手番は席${L.seat}です`);
    const h = t.hand, seat = L.seat, p = t.players[seat];
    let kind = action.kind;
    let to = action.to != null ? Math.floor(action.to) : (action.amount != null ? h.committed[seat] + Math.floor(action.amount) : null);
    if (kind === 'allin') {
      if (L.canRaise) { kind = 'raise'; to = L.maxRaiseTo; }
      else if (L.toCall > 0 && L.callIsAllIn) kind = 'call';
      else if (L.toCall > 0) throw new Error('Allstar: 短いオールインの後なので上乗せできません（コールか降りる）');
      else throw new Error('Allstar: オールインできません');
    }
    if (kind === 'bet') kind = 'raise';
    if (kind === 'call' && L.toCall === 0) kind = 'check';
    if (kind === 'check' && L.toCall > 0) throw new Error('Allstar: コールする額があるのでチェックできません');
    if (kind === 'raise') {
      if (!L.canRaise) throw new Error('Allstar: 上乗せできません');
      if (to == null || !(to >= L.minRaiseTo && to <= L.maxRaiseTo)) throw new Error(`Allstar: 額は ${L.minRaiseTo}〜${L.maxRaiseTo} です（${to}）`);
    }
    if (!['fold', 'check', 'call', 'raise'].includes(kind)) throw new Error('Allstar: 知らない行動 ' + action.kind);

    const ev = [];
    h.actionCount++;
    h.cursor = seat;
    const before = h.committed[seat];
    let outKind = kind, pay = 0, fullRaise = false, shortAllIn = false;
    if (kind === 'fold') {
      h.folded[seat] = true; h.needs[seat] = false;
    } else if (kind === 'check') {
      h.acted[seat] = true; h.matched[seat] = h.currentBet; h.needs[seat] = false;
    } else if (kind === 'call') {
      pay = L.toCall;
      p.stack -= pay; h.committed[seat] += pay; h.totalIn[seat] += pay;
      if (p.stack === 0) h.allIn[seat] = true;
      h.acted[seat] = true; h.matched[seat] = h.currentBet; h.needs[seat] = false;
      if (h.street === 'preflop' && h.raises === 0) h.limpers++;
      if (h.street === 'preflop') noteRange(t, seat, 'call');
    } else {
      const wasBet = h.currentBet === 0;
      outKind = wasBet ? 'bet' : 'raise';
      pay = to - before;
      const inc = to - h.currentBet;
      fullRaise = inc >= h.minRaiseInc;
      if (h.street === 'preflop' && h.raises === 0) {
        let behind = 0;
        for (let s = 0; s < h.inHand.length; s++) if (s !== seat && canAct(h, s) && h.needs[s]) behind++;
        h.openerBehind = behind;
      }
      p.stack -= pay; h.committed[seat] = to; h.totalIn[seat] += pay;
      if (p.stack === 0) h.allIn[seat] = true;
      if (h.street === 'preflop') noteRange(t, seat, 'raise');
      shortAllIn = !fullRaise && h.allIn[seat];
      if (fullRaise) h.minRaiseInc = inc;
      h.currentBet = to;
      h.raises++;
      h.streetAggressor = seat; h.lastAggressor = seat;
      for (let s = 0; s < h.inHand.length; s++) if (s !== seat && canAct(h, s)) h.needs[s] = true;
      h.acted[seat] = true; h.matched[seat] = to; h.needs[seat] = false;
    }
    if (action.intent) h.intents[seat] = (outKind === 'bet' || outKind === 'raise') ? action.intent : (h.intents[seat] || null);
    const e = { type: 'action', seat, kind: outKind, amount: pay, to: h.committed[seat], allIn: h.allIn[seat] && pay > 0,
      fullRaise, shortAllIn, pot: potTotal(h), stack: p.stack };
    if (action.intent) e.intent = action.intent;
    ev.push(e);
    const rec = t.recent[seat];
    rec.push({ hand: h.no, street: h.street, kind: outKind, to: h.committed[seat], allIn: e.allIn });
    if (rec.length > 3) rec.shift();
    advance(t, ev);
    return ev;
  }

  // ---- 進行（次の手番・ストリート・ショーダウン） ----
  function findNextToAct(t) {
    const h = t.hand, N = NS(t);
    for (let k = 1; k <= N; k++) {
      const s = (h.cursor + k) % N;
      if (!canAct(h, s) || !h.needs[s]) continue;
      if (othersWithChips(h, s) === 0 && toCallOf(t, s) === 0) { h.needs[s] = false; continue; }
      return s;
    }
    return -1;
  }
  function advance(t, ev) {
    const h = t.hand;
    for (let guard = 0; guard < 16; guard++) {
      const alive = [];
      for (let s = 0; s < NS(t); s++) if (inPlay(h, s)) alive.push(s);
      if (alive.length === 1) { winUncontested(t, alive[0], ev); return; }
      const nx = findNextToAct(t);
      if (nx >= 0) { h.toAct = nx; ev.push({ type: 'to-act', seat: nx, human: !!t.players[nx].human }); return; }
      h.toAct = null;
      returnUncalled(t, ev);
      if (h.street === 'river') { showdown(t, ev); return; }
      const bettors = alive.filter(s => !h.allIn[s]).length;
      if (bettors <= 1 && !h.revealed) {
        h.revealed = true;
        for (const s of alive) h.shown[s] = true;
        ev.push({ type: 'reveal', reason: 'allin', reveals: alive.map(s => ({ seat: s, hole: h.holes[s].slice() })) });
      }
      dealStreet(t, ev);
    }
    throw new Error('Allstar: 進行が止まりません');
  }
  function dealStreet(t, ev) {
    const h = t.hand;
    const next = { preflop: 'flop', flop: 'turn', turn: 'river' }[h.street];
    h.dp++; // 捨て札
    const cnt = next === 'flop' ? 3 : 1;
    const cards = h.deck.slice(h.dp, h.dp + cnt);
    h.dp += cnt;
    h.board.push(...cards);
    h.street = next;
    for (let s = 0; s < NS(t); s++) {
      h.committed[s] = 0; h.acted[s] = false; h.matched[s] = 0; h.needs[s] = canAct(h, s);
    }
    h.currentBet = 0; h.minRaiseInc = h.bb; h.raises = 0; h.streetAggressor = null;
    h.cursor = h.button;
    ev.push({ type: 'street', name: next, cards: cards.slice(), board: h.board.slice(), pot: potTotal(h) });
  }
  // 誰もコールしなかった分を戻す（一番多く入れた人の、2番目との差）
  function returnUncalled(t, ev) {
    const h = t.hand;
    let top = -1, topAmt = -1;
    for (let s = 0; s < NS(t); s++) if (inPlay(h, s) && h.totalIn[s] > topAmt) { top = s; topAmt = h.totalIn[s]; }
    if (top < 0) return;
    let second = 0;
    for (let s = 0; s < NS(t); s++) if (s !== top && h.inHand[s]) second = Math.max(second, h.totalIn[s]);
    const x = topAmt - second;
    if (x > 0) {
      h.totalIn[top] -= x;
      h.committed[top] = Math.max(0, h.committed[top] - x);
      t.players[top].stack += x;
      if (t.players[top].stack > 0) h.allIn[top] = false;
      ev.push({ type: 'return', seat: top, amount: x });
    }
  }
  // 投入額の層ごとのポット（降りた人の投入も含む）。[{amount, eligible:[seat]}]、0 がメイン
  function computePots(h) {
    const contrib = h.totalIn.slice();
    const pots = [];
    for (let guard = 0; guard < 16; guard++) {
      const live = [];
      for (let s = 0; s < contrib.length; s++) if (inPlay(h, s) && contrib[s] > 0) live.push(s);
      if (!live.length) {
        const rest = contrib.reduce((a, b) => a + b, 0);
        if (rest > 0 && pots.length) pots[pots.length - 1].amount += rest;
        break;
      }
      const level = Math.min(...live.map(s => contrib[s]));
      let amount = 0;
      for (let s = 0; s < contrib.length; s++) { const c = Math.min(contrib[s], level); amount += c; contrib[s] -= c; }
      const last = pots[pots.length - 1];
      if (last && last.eligible.length === live.length && last.eligible.every((s, i) => s === live[i])) last.amount += amount;
      else pots.push({ amount, eligible: live });
    }
    return pots;
  }
  // 端数はボタンの左から近い勝者へ（chipUnit 単位で割り切れる時はその単位で）
  function splitPot(t, amount, winners) {
    const h = t.hand, N = NS(t);
    const ord = winners.slice().sort((a, b) => ((a - h.button - 1 + N) % N) - ((b - h.button - 1 + N) % N));
    const unit = amount % t.cfg.chipUnit === 0 ? t.cfg.chipUnit : 1;
    const units = Math.round(amount / unit);
    const base = Math.floor(units / ord.length), rem = units % ord.length;
    return ord.map((s, i) => ({ seat: s, amount: (base + (i < rem ? 1 : 0)) * unit }));
  }
  function winUncontested(t, seat, ev) {
    const h = t.hand;
    h.toAct = null;
    returnUncalled(t, ev);
    const amount = potTotal(h);
    t.players[seat].stack += amount;
    for (let s = 0; s < NS(t); s++) h.totalIn[s] = 0;
    ev.push({ type: 'award', pot: 0, amount, winners: [seat], shares: [{ seat, amount }], hand: null, bestFive: null, uncontested: true, eligible: [seat] });
    h.potCount = 1;
    endHand(t, ev);
  }
  function showdown(t, ev) {
    const h = t.hand, N = NS(t);
    const evaluate = need('evaluateHand');
    const alive = [];
    // 公開の順：リバーで最後に賭けた人から。賭けが無ければボタンの左から
    const start = h.street === 'river' && h.streetAggressor != null && inPlay(h, h.streetAggressor)
      ? h.streetAggressor : nextSeat(t, h.button, s => inPlay(h, s));
    for (let k = 0; k < N; k++) { const s = (start + k) % N; if (inPlay(h, s)) alive.push(s); }
    const res = {};
    const reveals = alive.map(s => {
      const r = evaluate(h.holes[s].concat(h.board));
      res[s] = r;
      h.shown[s] = true;
      return { seat: s, hole: h.holes[s].slice(), name: r.name, rank: r.rank, bestFive: r.bestFive ? r.bestFive.slice() : null };
    });
    ev.push({ type: 'showdown', reveals, board: h.board.slice() });
    const pots = computePots(h);
    h.potCount = pots.length;
    // サイドポットから先に配る（最後のサイド → … → メイン）
    for (let i = pots.length - 1; i >= 0; i--) {
      const pot = pots[i];
      let best = -Infinity;
      for (const s of pot.eligible) best = Math.max(best, res[s].score);
      const winners = pot.eligible.filter(s => res[s].score === best);
      const shares = splitPot(t, pot.amount, winners);
      for (const sh of shares) t.players[sh.seat].stack += sh.amount;
      const w0 = res[winners[0]];
      ev.push({ type: 'award', pot: i, amount: pot.amount, winners, shares, hand: w0.name, bestFive: w0.bestFive ? w0.bestFive.slice() : null,
        uncontested: pot.eligible.length === 1, eligible: pot.eligible.slice() });
    }
    for (let s = 0; s < N; s++) h.totalIn[s] = 0;
    // 見せたブラフを覚える（ヴェルベットが次の罠に使う）
    for (const s of alive) if (h.intents[s] === 'bluff') t.memory[s].bluffShownHand = h.no;
    endHand(t, ev);
  }

  // ---- ハンドの終わり：脱落と順位 ----
  function prizeFor(cfg, place, size) {
    let sum = 0;
    for (let k = 0; k < size; k++) sum += cfg.prizes[place - 1 + k] || 0;
    return Math.floor(sum / size);
  }
  function endHand(t, ev) {
    const h = t.hand, N = NS(t);
    h.done = true; h.toAct = null; h.street = 'done';
    for (let s = 0; s < N; s++) { h.committed[s] = 0; h.totalIn[s] = 0; }
    ev.push({ type: 'hand-end', hand: h.no, stacks: t.players.map(p => p.stack) });
    const busted = [];
    for (let s = 0; s < N; s++) if (h.inHand[s] && t.players[s].stack === 0) busted.push(s);
    // ハンド開始時の持ち点が多い人が上位、同額は同順位
    busted.sort((a, b) => h.startStacks[b] - h.startStacks[a]);
    const basePlace = h.aliveAtStart - busted.length + 1;
    let i = 0;
    const bustEv = [];
    while (i < busted.length) {
      let j = i;
      while (j + 1 < busted.length && h.startStacks[busted[j + 1]] === h.startStacks[busted[i]]) j++;
      const place = basePlace + i, size = j - i + 1;
      const prize = prizeFor(t.cfg, place, size);
      for (let k = i; k <= j; k++) {
        const p = t.players[busted[k]];
        p.place = place; p.prize = prize; p.bustHand = h.no;
        bustEv.push({ type: 'bust', seat: p.seat, id: p.id, place, prize, tie: size > 1 });
      }
      i = j + 1;
    }
    // 下の順位から演出できるように、悪い順に並べる
    bustEv.sort((a, b) => b.place - a.place);
    ev.push(...bustEv);
    h.bustedCount = busted.length;
    t.lastPos = { button: h.button, sb: h.sbSeat, bb: h.bbSeat };
    const live = liveSeats(t);
    t.lastHand = { no: h.no, pots: h.potCount, busted: busted.length, board: h.board.slice() };
    if (live.length <= 1) {
      const w = t.players[live[0]];
      w.place = 1; w.prize = prizeFor(t.cfg, 1, 1);
      t.finished = true;
      ev.push({ type: 'finish', winner: w.seat, standings: standings(t) });
    } else if (live.length === 2 && h.aliveAtStart > 2) {
      ev.push({ type: 'heads-up', seats: live });
    }
  }

  // ---- 順位表 ----
  // place：確定した順位（脱落・優勝）。rank：今の順位（生きている人は持ち点順、脱落は place）
  function standings(t) {
    const live = liveSeats(t);
    const rows = t.players.map(p => {
      let rank = p.place;
      if (rank == null) rank = 1 + live.filter(s => t.players[s].stack + (t.hand && !t.hand.done ? t.hand.totalIn[s] : 0)
        > p.stack + (t.hand && !t.hand.done ? t.hand.totalIn[p.seat] : 0)).length;
      return { seat: p.seat, id: p.id, name: p.name, stack: p.stack, place: p.place, rank, prize: p.prize, bustHand: p.bustHand, alive: p.place == null || p.place === 1 && t.finished };
    });
    return rows.sort((a, b) => (a.rank - b.rank) || (b.stack - a.stack) || (a.seat - b.seat));
  }

  // ---- 検算 ----
  function audit(t) {
    const h = t.hand;
    const stacks = t.players.reduce((a, p) => a + p.stack, 0);
    const pending = h ? h.totalIn.reduce((a, b) => a + b, 0) : 0;
    const total = stacks + pending;
    const problems = [];
    t.players.forEach(p => { if (p.stack < 0 || !Number.isFinite(p.stack) || p.stack !== Math.floor(p.stack)) problems.push(`席${p.seat}の持ち点 ${p.stack}`); });
    if (h) for (let s = 0; s < NS(t); s++) {
      if (h.committed[s] < 0 || h.totalIn[s] < 0) problems.push(`席${s}の投入が負`);
      if (h.committed[s] > h.totalIn[s]) problems.push(`席${s}のこのストリートの投入がハンドの投入を超える`);
    }
    const ok = total === t.totalChips && !problems.length;
    return { ok, total, expected: t.totalChips, detail: ok ? null : { stacks: t.players.map(p => p.stack), totalIn: h ? h.totalIn.slice() : null, problems } };
  }

  // ---- 保存と復元（ハンド境界） ----
  function snapshot(t) {
    return JSON.parse(JSON.stringify({
      v: t.v, seed: t.seed, cfg: t.cfg, players: t.players, handNo: t.handNo, levelIndex: t.levelIndex,
      lastPos: t.lastPos, finished: t.finished, totalChips: t.totalChips, memory: t.memory, recent: t.recent, lastHand: t.lastHand,
    }));
  }
  // ハンドの途中なら、そのハンドが始まる前の状態を返す（再開は同じ札で頭から）
  function serialize(t) {
    if (t.hand && !t.hand.done) return JSON.parse(JSON.stringify(t.boundary));
    return snapshot(t);
  }
  function restore(data) {
    if (!data || data.v !== VERSION) throw new Error('Allstar: 保存データの版が違います');
    const t = JSON.parse(JSON.stringify(data));
    t.hand = null; t.boundary = null;
    const a = audit(t);
    if (!a.ok) throw new Error(`Allstar: 保存データのチップが合いません（${a.total}／${a.expected}）`);
    return t;
  }

  // ---- 画面向けの見え方 ----
  function positionLabels(t) {
    const h = t.hand;
    if (!h) return {};
    const N = NS(t), out = {};
    if (h.headsUp) { out[h.button] = 'SB'; out[h.bbSeat] = 'BB'; return out; }
    if (!h.deadButton) out[h.button] = 'BTN';
    if (!h.deadSB) out[h.sbSeat] = 'SB';
    out[h.bbSeat] = 'BB';
    const mid = [];
    for (let k = 1; k <= N; k++) { const s = (h.bbSeat + k) % N; if (h.inHand[s] && out[s] == null) mid.push(s); }
    const names = ['UTG', 'HJ', 'CO'];
    for (let i = 0; i < mid.length; i++) out[mid[i]] = names[names.length - mid.length + i] || 'UTG';
    return out;
  }
  // viewer の席から見える情報だけ（伏せ札は自分と公開済みだけ）
  function view(t, viewer) {
    if (viewer == null) viewer = humanSeat(t);
    const h = t.hand;
    const pos = positionLabels(t);
    const live = h && !h.done;
    const st = standings(t);
    return {
      handNo: t.handNo, level: levelInfo(t), finished: t.finished, alive: liveSeats(t).length,
      street: live ? h.street : null, board: h ? h.board.slice() : [], pot: live ? potTotal(h) : 0,
      pots: live ? computePots(h).map(p => ({ amount: p.amount, eligible: p.eligible.slice() })) : [],
      toAct: live ? h.toAct : null, legal: live && h.toAct === viewer ? legalActions(t) : null,
      players: t.players.map(p => ({
        seat: p.seat, id: p.id, name: p.name, stack: p.stack, stackBB: h ? +(p.stack / h.bb).toFixed(1) : null,
        place: p.place, rank: (st.find(r => r.seat === p.seat) || {}).rank, prize: p.prize,
        inHand: !!(h && h.inHand[p.seat]), folded: !!(h && h.folded[p.seat]), allIn: !!(h && h.allIn[p.seat]),
        committed: live ? h.committed[p.seat] : 0, position: pos[p.seat] || null,
        isButton: !!(h && h.button === p.seat), isSB: !!(h && !h.deadSB && h.sbSeat === p.seat), isBB: !!(h && h.bbSeat === p.seat),
        hole: h && h.holes[p.seat] && (p.seat === viewer || h.shown[p.seat]) ? h.holes[p.seat].slice() : null,
        recent: t.recent[p.seat].slice(),
      })),
    };
  }

  // =============================================================
  // AI（6人卓用）。勝率は相手の人数ぶんで数える。ほかの人の伏せ札は見ない。
  // =============================================================
  // ミミの席を自動で打つ時（自動対戦・ミミ脱落後の早送り）の素直な打ち手
  const EXTRA_STYLES = {
    mimi_auto: { loose: 0.95, respect: 0.1, valueEq: 0.64, valueFreq: 0.75, bluffFreq: 0.18, raiseEq: 0.84, trap: 0.1, sizing: 'mixed', shoveCall: 0.47 },
  };
  function styleOf(name) {
    const S = dep('AI_STYLES') || {};
    return S[name] || EXTRA_STYLES[name] || S.selina || EXTRA_STYLES.mimi_auto;
  }
  // plan「足す」の節：位置・人数・持ち点差での判断。open[n] は後ろに n 人残る時に参加する手の上位割合
  const TRAITS = {
    mimi_auto: { open: [0, 0.45, 0.42, 0.26, 0.19, 0.15], threeBet: 1.0, multi: 0.03 },
    // リコ＝堅実。後ろの人数で参加手を大きく変える（前の席はきつく、ボタンは広く）
    rico_serious: { open: [0, 0.46, 0.46, 0.25, 0.16, 0.12], threeBet: 1.0, multi: 0.03 },
    // ポルカ＝後ろの席からブラインドを奪う。人数が多い（参加者が多い）と止まる
    polka: { open: [0, 0.64, 0.60, 0.32, 0.19, 0.15], threeBet: 1.3, multi: 0.0, crowd: true, pushK: 1.1 },
    // セリナ＝多人数では慎重。強い手は取り逃さない（多人数では罠にせず、強いほど大きく賭ける）
    selina: { open: [0, 0.40, 0.36, 0.22, 0.15, 0.12], threeBet: 0.8, multi: 0.06, strongNoTrap: true },
    // グラーノ＝4位の境目（残り5人）で生存価値を計算。短い相手に圧
    grano: { open: [0, 0.45, 0.40, 0.25, 0.18, 0.14], threeBet: 0.9, multi: 0.03, bubble: 0.1, shortPressure: true },
    // ヴェルベット＝大きな持ち点で中位を苦しめる。見せたブラフを次の罠に
    velvet: { open: [0, 0.50, 0.48, 0.28, 0.19, 0.15], threeBet: 1.2, multi: 0.02, bully: 0.35, image: true, pushK: 1.05 },
  };
  function traitOf(name) { return TRAITS[name] || TRAITS.mimi_auto; }

  // プリフロップ：opponentPreflopStrength（Chen 式 0.15〜0.90）を相手の人数で補正した勝率。
  // 係数は fastHandScore の Monte Carlo（169 種 × 3,000 回）に直線で合わせた値（平均の誤差 0.02〜0.05）
  const PF_FIT = [null, [0.265, 0.723], [0.101, 0.712], [0.044, 0.629], [0.019, 0.555], [0.006, 0.492]];
  function eqPF(s, n) {
    const k = PF_FIT[Math.max(1, Math.min(5, n))];
    return Math.max(0.02, Math.min(0.95, k[0] + k[1] * s));
  }
  let PF_SORTED = null;
  // その強さ以上の手が全体（1,326 通り）の何割か（AA ≒ 0.005、中央 ≒ 0.5）
  function topPct(s) {
    if (!PF_SORTED) {
      const pfs = need('opponentPreflopStrength');
      const arr = [];
      for (let a = 14; a >= 2; a--) for (let b = a; b >= 2; b--) {
        if (a === b) { const v = pfs([{ rank: a, suit: '♠' }, { rank: b, suit: '♥' }]); for (let i = 0; i < 6; i++) arr.push(v); }
        else {
          const su = pfs([{ rank: a, suit: '♠' }, { rank: b, suit: '♠' }]); for (let i = 0; i < 4; i++) arr.push(su);
          const of = pfs([{ rank: a, suit: '♠' }, { rank: b, suit: '♥' }]); for (let i = 0; i < 12; i++) arr.push(of);
        }
      }
      PF_SORTED = arr.sort((x, y) => y - x);
    }
    let lo = 0, hi = PF_SORTED.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (PF_SORTED[m] >= s - 1e-12) lo = m + 1; else hi = m; }
    return lo / PF_SORTED.length;
  }

  // フロップ以降：相手 nOpp 人の手をランダムに配って数える（相手の伏せ札は見ない）
  // widths：相手の人数（全員ランダム）か、相手ごとの手の幅の配列（noteRange の見積もり。1＝ランダム）
  let TOP_CACHE = null;
  function topOfPair(a, b) {
    if (!TOP_CACHE) TOP_CACHE = new Array(450).fill(-1);
    const hi = a.rank > b.rank ? a.rank : b.rank, lo = a.rank > b.rank ? b.rank : a.rank;
    const key = (a.suit === b.suit ? 225 : 0) + hi * 15 + lo;
    let v = TOP_CACHE[key];
    if (v < 0) { v = topPct(need('opponentPreflopStrength')([a, b])); TOP_CACHE[key] = v; }
    return v;
  }
  function equityMulti(hole, board, widths, samples, rng) {
    const ws = typeof widths === 'number' ? new Array(widths).fill(1) : widths;
    const nOpp = ws.length;
    const fhs = dep('fastHandScore') || ((cards) => need('evaluateHand')(cards).score);
    const suits = dep('SUITS') || ['♠', '♥', '♦', '♣'];
    const used = new Set(hole.concat(board).map(c => c.rank + c.suit));
    const deck = [];
    for (const s of suits) for (let r = 2; r <= 14; r++) if (!used.has(r + s)) deck.push({ rank: r, suit: s });
    const needB = 5 - board.length, take = 2 * nOpp + needB, len = deck.length;
    const swap = (i, j) => { const x = deck[i]; deck[i] = deck[j]; deck[j] = x; };
    let win = 0;
    for (let i = 0; i < samples; i++) {
      let pos = 0;
      for (let o = 0; o < nOpp; o++) {
        const w = Math.max(0.08, ws[o]);   // 幅が狭すぎると配り直しが増えるので下限を置く
        let a, b, tries = 0;
        for (;;) {
          a = pos + Math.floor(rng() * (len - pos));
          b = pos + Math.floor(rng() * (len - pos - 1)); if (b >= a) b++;
          if (w >= 0.999 || tries++ >= 30 || topOfPair(deck[a], deck[b]) <= w) break;
        }
        swap(pos, a); if (b === pos) b = a; swap(pos + 1, b);
        pos += 2;
      }
      for (let j = 0; j < needB; j++) { swap(pos, pos + Math.floor(rng() * (len - pos))); pos++; }
      const full = needB ? board.concat(deck.slice(2 * nOpp, take)) : board;
      const me = fhs(hole.concat(full));
      let ties = 0, lose = false;
      for (let o = 0; o < nOpp; o++) {
        const sc = fhs([deck[2 * o], deck[2 * o + 1]].concat(full));
        if (sc > me) { lose = true; break; }
        if (sc === me) ties++;
      }
      if (!lose) win += 1 / (ties + 1);
    }
    return win / samples;
  }
  // 多人数の勝率を「1対1に直した強さ」に（AI_STYLES の閾値は1対1の勝率で決めてあるため）
  function relOf(eqN, nOpp) { return nOpp <= 1 ? eqN : Math.pow(Math.max(1e-6, eqN), 1 / Math.pow(nOpp, 0.8)); }
  const SIZE_FRAC = { pot_1_3: 1 / 3, pot_1_2: 1 / 2, pot_2_3: 2 / 3, pot_1: 1 };
  const OPEN_BB = { pot_1_3: 2.2, pot_1_2: 2.5, pot_2_3: 2.8, pot_1: 3.2 };
  const THREE_BET_X = { pot_1_3: 2.7, pot_1_2: 3.0, pot_2_3: 3.3, pot_1: 3.8 };
  function pickSize(st, kind, eq, rng) {
    const f = dep('aiPickSize');
    if (f) return f(st, kind, eq);
    const r = rng();
    return r < 0.34 ? 'pot_1_2' : r < 0.67 ? 'pot_2_3' : 'pot_1';
  }

  // 席 seat（省略時は今の手番）の行動を決める。戻り値は applyAction にそのまま渡せる
  function decideAction(t, seat) {
    const h = t.hand;
    const L = legalActions(t, seat);
    if (!L) return null;
    seat = L.seat;
    const p = t.players[seat];
    const c = {
      t, h, L, seat, p, st: styleOf(p.style), tr: traitOf(p.style), rng: h.aiRng, hole: h.holes[seat], bb: h.bb,
      others: [], behind: 0, bubble: h.aliveAtStart === 5, avg: t.totalChips / h.aliveAtStart,
    };
    for (let s = 0; s < NS(t); s++) if (s !== seat && inPlay(h, s)) c.others.push(s);
    for (let s = 0; s < NS(t); s++) if (s !== seat && canAct(h, s) && h.needs[s]) c.behind++;
    c.nOpp = c.others.length;
    c.startBB = h.startStacks[seat] / h.bb;
    c.chipLeader = h.startStacks[seat] >= Math.max(...t.players.filter(q => q.seat !== seat).map(q => h.startStacks[q.seat]));
    c.big = h.startStacks[seat] >= 1.3 * c.avg;
    const mem = t.memory[seat];
    c.imageTrap = !!(c.tr.image && mem.bluffShownHand != null && h.no - mem.bluffShownHand <= 4);
    const raw = h.street === 'preflop' ? aiPreflop(c) : aiPostflop(c);
    return normalizeAI(c, raw);
  }
  function normalizeAI(c, a) {
    const { L, t } = c;
    const unit = t.cfg.chipUnit;
    if (a.kind === 'fold' && L.canCheck) return { kind: 'check', intent: 'check' };
    if (a.kind === 'allin') {
      if (L.canRaise) return { kind: 'raise', to: L.maxRaiseTo, intent: a.intent || 'shove' };
      return L.toCall > 0 ? { kind: 'call', intent: a.intent || 'call' } : { kind: 'check', intent: 'check' };
    }
    if (a.kind === 'raise') {
      if (!L.canRaise) return L.toCall > 0 ? { kind: 'call', intent: 'call' } : { kind: 'check', intent: 'check' };
      let to = Math.round(a.to / unit) * unit;
      to = Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, to));
      // 残りがポットの 1/4 未満しか残らないなら全部
      const potAfter = L.pot + (to - L.committed);
      if (L.maxRaiseTo - to < 0.25 * potAfter) to = L.maxRaiseTo;
      return { kind: 'raise', to, intent: a.intent || 'value' };
    }
    if (a.kind === 'call') {
      if (L.toCall === 0) return { kind: 'check', intent: 'check' };
      // コールすると残りがわずか（ポットの 3 割未満）で、強いなら全部
      if (a.commitOk && L.canRaise && (L.stack - L.toCall) < 0.3 * (L.pot + L.toCall)) return { kind: 'raise', to: L.maxRaiseTo, intent: 'shove' };
      return { kind: 'call', intent: a.intent || 'call' };
    }
    return { kind: a.kind, intent: a.intent || a.kind };
  }

  function aggPenalty(c) {
    // 賭けてきた人の手は「ランダム」より強い。その分を勝率から引く
    const { h, st, t, bb } = c;
    const agg = h.streetAggressor;
    if (agg == null) return 0;
    let pen = h.raises <= 1 ? 0.06 + 0.015 * (h.openerBehind != null ? h.openerBehind : 3) : h.raises === 2 ? 0.17 : 0.22;
    const aggBB = h.startStacks[agg] / bb;
    if (h.allIn[agg] && aggBB < 12) pen *= 0.35 + 0.65 * aggBB / 12;   // 短い人のオールインは広い
    pen *= 0.6 + 2.5 * st.respect;
    const m = t.memory[agg];
    if (m && m.bluffShownHand != null && h.no - m.bluffShownHand <= 4) pen *= 0.7;  // ブラフを見せた相手は軽く見る
    return pen;
  }

  function aiPreflop(c) {
    const { h, L, st, tr, rng, hole, bb, t, seat } = c;
    const pfs = need('opponentPreflopStrength');
    const s = pfs(hole), top = topPct(s);
    const pot = L.pot, callAmt = L.toCall;
    const r = rng();
    const behind = c.behind;
    const openSize = (kind) => {
      const lbl = c.imageTrap && kind === 'value' ? 'pot_1' : pickSize(st, kind, eqPF(s, 1), rng);
      return { kind: 'raise', to: (OPEN_BB[lbl] || 2.5) * bb + h.limpers * bb, intent: kind === 'bluff' ? 'steal' : 'value' };
    };
    const threeBet = (kind) => {
      const lbl = pickSize(st, kind, eqPF(s, 1), rng);
      const callers = Math.max(0, c.nOpp - 1);
      return { kind: 'raise', to: h.currentBet * (THREE_BET_X[lbl] || 3) + callers * h.currentBet, intent: kind };
    };

    // AA・KK（上位 1.2%）はプリフロップで降りない
    if (top <= 0.012 && h.raises >= 1) return { kind: 'allin', intent: 'value' };
    // --- 持ち点が少ない（10BB 未満）：押すか降りるか ---
    if (c.startBB < 10) {
      if (h.raises === 0) {
        const nB = Math.max(1, Math.min(5, behind + h.limpers));
        const base = [0, 0.52, 0.36, 0.27, 0.21, 0.17][nB];
        let range = base * (1 + 0.09 * (10 - c.startBB)) * (tr.pushK || 1);
        if (c.startBB <= 2) range = Math.max(range, 0.7);
        if (c.bubble && !c.chipLeader) range *= 1 - (tr.bubble || 0.02);
        if (top <= Math.min(1, range)) return { kind: 'allin', intent: top <= 0.1 ? 'value' : 'shove' };
        return L.canCheck ? { kind: 'check' } : { kind: 'fold' };
      }
      const e = eqPF(s, c.nOpp) - aggPenalty(c) * 2 / (c.nOpp + 1);
      const risk = Math.min(L.stack, callAmt + 0);
      const odds = risk / (pot + risk);
      let tax = 0.02 * behind + (c.bubble && !c.chipLeader ? (tr.bubble || 0.02) : 0);
      if (tr.shortPressure && h.startStacks[h.streetAggressor] / bb < 10) tax -= 0.04;
      if (e >= odds * Math.max(0.85, st.loose) + tax) return { kind: 'allin', intent: 'call' };
      return { kind: 'fold' };
    }

    // --- 誰も上乗せしていない ---
    if (h.raises === 0) {
      if (L.canCheck) { // BB（参加者がコールで来ただけ）
        if (top <= 0.09 && r < 0.85) return openSize('value');
        return { kind: 'check' };
      }
      const nB = Math.max(1, Math.min(5, behind));
      let range = tr.open[nB];
      if (tr.bully && c.big) {
        // 後ろの人が全員自分より少ない時、大きな持ち点で圧
        let allSmaller = true;
        for (let q = 0; q < NS(t); q++) if (q !== seat && canAct(h, q) && h.needs[q] && h.startStacks[q] >= h.startStacks[seat]) allSmaller = false;
        if (allSmaller) range *= 1 + tr.bully;
      }
      if (tr.shortPressure) {
        // 後ろのブラインドが短い（12BB 未満）なら奪いに行く
        for (const q of [h.sbSeat, h.bbSeat]) if (q !== seat && h.inHand[q] && !h.folded[q] && h.needs[q] && h.startStacks[q] / bb < 12) { range *= 1.25; break; }
      }
      if (c.bubble && !c.chipLeader && c.startBB < 20) range *= 1 - 3 * (tr.bubble || 0.02);
      if (h.limpers > 0) {
        if (tr.crowd && h.limpers >= 2) range *= 0.6;            // ポルカ：人数が多いと止まる
        if (top <= range * 0.6) return openSize('value');
        if (top <= range * 1.1 && callAmt <= bb) return { kind: 'call', intent: 'call' };
        return { kind: 'fold' };
      }
      if (top <= range) return openSize(top <= range * 0.35 ? 'value' : 'bluff');
      // SB は BB と2人の時、ほどほどの手でそろえる
      if (seat === h.sbSeat && nB === 1 && top <= range * 1.5 && r < 0.5) return { kind: 'call', intent: 'call' };
      return { kind: 'fold' };
    }

    // --- 上乗せに向き合う ---
    const e = eqPF(s, c.nOpp) - aggPenalty(c) * 2 / (c.nOpp + 1);
    const odds = callAmt / (pot + callAmt);
    let tax = 0.03 + 0.02 * behind + tr.multi * Math.max(0, c.nOpp - 1);
    const risky = callAmt >= 0.35 * L.stack;
    if (c.bubble && risky && !c.chipLeader) tax += tr.bubble || 0.02;
    const agg = h.streetAggressor;
    if (tr.shortPressure && agg != null && h.startStacks[agg] / bb < 12) tax -= 0.05;
    if (tr.crowd && c.nOpp >= 3) tax += 0.04;
    const allInFacing = agg != null && h.allIn[agg];
    if (h.raises === 1) {
      let tb = (h.openerBehind != null && h.openerBehind <= 2 ? 0.075 : 0.04) * (tr.threeBet || 1);
      if (tr.bully && c.big) tb *= 1.3;
      if (L.canRaise && top <= tb && !allInFacing) return threeBet('value');
      if (L.canRaise && !allInFacing && c.nOpp === 1 && top > 0.15 && top < 0.45 && r < st.bluffFreq * 0.12) return threeBet('bluff');
      if (e >= odds * Math.max(0.85, st.loose) + tax && top <= (allInFacing ? 0.6 : 0.5)) return { kind: 'call', intent: 'call', commitOk: top <= 0.15 };
      return { kind: 'fold' };
    }
    // 3ベット以上
    if (top <= 0.025 && L.canRaise) return { kind: 'allin', intent: 'value' };
    if (e >= odds * Math.max(0.85, st.loose) + tax && top <= (allInFacing ? 0.2 : 0.1)) return { kind: 'call', intent: 'call', commitOk: top <= 0.05 };
    return { kind: 'fold' };
  }

  function aiPostflop(c) {
    const { h, L, st, tr, rng, hole, t } = c;
    const nOpp = Math.max(1, c.nOpp);
    const samples = Math.max(60, Math.round(t.cfg.samples * (nOpp >= 3 ? 0.8 : 1)));
    const eqN = equityMulti(hole, h.board, c.others.length ? c.others.map(q => h.width[q]) : 1, samples, rng);
    const rel = relOf(eqN, nOpp);
    const cso = dep('countStrongOuts');
    const draw = cso ? cso(hole, h.board) : 0;
    const street = h.street;
    const r = rng();
    let bluffFreq = st.bluffFreq, valueEq = st.valueEq, valueFreq = st.valueFreq, respect = st.respect, trap = st.trap || 0;
    if (nOpp >= 2) bluffFreq *= 0.4;
    if (tr.crowd && nOpp >= 2) { bluffFreq *= nOpp >= 3 ? 0.4 : 0.8; valueEq += 0.03; }
    if (tr.strongNoTrap && nOpp >= 2) { bluffFreq *= 0.5; trap = 0; if (rel >= 0.8) valueFreq = 0.97; }
    if (c.imageTrap) { bluffFreq *= 0.3; valueEq -= 0.05; valueFreq = Math.min(0.97, valueFreq + 0.1); }
    let shortOpp = false, allSmaller = true;
    for (const q of c.others) {
      if ((t.players[q].stack + h.committed[q]) / h.bb < 10) shortOpp = true;
      if (h.startStacks[q] >= h.startStacks[c.seat]) allSmaller = false;
    }
    if (tr.bully && c.big && allSmaller) { bluffFreq *= 1.4; respect *= 0.7; }
    if (tr.shortPressure && shortOpp) valueEq -= 0.04;
    const ip = c.behind === 0;
    const pot = L.pot;
    const sizeTo = (kind) => {
      const lbl = c.imageTrap && kind === 'value' ? 'pot_1' : pickSize(st, kind, rel, rng);
      const frac = SIZE_FRAC[lbl] || 0.5;
      if (L.isBet) return { kind: 'raise', to: Math.max(h.bb, pot * frac), intent: kind === 'semi' ? 'draw' : kind };
      return { kind: 'raise', to: L.currentBet + (pot + L.toCall) * frac, intent: kind === 'semi' ? 'draw' : kind };
    };

    if (L.toCall > 0) {
      const callAmt = L.toCall;
      const odds = callAmt / (pot + callAmt);
      const sizeRatio = Math.min(1.5, callAmt / Math.max(h.bb, pot - callAmt));
      const fair = 1 / (nOpp + 1);
      const agg = h.streetAggressor;
      let resp = respect * (1 + 0.15 * Math.max(0, h.raises - 1));
      const am = agg != null ? t.memory[agg] : null;
      if (am && am.bluffShownHand != null && h.no - am.bluffShownHand <= 4) resp *= 0.5;
      const eqAdj = eqN - resp * sizeRatio * 2 * fair;
      const relAdj = rel - resp * sizeRatio;
      let tax = 0.02 * c.behind + tr.multi * (nOpp - 1);
      if (c.bubble && callAmt >= 0.4 * L.stack && !c.chipLeader) tax += tr.bubble || 0.02;
      if (tr.shortPressure && agg != null && (t.players[agg].stack + h.committed[agg]) / h.bb < 10) tax -= 0.05;
      const drawBonus = draw >= 8 && street !== 'river' ? 0.04 : 0;
      if (L.canRaise && relAdj >= st.raiseEq && r < 0.75) return sizeTo('value');
      if (L.canRaise && nOpp === 1 && street !== 'river' && draw >= 8 && r < bluffFreq * 0.35) return sizeTo('semi');
      if (L.canRaise && nOpp === 1 && street !== 'river' && st.sizing !== 'flat' && relAdj < 0.3 && r < bluffFreq * 0.15) return sizeTo('bluff');
      if (eqAdj + drawBonus >= odds * st.loose + tax) return { kind: 'call', intent: eqAdj >= 0.6 ? 'value' : 'call', commitOk: relAdj >= 0.6 };
      return { kind: 'fold' };
    }
    // 持ち点がポットより小さく、強いなら全部
    if (L.canRaise && L.stack <= 0.6 * pot && rel >= valueEq) return { kind: 'allin', intent: 'value' };
    if (rel >= 0.8 && trap && r < trap && street !== 'river') return { kind: 'check', intent: 'trap' };
    if (L.canRaise && rel >= valueEq && r < valueFreq) return sizeTo('value');
    if (L.canRaise && draw >= 8 && street !== 'river' && r < (0.4 + bluffFreq * 0.5) * (nOpp === 1 ? 1 : 0.5)) return sizeTo('semi');
    if (L.canRaise && rel < 0.45 && nOpp <= 2 && r < bluffFreq * (ip ? 1.2 : 0.8)) return sizeTo('bluff');
    return { kind: 'check', intent: 'check' };
  }

  // 今の手番が AI なら決めて適用する。人の手番なら {waiting:true}。opts.allowHuman で人の席も自動で打つ
  function stepAI(t, opts = {}) {
    const h = t.hand;
    if (!h || h.done || h.toAct == null) return { waiting: false, events: [] };
    const seat = h.toAct;
    if (t.players[seat].human && !opts.allowHuman) return { waiting: true, seat, events: [] };
    const action = decideAction(t, seat);
    const events = applyAction(t, action);
    return { waiting: false, seat, action, events };
  }
  // 1ハンドを最後まで（人の席も自動）。ミミ脱落後の早送り・試験用
  function playHandAuto(t) {
    const ev = startHand(t);
    for (let g = 0; g < 400 && t.hand && !t.hand.done; g++) ev.push(...stepAI(t, { allowHuman: true }).events);
    return ev;
  }
  // 大会の最後まで（ミミ脱落後の「残りを高速計算して順位を確定」）。opts.keepEvents=false なら出来事を捨てる
  function fastForward(t, opts = {}) {
    const keep = opts.keepEvents !== false;
    const out = [];
    if (t.hand && !t.hand.done) for (let g = 0; g < 400 && !t.hand.done; g++) { const r = stepAI(t, { allowHuman: true }); if (keep) out.push(...r.events); }
    for (let g = 0; g < 1000 && !t.finished; g++) { const ev = playHandAuto(t); if (keep) out.push(...ev); }
    return { events: out, standings: standings(t) };
  }

  return {
    VERSION, CONFIG, DEFAULT_SEATS,
    configure, config, missingDeps,
    createTournament, startHand, legalActions, raisePresets, applyAction,
    decideAction, stepAI, playHandAuto, fastForward,
    standings, audit, serialize, restore, view, positionLabels,
    levelInfo, levelTable, blindsAt: (lv) => blindsAt(CONFIG, lv), humanSeat,
    computePots: (t) => (t.hand ? computePots(t.hand) : []),
    // 試験・調整用
    _internal: { eqPF, topPct, equityMulti, relOf, mulberry32, hash2, nextPositions, TRAITS, EXTRA_STYLES },
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Allstar;
