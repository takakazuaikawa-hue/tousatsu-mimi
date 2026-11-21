// リーディング：異議あり 試作。1つの HTML で単独に遊べる。枠・光る札・数は engine.js の計算から出す（手で書かない）。
(function(){
const E=S2_ENGINE, SC=S2_SCENES;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
const rk=c=>c.t[0]==='T'?'10':c.t[0];
const fm=t=>String(t).split('|').join('<wbr>');
const br=t=>String(t).split('|').join('<br>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('s2igi.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;}
addEventListener('resize',fit);fit();

// ---- 検算（ページの中の計算で、場面の表と食い違わないかを確かめる）
const MK={phase:'boot',scale:()=>SCALE};
MK.verify=()=>[SC.demo].concat(SC.scenes).map(s=>E.verifyScene(s));
MK.verifyResult=MK.verify();
MK.ans=SC.scenes.map(s=>s.ans);
window.S2IGI=MK;
window.S2IGI_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
function phase(p){MK.phase=p;board.dataset.phase=p;}

// ---- 時間（タップで早送り・お手本の間は本編を止める）
class Run{constructor(){this.dead=false;this.waits=new Set();this.ff=false;}
  kill(){this.dead=true;[...this.waits].forEach(w=>w.cancel());}
  kick(){[...this.waits].forEach(w=>w.fin());}}
let PAUSE=null,RESUME=null;
function wait(run,ms){
  if(run.ff)ms*=.25;
  return new Promise((res,rej)=>{
    const w={fired:false};
    const fin=async()=>{if(w.fired)return;w.fired=true;clearTimeout(w.t);run.waits.delete(w);
      if(run.dead)return rej(new Error('cancel'));
      while(PAUSE&&!run.noPause){await PAUSE;}
      if(run.dead)return rej(new Error('cancel'));res();};
    w.fin=fin;w.cancel=()=>{if(w.fired)return;w.fired=true;clearTimeout(w.t);run.waits.delete(w);rej(new Error('cancel'));};
    w.t=setTimeout(fin,ms/SPEED);run.waits.add(w);
  });
}

// ---- 札の絵
const cardHTML=c=>`<b>${rk(c)}</b><s>${SJ[c.s]}</s>`;
const isRed=c=>c.s==='h'||c.s==='d';
const cardEl=c=>el('div','cd'+(isRed(c)?' r':''),cardHTML(c));
const HAND='<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"><div class="face f-smug on"></div><div class="face f-busted"></div><div class="face f-plead"></div><div class="face f-panic"></div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="claim"><div class="ctext"></div><div class="slots"><div class="grp h"><label>手札</label></div><div class="grp b"><label>場から3枚</label></div></div></div>
  <div class="bd"></div>
  <div class="rule">手札は2枚だけ。役の5枚のうち、<em>3枚は場札に要る</em></div>
  <div class="pen">異議を外すと、ミミの札を1枚見せる</div>
  <div class="reason"></div>
  <div class="opts"><button class="opt" data-a="X"><b>異議あり！</b><span>この場札では作れない</span></button><button class="opt" data-a="O"><b>作れる</b><span>ウソとは言えない</span></button></div>
  <div class="speech"></div><div class="mimi"></div>
  <button class="go">卓へ</button>
  <div class="band">異議あり！</div>
  <button class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：異議あり</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button class="pgo btnA">はじめる</button></div>
  <div class="res"><div class="big">当たり</div><div class="num"></div><div class="lamps"></div><button class="rb btnA" data-r="again" style="left:316px;width:200px">もう1回</button><button class="rb btnB" data-r="demo" style="left:530px;width:200px">お手本</button></div>`;
  const q=s=>root.querySelector(s);
  const S={root,demo,sc:null,q};
  S.face=n=>{['smug','busted','plead','panic'].forEach(k=>q('.f-'+k).classList.toggle('on',k===n));};
  S.shake=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('shake');};
  S.bounce=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('bounce');};
  S.ins=(t,k)=>{const i=q('.ins');i.textContent=t;i.className='ins'+(k?' '+k:'');};
  S.rib=h=>{const r=q('.rib');r.innerHTML=h;r.style.display=h?'':'none';};
  S.say=(t,narrow)=>{const s=q('.speech');if(t){s.innerHTML=br(t);s.classList.toggle('narrow',!!narrow);s.classList.add('on');}else s.classList.remove('on');};
  S.rule=on=>{q('.rule').classList.toggle('on',!!on);q('.pen').classList.toggle('on',!!on&&!demo);};
  S.reason=t=>{const r=q('.reason');if(t){r.innerHTML=br(t);r.classList.add('on');}else r.classList.remove('on');};
  S.opts=on=>q('.opts').classList.toggle('on',!!on);
  S.optsEnable=on=>q('.opts').querySelectorAll('.opt').forEach(b=>{b.disabled=!on;b.classList.remove('press');});
  S.ask=on=>q('.askrico').classList.toggle('on',!!on);
  S.tbtn=on=>{q('.tbtn').style.display=on?'':'none';};
  S.rico=(t,smug)=>{const r=q('.rico');if(t){q('.rsay').innerHTML=fm(t);q('.rimg').classList.toggle('smug',!!smug);r.classList.add('on');}else r.classList.remove('on');};
  S.go=(label,on)=>{const g=q('.go');if(label)g.textContent=label;g.classList.toggle('on',!!on);};
  S.intro=(on,sn)=>{const i=q('.intro');if(sn!=null)q('.intro .sn').textContent=sn;i.classList.toggle('on',!!on);};
  S.mimi=c=>{const m=q('.mimi');if(c){m.innerHTML='';m.appendChild(cardEl(c));m.classList.add('on');}else{m.classList.remove('on');m.innerHTML='';}};
  S.band=()=>{const b=q('.band');b.classList.remove('on');void b.offsetWidth;b.classList.add('on');setTimeout(()=>b.classList.remove('on'),1150/SPEED);};
  S.bandOff=()=>q('.band').classList.remove('on');
  // 札と枠を作る
  S.setBoard=(str,anim)=>{
    const bd=q('.bd');bd.innerHTML='';
    S.boardC=str.split(' ').map((t,i)=>Object.assign(E.P(t),{id:'b'+i}));
    S.bcards=S.boardC.map(c=>{const e=cardEl(c);if(anim)e.classList.add('swap');bd.appendChild(e);return{c,e};});
  };
  S.resetSlots=()=>{
    const gh=q('.grp.h'),gb=q('.grp.b');
    gh.querySelectorAll('.sl').forEach(e=>e.remove());gb.querySelectorAll('.sl').forEach(e=>e.remove());
    const lh=gh.querySelector('label'),lb=gb.querySelector('label');
    S.hslots=[0,1].map(()=>{const e=el('div','sl hole');gh.insertBefore(e,lh);return e;});
    S.bslots=[0,1,2].map(()=>{const e=el('div','sl bs');gb.insertBefore(e,lb);return e;});
    lh.textContent='手札';lh.className='';lb.textContent='場から3枚';lb.className='';
    S.lh=lh;S.lb=lb;
  };
  S.load=sc=>{
    S.sc=sc;
    S.holeC=sc.polka.split(' ').map((t,i)=>Object.assign(E.P(t),{id:'h'+i}));
    S.mimiC=(sc.mimi||'').split(' ').filter(Boolean).map(E.P);
    S.setBoard(sc.board,false);S.resetSlots();
    q('.ctext').innerHTML=br(sc.claim);q('.claim').classList.remove('on');
    S.rule(false);S.say(null);S.reason(null);S.mimi(null);S.go(null,false);S.face('smug');S.rico(null);S.bandOff();
    S.optsEnable(false);q('.opts').classList.remove('on');q('.hand').classList.remove('on','tap');
    S.plan=E.plan(S.boardC,S.holeC,sc.cat);
  };
  // 言い分が出て、伏せ札2枚と空の枠3つが、ことんと並ぶ
  S.claimIn=async(run)=>{
    q('.claim').classList.add('on');await wait(run,500);
    const all=S.hslots.concat(S.bslots);
    for(const e of all){e.classList.add('in');await wait(run,110);}
  };
  S.glowSlots=on=>S.bslots.concat(S.hslots).forEach(e=>e.classList.toggle('glowf',!!on));
  S.liftBoard=(idxs)=>S.bcards.forEach((b,i)=>b.e.classList.toggle('glow',!!idxs&&idxs.includes(i)));
  S.dimExcept=(cards)=>S.bcards.forEach(b=>b.e.classList.toggle('dim',!!cards&&!cards.includes(b)&&!b.e.classList.contains('lent')));
  const rel=e=>{const r=e.getBoundingClientRect(),b=root.getBoundingClientRect();return{x:(r.left-b.left)/SCALE,y:(r.top-b.top)/SCALE,w:r.width/SCALE,h:r.height/SCALE};};
  // 場札が1枚、枠へ飛ぶ
  S.flyOne=async(run,b,slot)=>{
    const a=rel(b.e),t=rel(slot);
    const cl=el('div','cd fly'+(isRed(b.c)?' r':''),cardHTML(b.c));
    cl.style.cssText=`left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px`;root.appendChild(cl);
    b.e.classList.remove('glow');b.e.classList.add('lent');
    const dx=t.x-a.x,dy=t.y-a.y,sx=t.w/a.w,sy=t.h/a.h;
    cl.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate(0,-24px) scale(1.1)',offset:.28},{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`}],{duration:520/SPEED,easing:'ease-in-out',fill:'forwards'});
    try{await wait(run,520);}finally{cl.remove();}
    slot.className='sl bs in full'+(isRed(b.c)?' r':'');slot.innerHTML=cardHTML(b.c);
  };
  // ストレートだけ：場札が数字の順に並び直る
  S.sortBoard=async(run)=>{
    const first=new Map(S.bcards.map(b=>[b,rel(b.e)]));
    const sorted=[...S.bcards].sort((a,b)=>a.c.r-b.c.r);
    const bd=q('.bd');sorted.forEach(b=>bd.appendChild(b.e));S.bcards=sorted;
    sorted.forEach(b=>{const f=first.get(b),n=rel(b.e);const dx=f.x-n.x;if(Math.abs(dx)>1)b.e.animate([{transform:`translateX(${dx}px)`},{transform:'none'}],{duration:520/SPEED,easing:'ease-in-out'});});
    await wait(run,620);
  };
  // 計算から出した札を、順に枠へ
  S.fillCards=pl=>pl.fill.map(i=>S.boardC[i]).map(c=>S.bcards.find(b=>b.c===c));
  S.flyAll=async(run,pl,upto)=>{
    let cards=S.fillCards(pl);
    if(S.sc.cat===4)cards=cards.sort((a,b)=>a.c.r-b.c.r);
    const n=upto==null?cards.length:upto;
    for(let k=0;k<n;k++){await S.flyOne(run,cards[k],S.bslots[k]);await wait(run,140);}
    return cards;
  };
  // 結果：3つ目が空で赤く光る／3つとも金。下の札に一言（○枚）
  S.settle=(pl)=>{
    S.bslots.forEach((e,i)=>{if(i>=pl.fill.length){e.className='sl bs in miss';e.innerHTML='';}});
    const t=pl.tag;let txt;
    if(t.kind==='flush')txt=pl.ok?`${SJ[t.suit]} ${t.n}枚そろう`:`${SJ[t.suit]} ${t.n}枚だけ`;
    else if(t.kind==='straight')txt=pl.ok?'3枚そろう':`${t.n}枚だけ`;
    else txt=pl.ok?'ペアあり':'ペアなし';
    S.lb.textContent=txt;S.lb.className=pl.ok?'ok':'red';
    S.dimExcept(S.fillCards(pl));
  };
  S.flipHole=(i)=>{const e=S.hslots[i],c=S.holeC[i];e.className='sl open flipin in'+(isRed(c)?' r':'');e.innerHTML=cardHTML(c);S.lh.textContent='罰で1枚';S.lh.className='red';};
  return S;
}

