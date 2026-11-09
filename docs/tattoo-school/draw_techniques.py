#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/workspace/docs/tattoo-school/techniques/images")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1100, 700
CREAM = (244, 239, 230)
NAVY = (28, 61, 82)
TEAL = (47, 111, 104)
RED = (168, 68, 62)
GOLD = (186, 150, 70)
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
    im, d = canvas("STRETCH THE SKIN FLAT")
    d.arc((80, 160, 700, 620), 200, 340, fill=(224, 186, 156), width=70)
    d.line((180, 300, 520, 300), fill=TEAL, width=8)
    save(im, "01.png")

    im, d = canvas("INK STAYS IN THE DERMIS")
    d.rectangle((80, 180, 700, 280), fill=(214, 176, 130))
    d.rectangle((80, 280, 700, 460), fill=(196, 120, 110))
    d.rectangle((80, 460, 700, 600), fill=(228, 206, 150))
    d.line((820, 80, 860, 300), fill=TEAL, width=10)
    d.line((940, 80, 1000, 560), fill=RED, width=10)
    save(im, "02.png")

    im, d = canvas("HAND SPEED MATCHES THE MACHINE")
    d.line((80, 300, 1000, 300), fill=NAVY, width=10)
    for i in range(12):
        d.ellipse((100 + i * 70, 250, 130 + i * 70, 280), outline=TEAL, width=3)
    save(im, "03.png")

    im, d = canvas("ONE PASS")
    d.line((80, 220, 900, 220), fill=TEAL, width=10)
    d.line((80, 420, 200, 400), fill=RED, width=6)
    d.line((210, 450, 400, 390), fill=RED, width=6)
    d.line((410, 460, 700, 410), fill=RED, width=6)
    save(im, "04.png")

    im, d = canvas("LINE WEIGHT IS A CHOICE")
    d.line((80, 260, 400, 260), fill=NAVY, width=4)
    d.line((400, 250, 900, 250), fill=NAVY, width=18)
    save(im, "05.png")

    im, d = canvas("CLOSE THE SHAPE")
    d.arc((150, 120, 650, 600), 20, 300, fill=TEAL, width=8)
    d.ellipse((700, 180, 1000, 480), outline=RED, width=8)
    d.ellipse((820, 300, 860, 340), fill=RED)
    save(im, "06.png")

    im, d = canvas("FLAT COLOR")
    d.rectangle((80, 160, 480, 560), fill=RED)
    d.rectangle((560, 160, 960, 560), fill=(180, 80, 70))
    d.rectangle((600, 220, 760, 340), fill=(140, 40, 40))
    save(im, "07.png")

    im, d = canvas("SATURATION IS NOT A WOUND")
    d.rectangle((80, 160, 480, 560), fill=NAVY)
    d.rectangle((560, 160, 960, 560), outline=RED, width=8)
    d.line((600, 200, 920, 520), fill=RED, width=6)
    save(im, "08.png")

    im, d = canvas("LIGHT LAYER FIRST")
    for i, g in enumerate((210, 140, 60)):
        d.rectangle((80 + i * 320, 180, 340 + i * 320, 540), fill=(g, g, g))
    save(im, "09.png")

    im, d = canvas("WHIP OUT OF THE SHAPE")
    for i in range(10):
        y = 160 + i * 46
        d.line((120, y, 700 - i * 40, y), fill=(20 + i * 18, 20 + i * 18, 24), width=16)
    save(im, "10.png")

    im, d = canvas("SHORT EVEN STROKES")
    for i in range(8):
        y = 160 + i * 60
        d.arc((150, y, 500, y + 80), 200, 340, fill=NAVY, width=6)
    save(im, "11.png")

    im, d = canvas("NO ACCIDENTAL STEPS")
    for i in range(16):
        g = 30 + i * 12
        d.rectangle((70 + i * 60, 180, 130 + i * 60, 540), fill=(g, g, g))
    save(im, "12.png")

    im, d = canvas("SOFT GRAIN")
    for i in range(400):
        x = 80 + (i * 37) % 940
        y = 140 + (i * 91) % 480
        d.ellipse((x, y, x + 5, y + 5), fill=NAVY)
    save(im, "13.png")

    im, d = canvas("SAME DOT DEPTH")
    for i in range(8):
        for j in range(4):
            d.ellipse((100 + i * 80, 180 + j * 100, 124 + i * 80, 204 + j * 100), fill=NAVY)
    d.ellipse((900, 180, 980, 260), fill=RED)
    save(im, "14.png")

    im, d = canvas("FADE TO SKIN")
    for i in range(12):
        g = 30 + i * 16
        d.rectangle((60 + i * 80, 200, 140 + i * 80, 500), fill=(g, g, g) if i < 11 else CREAM)
    save(im, "15.png")

    im, d = canvas("LEAVE THE SKIN ON PURPOSE")
    d.rectangle((80, 140, 1020, 580), fill=NAVY)
    d.ellipse((400, 240, 700, 500), fill=CREAM)
    save(im, "16.png")

    im, d = canvas("DECIDE THE COLOR EDGE")
    d.rectangle((80, 160, 520, 560), fill=(40, 80, 140))
    d.rectangle((520, 160, 960, 560), fill=(190, 150, 40))
    d.rectangle((470, 160, 570, 560), fill=(90, 100, 70))
    save(im, "17.png")

    im, d = canvas("A SMALL HIGHLIGHT")
    d.ellipse((180, 140, 620, 580), fill=(40, 40, 48))
    d.ellipse((300, 240, 390, 330), fill=(245, 245, 240))
    save(im, "18.png")

    im, d = canvas("SEPARATE GREY CUPS")
    for i, g in enumerate((220, 150, 80, 20)):
        d.ellipse((80 + i * 250, 220, 280 + i * 250, 420), fill=(g, g, g), outline=NAVY, width=4)
    save(im, "19.png")

    im, d = canvas("FLATTEN ONE PATCH AT A TIME")
    d.arc((60, 40, 900, 900), 200, 340, fill=(224, 186, 156), width=90)
    d.line((200, 260, 460, 300), fill=TEAL, width=8)
    save(im, "20.png")

    im, d = canvas("WIPE ONCE THEN LOOK")
    d.rounded_rectangle((80, 160, 480, 520), 20, fill=(80, 40, 40))
    d.rounded_rectangle((560, 160, 980, 520), 20, outline=NAVY, width=6)
    d.line((620, 300, 900, 300), fill=NAVY, width=8)
    save(im, "21.png")

    im, d = canvas("STOP WHEN THE SKIN STOPS TAKING INK")
    d.rectangle((80, 160, 480, 540), fill=(196, 120, 110))
    d.rectangle((600, 160, 1000, 540), fill=(150, 80, 70), outline=RED, width=8)
    save(im, "22.png")

    im, d = canvas("ONE CAREFUL FIX")
    d.line((80, 240, 480, 280), fill=NAVY, width=6)
    d.line((80, 460, 200, 500), fill=RED, width=4)
    d.line((220, 430, 460, 500), fill=RED, width=4)
    save(im, "23.png")

    im, d = canvas("TOUCH-UP ONLY AFTER HEALING")
    for i, label in enumerate(("DAY 1", "PEEL", "CLOSED", "THEN")):
        x = 60 + i * 260
        d.ellipse((x, 220, x + 160, 380), outline=TEAL if i == 3 else NAVY, width=6)
        d.text((x, 430), label, font=FONT, fill=NAVY)
    save(im, "24.png")

    im, d = canvas("DARK MASS OVER THE OLD MARK")
    d.ellipse((80, 180, 420, 520), fill=(30, 30, 36))
    d.pieslice((500, 120, 1040, 600), 200, 30, fill=NAVY)
    save(im, "25.png")

    im, d = canvas("MARKS FIRST EVEN WITHOUT A STENCIL")
    d.line((200, 140, 200, 580), fill=GOLD, width=3)
    d.line((80, 360, 900, 360), fill=GOLD, width=3)
    d.arc((260, 180, 700, 540), 20, 160, fill=NAVY, width=6)
    save(im, "26.png")

    im, d = canvas("LINE THEN DARK THEN LIGHT")
    d.ellipse((80, 160, 360, 440), outline=NAVY, width=8)
    d.ellipse((400, 160, 680, 440), fill=(90, 90, 96))
    d.ellipse((720, 160, 1000, 440), fill=(210, 170, 140))
    d.ellipse((790, 220, 860, 290), fill=(250, 250, 245))
    save(im, "27.png")

    im, d = canvas("TECHNIQUE LIST")
    for i in range(8):
        y = 110 + i * 68
        d.rounded_rectangle((60, y, 1020, y + 50), 8, outline=NAVY, width=2)
    save(im, "00.png")


if __name__ == "__main__":
    run()
    print("ok", len(list(OUT.glob('*.png'))))
