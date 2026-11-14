// 文字の切れ・もぐりを数える（2026-11-01 外部の批評で、14px 以上・はみ出し0 の検査を通った画面でも、結論の文がボタンに隠れていた）。
// window.__clipText(root) → [{ t, why, px }]
//   why='切れ'：文字の箱が、overflow で切る親（hidden/auto/scroll）の見える範囲から 2px 以上はみ出している（スクロールで見られる親は除く）
//   why='もぐり'：文字の箱の中心で、一番上にある物が別の押す所（button など）や不透明な部品
window.__clipText = function (root) {
  root = root || document.body;
  const out = [], seen = new Set();
  const vis = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > .05; };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement; const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!p || !t || seen.has(p)) continue; seen.add(p);
    let ok = true; for (let e = p; e && e !== document.body; e = e.parentElement) if (!vis(e)) { ok = false; break; }
    if (!ok) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // 切れ：切る親
    for (let a = p.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const clipX = /hidden|clip/.test(cs.overflowX), clipY = /hidden|clip/.test(cs.overflowY);
      if (!clipX && !clipY) continue;
      const ar = a.getBoundingClientRect();
      const over = Math.max(clipY ? r.bottom - ar.bottom : 0, clipY ? ar.top - r.top : 0, clipX ? r.right - ar.right : 0, clipX ? ar.left - r.left : 0);
      if (over > 2 && ar.width > 4 && ar.height > 4) { out.push({ t: t.slice(0, 24), why: '切れ', px: Math.round(over), by: String(a.className || a.tagName).slice(0, 30) }); break; }
    }
    // もぐり：中心と左右の端の3点で、一番上の物が自分でも先祖でもなく、押す所か不透明な部品
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 3, r.top + r.height / 2], [r.right - 3, r.top + r.height / 2]];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (!top || top === p || p.contains(top) || top.contains(p)) continue;
      const btn = top.closest('button, [role=button], .btn');
      const bg = getComputedStyle(top);
      const opaque = btn || (bg.backgroundColor && !/rgba\(.*,\s*0(\.\d+)?\)|transparent/.test(bg.backgroundColor) && parseFloat(bg.opacity) > .5);
      if (opaque && !(btn && btn.contains(p))) { out.push({ t: t.slice(0, 24), why: 'もぐり', px: 0, by: String(top.className || top.tagName).slice(0, 30) }); break; }
    }
  }
  return out;
};
