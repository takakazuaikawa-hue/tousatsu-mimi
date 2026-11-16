// お手本→6場面→結果を実際に押して遊び、各画面を撮って測る。長押しは本当に押したまま待つ。
// node qa/h1nozoki/play.mjs [幅] [高さ] [速さ] [各場面の手 p=のぞく f=賭けない b=賭ける を並べる ,区切り]
//   省略時：pf,b,ppf,f,b,pb（おすすめの手順）。たとえば pb,pp,pf,p,p,ppb なら、起こす・見つかる・見すぎ、が出る
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
import fs from 'node:fs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), SP = +(process.argv[4] || 3);
const PLANS = (process.argv[5] || 'pf,b,ppf,f,b,pb').split(',');
const tag = `${W}x${H}` + (process.argv[6] ? '_' + process.argv[6] : '');
const OUT = 'qa/out/h1nozoki'; fs.mkdirSync(OUT, { recursive: true });
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: W, height: H });
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport(W, H, W < 1000);
  const errs = []; page.on('Runtime.exceptionThrown', p => errs.push(JSON.stringify(p.exceptionDetails).slice(0, 500)));
  await page.addInit(`(()=>{const S=${SP};const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
  await page.send('Animation.enable').catch(() => {}); await page.send('Animation.setPlaybackRate', { playbackRate: SP }).catch(() => {});
  await page.goto(`http://127.0.0.1:${server.port}/qa/h1nozoki/h1nozoki.html?reset=1`, 60000);
  const phase = () => page.eval('H1NOZOKI.phase');
  const shot = async n => { await page.screenshot(`${OUT}/${tag}_${n}.png`); console.log('shot', n); };
  async function waitPhase(re, to = 90000) { const t0 = Date.now(); for (;;) { const p = await phase(); if (re.test(p)) return p; if (Date.now() - t0 > to) throw new Error('timeout ' + re + ' now ' + p); await sleep(40); } }
  const center = async sel => {
    const r = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const r=rs[rs.length-1];const e=r.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2,b.width,b.height]})()`);
    if (!r) throw new Error('no ' + sel); return r;
  };
  async function clickSel(sel) { const r = await center(sel); await page.click(r[0], r[1]); return r; }
  const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  const meas = [];
  const measure = async label => {
    const m = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const root=rs[rs.length-1];const sc=H1NOZOKI.scale();let minF=99,minEl='';const bad=[];const br=document.getElementById('board').getBoundingClientRect();
      const hidden=e=>{let p=e;while(p&&p!==root){const c=getComputedStyle(p);if(c.display==='none'||+c.opacity<0.05||c.visibility==='hidden')return true;p=p.parentElement;}return false;};
      root.querySelectorAll('*').forEach(e=>{if(hidden(e))return;
        const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
        const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const f=parseFloat(cs.fontSize);
        if(!e.closest('.cd')&&!e.closest('.bub')&&f<minF){minF=f;minEl=e.className+':'+e.textContent.slice(0,10);}
        if(!e.closest('.pk')&&e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&cs.display!=='inline')bad.push('clipX:'+e.className+':'+e.textContent.slice(0,14));
        if(!e.closest('.cd')&&!e.closest('.pk')&&e.scrollHeight>e.clientHeight+3&&e.clientHeight>0&&cs.display!=='inline')bad.push('clipY:'+e.className+':'+e.textContent.slice(0,14));
        if(r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1||r.top<br.top-1)bad.push('out:'+e.className+':'+e.textContent.slice(0,14));});
      const boxes=[];root.querySelectorAll('.ins,.rule,.reason,.speech,.chip,.rsay,.opts button,.go,.skip,.tbtn,.rib,.askrico,.glab,.gend,.zz,.marks i').forEach(e=>{if(hidden(e))return;if(!(e.textContent||'').trim())return;const r=e.getBoundingClientRect();if(r.width&&r.height)boxes.push([e,r]);});
      for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i][1],b=boxes[j][1];
        const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(ox>4&&oy>4&&!boxes[i][0].contains(boxes[j][0])&&!boxes[j][0].contains(boxes[i][0]))bad.push('overlap:'+boxes[i][0].className.slice(0,14)+'|'+boxes[j][0].className.slice(0,14)+' '+(ox/sc).toFixed(0)+'x'+(oy/sc).toFixed(0));}
      const small=[];root.querySelectorAll('button').forEach(b=>{if(hidden(b))return;const r=b.getBoundingClientRect();if(r.height/sc<51.5)small.push(b.className+' h='+(r.height/sc).toFixed(0));});
      return {minFontInBoard:minF,minEl,minFontOnScreen:+(minF*sc).toFixed(1),bad:bad.slice(0,10),smallButtons:small}})()`);
    m.label = label; meas.push(m);
    if (m.bad.length || m.smallButtons.length || m.minFontInBoard < 18) console.log('MEAS', JSON.stringify(m));
  };
  async function hold(label, midShot) {   // 押したまま待って、めくり切る。離す
    const r = await center('.pk'); const k0 = await page.eval('H1NOZOKI.state().k');
    await mouse('mouseMoved', r[0], r[1]); await mouse('mousePressed', r[0], r[1]);
    if (midShot) { await sleep(300); await shot(label + '_hold30'); await sleep(250); await shot(label + '_hold55'); await measure(label + '_hold'); await sleep(250); await shot(label + '_hold80'); }
    for (let i = 0; i < 80; i++) { const k = await page.eval('H1NOZOKI.state().k'); if (k !== k0 || /-reveal/.test(await phase())) break; await sleep(40); }
    await sleep(120); await shot(label + '_burst');
    await sleep(500); await shot(label + '_after'); await measure(label + '_after');
    await mouse('mouseReleased', r[0], r[1]); await sleep(300);
  }
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
    await waitPhase(new RegExp(`^s${i}-sleep$`)); await sleep(700 / SP); await shot(`s${i}_sleep1`);
    await sleep(1400 / SP); await shot(`s${i}_sleep2`);
    await waitPhase(new RegExp(`^s${i}-pick$`)); await sleep(900 / SP + 250);
    await shot(`s${i}_pick`); await measure(`s${i}_pick`);
    if (i <= 2) { await clickSel('.askrico'); await sleep(400); await shot(`s${i}_rico`); await measure(`s${i}_rico`); await clickSel('.rico .rsay'); await sleep(300); }
    const plan = PLANS[i - 1]; let n = 0;
    for (const ch of plan) {
      if (ch === 'p') {
        n++;
        if (i === 1 && n === 1) {   // 途中で離す→戻る（何も起きない）
          const r = await center('.pk'); await mouse('mouseMoved', r[0], r[1]); await mouse('mousePressed', r[0], r[1]); await sleep(350); await shot('s1_abort_hold');
          await mouse('mouseReleased', r[0], r[1]); await sleep(500); await shot('s1_abort_after'); console.log('abort state', JSON.stringify(await page.eval('H1NOZOKI.state()')));
        }
        await hold(`s${i}_peek${n}`, i === 1 && n === 1 || (i === 4));
        if (/-reveal/.test(await phase())) break;
        await measure(`s${i}_peek${n}`);
      } else if (ch === 'b') { await shot(`s${i}_prebet`); await clickSel('.shw'); }
      else if (ch === 'f') { await shot(`s${i}_prefold`); await clickSel('.hide'); }
    }
    const seenR = new Set();
    for (;;) {
      const p = await phase();
      if (new RegExp(`^s${i}-reveal`).test(p) && !seenR.has(p)) {
        seenR.add(p); await sleep(450 / SP); await shot(`s${i}_${p.replace(/^s\d-/, '')}`); await measure(`s${i}_${p}`);
      }
      if (p === `s${i}-done`) break;
      await sleep(15);
    }
    await sleep(500 / SP);
    await shot(`s${i}_done`); await measure(`s${i}_done`);
    await clickSel('.go');
  }
  await waitPhase(/^result$/); await sleep(500); await shot('result'); await measure('result');
  await clickSel('.rb[data-r=again]');
  await waitPhase(/^s1-pick$/); await sleep(300);
  await clickSel('.tbtn'); await sleep(600); await shot('replay_open');
  await clickSel('.skip'); await waitPhase(/^demo-card4$/); await sleep(300); await shot('replay_card4'); await clickSel('.pgo'); await sleep(400);
  const v = await page.eval('new Promise(r=>{const f=()=>H1NOZOKI.verifyResult?r(H1NOZOKI.verifyResult.map(v=>({id:v.id,ok:v.ok,cells:v.cells,chips:v.chips,her:v.her,mimi:v.mimi}))):setTimeout(f,300);f();})', 30000);
  console.log('verify', JSON.stringify(v));
  console.log('log', await page.eval('JSON.stringify(H1NOZOKI_LOG)'));
  console.log('summary', JSON.stringify(meas.map(m => [m.label, m.minFontInBoard, m.minFontOnScreen, m.bad.length, m.smallButtons.length])));
  console.log('errors', errs.join('\n') || 'none', await page.eval('H1NOZOKI.error||""'));
} catch (e) { console.error('FAIL', e); code = 1; }
await browser.close(); await server.close();
process.exit(code);
