"""Oggetti scenici (foglio unico) e voci registrate -> src/content/extra.ts
Uso: python3 tools/build_extra.py grafica/oggetti/oggetti.png grafica/voci src/content/extra.ts <anteprima.png>
Le voci possono essere .m4a .mp3 .wav .ogg: vengono pulite (silenzi), normalizzate e convertite in mp3 con ffmpeg."""
import sys, os, io, json, base64, subprocess, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from sheet import load_mask, peel, components, ink, estrai_o_ritocca

def to_small(img, s):
    """Riduce senza interpolare i colori: pixel netti e alpha binario."""
    h, w = img.shape[:2]
    nh, nw = max(1, round(h * s)), max(1, round(w * s))
    rgba = Image.fromarray(img.astype(np.uint8), 'RGBA').resize((nw, nh), Image.Resampling.NEAREST)
    out = np.array(rgba, dtype=np.uint8)
    visible = out[..., 3] > 120
    out[..., 3] = visible.astype(np.uint8) * 255
    out[~visible, :3] = 0
    return out

def b64png(im):
    if im.mode == 'RGBA': im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

SHEET, VOCI, OUT, PREV = sys.argv[1:5]
ARMI = sys.argv[5] if len(sys.argv) > 5 else None
MUSICA = sys.argv[6] if len(sys.argv) > 6 else None
# Gli oggetti distruttibili erano poco leggibili perche' troppo piccoli rispetto ai personaggi:
# una botte alta 26 px accanto a un eroe di 54 px si perdeva nel fondale. Un unico fattore
# li ingrandisce tutti insieme, cosi' restano coerenti fra loro (rimettere 1.0 per tornare indietro).
SCALA_OGGETTI = 1.3
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
        img, _ = estrai_o_ritocca('oggetti', nome, c['img']); hh = (img[..., 3] > 0).any(1).sum()
        d = 1.5  # stessa densita' degli sprite (vedi DMAX in build_assets.py)
        sm = ink(to_small(img, h * SCALA_OGGETTI * d / hh))
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
# ---------------------------------------------------------------------------
# Voci "derivate": finche' non registrate la voce vera di un personaggio, ne ricaviamo una
# cambiando il timbro di una registrazione esistente (piu' acuta, piu' grave, "ubriaca"...).
# nome nuovo: (sorgente, intonazione, velocita', effetto). Se caricate un file con il nome
# nuovo, vince il vostro.
# ---------------------------------------------------------------------------
DERIVATE = {
    'gelataia_muore': ('gelataio_pepite', 1.45, 1.0, ''),
    'gelataio_muore': ('gelataio_pepite', 0.85, 1.0, ''),
    'gelataio_attacco': ('gelataio_pepite', 1.1, 1.15, ''),
    'gelataia_attacco': ('gelataio_pepite', 1.6, 1.15, ''),
    'ubriaco_spawn': ('ettore_borbottio', 0.78, 0.85, 'vibrato=f=5:d=0.6'),
    'ubriaca_spawn': ('ettore_borbottio', 1.35, 0.85, 'vibrato=f=5:d=0.6'),
    'ubriaco_muore': ('giova_ciao', 0.7, 0.75, 'vibrato=f=4:d=0.7'),
    'ubriaca_muore': ('giova_ciao', 1.3, 0.75, 'vibrato=f=4:d=0.7'),
    'ubriaco_lancio': ('ettore_borbottio', 0.9, 1.2, 'vibrato=f=6:d=0.5'),
    'giova_carica': ('giova_ciao', 0.85, 1.3, ''),
    'giova_muore': ('giova_ciao', 0.7, 0.6, ''),
}
for nuovo, (src, pitch, vel, eff) in DERIVATE.items():
    if nuovo in voci or src not in voci: continue
    sorg = os.path.join(tmp, src + '.mp3'); out = os.path.join(tmp, nuovo + '.mp3')
    filt = f'asetrate=32000*{pitch},aresample=32000,atempo={max(0.5, min(2.0, vel / pitch))}' + (',' + eff if eff else '')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sorg, '-af', filt, '-ac', '1', '-ar', '32000', '-b:a', '64k', out], check=True)
    voci[nuovo] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
