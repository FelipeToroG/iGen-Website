#!/usr/bin/env python3
"""
Work-sample image pipeline (optional dev tool; the site deploys without it).

Reads the originals from _project-docs/sample-work/ (gitignored: they contain window chrome,
customer names and old branding) and writes cropped, resized web copies to img/work/ as
AVIF + WebP + JPEG at two widths. Width/height of each output are printed so the <img> tags
can carry real dimensions.

Why crops live here and not in an editor: the crop boxes are the privacy step (customer name
in a title bar, a license banner), so they must be reproducible and reviewable.

Usage:
  python3 tools/images.py            # build everything into img/work/
  python3 tools/images.py --sheet /path/contact-sheet.jpg   # also render a review sheet

Needs Pillow >= 10 with AVIF support (Pillow 12 ships it). No other dependencies.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_project-docs" / "sample-work"
OUT = ROOT / "img" / "work"

WIDTHS = (800, 1600)        # 1600 is skipped when the source is narrower (no upscaling)
JPEG_QUALITY = 82
WEBP_QUALITY = 80
AVIF_QUALITY = 60

# (source file, output slug, crop box as (left, top, right, bottom) or None, paint-outs)
# paint-outs: boxes filled with white to remove old branding from a white page. Crop boxes
# were chosen by eye on the originals; see the review sheet before committing.
MANIFEST = [
    # AutoCAD: drop the tab bar (customer surname), toolbars, command line and the old logo.
    ("Sample 1 - LT55 Drawing.png", "lt55-drawing", (180, 75, 1395, 590), ()),
    # Shop PDF as rendered: template placeholders only; the old logo top-left is painted out.
    ("Sample 1 - LT55 Layout.jpg", "lt55-shop-pdf", None, ((40, 25, 200, 150),)),
    # Alphacam Fusion, L-shaped top with seams.
    ("FUSION.jpeg", "fusion-l-shape", None, ()),
    # Alphacam Fusion, island + strips. Top 12 px is a remote-desktop license banner.
    ("Fusion 2.jpeg", "fusion-island", (0, 12, 1024, 532), ()),
    # Slabsmith Perfect Match layout on the slab photo.
    ("Slabsmith.jpeg", "slabsmith-layout", None, ()),
    # Titan CNC toolpaths; the first 20 px are a clipped toolbar.
    ("Titan.png", "titan-toolpaths", (0, 20, 1776, 788), ()),
    # Video poster frames, extracted by tools/video.sh into sample-work/posters/.
    ("posters/cnc-programming.png", "poster-cnc-programming", None, ()),
    ("posters/slab-layout-3d.png", "poster-slab-layout-3d", None, ()),
]


def flatten(im: Image.Image) -> Image.Image:
    """Screenshots with alpha get a white matte; JPEG/AVIF outputs want RGB."""
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def build(sheet_path: str | None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for src_name, slug, box, paint in MANIFEST:
        src = SRC / src_name
        if not src.exists():
            print(f"missing: {src}", file=sys.stderr)
            continue
        im = flatten(Image.open(src))
        for pbox in paint:
            ImageDraw.Draw(im).rectangle(pbox, fill=(255, 255, 255))
        if box:
            im = im.crop(box)
        w0, h0 = im.size
        for w in WIDTHS:
            if w > w0 and w != WIDTHS[0]:
                continue
            target_w = min(w, w0)
            h = round(h0 * target_w / w0)
            out = im.resize((target_w, h), Image.LANCZOS) if target_w != w0 else im
            base = OUT / f"{slug}-{w}"
            out.save(base.with_suffix(".jpg"), "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            out.save(base.with_suffix(".webp"), "WEBP", quality=WEBP_QUALITY, method=6)
            out.save(base.with_suffix(".avif"), "AVIF", quality=AVIF_QUALITY)
            sizes = {ext: (base.with_suffix(ext)).stat().st_size // 1024 for ext in (".jpg", ".webp", ".avif")}
            print(f"{slug}-{w}: {target_w}x{h}  jpg {sizes['.jpg']} KB  webp {sizes['.webp']} KB  avif {sizes['.avif']} KB")
        results.append((slug, im))

    if sheet_path:
        tile_w, pad = 700, 24
        tiles = []
        for slug, im in results:
            t = im.copy()
            t.thumbnail((tile_w, 10_000))
            tiles.append((slug, t))
        cols = 2
        rows = (len(tiles) + cols - 1) // cols
        row_h = [max(t.size[1] for _, t in tiles[r * cols:(r + 1) * cols]) for r in range(rows)]
        sheet = Image.new("RGB", (cols * (tile_w + pad) + pad, sum(row_h) + rows * (pad + 28) + pad), (245, 245, 247))
        d = ImageDraw.Draw(sheet)
        y = pad
        for r in range(rows):
            for c, (slug, t) in enumerate(tiles[r * cols:(r + 1) * cols]):
                x = pad + c * (tile_w + pad)
                d.text((x, y), slug, fill=(44, 44, 44))
                sheet.paste(t, (x, y + 28))
            y += row_h[r] + pad + 28
        sheet.save(sheet_path, "JPEG", quality=85)
        print(f"review sheet: {sheet_path}")


if __name__ == "__main__":
    sheet = None
    if "--sheet" in sys.argv:
        sheet = sys.argv[sys.argv.index("--sheet") + 1]
    build(sheet)
