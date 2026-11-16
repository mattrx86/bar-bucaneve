"""Estrazione fotogrammi dai fogli sprite: sfondo, aloni chiari, raggruppamento in righe."""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

def load_mask(path, mode):
    a = np.array(Image.open(path).convert('RGBA')).astype(int)
    rgb = a[..., :3]; mx, mn = rgb.max(2), rgb.min(2)
    if mode == 'alpha':
        fg = a[..., 3] >= 128
    else:
        if mode == 'black': cand = mx <= 18
        elif mode == 'white': cand = (mn >= 232) & ((mx - mn) < 14)
        full = cand
        if mode == 'black':
            # parti nere del disegno (occhiali, capelli) toccano lo sfondo attraverso fessure sottili
            # del contorno: chiudiamo le fessure (apertura di 3 px) prima di riempire dal bordo
            cand = nd.binary_opening(cand, iterations=3)
        lab, n = nd.label(cand)
        sizes = nd.sum(cand, lab, range(1, n + 1))
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        keep = np.zeros(n + 1, bool)
        for i, s in enumerate(sizes, 1):
            if i in border or (s > 400 and mode != 'black'): keep[i] = True
        bg = keep[lab]
        if mode == 'black': bg = nd.binary_dilation(bg, iterations=3) & full  # ripristina il bordo
        fg = ~bg
    fg = nd.binary_opening(fg, iterations=1)
    a[..., 3] = fg * 255
    return a

def peel(a, rounds=6):
    """Toglie gli aloni chiari: pixel di bordo chiari e poco saturi (i contorni veri sono scuri)."""
    a = a.copy()
    for _ in range(rounds):
        m = a[..., 3] > 0
        edge = m & ~nd.binary_erosion(m)
        rgb = a[..., :3]; mx, mn = rgb.max(2), rgb.min(2)
        lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
        bad = edge & (lum > 120) & ((mx - mn) < 80)
        if not bad.any(): break
        a[bad, 3] = 0
    m = a[..., 3] > 0
    nb = nd.convolve(m.astype(int), np.ones((3, 3)), mode='constant') - m
    a[m & (nb <= 1), 3] = 0
    return a

def ink(a, col=(28, 20, 16), erodi=False):
    """Dopo la riduzione: i pixel di bordo chiari e poco saturi (contorno scuro mescolato
    col vestito bianco, o resti d'alone) diventano contorno scuro invece di essere tolti.
    Toglierli (peel) lasciava i bordi frastagliati e puntini bianchi attorno alle figure."""
    a = a.copy(); m = a[..., 3] > 0
    if erodi:  # toglie il bordo esterno (resti dell'alone lasciato dallo scontornamento)
        a[m & ~nd.binary_erosion(m), 3] = 0; m = a[..., 3] > 0
    nb = nd.convolve(m.astype(int), np.ones((3, 3)), mode='constant') - m
    a[m & (nb <= 1), 3] = 0; m = a[..., 3] > 0   # pixel isolati
    edge = m & ~nd.binary_erosion(m)
    rgb = a[..., :3].astype(int); mx, mn = rgb.max(2), rgb.min(2)
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
    a[edge & (lum > 110) & ((mx - mn) < 80), :3] = col
    return a

def components(a, dil=12, minpx=500):
    fg = a[..., 3] > 0
    grp, n = nd.label(nd.binary_dilation(fg, iterations=dil))
    out = []
    for i, sl in enumerate(nd.find_objects(grp), 1):
        m = (grp[sl] == i) & fg[sl]
        if m.sum() < minpx: continue
        ys, xs = np.where(m)
        y0, y1, x0, x1 = sl[0].start + ys.min(), sl[0].start + ys.max() + 1, sl[1].start + xs.min(), sl[1].start + xs.max() + 1
        crop = a[y0:y1, x0:x1].copy()
        mm = ((grp[y0:y1, x0:x1] == i) & fg[y0:y1, x0:x1])
        crop[~mm, 3] = 0
        out.append(dict(y0=y0, y1=y1, x0=x0, x1=x1, img=crop.astype(np.uint8)))
    return out

