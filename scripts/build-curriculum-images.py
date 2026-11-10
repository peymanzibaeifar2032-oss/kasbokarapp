#!/usr/bin/env python3
"""Collect one web image per curriculum image slot and embed them for the gated image API.
Preference: images agent package (/workspace/apprentice-curriculum-collab/images/_manifest.json, own-work diagrams or
explicit placeholders) when present for the slot; otherwise our own render in docs/tattoo-curriculum/diagrams/.
Writes docs/tattoo-curriculum/images/<slot>.webp, images-credits.json and src/lib/tattoo-curriculum/images.generated.ts."""
import base64, json, pathlib, re, subprocess, sys
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
DIA = ROOT / "docs/tattoo-curriculum/diagrams"
OUT = ROOT / "docs/tattoo-curriculum/images"; OUT.mkdir(parents=True, exist_ok=True)
COLLAB = pathlib.Path("/workspace/apprentice-curriculum-collab/images")
META = ROOT / "src/lib/tattoo-curriculum/images-meta.generated.ts"
# Read the hand-written slots only: reset the generated extras/overrides before loading the lessons.
META.write_text('import type { ImageSlot } from "./types.ts";\nexport const SLOT_OVERRIDES: Record<string, { alt: string; caption: string }> = {};\nexport const EXTRA_IMAGES: Record<string, { after: string | null; image: ImageSlot }[]> = {};\n')
slots = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "-e",
    "import('./src/lib/tattoo-curriculum/index.ts').then(m=>console.log(JSON.stringify(m.LESSONS.flatMap(l=>l.images.map(i=>({lesson:l.id,...i}))))))"], cwd=ROOT))
agent = {}
extras = []
mf = COLLAB / "_manifest.json"
status = (COLLAB / "STATUS.md").read_text() if (COLLAB / "STATUS.md").exists() else ""
released_all = bool(re.search(r"^RELEASED\b", status, re.M))
v2 = set(re.findall(r"^DONE-v2 \| (cur-\d\d)\b", status, re.M))
# The images agent's v1 labels were too small on phones (HOLD); only DONE-v2 / RELEASED packages are used.
if mf.exists() and (released_all or v2):
    for row in json.loads(mf.read_text()):
        if row.get("slot") and row.get("web") and (COLLAB / row["web"]).exists() and (released_all or row.get("lesson") in v2):
            lic = row.get("license", "")
            if row.get("type") in ("diagram", "placeholder") and ("own work" in lic or "PLACEHOLDER" in lic.upper() or row.get("type") == "placeholder"):
                if row["slot"] in agent:  # second image for the same slot (e.g. d37-styles-map-b) -> shown right after it
                    extras.append({**row, "_id": row["slot"] + "2", "_after": row["slot"]})
                else:
                    agent[row["slot"]] = row
        elif not row.get("slot") and row.get("web") and (COLLAB / row["web"]).exists() and (released_all or row.get("lesson") in v2):
            if row.get("type") == "diagram" and "own work" in row.get("license", ""):
                extras.append({**row, "_id": row["name"], "_after": None})
            elif row.get("type") == "photo" and re.match(r"CC0|CC BY(-SA)? 4\.0|CC BY(-SA)? 3\.0|Public domain", row.get("license", "")):
                extras.append({**row, "_id": row["name"], "_after": None})
# Caption fixes after our own review of the images agent's captions.
CAPTION_FIX = {
    "cur-09-p3-pen-photo": "دستگاه قلمی با کیسهٔ محافظ یک‌بارمصرف و نوار کشی دور گریپ برای گرفتن راحت‌تر، در دست دستکش‌دار.",
    "cur-14-x1-ink-longevity": "ترتیب کیفی بر پایهٔ تجربهٔ رایج هنرمندان، نه دادهٔ اندازه‌گیری‌شده؛ آفتاب بعضی رنگدانه‌های زرد و قرمز را تجزیه می‌کند.",
}
def clean_caption(row):
    c = CAPTION_FIX.get(row["name"], row.get("caption", ""))
    return re.sub(r"\s*\((عکس|Photo):[^)]*\)\s*$", "", c).strip()
