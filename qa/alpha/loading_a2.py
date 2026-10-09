# 読み込み画面のミミ（一枚絵 assets/backgrounds/loading_mimi.webp と動画 assets/motion/loading_mimi.mp4）の「A2」の直し。
# 画面の左の胸の外側（腕と胸と革のカップの境目）で、胸の輪郭（線1）とカップの縁の延長（線2）が「V」の字に交わり、
# 胸の肌が下向きに細くとがっていた。線1の下の方と線2を消して肌でうめ、胸の輪郭がカップの縁へ丸くつながるように描き直す。
# 形はすべて一枚絵（1920x1086）の画素の番号（画素 k の中心＝k）で決め、動画のコマには縮尺（2/3）と位置ずれを当てて写す。
# 使い方（リポジトリの一番上で）：
#   python3 qa/alpha/loading_a2.py      … 一枚絵を直す（直し済みなら何もしない）
#   python3 qa/alpha/loading_relink.py  … 動画を生成そのままから作り直す（書き出す前に fix_frames() を呼ぶ）
import numpy as np
from PIL import Image

STILL = 'assets/backgrounds/loading_mimi.webp'

# 線1の芯（1行ずつ測った値）と、線2（V の先からカップの角まで）
L1 = np.array([(1067.0, 756), (1066.4, 760), (1066.0, 764), (1065.2, 768), (1064.6, 770), (1064.0, 772), (1064.0, 774),
               (1063.6, 776), (1063.1, 778), (1063.0, 780), (1062.6, 782), (1062.1, 784), (1062.0, 786), (1061.2, 788),
               (1061.0, 790), (1060.6, 792), (1060.4, 794.6)], float)
L2 = np.array([(1060.4, 794.6), (1062.0, 794.0), (1063.0, 793.1), (1064.0, 792.1), (1065.0, 791.1), (1066.4, 790.0), (1067.4, 789.2)], float)
CUT = 777.0                     # 線1はここまで残し、ここから新しい丸い輪郭に入る
RIM = np.array([(1068.9, 788.3), (1070.4, 786.9), (1072.4, 785.0), (1074.4, 782.0), (1076.4, 780.0), (1080, 777.5), (1090, 770)], float)
CUP_X = 1067.55                 # カップの左の縁（角より下）
LUM = np.array([0.299, 0.587, 0.114], np.float32)


def _bez(p0, p1, p2, p3, n=64):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def new_curve():
    """線1の CUT から、線1と同じ向きで下りはじめ、カップの縁の向きで縁に入る丸い輪郭"""
    p0 = np.array([np.interp(CUT, L1[:, 1], L1[:, 0]), CUT])
    d0 = np.array([-0.14, 1.0]); d0 /= np.linalg.norm(d0)
    p3 = RIM[0].copy(); d3 = np.array([0.79, -0.61]); d3 /= np.linalg.norm(d3)
    return _bez(p0, p0 + 6.0 * d0, p3 - 3.6 * d3, p3)


def line_path(y_from):
    """描き直す輪郭：線1の y_from から CUT まで（もとの線に重ねてつなぐ）＋新しい丸い輪郭"""
    return np.vstack([L1[(L1[:, 1] >= y_from) & (L1[:, 1] < CUT)], new_curve()])


def _nearest(px, py, P):
    """各点から折れ線 P への距離・最寄りの線分での向き（外積の符号）・折れ線上の位置（0〜1）"""
    d = np.full(px.shape, 1e9); sgn = np.zeros(px.shape); pos = np.zeros(px.shape)
    for i, ((ax, ay), (bx, by)) in enumerate(zip(P[:-1], P[1:])):
        vx, vy = bx - ax, by - ay; L = vx * vx + vy * vy
        t = np.clip(((px - ax) * vx + (py - ay) * vy) / max(L, 1e-9), 0, 1)
        dd = np.hypot(px - (ax + t * vx), py - (ay + t * vy))
        m = dd < d
        d = np.where(m, dd, d); sgn = np.where(m, np.sign(vx * (py - ay) - vy * (px - ax)), sgn); pos = np.where(m, (i + t) / (len(P) - 1), pos)
    return d, sgn, pos


