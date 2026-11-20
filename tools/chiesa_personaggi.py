"""HOLY SLUG - personaggi della chiesa: dai fogli originali (progetto-chiesa/characters/) ai fogli del gioco.

Non ridisegna nessuno: ritaglia le pose dai riferimenti caricati, toglie lo sfondo, riduce a pixel netti
alla densita' del gioco (1.5) e aggiunge lo stesso contorno nero degli altri personaggi.
Usato da tools/build_chiesa.py; le funzioni restituiscono dizionari pronti per src/content/chiesa.ts.
"""
import os, glob
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from sheet import load_mask, peel, components, rows, outline, ink

D = 1.5  # densita': pixel di texture per pixel di gioco (uguale a tutto il resto del gioco)


def modo(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    if (im[..., 3] < 128).mean() > 0.2: return 'alpha'
    c = np.concatenate([im[:4, :4, :3].reshape(-1, 3), im[-4:, -4:, :3].reshape(-1, 3)]).mean(0)
    return 'black' if c.mean() < 60 else 'white'


def maschera(path):
    m = modo(path); a = load_mask(path, m)
    if m != 'black': a = peel(a)
    return a.astype(np.uint8)


def righe(path, attese):
    """Pose raggruppate per riga. Prova dilatazioni crescenti finche' il numero di pose per riga e' quello atteso."""
    a = maschera(path)
    for dil in (2, 3, 4, 6, 8):
        R = rows(components(a, dil=dil, minpx=150))
        if [len(r) for r in R] == attese: return R
    raise SystemExit(f'{os.path.basename(path)}: pose per riga diverse da {attese}')


def tieni_corpo(img, quota=0.08):
    """Toglie i pezzi staccati piccoli (gocce, segni di movimento): resta il corpo e cio' che vi e' attaccato."""
    al = img[..., 3] > 0
    lab, n = nd.label(nd.binary_dilation(al, iterations=1), structure=np.ones((3, 3)))
    if n <= 1: return img
    sz = nd.sum(al, lab, range(1, n + 1)); keep = np.zeros(n + 1, bool)
    keep[1:] = sz >= sz.max() * quota
    out = img.copy(); out[~keep[lab] & al, 3] = 0
    return out


def dividi(c, parti=2):
    """Due pose che si toccano (il rosario di una entra nella successiva): taglio sulla colonna piu' vuota."""
    im = c['img']; w = im.shape[1]; col = (im[..., 3] > 0).sum(0)
    out = []; x0 = 0
    for k in range(1, parti):
        lo, hi = int(w * (k / parti - 0.15)), int(w * (k / parti + 0.15))
        x = lo + int(np.argmin(col[lo:hi]))
        out.append(im[:, x0:x].copy()); x0 = x
    out.append(im[:, x0:].copy())
    return out


def a_pixel(img, s):
    """Riduzione a pixel netti (NEAREST) e alpha binario, come tools/build_assets.py."""
    h, w = img.shape[:2]
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    out = np.array(Image.fromarray(img.astype(np.uint8), 'RGBA').resize((nw, nh), Image.Resampling.NEAREST))
    vis = out[..., 3] > 120
    out[..., 3] = vis * 255; out[~vis, :3] = 0
    return out


def con_contorno(sm):
    sm = np.pad(sm, ((1, 1), (1, 1), (0, 0)))
    return outline(sm, col=(6, 6, 8))


def rifila(sm):
    ys, xs = np.where(sm[..., 3] > 0)
    return sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def altezza(img):
    return int((img[..., 3] > 0).any(1).sum())


def impacca(frames, b64png, anteprima=None, esporta=None):
    """frames: lista (nome, immagine gia' ridotta). Celle uguali, piedi sulla stessa riga, centrate sui piedi."""
    fr = {}
    for n, sm in frames:
        sm = rifila(sm); m = sm[..., 3] > 0; h = sm.shape[0]
        low = m[int(h * 0.75):]
        cx = np.where(low)[1].mean() if low.any() else sm.shape[1] / 2
        fr[n] = (sm, cx)
    half = max(max(int(np.ceil(cx)) + 2, int(np.ceil(sm.shape[1] - cx)) + 2) for sm, cx in fr.values())
    cw = 2 * half; ch = max(sm.shape[0] for sm, _ in fr.values()) + 3; foot = ch - 2
    names = [n for n, _ in frames]
    cols = max(1, min(len(names), 4000 // cw)); nrow = -(-len(names) // cols)
    strip = Image.new('RGBA', (cw * cols, ch * nrow))
    for i, n in enumerate(names):
        sm, cx = fr[n]
        strip.alpha_composite(Image.fromarray(sm), ((i % cols) * cw + int(round(half - cx)), (i // cols) * ch + foot - sm.shape[0]))
    if esporta: strip.save(esporta)
    if anteprima:
        pv = Image.new('RGBA', strip.size, (70, 78, 92, 255)); pv.alpha_composite(strip); pv.save(anteprima)
    return dict(data=b64png(strip), cw=cw, ch=ch, foot=foot, d=D, frames=names, muzzle={})


def piccolo(img, larghezza_gioco, b64png, contorno=True):
    """Proiettile o oggetto: ridotto a una larghezza in pixel di gioco."""
    img = rifila(img)
    sm = a_pixel(img, larghezza_gioco * D / img.shape[1])
    if contorno: sm = con_contorno(sm)
    sm = rifila(sm)
    return dict(data=b64png(Image.fromarray(sm)), w=round(sm.shape[1] / D, 1), h=round(sm.shape[0] / D, 1), d=D)


# ---------------------------------------------------------------------------
# Nemici piccoli: chierichetti e suore (stessa impaginazione: 12 / 11 / 8 pose per riga;
# la suora blu ha due pose d'attacco fuse in una, quindi 10 nella seconda riga).
# ---------------------------------------------------------------------------
def nemico(path, altezza_gioco, fuse=False):
    R = righe(path, [12, 10, 8] if fuse else [12, 11, 8])
    r0, r1, r2 = [[c['img'] for c in r] for r in R]
    if fuse: att, proj = [r1[1], r1[2], r1[3]], r1[5]
    else: att, proj = [r1[1], r1[3], r1[5]], r1[6]
    s = altezza_gioco * D / altezza(r0[0])
    pose = [('walk_01', r0[4]), ('walk_02', r0[5]), ('walk_03', r0[6]), ('walk_04', r0[7]), ('walk_05', r0[8]), ('walk_06', r0[9]),
            ('attack_01', att[0]), ('attack_02', att[1]), ('attack_03', att[2]),
            ('hit', r2[0]), ('death_01', r2[2]), ('death_02', r2[4]), ('death_03', r2[7]), ('idle', r0[0])]
    return [(n, con_contorno(a_pixel(tieni_corpo(im, 0.05), s))) for n, im in pose], proj


def griso(path, altezza_gioco=68):
    R = righe(path, [9, 10])
    r0, r1 = [[c['img'] for c in r] for r in R]
    w1, w2 = dividi(R[0][7])
    s = altezza_gioco * D / altezza(r0[0])
    # Nella posa "frusta_03" il rosario e' gia' in volo, staccato dalla mano: se restasse nella posa
    # sembrerebbe congelato a mezz'aria. Si separa: il corpo resta nella posa, il rosario diventa il
    # proiettile, e si annota dove si trova rispetto ai piedi (pixel di gioco) per farlo partire da li'.
    f3 = r0[8]; al = f3[..., 3] > 0
    lab, n = nd.label(nd.binary_dilation(al, iterations=2), structure=np.ones((3, 3)))
    sz = nd.sum(al, lab, range(1, n + 1)); corpo = lab == (1 + int(np.argmax(sz)))
    corpo_img = f3.copy(); corpo_img[~corpo & al, 3] = 0
    ros_img = f3.copy(); ros_img[corpo | ~al, 3] = 0
    cm = corpo & al; ys, xs = np.where(cm); piede_y = ys.max(); basso = cm[int(ys.min() + (piede_y - ys.min()) * 0.75):]
    cx = np.where(basso)[1].mean()
    ry, rx = np.where(ros_img[..., 3] > 0)
    rosario_off = (round((rx.mean() - cx) * s / D, 1), round((ry.mean() - piede_y) * s / D, 1))
    r0 = list(r0); r0[8] = corpo_img
    pose = [('idle', r0[0]), ('idle_02', r0[1]), ('walk_01', r0[2]), ('walk_02', r0[3]), ('walk_03', r0[4]), ('walk_04', r0[5]),
            ('pugni', r0[6]), ('frusta_01', w1), ('frusta_02', w2), ('frusta_03', r0[8]),
            ('bibbia_01', r1[0]), ('bibbia_02', r1[1]), ('bibbia_03', r1[2]), ('bibbia_04', r1[3]),
            ('hit', r1[5]), ('recupero_01', r1[6]), ('recupero_02', r1[7])]
    return [(n, con_contorno(a_pixel(tieni_corpo(im, 0.04), s))) for n, im in pose], r1[4], ros_img, rosario_off


def don_antonio(cartella, altezza_gioco=80):
    fogli = sorted(glob.glob(os.path.join(cartella, '*.jpeg')))
    principale = [f for f in fogli if '10.40.01' in f][0]
    R = righe(principale, [5, 5, 4, 3])
    r0, r1, r2, r3 = [[c['img'] for c in r] for r in R]
    s = altezza_gioco * D / altezza(r0[0])
    pose = [('idle', r0[0]), ('walk_01', r0[1]), ('walk_02', r0[2]), ('walk_03', r0[3]), ('walk_04', r0[4]),
            ('intinge_01', r1[2]), ('intinge_02', r1[3]), ('alza', r1[1]), ('asperge_01', r2[0]), ('asperge_02', r2[1]),
            ('hit', r2[2]), ('death_01', r2[3]), ('death_02', r3[0]), ('death_03', r3[1]), ('death_04', r3[2])]
    out = [(n, con_contorno(a_pixel(tieni_corpo(im, 0.08), s))) for n, im in pose]
    # Le pose con la teglia di lasagne sono immagini singole (una posa per file) a una scala propria:
    # la scala si prende dalla posa eretta con la teglia al petto, alta quanto Don Antonio in piedi.
    L = {}
    for f in fogli:
        if f == principale: continue
        k = os.path.basename(f).split('PM')[1].split('.')[0].strip('()') or '0'
        a = maschera(f); ys, xs = np.where(a[..., 3] > 0)
        L[k] = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sl = altezza_gioco * 1.04 * D / altezza(L['3'])
    lasagna_pose = [('lasagna_basso', L['2'], 0.08), ('lasagna_petto', L['3'], 0.08), ('lasagna_alza', L['1'], 0.08),
                    ('lasagna_alto', L['0'], 0.08), ('lasagna_china', L['4'], 0.08),
                    ('schianto_01', L['7'], 0.0), ('schianto_02', L['8'], 0.0)]
    out += [(n, con_contorno(a_pixel(tieni_corpo(im, q) if q else im, sl))) for n, im, q in lasagna_pose]
    # la teglia (proiettile): dalla posa con la teglia sopra la testa, togliendo le mani
    t = L['1']; h = t.shape[0]
    al = t[..., 3] > 0; rgb = t[..., :3].astype(int)
    y1 = int(h * 0.155)                  # la teglia occupa la fascia piu' alta della posa
    teglia = t[:y1, int(t.shape[1] * 0.17):int(t.shape[1] * 0.87)].copy()
    rgb = rgb[:y1, int(t.shape[1] * 0.17):int(t.shape[1] * 0.87)]
    pelle = (rgb[:, :, 0] > 150) & (rgb[..., 0] - rgb[..., 2] > 45) & (rgb[..., 1] > 95) & (rgb[..., 1] < 200) & (abs(rgb[..., 1] - rgb[..., 2]) < 60)
    teglia[pelle, 3] = 0
    teglia = tieni_corpo(teglia, 0.3)
    return out, teglia


def goccia():
    """Goccia d'acqua santa: 4x6 pixel disegnati (non e' un personaggio)."""
    g = np.zeros((7, 5, 4), np.uint8)
    pal = {'o': (20, 40, 90, 255), 'b': (90, 170, 240, 255), 'c': (200, 240, 255, 255)}
    rig = ['..o..', '.obo.', '.obo.', 'obcbo', 'obbbo', 'obbbo', '.ooo.']
    for y, r in enumerate(rig):
        for x, ch in enumerate(r):
            if ch in pal: g[y, x] = pal[ch]
    return g
