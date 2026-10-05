# 使い方（リポジトリの一番上で）：python3 qa/alpha/loading_relink.py （生成そのままの qa/out/gen/loop_raw.mp4 から assets/motion/loading_mimi.mp4 を作り直す）
# 読み込み画面のミミ（loading_mimi.mp4）のつなぎ直し。
# 生成そのまま（qa/out/gen/loop_raw.mp4・145コマ）は最後のコマが最初のコマに戻り切らない（差 8.6・普段のコマ間は 2.0）。
# 前の版は最後の 19 コマを頭の 19 コマへ溶かしていたが、頭の 14〜22 コマ目がまばたきで、
# 開いた目と閉じた目が重なって片目が肌色ににじんで消えるコマができていた。
# → まばたきから離れた、いちばん似ている2コマ（5 と 136）の間でループを作り、8 コマだけ溶かす（どちらも目は開いている）
import subprocess, numpy as np
from PIL import Image
OW, OH, FPS = 1280, 720, 24
I, J, K = 5, 136, 8
p = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'qa/out/gen/loop_raw.mp4', '-vf', f'scale={OW}:{OH}:flags=lanczos:in_color_matrix=bt601:in_range=tv,format=rgb24', '-f', 'rawvideo', '-'], capture_output=True, check=True)
fr = np.frombuffer(p.stdout, np.uint8).reshape(-1, OH, OW, 3).astype(np.float32)
n = len(fr)
loop = [fr[t] for t in range(I + K, J)]
for k in range(K):
    t = (k + 1) / (K + 1); a = t * t * (3 - 2 * t)
    loop.append((1 - a) * fr[J + k] + a * fr[I + k])
loop = np.stack(loop); m = len(loop)
def mad(a, b): return float(np.abs(a - b).mean())
d = [mad(loop[q], loop[(q + 1) % m]) for q in range(m)]
print('loop %d frames (%.2fs) consecutive mean %.2f max %.2f seam %.2f' % (m, m / FPS, np.mean(d[:-1]), np.max(d[:-1]), d[-1]))
# 一枚絵（生成の最初のコマ）にいちばん近いコマから始める
still = np.asarray(Image.open('assets/backgrounds/loading_mimi.webp').convert('RGB').resize((OW, OH), Image.LANCZOS), np.float32)
dist = [mad(loop[q], still) for q in range(m)]
s0 = int(np.argmin(dist)); loop = np.concatenate([loop[s0:], loop[:s0]])
print('start at loop frame %d (MAD to still %.2f, raw0 to still %.2f)' % (s0, dist[s0], mad(fr[0], still)))
# 一枚絵に色を合わせる（読み込み画面では一枚絵の上に動画がふわっと重なる）
X = np.hstack([loop[0][::3, ::3].reshape(-1, 3), np.ones((loop[0][::3, ::3].size // 3, 1), np.float32)])
M, *_ = np.linalg.lstsq(X, still[::3, ::3].reshape(-1, 3), rcond=None)
loop = np.clip(loop.reshape(-1, 3) @ M[:3] + M[3], 0, 255).reshape(loop.shape)
print('mean rgb still', still.reshape(-1, 3).mean(0).round(1), 'loop0', loop[0].reshape(-1, 3).mean(0).round(1), 'MAD %.2f' % mad(loop[0], still))
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=pc', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
    '-pix_fmt', 'yuvj420p', '-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
    '-movflags', '+faststart', '-an', 'assets/motion/loading_mimi.mp4'], stdin=subprocess.PIPE)
enc.stdin.write(np.clip(loop + .5, 0, 255).astype(np.uint8).tobytes()); enc.stdin.close(); enc.wait()

