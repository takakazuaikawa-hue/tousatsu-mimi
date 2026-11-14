// 零時の卓の「考え方」（困った時のヒント）の撮影と測定。
// PC 1280x800・スマホ 844x390・小さいスマホ 667x375 で、場面を3つ（最初の手番／持ち点10BB未満／フロップ以降で賭けられた）撮る。
// 各場面：札を開いた所 → 「プロならどうする」を開いた所。QA_PSEUDO=1 で札の文を3割長くして（擬似翻訳）崩れを探す。
// 数える物：画面上 14px 未満の文字・札の中の切れ（縦にあふれ）・押す所の大きさ（PC 24px／スマホ 44px）・手札と操作に重なっていないか。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/coachshot.mjs [pc|phone|small|all] [outDir]
// 検査ブラウザは同時に1つだけ（all でも1つずつ開く）。
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';

const mode = process.argv[2] || 'all';
const OUT_ROOT = path.resolve(process.argv[3] || 'qa/out/coach');
const PSEUDO = process.env.QA_PSEUDO === '1';
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const SIZES = { pc: [1280, 800, false], phone: [844, 390, true], small: [667, 375, true] };

const MEASURE = `(() => {
  const host = document.querySelector('.as-host'); const box = document.querySelector('.as-coach');
  if (!box) return { open: false };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const tiny = [], clip = [], small = [], hit = [];
  box.querySelectorAll('.as-ck-t, .as-ck-h, .as-ck-n, .as-ck-go b, .as-ck-go span, .as-ck-lean').forEach(el => {
    if (!el.textContent.trim()) return;
    const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    if (px < 13.95) tiny.push(el.className + ' ' + px.toFixed(1));
  });
  box.querySelectorAll('.as-ck').forEach(el => { if (el.scrollHeight > el.clientHeight + 1) clip.push(el.dataset.k || 'fin'); });
  box.querySelectorAll('.as-ck-n').forEach(el => { if (el.scrollWidth > el.clientWidth + 1) clip.push('n:' + el.textContent.trim()); });
  const minTap = document.documentElement.classList.contains('is-compact') ? 43.5 : 23.5;
  document.querySelectorAll('.as-think, .as-ck-go').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.width < minTap || r.height < minTap)) small.push(el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
  const b = box.getBoundingClientRect();
  for (const sel of ['.as-actions', '.as-hand', '.as-tools']) {
    const e = document.querySelector('.as-host ' + sel); if (!e) continue; const r = e.getBoundingClientRect();
    const ov = Math.min(b.right, r.right) - Math.max(b.left, r.left), oh = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
    if (ov > 1 && oh > 1) hit.push(sel);
  }
  const rows = [...box.querySelectorAll('.as-ck')].map(el => (el.dataset.k || 'fin') + '｜' + el.innerText.replace(/\\s+/g, ' ').trim());
  return { open: true, tiny, clip, small, hit, rows, size: Math.round(b.width) + 'x' + Math.round(b.height) };
})()`;
const REVIEW = `(() => {
  const box = document.querySelector('.as-review'); if (!box) return { open: false };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const tiny = []; box.querySelectorAll('.as-rv-t, .as-rv-k, .as-rv-st, .as-rv-h span, .as-rv-h b, .as-rv-btns button').forEach(el => { const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el); if (px < 13.95) tiny.push(el.className + ' ' + px.toFixed(1)); });
  const l = box.querySelector('.as-rv-list'); const clip = l.scrollHeight > l.clientHeight + 1 ? ['list'] : [];
  const minTap = document.documentElement.classList.contains('is-compact') ? 43.5 : 23.5;
  const small = [...box.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < minTap || r.height < minTap; }).map(b => b.textContent);
  const b = box.getBoundingClientRect(); const off = b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight;
  return { open: true, rows: box.querySelectorAll('.as-rv-row').length, tiny, clip, small, off, text: box.innerText.replace(/\s+/g, ' ').slice(0, 300) };
})()`;
const LENGTHEN = (sel = '.as-coach .as-ck-t') => `document.querySelectorAll('${sel}').forEach(el => { const t = el.textContent; el.textContent = t + 'あいうえおかきくけこさしすせそ'.slice(0, Math.ceil(t.length * 0.3)); }); true`;

