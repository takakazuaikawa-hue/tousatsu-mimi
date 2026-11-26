// 零時の卓の文字の実寸を全部測る（2026-10-29「零時の卓もレイアウトスキルで完成にできているか」）。
// 入場案内 → 卓（ミミの手番・額の選択・段階表・席の小窓・流れ・メニュー・考え方・答え合わせ）→ 結果 → 記録 の文字を拾い、
// 画面上の実寸（縮めて描く舞台・zoom 込み）を部品（class）ごとに並べる。typeaudit.mjs と同じ「100px の印」で倍率を測る。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/allstartype.mjs [pc|phone|small|all] [出力dir]
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const mode = process.argv[2] || 'all';
const OUT = path.resolve(process.argv[3] || 'qa/out/allstartype');
const SIZES = { pc: [1280, 800, false], phone: [844, 390, true], small: [667, 375, true] };
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SNAP = `(() => {
  const res = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set(); let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement; const t = n.nodeValue.replace(/\\s+/g, ' ').trim();
    if (!p || !t || seen.has(p) || p.closest('script,style')) continue;
    if (!p.closest('.as-host, .as-dialog')) continue;
    const r = p.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
    let vis = true; for (let e = p; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .05) { vis = false; break; } } if (!vis) continue;
    seen.add(p);
    const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:1px;display:inline-block;padding:0;border:0;margin:0';
    p.appendChild(m); const k = m.getBoundingClientRect().width / 100; m.remove();
    const px = parseFloat(getComputedStyle(p).fontSize) * k;
    const cls = (typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\\s+/)[0] : p.tagName.toLowerCase()) + (p.parentElement && typeof p.parentElement.className === 'string' && p.parentElement.className ? ' < .' + p.parentElement.className.trim().split(/\\s+/)[0] : '');
    const over = p.scrollWidth > p.clientWidth + 2 && getComputedStyle(p).overflow !== 'visible';
    res.push({ cls, px: Math.round(px * 10) / 10, t: t.slice(0, 18), over });
  }
  return res;
})()`;

async function tour(kind) {
  const [W, H, phone] = SIZES[kind];
  const session = await openSession({ width: W, height: H, mobile: phone, speed: 2 });
  const { page } = session;
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && !!window.AllstarUI').catch(() => false)); i++) await sleep(500);
  const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 50), e.message.slice(0, 120)));
  const val = (js) => page.eval(js).catch(() => null);
  const until = async (js, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(120); } return false; };
  const Q = 'AllstarUI._qa';
  const all = {};
  const take = async (scene) => { await sleep(350); if (['手番', '結果', '入場案内', '段階表', 'メニュー'].includes(scene)) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot(path.join(OUT, `${kind}_${scene}.png`)); } const r = (await val(SNAP)) || []; for (const x of r) { const k = x.cls; (all[k] = all[k] || { px: new Set(), scenes: new Set(), t: x.t, over: false }); all[k].px.add(x.px); all[k].scenes.add(scene); if (x.over) all[k].over = true; } };
  const playTo = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(`${Q}.waiting() && (${cond})`)) return true; if (await val(`!!document.querySelector('.as-review [data-as="review-next"]')`)) await ev(`document.querySelector('.as-review [data-as="review-next"]').click()`); else if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('call')`); await sleep(100); } return false; };

  await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { rico_tutorial:'A', polka:'A', selina:'B', grano:'A', velvet:'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; saveProgress()`);
  await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")'); await sleep(1500);
  await ev(`onAction({ currentTarget: { dataset: { action: 'allstar-open' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(900);
  await take('入場案内');
  await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
  await playTo('true', 60000); await take('手番');
  await ev(`document.querySelector('.as-raise:not(:disabled)')?.click()`); await sleep(300); await take('額の選択');
  await ev(`document.querySelector('.as-sizer .as-back')?.click()`);
  await ev(`document.querySelector('.as-clock').click()`); await take('段階表'); await ev(`${Q}.closePops()`);
  await ev(`document.querySelector('.as-seat[data-seat="3"] .as-win').click()`); await take('席の小窓'); await ev(`${Q}.closePops()`);
  await ev(`document.querySelector('.as-pot').click()`); await take('流れ'); await ev(`${Q}.closePops()`);
  await ev(`document.querySelector('.as-tool[data-as="menu"]').click()`); await take('メニュー'); await ev(`${Q}.closePops()`);
  await ev(`document.querySelector('.as-think').click()`); await sleep(200); await ev(`document.querySelector('.as-ck-go').click()`); await take('考え方'); await ev(`document.querySelector('.as-think').click()`);
  await playTo(`${Q}.T().hand.street !== 'preflop'`, 90000); await take('フロップ以降');
  // ミミを飛ばして結果へ（持ち点を小さくして全部賭ける）
  for (let i = 0; i < 300; i++) {
    const ok = await val(`(() => { const T = ${Q}.T(); if (!T || !T.hand || !T.hand.done) return false; const tot = T.totalChips; const live = T.players.filter(p => p.place == null); const each = Math.floor((tot - 50) / (live.length - 1) / 25) * 25; const st = T.players.map((p, k) => p.place != null ? 0 : k === 0 ? 50 : each); st[T.players.findIndex((p, k) => k && p.place == null)] += tot - st.reduce((a, b) => a + b, 0); return ${Q}.rig(st); })()`);
    if (ok) break;
    if (await val(`!!document.querySelector('.as-review [data-as="review-next"]')`)) await ev(`document.querySelector('.as-review [data-as="review-next"]').click()`);
    else if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('fold')`);
    await sleep(40);
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    if (await val(`!!document.querySelector('.as-review')`)) { await take('答え合わせ'); await ev(`document.querySelector('.as-review [data-as="review-next"]').click()`); }
    if (await val(`!!document.querySelector('.as-res-btns, .as-result')`)) break;
    if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('allin')`);
    await sleep(150);
  }
  await sleep(1500); await take('結果');
  const rows = Object.entries(all).map(([k, v]) => ({ cls: k, px: [...v.px].sort((a, b) => a - b), scenes: [...v.scenes], t: v.t, over: v.over }));
  rows.sort((a, b) => a.px[0] - b.px[0]);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, kind + '.json'), JSON.stringify(rows, null, 1));
  console.log(`== ${kind} ${W}x${H}  部品 ${rows.length}`);
  for (const r of rows) console.log(r.px.join('/').padEnd(14), r.over ? 'はみ出し' : '        ', r.cls.padEnd(40), r.t, '｜', r.scenes.join('・'));
  await session.close();
}
const kinds = mode === 'all' ? ['pc', 'phone', 'small'] : [mode];
for (const k of kinds) await tour(k);
