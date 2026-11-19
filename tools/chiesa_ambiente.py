"""HOLY SLUG - la chiesa gotica: fondali a strati (parallasse), luci e oggetti.

Parte dai moduli SVG di progetto-chiesa/ (portale, rosone, altare, panche, candelabri, fiamme, piastrelle,
stendardo...): li rasterizza con rsvg-convert senza antialiasing, ritaglia i gruppi per id e li riporta alla
densita' del gioco (1.5 pixel di texture per pixel di gioco). Gli SVG sono a tinte piatte: qui ricevono la
"pittura" a pixel (blocchi di pietra con giunti, rilievo luce/ombra, retinatura ordinata, fuliggine, crepe)
per stare accanto ai fondali dipinti di Buca Slug. Nulla viene disegnato sopra i personaggi originali.

Livello (pixel di gioco, terreno a y=180):
   0 - 430   ingresso: controfacciata con il portale monumentale (portone che si apre all'inizio)
 430 - 2716  navata: campate da 256 px con pilastri e archi a sesto acuto; attraverso gli archi si vede
             la parete con le vetrate, che scorre piu' lenta (parallasse)
2716 - 3100  arena: abside con il grande rosone, l'altare, i candelabri
"""
import os, subprocess, tempfile, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

D = 1.5
W_GIOCO, H_GIOCO, TERRA = 3100, 216, 180
ARENA_X = W_GIOCO - 384
INGRESSO = 430
CAMPATA = 256
PILASTRI = list(range(INGRESSO + 82, ARENA_X - 40, CAMPATA))   # x (gioco) dei pilastri della navata
K_LONTANO, K_PRIMO = 0.5, 1.15
ROSONE_Y = 10
RNG = np.random.default_rng(1307)

PAL = dict(
    notte=(10, 12, 20), malta=(14, 13, 20), p0=(24, 22, 32), p1=(33, 30, 43), p2=(43, 40, 55), p3=(55, 51, 68),
    p4=(70, 65, 84), p5=(92, 86, 106), legno0=(30, 18, 14), legno1=(46, 28, 20), legno2=(66, 42, 28),
    cremisi0=(60, 14, 24), cremisi1=(98, 24, 38), cremisi2=(140, 36, 50), oro0=(120, 84, 30), oro1=(196, 150, 60),
    oro2=(246, 206, 112), ferro=(36, 34, 40), cera=(236, 222, 180),
)
VETRO = [(34, 70, 150), (24, 48, 112), (150, 30, 44), (110, 20, 34), (40, 120, 70), (214, 168, 60), (96, 48, 140), (60, 110, 180)]
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def T(v): return int(round(v * D))                         # pixel di gioco -> pixel di texture


def svg(path, ident=None, zoom=1.0):
    """Rasterizza un SVG (o un solo gruppo) a pixel netti e lo ritaglia sul contenuto."""
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        cmd = ['rsvg-convert', '-z', str(zoom), '-o', f.name]
        if ident: cmd += ['-i', ident]
        subprocess.run(cmd + [path], check=True)
        a = np.array(Image.open(f.name).convert('RGBA'))
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    ys, xs = np.where(a[..., 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()


def scala(a, w=None, h=None):
    """Ridimensiona a pixel netti (NEAREST) a una larghezza/altezza in pixel di GIOCO."""
    s = (T(w) / a.shape[1]) if w else (T(h) / a.shape[0])
    nw, nh = max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))
    out = np.array(Image.fromarray(a).resize((nw, nh), Image.Resampling.NEAREST))
    if out.shape[2] == 4: out[..., 3] = np.where(out[..., 3] > 127, 255, 0)
    return out


