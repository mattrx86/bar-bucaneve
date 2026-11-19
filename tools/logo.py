"""Logo "BUCA SLUG" in pixel art (lettere disegnate qui, originali): grassetto arcade inclinato, sfumatura
oro -> arancio -> rosso a gradini, riflesso chiaro in alto, estrusione 3D scura, contorno nero.
Uso: python3 tools/logo.py grafica/titolo/logo.png      (il file finisce nel gioco con tools/build_extra.py)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

# Lettere 7x9 (# = pieno). Angoli tagliati a 45 gradi, aste spesse 2: leggibili anche piccole.
G = {
    'B': ['######.', '##...##', '##...##', '##..##.', '######.', '##...##', '##...##', '##...##', '######.'],
    'U': ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
    'C': ['.#####.', '##...##', '##.....', '##.....', '##.....', '##.....', '##.....', '##...##', '.#####.'],
    'A': ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
    'S': ['.#####.', '##...##', '##.....', '.##....', '..###..', '....##.', '.....##', '##...##', '.#####.'],
    'L': ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######'],
    'G': ['.#####.', '##...##', '##.....', '##.....', '##.####', '##...##', '##...##', '##...##', '.######'],
}


def parola(testo, px):
    righe = 9; col = []
    for i, ch in enumerate(testo):
        g = np.array([[c == '#' for c in r] for r in G[ch]])
        col.append(g)
        if i < len(testo) - 1: col.append(np.zeros((righe, 1), bool))
    m = np.concatenate(col, 1)
    return np.kron(m, np.ones((px, px), bool))


def inclina(m, k=0.22):
    h, w = m.shape; extra = int(h * k) + 1
    out = np.zeros((h, w + extra), bool)
    for y in range(h): s = int((h - 1 - y) * k); out[y, s:s + w] = m[y]
    return out


def logo(px=5):
    a = inclina(parola('BUCA', px)); b = inclina(parola('SLUG', px))
    gap = px * 2
    W = max(a.shape[1], b.shape[1] + px * 6) + 40; H = a.shape[0] + b.shape[0] + gap + 40
    m = np.zeros((H, W), bool)
    ox, oy = 16, 12
    m[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    m[oy + a.shape[0] + gap:oy + a.shape[0] + gap + b.shape[0], ox + px * 6:ox + px * 6 + b.shape[1]] = b
    img = np.zeros((H, W, 4), np.uint8)
    # estrusione verso il basso a destra (8 passi) in rosso scuro
    estr = np.zeros_like(m)
    for k in range(1, 8): estr |= np.roll(np.roll(m, k, 0), k // 2, 1)
    estr &= ~m
    img[estr] = (90, 14, 10, 255)
    lato = estr & ~np.roll(np.roll(m, 4, 0), 2, 1); img[lato] = (60, 8, 8, 255)
    # facciata: sfumatura a gradini per riga di lettere (oro in alto, rosso in basso)
    yy = np.arange(H)[:, None].repeat(W, 1)
    def fascia(y0, h):
        t = np.clip((yy - y0) / h, 0, 1)
        livelli = [(255, 236, 140), (255, 206, 70), (255, 160, 40), (240, 100, 30), (210, 50, 26), (170, 26, 20)]
        idx = np.clip((t * len(livelli)).astype(int), 0, len(livelli) - 1)
        return np.array(livelli)[idx]
    fa = fascia(oy, a.shape[0]); fb = fascia(oy + a.shape[0] + gap, b.shape[0])
    sopra = yy < oy + a.shape[0] + gap // 2
    col = np.where(sopra[..., None], fa, fb)
    img[m, :3] = col[m]; img[m, 3] = 255
    # riflesso: primo pixel in alto di ogni tratto
    rif = m & ~np.roll(m, 1, 0)
    img[rif, :3] = (255, 250, 220)
    # contorno nero spesso 2
    cont = nd.binary_dilation(m | estr, iterations=2) & ~(m | estr)
    img[cont] = (8, 6, 10, 255)
    ys, xs = np.where(img[..., 3] > 0)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


if __name__ == '__main__':
    Image.fromarray(logo()).save(sys.argv[1] if len(sys.argv) > 1 else 'grafica/titolo/logo.png')
