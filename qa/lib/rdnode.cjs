// リーディングの計算部分を、ブラウザ無しで Node から読み込む道具（window.RD を最小限で偽装する）
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
function load(...games) {
  const reg = {};
  const RD = { reg(id, g) { reg[id] = g; }, util: {}, saveGet() { return null; }, saveSet() {} };
  const win = { RD };
  const ctx = vm.createContext({ window: win, console, Image: function () {}, document: {}, setTimeout, clearTimeout });
  for (const g of games) vm.runInContext(fs.readFileSync(path.join(root, 'battles/reading/games', g + '.js'), 'utf8'), ctx, { filename: g + '.js' });
  return { RD, reg };
}
module.exports = { load, root };
