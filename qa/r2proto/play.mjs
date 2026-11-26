// お手本→8場面を実際に押して遊び、各画面を撮る。node qa/r2proto/play.mjs [幅] [高さ] [速さ] [plain] [picks=見送り,小...]
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import path from 'node:path';
import fs from 'node:fs';
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), SP = +(process.argv[4] || 3);
const PLAIN = process.argv[5] === 'plain';
const PICKS = (process.argv[6] || 'mid,small,small,small,mid,check,check,big').split(',');
const FOLLOW = (process.argv[7] || 'y,y,y,y,y,n,n,y').split(',');
const tag = `${W}x${H}${PLAIN ? '_plain' : ''}`;
const OUT = 'qa/out/r2proto'; fs.mkdirSync(OUT, { recursive: true });
const server = await serve(path.resolve('.'), 0);
const browser = await launch({ width: W, height: H });
const page = await browser.newPage();
await page.setViewport(W, H, W < 1000);
const errs = []; page.on('Runtime.exceptionThrown', p => errs.push(JSON.stringify(p.exceptionDetails).slice(0, 500)));
await page.addInit(`(()=>{const S=${SP};const st=window.setTimeout.bind(window);window.setTimeout=(f,m,...a)=>st(f,Math.max(0,(+m||0)/S),...a);})()`);
await page.send('Animation.enable').catch(() => {}); await page.send('Animation.setPlaybackRate', { playbackRate: SP }).catch(() => {});
await page.goto(`http://127.0.0.1:${server.port}/qa/r2proto/r2proto.html?reset=1${PLAIN ? '&mode=plain' : ''}`, 60000);
const phase = () => page.eval('R2.phase');
const shot = async n => { const f = `${OUT}/${tag}_${n}.png`; await page.screenshot(f); console.log('shot', n); };
async function waitPhase(re, to = 60000) { const t0 = Date.now(); for (;;) { const p = await phase(); if (re.test(p)) return p; if (Date.now() - t0 > to) throw new Error('timeout ' + re + ' now ' + p); await sleep(40); } }
async function clickSel(sel) {
  const r = await page.eval(`(()=>{const e=(window.R2DEMO&&document.body.contains(window.R2DEMO.root)?window.R2DEMO.root:R2.stage().root).querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2,b.width,b.height]})()`);
  if (!r) throw new Error('no ' + sel);
  await page.click(r[0], r[1]); return r;
}
await sleep(1200);
if (!PLAIN) {
  const seen = new Set();
  for (;;) {
    const p = await phase();
    if (/^demo-/.test(p) && !seen.has(p)) { seen.add(p); await sleep(p === 'demo-0' ? 400 / SP * 3 : 250); await shot('demo_' + p.slice(5)); }
    if (p === 'demo-card4') break;
    await sleep(60);
  }
  await clickSel('.card4 .gob');
}
const meas = [];
for (let i = 1; i <= 8; i++) {
  if (!PLAIN) { await waitPhase(new RegExp(`^s${i}-(intro|trail|pick)$`)); if (i === 1) { await shot("s1_intro"); } }
  await waitPhase(new RegExp(`^s${i}-pick$`)); await sleep(150);
  if (i === 1 || i === 4) await shot(`s${i}_pick`);
  if (i === 1 && !PLAIN) {
    await clickSel('.tbtn.tag'); await sleep(200); await shot('s1_sheet'); await clickSel('.sheet .x'); await sleep(100);
    await clickSel('.ask'); await sleep(300); await shot('s1_ask'); await clickSel('.piles'); await sleep(200);
  }
  const opt = PICKS[i - 1];
  await clickSel(`.pile[data-opt=${opt}]`); await sleep(250);
  if (i === 1 || i === 4 || i === 6) await shot(`s${i}_sel_${opt}`);
  await clickSel('.go');
  if (!PLAIN) {
    await waitPhase(new RegExp(`^s${i}-(line|said|follow|reveal|done)`)); await sleep(120); await shot(`s${i}_line`);
    await waitPhase(new RegExp(`^s${i}-(said|follow|reveal|done)`)); await sleep(150); await shot(`s${i}_said`);
  }
  let p = await waitPhase(new RegExp(`^s${i}-(follow|reveal|done)$`));
  if (p.endsWith("follow")) {
    await sleep(200); await shot(`s${i}_follow`);
    await clickSel(FOLLOW[i - 1] === 'y' ? '.fc .yes' : '.fc .no');
  }
  await waitPhase(new RegExp(`^s${i}-done$`)); await sleep(250);
  await shot(`s${i}_reveal`);
  // 計測：板の中の文字の最小サイズ・はみ出し
  meas.push(await page.eval(`(()=>{const root=R2.stage().root;const sc=R2SCALE;let minF=99,bad=[];const br=root.getBoundingClientRect();
    root.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return;const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
      const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const f=parseFloat(cs.fontSize)*sc;minF=Math.min(minF,f);
      if(e.scrollWidth>e.clientWidth+2&&cs.overflow!=='visible'&&e.clientWidth>0)bad.push('clip:'+e.className+':'+e.textContent.slice(0,20));
      if(r.right>br.right+1||r.left<br.left-1||r.bottom>br.bottom+1)bad.push('out:'+e.className+':'+e.textContent.slice(0,16));});
    return {scene:${i},minFont:+minF.toFixed(1),bad:bad.slice(0,6)}})()`));
  await clickSel('.go'); await sleep(200);
}
await waitPhase(/^end$/); await sleep(300); await shot('end');
console.log(JSON.stringify(meas));
console.log(await page.eval('JSON.stringify(R2LOG.scenes)'));
console.log('errors', errs.join('\n') || 'none', await page.eval('R2.error||""'));
await browser.close(); await server.close();
process.exit(0);
