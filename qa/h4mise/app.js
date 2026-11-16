// リーディング：見せ合いっこ 試作。1つの HTML で単独に遊べる。役の名前・糸・台詞・結果は engine.js の計算から出す（手で書かない）。
(function(){
const E=H4_ENGINE, SC=H4_SCENES;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const SJ=E.SJ;
const rk=c=>c.t[0]==='T'?'10':c.t[0];
const fm=t=>String(t).split('|').join('<wbr>');
const br=t=>String(t).split('|').join('<br>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('h4mise.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;}
addEventListener('resize',fit);fit();

// ---- 検算（ページの中の計算で、場面の表と食い違わないかを確かめる）
const MK={phase:'boot',scale:()=>SCALE};
MK.verify=()=>[SC.demo].concat(SC.scenes).map(s=>E.verifyScene(s));
MK.verifyResult=MK.verify();
MK.ans=SC.scenes.map(s=>s.ans);
MK.info=SC.scenes.map(s=>{const d=E.derive(s);return{id:s.id,her:d.herName,mimi:d.mimiName,ahead:Math.sign(d.ahead),out:d.r.out,seen:d.seen.map(x=>x.name),links:d.seen.map(x=>x.idx)};});
window.H4MISE=MK;
window.H4MISE_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
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
const cardEl=(c,cls)=>el('div','cd'+(isRed(c)?' r':'')+(cls?' '+cls:''),cardHTML(c));
const HAND='<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const BX=i=>452+66*i+30, HX=j=>308+66*j+30;
const ROW_TOP=72, ROW_BOT=154, BUS=160, CLONE_X=764, CLONE_TOP=166;

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"><div class="face f-drunk on"></div><div class="face f-drunk2"></div><div class="face f-bawl"></div><div class="face f-panic"></div><div class="face f-plead"></div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="bd"></div>
  <svg class="thr" viewBox="0 0 800 370"><g class="gh"></g><g class="gm"></g></svg>
  <div class="chip hc"></div><div class="chip sc"></div>
  <div class="rule">見せた1枚＋場札の役が、彼女の役より<em>下</em>に見えれば、払う。<em class="u">上</em>なら、降りる</div>
  <div class="reason"></div>
  <div class="clone"></div>
  <div class="mc m0"></div><div class="mc m1"></div>
  <div class="chip mch"></div>
  <div class="opts"><button class="shw">これを見せる</button><button class="hide"><b>見せない</b><span>こわがったまま、<br>降りる</span></button></div>
  <div class="speech"></div>
  <button class="go">卓へ</button>
  <button class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">${SC.TITLE}</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button class="pgo btnA">はじめる</button></div>
  <div class="res"><div class="big">うまくいった</div><div class="num"></div><div class="lamps"></div><button class="rb btnA" data-r="again" style="left:316px;width:200px">もう1回</button><button class="rb btnB" data-r="demo" style="left:530px;width:200px">お手本</button></div>`;
  const q=s=>root.querySelector(s);
  const S={root,demo,sc:null,d:null,q,sel:null};
  const FACES=['drunk','drunk2','bawl','panic','plead'];
  S.face=n=>{FACES.forEach(k=>q('.f-'+k).classList.toggle('on',k===n));};
  S.shake=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('shake');};
  S.bounce=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('bounce');};
  S.ins=(t,k)=>{const i=q('.ins');i.textContent=t;i.className='ins'+(k?' '+k:'');};
  S.rib=h=>{const r=q('.rib');r.innerHTML=h;r.style.display=h?'':'none';};
  S.say=(t,mode)=>{const s=q('.speech');if(t){s.innerHTML=br(t);s.className='speech '+(mode||'')+' on';}else s.classList.remove('on');};
  S.rule=on=>q('.rule').classList.toggle('on',!!on);
  S.reason=t=>{const r=q('.reason');if(t){r.innerHTML=fm(t);r.classList.add('on');}else r.classList.remove('on');};
  S.ask=on=>q('.askrico').classList.toggle('on',!!on);
  S.tbtn=on=>{q('.tbtn').style.display=on?'':'none';};
  S.rico=(t,smug)=>{const r=q('.rico');if(t){q('.rsay').innerHTML=br(t);q('.rimg').classList.toggle('smug',!!smug);r.classList.add('on');root.classList.add('coaching');}else{r.classList.remove('on');root.classList.remove('coaching');}};
  S.go=(label,on)=>{const g=q('.go');if(label)g.textContent=label;g.classList.toggle('on',!!on);};
  S.intro=(on,sn)=>{const i=q('.intro');if(sn!=null)q('.intro .sn').textContent=sn;i.classList.toggle('on',!!on);};
  S.band=null;
  const rel=e=>{const r=e.getBoundingClientRect(),b=root.getBoundingClientRect();return{x:(r.left-b.left)/SCALE,y:(r.top-b.top)/SCALE,w:r.width/SCALE,h:r.height/SCALE};};
  // 札を作る
  S.load=sc=>{
    S.sc=sc;const d=E.derive(sc);S.d=d;S.sel=null;
    const bd=q('.bd');bd.innerHTML='';
    S.bcards=d.board.map(c=>{const e=cardEl(c,'hid');bd.appendChild(e);return e;});
    root.querySelectorAll('.hc0,.hc1').forEach(e=>e.remove());
    S.hcs=d.her.map((c,j)=>{const e=cardEl(c,'back hc'+j+' hid');root.insertBefore(e,q('.thr'));return e;});
    S.mcs=[0,1].map(i=>{const m=q('.m'+i);m.className='mc m'+i;m.innerHTML='';m.appendChild(cardEl(d.mimi[i]));return m;});
    S.lkH=[];S.lkM=[];
    q('.gh').innerHTML='';q('.gm').innerHTML='';
    ['.hc','.sc','.mch'].forEach(s=>{const c=q('.chip'+s);c.className='chip '+s.slice(1);c.style.top='';c.textContent='';});
    q('.clone').classList.remove('on');q('.clone').innerHTML='';
    S.rule(false);S.say(null);S.reason(null);S.go(null,false);S.face('drunk');S.rico(null);
    S.opts(false);S.optsEnable(false,false);
    q('.hand').classList.remove('on','tap');
  };
  S.opts=on=>q('.opts').classList.toggle('on',!!on);
  S.optsEnable=(shw,hide)=>{const a=q('.shw'),b=q('.hide');a.disabled=!shw;b.disabled=!hide;a.classList.toggle('ready',!!shw);a.classList.remove('press');b.classList.remove('press');};
  S.showBoard=async(run,anim)=>{
    for(const e of S.bcards){e.classList.remove('hid');if(anim)e.classList.add('swap');await wait(run,anim?70:0);}
    for(const e of S.hcs){e.classList.remove('hid');if(anim)e.classList.add('swap');}
    if(anim)await wait(run,400);
  };
  S.lk=()=>S.bcards.forEach((e,i)=>e.classList.toggle('lk',S.lkH.includes(i)||S.lkM.includes(i)));
  // 彼女の札をめくる＋金の糸（彼女の札と場札）
  S.herFlip=async(run)=>{
    const d=S.d,e=S.hcs[d.hsIdx];e.classList.remove('back');e.classList.add('flip');await wait(run,450);
    const idx=d.hsLink.idx;S.lkH=idx;S.lk();
    const x1=HX(d.hsIdx);
    q('.gh').innerHTML=idx.map(i=>`<path pathLength="1" d="M${x1} ${ROW_TOP} C${x1} 48 ${BX(i)} 48 ${BX(i)} ${ROW_TOP}"/>`).join('');
    const c=q('.chip.hc');c.textContent='ポルカ：'+d.herName;c.classList.add('on');
    await wait(run,500);
  };
  // 役の札2枚の並び（強い方が上にせり上がる）
  S.compare=i=>{
    const hc=q('.chip.hc'),sc=q('.chip.sc'),d=S.d;
    hc.classList.remove('up','dn');sc.classList.remove('up','dn');
    if(i==null){hc.style.top='';sc.style.top='';return;}
    const hi=E.cmp(d.seen[i].score,d.r.hs.real)>=0;
    hc.style.top=hi?'200px':'170px';sc.style.top=hi?'170px':'200px';
    (hi?sc:hc).classList.add('up');(hi?hc:sc).classList.add('dn');
  };
  // ミミの札の「こう見える」：帯の右はしに札、場札へ金の糸、役の札
  S.shownTo=(i,label)=>{
    const d=S.d,s=d.seen[i];
    const cl=q('.clone');cl.innerHTML='';cl.appendChild(cardEl(d.mimi[i]));cl.classList.add('on');
    S.lkM=s.idx;S.lk();
    const xs=s.idx.map(BX);let h='';
    if(xs.length){
      h=s.idx.map(k=>`<path pathLength="1" d="M${BX(k)} ${ROW_BOT} V${BUS}"/>`).join('')+
        `<path pathLength="1" d="M${Math.min(...xs)} ${BUS} H${CLONE_X}"/><path pathLength="1" d="M${CLONE_X} ${BUS} V${CLONE_TOP}"/>`;
    }
    q('.gm').innerHTML=h;
    const c=q('.chip.sc');c.textContent=label+'：'+s.name;c.classList.add('on');
    S.compare(i);
  };
  S.shownOff=()=>{
    q('.clone').classList.remove('on');q('.gm').innerHTML='';S.lkM=[];S.lk();
    q('.chip.sc').classList.remove('on');S.compare(null);
  };
  S.mimiIn=async(run)=>{
    q('.mc.m0').classList.add('on');await wait(run,120);q('.mc.m1').classList.add('on');
    const c=q('.chip.mch');c.textContent='ミミ：'+S.d.mimiName;c.classList.add('on');
  };
  S.lift=i=>{S.sel=i;S.mcs.forEach((m,k)=>m.classList.toggle('up',k===i));};
  S.mimiBack=(i,on)=>S.mcs[i].querySelector('.cd').classList.toggle('back',!!on);
  S.mimiFlip=async(run,i)=>{const e=S.mcs[i].querySelector('.cd');e.classList.remove('back');e.classList.add('flip');
    const c=q('.chip.mch');c.textContent='ミミ：'+S.d.mimiName;c.classList.add('on');await wait(run,450);};
  // 選んだ札が帯へすべる
  S.flyTo=async(run,i,label)=>{
    const m=S.mcs[i],cl=q('.clone');
    if(!cl.classList.contains('on')){
      S.shownTo(i,label);
      const a=rel(m.querySelector('.cd')),t=rel(cl.firstChild);
      const dx=a.x-t.x,dy=a.y-t.y,sx=a.w/t.w,sy=a.h/t.h;
      cl.firstChild.style.transformOrigin='0 0';
      cl.firstChild.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},{transform:'none'}],{duration:520/SPEED,easing:'ease-in-out'});
      await wait(run,560);
    }else{q('.chip.sc').textContent=label+'：'+S.d.seen[i].name;}
    m.classList.remove('up');m.classList.add('gone');
  };
  return S;
}

// ============ お手本 ============
let DEMO=null;
async function runDemo(replay){
  const run=new Run();run.noPause=true;
  const D=makeScreen(true);board.appendChild(D.root);DEMO=D;
  const prevPhase=MK.phase;phase('demo');
  const finish=()=>{run.kill();D.root.remove();DEMO=null;phase(prevPhase);};
  D.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;run.kick();});
  D.q('.skip').addEventListener('click',()=>{run.kill();});
  const sc=SC.demo;
  D.load(sc);D.rib('<b>お手本</b>');D.q('.rib').classList.add('demo');D.ins('');D.tbtn(false);
  const hand=D.q('.hand'),C=SC.DEMO_COACH;
  const card4=async()=>{
    D.q('.skip').classList.add('off');D.rico(null);D.say(null);
    D.q('.pl').innerHTML=SC.CARD4.map(([a,b])=>`<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent=replay?'もどる':'はじめる';
    D.q('.panel').classList.add('on');phase('demo-card4');
    await new Promise(res=>D.q('.pgo').addEventListener('click',res,{once:true}));
  };
  try{
    phase('demo-0');
    D.intro(true,'お手本');await wait(run,1000);D.intro(false);await wait(run,250);
    // 拍1：言い出す→1枚めくる
    phase('demo-1');
    await D.showBoard(run,true);
    D.say(SC.OPEN[0],'');await wait(run,1600);
    await D.herFlip(run);
    D.say(SC.OPEN[1],'');await wait(run,1500);D.say(null);
    // 止1：役の札2つが光る
    phase('demo-stop1');
    D.face('drunk2');await D.mimiIn(run);
    D.q('.chip.hc').classList.add('lit');D.q('.chip.mch').classList.add('lit');
    D.rico(C.s1);await wait(run,4000);
    D.rico(null);D.q('.chip.hc').classList.remove('lit');D.q('.chip.mch').classList.remove('lit');await wait(run,200);
    // 拍2：K を見せると
    phase('demo-2');
    D.lift(0);D.shownTo(0,'こう見える');await wait(run,1500);
    // 止2
    phase('demo-stop2');
    D.face('panic');D.say('ひぃっ','tiny');D.rico(C.s2,true);await wait(run,4000);
    D.rico(null);D.say(null);D.face('drunk2');
    // 拍3：4 を見せると
    phase('demo-3');
    D.shownOff();D.lift(1);D.shownTo(1,'こう見える');await wait(run,1500);
    // 止3
    phase('demo-stop3');
    D.face('drunk');D.say('ほっ','tiny');D.rico(C.s3,true);await wait(run,4000);
    D.rico(null);D.say(null);
    // 拍4：これを見せる
    phase('demo-4');
    D.opts(true);D.optsEnable(true,true);await wait(run,500);
    hand.style.left='520px';hand.style.top='296px';hand.classList.add('on');await wait(run,700);
    hand.classList.add('tap');D.q('.shw').classList.add('press');await wait(run,350);
    hand.classList.remove('on');D.opts(false);
    const d=D.d;
    await reveal(run,D,d,1,true);
    D.rico(C.s4,true);await wait(run,3200);
  }catch(e){if(e.message!=='cancel')throw e;}
  await card4();
  window.H4MISE_LOG.demoDone=(window.H4MISE_LOG.demoDone||0)+1;
  finish();
}

