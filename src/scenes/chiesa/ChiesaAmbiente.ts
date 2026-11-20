// ============================================================================
// HOLY SLUG - l'ambiente della chiesa: solo grafica, nessuna collisione e nessuna logica di gioco.
//   strato lontano  (parete con le vetrate)   scorre a meta' velocita'      profondita' -10
//   raggi di luce dalle vetrate                agganciati allo strato lontano profondita' -9
//   strato principale (pilastri, archi,        scorre con il mondo            profondita'   0
//                      pavimento, ingresso, abside)
//   aloni delle candele e del rosone           nel mondo, additivi            profondita'   2
//   fiamme animate (4 fotogrammi, sfasate)     nel mondo                      profondita'   3
//   portone d'ingresso (due ante che si aprono)                               profondita'   4
//   pulviscolo                                 scorre piano                   profondita'  70
//   primo piano (panche, stendardi)            scorre un po' piu' veloce      profondita'  80
// I personaggi stanno tra 40 e 60: il primo piano e' solo in basso (sotto i piedi) e in alto.
// ============================================================================
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../../content/defs';
import { CH_BG } from '../../content/holy';
import { FX } from '../../content/extra';

/** Chiavi delle texture dei fondali (caricate dal BootScene). */
export function caricaChiesa(sc: Phaser.Scene): void {
  CH_BG.lontano.parts.forEach((d, i) => sc.load.image(`ch_lontano_${i}`, d));
  CH_BG.navata.parts.forEach((d, i) => sc.load.image(`ch_navata_${i}`, d));
  CH_BG.primo.parts.forEach((d, i) => sc.load.image(`ch_primo_${i}`, d));
}

/** Alone morbido (cerchio sfumato) e raggio di luce, generati una volta sola. */
function textureLuci(sc: Phaser.Scene): void {
  if (!sc.textures.exists('ch_alone')) {
    const g = sc.make.graphics({ x: 0, y: 0 }, false);
    for (let r = 32; r > 0; r -= 2) { g.fillStyle(0xffffff, 0.05 + 0.05 * (1 - r / 32) ** 2); g.fillCircle(32, 32, r); }
    g.generateTexture('ch_alone', 64, 64); g.destroy();
  }
  if (!sc.textures.exists('ch_raggio')) {
    const g = sc.make.graphics({ x: 0, y: 0 }, false);
    for (let i = 0; i < 16; i++) { g.fillStyle(0xffffff, 0.035); g.fillPoints([new Phaser.Math.Vector2(8 + i * 0.3, 0), new Phaser.Math.Vector2(24 - i * 0.3, 0), new Phaser.Math.Vector2(62 - i, 128), new Phaser.Math.Vector2(2 + i, 128)], true); }
    g.generateTexture('ch_raggio', 64, 128); g.destroy();
  }
}

export class ChiesaAmbiente {
  private fiamme: { s: Phaser.GameObjects.Image; fase: number; vel: number }[] = [];
  private aloni: { s: Phaser.GameObjects.Image; base: number; fase: number }[] = [];
  private polvere: { s: Phaser.GameObjects.Rectangle; vx: number; vy: number }[] = [];
  private raggi: Phaser.GameObjects.Image[] = [];
  private rosone: Phaser.GameObjects.Image[] = [];
  private ante: Phaser.GameObjects.Image[] = [];
  readonly larghezza = CH_BG.w;

