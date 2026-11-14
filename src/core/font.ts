// ============================================================================
// Carattere pixel in stile arcade (Metal Slug): glifi 5x7 pieni, contorno nero,
// sfumatura verticale a due toni. Disegnato una volta in una texture per stile.
// ============================================================================
import Phaser from 'phaser';

const G: Record<string, string[]> = {
  A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'],
  B: ['11110', '11011', '11011', '11110', '11011', '11011', '11110'],
  C: ['01111', '11000', '11000', '11000', '11000', '11000', '01111'],
  D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
  E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
  F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
  G: ['01111', '11000', '11000', '11011', '11011', '11011', '01111'],
  H: ['11011', '11011', '11011', '11111', '11011', '11011', '11011'],
  I: ['11111', '01110', '01110', '01110', '01110', '01110', '11111'],
  J: ['00111', '00011', '00011', '00011', '11011', '11011', '01110'],
  K: ['11011', '11011', '11110', '11100', '11110', '11011', '11011'],
  L: ['11000', '11000', '11000', '11000', '11000', '11000', '11111'],
  M: ['10001', '11011', '11111', '11111', '11011', '11011', '11011'],
  N: ['11001', '11101', '11111', '11111', '11011', '11011', '11011'],
  O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  P: ['11110', '11011', '11011', '11110', '11000', '11000', '11000'],
  Q: ['01110', '11011', '11011', '11011', '11011', '11110', '01101'],
  R: ['11110', '11011', '11011', '11110', '11110', '11011', '11011'],
  S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
  T: ['11111', '01110', '01110', '01110', '01110', '01110', '01110'],
  U: ['11011', '11011', '11011', '11011', '11011', '11011', '01110'],
  V: ['11011', '11011', '11011', '11011', '11011', '01110', '00100'],
  W: ['11011', '11011', '11011', '11111', '11111', '11011', '10001'],
  X: ['11011', '11011', '01110', '00100', '01110', '11011', '11011'],
  Y: ['11011', '11011', '11011', '01110', '01110', '01110', '01110'],
  Z: ['11111', '00011', '00110', '01100', '11000', '11000', '11111'],
  0: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
  1: ['00110', '01110', '11110', '00110', '00110', '00110', '11111'],
  2: ['01110', '11011', '00011', '00110', '01100', '11000', '11111'],
  3: ['11110', '00011', '00011', '01110', '00011', '00011', '11110'],
  4: ['00110', '01110', '11110', '11010', '11111', '00010', '00010'],
  5: ['11111', '11000', '11110', '00011', '00011', '11011', '01110'],
  6: ['01110', '11000', '11000', '11110', '11011', '11011', '01110'],
  7: ['11111', '00011', '00011', '00110', '01100', '01100', '01100'],
  8: ['01110', '11011', '11011', '01110', '11011', '11011', '01110'],
  9: ['01110', '11011', '11011', '01111', '00011', '00011', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '!': ['01100', '01100', '01100', '01100', '01100', '00000', '01100'],
  '?': ['01110', '11011', '00011', '00110', '01100', '00000', '01100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '01100', '11000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '01100', '11000'],
  "'": ['01100', '01100', '11000', '00000', '00000', '00000', '00000'],
  '"': ['11011', '11011', '10010', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '01100', '01100', '11111', '01100', '01100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '/': ['00011', '00011', '00110', '01100', '11000', '11000', '00000'],
  '(': ['00110', '01100', '11000', '11000', '11000', '01100', '00110'],
  ')': ['01100', '00110', '00011', '00011', '00011', '00110', '01100'],
  '<': ['00011', '00110', '01100', '11000', '01100', '00110', '00011'],
  '>': ['11000', '01100', '00110', '00011', '00110', '01100', '11000'],
  '%': ['11001', '11011', '00110', '01100', '11000', '11011', '10011'],
  '°': ['01110', '11011', '01110', '00000', '00000', '00000', '00000'],
  '*': ['00000', '11011', '01110', '11111', '01110', '11011', '00000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '00000'],
  '∞': ['00000', '00000', '01010', '10101', '10101', '01010', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
};
const ACCENTI: Record<string, string> = { À: 'A', È: 'E', É: 'E', Ì: 'I', Ò: 'O', Ù: 'U' };

/** Stili: [colore alto, colore basso] della sfumatura. */
export const STILI: Record<string, [string, string]> = {
  oro: ['#fff4a0', '#f08a10'],
  bianco: ['#ffffff', '#a8b0c8'],
  rosso: ['#ffb0a0', '#e02818'],
  verde: ['#d0ffb0', '#30b020'],
  grigio: ['#d8dce8', '#7880a0'],
  azzurro: ['#c8f0ff', '#2890e0'],
};
export const CW = 7, CH = 9; // cella: glifo 5x7 + contorno di 1 px
const CHARS = Object.keys(G);

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

export function bakeFont(sc: Phaser.Scene): void {
  for (const [stile, [c1, c2]] of Object.entries(STILI)) {
    const key = `font_${stile}`;
    if (sc.textures.exists(key)) continue;
    const tex = sc.textures.createCanvas(key, CW * CHARS.length, CH)!;
    const ctx = tex.getContext();
    CHARS.forEach((ch, i) => {
      const g = G[ch], ox = i * CW;
      ctx.fillStyle = '#000000';
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '1') ctx.fillRect(ox + x, y, 3, 3);
      for (let y = 0; y < 7; y++) {
        ctx.fillStyle = y < 2 ? c1 : y > 4 ? c2 : mix(c1, c2, (y - 1) / 4);
        for (let x = 0; x < 5; x++) if (g[y][x] === '1') ctx.fillRect(ox + x + 1, y + 1, 1, 1);
      }
      tex.add(ch, 0, ox, 0, CW, CH);
    });
    tex.refresh();
  }
}

export function stileDaColore(c: string): string {
  const m: Record<string, string> = {
    '#ffe066': 'oro', '#ffffff': 'bianco', '#ff6060': 'rosso', '#ff5040': 'rosso', '#ff8080': 'rosso', '#ff5050': 'rosso',
    '#80ff80': 'verde', '#c0ffc0': 'verde', '#c8d0e0': 'grigio', '#a0a8c0': 'grigio', '#d0d0e0': 'grigio', '#80d0ff': 'azzurro',
  };
  return m[c.toLowerCase()] ?? 'bianco';
}

/** Testo a pixel. Interfaccia simile a Phaser.Text per le parti che usiamo. */
export class PixelText extends Phaser.GameObjects.Container {
  private testo = '';
  private ox = 0; private oy = 0;
  private allinea: 'left' | 'center' = 'left';
  constructor(sc: Phaser.Scene, x: number, y: number, s: string, private stile: string, scala: number) {
    super(sc, x, y);
    sc.add.existing(this);
    this.setScale(scala);
    this.setText(s);
  }
  setText(s: string): this {
    s = String(s).toUpperCase().replace(/[ÀÈÉÌÒÙ]/g, (c) => ACCENTI[c] ?? c);
    if (s === this.testo && this.list.length) return this;
    this.testo = s;
    this.removeAll(true);
    const righe = s.split('\n');
    const larg = Math.max(...righe.map((r) => r.length)) * (CW - 1) + 1;
    righe.forEach((r, ry) => {
      const lr = r.length * (CW - 1) + 1;
      const sx = this.allinea === 'center' ? Math.floor((larg - lr) / 2) : 0;
      [...r].forEach((ch, i) => {
        const f = G[ch] ? ch : '?';
        if (f === ' ') return;
        const im = this.scene.add.image(sx + i * (CW - 1), ry * (CH + 1), `font_${this.stile}`, f).setOrigin(0);
        this.add(im);
      });
    });
    this.larg = larg; this.alt = righe.length * (CH + 1) - 1;
    this.riposiziona();
    return this;
  }
  private larg = 0; private alt = 0;
  larghezza(): number { return this.larg * this.scaleX; }
  setOrigin(x = 0, y = x): this { this.ox = x; this.oy = y; this.riposiziona(); return this; }
  setAlign(a: string): this { this.allinea = a === 'center' ? 'center' : 'left'; const t = this.testo; this.testo = ''; this.setText(t); return this; }
  setColor(c: string): this { this.stile = stileDaColore(c); const t = this.testo; this.testo = ''; this.setText(t); return this; }
  private riposiziona(): void {
    const dx = -Math.round(this.larg * this.ox), dy = -Math.round(this.alt * this.oy);
    for (const o of this.list) {
      const im = o as Phaser.GameObjects.Image & { bx?: number; by?: number };
      if (im.bx === undefined) { im.bx = im.x; im.by = im.y; }
      im.setPosition(im.bx + dx, (im.by ?? 0) + dy);
    }
  }
}
