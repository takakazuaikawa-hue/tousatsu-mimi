// キャラクターボイス（Irodori-TTS、assets/voice/<声>/<キー>.m4a）の再生係。
// 設計と約束は docs/design-ref/voice-lines.md（§3 鳴らし方、§5 技術メモ）。
//
// ・Web Audio（game.js の mpAudioCtx()）に decodeAudioData したバッファを GainNode 経由で流す＝iOS の消音スイッチも効果音と同じ扱い。
// ・声は常に1本。新しい声が来たら前を止める。ただしカットインの声（prio 2）は、後から来た通常の声に切られない。
//   掛け声どうし（queue:true）は、前の声が終わるのを待って続ける（言い終わる前に切ると聞き苦しいため）。
// ・BGM は声の間だけ3割下げて、終わったら applyBgmVolume() で戻す（game.js の bgmVolFloat が duck を掛ける）。
// ・先読み：起動時には読まない。対戦の前／プロローグ・幕間・エンディングの表示の前に、その場面の分を読む（preload）。
//   読めていない声は、遅れて鳴ると興ざめなので既定では鳴らさない（maxLateMs 内に間に合えば鳴らす）。
// ・音声の鍵：台詞キー（playVoice）か、文言（playVoiceForText。「…」付きでも <br> 入りでも同じに引ける）。
(function () {
  'use strict';
  var BASE = 'assets/voice/';
  var DUCK_TO = 0.7;              // 声の間、BGM は3割下げる
  // 掛け声の待ち：プレイはサクサク進むので、前の声を待って遅れて鳴ると「遅く聞こえる」（2026-10-20 ユーザー指摘）。
  // 待たせるのは一番新しい1本だけ、0.9秒以内に始められなければ鳴らさない（以前は2本・3.5秒）
  var QUEUE_MAX = 1, QUEUE_TTL = 900;

  var manifest = null, manifestP = null;
  var buffers = new Map();        // id -> AudioBuffer
  var loading = new Map();        // id -> Promise<AudioBuffer|null>
  var groups = new Map();         // group -> Set(id)
  var recent = [];                // 直近に鳴らしたクリップ（同じ声を続けて鳴らさない）
  var cur = null;                 // { id, src, gain, prio, token }
  var queue = [];                 // { id, opts, until }
  var delayTimer = 0;
  var token = 0;
  var duck = 1, duckTarget = 1, duckTimer = 0;
  var LOG = (window.__voiceLog = []);

  function norm(t) {
    return String(t == null ? '' : t).replace(/<br\s*\/?>/gi, '').replace(/[「」『』\s　]/g, '');
  }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  // ── 設定の読み取り（game.js の save / isSfxOn に従う） ──
  function volume() {
    var v = (typeof save !== 'undefined' && save && typeof save.voiceVolume === 'number') ? save.voiceVolume : 80;
    return Math.max(0, Math.min(1, v / 100));
  }
  function enabled() {
    try {
      if (typeof save === 'undefined' || !save) return false;
      if (typeof isSfxOn === 'function' && !isSfxOn()) return false;   // 効果音OFF・音まるごとOFF
      if (save.voiceOn === false) return false;
      return volume() > 0;
    } catch (e) { return false; }
  }

  // ── 台帳（manifest.json）。最初に必要になった時に1度だけ読む ──
  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (!manifestP) {
      manifestP = fetch(BASE + 'manifest.json').then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { manifest = j || { clips: {}, texts: {} }; return manifest; })
        .catch(function () { manifestP = null; return null; });
    }
    return manifestP;
  }
  function durMs(id) {
    var c = manifest && manifest.clips[id];
    return c ? Math.round(c.d * 1000) : 0;
  }
  function has(id) { return !!(manifest && manifest.clips[id]); }
  function idForText(voice, text) {
    if (!manifest) return null;
    return manifest.texts[voice + '|' + norm(text)] || null;
  }

  // ── 取得＋decode ──
  function decode(ctx, ab) {
    return new Promise(function (res, rej) {
      var p = ctx.decodeAudioData(ab, res, rej);   // 古い Safari はコールバック式のみ
      if (p && p.then) p.then(res, rej);
    });
  }
  function load(id) {
    if (buffers.has(id)) return Promise.resolve(buffers.get(id));
    if (loading.has(id)) return loading.get(id);
    var p = loadManifest().then(function (m) {
      var c = m && m.clips[id];
      var ctx = (typeof mpAudioCtx === 'function') ? mpAudioCtx() : null;
      if (!c || !ctx) return null;
      return fetch(BASE + c.f).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { return decode(ctx, ab); })
        .then(function (buf) { buffers.set(id, buf); return buf; });
    }).catch(function () { return null; }).then(function (b) { loading.delete(id); return b; });
    loading.set(id, p);
    return p;
  }

  // ids を読む。group に属させ、同じ group の前回分のうち今回に無いものは捨てる。timeout(ms) を過ぎたら待たずに進む
  function preload(ids, o) {
    o = o || {};
    var list = (ids || []).filter(Boolean);
    var g = o.group;
    if (g) {
      var next = new Set(list);
      var prev = groups.get(g);
      groups.set(g, next);
      if (prev) prev.forEach(function (id) { if (!next.has(id)) dropIfUnused(id); });
    }
    var all = Promise.all(list.map(load)).then(function () { return true; });
    if (!o.timeout) return all;
    return Promise.race([all, new Promise(function (r) { setTimeout(function () { r(false); }, o.timeout); })]);
  }
  function dropIfUnused(id) {
    var used = false;
    groups.forEach(function (s) { if (s.has(id)) used = true; });
    if (!used && !(cur && cur.id === id)) buffers.delete(id);
  }
  function release(g) {
    var s = groups.get(g);
    groups.delete(g);
    if (s) s.forEach(dropIfUnused);
  }
  // 条件に合うクリップ全部（manifest が読めてから）
  function idsWhere(fn) {
    return loadManifest().then(function (m) { return m ? Object.keys(m.clips).filter(fn) : []; });
  }
  var BATTLE_RE = /^(bark_|ready_|react_)/;
  // 対戦の前：その相手とミミの掛け声・初手の出会い台詞・オールインへの反応
  function preloadBattle(voices, o) {
    var set = {}; (voices || []).forEach(function (v) { set[v] = 1; });
    return idsWhere(function (id) { var p = id.split('/'); return set[p[0]] && BATTLE_RE.test(p[1]); })
      .then(function (ids) { return preload(ids, { group: 'battle', timeout: o && o.timeout }); });
  }
  // 場面の分：prefix に合うキー（pro_ / ims_ / end_）
  function preloadScene(group, keyRe, o) {
    return idsWhere(function (id) { return keyRe.test(id.split('/')[1]); })
      .then(function (ids) { return preload(ids, { group: group, timeout: o && o.timeout }); });
  }

  // ── BGM のダッキング（game.js の bgmVolFloat が duckFactor() を掛ける） ──
  function duckFactor() { return duck; }
  function setDuck(to) {
    duckTarget = to;
    if (duckTimer) return;
    duckTimer = setInterval(function () {
      var d = duckTarget - duck;
      if (Math.abs(d) < 0.02) { duck = duckTarget; clearInterval(duckTimer); duckTimer = 0; }
      else duck += d * 0.5;
      applyDuck();
    }, 30);
  }
  function applyDuck() { try { if (typeof applyBgmVolume === 'function') applyBgmVolume(); } catch (e) {} }

  // ── 再生 ──
  function stopCur(fast) {
    if (!cur) return;
    var c = cur; cur = null;
    c.src.onended = null;
    try {
      var ctx = c.gain.context, t = ctx.currentTime;
      c.gain.gain.cancelScheduledValues(t);
      c.gain.gain.setValueAtTime(c.gain.gain.value, t);
      c.gain.gain.linearRampToValueAtTime(0, t + (fast ? 0.03 : 0.06));   // プチッという音を出さない
      c.src.stop(t + 0.08);
    } catch (e) { try { c.src.stop(); } catch (e2) {} }
  }
  function stopVoice() {
    token++;
    queue = [];
    if (delayTimer) { clearTimeout(delayTimer); delayTimer = 0; }
    stopCur();
    setDuck(1);
  }
  function startNow(id, buf, opts) {
    var ctx = mpAudioCtx();
    if (!ctx) return false;
    stopCur(true);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    g.gain.value = volume();
    src.connect(g); g.connect(ctx.destination);
    var my = { id: id, src: src, gain: g, prio: opts.prio || 0, token: ++token };
    cur = my;
    src.onended = function () {
      if (cur !== my) return;
      cur = null;
      var nx = nextQueued();
      if (nx) startNow(nx.id, buffers.get(nx.id), nx.opts);
      else setDuck(1);
    };
    src.start(0);
    LOG.push({ id: id, t: Math.round(now()), req: opts.__req ? Math.round(opts.__req) : null, late: opts.__req ? Math.round(now() - opts.__req) : null });
    if (LOG.length > 400) LOG.shift();
    recent.push(id); if (recent.length > 2) recent.shift();
    setDuck(DUCK_TO);
    return true;
  }
  function nextQueued() {
    var t = now();
    while (queue.length) {
      var q = queue.shift();
      if (q.until >= t && buffers.has(q.id) && enabled()) return q;
    }
    return null;
  }

  // 声の鳴らし方。opts:
  //   prob     … 鳴らす確率（0〜1）。省略は必ず鳴らす
  //   prio     … 0=掛け声 1=台詞 2=カットインの声（後から来た通常の声に切られない）
  //   queue    … true なら今の声が終わってから続ける（続けて鳴る掛け声用）
  //   noRepeat … false で「直近2本は避ける」を外す（台詞・場面用。既定 true）
  //   delay    … ms 遅らせて鳴らす
  //   maxLateMs… 読み込みが間に合っていない時に、これを過ぎたら鳴らさない（既定 350。0 なら待たない）
  function playId(id, opts) {
    opts = opts || {};
    if (!id || !enabled()) return false;
    if (opts.prob != null && Math.random() >= opts.prob) return false;
    if (opts.noRepeat !== false && recent.indexOf(id) >= 0) return false;
    opts.__req = now();
    if (opts.delay) {
      var d = opts.delay; opts = Object.assign({}, opts, { delay: 0 });
      var my = token;
      delayTimer = setTimeout(function () { delayTimer = 0; if (my === token) playId(id, opts); }, d);
      return true;
    }
    var buf = buffers.get(id);
    if (buf) return dispatch(id, buf, opts);
    // 未取得：読み込みを始め、間に合えば鳴らす
    var my2 = token, lateMax = opts.maxLateMs != null ? opts.maxLateMs : 350;
    if (lateMax <= 0) { load(id); return false; }
    load(id).then(function (b) {
      if (!b || my2 !== token && !opts.queue) return;
      if (now() - opts.__req > lateMax) return;
      dispatch(id, b, opts);
    });
    return true;
  }
  function dispatch(id, buf, opts) {
    var prio = opts.prio || 0;
    if (cur) {
      if (opts.queue) {
        if (queue.length >= QUEUE_MAX) queue.shift();
        queue.push({ id: id, opts: opts, until: now() + QUEUE_TTL });
        return true;
      }
      if (cur.prio > prio) return false;      // カットインの声を優先
    }
    queue = [];
    return startNow(id, buf, opts);
  }

  function playVoice(voice, key, opts) { return playId(voice + '/' + key, opts); }
  function playVoiceForText(voice, text, opts) {
    if (!manifest) { loadManifest(); return false; }
    return playId(idForText(voice, text), opts);
  }

  window.MimiVoice = {
    playVoice: playVoice, playVoiceForText: playVoiceForText, playId: playId, stopVoice: stopVoice,
    preload: preload, preloadBattle: preloadBattle, preloadScene: preloadScene, release: release,
    loadManifest: loadManifest, durMs: durMs, has: has, idForText: idForText, norm: norm,
    duckFactor: duckFactor, enabled: enabled, isPlaying: function () { return !!cur; },
    _buffers: buffers,
  };
  window.playVoice = playVoice;
  window.playVoiceForText = playVoiceForText;
  window.stopVoice = stopVoice;
  window.duck = function (on) { setDuck(on === false ? 1 : DUCK_TO); };
})();