def photo_credit(row):
    lic = re.sub(r"\s*\(.*\)$", "", row["license"]).strip()
    return f"عکس: {row['author']} — مجوز {lic} — ویکی‌مدیا کامنز"
overrides, extra_slots = {}, {}
for sid, row in agent.items():
    overrides[sid] = {"alt": row.get("alt", ""), "caption": clean_caption(row)}
for row in extras:
    photo = row["type"] == "photo"
    slot = {"id": row["_id"], "kind": "photo" if photo else "svg", "brief": row.get("title", ""), "alt": row.get("alt", ""),
            "caption": clean_caption(row),
            "credit": photo_credit(row) if photo else "نمودار آموزشی اختصاصی درس‌نامهٔ استودیو پیمان زیبائی‌فر",
            "license": re.sub(r"\s*\(.*\)$", "", row["license"]).strip() if photo else "متعلق به استودیو؛ استفاده در سایت و کتاب همین استودیو"}
    if photo: slot["sourceUrl"] = row["source_url"]
    extra_slots.setdefault(row["lesson"], []).append({"after": row["_after"], "image": slot})
    slots.append({"lesson": row["lesson"], **slot, "_src": str(COLLAB / row["web"])})
credits, embed = {}, {}
for s in slots:
    sid = s["id"]
    if s.get("_src"):
        src = pathlib.Path(s["_src"]); origin = "images-agent"
    elif sid in agent:
        src = COLLAB / agent[sid]["web"]; origin = "images-agent"
    else:
        name = s.get("diagram") if s["kind"] == "svg" else sid
        src = DIA / f"{name}.png"; origin = "orchestrator"
    if not src.exists():
        print("MISSING", sid, src); sys.exit(1)
    im = Image.open(src).convert("RGB")
    if im.width > 1440: im = im.resize((1440, round(im.height * 1440 / im.width)), Image.LANCZOS)
    dst = OUT / f"{sid}.webp"
    q = 86
    while True:
        im.save(dst, "WEBP", quality=q, method=6)
        if dst.stat().st_size < 290_000 or q < 50: break
        q -= 8
    embed[sid] = base64.b64encode(dst.read_bytes()).decode()
    meta = {**s, **overrides.get(sid, {})}
    credits[sid] = {"lesson": s["lesson"], "kind": s["kind"], "origin": origin, "file": f"docs/tattoo-curriculum/images/{sid}.webp",
                    "bytes": dst.stat().st_size, "alt": meta["alt"], "caption": meta["caption"], "credit": s["credit"], "license": s["license"],
                    "sourceUrl": s.get("sourceUrl", "")}
    print(f"{sid:10} {origin:13} {dst.stat().st_size//1024:4}KB")
(OUT / "images-credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1))
ts = ["// Generated by scripts/build-curriculum-images.py. Do not edit. WebP, base64.", "export const CURRICULUM_IMAGES: Record<string, string> = {"]
ts += [f'  "{k}": "{v}",' for k, v in embed.items()] + ["};", ""]
(ROOT / "src/lib/tattoo-curriculum/images.generated.ts").write_text("\n".join(ts))
meta_ts = ["// Generated by scripts/build-curriculum-images.py. Do not edit. Alt/caption from the images agent's v2 manifest; extra images.",
           'import type { ImageSlot } from "./types.ts";',
           "export const SLOT_OVERRIDES: Record<string, { alt: string; caption: string }> = " + json.dumps(overrides, ensure_ascii=False, indent=1) + ";",
           "export const EXTRA_IMAGES: Record<string, { after: string | null; image: ImageSlot }[]> = " + json.dumps(extra_slots, ensure_ascii=False, indent=1) + ";", ""]
META.write_text("\n".join(meta_ts))
print("total", sum(c["bytes"] for c in credits.values()) // 1024, "KB")
