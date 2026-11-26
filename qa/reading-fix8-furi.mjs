// リーディング「押し出すふり」を、ポルカ・グラーノ・セリナ・ヴェルベットの卓で通す（2026-11-17）。
// （2026-11-17 Codex 2回目の直し版：押し方の2択。fix8_ で始まる写真）
// node qa/reading-fix8-furi.mjs <場面|all> [WxH] [nodemo] [1|2]   最後の 1｜2＝押し方（1＝ちょい押し・2＝ぐい押し。既定 1）   場面：polka_bluff polka_real polka_realwon grano_real grano_bluff selina_real selina_bluff velvet_real velvet_bluff
// 相手の賭け（bluff/value・2/3ポット）だけ差し替え。ボタンが出るか・押したあとの流れ・卓のコール／フォールド・手の後の答え合わせは本物のコード。
import { open, OUT } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [mode = 'polka_bluff', size = '844x390'] = process.argv.slice(2);
const PUSH = process.argv[5] === '2' ? 2 : 1;
const [W, H] = size.split('x').map(Number);

const SCN = {
  polka_bluff: { opp: 'polka', board: 'Ks 9d 6c 4h 2s', her: 'Qh Jh', mine: '9s 8s', intent: 'bluff', pick: '払う' },
  polka_real: { opp: 'polka', board: 'Ah Th 7c 4h 2d', her: 'Kh 8h', mine: 'Ac Td', intent: 'value', pick: '降りる' },
  polka_realwon: { opp: 'polka', board: 'Kd 9c 6s 3h 2c', her: 'Kc 9d', mine: '6d 6h', intent: 'value', pick: '払う' },
  polka_back: { opp: 'polka', board: 'Kd 9c 6s 3h 2c', her: 'Kc 9d', mine: '6d 6h', intent: 'value', pick: '卓' },
  grano_real: { opp: 'grano', board: 'Ah Th 7c 4h 2d', her: 'Kh 8h', mine: 'Ac Td', intent: 'value', pick: '降りる' },
  grano_bluff: { opp: 'grano', board: 'Ks 9d 6c 4h 2s', her: 'Qh Jh', mine: '9s 8s', intent: 'bluff', pick: '払う' },
  selina_real: { opp: 'selina', board: 'Kd 9c 6s 3h 2c', her: 'Kc 9d', mine: '6d 6h', intent: 'value', pick: '払う' },
  selina_bluff: { opp: 'selina', board: 'Ks 9d 6c 4h 2s', her: 'Qh Jh', mine: '9s 8s', intent: 'bluff', pick: '降りる' },
  velvet_real: { opp: 'velvet', board: 'Ah Th 7c 4h 2d', her: 'Kh 8h', mine: 'Ac Td', intent: 'value', pick: '降りる' },
  velvet_bluff: { opp: 'velvet', board: 'Ks 9d 6c 4h 2s', her: 'Qh Jh', mine: '9s 8s', intent: 'bluff', pick: '払う' },
};

