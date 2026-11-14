// 本編 home-v15 の回帰確認。node qa/homecheck.mjs [outDir]
// QA_BROWSER / QA_NO_SANDBOX は qa/lib/cdp.mjs の起動設定。
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { openSession, sleep } from './lib/session.mjs';
const out=path.resolve(process.argv[2] || 'qa/out/home-build');
fs.mkdirSync(out,{recursive:true});
const session=await openSession({width:1280,height:800,speed:1});
const {page}=session;
const report={url:session.url,checks:[],sizes:[],errors:[],network:[]};
page.on('Network.responseReceived', e => { if(e.response.status >= 400) report.network.push({url:e.response.url,status:e.response.status}); });
await page.send('Network.enable');
async function waitCheck(name, expression, ms=10000) { for (let t=0; t<ms; t+=300) { if (await page.eval(expression)) break; await sleep(300); } return check(name, expression); }
async function check(name, expression) { const value=await page.eval(expression); assert.ok(value,name); report.checks.push(name); }
async function click(selector) {
  const point=await page.eval(`(() => {const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw new Error('missing '+${JSON.stringify(selector)}); const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await page.click(point.x,point.y); await sleep(350);
}
async function lobby(cleared=['rico_tutorial','polka','selina']) {
  await page.eval(`(() => {
    document.querySelectorAll('.home-overlay,.collection-overlay,.settings-overlay,.rico-viewer-overlay,.equip-overlay,.episode-overlay,.login-bonus-overlay,.panyu-clicker-overlay').forEach(e=>e.remove());
    save = defaultSave(); save.introPlayed=true; save.clearedStages=${JSON.stringify(cleared)}; save.firstClearRewardClaimed=[...save.clearedStages]; save.rewardCgSeen=[...save.clearedStages]; save.coins=850; save.equippedRicoOutfit='default'; save.loginBonus={lastDate:mpTodayKey(),streak:1};
    state=defaultState(); state.screen='lobby'; render(); return true;
  })()`);
  await page.eval('Promise.all([...document.querySelectorAll(".home-stage img")].filter(im=>im.src).map(im=>im.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)');
  await sleep(1200);
}
async function measure(label) {
  const result=await page.eval(`(() => {
    const root=document.querySelector('.home-stage');
    const buttons=[...root.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect(), target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:el.ariaLabel||el.textContent.trim(),width:r.width,height:r.height,x:r.x,y:r.y,hit:el.contains(target),target:target?.outerHTML.slice(0,180)};});
    const text=[...root.querySelectorAll('.h15-lbl,.h15-tag,.h15-prize,.h15-sub,.h15-rn,.h15-coins,.h15-dialogue')].filter(el=>el.getClientRects().length && getComputedStyle(el).display!=='none').map(el=>{
      const content=el.textContent, probe=document.createElement('i');
      probe.style.cssText='position:absolute;left:50%;top:50%;width:0;height:1em;font-size:inherit;pointer-events:none';
      el.append(probe); const r=probe.getBoundingClientRect();probe.remove();
      return {text:content,size:Math.hypot(r.width,r.height)};
    });
    const broken=[...root.querySelectorAll('img')].filter(im=>im.src && (!im.complete||!im.naturalWidth)).map(im=>im.src);
    return {buttons,text,broken,scroll:document.documentElement.scrollWidth>innerWidth};
  })()`);
  report.sizes.push({label,...result});
  await page.screenshot(path.join(out,`measure-${label}.png`));
  assert.equal(result.broken.length,0,'images decoded');
  assert.ok(result.buttons.every(b=>b.width>=44&&b.height>=44),'44px controls '+label);
  assert.ok(result.buttons.every(b=>b.hit),'controls not obscured '+label);
  assert.ok(result.text.every(t=>t.size>=11),'11px text '+label);
}
try {
  await page.eval('window.MimiAssets.warm(window.MimiAssets.sets.lobby(),{front:true}).then(()=>true)');
  await lobby();
  await check('page identity', 'document.title.includes("ミミのテキサスホールデムポーカー")');
  await check('Grano next / real reward', 'document.querySelector(".h15-ticket").dataset.opponent==="grano" && document.querySelector(".h15-prize").textContent.includes(OPPONENTS.grano.rewardFirst)');
  await check('3 seals / 1 bookmark / 1 lock','document.querySelectorAll(".h15-slot.h15-win").length===3 && document.querySelectorAll(".h15-slot.h15-now").length===1 && document.querySelectorAll(".h15-slot.h15-lock").length===1');
  await measure('1280x800'); await page.screenshot(path.join(out,'home-pc.png'));
  await check('home animation properties are transform/opacity only', 'document.querySelector(".home-stage").getAnimations({subtree:true}).every(a=>a.effect.getKeyframes().every(k=>Object.keys(k).every(p=>["transform","opacity","offset","computedOffset","easing","composite"].includes(p))))');
  await click('.h15-pl[data-action="open-shop"]'); await check('shop opens','state.screen==="shop"');
  await click('[data-action="back-lobby"]'); await check('shop returns home','!!document.querySelector(".home-stage")');
  await sleep(1200);
  await click('.h15-pl[data-action="open-collection"]'); await check('collection opens','!!document.querySelector(".collection-overlay")');
  await page.eval('document.querySelector(".collection-overlay").remove()');
  await click('.h15-pl[data-action="rico-mode-chooser"]'); await check('classroom offers existing modes','!!document.querySelector(".rico-mode-overlay [data-action=rico-mode-tutorial]")');
  await click('[data-action="rico-mode-cancel"]');
  await click('.h15-ledger'); await check('ledger opens with stage actions','document.querySelectorAll(".home-ledger-row").length===5 && !!document.querySelector(".home-dialog [data-action=skip-stage]")');
  await click('[data-home-close]');
  await check('dialog focus returns to launcher','document.activeElement.matches(".h15-ledger")');
  await click('.h15-frame'); await waitCheck('frame opens opponent profile','!!document.querySelector(".char-profile-overlay")');
  await page.eval('document.querySelectorAll(".char-profile-overlay").forEach(e=>e.remove())');
  await click('[data-action="home-settings"]'); await click('.settings-modal [data-toggle="bgm"]');
  await check('BGM enabled and playing','save.bgmOn && !document.getElementById("lobby-bgm-audio").paused');
  await click('.settings-modal [data-toggle="bgm"]'); await check('BGM stopped','!save.bgmOn && document.getElementById("lobby-bgm-audio").paused');
  await click('.settings-modal [data-toggle="sfx"]'); await check('SFX toggle persists','!save.sfxOn');
  await click('.settings-modal-close');
  await page.eval('save.loginBonus={lastDate:"",streak:0};refreshHomeStatus()');
  await click('[data-action="home-gift"]'); await check('gift opens','!!document.querySelector(".login-bonus-overlay")');
  await click('.login-bonus-claim-btn'); await check('gift claim updates coins and dot','save.coins===850+loginBonusRewardForDay(1) && document.querySelector("[data-home=gift-dot]").hidden');
  await page.setViewport(844,390,true); await sleep(2400);
  await measure('844x390'); await page.screenshot(path.join(out,'home-phone.png'));
  await click('.h15-ledger'); await page.screenshot(path.join(out,'ledger-phone.png')); await click('[data-home-close]');
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]}); await sleep(200);
  await check('reduced motion stops all home animations','document.querySelector(".home-stage").getAnimations({subtree:true}).length===0');
  await page.send('Emulation.setEmulatedMedia',{features:[]});
  for(const cleared of [[],['rico_tutorial'],['rico_tutorial','polka'],['rico_tutorial','polka','selina','grano'],['rico_tutorial','polka','selina','grano','velvet']]) {
    await lobby(cleared);
    await check('progress '+cleared.length, 'document.querySelectorAll(".h15-slot.h15-win").length===save.clearedStages.length');
    await check('theater stage '+cleared.length, 'document.querySelector(".home-stage").dataset.stage===String(save.clearedStages.length)');
    await check('next portrait '+cleared.length,'document.querySelector(".h15-frame .h15-lbl").textContent===OPPONENTS[lobbyNextStageId()||"velvet"].name');
  }
  await check('all clear CTA remains playable','document.querySelector(".h15-ticket").dataset.opponent==="velvet"');
  await check('all clear uses real rematch reward','document.querySelector(".h15-prize").textContent.includes(rematchPreview("velvet")) && !document.querySelector(".h15-prize").textContent.includes("CG")');
  await page.eval('save.equippedRicoOutfit="dress";applyHomeCostume()'); await sleep(700);
  await check('alternate costume uses clean stage','document.querySelector(".home-stage").classList.contains("has-costume") && document.querySelector(".h15-costume").src.endsWith("rico_dress.webp")');
  await page.screenshot(path.join(out,'costume-phone.png'));
  await page.setViewport(1280,800,false);await sleep(400); await page.screenshot(path.join(out,'costume-pc.png'));
  await click('.h15-pl[data-action="open-rico-viewer"]'); await check('outfit viewer opens','!!document.querySelector(".rico-viewer-overlay")');
  await click('[data-action="rico-viewer-next"]'); await check('viewer next respects equipped outfit','document.querySelector(".h15-costume").src.endsWith("rico_dress.webp")');
  await click('[data-action="rico-viewer-close"]');
  await click('[data-action="home-settings"]'); await click('.settings-modal [data-action="equip-change"]');
  await check('equipment opens from settings','!!document.querySelector(".equip-overlay")');
  await click('.equip-chip[data-cat-key="equippedRicoOutfit"][data-choice-id="default"]');
  await waitCheck('equipment changes live home costume','save.equippedRicoOutfit==="default" && !document.querySelector(".home-stage").classList.contains("has-costume")');
  await click('.equip-modal-close');
  await click('.h15-pl[data-action="open-rico-viewer"]'); await click('[data-action="rico-viewer-next"]'); await sleep(500);
  await waitCheck('unlocked viewer previews alternate costume on home','!!state.homePreviewOutfit && document.querySelector(".home-stage").classList.contains("has-costume")');
  await click('[data-action="rico-viewer-close"]');
  await page.eval('delete state.homePreviewOutfit');
  await page.eval('save.equippedRicoOutfit="default";applyHomeCostume()'); await sleep(300);
  await waitCheck('uniform restores approved scene','!document.querySelector(".home-stage").classList.contains("has-costume")');
  await lobby();
  await page.eval('save.episodesSeen=["grano"];');
  await click('.h15-ticket');await sleep(500);
  await check('ticket enters correct table','state.opponentId==="grano" || !!document.querySelector(".episode-overlay")');
  await page.eval('goLobby()');await sleep(1300);
  await check('return rebuilds one home','document.querySelectorAll(".home-stage").length===1');
  await page.eval('save.panyuFreeDaily={date:mpTodayKey(),count:3};panyuFreeRefreshLobby()');
  await check('panyu badge follows saved count','document.querySelector("[data-bind=lobbyPanyuLeft]").textContent==="あと2回"');
  await click('.h15-pl[data-action="panyu-free"]');await check('panyu opens','!!document.querySelector(".panyu-clicker-overlay")');for (let i=0;i<30;i++) { if (await page.eval('(() => {const el=document.querySelector(".pv2-quit"); if(!el) return false; const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()')) break; await sleep(500); }
  await click('.pv2-quit');for (let i=0;i<20 && await page.eval('!!document.querySelector(".panyu-clicker-overlay")');i++) await sleep(300);await check('panyu returns to home','!document.querySelector(".panyu-clicker-overlay") && !!document.querySelector(".home-stage")');
  await lobby([]);await page.eval('save.introPlayed=false;render()');await sleep(1300);
  await check('fresh save points to Rico','document.querySelector(".h15-ticket").dataset.opponent==="rico_tutorial" && document.querySelector(".h15-pl:nth-child(4)").dataset.action==="battle-start"');
  await click('[data-action="back-title"]'); await check('title navigation and cleanup','state.screen==="title" && !document.body.classList.contains("home-active")');
  report.errors=await page.eval('window.__QA.errors'); report.errors.push(...session.exceptions);
  assert.equal(report.errors.length,0,'console/runtime errors');
  assert.equal(report.network.length,0,'HTTP errors');
  console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,network:report.network,sizes:report.sizes.map(s=>({viewport:s.label,minTarget:Math.min(...s.buttons.map(b=>Math.min(b.width,b.height))),minText:Math.min(...s.text.map(t=>t.size))}))},null,2));
} catch (error) {
  report.failure=String(error);
  report.errors=await page.eval('window.__QA.errors');
  await page.screenshot(path.join(out,'failure.png'));
  throw error;
} finally {
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2));
  await session.close();
}
process.exit(0);
