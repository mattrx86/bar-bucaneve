"""HOLY SLUG - fondali DIPINTI della chiesa (al posto di quelli disegnati da codice).

Se in progetto-chiesa/fondali/ ci sono le immagini dipinte, il livello usa quelle; altrimenti resta il
fondale generato da tools/chiesa_ambiente.py. Stesso metodo dei fondali della strada di Buca Slug:
ogni immagine viene scalata in modo che la riga dei piedi cada a y=180 (pixel di gioco), poi i pezzi
vengono cuciti uno dopo l'altro cercando le colonne piu' simili ai bordi e sfumando la giunzione.

File riconosciuti (PNG o JPG, qualsiasi dimensione, ordine alfabetico dentro ogni gruppo):
  ingresso*.png       primo pezzo: il portone (il giocatore parte qui)
  navata*.png         pezzi della navata, in ordine (navata_01, navata_02, ...)
  altare*.png         ultimo pezzo: l'arena dei boss con altare e rosone (servono almeno 384 px di gioco)
  lontano*.png        FACOLTATIVO: parete lontana per la parallasse, visibile solo dove i pezzi
                      principali sono trasparenti (PNG con alpha) o di colore magenta puro #FF00FF
  primo_piano*.png    FACOLTATIVO: oggetti davanti ai personaggi (PNG trasparente o fondo verde #00FF00)
  fondali.json        FACOLTATIVO: regolazioni, vedi LEGGIMI.md della cartella
"""
import os, glob, json
import numpy as np
from PIL import Image

D = 1.5
H_GIOCO, TERRA = 216, 180


def _elenco(cartella, prefisso):
    fs = []
    for est in ('png', 'jpg', 'jpeg', 'webp'):
        fs += glob.glob(os.path.join(cartella, f'{prefisso}*.{est}'))
    return sorted(set(fs))


def _chiave(rgba):
    """Magenta #FF00FF (finestre/archi da sfondare) e verde #00FF00 (fondo del primo piano) -> trasparenti."""
    a = rgba.astype(int)
    mag = (a[..., 0] > 220) & (a[..., 1] < 50) & (a[..., 2] > 220)
    ver = (a[..., 0] < 60) & (a[..., 1] > 200) & (a[..., 2] < 60)
    out = rgba.copy(); out[mag | ver, 3] = 0
    return out


def fiamme_dipinte(im, minimo=5, unisci=26):
    """Centri delle fiammelle dipinte (pixel quasi bianchi-gialli e saturi), uniti se vicini."""
    from scipy import ndimage as nd
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = (r > 240) & (g > 200) & (b < 200) & (r - b > 70)
    lab, n = nd.label(m)
    pts = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        if (lab[sl] == i).sum() < minimo: continue
        y, x = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        if not any(abs(x - px) < unisci and abs(y - py) < unisci for px, py in pts): pts.append((x, y))
    return pts


# Oggetti dal foglio "Elementi pixel art dell'ambiente di una chiesa" (fondali/): indice del pezzo nel foglio
# (ordinati per riga e poi da sinistra) e altezza in pixel di gioco. Solo decorazione: nessuna collisione.
OGGETTI = {
    'panca': (9, 30), 'panca_rotta': (10, 26), 'inginocchiatoio': (11, 24), 'tavolo_candele': (6, 28),
    'leggio': (7, 30), 'colonna_rotta': (14, 34), 'macerie_piccole': (22, 12), 'macerie': (24, 14),
    'macerie_grandi': (23, 20), 'cassa': (20, 20), 'barili': (21, 20), 'vaso_gigli': (17, 22), 'vaso_rose': (18, 20),
}


