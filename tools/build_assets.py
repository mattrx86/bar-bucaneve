"""Pipeline grafica: fogli sprite -> strisce PNG ripulite e allineate; fondali -> pezzi in scala.
Uso: python3 tools/build_assets.py grafica src/content/sprites.ts <cartella_anteprime>"""
import sys, os, io, json, base64, glob
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from sheet import estrai_o_ritocca, load_mask, peel, peel_dark, outline, despeckle, components, rows, ink

PKG, OUT_TS, PREV = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(PREV, exist_ok=True)
J = lambda *p: os.path.join(PKG, *p)

HERO_ROWS = [['idle', 'jump', 'crouch', 'shoot', 'shoot_up', 'crouch_shoot', 'jump_shoot'],
             ['hit', 'death_01', 'death_02', 'death_03'],
             [f'run_{i:02d}' for i in range(1, 9)],
             ['melee_01', 'melee_02', 'melee_03', 'bomb_01', 'bomb_02', 'bomb_03'],
             ['win_01', 'win_02']]
VIL_ROWS = [[f'walk_{i:02d}' for i in range(1, 7)], ['attack_01', 'attack_02', 'attack_03'],
            ['hit', 'death_01', 'death_02', 'death_03']]
ETT_ROWS = [[f'walk_{i:02d}' for i in range(1, 5)], ['idle', 'tele_01', 'tele_02', 'shoot_01'],
            ['shoot_02', 'reload_01', 'reload_02', 'reload_03'], ['hit', 'death_01', 'death_02', 'death_03', 'death_04']]

def modo(path):
    """Capisce da solo lo sfondo del foglio: trasparente, nero o bianco."""
    im = np.array(Image.open(path).convert('RGBA')).astype(int)
    if (im[..., 3] < 128).mean() > 0.2: return 'alpha'
    c = np.concatenate([im[:4, :4, :3].reshape(-1, 3), im[-4:, -4:, :3].reshape(-1, 3)]).mean(0)
    return 'black' if c.mean() < 60 else 'white'

def cartella(*p): return sorted(glob.glob(J(*p, '*.png')))

# Eroi: ogni PNG in grafica/personaggi diventa un personaggio (il nome del file = il nome)
ALTEZZA_EROE = {'michela': 52, 'vero': 52}
ENT = []  # chiave, file, sfondo, righe, posa di riferimento, altezza in gioco, dilatazione
for f in cartella('personaggi'):
    nome = os.path.splitext(os.path.basename(f))[0].lower()
    ENT.append((f'hero_{nome}', f, modo(f), HERO_ROWS, 'idle', ALTEZZA_EROE.get(nome, 54), 12))
for f in cartella('livello1-strada', 'gelatai'):
    ENT.append(('vil_' + os.path.splitext(os.path.basename(f))[0].lower(), f, modo(f), VIL_ROWS, 'walk_01', 56, 12))
for f in cartella('livello1-strada', 'ubriachi'):
    ENT.append(('vil_' + os.path.splitext(os.path.basename(f))[0].lower(), f, modo(f), VIL_ROWS, 'walk_01', 60, 12))
_g = J('livello2-bucaneve', 'boss-giova', 'giova.png'); ENT.append(('boss_giova', _g, modo(_g), VIL_ROWS, 'walk_01', 76, 12))
_e = J('livello3-cantina', 'boss-ettore', 'pose.png'); ENT.append(('boss_ettore', _e, modo(_e), ETT_ROWS, 'walk_01', 120, 4))

def to_small(img, s):
    """Riduce mantenendo pixel netti: niente colori intermedi creati dal filtro BOX."""
    h, w = img.shape[:2]
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    rgba = Image.fromarray(img.astype(np.uint8), 'RGBA').resize((nw, nh), Image.Resampling.NEAREST)
    out = np.array(rgba, dtype=np.uint8)
    visible = out[..., 3] > 120
    out[..., 3] = visible.astype(np.uint8) * 255
    out[~visible, :3] = 0
    return out