def masks(xs, ys, band1=2.9, band2=2.7):
    """一枚絵の座標の点 (xs, ys) ごとに、肌で塗り直す所なら True"""
    bound = np.vstack([L1[L1[:, 1] <= CUT], new_curve()[1:], RIM[1:]])     # 直した後の胸の外周
    _, s, _ = _nearest(xs, ys, bound)
    breast = s == _nearest(np.array([1075.0]), np.array([770.0]), bound)[1][0]
    lower = L1[L1[:, 1] >= CUT - 1]
    d1, _, _ = _nearest(xs, ys, lower)
    d2, _, _ = _nearest(xs, ys, L2)
    oldV = np.vstack([lower, L2[1:]])                                       # もとの「V」の内側（線1の右・線2の上）
    _, sv, _ = _nearest(xs, ys, oldV)
    insideV = (sv == _nearest(np.array([1066.0]), np.array([786.0]), oldV)[1][0]) & (ys <= 795) & (xs <= 1068)
    cup = (ys >= 789.6) & (xs >= CUP_X - 0.2)
    return ((d1 < band1) | (d2 < band2) | insideV) & ~breast & ~cup & (ys >= CUT - 2.5)


def _harmonic_fill(img, R, ok, iters):
    """R の中を、まわりの肌（ok）からなめらかにつなぐ（ラプラス方程式をヤコビ法で解く。暗い所は境目に使わない）"""
    out = img.copy()
    known = ~R & ok
    out[R] = img[known].mean(0)
    use = (R | known).astype(np.float32)
    for _ in range(iters):
        acc = np.zeros_like(out); cnt = np.zeros(R.shape, np.float32)
        for sy, sx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(np.roll(out * use[..., None], sy, 0), sx, 1); cnt += np.roll(np.roll(use, sy, 0), sx, 1)
        out[R] = (acc / np.maximum(cnt, 1)[..., None])[R]
    return out


def _repaint(crop, to_still, path, color, sigma, band1, band2, skin_xy, iters, S=4):
    """crop（その画像の一部）を直す。to_still(x, y) は crop の画素の番号を一枚絵の座標へ写す。path・sigma は crop の座標"""
    h, w = crop.shape[:2]
    oy, ox = np.mgrid[0:h * S, 0:w * S]
    xs, ys = to_still((ox + 0.5) / S - 0.5, (oy + 0.5) / S - 0.5)
    R = masks(xs, ys, band1, band2).reshape(h, S, w, S).mean((1, 3))
    Lm = crop @ LUM
    sx, sy = skin_xy
    skin = np.median(Lm[sy - 3:sy + 4, sx - 3:sx + 4])
    filled = _harmonic_fill(crop, R > 0.02, Lm > 0.85 * skin, iters)
    out = crop * (1 - R[..., None]) + filled * R[..., None]
    # 輪郭の線を重ねる（芯の濃さはガウス形、細かく取って平均）
    gx = (ox + 0.5) / S - 0.5; gy = (oy + 0.5) / S - 0.5
    d, _, _ = _nearest(gx, gy, path)
    a = np.exp(-d ** 2 / (2 * sigma ** 2)).reshape(h, S, w, S).mean((1, 3))
    return out * (1 - a[..., None]) + np.asarray(color, np.float32) * a[..., None]


def is_fixed(a):
    """もとの V の先（1060, 794）が肌の明るさなら直し済み"""
    return float(a[794, 1060] @ LUM) > 140


def fix_still(a):
    a = a.astype(np.float32).copy()
    x0, y0, x1, y1 = 1035, 750, 1095, 815
    color = np.array([a[765, 1066], a[768, 1065], a[772, 1064], a[774, 1064], a[778, 1063]]).mean(0)
    path = line_path(770.0) - (x0, y0)
    a[y0:y1, x0:x1] = _repaint(a[y0:y1, x0:x1], lambda x, y: (x + x0, y + y0), path, color, 0.78, 2.9, 2.7, (1050 - x0, 780 - y0), 2500)
    return a


