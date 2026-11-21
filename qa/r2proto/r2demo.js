const L=require('./r2lib.js');
const s={mine:'Js Jh',board:'Ac Jd 5s 8h 3d',pot:600,hist:[{n:3,who:'mimi',size:1,say:'cheap'},{n:4,who:'mimi',size:2,say:'tight'}]};
const a=L.analyze(s); console.log(a.N,a.counts,a.t3,a.lowLose, Object.entries(a.ev).map(([k,v])=>k+' '+v.ev.toFixed(0)+(v.follow||'')).join(' '));
const her=L.P('Ah 9h'),b=L.P(s.board); console.log(L.limit(her,b.slice(0,3)),L.limit(her,b.slice(0,4)),L.tier(her,b));
const g={}; for(const x of L.range(s)){const k=L.TN[x.t]+x.res;(g[k]=g[k]||[]).push(L.show(x.h));} for(const k in g) console.log(k,g[k].length,g[k].slice(0,8).join(', '));
