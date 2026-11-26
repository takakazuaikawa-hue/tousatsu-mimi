// S2「異議あり・見せて」（ポルカ）の検算。node s2check.js
// 決まり：手札は2枚だけ。役の5枚のうち、3枚は場札に要る。
const RANKS='23456789TJQKA', SUITS='shdc';
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
const CAT=['役なし','ワンペア','ツーペア','スリーカード','ストレート','フラッシュ','フルハウス','フォーカード','ストレートフラッシュ'];
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
// 言った役を作れる手札2枚の組の数（場札を除いた全部の2枚組で数える）
function countMakers(board,cat){
  const rest=deck.filter(c=>!board.some(b=>b.t===c.t));let n=0,ex=null;
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++)
    if(evalCat(board.concat([rest[i],rest[j]]))===cat){n++;if(!ex)ex=rest[i].t+' '+rest[j].t;}
  return{n,ex};
}
// 決まりだけで見る（場札だけを見て言える事）
function ruleSays(board,cat){
  if(cat===5){const su={};board.forEach(c=>su[c.s]=(su[c.s]||0)+1);return Math.max(...Object.values(su))>=3;}
  if(cat===6){const cn={};board.forEach(c=>cn[c.r]=(cn[c.r]||0)+1);return Math.max(...Object.values(cn))>=2;}
  if(cat===4){const u=new Set(board.map(c=>c.r));if(u.has(12))u.add(-1);
    for(let lo=-1;lo<=8;lo++){let k=0;for(let r=lo;r<lo+5;r++)if(u.has(r))k++;if(k>=3)return true;}return false;}
}
const S=(id,name,board,polka,mimi,cat,ans)=>({id,name,board:board.split(' ').map(P),polka:polka.split(' ').map(P),mimi:mimi.split(' ').map(P),cat,ans});
// ans: 'X'=異議あり（この場では作れない）／'O'=作れる
const scenes=[
 S('demo','お手本 フラッシュ','Ks 9h 4h 2c 7d','Qh 6h','Ad Jc',5,'X'),
 S(1,'場面1 フラッシュ（2枚と2枚）','As Th 7s 5h 3d','Ks 8s','Ah Jd',5,'X'),
 S(2,'場面2 フラッシュ（3枚ある）','Qc 9d 8c 4s 2c','Kc 5c','Ad Qh',5,'O'),
 S(3,'場面3 ストレート（とびとび）','9d Ks 5c 7h 2s','8d 4c','Kd Jc',4,'O'),
 S(4,'場面4 フルハウス（こわい場）','Jh Th 9h 6s 2d','Js Tc','Ac Kd',6,'X'),
 S(5,'場面5 ストレート（並びが2組）','6c 7d Js Qh 2d','9s 8c','Ah Qd',4,'X'),
 S(6,'場面6 フルハウス（おとなしい場）','2c 2d 9s Kh 5d','Ks 2h','As 9c',6,'O'),
];
let allOk=true;
console.log('== 場面の検算 ==');
for(const sc of scenes){
  const all=sc.board.concat(sc.polka,sc.mimi), dup=new Set(all.map(c=>c.t)).size!==all.length;
  const m=countMakers(sc.board,sc.cat), possible=m.n>0, rule=ruleSays(sc.board,sc.cat);
  const boardCat=evalCat(sc.board), polkaCat=evalCat(sc.board.concat(sc.polka)), mimiCat=evalCat(sc.board.concat(sc.mimi));
  const ok=!dup&&(possible===(sc.ans==='O'))&&rule===possible&&boardCat<4;
  if(!ok)allOk=false;
  const su={};sc.board.forEach(c=>su[c.s]=(su[c.s]||0)+1);
  console.log(`${sc.name}｜場 ${sc.board.map(c=>c.t).join(' ')}｜言い分 ${CAT[sc.cat]}｜作れる手 ${m.n}通り${m.ex?'（例 '+m.ex+'）':''}｜決まり ${rule?'作れる':'作れない'}｜正解 ${sc.ans==='O'?'作れる':'異議あり'}｜ポルカ ${sc.polka.map(c=>c.t).join(' ')}＝${CAT[polkaCat]}｜ミミ ${sc.mimi.map(c=>c.t).join(' ')}＝${CAT[mimiCat]}｜場だけ ${CAT[boardCat]}｜マーク ${JSON.stringify(su)}｜${ok?'OK':'NG'}`);
}
console.log('全場面 '+(allOk?'OK':'NG'));

