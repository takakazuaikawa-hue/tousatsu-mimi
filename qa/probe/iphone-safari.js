// 検査用：iPhone の Safari のふり（UA と、全画面の仕組みが無いこと）。qa/a2hsshot.mjs で使う
Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' });
Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
Element.prototype.requestFullscreen = undefined; Element.prototype.webkitRequestFullscreen = undefined;
