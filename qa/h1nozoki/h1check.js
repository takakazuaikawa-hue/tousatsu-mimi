// H1 寝落ちのぞき（ほろ酔いの夜）の検算。node h1check.js [配る回数]
const RANKS='23456789TJQKA',SUITS='shdc',UNIT=300;
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
const SN={s:'♠',h:'♥',d:'♦',c:'♣'};
const T=c=>RN(c.r)+SN[c.s];
function name(sc){const c=sc[0];
  if(c===0)return'役なし';if(c===1)return RN(sc[1])+' のペア';if(c===2)return RN(sc[1])+' と '+RN(sc[2])+' のツーペア';
  if(c===3)return RN(sc[1])+' のスリーカード';if(c===4)return'ストレート';if(c===5)return'フラッシュ';if(c===6)return'フルハウス';return'それ以上';}
// 相手の持てる手（残り45枚から2枚）を全部数えて、ミミに勝つ手・同点の手を出す
function world(board,mimi){
  const used=new Set(board.concat(mimi).map(c=>c.t)),rest=deck.filter(c=>!used.has(c.t));
  const m=score(board.concat(mimi)),all=[];
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
    const d=cmp(score(board.concat([rest[i],rest[j]])),m);all.push({a:rest[i],b:rest[j],d});}
  return{rest,m,all,beat:all.filter(x=>x.d>0),tie:all.filter(x=>x.d===0)};
}
// ここから下：寝落ちのぞきの決まりと検算
// 決まり：泡1つ＝寝ぼけて払ってくれる300。1枚のぞくと泡が1つ割れる。泡が無くなると起きる（もう賭けられない）。
// 賭ける＝残りの泡ぜんぶ。寝ぼけた相手は必ず払う。勝負はふつうどおり。
// たぬき寝入り（ヴェルベット）：泡はにせもの。のぞくと見つかる（−300）。賭けると、起きているので、勝っている手でだけ払う。
// 赤い目盛り＝「残りの札を同じ確からしさで数えた時に、ミミが負ける割合」。0枚の時は990組、1枚見た後は44枚で数える。
const cells=p=>p===0?0:p===1?10:Math.min(9,Math.max(1,Math.round(p*10)));
function gauge(w,seen){
  const cons=w.all.filter(x=>seen.every(c=>c.t===x.a.t||c.t===x.b.t));
  const pB=cons.filter(x=>x.d>0).length/cons.length,pT=cons.filter(x=>x.d===0).length/cons.length;
  return{pB,pT,pA:1-pB-pT,n:cons.length};
}
// 相手の手が偏らないとした時の、その場の3つの手の値打ち（期待値）
function ev(w,seen,left){
  const g=gauge(w,seen);const r={g,bet:left>0?left*UNIT*(g.pA-g.pB):null,peek:null,stop:0};
  if(left>0&&seen.length<2){const cand=w.rest.filter(c=>!seen.some(s=>s.t===c.t));let t=0;
    for(const c of cand){const b=ev(w,seen.concat([c]),left-1);t+=Math.max(0,b.bet??-1e9,b.peek??-1e9);}r.peek=t/cand.length;}
  return r;
}
const bestAct=e=>{let a='賭けない',v=0;if(e.bet!=null&&e.bet>v+1e-9){a='賭ける';v=e.bet;}if(e.peek!=null&&e.peek>v+1e-9){a='のぞく';v=e.peek;}return a;};
const SC=[
 {id:'demo',who:'ポルカ',N:3,board:'Kd Tc 7s 5h 2c',mimi:'2s 3s',her:'Qh 8d',line:['のぞく','のぞく','賭ける']},
 {id:1,who:'ポルカ',N:3,board:'Ad Jc 8s 5h 3c',mimi:'3h 4h',her:'Js 9d',line:['のぞく','賭けない']},
 {id:2,who:'セリナ',N:1,board:'Kh 9h 4h 7s 2d',mimi:'Ah Qh',her:'Ks Kd',line:['賭ける']},
 {id:3,who:'リコ',N:3,board:'Qd 9c 6s 4d 2h',mimi:'Kc Jc',her:'7h 9s',line:['のぞく','のぞく','賭けない']},
 {id:4,who:'ヴェルベット',N:2,fake:true,board:'As Th 8d 5c 2h',mimi:'5s 6s',her:'Ad 8c',line:['賭けない']},
 {id:5,who:'グラーノ',N:2,board:'Qh Jd 6c 3s 2h',mimi:'As Qs',her:'9c 6d',line:['賭ける']},
 {id:6,who:'ポルカ',N:3,board:'Kd 9s 7h 4c 2d',mimi:'4s 5s',her:'8h 3c',line:['のぞく','賭ける'],alt:['のぞく','のぞく','賭ける']},
];
// 手順（'のぞく'…の並び）を最後まで打った結果。上乗せ分だけ（ポットは勝負どおりなので数えない）
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
let allOk=true;const rows=[];
for(const s of SC){
  const board=s.board.split(' ').map(P),mimi=s.mimi.split(' ').map(P),her=s.her.split(' ').map(P);
  const all=board.concat(mimi,her),dup=new Set(all.map(c=>c.t)).size!==all.length;
  const w=world(board,mimi),h=score(board.concat(her)),d=cmp(w.m,h),ahead=d>0;
  const x={s,board,mimi,her,w,ahead};
  console.log(`\n場面${s.id}｜${s.who} 泡${s.N}${s.fake?'（にせ）':''}｜場 ${board.map(T).join(' ')}｜ミミ ${mimi.map(T).join(' ')}＝${name(w.m)}｜相手 ${her.map(T).join(' ')}＝${name(h)}｜${d>0?'ミミが上':d<0?'ミミが下':'同点'}`);
  // おすすめの手順を1手ずつたどって、その時の目盛りと、3つの手の値打ちを出す
  let k=0,left=s.N,ok=!dup&&d!==0;x.steps=[];
  for(const a of s.line){
    const e=ev(w,her.slice(0,k),left),b=bestAct(e);
    const f=v=>v==null?'—':v.toFixed(0);
    const margin=(a==='賭ける'?e.bet:a==='のぞく'?e.peek:0)-Math.max(...[a==='賭ける'?null:e.bet,a==='のぞく'?null:e.peek,a==='賭けない'?null:0].filter(v=>v!=null));
    console.log(`   ${k}枚見た所・泡${left}：赤 ${cells(e.g.pB)}/10（負け ${(e.g.pB*100).toFixed(0)}%${e.g.pT?'・同点 '+(e.g.pT*100).toFixed(0)+'%':''}）｜賭ける ${f(e.bet)}／のぞく ${f(e.peek)}／賭けない 0 → おすすめ「${a}」${s.fake?'（たぬき寝入りなので、値打ちの数字は当てはまらない）':b===a?`（数えた一番と同じ。差 ${margin.toFixed(0)}）`:`（数えた一番は「${b}」。差 ${margin.toFixed(0)}）`}`);
    x.steps.push({k,left,p:e.g.pB,cells:cells(e.g.pB),e,a,b,margin});
    if(!s.fake&&b!==a&&margin<-30)ok=false;
    if(a==='のぞく'){k++;left--;}
  }
  const r=run(x,s.line);x.res=r;
  console.log(`   結果：${r.k}枚のぞいて「${s.line[s.line.length-1]}」→ ${r.chips>=0?'+':''}${r.chips}（${r.tag}）${s.alt?'｜もう1つの手：'+s.alt.join('→')+' → +'+run(x,s.alt).chips:''}`);
  console.log(`   場面 ${ok?'OK':'NG'}`);if(!ok)allOk=false;
  rows.push(x);
}
console.log('\n全場面',allOk?'OK':'NG');