def rows(comps, gap=0.35):
    """Righe = fasce orizzontali separate da spazio vuoto (proiezione sui y)."""
    if not comps: return []
    H = max(c['y1'] for c in comps) + 1
    occ = np.zeros(H, int)
    for c in comps:
        prof = (c['img'][..., 3] > 0).sum(1) > 0
        occ[c['y0']:c['y1']] += prof
    bands = []; inb = False
    for y in range(H):
        if occ[y] and not inb: start = y; inb = True
        if not occ[y] and inb: bands.append((start, y)); inb = False
    if inb: bands.append((start, H))
    # unisci fasce separate da meno di 6 px
    mb = []
    for b in bands:
        if mb and b[0] - mb[-1][1] < 6: mb[-1] = (mb[-1][0], b[1])
        else: mb.append(b)
    R = [[] for _ in mb]
    for c in comps:
        cy = (c['y0'] + c['y1']) / 2
        k = min(range(len(mb)), key=lambda i: 0 if mb[i][0] <= cy < mb[i][1] else min(abs(cy - mb[i][0]), abs(cy - mb[i][1])))
        R[k].append(c)
    out = []
    for r in R:
        if not r: continue
        r = sorted(r, key=lambda c: c['x0'])
        areas = [int((c['img'][..., 3] > 0).sum()) for c in r]
        med = float(np.median(areas))
        big = [c for c, ar in zip(r, areas) if ar >= 0.18 * med]
        for c, ar in zip(r, areas):
            if ar >= 0.18 * med: continue
            def gap(b):
                return max(b['x0'] - c['x1'], c['x0'] - b['x1'], 0) + 0.3 * abs((b['y0']+b['y1'])/2 - (c['y0']+c['y1'])/2)
            t = min(big, key=gap)
            merge(t, c)
        out.append(big)
    return out

def merge(t, c):
    y0, y1 = min(t['y0'], c['y0']), max(t['y1'], c['y1']); x0, x1 = min(t['x0'], c['x0']), max(t['x1'], c['x1'])
    im = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for s in (t, c):
        sub = im[s['y0']-y0:s['y1']-y0, s['x0']-x0:s['x1']-x0]
        m = s['img'][..., 3] > 0
        sub[m] = s['img'][m]
    t.update(y0=y0, y1=y1, x0=x0, x1=x1, img=im)

def rows_old(comps, gap=0.35):
    comps = sorted(comps, key=lambda c: (c['y0'] + c['y1']) / 2)
    R = []
    for c in comps:
        cy = (c['y0'] + c['y1']) / 2; h = c['y1'] - c['y0']
        if R:
            last = R[-1]; ly = np.mean([(d['y0'] + d['y1']) / 2 for d in last])
            if abs(cy - ly) < max(40, h * gap): last.append(c); continue
        R.append([c])
    return [sorted(r, key=lambda c: c['x0']) for r in R]

def peel_dark(a, rounds=7):
    """Per i fogli su nero: toglie l'alone grigio scuro attorno alla figura."""
    a = a.copy()
    for _ in range(rounds):
        m = a[..., 3] > 0
        edge = m & ~nd.binary_erosion(m)
        rgb = a[..., :3].astype(int); mx, mn = rgb.max(2), rgb.min(2)
        lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
        bad = edge & ((mx - mn) < 38) & (lum < 115)
        if not bad.any(): break
        a[bad, 3] = 0
    return a

def outline(a, col=(28, 20, 16)):
    """Contorno netto di 1 pixel attorno alla figura (dopo la riduzione)."""
    a = a.copy()
    m = a[..., 3] > 0
    edge = m & ~nd.binary_erosion(m)
    rgb = a[..., :3].astype(int)
    glow = edge & ((rgb.max(2) - rgb.min(2)) < 45)
    a[glow, :3] = col
    ring = nd.binary_dilation(m, structure=np.array([[0,1,0],[1,1,1],[0,1,0]])) & ~m
    a[ring, :3] = col; a[ring, 3] = 255
    return a

def despeckle(a, minpx=4):
    a = a.copy(); m = a[..., 3] > 0
    lab, n = nd.label(m)
    if n:
        sz = nd.sum(m, lab, range(1, n + 1))
        for i, z in enumerate(sz, 1):
            if z < minpx: a[lab == i, 3] = 0
    return a

# ---------------------------------------------------------------------------
# Fotogrammi singoli: ESTRATTI (generati, da usare come base per ritoccare) e RITOCCHI (vostri).
#   estratti/<foglio>/<posa>.png         ogni posa ritagliata e pulita, alla risoluzione originale
#   grafica/ritocchi/<foglio>/<posa>.png se esiste, sostituisce quella posa nel gioco
# Il ritocco deve avere la STESSA tela dell'estratto (stessa larghezza/altezza, piedi in basso),
# sfondo trasparente, personaggio rivolto a destra.
# ---------------------------------------------------------------------------
import os as _os
from PIL import Image as _Image

def estrai_o_ritocca(gruppo, nome, img):
    rit = _os.path.join('grafica', 'ritocchi', gruppo, nome + '.png')
    if _os.path.exists(rit):
        r = np.array(_Image.open(rit).convert('RGBA'))
        r[..., 3] = np.where(r[..., 3] >= 128, 255, 0)
        return r, True
    out = _os.path.join('estratti', gruppo); _os.makedirs(out, exist_ok=True)
    _Image.fromarray(img.astype(np.uint8), 'RGBA').save(_os.path.join(out, nome + '.png'), optimize=True)
    return img, False
