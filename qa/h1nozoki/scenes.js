// 固定の6場面とお手本（仕様 §4-4・§4-5・§5）。役の名前・額・理由の { } は engine.js の計算から出す（手で書かない）。
const H1_SCENES=(function(){
const E=H1_ENGINE,U=E.UNIT;
const TITLE='リーディング：寝落ちのぞき';
const demo={id:'demo',who:'ポルカ',N:3,board:'Kd Tc 7s 5h 2c',mimi:'2s 3s',her:'Qh 8d',line:['のぞく','のぞく','賭ける'],cells:[6,4,0],chips:300};
const scenes=[
 {id:1,who:'ポルカ',N:3,board:'Ad Jc 8s 5h 3c',mimi:'3h 4h',her:'Js 9d',line:['のぞく','賭けない'],cells:[6,10],chips:0,
  coach:['赤が半分より多いね。|賭ける前に、のぞいてみよう','真っ赤。|もう1枚見ても、変わらないよ']},
 {id:2,who:'セリナ',N:1,board:'Kh 9h 4h 7s 2d',mimi:'Ah Qh',her:'Ks Kd',line:['賭ける'],cells:[0],chips:300,
  coach:['赤が無い。セリナの泡は1つだけ。|……のぞいたら、どうなる？']},
 {id:3,who:'リコ',N:3,board:'Qd 9c 6s 4d 2h',mimi:'Kc Jc',her:'7h 9s',line:['のぞく','のぞく','賭けない'],cells:[7,5,10],chips:0},
 {id:4,who:'ヴェルベット',N:2,fake:true,board:'As Th 8d 5c 2h',mimi:'5s 6s',her:'Ad 8c',line:['賭けない'],cells:[5],chips:0},
 {id:5,who:'グラーノ',N:2,board:'Qh Jd 6c 3s 2h',mimi:'As Qs',her:'9c 6d',line:['賭ける'],cells:[1],chips:600},
 {id:6,who:'ポルカ',N:3,board:'Kd 9s 7h 4c 2d',mimi:'4s 5s',her:'8h 3c',line:['のぞく','賭ける'],alt:['のぞく','のぞく','賭ける'],cells:[5,3],chips:600},
];
// 人ごとの台詞（仕様 §4-5）。{役}＝相手の役 {額}＝賭けた額 {ミミ役}＝ミミの役。| で折る
const WHO={
 'ポルカ':{table:'polka',sleepIn:'ミミちゃん、まだ〜？|……ふぁ……（こくり）',breath:'すぅ……|すぅ……',talk:'ん……もう1杯……',
  wake:'ふぇ……？|あたし、寝てた〜？',pay:'ん〜……はらう〜……|むにゃ',lost:['……えっ！？|あたし、払ってる〜！？','{役}なのに〜！|うわぁ〜ん！'],
  won:['むにゃ……あれ？|あたし、勝ってる〜♪'],foldHer:'ふぇ？ 勝負〜？|……やった、{役}〜♪',foldMimi:'ふぇ？ 負けちゃった〜……|でも、払わなくてよかった〜',
  wokeMimi:'あれ、|負けてる〜！',wokeHer:'やった〜、|{役}〜♪'},
 'リコ':{table:'rico',sleepIn:'ミミ、ゆっくり考えな〜。|アタシ、待ってるから……（すとん）',breath:'すぅ……|むにゃ……',talk:'むにゃ……よくばっちゃ……|だめ、だよ……',
  wake:'んぁ……？ 寝てた？|やだ、先輩なのに〜',pay:'は〜い……|払いま〜す……えへへ',lost:['……あれ？ アタシ、払った？','やられた〜！|うまくなったね、ミミ'],
  won:['むにゃ……ごちそうさま……','え、アタシ勝ったの？'],foldHer:'ん〜……勝負？ {役}。|……賭けなかったんだ。えらいえらい',foldMimi:'ん〜……勝負？ 負けちゃった……|賭けてくれたら払ったのにね〜',
  wokeMimi:'あ〜、負けてる〜。|うまくなったね、ミミ',wokeHer:'やった、|{役}〜♪'},
 'グラーノ':{table:'grano',sleepIn:'どうぞ ごゆっくり、お嬢さん。|わたくしは勘定を……ひい、ふう……（ぐぅ）',breath:'ぐぅ……|ぐぅ……',talk:'むにゃ……まいど……',
  wake:'はっ！ ……うちの売上は、|無事ですかな！？',pay:'へい……まいど……|おおきに……',lost:['……はて。わたくし、|なぜ払っておりますの！？','{役}で {額}……。|高い買い物ですな……'],
  won:['むにゃ……まいど……','おや、もうかっておりますな'],foldHer:'おや、勝負ですかな。{役}。|……賭けていただければ、なお良かった',foldMimi:'おや、勝負ですかな。……負けですか。|賭けていただければ、払いましたのに',
  wokeMimi:'おお、負けですかな。|……お嬢さん、お強い',wokeHer:'おや、{役}ですな。|まいど！'},
 'セリナ':{table:'selina',sleepIn:'期待値を計算します。|少々……お待ちを……（かくん）',breath:'……すぅ……',talk:'……すぅ……',
  wake:'……寝ていません。目を閉じて、|計算していただけです',pay:'……コール……。計算上……|問題……ありません……',lost:['……待ってください。いつ、|私は払ったのですか','{ミミ役}……。|計算が、合いません……'],
  won:['……当然の結果です。','……すぅ'],foldHer:'……勝負ですか。{役}です。|賭けなかったのは、正しい判断です',foldMimi:'……勝負ですか。ミミさんの勝ちです。|賭けていれば、私が払っていました',
  wokeMimi:'……ミミさんの勝ちですか。|計算外です',wokeHer:'……当然の結果です。|{役}です'},
 'ヴェルベット':{table:'velvet',sleepIn:'ふぁ……ミミちゃん、おそ〜い。|……寝ちゃおっかな♡',breath:'ぐー、|ぐー♡',talk:'ん……♡',
  wake:'……なぁに？ ひとの寝顔、|見てたの？ ざぁこ♡',pay:'ん……いいわよ……|払ったげる……♡',lost:['……うそ。あたし、|寝ながら払ったの！？','ざぁこのくせに〜っ！'],
  won:['ん……♡ ねてるあたしにも|負けるの？ ざぁこ♡'],foldHer:'ふぁ……{役}。|なぁんだ、賭けてくれないの？',foldMimi:'……あら、負けちゃった。|賭けてくれればよかったのに♡',
  wokeMimi:'……あら、負けちゃった。',wokeHer:'ふぁ……{役}。|ざぁこ♡',
  caught:['つ〜かまえた♡|のぞき料、300 ね。ざぁこ♡'],trap:['ぱちっ♡ 起きてま〜す','{役}。|ごちそうさま、ざぁこ♡'],
  dodge:['……ちぇっ。引っかからないの？|つまんなぁい','{役}だったのに。|ざぁこのくせに、用心ぶかいんだから♡']},
};
const sub=(t,v)=>String(t).replace(/\{(役|額|ミミ役)\}/g,(m,k)=>v[k]);
const sgn=n=>n>0?'＋'+n:n<0?'−'+Math.abs(n):'±0';
// 結果を計算で決める。st＝{act:'bet'|'fold'|'caught',k:のぞいた枚数,left:残りの泡}
// steps：face＝sleep（寝顔）wake（起きた）win（彼女が勝つ）lose（彼女が負ける）／open＝残りの札を開く／coins＝泡がコインになる
function outcome(d,st){
  const s=d.sc,W=WHO[s.who],N=s.N,k=st.k,left=st.left,woke=left===0;
  const herNm=d.herName,minNm=d.mimiName,ahead=d.ahead;
  const v={役:herNm,額:left*U,ミミ役:minNm};
  const whoIs=`${s.who}は${herNm==='役なし'?'':' '}${herNm}`;
  const T=a=>sub(a,v);
  const R=o=>Object.assign({kind:'',mark:'',delta:0,cls:'',steps:[],reason:'',alt:''},o);
  if(s.fake){
    if(st.act==='caught')return R({kind:'caught',mark:'✕ 見つかった',delta:-U,cls:'bad',marks:true,
      steps:[{face:'win',t:W.caught[0],noOpen:true}],reason:'片目が開き、口元が笑い、寝息がわざとらしい。のぞかない'});
    if(st.act==='bet'){
      if(ahead)return R({kind:'dodged',mark:'△ 降りられた',delta:0,cls:'warn',steps:[{face:'win',t:W.trap[0]},{face:'lose',open:true,t:T(W.trap[1])}],reason:'寝たふりで賭けさせたかったが、この手は弱かった'});
      return R({kind:'trap',mark:'✕ 罠にかかった',delta:-left*U,cls:'bad',marks:true,
        steps:[{face:'win',t:W.trap[0],coins:true},{face:'win',open:true,t:T(W.trap[1])}],reason:'寝たふりは、賭けさせるための罠。泡もにせものだった'});
    }
    return R({kind:'dodgedTrap',mark:'◎ 罠をかわした',delta:0,cls:'good',steps:[{face:'wake',t:W.dodge[0]},{face:'win',open:true,t:T(W.dodge[1])}],
      reason:'たぬき寝入りを見ぬいた。強い手で、賭けを待っていた',alt:`賭けていたら −${s.N*U}`});
  }
  const keyTxt=`${d.key} で ${herNm}`;
  if(st.act==='bet'){
    const n=left*U;
    if(ahead){
      let alt='';
      if(s.id===6){alt=k===1?`もう1枚見ていたら ＋${(left-1)*U}`:k===2?`1枚で賭けていたら ＋${(left+1)*U}`:'';}
      else if(k>0)alt=`見ないで賭けていれば ＋${N*U}`;
      return R({kind:'paid',mark:'◎ 寝ぼけて払わせた',delta:n,cls:'good',
        steps:[{face:'sleep',t:T(W.pay),coins:true},{face:'lose',open:true,t:T(W.lost[0])},{face:'lose',t:T(W.lost[1]||'')}].filter(z=>z.t||z.open),
        reason:`${whoIs}。${minNm}で勝ち。泡 ${left}つ分を払わせた`,alt});
    }
    const why=k===0?'のぞけば分かった':d.g[Math.min(k,2)].pB===1?'真っ赤の時は、賭けない':'赤が残っていた。もう1枚のぞけば分かった';
    return R({kind:'lostbet',mark:'✕ 負けに賭けた',delta:-n,cls:'bad',
      steps:[{face:'sleep',t:T(W.pay),coins:true},{face:'win',open:true,t:T(W.won[0])},...(W.won[1]?[{face:'win',t:T(W.won[1])}]:[])],
      reason:`${whoIs}。${minNm}では負け。${why}`});
  }
  if(woke){
    if(ahead)return R({kind:'woke',mark:'△ 起こしてしまった',delta:0,cls:'warn',steps:[{face:'wake',open:true,t:T(W.wokeMimi)}],
      reason:'泡がぜんぶ割れて、起きた。寝ぼけて払ってはくれない',alt:`泡を残して賭けていれば ＋${U}`});
    return R({kind:'wokeSafe',mark:'◎ かわした',delta:0,cls:'good',steps:[{face:'win',open:true,t:T(W.wokeHer)}],reason:`${keyTxt}。負けていた。賭けなくて正解`});
  }
  if(!ahead)return R({kind:'dodge',mark:'◎ かわした',delta:0,cls:'good',steps:[{face:'win',open:true,t:T(W.foldHer)}],
    reason:`${keyTxt}。${minNm}より上。賭けなくて正解`,alt:`賭けていたら −${left*U}`});
  return R({kind:'miss',mark:'△ 払わせそこねた',delta:0,cls:'warn',steps:[{face:'lose',open:true,t:T(W.foldMimi)}],
    reason:`${whoIs}。賭けていれば、寝ぼけて払ってくれた`,alt:`賭けていれば ＋${left*U}`});
}
const CARD4=[['目的','寝落ちした相手が寝ぼけているうちに、|賭けて払わせる。負けていそうなら、賭けない。'],['やり方','「のぞく」を長押しで、伏せ札を1枚見る。|それから「賭ける」か「賭けない」。'],['危なさ','1枚のぞくたびに泡が1つ割れて、賭けられる額が|300 へる。負けている時に賭けると、取られる。'],['見る物','赤い目盛り（ミミが負ける見込み）と、|泡の数。']];
const DEMO_COACH={
 s1:'寝ちゃった。賭ければ寝ぼけて払ってくれる。|でも赤が多い。ミミは 2 のペア。負けてるかも',
 s2:'のぞくと、泡が1つ割れる。|赤は減ったけど、まだ多い。もう1枚',
 s3:'赤が消えた。ミミの勝ち。泡はあと1つ。|これが割れたら起きちゃう。賭けよう',
 s4:'のぞかず賭けたら 900。でも負けたら 900 取られる。|見るかどうかは、赤と泡で決めるの'};
return{TITLE,UNIT:U,demo,scenes,WHO,outcome,sgn,CARD4,DEMO_COACH,sub};
})();
