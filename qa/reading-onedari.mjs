// リーディング「おねだり」をほろ酔いの夜の卓で通す（2026-11-17）。node qa/reading-onedari.mjs [all|polka|rico|selina|grano|velvet] [hit|miss|both] [WxH] [horoyoi|deisui]
//  卓を「ターンの賭けまで済んだ手」にして、advanceAfterCall でリバーをめくる前の「言う」の画面を出す（出る見込み60%・外れを絞る乱数は 0 に固定）。
//  say  ：初回はお手本が自動 → 本番の「言う」 → めくる → 卓で本物のリバー → 相手が ポットの3分の2 を賭ける
//  pick ：払う？降りる？ → 卓のコール／フォールド → 手の後の答え合わせ（待ちの5枚の列）
//  5つ目の引数 flush｜straight で待ちの種類を決める（タグに _flush を付ける）。
//  hit＝待ちの札が来る場（正解は降りる）／miss＝来ない場（正解は払う）。2人目からはお手本を見た印を付けて、右上のボタンから見る形にする。
import { open } from './lib/readingtable.mjs';
import { sleep } from './lib/session.mjs';
const [who = 'all', which0 = 'both', size = '844x390', night = 'horoyoi', want0 = 'any'] = process.argv.slice(2);   // want0＝待ちの種類 any｜flush｜straight（印が マーク・赤いの／数字 になる）
const [W, H] = size.split('x').map(Number);
const KEYS = { polka: 'polka', rico: 'rico_tutorial', selina: 'selina', grano: 'grano', velvet: 'velvet' };

