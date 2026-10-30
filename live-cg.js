// =============================================================
// ご褒美CGを Live2D 風にゆっくり動かす（2026-10-30 台帳14）
// 新しいご褒美CGは Higgsfield の審査で動画にできなかった（胸元の開いた絵は通らない。塗りつぶして通す回避はしない）。
// そこでホームのリコ先輩（home-live.js）と同じく、一枚絵を網目でわずかにゆがめて、呼吸・首のかしげ・髪の揺れを付ける。
// ・描き足さないので画質は落ちない。動きは最大でも数 px。人物ごとに周期をずらす（2人が同時に息をしない）
// ・キャンバスは絵と同じクラスを持たせて上に重ねる（object-fit・寄りから引く演出も絵と同じに効く）
// ・30fps に間引き、見えていない・タブが裏・動きを減らす設定の時は止める。WebGL が無ければ一枚絵のまま
// 髪の範囲は、手・持ったカード・腕・背景の小物に掛からない所だけ（掛かるとカードが髪と一緒に揺れる。10/30 差の絵で確かめた）。
// 座標は絵（1600×900）の px。chest＝胸の楕円 [中心x,中心y,半径x,半径y]、head＝頭（うさ耳を含む）、neck＝首（かしげの支点）、hair＝垂れた髪の四角 [x0,y0,x1,y1]
// =============================================================
(function () {
  const W = 1600, H = 900;
  const P = (chest, head, neck, hair, ph) => ({ chest, head, neck, hair, ph });
  const CONF = {
    'reward_cg_rico_tutorial': [
      P([688, 464, 144, 96], [528, 224, 160, 192], [560, 368], [[192, 240, 320, 640]], 0),
      P([848, 384, 128, 96], [704, 160, 144, 176], [768, 272], [[992, 96, 1344, 368]], 1.9),
    ],
    'reward_cg_polka': [
      P([640, 640, 160, 96], [528, 304, 224, 256], [528, 448], [[48, 288, 368, 704]], 0),
      P([960, 400, 176, 112], [768, 176, 192, 208], [832, 304], [[1216, 32, 1440, 240]], 2.3),
    ],
    'reward_cg_selina': [
      P([528, 608, 176, 112], [640, 240, 220, 240], [608, 384], [[112, 320, 256, 640]], 0),
      P([1216, 640, 176, 112], [1152, 224, 224, 240], [1152, 400], [[1512, 192, 1600, 480], [832, 368, 936, 704]], 2.1),
    ],
    'reward_cg_selina_2': [
      P([640, 656, 176, 96], [616, 264, 184, 168], [640, 416], [[176, 528, 320, 688]], 0),
      P([992, 480, 128, 112], [912, 192, 160, 192], [960, 336], [[1232, 240, 1456, 608]], 1.7),
    ],
    'reward_cg_grano': [
      P([640, 496, 144, 96], [528, 272, 176, 192], [544, 384], [[240, 320, 464, 528]], 0),
      P([1056, 400, 160, 112], [1184, 208, 144, 176], [1168, 320], [], 2.5),
    ],
    'reward_cg_velvet': [
      P([624, 640, 176, 112], [432, 336, 176, 224], [432, 464], [[32, 368, 240, 672]], 0),
      P([720, 416, 160, 112], [624, 176, 192, 208], [672, 288], [[1024, 96, 1472, 320]], 2.0),
    ],
    'secret_cg_selina_fireside': [
      P([768, 528, 176, 112], [624, 208, 176, 208], [672, 336], [[352, 528, 496, 832], [1088, 384, 1312, 672]], 0),
    ],
  };
  const keyOf = (src) => { const m = String(src || '').match(/([a-z0-9_]+)\.(jpg|webp|png)(\?|$)/); return m && CONF[m[1]] ? m[1] : null; };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ell = (x, y, e) => { const dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; return 1 - smooth(0.55, 1.0, Math.sqrt(dx * dx + dy * dy)); };
  const box = (x, y, b, f) => smooth(b[0] - f, b[0] + f, x) * smooth(b[1] - f, b[1] + f, y) * (1 - smooth(b[2] - f, b[2] + f, x)) * (1 - smooth(b[3] - f, b[3] + f, y));

  const VS = 'attribute vec2 aPos; attribute vec2 aUV; varying vec2 vUV; void main() { vUV = aUV; gl_Position = vec4(aPos.x / ' + W + '.0 * 2.0 - 1.0, 1.0 - aPos.y / ' + H + '.0 * 2.0, 0.0, 1.0); }';
  const FS = 'precision mediump float; uniform sampler2D uTex; varying vec2 vUV; void main() { gl_FragColor = texture2D(uTex, vUV); }';

  const live = new Set();
  function attach(img) {
    const key = keyOf(img && img.getAttribute('src'));
    if (!key || img.__live === img.getAttribute('src')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    detach(img);
    img.__live = img.getAttribute('src');
    const canvas = document.createElement('canvas');
    canvas.className = img.className.replace(/\bmotion-covered\b/, '') + ' live-cg';
    canvas.width = W; canvas.height = H;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    // 網目：16px 角。各頂点の重み（胸・頭・髪）を先に計算しておき、毎コマは足し合わせるだけ
    const figs = CONF[key], S = 16, nx = W / S + 1, ny = Math.ceil(H / S) + 1, n = nx * ny;
    const base = new Float32Array(n * 2), uv = new Float32Array(n * 2), pos = new Float32Array(n * 2);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = Math.min(W, i * S), y = Math.min(H, j * S); base[k * 2] = x; base[k * 2 + 1] = y; uv[k * 2] = x / W; uv[k * 2 + 1] = y / H; }
    const wts = figs.map(f => {
      const wc = new Float32Array(n), wh = new Float32Array(n), wr = new Float32Array(n);
      const pivot = f.chest[1] + f.chest[3] * 1.6;   // 呼吸の支点：胸の少し下（そこより下は動かさない）
      for (let k = 0; k < n; k++) {
        const x = base[k * 2], y = base[k * 2 + 1];
        wc[k] = ell(x, y, f.chest) * (1 - smooth(pivot - 30, pivot, y));
        wh[k] = ell(x, y, f.head);
        let h = 0; for (const b of f.hair) h = Math.max(h, box(x, y, b, 40) * smooth(b[1], b[3], y));
        wr[k] = h;
      }
      return { wc, wh, wr, pivot };
    });
    const idx = []; for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + 1, a + nx, a + 1, a + nx + 1, a + nx); }
    const pb = gl.createBuffer(), ub = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const lu = gl.getAttribLocation(prog, 'aUV'); gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, base, gl.DYNAMIC_DRAW);
    const lp = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    const st = { img, canvas, gl, raf: 0, last: 0, t0: performance.now(), ready: false };
    const src = new Image();
    src.onload = () => {
      if (img.__live !== img.getAttribute('src')) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.viewport(0, 0, W, H);
      st.ready = true;
    };
    src.src = img.getAttribute('src');
    function frame(now) {
      if (!canvas.isConnected && st.ready) { detach(img); return; }
      st.raf = requestAnimationFrame(frame);
      if (!st.ready || document.hidden || now - st.last < 33) return;
      st.last = now;
      const t = window.__liveT != null ? window.__liveT : (now - st.t0) / 1000;   // __liveT は検査で時計を1コマずつ進める時だけ
      pos.set(base);
      figs.forEach((f, fi) => {
        const w = wts[fi], br = Math.sin(t * 1.37 + f.ph), ha = 0.011 * Math.sin(t * 0.9 + f.ph) + 0.004 * Math.sin(t * 2.13 + f.ph);
        const c = Math.cos(ha), s = Math.sin(ha), [nx0, ny0] = f.neck;
        for (let k = 0; k < n; k++) {
          const x = base[k * 2], y = base[k * 2 + 1];
          let dx = 0, dy = 0;
          if (w.wc[k]) { dy += -(w.pivot - y) * 0.010 * br * w.wc[k]; dx += (x - f.chest[0]) * 0.0035 * br * w.wc[k]; }
          if (w.wh[k]) { const ux = x - nx0, uy = y - ny0; dx += (nx0 + ux * c - uy * s - x) * w.wh[k]; dy += (ny0 + ux * s + uy * c - y) * w.wh[k]; }
          if (w.wr[k]) dx += Math.sin(t * 1.05 + y * 0.012 + f.ph) * 3.5 * w.wr[k];
          pos[k * 2] += dx; pos[k * 2 + 1] += dy;
        }
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      if (!canvas.classList.contains('on')) { canvas.classList.add('on'); img.classList.add('live-covered'); }
    }
    // 位置と大きさは絵に合わせる（親を基準にした絶対配置。動画の重ね方と同じ）
    const place = () => { canvas.style.left = img.offsetLeft + 'px'; canvas.style.top = img.offsetTop + 'px'; canvas.style.width = img.offsetWidth + 'px'; canvas.style.height = img.offsetHeight + 'px'; };
    const parent = img.parentElement; if (!parent) return;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    // 描画が失われたら層を外して一枚絵に戻す（黒く固まらないように）
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); detach(img); }, { once: true });
    img.insertAdjacentElement('afterend', canvas);
    if (img.complete) place(); else img.addEventListener('load', place, { once: true });
    st.ro = window.ResizeObserver ? new ResizeObserver(place) : null; if (st.ro) st.ro.observe(img);
    img.__liveState = st; live.add(st);
    st.raf = requestAnimationFrame(frame);
  }
  function detach(img) {
    const st = img && img.__liveState; if (!st) return;
    cancelAnimationFrame(st.raf); if (st.ro) st.ro.disconnect();
    const lose = st.gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    st.canvas.remove(); img.classList.remove('live-covered'); img.__liveState = null; img.__live = null; live.delete(st);
  }
  window.LiveCG = { attach, detach, has: (src) => !!keyOf(src) };
})();
