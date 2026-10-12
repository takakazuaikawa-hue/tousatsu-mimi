// 試作の揺れの計算を抜き出して、押した時の動きを計算する
const fs = require('fs');
const html = fs.readFileSync(process.env.HTML || 'C:/Users/takakazu/projects/mp_panyu/docs/design-ref/panyu-mesh.html', 'utf8').replace(/\r\n/g, '\n');
const a = html.indexOf('  // ---- 連打の熱'), b = html.indexOf('  function energy()');
let phys = html.slice(a, b).replace(/window\.__panyuDbg[^\n]*\n/, '');
const pd0 = html.indexOf('    addHeat();'), pd1 = html.indexOf('    ptrs.set(e.pointerId');
const tapBody = html.slice(pd0, pd1);
let now = 0, base = 0;
const performance = { now: () => now };
const src = `
const opt = { mode: 'mesh', zoom: 1.28, amp: 1.95 };
const CUPS = [{ c: [607, 600], r: 132 * (+process.env.RS || 1) }, { c: [795, 600], r: 132 * (+process.env.RS || 1) }];
const LVX = JSON.parse(process.env.LV || '{"push":1,"damp":1,"rs":1,"out":0,"down":0,"kx":1,"lx":0}');
const lvNow = () => LVX;
const BIKINI = !!process.env.BK, STRAP = BIKINI, popped = JSON.parse(process.env.POP || '[false,false,false]');
const sagOf = (i) => LVX.sag;
const restOf = (i) => [(i === 0 ? -1 : 1) * LVX.out, LVX.down];
${phys}
function tap(i, ix, iy) { ${tapBody} }
return { P, step, tap, heatNow, restOf };`;
const M = new Function('performance', src)(performance);
function runTaps(taps, total) {
  // taps: [[t, i, ix, iy], ...]
  base = now + 100000; const dt = 1 / 60; let k = 0; const rec = [];
  for (let t = 0; t < total; t += dt) {
    now = base + t * 1000;
    while (k < taps.length && taps[k][0] <= t) { M.tap(taps[k][1], taps[k][2], taps[k][3]); k++; }
    for (let n = 0; n < 4; n++) M.step(dt / 4);
    rec.push([t, M.P[0].d[1], M.P[0].sy, M.P[0].sx, M.P[0].d[0]]);
  }
  return rec;
}
module.exports = { M, runTaps, reset: () => { M.P.forEach(p => { p.d = [0, 0]; p.v = [0, 0]; p.sy = 1; p.svy = 0; p.sx = 1; p.lift = 0; p.grab = null; }); now += 100000; } };
if (require.main === module) {
  const r = runTaps([[0, 0, 607, 706]], 1.8);
  let top = 0, tt = 0, bot = 0, bt = 0, smax = 1, smin = 1, sxm = 1;
  r.forEach(([t, y, sy, sx]) => { if (y < top) { top = y; tt = t; } if (y > bot) { bot = y; bt = t; } smax = Math.max(smax, sy); smin = Math.min(smin, sy); sxm = Math.max(sxm, sx); });
  console.log(JSON.stringify({ 上がった高さ: +top.toFixed(0), 頂点まで秒: +tt.toFixed(2), 落ちた深さ: +bot.toFixed(0), 底まで秒: +bt.toFixed(2), 縦に縮む: +smin.toFixed(2), 縦に伸びる: +smax.toFixed(2), 横に広がる: +sxm.toFixed(2) }));
}
