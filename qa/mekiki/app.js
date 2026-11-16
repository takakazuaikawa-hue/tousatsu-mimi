// リーディング：目利き 試作。1つの HTML で単独に遊べる。印は engine.js の計算から出す（手で書かない）。
(function(){
const E=MK_ENGINE, SC=MK_SCENES;
const Q=new URLSearchParams(location.search);
const SPEED=+(Q.get('speed')||1);
const SJ={s:'♠',h:'♥',d:'♦',c:'♣'};
const rk=c=>c.t[0]==='T'?'10':c.t[0];
const fm=t=>String(t).split('|').join('<wbr>');
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const board=document.getElementById('board');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get('reset')==='1')LS.del('mekiki.seen');

// ---- 板を画面に合わせる（transform: scale。zoom は使わない）
let SCALE=1;
function fit(){const w=innerWidth,h=innerHeight;SCALE=Math.min(w/800,h/370);board.style.transform=`translate(${(w-800*SCALE)/2}px,${(h-370*SCALE)/2}px) scale(${SCALE})`;window.MK_SCALE=SCALE;}
addEventListener('resize',fit);fit();

// ---- 検算（ページの中の計算で、場面の表と食い違わないかを確かめる）
const MK={phase:'boot',scale:()=>SCALE};
MK.verify=()=>[SC.demo].concat(SC.scenes).map(s=>E.verifyScene(s,s.expectPins));
MK.verifyResult=MK.verify();
MK.ans=SC.scenes.map(s=>s.ans);
window.MEKIKI=MK;
window.MEKIKI_LOG={scenes:[],demoOpens:0,ricoOpens:0,autoDemo:false};
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
function cardHTML(c){return `<b>${rk(c)}</b><s>${SJ[c.s]}</s>`;}
const isRed=c=>c.s==='h'||c.s==='d';

// ---- 1画面
function makeScreen(demo){
  const root=el('div','sg '+(demo?'demo':'live'));
  root.innerHTML=`
  <div class="felt"></div><div class="spot"></div>
  <div class="win"><div class="face f-calm on"></div><div class="face f-peek"></div><div class="face f-hit"></div><div class="face f-miss"></div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><span class="tag">お手本</span><div class="ins"></div><button class="tbtn">お手本</button></div>
  <div class="row"><div class="bd"></div><div class="hd"></div></div>
  <div class="marks"></div>
  <div class="rule"><svg class="lp"><use href="#loupe"/></svg><span>ルーペの印＝<em>役ができた札</em></span></div>
  <div class="opts"></div>
  <div class="speech"></div><div class="note"></div>
  <button class="go">これだ！</button>
  <button class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button class="skip">とばす</button>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：目利き</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button class="pgo btnA">はじめる</button></div>
  <div class="res"><div class="big">見破った数</div><div class="num"></div><div class="lamps"></div><button class="rb btnA" data-r="again" style="left:316px;width:200px">もう1回</button><button class="rb btnB" data-r="demo" style="left:530px;width:200px">お手本</button></div>`;
  const q=s=>root.querySelector(s);
  const S={root,demo,sc:null,cards:[],pinIdx:[]};
  S.q=q;
  S.face=n=>{['calm','peek','hit','miss'].forEach(k=>q('.f-'+k).classList.toggle('on',k===n));S.faceCur=n;};
  S.shake=()=>{const w=q('.win');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake');};
  S.ins=t=>{q('.ins').textContent=t;};
  S.rib=h=>{const r=q('.rib');r.innerHTML=h;r.style.display=h?'':'none';};
  S.say=t=>{const s=q('.speech');if(t){s.innerHTML=fm(t);s.classList.add('on');}else s.classList.remove('on');};
  S.note=t=>{const n=q('.note');if(t){n.innerHTML=t;n.classList.add('on');}else n.classList.remove('on');};
  S.rule=on=>q('.rule').classList.toggle('on',!!on);
  S.opts=on=>q('.opts').classList.toggle('on',!!on);
  S.ask=on=>q('.askrico').classList.toggle('on',!!on);
  S.tbtn=on=>{q('.tbtn').style.display=on?'':'none';};
  S.rico=(t,smug)=>{const r=q('.rico');if(t){q('.rsay').innerHTML=fm(t);q('.rimg').classList.toggle('smug',!!smug);r.classList.add('on');}else r.classList.remove('on');};
  S.go=(label,state)=>{const g=q('.go');if(label)g.textContent=label;g.classList.toggle('on',state!=='off');g.disabled=state==='dis';g.classList.remove('press');};
  S.intro=(on,sn)=>{const i=q('.intro');if(sn!=null)q('.intro .sn').textContent=sn;i.classList.toggle('on',!!on);};
  // 場面を読み込む：全部伏せる・印を計算
  S.load=sc=>{
    S.sc=sc;
    const bd=q('.bd'),hd=q('.hd');bd.innerHTML='';hd.innerHTML='';q('.marks').innerHTML='';
    S.board=sc.board.split(' ').map((t,i)=>Object.assign(E.P(t),{id:'b'+i}));
    S.hole=sc.hole.split(' ').map((t,i)=>Object.assign(E.P(t),{id:'h'+i}));
    S.slots={};
    S.board.forEach(c=>{const e=el('div','cd back');bd.appendChild(e);S.slots[c.id]=e;});
    S.hole.forEach(c=>{const e=el('div','cd back');hd.appendChild(e);S.slots[c.id]=e;});
    S.pinIdx=E.pins(S.hole,S.board).pins;
    const o=q('.opts');o.innerHTML='';o.classList.remove('rev','on');
    sc.opts.forEach((op,i)=>{const b=el('button','opt',`<b>${op.label}</b><span class="why">${fm(op.why)}</span><i class="bdg"></i>`);b.dataset.i=i;o.appendChild(b);});
    S.rule(false);S.say(null);S.note(null);S.go(null,'off');S.face('calm');S.rico(null);
  };
  S.flip=id=>{const c=S.board.concat(S.hole).find(x=>x.id===id),e=S.slots[id];
    e.innerHTML=cardHTML(c);e.className='cd'+(isRed(c)?' r':'')+' flip';};
  S.pin=i=>{S.slots['b'+i].classList.add('pin');const m=el('div','mk','<svg class="lp"><use href="#loupe"/></svg>');m.style.left=(i*68+14)+'px';m.dataset.i=i;q('.marks').appendChild(m);};
  S.dimBoard=keep=>{S.board.forEach((c,i)=>S.slots[c.id].classList.toggle('dim',keep!=null&&!keep.includes(i)));};
  S.dimAll=(ids)=>{S.board.concat(S.hole).forEach(c=>S.slots[c.id].classList.toggle('dim',ids!=null&&!ids.has(c.id)));};
  S.glow=ids=>{S.board.concat(S.hole).forEach(c=>S.slots[c.id].classList.toggle('glow',!!ids&&ids.has(c.id)));
    q('.marks').querySelectorAll('.mk').forEach(m=>m.classList.toggle('glow',!!ids&&ids.has('b'+m.dataset.i)));};
  S.select=i=>{q('.opts').querySelectorAll('.opt').forEach((b,k)=>b.classList.toggle('sel',k===i));};
  S.cross=i=>S.badge(i,false);
  S.clearBadges=()=>{[...q('.opts').children].forEach(b=>{b.classList.remove('no','ok');});};
  S.revealOpts=(pick,onlyWrong)=>{const o=q('.opts');o.classList.add('rev');};
  S.badge=(i,ok)=>{const b=q('.opts').children[i];b.classList.add(ok?'ok':'no');b.querySelector('.bdg').textContent=ok?'◎':'×';};
  S.evidence=()=>E.made(S.board.concat(S.hole));
  return S;
}

// ---- 入口：選ぶ待ち
function bindPick(S,onGo){
  let sel=-1;
  S.q('.opts').addEventListener('click',e=>{const b=e.target.closest('.opt');if(!b||S.locked)return;sel=+b.dataset.i;S.select(sel);S.go('これだ！','on');});
  S.q('.go').addEventListener('click',()=>{if(S.go_handler)S.go_handler();});
  S.getSel=()=>sel;S.resetSel=()=>{sel=-1;};
}

// ============ お手本 ============
const COACH={
  l1:'今、A をルーペでのぞいたね。|グラーノは、自分の役ができた札だけ、ついのぞいちゃうの',
  l2:'あとの4枚は知らん顔。|役ができたのは、A の時だけ',
  l3:'9 のペアなら 9 でのぞくはず。|役なしなら、どれものぞかない。残るのは……',
  l4:'A のペア！',
  l5:'当たり。|手札が見えたまま卓に戻れるよ',
};
const CARD4=[['目的','グラーノの伏せた手札を当てる。|当てると、手札が開いたまま卓に戻れる。'],['やり方','場札が1枚ずつめくれる。|グラーノがルーペでのぞいた札に印が付く。|3つの見立てから1つ選ぶ。'],['危なさ','外れても損はしない。|ただ、手札は見えないまま。'],['見る物','ルーペの印（＝役ができた札）と、|場札のマークと数字。|印が無いのも手がかり。']];
let DEMO=null;
async function runDemo(replay){
  const run=new Run();run.noPause=true;
  const D=makeScreen(true);board.appendChild(D.root);DEMO=D;
  const prevPhase=MK.phase;phase('demo');
  const finish=()=>{run.kill();D.root.remove();DEMO=null;phase(prevPhase);};
  D.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;run.kick();});
  let skipped=false;
  D.q('.skip').addEventListener('click',()=>{skipped=true;run.kill();});
  const demoSc=SC.demo;
  D.load(demoSc);D.rib('<b>お手本</b>');D.root.querySelector('.rib').classList.add('demo');D.ins('');D.tbtn(false);
  const card4=async()=>{
    D.q('.skip').classList.add('off');
    D.rico(null);D.say(null);D.note(null);
    const pl=D.q('.pl');pl.innerHTML=CARD4.map(([a,b])=>`<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent=replay?'もどる':'はじめる';
    D.q('.panel').classList.add('on');phase('demo-card4');
    await new Promise(res=>D.q('.pgo').addEventListener('click',res,{once:true}));
  };
  try{
    phase('demo-0');
    D.intro(true,'お手本');await wait(run,1000);D.intro(false);await wait(run,250);
    // 拍1
    phase('demo-1');
    D.ins('めくれる札と、グラーノの顔を見て');
    D.flip('b0');D.face('peek');D.say('ほう……！');await wait(run,350);D.pin(0);await wait(run,700);
    // 止1
    phase('demo-stop1');
    D.glow(new Set(['b0']));D.rico(COACH.l1);await wait(run,4000);
    D.rico(null);D.glow(null);D.say(null);D.face('calm');await wait(run,300);
    // 拍2
    phase('demo-2');
    for(let k=1;k<5;k++){D.flip('b'+k);await wait(run,500);}
    // 止2
    phase('demo-stop2');
    D.dimBoard([0]);D.rico(COACH.l2,true);await wait(run,4000);
    D.rico(null);D.dimBoard(null);await wait(run,200);
    // 拍3
    phase('demo-3');
    D.ins('グラーノの手は、3つのどれ？');D.rule(true);D.opts(true);await wait(run,1000);
    // 止3
    phase('demo-stop3');
    D.rico(COACH.l3);await wait(run,600);
    D.cross(1);await wait(run,900);
    D.cross(2);await wait(run,2500);
    // 拍4
    phase('demo-4');
    D.rico(null);D.clearBadges();
    D.select(0);D.rico(COACH.l4,true);D.go('これだ！','on');await wait(run,900);
    D.q('.go').classList.add('press');await wait(run,600);
    // 拍5
    phase('demo-5');
    D.q('.go').classList.remove('press');D.go(null,'off');D.rule(false);D.rico(null);
    await reveal(run,D,demoSc,0,{demo:true});
    D.rico(COACH.l5,true);D.ins('当たり！ 手札が開いたまま卓へ');
    await wait(run,3000);
  }catch(e){if(e.message!=='cancel')throw e;}
  if(!skipped){ /* 最後まで来た */ }
  await card4();
  window.MEKIKI_LOG.demoDone=(window.MEKIKI_LOG.demoDone||0)+1;
  finish();
}

// ============ 明かし（本編とお手本で共通） ============
async function reveal(run,S,sc,pick,o){
  const hit=pick===sc.ans;
  const ev=S.evidence();
  S.say(null);S.note(null);S.face(hit?'hit':'miss');if(hit)S.shake();
  S.flip('h0');await wait(run,350);S.flip('h1');await wait(run,500);
  S.say(hit?(sc.hitLine||'な、なぜそれを……！|お見通しですな'):'はっはっは。|目利きは、まだまだですな');
  S.rule(false);
  await wait(run,500);
  S.dimAll(ev.size?ev:null);S.glow(ev.size?ev:null);
  if(!o||!o.demo)S.ins(hit?'当たり！ 手札が開いたまま卓へ':'外れ… でも損はなし');
  await wait(run,500);
  S.q('.opts').classList.add('rev');
  const order=sc.opts.map((_,i)=>i).sort((a,b)=>(a===sc.ans)-(b===sc.ans));
  for(const i of order){S.badge(i,i===sc.ans);await wait(run,320);}
}

// ============ 本編 ============
const G={score:0,results:[]};
let MAIN=null;
function openDemoFromPlay(){
  if(PAUSE||DEMO)return;
  window.MEKIKI_LOG.demoOpens++;
  PAUSE=new Promise(r=>{RESUME=r;});
  runDemo(true).then(()=>{const r=RESUME;PAUSE=null;RESUME=null;r();});
}
async function playScene(S,run,i){
  const sc=SC.scenes[i];
  const rec={id:sc.id,pick:null,ok:null,secs:null,ricoOpens:0,pins:null};
  S.load(sc);S.resetSel();S.locked=false;
  S.rib(`見破った <b>${G.score}／6</b>`);S.ins('');S.tbtn(false);S.ask(false);
  phase('s'+sc.id+'-intro');
  S.intro(true,`場面 ${sc.id}／6`);await wait(run,1000);S.intro(false);await wait(run,300);
  S.tbtn(true);
  // めくり
  phase('s'+sc.id+'-flip');
  S.ins('めくれる札と、グラーノの顔を見て');
  let np=0;
  for(let k=0;k<5;k++){
    await wait(run,350);
    S.flip('b'+k);
    if(S.pinIdx.includes(k)){np++;S.face('peek');S.say(np===1?'ほう……！':'ほほう……！');await wait(run,300);S.pin(k);await wait(run,900);S.face('calm');S.say(null);}
    else await wait(run,250);
  }
  run.ff=false;
  rec.pins=[...S.q('.marks').querySelectorAll('.mk')].map(m=>+m.dataset.i);
  // 見立て
  phase('s'+sc.id+'-pick');
  S.ins('グラーノの手は、3つのどれ？');S.rule(true);S.opts(true);S.go('これだ！','dis');
  S.ask(sc.id<=2);
  const noteHTML='当たり：手札が開いたまま卓へ<br>外れ：損はなし';
  if(!S.pinIdx.length){S.say('……さて、どうですかな');setTimeout(()=>{S.say(null);S.note(noteHTML);},2200/SPEED);}else S.note(noteHTML);
  const t0=performance.now();
  S.q('.askrico').onclick=()=>{rec.ricoOpens++;window.MEKIKI_LOG.ricoOpens++;S.rico(sc.coach,true);S.ask(false);};
  S.q('.rico').onclick=()=>{S.rico(null);S.ask(sc.id<=2);};
  const pick=await new Promise(res=>{S.go_handler=()=>{const s=S.getSel();if(s>=0)res(s);};});
  S.go_handler=null;S.locked=true;S.rico(null);S.ask(false);
  rec.pick=pick;rec.secs=+((performance.now()-t0)/1000).toFixed(1);rec.ok=pick===sc.ans;
  if(rec.ok)G.score++;
  S.go(null,'off');
  // 明かし
  phase('s'+sc.id+'-reveal');
  S.opts(true);
  await reveal(run,S,sc,pick);
  S.rib(`見破った <b>${G.score}／6</b>`);
  window.MEKIKI_LOG.scenes.push(rec);G.results.push(rec.ok);
  S.go(i<5?'つぎへ':'結果を見る','on');
  phase('s'+sc.id+'-done');
  await new Promise(res=>{S.go_handler=res;});
  S.go_handler=null;
}
async function showResult(S){
  S.load(SC.scenes[0]);
  S.q('.top').style.visibility='hidden';
  ['.row','.marks','.rule','.opts','.speech','.note','.go','.askrico'].forEach(s=>S.q(s).style.display='none');
  S.rib('');
  const r=S.q('.res');r.classList.add('on');
  S.q('.num').innerHTML=`${G.score}<small>／6</small>`;
  S.q('.lamps').innerHTML=G.results.map(x=>`<i class="${x?'y':'n'}">${x?'◎':'×'}</i>`).join('');
  S.face(G.score>=4?'hit':'calm');
  if(G.score<4)S.face('miss');
  phase('result');
  window.MEKIKI_LOG.final={score:G.score,results:G.results.slice()};
  return new Promise(res=>{r.onclick=e=>{const b=e.target.closest('button');if(b)res(b.dataset.r);};});
}
function resetScreenVisibility(S){
  S.q('.top').style.visibility='';
  ['.row','.marks','.rule','.opts','.speech','.note','.go','.askrico'].forEach(s=>S.q(s).style.display='');
  S.q('.res').classList.remove('on');
}
async function main(){
  const S=makeScreen(false);board.appendChild(S.root);MAIN=S;bindPick(S);
  const run=new Run();
  S.root.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;if(/flip$/.test(MK.phase)){run.ff=true;run.kick();}});
  S.q('.tbtn').addEventListener('click',openDemoFromPlay);
  S.load(SC.scenes[0]);
  if(!LS.get('mekiki.seen')){window.MEKIKI_LOG.autoDemo=true;await runDemo(false);LS.set('mekiki.seen','1');}
  for(;;){
    G.score=0;G.results=[];window.MEKIKI_LOG.scenes.length=0;
    resetScreenVisibility(S);
    for(let i=0;i<6;i++)await playScene(S,run,i);
    let again=false;
    while(!again){
      const r=await showResult(S);
      if(r==='again')again=true;
      else{window.MEKIKI_LOG.demoOpens++;await runDemo(true);}
    }
  }
}
main().catch(e=>{window.MEKIKI.error=String(e&&e.stack||e);console.error(e);});
})();
