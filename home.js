/* グランドクロック・カジノシアター：home-v15 の舞台。
 * 進行・報酬・衣装は game.js の既存モデルを参照。画面離脱で演出を破棄する。 */
'use strict';
let homeCleanup = () => {};
let homeWarmPending = false;

function homeLobbyOutfit() {
  if (!save.equippedRicoOutfit || save.equippedRicoOutfit === 'default') {
    return RICO_OUTFITS.find(o => o.file === state.homePreviewOutfit) || RICO_OUTFITS[0];
  }
  return pickLobbyRico();
}

function homeAssetsGate() {
  const assets = window.MimiAssets;
  if (!assets) return true;
  const outfit = homeLobbyOutfit();
  const urls = assets.sets.lobby();
  if (outfit.file !== 'rico_default.webp') urls.push(`assets/characters/${outfit.file}`);
  if (assets.allReady(urls)) return true;
  if (homeWarmPending) return false;
  homeWarmPending = true;
  const close = showLoadingVeil();
  assets.warm(urls, {front:true, set:'lobby'}).finally(() => {
    homeWarmPending = false;
    close();
    if (state.screen === 'lobby') render();
  });
  return false;
}

function renderHomeLobby() {
  const root = document.querySelector('.home-stage');
  if (!root) return;
  const next = lobbyNextStageId();
  // 研修（リコ先輩）を飛ばしてポルカに勝った人は「免除」として灯りと制覇の数に入れる。数え方は game.js の clearedStageCount に一本化（ホーム・台帳・コレクション・タイトルで同じ）
  const clearedCount = clearedStageCount();
  const allCleared = clearedCount === STAGE_ORDER.length;
  const sid = next || STAGE_ORDER[STAGE_ORDER.length - 1];
  const opponent = OPPONENTS[sid];
  const face = framePortrait;  // 額も小さな顔の窓も、額のために描いた肖像（無い人は小さな顔の絵）
  root.querySelector('[data-home="name"]').textContent = save.playerName || 'ミミ';
  root.querySelector('.h15-frame .h15-pic').src = framePortrait(sid);
  root.querySelector('.h15-frame .h15-pic').alt = opponent.name;
  root.querySelector('.h15-frame .h15-lbl').textContent = opponent.name;
  root.querySelector('.h15-frame').classList.toggle('has-long-name', opponent.name.length > 5);
  // 額を押すと、その相手のプロフィール（名鑑）が開く。額縁の見た目なのに押せなかった
  const frameEl = root.querySelector('.h15-frame');
  Object.assign(frameEl.dataset, { action: 'char-profile', char: sid });
  frameEl.setAttribute('role', 'button'); frameEl.tabIndex = 0;
  frameEl.setAttribute('aria-label', opponent.name + 'のプロフィールを見る');
  frameEl.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); frameEl.click(); } };
  root.querySelector('.h15-frame .h15-sub').textContent = next ? '今夜の相手' : allCleared ? '全卓制覇' : '再戦の相手';
  const ticket = root.querySelector('.h15-ticket');
  ticket.dataset.opponent = sid;
  ticket.querySelector('.h15-lbl').textContent = '今夜の卓へ';
  const firstReward = !(save.firstClearRewardClaimed || []).includes(sid);
  ticket.querySelector('.h15-prize').innerHTML = `<span><i class="h15-if">勝てば </i>${firstReward ? opponent.rewardFirst : rematchPreview(sid)} コイン</span>${firstReward ? '<span>＋ご褒美CG</span>' : ''}`;
  ticket.setAttribute('aria-label', `${opponent.name}の卓へ。${ticket.querySelector('.h15-prize').textContent}`);
  // クリア後（ヴェルベットに勝った後）は札と額が「零時の卓」の入口になる（allstar-ui.js）
  if (window.AllstarUI) AllstarUI.decorateHome(root);
  const places = root.querySelectorAll('.h15-pl');
  places[3].dataset.action = save.clearedStages.includes('rico_tutorial') ? 'rico-mode-chooser' : 'battle-start';
  places[3].dataset.opponent = 'rico_tutorial';
  places[4].title = isRicoViewerUnlocked() ? 'リコ先輩の衣装を眺める・切り替える' : '衣装を見る（交換所で購入すると解放）';
  const fresh = newItemCount();
  const badge = root.querySelector('[data-home="new"]');
  badge.textContent = fresh ? `新入荷 ${fresh}` : '';
  badge.hidden = !fresh;
  const positions = [10.2, 26.3, 42.5, 58.9, 75.1];
  const romans = ['I', 'II', 'III', 'IV', 'V'];
  root.querySelector('[data-home="ledger"]').innerHTML = `<span class="h15-lbl h15-gold-txt">${next ? `第${STAGE_ORDER.indexOf(next) + 1}戦` : allCleared ? '全卓制覇' : `${clearedCount}戦クリア`} <small>／全5戦</small></span>` + STAGE_ORDER.map((id,i) => {
    const exempt = isStageExempt(id);
    const done = isStageCleared(id);
    const locked = !isStageUnlocked(id);
    const status = done ? 'win' : id === next ? 'now' : locked ? 'lock' : 'open';
    const mark = done ? 'seal' : id === next ? 'mark' : locked ? 'lock' : null;
    const label = exempt ? '免除' : done ? '勝利済み' : id === next ? '今夜の相手' : locked ? '未解放' : '受講できます';
    return `<span class="h15-slot h15-${status}" style="left:${positions[i]}%" title="${OPPONENTS[id].name}：${label}"><img class="h15-p" src="${face(id)}" alt="${OPPONENTS[id].name}：${label}"><span class="h15-rn">${romans[i]}</span>${mark ? `<img class="h15-st" src="assets/ui/home/${mark}.webp" alt="">` : ''}</span>`;
  }).join('');
  refreshHomeStatus();
  panyuFreeRefreshLobby();
  applyHomeCostume();
  buildHomeArt(root);
  // 勝ち数＝劇場の段階。前回ホームで見た段階より進んでいたら、一度だけ「開幕の儀」で変化を見せる
  const seen = Math.min(save.homeStageSeen ?? clearedCount, clearedCount);
  const ceremony = seen < clearedCount && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 見た記録は、儀式を見終えた（または押して飛ばした）時に付ける。途中で描き直されたら次の描画でやり直す
  if (!ceremony && save.homeStageSeen !== clearedCount) { save.homeStageSeen = clearedCount; saveProgress(); }
  setHomeStage(root, ceremony ? clearedCount - 1 : clearedCount);
  root._ceremony = ceremony ? homeCeremonyPlan(root, clearedCount, next) : null;
  mountHomeMotion(root);
}

