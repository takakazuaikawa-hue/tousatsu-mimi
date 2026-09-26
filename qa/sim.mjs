#!/usr/bin/env node
// 対戦シミュレータの実行器。ページに本物の game.js を読み込み、方針ごとの勝率・ハンド数・割り込み回数を表にする。
// 使い方: node qa/sim.mjs [--n 2000] [--policies allin,station,beginner,learner] [--opps polka,selina,grano,velvet] [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, REPO } from './lib/session.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const n = +(args.n || 2000);
const policies = String(args.policies || 'allin,station,beginner,learner').split(',');
const opps = String(args.opps || 'polka,selina,grano,velvet').split(',');

const sess = await openSession({ probes: ['sim.js'] });
const rows = [], reactions = [];
try {
  for (const pol of policies) for (const opp of opps) {
    rows.push(await sess.page.eval(`window.__qaSim.run(${JSON.stringify({ opp, policy: pol, n, pCorrect: 0.6 })})`, 30 * 60000));
    process.stderr.write(`${pol}/${opp} `);
  }
  for (const opp of opps) for (const betSize of ['pot_1_2', 'pot_1']) {
    reactions.push(await sess.page.eval(`window.__qaSim.reaction(${JSON.stringify({ opp, betSize, n: 4000 })})`, 30 * 60000));
  }
} finally { await sess.close(); }

const pad = (v, w) => String(v).padEnd(w);
console.log(pad('policy', 9) + pad('opp', 8) + pad('win%', 7) + pad('dom%', 7) + pad('domBehind%', 11) + pad('hands', 7) + pad('med', 5) + pad('p90', 5) + pad('psych', 6) + pad('logic', 6) + pad('cap%', 6));
for (const r of rows) console.log(pad(r.policy, 9) + pad(r.opp, 8) + pad(r.winPct, 7) + pad(r.domPct, 7) + pad(r.domBehindPct, 11) + pad(r.handsAvg, 7) + pad(r.handsMedian, 5) + pad(r.handsP90, 5) + pad(r.psych, 6) + pad(r.logic, 6) + pad(r.capPct, 6));
console.log('\n賭けられた時の反応（フロップ、ポット200に対して）');
for (const r of reactions) console.log(`${pad(r.opp, 8)} ${pad(r.betSize, 8)} 降り ${pad(r.foldPct + '%', 7)} コール ${pad(r.callPct + '%', 7)} 上乗せ ${r.raisePct}%`);
if (args.json) fs.writeFileSync(path.resolve(REPO, args.json), JSON.stringify({ rows, reactions }, null, 1));
