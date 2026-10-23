// スマホ版の基準（docs/design-ref/mobile-standard.md）で1画面を測る式を作る。page.eval(stdCheck({...})) で使う。
// 数えるもの：
//   covered  見えているのに他の物に隠れて押せない
//   small    押す所 44px 未満
//   tiny     文字が minText 未満（スマホ 12px／PC 11px）
//   body     本文（台詞・説明・ルール）が bodyMin（14px）未満。本文＝BODY_SEL に当たる所、または 30 字以上の文
//   safe     左右の安全域（各 47px）に入っている押す所・読む文字（ノッチ付き iPhone で欠ける）
//   off      画面の外にはみ出している押す所・文字（下や横で切れている）
//   clip     文字が親の overflow で一部だけ切れている（スクロールできない箱の中）
//   bar      左右の端が黒い帯（舞台の外の body）になっている
//   broken   壊れた画像
export const BODY_SEL = [
  '.opponent-speech', '.rico-bubble', '.v2-com-text', '.status-note', '.rb-quote', '.rb-rico-line', '.hr-line', '.result-next-goal',
  '.psych-question', '.psych-situation', '.psych-speech', '.mb-speech', '.mb-coach-line', '.ob-evtext',
  '.dialogue-text', '.ep-text', '.story-text', '.modal-desc', '.shop-desc', '.item-desc', '.profile-desc', '.glossary-desc',
  '.mp-msg', '.as-sub', '.as-say', '.settings-desc', '.tut-text', '.hint-text',
].join(',');

