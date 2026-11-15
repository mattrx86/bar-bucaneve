import Phaser from 'phaser';
import { VIEW_W, VIEW_H, HEROES, DIFFICOLTA } from '../content/defs';
import { Controls } from '../core/controls';
import { sfx } from '../core/audio';
import { loadSave, writeSave } from '../core/save';
import { setPose } from '../entities';
import { txt, PixelText } from '../core/ui';

export class SelectScene extends Phaser.Scene {
  private ctrl!: Controls;
  private idx = 0;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private nome!: PixelText;
  private motto!: PixelText;
  private cursore!: Phaser.GameObjects.Rectangle;
  private ultimo = -1000;
  private diffIdx = 1;
  private diffTxt!: PixelText;
  constructor() { super('Select'); }

  create(): void {
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x141824).setOrigin(0);
    txt(this, VIEW_W / 2, 14, 'SCEGLI IL PERSONAGGIO', 13, '#ffe066', 4).setOrigin(0.5);
    const salvato = loadSave().charId;
    this.idx = Math.max(0, HEROES.findIndex((h) => h.id === salvato));
    this.cursore = this.add.rectangle(0, 118, this.passo() - 4, 92, 0x3a4460).setStrokeStyle(2, 0xffe066);
    this.sprites = HEROES.map((h, i) => {
      const s = this.add.sprite(this.px(i), 150, `sh_hero_${h.id}`, 0);
      setPose(s, `hero_${h.id}`, 'idle');
      return s;
    });
    this.nome = txt(this, VIEW_W / 2, 172, '', 14, '#ffffff', 4).setOrigin(0.5);
    this.motto = txt(this, VIEW_W / 2, 190, '', 9, '#c8d0e0').setOrigin(0.5);
    const sd = loadSave().diff;
    this.diffIdx = Math.max(0, DIFFICOLTA.findIndex((d) => d.id === (sd ?? 'normale')));
    this.diffTxt = txt(this, VIEW_W / 2, 32, '', 9, '#80d0ff').setOrigin(0.5);
    txt(this, VIEW_W / 2, VIEW_H - 8, '< > PERSONAGGIO   SU/GIU DIFFICOLTA   INVIO CONFERMA', 8, '#a0a8c0', 2).setOrigin(0.5);
    this.ctrl = new Controls(this);
    this.ultimo = -1000;
    this.refresh();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const i = Math.round((p.x - this.px(0)) / this.passo());
      if (i >= 0 && i < HEROES.length) { if (i === this.idx) this.conferma(); else { this.idx = i; this.refresh(); } }
    });
  }

  update(): void {
    const s = this.ctrl.leggi();
    if (s.sx) this.muovi(-1);
    if (s.dx) this.muovi(1);
    if (s.su) this.cambiaDiff(1);
    if (s.giu) this.cambiaDiff(-1);
    if (s.confermaTap) this.conferma();
    if (s.pausaTap) this.scene.start('Title');
    const t = this.time.now / 1000;
    this.sprites.forEach((sp, i) => {
      const id = HEROES[i].id;
      setPose(sp, `hero_${id}`, i === this.idx ? `run_0${(Math.floor(t * 12) % 8) + 1}` : 'idle');
    });
    this.ctrl.flush();
  }
  private muovi(d: number): void {
    if (this.time.now - this.ultimo < 180) return;
    this.ultimo = this.time.now;
    this.idx = (this.idx + d + HEROES.length) % HEROES.length;
    sfx('menu'); this.refresh();
  }
  /** Distanza tra i personaggi: si stringono se sono tanti. */
  private passo(): number { return Math.min(62, 370 / HEROES.length); }
  private px(i: number): number { return Math.round((VIEW_W - this.passo() * (HEROES.length - 1)) / 2 + i * this.passo()); }
  private cambiaDiff(d: number): void {
    if (this.time.now - this.ultimo < 180) return;
    this.ultimo = this.time.now;
    this.diffIdx = Phaser.Math.Clamp(this.diffIdx + d, 0, DIFFICOLTA.length - 1);
    sfx('menu'); this.refresh();
  }
  private refresh(): void {
    this.diffTxt?.setText(`DIFFICOLTA: < ${DIFFICOLTA[this.diffIdx].nome} >`).setOrigin(0.5);
    const h = HEROES[this.idx];
    this.cursore.setPosition(this.px(this.idx), 118);
    this.sprites.forEach((s, i) => s.setAlpha(i === this.idx ? 1 : 0.55));
    this.nome.setText(h.nome); this.motto.setText(h.motto);
  }
  private conferma(): void {
    sfx('conferma');
    writeSave({ charId: HEROES[this.idx].id, diff: DIFFICOLTA[this.diffIdx].id });
    this.scene.start('Game', { fase: 'strada', stato: null });
  }
}
