// 本編の卓で読み合いを開き、舞台の背景（光の層）が何に覆われているかを出して撮る。node qa/bgprobe.mjs <psych|logic> <opponentId>
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [group='psych', opp='polka'] = process.argv.slice(2);
const { page, close } = await openSession({ width: 1280, height: 800, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, coins: 500 } });
await sleep(2500);
await page.eval(`startBattle(${JSON.stringify(opp)}); true`); await sleep(2500);
for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
await page.eval(`(() => { state.psychPending = true; startReadBattle(${JSON.stringify(group)}); return true; })()`); await sleep(3000);
console.log(await page.eval(`(() => { const h=document.querySelector('.read-battle-host'); const out=[h.className, getComputedStyle(h).backgroundImage.slice(0,200)]; let e=document.elementFromPoint(640,700); while(e&&e!==h){ const b=getComputedStyle(e).backgroundImage, c=getComputedStyle(e).backgroundColor; if(b!=='none'||c!=='rgba(0, 0, 0, 0)') out.push((e.className||e.tagName)+' | '+c+' | '+b.slice(0,120)); e=e.parentElement;} return JSON.stringify(out,null,1); })()`));
await page.screenshot(path.resolve('qa/out/bg_' + group + '.png'));
await close();