// 舞台の絵（1672x941）の上の位置。文字盤の数字 I〜V、段階ごとに灯りが入る暗がり、燭台の炎。
// k＝その段階で灯る（0 は最初から）。暗がりは中央のリコと時計を避け、内から外へ明るくなる。
const HOME_ART = {
  nums: [[1032,102],[1107,178],[1135,280],[1107,382],[1032,458]],
  shades: [
    { k:1, x:380, y:330, w:520, h:560 },
    { k:2, x:1310, y:470, w:560, h:640 },
    { k:3, x:300, y:70, w:760, h:340 }, { k:3, x:1420, y:70, w:760, h:340 },
    { k:4, x:40, y:520, w:420, h:1000 }, { k:4, x:1640, y:500, w:420, h:1000 },
  ],
  flames: [
    { k:0, x:258, y:606 }, { k:0, x:1440, y:636 },
    { k:1, x:362, y:266 }, { k:1, x:432, y:384 },
    { k:2, x:1336, y:270 }, { k:2, x:1262, y:414 },
    { k:3, x:200, y:172 }, { k:3, x:1642, y:150 },
    { k:4, x:96, y:492 }, { k:4, x:1552, y:512 },
  ],
};

function buildHomeArt(root) {
  const art = root.querySelector('.h15-art');
  if (!art || art.childElementCount) return;
  const at = (x,y) => `left:${(x/16.72).toFixed(2)}%;top:${(y/9.41).toFixed(2)}%`;
  art.innerHTML =
    '<div class="h15-dust"><i></i><i></i></div>' +
    HOME_ART.shades.map(s => `<i class="h15-shade" style="${at(s.x,s.y)};width:${(s.w/16.72).toFixed(2)}%;height:${(s.h/9.41).toFixed(2)}%;--k:${s.k}"></i>`).join('') +
    HOME_ART.flames.map((f,i) => `<i class="h15-flame${f.k >= 3 ? ' h15-far' : ''}" style="${at(f.x,f.y)};--k:${f.k};--fp:${(2.3 + (i*0.37)%1.8).toFixed(2)}s;--fd:${(-i*.53).toFixed(2)}s"></i>`).join('') +
    '<i class="h15-dial" style="' + at(930,280) + '"></i>' +
    HOME_ART.nums.map(([x,y],i) => `<i class="h15-num" style="${at(x,y)};--n:${i + 1}"></i>`).join('');
}

