// =============================================================
// ホームの制服リコを Live2D 風にゆっくり動かす（2026-10-18）
// 背景の絵（assets/ui/home/scene.webp：劇場にリコ先輩が頬杖をついている1枚絵）のうち、リコ先輩の所だけを
// 網目でわずかにゆがめて、呼吸・首のかしげ・うさ耳の揺れ・髪のなびきを付ける。描き足しはしないので画質は落ちない。
// ・キャンバスは画面の実寸（舞台の縮み × 端末の画素比）で描く。絵は 1 枚の手触りそのまま
// ・動きは小さく（最大でも数 px）。縁はなめらかに重みを落とし、背景の伸びが目に見えないようにする
// ・30fps に間引き、ホームが見えていない・タブが裏・動きを減らす設定の時は止める
// ・WebGL が無い時は何もしない（今までどおり CSS の背景の絵が出る）
// =============================================================
(function () {
  const IW = 1672, IH = 941;            // 元の絵の大きさ（拡大版に差し替えても、座標はこの大きさで書く）
  // リコ先輩の各部の位置（元の絵の座標）
  const R = {
    rail: 745,                          // 卓の縁（ここより下は動かさない）
    body: [790, 560, 360, 250],         // 呼吸で動く胴（中心x,y・半径x,y）
    neck: [760, 440],                   // 首のかしげの回転の中心
    head: [720, 290, 250, 230],         // 頭（髪の上・顔）
    ear: [690, 220], earBox: [470, 0, 860, 260],   // うさ耳の付け根と範囲
    hairL: [300, 360, 560, 730], hairR: [940, 380, 1120, 730],   // 左右に垂れる髪
  };
  const VS = `
    attribute vec2 aUV; attribute float aW; uniform vec2 uView; uniform vec4 uPlace; uniform float uT;
    varying vec2 vUV;
    const vec2 IMG = vec2(${IW}.0, ${IH}.0);
    float ell(vec2 p, vec4 e) { vec2 d = (p - e.xy) / e.zw; return 1.0 - smoothstep(0.55, 1.0, length(d)); }
    float box(vec2 p, vec4 b, float f) { vec2 lo = smoothstep(b.xy - f, b.xy + f, p), hi = 1.0 - smoothstep(b.zw - f, b.zw + f, p); return lo.x * lo.y * hi.x * hi.y; }
    vec2 rot(vec2 p, vec2 c, float a) { float s = sin(a), co = cos(a); vec2 d = p - c; return c + vec2(d.x * co - d.y * s, d.x * s + d.y * co); }
    void main() {
      vec2 p = aUV * IMG;          // この頂点の元の絵の座標
      vec2 q = p;
      float above = 1.0 - smoothstep(${R.rail - 40}.0, ${R.rail}.0, p.y);   // 卓の縁より上だけ動く
      // 呼吸（4.6秒でひと息）：胴が縁を支点にわずかに伸び縮みし、肩が上下する
      float br = sin(uT * 1.366);
      float wb = ell(p, vec4(${R.body.join('.0,')}.0)) * above;
      q.y += -(${R.rail}.0 - p.y) * 0.0065 * br * wb;
      q.x += (p.x - ${R.body[0]}.0) * 0.0025 * br * wb;
      // 首のかしげ（7秒）：頭まわりを首を中心にごくわずかに回す
      float hw = ell(p, vec4(${R.head.join('.0,')}.0)) * above;
      float ha = 0.0085 * sin(uT * 0.898) + 0.003 * sin(uT * 2.13);
      q = mix(q, rot(q, vec2(${R.neck.join('.0,')}.0), ha), hw);
      // うさ耳（首より遅れて、少し大きく揺れる）
      float ew = box(p, vec4(${R.earBox.join('.0,')}.0), 40.0) * (1.0 - smoothstep(${R.ear[1] - 10}.0, ${R.ear[1] + 30}.0, p.y));
      float ea = 0.016 * sin(uT * 0.898 - 0.7) + 0.006 * sin(uT * 3.1);
      q = mix(q, rot(q, vec2(${R.ear.join('.0,')}.0), ea), ew);
      // 髪のなびき：垂れた髪の下ほど、ゆっくり横に揺れる
      float hl = box(p, vec4(${R.hairL.join('.0,')}.0), 50.0), hr = box(p, vec4(${R.hairR.join('.0,')}.0), 50.0);
      float down = smoothstep(${R.hairL[1]}.0, ${R.rail}.0, p.y);
      q.x += (hl * sin(uT * 1.2 + p.y * 0.012) + hr * sin(uT * 1.05 + 1.3 + p.y * 0.012)) * 3.2 * down * above;
      q = p + (q - p) * aW;                          // リコの形の中だけ動かす（背景は動かさない）
      vUV = aUV;
      vec2 sp = uPlace.xy + q / IMG * uPlace.zw;      // 画面上の位置（CSS の cover と同じ置き方）
      gl_Position = vec4(sp / uView * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
    }`;
  const FS = `precision mediump float; uniform sampler2D uTex; varying vec2 vUV; void main() { gl_FragColor = texture2D(uTex, vUV); }`;

  let cur = null;
  function stop() {
    if (!cur) return;
    cancelAnimationFrame(cur.raf); cur.ro && cur.ro.disconnect(); cur.mo && cur.mo.disconnect();
    document.removeEventListener('visibilitychange', cur.onVis);
    const lose = cur.gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    cur.canvas.remove(); cur.host.classList.remove('is-live'); cur = null;
  }
  function start(host, src) {
    if (cur && cur.host === host && cur.src === src) return;
    stop();
    if (!host || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'h15-live';
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    let prog;
    try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw 0; } catch (e) { return; }
    gl.useProgram(prog);
    // 網目：リコ先輩のまわりは細かく、ほかは粗く（頂点数を抑える）
    const xs = [], ys = [];
    for (let x = 0; x <= IW; x += (x > 260 && x < 1180) ? 14 : 80) xs.push(Math.min(x, IW)); if (xs[xs.length - 1] !== IW) xs.push(IW);
    for (let y = 0; y <= IH; y += y < 790 ? 14 : 60) ys.push(Math.min(y, IH)); if (ys[ys.length - 1] !== IH) ys.push(IH);
    const uv = new Float32Array(xs.length * ys.length * 2); let k = 0;
    for (const y of ys) for (const x of xs) { uv[k++] = x / IW; uv[k++] = y / IH; }
    const idx = []; const nx = xs.length;
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + 1, a + nx, a + 1, a + nx + 1, a + nx); }
    // リコの形の型（assets/ui/home/rico_mask.png、白＝リコ、縁はぼかし済み）を頂点ごとの重みにする。読めるまでは重み0（動かない）
    const wts = new Float32Array(uv.length / 2);
    const wb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, wb); gl.bufferData(gl.ARRAY_BUFFER, wts, gl.DYNAMIC_DRAW);
    const wloc = gl.getAttribLocation(prog, 'aW'); gl.enableVertexAttribArray(wloc); gl.vertexAttribPointer(wloc, 1, gl.FLOAT, false, 0, 0);
    const mimg = new Image();
    mimg.onload = () => {
      if (cur !== state) return;
      const c = document.createElement('canvas'); c.width = mimg.width; c.height = mimg.height;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(mimg, 0, 0);
      const px = cx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < wts.length; i++) {
        const x = Math.min(c.width - 1, Math.round(uv[i * 2] * (c.width - 1))), y = Math.min(c.height - 1, Math.round(uv[i * 2 + 1] * (c.height - 1)));
        wts[i] = px[(y * c.width + x) * 4] / 255;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, wb); gl.bufferData(gl.ARRAY_BUFFER, wts, gl.STATIC_DRAW);
    };
    mimg.src = 'assets/ui/home/rico_mask.png';
    const big = uv.length / 2 > 65535;
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aUV'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    if (big && !gl.getExtension('OES_element_index_uint')) return;
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(idx) : new Uint16Array(idx), gl.STATIC_DRAW);
    const U = n => gl.getUniformLocation(prog, n);
    const tex = gl.createTexture();
    const img = new Image();
    img.decoding = 'async';
    const state = { host, src, canvas, gl, raf: 0, ready: false, last: 0, t0: performance.now() };
    cur = state;
    img.onload = () => {
      if (cur !== state) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      state.ready = true; resize(); frame(performance.now());
    };
    img.src = src;
    host.appendChild(canvas);
    function resize() {
      const r = host.getBoundingClientRect();                       // 画面上の実寸（舞台の縮みを含む）
      const cssW = host.offsetWidth || 1, cssH = host.offsetHeight || 1;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      // CSS の background-size: cover / background-position: 50% 40% と同じ置き方
      const W = canvas.width, H = canvas.height, s = Math.max(W / IW, H / IH), dw = IW * s, dh = IH * s;
      gl.uniform2f(U('uView'), W, H); gl.uniform4f(U('uPlace'), (W - dw) * 0.5, (H - dh) * 0.4, dw, dh);
    }
    function frame(now) {
      if (cur !== state) return;
      state.raf = requestAnimationFrame(frame);
      if (!state.ready || document.hidden || now - state.last < 33) return;   // 30fps
      state.last = now;
      gl.uniform1f(U('uT'), (now - state.t0) / 1000);
      gl.drawElements(gl.TRIANGLES, idx.length, big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      if (!host.classList.contains('is-live')) host.classList.add('is-live');
    }
    state.onVis = () => { state.last = 0; };
    document.addEventListener('visibilitychange', state.onVis);
    if (window.ResizeObserver) { state.ro = new ResizeObserver(() => state.ready && resize()); state.ro.observe(host); }
    // ホームが消えたら止める
    state.mo = new MutationObserver(() => { if (!host.isConnected) stop(); });
    state.mo.observe(document.body, { childList: true, subtree: true });
  }
  window.HomeLive = { start, stop };
})();
