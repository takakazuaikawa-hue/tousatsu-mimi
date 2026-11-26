// 泥酔の夜（三周目）の土台を game.js・home.js・style.css に入れる（1回だけ流す）。node qa/patch-deisui.mjs
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('qa/out/deisui_script.json', 'utf8'));

function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n'); if (crlf) s = s.replace(/\r\n/g, '\n');
  for (const [a, b, all] of edits) {
    if (!s.includes(a)) throw new Error(file + ' にない: ' + a.slice(0, 80));
    s = all ? s.split(a).join(b) : s.replace(a, b);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s);
}

const K = { rico_tutorial: 'rico', polka: 'polka', selina: 'selina', grano: 'grano', velvet: 'velvet' };
const steps = (rows) => rows.map(r => ({ k: 'say', who: r.who, t: r.t }));
const mid = {}, ims = {}, eps = {}, close = {}, hint = {};
let n = 0;
for (const [id, v] of Object.entries(data)) {
  n++;
  mid[id] = [steps(v.mid1), steps(v.mid2)];
  ims['d_' + id] = { lines: v.ims.map(r => ({ speaker: r.who, text: r.t })), cg: `assets/backgrounds/deisui/${K[id]}_3.jpg` };
  eps[id] = { id: 'deisui_00' + n, no: '泥酔の夜　第' + n + '夜', img: 'assets/ui/home/stage-empty_night.webp', bg: 'bg_vip_room', title: v.title };
  close[id] = v.close;
  hint[id] = v.hint;
}
const J = (o) => JSON.stringify(o, null, 1);

const block = `// ===== 泥酔の夜（三周目、D21）=====
// ほろ酔いの夜の仕組みに重ねる（state.horoyoi も true のまま）。違いは state.deisui で出す。
// 絵がそろうまでは開発中：DEISUI_READY が false の間は、URL に ?deisui=1 か localStorage mp_deisui_dev=1 の時だけ切り替えに出す
const DEISUI_READY = false;
function deisuiDev() { try { return DEISUI_READY || /[?&]deisui=1/.test(location.search) || localStorage.getItem('mp_deisui_dev') === '1'; } catch (e) { return DEISUI_READY; } }
function horoyoiAllCleared() { return !!save && STAGE_ORDER.every(id => (save.horoyoiCleared || []).includes(id)); }
function deisuiOpen() { return deisuiDev() && horoyoiAllCleared(); }
function isDeisui() { return typeof isHoroyoi === 'function' && isHoroyoi() && !!save.deisuiMode && deisuiOpen(); }
// 文案（docs/design-ref/deisui-script.md、11/12 ユーザー承認）から qa/deisui-script-to-js.mjs で作った
const DEISUI_MID_SCENES = ${J(mid)};
const DEISUI_EPISODES = ${J(eps)};
// 勝った時の一言：[強気に攻めた, 慎重に待った, ぼやけた画面で勝った]
const DEISUI_CLOSE = ${J(close)};
// とんでもない賭けの時の心の声（手の強さとは関係なく全部賭けてくる合図）
const DEISUI_HINT = ${J(hint)};
// 報酬は一周目の2倍（11/12 ユーザー）
const DEISUI_REWARD = {
  rico_tutorial: { rewardFirst: 600,  rewardRematch: 300,  rewardSBonus: 200 },
  polka:         { rewardFirst: 1000, rewardRematch: 500,  rewardSBonus: 200 },
  selina:        { rewardFirst: 1400, rewardRematch: 700,  rewardSBonus: 300 },
  grano:         { rewardFirst: 1800, rewardRematch: 900,  rewardSBonus: 400 },
  velvet:        { rewardFirst: 3000, rewardRematch: 1200, rewardSBonus: 600 },
};
// 泥酔のミミの助言・心の声：全部「ふにゃ…」か奇声（数字は出さない）
const DEISUI_GIBBER = ['「ふにゃにゃ……ひっく」', '「うぇへへ……なんだっけ……」', '「ぴょん……ぴょん……」', '「しぇんぱい……おみじゅ……」', '「むにゃ……かーど、ふたつ……みっつ？」', '「ふにゃあああ……」'];
// 勝負の途中の場面は1戦2回（序盤と終盤）。絵は泥酔の一枚絵がそろうまで、ほろ酔いの途中の絵を仮に使う
function deisuiMidDue() {
  if (!state.deisui || state.tutorialMode) return null;
  const id = state.opponentId;
  if (!DEISUI_MID_SCENES[id]) return null;
  if (!state.__dmid1) return state.handNo >= 2 ? 1 : null;
  if (!state.__dmid2) {
    const gain = state.playerChips - (state.handStartChips || state.playerChips);
    const init = state.__initialChips || 1000;
    if (state.handNo >= (state.__dmid1Hand || 0) + 3 && (gain >= init * 0.12 || state.handNo >= (state.__dmid1Hand || 0) + 5)) return 2;
  }
  return null;
}
function showDeisuiMid(which, after) {
  const id = state.opponentId;
  state['__dmid' + which] = true;
  if (which === 1) state.__dmid1Hand = state.handNo || 0;
  if (!save.deisuiMidSeen) save.deisuiMidSeen = [];
  const key = id + ':' + which;
  if (!save.deisuiMidSeen.includes(key)) { save.deisuiMidSeen.push(key); saveProgress(); }
  if (which === 2) state.__hmidShown = true;   // 酔いの段を3段に（泥酔はもともと3段）
  const g0 = battleGen;
  return showStoryScene('dmid' + which + '_' + id, () => { if (g0 === battleGen && state.screen === 'battle') after(); });
}
`;

