"""Build the curriculum diagrams: HTML + inline SVG (Persian, RTL, Vazirmatn), rendered by headless Chromium.
Canvas is 720 CSS px wide with no text under 24px, so at a 360px phone (image ~330px) text stays >= 11px.
Output: <name>.html (source) and <name>.webp (1440px wide, DPR 2). Run: python3 build.py [name ...]"""
import sys, pathlib, html
OUT = pathlib.Path(__file__).parent
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
def fa(x): return str(x).translate(FA)
e = html.escape
C = dict(ink="#1c3d52", gold="#9a7340", red="#d64545", green="#2e9e5b", yellow="#e0a800", blue="#3a7bd5",
         pink="#e84393", gray="#6b7785", light="#f4efe6", skin1="#f6d2b8", skin2="#f3b8b0", fat="#fbe7a1")

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{width:720px;font-family:Vazirmatn,sans-serif;direction:rtl;background:#fff;color:#1c3d52}
.wrap{padding:32px 30px 28px}
.hd{display:flex;align-items:center;gap:16px}
.badge{flex:none;width:64px;height:64px;border-radius:32px;background:#e84393;color:#fff;font-weight:900;font-size:32px;display:grid;place-items:center}
h1{font-size:42px;font-weight:900;line-height:1.3}
.sub{font-size:29px;color:#6b7785;margin-top:6px;line-height:1.5}
.grid{display:grid;gap:14px;margin-top:22px}
.card{border-radius:22px;padding:16px 20px;border:3px solid #e6e1d8;background:#fff}
.card h3{font-size:33px;font-weight:900;line-height:1.35}
.card p,.card li{font-size:29px;line-height:1.6}
.card ul{padding-right:26px;margin-top:6px}
.tag{display:inline-block;border-radius:999px;padding:2px 16px;font-size:29px;font-weight:800;color:#fff}
.step{display:flex;gap:14px;align-items:flex-start}
.num{flex:none;width:54px;height:54px;border-radius:27px;color:#fff;font-weight:900;font-size:30px;display:grid;place-items:center}
.arrow{text-align:center;font-size:30px;color:#9a7340;line-height:1}
.foot{margin-top:18px;font-size:28px;color:#6b7785;line-height:1.5}
.two{grid-template-columns:1fr 1fr}
.three{grid-template-columns:1fr 1fr 1fr}
.two .card li{font-size:28px}
svg{direction:ltr}
svg text{font-family:Vazirmatn,sans-serif}
"""

def page(num, title, sub, body, foot=""):
    f = f'<p class="foot">{e(foot)}</p>' if foot else ""
    return f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head>
<body><div class="wrap" id="d"><div class="hd"><div class="badge">{fa(num)}</div><div><h1>{e(title)}</h1>
<div class="sub">{e(sub)}</div></div></div>{body}{f}</div></body></html>"""

def steps(items, color=C["ink"], arrows=True):
    out = []
    for i, it in enumerate(items):
        t, d = it[0], it[1]
        col = it[2] if len(it) > 2 else color
        out.append(f'<div class="card step" style="border-color:{col}33"><div class="num" style="background:{col}">{fa(i+1)}</div>'
                   f'<div><h3>{e(t)}</h3>' + (f'<p>{e(d)}</p>' if d else '') + '</div></div>')
        if arrows and i < len(items) - 1: out.append('<div class="arrow">▼</div>')
    return '<div class="grid" style="gap:8px">' + "".join(out) + "</div>"

def cards(items, cols=1):
    out = []
    for t, col, lines in items:
        lis = "".join(f"<li>{e(x)}</li>" for x in lines)
        out.append(f'<div class="card" style="border-color:{col};background:{col}0f"><span class="tag" style="background:{col}">{e(t)}</span><ul>{lis}</ul></div>')
    cls = {1: "", 2: " two", 3: " three"}[cols]
    return f'<div class="grid{cls}">' + "".join(out) + "</div>"

def svg(w, h, inner):
    return f'<div style="margin-top:20px"><svg viewBox="0 0 {w} {h}" width="660" overflow="visible" xmlns="http://www.w3.org/2000/svg">{inner}</svg></div>'

def T(x, y, s, size=26, fill=C["ink"], weight=700, anchor="middle"):
    size = max(27, round(size * 1.15))
    a = {"middle": "middle", "end": "start", "start": "end"}[anchor]  # RTL text: "start" is the right edge
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{a}" direction="rtl">{e(s)}</text>'

D = {}

D["d04-skin-tones"] = lambda: page(5, "رنگ تاتو روی پوست‌های مختلف", "کنتراست با تیره شدن پوست کم می‌شود",
    svg(660, 560, "".join(
        [T(70, 40, "پوست", 24, C["gray"])] +
        [T(190 + i * 120, 40, n, 24) for i, n in enumerate(["مشکی", "قرمز", "زرد", "سفید"])] +
        sum([[f'<rect x="10" y="{60+r*98}" width="640" height="88" rx="18" fill="{bg}"/>',
              T(70, 112 + r * 98, lab, 24, "#fff" if r > 2 else C["ink"])] +
             [f'<circle cx="{190+i*120}" cy="{104+r*98}" r="30" fill="{ink}" stroke="#00000022" stroke-width="2"/>'
              for i, ink in enumerate(["#1b1b1b", "#c62828", "#f2c200", "#fafafa"])]
             for r, (bg, lab) in enumerate([("#f8dcc8", "خیلی روشن"), ("#e8b98f", "روشن"), ("#c68a5a", "میانه"),
                                             ("#8d5a36", "تیره"), ("#4a2c1c", "خیلی تیره")])], []))),
    "نمایش نمادین؛ نتیجهٔ واقعی به رنگ، عمق و پوست هر فرد بستگی دارد. مشکی روی همهٔ پوست‌ها خواناترین است.")

D["d05-needlestick"] = lambda: page(6, "اگر سوزن به دستت رفت", "اقدام فوری پس از تماس با خون",
    steps([("توقف", "کار را قطع کن و دستکش را دربیاور.", C["red"]),
           ("شستن", "محل را با آب فراوان و صابون بشوی؛ چشم، بینی یا دهان را با آب فراوان.", C["blue"]),
           ("بدون فشار و ماده", "محل را فشار نده؛ نمک یا مادهٔ ناشناخته نریز.", C["yellow"]),
           ("گزارش", "به استاد بگو؛ زمان، نوع سوزن و شرح اتفاق را بنویس.", C["gold"]),
           ("پزشک همان روز", "هرچه زودتر به پزشک یا اورژانس برو؛ زمان مهم است.", C["green"])]),
    "منبع: مرکز کنترل بیماری آمریکا و اوشا. تصمیم آزمایش و درمان پیشگیری با پزشک است.")

D["d06-spaulding"] = lambda: page(7, "سه دستهٔ خطر وسایل", "روش رسیدگی به محل تماس وسیله بستگی دارد (اسپالدینگ)",
    cards([("بحرانی: وارد بافت می‌شود", C["red"], ["سوزن، کارتریج، هر چیز تیز", "استریل و یک‌بارمصرف از بستهٔ سالم"]),
           ("نیمه‌بحرانی: پوست آسیب‌دیده", C["yellow"], ["گریپ و تیوب فلزی چندبارمصرف", "تمیز کردن، بسته‌بندی و اتوکلاو پس از هر مشتری"]),
           ("غیربحرانی: پوست سالم و محیط", C["green"], ["تخت، میز، چراغ، صندلی", "تمیز کردن، ضدعفونی سطح و پوشش محافظ"])]),
    "منبع: راهنمای ضدعفونی و استریل مرکز کنترل بیماری آمریکا (۲۰۰۸).")

D["d07-clean-disinfect-sterile"] = lambda: page(7, "تمیز ≠ ضدعفونی ≠ استریل", "سه کار متفاوت با سه نتیجهٔ متفاوت",
    steps([("تمیز کردن", "آب و شوینده: خون، رنگ و چربی دیدنی برداشته می‌شود. پیش‌شرط دو مرحلهٔ بعد.", C["blue"]),
           ("ضدعفونی", "مادهٔ مناسب + زمان تماس روی برچسب: میکروب‌ها به‌شدت کم می‌شوند، نه همهٔ هاگ‌ها.", C["yellow"]),
           ("استریل", "اتوکلاو (بخار تحت فشار): همهٔ شکل‌های میکروب، از جمله هاگ، از بین می‌روند.", C["green"])]),
    "الکل وسیلهٔ مصرف‌شده را استریل نمی‌کند و جوشاندن جایگزین اتوکلاو نیست.")

def _ws():
    s = []
    s.append(f'<rect x="10" y="10" width="300" height="440" rx="24" fill="{C["green"]}1a" stroke="{C["green"]}" stroke-width="4"/>')
    s.append(T(160, 52, "منطقهٔ تمیز", 30, C["green"], 900))
    for i, (t) in enumerate(["بستهٔ استریل بسته", "کاپ رنگ و وازلین", "دستمال و پوشش تازه"]):
        s.append(f'<rect x="40" y="{90+i*110}" width="240" height="84" rx="16" fill="#fff" stroke="{C["green"]}88" stroke-width="3"/>' + T(160, 142 + i * 110, t, 24))
    s.append(f'<rect x="350" y="10" width="300" height="440" rx="24" fill="{C["red"]}14" stroke="{C["red"]}" stroke-width="4"/>')
    s.append(T(500, 52, "منطقهٔ آلوده", 30, C["red"], 900))
    for i, t in enumerate(["دستگاه با پوشش", "ظرف تیز", "سطل پسماند آلوده"]):
        s.append(f'<rect x="380" y="{90+i*110}" width="240" height="84" rx="16" fill="#fff" stroke="{C["red"]}88" stroke-width="3"/>' + T(500, 142 + i * 110, t, 24))
    s.append(f'<path d="M150 480 H510" stroke="{C["gold"]}" stroke-width="8" marker-end="url(#a)"/>')
    s.append(f'<defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6z" fill="{C["gold"]}"/></marker></defs>')
    s.append(T(330, 530, "مسیر یک‌طرفه: از تمیز به آلوده", 28, C["gold"], 900))
    return svg(660, 550, "".join(s))
D["d08-workstation"] = lambda: page(8, "نقشهٔ ایستگاه کار", "هیچ وسیله‌ای از منطقهٔ آلوده به منطقهٔ تمیز برنمی‌گردد", _ws(),
    "نمای بالا، نمادین. چیدمان دقیق به اندازهٔ میز و دست کاری هنرمند بستگی دارد.")

def _cup():
    s = [f'<defs><marker id="a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6z" fill="{C["green"]}"/></marker></defs>']
    s.append(f'<rect x="510" y="60" width="110" height="200" rx="20" fill="{C["ink"]}"/><rect x="540" y="30" width="50" height="40" rx="8" fill="{C["gold"]}"/>' + T(565, 310, "بطری رنگ", 26))
    s.append(f'<path d="M290 150 h80 l-14 110 h-52z" fill="{C["blue"]}55" stroke="{C["blue"]}" stroke-width="4"/>' + T(330, 310, "کاپ یک‌بارمصرف", 26))
    s.append(f'<rect x="40" y="170" width="150" height="26" rx="10" fill="{C["gray"]}"/><path d="M40 183 l-30 0" stroke="{C["gray"]}" stroke-width="6"/>' + T(110, 310, "سوزن", 26))
    s.append(f'<path d="M500 130 C 450 100, 420 110, 385 140" fill="none" stroke="{C["green"]}" stroke-width="7" marker-end="url(#a)"/>')
    s.append(f'<path d="M280 200 C 250 200, 230 190, 205 185" fill="none" stroke="{C["green"]}" stroke-width="7" marker-end="url(#a)"/>')
    s.append(f'<path d="M380 370 C 430 400, 470 400, 520 370" fill="none" stroke="{C["red"]}" stroke-width="7" stroke-dasharray="14 10"/>')
    s.append(f'<g stroke="{C["red"]}" stroke-width="10" stroke-linecap="round"><path d="M425 360 l40 40"/><path d="M465 360 l-40 40"/></g>')
    s.append(T(450, 450, "برگشت به بطری ممنوع", 28, C["red"], 900))
    return svg(660, 470, "".join(s))
D["d09-ink-cup"] = lambda: page(8, "مسیر یک‌طرفهٔ رنگ", "رنگ هرگز از کاپ به بطری برنمی‌گردد", _cup(),
    "تهٔ کاپ پس از هر مشتری دور ریخته می‌شود؛ نوک بطری به کاپ یا دستکش آلوده نمی‌خورد.")

D["d10-machines"] = lambda: page(9, "سه نوع دستگاه تاتو", "سه سازوکار برای یک کار: حرکت رفت‌وبرگشتی سوزن",
    cards([("کویل", C["ink"], ["دو سیم‌پیچ آهنربای الکتریکی، آرمیچر و فنر", "مدار با تماس فنر باز و بسته می‌شود؛ صدای وزوز", "تنظیم با فنر و پیچ تماس؛ نیاز به تجربه"]),
           ("روتاری", C["blue"], ["موتور الکتریکی و بادامک (اکسنتریک)", "حرکت نرم‌تر و کم‌صداتر", "طول ضربه با بادامک تعیین می‌شود"]),
           ("قلمی (پن)", C["gold"], ["روتاری در بدنهٔ استوانه‌ای شبیه قلم", "با کارتریج کار می‌کند", "برخی مدل‌ها بی‌سیم با باتری‌اند"])]),
    "طرح نمادین؛ ساختار داخلی هر برند متفاوت است. دفترچهٔ سازنده مرجع تنظیم است.")

def _hand():
    s = []
    rows = [("دست تند", "نقطه‌های جدا، خط ناقص", C["yellow"], "dots"), ("دست مناسب", "خط پیوسته و تمیز", C["green"], "ok"), ("دست کند", "خط پهن و پوست ملتهب", C["red"], "slow")]
    for i, (t, d, col, k) in enumerate(rows):
        y = 30 + i * 170
        s.append(f'<rect x="10" y="{y}" width="640" height="150" rx="22" fill="{col}14" stroke="{col}" stroke-width="3"/>')
        s.append(T(630, y + 44, t, 28, col, 900, "end") + T(630, y + 80, d, 24, C["ink"], 500, "end"))
        if k == "dots":
            s.append("".join(f'<circle cx="{40+j*30}" cy="{y+110}" r="6" fill="#1b1b1b"/>' for j in range(15)))
        elif k == "ok":
            s.append(f'<path d="M40 {y+110} H480" stroke="#1b1b1b" stroke-width="8" stroke-linecap="round"/>')
        else:
            s.append(f'<path d="M40 {y+110} H480" stroke="{C["red"]}55" stroke-width="40" stroke-linecap="round"/><path d="M40 {y+110} H480" stroke="#1b1b1b" stroke-width="16" stroke-linecap="round"/>')
    return svg(660, 540, "".join(s))
D["d11-hand-speed"] = lambda: page(10, "سرعت دست با ولتاژ ثابت", "سرعت دست باید با سرعت ضربهٔ دستگاه هماهنگ باشد", _hand(),
    "نمایش نمادین برای تمرین روی پوست مصنوعی.")

def _code():
    s = [T(330, 90, "1207RL", 96, C["ink"], 900)]
    for cx, bx, val, col in [(222, 110, "۱۲ = گیج (قطر سیم)", C["blue"]), (330, 330, "۰۷ = تعداد سیم", C["gold"]), (440, 550, "RL = لاینر گرد", C["pink"])]:
        s.append(f'<path d="M{cx-45} 112 Q {cx} 140 {cx+45} 112" fill="none" stroke="{col}" stroke-width="6"/><path d="M{cx} 132 L{bx} 165" stroke="{col}" stroke-width="4"/>')
        s.append(f'<rect x="{bx-102}" y="165" width="204" height="90" rx="16" fill="{col}1f" stroke="{col}" stroke-width="3"/>' + T(bx, 220, val, 22 if len(val)>16 else 24, C["ink"], 800))
    s.append(T(330, 300, "جدول گیج (تقریبی)", 28, C["ink"], 900))
    for i, (g, mm) in enumerate([("۰۸", "۰٫۲۵"), ("۱۰", "۰٫۳۰"), ("۱۲", "۰٫۳۵")]):
        x = 110 + i * 220
        s.append(f'<rect x="{x-95}" y="320" width="190" height="110" rx="18" fill="{C["light"]}" stroke="#d8cfbf" stroke-width="3"/>')
        s.append(T(x, 362, "گیج " + g, 28, C["ink"], 900) + T(x, 405, "≈ " + mm + " میلی‌متر", 24, C["gray"], 600))
    return svg(660, 450, "".join(s))
D["d12-needle-code"] = lambda: page(11, "خواندن کد سوزن", "گیج، تعداد و چیدمان در یک کد", _code(),
    "اندازه‌ها تقریبی‌اند و بین سازنده‌ها کمی فرق دارند؛ برچسب جعبه مرجع است.")

def _taper():
    s = []
    for x, lab, d, tip in [(480, "تیپر بلند", "نوک باریک، خط تیزتر", 220), (180, "تیپر کوتاه", "رنگ‌گذاری بیشتر در هر ضربه", 110)]:
        s.append(f'<rect x="{x-22}" y="30" width="44" height="200" fill="#9aa4ae"/>')
        s.append(f'<path d="M{x-22} 230 L{x} {230+tip} L{x+22} 230z" fill="#6b7785"/>')
        s.append(f'<path d="M{x-60} 230 H{x+60}" stroke="{C["gold"]}" stroke-dasharray="8 6" stroke-width="3"/><path d="M{x+60} 230 V{230+tip}" stroke="{C["pink"]}" stroke-width="5"/>')
        s.append(T(x, 510, lab, 30, C["ink"], 900) + T(x, 550, d, 24, C["gray"], 600))
    return svg(660, 570, "".join(s))
D["d13-taper"] = lambda: page(11, "تیپر بلند و کوتاه", "طول بخش مخروطی نوک سوزن (بزرگ‌نمایی نمادین)", _taper())

def _groups():
    s = []
    def dots(cx, cy, pts): return "".join(f'<circle cx="{cx+x}" cy="{cy+y}" r="11" fill="{C["ink"]}"/>' for x, y in pts)
    import math
    rl = [(0, 0)] + [(22 * math.cos(a), 22 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]
    rs = [(0, 0)] + [(34 * math.cos(a), 34 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]
    m1 = [(-60 + i * 24, -11) for i in range(6)] + [(-48 + i * 24, 11) for i in range(5)]
    cm = [(-60 + i * 24, -11 + abs(-60 + i * 24) ** 2 / 400) for i in range(6)] + [(-48 + i * 24, 11 + abs(-48 + i * 24) ** 2 / 400) for i in range(5)]
    items = [(495, 120, "لاینر گرد RL", "خط", rl), (165, 120, "شیدر گرد RS", "سایهٔ کوچک، جای تنگ", rs),
             (495, 400, "مگنوم M1", "پر کردن سطح بزرگ", m1), (165, 400, "مگنوم خمیده CM", "سایهٔ نرم روی انحنا", cm)]
    for cx, cy, n, d, pts in items:
        s.append(f'<rect x="{cx-155}" y="{cy-100}" width="310" height="260" rx="24" fill="{C["light"]}" stroke="#d8cfbf" stroke-width="3"/>')
        s.append(dots(cx, cy - 20, pts) + T(cx, cy + 85, n, 28, C["ink"], 900) + T(cx, cy + 125, d, 24, C["gray"], 600))
    return svg(660, 570, "".join(s))
D["d14-needle-groups"] = lambda: page(12, "چهار خانوادهٔ اصلی سوزن", "نمای روبه‌رو از نوک و کاربرد هر کدام", _groups(),
    "نمادین؛ تعداد سیم‌ها در هر خانواده متغیر است.")

def _label():
    s = [f'<rect x="150" y="20" width="360" height="520" rx="40" fill="{C["ink"]}"/><rect x="250" y="0" width="160" height="40" rx="10" fill="{C["gold"]}"/>',
         f'<rect x="180" y="80" width="300" height="430" rx="16" fill="#fff"/>']
    rows = ["سازنده و نشانی", "شمارهٔ ساخت (لات)", "تاریخ انقضا", "فهرست ترکیبات", "هشدارها"]
    for i, r in enumerate(rows):
        y = 110 + i * 82
        s.append(f'<rect x="200" y="{y}" width="260" height="64" rx="12" fill="{C["green"]}1a" stroke="{C["green"]}" stroke-width="3"/>' + T(330, y + 42, r, 24, C["ink"], 800))
        s.append(f'<circle cx="530" cy="{y+32}" r="20" fill="{C["green"]}"/>' + T(530, y + 41, "✓", 24, "#fff", 900))
    return svg(660, 560, "".join(s))
D["d15-ink-label"] = lambda: page(13, "برچسب رنگ را بخوان", "این پنج مورد پیش از خرید و مصرف", _label(),
    "رنگ بدون برچسب، شمارهٔ ساخت یا تاریخ انقضا خریده نمی‌شود. شمارهٔ ساخت را در پروندهٔ مشتری ثبت کن.")

def _valuetest():
    def flower(cx, cols):
        p = "".join(f'<circle cx="{cx+dx}" cy="{150+dy}" r="46" fill="{cols[0]}" stroke="#1b1b1b" stroke-width="5"/>' for dx, dy in [(0, -60), (57, -18), (35, 50), (-35, 50), (-57, -18)])
        return p + f'<circle cx="{cx}" cy="150" r="34" fill="{cols[1]}" stroke="#1b1b1b" stroke-width="5"/>'
    s = []
    s.append(T(330, 30, "نسخهٔ بد: قرمز و سبز هم‌ارزش", 26, C["red"], 900))
    s.append(flower(180, ["#c0392b", "#4f8a3a"]) + flower(480, ["#777", "#777"]))
    s.append(T(180, 285, "رنگی", 24, C["gray"]) + T(480, 285, "خاکستری: یکی شد", 24, C["red"], 800))
    s.append(f'<g transform="translate(0,300)">' + T(330, 30, "نسخهٔ خوب: تفاوت ارزش", 26, C["green"], 900) +
             flower(180, ["#f4b400", "#3b1f6b"]) + flower(480, ["#d9d9d9", "#333"]) +
             T(180, 285, "رنگی", 24, C["gray"]) + T(480, 285, "خاکستری: خوانا", 24, C["green"], 800) + "</g>")
    return svg(660, 600, "".join(s))
D["d16-value-test"] = lambda: page(14, "آزمون سیاه‌وسفید", "ارزش رنگی مهم‌تر از خود رنگ است", _valuetest(),
    "اگر در سیاه‌وسفید خوانا نیست، روی پوست هم ماندگار نیست.")

def _scale():
    s = []
    vals = ["#ffffff", "#c8c8c8", "#8f8f8f", "#555555", "#111111"]
    for i, v in enumerate(vals):
        s.append(f'<rect x="{530-i*125}" y="20" width="120" height="90" rx="10" fill="{v}" stroke="#999" stroke-width="2"/>' + T(590 - i * 125, 145, fa(i + 1), 26))
    s.append(f'<defs><radialGradient id="g" cx="0.65" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#8f8f8f"/><stop offset="1" stop-color="#222"/></radialGradient></defs>')
    s.append('<ellipse cx="300" cy="440" rx="180" ry="30" fill="#00000055"/>')
    s.append('<circle cx="330" cy="320" r="120" fill="url(#g)"/>')
    s.append(f'<circle cx="600" cy="190" r="26" fill="{C["yellow"]}"/>' + T(600, 250, "نور", 24, C["gold"], 800))
    s.append(T(420, 245, "روشن", 24, C["ink"], 800) + T(120, 300, "سایهٔ خود", 24, C["ink"], 800) + T(130, 470, "سایهٔ افتاده", 24, C["ink"], 800))
    return svg(660, 500, "".join(s))
D["d17-value-scale"] = lambda: page(15, "پنج ارزش رنگی", "نوار ارزش از سفید تا مشکی و کرهٔ سایه‌دار", _scale())

def _sil():
    good = '<path d="M60 160 Q110 60 190 120 L250 80 L230 140 Q260 170 210 200 Q130 230 60 160z" fill="{f}"/>'
    bad = "".join(f'<path d="M{40+i*22} {150+(i%3)*18} q20 -60 40 -10 l10 -40 l12 50" fill="none" stroke="{{s}}" stroke-width="6"/>' for i in range(9))
    s = []
    for y, lab, col, shape, sl in [(0, "خوانا", C["green"], good, "سیلوئت روشن"), (300, "شلوغ", C["red"], bad, "سیلوئت نامفهوم")]:
        s.append(f'<g transform="translate(0,{y})"><rect x="5" y="5" width="650" height="270" rx="22" fill="{col}10" stroke="{col}" stroke-width="3"/>')
        s.append(f'<g transform="translate(330,10)">' + shape.replace("{f}", "#fff' stroke='#1b1b1b' stroke-width='6").replace("{s}", "#1b1b1b") + "</g>")
        s.append(f'<g transform="translate(20,10)">' + shape.replace("{f}", "#1b1b1b").replace("{s}", "#1b1b1b").replace('stroke-width="6"', 'stroke-width="16"') + "</g>")
        s.append(T(490, 260, "طرح " + lab, 24, col, 900) + T(170, 260, sl, 24, col, 900) + "</g>")
    return svg(660, 580, "".join(s))
D["d18-silhouette"] = lambda: page(16, "آزمون سیلوئت", "طرح را سیاه کن؛ اگر شناخته نشد، روی پوست هم خوانا نیست", _sil())

def _letter():
    s = []
    for i, (size, lab, ok) in enumerate([(110, "بزرگ: خوانا", True), (60, "متوسط", True), (30, "خیلی کوچک: پر می‌شود", False)]):
        y = 60 + i * 170
        col = C["green"] if ok else C["red"]
        s.append(f'<text x="420" y="{y+size*0.5}" font-size="{size}" font-weight="900" fill="#1b1b1b" text-anchor="middle" '
                 + (f'stroke="#1b1b1b" stroke-width="{4 if not ok else 0}"' if True else "") + '>عشق</text>')
        s.append(T(130, y + 30, lab, 24, col, 900))
        if not ok: s.append(f'<circle cx="430" cy="{y+5}" r="48" fill="none" stroke="{C["red"]}" stroke-width="4"/>')
    return svg(660, 520, "".join(s))
D["d19-lettering"] = lambda: page(17, "اندازه و خوانایی نوشته", "فضای داخل حروف با گذر زمان پر می‌شود", _letter(),
    "نمایش نمادین. برای نوشتهٔ فارسی کوچک، چشمه‌ها و نقطه‌ها زودتر از همه به هم می‌چسبند.")

def _body():
    s = []
    for cx, lab in [(500, "جلو"), (170, "پشت")]:
        s.append(f'<g fill="{C["light"]}" stroke="#bfb3a0" stroke-width="4"><circle cx="{cx}" cy="70" r="40"/><rect x="{cx-70}" y="120" width="140" height="210" rx="40"/>'
                 f'<rect x="{cx-115}" y="125" width="38" height="200" rx="19"/><rect x="{cx+77}" y="125" width="38" height="200" rx="19"/>'
                 f'<rect x="{cx-62}" y="330" width="55" height="210" rx="25"/><rect x="{cx+7}" y="330" width="55" height="210" rx="25"/></g>')
        s.append(T(cx, 590, lab, 26, C["ink"], 900))
    a = C["pink"]
    s.append(f'<defs><marker id="a" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5z" fill="{a}"/></marker></defs>')
    for d in ["M404 300 V160", "M596 300 V160", "M466 520 V360", "M534 520 V360", "M170 310 V140", "M110 300 Q135 220 150 150", "M230 300 Q205 220 190 150", "M73 300 V160", "M267 300 V160"]:
        s.append(f'<path d="{d}" stroke="{a}" stroke-width="7" fill="none" marker-end="url(#a)"/>')
    return svg(660, 610, "".join(s))
D["d20-body-flow"] = lambda: page(19, "جریان طرح روی بدن", "جهت طرح در امتداد طول عضو و انحنای عضله", _body(),
    "فلش‌ها جهت کلی را نشان می‌دهند؛ طرح نهایی روی بدن خود مشتری و در حالت ایستاده بررسی می‌شود.")

D["d21-stencil-steps"] = lambda: page(20, "آماده‌سازی پوست و استنسیل", "از بررسی پوست تا تأیید مشتری",
    steps([("بررسی پوست", "زخم، التهاب، خال یا آفتاب‌سوختگی؟ اگر بله، کار نمی‌شود."), ("اصلاح", "تیغ یک‌بارمصرف، فقط محل و کمی اطراف."),
           ("تمیز و ضدعفونی پوست", "با محصول مناسب پوست؛ صبر تا خشک شود."), ("چاپ در اندازهٔ واقعی", "اندازه را روی بدن با مشتری بسنج."),
           ("انتقال استنسیل", "پوست کشیده و صاف؛ کاغذ یک‌باره و بدون لغزش."), ("تأیید در آینه", "مشتری ایستاده جا و جهت را تأیید کند.")], C["ink"]))

D["d22-stop-list"] = lambda: page(21, "پیش از کار: تصمیم و فهرست توقف", "پرسیدن و ثبت، نه تشخیص",
    steps([("پرسش‌های سلامت", "فرم سلامت با مشتری پر و ثبت می‌شود.", C["ink"]),
           ("پاسخ مشکوک؟", "بله: مشورت با پزشک و عقب انداختن کار. خیر: مرحلهٔ بعد.", C["yellow"]),
           ("رضایت‌نامه و استنسیل", "کار فقط پس از امضای رضایت‌نامه.", C["green"])]) +
    cards([("فهرست توقف همان روز", C["red"], ["مستی یا مصرف مواد", "تب، بیماری حاد یا عفونت فعال", "پوست زخمی، آفتاب‌سوخته یا ملتهب در محل", "مشتری مردد یا تحت فشار", "پاسخ سلامتی که استاد بررسی نکرده"])]),
    "بر اساس مرور کلوگر (۲۰۱۵) دربارهٔ موارد منع و احتیاط تاتو.")

D["d23-faint"] = lambda: page(22, "غش حین تاتو", "نشانه را جدی بگیر: توقف، خواباندن، پایش",
    steps([("نشانه‌ها", "رنگ‌پریدگی، عرق سرد، تهوع، خمیازه، سیاهی رفتن چشم", C["yellow"]),
           ("توقف", "کار را قطع کن، دستگاه را کنار بگذار، وسایل تیز را دور کن.", C["gold"]),
           ("خواباندن", "مشتری را بخوابان و پاها را بالا بگذار؛ پس از به‌هوش آمدن، نوشیدنی شیرین.", C["blue"]),
           ("اورژانس", "بیهوشی بیش از چند لحظه، تشنج، درد قفسهٔ سینه، تنگی نفس یا آسیب سر", C["red"])]),
    "منبع: StatPearls، اپیزود وازوواگال. ادامهٔ کار فقط با حال کاملاً خوب و تصمیم استاد.")

def _stretch():
    s = [f'<defs><marker id="a" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5z" fill="{C["pink"]}"/></marker></defs>']
    s.append(f'<rect x="10" y="10" width="640" height="230" rx="22" fill="{C["skin1"]}"/>')
    s.append(f'<circle cx="200" cy="125" r="38" fill="#e9b996" stroke="#b07a52" stroke-width="4"/><circle cx="460" cy="125" r="38" fill="#e9b996" stroke="#b07a52" stroke-width="4"/>')
    s.append(f'<path d="M160 125 H60" stroke="{C["pink"]}" stroke-width="8" marker-end="url(#a)"/><path d="M500 125 H600" stroke="{C["pink"]}" stroke-width="8" marker-end="url(#a)"/>')
    s.append(f'<path d="M260 125 H400" stroke="#1b1b1b" stroke-width="6"/>' + T(330, 215, "کشش یکنواخت با دو انگشت در دو جهت", 24, C["ink"], 800))
    for x, lab, ang in [(490, "خط: حدود ۴۵ تا ۹۰ درجه", 70), (170, "سایه: زاویهٔ خوابیده‌تر", 40)]:
        import math
        r = math.radians(ang)
        s.append(f'<path d="M{x-130} 470 H{x+130}" stroke="#b07a52" stroke-width="6"/>')
        s.append(f'<path d="M{x} 470 L{x+170*math.cos(r)} {470-170*math.sin(r)}" stroke="{C["ink"]}" stroke-width="16" stroke-linecap="round"/>')
        s.append(T(x, 520, lab, 24, C["ink"], 800))
    return svg(660, 540, "".join(s))
D["d24-stretch-angle"] = lambda: page(23, "کشش پوست و زاویهٔ سوزن", "کشش یکنواخت و زاویهٔ ثابت", _stretch(),
    "زاویه‌ها تقریبی‌اند و با دستگاه، سوزن و سبک فرق می‌کنند؛ زیر نظر استاد تنظیم شود.")

def _blow():
    s = []
    for x0, lab, bad in [(275, "خط سالم", False), (10, "بلوآوت", True)]:
        s.append(f'<rect x="{x0}" y="10" width="250" height="110" rx="18" fill="{C["skin1"]}"/>')
        if bad: s.append(f'<path d="M{x0+40} 65 H{x0+210}" stroke="#4a6fa5" stroke-opacity=".45" stroke-width="40" stroke-linecap="round"/>')
        s.append(f'<path d="M{x0+40} 65 H{x0+210}" stroke="#1b1b1b" stroke-width="10" stroke-linecap="round"/>')
        s.append(f'<rect x="{x0}" y="150" width="250" height="70" fill="{C["skin1"]}"/><rect x="{x0}" y="220" width="250" height="150" fill="{C["skin2"]}"/><rect x="{x0}" y="370" width="250" height="120" fill="{C["fat"]}"/>')
        if bad:
            s.append("".join(f'<circle cx="{x0+125+dx}" cy="{400+dy}" r="7" fill="#1b2a44"/>' for dx, dy in [(-60, 10), (-30, 40), (0, 20), (30, 55), (60, 15), (-10, 70), (45, 80), (-50, 75)]))
            s.append(f'<ellipse cx="{x0+125}" cy="425" rx="90" ry="55" fill="#4a6fa5" fill-opacity=".3"/>')
        else:
            s.append("".join(f'<circle cx="{x0+125+dx}" cy="{280+dy}" r="7" fill="#1b2a44"/>' for dx, dy in [(-15, 0), (10, 15), (0, -20), (20, -5), (-20, 20)]))
        s.append(T(x0 + 125, 530, lab, 28, C["red"] if bad else C["green"], 900))
    s.append(T(650, 190, "روپوست", 24, C["ink"], 700, "end") + T(650, 300, "میان‌پوست", 24, C["ink"], 700, "end") + T(650, 440, "چربی", 24, C["ink"], 700, "end"))
    return svg(660, 550, "".join(s))
D["d25-blowout"] = lambda: page(24, "خط سالم و بلوآوت", "بالا: نمای سطح · پایین: مقطع پوست", _blow(),
    "بلوآوت: رنگ به لایهٔ چربی می‌رسد و هالهٔ آبی‌خاکستری می‌سازد. علت رایج: عمق زیاد، زاویهٔ غلط یا کشش ناکافی.")

def _lines():
    s = []
    rows = [("پیوسته و یک‌عبوره", C["green"], '<path d="M30 0 H330" stroke="#1b1b1b" stroke-width="9" stroke-linecap="round"/>'),
            ("لرزان", C["red"], '<path d="M30 0 q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#1b1b1b" stroke-width="9" fill="none"/>'),
            ("دوخطی (عبور دوباره)", C["red"], '<path d="M30 -5 H330" stroke="#1b1b1b" stroke-width="8"/><path d="M30 6 H330" stroke="#1b1b1b" stroke-width="8"/>')]
    for i, (lab, col, p) in enumerate(rows):
        y = 60 + i * 110
        s.append(f'<g transform="translate(0,{y})">{p}</g>' + T(640, y + 10, lab, 26, col, 900, "end"))
    s.append(f'<circle cx="230" cy="450" r="85" fill="none" stroke="#1b1b1b" stroke-width="9"/><circle cx="315" cy="450" r="16" fill="none" stroke="{C["green"]}" stroke-width="5"/>')
    s.append(T(640, 440, "بستن دایره:", 26, C["ink"], 900, "end") + T(640, 480, "اتصال در جای پنهان", 24, C["gray"], 700, "end"))
    return svg(660, 560, "".join(s))
D["d26-line-quality"] = lambda: page(25, "کیفیت خط", "خط یک‌عبوره و اتصال پنهان", _lines())

def _shade():
    s = []
    defs = '<defs><linearGradient id="w" x1="1" x2="0"><stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#1b1b1b" stop-opacity="0"/></linearGradient></defs>'
    s.append(defs)
    rows = [("شلاقی", '<path d="M520 70 Q400 10 300 60" stroke="{c}" stroke-width="6" fill="none"/><path d="M520 70 Q400 30 300 80" stroke="{c}" stroke-width="6" fill="none" opacity=".6"/>', "محو از تیره به روشن"),
            ("پاندولی", '<path d="M300 60 Q410 110 520 60 M520 60 Q410 10 300 60" stroke="{c}" stroke-width="6" fill="none"/>', "سایهٔ یکدست‌تر"),
            ("دایره‌های کوچک", "".join(f'<circle cx="{320+i*40}" cy="60" r="18" stroke="{{c}}" stroke-width="5" fill="none"/>' for i in range(6)), "بافت نرم، پر کردن")]
    for i, (lab, p, res) in enumerate(rows):
        y = i * 180
        s.append(f'<g transform="translate(0,{y})"><rect x="5" y="5" width="650" height="165" rx="20" fill="{C["light"]}"/><g transform="translate(-270,0)">' + p.replace("{c}", C["pink"]) + "</g>")
        s.append(T(640, 60, lab, 26, C["ink"], 900, "end"))
        s.append(f'<rect x="30" y="110" width="220" height="34" rx="8" fill="{"url(#w)" if i==0 else ("#555" if i==1 else "#777")}"/>' + T(640, 135, res, 24, C["gray"], 700, "end") + "</g>")
    return svg(660, 545, "".join(s))
D["d27-shading-motions"] = lambda: page(26, "سه حرکت دست در سایه‌زنی", "حرکت دست، بافت سایه را می‌سازد", _shade())

def _order():
    s = []
    s.append(f'<rect x="360" y="20" width="250" height="160" rx="12" fill="#c62828"/>' + "".join(f'<rect x="{380+i*55}" y="{50+(i%2)*60}" width="30" height="30" fill="#f6d2b8"/>' for i in range(4)))
    s.append(f'<rect x="50" y="20" width="250" height="160" rx="12" fill="#c62828"/>')
    s.append(T(485, 220, "اشباع ناقص", 26, C["red"], 900) + T(175, 220, "اشباع درست", 26, C["green"], 900))
    cols = [("#1b1b1b", "تیره", "#fff"), ("#8e44ad", "میانه", "#fff"), ("#f4b400", "روشن", C["ink"]), ("#ffffff", "سفید", C["ink"])]
    for i, (c, lab, tc) in enumerate(cols):
        x = 530 - i * 160
        s.append(f'<rect x="{x}" y="270" width="120" height="120" rx="60" fill="{c}" stroke="#999" stroke-width="3"/>' + T(x + 60, 340, lab, 26, tc, 900))
        if i < 3: s.append(T(x - 20, 345, "←", 34, C["gold"], 900))
    s.append(T(330, 440, "ترتیب: تیره اول، روشن بعد، سفید آخر", 26, C["ink"], 900))
    return svg(660, 460, "".join(s))
D["d28-color-order"] = lambda: page(27, "اشباع و ترتیب رنگ", "رنگ روشن روی تیره نمی‌نشیند و سوزن را آلوده نمی‌کند", _order())

def _grey():
    s = []
    for i, (v, r) in enumerate([("#e6e6e6", "۱ قطره در کاپ رقیق‌کننده"), ("#bdbdbd", "۳ قطره"), ("#8a8a8a", "۶ قطره"), ("#4d4d4d", "نیمه‌نیمه"), ("#111", "مشکی خالص")]):
        x = 560 - i * 125
        s.append(f'<path d="M{x-45} 40 h90 l-14 110 h-62z" fill="{v}" stroke="#777" stroke-width="3"/>')
        s.append(f'<rect x="{x-55}" y="190" width="110" height="70" rx="10" fill="{v}" stroke="#999" stroke-width="2"/>')
        s.append(T(x, 300, fa(i + 1), 26, C["ink"], 900))
    s.append(T(330, 360, "نسبت‌ها نمونه‌اند؛ نسبت خودت را بنویس.", 24, C["gray"], 700))
    return svg(660, 380, "".join(s))
D["d29-grey-wash"] = lambda: page(28, "سری کاپ‌های خاکستری", "از روشن شروع کن، تیره را به‌تدریج بساز", _grey(),
    "رقیق‌کننده: محلول توصیه‌شدهٔ سازنده یا آب استریل. برخی سازندگان سری خاکستری آماده دارند.")

D["d30-work-order"] = lambda: page(29, "ترتیب اجرای طرح", "ترتیب اجرا جلوی خطا را می‌گیرد",
    steps([("خط", "اول خط اصلی، تا استنسیل پاک نشده."), ("سایه و رنگ تیره", "سایه‌های تیره و مشکی."), ("رنگ یا خاکستری میانه و روشن", "از تیره به روشن."),
           ("سفید و هایلایت", "در پایان، فقط نقطه‌های نور."), ("تمیز کردن و پوشش", "پاک کردن ملایم، عکس، پوشش و برگهٔ مراقبت.")], C["ink"]))

D["d31-aftercare"] = lambda: page(30, "برگهٔ مراقبت استودیو", "روش همین استودیو، در یک نگاه",
    cards([("حدود ۲ ساعت بعد", C["blue"], ["سلفون را بردار و دوش بگیر."]),
           ("روز ۱ تا ۳", C["yellow"], ["روزی سه بار دوش: صبح، ظهر، شب", "چرب نکن."]),
           ("روز ۴", C["green"], ["تاتو را باز بگذار."]),
           ("روز ۵ تا یک ماه", C["pink"], ["روزی پنج بار پماد دکسپانتونل", "ملایم و لایهٔ نازک"])], 2),
    "در همهٔ دوره: پوسته را نکن، استخر و سونا و آفتاب نه. نشانهٔ هشدار = پزشک.")

D["d32-red-flags"] = lambda: page(31, "از نشانه تا اقدام", "طبیعی، متخصص پوست یا فوری",
    cards([("طبیعی", C["green"], ["قرمزی و تورم خفیف روزهای اول که کم می‌شود", "خارش و پوسته", "کدر شدن موقت"]),
           ("متخصص پوست", C["yellow"], ["واکنش خفیف تا متوسط بیش از ۱ تا ۲ هفته", "برجستگی یا تغییر ماندگار", "تغییر خال در محل"]),
           ("فوری", C["red"], ["تب، لرز، قرمزی سریع‌گسترش یا خط قرمز: پزشک همان روز", "تنگی نفس، تورم صورت یا گلو، کهیر گسترده: اورژانس"])]),
    "منبع: انجمن پوست آمریکا. تاتوکار تشخیص نمی‌دهد و دارو تجویز نمی‌کند؛ ارجاع می‌دهد.")

D["d33-healed-read"] = lambda: page(32, "خواندن کار خوب‌شده", "سه معیار، روی عکس با نور یکسان",
    cards([("خط", C["ink"], ["خوب: پیوسته و تیز", "بد: بریده، پهن یا پخش"]),
           ("اشباع", C["gold"], ["خوب: یکدست، بدون جای خالی", "بد: لکه‌های خالی، به‌ویژه روی مفصل"]),
           ("هاله", C["red"], ["خوب: بدون هاله", "بد: هالهٔ آبی‌خاکستری = بلوآوت"])]),
    "علت هر مشکل را بنویس: مراقبت، جای بدن یا تکنیک.")

def _cover():
    s = []
    old = '<path d="M-40 -10 q40 -50 80 0 q-40 50 -80 0z" fill="none" stroke="#9aa4ae" stroke-width="10"/>'
    new = '<circle r="85" fill="#1b2a44"/><circle r="85" fill="none" stroke="#1b1b1b" stroke-width="8"/><path d="M-85 0 Q0 -140 85 0" fill="#e0a800" opacity=".9"/>'
    for i, (lab, body) in enumerate([("کار قدیمی", old), ("طرح تازه روی آن", new + old.replace("#9aa4ae", "#d64545")), ("نتیجه", new)]):
        x = 550 - i * 220
        s.append(f'<rect x="{x-100}" y="20" width="200" height="230" rx="20" fill="{C["skin1"]}"/><g transform="translate({x},130)">{body}</g>')
        s.append(T(x, 300, lab, 26, C["ink"], 900))
    return svg(660, 320, "".join(s))
D["d34-cover-up"] = lambda: page(33, "طراحی کاور", "خط‌های قدیمی باید در بخش تیرهٔ طرح تازه بیفتند", _cover(),
    "کاور معمولاً بزرگ‌تر و تیره‌تر از کار قدیمی است؛ رنگ روشن، تیره را نمی‌پوشاند.")

def _sleeve():
    s = []
    for i, lab in enumerate(["بیرون", "جلو", "درون", "پشت"]):
        x = 570 - i * 160
        s.append(f'<path d="M{x-45} 40 h90 l-15 420 h-60z" fill="{C["light"]}" stroke="#bfb3a0" stroke-width="4"/>' + T(x, 500, lab, 24, C["ink"], 800))
        s.append(f'<path d="M{x-40} 300 q20 -20 40 0 t40 0" stroke="{C["blue"]}" stroke-width="4" fill="none"/><path d="M{x-35} 380 q20 -20 40 0 t35 0" stroke="{C["blue"]}" stroke-width="4" fill="none"/>')
    for (x, y, n, col) in [(570, 140, "۱", C["pink"]), (410, 230, "۲", C["gold"]), (250, 160, "۳", C["green"])]:
        s.append(f'<circle cx="{x}" cy="{y}" r="36" fill="{col}"/>' + T(x, y + 10, n, 30, "#fff", 900))
    return svg(660, 520, "".join(s))
D["d35-sleeve-plan"] = lambda: page(34, "نقشهٔ آستین", "عنصرهای اصلی، پس‌زمینه و ترتیب جلسه‌ها", _sleeve(),
    "دایره‌های شماره‌دار: عنصر اصلی و ترتیب جلسه. موج آبی: پس‌زمینه. بین جلسه‌های یک ناحیه، ترمیم کامل.")

def _grid():
    s = ['<rect x="130" y="10" width="400" height="500" fill="#fff" stroke="#999" stroke-width="3"/>']
    s += [f'<path d="M{130+i*100} 10 V510" stroke="#bbb" stroke-width="2"/>' for i in range(1, 4)]
    s += [f'<path d="M130 {10+i*125} H530" stroke="#bbb" stroke-width="2"/>' for i in range(1, 4)]
    s.append('<ellipse cx="330" cy="250" rx="140" ry="190" fill="none" stroke="#1b1b1b" stroke-width="6"/>')
    s.append('<ellipse cx="270" cy="220" rx="30" ry="14" fill="#1b1b1b"/><ellipse cx="390" cy="220" rx="30" ry="14" fill="#1b1b1b"/>')
    s.append('<path d="M330 230 L315 310 H345" fill="none" stroke="#1b1b1b" stroke-width="5"/><path d="M285 360 Q330 385 375 360" fill="none" stroke="#1b1b1b" stroke-width="6"/>')
    for y, lab in [(220, "خط چشم"), (310, "زیر بینی"), (362, "خط لب")]:
        s.append(f'<path d="M140 {y} H520" stroke="{C["pink"]}" stroke-width="3" stroke-dasharray="10 6"/>' + T(640, y + 8, lab, 24, C["pink"], 800, "end"))
    return svg(660, 520, "".join(s))
D["d36-portrait-grid"] = lambda: page(35, "شبکهٔ راهنمای پرتره", "نسبت‌های چهره با شبکهٔ ۴×۴ منتقل می‌شوند", _grid())

D["d37-styles-map"] = lambda: page(36, "نقشهٔ شش خانوادهٔ سبک", "زبان تصویری و نیاز فنی هر خانواده",
    cards([("۱. سنتی و خط قوی", C["red"], ["سنتی آمریکایی، نئوسنتی، ژاپنی، نیواسکول", "خط: ضخیم · ماندگاری: بسیار بالا"]),
           ("۲. سیاه، نقش و هندسه", C["ink"], ["تریبال، بلک‌ورک، هندسی، دات‌ورک", "خط و سطح مشکی · ماندگاری: بالا"]),
           ("۳. خط ظریف و نوشته", C["gray"], ["فاین‌لاین، مینیمال، لترینگ", "خط: نازک · ماندگاری: کمتر"]),
           ("۴. رئال", C["gold"], ["سیاه و خاکستری، پرتره، چیکانو، رئال رنگی", "بدون خط اصلی · نیاز به اندازهٔ کافی"]),
           ("۵. تصویری و آزاد", C["pink"], ["واترکالر، اسکچ، ترش‌پولکا، سوررئال", "ماندگاری: به ساختار ارزشی وابسته"]),
           ("۶. سنت‌های آیینی", C["green"], ["ساک یانت و نقش‌های آیینی", "فقط با شناخت و احترام فرهنگی"])], 2),
    "بدون تصویر آثار هنرمندان؛ نام هنرمندان شاخص و منابع در متن درس آمده است.")

def _photo():
    s = [f'<rect x="230" y="190" width="200" height="140" rx="16" fill="{C["skin1"]}" stroke="#b07a52" stroke-width="4"/>' + T(330, 270, "تاتو", 26, C["ink"], 900)]
    s.append(f'<rect x="290" y="30" width="80" height="60" rx="10" fill="{C["ink"]}"/><circle cx="330" cy="60" r="18" fill="#fff"/>' + T(330, 125, "دوربین عمود", 24, C["ink"], 800))
    s.append(f'<path d="M330 95 V185" stroke="{C["ink"]}" stroke-width="4" stroke-dasharray="8 6"/>')
    for x, y, rot in [(560, 420, -45), (100, 420, 45)]:
        s.append(f'<g transform="translate({x},{y}) rotate({rot})"><rect x="-60" y="-30" width="120" height="60" rx="12" fill="{C["yellow"]}"/></g>')
    s.append(f'<path d="M520 390 L430 330" stroke="{C["yellow"]}" stroke-width="6"/><path d="M140 390 L230 330" stroke="{C["yellow"]}" stroke-width="6"/>')
    s.append(T(560, 490, "نور نرم ۴۵°", 24, C["gold"], 800) + T(100, 490, "نور نرم ۴۵°", 24, C["gold"], 800))
    return svg(660, 510, "".join(s))
D["d38-photo-setup"] = lambda: page(37, "چیدمان عکس نمونه‌کار", "نمای بالا: نور یکنواخت از دو طرف، دوربین عمود", _photo(),
    "بدون فلاش مستقیم و بدون فیلتر؛ زمینهٔ ساده.")

D["d39-client-file"] = lambda: page(38, "پروندهٔ مشتری", "پروندهٔ کامل، پیگیری عارضه را ممکن می‌کند",
    cards([("تماس", C["blue"], ["نام و راه تماس"]), ("سلامت", C["red"], ["فرم سلامت با پاسخ‌ها"]),
           ("رضایت", C["green"], ["رضایت‌نامه و رضایت عکاسی جداگانه"]), ("طرح", C["gold"], ["طرح نهایی، جا و اندازه"]),
           ("سوزن و رنگ", C["ink"], ["سوزن‌ها، رنگ‌ها با شمارهٔ ساخت، تاریخ و طول جلسه"]), ("پیگیری", C["pink"], ["هر تماس یا عارضه پس از کار"])], 2),
    "محرمانه و طبق قانون حفاظت داده و مدت نگهداری محل.")

def _aging():
    s = []
    for i, (lab, w, blur) in enumerate([("تازه", 6, 0), ("چند سال بعد", 9, 1.2), ("سال‌ها بعد", 13, 2.5)]):
        x = 550 - i * 220
        s.append(f'<defs><filter id="b{i}"><feGaussianBlur stdDeviation="{blur}"/></filter></defs>')
        s.append(f'<rect x="{x-100}" y="20" width="200" height="230" rx="20" fill="{C["skin1"]}"/>')
        s.append(f'<g filter="url(#b{i})" transform="translate({x},135)"><path d="M0 -70 C40 -20 40 30 0 70 C-40 30 -40 -20 0 -70z" fill="{["#555","#666","#777"][i]}" stroke="#1b1b1b" stroke-width="{w}"/>'
                 f'<path d="M0 -40 V40" stroke="#1b1b1b" stroke-width="{w-2}"/></g>' + T(x, 300, lab, 26, C["ink"], 900))
    return svg(660, 320, "".join(s))
D["d40-aging"] = lambda: page(39, "تاتو در گذر سال‌ها", "نمایش نمادین و تقریبی", _aging(),
    "خط‌ها کمی پهن‌تر و ارزش‌ها نزدیک‌تر می‌شوند؛ آفتاب مهم‌ترین عامل محو شدن است.")

def _layers():
    s = [f'<rect x="10" y="40" width="640" height="90" fill="{C["skin1"]}"/><rect x="10" y="130" width="640" height="200" fill="{C["skin2"]}"/><rect x="10" y="330" width="640" height="150" fill="{C["fat"]}"/>']
    s.append(T(640, 95, "روپوست", 26, C["ink"], 900, "end") + T(640, 240, "میان‌پوست", 26, C["ink"], 900, "end") + T(640, 410, "زیرپوست (چربی)", 26, C["ink"], 900, "end"))
    for x, depth, lab, col, res in [(440, 95, "سطحی", C["yellow"], "با پوسته می‌ریزد"), (280, 230, "درست", C["green"], "ماندگار"), (120, 400, "عمیق", C["red"], "پخش و بلوآوت")]:
        s.append(f'<rect x="{x-60}" y="0" width="120" height="34" rx="17" fill="{col}"/>' + T(x, 26, lab, 24, "#fff", 900))
        s.append(f'<path d="M{x} 34 V{depth}" stroke="#555" stroke-width="10"/>')
        s.append("".join(f'<circle cx="{x+dx}" cy="{depth+dy}" r="7" fill="#1b2a44"/>' for dx, dy in [(-18, 5), (14, 10), (0, 22), (-10, -8), (20, -6)]))
        s.append(T(x, 530, res, 24, col, 900))
    return svg(660, 550, "".join(s))
D["d02-skin-layers"] = lambda: page(3, "سه عمق سوزن در پوست", "رنگ فقط در میان‌پوست ماندگار است", _layers(),
    "شماتیک؛ ضخامت لایه‌ها به مقیاس نیست و در هر جای بدن فرق دارد.")

# Fallbacks for diagrams the images agent already delivered (used only if theirs is missing).
D["d01-path"] = lambda: page(1, "مسیر کارآموزی", "هر پله پیش‌شرط پلهٔ بعد است",
    steps([("دانش پایه", "پوست، کنترل عفونت، ابزار"), ("طراحی", "خط، سایه، ترکیب‌بندی روی کاغذ"), ("تمرین", "پوست مصنوعی و میوه"),
           ("دستیاری", "آماده‌سازی ایستگاه و دیدن کار استاد"), ("اولین کار", "فقط با اجازه و زیر نظر استاد")], C["ink"]))
D["d03-healing"] = lambda: page(4, "مراحل ترمیم", "هم‌پوشان و تقریبی",
    steps([("التهاب", "روزهای اول: قرمزی، تورم، ترشح شفاف", C["red"]), ("بازسازی", "حدود هفتهٔ اول تا سوم: پوسته و خارش", C["yellow"]),
           ("بلوغ", "هفته‌ها تا ماه‌ها: آرام شدن و شفاف شدن رنگ", C["green"])]))

PLACEHOLDER = lambda num, title, brief: page(num, title, "جای عکس واقعی کار استودیو",
    f'<div class="card" style="margin-top:22px;border-style:dashed;border-color:{C["gold"]};background:{C["light"]};text-align:center;padding:40px 24px">'
    f'<div style="font-size:72px;line-height:1">📷</div><h3 style="margin-top:12px">این عکس را استودیو اضافه می‌کند</h3>'
    f'<p style="margin-top:10px">{e(brief)}</p></div>',
    "با رضایت کتبی مشتری؛ بدون چهره و نشانهٔ هویتی. هیچ عکس ساختگی جای آن گذاشته نشده است.")

def render(names):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('os').environ.get('CHROME_EXE'))
        pg = b.new_page(viewport={"width": 720, "height": 800}, device_scale_factor=2)
        for n in names:
            src = D[n]() if n in D else None
            if src is None: continue
            (OUT / f"{n}.html").write_text(src, encoding="utf-8")
            pg.set_content(src); pg.wait_for_timeout(150)
            pg.locator("#d").screenshot(path=str(OUT / f"{n}.png"))
            print("ok", n)
        b.close()

if __name__ == "__main__":
    import json
    extra = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--placeholders" else []
    for slot, num, title, brief in extra:
        D[slot] = (lambda a, b_, c: (lambda: PLACEHOLDER(a, b_, c)))(num, title, brief)
    render([a for a in sys.argv[1:] if not a.startswith("--") and not a.startswith("[")] or list(D))
