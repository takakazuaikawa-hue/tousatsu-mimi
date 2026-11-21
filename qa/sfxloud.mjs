// 録った効果音（mpSample）と、同じ場面の合成の音を、ゲームと同じ音量の決まりで録って大きさを比べる。node qa/sfxloud.mjs
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const O = 'qa/out/sfx/loud'; fs.mkdirSync(O, { recursive: true });
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 1 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof mpSfx === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await page.eval(`(() => { save.sfxOn = true; save.sfxVolume = save.sfxVolume ?? 60; mpAudioCtx(); return 1; })()`); await sleep(3000);
// 合成の「チップの着地音」は flyChips の中の mpTone。同じ式をここで鳴らす
const CASES = [['deal', `mpSfx('deal')`], ['bet', `mpSfx('bet')`], ['fold', `mpSfx('fold')`], ['pour', `mpSfx('pour')`], ['chipsland', `for (let i = 0; i < 6; i++) mpTone(1800 + 300, 0.03, 'square', 0.02, 0.001, 0.02, 380 + i * 55)`], ['pot', `mpSample('pot')`], ['betfly', `mpSample('bet', 300)`], ['check', `mpSfx('check')`], ['call', `mpSfx('call')`]];
for (const synth of [true, false]) for (const [k, code] of CASES) {
  const b64 = await page.eval(`(async () => {
    const keep = Object.assign({}, _mpBuf); if (${synth}) for (const x in _mpBuf) delete _mpBuf[x];
    const real = _mpAudioCtx; const sr = 44100, ctx = new OfflineAudioContext(1, sr * 4, sr); _mpAudioCtx = ctx; _mpSfxScale = sfxVolFloat();
    try { ${code}; } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
    const buf = await ctx.startRendering(); _mpAudioCtx = real; Object.assign(_mpBuf, keep);
    const d = buf.getChannelData(0); let pk = 0, ss = 0, n = 0; for (const v of d) { pk = Math.max(pk, Math.abs(v)); if (Math.abs(v) > 1e-4) { ss += v * v; n++; } }
    let m=d.length; while (m>1 && Math.abs(d[m-1])<1e-4) m--; m=Math.min(d.length,m+2205); const v=new DataView(new ArrayBuffer(44+m*2)); const w=(o,t)=>[...t].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0))); w(0,'RIFF'); v.setUint32(4,36+m*2,true); w(8,'WAVEfmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,m*2,true); for(let i=0;i<m;i++) v.setInt16(44+i*2,Math.max(-1,Math.min(1,d[i]))*32767,true); let bs=''; const u=new Uint8Array(v.buffer); for(let i=0;i<u.length;i+=8192) bs+=String.fromCharCode(...u.subarray(i,i+8192)); window.__lastWav=btoa(bs);
    return JSON.stringify({ peak: +(20 * Math.log10(pk || 1e-9)).toFixed(1), rms: +(10 * Math.log10((ss / Math.max(1, n)) || 1e-12)).toFixed(1), len: +(n / sr).toFixed(2) });
  })()`);
  console.log(synth ? '合成' : '録音', k.padEnd(10), b64); if (!b64.includes('-180')) fs.writeFileSync(`${O}/${synth ? 'now' : 'new'}_${k}.wav`, Buffer.from(await page.eval('window.__lastWav'), 'base64'));
}
await session.close();
