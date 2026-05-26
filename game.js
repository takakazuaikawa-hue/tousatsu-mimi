/* ==========================================================
   闘札大逆転ミミ - Phase 1 MVP ロジック
   v4パッチ反映：選択肢シャッフル、ログ、ランクSS〜C、無料初回ぱにゅぱにゅ、
   フロップ後の心理バトル強制発生、ブラインド簡略アンティ、ゾゾゾリセット
   ========================================================== */
'use strict';

//=============================================================
// SAVE / LOAD（Phase 2: v4 B6）
//=============================================================
const SAVE_KEY = 'tousatsu_mimi_save_v1';

function defaultSave() {
  return {
    version: 1,
    coins: 0,
    clearedStages: [],
    bestRanks: {},
    bestScores: {},
    firstClearRewardClaimed: [],
    ownedItems: [],
    unlockedNotes: ['bluff_basic'],
    equippedCardSkin: 'default',
    equippedTableSkin: 'default',
    panyuGaugeMax: 100,
    panyuSkills: { senseLevel: 1, rangeLevel: 1, breakLevel: 0 },
    panyuSenseFreeUsed: false,
    endingUnlocked: false,
    psychEnabled: true,   // 心理バトルON/OFF
    logicEnabled: true,   // 論理バトルON/OFF
    backdoorUnlocked: false, // 裏モード（相手の手と心理を覗き見）
    backdoorOn: false,       // 裏モードを今表示中か
    bgmVolume: 35,           // BGM音量（0-100）
    bgmOn: false,            // BGM初期OFF
    logs: { actions: [], bets: [], reactions: [], psych: [] },
  };
}

let save = null;
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    return { ...defaultSave(), ...data };
  } catch (e) {
    console.warn('Save load failed', e);
    return defaultSave();
  }
}
function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    console.warn('Save failed', e);
  }
}
function resetProgress() {
  if (!confirm('セーブデータをリセットしますか？')) return;
  localStorage.removeItem(SAVE_KEY);
  save = defaultSave();
  state = defaultState();
  render();
}

//=============================================================
// 0. 画像フォールバック
//=============================================================
const CHAR_FALLBACK = {
  mimi:   "[ミミ]\nうさ耳の新人バニー\n（仮表示）",
  rico:   "[リコ先輩]\nギャル口調の頼れる先輩\n（仮表示）",
  polka:  "[ポルカ]\n調子乗りの初心者客\n（仮表示）",
  selina: "[セリナ]\n落ち着いた常連プレイヤー\n（仮表示）",
  grano:  "[グラーノ]\n商人系プレイヤー\n（仮表示）",
  velvet: "[ヴェルベット]\nVIPルームのボスディーラー\n（仮表示）",
};

// 対戦相手プロファイル
const OPPONENTS = {
  rico_tutorial: {
    id: 'rico_tutorial',
    name: 'リコ先輩',
    profile: { bluffTendency: 0.2, aggression: 0.3, foldDiscipline: 0.8, valueBetTendency: 0.4, drawAggression: 0.3 },
    maxHands: 1,
    chips: 800,
    tutorial: true,
    imgKey: 'rico',
    theme: 'ポーカー基礎講義（全8章・24問）',
    desc: '歴史・用語・流れ・役・確率・定石・心理戦まで、じっくり学ぶリコ先輩の講義',
    rewardFirst: 300, rewardRematch: 50, rewardSBonus: 0,
    unlockNoteOnClear: null,
    isLecture: true,
  },
  polka: {
    id: 'polka',
    name: 'ポルカ',
    profile: { bluffTendency: 0.75, aggression: 0.8, foldDiscipline: 0.3, valueBetTendency: 0.4, drawAggression: 0.6 },
    maxHands: 999,
    chips: 1000,
    tutorial: false,
    imgKey: 'polka',
    theme: 'ブラフ入門',
    desc: '弱い時ほど声が大きい、調子乗りの初心者客',
    rewardFirst: 500, rewardRematch: 200, rewardSBonus: 200,
    unlockNoteOnClear: null,
    fullHand: true,
  },
  selina: {
    id: 'selina',
    name: 'セリナ',
    profile: { bluffTendency: 0.45, aggression: 0.55, foldDiscipline: 0.65, valueBetTendency: 0.65, drawAggression: 0.75 },
    maxHands: 999,
    chips: 1200,
    tutorial: false,
    imgKey: 'selina',
    theme: 'ボード危険度・ベットサイズ',
    desc: '丁寧で落ち着いた常連プレイヤー。理屈っぽく試してくる',
    rewardFirst: 700, rewardRematch: 300, rewardSBonus: 300,
    unlockNoteOnClear: 'board_danger',
    fullHand: true,
  },
  grano: {
    id: 'grano',
    name: 'グラーノ',
    profile: { bluffTendency: 0.5, aggression: 0.6, foldDiscipline: 0.55, valueBetTendency: 0.75, drawAggression: 0.45, trapTendency: 0.7 },
    maxHands: 999,
    chips: 1300,
    tutorial: false,
    imgKey: 'grano',
    theme: 'ポットオッズ・割に合う判断',
    desc: '商人系プレイヤー。ポーカーを商談のように考える',
    rewardFirst: 900, rewardRematch: 400, rewardSBonus: 400,
    unlockNoteOnClear: 'pot_odds',
    fullHand: true,
  },
  velvet: {
    id: 'velvet',
    name: 'ヴェルベット',
    profile: { bluffTendency: 0.65, aggression: 0.75, foldDiscipline: 0.6, valueBetTendency: 0.7, drawAggression: 0.65, pressureTalkTendency: 0.8 },
    maxHands: 999, // 実質無限。チップが尽きるまで継続
    chips: 1500,
    tutorial: false,
    imgKey: 'velvet',
    theme: 'レンジ・証拠突きつけ・ブラフブレイク・総合判断',
    desc: 'VIPルームを仕切る妖艶なボスディーラー。言葉と圧で相手を降ろしてくる',
    rewardFirst: 1500, rewardRematch: 700, rewardSBonus: 700,
    unlockNoteOnClear: 'range_basic',
    isBoss: true,
    fullHand: true,
  },
};

// チュートリアル用固定デッキ
const TUTORIAL_HAND = {
  player:   [{suit:'♠',rank:14,label:'A'}, {suit:'♠',rank:13,label:'K'}],
  opponent: [{suit:'♥',rank:7, label:'7'}, {suit:'♣',rank:2, label:'2'}],
  flop:     [{suit:'♥',rank:14,label:'A'}, {suit:'♦',rank:5, label:'5'}, {suit:'♣',rank:9, label:'9'}],
  turn:     {suit:'♣',rank:3, label:'3'},
  river:    {suit:'♦',rank:8, label:'8'},
};
window.assetFallback = function(imgEl, key) {
  const frame = imgEl.closest('.character-frame');
  if (!frame) return;
  frame.classList.add('fallback');
  frame.setAttribute('data-fallback', CHAR_FALLBACK[key] || '[画像なし]');
};

//=============================================================
// 1. 乱数・ユーティリティ
//=============================================================
function rand() { return Math.random(); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

//=============================================================
// 2. カード / デッキ / 役判定
//=============================================================
const SUITS = ['♠','♥','♦','♣'];
const RANK_NAMES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) {
    d.push({ suit: s, rank: r, label: RANK_NAMES[r - 2] });
  }
  return shuffle(d);
}

const HAND_NAMES = [
  'ハイカード', 'ワンペア', 'ツーペア', 'スリーカード',
  'ストレート', 'フラッシュ', 'フルハウス', 'フォーカード',
  'ストレートフラッシュ', 'ロイヤルストレートフラッシュ'
];

// 7枚から最強5枚役を返す { rank: 0..9, name, score: number }
function evaluateHand(cards) {
  if (cards.length < 5) return { rank: 0, name: '-', score: 0 };
  let best = null;
  const combos = combinations(cards, 5);
  for (const five of combos) {
    const ev = evalFive(five);
    if (!best || ev.score > best.score) best = ev;
  }
  return best;
}
function combinations(arr, k) {
  const out = [];
  const rec = (start, combo) => {
    if (combo.length === k) { out.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      rec(i + 1, combo);
      combo.pop();
    }
  };
  rec(0, []);
  return out;
}
function evalFive(five) {
  const ranks = five.map(c => c.rank).sort((a, b) => b - a);
  const suits = five.map(c => c.suit);
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ r: +r, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);
  const isFlush = suits.every(s => s === suits[0]);
  // ストレート判定（A-2-3-4-5含む）
  const uniq = [...new Set(ranks)];
  let isStraight = false, topStr = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; topStr = uniq[0]; }
    else if (uniq.join() === '14,5,4,3,2') { isStraight = true; topStr = 5; }
  }
  // ロイヤル
  if (isStraight && isFlush && topStr === 14) return mkScore(9, 'ロイヤルストレートフラッシュ', [14]);
  if (isStraight && isFlush) return mkScore(8, 'ストレートフラッシュ', [topStr]);
  if (groups[0].c === 4) return mkScore(7, 'フォーカード', [groups[0].r, groups[1].r]);
  if (groups[0].c === 3 && groups[1].c >= 2) return mkScore(6, 'フルハウス', [groups[0].r, groups[1].r]);
  if (isFlush) return mkScore(5, 'フラッシュ', ranks);
  if (isStraight) return mkScore(4, 'ストレート', [topStr]);
  if (groups[0].c === 3) return mkScore(3, 'スリーカード', [groups[0].r, ...ranks.filter(r => r !== groups[0].r)]);
  if (groups[0].c === 2 && groups[1].c === 2) {
    const high = Math.max(groups[0].r, groups[1].r);
    const low = Math.min(groups[0].r, groups[1].r);
    const kicker = ranks.find(r => r !== high && r !== low);
    return mkScore(2, 'ツーペア', [high, low, kicker]);
  }
  if (groups[0].c === 2) return mkScore(1, 'ワンペア', [groups[0].r, ...ranks.filter(r => r !== groups[0].r)]);
  return mkScore(0, 'ハイカード', ranks);
}
function mkScore(rank, name, tiebreak) {
  // score = rank*1e10 + sum tiebreak weighted
  let s = rank * 1e10;
  for (let i = 0; i < tiebreak.length && i < 5; i++) {
    s += tiebreak[i] * Math.pow(15, 4 - i);
  }
  return { rank, name, score: s };
}

// 手札強度（0..1）：ハンド評価値を正規化（簡易）
function handStrength01(cards) {
  const ev = evaluateHand(cards);
  // 0..9 を 0..1 にざっくり
  const base = ev.rank / 9;
  // tiebreak小数加算
  return Math.min(1, base + (ev.score % 1e10) / 1e12);
}

//=============================================================
// 3. AI: ポルカ
//=============================================================
const POLKA_PROFILE = {
  bluffTendency: 0.75,
  aggression: 0.8,
  foldDiscipline: 0.3,
  valueBetTendency: 0.4,
  drawAggression: 0.6,
};

// v4 B1 のアルゴリズムを簡略実装
function decideOpponentAction(profile, ctx, opts = {}) {
  const r = rand();
  const hs = ctx.handStrength;

  if (opts.forceLargeBet) {
    return { type: 'bet', size: 'pot_2_3', intent: 'forced_bluff' };
  }
  // フォールド判定
  if (hs < 0.18 && r > profile.foldDiscipline && ctx.toCall > 0) {
    return { type: 'fold' };
  }
  // ブラフ
  if (hs < 0.35 && r < profile.bluffTendency) {
    const size = r < profile.aggression ? 'pot_2_3' : 'pot_1_2';
    return { type: 'bet', size, intent: 'bluff' };
  }
  // バリュー
  if (hs > 0.55 && r < profile.valueBetTendency + 0.2) {
    const size = r < profile.aggression ? 'pot_2_3' : 'pot_1_2';
    return { type: 'bet', size, intent: 'value' };
  }
  // ドロー潰し（フラッシュ/ストレート両対応）
  if (ctx.boardDanger && (ctx.boardDanger.flushAlert || ctx.boardDanger.straightAlert)
      && r < profile.drawAggression) {
    // 危険度が高いほど大きめにベットしてドローに代金を払わせる
    const both = ctx.boardDanger.flushAlert && ctx.boardDanger.straightAlert;
    const size = both ? 'pot_2_3' : 'pot_1_2';
    return { type: 'bet', size, intent: 'draw' };
  }
  // チェックレイズ罠（trapTendency）：強い手でもチェックして相手の攻めを誘う
  if (hs > 0.65 && ctx.canCheck && profile.trapTendency && r < profile.trapTendency * 0.4) {
    return { type: 'check_call', intent: 'trap' };
  }
  return { type: 'check_call' };
}

// ベットサイズ → チップ数
function betSizeToChips(size, pot, allInMax) {
  let amt;
  switch (size) {
    case 'pot_1_3': amt = Math.floor(pot / 3); break;
    case 'pot_1_2': amt = Math.floor(pot / 2); break;
    case 'pot_2_3': amt = Math.floor(pot * 2 / 3); break;
    case 'pot_1':   amt = pot; break;
    case 'allin':   amt = allInMax; break;
    default:        amt = Math.floor(pot / 3);
  }
  return Math.max(50, Math.min(amt, allInMax));
}

// ポルカのセリフ生成
function opponentSpeech(action) {
  // 対戦相手別に分岐
  if (state.opponentId === 'velvet') return velvetSpeech(action);
  if (state.opponentId === 'selina') return selinaSpeech(action);
  if (state.opponentId === 'grano')  return granoSpeech(action);
  if (state.opponentId === 'rico_tutorial') return ricoSpeech(action);
  return polkaSpeech(action);
}
function ricoSpeech(action) {
  if (action.intent === 'tutorial_bluff' || action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick(['いっくよー！ガツンと攻めるからねー', 'はい、ミミ、よーく見な〜', 'ふふ、練習だから容赦するけどさ']);
  }
  if (action.type === 'fold') return 'はいはい、今回は譲っとくね〜';
  if (action.type === 'check_call') return pick(['コールでOKっしょ', 'まだ様子見ーね', 'のんびり行こ？']);
  return 'ふふ、気楽にいこ？';
}
function selinaSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'このボードなら、強く出る理由はあります。',
      '安くは見せません。',
      'あなたに見えていないボードが、私には見えていますよ。',
    ]);
  }
  if (action.intent === 'value') {
    return pick(['……静かに進めましょう', 'コール、で構いません', 'こちらも様子を見させてもらいます']);
  }
  if (action.intent === 'draw') return 'ドローを潰すサイズで、いきます。';
  if (action.type === 'fold') return '今回は手を引きます。賢明な選択を。';
  if (action.type === 'check_call') return pick(['チェック', '同額で、構いません', '無理は禁物です']);
  return '……';
}
function granoSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'さあ、未来の可能性を買いませんか？',
      'お嬢さん、この値段なら買い時ですよ。',
      'まだ高い買い物ではないでしょう？',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      'この一枚を見るだけなら、安いものですよ。',
      '小さな値札に、大きな見返りがありますよ。',
      'お得な取引でしょう？',
    ]);
  }
  if (action.type === 'fold') return '今回は商談不成立、ですな。';
  if (action.type === 'check_call') return pick(['見させていただきます', 'なるほど、なるほど', 'いいでしょう、進めましょう']);
  return 'うふふ、考えどころですね';
}
function pickRicoOpeningAdvice(opponentId) {
  switch (opponentId) {
    case 'polka':  return '「ポルカは弱い手ほど騒ぐタイプ。声と仕草をよく見な〜」';
    case 'selina': return '「セリナは理屈派。ベットサイズに意味があるから、なぜ今その額なのか考えよ」';
    case 'grano':  return '「グラーノは商人だからね。安いか高いかでコール判断する癖つけてー」';
    case 'velvet': return '「ヴェルベットは口で揺さぶってくるタイプね。冷静を保てば隙は見えるよ」';
    default:       return '「ま、気楽にいこ〜」';
  }
}
function opponentReadyLine() {
  switch (state.opponentId) {
    case 'rico_tutorial': return 'いいよミミ、リラックスして〜';
    case 'polka':  return pick(['いっくよー！', 'お、来た来た', 'こっちは準備OKー！']);
    case 'selina': return pick(['では、始めましょう。', '一手ずつ、ね。', '……どうぞ。']);
    case 'grano':  return pick(['さあ、開店ですよ。', '良い取引にしましょう、お嬢さん。', '値踏みの時間ですね。']);
    case 'velvet': return pick(['始めましょう、新人。', 'あなたの限界、見せてもらうわ。', 'カードを配るわよ……']);
    default: return '……';
  }
}
function opponentReactToPlayerFold() {
  switch (state.opponentId) {
    case 'rico_tutorial': return pick(['お、降りられたかー！それも判断のうちだよ', '降りるのも技術だからね、いいよいいよ']);
    case 'polka':  return pick(['やったー！ボクの勝ち〜！', 'へへっ、降りちゃったね！']);
    case 'selina': return pick(['賢明な判断です。', '降りるのも一つの戦略ですね。']);
    case 'grano':  return pick(['ふむ、今回は商談見送りですね。', 'お買い上げいただけず、残念です。']);
    case 'velvet': return pick(['ふふ……賢明ね、新人。', 'カードを見る前に折れた……それも答えよ。']);
    default: return '……';
  }
}
function polkaSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'へへっ、その顔、もう負けてるって感じだね！',
      'おっと、ミミちゃん降りないの？やめときなって！',
      'ボクの強さ、見えちゃった？',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      'ふーん……',
      'ボクは別に、急がないからさ。',
      '……（無言で考え込む）',
    ]);
  }
  if (action.intent === 'draw') {
    return pick(['まだまだこれからでしょ？', 'カード次第かなー']);
  }
  if (action.type === 'fold') return 'うーん、今回はやめとくよ……';
  if (action.type === 'check_call') return pick(['コールでいいよ', 'まだ様子見だね']);
  return '……';
}

//=============================================================
// 4. 場札危険度（v4 B2）
//=============================================================
function evaluateBoardDanger(board) {
  if (board.length === 0) return { flushAlert: false, straightAlert: false, pairBoard: false, hasDraw: false };
  const suitCount = {};
  board.forEach(c => suitCount[c.suit] = (suitCount[c.suit] || 0) + 1);
  const maxSuit = Math.max(...Object.values(suitCount));
  const ranks = board.map(c => c.rank).sort((a, b) => a - b);
  const uniqRanks = [...new Set(ranks)];
  let straightAlert = false;
  for (let i = 0; i < uniqRanks.length - 1; i++) {
    if (uniqRanks[i + 1] - uniqRanks[i] <= 2) { straightAlert = true; break; }
  }
  const pairBoard = uniqRanks.length < ranks.length;
  const flushAlert = maxSuit >= 2;
  return {
    flushAlert,
    flushMade: maxSuit >= 3,
    straightAlert,
    pairBoard,
    hasDraw: flushAlert || straightAlert,
  };
}

