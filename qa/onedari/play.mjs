// お手本→6場面→結果を実際に押して遊び、各画面を撮って測る。
// node qa/onedari/play.mjs [幅] [高さ] [速さ] [各場面の選び c,f,...]
//   選び：c＝払う f＝降りる（省略時は、4通りの明かし（見やぶった・かわした・だまされた・つかまった）が全部出る並び）
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
import fs from 'node:fs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), SP = +(process.argv[4] || 3);
const PICKS = (process.argv[5] || 'f,c,f,c,f,c').split(',');
const tag = `${W}x${H}`;
const OUT = 'qa/onedari/shots'; fs.mkdirSync(OUT, { recursive: true });
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: W, height: H });
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport(W, H, W < 1000);
  const errs = []; page.on('Runtime.exceptionThrown', p => errs.push(JSON.stringify(p.exceptionDetails).slice(0, 500)));
  await page.addInit(`(()=>{const S=${SP};const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
  await page.send('Animation.enable').catch(() => {}); await page.send('Animation.setPlaybackRate', { playbackRate: SP }).catch(() => {});
  await page.goto(`http://127.0.0.1:${server.port}/qa/onedari/onedari.html?reset=1`, 60000);
  const phase = () => page.eval('ONEDARI.phase');
  const shot = async n => { await page.screenshot(`${OUT}/${tag}_${n}.png`); console.log('shot', n); };
  async function waitPhase(re, to = 90000) { const t0 = Date.now(); for (;;) { const p = await phase(); if (re.test(p)) return p; if (Date.now() - t0 > to) throw new Error('timeout ' + re + ' now ' + p); await sleep(40); } }
  async function clickSel(sel) {
    const r = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const r=rs[rs.length-1];const e=r.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2,b.width,b.height]})()`);
    if (!r) throw new Error('no ' + sel);
    await page.click(r[0], r[1]); return r;
  }
  const meas = [];
  const measure = async label => {
    const m = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const root=rs[rs.length-1];const sc=ONEDARI.scale();let minF=99,minEl='';const bad=[];const br=document.getElementById('board').getBoundingClientRect();
      const pOn=!!root.querySelector('.panel.on');const hidden=e=>{if(pOn&&!e.closest('.panel'))return true;let p=e;while(p&&p!==root){const c=getComputedStyle(p);if(c.display==='none'||+c.opacity<0.05||c.visibility==='hidden')return true;p=p.parentElement;}return false;};
      root.querySelectorAll('*').forEach(e=>{if(hidden(e))return;
        const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
        const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const f=parseFloat(cs.fontSize);
        if(!e.closest('.cd')&&f<minF){minF=f;minEl=e.className+':'+e.textContent.slice(0,10);}
        if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&cs.display!=='inline')bad.push('clipX:'+e.className+':'+e.textContent.slice(0,14));
        if(!e.closest('.cd')&&e.scrollHeight>e.clientHeight+3&&e.clientHeight>0&&cs.display!=='inline')bad.push('clipY:'+e.className+':'+e.textContent.slice(0,14));
        if(r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1||r.top<br.top-1)bad.push('out:'+e.className+':'+e.textContent.slice(0,14));});
      // 文字の箱どうしの重なり
      const boxes=[];root.querySelectorAll('.ins,.rule,.reason,.speech,.chip,.rsay,.opts button,.go,.skip,.tbtn,.rib,.askrico,.who,.tick,.stamp,.pl .pi').forEach(e=>{if(hidden(e))return;if(!(e.textContent||'').trim())return;const r=e.getBoundingClientRect();if(r.width&&r.height)boxes.push([e,r]);});
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i][1],b=boxes[j][1];
        const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(ox>4&&oy>4&&!boxes[i][0].contains(boxes[j][0])&&!boxes[j][0].contains(boxes[i][0]))bad.push('overlap:'+boxes[i][0].className.slice(0,14)+'|'+boxes[j][0].className.slice(0,14)+' '+(ox/sc).toFixed(0)+'x'+(oy/sc).toFixed(0));}
      // 文字の箱と札（見えている札）の重なり
      const cards=[];root.querySelectorAll('.bd .cd,.hc0,.hc1,.mc .cd,.lineup .cd').forEach(e=>{if(hidden(e))return;const r=e.getBoundingClientRect();if(r.width)cards.push([e,r]);});
      boxes.forEach(([be,a])=>{if(be.matches('.rib,.who,.tbtn,.skip'))return;cards.forEach(([ce,b])=>{const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(ox>6&&oy>6&&!be.matches('.speech'))bad.push('textOnCard:'+be.className.slice(0,14)+'|'+ce.className.slice(0,14)+' '+(ox/sc).toFixed(0)+'x'+(oy/sc).toFixed(0));});});
      const small=[];root.querySelectorAll('button').forEach(b=>{if(hidden(b))return;const r=b.getBoundingClientRect();if(r.height/sc<51.5)small.push(b.className+' h='+(r.height/sc).toFixed(0));});
      return {minFontInBoard:minF,minEl,minFontOnScreen:+(minF*sc).toFixed(1),bad:bad.slice(0,10),smallButtons:small}})()`);
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
      await sleep(p === 'demo-0' ? 100 : (p === 'demo-4' ? 800 / SP : 500 / SP));
      await shot(p); await measure(p);
    }
    if (p === 'demo-card4') break;
    await sleep(15);
  }
  await clickSel('.pgo');
  for (let i = 1; i <= 6; i++) {
    await waitPhase(new RegExp(`^s${i}-`)); if (i === 1) { await sleep(150); await shot('s1_intro'); }
    await waitPhase(new RegExp(`^s${i}-say$`)); await sleep(1100 / SP); await shot(`s${i}_say`); await measure(`s${i}_say`);
    await waitPhase(new RegExp(`^s${i}-flip$`)); await sleep(1300 / SP); await shot(`s${i}_flip`); await measure(`s${i}_flip`);
    await waitPhase(new RegExp(`^s${i}-pick$`)); await sleep(900 / SP + 250);
    await shot(`s${i}_pick`); await measure(`s${i}_pick`);
    const pick = PICKS[i - 1];
    if (i <= 3) { await clickSel('.askrico'); await sleep(400); await shot(`s${i}_rico`); await measure(`s${i}_rico`); await clickSel('.rico .rsay'); await sleep(300); }
    await clickSel(pick === 'c' ? '.pay' : '.fold');
    const seenR = new Set();
    for (;;) {
      const p = await phase();
      if (new RegExp(`^s${i}-reveal`).test(p) && !seenR.has(p)) {
        seenR.add(p); await sleep(450 / SP); await shot(`s${i}_${p.replace(/^s\d-/, '')}_${pick}`); await measure(`s${i}_${p}`);
      }
      if (p === `s${i}-done`) break;
      await sleep(15);
    }
    await sleep(500 / SP);
    await shot(`s${i}_done`); await measure(`s${i}_done`);
    await clickSel('.go');
  }
  await waitPhase(/^result$/); await sleep(500); await shot('result'); await measure('result');
  // お手本をもう一度（右上のボタンから）
  await clickSel('.rb[data-r=again]');
  await waitPhase(/^s1-say$/); await sleep(300);
  await clickSel('.tbtn'); await sleep(600); await shot('replay_open');
  await clickSel('.skip'); await waitPhase(/^demo-card4$/); await sleep(300); await shot('replay_card4'); await clickSel('.pgo'); await sleep(400);
  console.log('verify', JSON.stringify(await page.eval('ONEDARI.verifyResult.map(v=>({id:v.id,ok:v.ok,answer:v.answer,hit:v.hit,who:v.who,her:v.her,mimi:v.mimi,fin:v.fin}))')));
  console.log('log', await page.eval('JSON.stringify(ONEDARI_LOG)'));
  console.log('summary', JSON.stringify(meas.map(m => [m.label, m.minFontInBoard, m.minFontOnScreen, m.bad.length, m.smallButtons.length])));
  console.log('errors', errs.join('\n') || 'none', await page.eval('ONEDARI.error||""'));
} catch (e) { console.error('FAIL', e); code = 1; }
await browser.close(); await server.close();
process.exit(code);
