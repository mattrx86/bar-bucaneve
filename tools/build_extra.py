"""Oggetti scenici (foglio unico) e voci registrate -> src/content/extra.ts
Uso: python3 tools/build_extra.py grafica/oggetti/oggetti.png grafica/voci src/content/extra.ts <anteprima.png>
Le voci possono essere .m4a .mp3 .wav .ogg: vengono pulite (silenzi), normalizzate e convertite in mp3 con ffmpeg."""
import sys, os, io, json, base64, subprocess, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from sheet import load_mask, peel, components, ink

def to_small(img, s):
    h, w = img.shape[:2]
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    pre = img.astype(float); pre[..., :3] *= pre[..., 3:4] / 255
    r = np.array(Image.fromarray(pre.clip(0, 255).astype(np.uint8), 'RGBA').resize((nw, nh), Image.BOX)).astype(float)
    a = r[..., 3]
    rgb = np.where(a[..., None] > 0, r[..., :3] * 255 / np.maximum(a[..., None], 1), 0)
    return np.dstack([rgb.clip(0, 255), (a > 120) * 255]).astype(np.uint8)

def b64png(im):
    if im.mode == 'RGBA': im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

SHEET, VOCI, OUT, PREV = sys.argv[1:5]
# nome e altezza in gioco (px; l'eroe e' alto 54) riga per riga, da sinistra a destra
NOMI = [
    [('botte_grande', 40), ('botti_pila', 36), ('botte', 26), ('cassa_vino', 20), ('casse_pila', 36), ('sacchi', 18), ('bidone_latte', 28)],
    [('carretto', 46), ('vetrina_gelati', 32), ('freezer', 22), ('frigo', 50), ('fusto', 22), ('casse_rosse', 22), ('scatoloni', 28), ('carrello', 38)],
    [('scaffale1', 52), ('scaffale2', 52), ('scaffale3', 52), ('banco_attrezzi', 34), ('gomme', 28), ('transenna', 30), ('cono', 16)],
    [('divano', 30), ('jukebox', 46), ('tv', 34), ('radio', 30), ('pianta', 30), ('sedia', 28), ('tavolo', 30), ('ombrellone', 56)],
    [('fusti_pallet', 26), ('bombole', 30), ('fusto_rosso', 26), ('cassonetto', 32), ('cestino', 26), ('sacchi_rifiuti', 18), ('pallet', 10), ('salumi', 46)],
]
B = [0, 245, 478, 688, 875, 1024]
a = peel(load_mask(SHEET, 'alpha'))
C = components(a, dil=3, minpx=300)
props = {}
for k, riga in enumerate(NOMI):
    r = sorted([c for c in C if B[k] <= (c['y0'] + c['y1']) / 2 < B[k + 1]], key=lambda c: c['x0'])
    if len(r) != len(riga): raise SystemExit(f'riga {k}: trovati {len(r)} oggetti, attesi {len(riga)}')
    for (nome, h), c in zip(riga, r):
        img = c['img']; hh = (img[..., 3] > 0).any(1).sum()
        d = round(min(3, hh / h), 2)  # densita' come per gli sprite
        sm = ink(to_small(img, h * d / hh))
        m = sm[..., 3] > 0; ys, xs = np.where(m)
        sm = sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        props[nome] = dict(data=b64png(Image.fromarray(sm)), w=round(sm.shape[1] / d, 1), h=round(sm.shape[0] / d, 1), d=d)
# anteprima
ims = [Image.open(io.BytesIO(base64.b64decode(p['data'].split(',')[1]))).convert('RGBA') for p in props.values()]
W = sum(i.width + 8 for i in ims); H = max(i.height for i in ims)
pv = Image.new('RGBA', (W, H + 2), (70, 78, 92, 255)); x = 0
for im in ims: pv.alpha_composite(im, (x, H - im.height)); x += im.width + 8
pv.save(PREV)
voci = {}
tmp = tempfile.mkdtemp()
for f in sorted(os.listdir(VOCI)):
    nome, ext = os.path.splitext(f)
    if ext.lower() not in ('.m4a', '.mp3', '.wav', '.ogg', '.aac'): continue
    out = os.path.join(tmp, nome + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(VOCI, f), '-af',
                    'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.4,loudnorm=I=-14:TP=-1.5',
                    '-ac', '1', '-ar', '32000', '-b:a', '72k', out], check=True)
    voci[nome.lower()] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
with open(OUT, 'w') as f:
    f.write('// GENERATO da tools/build_extra.py - non modificare a mano.\n')
    f.write('export const PROPS: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(props) + ';\n')
    f.write('export const VOCI: Record<string, string> = ' + json.dumps(voci) + ';\n')
print(len(props), 'oggetti,', len(voci), 'voci,', os.path.getsize(OUT) // 1024, 'KB')
