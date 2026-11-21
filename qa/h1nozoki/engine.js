// 寝落ちのぞき（ほろ酔いの夜）の計算。h1check.js と同じ判定。ページの中で動かして、場面の表と食い違わないかを確かめる。
// 決まり：泡1つ＝寝ぼけて払ってくれる300。1枚のぞくと泡が1つ割れる。泡が無くなると起きる（もう賭けられない）。
// 賭ける＝残りの泡ぜんぶ。寝ぼけた相手は必ず払う。勝負はふつうどおり。たぬき寝入り（ヴェルベット）は、のぞくと −300・賭けると勝っている手でだけ払われる。
const H1_ENGINE=(function(){
const RANKS='23456789TJQKA',SUITS='shdc',UNIT=300;
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
function straightTop(rs){const u=[...new Set(rs)];if(u.includes(12))u.push(-1);u.sort((a,b)=>b-a);
  for(let i=0;i+4<u.length;i++){let ok=true;for(let k=1;k<5;k++)if(!u.includes(u[i]-k)){ok=false;break;}if(ok)return u[i];}return -2;}
function score(cards){
  const cnt={},su={};for(const c of cards){cnt[c.r]=(cnt[c.r]||0)+1;(su[c.s]=su[c.s]||[]).push(c.r);}
  const rs=Object.keys(cnt).map(Number).sort((a,b)=>b-a);
  const by=n=>rs.filter(r=>cnt[r]===n);
  let fl=null;for(const s in su)if(su[s].length>=5)fl=s;
  if(fl){const st=straightTop(su[fl]);if(st>-2)return[8,st];}
  const q=by(4),t=by(3),p=by(2);
  if(q.length)return[7,q[0],rs.filter(r=>r!==q[0])[0]];
  if(t.length&&(p.length||t.length>1)){const pr=Math.max(...(t.slice(1).concat(p)));return[6,t[0],pr];}
  if(fl)return[5,...su[fl].sort((a,b)=>b-a).slice(0,5)];
  const st=straightTop(cards.map(c=>c.r));if(st>-2)return[4,st];
  if(t.length)return[3,t[0],...rs.filter(r=>r!==t[0]).slice(0,2)];
  if(p.length>=2)return[2,p[0],p[1],rs.filter(r=>r!==p[0]&&r!==p[1])[0]];
  if(p.length)return[1,p[0],...rs.filter(r=>r!==p[0]).slice(0,3)];
  return[0,...rs.slice(0,5)];
}
const cmp=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-9)-(b[i]??-9);if(d)return d;}return 0;};
const RN=r=>({8:'10',9:'J',10:'Q',11:'K',12:'A'}[r]||String(r+2));
const T=c=>RN(c.r)+SJ[c.s];
function name(sc){const c=sc[0];
  if(c===0)return'役なし';if(c===1)return RN(sc[1])+' のペア';if(c===2)return RN(sc[1])+' と '+RN(sc[2])+' のツーペア';
  if(c===3)return RN(sc[1])+' のスリーカード';if(c===4)return'ストレート';if(c===5)return'フラッシュ';if(c===6)return'フルハウス';return'それ以上';}