def pittura(a, forza=1.0, luce=True, contorno=True):
    """Da tinta piatta a pixel art dipinta: grana retinata, luce dall'alto a sinistra, ombra in basso, contorno scuro."""
    a = a.copy(); al = a[..., 3] > 0 if a.shape[2] == 4 else np.ones(a.shape[:2], bool)
    rgb = a[..., :3].astype(float); h, w = al.shape
    yy, xx = np.mgrid[0:h, 0:w]
    grana = (RNG.random((h, w)) - 0.5) * 18 * forza
    b = BAYER[yy % 4, xx % 4] - 0.5
    rgb += (grana + b * 10 * forza)[..., None]
    if luce:
        # rilievo: bordi superiori/sinistri piu' chiari, inferiori/destri piu' scuri (a gradini)
        su = al & ~np.roll(al, 1, 0); sx = al & ~np.roll(al, 1, 1)
        giu = al & ~np.roll(al, -1, 0); dx = al & ~np.roll(al, -1, 1)
        rgb[su | sx] *= 1.28; rgb[giu | dx] *= 0.62
        rgb *= (1.08 - 0.22 * (yy / max(1, h - 1)))[..., None]
    a[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    if contorno and a.shape[2] == 4:
        bordo = nd.binary_dilation(al, structure=np.ones((3, 3))) & ~al
        a = a.copy(); a[bordo] = (8, 7, 12, 255)
    return a


def incolla(dst, src, x, y, ombra=False):
    """Incolla `src` (RGBA) su `dst` (RGBA) con l'angolo in (x,y) in pixel di texture."""
    h, w = src.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x1 <= x0 or y1 <= y0: return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; m = s[..., 3] > 0
    if ombra:
        sh = np.zeros_like(m); sh[2:, 2:] = m[:-2, :-2]
        r = dst[y0:y1, x0:x1]; r[sh & ~m, :3] = (r[sh & ~m, :3] * 0.45).astype(np.uint8)
    dst[y0:y1, x0:x1][m] = s[m]


def colore(c, k=1.0): return tuple(int(min(255, max(0, v * k))) for v in c)


# ---------------------------------------------------------------------------
# materiali
# ---------------------------------------------------------------------------
def muro(w, h, scuro=1.0, alto=10, seed=0):
    """Muratura a blocchi: ogni blocco ha la sua tinta, giunti scuri, spigolo superiore chiaro, retinatura."""
    r = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), float)
    bh = T(alto); y = 0; riga = 0
    base = [PAL['p1'], PAL['p2'], PAL['p2'], PAL['p3'], PAL['p1']]
    while y < h:
        x = -int(r.integers(0, T(20)))
        while x < w:
            bw = T(int(r.integers(14, 30)))
            c = np.array(base[int(r.integers(0, len(base)))], float) * r.uniform(0.86, 1.1)
            img[y:y + bh, max(0, x):x + bw] = c
            # spigolo superiore chiaro e lato destro scuro: il blocco ha volume
            img[y:y + 1, max(0, x):x + bw] = c * 1.3
            img[y:y + bh, max(0, x + bw - 1):x + bw] = c * 0.7
            # qualche blocco consumato: macchie scure
            if r.random() < 0.18:
                cy, cx = y + int(r.integers(1, bh)), x + int(r.integers(1, bw))
                img[max(0, cy - 1):cy + 1, max(0, cx - 2):cx + 2] *= 0.72
            img[y:y + bh, max(0, x):max(0, x) + 1] = PAL['malta']
            x += bw
        img[y + bh - 1:y + bh] = PAL['malta']
        y += bh; riga += 1
    yy, xx = np.mgrid[0:h, 0:w]
    img += ((BAYER[yy % 4, xx % 4] - 0.5) * 9 + (r.random((h, w)) - 0.5) * 7)[..., None]
    # crepe sottili qua e la'
    for _ in range(w // T(60)):
        cx, cy = int(r.integers(0, w)), int(r.integers(0, h))
        for _ in range(int(r.integers(8, 26))):
            if 0 <= cy < h and 0 <= cx < w: img[cy, cx] = PAL['malta']
            cy += 1; cx += int(r.integers(-1, 2))
    return np.clip(img * scuro, 0, 255)


def sfuma(img, y0, y1, k0, k1):
    """Scurisce a gradini (retinati) tra y0 e y1: k0 -> k1."""
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip((yy - y0) / max(1, y1 - y0), 0, 1)
    t = np.clip(np.floor(t * 6 + BAYER[yy % 4, xx % 4]) / 6, 0, 1)
    img *= (k0 + (k1 - k0) * t)[..., None]
    return img


def sesto_acuto(w, h_imposta):
    """Maschera di un arco a sesto acuto largo w: True dentro l'apertura. Le imposte sono a h_imposta dall'alto
    dell'arco (cioe' la punta e' a y=0). Arco equilatero: raggio = larghezza."""
    R = w; H = int(np.ceil(R * np.sqrt(3) / 2))
    yy, xx = np.mgrid[0:H + h_imposta, 0:w]
    xr = xx + 0.5
    dentro_sx = (xr - w) ** 2 + (yy - H) ** 2 <= R * R
    dentro_dx = xr ** 2 + (yy - H) ** 2 <= R * R
    m = dentro_sx & dentro_dx
    m[H:] = True
    return m


def vetrata(w, h, seed, figura=True):
    """Vetrata policroma: tessere colorate con piombi scuri, un motivo centrale e una cornice d'oro."""
    r = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), float); cs = T(3)
    for y in range(0, h, cs):
        for x in range(0, w, cs):
            c = np.array(VETRO[int(r.integers(0, len(VETRO)))], float) * r.uniform(0.8, 1.15)
            img[y:y + cs, x:x + cs] = c
    img[::cs] = (18, 16, 22); img[:, ::cs] = (18, 16, 22)
    if figura:
        # losanghe sovrapposte (motivo geometrico, nessuna figura sacra ricopiata)
        yy, xx = np.mgrid[0:h, 0:w]
        cx = w / 2
        for cy, rr, col in ((h * 0.35, w * 0.42, (214, 168, 60)), (h * 0.35, w * 0.25, (150, 30, 44)), (h * 0.7, w * 0.38, (34, 70, 150))):
            d = np.abs(xx - cx) + np.abs(yy - cy) * 0.75
            img[(d < rr) & (d > rr - T(2))] = (240, 210, 120)
            img[d < rr * 0.55] = np.array(col) * 1.1
    img[:, :T(1)] = PAL['oro0']; img[:, -T(1):] = PAL['oro0']
    return np.clip(img, 0, 255)


