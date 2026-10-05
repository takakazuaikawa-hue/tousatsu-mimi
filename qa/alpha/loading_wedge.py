# 読み込み画面のミミ：谷間の下の、細くとがった肌（服の合わせ目の結び目まで食い込む小さな逆三角）を服の黒で埋める（見本ページでの指摘）。
# 一枚絵（assets/backgrounds/loading_mimi.webp・1920×1086）と動画（assets/motion/loading_mimi.mp4・1280×720）の両方に同じ形を当てる。
# 動画は胸が呼吸で上下に数ピクセル動くので、コマごとに一枚絵に対する位置を求め（小数まで・前後5コマでならす）、形をずらして当てる。
# 使い方（リポジトリの一番上で、qa/alpha/loading_relink.py で作り直した直後の動画と、元の一枚絵に対して）：
#   python3 qa/alpha/loading_wedge.py <元の一枚絵.webp>
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFilter
ORIG = sys.argv[1] if len(sys.argv) > 1 else 'assets/backgrounds/loading_mimi.webp'
# 一枚絵の座標で、乳房の下の線と結び目に囲まれた逆三角
P = [(1269, 905), (1266, 910), (1262, 916), (1258.5, 921), (1264, 926), (1271, 931.5), (1278, 926), (1283.5, 921), (1280, 916), (1276.5, 910), (1273, 905)]
def fill(img_f, pts_xy, top, bot, sample_c, S=8):
    H, W = img_f.shape[:2]
    m = Image.new('L', (W * S, H * S), 0); ImageDraw.Draw(m).polygon([(x * S, y * S) for x, y in pts_xy], fill=255)
    M = np.asarray(m.resize((W, H), Image.LANCZOS), np.float32)[..., None] / 255
    cx, cy = sample_c
    Lp = img_f[cy - 6:cy + 6, cx - 22:cx - 14].reshape(-1, 3); Rp = img_f[cy - 6:cy + 6, cx + 14:cx + 22].reshape(-1, 3)
    leather = np.median(np.vstack([Lp, Rp]), 0)  # 左右の黒い革の色
    yy = np.arange(H, dtype=np.float32)[:, None, None]
    grad = leather * (1 + 0.25 * np.clip((bot - yy) / (bot - top), 0, 1))  # 上の方をわずかに明るく（革の照り）
    return img_f * (1 - M) + grad * M
# 1) 一枚絵
still = Image.open(ORIG).convert('RGB'); a = np.asarray(still, np.float32)
fixed = fill(a, P, 905, 931.5, (1271, 921), S=4)
Image.fromarray(np.clip(fixed + .5, 0, 255).astype(np.uint8)).save('assets/backgrounds/loading_mimi.webp', 'WEBP', quality=88, method=6)
# 2) 動画
W, H = 1280, 720
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'assets/motion/loading_mimi.mp4', '-vf', 'scale=in_color_matrix=bt709:in_range=pc,format=rgb24', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32); n = len(fr)
s23 = np.asarray(still.resize((1280, 724), Image.LANCZOS), np.float32)
x0, y0, x1, y1 = 790, 560, 910, 650
def cost(f, dx, dy): return np.abs(f[y0:y1, x0:x1] - s23[y0 + dy:y1 + dy, x0 + dx:x1 + dx]).mean()
sub = []
for i in range(n):
    best = min(((cost(fr[i], dx, dy), dx, dy) for dy in range(-8, 9) for dx in range(-8, 9)))
    c0, dx, dy = best
    cxm, cxp, cym, cyp = cost(fr[i], dx - 1, dy), cost(fr[i], dx + 1, dy), cost(fr[i], dx, dy - 1), cost(fr[i], dx, dy + 1)
    sub.append((dx + np.clip(0.5 * (cxm - cxp) / max(cxm - 2 * c0 + cxp, 1e-6), -.5, .5), dy + np.clip(0.5 * (cym - cyp) / max(cym - 2 * c0 + cyp, 1e-6), -.5, .5)))
sub = np.array(sub); k = np.array([1, 2, 3, 2, 1], np.float32); k /= k.sum()
sm = np.stack([np.convolve(np.concatenate([sub[-2:, j], sub[:, j], sub[:2, j]]), k, 'valid') for j in range(2)], 1)
out = np.empty_like(fr)
for i in range(n):
    dx, dy = sm[i]
    out[i] = fill(fr[i], [(x * 2 / 3 - dx, y * 2 / 3 - dy) for x, y in P], 905 * 2 / 3 - dy, 931.5 * 2 / 3 - dy, (int(round(1271 * 2 / 3 - dx)), int(round(921 * 2 / 3 - dy))))
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=pc', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
    '-pix_fmt', 'yuvj420p', '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
    '-movflags', '+faststart', '-an', 'assets/motion/loading_mimi.mp4'], stdin=subprocess.PIPE)
enc.stdin.write(np.clip(out + .5, 0, 255).astype(np.uint8).tobytes()); enc.stdin.close(); enc.wait()
print('done', n, 'frames; chest moves dy %.1f..%.1f px' % (sm[:, 1].min(), sm[:, 1].max()))
