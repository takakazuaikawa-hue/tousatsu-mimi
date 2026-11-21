// ゲームパッドで全画面を遊べるようにする（2026-11-21 ユーザー「ゲームパッドでの操作も対応させてね」）
// 十字キー・左スティック＝押せる物を選ぶ（向きに一番近い物へ）／A＝決定／B＝戻る・閉じる／Start＝決定と同じ
// 押せる物は「画面に見えていて、上に別の層が重なっていない」ボタン類だけ（elementFromPoint で確かめる）。
// ぱにゅぱにゅの網目（iframe）は自分でゲームパッドを読むので、開いている間はこちらは何もしない。
(function () {
  if (!navigator.getGamepads) return;
  const SEL = 'button, a[href], [data-action], [role="button"], input[type="range"], select, .mp-card.mp-tap, [tabindex]:not([tabindex="-1"])';
  let cur = null, raf = 0, prev = {}, held = {}, padMode = false;

  function visibleTop(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || +cs.opacity < 0.1) return false;
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  }
  function cands() {
    return [...document.querySelectorAll(SEL)].filter(el => !el.closest('[hidden], .pad-skip') && visibleTop(el))
      // 入れ子（ボタンの中の data-action など）は外側だけ
      .filter((el, _, a) => !a.some(o => o !== el && o.contains(el)));
  }
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  function setCur(el) {
    if (cur) cur.classList.remove('pad-focus');
    cur = el;
    if (!el) return;
    el.classList.add('pad-focus');
    try { el.focus({ preventScroll: true }); } catch (_) {}
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
  }
  function ensureCur() {
    const list = cands();
    if (cur && list.includes(cur)) return list;
    // 主役のボタン（btn-primary・配る・引く など）があればそこから
    const pri = list.find(el => /primary|deal|draw|start|btn-go|mp-btn-deal/.test(el.className)) || list[0];
    setCur(pri || null);
    return list;
  }
  function move(dx, dy) {
    const list = ensureCur();
    if (!cur) return;
    if (cur.matches('input[type="range"]') && dx) {   // つまみは左右で値を動かす
      const st = +cur.step || 1; cur.value = +cur.value + dx * st * 5;
      cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const [cx, cy] = center(cur);
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const [x, y] = center(el), vx = x - cx, vy = y - cy;
      const along = vx * dx + vy * dy;            // 向きに沿った距離
      if (along <= 4) continue;
      const side = Math.abs(vx * dy - vy * dx);   // 横ずれ
      const s = along + side * 2.2;
      if (s < bs) { bs = s; best = el; }
    }
    if (best) setCur(best);
  }
  function press() {
    ensureCur();
    if (!cur) return;
    if (cur.matches('select')) { cur.focus(); return; }
    cur.click();
  }
  function back() {
    // 一番上に見えている窓の「閉じる・やめる・戻る」。見えている物の中で DOM の後ろ（＝上に重なった窓）を優先
    const isClose = (el) => el.matches('[class*="close"], [data-action$="-cancel"], [data-action*="close"], [data-action="back"], [title="閉じる"], [title="やめる"], [aria-label="閉じる"]')
      || /^(×|✕|閉じる|やめる|戻る|キャンセル|ロビーへ戻る)$/.test((el.innerText || '').trim());
    const close = cands().filter(isClose).pop();
    if (close) { close.click(); return; }
    const t = document.activeElement || document.body;
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }
  function panyuOpen() { return !!document.querySelector('.panyu-clicker-overlay iframe'); }

  function tick(t) {
    raf = 0;
    const pads = [...navigator.getGamepads()].filter(Boolean);
    if (!pads.length) return;
    raf = requestAnimationFrame(tick);
    if (panyuOpen() || document.hidden) { prev = {}; return; }
    const p = pads[0], b = (i) => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const now = {
      up: b(12) || ay < -0.55, down: b(13) || ay > 0.55, left: b(14) || ax < -0.55, right: b(15) || ax > 0.55,
      a: b(0), b: b(1), start: b(9),
    };
    const fire = (k, fn) => {
      if (now[k] && !prev[k]) { held[k] = t + 380; fn(); padOn(); }
      else if (now[k] && t > (held[k] || 0) && /up|down|left|right/.test(k)) { held[k] = t + 110; fn(); }
    };
    fire('up', () => move(0, -1)); fire('down', () => move(0, 1)); fire('left', () => move(-1, 0)); fire('right', () => move(1, 0));
    fire('a', press); fire('start', press); fire('b', back);
    prev = now;
  }
  function padOn() { if (!padMode) { padMode = true; document.documentElement.classList.add('is-pad'); } }
  function padOff() { if (padMode) { padMode = false; document.documentElement.classList.remove('is-pad'); setCur(null); } }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  addEventListener('gamepadconnected', start);
  addEventListener('mousemove', padOff, { passive: true });
  addEventListener('touchstart', padOff, { passive: true });
  try { if ([...navigator.getGamepads()].some(Boolean)) start(); } catch (_) {}
  window.MimiPad = { move, press, back, cands: () => cands().length };   // 検査用
})();
