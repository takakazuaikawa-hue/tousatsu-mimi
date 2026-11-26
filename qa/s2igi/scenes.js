// 固定の6場面とお手本（仕様 §3-4・§4）。枠・光る札・数は engine.js の計算から出す。
// ans: 'X'＝異議あり（この場札では作れない）／'O'＝作れる。cat: 5=フラッシュ 4=ストレート 6=フルハウス
const S2_SCENES=(function(){
const CATN={5:'フラッシュ',4:'ストレート',6:'フルハウス'};
const demo={id:'demo',name:'お手本 フラッシュ',board:'Ks 9h 4h 2c 7d',polka:'Qh 6h',mimi:'Ad Jc',cat:5,ans:'X',
  bet:300,claim:'降りたほうがいいよ〜|フラッシュだもん♪',reason:'♥は場に2枚だけ。|3枚ないと、フラッシュは作れない',
  why:['な、なんで|分かったの〜！？','♥、4枚までは|あったんだよ〜！']};
const scenes=[
 {id:1,name:'場面1 フラッシュ（2枚と2枚）',board:'As Th 7s 5h 3d',polka:'Ks 8s',mimi:'Ah Jd',cat:5,ans:'X',
  bet:300,claim:'降りたほうがいいよ〜|フラッシュだもん♪',reason:'同じマークは、多くても2枚。|3枚ないと、フラッシュは作れない',
  why:['な、なんで|分かったの〜！？','♠、4枚までは|あったんだよ〜！'],coach:'同じマークを数えてみて。|3枚ある？'},
 {id:2,name:'場面2 フラッシュ（3枚ある）',board:'Qc 9d 8c 4s 2c',polka:'Kc 5c',mimi:'Ad Qh',cat:5,ans:'O',
  bet:400,claim:'まだ付いてくる？|フラッシュだよ？',reason:'♣が場に3枚。|手札が♣2枚なら、フラッシュは作れる',
  coach:'♣が3枚あるね。枠は全部埋まる。|ウソとは言えないよ'},
 {id:3,name:'場面3 ストレート（とびとび）',board:'9d Ks 5c 7h 2s',polka:'8d 4c',mimi:'Kd Jc',cat:4,ans:'O',
  bet:300,claim:'やめときなって〜|ストレートなんだから',reason:'5・7・9 のすき間は 6 と 8。|手札2枚で埋まる'},
 {id:4,name:'場面4 フルハウス（こわい場）',board:'Jh Th 9h 6s 2d',polka:'Js Tc',mimi:'Ac Kd',cat:6,ans:'X',
  bet:500,claim:'降りて〜！|フルハウスだよ！',reason:'同じ数字3枚＋2枚。場に同じ数字が|2枚ないと作れない。この場にペアは無い',
  why:['な、なんで|分かったの〜！？','ペアが2つあったから、|つい……！']},
 {id:5,name:'場面5 ストレート（並びが2組）',board:'6c 7d Js Qh 2d',polka:'9s 8c',mimi:'Ah Qd',cat:4,ans:'X',
  bet:400,claim:'こんどは本気！|ストレートだもん',reason:'5つ続きの中に入る場札は、|どこを取っても2枚まで',
  why:['な、なんで|分かったの〜！？','あと1枚で、|ほんとだったのに〜！']},
 {id:6,name:'場面6 フルハウス（おとなしい場）',board:'2c 2d 9s Kh 5d',polka:'Ks 2h',mimi:'As 9c',cat:6,ans:'O',
  bet:500,claim:'今度こそ降りて〜|フルハウスなの！',reason:'場に 2 が2枚。手札に 2 と K が|あれば、フルハウスは作れる'},
];
const demoAfter={board:'Qc 9d 8c 4s 2c'};
const LINES={
  ok_O:['でしょ〜？|ちゃんと作れるもん♪','だから、降りたほうが|いいってば〜'],
  miss_X:['ざんねーん！|ちゃんと作れるもんね〜！','ミミちゃんの札、|1枚 見〜せて♪'],
  miss_O:['……ぷぷっ。信じた？|いまの、盛っちゃった♪'],
};
return{demo,scenes,demoAfter,LINES,CATN};
})();
