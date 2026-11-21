// 販売前の壊れ方の検査（2026-10-30）。1つのブラウザで順に試し、エラーと結果を一覧にする。
// 1 壊れた保存データ  2 古い・欠けた保存データ  3 保存できない（容量あふれ・使えない）  4 絵が読めない  5 ホームの描画が失われる  6 対戦を最後まで自動で進める
// node qa/robust.mjs
import { openSession, sleep } from './lib/session.mjs';
const KEY = 'tousatsu_mimi_save_v1';
const s = await openSession({ width: 1280, height: 800, clear: false });
const { page } = s;
const res = [];
const errs = async () => JSON.parse(await page.eval(`JSON.stringify((window.__QA && window.__QA.errors || []).splice(0))`));
const boot = async () => { for (let i = 0; i < 40 && !(await page.eval('typeof render === "function" && !!window.save')); i++) await sleep(500); await sleep(2500); };
const reloadWith = async (raw) => { await page.eval(`(() => { localStorage.clear(); ${raw === null ? '' : `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(raw)});`} location.reload(); return 1; })()`).catch(() => {}); await sleep(1500); await boot(); };
const note = async (name, extra) => { const e = await errs(); res.push({ name, errors: e.length, first: e[0] ? (e[0].msg || '').slice(0, 160) : '', ...extra }); };
await boot(); await errs();

// 1 壊れた保存データ
await reloadWith('{"coins": 500, "clearedStages": [');
await note('1 壊れた保存データ', JSON.parse(await page.eval(`JSON.stringify({ coins: save.coins, backup: Object.keys(localStorage).some(k => k.includes('_broken_')), screen: state.screen, toast: document.body.innerText.includes('控えを残して') })`)));
// 2 古い・欠けた保存データ（項目がほとんど無い、型が違う）
await reloadWith(JSON.stringify({ coins: '300', clearedStages: 'polka', ownedItems: null, rewardCgSeen: {}, logs: 5 }));
await note('2a 型の違う保存データ', JSON.parse(await page.eval(`JSON.stringify({ coins: save.coins, cleared: save.clearedStages, owned: Array.isArray(save.ownedItems), screen: state.screen })`)));
await page.eval(`(onAction({ currentTarget: { dataset: { action: 'open-shop' } } }), 1)`).catch(() => {}); await sleep(3000);
await page.eval(`(state.screen = 'lobby', render(), showCollectionModal(), 1)`).catch(() => {}); await sleep(1500);
await note('2b 型の違う保存データで交換所・コレクション');
await reloadWith(JSON.stringify({ coins: -999999, clearedStages: ['velvet', 'nobody'], ownedItems: ['no_such_item'] }));
await page.eval(`(state.screen = 'lobby', render(), 1)`); await sleep(1500);
await note('2c ありえない値（コインが負・知らない相手と品）', JSON.parse(await page.eval(`JSON.stringify({ coins: save.coins, cleared: save.clearedStages })`)));
// 3 保存できない
await reloadWith(null);
await page.eval(`(() => { const o = Storage.prototype.setItem; window.__setOrig = o; Storage.prototype.setItem = function () { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }; save.coins += 10; saveProgress(); return 1; })()`);
await sleep(1300);
await note('3a 容量あふれで保存できない', JSON.parse(await page.eval(`JSON.stringify({ told: document.body.innerText.includes('保存できていません') })`)));
await page.eval(`(Storage.prototype.setItem = window.__setOrig, 1)`);
// 4 絵が読めない（ご褒美CGの見る画面・対戦の相手の絵）
await page.eval(`(() => { const st = document.createElement('script'); return 1; })()`);
await page.eval(`(showRewardCgViewer('nobody'), 1)`); await sleep(1500);
await note('4 無い絵を開く', JSON.parse(await page.eval(`JSON.stringify({ noimg: !!document.querySelector('.reward-cg-viewer-body.noimg'), open: !!document.querySelector('.reward-cg-viewer-overlay') })`)));
await page.eval(`(document.querySelectorAll('.reward-cg-viewer-overlay').forEach(e => e.remove()), 1)`);
// 5 ホームの描画（WebGL）が失われる
await reloadWith(JSON.stringify({ introPlayed: true, clearedStages: ['rico_tutorial'], coins: 300, loginBonus: { lastDate: '2099-01-01', streak: 1 } }));
await page.eval(`(() => { document.querySelectorAll('.login-bonus-overlay').forEach(e => e.remove()); state.screen = 'lobby'; render(); return 1; })()`); await sleep(4000);
const lost = await page.eval(`(() => { const c = document.querySelector('.home-stage canvas'); if (!c) return 'canvasなし'; const gl = c.getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_lose_context'); if (!ext) return '拡張なし'; ext.loseContext(); return 'lost'; })()`);
await sleep(2000);
await note('5 ホームの描画が失われる', { lost, still: JSON.parse(await page.eval(`JSON.stringify({ stage: !!document.querySelector('.home-stage'), canvasLeft: !!document.querySelector('.home-stage canvas'), net: !!document.querySelector('.mimi-error-net') })`)) });
// 6 対戦：AI 同士で自動に進める（ミミの番は「コール/チェック」を押す）。止まらないか・エラーが出ないか
const started = await page.eval(`(() => { try { startBattle('polka'); return 'ok'; } catch (e) { return String(e); } })()`).catch(e => String(e));
let hands = 0, stuck = 0, lastSig = '';
for (let i = 0; i < 160; i++) {
  await sleep(700);
  const sig = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent && !x.disabled); const pick = b.find(x => /チェック|コール/.test(x.textContent)) || b.find(x => /次のハンド|次へ|続ける|閉じる|OK|はい|タップ/.test(x.textContent)); if (pick) pick.click(); else document.querySelector('#stage')?.click(); return (state.screen || '') + '|' + (state.handNo || state.hand || '') + '|' + (state.phase || state.stage || ''); })()`).catch(() => 'x');
  if (sig === lastSig) stuck++; else stuck = 0;
  lastSig = sig;
  if (/result|lobby/.test(sig) && i > 10) break;
  if (stuck > 25) break;
}
await note('6 対戦を自動で進める', { started, last: lastSig, stuck });
res.push({ name: '7 進行が止まった知らせが出ていないか', net: await page.eval(`!!document.querySelector('.mimi-error-net')`) });
console.log(JSON.stringify(res));
await s.close();
process.exit(0);
