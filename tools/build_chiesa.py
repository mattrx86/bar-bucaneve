"""HOLY SLUG - costruisce src/content/chiesa.ts dal materiale di progetto-chiesa/.

Uso (dalla cartella del progetto):  python3 tools/build_chiesa.py progetto-chiesa src/content/chiesa.ts anteprime
Non tocca nessun file di Buca Slug: produce un modulo a parte che il gioco unisce ai propri all'avvio.

  - personaggi: chierichetti e suore (nemici), Griso e Don Antonio (boss)  -> tools/chiesa_personaggi.py
  - fondali a strati, candele, portone, rosone                            -> tools/chiesa_ambiente.py
  - musica (navata e boss finale) e voci                                  -> qui sotto
"""
import sys, os, io, json, base64, subprocess, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import chiesa_personaggi as P
import chiesa_ambiente as A

SRC, OUT, PREV = sys.argv[1:4]
os.makedirs(PREV, exist_ok=True)
# copia dei PNG esportati (trasparenti, gia' alla densita' del gioco) per controllarli e ritoccarli
EXP = os.path.join(SRC, 'export'); os.makedirs(EXP, exist_ok=True)
J = lambda *p: os.path.join(SRC, *p)


def b64png(im):
    if im.mode == 'RGBA': im = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


report = []
SHEETS, FX = {}, {}

# --- nemici: due chierichetti e due suore (colori diversi = fogli diversi, scelti a caso) ---
NEMICI = {
    'vil_chierichetto_rosso': ('chierichetto/Spritesheet del chierichetto pixel art.png', 44, False, 'turibolo_rosso'),
    'vil_chierichetto_blu': ('chierichetto/Sprites del chierichetto in pixel art blu e oro.png', 44, False, 'turibolo_blu'),
    'vil_suora_blu': ('suora/Foglio Sprite della Suora Guerriera.png', 48, True, 'rosario_blu'),
    'vil_suora_nera': ('suora/Foglio sprite pixel art della suora guerriera.png', 48, False, 'rosario_nera'),
}
for key, (f, h, fuse, proj) in NEMICI.items():
    frames, pr = P.nemico(J('characters', f), h, fuse)
    SHEETS[key] = P.impacca(frames, b64png, f'{PREV}/{key}.png', f'{EXP}/{key}.png')
    FX[proj] = P.piccolo(pr, 18 if proj.startswith('turibolo') else 16, b64png)
    report.append(f'{key}: {len(frames)} pose, cella {SHEETS[key]["cw"]}x{SHEETS[key]["ch"]}')

# --- Griso (il sacerdote anziano): frusta col rosario, lancio della Bibbia ---
frames, bibbia, rosario, rosario_off = P.griso(J('characters', 'griso', 'Sprite di Sacerdote Pixel Art.png'), 68)
SHEETS['boss_griso'] = P.impacca(frames, b64png, f'{PREV}/boss_griso.png', f'{EXP}/boss_griso.png')
ROSARIO_OFF = [float(rosario_off[0]), float(rosario_off[1])]   # dove si stacca il rosario (rispetto ai piedi)
FX['bibbia'] = P.piccolo(bibbia, 20, b64png)          # grande quanto la Bibbia che ha in mano
FX['rosario_griso'] = P.piccolo(rosario, 24, b64png)
report.append(f'boss_griso: {len(frames)} pose')

# --- Don Antonio: aspersorio e secchiello, teglia di lasagne ---
frames, teglia = P.don_antonio(J('characters', 'don-antonio'), 80)
SHEETS['boss_donantonio'] = P.impacca(frames, b64png, f'{PREV}/boss_donantonio.png', f'{EXP}/boss_donantonio.png')
FX['lasagna'] = P.piccolo(teglia, 30, b64png)
g = P.goccia(); FX['goccia'] = dict(data=b64png(Image.fromarray(g)), w=round(g.shape[1] / P.D, 1), h=round(g.shape[0] / P.D, 1), d=P.D)
report.append(f'boss_donantonio: {len(frames)} pose')

