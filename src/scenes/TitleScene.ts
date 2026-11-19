import Phaser from 'phaser';
import { VIEW_W, VIEW_H, GROUND_Y, HEROES } from '../content/defs';
import { Controls } from '../core/controls';
import { unlockAudio, sfx, preparaVoci, musica } from '../core/audio';
import { leaderboard, loadSave, writeSave } from '../core/save';
import { touch } from '../core/touch';
import { setPose } from '../entities';
import { txt, zoomCamera, PixelText } from '../core/ui';
import { BG } from '../content/sprites';

export class TitleScene extends Phaser.Scene {
  private ctrl!: Controls;
  private pronto = false;
  /** 1 o 2 giocatori */
  private modo = 1;
  private voci: PixelText[] = [];
  private aiuto: PixelText[] = [];
  private ultimo = -1000;
  constructor() { super('Title'); }

  create(): void {
    musica(null);
    zoomCamera(this);
    this.pronto = false; // la scena viene riusata: senza questo il ritardo anti-tasto vale solo la prima volta
    // facciata del Bucaneve come sfondo
    const off = BG.street.barX + BG.street.barW / 2 - VIEW_W / 2;
    BG.street.parts.forEach((_, i) => { if (i >= 4) this.add.image(i * 512 - off, 0, `bg_street_${i}`).setOrigin(0).setScale(1 / BG.street.d); });
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0);
    const eroi = HEROES.map((h) => h.id).slice(0, 7);
    eroi.forEach((id, i) => {
      const s = this.add.sprite(36 + i * 30, GROUND_Y + 4, `sh_hero_${id}`, 0);
      setPose(s, `hero_${id}`, i % 2 ? 'idle' : 'shoot');
    });
    const e = this.add.sprite(352, GROUND_Y + 4, 'sh_boss_ettore', 0); setPose(e, 'boss_ettore', 'tele_02'); e.setFlipX(true);

    const t = txt(this, VIEW_W / 2, 34, 'BAR BUCANEVE', 28, '#ffe066', 6).setOrigin(0.5);
    txt(this, VIEW_W / 2, 60, 'LA RESA DEI CONTI A PONTE ARCHE', 9).setOrigin(0.5);
    this.tweens.add({ targets: t, scaleX: t.scaleX * 1.04, scaleY: t.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1 });
    // scelta 1 o 2 giocatori: su/giu e invio, oppure direttamente i tasti 1 e 2, oppure un tocco
    this.modo = loadSave().giocatori === 2 ? 2 : 1;
    this.voci = ['1 GIOCATORE', '2 GIOCATORI'].map((t, i) => txt(this, 168, 84 + i * 16, t, 13).setOrigin(0.5));
    this.voci.forEach((v, i) => {
      const z = this.add.zone(168, 84 + i * 16 + 6, 170, 16).setInteractive();
      z.on('pointerdown', () => { this.modo = i + 1; this.vai(); });
    });
    this.tweens.add({ targets: this.voci, alpha: 0.55, duration: 520, yoyo: true, repeat: -1 });
    this.aiuto = [0, 1].map((i) => txt(this, VIEW_W / 2, VIEW_H - 18 + i * 9, '', 7, i ? '#60d8ff' : '#d0d0e0', 2).setOrigin(0.5));
    this.mostraModo();
    leaderboard.top(3).then((top) => {
      if (!top.length) return;
      txt(this, VIEW_W - 6, 76, 'RECORD', 8, '#ffe066').setOrigin(1, 0);
      top.forEach((r, i) => txt(this, VIEW_W - 6, 86 + i * 9, `${r.nome} ${r.punti}`, 8).setOrigin(1, 0));
    });
    this.ctrl = new Controls(this);
    this.time.delayedCall(250, () => { this.pronto = true; });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, sopra: unknown[]) => { if (!sopra.length) this.vai(); });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!this.pronto || e.repeat) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') { this.modo = 1; this.vai(); }
      if (e.code === 'Digit2' || e.code === 'Numpad2') { this.modo = 2; this.vai(); }
    });
  }
  update(): void {
    if (!this.pronto) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    if ((s.su || s.giu) && this.time.now - this.ultimo > 180) { this.ultimo = this.time.now; this.modo = this.modo === 1 ? 2 : 1; sfx('menu'); this.mostraModo(); }
    if (s.confermaTap || s.saltoTap) this.vai();
    this.ctrl.flush();
  }
  /** Evidenzia la voce scelta e mostra i tasti del modo scelto. */
  private mostraModo(): void {
    this.voci.forEach((v, i) => v.setText(`${this.modo === i + 1 ? '> ' : '  '}${i ? '2 GIOCATORI' : '1 GIOCATORE'}`).setOrigin(0.5));
    if (touch.attivo) { this.aiuto[0].setText('TOCCA PER GIOCARE   COMANDI SULLO SCHERMO'); this.aiuto[1].setText(''); return; }
    if (this.modo === 1) {
      this.aiuto[0].setText('FRECCE MUOVI  J SPARA  K SALTA  L BOMBA  I PUGNO  F SCHERMO');
      this.aiuto[1].setText('SU/GIU SCEGLIE   INVIO CONFERMA   TASTI 1 E 2 DIRETTI');
      this.aiuto[0].setColor('#d0d0e0'); this.aiuto[1].setColor('#a0a8c0');
    } else {
      this.aiuto[0].setText('1P: FRECCE MUOVI  M SPARA  L SALTA  K BOMBA  J PUGNO');
      this.aiuto[1].setText('2P: W A S D MUOVI  1 SPARA  2 SALTA  3 BOMBA  4 PUGNO');
      this.aiuto[0].setColor('#ffe066'); this.aiuto[1].setColor('#60d8ff');
    }
  }
  private vai(): void {
    if (!this.pronto) return;
    this.pronto = false;
    unlockAudio(); preparaVoci(); sfx('conferma');
    writeSave({ giocatori: this.modo });
    // su telefono/tablet: schermo intero e orientamento orizzontale, se il browser lo permette
    if (touch.attivo && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.()
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
        .catch(() => { /* il browser puo' rifiutare */ });
    }
    this.scene.start('Select', { giocatori: this.modo });
  }
}
