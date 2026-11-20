import Phaser from 'phaser';
import { VIEW_W, VIEW_H, HEROES, DIFFICOLTA } from '../content/defs';
import { Controls } from '../core/controls';
import { sfx, musica } from '../core/audio';
import { loadSave, writeSave } from '../core/save';
import { nickSalvato, chiediNickname } from '../core/classifica';
import { setPose } from '../entities';
import { txt, zoomCamera, PixelText } from '../core/ui';

const COLORE_G = ['#ffe066', '#60d8ff'];

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
  private titolo!: PixelText;
  /** 1 o 2 giocatori; `turno` = chi sta scegliendo (0 = primo, 1 = secondo) */
  private n = 1;
  /** in attesa del nickname (finestra aperta): i comandi del menu sono fermi */
  private attesaNick = false;
  /** da dove si parte: la strada (partita normale) o direttamente la chiesa (HOLY SLUG) */
  private fase: 'strada' | 'chiesa' = 'strada';
  private turno = 0;
  private scelto: string[] = [];
  constructor() { super('Select'); }

  create(d?: { giocatori?: number; fase?: 'strada' | 'chiesa' }): void {
    this.fase = d?.fase === 'chiesa' ? 'chiesa' : 'strada';
    zoomCamera(this);
    musica('menu');
    this.n = (d?.giocatori ?? loadSave().giocatori) === 2 ? 2 : 1;
    this.turno = 0; this.scelto = [];
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x141824).setOrigin(0);
    this.titolo = txt(this, VIEW_W / 2, 14, 'SCEGLI IL PERSONAGGIO', 13, '#ffe066', 4).setOrigin(0.5);
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
    // tocco sulla scritta della difficolta': passa alla successiva (in giro)
    this.add.zone(VIEW_W / 2, 32, 230, 16).setInteractive().on('pointerdown', () => { this.diffIdx = (this.diffIdx + 1) % DIFFICOLTA.length; sfx('menu'); this.refresh(); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY < 60) return;
      const i = Math.round((p.worldX - this.px(0)) / this.passo());
      if (i >= 0 && i < HEROES.length) { if (i === this.idx) this.conferma(); else { this.idx = i; this.refresh(); } }
    });
  }

  update(): void {
    if (this.attesaNick) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    if (s.sx) this.muovi(-1);
    if (s.dx) this.muovi(1);
    if (s.su) this.cambiaDiff(1);
    if (s.giu) this.cambiaDiff(-1);
    if (s.confermaTap) this.conferma();
    if (s.pausaTap) { if (this.turno === 1) this.indietro(); else this.scene.start('Title'); }
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
    // il secondo giocatore non puo' prendere lo stesso personaggio del primo (si vedrebbero identici)
    if (this.turno === 1 && HEROES[this.idx].id === this.scelto[0] && HEROES.length > 1) this.idx = (this.idx + d + HEROES.length) % HEROES.length;
    sfx('menu'); this.refresh();
  }
  private indietro(): void {
    this.turno = 0; this.scelto = [];
    this.idx = Math.max(0, HEROES.findIndex((h) => h.id === loadSave().charId));
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
    if (this.n === 2) {
      this.titolo.setText(`GIOCATORE ${this.turno + 1}: SCEGLI`).setColor(COLORE_G[this.turno]).setOrigin(0.5);
      this.cursore.setStrokeStyle(2, this.turno ? 0x60d8ff : 0xffe066);
    }
  }
  private conferma(): void {
    sfx('conferma');
    const id = HEROES[this.idx].id;
    if (this.n === 2 && this.turno === 0) {
      // primo scelto: tocca al secondo (parte da un personaggio diverso)
      this.scelto = [id]; this.turno = 1;
      const sec = HEROES.findIndex((h) => h.id === loadSave().charId2 && h.id !== id);
      this.idx = sec >= 0 ? sec : (this.idx + 1) % HEROES.length;
      this.refresh();
      return;
    }
    if (this.n === 2 && id === this.scelto[0]) return; // stesso personaggio del primo
    const eroi = this.n === 2 ? [this.scelto[0], id] : [id];
    writeSave({ charId: eroi[0], charId2: eroi[1] ?? null, diff: DIFFICOLTA[this.diffIdx].id, giocatori: this.n });
    // prima partita su questo dispositivo: si sceglie il nickname della classifica generale
    this.attesaNick = true;
    void this.assicuraNick(eroi.length).then((ok) => {
      this.attesaNick = false; this.ctrl.flush();
      if (ok) this.scene.start('Game', { fase: this.fase, stato: null, eroi });
    });
  }
  private async assicuraNick(n: number): Promise<boolean> {
    for (let i = 0; i < n; i++) {
      const slot = i ? 1 : 0;
      if (nickSalvato(slot)) continue;
      const v = await chiediNickname(n > 1 ? `GIOCATORE ${i + 1}: IL TUO NICKNAME` : 'IL TUO NICKNAME', slot, true);
      if (!v) return false;
    }
    return true;
  }
}
