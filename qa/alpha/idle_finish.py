# 相手の待機動画（assets/motion/idle_<相手>.mp4）の仕上げ。
# 元の絵は qa/idleframes.mjs で本編の卓から撮る（qa/out/idle/frame_<相手>.png・1200×900）。それを最初と最後のコマにして
# 動画を生成（Seedance 2.0・1080p・6秒・音なし・「カメラ固定、呼吸と一度のまばたきだけ、最後のコマは最初と同じ」）し、
# 生成そのままを raw_<相手>.mp4 としてこの手順に渡す：python3 qa/alpha/idle_finish.py <相手> [溶かすコマ数=12] [crf=22]
# （研修のリコ先輩だけは、元の絵を「考え中」の暗い状態で撮ってしまったので、部屋と相手を分けて色を明るく直してから通した）
# 生成動画は色の決まりが書かれていないが BT.601 で作られている：生成動画（最初と最後のコマ＝卓で撮った一枚絵）を
#  1) 1200×900 に縮める  2) 一枚絵に色を合わせる（RGB の一次変換を最小二乗で）
#  3) 最後の 0.5 秒を最初へ溶かしてつなぐ（継ぎ目の段差を消す）  4) 一枚絵にいちばん近いコマから始める
#  5) 上と左右の縁を一枚絵に溶かす（周りの部屋と段差が出ない）  6) 色の決まりを明記して書き出す
import sys, subprocess, numpy as np
from PIL import Image
name = sys.argv[1]
K = int(sys.argv[2]) if len(sys.argv) > 2 else 12
OW, OH, FPS = 1200, 900, 24
raw = f'raw_{name}.mp4'
p = subprocess.run(['ffmpeg', '-v', 'error', '-i', raw, '-vf', f'scale={OW}:{OH}:flags=lanczos:in_color_matrix=bt601:in_range=tv,format=rgb24', '-f', 'rawvideo', '-'], capture_output=True, check=True)
fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, OH, OW, 3).astype(np.float32)
n = len(fr)
src = np.asarray(Image.open(f'qa/out/idle/frame_{name}.png').convert('RGB'), np.float32)
assert src.shape == (OH, OW, 3), src.shape
def mad(a, b): return float(np.abs(a - b).mean())
# 2) 色合わせ：src ≈ [f0, 1] @ M（3×3 の混色＋ずれ）
X = fr[0][::3, ::3].reshape(-1, 3); Y = src[::3, ::3].reshape(-1, 3)
Xa = np.hstack([X, np.ones((len(X), 1), np.float32)])
M, *_ = np.linalg.lstsq(Xa, Y, rcond=None)
print(name, 'color M\n', M.round(3))
before = mad(fr[0], src)
fr = np.clip(fr.reshape(-1, 3) @ M[:3] + M[3], 0, 255).reshape(fr.shape).astype(np.float32)
print(' f0 vs still MAD before %.2f after %.2f' % (before, mad(fr[0], src)))
# 3) 継ぎ目：fr[K..n-K-1] のあとに、fr[n-K+i] を fr[i] へ溶かす K コマ
out = [fr[j] for j in range(K, n - K)]
for i in range(K):
    t = (i + 1) / (K + 1); a = t * t * (3 - 2 * t)
    out.append((1 - a) * fr[n - K + i] + a * fr[i])
out = np.stack(out)
m = len(out)
d = [mad(out[i], out[(i + 1) % m]) for i in range(m)]
print(' loop frames %d (%.2fs)  consecutive mean %.2f max %.2f  seam %.2f' % (m, m / FPS, np.mean(d[:-1]), np.max(d[:-1]), d[-1]))
# 4) 一枚絵にいちばん近いコマから始める
dist = [mad(out[i], src) for i in range(m)]
j = int(np.argmin(dist)); out = np.concatenate([out[j:], out[:j]])
print(' start at %d (MAD to still %.2f)' % (j, dist[j]))
# 5) 縁を一枚絵へ（左右 140px・上 100px。下はレールの裏）
xs = np.arange(OW, dtype=np.float32); ys = np.arange(OH, dtype=np.float32)
def ss(v): v = np.clip(v, 0, 1); return v * v * (3 - 2 * v)
mx = ss(np.minimum(xs / 140, (OW - 1 - xs) / 140)); my = ss(ys / 100)
mask = (my[:, None] * mx[None, :])[..., None]
out = out * mask + src[None] * (1 - mask)
# 6) 書き出し（bt709・フルレンジ・sRGB の階調＝一枚絵と同じ色に見える決まり。loading_mimi.mp4 と同じ）
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=pc', '-c:v', 'libx264', '-preset', 'slow', '-crf', sys.argv[3] if len(sys.argv) > 3 else '22',
    '-pix_fmt', 'yuvj420p', '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
    '-movflags', '+faststart', '-an', f'idle_{name}.mp4'], stdin=subprocess.PIPE)
enc.stdin.write(np.clip(out + 0.5, 0, 255).astype(np.uint8).tobytes()); enc.stdin.close(); enc.wait()
Image.fromarray(np.clip(out[0] + .5, 0, 255).astype(np.uint8)).save(f'idle_{name}_f0.png')