def finestra(w_gioco, h_gioco, seed):
    """Monofora gotica: cornice di pietra modanata e vetrata, RGBA (fuori dall'arco e' trasparente)."""
    w, h = T(w_gioco), T(h_gioco)
    full = sesto_acuto(w, h); full = full[:h]
    out = np.zeros((full.shape[0], w, 4), np.uint8)
    v = vetrata(w, full.shape[0], seed)
    out[full, :3] = v[full].astype(np.uint8); out[full, 3] = 255
    # cornice: due anelli di pietra chiara intorno all'apertura
    cornice = nd.binary_dilation(full, iterations=T(3)) & ~full
    big = np.zeros((full.shape[0] + T(6), w + T(6)), bool)
    big[T(3):T(3) + full.shape[0], T(3):T(3) + w] = full
    anello = nd.binary_dilation(big, iterations=T(3)) & ~big
    res = np.zeros((big.shape[0], big.shape[1], 4), np.uint8)
    res[T(3):T(3) + full.shape[0], T(3):T(3) + w] = out
    res[anello, :3] = PAL['p4']; res[anello, 3] = 255
    interno = nd.binary_dilation(big, iterations=T(1)) & ~big
    res[interno, :3] = PAL['p0']
    res = pittura(res, 0.8, luce=True, contorno=True)
    return res


