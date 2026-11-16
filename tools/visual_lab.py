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


def current_ink(im: Image.Image) -> Image.Image:
    """Replica del post-trattamento ink() usato dalla pipeline corrente."""
    a = np.array(im.convert("RGBA"), dtype=np.uint8)
    mask = a[..., 3] > 0
    neighbours = ndimage.convolve(mask.astype(np.int16), np.ones((3, 3), dtype=np.int16),
                                   mode="constant") - mask.astype(np.int16)
    a[mask & (neighbours <= 1), 3] = 0
    mask = a[..., 3] > 0
    edge = mask & ~ndimage.binary_erosion(mask)
    rgb = a[..., :3].astype(np.int16)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
    a[edge & (lum > 110) & ((mx - mn) < 80), :3] = (28, 20, 16)
    return Image.fromarray(a, "RGBA")

def downsample_box(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Ridimensionamento attuale della pipeline: BOX con alpha premoltiplicato."""
    a = np.array(im.convert("RGBA"), dtype=np.uint8).astype(float)
    a[..., :3] *= a[..., 3:4] / 255
    small = np.array(Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA").resize(
        size, Image.Resampling.BOX
    )).astype(float)
    alpha = small[..., 3]
    rgb = np.where(alpha[..., None] > 0,
                   small[..., :3] * 255 / np.maximum(alpha[..., None], 1), 0)
    out = np.dstack([rgb.clip(0, 255), (alpha > 120) * 255]).astype(np.uint8)
    return current_ink(Image.fromarray(out, "RGBA"))

def downsample_nearest(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    a = np.array(im.convert("RGBA").resize(size, Image.Resampling.NEAREST), dtype=np.uint8)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return current_ink(Image.fromarray(a, "RGBA"))

def downsample_dominant(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Un colore originale dominante per cella: niente nuovi colori interpolati."""
    src = np.array(im.convert("RGBA"), dtype=np.uint8)
    sh, sw = src.shape[:2]
    dw, dh = size
    out = np.zeros((dh, dw, 4), dtype=np.uint8)
    for y in range(dh):
        y0, y1 = int(y * sh / dh), max(int((y + 1) * sh / dh), int(y * sh / dh) + 1)
        for x in range(dw):
            x0, x1 = int(x * sw / dw), max(int((x + 1) * sw / dw), int(x * sw / dw) + 1)
            block = src[y0:y1, x0:x1]
            visible = block[block[..., 3] >= 128, :3]
            total = block[..., 3].size
            if len(visible) / max(1, total) < 0.45:
                continue
            colours, counts = np.unique(visible, axis=0, return_counts=True)
            out[y, x, :3] = colours[int(np.argmax(counts))]
            out[y, x, 3] = 255
    return current_ink(Image.fromarray(out, "RGBA"))

def make_downsample_methods_sheet():
    """Confronta tre metodi alla stessa altezza di gioco, senza cambiare gli originali."""
    font = ImageFont.load_default()
    files = ["hero_paolo/idle.png", "hero_mattia/idle.png",
             "hero_daniele/idle.png", "hero_marco/idle.png"]
    methods = [
        ("BOX — PIPELINE ATTUALE", downsample_box),
        ("NEAREST — PIXEL NETTI", downsample_nearest),
        ("DOMINANTE — PALETTE ORIGINALE", downsample_dominant),
    ]
    panel_w, row_h, label_w = 205, 215, 150
    sheet = Image.new("RGB", (label_w + panel_w * len(methods), row_h * len(files)),
                      (36, 38, 44))
    draw = ImageDraw.Draw(sheet)
    for j, (label, _) in enumerate(methods):
        draw.text((label_w + j * panel_w + 6, 6), label, fill=(255, 230, 150), font=font)
    for i, rel in enumerate(files):
        path = ROOT / "estratti" / rel
        if not path.exists():
            continue
        src = Image.open(path).convert("RGBA")
        # L'eroe viene portato a 54 px di gioco x 1,5 pixel per pixel di gioco = 81 px.
        h = max(1, int(round(54 * 1.5)))
        scale = h / src.height
        size = (max(1, int(round(src.width * scale))), h)
        y = i * row_h
        draw.text((8, y + 8), rel.replace("hero_", "").replace("/idle.png", ""),
                  fill=(240, 240, 240), font=font)
        for j, (_, fn) in enumerate(methods):
            result = fn(src, size)
            show = result.resize((result.width * 2, result.height * 2),
                                 Image.Resampling.NEAREST)
            bg = checker(show.size).convert("RGBA")
            bg.alpha_composite(show)
            x = label_w + j * panel_w + 6
            sheet.paste(bg.convert("RGB"), (x, y + 32))
    sheet.save(OUT / "hero_downsample_methods.png", optimize=True)

def main():
    make_sprite_sheet()
    make_background_sheet()
    make_crate_scale_preview()
    make_downsample_methods_sheet()
    print(f"Anteprime non distruttive generate in {OUT}/")

if __name__ == "__main__":
    main()