export function stdCheck({ minText = 12, bodyMin = 14, safe = 47, phone = true } = {}) {
  return `(() => {
  const VW = innerWidth, VH = innerHeight, SAFE = ${phone ? safe : 0}, MIN = ${minText}, BODY = ${phone ? bodyMin : 0};
  const BODY_SEL = ${JSON.stringify(BODY_SEL)};
  const vis = (e) => { for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const scaleOf = (e) => { let x = e; while (x && !(x.offsetWidth > 0)) x = x.parentElement; if (!x) return 1; return x.getBoundingClientRect().width / x.offsetWidth; };
  const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.title || (typeof e.className === 'string' ? e.className : '') || '').replace(/\\s+/g, ' ').trim()).slice(0, 24);
  const cls = (e) => (e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : ''));
  // 画面の大半を覆う別の層（小窓・全画面の演出）の下に隠れている物は、利用者に見えないので数えない
  const underModal = (el, x, y) => { const h = document.elementFromPoint(Math.min(VW - 1, Math.max(0, x)), Math.min(VH - 1, Math.max(0, y))); if (!h || h === el || el.contains(h) || h.contains(el)) return false;
    for (let a = h; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { if (a.contains(el)) return false; const r = a.getBoundingClientRect(); if (r.width * r.height >= 0.6 * VW * VH) return true; } return false; };
  const taps = [...document.querySelectorAll('button, [data-action], [data-as], [data-mp], [role=button], a[href], input, select')].filter(e => !e.disabled && vis(e));
  const covered = [], small = [], off = [], safeHit = [];
  for (const e of taps) {
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= VW || r.top >= VH) { continue; }
    if (getComputedStyle(e).pointerEvents === 'none') continue;
    // 縦や横に流せる箱の中で、流した先にある物（今は箱の外）は数えない
    { let away = false; for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (!/auto|scroll/.test(c.overflowY + c.overflowX)) continue; if (x.scrollHeight <= x.clientHeight + 2 && x.scrollWidth <= x.clientWidth + 2) continue; const b = x.getBoundingClientRect(); if (r.bottom > b.bottom + 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.left < b.left - 1) { away = true; break; } } if (away) continue; }
    const cx = Math.min(VW - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(VH - 1, Math.max(0, r.top + r.height / 2));
    const t = document.elementFromPoint(cx, cy);
    if (underModal(e, cx, cy)) continue;
    if (t && t !== e && !e.contains(t) && !t.contains(e)) covered.push(label(e) + ' ← ' + cls(t));
    if (r.width < 43.5 || r.height < 43.5) small.push(label(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) off.push(label(e) + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + '-' + Math.round(r.right) + ',' + Math.round(r.bottom));
    // 画面いっぱいの「どこでも押せる」層は安全域の検査から外す
    if (SAFE && r.width < VW * 0.7 && (r.left < SAFE - 1 || r.right > VW - SAFE + 1)) safeHit.push('[押] ' + label(e) + ' x' + Math.round(r.left) + '-' + Math.round(r.right));
  }
  const tiny = [], body = [], clip = [], offText = [];
  // 2026-10-21 快適さの測定：大きさ（画面上 px を四捨五入）ごとの字数。補足の段以下の割合と、表にない大きさを後で出す
  const dist = {}; const bySel = {};
  // 2026-10-21 折れの検査（わざと枠の外に重ねる飾り＝position:absolute の子は、はみ出しに数えない）：wrap＝短い名前（12字以内）が2行以上／orphan＝最後の行が2字以下（3行目以降の長文は除かず数える）／overflowBox＝ボタンの中の文字がボタンより広い
  const wrap = [], orphan = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const seen = new Set();
  while ((n = tw.nextNode())) {
    const t = n.textContent.replace(/\\s+/g, ' ').trim(); const el = n.parentElement; if (!t || !el || seen.has(el) || !vis(el)) continue;
    if (el.closest('script,style,noscript,[aria-hidden="true"]')) continue;
    { const d = el.closest('details:not([open])'); if (d && !el.closest('summary')) continue; }
    seen.add(el);
    const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width >= 2 && r.height >= 2); if (!rs.length) continue;
    const rr = rs[0], last = rs[rs.length - 1];
    if (rr.right <= 0 || rr.bottom <= 0 || rr.left >= VW || rr.top >= VH) continue;
    // 親の overflow で完全に隠れている文字は数えない／一部だけ切れているものは clip
    let hidden = false, part = false;
    for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) {
      const c = getComputedStyle(x); if (c.overflow === 'visible' && c.overflowY === 'visible' && c.overflowX === 'visible') continue;
      const b = x.getBoundingClientRect();
      if (rr.bottom <= b.top + 1 || rr.top >= b.bottom - 1 || rr.right <= b.left + 1 || rr.left >= b.right - 1) { hidden = true; break; }
      const scrollable = /auto|scroll/.test(c.overflowY + c.overflowX) && (x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2);
      if (!scrollable && (last.bottom > b.bottom + 2 || rr.top < b.top - 2) && t.length > 1 && el.scrollHeight <= el.clientHeight + 2) part = true;
    }
    if (hidden) continue;
    if (underModal(el, (rr.left + rr.right) / 2, (rr.top + rr.bottom) / 2)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    const lab = t.slice(0, 16) + ' ' + px.toFixed(1) + ' ' + cls(el);
    dist[Math.round(px)] = (dist[Math.round(px)] || 0) + t.length;
    { const full = (el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/s+/).slice(0, 2).join('.') : '')) + (el.parentElement && typeof el.parentElement.className === 'string' && el.parentElement.className.trim() ? ' < ' + el.parentElement.className.trim().split(/s+/)[0] : ''); const k = full + ' @' + Math.round(px); const b = bySel[k] || (bySel[k] = { n: 0, ex: t.slice(0, 14) }); b.n += t.length; }
    if (px < MIN - 0.15) tiny.push(lab);
    else if (BODY && px < BODY - 0.15 && (el.closest(BODY_SEL) || (t.length >= 30 && el.tagName !== 'SMALL' && !/note|hint|cap|sub|tag|legal|small/i.test(typeof el.className === 'string' ? el.className : '')))) body.push(lab);
    if (part) clip.push(lab);
    { const lines = []; for (const q of rs) { const l = lines.find(z => Math.abs(z.top - q.top) < q.height * 0.5); if (l) { l.w += q.width; } else lines.push({ top: q.top, w: q.width }); }
      const pxw = px || 14;
      const csw = getComputedStyle(el); const vertical = /vertical/.test(csw.writingMode) || el.getBoundingClientRect().width < pxw * 1.6; const labelish = !!el.closest('button, [role=button], [data-action], th, td, label, h1, h2, h3, h4, .btn, [class*=lbl], [class*=label], [class*=title], [class*=name], [class*=tag]');
      if (!vertical && labelish && lines.length >= 2 && t.length <= 12 && n.textContent.trim().indexOf(String.fromCharCode(10)) < 0) wrap.push(lab + ' ' + lines.length + '行');
      else if (lines.length >= 2 && lines[lines.length - 1].w < pxw * 2.6 && t.length > 3) orphan.push(lab + ' 最後の行 約' + Math.round(lines[lines.length - 1].w / pxw) + '字'); }
    let L = Math.min(...rs.map(r => r.left)), R = Math.max(...rs.map(r => r.right)), T = rr.top, B = Math.max(...rs.map(r => r.bottom));
    // 自分か親が overflow で切っている所（… で省いた文字など）は、その箱の中だけを見る
    for (let x = el; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.overflowX === 'visible' && c.overflowY === 'visible') continue; const b = x.getBoundingClientRect(); L = Math.max(L, b.left); R = Math.min(R, b.right); T = Math.max(T, b.top); B = Math.min(B, b.bottom); }
    if (L < -1 || T < -1 || R > VW + 1 || B > VH + 1) offText.push(t.slice(0, 16) + ' ' + Math.round(L) + ',' + Math.round(T) + '-' + Math.round(R) + ',' + Math.round(B));
    if (SAFE && (L < SAFE - 1 || R > VW - SAFE + 1) && px < 40) safeHit.push('[字] ' + t.slice(0, 16) + ' x' + Math.round(L) + '-' + Math.round(R));
  }
  // 左右の端（x=2 と x=VW-3）を、絵・色の付いた背景が縦の半分以上覆っているか（覆っていなければ黒い帯）
  const bar = [];
  if (${phone}) {
    const paints = (e) => { const c = getComputedStyle(e); if (/^(IMG|VIDEO|CANVAS|IFRAME)$/.test(e.tagName)) return true; if (c.backgroundImage !== 'none') return true; const m = c.backgroundColor.match(/[\\d.]+/g); return !!m && (m.length < 4 || +m[3] > 0.5) && (+m[0] + +m[1] + +m[2]) > 24; };
    const cands = [...document.querySelectorAll('#stage *, body > *')].filter(e => { const r = e.getBoundingClientRect(); return r.height >= VH * 0.5 && r.width > 20 && vis(e); });
    for (const x of [2, VW - 3]) { if (!cands.some(e => { const r = e.getBoundingClientRect(); return r.left <= x && r.right >= x + 1 && paints(e); })) bar.push(x < VW / 2 ? '左' : '右'); }
  }
  // トランプの札（.card で幅のある物）の画面上の幅：一番小さい物
  const cardWs = [...document.querySelectorAll('.card, .mp-card, .hr-pcard')].filter(e => vis(e)).map(e => e.getBoundingClientRect()).filter(r => r.width >= 8 && r.right > 0 && r.left < VW && r.bottom > 0 && r.top < VH).map(r => Math.round(r.width));
  const overflowBox = [];
  for (const e of taps) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.right <= 0 || r.left >= VW || r.bottom <= 0 || r.top >= VH) continue; if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible') overflowBox.push(label(e) + ' 文字幅' + e.scrollWidth + '>' + e.clientWidth); else { const kids = [...e.querySelectorAll('*')].filter(k => k.getClientRects().length && !/absolute|fixed/.test(getComputedStyle(k).position) && ![...e.querySelectorAll('*')].some(p => p.contains(k) && p !== k && /absolute|fixed/.test(getComputedStyle(p).position))); for (const k of kids) { const kr = k.getBoundingClientRect(); if (kr.width > 2 && (kr.right > r.right + 2 || kr.left < r.left - 2)) { overflowBox.push(label(e) + ' 中身がはみ出し ' + Math.round(kr.right - r.right) + 'px'); break; } } } }
  const broken = [...document.images].filter(im => im.src && vis(im) && im.complete && !im.naturalWidth).map(im => im.src.split('/').slice(-2).join('/'));
  return { screen: (typeof state !== 'undefined' && state) ? state.screen : '', covered, small, off: [...off, ...offText], tiny, body, safe: safeHit, clip, bar, broken, scrollX: document.documentElement.scrollWidth > VW, dist, bySel, wrap, orphan, overflowBox, cardMin: cardWs.length ? Math.min(...cardWs) : null };
})()`;
}

export const KEYS = ['covered', 'small', 'tiny', 'body', 'safe', 'off', 'clip', 'bar', 'broken', 'wrap', 'orphan', 'overflowBox'];
export const countsOf = (r) => Object.fromEntries(KEYS.map(k => [k, (r[k] || []).length]));

// 快適さのまとめ：補足の段（note 以下）の字数の割合、表にない大きさ（allowed の ±0.6 に入らず、display 未満の物）の字数
export function comfortOf(r, { note = 14, allowed = [14, 16, 17, 19, 20], display = 24 } = {}) {
  const d = r.dist || {}; let tot = 0, small = 0, odd = 0; const oddSizes = {};
  for (const [k, v] of Object.entries(d)) { const px = +k; tot += v; if (px <= note + 0.5) small += v; if (px < display && !allowed.some(a => Math.abs(a - px) <= 0.6)) { odd += v; oddSizes[px] = v; } }
  return { chars: tot, noteShare: tot ? Math.round(small / tot * 100) : 0, oddShare: tot ? Math.round(odd / tot * 100) : 0, oddSizes, cardMin: r.cardMin };
}