// ============ 明かし ============
async function reveal(run,S,d,pick,isDemo){
  const out=SC.outcome(d,pick),pk=pick,pre=isDemo?'demo':MK.phase.replace(/-.*$/,'');
  S.rule(false);S.opts(false);S.rico(null);S.say(null);S.q('.chip.mch').classList.remove('on');
  if(pk<2){
    S.ins('ポルカが見くらべる……');
    S.mimiBack(1-pk,true);
    await S.flyTo(run,pk,'こう見えた');
    phase(pre+'-reveal-a');
    await wait(run,1300);
  }else{
    S.ins('見せない');S.mimiBack(0,true);S.mimiBack(1,true);S.lift(null);
    await wait(run,900);
  }
  // 台詞を順に。払った時は、ミミの伏せていた1枚がめくれる
  S.q('.chip.hc').classList.remove('up','dn');
  const oth=pk<2?1-pk:null;
  let n=0;
  for(const st of out.steps){
    n++;
    S.face(st.face);if(st.face==='bawl'||st.face==='panic')S.shake();else S.bounce();
    S.say(st.t,'narrow');
    if(st.flip&&oth!=null){await S.mimiFlip(run,oth);}
    phase(pre+'-reveal-'+n);
    await wait(run,1700);
  }
  S.say(null);
  S.ins(out.mark+'　'+(out.delta>0?'＋':'−')+Math.abs(out.delta),out.cls);
  S.q('.chip.hc').classList.remove('on');S.q('.chip.sc').classList.remove('on');
  await wait(run,350);
  S.reason(out.reason);
  await wait(run,isDemo?1200:600);
  return out;
}

