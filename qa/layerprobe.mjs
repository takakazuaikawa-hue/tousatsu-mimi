// 合成の層（GPU の上に別に持たれる面）の数と面積を場面ごとに数える（11/23 交換所で GPU のメモリが 170MB 増えた原因探し）
// node qa/layerprobe.mjs [場面,...]   場面：home shop battle panyu baccarat allstar
import { openSession, sleep } from './lib/session.mjs';
const SC = (process.argv[2] || 'home,shop,battle,panyu').split(',');
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const { page, close } = await openSession({ width: 844, height: 390, mobile: true, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, coins: 99999 } });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 100));
let layers = [];
page.on('LayerTree.layerTreeDidChange', (p) => { if (p.layers) layers = p.layers; });
const report = async (label) => {
  await sleep(600);
  const L = layers.filter(l => l.drawsContent);
  const area = L.reduce((a, l) => a + l.width * l.height, 0);
  const big = L.map(l => ({ id: l.layerId, node: l.backendNodeId, w: Math.round(l.width), h: Math.round(l.height), why: '' })).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 200);
  for (const b of big) { try { const r = await page.send('LayerTree.compositingReasons', { layerId: b.id }); b.why = (r.compositingReasonIds || r.compositingReasons || []).join(','); } catch (e) { } try { if (b.node) { const d = await page.send('DOM.describeNode', { backendNodeId: b.node }); b.el = d.node.localName + (d.node.attributes ? '.' + (d.node.attributes[d.node.attributes.indexOf('class') + 1] || '').slice(0, 40) : ''); } } catch (e) { } }
  console.log(`${label.padEnd(10)} layers ${L.length}  area ${(area / 1e6).toFixed(1)}Mpx（×dpr² で実際の画素）`);
  big.forEach(b => console.log('   ', b.w + 'x' + b.h, b.el || '', b.why.slice(0, 90)));
};
try {
  await page.send('DOM.enable'); await page.send('LayerTree.enable');
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(2000); await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(7000);
  for (const s of SC) {
    if (s === 'home') { await q('goLobby()'); await sleep(5000); }
    if (s === 'shop') { await q(`document.querySelector('[data-action="open-shop"]').click()`); await sleep(9000); }
    if (s === 'battle') { await q('goLobby()'); await sleep(3000); await q(`startBattle('velvet')`); await sleep(9000); }
    if (s === 'panyu') { await q('goLobby()'); await sleep(3000); await q(`document.querySelector('[data-action="panyu-free"]').click()`); await sleep(8000); }
    if (s === 'baccarat') { await q('goLobby()'); await sleep(3000); await q('BaccaratUI.open()'); await sleep(9000); }
    if (s === 'allstar') { await q('goLobby()'); await sleep(3000); await q(`AllstarUI.onAction('allstar-seat')`); await sleep(12000); }
    await report(s);
  }
} finally { await close(); }