def track(frames, still):
    """各コマの位置ずれ (dx, dy)：コマの画素 (x, y) ≈ 一枚絵を 1280x724 に縮めた絵の (x+dx, y+dy)。
    直す所は比べる対象から外すので、一枚絵が直し済みでも、もとのままでも同じに求まる。ループなので前後をつないでならす"""
    s23 = np.asarray(Image.fromarray(np.clip(still + .5, 0, 255).astype(np.uint8)).resize((1280, 724), Image.LANCZOS), np.float32)
    keep = np.ones((724, 1280), bool)
    yy, xx = np.mgrid[480:560, 670:750]
    k = ~masks(1.5 * (xx + 0.5) - 0.5, 1.5 * (yy + 0.5) - 0.5, 3.4, 3.2)
    keep[480:560, 670:750] = k & np.roll(k, 1, 0) & np.roll(k, -1, 0) & np.roll(k, 1, 1) & np.roll(k, -1, 1)
    def search(f, win, cands):
        x0, y0, x1, y1 = win
        W = keep[y0:y1, x0:x1, None]
        def cost(dx, dy): return float((np.abs(f[y0 - dy:y1 - dy, x0 - dx:x1 - dx] - s23[y0:y1, x0:x1]) * W).sum() / W.sum())
        c0, dx, dy = min((cost(dx, dy), dx, dy) for dx, dy in cands)
        cxm, cxp, cym, cyp = cost(dx - 1, dy), cost(dx + 1, dy), cost(dx, dy - 1), cost(dx, dy + 1)
        fx = dx + 0.5 * (cxm - cxp) / max(cxm - 2 * c0 + cxp, 1e-6); fy = dy + 0.5 * (cym - cyp) / max(cym - 2 * c0 + cyp, 1e-6)
        return np.clip(fx, dx - 0.5, dx + 0.5), np.clip(fy, dy - 0.5, dy + 0.5)
    sub = []
    for f in frames:
        f = f.astype(np.float32)
        cx, cy = search(f, (680, 492, 736, 548), [(dx, dy) for dx in range(-5, 6) for dy in range(-2, 13)])
        ix, iy = int(round(cx)), int(round(cy))
        sub.append(search(f, (700, 500, 724, 536), [(dx, dy) for dx in range(ix - 1, ix + 2) for dy in range(iy - 1, iy + 2)]))
    sub = np.array(sub)
    k = np.array([1, 2, 3, 2, 1], np.float32); k /= k.sum()
    return np.stack([np.convolve(np.concatenate([sub[-2:, j], sub[:, j], sub[:2, j]]), k, 'valid') for j in range(2)], 1)


def fix_frames(frames, still):
    """frames：n x 720 x 1280 x 3（float32、その場で直す）。still：一枚絵（1086 x 1920 x 3）"""
    offs = track(frames, still)
    vx0, vy0, vx1, vy1 = 688, 492, 732, 544
    for i, (dx, dy) in enumerate(offs):
        crop = frames[i, vy0:vy1, vx0:vx1].astype(np.float32)
        def v(X, Y): return (X + 0.5) / 1.5 - 0.5 - dx - vx0, (Y + 0.5) / 1.5 - 0.5 - dy - vy0
        # 線の色：このコマの線1（一枚絵の y 762〜775）で、行ごとに一番濃い画素の色の平均
        Lm = crop @ LUM; cols = []
        for Y in range(762, 776):
            xv, yv = v(np.interp(Y, L1[:, 1], L1[:, 0]), Y)
            yi, xi = int(round(yv)), int(round(xv))
            cols.append(crop[yi, xi - 2 + int(np.argmin(Lm[yi, xi - 2:xi + 3]))])
        px, py = v(*line_path(766.0).T)
        sx, sy = v(1050, 782)
        frames[i, vy0:vy1, vx0:vx1] = _repaint(crop, lambda x, y: (1.5 * (x + vx0 + 0.5 + dx) - 0.5, 1.5 * (y + vy0 + 0.5 + dy) - 0.5),
                                               np.stack([px, py], 1), np.mean(cols, 0), 0.56, 3.4, 3.2, (int(round(sx)), int(round(sy))), 1200)
    return offs


if __name__ == '__main__':
    a = np.asarray(Image.open(STILL).convert('RGB'), np.float32)
    if is_fixed(a):
        print('already fixed:', STILL)
    else:
        Image.fromarray(np.clip(fix_still(a) + .5, 0, 255).astype(np.uint8)).save(STILL, 'WEBP', quality=90, method=6)
        print('fixed:', STILL)
