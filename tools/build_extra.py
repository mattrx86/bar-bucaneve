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
# ---------------------------------------------------------------------------
# Oggetti di strada urbana (foglio con sfondo marrone scuro opaco): sfondo tolto per colore,
# partendo dai bordi, quindi i buchi interni (rete della recinzione, finestrini) restano disegnati.
# (nome, x0, x1, y0, y1 del riquadro nel foglio, altezza in gioco in px). Nessun fattore SCALA_OGGETTI:
# le altezze sono gia' pensate rispetto all'eroe alto 54 px.
# ---------------------------------------------------------------------------
from scipy import ndimage as _nd
STRADA = os.path.join(os.path.dirname(SHEET), 'Sprite di strada urbana rétro.png')
PILA = os.path.join(os.path.dirname(SHEET), 'Pila di casse di legno in pixel art.png')
OGG_STRADA = [
    ('s_barriera', 10, 330, 30, 330, 30), ('s_guardrail', 340, 672, 30, 330, 28), ('s_muro', 680, 990, 30, 330, 42),
    ('s_cassonetto', 995, 1294, 30, 330, 46), ('s_bagno', 1295, 1532, 30, 330, 64),
    ('s_fermata', 12, 478, 345, 672, 66), ('s_distributore', 492, 684, 345, 672, 54), ('s_telefono', 698, 852, 345, 672, 50),
    ('s_quadro', 878, 1072, 345, 672, 40), ('s_recinzione', 1096, 1526, 345, 672, 46),
    ('s_auto', 12, 410, 690, 975, 44), ('s_pallet', 1145, 1526, 690, 975, 46), ('s_furgone', 428, 864, 690, 975, 56), ('s_faro', 878, 1128, 690, 975, 62),
]
def sfondo_scuro(rgba):
    rgb = rgba[..., :3].astype(int); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    bg = (r >= 30) & (r <= 92) & (g >= 24) & (g <= 78) & (b >= 18) & (b <= 68) & ((r - b) >= 8) & ((r - b) <= 32) & ((r - g) >= 4) & ((r - g) <= 20)
    lab, n = _nd.label(bg, structure=np.ones((3, 3)))
    bordo = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    ogg = ~np.isin(lab, list(bordo))
    ogg = _nd.binary_opening(ogg, iterations=1)
    out = rgba.copy(); out[..., 3] = np.where(ogg, 255, 0); out[~ogg, :3] = 0
    return out
def ritaglia_strada(nome, img, h_gioco):
    img = img.copy(); img[img[..., 3] < 128, 3] = 0
    lab, n = _nd.label(img[..., 3] > 0, structure=np.ones((3, 3)))
    if n > 1:   # via i pulviscoli staccati: resta solo il pezzo grande (e cio' che gli sta vicino)
        sz = _nd.sum(img[..., 3] > 0, lab, range(1, n + 1)); keep = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 0.01 * sz.max()]); img[~keep] = 0
    ys, xs = np.where(img[..., 3] > 0); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    d = 1.5
    sm = ink(to_small(img, h_gioco * d / img.shape[0]))
    m = sm[..., 3] > 0; ys, xs = np.where(m); sm = sm[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    props[nome] = dict(data=b64png(Image.fromarray(sm)), w=round(sm.shape[1] / d, 1), h=round(sm.shape[0] / d, 1), d=d)
if os.path.isfile(STRADA):
    foglio = np.array(Image.open(STRADA).convert('RGBA'))
    for nome, x0, x1, y0, y1, h in OGG_STRADA:
        ritaglia_strada(nome, sfondo_scuro(foglio[y0:y1, x0:x1].copy()), h)
if os.path.isfile(PILA):
    pa = np.array(Image.open(PILA).convert('RGBA'))
    if (pa[..., 3] < 128).mean() < 0.05: pa = sfondo_scuro(pa)
    ritaglia_strada('s_pila_casse', pa, 46)
# anteprima
ims = [Image.open(io.BytesIO(base64.b64decode(p['data'].split(',')[1]))).convert('RGBA') for p in props.values()]
W = sum(i.width + 8 for i in ims); H = max(i.height for i in ims)
pv = Image.new('RGBA', (W, H + 2), (70, 78, 92, 255)); x = 0
for im in ims: pv.alpha_composite(im, (x, H - im.height)); x += im.width + 8
pv.save(PREV)
voci = {}
tmp = tempfile.mkdtemp()
# Le voci stanno in sottocartelle che dicono IN QUALE STADIO si sentono: voci/strada, voci/bucaneve (Giova),
# voci/ettore (cantina). I file direttamente in voci/ si sentono sempre. Un file che comincia per "sottofondo"
# non e' una voce ma il brano di quello stadio (es. "sottofondo boss giova.m4a" -> musica "giova").
voci_fase = {}
musica_stadio = {}
ESTENSIONI = ('.m4a', '.mp3', '.wav', '.ogg', '.aac', '.mp4')
for radice, _cartelle, files in sorted(os.walk(VOCI)):
    rel = os.path.relpath(radice, VOCI)
    fase = '' if rel == '.' else rel.split(os.sep)[0].lower()
    for f in sorted(files):
        nome = f
        while os.path.splitext(nome)[1].lower() in ESTENSIONI: nome = os.path.splitext(nome)[0]   # "x.m4a.mp4" -> "x"
        if os.path.splitext(f)[1].lower() not in ESTENSIONI: continue
        chiave = nome.lower().replace(' ', '_')
        src = os.path.join(radice, f)
        if chiave.startswith('sottofondo'):
            musica_stadio[chiave.split('_')[-1]] = src
            continue
        out = os.path.join(tmp, chiave + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-af',
                        'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.4,loudnorm=I=-14:TP=-1.5',
                        '-ac', '1', '-ar', '32000', '-b:a', '72k', out], check=True)
        voci[chiave] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
        if fase: voci_fase[chiave] = fase
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
    voci_fase[nuovo] = 'bucaneve' if nuovo.startswith('giova') else 'ettore' if nuovo.startswith('ettore') else 'strada'