function setHomeStage(root, stage, num = stage) {
  root.style.setProperty('--stage', stage);
  root.style.setProperty('--num', num);
  root.dataset.stage = stage;
}

// 開幕の儀：勝つ前の姿で入場 → 文字盤の数字が灯る → 封蝋が押される → 灯りが入り視野が開く → 額が次の相手に掛け替わる → 札が跳ねる。
// どこかを押せば即座に終わりの姿へ。演出用の特別な見た目は作らず、段階の値を時間差で切り替えるだけ。
// 額に飾る専用の肖像（ChatGPT で額のために描いた絵）。まだ無い相手は顔の切り抜きのまま
const FRAME_PORTRAITS = new Set(['rico', 'polka', 'selina', 'grano', 'velvet']);
function framePortrait(id) { const pid = id === 'rico_tutorial' ? 'rico' : id; return FRAME_PORTRAITS.has(pid) ? `assets/ui/portrait_${pid}.webp` : `assets/ui/face_${id === 'rico_tutorial' ? 'rico_default' : id}.webp`; }
function homeCeremonyPlan(root, cleared, next) {
  const prevId = STAGE_ORDER[cleared - 1];
  const prev = OPPONENTS[prevId];
  const face = framePortrait;  // 額も小さな顔の窓も、額のために描いた肖像（無い人は小さな顔の絵）
  const frame = root.querySelector('.h15-frame');
  const slot = root.querySelectorAll('.h15-slot')[cleared - 1];
  const final = { src: frame.querySelector('.h15-pic').src, name: frame.querySelector('.h15-lbl').textContent, sub: frame.querySelector('.h15-sub').textContent, long: frame.classList.contains('has-long-name') };
  frame.querySelector('.h15-pic').src = framePortrait(prevId);
  frame.querySelector('.h15-lbl').textContent = prev.name;
  frame.querySelector('.h15-sub').textContent = '今夜の相手';
  frame.classList.toggle('has-long-name', prev.name.length > 5);
  slot?.classList.add('h15-pending');
  const timers = [];
  let done = false;
  const setFrame = () => {
    frame.querySelector('.h15-pic').src = final.src;
    frame.querySelector('.h15-lbl').textContent = final.name;
    frame.querySelector('.h15-sub').textContent = final.sub;
    frame.classList.toggle('has-long-name', final.long);
  };
  const finish = () => {
    if (done) return;
    done = true;
    if (save.homeStageSeen !== cleared) { save.homeStageSeen = cleared; saveProgress(); }
    timers.forEach(clearTimeout);
    setHomeStage(root, cleared);
    slot?.classList.remove('h15-pending');
    setFrame();
    frame.querySelector('.h15-en')?.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    root.querySelector('.h15-dialogue').textContent = cleared === STAGE_ORDER.length ? '「全部の卓に灯りが入ったじゃん。ここはもう、あんたの劇場だよ」' : '「やるじゃん。劇場にまた灯りが入ったよ」';
    root.classList.remove('h15-rite');
  };
  const start = () => {
    if (done || !root.isConnected) return;
    root.classList.add('h15-rite');
    const at = (ms, fn) => timers.push(setTimeout(() => { if (!done && root.isConnected) fn(); }, ms));
    at(0, () => { setHomeStage(root, cleared - 1, cleared); root.querySelector('.h15-tip').classList.add('h15-on'); root.querySelectorAll('.h15-num')[cleared - 1]?.classList.add('h15-flash'); mpSfx('milestone'); });
    at(500, () => setHomeStage(root, cleared));
    at(1900, () => { slot?.classList.remove('h15-pending'); slot?.classList.add('h15-stamp'); mpSfx('bet'); });
    at(2900, () => {
      const en = frame.querySelector('.h15-en');
      en.animate([{ transform:'none', opacity:1 }, { transform:'translateY(-70px)', opacity:0 }], { duration:340, easing:'ease-in', composite:'add', fill:'forwards' }).finished.then(() => {
        if (done) return;
        setFrame();
        en.getAnimations().forEach(a => { if (a instanceof CSSAnimation) return; a.cancel(); });
        en.animate([{ transform:'translateY(-90px)', opacity:0 }, { transform:'translateY(6px)', opacity:1, offset:.6 }, { transform:'rotate(1.2deg)', offset:.78 }, { transform:'rotate(-.6deg)', offset:.9 }, { transform:'none', opacity:1 }], { duration:900, easing:'ease-out', composite:'add' });
      });
    });
    at(4600, finish);
  };
  const abort = () => { done = true; timers.forEach(clearTimeout); };
  return { start, finish, abort };
}

