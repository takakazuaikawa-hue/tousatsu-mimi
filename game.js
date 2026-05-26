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
    maxHands: 1, // チュートリアルは1ハンドのまま
    chips: 800,
    tutorial: true,
    imgKey: 'rico',
    theme: 'ポーカー＆ぱにゅぱにゅ入門',
    desc: '頼れる先輩リコの優しい練習試合。操作と心理バトルの基本を教えてくれる',
    rewardFirst: 200, rewardRematch: 50, rewardSBonus: 0,
    unlockNoteOnClear: null,
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
  // ドロー
  if (ctx.boardDanger && ctx.boardDanger.flushAlert && r < profile.drawAggression) {
    return { type: 'bet', size: 'pot_1_2', intent: 'draw' };
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
    return pick(['いっくよー！ふふ、ガツンといくね♪', 'いっくよー、ミミ。よく見な', 'ふふ、これは練習だからね']);
  }
  if (action.type === 'fold') return 'いいよ、今回は譲ってあげる〜';
  if (action.type === 'check_call') return pick(['コールでOK', 'まだ様子見ね', '焦らなくていいよ']);
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
      rico: 'そう、それが正解！相手の言葉と強さが噛み合わない時は、降ろし狙いを疑うのが基本だよ。',
    },
    onFail: {
      panyu: 0,
      mimi: 'うう、まだ自信がなくて……',
      rico: 'いいよいいよ、外しても大丈夫。何度でも挑戦できるから、なんで外したか考えてみな。',
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
      rico: 'いいね、ボードを見れるようになってきた。<u>同スート2枚＝完成じゃなく「狙ってる」サイン</u>。',
    },
    onFail: {
      panyu: -10,
      mimi: 'ボードに惑わされちゃった……',
      rico: '同スート2枚＝完成、ではない。<u>3枚以上ないとフラッシュ確定じゃない</u>よ。',
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
      rico: 'そう、ベットサイズには「意図」がある。<u>大きい＝ドローに代金を払わせたい時もある</u>。',
    },
    onFail: {
      panyu: -10,
      mimi: '大きいベットってだけで怖がりすぎた……',
      rico: 'ベットサイズ＝役の強さ、じゃないよ。ボードと合わせて読むんだ。',
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
      rico: 'それがポットオッズの基本。<u>払う額が小さいなら、当たる確率が低くてもコール価値はある</u>。',
    },
    onFail: {
      panyu: -10,
      mimi: '見送っちゃった……でもこれが正解の時もあるよね？',
      rico: '臆病すぎる時もあるよ。<u>払う額/(ポット+払う額) で必要勝率を見積もる</u>のが基本。',
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
      rico: 'いいフォールド！<u>降りる勇気もポーカーの実力</u>。割に合わない勝負は避ける。',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう、勝負した方がよかった……？',
      rico: 'ドローの完成率と支払額のバランスを見よう。当たる確率より高い支払額は損になる。',
    },
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
      rico: 'そう。それ、<u>カードじゃなくて心を降ろしに来てる</u>やつ。気持ちで負けたら本当に負けるよ',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう……カードを見る前から負けるとか、理不尽すぎません！？',
      rico: '圧に飲まれちゃダメ。<u>大切なのはボードとレンジ</u>、相手の言葉じゃない',
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
      rico: 'いいね。<u>言葉と行動のズレを読む</u>のがブラフ看破の第一歩',
    },
    onFail: {
      panyu: -10,
      mimi: '安全って言われたから安心しちゃった……',
      rico: '相手の<u>口先より、ベットサイズと場札を信じる</u>こと',
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
      rico: 'そう。強い言葉ほど、弱さを隠してる時がある。',
    },
    onFail: {
      panyu: -10,
      mimi: 'うう……今のはブラフだったかも……！',
      rico: '外してもOK。なんで外したか覚えれば次は読める。',
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
    ricoAdvice: '「いい？相手の言葉を、まず聞いてみな」',
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
    case 'stageSelect': renderTemplate('tpl-stage-select'); applyBindings(); break;
    case 'battle':      renderTemplate('tpl-battle'); applyBindings(); break;
    case 'result':      renderTemplate('tpl-result'); applyBindings(); break;
    case 'shop':        renderTemplate('tpl-shop'); applyBindings(); bindShop(); break;
    case 'ending':      renderTemplate('tpl-ending'); break;
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
      case 'pot': el.textContent = state.pot; break;
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
      case 'ricoAdvice': el.textContent = state.ricoAdvice; break;
      case 'opponentSpeech': el.textContent = state.opponentSpeech; break;
      case 'opponentBet': el.innerHTML = renderOpponentBet(); break;
      case 'currentHandName': el.innerHTML = renderCurrentHandName(); break;
      case 'opponentBetLabel': el.textContent = state.opponentName || '相手'; break;
      case 'opponentBetAmount': {
        el.textContent = state.currentBetOpponent > 0 ? `+${state.currentBetOpponent}` : '—';
        const side = el.closest('.bet-side');
        if (side) side.classList.toggle('empty', state.currentBetOpponent === 0);
        break;
      }
      case 'playerBetAmount': {
        el.textContent = state.currentBetPlayer > 0 ? `+${state.currentBetPlayer}` : '—';
        const side = el.closest('.bet-side');
        if (side) side.classList.toggle('empty', state.currentBetPlayer === 0);
        break;
      }
      case 'communityCards': renderCardsInto(el, state.community, 5); break;
      case 'playerHand': renderCardsInto(el, state.playerHand, 2); break;
      case 'psychLog': renderPsychLog(el); break;
      case 'actionArea': renderActionArea(el); break;
      case 'coins': el.textContent = state.coinsEarned || 0; break;
      case 'saveCoins': el.textContent = save.coins; break;
      case 'stageList': el.innerHTML = renderStageList(); break;
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
    if (!unlocked) {
      return `<div class="stage-card locked">
        <div class="stage-number">Stage ${stageNum}</div>
        <div class="stage-name">${opp.name}</div>
        <div class="stage-theme">${opp.theme}</div>
        <div class="stage-locked-tag">🔒 前のステージをクリアで解放</div>
      </div>`;
    }
    return `<div class="stage-card ${recommend ? 'recommended' : ''} ${cleared ? 'cleared' : ''} ${opp.isBoss ? 'boss-stage' : ''}">
      ${opp.isBoss ? '<div class="stage-tag boss-tag">BOSS</div>' : ''}
      ${recommend ? '<div class="stage-tag">おすすめ</div>' : ''}
      ${cleared ? `<div class="stage-tag clear-tag">クリア済 ${bestRank || ''}</div>` : ''}
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
        ${cleared && EPISODES[sid] ? `<button class="btn btn-ghost stage-recall" data-action="recall-episode" data-episode="${sid}" title="エピソードタイトル回想">📜</button>` : ''}
      </div>
    </div>`;
  }).join('');
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
];

