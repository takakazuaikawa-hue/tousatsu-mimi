#!/usr/bin/env node
// 通しプレイ検査：新規セーブ（または注入セーブ）から Bot で遊び、例外・停止・二重オーバーレイ・レイアウト不備を集める。
// 使い方: node qa/smoke.mjs --policy learner --until ending --speed 10 --size 1280x800 --seed 1 --out qa/out/run1
//   --until: ending | stage:<id> | hands:<n> | lobby | intro
//   --save <file.json>: 始点のセーブを注入   --mobile: タッチ端末として扱う   --layout: 画面が変わるたびに検出器を回す
import fs from 'node:fs';
import path from 'node:path';
import { openSession, sleep, REPO } from './lib/session.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const policy = args.policy || 'learner';
const until = args.until || 'ending';
const speed = +(args.speed || 10);
const [W, H] = String(args.size || '1280x800').split('x').map(Number);
const seed = +(args.seed || 1);
const maxMin = +(args.minutes || 20);
const outDir = path.resolve(REPO, args.out || `qa/out/smoke-${policy}-${W}x${H}-s${seed}`);
const tickMs = +(args.tick || 90);
const stuckMs = +(args.stuck || 12000);
fs.mkdirSync(outDir, { recursive: true });

const save = args.save ? JSON.parse(fs.readFileSync(path.resolve(REPO, args.save), 'utf8')) : null;
const sess = await openSession({ width: W, height: H, mobile: !!args.mobile, speed, seed, save, clear: true, probes: ['bot.js', 'layout.js'] });
const { page } = sess;

const report = { policy, until, speed, size: `${W}x${H}`, seed, startedAt: new Date().toISOString(), steps: 0, events: [], errors: [], stuck: [], dups: [], layout: [], text: [], clicks: {}, done: false, reason: '' };
const layoutSeen = new Set();
const dupSeen = new Set();
let lastSig = '', lastChange = Date.now(), sameClick = 0, lastClickKey = '';
const t0 = Date.now();
let shotN = 0;

function reached(snap) {
  if (!snap) return false;
  if (until === 'ending') return snap.ending && snap.screen === 'lobby';
  if (until === 'lobby') return snap.screen === 'lobby';
  if (until === 'intro') return snap.screen === 'lobby' && !snap.intro;
  if (until.startsWith('stage:')) return snap.cleared.includes(until.slice(6));
  if (until.startsWith('hands:')) return report.handsSeen >= +until.slice(6);
  return false;
}

report.handsSeen = 0;
let lastHandKey = '';
try {
  while (Date.now() - t0 < maxMin * 60000) {
    let res;
    try { res = await page.eval(`window.__qaBot ? window.__qaBot.step(${JSON.stringify(policy)}) : null`); }
    catch (e) { report.events.push({ t: Date.now() - t0, kind: 'eval-error', msg: String(e.message).slice(0, 300) }); await sleep(300); continue; }
    if (!res) { await sleep(200); continue; }
    report.steps++;
    const snap = res.snap;
    const hk = `${snap.opp}#${snap.hand}`;
    if (snap.screen === 'battle' && snap.hand && hk !== lastHandKey) { lastHandKey = hk; report.handsSeen++; }
    if (res.dup && res.dup.length) for (const d of res.dup) { const k = d + '@' + snap.screen; if (!dupSeen.has(k)) { dupSeen.add(k); report.dups.push({ t: Date.now() - t0, dup: d, snap }); await page.screenshot(path.join(outDir, `dup-${++shotN}.png`)); } }
    if (res.sig !== lastSig) {
      // 画面が変わった：レイアウト検出と文字の採取
      if (args.layout) {
        const key = [snap.screen, snap.phase, snap.intro, snap.lecture, res.sig.split('|').pop()].join('/');
        if (!layoutSeen.has(key)) {
          layoutSeen.add(key);
          await sleep(250 / Math.min(speed, 4));
          const issues = await page.eval('window.__qaLayout.scan()').catch(() => []);
          for (const is of issues) report.layout.push({ ...is, at: key });
        }
      }
      const tx = await page.eval('window.__qaBot.collectText()').catch(() => []);
      for (const x of tx) report.text.push({ ...x, at: `${snap.screen}/${snap.opp}/${snap.phase}/${snap.intro ? 'intro' : snap.lecture ? 'lecture' : 'main'}` });
      lastSig = res.sig; lastChange = Date.now(); sameClick = 0;
    }
    if (reached(snap)) { report.done = true; report.reason = 'reached ' + until; break; }
    if (res.did) {
      const key = res.did.what;
      report.clicks[res.did.why.split(':')[0] + ' ' + key.slice(0, 70)] = (report.clicks[res.did.why.split(':')[0] + ' ' + key.slice(0, 70)] || 0) + 1;
      sameClick = key === lastClickKey && res.sig === lastSig ? sameClick + 1 : 0;
      lastClickKey = key;
      if (args.verbose) console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${snap.screen}/${snap.phase} ${res.did.why} → ${res.did.what}`);
      await page.click(res.did.x, res.did.y);
      if (sameClick > 30) {
        report.stuck.push({ t: Date.now() - t0, kind: 'dead-click', what: key, snap, cands: await page.eval('window.__qaBot.candidates()').catch(() => []) });
        await page.screenshot(path.join(outDir, `stuck-${++shotN}.png`));
        report.reason = 'dead-click'; break;
      }
    }
    if (Date.now() - lastChange > stuckMs) {
      report.stuck.push({ t: Date.now() - t0, kind: 'no-progress', snap, sig: res.sig, cands: await page.eval('window.__qaBot.candidates()').catch(() => []) });
      await page.screenshot(path.join(outDir, `stuck-${++shotN}.png`));
      report.reason = 'no-progress'; break;
    }
    await sleep(tickMs);
  }
  if (!report.done && !report.reason) report.reason = 'timeout';
  const qa = await page.eval('window.__QA').catch(() => ({}));
  report.errors = (qa.errors || []).concat(sess.exceptions.map(e => ({ type: 'exception', msg: e.desc || e.text, src: `${e.url}:${e.line}` })));
  report.dialogs = sess.dialogs;
  report.final = await page.eval('window.__qaBot.snapshot()').catch(() => null);
  await page.screenshot(path.join(outDir, 'final.png'));
} finally {
  report.elapsedSec = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  await sess.close();
}

const errU = [...new Set(report.errors.map(e => (e.msg || '').split('\n')[0]))];
console.log(JSON.stringify({
  policy, size: report.size, seed, done: report.done, reason: report.reason, elapsedSec: report.elapsedSec, steps: report.steps, hands: report.handsSeen,
  final: report.final && { screen: report.final.screen, opp: report.final.opp, cleared: report.final.cleared, coins: report.final.coins },
  errors: errU.length, dups: report.dups.map(d => d.dup + '@' + d.snap.screen), stuck: report.stuck.map(s => s.kind + ' ' + (s.what || s.sig || '')),
  dialogs: (report.dialogs || []).map(d => d.message.slice(0, 40)), layoutIssues: report.layout.length, out: path.relative(REPO, outDir),
}, null, 1));
if (errU.length) console.log('ERRORS:\n  ' + errU.slice(0, 15).join('\n  '));
