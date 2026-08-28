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

// === アチーブメント／称号 ===
// 達成条件は handResult や session 単位で評価
const ACHIEVEMENTS = [
  // 初心者
  { id: 'first_win', icon: '🌱', name: '初勝利', desc: '初めてハンドに勝利', cat: '初心者' },
  { id: 'first_clear', icon: '🎓', name: '卒業生', desc: '初めてキャラを撃破', cat: '初心者' },
  // 役系
  { id: 'win_two_pair', icon: '✌', name: 'ツーペア勝利', desc: 'ツーペアで勝利', cat: '役' },
  { id: 'win_set',     icon: '🃏', name: 'スリーカード勝利', desc: 'スリーカードで勝利', cat: '役' },
  { id: 'win_straight',icon: '🪜', name: 'ストレート勝利', desc: 'ストレートで勝利', cat: '役' },
  { id: 'win_flush',   icon: '🌊', name: 'フラッシュ勝利', desc: 'フラッシュで勝利', cat: '役' },
  { id: 'win_fh',      icon: '🏛', name: 'フルハウス勝利', desc: 'フルハウスで勝利', cat: '役' },
  { id: 'win_quads',   icon: '💎', name: 'フォーカード勝利', desc: 'フォーカードで勝利', cat: '役' },
  { id: 'win_sf',      icon: '⚡', name: 'ストフラ勝利', desc: 'ストレートフラッシュで勝利', cat: '役' },
  { id: 'win_royal',   icon: '👑', name: '神の手', desc: 'ロイヤルストレートフラッシュで勝利', cat: '役' },
  { id: 'win_wheel',   icon: '🛞', name: 'ホイール使い', desc: 'A-5ホイールで勝利', cat: '役' },
  // ドラマ
  { id: 'suckout',     icon: '✨', name: '神引き', desc: '勝率30%以下から逆転勝利（サックアウト）', cat: 'ドラマ' },
  { id: 'badbeat',     icon: '💀', name: '不運の犠牲者', desc: '勝率70%以上から逆転負け（バッドビート）', cat: 'ドラマ' },
  { id: 'cooler',      icon: '🔥', name: '激突！', desc: 'クーラー（両者ストレート以上）に勝利', cat: 'ドラマ' },
  { id: 'cooler_lose', icon: '🥶', name: '回避不能', desc: 'クーラーで敗北', cat: 'ドラマ' },
  { id: 'bluff_win',   icon: '🎭', name: 'ブラファー', desc: '勝率40%未満で相手をフォールドさせた', cat: 'ドラマ' },
  { id: 'rivered',     icon: '🌊', name: 'リバーマジック', desc: 'リバーで勝率が +30 以上上昇して勝利', cat: 'ドラマ' },
  // プレイスタイル
  { id: 'allin_win',   icon: '🚀', name: 'オールイン制覇', desc: 'オールインで勝利', cat: 'プレイ' },
  { id: 'good_fold',   icon: '🛡', name: '損切りの達人', desc: '勝率30%以下で正しくフォールド（10回）', cat: 'プレイ' },
  { id: 'fold_hero',   icon: '🦸', name: 'ヒーローコール', desc: 'マージナルコールで勝利（5回）', cat: 'プレイ' },
  // 連続記録
  { id: 'win_3streak', icon: '🔥', name: '3連勝', desc: '同一対戦で3連勝', cat: '記録' },
  { id: 'win_5streak', icon: '🔥🔥', name: '5連勝', desc: '同一対戦で5連勝', cat: '記録' },
  // 通算
  { id: 'hands_10',   icon: '🎯', name: '10ハンドプレイ', desc: '通算10ハンド', cat: '通算' },
  { id: 'hands_50',   icon: '🎯🎯', name: '50ハンドプレイ', desc: '通算50ハンド', cat: '通算' },
  { id: 'hands_100',  icon: '💯', name: '100ハンドプレイ', desc: '通算100ハンド', cat: '通算' },
  { id: 'wins_10',    icon: '🏆', name: '10勝', desc: '通算10勝', cat: '通算' },
  { id: 'wins_50',    icon: '🏆🏆', name: '50勝', desc: '通算50勝', cat: '通算' },
  // 心理・性格
  { id: 'read_first', icon: '👁', name: '初の読み切り', desc: 'ミミミMAXで相手の性格を読み切った', cat: '心理' },
  { id: 'read_all',   icon: '🧠', name: '心理マスター', desc: '全キャラの性格を読み切った', cat: '心理' },
  // 圧倒
  { id: 'dominate',   icon: '⚡', name: '圧倒勝利', desc: '相手チップを0にして勝利', cat: '圧倒' },
];

// セーブに achievements を確実に存在させる
function ensureAchievements() {
  if (!save.achievements) save.achievements = {};
  if (!save.achievementStats) save.achievementStats = {
    totalHands: 0, totalWins: 0, goodFoldCount: 0, heroCallCount: 0, currentStreak: 0,
  };
}

// アチーブメント解除
function unlockAchievement(id) {
  ensureAchievements();
  if (save.achievements[id]) return false; // 既に解除済み
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return false;
  save.achievements[id] = Date.now();
  saveProgress();
  showAchievementToast(ach);
  return true;
}

function showAchievementToast(ach) {
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `
    <div class="at-icon">${ach.icon}</div>
    <div class="at-body">
      <div class="at-label">🏆 称号獲得</div>
      <div class="at-name">${ach.name}</div>
      <div class="at-desc">${ach.desc}</div>
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(t);
  setTimeout(() => t.classList.add('show'), 30);
  setTimeout(() => t.classList.add('out'), 3500);
  setTimeout(() => t.remove(), 4200);
}

// ハンド終了時の達成判定
function checkHandAchievements(last, ctx) {
  ensureAchievements();
  save.achievementStats.totalHands = (save.achievementStats.totalHands || 0) + 1;
  if (last.winner === 'player') {
    save.achievementStats.totalWins = (save.achievementStats.totalWins || 0) + 1;
    save.achievementStats.currentStreak = (save.achievementStats.currentStreak || 0) + 1;
    unlockAchievement('first_win');
    // 役別
    if (last.pEv) {
      const r = last.pEv.rank;
      if (r === 2) unlockAchievement('win_two_pair');
      else if (r === 3) unlockAchievement('win_set');
      else if (r === 4) {
        unlockAchievement('win_straight');
        // ホイール判定
        if (last.pEv.bestFive) {
          const ranks = last.pEv.bestFive.map(c => c.rank).sort((a,b) => b-a);
          if (ranks[0] === 14 && ranks[1] === 5) unlockAchievement('win_wheel');
        }
      }
      else if (r === 5) unlockAchievement('win_flush');
      else if (r === 6) unlockAchievement('win_fh');
      else if (r === 7) unlockAchievement('win_quads');
      else if (r === 8) unlockAchievement('win_sf');
      else if (r === 9) unlockAchievement('win_royal');
    }
  } else if (last.winner === 'opponent') {
    save.achievementStats.currentStreak = 0;
  }

  // ドラマ系（エクイティ履歴から）
  const eq = ctx?.equityHistory || [];
  if (eq.length >= 2) {
    const peak = Math.max(...eq.map(e => e.pct));
    const trough = Math.min(...eq.map(e => e.pct));
    const lastEq = eq[eq.length - 1].pct;
    if (last.reason === 'showdown') {
      if (last.winner === 'player' && trough <= 30) unlockAchievement('suckout');
      if (last.winner === 'opponent' && peak >= 70) unlockAchievement('badbeat');
      if (last.pEv?.rank >= 4 && last.oEv?.rank >= 4) {
        if (last.winner === 'player') unlockAchievement('cooler');
        else if (last.winner === 'opponent') unlockAchievement('cooler_lose');
      }
      // リバーマジック：最後のストリート手前→最後で +30 以上＆勝利
      if (last.winner === 'player' && eq.length >= 2) {
        const prev = eq[eq.length - 2].pct;
        if (lastEq - prev >= 30) unlockAchievement('rivered');
      }
    }
    if (last.reason === 'opponentFold' && lastEq !== undefined && lastEq < 40) {
      unlockAchievement('bluff_win');
    }
    if (last.reason === 'fold' && lastEq !== undefined && lastEq <= 30) {
      save.achievementStats.goodFoldCount = (save.achievementStats.goodFoldCount || 0) + 1;
      if (save.achievementStats.goodFoldCount >= 10) unlockAchievement('good_fold');
    }
    // ヒーローコール：マージナル（30〜50%）で勝った
    if (last.reason === 'showdown' && last.winner === 'player' && lastEq >= 30 && lastEq <= 50) {
      save.achievementStats.heroCallCount = (save.achievementStats.heroCallCount || 0) + 1;
      if (save.achievementStats.heroCallCount >= 5) unlockAchievement('fold_hero');
    }
  }

  // オールイン勝利
  if (last.winner === 'player' && (ctx?.playerAllInThisHand)) {
    unlockAchievement('allin_win');
  }

  // 連続記録
  const cs = save.achievementStats.currentStreak || 0;
  if (cs >= 3) unlockAchievement('win_3streak');
  if (cs >= 5) unlockAchievement('win_5streak');

  // 通算
  const th = save.achievementStats.totalHands;
  if (th >= 10) unlockAchievement('hands_10');
  if (th >= 50) unlockAchievement('hands_50');
  if (th >= 100) unlockAchievement('hands_100');
  const tw = save.achievementStats.totalWins;
  if (tw >= 10) unlockAchievement('wins_10');
  if (tw >= 50) unlockAchievement('wins_50');
  saveProgress();
}

function defaultSave() {
  return {
    version: 1,
    // ── 基本進捗 ──
    coins: 0,
    clearedStages: [],
    introPlayed: false,           // P2: 体験ハンド（初回導線）を消化済みか
    bestRanks: {},
    bestScores: {},
    firstClearRewardClaimed: [],
    rematchWins: {},
    chipChoice: {},
    rewardCgSeen: [],             // 🆕幕間で開放したご褒美CGの相手ID一覧

    // ── 解放系フラグ（normalizeSaveで自動派生される。手動編集不要） ──
    endingUnlocked: false,        // = clearedStages.includes('velvet')
    backdoorUnlocked: false,      // ※デバッグ：エンディング後の隠し機能解放
    backdoorOn: false,            // ※デバッグ：覗き見モードの今表示中フラグ

    // ── 所持・装備 ──
    ownedItems: [],
    shopSeenItems: [],            // 🆕新着マーク管理
    unlockedNotes: ['bluff_basic'],
    equippedCardSkin: 'default',
    equippedTableSkin: 'default',
    equippedRicoOutfit: 'default',
    equippedChipSkin: 'default',
    equippedMimiSkin: 'default',
    equippedCutin: 'default',
    equippedBgmLobby: 'default',
    equippedBgmBattle: 'default',
    equippedSePack: 'default',

    // ── ぱにゅぱにゅ強化 ──
    extraInitialChips: 0,
    panyuComboMultiplier: 1,
    panyuChronoBonus: 1.0,
    panyuGaugeMax: 100,
    panyuSkills: { senseLevel: 1, rangeLevel: 1, breakLevel: 0 },
    panyuSenseFreeUsed: false,

    // ── 設定 ──
    psychEnabled: true,
    logicEnabled: true,
    bgmVolume: 35,       // BGM 音量（0-100）
    bgmOn: false,        // BGM 全体 ON/OFF（lobby/ending/minipoker BGM すべて従う）
    sfxVolume: 60,       // SFX 音量（0-100）
    sfxOn: true,         // SFX 全体 ON/OFF（minipoker SFX 等すべて従う）
    forceSound: false,   // 端末が消音でも音を出す（iOS消音スイッチより優先）。既定OFF＝端末を尊重

    // ── ミニポーカー（mpEnsureSaveで初期化される） ──
    minipoker: null,

    // ── デイリーログインボーナス ──
    loginBonus: { lastDate: '', streak: 0 },

    // ── ログ ──
    logs: { actions: [], bets: [], reactions: [], psych: [] },

    // ── 達成（ensureAchievementsで初期化） ──
    achievements: {},
  };
}

// セーブの整合性を保つ：派生フラグを正規化し、不足キーを補う
function normalizeSave(s) {
  if (!s) return defaultSave();
  // 派生フラグ：endingUnlocked は velvet 撃破で自動 true
  if (Array.isArray(s.clearedStages) && s.clearedStages.includes('velvet')) {
    s.endingUnlocked = true;
  }
  // 配列・オブジェクトが null/undefined にならないよう保証
  if (!Array.isArray(s.clearedStages)) s.clearedStages = [];
  if (!Array.isArray(s.ownedItems)) s.ownedItems = [];
  if (!Array.isArray(s.shopSeenItems)) s.shopSeenItems = [];
  if (!Array.isArray(s.firstClearRewardClaimed)) s.firstClearRewardClaimed = [];
  if (!Array.isArray(s.rewardCgSeen)) s.rewardCgSeen = [];
  if (!s.bestRanks || typeof s.bestRanks !== 'object') s.bestRanks = {};
  if (!s.bestScores || typeof s.bestScores !== 'object') s.bestScores = {};
  if (!s.chipChoice || typeof s.chipChoice !== 'object') s.chipChoice = {};
  if (!s.rematchWins || typeof s.rematchWins !== 'object') s.rematchWins = {};
  if (!s.panyuSkills || typeof s.panyuSkills !== 'object') s.panyuSkills = { senseLevel: 1, rangeLevel: 1, breakLevel: 0 };
  if (!s.logs || typeof s.logs !== 'object') s.logs = { actions: [], bets: [], reactions: [], psych: [] };
  if (!s.achievements || typeof s.achievements !== 'object') s.achievements = {};
  if (!s.loginBonus || typeof s.loginBonus !== 'object') s.loginBonus = { lastDate: '', streak: 0 };
  if (typeof s.loginBonus.lastDate !== 'string') s.loginBonus.lastDate = '';
  if (typeof s.loginBonus.streak !== 'number' || isNaN(s.loginBonus.streak) || s.loginBonus.streak < 0) s.loginBonus.streak = 0;
  // 数値の正常範囲
  if (typeof s.coins !== 'number' || isNaN(s.coins)) s.coins = 0;
  if (s.coins < 0) s.coins = 0;
  if (typeof s.bgmVolume !== 'number') s.bgmVolume = 35;
  s.bgmVolume = Math.max(0, Math.min(100, s.bgmVolume));
  if (typeof s.sfxVolume !== 'number') s.sfxVolume = 60;
  s.sfxVolume = Math.max(0, Math.min(100, s.sfxVolume));
  if (typeof s.sfxOn !== 'boolean') s.sfxOn = true;
  if (typeof s.forceSound !== 'boolean') s.forceSound = false;
  if (typeof s.introPlayed !== 'boolean') s.introPlayed = false;
  // ── ショップ整理：既に効果が無料公開されていた／実装が困難だった5商品を廃止。
  //    既存の購入者には代金を全額返金し、所持記録も除去する（一度だけ・自動）。
  const DISCONTINUED_REFUND = {
    note_board_danger: 250,
    note_bet_size:     300,
    note_position:      350,
    note_outs:          400,
    note_equity:        600,
  };
  let refundTotal = 0;
  const refundedNames = [];
  Object.keys(DISCONTINUED_REFUND).forEach(id => {
    const idx = s.ownedItems.indexOf(id);
    if (idx !== -1) {
      s.ownedItems.splice(idx, 1);
      refundTotal += DISCONTINUED_REFUND[id];
      refundedNames.push(id);
      // note_ 系はunlockedNotesにも追加されていたので合わせて除去
      const noteId = id.replace('note_', '');
      if (Array.isArray(s.unlockedNotes)) {
        const ni = s.unlockedNotes.indexOf(noteId);
        if (ni !== -1) s.unlockedNotes.splice(ni, 1);
      }
    }
  });
  if (refundTotal > 0) {
    s.coins = (s.coins || 0) + refundTotal;
    // ロード直後にトーストで知らせるため、次のrender後に一度だけ表示するフラグを立てる
    s.__pendingRefundNotice = { total: refundTotal, count: refundedNames.length };
  }
  return s;
}

// 音響共通ヘルパ
function isBgmOn() { return !!(save && save.bgmOn); }
function isSfxOn() { return !!(save && save.sfxOn); }
function sfxVolFloat() {
  const v = save && save.sfxVolume != null ? save.sfxVolume : 60;
  return Math.max(0, Math.min(1, v / 100));
}

// 解放フラグの一元ヘルパ
function isEndingUnlocked() { return !!(save && save.endingUnlocked); }
function isStageCleared(stageId) {
  return !!(save && Array.isArray(save.clearedStages) && save.clearedStages.includes(stageId));
}
// ステージクリア時に呼ぶ（派生フラグも一緒に更新）
function markStageCleared(stageId) {
  if (!save.clearedStages.includes(stageId)) save.clearedStages.push(stageId);
  if (stageId === 'velvet') save.endingUnlocked = true;
  saveProgress();
}

const SAVE_VERSION = 2;
let save = null;
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return normalizeSave(defaultSave());
    const data = JSON.parse(raw);
    const merged = { ...defaultSave(), ...data };
    merged.version = SAVE_VERSION;
    return normalizeSave(merged);
  } catch (e) {
    console.warn('Save load failed; using default', e);
    return normalizeSave(defaultSave());
  }
}
function saveProgress() {
  try {
    // ログ膨張対策：各カテゴリ最新500件のみ保持
    if (save && save.logs) {
      Object.keys(save.logs).forEach(k => {
        if (Array.isArray(save.logs[k]) && save.logs[k].length > 500) {
          save.logs[k] = save.logs[k].slice(-500);
        }
      });
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    // クォータ超過なら logs を切り詰めて再試行
    if (e && e.name === 'QuotaExceededError' && save) {
      try {
        save.logs = { actions: [], bets: [], reactions: [], psych: [] };
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch (e2) {
        console.warn('Save retry failed', e2);
      }
    } else {
      console.warn('Save failed', e);
    }
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
    // 自信家ブラファー：ブラフ多発・降りない・大きめベット
    profile: { bluffTendency: 0.85, aggression: 0.9, foldDiscipline: 0.18, valueBetTendency: 0.55, drawAggression: 0.5 },
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
    // 冷静な観察者：ブラフ少・ドロー警戒で大ベット・ドライ場では消極的
    profile: { bluffTendency: 0.35, aggression: 0.55, foldDiscipline: 0.72, valueBetTendency: 0.7, drawAggression: 0.9 },
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
    // 商人気質：割が合わなければ降りる・ブラフ少・強い手で罠
    profile: { bluffTendency: 0.25, aggression: 0.5, foldDiscipline: 0.82, valueBetTendency: 0.85, drawAggression: 0.4, trapTendency: 0.85 },
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
    // 圧支配のディーラー：大ベットで圧かけ・優勢時もさらに追い込む
    profile: { bluffTendency: 0.6, aggression: 0.92, foldDiscipline: 0.55, valueBetTendency: 0.85, drawAggression: 0.75, pressureTalkTendency: 0.95 },
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

// 心理バトルv2：舞台演出の相手ビジュアル。
// 1) 顔アップカットイン（${key}_cutin_panic.webp）を優先表示
// 2) 未生成キャラは全身立ち絵（${key}_default.png）にフォールバックし、表示モードも切替
// 3) それも無ければ通常の assetFallback（枠内プレースホルダ）に委ねる
window.psychStageFallback = function(imgEl, key) {
  const stage = imgEl.closest('.v2p-opponent-stage');
  if (!imgEl.dataset.psychStage2) {
    imgEl.dataset.psychStage2 = '1';
    if (stage) stage.classList.replace('v2p-mode-cutin', 'v2p-mode-standee');
    imgEl.onerror = () => window.psychStageFallback(imgEl, key);
    imgEl.src = `assets/characters/${key}_default.png`;
  } else {
    imgEl.onerror = null;
    window.assetFallback(imgEl, key);
  }
};

// P1-3: バトル中のミミ表情差分。画像が届いていない場合は mimi_default.png に、
// それすら無ければ assetFallback の枠内表示に自然にフォールバックする。
// 表情: default / win / sad / shock / think
function setMimiExpression(expr) {
  // 現在の表情を記録（render() 後の再適用で表情もスキンも維持するため）
  if (state) state.mimiExpr = expr || 'default';
  document.querySelectorAll('.battle-mimi-img, [data-mimi-face]').forEach(img => {
    // 平常時（default）は装備中スキンの専用画像を優先（mimi_pink/panda/gold.png）。
    // 表情リアクション中（win/sad/shock/think）は表情画像を優先する。
    const skin = (save && save.equippedMimiSkin && save.equippedMimiSkin !== 'default')
      ? save.equippedMimiSkin : null;
    const goPlainDefault = () => {
      img.onerror = () => { img.onerror = null; window.assetFallback(img, 'mimi'); };
      img.src = 'assets/characters/mimi_default.png';
    };
    const goDefault = () => {
      if (skin) {
        img.onerror = goPlainDefault; // スキン画像が無ければ通常ミミへ
        img.src = `assets/characters/mimi_${skin}.png`;
      } else {
        goPlainDefault();
      }
    };
    // v2 バトル画面：バストアップ差分（think / shock / win）を優先。無ければ従来PNGへ
    if (img.closest('.battle-screen.v2')) {
      const bust = { default: 'think', think: 'think', shock: 'shock', win: 'win', sad: 'think', blush: 'win' }[expr || 'default'] || 'think';
      img.onerror = () => { img.onerror = goDefault; img.src = `assets/characters/mimi_${expr && expr !== 'default' ? expr : 'default'}.png`; };
      img.src = `assets/characters/mimi_bust_${bust}.webp`;
      return;
    }
    if (!expr || expr === 'default') { goDefault(); return; }
    img.onerror = goDefault;
    img.src = `assets/characters/mimi_${expr}.png`;
  });
}

// ── 相手キャラの表情差分システム（フォルダに実在する差分だけを結線）──
// 抽象ムード → キャラ別の実ファイル名。存在しない組み合わせは default にフォールバック。
//   polka  : blush（照れ/羞恥）, panic（動揺）
//   grano  : concerned（不安）, bow（敗北の礼）, recommend（自信/満足）
//   rico   : serious（本気）, smile（余裕/勝ち誇り）
//   selina / velvet : 差分なし（default のみ）
const OPPONENT_EXPRESSIONS = {
  polka:  { pressure: 'panic',    rattled: 'panic',     pleased: 'blush',     defeat: 'blush' },
  grano:  { pressure: 'concerned',rattled: 'concerned', pleased: 'recommend', defeat: 'bow'   },
  rico:   { pressure: 'serious',  rattled: 'serious',   pleased: 'smile',     defeat: 'smile' },
  velvet: {},
  selina: {},
};

// mood: 'default' | 'pressure'（大ベット/強気）| 'rattled'（ブラフ露呈/劣勢）
//       | 'pleased'（勝ち/余裕）| 'defeat'（敗北）
function setOpponentExpression(mood) {
  if (state) state.opponentExpr = mood || 'default';
  const key = state && state.opponentImgKey;
  if (!key) return;
  const map = OPPONENT_EXPRESSIONS[key] || {};
  const expr = (mood && mood !== 'default') ? map[mood] : null;
  // 相手が写る全要素：バトル左パネル・心理モーダルのポートレート/セリフ顔
  const targets = document.querySelectorAll('[data-bind="opponentImg"], [data-opp-face]');
  targets.forEach(img => {
    const goDefault = () => {
      img.onerror = () => { img.onerror = null; window.assetFallback(img, key); };
      img.src = `assets/characters/${key}_default.png`;
    };
    if (!expr) { goDefault(); return; }
    img.onerror = goDefault; // 差分ファイルが無ければ default へ
    img.src = `assets/characters/${key}_${expr}.png`;
  });
}

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
  let bestFive = null;
  const combos = combinations(cards, 5);
  for (const five of combos) {
    const ev = evalFive(five);
    if (!best || ev.score > best.score) { best = ev; bestFive = five; }
  }
  if (best) best.bestFive = bestFive; // 勝ち手を構成する5枚
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
    // A-2-3-4-5（ホイール）：Aを1として扱う5ハイストレート
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true; topStr = 5;
    }
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
  // AI判断用：単純な役ランク 0-9 を 0-1 にマップ（AI閾値に合わせて調整済み）
  const ev = evaluateHand(cards);
  const base = ev.rank / 9;
  return Math.min(1, base + (ev.score % 1e10) / 1e12);
}

// プレイヤー表示用：実戦的な対戦勝率に近い値を返す（手札+場札の総合評価）
// AIの判断系（handStrength01）とは分離。表示「勝率○%」で違和感を出さないため。
function realisticEquity01(cards) {
  const ev = evaluateHand(cards);
  // 役ランクごとの「対戦勝率」現実的レンジ（ヘッズアップ・ショーダウン相当）
  const bands = [
    [0.20, 0.50],  // 0 ハイカード：トップカード次第で 20-50%
    [0.55, 0.82],  // 1 ワンペア：弱ペア55% → エースペア82%
    [0.80, 0.92],  // 2 ツーペア
    [0.88, 0.96],  // 3 スリーカード
    [0.92, 0.97],  // 4 ストレート
    [0.94, 0.98],  // 5 フラッシュ
    [0.97, 0.99],  // 6 フルハウス
    [0.985, 0.995], // 7 フォーカード
    [0.998, 0.9995],// 8 ストレートフラッシュ
    [1.00, 1.00],   // 9 ロイヤル
  ];
  const band = bands[Math.min(ev.rank, 9)];
  // band 内の位置：bestFive のトップカードランクで補間（2→0、A→1）
  let pos = 0.5;
  if (ev.bestFive) {
    const top = Math.max(...ev.bestFive.map(c => c.rank));
    pos = (top - 2) / 12;
  }
  return band[0] + pos * (band[1] - band[0]);
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

// v4 B1 のアルゴリズム強化版：プロファイル差が体感できるよう細分化
function decideOpponentAction(profile, ctx, opts = {}) {
  const r = rand();
  const hs = ctx.handStrength;

  // === サイズ決定ヘルパー：aggression を3段階に分解 ===
  // 高アグレッション(>=0.7)：pot_1 / pot_2_3 / pot_1_2 を 4:4:2 配分
  // 中アグレッション(>=0.5)：pot_2_3 / pot_1_2 / pot_1_3 を 4:5:1 配分
  // 低アグレッション(<0.5)：pot_1_2 / pot_1_3 を 6:4 配分
  const pickSize = (extraAggro = 0) => {
    const a = Math.min(1, profile.aggression + extraAggro);
    const rr = rand();
    if (a >= 0.7) {
      if (rr < 0.4) return 'pot_1';
      if (rr < 0.8) return 'pot_2_3';
      return 'pot_1_2';
    }
    if (a >= 0.5) {
      if (rr < 0.4) return 'pot_2_3';
      if (rr < 0.9) return 'pot_1_2';
      return 'pot_1_3';
    }
    if (rr < 0.6) return 'pot_1_2';
    return 'pot_1_3';
  };

  if (opts.forceLargeBet) {
    return { type: 'bet', size: pickSize(0.15), intent: 'forced_bluff' };
  }
  // フォールド判定（強さが0.18未満かつコール額あり）
  // foldDiscipline が高いほど降りやすい（規律ある）／低いほどコールしがち
  if (hs < 0.18 && r > profile.foldDiscipline && ctx.toCall > 0) {
    return { type: 'fold' };
  }
  // チェックレイズ罠（trapTendency）：強い手でもチェックして相手の攻めを誘う
  // ※ ブラフ判定より前に判定（強い手の trap が bluff に誤分類されないように）
  if (hs > 0.65 && ctx.canCheck && profile.trapTendency && r < profile.trapTendency * 0.5) {
    return { type: 'check_call', intent: 'trap' };
  }
  // ブラフ
  if (hs < 0.35 && r < profile.bluffTendency) {
    // ポルカ系（aggression高 & bluffTendency高）はブラフでも遠慮なくデカく打つ
    const aggroBoost = profile.bluffTendency > 0.65 ? 0.1 : 0;
    return { type: 'bet', size: pickSize(aggroBoost), intent: 'bluff' };
  }
  // バリュー
  if (hs > 0.55 && r < profile.valueBetTendency + 0.2) {
    // 圧支配タイプ（pressureTalkTendency）はバリューも大きく
    const pressureBoost = profile.pressureTalkTendency ? 0.1 : 0;
    return { type: 'bet', size: pickSize(pressureBoost), intent: 'value' };
  }
  // ドロー潰し（フラッシュ/ストレート両対応）
  if (ctx.boardDanger && (ctx.boardDanger.flushAlert || ctx.boardDanger.straightAlert)
      && r < profile.drawAggression) {
    // 両ドロー兼ねは大ベット、片方なら標準
    const both = ctx.boardDanger.flushAlert && ctx.boardDanger.straightAlert;
    return { type: 'bet', size: pickSize(both ? 0.15 : 0), intent: 'draw' };
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
  // 最低50を確保しつつ、絶対に残スタック(allInMax)を超えない
  amt = Math.max(50, amt);
  return Math.max(0, Math.min(amt, allInMax));
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
  // 本気モードのリコは別人格セリフ
  if (state.seriousRicoMode) return ricoSeriousSpeech(action);
  if (action.intent === 'tutorial_bluff' || action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'いっくよー！ガツンと攻めるからねー',
      'はい、ミミ、よーく見な〜',
      'ふふ、練習だから容赦するけどさ',
      'ほら、ベットだよ。怖い顔してる？',
      'こういう時こそ落ち着いて、ね？',
      'ミミ、今のアタシの目、よーく見て？',
      'プレッシャーかけちゃう〜',
    ]);
  }
  if (action.intent === 'value') return pick([
    'うん、これは強気で行くよ',
    'たまには本気のアタシも見せちゃおっか',
    'ミミ、これは降りていい場面だよー',
  ]);
  if (action.intent === 'draw') return pick([
    'ドロー潰しー、こうやって守るんだよー',
    '今のうちに値段つけとくね',
  ]);
  if (action.type === 'fold') return pick([
    'はいはい、今回は譲っとくね〜',
    '今のは降りる場面、教科書通りー',
    'ミミの圧、感じたよ。負けを認めるー',
  ]);
  if (action.type === 'check_call') return pick([
    'コールでOKっしょ',
    'まだ様子見ーね',
    'のんびり行こ？',
    'タダで次のカード見られるならお得じゃん',
    'チェックチェック、急がない〜',
  ]);
  return pick(['ふふ、気楽にいこ？', 'いい時間だねー', 'ミミ、ちゃんと考えてるー？']);
}

function ricoSeriousSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      '……アタシ、教える立場やめたから',
      '本気のアタシ、覚悟してね',
      'いつまでも先輩面してると思った？',
      '練習は終わり。ここからは試験よ',
      'ミミ、もう守らないからね',
    ]);
  }
  if (action.intent === 'value') return pick([
    '読み切ったわ。これは取らせて',
    '弟子だからって手加減はナシ',
    'バリュー、最大化させてもらう',
  ]);
  if (action.intent === 'trap') return pick([
    '……チェック。さて、どう来る？',
    '罠か本気か、見抜けるかしら',
  ]);
  if (action.intent === 'draw') return pick([
    'ドローには代金を払ってもらう',
    'タダでカード見られると思わないで',
  ]);
  if (action.type === 'fold') return pick([
    '今回は譲るわ。次は逃さない',
    'いい読み。降ります',
    'ミミ、成長したね……でも次は',
  ]);
  if (action.type === 'check_call') return pick([
    '見させて。情報、もう少し',
    'コールで応じる',
    '焦らない。これがプロ',
  ]);
  return pick(['さあ、ミミ', '本気のアタシ、楽しんで', '……']);
}
function selinaSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'このボードなら、強く出る理由はあります。',
      '安くは見せません。',
      'あなたに見えていないボードが、私には見えていますよ。',
      'このサイズの意味、考えてください。',
      'プレッシャー、かけさせてもらいます。',
      'あなたのレンジでは厳しいはず。',
      'ボードが私に味方している、それだけです。',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      '……静かに進めましょう',
      'コール、で構いません',
      'こちらも様子を見させてもらいます',
      'バリュー、最大化させてください。',
      '無理に追わせる必要はありません。',
      '正しい額、置きました。',
    ]);
  }
  if (action.intent === 'draw') return pick([
    'ドローを潰すサイズで、いきます。',
    'タダでターンを見せる気はありません。',
    'プロテクション、必要ですね。',
  ]);
  if (action.intent === 'trap') return pick([
    'チェック。……どうぞ、攻めてください。',
    '罠か、ただの様子見か。判断してください。',
  ]);
  if (action.type === 'fold') return pick([
    '今回は手を引きます。賢明な選択を。',
    'ポットオッズが合いません。降ります。',
    'これ以上は損切りです。',
  ]);
  if (action.type === 'check_call') return pick([
    'チェック',
    '同額で、構いません',
    '無理は禁物です',
    'コール。情報を買います。',
    '価格に見合うなら、応じます。',
  ]);
  return pick(['……', '考えどころですね', '読み切れない、ですが']);
}
function granoSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'さあ、未来の可能性を買いませんか？',
      'お嬢さん、この値段なら買い時ですよ。',
      'まだ高い買い物ではないでしょう？',
      '掘り出し物、見つかるかもしれませんよ？',
      '商売には度胸も必要ですからな。',
      '値札はこちら、お買い得です。',
      'ふふ、降りるのは簡単ですが……',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      'この一枚を見るだけなら、安いものですよ。',
      '小さな値札に、大きな見返りがありますよ。',
      'お得な取引でしょう？',
      '良い商品には、相応の値段を。',
      '正当な対価、ですな。',
      '見過ごすには惜しい一手ですよ。',
    ]);
  }
  if (action.intent === 'draw') return pick([
    'ドロー狙いには、保険料を頂きます。',
    'タダで掘らせるわけにはまいりません。',
  ]);
  if (action.intent === 'trap') return pick([
    'チェック……さあ、誘ってみますかな。',
    'お嬢さんの出方を、見させていただこう。',
    'ふふ、罠を仕掛けるのも商売のうちですよ。',
  ]);
  if (action.type === 'fold') return pick([
    '今回は商談不成立、ですな。',
    '損切り、これも経営です。',
    'お嬢さんに敬意を表して、引きましょう。',
    '見極めました。今回はパスです。',
  ]);
  if (action.type === 'check_call') return pick([
    '見させていただきます',
    'なるほど、なるほど',
    'いいでしょう、進めましょう',
    'コール。情報という名の投資です。',
    '安いものですよ、この見物料は。',
  ]);
  return pick([
    'うふふ、考えどころですね',
    'さて、どう値踏みしましょうか',
    'お嬢さんの手、興味深いですなぁ',
  ]);
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
  if (state.seriousRicoMode) return pick([
    '本気のアタシ、見せるわ',
    '甘やかしは終わり。さあ、始めよう',
    'ミミ、今日は弟子じゃなくて相手として',
    '師範代の名にかけて、勝たせてもらう',
  ]);
  switch (state.opponentId) {
    case 'rico_tutorial': return pick([
      'いいよミミ、リラックスして〜',
      'はい、深呼吸して〜',
      '練習、練習。気楽にね〜',
      'カード配るよ〜、ふふ',
    ]);
    case 'polka':  return pick([
      'いっくよー！',
      'お、来た来た',
      'こっちは準備OKー！',
      'ミミちゃん、よろしく〜！',
      'ふっふっふ、今日は勝つよー',
      'ボクの華麗なプレイ、見せちゃう〜',
    ]);
    case 'selina': return pick([
      'では、始めましょう。',
      '一手ずつ、ね。',
      '……どうぞ。',
      '冷静にいきましょう。',
      '時間内に判断してください。',
      '読み合い、楽しみにしています。',
    ]);
    case 'grano':  return pick([
      'さあ、開店ですよ。',
      '良い取引にしましょう、お嬢さん。',
      '値踏みの時間ですね。',
      'ふふ、本日もよろしくお願いしますな。',
      'お嬢さんの財布の中身、楽しみですよ。',
      '今日も商売繁盛と参りましょう。',
    ]);
    case 'velvet': return pick([
      '始めましょう、新人。',
      'あなたの限界、見せてもらうわ。',
      'カードを配るわよ……',
      '……運命の卓へ、ようこそ。',
      '今夜が、あなたの最終試験よ。',
      '震えなさい、新人。それが正しい反応よ。',
      'VIPルームへようこそ。出口は……見つかるかしら？',
      '今までの相手とは違うことを、思い知りなさい。',
      'さあ、私の卓で踊ってみてちょうだい。',
      '新人のくせに、ここまで来たのね。浅はかだわ。',
      'カードはただの紙切れ。私が見ているのは……あなたよ。',
    ]);
    default: return '……';
  }
}
function opponentReactToPlayerFold() {
  if (state.seriousRicoMode) return pick([
    'いい判断。ちゃんと教えた甲斐があった',
    '降りる勇気、それも実力よ',
    'ふふ、成長したね、ミミ',
  ]);
  switch (state.opponentId) {
    case 'rico_tutorial': return pick([
      'お、降りられたかー！それも判断のうちだよ',
      '降りるのも技術だからね、いいよいいよ',
      'うんうん、深追いしない判断、えらい〜',
      'はい、ナイス・フォールド〜',
    ]);
    case 'polka':  return pick([
      'やったー！ボクの勝ち〜！',
      'へへっ、降りちゃったね！',
      'おやおや〜、ミミちゃん弱気〜',
      'ボクの圧、効いた？効いた？',
      'もらっちゃうよーチップ〜',
    ]);
    case 'selina': return pick([
      '賢明な判断です。',
      '降りるのも一つの戦略ですね。',
      '正しい撤退、評価します。',
      '損切り上手ですね。',
    ]);
    case 'grano':  return pick([
      'ふむ、今回は商談見送りですね。',
      'お買い上げいただけず、残念です。',
      'まあ、無理強いはいたしません。',
      '次回のお取引、お待ちしておりますよ。',
    ]);
    case 'velvet': {
      // ハンド進行で煽りが変化
      const handNo = state.handNo || 1;
      if (handNo <= 2) return pick([
        'ふふ……賢明ね、新人。',
        'カードを見る前に折れた……それも答えよ。',
        '初めての敗北、味わってちょうだい。',
      ]);
      if (handNo <= 5) return pick([
        'また降りるの？それでは何も奪えないわよ。',
        'いい判断。でもいつまでそれが通用するかしら。',
        '逃げる勇気、悪くないわ。但し勝てないけれど。',
        'ふぅん……まだ私の手の内を読めないようね。',
      ]);
      return pick([
        '何度目かしら、その逃げ方。',
        'もう降りても、結末は同じよ。',
        '……つまらない。本気で来てくれない？',
        'あなた、本当にここまで来た新人なの？',
        '降りる以外の選択肢、思い出してみて？',
      ]);
    }
    default: return '……';
  }
}

// プレイヤー（ミミ）の攻め（ベット/レイズ/オールイン）への即時反応セリフ
// kind: 'bet_small'（pot 1/2以下）| 'bet_big'（2/3〜pot）| 'raise' | 'allin'
function opponentReactToPlayerAggression(kind, amount) {
  if (state.opponentId === 'rico_tutorial' && state.seriousRicoMode) {
    switch (kind) {
      case 'bet_small': return pick([
        'その程度、揺らがないわ',
        'ふぅん、小さく刻んできたのね',
        '様子見ね。悪くないわ',
        '慎重ね。でも、まだ足りない',
      ]);
      case 'bet_big': return pick([
        '……本気になってきたじゃない',
        'そのサイズ、意味はわかってるの？',
        '来たわね。受けて立つわ',
        'ふぅん、強気に出たわね',
      ]);
      case 'raise': return pick([
        'レイズ……いい度胸ね',
        'ミミ、本当に来るとは思わなかった',
        '面白い。受けましょう',
        'その手、本気で通すつもり？',
      ]);
      case 'allin': return pick([
        'オールイン……本気なのね、ミミ',
        '全部……いいわ、受けて立つ',
        '弟子が師匠に挑む顔ね、それ',
        'その覚悟、見せてもらうわ',
      ]);
      default: return '……';
    }
  }
  switch (state.opponentId) {
    case 'rico_tutorial': switch (kind) {
      case 'bet_small': return pick([
        'お、来たね〜。それくらいなら余裕だよ',
        'ふふ、ミミも慣れてきたじゃん',
        'そのサイズかー、ちゃんと見せてもらうよ',
        'いいね、その調子っ',
      ]);
      case 'bet_big': return pick([
        'えっ、そこそこ来たね……ちょっと考えるよ',
        'おおっ、強気じゃん。ふーむ……',
        'ミミ、本気出してきた？ちょっと待って〜',
        'あちゃー、そのサイズは効くなぁ',
      ]);
      case 'raise': return pick([
        'レイズ！？ちょっとちょっと、待って〜',
        'お、やるじゃん。よし、考えるよ',
        'ミミがレイズしてくるとはねぇ……',
        'うわ、成長したね……ちょっと悩むわ',
      ]);
      case 'allin': return pick([
        'えっ、オールイン！？ま、まじで！？',
        'ちょ、待って！本当に全部乗せた！？',
        'ミミ、それ本気の顔してる……どうしよ',
        'うわぁ、これは……教え子が怖いよ',
      ]);
      default: return '……';
    }
    case 'polka': switch (kind) {
      case 'bet_small': return pick([
        'お、来たね！でもその程度じゃボクには効かないよ〜',
        'ふーん、まあその額なら見てあげる',
        'そんなんじゃボク倒せないよー？',
        'その程度、想定内だし〜',
      ]);
      case 'bet_big': return pick([
        'うわっ、急に大きくない！？ちょっと待ってよ〜',
        'え、ええ！？そのサイズはズルいって〜',
        'ボ、ボク別に怖くないし……ちょっとだけ考える',
        'なっ……そんなに来る！？',
      ]);
      case 'raise': return pick([
        'レイズ！？え、待って待って〜',
        'う、うわー、ミミちゃん強気すぎ〜！',
        'そ、そんな……ボクの計画が……！',
        'ちょっとタンマ！考えさせてー！',
      ]);
      case 'allin': return pick([
        'ええーっ！？オールイン！？う、嘘でしょ〜！？',
        'ちょ、ま、待って！心の準備が〜！',
        'ボ、ボクの人生終わった……（涙目）',
        'えぇぇ！？そこまでやる！？',
      ]);
      default: return '……';
    }
    case 'selina': switch (kind) {
      case 'bet_small': return pick([
        '標準的なサイズですね。想定内です。',
        'その額なら、判断は容易です。',
        '様子見ですね。受け止めます。',
        '妥当な一手です。',
      ]);
      case 'bet_big': return pick([
        '……大きいサイズですね。意図を読ませてください。',
        'そのサイズ、軽視はできません。',
        '強気ですね。少し、時間をください。',
        '想定より重いですね。考えます。',
      ]);
      case 'raise': return pick([
        'レイズ……レンジを絞らせてください。',
        'なるほど、そう来ましたか。考えます。',
        '想定より強い一手ですね。',
        '……見直す必要がありそうです。',
      ]);
      case 'allin': return pick([
        'オールイン……予想以上です。少し、驚きました。',
        'そこまでの覚悟とは。慎重に判断します。',
        '全て、ですか。……興味深いです。',
        '……想定外です。じっくり読ませてください。',
      ]);
      default: return '……';
    }
    case 'grano': switch (kind) {
      case 'bet_small': return pick([
        'ふむ、手頃な値札ですな。',
        'なるほど、様子見の投資ですか。',
        'その額なら、じっくり吟味できますね。',
        '妥当な商談ですね。',
      ]);
      case 'bet_big': return pick([
        'おや、大きな買い物に出ましたね……値踏みさせてください。',
        'ほう、強気な商談ですな。',
        'これは……少々値が張りますね。考えましょう。',
        'なかなかの一手ですね、お嬢さん。',
      ]);
      case 'raise': return pick([
        'レイズとは、大胆な取引ですな。',
        'ふむ、値を吊り上げてきましたか。',
        'お嬢さん、本気の商談のようですね。',
        'これは考えものですね。',
      ]);
      case 'allin': return pick([
        'オールイン……全財産を賭けるとは、大した度胸ですな。',
        'これは大きな取引になりましたね……検討します。',
        'まさか、そこまでの覚悟とは。驚きました。',
        'ふむ……これは商談の域を超えていますね。',
      ]);
      default: return '……';
    }
    case 'velvet': switch (kind) {
      case 'bet_small': return pick([
        'あら、可愛いサイズね。',
        'ふふ、様子見？いいわ、受けてあげる。',
        'その程度で、私が揺らぐと思った？',
        'まだ本気じゃないのね。',
      ]);
      case 'bet_big': return pick([
        'あら、少しはやる気になったのね。面白いわ。',
        'ふふん、いいサイズじゃない。楽しませて。',
        'その圧、悪くないわよ、新人。',
        'あら……ちょっとは骨があるじゃない。',
      ]);
      case 'raise': return pick([
        'レイズ……あら、牙を剥いてきたわね。',
        'いいわ、そういうの好きよ。',
        'ふふ、ようやく本気になったの？',
        'あら素敵。もっと見せて？',
      ]);
      case 'allin': return pick([
        'オールイン……あら、素敵。全部賭ける覚悟、気に入ったわ。',
        'ふふふ、いいわ。そこまでするなら、受けて立つ。',
        '震えるどころか、笑えてきたわ。楽しませてくれるじゃない。',
        'あら、あらあら。新人にしては上出来よ。',
      ]);
      default: return '……';
    }
    default: return '……';
  }
}

function polkaSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'へへっ、その顔、もう負けてるって感じだね！',
      'おっと、ミミちゃん降りないの？やめときなって！',
      'ボクの強さ、見えちゃった？',
      'ガッツリいくよー！どーん！',
      'ミミちゃん、これ降りた方がいいって！',
      'ボクの読みは外れないんだから〜',
      'うわー、ボク絶対勝てる手だわー（棒）',
      'これは……ヤバいやつだよ……うん！',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      'ふーん……',
      'ボクは別に、急がないからさ。',
      '……（無言で考え込む）',
      '……（カードをじっと見つめる）',
      'ふーん、まあいっか',
    ]);
  }
  if (action.intent === 'draw') {
    return pick([
      'まだまだこれからでしょ？',
      'カード次第かなー',
      'もう一枚見たいんだよねー',
    ]);
  }
  if (action.type === 'fold') return pick([
    'うーん、今回はやめとくよ……',
    'まあ、今回はいいかな……（ぶつぶつ）',
    'ボク、今のはちょっと無理〜',
    '次がんばるー！',
  ]);
  if (action.type === 'check_call') return pick([
    'コールでいいよ',
    'まだ様子見だね',
    'もうちょっと考えるー',
    'チェックでお願いしまーす',
  ]);
  return pick([
    '……',
    'んー……',
    'どうしよっかなー',
  ]);
}

//=============================================================
// 4. 場札危険度（v4 B2）
//=============================================================
// ブロッカー検出：プレイヤーがフラッシュ脅威スートの高位札（A or K）を持っているか
function detectBlockerScenario(state) {
  if (!state.community || !state.playerHand) return null;
  const suitCount = {};
  state.community.forEach(c => suitCount[c.suit] = (suitCount[c.suit]||0)+1);
  // 場札に2枚以上同スートがある＝フラッシュ脅威
  for (const suit of Object.keys(suitCount)) {
    if (suitCount[suit] < 2) continue;
    const playerOfSuit = state.playerHand.filter(c => c.suit === suit);
    const hasA = playerOfSuit.some(c => c.rank === 14);
    const hasK = playerOfSuit.some(c => c.rank === 13);
    if (hasA || hasK) {
      return { suit, rankLabel: hasA ? 'A' : 'K', boardCount: suitCount[suit] };
    }
  }
  return null;
}

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

  // ===== 本気リコ先輩：勝負の核を問う上級心理戦 =====
  rico_serious_polarized: {
    id: 'rico_serious_polarized',
    situationFn: (state) => `🔥 本気のリコがリバーでオーバーベット（ポット超）。\n場札：${renderCardsText(state.community)}　ミミの手札：${renderCardsText(state.playerHand)}`,
    speech: 'ここで降りるか、コールするか。アタシならどう打つか考えてみな？',
    zazazoHint: '上級者のリバーオーバーベット＝極化レンジ（ナッツorブラフ）',
    choices: [
      { id: 'polarized_read',  text: '相手レンジは極化（ナッツorブラフ）。自分のブラフキャッチ価値で判断', correct: true  },
      { id: 'always_strong',   text: 'オーバーベットは必ずナッツなので降りる',                             correct: false },
      { id: 'always_bluff',    text: 'オーバーベットは必ずブラフなので即コール',                          correct: false },
    ],
    onSuccess: {
      panyu: 35, zazazo: 2,
      hint: '極化レンジ＝相手のブラフ比率と自分の手札強度で判断',
      rico: 'そう、<u>極化レンジ理論</u>。アタシが本気で打つときも、ナッツとブラフを混ぜて打つ。<br>ブラフキャッチャーで読み切るのが王道だよ',
    },
    onFail: {
      panyu: -15,
      mimi: '大きいベットに飲まれちゃう……',
      rico: '<u>リバーオーバーベット＝極化</u>。読み一発で判断せず、自分の手のブラフキャッチ価値とレンジ全体で考えるの',
    },
  },
  rico_serious_blocker: {
    id: 'rico_serious_blocker',
    situationFn: (state) => {
      const b = detectBlockerScenario(state);
      if (!b) return `🔥 本気のリコがリバーで大ベット。場札にフラッシュ要素あり。\nミミの手札：${renderCardsText(state.playerHand)}`;
      return `🔥 本気のリコがリバーで大ベット。場札に${b.suit}が${b.boardCount}枚（フラッシュ可能）。\n` +
        `ミミの手札：${renderCardsText(state.playerHand)}\n` +
        `→ ミミは <b>${b.rankLabel}${b.suit}</b>（ナッツ${b.suit}フラッシュをブロック）を保持`;
    },
    speech: 'ナッツフラッシュの可能性、アタシが持ってるか？　自分の手札も使って考えてみな',
    zazazoHint: 'ブロッカー効果＝自分が持ってるカードで相手の最強コンボを潰せる',
    choices: [
      { id: 'blocker_call',  text: '自分が高位の同スートを握っているため、相手のナッツフラッシュ可能性が激減→コール強気', correct: true  },
      { id: 'fold_scary',    text: '同スート4枚あるからフラッシュ確定で降りる',                                          correct: false },
      { id: 'raise_pure',    text: '怖いのでとりあえずレイズで撤退を促す',                                              correct: false },
    ],
    onSuccess: {
      panyu: 35, zazazo: 2,
      hint: 'ブロッカー理論：自分の手がナッツの組み合わせを潰す',
      rico: '正解。<u>ブロッカー</u>は上級者必須の概念。<br>自分の手で相手のナッツコンボを消せれば、相手のレンジは弱くなる',
    },
    onFail: {
      panyu: -15,
      mimi: '相手の手だけ気にしちゃってた……',
      rico: '<u>自分の手も相手レンジを縛る</u>。高位の同スートを持ってる時点で、相手のナッツフラッシュ確率は激減するんだよ',
    },
  },
  rico_serious_minmax: {
    id: 'rico_serious_minmax',
    situationFn: (state) => `🔥 本気のリコがチェック→ミミがベット→リコが大きくチェックレイズしてきた。`,
    speech: 'チェックレイズ。アタシが弱い手で罠を仕掛けるかな？　それとも強い手で罠を仕掛けるかな？',
    zazazoHint: '上級者のチェックレイズは ほぼナッツ寄り or 強烈なセミブラフ',
    choices: [
      { id: 'mostly_nuts', text: 'プロのチェックレイズはレンジの上下端。中位ペアでは絶対にやらない',                  correct: true  },
      { id: 'always_call', text: 'チェックレイズもブラフがあるのでとりあえずコール',                                 correct: false },
      { id: 'always_fold', text: 'チェックレイズは怖いので無条件で降りる',                                          correct: false },
    ],
    onSuccess: {
      panyu: 35, zazazo: 2,
      hint: 'プロのチェックレイズ＝レンジ両極端（極ナッツ or 強セミブラフ）',
      rico: 'そう。<u>プロのチェックレイズは中位レンジを混ぜない</u>。<br>「降りるならフォールド／戦うなら最強で攻める」のミニマックス戦略',
    },
    onFail: {
      panyu: -15,
      mimi: 'パニックでコールしちゃう……',
      rico: 'プロの<u>チェックレイズは中位を混ぜない</u>。「強烈に強いか、強烈に弱くて圧で押すか」の二択構造だよ',
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
    situationFn: (state) => {
      const need = state.currentBetOpponent - state.currentBetPlayer;
      const potBefore = state.pot - need;
      const ratio = potBefore > 0 ? Math.round(need / potBefore * 100) : 0;
      return `場札：${renderCardsText(state.community)}\n` +
        `セリナのベット：ポットの約${ratio}%（標準を超える攻撃的サイズ）。`;
    },
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
    situationFn: (state) => {
      const need = state.currentBetOpponent - state.currentBetPlayer;
      const potBefore = state.pot - need;
      const ratio = potBefore > 0 ? Math.round(need / potBefore * 100) : 0;
      return `場札：${renderCardsText(state.community)}\n` +
        `ポット：${potBefore} に対し、グラーノのベット：${need}（≒${ratio}%）と小さめ。`;
    },
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
    situationFn: (state) => {
      const need = state.currentBetOpponent - state.currentBetPlayer;
      const potBefore = state.pot - need;
      const ratio = potBefore > 0 ? Math.round(need / potBefore * 100) : 0;
      return `場札：${renderCardsText(state.community)}\n` +
        `ポット：${potBefore} に対し、グラーノのベット：${need}（≒${ratio}%）と高め。`;
    },
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
      // 動的に正解レンジを設定
      if (reqWin <= 25) state.__potOddsBracket = 'lo25';
      else if (reqWin <= 40) state.__potOddsBracket = 'mid';
      else state.__potOddsBracket = 'hi';
      return `📊 状況整理\n` +
        `・ポット：${state.pot}チップ\n` +
        `・ミミがコールに必要：${need}チップ\n` +
        `・コール後のポット総額：${potAfterCall}チップ\n\n` +
        `🧮 計算\n` +
        `${need} ÷ ${potAfterCall} × 100 ≒ <b>${reqWin}%</b>\n\n` +
        `この勝率以上ならコールが期待値プラス（HU/トーナメント問わず同式）`;
    },
    speech: '【論理問題】このコールに必要な勝率はどのくらい？',
    zazazoHint: '上の計算結果から正しい範囲を選んで',
    choices: [
      { id: 'lo25', text: '〜25%（安いコール、軽いドローでも検討OK）', correctIf: 'lo25' },
      { id: 'mid',  text: '26〜40%（標準ベット、強めの手やドロー必要）', correctIf: 'mid' },
      { id: 'hi',   text: '41%以上（高勝率の手じゃないと損）',          correctIf: 'hi' },
    ],
    dynamicCorrect: true,
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: 'ポットオッズ＝払う額/コール後ポット総額。これが必要勝率',
      rico: 'いいねー！<u>払う額が大きいほど必要勝率も上がる</u>。手の強さと照らし合わせるの',
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
    rule: '完成役 vs 未完成ドロー：フロップ時点で見ると完成役の方が勝率が高い',
    situationFn: (state) => `📊 状況整理\n` +
      `・場札：${renderCardsText(state.community)}（フロップ）\n` +
      `・ミミ：トップペア成立（例：Aを含む1ペア、約65%の勝率）\n` +
      `・想定される相手：フラッシュドロー9アウツ（ターン+リバーで完成率約35%＝rule of 4）\n\n` +
      `🧮 ポイント\n` +
      `「完成してる役」は確定の強さ＝65%。\n` +
      `「9アウツドロー」は2枚引いて完成35%＝負ける可能性も。\n` +
      `（ヘッズアップ・MTT問わずトッププロも同じ計算）`,
    speech: '【論理問題】フロップ時点で勝率が高いのはどっち？',
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
      `プロは「ポジションは勝率5-10%相当」と言う。\n` +
      `※ヘッズアップ（1対1）：プリフロップはSB先手、フロップ以降はSBが後手＝有利。\n` +
      `※トーナメント（多人数）：BTN（ボタン）が常に最後にアクション＝最強ポジション。`,
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
  logic_spr: {
    id: 'logic_spr',
    type: 'logic',
    rule: 'SPR（Stack-to-Pot Ratio）：残りスタック ÷ ポット。低いほどコミット圧',
    situationFn: (state) => {
      const stack = state.playerChips;
      const pot = state.pot || 1;
      const spr = (stack / pot).toFixed(1);
      return `📊 状況整理\n` +
        `・ミミの残りスタック：${stack}\n` +
        `・現在のポット：${pot}\n\n` +
        `🧮 計算\n` +
        `SPR = ${stack} ÷ ${pot} ≒ <b>${spr}</b>\n\n` +
        `SPR < 3 → 完成役なら降りられない（コミット）\n` +
        `SPR > 6 → 降りる余地がある（プレイ深い）`;
    },
    speech: '【論理問題】SPRが低い時の最適行動は？',
    zazazoHint: 'スタックが小さい時は引き返せない',
    choices: [
      { id: 'commit',  text: '完成役があれば全部突っ込む（コミット）',           correct: true },
      { id: 'careful', text: 'SPRが低いほど慎重に降りるべき',                   correct: false },
      { id: 'doesnt', text: 'SPRは戦略に関係ない',                              correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: 'SPR < 3 ＝ オールイン圏。中途半端なベットは無意味',
      rico: 'お見事。<u>SPRはコミット圧の指標</u>。低いほど降りる余地が消える',
    },
    onFail: {
      panyu: -5,
      mimi: 'スタック少ない時こそ慎重に……？',
      rico: '逆。<u>SPRが低い＝もう降りられない</u>。完成役があれば押し切る判断',
    },
  },
  logic_bluff_catcher: {
    id: 'logic_bluff_catcher',
    type: 'logic',
    rule: 'ブラフキャッチ：相手レンジのブラフ比率 vs 必要勝率（ポット/(2×ベット+ポット)）',
    situationFn: (state) => {
      const need = Math.max(1, state.currentBetOpponent - state.currentBetPlayer);
      const potBefore = Math.max(1, state.pot - need);
      const potAfterCall = state.pot + need;
      const reqWin = Math.round((need / potAfterCall) * 100);
      const betPct = Math.round((need / potBefore) * 100);
      return `📊 状況整理\n` +
        `・場面：リバー、相手が ${need}チップ（≒ポットの${betPct}%）ベット\n` +
        `・ミミは中位ペア（ブラフキャッチャー：相手ブラフに勝つ、バリューに負ける）\n` +
        `・必要勝率（ポットオッズ）＝ <b>${reqWin}%</b>\n\n` +
        `🧮 ポイント\n` +
        `相手レンジに含まれる「ブラフの割合」が <b>${reqWin}%以上</b> なら、コールが期待値プラス。\n` +
        `（ヘッズアップ・MTT問わずブラフキャッチ理論の基本）`;
    },
    speech: '【論理問題】中位ペアでリバー大ベットを受けた時の判断基準は？',
    zazazoHint: 'ポットオッズと相手のブラフ比率を比較',
    choices: [
      { id: 'bluff_ratio', text: '相手のブラフ比率が必要勝率を超えるならコール', correct: true },
      { id: 'always_fold', text: '中位ペアなら常に降りるのが正解',                correct: false },
      { id: 'always_call', text: '中位ペアなら常にコールするのが正解',             correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 0,
      hint: 'ブラフキャッチ＝必要勝率 vs 相手のブラフ比率の比較',
      rico: 'いいねー。<u>中位ペアは「ブラフを捕まえる用」</u>。レンジ分析でコール判断',
    },
    onFail: {
      panyu: -5,
      mimi: '中位ペアって扱いに困る……',
      rico: '<u>中位ペア＝ブラフキャッチャー</u>。相手がどれくらい嘘つくかで決める',
    },
  },
  logic_implied_odds: {
    id: 'logic_implied_odds',
    type: 'logic',
    rule: 'インプライドオッズ：完成時に追加で得られるチップも勝率計算に含める',
    situationFn: () => `📊 状況整理\n` +
      `・小ペア（66）でフロップ進出 → セット狙い\n` +
      `・セット完成率：約 12%（11.8%）= 厳しい\n` +
      `・でも完成したら相手のスタックを取れる可能性\n\n` +
      `🧮 ポイント\n` +
      `直接のポットオッズだけでなく、<b>完成後に追加で取れる額</b>も計算に入れる。\n` +
      `相手のスタックが深いほどインプライドオッズは大きい。`,
    speech: '【論理問題】小ペアでフロップを見る価値が高い場面は？',
    zazazoHint: '完成後の利益を計算に入れる',
    choices: [
      { id: 'deep_stack', text: '相手のスタックが深い（取れる額が大きい）', correct: true },
      { id: 'shallow',    text: '相手のスタックが浅い時こそチャンス',     correct: false },
      { id: 'no_diff',    text: 'スタック深さは関係ない',                  correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 0,
      hint: 'インプライド＝深スタックほど大きい。セット狙いの価値UP',
      rico: 'お見事。<u>「直接の確率」だけじゃなく「完成後に取れる額」も考える</u>のがプロ',
    },
    onFail: {
      panyu: -5,
      mimi: '直接の確率だけ見てた……',
      rico: '<u>インプライドオッズは深スタックほど大きい</u>。小ペアは深い時こそ価値あり',
    },
  },
  logic_cbet_dry: {
    id: 'logic_cbet_dry',
    type: 'logic',
    rule: 'ドライボードでのCベット：相手がヒットしてない確率が高い',
    situationFn: (state) => `📊 状況整理\n` +
      `・場札：${renderCardsText(state.community)}（ドライボード）\n` +
      `・プリフロップでミミがレイズ → 相手はコール\n` +
      `・ドライボード＝連番なし・同スートなし・ペアなし\n\n` +
      `🧮 ポイント\n` +
      `相手のレンジ（コールしてきた手札）は、このボードでフィットしないことが多い。\n` +
      `→ 小さめのCベット（1/3〜1/2）でも降ろせる可能性が高い。\n` +
      `※ヘッズアップ：レンジが広いのでドライボードは小ベット効果大。\n` +
      `※多人数戦：1人でもヒットする確率が上がるのでもう少し慎重に。`,
    speech: '【論理問題】ドライボードでミミの最適行動は？',
    zazazoHint: '相手がヒットしてないボード',
    choices: [
      { id: 'small_cbet',  text: '1/3〜1/2ポットの小さなCベットで降ろしに行く', correct: true },
      { id: 'big_bet',     text: '常にポット級の大ベット',                       correct: false },
      { id: 'check',       text: '何もせずチェック',                             correct: false },
    ],
    onSuccess: {
      panyu: 15, zazazo: 0,
      hint: 'ドライボード＝相手のヒット率低い＝小ベットで十分',
      rico: 'そう。<u>ドライボードは小さく、ウェットボードは大きく</u>。サイズの使い分けが上手いね',
    },
    onFail: {
      panyu: -5,
      mimi: '常に大きいベットがいいと思ってた……',
      rico: '<u>ボードによってベットサイズは変える</u>。ドライは小、ウェットは大が基本',
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
  polka_overtalk: {
    id: 'polka_overtalk',
    situationFn: (state) => `場札：${renderCardsText(state.community)}\nポルカが「絶対勝てる手だわー（棒）」と言いながらベット。`,
    speech: 'これは……ヤバいやつだよ……うん！',
    zazazoHint: 'ゾゾゾ反応：声が裏返ってる',
    choices: [
      { id: 'over_talk',  text: '強気に言いすぎ＝逆に弱い。コール or レイズ', correct: true },
      { id: 'honest',     text: '本人がヤバいと言ってるから降りる',         correct: false },
      { id: 'dont_care',  text: 'セリフは関係ない、自分の手だけで判断',     correct: false },
    ],
    onSuccess: {
      panyu: 20, zazazo: 1,
      hint: '相手レンジ：オーバーアクトのブラフ寄り',
      rico: '上手いね。<u>言葉が大きすぎる時こそ疑え</u>って、ポーカーの格言だよ',
    },
    onFail: {
      panyu: -10,
      mimi: '正直に受け取っちゃった……',
      rico: 'ポルカは <u>言葉と手が逆な子</u>。慣れたら見抜けるよ',
    },
  },
  selina_check_raise: {
    id: 'selina_check_raise',
    situationFn: (state) => `セリナがフロップでチェック→ミミがベット→セリナが大きくレイズしてきた。`,
    speech: 'チェック……さあ、踊って？',
    zazazoHint: 'ゾゾゾ反応：表情が変わらない（読みづらい）',
    choices: [
      { id: 'trap_raise',     text: 'チェックレイズの罠。強い手を隠してた可能性高い', correct: true },
      { id: 'just_caught_up', text: 'セリナも今ベットに付き合いたいだけ',           correct: false },
      { id: 'still_bluff',    text: 'まだブラフを続けてる',                       correct: false },
    ],
    onSuccess: {
      panyu: 25, zazazo: 1,
      hint: '相手レンジ：ナッツ級〜上位ペア（強い）',
      rico: 'お見事。<u>チェック→レイズは上級者の必殺技</u>。降りる判断ができたら一人前',
    },
    onFail: {
      panyu: -15,
      mimi: '勢いで突っ込んじゃう……！',
      rico: 'チェックレイズはほぼ強い手。<u>レンジ思考</u>で考えて、無理しない判断もアリだよ',
    },
  },
  grano_river_polar: {
    id: 'grano_river_polar',
    situationFn: (state) => `リバー：場札${renderCardsText(state.community)}　グラーノがオーバーベット（ポット超）してきた。`,
    speech: 'お嬢さん、この一手で全てが決まりますよ。',
    zazazoHint: 'ゾゾゾ反応：葉巻を握る指が固い',
    choices: [
      { id: 'polar_range',     text: 'リバーのオーバーベットはナッツかブラフの両極端。判断は手次第',   correct: true },
      { id: 'always_nuts',     text: 'オーバーベット＝必ずナッツ。降りる一択',                       correct: false },
      { id: 'always_bluff',    text: 'オーバーベット＝必ずブラフ。コール一択',                       correct: false },
    ],
    onSuccess: {
      panyu: 25, zazazo: 1,
      hint: '相手レンジ：両極化（ナッツorブラフ）',
      rico: 'いいねー。<u>リバーオーバーベットは「両極化」</u>っていう上級概念。自分の手の強さで判断するの',
    },
    onFail: {
      panyu: -15,
      mimi: '極端な額に振り回されちゃった……',
      rico: 'リバーのオーバーは <u>強いか嘘か</u>のどっちか。ボード次第・手次第で読むのよ',
    },
  },
  velvet_eye_contact: {
    id: 'velvet_eye_contact',
    situationFn: (state) => `ヴェルベットが手札を見ずに、ミミの目だけを見つめている。`,
    speech: 'ふふ……あなたの目、答えを教えてくれるわ。',
    zazazoHint: 'ゾゾゾ反応：相手が自分の手札に興味なさそう',
    choices: [
      { id: 'reverse_psych',  text: '視線で揺さぶる典型。手札と関係ない演技、ボードで冷静に判断', correct: true },
      { id: 'mind_read',      text: 'ヴェルベットには本当に心が読めている、降りる',           correct: false },
      { id: 'must_strong',    text: '手札を見ない＝相当強い、降りる',                       correct: false },
    ],
    onSuccess: {
      panyu: 25, zazazo: 1,
      hint: '相手レンジ：通常通り（揺さぶりだけ）',
      rico: 'いいねー。<u>目で揺さぶるのはヴェルベットの十八番</u>。動じない強さ、覚えた？',
    },
    onFail: {
      panyu: -15,
      mimi: '目を逸らせなかった……',
      rico: '<u>視線は情報じゃなく演技</u>。ボードと手札だけ見ればいいの',
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
// ピンチ演出（心音）のインターバルID。
// state は state = defaultState() で丸ごと差し替えられる箇所が複数あるため、
// state 側のプロパティにしか保持しないと差し替え時にタイマーが孤立して鳴り続ける
// 「ゾンビタイマー」になる。state を跨いで確実に止められるようモジュール変数で持つ。
let __dangerTimer = null;
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
    zazazoMax: 3, // ミミミゲージ：3連勝で相手の性格を読み切る
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
    case 'title':       renderTemplate('tpl-title'); applyTitleButtons(); if (isBgmOn()) playSceneBgm('title'); break;
    case 'lobby':       renderTemplate('tpl-lobby'); applyBindings(); tryStartLobbyBgm(); break;
    case 'battle':      renderTemplate('tpl-battle'); applyBindings(); applyBattleRicoOutfit(); applyNoteTellHint(); setMimiExpression(state.mimiExpr || 'default'); if (state.introHandMode) applyIntroHandUI();
      // v2 拍④「決断」：ミミの手番は卓と相手を落として札と選択肢に視線を集める
      { const scr = document.querySelector('.battle-screen.v2'); if (scr) scr.classList.toggle('is-deciding', !!(state.isPlayerTurn && state.handPhase !== 'idle' && state.handPhase !== 'showdown' && !state.psychPending)); }
      break;
    case 'result':      renderTemplate('tpl-result'); applyBindings(); break;
    case 'shop':        renderTemplate('tpl-shop'); applyBindings(); bindShop(); break;
    case 'ending':      renderTemplate('tpl-ending'); stopSceneBgm(); _stopNonSceneBgm(); showEndingMusicPrompt(); break;
  }
  bindActions();
  injectAudioBars();
  // ピンチ演出：battle 以外の画面（case 'battle' 以外・switch に該当が無い場合も含む）では必ず解除する
  updateDangerState();
  // ロビー専用モーダル（ログインボーナス）が他画面に残らないよう掃除
  if (state.screen !== 'lobby') document.querySelectorAll('.login-bonus-overlay').forEach(e => e.remove());
}

function renderTemplate(id) {
  const tpl = document.getElementById(id);
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));
}

//=============================================================
// 7.1 ピンチ演出（チップ危機）状態管理
// バトル中、プレイヤーのチップが対戦開始時の30%以下（かつ0より大きい）になったら
// 「ピンチ状態」として画面に赤いビネット＋心音、瀕死ラインを割った瞬間にミミの表情変化を出す。
// チップ計算・勝敗・AIロジックには一切触れない、演出のみの機能。
//=============================================================
function battleInitialChips() {
  if (state && typeof state.__initialChips === 'number' && state.__initialChips > 0) return state.__initialChips;
  const opp = state && OPPONENTS[state.opponentId];
  return (opp && opp.chips) || 1000;
}

function stopDangerHeartbeat() {
  if (__dangerTimer) { clearInterval(__dangerTimer); __dangerTimer = null; }
}

function startDangerHeartbeat() {
  if (__dangerTimer) return; // 既に鳴動中なら二重起動しない
  const beat = () => {
    if (!isSfxOn()) return; // 消音時は鳴らさない（毎拍チェック＝設定変更に即追従）
    mpTone(55, 0.12, 'sine', 0.09);
    mpTone(50, 0.10, 'sine', 0.07, 0.005, 0.06, 180);
  };
  beat();
  __dangerTimer = setInterval(beat, 1100);
}

function updateDangerState() {
  const isDanger = !!(state && state.screen === 'battle' && !state.introHandMode && !state.tutorialMode
    && state.playerChips > 0 && state.playerChips <= battleInitialChips() * 0.3);
  const wasDanger = document.body.classList.contains('is-danger');
  if (isDanger) {
    document.body.classList.add('is-danger');
    startDangerHeartbeat();
    if (!wasDanger) {
      // 非danger → danger に切り替わった瞬間だけ演出（表情・心の声）
      setMimiExpression('shock');
      state.mimiThought = '「チップが……！　ここからが勝負……！」';
    }
  } else {
    document.body.classList.remove('is-danger');
    stopDangerHeartbeat();
  }
}

/* ===== ゲーム紹介モーダル（タイトルから） ===== */
function showAboutModal() {
  const overlay = document.createElement('div');
  overlay.className = 'memory-viewer-overlay';
  overlay.innerHTML = `
    <div class="memory-viewer">
      <button class="memory-viewer-close" title="閉じる">×</button>
      <div class="memory-viewer-title">📖 ミミのテキサスホールデムポーカー について</div>
      <div class="memory-viewer-body">
        <p style="font-size:16px; text-align:center; color:var(--c-gold-bright); margin-bottom:16px;">
          夜霧のカジノ、伝説の闘札。<br>直感の少女が、絶対王者に挑む。
        </p>
        <h4>🎴 ジャンル</h4>
        <p>本格テキサスホールデムを土台にした、心理戦ポーカー・ノベルゲーム。</p>
        <h4>💭 戦闘システム</h4>
        <p>札の強さだけでは勝てない。相手のセリフから「本心」を読む心理バトル、ポットオッズ・アウツを計算する論理バトル、直感を発動する「ぱにゅぱにゅ」の三本柱で勝負。</p>
        <h4>📓 初心者にも安心</h4>
        <p>リコ先輩による全8章24問の講義モード搭載。ポーカー未経験でも、用語集・ハンズオン演習で段階的に強くなれる。</p>
        <h4>🛍 やり込み要素</h4>
        <p>56種の交換所アイテム（衣装10着・カード裏・テーブル・寸劇・ボイス集）、28種のトロフィー、過去20ハンドの振り返り、裏モード解放。</p>
        <h4>📱 動作環境</h4>
        <p>ブラウザだけで遊べる。インストール不要、無料。PC・スマホ横向き両対応。</p>
        <h4>⏱ プレイ時間</h4>
        <p>1勝あたり約3分。全クリアまで30〜60分。やり込めば数時間。</p>
        <h4>🎯 こんな人におすすめ</h4>
        <ul>
          <li>ポーカーを始めてみたいけど、ルールがよく分からない</li>
          <li>キャラクターと駆け引きする心理戦が好き</li>
          <li>短時間で1本クリアできる骨太なゲームを探している</li>
          <li>可愛いキャラと毒のあるストーリーが好き</li>
        </ul>
        <p style="text-align:center; margin-top:20px; opacity:0.7; font-size:13px;">
          — リコ先輩より「ふぅん、いいわよ。やってみなさい」
        </p>
      </div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelector('.memory-viewer-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

/* ===== ゲームシェア ===== */
function shareGame() {
  const url = 'https://takakazuaikawa-hue.github.io/tousatsu-mimi/';
  const title = 'ミミのテキサスホールデムポーカー';
  const text = '夜霧のカジノで本格心理戦ポーカー。ブラウザで無料で遊べる！';
  // Web Share API 優先（スマホ）
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
    return;
  }
  // フォールバック：URLコピー＋Twitter共有窓
  const shareText = `${text}\n${url}`;
  // クリップボードにコピー
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      toast('📋 URLをコピーしました');
    }).catch(() => {});
  }
  // Twitter共有ウィンドウ
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=ミミのテキサスホールデムポーカー`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');
}

function applyTitleButtons() {
  const el = document.querySelector('[data-bind="titleButtons"]');
  if (!el) return;
  const hasSave = save.clearedStages.length > 0 || save.coins > 0;
  if (hasSave) {
    const cleared = save.clearedStages.filter(s => s !== 'rico_tutorial').length;
    const totalStages = 4; // polka, selina, grano, velvet
    const ending = isEndingUnlocked();
    el.innerHTML = `
      <button class="btn btn-primary" data-action="start">
        <span class="title-btn-main">続きから</span>
        <span class="title-btn-sub">${ending ? '✦ クリア後の世界へ ✦' : `Stage ${cleared + 1} / ${totalStages}`}</span>
      </button>
      <button class="btn btn-ghost" data-action="new-game">新しく始める</button>
      <div class="title-save-info">
        🏆 クリア ${cleared}/${totalStages} ｜ 💰 ${save.coins}コイン ｜ 🎁 ${(save.ownedItems||[]).length}個所持${ending ? ' ｜ ✨ ENDING' : ''}
      </div>
    `;
  } else {
    el.innerHTML = `
      <button class="btn btn-primary" data-action="start">
        <span class="title-btn-main">はじめから</span>
        <span class="title-btn-sub">FREE · ブラウザで遊べる</span>
      </button>
    `;
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
      case 'opponentNameShort': {
        // 短縮表記（4文字以内、長ければ省略）
        const n = state.opponentName || '相手';
        el.textContent = n.length > 4 ? n.slice(0, 3) + '…' : n;
        break;
      }
      case 'opponentChips': el.textContent = state.opponentChips; break;
      case 'playerChips': el.textContent = state.playerChips; break;
      case 'playerChipsDetailed': {
        // 「残り 850（-150）」形式
        const bet = state.currentBetPlayer || 0;
        el.innerHTML = bet > 0
          ? `${state.playerChips}<span class="cp-delta">−${bet}</span>`
          : `${state.playerChips}`;
        break;
      }
      case 'opponentChipsDetailed': {
        const bet = state.currentBetOpponent || 0;
        el.innerHTML = bet > 0
          ? `${state.opponentChips}<span class="cp-delta">−${bet}</span>`
          : `${state.opponentChips}`;
        break;
      }
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
      case 'panyuBall': {
        // 旧：円形ゲージ。新マーク版に置換済みのため何もしない（古い要素が残った場合のフォールバック）
        const pct = Math.min(1, Math.max(0, state.panyu / state.panyuMax));
        const d = Math.round(6 + 48 * pct);
        el.style.width = `${d}px`; el.style.height = `${d}px`;
        break;
      }
      case 'panyuMark': {
        // 「○」一文字でぱにゅ表現。font-size と色で量を示す
        const pct = Math.min(1, Math.max(0, state.panyu / state.panyuMax));
        const minS = 12, maxS = 32;
        el.style.fontSize = `${Math.round(minS + (maxS - minS) * pct)}px`;
        el.classList.toggle('panyu-mark-full', pct >= 1);
        el.classList.toggle('panyu-mark-high', pct >= 0.7 && pct < 1);
        el.classList.toggle('panyu-mark-empty', pct === 0);
        el.textContent = pct >= 1 ? '●' : '○';
        break;
      }
      case 'betUnified': {
        el.innerHTML = renderBetUnified();
        break;
      }
      case 'streetTracker': el.innerHTML = renderStreetTracker(); break;
      case 'panyuPips': el.innerHTML = renderPanyuPips(); break;
      case 'panyuMood': el.textContent = panyuMood(state.panyu, state.panyuMax); break;
      case 'opponentChipBar': el.style.width = `${chipBarPct(state.opponentChips)}%`; break;
      case 'playerChipBar': el.style.width = `${chipBarPct(state.playerChips)}%`; break;
      case 'zazazoFill': {
        // 読み切り済みは0%（実質非表示）＋親に revealed クラス付与
        const pct = state.opponentPersonalityRevealed ? 0 : (state.zazazo / state.zazazoMax) * 100;
        el.style.width = `${pct}%`;
        const parent = el.closest('.zazazo-display');
        if (parent) parent.classList.toggle('revealed', !!state.opponentPersonalityRevealed);
        break;
      }
      case 'zazazoText': {
        el.textContent = state.opponentPersonalityRevealed ? '— 読み切り完了 —' : zazazoLabel(state.zazazo);
        break;
      }
      case 'opponentPersonality': {
        // 枠は常時固定で表示し、中身を切替（レイアウトずれ防止）
        if (!state.opponentId) {
          if (el.dataset.state !== 'empty') {
            el.innerHTML = '';
            el.dataset.state = 'empty';
          }
          break;
        }
        // 状態キー：opponentId + 読み切り済か + ミミミ0か否か。同じなら再描画しない（アニメちらつき防止）
        const zazazoNow = state.zazazo || 0;
        const stateKey = `${state.opponentId}:${state.opponentPersonalityRevealed ? 'r' : (zazazoNow > 0 ? 'u' : 'u0')}`;
        if (el.dataset.state === stateKey) break;
        el.dataset.state = stateKey;
        if (state.opponentPersonalityRevealed) {
          const p = getOpponentPersonality(state.opponentId);
          el.innerHTML = `
            <div class="opp-personality-card opp-p-revealed">
              <div class="opp-p-title">${p.icon} ${p.title}</div>
              <ul class="opp-p-traits">
                ${p.traits.map(t => `<li>${t}</li>`).join('')}
              </ul>
              <div class="opp-p-exploit"><b>攻略：</b> ${p.exploit}</div>
            </div>
          `;
        } else if (zazazoNow <= 0) {
          // P3: ミミミゲージ0（講義前の初心者）は情報過多を避けて1行に折りたたむ
          el.innerHTML = `
            <div class="opp-personality-card opp-p-collapsed">
              <div class="opp-p-collapsed-line">👁 相手をよく観察しよう</div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="opp-personality-card opp-p-unrevealed">
              <div class="opp-p-title opp-p-title-mute">見た目・雰囲気</div>
              <div class="opp-p-appearance">${getOpponentAppearance(state.opponentId)}</div>
              <div class="opp-p-hint">ミミミ MAX で性格を読み切れる</div>
            </div>
          `;
        }
        break;
      }
      case 'mimiThought': el.textContent = state.mimiThought; break;
      case 'oppStackSide': el.innerHTML = renderStackOnTable('opponent'); break;
      case 'playerStackSide': el.innerHTML = renderStackOnTable('player'); break;
      case 'situationAnalysis': {
        el.innerHTML = renderSituationAnalysis();
        // 戦況内に追加した data-action ボタンに onAction をバインド
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        break;
      }
      case 'ricoAdvice': el.innerHTML = state.ricoAdvice; break;
      case 'opponentSpeech': {
        if (state.opponentThinking) {
          el.innerHTML = `<span class="think-dots" aria-label="考え中"><i></i><i></i><i></i></span>`;
          el.classList.add('is-thinking');
          break;
        }
        el.classList.remove('is-thinking');
        el.textContent = state.opponentSpeech;
        el.classList.toggle('speech-long', (state.opponentSpeech || '').length > 18);
        if (state.opponentSpeech && state.opponentSpeech !== state.__lastSpeechShown) {
          el.classList.remove('speech-pop');
          void el.offsetWidth; // reflow でアニメを再起動
          el.classList.add('speech-pop');
        }
        state.__lastSpeechShown = state.opponentSpeech;
        break;
      }
      case 'opponentBet': el.innerHTML = renderOpponentBet(); break;
      case 'currentHandName': el.innerHTML = renderCurrentHandName(); break;
      case 'currentHandKicker': el.innerHTML = renderCurrentHandKicker(); break;
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
      case 'communityCards': renderCardsInto(el, state.community, 5, 'community'); break;
      case 'playerHand': renderCardsInto(el, state.playerHand, 2, 'player'); break;
      case 'opponentHand': renderOpponentHand(el); break;
      case 'psychLog': renderPsychLog(el); break;
      case 'psychStats': el.innerHTML = renderPsychStats(); break;
      case 'actionArea': renderActionArea(el); break;
      case 'coins': el.textContent = state.coinsEarned || 0; break;
      case 'saveCoins': el.textContent = save.coins; break;
      case 'lobbyShopNewBadge': {
        const n = newItemCount();
        if (n > 0) { el.textContent = n; el.style.display = ''; }
        else       { el.style.display = 'none'; }
        break;
      }
      case 'stageList':
        el.innerHTML = renderStageList();
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        // チップスライダーをバインド
        el.querySelectorAll('[data-chip-slider]').forEach(sl => {
          sl.addEventListener('input', (e) => {
            const sid = e.target.dataset.chipSlider;
            const v = +e.target.value;
            if (!save.chipChoice) save.chipChoice = {};
            save.chipChoice[sid] = v;
            const disp = el.querySelector(`[data-chip-display="${sid}"]`);
            if (disp) disp.textContent = v;
            saveProgress();
          });
        });
        break;
      case 'lobbyRicoLine': el.textContent = lobbyRicoLine(); break;
      case 'lobbyStats': el.innerHTML = renderLobbyStats(); break;
      case 'lobbySettings': el.innerHTML = renderLobbySettings();
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        break;
      case 'lobbyBottomPanel':
        el.innerHTML = renderLobbyBottomPanel();
        el.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
        // BGM ボリュームスライダー
        const lbVolBgm = el.querySelector('[data-vol="bgm"]');
        if (lbVolBgm) lbVolBgm.addEventListener('input', (e) => {
          save.bgmVolume = +e.target.value;
          saveProgress();
          applyBgmVolume();
          document.querySelectorAll('.audio-bar-volume, [data-vol="bgm"]').forEach(v => v.value = save.bgmVolume);
        });
        // SFX ボリュームスライダー
        const lbVolSfx = el.querySelector('[data-vol="sfx"]');
        if (lbVolSfx) lbVolSfx.addEventListener('input', (e) => {
          save.sfxVolume = +e.target.value;
          saveProgress();
          // 入力中に確認音
          mpSfx('tap');
        });
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
      case 'lobbyRicoOutfit': {
        const cur = pickLobbyRico();
        if (isRicoViewerUnlocked()) {
          el.textContent = cur.label;
          el.classList.remove('locked');
          el.title = 'リコ先輩を眺める';
        } else {
          el.innerHTML = UI_ICON.lock + ' 衣装ロック中';
          el.classList.add('locked');
          el.title = 'ヴェルベット撃破後に解放';
        }
        break;
      }
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
      // ===== v2 バトル画面（舞台演出レイアウト）用バインド =====
      case 'handNo2': el.textContent = String(state.handNo || 1).padStart(2, '0'); break;
      case 'handMax2': el.textContent = state.maxHands >= 999 ? '' : '/ ' + String(state.maxHands || 0).padStart(2, '0'); break;
      case 'streetList': el.innerHTML = renderStreetList(); break;
      case 'opponentNameLatin': el.textContent = opponentLatinName(); break;
      case 'potBlock': el.innerHTML = renderPotBlock(); break;
      case 'tellTags': el.innerHTML = renderTellTags(); break;
      case 'winrateSeal': el.innerHTML = renderWinrateSeal(); break;
      case 'dangerBar': el.innerHTML = renderDangerBar(); break;
      case 'opponentImg':
        el.onerror = function() { window.assetFallback(this, state.opponentImgKey); };
        el.src = `assets/characters/${state.opponentImgKey}_default.png`;
        // 現在の表情ムードがあれば再適用（render後も表情を維持）
        if (state.opponentExpr && state.opponentExpr !== 'default') {
          setTimeout(() => setOpponentExpression(state.opponentExpr), 0);
        }
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
// 幕間（インターミッション）
// 各ステージ「初回クリア」の勝利リザルト後に1画面はさむ、短い会話→ご褒美CG開放。
// speaker: 'rico' | 'mimi' | 相手ID。3〜5行、最後の1行で次の相手を予告する。
// cg: 会話後に開放される「ご褒美CG」の想定パス（無ければ assets/episodes/<相手ID>.png にフォールバック）。
//=============================================================
const INTERMISSIONS = {
  rico_tutorial: {
    lines: [
      { speaker: 'rico',  text: 'はい、講義おしまい。……ミミ、思ったよりちゃんと聞いてたじゃん' },
      { speaker: 'mimi',  text: '聞かないと即クビにされそうな圧を感じたので……いえ、ちゃんと面白かったです' },
      { speaker: 'rico',  text: '上出来。じゃ、次はいよいよ実戦。Stage2の卓に座ってもらうよ' },
      { speaker: 'rico',  text: '相手はポルカ。声がでかい時ほど手が弱いタイプだから、ビビらず耳を澄ませてね' },
      { speaker: 'mimi',  text: '（声がでかい人ほど弱いって、前の職場の上司と同じ理論だ……）よし、行ってきます！' },
    ],
    cg: 'assets/backgrounds/reward_cg_rico_tutorial.jpg',
  },
  polka: {
    lines: [
      { speaker: 'polka', text: 'うわー、新人に負けるとはなー……でも今日のミミちゃん、ちゃんとボクの指先見てたでしょ' },
      { speaker: 'mimi',  text: '正直かなり分かりやすかったです……あ、責めてるわけじゃなくて！' },
      { speaker: 'rico',  text: 'ふふ、初勝利おめでとう。でも、これで満足しないでよね？' },
      { speaker: 'rico',  text: '次はセリナ。声も態度も崩さない、理屈で殴ってくるタイプ。ベット額の"意味"に耳を澄ませな' },
      { speaker: 'mimi',  text: '声がでかい人の次は静かな人……次から次へと、個性豊かな職場です' },
    ],
    cg: 'assets/backgrounds/reward_cg_polka.jpg',
  },
  selina: {
    lines: [
      { speaker: 'selina', text: '……お見事です。ボードの危険度、あの短時間でよく仕上げましたね' },
      { speaker: 'mimi',   text: 'セリナさんが理由をちゃんと説明してくれたので……それ、褒めてくれてますよね？' },
      { speaker: 'rico',   text: 'うんうん、成長したね。場の危なさが分かるようになったのは大きいよ' },
      { speaker: 'rico',   text: '次はグラーノ。商人気質で、何でも値段で誘ってくる。安く見えても払う価値があるかは自分で計算するんだよ' },
      { speaker: 'mimi',   text: '計算……ポットオッズ……電卓は無いけど、頭の中にはあります、多分' },
    ],
    cg: 'assets/backgrounds/reward_cg_selina.jpg',
  },
  grano: {
    lines: [
      { speaker: 'grano', text: 'いや実に見事な商談でした、お嬢さん。今回は私の負け……そういうことにしておきましょう' },
      { speaker: 'mimi',  text: '「安いですよ」攻撃、途中から怖くなってきました……でも計算したら見合ってなかったので、勝ちです！' },
      { speaker: 'rico',  text: 'その調子。……ミミ、次でいよいよ最後の卓だよ' },
      { speaker: 'rico',  text: 'VIPルームのヴェルベット。言葉と圧で先に心を折りにくるタイプ。でも、あんたはもう全部の武器を持ってる' },
      { speaker: 'mimi',  text: '（ブラフも、場札も、ポットオッズも……ここまで来たら、あとは根性です）……行きます、リコ先輩' },
    ],
    cg: 'assets/backgrounds/reward_cg_grano.jpg',
  },
  velvet: {
    // ※ヴェルベット撃破時は既存の「エンディングへ」動線を最優先するため、
    //   通常フロー（endBattle）からは呼ばれない。コレクション表示・将来の拡張用にデータのみ保持。
    lines: [
      { speaker: 'velvet', text: '……ふふ、まさか新人に膝をつかされるなんてね。今夜は返り討ちに遭う夜みたい' },
      { speaker: 'mimi',   text: 'ヴェルベットさんの圧、最後まで怖かったです……勝てたの、正直まだ信じられません' },
      { speaker: 'rico',   text: 'よく頑張ったね、ミミ。……本当に、ここまでよく来た' },
      { speaker: 'rico',   text: 'このあとはご褒美の時間。今日までの全部、ちゃんと見てたから' },
      { speaker: 'mimi',   text: '（社畜だった頃には想像もしてなかった夜だ……）リコ先輩、ありがとうございます' },
    ],
    cg: 'assets/backgrounds/reward_cg_velvet.jpg',
  },
};

// 幕間画面を表示する。render() は使わず #stage に overlay を直接 append/remove する
// （showEpisodeTitle と同じ作法）。背景・立ち絵・CG はすべて生成中の前提で onerror フォールバック必須。
function showIntermission(opponentId, onDone) {
  const data = INTERMISSIONS[opponentId];
  if (!data || !data.lines || !data.lines.length) { if (onDone) onDone(); return; }
  const opp = OPPONENTS[opponentId] || {};
  const oppImgKey = opp.imgKey || opponentId;
  const oppName = opp.name || '相手';

  const overlay = document.createElement('div');
  overlay.className = 'intermission-overlay';
  overlay.innerHTML = `
    <div class="ims-bg">
      <img class="ims-bg-img" alt=""
           src="assets/backgrounds/bg_intermission.jpg"
           onerror="this.onerror=null;this.src='assets/backgrounds/lobby.png';">
    </div>
    <div class="ims-stage">
      <div class="ims-char ims-char-mimi character-frame" data-ims-side="mimi">
        <img alt="ミミ" src="assets/characters/mimi_intermission.webp"
             onerror="this.onerror=null;this.src='assets/characters/mimi_default.png';">
      </div>
      <div class="ims-char ims-char-opp character-frame" data-ims-side="opp">
        <img alt="${oppName}" src="assets/characters/${oppImgKey}_default.png"
             onerror="window.assetFallback(this,'${oppImgKey}')">
      </div>
    </div>
    <button type="button" class="ims-skip-btn">スキップ ▶▶</button>
    <div class="ims-dialogue">
      <div class="ims-dlg-face"><img alt=""></div>
      <div class="ims-dlg-body">
        <div class="ims-dlg-name"></div>
        <div class="ims-dlg-text"></div>
      </div>
      <div class="ims-dlg-next">▼</div>
    </div>
    <div class="ims-cg" hidden>
      <img class="ims-cg-img" alt="">
      <div class="ims-cg-fallback">
        <div class="ims-cg-fallback-name">${oppName}</div>
        <div class="ims-cg-fallback-label">ご褒美CG 開放！</div>
      </div>
      <div class="ims-cg-hint">タップして進む</div>
    </div>
  `;
  const stage = document.getElementById('stage');
  (stage || document.body).appendChild(overlay);

  const mimiChar = overlay.querySelector('.ims-char-mimi');
  const oppChar = overlay.querySelector('.ims-char-opp');
  const dialogueBox = overlay.querySelector('.ims-dialogue');
  const dlgFaceImg = overlay.querySelector('.ims-dlg-face img');
  const dlgName = overlay.querySelector('.ims-dlg-name');
  const dlgText = overlay.querySelector('.ims-dlg-text');
  const skipBtn = overlay.querySelector('.ims-skip-btn');
  const cgLayer = overlay.querySelector('.ims-cg');
  const cgImg = overlay.querySelector('.ims-cg-img');

  let idx = 0;
  let phase = 'dialogue'; // 'dialogue' | 'cg'

  function speakerMeta(speaker) {
    if (speaker === 'mimi') return { name: 'ミミ', img: 'assets/characters/mimi_default.png', side: 'mimi' };
    if (speaker === 'rico') return { name: 'リコ先輩', img: 'assets/characters/rico_default.png', side: 'rico' };
    const o = OPPONENTS[speaker];
    const key = (o && o.imgKey) || speaker;
    return { name: o ? o.name : oppName, img: `assets/characters/${key}_default.png`, side: 'opp' };
  }

  function renderLine() {
    const line = data.lines[idx];
    if (!line) { showCg(); return; }
    const meta = speakerMeta(line.speaker);
    dlgName.textContent = meta.name;
    dlgText.textContent = line.text;
    dlgFaceImg.onerror = () => { dlgFaceImg.onerror = null; dlgFaceImg.src = 'assets/characters/mimi_default.png'; };
    dlgFaceImg.src = meta.img;
    dialogueBox.classList.remove('ims-speaker-mimi', 'ims-speaker-rico', 'ims-speaker-opp');
    dialogueBox.classList.add('ims-speaker-' + meta.side);
    mimiChar.classList.toggle('ims-active', meta.side === 'mimi');
    oppChar.classList.toggle('ims-active', meta.side === 'opp');
  }

  function advance() {
    idx++;
    if (idx >= data.lines.length) { showCg(); return; }
    renderLine();
  }

  function showCg() {
    if (phase === 'cg') return;
    phase = 'cg';
    dialogueBox.classList.add('ims-hide');
    skipBtn.classList.add('ims-hide');
    // ご褒美CG開放記録（コレクションの「ご褒美CG」で閲覧できるようになる）
    if (!Array.isArray(save.rewardCgSeen)) save.rewardCgSeen = [];
    if (!save.rewardCgSeen.includes(opponentId)) {
      save.rewardCgSeen.push(opponentId);
      saveProgress();
    }
    const cgPath = data.cg || `assets/backgrounds/reward_cg_${opponentId}.jpg`;
    cgImg.onerror = () => {
      cgImg.onerror = () => { cgImg.onerror = null; cgImg.style.display = 'none'; cgLayer.classList.add('ims-cg-noimg'); };
      cgImg.src = `assets/episodes/${opponentId}.png`;
    };
    cgImg.src = cgPath;
    cgLayer.hidden = false;
    requestAnimationFrame(() => cgLayer.classList.add('show'));
  }

  function finish() {
    overlay.classList.add('out');
    setTimeout(() => { overlay.remove(); if (onDone) onDone(); }, 400);
  }

  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); showCg(); });
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('.ims-skip-btn')) return;
    if (phase === 'cg') { finish(); } else { advance(); }
  });

  renderLine();
}

// コレクションの「ご褒美CG」サムネイルから開く全画面ビューア。タップで閉じる。
function showRewardCgViewer(id) {
  const opp = OPPONENTS[id] || {};
  const overlay = document.createElement('div');
  overlay.className = 'reward-cg-viewer-overlay';
  overlay.innerHTML = `
    <div class="reward-cg-viewer-body">
      <img class="reward-cg-viewer-img" alt="${opp.name || ''}"
           src="assets/backgrounds/reward_cg_${id}.jpg"
           onerror="this.onerror=function(){this.onerror=null;this.style.display='none';this.closest('.reward-cg-viewer-body').classList.add('noimg');};this.src='assets/episodes/${id}.png';">
      <div class="reward-cg-viewer-hint">タップして閉じる</div>
    </div>
  `;
  const stage = document.getElementById('stage');
  (stage || document.body).appendChild(overlay);
  overlay.addEventListener('click', () => overlay.remove());
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

// UI アイコン：絵文字を使わず線画SVGで統一（16pxグリッド・currentColor で色が乗る）
const _svg = (d, extra) => `<svg class="ui-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const UI_ICON = {
  coin:   _svg('<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3.5"></circle>'),
  chip:   _svg('<circle cx="12" cy="12" r="8"></circle><path d="M12 4v3M12 17v3M4 12h3M17 12h3"></path>'),
  check:  _svg('<path d="M4 12.5l5 5L20 6.5"></path>'),
  skip:   _svg('<path d="M5 5l8 7-8 7z"></path><path d="M18 5v14"></path>'),
  bolt:   _svg('<path d="M13 3L5 14h6l-1 7 8-11h-6z"></path>'),
  scroll: _svg('<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6z"></path><path d="M10 8h6M10 12h6"></path>'),
  lock:   _svg('<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>'),
  sound:  _svg('<path d="M4 9h3l5-4v14l-5-4H4z"></path><path d="M16 9a4 4 0 0 1 0 6"></path>'),
  mute:   _svg('<path d="M4 9h3l5-4v14l-5-4H4z"></path><path d="M16 9l5 6M21 9l-5 6"></path>'),
  bell:   _svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"></path><path d="M10 21h4"></path>'),
  bellOff:_svg('<path d="M6 16V11a6 6 0 0 1 9-5"></path><path d="M18 12v4l2 2H4"></path><path d="M4 4l16 16"></path>'),
  gear:   _svg('<circle cx="12" cy="12" r="3"></circle><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"></path>'),
};

function renderStageList() {
  // UI アイコン：絵文字は使わず線画SVGで統一する（16pxグリッド・currentColor）
  // 卓の扉：未クリア＆解放済みの最初の1枚＝次に挑む卓（金縁＋NEXT TABLE帯）
  const nextStageId = STAGE_ORDER.find(id => isStageUnlocked(id) && !save.clearedStages.includes(id));
  return STAGE_ORDER.map((sid, i) => {
    const opp = OPPONENTS[sid];
    const unlocked = isStageUnlocked(sid);
    const cleared = save.clearedStages.includes(sid);
    const bestRank = save.bestRanks[sid];
    const isNextDoor = sid === nextStageId;
    const doorNo = String(i).padStart(2, '0');
    // リコクリア後はモードチューザー、それ以外は通常バトル開始
    const isRicoClearChoice = (sid === 'rico_tutorial' && cleared);
    if (!unlocked) {
      const prevOpp = OPPONENTS[STAGE_ORDER[i - 1]];
      return `<div class="lobby-door lobby-door-locked ${opp.isBoss ? 'lobby-door-boss' : ''}">
        ${opp.isBoss ? '<div class="lobby-door-band lobby-door-band-boss">VIP ROOM</div>' : ''}
        <div class="lobby-door-no">${doorNo}</div>
        <div class="lobby-door-portrait">
          <img src="assets/characters/${opp.imgKey}_default.png" alt="???" onerror="window.assetFallback(this,'${opp.imgKey}')">
        </div>
        <div class="lobby-door-foot">
          <div class="lobby-door-name">???</div>
          <div class="lobby-door-tag">${prevOpp ? `${prevOpp.name}に勝つと解放` : '前のステージをクリアで解放'}</div>
          <div class="lobby-door-lock">${UI_ICON.lock} 施錠中</div>
        </div>
      </div>`;
    }
    // 初期チップ：保存値→デフォルト
    // リコ講義は対象外。クリア後のリコ（🔥本気モード）は2000ベース
    const isRicoLecture = (sid === 'rico_tutorial') && !cleared;
    const baseChips = (sid === 'rico_tutorial') ? 2000 : (opp.chips || 1000);
    const bonus = chipBonusTotal();
    const maxChips = baseChips + bonus;
    const savedChip = (save.chipChoice && save.chipChoice[sid]) || baseChips;
    const curChip = Math.max(baseChips, Math.min(maxChips, savedChip));
    const showSlider = !isRicoLecture && bonus > 0;
    const showChipRow = !isRicoLecture;
    // 報酬：未クリアなら初回報酬、クリア済なら再戦報酬を主表示
    const rewardLine = cleared
      ? `<div class="lobby-door-reward lobby-door-reward-rematch">再戦 ${rematchPreview(sid)}${UI_ICON.coin} <small>（初回済）</small></div>`
      : `<div class="lobby-door-reward">報酬 ${opp.rewardFirst}${UI_ICON.coin}</div>`;
    const mainAction = isRicoClearChoice ? 'rico-mode-chooser' : 'battle-start';
    const mainLabel = sid === 'rico_tutorial'
      ? (cleared ? '対戦／受講' : '受講する')
      : (cleared ? '再戦' : 'この卓につく');
    let band = '';
    if (opp.isBoss) band = '<div class="lobby-door-band lobby-door-band-boss">VIP ROOM</div>';
    else if (isNextDoor) band = '<div class="lobby-door-band lobby-door-band-next">NEXT TABLE</div>';
    return `<div class="lobby-door ${isNextDoor ? 'lobby-door-next' : ''} ${cleared ? 'lobby-door-cleared' : ''} ${opp.isBoss ? 'lobby-door-boss' : ''}">
      ${band}
      <div class="lobby-door-no">${doorNo}</div>
      ${cleared ? `<div class="lobby-door-clear" title="ベストランク">${UI_ICON.check} ${bestRank || ''}</div>` : ''}
      <div class="lobby-door-portrait" data-action="char-profile" data-char="${sid}" title="${opp.name}のプロフィールを見る">
        <img src="assets/characters/${opp.imgKey}_default.png" alt="${opp.name}" onerror="window.assetFallback(this,'${opp.imgKey}')">
        <span class="lobby-door-portrait-hint">プロフィール</span>
      </div>
      <div class="lobby-door-foot">
        <div class="lobby-door-name" data-action="${mainAction}" data-opponent="${sid}" title="${opp.name} ${isRicoClearChoice ? 'モード選択' : 'と対戦開始'}">${opp.name}</div>
        <div class="lobby-door-tag">${opp.theme}</div>
        ${rewardLine}
        ${!showChipRow ? '' : `<div class="lobby-door-chips">
          <span class="lobby-door-chips-label">${UI_ICON.chip}</span>
          <span class="lobby-door-chips-value" data-chip-display="${sid}">${curChip}</span>
          ${showSlider ? `<input class="lobby-door-chips-slider" type="range" min="${baseChips}" max="${maxChips}" step="100" value="${curChip}" data-chip-slider="${sid}">` : ''}
        </div>`}
        <div class="lobby-door-actions">
          <button class="lobby-door-cta" data-action="${mainAction}" data-opponent="${sid}"><span>${mainLabel}</span></button>
          ${(sid === 'rico_tutorial' && !cleared) ? `<button class="lobby-door-subbtn" data-action="rico-skip-tutorial" title="講義をスキップしていきなりリコ先輩と対戦">${UI_ICON.bolt}</button>` : ''}
          ${(sid !== 'rico_tutorial' && !cleared) ? `<button class="lobby-door-subbtn" data-action="skip-stage" data-opponent="${sid}" title="${skipStageCost(opp)}コインでスキップしてクリア扱い">${UI_ICON.skip}<b>${skipStageCost(opp)}</b></button>` : ''}
          ${cleared && EPISODES[sid] ? `<button class="lobby-door-subbtn" data-action="recall-episode" data-episode="${sid}" title="エピソードタイトル回想">${UI_ICON.scroll}</button>` : ''}
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

// 衣装ごとのトリビア（私生活／豆知識／戦術／こぼれ話）— 各カードは読みごたえ重視
const RICO_TRIVIA = {
  'rico_default.png': {
    title: '制服のリコ先輩',
    cards: [
      { tag: '私生活', text: 'ボタンの裏に♠を自分で彫った。新人時代の覚悟の印。' },
      { tag: '豆知識', text: 'AAでも勝率85%。「天井のない手なんてないの」。' },
      { tag: '戦術', text: 'ポジションは価値の半分。ボタンのレンジはUTGの3倍まで広げていい。' },
      { tag: 'こぼれ話', text: 'ロッカーには塩飴と推理小説3冊。冷めた頭を戻す道具。' },
    ],
  },
  'rico_pajama.png': {
    title: 'パジャマのリコ先輩',
    cards: [
      { tag: '私生活', text: '枕は3つ抱えて寝る。「四方が空いてると不安なのよ」。' },
      { tag: '豆知識', text: '5時間睡眠の翌日はブラフ頻度が無意識に約20%上がる。' },
      { tag: '戦術', text: '眠い日はポットコントロールに徹する。派手な仕掛けは寝てから。' },
      { tag: 'こぼれ話', text: '朝はホットミルクに蜂蜜とシナモン。冬はジンジャー追加。' },
    ],
  },
  'rico_bunny.png': {
    title: 'バニーのリコ先輩',
    cards: [
      { tag: '私生活', text: '耳は3種使い分け。本気の夜はサテン、客がなぜか緊張する。' },
      { tag: '豆知識', text: 'プロのシャッフルは15秒以内。リコは13秒台。' },
      { tag: '戦術', text: 'ディーラー斜め45度の席が最強。観察できて目立たない。' },
      { tag: 'こぼれ話', text: 'チップの音だけで額を当てる。誤差5枚以内、10年の耳。' },
    ],
  },
  'rico_casual.png': {
    title: '私服のリコ先輩',
    cards: [
      { tag: '私生活', text: '休日は古本屋3軒巡り。買うのは心理学とミステリーばかり。' },
      { tag: '豆知識', text: 'プレイヤーの85%が「自分は平均以上」と思っている。算数的に不可能。' },
      { tag: '戦術', text: '隣席の注文を予測する遊びが、卓での先読みを鍛える。' },
      { tag: 'こぼれ話', text: '行きつけのカフェでは無言でアールグレイが出てくる。' },
    ],
  },
  'rico_dress.png': {
    title: 'ドレスのリコ先輩',
    cards: [
      { tag: '私生活', text: '初給料で買った勝負服。半月分の家賃と同額。' },
      { tag: '豆知識', text: 'VIPはレート10倍でも、必要な技術はまったく同じ。' },
      { tag: '戦術', text: 'ハイレートで勝つのは鈍い人ではなく、感情を切り離せる人。' },
      { tag: 'こぼれ話', text: 'ヒールの中に祖母の硬貨。誰にも見せたことがない。' },
    ],
  },
  'rico_kimono.png': {
    title: '和装のリコ先輩',
    cards: [
      { tag: '私生活', text: '帯は自分で結ぶ。「1cmの締まりで立ち居振る舞いが変わる」。' },
      { tag: '豆知識', text: '日本にポーカーが来たのは明治初期、横浜から。最初は花札と混ざってた。' },
      { tag: '戦術', text: '袖が動作を隠す。和装は最強のポーカーフェイスかも。' },
      { tag: 'こぼれ話', text: '茶筅の音で集中スイッチ。茶碗は祖母譲りの金継ぎ。' },
    ],
  },
  'rico_swimsuit.png': {
    title: '水着のリコ先輩',
    cards: [
      { tag: '私生活', text: '泳ぎは平泳ぎ専門。「クロールはバレるじゃない」。何が？' },
      { tag: '豆知識', text: '夏のカジノは湿度30%以下。手汗で読まれる季節は逆に冬。' },
      { tag: '戦術', text: 'リゾート客はリスク許容度が2割上がる。オールインは本気で来てる。' },
      { tag: 'こぼれ話', text: '砂にチップ模様を描いて練習する。完全な職業病。' },
    ],
  },
  'rico_gym.png': {
    title: 'ジム服のリコ先輩',
    cards: [
      { tag: '私生活', text: '週3、4年継続。「下半身が安定すると表情も安定するの」。' },
      { tag: '豆知識', text: '3時間連続プレイで-EV判断が時速2〜3回増える。' },
      { tag: '戦術', text: '休憩で10秒だけ全力で背伸び。脳の霧が晴れる。' },
      { tag: 'こぼれ話', text: 'プロテインはバニラ一択。「結婚相手と同じ、無難で長く付き合える」。' },
    ],
  },
  'rico_school.png': {
    title: '学生風のリコ先輩',
    cards: [
      { tag: '私生活', text: '数学だけ得意。確率の問題を解く時間が一番好きだった。' },
      { tag: '豆知識', text: 'ポットオッズ：コール額 ÷ コール後のポット = 必要勝率。' },
      { tag: '戦術', text: '結局ポーカーは期待値ゲーム。感情を排した算数の延長。' },
      { tag: 'こぼれ話', text: '屋上で初めてカードを教わった。相手は「内緒」、今も年に一度卓を挟む。' },
    ],
  },
  'rico_witch.png': {
    title: '魔女のリコ先輩',
    cards: [
      { tag: '私生活', text: '仮装は1ヶ月前から準備。今年は「闇のカジノ女将」。' },
      { tag: '豆知識', text: 'アンカリング効果：最初のベット額が後の判断基準を歪める。' },
      { tag: '戦術', text: '小さく入れて中盤で爆発。相手のアンカーを操作する側に回る。' },
      { tag: 'こぼれ話', text: '黒猫の名は「フロップ」。雨の日に裏口で拾った家族。' },
    ],
  },
  'rico_santa.png': {
    title: 'サンタのリコ先輩',
    cards: [
      { tag: '私生活', text: '仕事納め後、一人でケーキ。「年に一度の贅沢」。3年連続予約の店。' },
      { tag: '豆知識', text: '年末は寄付付きトーナメントが多い。負けても気分はあったかい。' },
      { tag: '戦術', text: 'バブル局面：小スタックは極端にタイト化する。狙うのは中堅。' },
      { tag: 'こぼれ話', text: 'ラッピングが異常に上手い。同僚からの依頼殺到、報酬はお菓子。' },
    ],
  },
};

function pickLobbyRico() {
  // ★装備中の衣装が最優先。ショップの requires 判定（'polka'/'selina'/'grano'/'ending'）は
  //   購入時点で既に通過済みなので、装備さえされていればクリア状況に関わらず即反映してよい。
  //   （旧実装は「クリア前は常に制服固定」だったため、序盤で買える9着中8着が
  //    ヴェルベット撃破まで一切見えないバグになっていた）
  const equipped = save && save.equippedRicoOutfit;
  if (equipped && equipped !== 'default') {
    const found = RICO_OUTFITS.find(o => outfitIdFor(o.file) === equipped);
    if (found) {
      state.lobbyRicoIndex = RICO_OUTFITS.indexOf(found);
      return found;
    }
  }
  // クリア前・未装備なら「案内ポーズ」（ロビー専用の新規立ち絵）
  const cleared = save.clearedStages && save.clearedStages.includes('velvet');
  if (!cleared) {
    state.lobbyRicoIndex = 0;
    return { file: 'rico_greet.webp', label: '案内', lines: RICO_OUTFITS[0].lines };
    return RICO_OUTFITS[0];
  }
  // クリア後・未装備ならセッションごとにランダム着せ替え（お楽しみ要素）
  if (state.lobbyRicoIndex == null || state.lobbyRicoChangedAt !== state.screen) {
    state.lobbyRicoIndex = Math.floor(rand() * RICO_OUTFITS.length);
    state.lobbyRicoChangedAt = state.screen;
  }
  return RICO_OUTFITS[state.lobbyRicoIndex];
}
// note_tell：対戦相手の傾向（攻撃的/受け身/ブラフ多）を事前表示。
// 覗き見モード（デバッグ）の生の数値ログとは別物：定性的なタグのみ、購入者限定。
function applyNoteTellHint() {
  const container = document.querySelector('.opponent-info');
  if (!container) return;
  const old = container.querySelector('.note-tell-hint');
  if (old) old.remove();
  if (!save.unlockedNotes || !save.unlockedNotes.includes('tell')) return;
  if (!state.opponentProfile) return;
  const p = state.opponentProfile;
  const tags = [];
  if (p.aggression >= 0.7) tags.push('⚔ 攻撃的');
  else if (p.aggression <= 0.4) tags.push('🛡 受け身');
  if (p.bluffTendency >= 0.55) tags.push('🎭 ブラフ多め');
  else if (p.bluffTendency <= 0.3) tags.push('🎯 バリュー志向');
  if (p.foldDiscipline >= 0.7) tags.push('🧊 降りやすい');
  else if (p.foldDiscipline <= 0.35) tags.push('🔥 粘り強い');
  if (tags.length === 0) return;
  const hint = document.createElement('div');
  hint.className = 'note-tell-hint';
  hint.innerHTML = `<span class="ntt-label">📓 相手の傾向</span>${tags.map(t => `<span class="ntt-tag">${t}</span>`).join('')}`;
  container.appendChild(hint);
}
// バトル画面の左パネル（リコ助言役）にも装備中の衣装を反映
function applyBattleRicoOutfit() {
  const img = document.querySelector('.char-rico img');
  if (!img) return;
  const equipped = save && save.equippedRicoOutfit;
  const found = equipped && equipped !== 'default'
    ? RICO_OUTFITS.find(o => outfitIdFor(o.file) === equipped)
    : null;
  const file = found ? found.file : 'rico_default.png';
  if (!img.src.endsWith(file)) img.src = `assets/characters/${file}`;
}
// ファイル名 → 装備ID 変換（rico_kimono.png → 'kimono'）
function outfitIdFor(file) {
  return file.replace(/^rico_/, '').replace(/\.png$/, '');
}
function isRicoViewerUnlocked() {
  return save.clearedStages && save.clearedStages.includes('velvet');
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

// ロビー下部：音楽コントロール＋設定ボタン（設定はモーダル）
function renderLobbyBottomPanel() {
  const bgmOn = !!save.bgmOn;
  const sfxOn = !!save.sfxOn;
  const bgmVol = save.bgmVolume != null ? save.bgmVolume : 35;
  const sfxVol = save.sfxVolume != null ? save.sfxVolume : 60;
  const songLabel = bgmOn ? '♪ Lounge Jazz' : '♪ —（停止中）';
  return `
    <div class="lb-row lb-music-row">
      <button class="lb-bgm-toggle" data-action="toggle-bgm" title="BGM ON/OFF">${bgmOn ? UI_ICON.sound : UI_ICON.mute}</button>
      <input class="lb-vol" type="range" min="0" max="100" value="${bgmVol}" data-vol="bgm" title="BGM 音量">
      <button class="lb-settings-btn" data-action="open-settings" title="ゲーム設定">${UI_ICON.gear}</button>
    </div>
    <div class="lb-row lb-sfx-row">
      <button class="lb-sfx-toggle" data-action="toggle-sfx" title="SFX ON/OFF">${sfxOn ? UI_ICON.bell : UI_ICON.bellOff}</button>
      <input class="lb-vol lb-vol-sfx" type="range" min="0" max="100" value="${sfxVol}" data-vol="sfx" title="効果音 音量">
      <span class="lb-sfx-label">SFX</span>
    </div>
    <div class="lb-song-label">${songLabel}</div>
  `;
}

// 設定モーダル（タップしやすい大きいスイッチ）
function showSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  const psy = save.psychEnabled !== false;
  const log = save.logicEnabled !== false;
  overlay.innerHTML = `
    <div class="settings-modal">
      <div class="settings-modal-title">⚙ ゲーム設定</div>
      <div class="settings-modal-row">
        <span class="settings-modal-label">心理バトル</span>
        <button class="settings-modal-toggle ${psy ? 'on' : 'off'}" data-toggle="psych">
          <span class="stm-knob"></span>
          <span class="stm-status">${psy ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <div class="settings-modal-row">
        <span class="settings-modal-label">論理バトル</span>
        <button class="settings-modal-toggle ${log ? 'on' : 'off'}" data-toggle="logic">
          <span class="stm-knob"></span>
          <span class="stm-status">${log ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <div class="settings-modal-note">※チュートリアル（講義）モード中は<br>これらの設定を無視して常時ONになります</div>
      <div class="settings-modal-divider"></div>
      <div class="settings-modal-row">
        <span class="settings-modal-label">端末が消音でも音を出す</span>
        <button class="settings-modal-toggle ${save.forceSound ? 'on' : 'off'}" data-toggle="forcesound">
          <span class="stm-knob"></span>
          <span class="stm-status">${save.forceSound ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <div class="settings-modal-note">※OFF（既定）＝iPhoneの消音スイッチに従います<br>ONにすると消音中でも音が鳴ります</div>
      <div class="settings-modal-divider"></div>
      <button class="btn btn-secondary settings-modal-trophy" data-action="open-collection">🏆 トロフィー手帳を開く</button>
      <button class="btn btn-secondary settings-modal-trophy" data-action="open-glossary">📖 ポーカー辞典を開く</button>
      <button class="btn btn-secondary settings-modal-trophy" data-action="equip-change">👗 装備変更</button>
      ${(save.ownedItems || []).includes('memory_minipoker') ? `
        <button class="btn btn-secondary settings-modal-trophy" data-action="play-minipoker">🎴 ファイブポーカー</button>
      ` : ''}
      ${save.backdoorUnlocked ? `
        <div class="settings-modal-divider"></div>
        <div class="settings-modal-debug">
          <span class="settings-modal-debug-label">🔧 デバッグ：覗き見モード</span>
          <button class="settings-modal-toggle ${save.backdoorOn ? 'on' : 'off'}" data-toggle="backdoor">
            <span class="stm-knob"></span>
            <span class="stm-status">${save.backdoorOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      ` : ''}
      <div class="settings-modal-divider"></div>
      <button class="btn btn-danger settings-modal-reset" data-action="reset-save">
        ⚠ セーブデータをリセット
      </button>
      <button class="btn btn-primary settings-modal-close">閉じる</button>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', (e) => {
    overlay.remove(); // 設定を閉じてからトロフィー画面へ
    onAction(e);
  }));
  overlay.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.toggle;
      if (kind === 'psych') save.psychEnabled = !(save.psychEnabled !== false);
      else if (kind === 'logic') save.logicEnabled = !(save.logicEnabled !== false);
      else if (kind === 'backdoor') save.backdoorOn = !save.backdoorOn;
      else if (kind === 'forcesound') setForceSound(!save.forceSound); // 内部でsaveProgress+即反映
      saveProgress();
      let isOn;
      if (kind === 'psych') isOn = (save.psychEnabled !== false);
      else if (kind === 'logic') isOn = (save.logicEnabled !== false);
      else if (kind === 'forcesound') isOn = !!save.forceSound;
      else if (kind === 'backdoor') {
        isOn = !!save.backdoorOn;
        // バトル画面の覗き見パネル即座反映
        if (typeof updateBackdoorPanel === 'function') updateBackdoorPanel();
      }
      btn.classList.toggle('on', isOn);
      btn.classList.toggle('off', !isOn);
      btn.querySelector('.stm-status').textContent = isOn ? 'ON' : 'OFF';
    });
  });
  overlay.querySelector('.settings-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function renderLobbySettings() {
  const psy = save.psychEnabled !== false;
  const log = save.logicEnabled !== false;
  return `
    <div class="settings-title">⚙ 設定 <span class="settings-note-inline">※講義モードは設定を無視して常時ON</span></div>
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
  { id: 'note_pot_odds',       cat: 'note',  name: 'ポットオッズ入門',         price: 350, desc: 'コール判断時に「割に合う/合わない」目安を表示' },
  { id: 'skin_red_gold_card',  cat: 'skin',  name: '赤金カジノカード',         price: 300, desc: 'カード裏デザインを赤金カジノ風に変更' },
  { id: 'table_vip',           cat: 'skin',  name: 'VIPポーカーテーブル',     price: 500, desc: 'テーブル背景をVIP風に変更' },
  { id: 'memory_ending',       cat: 'memory', name: 'エンディング映像',        price: 500, desc: 'クリア後限定。あの感動のエンディングを何度でも視聴可能に', requires: 'ending' },
  { id: 'memory_ending_theme', cat: 'memory', name: '主題歌：ポーカーフェイスの終わり〜変な件〜', price: 400, desc: 'クリア後限定。エンディング主題歌を何度でも視聴可能に', requires: 'ending' },
  { id: 'chips_plus_500',  cat: 'stack', name: '初期チップ +500',  price: 400,  desc: '対戦開始時のチップ上限を双方+500まで選べる' },
  { id: 'chips_plus_1500', cat: 'stack', name: '初期チップ +1500', price: 1000, desc: 'さらに+1500（累積+2000）。長期戦に' },
  { id: 'chips_plus_3000', cat: 'stack', name: '初期チップ +3000', price: 2200, desc: 'さらに+3000（累積+5000）。腰を据えて' },
  { id: 'chips_plus_5000', cat: 'stack', name: '初期チップ +5000', price: 4500, desc: 'さらに+5000（累積+10000）。徹夜戦' },

  /* ===== 追加：ぱにゅ強化（中盤以降の差別化） ===== */
  { id: 'panyu_combo_x2',      cat: 'panyu', name: 'ぱにゅコンボ倍率',        price: 700,  desc: 'ぷにぷにミニゲームのCOMBOボーナス獲得コインが2倍に' },
  { id: 'panyu_sense_lv3',     cat: 'panyu', name: 'ぱにゅぱにゅLv3',         price: 1200, desc: '心理バトルのハズレ選択肢を2つグレーアウト（要Lv2）' },
  { id: 'panyu_range_lv3',     cat: 'panyu', name: 'ぱにゅレンジLv3',         price: 1400, desc: '相手のレンジ表示に「ブラフ確率」付き（要Lv2）' },
  { id: 'panyu_chrono',        cat: 'panyu', name: 'ぱにゅクロノ',             price: 1600, desc: '1バトルにつき1回、ぱにゅぱにゅをコイン消費せず追加発動できる' },
  { id: 'panyu_gauge_plus_50', cat: 'panyu', name: 'ぱにゅゲージ上限+50',      price: 2200, desc: 'ぱにゅゲージの最大値が120→170に（要上限+20）' },

  /* ===== 追加：戦術ノート ===== */
  { id: 'note_tell',           cat: 'note',  name: '相手の癖メモ',             price: 500,  desc: '対戦相手の傾向（攻撃的/受け身/ブラフ多）が事前に分かる' },
  { id: 'note_bankroll',       cat: 'note',  name: 'バンクロール管理',         price: 450,  desc: 'コイン獲得効率が+10%。ハンドリザルトにも収支表示' },

  /* ===== 追加：見た目（着替え・カード/テーブル/チップ・差分） ===== */
  /* リコ先輩の衣装（既存 RICO_OUTFITS のファイル名と一致するIDで管理） */
  { id: 'outfit_rico_pajama',   cat: 'skin',  name: '👗 リコ・パジャマ',     price: 600,  desc: 'リコ先輩の衣装：寝起き感のあるパジャマ姿。装備変更から着替え可能' },
  { id: 'outfit_rico_dress',    cat: 'skin',  name: '👗 リコ・ドレス',       price: 800,  desc: 'リコ先輩の衣装：VIPルーム仕様のドレス姿' },
  { id: 'outfit_rico_kimono',   cat: 'skin',  name: '👘 リコ・和装',         price: 1000, desc: 'リコ先輩の衣装：粋な和装。しっとりとした風情' },
  { id: 'outfit_rico_casual',   cat: 'skin',  name: '🛍 リコ・私服',         price: 700,  desc: 'リコ先輩の衣装：オフの日の私服姿' },
  { id: 'outfit_rico_school',   cat: 'skin',  name: '🎒 リコ・学生風',       price: 900,  desc: 'リコ先輩の衣装：先輩感のある学生風制服' },
  { id: 'outfit_rico_bunny',    cat: 'skin',  name: '🐰 リコ・バニー',       price: 1500, desc: 'リコ先輩の衣装：カジノクイーン仕様のバニーガール' },
  { id: 'outfit_rico_gym',      cat: 'skin',  name: '💪 リコ・ジム服',       price: 700,  desc: 'リコ先輩の衣装：鍛えてる最近のジム服' },
  { id: 'outfit_rico_swimsuit', cat: 'skin',  name: '🏖 リコ・水着',         price: 1500, desc: 'リコ先輩の衣装：夏限定の水着姿。クリア後解放', requires: 'ending' },
  { id: 'outfit_rico_witch',    cat: 'skin',  name: '🧙 リコ・魔女',         price: 1200, desc: 'リコ先輩の衣装：ハロウィン気分の魔女姿' },
  { id: 'outfit_rico_santa',    cat: 'skin',  name: '🎅 リコ・サンタ',       price: 1200, desc: 'リコ先輩の衣装：メリクリ仕様のサンタ姿' },
  /* カード裏 */
  { id: 'skin_blue_silver_card', cat: 'skin',  name: '🂠 蒼銀カード',          price: 400,  desc: 'カード裏：氷のように冷たい蒼銀デザイン' },
  { id: 'skin_obsidian_card',    cat: 'skin',  name: '🂠 漆黒カード',          price: 500,  desc: 'カード裏：闇に紋様が浮かぶ漆黒デザイン' },
  { id: 'skin_floral_card',      cat: 'skin',  name: '🂠 花鳥カード',          price: 450,  desc: 'カード裏：和の花鳥が舞う雅な意匠' },
  { id: 'skin_galaxy_card',      cat: 'skin',  name: '🂠 銀河カード',          price: 700,  desc: 'カード裏：星雲がうごめく宇宙意匠（要クリア）', requires: 'ending' },
  /* テーブル */
  { id: 'table_emerald',         cat: 'skin',  name: '🟢 エメラルド卓',        price: 600,  desc: 'テーブル：深いエメラルドグリーンの正統派' },
  { id: 'table_neon',            cat: 'skin',  name: '💜 ネオン卓',            price: 800,  desc: 'テーブル：ネオン光が走る近未来仕様' },
  { id: 'table_speakeasy',       cat: 'skin',  name: '🥃 スピークイージー卓',  price: 900,  desc: 'テーブル：20年代風の隠れバー。木目と真鍮' },
  /* チップ */
  { id: 'chip_skin_ivory',       cat: 'skin',  name: '🪙 アイボリーチップ',    price: 500,  desc: 'チップ意匠：象牙風の高級感' },
  { id: 'chip_skin_jade',        cat: 'skin',  name: '🪙 翡翠チップ',          price: 700,  desc: 'チップ意匠：翡翠細工のような艶やかさ' },
  { id: 'chip_skin_dragon',      cat: 'skin',  name: '🪙 龍紋チップ',          price: 1100, desc: 'チップ意匠：龍が巻き付いた重厚デザイン' },
  /* ミミ（ぱにゅ）の見た目 */
  { id: 'mimi_skin_pink',        cat: 'skin',  name: '🐰 ミミ・桃色',          price: 400,  desc: 'ぱにゅぱにゅミニゲームのミミが桃色に' },
  { id: 'mimi_skin_panda',       cat: 'skin',  name: '🐼 ミミ・パンダ柄',      price: 600,  desc: 'ぱにゅぱにゅミニゲームのミミがパンダ柄に' },
  { id: 'mimi_skin_gold',        cat: 'skin',  name: '🌟 ミミ・黄金',          price: 1500, desc: 'ぱにゅぱにゅミニゲームのミミが黄金色に。クリア後限定', requires: 'ending' },
  /* カットイン演出 */
  { id: 'cutin_classic',         cat: 'skin',  name: '✨ カットイン・古典派',  price: 700,  desc: '心理バトル発動時のカットインが集中線＆モノクロ調に' },
  { id: 'cutin_neon',            cat: 'skin',  name: '✨ カットイン・ネオン',  price: 700,  desc: '心理バトル発動時のカットインが派手なネオン光線に' },

  /* ===== 追加：チップ拡張 ===== */
  { id: 'chips_plus_10000',      cat: 'stack', name: '初期チップ +10000',      price: 8000, desc: 'さらに+10000（累積+20000）。VIPルーム仕様' },

  /* ===== 追加：メモリ（お楽しみ） ===== */
  { id: 'bgm_lobby_jazz',        cat: 'memory', name: '🎷 BGM「夜のジャズ」',   price: 350,  desc: 'ロビーBGMをしっとりジャズに切替可能' },
  { id: 'bgm_battle_tense',      cat: 'memory', name: '🎻 BGM「緊迫の弦楽」',  price: 350,  desc: 'バトルBGMを緊張感ある弦楽四重奏に' },
  { id: 'bgm_battle_techno',     cat: 'memory', name: '🎧 BGM「電脳テクノ」',  price: 500,  desc: 'バトルBGMをサイバーテクノに' },
  { id: 'se_pack_casino',        cat: 'memory', name: '🔔 SEパック「カジノ」', price: 400,  desc: 'チップ音・カード音をリアル寄りに変更' },
  { id: 'gallery_rico',          cat: 'memory', name: '🖼 リコ先輩設定資料',    price: 600,  desc: 'リコ先輩のキャラ設定画・没デザインを閲覧可能' },
  { id: 'gallery_opponents',     cat: 'memory', name: '🖼 対戦相手図鑑',        price: 800,  desc: '対戦したキャラの設定資料・口癖集を閲覧可能（撃破した者のみ）' },
  { id: 'gallery_mimi',          cat: 'memory', name: '🖼 ミミ百態',            price: 500,  desc: 'ぱにゅぱにゅミニゲームの全表情・全モーションを鑑賞可能' },
  { id: 'omake_drama_1',         cat: 'memory', name: '🎭 おまけ寸劇「初出勤」', price: 600,  desc: 'リコ先輩がカジノに初出勤した日の小話を視聴' },
  { id: 'omake_drama_2',         cat: 'memory', name: '🎭 おまけ寸劇「対決前夜」', price: 700, desc: 'ヴェルベット戦前夜のリコと主人公の小話。クリア後', requires: 'ending' },
  { id: 'omake_voice_pack',      cat: 'memory', name: '🎙 リコ先輩ボイス集',    price: 900,  desc: '勝利・敗北・煽り等のセリフ集を自由再生' },
  { id: 'omake_credit',          cat: 'memory', name: '📜 スタッフロール再生',  price: 200,  desc: 'スタッフクレジットをいつでも再生可能。クリア後', requires: 'ending' },
  { id: 'memory_minipoker',      cat: 'memory', name: '🎴 ミニキャラ・ファイブポーカー', price: 700, desc: 'ミミがミニキャラ仲間と5枚交換ポーカーで対戦！勝てばコインも稼げる、ふんわり楽しいミニゲーム' },
];

const SHOP_COMMENTS = {
  panyu_sense_lv2:     'ふむ、迷うお嬢さんにこそ、これ。ハズレを1枚お引きしますから、お買い得ですよ',
  panyu_range_lv2:     'レンジが見える品、と言いましょうか。次の一手の読みが冴える、中級者向けの逸品ですな',
  panyu_gauge_plus_20: '長くお遊びになるなら、上限拡張は必須。お買い得な投資です',
  note_pot_odds:       'ふふ、私の専門分野ですな。「安いか、高いか」が即座に見える品。私との商談で必要になりますよ',
  skin_red_gold_card:  '見た目重視のお嬢さんに。テーブルが華やぎますよ',
  table_vip:           'VIPのお客様気分でお楽しみいただける一品。気分転換にぜひ',
  memory_ending:       'これは特別な品ですよ。あの夜の決着を、何度でも振り返れる映像です',
  memory_ending_theme: 'あの夜を彩った主題歌……何度でも聴き返したくなる一曲ですよ',
  memory_minipoker:    'ふふ、息抜きの逸品。ちっこいキャラたちと5枚交換ポーカーですよ。勝てば小銭も付いてきます',
  chips_plus_500:  'チップが多いほうが、長く楽しめますからな。手始めに +500 はいかが？',
  chips_plus_1500: 'さらに+1500。腰を据えた読み合いができますよ',
  chips_plus_3000: '+3000ともなれば、本格的なロングゲーム。プロの卓ですな',
  chips_plus_5000: '+5000……ふふ、これはもう徹夜の準備が必要ですな',

  /* 追加：ぱにゅ強化 */
  panyu_combo_x2:      'コンボを繋ぐ快感、倍にしませんか？　ぷにぷにが止まらなくなりますよ',
  panyu_sense_lv3:     'Lv3、これはもう「ほぼ答え」が見える領域です。中級を超えたい方に',
  panyu_range_lv3:     'ブラフの匂いまで嗅ぎ分ける逸品。ヴェルベット様には……必要かもしれませんな',
  panyu_chrono:        'もう一度だけ「ぱにゅっ」と。1バトルに1度、無料で発動できる特権ですよ',
  panyu_gauge_plus_50: '上限170、もはや別格。長丁場の決戦で物を言いますよ',

  /* 追加：戦術ノート */
  note_tell:           '相手の癖を先に知る。これほど卑怯で、これほど合法な武器はありませんな',
  note_bankroll:       '稼ぐ者は管理する。コイン効率と収支管理、両方ついてお買い得',

  /* 追加：見た目（衣装） */
  outfit_rico_pajama:   '寝起きのリコさん。生活感のある一着、いかがです？',
  outfit_rico_dress:    'VIPルーム仕様のドレス。決める夜に必須ですな',
  outfit_rico_kimono:   '和装のリコさん。粋を解する方にこそ薦めたい一着ですよ',
  outfit_rico_casual:   'オフのリコさん。普段着でくつろぐ姿、貴重ですな',
  outfit_rico_school:   '学生風の制服姿。先輩感、いかがです？',
  outfit_rico_bunny:    'バニーガール。カジノの花、ここに極まれり',
  outfit_rico_gym:      'ジム服のリコさん。鍛えた姿、見惚れますよ',
  outfit_rico_swimsuit: '水着姿……いえ、私は何も申しません。ご自身でご確認を',
  outfit_rico_witch:    '魔女のリコさん。ハロウィン気分で一杯',
  outfit_rico_santa:    'サンタのリコさん。聖夜のサプライズ、いかがです？',
  /* カード裏 */
  skin_blue_silver_card: '蒼と銀。冷静を装いたい夜にどうぞ',
  skin_obsidian_card:    '漆黒の品格。プロの卓に紛れ込みたい時に',
  skin_floral_card:      '花鳥風月、和の意匠。雅な勝負を演出します',
  skin_galaxy_card:      '銀河を手札に。クリアされた方への特別な品ですよ',
  /* テーブル */
  table_emerald:         '正統派のエメラルド。これぞ「カジノ」という風格を',
  table_neon:            'ネオン光る卓。気分を一新したい夜に',
  table_speakeasy:       '禁酒法時代の隠れバー風。木目と真鍮、いかがです？',
  /* チップ */
  chip_skin_ivory:       '象牙の色合い、手触りは想像でお楽しみを',
  chip_skin_jade:        '翡翠の艶。卓上で映えますよ',
  chip_skin_dragon:      '龍紋の重み。財を引き寄せる縁起物、と言われております',
  /* ミミの見た目 */
  mimi_skin_pink:        'ミミちゃんも、たまには違う色を。桃色、可愛らしいでしょう？',
  mimi_skin_panda:       'パンダ柄のミミちゃん。意外性で笑いを誘いますな',
  mimi_skin_gold:        '黄金のミミちゃん。クリアされた方だけの特別仕様です',
  /* カットイン */
  cutin_classic:         '古典派の集中線。漫画の世界に飛び込んだ気分で',
  cutin_neon:            'ネオン光線のカットイン。派手好きな方にこそ',

  /* チップ拡張 */
  chips_plus_10000:      '+10000、もはやVIPルーム仕様。一晩中遊べる量ですな',

  /* メモリ（お楽しみ） */
  bgm_lobby_jazz:        '夜のジャズ。ロビーがしっとり大人の時間に変わります',
  bgm_battle_tense:      '緊迫の弦楽四重奏。手に汗握る読み合いの伴奏に',
  bgm_battle_techno:     '電脳テクノ。脳が冴える、と申しましょうか',
  se_pack_casino:        '本物のカジノの音。チップの転がる音まで再現されております',
  gallery_rico:          'リコさんの設定画……ファンには堪らぬ品ですよ。私からの内緒です',
  gallery_opponents:     '撃破された相手の図鑑。勝者の特権、というやつですな',
  gallery_mimi:          'ミミちゃんの全モーション集。何時間でも眺めていられますよ',
  omake_drama_1:         'リコさんがこの店に来た最初の日……短いお話、お楽しみあれ',
  omake_drama_2:         '決戦前夜の小話。これはクリアされた方にだけ、お聞かせできる品です',
  omake_voice_pack:      'リコさんのセリフ集。お好きな時に、お好きなだけ',
  omake_credit:          'スタッフロール、いつでも再生可能に。あの夜の余韻をもう一度',
};

/* ===== 購入品の効果適用 ===== */
// 各 itemId に対して save にフラグを書き込む。購入時と起動時（既購入の再適用）両方で呼ぶ
function applyItemEffect(itemId) {
  // ぱにゅ強化
  if (itemId === 'panyu_gauge_plus_20') save.panyuGaugeMax = Math.max(save.panyuGaugeMax || 100, 120);
  if (itemId === 'panyu_gauge_plus_50') save.panyuGaugeMax = Math.max(save.panyuGaugeMax || 100, 170);
  if (itemId === 'panyu_sense_lv2') save.panyuSkills.senseLevel = Math.max(save.panyuSkills.senseLevel || 1, 2);
  if (itemId === 'panyu_sense_lv3') save.panyuSkills.senseLevel = Math.max(save.panyuSkills.senseLevel || 1, 3);
  if (itemId === 'panyu_range_lv2') save.panyuSkills.rangeLevel = Math.max(save.panyuSkills.rangeLevel || 1, 2);
  if (itemId === 'panyu_range_lv3') save.panyuSkills.rangeLevel = Math.max(save.panyuSkills.rangeLevel || 1, 3);
  if (itemId === 'panyu_combo_x2') save.panyuComboMultiplier = 2;
  if (itemId === 'panyu_chrono') save.panyuChronoBonus = 1.5;
  // ノート
  if (itemId.startsWith('note_')) {
    const noteId = itemId.replace('note_', '');
    if (!save.unlockedNotes.includes(noteId)) save.unlockedNotes.push(noteId);
  }
  // 衣装（リコ）
  if (itemId.startsWith('outfit_rico_')) {
    save.equippedRicoOutfit = itemId.replace('outfit_rico_', '');
  }
  // カード裏
  if (itemId === 'skin_red_gold_card')    save.equippedCardSkin = 'red_gold';
  if (itemId === 'skin_blue_silver_card') save.equippedCardSkin = 'blue_silver';
  if (itemId === 'skin_obsidian_card')    save.equippedCardSkin = 'obsidian';
  if (itemId === 'skin_floral_card')      save.equippedCardSkin = 'floral';
  if (itemId === 'skin_galaxy_card')      save.equippedCardSkin = 'galaxy';
  // テーブル
  if (itemId === 'table_vip')        save.equippedTableSkin = 'vip';
  if (itemId === 'table_emerald')    save.equippedTableSkin = 'emerald';
  if (itemId === 'table_neon')       save.equippedTableSkin = 'neon';
  if (itemId === 'table_speakeasy')  save.equippedTableSkin = 'speakeasy';
  // チップ
  if (itemId === 'chip_skin_ivory')  save.equippedChipSkin = 'ivory';
  if (itemId === 'chip_skin_jade')   save.equippedChipSkin = 'jade';
  if (itemId === 'chip_skin_dragon') save.equippedChipSkin = 'dragon';
  // ミミ
  if (itemId === 'mimi_skin_pink')  save.equippedMimiSkin = 'pink';
  if (itemId === 'mimi_skin_panda') save.equippedMimiSkin = 'panda';
  if (itemId === 'mimi_skin_gold')  save.equippedMimiSkin = 'gold';
  // カットイン
  if (itemId === 'cutin_classic') save.equippedCutin = 'classic';
  if (itemId === 'cutin_neon')    save.equippedCutin = 'neon';
  // BGM/SE（購入即装備）
  if (itemId === 'bgm_lobby_jazz')    save.equippedBgmLobby = 'jazz';
  if (itemId === 'bgm_battle_tense')  save.equippedBgmBattle = 'tense';
  if (itemId === 'bgm_battle_techno') save.equippedBgmBattle = 'techno';
  if (itemId === 'se_pack_casino')    save.equippedSePack = 'casino';
  // 初期チップ加算
  const chipBonus = { chips_plus_500: 500, chips_plus_1500: 1500, chips_plus_3000: 3000, chips_plus_5000: 5000, chips_plus_10000: 10000 };
  if (chipBonus[itemId]) {
    save.extraInitialChips = (save.extraInitialChips || 0) + chipBonus[itemId];
  }
  // トロフィー手帳
}

// 装備中スキンを body の data 属性に反映（CSS 側で見た目を切替）
function applyEquippedStyles() {
  if (!save || typeof document === 'undefined') return;
  const b = document.body;
  if (!b) return;
  b.dataset.cardSkin   = save.equippedCardSkin   || 'default';
  b.dataset.tableSkin  = save.equippedTableSkin  || 'default';
  b.dataset.chipSkin   = save.equippedChipSkin   || 'default';
  b.dataset.mimiSkin   = save.equippedMimiSkin   || 'default';
  b.dataset.cutinSkin  = save.equippedCutin      || 'default';
  b.dataset.ricoOutfit = save.equippedRicoOutfit || 'default';
}

// 起動時：保有アイテムの効果をすべて再適用（セーブ復元用）
function reapplyAllOwnedEffects() {
  if (!save || !Array.isArray(save.ownedItems)) return;
  save.ownedItems.forEach(id => applyItemEffect(id));
  applyEquippedStyles();
}

/* ===== ショップ商品：段階開放マップ =====
   各商品の入荷条件。デフォルトは 'always'（最初から）。
   'polka' / 'selina' / 'grano' / 'velvet' = 各ステージ撃破で入荷。 */
const SHOP_UNLOCK = {
  // ── 最初から（基本商品のみ） ──
  panyu_sense_lv2:       'always',
  panyu_gauge_plus_20:   'always',
  note_pot_odds:         'always',
  chips_plus_500:        'always',
  outfit_rico_pajama:    'always',
  outfit_rico_casual:    'always',
  skin_blue_silver_card: 'always',

  // ── ポルカ撃破で入荷 ──
  panyu_combo_x2:        'polka',
  chips_plus_1500:       'polka',
  outfit_rico_dress:     'polka',
  table_emerald:         'polka',
  chip_skin_ivory:       'polka',
  mimi_skin_pink:        'polka',
  bgm_lobby_jazz:        'polka',

  // ── セリナ撃破で入荷 ──
  panyu_range_lv2:       'selina',
  note_tell:             'selina',
  chips_plus_3000:       'selina',
  outfit_rico_school:    'selina',
  outfit_rico_gym:       'selina',
  table_neon:            'selina',
  chip_skin_jade:        'selina',
  mimi_skin_panda:       'selina',
  skin_obsidian_card:    'selina',
  skin_floral_card:      'selina',
  skin_red_gold_card:    'selina',
  bgm_battle_tense:      'selina',
  se_pack_casino:        'selina',
  omake_drama_1:         'selina',
  memory_minipoker:      'selina',  // セリナ撃破で「ふんわり息抜き」枠を入荷

  // ── グラーノ撃破で入荷 ──
  panyu_chrono:          'grano',
  panyu_sense_lv3:       'grano',
  panyu_range_lv3:       'grano',
  note_bankroll:         'grano',
  chips_plus_5000:       'grano',
  outfit_rico_kimono:    'grano',
  outfit_rico_witch:     'grano',
  outfit_rico_santa:     'grano',
  outfit_rico_bunny:     'grano',
  table_vip:             'grano',
  table_speakeasy:       'grano',
  chip_skin_dragon:      'grano',
  cutin_classic:         'grano',
  cutin_neon:            'grano',
  bgm_battle_techno:     'grano',
  gallery_rico:          'grano',
  gallery_mimi:          'grano',
  omake_voice_pack:      'grano',

  // ── ヴェルベット撃破で入荷（既存 requires:'ending' と重複してOK） ──
  panyu_gauge_plus_50:   'velvet',
  chips_plus_10000:      'velvet',
  outfit_rico_swimsuit:  'velvet',
  mimi_skin_gold:        'velvet',
  skin_galaxy_card:      'velvet',
  memory_ending:         'velvet',
  memory_ending_theme:   'velvet',
  gallery_opponents:     'velvet',
  omake_drama_2:         'velvet',
  omake_credit:          'velvet',
};

// その商品がプレイヤーに見えるか
function isShopItemUnlocked(itemId) {
  const stage = SHOP_UNLOCK[itemId] || 'always';
  if (stage === 'always') return true;
  return save.clearedStages && save.clearedStages.includes(stage);
}
// 「新着」判定：解放済みかつ未閲覧
function isShopItemNew(itemId) {
  if (!isShopItemUnlocked(itemId)) return false;
  if (!save.shopSeenItems) save.shopSeenItems = [];
  return !save.shopSeenItems.includes(itemId);
}
// 新着件数（カテゴリ別）
function newItemCount(cat) {
  return SHOP_ITEMS.filter(i => (cat ? i.cat === cat : true) && isShopItemNew(i.id)).length;
}
// ショップ閲覧時に全表示分を「見た」と記録
function markShopItemsSeen() {
  if (!save.shopSeenItems) save.shopSeenItems = [];
  SHOP_ITEMS.forEach(i => {
    if (isShopItemUnlocked(i.id) && !save.shopSeenItems.includes(i.id)) {
      save.shopSeenItems.push(i.id);
    }
  });
  saveProgress();
}

// カテゴリごとの商品アイコン（絵文字は使わず inline SVG／線画・24pxグリッドで統一）
const SHOP_CAT_ICONS = {
  panyu:  '<path d="M8 3c-1 3-1 6 0 8"/><path d="M16 3c1 3 1 6 0 8"/><circle cx="12" cy="14" r="6"/><circle cx="9.6" cy="13.2" r=".7" fill="currentColor" stroke="none"/><circle cx="14.4" cy="13.2" r=".7" fill="currentColor" stroke="none"/><path d="M10 16.2c1 .8 3 .8 4 0"/>',
  note:   '<path d="M6 4.5h9.5A2 2 0 0 1 17.5 6.5V19.5H8.5A2 2 0 0 1 6.5 17.5V4.5z"/><path d="M9 9h6M9 13h6M9 17h3.5"/>',
  skin:   '<path d="M12 3a9 8 0 1 0 0 16c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14 13 15 13h2a4 4 0 0 0 4-4c0-3.3-4-6-9-6z"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="8.5" r="1" fill="currentColor" stroke="none"/>',
  stack:  '<ellipse cx="12" cy="18" rx="7" ry="2.3"/><ellipse cx="12" cy="14" rx="7" ry="2.3"/><ellipse cx="12" cy="10" rx="7" ry="2.3"/><path d="M5 10v8M19 10v8"/>',
  memory: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
};
function shopCatIconSvg(cat) {
  const path = SHOP_CAT_ICONS[cat] || SHOP_CAT_ICONS.memory;
  return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function renderShopItems(cat) {
  // 段階開放：未解放商品はそもそも表示しない
  const items = SHOP_ITEMS.filter(i => i.cat === cat && isShopItemUnlocked(i.id));
  if (items.length === 0) {
    return '<div class="shop-empty">このカテゴリの商品はまだ入荷していません。<br><small>対戦相手を撃破すると新商品が入荷します。</small></div>';
  }
  return items.map(i => {
    const owned = save.ownedItems.includes(i.id);
    const isNew = isShopItemNew(i.id);
    // requires: 解放条件（ending限定）— 既存ロジック維持
    let lockedReason = null;
    if (i.requires === 'ending' && !isEndingUnlocked()) lockedReason = '🔒 ヴェルベット撃破で解放';
    const canBuy = !owned && !lockedReason && save.coins >= i.price;
    // 視聴/再生系の購入後ボタン
    const playableId = (i.id === 'memory_ending') ? 'play-ending'
                      : (i.id === 'memory_ending_theme') ? 'play-ending-theme'
                      : (i.id === 'memory_minipoker') ? 'play-minipoker'
                      : null;
    return `<div class="shop-item ${owned ? 'owned' : ''} ${lockedReason ? 'locked' : ''} ${isNew ? 'is-new' : ''}" data-item="${i.id}">
      ${isNew ? '<span class="shop-item-newtag">NEW</span>' : ''}
      <div class="shop-item-icon shop-item-icon-${i.cat}">${shopCatIconSvg(i.cat)}</div>
      <div class="shop-item-body">
        <div class="shop-item-name">${i.name}</div>
        <div class="shop-item-desc">${i.desc}</div>
      </div>
      <div class="shop-item-footer">
        <span class="shop-item-price">${i.price}<small>コイン</small></span>
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
  // 演出は「再描画で壊れる前」に、購入直前の実DOM要素を掴んでおく
  const boughtItemEl = document.querySelector(`.shop-item[data-item="${itemId}"]`);
  save.coins -= item.price;
  save.ownedItems.push(itemId);
  // 効果適用
  applyItemEffect(itemId);
  applyEquippedStyles();
  saveProgress();
  // トーストは演出関数側（playShopBuyFx）で一本化して表示する（二重トーストの重なり防止）
  playShopBuyFx(boughtItemEl, item);
  // 再レンダリング
  const activeCat = document.querySelector('.shop-cat-btn.active')?.dataset.cat || 'panyu';
  const itemsEl = document.querySelector('[data-bind="shopItems"]');
  if (itemsEl) itemsEl.innerHTML = renderShopItems(activeCat);
  const coinsEl = document.querySelector('[data-bind="saveCoins"]');
  if (coinsEl) coinsEl.textContent = save.coins;
  bindActions();
  bindShopItems();
}

// 購入成功時の演出：①押した商品スラブが金色に発光して0.5秒だけ横回転
//                    ②コイン表示から商品スラブへチップが数枚飛ぶ（既存の flyChips を再利用）
//                    ③toast（呼び出し元で既に表示済み）／SEは mpSfx を再利用
// render() による再描画で商品スラブの実要素はすぐ入れ替わるため、
// 見た目用のクローンを document.body に重ねて自前アニメ→自前削除する（購入判定・所持品には一切触れない）
function playShopBuyFx(itemEl, item) {
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (typeof mpSfx === 'function') mpSfx('milestone');
  // ① コインがスラブへ飛ぶ（fromSel=コイン表示、toSel=商品スラブ要素）。3〜5枚程度に見えるよう固定値を渡す
  if (typeof flyChips === 'function') {
    const fromEl = document.querySelector('[data-bind="saveCoins"]');
    if (fromEl && itemEl) flyChips(fromEl, itemEl, reduceMotion ? 60 : 300);
  }
  // ② 押した商品スラブのクローンを重ねて金色発光＋一度だけ横回転（perspective 用に外側 wrap を用意）
  if (itemEl) {
    const rect = itemEl.getBoundingClientRect();
    if (rect.width && rect.height) {
      const wrap = document.createElement('div');
      wrap.className = 'shop-buy-fx-wrap';
      wrap.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
      const clone = itemEl.cloneNode(true);
      clone.removeAttribute('data-item');
      clone.className = 'shop-item shop-buy-fx-clone';
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => clone.classList.add(reduceMotion ? 'shop-buy-fx-spin-reduced' : 'shop-buy-fx-spin'));
      const life = reduceMotion ? 260 : 560;
      setTimeout(() => wrap.remove(), life);
    }
  }
  // ③ 小さなトースト（アイテム入手の告知。購入成功メッセージとは別に一言添える）
  if (typeof toast === 'function') toast(`${item.name} を手に入れた！`);
}

function pickLogicQuestion() {
  // 出題済みを避けて未出題から選ぶ
  const allLogicIds = [
    'logic_pot_odds_basic', 'logic_flush_outs', 'logic_hand_compare', 'logic_position',
    'logic_spr', 'logic_bluff_catcher', 'logic_implied_odds', 'logic_cbet_dry',
  ];
  const seen = new Set([...(state.seenQuestions || []), ...((save && save.recentQids) || [])]);
  // 状況にマッチする候補を計算
  const need = state.currentBetOpponent - state.currentBetPlayer;
  const potBefore = state.pot - need;
  const suits = state.community.map(c => c.suit);
  const suitCounts = {};
  suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
  const maxSuit = Math.max(...Object.values(suitCounts), 0);
  const sprValue = state.pot > 0 ? state.playerChips / state.pot : 99;
  const candidates = [];
  // 状況マッチング（具体的な計算ができる場面を優先）
  if (need > 0 && potBefore > 0) candidates.push('logic_pot_odds_basic');
  if (maxSuit >= 2 && state.playerHand[0]?.suit === state.playerHand[1]?.suit) candidates.push('logic_flush_outs');
  if (state.handPhase === 'flop') {
    candidates.push('logic_hand_compare');
    // logic_cbet_dry は実際にドライボード（フラッシュ気配なし＆ストレート気配なし＆ペアなし）の時のみ
    const danger = evaluateBoardDanger(state.community);
    if (!danger.flushAlert && !danger.straightAlert && !danger.pairBoard) {
      candidates.push('logic_cbet_dry');
    }
  }
  if (sprValue < 4) candidates.push('logic_spr');
  if (state.handPhase === 'river' && need > 0) candidates.push('logic_bluff_catcher');
  if (state.handPhase === 'flop' && state.handNo === 1) candidates.push('logic_implied_odds');
  candidates.push('logic_position');
  // 未出題優先
  const fresh = candidates.find(q => !seen.has(q));
  if (fresh) return fresh;
  // 全部出題済みなら全プールから未出題、なければランダム
  const allFresh = allLogicIds.find(q => !seen.has(q));
  return allFresh || pick(candidates);
}

function pickPsychQuestion() {
  // 対戦相手に応じて問題プールを切り替える＋出題済みは避ける
  const id = state.opponentId;
  // 今バトルの出題済み ＋ 過去バトルの直近出題（セーブ）を合わせて避ける
  const seen = new Set([...(state.seenQuestions || []), ...((save && save.recentQids) || [])]);
  // 履歴（直近の出題順、新しいほど後ろ）
  if (!state.psychHistory) state.psychHistory = [];
  // 出題済みを避けて選ぶ：未出題優先、無ければ「最も古く出した問題」を選ぶ
  const pickFresh = (pool) => {
    if (pool.length === 0) return null;
    const fresh = pool.filter(q => !seen.has(q));
    if (fresh.length > 0) return pick(fresh);
    // 全部出題済みなら、直近2問は避ける（連続を防止）
    const recent = state.psychHistory.slice(-2);
    const notRecent = pool.filter(q => !recent.includes(q));
    if (notRecent.length > 0) return pick(notRecent);
    // それでも選べない（プール≦2）なら、最も古い問題を選ぶ
    let oldest = pool[0];
    let oldestIdx = state.psychHistory.length;
    for (const q of pool) {
      const idx = state.psychHistory.lastIndexOf(q);
      if (idx < oldestIdx) { oldestIdx = idx; oldest = q; }
    }
    return oldest;
  };
  // 単一候補でも履歴に応じて代替を返す
  const pickSingle = (preferred, fallbackPool) => {
    const recent = state.psychHistory.slice(-1)[0];
    if (preferred !== recent) return preferred;
    // 直前と同じになる場合：fallbackPool から代替
    if (fallbackPool && fallbackPool.length) {
      const alts = fallbackPool.filter(q => q !== preferred);
      if (alts.length) return pickFresh(alts);
    }
    return preferred;
  };
  if (id === 'rico_tutorial') {
    // 本気リコ：場面に応じて上級心理戦を出題（厳密マッチ＋連続防止）
    if (state.seriousRicoMode) {
      const seriousPool = ['rico_serious_polarized', 'rico_serious_minmax', 'rico_serious_blocker'];
      const need = state.currentBetOpponent - state.currentBetPlayer;
      const potBefore = state.pot - need;
      const ratio = potBefore > 0 ? need / potBefore : 0;
      if (state.handPhase === 'river' && ratio > 1.0) return pickSingle('rico_serious_polarized', seriousPool);
      if (state.checkRaiseDetected)                   return pickSingle('rico_serious_minmax', seriousPool);
      if (detectBlockerScenario(state))               return pickSingle('rico_serious_blocker', seriousPool);
      return pickFresh(seriousPool);
    }
    return 'rico_tutorial_flop';
  }
  if (id === 'polka') {
    // 両問とも場面非依存のブラフ系。自由にローテーション
    return pickFresh(['polka_flop_bluff', 'polka_overtalk']);
  }
  if (id === 'selina') {
    const suits = state.community.map(c => c.suit);
    const counts = {};
    suits.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const maxSuit = Math.max(...Object.values(counts), 0);
    const selinaPool = ['selina_flush_alert', 'selina_bet_size', 'selina_check_raise'];
    if (state.checkRaiseDetected) return pickSingle('selina_check_raise', selinaPool);
    const fitCondition = maxSuit >= 2 ? 'selina_flush_alert' : 'selina_bet_size';
    const other = fitCondition === 'selina_flush_alert' ? 'selina_bet_size' : 'selina_flush_alert';
    return pickFresh([fitCondition, other]);
  }
  if (id === 'grano') {
    const potBefore = state.pot - state.currentBetOpponent;
    const ratio = potBefore > 0 ? state.currentBetOpponent / potBefore : 1;
    const granoPool = ['grano_cheap_call', 'grano_expensive', 'grano_river_polar'];
    if (state.handPhase === 'river' && ratio > 1.0) return pickSingle('grano_river_polar', granoPool);
    const fitCondition = ratio < 0.5 ? 'grano_cheap_call' : 'grano_expensive';
    const other = fitCondition === 'grano_cheap_call' ? 'grano_expensive' : 'grano_cheap_call';
    return pickFresh([fitCondition, other]);
  }
  if (id === 'velvet') {
    const velvetPool = ['velvet_flop', 'velvet_turn', 'velvet_river_evidence', 'velvet_eye_contact'];
    let myHs = 0;
    try {
      const all = [...state.playerHand, ...state.community];
      myHs = state.community.length >= 3 ? handStrength01(all) : opponentPreflopStrength(state.playerHand);
    } catch(e) {}
    const myHsPct = Math.round(myHs * 100);
    if (state.handPhase === 'river') return pickSingle('velvet_river_evidence', velvetPool);
    if (state.handPhase === 'turn')  return pickSingle('velvet_turn', velvetPool);
    // フロップで手の強さが微妙 → 視線揺さぶり
    if (state.handPhase === 'flop' && myHsPct >= 35 && myHsPct <= 55) {
      return pickSingle('velvet_eye_contact', velvetPool);
    }
    return pickSingle('velvet_flop', velvetPool);
  }
  return 'polka_flop_bluff';
}

function velvetSpeech(action) {
  if (action.intent === 'bluff' || action.intent === 'forced_bluff') {
    return pick([
      'この程度のボード、怖がる理由はないわ。',
      'あなたに見えてないものが、私には見えているの。',
      '降りる勇気もないなら、それ相応の結果になるわよ。',
      '震えてる？……可愛らしいわね。',
      'チップに、覚悟の重さを乗せてあげる。',
      '私のターンよ。あなたは何ができる？',
      'ふふ……まだそんな顔ができるのね。',
      '読み合いに、勝つ気は最初からなかったのでしょう？',
    ]);
  }
  if (action.intent === 'value') {
    return pick([
      '……',
      '静かに進めましょう',
      '焦らないで、ゆっくり、ね',
      'これは、正当な対価よ。',
      '逃さない。確実に頂くわ。',
      '答えは、もう私の中にある。',
    ]);
  }
  if (action.intent === 'draw') return pick([
    'ドロー狙いには、相応の代金を。',
    'タダで次を見られると思った？',
  ]);
  if (action.intent === 'trap') return pick([
    'チェック。さあ、踊って？',
    '私の手の内、暴けるかしら？',
    '罠を仕掛けるのは、強者の特権よ。',
  ]);
  if (action.type === 'fold') return pick([
    'いいわ、今回は譲ってあげる……',
    '面白くないわね。次に期待するわ。',
    'あなたの圧、感じたわ。降ります。',
    '今は引く。それも戦略よ。',
  ]);
  if (action.type === 'check_call') return pick([
    '同額で構わないわ',
    'コール。あなたの手、見せてもらう',
    '焦る必要はないわ',
  ]);
  return pick([
    'さあ',
    '……どうする？',
    '時間は無限ではないわよ',
    '迷うのは弱者の特権。早く決めて？',
    'ふふ……',
  ]);
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
// 状況分析パネル：プレイヤーのターンに役立つ理論的な指針
// === 狙える役の分析（アウツ＋確率） ===
// 残りカードのうち、引いたら役が改善するカード（アウツ）をカウントし、
// 「2-and-4の法則」で完成確率を出す。プロが必ず意識する基本指標。
function analyzeDraws() {
  if (!state.playerHand || state.playerHand.length === 0) return null;
  const community = state.community || [];
  if (community.length < 3 || community.length >= 5) return null; // flop / turn のみ
  const all = [...state.playerHand, ...community];
  const known = new Set(all.map(c => c.label + c.suit));
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
  const LABELS = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) {
    const lbl = LABELS[r] + s;
    if (!known.has(lbl)) deck.push({ rank: r, suit: s, label: LABELS[r] });
  }
  const currentEv = evaluateHand(all);
  const currentScore = currentEv.score;
  const currentRank = currentEv.rank;

  // 改善するアウツをハンド名別にカウント
  // 同じ役名（=同カテゴリ）への改善は「より高い〜」、別カテゴリへの改善は通常名
  const outsByLabel = {};
  for (const card of deck) {
    const next = [...all, card];
    const ev = evaluateHand(next);
    if (ev.score > currentScore) {
      const label = ev.rank === currentRank ? `より高い${ev.name}` : ev.name;
      outsByLabel[label] = (outsByLabel[label] || 0) + 1;
    }
  }
  const cardsLeft = community.length === 3 ? 2 : 1; // flop=2 to come, turn=1
  // 2-and-4 法則：1枚先=outs*2%、2枚先=outs*4% (大よそ45outs超で頭打ち)
  const results = Object.entries(outsByLabel).map(([name, outs]) => ({
    name,
    outs,
    pct: cardsLeft === 2 ? Math.min(Math.round(outs * 4), 99) : Math.min(Math.round(outs * 2), 99),
  })).sort((a, b) => b.outs - a.outs);

  return { draws: results, current: currentEv.name, cardsLeft };
}

function renderSituationAnalysis() {
  // バトル外/手札なし時は空
  if (state.screen !== 'battle' || !state.playerHand || state.playerHand.length === 0) return '';
  if (state.handPhase === 'idle' || state.handPhase === 'showdown') return '';

  const need = Math.max(0, state.currentBetOpponent - state.currentBetPlayer);
  const pot = state.pot || 0;
  const potAfter = pot + need;
  const reqWinRate = potAfter > 0 ? Math.round(need / potAfter * 100) : 0;
  const myStack = state.playerChips;
  const oppStack = state.opponentChips;
  const totalChips = myStack + oppStack;
  const stackPct = totalChips > 0 ? Math.round(myStack / totalChips * 100) : 50;
  const spr = pot > 0 ? (myStack / pot).toFixed(1) : '∞';

  // 手の強さ概算
  let hs = 0;
  try {
    const all = [...state.playerHand, ...state.community];
    // プレイヤー表示用：実戦的な勝率推定（realisticEquity01）を使用
    hs = state.community.length >= 3 ? realisticEquity01(all) : opponentPreflopStrength(state.playerHand);
  } catch(e) {}
  const hsPct = Math.round(hs * 100);

  // ボード危険度
  const danger = evaluateBoardDanger(visibleCommunity() || []);
  const dangerFlags = [];
  if (danger.flushAlert)    dangerFlags.push('🌊フラッシュ');
  if (danger.straightAlert) dangerFlags.push('🪜ストレート');
  if (danger.pairBoard)     dangerFlags.push('♠ペアボード');

  // 推奨アクション
  // 1対1の場合、handStrength01は対ランダム相手の絶対値で実戦勝率より低めに出る傾向。
  // ヘッズアップ補正：実効勝率 = hsPct + 10 程度（相手レンジが広い分）
  // 加えて、相手意図がbluff寄りなら実効勝率はさらに +5
  // ヘッズアップ補正：プリフロップのみ。ポストフロップは realisticEquity01 が既に実戦値
  const isPreflopPhase = (state.community || []).length === 0;
  let huBonus = 0;
  if (isPreflopPhase) {
    if (hsPct >= 60)      huBonus = 5;
    else if (hsPct >= 40) huBonus = 8;
    else if (hsPct >= 25) huBonus = 6;
    else                  huBonus = 3;
  }
  let effectivePct = hsPct + huBonus;
  if (state.lastOpponentIntent === 'bluff' || state.lastOpponentIntent === 'forced_bluff') effectivePct += 5;
  if (state.lastOpponentIntent === 'value') effectivePct -= 5;
  effectivePct = Math.max(0, Math.min(100, effectivePct));

  let advice = '';
  let adviceClass = 'sit-neutral';
  // プリフロップかどうかでアドバイス文を切り替え（ボタン表記と整合）
  const isPreflop = (state.community || []).length === 0;
  // プレイヤーのターンでなければアドバイス省略（次は相手次第）
  if (!state.isPlayerTurn) {
    advice = '⌛ 相手の手番待ち……';
    adviceClass = 'sit-neutral';
  } else if (need === 0) {
    // チェックorベットの場面（コールではない）
    if (isPreflop) {
      // プリフロップ：レイズ／チェック
      if (effectivePct >= 65)       { advice = '💪 中レイズで圧をかけよう'; adviceClass = 'sit-aggressive'; }
      else if (effectivePct >= 45)  { advice = '🟡 小レイズ可';            adviceClass = 'sit-neutral'; }
      else                          { advice = '👁 チェックで様子見';        adviceClass = 'sit-neutral'; }
    } else {
      // ポストフロップ：ベットサイズで具体的に
      if (effectivePct >= 65)       { advice = '💪 2/3ポット〜で圧をかけよう'; adviceClass = 'sit-aggressive'; }
      else if (effectivePct >= 45)  { advice = '🟡 1/2ポット程度の小ベット可'; adviceClass = 'sit-neutral'; }
      else                          { advice = '👁 チェックで様子見';            adviceClass = 'sit-neutral'; }
    }
  } else {
    // 相手がベットしてきた場面（コールorレイズorフォールド）
    const margin = effectivePct - reqWinRate;
    if (margin >= 20)             { advice = `🔥 レイズ推奨（実効勝率${effectivePct}% ≫ 必要${reqWinRate}%）`; adviceClass = 'sit-aggressive'; }
    else if (margin >= 5)         { advice = `✅ コール推奨（${effectivePct}% > ${reqWinRate}%）`; adviceClass = 'sit-aggressive'; }
    else if (margin >= -8)        { advice = `🟡 マージナルコール（${effectivePct}% vs ${reqWinRate}%）`; adviceClass = 'sit-neutral'; }
    else if (margin >= -20)       { advice = `🟠 微妙……ボードと相手次第`; adviceClass = 'sit-neutral'; }
    else                          { advice = `❌ フォールド推奨（${effectivePct}% < ${reqWinRate}%）`; adviceClass = 'sit-defensive'; }
  }

  // SPRコメント
  let sprComment = '';
  if (pot > 0) {
    if (myStack / pot < 3) sprComment = '（SPR低：完成役なら押し切るべき）';
    else if (myStack / pot > 8) sprComment = '（SPR高：降りる余地あり）';
  }

  // 相手の直前意図ヒント（裏モードでは無く、推測ベース）
  let intentHint = '';
  if (state.lastOpponentIntent) {
    const intentMap = {
      'bluff': '相手はブラフ寄りかも',
      'forced_bluff': '相手は降ろし狙いの可能性',
      'value': '相手は強い手で稼ぎに来てる気配',
      'draw': '相手はドロー潰しで圧かけてる',
      'trap': '相手はチェックで罠を仕掛けたかも',
    };
    intentHint = intentMap[state.lastOpponentIntent] || '';
  }

  // === 戦況：手番優先度順の再設計 ===
  // ① 推奨アクション（核心）：大きく
  // ② ポットオッズ要約：必要勝率と自分勝率を並置
  // ③ ボード警戒（あれば）
  // ④ ドロー要約（あれば、1〜2行）
  // ⑤ 〈詳細〉折りたたみ：スタック比/SPR/ポット
  // ⑥ 〈戦績〉折りたたみ：勝/負/分/SD/AF + ハンド履歴ボタン

  const drawInfo = (() => {
    const a = analyzeDraws();
    if (!a || !a.draws || a.draws.length === 0) return '';
    const top = a.draws[0];
    const ruleLabel = a.cardsLeft === 2 ? 'リバーまで' : '次1枚で';
    return `<div class="sit-draw-line">🎯 ${top.name} <b>${top.outs}枚</b> → <b>${top.pct}%</b> <small>${ruleLabel}</small></div>`;
  })();

  // ポットオッズ要約：コール判断の場面のみ
  const oddsLine = need > 0
    ? `<div class="sit-odds">勝率 <b>${effectivePct}%</b> vs 必要 <b>${reqWinRate}%</b></div>`
    : `<div class="sit-odds">勝率 <b>${effectivePct}%</b>（チェック可）</div>`;

  return `
    <div class="sit-advice ${adviceClass}">${advice}</div>
    ${oddsLine}
    ${dangerFlags.length ? `<div class="sit-danger">⚠ ${dangerFlags.join(' / ')}</div>` : ''}
    ${drawInfo}
    ${intentHint ? `<div class="sit-intent">🎭 ${intentHint}</div>` : ''}
    <details class="sit-stats-fold">
      <summary>📊 詳細データ</summary>
      <div class="sit-row sit-row-stacks">
        <span class="sit-label">スタック</span>
        <span class="sit-bar"><span class="sit-bar-fill" style="width:${stackPct}%"></span></span>
        <span class="sit-value">${myStack} / ${oppStack}</span>
      </div>
      <div class="sit-grid">
        <div class="sit-stat" title="絶対勝率／実効勝率（ヘッズアップ補正後）">
          <span class="sit-stat-label">勝率</span>
          <span class="sit-stat-val">${hsPct}%→${effectivePct}%</span>
        </div>
        <div class="sit-stat">
          <span class="sit-stat-label">必要</span>
          <span class="sit-stat-val">${need > 0 ? reqWinRate + '%' : '—'}</span>
        </div>
        <div class="sit-stat">
          <span class="sit-stat-label">SPR</span>
          <span class="sit-stat-val">${spr}${sprComment ? '<small>'+sprComment+'</small>' : ''}</span>
        </div>
        <div class="sit-stat">
          <span class="sit-stat-label">ポット</span>
          <span class="sit-stat-val">${pot}</span>
        </div>
      </div>
    </details>
    ${(() => {
      const a = analyzeDraws();
      if (!a || !a.draws || a.draws.length <= 1) return '';
      return `<details class="sit-draws-fold">
        <summary>🎯 全ドロー候補</summary>
        <div class="sit-draws">
          ${a.draws.slice(0, 4).map(d => `
            <div class="sit-draw-row">
              <span class="sd-name">${d.name}</span>
              <span class="sd-outs">${d.outs}枚</span>
              <span class="sd-pct">${d.pct}%</span>
            </div>
          `).join('')}
        </div>
      </details>`;
    })()}
    ${renderSessionStats()}
  `;
}

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
      // 裏モード表示：プレイヤーが直感的に分かる勝率推定
      const hs = realisticEquity01(all);
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
  const danger = evaluateBoardDanger(visibleCommunity() || []);
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

// === 物理チップ追跡：ベットされたチップをそのまま記録（再分解しない） ===
function decomposeToChips(amount) {
  const tiers = [
    { cls: 'chip-orange', val: 1000 },
    { cls: 'chip-purple', val: 500 },
    { cls: 'chip-black',  val: 100 },
    { cls: 'chip-green',  val: 25 },
  ];
  let rem = amount;
  const chips = [];
  for (const t of tiers) {
    const c = Math.floor(rem / t.val);
    for (let i = 0; i < c; i++) chips.push(t.cls);
    rem -= c * t.val;
  }
  return chips;
}
function pushPotChips(amount) {
  if (!amount || amount <= 0) return;
  if (!state.potChips) state.potChips = [];
  decomposeToChips(amount).forEach(c => state.potChips.push(c));
}
function resetPotChips() { state.potChips = []; state.__lastPotCalc = null; }

// 縦積みチップ列：単位種ごとに 1 列、最大表示枚数で省略
function buildVerticalChipColumns(amount, opts = {}) {
  const maxPerCol = opts.maxPerCol || 6;
  const numClass  = opts.numClass  || 'bu-vc-num';
  const chipClass = opts.chipClass || 'bu-vc-chip';
  if (!amount || amount <= 0) {
    return `<div class="bu-vcols"><span class="${numClass}">0</span></div>`;
  }
  const tiers = [
    { cls: 'chip-orange', val: 1000 },
    { cls: 'chip-purple', val: 500 },
    { cls: 'chip-black',  val: 100 },
    { cls: 'chip-green',  val: 25 },
  ];
  let rem = amount;
  const cols = [];
  for (const t of tiers) {
    const c = Math.floor(rem / t.val);
    if (c > 0) cols.push({ cls: t.cls, count: c });
    rem -= c * t.val;
  }
  const colsHtml = cols.map(co => {
    const visible = Math.min(co.count, maxPerCol);
    const extra = co.count - visible;
    const chipsHtml = Array.from({ length: visible }, () =>
      `<span class="${chipClass} ${co.cls}"></span>`
    ).join('');
    return `<span class="bu-vc-col">${chipsHtml}${extra > 0 ? `<span class="bu-vc-more">×${co.count}</span>` : ''}</span>`;
  }).join('');
  return `<div class="bu-vcols">${colsHtml}<span class="${numClass}">${amount}</span></div>`;
}

// 与えられたチップ配列をそのまま縦積み列で表示（再分解しない）
function buildVerticalChipsFromArray(chipsArr, opts = {}) {
  const maxPerCol = opts.maxPerCol || 8;
  const chipClass = opts.chipClass || 'bu-vc-chip';
  if (!chipsArr || chipsArr.length === 0) {
    return `<div class="bu-vcols"></div>`;
  }
  // 色ごとにカウント
  const counts = {};
  chipsArr.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const orderedCls = ['chip-orange', 'chip-purple', 'chip-black', 'chip-green'];
  const cols = orderedCls.filter(c => counts[c]).map(c => ({ cls: c, count: counts[c] }));
  return `<div class="bu-vcols">${cols.map(co => {
    const visible = Math.min(co.count, maxPerCol);
    const extra = co.count - visible;
    const chipsHtml = Array.from({ length: visible }, () =>
      `<span class="${chipClass} ${co.cls}"></span>`
    ).join('');
    return `<span class="bu-vc-col">${chipsHtml}${extra > 0 ? `<span class="bu-vc-more">×${co.count}</span>` : ''}</span>`;
  }).join('')}</div>`;
}

// === チップ円盤の横並び表記（ポット/コール/ボタン/残チップ共通） ===
// 実カジノ準拠カラー：橙=$1000, 紫=$500, 黒=$100, 緑=$25 で統一
// 大額（残10000など）はキャップ12枚＋超過表記でカバー
function buildHorizontalChips(amount, scale = 'small', numClass = 'bu-remain-num', extraChipClass = '') {
  if (!amount || amount <= 0) {
    return `<span class="bu-remain-chips"><span class="${numClass}">0</span></span>`;
  }
  const tiers = [
    { cls: 'chip-orange', val: 1000 },
    { cls: 'chip-purple', val: 500 },
    { cls: 'chip-black',  val: 100 },
    { cls: 'chip-green',  val: 25 },
  ];
  let rem = amount;
  const flat = [];
  for (const t of tiers) {
    const c = Math.floor(rem / t.val);
    for (let i = 0; i < c; i++) flat.push(t.cls);
    rem -= c * t.val;
  }
  // 残チップ用は枚数が増えがちなのでキャップを 12 に拡張
  const cap = scale === 'large' ? 12 : 8;
  const visible = flat.slice(0, cap);
  const over = flat.length - visible.length;
  return `<span class="bu-remain-chips">${
    visible.map(cls => `<span class="bu-rchip ${cls} ${extraChipClass}"></span>`).join('')
  }${over > 0 ? `<span class="bu-remain-more">+${over}</span>` : ''}<span class="${numClass}">${amount}</span></span>`;
}

// === 統合ベットゲージ：チップスタックで賭け額と力関係を可視化 ===
function renderBetUnified() {
  const opp = state.currentBetOpponent || 0;
  const pl  = state.currentBetPlayer || 0;
  const pot = state.pot || 0;
  const oppName = state.opponentName || '相手';
  const playerCallNeed = Math.max(0, opp - pl);

  // 前回からの増分（新規追加チップ）を追跡してアニメ対象に
  if (!state.__prevBet) state.__prevBet = { opp: 0, pl: 0, pot: 0 };
  const prev = state.__prevBet;
  // ハンドが切り替わって total が減った場合はリセット
  if (opp < prev.opp || pl < prev.pl || pot < prev.pot) {
    prev.opp = 0; prev.pl = 0; prev.pot = 0;
  }
  const newOpp = Math.max(0, opp - prev.opp);
  const newPl  = Math.max(0, pl  - prev.pl);
  const newPot = Math.max(0, pot - prev.pot);
  state.__prevBet = { opp, pl, pot };
  // ポット計算式：前ストリートまでの蓄積 + 今ストリート合計 = ポット
  // （直近の差分ではなく、ストリート単位で見せる方が混乱しない）
  const carry = Math.max(0, pot - opp - pl);
  const thisStreet = opp + pl;
  if (thisStreet > 0) {
    state.__lastPotCalc = { before: carry, added: thisStreet, after: pot };
  } else {
    state.__lastPotCalc = null;
  }

  // 「賭け済みチップ」を縦積みで表現
  // 1チップ = 25 単位。最大表示15枚、超過は数字に
  // newOnTop: 新規追加分（先頭枚）を pop アニメ対象としてマーク
  const buildVerticalStack = (amount, side, newAdded) => {
    if (!amount || amount <= 0) return '<div class="bu-waiting">待機中</div>';
    const tiers = [
      { cls: 'chip-orange', val: 1000 },
      { cls: 'chip-purple', val: 500 },
      { cls: 'chip-black',  val: 100 },
      { cls: 'chip-green',  val: 25 },
    ];
    let rem = amount;
    const items = []; // {cls, count}
    for (const t of tiers) {
      const c = Math.floor(rem / t.val);
      if (c > 0) items.push({ cls: t.cls, count: c });
      rem -= c * t.val;
    }
    // 重ねて表示する用に flat 配列化（最大15枚まで）
    const flat = [];
    items.forEach(it => { for (let i = 0; i < it.count; i++) flat.push(it.cls); });
    const cap = 15;
    const visible = flat.slice(0, cap);
    const over = flat.length - visible.length;
    // 「新規追加チップ枚数」を末尾枚に新着クラスで割り当て（pop アニメ）
    // newAdded はチップ枚数（amount ではなく目視枚数）相当：簡易換算で「flat.length - 前の flat.length」を使う
    const oldFlatLen = (() => {
      // 概算：(amount - newAddedValue) で前回の flat.length を再計算
      const prevAmt = Math.max(0, amount - newAdded);
      let rem = prevAmt; let n = 0;
      for (const t of tiers) { const c = Math.floor(rem / t.val); n += c; rem -= c * t.val; }
      return n;
    })();
    const newCount = Math.max(0, visible.length - oldFlatLen);
    return `
      <div class="bu-vstack" data-side="${side}">
        ${visible.map((cls, i) => {
          const isNew = (i >= visible.length - newCount);
          return `<span class="bu-chip ${cls}${isNew ? ' bu-chip-new' : ''}" style="--i:${i}"></span>`;
        }).join('')}
        ${over > 0 ? `<span class="bu-overflow">+${over}枚</span>` : ''}
      </div>
    `;
  };

  const callText = playerCallNeed > 0 ? `コール ${playerCallNeed}` : 'コール —';
  const callClass = playerCallNeed > 0 ? 'bu-callneed bu-callneed-active' : 'bu-callneed bu-callneed-idle';
  const oppShort = oppName.length > 4 ? oppName.slice(0, 3) + '…' : oppName;
  // ベットサイズの強さラベル（標準/強気/最大圧 等）
  const sizeLabelOf = (amount, basePot) => {
    if (!amount || amount <= 0 || basePot <= 0) return '';
    const r = amount / basePot;
    if (r >= 1.5)  return '超強気';
    if (r >= 0.9)  return '最大圧';
    if (r >= 0.55) return '強気';
    if (r >= 0.35) return '標準';
    return '様子見';
  };
  // それぞれのベット時点でのポット基準で計算
  const oppSizeLabel = sizeLabelOf(opp, pot - opp);
  const plSizeLabel  = sizeLabelOf(pl,  pot - pl);

  const buildRemainStack = (a) => buildHorizontalChips(a, 'large', 'bu-remain-num');

  return `
    <!-- 1. 相手のベット（このストリート） -->
    <div class="bu-cell bu-cell-bet bu-cell-opp${opp > pl && opp > 0 ? ' bu-lead' : ''}">
      <div class="bu-cell-label">${oppShort} ベット</div>
      ${buildVerticalStack(opp, 'opp', newOpp)}
      <div class="bu-cell-amt">${opp > 0 ? '+' + opp + (oppSizeLabel ? ` <span class="bu-size-tag">${oppSizeLabel}</span>` : '') : ''}</div>
      <div class="bu-status-slot">${
        opp > pl && opp > 0 ? `<span class="bu-status bu-status-lead">▲ リード</span>`
          : (pl > opp && opp > 0 ? `<span class="bu-status bu-status-behind">差 −${pl - opp}</span>`
          : `<span class="bu-status bu-status-empty"></span>`)
      }</div>
    </div>
    <!-- 3. ポット（物理チップ） -->
    <div class="bu-cell bu-cell-pot">
      <div class="bu-cell-label bu-pot-title">ポット</div>
      <div class="bu-pot-physical">${buildVerticalChipsFromArray(state.potChips || [])}</div>
      <div class="bu-pot-display"><span class="bu-pot-num">${pot}</span></div>
      <div class="bu-pot-calc">${
        state.__lastPotCalc && state.__lastPotCalc.added > 0
          ? `<span class="bpc-before">${state.__lastPotCalc.before}</span> <span class="bpc-op">+</span> <span class="bpc-added">${state.__lastPotCalc.added}</span> <span class="bpc-op">=</span> <span class="bpc-after">${state.__lastPotCalc.after}</span>`
          : `<span class="bpc-empty"></span>`
      }</div>
      <div class="${callClass}">
        <span class="bu-call-key">コール</span>
        ${playerCallNeed > 0
          ? buildHorizontalChips(playerCallNeed, 'small', 'bu-call-num')
          : '<span class="bu-call-empty"></span>'}
      </div>
    </div>
    <!-- 4. ミミのベット（このストリート） -->
    <div class="bu-cell bu-cell-bet bu-cell-pl${pl > opp && pl > 0 ? ' bu-lead' : ''}">
      <div class="bu-cell-label">ミミ ベット</div>
      ${buildVerticalStack(pl, 'pl', newPl)}
      <div class="bu-cell-amt">${pl > 0 ? '+' + pl + (plSizeLabel ? ` <span class="bu-size-tag">${plSizeLabel}</span>` : '') : ''}</div>
      <div class="bu-status-slot">${
        pl > opp && pl > 0 ? `<span class="bu-status bu-status-lead">▲ リード</span>`
          : (opp > pl ? `<span class="bu-status bu-status-behind">あと −${opp - pl} 必要</span>`
          : `<span class="bu-status bu-status-empty"></span>`)
      }</div>
    </div>
  `;
}

/* ===== 場札左右の残チップスタック表示（コンパクト・枠なし） =====
   チップは「代表色 1〜2 種、各最大 4 枚」までに圧縮。
   amount が大きい場合は数値テキストで主張させ、チップは雰囲気程度。 */
function renderStackOnTable(side) {
  const amt = side === 'player' ? state.playerChips : state.opponentChips;
  const name = side === 'player' ? 'ミミ' : (state.opponentName || '相手');

  // 代表色を最大2種類だけ：金額帯で決める
  // - 5000以上：橙 + 紫
  // - 1000以上：紫 + 黒
  // - 300以上 ：黒 + 緑
  // - それ以下 ：緑のみ
  let repTiers = [];
  if (amt >= 5000)      repTiers = [{cls:'chip-orange', n:4}, {cls:'chip-purple', n:3}];
  else if (amt >= 1000) repTiers = [{cls:'chip-purple', n:4}, {cls:'chip-black', n:3}];
  else if (amt >= 300)  repTiers = [{cls:'chip-black',  n:4}, {cls:'chip-green', n:2}];
  else if (amt > 0)     repTiers = [{cls:'chip-green',  n:Math.min(4, Math.ceil(amt/25))}];

  const chipsHtml = repTiers.map(t => `
    <span class="ts-col">
      ${Array.from({length: t.n}, () => `<span class="ts-chip ${t.cls}"></span>`).join('')}
    </span>
  `).join('');

  return `
    <div class="table-stack table-stack-${side}">
      <div class="ts-name">${name.length > 4 ? name.slice(0,3) + '…' : name}</div>
      <div class="ts-chips">${chipsHtml || '<span class="ts-empty">—</span>'}</div>
      <div class="ts-amount">${amt}</div>
    </div>
  `;
}

// === エクイティ（勝率）計算：ストリート単位 ===
// 残りカードを全列挙して player vs opponent の勝率を出す
function computeEquity(playerHand, opponentHand, community) {
  if (!playerHand || !opponentHand || playerHand.length < 2 || opponentHand.length < 2) return null;
  if (community.length === 5) {
    const pEv = evaluateHand([...playerHand, ...community]);
    const oEv = evaluateHand([...opponentHand, ...community]);
    if (pEv.score > oEv.score) return 100;
    if (pEv.score < oEv.score) return 0;
    return 50;
  }
  const known = new Set([...playerHand, ...opponentHand, ...community].map(c => c.label + c.suit));
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
  const LABELS = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) {
    const lbl = LABELS[r] + s;
    if (!known.has(lbl)) deck.push({ rank: r, suit: s, label: LABELS[r] });
  }
  let wins = 0, losses = 0, splits = 0;
  const toCome = 5 - community.length;
  if (toCome === 2) {
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const board = [...community, deck[i], deck[j]];
        const pEv = evaluateHand([...playerHand, ...board]);
        const oEv = evaluateHand([...opponentHand, ...board]);
        if (pEv.score > oEv.score) wins++;
        else if (pEv.score < oEv.score) losses++;
        else splits++;
      }
    }
  } else if (toCome === 1) {
    for (const card of deck) {
      const board = [...community, card];
      const pEv = evaluateHand([...playerHand, ...board]);
      const oEv = evaluateHand([...opponentHand, ...board]);
      if (pEv.score > oEv.score) wins++;
      else if (pEv.score < oEv.score) losses++;
      else splits++;
    }
  } else {
    // プリフロップ：簡易ヒューリスティック
    const pStr = opponentPreflopStrength(playerHand);
    const oStr = opponentPreflopStrength(opponentHand);
    const total = pStr + oStr;
    return total > 0 ? Math.round(pStr / total * 100) : 50;
  }
  const total = wins + losses + splits;
  return total > 0 ? Math.round((wins + splits / 2) / total * 100) : 50;
}

function recordEquitySnapshot(streetLabel) {
  if (!state.equityHistory) state.equityHistory = [];
  if (!state.playerHand || !state.opponentHand) return;
  const eq = computeEquity(state.playerHand, state.opponentHand, state.community || []);
  if (eq !== null) {
    state.equityHistory.push({ street: streetLabel, pct: eq });
  }
}

// セッション戦績（プロが意識する主要指標）
function renderSessionStats() {
  const results = state.handResults || [];
  const bets = (state.logs && state.logs.bets) || [];
  const total = results.length;
  // P3: 中身が空（集計対象0件）のときはボタン自体を出さない（空アコーディオン廃止）
  if (total === 0) return '';
  const wins   = results.filter(r => r.winner === 'player').length;
  const losses = results.filter(r => r.winner === 'opponent').length;
  const splits = results.filter(r => r.winner === 'split').length;
  const showdowns = results.filter(r => r.reason === 'showdown').length;
  const wtsdPct = total > 0 ? Math.round(showdowns / total * 100) : 0;
  // W$SD：ショーダウンに行った中で勝率
  const sdWins = results.filter(r => r.reason === 'showdown' && r.winner === 'player').length;
  const wsdPct = showdowns > 0 ? Math.round(sdWins / showdowns * 100) : 0;
  // AF（アグレッションファクタ）：(bet + raise) / call
  // 自分のbets
  const myBets   = bets.filter(b => b.actor === 'player' && (b.type === 'bet' || b.type === 'raise' || b.type === 'allin')).length;
  const myCalls  = bets.filter(b => b.actor === 'player' && b.type === 'call').length;
  const oppBets  = bets.filter(b => b.actor === 'opponent' && (b.type === 'bet' || b.type === 'raise' || b.type === 'allin')).length;
  const oppCalls = bets.filter(b => b.actor === 'opponent' && b.type === 'call').length;
  const myAF  = myCalls === 0 ? (myBets > 0 ? '∞' : '0') : (myBets / myCalls).toFixed(1);
  const oppAF = oppCalls === 0 ? (oppBets > 0 ? '∞' : '0') : (oppBets / oppCalls).toFixed(1);
  // AF 表現
  const afLabel = (af) => {
    if (af === '∞') return '超攻撃';
    const v = parseFloat(af);
    if (v >= 2.5) return '攻撃的';
    if (v >= 1.0) return 'バランス';
    return '受け身';
  };

  return `<details class="sess-stats"><summary><span class="sess-title-txt">📈 戦績 <small>(${wins}勝${losses}敗 / ${total}ハンド)</small></span></summary>
    <div class="ss-grid">
      <div class="ss-row"><span class="ss-k">勝/負/分</span><span class="ss-v">${wins} / ${losses} / ${splits}</span></div>
      <div class="ss-row"><span class="ss-k">SD 到達率</span><span class="ss-v">${wtsdPct}%</span></div>
      <div class="ss-row"><span class="ss-k">SD 勝率</span><span class="ss-v">${wsdPct}%</span></div>
      <div class="ss-row"><span class="ss-k">自分 AF</span><span class="ss-v">${myAF} <small>${afLabel(myAF)}</small></span></div>
      <div class="ss-row"><span class="ss-k">相手 AF</span><span class="ss-v">${oppAF} <small>${afLabel(oppAF)}</small></span></div>
    </div>
    <div class="ss-note">AF = (ベット+レイズ) ÷ コール。高いほど攻撃的</div>
    <button class="btn btn-ghost ss-history-btn" data-action="open-history">📜 ハンドごとの詳細を見る</button>
  </details>`;
}

// 現在のストリート進行表示
// ===== v2 レンダラ群 =====
const OPP_LATIN = { polka: 'POLKA', selina: 'SELINA', grano: 'GRANO', velvet: 'VELVET', rico_tutorial: 'RICO' };
function opponentLatinName() { return OPP_LATIN[state.opponentId] || (state.opponentName || '').toUpperCase(); }
function renderStreetList() {
  const order = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const labels = { preflop: 'PREFLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER', showdown: 'SHOWDOWN' };
  let cur = state.handPhase || 'preflop';
  if (cur === 'turnRiver') cur = 'river';
  if (cur === 'idle') cur = state.handNo ? 'showdown' : 'preflop';
  const curIdx = order.indexOf(cur);
  return order.filter(s => (state.fullHand || s !== 'turn') && (s !== 'showdown' || cur === 'showdown')).map(s => {
    const i = order.indexOf(s);
    const cls = i < curIdx ? 'v2-st-done' : i === curIdx ? 'v2-st-cur' : 'v2-st-future';
    return `<span class="v2-disp v2-st ${cls}">${labels[s]}${i < curIdx ? ' ✓' : ''}</span>`;
  }).join('');
}
function renderPotBlock() {
  const opp = state.currentBetOpponent || 0;
  const oppName = (state.opponentName || '相手').replace(/（.*）/, '');
  const sizeTag = (() => {
    const base = state.pot - opp; if (opp <= 0 || base <= 0) return '';
    const r = opp / base; if (r >= 0.95) return 'ポット'; if (r >= 0.6) return '2/3ポット'; if (r >= 0.4) return '1/2ポット'; return '小ベット';
  })();
  return `
    <div class="v2-disp v2-pot-label">POT</div>
    <div class="v2-disp v2-pot-num bu-pot-physical">${state.pot || 0}</div>
    <div class="v2-pot-sub">
      ${opp > 0 ? `<span class="v2-chip v2-chip-red">${oppName} +${opp} <em>${sizeTag}</em></span>` : ''}
      <span class="v2-chip v2-chip-dark"><img class="v2-chip-icon" src="assets/ui/chip_red.png" alt="">残り ${state.opponentChips}</span>
    </div>
    <div class="v2-stackbar v2-stackbar-opp"><i style="width:${chipBarPct(state.opponentChips)}%"></i></div>`;
}
function renderTellTags() {
  const tags = state.tellTags || [];
  return tags.slice(-2).map((t, i) => `<div class="v2-tag ${i === 1 ? 'v2-tag-b' : ''}">${t}</div>`).join('');
}
function renderWinrateSeal() {
  if (state.handPhase === 'idle' || !state.playerHand || state.playerHand.length < 2) return '';
  if (state.winrateRevealed || state.tutorialMode || state.introHandMode) {
    const vc = visibleCommunity();
    const all = [...state.playerHand, ...vc];
    const eq = vc.length >= 3 ? realisticEquity01(all) : opponentPreflopStrength(state.playerHand);
    const pct = Math.round(Math.max(0, Math.min(1, eq)) * 100);
    return `<div class="v2-seal-open"><div class="v2-disp v2-seal-pct">${pct}%</div><div class="v2-seal-cap">勝率</div></div>`;
  }
  return `<div class="v2-seal-closed" data-action="toggle-v2-detail" title="詳細データを開く"><div class="v2-disp v2-seal-q">?</div><div class="v2-seal-cap">勝率 封印中</div></div>`;
}
function renderDangerBar() {
  const vc = visibleCommunity();
  if (!vc || vc.length < 3) return '';
  const d = evaluateBoardDanger(vc);
  const parts = [];
  if (d.flushAlert) parts.push('フラッシュ気配');
  if (d.straightAlert) parts.push('ストレート気配');
  if (d.pairBoard) parts.push('ペアボード');
  const pct = Math.min(100, parts.length * 34 + (vc.length - 3) * 8);
  const label = parts.join('・');
  if (!label) return '';
  return `<div class="v2-danger-track"><div class="v2-danger-fill" style="width:${pct}%"></div></div><div class="v2-danger-label">${label}</div>`;
}
function renderStreetTracker() {
  const order = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const labels = { preflop: 'プリフロップ', flop: 'フロップ', turn: 'ターン', river: 'リバー', showdown: 'ショー' };
  // turnRiver（ライトハンド）はターン扱いで表示
  let cur = state.handPhase || 'preflop';
  if (cur === 'turnRiver') cur = 'river'; // 統合表示はリバー相当
  if (cur === 'idle') cur = 'preflop';
  const curIdx = order.indexOf(cur);
  return order.map((s, i) => {
    const cls = i < curIdx ? 'st-done' : i === curIdx ? 'st-current' : 'st-future';
    return `<span class="st-step ${cls}">${labels[s]}</span>${i < order.length - 1 ? '<span class="st-sep">▸</span>' : ''}`;
  }).join('');
}

function renderOpponentBet() {
  if (state.currentBetOpponent <= 0) return '<span class="bet-none">— ベットなし —</span>';
  // 「相手がベットした瞬間のポット額」を基準にする：
  //   = 現在のポット − 相手の今ベット分（自分の既出分は含めたまま）
  const potBeforeBet = state.pot - state.currentBetOpponent;
  const pct = potBeforeBet > 0 ? Math.round((state.currentBetOpponent / potBeforeBet) * 100) : 0;
  let sizeLabel = '';
  if (potBeforeBet > 0) {
    const ratio = state.currentBetOpponent / potBeforeBet;
    if (ratio >= 1.5) sizeLabel = '【超強気】';
    else if (ratio >= 0.9) sizeLabel = '【ポット】';
    else if (ratio >= 0.55) sizeLabel = '【強気】';
    else if (ratio >= 0.35) sizeLabel = '【標準】';
    else sizeLabel = '【様子見】';
  }
  return `<span class="bet-active">▶ ${state.currentBetOpponent}ベット ${sizeLabel}${pct > 0 ? ` (ポットの${pct}%)` : ''}</span>`;
}

// プリフロップハンドのニックネーム＆強さ判定
function getPreflopNickname(h) {
  const r = h.map(c => c.rank).sort((a, b) => b - a);
  const suited = h[0].suit === h[1].suit;
  const pair = r[0] === r[1];
  // 有名なニックネーム
  const nicks = {
    'A-A': '🔥 ポケットロケット', 'K-K': '🔥 カウボーイ', 'Q-Q': '👑 レディース',
    'J-J': '🎣 フィッシュフック', 'T-T': '⚡ ダイムス',
    'A-K': '🗡 ビッグスリック', 'A-Q': '💎 ビッグチック',
    'K-Q': '🛡 ロイヤルカップル',
  };
  const key = pair ? `${h[0].label}-${h[0].label}` : `${r.map(x => 'A23456789TJQKA'[x===14?0:x-1])[0]}-${r.map(x => 'A23456789TJQKA'[x===14?0:x-1])[1]}`;
  const nick = nicks[key];
  if (nick) return suited ? `${nick}（スーテッド）` : nick;
  // ティア判定
  if (pair && r[0] >= 9) return '💪 ミドルペア';
  if (pair) return '🌱 スモールペア';
  if (r[0] === 14 && r[1] >= 9) return suited ? '✨ Aハイ・スーテッド' : '⭐ Aハイ';
  if (r[0] >= 11 && r[1] >= 9 && suited) return '🎯 ブロードウェイ・スーテッド';
  if (Math.abs(r[0] - r[1]) === 1 && suited && r[1] >= 5) return '🔗 スーテッドコネクター';
  if (Math.abs(r[0] - r[1]) === 1 && r[1] >= 5) return '🔗 コネクター';
  if (suited) return '♠ スーテッド（投機）';
  return '🍃 オフスーツ（弱め）';
}

// ポストフロップ：自分が持っているブロッカー情報
function getBlockerHint(h, board) {
  if (board.length < 3) return '';
  const hints = [];
  // フラッシュドローブロッカー：盤面に同スート3枚 + 自分がそのスートのAやK持ち
  const boardSuits = {};
  board.forEach(c => boardSuits[c.suit] = (boardSuits[c.suit] || 0) + 1);
  for (const suit in boardSuits) {
    if (boardSuits[suit] >= 3) {
      const myHigh = h.find(c => c.suit === suit && c.rank >= 13);
      if (myHigh) hints.push(`♦ナッツ${suit}を阻害`);
    }
  }
  // ストレートトップブロッカー：自分がAやKでハイストレート遮断
  const allRanks = [...h.map(c => c.rank), ...board.map(c => c.rank)].sort((a,b) => b-a);
  if (h.some(c => c.rank === 14) && allRanks.includes(13) && allRanks.includes(12)) {
    hints.push('🎯 ハイストレート阻害');
  }
  return hints.length ? hints.join(' / ') : '';
}

// キッカー強さラベル（最大ランク値から判定）
function kickerStrengthLabel(maxRank) {
  if (maxRank >= 13) return '（強め）';     // A,K
  if (maxRank >= 11) return '（中）';       // Q,J
  if (maxRank >= 8)  return '（並）';       // 10,9,8
  return '（弱め）';
}

function renderCurrentHandName() {
  if (state.playerHand.length < 2) return '—';
  const all = [...state.playerHand, ...visibleCommunity()];
  const h = state.playerHand;

  if (all.length < 5) {
    // プリフロップ／フロップ前：ニックネーム＆ティア
    return `<b class="hl-main">${getPreflopNickname(h)}</b>`;
  }

  // ポストフロップ：役名＋内訳ランク。キッカーは renderCurrentHandKicker 側
  const ev = evaluateHand(all);
  const isStrong = ev.rank >= 3;
  const nameOf = (r) => RANK_NAMES[r-2];
  let suffix = '';
  if (ev.bestFive) {
    const sortedRanks = ev.bestFive.map(c => c.rank).sort((a,b) => b-a);
    const counts = {};
    sortedRanks.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const groups = Object.entries(counts).map(([r,n]) => ({ r: +r, n }))
                       .sort((a,b) => b.n - a.n || b.r - a.r);
    switch (ev.rank) {
      case 0: suffix = `(${nameOf(sortedRanks[0])} ハイ)`; break;
      case 1: { const p = groups.find(g => g.n === 2); suffix = `(${nameOf(p.r)})`; break; }
      case 2: {
        const pairs = groups.filter(g => g.n === 2).sort((a,b) => b.r - a.r);
        suffix = `(${nameOf(pairs[0].r)} & ${nameOf(pairs[1].r)})`; break;
      }
      case 3: { const t = groups.find(g => g.n === 3); suffix = `(${nameOf(t.r)})`; break; }
      case 4: { // ストレート
        if (sortedRanks[0] === 14 && sortedRanks[1] === 5) suffix = '(A-5 ホイール)';
        else suffix = `(${nameOf(sortedRanks[0])} ハイ)`;
        break;
      }
      case 5: suffix = `(${nameOf(sortedRanks[0])} ハイ)`; break;
      case 6: {
        const t = groups.find(g => g.n === 3);
        const p = groups.find(g => g.n === 2);
        suffix = `(${nameOf(t.r)} フル ${nameOf(p.r)})`;
        break;
      }
      case 7: { const q = groups.find(g => g.n === 4); suffix = `(${nameOf(q.r)})`; break; }
      case 8: {
        if (sortedRanks[0] === 14 && sortedRanks[1] === 13) suffix = '(ロイヤル)';
        else if (sortedRanks[0] === 14 && sortedRanks[1] === 5) suffix = '(A-5 ホイール)';
        else suffix = `(${nameOf(sortedRanks[0])} ハイ)`;
        break;
      }
    }
  }
  return `<b class="hl-main ${isStrong ? 'hand-strong' : ''}">${ev.name}${suffix ? ' ' + suffix : ''}</b>`;
}

// 役名の下に表示するキッカー詳細＋強さラベル
function renderCurrentHandKicker() {
  if (state.playerHand.length < 2) return '';
  const all = [...state.playerHand, ...visibleCommunity()];
  if (all.length < 5) return ''; // プリフロップは出さない
  const ev = evaluateHand(all);
  if (!ev.bestFive) return '';
  const nameOf = (r) => RANK_NAMES[r-2];
  const sortedRanks = ev.bestFive.map(c => c.rank).sort((a,b) => b-a);
  const counts = {};
  sortedRanks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const groups = Object.entries(counts)
    .map(([r, n]) => ({ r: +r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);

  let mainInfo = '';     // 役の中身：ペアのランク等
  let kickerLine = '';   // キッカー部分
  let strength = '';

  switch (ev.rank) {
    case 0: { // ハイカード
      const top = sortedRanks[0];
      const ks = sortedRanks.slice(1, 3);
      mainInfo = `${nameOf(top)} ハイ`;
      kickerLine = `キッカー：${ks.map(nameOf).join(' ')}`;
      strength = kickerStrengthLabel(Math.max(top, ks[0]));
      break;
    }
    case 1: { // ワンペア
      const pair = groups.find(g => g.n === 2);
      const ks = sortedRanks.filter(r => r !== pair.r).slice(0, 3);
      mainInfo = `${nameOf(pair.r)}`;
      kickerLine = `キッカー：${ks.map(nameOf).join(' ')}`;
      strength = kickerStrengthLabel(ks[0]);
      break;
    }
    case 2: { // ツーペア
      const pairs = groups.filter(g => g.n === 2).sort((a,b) => b.r - a.r);
      const k = sortedRanks.find(r => r !== pairs[0].r && r !== pairs[1].r);
      mainInfo = `${nameOf(pairs[0].r)} & ${nameOf(pairs[1].r)}`;
      kickerLine = `キッカー：${nameOf(k)}`;
      strength = kickerStrengthLabel(k);
      break;
    }
    case 3: { // スリーカード
      const trip = groups.find(g => g.n === 3);
      const ks = sortedRanks.filter(r => r !== trip.r).slice(0, 2);
      mainInfo = `${nameOf(trip.r)}`;
      kickerLine = `キッカー：${ks.map(nameOf).join(' ')}`;
      strength = kickerStrengthLabel(ks[0]);
      break;
    }
    case 4: { // ストレート
      if (sortedRanks[0] === 14 && sortedRanks[1] === 5) mainInfo = 'A-5（ホイール）';
      else mainInfo = `${nameOf(sortedRanks[0])} ハイ`;
      break;
    }
    case 5: { // フラッシュ
      mainInfo = `${nameOf(sortedRanks[0])} ハイ`;
      break;
    }
    case 6: { // フルハウス
      const trip = groups.find(g => g.n === 3);
      const pair = groups.find(g => g.n === 2);
      mainInfo = `${nameOf(trip.r)} フル ${nameOf(pair.r)}`;
      break;
    }
    case 7: { // フォーカード
      const quad = groups.find(g => g.n === 4);
      const k = sortedRanks.find(r => r !== quad.r);
      mainInfo = `${nameOf(quad.r)}`;
      kickerLine = `キッカー：${nameOf(k)}`;
      strength = kickerStrengthLabel(k);
      break;
    }
    case 8: { // ストレートフラッシュ／ロイヤル
      if (sortedRanks[0] === 14 && sortedRanks[1] === 13) mainInfo = 'ロイヤル';
      else if (sortedRanks[0] === 14 && sortedRanks[1] === 5) mainInfo = 'A-5（ホイール）';
      else mainInfo = `${nameOf(sortedRanks[0])} ハイ`;
      break;
    }
  }

  // mainInfo（内訳ランク）は役名に含めるので、ここではキッカー詳細のみ表示
  if (!kickerLine) return '';
  return `<span class="hk-kicker">${kickerLine}${strength ? `<span class="hk-strength">${strength}</span>` : ''}</span>`;
}

function zazazoLabel(v) {
  // ミミミゲージ：0=無風、1=ミ、2=ミミ、3=ミミミ（読み切り！）
  return ['無風','ミ','ミミ','ミミミ（読み切り！）'][v] || '無風';
}

// === 相手の見た目／雰囲気（読み切り前に表示する観察情報） ===
const OPPONENT_APPEARANCE = {
  rico_tutorial: '🐰 ウサ耳カチューシャ／落ち着いた制服姿／優しい目線',
  polka:   '✨ 派手な装い／いつもニヤニヤ／挑発的な視線',
  selina:  '🌙 上品な銀髪／無表情で観察／所作が綺麗',
  grano:   '💼 商人風スーツ／人当たり良いが目が抜け目ない',
  velvet:  '🍷 妖艶な紫のドレス／視線で射抜く存在感／余裕の微笑',
};
function getOpponentAppearance(id) {
  if (state.seriousRicoMode) return '🐰 ウサ耳がピンと立ち、目つきが鋭い／普段と別人の真剣さ';
  return OPPONENT_APPEARANCE[id] || '——';
}

// === 相手性格データ（ミミミゲージMAXで開示） ===
// 各キャラの「実際のAI挙動」を反映した行動傾向と、それに対する攻略法
const OPPONENT_PERSONALITY = {
  rico_tutorial: {
    icon: '🎓',
    title: '先生気質',
    traits: [
      'ブラフ多めで練習相手をしてくれる',
      'ミミのコールを待ってヒントを出す',
    ],
    exploit: 'チュートリアル中。素直にコールして学ぼう',
  },
  polka: {
    icon: '🔥',
    title: '自信家ブラファー',
    traits: [
      'ブラフ多発（弱い手でも大きく賭ける）',
      '降りない（コール頻度が異常に高い）',
      'ベットサイズが常に大きめ',
    ],
    exploit: '中程度の手でブラフキャッチを狙え。ブラフは絶対通らない、強い手は最大バリュー',
  },
  selina: {
    icon: '🧊',
    title: '冷静な観察者',
    traits: [
      'ブラフ少（手が無い時はチェック）',
      'ドロー警戒で大ベット（フラッシュ/ストレート気配で圧かけ）',
      'ドライボードでは消極的',
    ],
    exploit: 'ドライボードならブラフが通る。ウェットボードの大ベットには真の強手、降りるべし',
  },
  grano: {
    icon: '💰',
    title: '商人気質',
    traits: [
      '損したくない（割が合わなければ即フォールド）',
      'ブラフほぼ無し（賭ける時は手がある）',
      '強い手で罠を仕掛ける（チェック→大レイズ）',
    ],
    exploit: '小ベットで降ろせる場面が多い。チェック後の大ベットは罠、降りるべし',
  },
  velvet: {
    icon: '👁',
    title: '圧支配のディーラー',
    traits: [
      '常に大ベット（標準で2/3ポット以上）',
      '優勢時こそ追い込んでくる',
      'コール頻度は普通、リレイズには真の強手',
    ],
    exploit: '大ベットに動じないこと。中程度でブラフキャッチ、リレイズで揺さぶれば情報が出る',
  },
};
function getOpponentPersonality(id) {
  if (state.seriousRicoMode) {
    return {
      icon: '🐰',
      title: '本気のリコ先輩',
      traits: [
        '全パラメータが最強水準',
        'レンジ分析と圧倒の二段構え',
        'ブラフもバリューも完璧なバランス',
      ],
      exploit: '小細工は通用しない。確率に基づく堅実なプレイが唯一の対抗手段',
    };
  }
  return OPPONENT_PERSONALITY[id] || { icon: '?', title: '???', traits: ['不明'], exploit: '不明' };
}

//=============================================================
// 演出テンポ（射幸性）：「溜め」の3段階
// 原則：通常は今のまま速く流し、期待が乗る1枚だけ引き延ばす。
//       操作へのレスポンスは常に即時、演出はタップでスキップ可。
//=============================================================
let _teaseTimer = null;
let _teaseSkip = null;
let _teaseBeat = null;

// 「本物のドロー」のアウツ数：役のカテゴリがスリーカード(3)以上に上がる残り札を数える。
// ワンペア／ツーペア止まりの改善はドローとみなさない（待たせる価値がないため）
function strongOuts(community) {
  const all = [...state.playerHand, ...community];
  if (all.length < 5) return 0;
  const cur = evaluateHand(all);
  const known = new Set(all.map(c => c.suit + c.rank));
  const SUITS = ['♠','♥','♦','♣'];
  const LABELS = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
  let n = 0;
  for (let r = 2; r <= 14; r++) {
    for (const suit of SUITS) {
      if (known.has(suit + r)) continue;
      const ev = evaluateHand([...all, { rank: r, suit, label: LABELS[r] }]);
      if (ev.rank > cur.rank && ev.rank >= 3) n++;
    }
  }
  return n;
}

// 次に開く札がどれだけ「アツい」か。'normal' | 'reach' | 'hot'
function computeRevealTier(nextCards) {
  try {
    if (!nextCards || !nextCards.length) return 'normal';
    if (state.introHandMode || state.tutorialMode) return 'normal';
    if (save && save.tensionFx === false) return 'normal';
    const community = state.community || [];
    if (community.length < 3) return 'normal';            // フロップまでは溜めない
    if ((state.hotRevealCount || 0) >= 2) return 'reach'; // 激アツは1バトル2回まで
    const before = [...community];
    const after = [...community, ...nextCards];
    const pBefore = evaluateHand([...state.playerHand, ...before]);
    const pAfter  = evaluateHand([...state.playerHand, ...after]);
    const improved = pAfter.rank > pBefore.rank;
    // 勝敗が入れ替わる札か（相手の手は内部的に既知）
    let flips = false;
    if (state.opponentHand && state.opponentHand.length === 2 && before.length + 2 >= 5) {
      const oBefore = evaluateHand([...state.opponentHand, ...before]);
      const oAfter  = evaluateHand([...state.opponentHand, ...after]);
      flips = (pBefore.score > oBefore.score) !== (pAfter.score > oAfter.score);
    }
    // ドローの太さ：ただのペア成立は数えず、ストレート／フラッシュ／スリーカード以上に
    // 届くアウツだけを「本物のドロー」として数える（analyzeDraws はペアも拾うため自前で集計）
    const outs = strongOuts(before);
    // 溜めるのは「本物のドローがある時」だけ。ただのペア成立では待たせない
    const pot = state.pot || 0;
    const bigPot = pot / Math.max(1, state.playerChips + pot) >= 0.25;
    let tier = 'normal';
    if (flips && (outs >= 6 || bigPot)) tier = 'hot';   // 勝敗が入れ替わる1枚＋太いドロー or 大きな山
    else if (outs >= 4) tier = 'reach';                  // ガットショット以上の本物のドロー
    else if (improved && bigPot) tier = 'reach';
    // 同じティアが続いたら1段階短縮（飽き防止）
    if (tier !== 'normal' && tier === state.lastRevealTier) {
      tier = tier === 'hot' ? 'reach' : 'normal';
    }
    state.lastRevealTier = tier;
    if (tier === 'hot') state.hotRevealCount = (state.hotRevealCount || 0) + 1;
    return tier;
  } catch (e) {
    return 'normal'; // 演出判定の失敗はゲーム進行に影響させない
  }
}

// ms 待つ。画面タップで即座にスキップできる（結果は変わらない）
function waitOrSkip(ms) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(_teaseTimer); _teaseTimer = null;
      document.removeEventListener('pointerdown', finish, true);
      _teaseSkip = null;
      resolve();
    };
    _teaseSkip = finish;
    _teaseTimer = setTimeout(finish, ms);
    document.addEventListener('pointerdown', finish, true);
  });
}
function cancelTease() {
  if (_teaseSkip) _teaseSkip();
  stopTeaseHeartbeat();
  document.body.classList.remove('is-tease-reach', 'is-tease-hot');
}

// 溜め中の心音：ティアが上なら速く・強く
function startTeaseHeartbeat(tier) {
  stopTeaseHeartbeat();
  if (!isSfxOn()) return;
  const interval = tier === 'hot' ? 420 : 620;
  const beat = () => {
    if (!isSfxOn()) return;
    _mpSfxScale = sfxVolFloat();
    mpTone(tier === 'hot' ? 62 : 55, 0.11, 'sine', tier === 'hot' ? 0.12 : 0.08);
    mpTone(tier === 'hot' ? 56 : 50, 0.09, 'sine', tier === 'hot' ? 0.09 : 0.06, 0.005, 0.05, 150);
  };
  beat();
  _teaseBeat = setInterval(beat, interval);
}
function stopTeaseHeartbeat() {
  if (_teaseBeat) { clearInterval(_teaseBeat); _teaseBeat = null; }
}

// 場札を公開する。アツい札だけ「裏のまま溜めて」からめくる
function revealCommunity(cards, opts) {
  const o = opts || {};
  const tier = computeRevealTier(cards);
  const from = state.community.length;
  state.community.push(...cards);
  const applyText = () => {
    if (o.thought) state.mimiThought = o.thought();
    if (o.rico) state.ricoAdvice = o.rico;
  };
  if (tier === 'normal') {
    state.pendingRevealFrom = -1;
    applyText();
    render();
    setTimeout(o.done, 900);
    return;
  }
  // 溜め：札は裏のまま、卓を落として期待だけを画面に残す
  state.pendingRevealFrom = from;
  state.mimiThought = tier === 'hot' ? '「……この1枚で、決まる……！」' : '「……来て……！」';
  state.ricoAdvice = '';
  document.body.classList.add(tier === 'hot' ? 'is-tease-hot' : 'is-tease-reach');
  if (tier === 'hot') state.mimiExpr = 'shock';
  render();
  startTeaseHeartbeat(tier);
  if (navigator.vibrate) navigator.vibrate(tier === 'hot' ? [40, 90, 40, 90, 60] : [30, 120, 30]);
  waitOrSkip(tier === 'hot' ? 2400 : 1100).then(() => {
    stopTeaseHeartbeat();
    document.body.classList.remove('is-tease-hot', 'is-tease-reach');
    if (state.screen !== 'battle') return;
    state.pendingRevealFrom = -1;
    if (state.__dealSeen) state.__dealSeen.community = from; // めくりアニメを出す
    applyText();
    mpSfx('flip');
    if (tier === 'hot') { mpSfx('reach'); showRevealBurst(); }
    render();
    setTimeout(o.done, tier === 'hot' ? 1100 : 800);
  });
}

// 勝利の爆発：紙吹雪＋画面が一瞬ズーム（大勝ち・激アツ的中で発動）
function showWinBurst(big) {
  const host = document.querySelector('.battle-screen') || document.body;
  host.classList.add('win-zoom');
  setTimeout(() => host.classList.remove('win-zoom'), 700);
  const n = big ? 44 : 26;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti ' + pick(['cf-gold', 'cf-red', 'cf-white', 'cf-pink']);
    const x = 15 + rand() * 70;
    c.style.cssText = 'left:' + x + '%;animation-delay:' + (rand() * 0.5) + 's;animation-duration:' + (1.1 + rand() * 1.1) + 's;--drift:' + ((rand() - 0.5) * 160) + 'px;--spin:' + ((rand() - 0.5) * 720) + 'deg;';
    host.appendChild(c);
    setTimeout(() => c.remove(), 2800);
  }
}

// 激アツ開放の一瞬の閃光
function showRevealBurst() {
  const host = document.querySelector('.battle-screen') || document.body;
  const el = document.createElement('div');
  el.className = 'reveal-burst';
  host.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

// 溜め中に裏で伏せている札を除いた「プレイヤーが見えている場札」。
// 役名・危険度・勝率など表示系はすべてこれを使う（先読みネタバレ防止）
function visibleCommunity() {
  const c = state.community || [];
  return (state.pendingRevealFrom >= 0) ? c.slice(0, state.pendingRevealFrom) : c;
}

function cardKey(c) { return c ? `${c.suit}${c.rank}` : ''; }
// key: 'community' | 'player' | 'opp' — 既に表示済みの枚数を記憶し、新しく出た札だけ配布アニメを付ける
function renderCardsInto(el, cards, slotCount, key) {
  el.innerHTML = '';
  if (!state.__dealSeen) state.__dealSeen = {};
  const seen = key ? (state.__dealSeen[key] || 0) : cards.length;
  const hl = state.sdHighlight;
  for (let i = 0; i < slotCount; i++) {
    const c = cards[i];
    if (!c) {
      el.insertAdjacentHTML('beforeend', '<div class="card empty"></div>');
    } else {
      const isRed = c.suit === '♥' || c.suit === '♦';
      const isNew = i >= seen;
      // 溜め中：まだ開けていない場札は裏のまま光らせる
      if (key === 'community' && state.pendingRevealFrom >= 0 && i >= state.pendingRevealFrom) {
        el.insertAdjacentHTML('beforeend', '<div class="card card-back tease-card"></div>');
        continue;
      }
      let cls = 'card';
      if (isRed) cls += ' red';
      if (isNew) cls += (key === 'opp' ? ' card-flip' : ' card-deal');
      if (hl) cls += hl.has(cardKey(c)) ? ' highlight sd-win' : ' card-dim';
      el.insertAdjacentHTML('beforeend', `
        <div class="${cls}" style="--di:${isNew ? i - seen : 0}">
          <span class="rank">${c.label}</span>
          <span class="suit">${c.suit}</span>
          <span class="center-suit">${c.suit}</span>
        </div>`);
    }
  }
  if (key) state.__dealSeen[key] = cards.length;
}

// 相手の手札：通常は裏向き、ショーダウンで表向き（めくりアニメ付き）
function renderOpponentHand(el) {
  if (state.opponentRevealed && state.opponentHand && state.opponentHand.length === 2) {
    renderCardsInto(el, state.opponentHand, 2, 'opp');
    el.classList.add('revealed');
  } else {
    el.classList.remove('revealed');
    el.innerHTML = '<div class="card card-back"></div><div class="card card-back"></div>';
  }
}

//=============================================================
// ゲームフィール（演出）ヘルパ：チップ飛行・浮遊数字・ショーダウン吹き出し
//=============================================================
function juiceScale() {
  const st = document.getElementById('stage');
  return st ? Math.max(0.35, st.getBoundingClientRect().width / 1280) : 1;
}
function juiceRect(sel) {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return r;
}
function chipColorClass(amount) {
  if (amount >= 1000) return 'fc-black';
  if (amount >= 500) return 'fc-purple';
  if (amount >= 200) return 'fc-green';
  if (amount >= 100) return 'fc-blue';
  return 'fc-red';
}
// fromSel → toSel へチップが数枚飛ぶ。amount が大きいほど枚数が増える
function flyChips(fromSel, toSel, amount, opts = {}) {
  if (!amount || amount <= 0) return;
  const a = juiceRect(fromSel), b = juiceRect(toSel);
  if (!a || !b) return;
  const sc = juiceScale();
  const n = Math.max(3, Math.min(14, Math.round(Math.sqrt(amount / 20))));
  const size = Math.round(22 * sc);
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2, by = b.top + b.height / 2;
  const color = chipColorClass(amount / n);
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = `fly-chip ${color}`;
    const jx = (rand() - 0.5) * 50 * sc, jy = (rand() - 0.5) * 30 * sc;
    const tx = (rand() - 0.5) * 36 * sc, ty = (rand() - 0.5) * 18 * sc;
    el.style.cssText = `left:${ax + jx - size / 2}px;top:${ay + jy - size / 2}px;width:${size}px;height:${size}px;`;
    document.body.appendChild(el);
    const dx = (bx + tx) - (ax + jx), dy = (by + ty) - (ay + jy);
    const lift = -60 * sc - rand() * 40 * sc;
    const anim = el.animate([
      { transform: 'translate(0,0) scale(0.9)', opacity: 0.95 },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 + lift}px) scale(1.25)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) scale(0.85)`, opacity: 0.9 }
    ], { duration: 420 + rand() * 160, delay: i * 38 + (opts.delay || 0), easing: 'cubic-bezier(.25,.7,.3,1)', fill: 'forwards' });
    anim.onfinish = () => el.remove();
  }
  // チップの着地音（SFX ON時のみ、少量）
  if (isSfxOn()) {
    _mpSfxScale = sfxVolFloat();
    for (let i = 0; i < Math.min(n, 6); i++) mpTone(1800 + rand() * 700, 0.03, 'square', 0.02, 0.001, 0.02, (opts.delay || 0) + 380 + i * 55);
  }
}
// 要素の上に浮かぶ数字（+350 など）
function floatText(sel, text, cls = '') {
  const r = juiceRect(sel); if (!r) return;
  const sc = juiceScale();
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height * 0.3}px;font-size:${Math.round(30 * sc)}px;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
// ショーダウンの勝敗コール（卓の中央に一瞬出る）
function showShowdownCallout(winner, pEv, oEv) {
  document.querySelectorAll('.sd-callout').forEach(e => e.remove());
  const host = document.querySelector('.center-table') || document.getElementById('stage');
  if (!host) return;
  const el = document.createElement('div');
  const cls = winner === 'player' ? 'sd-win' : winner === 'opponent' ? 'sd-lose' : 'sd-split';
  const title = winner === 'player' ? 'ミミの勝ち！' : winner === 'opponent' ? `${state.opponentName || '相手'}の勝ち` : '引き分け';
  const sub = winner === 'player' ? pEv.name : winner === 'opponent' ? oEv.name : `${pEv.name} ＝ ${oEv.name}`;
  el.className = `sd-callout ${cls}`;
  el.innerHTML = `<div class="sd-callout-title">${title}</div><div class="sd-callout-sub">${sub}</div>`;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1500);
  setTimeout(() => el.remove(), 1900);
}
// ハンド開始時に演出状態をリセット
function resetHandJuice() {
  state.__dealSeen = { community: 0, player: 0, opp: 0 };
  state.tellTags = [];
  state.winrateRevealed = false;
  state.pendingRevealFrom = -1;
  state.lastRevealTier = null;
  cancelTease();
  state.opponentRevealed = false;
  state.sdHighlight = null;
  state.opponentThinking = false;
  document.querySelectorAll('.sd-callout').forEach(e => e.remove());
}

function renderPsychStats() {
  // 成功数はミミミゲージで表示済み。連続ボーナス表示も廃止（実質意味が薄いため）
  return '';
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
  if (state.handPhase === 'showdown') {
    el.innerHTML = `<div class="status-note sd-note">ショーダウン！</div>`;
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
    const checkable = need === 0;
    slots = [
      { kind: 'fold', label: 'フォールド',
        subText: checkable ? '不要（チェック可）' : `追加 +0 で離脱`,
        action: 'player-fold', ghost: true, enabled: !checkable },
      { kind: 'callcheck',
        label: checkable ? 'チェック' : 'コール',
        subText: checkable ? '見送り（無料）' : '同額',
        chipAmount: checkable ? 0 : need,
        action: checkable ? 'player-checkcall' : 'player-call', primary: true, enabled: true },
      { kind: 'sm',    label: '小レイズ', subText: '標準 (2.5BB)', chipAmount: bb25, action: 'player-raise', dataSize: '2.5',
        enabled: bb25 > need },
      { kind: 'md',    label: '中レイズ', subText: '強気 (3BB)', chipAmount: bb3,  action: 'player-raise', dataSize: '3',
        enabled: bb3 > need },
      { kind: 'lg',    label: '大レイズ', subText: '圧倒 (4BB)',
        chipAmount: Math.min(200, state.playerChips), action: 'player-raise', dataSize: '4',
        enabled: 200 > need && state.playerChips >= 200 },
      { kind: 'allin', label: 'オールイン', chipAmount: allInAmt, action: 'player-allin',
        enabled: allInAmt > 0, title: '持ちチップ全部を賭ける。' },
    ];
  } else {
    const showBet = need === 0;
    // レイズに必要な最低額（≒コール額＋同等以上）。これに満たない場合は、レイズ枠は「オールイン誘導」表示
    const canFullRaise = need > 0 && state.playerChips > need * 2;
    // レイズではないがオールインで上回ることはできるか
    const canAllInOver = need > 0 && state.playerChips > need;
    // 各サイズが残チップで足りるか
    const fits = (amt) => state.playerChips >= (need + amt);
    // 「サイズ別ボタン」共通の有効・サブテキスト整形
    const sizeSlot = (amount, kind, label, sub, dataSize) => {
      if (showBet) {
        if (state.playerChips >= amount) {
          return { kind, label, subText: sub, chipAmount: amount, action: 'player-bet', dataSize, enabled: true };
        }
        return { kind, label, subText: '→ オールイン', chipAmount: state.playerChips,
                 action: 'player-allin', enabled: state.playerChips > 0 };
      }
      if (canFullRaise && fits(amount)) {
        return { kind, label, subText: sub, chipAmount: amount, action: 'player-bet', dataSize, enabled: true };
      }
      if (canAllInOver) {
        return { kind, label, subText: '→ オールイン', chipAmount: state.playerChips,
                 action: 'player-allin', enabled: true };
      }
      return { kind, label, subText: '⚠ コイン不足', chipAmount: 0, enabled: false };
    };
    slots = [
      { kind: 'fold', label: 'フォールド',
        subText: need > 0 ? `追加 +0 で離脱` : '見送り',
        action: 'player-fold', ghost: true, enabled: true },
      { kind: 'callcheck',
        label: need > 0 ? 'コール' : 'チェック',
        subText: need > 0 ? null : '見送り',
        chipAmount: need > 0 ? need : 0,
        action: 'player-checkcall', primary: true, enabled: true },
      sizeSlot(half,     'sm', '1/2ポット', '標準',   'pot_1_2'),
      sizeSlot(twoThird, 'md', '2/3ポット', '強気',   'pot_2_3'),
      sizeSlot(potBet,   'lg', 'ポット',     '最大圧', 'pot_1'),
      { kind: 'allin', label: 'オールイン', chipAmount: allInAmt, action: 'player-allin',
        enabled: allInAmt > 0, title: '持ちチップ全部。最大の圧。' },
    ];
  }

  // P2: 3ハンドの初日研修は、ハンドごとに選べる行動を絞る（没入・迷いのない導線）
  if (state.introHandMode) {
    if (state.introHandNo === 2) {
      // Hand2「引き際」：フォールドだけが有効。降りるのも勝ちと教える
      slots = slots.map(s => s.kind === 'fold'
        ? { ...s, enabled: true, subText: '降りるのも勝ち' }
        : { ...s, enabled: false });
    } else {
      // Hand1「そろえる」：大きく行く2択だけに絞る（Hand3は心理バトル経由で自動進行するため未使用）
      slots = slots.map(s => {
        if (s.kind === 'lg')    return { ...s, label: '大レイズ', subText: '大きく行こう！' };
        if (s.kind === 'allin') return s;
        return { ...s, enabled: false };
      });
    }
  }

  el.innerHTML = `<div class="action-grid">${slots.map(s => {
    const chipHtml = (s.chipAmount && s.chipAmount > 0)
      ? `<span class="slot-chips">${buildHorizontalChips(s.chipAmount, 'small', 'slot-chip-num', 'bu-rchip-tiny')}</span>`
      : '';
    const subHtml = s.subText ? `<small class="slot-sub">${s.subText}</small>` : '';
    return `
      <button
        class="btn action-slot slot-${s.kind} ${s.primary ? 'btn-primary primary-action' : s.ghost ? 'btn-ghost' : 'btn-secondary'}"
        ${s.enabled ? `data-action="${s.action}"` : 'disabled'}
        ${s.dataSize ? `data-size="${s.dataSize}"` : ''}>
        <span class="slot-label">${s.label}</span>
        ${subHtml}
        ${chipHtml}
      </button>
    `;
  }).join('')}</div>`;
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
  // スマホ：軽い触覚フィードバック（連打用に短く）
  if (navigator.vibrate) {
    try { navigator.vibrate(12); } catch(_) {}
  }
  // 任意のアクションでカットインを閉じる
  dismissCutIn();
  switch (action) {
    case 'start':
      // P2: 初回起動（未クリア＆体験ハンド未消化）はロビーではなく体験ハンドへ直行
      if (save.clearedStages.length === 0 && !save.introPlayed) { startIntroHand(); }
      else { goLobby(); }
      break;
    case 'intro-to-lecture':
      document.querySelector('.intro-win-overlay')?.remove();
      startBattle('rico_tutorial');
      break;
    case 'intro-to-lobby':
      document.querySelector('.intro-win-overlay')?.remove();
      goLobby();
      break;
    case 'new-game':
      showNewGameModal();
      break;
    case 'new-game-full':
      localStorage.removeItem(SAVE_KEY);
      save = defaultSave();
      state = defaultState();
      const ovF = document.querySelector('.newgame-overlay'); if (ovF) ovF.remove();
      render();
      break;
    case 'new-game-keep-coins': {
      const keepCoins = save.coins;
      const keepOwned = [...(save.ownedItems || [])];
      const keepGauge = save.panyuGaugeMax;
      const keepSkills = { ...(save.panyuSkills || {}) };
      const keepUnlockedNotes = [...(save.unlockedNotes || [])];
      save = defaultSave();
      save.coins = keepCoins;
      save.ownedItems = keepOwned;
      save.panyuGaugeMax = keepGauge || 100;
      save.panyuSkills = keepSkills;
      save.unlockedNotes = keepUnlockedNotes;
      saveProgress();
      state = defaultState();
      const ovK = document.querySelector('.newgame-overlay'); if (ovK) ovK.remove();
      render();
      break;
    }
    case 'newgame-cancel': {
      const ov = document.querySelector('.newgame-overlay'); if (ov) ov.remove();
      break;
    }
    case 'skip-stage': skipStageWithCoins(data.opponent); break;
    case 'back-title':    stopEndingBgm(); state = defaultState(); render(); break;
    case 'back-lobby': {
      stopEndingBgm();
      // ショップから出る瞬間にここまで見た商品を seen マーク（NEW表示はショップ内では消えない）
      if (state.screen === 'shop') markShopItemsSeen();
      goLobby();
      break;
    }
    case 'open-shop': {
      const newCount = newItemCount();
      state.screen = 'shop';
      render();
      if (newCount > 0) {
        toast(`🎴 新商品 ${newCount} 件入荷！`);
      }
      // ※ markShopItemsSeen はショップを出る時に実行（NEWマークがショップ内で消えるバグの修正）
      break;
    }
    case 'reset-save':    resetProgress(); break;
    case 'buy-item':      buyItem(data.itemId); break;
    case 'battle-start':  startBattle(data.opponent); break;
    case 'rico-mode-chooser': showRicoModeChooser(); break;
    case 'open-rico-viewer':
      if (!isRicoViewerUnlocked()) {
        alert('🔒 リコ先輩鑑賞モードは、ヴェルベット撃破後（エンディング達成後）に解放されます。');
        break;
      }
      showRicoViewer();
      break;
    case 'char-profile': {
      // 立ち絵クリック → キャラクター名鑑。__opponent__ は現在の対戦相手に解決
      let cid = data.char;
      if (cid === '__opponent__') cid = state.opponentId;
      if (cid) showCharacterProfile(cid);
      break;
    }
    case 'open-collection':
      showCollectionModal();
      break;
    case 'open-glossary': showGlossaryModal(); break;
    case 'show-about':    showAboutModal(); break;
    case 'share-game':    shareGame(); break;
    case 'view-memory': {
      const id = e.currentTarget?.dataset?.memoryId || e.target?.closest('[data-memory-id]')?.dataset?.memoryId;
      if (id) showMemoryViewer(id);
      break;
    }
    case 'equip-change': showEquipModal(); break;
    case 'open-history': showHandHistoryModal(); break;
    case 'history-close': {
      const ov = document.querySelector('.hand-history-overlay'); if (ov) ov.remove();
      break;
    }
    case 'glossary-close': {
      const ov = document.querySelector('.glossary-overlay'); if (ov) ov.remove();
      break;
    }
    case 'collection-close': {
      const ov = document.querySelector('.collection-overlay'); if (ov) ov.remove();
      break;
    }
    case 'rico-viewer-close': {
      const ov = document.querySelector('.rico-viewer-overlay'); if (ov) ov.remove();
      break;
    }
    case 'rico-viewer-next': {
      const outfits = RICO_OUTFITS;
      state.lobbyRicoIndex = ((state.lobbyRicoIndex || 0) + 1) % outfits.length;
      const ov = document.querySelector('.rico-viewer-overlay'); if (ov) ov.remove();
      showRicoViewer();
      // ロビーUIにも反映
      const img = document.querySelector('[data-bind="lobbyRicoImg"]');
      const lbl = document.querySelector('[data-bind="lobbyRicoOutfit"]');
      const cur = outfits[state.lobbyRicoIndex];
      if (img) img.src = 'assets/characters/' + cur.file;
      if (lbl) lbl.textContent = cur.label;
      break;
    }
    case 'rico-viewer-prev': {
      const outfits = RICO_OUTFITS;
      state.lobbyRicoIndex = ((state.lobbyRicoIndex || 0) - 1 + outfits.length) % outfits.length;
      const ov = document.querySelector('.rico-viewer-overlay'); if (ov) ov.remove();
      showRicoViewer();
      const img = document.querySelector('[data-bind="lobbyRicoImg"]');
      const lbl = document.querySelector('[data-bind="lobbyRicoOutfit"]');
      const cur = outfits[state.lobbyRicoIndex];
      if (img) img.src = 'assets/characters/' + cur.file;
      if (lbl) lbl.textContent = cur.label;
      break;
    }
    case 'rico-mode-tutorial': {
      const ov = document.querySelector('.rico-mode-overlay'); if (ov) ov.remove();
      startBattle('rico_tutorial');
      break;
    }
    case 'rico-mode-serious': {
      const ov = document.querySelector('.rico-mode-overlay'); if (ov) ov.remove();
      window.__ricoSeriousMode = true;
      startBattle('rico_tutorial');
      break;
    }
    case 'rico-mode-cancel': {
      const ov = document.querySelector('.rico-mode-overlay'); if (ov) ov.remove();
      break;
    }
    case 'battle-rico-serious': window.__ricoSeriousMode = true; startBattle('rico_tutorial'); break;
    case 'rico-skip-tutorial': {
      // 講義を飛ばしていきなりリコ先輩と通常対戦（チュートリアル経験者向け）
      window.__ricoSkipLecture = true;
      startBattle('rico_tutorial');
      break;
    }
    case 'start-hand':    startHand(); break;
    case 'intro-skip':    introHandSkip(); break;
    case 'show-hand-guide': showHandGuide(); break;
    case 'player-fold':   if (state.introHandMode) introHandFold(); else playerFold(); break;
    case 'player-call':   playerCall(); break;
    case 'player-checkcall': playerCheckCall(); break;
    case 'player-raise':  playerRaise(+data.size); break;
    case 'player-bet':    playerBet(data.size); break;
    case 'player-allin':  playerAllIn(); break;
    case 'rematch':
      // 本気リコモードを引き継ぐ（直前のバトルが本気だったら再戦も本気）
      if (state.opponentId === 'rico_tutorial' && state.seriousRicoMode) {
        window.__ricoSeriousMode = true;
      }
      startBattle(state.opponentId);
      break;
    case 'go-ending':
      showEpisodeTitle('ending', () => { state.screen = 'ending'; render(); });
      break;
    case 'recall-episode':
      showEpisodeTitle(data.episode, null);
      break;
    case 'go-intermission': {
      // リザルトの主ボタン「幕間へ」→会話→ご褒美CG開放。終わったら通常の勝利ボタン群を組み立て直す
      const oid = data.opponent || state.opponentId;
      showIntermission(oid, () => { renderWonResultButtons(); });
      break;
    }
    case 'view-reward-cg': {
      const cgId = e.currentTarget?.dataset?.cgId;
      if (cgId) showRewardCgViewer(cgId);
      break;
    }
    case 'use-panyu-sense': usePanyuSense(); break;
    case 'panyu-free': {
      // 連打で裏モード解放（クリア後限定）
      if (isEndingUnlocked() && !save.backdoorUnlocked) {
        state.__panyuClickCount = (state.__panyuClickCount || 0) + 1;
        if (state.__panyuClickCount >= 7) {
          save.backdoorUnlocked = true;
          saveProgress();
          alert('🐰✦ 裏モード解放！ ✦🐰\n\nバトル画面右上の ✦ ボタンで\n相手の手と心理を覗き見できます');
        }
      }
      // ぷにぷに完走でコイン報酬（panyu_combo_x2 購入時は2倍）
      showPanyuClicker(30, () => {
        const base = 30;
        const mul = save.panyuComboMultiplier || 1;
        const reward = base * mul;
        save.coins += reward;
        saveProgress();
        const coinsEl = document.querySelector('[data-bind="saveCoins"]');
        if (coinsEl) coinsEl.textContent = save.coins;
        toast(mul > 1 ? `+${reward}コイン（コンボ倍率 ×${mul}）` : `+${reward}コイン`);
      });
      break;
    }
    case 'toggle-bgm':    toggleLobbyBgm(); break;
    case 'toggle-audio-all': toggleAllAudio(); break;
    case 'toggle-sfx':    toggleSfx(); mpSfx('tap'); /* 確認音 */ break;
    case 'toggle-psych':  save.psychEnabled = !(save.psychEnabled !== false); saveProgress(); applyBindings(); break;
    case 'toggle-logic':  save.logicEnabled = !(save.logicEnabled !== false); saveProgress(); applyBindings(); break;
    case 'open-settings': showSettingsModal(); break;
    case 'play-ending':   state.screen = 'ending'; render(); break;
    case 'play-ending-theme': toggleEndingThemePreview(); break;
    case 'play-minipoker': showMiniPokerGame(); break;
    case 'toggle-v2-detail': {
      const panel = document.querySelector('.v2-detail');
      if (panel) panel.classList.toggle('open');
      break;
    }
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
function showEndingMusicPrompt() {
  const stage = document.getElementById('stage');
  if (!stage) { startEndingShow(false); return; }
  // 既存の演出ステージは一旦空に
  const endStage = document.getElementById('ending-stage');
  if (endStage) endStage.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'ending-prompt-overlay';
  const curVol = save.bgmVolume != null ? save.bgmVolume : 35;
  overlay.innerHTML = `
    <div class="ending-prompt-modal">
      <div class="ending-prompt-title">— 終幕の前に —</div>
      <div class="ending-prompt-sub">エンディングテーマを流しますか？</div>
      <div class="ending-prompt-song">♪ ポーカーフェイスの終わり〜変な件〜</div>
      <div class="ending-prompt-vol-row">
        <span class="ending-prompt-vol-label">🔊 音量</span>
        <input class="ending-prompt-vol" type="range" min="0" max="100" step="1" value="${curVol}">
        <span class="ending-prompt-vol-num">${curVol}</span>
      </div>
      <div class="ending-prompt-actions">
        <button class="btn btn-primary" id="ending-with-music">▶ 流す</button>
        <button class="btn btn-secondary" id="ending-without-music">🔇 流さない</button>
      </div>
    </div>
  `;
  stage.appendChild(overlay);
  const sl = overlay.querySelector('.ending-prompt-vol');
  const num = overlay.querySelector('.ending-prompt-vol-num');
  sl.addEventListener('input', (e) => {
    save.bgmVolume = +e.target.value;
    saveProgress();
    applyBgmVolume();
    num.textContent = e.target.value;
    document.querySelectorAll('.audio-bar-volume').forEach(v => v.value = save.bgmVolume);
  });
  overlay.querySelector('#ending-with-music').addEventListener('click', () => {
    overlay.remove();
    startEndingShow(true);
  });
  overlay.querySelector('#ending-without-music').addEventListener('click', () => {
    overlay.remove();
    startEndingShow(false);
  });
}

function startEndingShow(playMusic) {
  const stage = document.getElementById('ending-stage');
  if (!stage) return;
  stage.innerHTML = '';
  // ロビーBGMは常に止める
  const lobbyA = document.getElementById('lobby-bgm-audio');
  if (lobbyA) lobbyA.pause();
  // 主題歌は引数で制御
  const endA = document.getElementById('ending-bgm-audio');
  if (endA) {
    if (playMusic) {
      endA.currentTime = 0;
      endA.volume = Math.min(1, bgmVolFloat() * 1.6);
      endA.play().catch(()=>{});
    } else {
      endA.pause();
    }
  }
  // 星空＋光の粒子背景
  const bg = document.createElement('div');
  bg.className = 'ending-bg';
  stage.appendChild(bg);
  const stars = document.createElement('div');
  stars.className = 'ending-stars';
  stage.appendChild(stars);
  let cancelled = false;

  // 右上：スキップピルのみ（音量バーはエンディングでは表示しない＝没入優先）
  const skipCtl = document.createElement('button');
  skipCtl.className = 'ec-btn ec-skip ec-pill ec-pos-right';
  skipCtl.title = 'スキップ';
  skipCtl.textContent = 'スキップ ▶▶';
  stage.appendChild(skipCtl);
  const skip = skipCtl;
  skip.addEventListener('click', () => {
    // スキップは即時ロビー帰還（finale演出もスタッフロールもバイパス）
    cancelled = true;
    // 音楽を止める
    const endA = document.getElementById('ending-bgm-audio');
    if (endA) endA.pause();
    // ロビーへ
    goLobby();
  });

  // ===== 映画的エンディング：味わって楽しむ、ゆったり構成 =====
  const acts = [
    // ── 序章 ──
    { type: 'black-fade', text: '——あの夜、VIPルームの最奥で——', wait: 4400 },

    // ── 第1幕：女王、玉座を降りる ──（velvet.png をキープ、セリフ2発）
    { type: 'keyart', img: 'velvet', name: 'ヴェルベット',
      text: '……新人さんに、こんな夜をいただくとは。', wait: 6200 },
    { type: 'keyart', img: 'velvet', name: 'ヴェルベット',
      text: '玉座は揺るがぬものと、信じていた。<br>今夜、私は知ったの。<br>——揺るがぬものなど、ない。', wait: 8000 },

    // ── 第2幕：敗者たちの敬意 ──
    { type: 'keyart', img: 'grano', name: 'グラーノ',
      text: '商人として、申し上げる。<br>お嬢さんの判断は、利得を超えていた。<br>——あれは、美しかった。', wait: 7400 },

    { type: 'keyart', img: 'selina', name: 'セリナ',
      text: 'ボードは、嘘をつかない。<br>けれど……心は、読み切れるものね。<br>羨ましいくらいに。', wait: 7200 },

    { type: 'keyart', img: 'polka', name: 'ポルカ',
      text: 'うう、悔しい！<br>でも……うん、覚えとくから。<br>あなたの強さ、ぜったい、次は超えてやるんだから！', wait: 6800 },

    // ── 第3幕：師の祝福 ──
    { type: 'portrait', img: 'rico_ending', fallback: 'rico_default', name: 'リコ先輩',
      text: 'やるじゃん、ミミ。', wait: 3800 },
    { type: 'portrait', img: 'rico_ending', fallback: 'rico_default', name: 'リコ先輩',
      text: 'ねえ、今日って……あなたの、初日でしょう？<br>こんな新人、聞いたこともない。',
      wait: 6400 },

    // ── 第4幕：主人公の独白（明るいコメディ調。ぱにゅぱにゅは結局意味なかった） ──
    { type: 'portrait', img: 'mimi_ending', fallback: 'mimi_default', name: 'ミミ',
      text: '「外れスキル《ぱにゅぱにゅ》」<br>——それが、今朝のわたしに与えられた、評価でした。',
      wait: 6200 },
    { type: 'portrait', img: 'mimi_ending', fallback: 'mimi_default', name: 'ミミ',
      text: 'ぱにゅぱにゅ……一生懸命、発動したんですよ？',
      wait: 4400 },
    { type: 'portrait', img: 'mimi_ending', fallback: 'mimi_default', name: 'ミミ',
      text: '……でも、振り返ってみて、気づきました。<br>このスキル、結局、<br>あんまり意味なかったかも？',
      wait: 6400 },
    { type: 'portrait', img: 'mimi_ending', fallback: 'mimi_default', name: 'ミミ',
      text: 'でも、楽しかった（意味深）', wait: 6200, afterglow: 5200, keepCaption: true },

    // ── 終章：余韻ナレーション ──
    { type: 'keyart', img: 'ending', name: null,
      text: 'これは、外れスキルを抱いた少女が、<br>世界の頂に手をかける物語の、<br>——ほんの、はじまり。',
      wait: 8400, narr: true },
  ];

  let idx = 0;
  function nextAct() {
    if (cancelled) return;
    if (idx >= acts.length) { finale(); return; }
    const a = acts[idx++];
    runAct(a, () => setTimeout(nextAct, 200));
  }

  function runAct(a, done) {
    if (a.type === 'fade-text' || a.type === 'black-fade') {
      const el = document.createElement('div');
      el.className = `ending-narration ${a.cls || ''} ${a.type === 'black-fade' ? 'black-fade' : ''}`;
      el.innerHTML = a.text;
      stage.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 600);
        done();
      }, a.wait);
    } else if (a.type === 'keyart') {
      // 同じ画像の連続シーンは「キャプションだけ差替」でガタつき防止
      const prev = stage.querySelector('.ending-keyart:not(.out)');
      if (prev && prev.dataset.img === a.img) {
        const cap = prev.querySelector('.ek-caption');
        cap.classList.add('cap-out');
        setTimeout(() => {
          cap.className = `ek-caption ${a.narr ? 'narr' : ''}`;
          cap.innerHTML = `
            ${a.name ? `<div class="ek-name">${a.name}</div>` : ''}
            <div class="ek-text">${a.text}</div>
          `;
        }, 450);
        setTimeout(() => {
          const nx = acts[idx];
          if (!(nx && nx.type === 'keyart' && nx.img === a.img)) {
            // 余韻：キャプションだけ先消し（image-only afterglow）→ done() で次シーン誘発
            prev.classList.add('caption-out');
            setTimeout(done, 2200);
            // wrap本体は次シーンが .out を付けてフェードさせる（ここでは消さない）
          } else {
            done();
          }
        }, a.wait);
        return;
      }
      // 新規キーアート：作る前に「直前シーン」を out にして 1.6s クロスフェード開始
      stage.querySelectorAll('.ending-keyart:not(.out), .ending-portrait-scene:not(.out)').forEach(el => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 1800);
      });
      const wrap = document.createElement('div');
      wrap.className = 'ending-keyart';
      wrap.dataset.img = a.img;
      wrap.innerHTML = `
        <div class="ek-img-frame">
          <img class="ek-img" src="assets/episodes/${a.img}.png" alt=""
               onerror="this.style.display='none'; this.parentElement.classList.add('ek-fallback');">
        </div>
        <div class="ek-vignette"></div>
        <div class="ek-caption ${a.narr ? 'narr' : ''}">
          ${a.name ? `<div class="ek-name">${a.name}</div>` : ''}
          <div class="ek-text">${a.text}</div>
        </div>
      `;
      stage.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('show'));
      setTimeout(() => {
        const nx = acts[idx];
        if (nx && nx.type === 'keyart' && nx.img === a.img) {
          done();
          return;
        }
        // 余韻：キャプションのみフェード（絵は残る）。done() を 2.2s 遅延して次シーンを起こす。
        // 次シーン側が wrap.classList.add('out') してくれるので、ここでは消さない。
        wrap.classList.add('caption-out');
        setTimeout(done, 2200);
      }, a.wait);
    } else if (a.type === 'portrait' || a.type === 'speaker') {
      // 同じキャラの連続セリフは「立ち絵そのまま」「キャプションだけ差替」で会話風に
      const prevP = stage.querySelector('.ending-portrait-scene:not(.out)');
      if (prevP && prevP.dataset.img === a.img) {
        const cap = prevP.querySelector('.ek-caption');
        // キャプション部のみフェードアウト → 中身差替 → フェードイン
        cap.classList.add('cap-out');
        prevP.classList.remove('caption-out'); // 前ターンの余韻クラスは除去
        setTimeout(() => {
          cap.classList.remove('cap-out');
          cap.innerHTML = `
            ${a.name ? `<div class="ek-name">${a.name}</div>` : ''}
            <div class="ek-text">${a.text}</div>
          `;
        }, 450);
        const afterglowMs = (typeof a.afterglow === 'number') ? a.afterglow : 2200;
        setTimeout(() => {
          const nx = acts[idx];
          if (!(nx && (nx.type === 'portrait' || nx.type === 'speaker') && nx.img === a.img)) {
            // keepCaption: テキストは残したまま余韻、そうでなければキャプションだけ先消し
            if (!a.keepCaption) prevP.classList.add('caption-out');
            setTimeout(done, afterglowMs);
          } else {
            done();
          }
        }, a.wait);
        return;
      }
      // 新規立ち絵：直前シーンをクロスフェードで送り出す
      stage.querySelectorAll('.ending-keyart:not(.out), .ending-portrait-scene:not(.out)').forEach(el => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 1800);
      });
      // 立ち絵を中央に大きく＋台詞バンド
      const wrap = document.createElement('div');
      wrap.className = `ending-portrait-scene portrait-${a.img}`;
      wrap.dataset.img = a.img;
      const imgPath = a.type === 'speaker'
        ? `assets/characters/${a.img}_default.png`
        : `assets/characters/${a.img}.png`;
      const fallbackPath = a.fallback ? `assets/characters/${a.fallback}.png` : '';
      // onerror で fallback に切り替え、それでも駄目なら assetFallback で絵文字
      const fallbackInline = a.fallback
        ? `this.onerror=function(){this.onerror=null;window.assetFallback(this,this.src.split('/').pop().replace('.png','').split('_')[0])};this.src='${fallbackPath}';`
        : `this.onerror=null;window.assetFallback(this,this.src.split('/').pop().replace('.png','').split('_')[0])`;
      wrap.innerHTML = `
        <div class="eps-portrait-frame">
          <img class="eps-portrait" src="${imgPath}" alt="${a.name || ''}"
               onerror="${fallbackInline}">
        </div>
        <div class="ek-caption">
          ${a.name ? `<div class="ek-name">${a.name}</div>` : ''}
          <div class="ek-text">${a.text}</div>
        </div>
      `;
      stage.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('show'));
      const afterglowMs = (typeof a.afterglow === 'number') ? a.afterglow : 2200;
      setTimeout(() => {
        const nx = acts[idx];
        if (nx && (nx.type === 'portrait' || nx.type === 'speaker') && nx.img === a.img) {
          done();
          return;
        }
        if (!a.keepCaption) wrap.classList.add('caption-out');
        setTimeout(done, afterglowMs);
      }, a.wait);
    }
  }

  function finale() {
    if (skip) skip.style.display = 'none';
    // 余韻ナレーションが out → 透明 → 静かに片付け（一瞬の絵チラつき防止）
    const lingering = stage.querySelectorAll(
      '.ending-speaker, .ending-narration, .ending-keyart, .ending-portrait-scene'
    );
    lingering.forEach(el => {
      el.classList.add('out');
      el.style.transition = 'opacity 1.2s ease';
      el.style.opacity = '0';
    });
    setTimeout(() => lingering.forEach(e => e.remove()), 1300);
    // 黒幕を一枚敷いて、そのままスタッフロールへ（余計なキービジュアルは出さない）
    const blackOut = document.createElement('div');
    blackOut.className = 'ending-blackout';
    blackOut.style.cssText = 'position:absolute;inset:0;background:#000;z-index:3;opacity:0;transition:opacity 1.2s ease;';
    stage.appendChild(blackOut);
    requestAnimationFrame(() => { blackOut.style.opacity = '1'; });
    // ナレーション余韻 → 黒 → スタッフロール
    setTimeout(() => startCreditsRoll(stage), 1600);
  }

  // 開始
  setTimeout(nextAct, 400);
}

// スタッフロール
const CREDITS = [
  { type: 'title', text: '— STAFF —' },
  { type: 'section', text: '原案 / Original Concept' },
  { role: '原案', name: 'あいかわ' },
  { role: '企画', name: 'あいかわ' },
  { role: 'プロデュース', name: 'あいかわ' },
  { type: 'gap' },

  { type: 'section', text: 'アート / Art' },
  { role: 'キャラクター原案', name: 'ChatGPT' },
  { role: 'キャラクターデザイン', name: 'ChatGPT' },
  { role: 'ミミ立ち絵', name: 'ChatGPT' },
  { role: 'リコ先輩立ち絵（全11衣装）', name: 'ChatGPT' },
  { role: 'ポルカ立ち絵', name: 'ChatGPT' },
  { role: 'セリナ立ち絵', name: 'ChatGPT' },
  { role: 'グラーノ立ち絵', name: 'ChatGPT' },
  { role: 'ヴェルベット立ち絵', name: 'ChatGPT' },
  { role: 'タイトルロゴ', name: 'ChatGPT' },
  { role: 'エピソード一枚絵', name: 'ChatGPT' },
  { role: 'UI アセット', name: 'ChatGPT' },
  { role: 'チップアイコン（4色）', name: 'ChatGPT' },
  { role: 'ポット画像', name: 'ChatGPT' },
  { role: 'テーブルフェルト', name: 'ChatGPT' },
  { role: '羊皮紙バナー', name: 'ChatGPT' },
  { role: 'アクションボタンフレーム', name: 'ChatGPT' },
  { role: 'カード裏面', name: 'ChatGPT' },
  { role: '背景イラスト', name: 'ChatGPT' },
  { type: 'gap' },

  { type: 'section', text: 'シナリオ / Scenario' },
  { role: 'メインシナリオ', name: 'ChatGPT' },
  { role: 'キャラクター設定', name: 'ChatGPT' },
  { role: '台詞執筆', name: 'ChatGPT' },
  { role: '心理バトル問題作成', name: 'ChatGPT' },
  { role: '論理バトル問題作成', name: 'ChatGPT' },
  { role: '講義テキスト（全35問）', name: 'ChatGPT' },
  { role: 'エピソードタイトル文', name: 'ChatGPT' },
  { role: 'エンディング脚本', name: 'ChatGPT' },
  { role: 'リコ先輩衣装別セリフ', name: 'ChatGPT' },
  { role: 'プロローグ', name: 'ChatGPT' },
  { type: 'gap' },

  { type: 'section', text: '音楽 / Music' },
  { role: 'ロビーBGM 作曲', name: 'Suno' },
  { role: 'ロビーBGM 編曲', name: 'Suno' },
  { role: 'エンディング主題歌「ポーカーフェイスの終わり〜変な件〜」作詞', name: 'Suno' },
  { role: '主題歌 作曲', name: 'Suno' },
  { role: '主題歌 編曲', name: 'Suno' },
  { role: '主題歌 歌唱', name: 'Suno' },
  { role: '主題歌 ミキシング', name: 'Suno' },
  { type: 'gap' },

  { type: 'section', text: '総監督 / Direction' },
  { role: '総監督', name: 'ClaudeCode' },
  { role: '副総監督', name: 'ClaudeCode' },
  { role: 'チーフディレクター', name: 'ClaudeCode' },
  { role: 'アシスタントディレクター', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'プログラム / Programming' },
  { role: 'プログラム設計', name: 'ClaudeCode' },
  { role: 'メインプログラム', name: 'ClaudeCode' },
  { role: 'ゲームシステム設計', name: 'ClaudeCode' },
  { role: 'ポーカーエンジン実装', name: 'ClaudeCode' },
  { role: '役判定アルゴリズム', name: 'ClaudeCode' },
  { role: 'AI戦略実装', name: 'ClaudeCode' },
  { role: 'AI性格パラメータ調整', name: 'ClaudeCode' },
  { role: '心理バトルシステム', name: 'ClaudeCode' },
  { role: '論理バトルシステム', name: 'ClaudeCode' },
  { role: '連続正解システム', name: 'ClaudeCode' },
  { role: '裏モード設計', name: 'ClaudeCode' },
  { role: '真剣リコ実装', name: 'ClaudeCode' },
  { role: '本気モード分岐', name: 'ClaudeCode' },
  { role: '状況分析パネル', name: 'ClaudeCode' },
  { role: 'ポットオッズ計算', name: 'ClaudeCode' },
  { role: 'SPR算出', name: 'ClaudeCode' },
  { role: 'ボード危険度判定', name: 'ClaudeCode' },
  { role: 'チップ計算', name: 'ClaudeCode' },
  { role: 'バランス調整', name: 'ClaudeCode' },
  { role: 'スコアリングシステム', name: 'ClaudeCode' },
  { role: 'ランク判定', name: 'ClaudeCode' },
  { role: 'セーブ／ロードシステム', name: 'ClaudeCode' },
  { role: 'localStorage 管理', name: 'ClaudeCode' },
  { role: 'プリロードシステム', name: 'ClaudeCode' },
  { role: 'ローディング画面', name: 'ClaudeCode' },
  { role: 'BGM制御', name: 'ClaudeCode' },
  { role: '音量制御', name: 'ClaudeCode' },
  { role: 'バグ修正', name: 'ClaudeCode' },
  { role: 'リファクタリング', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'UI/UX / Design Implementation' },
  { role: 'UI/UX設計', name: 'ClaudeCode' },
  { role: 'レイアウト設計', name: 'ClaudeCode' },
  { role: 'CSS実装', name: 'ClaudeCode' },
  { role: 'ロビーシステム', name: 'ClaudeCode' },
  { role: 'ステージ選択', name: 'ClaudeCode' },
  { role: 'バトル画面構築', name: 'ClaudeCode' },
  { role: 'ショップシステム', name: 'ClaudeCode' },
  { role: '交換所カテゴリ管理', name: 'ClaudeCode' },
  { role: 'モーダルシステム', name: 'ClaudeCode' },
  { role: 'チップ拡張選択', name: 'ClaudeCode' },
  { role: 'スキップシステム', name: 'ClaudeCode' },
  { role: 'スマホ対応', name: 'ClaudeCode' },
  { role: 'レスポンシブデザイン', name: 'ClaudeCode' },
  { role: 'ブラウザ互換性', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: '演出 / Effects & Animation' },
  { role: 'アニメーション設計', name: 'ClaudeCode' },
  { role: 'カットイン演出', name: 'ClaudeCode' },
  { role: '圧倒モード演出', name: 'ClaudeCode' },
  { role: '闘札仕留め 演出', name: 'ClaudeCode' },
  { role: 'ブラフブレイク 演出', name: 'ClaudeCode' },
  { role: 'オールイン カットイン', name: 'ClaudeCode' },
  { role: 'エンディング演出', name: 'ClaudeCode' },
  { role: 'タイトルロゴ落下', name: 'ClaudeCode' },
  { role: 'スタッフロール構成', name: 'ClaudeCode' },
  { role: 'ぱにゅぱにゅミニゲーム', name: 'ClaudeCode' },
  { role: 'チップ可視化', name: 'ClaudeCode' },
  { role: 'エピソードタイトル演出', name: 'ClaudeCode' },
  { role: 'パーティクル演出', name: 'ClaudeCode' },
  { role: 'バイブレーション制御', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'コンテンツ / Content' },
  { role: 'チュートリアルフロー', name: 'ClaudeCode' },
  { role: '講義モード実装', name: 'ClaudeCode' },
  { role: 'ランダム衣装システム', name: 'ClaudeCode' },
  { role: 'キャラセリフ振分け', name: 'ClaudeCode' },
  { role: 'エピソードカード生成', name: 'ClaudeCode' },
  { role: '戦術ノート', name: 'ClaudeCode' },
  { role: 'アチーブメント検出', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'QA / Testing' },
  { role: 'デバッグ', name: 'ClaudeCode' },
  { role: 'バランステスト', name: 'ClaudeCode' },
  { role: 'AI監査', name: 'ClaudeCode' },
  { role: '整合性チェック', name: 'ClaudeCode' },
  { role: 'リグレッション対応', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'インフラ / Infrastructure' },
  { role: 'デプロイ管理', name: 'ClaudeCode' },
  { role: 'GitHub Pages 設定', name: 'ClaudeCode' },
  { role: 'GitHub Actions 設定', name: 'ClaudeCode' },
  { role: 'バージョン管理', name: 'ClaudeCode' },
  { role: 'コミットメッセージ作成', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'section', text: 'プロジェクトマネジメント / PM' },
  { role: 'プロジェクト管理', name: 'ClaudeCode' },
  { role: 'タスク分割', name: 'ClaudeCode' },
  { role: '要件整理', name: 'ClaudeCode' },
  { role: 'ユーザー対話', name: 'ClaudeCode' },
  { role: '監修対応', name: 'ClaudeCode' },
  { type: 'gap' },

  { type: 'small', text: '※ほぼ全部AIですが、原案の あいかわ さんの企画力なくしてこの作品は存在しません。' },
  { type: 'small', text: '※「ClaudeCode」が異常に多いのは仕様です。' },
  { type: 'gap' },

  { type: 'section', text: 'Special Thanks' },
  { role: 'プレイしてくれたあなた', name: '★' },
  { role: '原案者・監修', name: 'あいかわ' },
  { type: 'gap' },
  { type: 'title', text: '— おわり —' },
  { type: 'small', text: 'ミミのテキサスホールデムポーカー' },
  { type: 'small', text: '〜転生したらバニーガールだった私の外れスキル《ぱにゅぱにゅ》だけがレベルアップな件〜' },
];

function startCreditsRoll(stage) {
  const roll = document.createElement('div');
  roll.className = 'credits-roll';

  // ── 装飾レイヤー：星屑背景＋舞う粒子＋ミニキャラ通過 ──
  const stars = document.createElement('div');
  stars.className = 'cr-stars';
  // 80 個のランダム配置星をDOMで生成
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('span');
    s.className = 'cr-star';
    s.style.left = (Math.random() * 100) + '%';
    s.style.top = (Math.random() * 100) + '%';
    s.style.animationDelay = (Math.random() * 5) + 's';
    s.style.animationDuration = (2 + Math.random() * 3) + 's';
    s.style.opacity = (0.3 + Math.random() * 0.7);
    stars.appendChild(s);
  }
  roll.appendChild(stars);

  // 装飾上下バー（金の唐草風）
  const topDeco = document.createElement('div');
  topDeco.className = 'cr-deco cr-deco-top';
  const botDeco = document.createElement('div');
  botDeco.className = 'cr-deco cr-deco-bot';
  roll.appendChild(topDeco);
  roll.appendChild(botDeco);

  // ミニキャラ通過レイヤー（時間差でキャラが画面を横断）
  const mini = document.createElement('div');
  mini.className = 'cr-mini-layer';
  roll.appendChild(mini);
  // 各キャラの「素の立ち絵の向き」(true=右向き)
  const facingRight = {
    mimi: true, rico: true,
    polka: false, selina: false, grano: false, velvet: false,
  };
  // 通過スケジュール（ラッパーの横移動 + img のパーソナリティ動作）
  const miniCharSeq = [
    { key: 'mimi',   delay: 3,   dir: 'lr', y: 88, dur: 14, personality: 'normal' },
    { key: 'polka',  delay: 10,  dir: 'rl', y: 92, dur: 12, personality: 'jump'   },
    { key: 'selina', delay: 20,  dir: 'lr', y: 90, dur: 16, personality: 'trip'   },
    { key: 'mimi',   delay: 28,  dir: 'rl', y: 86, dur: 12, personality: 'normal' },
    { key: 'grano',  delay: 36,  dir: 'lr', y: 89, dur: 18, personality: 'pauses' },
    { key: 'rico',   delay: 44,  dir: 'rl', y: 87, dur: 13, personality: 'normal' },
    // 最後のミミ＆ヴェルベット：楽しいテンポでぴょんぴょん往復
    // ① まず左→右へ向かう
    { key: 'mimi',   delay: 51, dir: 'lr', y: 91, dur: 10, personality: 'skip' },
    { key: 'velvet', delay: 53, dir: 'lr', y: 84, dur: 10, personality: 'skip' },
    // ② 右から出てきて左へ戻る
    { key: 'mimi',   delay: 62, dir: 'rl', y: 91, dur: 10, personality: 'skip' },
    { key: 'velvet', delay: 64, dir: 'rl', y: 84, dur: 10, personality: 'skip' },
  ];

  // ラッパー → img 構造。ラッパーが横移動、img がパーソナリティ動作
  miniCharSeq.forEach((m, idx) => {
    const wrap = document.createElement('div');
    wrap.className = `cr-mini-wrap cr-mini-${m.dir}`;
    wrap.style.bottom = `${100 - m.y}%`;
    wrap.style.animationDelay = m.delay + 's';
    wrap.style.animationDuration = m.dur + 's';
    wrap.dataset.idx = idx;

    const img = document.createElement('img');
    const naturalRight = facingRight[m.key] !== false;
    const movingRight = (m.dir === 'lr');
    const needFlip = (naturalRight !== movingRight);
    img.className = `cr-mini-img mini-pers-${m.personality}${needFlip ? ' cr-flip' : ''}`;
    img.src = `assets/characters/${m.key}_mini.png`;
    // 1ショット系（jump/trip）だけ：ラッパーの登場と同期するため delay と尺を合わせる。
    // infinite 系（skip/normal/pauses）は CSS の固定サイクル(0.32s/0.5s/0.8s)に任せ、
    // インラインで delay を付けると greeting 後に再開しなくなるため触らない。
    if (m.personality === 'jump' || m.personality === 'trip') {
      img.style.animationDelay = m.delay + 's';
      img.style.animationDuration = m.dur + 's';
    }
    img.onerror = () => {
      if (img.src.endsWith('_mini.png')) {
        img.onerror = () => { img.style.display = 'none'; };
        img.src = `assets/characters/${m.key}_default.png`;
      } else { img.style.display = 'none'; }
    };
    wrap.appendChild(img);
    mini.appendChild(wrap);

    // グラーノの「立ち止まり」は JS でラッパー animation を一時停止
    if (m.personality === 'pauses') {
      const pauseTimes = [0.30, 0.65]; // 30%地点と65%地点で1.5秒立ち止まる
      pauseTimes.forEach(p => {
        const at = (m.delay + m.dur * p) * 1000;
        setTimeout(() => {
          wrap.style.animationPlayState = 'paused';
          setTimeout(() => { wrap.style.animationPlayState = 'running'; }, 1500);
        }, at);
      });
    }
    // セリナの「転倒中はその場で固定」：ラッパーの横移動を一時停止
    // 転倒-起き上がり-振り返り(44%〜88%) の間、足元はその場でじっとする
    if (m.personality === 'trip') {
      const pauseStartMs = (m.delay + m.dur * 0.44) * 1000;
      const pauseDurMs   = (m.dur * (0.88 - 0.44)) * 1000;
      setTimeout(() => {
        wrap.style.animationPlayState = 'paused';
        setTimeout(() => { wrap.style.animationPlayState = 'running'; }, pauseDurMs);
      }, pauseStartMs);
    }
  });

  // ── 出会いの挨拶：通過する2人を時刻指定でハイライト ──
  // mimi (3s〜LR) と polka (10s〜RL) は 10〜17s 重なる → 13s 頃センターで遭遇
  // ※ selina(2) × mimi(3) の遭遇挨拶は廃止：セリナの「転倒→振り返り」とぶつかって
  //   look-back が見えなくなり、観客には「ミミが後ろを向いて止まった」ように見えてしまうため。
  const greetings = [
    { at: 13, indexes: [0, 1] }, // mimi(0) と polka(1)
  ];
  greetings.forEach(g => {
    setTimeout(() => {
      g.indexes.forEach(i => {
        const w = mini.querySelector(`.cr-mini-wrap[data-idx="${i}"]`);
        if (!w) return;
        const im = w.querySelector('.cr-mini-img');
        // 軽く立ち止まる
        w.style.animationPlayState = 'paused';
        if (im) im.classList.add('mini-greet');
        setTimeout(() => {
          w.style.animationPlayState = 'running';
          if (im) im.classList.remove('mini-greet');
        }, 1200);
      });
    }, g.at * 1000);
  });

  const inner = document.createElement('div');
  inner.className = 'credits-inner';
  inner.innerHTML = CREDITS.map(c => {
    if (c.type === 'title')   return `<div class="cr-title">${c.text}</div>`;
    if (c.type === 'section') return `<div class="cr-section">— ${c.text} —</div>`;
    if (c.type === 'gap')     return `<div class="cr-gap"></div>`;
    if (c.type === 'small')   return `<div class="cr-small">${c.text}</div>`;
    const tagClass = c.name === 'ClaudeCode' ? 'cr-claude'
                  : c.name === 'ChatGPT' ? 'cr-gpt'
                  : c.name === 'Suno' ? 'cr-suno'
                  : c.name === 'あいかわ' ? 'cr-author'
                  : '';
    return `<div class="cr-row"><span class="cr-role">${c.role}</span><span class="cr-name ${tagClass}">${c.name}</span></div>`;
  }).join('');
  roll.appendChild(inner);
  // スキップボタン
  const skip = document.createElement('button');
  skip.className = 'credits-skip';
  skip.textContent = '▶▶ スキップ';
  skip.onclick = () => {
    const endA = document.getElementById('ending-bgm-audio');
    if (endA) endA.pause();
    roll.remove();
    goLobby();
  };
  roll.appendChild(skip);
  stage.appendChild(roll);

  // ── コンテンツ実高に合わせてスクロール距離と所要時間を動的設定 ──
  let finaleTimer = null;
  const startScrollAndSchedule = () => {
    const stageH = stage.offsetHeight || 800;
    const contentH = inner.offsetHeight || 3200;
    const endY = contentH + 80;       // コンテンツ末尾が画面上端を超えるまで
    inner.style.setProperty('--scroll-end-y', `-${endY}px`);
    const pxPerSec = 60;                // 約60px/秒（旧:53.3）少し早めに
    const seconds = Math.max(60, Math.min(140, (stageH + endY) / pxPerSec));
    inner.style.setProperty('--scroll-dur', `${seconds}s`);
    inner.classList.add('rolling');
    // ── ミニキャラの最終 event（velvet RL）が t=74s に終わる ──
    // 集合シーンはその直後、フェードアウトはさらに後で実施する。
    const miniEndSec = 74;
    const groupAtMs = Math.max((miniEndSec + 1), (seconds - 4)) * 1000;
    setTimeout(() => spawnFinaleLineup(), groupAtMs);
    // 動的な所要時間でフィナーレへ。ミニキャラ往復＋集合の余韻を確保
    const fadeAtMs = Math.max(seconds, miniEndSec + 12) * 1000;
    finaleTimer = setTimeout(() => doSettleAndFadeOut(), fadeAtMs);
  };
  // 全員集合（シンプル）：画面外から歩いてきて定位置で止まる。バナー・派手な演出なし。
  const spawnFinaleLineup = () => {
    // 通過中のミニキャラを即フェードアウトして退場
    mini.querySelectorAll('.cr-mini-wrap').forEach(w => {
      w.style.transition = 'opacity 0.6s ease';
      w.style.opacity = '0';
      setTimeout(() => w.remove(), 700);
    });
    // 6キャラ：左半分は左から、右半分は右から歩いてくる
    const lineup = [
      { key: 'polka',  side: 'L' },
      { key: 'grano',  side: 'L' },
      { key: 'mimi',   side: 'L' },
      { key: 'rico',   side: 'R' },
      { key: 'selina', side: 'R' },
      { key: 'velvet', side: 'R' },
    ];
    // 自然な向きが右のキャラ
    const natRight = { mimi: true, rico: true };
    const row = document.createElement('div');
    row.className = 'cr-lineup-row';
    lineup.forEach((m, i) => {
      const slot = document.createElement('div');
      slot.className = `cr-lineup-slot cr-from-${m.side}`;
      // 左側からくる子は左にiずらし、右側からくる子は右からiずらして時間差登場
      const orderFromEdge = m.side === 'L' ? i : (lineup.length - 1 - i);
      slot.style.animationDelay = `${orderFromEdge * 0.25}s`;
      const img = document.createElement('img');
      // 歩いている間は normal、定位置に着いたら静止（CSS で animation 切替）
      img.className = 'cr-mini-img mini-pers-normal';
      // 進行方向を向く：L側は右向き、R側は左向き
      const wantsRight = (m.side === 'L');
      const isNatRight = !!natRight[m.key];
      if (wantsRight !== isNatRight) img.classList.add('cr-flip');
      img.src = `assets/characters/${m.key}_mini.png`;
      img.onerror = () => {
        if (img.src.endsWith('_mini.png')) {
          img.onerror = () => { img.style.display = 'none'; };
          img.src = `assets/characters/${m.key}_default.png`;
        } else { img.style.display = 'none'; }
      };
      slot.appendChild(img);
      row.appendChild(slot);
    });
    mini.appendChild(row);
    // 到着したら歩きアニメ停止＆そのまま立ち止まる
    setTimeout(() => {
      row.querySelectorAll('.cr-mini-img').forEach(im => {
        im.style.animation = 'none';
      });
    }, 2200);
  };
  // layout 完了を待ってから計測
  requestAnimationFrame(() => requestAnimationFrame(startScrollAndSchedule));

  // 静止＋フェードアウト処理を関数化
  const doSettleAndFadeOut = () => {
    if (!roll.parentNode) return;
    // ① スクロールを止める（最後の文字が画面に残る）
    inner.classList.add('settle');
    // ② ミニキャラとスター層を緩やかに消す
    const stars = roll.querySelector('.cr-stars');
    const miniLayer = roll.querySelector('.cr-mini-layer');
    if (stars) stars.style.transition = 'opacity 2.5s ease', stars.style.opacity = '0.3';
    if (miniLayer) miniLayer.style.transition = 'opacity 2.5s ease', miniLayer.style.opacity = '0';
    // ③ 4秒間「おわり」の余韻を保持
    setTimeout(() => {
      // ④ ロール全体をフェードアウト
      roll.classList.add('roll-fadeout');
      setTimeout(() => {
        if (roll.parentNode) {
          showEndingFinalButtons(stage);
          roll.remove();
        }
      }, 1800);
    }, 4000);
  };
}

function showEndingFinalButtons(stage) {
  if (stage.querySelector('.ending-final-buttons')) return;
  // ── スタッフロール後の余韻シーン ── 一気にボタンを出さず、感謝メッセージで緩める
  const epilogue = document.createElement('div');
  epilogue.className = 'ending-epilogue';
  epilogue.innerHTML = `
    <div class="ep-img-wrap">
      <img class="ep-img" src="assets/episodes/ending.png" alt=""
           onerror="this.style.display='none'; this.parentElement.classList.add('ep-fallback');">
      <div class="ep-vignette"></div>
    </div>
    <div class="ep-content">
      <div class="ep-thanks">Thank you for playing</div>
      <div class="ep-jp">プレイしてくれてありがとう</div>
      <div class="ep-divider"></div>
      <div class="ep-last-line">「またね、ミミ。<br>……次のハンドで、会いましょう」</div>
      <div class="ep-signed">— リコ先輩</div>
    </div>
    <div class="ending-final-buttons">
      <button class="btn btn-primary" data-action="back-lobby">ロビーへ戻る</button>
    </div>
  `;
  stage.appendChild(epilogue);
  epilogue.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  // 段階的フェードイン：背景→感謝→台詞→ボタン
  requestAnimationFrame(() => epilogue.classList.add('show'));
  // FINとタイトルロゴが残っていたら片付ける
  const stale = stage.querySelectorAll('.ending-fin, .ending-title-drop');
  stale.forEach(el => el.classList.add('fade-out'));
  setTimeout(() => stale.forEach(el => el.remove()), 1200);
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

function goLobby() {
  if (typeof stopBattleBgmSkin === 'function') stopBattleBgmSkin(); // バトル専用BGMスキンを止めてロビーへ戻す
  document.body.dataset.oppBg = ''; // 相手別テーブル背景を解除
  document.body.classList.remove('is-danger'); stopDangerHeartbeat(); // ピンチ演出も画面離脱で必ず解除
  state.screen = 'lobby';
  // 入室時にリコの衣装を抽選し直す
  state.lobbyRicoIndex = Math.floor(rand() * RICO_OUTFITS.length);
  state.lobbyRicoChangedAt = 'lobby';
  render();
  tryStartLobbyBgm();
  maybeShowLoginBonus();
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
  // シーンBGMもスライダーに追従
  const scA = document.getElementById('scene-bgm-audio');
  if (scA && _sceneBgmKey && SCENE_BGM[_sceneBgmKey]) {
    scA.volume = Math.min(1, bgmVolFloat() * SCENE_BGM[_sceneBgmKey].gain);
  }
}

// ── シーン専用BGM（実音源）──────────────────────────────
// タイトル/バトル/ボス/ミニは #scene-bgm-audio 1本を使い回し、
// 常にロビー/ED/シンセを止めてから鳴らす＝二重再生ゼロ（うるさくしない核）。
// gain は「うるさくならない」ための曲別控えめ倍率（bgmVolFloat にさらに掛ける）。
const SCENE_BGM = {
  title:    { file: 'assets/bgm/title.mp3',    gain: 0.70 },
  battle:   { file: 'assets/bgm/battle.mp3',   gain: 0.60 },
  boss:     { file: 'assets/bgm/boss.mp3',     gain: 0.72 },
  minigame: { file: 'assets/bgm/minigame.mp3', gain: 0.55 },
};
let _sceneBgmKey = null;
// ロビー/ED/シンセを止める（シーンBGM自身には触れない＝同曲ガードを壊さない）
function _stopNonSceneBgm() {
  const lobbyA = document.getElementById('lobby-bgm-audio');
  const endA = document.getElementById('ending-bgm-audio');
  if (lobbyA) lobbyA.pause();
  if (endA) endA.pause();
  if (typeof _stopSkinBgm === 'function') _stopSkinBgm();
}
function playSceneBgm(key) {
  const def = SCENE_BGM[key];
  const a = document.getElementById('scene-bgm-audio');
  if (!def || !a) return;
  if (!isBgmOn()) { a.pause(); return; }      // BGM全体OFFなら鳴らさない（既定OFF）
  _stopNonSceneBgm();
  routeThroughWebAudio(a);                    // 旧iOSでだけ消音スイッチに従わせる保険
  a.loop = true;
  a.volume = Math.max(0, Math.min(1, bgmVolFloat() * def.gain));
  if (_sceneBgmKey !== key) {                  // 同じ曲なら頭出しせず継続（再レンダーで途切れない）
    _sceneBgmKey = key;
    a.src = def.file;
    a.currentTime = 0;
  }
  const p = a.play(); if (p && p.catch) p.catch(() => {});
}
function stopSceneBgm() {
  const a = document.getElementById('scene-bgm-audio');
  if (a) a.pause();
  _sceneBgmKey = null;
}
// 現在の画面に応じて正しい1曲だけを鳴らす（BGM ON トグル時の復帰に使用）
function startBgmForScreen() {
  if (!isBgmOn()) { _stopNonSceneBgm(); stopSceneBgm(); return; }
  if (document.querySelector('.minipoker-overlay')) { playSceneBgm('minigame'); return; }
  const sc = state && state.screen;
  if (sc === 'title')       playSceneBgm('title');
  else if (sc === 'battle') { if (typeof startBattleBgmSkin === 'function') startBattleBgmSkin(); }
  else if (sc === 'ending') { stopSceneBgm(); }   // ED音源はプロンプトで別途
  else                      tryStartLobbyBgm();
}

// 音量バーHTML（戻るボタンの隣に挿入）
// ★このバーは「その画面で唯一の音声UI」なので、トグルは BGM だけでなく
//   効果音も含めた“音まるごと”のON/OFFにする。
//   （BGMだけを切るトグルに🔇を出すと「OFF表示なのにSEが鳴る」と読めてしまうため。
//     BGMと効果音を個別に触りたい場合はロビー下部パネル／設定から行う）
function isAnyAudioOn() { return !!(save && (save.bgmOn || save.sfxOn)); }
function audioBarHTML() {
  const on = isAnyAudioOn();
  const vol = save.bgmVolume != null ? save.bgmVolume : 35;
  return `
    <div class="audio-bar">
      <button class="audio-bar-toggle" data-action="toggle-audio-all" title="音（BGM・効果音）ON/OFF">${on ? '🔊' : '🔇'}</button>
      <input class="audio-bar-volume" type="range" min="0" max="100" value="${vol}" title="BGM 音量">
    </div>
  `;
}

// 音まるごとON/OFF。OFF表示のときは本当に何も鳴らない状態にする。
function toggleAllAudio() {
  const turnOff = isAnyAudioOn();
  save.bgmOn = !turnOff;
  save.sfxOn = !turnOff;
  saveProgress();
  if (turnOff) {
    _stopNonSceneBgm();
    if (typeof stopSceneBgm === 'function') stopSceneBgm();
    if (typeof mpStopBgm === 'function') mpStopBgm();
  } else {
    startBgmForScreen();
  }
  refreshAudioBars();
}

// top-hud のある画面（ロビー/交換所/バトル等）で、戻るボタンの隣に音量セットを挿入。
// ※タイトル画面には挿入しない（中央の帯がヒーロー構図を壊すため）。
function injectAudioBars() {
  const installInto = (container, anchorEl) => {
    if (container.querySelector('.audio-bar')) return;
    const wrap = document.createElement('span');
    wrap.innerHTML = audioBarHTML();
    const bar = wrap.firstElementChild;
    if (anchorEl) anchorEl.insertAdjacentElement('afterend', bar);
    else container.appendChild(bar);
    bar.querySelector('[data-action="toggle-audio-all"]').addEventListener('click', onAction);
    bar.querySelector('.audio-bar-volume').addEventListener('input', (e) => {
      save.bgmVolume = +e.target.value;
      saveProgress();
      applyBgmVolume();
      document.querySelectorAll('.audio-bar-volume').forEach(v => v.value = save.bgmVolume);
    });
  };
  document.querySelectorAll('.top-hud').forEach(hud => {
    // ★ロビーは下部パネルに BGM＋SFX の完全な音量UIを持つので、ここには入れない。
    //   （入れると同じ画面に音量調節が2つ並ぶ＝どちらを触ればいいか分からなくなる）
    if (hud.classList.contains('lobby-hud')) return;
    const firstBtn = hud.querySelector('.btn');
    if (firstBtn) installInto(hud, firstBtn);
  });
  // タイトル画面：top-hudが無いので隅（右下）に置く。
  // ★ここを省くとタイトルでBGMを止める手段が無くなる（鳴りっぱなし）ので必須。
  const titleScreen = document.querySelector('.title-screen');
  if (titleScreen && !titleScreen.querySelector('.audio-bar')) {
    const w = document.createElement('div');
    w.className = 'audio-bar-wrap audio-bar-corner';
    titleScreen.appendChild(w);
    installInto(w, null);
  }
}

function refreshAudioBars() {
  const icon = save.bgmOn ? '🔊' : '🔇';
  const vol = save.bgmVolume != null ? save.bgmVolume : 35;
  // 隅のバーは“音まるごと”の状態を表す（BGMだけの状態を出すと OFF表示なのにSEが鳴る）
  document.querySelectorAll('.audio-bar-toggle').forEach(t => t.textContent = isAnyAudioOn() ? '🔊' : '🔇');
  document.querySelectorAll('.audio-bar-volume').forEach(v => v.value = vol);
  document.querySelectorAll('.lb-bgm-toggle').forEach(t => t.textContent = icon);
  // ★ '.lb-vol' は効果音スライダー（class="lb-vol lb-vol-sfx"）にも一致してしまい、
  //   BGM音量で上書きしていた。BGM用だけに限定する。
  document.querySelectorAll('.lb-vol:not(.lb-vol-sfx)').forEach(v => v.value = vol);
  // ★効果音トグル／スライダーの同期が抜けていて、押してもアイコンが変わらなかった。
  const sfxVol = save.sfxVolume != null ? save.sfxVolume : 60;
  document.querySelectorAll('.lb-sfx-toggle').forEach(t => t.textContent = save.sfxOn ? '🔔' : '🔕');
  document.querySelectorAll('.lb-vol-sfx').forEach(v => v.value = sfxVol);
  document.querySelectorAll('.lb-song-label').forEach(s => {
    s.textContent = save.bgmOn ? '♪ Lounge Jazz' : '♪ —（停止中）';
  });
}

function initGlobalAudioBar() {
  // iPhone の消音スイッチに従わせる（起動時＋復帰時に貼り直す）
  applyAudioSession();
  try {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) applyAudioSession();
    });
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, applyAudioSession, { passive: true }));
  } catch (e) {}
}
function tryStartLobbyBgm() {
  const a = document.getElementById('lobby-bgm-audio');
  if (typeof stopSceneBgm === 'function') stopSceneBgm(); // シーンBGMがあれば止めてロビーへ
  if (!save.bgmOn) { if (a) a.pause(); if (typeof _stopSkinBgm === 'function') _stopSkinBgm(); return; }
  routeThroughWebAudio(a);                    // 旧iOSでだけ消音スイッチに従わせる保険
  // equippedBgmLobby='jazz' ならシンセループ、既定ならこれまで通り実音源
  if (typeof applyLobbyBgmSkin === 'function') applyLobbyBgmSkin();
  else if (a) { a.volume = bgmVolFloat(); const p = a.play(); if (p && p.catch) p.catch(() => {}); }
}

function toggleLobbyBgm() {
  save.bgmOn = !save.bgmOn;
  saveProgress();
  if (save.bgmOn) {
    // 今いる画面の正しい1曲だけを鳴らす（タイトル/バトル/ボス/ミニ/ロビー）
    startBgmForScreen();
  } else {
    _stopNonSceneBgm();
    if (typeof stopSceneBgm === 'function') stopSceneBgm();
    const endA = document.getElementById('ending-bgm-audio');
    if (endA) endA.pause();
    if (typeof mpStopBgm === 'function') mpStopBgm();
  }
  refreshAudioBars();
}

// SFX 全体ON/OFFトグル
function toggleSfx() {
  save.sfxOn = !save.sfxOn;
  saveProgress();
  refreshAudioBars();
}

// SFX 音量を反映（mpSfx は呼び出し時に sfxVolFloat() を読むので即座反映済み）
function applySfxVolume() { /* no-op：実体は mpSfx 内で都度読み */ }

//=============================================================
// 10. バトル開始
//=============================================================
function showRicoModeChooser() {
  const overlay = document.createElement('div');
  overlay.className = 'rico-mode-overlay';
  overlay.innerHTML = `
    <div class="rico-mode-modal">
      <div class="rico-mode-title">🐰 リコ先輩</div>
      <div class="rico-mode-sub">「どっちで遊ぶ？」</div>
      <button class="btn btn-secondary rico-mode-opt" data-action="rico-mode-tutorial">
        <span class="rico-mode-opt-name">📚 もう一度受講する</span>
        <span class="rico-mode-opt-desc">基礎からじっくり、講義モードで復習</span>
      </button>
      <button class="btn btn-primary rico-mode-opt" data-action="rico-mode-serious">
        <span class="rico-mode-opt-name">🔥 本気のリコ先輩と対戦</span>
        <span class="rico-mode-opt-desc">チュートリアル無し、最強プロファイルで本気の読み合い</span>
      </button>
      <button class="btn btn-ghost rico-mode-opt" data-action="rico-mode-cancel">キャンセル</button>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// =============================================================
// キャラクター名鑑：立ち絵＋キャラ設定を表示するビューア
// 立ち絵クリックで開く。進行度に応じて開示情報を段階化（ネタバレ防止）。
// =============================================================
// 主人公ミミのプロフィール（OPPONENTS に居ないため個別定義）
const MIMI_PROFILE = {
  name: 'ミミ',
  imgKey: 'mimi',
  icon: '🐰',
  title: '外れスキル持ちの新人ディーラー',
  appearance: '🐰 ウサ耳カチューシャ／黒×赤のバニー衣装／茶髪お団子と赤い瞳',
  desc: '異世界に転生し、授かったのは「ぱにゅぱにゅ」——場を和ませるだけの外れスキル。' +
        'それでも卓に立ち、読みと度胸で伝説のディーラーたちに挑む。',
  traits: [
    'スキル《ぱにゅぱにゅ》で相手の緊張をほぐし、本音を引き出す',
    '知識ゼロから始めて、実戦で読み合いを覚えていく',
    '劣勢でも降りない粘り強さが持ち味',
  ],
};

// 立ち絵ファイル名を解決（ミミ／リコは装備スキン・衣装を反映）
function profileArtFile(charId) {
  if (charId === 'mimi') {
    const skin = save && save.equippedMimiSkin;
    return (skin && skin !== 'default') ? `mimi_${skin}.png` : 'mimi_default.png';
  }
  if (charId === 'rico_tutorial') {
    const o = typeof pickLobbyRico === 'function' ? pickLobbyRico() : null;
    return o ? o.file : 'rico_default.png';
  }
  const opp = OPPONENTS[charId];
  return opp ? `${opp.imgKey}_default.png` : 'mimi_default.png';
}

function showCharacterProfile(charId) {
  document.querySelectorAll('.char-profile-overlay').forEach(e => e.remove());
  const isMimi = charId === 'mimi';
  const opp = OPPONENTS[charId];
  if (!isMimi && !opp) return;

  // 進行度による開示段階
  const unlocked = isMimi || (typeof isStageUnlocked === 'function' ? isStageUnlocked(charId) : true);
  const cleared  = isMimi || (save.clearedStages || []).includes(charId);
  if (!unlocked) return; // 未解放キャラは開かない（カード側でも抑止）

  const p = isMimi ? MIMI_PROFILE : null;
  const persona = isMimi ? null : (OPPONENT_PERSONALITY[charId] || null);
  const name = isMimi ? p.name : opp.name;
  const icon = isMimi ? p.icon : (persona ? persona.icon : '🎴');
  const title = isMimi ? p.title : (cleared && persona ? persona.title : '？？？');
  const appearance = isMimi ? p.appearance : (OPPONENT_APPEARANCE[charId] || '——');
  const desc = isMimi ? p.desc : opp.desc;
  const artFile = profileArtFile(charId);
  const fallbackKey = isMimi ? 'mimi' : opp.imgKey;

  // 戦術傾向バー（撃破済みのみ開示）
  const statRows = (!isMimi && cleared && opp.profile) ? [
    { label: 'ブラフ',   v: opp.profile.bluffTendency },
    { label: '攻撃性',   v: opp.profile.aggression },
    { label: '降りやすさ', v: opp.profile.foldDiscipline },
    { label: 'バリュー',  v: opp.profile.valueBetTendency },
  ].map(s => `
    <div class="cp-stat">
      <span class="cp-stat-label">${s.label}</span>
      <span class="cp-stat-bar"><span class="cp-stat-fill" style="width:${Math.round((s.v || 0) * 100)}%"></span></span>
      <span class="cp-stat-val">${Math.round((s.v || 0) * 100)}</span>
    </div>`).join('') : '';

  // 性格・攻略（撃破済みのみ）
  const traits = isMimi ? p.traits : (persona ? persona.traits : []);
  const traitsHtml = (isMimi || cleared)
    ? `<ul class="cp-traits">${traits.map(t => `<li>${t}</li>`).join('')}</ul>`
    : `<div class="cp-locked-hint">🔒 撃破すると性格・攻略法が記録されます</div>`;
  const exploitHtml = (!isMimi && cleared && persona)
    ? `<div class="cp-exploit"><b>⚔ 攻略</b> ${persona.exploit}</div>` : '';

  // 得意分野・初期チップ（相手のみ）
  const metaHtml = !isMimi ? `
    <div class="cp-meta">
      <span class="cp-meta-item">🎯 ${opp.theme}</span>
      <span class="cp-meta-item">💰 初期 ${opp.chips}</span>
      ${cleared ? '<span class="cp-meta-item cp-cleared">✓ 撃破済み</span>' : ''}
    </div>` : `
    <div class="cp-meta">
      <span class="cp-meta-item">🎯 スキル《ぱにゅぱにゅ》</span>
      <span class="cp-meta-item">💰 所持 ${save.coins}</span>
    </div>`;

  // リコは衣装ギャラリーへの導線を追加（解放済みのみ）
  const ricoGalleryBtn = (charId === 'rico_tutorial' && typeof isRicoViewerUnlocked === 'function' && isRicoViewerUnlocked())
    ? '<button class="btn btn-secondary cp-gallery-btn" data-action="open-rico-viewer">👗 衣装ギャラリーへ</button>' : '';

  const overlay = document.createElement('div');
  overlay.className = 'char-profile-overlay';
  overlay.innerHTML = `
    <div class="char-profile-modal">
      <button class="cp-close" title="閉じる">×</button>
      <div class="cp-art">
        <img src="assets/characters/${artFile}" alt="${name}"
             onerror="window.assetFallback(this,'${fallbackKey}')">
      </div>
      <div class="cp-panel">
        <div class="cp-head">
          <div class="cp-icon">${icon}</div>
          <div class="cp-names">
            <div class="cp-name">${name}</div>
            <div class="cp-title">${title}</div>
          </div>
        </div>
        ${metaHtml}
        <div class="cp-section">
          <div class="cp-section-label">見た目・雰囲気</div>
          <div class="cp-appearance">${appearance}</div>
        </div>
        <div class="cp-section">
          <div class="cp-section-label">プロフィール</div>
          <div class="cp-desc">${desc}</div>
        </div>
        <div class="cp-section">
          <div class="cp-section-label">${isMimi ? '特徴' : '性格・行動傾向'}</div>
          ${traitsHtml}
          ${exploitHtml}
        </div>
        ${statRows ? `<div class="cp-section">
          <div class="cp-section-label">戦術パラメータ</div>
          <div class="cp-stats">${statRows}</div>
        </div>` : ''}
        ${ricoGalleryBtn}
      </div>
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.cp-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  // ギャラリーボタン等の data-action を通常フローへ流す
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', (e) => {
    close();
    onAction(e);
  }));
  mpSfx('tap');
}

function showRicoViewer() {
  const cur = pickLobbyRico();
  const trivia = RICO_TRIVIA[cur.file] || {
    title: cur.label + 'のリコ先輩',
    cards: [{ tag: 'ひとこと', text: '（このエピソードはまだ準備中）' }],
  };
  const cardsHtml = trivia.cards.map(c => `
    <div class="rico-viewer-card">
      <div class="rico-viewer-card-tag">${c.tag}</div>
      <div class="rico-viewer-card-text">${c.text}</div>
    </div>
  `).join('');
  const overlay = document.createElement('div');
  overlay.className = 'rico-viewer-overlay';
  overlay.innerHTML = `
    <div class="rico-viewer-stage">
      <img class="rico-viewer-img" src="assets/characters/${cur.file}" alt="リコ先輩" onerror="window.assetFallback(this,'rico')">
      <div class="rico-viewer-outfit-label">${cur.label}</div>
      <button class="rico-viewer-nav rico-viewer-nav-prev" data-action="rico-viewer-prev" title="前の衣装">‹</button>
      <button class="rico-viewer-nav rico-viewer-nav-next" data-action="rico-viewer-next" title="次の衣装">›</button>
    </div>
    <aside class="rico-viewer-panel">
      <button class="rico-viewer-close" data-action="rico-viewer-close" title="閉じる">×</button>
      <div class="rico-viewer-title">${trivia.title}</div>
      <div class="rico-viewer-cards">${cardsHtml}</div>
      <div class="rico-viewer-hint">←→ で衣装を切替・ESC または背景で閉じる</div>
    </aside>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  // キーボード操作
  const keyHandler = (e) => {
    if (!document.body.contains(overlay)) { document.removeEventListener('keydown', keyHandler); return; }
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', keyHandler); }
    else if (e.key === 'ArrowRight') { onAction({ currentTarget: { dataset: { action: 'rico-viewer-next' } } }); }
    else if (e.key === 'ArrowLeft')  { onAction({ currentTarget: { dataset: { action: 'rico-viewer-prev' } } }); }
  };
  document.addEventListener('keydown', keyHandler);
}

// === コンプリート（解放状況）モーダル ===
/* ===== メモリ・ギャラリー内蔵コンテンツ ===== */
const MEMORY_CONTENT = {
  gallery_rico: {
    title: '🖼 リコ先輩 設定資料',
    body: `
      <h4>キャラクター原案</h4>
      <p>「先輩」「軽口」「面倒見」を三原則として設計。<br>
      初期案では銀髪・タキシード姿の冷徹キャラだったが、「主人公を引っ張る年上の女」性を強調するため、現在の華やかな衣装と艶のある黒髪に変更された。</p>
      <h4>ボツ衣装</h4>
      <ul>
        <li>ピンクのスーツ（候補A）— 「カジノに似合わない」却下</li>
        <li>白のロングコート（候補B）— 「ヒロイン感が強すぎる」却下</li>
        <li>軍服風（候補C）— 「ヴェルベットと被る」却下</li>
      </ul>
      <h4>口調メモ</h4>
      <p>語尾は「〜じゃない？」「〜よ」が基本。決め台詞は「ふぅん、いいわよ。やってみなさい」。<br>
      ヴェルベット戦中盤のみ敬語が混じり、「決着、つけましょう」となる。</p>
    `,
  },
  gallery_opponents: {
    title: '🖼 対戦相手図鑑',
    body: () => {
      const list = [
        { id: 'polka',  name: 'ポルカ',     trait: '感情型・ブラフ多め',   line: '「えへへ、わたしの番〜！」' },
        { id: 'selina', name: 'セリナ',     trait: '盤面読み・受け身',     line: '「ぼ……ボードを見て」' },
        { id: 'grano',  name: 'グラーノ',   trait: '算術型・冷静',         line: '「数字は嘘をつかない」' },
        { id: 'velvet', name: 'ヴェルベット', trait: '罠師・支配的',        line: '「あなたの読み、見せて頂戴」' },
      ];
      const html = list.map(o => {
        const cleared = save.clearedStages.includes(o.id);
        return cleared
          ? `<div class="memory-opp"><div class="memory-opp-name">${o.name}</div><div class="memory-opp-trait">${o.trait}</div><div class="memory-opp-line">${o.line}</div></div>`
          : `<div class="memory-opp locked"><div class="memory-opp-name">🔒 ？？？</div><div class="memory-opp-trait">撃破で解放</div></div>`;
      }).join('');
      return html;
    },
  },
  gallery_mimi: {
    title: '🖼 ミミ百態',
    body: `
      <p>ぱにゅぱにゅミニゲームのマスコット「ミミ」。原案では「もちもちの正体不明生物」とだけ書かれていた。</p>
      <h4>表情リスト</h4>
      <ul>
        <li>通常 — 静かに揺れている</li>
        <li>連打中 — 全身がふるえ、頬が紅潮</li>
        <li>コンボ達成 — 目を閉じて笑顔</li>
        <li>完走時 — 全身金色オーラ、☆を放つ</li>
        <li>放置時 — まどろみ、寝息を立てる</li>
      </ul>
      <h4>裏設定</h4>
      <p>ミミは元々リコ先輩が幼少期に拾った「夢の精霊」という設定だが、本編では一切触れられない。</p>
    `,
  },
  omake_drama_1: {
    title: '🎭 寸劇「リコ、初出勤」',
    body: `
      <p class="memory-stage-note">— 店長室 —</p>
      <p><b>店長</b>「君がリコくんかね。経歴は申し分ない、が……」</p>
      <p><b>リコ</b>「あら、何か問題でも？」</p>
      <p><b>店長</b>「カジノは“勝つ”だけではダメだ。お客様に夢を見せる仕事だ」</p>
      <p><b>リコ</b>「……（くすり）夢、ね。なら、私の十八番じゃない」</p>
      <p class="memory-stage-note">— 翌日、フロア —</p>
      <p><b>客A</b>「ねえお姉さん、これで本当に勝てるの？」</p>
      <p><b>リコ</b>「勝てるかどうかは、あなた次第。でも一つだけ約束する。</p>
      <p style="padding-left:1em">——今夜は、忘れられない夜になるわよ」</p>
      <p class="memory-stage-note">— その日、店の売上は過去最高を記録した。 —</p>
    `,
  },
  omake_drama_2: {
    title: '🎭 寸劇「決戦前夜」',
    body: `
      <p class="memory-stage-note">— ロビー、深夜2時 —</p>
      <p><b>主人公</b>「……リコ先輩、まだ起きてたんですか」</p>
      <p><b>リコ</b>「あら、お弟子さんも眠れない口？」</p>
      <p><b>主人公</b>「明日、ヴェルベットと当たるって思うと……」</p>
      <p><b>リコ</b>「ふぅん。怖い？」</p>
      <p><b>主人公</b>「……はい」</p>
      <p><b>リコ</b>「いいわね、その怖さ。大事にしときなさい。<br>怖くないやつは、ポーカーやっちゃダメ」</p>
      <p><b>主人公</b>「先輩は、怖くないんですか」</p>
      <p><b>リコ</b>「……怖いに決まってるじゃない。だから、隣で見てるわ。<br>あなたが勝つところ、しっかりとね」</p>
      <p class="memory-stage-note">— 二人の影が、長く伸びていた。 —</p>
    `,
  },
  omake_voice_pack: {
    title: '🎙 リコ先輩 ボイス集',
    body: `
      <p>※ボイスファイル未配置のためテキストで表示しています。</p>
      <div class="memory-voice-list">
        <div class="memory-voice">▶ 勝利「ふぅん、やるじゃない」</div>
        <div class="memory-voice">▶ 敗北「あら、まだまだね」</div>
        <div class="memory-voice">▶ ブラフ成功「やだ、笑っちゃう」</div>
        <div class="memory-voice">▶ オールイン「……いいわよ、全部」</div>
        <div class="memory-voice">▶ チェック「様子見、ね」</div>
        <div class="memory-voice">▶ レイズ「もう一声、上乗せ」</div>
        <div class="memory-voice">▶ フォールド「降りる勇気も実力」</div>
        <div class="memory-voice">▶ 朝の挨拶「おはよ。今日は調子どう？」</div>
        <div class="memory-voice">▶ 夜の挨拶「お疲れ。一杯付き合いなさい」</div>
        <div class="memory-voice">▶ 励まし「あなたなら、できるわよ」</div>
      </div>
    `,
  },
  omake_credit: {
    title: '📜 スタッフロール',
    body: `
      <div class="memory-credit">
        <h4>ミミのテキサスホールデムポーカー</h4>
        <p>Game Design — 主人公チーム</p>
        <p>Scenario — リコの記憶より</p>
        <p>Character — グラーノ商会</p>
        <p>Music — 沈黙のジャズマン</p>
        <p>Special Thanks — ヴェルベット様、ポルカ、セリナ</p>
        <p>And You.</p>
        <br>
        <p>— ふぅん、いい夜だったわね。<br>もう一勝負、いっとく？</p>
      </div>
    `,
  },
};

/* ===== 装備切替モーダル ===== */
// 各カテゴリ：装備候補（id → label）。default は常時選択可能
const EQUIP_CATEGORIES = [
  {
    key: 'equippedRicoOutfit', label: 'リコ衣装',
    choices: [
      { id: 'default',  label: '制服（標準）', itemId: null },
      { id: 'pajama',   label: 'パジャマ',     itemId: 'outfit_rico_pajama' },
      { id: 'dress',    label: 'ドレス',       itemId: 'outfit_rico_dress' },
      { id: 'kimono',   label: '和装',         itemId: 'outfit_rico_kimono' },
      { id: 'casual',   label: '私服',         itemId: 'outfit_rico_casual' },
      { id: 'school',   label: '学生風',       itemId: 'outfit_rico_school' },
      { id: 'bunny',    label: 'バニー',       itemId: 'outfit_rico_bunny' },
      { id: 'gym',      label: 'ジム服',       itemId: 'outfit_rico_gym' },
      { id: 'swimsuit', label: '水着',         itemId: 'outfit_rico_swimsuit' },
      { id: 'witch',    label: '魔女',         itemId: 'outfit_rico_witch' },
      { id: 'santa',    label: 'サンタ',       itemId: 'outfit_rico_santa' },
    ],
  },
  {
    key: 'equippedCardSkin', label: 'カード裏',
    choices: [
      { id: 'default',     label: '標準',     itemId: null },
      { id: 'red_gold',    label: '赤金',     itemId: 'skin_red_gold_card' },
      { id: 'blue_silver', label: '蒼銀',     itemId: 'skin_blue_silver_card' },
      { id: 'obsidian',    label: '漆黒',     itemId: 'skin_obsidian_card' },
      { id: 'floral',      label: '花鳥',     itemId: 'skin_floral_card' },
      { id: 'galaxy',      label: '銀河',     itemId: 'skin_galaxy_card' },
    ],
  },
  {
    key: 'equippedTableSkin', label: 'テーブル',
    choices: [
      { id: 'default',   label: '標準',           itemId: null },
      { id: 'vip',       label: 'VIP',            itemId: 'table_vip' },
      { id: 'emerald',   label: 'エメラルド',     itemId: 'table_emerald' },
      { id: 'neon',      label: 'ネオン',         itemId: 'table_neon' },
      { id: 'speakeasy', label: 'スピークイージー', itemId: 'table_speakeasy' },
    ],
  },
  {
    key: 'equippedChipSkin', label: 'チップ',
    choices: [
      { id: 'default', label: '標準',   itemId: null },
      { id: 'ivory',   label: 'アイボリー', itemId: 'chip_skin_ivory' },
      { id: 'jade',    label: '翡翠',   itemId: 'chip_skin_jade' },
      { id: 'dragon',  label: '龍紋',   itemId: 'chip_skin_dragon' },
    ],
  },
  {
    key: 'equippedMimiSkin', label: 'ミミ',
    choices: [
      { id: 'default', label: '標準',   itemId: null },
      { id: 'pink',    label: '桃色',   itemId: 'mimi_skin_pink' },
      { id: 'panda',   label: 'パンダ', itemId: 'mimi_skin_panda' },
      { id: 'gold',    label: '黄金',   itemId: 'mimi_skin_gold' },
    ],
  },
  {
    key: 'equippedCutin', label: 'カットイン',
    choices: [
      { id: 'default', label: '標準',   itemId: null },
      { id: 'classic', label: '古典派', itemId: 'cutin_classic' },
      { id: 'neon',    label: 'ネオン', itemId: 'cutin_neon' },
    ],
  },
  {
    key: 'equippedBgmLobby', label: 'ロビーBGM',
    choices: [
      { id: 'default', label: '標準',   itemId: null },
      { id: 'jazz',    label: 'ジャズ', itemId: 'bgm_lobby_jazz' },
    ],
  },
  {
    key: 'equippedBgmBattle', label: 'バトルBGM',
    choices: [
      { id: 'default', label: '標準',     itemId: null },
      { id: 'tense',   label: '緊迫弦楽', itemId: 'bgm_battle_tense' },
      { id: 'techno',  label: 'テクノ',   itemId: 'bgm_battle_techno' },
    ],
  },
  {
    key: 'equippedSePack', label: 'SE',
    choices: [
      { id: 'default', label: '標準',     itemId: null },
      { id: 'casino',  label: 'カジノ',   itemId: 'se_pack_casino' },
    ],
  },
];

function showEquipModal() {
  const owned = save.ownedItems || [];
  const rows = EQUIP_CATEGORIES.map(cat => {
    const current = save[cat.key] || 'default';
    const chips = cat.choices.map(c => {
      const isOwned = (c.itemId === null) || owned.includes(c.itemId);
      const isActive = current === c.id;
      return `<button class="equip-chip ${isActive ? 'active' : ''} ${!isOwned ? 'locked' : ''}"
        data-cat-key="${cat.key}" data-choice-id="${c.id}" ${!isOwned ? 'disabled' : ''}
        title="${isOwned ? '' : '未購入'}">${isOwned ? '' : '🔒 '}${c.label}</button>`;
    }).join('');
    return `
      <div class="equip-row">
        <div class="equip-row-label">${cat.label}</div>
        <div class="equip-row-choices">${chips}</div>
      </div>
    `;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'equip-overlay';
  overlay.innerHTML = `
    <div class="equip-modal">
      <button class="equip-modal-close" title="閉じる">×</button>
      <div class="equip-modal-title">👗 装備変更</div>
      <div class="equip-modal-body">
        ${rows}
      </div>
      <div class="equip-modal-footer">※ 🔒 表示の項目は交換所で購入すると選択可能になります</div>
      <div class="equip-modal-footer equip-modal-note">⚠ 効果はバトル画面／ミニゲーム画面で反映されます</div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelector('.equip-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelectorAll('.equip-chip:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.catKey;
      const choiceId = btn.dataset.choiceId;
      save[key] = choiceId;
      saveProgress();
      applyEquippedStyles();
      // 同列の active を更新
      const row = btn.closest('.equip-row');
      row.querySelectorAll('.equip-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      // リコ衣装変更時はロビー立ち絵／バトル画面の両方を即時更新
      if (key === 'equippedRicoOutfit') {
        state.lobbyRicoIndex = null;
        state.lobbyRicoChangedAt = null;
        const img = document.querySelector('[data-bind="lobbyRicoImg"]');
        if (img) {
          const o = pickLobbyRico();
          img.src = `assets/characters/${o.file}`;
        }
        applyBattleRicoOutfit();
      }
      // ロビーBGMスキンをその場で切替（ロビー滞在中に選んだ場合、即座に音が変わる）
      if (key === 'equippedBgmLobby' && state.screen === 'lobby' && typeof applyLobbyBgmSkin === 'function') {
        applyLobbyBgmSkin();
      }
      toast(`装備変更：${btn.textContent.trim()}`);
    });
  });
}

// ===== ミニキャラ・ファイブポーカー =====
// コンセプト：中毒性 / 射幸性 / かわいさ
// - Jacks-or-Better 風ペイテーブル＋ベットシステム
// - 配布演出（時間差スライドイン＋めくり）
// - リーチ検出（ニアミス効果）
// - 連勝ボーナス（streak combo）
// - ダブルアップ（赤黒チャレンジ最大3回）
// - ロイヤル特別演出（金色フラッシュ＋コインの雨）
// - キャラのリアクション吹き出し（応援役ミミ＋対戦相手）
// - セッション記録＋セーブ蓄積

const MP_PAYTABLE = [
  // rank 0..9 と payout（ベット倍率）
  { rank: 0, name: 'ハイカード',   mult: 0 },
  { rank: 1, name: 'ペア（J以上）', mult: 1 },  // Jacks-or-Better
  { rank: 2, name: 'ツーペア',     mult: 2 },
  { rank: 3, name: 'スリー',       mult: 3 },
  { rank: 4, name: 'ストレート',   mult: 4 },
  { rank: 5, name: 'フラッシュ',   mult: 6 },
  { rank: 6, name: 'フルハウス',   mult: 9 },
  { rank: 7, name: 'フォーカード', mult: 25 },
  { rank: 8, name: 'ストフラ',     mult: 50 },
  { rank: 9, name: 'ロイヤル',     mult: 800 },
];
const MP_BET_LEVELS = [1, 5, 25, 100, 500];

function mpEnsureSave() {
  if (!save.minipoker) {
    save.minipoker = {
      bet: 5,
      bestStreak: 0,
      royalCount: 0,
      stfCount: 0,
      totalGames: 0,
      totalWins: 0,
      totalEarned: 0,
      tutorialDone: false,
      jackpot: 5000,
      achievements: {},
      muted: false,
      missions: null,        // 当日のミッション
      missionsDate: '',
    };
  }
  if (typeof save.minipoker.tutorialDone === 'undefined') save.minipoker.tutorialDone = false;
  if (typeof save.minipoker.jackpot === 'undefined') save.minipoker.jackpot = 5000;
  if (!save.minipoker.achievements) save.minipoker.achievements = {};
  if (typeof save.minipoker.muted === 'undefined') save.minipoker.muted = false;
  // ミッション日替わり
  const today = mpTodayKey();
  if (save.minipoker.missionsDate !== today) {
    save.minipoker.missions = mpRollDailyMissions(today);
    save.minipoker.missionsDate = today;
    save.minipoker.missionsProgress = {};
  }
  if (!save.minipoker.missionsProgress) save.minipoker.missionsProgress = {};
  if (!save.minipoker.missions) save.minipoker.missions = mpRollDailyMissions(today);
}

// ── 日替わりミッション抽選 ──
function mpRollDailyMissions(seedKey) {
  const POOL = [
    { id: 'win3',     name: '勝利を3回',         goal: 3, reward: 50,  metric: 'wins' },
    { id: 'win5',     name: '勝利を5回',         goal: 5, reward: 100, metric: 'wins' },
    { id: 'plays5',   name: '5回プレイ',         goal: 5, reward: 30,  metric: 'plays' },
    { id: 'pair3',    name: 'ペア以上を3回',     goal: 3, reward: 70,  metric: 'pairPlus' },
    { id: 'flush1',   name: 'フラッシュを1回',   goal: 1, reward: 150, metric: 'flushes' },
    { id: 'fullhouse',name: 'フルハウスを1回',   goal: 1, reward: 200, metric: 'fullhouse' },
    { id: 'streak3',  name: '3連勝する',         goal: 3, reward: 100, metric: 'maxStreak' },
    { id: 'allin1',   name: 'ALL INを1回',        goal: 1, reward: 80,  metric: 'allins' },
    { id: 'double1',  name: 'ダブルアップ成功1回', goal: 1, reward: 80, metric: 'doubleWins' },
    { id: 'lucky1',   name: '今日のラッキー役を1回',goal: 1, reward: 200, metric: 'luckyHits' },
  ];
  // seedKey から3つを擬似ランダム抽出
  const seed = [...seedKey].reduce((a, c) => a * 31 + c.charCodeAt(0), 0);
  const arr = POOL.slice();
  // Fisher–Yates with seed
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

// ── 大幅増量：キャラ・場面別セリフバリエーション ──
const MP_LINES = {
  polka: {
    start: ['えへへっ、いっぱい引いちゃおー！','よーし、ポルカいくよ〜！','じゃ、配ってね〜','次はわたしの番〜！','うん、勝負！'],
    win:   ['やった〜！わたしの勝ち〜！','えへへっ、ポルカつよい〜！','どんなもんだいっ！','勝ったよ〜！'],
    lose:  ['うぐぐ……つよ……','えぇ〜まけちゃった〜','むぅ、つぎは負けないもん','もう一回！もう一回〜！'],
    tie:   ['ふぇ〜引き分け〜！','おあいこっ！','うむむ、わたしも強い！'],
    reach: ['おっ、なんかいい感じ？','ふふっ、来そう……？','よしっ、その手で行け〜！'],
    big:   ['うわっ、なにそれ強すぎ！','ふぇぇ、無理むり！','そんなのありー！？'],
  },
  selina: {
    start: ['ぼ……ボード、いや、手札を、よく見て','……静かに、配って','こく……始めて','……お願い、します'],
    win:   ['……運も、実力のうち、なんだって','こく……勝ち、ね','ふっ……ボードに従ったまで','ご……ごめんね？'],
    lose:  ['う……強い。次は、ぼ、ぼくが……','こ、ここまで読まれたか……','ぐ、悔しい……ぼくが弱かった'],
    tie:   ['ふ、引き分け','こく……まあ、いいわ','悪くない、結果ね'],
    reach: ['……来そう、な、気配','こく……手札が騒いでいる','……感じる、何かが'],
    big:   ['う、嘘……そんな手……','ぼ、ボードの神様……','……読みが、外れた'],
  },
  grano: {
    start: ['期待値に従い、参りましょう','数字の前に、平等あれ','では、合理的に','計算通り、進めます'],
    win:   ['数字は、私に微笑むものですから','確率に従っただけです','ふむ、期待値通り','商人の勝利、というやつです'],
    lose:  ['見事。今夜の期待値は、お嬢さんに譲ります','ふむ、勘定が合いませんな','一本取られましたか','算盤を弾き直さねば'],
    tie:   ['引き分け。割り勘で如何かな','収支、ゼロ。良き哉','勘定上は、対等ですな'],
    reach: ['ふむ、確率収束の予感が','期待値が、囁いている','分母が動いていますな'],
    big:   ['……これは、計算外でした','確率論を超越なされる','算盤が、燃えそうですな'],
  },
  velvet: {
    start: ['ふふ、お遊びでも、本気で','ご縁ですわね、一手を','では、舞いましょうか','お相手致しますわ'],
    win:   ['あら、私の勝ち。お小遣いを頂きますね','ふふ、楽しゅうございました','王座は、揺るがぬもの','勝負事は、こうでなくては'],
    lose:  ['おみごと。今日は、あなたの夜','ふふ、お見事ですわ','降参いたします','次は、お手柔らかに'],
    tie:   ['引き分け……悪くないわ','ご縁、続きますね','まあ、これも一興'],
    reach: ['ふふ、なにか企んでいるのね？','面白い……手札が、騒ぐ','ふふっ、その瞳、知っているわ'],
    big:   ['ま、まさか、その役……','王の手札……失敬','驚かせてくれますわね'],
  },
};
const MP_MIMI_LINES = {
  start: ['いきますよっ！','よし、本気出します！','うんっ、ベスト尽くします','ふっふー！見ててください','ぱにゅ……配ってください'],
  win:   ['やったぁ！','ふっふ〜ん♪','ぱにゅ的勝利です！','うふふ、嬉しい……','勝てましたっ！'],
  bigwin:['すごっ……これ、すごいやつ！','ぱ、ぱにゅ覚醒……？','フ、フルハウス……！','うっそ、来ちゃった……！'],
  lose:  ['うう……','ぱにゅぱにゅ……次、次！','むむっ、悔しい','一回休憩……いやもう一回！'],
  reach: ['ど、どきどき……','く、来ちゃう……？','期待しちゃっていいですか'],
  surrender:['ふぅ……無理せず撤退！','ぱにゅ的、賢明な判断','逃げるは恥だが役に立つ'],
};
function mpLine(charKey, situation) {
  const set = MP_LINES[charKey];
  if (!set) return '';
  const arr = set[situation];
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}
function mpMimiLine(situation) {
  const arr = MP_MIMI_LINES[situation];
  if (!arr) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── ミニポーカー達成バッジ定義 ──
const MP_ACHIEVEMENTS = [
  { id: 'first_win',     icon: '🏆', name: '初勝利',       cond: 'win 1' },
  { id: 'streak_3',      icon: '🔥', name: '3連勝',        cond: '3連続勝利' },
  { id: 'streak_5',      icon: '🔥', name: '5連勝',        cond: '5連続勝利' },
  { id: 'streak_10',     icon: '💎', name: '10連勝',       cond: '10連続勝利' },
  { id: 'first_fh',      icon: '🎴', name: '初フルハウス', cond: 'フルハウス達成' },
  { id: 'first_four',    icon: '🃏', name: '初フォー',     cond: 'フォーカード達成' },
  { id: 'first_stf',     icon: '⭐', name: '初ストフラ',   cond: 'ストフラ達成' },
  { id: 'first_royal',   icon: '👑', name: '初ロイヤル',   cond: 'ロイヤル達成' },
  { id: 'plays_100',     icon: '📚', name: '100戦達成',    cond: '通算100戦プレイ' },
  { id: 'big_win_100x',  icon: '🌟', name: '100倍勝ち',    cond: '1戦で100倍以上獲得' },
  { id: 'jackpot_win',   icon: '💰', name: 'JP獲得',       cond: 'ジャックポット獲得' },
  { id: 'survive_shield',icon: '🛡️', name: 'シールド使用',  cond: 'シールドで連勝維持' },
];

// ── Web Audio API：効果音シンセ ──
let _mpAudioCtx = null;
function mpAudioCtx() {
  if (!_mpAudioCtx) {
    try { _mpAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (_mpAudioCtx.state === 'suspended') _mpAudioCtx.resume();
  return _mpAudioCtx;
}

// ── iPhone の「消音スイッチ（サイレントモード）」対応（ドラゴンレースと同方式・二段構え）──
// iOS Safari の仕様：Web Audio(効果音)は消音スイッチに従うが、HTML <audio>(BGM)は無視して鳴り続ける。
// ＝実機で「本体を消音にしてもBGMだけ鳴る」問題。対処は環境で2通り：
//   ① iOS 16.4+ … Audio Session API で種別を宣言する。
//        "ambient"  = 端末の消音スイッチに従う（既定・他アプリの音楽とも共存）
//        "playback" = 消音スイッチを無視して鳴らす（プレイヤーが明示的に選んだときだけ）
//   ② それ以前のiOS … ①のAPIが無いので、BGMの音を Web Audio 経由に流す。
//        Web Audio は消音に従うので、通すだけでBGMも従うようになる。
// ★どちらを上位にするかはプレイヤーが決める（消音スイッチの状態を読むAPIはWebに無いので、
//   「いま消音中です」と正確に出すことはできない。できるのは主導権を選ばせることだけ）。
//   既定は OFF＝端末を尊重（マナーモードなのに突然鳴る事故を起こさない）。
// ★非対応環境では何も起きない安全な no-op。
function isForceSound() { return !!(save && save.forceSound); }
function applyAudioSession() {
  try {
    if (navigator.audioSession && 'type' in navigator.audioSession) {
      navigator.audioSession.type = isForceSound() ? 'playback' : 'ambient';
      return true;
    }
  } catch (e) {}
  return false;
}
function audioSessionInfo() {
  let sup = false, t = null;
  try { sup = !!(navigator.audioSession && 'type' in navigator.audioSession); if (sup) t = navigator.audioSession.type; } catch (e) {}
  return { supported: sup, type: t, forceSound: isForceSound() };
}
function _isIOS() {
  try {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
  } catch (e) { return false; }
}
function _audioSessionOK() {
  try { return !!(navigator.audioSession && 'type' in navigator.audioSession); } catch (e) { return false; }
}
// ②旧iOS向けの保険。★「効かない環境」にだけ当てる：効いている環境で二重に細工すると、
//   AudioContextが未解錠のときに無音になる等の別事故を招くため。
const _routedAudio = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
function routeThroughWebAudio(a) {
  if (!a) return;
  if (isForceSound()) return;                  // 「消音でも鳴らす」時は保険を当てない＝素のaudioのまま鳴る
  if (!_isIOS() || _audioSessionOK()) return;  // iOS以外／①で足りる環境では何もしない
  try {
    if (_routedAudio && _routedAudio.has(a)) return;  // 同じ要素に二度つなぐと例外
    const c = mpAudioCtx();
    if (!c || !c.createMediaElementSource) return;
    const src = c.createMediaElementSource(a);
    src.connect(c.destination);
    if (_routedAudio) _routedAudio.add(a);
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
  } catch (e) { /* 失敗しても素の再生に落ちるだけ＝音が消えることはない */ }
}
// 「端末が消音でも鳴らす」の切り替え。即座に反映して保存する。
function setForceSound(on) {
  save.forceSound = !!on;
  saveProgress();
  applyAudioSession();
  // 旧iOSは経路（Web Audio経由か否か）が変わるため、鳴らし直さないと新しい設定が効かない。
  if (_isIOS() && !_audioSessionOK()) {
    const wasKey = _sceneBgmKey;
    if (wasKey) { stopSceneBgm(); playSceneBgm(wasKey); }
    else if (isBgmOn() && state && state.screen === 'lobby') tryStartLobbyBgm();
  }
  return save.forceSound;
}
let _mpSfxScale = 1; // mpSfx 呼び出し直前にセットされる SFX 音量係数
function mpTone(freq, dur, type = 'sine', gain = 0.06, attack = 0.005, release = 0.04, delayMs = 0) {
  const ctx = mpAudioCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + delayMs / 1000;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  const peak = Math.max(0.0001, gain * _mpSfxScale);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + release);
}
function mpSweep(f0, f1, dur, type='sine', gain=0.05, delayMs=0) {
  const ctx = mpAudioCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + delayMs / 1000;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const peak = Math.max(0.0001, gain * _mpSfxScale);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function mpSfx(kind) {
  // 一元化ミュート：SFX全体OFFかミニポーカー個別ミュートで停止
  if (!isSfxOn()) return;
  if (save && save.minipoker && save.minipoker.muted) return;
  // SFX全体音量を gain にかけるため、_mpSfxScale をセット
  _mpSfxScale = sfxVolFloat();
  switch (kind) {
    case 'tap':       mpTone(720, 0.06, 'square', 0.03); break;
    case 'deal':      for (let i = 0; i < 5; i++) mpTone(440 + i*30, 0.05, 'triangle', 0.04, 0.003, 0.03, i * 80); break;
    case 'flip':      mpTone(620, 0.08, 'sine', 0.05); mpTone(880, 0.06, 'triangle', 0.04, 0.005, 0.03, 80); break;
    case 'reach':     mpSweep(300, 700, 0.4, 'sine', 0.06); mpSweep(700, 1100, 0.35, 'triangle', 0.04, 100); break;
    case 'bet':       mpTone(380, 0.06, 'square', 0.04); break;
    case 'win':       mpTone(660, 0.1, 'triangle', 0.06); mpTone(880, 0.12, 'triangle', 0.06, 0.005, 0.05, 100); mpTone(1100, 0.18, 'triangle', 0.06, 0.005, 0.06, 220); break;
    case 'bigwin':
      [523, 659, 784, 1046].forEach((f, i) => mpTone(f, 0.18, 'triangle', 0.07, 0.005, 0.08, i * 90));
      [392, 494, 587].forEach((f, i) => mpTone(f, 0.4, 'sawtooth', 0.025, 0.01, 0.2, 360 + i * 30));
      break;
    case 'royal':
      // ファンファーレ：和音重ね＋上昇スイープ
      [523, 659, 784].forEach(f => mpTone(f, 0.5, 'sawtooth', 0.05, 0.01, 0.3));
      [659, 784, 988, 1318].forEach((f, i) => mpTone(f, 0.45, 'triangle', 0.06, 0.005, 0.2, 400 + i * 100));
      mpSweep(200, 2000, 1.2, 'sine', 0.04, 200);
      [1046, 1318, 1568, 2093].forEach((f, i) => mpTone(f, 0.6, 'triangle', 0.05, 0.005, 0.3, 1000 + i * 80));
      break;
    case 'lose':      mpSweep(440, 180, 0.3, 'sawtooth', 0.04); break;
    case 'tie':       mpTone(440, 0.15, 'sine', 0.04); mpTone(440, 0.15, 'sine', 0.04, 0.005, 0.05, 180); break;
    case 'double-win':mpSweep(440, 1200, 0.3, 'square', 0.05); mpTone(1500, 0.15, 'triangle', 0.06, 0.005, 0.08, 200); break;
    case 'double-lose': mpSweep(800, 100, 0.5, 'sawtooth', 0.06); break;
    case 'milestone': // 連勝マイルストーン
      [523, 659, 784, 1046, 1318].forEach((f, i) => mpTone(f, 0.15, 'square', 0.06, 0.005, 0.05, i * 60));
      break;
    case 'allin':     mpSweep(80, 400, 0.4, 'sawtooth', 0.08); mpTone(120, 0.6, 'square', 0.05, 0.01, 0.3, 200); break;
    case 'garapon':   mpSweep(200, 1500, 0.6, 'triangle', 0.05); mpTone(1800, 0.2, 'sine', 0.06, 0.005, 0.1, 600); break;

    // ── 本編バトル用SFX（equippedSePack: 'casino' でチップ音が厚くリアル寄りに） ──
    case 'check':     mpTone(500, 0.07, 'sine', 0.04); break;
    case 'call':
      mpTone(420, 0.07, 'triangle', 0.045);
      if (save && save.equippedSePack === 'casino') mpChipClack(2);
      break;
    case 'battle-bet':
      mpTone(500, 0.08, 'square', 0.045); mpTone(650, 0.06, 'triangle', 0.035, 0.004, 0.03, 60);
      if (save && save.equippedSePack === 'casino') mpChipClack(3);
      break;
    case 'battle-allin':
      mpSweep(100, 500, 0.45, 'sawtooth', 0.07); mpTone(140, 0.5, 'square', 0.05, 0.01, 0.25, 180);
      if (save && save.equippedSePack === 'casino') mpChipClack(6);
      break;
    case 'fold':      mpSweep(400, 180, 0.25, 'sine', 0.035); break;
    case 'hand-win':
      mpTone(587, 0.14, 'triangle', 0.055); mpTone(784, 0.16, 'triangle', 0.055, 0.005, 0.06, 110);
      mpTone(988, 0.22, 'triangle', 0.055, 0.005, 0.08, 240);
      break;
    case 'hand-lose':
      mpSweep(380, 160, 0.35, 'sawtooth', 0.04);
      break;
  }
}

// 「カジノ」SEパック専用：チップが数枚パチパチと重なる音（bet/allin をリアル寄りに）
function mpChipClack(n) {
  const ctx = mpAudioCtx(); if (!ctx) return;
  for (let i = 0; i < n; i++) {
    mpTone(2200 + Math.random() * 900, 0.03, 'square', 0.025, 0.001, 0.02, i * 45 + Math.random() * 20);
  }
}

// ── 環境BGM（低音パッドのカジノ風ループ） ──
let _mpBgmNodes = [];
let _mpBgmTimer = null;
function mpStartBgm() {
  // BGM全体OFF または ミニポーカー個別ミュートなら鳴らさない
  if (!isBgmOn()) return;
  if (save && save.minipoker && save.minipoker.muted) return;
  // 実音源のミニゲームBGMへ（ロビー曲を止めて排他再生）
  playSceneBgm('minigame');
}
function mpStopBgm() {
  // 旧シンセループが残っていれば掃除（現在は未使用だが安全のため）
  if (_mpBgmTimer) { clearInterval(_mpBgmTimer); _mpBgmTimer = null; }
  _mpBgmNodes = [];
  if (typeof stopSceneBgm === 'function') stopSceneBgm();
}

// ── BGMスキン（ロビー/バトル）：交換所で購入した equippedBgmLobby / equippedBgmBattle を
//    実際に鳴らす。mpStartBgm と同じ和音ループ手法を流用し、スキンごとに音色/進行を変える。
let _skinBgmNodes = [];
let _skinBgmTimer = null;
function _stopSkinBgm() {
  if (_skinBgmTimer) { clearInterval(_skinBgmTimer); _skinBgmTimer = null; }
  _skinBgmNodes = [];
}
// skin: 'jazz' | 'tense' | 'techno'
function _startSkinBgm(skin) {
  _stopSkinBgm();
  if (!isBgmOn()) return;
  const ctx = mpAudioCtx(); if (!ctx) return;

  if (skin === 'jazz') {
    // ロビーBGM「夜のジャズ」：スウィング感のある maj7/min7 進行、暖色ローパス
    const chords = [
      [261.6, 329.6, 392.0, 493.9],  // Cmaj7
      [220.0, 261.6, 329.6, 392.0],  // Am7
      [174.6, 220.0, 261.6, 329.6],  // Fmaj7
      [196.0, 246.9, 293.7, 349.2],  // G7
    ];
    const beatMs = 1800;
    let beat = 0;
    const playBeat = () => {
      if (!isBgmOn() || save.equippedBgmLobby !== 'jazz') return;
      const chord = chords[beat % chords.length];
      const tNow = ctx.currentTime;
      const scale = bgmVolFloat();
      chord.forEach((f, i) => {
        const swing = (i % 2 === 1) ? beatMs * 0.12 / 1000 : 0; // 軽いスウィング
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1100;
        o.type = 'triangle';
        o.frequency.value = f;
        const t0 = tNow + swing;
        const peak = 0.02 * scale, sustain = 0.014 * scale;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t0 + 0.3);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, sustain), t0 + beatMs / 1000 * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + beatMs / 1000);
        o.connect(g).connect(lp).connect(ctx.destination);
        o.start(t0); o.stop(t0 + beatMs / 1000 + 0.1);
        _skinBgmNodes.push(o, g);
      });
      beat++;
    };
    playBeat();
    _skinBgmTimer = setInterval(playBeat, beatMs);

  } else if (skin === 'tense') {
    // バトルBGM「緊迫の弦楽」：短調・トレモロがかった持続音で読み合いの緊張感
    const chords = [
      [220.0, 261.6, 311.1], // Am(b6)風
      [196.0, 233.1, 293.7], // G dim寄り
    ];
    const beatMs = 2400;
    let beat = 0;
    const playBeat = () => {
      if (!isBgmOn() || save.equippedBgmBattle !== 'tense') return;
      const chord = chords[beat % chords.length];
      const tNow = ctx.currentTime;
      const scale = bgmVolFloat();
      chord.forEach(f => {
        const o = ctx.createOscillator();
        const trem = ctx.createGain(); // トレモロ用の高速AM
        const g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 6.5; lfo.type = 'sine';
        lfoGain.gain.value = 0.5;
        lfo.connect(lfoGain).connect(trem.gain);
        trem.gain.value = 0.5;
        const peak = 0.016 * scale;
        g.gain.setValueAtTime(0, tNow);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), tNow + 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, tNow + beatMs / 1000);
        o.connect(trem).connect(g).connect(ctx.destination);
        lfo.start(tNow); o.start(tNow);
        lfo.stop(tNow + beatMs / 1000 + 0.1); o.stop(tNow + beatMs / 1000 + 0.1);
        _skinBgmNodes.push(o, g, lfo, trem, lfoGain);
      });
      beat++;
    };
    playBeat();
    _skinBgmTimer = setInterval(playBeat, beatMs);

  } else if (skin === 'techno') {
    // バトルBGM「電脳テクノ」：四つ打ちキック＋短いアルペジオ
    const arp = [523, 659, 784, 659];
    const beatMs = 340; // 高速パルス
    let beat = 0;
    const playBeat = () => {
      if (!isBgmOn() || save.equippedBgmBattle !== 'techno') return;
      const tNow = ctx.currentTime;
      const scale = bgmVolFloat();
      // キック（低いサブサイン、短い減衰）
      if (beat % 2 === 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(140, tNow);
        o.frequency.exponentialRampToValueAtTime(45, tNow + 0.12);
        g.gain.setValueAtTime(Math.max(0.0001, 0.09 * scale), tNow);
        g.gain.exponentialRampToValueAtTime(0.0001, tNow + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(tNow); o.stop(tNow + 0.2);
        _skinBgmNodes.push(o, g);
      }
      // アルペジオ（軽いサウ音）
      const f = arp[beat % arp.length];
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      o2.type = 'sawtooth'; o2.frequency.value = f;
      g2.gain.setValueAtTime(0, tNow);
      g2.gain.linearRampToValueAtTime(Math.max(0.0001, 0.02 * scale), tNow + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, tNow + beatMs / 1000 * 0.9);
      o2.connect(g2).connect(hp).connect(ctx.destination);
      o2.start(tNow); o2.stop(tNow + beatMs / 1000);
      _skinBgmNodes.push(o2, g2);
      beat++;
    };
    playBeat();
    _skinBgmTimer = setInterval(playBeat, beatMs);
  }
}

// ロビーBGMスキン切替の窓口：equippedBgmLobby が 'jazz' なら実ファイルの代わりにシンセを鳴らす
function applyLobbyBgmSkin() {
  const lobbyA = document.getElementById('lobby-bgm-audio');
  if (save.equippedBgmLobby === 'jazz') {
    if (lobbyA) lobbyA.pause();
    if (isBgmOn()) _startSkinBgm('jazz'); else _stopSkinBgm();
  } else {
    _stopSkinBgm();
    if (lobbyA && isBgmOn()) { lobbyA.volume = bgmVolFloat(); lobbyA.play().catch(() => {}); }
  }
}
// バトル突入時：シンセスキン購入者はシンセ、既定は実バトル/ボスBGMへ切替（ロビー曲は止める）
function startBattleBgmSkin() {
  const skin = save.equippedBgmBattle;
  if (skin === 'tense' || skin === 'techno') {
    const lobbyA = document.getElementById('lobby-bgm-audio');
    if (lobbyA) lobbyA.pause();
    if (typeof stopSceneBgm === 'function') stopSceneBgm();
    _stopSkinBgm();
    if (isBgmOn()) _startSkinBgm(skin);
    return;
  }
  // 既定：実音源のバトルBGM。ボス戦（ヴェルベット/裏リコ）は boss.mp3、通常は battle.mp3。
  const isBoss = !!(state && (state.isBoss || state.opponentId === 'velvet'));
  playSceneBgm(isBoss ? 'boss' : 'battle');
}
// バトル退出時：バトル専用音を止める（ロビーBGMは goLobby→tryStartLobbyBgm が再開）
function stopBattleBgmSkin() {
  if (save.equippedBgmBattle === 'tense' || save.equippedBgmBattle === 'techno') {
    _stopSkinBgm();
    applyLobbyBgmSkin();
    return;
  }
  if (typeof stopSceneBgm === 'function') stopSceneBgm();
}

// 今日の日付キー（YYYYMMDD）
function mpTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
}

// 日替わりカード裏スタイル（5種）
function mpCardBackStyle() {
  const styles = ['classic', 'check', 'wa', 'star', 'floral'];
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return styles[seed % styles.length];
}

// 今日のラッキー役（日付ベースで決定、ペア以上から）
function mpDailyLuckyRank() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  // ラッキー対象：1〜7（ロイヤル/ストフラは除外＝既に夢役）
  return 1 + (seed % 7);
}

/* =============================================================
   デイリーログインボーナス
   - 7日サイクル：Day1 50 / Day2 60 / Day3 80 / Day4 100 / Day5 120 / Day6 150 / Day7 300
   - 連続判定：前回受取が「昨日」なら streak+1、それ以外は streak=1 にリセット
   - 日付キーは mpTodayKey()（'YYYYMMDD' 形式）を再利用
   ============================================================= */
const LOGIN_BONUS_TABLE = [50, 60, 80, 100, 120, 150, 300]; // index 0 = Day1

// day（1〜7）に対応する受取コイン数
function loginBonusRewardForDay(day) {
  const idx = ((Math.max(1, day) - 1) % 7 + 7) % 7;
  return LOGIN_BONUS_TABLE[idx];
}

// 'YYYYMMDD' キーの「前日」の 'YYYYMMDD' キーを返す（DOM非依存の純関数）
function loginBonusPrevDateKey(key) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = parseInt(key.slice(4, 6), 10) - 1;
  const d = parseInt(key.slice(6, 8), 10);
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, '0')}${dt.getDate().toString().padStart(2, '0')}`;
}

// 純関数：前回受取日・streak・今日のキーから「今日受け取れる内容」を算出する
// 戻り値: { alreadyClaimedToday, day(1-7), reward, newStreak }
function loginBonusCompute(lastDate, streak, todayKey) {
  streak = (typeof streak === 'number' && !isNaN(streak) && streak > 0) ? streak : 0;
  if (lastDate === todayKey) {
    // 同日2回目：既に受取済みなので現在のstreakのまま返す（呼び出し側はalreadyClaimedTodayを見て何もしない）
    const day = ((Math.max(1, streak) - 1) % 7) + 1;
    return { alreadyClaimedToday: true, day, reward: loginBonusRewardForDay(day), newStreak: streak };
  }
  let newStreak;
  if (!lastDate) {
    newStreak = 1; // 初回
  } else {
    const yesterdayKey = loginBonusPrevDateKey(todayKey);
    newStreak = (lastDate === yesterdayKey) ? streak + 1 : 1; // 連続なら+1、空いたらリセット
  }
  const day = ((newStreak - 1) % 7) + 1;
  return { alreadyClaimedToday: false, day, reward: loginBonusRewardForDay(day), newStreak };
}

// ロビー入室時に1日1回だけ判定して表示する（初回導線を邪魔しないよう introPlayed 済みのみ）
function maybeShowLoginBonus() {
  if (!save || save.introPlayed !== true) return;
  const todayKey = mpTodayKey();
  const lb = save.loginBonus || { lastDate: '', streak: 0 };
  const plan = loginBonusCompute(lb.lastDate, lb.streak, todayKey);
  if (plan.alreadyClaimedToday) return;
  showLoginBonusModal(plan, todayKey);
}

function showLoginBonusModal(plan, todayKey) {
  const days = [];
  for (let i = 1; i <= 7; i++) {
    let status = 'future';
    if (i < plan.day) status = 'claimed';
    else if (i === plan.day) status = 'today';
    days.push({ day: i, reward: loginBonusRewardForDay(i), status });
  }
  const daysHtml = days.map(d => {
    const tag = d.status === 'claimed' ? '<div class="login-bonus-check">✓</div>'
              : d.status === 'today'   ? '<div class="login-bonus-tag">TODAY</div>'
              : (d.day === plan.day + 1) ? '<div class="login-bonus-tag login-bonus-tag-next">明日</div>' : '';
    return `
      <div class="login-bonus-day login-bonus-day-${d.status}">
        ${tag}
        <div class="login-bonus-day-label">Day${d.day}</div>
        <div class="login-bonus-coin">🪙</div>
        <div class="login-bonus-amount">${d.reward}</div>
      </div>
    `;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'login-bonus-overlay';
  overlay.innerHTML = `
    <div class="login-bonus-modal">
      <div class="login-bonus-modal-title">🎁 ログインボーナス Day${plan.day}</div>
      <div class="login-bonus-modal-sub">+${plan.reward} コイン</div>
      <div class="login-bonus-calendar">${daysHtml}</div>
      <button class="login-bonus-claim-btn">受け取る</button>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);

  overlay.querySelector('.login-bonus-claim-btn').addEventListener('click', () => {
    // 再帰的な二重表示を防ぐため、先にセーブへ書き込んでから演出・表示更新を行う
    save.loginBonus = { lastDate: todayKey, streak: plan.newStreak };
    save.coins = (save.coins || 0) + plan.reward;
    saveProgress();
    mpSfx('milestone');
    document.querySelectorAll('[data-bind="saveCoins"]').forEach(el => { el.textContent = save.coins; });
    overlay.remove();
    toast(`🎁 ログインボーナス Day${plan.day}：+${plan.reward} コイン！`);
  });
}

function showMiniPokerGame() {
  mpEnsureSave();
  // ── 対戦相手プール ──
  const oppPool = [
    { key: 'polka',  name: 'ポルカ',
      lines: { start: 'えへへっ、いっぱい引いちゃおー！', win: 'やった〜！わたしの勝ち〜！',
               lose: 'うぐぐ……つよ……', tie: 'ふぇ〜引き分け〜！',
               reach: 'おっ、なんかいい感じ？', big: 'うわっ、なにそれ強すぎ！' } },
    { key: 'selina', name: 'セリナ',
      lines: { start: 'ぼ……ボード、いや、手札を、よく見て', win: '……運も、実力のうち、なんだって',
               lose: 'う……強い。次は、ぼ、ぼくが……', tie: 'ふ、引き分け',
               reach: '……来そう、な、気配', big: 'う、嘘……そんな手……' } },
    { key: 'grano',  name: 'グラーノ',
      lines: { start: '期待値に従い、参りましょう', win: '数字は、私に微笑むものですから',
               lose: '見事。今夜の期待値は、お嬢さんに譲ります', tie: '引き分け。割り勘で如何かな',
               reach: 'ふむ、確率収束の予感が', big: '……これは、計算外でした' } },
    { key: 'velvet', name: 'ヴェルベット',
      lines: { start: 'ふふ、お遊びでも、本気で', win: 'あら、私の勝ち。お小遣いを頂きますね',
               lose: 'おみごと。今日は、あなたの夜', tie: '引き分け……悪くないわ',
               reach: 'ふふ、なにか企んでいるのね？', big: 'ま、まさか、その役……' } },
  ];
  const cleared = save.clearedStages || [];
  const available = oppPool.filter(o => o.key === 'polka' || o.key === 'selina' || cleared.includes(o.key));

  // 既存 overlay クリア
  const oldOv = document.querySelector('.minipoker-overlay');
  if (oldOv) oldOv.remove();

  // ── ゲーム状態 ──
  const ctx = {
    opp: available[Math.floor(Math.random() * available.length)],
    deck: newDeck(),
    player: [],
    cpu: [],
    held: [false, false, false, false, false],
    phase: 'wager',  // wager → deal → choose → reveal → result → double? → garapon?
    result: null,
    reward: 0,
    bet: save.minipoker.bet || 5,
    streak: 0,           // セッション内連勝
    doubleStack: 0,
    doublePending: false,
    bonusMult: 1.0,
    sessionStartCoins: save.coins,  // 収支表示用
    sessionWins: 0,
    sessionPlays: 0,
    sessionEarned: 0,
    handsAchieved: {},
    luckyRank: mpDailyLuckyRank(),
    quickMode: false,
    lastBetUsed: save.minipoker.bet || 5,
    shields: 0,
    history: [],
    insuranceUsed: false,
    dailyBonusUsed: (save.minipoker.dailyBonusDate === mpTodayKey()),  // 今日初回ボーナス済み？
    allInArmed: false,  // ALL IN ボタン経由のベットか（ミッション判定用）
  };
  // ※ dailyBonusDate の記録は「実際に1戦プレイして倍率を消費した時」(judge内) に行う。
  //   ここで書くと開いただけでボーナスが消滅してしまう。

  const overlay = document.createElement('div');
  overlay.className = 'minipoker-overlay';
  document.getElementById('stage').appendChild(overlay);

  // ── 初期 render（wager フェーズ） ──
  // 今日のカード裏スタイル（日替わり5種）
  ctx.cardBackStyle = mpCardBackStyle();
  // ボス夜判定（8%）：撃破済みヴェルベットがいる場合のみ
  const velvetAvail = available.find(o => o.key === 'velvet');
  ctx.bossNight = !!velvetAvail && Math.random() < 0.08;
  if (ctx.bossNight) ctx.opp = velvetAvail;
  renderShell();
  renderPhase();
  updateBoardStats();
  try { showTutorialIfNeeded(); } catch (e) { console.error('[mp] tutorial error:', e); }
  try { mpStartBgm(); } catch (e) { console.error('[mp] bgm error:', e); }
  try { startAmbientParticles(); } catch (e) { console.error('[mp] particles error:', e); }
  // ボス夜のバナー表示
  if (ctx.bossNight) {
    setTimeout(() => showBanner('🌹 今夜の特別卓！ 配当 ×3 ／ ベットも ×3'), 600);
  }
  // overlay解除時にBGM/粒子/idleを必ず停止
  // - MutationObserver でDOMから消えた瞬間に検出（safer than wrapping .remove）
  const cleanupFn = () => {
    mpStopBgm(); stopAmbientParticles(); stopMimiIdleLoop();
    // ミニゲームはロビーの上に開くので、閉じたらロビーBGMへ戻す
    if (isBgmOn() && state && state.screen === 'lobby') tryStartLobbyBgm();
  };
  const mObs = new MutationObserver(() => {
    if (!overlay.isConnected) { cleanupFn(); mObs.disconnect(); }
  });
  mObs.observe(document.body, { childList: true, subtree: true });

  function renderShell() {
    const p = save.minipoker;
    overlay.innerHTML = `
      <div class="minipoker-modal">
        <button class="minipoker-close" title="やめる">×</button>
        <div class="mp-header">
          <div class="mp-title">🎴 ファイブポーカー</div>
          <div class="mp-stats">
            <span class="mp-stat">💰 <span data-mpb="coins">${save.coins}</span></span>
            <span class="mp-stat mp-stat-jp" title="ロイヤルストレートフラッシュで全額獲得">💎 JP <span data-mpb="jackpot">${p.jackpot}</span></span>
            <span class="mp-stat mp-stat-session" data-mpb="sessionStat">💹 ±0</span>
            <span class="mp-stat">🔥 連勝 <span data-mpb="streak">0</span><span data-mpb="shields"></span></span>
            <span class="mp-stat">🏆 ${p.bestStreak}</span>
            <button class="mp-history-btn" data-mp="missions" title="今日のミッション">🎯</button>
            <button class="mp-history-btn" data-mp="history" title="履歴">📜</button>
            <button class="mp-ach-btn" data-mp="achievements" title="達成">🏅</button>
            <button class="mp-ach-btn" data-mp="mute" title="音">${save.minipoker.muted ? '🔇' : '🔊'}</button>
          </div>
        </div>

        <div class="minipoker-board">
          <!-- 配当表 -->
          <div class="mp-paytable" data-mpb="paytable"></div>

          <!-- メインプレイエリア -->
          <div class="mp-play">
            <!-- CPU 行 -->
            <div class="mp-side mp-cpu" data-mpb="cpuSide"></div>

            <!-- 中央：ステータス＋アクション -->
            <div class="mp-center" data-mpb="center"></div>

            <!-- プレイヤー行 -->
            <div class="mp-side mp-player" data-mpb="playerSide"></div>
          </div>
        </div>

        <!-- パーティクル/フラッシュ layer -->
        <div class="mp-fx-layer" data-mpb="fx"></div>
      </div>
    `;
    overlay.querySelector('.minipoker-close').addEventListener('click', () => {
      if (ctx.sessionPlays > 0) showSessionSummary();
      else overlay.remove();
    });
    // ── ヘッダボタン：renderShell の中で 1 回だけバインド（renderPhaseで再バインドしない）
    const headerAct = (sel, fn) => {
      const el = overlay.querySelector(sel);
      if (el) el.addEventListener('click', fn);
    };
    headerAct('[data-mp="missions"]',     showMissionsPanel);
    headerAct('[data-mp="history"]',      showHistoryPanel);
    headerAct('[data-mp="achievements"]', showAchievementsPanel);
    headerAct('[data-mp="mute"]',         toggleMute);
    renderPaytable();
  }

  function renderPaytable() {
    const cur = ctx.bet;
    const luckyR = ctx.luckyRank;
    const el = overlay.querySelector('[data-mpb="paytable"]');
    const luckyName = MP_PAYTABLE[luckyR].name;
    el.innerHTML = `
      <div class="mp-pt-title">配当表</div>
      <div class="mp-pt-lucky">🌟 今日のラッキー役<br><b>${luckyName}</b> が ×2 倍！</div>
      <table class="mp-pt">
        ${MP_PAYTABLE.slice().reverse().map(p => {
          if (p.mult === 0) return '';
          const isLucky = (p.rank === luckyR);
          const eff = p.mult * (isLucky ? 2 : 1);
          return `
            <tr class="${p.rank === 9 ? 'mp-pt-royal' : ''} ${isLucky ? 'mp-pt-todaylucky' : ''}">
              <td class="mp-pt-name">${isLucky ? '🌟' : ''}${p.name}</td>
              <td class="mp-pt-mult">×${eff}</td>
              <td class="mp-pt-payout">${eff * cur}</td>
            </tr>
          `;
        }).join('')}
      </table>
      <div class="mp-pt-note">勝負に勝てば ベット×倍率 を獲得。🌟 はその日限定 ×2 倍。</div>
    `;
  }

  function renderPhase() {
    const ph = ctx.phase;
    const cpuSide = overlay.querySelector('[data-mpb="cpuSide"]');
    const playerSide = overlay.querySelector('[data-mpb="playerSide"]');
    const center = overlay.querySelector('[data-mpb="center"]');
    // 防御：レンダ内エラーでフェーズが止まらないよう try/catch で個別包括
    try {
      cpuSide.innerHTML = renderSide(ctx.opp, ctx.cpu, false, ph === 'reveal' || ph === 'result' || ph === 'double');
    } catch (e) { console.error('[mp] cpuSide render error:', e); }
    try {
      playerSide.innerHTML = renderSide({ key: 'mimi', name: 'ミミ' }, ctx.player, true, true);
    } catch (e) { console.error('[mp] playerSide render error:', e); }
    try {
      center.innerHTML = renderCenter();
    } catch (e) {
      console.error('[mp] center render error:', e);
      // フォールバック：最低限の操作を確保
      if (ph === 'choose') {
        center.innerHTML = `
          <div class="mp-status">操作してください</div>
          <div class="mp-actions">
            <button class="mp-btn mp-btn-primary" data-mp="draw">🔄 引く</button>
            <button class="mp-btn mp-btn-ghost" data-mp="hold-all">⏸ 全部キープ</button>
          </div>`;
      } else if (ph === 'result') {
        center.innerHTML = `
          <div class="mp-status">結果</div>
          <div class="mp-actions">
            <button class="mp-btn mp-btn-primary" data-mp="next">もう一回</button>
            <button class="mp-btn mp-btn-ghost" data-mp="quit">やめる</button>
          </div>`;
      } else if (ph === 'wager') {
        center.innerHTML = `
          <div class="mp-status">ベット選択</div>
          <div class="mp-bet-row">
            ${MP_BET_LEVELS.map(b => `<button class="mp-bet-chip" data-mp-bet="${b}">${b}</button>`).join('')}
          </div>
          <div class="mp-actions">
            <button class="mp-btn mp-btn-primary" data-mp="deal">🎴 DEAL</button>
          </div>`;
      }
    }
    try { bindActions(); } catch (e) { console.error('[mp] bind error:', e); }
    try {
      if (ctx.phase === 'wager') startMimiIdleLoop();
      else stopMimiIdleLoop();
    } catch (e) { console.error('[mp] idle error:', e); }
  }

  function renderSide(charInfo, cards, isPlayer, faceUp) {
    const rotateClass = isPlayer ? '' : 'mp-char-flip';
    const cardsHtml = cards.length === 0
      ? '<div class="mp-hand-placeholder">———</div>'
      : `<div class="mp-hand">${cards.map((c, i) => renderCard(c, i, isPlayer, faceUp)).join('')}</div>`;
    const ev = cards.length === 5 ? evaluateHand(cards) : null;
    const showHandName = faceUp && ev;
    // ムードバッジ（プレイヤーのみ、手札強度で表情変化）
    let moodBadge = '';
    if (isPlayer && cards.length === 5 && ctx.phase === 'choose') {
      const pe = evaluateHand(cards);
      const mood = pe.rank >= 5 ? '✨' : pe.rank >= 2 ? '😃' : pe.rank === 1 ? '🤔' : '😟';
      const moodLabel = pe.rank >= 5 ? '期待大！' : pe.rank >= 2 ? '強気' : pe.rank === 1 ? '普通' : '困惑…';
      moodBadge = `<div class="mp-mood-badge" title="${moodLabel}">${mood}</div>`;
    }
    return `
      <div class="mp-char ${rotateClass}">
        ${moodBadge}
        <img class="mp-char-img" src="assets/characters/${charInfo.key}_mini.png"
             onerror="this.onerror=null;this.src='assets/characters/${charInfo.key}_default.png';this.onerror=function(){this.style.display='none'};">
        <div class="mp-char-name">${charInfo.name}</div>
      </div>
      ${cardsHtml}
      <div class="mp-handname ${ev && ev.rank >= 4 ? 'mp-handname-big' : ''}">
        ${showHandName ? ev.name : (cards.length === 5 ? '？？？' : '')}
      </div>
    `;
  }

  function renderCard(c, i, isPlayer, faceUp) {
    if (!faceUp) return `<div class="mp-card mp-card-back mp-cb-${ctx.cardBackStyle || 'classic'} mp-card-dealt" style="animation-delay:${i * 0.08}s" data-i="${i}"></div>`;
    const red = (c.suit === '♥' || c.suit === '♦');
    const held = isPlayer && ctx.held[i];
    const tapClass = (isPlayer && ctx.phase === 'choose') ? 'mp-tap' : '';
    // 役構成カードのハイライト（result/reveal フェーズのみ）
    let winnerClass = '';
    if ((ctx.phase === 'result' || ctx.phase === 'reveal') && faceUp) {
      const cards = isPlayer ? ctx.player : ctx.cpu;
      const ev = evaluateHand(cards);
      if (ev.bestFive && ev.rank >= 1) {
        const matches = ev.bestFive.some(b => b.rank === c.rank && b.suit === c.suit);
        if (matches && ev.rank >= 1) winnerClass = 'mp-card-winner';
      }
    }
    return `<div class="mp-card ${red ? 'mp-red' : 'mp-black'} ${held ? 'mp-held' : ''} ${tapClass} mp-card-dealt ${winnerClass}"
                 style="animation-delay:${i * 0.08}s"
                 data-i="${i}" ${isPlayer && ctx.phase === 'choose' ? 'data-mp-tap="1"' : ''}>
      <div class="mp-card-corner mp-card-tl">${c.label}<br>${c.suit}</div>
      <div class="mp-card-suit-big">${c.suit}</div>
      <div class="mp-card-corner mp-card-br">${c.label}<br>${c.suit}</div>
      ${held ? '<div class="mp-card-keep">KEEP</div>' : ''}
    </div>`;
  }

  function renderCenter() {
    if (ctx.phase === 'wager') {
      const betIdx = MP_BET_LEVELS.indexOf(ctx.bet);
      const allInAmount = Math.min(save.coins, 10000);
      const canAllIn = save.coins >= 100;
      const showDailyBonus = !ctx.dailyBonusUsed;
      const chipStackHtml = renderChipStack(ctx.bet);
      const hotcold = renderHotCold();
      return `
        ${hotcold}
        ${showDailyBonus ? '<div class="mp-daily-bonus">🌸 今日の初戦ボーナス　配当 ×2 ！</div>' : ''}
        <div class="mp-status mp-status-wager">
          ベットを選んで「DEAL」<br>
          <small>勝てば <b>ベット×倍率</b> のコイン獲得</small>
        </div>
        ${chipStackHtml}
        <div class="mp-bet-row">
          ${MP_BET_LEVELS.map((b, i) => `
            <button class="mp-bet-chip ${i === betIdx ? 'on' : ''}" data-mp-bet="${b}" ${b > save.coins ? 'disabled' : ''}>${b}</button>
          `).join('')}
        </div>
        ${canAllIn ? `
          <button class="mp-allin-btn" data-mp-bet="${allInAmount}">
            🔥 ALL IN（${allInAmount} 🪙 全力勝負）
          </button>
        ` : ''}
        <div class="mp-bet-display">現在のベット：<b>${ctx.bet}</b>　🪙</div>
        <div class="mp-vol-bar mp-vol-${ctx.bet >= 500 ? 'high' : ctx.bet >= 100 ? 'mid' : 'low'}">
          <span class="mp-vol-label">ボラ予測</span>
          <span class="mp-vol-text">期待損益 ± ${Math.round(ctx.bet * 8)} 🪙</span>
        </div>
        <div class="mp-actions">
          <button class="mp-btn mp-btn-deal" data-mp="deal" ${save.coins < (ctx.bossNight ? ctx.bet * 3 : ctx.bet) ? 'disabled' : ''}>
            🎴 DEAL${ctx.bossNight ? `（💎 特別卓 ${ctx.bet * 3} 🪙）` : ''}
          </button>
          <button class="mp-btn mp-btn-auto" data-mp="autoplay" ${save.coins < ctx.bet * 3 ? 'disabled' : ''}>
            ▶▶ 3連戦自動
          </button>
        </div>
        ${save.coins < (ctx.bossNight ? ctx.bet * 3 : ctx.bet) ? '<div class="mp-warn">⚠ コイン不足（特別卓はベット×3必要）</div>' : ''}
      `;
    }
    if (ctx.phase === 'deal') {
      return `<div class="mp-status">カード配布中…</div>`;
    }
    if (ctx.phase === 'choose') {
      const keep = ctx.held.filter(Boolean).length;
      const drop = 5 - keep;
      const reach = detectReach(ctx.player);
      const reachProb = computeReachProb(ctx.player, ctx.deck.length);
      const surrenderReturn = Math.floor((ctx.effectiveBet || ctx.bet) / 2);
      const round = (ctx.drawRound || 0) + 1;  // 表示用 1-indexed
      const isLastRound = (ctx.drawRound || 0) >= 1;  // 2回引き終わったら強制勝負
      return `
        <div class="mp-status">
          <b>${round}回目の交換</b> ／ 残すカードはそのまま、いらない札をタップで外す<br>
          <small>${drop > 0 ? `${drop}枚を引き直す（KEEPマーク付きは残す）` : '全部キープ＝そのまま勝負'}</small>
        </div>
        ${reach ? `<div class="mp-reach">${reach}${reachProb ? ` <span class="mp-reach-prob">(完成${reachProb}%)</span>` : ''}</div>` : ''}
        <div class="mp-actions">
          <button class="mp-btn mp-btn-primary" data-mp="draw">
            ${drop > 0 ? `🔄 ${drop}枚を引く${isLastRound ? '（最終）' : ''}` : '⚡ そのまま勝負'}
          </button>
          <button class="mp-btn mp-btn-ghost" data-mp="hold-all">⏸ 全部キープして勝負</button>
          ${!isLastRound ? '' : ''}
          <button class="mp-btn mp-btn-surrender" data-mp="surrender" title="負け確実なら半額返却で降りる">
            🩹 サレンダー（${surrenderReturn} 🪙 返却）
          </button>
        </div>
      `;
    }
    if (ctx.phase === 'reveal') {
      return `<div class="mp-status">勝負！</div>`;
    }
    if (ctx.phase === 'result') {
      const r = ctx.result;
      const next = nextLabel();
      const canRepeat = save.coins >= ctx.lastBetUsed;
      // 大きな結果バナー（操作可能までしばらく目立たせる）
      return `
        <div class="mp-result-banner mp-result-${r}">
          ${r === 'win'  ? `<div class="mp-result-headline">🏆 勝利！</div><div class="mp-result-amount">+${ctx.reward} 🪙</div>` :
            r === 'lose' ? `<div class="mp-result-headline">💧 ${ctx.opp.name} の勝ち</div><div class="mp-result-amount">${ctx.reward > 0 ? `返却 +${ctx.reward} 🪙` : 'ベット没収……'}</div>` :
                           `<div class="mp-result-headline">🤝 引き分け</div><div class="mp-result-amount">返金 +${ctx.reward} 🪙</div>`}
        </div>
        ${(r === 'win' && ctx.canDouble && ctx.doubleStack < 3) ? `
          <div class="mp-double-pitch">
            🎲 <b>ダブルアップに挑戦？</b><br>
            <small>次の1枚が赤か黒、当てたら <b>×2</b>（最大×8）</small>
          </div>
          <div class="mp-actions">
            <button class="mp-btn mp-btn-double" data-mp="double">▶ 挑戦</button>
            <button class="mp-btn mp-btn-primary" data-mp="next">${next}</button>
          </div>
        ` : `
          <div class="mp-actions">
            <button class="mp-btn mp-btn-primary" data-mp="next">${next}</button>
            ${canRepeat ? `<button class="mp-btn mp-btn-repeat" data-mp="repeat">▶▶ 同ベットで連戦（${ctx.lastBetUsed} 🪙）</button>` : ''}
            <button class="mp-btn mp-btn-ghost" data-mp="quit">やめる</button>
          </div>
        `}
      `;
    }
    if (ctx.phase === 'garapon') {
      return `
        <div class="mp-status mp-status-bonus">
          🎰 <b>ボーナスチャンス！</b><br>
          <small>3つのガラポンから1つ選んで！</small>
        </div>
        <div class="mp-garapon-row" data-mpb="garaponSlots">
          <button class="mp-garapon-slot" data-mp-garapon="0">？</button>
          <button class="mp-garapon-slot" data-mp-garapon="1">？</button>
          <button class="mp-garapon-slot" data-mp-garapon="2">？</button>
        </div>
        <div class="mp-double-hint">外れ：そのまま／当たり：報酬の <b>×2〜×5</b></div>
      `;
    }
    if (ctx.phase === 'double') {
      const total = ctx.reward;
      const stack = ctx.doubleStack;
      // Hi-Lo方式：見せ札は ctx.doubleShowCard
      if (!ctx.doubleShowCard) ctx.doubleShowCard = ctx.deck.shift();
      const sc = ctx.doubleShowCard;
      const red = (sc.suit === '♥' || sc.suit === '♦');
      const r = sc.rank;
      // 7はジョーカー扱い：プッシュ（引き分け）
      return `
        <div class="mp-status mp-status-double">
          🎲 Hi-Lo ダブルアップ（×${Math.pow(2, stack)} → ×${Math.pow(2, stack + 1)}）<br>
          <small>見せ札より「高い」「低い」を予想　獲得：<b>${total}</b> → 当てれば <b>${total * 2}</b></small>
        </div>
        <div class="mp-double-cards">
          <div class="mp-card ${red ? 'mp-red' : 'mp-black'} mp-card-shown">
            <div class="mp-card-corner mp-card-tl">${sc.label}<br>${sc.suit}</div>
            <div class="mp-card-suit-big">${sc.suit}</div>
            <div class="mp-card-corner mp-card-br">${sc.label}<br>${sc.suit}</div>
          </div>
          <div class="mp-card mp-card-back mp-card-next-hl">？</div>
        </div>
        <div class="mp-hilo-actions">
          <button class="mp-btn mp-btn-double" data-mp-hilo="low">▼ 低い（2〜${r - 1 || '?'}）</button>
          <button class="mp-btn mp-btn-double" data-mp-hilo="high">▲ 高い（${r + 1 > 14 ? '?' : r + 1}〜A）</button>
        </div>
        <div class="mp-double-hint">7 が出ると引き分けで没収（賢く選んで）</div>
      `;
    }
    return '';
  }

  function nextLabel() {
    if (ctx.streak >= 5) return '🔥 絶好調！もう一勝！';
    if (ctx.streak >= 3) return '🔥 連勝続行！次へ';
    if (ctx.result === 'win') return '✨ もう一回';
    if (ctx.result === 'lose') return '⚡ リベンジ！';
    return 'もう一回';
  }

  // ベット額に応じたチップスタック描画
  function renderChipStack(bet) {
    let stacks;
    if (bet >= 5000) stacks = 6;
    else if (bet >= 500) stacks = 5;
    else if (bet >= 100) stacks = 4;
    else if (bet >= 25)  stacks = 3;
    else if (bet >= 5)   stacks = 2;
    else stacks = 1;
    const colors = ['#ddd', '#54c9ff', '#80c060', '#c084fc', '#f5d77a', '#ff4060'];
    let html = '<div class="mp-chipstack">';
    for (let i = 0; i < stacks; i++) {
      html += `<div class="mp-chip-piece" style="background:${colors[Math.min(i, colors.length-1)]};bottom:${i * 6}px;animation-delay:${i*0.05}s"></div>`;
    }
    html += `<div class="mp-chipstack-label">${bet}</div></div>`;
    return html;
  }

  // 直近10戦の勝率からホット/コールド表示
  function renderHotCold() {
    if (ctx.history.length < 3) return '';
    const wins = ctx.history.filter(h => h.result === 'win').length;
    const rate = wins / ctx.history.length;
    if (rate >= 0.7) return `<div class="mp-hotcold mp-hot">🔥 絶好調！（${Math.round(rate*100)}%）</div>`;
    if (rate <= 0.3) return `<div class="mp-hotcold mp-cold">🧊 ピンチ……（${Math.round(rate*100)}%）リベンジ！</div>`;
    return '';
  }

  // 残デッキから役完成確率を計算（防御的）
  function computeReachProb(cards, deckLen) {
    try {
      if (!cards || !Array.isArray(cards) || cards.length === 0) return null;
      if (!deckLen || deckLen <= 0) return null;
      const ranks = cards.map(c => c.rank);
      const suits = cards.map(c => c.suit);
      const suitCount = {};
      suits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);
      if (Object.values(suitCount).some(v => v === 4)) {
        return Math.round((9 / deckLen) * 100);
      }
      const uniq = [...new Set(ranks)].sort((a, b) => a - b);
      if (uniq.length >= 4) {
        for (let i = 0; i + 3 < uniq.length; i++) {
          if (uniq[i + 3] - uniq[i] === 3) {
            const need = (uniq[i] === 2 || uniq[i + 3] === 14) ? 4 : 8;
            return Math.round((need / deckLen) * 100);
          }
        }
      }
      const rc = {};
      ranks.forEach(r => rc[r] = (rc[r] || 0) + 1);
      if (Object.values(rc).some(v => v === 3)) return Math.round((1 / deckLen) * 100);
      return null;
    } catch (e) {
      console.error('[mp] computeReachProb error:', e);
      return null;
    }
  }

  function detectReach(cards) {
    try {
      if (!cards || !Array.isArray(cards) || cards.length < 5) return null;
      return _detectReach(cards);
    } catch (e) { console.error('[mp] detectReach error:', e); return null; }
  }
  function _detectReach(cards) {
    // 4to-Royal / 4to-Flush / 4to-Straight / 4-of-a-kindの素材 を簡易検出
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    // フラッシュリーチ：同スートが4枚
    const suitCount = {};
    suits.forEach(s => suitCount[s] = (suitCount[s] || 0) + 1);
    if (Object.values(suitCount).some(v => v === 4)) return '🌟 フラッシュ リーチ！（あと1枚で完成）';
    // ストレートリーチ：5枚中4枚が連続してる組み合わせ
    const uniq = [...new Set(ranks)].sort((a, b) => a - b);
    if (uniq.length >= 4) {
      for (let i = 0; i <= uniq.length - 4; i++) {
        if (uniq[i + 3] - uniq[i] === 3) return '🌟 ストレート リーチ！（あと1枚で完成）';
      }
      // A-2-3-4 や 10-J-Q-K の wheel/high
      if (uniq.includes(14)) {
        const lowSet = uniq.filter(r => r <= 5);
        if (lowSet.length >= 3) return '🌟 ストレート リーチ！（A-2-3-4-5 狙い）';
      }
    }
    // フォーリーチ：3 of a kind
    const rc = {};
    ranks.forEach(r => rc[r] = (rc[r] || 0) + 1);
    if (Object.values(rc).some(v => v === 3)) return '✨ フォーカード リーチ！（あと1枚）';
    return null;
  }

  function bindActions() {
    overlay.querySelectorAll('[data-mp-bet]').forEach(b => {
      b.addEventListener('click', () => {
        ctx.bet = +b.dataset.mpBet;
        save.minipoker.bet = ctx.bet;
        // ALL IN 判定はボタン自体で行う（額での推定は少額オールインを取りこぼす）
        ctx.allInArmed = b.classList.contains('mp-allin-btn');
        saveProgress();
        mpSfx('bet');
        if (ctx.allInArmed) {
          mpSfx('allin');
          const sh = overlay.querySelector('.minipoker-modal');
          sh.classList.add('mp-shake-light');
          setTimeout(() => sh.classList.remove('mp-shake-light'), 400);
          showBanner('🔥 ALL IN！');
        }
        renderPaytable();
        renderPhase();
      });
    });
    overlay.querySelectorAll('[data-mp-tap]').forEach(el => {
      el.addEventListener('click', () => {
        if (ctx.phase !== 'choose') return;
        const i = +el.dataset.i;
        ctx.held[i] = !ctx.held[i];
        spawnTapParticles(el);
        renderPhase();
        playFx('tap');
        mpSfx('tap');
      });
    });
    overlay.querySelectorAll('[data-mp-double]').forEach(el => {
      el.addEventListener('click', () => doDouble(+el.dataset.mpDouble));
    });
    overlay.querySelectorAll('[data-mp-garapon]').forEach(el => {
      el.addEventListener('click', () => doGarapon(+el.dataset.mpGarapon));
    });
    const act = (sel, fn) => overlay.querySelector(sel)?.addEventListener('click', fn);
    act('[data-mp="deal"]', () => startDeal(false));
    act('[data-mp="draw"]', doDraw);
    act('[data-mp="hold-all"]', () => {
      ctx.held = [true, true, true, true, true];
      doDraw();
    });
    act('[data-mp="next"]', startNext);
    act('[data-mp="repeat"]', () => {
      // 同ベットで連戦：ベットを前回値に戻して即DEAL
      ctx.bet = ctx.lastBetUsed;
      save.minipoker.bet = ctx.bet;
      // ボス卓（×3）を黙って持ち越さない：連戦でも毎回抽選し直し、当選時は明示
      const velvetAvail = available.find(o => o.key === 'velvet');
      ctx.bossNight = !!velvetAvail && Math.random() < 0.08;
      ctx.opp = ctx.bossNight ? velvetAvail
                              : available[Math.floor(Math.random() * available.length)];
      ctx.player = [];
      ctx.cpu = [];
      ctx.held = [false, false, false, false, false];
      ctx.phase = 'wager';
      saveProgress();
      renderPhase();
      if (ctx.bossNight) showBanner('🌹 特別卓！ 配当 ×3 ／ ベットも ×3');
      // 即DEAL（quick mode）
      setTimeout(() => startDeal(true), 50);
    });
    act('[data-mp="quit"]', () => overlay.remove());
    act('[data-mp="double"]', () => {
      ctx.phase = 'double';
      ctx.doubleShowCard = null;
      renderPhase();
    });
    act('[data-mp="surrender"]', doSurrender);
    act('[data-mp="autoplay"]', startAutoPlay);
    // ヘッダボタン (history/achievements/missions/mute) は renderShell で1度だけバインド済み
    overlay.querySelectorAll('[data-mp-hilo]').forEach(el => {
      el.addEventListener('click', () => doHiLo(el.dataset.mpHilo));
    });
  }

  function doSurrender() {
    // 実際に支払った額（ボス夜は×3）の半額を返却
    const refund = Math.floor((ctx.effectiveBet || ctx.bet) / 2);
    save.coins += refund;
    ctx.reward = refund;
    ctx.result = 'lose';
    ctx.streak = 0; // サレンダーは連勝途切れ
    ctx.phase = 'result';
    ctx.canDouble = false;
    saveProgress();
    updateBoardStats();
    renderPhase();
    mpSfx('lose');
    showBanner('🩹 サレンダー');
    flashCharLine('player', 'ふぅ……無理せず撤退！');
  }

  function doHiLo(dir) {
    const sc = ctx.doubleShowCard;
    const nextCard = ctx.deck.shift();
    const slot = overlay.querySelector('.mp-card-next-hl');
    if (slot) {
      const red = (nextCard.suit === '♥' || nextCard.suit === '♦');
      slot.classList.remove('mp-card-back');
      slot.classList.add(red ? 'mp-red' : 'mp-black', 'mp-card-flipped');
      slot.innerHTML = `
        <div class="mp-card-corner mp-card-tl">${nextCard.label}<br>${nextCard.suit}</div>
        <div class="mp-card-suit-big">${nextCard.suit}</div>
        <div class="mp-card-corner mp-card-br">${nextCard.label}<br>${nextCard.suit}</div>
      `;
    }
    setTimeout(() => {
      let win;
      if (nextCard.rank === sc.rank) {
        // 同値はプッシュ＝失敗扱い
        win = false;
      } else if (dir === 'high') {
        win = (nextCard.rank > sc.rank);
      } else {
        win = (nextCard.rank < sc.rank);
      }
      if (win) {
        ctx.doubleStack += 1;
        const newReward = ctx.reward * 2;
        save.coins += (newReward - ctx.reward);
        ctx.reward = newReward;
        save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) + (newReward / 2);
        incrementMissionProgress('doubleWins', 1); // ミッション「ダブルアップ成功」
        saveProgress();
        updateBoardStats();
        playFx('double-win'); mpSfx('double-win');
        showBanner(`🎯 的中！ ×${Math.pow(2, ctx.doubleStack)} → ${ctx.reward} 🪙`);
        ctx.phase = 'result';
        ctx.canDouble = ctx.doubleStack < 3;
        ctx.doubleShowCard = null;
        renderPhase();
      } else {
        save.coins -= ctx.reward;
        if (save.coins < 0) save.coins = 0;
        save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) - ctx.reward;
        ctx.reward = 0;
        ctx.result = 'lose';
        ctx.streak = 0;
        saveProgress();
        updateBoardStats();
        playFx('double-lose'); mpSfx('double-lose');
        showBanner('💧 失敗… 没収');
        ctx.phase = 'result';
        ctx.canDouble = false;
        ctx.doubleShowCard = null;
        renderPhase();
      }
    }, 900);
  }

  function showHistoryPanel() {
    const exist = overlay.querySelector('.mp-panel-history');
    if (exist) { exist.remove(); return; }
    const panel = document.createElement('div');
    panel.className = 'mp-side-panel mp-panel-history';
    panel.innerHTML = `
      <div class="mp-panel-title">📜 履歴（直近10戦）</div>
      <div class="mp-panel-body">
        ${ctx.history.length === 0 ? '<div class="mp-panel-empty">まだプレイしてません</div>' :
          ctx.history.map(h => `
            <div class="mp-hist-row mp-hist-${h.result}">
              <span class="mp-hist-hand">${h.hand}</span>
              <span class="mp-hist-result">${h.result === 'win' ? '勝' : h.result === 'lose' ? '負' : '分'}</span>
              <span class="mp-hist-reward">${h.reward >= 0 ? '+' : ''}${h.reward}</span>
            </div>
          `).join('')}
      </div>
      <button class="mp-panel-close" data-mp-panel-close>×</button>
    `;
    overlay.querySelector('.minipoker-modal').appendChild(panel);
    panel.querySelector('[data-mp-panel-close]').addEventListener('click', () => panel.remove());
  }

  function showAchievementsPanel() {
    const exist = overlay.querySelector('.mp-panel-ach');
    if (exist) { exist.remove(); return; }
    const ach = save.minipoker.achievements;
    const panel = document.createElement('div');
    panel.className = 'mp-side-panel mp-panel-ach';
    panel.innerHTML = `
      <div class="mp-panel-title">🏅 達成バッジ <small>${Object.keys(ach).length}/${MP_ACHIEVEMENTS.length}</small></div>
      <div class="mp-panel-body">
        ${MP_ACHIEVEMENTS.map(a => {
          const got = !!ach[a.id];
          return `
            <div class="mp-ach-row ${got ? 'on' : 'off'}">
              <span class="mp-ach-icon">${got ? a.icon : '🔒'}</span>
              <span class="mp-ach-info">
                <span class="mp-ach-name">${got ? a.name : '？？？'}</span>
                <span class="mp-ach-cond">${a.cond}</span>
              </span>
            </div>
          `;
        }).join('')}
      </div>
      <button class="mp-panel-close" data-mp-panel-close>×</button>
    `;
    overlay.querySelector('.minipoker-modal').appendChild(panel);
    panel.querySelector('[data-mp-panel-close]').addEventListener('click', () => panel.remove());
  }

  function toggleMute() {
    save.minipoker.muted = !save.minipoker.muted;
    saveProgress();
    if (save.minipoker.muted) mpStopBgm();
    else mpStartBgm();
    const btn = overlay.querySelector('[data-mp="mute"]');
    if (btn) btn.textContent = save.minipoker.muted ? '🔇' : '🔊';
  }

  function showMissionsPanel() {
    const exist = overlay.querySelector('.mp-panel-mission');
    if (exist) { exist.remove(); return; }
    const ms = save.minipoker.missions || [];
    const prog = save.minipoker.missionsProgress || {};
    const panel = document.createElement('div');
    panel.className = 'mp-side-panel mp-panel-mission';
    panel.innerHTML = `
      <div class="mp-panel-title">🎯 今日のミッション</div>
      <div class="mp-panel-body">
        ${ms.map(m => {
          const cur = Math.min(prog[m.id] || 0, m.goal);
          const done = cur >= m.goal;
          const claimed = !!prog[m.id + '_claimed'];
          return `
            <div class="mp-mission-row ${done ? 'done' : ''}">
              <div class="mp-mission-name">${m.name}</div>
              <div class="mp-mission-progress">${cur}/${m.goal}</div>
              <div class="mp-mission-reward">💰+${m.reward}</div>
              ${done && !claimed ? `<button class="mp-mission-claim" data-mp-claim="${m.id}" data-reward="${m.reward}">受取</button>` : claimed ? '<span class="mp-mission-claimed">✓</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <button class="mp-panel-close" data-mp-panel-close>×</button>
    `;
    overlay.querySelector('.minipoker-modal').appendChild(panel);
    panel.querySelector('[data-mp-panel-close]').addEventListener('click', () => panel.remove());
    panel.querySelectorAll('[data-mp-claim]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.mpClaim;
        const reward = +b.dataset.reward;
        save.coins += reward;
        save.minipoker.missionsProgress[id + '_claimed'] = true;
        saveProgress();
        updateBoardStats();
        showBanner(`🎯 ミッション報酬 +${reward} 🪙`);
        mpSfx('milestone');
        panel.remove();
        showMissionsPanel();
      });
    });
  }

  function incrementMissionProgress(metric, value) {
    const ms = save.minipoker.missions || [];
    const prog = save.minipoker.missionsProgress || {};
    let unlocked = false;
    ms.forEach(m => {
      if (m.metric !== metric) return;
      const prev = prog[m.id] || 0;
      if (prev >= m.goal) return;
      if (metric === 'maxStreak') {
        prog[m.id] = Math.max(prev, value);
      } else {
        prog[m.id] = prev + value;
      }
      if (prog[m.id] >= m.goal && prev < m.goal) {
        unlocked = true;
        setTimeout(() => showBanner(`🎯 ミッション「${m.name}」達成！`), 800);
      }
    });
    save.minipoker.missionsProgress = prog;
    saveProgress();
  }

  function startAutoPlay() {
    if (ctx.phase !== 'wager') return;
    ctx.autoCount = 3;
    runAutoStep();
  }
  function runAutoStep() {
    if (!ctx.autoCount || ctx.autoCount <= 0) return;
    if (save.coins < ctx.bet) return;
    ctx.autoCount--;
    startDeal(true);
    // 高速：configure choose to draw all (no holds)
    setTimeout(() => {
      if (ctx.phase === 'choose') {
        // 自動ホールド：シンプル戦略でキープ
        const cpuHold = cpuPickHolds(ctx.player);
        ctx.held = cpuHold;
        doDraw();
      }
    }, 600);
    // 次戦へ
    setTimeout(() => {
      if (ctx.autoCount > 0 && ctx.phase === 'result') {
        ctx.opp = available[Math.floor(Math.random() * available.length)];
        ctx.player = [];
        ctx.cpu = [];
        ctx.held = [false, false, false, false, false];
        ctx.phase = 'wager';
        renderPhase();
        setTimeout(() => runAutoStep(), 300);
      }
    }, 2400);
  }

  // ── 環境粒子（漂うハート・星・コイン） ──
  // ※ var 必須：showMiniPokerGame 冒頭から呼ばれるため let だと TDZ エラー
  var _ambientTimer = null;
  function startAmbientParticles() {
    stopAmbientParticles();
    const tick = () => {
      const fx = overlay.querySelector('[data-mpb="fx"]');
      if (!fx) return;
      const emojis = ['💖', '✨', '⭐', '🪙', '💕', '🌟'];
      const e = document.createElement('div');
      e.className = 'mp-ambient-particle';
      e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      e.style.left = Math.random() * 100 + '%';
      e.style.fontSize = (12 + Math.random() * 12) + 'px';
      e.style.animationDuration = (8 + Math.random() * 6) + 's';
      fx.appendChild(e);
      setTimeout(() => e.remove(), 14000);
    };
    _ambientTimer = setInterval(tick, 1800);
  }
  function stopAmbientParticles() {
    if (_ambientTimer) { clearInterval(_ambientTimer); _ambientTimer = null; }
  }

  function unlockAchievement(id) {
    if (save.minipoker.achievements[id]) return;
    const a = MP_ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return;
    save.minipoker.achievements[id] = Date.now();
    saveProgress();
    // トースト
    const t = document.createElement('div');
    t.className = 'mp-ach-toast';
    t.innerHTML = `<span class="mp-ach-toast-icon">${a.icon}</span><span class="mp-ach-toast-name">${a.name} 達成！</span>`;
    overlay.querySelector('[data-mpb="fx"]').appendChild(t);
    setTimeout(() => t.remove(), 3000);
    mpSfx('milestone');
  }

  // ── フェーズ進行 ──
  function startDeal(quick) {
    // ボス夜は実質ベット×3 を消費
    const effectiveBet = ctx.bossNight ? ctx.bet * 3 : ctx.bet;
    if (save.coins < effectiveBet) return;
    save.coins -= effectiveBet;
    ctx.effectiveBet = effectiveBet;
    ctx.lastBetUsed = ctx.bet;
    ctx.quickMode = !!quick;
    // ジャックポット積立（ベットの5%）
    save.minipoker.jackpot = (save.minipoker.jackpot || 5000) + Math.ceil(effectiveBet * 0.05);
    ctx.insuranceUsed = false;
    // ALL IN ミッション進捗
    if (ctx.allInArmed) incrementMissionProgress('allins', 1);
    incrementMissionProgress('plays', 1);
    saveProgress();
    updateBoardStats();
    // 新規ハンド
    ctx.deck = newDeck();
    ctx.player = ctx.deck.splice(0, 5);
    ctx.cpu = ctx.deck.splice(0, 5);
    ctx.held = [false, false, false, false, false];
    ctx.phase = 'deal';
    ctx.doubleStack = 0;
    renderPhase();
    mpSfx('deal');
    flashCharLine('player', mpMimiLine('start'));
    if (!quick) flashCharLine('cpu', mpLine(ctx.opp.key, 'start'));
    const dealMs = quick ? 400 : 700;
    setTimeout(() => {
      try {
        // ── 自動おすすめキープ：シンプル戦略でペア以上のカード等を pre-hold ──
        // ユーザーは「ハズレ札だけタップして外す」操作で済む
        ctx.held = cpuPickHolds(ctx.player);
        ctx.drawRound = 0; // 1回目の交換ラウンド
        ctx.phase = 'choose';
        renderPhase();
      } catch (e) { console.error('[mp] deal->choose transition error:', e); ctx.phase = 'choose'; renderPhase(); }
      try {
        const reach = detectReach(ctx.player);
        if (reach) { playFx('reach'); mpSfx('reach'); flashCharLine('cpu', mpLine(ctx.opp.key, 'reach')); }
      } catch (e) { console.error('[mp] reach detection error:', e); }
    }, dealMs);
  }

  function doDraw() {
    // プレイヤー側：held=false のカードを引き直し
    for (let i = 0; i < 5; i++) {
      if (!ctx.held[i]) ctx.player[i] = ctx.deck.shift();
    }
    const round = ctx.drawRound || 0;
    // ── 1回目で全部 KEEP（drop=0）の場合は即勝負へ、それ以外は2回目チャンス ──
    const keepCount = ctx.held.filter(Boolean).length;
    const dropCount = 5 - keepCount;
    const wasAllKeep = dropCount === 0;
    if (round === 0 && !wasAllKeep) {
      // 1回目の交換完了。CPUはまだ動かさず、プレイヤーに 2回目の選択肢を与える
      ctx.drawRound = 1;
      // 2回目用に再 auto-hold（新しい配り直し札を踏まえて）
      ctx.held = cpuPickHolds(ctx.player);
      ctx.phase = 'choose';
      renderPhase();
      mpSfx('flip');
      flashCharLine('player', 'もう一回交換できますっ！');
      return;
    }
    // 最終ラウンド：CPU も引き直し → reveal
    const cpuHold = cpuPickHolds(ctx.cpu);
    for (let i = 0; i < 5; i++) {
      if (!cpuHold[i]) ctx.cpu[i] = ctx.deck.shift();
    }
    ctx.phase = 'reveal';
    renderPhase();
    playFx('flip');
    mpSfx('flip');
    // 大役（フラッシュ以上）はタメ時間を延長＋途中で「……！」
    const pe = evaluateHand(ctx.player);
    const longSuspense = pe.rank >= 5 && !ctx.quickMode;
    if (longSuspense) {
      setTimeout(() => {
        // 1.2秒の地点で「来る…！」フラッシュ
        const fx = overlay.querySelector('[data-mpb="fx"]');
        if (fx) {
          const sus = document.createElement('div');
          sus.className = 'mp-suspense';
          sus.textContent = '……！';
          fx.appendChild(sus);
          setTimeout(() => sus.remove(), 800);
          mpSfx('reach');
        }
      }, 1200);
    }
    const revealMs = ctx.quickMode ? 700 : (longSuspense ? 2000 : 1200);
    setTimeout(judge, revealMs);
  }

  function judge() {
    const pe = evaluateHand(ctx.player);
    const ce = evaluateHand(ctx.cpu);
    let result, payout = 0;
    // Jacks-or-Better 判定（ペアは J 以上のみ配当）
    const playerHasPayHand = (pe.rank >= 2) || (pe.rank === 1 && pe.bestFive && pe.bestFive.some(c => c.rank >= 11 && pe.bestFive.filter(x => x.rank === c.rank).length === 2));
    let result2;
    if (pe.score > ce.score) {
      result2 = 'win';
    } else if (pe.score < ce.score) {
      result2 = 'lose';
    } else {
      result2 = 'tie';
    }
    // 配当計算
    const payEntry = MP_PAYTABLE[pe.rank];
    const mult = (pe.rank === 1)
      ? (playerHasPayHand ? 1 : 0)
      : payEntry.mult;

    // 連勝補正
    let bonusMult = 1.0;
    if (ctx.streak >= 5) bonusMult = 2.0;
    else if (ctx.streak >= 3) bonusMult = 1.5;

    // 今日のラッキー役なら ×2 補正
    const luckyMult = (pe.rank === ctx.luckyRank) ? 2 : 1;
    // 初日ボーナス：当日初プレイは配当×2
    const dailyMult = (!ctx.dailyBonusUsed) ? 2 : 1;
    let usedShield = false;
    // ボス夜は配当×3
    const bossMult = ctx.bossNight ? 3 : 1;
    if (result2 === 'win') {
      payout = Math.max(1, Math.floor(ctx.bet * (mult || 1) * bonusMult * luckyMult * dailyMult * bossMult));
      ctx.streak += 1;
      // ミッション：勝利数 / 連勝 / ペア+ / フラッシュ / フルハウス / ラッキー
      incrementMissionProgress('wins', 1);
      incrementMissionProgress('maxStreak', ctx.streak);
      if (pe.rank >= 1) incrementMissionProgress('pairPlus', 1);
      if (pe.rank === 5) incrementMissionProgress('flushes', 1);
      if (pe.rank === 6) incrementMissionProgress('fullhouse', 1);
      if (pe.rank === ctx.luckyRank) incrementMissionProgress('luckyHits', 1);
      // 5連勝でシールド獲得（上限2）
      if (ctx.streak === 5 && ctx.shields < 2) { ctx.shields += 1; showBanner('🛡️ シールド獲得！'); mpSfx('milestone'); }
      if (ctx.streak === 10 && ctx.shields < 2) { ctx.shields += 1; showBanner('🛡️🛡️ シールド2個目！'); mpSfx('milestone'); }
    } else if (result2 === 'tie') {
      // 返金は実際に支払った額（ボス夜は×3を払っているので×3返す）
      payout = ctx.effectiveBet || ctx.bet;
    } else {
      payout = 0;
      // シールドで連勝救済
      if (ctx.shields > 0 && ctx.streak >= 3) {
        ctx.shields -= 1;
        usedShield = true;
        showBanner('🛡️ シールド発動！連勝維持');
        mpSfx('milestone');
        unlockAchievement('survive_shield');
      } else {
        ctx.streak = 0;
      }
    }
    // ジャックポット獲得（ロイヤル時、全額放出して初期値5000に戻す）
    let jackpotPayout = 0;
    if (pe.rank === 9 && result2 === 'win') {
      jackpotPayout = save.minipoker.jackpot || 5000;
      save.minipoker.jackpot = 5000;
      payout += jackpotPayout;
      unlockAchievement('jackpot_win');
    }
    ctx.reward = payout;
    ctx.result = result2;
    ctx.phase = 'result';
    ctx.canDouble = (result2 === 'win' && payout > 0);
    ctx.bonusMult = bonusMult;
    // 報酬付与
    save.coins += payout;
    // 初日ボーナス消費（実プレイ時にはじめて日付を記録＝開いただけでは消えない）
    if (!ctx.dailyBonusUsed) {
      ctx.dailyBonusUsed = true;
      save.minipoker.dailyBonusDate = mpTodayKey();
    }
    // コイン飛翔演出（勝利時）
    if (result2 === 'win' && payout > 0) {
      flyCoinsToStat(Math.min(20, Math.max(5, Math.floor(payout / 50))));
    }
    // 大役カットイン（フラッシュ以上）
    if (pe.rank >= 5 && pe.rank < 9) {
      showHandCutin(pe.name);
    }
    // セーブ蓄積
    save.minipoker.totalGames = (save.minipoker.totalGames || 0) + 1;
    save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) + payout - ctx.bet;
    if (result2 === 'win') save.minipoker.totalWins = (save.minipoker.totalWins || 0) + 1;
    if (ctx.streak > (save.minipoker.bestStreak || 0)) save.minipoker.bestStreak = ctx.streak;
    if (pe.rank === 9) save.minipoker.royalCount = (save.minipoker.royalCount || 0) + 1;
    if (pe.rank === 8) save.minipoker.stfCount = (save.minipoker.stfCount || 0) + 1;
    // セッション記録
    ctx.sessionPlays += 1;
    if (result2 === 'win') ctx.sessionWins += 1;
    ctx.sessionEarned += (payout - ctx.bet);
    ctx.handsAchieved[pe.rank] = (ctx.handsAchieved[pe.rank] || 0) + 1;
    // 履歴に追記
    ctx.history.unshift({ hand: pe.name, result: result2, reward: payout - ctx.bet });
    if (ctx.history.length > 10) ctx.history.pop();
    // 達成バッジ判定
    if (result2 === 'win') unlockAchievement('first_win');
    if (ctx.streak >= 3) unlockAchievement('streak_3');
    if (ctx.streak >= 5) unlockAchievement('streak_5');
    if (ctx.streak >= 10) unlockAchievement('streak_10');
    if (pe.rank === 6) unlockAchievement('first_fh');
    if (pe.rank === 7) unlockAchievement('first_four');
    if (pe.rank === 8) unlockAchievement('first_stf');
    if (pe.rank === 9) unlockAchievement('first_royal');
    if (save.minipoker.totalGames >= 100) unlockAchievement('plays_100');
    if (payout >= ctx.bet * 100) unlockAchievement('big_win_100x');
    saveProgress();
    renderPhase();
    updateBoardStats();

    // ── 演出（音＋画像姿勢＋エフェクト） ──
    setCharPose('player', null);
    setCharPose('cpu', null);
    if (pe.rank === 9) {
      // ロイヤル：超特別＋ジャックポット獲得
      playFx('royal');
      mpSfx('royal');
      setCharPose('player', 'win-pose');
      setCharPose('cpu', 'lose-pose');
      flashCharLine('cpu', mpLine(ctx.opp.key, 'big'));
      flashCharLine('player', `ロイヤル！＋💎JP ${jackpotPayout}🪙！`);
      jumboCharCelebrate('player');
      if (jackpotPayout > 0) {
        setTimeout(() => showBanner(`💎 JACKPOT +${jackpotPayout} 🪙`), 600);
        rainCoins(80, 5000);
      }
    } else if (result2 === 'win') {
      setCharPose('player', 'win-pose');
      setCharPose('cpu', 'lose-pose');
      if (pe.rank >= 7) {
        playFx('bigwin'); mpSfx('bigwin');
        flashCharLine('cpu', mpLine(ctx.opp.key, 'big'));
        jumboCharCelebrate('player');
      } else if (pe.rank >= 4) {
        playFx('bigwin'); mpSfx('bigwin');
      } else {
        playFx('win'); mpSfx('win');
      }
      flashCharLine('player', pe.rank >= 4 ? 'やったぁ！' : 'ふっふ〜ん♪');
      // マイルストーン連勝演出
      milestoneCheck(ctx.streak);
      // フォーカード以上はガラポンチャンス発火
      if (pe.rank >= 7 && Math.random() < 0.7) {
        setTimeout(() => {
          ctx.phase = 'garapon';
          ctx.garaponBase = ctx.reward;
          // 3つのスロットに [×1, ×2, ×5] をランダム配置
          const choices = [1, 2, 5].sort(() => Math.random() - 0.5);
          ctx.garaponChoices = choices;
          renderPhase();
          showBanner('🎰 ボーナスチャンス！');
          mpSfx('garapon');
        }, 1400);
      }
    } else if (result2 === 'tie') {
      playFx('tie'); mpSfx('tie');
    } else {
      playFx('lose'); mpSfx('lose');
      setCharPose('player', 'lose-pose');
      setCharPose('cpu', 'win-pose');
      flashCharLine('cpu', mpLine(ctx.opp.key, 'win'));
      flashCharLine('player', 'うう……');
    }
  }

  function milestoneCheck(streak) {
    const milestones = [3, 5, 10, 15, 20];
    if (!milestones.includes(streak)) return;
    const banners = {
      3:  '🔥 3連勝！次戦 ×1.5 ボーナス',
      5:  '🔥🔥 5連勝！絶好調 ×2.0 ボーナス',
      10: '💎 10連勝！伝説の波',
      15: '👑 15連勝！神域到達',
      20: '🌌 20連勝！レジェンド',
    };
    showBanner(banners[streak]);
    mpSfx('milestone');
    const sh = overlay.querySelector('.minipoker-modal');
    sh.classList.add('mp-shake-light');
    setTimeout(() => sh.classList.remove('mp-shake-light'), 400);
    if (streak >= 10) rainCoins(20, 1800);
  }

  function setCharPose(side, poseClass) {
    const sel = side === 'cpu' ? '.mp-cpu .mp-char' : '.mp-player .mp-char';
    const el = overlay.querySelector(sel);
    if (!el) return;
    el.classList.remove('mp-char-win-pose', 'mp-char-lose-pose');
    if (poseClass) el.classList.add(`mp-char-${poseClass}`);
    if (poseClass === 'win-pose') {
      // ハート粒子
      for (let i = 0; i < 4; i++) {
        const h = document.createElement('div');
        h.className = 'mp-char-heart';
        h.textContent = ['💖', '✨', '💕', '🌟'][i];
        h.style.left = (40 + Math.random() * 20) + 'px';
        h.style.animationDelay = (i * 0.15) + 's';
        el.appendChild(h);
        setTimeout(() => h.remove(), 2000);
      }
    }
  }

  function jumboCharCelebrate(side) {
    // 勝利キャラが画面中央に jumbo で飛び出す（1.5s）
    const src = side === 'player' ? 'assets/characters/mimi_mini.png' : `assets/characters/${ctx.opp.key}_mini.png`;
    const fx = overlay.querySelector('[data-mpb="fx"]');
    const jumbo = document.createElement('div');
    jumbo.className = 'mp-jumbo-char';
    jumbo.innerHTML = `<img src="${src}" onerror="this.onerror=null;this.src='${src.replace('_mini.png','_default.png')}';this.onerror=function(){this.style.display='none'}"/>`;
    fx.appendChild(jumbo);
    setTimeout(() => jumbo.remove(), 1800);
  }

  function doGarapon(idx) {
    const choices = ctx.garaponChoices;
    const pick = choices[idx];
    const slots = overlay.querySelectorAll('[data-mp-garapon]');
    slots.forEach((el, i) => {
      const v = choices[i];
      el.textContent = v === 1 ? '×1' : v === 2 ? '×2' : '×5';
      el.classList.add(`mp-garapon-${v}`);
      if (i === idx) el.classList.add('mp-garapon-picked');
    });
    setTimeout(() => {
      const extra = ctx.garaponBase * (pick - 1);
      if (extra > 0) {
        save.coins += extra;
        ctx.reward += extra;
        save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) + extra;
        ctx.sessionEarned += extra;
        saveProgress();
        updateBoardStats();
        playFx('bigwin'); mpSfx('bigwin');
        showBanner(pick === 5 ? `🎯 大当たり！+${extra} 🪙` : `🎉 当たり！+${extra} 🪙`);
        rainCoins(15, 1800);
      } else {
        showBanner('🪙 残念！そのまま');
        mpSfx('tie');
      }
      ctx.phase = 'result';
      renderPhase();
    }, 1100);
  }

  function doDouble(idx) {
    // 3枚のカードからランダムで「正解」枠を決め、選んだ位置と照合
    const cards = [];
    for (let i = 0; i < 3; i++) cards.push(ctx.deck.shift());
    const picked = cards[idx];
    // 赤/黒のターゲット：プレイヤーには事前に「赤当てる？黒当てる？」聞かない簡易版
    // → カードの色をランダムに決め、合えば勝ち
    // 公平性：赤と黒は各26枚なので5割（条件付きでもほぼ50%）
    const correct = (picked.suit === '♥' || picked.suit === '♦');
    // 全カードを公開（演出）
    const slots = overlay.querySelectorAll('[data-mp-double]');
    slots.forEach((el, i) => {
      const c = cards[i];
      const red = (c.suit === '♥' || c.suit === '♦');
      el.classList.remove('mp-card-back');
      el.classList.add('mp-card-flipped');
      el.classList.add(red ? 'mp-red' : 'mp-black');
      el.innerHTML = `
        <div class="mp-card-corner mp-card-tl">${c.label}<br>${c.suit}</div>
        <div class="mp-card-suit-big">${c.suit}</div>
        <div class="mp-card-corner mp-card-br">${c.label}<br>${c.suit}</div>
      `;
      if (i === idx) el.classList.add('mp-card-picked');
    });
    setTimeout(() => {
      if (correct) {
        ctx.doubleStack += 1;
        const newReward = ctx.reward * 2;
        save.coins += (newReward - ctx.reward); // 差分を追加
        ctx.reward = newReward;
        save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) + (newReward - ctx.reward / 2);
        saveProgress();
        updateBoardStats();
        playFx('double-win');
        showBanner(`🎯 ダブルアップ成功！ ×${Math.pow(2, ctx.doubleStack)} → ${ctx.reward} 🪙`);
        ctx.phase = 'result';
        ctx.canDouble = ctx.doubleStack < 3;
        renderPhase();
      } else {
        // 失敗：reward を没収
        save.coins -= ctx.reward;
        if (save.coins < 0) save.coins = 0;
        save.minipoker.totalEarned = (save.minipoker.totalEarned || 0) - ctx.reward;
        saveProgress();
        updateBoardStats();
        ctx.reward = 0;
        ctx.result = 'lose';
        ctx.streak = 0;
        playFx('double-lose');
        showBanner('💧 ダブルアップ失敗… 没収');
        ctx.phase = 'result';
        ctx.canDouble = false;
        renderPhase();
      }
    }, 900);
  }

  function startNext() {
    // 次戦：bossNight を再抽選（永続化バグ修正）
    const velvetAvail = available.find(o => o.key === 'velvet');
    ctx.bossNight = !!velvetAvail && Math.random() < 0.08;
    ctx.opp = ctx.bossNight ? velvetAvail
                            : available[Math.floor(Math.random() * available.length)];
    ctx.phase = 'wager';
    ctx.player = [];
    ctx.cpu = [];
    ctx.held = [false, false, false, false, false];
    ctx.doubleStack = 0;
    ctx.doubleShowCard = null;
    renderPhase();
    if (ctx.bossNight) {
      setTimeout(() => showBanner('🌹 今夜の特別卓！ 配当 ×3 ／ ベットも ×3'), 200);
    }
  }

  // ── 補助：ステータス更新 ──
  function updateBoardStats() {
    const c = overlay.querySelector('[data-mpb="coins"]');
    const s = overlay.querySelector('[data-mpb="streak"]');
    const sh = overlay.querySelector('[data-mpb="shields"]');
    const jp = overlay.querySelector('[data-mpb="jackpot"]');
    const sess = overlay.querySelector('[data-mpb="sessionStat"]');
    if (c) animateNumber(c, save.coins);
    if (s) s.textContent = ctx.streak;
    if (sh) sh.textContent = ctx.shields > 0 ? ' ' + '🛡️'.repeat(ctx.shields) : '';
    if (jp) animateNumber(jp, save.minipoker.jackpot || 5000);
    if (sess) {
      const delta = save.coins - ctx.sessionStartCoins;
      sess.textContent = `💹 ${delta >= 0 ? '+' : ''}${delta}`;
      sess.classList.toggle('mp-stat-plus', delta > 0);
      sess.classList.toggle('mp-stat-minus', delta < 0);
    }
  }

  // ── セッションサマリー ──
  function showSessionSummary() {
    const delta = save.coins - ctx.sessionStartCoins;
    const winRate = ctx.sessionPlays > 0 ? Math.round((ctx.sessionWins / ctx.sessionPlays) * 100) : 0;
    const bestHand = Object.keys(ctx.handsAchieved).map(k => +k).reduce((a, b) => a > b ? a : b, 0);
    const bestHandName = MP_PAYTABLE[bestHand]?.name || 'ハイカード';
    // 明日のラッキー役予告
    const d = new Date(); d.setDate(d.getDate() + 1);
    const tomorrowSeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const tomorrowRank = 1 + (tomorrowSeed % 7);
    const tomorrowName = MP_PAYTABLE[tomorrowRank].name;
    const dialog = document.createElement('div');
    dialog.className = 'mp-summary-dialog';
    dialog.innerHTML = `
      <div class="mp-summary-card">
        <div class="mp-summary-title">📊 今夜のセッション</div>
        <div class="mp-summary-stats">
          <div class="mp-sum-row"><span>プレイ回数</span><b>${ctx.sessionPlays}</b></div>
          <div class="mp-sum-row"><span>勝率</span><b>${winRate}%</b></div>
          <div class="mp-sum-row"><span>最高役</span><b>${bestHandName}</b></div>
          <div class="mp-sum-row mp-sum-${delta >= 0 ? 'plus' : 'minus'}"><span>収支</span><b>${delta >= 0 ? '+' : ''}${delta} 🪙</b></div>
        </div>
        <div class="mp-summary-tomorrow">
          🌟 明日のラッキー役予告：<b>${tomorrowName}</b>
        </div>
        <div class="mp-summary-actions">
          <button class="mp-btn mp-btn-primary" data-mp-sum="continue">▶ 続ける</button>
          <button class="mp-btn mp-btn-ghost" data-mp-sum="quit">またね</button>
        </div>
      </div>
    `;
    overlay.appendChild(dialog);
    dialog.querySelector('[data-mp-sum="continue"]').addEventListener('click', () => dialog.remove());
    dialog.querySelector('[data-mp-sum="quit"]').addEventListener('click', () => overlay.remove());
  }

  // ── チュートリアル（初回のみ）──
  function showTutorialIfNeeded() {
    if (save.minipoker.tutorialDone) return;
    const tut = document.createElement('div');
    tut.className = 'mp-tutorial';
    tut.innerHTML = `
      <div class="mp-tut-card">
        <div class="mp-tut-title">🎴 ファイブポーカー 入門</div>
        <ol class="mp-tut-steps">
          <li>① <b>ベットを選ぶ</b>（チップ or ALL IN）</li>
          <li>② DEAL → カードを <b>残すかタップで指定</b></li>
          <li>③ 引き直して <b>役で配当ゲット</b>！</li>
        </ol>
        <div class="mp-tut-hint">🌟 今日のラッキー役は ×2 倍、勝てばダブルアップも狙えます。</div>
        <button class="mp-btn mp-btn-primary" data-mp-tut="ok">はじめる！</button>
      </div>
    `;
    overlay.appendChild(tut);
    tut.querySelector('[data-mp-tut]').addEventListener('click', () => {
      tut.remove();
      save.minipoker.tutorialDone = true;
      saveProgress();
    });
  }

  function animateNumber(el, to) {
    const from = +el.textContent || 0;
    const dur = 600;
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = v;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── キャラ吹き出し ──
  function flashCharLine(side, text) {
    const target = overlay.querySelector(side === 'cpu' ? '.mp-cpu .mp-char' : '.mp-player .mp-char');
    if (!target || !text) return;
    // 既存の吹き出しを片付け
    target.querySelectorAll('.mp-bubble').forEach(b => b.remove());
    const bubble = document.createElement('div');
    bubble.className = `mp-bubble mp-bubble-${side}`;
    bubble.textContent = text;
    target.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2800);
  }

  // ── 中央バナー ──
  function showBanner(text) {
    const fx = overlay.querySelector('[data-mpb="fx"]');
    if (!fx) return;
    const b = document.createElement('div');
    b.className = 'mp-banner';
    b.textContent = text;
    fx.appendChild(b);
    setTimeout(() => b.remove(), 2400);
  }

  // ── エフェクト ──
  function playFx(kind) {
    const fx = overlay.querySelector('[data-mpb="fx"]');
    if (!fx) return;
    if (kind === 'royal') {
      // ロイヤル：金フラッシュ＋コイン雨＋特大ロゴ
      const flash = document.createElement('div');
      flash.className = 'mp-flash-royal';
      fx.appendChild(flash);
      setTimeout(() => flash.remove(), 1800);
      const logo = document.createElement('div');
      logo.className = 'mp-royal-logo';
      logo.innerHTML = '<div>ROYAL</div><div>FLUSH!!</div>';
      fx.appendChild(logo);
      setTimeout(() => logo.remove(), 4000);
      rainCoins(60, 4000);
    } else if (kind === 'bigwin') {
      const flash = document.createElement('div');
      flash.className = 'mp-flash-big';
      fx.appendChild(flash);
      setTimeout(() => flash.remove(), 900);
      rainCoins(24, 1800);
    } else if (kind === 'win') {
      rainCoins(8, 1200);
    } else if (kind === 'lose') {
      const sh = overlay.querySelector('.minipoker-modal');
      sh.classList.add('mp-shake-light');
      setTimeout(() => sh.classList.remove('mp-shake-light'), 400);
    } else if (kind === 'reach') {
      const flash = document.createElement('div');
      flash.className = 'mp-flash-reach';
      fx.appendChild(flash);
      setTimeout(() => flash.remove(), 700);
    } else if (kind === 'double-win') {
      rainCoins(20, 1600);
    } else if (kind === 'double-lose') {
      const sh = overlay.querySelector('.minipoker-modal');
      sh.classList.add('mp-shake-light');
      setTimeout(() => sh.classList.remove('mp-shake-light'), 400);
    }
  }

  // コインがプレイエリア中央から所持コイン表示へ飛んでいく
  function flyCoinsToStat(count) {
    const fx = overlay.querySelector('[data-mpb="fx"]');
    const target = overlay.querySelector('[data-mpb="coins"]');
    if (!target || !fx) return;
    const tr = target.getBoundingClientRect();
    const sr = fx.getBoundingClientRect();
    const dx = tr.left + tr.width / 2 - sr.left;
    const dy = tr.top  + tr.height / 2 - sr.top;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'mp-coin-fly';
      c.textContent = '🪙';
      c.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
      c.style.top = (50 + (Math.random() - 0.5) * 10) + '%';
      c.style.setProperty('--dx', dx + 'px');
      c.style.setProperty('--dy', dy + 'px');
      c.style.animationDelay = (i * 30) + 'ms';
      fx.appendChild(c);
      setTimeout(() => c.remove(), 1100 + i * 30);
    }
  }

  // 大役カットイン
  function showHandCutin(name) {
    const fx = overlay.querySelector('[data-mpb="fx"]');
    if (!fx) return;
    const cut = document.createElement('div');
    cut.className = 'mp-hand-cutin';
    cut.textContent = name + '！';
    fx.appendChild(cut);
    setTimeout(() => cut.remove(), 1400);
  }

  // タップ時の可愛い粒子
  function spawnTapParticles(el) {
    const rect = el.getBoundingClientRect();
    const fx = overlay.querySelector('[data-mpb="fx"]');
    if (!fx) return;
    const fxRect = fx.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - fxRect.left;
    const cy = rect.top  + rect.height / 2 - fxRect.top;
    const emojis = ['💖', '✨', '⭐', '💕', 'ぱにゅ'];
    for (let i = 0; i < 3; i++) {
      const p = document.createElement('div');
      p.className = 'mp-tap-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = cx + 'px';
      p.style.top  = cy + 'px';
      const ang = (Math.PI * 2 * i / 3) + Math.random() * 0.5;
      const dist = 40 + Math.random() * 20;
      p.style.setProperty('--ddx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--ddy', Math.sin(ang) * dist + 'px');
      fx.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  // ミミのアイドルジェスチャー（wager 中ランダム）
  // ※ var 必須：renderPhase が宣言行より先に実行されるため let だと TDZ エラー
  var _mimiIdleTimer = null;
  function startMimiIdleLoop() {
    stopMimiIdleLoop();
    const tick = () => {
      if (ctx.phase !== 'wager') return;
      const img = overlay.querySelector('.mp-player .mp-char-img');
      if (img) {
        const gestures = ['mp-idle-wink', 'mp-idle-tilt', 'mp-idle-hop', 'mp-idle-punyu', 'mp-idle-stretch'];
        const g = gestures[Math.floor(Math.random() * gestures.length)];
        img.classList.add(g);
        setTimeout(() => img.classList.remove(g), 1200);
      }
      _mimiIdleTimer = setTimeout(tick, 3500 + Math.random() * 4000);
    };
    _mimiIdleTimer = setTimeout(tick, 2000);
  }
  function stopMimiIdleLoop() {
    if (_mimiIdleTimer) { clearTimeout(_mimiIdleTimer); _mimiIdleTimer = null; }
  }

  function rainCoins(count, duration) {
    const fx = overlay.querySelector('[data-mpb="fx"]');
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'mp-coin-drop';
      c.textContent = '🪙';
      c.style.left = (Math.random() * 100) + '%';
      c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      c.style.animationDelay = (Math.random() * 0.8) + 's';
      c.style.fontSize = (18 + Math.random() * 18) + 'px';
      fx.appendChild(c);
      setTimeout(() => c.remove(), duration + 800);
    }
  }

  // ── CPU AI（保持選択） ──
  function cpuPickHolds(cards) {
    const ev = evaluateHand(cards);
    const hold = [false, false, false, false, false];
    if (ev.rank >= 4) { return [true, true, true, true, true]; } // ストレート以上は全キープ
    const rc = {};
    cards.forEach(c => rc[c.rank] = (rc[c.rank] || 0) + 1);
    // フラッシュドロー検出（同スート4枚）
    const sc = {};
    cards.forEach(c => sc[c.suit] = (sc[c.suit] || 0) + 1);
    const flushSuit = Object.entries(sc).find(([s, n]) => n === 4)?.[0];
    if (flushSuit) {
      cards.forEach((c, i) => { hold[i] = (c.suit === flushSuit); });
      return hold;
    }
    // ペア以上は役構成だけ保持
    if (ev.rank >= 1) {
      cards.forEach((c, i) => { if (rc[c.rank] >= 2) hold[i] = true; });
      return hold;
    }
    // ハイカード：A/K のみ
    cards.forEach((c, i) => { if (c.rank >= 13) hold[i] = true; });
    return hold;
  }
}

function showMemoryViewer(memoryId) {
  const m = MEMORY_CONTENT[memoryId];
  if (!m) return;
  const body = (typeof m.body === 'function') ? m.body() : m.body;
  const overlay = document.createElement('div');
  overlay.className = 'memory-viewer-overlay';
  overlay.innerHTML = `
    <div class="memory-viewer">
      <button class="memory-viewer-close" title="閉じる">×</button>
      <div class="memory-viewer-title">${m.title}</div>
      <div class="memory-viewer-body">${body}</div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelector('.memory-viewer-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showCollectionModal() {
  const stageOrder = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
  const stages = stageOrder.map(id => {
    const opp = OPPONENTS[id];
    if (!opp) return null;
    const cleared = save.clearedStages.includes(id);
    const rank = save.bestRanks && save.bestRanks[id];
    const wins = (save.rematchWins && save.rematchWins[id]) || 0;
    return { id, name: opp.name, theme: opp.theme, cleared, rank, wins };
  }).filter(Boolean);
  const stageCleared = stages.filter(s => s.cleared).length;

  const allItems = SHOP_ITEMS;
  const ownedItems = save.ownedItems || [];
  const itemsByCat = {};
  allItems.forEach(i => {
    if (!itemsByCat[i.cat]) itemsByCat[i.cat] = [];
    itemsByCat[i.cat].push({ ...i, owned: ownedItems.includes(i.id) });
  });
  const catLabels = { panyu: 'ぱにゅ強化', note: '知識ノート', skin: 'スキン', memory: 'メモリ', stack: '初期チップ' };

  const notesCount = (save.unlockedNotes || []).length;

  const outfits = RICO_OUTFITS.map(o => ({
    ...o,
    unlocked: isRicoViewerUnlocked(),
  }));
  const outfitUnlocked = outfits.filter(o => o.unlocked).length;

  // 達成項目
  const achievements = [
    { id: 'first_clear', name: '初勝利', desc: 'ポルカ撃破', achieved: save.clearedStages.includes('polka') },
    { id: 'reader',      name: 'ボード読み', desc: 'セリナ撃破', achieved: save.clearedStages.includes('selina') },
    { id: 'math',        name: '算数の徒', desc: 'グラーノ撃破', achieved: save.clearedStages.includes('grano') },
    { id: 'champion',    name: '圧倒の継承者', desc: 'ヴェルベット撃破', achieved: save.clearedStages.includes('velvet') },
    { id: 'ending',      name: 'エンディング', desc: '物語を見届けた', achieved: isEndingUnlocked() },
    { id: 'backdoor',    name: '裏モード解放', desc: '7タップの秘密', achieved: !!save.backdoorUnlocked },
  ];

  // 完成度（全体％）
  const totalScore =
    stages.length + achievements.length + allItems.length + outfits.length;
  const gotScore =
    stageCleared + achievements.filter(a => a.achieved).length +
    ownedItems.length + outfitUnlocked;
  const progressPct = Math.round((gotScore / totalScore) * 100);

  const stagesHtml = stages.map(s => `
    <div class="coll-stage ${s.cleared ? 'cleared' : 'locked'}">
      <div class="coll-stage-icon">${s.cleared ? '✓' : '🔒'}</div>
      <div class="coll-stage-body">
        <div class="coll-stage-name">${s.name}</div>
        <div class="coll-stage-theme">${s.theme || ''}</div>
        ${s.cleared ? `<div class="coll-stage-meta">${s.rank ? `Best: ${s.rank} ／ ` : ''}再戦勝利: ${s.wins}回</div>` : ''}
      </div>
    </div>
  `).join('');

  // ご褒美CG：幕間を見た（save.rewardCgSeen に相手IDがある）ステージだけサムネイル表示。未見はロックカード
  const rewardCgSeen = save.rewardCgSeen || [];
  const rewardCgHtml = stageOrder.map(id => {
    const opp = OPPONENTS[id];
    if (!opp) return '';
    if (rewardCgSeen.includes(id)) {
      return `<button class="coll-cg-card on" data-action="view-reward-cg" data-cg-id="${id}" title="${opp.name}のご褒美CGを見る">
        <img src="assets/backgrounds/reward_cg_${id}.jpg" alt="${opp.name}"
             onerror="this.onerror=function(){this.onerror=null;this.style.display='none';this.parentElement.classList.add('noimg');};this.src='assets/episodes/${id}.png';">
        <div class="coll-cg-label">${opp.name}</div>
      </button>`;
    }
    return `<div class="coll-cg-card off" title="未開放">
      <div class="coll-cg-locked">🔒</div>
      <div class="coll-cg-label">？？？<br><small>（${opp.name}に初勝利で開放）</small></div>
    </div>`;
  }).join('');
  const rewardCgCount = stageOrder.filter(id => rewardCgSeen.includes(id)).length;

  const achHtml = achievements.map(a => `
    <div class="coll-ach ${a.achieved ? 'on' : 'off'}">
      <div class="coll-ach-icon">${a.achieved ? '🏆' : '🔒'}</div>
      <div class="coll-ach-name">${a.name}</div>
      <div class="coll-ach-desc">${a.desc}</div>
    </div>
  `).join('');

  const itemsHtml = Object.keys(itemsByCat).map(cat => {
    const list = itemsByCat[cat];
    const have = list.filter(i => i.owned).length;
    return `
      <div class="coll-itemcat">
        <div class="coll-itemcat-title">${catLabels[cat] || cat} <span class="coll-itemcat-count">${have}/${list.length}</span></div>
        <div class="coll-itemcat-list">
          ${list.map(i => `<span class="coll-item ${i.owned ? 'on' : 'off'}" title="${i.desc}">${i.owned ? '◆' : '◇'} ${i.name}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  const outfitsHtml = outfits.map(o => `
    <div class="coll-outfit ${o.unlocked ? 'on' : 'off'}" title="${o.label}">
      ${o.unlocked
        ? `<img src="assets/characters/${o.file}" alt="${o.label}" onerror="this.style.display='none'">`
        : `<div class="coll-outfit-locked">🔒</div>`}
      <div class="coll-outfit-label">${o.label}</div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'collection-overlay';
  overlay.innerHTML = `
    <div class="collection-modal">
      <button class="collection-close" data-action="collection-close" title="閉じる">×</button>
      <div class="collection-header">
        <div class="collection-title">🏆 トロフィー手帳</div>
        <div class="collection-progress">
          <div class="collection-progress-bar"><div class="collection-progress-fill" style="width:${progressPct}%"></div></div>
          <div class="collection-progress-text">${progressPct}% （${gotScore} / ${totalScore}）</div>
        </div>
        <div class="collection-coins">💰 所持コイン：${save.coins}</div>
      </div>
      <div class="collection-body">
        <section class="coll-section">
          <h3 class="coll-section-title">対戦相手 <span class="coll-section-count">${stageCleared}/${stages.length}</span></h3>
          <div class="coll-stages">${stagesHtml}</div>
        </section>
        <section class="coll-section">
          <h3 class="coll-section-title">ご褒美CG <span class="coll-section-count">${rewardCgCount}/${stageOrder.length}</span></h3>
          <div class="coll-cgs">${rewardCgHtml}</div>
        </section>
        <section class="coll-section">
          <h3 class="coll-section-title">物語の達成 <span class="coll-section-count">${achievements.filter(a => a.achieved).length}/${achievements.length}</span></h3>
          <div class="coll-achievements">${achHtml}</div>
        </section>
        <section class="coll-section">
          <h3 class="coll-section-title">交換所アイテム <span class="coll-section-count">${ownedItems.length}/${allItems.length}</span></h3>
          <div class="coll-items">${itemsHtml}</div>
        </section>
        <section class="coll-section">
          <h3 class="coll-section-title">知識ノート <span class="coll-section-count">${notesCount}件解放</span></h3>
          <div class="coll-notes-hint">対戦相手撃破やショップ購入で増えます</div>
        </section>
        <section class="coll-section">
          <h3 class="coll-section-title">リコ衣装ギャラリー <span class="coll-section-count">${outfitUnlocked}/${outfits.length}</span></h3>
          ${isRicoViewerUnlocked()
            ? `<div class="coll-outfits">${outfitsHtml}</div>`
            : `<div class="coll-locked-hint">🔒 ヴェルベット撃破で全衣装＆鑑賞モードが解放されます</div>`}
        </section>
        ${(() => {
          const memoryIds = ['gallery_rico','gallery_opponents','gallery_mimi','omake_drama_1','omake_drama_2','omake_voice_pack','omake_credit','memory_ending','memory_ending_theme','memory_minipoker'];
          const ownedMemories = memoryIds.filter(id => ownedItems.includes(id));
          if (ownedMemories.length === 0) return '';
          const cards = ownedMemories.map(id => {
            const meta = SHOP_ITEMS.find(i => i.id === id);
            if (!meta) return '';
            const action = (id === 'memory_ending') ? 'play-ending'
                         : (id === 'memory_ending_theme') ? 'play-ending-theme'
                         : (id === 'memory_minipoker') ? 'play-minipoker'
                         : 'view-memory';
            return `<button class="memory-card" data-action="${action}" data-memory-id="${id}">
              <div class="memory-card-title">${meta.name}</div>
              <div class="memory-card-desc">${meta.desc}</div>
              <div class="memory-card-play">▶ 再生</div>
            </button>`;
          }).join('');
          return `
            <section class="coll-section">
              <h3 class="coll-section-title">メモリ閲覧 <span class="coll-section-count">${ownedMemories.length}件</span></h3>
              <div class="memory-grid">${cards}</div>
            </section>
          `;
        })()}
        ${(() => {
          ensureAchievements();
          const unlocked = ACHIEVEMENTS.filter(a => save.achievements[a.id]);
          const locked   = ACHIEVEMENTS.filter(a => !save.achievements[a.id]);
          const total = ACHIEVEMENTS.length;
          const got = unlocked.length;
          const cardOf = (a, isUnlocked) => `
            <div class="ach-card ${isUnlocked ? 'on' : 'off'}" title="${a.desc}">
              <div class="ach-icon">${isUnlocked ? a.icon : '🔒'}</div>
              <div class="ach-name">${isUnlocked ? a.name : '？？？'}</div>
              <div class="ach-desc">${isUnlocked ? a.desc : a.cat}</div>
            </div>
          `;
          return `
            <section class="coll-section">
              <h3 class="coll-section-title">称号 <span class="coll-section-count">${got}/${total}</span></h3>
              <div class="ach-grid">
                ${unlocked.map(a => cardOf(a, true)).join('')}
                ${locked.map(a => cardOf(a, false)).join('')}
              </div>
            </section>
          `;
        })()}
      </div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// === ポーカー辞典 ===
const GLOSSARY = [
  { cat: '役', term: 'ロイヤルストレートフラッシュ', body: '10-J-Q-K-A 同スート。最強の役。出現確率は約65万分の1。' },
  { cat: '役', term: 'ストレートフラッシュ', body: '同スートの連番5枚。ロイヤル以外。' },
  { cat: '役', term: 'フォーカード', body: '同ランク4枚。クアッズ（Quads）とも。' },
  { cat: '役', term: 'フルハウス', body: 'スリーカード＋ペア。同ランクが3枚と2枚。' },
  { cat: '役', term: 'フラッシュ', body: '同スート5枚。高い方からトップカードで強さが決まる。' },
  { cat: '役', term: 'ストレート', body: '連番5枚。A は HIGH（10-J-Q-K-A=ブロードウェイ）または LOW（A-2-3-4-5=ホイール）の両端のみ。ラップ不可。' },
  { cat: '役', term: 'ブロードウェイ', body: '10-J-Q-K-A の Aハイ ストレート。ストレート最強。' },
  { cat: '役', term: 'ホイール', body: 'A-2-3-4-5 の 5ハイ ストレート。最弱ストレートで、A は LOW扱い。' },
  { cat: '役', term: 'スリーカード（セット／トリップス）', body: '同ランク3枚。自分の手札ペア＋場で完成＝セット、場のペア＋自分の1枚＝トリップス。' },
  { cat: '役', term: 'ツーペア', body: 'ペアが2組。高い方のペアで強さが決まる。' },
  { cat: '役', term: 'ワンペア', body: '同ランク2枚。残り3枚はキッカーで強さ決定。' },
  { cat: '役', term: 'ハイカード', body: 'なにも揃わなかった時、最も高い1枚で勝負。' },

  { cat: 'ベット', term: 'チェック', body: '誰もベットしていない時、賭けずに次へ回すアクション。0チップ。' },
  { cat: 'ベット', term: 'コール', body: '相手のベット額に同額を払って勝負に残る。' },
  { cat: 'ベット', term: 'ベット', body: 'チェック状態から最初に賭ける行為。' },
  { cat: 'ベット', term: 'レイズ', body: '相手のベットに上乗せ。「to ◯◯」で総額宣言、コール分も含む1アクション。' },
  { cat: 'ベット', term: 'リレイズ／3ベット', body: 'レイズに対するさらなるレイズ。3-bet / 4-bet と数える。' },
  { cat: 'ベット', term: 'フォールド', body: '降りる。これまで払ったチップは諦める。' },
  { cat: 'ベット', term: 'オールイン', body: '残りチップ全部。1ハンド1回（リバー以前で発動）。' },
  { cat: 'ベット', term: 'Cベット（コンティニュエーション）', body: 'プリフロップでレイズした人がフロップでも続けてベットする手。多くは相手を降ろし狙い。' },
  { cat: 'ベット', term: 'バレル', body: '連続ベット。2バレル＝ターンも撃つ、3バレル＝リバーも撃つ。' },
  { cat: 'ベット', term: 'ブロックベット', body: 'リバーで小さく賭けて、相手の大きなベットを封じる守りの一手。' },
  { cat: 'ベット', term: 'チェックレイズ', body: 'チェックで相手にベットを誘い、自分でレイズして取る罠。' },

  { cat: 'ポジション', term: 'ボタン（BTN）', body: 'ディーラーマーカー。ポストフロップで最後にアクション＝情報が最大、最強ポジション。' },
  { cat: 'ポジション', term: 'スモールブラインド（SB）', body: 'BTNの左、強制小ベット。ヘッズアップではBTN兼任。' },
  { cat: 'ポジション', term: 'ビッグブラインド（BB）', body: 'SBの左、強制大ベット。プリフロップでは最後にアクション。' },
  { cat: 'ポジション', term: 'インポジション（IP）', body: '相手より後にアクションする側。圧倒的有利。' },
  { cat: 'ポジション', term: 'アウトオブポジション（OOP）', body: '先にアクションする側。情報が無い分不利。' },
  { cat: 'ポジション', term: 'ヘッズアップ（HU）', body: '1対1のポーカー。本ゲームの形式。' },

  { cat: '確率・期待値', term: 'アウツ', body: '役を完成させる残りのカードの枚数。フラッシュドロー＝9outs、OESD＝8outs等。' },
  { cat: '確率・期待値', term: '2-and-4 の法則', body: 'アウツ × 2 ＝ 次の1枚で完成する確率%、× 4 ＝ リバーまでの確率%（フロップから）。' },
  { cat: '確率・期待値', term: 'ポットオッズ', body: '必要コール額 ÷ コール後の総ポット ＝ 必要勝率%。これ以上勝てる手ならコール＋EV。' },
  { cat: '確率・期待値', term: 'インプライドオッズ', body: '完成した時に追加で取れるであろう額も計算に入れた将来含みのオッズ。深スタックほど大きい。' },
  { cat: '確率・期待値', term: 'エクイティ', body: '現時点での勝率%。残りカードを全列挙して算出する厳密値。' },
  { cat: '確率・期待値', term: 'EV（期待値）', body: 'そのアクションを長期で繰り返した時の平均損益。+EV＝得、-EV＝損。' },
  { cat: '確率・期待値', term: 'SPR（スタック・ツー・ポット比）', body: '残スタック÷ポット。低い（〜3）＝完成役なら押し切り、高い（8+）＝降りる余地あり。' },
  { cat: '確率・期待値', term: 'MDF（最小防御頻度）', body: '相手のブラフを罰するためにコールすべき最低頻度。「絶対降りすぎない」基準。MDF = 1 − (ベット額 ÷ (ベット額+ポット))。' },
  { cat: '確率・期待値', term: 'スタック比', body: '自分と相手のチップ残量比。差が大きいほどオールイン圧が効く／受ける。' },
  { cat: '確率・期待値', term: '必要勝率', body: 'コールに必要な勝率。= ポットオッズで算出。これ以上勝てる手ならコール＋EV。' },
  { cat: '確率・期待値', term: '実効勝率', body: '生勝率（対ランダム）にヘッズアップ補正・相手意図補正を加えた実戦見積もり。本ゲームでは「+10%＋意図補正」を加算。' },
  { cat: '確率・期待値', term: 'アグレッションファクタ（AF）', body: '(ベット+レイズ) ÷ コール の比率。高いほど攻撃的、低いほど受動的。相手AFが3以上なら罠を警戒。' },
  { cat: '確率・期待値', term: 'WTSD', body: 'Went To Showdown：ハンドのうちショーダウンまで行った割合。高すぎ＝降りなさすぎ、低すぎ＝降りすぎ。' },
  { cat: '確率・期待値', term: 'W$SD', body: 'Won $ at Showdown：ショーダウンまで行った中での勝率。50%以上なら手堅い、低いとブラフキャッチ過多。' },
  { cat: '確率・期待値', term: 'VPIP', body: 'Voluntarily Put $ In Pot：プリフロップで自発的に参加した割合。緩い／タイトの指標。25%前後がバランス型。' },
  { cat: '確率・期待値', term: 'PFR', body: 'Pre-Flop Raise：プリフロップでレイズした割合。攻撃性の指標。VPIPに近いほど積極派。' },
  { cat: '確率・期待値', term: 'OESD', body: 'Open Ended Straight Draw：両端どちらでも完成する4連番ドロー。8outs（=リバーまで32%）。' },
  { cat: '確率・期待値', term: 'ガットショット', body: '内側1枚で完成するストレートドロー。4outs（=リバーまで16%）。' },
  { cat: '確率・期待値', term: 'バックドア', body: '残り2枚（ターンとリバー）両方を引いて完成するドロー。約4%と低確率。' },

  { cat: 'ベット', term: 'アンテ', body: '全員が強制的にポットに入れる小額（本ゲームでは50ずつ）。プレイ活性化目的。' },
  { cat: 'ベット', term: 'ブラインド', body: 'SB／BBが強制的にポストする額。アンテと違い2人だけが負担。実プロでは主流。' },
  { cat: 'ベット', term: '4ベット／5ベット', body: '3ベット（リレイズ）に対するさらなるレイズ。4-bet は通常プレミアム手の領域。' },
  { cat: 'ベット', term: 'スロープレイ', body: '強い手を弱く見せて相手を釣る打ち方。トラップの一種、過剰使用は禁物。' },
  { cat: 'ベット', term: 'リードベット（ドンクベット）', body: '前ストリートのアグレッサーでない側がフロップで先制ベット。レンジが歪んでいるサイン。' },
  { cat: 'ベット', term: 'フロート', body: '弱い手で一度コールして、次ストリートでブラフを仕掛ける。プレッシャーをかける高度技。' },
  { cat: 'ベット', term: 'アイソレーション', body: '弱い相手を1対1に絞るためのレイズ。多人数戦で活躍。' },

  { cat: '心理戦', term: 'バリュータウン', body: '強い手なのに大きく打ちすぎて相手を降ろしてしまい価値を取り損なう状態。' },
  { cat: '心理戦', term: 'ライトコール', body: '中位以下の手でコールする判断。ブラフキャッチに近い。' },
  { cat: '心理戦', term: 'マージナルコール', body: '勝率と必要勝率が近接した「微妙な」コール。長期的に微増減レベル。' },
  { cat: '心理戦', term: 'チェックバック', body: '相手チェック後、こちらもチェックして無料で次のカードへ進む。' },

  { cat: 'シチュエーション', term: 'ホールカード', body: '自分だけが見える手札2枚。ポケットカードとも。' },
  { cat: 'シチュエーション', term: 'コミュニティカード', body: '場に共有される5枚（フロップ3＋ターン1＋リバー1）。' },
  { cat: 'シチュエーション', term: 'バブル', body: 'トーナメント終盤、賞金圏ギリギリの局面。短スタックが極端にタイトになりやすい。' },
  { cat: 'シチュエーション', term: 'レイク', body: 'ハウス（カジノ）がポットから徴収する手数料。プロは「レイクが低い卓を選ぶ」も戦略。' },
  { cat: 'シチュエーション', term: 'タイト／ルース', body: 'タイト＝慎重に強い手だけ参戦、ルース＝幅広く参戦。ポジションや相手で使い分け。' },
  { cat: 'シチュエーション', term: 'パッシブ／アグレッシブ', body: 'パッシブ＝コール中心、アグレッシブ＝ベット／レイズ多用。「タイト・アグレッシブ（TAG）」が基本理想形。' },

  { cat: '心理戦', term: 'ブラフ', body: '弱い手で大きく賭けて相手を降ろす行為。成功率と頻度のバランスが命。' },
  { cat: '心理戦', term: 'セミブラフ', body: 'ドロー中（=ある程度勝てる）の手でのブラフ。降ろせなくても完成のチャンスあり。' },
  { cat: '心理戦', term: 'バリューベット', body: '強い手で「相手のコールを引き出す」ためのベット。サイズが鍵。' },
  { cat: '心理戦', term: 'ブラフキャッチ', body: '中位ペア等で相手のブラフをコール。「ブラフを捕まえる用の手」。' },
  { cat: '心理戦', term: 'レンジ', body: '相手が持ちうる手の集合。具体的な1ハンドではなく確率分布で考える。' },
  { cat: '心理戦', term: 'ポラライズ（極端化）', body: '「超強い or ブラフ」の2極構成のレンジ。大ベットは多くがポラライズ。' },
  { cat: '心理戦', term: 'マージ（合体）', body: '中程度の手も含めた幅広いレンジ。小ベットに多い。' },
  { cat: '心理戦', term: 'トラップ', body: '強い手をあえてチェックして相手の攻めを誘う。スロープレイとも。' },

  { cat: 'シチュエーション', term: 'ナッツ', body: 'その盤面で達成可能な理論最強の役。「ナッツフラッシュ」「ナッツストレート」等。' },
  { cat: 'シチュエーション', term: 'ブロッカー', body: '相手の強い役を構成するカードを自分が持っていること。例：フラッシュ場でA♠を持ってる＝相手のナッツを封じる。' },
  { cat: 'シチュエーション', term: 'バッドビート', body: '優位だったのに、低確率で逆転負け。ピーク勝率70%以上→負け。' },
  { cat: 'シチュエーション', term: 'サックアウト', body: '不利だったのに、低確率で逆転勝ち。バッドビートの裏側。' },
  { cat: 'シチュエーション', term: 'クーラー', body: '両者強い役で激突。回避不可能な大勝負。' },
  { cat: 'シチュエーション', term: 'マック', body: '伏せたまま捨てる。相手に手を見せない。' },
  { cat: 'シチュエーション', term: 'コインフリップ', body: '勝率がほぼ50:50の対決。AKvsペア等。' },
  { cat: 'シチュエーション', term: 'フィッシュ／シャーク', body: '初心者＝フィッシュ（カモ）、上級者＝シャーク。卓を選ぶ時の指標。' },
  { cat: 'シチュエーション', term: 'ドライ／ウェット（ボード）', body: 'ドライ＝ドロー少ない場（小ベット効果的）、ウェット＝フラッシュ・ストレート気配（大ベットでドロー潰し）。' },
];

// 用語ID（DOM安全な短いキー）：term の最初の数文字＋index
function glossaryId(term, idx) {
  return 'gl-entry-' + idx;
}

// 用語マッチ用エイリアス：「ボタン（BTN）」→ ['ボタン（BTN）', 'ボタン', 'BTN']
function glossaryAliases(term) {
  const out = [term];
  // 括弧内（）の中身を別エイリアスとして抽出
  const m = term.match(/^([^（(]+)[（(]([^）)]+)[）)]/);
  if (m) {
    out.push(m[1].trim());
    // 括弧内をスラッシュで分割
    m[2].split(/[／/]/).forEach(s => { if (s.trim()) out.push(s.trim()); });
  }
  // 「3ベット」「リレイズ／3ベット」のスラッシュ分割
  if (term.includes('／')) {
    term.split('／').forEach(s => { if (s.trim()) out.push(s.trim()); });
  }
  return [...new Set(out)];
}

// 説明文中の他用語を自動リンク化
function linkifyGlossary(body, selfTerm) {
  // すべてのエイリアスを長い順にソート（部分一致防止）
  const allAliases = [];
  GLOSSARY.forEach((g, idx) => {
    if (g.term === selfTerm) return; // 自分自身はリンクしない
    glossaryAliases(g.term).forEach(a => allAliases.push({ alias: a, idx }));
  });
  allAliases.sort((a, b) => b.alias.length - a.alias.length);
  // タグの中身を壊さないよう、エイリアスを順次置換
  let result = body;
  for (const { alias, idx } of allAliases) {
    // 既にリンク化された箇所は再リンクしない（簡易：data-target属性を含むタグ内は触らない）
    const re = new RegExp('(?<!<[^>]*?)(?:' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*?>)', '');
    if (re.test(result)) {
      result = result.replace(re, `<a class="gl-link" data-glossary-target="${glossaryId('', idx)}">${alias}</a>`);
    }
  }
  return result;
}

// 50音順ソート用：localeCompare ja
function sortBy50on(arr) {
  return [...arr].sort((a, b) => a.term.localeCompare(b.term, 'ja'));
}

function showGlossaryModal() {
  const overlay = document.createElement('div');
  overlay.className = 'glossary-overlay';
  // ソートモード： 'cat'（カテゴリ順）or 'aiueo'（50音順）
  let sortMode = 'cat';

  const categories = [...new Set(GLOSSARY.map(g => g.cat))];
  // 各エントリのインデックス（リンクターゲット用）
  const indexed = GLOSSARY.map((g, idx) => ({ ...g, _idx: idx }));

  const renderBody = (mode) => {
    if (mode === 'cat') {
      return categories.map(cat => {
        const items = indexed.filter(g => g.cat === cat);
        return `
          <section class="gl-section" data-cat="${cat}">
            <h3 class="gl-section-title">${cat} <span class="gl-section-count">${items.length}項</span></h3>
            ${items.map(g => `
              <div class="gl-entry" id="${glossaryId('', g._idx)}">
                <div class="gl-term">${g.term}</div>
                <div class="gl-body">${linkifyGlossary(g.body, g.term)}</div>
              </div>
            `).join('')}
          </section>
        `;
      }).join('');
    }
    // 50音順
    const sorted = sortBy50on(indexed);
    // 頭文字でグルーピング
    const groups = {};
    sorted.forEach(g => {
      const firstChar = g.term.charAt(0).toUpperCase();
      if (!groups[firstChar]) groups[firstChar] = [];
      groups[firstChar].push(g);
    });
    return Object.entries(groups).map(([head, items]) => `
      <section class="gl-section" data-head="${head}">
        <h3 class="gl-section-title">${head} <span class="gl-section-count">${items.length}項</span></h3>
        ${items.map(g => `
          <div class="gl-entry" id="${glossaryId('', g._idx)}">
            <div class="gl-term">${g.term} <span class="gl-cat-tag">${g.cat}</span></div>
            <div class="gl-body">${linkifyGlossary(g.body, g.term)}</div>
          </div>
        `).join('')}
      </section>
    `).join('');
  };

  overlay.innerHTML = `
    <div class="glossary-modal">
      <button class="glossary-close" data-action="glossary-close" title="閉じる">×</button>
      <div class="glossary-header">
        <div class="glossary-top-row">
          <div class="glossary-title">📖 ポーカー辞典</div>
          <div class="glossary-sort-toggle">
            <button class="gl-sort-btn active" data-mode="cat">カテゴリ順</button>
            <button class="gl-sort-btn" data-mode="aiueo">50音順</button>
          </div>
        </div>
        <input type="text" class="glossary-search" placeholder="🔍 用語を検索…" id="glossary-search-input">
        <div class="glossary-cats" id="glossary-cats-row">
          ${categories.map(c => `<button class="gl-cat-pill" data-cat="${c}">${c}</button>`).join('')}
        </div>
      </div>
      <div class="glossary-body" id="glossary-body">
        ${renderBody(sortMode)}
      </div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const bodyEl = overlay.querySelector('#glossary-body');
  const catsRow = overlay.querySelector('#glossary-cats-row');
  const sortBtns = overlay.querySelectorAll('.gl-sort-btn');

  // ソートモード切替
  const applySortMode = (mode) => {
    sortMode = mode;
    bodyEl.innerHTML = renderBody(mode);
    catsRow.style.display = mode === 'cat' ? '' : 'none';
    rebindBodyLinks();
    applyFilter(overlay.querySelector('#glossary-search-input').value);
  };
  sortBtns.forEach(b => {
    b.addEventListener('click', () => {
      sortBtns.forEach(x => x.classList.toggle('active', x === b));
      applySortMode(b.dataset.mode);
    });
  });

  // 内部リンク：他用語をクリックでジャンプ＋ハイライト
  const rebindBodyLinks = () => {
    overlay.querySelectorAll('.gl-link').forEach(a => {
      a.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = a.dataset.glossaryTarget;
        const target = overlay.querySelector('#' + id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.remove('gl-flash');
          void target.offsetWidth; // re-trigger
          target.classList.add('gl-flash');
        }
      });
    });
  };
  rebindBodyLinks();

  // 検索フィルタ
  const search = overlay.querySelector('#glossary-search-input');
  const applyFilter = (q) => {
    const ql = (q || '').toLowerCase();
    overlay.querySelectorAll('.gl-entry').forEach(entry => {
      const txt = entry.textContent.toLowerCase();
      entry.style.display = (!ql || txt.includes(ql)) ? '' : 'none';
    });
    overlay.querySelectorAll('.gl-section').forEach(sec => {
      const anyVisible = [...sec.querySelectorAll('.gl-entry')].some(e => e.style.display !== 'none');
      sec.style.display = anyVisible ? '' : 'none';
    });
  };
  search.addEventListener('input', (e) => applyFilter(e.target.value));
  // カテゴリ pill：クリックでスクロール
  overlay.querySelectorAll('.gl-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const target = overlay.querySelector(`.gl-section[data-cat="${cat}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function showNewGameModal() {
  const overlay = document.createElement('div');
  overlay.className = 'newgame-overlay';
  overlay.innerHTML = `
    <div class="newgame-modal">
      <div class="newgame-title">新しく始める</div>
      <div class="newgame-sub">どのように始めますか？</div>
      <button class="btn btn-primary newgame-opt" data-action="new-game-full">
        <span class="newgame-opt-name">🆕 完全に最初から</span>
        <span class="newgame-opt-desc">コインも進捗も全部リセット</span>
      </button>
      <button class="btn btn-secondary newgame-opt" data-action="new-game-keep-coins">
        <span class="newgame-opt-name">💰 コインと所持品を持って最初から</span>
        <span class="newgame-opt-desc">進捗とランクはリセット、コイン・購入アイテムは保持</span>
      </button>
      <button class="btn btn-ghost newgame-opt" data-action="newgame-cancel">キャンセル</button>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
}

function skipStageCost(opp) {
  return (opp.rewardFirst || 500) * 3;
}

function skipStageWithCoins(opponentId) {
  const opp = OPPONENTS[opponentId];
  if (!opp) return;
  if (save.clearedStages.includes(opponentId)) return;
  const cost = skipStageCost(opp);
  if (save.coins < cost) { alert(`コイン不足：${cost}コイン必要`); return; }
  if (!confirm(`${cost}コインを払って ${opp.name} 戦をスキップしますか？\n（クリア扱いだが報酬・ランクは無し。次のステージが解放）`)) return;
  save.coins -= cost;
  // markStageCleared：clearedStages 追加＋velvet なら endingUnlocked も同時に立てる（派生フラグの一貫性）
  markStageCleared(opponentId);
  // 初回クリア扱いするが報酬は払わない（firstClearRewardClaimedにフラグ立てる）
  if (!save.firstClearRewardClaimed.includes(opponentId)) save.firstClearRewardClaimed.push(opponentId);
  // ノート自動解放
  if (opp.unlockNoteOnClear && !save.unlockedNotes.includes(opp.unlockNoteOnClear)) {
    save.unlockedNotes.push(opp.unlockNoteOnClear);
  }
  // 飛ばしクリアは C ランク扱い
  if (!save.bestRanks[opponentId]) save.bestRanks[opponentId] = 'C';
  saveProgress();
  applyBindings();
}

// 次の再戦勝利でもらえる金額のプレビュー（diminishing 反映）
function rematchPreview(opponentId) {
  const opp = OPPONENTS[opponentId];
  if (!opp) return 0;
  const wins = (save.rematchWins && save.rematchWins[opponentId]) || 0;
  let mult;
  if (wins < 4)       mult = 1.00;
  else if (wins < 8)  mult = 0.75;
  else if (wins < 12) mult = 0.50;
  else if (wins < 20) mult = 0.30;
  else                mult = 0.20;
  return Math.max(10, Math.round(opp.rewardRematch * mult));
}

function chipBonusTotal() {
  let b = 0;
  if (!save || !save.ownedItems) return 0;
  if (save.ownedItems.includes('chips_plus_500'))   b += 500;
  if (save.ownedItems.includes('chips_plus_1500'))  b += 1500;
  if (save.ownedItems.includes('chips_plus_3000'))  b += 3000;
  if (save.ownedItems.includes('chips_plus_5000'))  b += 5000;
  if (save.ownedItems.includes('chips_plus_10000')) b += 10000;
  return b;
}

function startBattle(opponentId) {
  // カードのスライダーで選んだチップ数を採用（即座にバトル開始）
  if (!save.chipChoice) save.chipChoice = {};
  const isSerious = opponentId === 'rico_tutorial' && window.__ricoSeriousMode === true;
  const isSkipLecture = opponentId === 'rico_tutorial' && window.__ricoSkipLecture === true;
  // 講義モード：チュートリアル相手＆本気モードでも「いきなり対戦」モードでもないとき
  const isLecture = opponentId === 'rico_tutorial' && !isSerious && !isSkipLecture;
  // フラグは消費したらクリア
  if (isSkipLecture) window.__ricoSkipLecture = false;
  const base = isSerious ? 2000 : ((OPPONENTS[opponentId]?.chips) || 1000);
  const stored = save.chipChoice[opponentId];
  if (!isLecture) {
    window.__chosenStartChips = stored ? Math.max(base, stored) : base;
  }
  let isFirstTime = !save.firstClearRewardClaimed.includes(opponentId);
  // 体験ハンドの直前に第1話を見せているので、続けて講義へ入るときに二度出さない
  if (opponentId === 'rico_tutorial' && save.introEpisodeShown) isFirstTime = false;
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
  // 初期チップ：選択値があれば優先、無ければデフォルト
  const chosen = window.__chosenStartChips;
  window.__chosenStartChips = null; // 一回限り
  if (chosen) {
    // スライダで選んだ値（chips_plus_* 上限拡張を反映済）をそのまま採用
    state.playerChips = chosen;
    state.opponentChips = chosen;
  } else {
    state.playerChips   = seriousRico ? 2000 : opp.chips;
    state.opponentChips = seriousRico ? 2000 : opp.chips;
  }
  state.__initialChips = state.playerChips; // ピンチ演出：対戦開始時のチップ量を記録
  state.tutorialMode = seriousRico ? false : opp.tutorial;
  state.fullHand = seriousRico ? true : !!opp.fullHand;
  state.isBoss = seriousRico ? true : !!opp.isBoss; // 心理バトル全ストリート発動
  state.seriousRicoMode = seriousRico;
  state.screen = 'battle';
  if (typeof startBattleBgmSkin === 'function') startBattleBgmSkin();
  // 相手別テーブル背景（CODEX納品画像）を適用
  document.body.dataset.oppBg = ['polka','selina','grano','velvet'].includes(opp.id) ? opp.id : '';
  state.handPhase = 'idle';
  state.panyuMax = save.panyuGaugeMax || 100;
  state.panyuSenseFreeUsed = save.panyuSenseFreeUsed;
  state.panyuChronoUsedThisBattle = false;  // panyu_chrono：1バトル1回の無料発動枠

  // v4 B4: ボス戦は開幕で ぱにゅゲージを最低25まで補填
  if (opp.isBoss) {
    state.panyu = Math.max(25, state.panyu);
  }

  if (opp.isBoss) {
    state.mimiThought = '「ボス戦だ……気持ちで負けないようにしないと」';
    state.ricoAdvice = '「ヴェルベットは強いし口でも揺さぶってくる。劣勢になったら集中力高めに、ね」';
    render();
    // 開幕心理バトルは廃止（劣勢になった時の本気の読み合いに集中）
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
        '🔥 <b>オールイン</b>＝持ちチップ全部。決め手・最大の圧をかける時<br><br>' +
        '<u>各ボタンにマウスを乗せると詳しい説明が出るよ。</u>')
    ), 600);
  } else {
    state.mimiThought = '「さあ、第1ハンドだ。最初は相手をよく見よう」';
    state.ricoAdvice = pickRicoOpeningAdvice(state.opponentId);
    render();
  }
}

//=============================================================
// P1: ルール入門（3ハンド研修の直前に挟む3ステップ）＋役の早見表ヘルプ
// 「ルールも分からないうちからどうやってプレイするの？」への回答として追加。
// 図解主体・DOM+CSSのみで描く（画像生成物は使わない）。#stage に overlay を
// append/remove する作法は showEpisodeTitle / showIntermission に合わせる。
//=============================================================

// 役の強さ表（弱→強）。ルール入門Step2と役の早見表ヘルプで共有する。
const HAND_LADDER = [
  { name: 'ハイカード',       desc: '役なし。いちばん強い1枚で勝負', cards: [['♠','A'],['♥','K'],['♦','9'],['♣','5'],['♠','2']] },
  { name: 'ワンペア',         desc: '同じ数字が2枚',                 cards: [['♠','8'],['♥','8'],['♦','K'],['♣','5'],['♠','2']] },
  { name: 'ツーペア',         desc: 'ペアが2組',                     cards: [['♠','J'],['♥','J'],['♦','6'],['♣','6'],['♠','A']] },
  { name: 'スリーカード',     desc: '同じ数字が3枚',                 cards: [['♠','5'],['♥','5'],['♦','5'],['♣','Q'],['♠','2']] },
  { name: 'ストレート',       desc: '数字が5つ連続',                 cards: [['♠','5'],['♥','6'],['♦','7'],['♣','8'],['♠','9']] },
  { name: 'フラッシュ',       desc: '同じマークが5枚',               cards: [['♥','2'],['♥','6'],['♥','9'],['♥','J'],['♥','K']] },
  { name: 'フルハウス',       desc: '3枚＋2枚のセット',              cards: [['♠','9'],['♥','9'],['♦','9'],['♣','4'],['♠','4']] },
  { name: 'フォーカード',     desc: '同じ数字が4枚',                 cards: [['♠','7'],['♥','7'],['♦','7'],['♣','7'],['♠','K']] },
  { name: 'ストレートフラッシュ', desc: '同マークで5つ連続。ほぼ出ない激レア', cards: [['♠','5'],['♠','6'],['♠','7'],['♠','8'],['♠','9']] },
];

// [suit, rank] のミニカードHTML（rp-mini-card：rank/suit/center-suitは既存.cardマークアップを流用）
// extraClass / style は演出用の追加クラス・インラインstyle（配布アニメの--di等）
function rpMiniCardHTML(suit, rank, extraClass, style) {
  const isRed = suit === '♥' || suit === '♦';
  const cls = `card rp-mini-card${isRed ? ' red' : ''}${extraClass ? ' ' + extraClass : ''}`;
  const styleAttr = style ? ` style="${style}"` : '';
  return `<div class="${cls}"${styleAttr}>
    <span class="rank">${rank}</span>
    <span class="suit">${suit}</span>
    <span class="center-suit">${suit}</span>
  </div>`;
}

// はしご図（縦積み）。mode:'primer' は名前のみ（サイズだけで強弱を表現）、
// mode:'help' は一行説明＋実例カードも添える。強い役ほど上・大きく、下3つ（弱い役）は小さく。
function renderHandLadderHTML(mode) {
  const strongFirst = [...HAND_LADDER].reverse();
  return strongFirst.map((h, i) => {
    const tier = i < 3 ? 'big' : (i < 6 ? 'mid' : 'small');
    const detail = mode === 'help'
      ? `<div class="rp-ladder-desc">${h.desc}</div><div class="rp-ladder-cards">${h.cards.map(([s, r]) => rpMiniCardHTML(s, r)).join('')}</div>`
      : '';
    return `
      <div class="rp-ladder-row rp-tier-${tier}">
        <div class="rp-ladder-name">${h.name}</div>
        ${detail}
      </div>`;
  }).join('');
}

// 役の早見表（ヘルプモーダル）：常設「❓ 役」ボタンから開く。研修中・本編中どちらでも開ける。
function showHandGuide() {
  if (document.querySelector('.hand-guide-overlay')) return; // 多重起動防止
  const overlay = document.createElement('div');
  overlay.className = 'hand-guide-overlay';
  overlay.innerHTML = `
    <div class="hand-guide-panel">
      <div class="hand-guide-head">
        <div class="hand-guide-title v2-disp">役の早見表</div>
        <button type="button" class="hand-guide-close" title="閉じる">✕</button>
      </div>
      <div class="hand-guide-body">
        <div class="rp-ladder rp-ladder-help">${renderHandLadderHTML('help')}</div>
      </div>
      <div class="hand-guide-hint">タップして閉じる</div>
    </div>
  `;
  const stage = document.getElementById('stage');
  (stage || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.hand-guide-close').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// ルール入門：3ステップ、各1タップ、計60秒以内。「そろえる／強さ順／賭ける」の最小限だけ教える。
// #stage に overlay を append する方式（showEpisodeTitle と同じ作法）。onDone は beginIntroHand を渡す想定。
const RULE_PRIMER_STEPS = [
  {
    key: 'assemble',
    rico: 'まず基本。手札2枚と場札5枚、合わせて7枚から一番強い5枚を選ぶだけだよ',
  },
  {
    key: 'ranking',
    rico: '役の強さはこの順。ぜんぶ覚えなくてOK。困ったら左下の❓でいつでも見られるよ',
  },
  {
    key: 'betting',
    rico: 'チップを賭け合って、勝てばポット総取り。自信がないときは降りてもいい。それも作戦だよ',
  },
];

function showRulePrimer(onDone) {
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'rule-primer-overlay';
  const stage = document.getElementById('stage');
  (stage || document.body).appendChild(overlay);

  function finish() {
    overlay.classList.add('out');
    setTimeout(() => { overlay.remove(); if (onDone) onDone(); }, 350);
  }

  function renderStep() {
    const cfg = RULE_PRIMER_STEPS[idx];
    const isLast = idx === RULE_PRIMER_STEPS.length - 1;
    overlay.innerHTML = `
      <div class="rp-card">
        <div class="rp-dots">
          ${RULE_PRIMER_STEPS.map((_, i) => `<span class="rp-dot${i === idx ? ' on' : ''}"></span>`).join('')}
        </div>
        <button type="button" class="rp-skip-btn">スキップ ▶▶</button>
        <div class="rp-visual rp-visual-${cfg.key}">${renderPrimerVisual(cfg.key)}</div>
        <div class="rp-rico">
          <div class="rp-rico-face"><img src="assets/characters/rico_default.png" alt="リコ先輩" onerror="window.assetFallback(this,'rico')"></div>
          <div class="rp-rico-bubble">${cfg.rico}</div>
        </div>
        <button type="button" class="btn btn-primary rp-next-btn">${isLast ? '研修へ ▶' : '次へ ▶'}</button>
      </div>
    `;
    overlay.querySelector('.rp-skip-btn').addEventListener('click', (e) => { e.stopPropagation(); finish(); });
    overlay.querySelector('.rp-next-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (idx < RULE_PRIMER_STEPS.length - 1) { idx++; renderStep(); } else { finish(); }
    });
  }

  renderStep();
}

// Step1「そろえる」：手札2枚（伏せ→表）＋場札5枚。ベスト5枚（手札2＋場札3）を金色ハイライト。
// Step2「役の強さ」：共有はしご図。Step3「賭け合う」：ポットにチップが集まる図。
function renderPrimerVisual(key) {
  if (key === 'assemble') {
    return `
      <div class="rp-step1-table">
        <div class="rp-step1-row">
          <div class="rp-step1-label">ミミの手札</div>
          <div class="rp-step1-cards rp-deal-hand">
            <div class="card rp-mini-card highlight red card-flip">
              <span class="rank">A</span><span class="suit">♥</span><span class="center-suit">♥</span>
            </div>
            <div class="card rp-mini-card highlight card-flip" style="--di:1">
              <span class="rank">A</span><span class="suit">♠</span><span class="center-suit">♠</span>
            </div>
          </div>
        </div>
        <div class="rp-step1-row">
          <div class="rp-step1-label">場札</div>
          <div class="rp-step1-cards">
            ${rpMiniCardHTML('♦', 'A', 'highlight card-deal', '--di:2')}
            ${rpMiniCardHTML('♣', 'A', 'highlight card-deal', '--di:3')}
            ${rpMiniCardHTML('♠', 'K', 'highlight card-deal', '--di:4')}
            ${rpMiniCardHTML('♥', '7', 'rp-dim card-deal', '--di:5')}
            ${rpMiniCardHTML('♦', '2', 'rp-dim card-deal', '--di:6')}
          </div>
        </div>
        <div class="rp-step1-note">金色＝いちばん強い5枚（この例はフォーカード）</div>
      </div>
    `;
  }
  if (key === 'ranking') {
    return `<div class="rp-ladder rp-ladder-primer">${renderHandLadderHTML('primer')}</div>`;
  }
  // 'betting'
  return `
    <div class="rp-pot-diagram">
      <div class="rp-pot-side rp-pot-side-mimi">
        <div class="rp-pot-face"><img src="assets/characters/mimi_default.png" alt="ミミ" onerror="window.assetFallback(this,'mimi')"></div>
        <div class="rp-pot-name">ミミ</div>
      </div>
      <div class="rp-pot-arrow rp-pot-arrow-left"><span class="rp-pot-chip"></span><span class="rp-pot-chip"></span></div>
      <div class="rp-pot-center">
        <div class="rp-pot-stack"><span></span><span></span><span></span></div>
        <div class="rp-pot-label">POT</div>
      </div>
      <div class="rp-pot-arrow rp-pot-arrow-right"><span class="rp-pot-chip"></span><span class="rp-pot-chip"></span></div>
      <div class="rp-pot-side rp-pot-side-opp">
        <div class="rp-pot-face"><img src="assets/characters/rico_default.png" alt="相手" onerror="window.assetFallback(this,'rico')"></div>
        <div class="rp-pot-name">相手</div>
      </div>
    </div>
  `;
}

//=============================================================
// P2: 体験ハンド（初回導線ファネル）＝「3ハンドの初日研修」
// スクリプトテーブル駆動：INTRO_HANDS[0..2] にハンドごとの固定シナリオを定義。
//   Hand1「そろえる」：役ができると勝てる／ベットで取り分が増える（大きく行く2択のみ）
//   Hand2「引き際」　：フォールドは負けじゃない（フォールドのみ有効）
//   Hand3「読む」　　：セリフから本心を読む（心理バトル固定出題→勝利）
// 3ハンドとも戦績・実績・レース記録にはカウントしない（introHandMode）。
//=============================================================
const INTRO_HANDS = [
  {
    no: 1,
    title: 'そろえる',
    playerHand: [{ suit: '♠', rank: 14, label: 'A' }, { suit: '♥', rank: 14, label: 'A' }],
    flop: [{ suit: '♦', rank: 14, label: 'A' }, { suit: '♣', rank: 7, label: '7' }, { suit: '♠', rank: 2, label: '2' }],
    usedCards: ['♠-14', '♥-14', '♦-14', '♣-7', '♠-2'],
    dealOpp: '「さ、配ったよ。手札はあなただけのもの」',
    dealMimi: '「……このカード、セット完成してる……！」',
    dealRico: '「すごい手が来てる。大きく行こ！」',
    winNextRico: 'ね、楽しいでしょ。次はちょっと苦手な手も見てもらうよ',
  },
  {
    no: 2,
    title: '引き際',
    playerHand: [{ suit: '♥', rank: 7, label: '7' }, { suit: '♣', rank: 2, label: '2' }],
    flop: [{ suit: '♠', rank: 13, label: 'K' }, { suit: '♦', rank: 13, label: 'K' }, { suit: '♠', rank: 9, label: '9' }],
    usedCards: ['♥-7', '♣-2', '♠-13', '♦-13', '♠-9'],
    dealOpp: '「じゃ、次いくよ」',
    dealMimi: '「うっ……ぜんぜん弱い手が来ちゃった……」',
    dealRico: '「これは様子見でいこっか」',
    betAmount: 100,
    betOppSpeech: '「+100。……さ、どうする？」',
    betMimi: '「Kのペア……相手強そう……」',
    betRico: '「弱い手で付き合う必要はないよ。降りるのも勝ち」',
    foldRico: 'えらい！　損切りできる子は強くなるよ',
  },
  {
    no: 3,
    title: '読む',
    playerHand: [{ suit: '♥', rank: 12, label: 'Q' }, { suit: '♥', rank: 11, label: 'J' }],
    flop: [{ suit: '♠', rank: 12, label: 'Q' }, { suit: '♦', rank: 8, label: '8' }, { suit: '♣', rank: 3, label: '3' }],
    usedCards: ['♥-12', '♥-11', '♠-12', '♦-8', '♣-3'],
    dealOpp: '「さ、最後のハンドだよ」',
    dealMimi: '「Qのペア……悪くない、けど……」',
    dealRico: '「相手のセリフ、よく聞いてね」',
    betOppSpeech: '「……これは、勝ったかも」',
    psychQid: 'rico_tutorial_flop',
    winNextRico: 'セリフの奥、ちゃんと読めてる。今日の研修はここまで！',
  },
];

// ★物語順どおりに始める：まず第1話（更衣室でリコ先輩に連行される回）を見せてから、
//   その第1話の相手であるリコ先輩と初めての卓につく。
//   （以前はいきなり第2話の相手ポルカと対戦が始まり、話の順序が逆だった）
function startIntroHand() {
  save.introEpisodeShown = true;   // 後で講義に入るとき第1話を二度出さないための記録
  saveProgress();
  // 第1話タイトルカードの直後、3ハンド研修に入る前に「ルール入門」3ステップを挟む
  // （「ルールも分からないうちからどうやってプレイするの？」への対応）
  showEpisodeTitle('rico_tutorial', () => showRulePrimer(beginIntroHand));
}

function beginIntroHand() {
  state = defaultState();
  const opp = OPPONENTS.rico_tutorial;   // 初めての卓の相手＝リコ先輩
  state.opponentId = opp.id;
  state.opponentName = opp.name;
  state.opponentProfile = opp.profile;
  state.opponentImgKey = opp.imgKey;
  state.maxHands = INTRO_HANDS.length; // P2: 3ハンドの初日研修
  state.playerChips = 500;
  state.opponentChips = 500;
  state.__initialChips = state.playerChips; // ピンチ演出：対戦開始時のチップ量を記録
  state.tutorialMode = false;   // 講義（全8章）ではなく3ハンドの実地研修なのでOFF
  state.fullHand = false;
  state.isBoss = false;
  state.introHandMode = true; // 体験ハンド：戦績非カウント・行動制限・相手は必ずコール
  state.introHandNo = 0;
  state.screen = 'battle';
  state.handPhase = 'idle';
  state.handNo = 0;
  state.panyuMax = save.panyuGaugeMax || 100;
  state.mimiThought = '「い、いきなり卓……！？　やるしかない……！」';
  state.ricoAdvice = '「今日は3ハンドだけ、私が相手するよ。習うより慣れろ〜」';
  state.opponentSpeech = '「そんな固くならないの。ほら、座った座った」';
  render();
  setTimeout(dealIntroHand, 900);
}

// Hand1（そろえる）の入口。以後の進行は introHandAdvance() が dealIntroHandByNo() を呼んで繋ぐ
function dealIntroHand() {
  dealIntroHandByNo(1);
}

// テーブル駆動のハンド配布：INTRO_HANDS[no-1] を元に手札・場札・アンティを組む
function dealIntroHandByNo(no) {
  if (state.screen !== 'battle' || !state.introHandMode) return;
  const cfg = INTRO_HANDS[no - 1];
  if (!cfg) return;
  state.introHandNo = no;
  state.handNo = no;
  resetHandJuice();
  mpSfx('deal');
  const ante = 50;
  state.playerChips -= ante; state.opponentChips -= ante;
  state.pot = ante * 2;
  resetPotChips(); pushPotChips(ante * 2);
  state.currentBetPlayer = 0;
  state.currentBetOpponent = 0;
  // 固定シナリオ：使用済みカードを除いた残りデッキ（オポーネントの2枚・演出上の重複防止のみ）
  const used = new Set(cfg.usedCards);
  state.deck = newDeck().filter(c => !used.has(`${c.suit}-${c.rank}`));
  state.playerHand = cfg.playerHand.map(c => ({ ...c }));
  state.opponentHand = [state.deck.pop(), state.deck.pop()];
  state.community = cfg.flop.map(c => ({ ...c }));
  state.equityHistory = [];
  state.psychResolved = (no !== 3);  // Hand3のみ心理バトルを発生させる
  state.logicResolvedStreet = true;  // 論理バトルは研修中は封印
  state.psychPending = false;
  state.handPhase = 'flop';
  state.opponentSpeech = cfg.dealOpp;
  state.mimiThought = cfg.dealMimi;
  state.ricoAdvice = cfg.dealRico;
  log('actions', { phase: 'intro_flop_start', hand: no });
  if (no === 1) {
    // Hand1：ミミが先に「大きく行く」を選ぶ（現行どおり）
    state.isPlayerTurn = true;
    render();
    // 研修Hand1限定：フロップが最初から開いていることを一言添える（本編には出さない）
    showIntroStreetLabel('フロップ＝場札3枚オープン');
  } else {
    // Hand2/3：リコ先輩が先にベットしてくる → ミミは反応するだけ
    state.isPlayerTurn = false;
    render();
    setTimeout(() => introHandOpponentOpenBet(no), 900);
  }
}

// 研修Hand1限定：ストリートの意味を場札の上に1.5秒だけ小さく表示する（本編バトルには出さない）
function showIntroStreetLabel(text) {
  if (document.querySelector('.intro-street-label')) return;
  const table = document.querySelector('.battle-screen .center-table');
  if (!table) return;
  const el = document.createElement('div');
  el.className = 'intro-street-label';
  el.textContent = text;
  table.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// Hand2/3共通：リコ先輩の先制ベット。Hand2は固定額、Hand3は2/3ポット＋心理バトル固定出題へ
function introHandOpponentOpenBet(no) {
  if (state.screen !== 'battle' || !state.introHandMode) return;
  const cfg = INTRO_HANDS[no - 1];
  const amount = no === 2
    ? Math.min(cfg.betAmount, state.opponentChips)
    : Math.min(Math.max(50, Math.floor(state.pot * 2 / 3)), state.opponentChips);
  state.opponentChips -= amount;
  state.currentBetOpponent += amount;
  state.pot += amount; pushPotChips(amount);
  state.opponentSpeech = cfg.betOppSpeech;
  state.lastOpponentIntent = 'intro_open_bet';
  mpSfx('battle-bet');
  setOpponentExpression('pressure');
  render();
  flyChips('.char-opponent', '.bu-pot-physical', amount);
  if (no === 2) {
    state.mimiThought = cfg.betMimi;
    state.ricoAdvice = cfg.betRico;
    state.isPlayerTurn = true;
    setTimeout(() => { if (state.screen === 'battle') render(); }, 600);
  } else {
    // Hand3：心理バトルを固定出題（qidは実在確認済みの初心者向け問題）
    setTimeout(() => triggerPsychBattle(cfg.psychQid), 900);
  }
}

// Hand2専用：フォールド処理（通常の playerFold/endHand は使わず、リコの一言だけで軽く進める）
function introHandFold() {
  const cfg = INTRO_HANDS[(state.introHandNo || 1) - 1];
  mpSfx('fold');
  const potWon = state.pot;
  state.opponentChips += state.pot;
  state.pot = 0; resetPotChips();
  state.mimiThought = '「……降りた。悔しいけど、これでいい」';
  setOpponentExpression('pleased');
  render();
  flyChips('.bu-pot-physical', '.char-opponent', potWon);
  setTimeout(() => {
    if (state.screen !== 'battle') return;
    showRicoCutIn((cfg && cfg.foldRico) || 'えらい！　損切りできる子は強くなるよ', true, () => introHandAdvance());
  }, 1200);
}

// Hand3専用：心理バトル解決後、ミミが自動でコールしてショーダウンへ（正解でも不正解でも進行する）
function introHandAfterPsych() {
  if (state.screen !== 'battle' || !state.introHandMode) return;
  mpSfx('call');
  const need = Math.max(0, state.currentBetOpponent - state.currentBetPlayer);
  const pay = Math.max(0, Math.min(need, state.playerChips));
  state.playerChips -= pay;
  state.currentBetPlayer += pay;
  state.pot += pay; pushPotChips(pay);
  state.mimiThought = '「……乗った。コール」';
  state.opponentSpeech = '「来い」';
  state.isPlayerTurn = false;
  render();
  flyChips('.char-mimi', '.bu-pot-physical', pay);
  setTimeout(() => { if (state.screen === 'battle') introHandShowdown(); }, 900);
}

// ハンド間の進行役：3ハンド目まで dealIntroHandByNo() を繋ぎ、それ以降は研修完了画面へ
function introHandAdvance() {
  if (state.screen !== 'battle' || !state.introHandMode) return;
  const no = state.introHandNo || 1;
  if (no < INTRO_HANDS.length) {
    setTimeout(() => dealIntroHandByNo(no + 1), 300);
  } else {
    setTimeout(showIntroHandWinScreen, 300);
  }
}

// 研修スキップ：確認なしで即・終了画面へ（報酬は最後まで進めた場合と同額）
function introHandSkip() {
  if (!state.introHandMode) return;
  if (typeof dismissCutIn === 'function') dismissCutIn();
  if (state.psychRoot) { state.psychRoot.remove(); state.psychRoot = null; }
  state.psychPending = false;
  showIntroHandWinScreen();
}

// 体験ハンド専用のショーダウン：ランダム要素に左右されず必ずミミの勝利にする（Hand1/Hand3共通）
function introHandShowdown() {
  const playerAll = [...state.playerHand, ...state.community];
  const pEv = evaluateHand(playerAll);
  const oEv = evaluateHand([...state.opponentHand, ...state.community]);
  const pot = state.pot;
  const cfg = INTRO_HANDS[(state.introHandNo || 1) - 1];
  // 本編と同じ段階演出：めくり → 勝ち札ハイライト → チップが飛んでくる
  state.handPhase = 'showdown';
  state.isPlayerTurn = false;
  state.opponentSpeech = '「……ショーダウン。見せてごらん」';
  state.mimiThought = '「……勝負！」';
  render();
  setTimeout(() => {
    if (state.screen !== 'battle') return;
    state.opponentRevealed = true;
    state.__dealSeen.opp = 0;
    state.opponentSpeech = `相手の役：${oEv.name}`;
    mpSfx('flip');
    render();
  }, 550);
  setTimeout(() => {
    if (state.screen !== 'battle') return;
    state.sdHighlight = new Set((pEv.bestFive || []).map(cardKey));
    state.opponentSpeech = '「……お見事。上等だよ」';
    state.mimiThought = `「${pEv.name}……勝った！」`;
    setMimiExpression('win');
    setOpponentExpression('defeat'); // リコ先輩が笑って負けを認める表情に
    render();
    showShowdownCallout('player', pEv, oEv);
    mpSfx('bigwin');
  }, 1500);
  setTimeout(() => {
    if (state.screen !== 'battle') return;
    state.playerChips += pot;
    state.pot = 0; resetPotChips();
    state.mimiThought = `「やった！${pEv.name}で勝った！」`;
    render();
    flyChips('.bu-pot-physical', '.char-mimi', pot);
    floatText('.char-mimi', `+${pot}`, 'ft-gain');
  }, 2600);
  setTimeout(() => {
    if (state.screen !== 'battle') return;
    const line = (cfg && cfg.winNextRico) || 'ね、いい調子。次いこ！';
    showRicoCutIn(line, true, () => introHandAdvance());
  }, 3900);
}

function showIntroHandWinScreen() {
  save.coins = (save.coins || 0) + 300;
  save.introPlayed = true;
  saveProgress();
  const overlay = document.createElement('div');
  overlay.className = 'intro-win-overlay';
  overlay.innerHTML = `
    <div class="intro-win-modal">
      <div class="intro-win-badge">🏆 研修完了！</div>
      <div class="intro-win-title">初日の3ハンド、乗り切った！</div>
      <div class="intro-win-coins">💰 +300 コイン獲得</div>
      <div class="intro-win-question">もっと理屈を知りたい？</div>
      <div class="intro-win-buttons">
        <button class="btn btn-primary" data-action="intro-to-lecture">📚 リコの講義へ</button>
        <button class="btn btn-secondary" data-action="intro-to-lobby">🎮 このままロビーへ</button>
      </div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
}

// 体験ハンド中は「中断」等を隠して没入を優先
function applyIntroHandUI() {
  const pauseBtn = document.querySelector('.battle-screen .top-hud [data-action="back-lobby"], .battle-screen .v2-pause');
  if (pauseBtn) pauseBtn.style.display = 'none';
  // 体験ハンドはリコ先輩自身が対戦相手なので、左の「先輩立ち絵」を二重に出さない
  const scr = document.querySelector('.battle-screen');
  if (scr) scr.classList.add('intro-hand-mode');
  const backdoorBtn = document.querySelector('.backdoor-toggle');
  if (backdoorBtn) backdoorBtn.style.display = 'none';
  // 研修スキップ：右上に小さく。確認なしで終了画面へ（報酬は同額）
  if (scr && !scr.querySelector('.intro-skip-btn')) {
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'intro-skip-btn';
    skipBtn.dataset.action = 'intro-skip';
    skipBtn.textContent = '研修をスキップ';
    skipBtn.addEventListener('click', onAction);
    scr.appendChild(skipBtn);
  }
}

//=============================================================
// 11. ハンド進行
//=============================================================
function startHand() {
  if (state.playerChips <= 0 || state.opponentChips <= 0) { return endBattle(); }
  state.handNo++;
  if (state.handNo > state.maxHands) { return endBattle(); }
  setOpponentExpression('default'); // 新ハンドは平常表情から
  setMimiExpression('default');
  resetHandJuice();
  mpSfx('deal'); // 配布音（equippedSePack設定を反映）

  // ブラインド簡略化（v4: 各50チップアンティ）
  const ante = Math.min(50, state.playerChips, state.opponentChips);
  state.playerChips -= ante;
  state.opponentChips -= ante;
  state.pot = ante * 2;
  resetPotChips();
  pushPotChips(ante * 2);
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
  state.equityHistory = []; // ハンド毎にリセット
  state.psychResolved = false;
  state.logicResolvedStreet = false;
  state.psychPending = false;
  state.bossPsychFiredThisHand = false; // ボス戦の1ハンド1回制限リセット
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

// === ミミの現状アセスメント（解説強化） ===
// allCards: 自分の手札＋場札（≥5枚）、community: 場札、
// opponentBet: 相手の当ストリート総ベット（UI表記と一致）、pot: そのベット前のポット、
// callNeed: ミミがコールに必要な額（差額。省略時は opponentBet と同値）
function mimiAssess(allCards, community, opponentBet, pot, callNeed) {
  if (!allCards || allCards.length < 5) return '';
  const ev = evaluateHand(allCards);
  const danger = evaluateBoardDanger(community);
  const street = community.length === 3 ? 'フロップ' : community.length === 4 ? 'ターン' : 'リバー';
  // 役の強度ラベル
  let strengthLabel = '';
  let lean = ''; // 推奨ライン
  if (ev.rank >= 5)      { strengthLabel = '【極めて強い】'; lean = '価値を取りに行く場面'; }
  else if (ev.rank >= 3) { strengthLabel = '【強い】';       lean = '攻めるか、相手を釣るか'; }
  else if (ev.rank >= 2) { strengthLabel = '【まずまず】';   lean = '相手の出方次第'; }
  else if (ev.rank === 1) {
    // ペアの強さで分岐：ペアのランクが11以上ならトップペア寄り
    const topBoard = community.length ? Math.max(...community.map(c => c.rank)) : 0;
    const hasOverPair = allCards.some(c => c.rank > topBoard) && (allCards.filter(c => c.rank === allCards.sort((a,b)=>b.rank-a.rank)[0].rank).length >= 2);
    if (hasOverPair)    { strengthLabel = '【強い】'; lean = 'バリュー寄り、ベットして良い'; }
    else                { strengthLabel = '【ふつう】'; lean = '慎重に、ポット小さく' ; }
  }
  else                   { strengthLabel = '【弱い】';       lean = '無理せず、勝負しない方が安い'; }

  // ボード警告
  const warnings = [];
  if (danger.flushMade && ev.rank < 5) warnings.push('場にフラッシュ完成あり');
  else if (danger.flushAlert) warnings.push('フラッシュ気配');
  if (danger.straightAlert) warnings.push('ストレート気配');
  if (danger.pairBoard && ev.rank < 6) warnings.push('場ペア＝フルハウス警戒');
  const warnStr = warnings.length ? `／⚠ ${warnings.join('・')}` : '';

  // ポットオッズ（ノート所持時のみ） — コールに必要な額が基準
  let oddsStr = '';
  const _callNeed = (typeof callNeed === 'number' ? callNeed : opponentBet);
  if (_callNeed > 0 && save.ownedItems && save.ownedItems.includes('note_pot_odds')) {
    // 現ポット（相手のベット込み）+ ミミのコール = コール後の総ポット
    // 必要勝率 = コール額 / コール後の総ポット
    const fullPotIncludingBet = pot + opponentBet; // = state.pot
    const totalAfterCall = fullPotIncludingBet + _callNeed;
    const reqWinRate = Math.round((_callNeed / totalAfterCall) * 100);
    oddsStr = `／ポットオッズ：${reqWinRate}%以上勝てればコール＋EV`;
  }

  // 相手アクションへの一言
  let actionLine = '';
  if (opponentBet > 0) {
    const ratio = opponentBet / Math.max(1, pot);
    if (ratio >= 0.9)      actionLine = `相手の${opponentBet}は重いベット。`;
    else if (ratio >= 0.5) actionLine = `相手の${opponentBet}は強気のサイズ。`;
    else                   actionLine = `相手の${opponentBet}は様子見サイズ。`;
  } else {
    actionLine = `相手はチェック。情報は薄い。`;
  }

  return `${street}：${ev.name} ${strengthLabel}${warnStr}\n${actionLine}${oddsStr}\n→ ${lean}`;
}

//=============================================================
// 12. プレイヤーアクション
//=============================================================
function playerFold() {
  mpSfx('fold');
  state.opponentSpeech = opponentReactToPlayerFold();
  log('actions', { actor: 'player', type: 'fold' });
  state.handResults.push({ hand: state.handNo, winner: 'opponent', reason: 'fold', pot: state.pot, by: '降伏' });
  const potWon = state.pot;
  state.opponentChips += state.pot;
  state.pot = 0; resetPotChips();
  flyChips('.bu-pot-physical', '.char-opponent', potWon);
  render();
  setTimeout(endHand, 1100);
}
function playerCall() {
  mpSfx('call');
  const need = state.currentBetOpponent - state.currentBetPlayer;
  const pay = Math.max(0, Math.min(need, state.playerChips));
  state.playerChips = Math.max(0, state.playerChips - pay);
  state.currentBetPlayer += pay;
  state.pot += pay; pushPotChips(pay);
  log('bets', { actor: 'player', type: 'call', amount: pay });
  state.isPlayerTurn = false;
  state.mimiThought = '「コールした。次の場札を見よう」';
  render();
  flyChips('.char-mimi', '.bu-pot-physical', pay);
  setTimeout(advanceAfterCall, 700);
}
function playerCheckCall() {
  const need = state.currentBetOpponent - state.currentBetPlayer;
  if (need > 0) return playerCall();
  mpSfx('check');
  // 両者チェック → 次ストリートへ
  log('actions', { actor: 'player', type: 'check' });
  state.isPlayerTurn = false;
  state.mimiThought = '「こちらもチェック」';
  render();
  setTimeout(advanceAfterCall, 700);
}
function playerRaise(bb) {
  mpSfx('battle-bet');
  const amount = Math.max(0, Math.min(50 * bb, state.playerChips));
  state.playerChips = Math.max(0, state.playerChips - amount);
  state.currentBetPlayer += amount;
  state.pot += amount; pushPotChips(amount);
  log('bets', { actor: 'player', type: 'raise', amount });
  state.isPlayerTurn = false;
  state.mimiThought = `「${bb}BBレイズ！」`;
  state.opponentSpeech = opponentReactToPlayerAggression('raise', amount);
  if (!state.introHandMode && !state.tutorialMode) {
    setOpponentExpression(state.opponentId === 'velvet' ? 'pleased' : 'rattled');
  }
  render();
  flyChips('.char-mimi', '.bu-pot-physical', amount);
  setTimeout(opponentTurn, 700);
}
function playerBet(size) {
  mpSfx('battle-bet');
  const amount = betSizeToChips(size, state.pot, state.playerChips);
  state.playerChips = Math.max(0, state.playerChips - amount);
  state.currentBetPlayer += amount;
  state.pot += amount; pushPotChips(amount);
  log('bets', { actor: 'player', type: 'bet', size, amount });
  state.isPlayerTurn = false;
  state.mimiThought = `「${amount}ベット」`;
  // pot 1/2以下は 'bet_small'、2/3〜pot は 'bet_big'
  const aggroKind = (size === 'pot_2_3' || size === 'pot_1') ? 'bet_big' : 'bet_small';
  state.opponentSpeech = opponentReactToPlayerAggression(aggroKind, amount);
  if (!state.introHandMode && !state.tutorialMode && aggroKind === 'bet_big') {
    setOpponentExpression(state.opponentId === 'velvet' ? 'pleased' : 'rattled');
  }
  render();
  flyChips('.char-mimi', '.bu-pot-physical', amount);
  setTimeout(opponentTurn, 700);
}
function playerAllIn() {
  mpSfx('battle-allin');
  const amount = state.playerChips;
  state.playerChips = 0;
  state.currentBetPlayer += amount;
  state.pot += amount; pushPotChips(amount);
  log('bets', { actor: 'player', type: 'allin', amount });
  state.isPlayerTurn = false;
  state.mimiThought = '「オールイン！」';
  state.opponentSpeech = opponentReactToPlayerAggression('allin', amount);
  if (!state.introHandMode && !state.tutorialMode) {
    setOpponentExpression(state.opponentId === 'velvet' ? 'pleased' : 'rattled');
  }
  render();
  flyChips('.char-mimi', '.bu-pot-physical', amount);
  showAllInCutIn('player', amount);
  setTimeout(opponentTurn, 1800);
}

// オールイン カットイン演出
function showAllInCutIn(side, amount) {
  // 既存があれば消す
  const existing = document.querySelector('.allin-cutin');
  if (existing) existing.remove();
  const isPlayer = side === 'player';
  const name = isPlayer ? 'ミミ' : (state.opponentName || '相手');
  const imgKey = isPlayer ? 'mimi' : (state.opponentImgKey || 'polka');
  const accentClass = isPlayer ? 'allin-player' : 'allin-opponent';
  const overlay = document.createElement('div');
  overlay.className = `allin-cutin ${accentClass}`;
  overlay.innerHTML = `
    <div class="allin-streak"></div>
    <div class="allin-streak allin-streak-2"></div>
    <div class="allin-burst"></div>
    <div class="allin-portrait">
      <img src="assets/characters/${imgKey}_default.png" alt="${name}" onerror="window.assetFallback(this,'${imgKey}')">
    </div>
    <div class="allin-text-wrap">
      <div class="allin-kanji">全</div>
      <div class="allin-title">ALL IN</div>
      <div class="allin-sub">${name}</div>
      <div class="allin-amount">${amount} チップ</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 振動
  if (navigator.vibrate) navigator.vibrate([60, 30, 100]);
  // バースト粒子
  for (let i = 0; i < 18; i++) {
    setTimeout(() => spawnAllInSpark(overlay), i * 40);
  }
  setTimeout(() => overlay.classList.add('out'), 1500);
  setTimeout(() => overlay.remove(), 2100);
  // オールイン対決の「一撃の重さ」演出：卓を一瞬暗転＋わずかにズーム
  document.body.classList.add('allin-tension');
  setTimeout(() => document.body.classList.remove('allin-tension'), 1200);
}
function spawnAllInSpark(parent) {
  const s = document.createElement('div');
  s.className = 'allin-spark';
  s.textContent = pick(['✨', '💥', '🔥', '⭐']);
  const angle = rand() * Math.PI * 2;
  const dist = 200 + rand() * 280;
  s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
  s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
  s.style.fontSize = (22 + rand() * 18) + 'px';
  parent.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}

//=============================================================
// 13. 相手アクション
//=============================================================
// 相手の「考える間」：即答ではなく、状況が重いほど長く迷ってから決める（読み合いの手触り）
function opponentTurn() {
  if (state.screen !== 'battle' || state.handPhase === 'idle' || state.handPhase === 'showdown') return;
  if (state.introHandMode || state.opponentChips <= 0) return opponentTurnDecide();
  const need = state.currentBetPlayer - state.currentBetOpponent;
  const heavy = need > 0 && need >= Math.max(100, state.pot * 0.35);
  const delay = heavy ? 900 + rand() * 800 : 380 + rand() * 320;
  state.opponentThinking = true;
  render();
  setTimeout(() => {
    state.opponentThinking = false;
    if (state.screen !== 'battle') return;
    opponentTurnDecide();
  }, delay);
}
function opponentTurnDecide() {
  // 画面遷移後のゾンビ実行ガード
  if (state.screen !== 'battle' || state.handPhase === 'idle' || state.handPhase === 'showdown') return;
  // 既にオールイン済み（チップ0）なら追加アクション不可：自動チェック扱いで次に進める
  // ※「オールインを2回以上行ってくる」バグの修正
  if (state.opponentChips <= 0) {
    const oppNeedNow = state.currentBetPlayer - state.currentBetOpponent;
    if (oppNeedNow > 0) {
      // 既に全額入っているのでこれ以上は払えない（自動コール扱い）→ そのまま次ストリートへ
      setTimeout(advanceAfterCall, 600);
    } else {
      // ベットが揃っている → 次ストリートへ
      setTimeout(advanceAfterCall, 600);
    }
    return;
  }
  const need = state.currentBetPlayer - state.currentBetOpponent;
  // 相手の手札強度を計算
  const allCards = [...state.opponentHand, ...state.community];
  const hs = state.community.length >= 3 ? handStrength01(allCards) : opponentPreflopStrength(state.opponentHand);
  const boardDanger = evaluateBoardDanger(state.community);
  const ctx = { handStrength: hs, toCall: need, boardDanger, canCheck: need === 0 };

  // P2: 体験ハンドでは相手は必ずチェック/コールで応じ、そのまま次ストリートへ自動進行
  // （体験ハンドはフロップの1択のみ・以降は自動でミミの勝利へ。フォールドもレイズもしない＝確実にミミが勝つ）
  if (state.introHandMode) {
    state.lastOpponentIntent = 'check_call';
    const pay = Math.max(0, Math.min(need, state.opponentChips));
    state.opponentChips = Math.max(0, state.opponentChips - pay);
    state.currentBetOpponent += pay;
    state.pot += pay; pushPotChips(pay);
    state.opponentSpeech = pay > 0 ? 'う……いいよ、コール' : 'チェックで';
    render();
    if (pay > 0) flyChips('.char-opponent', '.bu-pot-physical', pay);
    setTimeout(advanceAfterCall, 900);
    return;
  }

  // v4: 第1ハンドのフロップ後、ポルカは必ず2/3以上ベット → 心理バトル強制発生
  // チュートリアル時もリコ先輩は同様にブラフベットして練習させる
  // ボス戦は各ストリートで強制大ベット（心理バトルを必ず発動させるため）
  const forceLargeBet =
    (state.handNo === 1 && state.handPhase === 'flop' && !state.psychResolved && state.currentBetPlayer === 0) ||
    (state.isBoss && (state.handPhase === 'flop' || state.handPhase === 'turn' || state.handPhase === 'river') && !state.psychResolved && state.currentBetPlayer === 0) ||
    // ボス戦のプリフロップ：15%確率で威圧的レイズ（開幕の重圧）
    (state.isBoss && state.handPhase === 'preflop' && state.currentBetPlayer === 0 && rand() < 0.15);
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
    const potWon = state.pot;
    state.playerChips += state.pot;
    state.pot = 0; resetPotChips();
    flyChips('.bu-pot-physical', '.char-mimi', potWon);
    setOpponentExpression('defeat');
    render();
    floatText('.char-mimi', `+${potWon}`, 'ft-gain');
    setTimeout(endHand, 1300);
    return;
  }
  // チェック/コール
  if (action.type === 'check_call') {
    const pay = Math.max(0, Math.min(need, state.opponentChips));
    state.opponentChips = Math.max(0, state.opponentChips - pay);
    state.currentBetOpponent += pay;
    state.pot += pay; pushPotChips(pay);
    state.opponentSpeech = opponentSpeech(action);
    log('actions', { actor: 'opponent', type: pay > 0 ? 'call' : 'check', amount: pay });
    // 今ストリートで相手がチェックした事実を記録（次のレイズで check-raise 検出に使う）
    if (pay === 0) state.opponentCheckedThisStreet = true;
    mpSfx(pay > 0 ? 'call' : 'check');
    render();
    if (pay > 0) flyChips('.char-opponent', '.bu-pot-physical', pay);
    if (pay > 0) {
      // 相手がコール → ベットマッチ → 次ストリートへ
      setTimeout(advanceAfterCall, 900);
    } else {
      // 相手がチェック → プレイヤーに手番を渡す
      state.isPlayerTurn = true;
      if (state.community.length >= 3) {
        const assess = mimiAssess([...state.playerHand, ...state.community], state.community, 0, state.pot);
        state.mimiThought = `「相手はチェック……」\n${assess}`;
      } else {
        state.mimiThought = '「相手はチェックか……こちらのターン」';
      }
      setTimeout(render, 900);
    }
    return;
  }
  // ベット/レイズ
  let amount = betSizeToChips(action.size, state.pot, state.opponentChips);
  // === 最小レイズ保証 ===
  // need > 0 のとき（=プレイヤーがすでにベットしている＝相手はレイズする立場）：
  //   amount は「コール額(need)」＋「最小レイズ幅(>= max(50, need))」以上でなければならない。
  // amount が need にも満たない場合はチェック/コールに格下げ（不正なベット防止）。
  if (need > 0) {
    if (amount < need) {
      // 単純コールに格下げ
      const pay = Math.min(need, state.opponentChips);
      state.opponentChips -= pay;
      state.currentBetOpponent += pay;
      state.pot += pay; pushPotChips(pay);
      state.opponentSpeech = opponentSpeech({ type: 'check_call', intent: 'reluctant_call' });
      log('actions', { actor: 'opponent', type: 'call_fallback', amount: pay });
      mpSfx('call');
      render();
      flyChips('.char-opponent', '.bu-pot-physical', pay);
      setTimeout(advanceAfterCall, 900);
      return;
    }
    const minRaiseTotal = need + Math.max(50, need); // call + min raise step
    if (amount < minRaiseTotal) amount = Math.min(minRaiseTotal, state.opponentChips);
  }
  state.opponentChips = Math.max(0, state.opponentChips - amount);
  state.currentBetOpponent += amount;
  state.pot += amount; pushPotChips(amount);
  // チェックレイズ検出：同ストリートでチェック→今ベット
  state.checkRaiseDetected = !!state.opponentCheckedThisStreet;
  state.opponentSpeech = opponentSpeech(action);
  log('bets', { actor: 'opponent', type: 'bet', size: action.size, amount, intent: action.intent });
  log('reactions', { intent: action.intent, speech: state.opponentSpeech });
  mpSfx(action.size === 'allin' ? 'battle-allin' : 'battle-bet');
  flyChips('.char-opponent', '.bu-pot-physical', amount);
  // オールイン特別演出：実際にチップが動き、かつ残スタックが0になった瞬間のみ
  if (amount > 0 && (action.size === 'allin' || state.opponentChips === 0)) {
    setOpponentExpression('pressure'); // 相手を強気表情に
    showAllInCutIn('opponent', amount);
  } else {
    // 大ベット時に重さ演出＋相手カットイン
    const bigBet = (action.size === 'pot_2_3' || action.size === 'pot_1');
    if (bigBet) {
      setOpponentExpression('pressure'); // 相手を強気表情に
      triggerBetShake(action.size);
      setTimeout(() => showOpponentCutIn(state.opponentSpeech, action.size), 300);
    }
  }

  const bigEnough = (action.size === 'pot_2_3' || action.size === 'pot_1' || action.size === 'allin');
  const isBluffBet = (action.intent === 'bluff' || action.intent === 'forced_bluff' || action.intent === 'tutorial_bluff');
  const isPostFlop = (state.handPhase === 'flop' || state.handPhase === 'turn' || state.handPhase === 'river');
  const triggerFirstHand = (state.handNo === 1 && state.handPhase === 'flop' && bigEnough && !state.isBoss);
  // フルハンド：どのストリートでもブラフ意図の大ベットで50%発動
  const triggerBluff = (isPostFlop && bigEnough && isBluffBet && rand() < 0.5);
  // ヴェルベット（ボス戦）：条件付き発動
  //   ・1ハンドにつき最大1回（state.bossPsychFiredThisHand）
  //   ・ボスは「優勢時こそ追い込む」心理的支配タイプ
  //   ・劣勢時にもピンチでの読み合いを発動
  //   ・致命的なベットは確定発動
  //   ・ストリートが進むほど高確率（情報が増えた本気の読み合い）
  let triggerBoss = false;
  if (state.isBoss && isPostFlop && bigEnough && !state.bossPsychFiredThisHand) {
    const initChips = (OPPONENTS[state.opponentId]?.chips) || 1500;
    const chipsRatio = state.playerChips / initChips;
    const isCriticalBet = action.size === 'pot_1' || action.size === 'allin';
    // 致命級ベットは0.85確定、劣勢時 0.5、優勢時こそ0.6（心理支配）、それ以外0.25
    let baseChance;
    if (isCriticalBet)            baseChance = 0.85;
    else if (chipsRatio < 0.65)   baseChance = 0.5;
    else if (chipsRatio > 1.15)   baseChance = 0.6;  // ヴェルベットは追い込む
    else                          baseChance = 0.25;
    // ストリート進行で確率増（フロップ0.6倍/ターン1.0/リバー1.2）
    const streetMod = state.handPhase === 'flop' ? 0.6 : state.handPhase === 'turn' ? 1.0 : 1.2;
    triggerBoss = rand() < baseChance * streetMod;
  }
  // 心理バトル有効判定（チュートリアル中は常時ON、その他は設定に従う）
  // ミミミ MAX で相手性格を読み切った後はこの対戦では発動しない
  const psychAllowed = (state.tutorialMode || (save.psychEnabled !== false)) && !state.opponentPersonalityRevealed;
  if (psychAllowed && !state.psychResolved && (triggerFirstHand || triggerBluff || triggerBoss)) {
    render();
    const qid = pickPsychQuestion();
    if (triggerBoss) state.bossPsychFiredThisHand = true;
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
  // 場札があればアセスメント付き、無ければシンプル
  // 表示用：相手の総コミット額と、ミミがコールに必要な額（差額）
  const oppTotal = state.currentBetOpponent;
  const callNeed = Math.max(0, state.currentBetOpponent - state.currentBetPlayer);
  if (state.community.length >= 3) {
    // 「相手のベット」評価は UI ラベルと同じ基準（oppTotal vs pot-oppTotal）で出す
    // ポットオッズ表示は別途 callNeed/pot を内部で計算
    const assess = mimiAssess([...state.playerHand, ...state.community], state.community, oppTotal, state.pot - oppTotal, callNeed);
    const callPart = callNeed > 0 && callNeed !== oppTotal ? `（コール${callNeed}）` : '';
    state.mimiThought = `「${state.opponentName || '相手'}が${oppTotal}まで${callPart}……」\n${assess}`;
  } else {
    state.mimiThought = `「${state.opponentName || '相手'}が${oppTotal}ベット……どう出る？」`;
  }
  render();
}

function opponentPreflopStrength(hand) {
  // Chen フォーミュラ準拠：実戦に近いプリフロップ強度を 0-1 で返す
  const ranks = hand.map(c => c.rank).sort((a, b) => b - a);
  const [hi, lo] = ranks;
  // カード基本点（Chenルール：A=10, K=8, Q=7, J=6, 10=5, 9以下は rank/2）
  const cardPoint = (r) => {
    if (r === 14) return 10;
    if (r === 13) return 8;
    if (r === 12) return 7;
    if (r === 11) return 6;
    if (r === 10) return 5;
    return r / 2;
  };
  let score = cardPoint(hi);
  if (hi === lo) {
    // ペア：×2（ただし 22 は最低5点 → 22-> 2*2=4, 5以下なら min 5）
    score = Math.max(5, score * 2);
  }
  // スーテッド +2
  if (hand[0].suit === hand[1].suit) score += 2;
  // ギャップ補正
  if (hi !== lo) {
    const gap = hi - lo - 1;
    if (gap === 0)      score -= 0;
    else if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else                score -= 5;
    // 両カードが Q 以下 & ギャップ 0-1 & スーテッド：ストレート可能性ボーナス
    if (hi < 12 && gap <= 1) score += 1;
  }
  // Chen score の範囲：通常 -1 〜 20（AA）
  // 0-1 にスケーリング：weak(0) ≈ 0.20、AA(20) ≈ 0.90
  // 線形：(score - (-1)) / 21 にして 0.15-0.90 にマップ
  const normalized = Math.max(0, Math.min(1, (score - (-1)) / 21));
  // 0.15 〜 0.90 範囲にマップ（最弱でも 15%、最強でも 90% 程度）
  return 0.15 + normalized * 0.75;
}

//=============================================================
// 14. ハンド進行（フロップ → ターン＆リバー → ショーダウン）
//=============================================================
function advanceAfterCall() {
  if (state.screen !== 'battle') return;
  // ベットが揃った
  state.currentBetPlayer = 0;
  state.currentBetOpponent = 0;
  // ストリート遷移時にチェックレイズ検出をリセット
  state.opponentCheckedThisStreet = false;
  state.checkRaiseDetected = false;
  if (state.handPhase === 'preflop') {
    // フロップ公開（scriptedFlopがあれば固定札）
    if (state.scriptedFlop) {
      state.community = state.scriptedFlop.map(c => ({...c}));
    } else {
      state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()];
    }
    state.handPhase = 'flop';
    recordEquitySnapshot('フロップ');
    state.mimiThought = `「フロップ：${renderCardsText(state.community)}」\n${mimiAssess([...state.playerHand, ...state.community], state.community, 0, state.pot)}`;
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
      state.handPhase = 'turn';
      state.isPlayerTurn = false;
      state.psychResolved = false;  // 各ストリートで心理バトル再発生可能に
      state.logicResolvedStreet = false;
      revealCommunity([state.deck.pop()], {
        thought: () => `「ターン公開：${renderCardsText(state.community)}」\n${mimiAssess([...state.playerHand, ...state.community], state.community, 0, state.pot)}`,
        rico: '「ターンで場が変わったかもね。相手のベットの変化、見逃さないで」',
        done: () => {
          recordEquitySnapshot('ターン');
          log('actions', { phase: 'turn', cards: state.community.map(c=>c.label+c.suit) });
          opponentTurn();
        },
      });
    } else {
      // ライトハンド：ターン＆リバーまとめ
      const cards = state.scriptedTurnRiver
        ? state.scriptedTurnRiver.map(c => ({...c}))
        : [state.deck.pop(), state.deck.pop()];
      state.handPhase = 'turnRiver';
      state.isPlayerTurn = false;
      revealCommunity(cards, {
        thought: () => `「ターン＆リバー：${renderCardsText(state.community)}」\n${mimiAssess([...state.playerHand, ...state.community], state.community, 0, state.pot)}`,
        rico: '「全部の場札出たね〜。最終判断、いい？」',
        done: () => {
          recordEquitySnapshot('ターン＆リバー');
          log('actions', { phase: 'turn_river', cards: state.community.map(c=>c.label+c.suit) });
          // 研修Hand1限定：ターン＆リバーの意味を場札の上に一言添える（本編には出さない）
          if (state.introHandMode && state.introHandNo === 1) showIntroStreetLabel('ターン＆リバー＝残り2枚');
          opponentTurn();
        },
      });
    }
  } else if (state.handPhase === 'turn') {
    // フルハンド：リバー公開
    state.handPhase = 'river';
    state.isPlayerTurn = false;
    state.psychResolved = false;
    state.logicResolvedStreet = false;
    revealCommunity([state.deck.pop()], {
      thought: () => `「リバー公開：${renderCardsText(state.community)}」\n${mimiAssess([...state.playerHand, ...state.community], state.community, 0, state.pot)}`,
      rico: '「リバーまで出揃ったよ。ここから最終判断ね」',
      done: () => {
        recordEquitySnapshot('リバー');
        log('actions', { phase: 'river', cards: state.community.map(c=>c.label+c.suit) });
        opponentTurn();
      },
    });
  } else if (state.handPhase === 'turnRiver' || state.handPhase === 'river') {
    return showdown();
  }
}

//=============================================================
// 15. 心理バトル
//=============================================================
function triggerPsychBattle(qid) {
  // 多重起動・画面遷移ガード
  if (state.psychRoot && state.psychRoot.isConnected) return;
  // 相手のカットインが残っていると心理バトルの選択肢を覆い隠すので先に畳む
  if (typeof dismissCutIn === 'function') dismissCutIn();
  document.querySelectorAll('.opp-cutin, .opponent-cutin, .cutin-overlay').forEach(e => e.remove());
  if (state.screen !== 'battle' && !state.lectureMode) return;
  if (!qid || !PSYCH_QUESTIONS[qid]) {
    console.warn('Psych battle: invalid qid', qid);
    return;
  }
  state.psychResolving = false; // 新ラウンドで再解放
  state.psychPending = true;
  // 出題履歴に追加
  if (!state.seenQuestions) state.seenQuestions = new Set();
  state.seenQuestions.add(qid);
  // バトルをまたいだ再出題も避ける：直近12問をセーブに記録し、次回の抽選候補から除外
  if (!save.recentQids) save.recentQids = [];
  save.recentQids = save.recentQids.filter(q => q !== qid);
  save.recentQids.push(qid);
  if (save.recentQids.length > 12) save.recentQids = save.recentQids.slice(-12);
  saveProgress();
  // 直近履歴：最大10件まで
  if (!state.psychHistory) state.psychHistory = [];
  state.psychHistory.push(qid);
  if (state.psychHistory.length > 10) state.psychHistory.shift();
  const q = PSYCH_QUESTIONS[qid];
  // v4 A1: 選択肢シャッフル
  const shuffled = shuffle(q.choices);
  const labels = ['A','B','C','D','E'];

  setMimiExpression('think'); // P1-3: 心理バトル開始で真剣な表情に
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
      <img data-opp-face src="assets/characters/${imgKey}_default.png" alt="${oppName}" onerror="window.assetFallback(this,'${imgKey}')">
      <div class="portrait-name">${oppName}</div>
    `;
  }
  // 上段ポートレート：立ち絵を丸窓アバターに（額だけ写る帯クロップの解消）
  root.querySelectorAll('.battle-portrait > img').forEach(img => {
    const wrap = document.createElement('span');
    wrap.className = 'bp-avatar';
    img.replaceWith(wrap);
    wrap.appendChild(img);
  });
  // モーダルタイプによってヘッダー差し替え（講義 / 心理 / 論理）
  const isLogic = q.type === 'logic';
  const isLecture = !!state.lectureMode;
  // v2舞台演出は「心理／論理バトル」時のみ。講義モードは従来レイアウトのまま
  // （既存の講義UI・演出との衝突を避けるため）。
  root.classList.toggle('v2psych', !isLecture);
  const titleEl = root.querySelector('.psych-title');
  if (titleEl) {
    if (isLecture) {
      // 講義モード：内容は講義なのに「心理バトル」と出る不一致を解消
      const chapterSub = q.chapterTitle || '— ポーカーの基礎を学ぶ —';
      titleEl.innerHTML = `📚 リコ先輩の講義<small class="battle-subtitle">${chapterSub}</small>`;
    } else if (isLogic) {
      titleEl.innerHTML = '<span class="v2p-title-en v2-disp">LOGIC BATTLE</span><span class="v2p-title-jp">論理バトル</span>';
    } else {
      titleEl.innerHTML = '<span class="v2p-title-en v2-disp">PSYCH BATTLE</span><span class="v2p-title-jp">心理バトル</span>';
    }
    titleEl.classList.toggle('logic-mode', isLogic && !isLecture);
    titleEl.classList.toggle('lecture-mode', isLecture);
  }
  // モーダル全体にもクラス
  const modalEl = root.querySelector('.psych-modal');
  if (modalEl) {
    modalEl.classList.toggle('logic-mode', isLogic && !isLecture);
    modalEl.classList.toggle('lecture-mode', isLecture);
  }
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
        <img data-opp-face src="assets/characters/${state.opponentImgKey}_default.png" alt="${state.opponentName}" onerror="window.assetFallback(this,'${state.opponentImgKey}')">
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

  // v2.1：初心者向けの「いま起きたこと」1行＋この読みの掛け金（重み）を選択肢の直前に出す
  if (!isLecture) {
    root.querySelector('.v2p-context')?.remove();
    const need = Math.max(0, state.currentBetOpponent - state.currentBetPlayer);
    const oppShort = (state.opponentName || '相手').replace(/（.*）/, '');
    const happened = isLogic
      ? `コールには <b>${need}</b> 必要（ポット ${state.pot}）。数字で判断できる場面`
      : `${oppShort}が <b>+${state.currentBetOpponent || 0}</b> ベット（ポット ${state.pot}）。この言葉が本心か、読む`;
    const gain = (q.onSuccess && q.onSuccess.panyu) || 0;
    const loss = (q.onFail && q.onFail.panyu) || 0;
    const ctx = document.createElement('div');
    ctx.className = 'v2p-context';
    // 「いま起きたこと」は状況整理テキストが既に語っているので、掛け金だけを右端に出す
    void happened;
    ctx.innerHTML = `<span class="v2p-ctx-stakes">この読みの賭け金 — 成功：<b class="v2p-gain">ぱにゅ +${gain}／ミミミ +1</b>　失敗：<b class="v2p-loss">ぱにゅ ${loss}</b></span>`;
    root.querySelector('.psych-modal')?.appendChild(ctx); // 選択肢の直上に絶対配置（CSS側で位置決め）
  }

  // v2：右上ミミミゲージ（読み切り進捗を3セグメントで表示。講義モードでは非表示のまま）
  const gaugeBox = root.querySelector('[data-bind="zazazoGaugeBox"]');
  if (gaugeBox) {
    if (isLecture) {
      gaugeBox.style.display = 'none';
    } else {
      const zMax = state.zazazoMax || 3;
      const revealed = !!state.opponentPersonalityRevealed;
      const zCur = revealed ? zMax : Math.min(zMax, state.zazazo || 0);
      let segs = '';
      for (let i = 0; i < zMax; i++) segs += `<span class="v2p-gauge-seg${i < zCur ? ' is-filled' : ''}"></span>`;
      gaugeBox.innerHTML = `
        <span class="v2p-gauge-label v2-disp">ミミミ</span>
        <span class="v2p-gauge-segs">${segs}</span>
        <span class="v2p-gauge-num v2-disp">${revealed ? '読切' : `${state.zazazo || 0}/${zMax}`}</span>
      `;
      gaugeBox.style.display = '';
      gaugeBox.classList.toggle('is-revealed', revealed);
    }
  }

  // v2：相手の舞台演出（顔アップカットイン優先／無ければ全身立ち絵にフォールバック）
  const stageEl = root.querySelector('[data-bind="psychOpponentStage"]');
  if (stageEl) {
    if (isLecture) {
      stageEl.style.display = 'none';
    } else {
      const imgKey = state.opponentImgKey || 'polka';
      const oppName = state.opponentName || '相手';
      stageEl.style.display = '';
      stageEl.className = 'v2p-opponent-stage character-frame v2p-mode-cutin';
      stageEl.innerHTML = `<img class="v2p-stage-img" src="assets/characters/${imgKey}_cutin_panic.webp" alt="${oppName}" onerror="window.psychStageFallback(this,'${imgKey}')">`;
    }
  }

  const choicesEl = root.querySelector('[data-bind="psychChoices"]');
  shuffled.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.choiceId = c.id;
    btn.innerHTML = `<span class="choice-label">${labels[i]}</span><span class="choice-text">${c.text}</span><span class="choice-arm-hint">もう一度タップで<b>この読みに賭ける</b></span>`;
    // 重みのある選択：1タップ目で構え（他の選択肢が沈む）、2タップ目で確定
    btn.addEventListener('click', () => {
      if (state.lectureMode || state.introHandMode) return resolvePsych(qid, c, btn); // 講義／研修中はテンポ優先で即決
      if (!btn.classList.contains('armed')) {
        choicesEl.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('armed'));
        btn.classList.add('armed');
        choicesEl.classList.add('has-armed');
        mpSfx('tap');
        return;
      }
      choicesEl.classList.remove('has-armed');
      resolvePsych(qid, c, btn);
    });
    choicesEl.appendChild(btn);
  });

  // ぱにゅぱにゅボタン
  const senseBtn = root.querySelector('[data-bind="panyuSenseBtn"]');
  // v4 B4: 初回はゲーム全体で1回無料 ／ panyu_chrono購入時は1バトル1回追加無料
  const gameWideFree = !state.panyuSenseFreeUsed;
  const chronoOwned = save.ownedItems && save.ownedItems.includes('panyu_chrono');
  const chronoFree = chronoOwned && !state.panyuChronoUsedThisBattle;
  const isFree = gameWideFree || chronoFree;
  const freeLabel = gameWideFree ? 'ぱにゅぱにゅ（初回無料）' : 'ぱにゅぱにゅ（クロノ無料）';
  senseBtn.textContent = isFree ? freeLabel : `ぱにゅぱにゅ（${25}消費）`;
  if (!isFree && state.panyu < 25) {
    senseBtn.disabled = true;
    senseBtn.textContent = 'ぱにゅぱにゅ（ゲージ不足）';
  }
  senseBtn.addEventListener('click', () => usePanyuSense(qid, isFree));

  // 性格読み切り後はスキップボタンを表示
  const skipBtn = root.querySelector('[data-bind="psychSkipBtn"]');
  if (skipBtn) {
    if (state.opponentPersonalityRevealed) {
      skipBtn.style.display = '';
      skipBtn.addEventListener('click', () => skipPsychBattle());
    } else {
      skipBtn.style.display = 'none';
    }
  }

  state.psychRoot = root;
  render(); // 背景再描画
  // モーダルは render() で消えるので再追加
  app.appendChild(root);
  // 心理バトルは相手が圧をかけてくる場面 → 相手を「強気」表情に（講義/論理は素の表情）
  if (!isLogic && !isLecture) setOpponentExpression('pressure');
  else setOpponentExpression('default');
}

function usePanyuSense(qid, isFree) {
  if (!state.psychRoot) return;
  const cost = isFree ? 0 : 25;
  if (!isFree && state.panyu < 25) return;
  state.winrateRevealed = true; // v2：このハンドの勝率封印を解く
  // 即時にコスト消費・ボタン無効化（取り消し不可なコミット）
  state.panyu -= cost;
  if (isFree) {
    // 初回ゲーム全体無料 > クロノ無料 の順で消費
    if (!state.panyuSenseFreeUsed) {
      state.panyuSenseFreeUsed = true;
    } else {
      state.panyuChronoUsedThisBattle = true;
    }
  }
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
    // Lv2/Lv3効果：ハズレ選択肢を1〜2個グレーアウト
    const senseLv = save.panyuSkills.senseLevel || 1;
    if (senseLv >= 2 && qid && PSYCH_QUESTIONS[qid] && state.psychRoot) {
      const q = PSYCH_QUESTIONS[qid];
      const removeCount = senseLv >= 3 ? 2 : 1;
      let removed = 0;
      for (let i = 0; i < removeCount; i++) {
        const choices = [...state.psychRoot.querySelectorAll('.choice-btn:not(.disabled-by-sense)')];
        const wrong = choices.find(b => {
          const c = q.choices.find(x => x.id === b.dataset.choiceId);
          return c && !c.correct;
        });
        if (wrong) {
          wrong.classList.add('disabled-by-sense');
          wrong.disabled = true;
          removed++;
        } else break;
      }
      if (removed > 0) {
        toast(senseLv >= 3 ? `ぱにゅぱにゅLv3：ハズレ${removed}つを除外！` : 'ぱにゅぱにゅLv2：ハズレ1つを除外！');
        return;
      }
    }
    toast('ぱにゅぱにゅ発動：相手のゾゾゾ反応を強調！');
  });
}

// ぱにゅぱにゅ背景テーマ
const PANYU_BG_THEMES = [
  { id: 'pink',   label: '🌸 桜風', desc: 'やわらかピンク' },
  { id: 'purple', label: '🌙 夜空', desc: '紫の幻想' },
  { id: 'gold',   label: '✨ 黄金', desc: 'リッチなゴールド' },
  { id: 'aqua',   label: '🐬 水中', desc: '涼しげな水色' },
  { id: 'dark',   label: '⚫ 黒幕', desc: 'シンプルブラック' },
];
function getCurrentPanyuBg() {
  return (save && save.panyuBgTheme) || 'pink';
}
function setPanyuBg(themeId) {
  if (!save) return;
  save.panyuBgTheme = themeId;
  saveProgress();
  const overlay = document.querySelector('.panyu-clicker-overlay');
  if (overlay) applyPanyuBg(overlay);
}
function applyPanyuBg(overlay) {
  PANYU_BG_THEMES.forEach(t => overlay.classList.remove('panyu-bg-' + t.id));
  overlay.classList.add('panyu-bg-' + getCurrentPanyuBg());
}

// ぱにゅぱにゅ30タップミニゲーム
function showPanyuClicker(totalTaps, onComplete) {
  let count = totalTaps;
  let tapped = 0;
  let lastTapTime = 0;
  const overlay = document.createElement('div');
  overlay.className = 'panyu-clicker-overlay';
  applyPanyuBg(overlay);
  // 2つの blob を並べて両手タップ可能に
  const blobTemplate = (id) => `
    <div class="panyu-clicker-blob" id="${id}">
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
  `;
  const bgPicker = PANYU_BG_THEMES.map(t =>
    `<button class="panyu-bg-btn${getCurrentPanyuBg() === t.id ? ' active' : ''}" data-bg="${t.id}" title="${t.desc}">${t.label}</button>`
  ).join('');
  overlay.innerHTML = `
    <div class="panyu-bg-picker">${bgPicker}</div>
    <img class="panyu-bg-char" src="assets/characters/panyu.png" alt=""
         onerror="this.style.display='none'">
    <div class="panyu-clicker-label-top">タップ or ぐりぐり！ <small>両手でOK</small></div>
    <div class="panyu-clicker-pair">
      ${blobTemplate('panyu-blob-l')}
      ${blobTemplate('panyu-blob-r')}
    </div>
    <div class="panyu-combo" data-bind="panyuCombo"></div>
  `;
  document.body.appendChild(overlay);
  const blobs = [...overlay.querySelectorAll('.panyu-clicker-blob')];
  const countEls = [...overlay.querySelectorAll('.panyu-clicker-count')];
  const ringFills = [...overlay.querySelectorAll('.panyu-ring-fill')];
  const comboEl = overlay.querySelector('.panyu-combo');
  let completed = false;

  const updateColor = () => {
    const ratio = tapped / totalTaps;
    // ピンク→赤→ゴールドへ変化
    const hueShift = ratio * 30;  // 0→30度
    blobs.forEach(b => b.style.filter = `hue-rotate(-${hueShift}deg) saturate(${1 + ratio * 0.4})`);
    // プログレスリング更新
    const offset = 289 * (1 - ratio);
    ringFills.forEach(r => r.style.strokeDashoffset = offset);
  };

  const showCombo = (n) => {
    comboEl.textContent = `×${n} COMBO!`;
    comboEl.classList.remove('show');
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
  };

  // === ばね物理によるぷるんぷるん挙動 ===
  // 各 blob に物理状態を持たせ、requestAnimationFrame で連続的に変形
  // タップは「状態に impulse を加える」だけで、アニメをリセットしない
  //   → 連打しても揺れが累積して止まらない、自然なジェル感
  blobs.forEach(b => {
    b.__phys = {
      sx: 1, sy: 1,       // 現在の scale
      vsx: 0, vsy: 0,     // scale 速度
      tx: 0, ty: 0,       // 現在の translate
      vtx: 0, vty: 0,     // translate 速度
      rot: 0, vrot: 0,    // 微小な回転
      sag: 0,             // 重力で沈み込んだ滞在感（遅延減衰）
    };
  });
  const K_SCALE = 0.12;   // ばね定数（戻り強さ）
  const D_SCALE = 0.18;   // 減衰（高いほど早く止まる）
  const K_TRANS = 0.10;
  const D_TRANS = 0.16;
  const K_ROT   = 0.10;
  const D_ROT   = 0.18;
  let physRunning = true;
  const physTick = () => {
    if (!physRunning) return;
    blobs.forEach(b => {
      // ドラッグ中は drag ハンドラが transform を直接制御するのでスキップ
      if (b.classList.contains('dragging') || b.classList.contains('release')) return;
      const p = b.__phys;
      // ばね＋減衰：v += -k*(現在-平衡) - d*v
      p.vsx += -K_SCALE * (p.sx - 1) - D_SCALE * p.vsx;
      p.vsy += -K_SCALE * (p.sy - 1) - D_SCALE * p.vsy;
      p.sx += p.vsx;
      p.sy += p.vsy;
      // 重力 sag：タップで増加し、ゆっくり0へ減衰。ty の平衡を下にずらす効果
      p.vtx += -K_TRANS * p.tx - D_TRANS * p.vtx;
      p.vty += -K_TRANS * (p.ty - p.sag) - D_TRANS * p.vty;
      p.tx += p.vtx;
      p.ty += p.vty;
      p.sag *= 0.94; // 約 0.5s で半減 → ゆっくり浮上
      p.vrot += -K_ROT * p.rot - D_ROT * p.vrot;
      p.rot += p.vrot;
      // 脈動（生命感）：scale で胸の鼓動、translate Y で浮き沈み
      const t = performance.now() / 1000;
      const breath = Math.sin(t * 1.8) * 0.035;   // 縦横呼吸
      const floatY = Math.sin(t * 0.9) * 2.2;     // ふわふわ浮き沈み
      const sx = (p.sx + breath).toFixed(4);
      const sy = (p.sy - breath).toFixed(4);
      const ty = (p.ty + floatY).toFixed(2);
      b.style.transform = `translate(${p.tx.toFixed(2)}px, ${ty}px) rotate(${p.rot.toFixed(2)}deg) scale(${sx}, ${sy})`;
    });
    requestAnimationFrame(physTick);
  };
  requestAnimationFrame(physTick);

  // タップ／ドラッグ中の連続カウント共通処理
  const doTick = (blob, opts = {}) => {
    if (completed) return;
    count--;
    tapped++;
    countEls.forEach(el => el.textContent = Math.max(0, count));
    updateColor();
    if (navigator.vibrate) navigator.vibrate(opts.fromDrag ? 20 : 35);
    const burstN = opts.fromDrag ? 2 : 3;
    for (let i = 0; i < burstN; i++) spawnPanyuParticle(overlay);
    if (tapped === 10) showCombo(10);
    else if (tapped === 20) showCombo(20);
    else if (tapped === 25) showCombo(25);
    if (!opts.skipWobble) {
      // 物理に impulse を加える（押された＝重力で下に沈む）
      const p = blob.__phys;
      p.vty += 8.5;             // 下にどすんと弾む（強め）
      p.vsy -= 0.13;            // 縦にしっかり潰す
      p.vsx += 0.11;            // 横に大きく膨らむ
      p.sag += 14;              // 平衡を 14px ほど下にずらす → 沈み込んで戻る
      p.vrot += (p.rot > 0 ? -1 : 1) * 0.7;
    }
    if (count <= 0) {
      completed = true;
      physRunning = false;
      blobs.forEach(b => b.classList.add('panyu-complete'));
      if (navigator.vibrate) navigator.vibrate([60, 30, 80, 30, 120]);
      for (let i = 0; i < 16; i++) spawnPanyuParticle(overlay);
      const label = overlay.querySelector('.panyu-clicker-label-top');
      if (label) label.innerHTML = '<span class="panyu-burst-text">✨ ぱにゅぱにゅ発動！ ✨</span>';
      setTimeout(() => {
        overlay.remove();
        if (onComplete) onComplete();
      }, 900);
    }
  };
  // 外部（drag）からも呼べるよう公開
  state.__panyuDoTick = doTick;
  // 多重イベント対策：80ms内の連続発火は1回にまとめる
  let lastTapMs = 0;
  const TAP_DEBOUNCE_MS = 80;
  const onTap = (which) => (e) => {
    if (completed) return;
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapMs < TAP_DEBOUNCE_MS) return;
    lastTapMs = now;
    doTick(which);
  };
  blobs.forEach(b => {
    b.addEventListener('click', onTap(b));
    b.addEventListener('touchstart', onTap(b), { passive: false });
    attachDragStretch(b);
  });
  // 背景テーマ切替
  overlay.querySelectorAll('.panyu-bg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.bg;
      setPanyuBg(id);
      overlay.querySelectorAll('.panyu-bg-btn').forEach(b => b.classList.toggle('active', b.dataset.bg === id));
    });
  });
  updateColor();
}

// 引っ張ったらゴム玉のように伸びる演出（＋押しっぱなしで1秒ごとにカウント減）
function attachDragStretch(blob) {
  let startX = 0, startY = 0, active = false, pointerId = null;
  let holdTimer = null;
  let holdArmTimer = null;     // 「ホールド開始」の発火タイマー（猶予期間）
  let movedFar = false;        // 一定以上動いたら「ドラッグ確定」
  const maxDrag = 35;
  const HOLD_ARM_MS = 700;     // タップとホールドの境界：これ以上押し続けたらホールド扱い
  const startHoldTick = () => {
    stopHoldTick();
    holdTimer = setInterval(() => {
      if (!active) { stopHoldTick(); return; } // 念のため二重チェック
      if (typeof state.__panyuDoTick === 'function') {
        state.__panyuDoTick(blob, { skipWobble: true, fromDrag: true });
      }
    }, 1000);
  };
  const stopHoldTick = () => {
    if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
  };
  const stopArm = () => {
    if (holdArmTimer) { clearTimeout(holdArmTimer); holdArmTimer = null; }
  };
  const onDown = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    active = true;
    movedFar = false;
    pointerId = e.pointerId ?? null;
    blob.classList.remove('release');
    // ※ dragging クラスは即追加しない：純粋なタップでは物理を止めない
    if (e.pointerId !== undefined && blob.setPointerCapture) {
      try { blob.setPointerCapture(e.pointerId); } catch (err) {}
    }
    // 即時に hold tick を始めない：HOLD_ARM_MS 押し続けるか、movedFar になってからスタート
    stopArm();
    holdArmTimer = setTimeout(() => {
      if (active) startHoldTick();
    }, HOLD_ARM_MS);
  };
  const onMove = (e) => {
    if (!active) return;
    const pt = e.touches ? e.touches[0] : e;
    let dx = pt.clientX - startX;
    let dy = pt.clientY - startY;
    // 5px以上動いたら「明確なドラッグ」→ホールド扱いに昇格＋dragging クラス付与
    if (!movedFar && Math.hypot(dx, dy) > 5) {
      movedFar = true;
      blob.classList.add('dragging'); // ここで初めて物理を停止して transform を奪う
      stopArm();
      startHoldTick();
    }
    if (!movedFar) return; // タップ範囲内：transform は触らない（物理に任せる）
    // ベクトルを最大値で減衰（ゴム抵抗）
    const dist = Math.hypot(dx, dy);
    if (dist > maxDrag) {
      const k = maxDrag / dist;
      dx *= k; dy *= k;
    }
    // 引っ張り方向に伸びる scale（0.05倍 per maxDrag）
    const stretch = Math.min(dist / maxDrag, 1) * 0.12;
    // 軸に応じて scale 分解
    const ang = Math.atan2(dy, dx);
    const sx = 1 + Math.cos(ang) * Math.cos(ang) * stretch - Math.sin(ang) * Math.sin(ang) * stretch * 0.5;
    const sy = 1 + Math.sin(ang) * Math.sin(ang) * stretch - Math.cos(ang) * Math.cos(ang) * stretch * 0.5;
    blob.style.setProperty('--dx', `${dx.toFixed(1)}px`);
    blob.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    blob.style.setProperty('--ds-x', sx.toFixed(3));
    blob.style.setProperty('--ds-y', sy.toFixed(3));
    blob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  };
  const onUp = (e) => {
    if (!active) return;
    active = false;
    stopArm();
    stopHoldTick();
    const wasDragging = blob.classList.contains('dragging');
    blob.classList.remove('dragging');
    // ドラッグから戻る時のみ、物理状態を現在の transform 値から再開
    if (wasDragging && blob.__phys) {
      const m = (blob.style.transform || '').match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if (m) {
        blob.__phys.tx = parseFloat(m[1]);
        blob.__phys.ty = parseFloat(m[2]);
        blob.__phys.vtx = 0;
        blob.__phys.vty = 0;
      }
      const ms = (blob.style.transform || '').match(/scale\(([-\d.]+),\s*([-\d.]+)\)/);
      if (ms) {
        blob.__phys.sx = parseFloat(ms[1]);
        blob.__phys.sy = parseFloat(ms[2]);
        blob.__phys.vsx = 0;
        blob.__phys.vsy = 0;
      }
      blob.style.transform = '';
    }
    if (pointerId !== null && blob.releasePointerCapture) {
      try { blob.releasePointerCapture(pointerId); } catch (e) {}
    }
    pointerId = null;
  };
  // pointer events で統一（マウス＋タッチを一本化）
  if (window.PointerEvent) {
    blob.addEventListener('pointerdown', onDown);
    blob.addEventListener('pointermove', onMove);
    blob.addEventListener('pointerup', onUp);
    blob.addEventListener('pointercancel', onUp);
    // 安全網：blob 外で離されてもタイマー停止
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  } else {
    blob.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    blob.addEventListener('touchstart', onDown, { passive: true });
    blob.addEventListener('touchmove', onMove, { passive: true });
    blob.addEventListener('touchend', onUp);
    blob.addEventListener('touchcancel', onUp);
  }
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
  // 多重解決ガード＋画面遷移ガード
  if (state.psychResolving) return;
  if (!state.psychRoot || !state.psychRoot.isConnected) return;
  if (state.screen !== 'battle' && !state.lectureMode) return;
  state.psychResolving = true;
  // 全選択肢＆ぱにゅぱにゅを無効化
  state.psychRoot.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  const senseBtnLock = state.psychRoot.querySelector('[data-bind="panyuSenseBtn"]');
  if (senseBtnLock) {
    senseBtnLock.disabled = true;
    if (!senseBtnLock.textContent.includes('✓')) {
      senseBtnLock.textContent = 'ぱにゅぱにゅ（使用不可）';
    }
  }
  const q = PSYCH_QUESTIONS[qid];
  // 動的正解判定：dynamicCorrect 指定時は state.__potOddsBracket 等を見る
  let isCorrect = !!choice.correct;
  if (q.dynamicCorrect && choice.correctIf) {
    if (qid === 'logic_pot_odds_basic') {
      isCorrect = (choice.correctIf === state.__potOddsBracket);
    } else if (qid === 'logic_bluff_catcher') {
      isCorrect = (choice.correctIf === state.__bluffCatchBracket);
    }
  }
  btn.style.borderColor = isCorrect ? 'var(--c-gold-bright)' : 'var(--c-red-bright)';
  // 講義モード：正誤スタンプ演出（CODEX素材。⚡スピード達成時は稲妻スタンプも追加）
  if (state.lectureMode) {
    const st = document.createElement('div');
    st.className = 'lecture-stamp ' + (isCorrect ? 'stamp-correct' : 'stamp-wrong');
    document.body.appendChild(st);
    let sp = null;
    if (isCorrect && state.__lectureQStart && (Date.now() - state.__lectureQStart) <= 10000) {
      sp = document.createElement('div');
      sp.className = 'lecture-stamp stamp-speed';
      document.body.appendChild(sp);
    }
    setTimeout(() => { st.remove(); if (sp) sp.remove(); }, 1400);
  } else {
    // バトル中の心理バトル：判定を即出しせず「カタ…カタ…」と溜めてから発表する
    // （ボール揺れの文法。読み切りが決まる瞬間を作る）
    const face = state.psychRoot && state.psychRoot.querySelector('.v2p-opponent-stage, .bp-avatar');
    // 既に読み切っている（＝手応えがある）ときは揺れを1回に短縮してテンポを保つ
    const shakes = (state.psychSuccessCount || 0) >= 2 ? 1 : 2;
    const shakeMs = 560;
    state.__psychRevealDelay = shakes * shakeMs;
    for (let i = 0; i < shakes; i++) {
      setTimeout(() => {
        if (face) {
          face.classList.remove('psych-tilt');
          void face.offsetWidth;
          face.classList.add('psych-tilt');
        }
        if (isSfxOn()) { _mpSfxScale = sfxVolFloat(); mpTone(180, 0.07, 'square', 0.05); mpTone(150, 0.06, 'square', 0.04, 0.004, 0.03, 90); }
        if (navigator.vibrate) navigator.vibrate(35);
      }, i * shakeMs);
    }
    setTimeout(() => {
      if (face) face.classList.remove('psych-tilt');
      const st = document.createElement('div');
      st.className = 'lecture-stamp psych-stamp ' + (isCorrect ? 'stamp-correct' : 'stamp-wrong');
      document.body.appendChild(st);
      setTimeout(() => st.remove(), 1200);
      mpSfx(isCorrect ? 'win' : 'lose');
      setOpponentExpression(isCorrect ? 'rattled' : 'pleased');
      setMimiExpression(isCorrect ? 'win' : 'sad');
      const mimiEl = document.querySelector('.v2-mimi-frame img');
      if (!isCorrect && mimiEl) mimiEl.classList.add('mimi-down');
      setTimeout(() => {
        const el2 = document.querySelector('.v2-mimi-frame img');
        if (el2) el2.classList.remove('mimi-down');
        if (state.screen === 'battle' && !state.psychPending) setMimiExpression('default');
      }, 2600);
      if (navigator.vibrate) navigator.vibrate(isCorrect ? [40, 30, 60] : 120);
      if (!isCorrect && state.psychRoot) {
        state.psychRoot.classList.add('psych-shake');
        setTimeout(() => state.psychRoot && state.psychRoot.classList.remove('psych-shake'), 450);
      }
    }, state.__psychRevealDelay);
  }

  if (isCorrect) {
    const eff = q.onSuccess;
    state.panyu = Math.min(state.panyuMax, state.panyu + eff.panyu);
    // ミミミゲージ：心理バトル勝利1回ごとに +1（最大3）
    state.zazazo = Math.min(state.zazazoMax, (state.zazazo || 0) + 1);
    state.psychSuccessCount++;
    // ミミミ MAX（3勝）達成 → 相手の性格を読み切り、以後この対戦では心理バトル封印
    if (state.zazazo >= state.zazazoMax && !state.opponentPersonalityRevealed) {
      state.opponentPersonalityRevealed = true;
      unlockAchievement('read_first');
      // 全キャラ読み切り達成チェック
      if (!save.readSetByOpp) save.readSetByOpp = {};
      save.readSetByOpp[state.opponentId] = true;
      const allOpps = ['polka','selina','grano','velvet'];
      if (allOpps.every(o => save.readSetByOpp[o])) unlockAchievement('read_all');
      saveProgress();
      setTimeout(() => showPersonalityRevealBanner(), 600);
    }
    state.mimiThought = `「読めた……！${eff.hint}」`;
    // v2：読み取った「テル」を卓上の付箋として残す
    if (!state.tellTags) state.tellTags = [];
    const rawTell = (q.zazazoHint || '').replace(/^ゾゾゾ反応[：:]\s*/, '').split(/[。．]/)[0];
    const tellText = (rawTell || (eff.hint || '').replace(/[「」。]/g, '')).slice(0, 16);
    if (tellText) state.tellTags.push(tellText);
    state.ricoAdvice = `「${eff.rico}」`;
    // note_range_lv2/3：心理バトル成功時に相手レンジのヒントを追加表示
    const rangeLv = save.panyuSkills?.rangeLevel || 1;
    if (rangeLv >= 2 && state.opponentProfile) {
      const bluffPct = Math.round((state.opponentProfile.bluffTendency || 0) * 100);
      const rangeText = rangeLv >= 3
        ? `📓 相手レンジ：ブラフ確率 約${bluffPct}%`
        : `📓 相手レンジ：${bluffPct >= 55 ? 'ブラフ寄り' : bluffPct <= 30 ? 'バリュー寄り' : '五分五分'}`;
      state.ricoAdvice += `<br><small class="range-hint">${rangeText}</small>`;
    }
    log('psych', { qid, choice: choice.id, success: true });
    // 証拠突きつけ成功でブラフブレイク確定
    if (eff.bluffBreak) triggerBluffBreak();
    else if (state.zazazo >= state.zazazoMax) triggerBluffBreak();
  } else {
    const eff = q.onFail;
    state.panyu = Math.max(0, state.panyu + eff.panyu);
    // 正解の選択肢を強調表示（学習用、dynamicCorrect も考慮）
    const correctChoice = q.choices.find(c => {
      if (q.dynamicCorrect && c.correctIf) {
        if (qid === 'logic_pot_odds_basic') return c.correctIf === state.__potOddsBracket;
        if (qid === 'logic_bluff_catcher')  return c.correctIf === state.__bluffCatchBracket;
      }
      return !!c.correct;
    });
    if (correctChoice && state.psychRoot && state.psychRoot.isConnected) {
      state.psychRoot.querySelectorAll('.choice-btn').forEach(b => {
        if (b.dataset.choiceId === correctChoice.id) {
          b.style.borderColor = 'var(--c-gold-bright)';
          b.style.boxShadow = '0 0 16px rgba(245,215,122,0.7)';
          b.classList.add('correct-reveal');
        }
      });
    }
    state.mimiThought = `「${eff.mimi}」`;
    state.ricoAdvice = `「${eff.rico}　正解は「${correctChoice ? correctChoice.text : ''}」だったよ」`;
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
    setMimiExpression('default'); // P1-3: 心理バトル解決後は表情を戻す
    state.__psychRevealDelay = 0;
    // P2: 3ハンドの初日研修（Hand3「読む」）：正解でも不正解でも進行し、
    // リコの一言のあと自動でコール→ショーダウンへ（プレイヤー操作は挟まない）
    if (state.introHandMode) {
      state.isPlayerTurn = false;
      render();
      const resultPrefix = isCorrect ? '✓ 正解！　' : '✗ 残念……　';
      showRicoCutIn(resultPrefix + state.ricoAdvice.replace(/^「|」$/g, ''), isCorrect, () => introHandAfterPsych());
      return;
    }
    // 講義モード：正解数カウント＋コンボ＆コイン報酬＋次の問題へ（ゲーム化）
    if (state.lectureMode) {
      let rewardMsg = '';
      if (isCorrect) {
        state.lectureCorrect++;
        state.lectureCombo = (state.lectureCombo || 0) + 1;
        // 正解 +5🪙、3コンボ以降さらに +5、10秒以内の早答えでさらに +5（⚡スピード）
        const fast = state.__lectureQStart && (Date.now() - state.__lectureQStart) <= 10000;
        const gain = 5 + (state.lectureCombo >= 3 ? 5 : 0) + (fast ? 5 : 0);
        save.coins += gain;
        state.lectureEarned = (state.lectureEarned || 0) + gain;
        saveProgress();
        const parts = [];
        if (fast) parts.push('⚡スピード');
        if (state.lectureCombo >= 3) parts.push(`🔥${state.lectureCombo}コンボ`);
        rewardMsg = `　${parts.length ? parts.join(' ') + '！ ' : ''}+${gain}🪙`;
      } else {
        state.lectureCombo = 0;
      }
      state.lectureIdx++;
      updateLectureHud();
      const resultPrefix = isCorrect ? '✓ 正解！' + rewardMsg + '　' : '✗ 残念……　';
      showRicoCutIn(resultPrefix + state.ricoAdvice.replace(/^「|」$/g, ''), isCorrect, () => {
        triggerLectureQuestion();
      });
      return;
    }
    state.isPlayerTurn = true;
    render();
    const resultPrefix = isCorrect ? '✓ 正解！　' : '✗ 残念……　';
    const onCutInClose = state.tutorialMode && state.opponentId === 'rico_tutorial' && !state.lectureMode
      ? () => showTutorial('after_psych',
          '心理バトル解決！ぱにゅゲージが回復したね。<br>' +
          'あとはAペアの強さを信じて、<b>「コール」</b>か<b>「1/2ポット」</b>でベットしてみよう。<br>' +
          '私はもう手を引くから、安心していいよ。')
      : null;
    showRicoCutIn(resultPrefix + state.ricoAdvice.replace(/^「|」$/g, ''), isCorrect, onCutInClose);
  }, 700 + (state.__psychRevealDelay || 0));
}

// === ハンドヒストリー モーダル ===
function showHandHistoryModal() {
  const hist = state.handHistory || [];
  const overlay = document.createElement('div');
  overlay.className = 'hand-history-overlay';
  const listHtml = hist.length === 0
    ? `<div class="hh-empty">— まだハンドが終わってません —</div>`
    : hist.slice().reverse().map((h, ridx) => {
        const idx = hist.length - 1 - ridx;
        const last = h.last;
        const winnerIcon = last.winner === 'player' ? '🏆' : last.winner === 'opponent' ? '✗' : '＝';
        const winnerCls  = last.winner === 'player' ? 'hh-win' : last.winner === 'opponent' ? 'hh-lose' : 'hh-draw';
        const reasonText = last.reason === 'showdown' ? `ショーダウン（${last.pEv?.name || '?'} vs ${last.oEv?.name || '?'}）`
                         : last.reason === 'fold' ? 'ミミが降伏'
                         : last.reason === 'opponentFold' ? `${h.opponentName}が降伏`
                         : last.reason;
        return `
          <div class="hh-row ${winnerCls}" data-history-idx="${idx}">
            <div class="hh-row-head">
              <span class="hh-icon">${winnerIcon}</span>
              <span class="hh-handno">Hand ${last.hand}</span>
              <span class="hh-pot">ポット ${last.pot}</span>
            </div>
            <div class="hh-row-detail">${reasonText}</div>
            <button class="btn btn-ghost hh-view-btn">詳細を見る</button>
          </div>
        `;
      }).join('');
  overlay.innerHTML = `
    <div class="hand-history-modal">
      <button class="hh-close" data-action="history-close" title="閉じる">×</button>
      <div class="hh-title">📜 ハンドヒストリー <small>（直近 ${hist.length} 件）</small></div>
      <div class="hh-list">${listHtml}</div>
    </div>
  `;
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', onAction));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelectorAll('.hh-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.hh-row');
      const idx = parseInt(row?.dataset.historyIdx, 10);
      const snap = state.handHistory[idx];
      if (snap) showHandResultBanner(snap);
    });
  });
}

// 心理／論理バトルをスキップ（読み切り後のみ呼ばれる）
function skipPsychBattle() {
  if (state.psychRoot) {
    state.psychRoot.remove();
    state.psychRoot = null;
  }
  setMimiExpression('default'); // P1-3: スキップ時も表情を戻す
  state.psychPending = false;
  state.psychResolved = true; // 同ハンド再発動防止
  state.logicResolvedStreet = true;
  state.isPlayerTurn = true;
  state.mimiThought = '「スキップ……自分で判断しよう」';
  render();
}

// （旧）性格読み切り後の論理バトル：タイトルを見てスキップ／挑むを選べる - 廃止
function showLogicSkipPrompt(qid) {
  const q = PSYCH_QUESTIONS[qid];
  if (!q) {
    // 念のためのフォールバック：プロンプトを出さずに普通に進行
    state.isPlayerTurn = true;
    state.mimiThought = '「次は……ミミのターン」';
    render();
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'logic-skip-overlay';
  const titleText = (q.speech || '').replace(/^【.*?】/, '') || '論理バトル';
  const ruleText = q.rule || '';
  overlay.innerHTML = `
    <div class="ls-modal">
      <div class="ls-tag">📘 論理バトル</div>
      <div class="ls-title">${titleText}</div>
      ${ruleText ? `<div class="ls-rule">テーマ：${ruleText}</div>` : ''}
      <div class="ls-note">性格を読み切ったので、論理バトルは任意にできます</div>
      <div class="ls-buttons">
        <button class="btn btn-ghost ls-btn-skip">スキップ</button>
        <button class="btn btn-primary ls-btn-play">挑む</button>
      </div>
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(overlay);
  const dismiss = () => { overlay.remove(); };
  overlay.querySelector('.ls-btn-skip').addEventListener('click', () => {
    dismiss();
    // スキップしてプレイヤーのターンへ
    state.isPlayerTurn = true;
    state.mimiThought = '「論理バトルはスキップ。自分で考えよう」';
    render();
  });
  overlay.querySelector('.ls-btn-play').addEventListener('click', () => {
    dismiss();
    triggerPsychBattle(qid);
  });
  // 背景クリックでスキップ
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      dismiss();
      state.isPlayerTurn = true;
      state.mimiThought = '「論理バトルはスキップ。自分で考えよう」';
      render();
    }
  });
}

// ミミミMAX：性格読み切りバナー（クリックで閉じる）
function showPersonalityRevealBanner() {
  const banner = document.createElement('div');
  banner.className = 'personality-reveal-banner';
  const p = state.opponentId ? getOpponentPersonality(state.opponentId) : { icon: '?', title: '?', traits: [], exploit: '' };
  banner.innerHTML = `
    <div class="prb-inner">
      <div class="prb-title">🎯 ミミミ MAX！相手の性格を読み切った</div>
      <div class="prb-name">${p.icon} ${p.title}</div>
      <ul class="prb-traits">
        ${p.traits.map(t => `<li>${t}</li>`).join('')}
      </ul>
      <div class="prb-exploit">⚔ 攻略：${p.exploit}</div>
      <div class="prb-note">この対戦の心理バトルは封印されます</div>
      <button class="btn btn-primary prb-close-btn">OK（読み切った）</button>
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(banner);
  // クリックで閉じる：背景タップ・OKボタン両方
  const dismiss = () => {
    banner.classList.add('out');
    setTimeout(() => banner.remove(), 500);
  };
  banner.querySelector('.prb-close-btn').addEventListener('click', dismiss);
  banner.addEventListener('click', (e) => {
    if (e.target === banner) dismiss(); // 背景クリック
  });
  // pointer-events を有効化（クリック受付）
  banner.style.pointerEvents = 'auto';
}

function triggerBluffBreak() {
  state.bluffBreakHappened = true;
  // v4 A3: 発生後ゲージは0にリセット
  state.zazazo = 0;
  // ため（チャージ）→ 一閃 → 断言、の3拍。必殺技はいきなり出さない
  const charge = document.createElement('div');
  charge.className = 'bluff-break-charge';
  document.body.appendChild(charge);
  if (isSfxOn()) { _mpSfxScale = sfxVolFloat(); mpSweep(120, 900, 1.1, 'sawtooth', 0.05); }
  if (navigator.vibrate) navigator.vibrate([50, 80, 50, 80, 120]);
  setTimeout(() => {
    charge.remove();
    if (typeof showRevealBurst === 'function') showRevealBurst();
    const eff = document.createElement('div');
    eff.className = 'bluff-break-effect';
    eff.innerHTML = '<div class="text">ブラフブレイク！</div>';
    document.body.appendChild(eff);
    mpSfx('bigwin');
    setTimeout(() => eff.remove(), 1800);
    // 相手の虚勢が崩れた表情に（差分があるキャラのみ変化・他はdefaultのまま）
    setOpponentExpression('rattled');
    toast(`${state.opponentName || '相手'}の勝負空気が崩れた！`);
  }, 1200);
}

//=============================================================
// 16. ショーダウン → ハンド終了
//=============================================================
function showdown() {
  if (state.introHandMode) return introHandShowdown();
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

  // ── 段階演出：①相手の手札めくり → ②勝ち札ハイライト＋勝敗コール → ③チップ移動 → 結果モーダル ──
  if (typeof dismissCutIn === 'function') dismissCutIn();
  const pot = state.pot;
  const handNoAtStart = state.handNo;
  const alive = () => state.screen === 'battle' && state.handPhase === 'showdown' && state.handNo === handNoAtStart;
  // 接戦（役が近い＋大きなポット）だけ引き延ばす。決着済みのハンドは速く流す
  const T = showdownTiming(pEv, oEv, pot);
  state.handPhase = 'showdown';
  state.isPlayerTurn = false;
  state.opponentSpeech = pick(['「……ショーダウンだね」', '「さあ、見せ合おうか」', '「……オープン」']);
  state.mimiThought = '「……勝負！」';
  render();

  setTimeout(() => {
    if (!alive()) return;
    state.opponentRevealed = true;
    state.__dealSeen.opp = 0;
    state.opponentSpeech = `相手の役：${oEv.name}`;
    mpSfx('flip');
    render();
    if (T.tense) { document.body.classList.add('is-tease-reach'); startTeaseHeartbeat('reach'); }
  }, T.flip);

  setTimeout(() => {
    if (!alive()) return;
    stopTeaseHeartbeat();
    document.body.classList.remove('is-tease-reach');
    const win5 = winner === 'player' ? pEv.bestFive : winner === 'opponent' ? oEv.bestFive : [...pEv.bestFive, ...oEv.bestFive];
    state.sdHighlight = new Set((win5 || []).map(cardKey));
    if (winner === 'player') state.mimiThought = `「${pEv.name}……勝った！」`;
    else if (winner === 'opponent') state.mimiThought = `「${oEv.name}……負けた……」`;
    else state.mimiThought = '「引き分けか……」';
    setMimiExpression(winner === 'player' ? 'win' : winner === 'opponent' ? 'sad' : 'default');
    setOpponentExpression(winner === 'opponent' ? 'pleased' : winner === 'player' ? 'defeat' : 'default');
    render();
    showShowdownCallout(winner, pEv, oEv);
    if (winner === 'player') mpSfx(pot >= 800 ? 'bigwin' : 'hand-win');
    else if (winner === 'opponent') mpSfx('hand-lose');
    else mpSfx('tie');
    if (winner === 'player' && (T.tense || pot >= 600)) { showRevealBurst(); showWinBurst(pot >= 1000); }
    else if (winner === 'player') showWinBurst(false);
  }, T.call);

  setTimeout(() => {
    if (!alive()) return;
    if (winner === 'player') {
      state.playerChips += pot;
      state.mimiThought = `「やった！${pEv.name}で勝った！」`;
      state.handResults.push({ hand: state.handNo, winner: 'player', reason: 'showdown', pot, pEv, oEv });
      flyChips('.bu-pot-physical', '.char-mimi', pot);
      floatText('.char-mimi', `+${pot}`, 'ft-gain');
    } else if (winner === 'opponent') {
      state.opponentChips += pot;
      state.mimiThought = `「うう……${oEv.name}には勝てなかった……」`;
      state.handResults.push({ hand: state.handNo, winner: 'opponent', reason: 'showdown', pot, pEv, oEv });
      flyChips('.bu-pot-physical', '.char-opponent', pot);
      floatText('.char-opponent', `+${pot}`, 'ft-loss');
    } else {
      state.playerChips += Math.floor(pot / 2);
      state.opponentChips += Math.ceil(pot / 2);
      state.mimiThought = '「引き分けだ……」';
      state.handResults.push({ hand: state.handNo, winner: 'split', reason: 'showdown', pot, pEv, oEv });
      flyChips('.bu-pot-physical', '.char-mimi', Math.floor(pot / 2));
      flyChips('.bu-pot-physical', '.char-opponent', Math.ceil(pot / 2));
    }
    state.pot = 0; resetPotChips();
    render();
  }, T.chips);

  setTimeout(() => { if (alive()) endHand(); }, T.end);
}

// ショーダウンの尺：接戦は長く、決着済みは短く（待たせるのは結果の直前だけ）
function showdownTiming(pEv, oEv, pot) {
  const NORMAL = { flip: 550, call: 1500, chips: 2600, end: 3600, tense: false };
  try {
    if (state.introHandMode || state.tutorialMode) return NORMAL;
    if (save && save.tensionFx === false) return NORMAL;
    const rankGap = Math.abs((pEv.rank || 0) - (oEv.rank || 0));
    const atRisk = pot / Math.max(1, state.playerChips + pot); // このハンドで動く資金の比率
    if ((rankGap <= 1 && atRisk >= 0.25) || atRisk >= 0.5) {
      return { flip: 700, call: 2700, chips: 3800, end: 5000, tense: true };
    }
    if (rankGap >= 3 && atRisk < 0.2) {
      return { flip: 400, call: 1100, chips: 1900, end: 2700, tense: false };
    }
  } catch (e) { /* 演出判定の失敗はゲーム進行に影響させない */ }
  return NORMAL;
}

// === 連勝モメンタム演出 ===
// 連勝数に応じた卓上バッジのテキスト/演出tierを決める（2連勝から表示、3連勝以上は派手化）
function streakMomentumInfo(n) {
  if (n >= 5) return { tier: 'big',  text: `🔥✨ ${n}連勝！！！ ✨🔥` };
  if (n >= 3) return { tier: 'fire', text: `🔥 ${n}連勝！！ 🔥` };
  if (n >= 2) return { tier: 'normal', text: `${n}連勝！` };
  return null;
}
// ミミの立ち絵（.char-mimi）付近にポップする連勝バッジ。#stage の再生成に巻き込まれないよう
// document.body に直接 append し、setTimeout で自前削除する。
function showStreakBadge(text, tier) {
  try {
    const anchor = document.querySelector('.char-mimi');
    const el = document.createElement('div');
    el.className = 'streak-badge streak-badge-' + tier;
    el.textContent = text;
    if (typeof juiceScale === 'function') el.style.fontSize = Math.round((tier === 'big' ? 34 : tier === 'fire' ? 28 : 22) * juiceScale()) + 'px';
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      el.style.left = (r.left + r.width / 2) + 'px';
      el.style.top = r.top + 'px';
    } else {
      el.style.left = '50%';
      el.style.top = '28%';
    }
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1650);
  } catch (e) { /* 演出失敗はゲーム進行に影響させない */ }
}

function endHand() {
  if (state.screen !== 'battle') return;
  if (typeof dismissCutIn === 'function') dismissCutIn();
  state.handPhase = 'idle';
  state.opponentSpeech = '';
  // 連勝カウンタ更新
  const last = state.handResults[state.handResults.length - 1];
  if (last) {
    if (last.winner === 'player') {
      state.consecutiveWins = (state.consecutiveWins || 0) + 1;
      // 連勝モメンタム演出：2連勝目から卓上バッジを表示
      const momentum = streakMomentumInfo(state.consecutiveWins);
      if (momentum) {
        showStreakBadge(momentum.text, momentum.tier);
        if (state.consecutiveWins >= 5) mpSfx('bigwin');
        else if (state.consecutiveWins >= 3) mpSfx('milestone');
      }
    } else if (last.winner === 'opponent') {
      const brokenStreak = state.consecutiveWins || 0;
      state.consecutiveWins = 0;
      // 3連勝以上が途切れた時だけ、控えめに「連勝ストップ」を知らせる
      if (brokenStreak >= 3) showStreakBadge('連勝ストップ…', 'stop');
    }
    // P1-3: ハンドの勝敗でミミの表情を切り替え
    setMimiExpression(last.winner === 'player' ? 'win' : last.winner === 'opponent' ? 'sad' : 'default');
    // 相手の表情：相手が勝てば余裕顔、負ければ敗北顔（差分のあるキャラのみ変化）
    setOpponentExpression(last.winner === 'opponent' ? 'pleased' : last.winner === 'player' ? 'defeat' : 'default');
    // ハンド勝敗SFX（ショーダウンは演出内で再生済み）
    if (last.reason !== 'showdown') {
      if (last.winner === 'player') mpSfx('hand-win');
      else if (last.winner === 'opponent') mpSfx('hand-lose');
    }
  }
  // 結果バナー表示
  showHandResultBanner();
}

// === ハンド結果モーダル（リッチ版） ===
function showHandResultBanner(snapshot) {
  // snapshot 指定時はそれを再表示、未指定時はライブの直近結果
  const isReplay = !!snapshot;
  const last = snapshot ? snapshot.last : state.handResults[state.handResults.length - 1];
  if (!last) return isReplay ? null : continueAfterHand();
  // データソース（live vs snapshot）
  const playerHand    = snapshot ? snapshot.playerHand    : state.playerHand;
  const opponentHand  = snapshot ? snapshot.opponentHand  : state.opponentHand;
  const community     = snapshot ? snapshot.community     : state.community;
  const opponentName  = snapshot ? snapshot.opponentName  : state.opponentName;
  const opponentId    = snapshot ? snapshot.opponentId    : state.opponentId;
  const playerChips   = snapshot ? snapshot.playerChips   : state.playerChips;
  const opponentChips = snapshot ? snapshot.opponentChips : state.opponentChips;
  const equityHistory = snapshot ? snapshot.equityHistory : (state.equityHistory || []);

  const tpl = document.createElement('div');
  tpl.className = 'hand-result-overlay' + (isReplay ? ' is-replay' : '');

  // 勝敗テキスト
  let winnerText, winnerClass;
  if (last.winner === 'player')       { winnerText = '🏆 勝利！';   winnerClass = 'win'; }
  else if (last.winner === 'opponent'){ winnerText = '✗ 敗北';      winnerClass = 'lose'; }
  else                                { winnerText = '＝ 引き分け'; winnerClass = 'draw'; }

  // ベスト5枚（ショーダウン時）
  const bestFivePlayer = last.pEv?.bestFive || [];
  const bestFiveOpp    = last.oEv?.bestFive || [];
  const bestFiveWinner = last.winner === 'player' ? bestFivePlayer
    : last.winner === 'opponent' ? bestFiveOpp : bestFivePlayer;

  const cardSpan = (c, highlight) =>
    `<span class="hr-pcard${highlight ? ' hr-pcard-hi' : ''} ${(c.suit==='♥'||c.suit==='♦')?'red':''}">${c.label}${c.suit}</span>`;

  // カードをハイライト判定で描画（bestFive に含まれているかでハイライト）
  const renderHandWithHi = (hand, bestFive) => {
    const set = new Set(bestFive.map(c => c.label + c.suit));
    return hand.map(c => cardSpan(c, set.has(c.label + c.suit))).join('');
  };
  const renderBoardWithHi = (board, bestFive) => {
    const set = new Set(bestFive.map(c => c.label + c.suit));
    return board.map(c => cardSpan(c, set.has(c.label + c.suit))).join('');
  };

  // === 戦況分析：エクイティ推移・特殊判定 ===
  const eq = equityHistory || [];
  const lastEq = eq[eq.length - 1]?.pct;
  const flopEq = eq[0]?.pct;
  const peakEq = eq.length > 0 ? Math.max(...eq.map(e => e.pct)) : null;
  const minEq  = eq.length > 0 ? Math.min(...eq.map(e => e.pct)) : null;

  // === 判定（バッジ＆コメント） ===
  // フォールド時はリアル則に従い、相手の手も「%勝てた」解析もデフォルト非表示。
  // 「見せて？」ボタンを押した時だけ展開する。
  let verdict = null; // { label, desc, cls }
  // フォールド時の「実は勝てた／降りて正解」解析（クリックして開示）
  let foldReveal = null;
  if (last.reason === 'fold' || last.reason === 'opponentFold') {
    foldReveal = {
      eq: lastEq,
      pEvName: last.pEv?.name || '?',
      oEvName: last.oEv?.name || '?',
    };
  }
  if (last.reason === 'showdown' && eq.length >= 2) {
    // バッドビート判定：プレイヤーが70%以上だったのに負けた
    if (peakEq >= 70 && last.winner === 'opponent') {
      verdict = { label: '💀 バッドビート', desc: `ピーク${peakEq}%まで有利だったのに、リバーで逆転負け……`, cls: 'verdict-badbeat' };
    }
    // サックアウト：プレイヤーが30%以下だったのに勝った
    else if (minEq <= 30 && last.winner === 'player') {
      verdict = { label: '✨ サックアウト勝ち', desc: `ピンチ${minEq}%から大逆転！運も実力のうち`, cls: 'verdict-suckout' };
    }
    // クーラー：両者ストレート以上
    else if (last.pEv?.rank >= 4 && last.oEv?.rank >= 4) {
      verdict = { label: '🔥 クーラー', desc: '両者とも強い役だった。避けようがない大勝負', cls: 'verdict-cooler' };
    }
    // ドミネートされて負け：相手の役のほうが上位カテゴリ
    else if (last.winner === 'opponent' && last.oEv && last.pEv && last.oEv.rank > last.pEv.rank + 1) {
      verdict = { label: '⚠ 役負け', desc: `${last.oEv.name}には${last.pEv.name}では届かない`, cls: 'verdict-dominated' };
    }
    // 圧勝
    else if (last.winner === 'player' && lastEq >= 90 && peakEq >= 80) {
      verdict = { label: '🌟 圧勝', desc: '序盤から優位を保って勝ち切った', cls: 'verdict-clean' };
    }
  } else if (last.reason === 'opponentFold' && last.pEv && last.pEv.rank >= 4) {
    // 強役で相手降伏（バッジのみ。「ブラフ成功」判定はリアル則で隠す）
    verdict = { label: '💎 強役で相手降伏', desc: `${last.pEv.name}で押し切った`, cls: 'verdict-clean' };
  }
  // ※「実は%勝てた／降りて正解」は AI 解析として「見せて？」内に格納
  //   → フォールド時のドラマ性を保ちつつ、見たい人には情報提供

  // 決定打：エクイティが最も変化したストリート
  let pivot = null;
  if (eq.length >= 2) {
    let maxDelta = 0;
    for (let i = 1; i < eq.length; i++) {
      const d = Math.abs(eq[i].pct - eq[i-1].pct);
      if (d > maxDelta) { maxDelta = d; pivot = { from: eq[i-1], to: eq[i], delta: d }; }
    }
  }
  const pivotHtml = pivot && pivot.delta >= 15
    ? `<div class="hr-pivot">💡 決定打：<b>${pivot.to.street}</b> で勝率 ${pivot.from.pct}% → <b>${pivot.to.pct}%</b>（${pivot.delta > 0 ? '+' : ''}${pivot.to.pct - pivot.from.pct}）</div>`
    : '<div class="hr-pivot hr-pivot-empty">—</div>';

  // エクイティタイムライン
  const equityTimelineHtml = eq.length > 0
    ? `<div class="hr-equity">
         <div class="hr-equity-title">📈 勝率推移</div>
         <div class="hr-equity-row">
           ${eq.map(e => `<span class="hre-step"><span class="hre-street">${e.street}</span><span class="hre-pct ${e.pct >= 70 ? 'good' : e.pct >= 40 ? 'mid' : 'bad'}">${e.pct}%</span></span>`).join('<span class="hre-arrow">▸</span>')}
         </div>
       </div>`
    : '';

  // ショーダウン詳細
  let showdownHtml = '';
  if (last.reason === 'showdown') {
    showdownHtml = `
      <div class="hr-showdown">
        <div class="hr-player-block hr-${last.winner === 'player' ? 'winner' : last.winner === 'opponent' ? 'loser' : ''}">
          <div class="hr-player-name">ミミ</div>
          <div class="hr-player-hand">${renderHandWithHi(playerHand, bestFivePlayer)}</div>
          <div class="hr-player-eval ${last.winner === 'player' ? 'winning' : ''}">${last.pEv?.name || '-'}</div>
        </div>
        <div class="hr-vs">VS</div>
        <div class="hr-player-block hr-${last.winner === 'opponent' ? 'winner' : last.winner === 'player' ? 'loser' : ''}">
          <div class="hr-player-name">${opponentName}</div>
          <div class="hr-player-hand">${renderHandWithHi(opponentHand, bestFiveOpp)}</div>
          <div class="hr-player-eval ${last.winner === 'opponent' ? 'winning' : ''}">${last.oEv?.name || '-'}</div>
        </div>
      </div>
      <div class="hr-board">
        <div class="hr-board-label">場札</div>
        <div class="hr-board-cards">${renderBoardWithHi(community, bestFiveWinner)}</div>
      </div>
    `;
  } else if (last.reason === 'fold' || last.reason === 'opponentFold') {
    const whoFolded = last.reason === 'fold' ? 'ミミ' : opponentName;
    const whoWon   = last.reason === 'fold' ? opponentName : 'ミミ';
    showdownHtml = `
      <div class="hr-fold-row">
        <div class="hr-fold-msg">😶‍🌫️ ${whoFolded}がフォールド → ${whoWon}がポット獲得</div>
        <div class="hr-fold-muck">
          <span class="hr-muck-card">🂠</span><span class="hr-muck-card">🂠</span>
          <span class="hr-muck-label">伏せて捨てられた手札（mucked）</span>
        </div>
        <button class="btn btn-ghost hr-reveal-btn" id="hr-reveal-btn">👁 見せて？（AI 解析）</button>
        <div class="hr-reveal-panel" id="hr-reveal-panel" style="display:none;">
          <div class="hr-reveal-cards">
            <div class="hr-reveal-block">
              <div class="hr-reveal-label">ミミ</div>
              <div class="hr-reveal-hand">${playerHand.map(c => cardSpan(c, false)).join('')}</div>
              <div class="hr-reveal-eval">${last.pEv?.name || '-'}</div>
            </div>
            <div class="hr-reveal-vs">VS</div>
            <div class="hr-reveal-block">
              <div class="hr-reveal-label">${opponentName}</div>
              <div class="hr-reveal-hand">${opponentHand.map(c => cardSpan(c, false)).join('')}</div>
              <div class="hr-reveal-eval">${last.oEv?.name || '-'}</div>
            </div>
          </div>
          ${community.length > 0 ? `<div class="hr-reveal-board">場札 ${community.map(c => cardSpan(c, false)).join('')}</div>` : ''}
          ${foldReveal && foldReveal.eq !== undefined ? `
            <div class="hr-reveal-analysis">
              <div class="hr-ra-tag">📊 AI解析</div>
              ${last.reason === 'fold'
                ? (foldReveal.eq >= 60
                  ? `<div class="hr-ra-text">⚠ 実は <b>${foldReveal.eq}%</b> 勝てる手でした……降りなくてよかったかも</div>`
                  : foldReveal.eq <= 30
                    ? `<div class="hr-ra-text">✅ 勝率 ${foldReveal.eq}%、降りて正解でした</div>`
                    : `<div class="hr-ra-text">🟡 勝率 ${foldReveal.eq}%、どちらでも妥当</div>`)
                : (foldReveal.eq < 40
                  ? `<div class="hr-ra-text">🎭 本当の勝率は <b>${foldReveal.eq}%</b> だったのに、相手を降ろせた</div>`
                  : `<div class="hr-ra-text">💪 勝率 ${foldReveal.eq}% で相手を降ろした</div>`)}
              <div class="hr-ra-note">※ リアルポーカーではマック（伏せ捨て）された手は見えません</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // キャラセリフ
  let charLine = '';
  if (last.reason === 'fold') {
    const oppLine = snapshot ? (snapshot.opponentFoldLine || '見せたくないけど…まあいいよ') : opponentReactToPlayerFold();
    charLine = `<div class="hr-line hr-line-opp">「${oppLine}」 — ${opponentName}</div>`;
  } else if (last.reason === 'opponentFold') {
    let mimiLine;
    if (last.pEv && last.pEv.rank >= 4) mimiLine = pick(['最強手だったのに……まあいいか', '完成役を見せず読み勝ち']);
    else if (last.pEv && last.pEv.rank >= 2) mimiLine = pick(['降りられた……勝ちは勝ち', 'ふぅ、ヒヤヒヤしたけど取れた']);
    else mimiLine = pick(['ブラフ通った……心臓に悪い', 'うわ、ブラフ成功……']);
    charLine = `<div class="hr-line hr-line-mimi">「${mimiLine}」 — ミミ</div>`;
  } else if (last.reason === 'showdown') {
    let mimiLine;
    if (last.winner === 'player') {
      if (verdict && verdict.cls === 'verdict-suckout') mimiLine = pick(['ラッキー！リバーが神った', 'やったー、降りなくてよかった……']);
      else if (last.pEv && last.pEv.rank >= 5) mimiLine = pick(['完成役で押し切った！', 'これは譲れない']);
      else mimiLine = pick(['勝った！', '読み合い、勝てた', 'ふぅ、取れた']);
    } else if (last.winner === 'opponent') {
      if (verdict && verdict.cls === 'verdict-badbeat') mimiLine = pick(['そんな、まさか……', '優勢だったのに……うう']);
      else mimiLine = pick(['負けた……次は取り返す', '読み外した……', 'うーん、悔しい']);
    } else {
      mimiLine = pick(['引き分けかぁ', 'スプリットね']);
    }
    charLine = `<div class="hr-line hr-line-mimi">「${mimiLine}」 — ミミ</div>`;
  }

  // 強役バッジ
  const strongHand = (last.winner === 'player' && last.pEv && last.pEv.rank >= 4);
  const strongBadge = strongHand
    ? `<div class="hr-strong-badge">✨ ${last.pEv.name} ✨</div>`
    : '';

  // 連勝中バッジ（ライブ表示のみ・1行小さめ）
  const streakBadgeHtml = (!isReplay && last.winner === 'player' && (state.consecutiveWins || 0) >= 2)
    ? `<div class="hr-streak-badge">🔥 ${state.consecutiveWins}連勝中</div>`
    : '';

  // ポット獲得量と残チップ表記
  const potDelta = last.pot;
  const playerChipDeltaText = last.winner === 'player' ? `+${potDelta}` : last.winner === 'opponent' ? `-?` : `+${Math.floor(potDelta/2)}`;

  tpl.innerHTML = `
    <div class="hr-card hr-${winnerClass}">
      <div class="hr-head">
        <span class="hr-handno">Hand ${last.hand}</span>
        ${verdict ? `<span class="hr-verdict ${verdict.cls}">${verdict.label}</span>` : '<span class="hr-verdict hr-verdict-empty">—</span>'}
      </div>
      ${strongBadge}
      <div class="hr-title">${winnerText}</div>
      ${streakBadgeHtml}
      <div class="hr-pot">${
        last.winner === 'player' ? `ポット <b>${potDelta}</b> 獲得 (<span class="hr-pot-plus">+${potDelta}</span>)`
        : last.winner === 'opponent' ? `${opponentName}がポット <b>${potDelta}</b> を獲得 (<span class="hr-pot-minus">−${potDelta}</span>)`
        : `ポット <b>${potDelta}</b> を折半`
      }</div>
      ${verdict ? `<div class="hr-verdict-desc">${verdict.desc}</div>` : ''}
      ${showdownHtml}
      ${equityTimelineHtml}
      ${pivotHtml}
      ${charLine}
      <div class="hr-chips">
        <span>ミミ <b>${playerChips}</b></span>
        <span>${opponentName} <b>${opponentChips}</b></span>
      </div>
      ${isReplay
        ? `<button class="btn btn-primary big" id="continue-hand-btn">閉じる</button>`
        : `<button class="btn btn-primary big" id="continue-hand-btn">${continueButtonLabel()}</button>`}
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(tpl);
  // 履歴保存＋アチーブメント判定（リプレイ時はスキップ）
  if (!isReplay) {
    // playerAllInThisHand 判定：ベットログから推定
    const playerAllInThisHand = (state.logs?.bets || []).some(b => b.actor === 'player' && b.type === 'allin');
    checkHandAchievements(last, { equityHistory: equityHistory, playerAllInThisHand });
    if (!state.handHistory) state.handHistory = [];
    state.handHistory.push({
      last: JSON.parse(JSON.stringify(last)),
      playerHand: playerHand.map(c => ({...c})),
      opponentHand: opponentHand.map(c => ({...c})),
      community: community.map(c => ({...c})),
      opponentName, opponentId,
      playerChips, opponentChips,
      equityHistory: (equityHistory || []).map(e => ({...e})),
      ts: Date.now(),
    });
    if (state.handHistory.length > 20) state.handHistory.shift();
  }
  document.getElementById('continue-hand-btn').addEventListener('click', () => {
    tpl.remove();
    if (!isReplay) continueAfterHand();
  });
  // 「見せて？」ボタン
  const revealBtn = document.getElementById('hr-reveal-btn');
  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      const panel = document.getElementById('hr-reveal-panel');
      if (panel) {
        panel.style.display = 'block';
        // ボタン自体は disable して隠す
        revealBtn.disabled = true;
        revealBtn.textContent = '👁 開示済み';
        revealBtn.style.opacity = '0.5';
      }
    });
  }
  // ショーダウンのカードめくりアニメ
  if (last.reason === 'showdown') {
    setTimeout(() => {
      tpl.querySelectorAll('.hr-pcard').forEach((card, i) => {
        card.style.animation = `hrCardFlip 0.5s ${0.2 + i * 0.12}s ease-out backwards`;
      });
    }, 50);
  }
}

function continueButtonLabel() {
  if (state.playerChips <= 0 || state.opponentChips <= 0 || state.handNo >= state.maxHands) {
    return '対戦結果を見る';
  }
  if (isDominanceMode()) return '⚡ 圧倒モード突入！';
  return `次のハンド (Hand ${state.handNo + 1}) へ`;
}

function continueAfterHand() {
  setMimiExpression('default'); // P1-3: 次のハンドへ進む際は表情をリセット
  if (state.playerChips <= 0 || state.opponentChips <= 0 || state.handNo >= state.maxHands) {
    return endBattle();
  }
  // 圧倒モード判定
  const domMode = isDominanceMode();
  if (domMode && !state.tutorialMode) {
    state.dominanceUsed = true;
    state.dominanceType = domMode;  // 'complete' のみ（comeback は廃止）
    return startDominanceMode();
  }
  state.mimiThought = '「次のハンドだ。集中していこう」';
  render();
}

// 圧倒モード判定：プレイヤー優勢 + 連勝5以上で発動（1戦1回まで）
// ポーカーは累積差で勝つゲームのため、いわゆる「大逆転」は採用しない
function isDominanceMode() {
  if (state.dominanceUsed) return false;
  const initial = OPPONENTS[state.opponentId]?.chips || 1000;
  const wins = state.consecutiveWins || 0;
  const playerAhead = state.playerChips > initial;
  if (playerAhead && wins >= 5) return 'complete';
  return false;
}

// 圧倒モード：派手アクションシーン＋3分岐選択
function startDominanceMode() {
  state.dominanceMode = true;
  showDominanceIntro(() => {
    showDominanceChoiceModal();
  });
}

// 圧倒モードの導入バナー
function showDominanceIntro(onContinue) {
  const overlay = document.createElement('div');
  overlay.className = 'dominance-overlay dominance-intro';
  const titleText = '⚡ 圧倒モード ⚡';
  const subText = `${state.consecutiveWins}連勝！ 完全に流れを掴んだ！`;
  overlay.innerHTML = `
    <div class="dominance-flash"></div>
    <div class="dominance-banner">
      <div class="dominance-text dominance-complete">${titleText}</div>
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
  const overlay = document.createElement('div');
  overlay.className = 'dominance-choice-overlay';
  overlay.innerHTML = `
    <div class="dominance-choice-modal">
      <h2 class="dominance-choice-title">⚡ どう仕留める？</h2>
      <p class="dominance-choice-sub">完勝の決め手を選ぼう</p>
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
  document.body.classList.remove('is-danger'); stopDangerHeartbeat(); // ピンチ演出も画面離脱で必ず解除
  cancelTease(); // 溜め演出も必ず解除
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
    return endTutorial(isFirstTime);
  }
  const won = state.playerChips > state.opponentChips;
  let firstClearForIntermission = false; // 幕間を出すかどうか（勝利かつ初回クリアの時だけ true）
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
    firstClearForIntermission = firstClear;
    if (firstClear) {
      earned += opp.rewardFirst;
      rewards.push(`初回クリア報酬：+${opp.rewardFirst}`);
      save.firstClearRewardClaimed.push(state.opponentId);
    } else {
      // 再戦周回防止：同じ相手に勝つほど報酬が減少（0回:100%/4回:75%/8回:50%/12回:30%/20回+:20%）
      if (!save.rematchWins) save.rematchWins = {};
      const wins = save.rematchWins[state.opponentId] || 0;
      save.rematchWins[state.opponentId] = wins + 1;
      let mult;
      if (wins < 4)       mult = 1.00;
      else if (wins < 8)  mult = 0.75;
      else if (wins < 12) mult = 0.50;
      else if (wins < 20) mult = 0.30;
      else                mult = 0.20;
      const adjusted = Math.max(10, Math.round(opp.rewardRematch * mult));
      earned += adjusted;
      const noteStr = mult < 1.0 ? `（${wins+1}勝目: ${Math.round(mult*100)}%）` : '';
      rewards.push(`再戦勝利報酬：+${adjusted} ${noteStr}`);
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
    // クリア記録（velvet なら endingUnlocked も同時に立つ）
    if (!save.clearedStages.includes(state.opponentId)) {
      markStageCleared(state.opponentId);
      unlockAchievement('first_clear');
    }
    // 圧倒（相手チップ0で勝利）
    if (state.opponentChips <= 0) unlockAchievement('dominate');
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
  // note_bankroll：コイン獲得効率+10%
  if (save.unlockedNotes && save.unlockedNotes.includes('bankroll') && earned > 0) {
    const bonus = Math.floor(earned * 0.1);
    if (bonus > 0) {
      earned += bonus;
      rewards.push(`バンクロール管理ボーナス：+${bonus} (+10%)`);
    }
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
  state.__resultFxDone = false; // リザルト演出：この対戦分は未実行に戻す
  render();

  // 結果反映
  const t = document.querySelector('[data-bind="resultTitle"]');
  if (t) {
    t.textContent = won ? '勝利' : '敗北';
    if (!won) t.classList.add('lose');
  }
  // リザルトの立ち絵：勝てばミミが笑い相手がうなだれる／負ければ逆（差分が無いキャラは default）
  const rs = document.querySelector('.result-screen');
  if (rs) {
    rs.classList.add(won ? 'result-won' : 'result-lost');
    rs.setAttribute('data-rank-watermark', rank); // 背面の巨大ランク透かし文字（CSS attr()で参照）
  }
  const mimiImg = document.querySelector('[data-result-mimi]');
  if (mimiImg) {
    mimiImg.src = `assets/characters/${won ? 'mimi_win' : 'mimi_sad'}.png`;
    mimiImg.onerror = () => { mimiImg.onerror = null; mimiImg.src = 'assets/characters/mimi_default.png'; };
  }
  const oppImg = document.querySelector('[data-result-opp]');
  if (oppImg && state.opponentImgKey) {
    const key = state.opponentImgKey;
    const mood = (OPPONENT_EXPRESSIONS[key] || {})[won ? 'defeat' : 'pleased'];
    oppImg.onerror = () => { oppImg.onerror = null; oppImg.src = `assets/characters/${key}_default.png`; };
    oppImg.src = `assets/characters/${key}_${mood || 'default'}.png`;
  }
  const setText = (k, v) => { const el = document.querySelector(`[data-bind="${k}"]`); if (el) el.textContent = v; };
  setText('rankValue', rank);
  setText('earnedCoins', state.coinsEarned);
  setText('score', score);
  setText('psychSuccess', state.psychSuccessCount);
  setText('bestHand', state.bestHandName);
  setText('bluffBreak', state.bluffBreakHappened ? 'あり' : 'なし');
  // ステージ帯（縦書きタイトルの脇）：STAGE 0N — 相手名（英字表記）
  {
    const stageIdx = STAGE_ORDER.indexOf(state.opponentId);
    const stageNo = stageIdx >= 0 ? String(stageIdx + 1).padStart(2, '0') : '01';
    const enName = (state.opponentImgKey || opp.id || '').toUpperCase();
    setText('resultStageTag', `STAGE ${stageNo} — ${enName}`);
  }
  // ランク判子の色帯：S/SS/A=金（デフォルト）、B=銀、C=銅
  {
    const rankEl = document.querySelector('[data-bind="rankValue"]');
    const emblemWrap = document.querySelector('.rank-emblem-wrap');
    if (rankEl) {
      rankEl.classList.remove('rank-tier-silver', 'rank-tier-bronze');
      if (rank === 'B') rankEl.classList.add('rank-tier-silver');
      else if (rank === 'C') rankEl.classList.add('rank-tier-bronze');
    }
    if (emblemWrap) {
      emblemWrap.classList.remove('tier-silver', 'tier-bronze');
      if (rank === 'B') emblemWrap.classList.add('tier-silver');
      else if (rank === 'C') emblemWrap.classList.add('tier-bronze');
    }
  }
  // コイン内訳チップ：state.rewards（既存の報酬計算そのまま）を短いラベルに整形するだけ
  const chipsEl = document.querySelector('[data-bind="rewardChips"]');
  if (chipsEl) {
    const chipHtml = (state.rewards || []).map(str => {
      const m = str.match(/^(.*?)[：:](.+)$/);
      if (m) {
        const label = m[1].replace(/報酬$/, '');
        return `<span class="v2-chip v2-chip-gold"><span class="reward-chip-label">${label}</span><span class="reward-chip-value">${m[2]}</span></span>`;
      }
      return `<span class="v2-chip v2-chip-gold">${str}</span>`;
    }).join('');
    chipsEl.innerHTML = chipHtml;
  }
  const r = document.querySelector('[data-bind="resultReason"]');
  if (r) {
    r.innerHTML = '<strong>スコア内訳：</strong><br>' +
      (reasons.length ? reasons.join(' / ') : '加点なし') +
      '<br><br><strong>獲得報酬：</strong><br>' +
      (state.rewards && state.rewards.length ? state.rewards.join('<br>') : 'なし');
  }
  // 次の目標（統計の下に1行）：既存の解放ルール・クリア記録をそのまま読むだけ
  const statsBox = document.querySelector('.result-stats');
  if (statsBox) {
    const goalLine = document.createElement('div');
    goalLine.className = 'result-next-goal';
    goalLine.textContent = nextGoalText();
    statsBox.insertAdjacentElement('afterend', goalLine);
  }

  // 主ボタン：次に挑戦できるステージが解放されていればそのステージへ直行、無ければロビーへ
  // （ヴェルベット勝利時は直後の分岐でエンディングボタンに上書きされる）
  // 勝利かつ初回クリアの時だけ、主ボタンを「幕間へ」に差し替える（2回目以降は通常どおり即座に組み立てる）
  {
    const btns = document.querySelector('[data-bind="resultButtons"]');
    if (btns && !won && state.opponentId !== 'rico_tutorial') {
      // 敗北：主ボタンは「同じ相手に再挑戦」。悔しさをそのまま次の一手に繋ぐ
      btns.innerHTML = `
          <button class="btn btn-primary result-main-btn" data-action="rematch"><span>${(state.opponentName || '相手').replace(/（.*）/, '')}に再挑戦</span><span>→</span></button>
          <div class="result-sub-buttons">
            <button class="btn btn-secondary" data-action="back-lobby">ロビーへ</button>
          </div>
        `;
      btns.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', onAction));
    } else if (btns) {
      const showIntermissionBtn = won && firstClearForIntermission &&
        state.opponentId !== 'velvet' && !!INTERMISSIONS[state.opponentId];
      if (showIntermissionBtn) {
        btns.innerHTML = `
          <button class="btn btn-primary result-main-btn" data-action="go-intermission" data-opponent="${state.opponentId}"><span>幕間へ</span><span>→</span></button>
        `;
        btns.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', onAction));
      } else {
        renderWonResultButtons();
      }
    }
  }

  // ヴェルベット勝利 → エンディングへ進むボタン追加 + 闘札大逆転演出 + 降伏セリフ
  if (won && state.opponentId === 'velvet') {
    save.endingUnlocked = true;
    saveProgress();
    // ヴェルベットの降伏台詞をリザルトに表示
    const concession = pick([
      'ふぅ……侮っていたわね。見どころがあるじゃない',
      '新人が……まさか、私を追い詰めるなんて',
      'いいわ、あなたの勝ち。その目、覚えておく',
      '面白い夜だったわ。私の負けを認めてあげる',
      '……ふふ、敗北の味、久しぶり。悪くないわね',
    ]);
    setTimeout(() => {
      const reasonEl = document.querySelector('[data-bind="resultReason"]');
      if (reasonEl) {
        reasonEl.innerHTML = `<div class="velvet-concession">💋 ヴェルベット：「${concession}」</div>` + reasonEl.innerHTML;
      }
    }, 300);
    triggerVelvetVictoryEffect();
    const btns = document.querySelector('[data-bind="resultButtons"]');
    if (btns) {
      btns.innerHTML = `
        <button class="btn btn-primary result-main-btn" data-action="go-ending"><span>✨ エンディングへ ✨</span></button>
        <div class="result-sub-buttons">
          <button class="btn btn-secondary" data-action="back-lobby">ロビーへ</button>
        </div>
      `;
      // 動的に追加したボタンを再バインド
      btns.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', onAction));
    }
  }

  // リザルト演出（段階表示・コインカウントアップ・ランクスタンプ）
  // → 全ての表示内容（ヴェルベット特殊分岐含む）が確定した最後にだけ起動する
  startResultFx();
}

// 勝利リザルトの主ボタン群（次ステージ／再戦／ロビー）のHTMLを組み立てる。
// 幕間から戻った直後にも使うため、endBattle() 本体から独立させてある（ロジックは元のまま）。
function wonResultButtonsHtml(opponentId) {
  const curIdx = STAGE_ORDER.indexOf(opponentId);
  const after = STAGE_ORDER.slice(curIdx + 1);
  const pickFrom = (list) => list.find(sid => isStageUnlocked(sid) && !save.clearedStages.includes(sid));
  const nextId = pickFrom(after) || pickFrom(STAGE_ORDER) || null;
  if (nextId) {
    const nOpp = OPPONENTS[nextId];
    return `
      <button class="btn btn-primary result-main-btn" data-action="battle-start" data-opponent="${nextId}"><span>${nOpp.name}に挑戦</span><span>→</span></button>
      <div class="result-sub-buttons">
        <button class="btn btn-secondary" data-action="rematch">再戦</button>
        <button class="btn btn-secondary" data-action="back-lobby">ロビーへ</button>
      </div>
    `;
  }
  return `
    <button class="btn btn-primary result-main-btn" data-action="back-lobby"><span>ロビーへ</span></button>
    <div class="result-sub-buttons">
      <button class="btn btn-secondary" data-action="rematch">再戦</button>
    </div>
  `;
}
// [data-bind="resultButtons"] に通常の勝利ボタン群を描画し、data-action を再バインドする
function renderWonResultButtons() {
  const btns = document.querySelector('[data-bind="resultButtons"]');
  if (!btns) return;
  btns.innerHTML = wonResultButtonsHtml(state.opponentId);
  btns.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', onAction));
}

// 次に挑戦すべきステージ名を1行で返す（解放ルール／クリア記録は既存関数をそのまま読むだけ）
function nextGoalText() {
  // 今の相手より「先」の未クリアを優先（ポルカに勝った直後に「リコ先輩に挑戦」と出ないように）
  const curIdx = STAGE_ORDER.indexOf(state.opponentId);
  const after = STAGE_ORDER.slice(curIdx + 1);
  const pickFrom = (list) => list.find(sid => isStageUnlocked(sid) && !save.clearedStages.includes(sid));
  const nextId = pickFrom(after) || pickFrom(STAGE_ORDER);
  if (state.resultWon === false && state.opponentId !== 'rico_tutorial') {
    return `次の目標：${(state.opponentName || '相手').replace(/（.*）/, '')}にリベンジ`;
  }
  if (nextId) {
    const opp = OPPONENTS[nextId];
    return `次の目標：${opp.name}に挑戦`;
  }
  return '全ステージ制覇！再戦でSランクを狙おう';
}

// リザルト画面の「ご褒美感」演出をまとめて起動する。
// render() は他の画面遷移からも呼ばれるため、state.__resultFxDone フラグで
// 「result 画面になった直後の1回」だけ実行されるようにガードする
// （フラグ自体は endBattle() が新しい対戦結果ごとに false へ戻す）。
function startResultFx() {
  if (state.__resultFxDone) return;
  state.__resultFxDone = true;
  const root = document.querySelector('.result-screen');
  if (!root) return;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 1) 段階表示：タイトル→ランク→統計行→次の目標→報酬理由→ボタンの順にフェード/スライドイン
  const revealTargets = [];
  const titleEl = root.querySelector('[data-bind="resultTitle"]');
  const rankBox = root.querySelector('.rank-display');
  const coinsBox = root.querySelector('.coins-block');
  const stageTagEl = root.querySelector('.result-stage-tag');
  if (stageTagEl) revealTargets.push(stageTagEl);
  if (titleEl) revealTargets.push(titleEl);
  if (rankBox) revealTargets.push(rankBox);
  if (coinsBox) revealTargets.push(coinsBox);
  root.querySelectorAll('.result-stats > div').forEach(row => revealTargets.push(row));
  const nextGoalEl = root.querySelector('.result-next-goal');
  if (nextGoalEl) revealTargets.push(nextGoalEl);
  const reasonEl = root.querySelector('[data-bind="resultReason"]');
  if (reasonEl) revealTargets.push(reasonEl);
  const btnsEl = root.querySelector('[data-bind="resultButtons"]');
  if (btnsEl) revealTargets.push(btnsEl);
  const rankBoxIndex = rankBox ? revealTargets.indexOf(rankBox) : -1;
  revealTargets.forEach((el, i) => {
    el.style.setProperty('--i', i);
    el.classList.add('result-reveal');
  });

  // 2) ランクのスタンプ演出＋結果SFX（rankValue が表示される瞬間に判子のように着地）
  const rankEl = root.querySelector('[data-bind="rankValue"]');
  if (rankEl) {
    const rankText = (rankEl.textContent || '').trim();
    const isTopRank = rankText === 'S' || rankText === 'SS';
    rankEl.style.setProperty('--i', rankBoxIndex >= 0 ? rankBoxIndex : 1);
    rankEl.classList.add('rank-stamp');
    if (isTopRank) rankEl.classList.add('rank-stamp-gold');
    const sfxDelay = reduceMotion ? 0 : (rankBoxIndex >= 0 ? rankBoxIndex : 1) * 120 + 260;
    setTimeout(() => {
      if (state.resultWon) {
        mpSfx(isTopRank ? 'royal' : 'bigwin');
      } else {
        mpSfx('lose');
      }
    }, sfxDelay);
  }

  // 3) 獲得コインのカウントアップ（約0.8秒でイーズアウト、途中で最大6回タップ音）
  const coinEl = root.querySelector('[data-bind="earnedCoins"]');
  if (coinEl) {
    const target = Math.max(0, Math.round(state.coinsEarned || 0));
    if (reduceMotion || target === 0) {
      coinEl.textContent = target;
    } else {
      coinEl.textContent = '0';
      animateCoinCountUp(coinEl, target);
    }
  }
}

// requestAnimationFrame でイーズアウトしながら 0→target をカウントアップし、
// 節目ごとに mpSfx('tap') を（最大6回まで）鳴らす
function animateCoinCountUp(el, target) {
  const duration = 800;
  const maxTicks = 6;
  let ticksPlayed = 0;
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(target * eased);
    el.textContent = val;
    const expectedTicks = Math.min(maxTicks, Math.floor(eased * maxTicks));
    if (expectedTicks > ticksPlayed) {
      ticksPlayed = expectedTicks;
      mpSfx('tap');
    }
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = target;
    }
  }
  requestAnimationFrame(tick);
}

// ヴェルベット撃破時の勝利演出（「逆転」表現を排除：ポーカーは累積で勝つゲーム）
function triggerVelvetVictoryEffect() {
  const eff = document.createElement('div');
  eff.className = 'tousatsu-effect';
  eff.innerHTML = `
    <div class="tousatsu-glow"></div>
    <div class="tousatsu-text">闘札<br>制覇</div>
    <div class="tousatsu-sub">— ラビリンスの女王、陥落 —</div>
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

// 講義中の常設 進捗HUD（章・正解・コンボ・獲得コイン）— 講義のゲーム化
function updateLectureHud() {
  let hud = document.getElementById('lecture-hud');
  if (!state.lectureMode) { if (hud) hud.remove(); return; }
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'lecture-hud';
    hud.className = 'lecture-hud';
    document.getElementById('app').appendChild(hud);
  }
  const total = state.lectureTotal || LESSON_ORDER.length;
  const done = Math.min(state.lectureIdx, total);
  const pct = Math.round((done / total) * 100);
  const combo = state.lectureCombo || 0;
  hud.innerHTML = `
    <div class="lh-bar"><div class="lh-fill" style="width:${pct}%"></div></div>
    <div class="lh-stats">
      <span>📚 ${done}/${total}問</span>
      <span>⭐ ${state.lectureCorrect || 0}</span>
      ${combo >= 2 ? `<span class="lh-combo">🔥${combo}</span>` : ''}
      <span>💰 +${state.lectureEarned || 0}</span>
    </div>
  `;
}

// 現在のコースに応じた出題順を返す（⚡ライトコース＝1章・2章・5章のみ）
function lectureOrder() {
  if (state && state.lectureLite) {
    return LESSON_CHAPTERS.filter(c => c.key === 1 || c.key === 2 || c.key === 5).flatMap(c => c.ids);
  }
  return LESSON_ORDER;
}

function startLecture(opponentId) {
  state = defaultState();
  state.opponentId = opponentId;
  const opp = OPPONENTS[opponentId];
  state.opponentName = opp.name;
  state.opponentImgKey = opp.imgKey;
  state.lectureMode = true;
  // 中断進捗があれば引き継ぎ（コース種別も復元）
  const saved = save.lectureProgress || null;
  state.lectureLite = saved ? !!saved.lite : false;
  state.lectureIdx = saved ? saved.idx : 0;
  state.lectureCorrect = saved ? saved.correct : 0;
  state.lectureEarned = saved ? (saved.earned || 0) : 0;
  state.lectureTotal = lectureOrder().length;
  state.screen = 'battle';
  state.handPhase = 'lecture';
  state.tutorialMode = true;
  state.ricoAdvice = '「ようこそ。じっくり基礎を覚えていこ〜」';
  state.mimiThought = saved ? '「続きから……お願いします！」' : '「リコ先輩、よろしくお願いします！」';
  state.lectureCombo = 0; // コンボは再開時リセット（earned は saved から復元済み）
  render();
  updateLectureHud();
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
      <p style="font-size:17px;line-height:1.8;">よろしく〜！ ミミに <b>ポーカーの基本</b> を教えるね。コースを選んで！</p>
      ${savedProgress ? '' : `
      <div style="display:flex;flex-direction:column;gap:8px;margin:6px 0 10px;">
        <div style="background:rgba(245,215,122,0.12);border:1px solid var(--c-gold);border-radius:10px;padding:10px 14px;text-align:left;">
          <b style="color:var(--c-gold-bright);">⚡ ライトコース（おすすめ）</b><br>
          <small>基本ルール・用語・役の強さの<b>3章9問だけ</b>。5分で実戦へ！<br>
          正解ごとに🪙、早答えでさらにボーナス。残りの章は後からいつでも受講OK</small>
        </div>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px 14px;text-align:left;">
          <b>📚 フルコース</b><br>
          <small>全 <b>11章／${LESSON_ORDER.length}問</b>。確率・定石・心理戦・用語集・実戦ハンズオン・マナーまで完全網羅</small>
        </div>
      </div>`}
      <p style="font-size:13px;color:var(--c-red);line-height:1.6;">
        ※ 各章の開始時に「始める／スキップ／中断」が選べる ※ 間違えてもOK
      </p>
      <div class="tutorial-actions">
        ${savedProgress
          ? `<button class="next-btn" type="button">▶ 続ける</button>
             <button class="restart-btn" type="button">最初からやり直す</button>`
          : `<button class="lite-btn next-btn" type="button">⚡ ライトコースで始める</button>
             <button class="full-btn" type="button">📚 フルコースで始める</button>`}
        <button class="skip-btn" type="button">全スキップ</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 続きから（保存済み進捗あり）
  const nextBtn = overlay.querySelector('.next-btn');
  if (savedProgress && nextBtn) {
    nextBtn.addEventListener('click', () => { overlay.remove(); onContinue(); });
  }
  // ⚡ライトコース（新規時：next-btn を兼ねる）
  const liteBtn = overlay.querySelector('.lite-btn');
  if (!savedProgress && liteBtn) {
    liteBtn.addEventListener('click', () => {
      state.lectureLite = true;
      state.lectureTotal = lectureOrder().length;
      overlay.remove();
      onContinue();
    });
  }
  // 📚フルコース
  const fullBtn = overlay.querySelector('.full-btn');
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      state.lectureLite = false;
      state.lectureTotal = lectureOrder().length;
      overlay.remove();
      onContinue();
    });
  }
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

// 章ごとのハンズオン演習：章のキー → 演習データ
// 「2章ごとに体験を挟む」ことで知識→実戦→知識のサンドイッチに
const HANDS_ON_AFTER = {
  2: {
    title: '実戦演習①：チェックかベットか',
    situation: 'プリフロップ後、場札 <b>K♦ 8♣ 3♥</b>。<br>あなたの手札 <b>A♠ K♠</b>（トップペア・キッカーA）。<br>相手はチェック。あなたの番。',
    choices: [
      { text: '🎯 ベットして主導権を取る', correct: true, hint: 'Kペアでキッカー最強。ベットでバリュー回収＋ドロー潰し' },
      { text: '🛡 こちらもチェックして次の場札を見る', correct: false, hint: 'もったいない！強い手はベットして稼ぐのが基本' },
      { text: '❌ フォールド', correct: false, hint: 'なんで！？ Kペアは強い手です' },
    ],
  },
  4: {
    title: '実戦演習②：相手の大ベットへの対応',
    situation: '場札 <b>Q♣ 9♣ 5♦ 2♠</b>。<br>あなたの手札 <b>9♥ 9♦</b>（セット）。<br>相手がポット級の大ベットを撃ってきた。',
    choices: [
      { text: '🚀 レイズ返し（バリュー最大化）', correct: true, hint: 'セット完成は超強い。相手の大ベットを利用してさらに乗せる' },
      { text: '✅ コールしてリバーを見る', correct: false, hint: '悪くないが、フラッシュやストレートが完成する前に決着つけるべき' },
      { text: '⚠ フォールド', correct: false, hint: 'セットを捨てるのはもったいない！' },
    ],
  },
  6: {
    title: '実戦演習③：ブラフの読み合い',
    situation: 'リバー：場札 <b>J♦ 7♣ 4♥ 2♠ 8♣</b>。<br>あなたの手札 <b>10♠ 10♦</b>（オーバーペア）。<br>相手がいきなり ＜オールイン＞。<br>相手は普段ブラフが多い性格。',
    choices: [
      { text: '🦸 ヒーローコール（ブラフ捕獲狙い）', correct: true, hint: 'ブラフ多めな相手＋自分のオーバーペア。+EVなコール' },
      { text: '🛡 安全にフォールド', correct: false, hint: '間違いではないが、ブラフ多発派にはコールが+EV' },
    ],
  },
};

function triggerLectureQuestion() {
  // HUD を毎問更新（render() で消えても復活させる）
  setTimeout(() => updateLectureHud(), 50);
  const order = lectureOrder(); // ⚡ライトコース対応：コース別の出題順
  if (state.lectureIdx >= order.length) {
    finishLecture(false);
    return;
  }
  const qid = order[state.lectureIdx];
  const q = PSYCH_QUESTIONS[qid];
  if (!q) {
    state.lectureIdx++;
    return triggerLectureQuestion();
  }
  // 章タイトルが変わるタイミングで章バナーを表示
  const prevChapter = state.lectureIdx > 0 ? PSYCH_QUESTIONS[order[state.lectureIdx - 1]]?.chapter : null;
  if (q.chapter !== prevChapter) {
    // 前の章が終わった瞬間にハンズオン演習を挿入（同じ演習は1回だけ）
    if (typeof prevChapter === 'number' && HANDS_ON_AFTER[prevChapter]) {
      if (!state.lectureHandsOnDone) state.lectureHandsOnDone = {};
      if (!state.lectureHandsOnDone[prevChapter]) {
        state.lectureHandsOnDone[prevChapter] = true;
        return showHandsOnExercise(HANDS_ON_AFTER[prevChapter], () => triggerLectureQuestion());
      }
    }
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

// ハンズオン演習モーダル（章の区切り）
function showHandsOnExercise(ex, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'hands-on-overlay';
  overlay.innerHTML = `
    <div class="ho-modal">
      <div class="ho-tag">✋ ハンズオン演習</div>
      <h2 class="ho-title">${ex.title}</h2>
      <div class="ho-situation">${ex.situation}</div>
      <div class="ho-prompt">あなたならどうする？</div>
      <div class="ho-choices"></div>
      <div class="ho-feedback" style="display:none;"></div>
      <div class="ho-actions" style="display:none;">
        <button class="btn btn-primary ho-next">▶ 講義に戻る</button>
      </div>
    </div>
  `;
  (document.getElementById('stage') || document.body).appendChild(overlay);
  const choicesEl = overlay.querySelector('.ho-choices');
  const feedbackEl = overlay.querySelector('.ho-feedback');
  const actionsEl = overlay.querySelector('.ho-actions');
  ex.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'ho-choice-btn';
    btn.innerHTML = c.text;
    btn.addEventListener('click', () => {
      // 全ボタン無効化＋正解／不正解で色付け
      choicesEl.querySelectorAll('.ho-choice-btn').forEach((b, j) => {
        b.disabled = true;
        const ch = ex.choices[j];
        if (ch.correct) b.classList.add('correct');
        if (j === i && !ch.correct) b.classList.add('wrong');
      });
      // フィードバック
      feedbackEl.innerHTML = `
        <div class="ho-result ${c.correct ? 'good' : 'bad'}">${c.correct ? '⭕ 正解！' : '❌ もう一度考えよう'}</div>
        <div class="ho-hint">${c.hint}</div>
      `;
      feedbackEl.style.display = '';
      actionsEl.style.display = '';
    });
    choicesEl.appendChild(btn);
  });
  overlay.querySelector('.ho-next').addEventListener('click', () => {
    overlay.remove();
    onClose();
  });
}

function exitLectureMidway() {
  // 進捗を保存して中断（コース種別も保存）
  save.lectureProgress = { idx: state.lectureIdx, correct: state.lectureCorrect, earned: state.lectureEarned || 0, lite: !!state.lectureLite };
  saveProgress();
  state = defaultState();
  state.screen = 'lobby';
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
  // ⚡スピードボーナス計測開始＋10秒カウントダウンバーをモーダルに注入
  state.__lectureQStart = Date.now();
  setTimeout(() => {
    const modal = document.querySelector('.psych-modal');
    if (!modal || modal.querySelector('.lecture-speed-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'lecture-speed-bar';
    bar.innerHTML = '<div class="lsb-label">⚡ 10秒以内で +5🪙</div><div class="lsb-track"><div class="lsb-fill"></div></div>';
    const title = modal.querySelector('.psych-title');
    if (title) title.insertAdjacentElement('afterend', bar);
    else modal.prepend(bar);
    // 10秒経過でバーをそっと消す（減点はなし＝プレッシャーは軽く）
    setTimeout(() => { bar.classList.add('lsb-expired'); }, 10000);
  }, 120);
}

function finishLecture(skipped) {
  document.getElementById('lecture-hud')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  const scorePct = Math.round((state.lectureCorrect / state.lectureTotal) * 100);
  // 成績グレード（ゲーム化：S/A/B/C）＋成績ボーナス
  const grade = scorePct >= 90 ? 'S' : scorePct >= 70 ? 'A' : scorePct >= 50 ? 'B' : 'C';
  const gradeColor = { S: '#ffd700', A: '#f5d77a', B: '#a7d8ff', C: '#cccccc' }[grade];
  const gradeBonus = skipped ? 0 : { S: 200, A: 120, B: 60, C: 20 }[grade];
  const earned = state.lectureEarned || 0;
  overlay.innerHTML = `
    <div class="tutorial-bubble">
      <div class="tutorial-step">講義完了</div>
      <h2 style="color:var(--c-red);font-size:26px;margin:0 0 14px;letter-spacing:0.15em;">📖 講義お疲れさま！</h2>
      ${skipped
        ? '<p style="font-size:17px;">スキップでもOK。実戦で覚えていこ〜</p>'
        : `
        <div style="font-size:64px;font-weight:900;color:${gradeColor};text-shadow:0 0 24px ${gradeColor};margin:4px 0;line-height:1.1;">${grade}</div>
        <p style="font-size:17px;margin:4px 0 10px;">${state.lectureTotal}問中 <b>${state.lectureCorrect}問正解</b>（${scorePct}%）</p>
        <div style="font-size:14px;background:rgba(245,215,122,0.12);border:1px solid rgba(245,215,122,0.4);border-radius:8px;padding:8px 12px;margin-bottom:10px;line-height:1.8;">
          正解報酬：<b>+${earned}🪙</b>（獲得済み）<br>
          成績ボーナス（${grade}）：<b>+${gradeBonus}🪙</b><br>
          初回クリア報酬：<b>+300🪙</b>
        </div>`
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
    // 講義クリア記録＋成績ボーナス＋進捗クリア
    let totalGain = gradeBonus;
    if (!save.firstClearRewardClaimed.includes('rico_tutorial')) {
      totalGain += 300;
      save.firstClearRewardClaimed.push('rico_tutorial');
    }
    save.coins += totalGain;
    if (!save.clearedStages.includes('rico_tutorial')) save.clearedStages.push('rico_tutorial');
    save.lectureProgress = null;
    saveProgress();
    state = defaultState();
    state.screen = 'lobby';
    render();
    toast(`✨ 講義完了！${totalGain > 0 ? ` +${totalGain}コイン` : ''}`);
  });
}

// isFirstClear: rico_tutorial の初回クリアかどうか（endBattle 側の isFirstTime をそのまま受け取る）。
// 初回のみ「次へ」の後に幕間（ポルカへの予告）→ご褒美CG開放を挟んでからロビーへ戻す。再受講時は従来どおり即ロビー。
function endTutorial(isFirstClear) {
  showTutorial('ending',
    '<b>チュートリアル完了！</b><br>' +
    '心理バトルの基本、つかめたかな？<br>' +
    '・<b>ぱにゅゲージ</b>：心理バトル成功で増える。ぱにゅぱにゅで相手の動きが読みやすくなる<br>' +
    '・<b>ゾゾゾゲージ</b>：相手の動揺レベル。MAXで「ブラフブレイク」<br>' +
    '・<b>選択肢シャッフル</b>：心理バトルは毎回順番が変わるから、暗記は通じない<br>' +
    '次は<b>Stage 2「ポルカ」</b>で本番だよ。チップが尽きるまで勝負！',
    () => {
      const goLobbyWithReward = () => {
        // リザルト画面風に表示（簡易：ステージ選択へ戻す）
        state.screen = 'lobby';
        state.coinsEarned = (state.coinsEarned || 0) + 200;
        render();
        toast('チュートリアル報酬：200コイン獲得！');
      };
      if (isFirstClear && INTERMISSIONS.rico_tutorial) {
        showIntermission('rico_tutorial', goLobbyWithReward);
      } else {
        goLobbyWithReward();
      }
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
  const intensity = betSize === 'allin' ? 'cutin-allin' :
                    betSize === 'pot_1' ? 'cutin-pot' :
                    betSize === 'pot_2_3' ? 'cutin-strong' : '';
  // P1-3: 相手のオールイン・大レイズにミミが動揺する表情
  if (betSize === 'allin' || betSize === 'pot_1') setMimiExpression('shock');
  const cut = document.createElement('div');
  cut.className = `rico-cutin opponent-cutin ${intensity}`;
  // v2：画面全体を暗転させ、相手の顔アップ・セリフ帯・額だけを浴びせるカットイン
  if (document.querySelector('.battle-screen.v2')) {
    const amt = state.currentBetOpponent || 0;
    const sizeTag = betSize === 'allin' ? 'ALL IN' : betSize === 'pot_1' ? 'POT' : betSize === 'pot_2_3' ? '2/3 POT' : 'BET';
    const latin = (typeof opponentLatinName === 'function') ? opponentLatinName() : oppName;
    cut.className += ' v2-cutin';
    cut.innerHTML = `
      <div class="v2c-dim"></div>
      <div class="v2c-slash"></div>
      <div class="v2c-art"><img src="assets/characters/${imgKey}_cutin_smug.webp" alt="${oppName}" onerror="this.onerror=null;this.src='assets/characters/${imgKey}_default.png';this.classList.add('v2c-fallback')"></div>
      <div class="v2c-band"><div class="v2c-name v2-disp">${latin}</div><div class="v2c-line">「${text}」</div></div>
      <div class="v2c-amount"><div class="v2-disp v2c-amount-num">${sizeTag} +${amt}</div><div class="v2c-amount-sub">タップで閉じる</div></div>
    `;
    document.body.appendChild(cut);
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return; dismissed = true; activeCutInDismiss = null;
      clearTimeout(autoT); cut.classList.add('cutin-out');
      if (betSize === 'allin' || betSize === 'pot_1') setMimiExpression('default');
      setTimeout(() => cut.remove(), 450);
    };
    const autoT = setTimeout(dismiss, (betSize === 'allin' || betSize === 'pot_1') ? 3200 : 2600);
    cut.addEventListener('click', dismiss);
    activeCutInDismiss = dismiss;
    return;
  }
  // 強度別パーティクル数（allin=多、pot=中、strong=少）
  const sparkles = (betSize === 'allin') ? 8 : (betSize === 'pot_1') ? 5 : 0;
  const sparkleHtml = Array.from({ length: sparkles }, (_, i) =>
    `<span class="cutin-sparkle" style="--d:${i * 0.08}s; --x:${(Math.random() * 80 + 10).toFixed(0)}%; --y:${(Math.random() * 80 + 10).toFixed(0)}%"></span>`
  ).join('');
  cut.innerHTML = `
    <div class="cutin-flash"></div>
    <div class="cutin-portrait">
      <img src="assets/characters/${imgKey}_cutin_smug.webp" alt="${oppName}" onerror="this.onerror=null;this.classList.add('no-cutin-art');this.src='assets/characters/${imgKey}_default.png'">
      ${sparkleHtml}
    </div>
    <div class="cutin-text">
      <div class="cutin-name">${oppName}</div>
      <div class="cutin-line">「${text}」</div>
      <div class="cutin-hint">タップで閉じる</div>
    </div>
  `;
  document.body.appendChild(cut);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    activeCutInDismiss = null;
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    cut.classList.add('cutin-out');
    // P1-3: 動揺表情はカットインが消えたら通常に戻す
    if (betSize === 'allin' || betSize === 'pot_1') setMimiExpression('default');
    setTimeout(() => cut.remove(), 500);
  };
  // 自動消滅：通常 3.5s、オールイン等は 4.5s
  const autoMs = (betSize === 'allin' || betSize === 'pot_1') ? 4500 : 3500;
  const autoDismissTimer = setTimeout(dismiss, autoMs);
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
      <div class="cutin-hint">タップで閉じる</div>
    </div>
  `;
  document.body.appendChild(cut);
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    activeCutInDismiss = null;
    if (autoDismissTimer) clearTimeout(autoDismissTimer);
    cut.classList.add('cutin-out');
    setTimeout(() => cut.remove(), 500);
  };
  const autoDismissTimer = setTimeout(dismiss, 3800);
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
// ★ window の 'resize' イベントは、埋め込みプレビューペインやPWA/一部モバイル環境では
//   ビューポートサイズが変わっても発火しないことがある（実機で確認済みのバグ）。
//   ResizeObserver は要素の実サイズ変化を直接監視するため、resize イベントに依存せず
//   確実にスケールを再計算できる。html要素自体を監視することで取りこぼしを防ぐ。
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => fitStage());
  ro.observe(document.documentElement);
}
// 保険：resize/orientationchange/ResizeObserver いずれも取りこぼした場合に備えて低頻度で再計算
setInterval(fitStage, 1000);
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
  // ── 基本ルール ──
  '🃏 ホールデムは「2枚の手札＋場の5枚」から最強の5枚を作るゲーム',
  '🎴 ロイヤルフラッシュは同じスートのA-K-Q-J-10。出る確率は約65万分の1',
  '🏆 強さ順：ハイカード→ペア→ツーペア→スリーカード→ストレート→フラッシュ→フルハウス→フォーカード→ストレートフラッシュ→ロイヤル',
  '♠ ストレートとフラッシュ、強いのはフラッシュ。覚えづらいけど大事',
  '🎲 同じ役同士はキッカー（一番強い余り札）で勝敗が決まる',

  // ── ポジション ──
  '📍 「ボタン」は最後に動ける位置。情報が集まる王様の席',
  '⚠ 一番不利な席は「アーリーポジション」。最初に動かされる',
  '👑 ポジションが良ければ、弱い手でも勝てる。悪ければ、強い手でも降りる勇気',

  // ── 数学 ──
  '🧮 アウツ × 2 ≒ 次の1枚で完成する確率(%)。フラッシュドロー9枚なら約18%',
  '🧮 アウツ × 4 ≒ ターン＋リバー2枚で完成する確率(%)。9枚なら約36%',
  '💰 「ポットオッズ」＝コール額 ÷ (ポット＋コール額)。完成確率がこれを上回れば「乗る」',
  '📈 オープンエンドストレートドローはアウツ8枚 → 約32%（リバーまで）',

  // ── 心理戦 ──
  '💭 強い時ほど静かに、弱い時ほど派手に振る舞う。逆も真なり',
  '👁 相手のチップ握る手、視線、呼吸——札より雄弁',
  '🎭 「言葉は嘘をつくが、ベットは嘘をつかない」',
  '🤐 自分の手の話をする相手ほど、要警戒',

  // ── ベッティング ──
  '💵 「コンティニュエーションベット（CB）」＝プリフロップで主導権を取った人が、フロップで続けてベット',
  '🎯 ベットサイズは「ポットの 1/2 〜 2/3」が標準的',
  '🚫 オールインは「最後の説得」。降りる選択肢を相手から奪う',
  '⚖ チェックは「弱さ」ではなく「罠」かもしれない',

  // ── 心構え ──
  '🧘 良いハンドでも負けることはある。ポーカーは長期戦',
  '🎯 「役の強さ」より「相手の手のレンジ」を考えるのが上級者',
  '💎 強い手を引いた時こそ、相手から最大限引き出すベットを',
  '🛡 「折るべき場面で折れる強さ」が、勝者の条件',

  // ── 世界観セリフ ──
  '🐰 ミミ：「えへへ、ぱにゅっとした感じで……勝てた、かも」',
  '👩 リコ先輩：「ふぅん、いいわよ。やってみなさい」',
  '💰 グラーノ：「数字は嘘をつかない。お嬢さん、勝算をお持ちですかな？」',
  '🕯 ヴェルベット：「あなたの読み、見せて頂戴」',
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
  // tip rotation：ポーカー豆知識をランダム順で表示（読み応え重視で2.8秒間隔）
  const tipOrder = [...Array(PRELOAD_TIPS.length).keys()].sort(() => Math.random() - 0.5);
  let tipIdx = 0;
  if (tipEl) tipEl.textContent = PRELOAD_TIPS[tipOrder[0]];
  const tipInterval = setInterval(() => {
    tipIdx = (tipIdx + 1) % tipOrder.length;
    if (tipEl) tipEl.textContent = PRELOAD_TIPS[tipOrder[tipIdx]];
  }, 2800);
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
reapplyAllOwnedEffects();

// ショップUIアトラスの存在検知＋スタイルJS注入（CSSキャッシュ回避のため動的注入）
(function detectShopAtlas() {
  const img = new Image();
  img.onload = () => {
    console.log('[atlas] loaded', img.naturalWidth, 'x', img.naturalHeight);
    if (img.naturalWidth >= 256 && img.naturalHeight >= 128) {
      document.body.classList.add('has-shop-atlas');
      console.log('[atlas] body.has-shop-atlas added ✓');
      // JSで直接styleタグを注入：CSSキャッシュ問題を完全回避
      const url = img.src;
      const style = document.createElement('style');
      style.id = 'atlas-injected';
      // 旧アトラスのタブアイコン挿入は撤去。新アトラス（装飾枠）は別途定義。
      style.textContent = `/* shop_atlas.png 検知済 — 装飾枠は新仕様で別途読込 */`;
      document.head.appendChild(style);
      console.log('[atlas] style injected ✓');
    } else {
      console.warn('[atlas] image too small, skipping');
    }
  };
  img.onerror = (e) => {
    console.warn('[atlas] load failed:', img.src, e);
  };
  img.src = 'assets/ui/shop_atlas.png';
})();

startPreload().then(() => {
  render();
  initGlobalAudioBar();
  // 廃止商品の自動返金があれば、起動後に一度だけ通知
  if (save.__pendingRefundNotice) {
    const { total } = save.__pendingRefundNotice;
    delete save.__pendingRefundNotice;
    saveProgress();
    setTimeout(() => {
      toast(`🛍 交換所の商品整理により +${total}コインを返金しました`);
    }, 900);
  }
});
