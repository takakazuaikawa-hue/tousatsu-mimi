// scored.json に目視の判断を重ねて report.json / report.md を出す
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../lib/session.mjs';

const OUT = path.join(REPO, 'qa', 'out', 'alpha');
const rows = JSON.parse(fs.readFileSync(path.join(OUT, 'scored.json'), 'utf8'));
const srcs = new Set(fs.readdirSync(path.join(REPO, 'assets', '_source_png')).map(f => f.replace(/\.png$/i, '')));

// 目視で確かめた結果（sheet-*.png / zoom.png / big-*.png を見て決めたもの）
const VISUAL = {
  'assets/ui/card_back_default.webp': ['重', '白い背景が残る（四隅の白と、うっすら市松模様の焼き込み。透明部分がない）'],
  'assets/ui/fx_aura_logic.webp': ['中', '縁がブロック状にギザギザ（半透明の抜きが粗く、青い粒が四角く残る）'],
  'assets/ui/fx_aura_psych.webp': ['中', '縁がギザギザで、灰色の小さな欠片が浮いている'],
  'assets/ui/fx_flash_gold.webp': ['中', '金の線の縁に黄緑のふちが残り、小さな点も散る'],
  'assets/ui/stamp_speed.webp': ['軽', '稲妻の縁に黄緑がかったふちが少し残る'],
  'assets/characters/mimi_default.webp': ['軽', '髪先のまわりに白っぽいふちが少しある（拡大しないと目立たない）'],
  'assets/characters/mimi_pink.webp': ['軽', '髪先のまわりに白っぽいふちが少しある（拡大しないと目立たない）'],
  'assets/characters/mimi_gold.webp': ['軽', '髪先のまわりに白っぽいふちが少しある（拡大しないと目立たない）'],
  'assets/characters/polka_default.webp': ['軽', '髪先に濃い色のにじみ（拡大しないと目立たない）'],
  'assets/battle/chibi/velvet_win.webp': ['軽', '足もとの左に小さなゴミが1つ浮いている'],
  'assets/ui/a.webp': ['軽', '名前が「a」の試作らしいファイル。ゲームから参照されていない（整理候補）'],
};
// 設計上そうなっているもの（全面の絵・顔の窓・切り抜きの下端など）。数値は高く出るが問題ではない
const BY_DESIGN = [
  [/battle\/face\//, '顔の窓は四角い全面絵（外周が不透明なのは設計どおり）'],
  [/characters\/.*_cutin_/, 'カットインは下端で切れた絵（外周が不透明なのは設計どおり）'],
  [/characters\/(panyu|mimi_allin|mimi_clutch)/, '背景つきの全面イラスト（設計どおり）'],
  [/ui\/tex_/, '背景の模様（全面の絵・設計どおり）'],
  [/ui\/face_/, '顔アイコンは四角い切り出し（設計どおり）'],
  [/characters\/mimi_bust_/, 'バストアップは下端で切れた絵（髪の青・白は本物の色）'],
];

const out = [];
for (const r of rows) {
  const f = r.file;
  const base = path.basename(f).replace(/\.(webp|png)$/i, '');
  const v = VISUAL[f];
  let level, note, confirmed = false;
  if (v) { [level, note] = v; confirmed = true; }
  else {
    const bd = BY_DESIGN.find(([re]) => re.test(f));
    if (bd) { level = '問題なし'; note = bd[1]; confirmed = true; }
    else if (r.score >= 10) { level = '軽'; note = '数値では少し高いが、目視では問題なし（髪・白い服・金属などの本物の色の可能性）'; confirmed = true; }
    else { level = '問題なし'; note = ''; }
  }
  out.push({ file: f, level, note, visuallyConfirmed: confirmed, numericScore: r.score, numericIssues: r.issues.map(i => i.label), sourcePng: srcs.has(base), metrics: r.metrics });
}
const order = { '重': 0, '中': 1, '軽': 2, '問題なし': 3 };
out.sort((a, b) => order[a.level] - order[b.level] || b.numericScore - a.numericScore);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(out, null, 1));

const cnt = {}; out.forEach(o => { cnt[o.level] = (cnt[o.level] || 0) + 1; });
let md = `# 背景抜きの検査レポート\n\n対象: assets/characters, assets/battle/chibi, assets/battle/face, assets/ui の ${out.length} 枚。\n\n`;
md += `結果: 重 ${cnt['重'] || 0} / 中 ${cnt['中'] || 0} / 軽 ${cnt['軽'] || 0} / 問題なし ${cnt['問題なし'] || 0}\n\n`;
md += `数値で上位に出た約100枚の多くは、顔の窓・カットインなど「四角く切った絵」や、髪・服の本物の色でした。目視で確かめて、本物の不具合だけを下の表に残しています。\n\n`;
md += `## 直すべきもの\n\n| ファイル | 何が悪いか | 重さ | 元PNG（assets/_source_png） |\n|---|---|---|---|\n`;
for (const o of out.filter(o => o.level !== '問題なし' && VISUAL[o.file])) md += `| ${o.file.replace('assets/', '')} | ${o.note} | ${o.level} | ${o.sourcePng ? 'あり' : 'なし'} |\n`;
md += `\n## 数値は高いが問題なし（誤検知のパターン）\n\n`;
const groups = {};
for (const o of out.filter(o => o.level === '問題なし' && o.note)) (groups[o.note] = groups[o.note] || []).push(o.file.replace('assets/', ''));
for (const [n, fs_] of Object.entries(groups)) md += `- ${n}: ${fs_.length}枚\n`;
const light = out.filter(o => o.level === '軽' && !VISUAL[o.file]);
md += `\n数値だけ少し高く、目視では問題なし: ${light.length}枚（例: ${light.slice(0, 6).map(o => o.file.replace('assets/', '')).join('、')}）\n`;
md += `\n## 見方\n\n- 一覧: qa/out/alpha/sheet-1.png 〜 sheet-6.png（各画像を桃色の上と暗い背景の上に並べた。数値が高い順）\n- 縁の拡大: qa/out/alpha/zoom.png（残りが多い20枚を3倍で）\n- 大きく見る: node qa/alpha/big.mjs 出力名 画像... （qa/out/alpha/ に出る）\n- 再計測: node qa/alpha/scan.mjs → score.mjs → sheets.mjs → report.mjs\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), md);
console.log(cnt);
