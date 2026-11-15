"""Trasforma un brano vero in una "suoneria polifonica" anni '80, senza voce.

Come funziona (in breve):
1. toglie la voce: sottrae il canale destro dal sinistro (la voce di solito è al centro);
2. ogni 1/10 di secondo cerca le 3 note più forti degli strumenti e la nota del basso;
3. le risuona con onde quadre e triangolari (come i vecchi chip sonori), più un rumore per i tamburi.
Il risultato si riconosce (stesse note e stesso ritmo) ma suona "povero", da sala giochi.

Uso: python3 tools/chiptune.py brano.mp3 uscita.wav [secondi=150] [inizio=0]
"""
import sys, subprocess, tempfile, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, medfilt

SR = 22050
src, out = sys.argv[1], sys.argv[2]
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 150
INIZIO = float(sys.argv[4]) if len(sys.argv) > 4 else 0

tmp = os.path.join(tempfile.mkdtemp(), 'in.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(INIZIO), '-t', str(DUR), '-i', src, '-ac', '2', '-ar', str(SR), tmp], check=True)
sr, x = wavfile.read(tmp)
x = x.astype(np.float32) / 32768
L, Rc = x[:, 0], x[:, 1]
side = (L - Rc) / 2          # senza voce (e senza cassa/basso centrali)
mono = (L + Rc) / 2          # serve per basso e tamburi

HOP = int(SR * 0.1)          # una "nota" ogni 1/10 s: ritmo da suoneria
NFFT = 4096
f, t, Zs = stft(side, SR, nperseg=NFFT, noverlap=NFFT - HOP)
_, _, Zm = stft(mono, SR, nperseg=NFFT, noverlap=NFFT - HOP)
S, M = np.abs(Zs), np.abs(Zm)
nfr = S.shape[1]

def midi(fr): return 69 + 12 * np.log2(np.maximum(fr, 1) / 440)
def freq(m): return 440 * 2 ** ((m - 69) / 12)

band = (f > 180) & (f < 1800)
fb, Sb = f[band], S[band]
bassb = (f > 40) & (f < 180)
fl, Ml = f[bassb], M[bassb]

VOCI = 3
note = np.zeros((nfr, VOCI)); vol = np.zeros((nfr, VOCI))
for i in range(nfr):
    col = Sb[:, i].copy()
    for v in range(VOCI):
        k = int(np.argmax(col)); a = col[k]
        if a <= 1e-4: break
        note[i, v] = round(midi(fb[k])); vol[i, v] = a
        # niente seconda nota a meno di 2 semitoni dalla prima
        near = np.abs(midi(fb) - midi(fb[k])) < 2.5
        col[near] = 0
basso = np.round(midi(fl[np.argmax(Ml, 0)]))
bvol = Ml.max(0)
# tamburi: aumento improvviso di energia negli acuti (rullante/piatti) e nei bassi (cassa)
hi = M[(f > 3500) & (f < 9000)].sum(0); lo = M[(f > 45) & (f < 110)].sum(0)
def onset(e):
    d = np.maximum(0, np.diff(e, prepend=e[0])); return d / (np.percentile(d, 98) + 1e-9)
rull, cassa = onset(hi), onset(lo)

# tonalita': teniamo le 7 note (classi) piu' usate e ci "agganciamo" a quelle -> niente stonature
hist = np.zeros(12)
for v in range(VOCI):
    m = note[:, v] > 0
    np.add.at(hist, (note[m, v] % 12).astype(int), vol[m, v])
scala = np.argsort(hist)[-7:]
def aggancia(m):
    if m <= 0: return m
    best = min(range(-2, 3), key=lambda d: (((m + d) % 12) not in scala, abs(d)))
    return m + best
note = np.vectorize(aggancia)(note)
basso = np.vectorize(aggancia)(basso)
# registri: melodia in alto, le altre voci in mezzo (come una suoneria a 3 voci)
def registro(m, lo, hi):
    while m > 0 and m < lo: m += 12
    while m > hi: m -= 12
    return m
note[:, 0] = np.vectorize(lambda m: registro(m, 64, 86))(note[:, 0])
for v in (1, 2): note[:, v] = np.vectorize(lambda m: registro(m, 52, 74))(note[:, v])
basso = np.vectorize(lambda m: registro(m, 33, 48))(basso)
# un po' di pulizia: note "ballerine" di un solo fotogramma vengono smussate
for v in range(VOCI): note[:, v] = medfilt(note[:, v], 3)
basso = medfilt(basso, 5)
vol /= (np.percentile(vol[:, 0], 95) + 1e-9); bvol /= (np.percentile(bvol, 95) + 1e-9)
vol = np.clip(vol, 0, 1); bvol = np.clip(bvol, 0, 1)

n = nfr * HOP
y = np.zeros(n, np.float32)
fase = np.zeros(VOCI + 1)
duty = [0.5, 0.25, 0.125]                # timbri diversi per le tre voci (onde quadre "strette")
gain = [0.20, 0.12, 0.09]
tt = np.arange(HOP) / SR
rng = np.random.default_rng(1)
for i in range(nfr):
    seg = np.zeros(HOP, np.float32)
    env = np.clip(1.15 - tt / (HOP / SR) * 0.4, 0, 1)   # piccolo attacco per ogni nota
    for v in range(VOCI):
        if vol[i, v] < 0.12 or note[i, v] <= 0: continue
        fr = freq(note[i, v])
        ph = fase[v] + 2 * np.pi * fr * tt
        seg += gain[v] * vol[i, v] ** 0.6 * env * np.where((ph / (2 * np.pi)) % 1 < duty[v], 1, -1)
        fase[v] = ph[-1] + 2 * np.pi * fr / SR
    if bvol[i] > 0.15:
        fr = freq(basso[i]); ph = fase[VOCI] + 2 * np.pi * fr * tt
        tri = 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
        seg += 0.22 * min(1, bvol[i]) * tri
        fase[VOCI] = ph[-1] + 2 * np.pi * fr / SR
    if rull[i] > 0.45:   # rullante: rumore breve
        nz = rng.uniform(-1, 1, HOP) * np.exp(-tt * 40)
        seg += 0.16 * min(1, rull[i]) * nz
    if cassa[i] > 0.5:   # cassa: tonfo che scende
        seg += 0.30 * np.sin(2 * np.pi * (120 - 70 * tt / tt[-1]) * tt) * np.exp(-tt * 25)
    y[i * HOP:(i + 1) * HOP] += seg
# 8 bit: pochi livelli, campionamento basso
y = np.round(y / (np.abs(y).max() + 1e-9) * 0.9 * 63) / 63
fade = int(SR * 2.5); y[-fade:] *= np.linspace(1, 0, fade); y[:int(SR * 0.2)] *= np.linspace(0, 1, int(SR * 0.2))
wavfile.write(out, SR, (y * 32767).astype(np.int16))
print('fatto', out, f'{len(y) / SR:.0f}s')
