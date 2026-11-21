#!/usr/bin/env python3
"""Prepares the plant icons for the app.

For every PNG/JPG/WEBP in the source folder:
  - if the background is not transparent, removes the uniform background
    (near-white or another solid color) connected to the edges
  - trims the empty margins, centers it on a square with a small margin
  - resizes to 512x512 and saves icons/<name>.webp

Usage:
  pip install pillow
  python3 scripts/prepara_icone.py icons/originali   # → icons/*.webp
"""
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

LATO = 512
MARGINE = 0.04  # 4% per side
TOLLERANZA = 28


def ha_trasparenza(img: Image.Image) -> bool:
    return img.mode == "RGBA" and img.getchannel("A").getextrema()[0] < 250


def rimuovi_sfondo(img: Image.Image, buchi: bool = False, tol: int = TOLLERANZA, punti=()) -> Image.Image:
    """Flood fill from the 4 corners: makes the uniform background transparent.
    With buchi=True it also clears enclosed areas of the same color (holes in leaves),
    but it would also erase white flowers: use it only when needed."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    segno = (255, 0, 255)
    sfondo = rgb.getpixel((0, 0))
    pieno = rgb.copy()
    # the 4 corners + any extra points (enclosed gaps to remove, in the original's pixels)
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), *punti]:
        if pieno.getpixel(xy) != segno:
            ImageDraw.floodfill(pieno, xy, segno, thresh=tol)
    diff = ImageChops.difference(pieno, Image.new("RGB", (w, h), segno)).convert("L")
    alpha = diff.point(lambda v: 255 if v > 0 else 0)
    if buchi:
        vicino = ImageChops.difference(rgb, Image.new("RGB", (w, h), sfondo)).convert("L")
        alpha = ImageChops.multiply(alpha, vicino.point(lambda v: 255 if v > tol // 2 else 0))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out


def prepara(src: Path, dest: Path, buchi: bool = False, tol: int = TOLLERANZA, punti=()):
    img = Image.open(src)
    img = img.convert("RGBA") if img.mode != "RGBA" else img
    if not ha_trasparenza(img):
        img = rimuovi_sfondo(img, buchi, tol, punti)
    bbox = img.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)
    lato = int(max(img.size) / (1 - 2 * MARGINE))
    quadro = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    quadro.paste(img, ((lato - img.width) // 2, (lato - img.height) // 2))
    quadro.resize((LATO, LATO), Image.LANCZOS).save(dest, "WEBP", quality=88, method=6)
    return dest.stat().st_size


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sorgente", type=Path, help="folder with the original icons, or a single file")
    ap.add_argument("--out", type=Path, default=Path("icons"))
    ap.add_argument("--buchi", action="store_true",
                    help="also clear enclosed background (holes in leaves); avoid with white flowers")
    ap.add_argument("--tolleranza", type=int, default=TOLLERANZA,
                    help=f"how far from the background color still counts as background (default {TOLLERANZA}); "
                         "lower it for white flowers on a white background")
    ap.add_argument("--punti", nargs="*", default=[], metavar="X,Y",
                    help="extra background points to remove (e.g. a white gap between stems), "
                         "in the original's pixels; an alternative to --buchi when there are white flowers")
    args = ap.parse_args()
    files = [args.sorgente] if args.sorgente.is_file() else sorted(
        p for p in args.sorgente.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    args.out.mkdir(parents=True, exist_ok=True)
    for f in files:
        dest = args.out / (f.stem + ".webp")
        if dest.resolve() == f.resolve():
            print(f"skip {f.name}: source and destination are the same file")
            continue
        punti = [tuple(int(v) for v in p.split(",")) for p in args.punti]
        kb = prepara(f, dest, args.buchi, args.tolleranza, punti) / 1024
        print(f"{f.name} → {dest} ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
