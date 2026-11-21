// 今の合成の効果音（mpSfx）を OfflineAudioContext で録って wav にする。node qa/sfxrecord.mjs <出力フォルダ>
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = process.argv[2] || 'qa/out/sfx/current'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof mpSfx === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
const KINDS = ['deal', 'flip', 'bet', 'check', 'fold', 'call', 'tap', 'win', 'bigwin', 'lose', 'tie', 'clink', 'pour', 'milestone'];
for (const k of KINDS) {
  const b64 = await page.eval(`(async () => {
    save.sfxOn = true; if (save.minipoker) save.minipoker.muted = false;
    const sr = 44100, ctx = new OfflineAudioContext(1, sr * 3, sr);
    _mpAudioCtx = ctx; try { mpSfx(${JSON.stringify(k)}); } catch (e) { return 'ERR ' + e.message; }
    await new Promise(r => setTimeout(r, 2600));   // setTimeout で後から鳴る音を待つ
    const buf = await ctx.startRendering(); _mpAudioCtx = null;
    const d = buf.getChannelData(0); let n = d.length; while (n > 1 && Math.abs(d[n - 1]) < 1e-4) n--; n = Math.min(d.length, n + 2205);
    const v = new DataView(new ArrayBuffer(44 + n * 2)); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    let s = ''; const u = new Uint8Array(v.buffer); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s);
  })()`).catch(e => 'ERR ' + e.message.slice(0, 120));
  if (b64.startsWith('ERR')) { console.log(k, b64); continue; }
  fs.writeFileSync(`${O}/${k}.wav`, Buffer.from(b64, 'base64')); console.log(k, 'ok');
}
await session.close();
