// リーディング：おねだり 試作。1つの HTML で単独に遊べる。印・役の名前・台詞・結果は engine.js の計算から出す（手で書かない）。
(function(){
const E=ONE_ENGINE, SC=ONE_SCENES;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const SJ=E.SJ, BET=SC.BET;
const rk=c=>c.t[0]==='T'?'10':c.t[0];
const fm=t=>String(t).split('|').join('<wbr>');
const br=t=>String(t).split('|').join('<br>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('onedari.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;}
addEventListener('resize',fit);fit();

// ---- 検算（ページの中の計算で、場面の表と食い違わないかを確かめる）
const MK={phase:'boot',scale:()=>SCALE};
MK.verify=()=>[SC.demo].concat(SC.scenes).map(s=>{const v=E.verifyScene(s);return{id:s.id,ok:v.ok,why:v.why,answer:v.d.answer,hit:v.d.hit,who:s.who,sign:v.d.signTxt,fin:v.d.finName,her:v.d.herName,mimi:v.d.mimiName};});
MK.verifyResult=MK.verify();
MK.ans=SC.scenes.map(s=>s.answer);
window.ONEDARI=MK;
window.ONEDARI_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
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
const FACES=['drunk','drunk2','smug','panic'];
// おねだりの印の札（印の種類ごとの絵）
function tickHTML(d){
  const s=d.sign;let h='<i>おねだり</i>';
  if(s.t==='suit')h+=`<span class="sy${s.suit==='h'||s.suit==='d'?' r':''}">${SJ[s.suit]}</span>`;
  else if(s.t==='rank')h+=s.ranks.map(r=>`<span class="tk">${E.RN(r)}</span>`).join('<em>か</em>');
  else if(s.t==='color')h+=`<span class="col${s.red?' r':''}">${s.red?'赤いの':'黒いの'}</span>`;
  else h+=`<span class="cnt">あと<b>${s.n}</b>枚</span>`;
  return h;
}

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"></div><div class="who"></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="bd"></div>
  <div class="tick"></div><div class="lineup"></div>
  <div class="chip hc"></div>
  <div class="rule"><em>おねだりの札が来なければ</em>、彼女の役はできていない</div>
  <div class="reason"></div>
  <div class="mc m0"></div><div class="mc m1"></div>
  <div class="chip mch"></div>
  <div class="opts"><button class="pay"><b>払う</b><span>${BET} を出す</span></button><button class="fold"><b>降りる</b><span>${BET} は出さない</span></button></div>
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
  const S={root,demo,sc:null,d:null,q,who:null,lkH:[],lkB:[]};
  S.setWho=who=>{
    const c=SC.WHO[who].key;S.who=who;
    q('.win').innerHTML=FACES.map(k=>`<div class="face f-${k}" style="background-image:var(--a-f_${c}_${k});background-position-x:var(--x-${c}_${k})"></div>`).join('');
    q('.who').textContent=who;
    if(!demo)document.getElementById('bg').style.backgroundImage=`var(--a-t_${c})`;
  };
  S.face=n=>{q('.win').querySelectorAll('.face').forEach(f=>f.classList.toggle('on',f.classList.contains('f-'+n)));};
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
  S.opts=on=>q('.opts').classList.toggle('on',!!on);
  S.optsEnable=on=>{['.pay','.fold'].forEach(s=>{const b=q(s);b.disabled=!on;b.classList.remove('press');});q('.pay').classList.toggle('ready',!!on);};
  S.tickOn=on=>q('.tick').classList.toggle('on',!!on);
  S.mimiChip=n=>{const c=q('.chip.mch');c.textContent='ミミ：'+n;c.classList.add('on');};
  // 場面を読み込む
  S.load=sc=>{
    S.sc=sc;const d=E.derive(sc);S.d=d;S.setWho(sc.who);
    const bd=q('.bd');bd.innerHTML='';
    S.bcards=d.b5.map((c,i)=>{const e=cardEl(c,i<4?'hid':'back fin5 hid');bd.appendChild(e);return e;});
    root.querySelectorAll('.hc0,.hc1').forEach(e=>e.remove());
    S.hcs=d.her.map((c,j)=>{const e=cardEl(c,'back hc'+j+' hid');root.appendChild(e);return e;});
    S.mcs=[0,1].map(i=>{const m=q('.m'+i);m.className='mc m'+i;m.style.opacity='';m.innerHTML='';m.appendChild(cardEl(d.mimi[i]));return m;});
    S.lkH=[];S.lkB=[];
    const t=q('.tick');t.className='tick';t.innerHTML=tickHTML(d);
    const L=q('.lineup');L.className='lineup';L.innerHTML='';
    ['.hc','.mch'].forEach(s=>{const c=q('.chip'+s);c.className='chip '+s.slice(1);c.textContent='';});
    S.rule(false);S.say(null);S.reason(null);S.go(null,false);S.face('drunk');S.rico(null);
    S.opts(false);S.optsEnable(false);
    q('.hand').classList.remove('on','tap');
  };
  S.showBoard=async(run,anim)=>{
    for(const e of S.bcards){e.classList.remove('hid');if(anim)e.classList.add('swap');await wait(run,anim?70:0);}
    for(const e of S.hcs){e.classList.remove('hid');if(anim)e.classList.add('swap');}
    if(anim)await wait(run,400);
  };
  S.lk=()=>{S.bcards.forEach((e,i)=>e.classList.toggle('lk',S.lkB.includes(i)));S.hcs.forEach((e,i)=>e.classList.toggle('lk',S.lkH.includes(i)));};
  // 最後の札：先に色（赤か黒）の光、次に数字がめくれる
  S.finalFlip=async run=>{
    const e=S.bcards[4];e.classList.add(S.d.finRed?'tr':'tb');await wait(run,750);
    e.classList.remove('back','tr','tb','fin5');e.classList.add('flip','fin');await wait(run,450);
  };
  S.mimiIn=async run=>{
    q('.mc.m0').classList.add('on');await wait(run,120);q('.mc.m1').classList.add('on');
  };
  // 答え合わせ：彼女の2枚がめくれ、待ちの札が1列に寄る
  S.herFlip=async run=>{
    const d=S.d;
    S.mcs.forEach(m=>{m.style.opacity='0';});
    for(const e of S.hcs){e.classList.remove('back');e.classList.add('flip');}
    S.lkH=d.lineup.filter(x=>x&&x.from==='her').map(x=>x.i);
    S.lkB=d.lineup.filter(x=>x&&x.from==='board').map(x=>x.i);
    await wait(run,500);S.lk();
    const c=q('.chip.hc');c.textContent=S.who+'：'+d.herName;c.classList.add('on');
    await wait(run,350);
  };
  S.lineupShow=async run=>{
    const d=S.d,L=q('.lineup');L.innerHTML='';L.classList.add('on');q('.tick').classList.add('off');
    for(const it of d.lineup){
      const e=it.empty?el('div','cd slotx pop','<b>?</b>'):cardEl(it.card,'pop'+(it.fin?' hit':''));
      L.appendChild(e);await wait(run,170);
    }
    const st=el('div','stamp '+(d.hit?'ok':'no'),`<b>${d.hit?'○':'×'}</b><span>${d.hit?'かなった':'かなわなかった'}</span>`);
    L.appendChild(st);void st.offsetWidth;st.classList.add('on');
    if(!d.hit)S.bcards[4].style.opacity='.35';
    await wait(run,500);
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
  const d=D.d,hand=D.q('.hand'),C=SC.DEMO_COACH;
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
    // 拍1：おねだり
    phase('demo-1');
    await D.showBoard(run,true);
    D.tickOn(true);D.say(SC.askLine(sc.who,d),'');await wait(run,1800);D.say(null);
    // 止1：印を指す
    phase('demo-stop1');
    D.q('.tick').classList.add('lit');
    D.rico(C.s1(d));await wait(run,4000);
    D.rico(null);D.q('.tick').classList.remove('lit');await wait(run,200);
    // 拍2：最後の札がめくれる
    phase('demo-2');
    D.face('drunk2');await D.finalFlip(run);
    const b=SC.betLine(sc.who,d);D.face(b.face);D.bounce();D.say(b.t,'');await wait(run,1500);D.say(null);
    // 止2：来たか、来ないか
    phase('demo-stop2');
    D.bcards[4].classList.add('lit');
    D.rico(C.s2(d),true);await wait(run,4000);
    D.rico(null);D.bcards[4].classList.remove('lit');
    // 拍3：ミミの手
    phase('demo-3');
    D.mimiChip(d.mimiName);await D.mimiIn(run);D.rule(true);
    D.q('.chip.mch').classList.add('lit');await wait(run,600);
    // 止3
    phase('demo-stop3');
    D.rico(C.s3(d),true);await wait(run,4000);
    D.rico(null);D.q('.chip.mch').classList.remove('lit');
    // 拍4：払う
    phase('demo-4');
    D.opts(true);D.optsEnable(true);await wait(run,500);
    hand.style.left='526px';hand.style.top='300px';hand.classList.add('on');await wait(run,700);
    hand.classList.add('tap');D.q('.pay').classList.add('press');await wait(run,350);
    hand.classList.remove('on');D.opts(false);
    await reveal(run,D,d,'call',true);
    D.rico(C.s4(d),true);await wait(run,3400);
  }catch(e){if(e.message!=='cancel')throw e;}
  await card4();
  window.ONEDARI_LOG.demoDone=(window.ONEDARI_LOG.demoDone||0)+1;
  finish();
}

// ============ 明かし ============
async function reveal(run,S,d,pick,isDemo){
  const out=SC.outcome(d,pick),pre=isDemo?'demo':MK.phase.replace(/-.*$/,'');
  S.rule(false);S.opts(false);S.rico(null);S.say(null);
  S.ins('彼女の札を見る……');
  await S.herFlip(run);
  await S.lineupShow(run);
  phase(pre+'-reveal-a');
  await wait(run,900);
  // 彼女の反応を順に
  let n=0;
  for(const st of SC.WHO[S.who][out.kind]){
    n++;
    S.face(st.face);if(st.face==='panic')S.shake();else S.bounce();
    S.say(SC.tx(st.t,d),'');
    phase(pre+'-reveal-'+n);
    await wait(run,1800);
  }
  S.say(null);
  S.ins(out.mark+'　'+out.delta,out.cls);
  await wait(run,350);
  S.reason(out.reason);
  await wait(run,isDemo?1200:600);
  return out;
}

// ============ 本編 ============
const G={score:0,results:[]};
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.ONEDARI_LOG.demoOpens++;
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  S.load(sc);const d=S.d;
  const rec={id:sc.id,who:sc.who,answer:sc.answer,pick:null,ok:null,secs:null,ricoOpens:0,hit:d.hit};
  S.rib(`うまくいった <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6　${sc.who}`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  // おねだり
  phase('s'+sc.id+'-say');
  S.ins('最後の札の前に、おねだりが出た');
  await S.showBoard(run,true);
  run.ff=false;
  S.face('drunk');S.tickOn(true);S.say(SC.askLine(sc.who,d),'');await wait(run,2000);
  run.ff=false;S.say(null);
  // めくり
  phase('s'+sc.id+'-flip');
  S.ins('最後の札が めくれる……');S.face('drunk2');
  await S.finalFlip(run);
  const b=SC.betLine(sc.who,d);S.face(b.face);S.bounce();S.say(b.t,'');await wait(run,1600);S.say(null);
  // 決める
  phase('s'+sc.id+'-pick');
  S.ins(`${BET} 賭けてきた。払う？ 降りる？`);
  S.rule(true);S.opts(true);S.optsEnable(false);S.mimiChip(d.mimiName);
  const guided=!!SC.COACH[sc.id];
  S.ask(guided);
  await S.mimiIn(run);
  const t0=performance.now();
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.ONEDARI_LOG.ricoOpens++;S.rico(SC.COACH[sc.id](d),true);S.ask(false);};
  S.q('.rico').onclick=()=>{S.rico(null);S.ask(guided);};
  await wait(run,400);S.optsEnable(true);
  const pick=await new Promise(res=>{
    S.q('.pay').onclick=()=>{if(S.q('.pay').disabled)return;S.optsEnable(false);S.q('.pay').classList.add('press');res('call');};
    S.q('.fold').onclick=()=>{if(S.q('.fold').disabled)return;S.optsEnable(false);S.q('.fold').classList.add('press');res('fold');};
  });
  S.q('.pay').onclick=null;S.q('.fold').onclick=null;S.rico(null);S.ask(false);
  rec.pick=pick;rec.secs=+((performance.now()-t0)/1000).toFixed(1);rec.ok=pick===sc.answer;
  if(rec.ok)G.score++;
  S.tbtn(false);
  // 明かし
  phase('s'+sc.id+'-reveal');
  const out=await reveal(run,S,d,pick,false);
  rec.kind=out.kind;rec.delta=out.delta;
  S.rib(`うまくいった <b>${G.score}／6</b>`);
  window.ONEDARI_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.tbtn(true);
  S.go(i<5?'卓へ':'結果を見る',true);
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.q('.go').onclick=res;});
  S.q('.go').onclick=null;
}
const HIDE=['.top','.bd','.rule','.reason','.opts','.speech','.go','.askrico','.mc','.chip','.tick','.lineup','.hc0','.hc1','.who'];
async function showResult(S){
  S.load(SC.scenes[0]);
  HIDE.forEach(s=>S.root.querySelectorAll(s).forEach(e=>e.style.display='none'));
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'✕'}</i>`).join('');
  S.face(G.score>=5?'smug':G.score>=3?'drunk2':'panic');
  phase('result');
  window.ONEDARI_LOG.final={score:G.score,results:G.results.slice()};
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
  if(!LS.get('onedari.seen')){window.ONEDARI_LOG.autoDemo=true;await runDemo(false);LS.set('onedari.seen','1');}
  for(;;){
    G.score=0;G.results=[];window.ONEDARI_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.ONEDARI_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.ONEDARI.error=String(e&&e.stack||e);console.error(e);});
})();