const RICO_SHOP_COMMENTS = {
  panyu_sense_lv2:     '迷いやすいなら、まずこれ。ハズレが減るから正解に集中しやすくなるよ',
  panyu_range_lv2:     '相手レンジが見えると、次のベットが読みやすくなる。中級者への第一歩だね',
  panyu_gauge_plus_20: 'センスを連打したいなら上限拡張。長期戦向けかな',
  note_board_danger:   'フラッシュ・ストレート要注意のサインが出る。セリナ戦の前にあるとめっちゃ楽',
  note_pot_odds:       '「払う額が安いから見る」「高いから降りる」が分かるようになる。グラーノ戦で必須級',
  note_bet_size:       'ベットボタンの説明が詳しくなる。基本に立ち返りたい時にどうぞ',
  skin_red_gold_card:  '見た目がぐっと豪華になる。テンション上げたい時に',
  table_vip:           'テーブルが渋くなる。気分転換にね',
};

function renderShopItems(cat) {
  return SHOP_ITEMS.filter(i => i.cat === cat).map(i => {
    const owned = save.ownedItems.includes(i.id);
    const canBuy = !owned && save.coins >= i.price;
    return `<div class="shop-item ${owned ? 'owned' : ''}" data-item="${i.id}">
      <div class="shop-item-name">${i.name}</div>
      <div class="shop-item-desc">${i.desc}</div>
      <div class="shop-item-footer">
        <span class="shop-item-price">${i.price}コイン</span>
        ${owned
          ? '<span class="shop-item-owned">✓ 購入済み</span>'
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
  const comment = RICO_SHOP_COMMENTS[id];
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

function pickPsychQuestion() {
  // 対戦相手に応じて問題プールを切り替える
  const id = state.opponentId;
  if (id === 'rico_tutorial') return 'rico_tutorial_flop';
  if (id === 'polka') return 'polka_flop_bluff';
  if (id === 'selina') {
    // 場札に「同スート2枚以上＝フラッシュ警報」が本当にある時だけ flush_alert を出す
    const suits = state.community.map(c => c.suit);
    const counts = {};
    suits.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const maxSuit = Math.max(...Object.values(counts), 0);
    if (maxSuit >= 2) return 'selina_flush_alert';
    // 連番ドロー・ベットサイズ寄り
    return 'selina_bet_size';
  }
  if (id === 'grano') {
    const potBefore = state.pot - state.currentBetOpponent;
    const ratio = potBefore > 0 ? state.currentBetOpponent / potBefore : 1;
    return ratio < 0.5 ? 'grano_cheap_call' : 'grano_expensive';
  }
  if (id === 'velvet') {
    // フェーズ毎に異なる問題を出す
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
    case 'back-title':    state = defaultState(); render(); break;
    case 'back-stage':    goStageSelect(); break;
    case 'open-shop':     state.screen = 'shop'; render(); break;
    case 'reset-save':    resetProgress(); break;
    case 'buy-item':      buyItem(data.itemId); break;
    case 'battle-start':  startBattle(data.opponent); break;
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
  }
}

//=============================================================
// 9. 画面遷移
//=============================================================
function goStageSelect() {
  state.screen = 'stageSelect';
  render();
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
  state = defaultState();
  const opp = OPPONENTS[opponentId] || OPPONENTS.polka;
  state.opponentId = opp.id;
  state.opponentName = opp.name;
  state.opponentProfile = opp.profile;
  state.opponentImgKey = opp.imgKey;
  state.maxHands = opp.maxHands;
  state.playerChips = opp.chips;
  state.opponentChips = opp.chips;
  state.tutorialMode = opp.tutorial;
  state.fullHand = !!opp.fullHand;
  state.isBoss = !!opp.isBoss;
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
    state.ricoAdvice = '「ヴェルベットは口で揺さぶってくる。冷静を保てば隙が見える」';
    render();
    // 開幕心理バトルを即時発動
    setTimeout(() => triggerPsychBattle('velvet_opening'), 800);
    return;
  }

  if (state.tutorialMode) {
    state.mimiThought = '「リコ先輩との練習試合……お願いします！」';
    state.ricoAdvice = '「これから1ハンドだけ、基本を教えるよ。気楽にね」';
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
    state.ricoAdvice = '「ポルカは弱い手ほど騒ぐタイプ。声と仕草を見な」';
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
  state.psychPending = false;
  state.handPhase = 'preflop';
  state.isPlayerTurn = true;
  state.opponentSpeech = opponentReadyLine();
  state.mimiThought = mimiThoughtPreflop(state.playerHand);
  state.ricoAdvice = `「Hand ${state.handNo}：参加チップ50ずつ。まずは手札を見てから」`;
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
  const ctx = { handStrength: hs, toCall: need, boardDanger };

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
  state.opponentSpeech = polkaSpeech(action);
  log('bets', { actor: 'opponent', type: 'bet', size: action.size, amount, intent: action.intent });
  log('reactions', { intent: action.intent, speech: state.opponentSpeech });

  const bigEnough = (action.size === 'pot_2_3' || action.size === 'pot_1' || action.size === 'allin');
  const isBluffBet = (action.intent === 'bluff' || action.intent === 'forced_bluff' || action.intent === 'tutorial_bluff');
  const isPostFlop = (state.handPhase === 'flop' || state.handPhase === 'turn' || state.handPhase === 'river');
  const triggerFirstHand = (state.handNo === 1 && state.handPhase === 'flop' && bigEnough);
  // フルハンド：どのストリートでもブラフ意図の大ベットで50%発動
  const triggerBluff = (isPostFlop && bigEnough && isBluffBet && rand() < 0.5);
  // ヴェルベット（ボス戦）：各ストリートで確定発動
  const triggerBoss = state.isBoss && isPostFlop && bigEnough;
  if (!state.psychResolved && (triggerFirstHand || triggerBluff || triggerBoss)) {
    render();
    const qid = pickPsychQuestion();
    setTimeout(() => triggerPsychBattle(qid), 900);
    return;
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
    state.ricoAdvice = '「場が出た。相手の出方をよく見な」';
    state.isPlayerTurn = false;  // 相手から
    log('actions', { phase: 'flop', cards: state.community.map(c=>c.label+c.suit) });
    render();
    if (state.tutorialMode) {
      showTutorial('flop_shown',
        'フロップは<b>A♥ 5♦ 9♣</b>！<br>' +
        'ミミの手札A♠ K♠と合わせると、<b>「Aのペア」</b>が完成。かなり強い手だよ。<br>' +
        'ここで私（リコ先輩）が大きくベットしてくる。よく考えてみよう。',
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
      state.ricoAdvice = '「ターンで場が変わったかもしれない。相手のベットを見て」';
      state.isPlayerTurn = false;
      state.psychResolved = false;  // 各ストリートで心理バトル再発生可能に
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
      state.ricoAdvice = '「これで全部の場札が見えた。最終判断だよ」';
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
    state.ricoAdvice = '「これで全ての場札が出揃った。最終判断の時間」';
    state.isPlayerTurn = false;
    state.psychResolved = false;
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
  const q = PSYCH_QUESTIONS[qid];
  // v4 A1: 選択肢シャッフル
  const shuffled = shuffle(q.choices);
  const labels = ['A','B','C','D','E'];

  // モーダル描画
  const tpl = document.getElementById('tpl-psych-modal');
  const modal = tpl.content.cloneNode(true);
  app.appendChild(modal);

  const root = app.lastElementChild;
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
  root.querySelector('[data-bind="psychSituation"]').textContent = q.situationFn(state);
  root.querySelector('[data-bind="psychSpeech"]').textContent = `ポルカ：「${q.speech}」`;
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
  state.panyu -= cost;
  if (isFree) state.panyuSenseFreeUsed = true;

  const senseBtn = state.psychRoot.querySelector('[data-bind="panyuSenseBtn"]');
  senseBtn.disabled = true;
  senseBtn.textContent = '✓ ぱにゅぱにゅ使用';

  // ミミカットイン：ぱにゅ……ぱにゅ……（場がなごんだ）
  showMimiCutIn('ぱにゅ……ぱにゅ……', '・・・・・場がなごんだ');

  // ゾゾゾヒントを強調
  const hint = state.psychRoot.querySelector('.zazazo-hint');
  hint.style.background = 'rgba(245,215,122,0.3)';
  hint.style.fontWeight = '700';
  hint.textContent += '  ←【強調】相手の動きをよく見て！';

  // Lv2効果：ハズレ選択肢を1つグレーアウト
  if (save.panyuSkills.senseLevel >= 2 && qid && PSYCH_QUESTIONS[qid]) {
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

  // 結果表示：選択ボタンの下にバナーを表示
  const choicesEl = state.psychRoot.querySelector('[data-bind="psychChoices"]');
  const banner = document.createElement('div');
  banner.className = 'psych-result-banner ' + (choice.correct ? 'success' : 'fail');
  banner.textContent = choice.correct ? '✓ 正解！' : '✗ 不正解……';
  choicesEl.appendChild(banner);

  state.psychResolved = true;
  state.psychPending = false;

  setTimeout(() => {
    if (state.psychRoot) {
      state.psychRoot.remove();
      state.psychRoot = null;
    }
    state.isPlayerTurn = true;
    render();
    // リコ先輩カットイン（クリックで閉じる）
    const onCutInClose = state.tutorialMode
      ? () => showTutorial('after_psych',
          '心理バトル解決！ぱにゅゲージが回復したね。<br>' +
          'あとはAペアの強さを信じて、<b>「コール」</b>か<b>「1/2ポット」</b>でベットしてみよう。<br>' +
          '私はもう手を引くから、安心していいよ。')
      : null;
    showRicoCutIn(state.ricoAdvice.replace(/^「|」$/g, ''), choice.correct, onCutInClose);
  }, 1100);
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
  if (isDominanceMode() && !state.tutorialMode && !state.fullHand) {
    return startDominanceMode();
  }
  state.mimiThought = '「次のハンドだ。集中していこう」';
  render();
}

// 圧倒モード判定：プレイヤーチップが初期の1.7倍以上 かつ 相手が初期の半分以下
function isDominanceMode() {
  const initial = OPPONENTS[state.opponentId]?.chips || 1000;
  return state.playerChips >= initial * 1.7 && state.opponentChips <= initial * 0.5;
}

// 圧倒モード：相手チップを削り切るまで連続自動勝利演出
function startDominanceMode() {
  state.dominanceMode = true;
  showDominanceOverlay(() => {
    dominanceLoop();
  });
}

function showDominanceOverlay(onContinue) {
  const overlay = document.createElement('div');
  overlay.className = 'dominance-overlay';
  overlay.innerHTML = `
    <div class="dominance-banner">
      <div class="dominance-text">⚡ 圧倒モード ⚡</div>
      <div class="dominance-sub">— ミミの読みが完全に通った！残りハンド自動勝利 —</div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('out'), 2200);
  setTimeout(() => { overlay.remove(); onContinue(); }, 2800);
}

function dominanceLoop() {
  // 自動的に相手チップを削っていく演出
  if (state.opponentChips <= 0) return endBattle();
  state.handNo++;
  const drain = Math.min(state.opponentChips, Math.floor(state.opponentChips * 0.4) + 100);
  state.opponentChips -= drain;
  state.playerChips += drain;
  state.handResults.push({
    hand: state.handNo,
    winner: 'player',
    reason: 'dominance',
    pot: drain,
    by: '圧倒',
  });
  // 高速 連打演出
  const burst = document.createElement('div');
  burst.className = 'dominance-burst';
  burst.innerHTML = `
    <div class="dominance-burst-text">+${drain}</div>
    <div class="dominance-burst-sub">圧倒！</div>
  `;
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 900);
  render();
  if (state.opponentChips > 0) {
    setTimeout(dominanceLoop, 950);
  } else {
    setTimeout(endBattle, 1200);
  }
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
        <button class="btn btn-secondary" data-action="back-stage">ステージ選択へ</button>
      `;
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
function endTutorial() {
  showTutorial('ending',
    '<b>チュートリアル完了！</b><br>' +
    '心理バトルの基本、つかめたかな？<br>' +
    '・<b>ぱにゅゲージ</b>：心理バトル成功で増える。ぱにゅぱにゅで相手の動きが読みやすくなる<br>' +
    '・<b>ゾゾゾゲージ</b>：相手の動揺レベル。MAXで「ブラフブレイク」<br>' +
    '・<b>選択肢シャッフル</b>：心理バトルは毎回順番が変わるから、暗記は通じない<br>' +
    '次は<b>Stage 2「ポルカ」</b>で本番だよ。3ハンド勝負！',
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
function showTutorial(step, htmlContent, onNext) {
  state.tutorialStep = step;
  // 既存があれば消す
  document.querySelectorAll('.tutorial-overlay').forEach(e => e.remove());
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  const bubble = document.createElement('div');
  bubble.className = 'tutorial-bubble';
  bubble.innerHTML = htmlContent +
    '<button class="next-btn" type="button">次へ ▶</button>';
  overlay.appendChild(bubble);
  document.body.appendChild(overlay);
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
  if (!fn) {
    // iPhone Safari など Fullscreen API 非対応 → PWAインストール案内
    showIosFullscreenHelp();
    return false;
  }
  try {
    const p = fn.call(el);
    if (p && p.then) await p;
  } catch (e) {
    console.warn('Fullscreen request failed', e);
    return false;
  }
  if (screen.orientation && screen.orientation.lock) {
    try { await screen.orientation.lock('landscape'); } catch (e) { /* 対応外端末 */ }
  }
  return true;
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
  const btn = document.getElementById('fullscreen-btn');
  if (!btn) return;
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const shouldShow = isMobile() && isLandscape && !isFullscreen() && !IS_STANDALONE;
  btn.hidden = !shouldShow;
  // iPhone Safari 用にラベル変更
  if (shouldShow) {
    if (IS_IPHONE && !fullscreenSupported()) {
      btn.textContent = '⛶ 全画面の遊び方';
    } else {
      btn.textContent = '⛶ タップして全画面で遊ぶ';
    }
  }
}

const fsBtn = document.getElementById('fullscreen-btn');
if (fsBtn) {
  fsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const ok = await requestGameFullscreen();
    if (ok) {
      setTimeout(updateFullscreenBtn, 300);
    }
    // 失敗時は showIosFullscreenHelp() が requestGameFullscreen 内で呼ばれる
  });
}
window.addEventListener('orientationchange', () => setTimeout(updateFullscreenBtn, 200));
window.addEventListener('resize', updateFullscreenBtn);
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
setTimeout(updateFullscreenBtn, 200);

//=============================================================
// 20. 起動
//=============================================================
save = loadProgress();
state = defaultState();
render();
