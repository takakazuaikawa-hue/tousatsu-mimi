// =============================================================
// baccarat-squeeze.js — バカラの「絞り」：伏せた札の端を指でめくって、数を少しずつ読む。
// どの辺・どの角からでもめくれる（短い辺から＝足を見る／長い辺から＝横の数を見る）。離すと札は戻るが、見えた所は覚えている。
// 絞りの札には角の数字が無い（マークの数と並びだけで読む）。開き切ると onOpen。
// 見えたマークの位置から「まだあり得る数」を出して onSeen で知らせる（画面は候補の札を消していく）。
// 外に出す名前は window.BaccaratSqueeze だけ。キャンバス1枚・指が動いた時だけ描く（待っている間は何も回さない）。
// =============================================================
(function () {
  'use strict';

  // ---- マークの置き場所（表向き・縦の札。x,y は札の幅・高さを1とした位置） ----
  const L = 0.27, C = 0.5, R = 0.73;
  const PIPS = {
    1: [[C, .5]],
    2: [[C, .17], [C, .83]],
    3: [[C, .17], [C, .5], [C, .83]],
    4: [[L, .17], [R, .17], [L, .83], [R, .83]],
    5: [[L, .17], [R, .17], [C, .5], [L, .83], [R, .83]],
    6: [[L, .17], [R, .17], [L, .5], [R, .5], [L, .83], [R, .83]],
    7: [[L, .17], [R, .17], [C, .335], [L, .5], [R, .5], [L, .83], [R, .83]],
    8: [[L, .17], [R, .17], [C, .335], [L, .5], [R, .5], [C, .665], [L, .83], [R, .83]],
    9: [[L, .17], [R, .17], [L, .39], [R, .39], [C, .5], [L, .61], [R, .61], [L, .83], [R, .83]],
    10: [[L, .17], [R, .17], [C, .28], [L, .39], [R, .39], [L, .61], [R, .61], [C, .72], [L, .83], [R, .83]],
  };
  // 読みの手がかりにする場所。中央の上（7・8 の .335 と 10 の .28）と下は近すぎて見分けられないので1つにまとめる
  const SLOTS = [
    ['Lt', L, .17], ['Rt', R, .17], ['Lb', L, .83], ['Rb', R, .83],
    ['Lm', L, .5], ['Rm', R, .5], ['Lu', L, .39], ['Ru', R, .39], ['Ld', L, .61], ['Rd', R, .61],
    ['Ct', C, .17], ['Cb', C, .83], ['Cm', C, .5], ['Cu', C, .31], ['Cd', C, .69],
  ];
  // 絵札の枠（見えたら絵札と分かる）。枠の上の点
  const FRAME = { x0: .13, y0: .09, x1: .87, y1: .91 };
  const FRAME_PTS = [[.13, .09], [.5, .09], [.87, .09], [.13, .5], [.87, .5], [.13, .91], [.5, .91], [.87, .91], [.13, .3], [.87, .3], [.13, .7], [.87, .7], [.3, .09], [.7, .09], [.3, .91], [.7, .91]];
  const slotKey = (x, y) => {
    if (x === C) return y < .25 ? 'Ct' : y < .42 ? 'Cu' : y < .58 ? 'Cm' : y < .76 ? 'Cd' : 'Cb';
    const s = x < .5 ? 'L' : 'R';
    return s + (y < .25 ? 't' : y < .45 ? 'u' : y < .55 ? 'm' : y < .75 ? 'd' : 'b');
  };
  const HAS = {};
  for (let r = 1; r <= 10; r++) { HAS[r] = {}; for (const [x, y] of PIPS[r]) HAS[r][slotKey(x, y)] = 1; }

  // ---- マークの形（自前で描く：端末ごとの字形や絵文字化に左右されない） ----
  function suitPath(g, suit, s) {
    g.beginPath();
    if (suit === '♦') {
      g.moveTo(0, -s); g.quadraticCurveTo(s * .34, -s * .42, s * .72, 0); g.quadraticCurveTo(s * .34, s * .42, 0, s);
      g.quadraticCurveTo(-s * .34, s * .42, -s * .72, 0); g.quadraticCurveTo(-s * .34, -s * .42, 0, -s);
    } else if (suit === '♥') {
      g.moveTo(0, s * .95); g.bezierCurveTo(-s * .25, s * .55, -s * .98, s * .1, -s * .98, -s * .38);
      g.bezierCurveTo(-s * .98, -s * 1.02, -s * .18, -s * 1.08, 0, -s * .42);
      g.bezierCurveTo(s * .18, -s * 1.08, s * .98, -s * 1.02, s * .98, -s * .38);
      g.bezierCurveTo(s * .98, s * .1, s * .25, s * .55, 0, s * .95);
    } else if (suit === '♠') {
      g.moveTo(0, -s); g.bezierCurveTo(s * .25, -s * .58, s * .98, -s * .12, s * .98, s * .32);
      g.bezierCurveTo(s * .98, s * .86, s * .26, s * .9, s * .1, s * .46);
      g.quadraticCurveTo(s * .14, s * .82, s * .4, s); g.lineTo(-s * .4, s); g.quadraticCurveTo(-s * .14, s * .82, -s * .1, s * .46);
      g.bezierCurveTo(-s * .26, s * .9, -s * .98, s * .86, -s * .98, s * .32);
      g.bezierCurveTo(-s * .98, -s * .12, -s * .25, -s * .58, 0, -s);
    } else {
      const r = s * .43;
      g.arc(0, -s * .52, r, 0, 7); g.moveTo(-s * .5 + r, s * .14); g.arc(-s * .5, s * .14, r, 0, 7);
      g.moveTo(s * .5 + r, s * .14); g.arc(s * .5, s * .14, r, 0, 7);
      g.moveTo(-s * .12, s * .1); g.quadraticCurveTo(-s * .1, s * .78, -s * .38, s); g.lineTo(s * .38, s);
      g.quadraticCurveTo(s * .1, s * .78, s * .12, s * .1); g.closePath();
    }
  }
  function drawPip(g, suit, x, y, s, flip) {
    g.save(); g.translate(x, y); if (flip) g.rotate(Math.PI);
    suitPath(g, suit, s); g.fill(); g.restore();
  }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // 札の表（縦）を1回だけ描いておく。index＝角の数字を入れるか（絞りの間は入れない）
  function paintFace(card, w, h, index) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const red = card.suit === '♥' || card.suit === '♦';
    const ink = red ? '#b3162b' : '#17171b';
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#fffdf8'); bg.addColorStop(1, '#efe6d4');
    rrect(g, 0, 0, w, h, w * .06); g.fillStyle = bg; g.fill();
    g.fillStyle = ink; g.strokeStyle = ink;
    if (card.rank <= 10) {
      const s = card.rank === 1 ? w * .2 : w * .098;
      for (const [x, y] of PIPS[card.rank]) drawPip(g, card.suit, x * w, y * h, s, y > .5);
    } else {
      // 絵札：二重の枠＋飾りの格子＋大きな頭文字。上下どちらから見ても同じ（点対称）
      const fx = FRAME.x0 * w, fy = FRAME.y0 * h, fw = (FRAME.x1 - FRAME.x0) * w, fh = (FRAME.y1 - FRAME.y0) * h;
      g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
      g.fillStyle = red ? '#f6e3d6' : '#e9e4d6'; g.fillRect(fx, fy, fw, fh);
      g.globalAlpha = .5; g.strokeStyle = '#b8904a'; g.lineWidth = Math.max(1, w * .008);
      const st = w * .11;
      for (let i = -h; i < w + h; i += st) { g.beginPath(); g.moveTo(fx + i, fy); g.lineTo(fx + i + fh, fy + fh); g.stroke(); g.beginPath(); g.moveTo(fx + i, fy); g.lineTo(fx + i - fh, fy + fh); g.stroke(); }
      g.globalAlpha = 1;
      // 斜めの帯（人物の代わりの紋章）
      g.save(); g.translate(w / 2, h / 2); g.rotate(-.62);
      g.fillStyle = ink; g.fillRect(-w, -h * .105, w * 2, h * .21);
      g.fillStyle = '#d9b269'; g.fillRect(-w, -h * .105, w * 2, h * .014); g.fillRect(-w, h * .091, w * 2, h * .014);
      g.restore();
      g.fillStyle = '#d9b269'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${Math.round(w * .3)}px "Shippori Mincho B1","Yu Mincho",serif`;
      g.fillText(card.label, w / 2, h / 2 + w * .01);
      g.fillStyle = ink;
      drawPip(g, card.suit, fx + fw * .2, fy + fh * .13, w * .085, false);
      drawPip(g, card.suit, fx + fw * .8, fy + fh * .87, w * .085, true);
      // 冠の印（どの絵札か：J 1つ・Q 2つ・K 3つの菱）
      const n = card.rank - 10;
      for (let i = 0; i < n; i++) { drawPip(g, '♦', fx + fw * (.74 - i * .13), fy + fh * .1, w * .036, false); drawPip(g, '♦', fx + fw * (.26 + i * .13), fy + fh * .9, w * .036, true); }
      g.restore();
      g.strokeStyle = ink; g.lineWidth = Math.max(1.5, w * .012); g.strokeRect(fx, fy, fw, fh);
      g.strokeStyle = '#b8904a'; g.lineWidth = Math.max(1, w * .006); g.strokeRect(fx + w * .022, fy + w * .022, fw - w * .044, fh - w * .044);
    }
    if (index) {
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = `600 ${Math.round(w * .15)}px "Barlow Condensed","Noto Sans JP",sans-serif`;
      for (const f of [0, 1]) {
        g.save(); if (f) { g.translate(w, h); g.rotate(Math.PI); }
        g.fillStyle = '#fffdf8'; g.fillRect(0, 0, w * .125, h * .2);
        g.fillStyle = ink; g.fillText(card.label, w * .068, h * .105); drawPip(g, card.suit, w * .068, h * .155, w * .04, false);
        g.restore();
      }
    }
    return cv;
  }

  // ---- 多角形を半平面で切る（(p-m)·n >= 0 の側を残す） ----
  function clipHalf(poly, m, n, keepPos) {
    const out = [], sgn = keepPos ? 1 : -1;
    const d = (p) => ((p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]) * sgn;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], da = d(a), db = d(b);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const area = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };

  let backImg = null;
  function loadBack(src) {
    if (backImg || !src) return;
    const im = new Image(); im.onload = () => { backImg = im; }; im.src = src;
  }

  // =============================================================
  // create(canvas, opt)
  //   opt.card { suit, rank, label }／opt.landscape（横向きに置く＝3枚目）／opt.back（裏の絵の URL）
  //   opt.onSeen(info)：info = { cands:[1..13 のうち、まだあり得る数], frac:めくれた割合, newly:今回見えた手がかりの数 }
  //   opt.onOpen()：開き切った（自動で1回）／opt.onGrab()：つまんだ
  // 戻り値 { open(), destroy(), info(), demo(steps) }
  // =============================================================
  function create(canvas, opt) {
    const card = opt.card, land = !!opt.landscape;
    loadBack(opt.back);
    const g = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, cw = 0, ch = 0, x0 = 0, y0 = 0, face = null;
    let grab = null, cur = null, fold = null, opened = false, dead = false, raf = 0, spring = 0;
    const seen = {};           // 見えた手がかり（離しても覚えている）
    let seenFrame = false, cands = allCands();

    function allCands() { const a = []; for (let r = 1; r <= 13; r++) a.push(r); return a; }
    function size() {
      const r = canvas.getBoundingClientRect();
      // 画面の本当の px ではなく、置かれた枠の px で描く（舞台が縮んでいても CSS が実寸に戻している）
      W = Math.max(60, canvas.clientWidth || r.width); H = Math.max(60, canvas.clientHeight || r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const long = land ? Math.min(H * .84, W * .62) : Math.min(H * .74, W * .5 / .714);
      cw = land ? long : long * .714; ch = land ? long * .714 : long;
      x0 = (W - cw) / 2; y0 = (H - ch) / 2;
      const pw = Math.round((land ? ch : cw) * dpr), ph = Math.round((land ? cw : ch) * dpr);
      face = paintFace(card, pw, ph, false);
      draw();
    }
    // 表の位置 (u,v) が、伏せた札の上でどこに来るか（裏から透かして見た位置）
    function under(u, v) {
      const a = land ? v : u, b = land ? 1 - u : v;
      return [x0 + (1 - a) * cw, y0 + b * ch];
    }
    function drawUnderside() {
      // 札の枠（x0,y0,cw,ch）に、表を左右に裏返して描く
      g.save(); g.translate(x0 + cw, y0); g.scale(-1, 1);
      if (land) { g.translate(0, ch); g.rotate(-Math.PI / 2); g.drawImage(face, 0, 0, ch, cw); }
      else g.drawImage(face, 0, 0, cw, ch);
      g.restore();
    }
    function drawBack() {
      const r = Math.min(cw, ch) * .06;
      rrect(g, x0, y0, cw, ch, r); g.save(); g.clip();
      g.fillStyle = '#4a0509'; g.fillRect(x0, y0, cw, ch);
      if (backImg) {
        g.save();
        if (land) { g.translate(x0 + cw / 2, y0 + ch / 2); g.rotate(Math.PI / 2); g.drawImage(backImg, -ch / 2, -cw / 2, ch, cw); }
        else g.drawImage(backImg, x0, y0, cw, ch);
        g.restore();
      } else {
        g.strokeStyle = 'rgba(217,178,105,.5)'; g.lineWidth = 1;
        for (let i = -ch; i < cw + ch; i += 9) { g.beginPath(); g.moveTo(x0 + i, y0); g.lineTo(x0 + i + ch, y0 + ch); g.stroke(); g.beginPath(); g.moveTo(x0 + i, y0); g.lineTo(x0 + i - ch, y0 + ch); g.stroke(); }
      }
      g.restore();
      rrect(g, x0 + .5, y0 + .5, cw - 1, ch - 1, r); g.strokeStyle = '#b78a45'; g.lineWidth = 1.5; g.stroke();
    }
    const rect = () => [[x0, y0], [x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]];
    function pathPoly(p) { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); }

    function draw() {
      raf = 0;
      if (dead) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const r = Math.min(cw, ch) * .06;
      if (opened) return;
      if (!fold) {
        g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22; g.shadowOffsetY = 10; rrect(g, x0, y0, cw, ch, r); g.fillStyle = '#3e0306'; g.fill(); g.restore();
        drawBack();
        return;
      }
      const { m, n } = fold;
      const keep = clipHalf(rect(), m, n, true), lift = clipHalf(rect(), m, n, false);
      // 残っている裏
      if (keep.length >= 3) {
        g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 22; g.shadowOffsetY = 10; pathPoly(keep); g.fillStyle = '#3e0306'; g.fill(); g.restore();
        g.save(); pathPoly(keep); g.clip(); drawBack(); g.restore();
      }
      if (lift.length < 3) return;
      // めくれた所：折り目で鏡に写した位置に、札の表（裏返し）を描く
      const a = 1 - 2 * n[0] * n[0], b = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1];
      const e = m[0] - (a * m[0] + b * m[1]), f = m[1] - (b * m[0] + d * m[1]);
      const flap = lift.map(p => [a * p[0] + b * p[1] + e, b * p[0] + d * p[1] + f]);
      g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 20; g.shadowOffsetX = n[0] * 8; g.shadowOffsetY = n[1] * 8 + 4; pathPoly(flap); g.fillStyle = '#efe6d4'; g.fill(); g.restore();
      g.save(); g.transform(a, b, b, d, e, f);
      rrect(g, x0, y0, cw, ch, r); g.clip(); pathPoly(lift); g.clip();
      drawUnderside();
      g.restore();
      // 折り目のかげりと照り（紙の丸み）
      g.save(); pathPoly(flap); g.clip();
      const reach = Math.min(70, Math.max(cw, ch) * .3);
      const gr = g.createLinearGradient(m[0], m[1], m[0] + n[0] * reach, m[1] + n[1] * reach);
      gr.addColorStop(0, 'rgba(40,20,10,.5)'); gr.addColorStop(.12, 'rgba(255,255,255,.34)'); gr.addColorStop(.4, 'rgba(60,30,10,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
      if (keep.length >= 3) {
        g.save(); pathPoly(keep); g.clip();
        // 折り目の向こう側（裏）に落ちる細い影は、めくれた紙に隠れるので、紙の先の縁だけ
        g.restore();
      }
    }
    const ask = () => { if (!raf && !dead) raf = requestAnimationFrame(draw); };

    // つまむ点：押した所に一番近い、札の縁の上の点
    function edgePoint(p) {
      const x = Math.max(x0, Math.min(x0 + cw, p[0])), y = Math.max(y0, Math.min(y0 + ch, p[1]));
      const dl = x - x0, dr = x0 + cw - x, dt = y - y0, db = y0 + ch - y, mn = Math.min(dl, dr, dt, db);
      const corner = Math.min(cw, ch) * .22;
      let gx = x, gy = y;
      if (mn === dl) gx = x0; else if (mn === dr) gx = x0 + cw; else if (mn === dt) gy = y0; else gy = y0 + ch;
      // 角の近くは角に吸いつける
      if (Math.min(dl, dr) < corner && Math.min(dt, db) < corner) { gx = dl < dr ? x0 : x0 + cw; gy = dt < db ? y0 : y0 + ch; }
      return [gx, gy];
    }
    function setFold(p) {
      if (!grab) return;
      let vx = p[0] - grab[0], vy = p[1] - grab[1];
      // 札の内側へ引いた分だけめくれる（外へ引いても何も起きない）
      const cx = x0 + cw / 2 - grab[0], cy = y0 + ch / 2 - grab[1];
      const len = Math.hypot(vx, vy);
      if (len < 3 || vx * cx + vy * cy <= 0) { fold = null; ask(); return; }
      const n = [vx / len, vy / len];
      fold = { m: [grab[0] + vx / 2, grab[1] + vy / 2], n };
      const lift = clipHalf(rect(), fold.m, n, false);
      const frac = lift.length >= 3 ? area(lift) / (cw * ch) : 0;
      look(frac);
      if (frac > .8) { open(); return; }
      ask();
    }
    // 見えた手がかりを数え、まだあり得る数をしぼる
    function look(frac) {
      if (!fold) return;
      const { m, n } = fold, mg = Math.min(cw, ch) * .075;
      const lifted = (u, v, k) => { const q = under(u, v); return (q[0] - m[0]) * n[0] + (q[1] - m[1]) * n[1] < -(k || mg); };
      let newly = 0;
      for (const [key, u, v] of SLOTS) if (!seen[key] && lifted(u, v)) { seen[key] = 1; newly++; }
      if (!seenFrame && FRAME_PTS.some(([u, v]) => lifted(u, v, mg * .5))) { seenFrame = true; newly++; }
      if (newly) {
        const isFace = card.rank > 10;
        // 枠の線か、マークの置き場所が1つでも見えれば、絵札か数の札かは分かる（絵札は枠の中が絵で埋まっている）
        cands = allCands().filter(r => {
          const rf = r > 10;
          if (rf !== isFace) return false;
          if (rf) return true;
          for (const key in seen) if ((HAS[card.rank][key] || 0) !== (HAS[r][key] || 0)) return false;
          return true;
        });
      }
      if (opt.onSeen) opt.onSeen({ cands: cands.slice(), frac, newly, seen: Object.keys(seen), frame: seenFrame });
    }
    function pos(ev) { const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left) * (W / r.width), (ev.clientY - r.top) * (H / r.height)]; }
    function down(ev) {
      if (opened || dead) return;
      const p = pos(ev);
      // 札から遠すぎる所は相手にしない
      const pad = Math.min(cw, ch) * .5;
      if (p[0] < x0 - pad || p[0] > x0 + cw + pad || p[1] < y0 - pad || p[1] > y0 + ch + pad) return;
      cancelAnimationFrame(spring); spring = 0;
      grab = edgePoint(p); cur = p;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { }
      if (opt.onGrab) opt.onGrab();
      setFold(p); ev.preventDefault();
    }
    function move(ev) { if (!grab || opened) return; cur = pos(ev); setFold(cur); ev.preventDefault(); }
    function up() {
      if (!grab || opened) { grab = null; return; }
      // 離すと、ゆっくり元に戻る
      const g0 = grab, from = cur, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 220), e = 1 - (1 - k) * (1 - k);
        grab = g0; setFoldQuiet([from[0] + (g0[0] - from[0]) * e, from[1] + (g0[1] - from[1]) * e]);
        if (k < 1 && !opened && !dead) spring = requestAnimationFrame(step); else { grab = null; fold = null; ask(); }
      };
      spring = requestAnimationFrame(step);
    }
    function setFoldQuiet(p) {
      const vx = p[0] - grab[0], vy = p[1] - grab[1], len = Math.hypot(vx, vy);
      fold = len < 3 ? null : { m: [grab[0] + vx / 2, grab[1] + vy / 2], n: [vx / len, vy / len] };
      draw();
    }
    function open() {
      if (opened || dead) return;
      opened = true; grab = null; fold = null; cands = [card.rank];
      draw();
      if (opt.onOpen) opt.onOpen();
    }
    // お手本：指の代わりに、決めた道すじでめくって見せる。steps = [{ from:[u,v], to:[u,v], ms, hold }]（札の枠を1とした位置）
    function demo(steps) {
      return steps.reduce((p, s) => p.then(() => new Promise(res => {
        if (dead || opened) return res();
        const A = [x0 + s.from[0] * cw, y0 + s.from[1] * ch], B = [x0 + s.to[0] * cw, y0 + s.to[1] * ch], t0 = performance.now();
        grab = edgePoint(A);
        const tick = (t) => {
          if (dead || opened) return res();
          const k = Math.min(1, (t - t0) / s.ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          cur = [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e]; setFold(cur);
          if (k < 1) requestAnimationFrame(tick);
          else setTimeout(() => { if (!s.keep) { up(); setTimeout(res, 260); } else res(); }, s.hold || 0);
        };
        requestAnimationFrame(tick);
      })), Promise.resolve());
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.style.touchAction = 'none';
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (!dead) size(); }) : null;
    if (ro) ro.observe(canvas);
    size();
    if (!backImg && opt.back) setTimeout(() => { if (!dead) draw(); }, 400);
    return {
      open, demo,
      info: () => ({ cands: cands.slice(), seen: Object.keys(seen), frame: seenFrame, opened }),
      destroy() { dead = true; cancelAnimationFrame(raf); cancelAnimationFrame(spring); if (ro) ro.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); },
    };
  }

  // 開いた札の絵（角の数字つき）。CSS の背景に使えるよう dataURL で返す（同じ札は使い回す）
  const faceCache = {};
  function faceURL(card, w) {
    const k = card.suit + card.rank + '@' + w;
    if (!faceCache[k]) faceCache[k] = paintFace(card, w, Math.round(w / .714), true).toDataURL('image/png');
    return faceCache[k];
  }

  window.BaccaratSqueeze = { create, faceURL, PIPS, HAS };
})();
