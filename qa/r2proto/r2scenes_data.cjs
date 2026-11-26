const M=(n,size,say)=>({n,who:'mimi',size,say}); const G=(n)=>({n,who:'grano'});
const scenes=[
 {id:1,mine:'Kd 8s',board:'Ks 8d 4c 2h 6s',pot:600,hist:[M(3,1,'tight'),M(4,1,'tight')],her:'4h 10h'},
 {id:2,mine:'9s 9h',board:'Qh 9c 3d 5s 2c',pot:900,hist:[M(3,1,'cheap'),M(4,2,'tight')],her:'Qd Jc'},
 {id:3,mine:'Ks Qs',board:'10s 9d 4c Jh 2d',pot:900,hist:[M(3,1,'cheap'),M(4,2,'cheap')],her:'10h 10d'},
 {id:4,mine:'7s 7h',board:'Kc 7d 3s 9h Ad',pot:900,hist:[M(3,1,'cheap'),M(4,2,'tight')],her:'Kh Jd'},
 {id:5,mine:'8s 8d',board:'Qh 8h 3c 6s 2d',pot:1200,hist:[M(3,2,'tight'),M(4,2,'tight')],her:'Ah 10h'},
 {id:6,mine:'As Ad',board:'Jc 7d 4s 9h 2c',pot:600,hist:[M(3,1,'tight'),M(4,1,'tight')],her:'2h 2d'},
 {id:7,mine:'As Ad',board:'Ah 10h 6c 3s 8h',pot:1200,hist:[M(3,2,'tight'),M(4,2,'tight')],her:'Kh Jh'},
 {id:8,mine:'9h 8h',board:'9s 8d 3c 4h Kd',pot:600,hist:[M(3,1,null),G(4)],her:'9d 4d'},
];
scenes.push({id:0,mine:'Js Jh',board:'Ac Jd 5s 8h 3d',pot:600,hist:[M(3,1,'cheap'),M(4,2,'tight')],her:'Ah 9h'});
module.exports=scenes;