patch('game.js', [
  // セーブ
  [`  s.horoyoiMode = !!s.horoyoiMode;\n`, `  s.horoyoiMode = !!s.horoyoiMode;\n  if (!Array.isArray(s.deisuiCleared)) s.deisuiCleared = [];   // 泥酔の夜（三周目）の勝ち記録\n  s.deisuiMode = !!s.deisuiMode;\n`],
  // 土台のブロック（ほろ酔いの途中の場面の前）
  [`const HOROYOI_MID_SCENES = {`, block + `const HOROYOI_MID_SCENES = {`],
  // ほろ酔いの途中の場面は泥酔では出さない
  [`  if (!state.horoyoi || state.tutorialMode || state.__hmidShown) return null;`, `  if (!state.horoyoi || state.deisui || state.tutorialMode || state.__hmidShown) return null;`],
  // 途中の場面の会話と仮の絵
  [`const PROLOGUES = {\n`, `const PROLOGUES = {\n  ...Object.fromEntries(Object.entries(DEISUI_MID_SCENES).flatMap(([id, sc]) => [['dmid1_' + id, sc[0]], ['dmid2_' + id, sc[1]]])),\n`],
  [`const STORY_ART = {`, `const STORY_ART = {\n  // 泥酔の夜の途中の場面：一枚絵がそろうまでは、ほろ酔いの途中の絵を仮に使う\n  dmid1_rico_tutorial: 'assets/backgrounds/horoyoi/rico_5.jpg', dmid2_rico_tutorial: 'assets/backgrounds/horoyoi/rico_4.jpg', dmid1_polka: 'assets/backgrounds/horoyoi/polka_5.jpg', dmid2_polka: 'assets/backgrounds/horoyoi/polka_4.jpg', dmid1_selina: 'assets/backgrounds/horoyoi/selina_4.jpg', dmid2_selina: 'assets/backgrounds/horoyoi/selina_5.jpg', dmid1_grano: 'assets/backgrounds/horoyoi/grano_5.jpg', dmid2_grano: 'assets/backgrounds/horoyoi/grano_4.jpg', dmid1_velvet: 'assets/backgrounds/horoyoi/velvet_7.jpg', dmid2_velvet: 'assets/backgrounds/horoyoi/velvet_5.jpg',`],
  // 記録・鍵・報酬を泥酔の時は泥酔の物に
  [`function horoyoiCleared(id) { return !!(save && (save.horoyoiCleared || []).includes(id)); }`, `function horoyoiCleared(id) { return !!(save && ((isDeisui() ? save.deisuiCleared : save.horoyoiCleared) || []).includes(id)); }\nfunction nightReward(id) { return (isDeisui() ? DEISUI_REWARD : HOROYOI_REWARD)[id]; }\nfunction nightName() { return isDeisui() ? '泥酔の夜' : 'ほろ酔いの夜'; }`],
  [`const hKey = (id) => 'h_' + id;`, `const hKey = (id) => (isDeisui() ? 'd_' : 'h_') + id;`],
  [`HOROYOI_REWARD[id].rewardRematch * rematchMult(wins)`, `nightReward(id).rewardRematch * rematchMult(wins)`],
  [`? horoyoiRematchPreview(id) : HOROYOI_REWARD[id].rewardFirst; }`, `? horoyoiRematchPreview(id) : nightReward(id).rewardFirst; }`],
  // 交換所の入荷はほろ酔いの記録のまま
  [`if (stage.startsWith('h:')) return typeof horoyoiCleared === 'function' && horoyoiCleared(stage.slice(2));`, `if (stage.startsWith('h:')) return !!(save && (save.horoyoiCleared || []).includes(stage.slice(2)));`],
  // 対戦の入口
  [`toast(\`ほろ酔いの夜は順番に。先に\${OPPONENTS[p].name}に勝とう\`); return; }`, `toast(\`\${nightName()}は順番に。先に\${OPPONENTS[p].name}に勝とう\`); return; }`],
  [`    let first = !horoyoiCleared(opponentId) && !!HOROYOI_EPISODES[opponentId];`, `    const nightEps = isDeisui() ? DEISUI_EPISODES : HOROYOI_EPISODES;\n    let first = !horoyoiCleared(opponentId) && !!nightEps[opponentId];`],
  [`() => { if (state.screen !== 'lobby') goLobby(); }, HOROYOI_EPISODES[opponentId]); return; }`, `() => { if (state.screen !== 'lobby') goLobby(); }, nightEps[opponentId]); return; }`],
  [`  state.horoyoi = horoyoi;\n`, `  state.horoyoi = horoyoi;\n  state.deisui = horoyoi && isDeisui();\n`],
  // 酔いの段：泥酔は最初から3段
  [`  if (typeof state === 'undefined' || !state || !state.horoyoi || state.tutorialMode) return 0;\n`, `  if (typeof state === 'undefined' || !state || !state.horoyoi || state.tutorialMode) return 0;\n  if (state.deisui) return 3;\n`],
  // 立ち絵
  [`function oppStandSrc(key) { return (state && state.horoyoi && HOROYOI_STAND.has(key)) ?`, `function oppStandSrc(key) { if (state && state.deisui && HOROYOI_STAND.has(key)) return \`assets/characters/\${key}_deisui_stand.webp\`; return (state && state.horoyoi && HOROYOI_STAND.has(key)) ?`],
  // とんでもない賭け（泥酔の事故）：手の強さと関係なく全部賭ける。心の声で理由が分かる
  [`function decideOpponentAction(profile, ctx, opts = {}) {\n`, `function decideOpponentAction(profile, ctx, opts = {}) {\n  if (typeof state !== 'undefined' && state && state.deisui && !opts.forceLargeBet && !ctx.playerAllIn && (ctx.handNo || 0) >= 2 && !state.__crazyThisHand && rand() < 0.14) {\n    state.__crazyThisHand = true;\n    return { type: 'bet', size: 'allin', intent: 'crazy', eq: 0.5 };\n  }\n`],
  [`  state.lastOpponentIntent = action.intent || action.type;\n`, `  state.lastOpponentIntent = action.intent || action.type;\n  if (action.intent === 'crazy' && DEISUI_HINT[state.opponentId]) state.__crazyHint = DEISUI_HINT[state.opponentId];\n`],
  // ハンドの頭：心の声を消し、ぼやける通りを決める
  [`  state.handStartChips = state.playerChips; // このハンドの収支を実額で出すため\n`, `  state.handStartChips = state.playerChips; // このハンドの収支を実額で出すため\n  if (state.deisui) { state.__crazyHint = ''; state.__crazyThisHand = false; state.__blurStreet = (state.handNo >= 2 && rand() < 0.3) ? ['flop', 'turn', 'river'][Math.floor(rand() * 3)] : ''; }\n`],
  // 心の声の欄：とんでもない賭けの合図は崩さずに出す。泥酔の助言は奇声
  [`      case 'mimiThought': el.textContent = state.horoyoi ? drunkBlur(state.mimiThought) : state.mimiThought; break;`, `      case 'mimiThought': el.textContent = (state.deisui && state.__crazyHint) ? state.__crazyHint : state.deisui ? DEISUI_GIBBER[(state.handNo + (state.community || []).length) % DEISUI_GIBBER.length] : state.horoyoi ? drunkBlur(state.mimiThought) : state.mimiThought; break;`],
  [`        if (state.horoyoi) el.textContent = drunkBlur(inner ? state.mimiThought : state.ricoAdvice);`, `        if (state.deisui) el.textContent = state.__crazyHint || DEISUI_GIBBER[(state.handNo * 7 + (state.community || []).length) % DEISUI_GIBBER.length];\n        else if (state.horoyoi) el.textContent = drunkBlur(inner ? state.mimiThought : state.ricoAdvice);`],
  // ミミの画面がぼやける
  [`{ const scr = document.querySelector('.battle-screen.v2'); if (scr) scr.classList.toggle('is-deciding', !!(state.isPlayerTurn && state.handPhase !== 'idle' && state.handPhase !== 'showdown' && !state.psychPending)); }`,
   `{ const scr = document.querySelector('.battle-screen.v2'); if (scr) { scr.classList.toggle('is-deciding', !!(state.isPlayerTurn && state.handPhase !== 'idle' && state.handPhase !== 'showdown' && !state.psychPending));
        const blur = !!(state.deisui && state.isPlayerTurn && state.__blurStreet && state.handPhase === state.__blurStreet);
        scr.classList.toggle('is-deisui-blur', blur);
        if (blur && !scr.querySelector('.deisui-blur-cap')) scr.insertAdjacentHTML('beforeend', '<div class="deisui-blur-cap">（ミミは泥酔している……！）</div>');
        if (blur) state.__blurSeen = true; } }`],
  // 途中の場面：決着した手でも、まだの場面を先に
  [`  if (state.playerChips > 0 && (state.opponentChips <= 0 || state.handNo >= state.maxHands) && state.horoyoi && !state.__hmidShown`, `  if (state.playerChips > 0 && (state.opponentChips <= 0 || state.handNo >= state.maxHands) && state.deisui && DEISUI_MID_SCENES[state.opponentId] && (!state.__dmid1 || !state.__dmid2)) {\n    return showDeisuiMid(state.__dmid1 ? 2 : 1, continueAfterHand);\n  }\n  if (state.playerChips > 0 && (state.opponentChips <= 0 || state.handNo >= state.maxHands) && state.horoyoi && !state.deisui && !state.__hmidShown`],
  [`  // ほろ酔いの夜：勝負の途中の一枚絵と会話（1戦1回）\n`, `  // 泥酔の夜：勝負の途中の一枚絵と会話（1戦2回）\n  const dmid = deisuiMidDue();\n  if (dmid) return showDeisuiMid(dmid, () => { startHand(); announceDrunkTier(); });\n  // ほろ酔いの夜：勝負の途中の一枚絵と会話（1戦1回）\n`],
  // 途中保存
  [`horoyoi: !!state.horoyoi, handsDone:`, `horoyoi: !!state.horoyoi, deisui: !!state.deisui, handsDone:`],
  [`const RESUME_SKIP = new Set(['horoyoi', `, `const RESUME_SKIP = new Set(['horoyoi', 'deisui', '__crazyHint', '__blurStreet', `],
  [`|| !!r.horoyoi !== !!state.horoyoi ||`, `|| !!r.horoyoi !== !!state.horoyoi || !!r.deisui !== !!state.deisui ||`],
  // 報酬と記録
  [`const rewardOpp = state.horoyoi ? HOROYOI_REWARD[state.opponentId]`, `const rewardOpp = state.horoyoi ? (state.deisui ? DEISUI_REWARD : HOROYOI_REWARD)[state.opponentId]`],
  [`      if (!practice && !horoyoiCleared(state.opponentId)) save.horoyoiCleared.push(state.opponentId);\n`, `      if (!practice && !horoyoiCleared(state.opponentId)) (state.deisui ? save.deisuiCleared : save.horoyoiCleared).push(state.opponentId);\n      // 三周目のクリア報酬（5人の写真集・ぱにゃぱにゃ）は絵がそろってから入れる\n      if (!practice && state.deisui && state.opponentId === 'velvet' && STAGE_ORDER.every(horoyoiCleared) && !save.deisuiAllCleared) { save.deisuiAllCleared = true; rewards.push('泥酔の夜を制覇！'); }\n`],
  [`if (!practice && state.opponentId === 'velvet' && STAGE_ORDER.every(horoyoiCleared) && !save.ownedItems.includes('cgset_velvet_book')) {`, `if (!practice && !state.deisui && state.opponentId === 'velvet' && STAGE_ORDER.every(horoyoiCleared) && !save.ownedItems.includes('cgset_velvet_book')) {`],
  // 勝った時の一言
  [`    if (state.resultWon && state.horoyoi && HOROYOI_CLOSE[state.opponentId]) {\n      const kind = state.hWater ? 2 : (state.hAggr || 0) >= (state.hFolds || 0) ? 0 : 1;\n      goalLine.classList.add('is-say');\n      goalLine.innerHTML = \`<b>\${(state.opponentName || '').replace(/（.*）/, '')}</b>「\${HOROYOI_CLOSE[state.opponentId][kind]}」\`;`,
   `    if (state.resultWon && state.horoyoi && (state.deisui ? DEISUI_CLOSE : HOROYOI_CLOSE)[state.opponentId]) {\n      const kind = (state.deisui ? state.__blurSeen : state.hWater) ? 2 : (state.hAggr || 0) >= (state.hFolds || 0) ? 0 : 1;\n      goalLine.classList.add('is-say');\n      goalLine.innerHTML = \`<b>\${(state.opponentName || '').replace(/（.*）/, '')}</b>「\${(state.deisui ? DEISUI_CLOSE : HOROYOI_CLOSE)[state.opponentId][kind]}」\`;`],
  [`  if (state.horoyoi) { const hn = horoyoiNext(); return hn ? \`次の目標：ほろ酔いの\${OPPONENTS[hn].name}に挑戦\` : '次の目標：ほろ酔いの夜、全員制覇。再戦でSを狙おう'; }`,
   `  if (state.horoyoi) { const hn = horoyoiNext(); const nm = state.deisui ? '泥酔' : 'ほろ酔い'; return hn ? \`次の目標：\${nm}の\${OPPONENTS[hn].name}に挑戦\` : \`次の目標：\${nm}の夜、全員制覇。再戦でSを狙おう\`; }`],
  // 幕間：d_ も夜の幕間として扱い、立ち絵は泥酔の物
  [`String(opponentId).startsWith('h_')`, `/^[hd]_/.test(String(opponentId))`, true],
  [`    if (speaker === 'mimi') return { name: 'ミミ', img: faceIconSrc('mimi', nightIms), portrait:`, `    const deisuiIms = String(opponentId).startsWith('d_');\n    if (deisuiIms && speaker === 'mimi') return { name: 'ミミ', img: faceIconSrc('mimi', true), portrait: 'assets/characters/mimi_deisui_stand.webp', side: 'mimi' };\n    if (deisuiIms && speaker === 'rico') return { name: 'リコ先輩', img: faceIconSrc('rico', true), portrait: 'assets/characters/rico_deisui_stand.webp', side: 'rico' };\n    if (speaker === 'mimi') return { name: 'ミミ', img: faceIconSrc('mimi', nightIms), portrait:`],
  [`    const lo = night ? \`assets/characters/\${key}_drunk_stand.webp\` : \`assets/characters/\${key}_default.webp\`;`, `    const lo = (night && deisuiIms) ? \`assets/characters/\${key}_deisui_stand.webp\` : night ? \`assets/characters/\${key}_drunk_stand.webp\` : \`assets/characters/\${key}_default.webp\`;`],
  // 幕間の会話
  [`Object.assign(INTERMISSIONS, {`, `Object.assign(INTERMISSIONS, ${J(ims)});\nObject.assign(INTERMISSIONS, {`],
  // 昼 → ほろ酔い → 泥酔（開いていれば）→ 昼
  [`      save.horoyoiMode = !save.horoyoiMode;\n      saveProgress();\n      if (save.horoyoiMode) { mpSfx('pour'); setTimeout(() => mpSfx('clink'), 1150); }\n      toast(save.horoyoiMode ? 'ほろ酔いの夜へ' : '一周目（昼）に戻りました');`,
   `      if (!save.horoyoiMode) { save.horoyoiMode = true; save.deisuiMode = false; }\n      else if (!save.deisuiMode && deisuiOpen()) save.deisuiMode = true;\n      else { save.horoyoiMode = false; save.deisuiMode = false; }\n      saveProgress();\n      if (save.horoyoiMode) { mpSfx('pour'); setTimeout(() => mpSfx('clink'), 1150); }\n      toast(save.deisuiMode ? '泥酔の夜へ' : save.horoyoiMode ? 'ほろ酔いの夜へ' : '一周目（昼）に戻りました');`],
]);

patch('home.js', [
  [`function homeIsNight() {`, `function homeIsDeisui() { return homeIsNight() && typeof isDeisui === 'function' && isDeisui(); }\nfunction homeIsNight() {`],
]);

fs.appendFileSync('style.css', `
/* 泥酔の夜：ミミの画面がぼやける（札も相手も見えず、選択肢だけが見える） */
.battle-screen.v2.is-deisui-blur > *:not(.deisui-blur-cap) { filter: blur(9px) saturate(1.3); transition: filter .5s; }
.battle-screen.v2.is-deisui-blur .action-grid, .battle-screen.v2.is-deisui-blur .action-grid * { filter: none; }
.battle-screen.v2:not(.is-deisui-blur) .deisui-blur-cap { display: none; }
.deisui-blur-cap { position: absolute; left: 50%; top: 30%; transform: translateX(-50%); z-index: 60; white-space: nowrap;
  font-size: 19px; font-weight: 900; letter-spacing: .06em; color: #ffe1ea; padding: 10px 22px; border-radius: 6px;
  background: rgba(40,6,18,.82); box-shadow: inset 0 0 0 2px rgba(255,140,170,.8), 0 0 30px rgba(255,90,130,.45); pointer-events: none; }
`);
console.log('ok');
