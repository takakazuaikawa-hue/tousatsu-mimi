// おねだりの検算。node qa/onedari/check.js
// engine.js と scenes.js を、ページの中と同じ形で読み込み、全場面の正解・印・台詞・理由が計算と合うことを確かめる。
const fs=require('fs'),path=require('path'),vm=require('vm');
const here=__dirname;
const src=['engine.js','scenes.js'].map(f=>fs.readFileSync(path.join(here,f),'utf8')).join('\n')+';({E:ONE_ENGINE,S:ONE_SCENES})';
const {E,S}=vm.runInNewContext(src,{});
const all=[S.demo].concat(S.scenes);let bad=0;const fail=(id,m)=>{bad++;console.log('NG',id,m);};
const BANNED=/寝|眠|ぐったり|つぶれ|潰れ|意識/;
const rows=[];
for(const sc of all){
  const v=E.verifyScene(sc);const d=v.d;
  v.why.forEach(w=>fail(sc.id,w));
  const W=S.WHO[sc.who];if(!W){fail(sc.id,'人が無い');continue;}
  // 印の文言が、計算した印を含む
  const must={suit:E.SJ[d.outSuit],rank:d.outRanks.map(E.RN)[0],color:'赤',count:String(d.outs.length)}[sc.sign];
  const ask=S.askLine(sc.who,d);
  if(!ask.includes(must))fail(sc.id,'おねだりの台詞に印が無い: '+ask);
  // 台詞・理由・手引きに、{ }や undefined が残っていない／禁句が無い
  const texts=[ask,S.betLine(sc.who,d).t];
  const oc={};
  for(const pick of['call','fold']){const o=S.outcome(d,pick);oc[pick]=o;texts.push(o.reason,o.delta,o.mark);
    (W[o.kind]||[]).forEach(st=>texts.push(S.tx(st.t,d)));
    if(!W[o.kind]||!W[o.kind].length)fail(sc.id,'反応が無い '+o.kind);}
  if(S.COACH[sc.id])texts.push(S.COACH[sc.id](d));
  if(sc.id==='demo')Object.values(S.DEMO_COACH).forEach(f=>texts.push(f(d)));
  texts.forEach(t=>{if(/[{}]|undefined|NaN/.test(t))fail(sc.id,'未置換: '+t);if(BANNED.test(t))fail(sc.id,'禁句: '+t);});
  // 理由が、計算した札・役を含む
  const r=oc[d.answer].reason;
  if(!r.includes(d.finName))fail(sc.id,'理由に最後の札が無い');
  if(!r.includes(d.made))fail(sc.id,'理由に待ちの役が無い');
  if(d.answer==='call'&&d.hit)fail(sc.id,'本物なのに払うが正解');
  if(d.answer==='fold'&&!d.hit)fail(sc.id,'はったりなのに降りるが正解');
  if(oc[d.answer].kind!==(d.hit?'dodged':'beaten'))fail(sc.id,'正解の分類が違う');
  if(oc[d.answer==='call'?'fold':'call'].kind!==(d.hit?'caught':'fooled'))fail(sc.id,'不正解の分類が違う');
  rows.push([sc.id,sc.who,d.hit?'本物':'はったり',d.answer==='call'?'払う':'降りる',d.signTxt,d.finName,d.herName,d.mimiName,d.outs.length+'枚',d.lineup.map(x=>x&&x.card?x.card.t:'□').join(' ')]);
}
console.log('id\t人\t本物?\t正解\t印\t最後\t彼女\tミミ\t待ち\t並び');rows.forEach(r=>console.log(r.join('\t')));
// 決め打ちの方針の成績（本編の6場面）
const six=S.scenes.map(sc=>E.derive(sc));
const strat={'いつも払う':d=>'call','いつも降りる':d=>'fold','大きい札(J以上)が出たら降りる':d=>d.fin.r>=9?'fold':'call',
 '自分の役が上がったら払う':d=>d.mimiFinal[0]>d.mimi4[0]?'call':'fold'};
console.log('--- 決め打ち（6場面中の正解数）');
for(const k in strat){const n=six.filter(d=>strat[k](d)===d.answer).length;console.log(k,n+'／6');}
console.log('正解の並び',six.map(d=>d.answer==='call'?'払':'降').join('・'),'  本物',six.filter(d=>d.hit).length,'はったり',six.filter(d=>!d.hit).length);
console.log('出る人',[...new Set(all.map(s=>s.who))].join('、'));
// 参考：乱数で配って、彼女が待ちだけ・ミミがペア以上になる割合
let n=0,ok=0;const ds=E.FULL;
function rnd(k){const a=ds.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,k);}
for(let i=0;i<20000;i++){const c=rnd(9),b4=c.slice(0,4),her=c.slice(4,6),mi=c.slice(6,8);n++;
  if(E.score(b4.concat(her))[0]!==0||E.score(b4.concat(mi))[0]<1)continue;if(!E.outsOf(b4,her).length)continue;ok++;}
console.log('参考：場札4枚で、彼女が待ちだけ・ミミがペア以上の配り',(ok/n*100).toFixed(2)+'%');
console.log(bad?'NG '+bad+' 件':'全部OK');process.exit(bad?1:0);
