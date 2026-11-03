#!/usr/bin/env python3
"""
Optional dev tool. Draws the FLAT favicon mark (an orange "G" ring with a charcoal
"i") that stands in for the glossy logo at 16-48 px, where bevels turn to mush.
This is a simplified derivative for icons only; the real logo is never altered.

Geometry lives once, in a 64-unit box, and is emitted both as SVG (for modern
browsers) and as PNG/ICO via PIL (supersampled 16x for clean edges).

Run:  python3 tools/favicon.py [out_dir]      default: img/icons
"""
import math, sys
from pathlib import Path
from PIL import Image, ImageDraw

ORANGE, CHARCOAL, WHITE = "#E47C10", "#2C2C2C", "#FFFFFF"
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "img" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# --- geometry (64-unit box) -------------------------------------------------
C = 32.0          # center
R_MID = 17.5      # ring radius at stroke center
STROKE = 9.0
GAP = 25          # degrees either side of 3 o'clock left open (the G's mouth)
BAR_X0 = 36.0     # the G's horizontal bar, from here to the ring's lower end
I_STEM = (24.5, 29.0, 31.5, 43.5)   # x0 y0 x1 y1, rounded
I_DOT = (28.0, 23.0, 3.3)           # cx cy r

def pt(angle_deg):
    a = math.radians(angle_deg)
    return (C + R_MID * math.cos(a), C + R_MID * math.sin(a))

top_end, bottom_end = pt(-GAP), pt(GAP)

SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <!-- Flat iGen mark for favicons. Derived from the logo's "iG" ring; not the logo itself. -->
  <path d="M {top_end[0]:.2f} {top_end[1]:.2f} A {R_MID} {R_MID} 0 1 0 {bottom_end[0]:.2f} {bottom_end[1]:.2f}"
        fill="none" stroke="{ORANGE}" stroke-width="{STROKE}" stroke-linecap="round"/>
  <path d="M {BAR_X0} {bottom_end[1]:.2f} H {bottom_end[0]:.2f}"
        fill="none" stroke="{ORANGE}" stroke-width="{STROKE}" stroke-linecap="round"/>
  <rect x="{I_STEM[0]}" y="{I_STEM[1]}" width="{I_STEM[2]-I_STEM[0]}" height="{I_STEM[3]-I_STEM[1]}" rx="3.5" fill="{CHARCOAL}"/>
  <circle cx="{I_DOT[0]}" cy="{I_DOT[1]}" r="{I_DOT[2]}" fill="{CHARCOAL}"/>
</svg>
'''
(OUT / "favicon.svg").write_text(SVG)

def render(size, background=None, inset=0.0, bold=False):
    """Rasterize the mark at `size` px. `inset` shrinks the artwork (0.1 = 10% margin)
    for opaque icons (iOS / maskable) that get rounded by the platform."""
    S = 16
    big = size * S
    img = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = big / 64 * (1 - 2 * inset)
    off = big * inset
    def X(v): return off + v * k
    def circle(cx, cy, r, fill):
        d.ellipse([X(cx - r), X(cy - r), X(cx + r), X(cy + r)], fill=fill)
    # ring with the mouth on the right (PIL angles are clockwise from 3 o'clock)
    # At 16 px a 9-unit stroke is ~2 device pixels; bold mode thickens everything.
    stroke = STROKE + (2.5 if bold else 0)
    stem = (23.0, 28.0, 32.5, 44.0) if bold else I_STEM
    dot = (27.75, 22.0, 4.2) if bold else I_DOT
    r_out = R_MID + stroke / 2
    d.arc([X(C - r_out), X(C - r_out), X(C + r_out), X(C + r_out)], GAP, 360 - GAP,
          fill=ORANGE, width=round(stroke * k))
    for p in (top_end, bottom_end):            # round caps
        circle(p[0], p[1], stroke / 2, ORANGE)
    y = bottom_end[1]                           # the bar
    d.rectangle([X(BAR_X0), X(y - stroke / 2), X(bottom_end[0]), X(y + stroke / 2)], fill=ORANGE)
    circle(BAR_X0, y, stroke / 2, ORANGE)
    d.rounded_rectangle([X(stem[0]), X(stem[1]), X(stem[2]), X(stem[3])],
                        radius=(stem[2] - stem[0]) / 2 * k, fill=CHARCOAL)
    circle(dot[0], dot[1], dot[2], CHARCOAL)
    return img.resize((size, size), Image.LANCZOS)

render(32).save(OUT / "favicon-32.png")
render(16, bold=True).save(OUT / "favicon-16.png")
render(180, WHITE, inset=0.12).convert("RGB").save(OUT / "apple-touch-icon.png")
render(192, WHITE, inset=0.12).save(OUT / "icon-192.png")
render(512, WHITE, inset=0.12).save(OUT / "icon-512.png")
render(512, WHITE, inset=0.20).save(OUT / "icon-512-maskable.png")
# .ico with the sizes browsers actually request
# .ico with the sizes browsers actually request; each size rendered on its own so the
# 16 px frame gets the bold geometry instead of a downscaled 48.
ico = render(48)
ico.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)],
         append_images=[render(16, bold=True), render(32)])

# Review sheet: how the mark reads at real sizes next to the real logo mark.
sheet = Image.new("RGB", (760, 300), "#F5F5F7")
d = ImageDraw.Draw(sheet)
x = 24
for size in (16, 32, 48, 64, 180):
    icon = render(size, bold=(size <= 16)) if size < 180 else render(size, WHITE, inset=0.12)
    sheet.paste(icon, (x, 150 - size // 2), icon)
    d.text((x, 240), f"{size}px", fill=CHARCOAL)
    x += size + 48
# the glossy mark at 32 px for comparison (this is what the current favicon looks like)
real = Image.open(ROOT / "_project-docs" / "brand" / "igen-mark-color-transparent.png").convert("RGBA")
real = real.crop(real.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
for size, dx in ((32, 0), (16, 56)):
    r = real.resize((size, size), Image.LANCZOS)
    sheet.paste(r, (x + dx, 150 - size // 2), r)
d.text((x, 240), "glossy mark @32/16 (today)", fill=CHARCOAL)
sheet.save(OUT / "_review-sheet.png")
print("favicon set written to", OUT)
