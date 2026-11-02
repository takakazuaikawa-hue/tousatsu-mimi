// 体験版（dist/trial）の検査：タイトルの札・別セーブ・施錠・製品版の案内・素材の取りこぼし（404）・声を読まないこと
// 使い方: node tools/build-trial.mjs && node qa/trial.mjs [WxH]
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from './lib/cdp.mjs';
import { serve } from './lib/server.mjs';
import { REPO } from './lib/session.mjs';

const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.join(REPO, 'qa', 'out', 'trial');
fs.mkdirSync(OUT, { recursive: true });
// QA_TRIAL_SITE＝配る場所の根、QA_TRIAL_PATH＝その中の体験版の場所（HPのサブフォルダーに置いた形で試す）
const ROOT = process.env.QA_TRIAL_SITE ? path.resolve(process.env.QA_TRIAL_SITE) : path.join(REPO, 'dist', 'trial');
const SUB = (process.env.QA_TRIAL_PATH || '').replace(/^\/+|\/+$/g, '');
const log = { bad: [], voiceReq: 0, errors: [] };

const server = await serve(ROOT, 0, 'no-store');
const browser = await launch({ width: W, height: H });
const page = await browser.newPage();
await page.setViewport(W, H, W < 1000);
await page.useLocalFonts(path.join(REPO, 'qa', 'out', 'fonts', 'fonts.css'));
await page.send('Network.enable');
page.on('Network.responseReceived', (p) => {
  const u = p.response.url;
  if (p.response.status >= 400) log.bad.push(p.response.status + ' ' + u.replace(/^https?:\/\/[^/]+\//, ''));
  if (u.includes('/assets/voice/')) log.voiceReq++;
});
page.on('Runtime.exceptionThrown', (p) => { const d = p.exceptionDetails || {}; log.errors.push(String((d.exception && d.exception.description) || d.text).slice(0, 200)); });
const url = `http://127.0.0.1:${server.port}/${SUB ? SUB + '/' : ''}index.html`;
const ready = async () => { for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500); await sleep(1500); };
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const act = (a, extra = {}) => page.eval(`(() => { onAction({ currentTarget: { dataset: ${JSON.stringify({ action: a, ...extra })} } }); return 1; })()`);
const closeOv = () => page.eval(`(() => { document.querySelectorAll('.trial-end-overlay').forEach(e => e.remove()); return 1; })()`);

try {
  // 1) 初めて：タイトル
  await page.goto(url, 120000); await ready();
  await page.eval(`(() => { localStorage.clear(); return 1; })()`);
  await page.goto(url, 120000); await ready();
  log.title = await page.eval(`(() => ({ trial: IS_TRIAL, key: SAVE_KEY, badge: !!document.querySelector('.t3-trial'), ver: (document.querySelector('.t3-ver') || {}).textContent }))()`);
  await shot('1_title');

  // 2) 研修を終えた人：ホーム。セリナの施錠、交換所・ぱにゅぱにゅ・飛ばしを押すと案内
  await page.eval(`(() => { localStorage.setItem(SAVE_KEY, JSON.stringify({ clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, coins: 600, readIntroSeen: true, rewardCgSeen: ['rico_tutorial'] })); return 1; })()`);
  await page.goto(url, 120000); await ready();
  await page.eval(`(() => { goLobby(); return 1; })()`); await sleep(3000);
  await shot('2_home');
  log.keys = await page.eval(`Object.keys(localStorage)`);
  log.unlock = await page.eval(`({ selina: isStageUnlocked('selina'), polka: isStageUnlocked('polka'), skipPolka: canSkipStage('polka') })`);
  for (const a of ['open-shop', 'panyu-free', 'allstar-open', 'equip-change']) {
    await act(a); await sleep(500);
    log['gate_' + a] = await page.eval(`!!document.querySelector('.trial-end-overlay') && !document.querySelector('.shop-screen, .panyu-clicker-overlay')`);
    if (a === 'open-shop') await shot('3_gate_feature');
    await closeOv();
  }
  await act('battle-start', { opponent: 'selina' }); await sleep(500);
  log.gate_selina = await page.eval(`!!document.querySelector('.trial-end-overlay') && state.screen !== 'battle'`);
  await closeOv();
  await page.eval(`(() => { showHomeLedger(); return 1; })()`); await sleep(800);
  await shot('4_ledger');
  log.ledgerText = await page.eval(`(document.querySelector('.home-ledger-rows') || {}).innerText`);
  await page.eval(`(() => { document.querySelectorAll('.home-overlay').forEach(e => e.remove()); return 1; })()`);

  // 3) ポルカ戦：扉絵から卓まで（素材の取りこぼしを見る）
  await page.eval(`(() => { startBattle('polka'); return 1; })()`); await sleep(2500);
  await shot('5_polka_episode');
  await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|はじめる|始める/.test(b.textContent) && b.getBoundingClientRect().width); if (b) b.click(); return 1; })()`); await sleep(5000);
  await shot('6_polka_table');

  // 4) ポルカに勝った後：結果のボタンと締めの窓
  log.won = await page.eval(`(() => { state.opponentId = 'polka'; return { btn: wonResultButtonsHtml('polka').includes('trial-end'), goal: (save.clearedStages.push('polka'), nextGoalText()) }; })()`);
  await page.eval(`(() => { showTrialEnd(false); return 1; })()`); await sleep(600);
  await shot('7_trial_end');
  log.endRect = await page.eval(`(() => { const r = document.querySelector('.trial-end-card').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; })()`);
  await closeOv();

  // 5) コレクション（見ていない一枚絵が素材を取りに行かないか）
  await page.eval(`(() => { goLobby(); return 1; })()`); await sleep(1500);
  await page.eval(`(() => { showCollectionModal(); return 1; })()`); await sleep(2000);
  await shot('8_collection');
  log.voiceEnabled = await page.eval(`(() => { try { return window.MimiVoice && MimiVoice.enabled ? MimiVoice.enabled() : 'n/a'; } catch (e) { return String(e); } })()`);
} catch (e) {
  log.fatal = String(e && e.stack || e);
} finally {
  log.bad = [...new Set(log.bad)];
  fs.writeFileSync(path.join(OUT, `${W}x${H}_log.json`), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  await browser.close(); await server.close();
}