function world(board,mimi){
  const used=new Set(board.concat(mimi).map(c=>c.t)),rest=deck.filter(c=>!used.has(c.t));
  const m=score(board.concat(mimi)),all=[];
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
    const d=cmp(score(board.concat([rest[i],rest[j]])),m);all.push({a:rest[i],b:rest[j],d});}
  return{rest,m,all};
}
// 赤い目盛り＝残りの札を同じ確からしさで数えた時に、ミミが負ける割合。0%が0・100%が10・ほかは四捨五入して1〜9（0に見せない）
const cells=p=>p===0?0:p===1?10:Math.min(9,Math.max(1,Math.round(p*10)));
function gauge(w,seen){
  const cons=w.all.filter(x=>seen.every(c=>c.t===x.a.t||c.t===x.b.t));
  const pB=cons.filter(x=>x.d>0).length/cons.length,pT=cons.filter(x=>x.d===0).length/cons.length;
  return{pB,pT,pA:1-pB-pT,n:cons.length};
}
function ev(w,seen,left){
  const g=gauge(w,seen);const r={g,bet:left>0?left*UNIT*(g.pA-g.pB):null,peek:null};
  if(left>0&&seen.length<2){const cand=w.rest.filter(c=>!seen.some(s=>s.t===c.t));let t=0;
    for(const c of cand){const b=ev(w,seen.concat([c]),left-1);t+=Math.max(0,b.bet??-1e9,b.peek??-1e9);}r.peek=t/cand.length;}
  return r;
}
const bestAct=e=>{let a='賭けない',v=0;if(e.bet!=null&&e.bet>v+1e-9){a='賭ける';v=e.bet;}if(e.peek!=null&&e.peek>v+1e-9){a='のぞく';v=e.peek;}return a;};
function run(x,line){
  const s=x.s;let k=0,left=s.N;
  for(const a of line){
    if(a==='のぞく'){ if(s.fake)return{chips:-UNIT,k:0,tag:'見つかった'}; if(left===0||k===2)continue; k++;left--; continue; }
    if(a==='賭ける'){ if(s.fake)return{chips:x.ahead?0:-s.N*UNIT,k,tag:x.ahead?'降りられた':'罠にかかった'};
      if(left===0)return{chips:0,k,tag:'起こした'};
      return{chips:(x.ahead?1:-1)*left*UNIT,k,tag:x.ahead?'寝ぼけて払わせた':'負けに賭けた'}; }
    return{chips:0,k,tag:s.fake?'罠をかわした':left===0?'起こした':x.ahead?'払わせそこねた':'かわした'};
  }
  return{chips:0,k,tag:'賭けなかった'};
}
const core=sc=>sc[0]===1?[1,sc[1]]:sc[0]===2?[2,sc[1],sc[2]]:sc[0]===3?[3,sc[1]]:sc;
function keyCards(board,her,real){
  for(const c of her){if(cmp(core(score(board.concat([c]))),core(real))===0)return[c];}
  return her.slice();
}
// 場面の全部（表示に使う物）を計算から出す。手で書かない。
function derive(sc){
  const board=sc.board.split(' ').map(P),mimi=sc.mimi.split(' ').map(P),her=sc.her.split(' ').map(P);
  const w=world(board,mimi),h=score(board.concat(her));
  const g=[gauge(w,[]),gauge(w,[her[0]]),gauge(w,her.slice())];
  const key=keyCards(board,her,h);
  return{sc,board,mimi,her,w,herScore:h,herName:name(h),mimiName:name(w.m),
    ahead:cmp(w.m,h)>0,g,cells:g.map(x=>cells(x.pB)),key:key.map(T).join(' と ')};
}
function verifyScene(sc){
  const d=derive(sc),s=sc,x={s,ahead:d.ahead};
  const all=d.board.concat(d.mimi,d.her),dup=new Set(all.map(c=>c.t)).size!==all.length;
  const tie=cmp(d.w.m,d.herScore)===0;
  let k=0,left=s.N,ok=!dup&&!tie;const steps=[];
  for(const a of s.line){
    const e=ev(d.w,d.her.slice(0,k),left),b=bestAct(e);
    const margin=(a==='賭ける'?e.bet:a==='のぞく'?e.peek:0)-Math.max(...[a==='賭ける'?null:e.bet,a==='のぞく'?null:e.peek,a==='賭けない'?null:0].filter(v=>v!=null));
    steps.push({k,left,cells:cells(e.g.pB),act:a,best:b,margin:Math.round(margin)});
    if(!s.fake&&b!==a&&margin<-30)ok=false;
    if(a==='のぞく'){k++;left--;}
  }
  const r=run(x,s.line);
  const cellsSeq=steps.map(z=>z.cells);
  const cellsOk=s.fake?cellsSeq[0]===s.cells[0]:JSON.stringify(cellsSeq.slice(0,s.cells.length))===JSON.stringify(s.cells);
  return{id:s.id,ok:ok&&cellsOk&&r.chips===s.chips,cells:cellsSeq,wantCells:s.cells,chips:r.chips,wantChips:s.chips,tag:r.tag,mimi:d.mimiName,her:d.herName,ahead:d.ahead,steps};
}
return{RANKS,SUITS,SJ,UNIT,P,T,score,cmp,RN,name,world,gauge,cells,ev,bestAct,run,derive,verifyScene};
})();
if(typeof module!=='undefined')module.exports=H1_ENGINE;
