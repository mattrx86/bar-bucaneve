import Phaser from 'phaser';
import { VIEW_W, VIEW_H, GROUND_Y, HEROES } from '../content/defs';
import { Controls } from '../core/controls';
import { unlockAudio, sfx, preparaVoci, musica, setFaseAudio, audioAttivo } from '../core/audio';
import { leaderboard, loadSave, writeSave } from '../core/save';
import { classifica, nickSalvato, chiediNickname } from '../core/classifica';
import { touch } from '../core/touch';
import { setPose } from '../entities';
import { txt, zoomCamera, PixelText } from '../core/ui';
import { BG } from '../content/sprites';
import { FX } from '../content/extra';

export class TitleScene extends Phaser.Scene {
  private ctrl!: Controls;
  private pronto = false;
  /** 1 o 2 giocatori */
  /** 1 = un giocatore, 2 = due giocatori, 3 = solo la chiesa (HOLY SLUG) con `giocatoriChiesa` giocatori */
  private modo = 1;
  private giocatoriChiesa = 1;
  /** Schermata "PREMI UN TASTO": serve al browser per accendere l'audio (e quindi la musica del menu). */
  private inAttesa = false;
  /** finestra del nickname aperta */
  private attesaNick = false;
  private menuOgg: Phaser.GameObjects.GameObject[] = [];
  private voci: PixelText[] = [];
  private aiuto: PixelText[] = [];
  private ultimo = -1000;
  constructor() { super('Title'); }

  create(): void {
    setFaseAudio(null);
    musica('menu');   // se l'audio e' gia' sbloccato (ritorno dal gioco); altrimenti parte al primo tasto
    zoomCamera(this);
    this.pronto = false; // la scena viene riusata: senza questo il ritardo anti-tasto vale solo la prima volta
    // illustrazione di apertura (grafica/titolo/schermata.png); se manca, la facciata del Bucaneve
    if (FX.titolo) this.add.image(0, 0, 'fx_titolo').setOrigin(0).setScale(1 / FX.titolo.d);
    else {
      const off = BG.street.barX + BG.street.barW / 2 - VIEW_W / 2;
      BG.street.parts.forEach((_, i) => { if (i >= 4) this.add.image(i * 512 - off, 0, `bg_street_${i}`).setOrigin(0).setScale(1 / BG.street.d); });
      this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0);
    }
    // velo scuro dietro ai testi, cosi' si leggono sopra l'immagine
    this.add.rectangle(0, 0, VIEW_W, 0, 0x000000, 0).setOrigin(0);
    const fondoMenu = this.add.rectangle(VIEW_W / 2, 108, 186, 48, 0x000000, 0.5);
    this.add.rectangle(0, VIEW_H - 26, VIEW_W, 26, 0x000000, 0.5).setOrigin(0);

