// 印の計算と検算（qa/mekiki/mekiki.js と同じ決まり。ページの中で動かして、場面の表と食い違わないかを確かめる）
const MK_ENGINE=(function(){
const RANKS='23456789TJQKA', SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
function evalCat(cards){
  const cnt={},su={};for(const c of cards){cnt[c.r]=(cnt[c.r]||0)+1;(su[c.s]=su[c.s]||[]).push(c.r);}
  const by=n=>Object.keys(cnt).filter(r=>cnt[r]===n).map(Number).sort((a,b)=>b-a);
  const st=rs=>{const u=[...new Set(rs)];if(u.includes(12))u.push(-1);u.sort((a,b)=>b-a);for(let i=0;i+4<u.length+0;i++){let ok=true;for(let k=1;k<5;k++)if(!u.includes(u[i]-k)){ok=false;break;}if(ok)return u[i];}return -2;};
  let fl=null;for(const s in su)if(su[s].length>=5)fl=s;
  if(fl&&st(su[fl])>-2)return{cat:8,key:'sf'};
  const q=by(4),t=by(3),p=by(2);
  if(q.length)return{cat:7,key:'quads'+q[0]};
  if(t.length&&(p.length||t.length>1))return{cat:6,key:'fh'};
  if(fl)return{cat:5,key:'flush'+fl};
  if(st(cards.map(c=>c.r))>-2)return{cat:4,key:'straight',top:st(cards.map(c=>c.r))};
  if(t.length)return{cat:3,key:'trips'+RANKS[t[0]]};
  if(p.length>=2)return{cat:2,key:'two'+RANKS[p[0]]+RANKS[p[1]]};
  if(p.length)return{cat:1,key:'pair'+RANKS[p[0]]};
  return{cat:0,key:'none'};
}
function pins(hole,board){
  let prev=evalCat(hole).cat; const out=[];
  for(let k=1;k<=board.length;k++){
    const b=board.slice(0,k), h=evalCat(hole.concat(b)).cat, bo=evalCat(b).cat;
    if(h>prev&&h>bo)out.push(k-1);
    prev=Math.max(prev,h);
  }
  return{pins:out,fin:evalCat(hole.concat(board)),pocket:hole[0].r===hole[1].r};
}
function finKey(hole,board){const p=pins(hole,board);return p.pocket&&p.fin.cat<=1?'pocket':p.fin.key;}
// 役を作っている札（光らせる札）。cards は {r,s,id} の並び。id の集合を返す
function made(cards){
  const fin=evalCat(cards),out=new Set(),byR={};
  cards.forEach(c=>(byR[c.r]=byR[c.r]||[]).push(c));
  const ranksWith=n=>Object.keys(byR).filter(r=>byR[r].length>=n).map(Number).sort((a,b)=>b-a);
  if(fin.cat===1)ranksWith(2).slice(0,1).forEach(r=>byR[r].forEach(c=>out.add(c.id)));
  else if(fin.cat===2)ranksWith(2).slice(0,2).forEach(r=>byR[r].forEach(c=>out.add(c.id)));
  else if(fin.cat===3)ranksWith(3).slice(0,1).forEach(r=>byR[r].forEach(c=>out.add(c.id)));
  else if(fin.cat===5){const su=fin.key.slice(5);cards.filter(c=>c.s===su).sort((a,b)=>b.r-a.r).slice(0,5).forEach(c=>out.add(c.id));}
  else if(fin.cat===4){let r=fin.top;while(byR[r<0?12:r]){out.add(byR[r<0?12:r][0].id);r--;if(r<-1)break;}}
  return out;
}
// 場面の検算。expect={pins:[...]}。同じ印になる手を、場札を除いた全部の2枚組で数える
function verifyScene(sc,expectPins){
  const board=sc.board.split(' ').map(P), hole=sc.hole.split(' ').map(P);
  const truth=pins(hole,board), pat=truth.pins.join(',');
  const rest=deck.filter(c=>!board.some(b=>b.t===c.t));
  const tally={};let n=0;
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
    const h=[rest[i],rest[j]],p=pins(h,board);if(p.pins.join(',')!==pat)continue;n++;
    const k=finKey(h,board);tally[k]=(tally[k]||0)+1;
  }
  const counts=sc.opts.map(o=>tally[o.key]||0);
  const optOk=sc.opts.every((o,i)=>i===sc.ans?counts[i]>0:counts[i]===0);
  const pinsOk=expectPins?JSON.stringify(expectPins)===JSON.stringify(truth.pins):true;
  const finOk=truth.fin.key===sc.opts[sc.ans].key;
  return{name:sc.name,pins:truth.pins,fin:truth.fin.key,counts,total:n,pinsOk,finOk,optOk,ok:pinsOk&&finOk&&optOk};
}
return{RANKS,SUITS,P,deck,evalCat,pins,finKey,made,verifyScene};
})();
if(typeof module!=='undefined')module.exports=MK_ENGINE;
