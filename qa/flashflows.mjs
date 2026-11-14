// 画面切り替え検査の流れ。どの流れも「本物のボタン」を押して進める（勝ち負けの近道だけ state/save をいじる）
import { sleep } from './lib/session.mjs';
import { install } from './flashflows2.mjs';
export const FLOWS = {};
const ALL5 = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];

// 目の前の「進める物」を1つ押す。押したら説明を返す
export async function pressNext(c, { extra = [], avoid = /^$/ } = {}) {
  const r = await c.page.eval(`(() => {
    const vis = (e) => { if (!e || e.disabled) return false; const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return false; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .3) return false; } return getComputedStyle(e).pointerEvents !== 'none'; };
    const txt = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
    const avoid = new RegExp(${JSON.stringify(avoid.source)});
    const q = (s) => [...document.querySelectorAll(s)].filter(vis);
    const click = (e, why) => { e.click(); return why + ':' + txt(e).slice(0, 14); };
    const im = document.querySelector('.intermission-overlay:not(.out)'); if (im) { im.click(); return 'ims-overlay'; }
    const story = document.querySelector('.story-overlay:not(.out)');
    if (story) return 'KEY';
    { const m = q('.intermission-overlay .ims-dialogue, .intermission-overlay .ims-cg, .ims-dialogue, .ims-cg')[0]; if (m) return click(m, 'ims'); }
    for (const p of ${JSON.stringify(extra)}) { const e = q('button, [data-action], .btn').find(b => new RegExp(p).test(txt(b)) && !avoid.test(txt(b))); if (e) return click(e, 'extra'); }
    let e = q('.episode-continue')[0]; if (e) return click(e, 'episode');
    e = q('.coach-choice')[0]; if (e) return click(e, 'choice');
    e = q('.is-intro-go')[0]; if (e) return click(e, 'go');
    e = document.querySelector('.is-intro-go:not([disabled])'); if (e && state.screen === 'battle' && !document.querySelector('.coach-layer.is-tap')) return click(e, 'go-raw');
    e = q('.coach-layer.is-tap .coach-card')[0] || q('.coach-layer.is-tap')[0]; if (e) return click(e, 'coach');
    e = q('.mk-layer button, .mk-layer [data-mk]')[0]; if (e) return click(e, 'mk');
    return null;
  })()`);
  if (r === 'KEY') { await c.key('Enter'); return 'story-enter'; }
  return r;
}
// 条件（JS 式）が真になるまで押し進める
export async function drive(c, until, { maxMs = 120000, extra = [], avoid, gap = 450, log = false, tapMid = false, idleMax = 40 } = {}) {
  const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    if (await c.page.eval(until).catch(() => false)) return true;
    const r = await pressNext(c, { extra, avoid });
    if (r && log) console.log('    press', r);
    idle = r ? 0 : idle + 1;
    await c.wait(r ? gap : 350);
    if (tapMid && idle > 0 && idle % 14 === 0) { await c.tapMid(); if (log) console.log("    tap"); }
    if (idle > idleMax) break;
  }
  return await c.page.eval(until).catch(() => false);
}
// 「はじめる／続きから」を押す。読み込み中は効かないことがあるので、変わるまで押し直す
export async function startGame(c) {
  for (let i = 0; i < 12; i++) {
    const moved = await c.page.eval(`state.screen !== 'title' || !!document.querySelector('.story-overlay')`).catch(() => false);
    if (moved) return true;
    await c.act('start'); await c.wait(900);
  }
  return false;
}
// 次の卓の素材（battleNow）が読み終わるまで待つ。読み込み中の「準備中」は別の話なので、ここでは本物の流れに集中する
export async function warmBattle(c, id) {
  for (let i = 0; i < 240; i++) {
    const ok = await c.page.eval(`(() => { const o = OPPONENTS[${JSON.stringify(id)}]; const u = MimiAssets.sets.battleNow(o.id, o.imgKey); return MimiAssets.allReady(u); })()`).catch(() => false);
    if (ok) return true;
    await c.wait(500);
  }
  c.notes.push('卓の素材が2分で読み終わらなかった ' + id); return false;
}
export const stateLine = async (c) => console.log('   ', await c.state());

// 1a. 新しいセーブ：タイトル → はじめる → プロローグを Escape で飛ばす → 研修の最初の画面
FLOWS.newgame_skip = async (c) => {
  await c.ready();
  await c.wait(1500);
  await startGame(c); await c.wait(1500);
  await stateLine(c);
  await c.key('Escape');            // プロローグを飛ばす
  await c.wait(4000);
  await stateLine(c);
};
// 1b. プロローグを最後まで送る → 研修を最後まで → 修了の窓 → ロビーへ
FLOWS.newgame_full = async (c) => {
  await c.ready();
  await c.wait(1500);
  await startGame(c); await c.wait(1000);
  const ok = await drive(c, `!!document.querySelector('.intro-win-overlay')`, { maxMs: 400000, idleMax: 300, log: true });
  await stateLine(c);
  if (!ok) throw new Error('研修の修了の窓まで届かなかった');
  await c.wait(2500);
  await c.act('intro-to-lobby'); await c.wait(5000);
  await stateLine(c);
};

// 検査器の自己確認：わざと一瞬見せて拾えるか（本物の不具合ではない）
FLOWS.selftest = async (c) => {
  await c.ready(); await c.wait(1500);
  await c.page.eval(`(() => { const d = document.createElement('div'); d.className = 'selftest-black'; d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999'; document.getElementById('stage').appendChild(d); setTimeout(() => d.remove(), 250); return true; })()`);
  await c.wait(1500);
  // 旧不具合の再現：幕が0.5秒かけて消える間に下の画面が透け、そのあと次の画面を描く
  await c.page.eval(`(() => { const d = document.createElement('div'); d.className = 'selftest-curtain'; d.style.cssText = 'position:fixed;inset:0;background:#222;z-index:9999;transition:opacity .5s linear'; document.getElementById('stage').appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.style.opacity = '0'; })); setTimeout(() => { d.remove(); startIntroHand && 0; state.screen = 'lobby'; }, 520); return true; })()`);
  await c.wait(2500);
};

export const today = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
export const SAVE1 = { loginBonus: { lastDate: today(), streak: 1 }, clearedStages: ['rico_tutorial'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 3000, homeStageSeen: 1, firstClearRewardClaimed: ['rico_tutorial'], rewardCgSeen: ['rico_tutorial'], episodesSeen: ['rico_tutorial'] };

install({ FLOWS, pressNext, drive, startGame, warmBattle, stateLine, SAVE1, today, ALL5 });