# --- casse gotiche (progetto-chiesa/oggetti/casse_gotiche.png): 4 fotogrammi dell'apertura + 4 tipi.
# Riga 1: chiusa (mitragliatrice), crepata, aperta, luce. Riga 2: munizioni (fucile), salute, granate, lanciarazzi.
# Tutte alla stessa scala: la cassa chiusa e' larga 30 px di gioco (come le casse di Buca Slug).
_cg = J('oggetti', 'casse_gotiche.png')
if os.path.exists(_cg):
    from scipy import ndimage as _nd
    _a = np.array(Image.open(_cg).convert('RGBA'))
    _fg = _a[..., 3] > 128
    _lab, _ = _nd.label(_nd.binary_dilation(_fg, iterations=3))
    _pz = []
    for _i, _sl in enumerate(_nd.find_objects(_lab), 1):
        _m = (_lab[_sl] == _i) & _fg[_sl]
        if _m.sum() < 1500: continue
        _c = _a[_sl].copy(); _c[~_m, 3] = 0; _pz.append((_sl[0].start, _sl[1].start, _c))
    _pz.sort(key=lambda t: (t[0] // 300, t[1]))
    _nomi = ['mitragliatrice', 'crepata', 'aperta', 'luce', 'fucile', 'vita', 'bombe', 'lanciarazzi']
    if len(_pz) == 8:
        _s = 30 * P.D / _pz[0][2].shape[1]
        for _n, (_, _, _c) in zip(_nomi, _pz):
            _im = Image.fromarray(_c).resize((max(1, round(_c.shape[1] * _s)), max(1, round(_c.shape[0] * _s))), Image.LANCZOS)
            _ar = np.array(_im); _ar[..., 3] = np.where(_ar[..., 3] > 110, 255, 0)
            FX[f'cassa_ch_{_n}'] = dict(data=b64png(Image.fromarray(_ar)), w=round(_ar.shape[1] / P.D, 1), h=round(_ar.shape[0] / P.D, 1), d=P.D)
            Image.fromarray(_ar).save(f'{EXP}/fx_cassa_ch_{_n}.png')
        report.append('casse gotiche: 8 disegni')
    else:
        report.append(f'ATTENZIONE: casse gotiche, trovati {len(_pz)} pezzi invece di 8')

# --- ambiente ---
import chiesa_dipinti as DP
_bg_codice, fx_amb = A.costruisci(SRC, b64png, PREV)     # servono comunque fiamme e portone (FX)
FX.update(fx_amb)
if DP.presenti(SRC):
    BG, fx_ogg = DP.costruisci(SRC, b64png, PREV)          # fondali dipinti in progetto-chiesa/fondali/
    FX.update(fx_ogg)
    for k, v in fx_ogg.items(): open(f'{EXP}/fx_{k}.png', 'wb').write(base64.b64decode(v['data'].split(',')[1]))
    report.append(f'oggetti di scena: {len(BG["oggetti"])} ({len(fx_ogg)} diversi)')
    report.append('fondali: DIPINTI (progetto-chiesa/fondali/)')
else:
    BG = _bg_codice
    report.append('fondali: disegnati da codice (nessun fondale dipinto in progetto-chiesa/fondali/)')
report.append(f'chiesa: {BG["w"]} px, arena da {BG["arenaX"]}, {len(BG["fiamme"])} fiamme, {len(BG["luci"])} luci')

for k, v in FX.items():
    open(f'{EXP}/fx_{k}.png', 'wb').write(base64.b64decode(v['data'].split(',')[1]))

# --- audio ---
def mp3(src, filtro, canali, kbps):
    with tempfile.NamedTemporaryFile(suffix='.mp3') as t:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-af', filtro, '-ac', str(canali), '-ar', '44100' if canali == 2 else '32000',
                        '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', t.name], check=True)
        return 'data:audio/mpeg;base64,' + base64.b64encode(open(t.name, 'rb').read()).decode()

