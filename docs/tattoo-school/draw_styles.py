#!/usr/bin/env python3
"""One clear diagram per tattoo style."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/workspace/docs/tattoo-school/styles/images")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1100, 700
CREAM = (244, 239, 230)
NAVY = (28, 61, 82)
TEAL = (47, 111, 104)
RED = (168, 68, 62)
GOLD = (186, 150, 70)
GREEN = (70, 120, 80)
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)


def canvas(title):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((16, 16, W - 16, H - 16), 24, outline=NAVY, width=3)
    d.text((40, 36), title, font=FONT, fill=NAVY)
    return im, d


def save(im, name):
    im.save(OUT / name, "PNG")


def fehrest():
    im, d = canvas("LIST FIRST")
    for i in range(8):
        y = 120 + i * 64
        d.rounded_rectangle((60, y, 500, y + 46), 8, outline=NAVY, width=2)
        d.rounded_rectangle((560, y, 1000, y + 46), 8, outline=TEAL, width=2)
    save(im, "00.png")


def american():
    im, d = canvas("BOLD OUTLINE  FLAT COLOR")
    d.ellipse((180, 180, 520, 520), outline=NAVY, width=18)
    d.ellipse((250, 250, 450, 450), fill=RED)
    d.rectangle((620, 200, 760, 340), fill=GOLD)
    d.rectangle((800, 200, 940, 340), fill=GREEN)
    d.rectangle((710, 380, 850, 520), fill=NAVY)
    save(im, "01.png")


def neo():
    im, d = canvas("BOLD LINE  MORE DEPTH")
    d.ellipse((160, 160, 560, 560), outline=NAVY, width=16)
    for i, c in enumerate([(120, 40, 40), (180, 70, 60), (220, 140, 80)]):
        d.pieslice((230, 230, 490, 490), i * 80, i * 80 + 70, fill=c)
    d.arc((640, 180, 1000, 540), 200, 40, fill=GOLD, width=10)
    save(im, "02.png")


def japanese():
    im, d = canvas("SUBJECT PLUS BACKGROUND")
    d.arc((80, 160, 500, 620), 200, 340, fill=NAVY, width=14)
    d.arc((120, 200, 480, 580), 200, 340, fill=TEAL, width=8)
    d.polygon([(700, 480), (820, 200), (940, 480)], outline=NAVY, width=10)
    save(im, "03.png")


def tribal():
    im, d = canvas("SOLID BLACK SHAPES")
    d.polygon([(80, 420), (220, 180), (360, 420), (260, 360), (180, 360)], fill=NAVY)
    d.polygon([(460, 220), (760, 180), (700, 520), (500, 480)], fill=NAVY)
    d.ellipse((820, 220, 1040, 500), fill=NAVY)
    save(im, "04.png")


def poly():
    im, d = canvas("PATTERN IS A LANGUAGE")
    for i in range(6):
        d.rectangle((80 + i * 160, 200, 200 + i * 160, 520), outline=NAVY, width=8)
        d.line((100 + i * 160, 240, 180 + i * 160, 480), fill=NAVY, width=6)
    save(im, "05.png")


def celtic():
    im, d = canvas("THE BAND MUST CONTINUE")
    d.arc((120, 160, 520, 560), 20, 200, fill=NAVY, width=16)
    d.arc((200, 220, 440, 500), 200, 20, fill=NAVY, width=16)
    d.arc((620, 160, 1020, 560), 30, 210, fill=TEAL, width=14)
    save(im, "06.png")


def blackwork():
    im, d = canvas("BLACK IS A DECISION")
    d.rectangle((80, 160, 480, 560), fill=NAVY)
    d.polygon([(600, 160), (1020, 160), (1020, 560), (800, 560), (800, 360), (600, 360)], fill=NAVY)
    save(im, "07.png")


def ornamental():
    im, d = canvas("REPEAT ONE UNIT")
    for i in range(5):
        x = 80 + i * 200
        d.ellipse((x, 220, x + 150, 370), outline=NAVY, width=4)
        d.ellipse((x + 40, 260, x + 110, 330), outline=GOLD, width=4)
        d.line((x + 75, 370, x + 75, 540), fill=NAVY, width=3)
    save(im, "08.png")


def dotwork():
    im, d = canvas("DARKNESS FROM DENSITY")
    for col in range(18):
        n = 4 + col
        for k in range(n):
            x = 80 + col * 56
            y = 180 + k * (360 / n)
            r = 4
            d.ellipse((x, y, x + r * 2, y + r * 2), fill=NAVY)
    save(im, "09.png")


def geometric():
    im, d = canvas("MEASURED LINES")
    d.polygon([(200, 500), (360, 180), (520, 500)], outline=NAVY, width=6)
    d.ellipse((620, 180, 1020, 540), outline=NAVY, width=6)
    d.line((620, 360, 1020, 360), fill=TEAL, width=4)
    d.line((820, 180, 820, 540), fill=TEAL, width=4)
    save(im, "10.png")


def fineline():
    im, d = canvas("THIN LINE SHOWS EVERY FAULT")
    d.line((80, 250, 500, 250), fill=NAVY, width=2)
    d.arc((80, 300, 500, 560), 200, 340, fill=NAVY, width=2)
    d.line((620, 200, 700, 240), fill=RED, width=2)
    d.line((710, 300, 860, 220), fill=RED, width=2)
    d.line((870, 320, 1020, 260), fill=RED, width=2)
    save(im, "11.png")


def minimal():
    im, d = canvas("ONLY THE NECESSARY LINE")
    d.arc((350, 180, 750, 560), 210, 330, fill=NAVY, width=4)
    save(im, "12.png")


def blackgrey():
    im, d = canvas("ONE LIGHT SOURCE")
    d.ellipse((120, 140, 520, 540), fill=(40, 40, 46))
    d.ellipse((180, 180, 400, 400), fill=(170, 170, 168))
    d.ellipse((640, 140, 1040, 540), fill=(90, 90, 92))
    save(im, "13.png")


def colorreal():
    im, d = canvas("COLOR MAKES VOLUME")
    d.ellipse((140, 140, 520, 540), fill=(210, 160, 130))
    d.ellipse((200, 200, 380, 380), fill=(236, 210, 190))
    d.ellipse((300, 300, 500, 520), fill=(150, 90, 70))
    d.ellipse((620, 140, 1020, 540), fill=(70, 110, 150))
    d.ellipse((700, 200, 900, 400), fill=(180, 210, 220))
    save(im, "14.png")


def portrait():
    im, d = canvas("PROPORTION BEFORE DETAIL")
    d.ellipse((180, 120, 480, 520), outline=NAVY, width=4)
    d.ellipse((250, 240, 310, 300), fill=NAVY)
    d.ellipse((360, 240, 420, 300), fill=NAVY)
    d.arc((280, 340, 400, 450), 20, 160, fill=TEAL, width=4)
    d.line((620, 200, 1000, 200), fill=GOLD, width=3)
    d.line((620, 320, 1000, 320), fill=GOLD, width=3)
    d.line((620, 460, 1000, 460), fill=GOLD, width=3)
    save(im, "15.png")


def micro():
    im, d = canvas("MUST READ FROM ONE METER")
    d.ellipse((450, 250, 650, 450), outline=NAVY, width=3)
    d.ellipse((500, 320, 530, 350), fill=NAVY)
    d.ellipse((570, 320, 600, 350), fill=NAVY)
    save(im, "16.png")


def water():
    im, d = canvas("SOFT EDGE ON PURPOSE")
    d.ellipse((80, 160, 480, 520), fill=(180, 70, 70))
    d.ellipse((200, 220, 420, 430), fill=(220, 140, 90))
    d.line((620, 180, 1000, 180), fill=NAVY, width=8)
    d.ellipse((700, 280, 1040, 560), fill=(70, 110, 140))
    save(im, "17.png")


def illus():
    im, d = canvas("ONE FOCAL POINT")
    d.ellipse((140, 180, 460, 500), outline=NAVY, width=8)
    d.line((560, 160, 980, 300), fill=NAVY, width=6)
    d.line((600, 360, 1000, 520), fill=GOLD, width=6)
    save(im, "18.png")


def sketch():
    im, d = canvas("INTENTIONALLY UNFINISHED")
    d.line((80, 200, 420, 220), fill=NAVY, width=3)
    d.line((90, 240, 400, 250), fill=NAVY, width=2)
    d.arc((120, 280, 460, 560), 200, 20, fill=NAVY, width=4)
    d.line((600, 180, 1000, 200), fill=(180, 180, 180), width=2)
    d.line((620, 240, 980, 300), fill=NAVY, width=3)
    save(im, "19.png")


def trash():
    im, d = canvas("BLACK AND RED")
    d.ellipse((80, 160, 460, 540), fill=NAVY)
    d.ellipse((520, 120, 900, 400), fill=RED)
    d.line((200, 580, 1000, 200), fill=NAVY, width=8)
    save(im, "20.png")


def newschool():
    im, d = canvas("CARTOON VOLUME")
    d.rounded_rectangle((140, 140, 520, 520), 80, outline=NAVY, width=14)
    d.ellipse((220, 230, 320, 330), fill=GOLD)
    d.ellipse((340, 230, 440, 330), fill=GOLD)
    d.ellipse((700, 180, 1020, 520), outline=NAVY, width=14)
    d.ellipse((760, 240, 960, 440), fill=RED)
    save(im, "21.png")


def chicano():
    im, d = canvas("SOFT GREY  SHARP LETTERS")
    d.ellipse((80, 140, 480, 540), fill=(150, 150, 150))
    d.ellipse((160, 220, 300, 360), fill=(40, 40, 40))
    d.text((560, 280), "NAME", font=FONT, fill=NAVY)
    save(im, "22.png")


def biomech():
    im, d = canvas("METAL UNDER THE FORM")
    d.rounded_rectangle((80, 200, 1020, 520), 40, outline=NAVY, width=6)
    d.ellipse((160, 250, 360, 470), outline=TEAL, width=8)
    d.rectangle((420, 300, 900, 420), outline=NAVY, width=8)
    d.ellipse((860, 270, 1000, 450), fill=(70, 70, 78))
    save(im, "23.png")


def surreal():
    im, d = canvas("ONE BROKEN RULE")
    d.ellipse((120, 180, 460, 520), outline=NAVY, width=6)
    d.ellipse((230, 280, 350, 400), fill=RED)
    d.rectangle((620, 300, 1000, 360), fill=NAVY)
    d.ellipse((900, 180, 1040, 320), outline=GOLD, width=6)
    save(im, "24.png")


def anime():
    im, d = canvas("SAME RULES IN THE WHOLE FACE")
    d.ellipse((180, 80, 520, 520), outline=NAVY, width=8)
    d.ellipse((250, 220, 340, 340), outline=NAVY, width=6)
    d.ellipse((380, 220, 470, 340), outline=NAVY, width=6)
    d.polygon([(700, 500), (860, 120), (1020, 500)], outline=NAVY)
    save(im, "25.png")


def lettering():
    im, d = canvas("IT MUST STAY READABLE")
    d.text((80, 220), "CLEAR", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90), fill=TEAL)
    d.text((80, 420), "C L E A R", font=FONT, fill=NAVY)
    save(im, "26.png")


def ignorant():
    im, d = canvas("SIMPLE ON PURPOSE")
    d.ellipse((140, 160, 460, 480), outline=NAVY, width=8)
    d.line((180, 300, 250, 250), fill=RED, width=6)
    d.line((300, 240, 420, 320), fill=RED, width=6)
    d.rectangle((620, 200, 980, 500), outline=NAVY, width=8)
    save(im, "27.png")


def stick():
    im, d = canvas("HAND POKE  SAME HYGIENE")
    for i in range(24):
        x = 80 + i * 28
        d.ellipse((x, 300, x + 10, 310), fill=NAVY)
    d.line((80, 460, 760, 460), fill=TEAL, width=6)
    save(im, "28.png")


def sak():
    im, d = canvas("NOT A DECORATIVE FONT")
    d.rectangle((180, 120, 520, 560), outline=NAVY, width=6)
    d.line((220, 200, 480, 200), fill=NAVY, width=4)
    d.line((220, 280, 420, 280), fill=NAVY, width=4)
    d.line((700, 140, 1040, 540), fill=RED, width=10)
    d.line((1040, 140, 700, 540), fill=RED, width=10)
    save(im, "29.png")


def abstract():
    im, d = canvas("ONE MAIN MOVEMENT")
    d.arc((60, 80, 700, 680), 20, 160, fill=NAVY, width=12)
    d.line((640, 200, 1020, 520), fill=GOLD, width=6)
    save(im, "30.png")


def dark():
    im, d = canvas("KEEP ONE READABLE EDGE")
    d.rectangle((60, 100, 1040, 620), fill=(24, 28, 34))
    d.polygon([(180, 500), (420, 180), (660, 500)], fill=CREAM)
    d.ellipse((760, 240, 980, 460), outline=CREAM, width=6)
    save(im, "31.png")


if __name__ == "__main__":
    for fn in (fehrest, american, neo, japanese, tribal, poly, celtic, blackwork, ornamental, dotwork,
               geometric, fineline, minimal, blackgrey, colorreal, portrait, micro, water, illus, sketch,
               trash, newschool, chicano, biomech, surreal, anime, lettering, ignorant, stick, sak, abstract, dark):
        fn()
    print("ok", len(list(OUT.glob('*.png'))))