function refreshHomeStatus() {
  const root = document.querySelector('.home-stage');
  if (!root) return;
  const claimed = save.loginBonus?.lastDate === mpTodayKey();
  root.querySelector('[data-home="gift-dot"]').hidden = claimed;
  const gift = root.querySelector('[data-action="home-gift"]');
  gift.title = gift.ariaLabel = claimed ? '今日のログインボーナスは受取済み' : 'ログインボーナスを受け取る';
  const coins = root.querySelector('[data-bind="saveCoins"]');
  coins.textContent = save.coins.toLocaleString('ja-JP');
  coins.closest('button').ariaLabel = `所持コイン ${save.coins}。交換所を開く`;
}

// 制服は承認された頬杖の絵。ほかの衣装は人物なしの同じ劇場で、卓の奥に立つ。
// decode 完了後に全層を一緒に切り替え、着替え中の二重表示・背景だけの瞬間を避ける。
async function applyHomeCostume() {
  const root = document.querySelector('.home-stage');
  if (!root) return;
  const outfit = homeLobbyOutfit();
  const uniform = /rico_(default|greet)\.webp$/.test(outfit.file);
  const request = {};
  root._costumeRequest = request;
  const image = root.querySelector('.h15-costume');
  const urls = uniform ? ['assets/ui/home/scene.webp'] : ['assets/ui/home/stage-empty.webp', `assets/characters/${outfit.file}`];
  try {
    if (!urls.every(src => window.MimiAssets?.isReady(src))) {
      await Promise.all(urls.map(src => { const im = new Image(); im.src = src; return im.decode(); }));
    }
    if (!root.isConnected || root._costumeRequest !== request) return;
    image.src = uniform ? 'assets/ui/home/scene.webp' : urls[1];
    root.classList.toggle('has-costume', !uniform);
    // 制服の時は、リコ先輩を Live2D 風に動かす層を重ねる（home-live.js）。ほかの衣装の時は止める
    if (window.HomeLive) { if (uniform) window.HomeLive.start(root.querySelector('.h15-bg'), 'assets/ui/home/scene.webp'); else window.HomeLive.stop(); }
    root.querySelector('.h15-dialogue').textContent = uniform ? lobbyRicoLine() : outfit.lines[Math.floor(rand() * outfit.lines.length)];
  } catch {
    if (!root.isConnected || root._costumeRequest !== request) return;
    root.classList.remove('has-costume');
    root.querySelector('.h15-dialogue').textContent = lobbyRicoLine();
  }
}

