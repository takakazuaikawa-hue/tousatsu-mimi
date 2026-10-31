// 画面に見えている文字を全部拾い、画面上の実寸（縮めて描く舞台・zoom 込み）を部品（class）ごとに返す。
// 文字の要素の中に 100px の印を置き、画面での幅から倍率を出す（typeaudit.mjs と同じ測り方）。
// 2026-10-29 追加：段のそろいを全画面で測る（qa/tiercheck.mjs が読む）。
export const TEXTS = `(() => {
  const res = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set(); let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement; const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!p || !t || seen.has(p) || p.closest('script,style')) continue;
    const r = p.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
    let vis = true; for (let e = p; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < .05) { vis = false; break; } } if (!vis) continue;
    seen.add(p);
    const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:1px;display:inline-block;padding:0;border:0;margin:0';
    p.appendChild(m); const k = m.getBoundingClientRect().width / 100; m.remove();
    const px = parseFloat(getComputedStyle(p).fontSize) * k;
    // 部品の名前：タグ＋全部の class（例 span.gl-section-count）。template の中なので \\s と書く（\s だと s で切れていた）
    const c1 = (e) => !e ? '' : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
    const cls = c1(p) + ' < ' + c1(p.parentElement);
    const over = p.scrollWidth > p.clientWidth + 2 && getComputedStyle(p).overflow !== 'visible';
    res.push({ cls, px: Math.round(px * 10) / 10, k: Math.round(k * 1000) / 1000, t: t.slice(0, 18), over });
  }
  return res;
})()`;
