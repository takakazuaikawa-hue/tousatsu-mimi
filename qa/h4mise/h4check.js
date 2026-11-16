// H4 見せ合いっこ（ポルカ・ほろ酔い）の検算。node h4check.js
// 決まり：彼女は「ミミが見せた1枚＋場札」の役を自分の本当の役とくらべる。下なら払う。同じか上なら降りる。見せなければ降りる。
const RANKS='23456789TJQKA',SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
function straightTop(rs){const u=[...new Set(rs)];if(u.includes(12))u.push(-1);u.sort((a,b)=>b-a);
  for(let i=0;i+4<u.length;i++){let ok=true;for(let k=1;k<5;k++)if(!u.includes(u[i]-k)){ok=false;break;}if(ok)return u[i];}return -2;}
// 5〜7枚の一番強い役を、くらべられる数の列で返す [役の段, 決め手…]
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
function name(sc){const c=sc[0];
  if(c===0)return'役なし';if(c===1)return RN(sc[1])+' のペア';if(c===2)return RN(sc[1])+' と '+RN(sc[2])+' のツーペア';
  if(c===3)return RN(sc[1])+' のスリーカード';if(c===4)return'ストレート';if(c===5)return'フラッシュ';if(c===6)return'フルハウス';return'それ以上';}
// 彼女が見せる札：その1枚＋場札で、本当の役と同じ段・同じ決め手（役の段と組の数字）になる札
const core=sc=>sc[0]===1?[1,sc[1]]:sc[0]===2?[2,sc[1],sc[2]]:sc[0]===3?[3,sc[1]]:sc;
function herShow(board,her){
  const real=score(board.concat(her)),b=score(board);
  if(real[0]<1||cmp(core(real),core(b))<=0)return null;              // ペア以上で、場札だけの役より上
  for(const c of her){if(cmp(core(score(board.concat([c]))),core(real))===0)return{card:c,real};}
  return null;                                                         // 2枚とも使う役は出さない
}
// 結果：'call'（払う）か 'fold'（降りる）
function react(board,herReal,shown){ if(!shown)return'fold'; return cmp(score(board.concat([shown])),herReal)<0?'call':'fold'; }
function solve(board,mimi,her){
  const hs=herShow(board,her);if(!hs)return null;
  const mReal=score(board.concat(mimi)),ahead=cmp(mReal,hs.real);
  const out=[0,1].map(i=>react(board,hs.real,mimi[i]));
  // 値打ち：勝っていて払わせる＝2、降ろす（勝ち・負けどちらでも）＝1、負けていて払われる＝-1
  const val=o=>o==='call'?(ahead>0?2:ahead<0?-1:0):1;
  const vals=[val(out[0]),val(out[1]),1];const best=Math.max(...vals);
  const ans=vals.map((v,i)=>v===best?i:-1).filter(i=>i>=0);
  return{hs,mReal,ahead,out,vals,best,ans};
}
const SC=[
 {id:'demo',board:'Kh 9c 4d 2s Jc',mimi:'Ks 4c',polka:'9d 6h',ans:1},
 {id:1,board:'Jh 8s 6d 3c 2h',mimi:'Ad Jc',polka:'8d 4s',ans:0},
 {id:2,board:'Qs Td 7c 4h 2s',mimi:'Ac 9h',polka:'Tc 5d',ans:2},
 {id:3,board:'5c 6d 7h 8s Kd',mimi:'9h 5s',polka:'Ks 2c',ans:1},
 {id:4,board:'Ks Jd 8c 5h 3d',mimi:'8h 7s',polka:'Jc 6s',ans:2},
 {id:5,board:'7d 7c Qs 3h 9d',mimi:'7s Ah',polka:'Qd 4c',ans:1},
 {id:6,board:'Kh 9h 6h 2h 5c',mimi:'3c Ah',polka:'9s Jd',ans:0},
];
const CH=['左の札','右の札','見せない'];
let allOk=true;const rows=[];
for(const s of SC){
  const board=s.board.split(' ').map(P),mimi=s.mimi.split(' ').map(P),her=s.polka.split(' ').map(P);
  const all=board.concat(mimi,her);const dup=new Set(all.map(c=>c.t)).size!==all.length;
  const r=solve(board,mimi,her);
  if(!r){console.log(s.id,'出せない場面');allOk=false;continue;}
  const uniq=r.ans.length===1&&r.ans[0]===s.ans;
  const ok=!dup&&uniq&&r.ahead!==0&&score(board)[0]<=1;
  if(!ok)allOk=false;
  console.log(`場面${s.id} ${ok?'OK':'NG'}｜場 ${s.board}｜ミミ ${s.mimi}＝${name(r.mReal)}｜ポルカ ${s.polka}＝${name(r.hs.real)}（見せる ${r.hs.card.t}）｜${r.ahead>0?'ミミが上':'ミミが下'}`);
  [0,1].forEach(i=>console.log(`   ${mimi[i].t} を見せる → 見える役「${name(score(board.concat([mimi[i]])))}」→ ${r.out[i]==='call'?'払う':'降りる'}（値 ${r.vals[i]}）`));
  console.log(`   見せない → 降りる（値 1）｜正解＝${CH[s.ans]}${uniq?'':' ← 一つに決まらない '+r.ans}`);
  rows.push({s,board,mimi,her,r});
}
console.log('全場面',allOk?'OK':'NG');
// 決め打ち（お手本を除く6場面）。正解＝一番値打ちの高い選び方
const six=rows.filter(x=>x.s.id!=='demo');
const pairs=(x,i)=>x.board.some(b=>b.r===x.mimi[i].r);
const H={
 'いつも左':x=>0,'いつも右':x=>1,'いつも見せない':x=>2,
 '高い札を見せる':x=>x.mimi[0].r>x.mimi[1].r?0:1,
 '低い札を見せる':x=>x.mimi[0].r<x.mimi[1].r?0:1,
 '場札と同じ数字でない方（両方そう／両方ちがうなら低い方）':x=>{const a=pairs(x,0),b=pairs(x,1);if(a!==b)return a?1:0;return x.mimi[0].r<x.mimi[1].r?0:1;},
 '場札と同じ数字の方（決まらなければ高い方）':x=>{const a=pairs(x,0),b=pairs(x,1);if(a!==b)return a?0:1;return x.mimi[0].r>x.mimi[1].r?0:1;},
 '勝っていれば低い札・負けていれば見せない':x=>x.r.ahead<0?2:(x.mimi[0].r<x.mimi[1].r?0:1),
 '勝っていれば高い札・負けていれば見せない':x=>x.r.ahead<0?2:(x.mimi[0].r>x.mimi[1].r?0:1),
 '勝っていれば同じ数字でない方・負けていれば見せない':x=>{if(x.r.ahead<0)return 2;const a=pairs(x,0),b=pairs(x,1);if(a!==b)return a?1:0;return x.mimi[0].r<x.mimi[1].r?0:1;},
 '決まりどおりにくらべる':x=>x.r.ans[0],
};
console.log('\n決め打ちの当たり数（6場面）');
for(const k in H){const hit=six.filter(x=>H[k](x)===x.s.ans).map(x=>x.s.id);console.log(` ${k}：${hit.length}／6 （${hit.join('・')||'なし'}）`);}
console.log(' 正解の並び：',six.map(x=>CH[x.s.ans]).join('／'));
// 本編でどれくらい出せるか（最後の札の後。賭けの流れは見ない、札だけの条件）
function rnd(n){const d=deck.slice();for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d.slice(0,n);}
const N=200000;let can=0,k={S_one:0,S_both:0,S_none:0,W:0,tie:0},kind={hi:0,lo:0};
for(let n=0;n<N;n++){const d=rnd(9),board=d.slice(0,5),mimi=d.slice(5,7),her=d.slice(7,9);
  const r=solve(board,mimi,her);if(!r)continue;can++;
  if(r.ahead===0){k.tie++;continue;}
  if(r.ahead<0){k.W++;continue;}
  const c=r.out.filter(o=>o==='call').length;
  if(c===1){k.S_one++;const i=r.out.indexOf('call');if(mimi[i].r>mimi[1-i].r)kind.hi++;else if(mimi[i].r<mimi[1-i].r)kind.lo++;}
  else if(c===2)k.S_both++;else k.S_none++;}
const pc=x=>(100*x/can).toFixed(1)+'%';
console.log(`\n本編（${N}回）：彼女の札が「1枚＋場札で本当の役と同じ・ペア以上」＝${(100*can/N).toFixed(1)}%`);
console.log(` その内訳：ミミが上で1枚だけ払わせられる ${pc(k.S_one)}（うち高い方が正解 ${pc(kind.hi)}・低い方 ${pc(kind.lo)}）／どちらでも払う ${pc(k.S_both)}／どちらでも降りる ${pc(k.S_none)}／ミミが下（見せないが正解）${pc(k.W)}／同点 ${pc(k.tie)}`);
