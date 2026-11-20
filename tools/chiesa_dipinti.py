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


def cuci(pezzi, cerca=150, sfuma=8):
    """Cuce i pezzi da sinistra a destra: giunzione sulle colonne piu' simili, sfumata su `sfuma` pixel."""
    strip = pezzi[0].astype(float); giunti = []
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
        giunti.append((ia - sfuma // 2) / D)
    out = strip.clip(0, 255).astype(np.uint8)
    out[..., 3] = np.where(out[..., 3] > 127, 255, 0)
    return out, giunti


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
    nav, giunti = cuci(pezzi)
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
        lon, _ = cuci(lp) if len(lp) > 1 else (lp[0], [])
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
    # luci e fiamme: solo quelle indicate in fondali.json (posizioni in pixel di gioco sul fondale cucito)
    luci = [dict(x=l['x'], y=l['y'], r=l.get('r', 50), **({'rosone': 1} if l.get('rosone') else {})) for l in cfg.get('luci', [])]
    fiamme = [dict(x=f['x'], y=f['y'], k=f.get('k', 0.8)) for f in cfg.get('fiamme', [])]
    ros = cfg.get('rosone', {'x': arenaX + 192, 'y': 60, 'r': 40})
    bg = dict(w=round(W), arenaX=round(arenaX), ingresso=0, d=D, dipinto=1,
              lontano=lontano, navata=dict(parts=parti(nav), w=round(W)), primo=primo,
              luci=luci, fiamme=fiamme, vetrate=[], porta=dict(x=-999, y=0, w=0, h=0),
              rosone=ros, pilastri=[], giunti=giunti)
    return bg, {}
