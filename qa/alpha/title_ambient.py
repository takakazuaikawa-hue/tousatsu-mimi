# タイトル背景の光の演出（title_loop_v3.mp4 の元）。qa/out/title3/ で実行：title_bg.png（元の絵）と ef/*.png（背景だけを動かした生成動画のコマ、750×1000）を置いて python3 title_ambient.py → amb/*.png
# できたコマは ffmpeg -framerate 24 -i amb/%03d.png -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart title_loop_v3.mp4 で動画にする（全部の動きが動画の長さで割り切れる周期なので、つなぎ直し不要）
# タイトル背景（title_bg）に光の演出を焼き込んだループ動画を作る。ミミ・背景の形は動かさない（光を足すだけ）
#  1) シャンデリア・ろうそくの明るい点に、小さな星形のきらめきを時々瞬かせる
#  2) ろうそくの明るさをわずかに揺らす
#  3) 大時計のガラスを柔らかい光の帯が横切る＋生成動画（背景だけ）から取り出した縁のきらめきを時計の中だけ足す
#  すべての動きはループの長さ L で周期的なので、つなぎ目が出ない
import numpy as np, glob, os
from PIL import Image
from scipy import ndimage as nd
rng = np.random.default_rng(11)
S = np.asarray(Image.open('title_bg.png').convert('RGB'), np.float32) / 255.0   # (1000,1600,3)
H, W = S.shape[:2]
N = 145; FPS = 24; L = N / FPS
Y = S @ np.array([0.299, 0.587, 0.114], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# --- 光る点を探す：小さく明るい点（トップハット）。ミミのいる左下は避ける ---
th = Y - nd.grey_opening(Y, size=(9, 9))
allowed = ((xx > 560) & (yy < 560)) | ((xx > 900) & (yy >= 560) & (yy < 980))
allowed &= ~((xx < 900) & (yy > 300) & (xx > 560) & (yy < 560) & (Y < 0))  # 予約（使わない）
cand = (th > 0.16) & (Y > 0.78) & allowed
lab, n = nd.label(cand)
pts = nd.center_of_mass(th, lab, range(1, n + 1))
vals = nd.maximum(th, lab, range(1, n + 1))
order = np.argsort(vals)[::-1]
pts = [pts[i] for i in order]
# 近すぎる点は間引く
chosen = []
for (py, px) in pts:
    if all((py - qy) ** 2 + (px - qx) ** 2 > 38 ** 2 for qy, qx in chosen):
        chosen.append((py, px))
    if len(chosen) >= 34: break
print('glint points', len(chosen))

def star(size, rot):
    r = int(size * 1.6); g = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
    y, x = g[0], g[1]
    c, s = np.cos(rot), np.sin(rot); xr = c * x - s * y; yr = s * x + c * y
    core = np.exp(-(x * x + y * y) / (2 * (size * 0.16) ** 2))
    arm = np.exp(-(yr * yr) / (2 * 0.9 ** 2)) * np.exp(-np.abs(xr) / (size * 0.45)) + np.exp(-(xr * xr) / (2 * 0.9 ** 2)) * np.exp(-np.abs(yr) / (size * 0.45))
    halo = 0.25 * np.exp(-(x * x + y * y) / (2 * (size * 0.5) ** 2))
    return np.clip(core + 0.75 * arm + halo, 0, 1.4)

glints = []
for (py, px) in chosen:
    size = rng.uniform(7, 15)
    P = L / rng.choice([1, 2, 3])                 # 周期は L を割り切る
    phase = rng.uniform(0, 1)
    glints.append((int(py), int(px), star(size, rng.choice([0, np.pi / 4])), P, phase, rng.uniform(0.55, 0.95)))

# --- ろうそく：右の燭台のあたりの小さな明るい点の明るさを揺らす ---
candle = (th > 0.10) & (Y > 0.70) & (yy > 380) & (yy < 560) & (xx > 600)
cl, cn = nd.label(candle)
cpts = nd.center_of_mass(candle, cl, range(1, cn + 1))
flick = np.zeros((H, W), np.float32); fl_terms = []
for (py, px) in cpts[:160]:
    fl_terms.append((py, px, rng.uniform(0, 2 * np.pi, 3)))
print('candles', len(fl_terms))

# --- 大時計：中心と半径（目測）。ガラスを横切る光の帯 ---
cx, cy, cr = 1350.0, 262.0, 250.0
dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
clock = np.clip((cr - dist) / 40.0, 0, 1)
bright_lines = np.clip((Y - 0.45) / 0.4, 0, 1)

# --- 生成動画（背景だけ）から取り出した縁のきらめき：時計の中だけ・少し強めて ---
fs = sorted(glob.glob('ef/*.png'))
Fv = np.stack([np.asarray(Image.open(f).convert('RGB'), np.float32) / 255.0 for f in fs])
Fv = np.roll(Fv, -2, axis=1)
Dv = Fv - Fv.mean(0)
Dv = nd.gaussian_filter(Dv, sigma=(1, 0.8, 0.8, 0))
Dv = np.sign(Dv) * np.maximum(np.abs(Dv) - 0.006, 0) * 2.2
cmask = np.zeros((H, W), np.float32); cmask[:, 850:1600] = 1
cmask *= clock
win = np.sin(np.pi * (np.arange(N) + 0.5) / N) ** 0.5    # ループの境目では 0 に

os.makedirs('amb', exist_ok=True)
for t in range(N):
    tt = t / FPS
    out = S.copy()
    # ろうそくの揺らぎ
    if fl_terms:
        g = np.zeros((H, W), np.float32)
        for (py, px, ph) in fl_terms:
            v = 0.5 * np.sin(2 * np.pi * 3 * tt / L + ph[0]) + 0.3 * np.sin(2 * np.pi * 5 * tt / L + ph[1]) + 0.2 * np.sin(2 * np.pi * 8 * tt / L + ph[2])
            iy, ix = int(py), int(px)
            y0, y1, x0, x1 = max(0, iy - 9), min(H, iy + 10), max(0, ix - 9), min(W, ix + 10)
            g[y0:y1, x0:x1] += v * np.exp(-((yy[y0:y1, x0:x1] - py) ** 2 + (xx[y0:y1, x0:x1] - px) ** 2) / (2 * 4.0 ** 2))
        out = out * (1 + 0.10 * g[..., None])
    # 時計の光の帯（左上→右下へ L で1回横切る）
    u = ((xx - cx) * 0.8 + (yy - cy) * 0.6) / cr          # -1..1 くらい
    pos = -1.6 + 3.2 * ((tt / L) % 1.0)
    band = np.exp(-((u - pos) ** 2) / (2 * 0.12 ** 2)) * clock * (0.35 + 0.65 * bright_lines)
    out = out + 0.16 * band[..., None] * np.array([1.0, 0.93, 0.8], np.float32)
    # 生成動画の縁のきらめき（時計の中）
    out[:, 850:1600] += Dv[t] * cmask[:, 850:1600, None] * win[t]
    # 星形のきらめき（スクリーン合成）
    gl = np.zeros((H, W), np.float32)
    for (py, px, spr, P, ph, amp) in glints:
        e = max(0.0, np.sin(2 * np.pi * (tt / P + ph))) ** 10 * amp
        if e < 0.01: continue
        r = spr.shape[0] // 2
        y0, y1, x0, x1 = py - r, py + r + 1, px - r, px + r + 1
        sy0, sx0 = max(0, -y0), max(0, -x0); y0c, x0c = max(0, y0), max(0, x0); y1c, x1c = min(H, y1), min(W, x1)
        gl[y0c:y1c, x0c:x1c] = np.maximum(gl[y0c:y1c, x0c:x1c], e * spr[sy0:sy0 + (y1c - y0c), sx0:sx0 + (x1c - x0c)])
    col = np.array([1.0, 0.95, 0.84], np.float32)
    out = 1 - (1 - np.clip(out, 0, 1)) * (1 - np.clip(gl[..., None] * col, 0, 1))
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'amb/{t:03d}.png')
print('frames', N)
