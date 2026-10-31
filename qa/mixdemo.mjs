// 音の釣り合いの聞き比べ（2026-10-30）：対戦の曲＋声＋効果音を、ゲームと同じ計算で1本に混ぜて書き出す。
// 効果音だけ ×1（今）・×4（+12dB）・×8（+18dB）の3通り。音量は初期値（曲35・声60・効果音50）、声の間は曲を3割下げる。
// 出力：<outDir>/mix_x1.wav ほか。使い方: QA_BROWSER=... QA_NO_SANDBOX=1 node qa/mixdemo.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep } from './lib/session.mjs';
const OUT = path.resolve(process.argv[2] || 'qa/out/mixdemo');
fs.mkdirSync(OUT, { recursive: true });
const s = await openSession({ width: 1280, height: 800, speed: 1 });
const { page } = s;
for (let i = 0; i < 60 && !(await page.eval('typeof mpSfx === "function" && typeof SCENE_BGM === "object"').catch(() => false)); i++) await sleep(500);
for (const factor of [1, 4, 8]) {
  const b64 = await page.eval(`(async () => {
    const SR = 48000, LEN = 16;
    const ctx = new OfflineAudioContext(2, SR * LEN, SR);
    const load = async (u) => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
    // 曲：対戦の曲を 20 秒目から。音量 0.35 × gain。声の間は 0.7 倍
    const bgm = await load(SCENE_BGM.battle.file);
    const src = ctx.createBufferSource(); src.buffer = bgm;
    const bg = ctx.createGain(); const base = 0.35 * SCENE_BGM.battle.gain;
    bg.gain.setValueAtTime(base, 0);
    src.connect(bg).connect(ctx.destination); src.start(0, 20);
    // 声：ミミのチェック（4.2秒）・ポルカのコール（7.8秒）・ポルカの勝ち（11.2秒）。音量 0.6
    const voices = [[4.2, 'assets/voice/mimi/bark_check.m4a'], [7.8, 'assets/voice/polka/bark_call.m4a'], [11.2, 'assets/voice/polka/bark_win_1.m4a']];
    for (const [t, u] of voices) {
      const vb = await load(u); const v = ctx.createBufferSource(); v.buffer = vb;
      const vg = ctx.createGain(); vg.gain.value = 0.6; v.connect(vg).connect(ctx.destination); v.start(t);
      bg.gain.setValueAtTime(base, t - 0.05); bg.gain.linearRampToValueAtTime(base * 0.7, t + 0.1);
      bg.gain.setValueAtTime(base * 0.7, t + vb.duration); bg.gain.linearRampToValueAtTime(base, t + vb.duration + 0.3);
    }
    // 効果音：ゲームの mpSfx をそのまま使い、時刻だけずらす
    const at = (t) => new Proxy(ctx, { get: (o, k) => k === 'currentTime' ? t : k === 'resume' ? () => Promise.resolve() : k === 'state' ? 'running' : (typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
    save.sfxOn = true; if (save.minipoker) save.minipoker.muted = false;
    const keepVol = window.sfxVolFloat; window.sfxVolFloat = () => 0.5 * ${factor} / (typeof SFX_BOOST === "number" ? SFX_BOOST : 1);
    const seq = [[1.0, 'tap'], [2.0, 'deal'], [4.0, 'check'], [6.0, 'battle-bet'], [7.6, 'call'], [9.5, 'fold'], [11.0, 'win'], [13.2, 'royal']];
    for (const [t, k] of seq) { _mpAudioCtx = at(t); mpSfx(k); }
    window.sfxVolFloat = keepVol; _mpAudioCtx = null;
    const buf = await ctx.startRendering();
    // WAV（16bit ステレオ）にして base64 で返す
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    const dv = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    const u8 = new Uint8Array(dv.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  })()`);
  fs.writeFileSync(path.join(OUT, `mix_x${factor}.wav`), Buffer.from(b64, 'base64'));
  console.log('書き出し', factor);
}
await s.close();