// 決め打ち
const six=scenes.filter(s=>s.id!=='demo');
const score=f=>six.filter(s=>f(s)===s.ans).length;
const suitMax=b=>{const su={};b.forEach(c=>su[c.s]=(su[c.s]||0)+1);return Math.max(...Object.values(su));};
const hasPair=b=>new Set(b.map(c=>c.r)).size<b.length;
const hasAdj=b=>{const u=[...new Set(b.map(c=>c.r))];return u.some(r=>u.includes(r+1))||(u.includes(12)&&u.includes(0));};
console.log('\n== 決め打ち（6場面） ==');
console.log('決まりで数える人',score(s=>ruleSays(s.board,s.cat)?'O':'X'));
console.log('いつも異議あり',score(()=> 'X'),'／いつも作れる',score(()=> 'O'));
console.log('交互（異議から）',score(s=>s.id%2?'X':'O'),'／交互（作れるから）',score(s=>s.id%2?'O':'X'));
for(const f of ['X','O'])for(const st of ['X','O'])for(const fh of ['X','O'])
  console.log(`役で決める フラッシュ=${f} ストレート=${st} フルハウス=${fh}`,score(s=>({5:f,4:st,6:fh})[s.cat]));
console.log('こわそうな場なら作れる（同じマーク3枚・ペア・となりの数字のどれか）',score(s=>(suitMax(s.board)>=3||hasPair(s.board)||hasAdj(s.board))?'O':'X'));
console.log('おとなしい場ほど疑わない（上の逆）',score(s=>(suitMax(s.board)>=3||hasPair(s.board)||hasAdj(s.board))?'X':'O'));
console.log('ストレートだけ雑（となりの数字があれば作れる）',score(s=>s.cat===4?(hasAdj(s.board)?'O':'X'):(ruleSays(s.board,s.cat)?'O':'X')));
console.log('フラッシュしか分からない人（ほかは異議）',score(s=>s.cat===5?(ruleSays(s.board,5)?'O':'X'):'X'),'／（ほかは作れる）',score(s=>s.cat===5?(ruleSays(s.board,5)?'O':'X'):'O'));

// 本編の見込み：場札5枚の全部（2,598,960通り）で、決まりで「作れない」と言える割合
console.log('\n== 場札5枚の全部で、作れない割合 ==');
let N=0,nf=0,ns=0,nh=0,any=0,made=0;
const d=deck;
for(let a=0;a<48;a++)for(let b=a+1;b<49;b++)for(let c=b+1;c<50;c++)for(let e=c+1;e<51;e++)for(let f=e+1;f<52;f++){
  const bd=[d[a],d[b],d[c],d[e],d[f]];N++;
  const xf=!ruleSays(bd,5),xs=!ruleSays(bd,4),xh=!ruleSays(bd,6);
  if(xf)nf++;if(xs)ns++;if(xh)nh++;if(xf||xs||xh)any++;
}
const pc=x=>(100*x/N).toFixed(1)+'%';
console.log('場の数',N,'｜フラッシュ作れない',pc(nf),'｜ストレート作れない',pc(ns),'｜フルハウス作れない',pc(nh),'｜どれか1つは作れない',pc(any));

// 決まりと数え上げが合うか（でたらめに3000場）
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
let mis=0,tested=0,skip=0;
for(let t=0;t<3000;t++){
  const idx=new Set();while(idx.size<5)idx.add(Math.floor(rnd()*52));const bd=[...idx].map(i=>d[i]);
  if(evalCat(bd)>=4){skip++;continue;}
  for(const cat of [4,5,6]){tested++;if((countMakers(bd,cat).n>0)!==ruleSays(bd,cat))mis++;}
}
console.log('決まりと数え上げの食い違い',mis,'／',tested,'（場札だけで役ができている場',skip,'は除いた）');
