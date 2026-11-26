// お手本と固定の6場面（仕様 §4-5・§5）。顔・口がすべる役・光る場札・正解は engine.js の計算から出す。
// expect は仕様の表（s1check.js と同じ）。ページの中で計算と食い違わないかを確かめるための物。
const S1_SCENES=(function(){
const demo={id:'お手本',board:'Ks 9d 6c 4h 2s',mimi:'9s 8s',polka:'Qh Jh',expect:{face:'あわてる',say:null,ans:'払う'}};
const scenes=[
 {id:1,name:'場面1',board:'Ah Th 7c 4h 2d',mimi:'Ac Td',polka:'Kh 8h',guided:true,expect:{face:'にやける',say:'フラッシュ',ans:'降りる'},
  coach:'にやけた。本物だよ。|{F}って言っちゃったね。|ミミは{M}。はしごで、どっちが上？'},
 {id:2,name:'場面2',board:'Kd 9c 6s 3h 2c',mimi:'6d 6h',polka:'Kc 9d',guided:true,expect:{face:'にやける',say:'ツーペア',ans:'払う'},
  coach:'にやけた。でも、言ったのは{F}。|ミミは{M}。……|ポルカは、{F}でも大よろこびなの'},
 {id:3,name:'場面3',board:'Qs Js 8s 5d 3c',mimi:'5h 4h',polka:'Kd 9d',expect:{face:'あわてる',say:null,ans:'払う'}},
 {id:4,name:'場面4',board:'9h 8c 7d Ks 2h',mimi:'Kh Kc',polka:'Jd Ts',expect:{face:'にやける',say:'ストレート',ans:'降りる'}},
 {id:5,name:'場面5',board:'6c 7c 8d Qc 2s',mimi:'Ac 4c',polka:'9h Td',expect:{face:'にやける',say:'ストレート',ans:'払う'}},
 {id:6,name:'場面6',board:'Jh Js 8h 4h 3d',mimi:'Ah 9h',polka:'Jd 8s',expect:{face:'にやける',say:'フルハウス',ans:'降りる'}},
];
const T={
  bet:['どーん！ 600！','……（すんっ）'],
  panic:'えっ、は、払うの……！？|ま、待って待って！',
  smug:'払って払って♪|だって {F} だもん！',
  oops:'……あっ',
  calm:'……（すんっ）',
};
const COACH_DEMO={
  l1:'ポルカ、すまし顔でがまんしてる。|払うふりで、チップを近づけてみよう',
  l2:'あわてたね。払われたら負ける手——|はったりだよ',
  l3:'ミミは {P}。はったりになら、|これで勝てる。払おう',
  l4:'もし にやけたら、本物。うれしくて、役まで言っちゃうよ。|その時は、ミミの役とくらべてね',
};
return{demo,scenes,T,COACH_DEMO};
})();
