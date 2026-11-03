#!/usr/bin/env python3
"""
Optional dev tool. Builds the web copies of the iGen logo from the untouched
originals in _project-docs/brand/ (never committed) into img/brand/ (committed).

Why Python/PIL instead of sharp: it was already on the machine and the job is a
one-off per logo revision. Content photos use tools/images.js (sharp) instead.

Run:  python3 tools/brand-assets.py
Never edits the originals. Trim = crop transparent padding only, no recolor, no redraw.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_project-docs" / "brand"
OUT = ROOT / "img" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

# (source file, output stem, output heights in px). Heights are 2x the CSS size so
# the glossy artwork stays crisp on retina screens: header 168 -> 336 (desktop), 112 -> 224 (mobile); footer uses 240.
JOBS = [
    ("igen-logo-full-color-transparent.png", "logo-full-color", (224, 336, 480)),
    ("igen-logo-all-gold-transparent.png",   "logo-all-gold",   (224, 336, 480)),
    ("igen-mark-color-transparent.png",      "mark-color",      (88, 176, 512)),
]

def trim(img: Image.Image) -> Image.Image:
    """Crop to the alpha bounding box, ignoring near-invisible halo pixels (alpha <= 8)
    so the gloss shadow does not inflate the box."""
    alpha = img.getchannel("A").point(lambda a: 255 if a > 8 else 0)
    box = alpha.getbbox()
    return img.crop(box)

for src_name, stem, heights in JOBS:
    img = Image.open(SRC / src_name).convert("RGBA")
    img = trim(img)
    w, h = img.size
    print(f"{src_name}: trimmed to {w}x{h} (aspect {w/h:.3f})")
    for target_h in heights:
        scale = target_h / h
        resized = img.resize((round(w * scale), target_h), Image.LANCZOS)
        resized.save(OUT / f"{stem}-{target_h}.png", optimize=True)
        resized.save(OUT / f"{stem}-{target_h}.webp", quality=92, method=6)
        print(f"  -> {stem}-{target_h}.png/.webp {resized.size}")

# Default share image (Open Graph / Twitter): 1200x630, logo centered on white.
og = Image.new("RGB", (1200, 630), "white")
logo = trim(Image.open(SRC / "igen-logo-full-color-transparent.png").convert("RGBA"))
lw, lh = logo.size
scale = 380 / lh
logo = logo.resize((round(lw * scale), 380), Image.LANCZOS)
og.paste(logo, ((1200 - logo.width) // 2, (630 - 380) // 2), logo)
og.save(OUT / "og-default.jpg", quality=88, optimize=True)
print("  -> og-default.jpg 1200x630")