def foglio_oggetti(path):
    """Separa i pezzi del foglio (fondo bianco/grigio chiaro): il fondo e' il chiaro collegato al bordo di
    ogni ritaglio, cosi' restano i bianchi interni (gigli, tovaglie) chiusi dal contorno scuro."""
    from scipy import ndimage as nd
    a = np.array(Image.open(path).convert('RGBA'))
    rgb = a[..., :3].astype(int)
    chiaro = (rgb.min(2) > 200) & (rgb.max(2) - rgb.min(2) < 18)
    fg = nd.binary_opening(~chiaro, iterations=1)
    lab, n = nd.label(nd.binary_dilation(fg, iterations=4))
    pezzi = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        if m.sum() < 800: continue
        pezzi.append((sl, i))
    pezzi.sort(key=lambda t: (t[0][0].start // 200, t[0][1].start))
    out = []
    for sl, i in pezzi:
        c = a[sl].copy(); ch = chiaro[sl]
        l2, _ = nd.label(ch)
        bordo = set(np.unique(np.concatenate([l2[0], l2[-1], l2[:, 0], l2[:, -1]]))) - {0}
        fondo = np.isin(l2, list(bordo)) | (lab[sl] != i)
        # vuoti chiusi grandi e quasi bianchi (es. tra le gambe di un tavolo): fondo anche loro
        for j, sl2 in enumerate(nd.find_objects(l2), 1):
            if j in bordo or sl2 is None: continue
            m2 = l2[sl2] == j
            if m2.sum() > 1500 and rgb[sl][sl2][m2].min() > 225: fondo[sl2] |= m2
        c[..., 3] = np.where(fondo, 0, 255)
        ys, xs = np.where(c[..., 3] > 0)
        out.append(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    return out


def pezzo(path, piede_frazione, densita=D):
    """Scala l'immagine in modo che la riga dei piedi (frazione dell'altezza) finisca a y=180 di gioco e
    restituisce una fascia RGBA alta 216 px di gioco (alla densita' indicata)."""
    im = Image.open(path).convert('RGBA')
    piede = piede_frazione * im.height
    s = TERRA * densita / piede
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.Resampling.LANCZOS)
    a = _chiave(np.array(im))
    H = round(H_GIOCO * densita)
    if a.shape[0] < H:  # troppo bassa: si allunga l'ultima riga (pavimento)
        a = np.concatenate([a, np.repeat(a[-1:], H - a.shape[0], 0)], 0)
    a = a[:H]
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    return a


def cuci(pezzi, cerca=48, sfuma=10):
    """Cuce i pezzi da sinistra a destra: giunzione sulle colonne piu' simili, sfumata su `sfuma` pixel."""
    strip = pezzi[0].astype(float); giunti = []; scost = [0]
    for q in pezzi[1:]:
        q = q.astype(float)
        A = strip[: int(strip.shape[0] * 0.8), :, :3]; B = q[: int(q.shape[0] * 0.8), :, :3]
        best = None
        for ia in range(max(sfuma + 3, strip.shape[1] - cerca), strip.shape[1] - sfuma, 2):
            ca = A[:, ia - 2:ia + 1].mean(1)
            for ib in range(sfuma + 3, min(cerca, q.shape[1] - sfuma), 2):
                d = np.abs(ca - B[:, ib - 2:ib + 1].mean(1)).mean()
                if best is None or d < best[0]: best = (d, ia, ib)
        _, ia, ib = best
        t = np.linspace(0, 1, sfuma)[None, :, None]
        strip = np.concatenate([strip[:, :ia - sfuma], strip[:, ia - sfuma:ia] * (1 - t) + q[:, ib - sfuma:ib] * t, q[:, ib:]], 1)
        giunti.append((ia - sfuma // 2) / D); scost.append(ia - ib)
    out = strip.clip(0, 255).astype(np.uint8)
    out[..., 3] = np.where(out[..., 3] > 127, 255, 0)
    return out, giunti, scost


def presenti(P):
    c = os.path.join(P, 'fondali')
    return bool(_elenco(c, 'navata')) and bool(_elenco(c, 'altare'))


def costruisci(P, b64png, prev):
    """Restituisce (bg, fx) nello stesso formato di chiesa_ambiente.costruisci."""
    c = os.path.join(P, 'fondali')
    cfg = {}
    if os.path.exists(os.path.join(c, 'fondali.json')):
        cfg = json.load(open(os.path.join(c, 'fondali.json')))
    pf = cfg.get('piede', {})  # piede per file: {"navata_01.png": 0.84, ...}; di serie 0.833 (= 180/216)
    fr = lambda f: float(pf.get(os.path.basename(f), cfg.get('piede_predefinito', TERRA / H_GIOCO)))
    files = _elenco(c, 'ingresso') + _elenco(c, 'navata') + _elenco(c, 'altare')
    pezzi = [pezzo(f, fr(f)) for f in files]
    nav, giunti, scost = cuci(pezzi)
    W = nav.shape[1] / D
    if W < 384 * 3: raise SystemExit(f'fondali dipinti troppo corti: {W:.0f} px di gioco (servono almeno 1152)')
    arenaX = W - 384
    exp = os.path.join(P, 'export'); os.makedirs(exp, exist_ok=True)
    Image.fromarray(nav).save(f'{exp}/chiesa_navata_dipinta.png')
    Image.fromarray(nav).convert('RGB').save(f'{prev}/chiesa_navata_dipinta.png')

    def parti(img):
        Pp = round(512 * D)
        return [b64png(Image.fromarray(img[:, x:x + Pp])) for x in range(0, img.shape[1], Pp)]

    trasparente = (nav[..., 3] == 0).any()
    lon_f = _elenco(c, 'lontano')
    if lon_f and trasparente:
        lp = [pezzo(f, fr(f)) for f in lon_f]
        lon = cuci(lp)[0] if len(lp) > 1 else lp[0]
        wl = int(np.ceil((W - 384) * 0.5 + 384))
        while lon.shape[1] < round(wl * D):  # si ripete se e' corta
            lon = np.concatenate([lon, lon], 1)
        lon = lon[:, :round(wl * D)]
        lontano = dict(parts=parti(lon), w=wl, k=0.5)
    else:
        # nessuna parallasse: strato lontano nero (non si vede, il principale e' pieno)
        lontano = dict(parts=[b64png(Image.new('RGBA', (8, round(H_GIOCO * D)), (0, 0, 0, 255)))], w=8, k=0.0)
    pp_f = _elenco(c, 'primo_piano')
    if pp_f:
        pps = [pezzo(f, fr(f)) for f in pp_f]
        pp = np.concatenate(pps, 1)
        wp = int(np.ceil((W - 384) * 1.15 + 384))
        while pp.shape[1] < round(wp * D): pp = np.concatenate([pp, pp], 1)
        pp = pp[:, :round(wp * D)]
        primo = dict(parts=parti(pp), w=wp, k=1.15)
    else:
        primo = dict(parts=[], w=0, k=1.15)
    # luci: aloni che tremolano sopra le fiamme dipinte. In fondali.json "luci_pezzo" le indica per immagine,
    # in pixel dell'immagine originale: {"navata_01.png": [[x, y, raggio], ...]}
    luci = []
    for f, off in zip(files, scost):
        h = Image.open(f).height; s_ = TERRA * D / (fr(f) * h)
        for x, y, r in cfg.get('luci_pezzo', {}).get(os.path.basename(f), []):
            luci.append(dict(x=round((off + x * s_) / D, 1), y=round(y * s_ / D, 1), r=round(r * s_ / D, 1)))
    luci += [dict(x=l['x'], y=l['y'], r=l.get('r', 50), **({'rosone': 1} if l.get('rosone') else {})) for l in cfg.get('luci', [])]
    # rosone dell'altare: indicato in pixel dell'immagine (fondali.json "rosone_pezzo")
    rp = cfg.get('rosone_pezzo')
    if rp:
        i = [os.path.basename(f) for f in files].index(rp['file'])
        h = Image.open(files[i]).height; s_ = TERRA * D / (fr(files[i]) * h)
        rx, ry, rr = (scost[i] + rp['x'] * s_) / D, rp['y'] * s_ / D, rp['r'] * s_ / D
        luci.append(dict(x=round(rx, 1), y=round(ry, 1), r=round(rr * 1.6, 1), rosone=1))
        cfg['rosone'] = dict(x=round(rx, 1), y=round(ry, 1), r=round(rr, 1))
    fiamme = [dict(x=f['x'], y=f['y'], k=f.get('k', 0.8)) for f in cfg.get('fiamme', [])]
    ros = cfg.get('rosone', {'x': arenaX + 192, 'y': 60, 'r': 40})
    # oggetti di scena dal foglio (fondali.json "oggetti": pezzo, x nell'immagine, strato medio o primo)
    fx = {}; oggetti = []
    fogli = [f for f in glob.glob(os.path.join(c, '*.png')) if 'Elementi' in os.path.basename(f)]
    if fogli and cfg.get('oggetti'):
        pezzi_f = foglio_oggetti(fogli[0])
        nomi = [os.path.basename(f) for f in files]
        for o in cfg['oggetti']:
            idx, hg = OGGETTI[o['ogg']]
            key = 'ch_' + o['ogg']
            if key not in fx:
                im = pezzi_f[idx]; s2 = hg * D / im.shape[0]
                sm = np.array(Image.fromarray(im).resize((max(1, round(im.shape[1] * s2)), max(1, round(hg * D))), Image.Resampling.LANCZOS))
                sm[..., 3] = np.where(sm[..., 3] > 127, 255, 0)
                fx[key] = dict(data=b64png(Image.fromarray(sm)), w=round(sm.shape[1] / D, 1), h=round(sm.shape[0] / D, 1), d=D)
            i = nomi.index(o['pezzo']); h = Image.open(files[i]).height; s_ = TERRA * D / (fr(files[i]) * h)
            oggetti.append(dict(fx=key, x=round((scost[i] + o['x'] * s_) / D, 1), strato=o.get('strato', 'medio'), flip=bool(o.get('specchia'))))
    bg = dict(w=round(W), arenaX=round(arenaX), ingresso=0, d=D, dipinto=1, oggetti=oggetti,
              lontano=lontano, navata=dict(parts=parti(nav), w=round(W)), primo=primo,
              luci=luci, fiamme=fiamme, vetrate=[], porta=dict(x=-999, y=0, w=0, h=0),
              rosone=ros, pilastri=[], giunti=giunti)
    return bg, fx
