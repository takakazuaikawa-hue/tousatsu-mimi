// リーディング「異議あり」をポルカ戦の卓で通す（2026-11-17）。node qa/reading-igi.mjs [hit|miss|oX|oOk|all] [WxH]
//  hit ：初回（お手本が自動）→ 本番 → 異議あり（当たり）→ 卓に戻る（ポルカの札が1枚表）
//  miss：2回目（お手本は右上のボタン）→ 作れる場札に異議あり（外れ）→ 卓に戻る（ミミの札が「見せた」）
//  oX  ：ウソの言い分を「作れる」と見送る → 卓へ → 手の後の答え合わせ（盛っていたのに見逃した）
//  oOk ：作れる言い分を「作れる」→ 卓へ → 手の後の答え合わせ（正しく見た）
// 相手の賭けは decideOpponentAction だけ差し替え（bluff/value・2/3ポット）。出るかどうかは本物の maybeRdAfterBet の判定。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [mode = 'all', size = '844x390'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);

const SC = {
  // ターン：ポルカ Qh 6h・場 Ks 9h 4h 2c（♥は手と場で4枚・場には2枚）→ フラッシュは作れない
  hit: { phase: 'turn', board: 'Ks 9h 4h 2c', her: 'Qh 6h', mine: 'Ad Jc', pot: 400, intent: 'bluff' },
  // リバー：ポルカ Kc 5c（本当のフラッシュ）・場 Qc 9d 8c 4s 2c（♣3枚）→ 作れる
  miss: { phase: 'turn', board: 'Qc 9d 8c 2c', her: 'Kc 5c', mine: 'Ad Jh', pot: 400, intent: 'value' },   // 異議ありはターンだけ（11/17 2回目 指摘4）
  // リバー：ポルカ 9s 8c（6・7・8・9）・場 6c 7d Js Qh 2d → ストレートは作れない（4つ続きで届かなかった）
  oX: { phase: 'turn', board: '6c 7d Js Qh', her: '9s 8c', mine: 'Ah Qd', pot: 500, intent: 'bluff' },
  oOk: { phase: 'turn', board: 'Qc 9d 8c 2c', her: 'Kc 5c', mine: 'Ad Jh', pot: 400, intent: 'value' },
};

async function run(which) {
  const T = await open('polka', { W, H, save: which === 'hit' ? {} : { rdDemo: { igi: true } } });
  const { ev, log, shot, waitFor, q, click, close } = T;
  const tag = 'fix8_igi_' + which;
  const sc = SC[which];
  log(`--- ${which}`);
  await ev(`window.__r0 = window.__r0 || rand; rand = () => 0.01; return 1;`);   // 「作れる」が正解の場は3割だけ出す乱数を、出る側に固定
  await T.bet(sc);
  await sleep(300); await ev(`rand = window.__r0; return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await sleep(400);
  log('出た', await ev(`return JSON.stringify({ cnt: state.rdCount, readHand: state.readHandNo, phase: state.handPhase, pp: state.psychPending })`));
  if (which === 'hit') {
    await shot(tag, 'demo_intro');
    await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot(tag, 'demo_stop1');
    await waitFor(q('.sg.demo .sl.miss'), 25000); await sleep(600); await shot(tag, 'demo_stop2');
    await waitFor(q('.sg.demo .band.on'), 25000); await sleep(500); await shot(tag, 'demo_band');
    await waitFor(q('.sg.demo .sl.open'), 25000); await sleep(800); await shot(tag, 'demo_reveal');
    await waitFor(q('.sg.demo .panel.on'), 40000); await sleep(300); await shot(tag, 'demo_card4');
    log('お手本を見た印', await ev(`return JSON.stringify(save.rdDemo)`));
    await click('.sg.demo .pgo');
  } else await shot(tag, 'live_intro_nodemo');
  await waitFor(q('.sg.live .claim.on'), 20000); await sleep(1200); await shot(tag, 'live_claim');
  await waitFor(q('.sg.live .opts.on'), 20000); await sleep(1500); await shot(tag, 'live_pick');
  if (which === 'hit') { await click('.sg.live .askrico'); await sleep(500); await shot(tag, 'live_coach'); await click('.sg.live .rico'); }
  const ans = JSON.parse(await ev(`return JSON.stringify(document.querySelector('.rd-host .sg.live .claim .ctext').textContent)`));
  log('言い分', ans);
  const pickX = which === 'hit' || which === 'miss';
  await ev(`document.querySelector('.rd-host .sg.live .opt[data-a="${pickX ? 'X' : 'O'}"]').click(); return 1;`);
  if (pickX) {
    await waitFor(q('.sg.live .band.on'), 5000); await sleep(400); await shot(tag, 'live_band');
    await waitFor(q('.sg.live .sl.miss, .sg.live .sl.full'), 8000); await sleep(1200); await shot(tag, 'live_slots');
    await waitFor(q('.sg.live .sl.open, .sg.live .mimi.on'), 10000); await sleep(1200); await shot(tag, 'live_reveal');
  } else {
    await sleep(1500); await shot(tag, 'live_hide');
  }
  await waitFor(q('.sg.live .go.on'), 8000);
  await click('.sg.live .go');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  await sleep(1500);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, turn: state.isPlayerTurn, open: state.rdOpen, shown: state.rdShown, pending: state.pendingRead && { game: state.pendingRead.game, pick: state.pendingRead.pick, ans: state.pendingRead.ans }, panyu: state.panyu, success: state.psychSuccessCount, thought: state.mimiThought })`));
  await waitFor(`state.isPlayerTurn`, 10000); await sleep(800);
  await shot(tag, 'table_back');
  log('相手の札（表の数）', await ev(`return document.querySelectorAll('.opponent-hand .card:not(.card-back), [data-bind="opponentHand"] .card:not(.card-back)').length`));
  log('見せた札', await ev(`return document.querySelectorAll('.rd-shown').length`));
  if (!pickX) {
    await T.restoreAI();
    await ev(`playerFold(); return 1;`); await sleep(1800); await shot(tag, 'hand_result');
    log('手の結果の答えの欄', await ev(`return JSON.stringify({ hrRead: !!document.querySelector('.hand-result-overlay .hr-read'), text: (document.querySelector('.hand-result-overlay .hr-read') || {}).innerText || '', pend: !!state.pendingRead })`));
    const h0 = await ev('return state.handNo');
    await T.nextHand(); await sleep(3000);
    log('次のハンド', await ev(`return JSON.stringify({ hand: state.handNo, was: ${h0}, board: !!document.querySelector('.rd-host') })`));
  }
  await close();
}
for (const m of (mode === 'all' ? ['hit', 'miss', 'oX', 'oOk'] : [mode])) await run(m);
process.exit(0);
