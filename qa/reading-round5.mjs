// 呼び名の統一・設定・題名・性格の読み切りの帯を 844x390 で撮り、帯の文字の実寸を測る（2026-11-17）。出力 qa/out/reading/
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve('qa/out/reading'); fs.mkdirSync(OUT, { recursive: true });
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: 844, height: 390, mobile: true, speed: 1, seed: 7, save: { clearedStages: [], introPlayed: true, houseRulesSeen: true, coins: 800, psychEnabled: false, logicEnabled: true } });
const { page } = s;
const ev = (js) => page.eval(`(() => { try { ${js} } catch (e) { return 'ERR ' + e.message; } })()`);
for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
console.log('移行（psych=false,logic=true → reading）', await ev('return String(save.readingEnabled) + " psych:" + save.psychEnabled'));
await ev(`showSettingsModal(); return 1;`); await sleep(700);
await page.screenshot(path.join(OUT, 'r5_settings_844x390.png'));
console.log('設定の文字', await ev(`return [...document.querySelectorAll('.settings-modal-group')].map(g => g.innerText.replace(/\s+/g, ' ')).join(' / ')`));
await ev(`document.querySelectorAll('.settings-overlay').forEach(e => e.remove()); return 1;`);
// 題名
const key = await ev(`return Object.keys(EPISODES).find(k => EPISODES[k].id === 'episode_002_title')`);
await ev(`showEpisodeTitle(${JSON.stringify(key)}, () => {}, () => {}); return 1;`); await sleep(1500);
const n = await ev(`return TITLE_READ.episode_002_title.cl.length`);
const idx = await ev(`return TITLE_READ.episode_002_title.cl.findIndex(c => /リーディング/.test(c[0]))`);
for (let j = 0; j < idx; j++) { await ev(`document.querySelector('.tr-layer').click(); return 1;`); await sleep(200); }
await sleep(1500);
await page.screenshot(path.join(OUT, 'r5_title_844x390.png'));
console.log('題名', key, '句', n, '番号', idx, await ev(`return (document.querySelector('.tr-one')||{}).innerText`));
await ev(`document.querySelectorAll('.episode-overlay').forEach(e => e.remove()); return 1;`);
// 帯：卓で出す
await ev(`startBattle('polka'); return 1;`); await sleep(2500);
for (let i = 0; i < 8; i++) { await ev(`const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始|はじめる|OK|わかった/.test(b.textContent) && b.offsetParent); if (b) b.click(); return 1;`); await sleep(700); }
await ev(`showPersonalityRevealBanner(); return 1;`); await sleep(900);
await page.screenshot(path.join(OUT, 'r5_banner_844x390.png'));
console.log('帯の実寸', await ev(`const r = {}; for (const sel of ['.prb-title','.prb-name','.prb-traits li','.prb-exploit','.prb-note','.prb-close-btn']) { const e = document.querySelector('.personality-reveal-banner ' + sel); if (!e) { r[sel] = null; continue; } const rc = e.getBoundingClientRect(); const sc = document.getElementById('stage').getBoundingClientRect().width / document.getElementById('stage').offsetWidth; r[sel] = +(parseFloat(getComputedStyle(e).fontSize) * (rc.width / e.offsetWidth)).toFixed(1); } const b = document.querySelector('.prb-inner').getBoundingClientRect(); r.inner = [Math.round(b.top), Math.round(b.bottom), Math.round(b.left), Math.round(b.right)]; return JSON.stringify(r)`));
console.log('err', JSON.stringify(s.exceptions).slice(0, 300), JSON.stringify(await page.eval('window.__QA.errors.slice(0,3)')));
await s.close();
