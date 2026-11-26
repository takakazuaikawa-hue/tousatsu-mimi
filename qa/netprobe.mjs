// 回線の速さごとに、初回（保存分なし）の読み込みの時間と量を測る（11/23 動作環境を決めるため）
// node qa/netprobe.mjs   回線：光（制限なし）・速い4G（9Mbps/遅延170ms）・遅い4G（4Mbps/遅延300ms）・3G（1.6Mbps/遅延560ms）
import { openSession, sleep } from './lib/session.mjs';
const NETS = [
  ['光', null],
  ['速い4G', { latency: 170, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 }],
  ['遅い4G', { latency: 300, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 }],
  ['3G', { latency: 560, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 }],
];
for (const [name, cond] of NETS) {
  const { page, url: localUrl, close } = await openSession({ width: 844, height: 390, mobile: true, cacheControl: 'no-store' });
  const url = process.env.QA_URL || localUrl;   // QA_URL=配信先 で本番（圧縮あり）を測る
  const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 80));
  try {
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (cond) await page.send('Network.emulateNetworkConditions', { offline: false, ...cond });
    const t0 = Date.now();
    await page.goto('about:blank', 10000);
    page.goto(url, 300000).catch(() => {});
    let tTitle = null;
    for (let i = 0; i < 1200; i++) { if (await q('!!document.querySelector(".title-screen [data-action=start]")') === true) { tTitle = Date.now() - t0; break; } await sleep(250); }
    await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`);
    const t1 = Date.now();
    let tHome = null;
    for (let i = 0; i < 1200; i++) { const ok = await q(`(() => { const L = window.MimiAssets; return !!L && L.allReady(L.sets.lobby()); })()`); if (ok === true) { tHome = Date.now() - t1; break; } await sleep(250); }
    const mb = await q(`Math.round(performance.getEntriesByType('resource').reduce((a, x) => a + (x.transferSize || x.encodedBodySize || 0), 0) / 1048576 * 10) / 10`);
    console.log(name.padEnd(5), 'タイトルまで', (tTitle / 1000).toFixed(1) + '秒', ' ホームの絵がそろうまで', tHome != null ? (tHome / 1000).toFixed(1) + '秒' : '—', ' 読んだ量', mb + 'MB');
  } finally { await close(); }
}
