#!/usr/bin/env python3
"""Tattoo class launcher icon: same family as the colourful booking calendar icon
(sky-to-pink gradient tile, white 3D object, round colour badge), with a tattoo-education
element: an open book and a tattoo pen with a needle and an ink drop. Writes an adaptive
icon (background + foreground, all densities), legacy square/round icons and a 512 preview."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent / "app/src/main/res"
S = 1024  # working size of a 108dp adaptive layer


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def background(size=S):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    c1, c2, c3 = (108, 200, 245, 255), (160, 170, 250, 255), (246, 160, 206, 255)
    for y in range(size):
        for x in range(size):
            t = (x * 0.45 + y * 0.55) / size
            px[x, y] = lerp(c1, c2, t / 0.55) if t < 0.55 else lerp(c2, c3, (t - 0.55) / 0.45)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-size * 0.2, -size * 0.3, size * 0.7, size * 0.45], fill=(255, 255, 255, 70))
    return Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(size // 12)))


def shadow(mask, offset, blur, alpha):
    sh = Image.new("RGBA", mask.size, (40, 30, 90, 0))
    a = mask.point(lambda v: v * alpha // 255)
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    out.paste(sh, offset, sh)
    return out


def foreground(size=S):
    u = size / 108.0  # one dp of the 108dp layer; safe zone is the centre 66dp
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Open book (white pages with a soft fold), centred a little low.
    book = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(book)
    cx, top, bottom = 54 * u, 40 * u, 74 * u
    left_page = [(cx, top + 3 * u), (cx - 27 * u, top - 1 * u), (cx - 27 * u, bottom - 4 * u), (cx, bottom)]
    right_page = [(cx, top + 3 * u), (cx + 27 * u, top - 1 * u), (cx + 27 * u, bottom - 4 * u), (cx, bottom)]
    d.polygon([(cx - 29 * u, top + 1 * u), (cx, top + 5 * u), (cx + 29 * u, top + 1 * u), (cx + 29 * u, bottom - 1 * u), (cx, bottom + 3 * u), (cx - 29 * u, bottom - 1 * u)], fill=(123, 97, 255, 255))
    d.polygon(left_page, fill=(255, 255, 255, 255))
    d.polygon(right_page, fill=(246, 246, 255, 255))
    for i in range(4):
        yy = top + (8 + i * 6) * u
        d.line([(cx - 23 * u, yy - 1.2 * u), (cx - 6 * u, yy + 1.6 * u)], fill=(200, 196, 240, 255), width=int(1.6 * u))
        d.line([(cx + 6 * u, yy + 1.6 * u), (cx + 23 * u, yy - 1.2 * u)], fill=(200, 196, 240, 255), width=int(1.6 * u))
    d.line([(cx, top + 3 * u), (cx, bottom)], fill=(214, 210, 245, 255), width=int(1.2 * u))
    layer = Image.alpha_composite(layer, shadow(book.getchannel("A"), (0, int(3 * u)), int(3 * u), 110))
    layer = Image.alpha_composite(layer, book)

    # Tattoo pen writing on the book: needle down-left on the page, a pink ink drop at the tip.
    pen = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    p = ImageDraw.Draw(pen)
    k = 2  # pen drawn at 2x then rotated
    x0, yc = 13 * u * k, 54 * u * k  # pen spans x0+16 (needle tip) .. x0+66 (end); centre at 54dp
    hw = 5 * u * k
    p.rounded_rectangle([x0 + 36 * u * k, yc - hw, x0 + 66 * u * k, yc + hw], radius=hw, fill=(35, 38, 74, 255))  # body
    p.rounded_rectangle([x0 + 41 * u * k, yc - hw, x0 + 46 * u * k, yc + hw], radius=1 * u * k, fill=(20, 163, 154, 255))  # teal ring
    p.rounded_rectangle([x0 + 57 * u * k, yc - hw, x0 + 61 * u * k, yc + hw], radius=1 * u * k, fill=(240, 138, 36, 255))  # orange ring
    p.polygon([(x0 + 36 * u * k, yc - 4.2 * u * k), (x0 + 25 * u * k, yc - 1.8 * u * k), (x0 + 25 * u * k, yc + 1.8 * u * k), (x0 + 36 * u * k, yc + 4.2 * u * k)], fill=(176, 182, 210, 255))  # grip cone
    p.rectangle([x0 + 16 * u * k, yc - 0.7 * u * k, x0 + 25 * u * k, yc + 0.7 * u * k], fill=(110, 116, 150, 255))  # needle
    p.rounded_rectangle([x0 + 48 * u * k, yc - 3.4 * u * k, x0 + 55 * u * k, yc - 1.6 * u * k], radius=1 * u * k, fill=(255, 255, 255, 100))  # shine
    pen = pen.rotate(38, resample=Image.BICUBIC, center=(54 * u * k, 54 * u * k)).resize((size, size), Image.LANCZOS)
    ox, oy = 5, -8  # pen centre moves to (59, 46)dp
    pen = ImageChops.offset(pen, int(ox * u), int(oy * u))
    layer = Image.alpha_composite(layer, shadow(pen.getchannel("A"), (int(1 * u), int(3 * u)), int(2.5 * u), 120))

    d = ImageDraw.Draw(layer)
    # Ink at the needle tip: a short pink stroke on the page and a drop.
    tx, ty = 59 - 23.6 * 0.788 - 0.5, 46 + 23.6 * 0.616 + 0.5  # needle tip after rotation
    tx, ty = tx * u, ty * u
    d.line([(tx - 7 * u, ty + 5 * u), (tx - 3 * u, ty + 2.2 * u), (tx, ty + 0.4 * u)], fill=(244, 91, 140, 255), width=int(2.2 * u), joint="curve")
    d.ellipse([tx - 1.6 * u, ty - 1.6 * u, tx + 1.6 * u, ty + 1.6 * u], fill=(244, 91, 140, 255))
    layer = Image.alpha_composite(layer, pen)

    # Green check badge, like the calendar icon, bottom-right inside the safe zone.
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    b = ImageDraw.Draw(badge)
    bx, by, r = 72 * u, 70 * u, 8.5 * u
    b.ellipse([bx - r, by - r, bx + r, by + r], fill=(34, 160, 107, 255))
    b.ellipse([bx - r, by - r, bx + r, by + r], outline=(255, 255, 255, 255), width=int(1.8 * u))
    b.line([(bx - 4.2 * u, by + 0.2 * u), (bx - 1.2 * u, by + 3.4 * u), (bx + 4.6 * u, by - 3.2 * u)], fill=(255, 255, 255, 255), width=int(2.4 * u), joint="curve")
    layer = Image.alpha_composite(layer, shadow(badge.getchannel("A"), (0, int(2 * u)), int(2 * u), 110))
    layer = Image.alpha_composite(layer, badge)
    return layer


def legacy(bg, fg, size, round_):
    full = Image.alpha_composite(bg, fg)
    crop = int(S * 9 / 108)  # legacy icons show slightly more than the 72dp viewport
    full = full.crop((crop, crop, S - crop, S - crop)).resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    md = ImageDraw.Draw(mask)
    if round_:
        md.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 * 0.23, fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(full, (0, 0), mask)
    return out


def main():
    bg, fg = background(), foreground()
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, m in dens.items():
        folder = ROOT / f"mipmap-{name}"
        folder.mkdir(parents=True, exist_ok=True)
        layer = int(108 * m)
        bg.resize((layer, layer), Image.LANCZOS).save(folder / "ic_launcher_background.png")
        fg.resize((layer, layer), Image.LANCZOS).save(folder / "ic_launcher_foreground.png")
        legacy(bg, fg, int(48 * m), False).save(folder / "ic_launcher.png")
        legacy(bg, fg, int(48 * m), True).save(folder / "ic_launcher_round.png")
    anydpi = ROOT / "mipmap-anydpi-v26"
    anydpi.mkdir(exist_ok=True)
    xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
    (anydpi / "ic_launcher.xml").write_text(xml)
    (anydpi / "ic_launcher_round.xml").write_text(xml)
    legacy(bg, fg, 512, False).save(ROOT.parent.parent.parent.parent / "play-icon-512.png")


if __name__ == "__main__":
    main()