# ---------------------------------------------------------------------------
# Foglio armi ed esplosioni (grafica/oggetti/armi.png): elementi per riga, da sinistra.
# (nome, riga, x0, x1, larghezza in gioco, contorno scuro?)  x in pixel del foglio originale
# Righe: 0 casse · 1 cassa che si apre · 2 icone · 3 lampi e proiettili · 4 esplosione · 5 polvere
# ---------------------------------------------------------------------------
RIGHE_ARMI = [(16, 177), (196, 380), (419, 507), (553, 613), (625, 814), (852, 975)]
ELEMENTI = [
    ('cassa_fucile', 0, 46, 279, 30, 1), ('cassa_bombe', 0, 655, 888, 30, 1),
    ('cassa_lanciarazzi', 0, 951, 1187, 30, 1), ('cassa_mitragliatrice', 0, 1258, 1492, 30, 1),
    ('apre_1', 1, 56, 243, 30, 1), ('apre_2', 1, 288, 512, 30, 1), ('apre_3', 1, 544, 731, 30, 1),
    ('apre_4', 1, 787, 981, 30, 1), ('apre_5', 1, 1044, 1227, 30, 1), ('apre_6', 1, 1297, 1487, 30, 1),
    ('icona_mitragliatrice', 2, 37, 128, 12, 0), ('icona_pistola', 2, 160, 259, 13, 0), 
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

# --- mitragliatrice da tenere in mano (grafica/personaggi): lunga 28 px di gioco, pixel netti ---
_mg = [f for f in os.listdir(os.path.join(os.path.dirname(SHEET), '..', 'personaggi')) if f.lower().startswith('mitragliatrice')]
if _mg:
    _a = load_mask(os.path.join(os.path.dirname(SHEET), '..', 'personaggi', _mg[0]), 'alpha'); _m = _a[..., 3] > 128; _ys, _xs = np.where(_m)
    _a = _a[_ys.min():_ys.max() + 1, _xs.min():_xs.max() + 1].copy(); _a[_a[..., 3] < 128, 3] = 0
    _sm = to_small(_a, 28 * 1.5 / _a.shape[1])
    fx['mitra_mano'] = dict(data=b64png(Image.fromarray(_sm)), w=round(_sm.shape[1] / 1.5, 1), h=round(_sm.shape[0] / 1.5, 1), d=1.5)

# --- schermata del titolo (grafica/titolo/schermata.png, 16:9): ridotta a 384x216 di gioco a densita' 1,5 (576x324) ---
_tt = os.path.join(os.path.dirname(SHEET), '..', 'titolo', 'schermata.png')
if os.path.isfile(_tt):
    _t = Image.open(_tt).convert('RGB').resize((576, 324), Image.Resampling.BOX)
    fx['titolo'] = dict(data=b64png(_t.convert('RGBA')), w=384, h=216, d=1.5)
# --- logo BUCA SLUG (grafica/titolo/logo.png, generato da tools/logo.py): largo 110 px di gioco, pixel netti ---
_lg = os.path.join(os.path.dirname(SHEET), '..', 'titolo', 'logo.png')
if os.path.exists(_lg):
    _l = Image.open(_lg).convert('RGBA')
    fx['logo'] = dict(data=b64png(_l), w=110, h=round(_l.height * 110 / _l.width, 1), d=_l.width / 110)

# --- bottiglia "standard" (verde originale) lanciata dagli ubriachi della strada ---
_bt = os.path.join(os.path.dirname(SHEET), 'Bottiglia Verde Pixel Art.png')
if os.path.isfile(_bt):
    _b = load_mask(_bt, 'alpha'); _m = _b[..., 3] > 0; _ys, _xs = np.where(_m)
    _b = _b[_ys.min():_ys.max() + 1, _xs.min():_xs.max() + 1]
    _sm = to_small(_b, 16 * 1.5 / _b.shape[0])          # alta 16 px di gioco, pixel netti (nearest)
    fx['bottiglia_strada'] = dict(data=b64png(Image.fromarray(_sm)), w=round(_sm.shape[1] / 1.5, 1), h=round(_sm.shape[0] / 1.5, 1), d=1.5)

# ---------------------------------------------------------------------------
# Musica: i brani veri, interi, solo ricompressi in mp3 (stereo 80 kbit) e portati a un livello
# sonoro uniforme (loudnorm). Il volume di riproduzione lo decide src/core/audio.ts (VOL_MUSICA).
# Una breve dissolvenza in apertura e in chiusura evita lo "scatto" quando il brano riparte in ciclo.
# (Fino alla 1.0 i brani venivano trasformati in suonerie a onde quadre con tools/chiptune.py:
#  il file resta nel progetto ma non viene piu' usato.)
# ---------------------------------------------------------------------------
import shutil
musica = {}
if MUSICA and os.path.isdir(MUSICA):
    for f in sorted(os.listdir(MUSICA)):
        nome, ext = os.path.splitext(f)
        if ext.lower() not in ('.mp3', '.wav', '.m4a', '.ogg'): continue
        out = os.path.join(tmp, 'mus_' + nome + '.mp3')
        durata = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                       os.path.join(MUSICA, f)], capture_output=True, text=True, check=True).stdout.strip())
        filtro = f'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.3,afade=t=out:st={max(0, durata - 2.0):.2f}:d=2.0'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(MUSICA, f), '-vn', '-af', filtro,
                        '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', out], check=True)
        musica[nome.lower()] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()
        shutil.copy(out, PREV.replace('oggetti.png', 'musica_' + nome + '.mp3'))

