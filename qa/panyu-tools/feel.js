// 衣装ごとの揺れ方：1回押した後の揺れの周期・止まるまで・最大の振れ、を測る
const run = (feel) => { process.env.FEEL = JSON.stringify(feel); delete require.cache[require.resolve('./sim.js')]; const S = require('./sim.js'); S.reset();
  const r = S.runTaps([[0, 0, 607, 560]], 4); let mx = 0, last = 0, cross = [], prev = 0;
  r.forEach(([t, y]) => { mx = Math.max(mx, Math.abs(y)); if (Math.abs(y) > 1.5) last = t; if (prev < 0 && y >= 0 || prev > 0 && y <= 0) cross.push(t); prev = y; });
  const per = cross.length > 2 ? (cross[2] - cross[0]) : 0; return { 最大: mx.toFixed(0), 周期秒: per.toFixed(2), 止まるまで秒: last.toFixed(2), 揺れ回数: (cross.length / 2).toFixed(1) }; };
const F = { バニー: { k: 1, c: 1, ks: 1, cs: 1, sq: 1, kc: 1, push: 1 }, パジャマ: { k: 0.7, c: 0.66, ks: 0.72, cs: 0.75, sq: 1.15, kc: 1.1, push: 0.95 }, サンタ: { k: 0.82, c: 1.4, ks: 1.1, cs: 1.35, sq: 0.82, kc: 0.9, push: 0.88 }, 水着: { k: 1.4, c: 0.92, ks: 1.45, cs: 0.9, sq: 1.25, kc: 0.85, push: 1.1 }, ドレス: { k: 0.92, c: 0.8, ks: 0.9, cs: 0.85, sq: 1.0, kc: 1.35, push: 1.0 } };
for (const [n, f] of Object.entries(F)) console.log(n.padEnd(5), JSON.stringify(run(f)));
