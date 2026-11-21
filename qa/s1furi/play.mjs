// お手本→6場面→結果を実際に押して遊び、各画面を撮って測る。
// node qa/s1furi/play.mjs [幅] [高さ] [速さ] [まちがえる場面=1,2]  （選びを逆にする場面）
// 場面ごとの操作：山を軽く押す（1段ずつ）→顔を撮る→引きもどす→また押す→選ぶ。場面3・4は指で引きずる操作で動かす。
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
import fs from 'node:fs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), SP = +(process.argv[4] || 2);
const WRONG = (process.argv[5] || '').split(',').filter(Boolean).map(Number);
const SUF = process.argv[6] || '';
const tag = `${W}x${H}${SUF}`;
const OUT = 'qa/out/s1furi'; fs.mkdirSync(OUT, { recursive: true });
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: W, height: H });
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport(W, H, W < 1000);
  const errs = []; page.on('Runtime.exceptionThrown', p => errs.push(JSON.stringify(p.exceptionDetails).slice(0, 500)));
  await page.addInit(`(()=>{const S=${SP};const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
  await page.send('Animation.enable').catch(() => {}); await page.send('Animation.setPlaybackRate', { playbackRate: SP }).catch(() => {});
  await page.goto(`http://127.0.0.1:${server.port}/qa/s1furi/s1furi.html?reset=1`, 60000);
  const phase = () => page.eval('S1FURI.phase');
  const shot = async n => { await page.screenshot(`${OUT}/${tag}_${n}.png`); console.log('shot', n); };
  async function waitPhase(re, to = 90000) { const t0 = Date.now(); for (;;) { const p = await phase(); if (re.test(p)) return p; if (Date.now() - t0 > to) throw new Error('timeout ' + re + ' now ' + p); await sleep(40); } }
  const rectOf = async sel => page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const r=rs[rs.length-1];const e=r.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2,b.width,b.height]})()`);
  async function clickSel(sel) { const r = await rectOf(sel); if (!r) throw new Error('no ' + sel); await page.click(r[0], r[1]); return r; }
  const state = () => page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const r=rs[rs.length-1];const p=r.querySelector('.pile');return {left:parseFloat(p.style.left),face:[...r.querySelectorAll('.face.on')].map(e=>e.className.replace(/face|on|f-|\\s/g,'')).join(''),sweat:r.querySelector('.mk.sweat').classList.contains('on'),note:r.querySelector('.mk.note').classList.contains('on'),slip:r.querySelector('.sp.polka').textContent,glow:[...r.querySelectorAll('.bd .cd')].map(e=>e.classList.contains('glow')?1:0).join(''),say:r.querySelector('.speech').innerText.replace(/\\n/g,'/')}})()`);
  // 指で引きずる（マウスの押す・動かす・離す）
  async function drag(sel, dxs) {
    const r = await rectOf(sel);
    const sc = await page.eval('S1FURI.scale()');
    let x = r[0], y = r[1];
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    for (const dx of dxs) { x += dx * sc; await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 }); await sleep(30); }
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  }
  const meas = [];
  const measure = async label => {
    const m = await page.eval(`(()=>{const rs=[...document.querySelectorAll('#board > .sg')];const root=rs[rs.length-1];const sc=S1FURI.scale();let minF=99,minEl='';const bad=[];const br=document.getElementById('board').getBoundingClientRect();let nObj=0;
      const hid=e=>{let p=e;while(p&&p!==root){const c=getComputedStyle(p);if(c.display==='none'||+c.opacity<.05||c.visibility==='hidden')return true;p=p.parentElement;}return false;};
      root.querySelectorAll('*').forEach(e=>{if(hid(e))return;
        const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
        const cs=getComputedStyle(e);const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const f=parseFloat(cs.fontSize);if(f<minF){minF=f;minEl=e.className+':'+e.textContent.slice(0,10);}
        if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&cs.display!=='inline')bad.push('clipX:'+e.className+':'+e.textContent.slice(0,14));
        if(!e.closest('.cd,.opt')&&e.scrollHeight>e.clientHeight+3&&e.clientHeight>0&&cs.display!=='inline')bad.push('clipY:'+e.className+':'+e.textContent.slice(0,14));
        if(r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1||r.top<br.top-1)bad.push('out:'+e.className+':'+e.textContent.slice(0,14));});
      // 重なり：文字を持つ物どうし（親子は除く）
      const boxes=[];root.querySelectorAll('.ins,.rule,.reason,.speech,.sp,.ladder,.opt,.go,.askrico,.rsay,.glabel,.tbtn,.skip,.rib,.mc,.hole,.bd,.pile .chip,.lane .road').forEach(e=>{if(hid(e))return;const r=e.getBoundingClientRect();if(r.width&&r.height)boxes.push([e,r]);});
      const ov=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const [a,ra]=boxes[i],[b,rb]=boxes[j];if(a.contains(b)||b.contains(a))continue;
        const w=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left),h=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
        if(w>3&&h>3)ov.push(a.className.split(' ')[0]+'×'+b.className.split(' ')[0]+'('+(w/sc|0)+'x'+(h/sc|0)+')');}
      const small=[];root.querySelectorAll('button').forEach(b=>{if(hid(b))return;const r=b.getBoundingClientRect();if(r.height/sc<51.5)small.push(b.className+' h='+(r.height/sc).toFixed(0));});
      return {minFontInBoard:minF,minEl,minFontOnScreen:+(minF*sc).toFixed(1),bad:bad.slice(0,8),smallButtons:small,overlap:ov.slice(0,8)}})()`);
    m.label = label; meas.push(m);
    if (m.bad.length || m.smallButtons.length || m.minFontInBoard < 18 || m.overlap.length) console.log('MEAS', JSON.stringify(m));
  };
  await sleep(150);
  // お手本
  const seen = new Set();
  for (;;) {
    const p = await phase();
    if (/^demo-/.test(p) && !seen.has(p)) {
      seen.add(p);
      await sleep(p === 'demo-0' ? 100 : (p === 'demo-3' ? 800 / SP : (p === 'demo-4' ? 1300 / SP : 500 / SP)));
      await shot(p.replace('-', '_')); await measure(p);
    }
    if (p === 'demo-card4') break;
    await sleep(15);
  }
  await clickSel('.pgo');
  const names = ['', '1', '2', '3', '4', '5', '6'];
  for (let i = 1; i <= 6; i++) {
    await waitPhase(new RegExp(`^s${i}-`));
    const pb = await waitPhase(new RegExp(`^s${i}-(bet|push)$`)); if (/bet$/.test(pb)) { await sleep(450 / SP); await shot(`s${i}_bet`); }
    await waitPhase(new RegExp(`^s${i}-push$`)); await sleep(350); await shot(`s${i}_push`); await measure(`s${i}_push`);
    const useDrag = i === 3 || i === 4;
    if (useDrag) {
      // 道の長さ：山の左端 474→10（板の寸法）。まず途中まで、次に金の線を越えて引く（越えられないはず）
      await drag('.pile', [-60, -60, -60, -60]); await sleep(250); const s1 = await state(); console.log('drag mid', JSON.stringify(s1)); await shot(`s${i}_mid`); await measure(`s${i}_mid`);
      await drag('.pile', [-80, -80, -80, -80, -80, -80, -80, -80]); await sleep(250); const s2 = await state(); console.log('drag beyond', JSON.stringify(s2), s2.left >= 10 ? 'OK(線で止まる)' : 'NG');
    } else {
      await clickSel('.pile'); await sleep(450); const s1 = await state(); console.log('tap1', JSON.stringify(s1)); await shot(`s${i}_mid`); await measure(`s${i}_mid`);
      await clickSel('.pile'); await sleep(450);
    }
    await sleep(900); await shot(`s${i}_near`);
    await waitPhase(new RegExp(`^s${i}-pick$`)); await sleep(150);
    const sn = await state(); console.log('near', JSON.stringify(sn)); await measure(`s${i}_near`);
    if (i === 2 || i === 5) {
      // 引きもどす（顔がすまし顔に戻り、印と役の札は残る）→もう一度押す
      if (useDrag) await drag('.pile', [80, 80, 80, 80, 80, 80, 80]); else await clickSel('.pile');
      await sleep(500); const sb = await state(); console.log('pullback', JSON.stringify(sb)); await shot(`s${i}_pullback`); await measure(`s${i}_pullback`);
      await clickSel('.pile'); await sleep(450); await clickSel('.pile'); await sleep(450);
      const sa = await state(); console.log('again', JSON.stringify(sa));
    }
    if (i <= 2) { await clickSel('.askrico'); await sleep(400); await shot(`s${i}_rico`); await measure(`s${i}_rico`); await clickSel('.rico .rsay'); await sleep(300); }
    await shot(`s${i}_pick`); await measure(`s${i}_pick`);
    const ans = await page.eval(`S1FURI.ans[${i - 1}]`);
    const wrong = WRONG.includes(i);
    const tgt = wrong ? (ans === '払う' ? '降りる' : '払う') : ans;
    await clickSel(`.opt[data-a="${tgt}"]`);
    await sleep(1400 / SP); await shot(`s${i}_rv1`); await measure(`s${i}_rv1`);
    await sleep(1800 / SP); await shot(`s${i}_rv2`);
    await waitPhase(new RegExp(`^s${i}-done$`)); await sleep(600 / SP);
    await shot(`s${i}_done`); await measure(`s${i}_done`);
    if (i < 6) await clickSel('.go');
  }
  await clickSel('.go');
  await waitPhase(/^result$/); await sleep(500); await shot('result'); await measure('result');
  await clickSel('.rb[data-r=again]');
  await waitPhase(/^s1-bet$/); await sleep(300);
  await clickSel('.tbtn'); await sleep(600); await shot('replay_open');
  await clickSel('.skip'); await waitPhase(/^demo-card4$/); await sleep(300); await shot('replay_card4'); await clickSel('.pgo'); await sleep(400);
  console.log('verify', JSON.stringify(await page.eval('S1FURI.verifyResult.map(v=>({n:v.name,ok:v.ok,face:v.face,say:v.say,ans:v.ans,glint:v.glint}))')));
  console.log('log', await page.eval('JSON.stringify(S1FURI_LOG)'));
  console.log('summary', JSON.stringify(meas.map(m => [m.label, m.minFontInBoard, m.minFontOnScreen, m.bad.length, m.smallButtons.length, m.overlap.length])));
  console.log('errors', errs.join('\n') || 'none', await page.eval('S1FURI.error||""'));
} catch (e) { console.error('FAIL', e); code = 1; }
await browser.close(); await server.close();
process.exit(code);
