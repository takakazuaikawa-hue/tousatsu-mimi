// 固定の6場面とお手本（仕様 §4-A）。印・役の名前・札の名前・理由は engine.js の計算から出す（手で書かない）。
// real＝本物（おねだりの札が来た）。answer＝'call'（払う）か 'fold'（降りる）。どちらも engine.js の計算と食い違えば検算で落ちる。
const ONE_SCENES=(function(){
const E=ONE_ENGINE;
const TITLE='リーディング：おねだり';
const POT=800,BET=600;
const demo={id:'demo',who:'ポルカ',board:'Ks 9h 4h 2c 6s',mimi:'Kd Jc',her:'Ah 7h',sign:'suit',real:false,answer:'call'};
const scenes=[
 {id:1,who:'ポルカ',board:'Qd Th 5h 3s 2h',mimi:'As Qc',her:'Kh 8h',sign:'suit',real:true,answer:'fold'},
 {id:2,who:'グラーノ',board:'Jh 7d 6s 2c As',mimi:'Js Td',her:'Ts 8h',sign:'rank',real:false,answer:'call'},
 {id:3,who:'セリナ',board:'Ad 9d 5c 3s 8h',mimi:'9s 8s',her:'Kd Td',sign:'count',real:false,answer:'call'},
 {id:4,who:'リコ',board:'6c 7d Ks 2h Tc',mimi:'Kh Qd',her:'8s 9s',sign:'rank',real:true,answer:'fold'},
 {id:5,who:'グラーノ',board:'Kc 8s 5s 2d 9s',mimi:'Kh 9h',her:'As Js',sign:'suit',real:true,answer:'fold'},
 {id:6,who:'ヴェルベット',board:'Qd 7d 4h 2s 9h',mimi:'Jc Js',her:'Ad 6d',sign:'color',real:false,answer:'call'},
];
const B=BET;
// 5人の言い方（決まりは同じ。変わるのは、おねだりの言い方＝印のぼかし方）。{ } は d から出す。| で折る
const WHO={
 'ポルカ':{key:'polka',ask:d=>`お願い〜！|${d.signTxt} こい ${d.signTxt} こい〜！`,
  bet:()=>({face:'drunk2',t:`……ど、どーん！|${B}！`}),
  beaten:[{face:'panic',t:()=>'なんで〜！|うわぁ〜ん！'},{face:'drunk',t:()=>'……あ、|声に出てた？'}],
  fooled:[{face:'smug',t:()=>'やった〜！|ばれなかった〜♪'}],
  dodged:[{face:'drunk2',t:d=>`あ〜ん、降りちゃった〜|${d.finName} 来たのに〜`}],
  caught:[{face:'smug',t:d=>`やった〜！|${d.finName} 来た〜♪`}]},
 'グラーノ':{key:'grano',ask:d=>`次の ${d.signTxt} は、わたくしが|予約済みですぞ`,
  bet:()=>({face:'drunk2',t:`これは掘り出し物ですぞ！|${B}！`}),
  beaten:[{face:'panic',t:()=>'ぐぬぬ……|不良在庫でしたか'}],
  fooled:[{face:'smug',t:()=>'まいどあり！|口上が物を言いますな'}],
  dodged:[{face:'drunk2',t:()=>'おや、降りましたか。|お目が高い'}],
  caught:[{face:'smug',t:d=>`予約の品が届きましたぞ！|${d.herName}、まいど！`}]},
 'リコ':{key:'rico',ask:d=>`アタシの欲しい札、教えたげる。|${d.signTxt}。その上で、当ててみな？`,
  bet:()=>({face:'drunk2',t:`よし、|${B} いこっか`}),
  beaten:[{face:'panic',t:()=>'ばれたか〜。|えらいえらい'}],
  fooled:[{face:'smug',t:()=>'あはは、降りちゃった？|先輩の勝ち〜'}],
  dodged:[{face:'drunk2',t:()=>'ん〜、降りたか。|いい判断だよ'}],
  caught:[{face:'smug',t:d=>`ごめんね〜。|${d.herName}、できちゃった♪`}]},
 'セリナ':{key:'selina',ask:d=>`……${d.signTxt}。|確率は……ひっく`,
  bet:()=>({face:'drunk2',t:`……${B}。|賭けます`}),
  beaten:[{face:'panic',t:()=>'……計算どおりには、|いきませんね'}],
  fooled:[{face:'smug',t:()=>'……降りるのですか。|計算外です'}],
  dodged:[{face:'drunk2',t:()=>'……正しい判断です。|降りる局面でした'}],
  caught:[{face:'smug',t:d=>`……当然の結果です。|待ちの ${d.outs.length} 枚を、引きました`}]},
 'ヴェルベット':{key:'velvet',ask:d=>`${d.signTxt}が欲しいな♡|ねぇ、わかる？`,
  bet:d=>d.hit?{face:'panic',t:`あ〜あ、来ちゃった〜……|${B}`}:{face:'smug',t:`やったぁ、来た来た〜♡|${B}！`},
  beaten:[{face:'panic',t:()=>'ちぇっ。|ざぁこのくせに〜♡'}],
  fooled:[{face:'smug',t:()=>'うふふ♡ 引っかかった〜|やっぱり顔を見ちゃう？'}],
  dodged:[{face:'drunk2',t:()=>'ちぇっ、降りるんだ。|つまんなぁい♡'}],
  caught:[{face:'smug',t:()=>'ほぉら、来ちゃった♡|ごちそうさま〜♡'}]},
};
const tx=(s,d)=>typeof s==='function'?s(d):s;
// 彼女が声に出す
const askLine=(who,d)=>WHO[who].ask(d);
const betLine=(who,d)=>WHO[who].bet(d);
// 理由（計算から）
function reasonOf(d,pick){
  const calledRight=pick==='call'&&!d.hit,foldedRight=pick==='fold'&&d.hit;
  let a;
  if(d.sign.t==='count')a=`「${d.signTxt}」は ${d.kind==='flush'?E.SJ[d.outSuit]+' の待ち':'並びの待ち'}。来たのは ${d.finName}。`;
  else if(d.sign.t==='color')a=`おねだりは${d.signTxt}。来たのは ${d.finName}。赤でも ${E.SJ[d.outSuit]} ではない。`;
  else a=`おねだりは ${d.signTxt}。来たのは ${d.finName}。`;
  const b=d.hit?`${d.made}が できた。`:`${d.made}は できていない。`;
  let c;
  if(calledRight)c=`ミミの ${d.mimiName} が勝ち`;
  else if(foldedRight)c=`${d.herName}には勝てない。|降りて正解（−${BET} を さけた）`;
  else if(!d.hit)c=`払えば、|ミミの ${d.mimiName} が勝って ＋${POT+BET} だった`;
  else c=`ミミの ${d.mimiName} では、|${d.herName}に勝てない`;
  return a+'|'+b+'|'+c;
}
// 結果を計算で決める。pick: 'call'／'fold'
function outcome(d,pick){
  const kind=pick==='call'?(d.hit?'caught':'beaten'):(d.hit?'dodged':'fooled');
  const good=pick===d.answer;
  const mark={beaten:'◎ 見やぶった',dodged:'◎ かわした',fooled:'✕ だまされた',caught:'✕ つかまった'}[kind];
  const delta={beaten:`＋${POT+BET}`,dodged:`±0`,fooled:`±0`,caught:`−${BET}`}[kind];
  return{kind,good,mark,delta,cls:good?'good':'bad',reason:reasonOf(d,pick)};
}
// 手引き（リコに聞く）。数字・札は d から
const COACH={
 1:d=>`おねだりは ${d.signTxt}。来たのは ${d.finName}。|小さい札でも、マークが合えば……？`,
 2:d=>`おねだりは ${d.signTxt}。来たのは ${d.finName}。|A は大きいけど、${d.signTxt} じゃないよね`,
 3:d=>`「${d.signTxt}」は、同じマークの待ち。|場に2枚ある ${E.SJ[d.outSuit]} は、来たかな？`,
};
const DEMO_COACH={
 s1:d=>`ポルカは ${d.signTxt} がほしいの。|${d.signTxt} が来れば、フラッシュができるよ`,
 s2:d=>`来たのは ${d.finName}。${d.signTxt} じゃないね。|おねだりが来なければ、役はできてない`,
 s3:d=>`ミミは ${d.mimiName}。役なしの人には勝てる。|だから、払おう`,
 s4:d=>`ポルカの ${d.herHole.join(' ')}。${d.signTxt} は ${d.lineup.filter(x=>x.card&&!x.fin).length}枚で止まった。|はったりを、見やぶれたね`};
const CARD4=[
 ['目的','彼女が欲しい札を、最後の札の前に|声に出す。来たかを見て、決める。'],
 ['決まり','おねだりの札が来なければ、|彼女の役はできていない（はったり）。'],
 ['決め方','来ない＝払う。来た＝降りる。|小さい札でも、来たら本物。'],
 ['印の読み方','♥や 9 はそのまま。「赤」は ♥ か ♦。|「あと9枚」＝同じマーク。|8枚＝並びの両はし。4枚＝間の1枚。']];
return{TITLE,POT,BET,demo,scenes,WHO,tx,askLine,betLine,outcome,COACH,DEMO_COACH,CARD4};
})();
