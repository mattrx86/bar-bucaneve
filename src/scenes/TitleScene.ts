import Phaser from 'phaser';
import { VIEW_W, VIEW_H, GROUND_Y, HEROES } from '../content/defs';
import { Controls } from '../core/controls';
import { unlockAudio, sfx, preparaVoci } from '../core/audio';
import { leaderboard } from '../core/save';
import { setPose } from '../entities';
import { txt } from '../core/ui';
import { BG } from '../content/sprites';

export class TitleScene extends Phaser.Scene {
  private ctrl!: Controls;
  private pronto = false;
  constructor() { super('Title'); }

  create(): void {
    this.pronto = false; // la scena viene riusata: senza questo il ritardo anti-tasto vale solo la prima volta
    // facciata del Bucaneve come sfondo
    const off = BG.street.barX + BG.street.barW / 2 - VIEW_W / 2;
    BG.street.parts.forEach((_, i) => { if (i >= 4) this.add.image(i * 512 - off, 0, `bg_street_${i}`).setOrigin(0); });
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0);
    const eroi = HEROES.map((h) => h.id).slice(0, 7);
    eroi.forEach((id, i) => {
      const s = this.add.sprite(36 + i * 30, GROUND_Y + 4, `sh_hero_${id}`, 0);
      setPose(s, `hero_${id}`, i % 2 ? 'idle' : 'shoot');
    });
    const e = this.add.sprite(330, GROUND_Y + 4, 'sh_boss_ettore', 0); setPose(e, 'boss_ettore', 'tele_02'); e.setFlipX(true);

    const t = txt(this, VIEW_W / 2, 34, 'BAR BUCANEVE', 28, '#ffe066', 6).setOrigin(0.5);
    txt(this, VIEW_W / 2, 60, 'LA RESA DEI CONTI A PONTE ARCHE', 9).setOrigin(0.5);
    this.tweens.add({ targets: t, scaleX: t.scaleX * 1.04, scaleY: t.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1 });
    const press = txt(this, VIEW_W / 2, 88, 'PREMI INVIO', 13).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });
    leaderboard.top(3).then((top) => {
      if (!top.length) return;
      txt(this, VIEW_W - 6, 76, 'RECORD', 8, '#ffe066').setOrigin(1, 0);
      top.forEach((r, i) => txt(this, VIEW_W - 6, 86 + i * 9, `${r.nome} ${r.punti}`, 8).setOrigin(1, 0));
    });
    txt(this, VIEW_W / 2, VIEW_H - 9, 'FRECCE MUOVI  J SPARA  K SALTA  L BOMBA  I PUGNO  F SCHERMO', 7, '#d0d0e0', 2).setOrigin(0.5);

    this.ctrl = new Controls(this);
    this.time.delayedCall(250, () => { this.pronto = true; });
    this.input.once('pointerdown', () => this.vai());
  }
  update(): void {
    if (!this.pronto) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    if (s.confermaTap || s.saltoTap) this.vai();
    this.ctrl.flush();
  }
  private vai(): void { unlockAudio(); preparaVoci(); sfx('conferma'); this.scene.start('Select'); }
}
