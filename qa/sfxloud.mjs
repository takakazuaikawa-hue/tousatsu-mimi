// 効果音（mpSfx の合成音）の大きさを測る（2026-10-30「BGM と効果音、声の釣り合いは問題ないか」）。
// 検査ブラウザの中で mpAudioCtx を OfflineAudioContext に差し替えて1つずつ書き出し、
// 一番うるさい 0.4 秒の RMS（dBFS、K 特性なしの目安）と最大値を出す。音量は初期値（効果音50）。
// 使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/sfxloud.mjs
import { openSession, sleep } from './lib/session.mjs';
const s = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof mpSfx === "function"').catch(() => false)); i++) await sleep(500);
const KINDS = ['tap', 'milestone', 'bigwin', 'check', 'flip', 'reach', 'tie', 'deal', 'lose', 'battle-bet', 'win', 'hand-lose', 'fold', 'call', 'royal', 'hand-win', 'garapon', 'double-win', 'double-lose', 'bet', 'battle-allin'];
const res = await page.eval(`(async () => {
  save.sfxOn = true; save.sfxVolume = 50; if (save.minipoker) save.minipoker.muted = false;
  const out = [];
  for (const k of ${JSON.stringify(KINDS)}) {
    const ctx = new OfflineAudioContext(1, 48000 * 4, 48000);
    ctx.resume = () => Promise.resolve();
    _mpAudioCtx = ctx;
    try { mpSfx(k); } catch (e) { out.push({ k, err: String(e) }); continue; }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    const W = 19200; let best = 0;
    for (let i = 0; i + W <= d.length; i += 2400) { let e = 0; for (let j = i; j < i + W; j++) e += d[j] * d[j]; best = Math.max(best, e / W); }
    out.push({ k, rms: best ? Math.round(10 * Math.log10(best) * 10) / 10 : -99, peak: peak ? Math.round(20 * Math.log10(peak) * 10) / 10 : -99 });
  }
  _mpAudioCtx = null;
  return out;
})()`);
for (const r of res) console.log(String(r.rms).padStart(7), String(r.peak).padStart(7), r.k, r.err || '');
await s.close();

// 曲と声も同じ物差しで（ゲームの初期値の音量・曲ごとの gain を掛けた、実際に出る大きさ）
const s2 = await openSession({ width: 1280, height: 800, speed: 1 });
for (let i = 0; i < 60 && !(await s2.page.eval('typeof SCENE_BGM === "object"').catch(() => false)); i++) await sleep(500);
const res2 = await s2.page.eval(`(async () => {
  const meas = async (url, g) => {
    const ab = await (await fetch(url)).arrayBuffer();
    const ac = new OfflineAudioContext(1, 48000, 48000);
    const buf = await ac.decodeAudioData(ab);
    const d = buf.getChannelData(0); const W = Math.round(buf.sampleRate * 0.4);
    let best = 0, sum = 0, n = 0;
    for (let i = 0; i + W <= d.length; i += Math.round(W / 4)) { let e = 0; for (let j = i; j < i + W; j++) e += d[j] * d[j]; e /= W; best = Math.max(best, e); sum += e; n++; }
    const db = (x) => Math.round(10 * Math.log10(x * g * g) * 10) / 10;
    return { url: url.split('/').slice(-2).join('/'), max: db(best), avg: db(sum / n) };
  };
  const out = [];
  const bgm = 0.35;
  out.push(await meas('assets/bgm/title.mp3', bgm));   // ホーム（gain なし）
  for (const [k, v] of Object.entries(SCENE_BGM)) out.push(Object.assign(await meas(v.file, bgm * v.gain), { k }));
  const man = await (await fetch('assets/voice/manifest.json')).json();
  const ids = Object.keys(man.clips || {}).filter((x, i) => i % 25 === 0).slice(0, 10);
  for (const id of ids) { const c = man.clips[id]; const f = 'assets/voice/' + (c.f || (id + '.m4a')); try { out.push(await meas(f, 0.6)); } catch (e) { out.push({ url: f, err: String(e).slice(0, 60) }); } }
  return out;
})()`);
for (const r of res2) console.log(String(r.max).padStart(7), String(r.avg).padStart(7), r.k || '', r.url, r.err || '');
await s2.close();
