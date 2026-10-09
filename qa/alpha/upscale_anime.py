"""アニメ絵の立ち絵を、Real-ESRGAN（アニメ用 x4・6ブロック）で拡大する。透明は別に拡大して、色をその縁に合わせる。
使い方: python3 qa/alpha/upscale_anime.py <入力.webp|png> <出力.webp> <出力の高さ px> [重み.pth]
  重み: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
ホームで立ち絵を大きく切り取って見せる時、元の 1000px では足りず（FHD・スマホで1.7〜2.3倍に引き伸ばされる）ぼやけるため。"""
import sys, math
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image

class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1); self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1); self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1); self.lrelu = nn.LeakyReLU(0.2, True)
    def forward(self, x):
        x1 = self.lrelu(self.conv1(x)); x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1))); x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        return self.conv5(torch.cat((x, x1, x2, x3, x4), 1)) * 0.2 + x

class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__(); self.rdb1 = RDB(nf, gc); self.rdb2 = RDB(nf, gc); self.rdb3 = RDB(nf, gc)
    def forward(self, x): return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x

class RRDBNet(nn.Module):
    def __init__(self, nb=6, nf=64, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1); self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1); self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1); self.lrelu = nn.LeakyReLU(0.2, True)
    def forward(self, x):
        feat = self.conv_first(x); feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))

def run(model, img, tile=192, pad=12):
    """img: HxWx3 float32 0..1 → 4H x 4W x 3（タイルに分けて、縁の継ぎ目が出ないよう余白つきで）"""
    H, W, _ = img.shape; out = np.zeros((H * 4, W * 4, 3), np.float32)
    t = torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0)
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(H, y0 + tile), min(W, x0 + tile)
            ya, xa, yb, xb = max(0, y0 - pad), max(0, x0 - pad), min(H, y1 + pad), min(W, x1 + pad)
            with torch.no_grad():
                o = model(t[:, :, ya:yb, xa:xb]).clamp(0, 1)[0].numpy().transpose(1, 2, 0)
            out[y0 * 4:y1 * 4, x0 * 4:x1 * 4] = o[(y0 - ya) * 4:(y0 - ya) * 4 + (y1 - y0) * 4, (x0 - xa) * 4:(x0 - xa) * 4 + (x1 - x0) * 4]
    return out

def main():
    src, dst, out_h = sys.argv[1], sys.argv[2], int(sys.argv[3])
    wpath = sys.argv[4] if len(sys.argv) > 4 else 'RealESRGAN_x4plus_anime_6B.pth'
    torch.set_num_threads(4)
    model = RRDBNet(); sd = torch.load(wpath, map_location='cpu'); model.load_state_dict(sd.get('params_ema', sd)); model.eval()
    im = Image.open(src).convert('RGBA'); a = np.asarray(im, np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3:4]
    BG = np.array([26, 15, 20], np.float32) / 255.0
    flat = rgb * alpha + BG * (1 - alpha)                       # 暗い色の上に置いてから拡大（縁ににじむ色が暗くなる）
    up = run(model, flat)
    au = run(model, np.repeat(alpha, 3, axis=2))[..., :1]       # 透明も同じ網で拡大（縁の位置が色とそろう）
    au = np.clip(au, 0, 1)
    au[au < 8 / 255] = 0                                        # 何もない所に残るごく薄い影（拡大の揺らぎ）を消す
    col = np.where(au > 0.02, (up - BG * (1 - au)) / np.maximum(au, 1e-3), 0)   # 下に敷いた色を戻す
    col = np.clip(col, 0, 1)
    rgba = np.concatenate([col, au], axis=2)
    big = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
    w = round(big.width * out_h / big.height)
    big.resize((w, out_h), Image.LANCZOS).save(dst, 'WEBP', quality=92, method=6)
    print(src, im.size, '->', (w, out_h))

if __name__ == '__main__':
    main()
