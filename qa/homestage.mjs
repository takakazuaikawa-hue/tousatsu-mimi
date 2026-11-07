// ホームの段階（勝ち数 0〜5）と開幕の儀を撮る。node qa/homestage.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const out=path.resolve(process.argv[2] || 'qa/out/home-stage');
fs.mkdirSync(out,{recursive:true});
const session=await openSession({width:1280,height:800,speed:1});
const {page}=session;
const ORDER=['rico_tutorial','polka','selina','grano','velvet'];
async function lobby(n, seen=n) {
  await page.eval(`(() => {
    document.querySelectorAll('.home-overlay,[class*="login-bonus"]').forEach(e=>e.remove());
    save = defaultSave(); save.introPlayed=true; save.clearedStages=${JSON.stringify(ORDER.slice(0,n))}; save.firstClearRewardClaimed=[...save.clearedStages]; save.rewardCgSeen=[...save.clearedStages]; save.episodesSeen=[...save.clearedStages]; save.coins=850; save.equippedRicoOutfit='default'; save.loginBonus={lastDate:mpTodayKey(),streak:1}; save.homeStageSeen=${seen};
    state=defaultState(); state.screen='lobby'; render(); return true;
  })()`);
  await page.eval('Promise.all([...document.querySelectorAll(".home-stage img")].filter(im=>im.src).map(im=>im.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)');
}
const only=(process.argv[3]||'').split(',').filter(Boolean);
for (const [w,h,tag] of [[1280,800,'pc'],[844,390,'phone']]) {
  if (only.length && !only.includes(tag)) continue;
  await page.setViewport(w,h,tag==='phone'); await sleep(600);
  await lobby(5); await sleep(5000);
  for (const n of [0,1,3,5]) { await lobby(n); await sleep(2600); await page.screenshot(path.join(out,`${tag}-stage${n}.png`)); }
  if (tag==='pc') {
    await lobby(3,2);
    for (let i=0;i<14;i++) { await sleep(500); await page.screenshot(path.join(out,`rite-${String(i).padStart(2,'0')}.png`)); }
    console.log('seen after rite', await page.eval('save.homeStageSeen'), await page.eval('document.querySelector(".h15-frame .h15-lbl").textContent'));
  }
}
const errors=await page.eval('window.__QA ? window.__QA.errors : []');
console.log(JSON.stringify({errors:[...errors,...session.exceptions]},null,1));
await session.close();
