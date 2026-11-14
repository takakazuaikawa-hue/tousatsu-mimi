// 見えている文字とボタンの「隠れ・切れ・画面外・小さすぎ」を測る。window.__qaLayout.scan() を呼ぶ。
(() => {
  const OVERLAY_ROOT = '[class*="overlay"], [class*="modal"], .rico-cutin, .chapter-banner, .episode-overlay, .intermission-overlay, .toast, .toast-big, [class*="cutin"], [class*="banner"], .tutorial-bubble';
  const vis = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      n = n.parentElement;
    }
    return true;
  };
  const desc = (el) => {
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  const layerOf = (el) => el.closest(OVERLAY_ROOT) || document.getElementById('app') || document.body;
  const scaleOf = (el) => { const r = el.getBoundingClientRect(); return el.offsetWidth ? r.width / el.offsetWidth : 1; };
  const ownText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim().length > 0);
  const DISPLAY_FONT = /Bebas|Anton|Oswald/i;

  const isTransparent = (el) => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const clearBg = bg === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(bg);
    return clearBg && cs.backgroundImage === 'none' && !ownText(el) && el.tagName !== 'IMG' && el.tagName !== 'VIDEO' && !el.querySelector('img,video,svg');
  };
  function scan() {
    const probeStyle = document.createElement('style');
    probeStyle.textContent = '* { pointer-events: auto !important; }';
    document.head.appendChild(probeStyle);
    try { return scanInner(); } finally { probeStyle.remove(); }
  }
  function scanInner() {
    const issues = [];
    const all = [...document.body.querySelectorAll('*')].filter(el => ownText(el) && vis(el));
    for (const el of all) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const t = txt(el);
      // 画面外
      if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1) {
        const out = Math.max(r.right - innerWidth, r.bottom - innerHeight, -r.left, -r.top);
        if (out > 3) issues.push({ kind: 'offscreen', el: desc(el), text: t, px: Math.round(out) });
      }
      // 切れ（はみ出しを隠している箱の中で）
      const clipX = /(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis';
      const clipY = /(hidden|clip)/.test(cs.overflowY) || cs.webkitLineClamp !== 'none';
      const fs = parseFloat(cs.fontSize) || 14;
      if (clipX && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) issues.push({ kind: 'clipped-x', el: desc(el), text: t, over: el.scrollWidth - el.clientWidth });
      if (clipY && el.scrollHeight > el.clientHeight + Math.max(4, fs * 0.4) && el.clientHeight > 0 && !DISPLAY_FONT.test(cs.fontFamily)) issues.push({ kind: 'clipped-y', el: desc(el), text: t, over: el.scrollHeight - el.clientHeight });
      // 隠れ（同じ層の別要素に覆われている）
      const pts = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.2], [0.5, 0.8]];
      let covered = 0, by = null;
      for (const [fx, fy] of pts) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const h = document.elementFromPoint(x, y);
        if (!h || h === el || el.contains(h) || h.contains(el)) continue;
        if (isTransparent(h)) continue;
        if (layerOf(h) !== layerOf(el)) continue; // モーダル越しは意図どおり
        covered++; by = h;
      }
      if (covered >= 3) issues.push({ kind: 'covered', el: desc(el), text: t, by: by ? desc(by) + ' "' + txt(by).slice(0, 20) + '"' : '' });
      // 実効の文字サイズ
      const eff = fs * scaleOf(el);
      if (eff < 9.5) issues.push({ kind: 'tiny-text', el: desc(el), text: t, px: +eff.toFixed(1) });
    }
    // 押す対象の大きさと画面外
    const btns = [...document.querySelectorAll('button, [data-action], .choice-btn, [role="button"]')].filter(el => vis(el) && !el.disabled);
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if ((r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1) && r.width * r.height < innerWidth * innerHeight * 0.15) issues.push({ kind: 'button-offscreen', el: desc(b), text: txt(b) });
      else if (Math.min(r.width, r.height) < 24) issues.push({ kind: 'small-target', el: desc(b), text: txt(b), px: Math.round(Math.min(r.width, r.height)) });
    }
    return issues;
  }
  window.__qaLayout = { scan };
})();