for nome, src in musica_stadio.items():
    out = os.path.join(tmp, 'mus_' + nome + '.mp3')
    durata = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True, check=True).stdout.strip())
    # brano breve in ciclo: niente dissolvenza lunga (sentirebbe un buco a ogni giro), solo un velo per evitare lo scatto
    filtro = 'loudnorm=I=-16:TP=-1.5:LRA=11' + (',afade=t=in:d=0.02' if durata < 20 else '')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-af', filtro, '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', out], check=True)
    musica[nome] = 'data:audio/mpeg;base64,' + base64.b64encode(open(out, 'rb').read()).decode()

# ---------------------------------------------------------------------------
# Effetti sonori delle armi: campioni reali CC0 (grafica/sfx/, vedi CREDITI.md), ritagliati, intonati e
# normalizzati qui. Escono come WAV mono 16 bit a 32 kHz in `SFX`: ogni voce e' una LISTA di varianti,
# audio.ts ne sceglie una a caso a ogni colpo (niente "mitragliatrice a campione ripetuto").
# ---------------------------------------------------------------------------
import wave
SFX_DIR = os.path.join(os.path.dirname(os.path.abspath(VOCI)), 'sfx')
SR_SFX = 32000
def _carica(nome):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SFX_DIR, nome + '.ogg'), '-ac', '1', '-ar', str(SR_SFX),
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def _ritaglia(x, durata, fade=0.03):
    x = x[:int(durata * SR_SFX)].copy()
    n = min(len(x), int(fade * SR_SFX))
    if n > 0: x[-n:] *= np.linspace(1, 0, n)
    return x
