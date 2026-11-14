"""Pipeline grafica: fogli sprite -> strisce PNG ripulite e allineate; fondali -> pezzi in scala.
Uso: python3 tools/build_assets.py <cartella_pacchetto> <file_ts_uscita> <cartella_anteprime>"""
import sys, os, io, json, base64
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

ENT = [  # chiave, file, sfondo, righe, posa di riferimento, altezza in gioco, dilatazione
    ('hero_daniele', J('Characters', 'Foglio Sprite_Daniele.png'), 'alpha', HERO_ROWS, 'idle', 54, 12),
    ('hero_marco', J('Characters', 'Foglio Sprite_Marco.png'), 'alpha', HERO_ROWS, 'idle', 54, 12),
    ('hero_michela', J('Characters', 'Foglio Sprite_Michela.png'), 'alpha', HERO_ROWS, 'idle', 52, 12),
    ('hero_roberto', J('Characters', 'Foglio Sprite_Roberto.png'), 'alpha', HERO_ROWS, 'idle', 54, 12),
    ('hero_vero', J('Characters', 'Foglio Sprite_Vero.png'), 'alpha', HERO_ROWS, 'idle', 52, 12),
    ('hero_mattia', J('Characters', 'Foglio sprite_Mattia.png'), 'alpha', HERO_ROWS, 'idle', 54, 12),
    ('vil_gelataia', J('Stage 1 - Street', 'Villains - Gelatai', 'Gelataia.png'), 'alpha', VIL_ROWS, 'walk_01', 56, 12),
    ('vil_gelataio1', J('Stage 1 - Street', 'Villains - Gelatai', 'Gelataio 1.png'), 'alpha', VIL_ROWS, 'walk_01', 56, 12),
    ('vil_gelataio2', J('Stage 1 - Street', 'Villains - Gelatai', 'Gelataio 2.png'), 'black', VIL_ROWS, 'walk_01', 56, 12),
    ('vil_ubriaca', J('Stage 1 - Street', 'Villains - Ubriaconi', 'Ubriaca.png'), 'alpha', VIL_ROWS, 'walk_01', 60, 12),
    ('vil_ubriaco1', J('Stage 1 - Street', 'Villains - Ubriaconi', 'Ubriaco 1.png'), 'alpha', VIL_ROWS, 'walk_01', 60, 12),
    ('vil_ubriaco2', J('Stage 1 - Street', 'Villains - Ubriaconi', 'Ubriaco 2.png'), 'black', VIL_ROWS, 'walk_01', 60, 12),
    ('boss_giova', J('Stage 2 - Bucaneve', 'Boss - Giova', 'Giova.png'), 'black', VIL_ROWS, 'walk_01', 76, 12),
    ('boss_ettore', J('Stage 3 - Ettore_s Basement', 'Boss - Ettore', 'Ettore 2.png'), 'white', ETT_ROWS, 'walk_01', 120, 4),
]

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
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def b64jpg(im, q=88):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, subsampling=0)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

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
    s = target / rh
    fr = {}
    for n, im in raw.items():
        sm = to_small(im, s)
        if mode != 'black': sm = ink(sm)
        if mode == 'black':
            sm = despeckle(sm); sm = np.pad(sm, ((1, 1), (1, 1), (0, 0))); sm = outline(sm)
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
    strip = Image.new('RGBA', (cw * len(names), ch))
    muzzle = {}
    for i, n in enumerate(names):
        sm, cx = fr[n]
        ox = int(round(half - cx)); oy = foot - sm.shape[0]
        strip.alpha_composite(Image.fromarray(sm), (i * cw + ox, oy))
        m = sm[..., 3] > 0; ys, xs = np.where(m); h = sm.shape[0]
        if n == 'shoot_up':
            k = ys.argmin()
        else:
            sel = (ys > h * 0.12) & (ys < h * 0.62)
            if not sel.any(): sel = ys >= 0
            idx = np.where(sel)[0]; k = idx[xs[idx].argmax()]
        muzzle[n] = [int(xs[k] + ox - half), int(ys[k] + oy - foot)]
    SHEETS[key] = dict(data=b64png(strip), cw=cw, ch=ch, foot=foot, frames=names, muzzle=muzzle)
    report.append(f'{key}: cella {cw}x{ch}, piedi y={foot}, {len(names)} fotogrammi, scala {s:.3f}')
    # anteprima x2 su grigio con linea dei piedi
    pv = Image.new('RGBA', strip.size, (70, 78, 92, 255)); pv.alpha_composite(strip)
    d = np.array(pv); d[foot, :, :3] = (200, 50, 50)
    for i in range(len(names)): d[:, i * cw, :3] = (40, 44, 52)
    Image.fromarray(d).resize((strip.width * 2, ch * 2), Image.NEAREST).save(f'{PREV}/{key}.png')

