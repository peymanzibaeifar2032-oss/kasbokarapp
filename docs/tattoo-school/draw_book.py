#!/usr/bin/env python3
"""Clear textbook diagrams. Short English labels; Persian captions live in the lesson."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/workspace/docs/tattoo-school/images")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1200, 760
CREAM = (244, 239, 230)
NAVY = (28, 61, 82)
TEAL = (47, 111, 104)
RED = (168, 68, 62)
GOLD = (154, 115, 64)
WHITE = (255, 252, 247)
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)


def new():
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 16, W - 16, H - 16), 24, outline=NAVY, width=3)
    return im, d


def label(d, xy, text, fill=NAVY):
    d.text(xy, text, font=FONT, fill=fill)


def save(im, name):
    im.save(OUT / name, "PNG")


def skin():
    im, d = new()
    d.rectangle((70, 150, 760, 230), fill=(214, 176, 130))
    d.rectangle((70, 230, 760, 470), fill=(196, 120, 110))
    d.rectangle((70, 470, 760, 640), fill=(228, 206, 150))
    label(d, (80, 170), "EPIDERMIS  — ink here is lost")
    label(d, (80, 320), "DERMIS  — ink stays here", WHITE)
    label(d, (80, 530), "FAT  — ink spreads")
    d.line((860, 70, 900, 250), fill=TEAL, width=10)
    d.ellipse((888, 240, 916, 268), fill=TEAL)
    label(d, (930, 200), "right", TEAL)
    d.line((980, 70, 1040, 580), fill=RED, width=10)
    label(d, (860, 600), "too deep", RED)
    save(im, "01.png")


def hygiene():
    im, d = new()
    words = [("CLEAN", "wash dirt off"), ("DISINFECT", "kill many germs"), ("STERILE", "kill all, including spores")]
    for i, (a, b) in enumerate(words):
        x = 70 + i * 380
        d.rounded_rectangle((x, 180, x + 330, 560), 20, outline=NAVY, width=4)
        label(d, (x + 30, 230), a, TEAL if i == 2 else NAVY)
        d.text((x + 30, 300), b, font=SMALL, fill=NAVY)
    save(im, "02.png")


def table():
    im, d = new()
    d.rectangle((60, 160, 570, 640), fill=(220, 234, 226))
    d.rectangle((630, 160, 1140, 640), fill=(246, 224, 218))
    label(d, (180, 200), "CLEAN")
    label(d, (760, 200), "DIRTY", RED)
    d.rounded_rectangle((140, 320, 280, 520), 30, outline=TEAL, width=6)
    d.text((160, 400), "ink bottle", font=SMALL, fill=NAVY)
    d.ellipse((760, 360, 980, 500), outline=RED, width=6)
    d.text((800, 410), "used caps", font=SMALL, fill=RED)
    save(im, "03.png")


def dot(d, x, y, r, fill):
    d.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def needles():
    im, d = new()
    label(d, (70, 70), "RL")
    for i in range(7):
        a = i * math.tau / 7
        dot(d, 140 + int(36 * math.cos(a)), 220 + int(36 * math.sin(a)), 10, NAVY)
    label(d, (300, 70), "RS")
    for i in range(7):
        a = i * math.tau / 7
        dot(d, 380 + int(62 * math.cos(a)), 220 + int(62 * math.sin(a)), 9, TEAL)
    label(d, (560, 70), "F")
    for i in range(6):
        dot(d, 560 + i * 28, 220, 9, NAVY)
    label(d, (860, 70), "M1")
    for i in range(5):
        dot(d, 860 + i * 32, 190, 8, NAVY)
        dot(d, 876 + i * 32, 218, 8, NAVY)
    label(d, (860, 360), "CM")
    for i in range(5):
        y = 500 + int((i - 2) ** 2 * 8)
        dot(d, 860 + i * 32, y, 8, TEAL)
        dot(d, 876 + i * 32, y + 26, 8, TEAL)
    save(im, "04.png")


def machines():
    im, d = new()
    label(d, (80, 80), "COIL")
    d.rounded_rectangle((80, 160, 340, 520), 16, outline=NAVY, width=6)
    d.rectangle((120, 220, 190, 360), outline=GOLD, width=8)
    d.rectangle((220, 220, 290, 360), outline=GOLD, width=8)
    label(d, (430, 80), "ROTARY")
    d.ellipse((430, 200, 690, 460), outline=TEAL, width=8)
    d.rectangle((540, 300, 760, 340), fill=TEAL)
    label(d, (860, 80), "PEN")
    d.rounded_rectangle((900, 160, 1060, 560), 70, outline=NAVY, width=8)
    d.rectangle((960, 540, 1000, 660), fill=NAVY)
    save(im, "05.png")


def ink():
    im, d = new()
    d.rounded_rectangle((120, 140, 300, 560), 40, outline=NAVY, width=6)
    d.ellipse((150, 90, 270, 190), fill=NAVY)
    label(d, (140, 600), "bottle")
    d.ellipse((460, 400, 680, 540), outline=TEAL, width=8)
    label(d, (500, 450), "cap")
    d.line((320, 300, 500, 450), fill=TEAL, width=6)
    d.line((760, 160, 1100, 560), fill=RED, width=14)
    d.line((1100, 160, 760, 560), fill=RED, width=14)
    label(d, (820, 80), "do not pour back", RED)
    save(im, "06.png")


def stencil():
    im, d = new()
    d.arc((180, 80, 1040, 1100), 200, 340, fill=(224, 186, 156), width=90)
    d.rounded_rectangle((420, 160, 780, 420), 8, outline=NAVY, width=4)
    label(d, (460, 240), "design on body")
    d.text((460, 320), "check size before the needle", font=SMALL, fill=NAVY)
    save(im, "07.png")


def consent():
    im, d = new()
    rows = ["age and the law", "illness and medicines", "healing was explained", "photo permission"]
    d.rounded_rectangle((140, 80, 1060, 680), 16, outline=NAVY, width=4)
    for i, row in enumerate(rows):
        y = 140 + i * 120
        d.rounded_rectangle((190, y, 260, y + 70), 8, outline=TEAL, width=4)
        d.text((300, y + 20), row, font=FONT, fill=NAVY)
    save(im, "08.png")


def hands():
    im, d = new()
    d.line((80, 300, 520, 300), fill=TEAL, width=14)
    label(d, (80, 340), "one smooth pass")
    d.line((80, 500, 180, 470), fill=RED, width=6)
    d.line((190, 530, 320, 480), fill=RED, width=6)
    d.line((330, 540, 500, 500), fill=RED, width=6)
    label(d, (80, 560), "shaky, many passes", RED)
    d.arc((700, 120, 1100, 560), 30, 200, fill=NAVY, width=8)
    label(d, (760, 620), "close the shape")
    save(im, "09.png")


def care():
    im, d = new()
    steps = ["2 hours\noff", "days 1-3\nwash", "day 4\nopen", "day 5-30\nthin ointment"]
    for i, text in enumerate(steps):
        x = 50 + i * 290
        d.rounded_rectangle((x, 180, x + 250, 560), 18, outline=NAVY, width=4)
        d.multiline_text((x + 24, 280), text, font=FONT, fill=NAVY, spacing=8)
    save(im, "10.png")


def lining():
    im, d = new()
    d.line((60, 220, 560, 220), fill=NAVY, width=16)
    label(d, (60, 260), "thickness from the needle")
    d.line((60, 420, 200, 400), fill=RED, width=8)
    d.line((210, 440, 380, 390), fill=RED, width=8)
    label(d, (60, 470), "passes beside the line", RED)
    save(im, "11.png")


def shade():
    im, d = new()
    for i in range(20):
        g = 25 + i * 8
        d.rectangle((60 + i * 28, 140, 88 + i * 28, 400), fill=(g, g, g))
    label(d, (60, 430), "gradient: light to dark")
    d.ellipse((760, 160, 1100, 500), fill=(90, 80, 80))
    label(d, (800, 520), "blotch from stopping", RED)
    save(im, "12.png")


def dots():
    im, d = new()
    boxes = [(40, 18, "light"), (420, 70, "dark"), (800, 24, "uneven")]
    for x, n, name in boxes:
        d.rounded_rectangle((x, 140, x + 340, 560), 12, outline=NAVY, width=3)
        label(d, (x + 20, 80), name, RED if name == "uneven" else NAVY)
        for k in range(n):
            px = x + 30 + (k * 53) % 280
            py = 180 + (k * 97) % 340
            r = 12 if name == "uneven" and k % 4 == 0 else 5
            dot(d, px, py, r, RED if r > 8 else NAVY)
    save(im, "13.png")


def color_skin():
    im, d = new()
    d.rounded_rectangle((50, 140, 560, 640), 16, fill=(230, 196, 170), outline=NAVY, width=3)
    d.rounded_rectangle((640, 140, 1150, 640), 16, fill=(86, 58, 46), outline=NAVY, width=3)
    label(d, (70, 80), "lighter skin")
    label(d, (660, 80), "darker skin", WHITE)
    colors = [(20, 20, 20), (170, 40, 40), (220, 190, 50), (245, 245, 240)]
    for i, c in enumerate(colors):
        d.ellipse((90 + i * 110, 300, 170 + i * 110, 380), fill=c, outline=NAVY)
        d.ellipse((690 + i * 110, 300, 770 + i * 110, 380), fill=c, outline=WHITE)
    save(im, "14.png")


def place():
    im, d = new()
    d.arc((80, 40, 760, 980), 200, 340, fill=(224, 186, 156), width=100)
    d.arc((120, 80, 720, 940), 214, 310, fill=TEAL, width=10)
    label(d, (80, 40), "with the body")
    d.line((860, 160, 1120, 560), fill=RED, width=12)
    label(d, (860, 600), "against the body", RED)
    save(im, "15.png")


def session():
    im, d = new()
    d.rounded_rectangle((60, 160, 540, 600), 16, fill=(214, 150, 130), outline=TEAL, width=5)
    label(d, (100, 80), "skin can still take ink")
    d.rounded_rectangle((660, 160, 1140, 600), 16, fill=(180, 110, 100), outline=RED, width=6)
    label(d, (700, 80), "stop", RED)
    save(im, "16.png")


def mistakes():
    im, d = new()
    items = [("shaky line", False), ("ink will not stay", False), ("halo / blowout", True), ("guide washed off", True)]
    for i, (name, bad) in enumerate(items):
        x = 50 + (i % 2) * 580
        y = 80 + (i // 2) * 320
        d.rounded_rectangle((x, y, x + 520, y + 260), 16, outline=RED if bad else NAVY, width=4)
        d.text((x + 24, y + 100), name, font=FONT, fill=RED if bad else NAVY)
    save(im, "17.png")


def touch():
    im, d = new()
    labels = ["day of work", "peeling", "closed skin", "then touch-up"]
    for i, name in enumerate(labels):
        x = 40 + i * 290
        color = TEAL if i == 3 else NAVY
        d.ellipse((x + 50, 200, x + 190, 340), outline=color, width=6)
        d.text((x + 10, 400), name, font=SMALL, fill=color)
        if i < 3:
            d.line((x + 200, 260, x + 270, 260), fill=GOLD, width=4)
    label(d, (40, 520), "not the next day", RED)
    save(im, "18.png")


def fine():
    im, d = new()
    d.line((60, 220, 560, 220), fill=NAVY, width=3)
    label(d, (60, 260), "thin and even")
    d.line((60, 460, 150, 430), fill=RED, width=3)
    d.line((160, 490, 280, 420), fill=RED, width=3)
    d.line((290, 480, 420, 450), fill=RED, width=3)
    label(d, (60, 520), "shake becomes a blur", RED)
    save(im, "19.png")


def styles():
    im, d = new()
    d.ellipse((60, 180, 340, 460), outline=NAVY, width=14)
    label(d, (80, 520), "traditional")
    d.ellipse((420, 160, 740, 500), outline=NAVY, width=8)
    d.arc((470, 220, 690, 450), 200, 340, fill=GOLD, width=6)
    label(d, (460, 520), "neo-traditional")
    d.rectangle((820, 180, 1120, 500), fill=NAVY)
    label(d, (860, 520), "blackwork", NAVY)
    save(im, "20.png")


def portrait():
    im, d = new()
    names = ["1 proportions", "2 big values", "3 details"]
    for i, name in enumerate(names):
        x = 40 + i * 390
        d.ellipse((x + 70, 120, x + 300, 420), outline=NAVY, width=2 + i * 2)
        dot(d, x + 140, 230, 8, NAVY)
        dot(d, x + 230, 230, 8, NAVY)
        if i:
            d.arc((x + 140, 270, x + 240, 360), 20, 160, fill=TEAL, width=4)
        d.text((x + 40, 500), name, font=SMALL, fill=NAVY)
    save(im, "21.png")


def letters():
    im, d = new()
    label(d, (60, 80), "reads correctly")
    d.text((80, 160), "NAME", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72), fill=TEAL)
    label(d, (620, 80), "mirrored — wrong", RED)
    d.text((640, 160), "EMAN", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72), fill=RED)
    label(d, (60, 400), "letters too close merge after healing", RED)
    save(im, "22.png")


def cover():
    im, d = new()
    d.ellipse((80, 160, 480, 560), fill=(30, 30, 36))
    label(d, (120, 600), "old black")
    d.pieslice((620, 120, 1120, 620), 200, 40, fill=NAVY)
    label(d, (700, 80), "new design must cover the dark mass")
    save(im, "23.png")


def risk():
    im, d = new()
    d.rounded_rectangle((40, 80, 560, 680), 16, outline=TEAL, width=5)
    label(d, (70, 120), "watch at home", TEAL)
    d.text((70, 220), "mild redness\npeeling\nitch while healing", font=FONT, fill=NAVY, spacing=16)
    d.rounded_rectangle((620, 80, 1160, 680), 16, outline=RED, width=5)
    label(d, (650, 120), "see a doctor", RED)
    d.text((650, 220), "spreading redness\npus or fever\nchanging mole", font=FONT, fill=RED, spacing=16)
    save(im, "24.png")


def keep():
    im, d = new()
    rows = ["covers off and discarded", "needle into the sharps bin", "machine wiped, not soaked", "clean side set up again"]
    for i, row in enumerate(rows):
        y = 80 + i * 150
        d.rounded_rectangle((60, y, 140, y + 80), 10, outline=TEAL, width=4)
        d.text((180, y + 24), row, font=FONT, fill=NAVY)
    save(im, "25.png")


def ethics():
    im, d = new()
    rows = ["name and phone", "design and placement", "price and balance", "aftercare given", "photo only with permission"]
    d.rounded_rectangle((180, 50, 1040, 700), 16, outline=NAVY, width=5)
    for i, row in enumerate(rows):
        y = 100 + i * 110
        d.rectangle((230, y, 300, y + 50), outline=GOLD, width=3)
        d.text((340, y + 8), row, font=FONT, fill=NAVY)
    save(im, "26.png")


if __name__ == "__main__":
    for fn in (skin, hygiene, table, needles, machines, ink, stencil, consent, hands, care,
               lining, shade, dots, color_skin, place, session, mistakes, touch, fine, styles,
               portrait, letters, cover, risk, keep, ethics):
        fn()
    print("ok")