function showHomeLedger() {
  const overlay = document.createElement('div');
  overlay.className = 'home-overlay';
  overlay.innerHTML = `<section class="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-ledger-title"><header><h2 id="home-ledger-title">物語の台帳</h2><button type="button" data-home-close aria-label="閉じる">閉じる</button></header><div class="home-ledger-rows">${STAGE_ORDER.map((id,i) => {
    // done＝この卓を勝ち取った（clearedStages に入っている）。exempt＝研修を飛ばしてポルカに勝った人のリコ先輩（封蝋は押すが、勝ったとは言わない）
    const o = OPPONENTS[id], done = save.clearedStages.includes(id), exempt = isStageExempt(id), unlocked = isStageUnlocked(id);
    const action = id === 'rico_tutorial' && done ? 'rico-mode-chooser' : 'battle-start';
    const stateText = exempt ? '免除（研修は飛ばしました。受講はいつでもできます）' : done ? '勝利済み' : id === lobbyNextStageId() ? '今夜の相手' : unlocked ? '挑戦できます' : `${OPPONENTS[STAGE_ORDER[i-1]].name}に勝つと解放`;
    // コインで飛ばせるのは研修とヴェルベット以外の、まだ勝っていない卓だけ（canSkipStage）。ヴェルベットを飛ばすとエンディングを見ないままクリア特典が開いてしまうため
    const skipBtn = canSkipStage(id) ? `<button data-action="skip-stage" data-opponent="${id}">スキップ（${skipStageCost(o)} コインで勝ち扱い）</button>` : '';
    return `<section class="home-ledger-row"><h3>${i+1}. ${o.name}</h3><span>${stateText}</span>${unlocked ? `<div><button data-action="${action}" data-opponent="${id}">${done ? (id === 'rico_tutorial' ? '受講・再戦' : '再戦') : id === 'rico_tutorial' ? '受講する' : '卓へ'}（勝てば ${done ? rematchPreview(id) : o.rewardFirst} コイン）</button><button data-action="char-profile" data-char="${id}">プロフィール</button>${skipBtn}${done && EPISODES[id] ? `<button data-action="recall-episode" data-episode="${id}">物語の回想</button>` : ''}${id === 'rico_tutorial' && !done && !exempt ? '<button data-action="rico-skip-tutorial">実戦から始める</button>' : ''}</div>` : ''}</section>`;
  }).join('')}</div></section>`;
  openHomeDialog(overlay);
}

function showHomeSettings() {
  const overlay = document.createElement('div');
  overlay.className = 'home-overlay';
  overlay.innerHTML = `<section class="home-dialog home-settings" role="dialog" aria-modal="true" aria-labelledby="home-settings-title"><header><h2 id="home-settings-title">音量・設定</h2><button type="button" data-home-close>閉じる</button></header><label>BGM <button data-action="toggle-bgm">${save.bgmOn ? 'ON' : 'OFF'}</button><input aria-label="BGM音量" type="range" min="0" max="100" value="${save.bgmVolume ?? 35}" data-home-volume="bgm"></label><label>効果音 <button data-action="toggle-sfx">${save.sfxOn ? 'ON' : 'OFF'}</button><input aria-label="効果音量" type="range" min="0" max="100" value="${save.sfxVolume ?? 60}" data-home-volume="sfx"></label><button data-pack-row>まとめてダウンロード <span class="pack-row-state" data-pack-state></span></button><button data-action="open-settings">ゲーム設定</button><button data-action="equip-change">装備変更</button><button data-action="home-fullscreen">全画面で遊ぶ</button><p class="home-legal">ミミのテキサスホールデムポーカー　Ver ${GAME_VERSION}　${COPYRIGHT_TEXT}</p></section>`;
  openHomeDialog(overlay, true);
  if (window.MimiPack) window.MimiPack.bindRow(overlay);
  overlay.querySelectorAll('[data-home-volume]').forEach(input => input.addEventListener('input', () => {
    save[input.dataset.homeVolume === 'bgm' ? 'bgmVolume' : 'sfxVolume'] = +input.value;
    saveProgress(); applyBgmVolume();
  }));
}

