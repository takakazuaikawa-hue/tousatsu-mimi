// R2 値付け：グラーノの値札表モデルの試算
const RANKS = {J:11,Q:12,K:13,A:14};
const P = s => s.trim().split(/\s+/).map(x => ({ r: RANKS[x.slice(0,-1)] || +x.slice(0,-1), s: x.slice(-1) }));
const key = c => c.r + c.s;
const RN = r => ({11:'J',12:'Q',13:'K',14:'A'})[r] || String(r);
const show = cs => cs.map(c => RN(c.r) + ({s:'♠',h:'♥',d:'♦',c:'♣'})[c.s]).join(' ');
function deck(){ const d=[]; for(const s of 'shdc') for(let r=2;r<=14;r++) d.push({r,s}); return d; }
// 5枚以上から最良の役：[cat, ...tiebreak]  cat:0ハイカード 1ペア 2ツーペア 3スリー 4ストレート 5フラッシュ 6フルハウス 7フォー 8ストフラ
function best(cards){
  const n=cards.length; let bestV=null;
  const idx=[0,1,2,3,4];
  const rec=(start,chosen)=>{ if(chosen.length===5){ const v=eval5(chosen.map(i=>cards[i])); if(!bestV||cmp(v,bestV)>0) bestV=v; return; }
    for(let i=start;i<n;i++){ chosen.push(i); rec(i+1,chosen); chosen.pop(); } };
  if(n<5){ return evalPartial(cards); }
  rec(0,[]); return bestV;
}
function cmp(a,b){ for(let i=0;i<Math.max(a.length,b.length);i++){ const d=(a[i]||0)-(b[i]||0); if(d) return d; } return 0; }
function eval5(c){
  const rs=c.map(x=>x.r).sort((a,b)=>b-a); const flush=c.every(x=>x.s===c[0].s);
  const cnt={}; rs.forEach(r=>cnt[r]=(cnt[r]||0)+1);
  const groups=Object.entries(cnt).map(([r,n])=>[n,+r]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  let straight=0; const u=[...new Set(rs)];
  if(u.length===5){ if(u[0]-u[4]===4) straight=u[0]; else if(u[0]===14&&u[1]===5) straight=5; }
  if(straight&&flush) return [8,straight];
  if(groups[0][0]===4) return [7,groups[0][1],groups[1][1]];
  if(groups[0][0]===3&&groups[1][0]===2) return [6,groups[0][1],groups[1][1]];
  if(flush) return [5,...rs];
  if(straight) return [4,straight];
  if(groups[0][0]===3) return [3,groups[0][1],...groups.slice(1).map(g=>g[1])];
  if(groups[0][0]===2&&groups[1][0]===2) return [2,groups[0][1],groups[1][1],groups[2][1]];
  if(groups[0][0]===2) return [1,groups[0][1],...groups.slice(1).map(g=>g[1])];
  return [0,...rs];
}
function evalPartial(c){ const cnt={}; c.forEach(x=>cnt[x.r]=(cnt[x.r]||0)+1); const g=Object.values(cnt).sort((a,b)=>b-a); if(g[0]===4) return [7]; if(g[0]===3) return [3]; if(g[0]===2&&g[1]===2) return [2]; if(g[0]===2) return [1]; return [0]; }
// 格：0空箱 1小さい品 2良い品 3上物
function tier(hole, board){
  const brs=board.map(c=>c.r); if(new Set(brs).size!==brs.length) throw new Error('場にペア：この試算は扱わない '+show(board));
  const v=best(hole.concat(board)); const cat=v[0]; const top=Math.max(...brs);
  if(board.length===5 && best(board)[0]>=4) throw new Error('場だけで役');
  if(cat>=2) return 3;
  if(cat===1){ const pr=v[1]; if(hole[0].r===hole[1].r) return pr>top?2:1; return pr===top?2:1; }
  return 0;
}
function strongDraw(hole, board){
  if(board.length>=5) return false; if(best(hole.concat(board))[0]>=4) return false;
  const used=new Set(hole.concat(board).map(key)); let outs=0;
  for(const c of deck()){ if(used.has(key(c))) continue; if(best(hole.concat(board,[c]))[0]>=4 && (board.length<4 || best(board.concat([c]))[0]<4)) outs++; }
  return outs>=8;
}
function limit(hole, board){ const t=tier(hole,board); return (board.length<5 && strongDraw(hole,board)) ? Math.max(t,2) : t; }
const TN=['空箱','小さい品','良い品','上物'];
// scene: {mine, board(5), hist:[{n:3|4, who:'mimi'|'grano', size:1|2|3, say:'cheap'|'tight'|null}], pot}
function range(scene){
  const mine=P(scene.mine), board=P(scene.board);
  const used=new Set(mine.concat(board).map(key)); const rest=deck().filter(c=>!used.has(key(c)));
  const out=[];
  for(let i=0;i<rest.length;i++) for(let j=i+1;j<rest.length;j++){
    const h=[rest[i],rest[j]]; let ok=true;
    for(const st of scene.hist){ const b=board.slice(0,st.n);
      if(st.who==='mimi'){ const L=limit(h,b); if(L<st.size) ok=false; else if(st.say==='cheap'&&!(L>st.size)) ok=false; else if(st.say==='tight'&&L!==st.size) ok=false; }
      else if(st.who==='grano'){ if(tier(h,b)!==3) ok=false; }
      if(!ok) break; }
    if(!ok) continue;
    const t=tier(h,board); const c=cmp(best(mine.concat(board)), best(h.concat(board)));
    out.push({h,t,res:c>0?1:c<0?-1:0});
  }
  return out;
}
// 値付けで増えるチップ（そのまま見せ合った時との差）。pot=P 小=P/3 中=2P/3 大=P
function delta(opt, t, res, P, follow){ // follow: 買い増し・相手の賭けに「受ける」か
  const S=P/3, M=2*P/3, B=P, H=P/2;
  if(opt==='check'){ if(t<3) return 0; if(!follow) return res>0? -P : res===0? -P/2 : 0; return res*H; }
  const size={small:1,mid:2,big:3}[opt], amt=[0,S,M,B][size];
  if(t<size) return 0;                    // 降りる
  if(t===3&&size===1){ if(!follow) return -S + (res>0? -P : res===0? -P/2 : 0); return res*M; } // 買い増し
  return res*amt;                          // 払う→見せ合い
}
function analyze(scene){
  const R=range(scene); const N=R.length; const Pp=scene.pot;
  const byT=[0,1,2,3].map(t=>R.filter(x=>x.t===t));
  const t3w=byT[3].filter(x=>x.res>0).length, t3l=byT[3].filter(x=>x.res<0).length, t3t=byT[3].filter(x=>x.res===0).length;
  const lowLose=R.filter(x=>x.t<3&&x.res<=0).length;
  const ev={};
  for(const opt of ['check','small','mid','big']){
    // 上物相手の続き（受ける／降りる）は、上物の中での平均で良い方を選ぶ
    let base=0; for(const x of R) if(!(x.t===3&&(opt==='check'||opt==='small'))) base+=delta(opt,x.t,x.res,Pp,true);
    let f1=0,f0=0; for(const x of byT[3]) if(opt==='check'||opt==='small'){ f1+=delta(opt,3,x.res,Pp,true); f0+=delta(opt,3,x.res,Pp,false); }
    ev[opt]={ev:(base+Math.max(f1,f0))/N, follow: (opt==='check'||opt==='small')? (f1>=f0?'受ける':'降りる'):null};
  }
  return {N, counts:byT.map(a=>a.length), t3:{win:t3w,lose:t3l,tie:t3t}, lowLose, ev};
}
module.exports={P,show,range,analyze,tier,limit,strongDraw,best,cmp,delta,TN,key};
