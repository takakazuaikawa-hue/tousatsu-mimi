// 起動してタイトルが押せるまでに読んだ物を、種類と大きさで並べる。node qa/bootbytes.mjs [844x390]
import { openSession, sleep } from './lib/session.mjs';
const [W, H] = (process.argv[2] || '844x390').split('x').map(Number);
const s = await openSession({ width: W, height: H, mobile: true, speed: 1, save: null });
const { page } = s;
// openSession の goto は読み込みの後に返るので、読み込み済みの一覧は Performance の記録から取る
await sleep(1500);
const r = JSON.parse(await page.eval(`JSON.stringify(performance.getEntriesByType('resource').map(e => ({ u: e.name.replace(location.origin + '/', ''), b: e.transferSize || e.encodedBodySize || 0, t: Math.round(e.responseEnd) })))`));
const nav = JSON.parse(await page.eval(`JSON.stringify((() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; })())`));
const total = r.reduce((a, x) => a + x.b, 0);
const byExt = {}; r.forEach(x => { const k = (x.u.split('?')[0].match(/\.(\w+)$/) || [, '他'])[1]; byExt[k] = (byExt[k] || 0) + x.b; });
console.log('件数', r.length, '合計', Math.round(total / 1024) + 'KB', nav);
console.log('種類', Object.entries(byExt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v / 1024) + 'KB').join(' / '));
console.log(r.sort((a, b) => b.b - a.b).slice(0, 15).map(x => Math.round(x.b / 1024) + 'KB ' + x.t + 'ms ' + x.u.slice(0, 70)).join('\n'));
await s.close(); process.exit(0);
