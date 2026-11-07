// とがる衣装を本編のぱにゅぱにゅで開いて、押し続けた後を撮る。node qa/panyutip.mjs <衣装> [WxH]   出力 qa/out/panyutip/
import fs from 'node:fs'; import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const id = process.argv[2] || 'gym', size = process.argv[3] || '1280x800'; const [W, H] = size.split('x').map(Number);
const OUT = path.resolve('qa/out/panyutip'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, homeStageSeen: 3, coins: 3000, ownedItems: ['pwear_gym', 'pwear_yshirt', 'pwear_tshirt'], loginBonus: { lastDate: '2099-01-01', streak: 1 } } });
const { page } = s;
await page.eval(`(()=>{try{localStorage.setItem('mimi.panyuOutfit', ${JSON.stringify(id)});}catch(_){}document.querySelectorAll('.panyu-clicker-overlay').forEach(o=>o.remove()); showPanyuClicker(30, ()=>{}, { lobby: true }); return 1;})()`);
await sleep(7000);
console.log(await page.eval(`JSON.stringify({mesh:!!document.querySelector('.panyu-clicker-overlay.is-mesh'), src:(document.querySelector('.pv2-mesh')||{}).src, outfit:(document.querySelector('.pv2-outfit b')||{}).textContent})`));
await page.screenshot(path.join(OUT, `${id}_${size}_0.png`));
// 網目のページの胸を24回押す
await page.eval(`(async()=>{const f=document.querySelector('.pv2-mesh');const w=f.contentWindow,d=w.document,st=d.getElementById('stage');const V=w.__panyuDbg.view();const c=w.__panyuDbg.cups||null;for(let k=0;k<24;k++){const p=k%2?[836,560]:[560,560];const x=V.ox+p[0]*V.s,y=V.oy+p[1]*V.s;st.dispatchEvent(new w.PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:5,bubbles:true}));st.dispatchEvent(new w.PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:5,bubbles:true}));await new Promise(r=>setTimeout(r,120));}return 1;})()`);
await sleep(4500);
await page.screenshot(path.join(OUT, `${id}_${size}_1.png`));
await s.close(); process.exit(0);
