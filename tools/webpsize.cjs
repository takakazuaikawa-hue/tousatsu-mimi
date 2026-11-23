// webp の縦横を読む（VP8X・VP8・VP8L の3形式）。node tools/webpsize.cjs <file...>
const fs = require('fs');
function size(f) {
  const b = fs.readFileSync(f); const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return null;
}
module.exports = size;
if (require.main === module) for (const f of process.argv.slice(2)) console.log(f, (size(f) || ['?']).join('x'));