async function run(key, hit, first) {
  const T = await open(KEYS[key], { W, H, night, save: first ? {} : { rdDemo: { onedari: true } } });
  const { ev, log, shot, waitFor, q, click, close, page } = T;
  const tag = `one_${key}${want0 === 'any' ? '' : '_' + want0}_${hit ? 'hit' : 'miss'}${night === 'deisui' ? '_deisui' : ''}`;
  log(`--- ${tag}  ほろ酔い ${await ev('return isHoroyoi() + " deisui " + state.deisui + " key " + state.opponentImgKey')}`);
  // 本物の札から、この人・この当たり外れで作れる場面を探す（新しい山を切って、plan が通る配りを待つ）
  const found = JSON.parse(await ev(`
    const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
    for (let n = 0; n < 60000; n++) {
      const d = newDeck(); const mine = d.slice(0, 2), her = d.slice(2, 4), b5 = d.slice(4, 9);
      const sc = RD.plan.onedari({ board: b5.slice(0, 4).map(rb), mine: mine.map(rb), her: her.map(rb), toCall: 0, pot: 400 }, { charKey: state.opponentImgKey, fin: rb(b5[4]), pot: 400 });
      if (!sc || !!sc.hit !== ${hit}) continue;
      if ('${want0}' !== 'any' && RD.onedariEngine.derive(sc).kind !== '${want0}') continue;
      state.playerHand = mine; state.opponentHand = her; state.community = b5.slice(0, 4); state.handPhase = 'turn';
      state.deck = d.slice(9).concat([b5[4]]);
      return JSON.stringify({ n, sc });
    }
    return JSON.stringify(null);`));
  if (!found) { log('場面が見つからない'); await close(); return; }
  log('場面', JSON.stringify({ n: found.n, sign: found.sc.sign, board: found.sc.board, mimi: found.sc.mimi, her: found.sc.her, hit: found.sc.hit, answer: found.sc.answer }));
  await ev(`
    state.pot = 400; state.currentBetPlayer = 0; state.currentBetOpponent = 0; state.playerChips = Math.max(state.playerChips, 900); state.opponentChips = Math.max(state.opponentChips, 900);
    state.pendingRead = null; state.readHandNo = -1; state.rdCount = null; state.rdOpen = null; state.rdShown = null; state.rdOnedari = null; state.rdSayGate = -1; state.psychResolved = false; state.psychPending = false; state.isPlayerTurn = false; state.handActs = [];
    render(); return 1;`);
  await sleep(500);
  log('ok?', await ev(`return JSON.stringify({ pool: readPools().logic, horoyoi: isHoroyoi(), phase: state.handPhase })`));
  await ev(`window.__rand0 = rand; rand = () => 0.01; advanceAfterCall(); return 1;`);
  await waitFor(`!!document.querySelector('.rd-host')`, 15000);
  await ev(`rand = window.__rand0; return 1;`);
  await sleep(400);
  log('出た', await ev(`return JSON.stringify({ cnt: state.rdCount, onedari: state.rdOnedari && { hand: state.rdOnedari.hand, hit: state.rdOnedari.hit } })`));
  if (first) {
    await shot(tag, 'demo_intro');
    await waitFor(q('.sg.demo .rico.on'), 20000); await sleep(500); await shot(tag, 'demo_stop1');
    await waitFor(q('.sg.demo .bd .cd.fin'), 25000); await sleep(1800); await shot(tag, 'demo_flip');
    await waitFor(q('.sg.demo .opts.on'), 30000); await sleep(1500); await shot(tag, 'demo_pick');
    await waitFor(q('.sg.demo .lineup.on .stamp.on'), 30000); await sleep(800); await shot(tag, 'demo_reveal');
    await waitFor(q('.sg.demo .panel.on'), 40000); await sleep(300); await shot(tag, 'demo_card4');
    log('お手本を見た印', await ev(`return JSON.stringify(save.rdDemo)`));
    await click('.sg.demo .pgo');
  } else await shot(tag, 'say_intro_nodemo');
  await waitFor(q('.sg.live .tick.on'), 20000); await sleep(1400); await shot(tag, 'say_ask');
  await waitFor(q('.sg.live .go.on'), 15000); await sleep(300);
  await click('.sg.live .go');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  log('めくる後', await ev(`return JSON.stringify({ phase: state.handPhase, comm: state.community.length })`));
  await waitFor(`state.community.length === 5`, 8000); await sleep(1300); await shot(tag, 'table_river');
  await waitFor(q('.sg.live .opts.on'), 25000); await sleep(1600);
  log('相手の賭け', await ev(`return JSON.stringify({ toCall: state.currentBetOpponent - state.currentBetPlayer, pot: state.pot, intent: state.lastOpponentIntent, acts: state.handActs })`));
  await shot(tag, 'pick');
  if (first) { await click('.sg.live .askrico'); await sleep(500); await shot(tag, 'pick_coach'); await click('.sg.live .rico'); }
  const pickCall = !hit;
  await click(pickCall ? '.sg.live .pay' : '.sg.live .fold');
  await sleep(700); await shot(tag, 'picked');
  await waitFor(`!document.querySelector('.rd-host')`, 8000);
  await sleep(1500);
  log('卓', await ev(`return JSON.stringify({ phase: state.handPhase, pending: state.pendingRead && { game: state.pendingRead.game, pick: state.pendingRead.pick, ans: state.pendingRead.ans }, thought: state.mimiThought, pot: state.pot, chips: [state.playerChips, state.opponentChips] })`));
  await shot(tag, 'table_after');
  // 手の結果 → 手の後の答え合わせ
  await waitFor(`[...document.querySelectorAll('button')].some(b => /次のハンド/.test(b.textContent) && b.offsetParent)`, 30000); await sleep(1200);
  await shot(tag, 'hand_result');
  await T.nextHand();
  await waitFor(q('.sg'), 20000); await sleep(1800); await shot(tag, 'verdict');
  await waitFor(q('.sg.live .lineup.on .stamp.on'), 25000); await sleep(1500); await shot(tag, 'verdict_reveal');
  await waitFor(q('.sg .go.on'), 15000); await sleep(1800); await shot(tag, 'verdict_end');
  await click('.sg .go');
  await waitFor(`!document.querySelector('.rd-host')`, 6000);
  await sleep(1200);
  log('答え合わせ後', await ev(`return JSON.stringify({ panyu: state.panyu, success: state.psychSuccessCount })`));
  await close();
}
const list = who === 'all' ? Object.keys(KEYS) : [who];
const hits = which0 === 'both' ? [true, false] : [which0 === 'hit'];
let first = want0 === 'any';
for (const k of list) for (const h of hits) { await run(k, h, first); first = false; }
process.exit(0);