    // logo BUCA SLUG (tools/logo.py); senza il file resta la scritta
    const t = FX.logo
      ? this.add.image(VIEW_W / 2, 34, 'fx_logo').setOrigin(0.5).setScale(0.92 / FX.logo.d)
      : txt(this, VIEW_W / 2, 30, 'BUCA SLUG', 28, '#ffe066', 6).setOrigin(0.5);
    txt(this, VIEW_W / 2, FX.logo ? 74 : 56, 'LA RESA DEI CONTI A PONTE ARCHE', 8, '#ffffff', 3).setOrigin(0.5);
    this.tweens.add({ targets: t, scaleX: t.scaleX * 1.04, scaleY: t.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1 });
    // scelta 1 o 2 giocatori: su/giu e invio, oppure direttamente i tasti 1 e 2, oppure un tocco
    this.modo = loadSave().giocatori === 2 ? 2 : 1;
    this.giocatoriChiesa = this.modo;
    // terza voce: si entra direttamente nella chiesa (HOLY SLUG), saltando strada, Giovanni ed Ettore
    this.voci = ['1 GIOCATORE', '2 GIOCATORI', 'SOLO ULTIMO LIVELLO'].map((t, i) => txt(this, VIEW_W / 2, 94 + i * 14, t, i < 2 ? 12 : 10, i < 2 ? '#ffffff' : '#ffb0e0').setOrigin(0.5));
    this.voci.forEach((_, i) => {
      const z = this.add.zone(VIEW_W / 2, 94 + i * 14 + 5, 186, 14).setInteractive();
      z.on('pointerdown', () => { this.modo = i + 1; this.vai(); });
    });
    this.tweens.add({ targets: this.voci, alpha: 0.55, duration: 520, yoyo: true, repeat: -1 });
    this.aiuto = [0, 1].map((i) => txt(this, VIEW_W / 2, VIEW_H - 18 + i * 9, '', 7, i ? '#60d8ff' : '#d0d0e0', 2).setOrigin(0.5));
    this.mostraModo();
    // i primi 3 della classifica generale (se il server non risponde, quelli di questo dispositivo)
    void classifica('completo', 3).then(async (gen) => {
      const top = gen ? gen.map((r) => ({ nome: r.nick, punti: r.punti })) : (await leaderboard.top(3)).map((r) => ({ nome: r.nome, punti: r.punti }));
      if (!top.length || !this.scene.isActive()) return;
      txt(this, VIEW_W - 6, 76, gen ? 'CLASSIFICA' : 'RECORD', 8, '#ffe066', 2).setOrigin(1, 0);
      top.forEach((r, i) => txt(this, VIEW_W - 6, 86 + i * 9, `${r.nome} ${r.punti}`, 8, '#ffffff', 2).setOrigin(1, 0));
    });
    // nickname del giocatore 1 (si cambia con N o toccandolo)
    const nickTxt = txt(this, 6, 76, '', 8, '#80ff80', 2).setOrigin(0, 0);
    const aggiornaNick = (): void => { const n = nickSalvato(0); nickTxt.setText(n ? `GIOCATORE: ${n.nick}\nN: CAMBIA NICKNAME` : 'N: SCEGLI NICKNAME'); };
    aggiornaNick();
    const cambiaNick = (): void => {
      if (this.inAttesa || this.attesaNick) return;
      this.attesaNick = true;
      void chiediNickname('NUOVO NICKNAME', 0, true).then(() => { aggiornaNick(); this.attesaNick = false; this.ctrl.flush(); });
    };
    // area di tocco con dimensioni esplicite (un testo-contenitore senza dimensioni blocca i tocchi del telefono)
    this.add.zone(4, 74, 120, 20).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerdown', cambiaNick);
    this.input.keyboard!.on('keydown-N', cambiaNick);
    this.ctrl = new Controls(this);
    this.time.delayedCall(250, () => { this.pronto = true; });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, sopra: unknown[]) => { if (!sopra.length && !this.inAttesa) this.vai(); });
    // Prima schermata: se il browser non ha ancora acceso l'audio, "PREMI UN TASTO" (come in sala giochi).
    // Il primo tasto o tocco accende l'audio, fa partire la musica e mostra il menu.
    this.menuOgg = [fondoMenu, ...this.voci, ...this.aiuto];
    this.inAttesa = !audioAttivo();
    if (this.inAttesa) {
      this.menuOgg.forEach((o) => (o as unknown as { setVisible(v: boolean): void }).setVisible(false));
      const premi = txt(this, VIEW_W / 2, 108, touch.attivo ? 'TOCCA PER INIZIARE' : 'PREMI UN TASTO', 13, '#ffe066', 4).setOrigin(0.5);
      this.tweens.add({ targets: premi, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
      const via = (): void => {
        if (!this.inAttesa) return;
        this.inAttesa = false; unlockAudio(); musica('menu'); sfx('conferma');
        premi.destroy(); this.menuOgg.forEach((o) => (o as unknown as { setVisible(v: boolean): void }).setVisible(true));
        this.pronto = false; this.time.delayedCall(250, () => { this.pronto = true; });
      };
      this.input.keyboard!.once('keydown', via);
      this.input.once('pointerdown', via);
    }
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!this.pronto || e.repeat || this.inAttesa || this.attesaNick) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') { this.modo = 1; this.vai(); }
      if (e.code === 'Digit2' || e.code === 'Numpad2') { this.modo = 2; this.vai(); }
      if (e.code === 'Digit3' || e.code === 'Numpad3') { this.modo = 3; this.mostraModo(); }
    });
  }
  update(): void {
    if (!this.pronto || this.inAttesa || this.attesaNick) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    if ((s.su || s.giu) && this.time.now - this.ultimo > 180) { this.ultimo = this.time.now; this.modo = ((this.modo - 1 + (s.giu ? 1 : 2)) % 3) + 1; sfx('menu'); this.mostraModo(); }
    // sulla voce "solo ultimo livello" sinistra/destra sceglie 1 o 2 giocatori
    if (this.modo === 3 && (s.sx || s.dx) && this.time.now - this.ultimo > 180) { this.ultimo = this.time.now; this.giocatoriChiesa = this.giocatoriChiesa === 1 ? 2 : 1; sfx('menu'); this.mostraModo(); }
    if (s.confermaTap || s.saltoTap) this.vai();
    this.ctrl.flush();
  }
  /** Evidenzia la voce scelta e mostra i tasti del modo scelto. */
  private mostraModo(): void {
    const nomi = ['1 GIOCATORE', '2 GIOCATORI', `SOLO ULTIMO LIVELLO < ${this.giocatoriChiesa}P >`];
    this.voci.forEach((v, i) => v.setText(`${this.modo === i + 1 ? '> ' : '  '}${nomi[i]}`).setOrigin(0.5));
    if (touch.attivo) { this.aiuto[0].setText('TOCCA PER GIOCARE   COMANDI SULLO SCHERMO'); this.aiuto[1].setText(''); return; }
    if (this.modo === 3) {
      this.aiuto[0].setText('ULTIMO LIVELLO: SI PARTE DAL PORTONE DELLA CHIESA');
      this.aiuto[1].setText('SINISTRA/DESTRA 1 O 2 GIOCATORI   INVIO CONFERMA');
      this.aiuto[0].setColor('#ffb0e0'); this.aiuto[1].setColor('#a0a8c0');
    } else if (this.modo === 1) {
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
    if (!this.pronto || this.inAttesa || this.attesaNick) return;
    this.pronto = false;
    unlockAudio(); preparaVoci(); sfx('conferma');
    const chiesa = this.modo === 3;
    const n = chiesa ? this.giocatoriChiesa : this.modo;
    writeSave({ giocatori: n });
    // su telefono/tablet: schermo intero e orientamento orizzontale, se il browser lo permette
    if (touch.attivo && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.()
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
        .catch(() => { /* il browser puo' rifiutare */ });
    }
    this.scene.start('Select', { giocatori: n, fase: chiesa ? 'chiesa' : 'strada' });
  }
}