  constructor(private sc: Phaser.Scene) {
    textureLuci(sc);
    const d = CH_BG.d;
    CH_BG.lontano.parts.forEach((_, i) => sc.add.image(i * 512, 0, `ch_lontano_${i}`).setOrigin(0).setScale(1 / d).setScrollFactor(CH_BG.lontano.k, 1).setDepth(-10));
    // raggi di luce dalle vetrate della parete lontana (si muovono con lei)
    for (const v of CH_BG.vetrate) {
      const r = sc.add.image(v.x, v.y - v.h / 2 + 6, 'ch_raggio').setOrigin(0.5, 0).setScrollFactor(CH_BG.lontano.k, 1).setDepth(-9)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(0x8fb0ff).setScale(v.w / 22, 1.25).setAlpha(0.55);
      this.raggi.push(r);
    }
    CH_BG.navata.parts.forEach((_, i) => sc.add.image(i * 512, 0, `ch_navata_${i}`).setOrigin(0).setScale(1 / d).setDepth(0));
    // aloni caldi attorno alle candele, freddo-colorati attorno al rosone
    for (const l of CH_BG.luci) {
      const col = l.rosone ? 0xc070ff : 0xffb050;
      const s = sc.add.image(l.x, l.y, 'ch_alone').setDepth(2).setBlendMode(Phaser.BlendModes.ADD).setTint(col).setScale(l.r / 32);
      const base = l.rosone ? 0.55 : 0.45;
      s.setAlpha(base);
      if (l.rosone) this.rosone.push(s);
      this.aloni.push({ s, base, fase: Math.random() * 10 });
    }
    // luce colorata del rosone proiettata sul pavimento dell'arena
    const r = CH_BG.rosone;
    for (const [dx, col] of [[-40, 0xd04050], [0, 0xe0b040], [40, 0x4070e0]] as [number, number][]) {
      const s = sc.add.image(r.x + dx, 150, 'ch_alone').setDepth(2).setBlendMode(Phaser.BlendModes.ADD).setTint(col).setScale(1.6, 0.5).setAlpha(0.35);
      this.rosone.push(s); this.aloni.push({ s, base: 0.32, fase: Math.random() * 10 });
    }
    // fiamme animate (i 4 fotogrammi della strip), ognuna con il suo tempo
    const ff = FX.fiamma_0;
    for (const f of CH_BG.fiamme) {
      const s = sc.add.image(f.x, f.y, 'fx_fiamma_0').setOrigin(0.5, 1).setDepth(3).setScale((f.k ?? 1) / ff.d);
      this.fiamme.push({ s, fase: Math.random() * 4, vel: 7 + Math.random() * 4 });
    }
    // portone: due ante sopra il vano, si aprono all'inizio del livello (solo col fondale disegnato da codice)
    const p = CH_BG.porta;
    if (FX.porta && !CH_BG.dipinto) {
      const sx = sc.add.image(p.x, p.y, 'fx_porta').setOrigin(0, 0).setDepth(4).setScale(1 / FX.porta.d).setCrop(0, 0, FX.porta.w * FX.porta.d / 2, FX.porta.h * FX.porta.d);
      const dx = sc.add.image(p.x + p.w, p.y, 'fx_porta').setOrigin(1, 0).setDepth(4).setScale(1 / FX.porta.d).setCrop(FX.porta.w * FX.porta.d / 2, 0, FX.porta.w * FX.porta.d / 2, FX.porta.h * FX.porta.d);
      this.ante = [sx, dx];
    }
    // pulviscolo nella luce
    for (let i = 0; i < 46; i++) {
      const s = sc.add.rectangle(Math.random() * VIEW_W, 20 + Math.random() * 150, 1, 1, 0xfff0d0, 0.25 + Math.random() * 0.35).setScrollFactor(0.2, 0).setDepth(70);
      this.polvere.push({ s, vx: -3 + Math.random() * 6, vy: 2 + Math.random() * 4 });
    }
    CH_BG.primo.parts.forEach((_, i) => sc.add.image(i * 512, 0, `ch_primo_${i}`).setOrigin(0).setScale(1 / d).setScrollFactor(CH_BG.primo.k, 1).setDepth(80));
  }

  /** Il portone si spalanca (le ante si chiudono verso i lati), con la luce fredda della notte. */
  apriPortone(): void {
    const [a, b] = this.ante; if (!a || !b) return;
    this.sc.tweens.add({ targets: a, scaleX: a.scaleX * 0.15, duration: 1400, ease: 'Quad.inOut', delay: 900 });
    this.sc.tweens.add({ targets: b, scaleX: b.scaleX * 0.15, duration: 1400, ease: 'Quad.inOut', delay: 900 });
  }

  update(dt: number, camX: number): void {
    const t = this.sc.time.now / 1000;
    for (const f of this.fiamme) {
      const i = Math.floor(t * f.vel + f.fase) % 4;
      const key = `fx_fiamma_${i}`;
      if (f.s.texture.key !== key) f.s.setTexture(key);
    }
    for (const a of this.aloni) {
      // tremolio: due onde sovrapposte + un po' di rumore, mai a scatti
      const k = 1 + 0.08 * Math.sin(t * 9 + a.fase) + 0.05 * Math.sin(t * 23 + a.fase * 2) + (Math.random() - 0.5) * 0.04;
      a.s.setAlpha(a.base * k);
    }
    for (const r of this.raggi) r.setAlpha(0.45 + 0.1 * Math.sin(t * 0.7 + r.x));
    for (const p of this.polvere) {
      p.s.x += p.vx * dt; p.s.y += p.vy * dt;
      if (p.s.y > 175) { p.s.y = 15; p.s.x = camX * 0.2 + Math.random() * VIEW_W; }
      const vx = camX * 0.2;
      if (p.s.x < vx - 4) p.s.x += VIEW_W + 8; else if (p.s.x > vx + VIEW_W + 4) p.s.x -= VIEW_W + 8;
    }
    void VIEW_H;
  }
}
