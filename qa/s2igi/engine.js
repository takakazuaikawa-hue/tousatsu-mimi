// 異議あり（ポルカ）の計算と検算。決まり：手札は2枚だけ。役の5枚のうち3枚は場札に要る。
// s2check.js と同じ判定。ページの中で動かして、場面の表と食い違わないかを確かめる。
const S2_ENGINE=(function(){
const RANKS='23456789TJQKA', SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
function straightTop(rs){const u=[...new Set(rs)];if(u.includes(12))u.push(-1);u.sort((a,b)=>b-a);
  for(let i=0;i+4<u.length;i++){let ok=true;for(let k=1;k<5;k++)if(!u.includes(u[i]-k)){ok=false;break;}if(ok)return u[i];}return -2;}
function evalCat(cards){
  const cnt={},su={};for(const c of cards){cnt[c.r]=(cnt[c.r]||0)+1;(su[c.s]=su[c.s]||[]).push(c.r);}
  const by=n=>Object.keys(cnt).filter(r=>cnt[r]===n).length;
  let fl=null;for(const s in su)if(su[s].length>=5)fl=s;
  if(fl&&straightTop(su[fl])>-2)return 8;
  const q=by(4),t=by(3),p=by(2);
  if(q)return 7; if(t&&(p||t>1))return 6; if(fl)return 5;
  if(straightTop(cards.map(c=>c.r))>-2)return 4;
  if(t)return 3; if(p>=2)return 2; if(p)return 1; return 0;
}
function countMakers(board,cat){
  const rest=deck.filter(c=>!board.some(b=>b.t===c.t));let n=0,ex=null;
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)
    if(evalCat(board.concat([rest[i],rest[j]]))===cat){n++;if(!ex)ex=rest[i].t+' '+rest[j].t;}
  return{n,ex};
}
function ruleSays(board,cat){
  if(cat===5){const su={};board.forEach(c=>su[c.s]=(su[c.s]||0)+1);return Math.max(...Object.values(su))>=3;}
  if(cat===6){const cn={};board.forEach(c=>cn[c.r]=(cn[c.r]||0)+1);return Math.max(...Object.values(cn))>=2;}
  if(cat===4){const u=new Set(board.map(c=>c.r));if(u.has(12))u.add(-1);
    for(let lo=-1;lo<=8;lo++){let k=0;for(let r=lo;r<lo+5;r++)if(u.has(r))k++;if(k>=3)return true;}return false;}
}
// 枠に入る場札を計算で決める（手で書かない）。fill＝場札の番号（最大3）、ok＝3つ埋まるか、n＝そろった数
// hole＝ポルカの手札（同点の時にどの組を見せるかの目安にだけ使う）
function plan(board,hole,cat){
  const fill=[];let ok=false,n=0,tag={};
  if(cat===5){
    let best=null;
    for(const s of SUITS){const bc=board.filter(c=>c.s===s).length,hc=hole.filter(c=>c.s===s).length;
      if(!best||bc>best.bc||(bc===best.bc&&hc>best.hc))best={s,bc,hc};}
    board.forEach((c,i)=>{if(c.s===best.s&&fill.length<3)fill.push(i);});
    n=best.bc;ok=n>=3;tag={kind:'flush',suit:best.s,n};
  }else if(cat===4){
    let best=null;
    for(let lo=-1;lo<=8;lo++){
      const idx=[];let hc=0;
      for(let r=lo;r<lo+5;r++){const rr=r<0?12:r;const i=board.findIndex(c=>c.r===rr);if(i>=0)idx.push(i);if(hole.some(c=>c.r===rr))hc++;}
      if(!best||idx.length>best.idx.length||(idx.length===best.idx.length&&hc>best.hc))best={lo,idx,hc};
    }
    best.idx.slice(0,3).forEach(i=>fill.push(i));
    n=best.idx.length;ok=n>=3;tag={kind:'straight',n,lo:best.lo};
  }else if(cat===6){
    const g={};board.forEach((c,i)=>(g[c.r]=g[c.r]||[]).push(i));
    const ranks=Object.keys(g).map(Number).sort((a,b)=>(g[b].length-g[a].length)||(b-a));
    const top=ranks[0];
    if(g[top].length>=2){g[top].forEach(i=>{if(fill.length<3)fill.push(i);});
      ranks.slice(1).forEach(r=>g[r].forEach(i=>{if(fill.length<3)fill.push(i);}));ok=true;n=g[top].length;tag={kind:'fh',pair:true};}
    else{ranks.slice(0,2).forEach(r=>fill.push(g[r][0]));ok=false;n=1;tag={kind:'fh',pair:false};}
  }
  return{fill,ok,n,tag};
}
function verifyScene(sc){
  const board=sc.board.split(' ').map(P),polka=sc.polka.split(' ').map(P),mimi=(sc.mimi||'').split(' ').filter(Boolean).map(P);
  const all=board.concat(polka,mimi),dup=new Set(all.map(c=>c.t)).size!==all.length;
  const m=countMakers(board,sc.cat),possible=m.n>0,rule=ruleSays(board,sc.cat),pl=plan(board,polka,sc.cat);
  const want=sc.ans==='O';
  const planOk=pl.ok===want&&(want?pl.fill.length===3:pl.fill.length<3);
  const ok=!dup&&possible===want&&rule===possible&&evalCat(board)<4&&planOk;
  return{name:sc.name,makers:m.n,rule,possible,ans:sc.ans,fill:pl.fill,planOk,ok};
}
return{RANKS,SUITS,P,deck,evalCat,countMakers,ruleSays,plan,verifyScene};
})();
if(typeof module!=='undefined')module.exports=S2_ENGINE;
