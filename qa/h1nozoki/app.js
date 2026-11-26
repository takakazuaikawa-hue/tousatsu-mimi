// リーディング：寝落ちのぞき 試作。1つの HTML で単独に遊べる。役の名前・額・赤い目盛り・結果は engine.js の計算から出す（手で書かない）。
(function(){
const E=H1_ENGINE, SC=H1_SCENES, U=E.UNIT;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const HS=+(Q.get('hold')||1);            // 長押しの速さ（1＝1.0秒でめくり切る。検査で速める時だけ上げる）
const SJ=E.SJ;
const rk=c=>c.t[0]==='T'?'10':c.t[0];
const fm=t=>String(t).split('|').join('<wbr>');
const br=t=>String(t).split('|').join('<br>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('h1nozoki.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;}
addEventListener('resize',fit);fit();

// ---- 記録と検算
const MK={phase:'boot',scale:()=>SCALE,cur:null};
const ALL=[SC.demo].concat(SC.scenes);
MK.verify=()=>ALL.map(s=>E.verifyScene(s));
MK.verifyResult=null;
MK.verifyAsync=()=>new Promise(res=>{const out=[];let i=0;const step=()=>{if(i>=ALL.length){MK.verifyResult=out;res(out);return;}out.push(E.verifyScene(ALL[i++]));setTimeout(step,200);};setTimeout(step,1500);});
MK.info=SC.scenes.map(s=>{const d=E.derive(s);return{id:s.id,who:s.who,N:s.N,her:d.herName,mimi:d.mimiName,ahead:d.ahead,cells:d.cells};});
MK.ans=SC.scenes.map(s=>s.line);
window.H1NOZOKI=MK;
window.H1NOZOKI_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
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
const FACEKEY={sleep:'drunk2',wake:'drunk',win:'smug',lose:'panic',hide:'hide'};
const CH={'ポルカ':'polka','リコ':'rico','グラーノ':'grano','セリナ':'selina','ヴェルベット':'velvet'};
const RING=264;

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="bd"></div>
  <div class="gauge"><div class="gend"></div><div class="glab">ミミが負ける見込み</div><div class="gbar">${'<div class="gc"></div>'.repeat(10)}</div></div>
  <div class="chip hc"></div>
  <div class="bubs"></div><div class="minus">−300</div><div class="zz"></div><div class="glint">✦</div>
  <div class="mc m0"></div><div class="mc m1"></div>
  <div class="chip mch"></div>
  <div class="rule">泡1つ＝寝ぼけて払ってくれる <em>300</em>。<wbr>1枚のぞくと、泡が1つ われる</div>
  <div class="marks"><i>片目</i><i>口元</i><i>ぐー、ぐー♡</i></div>
  <div class="reason"></div>
  <div class="opts"><button class="pk"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="42"/></svg>のぞく<small>長押し</small></button><button class="shw"></button><button class="hide">賭けない<small>このまま勝負</small></button></div>
  <div class="speech"></div>
  <button class="go">卓へ</button>
  <button class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">${SC.TITLE}</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button class="pgo btnA">はじめる</button></div>
  <div class="res"><div class="big">うまくいった</div><div class="num"></div><div class="lamps"></div><div class="chips"></div><button class="rb btnA" data-r="again" style="left:316px;width:200px">もう1回</button><button class="rb btnB" data-r="demo" style="left:530px;width:200px">お手本</button></div>`;
  const q=s=>root.querySelector(s);
  const S={root,demo,sc:null,d:null,q,st:{k:0,left:0},curP:0,talkTok:0};
  S.ins=(t,k)=>{const i=q('.ins');i.textContent=t;i.className='ins'+(k?' '+k:'');};
  S.rib=h=>{const r=q('.rib');r.innerHTML=h;r.style.display=h?'':'none';};
  S.say=t=>{const s=q('.speech');if(t){s.innerHTML=br(t);s.classList.add('on');root.classList.add('speaking');}else{s.classList.remove('on');root.classList.remove('speaking');}};
  S.sayFor=(t,ms)=>{const tok=++S.talkTok;S.say(t);setTimeout(()=>{if(S.talkTok===tok)S.say(null);},ms/SPEED);};
  S.rule=on=>q('.rule').classList.toggle('on',!!on);
  S.reason=(t,alt,marks)=>{const r=q('.reason');if(t){r.innerHTML=fm(t)+(alt?`<span class="alt">${alt}</span>`:'');r.classList.add('on');}else r.classList.remove('on');q('.marks').classList.toggle('on',!!marks);};
  S.ask=on=>q('.askrico').classList.toggle('on',!!on);
  S.tbtn=on=>{q('.tbtn').style.display=on?'':'none';};
  S.rico=(t,smug)=>{const r=q('.rico');if(t){q('.rsay').innerHTML=br(t);q('.rimg').classList.toggle('smug',!!smug);r.classList.add('on');root.classList.add('coaching');}else{r.classList.remove('on');root.classList.remove('coaching');}};
  S.go=(label,on)=>{const g=q('.go');if(label)g.textContent=label;g.classList.toggle('on',!!on);};
  S.intro=(on,sn)=>{const i=q('.intro');if(sn!=null)q('.intro .sn').textContent=sn;i.classList.toggle('on',!!on);};
  S.opts=on=>q('.opts').classList.toggle('on',!!on);
  S.shake=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('shake');};
  S.bounce=()=>{const w=q('.win');w.classList.remove('shake','bounce');void w.offsetWidth;w.classList.add('bounce');};
  // 相手を替える（窓の絵・背景・泡）
  S.setWho=who=>{
    const c=CH[who],keys=['drunk','drunk2','smug','panic'].concat(c==='velvet'?['hide']:[]);
    S.ch=c;S.who=who;
    q('.win').innerHTML=keys.map(k=>`<div class="face f-${k}" style="background-image:var(--a-f_${c}_${k});background-position-x:var(--x-${c}_${k})"></div>`).join('');
    if(!demo)document.getElementById('bg').style.backgroundImage=`var(--a-t_${c})`;
  };
  S.face=n=>{let key=FACEKEY[n];if(n==='sleep'&&S.sc&&S.sc.fake)key='hide';
    q('.win').querySelectorAll('.face').forEach(f=>f.classList.toggle('on',f.classList.contains('f-'+key)));
    q('.win').classList.toggle('sleepy',n==='sleep');};
  // 場面を読む
  S.load=sc=>{
    S.sc=sc;const d=E.derive(sc);S.d=d;S.st={k:0,left:sc.N};S.curP=0;S.talkTok++;
    S.setWho(sc.who);
    const bd=q('.bd');bd.innerHTML='';
    S.bcards=d.board.map(c=>{const e=cardEl(c,'hid');bd.appendChild(e);return e;});
    root.querySelectorAll('.pc').forEach(e=>e.remove());
    S.pcs=d.her.map((c,j)=>{const e=el('div','pc pc'+j+' hid');e.appendChild(cardEl(c,'fr'));e.appendChild(el('div','cd back bk'));root.insertBefore(e,q('.gauge'));return e;});
    S.mcs=[0,1].map(i=>{const m=q('.m'+i);m.className='mc m'+i;m.innerHTML='';m.appendChild(cardEl(d.mimi[i]));return m;});
    q('.bubs').innerHTML=Array.from({length:sc.N},(_,i)=>`<div class="bub b${i}"><i>300</i></div>`).join('');
    S.bubs=[...q('.bubs').children];
    ['.hc','.mch'].forEach(s=>{const c=q('.chip'+s);c.className='chip '+s.slice(1);c.textContent='';});
    root.querySelectorAll('.coin').forEach(e=>e.remove());
    q('.zz').classList.remove('on');q('.zz').innerHTML=br(WHOW().breath);q('.glint').classList.remove('on');
    S.gaugeOn(false);S.setCells(d.cells[0],true);
    S.rule(false);S.say(null);S.reason(null);S.go(null,false);S.rico(null);S.face('wake');q('.win').classList.remove('sleepy');
    S.opts(false);S.pk(false);S.betLabel();q('.hide').innerHTML='賭けない<small>このまま勝負</small>';q('.shw').classList.remove('gone');q('.hide').classList.remove('gone');
    q('.hand').classList.remove('on','tap');
  };
  const WHOW=()=>SC.WHO[S.who];
  S.betLabel=()=>{q('.shw').innerHTML=`賭ける ${S.st.left*U}<small>寝ぼけて払う</small>`;};
  S.pk=on=>{q('.pk').disabled=!on;};
  S.gaugeOn=on=>q('.gauge').classList.toggle('on',!!on);
  // 赤い目盛り：n ます赤。減る時は右から、増える時は左から、ざーっと動く
  S.setCells=(n,instant)=>{
    const cs=[...q('.gbar').children],old=cs.filter(c=>c.classList.contains('on')).length;
    cs.forEach((c,i)=>{const on=i<n;c.style.transitionDelay=instant?'0s':(on?(i-old)*.045:(old-1-i)*.045)+'s';c.classList.toggle('on',on);});
    const e=q('.gend');e.textContent=n===0?'負けなし':n===10?'負け':'';e.className='gend'+(n===0?' z':n===10?' f':'');
    S.cellsNow=n;
  };
  S.showBoard=async(run,anim)=>{
    for(const e of S.bcards){e.classList.remove('hid');if(anim)e.classList.add('swap');await wait(run,anim?70:0);}
    for(const e of S.pcs){e.classList.remove('hid');if(anim)e.classList.add('swap');}
    if(anim)await wait(run,400);
  };
  S.mimiIn=async run=>{
    q('.mc.m0').classList.add('on');await wait(run,120);q('.mc.m1').classList.add('on');
    const c=q('.chip.mch');c.textContent='ミミ：'+S.d.mimiName;c.classList.add('on');
  };
  // 寝落ち：こくり→寝顔→泡が「ぽこ」と出る→寝息
  S.sleepIn=async run=>{
    const W=WHOW();
    S.face('wake');S.say(W.sleepIn);await wait(run,1700);S.say(null);
    S.face('sleep');
    for(const b of S.bubs){b.classList.add('in');await wait(run,260);}
    q('.zz').classList.add('on');
    if(S.sc.fake){q('.glint').classList.add('on');}
    await wait(run,500);
  };
  // 伏せ札をめくる途中（p＝0〜1）。マークの色（0.4）→数字（0.7）→めくり切り
  S.setP=(idx,p)=>{
    S.curP=p;const e=S.pcs[idx];e.style.setProperty('--p',p);
    e.classList.toggle('s-on',p>=.4);e.classList.toggle('n-on',p>=.7);
    const ring=q('.pk circle');ring.style.strokeDashoffset=RING*(1-p);
    const b=S.bubs[S.st.left-1];if(b&&!S.sc.fake){b.classList.toggle('thr',p>0&&p<1);b.style.setProperty('--p',p);}
  };
  S.clearP=idx=>{const e=S.pcs[idx];e.style.setProperty('--p',0);e.classList.remove('s-on','n-on');q('.pk circle').style.strokeDashoffset=RING;S.bubs.forEach(b=>b.classList.remove('thr'));S.curP=0;};
  S.back=idx=>new Promise(res=>{const p0=S.curP,t0=performance.now();const f=()=>{const t=Math.min(1,(performance.now()-t0)/260),p=p0*(1-t);S.setP(idx,p);if(t>=1){S.clearP(idx);res();}else requestAnimationFrame(f);};f();});
  // めくり切った：札は表のまま残る。泡が1つ割れる。目盛りが動く
  S.commit=idx=>{
    const e=S.pcs[idx],d=S.d,W=WHOW();
    e.style.setProperty('--p',1);e.classList.add('up','s-on','n-on');
    const old=S.st.left;S.st.k++;S.st.left--;
    S.bubs.forEach(b=>b.classList.remove('thr'));
    const b=S.bubs[old-1];if(b){b.classList.remove('in');b.classList.add('pop');}
    q('.pk circle').style.strokeDashoffset=RING;
    S.coinsFrom(b,1);
    const m=q('.minus');m.classList.remove('mgo');void m.offsetWidth;m.classList.add('mgo');
    S.betLabel();
    S.setCells(d.cells[S.st.k]);
    // めくれた札と同じ数字の場札を光らせる
    const c=d.her[idx];S.bcards.forEach((bc,i)=>{if(d.board[i].r===c.r)bc.classList.add('lk');});
    if(S.st.k>=2)S.herChip();
    if(S.st.left===0)S.wakeUp();
    else{S.bounce();if(W.talk)S.sayFor(W.talk,1900);}
    S.updateBtns();
  };
  S.wakeUp=()=>{
    const W=WHOW();S.face('wake');q('.zz').classList.remove('on');q('.glint').classList.remove('on');
    S.ins('起こしてしまった。このまま勝負');S.shake();S.sayFor(W.wake,2400);S.rule(false);
  };
  S.herChip=()=>{const c=q('.chip.hc');c.textContent=S.who+'：'+S.d.herName;c.classList.add('on');};
  S.updateBtns=()=>{
    const st=S.st,fake=S.sc.fake,woke=st.left===0;
    q('.pk').disabled=!(fake||(st.left>0&&st.k<2));
    q('.shw').classList.toggle('gone',woke);
    q('.hide').innerHTML=woke?'このまま勝負':'賭けない<small>このまま勝負</small>';
  };
  S.coinsFrom=(b,n)=>{
    const x=b?parseFloat(getComputedStyle(b).left)||230:230,y=b?parseFloat(getComputedStyle(b).top)||40:40;
    for(let i=0;i<n;i++){const c=el('div','coin');c.style.left=(x+11)+'px';c.style.top=(y+11)+'px';c.style.setProperty('--dx',(60+i*24)+'px');root.appendChild(c);setTimeout(()=>c.remove(),1000);}
  };
  S.allCoins=()=>{S.bubs.forEach(b=>{if(!b.classList.contains('pop')){S.coinsFrom(b,2);b.classList.remove('in');b.classList.add('pop');}});};
  // 残りの伏せ札を開く＋役の札
  S.openCards=async run=>{
    S.pcs.forEach(e=>{if(!e.classList.contains('up')){e.style.setProperty('--p',1);e.classList.add('up','s-on','n-on','flip');}});
    S.herChip();
    await wait(run,500);
    const hc=q('.chip.hc'),mc=q('.chip.mch');hc.classList.remove('up','dn');mc.classList.remove('up','dn');
    (S.d.ahead?mc:hc).classList.add('up');(S.d.ahead?hc:mc).classList.add('dn');
    S.bcards.forEach((bc,i)=>bc.classList.remove('lk'));
    await wait(run,350);
  };
  // 長押し
  S.bindHold=H=>{
    const b=q('.pk'),HOLD=1000/HS;
    let holding=false,locked=false,t0=0,raf=0,idx=0;
    const frame=()=>{
      if(!holding)return;
      const p=Math.min(1,(performance.now()-t0)/HOLD);S.setP(idx,p);
      if(S.sc.fake&&p>=.4){holding=false;locked=true;b.classList.remove('hold');S.back(idx).then(()=>{});H.onCaught();return;}
      if(p>=1){holding=false;locked=true;b.classList.remove('hold');S.commit(idx);H.onDone(idx);return;}
      raf=requestAnimationFrame(frame);
    };
    const start=()=>{if(holding||locked||b.disabled||!H.can())return false;holding=true;idx=S.st.k;t0=performance.now();b.classList.add('hold');raf=requestAnimationFrame(frame);return true;};
    const end=()=>{b.classList.remove('hold');locked=false;if(!holding)return;holding=false;cancelAnimationFrame(raf);const p=S.curP;S.back(idx);if(p<.15)H.onTap();else H.onAbort();};
    S.holdStart=start;S.holdEnd=end;
    S.holdNow=()=>{if(!start())return false;t0-=HOLD;frame();end();return true;};   // 検査の台本用：1枚、一気にめくる
    b.onpointerdown=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){ }start();};
    b.onpointerup=end;b.onpointercancel=end;b.onlostpointercapture=end;
    b.oncontextmenu=e=>e.preventDefault();
    b.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();start();}};
    b.onkeyup=e=>{if(e.key===' '||e.key==='Enter')end();};
  };
  S.unbindHold=()=>{const b=q('.pk');b.onpointerdown=b.onpointerup=b.onpointercancel=b.onlostpointercapture=b.onkeydown=b.onkeyup=null;S.holdStart=S.holdEnd=S.holdNow=null;};
  S.ring=()=>{};
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
  const hold=async()=>{   // 手の印が「のぞく」を長押し。本番と同じ動き
    hand.style.left='330px';hand.style.top='318px';hand.classList.add('on');await wait(run,650);
    hand.classList.add('tap');const idx=D.st.k,b=D.q('.pk');b.classList.add('hold');
    const t0=performance.now();
    await new Promise(res=>{const f=()=>{const p=Math.min(1,(performance.now()-t0)/1000);D.setP(idx,p);if(p>=1||run.dead)res();else requestAnimationFrame(f);};f();});
    b.classList.remove('hold');hand.classList.remove('tap');D.commit(idx);await wait(run,500);hand.classList.remove('on');
  };
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
    phase('demo-1');
    await D.showBoard(run,true);await D.mimiIn(run);
    D.ins('考え中に、ポルカが寝落ちした');
    await D.sleepIn(run);
    D.gaugeOn(true);D.opts(true);D.pk(true);D.rule(true);
    // 止1
    phase('demo-stop1');
    D.q('.bubs').classList.add('lit');D.q('.shw').classList.add('lit');D.q('.gauge').classList.add('lit');
    D.rico(C.s1);await wait(run,4000);
    D.rico(null);['.bubs','.shw','.gauge'].forEach(s=>D.q(s).classList.remove('lit'));await wait(run,200);
    // 拍2：1枚のぞく
    phase('demo-2');
    await hold();
    phase('demo-stop2');
    D.q('.pc0').classList.add('lit');D.q('.gauge').classList.add('lit');D.rico(C.s2,true);await wait(run,4000);
    D.rico(null);D.q('.pc0').classList.remove('lit');D.q('.gauge').classList.remove('lit');await wait(run,200);
    // 拍3：もう1枚
    phase('demo-3');
    await hold();
    phase('demo-stop3');
    D.q('.gauge').classList.add('lit');D.q('.bubs').classList.add('lit');D.rico(C.s3,true);await wait(run,4000);
    D.rico(null);D.q('.gauge').classList.remove('lit');D.q('.bubs').classList.remove('lit');await wait(run,200);
    // 拍4：賭ける
    phase('demo-4');
    hand.style.left='482px';hand.style.top='318px';hand.classList.add('on');await wait(run,700);
    hand.classList.add('tap');D.q('.shw').classList.add('press');await wait(run,350);
    hand.classList.remove('on');D.opts(false);
    await reveal(run,D,D.d,{act:'bet',k:D.st.k,left:D.st.left},true);
    D.rico(C.s4,true);await wait(run,3200);
  }catch(e){if(e.message!=='cancel')throw e;}
  await card4();
  window.H1NOZOKI_LOG.demoDone=(window.H1NOZOKI_LOG.demoDone||0)+1;
  finish();
}

// ============ 明かし ============
async function reveal(run,S,d,st,isDemo){
  const out=SC.outcome(d,st),pre=isDemo?'demo':MK.phase.replace(/-.*$/,'');
  S.rule(false);S.opts(false);S.rico(null);S.say(null);S.ask(false);S.q('.zz').classList.remove('on');S.q('.glint').classList.remove('on');
  S.ins(st.act==='bet'?'寝ぼけて払う……':st.act==='caught'?'つかまった……':'賭けない');
  phase(pre+'-reveal-0');
  await wait(run,500);
  let n=0;
  for(const step of out.steps){
    n++;
    if(step.coins)S.allCoins();
    if(step.open){await S.openCards(run);}
    S.face(step.face);
    if(step.face==='lose'||step.face==='wake')S.shake();else if(step.face==='win')S.bounce();
    if(step.t){S.say(step.t);phase(pre+'-reveal-'+n);await wait(run,isDemo?1900:2000);}
  }
  S.say(null);
  S.ins(out.mark+'　'+SC.sgn(out.delta),out.cls);
  await wait(run,350);
  const first=!window.H1NOZOKI_LOG.tanukiShown;
  S.reason(out.reason,out.alt,out.marks&&first);
  if(out.marks)window.H1NOZOKI_LOG.tanukiShown=true;
  phase(pre+'-reveal-end');
  await wait(run,isDemo?1200:600);
  return out;
}

// ============ 本編 ============
const G={score:0,chips:0,results:[]};
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.H1NOZOKI_LOG.demoOpens++;
  if(MK.cur&&MK.cur.holdEnd)MK.cur.holdEnd();
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  const rec={id:sc.id,who:sc.who,line:sc.line,peeks:0,aborts:0,act:null,ok:null,secs:null,ricoOpens:0};
  S.load(sc);MK.cur=S;
  S.rib(`うまくいった <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6　${sc.who}・泡${sc.N}`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  phase('s'+sc.id+'-sleep');
  await S.showBoard(run,true);await S.mimiIn(run);
  S.ins(`考え中に、${sc.who}が寝落ちした`);
  await S.sleepIn(run);
  run.ff=false;
  // 決める
  phase('s'+sc.id+'-pick');
  S.ins('のぞく？ 賭ける？ 賭けない？');
  S.gaugeOn(true);S.rule(true);S.opts(true);S.updateBtns();
  const guided=sc.id<=2;S.ask(guided);
  const t0=performance.now();
  let hintTok=0;
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.H1NOZOKI_LOG.ricoOpens++;const c=sc.coach;S.rico(c[Math.min(S.st.k,c.length-1)],true);S.ask(false);};
  S.q('.rico').onclick=()=>{S.rico(null);S.ask(guided);};
  const dec=await new Promise(res=>{
    S.bindHold({
      can:()=>true,
      onDone:()=>{rec.peeks++;phase('s'+sc.id+'-peek'+S.st.k);},
      onAbort:()=>{rec.aborts++;},
      onTap:()=>{const tok=++hintTok;S.ins('長押しでめくる');setTimeout(()=>{if(tok===hintTok&&/^s\d-pick|^s\d-peek/.test(MK.phase)&&S.st.left>0)S.ins('のぞく？ 賭ける？ 賭けない？');},1400/SPEED);},
      onCaught:()=>{res({act:'caught'});},
    });
    S.q('.shw').onclick=()=>{if(S.st.left>0)res({act:'bet'});};
    S.q('.hide').onclick=()=>res({act:'fold'});
  });
  S.unbindHold();S.q('.shw').onclick=null;S.q('.hide').onclick=null;S.rico(null);S.ask(false);S.tbtn(false);
  const st={act:dec.act,k:S.st.k,left:S.st.left};
  rec.act=dec.act;rec.k=st.k;rec.left=st.left;rec.secs=+((performance.now()-t0)/1000).toFixed(1);
  phase('s'+sc.id+'-reveal');
  const out=await reveal(run,S,S.d,st,false);
  const ahead=S.d.ahead&&!sc.fake;
  rec.ok=ahead?out.delta>0:out.delta===0;rec.kind=out.kind;rec.delta=out.delta;
  if(rec.ok)G.score++;G.chips+=out.delta;
  S.rib(`うまくいった <b>${G.score}／6</b>`);
  window.H1NOZOKI_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.tbtn(true);
  S.go(i<5?'卓へ':'結果を見る',true);
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.q('.go').onclick=res;});
  S.q('.go').onclick=null;
}
const HIDE=['.top','.bd','.rule','.reason','.opts','.speech','.go','.askrico','.mc','.chip','.gauge','.bubs','.pc','.zz','.glint','.minus','.marks'];
async function showResult(S){
  S.load(SC.scenes[0]);
  HIDE.forEach(s=>S.root.querySelectorAll(s).forEach(e=>e.style.display='none'));
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'✕'}</i>`).join('');
  S.q('.chips').innerHTML=`増えたチップ <b>${SC.sgn(G.chips)}</b>`;
  S.face(G.score>=5?'win':G.score>=3?'wake':'lose');
  phase('result');
  window.H1NOZOKI_LOG.final={score:G.score,chips:G.chips,results:G.results.slice()};
  return new Promise(res=>{r.onclick=e=>{const b=e.target.closest('button');if(b)res(b.dataset.r);};});
}
function resetScreenVisibility(S){
  HIDE.forEach(s=>S.root.querySelectorAll(s).forEach(e=>e.style.display=''));
  S.q('.res').classList.remove('on');
}
async function main(){
  const S=makeScreen(false);board.appendChild(S.root);
  const run=new Run();
  S.root.addEventListener('pointerdown',e=>{if(e.target.closest('button,.mc'))return;if(/-sleep$/.test(MK.phase)){run.ff=true;run.kick();}});
  S.q('.tbtn').addEventListener('click',openDemoFromPlay);
  S.load(SC.scenes[0]);
  MK.verifyAsync();
  // 検査の台本用
  MK.press=()=>MK.cur&&MK.cur.holdStart&&MK.cur.holdStart();
  MK.release=()=>MK.cur&&MK.cur.holdEnd&&MK.cur.holdEnd();
  MK.peekOnce=()=>MK.cur&&MK.cur.holdNow&&MK.cur.holdNow();
  MK.state=()=>MK.cur&&{k:MK.cur.st.k,left:MK.cur.st.left,cells:MK.cur.cellsNow};
  if(!LS.get('h1nozoki.seen')){window.H1NOZOKI_LOG.autoDemo=true;await runDemo(false);LS.set('h1nozoki.seen','1');}
  for(;;){
    G.score=0;G.chips=0;G.results=[];window.H1NOZOKI_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.H1NOZOKI_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.H1NOZOKI.error=String(e&&e.stack||e);console.error(e);});
})();