function openHomeDialog(overlay, audio = false) {
  document.querySelectorAll('.home-overlay').forEach(el => el.remove());
  const previous = document.activeElement;
  const close = () => { overlay.remove(); if (previous?.isConnected) previous.focus(); };
  document.getElementById('stage').appendChild(overlay);
  overlay.querySelector('[data-home-close]').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key !== 'Tab') return;
    const list = [...overlay.querySelectorAll('button,input')], first = list[0], last = list.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  overlay.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', e => {
    const action = button.dataset.action;
    if (audio && ['toggle-bgm','toggle-sfx'].includes(action)) {
      onAction(e);
      button.textContent = (action === 'toggle-bgm' ? save.bgmOn : save.sfxOn) ? 'ON' : 'OFF';
    } else { overlay.remove(); onAction(e); }
  }));
  overlay.querySelector('[data-home-close]').focus();
}

function fitHomeStage() {
  const root = document.querySelector('.home-stage');
  if (!root) return;
  const scale = Math.min(innerWidth / 1280, innerHeight / 800);
  const width = Math.max(1280, innerWidth / scale);
  root.style.setProperty('--home-width', width + 'px');
  // cover + background-position:50% 40% と同じ計算で、実際の卓縁から手前だけを重ねる。
  const cover = Math.max((width + 48) / 1672, 828 / 941);
  root.style.setProperty('--home-rail', ((828 - 941 * cover) * .4 + 744 * cover) + 'px');
  // 絵の上に重ねる層（数字の灯り・暗がり・炎）を、背景の cover と同じ位置・大きさに置く
  const art = root.querySelector('.h15-art');
  if (art) Object.assign(art.style, { left: (-24 + (width + 48 - 1672 * cover) * .5) + 'px', top: (-14 + (828 - 941 * cover) * .4) + 'px', width: 1672 * cover + 'px', height: 941 * cover + 'px' });
  root.classList.toggle('h15-sm', innerHeight < 500);
  root.style.setProperty('--depth', innerHeight < 500 ? .5 : 1);
}

