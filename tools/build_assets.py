"""Pipeline grafica: fogli sprite -> strisce PNG ripulite e allineate; fondali -> pezzi in scala.
Uso: python3 tools/build_assets.py grafica src/content/sprites.ts <cartella_anteprime>"""
import sys, os, io, json, base64, glob
import numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from sheet import load_mask, peel, peel_dark, outline, despeckle, components, rows, ink

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
    h, w = img.shape[:2]
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    pre = img.astype(float); pre[..., :3] *= pre[..., 3:4] / 255
    r = np.array(Image.fromarray(pre.clip(0, 255).astype(np.uint8), 'RGBA').resize((nw, nh), Image.BOX)).astype(float)
    a = r[..., 3]
    rgb = np.where(a[..., None] > 0, r[..., :3] * 255 / np.maximum(a[..., None], 1), 0)
    out = np.dstack([rgb.clip(0, 255), (a > 120) * 255]).astype(np.uint8)
    return out

def b64png(im):
    # 256 colori con trasparenza: file ~3 volte piu' leggeri, differenza invisibile su pixel art
    if im.mode == 'RGBA': im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def b64jpg(im, q=88):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, subsampling=0)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

DMAX = 3  # densita' massima delle texture (il gioco e' 384x216, disegnato a 3x = 1152x648)
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
        for n, c in zip(names, r): raw[n] = c['img']
    ref = raw[refpose]; rh = (ref[..., 3] > 0).any(1).sum()
    # densita': la texture ha d pixel per ogni pixel del gioco (max DMAX, mai ingrandire l'originale)
    d = round(min(DMAX, rh / target), 2)
    s = target * d / rh
    fr = {}
    for n, im in raw.items():
        sm = to_small(im, s)
        if mode != 'black': sm = ink(sm)
        if mode == 'black':
            sm = despeckle(sm, minpx=int(4 * d * d)); sm = np.pad(sm, ((1, 1), (1, 1), (0, 0))); sm = outline(sm)
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
hh = (por[..., 3] > 0).any(1).sum(); dr = round(min(DMAX, hh / 150), 2); sm = ink(to_small(por, 150 * dr / hh))
SHEETS['ettore_ritratto'] = dict(data=b64png(Image.fromarray(sm)), cw=sm.shape[1], ch=sm.shape[0], foot=sm.shape[0], d=dr, frames=['x'], muzzle={})

# --- fondali ---
BG = {}
def scaled(path, s):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
GROUND = 180; VH = 216
S_STREET = 0.415
def crop_ground(im, feet_frac, s, H0):
    fy = feet_frac * H0 * s; top = int(round(fy - GROUND))
    return im.crop((0, top, im.width, top + VH))
pieces = [crop_ground(scaled(f, S_STREET), 0.905, S_STREET, Image.open(f).height) for f in cartella('livello1-strada', 'fondali')]
_b = J('livello2-bucaneve', 'fondale', 'esterno.png'); bar = crop_ground(scaled(_b, S_STREET), 0.905, S_STREET, Image.open(_b).height)
pieces.append(bar)
# Giunzioni: invece di dissolvere (che creava "palazzi fantasma") cerchiamo la coppia di colonne
# piu' simili ai bordi dei due pezzi e tagliamo li', con una sfumatura di pochi pixel.
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
    blend = strip[:, ia - BL:ia] * (1 - t) + q[:, ib - BL:ib] * t
    strip = np.concatenate([strip[:, :ia - BL], blend, q[:, ib:]], 1)
    seams.append(ia - BL // 2)
    if n == len(pieces) - 1: bar_x = ia - ib  # inizio (virtuale) del pezzo del bar
    cuts.append((ia, ib))
street = Image.fromarray(strip.clip(0, 255).astype(np.uint8))
# stessa strada ad alta densita' (DB pixel per pixel di gioco), con gli stessi tagli
DB = 2.5
def hi(path):
    im = Image.open(path).convert('RGB'); H0 = im.height
    im = im.resize((round(im.width * S_STREET * DB), round(im.height * S_STREET * DB)), Image.LANCZOS)
    top = int(round((0.905 * H0 * S_STREET - GROUND) * DB))
    return np.array(im.crop((0, top, im.width, top + int(VH * DB)))).astype(float)
hp = [hi(f) for f in cartella('livello1-strada', 'fondali')] + [hi(_b)]
hs = hp[0]; bl = int(BL * DB)
for q, (ia, ib) in zip(hp[1:], cuts):
    a_, b_ = int(round(ia * DB)), int(round(ib * DB))
    t = np.linspace(0, 1, bl)[None, :, None]
    hs = np.concatenate([hs[:, :a_ - bl], hs[:, a_ - bl:a_] * (1 - t) + q[:, b_ - bl:b_] * t, q[:, b_:]], 1)
hstreet = Image.fromarray(hs.clip(0, 255).astype(np.uint8))
# a pezzi da 512 pixel di gioco (texture <= 4096)
parts = []; P = int(512 * DB)
for x in range(0, hstreet.width, P):
    parts.append(b64jpg(hstreet.crop((x, 0, min(hstreet.width, x + P), hstreet.height))))
BG['street'] = dict(parts=parts, w=street.width, barX=bar_x, barW=bar.width, seams=seams, d=DB)
street.save(f'{PREV}/fondale_strada.png')
S_CELL = 0.32
_c = J('livello3-cantina', 'fondale', 'cantina.png'); cel = crop_ground(scaled(_c, S_CELL), 0.80, S_CELL, Image.open(_c).height)
DC = 3
_ci = Image.open(_c).convert('RGB'); _H0 = _ci.height
_ci = _ci.resize((round(_ci.width * S_CELL * DC), round(_H0 * S_CELL * DC)), Image.LANCZOS)
_top = int(round((0.80 * _H0 * S_CELL - GROUND) * DC))
celh = _ci.crop((0, _top, _ci.width, _top + VH * DC))
BG['cellar'] = dict(parts=[b64jpg(celh)], w=cel.width, d=DC)
cel.save(f'{PREV}/fondale_cantina.png')
report.append(f'strada: {street.width} px (bar da x={bar_x}, giunzioni {seams}), cantina: {cel.width} px')

with open(OUT_TS, 'w') as f:
    f.write('// GENERATO da tools/build_assets.py - non modificare a mano.\n')
    f.write('export interface SheetDef { data: string; cw: number; ch: number; foot: number; d: number; frames: string[]; muzzle: Record<string, [number, number]> }\n')
    f.write('export const SHEETS: Record<string, SheetDef> = ' + json.dumps(SHEETS) + ';\n')
    f.write('export const BG: { street: { parts: string[]; w: number; barX: number; barW: number; seams: number[]; d: number }; cellar: { parts: string[]; w: number; d: number } } = ' + json.dumps(BG) + ';\n')
print('\n'.join(report)); print('ts', os.path.getsize(OUT_TS) // 1024, 'KB')
