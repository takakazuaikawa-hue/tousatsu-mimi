// 仕込みの手の配り（rdRigOnedariDeal）を何度も呼び、成功率・待ちが来る割合・待ちの種類・5人それぞれを数える（2026-11-17）
import { openSession, sleep } from './lib/session.mjs';
const N = +(process.argv[2] || 1500);
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 31, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, coins: 800 } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof rdRigOnedariDeal === "function" && !!window.RD && !!RD.plan.onedari').catch(() => false)); i++) await sleep(500);
await sleep(800);
const r = JSON.parse(await page.eval(`(() => {
  const out = {}; const RB = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' }, rb = (c) => ({ r: c.rank, s: RB[c.suit] });
  save.endingUnlocked = true; save.rewardCgSeen = ['rico_tutorial','polka','selina','grano','velvet']; save.horoyoiMode = true; state.horoyoi = true; state.deisui = false; state.tutorialMode = false; state.screen = 'battle';
  for (const ck of ['polka', 'rico', 'selina', 'grano', 'velvet']) {
    state.opponentImgKey = ck; const o = out[ck] = { n: 0, ok: 0, hit: 0, flush: 0, straight: 0, ms: 0, fail: 0, dup: 0 };
    for (let i = 0; i < ${N}; i++) {
      state.handNo = 5; state.rdRigNo = 2; state.rdCount = {}; state.rdRigHand = null; state.deck = newDeck();
      o.n++;
      if (!rdRigOnedariDeal()) { o.fail++; continue; }
      const d = state.deck, b4 = [d[d.length - 1], d[d.length - 2], d[d.length - 3], d[d.length - 4]].map(rb);
      // pop の順：b0,b1,b2（フロップ）→ turn → river。deck の末尾から b0,b1,b2,b3、その下が river
      const board = [d[d.length - 1], d[d.length - 2], d[d.length - 3], d[d.length - 4]].map(rb), river = rb(d[d.length - 5]);
      const all = d.slice(-5).concat(state.playerHand, state.opponentHand); if (new Set(all.map(c => c.rank + c.suit)).size !== 9 || new Set(d.map(c => c.rank + c.suit)).size !== d.length || d.length !== 48) o.dup++;
      const sc = RD.plan.onedari({ board, mine: state.playerHand.map(rb), her: state.opponentHand.map(rb), pot: 0 }, { charKey: ck, fin: river, pot: 0 });
      if (!sc) { o.ms++; continue; }
      o.ok++; if (sc.hit) o.hit++;
      const suited = state.opponentHand[0].suit === state.opponentHand[1].suit; if (suited) o.flush++; else o.straight++;
    }
  }
  return JSON.stringify(out); })()`));
for (const [k, o] of Object.entries(r)) console.log(k, JSON.stringify(o), `成功 ${(o.ok / o.n * 100).toFixed(1)}%／来る ${(o.hit / o.ok * 100).toFixed(1)}%／フラッシュ待ち ${o.flush}・ストレート待ち ${o.straight}`);
console.log('errors', JSON.stringify(await page.eval('window.__QA.errors.slice(0, 5)')));
await s.close(); process.exit(0);