async function run(which, first) {
  const sc = SCN[which];
  const T = await open(sc.opp, { W, H, save: first ? {} : { rdDemo: { furi: true, mekiki: true, igi: true } } });
  const { ev, log, shot, waitFor, q, click, page, close } = T;
  const tag = 'fix8_furi_' + which + '_m' + PUSH;
  log(`--- ${which}`);
  await T.bet({ phase: 'river', board: sc.board, her: sc.her, mine: sc.mine, pot: 600, intent: sc.intent, rdCount: { igi: 3 } });   // 異議あり（ポルカ）が先に出ると、同じ手ではふりが出ない。ここではふりだけを見るので、異議ありは出し切った扱い
  await sleep(1600);
  await ev(`if (typeof dismissCutIn === 'function') dismissCutIn(); document.querySelectorAll('.opp-cutin, .opponent-cutin, .cutin-overlay').forEach(e => e.remove()); return 1;`);   // 相手の大ベットのカットイン（画面の一番上）を閉じる
  await sleep(600);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, turn: state.isPlayerTurn, pp: state.psychPending, avail: rdFuriAvailable(), btn: !!document.querySelector('[data-action="rd-furi"]'), cnt: state.rdCount })`));
  await waitFor(`!!document.querySelector('[data-action="rd-furi"]')`, 8000); await sleep(600);
  await shot(tag, 'table_button');
  await ev(`document.querySelector('[data-action="rd-furi"]').click(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 10000); await sleep(400);
  if (first) {
    await shot(tag, 'demo_intro');
    await waitFor(q('.sg.demo .modes.on'), 20000); await sleep(1500); await shot(tag, 'demo_modes');
    await click('.sg.demo .mode.m1');
    await waitFor(q('.sg.demo .lane.on'), 10000); await sleep(1500); await shot(tag, 'demo_lane');
    const dtap = () => ev(`const p = document.querySelector('.rd-host .sg.demo .pile'); const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); return 1;`);
    await dtap(); await sleep(800); await dtap(); await sleep(1800);
    await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot(tag, 'demo_stop_tell');
    await waitFor(q('.sg.demo .opts.on'), 40000); await sleep(1500); await shot(tag, 'demo_pick');
    await click('.sg.demo .opt[data-a="払う"]');
    await waitFor(q('.sg.demo .ins.good'), 40000); await sleep(2500); await shot(tag, 'demo_reveal');
    await waitFor(q('.sg.demo .rico.on'), 40000); await sleep(800); await shot(tag, 'demo_l4');
    await sleep(4200); await shot(tag, 'demo_l5_gui');
    await waitFor(q('.sg.demo .panel.on'), 40000); await sleep(300); await shot(tag, 'demo_card4');
    await click('.sg.demo .pgo');
  } else {
    // この相手の初回：決まりの1枚
    if (await waitFor(q('.sg.demo .panel.on'), 4000)) { await sleep(300); await shot(tag, 'rule_card'); await click('.sg.demo .pgo'); }
  }
  await waitFor(q('.sg.live .modes.on'), 20000); await sleep(800);
  await shot(tag, 'live_modes');
  await ev(`document.querySelector('.rd-host .sg.live .mode.m${PUSH}').click(); return 1;`);
  await waitFor(q('.sg.live .lane.on'), 20000); await sleep(800);
  await shot(tag, 'live_bet');
  const tap = () => ev(`const p = document.querySelector('.rd-host .sg.live .pile'); const o = { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }; p.dispatchEvent(new PointerEvent('pointerdown', o)); p.dispatchEvent(new PointerEvent('pointerup', o)); return 1;`);
  await tap(); await sleep(900); await shot(tag, 'live_mid');
  await tap(); await sleep(1800); await shot(tag, 'live_near');
  await waitFor(q('.sg.live .opts.on'), 8000); await sleep(900);
  await shot(tag, 'live_pick');
  if (first || true) { if (await ev(`return !!document.querySelector('.rd-host .sg.live .askrico.on')`)) { await click('.sg.live .askrico'); await sleep(500); await shot(tag, 'live_coach'); await click('.sg.live .rico'); } }
  await ev(`document.querySelector('.rd-host .sg.live .opt[data-a="${sc.pick}"]').click(); return 1;`);
  await waitFor(`!document.querySelector('.rd-host')`, 10000);
  await sleep(1500);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, turn: state.isPlayerTurn, pending: state.pendingRead && { game: state.pendingRead.game, pick: state.pendingRead.pick, ans: state.pendingRead.ans }, cnt: state.rdCount, thought: state.mimiThought, hand: state.handNo, chips: [state.playerChips, state.opponentChips] })`));
  await shot(tag, 'table_back');
  if (sc.pick === '卓') { await waitFor(`state.isPlayerTurn`, 8000); log('卓で決める', await ev(`return JSON.stringify({ btn: !!document.querySelector('[data-action="rd-furi"]'), pending: !!state.pendingRead })`)); await ev(`playerCheckCall(); return 1;`); }
  // 卓のコール／フォールドが走る → 手が終わる → 手の後の答え合わせ
  await T.restoreAI();
  await waitFor(`[...document.querySelectorAll('button')].some(b => /次のハンド/.test(b.textContent) && b.offsetParent)`, 40000);
  await sleep(800); await shot(tag, 'hand_result');
  log('手の結果の答えの欄', await ev(`return JSON.stringify({ hrRead: !!document.querySelector('.hand-result-overlay .hr-read'), text: (document.querySelector('.hand-result-overlay .hr-read') || {}).innerText || '', pend: !!state.pendingRead })`));
  const h0 = await ev('return state.handNo');
  await T.nextHand(); await sleep(3500);
  log('次のハンド', await ev(`return JSON.stringify({ hand: state.handNo, was: ${h0}, board: !!document.querySelector('.rd-host'), panyu: state.panyu, success: state.psychSuccessCount })`));
  await close();
}
const list = mode === 'all' ? Object.keys(SCN) : [mode];
let first = process.argv[4] !== 'nodemo';   // 4つ目の引数 nodemo＝お手本は見た後（2回目の対戦）
for (const m of list) { await run(m, first && m.startsWith('polka')); first = false; }
process.exit(0);
