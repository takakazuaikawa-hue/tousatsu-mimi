// 文字の大きさの指定ごとに「画面に何 px で出たか」を記録する（2026-10-30 ユーザー「コードを全体でチェックした方が」「両方やった方が」）。
// 1.2 秒ごとに、読み込まれた全部の CSS の規則のうち font-size（font の一括指定を含む）を書いたものを調べ、
// 今その規則が当たっていて見えている要素の、画面上の文字の大きさ（縮めて描く倍率をかけた実寸）の最小を残す。
// 結果は window.__FS（キー＝ファイル名 + 選択子）。検査の最後に読み出す。
(function () {
  const FS = window.__FS = {};
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return 0; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return 0; return r; };
  const hasText = (e) => { for (const n of e.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; };
  const scaleOf = (e, r) => (e.offsetHeight ? r.height / e.offsetHeight : 1);
  function walk(rules, file, out) {
    for (const r of rules) {
      if (r.cssRules && r.media) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, file, out); continue; }
      if (r.cssRules && !r.selectorText) { walk(r.cssRules, file, out); continue; }
      if (!r.selectorText || !r.style) continue;
      if (!r.style.fontSize) continue;
      out.push([file, r.selectorText, r.style.fontSize]);
    }
  }
  function scan() {
    const list = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (_) { continue; }
      const file = sh.href ? sh.href.split('/').pop().split('?')[0] : (sh.ownerNode && sh.ownerNode.dataset && sh.ownerNode.dataset.src) || 'inline-style';
      walk(rules, file, list);
    }
    for (const [file, sel, val] of list) {
      const key = file + ' ｜ ' + sel;
      const rec = FS[key] || (FS[key] = { val, seen: 0, min: null, minText: '' });
      let els; try { els = document.querySelectorAll(sel); } catch (_) { continue; }
      for (const e of els) {
        if (!hasText(e)) continue;
        const r = vis(e); if (!r) continue;
        const px = parseFloat(getComputedStyle(e).fontSize) * scaleOf(e, r);
        rec.seen++;
        if (rec.min == null || px < rec.min) { rec.min = Math.round(px * 10) / 10; rec.minText = (e.textContent || '').trim().slice(0, 14); }
        if (rec.seen > 400) break;
      }
    }
  }
  // 文字そのものが小さく見える要素（どの規則で決まったかは問わない）も残す：インラインの style や継いだ大きさで小さくなった所
  const SMALL = window.__FS_SMALL = {};
  function scanSmall() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.trim(); if (!t || /^[✦✕✓×・\-—–…\s]+$/.test(t)) continue;
      const e = n.parentElement; if (!e || e.closest('script,style,noscript')) continue;
      const r = vis(e); if (!r) continue;
      const px = parseFloat(getComputedStyle(e).fontSize) * scaleOf(e, r);
      if (px < 13.95) { const k = (e.className || e.tagName).toString().slice(0, 40) + ' ' + (Math.round(px * 10) / 10); if (!SMALL[k]) SMALL[k] = { px: Math.round(px * 10) / 10, text: t.slice(0, 20), inline: !!e.getAttribute('style') && /font/.test(e.getAttribute('style')), where: (e.closest('[class]') && e.closest('[class*="-screen"],[class*="-overlay"],[class*="host"],.read-battle-host,#stage > *')?.className || '').toString().slice(0, 40) }; }
    }
  }
  setInterval(() => { try { scan(); scanSmall(); } catch (_) {} }, 1200);
})();