function mountHomeMotion(root) {
  fitHomeStage();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const parts = [];
  for (const [selector,v] of HOME_PLACEMENT) root.querySelectorAll(selector).forEach(el => {
    const en = document.createElement('span'), sw = document.createElement('span');
    en.className = 'h15-en'; sw.className = 'h15-sw';
    while (el.firstChild) sw.appendChild(el.firstChild);
    en.append(sw); el.append(en); el.classList.add('h15-d3');
    const set = (key,val) => el.style.setProperty('--'+key,val);
    set('z', `calc(${v.z}px * var(--depth))`);
    set('rx', `calc(${v.rx || 0}deg * var(--depth))`); set('ry', `calc(${v.ry || 0}deg * var(--depth))`);
    set('rz', (v.rz || 0)+'deg'); set('dx',(v.dx || 0)+'px'); set('dy',(v.dy || 0)+'px');
    set('p', v.p); set('o',v.o || '50% 50%'); set('so',v.so || v.o || '8% 50%');
    set('sa',(v.sa || 0)+'deg'); set('sp',(v.sp || 5)+'s'); set('sd',(-parts.length*.61)+'s');
    set('d',(v.d || 0)+'ms'); set('fx',(v.fx ?? -40)+'px'); set('fy',(v.fy || 0)+'px'); set('frx',(v.frx || 0)+'deg');
    if (el.matches('.h15-pl,.h15-nameplate')) { const pin = document.createElement('i'); pin.className='h15-pin'; sw.append(pin); }
    if (el.matches('.h15-frame')) [22,78].forEach(left => { const chain=document.createElement('i'); chain.className='h15-chain'; chain.style.left=left+'%'; sw.append(chain); });
    const im = sw.querySelector('.h15-f'); if (im) sw.style.setProperty('--m', `url(${im.getAttribute('src')})`);
    parts.push(el);
  });
  let frame = 0, interval = 0, hop = 0;
  let pointer = {x:0,y:0};
  const layers = root.querySelectorAll('.h15-bg,.h15-art');
  const reset = () => { root.style.setProperty('--mx',0); root.style.setProperty('--my',0); layers.forEach(l => l.style.transform=''); };
  root.addEventListener('pointermove', e => {
    if (reduce.matches || innerHeight < 500 || e.pointerType !== 'mouse') return;
    pointer={x:e.clientX/innerWidth-.5,y:e.clientY/innerHeight-.5};
    if (frame) return;
    frame=requestAnimationFrame(() => {
      frame=0;
      root.style.setProperty('--mx',pointer.x*2); root.style.setProperty('--my',pointer.y*2);
      layers.forEach(l => l.style.transform=`translate(${-pointer.x*10}px,${-pointer.y*6}px)`);
    });
  },{signal:abort.signal});
  root.addEventListener('pointerleave',reset,{signal:abort.signal});
  const tip=root.querySelector('.h15-tip'), ticket=root.querySelector('.h15-ticket');
  // 金縁を走る反射：額・名札・台帳・八角金具のどれか一つだけに、順番に一度ずつ
  const glints = [...root.querySelectorAll('.h15-frame,.h15-nameplate,.h15-ledger,.h15-oct')].map(el => {
    const g = document.createElement('i'); g.className = 'h15-gl'; el.querySelector('.h15-sw')?.append(g); return g;
  });
  let glintAt = 0, gust = 0, glint = 0;
  const swayers = [...root.querySelectorAll('.h15-nameplate,.h15-pl')].map(el => el.querySelector('.h15-en'));
  const frameEn = root.querySelector('.h15-frame .h15-en');
  // 札の列に同じ風がひと吹き：上から順に少し遅れて同じ向きに振れ、鎖の額は遅れて応える
  function blow() {
    swayers.forEach((en,i) => en?.animate([{transform:'none'},{transform:'rotate(.7deg)',offset:.35},{transform:'rotate(-.3deg)',offset:.7},{transform:'none'}],{duration:1700,delay:i*80,easing:'ease-in-out',composite:'add'}));
    frameEn?.animate([{transform:'none'},{transform:'rotate(.6deg)',offset:.4},{transform:'rotate(-.35deg)',offset:.75},{transform:'none'}],{duration:2200,delay:520,easing:'ease-in-out',composite:'add'});
  }
  function activity() {
    clearInterval(interval); clearTimeout(hop); clearInterval(gust); clearInterval(glint); interval=0;
    root.classList.toggle('home-paused', document.hidden);
    if (reduce.matches || document.hidden) {
      reset(); tip.classList.remove('h15-on'); ticket.classList.remove('h15-hop');
      // 風・額の掛け替えなど JS で付けた動きも止める（CSS の動きは動き軽減の指定で止まる）
      if (reduce.matches) root._ceremony?.finish();
      root.getAnimations({subtree:true}).forEach(a => { if (!(a instanceof CSSAnimation) && !(a instanceof CSSTransition)) a.finish(); });
      return;
    }
    hop=setTimeout(blow, 4200);
    gust=setInterval(blow, 19000);
    glint=setInterval(() => {
      const g = glints[glintAt++ % glints.length];
      g?.classList.remove('h15-on'); void g?.offsetWidth; g?.classList.add('h15-on');
    }, 3300);
  }
  reduce.addEventListener('change',activity,{signal:abort.signal});
  document.addEventListener('visibilitychange',activity,{signal:abort.signal});
  addEventListener('resize',reset,{signal:abort.signal});
  activity();
  // 開幕の儀：入場が落ち着いてから。ログインボーナスの窓が出ていれば閉じるのを待つ。どこかを押せば即終わり
  const rite = root._ceremony;
  let riteWait = 0;
  if (rite) {
    root.addEventListener('pointerdown', rite.finish, {signal:abort.signal, capture:true});
    const tryStart = (n = 0) => {
      if (document.querySelector('[class*="login-bonus"]') && n < 150) { riteWait = setTimeout(() => tryStart(n + 1), 400); return; }
      rite.start();
    };
    // 入場の動き（いちばん遅い札）が終わってから。重い端末でも重ならないように
    const entered = ticket.querySelector('.h15-en')?.getAnimations()[0]?.finished;
    Promise.race([entered, new Promise(r => setTimeout(r, 4000))]).catch(() => {}).then(() => {
      if (!abort.signal.aborted) riteWait = setTimeout(tryStart, 250);
    });
  }
  const prefetch=setTimeout(panyuPrefetch,1500);
  homeCleanup=() => { abort.abort(); clearInterval(interval); clearTimeout(hop); clearInterval(gust); clearInterval(glint); clearTimeout(riteWait); rite?.abort(); clearTimeout(prefetch); cancelAnimationFrame(frame); homeCleanup=() => {}; };
}