// ============ 本編 ============
const G={score:0,results:[]};
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.H4MISE_LOG.demoOpens++;
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
const CHN=['左の札','右の札','見せない'];
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  const rec={id:sc.id,ans:sc.ans,pick:null,ok:null,secs:null,ricoOpens:0,lifts:0};
  S.load(sc);
  S.rib(`うまくいった <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  // 言い出す
  phase('s'+sc.id+'-say');
  S.ins('ミミが賭けた。ポルカは迷っている');
  await S.showBoard(run,true);
  run.ff=false;
  S.say(SC.OPEN[0],'');await wait(run,1500);
  await S.herFlip(run);
  S.say(SC.OPEN[1],'');await wait(run,1400);
  run.ff=false;S.say(null);
  // 決める
  phase('s'+sc.id+'-pick');
  S.face('drunk2');S.ins('どっちを見せる？ それとも、見せない？');
  S.rule(true);S.opts(true);S.optsEnable(false,false);
  const guided=sc.id<=2;
  S.ask(guided);
  await S.mimiIn(run);
  const t0=performance.now();
  const showPrev=i2=>{if(!guided)return;if(i2==null){S.shownOff();S.rule(true);}else{S.rule(false);S.shownTo(i2,'こう見える');}};
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.H4MISE_LOG.ricoOpens++;S.rico(sc.coach,true);S.ask(false);};
  S.q('.rico').onclick=()=>{S.rico(null);S.ask(guided);};
  await wait(run,400);S.optsEnable(false,true);
  const pick=await new Promise(res=>{
    S.mcs.forEach((m,k)=>{m.onclick=()=>{
      rec.lifts++;
      if(S.sel===k){S.lift(null);S.optsEnable(false,true);showPrev(null);}
      else{S.lift(k);S.optsEnable(true,true);showPrev(k);}
    };});
    S.q('.shw').onclick=()=>{if(S.sel==null)return;S.optsEnable(false,false);S.q('.shw').classList.add('press');res(S.sel);};
    S.q('.hide').onclick=()=>{if(S.q('.hide').disabled)return;S.optsEnable(false,false);S.q('.hide').classList.add('press');res(2);};
  });
  S.mcs.forEach(m=>m.onclick=null);S.q('.shw').onclick=null;S.q('.hide').onclick=null;S.rico(null);S.ask(false);
  rec.pick=pick;rec.secs=+((performance.now()-t0)/1000).toFixed(1);rec.ok=pick===sc.ans;
  if(rec.ok)G.score++;
  S.tbtn(false);
  // 明かし
  phase('s'+sc.id+'-reveal');
  const out=await reveal(run,S,S.d,pick,false);
  rec.kind=out.kind;rec.delta=out.delta;
  S.rib(`うまくいった <b>${G.score}／6</b>`);
  window.H4MISE_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.tbtn(true);
  S.go(i<5?'卓へ':'結果を見る',true);
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.q('.go').onclick=res;});
  S.q('.go').onclick=null;
}
const HIDE=['.top','.bd','.rule','.reason','.opts','.speech','.go','.askrico','.mc','.chip','.clone','.thr','.hc0','.hc1'];
async function showResult(S){
  S.load(SC.scenes[0]);
  HIDE.forEach(s=>S.root.querySelectorAll(s).forEach(e=>e.style.display='none'));
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'✕'}</i>`).join('');
  S.face(G.score>=5?'drunk':G.score>=3?'drunk2':'plead');
  phase('result');
  window.H4MISE_LOG.final={score:G.score,results:G.results.slice()};
  return new Promise(res=>{r.onclick=e=>{const b=e.target.closest('button');if(b)res(b.dataset.r);};});
}
function resetScreenVisibility(S){
  HIDE.forEach(s=>S.root.querySelectorAll(s).forEach(e=>e.style.display=''));
  S.q('.res').classList.remove('on');
}
async function main(){
  const S=makeScreen(false);board.appendChild(S.root);
  const run=new Run();
  S.root.addEventListener('pointerdown',e=>{if(e.target.closest('button,.mc'))return;if(/-say$/.test(MK.phase)){run.ff=true;run.kick();}});
  S.q('.tbtn').addEventListener('click',openDemoFromPlay);
  S.load(SC.scenes[0]);
  if(!LS.get('h4mise.seen')){window.H4MISE_LOG.autoDemo=true;await runDemo(false);LS.set('h4mise.seen','1');}
  for(;;){
    G.score=0;G.results=[];window.H4MISE_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.H4MISE_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.H4MISE.error=String(e&&e.stack||e);console.error(e);});
})();
