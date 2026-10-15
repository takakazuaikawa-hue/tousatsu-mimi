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
  const clearedCount = STAGE_ORDER.filter(id => save.clearedStages.includes(id)).length;
  const allCleared = clearedCount === STAGE_ORDER.length;
  const sid = next || STAGE_ORDER[STAGE_ORDER.length - 1];
  const opponent = OPPONENTS[sid];
  const face = id => `assets/ui/face_${id === 'rico_tutorial' ? 'rico_default' : id}.webp`;
  root.querySelector('[data-home="name"]').textContent = save.playerName || 'ミミ';
  root.querySelector('.h15-frame .h15-pic').src = face(sid);
  root.querySelector('.h15-frame .h15-pic').alt = opponent.name;
  root.querySelector('.h15-frame .h15-lbl').textContent = opponent.name;
  root.querySelector('.h15-frame').classList.toggle('has-long-name', opponent.name.length > 5);
  root.querySelector('.h15-frame .h15-sub').textContent = next ? '今夜の相手' : allCleared ? '全卓制覇' : '再戦の相手';
  const ticket = root.querySelector('.h15-ticket');
  ticket.dataset.opponent = sid;
  ticket.querySelector('.h15-lbl').textContent = '今夜の卓へ';
  const firstReward = !(save.firstClearRewardClaimed || []).includes(sid);
  ticket.querySelector('.h15-prize').innerHTML = `<span>勝てば ${firstReward ? opponent.rewardFirst : rematchPreview(sid)} コイン</span>${firstReward ? '<span>＋ご褒美CG</span>' : ''}`;
  ticket.setAttribute('aria-label', `${opponent.name}の卓へ。${ticket.querySelector('.h15-prize').textContent}`);
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
    const done = save.clearedStages.includes(id);
    const locked = !isStageUnlocked(id);
    const status = done ? 'win' : id === next ? 'now' : locked ? 'lock' : 'open';
    const mark = done ? 'seal' : id === next ? 'mark' : locked ? 'lock' : null;
    const label = done ? '勝利済み' : id === next ? '今夜の相手' : locked ? '未解放' : '受講できます';
    return `<span class="h15-slot h15-${status}" style="left:${positions[i]}%" title="${OPPONENTS[id].name}：${label}"><img class="h15-p" src="${face(id)}" alt="${OPPONENTS[id].name}：${label}"><span class="h15-rn">${romans[i]}</span>${mark ? `<img class="h15-st" src="assets/ui/home/${mark}.webp" alt="">` : ''}</span>`;
  }).join('');
  refreshHomeStatus();
  panyuFreeRefreshLobby();
  applyHomeCostume();
  mountHomeMotion(root);
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
    const o = OPPONENTS[id], done = save.clearedStages.includes(id), unlocked = isStageUnlocked(id);
    const action = id === 'rico_tutorial' && done ? 'rico-mode-chooser' : 'battle-start';
    return `<section class="home-ledger-row"><h3>${i+1}. ${o.name}</h3><span>${done ? '勝利済み' : id === lobbyNextStageId() ? '今夜の相手' : unlocked ? '挑戦できます' : `${OPPONENTS[STAGE_ORDER[i-1]].name}に勝つと解放`}</span>${unlocked ? `<div><button data-action="${action}" data-opponent="${id}">${done ? '再戦・受講' : id === 'rico_tutorial' ? '受講する' : '卓へ'}（${done ? rematchPreview(id) : o.rewardFirst}コイン）</button><button data-action="char-profile" data-char="${id}">プロフィール</button>${!done && id !== 'rico_tutorial' ? `<button data-action="skip-stage" data-opponent="${id}">スキップ ${skipStageCost(o)}</button>` : ''}${done && EPISODES[id] ? `<button data-action="recall-episode" data-episode="${id}">物語の回想</button>` : ''}${id === 'rico_tutorial' && !done ? '<button data-action="rico-skip-tutorial">実戦から始める</button>' : ''}</div>` : ''}</section>`;
  }).join('')}</div></section>`;
  openHomeDialog(overlay);
}

function showHomeSettings() {
  const overlay = document.createElement('div');
  overlay.className = 'home-overlay';
  overlay.innerHTML = `<section class="home-dialog home-settings" role="dialog" aria-modal="true" aria-labelledby="home-settings-title"><header><h2 id="home-settings-title">音量・設定</h2><button type="button" data-home-close>閉じる</button></header><label>BGM <button data-action="toggle-bgm">${save.bgmOn ? 'ON' : 'OFF'}</button><input aria-label="BGM音量" type="range" min="0" max="100" value="${save.bgmVolume ?? 35}" data-home-volume="bgm"></label><label>効果音 <button data-action="toggle-sfx">${save.sfxOn ? 'ON' : 'OFF'}</button><input aria-label="効果音量" type="range" min="0" max="100" value="${save.sfxVolume ?? 60}" data-home-volume="sfx"></label><button data-action="open-settings">ゲーム設定</button><button data-action="equip-change">装備変更</button><button data-action="home-fullscreen">全画面で遊ぶ</button></section>`;
  openHomeDialog(overlay, true);
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
  const reset = () => { root.style.setProperty('--mx',0); root.style.setProperty('--my',0); root.querySelector('.h15-bg').style.transform=''; };
  root.addEventListener('pointermove', e => {
    if (reduce.matches || innerHeight < 500 || e.pointerType !== 'mouse') return;
    pointer={x:e.clientX/innerWidth-.5,y:e.clientY/innerHeight-.5};
    if (frame) return;
    frame=requestAnimationFrame(() => {
      frame=0;
      root.style.setProperty('--mx',pointer.x*2); root.style.setProperty('--my',pointer.y*2);
      root.querySelector('.h15-bg').style.transform=`translate(${-pointer.x*10}px,${-pointer.y*6}px)`;
    });
  },{signal:abort.signal});
  root.addEventListener('pointerleave',reset,{signal:abort.signal});
  const tip=root.querySelector('.h15-tip'), ticket=root.querySelector('.h15-ticket');
  function activity() {
    clearInterval(interval); clearTimeout(hop); interval=0;
    root.classList.toggle('home-paused', document.hidden);
    if (reduce.matches || document.hidden) { reset(); tip.classList.remove('h15-on'); ticket.classList.remove('h15-hop'); return; }
    interval=setInterval(() => {
      tip.classList.remove('h15-on'); ticket.classList.remove('h15-hop');
      void tip.offsetWidth;
      tip.classList.add('h15-on');
      hop=setTimeout(() => ticket.classList.add('h15-hop'),120);
    },6000);
  }
  reduce.addEventListener('change',activity,{signal:abort.signal});
  document.addEventListener('visibilitychange',activity,{signal:abort.signal});
  addEventListener('resize',reset,{signal:abort.signal});
  activity();
  const prefetch=setTimeout(panyuPrefetch,1500);
  homeCleanup=() => { abort.abort(); clearInterval(interval); clearTimeout(hop); clearTimeout(prefetch); cancelAnimationFrame(frame); homeCleanup=() => {}; };
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
    ['.h15-ticket', { z: 80, rx: -6, ry: -10, rz: 2, dx: -46, dy: -22, p: 8, o: '50% 100%', so: '50% 100%', sa: .3, sp: 6, d: 620, fx: 50, fy: 40, frx: -40 }],
  ];