// 決め打ち（お手本を除く6場面）。うまくいった＝勝っている場面で払わせた（＋）／負けている場面・たぬきで損なし（0）
const six=rows.filter(x=>x.s.id!=='demo');
// 目盛りを見ながら打つ人：rule(p,left,k) が '賭ける' 'のぞく' '賭けない' を返す
function walk(x,rule){const line=[];let k=0,left=x.s.N;
  for(let i=0;i<4;i++){const g=gauge(x.w,x.her.slice(0,k));const a=rule(g.pB,left,k,x);line.push(a);if(a!=='のぞく')break;if(x.s.fake)break;if(left===0||k===2){line.push('賭けない');break;}k++;left--;}
  return run(x,line);}
const H={
 'おすすめの手順（この仕様の答え）':x=>run(x,x.s.line),
 '目盛りの目安どおり（たぬきは見抜く）：赤2以下で賭ける／真っ赤でやめる／ほかは泡が2つ以上ならのぞく・1つなら赤が半分より下の時だけ賭ける':
   x=>x.s.fake?run(x,['賭けない']):walk(x,(p,left)=>left===0?'賭けない':cells(p)<=2?'賭ける':p===1?'賭けない':left>=2?'のぞく':(p<0.5?'賭ける':'賭けない')),
 '上と同じ目安・たぬきを見抜けない':x=>walk(x,(p,left)=>left===0?'賭けない':cells(p)<=2?'賭ける':p===1?'賭けない':left>=2?'のぞく':(p<0.5?'賭ける':'賭けない')),
 'いつも最後まで（2枚）のぞく・勝ちと分かった時だけ賭ける':x=>walk(x,(p,left,k)=>k<2&&left>0?'のぞく':(p===0&&left>0?'賭ける':'賭けない')),
 'いつものぞかない・いつも賭ける':x=>run(x,['賭ける']),
 'いつものぞかない・賭けない（何もしない）':x=>run(x,['賭けない']),
 'いつも1枚だけのぞく・真っ赤でなければ賭ける':x=>walk(x,(p,left,k)=>k<1&&left>0?'のぞく':(p<1&&left>0?'賭ける':'賭けない')),
 'いつも1枚だけのぞく・赤が無い時だけ賭ける':x=>walk(x,(p,left,k)=>k<1&&left>0?'のぞく':(p===0&&left>0?'賭ける':'賭けない')),
 '泡を1つ残す所までのぞく・真っ赤でなければ賭ける':x=>walk(x,(p,left,k)=>left>1&&k<2?'のぞく':(p<1&&left>0?'賭ける':'賭けない')),
 '赤を見ずに、泡が2つ以上ならのぞかず賭ける・1つなら賭けない':x=>run(x,[x.s.N>=2?'賭ける':'賭けない']),
};
console.log('\n決め打ち（6場面）');
for(const k in H){let n=0,ch=0;const d=[];for(const x of six){const r=H[k](x);const ok=(x.ahead&&!x.s.fake)?r.chips>0:r.chips===0;if(ok)n++;ch+=r.chips;d.push((ok?'○':'×')+(r.chips>=0?'+':'')+r.chips);}
  console.log(`  ${n}/6　チップ ${ch>=0?'+':''}${ch}　[${d.join(' ')}]　${k}`);}
