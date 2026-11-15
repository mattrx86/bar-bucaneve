// Piccole texture disegnate dal codice: proiettili, esplosioni, casse, HUD.
import Phaser from 'phaser';

function bake(sc: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  const g = sc.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function bakeFx(sc: Phaser.Scene): void {
  bake(sc, 'px', 1, 1, (g) => { g.fillStyle(0xffffff); g.fillRect(0, 0, 1, 1); });
  bake(sc, 'bullet', 7, 3, (g) => { g.fillStyle(0xffffff); g.fillRect(0, 0, 7, 3); g.fillStyle(0xffffa0); g.fillRect(4, 0, 3, 3); });
  bake(sc, 'pellet', 4, 4, (g) => { g.fillStyle(0x2a1a10); g.fillRect(0, 0, 4, 4); g.fillStyle(0xffffff); g.fillRect(1, 1, 2, 2); });
  bake(sc, 'rocket', 11, 5, (g) => { g.fillStyle(0x5a6050); g.fillRect(0, 1, 8, 3); g.fillStyle(0xd04020); g.fillRect(8, 0, 3, 5); g.fillStyle(0xffd040); g.fillRect(0, 2, 2, 1); });
  bake(sc, 'flame', 9, 9, (g) => { g.fillStyle(0xffffff); g.fillCircle(4.5, 4.5, 4.5); });
  bake(sc, 'bomba', 7, 7, (g) => { g.fillStyle(0x1a1a20); g.fillCircle(3.5, 3.5, 3.5); g.fillStyle(0xffc040); g.fillRect(4, 0, 2, 2); });
  bake(sc, 'bottiglia', 5, 12, (g) => {
    g.fillStyle(0x1e3a18); g.fillRect(0, 4, 5, 8); g.fillRect(1, 0, 3, 5);
    g.fillStyle(0x4f8a3a); g.fillRect(1, 5, 2, 6); g.fillStyle(0xd8c070); g.fillRect(0, 7, 5, 2);
  });
  bake(sc, 'flash0', 12, 9, (g) => {
    g.fillStyle(0xffe070); g.fillTriangle(0, 1, 12, 4.5, 0, 8); g.fillStyle(0xffffff); g.fillTriangle(0, 3, 7, 4.5, 0, 6);
  });
  for (let i = 0; i < 8; i++) {
    const r = 4 + i * 2.6, a = 1 - i / 9;
    bake(sc, `boom${i}`, 48, 48, (g) => {
      g.fillStyle(0xff5a10, a); g.fillCircle(24, 24, r);
      g.fillStyle(0xffc040, a); g.fillCircle(24, 24, r * 0.7);
      if (i < 4) { g.fillStyle(0xffffff, a); g.fillCircle(24, 24, r * 0.35); }
    });
  }
  bake(sc, 'pallina', 8, 8, (g) => { g.fillStyle(0x3a1a20); g.fillCircle(4, 4, 4); g.fillStyle(0xff9ec0); g.fillCircle(4, 4, 3); g.fillStyle(0xffe0ec); g.fillRect(2, 2, 2, 2); });
  bake(sc, 'bossolo', 3, 2, (g) => { g.fillStyle(0xd8a838); g.fillRect(0, 0, 3, 2); g.fillStyle(0xfff0a0); g.fillRect(0, 0, 1, 1); });
  bake(sc, 'scheggia', 3, 3, (g) => { g.fillStyle(0x8a5a2a); g.fillRect(0, 0, 3, 3); g.fillStyle(0xc89050); g.fillRect(0, 0, 2, 1); });
  bake(sc, 'premio_bombe', 14, 12, (g) => { g.fillStyle(0x1a1a20); g.fillRect(0, 0, 14, 12); g.fillStyle(0x30a040); g.fillRect(1, 1, 12, 10); g.fillStyle(0x1a1a20); g.fillCircle(7, 6, 3.5); g.fillStyle(0xffc040); g.fillRect(8, 2, 2, 2); });
  bake(sc, 'premio_gelato', 10, 14, (g) => { g.fillStyle(0xd09040); g.fillTriangle(1, 6, 9, 6, 5, 14); g.fillStyle(0xff9ec0); g.fillCircle(5, 4, 4); g.fillStyle(0xfff4d0); g.fillCircle(4, 3, 1.5); });
  bake(sc, 'fumo', 10, 10, (g) => { g.fillStyle(0x777777, 0.8); g.fillCircle(5, 5, 5); });
  bake(sc, 'cassa', 18, 15, (g) => {
    g.fillStyle(0x2a1a0e); g.fillRect(0, 0, 18, 15);
    g.fillStyle(0xa8743a); g.fillRect(1, 1, 16, 13);
    g.fillStyle(0x7a5228); g.fillRect(1, 5, 16, 1); g.fillRect(1, 10, 16, 1);
    g.fillStyle(0xffe066); g.fillRect(7, 3, 4, 2); g.fillRect(9, 5, 2, 3); g.fillRect(8, 9, 2, 2);
  });
  bake(sc, 'seg', 4, 6, (g) => { g.fillStyle(0xffe066); g.fillRect(0, 0, 4, 6); g.fillStyle(0xfff6b0); g.fillRect(0, 0, 4, 2); });
  bake(sc, 'seg_vuoto', 4, 6, (g) => { g.fillStyle(0x30303a); g.fillRect(0, 0, 4, 6); });
  bake(sc, 'seg_boss', 5, 6, (g) => { g.fillStyle(0xe03030); g.fillRect(0, 0, 5, 6); g.fillStyle(0xff8080); g.fillRect(0, 0, 5, 2); });
  bake(sc, 'freccia', 14, 12, (g) => { g.fillStyle(0xffe066); g.fillRect(0, 3, 8, 6); g.fillTriangle(8, 0, 14, 6, 8, 12); });
}

// ---------------------------------------------------------------------------
// Grafica disegnata da voi (foglio armi ed esplosioni): texture "fx_<nome>" ad alta densità.
// `img()` crea un'immagine già alla scala giusta; se il disegno manca usa quello del codice.
// ---------------------------------------------------------------------------
import { FX } from '../content/extra';
export function caricaFx(sc: Phaser.Scene): void {
  for (const [k, v] of Object.entries(FX)) sc.load.image(`fx_${k}`, v.data);
}
/** Chiave della texture disegnata (se esiste) e scala da applicare. */
export function fxTex(nome: string, ripiego: string): { key: string; s: number } {
  const f = FX[nome];
  return f ? { key: `fx_${nome}`, s: 1 / f.d } : { key: ripiego, s: 1 };
}
export function img(sc: Phaser.Scene, x: number, y: number, nome: string, ripiego: string, scala = 1): Phaser.GameObjects.Image {
  const t = fxTex(nome, ripiego);
  return sc.add.image(x, y, t.key).setScale(t.s * scala);
}
/** Mappa texture "del codice" -> disegno vostro, per i proiettili. */
export const PROIETTILI_DISEGNATI: Record<string, string> = { bullet: 'proiettile', rocket: 'razzo', bomba: 'granata' };
