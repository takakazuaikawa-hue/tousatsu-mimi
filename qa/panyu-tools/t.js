const S=require('./sim.js');
function test(name,rate,n,x,y){const taps=[];for(let k=0;k<n;k++)taps.push([k/rate,0,x,y]);const T=n/rate;const r=S.runTaps(taps,T+1.5);
 const seg=(a,b)=>r.filter(v=>v[0]>=a&&v[0]<b);const mm=(arr,i)=>{const v=arr.map(q=>q[i]);return Math.min(...v).toFixed(i==1||i==4?0:2)+'〜'+Math.max(...v).toFixed(i==1||i==4?0:2);};
 const w=(a,b)=>{const s=seg(a,b);return '縦'+mm(s,1)+' 横'+mm(s,4)+' 伸縮'+mm(s,2);};
 console.log(name.padEnd(10),'| 最初の1秒',w(0,1),'| 最後の1秒',w(Math.max(0,T-1),T),'| 熱',S.M.heatNow().toFixed(2));}
S.reset();test('1回',1,1,607,560);
S.reset();test('ゆるい2回/秒',2,8,607,560);
S.reset();test('ふつう4回/秒',4,16,607,560);
S.reset();test('速い7回/秒',7,28,607,560);
S.reset();test('速い下',7,28,607,706);
S.reset();test('速い外側',7,28,495,600);
S.reset();test('速い上',7,28,607,494);
