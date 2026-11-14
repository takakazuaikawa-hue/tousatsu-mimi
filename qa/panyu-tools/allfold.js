process.env.SH='0';
const {check}=require(process.env.F3||'./f3.js');const S=require('./sim.js');
const tests=[['1回',1,1,607,560],['ゆるい',2,8,607,560],['ふつう',4,16,607,560],['速い',7,28,607,560],['速い下',7,28,607,706],['速い外側',7,28,495,600],['速い内側',7,28,700,600],['速い上',7,28,607,494],['左右交互',7,28,null,null]];
for(const [n,rate,cnt,x,y] of tests){S.reset();const taps=[];for(let k=0;k<cnt;k++)taps.push(x==null?[k/rate,k%2,k%2?795:607,560]:[k/rate,0,x,y]);
 const dt=1/60;let base=0;let worst=0,frames=0,bad=0;
 // runTaps を1コマずつ見たいので、ここで同じ処理を回す
 const T=cnt/rate+1.5;let k=0;S.reset();
 for(let t=0;t<T;t+=dt){ global.__now=t; while(k<taps.length&&taps[k][0]<=t){S.M.tap(taps[k][1],taps[k][2],taps[k][3]);k++;} for(let i=0;i<4;i++)S.M.step(dt/4);
  if(Math.round(t/dt)%2==0){const P=S.M.P;const R0=S.M.restOf(0),R1=S.M.restOf(1);const r=check([P[0].d[0]+R0[0],P[0].d[1]+R0[1]],[P[0].sx,P[0].sy],[P[1].d[0]+R1[0],P[1].d[1]+R1[1]],[P[1].sx,P[1].sy]);frames++;if(r.裏返り>0){bad++;worst=Math.max(worst,r.裏返り);}}}
 console.log(n.padEnd(6),'折れたコマ',bad+'/'+frames,'最悪',worst);}
