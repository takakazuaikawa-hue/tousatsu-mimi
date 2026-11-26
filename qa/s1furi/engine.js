// 押し出すふり（ポルカ・一周目）の計算。s1check.js と同じ判定の写し。
// ページの中で動かして、場面の表（scenes.js の expect）と食い違わないかを確かめる。顔・口がすべる役・光る場札・正解は全部ここで計算する（手で書かない）。
const S1_ENGINE=(function(){
const RANKS='23456789TJQKA';
const CAT=['役なし','ワンペア','ツーペア','スリーカード','ストレート','フラッシュ','フルハウス','フォーカード','ストレートフラッシュ'];
const P1=s=>({r:RANKS.indexOf(s[0])+2,s:s[1],t:s});
const P=str=>str.trim().split(/\s+/).map(P1);
function eval5(cs){
  const rs=cs.map(c=>c.r).sort((a,b)=>b-a);
  const flush=cs.every(c=>c.s===cs[0].s);
  const uniq=[...new Set(rs)];
  let sh=0;
  if(uniq.length===5){ if(rs[0]-rs[4]===4)sh=rs[0]; else if(rs[0]===14&&rs[1]===5&&rs[4]===2)sh=5; }
  const cnt={};rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const groups=Object.entries(cnt).map(([r,n])=>[n,+r]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  const kick=groups.map(g=>g[1]);
  let cat;
  if(sh&&flush)cat=8;else if(groups[0][0]===4)cat=7;else if(groups[0][0]===3&&groups[1][0]===2)cat=6;
  else if(flush)cat=5;else if(sh)cat=4;else if(groups[0][0]===3)cat=3;
  else if(groups[0][0]===2&&groups[1][0]===2)cat=2;else if(groups[0][0]===2)cat=1;else cat=0;
  return{cat,key:[cat,...(sh?[sh]:kick)]};
}
function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d;}return 0;}
function best(cards){
  let bE=null,bC=null;const n=cards.length;
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++)for(let d=c+1;d<n;d++)for(let e=d+1;e<n;e++){
    const five=[cards[a],cards[b],cards[c],cards[d],cards[e]];const ev=eval5(five);
    if(!bE||cmp(ev.key,bE.key)>0){bE=ev;bC=five;}
  }
  return{...bE,five:bC};
}
function madeCards(b){
  if(b.cat===0)return[];
  if(b.cat===4||b.cat===5||b.cat===8)return b.five;
  const cnt={};b.five.forEach(c=>cnt[c.r]=(cnt[c.r]||0)+1);
  return b.five.filter(c=>cnt[c.r]>=2);
}
const rk=c=>({T:'10',J:'J',Q:'Q',K:'K',A:'A'}[RANKS[c.r-2]]||RANKS[c.r-2]);
function analyze(sc){
  const B=P(sc.board),M=P(sc.mimi),Q=P(sc.polka);
  const all=[...B,...M,...Q].map(c=>c.t),dup=new Set(all).size!==all.length;
  const bm=best([...B,...M]),bq=best([...B,...Q]),bb=eval5(B);
  const c=cmp(bm.key,bq.key);
  const bluff=bq.cat===0;
  const glintTok=madeCards(bq).filter(x=>B.some(y=>y.t===x.t)).map(x=>x.t);
  const glint=B.map((x,i)=>glintTok.includes(x.t)?i:-1).filter(i=>i>=0);
  const mc=bm.cat,qc=bq.cat;
  const mimiMade=madeCards(bm);
  const mimiName=mc===1&&mimiMade.length?rk(mimiMade[0])+' のペア':CAT[mc];
  return{B,M,Q,dup,bm,bq,bb,bluff,face:bluff?'あわてる':'にやける',say:bluff?null:CAT[qc],
    ans:c>0?'払う':'降りる',win:c>0,tie:c===0,glint,mc,qc,mimiName,mimiCat:CAT[mc],polkaCat:CAT[qc],
    polkaHigher:qc>mc,boardCat:bb.cat};
}
function verify(sc){
  const A=analyze(sc),x=sc.expect;
  const ok=!A.dup&&!A.tie&&A.face===x.face&&A.say===x.say&&A.ans===x.ans
    &&A.boardCat<A.qc+(A.qc===0?1:0)&&A.boardCat<A.mc&&A.mc!==A.qc;
  return{name:sc.id,face:A.face,say:A.say,ans:A.ans,glint:A.glint,ok};
}
return{RANKS,CAT,P,P1,eval5,cmp,best,madeCards,rk,analyze,verify};
})();
if(typeof module!=='undefined')module.exports=S1_ENGINE;
