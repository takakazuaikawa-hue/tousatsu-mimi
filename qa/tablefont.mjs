// 全部の画面と小窓を順に開いて撮り、スマホ版の基準（docs/design-ref/mobile-standard.md）で数える（qa/lib/stdcheck.mjs）：
// 隠れて押せない・押す所44px未満・文字12px未満（PCは11px）・本文14px未満・左右47pxの安全域・はみ出し・切れ・黒い帯・壊れた画像。
// node qa/fulltour.mjs [pc|phone] [outDir] [--size 844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
import { stdCheck, countsOf } from './lib/stdcheck.mjs';
const mode = process.argv[2] || 'pc';
const phone = mode === 'phone';
const sizeArg = process.argv.find((a, i) => process.argv[i - 1] === '--size') || (phone ? '844x390' : '1280x800');
const OUT = path.resolve(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : `qa/out/fulltour/${mode}${phone ? '-' + sizeArg : ''}`);
fs.mkdirSync(OUT, { recursive: true });
const [W, H] = sizeArg.split('x').map(Number);
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const session = await openSession({ width: W, height: H, mobile: phone, speed: 1 });
const { page } = session;
for (let i = 0; i < 40 && !(await page.eval('typeof startBattle === "function"')); i++) await sleep(500);

// 2026-10-21 基準を上げた（最小14px・本文16px。docs/design-ref/typography.md）。QA_MIN / QA_BODY で上書きできる
const CHECK = stdCheck({ phone, minText: +(process.env.QA_MIN || 14), bodyMin: +(process.env.QA_BODY || 16) });
const report = [];
let idx = 0;
async function snap(name) {
  await page.eval('Promise.all([...document.images].filter(i=>i.src && !i.complete).map(i=>i.decode().catch(()=>{}))).then(()=>document.fonts.ready).then(()=>true)').catch(() => {});
  await sleep(700);
  idx++;
  const file = `${String(idx).padStart(2, '0')}_${name}.png`;
  let r = null;
  try { r = await page.eval(CHECK); } catch (e) { r = { error: String(e.message).slice(0, 120) }; }
  await page.screenshot(path.join(OUT, file));
  r.name = name; r.file = file; report.push(r);
  console.log(name, JSON.stringify(countsOf(r)));
}
const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 120)));
const act = (action, data = {}) => ev(`onAction({ currentTarget: { dataset: ${JSON.stringify({ action, ...data })} }, preventDefault(){}, stopPropagation(){}, target: document.body })`);
const closeAll = () => ev(`document.querySelectorAll('[class*="-overlay"], .home-overlay, .modal-overlay, .read-battle-host, .credits-roll, [class*="credits-"], .as-host, .pv2-root').forEach(e => { if (!e.closest('.home-stage') && e.id !== 'preload-overlay') e.remove(); })`);
const setSave = (cleared, extra = '') => ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(cleared)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; ${extra}; saveProgress()`);
const lobby = async () => { await closeAll(); await ev(`state = defaultState(); state.screen = 'lobby'; render()`); for (let i = 0; i < 30 && !(await page.eval('!!document.querySelector(".h15-ticket .h15-en")')); i++) await sleep(500); await sleep(1500); };

// 卓だけ（文字の基準の直しの確かめ用。fulltour.mjs の卓の部分と同じ手順）
// 対戦：始まり・卓・賭け額・役の一覧
await closeAll(); await setSave(['rico_tutorial', 'polka', 'selina']);
await ev(`state = defaultState(); startBattle('grano')`); await sleep(4500); await snap('battle_intro');
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|次へ|わかった|はじめる/.test(b.textContent) && b.offsetWidth); if (b) b.click()`); await sleep(800); }
for (let i = 0; i < 40; i++) { if (await page.eval(`!!(state.isPlayerTurn)`)) break; await sleep(500); }
await sleep(1200); await snap('table_turn');
await ev(`state.betChooserOpen = true; render()`); await sleep(900); await snap('table_bet');
await ev(`state.betChooserOpen = false; render()`); await act('show-hand-guide'); await sleep(1200); await snap('table_hand_guide');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report }, null, 1));
for (const r of report) { console.log(r.name); for (const t of (r.tiny || [])) console.log("  " + t); for (const t of (r.body || [])) console.log("  [本文] " + t); }
await session.close();