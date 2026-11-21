// 見せ合いっこ（ポルカ・ほろ酔い）の計算。h4check.js と同じ判定。ページの中で動かして、場面の表と食い違わないかを確かめる。
// 決まり：彼女は「ミミが見せた1枚＋場札」の役を、自分の本当の役とくらべる。下なら払う。同じか上なら降りる。見せなければ降りる。
const H4_ENGINE=(function(){
const RANKS='23456789TJQKA',SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
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
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
function name(sc){const c=sc[0];
  if(c===0)return'役なし';if(c===1)return RN(sc[1])+' のペア';if(c===2)return RN(sc[1])+' と '+RN(sc[2])+' のツーペア';
  if(c===3)return RN(sc[1])+' のスリーカード';if(c===4)return'ストレート';if(c===5)return'フラッシュ';if(c===6)return'フルハウス';return'それ以上';}
// 短い名前（「あたしのツーペア」「ツーペア！？」用）
function sname(sc){const c=sc[0];
  if(c===2)return'ツーペア';if(c===3)return'スリーカード';return name(sc);}
const core=sc=>sc[0]===1?[1,sc[1]]:sc[0]===2?[2,sc[1],sc[2]]:sc[0]===3?[3,sc[1]]:sc;
function herShow(board,her){
  const real=score(board.concat(her)),b=score(board);
  if(real[0]<1||cmp(core(real),core(b))<=0)return null;
  for(const c of her){if(cmp(core(score(board.concat([c]))),core(real))===0)return{card:c,real};}
  return null;
}
function react(board,herReal,shown){ if(!shown)return'fold'; return cmp(score(board.concat([shown])),herReal)<0?'call':'fold'; }
function solve(board,mimi,her){
  const hs=herShow(board,her);if(!hs)return null;
  const mReal=score(board.concat(mimi)),ahead=cmp(mReal,hs.real);
  const out=[0,1].map(i=>react(board,hs.real,mimi[i]));
  const val=o=>o==='call'?(ahead>0?2:ahead<0?-1:0):1;
  const vals=[val(out[0]),val(out[1]),1];const best=Math.max(...vals);
  const ans=vals.map((v,i)=>v===best?i:-1).filter(i=>i>=0);
  return{hs,mReal,ahead,out,vals,best,ans};
}
// 「この札が場札とつながる」所：糸で結ぶ場札の番号（つながらなければ空）と、見える役
function linkOf(board,card){
  const sb=score(board),sc=score(board.concat([card]));
  const improved=cmp(core(sc),core(sb))>0;let idx=[];
  if(improved){
    const k=sc[0];
    if(k===5)board.forEach((c,i)=>{if(c.s===card.s)idx.push(i);});
    else if(k===4){const top=sc[1];const set=new Set();for(let d=0;d<5;d++){let r=top-d;if(r<0)r=12;set.add(r);}
      board.forEach((c,i)=>{if(set.has(c.r)&&c.r!==card.r)idx.push(i);});}
    else board.forEach((c,i)=>{if(c.r===card.r)idx.push(i);});
  }
  return{idx,improved,score:sc,name:name(sc)};
}
// 場面の全部（表示に使う物）を計算から出す。手で書かない。
function derive(sc){
  const board=sc.board.split(' ').map(P),mimi=sc.mimi.split(' ').map(P),her=sc.polka.split(' ').map(P);
  const r=solve(board,mimi,her);
  const hsIdx=her.findIndex(c=>c.t===r.hs.card.t);
  return{board,mimi,her,r,hsIdx,hsLink:linkOf(board,r.hs.card),
    herName:name(r.hs.real),herShort:sname(r.hs.real),mimiName:name(r.mReal),
    seen:[0,1].map(i=>linkOf(board,mimi[i])),ahead:r.ahead,ans:r.ans[0]};
}
function verifyScene(sc){
  const board=sc.board.split(' ').map(P),mimi=sc.mimi.split(' ').map(P),her=sc.polka.split(' ').map(P);
  const all=board.concat(mimi,her),dup=new Set(all.map(c=>c.t)).size!==all.length;
  const r=solve(board,mimi,her);if(!r)return{id:sc.id,ok:false,why:'出せない場面'};
  const uniq=r.ans.length===1&&r.ans[0]===sc.ans;
  const ok=!dup&&uniq&&r.ahead!==0&&score(board)[0]<=1;
  return{id:sc.id,ok,got:r.ans,want:sc.ans,ahead:r.ahead,out:r.out,her:name(r.hs.real),mimi:name(r.mReal),shown:r.hs.card.t};
}
return{RANKS,SUITS,SJ,P,score,cmp,RN,name,sname,herShow,react,solve,linkOf,derive,verifyScene};
})();
if(typeof module!=='undefined')module.exports=H4_ENGINE;
