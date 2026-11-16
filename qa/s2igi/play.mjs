// お手本→6場面→結果を実際に押して遊び、各画面を撮って測る。
// node qa/s2igi/play.mjs [幅] [高さ] [速さ] [まちがえる場面=1,2]  （1＝見逃す・2＝作れるのに異議を言う）
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
import fs from 'node:fs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), SP = +(process.argv[4] || 3);
const WRONG = (process.argv[5] || '1,2').split(',').map(Number);
const tag = `${W}x${H}`;
const OUT = 'qa/out/s2igi'; fs.mkdirSync(OUT, { recursive: true });
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: W, height: H });
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport(W, H, W < 1000);
  const errs = []; page.on('Runtime.exceptionThrown', p => errs.push(JSON.stringify(p.exceptionDetails).slice(0, 500)));
  await page.addInit(`(()=>{const S=${SP};const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
  await page.send('Animation.enable').catch(() => {}); await page.send('Animation.setPlaybackRate', { playbackRate: SP }).catch(() => {});
  await page.goto(`http://127.0.0.1:${server.port}/qa/s2igi/s2igi.html?reset=1`, 60000);
  const phase = () => page.eval('S2IGI.phase');
  const shot = async n => { await page.screenshot(`${OUT}/${tag}_${n}.png`); console.log('shot', n); };
  async function waitPhase(re, to = 90000) { const t0 = Date.now(); for (;;) { const p = await phase(); if (re.test(p)) return p; if (Date.now() - t0 > to) throw new Error('timeout ' + re + ' now ' + p); await sleep(40); } }
  async function clickSel(sel) {
    const r = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const r=rs[rs.length-1];const e=r.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2,b.width,b.height]})()`);
    if (!r) throw new Error('no ' + sel);
    await page.click(r[0], r[1]); return r;
  }
  const meas = [];
  const measure = async label => {
    const m = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const root=rs[rs.length-1];const sc=S2IGI.scale();let minF=99,minEl='';const bad=[];const br=document.getElementById('board').getBoundingClientRect();
      root.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return;let p=e,hid=false;while(p&&p!==root){const c=getComputedStyle(p);if(c.display==='none'||+c.opacity===0||c.visibility==='hidden'){hid=true;break;}p=p.parentElement;}if(hid)return;
        const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
        const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const f=parseFloat(cs.fontSize);if(f<minF){minF=f;minEl=e.className+':'+e.textContent.slice(0,10);}
        if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&cs.display!=='inline')bad.push('clipX:'+e.className+':'+e.textContent.slice(0,14));
        if(!e.closest('.cd,.sl,.opt')&&e.scrollHeight>e.clientHeight+3&&e.clientHeight>0&&cs.display!=='inline')bad.push('clipY:'+e.className+':'+e.textContent.slice(0,14));
        if(r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1||r.top<br.top-1)bad.push('out:'+e.className+':'+e.textContent.slice(0,14));});
      const small=[];root.querySelectorAll('button').forEach(b=>{let p=b,hid=false;while(p&&p!==root){const c=getComputedStyle(p);if(c.display==='none'||+c.opacity===0||c.visibility==='hidden'){hid=true;break;}p=p.parentElement;}if(hid)return;const r=b.getBoundingClientRect();if(r.height/sc<51.5)small.push(b.className+' h='+(r.height/sc).toFixed(0));});
      return {minFontInBoard:minF,minEl,minFontOnScreen:+(minF*sc).toFixed(1),bad:bad.slice(0,8),smallButtons:small}})()`);
    m.label = label; meas.push(m);
    if (m.bad.length || m.smallButtons.length || m.minFontInBoard < 18) console.log('MEAS', JSON.stringify(m));
  };
  await sleep(150);
  // お手本
  const seen = new Set();
  for (;;) {
    const p = await phase();
    if (/^demo-/.test(p) && !seen.has(p)) {
      seen.add(p);
      await sleep(p === 'demo-0' ? 100 : (p === 'demo-3' ? 900 / SP : (p === 'demo-4' ? 500 / SP : 400 / SP)));
      await shot(p.replace('-', '_')); await measure(p);
      if (p === 'demo-stop2') await sleep(100);
    }
    if (p === 'demo-card4') break;
    await sleep(15);
  }
  await clickSel('.pgo');
  for (let i = 1; i <= 6; i++) {
    await waitPhase(new RegExp(`^s${i}-`)); if (i === 1) { await sleep(150); await shot("s1_intro"); }
    await waitPhase(new RegExp(`^s${i}-claim$`)); await sleep(1100 / SP); await shot(`s${i}_claim`);
    await waitPhase(new RegExp(`^s${i}-pick$`)); await sleep(500 / SP + 150);
    await shot(`s${i}_pick`); await measure(`s${i}_pick`);
    if (i <= 2) { await clickSel('.askrico'); await sleep(400); await shot(`s${i}_rico`); await measure(`s${i}_rico`); await clickSel('.rico .rsay'); await sleep(300); }
    const ans = await page.eval(`S2IGI.ans[${i - 1}]`);
    const wrong = WRONG.includes(i);
    const tgt = wrong ? (ans === 'X' ? 'O' : 'X') : ans;
    await clickSel(`.opt[data-a="${tgt}"]`);
    if (tgt === "X") { await sleep(350 / SP); await shot(`s${i}_band`); await sleep(950 / SP); } else await sleep(1300 / SP);
    await shot(`s${i}_throw`);
    await sleep(2400 / SP); await shot(`s${i}_mid`);
    await waitPhase(new RegExp(`^s${i}-done$`)); await sleep(500 / SP);
    await shot(`s${i}_reveal`); await measure(`s${i}_reveal`);
    if (i < 6) await clickSel('.go');
  }
  await clickSel('.go');
  await waitPhase(/^result$/); await sleep(500); await shot('result'); await measure('result');
  // お手本をもう一度（右上のボタンから）
  await clickSel('.rb[data-r=again]');
  await waitPhase(/^s1-claim$/); await sleep(300);
  await clickSel('.tbtn'); await sleep(600); await shot('replay_open');
  await clickSel('.skip'); await waitPhase(/^demo-card4$/); await sleep(300); await shot('replay_card4'); await clickSel('.pgo'); await sleep(400);
  console.log('verify', JSON.stringify(await page.eval('S2IGI.verifyResult.map(v=>({n:v.name,ok:v.ok,makers:v.makers,fill:v.fill}))')));
  console.log('log', await page.eval('JSON.stringify(S2IGI_LOG)'));
  console.log('summary', JSON.stringify(meas.map(m => [m.label, m.minFontInBoard, m.minFontOnScreen, m.bad.length, m.smallButtons.length])));
  console.log('errors', errs.join('\n') || 'none', await page.eval('S2IGI.error||""'));
} catch (e) { console.error('FAIL', e); code = 1; }
await browser.close(); await server.close();
process.exit(code);
