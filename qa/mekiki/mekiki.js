// リーディング：目利き（めくりの顔）— 場面の検算
// 決まり：場札を1枚ずつめくる。グラーノの「役の名前」が上がり、しかも手札が関わっている時だけ、その札にルーペの印が付く。
const RANKS='23456789TJQKA', SUITS='shdc';
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
const P=s=>({r:RANKS.indexOf(s[0]),s:s[1],t:s});
const show=c=>(c.t[0]==='T'?'10':c.t[0])+SJ[c.s];
const deck=[];for(const r of RANKS)for(const s of SUITS)deck.push(P(r+s));
const CAT=['役なし','ワンペア','ツーペア','スリーカード','ストレート','フラッシュ','フルハウス','フォーカード','ストレートフラッシュ'];
function evalCat(cards){ // 何枚でも。{cat, desc}
  const cnt={},su={};for(const c of cards){cnt[c.r]=(cnt[c.r]||0)+1;(su[c.s]=su[c.s]||[]).push(c.r);}
  const by=n=>Object.keys(cnt).filter(r=>cnt[r]===n).map(Number).sort((a,b)=>b-a);
  const st=rs=>{const u=[...new Set(rs)];if(u.includes(12))u.push(-1);u.sort((a,b)=>b-a);for(let i=0;i+4<u.length+0;i++){let ok=true;for(let k=1;k<5;k++)if(!u.includes(u[i]-k)){ok=false;break;}if(ok)return u[i];}return -2;};
  let fl=null;for(const s in su)if(su[s].length>=5)fl=s;
  if(fl&&st(su[fl])>-2)return{cat:8,key:'sf'};
  const q=by(4),t=by(3),p=by(2);
  if(q.length)return{cat:7,key:'quads'+q[0]};
  if(t.length&&(p.length||t.length>1))return{cat:6,key:'fh'};
  if(fl)return{cat:5,key:'flush'+fl};
  if(st(cards.map(c=>c.r))>-2)return{cat:4,key:'straight'};
  if(t.length)return{cat:3,key:'trips'+RANKS[t[0]]};
  if(p.length>=2)return{cat:2,key:'two'+RANKS[p[0]]+RANKS[p[1]]};
  if(p.length)return{cat:1,key:'pair'+RANKS[p[0]]};
  return{cat:0,key:'none'};
}
function pins(hole,board){ // 印の付く場札の番号の並びと、最後の役
  let prev=evalCat(hole).cat; const out=[];
  for(let k=1;k<=board.length;k++){
    const b=board.slice(0,k), h=evalCat(hole.concat(b)).cat, bo=evalCat(b).cat;
    if(h>prev&&h>bo)out.push(k-1);
    prev=Math.max(prev,h);
  }
  return{pins:out,fin:evalCat(hole.concat(board)),pocket:hole[0].r===hole[1].r};
}
function finKey(hole,board){const p=pins(hole,board);return p.pocket&&p.fin.cat<=1?'pocket':p.fin.key;}
function check(sc){
  const board=sc.board.split(' ').map(P), hole=sc.hole.split(' ').map(P);
  const used=new Set(board.concat(hole).map(c=>c.t));
  const truth=pins(hole,board), pat=truth.pins.join(',');
  const rest=deck.filter(c=>!board.some(b=>b.t===c.t)); // ミミの手札は見せないので、除くのは場札だけ
  const tally={};let n=0;
  for(let i=0;i<rest.length;i++)for(let j=i+1;j<rest.length;j++){
    const h=[rest[i],rest[j]],p=pins(h,board);if(p.pins.join(',')!==pat)continue;n++;
    const k=finKey(h,board);tally[k]=(tally[k]||0)+1;
  }
  console.log('\n■',sc.name);
  console.log('  場:',board.map(show).join(' '),'／グラーノ:',hole.map(show).join(' '),'／役:',CAT[truth.fin.cat],'('+truth.fin.key+')');
  console.log('  印:',truth.pins.length?truth.pins.map(i=>show(board[i])+'('+(i+1)+'枚目)').join('・'):'なし');
  let ok=true;
  sc.opts.forEach((o,i)=>{const c=tally[o.key]||0;const good=(i===sc.ans)?c>0:c===0;if(!good)ok=false;
    console.log('   ',(i===sc.ans?'◎':'×'),o.label,'… 同じ印になる手',c,'通り',good?'':'  ←★食い違い');});
  console.log('  同じ印になる手 全',n,'通り：',Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(' / '));
  console.log('  検算:',ok&&truth.fin.key===sc.opts[sc.ans].key?'OK':'NG');
  return ok;
}
const scenes=[
 {name:'お手本',board:'Ac 7d 4s 9h 2d',hole:'Ah Js',ans:0,opts:[{label:'A のペア',key:'pairA'},{label:'9 のペア',key:'pair9'},{label:'役なし',key:'none'}]},
 {name:'場面1 印が1つ',board:'8s 3d Qh 5c 2s',hole:'Qd Tc',ans:0,opts:[{label:'Q のペア',key:'pairQ'},{label:'8 のペア',key:'pair8'},{label:'役なし',key:'none'}]},
 {name:'場面2 印なし',board:'Kh Ts 6d 3c 8h',hole:'Ad Jc',ans:2,opts:[{label:'K のペア',key:'pairK'},{label:'♥のフラッシュ',key:'flushh'},{label:'役なし',key:'none'}]},
 {name:'場面3 3枚目の♥に印',board:'Ks 9h 4h 2h 7c',hole:'Ah Jh',ans:1,opts:[{label:'K のペア',key:'pairK'},{label:'♥のフラッシュ',key:'flushh'},{label:'ストレート',key:'straight'}]},
 {name:'場面4 ♥3枚でも印は J',board:'Js 8h 3h 6h Kd',hole:'Jd Tc',ans:2,opts:[{label:'♥のフラッシュ',key:'flushh'},{label:'K のペア',key:'pairK'},{label:'J のペア',key:'pairJ'}]},
 {name:'場面5 印が2つ',board:'Kd 6c 3s 9h 2c',hole:'Kc 9d',ans:1,opts:[{label:'K のペア',key:'pairK'},{label:'K と 9 のツーペア',key:'twoK9'},{label:'9 のスリーカード',key:'trips9'}]},
 {name:'場面6 並びの最後に印',board:'6s 7d Jh 9c 2d',hole:'8h Ts',ans:0,opts:[{label:'ストレート',key:'straight'},{label:'J のペア',key:'pairJ'},{label:'♦のフラッシュ',key:'flushd'}]},
];
let all=true;for(const s of scenes)all=check(s)&&all;
console.log('\n全場面:',all?'OK':'NG');

