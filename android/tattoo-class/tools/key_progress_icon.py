"""Chroma-key the apprentice art off its magenta (#FF00FF-ish) ground.

python3 key_progress_icon.py SRC.jpg OUT_DIR
Writes tattoo-progress-icon.png (tight crop, transparent) and the density
buckets the app uses (52dp tall progress figure).
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]

# Key colour = median of the border (the ground).
border = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
K = np.median(border, axis=0)
km = min(K[0], K[2]) - K[1]
# "Magenta-ness": how far red AND blue sit above green. Ground ~155, figure <= ~35.
m = np.minimum(R, B) - G
FG_M = 25.0
alpha = np.clip((km - 12 - m) / (km - 12 - FG_M), 0, 1)

# Keep only the figure: biggest connected blob of solid-ish pixels (+ its edge ring).
solid = alpha > 0.5
lab, n = ndimage.label(solid)
sizes = ndimage.sum(solid, lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.002 * solid.size])
keep = ndimage.binary_fill_holes(keep) | keep
ring = ndimage.binary_dilation(keep, iterations=3)
alpha = np.where(ring, alpha, 0)
alpha[keep & (alpha > 0.92)] = 1.0

# Un-mix the ground out of edge pixels: C = a*F + (1-a)*K  ->  F.
a3 = alpha[..., None]
F = np.where(a3 > 0.02, (rgb - (1 - a3) * K) / np.maximum(a3, 1e-3), rgb)
F = np.clip(F, 0, 255)
# Despill: red+blue may not rise above green by more than the figure ever does.
spill = np.maximum(0, np.minimum(F[..., 0], F[..., 2]) - F[..., 1] - FG_M)
F[..., 0] -= spill
F[..., 2] -= spill
F = np.clip(F, 0, 255)

rgba = np.dstack([F, alpha * 255]).round().astype(np.uint8)
rgba[alpha <= 0.0] = 0  # fully transparent pixels carry no colour
img = Image.fromarray(rgba, "RGBA")
bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
pad = 6
bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
img = img.crop(bbox)
os.makedirs(out, exist_ok=True)
img.save(os.path.join(out, "tattoo-progress-icon.png"), optimize=True)
print("crop", bbox, "size", img.size, "key", K)

def premul_resize(im, size):
    a = np.asarray(im).astype(np.float32) / 255
    pm = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3:4]])
    pmi = Image.fromarray((pm * 255).round().astype(np.uint8), "RGBA").resize(size, Image.LANCZOS)
    p = np.asarray(pmi).astype(np.float32) / 255
    al = p[..., 3:4]
    col = np.where(al > 0, p[..., :3] / np.maximum(al, 1e-4), 0)
    res = Image.fromarray((np.dstack([np.clip(col, 0, 1), al]) * 255).round().astype(np.uint8), "RGBA")
    if size[1] < 120:  # small buckets: a touch of sharpening keeps the machine and book readable
        rgbp = res.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=1))
        res = Image.merge("RGBA", (*rgbp.split(), res.getchannel("A")))
    return res

DP = 52
for name, scale in [("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)]:
    h = round(DP * scale)
    w = round(img.width * h / img.height)
    d = os.path.join(out, "res", f"drawable-{name}")
    os.makedirs(d, exist_ok=True)
    premul_resize(img, (w, h)).save(os.path.join(d, "tattoo_progress_icon.png"), optimize=True)
    print(name, w, h)
