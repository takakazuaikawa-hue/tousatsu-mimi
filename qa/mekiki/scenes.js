// 固定の6場面とお手本（仕様 §4-B・§5-4）。印は手で書かず engine.js の計算から出す。
const MK_SCENES=(function(){
const o=(label,key,why)=>({label,key,why});
const demo={id:'demo',name:'お手本',board:'Ac 7d 4s 9h 2d',hole:'Ah Js',ans:0,
  opts:[o('A のペア','pairA','A で|のぞいた'),o('9 のペア','pair9','9 で|のぞいていない'),o('役なし','none','A で|のぞいた')],expectPins:[0]};
const scenes=[
 {id:1,name:'場面1 印が1つ',board:'8s 3d Qh 5c 2s',hole:'Qd Tc',ans:0,expectPins:[2],coach:'のぞいたのは Q だけ。|Q で役ができたんだね',
  opts:[o('Q のペア','pairQ','Q で|のぞいた'),o('8 のペア','pair8','8 で|のぞいていない'),o('役なし','none','Q で|のぞいた')]},
 {id:2,name:'場面2 印なし',board:'Kh Ts 6d 3c 8h',hole:'Ad Jc',ans:2,expectPins:[],coach:'1回ものぞかなかったね。|役ができた札は、無かったってこと',
  hitLine:'……空箱とは、お恥ずかしい。|お見通しですな',
  opts:[o('K のペア','pairK','K で|のぞいていない'),o('♥のフラッシュ','flushh','♥は場に|2枚だけ'),o('役なし','none','1回も|のぞかなかった')]},
 {id:3,name:'場面3 3枚目の♥に印',board:'Ks 9h 4h 2h 7c',hole:'Ah Jh',ans:1,expectPins:[3],
  opts:[o('K のペア','pairK','K で|のぞいていない'),o('♥のフラッシュ','flushh','3枚目の♥で|のぞいた'),o('ストレート','straight','並ぶ数字が|足りない')]},
 {id:4,name:'場面4 ♥3枚でも印は J',board:'Js 8h 3h 6h Kd',hole:'Jd Tc',ans:2,expectPins:[0],
  opts:[o('♥のフラッシュ','flushh','3枚目の♥は|のぞいてない'),o('K のペア','pairK','K で|のぞいていない'),o('J のペア','pairJ','J で|のぞいた')]},
 {id:5,name:'場面5 印が2つ',board:'Kd 6c 3s 9h 2c',hole:'Kc 9d',ans:1,expectPins:[0,3],
  opts:[o('K のペア','pairK','9 でも|のぞいた'),o('K と 9 のツーペア','twoK9','2回のぞいた|ペアが2つ'),o('9 のスリーカード','trips9','K でも|のぞいた')]},
 {id:6,name:'場面6 並びの最後に印',board:'6s 7d Jh 9c 2d',hole:'8h Ts',ans:0,expectPins:[3],
  opts:[o('ストレート','straight','6・7・9＋|手札の8・10'),o('J のペア','pairJ','J で|のぞいていない'),o('♦のフラッシュ','flushd','♦は場に|2枚だけ')]},
];
return{demo,scenes};
})();
