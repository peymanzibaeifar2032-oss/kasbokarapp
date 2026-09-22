#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent / "app/src/main/res"
GOLD = (183, 149, 91, 255)
DARK = (11, 11, 12, 255)


def needle_mark(size: int, background: tuple[int, int, int, int] | None) -> Image.Image:
    img = Image.new("RGBA", (size, size), background if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ring_w = max(2, size // 28)
    m = int(size * 0.16)
    d.rounded_rectangle(
        [m, m, size - m - 1, size - m - 1],
        radius=int(size * 0.22),
        outline=GOLD,
        width=ring_w,
    )
    c = size / 2
    r = size * 0.18
    d.ellipse([c - r, c - r, c + r, c + r], outline=GOLD, width=ring_w)
    w = max(3, size // 16)
    d.line([(size * 0.30, size * 0.70), (size * 0.70, size * 0.30)], fill=GOLD, width=w)
    tip = [
        (size * 0.70, size * 0.30),
        (size * 0.58, size * 0.34),
        (size * 0.62, size * 0.42),
    ]
    d.polygon(tip, fill=GOLD)
    return img


def write(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG")


def main() -> None:
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        square = needle_mark(size, DARK)
        write(ROOT / folder / "ic_launcher.png", square)
        write(ROOT / folder / "ic_launcher_round.png", square)
        fg = needle_mark(size, (0, 0, 0, 0))
        write(ROOT / folder / "ic_launcher_foreground.png", fg)

    play = needle_mark(512, DARK)
    write(ROOT.parent.parent.parent.parent / "play-icon-512.png", play)

    xml = ROOT / "mipmap-anydpi-v26/ic_launcher.xml"
    xml.parent.mkdir(parents=True, exist_ok=True)
    xml.write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/icon_bg" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
""",
        encoding="utf-8",
    )
    (ROOT / "mipmap-anydpi-v26/ic_launcher_round.xml").write_text(xml.read_text(encoding="utf-8"), encoding="utf-8")
    colors = ROOT / "values/colors.xml"
    colors.write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="icon_bg">#0B0B0C</color>
</resources>
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