const HOME_PLACEMENT = [
    ['.h15-nameplate', { z: 70, rx: 4, ry: 12, rz: -1, dx: 22, dy: 6, p: 5, o: '10% 50%', so: '10% 50%', sa: .5, sp: 5.2, d: 0, fx: -50 }],
    ['.h15-pl:nth-child(1)', { z: 70, ry: 10, rz: -1.2, dx: 0, p: 5, o: '6% 50%', sa: .4, sp: 4.6, d: 120, frx: -25 }],
    ['.h15-pl:nth-child(2)', { z: 62, ry: 10, rz: .8, dx: 8, p: 4.6, o: '6% 50%', sa: .45, sp: 5.4, d: 180, frx: -25 }],
    ['.h15-pl:nth-child(3)', { z: 54, ry: 10, rz: -.6, dx: 16, p: 4.2, o: '6% 50%', sa: .4, sp: 5.0, d: 240, frx: -25 }],
    ['.h15-pl:nth-child(4)', { z: 46, ry: 10, rz: 1.1, dx: 10, p: 3.8, o: '6% 50%', sa: .5, sp: 5.8, d: 300, frx: -25 }],
    ['.h15-pl:nth-child(5)', { z: 38, ry: 10, rz: -.9, dx: 20, p: 3.4, o: '6% 50%', sa: .4, sp: 4.9, d: 360, frx: -25 }],
    ['.h15-frame', { z: -10, rx: 2, ry: -8, rz: 1, dx: -10, dy: 14, p: 2, o: '50% 0%', so: '50% -30%', sa: .6, sp: 7, d: 420, fx: 0, fy: -60 }],
    ['.h15-ledger', { z: 60, rx: 18, ry: 5, rz: -2, dx: 10, dy: -4, p: 5, o: '50% 100%', sa: 0, d: 480, fx: 0, fy: 50 }],
    ['.h15-top .h15-oct:nth-child(1)', { z: 40, ry: -10, p: 2, sa: 2, sp: 4.5, so: '50% 0%', d: 200, fx: 0, fy: -30 }],
    ['.h15-top .h15-oct:nth-child(2)', { z: 34, ry: -10, dy: 4, p: 2, sa: 0, d: 240, fx: 0, fy: -30 }],
    ['.h15-top .h15-oct:nth-child(3)', { z: 28, ry: -10, dy: 1, p: 2, sa: 0, d: 280, fx: 0, fy: -30 }],
    ['.h15-top .h15-oct:nth-child(4)', { z: 22, ry: -10, dy: 6, p: 2, sa: 0, d: 320, fx: 0, fy: -30 }],
    ['.h15-ticket', { z: 80, rx: -6, ry: -10, rz: .5, dx: -46, dy: -22, p: 8, o: '50% 100%', so: '50% 100%', sa: .3, sp: 6, d: 620, fx: 50, fy: 40, frx: -40 }],
  ];
