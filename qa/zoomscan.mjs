// 画面ごとに、計算された zoom が 1 でない部品を挙げる（iPhone の WebKit は zoom の中の文字だけ倍率どおりにならない）。node qa/zoomscan.mjs [844x390]
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const s = await openSession({ width: W, height: H, mobile: true, speed: 2, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'], introPlayed: true, houseRulesSeen: true, coins: 5000, readIntroSeen: true } });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const SCAN = `JSON.stringify((() => { const out = {}; document.querySelectorAll('body *').forEach(e => { const z = parseFloat(getComputedStyle(e).zoom); if (z && Math.abs(z - 1) > .001) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return; const hasText = [...e.querySelectorAll('*'), e].some(x => [...x.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())); const k = (e.className || e.tagName).toString().slice(0, 50) + ' zoom ' + z + (hasText ? ' 文字あり' : ''); out[k] = (out[k] || 0) + 1; } }); return out; })())`;
const res = {};
const go = async (name, js, wait = 1800) => { await page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log(name, 'ERR', e.message.slice(0, 100))); await sleep(wait); res[name] = JSON.parse(await page.eval(SCAN)); };
await go('home', `state.screen = 'lobby'; render()`);
await go('shop', `state.screen = 'shop'; render()`);
for (const t of ['ぱにゅ', '卓の装い', 'ノート', 'チップ', 'メモリ']) await go('shop_' + t, `const b = [...document.querySelectorAll('button, [role=tab], a, div')].find(b => b.textContent.trim() === '${t}'); b && b.click()`, 900);
await go('collection', `state.screen = 'lobby'; render(); typeof openCollection === 'function' && openCollection()`);
await go('battle', `document.querySelectorAll('[class*="-overlay"]').forEach(e => e.remove()); startBattle('selina')`, 3000);
// 測り方の確かめ：わざと zoom をかけた部品を見つけられるか
await go('check', `const d = document.createElement('div'); d.className = 'zz-test'; d.style.cssText = 'zoom:1.5;position:fixed;left:0;top:0'; d.textContent = 'テスト'; document.body.appendChild(d)`, 300);
// 読み合いのガチャ台
await go('gacha', `document.querySelectorAll('.zz-test').forEach(e => e.remove()); state.playerHand = [{ rank: 14, suit: '♠' }, { rank: 13, suit: '♠' }]; state.community = [{ rank: 2, suit: '♥' }, { rank: 7, suit: '♣' }, { rank: 12, suit: '♥' }]; state.opponentHand = [{ rank: 9, suit: '♦' }, { rank: 9, suit: '♣' }]; state.handPhase = 'flop'; state.pot = 200; state.currentBetOpponent = 100; state.currentBetPlayer = 0; READ_BATTLE_POOLS.selina.psych = ['gacha']; state.psychPending = true; startReadBattle('psych')`, 4000);
await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('わかった')); b && b.click(); return true; })()`); await sleep(2500);
res.gacha2 = JSON.parse(await page.eval(SCAN));
console.log(JSON.stringify(res, null, 1));
await s.close(); process.exit(0);
