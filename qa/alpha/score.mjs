// metrics.json から問題点と重さの点数を出す（report.json の元）。数値だけの判定なので、最終判断は目視で補正する。
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../lib/session.mjs';

const OUT = path.join(REPO, 'qa', 'out', 'alpha');

export function judge(f, m) {
  const issues = []; let score = 0;
  const add = (k, label, pts) => { if (pts > 0) { issues.push({ k, label, pts: Math.round(pts) }); score += pts; } };
  if (m.error) return { issues: [{ k: 'error', label: '読み込めない', pts: 0 }], score: 0 };
  const rf = m.ringFrac;
  if (!m.hasAlpha) {
    // 透明がない：四隅の色が近いなら「背景つきの絵」の疑い
    const flatBg = m.cornerSpread < 40;
    add('noalpha', flatBg ? '背景が抜けていない（透明部分なし・四隅が同じ色）' : '透明部分がない（全面の絵）', flatBg ? 70 : 5);
  } else {
    if (m.borderOpaque > 0.5) add('border', '外周がほぼ不透明（背景が残っている疑い）', 60);
    else if (m.borderOpaque > 0.15) add('border', '外周の一部が不透明（背景が残っている疑い）', 20 + m.borderOpaque * 40);
    if (m.transparentFrac < 0.03 && m.borderOpaque > 0.5) add('opaque', '透明部分がほとんどない', 20);
  }
  add('green', '緑のふちが残る', Math.min(60, rf.green * 400));
  add('blue', '青い背景色が残る', Math.min(60, rf.blue * 120));
  add('magenta', '桃色のふちが残る', Math.min(40, rf.magenta * 400));
  add('white', '白い背景が残る', Math.min(40, rf.white * 120));
  add('gray', '灰色の背景が残る', Math.min(30, rf.gray * 100));
  add('halo', '輪郭が明るく縁取られる', Math.min(25, Math.max(0, rf.halo - 0.1) * 80));
  add('gfringe', '輪郭が緑がかる', Math.min(25, rf.greenFringe * 200));
  add('flat', '背景らしい平らな色の塊が残る', Math.min(50, m.flatBgFrac * 100 * 8));
  add('island', '小さなゴミが浮いている', Math.min(25, m.islands.areaFrac * 100 * 6 + m.islands.count));
  add('haze', '半透明のもやが広がる', Math.min(25, Math.max(0, m.hazeFrac - 0.03) * 150));
  return { issues, score: Math.round(score) };
}
export const level = (s) => (s >= 60 ? '重' : s >= 25 ? '中' : s >= 10 ? '軽' : '問題なし');

if (process.argv[1] && process.argv[1].endsWith('score.mjs')) {
  const metrics = JSON.parse(fs.readFileSync(path.join(OUT, 'metrics.json'), 'utf8'));
  const rows = Object.entries(metrics).map(([f, m]) => ({ file: f, ...judge(f, m), metrics: m }));
  rows.sort((a, b) => b.score - a.score);
  fs.writeFileSync(path.join(OUT, 'scored.json'), JSON.stringify(rows, null, 1));
  for (const r of rows.slice(0, 80)) console.log(String(r.score).padStart(3), level(r.score), r.file.replace('assets/', ''), r.issues.map(i => i.k).join(','));
  const cnt = {}; rows.forEach(r => { const l = level(r.score); cnt[l] = (cnt[l] || 0) + 1; }); console.log(cnt);
}
