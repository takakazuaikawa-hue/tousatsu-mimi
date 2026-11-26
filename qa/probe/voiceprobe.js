// 声の検査用：AudioBufferSourceNode.start の呼び出しを記録する（window.__vstarts）。音は実際に出る（ヘッドレスなので聞こえない）
(() => {
  window.__vstarts = [];
  const P = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
  if (!P || P.__vp) return;
  const orig = P.start;
  P.start = function (...a) {
    window.__vstarts.push({ t: Math.round(performance.now()), dur: this.buffer ? +this.buffer.duration.toFixed(2) : 0 });
    return orig.apply(this, a);
  };
  P.__vp = 1;
})();
