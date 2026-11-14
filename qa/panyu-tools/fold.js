// 頂点の動かし方（シェーダーと同じ式）で網目を動かし、裏返る三角形・極端に潰れる三角形を数える
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const CUPS=[[607,600],[795,600]], R=132;
function cup(p,c,d,s){const q=[p[0]-c[0],p[1]-c[1]];const rr=Math.hypot(q[0]/(R*1.12),q[1]/R);
 const w=1-sm(0.08,1.0,rr);const t=Math.min(1,Math.max(0,(q[1]+R*0.95)/(R*1.7)));let a=0.18+0.82*t*t*(3-2*t);
 const m=Math.min(1,Math.max(0,-d[1]/R*2.5));a=a*(1-m)+(0.7+0.3*a)*m;
 const k=w*(0.35+0.65*a);return [d[0]*w*a+q[0]*(s[0]-1)*k, d[1]*w*a+q[1]*(s[1]-1)*k];}
function check(D0,S0,D1,S1){let flip=0,squash=0,n=0;const st=4;
 const map=(x,y)=>{const a=cup([x,y],CUPS[0],D0,S0),b=cup([x,y],CUPS[1],D1,S1);return [x+a[0]+b[0],y+a[1]+b[1]];};
 for(let y=420;y<788;y+=st)for(let x=430;x<980;x+=st){const p=map(x,y),px=map(x+st,y),py=map(x,y+st);
  const det=((px[0]-p[0])*(py[1]-p[1])-(px[1]-p[1])*(py[0]-p[0]))/(st*st);n++;if(det<=0)flip++;else if(det<0.15)squash++;}
 return {裏返り:flip,潰れすぎ:squash,全体:n};}
const cases={
 '下に128＋縦1.4／上に128＋横広がり':[[0,128],[1/Math.sqrt(1.4),1.4],[0,-128],[Math.pow(0.65,-0.75)*(1+128/132*0.25),0.65]],
 '下に100':[[0,100],[0.85,1.38],[0,0],[1,1]],
 '上に100':[[0,-100],[1.3,0.7],[0,0],[1,1]],
 '外へ横130':[[-130,0],[1,1],[130,0],[1,1]],
 '内へ横130（ぶつかる）':[[130,0],[1,1],[-130,0],[1,1]],
 '斜め110':[[-78,78],[0.9,1.25],[78,-78],[1.1,0.8]],
};
for(const [k,v] of Object.entries(cases))console.log(k.padEnd(22),JSON.stringify(check(...v)));