def durata(src):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True, check=True).stdout)

MUSICA = {}
# (nome, file, velocita'): la musica della navata va 1,3 volte piu' veloce (atempo: piu' veloce senza
# cambiare l'intonazione). Il volume (x1,5) si applica in src/core/audio.ts (VOL_BRANO), sopra il limitatore.
for nome, f, vel in (('chiesa', 'chiesa.mp3', 1.3), ('chiesa_boss', 'boss finale.mp3', 1.0)):
    src = J('audio', 'music', f)
    if not os.path.exists(src): continue
    d = durata(src) / vel
    tempo = f'atempo={vel},' if vel != 1 else ''
    MUSICA[nome] = mp3(src, f'{tempo}loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.3,afade=t=out:st={max(0, d - 2):.2f}:d=2', 2, 64)
    report.append(f'musica {nome}: {durata(src):.0f} s -> {d:.0f} s')
# Voci: chi dice cosa e' una scelta dal titolo del file (vedi progetto-chiesa/audio/sfx/README.md).
VOCI_FILE = {
    'donantonio_dovesei': 'Dove sei griso.m4a',
    'griso_sisi': 'Si si.m4a',
    'donantonio_cani_1': 'Siete dei cani.m4a',
    'donantonio_cani_2': 'Siete peggio dei cani.m4a',
    'griso_voce': 'voce Griso.m4a',
    'griso_morte': 'morte Griso.m4a',
}
VOCI = {}
for nome, f in VOCI_FILE.items():
    src = J('audio', 'sfx', f)
    if not os.path.exists(src): continue
    VOCI[nome] = mp3(src, 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.4,loudnorm=I=-14:TP=-1.5', 1, 72)
report.append(f'audio: {len(MUSICA)} brani, {len(VOCI)} voci')

with open(OUT, 'w') as f:
    f.write('// GENERATO da tools/build_chiesa.py (HOLY SLUG, livello della chiesa) - non modificare a mano.\n')
    f.write("import type { SheetDef } from './sprites';\n")
    f.write('export const CH_SHEETS: Record<string, SheetDef> = ' + json.dumps(SHEETS) + ';\n')
    f.write('export const CH_FX: Record<string, { data: string; w: number; h: number; d: number }> = ' + json.dumps(FX) + ';\n')
    f.write('export interface ChiesaBG { w: number; arenaX: number; ingresso: number; d: number;\n'
            '  lontano: { parts: string[]; w: number; k: number }; navata: { parts: string[]; w: number }; primo: { parts: string[]; w: number; k: number };\n'
            '  luci: { x: number; y: number; r: number; rosone?: number }[]; fiamme: { x: number; y: number; k: number }[];\n'
            '  vetrate: { x: number; y: number; w: number; h: number }[]; porta: { x: number; y: number; w: number; h: number };\n'
            '  rosone: { x: number; y: number; r: number }; pilastri: number[]; dipinto?: number; giunti?: number[];\n'
            '  oggetti?: { fx: string; x: number; strato: string; flip: boolean }[] }\n')
    f.write('export const CH_BG: ChiesaBG = ' + json.dumps(BG) + ';\n')
    f.write('export const CH_MUSICA: Record<string, string> = ' + json.dumps(MUSICA) + ';\n')
    f.write('export const CH_VOCI: Record<string, string> = ' + json.dumps(VOCI) + ';\n')
    f.write('/** Griso: punto (pixel di gioco, rispetto ai piedi, guardando a destra) da cui parte il rosario lanciato. */\n')
    f.write('export const CH_ROSARIO_GRISO: [number, number] = ' + json.dumps(ROSARIO_OFF) + ';\n')
print('\n'.join(report)); print('chiesa.ts', os.path.getsize(OUT) // 1024, 'KB')