// 6場面で「決め打ち」が何問当たるか
const six=scenes.slice(1);
const strat={
 '印の札のペアを選ぶ（無ければ外れ）':s=>{const b=s.board.split(' ').map(P),h=s.hole.split(' ').map(P);const p=pins(h,b).pins;for(const i of p){const k=s.opts.findIndex(o=>o.key==='pair'+RANKS[b[i].r]);if(k>=0)return k;}return -1;},
 'いつも1番目':()=>0,'いつも2番目':()=>1,'いつも3番目':()=>2,
 '一番強そうな役を選ぶ':s=>{const w=k=>k.startsWith('flush')?5:k==='straight'?4:k.startsWith('trips')?3:k.startsWith('two')?2:k.startsWith('pair')?1:0;let bi=0;s.opts.forEach((o,i)=>{if(w(o.key)>w(s.opts[bi].key))bi=i;});return bi;},
 'いつもペアを選ぶ（最初に出たペア）':s=>Math.max(0,s.opts.findIndex(o=>o.key.startsWith('pair'))),
};
console.log('\n決め打ちの当たり数（6場面）');
for(const k in strat)console.log('  ',k,':',six.filter(s=>strat[k](s)===s.ans).length,'/6');

// 本編につないだ時に出せる割合（リバーまで行った手・乱数の手で）
function rnd(n){return Math.floor(Math.random()*n);}
let N=40000,can=0,types={},pocket=0,boardpair=0;
for(let t=0;t<N;t++){
  const d=deck.slice();for(let i=d.length-1;i>0;i--){const j=rnd(i+1);[d[i],d[j]]=[d[j],d[i]];}
  const hole=d.slice(0,2),board=d.slice(2,7);
  if(evalCat(board).cat>0){boardpair++;continue;}        // 場札だけで役ができる場は出さない
  const p=pins(hole,board);
  if(p.pocket){pocket++;continue;}                        // 手の中のペアは印に出ないので出さない
  if(p.fin.cat>5)continue;
  can++;const k=CAT[p.fin.cat];types[k]=(types[k]||0)+1;
}
console.log('\n本編で出せる割合（リバー・乱数の手 '+N+'回）: 出せる',(can/N*100).toFixed(1)+'%','／場札に役',(boardpair/N*100).toFixed(1)+'%','／手の中のペア',(pocket/N*100).toFixed(1)+'%');
console.log('  出せる場の答えの内訳:',Object.entries(types).map(([k,v])=>k+' '+(v/can*100).toFixed(0)+'%').join(' / '));
