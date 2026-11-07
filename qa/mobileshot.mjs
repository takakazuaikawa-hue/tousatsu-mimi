// スマホの基準の手早い確認：選んだ場面だけ開いて撮り、qa/lib/stdcheck.mjs で数える（直しながら回す用。全部は fulltour.mjs）。
// node qa/mobileshot.mjs [--size 844x390] [--out dir] scene...   scene: title table bet result lose minipoker mpchoose mpresult allstar ending credits home shop panyu intro
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck, countsOf } from './lib/stdcheck.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sizeArg = opt('--size', '844x390');
const [W, H] = sizeArg.split('x').map(Number);
const phone = W < 1000;
const OUT = path.resolve(opt('--out', `qa/out/mobileshot/${sizeArg}`));
fs.mkdirSync(OUT, { recursive: true });
const scenes = args.filter((a, i) => !a.startsWith('--') && !['--size', '--out'].includes(args[i - 1]) && a !== '--probe' && args[i - 1] !== '--js');
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: W, height: H, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 40 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);
const CHECK = stdCheck({ phone, minText: phone ? 12 : 11 });
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 120)));
const act = (action, data = {}) => ev(`onAction({ currentTarget: { dataset: ${JSON.stringify({ action, ...data })} }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
const clickSel = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.click()`);
const closeAll = () => ev(`document.querySelectorAll('[class*="-overlay"], .home-overlay, .modal-overlay, .read-battle-host, .credits-roll, [class*="credits-"]').forEach(e => { if (!e.closest('.home-stage') && e.id !== 'preload-overlay') e.remove(); })`);
const setSave = (cleared, extra = '') => ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(cleared)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.ownedItems = (save.ownedItems || []).concat(['memory_minipoker']); ${extra}; saveProgress()`);
const lobby = async () => { await closeAll(); await ev(`state = defaultState(); state.screen = 'lobby'; render()`); for (let i = 0; i < 30 && !(await page.eval('!!document.querySelector(".h15-ticket .h15-en")')); i++) await sleep(500); await sleep(1500); };
const tally = {};
async function snap(name) {
  await page.eval('Promise.all([...document.images].filter(i=>i.src && !i.complete).map(i=>i.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)').catch(() => {});
  await sleep(700);
  const r = await page.eval(CHECK).catch(e => ({ error: e.message }));
  await page.screenshot(path.join(OUT, name + '.png'));
  const c = countsOf(r); for (const [k, v] of Object.entries(c)) tally[k] = (tally[k] || 0) + v;
  console.log(name, JSON.stringify(c));
  if (opt('--js')) console.log('   js', await page.eval(opt('--js')).catch(e => e.message));
  if (args.includes('--probe')) console.log('   stack', await page.eval(`JSON.stringify(document.elementsFromPoint(52, 200).map(e => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return e.tagName + '.' + e.className.toString().split(' ').slice(0,3).join('.') + ' L' + Math.round(r.left) + ' W' + Math.round(r.width) + (c.backgroundImage !== 'none' ? ' BGI' : '') + ' ' + c.position; }))`));
  for (const k of ['tiny', 'body', 'safe', 'off', 'clip', 'covered', 'small', 'bar']) if (r[k] && r[k].length) console.log('   ', k, r[k].slice(0, 12).join(' | '));
}
const toTable = async (opp) => {
  await closeAll(); await setSave(['rico_tutorial', 'polka', 'selina']);
  await ev(`state = defaultState(); startBattle(${JSON.stringify(opp)})`); await sleep(4500);
  for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click()`); await sleep(700); }
  for (let i = 0; i < 40; i++) { if (await page.eval(`!!(state.isPlayerTurn)`)) break; await sleep(500); }
  await sleep(1000);
};
for (const sc of scenes) {
  if (sc === 'title') { await setSave(['rico_tutorial', 'polka', 'selina']); await ev(`state = defaultState(); render()`); await sleep(2500); await snap('title'); }
  if (sc === 'home') { await setSave(['rico_tutorial', 'polka', 'selina']); await lobby(); await snap('home'); }
  if (sc === 'intro') { await closeAll(); await setSave(['rico_tutorial', 'polka', 'selina']); await ev(`state = defaultState(); startBattle('grano')`); await sleep(4500); await snap('intro'); }
  if (sc === 'table' || sc === 'bet') { await toTable('grano'); await snap('table'); if (sc === 'bet') { await ev(`state.betChooserOpen = true; render()`); await sleep(900); await snap('bet'); } }
  if (sc === 'handresult') { await toTable('grano'); await clickSel('.verb-fold, [data-action="fold"]'); await sleep(4000); await snap('handresult'); }
  if (sc === 'result' || sc === 'lose') {
    await toTable('selina'); const won = sc === 'result';
    await ev(`document.querySelectorAll('.read-battle-host,.battle-modal-overlay').forEach(e => e.remove()); state.psychPending = false; state.handNumber = 9; state.playerChips = ${won ? 3000 : 0}; state.opponentChips = ${won ? 0 : 3000}; endBattle()`);
    await sleep(7000); await snap(sc);
  }
  if (sc.startsWith('mp')  || sc === 'minipoker') {
    await setSave(ALL); await lobby(); await act('play-minipoker'); await sleep(2500); await snap('minipoker');
    await ev(`document.querySelectorAll('[class*="mp-tut"]').forEach(e => e.remove())`);
    await clickSel('.minipoker-overlay [data-mp="deal"]'); await sleep(3500); await snap('mpchoose');
    await clickSel('.minipoker-overlay [data-mp="draw"]'); await sleep(4000); await snap('mpchoose2'); await clickSel('.minipoker-overlay [data-mp="hold-all"]'); await sleep(6000); await snap('mpresult');
  }
  if (sc === 'allstar') {
    await setSave(ALL, 'save.bestRanks = { rico_tutorial:"A", polka:"A", selina:"B", grano:"A", velvet:"A" }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }'); await lobby();
    await act('allstar-open'); await sleep(1200); await snap('allstar_entry');
    await clickSel('.as-entry [data-action="allstar-seat"]');
    for (let i = 0; i < 160 && !(await page.eval('!!(window.AllstarUI && AllstarUI._qa && AllstarUI._qa.waiting())').catch(() => false)); i++) await sleep(250);
    await sleep(600); await snap('allstar_turn');
    await clickSel('.as-raise:not(:disabled)'); await sleep(700); await snap('allstar_sizer');
    await clickSel('.as-sizer .as-back'); await clickSel('.as-tool[data-as="menu"]'); await sleep(600); await clickSel('.as-menu [data-as="leave"]'); await sleep(1500);
  }
  if (sc === 'ending' || sc === 'credits') { await closeAll(); await setSave(ALL); await ev(`state = defaultState(); state.screen = 'ending'; render()`); await sleep(4000); await snap('ending'); await act('play-credits'); await sleep(4000); await snap('credits'); await closeAll(); }
  if (sc === 'shop') { await setSave(['rico_tutorial', 'polka', 'selina']); await lobby(); await act('open-shop'); await sleep(2500); await snap('shop'); }
  if (sc === 'panyu') { await setSave(['rico_tutorial', 'polka', 'selina']); await lobby(); await act('panyu-free'); await sleep(5000); await snap('panyu'); }
}
console.log('TOTAL', JSON.stringify(tally));
console.log('errors', JSON.stringify(await page.eval('window.__QA ? window.__QA.errors : []').catch(() => [])).slice(0, 600));
await session.close();
