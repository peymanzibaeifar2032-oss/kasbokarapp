#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/workspace/docs/tattoo-school/gaps/images")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1100, 700
CREAM, NAVY, TEAL, RED, GOLD = (244, 239, 230), (28, 61, 82), (47, 111, 104), (168, 68, 62), (186, 150, 70)
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)


def canvas(title):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 16, W - 16, H - 16), 24, outline=NAVY, width=3)
    d.text((40, 36), title, font=FONT, fill=NAVY)
    return im, d


def save(im, name):
    im.save(OUT / name, "PNG")


def run():
    specs = [
        ("01", "READ IN THIS ORDER", lambda d: [d.rounded_rectangle((80, 140 + i * 90, 980, 210 + i * 90), 12, outline=NAVY, width=3) for i in range(5)]),
        ("02", "PRACTICE BEFORE SKIN", lambda d: [d.line((80, 220, 500, 220), fill=TEAL, width=8), d.ellipse((620, 180, 980, 540), outline=NAVY, width=6)]),
        ("03", "READ THE SILHOUETTE", lambda d: [d.ellipse((180, 160, 520, 540), fill=NAVY), d.rectangle((640, 200, 980, 500), fill=(180, 180, 180))]),
        ("04", "FLASH OR CUSTOM", lambda d: [d.rectangle((80, 160, 480, 540), outline=NAVY, width=4), d.ellipse((620, 180, 980, 540), outline=TEAL, width=6)]),
        ("05", "REFERENCE IS NOT A COPY", lambda d: [d.rectangle((80, 180, 420, 500), outline=NAVY, width=4), d.line((500, 160, 980, 560), fill=RED, width=8)]),
        ("06", "STOP LIST", lambda d: [d.ellipse((360, 140, 740, 520), outline=RED, width=16), d.line((430, 210, 670, 450), fill=RED, width=16)]),
        ("07", "NO ALCOHOL  NO GUESSING", lambda d: [d.ellipse((120, 180, 420, 520), outline=NAVY, width=6), d.line((180, 240, 360, 460), fill=RED, width=8)]),
        ("08", "ONE AFTERCARE SHEET", lambda d: [d.rounded_rectangle((180, 140, 900, 540), 20, outline=TEAL, width=6)]),
        ("09", "NEEDLE HANG", lambda d: [d.rectangle((180, 260, 700, 420), outline=NAVY, width=8), d.polygon([(700, 300), (860, 340), (700, 380)], fill=TEAL)]),
        ("10", "PAIN AND STAYING POWER", lambda d: [d.ellipse((160, 80, 420, 620), outline=NAVY, width=6), d.rectangle((620, 200, 980, 320), fill=RED), d.rectangle((620, 380, 980, 500), fill=TEAL)]),
        ("11", "VALUE BEFORE COLOR NAME", lambda d: [d.rectangle((80, 180, 300, 500), fill=(30, 30, 34)), d.rectangle((340, 180, 560, 500), fill=(120, 120, 120)), d.rectangle((600, 180, 820, 500), fill=(230, 190, 70)), d.rectangle((860, 180, 1040, 500), fill=(180, 50, 50))]),
        ("12", "READ THE HEALED TATTOO", lambda d: [d.ellipse((80, 180, 360, 460), outline=TEAL, width=8), d.ellipse((420, 160, 740, 520), outline=RED, width=18), d.ellipse((800, 200, 1040, 440), fill=(90, 90, 96))]),
        ("13", "CONTINUE THE OLD WORK", lambda d: [d.arc((80, 80, 700, 640), 200, 340, fill=NAVY, width=16), d.arc((300, 80, 1000, 640), 200, 340, fill=TEAL, width=8)]),
        ("14", "SCAR IS NOT A CANVAS", lambda d: [d.line((120, 200, 980, 480), fill=(190, 140, 130), width=18), d.line((200, 120, 820, 560), fill=RED, width=4)]),
        ("15", "IT WILL SOFTEN WITH YEARS", lambda d: [d.ellipse((80, 160, 480, 540), outline=NAVY, width=10), d.ellipse((600, 180, 1000, 520), outline=(160, 160, 160), width=16)]),
        ("16", "HEALED PHOTO  WITH PERMISSION", lambda d: [d.rounded_rectangle((140, 160, 520, 480), 16, outline=NAVY, width=6), d.rounded_rectangle((620, 160, 1000, 480), 16, outline=TEAL, width=6)]),
        ("17", "PRICE BEFORE THE CHAIR", lambda d: [d.rounded_rectangle((180, 180, 900, 520), 24, outline=NAVY, width=6), d.text((240, 300), "DEPOSIT", font=FONT, fill=TEAL)]),
        ("18", "APPRENTICE LIMIT", lambda d: [d.rectangle((120, 160, 980, 540), outline=RED, width=8), d.text((180, 320), "NOT YET", font=FONT, fill=RED)]),
    ]
    for name, title, draw in specs:
        im, d = canvas(title)
        draw(d)
        save(im, f"{name}.png")
    print(len(specs))


if __name__ == "__main__":
    run()