// 4点の札
const CARD4=[['目的','賭けたポルカの「降りて、〇〇だよ」が|この場札で作れる役かを見やぶる。|ウソなら、罰で彼女の札が1枚めくれる。'],['やり方','場札を見て、「異議あり！」か「作れる」を|押す。'],['危なさ','作れる役に異議を言うと、ミミの札を|1枚見せる。'],['見る物','言い分の札の枠3つ（場から3枚）と、|場札のマークと数字。']];
const COACH={
  l1:'フラッシュは同じマークが5枚。ポルカの手札は2枚だけ。だから、あと3枚は場札に要るよ',
  l2:'♥は2枚だけ。枠が1つ埋まらない。この場では、フラッシュは作れない',
  l3:'当たり。罰で、ポルカの札が1枚見えたね',
  l4:'場に3枚あったら『作れる』。本当に持っているかは分からないから、異議は言わないでね。外すと、ミミの札を1枚見せることになるよ',
};
let DEMO=null;

// ============ お手本 ============
async function runDemo(replay){
  const run=new Run();run.noPause=true;
  const D=makeScreen(true);board.appendChild(D.root);DEMO=D;
  const prevPhase=MK.phase;phase('demo');
  const finish=()=>{run.kill();D.root.remove();DEMO=null;phase(prevPhase);};
  D.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;run.kick();});
  D.q('.skip').addEventListener('click',()=>{run.kill();});
  const sc=SC.demo;
  D.load(sc);D.rib('<b>お手本</b>');D.q('.rib').classList.add('demo');D.ins('');D.tbtn(false);
  const hand=D.q('.hand');
  const card4=async()=>{
    D.q('.skip').classList.add('off');D.rico(null);D.say(null);D.bandOff();
    D.q('.pl').innerHTML=CARD4.map(([a,b])=>`<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent=replay?'もどる':'はじめる';
    D.q('.panel').classList.add('on');phase('demo-card4');
    await new Promise(res=>D.q('.pgo').addEventListener('click',res,{once:true}));
  };
  try{
    phase('demo-0');
    D.intro(true,'お手本');await wait(run,1000);D.intro(false);await wait(run,250);
    // 拍1：場札・得意顔・言い分
    phase('demo-1');
    D.ins(`ポルカが${sc.bet}賭けて、揺さぶってきた`);
    D.q('.claim').classList.add('on');await wait(run,1800);
    // 止1：伏せ札2枚と空の枠3つ
    phase('demo-stop1');
    const all=D.hslots.concat(D.bslots);for(const e of all){e.classList.add('in');await wait(run,110);}
    D.glowSlots(true);D.rico(COACH.l1);await wait(run,4000);
    D.rico(null);D.glowSlots(false);await wait(run,200);
    // 拍2：場の 9♥ と 4♥ が枠へ
    phase('demo-2');
    D.ins('場札が枠へ入る');
    const pl=D.plan;
    await D.flyAll(run,pl);
    // 止2：3つ目の枠が赤く光る
    phase('demo-stop2');
    D.settle(pl);D.rico(COACH.l2,true);await wait(run,4000);
    D.rico(null);
    // 拍3：異議あり！
    phase('demo-3');
    D.ins('その役、この場札で作れる？');D.rule(true);D.opts(true);D.optsEnable(false);await wait(run,700);
    hand.classList.add('on');hand.style.left='520px';hand.style.top='296px';await wait(run,650);
    hand.classList.add('tap');D.q('.opt[data-a="X"]').classList.add('press');await wait(run,350);
    hand.classList.remove('on');D.rule(false);D.opts(false);
    D.q('.opt[data-a="X"]').classList.remove('press');
    D.band();D.face('busted');D.shake();await wait(run,700);
    D.say(sc.why[0]);D.ins('◎ 見破った！','good');D.reason(sc.reason);await wait(run,1500);
    // 拍4：罰で伏せ札が1枚めくれる
    phase('demo-4');
    D.flipHole(0);D.face('plead');D.say(sc.why[1]);await wait(run,2000);D.say(null);D.rico(COACH.l3,true);await wait(run,2800);
    // 止3：3枚そろう見本
    phase('demo-stop3');
    D.rico(null);D.say(null);D.reason(null);D.face('smug');D.ins('場に3枚あったら','');
    D.setBoard(SC.demoAfter.board,true);D.resetSlots();D.hslots.concat(D.bslots).forEach(e=>e.classList.add('in'));
    await wait(run,700);
    const sc2=Object.assign({},sc,{polka:'Kc 5c'});D.holeC=sc2.polka.split(' ').map(E.P);
    const pl2=E.plan(D.boardC,D.holeC,5);
    await D.flyAll(run,pl2);D.settle(pl2);
    D.rico(COACH.l4,true);await wait(run,4500);
  }catch(e){if(e.message!=='cancel')throw e;}
  await card4();
  window.S2IGI_LOG.demoDone=(window.S2IGI_LOG.demoDone||0)+1;
  finish();
}

// ============ 明かし ============
async function reveal(run,S,sc,pick){
  const hit=pick===sc.ans,pl=S.plan;
  S.say(null);S.rule(false);S.optsEnable(false);S.opts(false);S.liftBoard(null);
  if(pick==='X'){S.band();await wait(run,850);}
  if(sc.cat===4){S.ins('場札を数字の順に');await sortBoardSafe(run,S);}
  S.ins('場札が枠へ入る');
  await S.flyAll(run,pl);
  S.settle(pl);await wait(run,500);
  S.reason(sc.reason);
  if(pick==='X'&&sc.ans==='X'){
    S.ins('◎ 見破った！','good');
    S.face('busted');S.shake();S.say(sc.why[0]);await wait(run,1900);
    S.flipHole(0);S.face('plead');S.say(sc.why[1]);await wait(run,2300);
  }else if(pick==='O'&&sc.ans==='O'){
    S.ins('○ 正しく見た（ウソとは言えない）','good');
    S.face('smug');S.say(SC.LINES.ok_O[0]);await wait(run,1800);
    S.say(SC.LINES.ok_O[1]);await wait(run,1900);
  }else if(pick==='X'){
    S.ins('✕ ミミの札を1枚見せる','bad');
    S.face('smug');S.bounce();S.say(SC.LINES.miss_X[0],true);await wait(run,1900);
    S.say(SC.LINES.miss_X[1],true);S.mimi(S.mimiC[0]);await wait(run,2200);
  }else{
    S.ins('✕ 見逃した…','bad');
    S.face('smug');S.bounce();S.say(SC.LINES.miss_O[0]);await wait(run,2500);
  }
  return hit;
}
async function sortBoardSafe(run,S){await S.sortBoard(run);}

// ============ 本編 ============
const G={score:0,results:[]};
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.S2IGI_LOG.demoOpens++;
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  const rec={id:sc.id,ans:sc.ans,pick:null,ok:null,secs:null,ricoOpens:0,fill:S.plan&&null};
  S.load(sc);S.locked=false;
  S.rib(`当たり <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  // 言い張る
  phase('s'+sc.id+'-claim');
  S.ins(`ポルカが${sc.bet}賭けて、揺さぶってきた`);
  S.face('smug');
  await S.claimIn(run);
  run.ff=false;await wait(run,350);
  // 決める
  phase('s'+sc.id+'-pick');
  S.ins('その役、この場札で作れる？');S.rule(true);S.opts(true);S.optsEnable(false);
  S.ask(sc.id<=2);
  const t0=performance.now();
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.S2IGI_LOG.ricoOpens++;S.liftBoard(S.plan.fill);S.rule(false);S.rico(sc.coach,true);S.ask(false);};
  S.q('.rico').onclick=()=>{S.rico(null);S.liftBoard(null);S.rule(true);S.ask(sc.id<=2);};
  await wait(run,400);S.optsEnable(true);
  const pick=await new Promise(res=>{
    S.q('.opts').onclick=e=>{const b=e.target.closest('.opt');if(!b||b.disabled)return;S.optsEnable(false);b.classList.add('press');res(b.dataset.a);};
  });
  S.q('.opts').onclick=null;S.locked=true;S.rico(null);S.ask(false);
  rec.pick=pick;rec.secs=+((performance.now()-t0)/1000).toFixed(1);rec.ok=pick===sc.ans;
  if(rec.ok)G.score++;
  S.tbtn(false);
  // 明かし
  phase('s'+sc.id+'-reveal');
  await reveal(run,S,sc,pick);
  S.rib(`当たり <b>${G.score}／6</b>`);
  window.S2IGI_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.tbtn(true);
  S.go(i<5?'卓へ':'結果を見る',true);
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.q('.go').onclick=res;});
  S.q('.go').onclick=null;
}
const HIDE=['.top','.claim','.bd','.rule','.pen','.reason','.opts','.speech','.mimi','.go','.askrico'];
async function showResult(S){
  S.load(SC.scenes[0]);
  HIDE.forEach(s=>S.q(s).style.display='none');
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'✕'}</i>`).join('');
  S.face(G.score>=5?'busted':G.score>=3?'plead':'smug');
  phase('result');
  window.S2IGI_LOG.final={score:G.score,results:G.results.slice()};
  return new Promise(res=>{r.onclick=e=>{const b=e.target.closest('button');if(b)res(b.dataset.r);};});
}
function resetScreenVisibility(S){
  HIDE.forEach(s=>S.q(s).style.display='');
  S.q('.res').classList.remove('on');
}
async function main(){
  const S=makeScreen(false);board.appendChild(S.root);
  const run=new Run();
  S.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;if(/claim$/.test(MK.phase)){run.ff=true;run.kick();}});
  S.q('.tbtn').addEventListener('click',openDemoFromPlay);
  S.load(SC.scenes[0]);
  if(!LS.get('s2igi.seen')){window.S2IGI_LOG.autoDemo=true;await runDemo(false);LS.set('s2igi.seen','1');}
  for(;;){
    G.score=0;G.results=[];window.S2IGI_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.S2IGI_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.S2IGI.error=String(e&&e.stack||e);console.error(e);});
})();
