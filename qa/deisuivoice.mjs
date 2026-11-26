// 泥酔の夜の声のキーが付いて、manifest に載っているかを確かめる。node qa/deisuivoice.mjs
import { openSession, sleep } from './lib/session.mjs';
const session = await openSession({ width: 844, height: 390, mobile: true, speed: 2 });
const { page } = session;
for (let i = 0; i < 60 && !(await page.eval('typeof render === "function" && typeof save === "object"').catch(() => false)); i++) await sleep(500);
await sleep(1500);
console.log(await page.eval(`(async () => {
  const m = await (await fetch('assets/voice/manifest.json')).json();
  const ids = [];
  for (const [id, sc] of Object.entries(DEISUI_MID_SCENES)) sc.forEach(ls => ls.forEach(l => ids.push(l.voice)));
  for (const [k, im] of Object.entries(INTERMISSIONS)) if (/^[hd]_/.test(k)) im.lines.forEach(l => ids.push(l.voice));
  for (const id of Object.keys(DEISUI_CLOSE)) [0,1,2].forEach(k => ids.push(deisuiCloseVoice(id, k)));
  const none = ids.filter(v => !v), miss = ids.filter(v => v && !m.clips[v]);
  return JSON.stringify({ total: ids.length, noKey: none.length, notYet: miss.length, sample: ids.slice(0, 3), firstMissing: miss.slice(0, 3) });
})()`));
console.log('err', JSON.stringify(session.exceptions).slice(0, 400));
await session.close();
