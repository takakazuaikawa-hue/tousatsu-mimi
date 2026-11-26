// 声の第3弾の組み込みを確かめる：画面の文言が声の一覧で引けるか（全部）と、ホームのリコ・セリフ集を押した時に実際に鳴るか。
// QA_BROWSER=... QA_NO_SANDBOX=1 node qa/voice3check.mjs
import { openSession, sleep } from './lib/session.mjs';
const ALL = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const s = await openSession({ width: 844, height: 390, mobile: true, save: { clearedStages: ALL, introPlayed: true, houseRulesSeen: true, coins: 3000, ownedItems: ['omake_voice_pack'], homeStageSeen: 5 } });
const { page } = s;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof goLobby === "function" && !!window.MimiVoice').catch(() => false)); i++) await sleep(500);
  await page.eval(`MimiVoice.loadManifest(); true`); await sleep(2500);
  // 1 文言で引けるか
  const map = await page.eval(`(() => {
    const V = MimiVoice, miss = [], n = {};
    const chk = (tag, voice, t) => { n[tag] = (n[tag] || 0) + 1; if (!V.idForText(voice, String(t).split('|').join(''))) miss.push(tag + ':' + t); };
    Object.values(PANYU_LINES).flat().forEach(t => chk('ぱにゅ', 'mimi', t));
    const bodies = MEMORY_CONTENT && MEMORY_CONTENT.omake_voice_pack ? MEMORY_CONTENT.omake_voice_pack.body : '';
    (bodies.match(/data-voice="[a-z_]+"[^「]*「[^」]+」/g) || []).forEach(m => { const v = m.match(/data-voice="([a-z_]+)"/)[1]; chk('セリフ集', v, m.match(/「([^」]+)」/)[1]); });
    chk('降参', 'mimi', '降参、受けてあげる'); chk('降参', 'mimi', '降参はなし。最後まで札で決着をつける');
    RICO_OUTFITS.forEach(o => (o.lines || []).forEach(t => chk('衣装', 'rico', t)));
    return JSON.stringify({ n, miss: miss.slice(0, 20), missN: miss.length, clips: Object.keys(V._buffers ? {} : {}).length });
  })()`).catch(e => 'ERR ' + e.message);
  console.log('文言の照合', map);
  // 2 ホームでリコを押す → 鳴るか
  await page.eval(`goLobby(); true`); await sleep(6000);
  await page.click(422, 180); await sleep(400);   // 指で押した扱い（音の許可のため）
  await page.eval(`window.__voiceLog.length = 0; document.querySelector('.h15-rico-talk').click(); true`); await sleep(2500);
  console.log('ホームのリコ', await page.eval(`JSON.stringify({ line: document.querySelector('.h15-dialogue').textContent, log: window.__voiceLog.map(l => l.id + ' 遅れ' + l.late + 'ms') })`));
  // 3 セリフ集を開いて行を押す
  await page.eval(`window.__voiceLog.length = 0; showMemoryViewer('omake_voice_pack'); true`); await sleep(1500);
  const rows = await page.eval(`document.querySelectorAll('.memory-voice[data-voice]').length`);
  for (const i of [0, 10]) { await page.eval(`document.querySelectorAll('.memory-voice[data-voice]')[${i}]?.click(); true`); await sleep(3500); }
  console.log('セリフ集', rows, '行', await page.eval(`JSON.stringify(window.__voiceLog.map(l => l.id))`));
  console.log('例外', JSON.stringify(s.exceptions.slice(0, 3)));
} finally { await s.close(); }