def b64png(im):
    # 256 colori con trasparenza: file ~3 volte piu' leggeri, differenza invisibile su pixel art
    if im.mode == 'RGBA': im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def b64jpg(im, q=88):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, subsampling=0)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

# DENSITA': pixel di texture per pixel di gioco. Il gioco ragiona in 384x216 e disegna a 3x (1152x648):
# con 1.5 ogni pixel dei disegni diventa un quadrato di 2x2 pixel dello schermo, uguale per TUTTO
# (personaggi, oggetti, casse, effetti, fondali). Valori possibili: 1 (pixel enormi), 1.5, 3 (pixel fini).
DMAX = 1.5
SHEETS = {}
report = []
for key, path, mode, ROWS, refpose, target, dil in ENT:
    a = load_mask(path, mode)
    if mode != 'black': a = peel(a)
    R = rows(components(a, dil=dil))
    got = [len(r) for r in R]; want = [len(r) for r in ROWS]
    if got != want:
        raise SystemExit(f'{key}: righe trovate {got}, attese {want}')
    raw = {}
    for names, r in zip(ROWS, R):
        for n, c in zip(names, r):
            raw[n], rit = estrai_o_ritocca(key, n, c['img'])
            if rit: report.append(f'  ritocco usato: {key}/{n}')
    ref = raw[refpose]; rh = (ref[..., 3] > 0).any(1).sum()
    # densita': la texture ha d pixel per ogni pixel del gioco (max DMAX, mai ingrandire l'originale)
    d = DMAX  # stessa grandezza di pixel per tutti
    s = target * d / rh
    fr = {}
    is_character = key.startswith(('hero_', 'vil_', 'boss_'))
    for n, im in raw.items():
        sm = to_small(im, s)
        if is_character and mode != 'black':
            # Contorno esterno nero netto a gradini: preserva pixel interni, palette e disegno.
            # Un pixel trasparente di margine evita di tagliare il bordo sui lati della posa.
            sm = np.pad(sm, ((1, 1), (1, 1), (0, 0)), constant_values=0)
            sm = outline(sm, col=(6, 6, 8))
        elif mode != 'black':
            sm = ink(sm, erodi=d >= 2)
        if mode == 'black':
            sm = despeckle(sm, minpx=int(4 * d * d)); sm = np.pad(sm, ((1, 1), (1, 1), (0, 0))); sm = outline(sm, col=(6, 6, 8))
        m = sm[..., 3] > 0
        ys, xs = np.where(m)
        sm = sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = sm[..., 3] > 0
        h = sm.shape[0]
        low = m[int(h * 0.6):]
        cx = np.where(low)[1].mean() if low.any() else sm.shape[1] / 2
        fr[n] = (sm, cx)
    L = int(np.ceil(max(cx for sm, cx in fr.values()))) + 2
    Rr = int(np.ceil(max(sm.shape[1] - cx for sm, cx in fr.values()))) + 2
    half = max(L, Rr)
    cw = 2 * half; ch = max(sm.shape[0] for sm, cx in fr.values()) + 3
    foot = ch - 2
    names = [n for row in ROWS for n in row]
    cols = max(1, min(len(names), 4000 // cw)); nrow = -(-len(names) // cols)  # griglia: texture <= 4096 px
    strip = Image.new('RGBA', (cw * cols, ch * nrow))
    muzzle = {}
    for i, n in enumerate(names):
        sm, cx = fr[n]
        ox = int(round(half - cx)); oy = foot - sm.shape[0]
        strip.alpha_composite(Image.fromarray(sm), ((i % cols) * cw + ox, (i // cols) * ch + oy))
        m = sm[..., 3] > 0; ys, xs = np.where(m); h = sm.shape[0]
        if n == 'shoot_up':
            k = ys.argmin()
        else:
            sel = (ys > h * 0.12) & (ys < h * 0.62)
            if not sel.any(): sel = ys >= 0
            idx = np.where(sel)[0]; k = idx[xs[idx].argmax()]
        muzzle[n] = [round((xs[k] + ox - half) / d, 1), round((ys[k] + oy - foot) / d, 1)]  # in pixel di gioco
    SHEETS[key] = dict(data=b64png(strip), cw=cw, ch=ch, foot=foot, d=d, frames=names, muzzle=muzzle)
    report.append(f'{key}: cella {cw}x{ch}, densita {d}, {len(names)} fotogrammi, scala {s:.3f}')
    # anteprima x2 su grigio con linea dei piedi
    pv = Image.new('RGBA', strip.size, (70, 78, 92, 255)); pv.alpha_composite(strip)
    pv.save(f'{PREV}/{key}.png')

# --- ritratto grande di Ettore (scheda di presentazione) ---
_r = J('livello3-cantina', 'boss-ettore', 'ritratto.png'); a = peel(load_mask(_r, modo(_r)))
R = rows(components(a, dil=6)); por = R[0][1]['img']
hh = (por[..., 3] > 0).any(1).sum(); dr = DMAX; sm = ink(to_small(por, 150 * dr / hh))
SHEETS['ettore_ritratto'] = dict(data=b64png(Image.fromarray(sm)), cw=sm.shape[1], ch=sm.shape[0], foot=sm.shape[0], d=dr, frames=['x'], muzzle={})

# --- fondali ---
# Ogni fondale viene allineato in modo che i piedi dei personaggi stiano SULLA STRADA (o sul
# pavimento), non a meta' altezza. La fascia di strada/pavimento viene anche prolungata verso il
# basso ripetendola, cosi' sotto i piedi c'e' sempre terreno.
BG = {}
GROUND = 180; VH = 216
S_STREET = 0.42   # scala dei fondali della strada: le porte sono alte circa quanto un personaggio
S_CELL = 0.32

def fascia_strada(a):
    """Inizio della strada: la riga piu' bassa (sotto l'80%) oltre la quale tutte le righe sono uniformi."""
    L = a.astype(float).mean(2); H = L.shape[0]
    std = L.std(1)
    y = H - 1
    while y > H * 0.8 and std[y] < 14: y -= 1
    return y + 1, H

def prepara(path, tipo):
    im = np.array(Image.open(path).convert('RGB')); H = im.shape[0]
    if tipo == 'strada':
        # piedi a distanza fissa dal bordo del marciapiede: cosi' il marciapiede e' alla stessa
        # altezza in tutti i pezzi e alle giunzioni non ci sono scalini
        a, b = fascia_strada(im); piede = a + 0.045 * H
    else:  # cantina (fondale del 15/11): pavimento principale tra il 70% e l'82% dell'altezza,
        # sotto c'e' il gradino con le strisce gialle e nere che resta visibile in basso
        a, b = int(H * 0.700), int(H * 0.820); piede = int(H * 0.775)
    band = im[a:b] if tipo == 'strada' else im[-60:]
    pezzi = [im]; k = 0
    while sum(x.shape[0] for x in pezzi) < H + 400:
        pezzi.append(band if k % 2 else band[::-1]); k += 1  # ripetizione a specchio: niente righe visibili
    return np.concatenate(pezzi, 0), piede

def pezzo(path, tipo, S, dens):
    im, piede = prepara(path, tipo)
    # Grading da fondale: meno saturo e leggermente meno contrastato dei personaggi.
    pil = Image.fromarray(im)
    pil = ImageEnhance.Color(pil).enhance(0.84)
    pil = ImageEnhance.Contrast(pil).enhance(0.92)
    pil = ImageEnhance.Brightness(pil).enhance(0.99)
    pil = pil.resize((round(pil.width * S * dens), round(pil.height * S * dens)), Image.LANCZOS)
    top = int(round((piede * S - GROUND) * dens))
    if top < 0:  # immagine troppo bassa: si aggiunge cielo ripetendo la prima riga
        pil2 = Image.new('RGB', (pil.width, pil.height - top)); pil2.paste(pil.crop((0, 0, pil.width, 1)).resize((pil.width, -top)), (0, 0)); pil2.paste(pil, (0, -top)); pil = pil2; top = 0
    return pil.crop((0, top, pil.width, top + int(round(VH * dens))))

def montagne_in_lontananza(image, dens=1.0):
    """Doppia cresta alpina blu-grigia integrata nella vegetazione di fondo.

    La maschera cromatica evita facciate, finestre, insegne e strada. Non è una
    parallasse autonoma: è un intervento pittorico sullo skyline già appiattito.
    """
    arr = np.array(image.convert('RGB'), dtype=np.uint8)
    h, w = arr.shape[:2]
    if h < int(130 * dens) or w < int(150 * dens):
        return image

    yy, xx = np.mgrid[0:h, 0:w]
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    lum = (r * 30 + g * 59 + b * 11) / 100
    # Vegetazione scura nella fascia alta: esclude pietra, legno, vetri e illuminazione.
    vegetazione = (
        (yy < int(96 * dens)) & (lum < 108) &
        (g > r + 9) & (g > b + 2) &
        (r < 68) & (g < 100) & (b < 78)
    )

    def cresta(base, ampiezze, passo):
        fill = Image.new('L', (w, h), 0)
        edge = Image.new('L', (w, h), 0)
        df, de = ImageDraw.Draw(fill), ImageDraw.Draw(edge)
        punti = [(0, int(base * dens))]
        i = 0
        x = 0
        while x < w:
            span = int(passo * dens)
            a1, a2, a3 = ampiezze[i % len(ampiezze)]
            punti.extend([
                (min(w, x + int(span * 0.18)), int((base - a1 * 0.58) * dens)),
                (min(w, x + int(span * 0.39)), int((base - a1) * dens)),
                (min(w, x + int(span * 0.57)), int((base - a2 * 0.42) * dens)),
                (min(w, x + int(span * 0.75)), int((base - a2) * dens)),
                (min(w, x + int(span * 0.91)), int((base - a3 * 0.52) * dens)),
                (min(w, x + span), int(base * dens)),
            ])
            x += span
            i += 1
        polygon = punti + [(w, h), (0, h)]
        df.polygon(polygon, fill=255)
        de.line(punti, fill=255, width=max(1, int(2 * dens)))
        return np.asarray(fill, dtype=np.uint8) > 0, np.asarray(edge, dtype=np.uint8) > 0

    # Due profili sfalsati: la cresta chiara è più lontana, quella scura più vicina.
    back, back_edge = cresta(98, [(43, 50, 36), (48, 39, 45), (39, 52, 34), (46, 42, 49)], 265)
    near, near_edge = cresta(106, [(23, 29, 18), (27, 20, 25), (21, 31, 17), (25, 22, 29)], 315)
    out = arr.astype(float)
    for mask, col, alpha in (
        (back & vegetazione, np.array([77, 101, 128], dtype=float), 0.62),
        (near & vegetazione, np.array([57, 79, 103], dtype=float), 0.56),
    ):
        out[mask] = out[mask] * (1.0 - alpha) + col * alpha
    # Un filo freddo lungo i crinali rende leggibile la silhouette anche a scala di gioco.
    for mask in (back_edge & vegetazione, near_edge & vegetazione):
        out[mask] = out[mask] * 0.30 + np.array([142, 162, 181], dtype=float) * 0.70
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGB')

files_strada = cartella('livello1-strada', 'fondali')
_b = J('livello2-bucaneve', 'fondale', 'esterno.png')
pieces = [pezzo(f, 'strada', S_STREET, 1) for f in files_strada] + [pezzo(_b, 'strada', S_STREET, 1)]
bar = pieces[-1]
# Giunzioni: cerchiamo la coppia di colonne piu' simili ai bordi dei due pezzi e tagliamo li'.
SEARCH, BL = 150, 6
strip = np.array(pieces[0]).astype(float)
seams = []; bar_x = 0; cuts = []
for n, p in enumerate(pieces[1:], 1):
    q = np.array(p).astype(float)
    A = strip[:172]; Bq = q[:172]
    best = None
    for ia in range(strip.shape[1] - SEARCH, strip.shape[1] - BL):
        ca = A[:, ia - 2:ia + 1].mean(1)
        for ib in range(BL, SEARCH):
            d = np.abs(ca - Bq[:, ib - 2:ib + 1].mean(1)).mean()
            if best is None or d < best[0]: best = (d, ia, ib)
    _, ia, ib = best
    t = np.linspace(0, 1, BL)[None, :, None]
    strip = np.concatenate([strip[:, :ia - BL], strip[:, ia - BL:ia] * (1 - t) + q[:, ib - BL:ib] * t, q[:, ib:]], 1)
    seams.append(ia - BL // 2); cuts.append((ia, ib))
    if n == len(pieces) - 1: bar_x = ia - ib  # inizio (virtuale) del pezzo del bar
street_prima_montagne = Image.fromarray(strip.clip(0, 255).astype(np.uint8))
street = montagne_in_lontananza(street_prima_montagne, 1.0)
# stessa strada alla densita' finale, con gli stessi tagli
DB = DMAX
hp = [np.array(pezzo(f, 'strada', S_STREET, DB)).astype(float) for f in files_strada + [_b]]
hs = hp[0]; bl = max(2, int(BL * DB))
for q, (ia, ib) in zip(hp[1:], cuts):
    a_, b_ = int(round(ia * DB)), int(round(ib * DB))
    t = np.linspace(0, 1, bl)[None, :, None]
    hs = np.concatenate([hs[:, :a_ - bl], hs[:, a_ - bl:a_] * (1 - t) + q[:, b_ - bl:b_] * t, q[:, b_:]], 1)
hstreet = montagne_in_lontananza(Image.fromarray(hs.clip(0, 255).astype(np.uint8)), DB)
street_prima_montagne.save(f'{PREV}/fondale_strada_prima_montagne.png')
parts = []; P = int(512 * DB)
for x in range(0, hstreet.width, P):
    parts.append(b64jpg(hstreet.crop((x, 0, min(hstreet.width, x + P), hstreet.height))))
BG['street'] = dict(parts=parts, w=street.width, barX=bar_x, barW=bar.width, seams=seams, d=DB)
street.save(f'{PREV}/fondale_strada.png')
_c = J('livello3-cantina', 'fondale', 'cantina.png')
cel = pezzo(_c, 'cantina', S_CELL, 1)
DC = DMAX
celh = pezzo(_c, 'cantina', S_CELL, DC)
BG['cellar'] = dict(parts=[b64jpg(celh)], w=cel.width, d=DC)
cel.save(f'{PREV}/fondale_cantina.png')
report.append(f'strada: {street.width} px (bar da x={bar_x}, giunzioni {seams}), cantina: {cel.width} px')

with open(OUT_TS, 'w') as f:
    f.write('// GENERATO da tools/build_assets.py - non modificare a mano.\n')
    f.write('export interface SheetDef { data: string; cw: number; ch: number; foot: number; d: number; frames: string[]; muzzle: Record<string, [number, number]> }\n')
    f.write('export const SHEETS: Record<string, SheetDef> = ' + json.dumps(SHEETS) + ';\n')
    f.write('export const BG: { street: { parts: string[]; w: number; barX: number; barW: number; seams: number[]; d: number }; cellar: { parts: string[]; w: number; d: number } } = ' + json.dumps(BG) + ';\n')
print('\n'.join(report)); print('ts', os.path.getsize(OUT_TS) // 1024, 'KB')