def _intona(x, semitoni):
    f = 2 ** (semitoni / 12.0)               # >1 = piu' acuto e piu' corto
    t = np.arange(0, len(x) - 1, f)
    return np.interp(t, np.arange(len(x)), x).astype(np.float32)
def _filtra(x, filtro):
    if not filtro: return x
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR_SFX), '-ac', '1', '-i', '-', '-af', filtro,
                          '-f', 'f32le', '-'], input=x.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def _somma(*parti):
    n = max(off + len(x) for off, x in parti)
    out = np.zeros(n, dtype=np.float32)
    for off, x in parti: out[off:off + len(x)] += x
    return out
def _wav(x, picco=0.8):
    m = float(np.max(np.abs(x))) or 1.0
    y = np.clip(x / m * picco, -1, 1)
    # il campione parte da zero e finisce a zero: niente "click"
    y[:8] *= np.linspace(0, 1, 8)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR_SFX)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    return 'data:audio/wav;base64,' + base64.b64encode(buf.getvalue()).decode()

sfx_out = {}
if os.path.isdir(SFX_DIR):
    C = {n: _carica(n) for n in ('shot_01', 'shot_02', 'shot_03', 'bang_01', 'bang_03', 'bang_06', 'bang_09', 'cannon_01', 'cannon_02', 'cannon_04')
         if os.path.exists(os.path.join(SFX_DIR, n + '.ogg'))}
    if len(C) == 10:
        d = int(0.09 * SR_SFX)                                # distanza tra le due canne
        sfx_out['pistola']  = [_wav(_ritaglia(C['shot_02'], 0.32)), _wav(_ritaglia(C['shot_03'], 0.26)),
                               _wav(_ritaglia(_intona(C['shot_02'], 1.0), 0.30))]
        sfx_out['mitra']    = [_wav(_ritaglia(C['shot_01'], 0.13, 0.05)), _wav(_ritaglia(C['shot_03'], 0.12, 0.05)),
                               _wav(_ritaglia(_intona(C['shot_01'], 1.5), 0.12, 0.05))]
        sfx_out['fucile']   = [_wav(_ritaglia(_filtra(C['bang_06'], 'lowpass=f=6000'), 0.75, 0.15)),
                               _wav(_ritaglia(_filtra(C['bang_09'], 'lowpass=f=6000'), 0.70, 0.15))]
        sfx_out['razzo']    = [_wav(_ritaglia(C['cannon_02'], 1.1, 0.25))]
        sfx_out['boom']     = [_wav(_ritaglia(C['bang_03'], 0.9, 0.2)), _wav(_ritaglia(C['cannon_01'], 1.0, 0.2)),
                               _wav(_ritaglia(C['cannon_04'], 0.8, 0.2))]
        sfx_out['motoImpatto'] = [_wav(_ritaglia(_intona(C['cannon_01'], -2), 0.9, 0.2))]
        # Ettore: due botti ravvicinati, piu' gravi e pesanti di quelli del giocatore
        a, b = _intona(C['bang_06'], -3), _intona(C['bang_09'], -4)
        sfx_out['doppietta'] = [_wav(_ritaglia(_somma((0, a), (d, b)), 1.0, 0.25)),
                                _wav(_ritaglia(_somma((0, b), (d, a)), 1.0, 0.25))]
        c = _intona(C['cannon_04'], -2)
        sfx_out['doppiettaVentaglio'] = [_wav(_ritaglia(_somma((0, a), (d, b), (2 * d, c)), 1.1, 0.3))]
    else:
        print('ATTENZIONE: campioni mancanti in', SFX_DIR, '- le armi usano solo i suoni sintetizzati')

with open(OUT, 'w') as f:
    f.write('// GENERATO da tools/build_extra.py - non modificare a mano.\n')
    f.write('export const PROPS: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(props) + ';\n')
    f.write('export const VOCI: Record<string, string> = ' + json.dumps(voci) + ';\n')
    f.write('export const VOCI_FASE: Record<string, string> = ' + json.dumps(voci_fase) + ';\n')
    f.write('export const FX: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(fx) + ';\n')
    f.write('export const SFX: Record<string, string[]> = ' + json.dumps(sfx_out) + ';\n')
    f.write('export const MUSICA: Record<string, string> = ' + json.dumps(musica) + ';\n')
print(len(props), 'oggetti,', len(voci), 'voci,', len(fx), 'effetti,', len(musica), 'brani,', os.path.getsize(OUT) // 1024, 'KB')
