// ページ内の自動プレイヤー。Node 側から window.__qaBot.step(policy) を繰り返し呼ぶ。
// 方針：learner（学んだ方針）／allin（毎回オールイン）／station（全部コール）／random
(() => {
  const G = () => { try { return { S: state, V: save }; } catch (e) { return { S: null, V: null }; } };
  const vis = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.right < 1 || r.bottom < 1 || r.left > innerWidth - 1 || r.top > innerHeight - 1) return false;
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      n = n.parentElement;
    }
    return true;
  };
  const center = (el) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2);
    return { x, y };
  };
  const hittable = (el) => {
    const { x, y } = center(el);
    const h = document.elementFromPoint(x, y);
    return !!h && (h === el || el.contains(h));
  };
  const label = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const desc = (el) => {
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const act = el.dataset && el.dataset.action ? `[${el.dataset.action}]` : '';
    return `${el.tagName.toLowerCase()}${cls}${act} "${label(el)}"`;
  };

  // 押してはいけない（検査の流れを壊す・外へ出る）もの
  const AVOID_ACTION = new Set(['back-title', 'reset-save', 'new-game', 'new-game-keep-coins', 'new-game-full', 'newgame-cancel', 'share-game',
    'open-settings', 'toggle-audio-all', 'toggle-sfx', 'toggle-bgm', 'toggle-psych', 'toggle-logic', 'toggle-backdoor', 'open-shop', 'open-collection',
    'use-panyu-sense', 'skip-stage', 'rico-skip-tutorial', 'psych-skip', 'char-profile', 'open-rico-viewer', 'show-hand-guide', 'open-glossary',
    'open-history', 'panyu-free', 'play-minipoker', 'buy-item', 'equip-change', 'lb3-toggle-audio', 'toggle-v2-detail', 'intro-read-episode',
    'intro-to-lecture', 'recall-episode', 'view-reward-cg', 'play-ending-theme', 'open-note', 'rico-mode-cancel', 'back-lobby']);
  const AVOID_TEXT = /中断|タイトルへ|リセット|全スキップ|研修をスキップ|スキップ|キャンセル|シェア|設定|交換所|コレクション|ぱにゅぱにゅ|もう一度受講|最初からやり直す|講義を中断|フルコース|削除|やめる/;
  const PREFER = [
    [/次のハンド/, 20], [/受け取る/, 20], [/▶\s*開始/, 19], [/この章を始める/, 19], [/ライトコース/, 19], [/講義に戻る/, 19],
    [/幕間へ/, 19], [/に挑戦/, 18], [/座り直す/, 18], [/ロビーへ行く/, 18], [/続ける/, 17], [/次へ/, 17], [/▶\s*流す/, 17], [/流す/, 16],
    [/結果を見る/, 16], [/進む/, 15], [/はじめから/, 15], [/続きから/, 15], [/OK|はい|了解/, 14], [/閉じる/, 12], [/ロビーへ/, 8], [/再挑戦/, 9], [/再戦/, 4],
  ];
  const PREFER_ACTION = { 'start': 15, 'go-intermission': 19, 'battle-start': 18, 'intro-to-lobby': 18, 'start-hand': 20, 'go-ending': 18, 'rematch': 9, 'rico-mode-serious': 6, 'rico-mode-tutorial': 7, 'history-close': 10, 'glossary-close': 10, 'collection-close': 10, 'rico-viewer-close': 10 };
  const TAP_OVERLAYS = ['.coach-layer.is-tap', '.rico-cutin', '.cutin-overlay', '.emote-cutin', '.clutch-cutin', '.mp-hand-cutin', '.intermission-overlay', '.reward-cg-viewer-overlay', '.dominance-overlay', '.personality-reveal-banner', '.episode-overlay', '.allin-cutin', '.v2-cutin'];
  const DUP_WATCH = ['hand-result-overlay', 'intro-win-overlay', 'episode-overlay', 'intermission-overlay', 'ending-prompt-overlay', 'rebuy-overlay', 'login-bonus-overlay', 'chapter-banner', 'psych-modal', 'tutorial-overlay', 'hands-on-overlay', 'dominance-choice-overlay', 'rico-mode-overlay', 'reward-cg-viewer-overlay', 'rico-viewer-overlay'];

  const mem = { psychPick: {}, rng: 1 };
  const rnd = () => { mem.rng = (mem.rng * 1103515245 + 12345) % 2147483648; return mem.rng / 2147483648; };

  function candidates() {
    const sel = 'button, [data-action], .choice-btn, .ho-choice-btn, .dominance-choice-btn, .lb8-hit, [role="button"], .chapter-btn';
    return [...document.querySelectorAll(sel)].filter(el => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && vis(el) && hittable(el));
  }

  function correctTextFor(qid) {
    try {
      const q = PSYCH_QUESTIONS[qid];
      const c = q && q.choices.find(x => x.correct);
      return c ? c.text : null;
    } catch (e) { return null; }
  }

  function pickPsych(btns, policy, S) {
    const qid = S && S.psychHistory && S.psychHistory.length ? S.psychHistory[S.psychHistory.length - 1] : '?';
    const key = qid + '#' + (S ? S.handNo : 0) + '#' + (S ? S.handPhase : '');
    const armed = btns.find(b => b.classList.contains('armed'));
    if (armed) return { el: armed, why: 'confirm-armed' };
    if (!mem.psychPick[key]) {
      const ct = correctTextFor(qid);
      const right = btns.find(b => ct && (b.querySelector('.choice-text') || b).textContent.trim() === ct.trim());
      const pCorrect = policy === 'learner' ? 0.85 : policy === 'perfect' ? 1 : 0.34;
      let el;
      if (right && rnd() < pCorrect) el = right;
      else { const wrong = btns.filter(b => b !== right); el = wrong.length ? wrong[Math.floor(rnd() * wrong.length)] : btns[0]; }
      mem.psychPick[key] = el.dataset.choiceId || label(el);
    }
    const want = mem.psychPick[key];
    const el = btns.find(b => (b.dataset.choiceId || label(b)) === want) || btns[0];
    return { el, why: 'psych:' + qid };
  }

  function battleAction(btns, policy, S) {
    const by = (a) => btns.filter(b => b.dataset.action === a);
    const has = (a) => by(a).length > 0;
    const one = (a) => by(a)[0];
    const bets = btns.filter(b => b.dataset.action === 'player-bet' || b.dataset.action === 'player-raise');
    const opener = one('open-bet-chooser'), closer = one('close-bet-chooser');
    // 賭ける額は「賭ける」を押してから選ぶ2段階。額のボタンが無ければまず開く／賭けないなら閉じる
    // チップが少ないと額の選択肢が「ぜんぶ（オールイン）」だけになる。その時はそれを押す（開け閉めを繰り返さない）
    const midBet = () => bets.length ? bets[Math.min(1, bets.length - 1)] : (opener || one('player-allin'));
    const passive = () => one('player-checkcall') || one('player-call') || one('player-check') || closer;
    if (S && S.introHandMode) {
      const primary = btns.find(b => b.classList.contains('btn-primary')) || btns[0];
      return { el: primary, why: 'intro' };
    }
    if (policy === 'random') return { el: btns[Math.floor(rnd() * btns.length)], why: 'random' };
    if (policy === 'allin') return { el: one('player-allin') || opener || passive(), why: 'allin' };
    if (policy === 'station') return { el: passive(), why: 'station' };
    if (policy === 'beginner') {
      let rank = -1;
      try { if ((S.community || []).length >= 3) rank = evaluateHand([...(S.playerHand || []), ...S.community]).rank; } catch (e) {}
      const need0 = Math.max(0, (S.currentBetOpponent || 0) - (S.currentBetPlayer || 0));
      if (rank < 0) return { el: (need0 > 150 && has('player-fold')) ? one('player-fold') : passive(), why: 'beginner-pre' };
      if (need0 > 0) return { el: rank >= 1 ? passive() : (one('player-fold') || closer), why: 'beginner-facing r=' + rank };
      const small = bets[0] || opener;
      return { el: rank >= 1 && small ? small : passive(), why: 'beginner r=' + rank };
    }
    // learner：手の強さと必要勝率で判断する
    let eq = 0.5;
    try {
      const h = S.playerHand || [], c = S.community || [];
      if (c.length >= 3) eq = realisticEquity01([...h, ...c]);
      else if (h.length === 2) eq = opponentPreflopStrength(h);
    } catch (e) {}
    const need = Math.max(0, (S.currentBetOpponent || 0) - (S.currentBetPlayer || 0));
    const potOdds = need > 0 ? need / ((S.pot || 0) + need) : 0;
    if (need > 0) {
      if (eq < potOdds + 0.03 && (has('player-fold') || closer)) return { el: one('player-fold') || closer, why: `fold eq=${eq.toFixed(2)} po=${potOdds.toFixed(2)}` };
      if (eq > 0.88 && midBet()) return { el: midBet(), why: `raise eq=${eq.toFixed(2)}` };
      return { el: passive(), why: `call eq=${eq.toFixed(2)} po=${potOdds.toFixed(2)}` };
    }
    if (eq > 0.62 && midBet()) return { el: midBet(), why: `bet eq=${eq.toFixed(2)}` };
    return { el: passive(), why: `check eq=${eq.toFixed(2)}` };
  }

  function dupOverlays() {
    const out = [];
    for (const c of DUP_WATCH) {
      const n = [...document.getElementsByClassName(c)].filter(vis).length;
      if (n > 1) out.push(`${c}×${n}`);
    }
    return out;
  }

  // 読み合いの中で進んでいるか（卓の状態は止まったままなので、中身の変化で見る）
  function readBattleMark() { const h = document.querySelector('.read-battle-host'); return h ? 'rb' + h.innerHTML.length : ''; }
  function signature() {
    const { S } = G();
    const ov = TAP_OVERLAYS.concat(DUP_WATCH.map(c => '.' + c)).map(s => [...document.querySelectorAll(s)].filter(vis).length ? s : '').filter(Boolean).join(',');
    if (!S) return 'boot';
    return [S.screen, S.opponentId, S.handPhase, S.handNo, S.isPlayerTurn ? 1 : 0, S.playerChips, S.opponentChips, S.pot, S.psychPending ? 1 : 0, S.introHandMode ? 1 : 0, S.lectureMode ? 1 : 0, ov, readBattleMark()].join('|');
  }

  function snapshot() {
    const { S, V } = G();
    return {
      screen: S && S.screen, opp: S && S.opponentId, phase: S && S.handPhase, hand: S && S.handNo,
      turn: S && S.isPlayerTurn, pc: S && S.playerChips, oc: S && S.opponentChips, pot: S && S.pot,
      intro: !!(S && S.introHandMode), lecture: !!(S && S.lectureMode), tutorial: !!(S && S.tutorialMode),
      cleared: V && V.clearedStages ? V.clearedStages.slice() : [], coins: V && V.coins,
      ending: (() => { try { return isEndingUnlocked(); } catch (e) { return false; } })(),
    };
  }

  function step(policy = 'learner') {
    const { S } = G();
    const res = { sig: signature(), snap: snapshot(), dup: dupOverlays(), did: null };
    const cands = candidates();

    // 0) 読み合い（battles/）：中の押せる物をでたらめに押して結果まで進め、結果の「卓にもどる」を押す
    const rb = document.querySelector('.read-battle-host');
    if (rb) {
      const okEl = (e) => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || e.disabled || e.closest('[hidden]')) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false; const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
      const all = [...rb.querySelectorAll('*')].filter(e => e.tagName === 'BUTTON' || (getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')));
      const off = all.filter(e => !okEl(e) && e.getBoundingClientRect().width > 4 && !e.disabled);
      let vis2 = all.filter(okEl);
      if (!vis2.length && off.length) { off[0].scrollIntoView({ block: 'center' }); vis2 = all.filter(okEl); }
      const exitBtn = vis2.find(e => /卓にもどる/.test(e.textContent || ''));
      if (exitBtn) return click(exitBtn, 'read-exit', res);
      const btns2 = vis2.filter(e => e.tagName === 'BUTTON');
      const pool2 = btns2.length && rnd() < 0.5 ? btns2 : vis2;
      if (pool2.length) return click(pool2[Math.floor(rnd() * pool2.length)], 'read-battle', res);
      res.waitAction = 'read-battle'; return res;
    }
    // 1) 心理・論理バトルの選択肢
    const choice = cands.filter(el => el.classList.contains('choice-btn'));
    if (choice.length) { const p = pickPsych(choice, policy, S); return click(p.el, p.why, res); }
    // 2) 講義のハンズオン・圧倒モードの三択
    const ho = cands.filter(el => el.classList.contains('ho-choice-btn'));
    if (ho.length) return click(ho[0], 'hands-on', res);
    const dom = cands.filter(el => el.classList.contains('dominance-choice-btn'));
    if (dom.length) return click(dom[0], 'dominance', res);

    // 3) 卓でのミミの手番（相手のベット演出などが上に出ていれば、先にそれを送る）
    const cover = TAP_OVERLAYS.map(s => [...document.querySelectorAll(s)].filter(vis).pop()).find(el => el && hittable(el));
    if (S && S.screen === 'battle' && cover && !cands.some(el => el.classList.contains('choice-btn'))) {
      const blocked = cands.filter(el => el.classList.contains('action-slot') || el.classList.contains('verb-btn')).length;
      res.coverOverActions = blocked ? desc(cover).slice(0, 60) : null;
      return click(cover, 'tap-cover', res);
    }
    if (S && S.screen === 'battle') {
      const acts = cands.filter(el => /^(player-|open-bet-chooser|close-bet-chooser)/.test(el.dataset.action || '') && (el.classList.contains('action-slot') || el.classList.contains('verb-btn') || el.classList.contains('verb-size') || el.classList.contains('verb-back')));
      const topHasOverlay = cands.some(el => !el.closest('.battle-screen'));
      if (acts.length && !topHasOverlay) { const a = battleAction(acts, policy, S); if (a.el) return click(a.el, a.why, res); res.waitAction = a.why; return res; }
    }

    // 4) ロビー：次の卓
    if (S && S.screen === 'lobby') {
      const next = document.querySelector('.lb8-seat .lb8-cta');
      const hit = next && next.closest('.lb8-seat') && next.closest('.lb8-seat').querySelector('.lb8-hit');
      const overlayUp = cands.some(el => !el.closest('.lobby-screen'));
      if (hit && !overlayUp && vis(hit) && hittable(hit)) return click(hit, 'lobby-next', res);
    }

    // 5) 名前で選ぶボタン
    let best = null, bestScore = -1;
    for (const el of cands) {
      const act = el.dataset ? el.dataset.action : '';
      const t = label(el);
      if (act && AVOID_ACTION.has(act) && !(act === 'back-lobby' && /ロビーへ/.test(t) && S && (S.screen === 'result' || S.screen === 'ending'))) continue;
      if (AVOID_TEXT.test(t) && !(act && PREFER_ACTION[act])) continue;
      if (el.classList.contains('action-slot') || el.classList.contains('verb-btn') || el.classList.contains('verb-size') || el.classList.contains('verb-back')) continue;
      let sc = 1;
      if (act && PREFER_ACTION[act] != null) sc = Math.max(sc, PREFER_ACTION[act]);
      for (const [re, v] of PREFER) if (re.test(t)) sc = Math.max(sc, v);
      if (act === 'back-lobby') sc = Math.max(sc, 3);
      if (sc > bestScore || (sc === bestScore)) { best = el; bestScore = sc; } // 同点は後ろ（上に重なっている側）を優先
    }
    if (best && bestScore >= 3) return click(best, 'button', res);

    // 6) タップで進む演出
    for (const s of TAP_OVERLAYS) {
      const el = [...document.querySelectorAll(s)].filter(vis).pop();
      if (el) {
        const { x, y } = center(el);
        const h = document.elementFromPoint(x, y);
        if (h && (h === el || el.contains(h))) return click(el, 'tap:' + s, res);
      }
    }
    if (best) return click(best, 'weak-button', res);
    // 7) スクロールしないと見えない主ボタン（それ自体が不具合なので記録してから見える所へ出す）
    const hidden = [...document.querySelectorAll('button, [data-action]')].filter(el => {
      if (el.disabled) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const t = label(el);
      if (AVOID_TEXT.test(t)) return false;
      return !hittable(el) && PREFER.some(([re]) => re.test(t));
    });
    if (hidden.length) {
      const el = hidden[hidden.length - 1];
      res.needsScroll = desc(el);
      el.scrollIntoView({ block: 'center' });
      return res;
    }
    res.did = null;
    return res;
  }

  function click(el, why, res) {
    const { x, y } = center(el);
    res.did = { why, what: desc(el), x: Math.round(x), y: Math.round(y) };
    return res;
  }

  // 画面に見えている文字を集める（未習語の監査用）
  const seenText = new Set();
  function collectText() {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t.length < 2) continue;
      const p = n.parentElement;
      if (!p || !vis(p)) continue;
      const k = t;
      if (seenText.has(k)) continue;
      seenText.add(k);
      const cls = (p.className && typeof p.className === 'string') ? p.className.split(/\s+/)[0] : p.tagName.toLowerCase();
      out.push({ t, cls });
    }
    return out;
  }

  window.__qaBot = { step, snapshot, signature, collectText, candidates: () => candidates().map(desc) };
})();
