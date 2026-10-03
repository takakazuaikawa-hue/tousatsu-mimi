// 白い背景で描かれた絵の切り抜きで、髪のすき間などに閉じ込められて残った「白い背景」を透明にする。
// ・ほぼ真っ白で色むらの無い画素（min≥WMIN・彩度≤SAT）のつながった塊を探す
// ・透明部分に接している塊、または接していなくても十分大きな塊（髪のすき間）を背景と見なして消す
// ・消した所の周り数pxは、白が混ざった色を割り戻して（白を差し引いて）半透明にする（白いふち取り対策）
// 服の白（袖口・襟・札）は陰影や線があり min が下がるので、塊が細切れになって残る。
// node qa/alpha/whitekey.mjs <outDir> <file.webp> ...   （元のファイルは書き換えない）
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep } from '../lib/cdp.mjs';
import { serve } from '../lib/server.mjs';
import { REPO } from '../lib/session.mjs';

const [outDir, ...files] = process.argv.slice(2);
const WMIN = +(process.env.WMIN || 236), SAT = +(process.env.SAT || 14), BIG = +(process.env.BIG || 2000), NEAR = +(process.env.NEAR || 20), SMALL = +(process.env.SMALL || 40), BAND = +(process.env.BAND || 3);
fs.mkdirSync(path.resolve(outDir), { recursive: true });
const server = await serve(REPO, 0); const br = await launch({}); const page = await br.newPage();
await page.goto(`http://127.0.0.1:${server.port}/qa/alpha/page.html`); await sleep(200);
for (const f of files) {
  const rel = path.relative(REPO, path.resolve(f)).replace(/\\/g, '/');
  const r = await page.eval(`(async () => {
    const i = new Image(); i.src = '/' + ${JSON.stringify(rel)} + '?t=' + Date.now(); await i.decode();
    const W = i.naturalWidth, H = i.naturalHeight, N = W * H;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const im = x.getImageData(0, 0, W, H), d = im.data;
    const white = new Uint8Array(N), trans = new Uint8Array(N);
    for (let k = 0; k < N; k++) { const p = k * 4, a = d[p + 3]; if (a < 24) { trans[k] = 1; continue; }
      const mn = Math.min(d[p], d[p + 1], d[p + 2]), mx = Math.max(d[p], d[p + 1], d[p + 2]); if (mn >= ${WMIN} && mx - mn <= ${SAT}) white[k] = 1; }
    // 透明部分からの距離（NEAR px まで）。髪のすき間は輪郭の近くにある
    const near = new Uint8Array(N).fill(255); { let fr = []; for (let k = 0; k < N; k++) if (trans[k]) { near[k] = 0; fr.push(k); }
      for (let s = 1; s <= ${NEAR}; s++) { const nx = []; for (const q of fr) { const X = q % W, Y = (q / W) | 0; for (const o of [X > 0 ? q - 1 : -1, X < W - 1 ? q + 1 : -1, Y > 0 ? q - W : -1, Y < H - 1 ? q + W : -1]) if (o >= 0 && near[o] === 255) { near[o] = s; nx.push(o); } } fr = nx; } }
    // 白の中での深さ（白でない所からの距離、4 まで）。輪郭に接する白でも、厚いもの（袖口・ファー）は服とみなす
    const depth = new Uint8Array(N); { let fr = []; for (let k = 0; k < N; k++) if (white[k]) depth[k] = 255; else fr.push(k);
      for (let s = 1; s <= 4; s++) { const nx = []; for (const q of fr) { const X = q % W, Y = (q / W) | 0; for (const o of [X > 0 ? q - 1 : -1, X < W - 1 ? q + 1 : -1, Y > 0 ? q - W : -1, Y < H - 1 ? q + W : -1]) if (o >= 0 && depth[o] === 255) { depth[o] = s; nx.push(o); } } fr = nx; } }
    // 白の塊ごとに、大きさと透明部分に接するか・近いかを調べる
    const comp = new Int32Array(N).fill(-1); const info = []; const st = [];
    for (let k = 0; k < N; k++) { if (!white[k] || comp[k] >= 0) continue; const id = info.length; let n = 0, touch = 0, close = 0, deep = 0; st.push(k); comp[k] = id;
      while (st.length) { const q = st.pop(); n++; if (near[q] !== 255) close = 1; if (depth[q] > deep) deep = depth[q]; const X = q % W, Y = (q / W) | 0;
        for (const o of [X > 0 ? q - 1 : -1, X < W - 1 ? q + 1 : -1, Y > 0 ? q - W : -1, Y < H - 1 ? q + W : -1]) { if (o < 0) continue; if (trans[o]) touch = 1; if (white[o] && comp[o] < 0) { comp[o] = id; st.push(o); } } }
      info.push({ n, touch, close, deep }); }
    const kill = new Uint8Array(N); let removed = 0, blobs = 0;
    info.forEach((b, id) => { // 輪郭に接する白は細い筋（深さ2まで）だけ消す。接していない白は、輪郭の近くの髪のすき間か、とても大きな塊を消す
      b.kill = b.touch ? (b.n >= 6 && b.deep <= 2) : ((b.close && b.n >= ${SMALL}) || b.n >= ${BIG}); if (b.kill) blobs++; });
    for (let k = 0; k < N; k++) if (comp[k] >= 0 && info[comp[k]].kill) { kill[k] = 1; removed++; }
    // 消した所＋元の透明部分からの距離（BAND px まで）
    const dist = new Uint8Array(N).fill(255); let front = [];
    for (let k = 0; k < N; k++) if (kill[k] || trans[k]) { dist[k] = 0; front.push(k); }
    for (let s = 1; s <= ${BAND}; s++) { const nx = []; for (const q of front) { const X = q % W, Y = (q / W) | 0;
      for (const o of [X > 0 ? q - 1 : -1, X < W - 1 ? q + 1 : -1, Y > 0 ? q - W : -1, Y < H - 1 ? q + W : -1]) if (o >= 0 && dist[o] === 255) { dist[o] = s; nx.push(o); } } front = nx; }
    let fixed = 0;
    for (let k = 0; k < N; k++) { const p = k * 4;
      if (kill[k]) { d[p + 3] = 0; continue; }
      const s = dist[k]; if (s === 0 || s === 255) continue;
      // 白が混ざった縁：いちばん暗い成分から「白の混ざり具合」を見積もり、白を差し引く
      const mn = Math.min(d[p], d[p + 1], d[p + 2]); if (mn < 150) continue;
      const a0 = d[p + 3] / 255; const mix = Math.min(.92, Math.max(0, (mn - 150) / 105)) * (1 - (s - 1) / ${BAND}); if (mix <= .02) continue;
      const a = 1 - mix; for (let j = 0; j < 3; j++) d[p + j] = Math.max(0, Math.min(255, Math.round((d[p + j] - 255 * mix) / a)));
      d[p + 3] = Math.round(a0 * a * 255); fixed++; }
    x.putImageData(im, 0, 0);
    // 確認用：消した所を緑で塗った絵（暗い下地・元の絵は少し暗く）
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mx = m.getContext('2d'); mx.fillStyle = '#1a0a0e'; mx.fillRect(0, 0, W, H); mx.globalAlpha = .75; mx.drawImage(i, 0, 0); mx.globalAlpha = 1;
    const md = mx.getImageData(0, 0, W, H); for (let k = 0; k < N; k++) if (kill[k]) { md.data[k * 4] = 0; md.data[k * 4 + 1] = 255; md.data[k * 4 + 2] = 60; } mx.putImageData(md, 0, 0);
    return { W, H, removed, blobs, fixed, url: c.toDataURL('image/webp', .92), mask: m.toDataURL('image/jpeg', .8) };
  })()`, 180000);
  const out = path.join(outDir, path.basename(f));
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  fs.mkdirSync(path.join(outDir, '_mask'), { recursive: true }); fs.writeFileSync(path.join(outDir, '_mask', path.basename(f, path.extname(f)) + '.jpg'), Buffer.from(r.mask.split(',')[1], 'base64'));
  console.log(rel, `消した白 ${r.removed}px（${r.blobs}塊）・縁の割り戻し ${r.fixed}px`);
}
await br.close(); await server.close();
