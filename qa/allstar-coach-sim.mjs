#!/usr/bin/env node
// 零時の卓：ミミの席を「プロの手（Allstar.coach の寄り）」どおりに打たせて、順位と早い脱落を数える（D16 ④）。
// 使い方: node qa/allstar-coach-sim.mjs [--n 200] [--seed 1] [--samples 200]
// 出力: 平均順位・6位の割合・15ハンド以内の脱落・脱落の時の状況（何ハンド目・残り人数・持ち点 BB・誰の何で）
import { loadGameFns, loadAllstar } from './allstar-sim.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const N = arg('n', 200), SEED = arg('seed', 1), SAMPLES = arg('samples', 200);
const fns = loadGameFns();
const A = loadAllstar({ fns });
if (process.env.POW) A._internal.setPushPow(+process.env.POW);

function proAction(t) {
  const c = A.coach(t);
  const L = A.legalActions(t);
  const P = A.raisePresets(t);
  const h = t.hand;
  switch (c.lean) {
    case 'fold': return L.canCheck ? { kind: 'check' } : { kind: 'fold' };
    case 'check': return L.canCheck ? { kind: 'check' } : { kind: 'fold' };
    case 'call': return L.toCall > 0 ? { kind: 'call' } : { kind: 'check' };
    case 'allin': return P ? { kind: 'raise', to: P.allin } : (L.toCall > 0 ? { kind: 'call' } : { kind: 'check' });
    case 'raise': {
      if (!P) return L.toCall > 0 ? { kind: 'call' } : { kind: 'check' };
      let to;
      if (h.street === 'preflop') to = h.raises === 0 ? 2.5 * h.bb + h.limpers * h.bb : h.currentBet * 3;
      else to = P.twoThirds;
      to = Math.max(P.min, Math.min(P.allin, Math.round(to / 25) * 25));
      return { kind: 'raise', to };
    }
  }
  return L.canCheck ? { kind: 'check' } : { kind: 'fold' };
}

const res = [];
for (let i = 0; i < N; i++) {
  const t = A.createTournament({ seed: SEED + i, samples: SAMPLES, ...(process.env.START ? { startStack: +process.env.START } : {}), ...(process.env.HPL ? { handsPerLevel: +process.env.HPL } : {}) });
  let handsTotal = 0;
  let bust = null, lastCtx = null, guard = 0;
  while (!t.finished && ++guard < 400) {
    A.startHand(t);
    for (let g = 0; g < 400 && t.hand && !t.hand.done; g++) {
      const h = t.hand;
      if (h.toAct === 0) {
        const c = A.coach(t);
        const L = A.legalActions(t);
        const act = proAction(t);
        // 持ち点の大半を入れる判断を覚えておく（脱落の原因を数えるため）
        if ((act.kind === 'call' && L.toCall >= 0.5 * L.stack) || (act.kind === 'raise' && act.to - L.committed >= 0.5 * L.stack)) {
          lastCtx = { hand: h.no, street: h.street, lean: c.lean, key: c.key, stackBB: +c.stackBB.toFixed(1), alive: c.alive, needPct: +(c.needPct * 100).toFixed(0), eq: c.eq != null ? +(c.eq * 100).toFixed(0) : null, top: c.top != null ? +(c.top * 100).toFixed(1) : null, facing: L.toCall > 0 };
        }
        A.applyAction(t, act);
      } else A.stepAI(t, { allowHuman: false });
    }
    if (t.players[0].place != null && !bust) { bust = { hand: t.players[0].bustHand, place: t.players[0].place, ctx: lastCtx }; A.fastForward(t, { keepEvents: false }); }
  }
  const me = t.players[0];
  res.push({ seed: SEED + i, place: me.place, prize: me.prize || 0, bust, hands: t.handNo });
}
const mean = res.reduce((a, r) => a + r.place, 0) / res.length;
const pct = (f) => (100 * res.filter(f).length / res.length).toFixed(1) + '%';
console.log(`プロの手どおり ${N} 大会（平均 ${(res.reduce((a, r) => a + r.hands, 0) / res.length).toFixed(1)} ハンド・ミミの脱落は平均 ${(res.filter(r => r.bust && r.place > 1).reduce((a, r) => a + r.bust.hand, 0) / Math.max(1, res.filter(r => r.bust && r.place > 1).length)).toFixed(1)} ハンド目）：平均賞金 ${(res.reduce((a, r) => a + r.prize, 0) / res.length).toFixed(0)}（参加費300）、平均順位 ${mean.toFixed(2)}、優勝 ${pct(r => r.place === 1)}、4位以内 ${pct(r => r.place <= 4)}、6位 ${pct(r => r.place === 6)}、15ハンド以内に脱落 ${pct(r => r.bust && r.bust.hand <= 15 && r.place > 1)}`);
const early = res.filter(r => r.bust && r.bust.hand <= 15 && r.place > 1);
const byKind = {};
for (const r of early) { const c = r.bust.ctx; const k = c ? `${c.street}/${c.facing ? '受け' : '自分から'}/${c.lean}/${c.key}` : '不明'; byKind[k] = (byKind[k] || 0) + 1; }
console.log('早い脱落の最後の大きな判断：', Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
for (const r of early.slice(0, 12)) console.log('  ', r.seed, r.place + '位', JSON.stringify(r.bust.ctx));