# --- ritratto grande di Ettore (scheda di presentazione) ---
a = peel(load_mask(J('Stage 3 - Ettore_s Basement', 'Boss - Ettore', 'Ettore 1.png'), 'white'))
R = rows(components(a, dil=6)); por = R[0][1]['img']
hh = (por[..., 3] > 0).any(1).sum(); sm = to_small(por, 150 / hh)
SHEETS['ettore_ritratto'] = dict(data=b64png(Image.fromarray(sm)), cw=sm.shape[1], ch=sm.shape[0], foot=sm.shape[0], frames=['x'], muzzle={})

# --- fondali ---
BG = {}
def scaled(path, s):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
GROUND = 180; VH = 216
S_STREET = 0.415
street_files = ['Borgo Alpino Sotto la Tempesta.png', 'Immagine ChatGPT 12 nov 2026, 23_19_06.png',
                'Immagine ChatGPT 12 nov 2026, 23_19_52.png', 'Immagine ChatGPT 12 nov 2026, 23_20_56.png']
def crop_ground(im, feet_frac, s, H0):
    fy = feet_frac * H0 * s; top = int(round(fy - GROUND))
    return im.crop((0, top, im.width, top + VH))
pieces = [crop_ground(scaled(J('Stage 1 - Street', 'Background', f), S_STREET), 0.905, S_STREET, 941) for f in street_files]
bar = crop_ground(scaled(J('Stage 2 - Bucaneve', 'Background', 'Esterno Bucaneve 2D.png'), S_STREET), 0.905, S_STREET, 941)
pieces.append(bar)
# Giunzioni: invece di dissolvere (che creava "palazzi fantasma") cerchiamo la coppia di colonne
# piu' simili ai bordi dei due pezzi e tagliamo li', con una sfumatura di pochi pixel.
SEARCH, BL = 150, 6
strip = np.array(pieces[0]).astype(float)
seams = []; bar_x = 0
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
street = Image.fromarray(strip.clip(0, 255).astype(np.uint8))
# a pezzi da 512 px (texture piccole)
parts = []
for x in range(0, street.width, 512):
    parts.append(b64jpg(street.crop((x, 0, min(street.width, x + 512), VH))))
BG['street'] = dict(parts=parts, w=street.width, barX=bar_x, barW=bar.width, seams=seams)
street.save(f'{PREV}/fondale_strada.png')
S_CELL = 0.32
cel = crop_ground(scaled(J('Stage 3 - Ettore_s Basement', 'Backgrounds', 'Deposito Gelati Vintage in Pixel Art (1).png'), S_CELL), 0.80, S_CELL, 941)
BG['cellar'] = dict(parts=[b64jpg(cel)], w=cel.width)
cel.save(f'{PREV}/fondale_cantina.png')
report.append(f'strada: {street.width} px (bar da x={bar_x}, giunzioni {seams}), cantina: {cel.width} px')

with open(OUT_TS, 'w') as f:
    f.write('// GENERATO da tools/build_assets.py - non modificare a mano.\n')
    f.write('export interface SheetDef { data: string; cw: number; ch: number; foot: number; frames: string[]; muzzle: Record<string, [number, number]> }\n')
    f.write('export const SHEETS: Record<string, SheetDef> = ' + json.dumps(SHEETS) + ';\n')
    f.write('export const BG: { street: { parts: string[]; w: number; barX: number; barW: number; seams: number[] }; cellar: { parts: string[]; w: number } } = ' + json.dumps(BG) + ';\n')
print('\n'.join(report)); print('ts', os.path.getsize(OUT_TS) // 1024, 'KB')
