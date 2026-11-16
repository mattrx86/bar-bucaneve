#!/usr/bin/env python3
"""Crea tavole di prova non distruttive per la coerenza visiva di BUCA SLUG.

Legge gli estratti originali, non modifica alcun file sorgente e salva soltanto
anteprime in visual-preview/. La correzione bordi conserva tela e maschera alpha.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from scipy import ndimage

ROOT = Path(".")
OUT = ROOT / "visual-preview"
OUT.mkdir(exist_ok=True)

SAMPLES = [
    "hero_paolo/idle.png",
    "hero_mattia/idle.png",
    "hero_daniele/idle.png",
    "hero_marco/idle.png",
    "boss_ettore/tele_02.png",
    "armi/cassa_fucile.png",
    "armi/boom_3.png",
]
BACKGROUND_SAMPLES = [
    "grafica/livello1-strada/fondali/1.png",
    "grafica/livello2-bucaneve/fondale/esterno.png",
    "grafica/livello3-cantina/fondale/cantina.png",
]

def checker(size: tuple[int, int], cell: int = 8) -> Image.Image:
    w, h = size
    yy, xx = np.indices((h, w))
    a = ((xx // cell + yy // cell) % 2 == 0)
    arr = np.empty((h, w, 3), dtype=np.uint8)
    arr[a] = (185, 185, 185)
    arr[~a] = (225, 225, 225)
    return Image.fromarray(arr, "RGB")

def composite_checker(im: Image.Image) -> Image.Image:
    base = checker(im.size).convert("RGBA")
    base.alpha_composite(im.convert("RGBA"))
    return base.convert("RGB")

def clean_edge_candidate(im: Image.Image, saturation_min: int = 75,
                         contrast_min: int = 92, luminance_min: int = 68):
    """Scurisce soltanto pixel di bordo con alone cromatico anomalo.

    - dimensioni, posizione e alpha sono preservati esattamente;
    - nessun pixel interno viene toccato;
    - nessuna dilatazione/erosione della silhouette;
    - un pixel viene trattato solo se differisce nettamente dai colori interni
      vicini e presenta saturazione/luminanza tipiche di una frangia colorata.
    """
    arr = np.array(im.convert("RGBA"), dtype=np.uint8)
    rgb = arr[..., :3].astype(np.int16)
    mask = arr[..., 3] >= 128
    inner = ndimage.binary_erosion(mask, structure=np.ones((3, 3), dtype=bool))
    edge = mask & ~inner
    changed = np.zeros(mask.shape, dtype=bool)
    ys, xs = np.where(edge)
    h, w = mask.shape
    for y, x in zip(ys.tolist(), xs.tolist()):
        y0, y1 = max(0, y - 2), min(h, y + 3)
        x0, x1 = max(0, x - 2), min(w, x + 3)
        local_mask = inner[y0:y1, x0:x1]
        if not local_mask.any():
            continue
        local_rgb = rgb[y0:y1, x0:x1][local_mask]
        med = np.median(local_rgb, axis=0)
        px = rgb[y, x]
        mx, mn = int(px.max()), int(px.min())
        sat = mx - mn
        lum = int(0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2])
        contrast = int(np.max(np.abs(px - med)))
        if sat >= saturation_min and contrast >= contrast_min and lum >= luminance_min:
            arr[y, x, :3] = (30, 24, 22)  # contorno caldo, non nero puro
            changed[y, x] = True
    return Image.fromarray(arr, "RGBA"), int(changed.sum())

def fit(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    im = im.copy()
    im.thumbnail((max_w, max_h), Image.Resampling.NEAREST)
    return im

def paste_sprite(canvas: Image.Image, im: Image.Image, x: int, y: int,
                 max_w: int = 250, max_h: int = 210) -> tuple[int, int]:
    # Upscale soltanto per la tavola di confronto; il file candidato resta nativo.
    scale = min(max_w / im.width, max_h / im.height, 3.0)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    show = im.resize((nw, nh), Image.Resampling.NEAREST)
    bg = checker(show.size).convert("RGBA")
    bg.alpha_composite(show.convert("RGBA"))
    canvas.paste(bg.convert("RGB"), (x, y))
    return nw, nh

def make_sprite_sheet():
    font = ImageFont.load_default()
    cell_w, cell_h, label_h = 560, 255, 26
    existing = []
    report = []
    changes_by_file = {}
    for rel in SAMPLES:
        path = ROOT / "estratti" / rel
        if not path.exists():
            report.append({"file": rel, "status": "missing"})
            continue
        original = Image.open(path).convert("RGBA")
        candidate, count = clean_edge_candidate(original)
        # Seconda vista più conservativa per confrontare quanto il criterio tocchi i bordi.
        mild, mild_count = clean_edge_candidate(
            original, saturation_min=105, contrast_min=125, luminance_min=82
        )
        report.append({
            "file": rel,
            "status": "ok",
            "canvas": list(original.size),
            "alpha_pixels": int((np.array(original)[..., 3] > 0).sum()),
            "edge_pixels_changed_moderate": count,
            "edge_pixels_changed_conservative": mild_count,
            "alpha_identical": bool(np.array_equal(
                np.array(original)[..., 3], np.array(candidate)[..., 3]
            )),
            "canvas_identical": original.size == candidate.size,
        })
        existing.append((rel, original, candidate))
        changes_by_file[rel] = count
    rows = max(1, len(existing))
    sheet = Image.new("RGB", (cell_w, rows * cell_h), (38, 40, 46))
    draw = ImageDraw.Draw(sheet)
    for i, (rel, original, candidate) in enumerate(existing):
        y = i * cell_h
        draw.text((8, y + 6), rel, fill=(255, 230, 150), font=font)
        draw.text((8, y + 34), "ORIGINALE", fill=(240, 240, 240), font=font)
        draw.text((cell_w // 2 + 8, y + 34), "PROVA CONTORNO", fill=(240, 240, 240), font=font)
        max_w, max_h = 260, 190
        paste_sprite(sheet, original, 8, y + 52, max_w, max_h)
        paste_sprite(sheet, candidate, cell_w // 2 + 8, y + 52, max_w, max_h)
        draw.text((8, y + 235), f"Pixel di bordo ritoccati nella prova: {changes_by_file[rel]}",
                  fill=(190, 210, 220), font=font)
    sheet.save(OUT / "sprites_before_after.png", optimize=True)
    (OUT / "sprites_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

def make_background_sheet():
    font = ImageFont.load_default()
    w, h, label_h = 640, 230, 24
    entries = []
    for rel in BACKGROUND_SAMPLES:
        path = ROOT / rel
        if not path.exists():
            continue
        original = Image.open(path).convert("RGB")
        # Grading preliminare, deliberatamente leggero: non cambia composizione o dettagli.
        candidate = ImageEnhance.Color(original).enhance(0.91)
        candidate = ImageEnhance.Contrast(candidate).enhance(0.94)
        candidate = ImageEnhance.Brightness(candidate).enhance(0.98)
        entries.append((rel, original, candidate))
    sheet = Image.new("RGB", (w, max(1, len(entries)) * h), (36, 38, 44))
    draw = ImageDraw.Draw(sheet)
    for i, (rel, original, candidate) in enumerate(entries):
        y = i * h
        draw.text((8, y + 5), rel, fill=(255, 230, 150), font=font)
        a = fit(original, 300, h - 38)
        b = fit(candidate, 300, h - 38)
        sheet.paste(a, (8, y + 28))
        sheet.paste(b, (325, y + 28))
        draw.text((8, y + h - 14), "ORIGINALE", fill=(240, 240, 240), font=font)
        draw.text((325, y + h - 14), "GRADING LEGGERO", fill=(240, 240, 240), font=font)
    sheet.save(OUT / "background_grade_preview.jpg", quality=92)

def make_crate_scale_preview():
    path = ROOT / "estratti/armi/cassa_fucile.png"
    if not path.exists():
        return
    im = Image.open(path).convert("RGBA")
    scale = 1.32
    nw, nh = round(im.width * scale), round(im.height * scale)
    big = im.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGB", (640, max(220, nh + 60)), (40, 42, 48))
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 8), "CASSA ARMA — CONFRONTO SCALA", fill=(255, 230, 150))
    draw.text((10, 30), "Originale", fill=(240, 240, 240))
    draw.text((330, 30), "+32% (nearest-neighbour)", fill=(240, 240, 240))
    paste_sprite(canvas, im, 10, 55, 280, 150)
    # Mostra l'ingrandimento senza sfumature; non altera il PNG sorgente.
    bg = checker(big.size).convert("RGBA")
    bg.alpha_composite(big)
    canvas.paste(bg.convert("RGB"), (330, 55))
    canvas.save(OUT / "crate_scale_preview.png", optimize=True)

def main():
    make_sprite_sheet()
    make_background_sheet()
    make_crate_scale_preview()
    print(f"Anteprime non distruttive generate in {OUT}/")

if __name__ == "__main__":
    main()
