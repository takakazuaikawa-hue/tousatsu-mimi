#!/usr/bin/env node
// 声の台帳（Irodori-TTS の voices/phase1.json）から assets/voice/manifest.json を作る。
// 使い方: node tools/make-voice-manifest.mjs [台帳.json ...]   （既定は C:\Users\takakazu\tools\Irodori-TTS\voices\phase1.json）
// 台帳の各要素は { id:"<voice>/<key>", voice, key, text, display? }。複数渡すと全部を混ぜる（第2弾以降）。
// 出力:
//   clips : { "<voice>/<key>": { f:"<voice>/<key>.m4a", d:<秒> } }   … 台詞キー→ファイルと長さ（長さは m4a の mvhd から読む）
//   texts : { "<voice>|<正規化した文言>": "<voice>/<key>" }         … 文言→クリップ。text と display の両方を引ける
// 文言の正規化は voice.js の norm() と同じ：<br>・空白（全角含む）・鉤括弧「」『』を取る。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VOICE_DIR = path.join(REPO, 'assets', 'voice');
const ledgers = process.argv.slice(2);
if (!ledgers.length) ledgers.push('C:/Users/takakazu/tools/Irodori-TTS/voices/phase1.json');

export function norm(t) {
  return String(t == null ? '' : t).replace(/<br\s*\/?>/gi, '').replace(/[「」『』\s\u3000]/g, '');
}

// m4a(mp4) の moov/mvhd から長さ（秒）を読む
function m4aDuration(file) {
  const b = fs.readFileSync(file);
  const find = (start, end, type) => {
    let p = start;
    while (p + 8 <= end) {
      let size = b.readUInt32BE(p);
      const t = b.toString('latin1', p + 4, p + 8);
      let hdr = 8;
      if (size === 1) { size = Number(b.readBigUInt64BE(p + 8)); hdr = 16; }
      else if (size === 0) size = end - p;
      if (t === type) return [p + hdr, p + size];
      if (size < 8) break;
      p += size;
    }
    return null;
  };
  const moov = find(0, b.length, 'moov');
  const mvhd = moov && find(moov[0], moov[1], 'mvhd');
  if (!mvhd) return 0;
  const o = mvhd[0], ver = b[o];
  const ts = ver === 1 ? b.readUInt32BE(o + 20) : b.readUInt32BE(o + 12);
  const du = ver === 1 ? Number(b.readBigUInt64BE(o + 24)) : b.readUInt32BE(o + 16);
  return ts ? du / ts : 0;
}

const clips = {}, texts = {};
let missing = 0;
for (const lf of ledgers) {
  for (const e of JSON.parse(fs.readFileSync(lf, 'utf8'))) {
    const file = path.join(VOICE_DIR, e.id + '.m4a');
    if (!fs.existsSync(file)) { console.error('ファイルが無い: ' + e.id); missing++; continue; }
    clips[e.id] = { f: e.id + '.m4a', d: Math.round(m4aDuration(file) * 100) / 100 };
    for (const t of [e.text, e.display]) {
      if (!t) continue;
      const k = e.voice + '|' + norm(t);
      if (texts[k] && texts[k] !== e.id) console.error('文言が重複: ' + k + ' → ' + texts[k] + ' / ' + e.id);
      texts[k] = e.id;
    }
  }
}
const out = { version: 1, clips, texts };
fs.writeFileSync(path.join(VOICE_DIR, 'manifest.json'), JSON.stringify(out));
const n = Object.keys(clips).length;
const total = Object.values(clips).reduce((s, c) => s + c.d, 0);
console.log(`clips ${n} / texts ${Object.keys(texts).length} / 合計 ${total.toFixed(1)}秒 / 欠け ${missing}`);
