# 心理・論理バトルの背景の光をプログラムで描く（透明度はなめらか、色のにじみなし）
# python3 qa/alpha/aura.py （リポジトリの一番上で実行。assets/ui/fx_aura_psych.webp / fx_aura_logic.webp を書き出す。要 numpy・scipy・pillow）
import numpy as np
from PIL import Image
from scipy import ndimage as nd
W, H = 1280, 720
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = xx / W, yy / H

def fbm(oct=6, base=4, seed=0, warp=None):
    r = np.random.default_rng(seed); out = np.zeros((H, W), np.float32); amp = 1; tot = 0
    for o in range(oct):
        f = base * 2 ** o; g = r.random((int(H / W * f) + 3, f + 3)).astype(np.float32)
        z = nd.zoom(g, (H / (g.shape[0] - 3), W / (g.shape[1] - 3)), order=3)[:H, :W]
        out += amp * z; tot += amp; amp *= .5
    return out / tot

def save(rgb, a, path):
    a = np.clip(a, 0, 1); rgb = np.clip(rgb, 0, 1)
    im = np.dstack([rgb * 255, a * 255]).astype(np.uint8)
    Image.fromarray(im, 'RGBA').save(path, 'WEBP', quality=86, method=6)

# ---- 心理：下から立ちのぼる紫×桃の妖気 ----
n1 = fbm(6, 3, 1); n2 = fbm(6, 5, 2)
# 上へ流れる煙：x を縦方向にゆがめて筋を作る
wx = (u + .08 * (n1 - .5)) ; wy = v + .12 * (n2 - .5)
smoke = fbm(5, 6, 3)
sm = nd.map_coordinates(smoke, [np.clip(wy * H * .6 + H * .2, 0, H - 1), np.clip(wx * W, 0, W - 1)], order=1)
edge = np.minimum(1, (np.abs(u - .5) * 2) ** 2.2)          # 左右の端ほど高く立ちのぼる
height = .18 + .42 * edge                                    # 下からの高さ（画面比）
rise = np.clip((v - (1 - height - .1 * (n1 - .5))) / np.maximum(height, .05), 0, 1)
big = fbm(5, 2, 5)
dens = np.clip(rise ** 1.2 * (.45 + 1.3 * (sm - .4) + .8 * (big - .5)), 0, 1)
# 縦に伸びた炎の舌：横に細かく縦に粗いノイズを、下から上へ流れるようにゆがめる
g = np.random.default_rng(21).random((9, 70)).astype(np.float32)
tong = nd.zoom(g, (H / 9, W / 70), order=3)[:H, :W]
tong = nd.map_coordinates(tong, [yy, np.clip(xx + 60 * (n1 - .5) + 40 * (n2 - .5) * (1 - v), 0, W - 1)], order=1)
wisps = np.clip((tong - .55) * 3.2, 0, 1) * np.clip(rise * 1.3, 0, 1) ** 1.5
a = np.clip(dens * .9 + wisps * .55, 0, 1) ** 1.1
t = np.clip(dens * 1.1 + wisps * .7, 0, 1)
purple = np.array([.45, .12, .78]); pink = np.array([1.0, .38, .82]); hot = np.array([1.0, .78, .95])
rgb = purple * (1 - t[..., None]) + pink * t[..., None]
rgb = rgb * (1 - (t ** 4)[..., None] * .6) + hot * (t ** 4)[..., None] * .6
# 火の粉
sp = rng.random((H, W)) > .99985
sp = nd.gaussian_filter(sp.astype(np.float32), 1.2) * 30 * np.clip((v - .5) / .5, 0, 1) ** 2
a = np.maximum(a, np.clip(sp, 0, 1)); rgb = rgb * (1 - np.clip(sp, 0, 1)[..., None]) + pink * np.clip(sp, 0, 1)[..., None]
save(rgb, a, 'assets/ui/fx_aura_psych.webp')

# ---- 論理：青の電脳。遠近の光の線・走査線・小さな数字の点 ----
cx, hy = .5, .62                                              # 消失点
glow = np.exp(-((u - cx) ** 2 / .09 + (v - 1.02) ** 2 / .05))
dy = np.maximum(v - hy, 1e-3)
grid_x = np.abs(((u - cx) / dy * .9) % .25 - .125) / .125     # 床の縦線
grid_y = np.abs((1 / dy * .35) % 1 - .5) * 2                  # 床の横線
floor = np.clip((v - hy) / (1 - hy), 0, 1)
lines = (np.clip((grid_x - .9) * 10, 0, 1) + np.clip((grid_y - .93) * 14, 0, 1)) * floor ** 1.2
# 左右から弧を描いて流れる光の帯
arcs = np.zeros((H, W), np.float32)
for k in range(9):
    c = .55 + k * .045 + rng.normal(0, .01); w = .0025 + rng.random() * .004
    curve = c + .55 * (u - .5) ** 2 + .015 * np.sin(u * 7 + k)
    arcs += np.exp(-((v - curve) ** 2) / w ** 2 / 2) * (.35 + .65 * rng.random())
arcs *= np.clip(np.abs(u - .5) * 2.2, .15, 1)
# 数字の点の帯（判読できない細かい点）
cells = (rng.random((H // 6, W // 4)) > .82).astype(np.float32)
dots = np.kron(cells, np.ones((6, 4)))[:H, :W] * ((yy % 6) < 3) * ((xx % 4) < 2)
dots *= np.clip(1 - np.abs(v - .7) / .14, 0, 1) * (.4 + .6 * fbm(3, 4, 9))
scan = .85 + .15 * ((yy % 3) < 1)
nodes = nd.gaussian_filter((rng.random((H, W)) > .99965).astype(np.float32), 1.5) * 40 * floor
e = np.clip(glow * .9 + lines * .55 + arcs * .7 + dots * .45 + np.clip(nodes, 0, 1), 0, 1.4) * scan
haze = np.clip(floor ** 1.6 * .35 * (.6 + .8 * fbm(5, 4, 11)), 0, 1)
a = np.clip(np.maximum(e, haze), 0, 1)
deep = np.array([.05, .2, .75]); cyan = np.array([.35, .8, 1.0]); white = np.array([.9, .97, 1.0])
tt = np.clip(e, 0, 1)
rgb = deep * (1 - tt[..., None]) + cyan * tt[..., None]
rgb = rgb * (1 - (tt ** 3)[..., None] * .5) + white * (tt ** 3)[..., None] * .5
save(rgb, a, 'assets/ui/fx_aura_logic.webp')
print('ok')
