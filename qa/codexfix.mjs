// 2026-11-01 外部の批評の直しを、実際の画面で確かめる（続きから・扉・交換所・コレクション・研修修了）。node qa/codexfix.mjs [844x390]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const OUT = path.resolve('qa/out/codexfix'); fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: W, height: H, mobile: W < 1000, speed: 1, probes: ['cliptext.js'], save: { clearedStages: ['rico_tutorial', 'polka', 'selina'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 5000 } });
const { page } = s;
const shot = (n) => page.screenshot(path.join(OUT, `${W}x${H}_${n}.png`));
const clip = async (sel) => JSON.parse(await page.eval(`JSON.stringify(window.__clipText(document.querySelector('${sel}') || document.body).filter(o => (o.px > 4 || o.why === 'もぐり') && !/has-shop-atlas|home-active|mp-fx/.test(o.by)))`));
const click = (t) => page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => !b.disabled && b.offsetParent && b.textContent.includes(${JSON.stringify(t)})); if (b) { b.click(); return true; } return false; })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
const log = {};
// 1 続きから：グラーノ戦の途中保存がある状態で卓に入る
await page.eval(`(() => { save.battleResume = { opp: 'grano', serious: false, playerChips: 1700, opponentChips: 1200, handsDone: 2, rebuysLeft: 1, purse: null, wins: 0, at: Date.now() }; window.__skipEpisodeOnce = true; startBattle('grano'); return true; })()`);
await sleep(2500); await shot('1_resume_ask');
log.resumeAsk = await page.eval(`document.querySelector('.mimi-confirm') ? document.querySelector('.mimi-confirm').innerText.replace(/\s+/g, ' ') : 'none'`);
await click('続きから'); await sleep(800);
log.resumeState = await page.eval(`JSON.stringify({ p: state.playerChips, o: state.opponentChips, hand: state.handNo, saved: !!save.battleResume })`);
// 2 扉：ヴェルベットの扉（まだ勝っていない相手）
await page.eval(`(() => { document.querySelectorAll('.mimi-confirm-overlay').forEach(e => e.remove()); state.screen = 'lobby'; render(); showEpisodeTitle('velvet', () => {}, () => {}); return true; })()`);
await sleep(2000); await shot('2_episode_brief'); log.episode = await clip('.episode-overlay');
await click('題名を全部読む'); await sleep(800); await shot('3_episode_full');
await page.eval(`(() => { document.querySelectorAll('.episode-overlay').forEach(e => e.remove()); return true; })()`);
// 3 交換所：選んでいる品が棚に見えているか
await page.eval(`(() => { state.screen = 'shop'; render(); return true; })()`); await sleep(2500); await shot('4_shop');
log.shopSel = await page.eval(`(() => { const row = document.querySelector('.sh3-row'), c = document.querySelector('.sh3-card.is-sel'); if (!row || !c) return 'none'; const a = row.getBoundingClientRect(), b = c.getBoundingClientRect(); return b.left >= a.left - 2 && b.right <= a.right + 2 ? '見えている' : '画面の外'; })()`);
// 4 コレクション：先頭の段
await page.eval(`(() => { state.screen = 'lobby'; render(); if (typeof openCollection === 'function') openCollection(); else onAction({ currentTarget: { dataset: { action: 'open-collection' } } }); return true; })()`); await sleep(1500); await shot('5_collection');
log.collFirst = await page.eval(`(document.querySelector('.coll-section-title') || {}).textContent || 'none'`);
await page.eval(`(() => { document.querySelectorAll('.collection-overlay').forEach(e => e.remove()); return true; })()`);
// 5 研修修了：ボタンが2つとも見えるか
await page.eval(`(() => { state.screen = 'battle'; state.introWinShown = false; showIntroHandWinScreen(); return true; })()`); await sleep(2500); await shot('6_intro_win');
log.introBtns = await page.eval(`JSON.stringify([...document.querySelectorAll('.intro-win-buttons .btn')].map(b => { const r = b.getBoundingClientRect(); return Math.round(r.bottom) <= innerHeight ? 'ok' : '切れ ' + Math.round(r.bottom); }))`);
log.errors = s.exceptions.map(e => (e.desc || e.text).slice(0, 160));
console.log(JSON.stringify(log, null, 1));
await s.close(); process.exit(0);
