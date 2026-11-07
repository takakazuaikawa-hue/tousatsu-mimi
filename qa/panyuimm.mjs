// D15 没入モード：入り口・文字が出ないこと・衣装の切り替え・コントローラーのスティックで胸が動くか。node qa/panyuimm.mjs [WxH]   出力 qa/out/panyuimm/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const size = process.argv[2] || '844x390'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/panyuimm'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, homeStageSeen: 3, coins: 3000, ownedItems: ['pwear_vintage', 'pwear_gym'], loginBonus: { lastDate: '2099-01-01', streak: 1 } } });
const { page } = s; const shot = (n) => page.screenshot(path.join(OUT, `${size}_${n}.png`));
// 1) ぱにゅぱにゅの右上に「ずっと」
await page.eval(`(()=>{localStorage.setItem('mimi.panyuOutfit','bunny'); showPanyuClicker(30, ()=>({reward:30,mul:1,left:4}), { lobby: true }); return 1;})()`);
await sleep(5000); await shot('1_clicker');
console.log('tools', await page.eval(`JSON.stringify([...document.querySelectorAll('.pv2-tools button')].map(b=>{const r=b.getBoundingClientRect();return [b.className,b.textContent.trim(),Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),getComputedStyle(b).fontSize]}))`));
// 2) 押して没入へ
await page.eval(`document.querySelector('.pv2-imm').click()`);
await sleep(5500); await shot('2_imm');
console.log('imm', await page.eval(`(()=>{const o=document.querySelector('.pzi');const txt=[...o.querySelectorAll('*')].filter(e=>e.offsetParent&&e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>e.textContent.trim());return JSON.stringify({mesh:o.classList.contains('is-mesh'),frames:o.querySelectorAll('iframe').length,src:o.querySelector('iframe.pzi-mesh').getAttribute('src'),text:txt})})()`));
// 3) 触る（胸の上をタップ）→ ハート
const fr = await page.eval(`(()=>{const w=document.querySelector('iframe.pzi-mesh').contentWindow;const d=w.__panyuDbg;const v=d.view();return JSON.stringify(d.cups.map(c=>[v.ox+c[0]*v.s,v.oy+c[1]*v.s]))})()`);
const cups = JSON.parse(fr); console.log('cups', fr);
await page.eval(`(()=>{window.__m=[];addEventListener('message',e=>{if(e.data&&e.data.panyu)__m.push(e.data.t)});return 1})()`);
for (let k = 0; k < 14; k++) { await page.click(cups[k % 2][0], cups[k % 2][1] - 10); await sleep(90); }
await sleep(150); await shot('3_tap');
await page.click(cups[0][0], cups[0][1] - 10); await sleep(60);
console.log('hearts', await page.eval(`document.querySelectorAll('.pzi-heart').length+' all '+document.querySelectorAll('.pzi').length+' fr '+document.querySelectorAll('.pzi iframe').length+' msgs '+__m.join(',')+' top '+(document.elementFromPoint(${cups[0][0]},${cups[0][1]})||{}).className`));
// 4) コントローラー：左スティックを左下へ・右スティックを右上へ
await page.eval(`(()=>{const w=document.querySelector('iframe.pzi-mesh').contentWindow;const B=()=>({pressed:false,value:0});w.__pad={index:0,axes:[-1,0.6,0.9,-0.5],buttons:Array.from({length:17},B)};Object.defineProperty(w.navigator,'getGamepads',{value:()=>[w.__pad],configurable:true});w.dispatchEvent(new w.Event('gamepadconnected'));return 1})()`);
await sleep(700); await shot('4_stick');
console.log('grab', await page.eval(`(()=>{const P=document.querySelector('iframe.pzi-mesh').contentWindow.__panyuDbg.P;return JSON.stringify(P.map(p=>[p.grab&&Math.round(p.grab.dx),p.grab&&Math.round(p.grab.dy),Math.round(p.d[0]),Math.round(p.d[1])]))})()`));
await page.eval(`(()=>{const w=document.querySelector('iframe.pzi-mesh').contentWindow;w.__pad.axes=[0,0,0,0];return 1})()`);
await sleep(120); await shot('5_release');
console.log('released', await page.eval(`(()=>{const P=document.querySelector('iframe.pzi-mesh').contentWindow.__panyuDbg.P;return JSON.stringify(P.map(p=>[!!p.grab,Math.round(p.v[0]),Math.round(p.v[1])]))})()`));
// 5) 十字の右 → 次の衣装
await page.eval(`(()=>{const w=document.querySelector('iframe.pzi-mesh').contentWindow;w.__pad.buttons[15]={pressed:true,value:1};return 1})()`);
await sleep(300);
await page.eval(`(()=>{const w=[...document.querySelectorAll('iframe.pzi-mesh')][0].contentWindow;w.__pad.buttons[15]={pressed:false,value:0};return 1})()`);
await sleep(5000); await shot('6_next');
console.log('next', await page.eval(`JSON.stringify([...document.querySelectorAll('iframe.pzi-mesh')].map(f=>f.getAttribute('src').replace(/.*\?/,'')))`));
// 6) ×で抜ける
await page.eval(`document.querySelector('.pzi-x').click()`); await sleep(600);
console.log('closed', await page.eval(`!document.querySelector('.pzi')`));
// 7) 結果の札の「ずっと触る」
await page.eval(`(()=>{showPanyuClicker(1, ()=>({reward:30,mul:1,left:4}), { lobby: true }); return 1;})()`);
await sleep(4500); { const c = JSON.parse(await page.eval(`(()=>{const w=document.querySelector('iframe.pv2-mesh').contentWindow;const d=w.__panyuDbg;const v=d.view();return JSON.stringify(d.cups.map(c=>[v.ox+c[0]*v.s,v.oy+c[1]*v.s]))})()`)); await page.click(c[0][0], c[0][1] - 10); }
await sleep(4800); await shot('7_result');
console.log('result', await page.eval(`JSON.stringify([...document.querySelectorAll('.pv2-res-btns button')].map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim(),Math.round(r.width),Math.round(r.height),getComputedStyle(b).fontSize]}))`));
console.log('exceptions', JSON.stringify(s.exceptions));
await s.close(); process.exit(0);