# ---------------------------------------------------------------------------
# strato lontano: la parete laterale con le vetrate (scorre a meta' velocita')
# ---------------------------------------------------------------------------
def strato_lontano(kit):
    wg = int(np.ceil((W_GIOCO - 384) * K_LONTANO + 384)) + 8
    w, h = T(wg), T(H_GIOCO)
    img = muro(w, h, 0.85, seed=11)
    # volta: costoloni e penombra in alto
    img = sfuma(img, 0, T(34), 0.35, 1.0)
    img = sfuma(img, T(150), T(200), 1.0, 0.55)
    out = np.dstack([img.clip(0, 255).astype(np.uint8), np.full((h, w), 255, np.uint8)])
    luci = []
    k = 0
    for xg in range(70, wg - 30, 128):
        k += 1
        fin = finestra(30, 92, 100 + k)
        x, y = T(xg) - fin.shape[1] // 2, T(28)
        incolla(out, fin, x, y, ombra=True)
        luci.append(dict(x=xg, y=28 + fin.shape[0] / D / 2, w=30, h=fin.shape[0] / D))
        # sotto la finestra: nicchia con statua, oppure quadro, oppure stendardo
        tipo = k % 3
        if tipo == 0 and 'statua' in kit:
            st = kit['statua']; nic = np.zeros((st.shape[0] + T(8), st.shape[1] + T(8), 4), np.uint8)
            nm = sesto_acuto(nic.shape[1], nic.shape[0])[:nic.shape[0]]
            nic[nm] = (*PAL['p0'], 255); nic = pittura(nic, 0.5)
            incolla(out, nic, T(xg) - nic.shape[1] // 2, T(132) - nic.shape[0] + T(18))
            incolla(out, st, T(xg) - st.shape[1] // 2, T(132) - st.shape[0] + T(16), ombra=True)
        elif tipo == 1 and 'quadro' in kit:
            q = kit['quadro']; incolla(out, q, T(xg) - q.shape[1] // 2, T(128), ombra=True)
        elif 'stendardo' in kit:
            s = kit['stendardo']; incolla(out, s, T(xg) - s.shape[1] // 2, T(124), ombra=True)
    # zoccolo scuro in basso (la parete finisce dietro il pavimento della navata)
    out[T(170):, :, :3] = (out[T(170):, :, :3] * 0.6).astype(np.uint8)
    return out, wg, luci


# ---------------------------------------------------------------------------
# strato principale: pilastri, archi, pavimento, ingresso e abside (scorre con il mondo)
# ---------------------------------------------------------------------------
def pavimento(w, kit):
    """Pavimento in lastre (dalle piastrelle SVG) con il tappeto cremisi lungo la navata."""
    h = T(H_GIOCO - 172)
    img = np.zeros((h + T(12), w, 3), float)
    tiles = [kit['tile_a'], kit['tile_b'], kit['tile_a'], kit['tile_crepa']]
    # tre file di lastre, sempre piu' alte verso chi guarda (prospettiva)
    y = 0
    for i, hh in enumerate((T(6), T(13), T(25))):
        x = -T(13) * i
        j = i
        while x < w:
            t = tiles[(j * 7 + i) % len(tiles)]
            tw = T(26 + 6 * i)
            pezzo = np.array(Image.fromarray(t[..., :3]).resize((tw, hh), Image.Resampling.NEAREST)).astype(float)
            x0 = max(0, x); x1 = min(w, x + tw)
            img[y:y + hh, x0:x1] = pezzo[:, x0 - x:x1 - x]
            img[y:y + hh, x0:x0 + 1] = PAL['malta']
            x += tw; j += 1
        img[y:y + 1] *= 1.25; img[y + hh - 1:y + hh] = PAL['malta']
        y += hh
    img = img[:h]
    img *= 0.82
    # tappeto: fascia da y=176 a 194 (piedi a 180), bordo d'oro, motivo a losanghe
    t0, t1 = T(176 - 172), T(194 - 172)
    car = kit['tappeto']
    car = np.array(Image.fromarray(car[..., :3]).resize((T(64), t1 - t0), Image.Resampling.NEAREST)).astype(float)
    for x in range(0, w, car.shape[1]):
        img[t0:t1, x:x + car.shape[1]] = car[:, :min(car.shape[1], w - x)]
    img[t0:t0 + T(1)] = PAL['oro1']; img[t1 - T(1):t1] = PAL['oro0']
    img[t0 - 1:t0] = PAL['malta']; img[t1:t1 + 1] = PAL['malta']
    yy, xx = np.mgrid[0:h, 0:w]
    img += ((BAYER[yy % 4, xx % 4] - 0.5) * 10 + (RNG.random((h, w)) - 0.5) * 8)[..., None]
    img = sfuma(img, T(28), h, 1.0, 0.55)
    return np.clip(img, 0, 255).astype(np.uint8)


def pilastro(h_tex):
    """Pilastro a fascio di colonnine: luce da sinistra, ombra a destra, capitello e base modanati."""
    w = T(26); img = np.zeros((h_tex, w, 4), np.uint8)
    prof = np.concatenate([np.linspace(1.25, 0.95, w // 3), np.linspace(0.95, 0.8, w // 3), np.linspace(0.8, 0.5, w - 2 * (w // 3))])
    for i, k in enumerate(prof):
        img[:, i, :3] = colore(PAL['p3'], k); img[:, i, 3] = 255
    # scanalature verticali (colonnine)
    for xg in (5, 12, 19):
        img[:, T(xg), :3] = colore(PAL['p1'], 0.9)
    # blocchi
    for y in range(0, h_tex, T(12)): img[y:y + 1, :, :3] = PAL['malta']
    out = pittura(img, 0.7, luce=False, contorno=False)
    return out


def arcata(x0, x1, h_imposta_g=62):
    """Arco a sesto acuto tra due pilastri: muratura sopra, apertura trasparente sotto."""
    w = T(x1 - x0)
    mask = sesto_acuto(w, 0)
    H = mask.shape[0]
    top = T(h_imposta_g) - H                         # la punta dell'arco
    return mask, top


def strato_navata(kit):
    w, h = T(W_GIOCO), T(H_GIOCO)
    out = np.zeros((h, w, 4), np.uint8)
    luci, fiamme = [], []
    pav = pavimento(w, kit)
    out[T(172):, :, :3] = pav; out[T(172):, :, 3] = 255
    # fascia alta (sottarco e volta) su tutta la navata
    volta = muro(w, T(70), 0.62, seed=5)
    volta = sfuma(volta, 0, T(40), 0.3, 1.0)
    pil_x = [INGRESSO - 13] + PILASTRI + [ARENA_X + 13]
    for a, b in zip(pil_x[:-1], pil_x[1:]):
        x0, x1 = a + 13, b - 13
        if x1 - x0 < 40: continue
        wt = T(x1) - T(x0)
        u = np.abs(np.arange(wt) + 0.5 - wt / 2) / (wt / 2)
        prof = T(52) * np.sqrt(np.clip(1 - u * u, 0, 1)) * (1 - 0.32 * u)     # arco acuto ribassato
        yy = np.arange(T(70))[:, None]
        dentro = yy >= (T(64) - prof)[None, :]
        muratura = ~dentro
        reg = out[:T(70), T(x0):T(x1)]
        reg[muratura, :3] = volta[:, T(x0):T(x1)][muratura].astype(np.uint8); reg[muratura, 3] = 255
        # ghiera dell'arco: due file di conci piu' chiari lungo il bordo dell'apertura
        bordo = nd.binary_dilation(dentro, iterations=T(4)) & muratura
        bordo2 = nd.binary_dilation(dentro, iterations=T(2)) & muratura
        reg[bordo, :3] = colore(PAL['p3'], 0.95); reg[bordo2, :3] = colore(PAL['p4'], 1.0)
        reg[nd.binary_dilation(dentro, iterations=1) & muratura, :3] = PAL['p0']
    # pilastri
    for xg in PILASTRI:
        p = pilastro(T(172))
        incolla(out, p, T(xg - 13), 0)
        # capitello e base
        cap = np.zeros((T(8), T(34), 4), np.uint8); cap[..., :3] = PAL['p4']; cap[..., 3] = 255
        cap[:T(2), :, :3] = PAL['p5']; cap = pittura(cap, 0.6)
        incolla(out, cap, T(xg - 17), T(60))
        base = np.zeros((T(14), T(36), 4), np.uint8); base[..., :3] = PAL['p3']; base[..., 3] = 255
        base[:T(3), :, :3] = PAL['p4']; base = pittura(base, 0.6)
        incolla(out, base, T(xg - 18), T(160))
        # candela sul pilastro (portacandele di ferro)
        sc = kit['portacandela']; incolla(out, sc, T(xg) - sc.shape[1] // 2, T(104), ombra=True)
        fiamme.append(dict(x=xg, y=104 - 0.5, k=0.8)); luci.append(dict(x=xg, y=100, r=46))
    # candelabri di ferro a terra in alcune campate (dietro ai personaggi)
    for i, xg in enumerate(PILASTRI[:-1]):
        if i % 2: continue
        c = kit['candelabro']; cx = xg + CAMPATA // 2
        incolla(out, c, T(cx) - c.shape[1] // 2, T(176) - c.shape[0], ombra=True)
        for fx, fy in kit['candelabro_fiamme']:
            fiamme.append(dict(x=cx + fx, y=176 - c.shape[0] / D + fy, k=0.7))
        luci.append(dict(x=cx, y=176 - c.shape[0] / D + 6, r=60))
    ingresso(out, kit, luci, fiamme)
    abside(out, kit, luci, fiamme)
    return out, luci, fiamme


def ingresso(out, kit, luci, fiamme):
    """Controfacciata: muro pieno da x=0 a INGRESSO con il portale monumentale (porta aperta sulla notte)."""
    w = T(INGRESSO); h = T(172)
    m = muro(w, h, 0.9, seed=21); m = sfuma(m, 0, T(30), 0.35, 1.0); m = sfuma(m, T(120), h, 1.0, 0.7)
    out[:h, :w, :3] = m.astype(np.uint8); out[:h, :w, 3] = 255
    por = kit['portale']; px = T(150) - por.shape[1] // 2; py = T(178) - por.shape[0]
    # vano del portale: notte fredda con la luna che entra (trasparenza no: e' il fuori, disegnato)
    vano = kit['portale_vano']
    for (y, x) in zip(*np.where(vano)):
        yy, xx = py + y, px + x
        if 0 <= yy < out.shape[0] and 0 <= xx < out.shape[1]:
            t = y / vano.shape[0]
            c = np.array((22, 34, 66)) * (0.6 + 0.6 * t) + (BAYER[yy % 4, xx % 4] - 0.5) * 10
            out[yy, xx, :3] = np.clip(c, 0, 255); out[yy, xx, 3] = 255
    # stelle e sagome dei tetti fuori
    for _ in range(30):
        y, x = np.where(vano); i = int(RNG.integers(0, len(y)))
        if y[i] < vano.shape[0] * 0.55: out[py + y[i], px + x[i], :3] = (200, 210, 240)
    incolla(out, por, px, py, ombra=True)
    for fx, fy in kit['portale_torce']:
        fiamme.append(dict(x=150 - por.shape[1] / D / 2 + fx, y=178 - por.shape[0] / D + fy, k=0.9))
        luci.append(dict(x=150 - por.shape[1] / D / 2 + fx, y=178 - por.shape[0] / D + fy, r=50))
    # acquasantiera e lapide sul muro tra portale e navata
    if 'lapide' in kit:
        l = kit['lapide']; incolla(out, l, T(330) - l.shape[1] // 2, T(150) - l.shape[0], ombra=True)
    # spigolo del muro: pilastro di raccordo con la navata
    p = pilastro(T(172)); incolla(out, p, T(INGRESSO - 13), 0)


def abside(out, kit, luci, fiamme):
    """Arena: muro di fondo con il grande rosone, l'altare su due gradini e i candelabri."""
    x0 = T(ARENA_X); w = out.shape[1] - x0; h = T(172)
    m = muro(w, h, 0.92, seed=33); m = sfuma(m, 0, T(26), 0.3, 1.0); m = sfuma(m, T(130), h, 1.0, 0.72)
    out[:h, x0:, :3] = m.astype(np.uint8); out[:h, x0:, 3] = 255
    cx = T(ARENA_X + 192)
    ros = kit['rosone']
    cornice = kit['arco_cornice']
    incolla(out, cornice, cx - cornice.shape[1] // 2, T(2), ombra=True)
    incolla(out, ros, cx - ros.shape[1] // 2, T(ROSONE_Y), ombra=True)
    luci.append(dict(x=ARENA_X + 192, y=ROSONE_Y + ros.shape[0] / D / 2, r=90, rosone=1))
    # pilastri ai lati dell'arena
    for xg in (ARENA_X + 13, ARENA_X + 384 - 13):
        p = pilastro(T(172)); incolla(out, p, T(xg - 13), 0)
    # gradini e altare
    for i, (wg, hg) in enumerate(((190, 3), (150, 3))):
        g = np.zeros((T(hg), T(wg), 4), np.uint8); g[..., :3] = PAL['p3'] if i == 0 else PAL['p4']; g[..., 3] = 255
        g[:T(1), :, :3] = PAL['p5']; g = pittura(g, 0.6)
        incolla(out, g, cx - g.shape[1] // 2, T(172 - 3 * (i + 1)))
    alt = kit['altare']
    incolla(out, alt, cx - alt.shape[1] // 2, T(166) - alt.shape[0], ombra=True)
    for fx, fy in kit['altare_fiamme']:
        fiamme.append(dict(x=ARENA_X + 192 - alt.shape[1] / D / 2 + fx, y=166 - alt.shape[0] / D + fy, k=0.9))
    luci.append(dict(x=ARENA_X + 192, y=130, r=80))
    for dx in (-120, 120):
        c = kit['candelabro']; xg = ARENA_X + 192 + dx
        incolla(out, c, T(xg) - c.shape[1] // 2, T(174) - c.shape[0], ombra=True)
        for fx, fy in kit['candelabro_fiamme']:
            fiamme.append(dict(x=xg + fx, y=174 - c.shape[0] / D + fy, k=0.7))
        luci.append(dict(x=xg, y=174 - c.shape[0] / D + 6, r=60))


# ---------------------------------------------------------------------------
# primo piano: schienali delle panche in basso e stendardi in alto (scorre un po' piu' veloce)
# ---------------------------------------------------------------------------
def strato_primo(kit):
    wg = int(np.ceil((W_GIOCO - 384) * K_PRIMO + 384)) + 8
    w, h = T(wg), T(H_GIOCO)
    out = np.zeros((h, w, 4), np.uint8)
    xg = 300
    r = np.random.default_rng(77)
    while xg < wg - 200:
        p = kit['panca_pp']
        incolla(out, p, T(xg), T(194))                 # si vede solo lo schienale, sotto i piedi (y=180)
        if r.random() < 0.4:
            q = kit['macerie']; incolla(out, q, T(xg + 70), T(H_GIOCO) - q.shape[0])
        xg += int(r.integers(190, 300))
    xg = 520
    while xg < wg - 200:
        s = kit['stendardo_pp']; incolla(out, s, T(xg), -T(2))
        xg += int(r.integers(420, 640))
    # in primo piano e controluce: molto scuri
    out[..., :3] = (out[..., :3] * 0.42).astype(np.uint8)
    return out, wg


# ---------------------------------------------------------------------------
# kit: i pezzi presi dagli SVG
# ---------------------------------------------------------------------------
def kit_svg(P):
    J = lambda *p: os.path.join(P, *p)
    k = {}
    # piastrelle 64x64 e tappeto
    for nome, ident in (('tile_a', 'tile-stone-a'), ('tile_b', 'tile-stone-b'), ('tile_crepa', 'tile-cracked'), ('tappeto', 'tile-carpet')):
        k[nome] = svg(J('tilesets', 'stone_floor_variants.svg'), ident)
    # portale d'ingresso: pietra, decori e torce da una parte, il portone (sprite che si apre) dall'altra.
    # Si rasterizzano i gruppi sulla stessa tela dell'SVG, cosi' restano allineati.
    PS = J('background', 'entrance_portal.svg')
    def tela(ids):
        import re
        testo = open(PS).read()
        for g in re.findall(r'<g id="([^"]+)"', testo):
            if g not in ids: testo = re.sub(r'<g id="%s".*?</g>' % g, '', testo, flags=re.S)
        with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f: f.write(testo); nome = f.name
        with tempfile.NamedTemporaryFile(suffix='.png') as o:
            subprocess.run(['rsvg-convert', '-o', o.name, nome], check=True)
            a = np.array(Image.open(o.name).convert('RGBA'))
        os.unlink(nome)
        a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
        return a
    pietra = tela({'portal-stone', 'stone-details', 'torch-sconces'})
    porta = tela({'door'})
    torce = tela({'torch-sconces'})
    ys, xs = np.where(pietra[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sc = T(200) / (y1 - y0)
    rs = lambda a: np.array(Image.fromarray(a[y0:y1, x0:x1]).resize((max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))), Image.Resampling.NEAREST))
    full, pm = rs(pietra), rs(porta)
    vano = pm[..., 3] > 0
    full[vano, 3] = 0                                  # dietro il portone c'e' la notte, non la pietra
    k['portale'] = pittura(full, 0.9)
    k['portale_vano'] = vano
    py_, px_ = np.where(vano)
    k['porta'] = pittura(pm[py_.min():py_.max() + 1, px_.min():px_.max() + 1], 0.9)
    k['porta_xy'] = (px_.min() / D, py_.min() / D)
    tm = rs(torce)[..., 3] > 0
    lab, n = nd.label(tm)
    k['portale_torce'] = []
    for sl in nd.find_objects(lab):
        k['portale_torce'].append(((sl[1].start + sl[1].stop) / 2 / D, sl[0].start / D))
    # rosone e cornice
    ros = svg(J('stained-glass', 'great_rose_window.svg'), 'rose-window')
    ros = scala(ros, w=92)
    # tessere e piombi sopra le tinte piatte: il rosone diventa una vetrata
    al = ros[..., 3] > 0; rgb = ros[..., :3].astype(float); hh, ww = al.shape
    yy, xx = np.mgrid[0:hh, 0:ww]; cs = T(3)
    rgb *= (0.8 + 0.4 * RNG.random((hh // cs + 1, ww // cs + 1)))[yy // cs, xx // cs][..., None]
    rgb[(yy % cs == 0) | (xx % cs == 0)] *= 0.55
    ros[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    k['rosone'] = pittura(ros, 0.5, luce=False)
    cor = np.zeros((T(112), T(118), 4), np.uint8)
    mm = sesto_acuto(cor.shape[1], cor.shape[0])[:cor.shape[0]]
    anello = nd.binary_dilation(mm, iterations=T(5)) & ~mm
    big = np.zeros((cor.shape[0] + T(10), cor.shape[1] + T(10)), bool); big[T(5):T(5) + cor.shape[0], T(5):T(5) + cor.shape[1]] = mm
    an = nd.binary_dilation(big, iterations=T(5)) & ~big
    cc = np.zeros((big.shape[0], big.shape[1], 4), np.uint8)
    cc[big, :3] = PAL['p0']; cc[big, 3] = 255; cc[an, :3] = PAL['p4']; cc[an, 3] = 255
    k['arco_cornice'] = pittura(cc, 0.6)
    # altare con candele
    alt = svg(J('altar', 'altar_front_detail.svg'))
    sa = T(104) / alt.shape[1]
    alt = np.array(Image.fromarray(alt).resize((T(104), max(1, round(alt.shape[0] * sa))), Image.Resampling.NEAREST))
    k['altare'] = pittura(alt, 0.7)
    cand = svg(J('altar', 'altar_front_detail.svg'), 'altar-candles')
    # le due candele dell'altare: punte (in pixel di gioco dall'angolo dell'altare)
    k['altare_fiamme'] = [(3, 0), (104 - 3, 0)]
    # candelabro di ferro, panca, macerie, stendardo (dal foglio "foreground")
    F = J('foreground', 'foreground_props.svg')
    can = svg(F, 'iron-candelabrum'); can = scala(can, h=62)
    k['candelabro'] = pittura(can, 0.5)
    # bracci: tre punte in alto (dove stanno le candele)
    al = can[..., 3] > 0; cols = np.where(al.any(0))[0]
    tips = []
    for x in range(al.shape[1]):
        ys = np.where(al[:, x])[0]
        if len(ys) and ys[0] < al.shape[0] * 0.45: tips.append((x, ys[0]))
    if tips:
        lab, n = nd.label(np.array([t[1] < al.shape[0] * 0.25 for t in tips]))
        sel = {}
        for (x, y), l in zip(tips, lab):
            if l and (l not in sel or y < sel[l][1]): sel[l] = (x, y)
        k['candelabro_fiamme'] = [((x - can.shape[1] / 2) / D, y / D) for x, y in sel.values()]
    else:
        k['candelabro_fiamme'] = [(0, 0)]
    pew = pittura(scala(svg(F, 'pew-left'), h=34), 0.6)
    fila = np.zeros((pew.shape[0], pew.shape[1] * 4 - T(6), 4), np.uint8)   # quattro panche di fila
    for i in range(4): incolla(fila, pew, i * (pew.shape[1] - T(2)), 0)
    k['panca_pp'] = fila
    k['macerie'] = pittura(scala(svg(F, 'rubble'), w=40), 0.8)
    ban = svg(F, 'hanging-banner'); k['stendardo_pp'] = pittura(scala(ban, h=40), 0.6)
    k['stendardo'] = pittura(scala(ban, h=36), 0.6)
    # portacandela da pilastro: piccolo braccio di ferro + candela (dalla strip delle fiamme)
    A = J('animations', 'flames_and_candles.svg')
    cnd = svg(A, 'candle'); cnd = scala(cnd, h=12)
    pc = np.zeros((cnd.shape[0] + T(3), max(cnd.shape[1], T(10)), 4), np.uint8)
    incolla(pc, cnd, (pc.shape[1] - cnd.shape[1]) // 2, 0)
    pc[-T(3):, :, :3] = PAL['ferro']; pc[-T(3):, :, 3] = 255
    k['portacandela'] = pittura(pc, 0.5)
    # fiamme animate: i 4 fotogrammi 32x48 della strip, ridotti (fiamma alta 10 px di gioco)
    k['fiamme'] = [scala(svg(A, f'flame-{i}'), h=10) for i in range(4)]
    # statua, quadro, lapide: dal foglio "props" (senza id: si separano per componenti sul fondo scuro)
    pr = svg(J('props', 'church_props.svg'))
    bgc = pr[2, 2, :3].astype(int)
    fg = (np.abs(pr[..., :3].astype(int) - bgc).sum(2) > 24) & (pr[..., 3] > 0)
    lab, n = nd.label(nd.binary_dilation(fg, iterations=3))
    pezzi = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        if m.sum() < 200: continue
        a = pr[sl].copy(); a[~m, 3] = 0; a[m, 3] = 255
        pezzi.append(((sl[0].start, sl[1].start), a))
    pezzi.sort(key=lambda t: (t[0][0] // 150, t[0][1]))
    # ordine nel foglio: panca, candeliere, croce, quadro / statua, quadro, finestrella, lapide
    if len(pezzi) >= 8:
        k['quadro'] = pittura(scala(pezzi[3][1], h=30), 0.6)
        k['statua'] = pittura(scala(pezzi[4][1], h=34), 0.7)
        k['lapide'] = pittura(scala(pezzi[7][1], h=26), 0.7)
    return k


def b64(im, b64png):
    return b64png(Image.fromarray(im))


def parti(img, b64png, larghezza_g=512):
    P = T(larghezza_g)
    return [b64png(Image.fromarray(img[:, x:x + P])) for x in range(0, img.shape[1], P)]


def costruisci(P, b64png, prev):
    kit = kit_svg(P)
    lon, wl, vetrate = strato_lontano(kit)
    nav, luci, fiamme = strato_navata(kit)
    pp, wp = strato_primo(kit)
    exp = os.path.join(P, 'export'); os.makedirs(exp, exist_ok=True)
    for nome, im in (('chiesa_lontano', lon), ('chiesa_navata', nav), ('chiesa_primo', pp)):
        Image.fromarray(im).save(f'{exp}/{nome}.png')
    for nome, im in (('chiesa_lontano', lon), ('chiesa_navata', nav), ('chiesa_primo', pp)):
        pv = Image.new('RGBA', (im.shape[1], im.shape[0]), (255, 0, 255, 255)); pv.alpha_composite(Image.fromarray(im)); pv.convert('RGB').save(f'{prev}/{nome}.png')
    # composizione di prova (senza parallasse) per controllare a occhio
    comp = Image.new('RGBA', (nav.shape[1], nav.shape[0]), (0, 0, 0, 255))
    lw = Image.fromarray(lon).resize((nav.shape[1], nav.shape[0]), Image.Resampling.NEAREST)
    comp.alpha_composite(Image.fromarray(lon[:, :min(lon.shape[1], nav.shape[1])]) if False else lw)
    comp.alpha_composite(Image.fromarray(nav)); comp.convert('RGB').save(f'{prev}/chiesa_composta.png')
    fx = {}
    for i, f in enumerate(kit['fiamme']):
        fx[f'fiamma_{i}'] = dict(data=b64(f, b64png), w=round(f.shape[1] / D, 1), h=round(f.shape[0] / D, 1), d=D)
    fx['porta'] = dict(data=b64(kit['porta'], b64png), w=round(kit['porta'].shape[1] / D, 1), h=round(kit['porta'].shape[0] / D, 1), d=D)
    por = kit['portale']
    bg = dict(
        w=W_GIOCO, arenaX=ARENA_X, ingresso=INGRESSO, d=D,
        lontano=dict(parts=parti(lon, b64png), w=wl, k=K_LONTANO),
        navata=dict(parts=parti(nav, b64png), w=W_GIOCO),
        primo=dict(parts=parti(pp, b64png), w=wp, k=K_PRIMO),
        luci=luci, fiamme=fiamme, vetrate=vetrate,
        porta=dict(x=150 - por.shape[1] / D / 2 + kit['porta_xy'][0], y=178 - por.shape[0] / D + kit['porta_xy'][1],
                   w=kit['porta'].shape[1] / D, h=kit['porta'].shape[0] / D),
        rosone=dict(x=ARENA_X + 192, y=ROSONE_Y + kit['rosone'].shape[0] / D / 2, r=kit['rosone'].shape[0] / D / 2),
        pilastri=PILASTRI,
    )
    return bg, fx
