// 画面切り替え検査の流れ（2）：ホームの窓・タイトル往復・勝ち負け・講義・零時の卓・エンディング
export function install({ FLOWS, drive, startGame, warmBattle, stateLine, SAVE1, today, ALL5 }) {
  const waitFor = async (c, js, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await c.page.eval(js).catch(() => false)) return true; await c.wait(150); } return false; };
  const step = async (c, label, fn) => { try { const r = await fn(); if (r === false) { c.failed.push(label); console.log('   x', label); } return r; } catch (e) { c.failed.push(label + ': ' + String(e.message).slice(0, 80)); console.log('   x', label, String(e.message).slice(0, 80)); return false; } };
  const lobbyUp = (c, ms = 40000) => waitFor(c, `state.screen === 'lobby' && !!document.querySelector('.h15-ticket .h15-en') && !document.querySelector('.loading-veil.on')`, ms);
  // いちばん上の窓を閉じる：閉じるボタン → なければ Escape
  const closeTop = async (c) => {
    const r = await c.page.eval(`(() => {
      const ovs = [...document.querySelectorAll('#stage > *, body > *')].filter(e => e.id !== 'app' && /overlay|modal|dialog|layer/.test(e.className || '') && e.getBoundingClientRect().width > 50 && getComputedStyle(e).display !== 'none');
      const top = ovs[ovs.length - 1]; if (!top) return 'none';
      const b = [...top.querySelectorAll('button, [data-action]')].find(b => /close|cancel|back/.test(b.dataset.action || '') || /^(×|✕|閉じる|戻る|もどる|キャンセル|やめる)/.test((b.getAttribute('aria-label') || b.title || b.textContent || '').trim()) || /close/.test(b.className || ''));
      if (b) { b.click(); return 'btn:' + String(top.className).split(' ')[0]; }
      return 'esc:' + String(top.className).split(' ')[0];
    })()`);
    if (r.startsWith('esc')) await c.key('Escape');
    return r;
  };
  const warmAll = async (c) => { for (let i = 0; i < 160; i++) { const ok = await c.page.eval(`(() => { const s = MimiAssets.stats(); return s.queued + s.loading === 0; })()`).catch(() => true); if (ok) return; await c.wait(500); } };

  // ================= 4. ホームの各窓 =================
  FLOWS.home_menus = async (c) => {
    await c.ready(); await startGame(c); await lobbyUp(c); await warmAll(c); await c.wait(2000);
    await step(c, '交換所を開く', async () => { await c.act('open-shop'); return waitFor(c, `state.screen === 'shop' && !document.querySelector('.loading-veil')`, 40000); });
    await c.wait(2500);
    await step(c, '交換所から戻る', async () => { await c.act('back-lobby'); return lobbyUp(c); }); await c.wait(2000);
    for (const [a, name] of [['open-collection', 'コレクション'], ['home-settings', '設定'], ['home-ledger', '物語の台帳'], ['char-profile', '名鑑'], ['panyu-free', 'ぱにゅぱにゅ'], ['open-rico-viewer', '衣装'], ['rico-mode-chooser', 'リコの教室の選択'], ['equip-change', '装備'], ['home-gift', 'ログボ']]) {
      await step(c, name + 'を開く', async () => { await c.act(a); await c.wait(1800); return true; });
      await step(c, name + 'を閉じる', async () => { const r = await closeTop(c); console.log('   close', name, r); await c.wait(1800); return true; });
    }
  };
  FLOWS.home_menus.sessionOpts = () => ({ save: { ...SAVE1, ownedItems: ['outfit_rico_bunny'] } });

  // ================= 7. タイトル ↔ ホーム =================
  FLOWS.title_home = async (c) => {
    await c.ready(); await c.wait(1500);
    await step(c, '続きから', async () => { await startGame(c); return lobbyUp(c); }); await c.wait(2500);
    await step(c, 'タイトルへ戻る', async () => { await c.act('back-title'); return waitFor(c, `state.screen === 'title'`, 15000); }); await c.wait(3500);
    await step(c, '続きから2', async () => { await startGame(c); return lobbyUp(c); }); await c.wait(2500);
    await step(c, 'タイトルへ戻る2', async () => { await c.act('back-title'); return waitFor(c, `state.screen === 'title'`, 15000); }); await c.wait(3000);
  };
  FLOWS.title_home.sessionOpts = () => ({ save: SAVE1 });
  // ログインボーナスがある日（今日まだ受け取っていない）
  FLOWS.title_home_bonus = async (c) => {
    await c.ready(); await c.wait(1500);
    await step(c, '続きから', async () => { await startGame(c); return waitFor(c, `!!document.querySelector('.login-bonus-overlay') || (state.screen === 'lobby' && !!document.querySelector('.h15-ticket .h15-en'))`, 60000); }); await c.wait(2500);
    await step(c, 'ログボ受取', async () => { const ok = await c.click('受け取る'); await c.wait(3000); return ok; });
    await lobbyUp(c); await c.wait(2500);
  };
  FLOWS.title_home_bonus.sessionOpts = () => { const s = { ...SAVE1 }; delete s.loginBonus; return { save: s }; };

  // ================= 2・3. 今夜の卓 → 勝ち／負け =================
  const toBattle = async (c, id = 'polka') => {
    await step(c, '続きから', async () => { await startGame(c); return lobbyUp(c); }); await c.wait(2500);
    await warmBattle(c, id);
    await step(c, '今夜の卓へ', async () => { await c.act('battle-start'); return waitFor(c, `!!document.querySelector('.episode-overlay')`, 15000); }); await c.wait(3000);
    await step(c, '扉絵→卓', async () => { await c.clickSel('.episode-continue'); return waitFor(c, `state.screen === 'battle' && !document.querySelector('.episode-overlay')`, 30000); }); await c.wait(3500);
  };
  const finishBattle = (c, win) => c.page.eval(`(() => { document.querySelectorAll('.read-battle-host,.battle-modal-overlay,.coach-layer,.mk-layer').forEach(e => e.remove()); state.psychPending = false; ${win ? 'state.playerChips = 2400; state.opponentChips = 0;' : 'state.playerChips = 0; state.opponentChips = 2400;'} endBattle(); return true; })()`);
  FLOWS.win_flow = async (c) => {
    await c.ready();
    await toBattle(c, 'polka');
    await finishBattle(c, true);
    await step(c, '結果が出る', () => waitFor(c, `state.screen === 'result'`, 20000)); await c.wait(3500);
    console.log('   result', await c.state());
    const ok = await drive(c, `state.screen === 'lobby' && !!document.querySelector('.h15-ticket .h15-en')`, { maxMs: 240000, extra: ['幕間へ', 'ロビーへ|ホームへ|もどる|戻る', '次へ|つづける|続ける|閉じる'], log: true });
    if (!ok) c.failed.push('ホームまで戻れなかった');
    await c.wait(5000); await stateLine(c);
  };
  FLOWS.win_flow.sessionOpts = () => ({ save: SAVE1 });
  FLOWS.lose_flow = async (c) => {
    await c.ready();
    await toBattle(c, 'polka');
    await finishBattle(c, false);
    await step(c, '結果が出る', () => waitFor(c, `state.screen === 'result'`, 20000)); await c.wait(3500);
    console.log('   lost result', await c.state());
    await step(c, '再挑戦', async () => { const ok = await c.act('rematch') || await c.click('もう一度') || await c.click('リベンジ') || await c.click('再挑戦'); await c.wait(1000); return ok; });
    await waitFor(c, `state.screen === 'battle' && !document.querySelector('.episode-overlay')`, 40000); await c.wait(3500);
    console.log('   rematch', await c.state());
    await finishBattle(c, false);
    await step(c, '2回目の結果', () => waitFor(c, `state.screen === 'result'`, 20000)); await c.wait(3000);
    await step(c, 'ホームへ', async () => { const ok = await c.act('back-lobby') || await c.click('ロビーへ'); return ok && lobbyUp(c, 40000); }); await c.wait(4000);
    await stateLine(c);
  };
  FLOWS.lose_flow.sessionOpts = () => ({ save: SAVE1 });

  // 連写：扉絵の「進む」を押した直後を、スクリーンショットを続けて撮って並べる（見えた物の根拠用）
  FLOWS.episode_burst = async (c) => {
    await c.ready(); await toBattle0(c);
    const fs = await import('node:fs'); const path = await import('node:path');
    await c.clickSel('.episode-continue'); const t0 = Date.now();
    for (let i = 0; i < 14; i++) {
      const r = await c.page.send('Page.captureScreenshot', { format: 'jpeg', quality: 35 });
      const st = await c.page.eval("state.screen + '|' + [...document.querySelectorAll('#stage > *')].map(e => String(e.className).split(' ')[0] || e.id).join(',')").catch(() => '');
      const f = path.join(c.dir, 'burst_' + String(i).padStart(2, '0') + '_' + (Date.now() - t0) + 'ms.jpg');
      fs.writeFileSync(f, Buffer.from(r.data, 'base64')); console.log('   ', i, Date.now() - t0, st);
    }
  };
  FLOWS.episode_burst.sessionOpts = () => ({ save: SAVE1 });
  const toBattle0 = async (c) => {
    await step(c, '続きから', async () => { await startGame(c); return lobbyUp(c); }); await c.wait(2500);
    await warmBattle(c, 'polka');
    await step(c, '今夜の卓へ', async () => { await c.act('battle-start'); return waitFor(c, "!!document.querySelector('.episode-overlay')", 15000); }); await c.wait(3500);
  };

  // ================= 4. 講義（リコの教室）→ 中断 =================
  FLOWS.lecture = async (c) => {
    await c.ready(); await startGame(c); await lobbyUp(c); await warmBattle(c, 'rico_tutorial'); await c.wait(2000);
    await step(c, '教室を選ぶ', async () => { await c.act('rico-mode-chooser'); await c.wait(1500); return c.act('rico-mode-tutorial'); });
    await step(c, '講義の画面', () => waitFor(c, `state.screen === 'battle' && !!state.lectureMode`, 40000)); await c.wait(4000);
    console.log('   lecture', await c.state());
    await step(c, '中断', async () => { await c.act('back-lobby'); await c.wait(1500); const ok = await c.click('中断してロビーへ') || await c.click('中断'); return ok && lobbyUp(c, 40000); });
    await c.wait(4000); await stateLine(c);
  };
  FLOWS.lecture.sessionOpts = () => ({ save: SAVE1 });

  // ================= 4. 物語の台帳 → 再戦・回想 =================
  FLOWS.ledger = async (c) => {
    await c.ready(); await startGame(c); await lobbyUp(c); await warmAll(c); await c.wait(1500);
    await step(c, '台帳', async () => { await c.act('home-ledger'); await c.wait(2000); console.log('   ', await c.page.eval(`JSON.stringify([...document.querySelectorAll('.home-overlay [data-action]')].map(b => b.dataset.action + ':' + (b.dataset.opponent||'') + ':' + b.textContent.trim().slice(0, 8)))`)); return true; });
    await step(c, '回想', async () => { const ok = await c.act('recall-episode'); await c.wait(3500); console.log('   recall', await c.state()); return ok; });
    await step(c, '回想を閉じる', async () => { await drive(c, `!document.querySelector('.episode-overlay, .story-overlay')`, { maxMs: 30000, extra: ['戻る', '閉じる'] }); await c.wait(2000); return true; });
    console.log('   after recall', await c.state());
    await step(c, '再戦', async () => { if (!(await c.page.eval(`!!document.querySelector('.home-overlay')`))) await c.act('home-ledger'); await c.wait(1500); const ok = await c.page.eval(`(() => { const b = document.querySelector('.home-overlay [data-action="battle-start"]'); if (b) { b.click(); return true; } return false; })()`); await c.wait(3000); console.log('   rematch', await c.state()); return ok; });
    await drive(c, `state.screen === 'battle' && !document.querySelector('.episode-overlay')`, { maxMs: 40000, extra: [], log: true });
    await c.wait(3000); await stateLine(c);
  };
  FLOWS.ledger.sessionOpts = () => ({ save: { ...SAVE1, clearedStages: ['rico_tutorial', 'polka'], homeStageSeen: 2, firstClearRewardClaimed: ['rico_tutorial', 'polka'], rewardCgSeen: ['rico_tutorial', 'polka'], episodesSeen: ['rico_tutorial', 'polka'] } });

  // ================= 5. 零時の卓 =================
  const ALLSAVE = () => ({ loginBonus: { lastDate: today(), streak: 1 }, introPlayed: true, clearedStages: ALL5, firstClearRewardClaimed: ALL5, rewardCgSeen: ALL5, episodesSeen: ALL5, readIntroSeen: true, houseRulesSeen: true, coins: 2400, homeStageSeen: 5, bestRanks: { rico_tutorial: 'A', polka: 'A', selina: 'B', grano: 'A', velvet: 'A' }, endingUnlocked: true, allstarUnlocked: true, allstar: { unlockSeen: true } });
  FLOWS.allstar = async (c) => {
    await c.ready(); await c.page.eval(`new Promise(r => { const t = setInterval(() => { if (window.AllstarUI) { clearInterval(t); r(true); } }, 200); })`);
    await step(c, '続きから', async () => { await startGame(c); return lobbyUp(c); }); await warmAll(c); await c.wait(2500);
    await step(c, '零時の卓の入口', async () => { await c.act('allstar-open'); return waitFor(c, `!!document.querySelector('.as-entry')`, 15000); }); await c.wait(2000);
    await step(c, '着席', async () => { await c.clickSel('.as-entry [data-action="allstar-seat"]'); return waitFor(c, `!!document.querySelector('.as-open.on')`, 20000); });
    await waitFor(c, `!document.querySelector('.as-open')`, 40000); await c.wait(2500);
    // 1ハンド：ミミの手番を待って、コール
    await step(c, 'ミミの手番', () => waitFor(c, `AllstarUI._qa.waiting()`, 90000));
    await c.wait(1500);
    await c.page.eval(`AllstarUI._qa.actMimi('call'); true`);
    for (let i = 0; i < 120; i++) { if (await c.page.eval(`!!AllstarUI._qa.T() && AllstarUI._qa.T().handNo >= 2`).catch(() => false)) break; if (await c.page.eval(`AllstarUI._qa.waiting()`).catch(() => false)) await c.page.eval(`AllstarUI._qa.actMimi('call'); true`); await c.wait(500); }
    await c.wait(2000);
    await step(c, '中断してホームへ', async () => { await c.clickSel('.as-tool[data-as="menu"]'); await c.wait(900); await c.clickSel('.as-menu [data-as="leave"]'); return lobbyUp(c, 40000); }); await c.wait(3500);
    await step(c, '続きから（零時）', async () => { await c.act('allstar-resume'); return waitFor(c, `!!document.querySelector('.as-host')`, 20000); }); await c.wait(5000);
    await step(c, 'もう一度ホームへ', async () => { await c.clickSel('.as-tool[data-as="menu"]'); await c.wait(900); await c.clickSel('.as-menu [data-as="leave"]'); return lobbyUp(c, 40000); }); await c.wait(3000);
  };
  FLOWS.allstar.sessionOpts = () => ({ save: ALLSAVE() });

  // ================= 6. エンディング =================
  FLOWS.ending = async (c) => {
    await c.ready();
    const FOUR = ['rico_tutorial', 'polka', 'selina', 'grano'];
    await c.page.eval(`(() => { save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(FOUR)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages, 'velvet']; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = 4; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; saveProgress(); return true; })()`);
    await c.page.eval(`(() => { state = defaultState(); startBattle('velvet'); return true; })()`); await c.wait(5000);
    for (let i = 0; i < 6; i++) { await c.page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click(); return true; })()`); await c.wait(700); }
    await finishBattle(c, true);
    await step(c, '結果が出る', () => waitFor(c, `state.screen === 'result'`, 30000)); await c.wait(4000);
    await drive(c, `!!document.querySelector('.ending-final-buttons button')`, { maxMs: 600000, extra: ['幕間へ', '開始', '流さない', 'つづける|続ける|次へ|進む|はじめる|閉じる'], log: false, tapMid: true, idleMax: 5000 });
    await c.wait(3000); console.log('   ending end', await c.state());
    await step(c, 'ロビーへ', async () => { await c.clickSel('.ending-final-buttons [data-action="back-lobby"]'); return lobbyUp(c, 60000); }); await c.wait(8000);
    await step(c, 'スタッフロール再生', async () => { await c.act('open-collection'); await c.wait(1500); await c.page.eval(`document.querySelectorAll('.collection-overlay').forEach(e => e.remove())`); await c.page.eval(`onAction({ currentTarget: { dataset: { action: 'play-credits' } }, preventDefault(){}, stopPropagation(){}, target: document.body }); true`); await c.wait(30000); return true; });
    console.log('   credits', await c.state());
    await c.page.eval(`(() => { const b = document.querySelector('.ending-final-buttons [data-action="back-lobby"], [data-action="back-title"], [data-action="back-lobby"]'); if (b) b.click(); return true; })()`); await c.wait(6000);
    await step(c, 'タイトルへ', async () => { await c.act('back-title'); return waitFor(c, `state.screen === 'title'`, 20000); }); await c.wait(3500);
  };
}
