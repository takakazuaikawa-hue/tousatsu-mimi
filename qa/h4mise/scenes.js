// 固定の6場面とお手本（仕様 §4-4・§5）。名前・糸・台詞の { } は engine.js の計算から出す（手で書かない）。
// ans: 0＝左の札 1＝右の札 2＝見せない
const H4_SCENES=(function(){
const E=H4_ENGINE;
const TITLE='リーディング：見せ合いっこ';
const demo={id:'demo',board:'Kh 9c 4d 2s Jc',mimi:'Ks 4c',polka:'9d 6h',ans:1};
const scenes=[
 {id:1,board:'Jh 8s 6d 3c 2h',mimi:'Ad Jc',polka:'8d 4s',ans:0,coach:'A は大きいけど、場に A は無いよね。|J は？ 場に J があるよ'},
 {id:2,board:'Qs Td 7c 4h 2s',mimi:'Ac 9h',polka:'Tc 5d',ans:2,coach:'ミミは役なし。ポルカは 10 のペア。|見せたら、安心して払われて負けちゃうよ'},
 {id:3,board:'5c 6d 7h 8s Kd',mimi:'9h 5s',polka:'Ks 2c',ans:1},
 {id:4,board:'Ks Jd 8c 5h 3d',mimi:'8h 7s',polka:'Jc 6s',ans:2},
 {id:5,board:'7d 7c Qs 3h 9d',mimi:'7s Ah',polka:'Qd 4c',ans:1},
 {id:6,board:'Kh 9h 6h 2h 5c',mimi:'3c Ah',polka:'9s Jd',ans:0},
];
const POT=600,BET=300;
const RK=c=>E.RN(c.r);
// 言い出す（毎回同じ）
const OPEN=['う〜、こわいよぉ……。|ねえ、1枚ずつ 見せっこしよ？','あたし、これ〜！|弱そうだったら、払うから〜'];
// 彼女の「あたしの {9} のほうが上」の言い方
function herUp(d){const k=d.r.hs.real[0];return k===2?'あたしはツーペアだもん♪':`あたしの ${RK(d.r.hs.card)} のほうが上〜♪`;}
function herCant(d){const k=d.r.hs.real[0];return k===2?'あたしのツーペアじゃ、勝てないよぉ……':`あたしの ${RK(d.r.hs.card)} じゃ、勝てないよぉ……`;}
// 見えた役の言い回し（役なし／場のペアだけ／つながった役）
function seenCall(d,i){const s=d.seen[i];
  if(s.score[0]===0)return['なーんだ、何もないじゃん！|はったりだ〜♪'];
  return[`なーんだ、${s.name}${s.improved?'':'だけ'}？|${herUp(d)}`];}
// 結果を計算で決める。pick: 0,1＝その札 / 2＝見せない
function outcome(d,pick){
  const a=d.ahead>0;
  if(pick===2){
    const steps=[{face:'plead',t:'え〜！ あたしだけ|見せたのに〜！ ずるい〜！'},{face:'bawl',t:'……やっぱり こわいから、|降りる〜'}];
    if(!a)steps.push({face:'plead',t:'ねえ、ほんとは|何 持ってたの〜？'});
    const good=d.r.out.map((o,i)=>o==='call'?i:-1).filter(i=>i>=0);
    const other=good.length?d.mimi[good[0]]:null;
    return{kind:a?'fled':'drop',mark:a?'△ 逃げられた':'◎ 降ろした',delta:POT,cls:a?'warn':'good',steps,flip:false,
      reason:a?(other?`${RK(other)} を見せていれば、安心して払ってくれた`:'見せなかったので、降りられた'):
        (d.r.mReal[0]===0?'ミミは役なし。見せなかったので、こわがったまま降りた':`ミミは ${d.mimiName}。${d.herName}には負けている。見せなかったので、こわがったまま降りた`)};
  }
  const card=d.mimi[pick],oth=d.mimi[1-pick],s=d.seen[pick],call=d.r.out[pick]==='call';
  if(!call){
    const okOth=d.r.out[1-pick]==='call';
    return{kind:'fled',mark:'△ 逃げられた',delta:POT,cls:'warn',flip:false,
      steps:[{face:'panic',t:`${s.name}！？|${herCant(d)}`},{face:'plead',t:'降りる〜……ひっく'}],
      reason:`${RK(card)} は『${s.name}』に見える。${d.herShort}より上なので、降りた。${okOth?RK(oth)+' なら払ってくれた':''}`};
  }
  const lines=seenCall(d,pick);
  const pay={face:'drunk',t:lines[0]};
  const why=s.score[0]===0?`${RK(card)} は場札とつながらない。『役なし』に見えるので、安心して払った`:
    (s.improved?`${RK(card)} は『${s.name}』に見える。${d.herShort}より下なので、安心して払った`:
      `${RK(card)} は場札とつながらない。場の『${s.name}』だけに見える。${d.herShort}より下なので、安心して払った`);
  if(a){
    const fl=d.r.mReal[0]===5?E.SJ[d.mimi[0].s]:RK(oth);
    const flipLine=d.r.mReal[0]===5?`えっ……${fl}！？|${E.sname(d.r.mReal)}！？`:`えっ……${fl} も！？|${E.sname(d.r.mReal)}！？`;
    return{kind:'paid',mark:'◎ 払わせた',delta:POT+BET,cls:'good',flip:true,
      steps:[pay,{face:'drunk',t:'払う払う〜！'},{face:'panic',t:flipLine,flip:true},{face:'bawl',t:'ず、ずる〜い！|うわぁ〜ん！'}],reason:why};
  }
  return{kind:'caught',mark:'✕ ばれた',delta:-BET,cls:'bad',flip:true,
    steps:[pay,{face:'drunk',t:'払う払う〜！'},{face:'drunk',t:'やった〜！|あたしの勝ち〜♪',flip:true}],
    reason:'見せた札で、弱いのがばれた。負けている時は、見せない'};
}
const DEMO_COACH={
  s1:'ポルカは 9 のペア。ミミは勝ってるね。|払ってくれたら、もっともうかるよ',
  s2:'K を見せると、K のペアに見える。|9 より上だから、こわがって降りちゃう',
  s3:'4 なら、4 のペアに見える。|9 より下だから、安心して払ってくれるよ',
  s4:'大きい札がこわい札、とは限らないの。|場札とつながる札がこわいんだよ'};
const CARD4=[['目的','迷っているポルカに、払ってもらう。|ただし、ミミが負けている時は、降りてもらう。'],['やり方','ミミの札を1枚選んで見せる。|または「見せない」。'],['危なさ','負けている時に見せると、弱いのが|ばれて、払われて負ける。'],['見る物','ポルカの役の札と、ミミの札が場札と|つながるか（同じ数字・並び・同じマーク）。']];
return{TITLE,demo,scenes,POT,BET,OPEN,outcome,DEMO_COACH,CARD4,RK};
})();