console.log('  おすすめの止め所の並び：',six.map(x=>x.res.k+'枚・'+x.s.line[x.s.line.length-1]).join(' / '));

// 本編の目安：好きに配った最後の札の場で、赤い目盛りと「数えた一番の最初の一手」がどう散らばるか
let seed=20261116;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const TR=Number(process.argv[2]||400);const zone={z0:0,z1:0,z2:0,z3:0,z4:0};const first={1:{},2:{},3:{}};
for(let t=0;t<TR;t++){
  const d=deck.slice();for(let i=d.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  const w=world(d.slice(0,5),d.slice(5,7));const p=w.beat.length/990;
  if(p===0)zone.z0++;else if(p<=0.2)zone.z1++;else if(p<0.45)zone.z2++;else if(p<0.8)zone.z3++;else zone.z4++;
  // 速く数える：札ごとに「その札を持っている時の 勝ち・負け の割合」
  const idx=new Map(w.rest.map((c,i)=>[c.t,i]));const A=new Array(45).fill(0),B=new Array(45).fill(0);
  for(const x of w.all){const i=idx.get(x.a.t),j=idx.get(x.b.t);if(x.d<0){A[i]++;A[j]++;}else if(x.d>0){B[i]++;B[j]++;}}
  const pA=w.all.filter(x=>x.d<0).length/990;
  for(const N of[1,2,3]){
    const bet=N*UNIT*(pA-p);let peek=0;
    if(N>=2){for(let i=0;i<45;i++){const a=A[i]/44,b=B[i]/44;peek+=Math.max(0,(N-1)*UNIT*(a-b),(N-2)*UNIT*a);}peek/=45;}
    const act=bet<=1e-9&&peek<=1e-9?'賭けない':Math.abs(bet-peek)<=30&&bet>0?'どちらでも（差30以内）':bet>peek?'賭ける':'のぞく';
    first[N][act]=(first[N][act]||0)+1;
  }
}
const pc=n=>(100*n/TR).toFixed(0)+'%';
console.log(`\n本編の目安（${TR}回、好きに配った場。相手の手は偏らないとして数えた）`);
console.log(`  赤い目盛り（のぞく前）：赤なし ${pc(zone.z0)}／少し（2割まで）${pc(zone.z1)}／中くらい（2〜4割半）${pc(zone.z2)}／多い（4割半〜8割）${pc(zone.z3)}／ほぼ真っ赤（8割より上）${pc(zone.z4)}`);
for(const N of[1,2,3])console.log(`  泡${N}の時の、数えた一番の最初の一手：`+Object.entries(first[N]).map(([k,v])=>`${k} ${pc(v)}`).join('／'));
