#!/usr/bin/env python3
"""Regenerate all Android launcher sizes from the approved source image. Requires Pillow."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw
parser=argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/"android-tattoo-booking"
img=Image.open(args.source).convert("RGB").crop((87,76,937,926))
for density,size,fgsize in [("mdpi",48,108),("hdpi",72,162),("xhdpi",96,216),("xxhdpi",144,324),("xxxhdpi",192,432)]:
    folder=root/"app/src/main/res"/f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    for name,round_icon in [("ic_launcher",False),("ic_launcher_round",True)]:
        tile=img.resize((size,size),Image.Resampling.LANCZOS).convert("RGBA")
        mask=Image.new("L",(size,size));draw=ImageDraw.Draw(mask)
        if round_icon: draw.ellipse((0,0,size-1,size-1),fill=255)
        else: draw.rounded_rectangle((0,0,size-1,size-1),radius=int(size*.22),fill=255)
        tile.putalpha(mask);tile.save(folder/f"{name}.png")
    fg=Image.new("RGBA",(fgsize,fgsize));n=int(fgsize*.75)
    tile=img.resize((n,n),Image.Resampling.LANCZOS).convert("RGBA")
    mask=Image.new("L",(n,n));ImageDraw.Draw(mask).rounded_rectangle((0,0,n-1,n-1),radius=int(n*.2),fill=255)
    tile.putalpha(mask);fg.alpha_composite(tile,((fgsize-n)//2,(fgsize-n)//2))
    fg.save(folder/"ic_launcher_foreground.png")
img.resize((512,512),Image.Resampling.LANCZOS).save(root/"play-icon-512.png")