# ---------------------------------------------------------------------------
# Foglio armi ed esplosioni (grafica/oggetti/armi.png): elementi per riga, da sinistra.
# (nome, riga, x0, x1, larghezza in gioco, contorno scuro?)  x in pixel del foglio originale
# Righe: 0 casse · 1 cassa che si apre · 2 icone · 3 lampi e proiettili · 4 esplosione · 5 polvere
# ---------------------------------------------------------------------------
RIGHE_ARMI = [(16, 177), (196, 380), (419, 507), (553, 613), (625, 814), (852, 975)]
ELEMENTI = [
    ('cassa_fucile', 0, 46, 279, 30, 1), ('cassa_fiamma', 0, 350, 587, 30, 1), ('cassa_bombe', 0, 655, 888, 30, 1),
    ('cassa_lanciarazzi', 0, 951, 1187, 30, 1), ('cassa_mitragliatrice', 0, 1258, 1492, 30, 1),
    ('apre_1', 1, 56, 243, 30, 1), ('apre_2', 1, 288, 512, 30, 1), ('apre_3', 1, 544, 731, 30, 1),
    ('apre_4', 1, 787, 981, 30, 1), ('apre_5', 1, 1044, 1227, 30, 1), ('apre_6', 1, 1297, 1487, 30, 1),
    ('icona_mitragliatrice', 2, 37, 128, 12, 0), ('icona_pistola', 2, 160, 259, 13, 0), ('icona_fiamma', 2, 289, 401, 15, 0),
    ('icona_fucile', 2, 432, 557, 17, 0), ('icona_bomba', 2, 587, 683, 13, 0), ('icona_lanciarazzi', 2, 713, 839, 17, 0),
    ('icona_munizioni', 2, 871, 972, 14, 0), ('icona_cura', 2, 1003, 1099, 13, 0),
    ('granata', 2, 1152, 1230, 8, 1), ('razzo', 2, 1266, 1379, 13, 0), ('proiettile', 2, 1435, 1500, 7, 0),
    ('lampo_1', 3, 40, 84, 8, 0), ('lampo_2', 3, 120, 190, 12, 0), ('lampo_3', 3, 232, 351, 18, 0),
    ('scia_1', 3, 404, 479, 10, 0), ('razzo_volo', 3, 941, 1127, 22, 0),
    ('boom_0', 4, 38, 115, 12, 0), ('boom_1', 4, 147, 256, 18, 0), ('boom_2', 4, 282, 410, 22, 0), ('boom_3', 4, 435, 589, 27, 0),
    ('boom_4', 4, 602, 794, 34, 0), ('boom_5', 4, 800, 992, 34, 0), ('boom_6', 4, 1011, 1178, 30, 0), ('boom_7', 4, 1197, 1500, 30, 0),
    ('polvere_1', 5, 40, 146, 14, 0), ('polvere_2', 5, 182, 350, 22, 0), ('polvere_3', 5, 379, 576, 26, 0),
    ('scintille_1', 5, 607, 771, 16, 0), ('scintille_2', 5, 822, 970, 16, 0), ('detriti', 5, 1008, 1287, 26, 0), ('cratere', 5, 1311, 1502, 26, 0),
]
fx = {}
if ARMI:
    A = load_mask(ARMI, 'alpha')
    for nome, r, x0, x1, w, conto in ELEMENTI:
        y0, y1 = RIGHE_ARMI[r]
        img = A[y0:y1, x0:x1].copy()
        m = img[..., 3] > 0; ys, xs = np.where(m)
        img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        img, _ = estrai_o_ritocca('armi', nome, img)
        d = 1.5
        # i fotogrammi della cassa che si apre usano TUTTI la scala di apre_1 (cassa chiusa):
        # cosi' il coperchio che sale allarga il disegno invece di rimpicciolire la cassa
        if nome.startswith('apre_'):
            if nome == 'apre_1': scala_apre = w * d / img.shape[1]
            sm = to_small(img, scala_apre)
        else:
            sm = to_small(img, w * d / img.shape[1])
        if conto: sm = ink(sm)
        fx[nome] = dict(data=b64png(Image.fromarray(sm)), w=round(sm.shape[1] / d, 1), h=round(sm.shape[0] / d, 1), d=d)
    ims = [Image.open(io.BytesIO(base64.b64decode(v['data'].split(',')[1]))).convert('RGBA') for v in fx.values()]
    W = sum(i.width + 6 for i in ims); H = max(i.height for i in ims)
    pv = Image.new('RGBA', (W, H), (70, 78, 92, 255)); x = 0
    for im in ims: pv.alpha_composite(im, (x, H - im.height)); x += im.width + 6
    pv.save(PREV.replace('.png', '_armi.png'))

# ---------------------------------------------------------------------------
# Musica: resa "8 bit povera" (campionamento basso, pochi bit, banda stretta), mono,
# primi 150 s con dissolvenze per il ciclo continuo.
# ---------------------------------------------------------------------------
musica = {}
if MUSICA and os.path.isdir(MUSICA):
    for f in sorted(os.listdir(MUSICA)):
        nome, ext = os.path.splitext(f)
        if ext.lower() not in ('.mp3', '.wav', '.m4a', '.ogg'): continue
        out = os.path.join(tmp, 'mus_' + nome + '.mp3')
        # suoneria polifonica: note ricavate dal brano e risuonate con onde quadre (tools/chiptune.py)
        chip = os.path.join(tmp, 'chip_' + nome + '.wav')
        subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'chiptune.py'), os.path.join(MUSICA, f), chip, '150'], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', chip, '-ac', '1', '-ar', '22050', '-b:a', '56k', out], check=True)
        musica[nome.lower()] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
        import shutil; shutil.copy(out, PREV.replace('oggetti.png', 'musica_' + nome + '.mp3'))
        continue
        filtro = ('atrim=0:150,asetpts=N/SR/TB,highpass=f=120,lowpass=f=3600,'
                  'aresample=11025,acrusher=bits=7:mode=lin:mix=0.9:aa=0,alimiter=limit=0.9,aresample=22050,'
                  'afade=t=in:d=0.5,afade=t=out:st=147:d=3,dynaudnorm')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(MUSICA, f), '-af', filtro,
                        '-ac', '1', '-ar', '22050', '-b:a', '48k', out], check=True)
        musica[nome.lower()] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
        import shutil; shutil.copy(out, PREV.replace('oggetti.png', 'musica_' + nome + '.mp3'))

with open(OUT, 'w') as f:
    f.write('// GENERATO da tools/build_extra.py - non modificare a mano.\n')
    f.write('export const PROPS: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(props) + ';\n')
    f.write('export const VOCI: Record<string, string> = ' + json.dumps(voci) + ';\n')
    f.write('export const FX: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(fx) + ';\n')
    f.write('export const MUSICA: Record<string, string> = ' + json.dumps(musica) + ';\n')
print(len(props), 'oggetti,', len(voci), 'voci,', len(fx), 'effetti,', len(musica), 'brani,', os.path.getsize(OUT) // 1024, 'KB')
