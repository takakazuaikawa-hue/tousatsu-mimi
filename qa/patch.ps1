# 絵の一部を切り出す／描き直した部分をはめ戻す（ふちをぼかして）。ブラウザを使わない版（メモリが少ない時も速い）
# powershell -File qa/patch.ps1 crop  <元.png> <x> <y> <w> <h> <出力.png>
# powershell -File qa/patch.ps1 paste <元.png> <描き直し.png> <x> <y> <w> <h> <出力.png> [ぼかし幅=50]
#   描き直しは w×h に縮めて (x,y) に置き、四辺をぼかして元の絵に溶かす。パスは絶対パスか今いる所からの相対
param([string]$Mode, [Parameter(ValueFromRemainingArguments = $true)][string[]]$A)
Add-Type -AssemblyName System.Drawing
$cp = New-Object System.CodeDom.Compiler.CompilerParameters
$cp.CompilerOptions = '/unsafe'
[void]$cp.ReferencedAssemblies.Add('System.Drawing.dll')
$src = @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Drawing.Drawing2D;
public static class Patch {
  public static void Crop(string src, int x, int y, int w, int h, string o) {
    using (var im = new Bitmap(src)) using (var c = new Bitmap(w, h, PixelFormat.Format24bppRgb)) using (var g = Graphics.FromImage(c)) {
      g.DrawImage(im, new Rectangle(0, 0, w, h), new Rectangle(x, y, w, h), GraphicsUnit.Pixel); c.Save(o, ImageFormat.Png); }
  }
  public static void Paste(string src, string pat, int X, int Y, int W, int H, string o, int F) {
    using (var im = new Bitmap(src)) using (var p0 = new Bitmap(pat)) using (var p = new Bitmap(W, H, PixelFormat.Format32bppArgb)) using (var b = new Bitmap(im.Width, im.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(p)) { g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality; g.DrawImage(p0, new Rectangle(0, 0, W, H)); }
      using (var g = Graphics.FromImage(b)) g.DrawImage(im, 0, 0, im.Width, im.Height);
      var bd = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var pd = p.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      unsafe {
        for (int j = 0; j < H; j++) { int yy = Y + j; if (yy < 0 || yy >= b.Height) continue;
          byte* pr = (byte*)pd.Scan0 + j * pd.Stride; byte* br = (byte*)bd.Scan0 + yy * bd.Stride;
          for (int i = 0; i < W; i++) { int xx = X + i; if (xx < 0 || xx >= b.Width) continue;
            int e = Math.Min(Math.Min(i, j), Math.Min(W - 1 - i, H - 1 - j)); double v = Math.Max(0, Math.Min(1, (double)e / F)); double s = v * v * (3 - 2 * v);
            for (int k = 0; k < 3; k++) br[xx * 4 + k] = (byte)Math.Round(br[xx * 4 + k] * (1 - s) + pr[i * 4 + k] * s); } }
      }
      b.UnlockBits(bd); p.UnlockBits(pd);
      using (var c = b.Clone(new Rectangle(0, 0, b.Width, b.Height), PixelFormat.Format24bppRgb)) c.Save(o, ImageFormat.Png);
    }
  }
}
"@
Add-Type -TypeDefinition $src -CompilerParameters $cp
function P($s) { if ([IO.Path]::IsPathRooted($s)) { [IO.Path]::GetFullPath($s) } else { [IO.Path]::GetFullPath((Join-Path (Get-Location) $s)) } }
if ($Mode -eq 'crop') { [Patch]::Crop((P $A[0]), [int]$A[1], [int]$A[2], [int]$A[3], [int]$A[4], (P $A[5])) }
else { $f = 50; if ($A.Count -gt 7) { $f = [int]$A[7] }; [Patch]::Paste((P $A[0]), (P $A[1]), [int]$A[2], [int]$A[3], [int]$A[4], [int]$A[5], (P $A[6]), $f) }
"ok $($A[-1])"
