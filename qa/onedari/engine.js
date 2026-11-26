// リーディング：おねだり の計算。場面の正解・印・並びの絵・文言に使う数字は、全部ここから出す（手で書かない）。
// 決まり：おねだりの札（彼女の待ちを完成させる札）が最後に来なければ、彼女の役はできていない。
const ONE_ENGINE=(function(){
const RANKS='23456789TJQKA',SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const FULL=[];for(const r of RANKS)for(const s of SUITS)FULL.push(P(r+s));
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
const isRed=c=>c.s==='h'||c.s==='d';
const cname=c=>RN(c.r)+SJ[c.s];
function name(sc){const c=sc[0];
  if(c===0)return'役なし';if(c===1)return RN(sc[1])+' のペア';if(c===2)return RN(sc[1])+' と '+RN(sc[2])+' のツーペア';
  if(c===3)return RN(sc[1])+' のスリーカード';if(c===4)return'ストレート';if(c===5)return'フラッシュ';if(c===6)return'フルハウス';return'ストレートフラッシュ';}
// 彼女の待ち：場札4枚＋彼女の2枚に足して、ストレート以上の「新しい役」ができる札（彼女から見える札だけで数える）
function outsOf(board4,her){
  const used=new Set(board4.concat(her).map(c=>c.t));
  const base=score(board4.concat(her));const outs=[];
  for(const c of FULL){if(used.has(c.t))continue;const sc=score(board4.concat(her,[c]));if(sc[0]>=4&&sc[0]>base[0])outs.push({card:c,cls:sc[0]});}
  return outs;
}
// 並びの絵：待ちの5枚（4枚＋最後の1枚の席）。当たりなら最後の札が入り、外れなら席が空く
function lineupOf(board4,her,fin,kind,outSuit,hit,outs){
  const pool=[];her.forEach((c,i)=>pool.push({card:c,from:'her',i}));board4.forEach((c,i)=>pool.push({card:c,from:'board',i}));
  if(kind==='flush'){
    const items=pool.filter(x=>x.card.s===outSuit).sort((a,b)=>b.card.r-a.card.r);
    items.push(hit?{card:fin,from:'board',i:4,fin:true}:{card:null,empty:true});return items;
  }
  const rs=pool.map(x=>x.card.r),pickOut=hit?fin.r:outs[0].card.r;
  const top=straightTop(rs.concat([pickOut]));
  const seq=[];for(let k=0;k<5;k++){let r=top-k;if(r<0)r=12;seq.push(r);}
  return seq.map(r=>{
    if(r===pickOut)return hit?{card:fin,from:'board',i:4,fin:true}:{card:null,empty:true,rank:r};
    return pool.find(x=>x.card.r===r);});
}
// 場面の全部（表示に使う物）を計算から出す。sc.board は5枚（最後の1枚つき）
function derive(sc){
  const b5=sc.board.split(' ').map(P),board4=b5.slice(0,4),fin=b5[4];
  const mimi=sc.mimi.split(' ').map(P),her=sc.her.split(' ').map(P);
  const outs=outsOf(board4,her);
  const kind=outs.length&&outs.every(o=>o.cls>=5)?'flush':outs.length&&outs.every(o=>o.cls===4)?'straight':'mixed';
  const outSuit=kind==='flush'?outs[0].card.s:null;
  const outRanks=kind==='straight'?[...new Set(outs.map(o=>o.card.r))].sort((a,b)=>a-b):[];
  const hit=outs.some(o=>o.card.t===fin.t);
  const herFinal=score(b5.concat(her)),mimiFinal=score(b5.concat(mimi)),mimi4=score(board4.concat(mimi));
  const ahead=cmp(mimiFinal,herFinal);
  const made=kind==='flush'?'フラッシュ':kind==='straight'?'ストレート':'';
  let sign=null,signMatch=null,signTxt='';
  if(sc.sign==='suit'){sign={t:'suit',suit:outSuit};signMatch=fin.s===outSuit;signTxt=SJ[outSuit];}
  else if(sc.sign==='rank'){sign={t:'rank',ranks:outRanks};signMatch=outRanks.includes(fin.r);signTxt=outRanks.map(RN).join(' か ');}
  else if(sc.sign==='color'){const red=outSuit==='h'||outSuit==='d';sign={t:'color',red};signMatch=red===isRed(fin);signTxt=red?'赤いの':'黒いの';}
  else if(sc.sign==='count'){sign={t:'count',n:outs.length};signTxt='あと'+outs.length+'枚';}
  const lineup=kind==='mixed'?[]:lineupOf(board4,her,fin,kind,outSuit,hit,outs);
  return{board4,fin,b5,mimi,her,outs,kind,outSuit,outRanks,hit,herFinal,mimiFinal,mimi4,ahead,made,
    sign,signMatch,signTxt,lineup,answer:ahead>0?'call':'fold',
    finName:cname(fin),finRed:isRed(fin),herName:hit?made:name(herFinal),mimiName:name(mimiFinal),mimi4Name:name(mimi4),
    herHole:her.map(cname)};
}
// 検算：直す所があれば、その言葉の一覧を返す（空なら正しい）
function verifyScene(sc){
  const why=[];const d=derive(sc);
  const all=d.b5.concat(d.mimi,d.her);if(new Set(all.map(c=>c.t)).size!==all.length)why.push('札のだぶり');
  if(score(d.board4.concat(d.her))[0]!==0)why.push('彼女が4枚の時点で待ちだけではない（ペア等がある）');
  if(d.kind==='mixed')why.push('待ちの種類が1つに決まらない');
  if(d.mimi4[0]<1)why.push('ミミがペア以上ではない');
  if(d.ahead===0)why.push('引き分け');
  if(d.hit){if(d.herFinal[0]<4)why.push('当たりなのに役ができていない');if(d.ahead>0)why.push('当たりなのにミミが勝つ');}
  else{if(d.herFinal[0]!==0)why.push('外れなのに役がある（最後の札がペア等）');if(d.ahead<0)why.push('外れなのにミミが負ける');}
  if(d.hit!==!!sc.real)why.push('real の宣言と計算が食い違う');
  if(sc.answer!==d.answer)why.push('answer の宣言と計算が食い違う');
  if(sc.sign==='suit'||sc.sign==='rank'){if(d.signMatch!==d.hit)why.push('印と当たりが食い違う');}
  if(sc.sign==='color'&&!(d.signMatch&&!d.hit))why.push('色の印は「色は合うが外れ」の場面のはず');
  if(d.kind==='flush'&&d.lineup.length!==5)why.push('並びが5つにならない');
  if(d.kind==='straight'&&(d.lineup.length!==5||d.lineup.some(x=>!x)))why.push('並びが欠ける');
  if(d.hit&&d.lineup.length&&!d.lineup.some(x=>x&&x.fin))why.push('並びに最後の札が入らない');
  return{id:sc.id,ok:!why.length,why,d};
}
// 見える情報（場札4枚・ミミの2枚・印の文字・めくれた最後の札）に合う「彼女の伏せ札」を全部調べ、
// 「来た／来なかった」か「払う／降りる」が違うものを返す（空なら、印だけで答えが決まる場。2026-11-17 Codex 指摘1）
// key＝その人の印のぼかし方（sc.sign：suit／rank／color／count）。
function signTxtOf(t,kind,outs){
  const outSuit=kind==='flush'?outs[0].card.s:null;
  if(t==='suit')return SJ[outSuit];
  if(t==='rank')return[...new Set(outs.map(o=>o.card.r))].sort((a,b)=>a-b).map(RN).join(' か ');
  if(t==='color')return(outSuit==='h'||outSuit==='d')?'赤いの':'黒いの';
  return'あと'+outs.length+'枚';
}
function conflicts(sc){
  const d=derive(sc),conf=[];
  const used=new Set(d.board4.concat(d.mimi).map(c=>c.t));
  const pool=FULL.filter(c=>!used.has(c.t));
  for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
    const her=[pool[i],pool[j]];
    if(her.some(c=>c.t===d.fin.t))continue;
    if(score(d.board4.concat(her))[0]!==0)continue;
    const outs=outsOf(d.board4,her);if(!outs.length)continue;
    const kind=outs.every(o=>o.cls>=5)?'flush':outs.every(o=>o.cls===4)?'straight':'mixed';
    if(kind==='mixed')continue;
    if(signTxtOf(sc.sign,kind,outs)!==d.signTxt)continue;
    const hit=outs.some(o=>o.card.t===d.fin.t);
    const ahead=cmp(d.mimiFinal,score(d.b5.concat(her)));
    if(hit!==d.hit||(hit?ahead>=0:ahead<=0))conf.push({her:her.map(cname).join(' '),hit,ahead});
  }
  return conf;
}
return{RANKS,SUITS,SJ,P,FULL,score,cmp,RN,name,cname,isRed,outsOf,derive,verifyScene,conflicts};
})();
if(typeof module!=='undefined')module.exports=ONE_ENGINE;
