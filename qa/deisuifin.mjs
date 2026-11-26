// 泥酔の夜の締め（おしまいの画面）を撮る。手本として本編のエピローグと話の題字も撮る
// QA_SIZE=844x390 node qa/deisuifin.mjs [fin|ref]   出力 qa/out/deisuifin/<大きさ>_<名前>.png
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.env.QA_SIZE || '844x390').split('x').map(Number);
const MODE = process.argv[2] || 'fin';
const OUT = 'qa/out/deisuifin'; fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const save = { clearedStages: ALL, endingUnlocked: true, horoyoiMode: true, deisuiMode: true, horoyoiCleared: ALL, deisuiCleared: ALL, bgmOn: false, sfxOn: false, voiceOn: false };
const { page, close, exceptions } = await openSession({ width: W, height: H, mobile: W < 1000, save });
const shot = async (n) => { await page.screenshot(`${OUT}/${W}x${H}_${n}.png`); console.log("shot", n); };
try {
  await sleep(2500);
  if (MODE === 'ref') {
    await page.eval(`try{ if (typeof goLobby==='function') goLobby(); }catch(e){}`);
    await sleep(1500);
    await page.eval(`showEpisodeTitle('ending', ()=>{})`);
    await sleep(4000); await shot('ref_eptitle');
    await page.eval(`document.querySelectorAll('.episode-overlay').forEach(e=>e.remove()); showEndingFinalButtonsInner(document.getElementById('stage'), {immediate:true})`);
    await sleep(4500); await shot('ref_epilogue');
  } else {
    await page.eval(`try{ if (typeof goLobby==='function') goLobby(); }catch(e){}`);
    await sleep(1500);
    await page.eval(`playDeisuiDawn()`);
    await sleep(2500);
    // 台詞を最後まで送る
    for (let i = 0; i < 6 && !(await page.eval(`!!document.querySelector('.deisui-fin')`)); i++) {
      await page.eval(`(document.querySelector('.story-overlay, .story-scene, .story-box, [class*=story]')||document.body).click()`);
      await sleep(1200);
    }
    await sleep(Number(process.env.QA_WAIT || 5000));
    await shot(process.env.QA_NAME || 'fin');
  }
  const errs = await page.eval(`JSON.stringify(window.__QA.errors)`);
  console.log('errors', errs, JSON.stringify(exceptions).slice(0, 300));
} finally { await close(); }
