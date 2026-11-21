const L=require('./r2lib.js');
const M=(n,size,say)=>({n,who:'mimi',size,say}); const G=(n)=>({n,who:'grano'});
const scenes=[
 {id:1,mine:'Kd 8s',board:'Ks 8d 4c 2h 6s',pot:600,hist:[M(3,1,'tight'),M(4,1,'tight')],her:'4h 10h'},
 {id:2,mine:'9s 9h',board:'Qh 9c 3d 5s 2c',pot:900,hist:[M(3,1,'cheap'),M(4,2,'tight')],her:'Qd Jc'},
 {id:3,mine:'Ks Qs',board:'10s 9d 4c Jh 2d',pot:900,hist:[M(3,1,'cheap'),M(4,2,'cheap')],her:'10h 10d'},
 {id:4,mine:'7s 7h',board:'Kc 7d 3s 9h Ad',pot:900,hist:[M(3,1,'cheap'),M(4,2,'tight')],her:'Kh Jd'},
 {id:5,mine:'8s 8d',board:'Qh 8h 3c 6s 2d',pot:1200,hist:[M(3,2,'tight'),M(4,2,'tight')],her:'Ah 10h'},
 {id:6,mine:'As Ad',board:'Jc 7d 4s 9h 2c',pot:600,hist:[M(3,1,'tight'),M(4,1,'tight')],her:'2h 2d'},
 {id:7,mine:'As Ad',board:'Ah 10h 6c 3s 8h',pot:1200,hist:[M(3,2,'tight'),M(4,2,'tight')],her:'Kh Jh'},
 {id:8,mine:'9h 8h',board:'9s 8d 3c 4h Kd',pot:600,hist:[M(3,1,null),G(4)],her:'9d 4d'},
];
const fx=x=>(x>=0?'+':'')+x.toFixed(0);
for(const s of scenes){
  const a=L.analyze(s); const R=L.range(s);
  const her=L.P(s.her), board=L.P(s.board), mine=L.P(s.mine);
  const inR=R.find(x=>(L.key(x.h[0])===L.key(her[0])&&L.key(x.h[1])===L.key(her[1]))||(L.key(x.h[0])===L.key(her[1])&&L.key(x.h[1])===L.key(her[0])));
  console.log(`\n#${s.id} ミミ ${L.show(mine)}｜場 ${L.show(board)}｜ポット ${s.pot}`);
  console.log(`  ありえる手 ${a.N}通り： 空箱 ${a.counts[0]}／小さい品 ${a.counts[1]}／良い品 ${a.counts[2]}／上物 ${a.counts[3]}（ミミ勝ち${a.t3.win}・負け${a.t3.lose}・分け${a.t3.tie}） 下の格でミミに勝つ・分ける手 ${a.lowLose}`);
  console.log('  平均の増減： '+['check','small','mid','big'].map(o=>`${o} ${fx(a.ev[o].ev)}${a.ev[o].follow?'('+a.ev[o].follow+')':''}`).join('  '));
  if(!inR) console.log('  !! 本当の手が範囲に無い', s.her); else {
    const hist=s.hist.map(st=>st.who==='mimi'?`n${st.n}:limit=${L.limit(her,board.slice(0,st.n))}`:`n${st.n}:tier=${L.tier(her,board.slice(0,st.n))}`).join(' ');
    console.log(`  本当の手 ${L.show(her)} 格=${L.TN[inR.t]} 勝敗=${inR.res} (${hist})`);
    console.log('  本当の結果： '+['check','small','mid','big'].map(o=>`${o} 受${fx(L.delta(o,inR.t,inR.res,s.pot,true))}/降${fx(L.delta(o,inR.t,inR.res,s.pot,false))}`).join('  '));
  }
  if(process.argv[2]==='-v'){ const g={}; for(const x of R){ const k=L.TN[x.t]+(x.res>0?'○':x.res<0?'×':'△'); (g[k]=g[k]||[]).push(L.show(x.h)); } for(const k in g) console.log('   ',k,g[k].length, g[k].slice(0,14).join(', ')); }
}
module.exports=scenes;
// 決め打ちの人と、読む人の合計
const opts=['check','small','mid','big']; const sumEv={},sumAct={}; let bestEv=0,bestAct=0; const bests=[];
for(const s of scenes){ const a=L.analyze(s); const R=L.range(s); const her=L.P(s.her);
  const x=R.find(x=>[L.key(x.h[0]),L.key(x.h[1])].sort().join()===[L.key(her[0]),L.key(her[1])].sort().join());
  let bo=null; for(const o of opts){ sumEv[o]=(sumEv[o]||0)+a.ev[o].ev; const f=a.ev[o].follow!=='降りる'; const d=L.delta(o,x.t,x.res,s.pot,f); sumAct[o]=(sumAct[o]||0)+d; if(!bo||a.ev[o].ev>a.ev[bo].ev) bo=o; }
  bests.push(bo); bestEv+=a.ev[bo].ev; bestAct+=L.delta(bo,x.t,x.res,s.pot,a.ev[bo].follow!=='降りる'); }
console.log('\n一番得な値：',bests.join(' '));
console.log('平均の合計：',opts.map(o=>o+' '+sumEv[o].toFixed(0)).join('  '),' 読む人 '+bestEv.toFixed(0));
console.log('本当の結果の合計（続きは一番得な方）：',opts.map(o=>o+' '+sumAct[o].toFixed(0)).join('  '),' 読む人 '+bestAct.toFixed(0));