async function tour(kind) {
  const [W, H, phone] = SIZES[kind];
  const OUT = path.join(OUT_ROOT, kind + (PSEUDO ? '-pseudo' : ''));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const session = await openSession({ width: W, height: H, mobile: phone, speed: 2 });
  const { page } = session;
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function" && !!window.AllstarUI').catch(() => false)); i++) await sleep(500);
  const ev = (js) => page.eval(`(() => { ${js}; return true; })()`).catch(e => console.log('ERR', js.slice(0, 60), e.message.slice(0, 160)));
  const val = (js) => page.eval(js).catch(() => null);
  const until = async (js, ms = 30000, step = 120) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await val(js)) return true; await sleep(step); } return false; };
  const Q = 'AllstarUI._qa';
  const report = [];
  let idx = 0;
  async function snap(name) {
    await sleep(350);
    idx++;
    const file = `${String(idx).padStart(2, '0')}_${name}.png`;
    const r = (await val(MEASURE)) || { error: true };
    await page.screenshot(path.join(OUT, file));
    r.name = name; report.push(r);
    console.log(kind, name, JSON.stringify({ open: r.open, tiny: r.tiny?.length, clip: r.clip, small: r.small, hit: r.hit, size: r.size }));
  }
  async function coachScene(name) {
    await ev(`document.querySelector('.as-think').click()`); await sleep(300);
    if (PSEUDO) await ev(LENGTHEN());
    await snap(name + '_open');
    await ev(`document.querySelector('.as-ck-go').click()`); await sleep(250);
    if (PSEUDO) await ev(LENGTHEN('.as-ck-fin .as-ck-t'));
    await snap(name + '_pro');
    await ev(`document.querySelector('.as-think').click()`); await sleep(150);
  }
  // 手番まで進める（mode：call＝チェックかコール、fold＝降りる）
  async function playTo(cond, ms, mimi = 'call') {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await val(`${Q}.waiting() && (${cond})`)) return true;
      if (await val(`!!document.querySelector('.as-review [data-as="review-next"]')`)) { await ev(`document.querySelector('.as-review [data-as="review-next"]').click()`); await sleep(150); continue; }
      if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi(${JSON.stringify(mimi)})`);
      await sleep(100);
    }
    return false;
  }

  await ev(`save = defaultSave(); save.introPlayed = true; save.clearedStages = ${JSON.stringify(ALL)}; save.firstClearRewardClaimed = [...save.clearedStages]; save.rewardCgSeen = [...save.clearedStages]; save.episodesSeen = [...save.clearedStages]; save.readIntroSeen = true; save.houseRulesSeen = true; save.coins = 2400; save.homeStageSeen = save.clearedStages.length; save.loginBonus = { lastDate: mpTodayKey(), streak: 1 }; save.bestRanks = { rico_tutorial:'A', polka:'A', selina:'B', grano:'A', velvet:'A' }; save.endingUnlocked = true; save.allstarUnlocked = true; save.allstar = { unlockSeen: true }; saveProgress()`);
  await ev(`state = defaultState(); state.screen = 'lobby'; render()`);
  await until('!!document.querySelector(".h15-ticket .h15-en")', 30000); await sleep(2000);
  await ev(`onAction({ currentTarget: { dataset: { action: 'allstar-open' } }, preventDefault(){}, stopPropagation(){}, target: document.body })`); await sleep(900);
  await ev(`document.querySelector('.as-entry [data-action="allstar-seat"]').click()`);
  // 1 最初の手番
  await playTo('true', 60000);
  await snap('turn_closed');
  await coachScene('first');
  // 2 フロップ以降で賭けられた（コールで付いていく）
  if (await playTo(`${Q}.T().hand.street !== 'preflop' && Allstar.legalActions(${Q}.T()).toCall > 0`, 120000)) await coachScene('postflop_bet');
  else console.log(kind, 'フロップ以降で賭けられる場面が来なかった');
  // 3 持ち点 10BB 未満（ハンドの切れ目で持ち点を組み替える）
  for (let i = 0; i < 400; i++) {
    const ok = await val(`(() => { const T = ${Q}.T(); if (!T || !T.hand || !T.hand.done) return false; const live = T.players.filter(p => p.place == null); const tot = T.totalChips; const bb = Allstar.levelInfo(T, T.handNo + 1).bb || 100; const mine = bb * 7; const rest = tot - mine; const each = Math.floor(rest / (live.length - 1) / 25) * 25; const st = T.players.map((p, k) => p.place != null ? 0 : k === 0 ? mine : each); st[T.players.findIndex((p, k) => k && p.place == null)] += tot - st.reduce((a, b) => a + b, 0); return ${Q}.rig(st); })()`);
    if (ok) break;
    if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('fold')`);
    await sleep(40);
  }
  if (await playTo(`${Q}.T().hand.street === 'preflop'`, 60000, 'fold')) {
    await coachScene('short_stack');
    // 4 答え合わせ：プロの寄りと逆を選んで、手の後の答え合わせを出す
    const lean = await val(`Allstar.coach(${Q}.T()).lean`);
    await ev(`${Q}.actMimi(${JSON.stringify(lean === 'fold' || lean === 'check' ? 'allin' : 'fold')})`);
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      if (await val(`!!document.querySelector('.as-review.on')`)) break;
      if (await val(`${Q}.waiting()`)) await ev(`${Q}.actMimi('call')`);
      await sleep(100);
    }
    if (PSEUDO) await ev(LENGTHEN('.as-review .as-rv-t'));
    await sleep(300);
    idx++;
    const r = (await val(REVIEW)) || { error: true }; r.name = 'review'; report.push(r);
    await page.screenshot(path.join(OUT, `${String(idx).padStart(2, '0')}_review.png`));
    console.log(kind, 'review', JSON.stringify(r));
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await session.close();
}

const kinds = mode === 'all' ? ['pc', 'phone', 'small'] : [mode];
for (const k of kinds) await tour(k);