//=============================================================
// 5. 心理バトル問題（v4 A1 シャッフル対応）
//=============================================================
const PSYCH_QUESTIONS = {
  rico_tutorial_flop: {
    id: 'rico_tutorial_flop',
    situationFn: (state) => `練習問題：リコ先輩が2/3ポット以上をベットしてきた。\n場札：${renderCardsText(state.community)}　ミミの手札：${renderCardsText(state.playerHand)}`,
    speech: 'いっくよー！ふふ、ガツンといくね♪',
    zazazoHint: '【チュートリアル】リコ先輩は弱い手であえて大きく打って、ミミに練習させているよ',
    choices: [
      { id: 'must_made',      text: 'リコ先輩は必ず完成役を持っている',                              correct: false },
      { id: 'bluff_push_out', text: 'これは降ろし狙い。自分の役（Aペア）を信じてコール or レイズ',    correct: true  },
      { id: 'fold_safe',      text: 'よく分からないので降りる',                                       correct: false },
    ],
    onSuccess: {
      panyu: 30, zazazo: 1,
      hint: '相手レンジ：弱い手のブラフ／降ろし狙い',
      rico: 'はい、それ正解〜！相手の言葉と強さが噛み合わない時は、降ろし狙いを疑うのが基本ね',
    },
    onFail: {
      panyu: 0,
      mimi: 'うう、まだ自信がなくて……',
      rico: 'いいよいいよ、外したっていいの。なんで外したか覚えれば次は読めるからさ',
    },
  },
  selina_flush_alert: {
    id: 'selina_flush_alert',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nセリナは2/3ポット以上をベットしてきた。`,
    speech: 'このボードなら、強く出る理由はあります。',
    zazazoHint: 'ゾゾゾ反応：場札に同じスートが2枚以上見える',
    choices: [
      { id: 'flush_draw_pressure', text: '同スート2枚あるのでフラッシュドローで圧をかけている可能性が高い', correct: true },
      { id: 'must_flush',          text: '同スートが2枚なら必ずフラッシュ完成している',                       correct: false },
      { id: 'board_irrelevant',    text: '場札はまだ関係ない',                                              correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手レンジ：フラッシュドロー / ペア / ブラフ少し',
      rico: 'いいねー、ボードを見れるようになってきたじゃん。<u>同スート2枚＝完成じゃなく「狙ってる」サイン</u>ってやつね',
    },
    onFail: {
      panyu: -10,
      mimi: 'ボードに惑わされちゃった……',
      rico: 'まだまだー。<u>3枚以上ないとフラッシュ確定じゃない</u>からね、焦らないで',
    },
  },
  selina_bet_size: {
    id: 'selina_bet_size',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nセリナは2/3ポット以上をベット。連番やドロー要素のある場面。`,
    speech: '安くは見せません。',
    zazazoHint: 'ゾゾゾ反応：いつもより指の動きが速い',
    choices: [
      { id: 'no_free_card', text: '相手はミミに無料で次のカードを見せたくない（ドロー潰し）', correct: true },
      { id: 'must_bluff',   text: '2/3ポットは必ずブラフ',                                       correct: false },
      { id: 'big_bet_best', text: '大きいベットは全部最強役',                                    correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手は場札の危険度を見て圧をかけている',
      rico: 'そうそう、ベットサイズには「意図」があるんだよね。<u>大きい＝ドローに代金を払わせたい時もある</u>って覚えとこ',
    },
    onFail: {
      panyu: -10,
      mimi: '大きいベットってだけで怖がりすぎた……',
      rico: 'ベットサイズ＝役の強さ、じゃないって。ボードと合わせて読むのが基本ね',
    },
  },
  grano_cheap_call: {
    id: 'grano_cheap_call',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nポットは大きいがグラーノのベットは小さい。ミミにはドローまたは中程度の手。`,
    speech: 'この一枚を見るだけなら、安いものですよ。',
    zazazoHint: 'ゾゾゾ反応：穏やかに、誘うような声色',
    choices: [
      { id: 'pot_odds_good', text: 'ポットに対して支払額が小さいなら、見る価値がある可能性が高い', correct: true },
      { id: 'never_lose',    text: '勝率100%でないなら必ず降りる',                                correct: false },
      { id: 'cheap_trap',    text: '相手が安いと言ったら罠だから必ず降りる',                        correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手レンジ：誘い / 小さいバリュー / 安いブラフ。コール検討OK',
      rico: 'それがポットオッズってやつ〜。<u>払う額が小さいなら、当たる確率が低くてもコール価値あり</u>ってこと',
    },
    onFail: {
      panyu: -10,
      mimi: '見送っちゃった……でもこれが正解の時もあるよね？',
      rico: '臆病すぎる時もあるよ〜。<u>払う額÷（ポット+払う額）で必要勝率を見積もる</u>って覚えとこ',
    },
  },
  grano_expensive: {
    id: 'grano_expensive',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nポットに対してグラーノのベットが大きい。ミミの手は弱いドロー。`,
    speech: 'さあ、未来の可能性を買いませんか？',
    zazazoHint: 'ゾゾゾ反応：少しせかしてくる',
    choices: [
      { id: 'bad_odds',     text: '支払額が大きく、弱いドローでは割に合いにくい。降りても良い', correct: true },
      { id: 'always_chase', text: '未来の可能性があるなら必ずコール',                          correct: false },
      { id: 'pot_bluff',    text: 'ポットベットは全部ブラフ',                                  correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 1,
      hint: '割に合わない。フォールドも良い判断',
      rico: 'ナイスフォールド！<u>降りる勇気もポーカーの実力</u>だからね。割に合わない勝負は避けときな',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう、勝負した方がよかった……？',
      rico: 'ドローの完成率と支払額のバランスね。当たる確率より高い支払額だと、長い目で損するよ',
    },
  },
  // ===== 論理バトル（type: 'logic'） =====
  // 数学・確率・判断ロジックを学ぶクイズ
  logic_pot_odds_basic: {
    id: 'logic_pot_odds_basic',
    type: 'logic',
    rule: 'ポットオッズ：払う額 ÷ (ポット+払う額) × 100 ＝ 必要勝率(%)',
    situationFn: (state) => {
      const need = state.currentBetOpponent - state.currentBetPlayer;
      const potAfterCall = state.pot + need;
      const reqWin = potAfterCall > 0 ? Math.round((need / potAfterCall) * 100) : 0;
      return `📊 状況整理\n` +
        `・ポット：${state.pot}チップ\n` +
        `・ミミがコールに必要：${need}チップ\n` +
        `・コール後のポット総額：${potAfterCall}チップ\n\n` +
        `🧮 計算\n` +
        `${need} ÷ ${potAfterCall} × 100 ≒ <b>${reqWin}%</b>\n\n` +
        `この勝率以上なら長期的にプラス＝コール推奨`;
    },
    speech: '【論理問題】このコールに必要な勝率はどのくらい？',
    zazazoHint: '上の計算結果から正しい範囲を選んで',
    choices: [
      { id: 'lo20', text: '20〜30%程度（軽いドローでも見れる）', correct: true },
      { id: 'lo50', text: '50%以上（半々超じゃないと損）',         correct: false },
      { id: 'lo80', text: '80%以上（ほぼ勝確じゃないとダメ）',     correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: '必要勝率20-30%＝フラッシュドロー(35%)でもコール価値あり',
      rico: 'いいねー！<u>払う額が小さい時は必要勝率も低い</u>。ドローでもコール検討OK',
    },
    onFail: {
      panyu: -5,
      mimi: 'うう、計算苦手で……',
      rico: '感覚でOK！<u>払う額/ポット総額 = 必要勝率</u>。20-30%が目安だよ',
    },
  },
  logic_flush_outs: {
    id: 'logic_flush_outs',
    type: 'logic',
    rule: 'アウツ計算：完成までに有効な残りカード数 × 2 ＝ 次の1枚で当たる確率(%)',
    situationFn: (state) => `📊 状況整理\n` +
      `・場札：${renderCardsText(state.community)}\n` +
      `・ミミの手札：${renderCardsText(state.playerHand)}\n` +
      `・既に同スートが4枚見えている＝フラッシュ完成にはあと1枚必要\n` +
      `・デッキ内に同スート札は残り <b>9枚</b>（アウツ）\n\n` +
      `🧮 簡易公式\n` +
      `アウツ × 2 ＝ <b>9 × 2 = 18%</b>（次1枚での完成率）`,
    speech: '【論理問題】このフラッシュドロー、リバー1枚での完成率は？',
    zazazoHint: '上の公式で計算',
    choices: [
      { id: 'p10', text: '約 10%（厳しい）',         correct: false },
      { id: 'p20', text: '約 20%（5回に1回）',       correct: true },
      { id: 'p50', text: '約 50%（半分くらい）',     correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: '20%＝5回に1回。ポットオッズ次第で十分コールOK',
      rico: 'そうそう、<u>アウツ × 2 = 1枚で当たる確率(%)</u>。覚えとくとめっちゃ楽',
    },
    onFail: {
      panyu: -5,
      mimi: 'もっと高いと思ってました……',
      rico: '<u>9枚 × 2 = 18%</u>。意外と低いんだよね。だから安いコールしか割に合わない',
    },
  },
  logic_hand_compare: {
    id: 'logic_hand_compare',
    type: 'logic',
    rule: '完成役 vs 未完成ドロー：完成役の方が基本的に勝率が高い',
    situationFn: (state) => `📊 状況整理\n` +
      `・場札：${renderCardsText(state.community)}\n` +
      `・ミミ：Aペア（既に完成、約65-70%の勝率）\n` +
      `・想定される相手：フラッシュドロー（リバーまで完成率約35%）\n\n` +
      `🧮 ポイント\n` +
      `「完成してる役」は確定の強さ。\n` +
      `「これから完成するかも」は確率次第＝逆に倒される可能性も。`,
    speech: '【論理問題】リバーまで進んだ時、勝率が高いのはどっち？',
    zazazoHint: '完成済み vs ドロー、確率はどっちが上？',
    choices: [
      { id: 'mimi_win',   text: 'ミミのAペア（完成役は確定の強さ）',         correct: true },
      { id: 'opp_win',    text: '相手のフラッシュドロー（強そう）',           correct: false },
      { id: 'cant_tell',  text: '分からない（運次第）',                       correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: '完成役Aペアは約65-70%、フラッシュドローは約35%',
      rico: 'いいね！<u>完成役は確率上、ドローより有利</u>。ビビらず勝負しな',
    },
    onFail: {
      panyu: -5,
      mimi: 'フラッシュって響きが強そうで……',
      rico: '<u>「完成してる」vs「これから完成するかも」</u>。前者の方が確率上勝つ',
    },
  },
  logic_position: {
    id: 'logic_position',
    type: 'logic',
    rule: 'ポジション：後にアクションする側は情報量が多くて有利',
    situationFn: () => `📊 状況整理\n` +
      `・ポーカーでは「ベットの順番」が決まっている\n` +
      `・先手：何の情報もないまま判断（暗中模索）\n` +
      `・後手：相手の動き＋ベット額を見てから判断（情報あり）\n\n` +
      `🧮 ポイント\n` +
      `情報の差はそのまま勝率の差になる。\n` +
      `だからプロは「ポジションは勝率5-10%相当」と言う。`,
    speech: '【論理問題】後手（後にアクション）が有利な理由は？',
    zazazoHint: '情報量の差がどう活きる？',
    choices: [
      { id: 'info', text: '相手のベット額・態度を見てから判断できる', correct: true },
      { id: 'card', text: 'カードが多くもらえる',                       correct: false },
      { id: 'pot',  text: 'ポットが自動で大きくなる',                   correct: false },
    ],
    onSuccess: {
      panyu: 10, zazazo: 0,
      hint: 'ポジション＝情報のアドバンテージ。プロは数値化できるほど重視',
      rico: 'そうそう、<u>後手は情報量が多い</u>。ポーカーは情報ゲーだから後手有利',
    },
    onFail: {
      panyu: -5,
      mimi: 'カードが増えるのかと思った……',
      rico: 'ポジションは<u>「アクション順」の差だけ</u>。でもそれが勝率に直結するの',
    },
  },
  // ===== チュートリアルレッスン（type: 'lesson'） =====
  // リコ先輩による講義形式。8章 × 3問。順番に消化。
  lesson_1_1: { id:'lesson_1_1', type:'lesson', chapter:1, chapterTitle:'第1章：ポーカーって何？',
    rule:'テキサスホールデムは世界で最も遊ばれているポーカーの形。WSOPなど大会も巨大。',
    situationFn: () => '「ポーカー」と一口に言ってもバリエーションは数十種類。\n本ゲームで遊ぶ「テキサスホールデム」は、世界中の大会で最もメジャーな形式。',
    speech: 'まずは基本知識。ポーカーがどんなゲームか整理しよう',
    zazazoHint: '配られるカードの種類に注目',
    choices: [
      { id:'th_a', text:'手札2枚＋場札5枚を共有して、最強の5枚役を作るゲーム', correct:true },
      { id:'th_b', text:'各自に5枚配られて、それだけで役を作るゲーム', correct:false },
      { id:'th_c', text:'1枚ずつ引いて先に役ができた方が勝つゲーム', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'正解！手札2枚は自分だけ、場札5枚は全員共有', rico:'そう、<u>手札2枚＋場札5枚 = 計7枚から最強5枚を選ぶ</u>のがホールデムね' },
    onFail:    { panyu:0, mimi:'えっと、各自に5枚かと…', rico:'各自5枚は別ルール（ファイブカードドロー）。ホールデムは<u>2枚＋共有5枚</u>だよ' },
  },
  lesson_1_2: { id:'lesson_1_2', type:'lesson', chapter:1, chapterTitle:'第1章：ポーカーって何？',
    rule:'ポーカーは19世紀のアメリカで発達。1970年からWSOP（世界選手権）開催。',
    situationFn: () => 'ポーカーには長い歴史がある。\n現代のテキサスホールデムは20世紀後半に普及し、\n世界選手権「WSOP」は1970年から毎年開催されている。',
    speech: '雑学だけど知っとくと深みが出るよ',
    zazazoHint: '世界選手権の規模感',
    choices: [
      { id:'h_a', text:'最大の大会は WSOP メインイベント、優勝賞金は約数億円', correct:true },
      { id:'h_b', text:'ポーカー大会は最高でも数十万円規模', correct:false },
      { id:'h_c', text:'ポーカーは賞金大会が一切ない遊び', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'WSOPメインイベント優勝は約10億円規模', rico:'<u>世界中のプロが本気で挑む頭脳スポーツ</u>でもあるんだよね' },
    onFail:    { panyu:0, mimi:'そんなに大きいの…', rico:'ホールデムは<u>合法的な競技ポーカー</u>で大会が世界中にある。トッププロは億万長者だよ' },
  },
  lesson_1_3: { id:'lesson_1_3', type:'lesson', chapter:1, chapterTitle:'第1章：ポーカーって何？',
    rule:'ポーカーは「運」だけじゃなく「読み・確率・心理」の総合スキルゲーム。',
    situationFn: () => 'ポーカーは運ゲームに見えるが、長期で見ると確率・読み・心理戦の力で<b>実力者が勝ち越す</b>ゲーム。\n短期は運、長期は実力。',
    speech: 'ポーカーはなぜ単なる賭博と区別される？',
    zazazoHint: '短期 vs 長期で考える',
    choices: [
      { id:'sk_a', text:'長期で見ると確率と読みの実力差が勝率に表れるから', correct:true },
      { id:'sk_b', text:'カードの色を当てる超能力ゲームだから', correct:false },
      { id:'sk_c', text:'運だけで決まり、実力は無関係', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'スキルゲーム＝確率・読み・心理の総合力', rico:'そう、<u>1回は運でも100回・1000回は実力</u>。長く遊ぶと実力派が浮上する' },
    onFail:    { panyu:0, mimi:'運だけだと思ってました', rico:'ポーカーは<u>「不完全情報下の意思決定」</u>のゲーム。スキル要素が大きい' },
  },

  lesson_2_1: { id:'lesson_2_1', type:'lesson', chapter:2, chapterTitle:'第2章：基本用語',
    rule:'手札(ホール)＝自分だけ／場札(ボード)＝全員共有／ポット＝賭け金プール',
    situationFn: () => '<b>手札（ホールカード）</b>：自分だけが見られるカード2枚。\n<b>場札（ボード／コミュニティカード）</b>：テーブル中央で全員共有するカード5枚。\n<b>ポット</b>：そのハンドで賭けられたチップの合計プール。',
    speech: '基礎用語の確認だよ',
    zazazoHint: '誰が使える札か',
    choices: [
      { id:'t1_a', text:'場札は両プレイヤーが共有して、役作りに使える', correct:true },
      { id:'t1_b', text:'場札は自分だけしか使えない', correct:false },
      { id:'t1_c', text:'場札は最後にディーラーが取る', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'手札2枚 + 場札5枚 = 計7枚から最強5枚', rico:'<u>場札は共有、だから相手も同じ場札で別の役を狙ってる</u>って意識しよ' },
    onFail:    { panyu:0, mimi:'自分専用だと思ってた…', rico:'場札は<u>全員が使える共通の手</u>。だから「相手が場札で何作れるか」を考えるのが大事' },
  },
  lesson_2_2: { id:'lesson_2_2', type:'lesson', chapter:2, chapterTitle:'第2章：基本用語',
    rule:'アンテ＝全員強制参加金／ブラインド＝SB(小)・BB(大)の2人だけ強制',
    situationFn: () => '「強制ベット」には2方式ある。\n<b>アンテ式</b>：全員が同じ額を最初にポットに入れる（本ゲームの方式：50ずつ）。\n<b>ブラインド式</b>：実プロホールデムで主流。2人だけが強制ベット（SB / BB）。',
    speech: '本ゲームはアンテ方式。プロはブラインド方式',
    zazazoHint: '全員 vs 一部の違い',
    choices: [
      { id:'t2_a', text:'アンテは全員、ブラインドは2人だけが強制ベット', correct:true },
      { id:'t2_b', text:'同じ意味', correct:false },
      { id:'t2_c', text:'ブラインドは目をつぶる演出のこと', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'本ゲームは簡略化のため両者50ずつアンテ', rico:'<u>強制ベットがあるから降りるだけでは勝てない</u>。攻めの姿勢が必要ってこと' },
    onFail:    { panyu:0, mimi:'同じだと思ってました', rico:'<u>アンテ＝全員 / ブラインド＝SB+BBだけ</u>。実プロはブラインド方式が主流' },
  },
  lesson_2_3: { id:'lesson_2_3', type:'lesson', chapter:2, chapterTitle:'第2章：基本用語',
    rule:'スーツ（♠♥♦♣）は強さに優劣なし／ランク（数字）はA最強→2最弱',
    situationFn: () => '4つのスーツ ♠♥♦♣ に強弱はない。\nランク（数字）は A > K > Q > J > 10 > 9 > ... > 2 が基本。\nただし<b>A は「最強」かつ「ストレートでは1扱い」も可能</b>（A-2-3-4-5 = ホイール）。',
    speech: 'A（エース）の特殊性に注目',
    zazazoHint: 'Aは2つの顔を持つ',
    choices: [
      { id:'t3_a', text:'A は「最強の14」としても「ストレートの1」としても使える', correct:true },
      { id:'t3_b', text:'A は 1 だけ', correct:false },
      { id:'t3_c', text:'スーツはハート最強・スペード最弱', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'Aは「ハイ」と「ロー」両方OK、スーツに優劣なし', rico:'<u>A-2-3-4-5 はストレート扱い</u>（ホイールって呼ぶ）。覚えとくと役を見落とさない' },
    onFail:    { panyu:0, mimi:'スートに強弱あると思ってました', rico:'スーツは見た目の違いだけ。<u>強さはランクで決まる</u>。Aは1にも14にもなれる特殊カード' },
  },

  lesson_3_1: { id:'lesson_3_1', type:'lesson', chapter:3, chapterTitle:'第3章：ハンドの流れ',
    rule:'1ハンド＝プリフロップ→フロップ(3枚)→ターン(1枚)→リバー(1枚)→ショーダウン',
    situationFn: () => 'ホールデムの1ハンドは4つのベットラウンドで構成。\n<b>プリフロップ</b>：手札2枚配布、最初のベット\n<b>フロップ</b>：場札3枚オープン、2回目のベット\n<b>ターン</b>：場札4枚目、3回目のベット\n<b>リバー</b>：場札5枚目、最終ベット\n<b>ショーダウン</b>：残った者で役比較',
    speech: '進行順を覚えよう',
    zazazoHint: 'プリフロップ→フロップの順',
    choices: [
      { id:'fl_a', text:'プリフロップ → フロップ → ターン → リバー → ショーダウン', correct:true },
      { id:'fl_b', text:'フロップ → プリフロップ → リバー → ターン', correct:false },
      { id:'fl_c', text:'ターン → フロップ → リバー → プリフロップ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'各ストリートでベット→次の場札公開を繰り返す', rico:'<u>場札は3→4→5枚と段階的に増える</u>。情報が増えるたび判断が変わる' },
    onFail:    { panyu:0, mimi:'順番ごちゃごちゃで…', rico:'<u>プリ→フロ→ター→リバ→ショ</u>って唱えて覚えな。場札 0→3→4→5の順' },
  },
  lesson_3_2: { id:'lesson_3_2', type:'lesson', chapter:3, chapterTitle:'第3章：ハンドの流れ',
    rule:'各ストリートで「全員のベット額が揃う」まで進まない',
    situationFn: () => '各ストリートでは、ベットされたら相手は<b>「コール（同額払う）」「レイズ（上乗せ）」「フォールド（降りる）」</b>のいずれかを選ぶ。\n全員のベット額が揃って初めて次のストリートへ進む。',
    speech: 'ストリートが終わる条件は？',
    zazazoHint: 'ベット額が揃うとは',
    choices: [
      { id:'st_a', text:'全プレイヤーがコール（または降りる）して、ベット額が揃った時', correct:true },
      { id:'st_b', text:'時間切れになった時', correct:false },
      { id:'st_c', text:'ディーラーが「次！」と叫んだ時', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'ベットが揃う＝次のストリートへ', rico:'<u>誰かが上乗せしたら全員が応じるまで終わらない</u>。これがレイズ合戦の基本' },
    onFail:    { panyu:0, mimi:'時間切れかと思ったら違うんだ', rico:'<u>ベット額が揃うまで進まない</u>。レイズ→コール→次ストリート、って流れ' },
  },
  lesson_3_3: { id:'lesson_3_3', type:'lesson', chapter:3, chapterTitle:'第3章：ハンドの流れ',
    rule:'ショーダウンに行く前に相手が全員フォールド → 残った者がポット獲得',
    situationFn: () => 'ハンドの終わり方は2つ。\n<b>1. ショーダウン</b>：リバー後の最終ベットを乗り越えて残った者同士で役比較。\n<b>2. 相手フォールド</b>：途中で相手が全員降りた時点で、残った者がポット獲得（手札公開不要）。',
    speech: 'ショーダウン前に勝つ方法は？',
    zazazoHint: '降ろし勝ち',
    choices: [
      { id:'sd_a', text:'相手をフォールドさせれば、自分の手札を見せずに勝てる', correct:true },
      { id:'sd_b', text:'常にショーダウンまで行かないと勝てない', correct:false },
      { id:'sd_c', text:'相手のチップを物理的に奪う', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'ブラフ（弱い手でも降ろせば勝ち）が成立する理由', rico:'<u>ショーダウン無しの勝ちは「手の中身を見せず勝つ」</u>。これがブラフの本質ね' },
    onFail:    { panyu:0, mimi:'常にショーダウンかと…', rico:'<u>弱い手でも相手を降ろせば勝ち</u>。だから「強そうに見せる」ブラフが成立する' },
  },

  lesson_4_1: { id:'lesson_4_1', type:'lesson', chapter:4, chapterTitle:'第4章：5つのアクション',
    rule:'フォールド/チェック/コール/ベット(レイズ)/オールイン の使い分け',
    situationFn: () => '基本アクションは5つ。\n<b>フォールド</b>：降りる。これまでのチップは失うが、それ以上は払わない。\n<b>チェック</b>：賭けずに次の場札を待つ（相手が賭けてない時のみ）。\n<b>コール</b>：相手のベット額と同額を払って続行。\n<b>ベット／レイズ</b>：自分から賭ける／相手のベットに上乗せ。\n<b>オールイン</b>：持ちチップ全額。',
    speech: 'チェックとコールの違いは？',
    zazazoHint: '相手が賭けてるか否か',
    choices: [
      { id:'a1_a', text:'相手が賭けてない時はチェック、賭けてる時にコール', correct:true },
      { id:'a1_b', text:'チェックとコールは同じ', correct:false },
      { id:'a1_c', text:'チェックは降りる、コールは続行', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'チェック=賭けず、コール=同額', rico:'<u>チェックは無料パス、コールは「相手に合わせて払う」</u>。間違えないようにね' },
    onFail:    { panyu:0, mimi:'同じかと…', rico:'<u>誰もベットしてない→チェックOK、誰かがベット中→コールかレイズかフォールド</u>' },
  },
  lesson_4_2: { id:'lesson_4_2', type:'lesson', chapter:4, chapterTitle:'第4章：5つのアクション',
    rule:'ベットサイジングは「ポット比率」で考える：1/3 / 1/2 / 2/3 / ポット',
    situationFn: () => 'ベット額は<b>ポット比率</b>で決めるのが基本。\n<b>1/3ポット</b>：軽い試し、コール率高い\n<b>1/2ポット</b>：標準サイズ、攻守バランス\n<b>2/3ポット</b>：強気、相手を降ろしに行く\n<b>ポット</b>：最大圧、本気の勝負',
    speech: '相手を降ろしたい時のサイジングは？',
    zazazoHint: '小さすぎても大きすぎてもダメ',
    choices: [
      { id:'a2_a', text:'2/3ポット以上が「降ろし狙い」の目安', correct:true },
      { id:'a2_b', text:'1チップだけが最強', correct:false },
      { id:'a2_c', text:'必ずオールイン', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'2/3+ポット = pressure、1/2 = 標準', rico:'<u>小さすぎると相手が降りない、大きすぎると怪しまれる</u>。2/3が黄金比' },
    onFail:    { panyu:0, mimi:'極端な額の方が…？', rico:'極端なベットは逆に読まれる。<u>2/3が「適度に痛い」サイズ</u>' },
  },
  lesson_4_3: { id:'lesson_4_3', type:'lesson', chapter:4, chapterTitle:'第4章：5つのアクション',
    rule:'オールインは「勝ったら大きい、負けたら終わり」のリスク手',
    situationFn: () => 'オールインは持ちチップ全額の最大リスク手。\n<b>勝てば</b>：相手のチップ大きく奪える（または相手をフォールドさせ即勝ち）\n<b>負ければ</b>：チップ0で対戦終了',
    speech: 'オールインを使うべき場面は？',
    zazazoHint: '使うべき＝必要な時',
    choices: [
      { id:'ai_a', text:'役が圧倒的に強い時 or 逆転を狙う最終手段', correct:true },
      { id:'ai_b', text:'常に最初に使う', correct:false },
      { id:'ai_c', text:'チップが余ったら毎ハンド使う', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'バリュー or 一発逆転狙いのみ', rico:'<u>「強くて確信ある時」か「もう失うものない時」</u>。中途半端な時は使わない' },
    onFail:    { panyu:0, mimi:'常にだと…思いきや', rico:'<u>オールインは博打じゃなくて戦略</u>。タイミング選んで使うのが正解' },
  },

  // ===== 拡張章：用語集（手札関連） =====
  lesson_term_1: { id:'lesson_term_1', type:'lesson', chapter:'用語', chapterTitle:'特別講座：用語集（手札関連）',
    rule:'スート(♠♥♦♣) ／ スーテッド(同スート) ／ オフスート(異スート)',
    situationFn: () => '<b>スート</b>＝カードのマーク：♠スペード／♥ハート／♦ダイヤ／♣クラブ。\n<b>スーテッド (suited)</b>＝手札2枚が<u>同じスート</u>（例：A♥ K♥）。フラッシュ作りやすい。\n<b>オフスート (off-suit)</b>＝手札2枚が<u>違うスート</u>（例：A♥ K♠）。',
    speech: '「AKs」と「AKo」、何が違う？',
    zazazoHint: '末尾のs/oに注目',
    choices: [
      { id:'su_a', text:'AKs = AKスーテッド（同スート）、AKo = AKオフスート（異スート）', correct:true },
      { id:'su_b', text:'AKs = エースキング、AKo = エースキング・オリジナル', correct:false },
      { id:'su_c', text:'同じ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'sはsuited、oはoff-suit', rico:'<u>スーテッドは「フラッシュ作りやすい」分、価値上がる</u>。同じAKでも別物だよ' },
    onFail:    { panyu:0, mimi:'分かりにくい記号…', rico:'<u>s = suited（同スート）、o = off-suit（異スート）</u>。覚えるとプロの会話に入れる' },
  },
  lesson_term_2: { id:'lesson_term_2', type:'lesson', chapter:'用語', chapterTitle:'特別講座：用語集（手札関連）',
    rule:'コネクター＝連続ランク、スーテッドコネクター＝同スート連続',
    situationFn: () => '<b>コネクター (connector)</b>＝<u>連続するランクの2枚</u>（例：9-10、J-Q）。ストレート作りやすい。\n<b>スーテッドコネクター</b>＝同スート + 連続（例：9♥-10♥）。ストレートも<b>フラッシュも狙える</b>、隠れた人気手。\n<b>ギャップ・コネクター</b>＝1〜2枚離れた（例：8-10、7-10）。やや弱め。',
    speech: 'スーテッドコネクター 9♥10♥ の魅力は？',
    zazazoHint: '2つの役を狙える',
    choices: [
      { id:'co_a', text:'ストレートとフラッシュ両狙いで、低リスク高リターン', correct:true },
      { id:'co_b', text:'なんとなくカッコいい', correct:false },
      { id:'co_c', text:'プロは絶対使わない', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'プロが好む「隠れた強手」', rico:'<u>当たれば爆発、外れたら傷浅い</u>ローリスクハイリターンの定番手' },
    onFail:    { panyu:0, mimi:'微妙な手かと…', rico:'<u>2方向（ストフラ）両狙い</u>できるからプロが愛用するの' },
  },
  lesson_term_3: { id:'lesson_term_3', type:'lesson', chapter:'用語', chapterTitle:'特別講座：用語集（場札・状況関連）',
    rule:'ナッツ＝その場札で作れる「最強の役」',
    situationFn: () => '<b>ナッツ (the nuts)</b>＝<u>その場札で作れる絶対最強の役</u>。\n例：場札 K♥ Q♥ J♥ 9♣ 3♥ で <b>A♥ 10♥</b> 持ってる → A高ストレートフラッシュ（ロイヤル）＝ナッツ\n「ナッツ持ち」は確実勝利。たとえ相手がフォーカードでも勝てる。',
    speech: '場札 9♠ 10♠ J♠ Q♠ 3♣ でナッツになる手札は？',
    zazazoHint: '残るストフラの最強形',
    choices: [
      { id:'nu_a', text:'K♠ + 任意（K-Q-J-10-9 のストレートフラッシュ）', correct:true },
      { id:'nu_b', text:'A♠ A♣（フォーカード）', correct:false },
      { id:'nu_c', text:'場札の組み合わせ次第', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'ストフラ > フォーカード > フルハウス…', rico:'<u>ナッツ持ちは絶対勝てる</u>。バリュー最大化のチャンスだから大胆に攻めよう' },
    onFail:    { panyu:0, mimi:'AAが最強かと…', rico:'<u>場札にストフラ要素があればストフラがナッツ</u>。AAでも負ける場面' },
  },
  lesson_term_4: { id:'lesson_term_4', type:'lesson', chapter:'用語', chapterTitle:'特別講座：用語集（プレイ用語）',
    rule:'チェックレイズ＝チェック→相手ベット→自分が大レイズ、強い罠',
    situationFn: () => '中級用語：\n<b>チェックレイズ</b>：先にチェックして相手にベットさせ、その後大きくレイズ。<u>強い手で罠を張る</u>戦術。\n<b>スロープレイ</b>：強い手をあえて静かにベット。相手を誘い込む。\n<b>3ベット</b>：プリフロップで「相手のレイズに対するレイズ」。強気な姿勢。\n<b>4ベット</b>：3ベットに対する更なるレイズ。AA / KKレベルが多い。',
    speech: 'チェックレイズの狙いは？',
    zazazoHint: '相手を誘ってから刈り取る',
    choices: [
      { id:'cr_a', text:'相手にベットさせてから上乗せ、ポットを膨らます罠', correct:true },
      { id:'cr_b', text:'弱いからチェック', correct:false },
      { id:'cr_c', text:'相手に勝ちを譲る', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'チェックレイズは強い手の罠戦術', rico:'<u>相手の攻撃を利用して大きく稼ぐ</u>のがチェックレイズ。上級者の必殺技' },
    onFail:    { panyu:0, mimi:'チェック＝弱い手かと', rico:'<u>強い手でもチェックすることはある</u>＝罠。これがポーカーの奥深さ' },
  },

  // ===== ハンズオン章：実際に役を見極める =====
  lesson_hand_1: { id:'lesson_hand_1', type:'lesson', chapter:'実戦', chapterTitle:'実戦講座：役を見つけよう',
    rule:'手札2枚＋場札5枚＝7枚から最強の5枚を選ぶ',
    situationFn: () => '🃏 ミミの手札：<b>A♥ K♥</b>\n📋 場札：<b>Q♥ J♥ 10♥ 2♣ 5♦</b>\n\nさて、ミミの最強5枚は？',
    speech: '7枚から最強5枚を見つけよう',
    zazazoHint: '同スートのハート5枚に注目',
    choices: [
      { id:'h1_a', text:'A♥ K♥ Q♥ J♥ 10♥ ＝ ロイヤルストレートフラッシュ（最強！）', correct:true },
      { id:'h1_b', text:'A♥ K♥ + 場札のペア＝ワンペア', correct:false },
      { id:'h1_c', text:'A♥ K♥ Q♥ J♥ ＝ フラッシュ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'ハート5枚 + 10〜A連続 = ロイヤル', rico:'<u>夢のロイヤル</u>！全種の役で最強。一生に一度の役だよ' },
    onFail:    { panyu:0, mimi:'ロイヤル見落としてた…', rico:'<u>ハート5枚連続＝ストフラ、しかもAトップでロイヤル</u>。最強の最強' },
  },
  lesson_hand_2: { id:'lesson_hand_2', type:'lesson', chapter:'実戦', chapterTitle:'実戦講座：役を見つけよう',
    rule:'ペアが場札にあれば「3カード」や「フルハウス」を狙える',
    situationFn: () => '🃏 ミミの手札：<b>K♠ K♦</b>\n📋 場札：<b>K♥ 7♣ 7♠ 9♦ 2♣</b>\n\n最強の役は？',
    speech: 'ペアが場札にあるよ',
    zazazoHint: 'K3枚と7ペアを組み合わせる',
    choices: [
      { id:'h2_a', text:'K-K-K + 7-7 ＝ フルハウス（Kフル）', correct:true },
      { id:'h2_b', text:'K-K ＝ ワンペア', correct:false },
      { id:'h2_c', text:'K-K-K ＝ スリーカード', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'3カード + 2カード = フルハウス', rico:'<u>Kフルハウス</u>！3カード（K三枚）と2カード（7ペア）合わせてフルハウス完成' },
    onFail:    { panyu:0, mimi:'スリーカードかと…', rico:'<u>3カード + 場札の別ペア = フルハウス</u>に格上げ。見落としやすいから注意' },
  },
  lesson_hand_3: { id:'lesson_hand_3', type:'lesson', chapter:'実戦', chapterTitle:'実戦講座：役を見つけよう',
    rule:'A-2-3-4-5 はストレート（ホイール）として成立',
    situationFn: () => '🃏 ミミの手札：<b>A♠ 2♥</b>\n📋 場札：<b>3♣ 4♦ 5♠ J♥ Q♣</b>\n\n最強の役は？',
    speech: 'Aを「1」として使えるパターン',
    zazazoHint: 'A-2-3-4-5は特殊ストレート',
    choices: [
      { id:'h3_a', text:'A-2-3-4-5 ＝ ストレート（ホイール、5ハイ扱い）', correct:true },
      { id:'h3_b', text:'役なし（A-Q-J-5-4 ハイカード）', correct:false },
      { id:'h3_c', text:'A-2 ＝ ワンペア（Aペア）', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'A は1としても使える特殊カード', rico:'<u>ホイール（A-2-3-4-5）</u>はストレート扱い。Aを1として使う唯一のパターン' },
    onFail:    { panyu:0, mimi:'A は1にならないと思いました', rico:'<u>Aは14でも1でも使える</u>。A-2-3-4-5 は完璧なストレート（5ハイ扱い）' },
  },
  lesson_hand_4: { id:'lesson_hand_4', type:'lesson', chapter:'実戦', chapterTitle:'実戦講座：役を見つけよう',
    rule:'場札3枚同スートでも、手札に同スート2枚なければフラッシュにならない',
    situationFn: () => '🃏 ミミの手札：<b>A♣ K♣</b>\n📋 場札：<b>2♥ 7♥ 9♥ Q♥ 3♣</b>\n\n最強の役は？\n\n<small>※場札のハートは4枚あるが、手札にハートはゼロ。</small>',
    speech: '一見フラッシュに見えるけど…',
    zazazoHint: '自分の手札のスートに注目',
    choices: [
      { id:'h4_a', text:'A♣ K♣ + 場札 = AKハイカード（フラッシュ不成立）', correct:true },
      { id:'h4_b', text:'4枚同スートなのでフラッシュ完成', correct:false },
      { id:'h4_c', text:'3♣ A♣ K♣ ＝ フラッシュ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'フラッシュは「自分のカード含めた5枚同スート」必要', rico:'<u>場札4枚同スートでも、自分の手札に同スート無いとフラッシュにならない</u>。罠だよ〜' },
    onFail:    { panyu:0, mimi:'場札4枚で完成かと…', rico:'<u>5枚同スートに「自分の手札を含めた」5枚</u>が必要。場札だけじゃダメ' },
  },

  // ===== バンクロール・マナー章 =====
  lesson_bank_1: { id:'lesson_bank_1', type:'lesson', chapter:'マナー', chapterTitle:'特別講座：バンクロール管理',
    rule:'バンクロール＝ポーカー用の資金。生活費とは厳密に分ける',
    situationFn: () => '<b>バンクロール</b>＝ポーカーで使う総資金。\nプロは「生活費とは絶対に混ぜない」「1回のセッションで失っていい上限を決める」が鉄則。\n\nポーカーは長期的にプラスでも、短期的にバッドビート（負けの連鎖）はある。<b>負けても困らない額</b>で遊ぶこと。',
    speech: 'バンクロール管理の鉄則は？',
    zazazoHint: '生活費との関係',
    choices: [
      { id:'b1_a', text:'生活費とは分ける。失っていい額のみで遊ぶ', correct:true },
      { id:'b1_b', text:'生活費からも投入してOK', correct:false },
      { id:'b1_c', text:'借金してでも参加', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'生活費分離 = ポーカー長続きの秘訣', rico:'<u>「負けたら困る金」で遊んじゃダメ</u>。判断が歪んで、もっと負ける' },
    onFail:    { panyu:0, mimi:'全力で行くものかと…', rico:'<u>バンクロールは「遊び金」だけ</u>。生活費混ぜたら破滅コースだよ' },
  },
  lesson_bank_2: { id:'lesson_bank_2', type:'lesson', chapter:'マナー', chapterTitle:'特別講座：ポーカーのマナー',
    rule:'相手の手札を覗かない／カードを露出させない／時間を取りすぎない',
    situationFn: () => 'ポーカーには紳士的なマナーがある。\n<b>NG行為</b>：\n・相手の手札を覗き見\n・自分のカードを他人に見せる\n・極端に長考（30秒以上は嫌われる）\n・大声・暴言\n・卓上にお金を投げつける\n<b>OK行為</b>：\n・チップを丁寧に置く\n・自分のターンで即決する',
    speech: 'NG マナーはどれ？',
    zazazoHint: '相手の手札情報',
    choices: [
      { id:'m1_a', text:'相手の手札を覗き見る（不正行為）', correct:true },
      { id:'m1_b', text:'自分のターンで考える（10秒程度）', correct:false },
      { id:'m1_c', text:'チップをスタックに整える', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'覗き見は不正、即退場レベル', rico:'<u>覗き見は完全NG</u>。実際のカジノだと即退場・出禁になる行為' },
    onFail:    { panyu:0, mimi:'考えすぎは…？', rico:'<u>10秒程度の長考はOK、30秒以上は嫌われる</u>。覗き見は絶対ダメ' },
  },
  lesson_bank_3: { id:'lesson_bank_3', type:'lesson', chapter:'マナー', chapterTitle:'特別講座：禁止行為とフェアプレイ',
    rule:'コリュージョン（共謀）／マーキング／チートカードは犯罪',
    situationFn: () => '<b>絶対禁止行為</b>：\n<b>コリュージョン</b>：複数人で結託して1人を狙い撃ち。<u>大会では即失格・賞金没収</u>\n<b>マーキング</b>：カードに目印を付けて識別\n<b>チートデバイス</b>：隠しカメラ・透視メガネ等\n<b>チップダンピング</b>：意図的に負けてチップを仲間に渡す\n\nどれもカジノでは犯罪扱い。',
    speech: '友達同士でも禁止な行為は？',
    zazazoHint: '結託＝チーム戦扱いはダメ',
    choices: [
      { id:'fp_a', text:'コリュージョン（2人で結託して相手を狙い撃ち）', correct:true },
      { id:'fp_b', text:'友達と席が隣同士になること', correct:false },
      { id:'fp_c', text:'同じドリンクを飲むこと', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'結託は即失格レベル', rico:'<u>ポーカーは「1対全員」のゲーム</u>。チーム戦化したら成立しないからね' },
    onFail:    { panyu:0, mimi:'友達同士なら問題ないかと', rico:'<u>結託は犯罪扱い</u>。賞金没収＋出禁。フェアプレイが大原則' },
  },

  lesson_5_1: { id:'lesson_5_1', type:'lesson', chapter:5, chapterTitle:'第5章：役の強さ',
    rule:'役の強さ順：ロイヤル＞ストフラ＞4カード＞フルハウス＞フラッシュ＞ストレート＞3カード＞2ペア＞1ペア＞ハイカード',
    situationFn: () => '10種類の役の強さ順（弱→強）：\n1. ハイカード\n2. ワンペア\n3. ツーペア\n4. スリーカード\n5. ストレート\n6. フラッシュ\n7. フルハウス\n8. フォーカード\n9. ストレートフラッシュ\n10. ロイヤルストレートフラッシュ',
    speech: 'フラッシュ と ストレート、強いのは？',
    zazazoHint: '同じスート vs 連番',
    choices: [
      { id:'r1_a', text:'フラッシュ（5枚同スート）', correct:true },
      { id:'r1_b', text:'ストレート（5枚連番）', correct:false },
      { id:'r1_c', text:'同じ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'フラッシュ > ストレート。揃える確率はフラッシュの方が低い', rico:'<u>確率が低い役ほど強い</u>。フラッシュは約 0.2%、ストレートは約 0.4%' },
    onFail:    { panyu:0, mimi:'ストレートが強そうに見えました', rico:'<u>フラッシュの方が確率低い＝強い</u>。連番より同スート揃える方が難しいの' },
  },
  lesson_5_2: { id:'lesson_5_2', type:'lesson', chapter:5, chapterTitle:'第5章：役の強さ',
    rule:'同じ役同士はキッカー（次に強いカード）で決着',
    situationFn: () => '同じ役レベルなら「キッカー（脇のカード）」で勝敗が決まる。\n例：ワンペア(K) vs ワンペア(K)\nミミ：K-K-A-9-7、相手：K-K-Q-J-10\n→ <b>Aキッカーのミミ勝ち</b>',
    speech: 'ワンペア同士の勝敗は？',
    zazazoHint: 'ペアが同じなら次に注目',
    choices: [
      { id:'r2_a', text:'同ランクのペアならキッカー（残り3枚の最高ランク）で決まる', correct:true },
      { id:'r2_b', text:'手番が早い方が勝つ', correct:false },
      { id:'r2_c', text:'同じ役は引き分け', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'Kペア+Aキッカー > Kペア+Qキッカー', rico:'<u>Aキッカー持ちは最強</u>。Kペア + A は単なるKペアより強い' },
    onFail:    { panyu:0, mimi:'引き分けかと…', rico:'<u>キッカーで決まる</u>。だから手札にAやKを持つと「次の手」も強い' },
  },
  lesson_5_3: { id:'lesson_5_3', type:'lesson', chapter:5, chapterTitle:'第5章：役の強さ',
    rule:'狙うべき役は「フロップで何が出るか」で変わる。固執しない',
    situationFn: () => '<b>狙うべき役は場札次第</b>。\n・場札に同スート2枚 → フラッシュドロー狙い\n・場札に連番要素 → ストレート狙い\n・場札にペア → フルハウス／フォーカード狙い\n・場札がバラバラ → ハイペア・トップペア狙い\n固執せず、場札を見て柔軟に。',
    speech: '場札 9♥ 10♥ Q♥ で狙うべき役は？',
    zazazoHint: '3枚同スートあり、連番要素',
    choices: [
      { id:'r3_a', text:'フラッシュ／ストレート両狙い（自分の手札次第）', correct:true },
      { id:'r3_b', text:'必ずフォーカード', correct:false },
      { id:'r3_c', text:'必ずロイヤル', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'場札を見て柔軟に役を狙う', rico:'<u>場札の組み合わせを見て、自分が作れる最強の役を考える</u>のが上達のコツ' },
    onFail:    { panyu:0, mimi:'絶対的な狙う役があるかと', rico:'<u>場札次第で狙う役は変わる</u>。固定観念で動くと負ける' },
  },

  lesson_6_1: { id:'lesson_6_1', type:'lesson', chapter:6, chapterTitle:'第6章：確率と勝率',
    rule:'プリフロップのポケットペア最強：AA は全ランダム手に対して約85%勝率',
    situationFn: () => 'プリフロップ（手札2枚配布直後）の勝率目安：\n<b>AA</b>：約 85%（ランダム相手）\n<b>KK</b>：約 82%\n<b>AKスーテッド</b>：約 67%\n<b>22</b>：約 50-55%\n<b>72o（最弱手）</b>：約 35%',
    speech: '最強手 AA の勝率は？',
    zazazoHint: 'AAが負ける確率は？',
    choices: [
      { id:'p1_a', text:'約 85%（負ける確率は15%もある）', correct:true },
      { id:'p1_b', text:'100%確定勝利', correct:false },
      { id:'p1_c', text:'約 50%', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'AAでも15%負ける＝7回に1回は敗北', rico:'<u>絶対勝てる手はない</u>。AAでも15%は負ける。だから油断は禁物' },
    onFail:    { panyu:0, mimi:'100%だと思ってました', rico:'<u>ポーカーに100%は存在しない</u>。最強手でも負ける可能性は常にある' },
  },
  lesson_6_2: { id:'lesson_6_2', type:'lesson', chapter:6, chapterTitle:'第6章：確率と勝率',
    rule:'ドロー完成率：アウツ数×2（1枚）／×4（2枚）の簡易公式',
    situationFn: () => '<b>アウツ</b>＝役完成に必要な残り有効カードの数。\n<b>簡易公式</b>：\n・<b>残り1枚で完成</b>：アウツ × 2 ＝ 完成率(%)\n・<b>残り2枚で完成</b>：アウツ × 4 ＝ 完成率(%)\n\n例：フラッシュドロー（同スート4枚揃ってる）→ アウツ9 → 1枚で約18%、2枚で約36%',
    speech: 'フラッシュドロー、ターン＆リバー2枚での完成率は？',
    zazazoHint: 'アウツ9 × 4',
    choices: [
      { id:'p2_a', text:'約 35%（5回に2回くらい）', correct:true },
      { id:'p2_b', text:'約 80%（ほぼ完成）', correct:false },
      { id:'p2_c', text:'約 10%（ほぼ無理）', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'9×4=36%、5回に2回弱は完成', rico:'<u>9アウツ×4=36%</u>。意外と高いから、ポットオッズ次第でコール価値あり' },
    onFail:    { panyu:0, mimi:'もっと低いかと', rico:'<u>2枚あれば36%</u>。フラッシュドローは「割と当たる」って感覚で覚えとこ' },
  },
  lesson_6_3: { id:'lesson_6_3', type:'lesson', chapter:6, chapterTitle:'第6章：確率と勝率',
    rule:'ポットオッズ＝払う額 ÷ (ポット+払う額)。これより高い勝率ならコール',
    situationFn: () => '<b>ポットオッズの計算</b>：\nポット 200、相手のベット 100、自分のコール 100。\nコール後のポット総額 = 300。\n必要勝率 = 100 ÷ 300 ≒ 33%。\n→ 自分の勝率が33%以上なら、長期的にコール価値あり',
    speech: 'この状況で必要勝率は？',
    zazazoHint: '100/300 を計算',
    choices: [
      { id:'p3_a', text:'約 33%', correct:true },
      { id:'p3_b', text:'約 50%', correct:false },
      { id:'p3_c', text:'約 80%', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'33%＝3回に1回勝てればプラス', rico:'<u>必要勝率を計算してから、自分の勝率と比較してコール判断</u>。これがポットオッズ思考' },
    onFail:    { panyu:0, mimi:'計算苦手で…', rico:'<u>払う額÷(ポット+払う額)</u>。慣れたら一目で分かるよ' },
  },

  lesson_7_1: { id:'lesson_7_1', type:'lesson', chapter:7, chapterTitle:'第7章：定石（プリフロップ）',
    rule:'プリフロップは「手の強さ」と「ポジション」で参加判断',
    situationFn: () => 'プリフロップで参加すべき手の目安（簡易チャート）：\n<b>必ず参加</b>：AA, KK, QQ, JJ, AKs, AKo（10位以内）\n<b>状況により参加</b>：10-10〜2-2、AQ〜A2s、KQs〜KJs\n<b>降りる</b>：72o, 83o（最弱クラス）\nさらに<b>「後手（ポジション良い）」</b>なら参加範囲を広げて良い。',
    speech: '72o（7と2、別スーツ）の正しい行動は？',
    zazazoHint: '最弱手の扱い',
    choices: [
      { id:'pf_a', text:'プリフロップでフォールド（参加しない）', correct:true },
      { id:'pf_b', text:'必ずオールイン', correct:false },
      { id:'pf_c', text:'必ずレイズ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'弱い手は早く降りる＝損切り', rico:'<u>72oは「世界最弱」と呼ばれる手</u>。プリフロップで降りるのが正解' },
    onFail:    { panyu:0, mimi:'弱い手でも頑張る…？', rico:'<u>弱い手で頑張るのは負け筋</u>。降りる勇気もポーカーの実力' },
  },
  lesson_7_2: { id:'lesson_7_2', type:'lesson', chapter:7, chapterTitle:'第7章：定石（ベットの意味）',
    rule:'ベットには3つの目的：バリュー・ブラフ・プロテクション',
    situationFn: () => 'ベットには大きく3つの理由がある。\n<b>バリュー</b>：強い手でチップを引き出す\n<b>ブラフ</b>：弱い手でも強そうに見せて相手を降ろす\n<b>プロテクション</b>：自分のペアを守るため、相手のドローに代金を払わせる',
    speech: 'フラッシュドロー警報の場で、Aペアでベットする理由は？',
    zazazoHint: 'プロテクションの考え',
    choices: [
      { id:'be_a', text:'相手のフラッシュドローに代金を払わせて、降ろすか勝負する', correct:true },
      { id:'be_b', text:'必ずブラフ', correct:false },
      { id:'be_c', text:'必ず降ろし狙い', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'プロテクションベット = 安く見られたくない時', rico:'<u>「ドロー狙いに代金を払わせる」のが完成役の守り方</u>。チェックすると次のカードがタダで見えちゃう' },
    onFail:    { panyu:0, mimi:'プロテクションって初耳でした', rico:'<u>強い手こそベットして守る</u>。チェックしてドローを完成させたら本末転倒' },
  },
  lesson_7_3: { id:'lesson_7_3', type:'lesson', chapter:7, chapterTitle:'第7章：定石（ポジション）',
    rule:'後手（後にアクション）は情報量が多く、勝率5-10%相当の優位',
    situationFn: () => '<b>ポジション</b>＝ベット順序。\n後手（後にアクション）＝相手の動きを見てから判断できる。\n情報量の差は<b>勝率にして5-10%相当</b>と言われる、本物の優位。\nプロは「後手なら参加範囲を広げる」「先手なら絞る」が定石。',
    speech: 'ポジションを活かす正しい行動は？',
    zazazoHint: '情報の差を価値に',
    choices: [
      { id:'po_a', text:'後手なら参加範囲を広げ、先手なら絞る', correct:true },
      { id:'po_b', text:'位置に関係なく同じプレイ', correct:false },
      { id:'po_c', text:'先手の方が情報多くて有利', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'後手は情報アドバンテージ', rico:'<u>後手で得たヒントを「コール / レイズ / 降りる」の判断材料に使う</u>のがプロの基本' },
    onFail:    { panyu:0, mimi:'先手が有利かと思いました', rico:'<u>後手が有利</u>。アクション順の差は本物の戦略要素' },
  },

  lesson_8_1: { id:'lesson_8_1', type:'lesson', chapter:8, chapterTitle:'第8章：心理戦・読み',
    rule:'相手の手札を「1つに当てる」のではなく「レンジ（可能性の幅）」で考える',
    situationFn: () => '<b>レンジ思考</b>＝相手の手札を「これだ！」と1つに絞るのではなく、\n「<b>このベットならこういう手の可能性が高い</b>」と<b>幅</b>で捉える。\n例：プリフロップでレイズしてきた → 上位10位以内の手の可能性高い\nフロップで2/3ポット → 強いペア or ドロー or ブラフ',
    speech: '相手のベット読みで正しい考え方は？',
    zazazoHint: '1つに絞らない',
    choices: [
      { id:'r1_a', text:'1つに当てるのではなく、可能性の幅（レンジ）で捉える', correct:true },
      { id:'r1_b', text:'必ず1つに絞り込む', correct:false },
      { id:'r1_c', text:'相手の手は読めない、運だけ', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'レンジ思考は上達の第一歩', rico:'<u>「相手のレンジ」を考えるとブレない</u>。1つに絞ろうとすると外した時に弱い' },
    onFail:    { panyu:0, mimi:'1枚に絞らないとダメかと', rico:'<u>レンジ思考</u>＝確率的に考える。これがプロとアマの境界線' },
  },
  lesson_8_2: { id:'lesson_8_2', type:'lesson', chapter:8, chapterTitle:'第8章：心理戦・読み',
    rule:'ブラフ看破のコツ：言葉と行動の不一致、ベットサイズの違和感',
    situationFn: () => 'ブラフを見抜くサイン：\n1. <b>言葉と行動の不一致</b>（「弱いよ〜」と言いつつ大ベット）\n2. <b>ベットサイズが状況に合わない</b>（場札危険でない時の超大ベット）\n3. <b>過剰な強さアピール</b>（強い時ほど人は静かになる傾向）\n4. <b>連続したアクションの矛盾</b>（フロップ小さく、ターンで急に大きく）',
    speech: '「弱いカードだから降りなよ」と言いつつポット2/3ベット',
    zazazoHint: '言葉と行動どちらを信じる',
    choices: [
      { id:'r2_a', text:'言葉は無視、ベットサイズで判断（降ろし狙いの可能性高い）', correct:true },
      { id:'r2_b', text:'言葉通り信じて降りる', correct:false },
      { id:'r2_c', text:'相手が優しいので感謝してフォールド', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'言葉と行動のギャップ＝ブラフサイン', rico:'<u>「強く言って降ろす」典型ブラフ</u>。言葉は嘘つくけど、ベット額は嘘つきにくい' },
    onFail:    { panyu:0, mimi:'相手の言葉を信じてしまう…', rico:'<u>ベット額が真実</u>。言葉と矛盾してたら、行動を信じる' },
  },
  lesson_8_3: { id:'lesson_8_3', type:'lesson', chapter:8, chapterTitle:'第8章：心理戦・読み',
    rule:'ティルト（感情爆発状態）に陥らない／相手のティルトを利用する',
    situationFn: () => '<b>ティルト</b>＝バッドビートや連敗で感情的になり、判断が乱れる状態。\nプロでも陥る。\n<b>自分が陥らない</b>：感情を切り離して機械的に判断する\n<b>相手のティルト</b>：強気になりすぎてる相手から多くチップを引き出すチャンス',
    speech: '連敗してイライラしてる時の正解は？',
    zazazoHint: '冷静さ vs 取り返したさ',
    choices: [
      { id:'r3_a', text:'感情を切り離して機械的に判断、無理に取り返そうとしない', correct:true },
      { id:'r3_b', text:'すぐに大ベットして取り返す', correct:false },
      { id:'r3_c', text:'全ハンドオールイン', correct:false },
    ],
    onSuccess: { panyu:0, zazazo:0, hint:'ティルト = 負けの連鎖の入口', rico:'<u>「取り返したい」気持ちが命取り</u>。負けてる時こそタイトに、攻めるな' },
    onFail:    { panyu:0, mimi:'取り返したくなる気持ち…', rico:'<u>ティルトに乗ったら立て直せない</u>。一旦休んで冷静になるのが正解' },
  },

  velvet_opening: {
    id: 'velvet_opening',
    situationFn: () => `— 開幕心理戦 —\nまだカードは配られていない。ヴェルベットはあなたを見下ろし、低く笑った。`,
    speech: '新人が踏み込んでいい卓ではないわ。あなたはカードを見る前から、もう負けているの。',
    zazazoHint: 'ゾゾゾ反応：声が威圧的すぎる。「カードに関係ない」言葉に注目。',
    choices: [
      { id: 'already_lost',  text: '言われた通り、強い相手には最初から勝てない',            correct: false },
      { id: 'first_bluff',   text: 'これはカードではなく、こちらを萎縮させるための先制ブラフ', correct: true },
      { id: 'irrelevant',    text: '相手の言葉はゲームに関係ない',                          correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手は最初から圧をかけてくるタイプ。冷静を保てば勝機あり',
      rico: 'そうそう、それ。<u>カードじゃなくて心を降ろしに来てる</u>やつ。気持ちで負けたら本当に負けるからね',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう……カードを見る前から負けるとか、理不尽すぎません！？',
      rico: '圧に飲まれちゃダメだって。<u>大切なのはボードとレンジ</u>、相手の口じゃない',
    },
  },
  velvet_flop: {
    id: 'velvet_flop',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nヴェルベットは2/3ポット以上をベット。`,
    speech: 'この程度のボード、怖がる理由はないわ。',
    zazazoHint: 'ゾゾゾ反応：「怖がる理由はない」と言いつつ、なぜか大きく賭けている',
    choices: [
      { id: 'safe_board',     text: '怖くないと言っているので、場札は本当に安全',                              correct: false },
      { id: 'danger_pushout', text: '場札に危険要素があるのに強く出ている。降ろしに来ている可能性が高い',          correct: true },
      { id: 'big_always_made',text: '大きくベットした相手は必ず完成役を持っている',                            correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手レンジ：強いペア / ドロー / ブラフ混じり',
      rico: 'いいねー。<u>言葉と行動のズレを読む</u>のがブラフ看破の第一歩だよ',
    },
    onFail: {
      panyu: -10,
      mimi: '安全って言われたから安心しちゃった……',
      rico: '相手の<u>口先より、ベットサイズと場札を信じな</u>。言葉は嘘つくよ',
    },
  },
  velvet_turn: {
    id: 'velvet_turn',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nターンで新しい札が出た。ヴェルベットが急にベットサイズを上げた。`,
    speech: '流れは最初から私のものだったわ。',
    zazazoHint: 'ゾゾゾ反応：「最初から」を強調するが、ベットの変化はターン後',
    choices: [
      { id: 'turn_changed', text: '最初から強かったのではなく、ターンの危険札で状況が変わった可能性が高い', correct: true },
      { id: 'always_strong', text: '相手がそう言うなら、最初から負けていた',                            correct: false },
      { id: 'turn_irrelevant', text: 'ターンのカードは勝負に関係ない',                                 correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: 'ターン後にベットアップ → ターンの札で何かが変わった証拠',
      rico: 'そう、<u>ベットサイズの変化は感情の変化</u>。「最初から強かった」は後付けの可能性高い',
      evidenceUnlocked: 'turn_bet_increase',
    },
    onFail: {
      panyu: -10,
      mimi: '最初から私が負けてた……ということ？',
      rico: 'ベットが変わったタイミングを覚えて。後で証拠になるよ',
    },
  },
  // 証拠突きつけ型（最終心理バトル）
  velvet_river_evidence: {
    id: 'velvet_river_evidence',
    isEvidence: true,
    situationFn: () => `— 最終心理戦：証拠突きつけ —\nヴェルベットの主張：「私は最初から完成した手だったのよ。あなたが迷っていただけ」\n\nミミ、ログから「最初から強くなかった」証拠を1つ選んで突きつけて。`,
    speech: '私は最初から完成した手だったのよ。あなたが迷っていただけ。',
    zazazoHint: '勝負の中で起きた変化のタイミングを思い出して',
    choices: [
      { id: 'flop_small_bet',     text: 'フロップ時の小ベット — 序盤では大きく踏み込んでいなかった記録', correct: true },
      { id: 'turn_danger_card',   text: 'ターンで出た危険札 — 勝負の流れが変わった可能性のあるカード', correct: true },
      { id: 'turn_bet_increase',  text: 'ターン後のベットサイズ上昇 — 急に強気になった記録',          correct: true },
      { id: 'river_long_speech',  text: 'リバー後の長い発言 — 追い詰められた時に言葉が増えた記録',     correct: false },
      { id: 'zazazo_log',         text: 'ゾゾゾ反応ログ — 勝負空気に違和感が出た記録',                 correct: false },
    ],
    onSuccess: {
      panyu: 30, zazazo: 2,
      hint: '相手は最初から完成役だったとは限らない。最終ベットは強気にいける',
      rico: '見えたね！<u>後付けの主張は証拠と食い違う</u>。ヴェルベットの強がりが崩れた',
      bluffBreak: true,
    },
    onFail: {
      panyu: -10,
      mimi: 'うう……まだ証拠の繋がりが見えていません……',
      rico: 'リバー後の長口や違和感ログだけじゃ「最初から弱かった」証明にならない。<u>ターン以降の変化</u>を突くのが鍵',
    },
  },
  polka_flop_bluff: {
    id: 'polka_flop_bluff',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nポルカは2/3ポット以上をベットしてきた……`,
    speech: 'へへっ、その顔、もう負けてるって感じだね！',
    zazazoHint: 'ゾゾゾ反応：チップを置く手が雑',
    choices: [
      { id: 'must_made',      text: 'ポルカは必ず完成役を持っている',                     correct: false },
      { id: 'bluff_push_out', text: '強く見せて、ミミを降ろしに来ている可能性がある',       correct: true  },
      { id: 'ignore_board',   text: '場札が弱いので何も考えなくていい',                   correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手レンジ：弱いペア / ノーペアブラフ / ドロー少し',
      rico: 'そうそう。強い言葉ほど、弱さを隠してる時があるってやつ',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう……今のはブラフだったかも……！',
      rico: '外してもOK〜。なんで外したか覚えれば、次は読めるよ',
    },
  },
};

function renderCardsText(cards) {
  return cards.map(c => `${c.label}${c.suit}`).join(' ');
}

//=============================================================
// 6. ゲーム状態
//=============================================================
let state = null;
function defaultState() {
  return {
    screen: 'title',
    opponentId: 'polka',
    opponentName: 'ポルカ',
    opponentProfile: POLKA_PROFILE,
    opponentImgKey: 'polka',
    tutorialMode: false,
    tutorialStep: '',
    maxHands: 3,
    handNo: 0,
    playerChips: 1000,
    opponentChips: 1000,
    pot: 0,
    deck: [],
    community: [],
    playerHand: [],
    opponentHand: [],
    panyu: 0,
    panyuMax: 100,
    zazazo: 0,
    zazazoMax: 5,
    panyuSenseFreeUsed: false,
    handPhase: 'idle',  // idle | preflop | flop | turnRiver | showdown
    handResults: [],
    psychSuccessCount: 0,
    bestHandRank: -1,
    bestHandName: '-',
    bluffBreakHappened: false,
    coinsEarned: 0,
    // v4 C1: ログ機能（Phase1から記録、画面表示は不要）
    logs: { actions: [], bets: [], reactions: [], psych: [] },
    // 思考UI
    mimiThought: '「ふぅ……まずは手札を見てから」',
    ricoAdvice: '「いい？相手の言葉を、まず聞いてみな」（リコ先輩）',
    opponentSpeech: '',
    // 現在ハンドの状態
    currentBetPlayer: 0,
    currentBetOpponent: 0,
    isPlayerTurn: true,
    psychPending: false,
    psychResolved: false,
    finalBetOpen: false,
    score: 0,
  };
}

function log(category, entry) {
  state.logs[category].push({ t: Date.now(), hand: state.handNo, ...entry });
}

//=============================================================
// 7. 画面レンダリング
//=============================================================
const app = document.getElementById('app');

function render() {
  switch (state.screen) {
    case 'title':       renderTemplate('tpl-title'); applyTitleButtons(); break;
    case 'stageSelect': renderTemplate('tpl-stage-select'); applyBindings(); tryStartLobbyBgm(); break;
    case 'battle':      renderTemplate('tpl-battle'); applyBindings(); break;
    case 'result':      renderTemplate('tpl-result'); applyBindings(); break;
    case 'shop':        renderTemplate('tpl-shop'); applyBindings(); bindShop(); break;
    case 'ending':      renderTemplate('tpl-ending'); startEndingShow(); break;
  }
  bindActions();
}

function renderTemplate(id) {
  const tpl = document.getElementById(id);
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));
}

function applyTitleButtons() {
  const el = document.querySelector('[data-bind="titleButtons"]');
  if (!el) return;
  const hasSave = save.clearedStages.length > 0 || save.coins > 0;
  if (hasSave) {
    el.innerHTML = `
      <button class="btn btn-primary" data-action="start">続きから</button>
      <button class="btn btn-ghost" data-action="new-game">新しく始める</button>
      <div class="title-save-info">セーブ：クリア ${save.clearedStages.length}件 / ${save.coins}コイン所持</div>
    `;
  } else {
    el.innerHTML = `<button class="btn btn-primary" data-action="start">はじめから</button>`;
  }
}

function applyBindings() {
  // data-bind 属性の要素を埋める
  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.dataset.bind;
    switch (key) {
      case 'handNo': el.textContent = state.handNo || 1; break;
      case 'maxHands': el.textContent = state.maxHands; break;
      case 'opponentName': el.textContent = state.opponentName; break;
      case 'opponentChips': el.textContent = state.opponentChips; break;
      case 'playerChips': el.textContent = state.playerChips; break;
      case 'pot':
        el.textContent = state.pot;
        const potDisp = el.closest('.pot-display');
        if (potDisp) {
          potDisp.classList.toggle('big-pot', state.pot >= 1000);
          potDisp.classList.toggle('huge-pot', state.pot >= 2500);
        }
        break;
      case 'potCoinStack': el.innerHTML = renderChipStack(state.pot, 'pot'); break;
      case 'opponentBetChips': el.innerHTML = state.currentBetOpponent > 0 ? renderChipStack(state.currentBetOpponent, 'bet') : ''; break;
      case 'playerBetChips':   el.innerHTML = state.currentBetPlayer   > 0 ? renderChipStack(state.currentBetPlayer,   'bet') : ''; break;
      case 'panyuValue': el.textContent = state.panyu; break;
      case 'panyuMax': el.textContent = state.panyuMax; break;
      case 'panyuFill': el.style.width = `${(state.panyu / state.panyuMax) * 100}%`; break;
      case 'panyuPips': el.innerHTML = renderPanyuPips(); break;
      case 'panyuMood': el.textContent = panyuMood(state.panyu, state.panyuMax); break;
      case 'opponentChipBar': el.style.width = `${chipBarPct(state.opponentChips)}%`; break;
      case 'playerChipBar': el.style.width = `${chipBarPct(state.playerChips)}%`; break;
      case 'zazazoFill': el.style.width = `${(state.zazazo / state.zazazoMax) * 100}%`; break;
      case 'zazazoText': el.textContent = zazazoLabel(state.zazazo); break;
      case 'mimiThought': el.textContent = state.mimiThought; break;
      case 'ricoAdvice': el.innerHTML = state.ricoAdvice; break;
      case 'opponentSpeech': el.textContent = state.opponentSpeech; break;
      case 'opponentBet': el.innerHTML = renderOpponentBet(); break;
      case 'currentHandName': el.innerHTML = renderCurrentHandName(); break;
      case 'opponentBetLabel': el.textContent = state.opponentName || '相手'; break;
      case 'opponentBetAmount': {
        const v = state.currentBetOpponent;
        el.textContent = v > 0 ? `+${v}` : '—';
        const side = el.closest('.bet-side');
        if (side) side.classList.toggle('empty', v === 0);
        break;
      }
      case 'playerBetAmount': {
        const v = state.currentBetPlayer;
        el.textContent = v > 0 ? `+${v}` : '—';
        const side = el.closest('.bet-side');
        if (side) side.classList.toggle('empty', v === 0);
        break;
      }
      case 'communityCards': renderCardsInto(el, state.community, 5); break;
      case 'playerHand': renderCardsInto(el, state.playerHand, 2); break;
      case 'psychLog': renderPsychLog(el); break;
      case 'actionArea': renderActionArea(el); break;
      case 'coins': el.textContent = state.coinsEarned || 0; break;
      case 'saveCoins': el.textContent = save.coins; break;
      case 'stageList':
        el.innerHTML = renderStageList();
        // 動的innerHTMLで失われたクリックハンドラを再付与
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        break;
      case 'lobbyRicoLine': el.textContent = lobbyRicoLine(); break;
      case 'lobbyStats': el.innerHTML = renderLobbyStats(); break;
      case 'lobbySettings': el.innerHTML = renderLobbySettings();
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        break;
      case 'lobbyRicoImg': {
        const o = pickLobbyRico();
        el.onerror = function() {
          // バリエーション画像が無ければ default にフォールバック
          this.onerror = function() { window.assetFallback(this, 'rico'); };
          this.src = 'assets/characters/rico_default.png';
        };
        el.src = `assets/characters/${o.file}`;
        break;
      }
      case 'lobbyRicoOutfit': el.textContent = pickLobbyRico().label; break;
      case 'lobbyBgmLabel': el.textContent = !save.bgmOn ? '♪ —（停止中）' : '♪ Lounge Jazz — Velvet Night'; break;
      case 'lobbyBgmVolume':
        el.value = save.bgmVolume != null ? save.bgmVolume : 35;
        el.oninput = (e) => {
          save.bgmVolume = +e.target.value;
          saveProgress();
          applyBgmVolume();
        };
        break;
      case 'backdoorBtn':
        el.style.display = save.backdoorUnlocked ? 'flex' : 'none';
        el.classList.toggle('on', !!save.backdoorOn);
        break;
      case 'backdoorPanel':
        el.style.display = (save.backdoorUnlocked && save.backdoorOn) ? 'block' : 'none';
        el.innerHTML = renderBackdoorPanel();
        break;
      case 'shopItems': el.innerHTML = renderShopItems('panyu'); break;
      case 'ricoShopComment': /* default initial */ break;
      case 'opponentImg':
        el.onerror = function() { window.assetFallback(this, state.opponentImgKey); };
        el.src = `assets/characters/${state.opponentImgKey}_default.png`;
        break;
    }
  });
}

// 双方共通の絶対基準でチップバー割合を計算
// 初期チップの2倍を100%とする → ハンド進行で増えても変わらない統一基準
function chipBarPct(chips) {
  const base = (OPPONENTS[state.opponentId]?.chips || 1000) * 2;
  return Math.max(0, Math.min(100, (chips / base) * 100));
}

//=============================================================
// エピソードタイトルカード（長文ラノベタイトル方式）
//=============================================================
const EPISODES = {
  rico_tutorial: {
    id: 'episode_001_title',
    no: '第1話',
    bg: 'bg_bunny_locker_room',
    title:
      'デスマーチ明けにトラック転生した私が、\n' +
      '目覚めた瞬間なぜか異世界カジノの新人バニーガールで、\n' +
      '耳も尻尾も本物なのに誰もそこを深刻に受け止めてくれず、\n' +
      '先輩バニーから「登録されてるなら働けるっしょ」と雑に流され、\n' +
      '労働契約も世界観説明も制服返却の相談もできないままポーカー卓に連行され、\n' +
      '初日研修としてブラフの見抜き方まで覚えさせられている件',
    scene:
      '異世界カジノのバニー更衣室。\n' +
      '鏡の前で、自分のバニー姿・本物の耳・尻尾に固まるミミ。\n' +
      '背後ではリコ先輩が軽く手を振りながら、もう出勤する前提で待っている。\n' +
      '明るく華やかだが、ミミだけが世界の理不尽に取り残されている構図。',
  },
  polka: {
    id: 'episode_002_title',
    no: '第2話',
    bg: 'bg_beginner_poker_table',
    title:
      '異世界カジノの新人バニーとして初日からポーカー卓に座らされた私は、\n' +
      'そもそもワンペアとツーペアのありがたみすらまだ体に染み込んでいないのに、\n' +
      '声が大きい時ほど弱くて強い時ほど静かになるという初心者なのに初心者を惑わせる才能だけは一人前のポルカに絡まれ、\n' +
      '「へへっ、新人バニーちゃんが相手？ 今日はツイてるなー！」と失礼なことを言われ、\n' +
      'さらに大きなベットと大きな態度と大きな鼻息で降ろされそうになったところ、\n' +
      'リコ先輩から「勝つことだけ考えると負けるよ。降りるのも技術だからね」と雑に深い助言を投げられ、\n' +
      'いやその技術を今から身につけるには現場が実戦すぎませんかと思っていたら、\n' +
      '外れスキル《ぱにゅぱにゅ》が耳と尻尾を勝手に反応させ、\n' +
      '相手の手札は見えないのにチップを置いた指先の逃げ方だけは妙にはっきり見えてしまい、\n' +
      'ポーカー初心者のくせに初めての心理バトルでブラフ看破までやらされる件',
    scene:
      '初心者向けポーカー卓。\n' +
      'ミミは困惑しながらカードを持ち、耳がぴくっと反応している。\n' +
      '正面のポルカは大げさに笑いながらチップを押し出しているが、指先だけ少し逃げている。\n' +
      'リコ先輩は横で腕を組み、軽い表情ながら目だけは鋭く卓を見ている。',
  },
  selina: {
    id: 'episode_003_title',
    no: '第3話',
    bg: 'bg_calm_poker_table',
    title:
      'ポルカのブラフをなんとか見抜いて調子に乗りかけた新人バニーの私が、\n' +
      '次こそ少しは楽な相手かと思ったら今度は声を荒げないし態度も崩さないしベット額まで妙に理屈っぽい常連プレイヤーのセリナと当たってしまい、\n' +
      '「このボードなら、強く出る理由はあります」などと落ち着いた声で言われ、\n' +
      'いや理由があるのは分かりましたけどその理由を新人にも分かる日本語で説明してもらえませんかと思いながら、\n' +
      '同じマークが並んだ場札と大きすぎず小さすぎない嫌なベットサイズに耳をぴくぴくさせ、\n' +
      '強い手かブラフか以前に"この場札がどれくらい危ないのか"と"相手がどんな金額で何をさせたいのか"を同時に覚えさせられる件',
    scene:
      '常連向けの落ち着いたポーカー卓。\n' +
      'セリナは冷静な表情で、整ったチップの山を前に静かにベットしている。\n' +
      '場札には同じマークが複数並び、危険な雰囲気。\n' +
      'ミミはカードと場札を交互に見ながら、理解しかけているがまだ不安そう。\n' +
      'リコ先輩は後ろから小さく指を立て、「場を見な」と示している。',
  },
  grano: {
    id: 'episode_004_title',
    no: '第4話',
    bg: 'bg_merchant_poker_table',
    title:
      '場札の危なさとベットサイズのいやらしさを覚えたばかりの新人バニーの私が、\n' +
      '今度こそ普通にカードの強さだけで勝負できると思ったら、\n' +
      'ポーカー卓に現れたのは何でも商談と値付けで考える商人プレイヤーのグラーノで、\n' +
      '「お嬢さん、この一枚を見るだけなら安いものですよ」と優しそうな顔でチップを要求され、\n' +
      '安いと言われると安い気がするけどそもそも私の財布感覚は異世界通貨に対応していないし、\n' +
      'リコ先輩からは「ポットと支払額を比べてみな」と言われ、\n' +
      'いや新人研修初日に接客と転生とポーカーと割引率の計算を同時にさせるのは業務範囲が広すぎませんかと思いながら、\n' +
      '見たい気持ちと払いたくない気持ちの間で耳をふるふるさせ、\n' +
      '"安く見えるベット"が本当に得なのか、それとも高い授業料なのかを計算させられる件',
    scene:
      '商人風の豪華なポーカー卓。\n' +
      '金貨、値札風の装飾、きらびやかなチップが並ぶ。\n' +
      'グラーノは柔和な商人笑顔でカードを示し、いかにもお得そうにチップを誘導している。\n' +
      'ミミはカードを見たい気持ちとチップを失いたくない気持ちで揺れている。\n' +
      'リコ先輩は横で冷静に、ポットと支払額を見比べるよう促している。',
  },
  velvet: {
    id: 'episode_005_title',
    no: '第5話',
    bg: 'bg_vip_room',
    title:
      'ブラフも場札の危険度もポットオッズもなんとなく分かった気になっていた新人バニーの私が、\n' +
      'そろそろ研修終了かなと思った瞬間に案内されたのはどう見ても新人が入っていい空気ではないVIPルームで、\n' +
      'そこにいた妖艶すぎる悪徳ディーラーのヴェルベットから、\n' +
      '「新人が踏み込んでいい卓ではないわ。あなたはカードを見る前から、もう負けているの」とカードゲームなのにカードを見る前から精神を削られ、\n' +
      '相手のベット額も言葉も視線も全部が怖く見える中で、\n' +
      'リコ先輩からは「言葉じゃなくて、積み重なった証拠を見な」といつになく真面目な声で言われ、\n' +
      'いや証拠って言われても私は転生初日の新人バニーであって名探偵でも百戦錬磨の勝負師でもないんですがと思いながら、\n' +
      'これまで覚えたブラフ、場札、ベットサイズ、割に合う判断を全部つなぎ合わせ、\n' +
      '相手が本当に強い時にしていることと強く見せたい時にしていることの違いを突きつけて、\n' +
      '外れスキル《ぱにゅぱにゅ》で初めてブラフブレイクまで叩き込む件',
    scene:
      '高級で妖艶なVIPルーム。\n' +
      'ヴェルベットは余裕の笑みでカードを扱い、ミミを見下ろすように座っている。\n' +
      'テーブルには高額チップ、赤黒の照明、緊張感のあるカード配置。\n' +
      'ミミは緊張で少し固まりながらも、耳と尻尾が《ぱにゅぱにゅ》に反応し、目だけは真剣。\n' +
      'リコ先輩は背後で静かに見守り、普段より真面目な表情。',
  },
  ending: {
    id: 'episode_006_title',
    no: '第6話',
    bg: 'bg_resort_terrace',
    title:
      '新人研修という名目で転生直後からポーカー卓に連行され、\n' +
      '調子乗り初心者のブラフを見抜き、理屈っぽい常連の場札圧に耐え、商人プレイヤーの"安いですよ"攻撃で計算力を酷使し、\n' +
      '最後にはVIPルームの悪徳ディーラー相手にカードより先に心を折られかけながらも、\n' +
      '外れスキル《ぱにゅぱにゅ》とリコ先輩の雑だけど的確な助言と社畜時代に鍛えられた障害対応じみた観察力でなんとか勝ち抜いた私は、\n' +
      'ようやく一息つけると思ったのに、\n' +
      'リコ先輩から「じゃ、次は交換所と衣装解放と高難度卓ね」と言われ、\n' +
      '異世界カジノの新人バニー生活がまだチュートリアルの入口にすぎなかったことを知ってしまう件',
    scene:
      'リゾートテラス。\n' +
      '夜景の見える開放的な場所で、ミミがチップを抱えてへたり込んでいる。\n' +
      '耳と尻尾は疲れ気味だが、表情には少し達成感がある。\n' +
      'リコ先輩は隣でドリンクを持ちながら、次の予定を当然のように告げている。\n' +
      '遠くにはカジノの明かりと、まだ挑戦していない高難度卓のシルエットが見える。',
  },
};

function showEpisodeTitle(key, onContinue) {
  const ep = EPISODES[key];
  if (!ep) { if (onContinue) onContinue(); return; }
  const overlay = document.createElement('div');
  overlay.className = `episode-overlay ep-bg-${ep.bg}`;
  const imgPath = `assets/episodes/${key}.png`;
  const probe = new Image();
  probe.onload = () => {
    overlay.style.backgroundImage = `url('${imgPath}')`;
    overlay.classList.add('has-art');
  };
  probe.src = imgPath;
  overlay.innerHTML = `
    <div class="episode-card episode-card-bottom">
      <div class="episode-no">${ep.no}　<small class="episode-hint">（背景をクリックで絵だけ表示）</small></div>
      <h1 class="episode-title">${ep.title.replace(/\n/g, '<br>')}</h1>
      <button class="btn btn-primary big episode-continue">▶ 開始</button>
    </div>
  `;
  // ステージ内に挿入（1280×800の最大背景にフィット）
  const stage = document.getElementById('stage');
  (stage || document.body).appendChild(overlay);
  const continueBtn = overlay.querySelector('.episode-continue');
  continueBtn.addEventListener('click', () => {
    overlay.classList.add('out');
    setTimeout(() => {
      overlay.remove();
      if (onContinue) onContinue();
    }, 400);
  });
  // カード外クリックで絵だけ表示モードをトグル
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.toggle('art-only');
    }
  });
}

//=============================================================
// ステージ・ショップ
//=============================================================
const STAGE_ORDER = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];

function isStageUnlocked(stageId) {
  if (stageId === 'rico_tutorial') return true;
  if (stageId === 'polka') return true;
  if (stageId === 'selina') return save.clearedStages.includes('polka');
  if (stageId === 'grano') return save.clearedStages.includes('selina');
  if (stageId === 'velvet') return save.clearedStages.includes('grano');
  return false;
}

function renderStageList() {
  return STAGE_ORDER.map((sid, i) => {
    const opp = OPPONENTS[sid];
    const unlocked = isStageUnlocked(sid);
    const cleared = save.clearedStages.includes(sid);
    const bestRank = save.bestRanks[sid];
    const recommend = sid === 'rico_tutorial' && save.clearedStages.length === 0;
    const stageNum = i + 1;
    const portrait = `<div class="stage-portrait">
      <img src="assets/characters/${opp.imgKey}_default.png" alt="${opp.name}" onerror="window.assetFallback(this,'${opp.imgKey}')">
    </div>`;
    if (!unlocked) {
      return `<div class="stage-card locked">
        <div class="stage-portrait locked-portrait"><div class="silhouette">?</div></div>
        <div class="stage-card-body">
          <div class="stage-number">Stage ${stageNum}</div>
          <div class="stage-name">??? ${opp.isBoss ? '🔱' : ''}</div>
          <div class="stage-theme">${opp.theme}</div>
          <div class="stage-locked-tag">🔒 前のステージをクリアで解放</div>
        </div>
      </div>`;
    }
    return `<div class="stage-card ${recommend ? 'recommended' : ''} ${cleared ? 'cleared' : ''} ${opp.isBoss ? 'boss-stage' : ''}">
      ${portrait}
      <div class="stage-card-body">
        <div class="stage-tags-row">
          ${opp.isBoss ? '<span class="stage-tag boss-tag">BOSS</span>' : ''}
          ${recommend ? '<span class="stage-tag">おすすめ</span>' : ''}
          ${cleared ? `<span class="stage-tag clear-tag">クリア済 ${bestRank || ''}</span>` : ''}
        </div>
        <div class="stage-number">Stage ${stageNum}</div>
        <div class="stage-name">${opp.name}</div>
        <div class="stage-theme">学習：${opp.theme}</div>
        <div class="stage-desc">${opp.desc}</div>
        <div class="stage-reward">初回報酬：${opp.rewardFirst}コイン${cleared ? '<small>（取得済み）</small>' : ''}</div>
        <div class="stage-actions">
          <button class="btn btn-primary" data-action="battle-start" data-opponent="${sid}">${
            sid === 'rico_tutorial'
              ? (cleared ? 'もう一度受講' : 'チュートリアル開始')
              : (cleared ? '再戦' : '対戦開始')
          }</button>
          ${(sid === 'rico_tutorial' && cleared) ? `<button class="btn btn-secondary" data-action="battle-rico-serious" title="チュートリアル無しで本気のリコ先輩と対戦">🔥</button>` : ''}
          ${cleared && EPISODES[sid] ? `<button class="btn btn-ghost stage-recall" data-action="recall-episode" data-episode="${sid}" title="エピソードタイトル回想">📜</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ロビー：リコ先輩の衣装バリエーション（assetsに置いた分だけ抽選対象になる）
const RICO_OUTFITS = [
  { file: 'rico_default.png',  label: '制服',         lines: ['「次の卓、選んじゃって」', '「今日も頑張ろ」'] },
  { file: 'rico_pajama.png',   label: 'パジャマ',     lines: ['「ふぁ……まだ眠いんだけど」', '「夜更かしは禁物よ……」', '「布団恋しい……」'] },
  { file: 'rico_bunny.png',    label: 'バニー',       lines: ['「お仕事モード、入りまーす」', '「お客様、卓へどうぞ」', '「ぴょん、ぴょん」'] },
  { file: 'rico_casual.png',   label: '私服',         lines: ['「オフの私もよろしくね」', '「これ、新しく買ったの」', '「街、ぶらつかない？」'] },
  { file: 'rico_dress.png',    label: 'ドレス',       lines: ['「今夜は……特別ね」', '「VIPルーム、覚悟は？」', '「アタシ、決めるときは決めるの」'] },
  { file: 'rico_kimono.png',   label: '和装',         lines: ['「たまには、しっとりと」', '「お抹茶、いる？」'] },
  { file: 'rico_swimsuit.png', label: '水着',         lines: ['「夏ね、夏」', '「日焼け止め塗った？」'] },
  { file: 'rico_gym.png',      label: 'ジム服',       lines: ['「鍛えてる、最近」', '「メンタルも筋肉よ」'] },
  { file: 'rico_school.png',   label: '制服（学生風）', lines: ['「先輩感、出てる？」', '「放課後、寄ってく？」'] },
  { file: 'rico_witch.png',    label: '魔女',         lines: ['「ハロウィン気分」', '「呪い、かけちゃおっか？」'] },
  { file: 'rico_santa.png',    label: 'サンタ',       lines: ['「メリクリ、ミミ」', '「プレゼント、何が欲しい？」'] },
];

function pickLobbyRico() {
  // セッションごとに変える（ロビー表示時に1回決める）
  if (!state.lobbyRicoIndex || state.lobbyRicoChangedAt !== state.screen) {
    state.lobbyRicoIndex = Math.floor(rand() * RICO_OUTFITS.length);
    state.lobbyRicoChangedAt = state.screen;
  }
  return RICO_OUTFITS[state.lobbyRicoIndex];
}

// ロビー：リコ先輩の状況別セリフ
function lobbyRicoLine() {
  const cleared = save.clearedStages.length;
  const lines = [];
  if (cleared === 0)               lines.push('「ようこそ、ミミ。まずはチュートリアルからね」');
  else if (!save.clearedStages.includes('polka'))   lines.push('「ポルカちゃんはブラフの入口。落ち着いて行こ」');
  else if (!save.clearedStages.includes('selina'))  lines.push('「セリナはボードを読む練習にぴったりよ」');
  else if (!save.clearedStages.includes('grano'))   lines.push('「グラーノ相手はポットオッズの感覚を養う卓ね」');
  else if (!save.clearedStages.includes('velvet'))  lines.push('「ヴェルベット……VIPルームに入る準備、できた？」');
  else                                              lines.push('「全卓制覇、お見事。気が向いたら再戦どうぞ」');
  if (save.coins >= 500) lines.push('「コイン貯まってきたじゃない。交換所、覗いてみる？」');
  if (save.coins < 100 && cleared > 0) lines.push('「軍資金が心許ないわね。再戦で稼ぐのもアリよ」');
  // 衣装ごとの一言も混ぜる
  const outfit = pickLobbyRico();
  if (outfit?.lines?.length) lines.push(pick(outfit.lines));
  return pick(lines);
}

function renderLobbySettings() {
  const psy = save.psychEnabled !== false;
  const log = save.logicEnabled !== false;
  return `
    <div class="settings-title">⚙ 設定 <span class="settings-note-inline">※チュートリアル中は常時ON</span></div>
    <div class="settings-grid">
      <div class="settings-row">
        <span class="settings-label">心理</span>
        <button class="settings-toggle ${psy ? 'on' : 'off'}" data-action="toggle-psych">
          <span class="settings-knob"></span>
          <span class="settings-status">${psy ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <div class="settings-row">
        <span class="settings-label">論理</span>
        <button class="settings-toggle ${log ? 'on' : 'off'}" data-action="toggle-logic">
          <span class="settings-knob"></span>
          <span class="settings-status">${log ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  `;
}

function renderLobbyStats() {
  const wins = save.clearedStages.length;
  const totalStages = STAGE_ORDER.length;
  const ranks = Object.values(save.bestRanks || {});
  const rankOrder = ['SS','S','A','B','C'];
  let topRank = '—';
  for (const r of rankOrder) { if (ranks.includes(r)) { topRank = r; break; } }
  const panyuLv = (save.panyuSkills?.senseLevel || 1);
  const rangeLv = (save.panyuSkills?.rangeLevel || 1);
  const gaugeMax = save.panyuGaugeMax || 100;
  return `
    <div class="stats-title">⚔ プレイヤーステータス</div>
    <ul class="stats-list">
      <li><span class="stats-label">攻略</span><span class="stats-value">${wins} / ${totalStages}</span></li>
      <li><span class="stats-label">所持コイン</span><span class="stats-value">${save.coins}</span></li>
      <li><span class="stats-label">最高ランク</span><span class="stats-value rank-${topRank}">${topRank}</span></li>
      <li><span class="stats-label">ぱにゅぱにゅ</span><span class="stats-value">Lv${panyuLv}</span></li>
      <li><span class="stats-label">レンジ視</span><span class="stats-value">Lv${rangeLv}</span></li>
      <li><span class="stats-label">ゲージ上限</span><span class="stats-value">${gaugeMax}</span></li>
    </ul>
  `;
}

const SHOP_ITEMS = [
  { id: 'panyu_sense_lv2',     cat: 'panyu', name: 'ぱにゅぱにゅLv2',         price: 300, desc: '心理バトルのハズレ選択肢を1つグレーアウトして選べなくする' },
  { id: 'panyu_range_lv2',     cat: 'panyu', name: 'ぱにゅレンジLv2',         price: 500, desc: '心理バトル成功後の相手レンジ表示が詳しくなる' },
  { id: 'panyu_gauge_plus_20', cat: 'panyu', name: 'ぱにゅゲージ上限+20',      price: 900, desc: 'ぱにゅゲージの最大値が100→120に' },
  { id: 'note_board_danger',   cat: 'note',  name: 'ボード危険度メモ',         price: 250, desc: '場札がフラッシュ/ストレート注意の時、ミミ思考に表示される' },
  { id: 'note_pot_odds',       cat: 'note',  name: 'ポットオッズ入門',         price: 350, desc: 'コール判断時に「割に合う/合わない」目安を表示' },
  { id: 'note_bet_size',       cat: 'note',  name: 'ベットサイズ講座',         price: 300, desc: 'ベットボタンの説明が詳しくなる' },
  { id: 'skin_red_gold_card',  cat: 'skin',  name: '赤金カジノカード',         price: 300, desc: 'カード裏デザインを赤金カジノ風に変更' },
  { id: 'table_vip',           cat: 'skin',  name: 'VIPポーカーテーブル',     price: 500, desc: 'テーブル背景をVIP風に変更' },
  { id: 'memory_ending',       cat: 'memory', name: 'エンディング映像',        price: 500, desc: 'クリア後限定。あの感動のエンディングを何度でも視聴可能に', requires: 'ending' },
  { id: 'memory_ending_theme', cat: 'memory', name: '主題歌：ポーカーフェイスの終わり〜変な件〜', price: 400, desc: 'クリア後限定。エンディング主題歌を何度でも視聴可能に', requires: 'ending' },
];

const SHOP_COMMENTS = {
  panyu_sense_lv2:     'ふむ、迷うお嬢さんにこそ、これ。ハズレを1枚お引きしますから、お買い得ですよ',
  panyu_range_lv2:     'レンジが見える品、と言いましょうか。次の一手の読みが冴える、中級者向けの逸品ですな',
  panyu_gauge_plus_20: '長くお遊びになるなら、上限拡張は必須。お買い得な投資です',
  note_board_danger:   '危険信号を教える、いわば早期警戒装置ですな。セリナさん戦の前に揃えると、ずいぶん楽ですよ',
  note_pot_odds:       'ふふ、私の専門分野ですな。「安いか、高いか」が即座に見える品。私との商談で必要になりますよ',
  note_bet_size:       'ベットの作法をおさらいできる、初心者向けの基礎教材です。お得ですよ',
  skin_red_gold_card:  '見た目重視のお嬢さんに。テーブルが華やぎますよ',
  table_vip:           'VIPのお客様気分でお楽しみいただける一品。気分転換にぜひ',
  memory_ending:       'これは特別な品ですよ。あの夜の決着を、何度でも振り返れる映像です',
  memory_ending_theme: 'あの夜を彩った主題歌……何度でも聴き返したくなる一曲ですよ',
};

function renderShopItems(cat) {
  const items = SHOP_ITEMS.filter(i => i.cat === cat);
  if (items.length === 0) {
    return '<div class="shop-empty">該当する商品はまだありません。</div>';
  }
  return items.map(i => {
    const owned = save.ownedItems.includes(i.id);
    // requires: 解放条件
    let lockedReason = null;
    if (i.requires === 'ending' && !save.endingUnlocked) lockedReason = '🔒 ヴェルベット撃破で解放';
    const canBuy = !owned && !lockedReason && save.coins >= i.price;
    // 視聴/再生系の購入後ボタン
    const playableId = (i.id === 'memory_ending') ? 'play-ending'
                      : (i.id === 'memory_ending_theme') ? 'play-ending-theme'
                      : null;
    return `<div class="shop-item ${owned ? 'owned' : ''} ${lockedReason ? 'locked' : ''}" data-item="${i.id}">
      <div class="shop-item-name">${i.name}</div>
      <div class="shop-item-desc">${i.desc}</div>
      <div class="shop-item-footer">
        <span class="shop-item-price">${i.price}コイン</span>
        ${lockedReason
          ? `<span class="shop-item-locked">${lockedReason}</span>`
          : owned
            ? (playableId
                ? `<button class="btn btn-primary" data-action="${playableId}">▶ 視聴</button>`
                : '<span class="shop-item-owned">✓ 購入済み</span>')
            : `<button class="btn btn-primary" data-action="buy-item" data-item-id="${i.id}" ${canBuy ? '' : 'disabled'}>${canBuy ? '購入' : 'コイン不足'}</button>`
        }
      </div>
    </div>`;
  }).join('');
}

function bindShop() {
  document.querySelectorAll('.shop-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shop-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      const itemsEl = document.querySelector('[data-bind="shopItems"]');
      itemsEl.innerHTML = renderShopItems(cat);
      bindActions();
      bindShopItems();
    });
  });
  bindShopItems();
}
function bindShopItems() {
  document.querySelectorAll('.shop-item').forEach(item => {
    // ホバーでも切り替え（PC操作用）
    item.addEventListener('mouseenter', () => selectShopItem(item));
    // クリックで選択（モバイル/タッチ操作用）。購入ボタンは別途バブリングを止める
    item.addEventListener('click', (e) => {
      // 購入ボタン押下はアイテム選択ではなく購入動作のみ
      if (e.target.closest('[data-action="buy-item"]')) return;
      selectShopItem(item);
    });
  });
}
function selectShopItem(item) {
  document.querySelectorAll('.shop-item').forEach(i => i.classList.remove('selected'));
  item.classList.add('selected');
  const id = item.dataset.item;
  const comment = SHOP_COMMENTS[id];
  if (comment) {
    const el = document.querySelector('[data-bind="ricoShopComment"]');
    if (el) el.textContent = `「${comment}」`;
  }
}

function buyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  if (save.ownedItems.includes(itemId)) return;
  if (save.coins < item.price) return;
  save.coins -= item.price;
  save.ownedItems.push(itemId);
  // 効果適用
  if (itemId === 'panyu_gauge_plus_20') save.panyuGaugeMax = 120;
  if (itemId === 'panyu_sense_lv2') save.panyuSkills.senseLevel = 2;
  if (itemId === 'panyu_range_lv2') save.panyuSkills.rangeLevel = 2;
  if (itemId.startsWith('note_')) {
    const noteId = itemId.replace('note_', '');
    if (!save.unlockedNotes.includes(noteId)) save.unlockedNotes.push(noteId);
  }
  if (itemId === 'skin_red_gold_card') save.equippedCardSkin = 'red_gold';
  if (itemId === 'table_vip') save.equippedTableSkin = 'vip';
  saveProgress();
  toast(`✓ ${item.name} を購入！`);
  // 再レンダリング
  const activeCat = document.querySelector('.shop-cat-btn.active')?.dataset.cat || 'panyu';
  const itemsEl = document.querySelector('[data-bind="shopItems"]');
  if (itemsEl) itemsEl.innerHTML = renderShopItems(activeCat);
  const coinsEl = document.querySelector('[data-bind="saveCoins"]');
  if (coinsEl) coinsEl.textContent = save.coins;
  bindActions();
  bindShopItemHover();
}

function pickLogicQuestion() {
  // 出題済みを避けて未出題から選ぶ
  const allLogicIds = ['logic_pot_odds_basic', 'logic_flush_outs', 'logic_hand_compare', 'logic_position'];
  const seen = state.seenQuestions || new Set();
  // 状況にマッチする候補を計算
  const need = state.currentBetOpponent - state.currentBetPlayer;
  const potBefore = state.pot - need;
  const suits = state.community.map(c => c.suit);
  const suitCounts = {};
  suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
  const maxSuit = Math.max(...Object.values(suitCounts), 0);
  const candidates = [];
  if (need > 0 && potBefore > 0) candidates.push('logic_pot_odds_basic');
  if (maxSuit >= 2 && state.playerHand[0]?.suit === state.playerHand[1]?.suit) candidates.push('logic_flush_outs');
  if (state.handPhase === 'flop') candidates.push('logic_hand_compare');
  candidates.push('logic_position');
  // 未出題優先
  const fresh = candidates.find(q => !seen.has(q));
  if (fresh) return fresh;
  // 全部出題済みなら全プールから未出題、なければランダム
  const allFresh = allLogicIds.find(q => !seen.has(q));
  return allFresh || candidates[0];
}

function pickPsychQuestion() {
  // 対戦相手に応じて問題プールを切り替える＋出題済みは避ける
  const id = state.opponentId;
  const seen = state.seenQuestions || new Set();
  if (id === 'rico_tutorial') return 'rico_tutorial_flop';
  if (id === 'polka') return 'polka_flop_bluff';
  if (id === 'selina') {
    const suits = state.community.map(c => c.suit);
    const counts = {};
    suits.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const maxSuit = Math.max(...Object.values(counts), 0);
    const fitCondition = maxSuit >= 2 ? 'selina_flush_alert' : 'selina_bet_size';
    const other = fitCondition === 'selina_flush_alert' ? 'selina_bet_size' : 'selina_flush_alert';
    // 状況マッチを優先、ただし2回目以降は別問題に切り替え
    return seen.has(fitCondition) && !seen.has(other) ? other : fitCondition;
  }
  if (id === 'grano') {
    const potBefore = state.pot - state.currentBetOpponent;
    const ratio = potBefore > 0 ? state.currentBetOpponent / potBefore : 1;
    const fitCondition = ratio < 0.5 ? 'grano_cheap_call' : 'grano_expensive';
    const other = fitCondition === 'grano_cheap_call' ? 'grano_expensive' : 'grano_cheap_call';
    return seen.has(fitCondition) && !seen.has(other) ? other : fitCondition;
  }
  if (id === 'velvet') {
    if (state.handPhase === 'flop') return 'velvet_flop';
    if (state.handPhase === 'turn') return 'velvet_turn';
    if (state.handPhase === 'river') return 'velvet_river_evidence';
    return 'velvet_flop';
  }
  return 'polka_flop_bluff';
}

function velvetSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'この程度のボード、怖がる理由はないわ。',
      'あなたに見えてないものが、私には見えているの。',
      '降りる勇気もないなら、それ相応の結果になるわよ。',
    ]);
  }
  if (action.intent === 'value') {
    return pick(['……', '静かに進めましょう', '焦らないで、ゆっくり、ね']);
  }
  if (action.type === 'fold') return 'いいわ、今回は譲ってあげる……';
  return pick(['さあ', '……どうする？', '時間は無限ではないわよ']);
}

function panyuMood(value, max) {
  const ratio = value / max;
  if (ratio <= 0) return '空っぽ';
  if (ratio < 0.2) return 'ちょっと';
  if (ratio < 0.4) return 'ぱにゅ';
  if (ratio < 0.6) return 'ぱにゅぱにゅ';
  if (ratio < 0.8) return 'ぱにゅぱにゅぱにゅ';
  if (ratio < 1.0) return 'ぱにゅぱにゅぱにゅぱにゅ';
  return 'ぱにゅMAX！';
}

function renderPanyuPips() {
  // 5段階のピップを表示
  const ratio = state.panyu / state.panyuMax;
  const lit = Math.round(ratio * 5);
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += `<span class="pip ${i < lit ? 'lit' : ''}">●</span>`;
  }
  return html;
}

// チップ額をビジュアル化：白25/赤100/青500/金1000の段組み
function renderChipStack(amount, variant) {
  if (!amount || amount <= 0) return '';
  const tiers = [
    { name: 'gold',  value: 1000 },
    { name: 'blue',  value: 500 },
    { name: 'red',   value: 100 },
    { name: 'white', value: 25 },
  ];
  let rem = amount;
  const counts = {};
  for (const t of tiers) {
    counts[t.name] = Math.floor(rem / t.value);
    rem = rem - counts[t.name] * t.value;
  }
  // 表示上限：各色5枚まで、超過分は「×N」で表現
  const maxPer = 5;
  const stacks = [];
  for (const t of tiers) {
    const n = counts[t.name];
    if (n === 0) continue;
    const vis = Math.min(n, maxPer);
    const extra = n - vis;
    const dots = Array.from({ length: vis }, (_, i) =>
      `<span class="chip-pic chip-${t.name}" style="--i:${i}"></span>`).join('');
    const more = extra > 0 ? `<span class="chip-more">×${n}</span>` : '';
    stacks.push(`<span class="chip-stack-col">${dots}${more}</span>`);
  }
  return `<span class="chip-stack ${variant ? 'chip-stack-' + variant : ''}">${stacks.join('')}</span>`;
}

// 裏モード：相手の手と心理を可視化
function renderBackdoorPanel() {
  if (!state.opponentHand || state.opponentHand.length === 0) {
    return '<div class="backdoor-empty">（まだハンド開始前）</div>';
  }
  const handCards = state.opponentHand.map(c => `<span class="bd-card bd-${c.suit === '♥' || c.suit === '♦' ? 'red' : 'black'}">${c.rank}${c.suit}</span>`).join(' ');
  let hsLabel = '計算中';
  let hsPct = 0;
  try {
    if (state.community.length >= 3) {
      const all = [...state.opponentHand, ...state.community];
      const hs = handStrength01(all);
      hsPct = Math.round(hs * 100);
    } else {
      const hs = opponentPreflopStrength(state.opponentHand);
      hsPct = Math.round(hs * 100);
    }
    if (hsPct >= 75) hsLabel = '🔥 最強圏';
    else if (hsPct >= 60) hsLabel = '💪 強い';
    else if (hsPct >= 45) hsLabel = '🤔 普通';
    else if (hsPct >= 30) hsLabel = '😅 微妙';
    else hsLabel = '💧 弱い';
  } catch(e) {}
  const danger = evaluateBoardDanger(state.community || []);
  const dangerLabels = [];
  if (danger.flushAlert)    dangerLabels.push('🌊フラッシュ警戒');
  if (danger.straightAlert) dangerLabels.push('🪜ストレート警戒');
  if (danger.pairBoard)     dangerLabels.push('♠ボードペア');
  const dangerStr = dangerLabels.length ? dangerLabels.join(' / ') : '安全';
  const profile = state.opponentProfile || {};
  const prof = [
    `ブラフ ${Math.round((profile.bluffTendency||0)*100)}%`,
    `攻撃 ${Math.round((profile.aggression||0)*100)}%`,
    `規律 ${Math.round((profile.foldDiscipline||0)*100)}%`,
    `バリュー ${Math.round((profile.valueBetTendency||0)*100)}%`,
  ].join(' / ');
  return `
    <div class="bd-title">✦ 裏モード：心理ログ ✦</div>
    <div class="bd-row"><span class="bd-label">手札</span><span class="bd-value">${handCards}</span></div>
    <div class="bd-row"><span class="bd-label">手の強さ</span><span class="bd-value">${hsPct}％ ${hsLabel}</span></div>
    <div class="bd-bar"><div class="bd-bar-fill" style="width:${hsPct}%"></div></div>
    <div class="bd-row"><span class="bd-label">ボード</span><span class="bd-value">${dangerStr}</span></div>
    <div class="bd-row"><span class="bd-label">性格</span><span class="bd-value bd-prof">${prof}</span></div>
    ${state.lastOpponentIntent ? `<div class="bd-row"><span class="bd-label">直前の意図</span><span class="bd-value">${intentLabel(state.lastOpponentIntent)}</span></div>` : ''}
  `;
}

function intentLabel(intent) {
  return {
    'bluff':         '🎭 ブラフ',
    'forced_bluff':  '🎭 強制ブラフ（教材）',
    'tutorial_bluff':'🎭 練習ブラフ',
    'value':         '💎 バリュー（強い手で稼ぐ）',
    'draw':          '🌊 ドロー潰し',
    'trap':          '🪤 トラップ（チェックレイズ狙い）',
  }[intent] || intent;
}

function updateBackdoorPanel() {
  const btn = document.querySelector('[data-bind="backdoorBtn"]');
  if (btn) btn.classList.toggle('on', !!save.backdoorOn);
  const panel = document.querySelector('[data-bind="backdoorPanel"]');
  if (panel) {
    panel.style.display = (save.backdoorUnlocked && save.backdoorOn) ? 'block' : 'none';
    panel.innerHTML = renderBackdoorPanel();
  }
}

function renderOpponentBet() {
  if (state.currentBetOpponent <= 0) return '<span class="bet-none">— ベットなし —</span>';
  const potBefore = state.pot - state.currentBetOpponent - state.currentBetPlayer;
  const pct = potBefore > 0 ? Math.round((state.currentBetOpponent / potBefore) * 100) : 0;
  let sizeLabel = '';
  if (potBefore > 0) {
    const ratio = state.currentBetOpponent / potBefore;
    if (ratio >= 1.5) sizeLabel = '【超強気】';
    else if (ratio >= 0.9) sizeLabel = '【ポット】';
    else if (ratio >= 0.55) sizeLabel = '【強気】';
    else if (ratio >= 0.35) sizeLabel = '【標準】';
    else sizeLabel = '【様子見】';
  }
  return `<span class="bet-active">▶ ${state.currentBetOpponent}ベット ${sizeLabel}${pct > 0 ? ` (ポットの${pct}%)` : ''}</span>`;
}

function renderCurrentHandName() {
  if (state.playerHand.length < 2) return '役：—';
  const all = [...state.playerHand, ...state.community];
  if (all.length < 5) {
    // プリフロップやフロップ前
    const ranks = state.playerHand.map(c => c.rank).sort((a, b) => b - a);
    if (ranks[0] === ranks[1]) return `現在の手：<b>ポケットペア (${state.playerHand[0].label})</b>`;
    if (state.playerHand[0].suit === state.playerHand[1].suit) return `現在の手：スーテッド ${state.playerHand[0].label}${state.playerHand[0].suit}${state.playerHand[1].label}${state.playerHand[1].suit}`;
    return `現在の手：${state.playerHand[0].label}${state.playerHand[0].suit} ${state.playerHand[1].label}${state.playerHand[1].suit}`;
  }
  const ev = evaluateHand(all);
  const isStrong = ev.rank >= 3;  // スリーカード以上
  return `現在の役：<b class="${isStrong ? 'hand-strong' : ''}">${ev.name}</b>`;
}

function zazazoLabel(v) {
  return ['無風','ぴくっ','ぞわっ','ゾゾゾ','ゾゾゾゾ','ブラフブレイク！'][v] || '無風';
}

function renderCardsInto(el, cards, slotCount) {
  el.innerHTML = '';
  for (let i = 0; i < slotCount; i++) {
    const c = cards[i];
    if (!c) {
      el.insertAdjacentHTML('beforeend', '<div class="card empty"></div>');
    } else {
      const isRed = c.suit === '♥' || c.suit === '♦';
      el.insertAdjacentHTML('beforeend', `
        <div class="card ${isRed ? 'red' : ''}">
          <span class="rank">${c.label}</span>
          <span class="suit">${c.suit}</span>
          <span class="center-suit">${c.suit}</span>
        </div>`);
    }
  }
}

function renderPsychLog(el) {
  if (state.logs.psych.length === 0) {
    el.innerHTML = '<div class="log-entry">— 心理ログはまだ空 —</div>';
    return;
  }
  el.innerHTML = state.logs.psych.slice(-8).map(p =>
    `<div class="log-entry ${p.success ? 'success' : 'fail'}">Hand${p.hand}: ${p.success ? '✓ 成功' : '✗ 失敗'}</div>`
  ).join('');
}

function renderActionArea(el) {
  el.innerHTML = '';
  if (state.handPhase === 'idle') {
    const label = state.handNo === 0 ? '対戦開始' : '次のハンドへ';
    el.innerHTML = `<button class="btn btn-primary big" data-action="start-hand">${label}</button>`;
    return;
  }
  if (state.psychPending) {
    el.innerHTML = `<div class="status-note">心理バトル中……</div>`;
    return;
  }
  if (!state.isPlayerTurn) {
    el.innerHTML = `<div class="status-note dim">相手の番……</div>`;
    return;
  }
  const need = state.currentBetOpponent - state.currentBetPlayer;
  const half = Math.max(50, Math.min(Math.floor(state.pot / 2), state.playerChips));
  const twoThird = Math.max(50, Math.min(Math.floor(state.pot * 2 / 3), state.playerChips));
  const potBet = Math.max(50, Math.min(state.pot, state.playerChips));
  const allInAmt = state.playerChips;
  const bb25 = Math.min(125, state.playerChips);
  const bb3 = Math.min(150, state.playerChips);

  // 6スロット固定グリッド（フォールド／コール・チェック／中ベット／大ベット／ポット／オールイン）
  let slots;
  if (state.handPhase === 'preflop') {
    slots = [
      { kind: 'fold', label: 'フォールド', sub: '降りる', action: 'player-fold', ghost: true,
        enabled: true, title: '手札を捨ててこのハンドを諦める。場札が出る前でも降りられる。アンテ50チップは戻ってこない。' },
      { kind: 'callcheck', label: 'コール', sub: need > 0 ? `(${need})` : '勝負', action: 'player-call', primary: true,
        enabled: true, title: '相手と同額を払ってフロップを見にいく。' },
      { kind: 'sm',    label: '2.5BBレイズ', sub: `(${bb25})`, action: 'player-raise', dataSize: '2.5',
        enabled: true, title: '相手より大きくベット。強気の攻め。' },
      { kind: 'md',    label: '3BBレイズ',   sub: `(${bb3})`,  action: 'player-raise', dataSize: '3',
        enabled: true, title: 'より大きいレイズ。' },
      { kind: 'lg',    label: '—',            sub: 'ポストフロップ用', enabled: false,
        title: 'フロップ後にポットベットが選べるようになります。' },
      { kind: 'allin', label: 'オールイン', sub: `(${allInAmt})`, action: 'player-allin',
        enabled: allInAmt > 0, title: '持ちチップ全部を賭ける。' },
    ];
  } else {
    const showBet = need === 0;
    const showRaise = need > 0 && state.playerChips > need * 2;
    slots = [
      { kind: 'fold', label: 'フォールド', sub: '降りる', action: 'player-fold', ghost: true,
        enabled: true, title: '手札を捨ててポットを諦める。これまで払ったチップは戻らない。' },
      { kind: 'callcheck',
        label: need > 0 ? 'コール' : 'チェック',
        sub: need > 0 ? `(${need})` : '見送り',
        action: 'player-checkcall', primary: true, enabled: true,
        title: need > 0
          ? 'コール＝相手のベットに同額で乗る。役に自信がある時。'
          : 'チェック＝今は賭けない、次の場札を待つ。相手もチェックなら無料で次へ進める。' },
      { kind: 'sm', label: '1/2ポット', sub: `標準 (${half})`, action: 'player-bet', dataSize: 'pot_1_2',
        enabled: showBet || showRaise, title: 'ポットの半分。標準的なベット。' },
      { kind: 'md', label: '2/3ポット', sub: `強気 (${twoThird})`, action: 'player-bet', dataSize: 'pot_2_3',
        enabled: showBet || showRaise, title: 'ポットの2/3。強気の攻め。相手を降ろしに行く時にも。' },
      { kind: 'lg', label: 'ポット',     sub: `最大圧 (${potBet})`, action: 'player-bet', dataSize: 'pot_1',
        enabled: showBet || showRaise, title: 'ポット相当の大ベット。' },
      { kind: 'allin', label: 'オールイン', sub: `(${allInAmt})`, action: 'player-allin',
        enabled: allInAmt > 0, title: '持ちチップ全部。逆転の最終手段。' },
    ];
  }

  el.innerHTML = `<div class="action-grid">${slots.map(s => `
    <button
      class="btn action-slot slot-${s.kind} ${s.primary ? 'btn-primary primary-action' : s.ghost ? 'btn-ghost' : 'btn-secondary'}"
      ${s.enabled ? `data-action="${s.action}"` : 'disabled'}
      ${s.dataSize ? `data-size="${s.dataSize}"` : ''}
      title="${s.title}">
      <span class="slot-label">${s.label}</span>
      ${s.sub ? `<small>${s.sub}</small>` : ''}
    </button>
  `).join('')}</div>`;
}

//=============================================================
// 8. アクションバインド
//=============================================================
function bindActions() {
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', onAction);
  });
}
function onAction(e) {
  const action = e.currentTarget.dataset.action;
  const data = { ...e.currentTarget.dataset };
  // 任意のアクションでカットインを閉じる
  dismissCutIn();
  switch (action) {
    case 'start':         goStageSelect(); break;
    case 'new-game':
      if (confirm('現在のセーブデータを消して、新しく始めますか？')) {
        localStorage.removeItem(SAVE_KEY);
        save = defaultSave();
        state = defaultState();
        render();
      }
      break;
    case 'back-title':    stopEndingBgm(); state = defaultState(); render(); break;
    case 'back-stage':    stopEndingBgm(); goStageSelect(); break;
    case 'open-shop':     state.screen = 'shop'; render(); break;
    case 'reset-save':    resetProgress(); break;
    case 'buy-item':      buyItem(data.itemId); break;
    case 'battle-start':  startBattle(data.opponent); break;
    case 'battle-rico-serious': window.__ricoSeriousMode = true; startBattle('rico_tutorial'); break;
    case 'start-hand':    startHand(); break;
    case 'player-fold':   playerFold(); break;
    case 'player-call':   playerCall(); break;
    case 'player-checkcall': playerCheckCall(); break;
    case 'player-raise':  playerRaise(+data.size); break;
    case 'player-bet':    playerBet(data.size); break;
    case 'player-allin':  playerAllIn(); break;
    case 'rematch':       startBattle(state.opponentId); break;
    case 'go-ending':
      showEpisodeTitle('ending', () => { state.screen = 'ending'; render(); });
      break;
    case 'recall-episode':
      showEpisodeTitle(data.episode, null);
      break;
    case 'use-panyu-sense': usePanyuSense(); break;
    case 'panyu-free': {
      // 連打で裏モード解放（クリア後限定）
      if (save.endingUnlocked && !save.backdoorUnlocked) {
        state.__panyuClickCount = (state.__panyuClickCount || 0) + 1;
        if (state.__panyuClickCount >= 7) {
          save.backdoorUnlocked = true;
          saveProgress();
          alert('🐰✦ 裏モード解放！ ✦🐰\n\nバトル画面右上の ✦ ボタンで\n相手の手と心理を覗き見できます');
        }
      }
      showPanyuClicker(30, null);
      break;
    }
    case 'toggle-bgm':    toggleLobbyBgm(); break;
    case 'toggle-psych':  save.psychEnabled = !(save.psychEnabled !== false); saveProgress(); applyBindings(); break;
    case 'toggle-logic':  save.logicEnabled = !(save.logicEnabled !== false); saveProgress(); applyBindings(); break;
    case 'play-ending':   state.screen = 'ending'; render(); break;
    case 'play-ending-theme': toggleEndingThemePreview(); break;
    case 'toggle-backdoor':
      save.backdoorOn = !save.backdoorOn;
      saveProgress();
      updateBackdoorPanel();
      break;
  }
}

//=============================================================
// 9. 画面遷移
//=============================================================
//=============================================================
// エンディング演出
//=============================================================
function startEndingShow() {
  const stage = document.getElementById('ending-stage');
  if (!stage) return;
  stage.innerHTML = '';
  // ロビーBGMを止めてエンディングテーマを再生
  const lobbyA = document.getElementById('lobby-bgm-audio');
  if (lobbyA) lobbyA.pause();
  const endA = document.getElementById('ending-bgm-audio');
  if (endA) {
    endA.currentTime = 0;
    endA.volume = Math.min(1, bgmVolFloat() * 1.6);
    endA.play().catch(()=>{});
  }
  // 星空＋光の粒子背景
  const bg = document.createElement('div');
  bg.className = 'ending-bg';
  stage.appendChild(bg);
  const stars = document.createElement('div');
  stars.className = 'ending-stars';
  stage.appendChild(stars);
  const skip = document.createElement('button');
  skip.className = 'ending-skip-btn';
  skip.textContent = 'スキップ ▶▶';
  skip.onclick = () => { cancelled = true; finale(); };
  stage.appendChild(skip);

  let cancelled = false;

  const acts = [
    { type: 'fade-text', text: '——あの夜、VIPルームの最奥で——', cls: 'narration', wait: 2200 },
    { type: 'speaker', who: 'velvet', img: 'velvet', name: 'ヴェルベット',
      text: '「新人にしては……悪くないわ。<br>その妙なスキル、覚えておく」', wait: 3200 },
    { type: 'speaker', who: 'grano', img: 'grano', name: 'グラーノ',
      text: '「ふむ。お嬢さんの『割に合う判断』、見事でしたな」', wait: 2800 },
    { type: 'speaker', who: 'selina', img: 'selina', name: 'セリナ',
      text: '「ボードを読む目、ホンモノだったね。次は本気でやる」', wait: 2800 },
    { type: 'speaker', who: 'polka', img: 'polka', name: 'ポルカ',
      text: '「ミミ姉ちゃん、また遊ぼ！　次はアタシが勝つかんね！」', wait: 2800 },
    { type: 'speaker', who: 'rico', img: 'rico', name: 'リコ先輩',
      text: '「やるじゃん、ミミ。ちゃんと顔色まで読み切った」', wait: 2800 },
    { type: 'speaker', who: 'mimi', img: 'mimi', name: 'ミミ',
      text: '「私……ぱにゅぱにゅだけが取り柄だと思ってた。<br>でも、それも立派なスキルでした」', wait: 3600 },
    { type: 'fade-text', text: 'こうしてミミは、闘札の世界で名を上げていく——', cls: 'narration', wait: 3000 },
    { type: 'fade-text', text: 'これは、外れスキルが世界を変える物語の、ほんの始まり。', cls: 'narration small', wait: 3200 },
  ];

  let idx = 0;
  function nextAct() {
    if (cancelled) return;
    if (idx >= acts.length) { finale(); return; }
    const a = acts[idx++];
    runAct(a, () => setTimeout(nextAct, 200));
  }

  function runAct(a, done) {
    if (a.type === 'fade-text') {
      const el = document.createElement('div');
      el.className = `ending-narration ${a.cls || ''}`;
      el.innerHTML = a.text;
      stage.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 600);
        done();
      }, a.wait);
    } else if (a.type === 'speaker') {
      const wrap = document.createElement('div');
      wrap.className = `ending-speaker speaker-${a.who}`;
      wrap.innerHTML = `
        <div class="ending-portrait">
          <img src="assets/characters/${a.img}_default.png" alt="${a.name}" onerror="window.assetFallback(this,'${a.img}')">
        </div>
        <div class="ending-bubble">
          <div class="ending-bubble-name">${a.name}</div>
          <div class="ending-bubble-text">${a.text}</div>
        </div>
      `;
      stage.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('show'));
      setTimeout(() => {
        wrap.classList.add('out');
        setTimeout(() => wrap.remove(), 600);
        done();
      }, a.wait);
    }
  }

  function finale() {
    // 既存要素を片付け
    stage.querySelectorAll('.ending-speaker, .ending-narration').forEach(e => e.remove());
    skip.style.display = 'none';
    // フラッシュ
    const flash = document.createElement('div');
    flash.className = 'ending-flash';
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 700);

    // タイトルロゴが上から落下
    setTimeout(() => {
      const logo = document.createElement('div');
      logo.className = 'ending-title-drop';
      logo.innerHTML = `
        <img src="assets/ui/title.png" alt="闘札圧倒伝ミミ"
             onerror="this.style.display='none'; this.parentElement.classList.add('logo-fallback');">
        <div class="ending-title-fallback">
          <div class="ending-title-jp">闘札圧倒伝ミミ</div>
          <div class="ending-title-sub">— 転生したらバニーガールだった私の外れスキル《ぱにゅぱにゅ》だけがレベルアップな件 —</div>
        </div>
      `;
      stage.appendChild(logo);
      // 着地時にシェイク＋バースト
      setTimeout(() => {
        stage.classList.add('shake');
        if (navigator.vibrate) navigator.vibrate([100, 50, 80]);
        for (let i = 0; i < 24; i++) spawnEndingSparkle(stage);
        setTimeout(() => stage.classList.remove('shake'), 600);
      }, 1100);
      // FIN 表示
      setTimeout(() => {
        const fin = document.createElement('div');
        fin.className = 'ending-fin';
        fin.textContent = 'FIN';
        stage.appendChild(fin);
        requestAnimationFrame(() => fin.classList.add('show'));
      }, 2400);
      // ボタン
      setTimeout(() => {
        const btns = document.createElement('div');
        btns.className = 'ending-final-buttons';
        btns.innerHTML = `
          <button class="btn btn-primary" data-action="back-title">タイトルへ</button>
          <button class="btn btn-secondary" data-action="back-stage">ロビーへ</button>
        `;
        stage.appendChild(btns);
        // 動的追加なので個別バインド
        btns.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        requestAnimationFrame(() => btns.classList.add('show'));
      }, 3200);
    }, 500);
  }

  // 開始
  setTimeout(nextAct, 400);
}

function spawnEndingSparkle(parent) {
  const s = document.createElement('div');
  s.className = 'ending-sparkle';
  s.textContent = pick(['✨', '🌟', '💫', '⭐', '🎉', '🎊', '💖']);
  const angle = rand() * Math.PI * 2;
  const dist = 150 + rand() * 250;
  s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
  s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
  s.style.left = '50%';
  s.style.top  = '50%';
  s.style.fontSize = (24 + rand() * 22) + 'px';
  parent.appendChild(s);
  setTimeout(() => s.remove(), 1600);
}

function goStageSelect() {
  state.screen = 'stageSelect';
  // 入室時にリコの衣装を抽選し直す
  state.lobbyRicoIndex = Math.floor(rand() * RICO_OUTFITS.length);
  state.lobbyRicoChangedAt = 'stageSelect';
  render();
  tryStartLobbyBgm();
}

function stopEndingBgm() {
  const a = document.getElementById('ending-bgm-audio');
  if (a) { a.pause(); }
}

function toggleEndingThemePreview() {
  const a = document.getElementById('ending-bgm-audio');
  if (!a) { alert('audio要素が見つかりません'); return; }
  if (a.paused) {
    const lobbyA = document.getElementById('lobby-bgm-audio');
    if (lobbyA) lobbyA.pause();
    a.currentTime = 0;
    const vol = Math.min(1, bgmVolFloat() * 1.6);
    a.volume = Math.max(0.05, vol); // 万一0でも聞こえるよう最低5%
    const setBtnLabel = (txt) => document.querySelectorAll('[data-action="play-ending-theme"]').forEach(b => b.textContent = txt);
    setBtnLabel('… 読込中');
    const p = a.play();
    if (p && p.then) {
      p.then(() => setBtnLabel('⏹ 停止'))
       .catch((err) => {
         setBtnLabel('▶ 視聴');
         alert('再生失敗：' + (err && err.message || err) + '\nファイル: ' + (a.currentSrc || '(未設定)'));
       });
    } else {
      setBtnLabel('⏹ 停止');
    }
    a.onended = () => setBtnLabel('▶ 視聴');
    a.onerror = () => {
      setBtnLabel('▶ 視聴');
      alert('音源読込エラー：' + (a.currentSrc || 'パス不明') + '\nコード: ' + (a.error && a.error.code));
    };
  } else {
    a.pause();
    document.querySelectorAll('[data-action="play-ending-theme"]').forEach(b => b.textContent = '▶ 視聴');
  }
}

function bgmVolFloat() {
  const v = save && save.bgmVolume != null ? save.bgmVolume : 35;
  return Math.max(0, Math.min(1, v / 100));
}
function applyBgmVolume() {
  const lobbyA = document.getElementById('lobby-bgm-audio');
  const endA = document.getElementById('ending-bgm-audio');
  if (lobbyA) lobbyA.volume = bgmVolFloat();
  if (endA)   endA.volume   = Math.min(1, bgmVolFloat() * 1.6);
}

// グローバル音量バーの状態同期
function refreshGlobalAudioBar() {
  const bar = document.getElementById('global-audio-bar');
  const tog = document.getElementById('global-bgm-toggle');
  const vol = document.getElementById('global-bgm-volume');
  if (!bar) return;
  // 音楽が鳴る可能性のある画面で常時表示（タイトル除外でもよいが常時表示が無難）
  bar.style.display = 'flex';
  if (tog) tog.textContent = save.bgmOn ? '🔊' : '🔇';
  if (vol) vol.value = save.bgmVolume != null ? save.bgmVolume : 35;
}

function initGlobalAudioBar() {
  const tog = document.getElementById('global-bgm-toggle');
  const vol = document.getElementById('global-bgm-volume');
  if (tog && !tog.__bound) {
    tog.__bound = true;
    tog.addEventListener('click', toggleLobbyBgm);
  }
  if (vol && !vol.__bound) {
    vol.__bound = true;
    vol.addEventListener('input', (e) => {
      save.bgmVolume = +e.target.value;
      saveProgress();
      applyBgmVolume();
    });
  }
  refreshGlobalAudioBar();
}
function tryStartLobbyBgm() {
  const a = document.getElementById('lobby-bgm-audio');
  if (!a) return;
  if (!save.bgmOn) { a.pause(); return; }
  a.volume = bgmVolFloat();
  const p = a.play();
  if (p && p.catch) p.catch(() => {/* 自動再生ブロックは無視 */});
}

function toggleLobbyBgm() {
  save.bgmOn = !save.bgmOn;
  saveProgress();
  const a = document.getElementById('lobby-bgm-audio');
  if (save.bgmOn) {
    if (a) { a.volume = bgmVolFloat(); a.play().catch(()=>{}); }
  } else {
    if (a) a.pause();
    const endA = document.getElementById('ending-bgm-audio');
    if (endA) endA.pause();
  }
  refreshGlobalAudioBar();
}

//=============================================================
// 10. バトル開始
//=============================================================
function startBattle(opponentId) {
  // 初回（未クリア）のみエピソードタイトルを表示
  const isFirstTime = !save.firstClearRewardClaimed.includes(opponentId);
  if (isFirstTime && EPISODES[opponentId]) {
    showEpisodeTitle(opponentId, () => startBattleInternal(opponentId));
    return;
  }
  startBattleInternal(opponentId);
}

function startBattleInternal(opponentId) {
  const opp0 = OPPONENTS[opponentId];
  const seriousRico = (opponentId === 'rico_tutorial' && window.__ricoSeriousMode === true);
  window.__ricoSeriousMode = false; // 一回限り
  if (opp0 && opp0.isLecture && !seriousRico) {
    return startLecture(opponentId);
  }
  state = defaultState();
  const opp = OPPONENTS[opponentId] || OPPONENTS.polka;
  state.opponentId = opp.id;
  state.opponentName = seriousRico ? 'リコ先輩（真剣）' : opp.name;
  // 真剣モードのリコ先輩は全パラメータ最強
  state.opponentProfile = seriousRico
    ? { bluffTendency: 0.7, aggression: 0.85, foldDiscipline: 0.7, valueBetTendency: 0.8, drawAggression: 0.85, trapTendency: 0.6 }
    : opp.profile;
  state.opponentImgKey = opp.imgKey;
  state.maxHands = seriousRico ? 999 : opp.maxHands;
  state.playerChips = seriousRico ? 1500 : opp.chips;
  state.opponentChips = seriousRico ? 1800 : opp.chips; // 強敵にふさわしいチップ
  state.tutorialMode = seriousRico ? false : opp.tutorial;
  state.fullHand = seriousRico ? true : !!opp.fullHand;
  state.isBoss = seriousRico ? true : !!opp.isBoss; // 心理バトル全ストリート発動
  state.seriousRicoMode = seriousRico;
  state.screen = 'battle';
  state.handPhase = 'idle';
  state.panyuMax = save.panyuGaugeMax || 100;
  state.panyuSenseFreeUsed = save.panyuSenseFreeUsed;

  // v4 B4: ボス戦は開幕で ぱにゅゲージを最低25まで補填
  if (opp.isBoss) {
    state.panyu = Math.max(25, state.panyu);
  }

  if (opp.isBoss) {
    state.mimiThought = '「ボス戦だ……気持ちで負けないようにしないと」';
    state.ricoAdvice = '「ヴェルベットは口で揺さぶってくるタイプね。冷静を保てば隙は見えるよ」';
    render();
    // 開幕心理バトルを即時発動（OFFなら省略）
    if (save.psychEnabled !== false) {
      setTimeout(() => triggerPsychBattle('velvet_opening'), 800);
      return;
    }
  }

  if (state.tutorialMode) {
    state.mimiThought = '「リコ先輩との練習試合……お願いします！」';
    state.ricoAdvice = '「1ハンドだけ、基本教えるね〜。気楽にいこ」';
    render();
    setTimeout(() => showTutorial('intro',
      'ようこそミミ！まずはポーカーの基本から教えるよ。<br><br>' +
      '🃏 <b>手札2枚＋場札5枚</b>から最強の5枚役を作る<br>' +
      '🪙 <b>ポット</b>＝ハンド毎の賭け金プール。<u>勝った方が総取り</u><br>' +
      '💰 ベットすると自分のチップが減り、ポットに入る<br>' +
      '🏆 相手より強い役 or 相手が降りれば勝ち<br>' +
      '💀 自分のチップが0になったら負け<br><br>' +
      'まずは下の<b>「対戦開始」</b>を押して、最初の手札を見てみよう。',
      () => showTutorial('intro2',
        '<b>5つのアクション</b>を覚えよう：<br><br>' +
        '🚪 <b>フォールド</b>＝降りる。手札を捨ててこのハンドを諦める。<u>場札が出る前でも、いつでも降りられる</u>。<br>' +
        '👉 <i>弱い手の時、無理に追わずアンテだけで損切りする時に使う</i><br><br>' +
        '✅ <b>コール</b>＝相手と同額を払って勝負を続ける<br>' +
        '👁 <b>チェック</b>＝相手が何も賭けてない時、自分も賭けず次の場札を待つ（無料で進める）<br>' +
        '💵 <b>ベット/レイズ</b>＝自分から仕掛ける。1/2〜ポット、強気の度合いで選ぶ<br>' +
        '🔥 <b>オールイン</b>＝持ちチップ全部。逆転狙いの最終手段<br><br>' +
        '<u>各ボタンにマウスを乗せると詳しい説明が出るよ。</u>')
    ), 600);
  } else {
    state.mimiThought = '「さあ、第1ハンドだ。最初は相手をよく見よう」';
    state.ricoAdvice = pickRicoOpeningAdvice(state.opponentId);
    render();
  }
}

//=============================================================
// 11. ハンド進行
//=============================================================
function startHand() {
  if (state.playerChips <= 0 || state.opponentChips <= 0) { return endBattle(); }
  state.handNo++;
  if (state.handNo > state.maxHands) { return endBattle(); }

  // ブラインド簡略化（v4: 各50チップアンティ）
  const ante = Math.min(50, state.playerChips, state.opponentChips);
  state.playerChips -= ante;
  state.opponentChips -= ante;
  state.pot = ante * 2;
  state.currentBetPlayer = 0;
  state.currentBetOpponent = 0;

  if (state.tutorialMode) {
    // チュートリアル用固定手札
    state.deck = newDeck();
    state.playerHand = TUTORIAL_HAND.player.map(c => ({...c}));
    state.opponentHand = TUTORIAL_HAND.opponent.map(c => ({...c}));
    state.scriptedFlop = TUTORIAL_HAND.flop;
    state.scriptedTurnRiver = [TUTORIAL_HAND.turn, TUTORIAL_HAND.river];
  } else {
    state.deck = newDeck();
    state.playerHand = [state.deck.pop(), state.deck.pop()];
    state.opponentHand = [state.deck.pop(), state.deck.pop()];
    state.scriptedFlop = null;
    state.scriptedTurnRiver = null;
  }
  state.community = [];
  state.psychResolved = false;
  state.logicResolvedStreet = false;
  state.psychPending = false;
  state.handPhase = 'preflop';
  state.isPlayerTurn = true;
  state.opponentSpeech = opponentReadyLine();
  state.mimiThought = mimiThoughtPreflop(state.playerHand);
  state.ricoAdvice = `「Hand ${state.handNo}、いっくよー。アンテは50ずつ。まずは手札確認ね」`;
  log('actions', { phase: 'preflop_start', playerHand: state.playerHand.map(c => c.label + c.suit) });
  render();

  if (state.tutorialMode) {
    setTimeout(() => showTutorial('preflop',
      'ミミの手札は<b>A♠ K♠</b>！スーテッドのトップハンド、最強クラスだよ。<br>' +
      'プリフロップでは、<b>「コール」</b>で安く場札を見にいくのが基本。<br>' +
      'もちろん「レイズ」で攻めても良い。今回は<b>「コール」</b>を押してみよう。'
    ), 800);
  }
}

function mimiThoughtPreflop(hand) {
  const ranks = hand.map(c => c.rank).sort((a, b) => b - a);
  if (ranks[0] === ranks[1]) return `「ポケットペアだ……これは見に行く価値ある」`;
  if (ranks[0] >= 12) return `「${RANK_NAMES[ranks[0]-2]}高い……強気に行ってもいい」`;
  if (hand[0].suit === hand[1].suit) return `「スーテッド。フラッシュドローもあるし悪くない」`;
  if (ranks[0] - ranks[1] === 1) return `「コネクター。ストレートも狙えるかも」`;
  return `「うーん、微妙な手札。様子見が無難かな」`;
}

//=============================================================
// 12. プレイヤーアクション
//=============================================================
function playerFold() {
  state.opponentSpeech = opponentReactToPlayerFold();
  log('actions', { actor: 'player', type: 'fold' });
  state.handResults.push({ hand: state.handNo, winner: 'opponent', reason: 'fold', pot: state.pot, by: '降伏' });
  state.opponentChips += state.pot;
  state.pot = 0;
  render();
  setTimeout(endHand, 1000);
}
function playerCall() {
  const need = state.currentBetOpponent - state.currentBetPlayer;
  const pay = Math.min(need, state.playerChips);
  state.playerChips -= pay;
  state.currentBetPlayer += pay;
  state.pot += pay;
  log('bets', { actor: 'player', type: 'call', amount: pay });
  state.isPlayerTurn = false;
  state.mimiThought = '「コールした。次の場札を見よう」';
  render();
  setTimeout(advanceAfterCall, 700);
}
function playerCheckCall() {
  const need = state.currentBetOpponent - state.currentBetPlayer;
  if (need > 0) return playerCall();
  // 両者チェック → 次ストリートへ
  log('actions', { actor: 'player', type: 'check' });
  state.isPlayerTurn = false;
  state.mimiThought = '「こちらもチェック」';
  render();
  setTimeout(advanceAfterCall, 700);
}
function playerRaise(bb) {
  const amount = Math.min(50 * bb, state.playerChips);
  state.playerChips -= amount;
  state.currentBetPlayer += amount;
  state.pot += amount;
  log('bets', { actor: 'player', type: 'raise', amount });
  state.isPlayerTurn = false;
  state.mimiThought = `「${bb}BBレイズ！」`;
  render();
  setTimeout(opponentTurn, 700);
}
function playerBet(size) {
  const amount = betSizeToChips(size, state.pot, state.playerChips);
  state.playerChips -= amount;
  state.currentBetPlayer += amount;
  state.pot += amount;
  log('bets', { actor: 'player', type: 'bet', size, amount });
  state.isPlayerTurn = false;
  state.mimiThought = `「${amount}ベット」`;
  render();
  setTimeout(opponentTurn, 700);
}
function playerAllIn() {
  const amount = state.playerChips;
  state.playerChips = 0;
  state.currentBetPlayer += amount;
  state.pot += amount;
  log('bets', { actor: 'player', type: 'allin', amount });
  state.isPlayerTurn = false;
  state.mimiThought = '「オールイン！」';
  render();
  setTimeout(opponentTurn, 700);
}

//=============================================================
// 13. 相手アクション
//=============================================================
function opponentTurn() {
  const need = state.currentBetPlayer - state.currentBetOpponent;
  // 相手の手札強度を計算
  const allCards = [...state.opponentHand, ...state.community];
  const hs = state.community.length >= 3 ? handStrength01(allCards) : opponentPreflopStrength(state.opponentHand);
  const boardDanger = evaluateBoardDanger(state.community);
  const ctx = { handStrength: hs, toCall: need, boardDanger, canCheck: need === 0 };

  // v4: 第1ハンドのフロップ後、ポルカは必ず2/3以上ベット → 心理バトル強制発生
  // チュートリアル時もリコ先輩は同様にブラフベットして練習させる
  // ボス戦は各ストリートで強制大ベット（心理バトルを必ず発動させるため）
  const forceLargeBet =
    (state.handNo === 1 && state.handPhase === 'flop' && !state.psychResolved && state.currentBetPlayer === 0) ||
    (state.isBoss && (state.handPhase === 'flop' || state.handPhase === 'turn' || state.handPhase === 'river') && !state.psychResolved && state.currentBetPlayer === 0);
  let action;
  if (state.tutorialMode) {
    if (state.handPhase === 'flop' && !state.psychResolved) {
      // チュートリアル：強制的にブラフベット
      action = { type: 'bet', size: 'pot_2_3', intent: 'tutorial_bluff' };
    } else if (state.psychResolved) {
      // 心理バトル後はリコ先輩は降参して教育を完了させる
      action = need > 0 ? { type: 'fold' } : { type: 'check_call' };
    } else {
      action = { type: 'check_call' };
    }
  } else {
    action = decideOpponentAction(state.opponentProfile, ctx, { forceLargeBet });
  }
  state.lastOpponentIntent = action.intent || action.type;

  // フォールド処理
  if (action.type === 'fold' && need > 0) {
    state.opponentSpeech = opponentSpeech(action);
    log('actions', { actor: 'opponent', type: 'fold' });
    state.handResults.push({ hand: state.handNo, winner: 'player', reason: 'opponentFold', pot: state.pot, by: '相手降伏' });
    state.playerChips += state.pot;
    state.pot = 0;
    render();
    setTimeout(endHand, 1000);
    return;
  }
  // チェック/コール
  if (action.type === 'check_call') {
    const pay = Math.min(need, state.opponentChips);
    state.opponentChips -= pay;
    state.currentBetOpponent += pay;
    state.pot += pay;
    state.opponentSpeech = opponentSpeech(action);
    log('actions', { actor: 'opponent', type: pay > 0 ? 'call' : 'check', amount: pay });
    render();
    if (pay > 0) {
      // 相手がコール → ベットマッチ → 次ストリートへ
      setTimeout(advanceAfterCall, 900);
    } else {
      // 相手がチェック → プレイヤーに手番を渡す
      state.isPlayerTurn = true;
      state.mimiThought = '「相手はチェックか……こちらのターン」';
      setTimeout(render, 900);
    }
    return;
  }
  // ベット/レイズ
  const amount = betSizeToChips(action.size, state.pot, state.opponentChips);
  state.opponentChips -= amount;
  state.currentBetOpponent += amount;
  state.pot += amount;
  state.opponentSpeech = opponentSpeech(action);
  log('bets', { actor: 'opponent', type: 'bet', size: action.size, amount, intent: action.intent });
  log('reactions', { intent: action.intent, speech: state.opponentSpeech });
  // 大ベット時に重さ演出＋相手カットイン
  const bigBet = (action.size === 'pot_2_3' || action.size === 'pot_1' || action.size === 'allin');
  if (bigBet) {
    triggerBetShake(action.size);
    setTimeout(() => showOpponentCutIn(state.opponentSpeech, action.size), 300);
  }

  const bigEnough = (action.size === 'pot_2_3' || action.size === 'pot_1' || action.size === 'allin');
  const isBluffBet = (action.intent === 'bluff' || action.intent === 'forced_bluff' || action.intent === 'tutorial_bluff');
  const isPostFlop = (state.handPhase === 'flop' || state.handPhase === 'turn' || state.handPhase === 'river');
  const triggerFirstHand = (state.handNo === 1 && state.handPhase === 'flop' && bigEnough);
  // フルハンド：どのストリートでもブラフ意図の大ベットで50%発動
  const triggerBluff = (isPostFlop && bigEnough && isBluffBet && rand() < 0.5);
  // ヴェルベット（ボス戦）：各ストリートで確定発動
  const triggerBoss = state.isBoss && isPostFlop && bigEnough;
  // 心理バトル有効判定（チュートリアル中は常時ON、その他は設定に従う）
  const psychAllowed = state.tutorialMode || (save.psychEnabled !== false);
  if (psychAllowed && !state.psychResolved && (triggerFirstHand || triggerBluff || triggerBoss)) {
    render();
    const qid = pickPsychQuestion();
    setTimeout(() => triggerPsychBattle(qid), 900);
    return;
  }

  // 論理バトル：心理バトルが出なかった時、ストリート毎に発動チャンス
  const logicAllowed = state.tutorialMode || (save.logicEnabled !== false);
  const triggerLogic = logicAllowed && isPostFlop && !state.logicResolvedStreet && !state.psychResolved && rand() < 0.55;
  if (triggerLogic) {
    const lqid = pickLogicQuestion();
    if (lqid) {
      state.logicResolvedStreet = true;
      render();
      setTimeout(() => triggerPsychBattle(lqid), 900);
      return;
    }
  }

  state.isPlayerTurn = true;
  state.mimiThought = `「ポルカが${amount}ベット……強気だ」`;
  render();
}

function opponentPreflopStrength(hand) {
  const ranks = hand.map(c => c.rank).sort((a, b) => b - a);
  let s = (ranks[0] + ranks[1]) / 28;
  if (ranks[0] === ranks[1]) s += 0.25;
  if (hand[0].suit === hand[1].suit) s += 0.05;
  if (ranks[0] - ranks[1] === 1) s += 0.05;
  return Math.min(1, s);
}

//=============================================================
// 14. ハンド進行（フロップ → ターン＆リバー → ショーダウン）
//=============================================================
function advanceAfterCall() {
  // ベットが揃った
  state.currentBetPlayer = 0;
  state.currentBetOpponent = 0;
  if (state.handPhase === 'preflop') {
    // フロップ公開（scriptedFlopがあれば固定札）
    if (state.scriptedFlop) {
      state.community = state.scriptedFlop.map(c => ({...c}));
    } else {
      state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()];
    }
    state.handPhase = 'flop';
    state.mimiThought = `「フロップ：${renderCardsText(state.community)}」`;
    state.ricoAdvice = '「場が出たね〜。相手の出方をよく見な」';
    state.isPlayerTurn = false;  // 相手から
    log('actions', { phase: 'flop', cards: state.community.map(c=>c.label+c.suit) });
    render();
    if (state.tutorialMode) {
      showTutorial('flop_shown',
        'フロップは<b>A♥ 5♦ 9♣</b>！<br>' +
        'ミミの手札A♠ K♠と合わせると、<b>「Aのペア」</b>が完成。かなり強い手だよ。<br>' +
        'ここで私がガツンとベットしてくるから、よく見てね〜',
        () => setTimeout(opponentTurn, 400));
    } else {
      setTimeout(opponentTurn, 1000);
    }
  } else if (state.handPhase === 'flop') {
    if (state.fullHand) {
      // フルハンド：ターンのみ公開
      state.community.push(state.deck.pop());
      state.handPhase = 'turn';
      state.mimiThought = `「ターン公開：${renderCardsText(state.community)}」`;
      state.ricoAdvice = '「ターンで場が変わったかもね。相手のベットの変化、見逃さないで」';
      state.isPlayerTurn = false;
      state.psychResolved = false;  // 各ストリートで心理バトル再発生可能に
      state.logicResolvedStreet = false;
      log('actions', { phase: 'turn', cards: state.community.map(c=>c.label+c.suit) });
      render();
      setTimeout(opponentTurn, 1000);
    } else {
      // ライトハンド：ターン＆リバーまとめ
      if (state.scriptedTurnRiver) {
        state.community.push(...state.scriptedTurnRiver.map(c => ({...c})));
      } else {
        state.community.push(state.deck.pop(), state.deck.pop());
      }
      state.handPhase = 'turnRiver';
      state.mimiThought = `「ターン＆リバー：${renderCardsText(state.community)}」`;
      state.ricoAdvice = '「全部の場札出たね〜。最終判断、いい？」';
      state.isPlayerTurn = false;
      log('actions', { phase: 'turn_river', cards: state.community.map(c=>c.label+c.suit) });
      render();
      setTimeout(opponentTurn, 1000);
    }
  } else if (state.handPhase === 'turn') {
    // フルハンド：リバー公開
    state.community.push(state.deck.pop());
    state.handPhase = 'river';
    state.mimiThought = `「リバー公開：${renderCardsText(state.community)}」`;
    state.ricoAdvice = '「リバーまで出揃ったよ。ここから最終判断ね」';
    state.isPlayerTurn = false;
    state.psychResolved = false;
    state.logicResolvedStreet = false;
    log('actions', { phase: 'river', cards: state.community.map(c=>c.label+c.suit) });
    render();
    setTimeout(opponentTurn, 1000);
  } else if (state.handPhase === 'turnRiver' || state.handPhase === 'river') {
    return showdown();
  }
}

//=============================================================
// 15. 心理バトル
//=============================================================
function triggerPsychBattle(qid) {
  state.psychPending = true;
  // 出題履歴に追加
  if (!state.seenQuestions) state.seenQuestions = new Set();
  state.seenQuestions.add(qid);
  const q = PSYCH_QUESTIONS[qid];
  // v4 A1: 選択肢シャッフル
  const shuffled = shuffle(q.choices);
  const labels = ['A','B','C','D','E'];

  // モーダル描画
  const tpl = document.getElementById('tpl-psych-modal');
  const modal = tpl.content.cloneNode(true);
  app.appendChild(modal);

  const root = app.lastElementChild;
  // モーダル内の相手ポートレートを埋める
  const oppCharEl = root.querySelector('[data-bind="battleOpponentChar"]');
  if (oppCharEl) {
    const imgKey = state.opponentImgKey || 'polka';
    const oppName = state.opponentName || '相手';
    oppCharEl.innerHTML = `
      <img src="assets/characters/${imgKey}_default.png" alt="${oppName}" onerror="window.assetFallback(this,'${imgKey}')">
      <div class="portrait-name">${oppName}</div>
    `;
  }
  // モーダルタイプによってヘッダー差し替え（心理 / 論理）
  const isLogic = q.type === 'logic';
  const titleEl = root.querySelector('.psych-title');
  if (titleEl) {
    titleEl.innerHTML = isLogic
      ? '🧮 論理バトル<small class="battle-subtitle">— ポーカーの数学を覚える —</small>'
      : '🧠 心理バトル<small class="battle-subtitle">— 相手の本心を読む —</small>';
    titleEl.classList.toggle('logic-mode', isLogic);
  }
  // モーダル全体にもクラス
  const modalEl = root.querySelector('.psych-modal');
  if (modalEl) modalEl.classList.toggle('logic-mode', isLogic);
  // ルール文を上部に挿入
  if (isLogic && q.rule) {
    let ruleBox = root.querySelector('.logic-rule-box');
    if (!ruleBox) {
      ruleBox = document.createElement('div');
      ruleBox.className = 'logic-rule-box';
      ruleBox.innerHTML = `<div class="logic-rule-label">📘 今回のルール</div><div class="logic-rule-text">${q.rule}</div>`;
      titleEl.insertAdjacentElement('afterend', ruleBox);
    }
  }
  // 開幕心理バトルなど、場札・手札がない問題では当該セクションを隠す
  const hideBoardHand = (qid === 'velvet_opening') || (state.community.length === 0 && state.playerHand.length === 0);
  if (hideBoardHand) {
    root.querySelector('.psych-board-info').style.display = 'none';
    root.querySelector('.psych-hand-info').style.display = 'none';
  } else {
    renderCardsInto(root.querySelector('[data-bind="psychBoardCards"]'), state.community, 5);
    renderCardsInto(root.querySelector('[data-bind="psychHandCards"]'), state.playerHand, 2);
    root.querySelector('[data-bind="psychPot"]').textContent = state.pot;
  }
  // 改行を<br>に、HTMLタグも反映できるようinnerHTMLに
  root.querySelector('[data-bind="psychSituation"]').innerHTML = q.situationFn(state).replace(/\n/g, '<br>');
  // 相手キャラ顔を speech 部分に追加（心理バトルのみ、論理バトルは出さない）
  const speechEl = root.querySelector('[data-bind="psychSpeech"]');
  if (!isLogic && state.opponentImgKey && qid !== 'velvet_opening') {
    speechEl.innerHTML = `
      <div class="psych-opponent-face">
        <img src="assets/characters/${state.opponentImgKey}_default.png" alt="${state.opponentName}" onerror="window.assetFallback(this,'${state.opponentImgKey}')">
      </div>
      <div class="psych-opponent-line">
        <div class="psych-opponent-name">${state.opponentName}</div>
        <div class="psych-opponent-quote">「${q.speech}」</div>
      </div>
    `;
    speechEl.classList.add('with-portrait');
  } else {
    speechEl.textContent = `${state.opponentName || '相手'}：「${q.speech}」`;
    speechEl.classList.remove('with-portrait');
  }
  root.querySelector('[data-bind="zazazoHint"]').textContent = q.zazazoHint;

  const choicesEl = root.querySelector('[data-bind="psychChoices"]');
  shuffled.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.choiceId = c.id;
    btn.innerHTML = `<span class="choice-label">${labels[i]}</span>${c.text}`;
    btn.addEventListener('click', () => resolvePsych(qid, c, btn));
    choicesEl.appendChild(btn);
  });

  // ぱにゅぱにゅボタン
  const senseBtn = root.querySelector('[data-bind="panyuSenseBtn"]');
  // v4 B4: 初回はゲーム全体で1回無料
  const isFree = !state.panyuSenseFreeUsed;
  senseBtn.textContent = isFree ? 'ぱにゅぱにゅ（初回無料）' : `ぱにゅぱにゅ（${25}消費）`;
  if (!isFree && state.panyu < 25) {
    senseBtn.disabled = true;
    senseBtn.textContent = 'ぱにゅぱにゅ（ゲージ不足）';
  }
  senseBtn.addEventListener('click', () => usePanyuSense(qid, isFree));

  state.psychRoot = root;
  render(); // 背景再描画
  // モーダルは render() で消えるので再追加
  app.appendChild(root);
}

function usePanyuSense(qid, isFree) {
  if (!state.psychRoot) return;
  const cost = isFree ? 0 : 25;
  if (!isFree && state.panyu < 25) return;
  // 即時にコスト消費・ボタン無効化（取り消し不可なコミット）
  state.panyu -= cost;
  if (isFree) state.panyuSenseFreeUsed = true;
  const senseBtn = state.psychRoot.querySelector('[data-bind="panyuSenseBtn"]');
  const floatBtn = document.querySelector('.panyu-floating-btn');
  if (senseBtn) {
    senseBtn.disabled = true;
    senseBtn.textContent = '⏳ ぷにぷに中…';
  }
  if (floatBtn) { floatBtn.disabled = true; }

  // ぷにぷにミニゲーム開始
  showPanyuClicker(30, () => {
    if (senseBtn) senseBtn.textContent = '✓ ぱにゅぱにゅ使用';
    if (floatBtn) floatBtn.textContent = '✓ 使用済み';
    // ミミカットイン
    showMimiCutIn('ぱにゅ……ぱにゅ……', '・・・・・場がなごんだ');
    // ゾゾゾヒントを強調
    if (state.psychRoot) {
      const hint = state.psychRoot.querySelector('.zazazo-hint');
      if (hint && !hint.dataset.boosted) {
        hint.style.background = 'rgba(245,215,122,0.3)';
        hint.style.fontWeight = '700';
        hint.textContent += '  ←【強調】相手の動きをよく見て！';
        hint.dataset.boosted = '1';
      }
    }
    // Lv2効果：ハズレ選択肢を1つグレーアウト
    if (save.panyuSkills.senseLevel >= 2 && qid && PSYCH_QUESTIONS[qid] && state.psychRoot) {
      const q = PSYCH_QUESTIONS[qid];
      const choices = [...state.psychRoot.querySelectorAll('.choice-btn:not(.disabled-by-sense)')];
      const wrong = choices.find(b => {
        const c = q.choices.find(x => x.id === b.dataset.choiceId);
        return c && !c.correct;
      });
      if (wrong) {
        wrong.classList.add('disabled-by-sense');
        wrong.disabled = true;
        toast('ぱにゅぱにゅLv2：ハズレ1つを除外！');
        return;
      }
    }
    toast('ぱにゅぱにゅ発動：相手のゾゾゾ反応を強調！');
  });
}

// ぱにゅぱにゅ30タップミニゲーム
function showPanyuClicker(totalTaps, onComplete) {
  let count = totalTaps;
  let tapped = 0;
  let lastTapTime = 0;
  const overlay = document.createElement('div');
  overlay.className = 'panyu-clicker-overlay';
  overlay.innerHTML = `
    <div class="panyu-clicker-label-top">ぱにゅぱにゅタップ ${totalTaps} 回！</div>
    <div class="panyu-clicker-blob" id="panyu-blob">
      <div class="panyu-clicker-inner">
        <div class="panyu-clicker-count">${count}</div>
        <div class="panyu-clicker-sublabel">タップ！</div>
      </div>
      <div class="panyu-progress-ring">
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <circle class="panyu-ring-bg" cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
          <circle class="panyu-ring-fill" cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="4"
                  stroke-dasharray="289" stroke-dashoffset="289" stroke-linecap="round"
                  transform="rotate(-90 50 50)" />
        </svg>
      </div>
    </div>
    <div class="panyu-combo" data-bind="panyuCombo"></div>
  `;
  document.body.appendChild(overlay);
  const blob = overlay.querySelector('#panyu-blob');
  const countEl = overlay.querySelector('.panyu-clicker-count');
  const ringFill = overlay.querySelector('.panyu-ring-fill');
  const comboEl = overlay.querySelector('.panyu-combo');
  let completed = false;

  const updateColor = () => {
    const ratio = tapped / totalTaps;
    // ピンク→赤→ゴールドへ変化
    const hueShift = ratio * 30;  // 0→30度
    blob.style.filter = `hue-rotate(-${hueShift}deg) saturate(${1 + ratio * 0.4})`;
    // プログレスリング更新
    const offset = 289 * (1 - ratio);
    ringFill.style.strokeDashoffset = offset;
  };

  const showCombo = (n) => {
    comboEl.textContent = `×${n} COMBO!`;
    comboEl.classList.remove('show');
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
  };

  const onTap = (e) => {
    if (completed) return;
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const fastTap = (now - lastTapTime) < 250;
    lastTapTime = now;
    count--;
    tapped++;
    countEl.textContent = Math.max(0, count);
    updateColor();
    // 振動（モバイル）
    if (navigator.vibrate) navigator.vibrate(30);
    // パーティクル（高速タップで増量）
    const burstN = fastTap ? 3 : 1;
    for (let i = 0; i < burstN; i++) spawnPanyuParticle(overlay);
    // 10/20で COMBOボーナス
    if (tapped === 10) showCombo(10);
    else if (tapped === 20) showCombo(20);
    else if (tapped === 25) showCombo(25);
    // ぷにぷに アニメーション再生（タップ後は弾むアイドルに戻す）
    blob.classList.remove('wobble', 'wobble-fast');
    void blob.offsetWidth;
    const wobbleCls = fastTap ? 'wobble-fast' : 'wobble';
    blob.classList.add(wobbleCls);
    setTimeout(() => blob.classList.remove(wobbleCls), fastTap ? 220 : 320);
    if (count <= 0) {
      completed = true;
      blob.classList.add('panyu-complete');
      // 完了 SE 風振動
      if (navigator.vibrate) navigator.vibrate([60, 30, 80, 30, 120]);
      // バースト
      for (let i = 0; i < 16; i++) spawnPanyuParticle(overlay);
      const label = overlay.querySelector('.panyu-clicker-label-top');
      if (label) label.innerHTML = '<span class="panyu-burst-text">✨ ぱにゅぱにゅ発動！ ✨</span>';
      setTimeout(() => {
        overlay.remove();
        if (onComplete) onComplete();
      }, 900);
    }
  };
  blob.addEventListener('click', onTap);
  blob.addEventListener('touchstart', onTap, { passive: false });
  updateColor();
}

function spawnPanyuParticle(parent) {
  const p = document.createElement('div');
  p.className = 'panyu-particle';
  p.textContent = pick(['💖', '✨', '♡', '🌸', '💫', '🐰']);
  const angle = rand() * Math.PI * 2;
  const dist = 70 + rand() * 80;
  p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
  p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
  // ランダムフォントサイズで個性を
  p.style.fontSize = (20 + rand() * 16) + 'px';
  parent.appendChild(p);
  setTimeout(() => p.remove(), 800);
}

function resolvePsych(qid, choice, btn) {
  if (!state.psychRoot) return;
  // 全選択肢＆ぱにゅぱにゅを無効化
  state.psychRoot.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  const senseBtnLock = state.psychRoot.querySelector('[data-bind="panyuSenseBtn"]');
  if (senseBtnLock) {
    senseBtnLock.disabled = true;
    if (!senseBtnLock.textContent.includes('✓')) {
      senseBtnLock.textContent = 'ぱにゅぱにゅ（使用不可）';
    }
  }
  btn.style.borderColor = choice.correct ? 'var(--c-gold-bright)' : 'var(--c-red-bright)';

  const q = PSYCH_QUESTIONS[qid];

  if (choice.correct) {
    const eff = q.onSuccess;
    state.panyu = Math.min(state.panyuMax, state.panyu + eff.panyu);
    state.zazazo = Math.min(state.zazazoMax, state.zazazo + eff.zazazo);
    state.psychSuccessCount++;
    state.mimiThought = `「読めた……！${eff.hint}」`;
    state.ricoAdvice = `「${eff.rico}」`;
    log('psych', { qid, choice: choice.id, success: true });
    // 証拠突きつけ成功でブラフブレイク確定
    if (eff.bluffBreak) triggerBluffBreak();
    else if (state.zazazo >= state.zazazoMax) triggerBluffBreak();
  } else {
    const eff = q.onFail;
    state.panyu = Math.max(0, state.panyu + eff.panyu);
    state.mimiThought = `「${eff.mimi}」`;
    state.ricoAdvice = `「${eff.rico}」`;
    log('psych', { qid, choice: choice.id, success: false });
  }

  // 選んだボタンの枠色で正誤を瞬間フィードバック（結果バナーはカットインに集約）
  state.psychResolved = true;
  state.psychPending = false;

  setTimeout(() => {
    if (state.psychRoot) {
      state.psychRoot.remove();
      state.psychRoot = null;
    }
    // 講義モード：正解数カウント＋次の問題へ
    if (state.lectureMode) {
      if (choice.correct) state.lectureCorrect++;
      state.lectureIdx++;
      const resultPrefix = choice.correct ? '✓ 正解！　' : '✗ 残念……　';
      showRicoCutIn(resultPrefix + state.ricoAdvice.replace(/^「|」$/g, ''), choice.correct, () => {
        triggerLectureQuestion();
      });
      return;
    }
    state.isPlayerTurn = true;
    render();
    const resultPrefix = choice.correct ? '✓ 正解！　' : '✗ 残念……　';
    const onCutInClose = state.tutorialMode && state.opponentId === 'rico_tutorial' && !state.lectureMode
      ? () => showTutorial('after_psych',
          '心理バトル解決！ぱにゅゲージが回復したね。<br>' +
          'あとはAペアの強さを信じて、<b>「コール」</b>か<b>「1/2ポット」</b>でベットしてみよう。<br>' +
          '私はもう手を引くから、安心していいよ。')
      : null;
    showRicoCutIn(resultPrefix + state.ricoAdvice.replace(/^「|」$/g, ''), choice.correct, onCutInClose);
  }, 700);
}

function triggerBluffBreak() {
  state.bluffBreakHappened = true;
  // v4 A3: 発生後ゲージは0にリセット
  state.zazazo = 0;
  const eff = document.createElement('div');
  eff.className = 'bluff-break-effect';
  eff.innerHTML = '<div class="text">ブラフブレイク！</div>';
  document.body.appendChild(eff);
  setTimeout(() => eff.remove(), 1800);
  toast('ポルカの勝負空気が崩れた！');
}

//=============================================================
// 16. ショーダウン → ハンド終了
//=============================================================
function showdown() {
  const playerAll = [...state.playerHand, ...state.community];
  const oppAll = [...state.opponentHand, ...state.community];
  const pEv = evaluateHand(playerAll);
  const oEv = evaluateHand(oppAll);

  // 最大役更新
  if (pEv.rank > state.bestHandRank) {
    state.bestHandRank = pEv.rank;
    state.bestHandName = pEv.name;
  }

  let winner;
  if (pEv.score > oEv.score) winner = 'player';
  else if (pEv.score < oEv.score) winner = 'opponent';
  else winner = 'split';

  state.opponentSpeech = `相手の役：${oEv.name}`;

  if (winner === 'player') {
    state.playerChips += state.pot;
    state.mimiThought = `「やった！${pEv.name}で勝った！」`;
    state.handResults.push({ hand: state.handNo, winner: 'player', reason: 'showdown', pot: state.pot, pEv, oEv });
  } else if (winner === 'opponent') {
    state.opponentChips += state.pot;
    state.mimiThought = `「うう……${oEv.name}には勝てなかった……」`;
    state.handResults.push({ hand: state.handNo, winner: 'opponent', reason: 'showdown', pot: state.pot, pEv, oEv });
  } else {
    state.playerChips += Math.floor(state.pot / 2);
    state.opponentChips += Math.ceil(state.pot / 2);
    state.mimiThought = '「引き分けだ……」';
    state.handResults.push({ hand: state.handNo, winner: 'split', reason: 'showdown', pot: state.pot, pEv, oEv });
  }
  state.pot = 0;
  render();
  setTimeout(endHand, 2200);
}

function endHand() {
  state.handPhase = 'idle';
  state.opponentSpeech = '';
  // 連勝カウンタ更新
  const last = state.handResults[state.handResults.length - 1];
  if (last) {
    if (last.winner === 'player') state.consecutiveWins = (state.consecutiveWins || 0) + 1;
    else if (last.winner === 'opponent') state.consecutiveWins = 0;
  }
  // 結果バナー表示
  showHandResultBanner();
}

function showHandResultBanner() {
  const last = state.handResults[state.handResults.length - 1];
  if (!last) return continueAfterHand();

  const tpl = document.createElement('div');
  tpl.className = 'hand-result-overlay';

  let winnerText, winnerClass, detailHtml;
  const playerHandStr = state.playerHand.map(c =>
    `<span class="${(c.suit==='♥'||c.suit==='♦')?'red':''}">${c.label}${c.suit}</span>`
  ).join(' ');
  const oppHandStr = state.opponentHand.map(c =>
    `<span class="${(c.suit==='♥'||c.suit==='♦')?'red':''}">${c.label}${c.suit}</span>`
  ).join(' ');
  const communityStr = state.community.map(c =>
    `<span class="${(c.suit==='♥'||c.suit==='♦')?'red':''}">${c.label}${c.suit}</span>`
  ).join(' ');

  if (last.winner === 'player') {
    winnerText = '🏆 ミミ の勝利！';
    winnerClass = 'win';
  } else if (last.winner === 'opponent') {
    winnerText = `${state.opponentName} の勝利……`;
    winnerClass = 'lose';
  } else {
    winnerText = '引き分け';
    winnerClass = 'draw';
  }

  let reasonHtml = '';
  if (last.reason === 'fold') {
    reasonHtml = `<div class="result-reason-row">ミミがフォールド → ${state.opponentName}がポット獲得</div>`;
  } else if (last.reason === 'opponentFold') {
    reasonHtml = `<div class="result-reason-row">${state.opponentName}がフォールド → ミミがポット獲得</div>`;
  } else if (last.reason === 'showdown') {
    reasonHtml = `
      <div class="result-cards-row">
        <div class="result-card-block">
          <div class="result-cards-label">ミミの手札</div>
          <div class="result-cards-str">${playerHandStr}</div>
          <div class="result-hand-name">${last.pEv?.name || '-'}</div>
        </div>
        <div class="result-vs">VS</div>
        <div class="result-card-block">
          <div class="result-cards-label">${state.opponentName}の手札</div>
          <div class="result-cards-str">${oppHandStr}</div>
          <div class="result-hand-name">${last.oEv?.name || '-'}</div>
        </div>
      </div>
      ${communityStr ? `<div class="result-community-row">場札：${communityStr}</div>` : ''}
    `;
  }

  detailHtml = `
    <div class="hand-result-card ${winnerClass}">
      <div class="hand-result-handno">Hand ${last.hand} 結果</div>
      <div class="hand-result-title">${winnerText}</div>
      <div class="hand-result-pot">ポット ${last.pot} を獲得</div>
      ${reasonHtml}
      <div class="hand-result-chips">
        <span>ミミ：${state.playerChips}</span>
        <span>${state.opponentName}：${state.opponentChips}</span>
      </div>
      <button class="btn btn-primary big" id="continue-hand-btn">${continueButtonLabel()}</button>
    </div>
  `;
  tpl.innerHTML = detailHtml;
  document.body.appendChild(tpl);
  document.getElementById('continue-hand-btn').addEventListener('click', () => {
    tpl.remove();
    continueAfterHand();
  });
}

function continueButtonLabel() {
  if (state.playerChips <= 0 || state.opponentChips <= 0 || state.handNo >= state.maxHands) {
    return '対戦結果を見る';
  }
  if (isDominanceMode()) return '⚡ 圧倒モード突入！';
  return `次のハンド (Hand ${state.handNo + 1}) へ`;
}

function continueAfterHand() {
  if (state.playerChips <= 0 || state.opponentChips <= 0 || state.handNo >= state.maxHands) {
    return endBattle();
  }
  // 圧倒モード判定
  const domMode = isDominanceMode();
  if (domMode && !state.tutorialMode) {
    state.dominanceUsed = true;
    state.dominanceType = domMode;  // 'complete' or 'comeback'
    return startDominanceMode();
  }
  state.mimiThought = '「次のハンドだ。集中していこう」';
  render();
}

// 圧倒モード判定：プレイヤーチップが初期の1.7倍以上 かつ 相手が初期の半分以下
// 圧倒モード発動判定：
// - 完勝モード：プレイヤー優勢時に5連勝
// - 逆転モード：プレイヤー劣勢時に2連勝
function isDominanceMode() {
  if (state.dominanceUsed) return false; // 1戦1回まで
  const initial = OPPONENTS[state.opponentId]?.chips || 1000;
  const wins = state.consecutiveWins || 0;
  const playerAhead = state.playerChips > initial;
  // 完勝モード：優勢 + 5連勝
  if (playerAhead && wins >= 5) return 'complete';
  // 逆転モード：劣勢 + 2連勝
  if (!playerAhead && wins >= 2) return 'comeback';
  return false;
}

// 圧倒モード：派手アクションシーン＋3分岐選択
function startDominanceMode() {
  state.dominanceMode = true;
  showDominanceIntro(() => {
    showDominanceChoiceModal();
  });
}

// 完勝/逆転モードの導入バナー
function showDominanceIntro(onContinue) {
  const type = state.dominanceType || 'complete';
  const overlay = document.createElement('div');
  overlay.className = 'dominance-overlay dominance-intro';
  const titleText = type === 'comeback' ? '✦ 逆転の刻 ✦' : '⚡ 圧倒モード ⚡';
  const subText = type === 'comeback'
    ? `2連勝で勝負空気が変わった！ ミミの覚醒！`
    : `${state.consecutiveWins}連勝！ 完全に流れを掴んだ！`;
  overlay.innerHTML = `
    <div class="dominance-flash"></div>
    <div class="dominance-banner">
      <div class="dominance-text dominance-${type}">${titleText}</div>
      <div class="dominance-sub">— ${subText} —</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 画面振動
  const stage = document.getElementById('stage');
  if (stage) {
    stage.classList.add('shake-allin');
    setTimeout(() => stage.classList.remove('shake-allin'), 700);
  }
  if (navigator.vibrate) navigator.vibrate([100, 60, 150]);
  setTimeout(() => overlay.classList.add('out'), 2400);
  setTimeout(() => { overlay.remove(); onContinue(); }, 3000);
}

// 3つの選択肢モーダル
function showDominanceChoiceModal() {
  const type = state.dominanceType || 'complete';
  const overlay = document.createElement('div');
  overlay.className = 'dominance-choice-overlay';
  overlay.innerHTML = `
    <div class="dominance-choice-modal">
      <h2 class="dominance-choice-title">${type === 'comeback' ? '🔥 逆転の鍵を選べ' : '⚡ どう仕留める？'}</h2>
      <p class="dominance-choice-sub">${type === 'comeback' ? '流れを完全に変える一手を' : '完勝の決め手を選ぼう'}</p>
      <div class="dominance-choice-list">
        <button class="dominance-choice-btn" data-choice="full">
          <div class="dchoice-icon">💰</div>
          <div class="dchoice-name">全取り</div>
          <div class="dchoice-desc">相手チップを完全に削り切る最大の勝利。バリュー最大化</div>
        </button>
        <button class="dominance-choice-btn dchoice-mid" data-choice="break">
          <div class="dchoice-icon">💔</div>
          <div class="dchoice-name">心腰を折る</div>
          <div class="dchoice-desc">相手の精神を粉砕。チップ大削り＋ティルト誘発で再戦時にも有利に</div>
        </button>
        <button class="dominance-choice-btn dchoice-mercy" data-choice="mercy">
          <div class="dchoice-icon">🌸</div>
          <div class="dchoice-name">見逃す</div>
          <div class="dchoice-desc">余裕の貫禄。チップは少し取るだけで終わらせる、紳士的勝利</div>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.dominance-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      state.dominanceChoice = choice;
      overlay.classList.add('out');
      setTimeout(() => { overlay.remove(); executeDominance(choice); }, 400);
    });
  });
}

// 選んだ分岐に応じて演出を実行
function executeDominance(choice) {
  // 演出パラメータ
  const settings = {
    full:   { drainRate: 1.0,  hands: 5, mimiLine: '全部、もらった！',       oppLine: 'うう……これが、実力か……',     bursts: 8 },
    break:  { drainRate: 0.95, hands: 6, mimiLine: 'ここまでよ。降参して！', oppLine: 'もう……立ち上がれない……', bursts: 12 },
    mercy:  { drainRate: 0.5,  hands: 3, mimiLine: '今回はここまでにしとく', oppLine: 'く……感謝するわ……',         bursts: 4 },
  };
  const s = settings[choice] || settings.full;
  // ミミ宣言カットイン
  showRicoCutIn(s.mimiLine, true, () => {
    // 相手の反応
    showOpponentCutIn(s.oppLine);
    setTimeout(() => dominanceActionLoop(s, 0), 1800);
  });
}

// 派手なアクションループ
function dominanceActionLoop(s, iteration) {
  if (state.opponentChips <= 0 || iteration >= s.hands) {
    setTimeout(() => {
      // 完了画面
      showDominanceComplete(state.dominanceChoice);
    }, 800);
    return;
  }
  state.handNo++;
  // 削減量計算（選択により最終的に相手チップが何%残るか）
  const remainingHands = s.hands - iteration;
  const drainPortion = remainingHands > 0 ? state.opponentChips / remainingHands : state.opponentChips;
  const drain = Math.min(state.opponentChips, Math.floor(drainPortion * s.drainRate));
  state.opponentChips -= drain;
  state.playerChips += drain;
  state.handResults.push({
    hand: state.handNo, winner: 'player', reason: 'dominance', pot: drain, by: '圧倒',
  });
  // 派手バースト
  for (let i = 0; i < s.bursts; i++) {
    setTimeout(() => spawnDominanceBurst(drain, i), i * 40);
  }
  // 画面振動
  const stage = document.getElementById('stage');
  if (stage) {
    stage.classList.add('shake-strong');
    setTimeout(() => stage.classList.remove('shake-strong'), 500);
  }
  if (navigator.vibrate) navigator.vibrate(50);
  render();
  setTimeout(() => dominanceActionLoop(s, iteration + 1), 800);
}

function spawnDominanceBurst(amount, index) {
  const burst = document.createElement('div');
  burst.className = 'dominance-burst';
  const angle = (Math.PI * 2 * index) / 8 + rand() * 0.3;
  const dist = 80 + rand() * 100;
  burst.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
  burst.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
  burst.innerHTML = `
    <div class="dominance-burst-text">+${amount}</div>
    <div class="dominance-burst-sub">${pick(['圧倒！','見たぜ！','読み切り！','完璧！','ぱにゅ！'])}</div>
  `;
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1100);
}

// 完了演出（選択によって違うメッセージ）
function showDominanceComplete(choice) {
  const messages = {
    full:  { title: '💎 完勝！', sub: '全チップを奪い取った', color: '#ffd55a' },
    break: { title: '💔 心折！', sub: '相手の戦意を完全に折った', color: '#ff5577' },
    mercy: { title: '🌸 見逃し', sub: '余裕の貫禄で締めくくった', color: '#ffc1d8' },
  };
  const m = messages[choice] || messages.full;
  const overlay = document.createElement('div');
  overlay.className = 'dominance-overlay dominance-finish';
  overlay.innerHTML = `
    <div class="dominance-banner">
      <div class="dominance-text" style="color:${m.color}">${m.title}</div>
      <div class="dominance-sub">${m.sub}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('out'), 2200);
  setTimeout(() => { overlay.remove(); endBattle(); }, 2800);
}

//=============================================================
// 17. バトル終了 → リザルト（v4 A5: SS/S/A/B/Cスコア式）
//=============================================================
const SCORE_TABLE = { win:50, psychSuccess:10, bluffCatch:15, goodFold:10, goodCall:10, allInWin:20, bluffBreak:25, comebackWin:30 };
const RANK_THRESHOLDS = [
  { rank: 'SS', min: 120 },
  { rank: 'S',  min:  95 },
  { rank: 'A',  min:  75 },
  { rank: 'B',  min:  60 },
  { rank: 'C',  min:   0 },
];

function endBattle() {
  // セーブ反映：ぱにゅぱにゅ初回無料を消費したか
  if (state.panyuSenseFreeUsed) save.panyuSenseFreeUsed = true;

  if (state.tutorialMode) {
    // チュートリアル：初回のみ200コイン、再戦は0（タダ稼ぎ防止）
    const isFirstTime = !save.firstClearRewardClaimed.includes('rico_tutorial');
    if (isFirstTime) {
      save.coins += 200;
      save.firstClearRewardClaimed.push('rico_tutorial');
    }
    if (!save.clearedStages.includes('rico_tutorial')) save.clearedStages.push('rico_tutorial');
    saveProgress();
    return endTutorial();
  }
  const won = state.playerChips > state.opponentChips;
  let score = 0;
  const reasons = [];
  if (won) { score += SCORE_TABLE.win; reasons.push(`勝利 +${SCORE_TABLE.win}`); }
  if (state.psychSuccessCount > 0) {
    const s = SCORE_TABLE.psychSuccess * state.psychSuccessCount;
    score += s;
    reasons.push(`心理バトル成功×${state.psychSuccessCount} +${s}`);
  }
  if (state.bluffBreakHappened) { score += SCORE_TABLE.bluffBreak; reasons.push(`ブラフブレイク +${SCORE_TABLE.bluffBreak}`); }
  // ボス勝利ボーナス（ヴェルベット撃破）
  if (won && state.isBoss) { score += 40; reasons.push(`ボス撃破ボーナス +40`); }
  // オールイン勝利・逆転勝利の簡易検出
  const lastHand = state.handResults[state.handResults.length - 1];
  if (won && lastHand && lastHand.winner === 'player' && state.opponentChips === 0) {
    score += SCORE_TABLE.allInWin;
    reasons.push(`オールイン圧勝 +${SCORE_TABLE.allInWin}`);
  }

  state.score = score;
  const rank = RANK_THRESHOLDS.find(r => score >= r.min).rank;
  const opp = OPPONENTS[state.opponentId];

  // 報酬・セーブ反映
  let earned = 0;
  const rewards = [];
  if (won) {
    const firstClear = !save.firstClearRewardClaimed.includes(state.opponentId);
    if (firstClear) {
      earned += opp.rewardFirst;
      rewards.push(`初回クリア報酬：+${opp.rewardFirst}`);
      save.firstClearRewardClaimed.push(state.opponentId);
    } else {
      earned += opp.rewardRematch;
      rewards.push(`再戦勝利報酬：+${opp.rewardRematch}`);
    }
    if (rank === 'S' || rank === 'SS') {
      earned += opp.rewardSBonus;
      rewards.push(`${rank}評価ボーナス：+${opp.rewardSBonus}`);
    }
    // 初回クリアでノート解放（v4 A4）
    if (firstClear && opp.unlockNoteOnClear) {
      const noteId = opp.unlockNoteOnClear;
      if (!save.unlockedNotes.includes(noteId)) {
        save.unlockedNotes.push(noteId);
        rewards.push(`戦術ノート解放：${noteId}`);
      } else {
        // 既に購入済み → コイン補填+100
        earned += 100;
        rewards.push(`戦術ノート所持済み → +100コイン補填`);
      }
    }
    // クリア記録
    if (!save.clearedStages.includes(state.opponentId)) {
      save.clearedStages.push(state.opponentId);
    }
    // ベストランク・スコア更新
    const rankOrder = ['C','B','A','S','SS'];
    const prevIdx = rankOrder.indexOf(save.bestRanks[state.opponentId] || 'C');
    const newIdx = rankOrder.indexOf(rank);
    if (newIdx > prevIdx) save.bestRanks[state.opponentId] = rank;
    if (!save.bestScores[state.opponentId] || score > save.bestScores[state.opponentId]) {
      save.bestScores[state.opponentId] = score;
    }
  } else {
    earned = 50;
    rewards.push(`参加賞：+50`);
  }
  save.coins += earned;
  state.coinsEarned = earned;
  state.rewards = rewards;
  saveProgress();

  // 画面へ
  state.screen = 'result';
  state.resultWon = won;
  state.rank = rank;
  state.scoreReasons = reasons;
  render();

  // 結果反映
  const t = document.querySelector('[data-bind="resultTitle"]');
  if (t) {
    t.textContent = won ? '勝利' : '敗北';
    if (!won) t.classList.add('lose');
  }
  const setText = (k, v) => { const el = document.querySelector(`[data-bind="${k}"]`); if (el) el.textContent = v; };
  setText('rankValue', rank);
  setText('earnedCoins', state.coinsEarned);
  setText('score', score);
  setText('psychSuccess', state.psychSuccessCount);
  setText('bestHand', state.bestHandName);
  setText('bluffBreak', state.bluffBreakHappened ? 'あり' : 'なし');
  const r = document.querySelector('[data-bind="resultReason"]');
  if (r) {
    r.innerHTML = '<strong>スコア内訳：</strong><br>' +
      (reasons.length ? reasons.join(' / ') : '加点なし') +
      '<br><br><strong>獲得報酬：</strong><br>' +
      (state.rewards && state.rewards.length ? state.rewards.join('<br>') : 'なし');
  }

  // ヴェルベット勝利 → エンディングへ進むボタン追加 + 闘札大逆転演出
  if (won && state.opponentId === 'velvet') {
    save.endingUnlocked = true;
    saveProgress();
    triggerTousatsuDaigyakuten();
    const btns = document.querySelector('[data-bind="resultButtons"]');
    if (btns) {
      btns.innerHTML = `
        <button class="btn btn-primary big" data-action="go-ending">✨ エンディングへ ✨</button>
        <button class="btn btn-secondary" data-action="back-stage">ロビーへ</button>
      `;
      // 動的に追加したボタンを再バインド
      btns.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', onAction));
    }
  }
}

function triggerTousatsuDaigyakuten() {
  const eff = document.createElement('div');
  eff.className = 'tousatsu-effect';
  eff.innerHTML = `
    <div class="tousatsu-glow"></div>
    <div class="tousatsu-text">闘札<br>大逆転！</div>
    <div class="tousatsu-sub">— ミミの読みが、すべてを覆した —</div>
  `;
  document.body.appendChild(eff);
  setTimeout(() => eff.classList.add('out'), 3000);
  setTimeout(() => eff.remove(), 3800);
}

//=============================================================
// 18. トースト
//=============================================================
//=============================================================
// 17a. チュートリアル終了
//=============================================================
//=============================================================
// 講義モード（リコ先輩の8章24問）
//=============================================================
// 章ごとにグループ化したレッスン構成
const LESSON_CHAPTERS = [
  { key: 1,     title: '第1章：ポーカーって何？',                 ids: ['lesson_1_1', 'lesson_1_2', 'lesson_1_3'] },
  { key: 2,     title: '第2章：基本用語',                       ids: ['lesson_2_1', 'lesson_2_2', 'lesson_2_3'] },
  { key: '用語', title: '特別講座：用語集（s/o・コネクター・ナッツ・チェックレイズ）',
                                                            ids: ['lesson_term_1', 'lesson_term_2', 'lesson_term_3', 'lesson_term_4'] },
  { key: 3,     title: '第3章：ハンドの流れ',                   ids: ['lesson_3_1', 'lesson_3_2', 'lesson_3_3'] },
  { key: 4,     title: '第4章：5つのアクション',                 ids: ['lesson_4_1', 'lesson_4_2', 'lesson_4_3'] },
  { key: 5,     title: '第5章：役の強さ',                       ids: ['lesson_5_1', 'lesson_5_2', 'lesson_5_3'] },
  { key: '実戦', title: '実戦講座：役を見つけよう（4問ハンズオン）',
                                                            ids: ['lesson_hand_1', 'lesson_hand_2', 'lesson_hand_3', 'lesson_hand_4'] },
  { key: 6,     title: '第6章：確率と勝率',                     ids: ['lesson_6_1', 'lesson_6_2', 'lesson_6_3'] },
  { key: 7,     title: '第7章：定石',                          ids: ['lesson_7_1', 'lesson_7_2', 'lesson_7_3'] },
  { key: 8,     title: '第8章：心理戦・読み',                   ids: ['lesson_8_1', 'lesson_8_2', 'lesson_8_3'] },
  { key: 'マナー', title: '特別講座：バンクロール・マナー・禁止行為',
                                                            ids: ['lesson_bank_1', 'lesson_bank_2', 'lesson_bank_3'] },
];
// フラット順序（互換性）
const LESSON_ORDER = LESSON_CHAPTERS.flatMap(c => c.ids);

function startLecture(opponentId) {
  state = defaultState();
  state.opponentId = opponentId;
  const opp = OPPONENTS[opponentId];
  state.opponentName = opp.name;
  state.opponentImgKey = opp.imgKey;
  state.lectureMode = true;
  // 中断進捗があれば引き継ぎ
  const saved = save.lectureProgress || null;
  state.lectureIdx = saved ? saved.idx : 0;
  state.lectureCorrect = saved ? saved.correct : 0;
  state.lectureTotal = LESSON_ORDER.length;
  state.screen = 'battle';
  state.handPhase = 'lecture';
  state.tutorialMode = true;
  state.ricoAdvice = '「ようこそ。じっくり基礎を覚えていこ〜」';
  state.mimiThought = saved ? '「続きから……お願いします！」' : '「リコ先輩、よろしくお願いします！」';
  render();
  showLectureIntro(() => {
    triggerLectureQuestion();
  }, saved);
}

function showLectureIntro(onContinue, savedProgress) {
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  const resumeMsg = savedProgress
    ? `<p style="font-size:15px;line-height:1.7;background:rgba(245,215,122,0.15);padding:10px;border-radius:8px;border:1px solid var(--c-gold);">📌 <b>続きから再開</b>：${savedProgress.idx}問目から、${savedProgress.correct}問正解中</p>`
    : '';
  overlay.innerHTML = `
    <div class="tutorial-bubble">
      <div class="tutorial-step">${savedProgress ? '講義再開' : '講義開始'}</div>
      <h2 style="color:var(--c-red);font-size:24px;margin:0 0 14px;letter-spacing:0.15em;">📚 リコ先輩のポーカー講義</h2>
      ${resumeMsg}
      <p style="font-size:17px;line-height:1.8;">よろしく〜！ ミミに <b>ポーカーの基本</b> をじっくり教えるね。</p>
      <p style="font-size:15px;line-height:1.7;">
        全 <b>11章 ／ ${LESSON_ORDER.length}問</b>。<br>
        歴史・用語・流れ・アクション・役・確率・定石・心理戦・<br>
        <b>用語集（s/o・ナッツ等）／実戦ハンズオン／マナー・禁止行為</b>まで網羅。
      </p>
      <p style="font-size:14px;color:var(--c-red);line-height:1.7;">
        ※ 各章の開始時に「<u>始める／スキップ／中断</u>」が選べる<br>
        ※ 間違えても OK、解説で覚えればOK
      </p>
      <div class="tutorial-actions">
        <button class="next-btn" type="button">▶ ${savedProgress ? '続ける' : '始める'}</button>
        ${savedProgress ? '<button class="restart-btn" type="button">最初からやり直す</button>' : ''}
        <button class="skip-btn" type="button">全スキップ</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.next-btn').addEventListener('click', () => {
    overlay.remove();
    onContinue();
  });
  const restartBtn = overlay.querySelector('.restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (!confirm('進捗を捨てて最初から始めますか？')) return;
      state.lectureIdx = 0;
      state.lectureCorrect = 0;
      save.lectureProgress = null;
      saveProgress();
      overlay.remove();
      onContinue();
    });
  }
  overlay.querySelector('.skip-btn').addEventListener('click', () => {
    if (!confirm('講義を全スキップしますか？基礎は身につきませんが、すぐにポルカ戦に進めます。')) return;
    overlay.remove();
    finishLecture(true);
  });
}

function triggerLectureQuestion() {
  if (state.lectureIdx >= LESSON_ORDER.length) {
    finishLecture(false);
    return;
  }
  const qid = LESSON_ORDER[state.lectureIdx];
  const q = PSYCH_QUESTIONS[qid];
  if (!q) {
    state.lectureIdx++;
    return triggerLectureQuestion();
  }
  // 章タイトルが変わるタイミングで章バナーを表示
  const prevChapter = state.lectureIdx > 0 ? PSYCH_QUESTIONS[LESSON_ORDER[state.lectureIdx - 1]]?.chapter : null;
  if (q.chapter !== prevChapter) {
    showChapterBanner(q.chapter, q.chapterTitle, (action) => {
      if (action === 'skip') {
        // この章の問題を全部スキップ
        const ch = LESSON_CHAPTERS.find(c => c.key === q.chapter);
        if (ch) {
          state.lectureIdx += ch.ids.length;
        }
        triggerLectureQuestion();
      } else if (action === 'exit') {
        exitLectureMidway();
      } else {
        doLectureModal(qid);
      }
    });
  } else {
    doLectureModal(qid);
  }
}

function exitLectureMidway() {
  // 進捗を保存して中断
  save.lectureProgress = { idx: state.lectureIdx, correct: state.lectureCorrect };
  saveProgress();
  state = defaultState();
  state.screen = 'stageSelect';
  render();
  toast('講義を中断しました。続きはリコ先輩から再開できます');
}

function showChapterBanner(num, title, onClose) {
  const banner = document.createElement('div');
  banner.className = 'chapter-banner';
  const isSpecial = typeof num === 'string';
  banner.innerHTML = `
    <div class="chapter-num">${isSpecial ? '特別講座' : `CHAPTER ${num}`}</div>
    <div class="chapter-title">${title.replace(/^第\d+章：|^特別講座：|^実戦講座：/, '')}</div>
    <div class="chapter-actions">
      <button class="chapter-btn chapter-start" type="button">▶ この章を始める</button>
      <button class="chapter-btn chapter-skip" type="button">この章をスキップ ⏭</button>
      <button class="chapter-btn chapter-exit" type="button">講義を中断する ✕</button>
    </div>
  `;
  document.body.appendChild(banner);
  banner.querySelector('.chapter-start').addEventListener('click', (e) => {
    e.stopPropagation();
    banner.classList.add('out');
    setTimeout(() => { banner.remove(); onClose('start'); }, 400);
  });
  banner.querySelector('.chapter-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    banner.classList.add('out');
    setTimeout(() => { banner.remove(); onClose('skip'); }, 400);
  });
  banner.querySelector('.chapter-exit').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!confirm('講義を中断してロビーへ戻りますか？\n（進捗は次回引き継ぎ）')) return;
    banner.classList.add('out');
    setTimeout(() => { banner.remove(); onClose('exit'); }, 400);
  });
}

function doLectureModal(qid) {
  triggerPsychBattle(qid);
  // 心理バトル resolve をフックして lecture 進行
  // 既存 resolvePsych の最後に lecture 進行を埋め込みたいので、ここでは何もしない（resolvePsychが lecture用にも対応する）
}

function finishLecture(skipped) {
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  const scorePct = Math.round((state.lectureCorrect / state.lectureTotal) * 100);
  overlay.innerHTML = `
    <div class="tutorial-bubble">
      <div class="tutorial-step">講義完了</div>
      <h2 style="color:var(--c-red);font-size:26px;margin:0 0 14px;letter-spacing:0.15em;">📖 講義お疲れさま！</h2>
      ${skipped
        ? '<p style="font-size:17px;">スキップでもOK。実戦で覚えていこ〜</p>'
        : `<p style="font-size:17px;">${state.lectureTotal}問中 <b>${state.lectureCorrect}問正解</b>（${scorePct}%）！</p>`
      }
      <p style="font-size:15px;line-height:1.7;">これで基本はバッチリ。<br>次は<b>Stage 2「ポルカ戦」</b>で実戦練習だよ。</p>
      <div class="tutorial-actions">
        <button class="next-btn" type="button">▶ ロビーへ</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.next-btn').addEventListener('click', () => {
    overlay.remove();
    // 講義クリア記録＋進捗クリア
    if (!save.firstClearRewardClaimed.includes('rico_tutorial')) {
      save.coins += 300;
      save.firstClearRewardClaimed.push('rico_tutorial');
    }
    if (!save.clearedStages.includes('rico_tutorial')) save.clearedStages.push('rico_tutorial');
    save.lectureProgress = null;  // 完了したので進捗削除
    saveProgress();
    state = defaultState();
    state.screen = 'stageSelect';
    render();
    toast(`✨ 講義完了！${skipped ? '' : '+300コイン'}`);
  });
}

function endTutorial() {
  showTutorial('ending',
    '<b>チュートリアル完了！</b><br>' +
    '心理バトルの基本、つかめたかな？<br>' +
    '・<b>ぱにゅゲージ</b>：心理バトル成功で増える。ぱにゅぱにゅで相手の動きが読みやすくなる<br>' +
    '・<b>ゾゾゾゲージ</b>：相手の動揺レベル。MAXで「ブラフブレイク」<br>' +
    '・<b>選択肢シャッフル</b>：心理バトルは毎回順番が変わるから、暗記は通じない<br>' +
    '次は<b>Stage 2「ポルカ」</b>で本番だよ。チップが尽きるまで勝負！',
    () => {
      // リザルト画面風に表示（簡易：ステージ選択へ戻す）
      state.screen = 'stageSelect';
      state.coinsEarned = (state.coinsEarned || 0) + 200;
      render();
      toast('チュートリアル報酬：200コイン獲得！');
    }
  );
}

//=============================================================
// 17b. チュートリアル吹き出し
//=============================================================
const TUTORIAL_STEPS = ['intro', 'intro2', 'preflop', 'flop_shown', 'after_psych', 'ending'];
function showTutorial(step, htmlContent, onNext) {
  state.tutorialStep = step;
  document.querySelectorAll('.tutorial-overlay').forEach(e => e.remove());
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  const bubble = document.createElement('div');
  bubble.className = 'tutorial-bubble';
  const stepIdx = TUTORIAL_STEPS.indexOf(step);
  const stepLabel = stepIdx >= 0 ? `Step ${stepIdx + 1} / ${TUTORIAL_STEPS.length}` : '';
  bubble.innerHTML =
    (stepLabel ? `<div class="tutorial-step">${stepLabel}</div>` : '') +
    htmlContent +
    '<div class="tutorial-actions">' +
      '<button class="next-btn" type="button">次へ ▶</button>' +
      '<button class="skip-btn" type="button">スキップ</button>' +
    '</div>';
  overlay.appendChild(bubble);
  document.body.appendChild(overlay);
  const skipBtn = bubble.querySelector('.skip-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (!confirm('チュートリアル解説をスキップして自分でプレイしますか？\n（ゲーム自体は継続）')) return;
      overlay.remove();
      state.tutorialMode = false;  // 以降の自動チュートリアル無効
    });
  }
  bubble.querySelector('.next-btn').addEventListener('click', () => {
    overlay.remove();
    if (onNext) onNext();
  });
}

let activeCutInDismiss = null;
function showRicoCutIn(text, isSuccess, onClose) {
  // 既存があれば即dismiss
  if (activeCutInDismiss) activeCutInDismiss();
  const cut = document.createElement('div');
  cut.className = 'rico-cutin ' + (isSuccess ? 'cutin-success' : 'cutin-fail');
  cut.innerHTML = `
    <div class="cutin-portrait">
      <img src="assets/characters/rico_default.png" alt="リコ先輩" onerror="window.assetFallback(this,'rico')">
    </div>
    <div class="cutin-text">
      <div class="cutin-name">リコ先輩</div>
      <div class="cutin-line">「${text}」</div>
    </div>
  `;
  document.body.appendChild(cut);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    activeCutInDismiss = null;
    cut.classList.add('cutin-out');
    setTimeout(() => {
      cut.remove();
      if (onClose) onClose();
    }, 500);
  };
  cut.addEventListener('click', dismiss);
  activeCutInDismiss = dismiss;
}
function dismissCutIn() {
  if (activeCutInDismiss) activeCutInDismiss();
}

function showOpponentCutIn(text, betSize) {
  if (activeCutInDismiss) activeCutInDismiss();
  const imgKey = state.opponentImgKey || 'polka';
  const oppName = state.opponentName || '相手';
  // ベットサイズで強度クラス
  const intensity = betSize === 'allin' ? 'cutin-allin' :
                    betSize === 'pot_1' ? 'cutin-pot' :
                    betSize === 'pot_2_3' ? 'cutin-strong' : '';
  const cut = document.createElement('div');
  cut.className = `rico-cutin opponent-cutin ${intensity}`;
  cut.innerHTML = `
    <div class="cutin-flash"></div>
    <div class="cutin-portrait">
      <img src="assets/characters/${imgKey}_default.png" alt="${oppName}" onerror="window.assetFallback(this,'${imgKey}')">
    </div>
    <div class="cutin-text">
      <div class="cutin-name">${oppName}</div>
      <div class="cutin-line">「${text}」</div>
    </div>
  `;
  document.body.appendChild(cut);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    activeCutInDismiss = null;
    cut.classList.add('cutin-out');
    setTimeout(() => cut.remove(), 500);
  };
  cut.addEventListener('click', dismiss);
  activeCutInDismiss = dismiss;
}

// ベット時の画面振動演出
function triggerBetShake(betSize) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.classList.remove('shake-strong', 'shake-pot', 'shake-allin');
  void stage.offsetWidth;  // re-flow to restart animation
  const cls = betSize === 'allin' ? 'shake-allin' :
              betSize === 'pot_1' ? 'shake-pot' : 'shake-strong';
  stage.classList.add(cls);
  setTimeout(() => stage.classList.remove(cls), 700);
}

function showMimiCutIn(text, narration) {
  if (activeCutInDismiss) activeCutInDismiss();
  const cut = document.createElement('div');
  cut.className = 'rico-cutin mimi-cutin';
  cut.innerHTML = `
    <div class="cutin-portrait">
      <img src="assets/characters/mimi_blush.png" alt="ミミ" onerror="this.src='assets/characters/mimi_default.png';window.assetFallback(this,'mimi')">
    </div>
    <div class="cutin-text">
      <div class="cutin-name">ミミ</div>
      <div class="cutin-line">「${text}」</div>
      ${narration ? `<div class="cutin-narration">${narration}</div>` : ''}
    </div>
  `;
  document.body.appendChild(cut);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    activeCutInDismiss = null;
    cut.classList.add('cutin-out');
    setTimeout(() => cut.remove(), 500);
  };
  cut.addEventListener('click', dismiss);
  activeCutInDismiss = dismiss;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

//=============================================================
// 19. 固定アスペクト比スケーリング
//=============================================================
function fitStage() {
  const sx = window.innerWidth / 1280;
  const sy = window.innerHeight / 800;
  const scale = Math.min(sx, sy);
  document.documentElement.style.setProperty('--game-scale', scale);
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', () => setTimeout(fitStage, 100));
fitStage();

//=============================================================
// 19b. スマホ向け：全画面ボタンと向き検知
//=============================================================
const UA = navigator.userAgent;
const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_IPHONE = /iPhone|iPod/.test(UA);
const IS_ANDROID = /Android/i.test(UA);
const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(UA)
      || (window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
}
function fullscreenSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function requestGameFullscreen() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  console.log('[FS] support:', !!fn, 'isFS:', isFullscreen(), 'UA:', UA.slice(0,60));
  if (!fn) {
    showIosFullscreenHelp();
    return false;
  }
  try {
    const p = fn.call(el);
    if (p && p.then) await p;
    console.log('[FS] after request:', isFullscreen());
  } catch (e) {
    console.warn('[FS] Fullscreen request failed', e);
    return false;
  }
  if (screen.orientation && screen.orientation.lock) {
    try {
      await screen.orientation.lock('landscape');
      console.log('[FS] orientation locked');
    } catch (e) {
      console.warn('[FS] orientation lock failed', e);
    }
  }
  return isFullscreen();
}

function dismissFullscreenBtn() {
  const btn = document.getElementById('fullscreen-btn');
  if (btn) btn.hidden = true;
}

function showIosFullscreenHelp() {
  // 既存があれば再表示しない
  if (document.querySelector('.ios-help-modal')) return;
  const modal = document.createElement('div');
  modal.className = 'ios-help-modal';
  modal.innerHTML = `
    <div class="ios-help-inner">
      <h3>📱 iPhone でフル画面にするには</h3>
      <p>iPhone Safari は Web ページの全画面表示をサポートしていません。<br>
      以下の方法で広い画面で遊べます：</p>
      <ol class="ios-help-steps">
        <li><b>下にスクロール</b>するとアドレスバーが小さくなります</li>
        <li>または Safariの <b>共有ボタン</b> → <b>「ホーム画面に追加」</b> でアプリ風に起動できます<br>
            <small>※ホームから起動するとアドレスバーが完全に消えます</small></li>
      </ol>
      <button type="button" class="ios-help-close">わかりました</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.ios-help-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function updateFullscreenBtn() {
  const group = document.getElementById('fullscreen-btn-group');
  const btn = document.getElementById('fullscreen-btn');
  if (!group || !btn) return;
  // 一度dismissされたら再表示しない（セッション中）
  if (sessionStorage.getItem('fs-dismissed') === '1') { group.hidden = true; return; }
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const shouldShow = isMobile() && isLandscape && !isFullscreen() && !IS_STANDALONE;
  group.hidden = !shouldShow;
  if (shouldShow) {
    if (IS_IPHONE && !fullscreenSupported()) {
      btn.textContent = '⛶ 全画面の遊び方';
    } else {
      btn.textContent = '⛶ タップして全画面で遊ぶ';
    }
  }
}

const fsBtn = document.getElementById('fullscreen-btn');
const fsGroup = document.getElementById('fullscreen-btn-group');
const fsDismiss = document.getElementById('fullscreen-dismiss-btn');
if (fsBtn) {
  fsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fsGroup) fsGroup.hidden = true;
    const ok = await requestGameFullscreen();
    if (!ok) {
      // 失敗時は1秒後に再表示（再試行できるよう）
      if (fullscreenSupported() && fsGroup) {
        setTimeout(() => { fsGroup.hidden = false; }, 1000);
      }
    } else {
      setTimeout(updateFullscreenBtn, 500);
    }
  });
}
if (fsDismiss) {
  fsDismiss.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem('fs-dismissed', '1');
    if (fsGroup) fsGroup.hidden = true;
  });
}
window.addEventListener('orientationchange', () => setTimeout(updateFullscreenBtn, 200));
window.addEventListener('resize', updateFullscreenBtn);
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
setTimeout(updateFullscreenBtn, 200);

//=============================================================
// 20. 起動：プリロード→render
//=============================================================
const PRELOAD_ASSETS = [
  // キャラ立ち絵（全身）
  'assets/characters/rico_default.png',
  'assets/characters/polka_default.png',
  'assets/characters/selina_default.png',
  'assets/characters/grano_default.png',
  'assets/characters/velvet_default.png',
  'assets/characters/mimi_default.png',
  // UI
  'assets/ui/title.png',
  'assets/ui/pot.png',
  'assets/ui/chip_white.png',
  'assets/ui/chip_red.png',
  'assets/ui/chip_blue.png',
  'assets/ui/chip_gold.png',
  // エピソード一枚絵
  'assets/episodes/rico_tutorial.png',
  'assets/episodes/polka.png',
  'assets/episodes/selina.png',
  'assets/episodes/grano.png',
  'assets/episodes/velvet.png',
  'assets/episodes/ending.png',
];
const PRELOAD_AUDIO = [
  'assets/bgm/ending.m4a',
];

function preloadOne(url) {
  return new Promise((resolve) => {
    if (/\.(png|jpe?g|webp|gif)$/i.test(url)) {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = url;
    } else if (/\.(mp3|m4a|ogg|wav)$/i.test(url)) {
      const a = new Audio();
      a.preload = 'auto';
      const done = () => resolve();
      a.oncanplaythrough = done;
      a.onloadeddata = done;
      a.onerror = done;
      a.src = url;
      // 一定時間で諦める（ネット遅延対策）
      setTimeout(done, 6000);
    } else {
      resolve();
    }
  });
}

const PRELOAD_TIPS = [
  '🐰 ぱにゅぱにゅ……',
  '🃏 場札を読み、顔色を読む',
  '💰 ナッツは大胆に',
  '🎭 言葉は嘘つくが、ベットは嘘つかない',
  '✨ 圧倒モードまで連勝積もれ',
  '🕯 ヴェルベットの瞳……何か映している',
];

async function startPreload() {
  const overlay = document.getElementById('preload-overlay');
  const fill = document.getElementById('preload-fill');
  const loadedEl = document.getElementById('preload-loaded');
  const totalEl = document.getElementById('preload-total');
  const tipEl = document.getElementById('preload-tip');
  const all = [...PRELOAD_ASSETS, ...PRELOAD_AUDIO];
  totalEl.textContent = all.length;
  let loaded = 0;
  // tip rotation
  let tipIdx = 0;
  const tipInterval = setInterval(() => {
    tipIdx = (tipIdx + 1) % PRELOAD_TIPS.length;
    if (tipEl) tipEl.textContent = PRELOAD_TIPS[tipIdx];
  }, 1500);
  // 並列で読み込み、各完了で進捗更新
  await Promise.all(all.map(url => preloadOne(url).then(() => {
    loaded++;
    loadedEl.textContent = loaded;
    fill.style.width = (loaded / all.length * 100) + '%';
  })));
  clearInterval(tipInterval);
  // フェードアウト
  if (overlay) {
    overlay.classList.add('out');
    setTimeout(() => { if (overlay) overlay.remove(); }, 600);
  }
}

save = loadProgress();
state = defaultState();
startPreload().then(() => {
  render();
  initGlobalAudioBar();
});
