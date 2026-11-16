// リーディング：押し出すふり 試作。1つの HTML で単独に遊べる。顔・口がすべる役・光る場札・正解は engine.js の計算から出す（手で書かない）。
(function(){
const E=S1_ENGINE, SC=S1_SCENES, T=SC.T;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
const fm=t=>String(t).split('|').join('<wbr>');
const br=t=>String(t).split('|').join('<br>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('s1furi.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;}
addEventListener('resize',fit);fit();

// ---- 検算（ページの中の計算で、場面の表と食い違わないかを確かめる）
const MK={phase:'boot',scale:()=>SCALE};
MK.verify=()=>[SC.demo].concat(SC.scenes).map(s=>E.verify(s));
MK.verifyResult=MK.verify();
MK.ans=SC.scenes.map(s=>E.analyze(s).ans);
MK.kinds=SC.scenes.map(s=>{const A=E.analyze(s);return A.bluff?'はったり':A.polkaHigher?'本物・ポルカが上':'本物・ミミが上';});
window.S1FURI=MK;
window.S1FURI_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
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

// ---- 絵の先読み（入りの1秒で顔を全部読む。押した瞬間に遅れて出さない）
async function preload(){
  const cs=getComputedStyle(document.documentElement);
  const names=['f_def','f_smug','f_panic','f_plead','f_busted','f_bawl','rico_think','rico_smug','table'];
  await Promise.all(names.map(async n=>{
    let v=cs.getPropertyValue('--a-'+n).trim();if(!v)return;
    v=v.replace(/^url\(/,'').replace(/\)$/,'').replace(/^["']|["']$/g,'');
    const im=new Image();im.src=v;try{await im.decode();}catch(e){}
  }));
  MK.preloaded=true;
}

// ---- 札の絵
const cardHTML=c=>`<b>${E.rk(c)}</b><s>${SJ[c.s]}</s>`;
const isRed=c=>c.s==='h'||c.s==='d';
const cardEl=c=>el('div','cd'+(isRed(c)?' r':''),cardHTML(c));
const backEl=()=>el('div','cd back');
const HAND='<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const SWEAT='<svg viewBox="0 0 46 54"><path d="M23 3C23 3 6 25 6 35a17 17 0 0 0 34 0C40 25 23 3 23 3z" fill="#9fe3ff" stroke="#1b6fa0" stroke-width="3"/><path d="M14 35a9 9 0 0 0 7 9" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>';
const NOTE='<svg viewBox="0 0 46 54"><ellipse cx="14" cy="43" rx="10" ry="7.5" transform="rotate(-20 14 43)" fill="#ffe29a" stroke="#7a4e0f" stroke-width="2.5"/><path d="M22 41V7" stroke="#7a4e0f" stroke-width="6" stroke-linecap="round"/><path d="M22 41V7" stroke="#ffe29a" stroke-width="2.6" stroke-linecap="round"/><path d="M22 7c4 8 16 8 17 22-4-8-10-7-17-12z" fill="#ffe29a" stroke="#7a4e0f" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const LADDER=[[6,'フルハウス'],[5,'フラッシュ'],[4,'ストレート'],[3,'スリーカード'],[2,'ツーペア'],[1,'ペア']];

// 押し出しの道の寸法（道の中での山の左端）
const START=474,GOAL=10,LANEX=262,LANEY=252;
const stageOf=p=>p>=.75?2:p>=.4?1:0;
const pileLeft=p=>START-p*(START-GOAL);

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"><div class="face f-def on"></div><div class="face f-smug"></div><div class="face f-panic"></div><div class="face f-plead"></div><div class="face f-busted"></div><div class="face f-bawl"></div>
   <div class="mk sweat">${SWEAT}</div><div class="mk note">${NOTE}</div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="speech"></div>
  <div class="top"><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="hole"></div><div class="bd"></div><div class="mc"></div>
  <div class="slips"><div class="sp polka"></div><div class="sp mimi"></div></div>
  <div class="ladder"></div>
  <div class="rule"><u>あわてたら、はったり。</u><br>にやけたら、<em>本物</em>——口がすべって、役を言う</div>
  <div class="reason"></div>
  <div class="lane"><div class="road"></div><div class="gline"></div><div class="glabel">ここまでが ふり</div>
   <div class="hint"><svg viewBox="0 0 46 56">${HAND.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg><b>➜</b></div>
   <div class="pile"><div class="chip">600</div></div></div>
  <div class="opts"><button class="opt" data-a="払う">払う 600</button><button class="opt" data-a="降りる">降りる</button></div>
  <button class="go">次へ</button>
  <button class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：押し出すふり</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button class="pgo btnA">はじめる</button></div>
  <div class="res"><div class="big">読み勝ち</div><div class="num"></div><div class="lamps"></div><button class="rb btnA" data-r="again" style="left:316px;width:200px">もう1回</button><button class="rb btnB" data-r="demo" style="left:530px;width:200px">お手本</button></div>`;
  const q=s=>root.querySelector(s);
  const S={root,demo,sc:null,q,A:null,pos:0,stage:0,near:false,tellDone:false,locked:false};
  const pile=q('.pile'),lane=q('.lane');
  S.face=n=>{S.curFace=n;['def','smug','panic','plead','busted','bawl'].forEach(k=>q('.f-'+k).classList.toggle('on',k===n));};
  S.shake=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('shake');};
  S.bounce=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('bounce');};
  S.ins=(t,k)=>{const i=q('.ins');i.innerHTML=br(t);i.className='ins'+(k?' '+k:'');};
  S.rib=h=>{const r=q('.rib');r.innerHTML=h;r.style.display=h?'':'none';};
  S.fill=t=>String(t).replace(/\{F\}/g,(S.A&&S.A.say)||'').replace(/\{M\}/g,S.A?S.A.mimiCat:'').replace(/\{P\}/g,S.A?S.A.mimiName:'');
  S.say=t=>{const s=q('.speech');if(t){s.innerHTML=br(S.fill(t));s.classList.add('on');}else s.classList.remove('on');};
  S.mark=k=>{q('.mk.sweat').classList.toggle('on',k==='sweat');q('.mk.note').classList.toggle('on',k==='note');};
  S.rule=on=>q('.rule').classList.toggle('on',!!on);
  S.reason=t=>{const r=q('.reason');if(t){r.innerHTML=br(S.fill(t));r.classList.add('on');}else r.classList.remove('on');};
  S.laneOn=on=>q('.lane').classList.toggle('on',!!on);
  S.opts=on=>{const o=q('.opts');o.classList.toggle('on',!!on);if(!on)o.classList.remove('lit');};
  S.optsEnable=on=>q('.opts').querySelectorAll('.opt').forEach(b=>{b.disabled=!on;b.classList.remove('press');});
  S.ask=on=>q('.askrico').classList.toggle('on',!!on);
  S.tbtn=on=>{q('.tbtn').style.display=on?'':'none';};
  S.rico=(t,smug)=>{const r=q('.rico');if(t){q('.rsay').innerHTML=fm(S.fill(t));q('.rimg').classList.toggle('smug',!!smug);r.classList.add('on');}else r.classList.remove('on');};
  S.go=(label,on)=>{const g=q('.go');if(label)g.textContent=label;g.classList.toggle('on',!!on);};
  S.intro=(on,sn)=>{const i=q('.intro');if(sn!=null)q('.intro .sn').textContent=sn;i.classList.toggle('on',!!on);};
  S.hand=(x,y,on,tap)=>{const h=q('.hand');if(x!=null)h.style.left=x+'px';if(y!=null)h.style.top=y+'px';h.classList.toggle('on',!!on);h.classList.toggle('tap',!!tap);};
  // 札
  S.load=sc=>{
    S.sc=sc;const A=S.A=E.analyze(sc);
    const hole=q('.hole');hole.innerHTML='';A.Q.forEach(()=>hole.appendChild(backEl()));
    const bd=q('.bd');bd.innerHTML='';S.bcards=A.B.map(c=>{const e=cardEl(c);bd.appendChild(e);return e;});
    const mc=q('.mc');mc.innerHTML='';mc.classList.remove('lit');A.M.forEach(c=>mc.appendChild(cardEl(c)));
    const pk=q('.sp.polka');pk.className='sp polka';pk.textContent='';
    q('.sp.mimi').className='sp mimi';q('.sp.mimi').textContent='ミミ：'+A.mimiName;
    // はしご
    const ld=q('.ladder');ld.className='ladder';
    ld.innerHTML=LADDER.map(([c,n])=>`<div class="lr" data-c="${c}"><i></i><span>${n}</span></div>`).join('');
    S.pos=0;S.stage=0;S.near=false;S.tellDone=false;S.tellPending=false;S.locked=false;S.onNear=null;S.onTellDone=null;S.onStageLog=null;
    pile.style.transition='none';pile.style.left=START+'px';pile.className='pile';lane.className='lane';
    S.face('def');S.say(null);S.mark(null);S.rule(false);S.reason(null);S.laneOn(false);S.opts(false);S.optsEnable(false);
    S.go(null,false);S.rico(null);S.ask(false);S.hand(null,null,false);
    q('.rule').style.visibility='';
    S.ins('');
  };
  S.setSlip=txt=>{const pk=q('.sp.polka');pk.textContent='ポルカ：'+txt;pk.classList.add('on','pop');setTimeout(()=>pk.classList.remove('pop'),600);};
  S.glint=on=>S.bcards.forEach((e,i)=>e.classList.toggle('glow',!!on&&S.A.glint.includes(i)));
  S.ladderOn=(showP,showM)=>{
    const A=S.A,ld=q('.ladder');
    ld.querySelectorAll('.lr').forEach(r=>{const c=+r.dataset.c;
      const lp=c===Math.max(1,A.qc),lm=c===Math.max(1,A.mc);
      const i=r.querySelector('i');const onP=!!showP&&lp&&A.qc>=1,onM=!!showM&&lm&&A.mc>=1;
      i.className=onP?'on p':onM?'on m':'';i.textContent=onP?'ポ':onM?'ミ':'';
      r.classList.toggle('hit',!!(showP&&showM&&c===Math.max(A.qc,A.mc)));});
    ld.classList.add('on');
  };
  S.ladderOff=()=>q('.ladder').classList.remove('on');
  S.openHole=()=>{const hole=q('.hole');hole.innerHTML='';S.A.Q.forEach(c=>{const e=cardEl(c);e.classList.add('flipin');hole.appendChild(e);});};
  // ---- 押し出し：山の位置から顔と印を出す（乱数なし。何度押しても同じ反応）
  S.placePile=(p,ms)=>{
    p=Math.max(0,Math.min(1,p));
    pile.style.transition=ms?`left ${ms}ms ease-in-out`:'none';pile.style.left=pileLeft(p)+'px';
    S.pos=p;const st=stageOf(p);
    if(st!==S.stage){const prev=S.stage;S.stage=st;S.react(st,prev);}
  };
  S.react=(st,prev)=>{
    const A=S.A;
    if(S.onStageLog)S.onStageLog(st,prev);
    if(st===2){
      if(A.bluff){
        S.face('panic');S.say(T.panic);S.mark('sweat');
        if(!S.tellDone){S.near=true;S.setSlip('あわてた');S.tellDone=true;if(S.onNear)S.onNear();if(S.onTellDone)setTimeout(S.onTellDone,50/SPEED);}
        else S.near=true;
      }else{
        S.face('smug');S.say(T.smug);S.mark('note');
        if(!S.tellDone&&!S.tellPending){
          S.tellPending=true;S.near=true;if(S.onNear)S.onNear();
          setTimeout(()=>{
            if(S.stage===2){S.say(T.oops);}
            S.setSlip(A.say);S.glint(true);S.tellDone=true;S.tellPending=false;
            if(S.onTellDone)S.onTellDone();
          },650/SPEED);
        }
      }
    }else{
      S.face('def');S.say(T.calm);
      S.mark(st===1?(A.bluff?'sweat':'note'):null);
    }
  };
  S.tap=()=>{const st=S.stage;S.placePile(st===0?.55:st===1?1:0,380);};
  // 指で引きずる
  let drag=null;
  pile.addEventListener('pointerdown',e=>{
    if(S.locked||!lane.classList.contains('on'))return;
    e.preventDefault();pile.setPointerCapture(e.pointerId);
    const r=board.getBoundingClientRect();const bx=(e.clientX-r.left)/SCALE;
    drag={id:e.pointerId,x0:e.clientX,off:bx-LANEX-pileLeft(S.pos),moved:false,t0:performance.now()};
    pile.classList.add('drag');lane.classList.remove('hinting');
    if(S.onTouch)S.onTouch();
  });
  pile.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(Math.abs(e.clientX-drag.x0)>6)drag.moved=true;
    if(!drag.moved)return;
    const r=board.getBoundingClientRect();const bx=(e.clientX-r.left)/SCALE;
    const left=Math.max(GOAL,Math.min(START,bx-LANEX-drag.off));
    S.placePile((START-left)/(START-GOAL),0);
  });
  const up=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const d=drag;drag=null;pile.classList.remove('drag');
    if(!d.moved)S.tap();
  };
  pile.addEventListener('pointerup',up);pile.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id){drag=null;pile.classList.remove('drag');}});
  S.pileOut=(pay)=>{
    pile.style.transition='left .5s ease-in,opacity .5s';
    if(pay){pile.style.left=(GOAL-30)+'px';}else{pile.style.left=(START+40)+'px';}
    pile.classList.add('gone');
  };
  return S;
}

// 4点の札
const CARD4=[['目的','ポルカの大きな賭けが、はったりか本物かを|見やぶって、払うか降りるかを決める。'],['やり方','チップの山を金の線まで近づけて、顔を見る。|それから「払う」か「降りる」。'],['危なさ','本物に、下の役で払うと負ける（−600）。|はったりに降りると、取れたポットを逃す。'],['見る物','ポルカの顔（あわてる／にやける）と、|口がすべった役。それと、ミミの役。']];
let DEMO=null;

// ============ 明かし（選んだ事と起きた事に台詞を必ず合わせる） ============
function outcome(S,pay){
  const A=S.A,F=A.say,M=A.mimiCat,Pn=A.mimiName;
  let kind;
  if(A.bluff)kind=pay?'bPay':'bFold';else if(A.polkaHigher)kind=pay?'rPayLost':'rFold';else kind=pay?'rPayWon':'rFoldMissed';
  const O={
    bPay:{stamp:['◎ 見やぶった　＋1200','good'],reason:`あわてたのは、払われたら負けるから。|${Pn}で勝ち`,
      steps:[{f:'busted',t:'うぅ〜……|なんにも なかったの〜！',ms:1700,fx:['flip','shake']},{f:'busted',t:'なんで 分かったの〜！？',ms:1800,fx:['stamp','reason']}]},
    bFold:{stamp:['✕ だまされた　±0|（払えば ＋1200）','bad'],reason:`あわてていた。|払えば、${Pn}で勝っていた`,
      steps:[{f:'smug',t:'ほっ……。|えへへ、助かった〜♪',ms:1700,fx:['bounce']},{f:'busted',t:'じつは、|なんにも なかったの♪',ms:2000,fx:['flip','stamp','reason']}]},
    rFold:{stamp:['◎ かわした　±0|（払えば −600）','good'],reason:`${F}は、${M}より上。降りて正解`,
      steps:[{f:'plead',t:`え〜っ、降りちゃうの〜？|せっかく|${F} だったのに〜！`,ms:2300,fx:['flip','ladder','stamp','reason']}]},
    rPayLost:{stamp:['✕ つかまった　−600','bad'],reason:`${F}は、${M}より上。|にやけたのは、勝てるから`,
      steps:[{f:'smug',t:'やった〜！ 払った払った♪',ms:1500,fx:['bounce']},{f:'smug',t:`ほら、${F}！|言ったでしょ〜♪`,ms:2000,fx:['flip','ladder','stamp','reason']}]},
    rPayWon:{stamp:['◎ 上をいった　＋1200','good'],reason:`${F}より、${M}が上。|本物でも、ミミが上なら払う`,
      steps:[{f:'smug',t:`やった〜！ 払った払った♪|${F}だよ〜！`,ms:1700,fx:['flip']},{f:'busted',t:`えっ……${M}！？|うそぉ〜！`,ms:1700,fx:['ladder','mimilit','shake']},{f:'bawl',t:'うわぁ〜ん！',ms:1500,fx:['stamp','reason']}]},
    rFoldMissed:{stamp:['△ もったいない　±0|（払えば ＋1200）','mid'],reason:`${F}より、${M}が上。払えば勝っていた`,
      steps:[{f:'plead',t:`え〜っ、降りちゃうの〜？|${F}だったのに〜`,ms:1800,fx:['flip']},{f:'busted',t:`……え、ミミちゃん|${M}だったの！？|あぶな〜い！`,ms:2300,fx:['ladder','mimilit','stamp','reason']}]},
  };
  return Object.assign({kind},O[kind]);
}
async function reveal(run,S,pay){
  const O=outcome(S,pay),A=S.A;
  S.say(null);S.mark(null);S.rule(false);S.optsEnable(false);S.opts(false);S.laneOn(false);S.rico(null);S.ask(false);S.locked=true;
  S.pileOut(pay);await wait(run,550);
  S.ins('');
  for(const st of O.steps){
    S.face(st.f);S.say(st.t);
    if(st.fx.includes('flip')){S.openHole();}
    if(st.fx.includes('shake'))S.shake();
    if(st.fx.includes('bounce'))S.bounce();
    if(st.fx.includes('ladder')||(st.fx.includes('flip')&&!A.bluff)){S.ladderOn(true,true);}
    if(st.fx.includes('mimilit')){S.q('.mc').classList.add('lit');S.q('.sp.mimi').classList.add('lit');}
    if(st.fx.includes('stamp'))S.ins(O.stamp[0],O.stamp[1]);
    if(st.fx.includes('reason'))S.reason(O.reason);
    await wait(run,st.ms);
  }
  S.ins(O.stamp[0],O.stamp[1]);S.reason(O.reason);
  return O;
}

// ============ お手本 ============
async function runDemo(replay){
  const run=new Run();run.noPause=true;
  const D=makeScreen(true);board.appendChild(D.root);DEMO=D;
  const prevPhase=MK.phase;phase('demo');
  const finish=()=>{run.kill();D.root.remove();DEMO=null;phase(prevPhase);};
  D.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;run.kick();});
  D.q('.skip').addEventListener('click',()=>{run.kill();});
  const sc=SC.demo;
  D.load(sc);D.rib('<b>お手本</b>');D.q('.rib').classList.add('demo');D.tbtn(false);
  const pileX=p=>LANEX+pileLeft(p)+14;
  const card4=async()=>{
    D.q('.skip').classList.add('off');D.rico(null);D.say(null);
    D.q('.pl').innerHTML=CARD4.map(([a,b])=>`<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent=replay?'もどる':'はじめる';
    D.q('.panel').classList.add('on');phase('demo-card4');
    await new Promise(res=>D.q('.pgo').addEventListener('click',res,{once:true}));
  };
  try{
    phase('demo-0');
    D.intro(true,'お手本');await wait(run,1000);D.intro(false);await wait(run,250);
    // 拍1：賭けてくる。すぐすまし顔
    phase('demo-1');
    D.ins('ポルカが大きく賭けた。|すまし顔で、がまんしている');
    D.say(T.bet[0]);D.shake();await wait(run,1000);D.say(T.bet[1]);await wait(run,1000);
    // 止1：山と金の線が光る
    phase('demo-stop1');
    D.laneOn(true);D.q('.lane').classList.add('glowline');D.rule(true);
    D.rico(SC.COACH_DEMO.l1);await wait(run,4000);
    D.rico(null);D.q('.lane').classList.remove('glowline');await wait(run,200);
    // 拍2：手の印が山を左へ。途中で汗、近くであわてる
    phase('demo-2');
    D.ins('チップを近づけて、顔を見る');
    D.hand(pileX(0),LANEY+14,true);await wait(run,500);
    D.hand(pileX(.55),null,true);D.placePile(.55,800);await wait(run,1100);
    D.hand(pileX(1),null,true);D.placePile(1,700);await wait(run,1700);
    // 止2：あわてた顔と印が光る
    phase('demo-stop2');
    D.q('.sp.polka').classList.add('lit');
    D.rico(SC.COACH_DEMO.l2,true);await wait(run,4000);
    D.rico(null);D.q('.sp.polka').classList.remove('lit');
    // 拍3：右へ戻す。すまし顔に戻る。印は残る
    phase('demo-3');
    D.hand(pileX(0),null,true);D.placePile(0,900);await wait(run,1500);D.hand(null,null,false);
    // 止3：ミミの役の札が光る
    phase('demo-stop3');
    D.q('.sp.mimi').classList.add('lit');D.q('.mc').classList.add('lit');
    D.rico(SC.COACH_DEMO.l3,true);await wait(run,4000);
    D.rico(null);D.q('.sp.mimi').classList.remove('lit');D.q('.mc').classList.remove('lit');
    // 拍4：「払う」を押す
    phase('demo-4');
    D.ins('払う？ 降りる？');D.opts(true);D.optsEnable(true);await wait(run,500);
    D.hand(400,326,true);await wait(run,900);
    D.hand(null,null,true,true);D.q('.opt[data-a="払う"]').classList.add('press');await wait(run,400);D.hand(null,null,false);
    await reveal(run,D,true);
    D.rico(SC.COACH_DEMO.l4,true);await wait(run,4500);
  }catch(e){if(e.message!=='cancel')throw e;}
  await card4();
  window.S1FURI_LOG.demoDone=(window.S1FURI_LOG.demoDone||0)+1;
  finish();
}

// ============ 本編 ============
const G={score:0,results:[],hintDone:false};
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.S1FURI_LOG.demoOpens++;
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  const rec={id:sc.id,ans:null,pick:null,ok:null,secs:null,pushes:0,pulls:0,ricoOpens:0};
  S.load(sc);rec.ans=S.A.ans;
  S.rib(`読み勝ち <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  // 賭けてくる
  phase('s'+sc.id+'-bet');
  S.ins('ポルカが大きく賭けた。|すまし顔で、がまんしている');
  S.say(T.bet[0]);S.shake();await wait(run,1000);S.say(T.bet[1]);
  run.ff=false;await wait(run,900);
  // 押し出す
  phase('s'+sc.id+'-push');
  S.ins('チップを近づけて、顔を見る');S.laneOn(true);S.rule(true);
  const showHint=!G.hintDone;
  if(showHint)S.q('.lane').classList.add('hinting');
  S.q('.lane').classList.add('glowline');
  S.onTouch=()=>{G.hintDone=true;S.q('.lane').classList.remove('hinting');};
  S.onStageLog=(st,prev)=>{if(st>prev)rec.pushes++;else rec.pulls++;};
  const t0=performance.now();
  S.onNear=()=>{phase('s'+sc.id+'-tell');S.q('.lane').classList.remove('glowline');};
  await new Promise(res=>{S.onTellDone=res;});
  // 決める
  S.q('.lane').classList.remove('hinting','glowline');
  if(sc.guided){S.ladderOn(true,true);S.ask(true);}
  S.ins('払う？ 降りる？');S.opts(true);S.optsEnable(false);S.q('.opts').classList.add('lit');
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.S1FURI_LOG.ricoOpens++;S.rico(sc.coach.split('|').join('<wbr>'),true);S.ask(false);S.q('.rico').classList.add('guide');};
  S.q('.rico').onclick=()=>{S.rico(null);S.ask(!!sc.guided);};
  await wait(run,400);S.optsEnable(true);
  phase('s'+sc.id+'-pick');
  const pick=await new Promise(res=>{
    S.q('.opts').onclick=e=>{const b=e.target.closest('.opt');if(!b||b.disabled)return;S.optsEnable(false);b.classList.add('press');res(b.dataset.a);};
  });
  S.q('.opts').onclick=null;S.locked=true;S.onStageLog=null;S.rico(null);S.ask(false);
  rec.pick=pick;rec.secs=+((performance.now()-t0)/1000).toFixed(1);rec.ok=pick===rec.ans;
  if(rec.ok)G.score++;
  S.tbtn(false);
  // 明かし
  phase('s'+sc.id+'-reveal');
  const O=await reveal(run,S,pick==='払う');
  rec.kind=O.kind;
  S.rib(`読み勝ち <b>${G.score}／6</b>`);
  window.S1FURI_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.tbtn(true);
  S.go(i<5?'次へ':'結果を見る',true);
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.q('.go').onclick=res;});
  S.q('.go').onclick=null;
}
const HIDE=['.top','.hole','.bd','.mc','.slips','.ladder','.rule','.reason','.opts','.speech','.go','.askrico','.lane'];
async function showResult(S){
  S.load(SC.scenes[0]);
  HIDE.forEach(s=>S.q(s).style.display='none');
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'✕'}</i>`).join('');
  S.face(G.score>=5?'bawl':G.score>=3?'plead':'smug');
  phase('result');
  window.S1FURI_LOG.final={score:G.score,results:G.results.slice()};
  return new Promise(res=>{r.onclick=e=>{const b=e.target.closest('button');if(b)res(b.dataset.r);};});
}
function resetScreenVisibility(S){
  HIDE.forEach(s=>S.q(s).style.display='');
  S.q('.res').classList.remove('on');
}
async function main(){
  const S=makeScreen(false);board.appendChild(S.root);
  const run=new Run();
  S.root.addEventListener('pointerdown',e=>{if(e.target.closest('button,.pile'))return;if(/bet$/.test(MK.phase)){run.ff=true;run.kick();}});
  S.q('.tbtn').addEventListener('click',openDemoFromPlay);
  S.load(SC.scenes[0]);
  S.intro(true,'');
  await preload();
  S.intro(false);
  if(!LS.get('s1furi.seen')){window.S1FURI_LOG.autoDemo=true;await runDemo(false);LS.set('s1furi.seen','1');}
  for(;;){
    G.score=0;G.results=[];window.S1FURI_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.S1FURI_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.S1FURI.error=String(e&&e.stack||e);console.error(e);});
})();
