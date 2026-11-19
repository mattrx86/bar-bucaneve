import Phaser from 'phaser';
import { SHEETS, BG } from '../content/sprites';
import { PROPS } from '../content/extra';
import { bakeFx, caricaFx, creaColoriEroi } from '../core/fx';
import { bakeFont } from '../core/font';
import { loadSave } from '../core/save';
import { setMuted } from '../core/audio';
import { txt, zoomCamera } from '../core/ui';

/** Carica tutti gli sprite e i fondali (incorporati nel file HTML). */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload(): void {
    zoomCamera(this);
    bakeFont(this);
    const t = txt(this, 192, 108, 'CARICAMENTO...', 10).setOrigin(0.5);
    this.load.on('progress', (v: number) => t.setText(`CARICAMENTO ${Math.round(v * 100)}%`));
    for (const [k, s] of Object.entries(SHEETS)) {
      if (k === 'ettore_ritratto' || k === 'moto_volo') this.load.image(k, s.data);
      else this.load.spritesheet(`sh_${k}`, s.data, { frameWidth: s.cw, frameHeight: s.ch });
    }
    BG.street.parts.forEach((d, i) => this.load.image(`bg_street_${i}`, d));
    BG.cellar.parts.forEach((d, i) => this.load.image(`bg_cellar_${i}`, d));
    for (const [k, p] of Object.entries(PROPS)) this.load.image(`prop_${k}`, p.data);
    caricaFx(this);
  }
  create(): void {
    bakeFx(this);
    creaColoriEroi(this);
    setMuted(loadSave().muted);
    this.scene.start('Title');
  }
}
