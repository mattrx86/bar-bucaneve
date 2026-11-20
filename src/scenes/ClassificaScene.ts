// ============================================================================
// CLASSIFICA GENERALE: i primi 10 di tutti i giocatori (servizio sul NAS, vedi core/classifica.ts).
// Due classifiche: partita completa e solo ultimo livello (sinistra/destra o tocco sulle frecce).
// Invio, Esc o tocco su "INDIETRO" tornano al menu.
// ============================================================================
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, HEROES } from '../content/defs';
import { Controls } from '../core/controls';
import { sfx, musica } from '../core/audio';
import { classifica, nickSalvato, Modo } from '../core/classifica';
import { leaderboard } from '../core/save';
import { touch } from '../core/touch';
import { txt, zoomCamera, PixelText } from '../core/ui';
import { FX } from '../content/extra';

const MODI: { modo: Modo; nome: string }[] = [
  { modo: 'completo', nome: 'PARTITA COMPLETA' },
  { modo: 'ultimo', nome: 'SOLO ULTIMO LIVELLO' },
];

export class ClassificaScene extends Phaser.Scene {
  private ctrl!: Controls;
  private scelta = 0;
  private righe: Phaser.GameObjects.GameObject[] = [];
  private titolo!: PixelText;
  private richiesta = 0;
  private ultimo = -1000;
  private pronto = false;
  constructor() { super('Classifica'); }

  create(): void {
    zoomCamera(this);
    musica('menu');
    if (FX.titolo) this.add.image(0, 0, 'fx_titolo').setOrigin(0).setScale(1 / FX.titolo.d);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x06070c, 0.82).setOrigin(0);
    txt(this, VIEW_W / 2, 14, 'CLASSIFICA GENERALE', 16, '#ffe066', 4).setOrigin(0.5);
    this.titolo = txt(this, VIEW_W / 2, 34, '', 10, '#60d8ff', 3).setOrigin(0.5);
    // frecce per cambiare classifica (anche col dito)
    const freccia = (x: number, t: string, d: number): void => {
      txt(this, x, 34, t, 12, '#ffffff', 3).setOrigin(0.5);
      this.add.zone(x, 34, 40, 22).setInteractive().on('pointerdown', () => this.cambia(d));
    };
    freccia(VIEW_W / 2 - 110, '<', -1);
    freccia(VIEW_W / 2 + 110, '>', 1);
    txt(this, VIEW_W / 2, 48, ' #  NICKNAME         PUNTI  PERSONAGGIO  ARRIVATO A   DATA', 7, '#a0a8c0', 2).setOrigin(0.5);
    const indietro = txt(this, VIEW_W / 2, VIEW_H - 12,
      touch.attivo ? 'TOCCA QUI PER TORNARE AL MENU' : 'SINISTRA/DESTRA CAMBIA CLASSIFICA   INVIO O ESC TORNA AL MENU', 8, '#d0d0e0', 2).setOrigin(0.5);
    this.add.zone(VIEW_W / 2, VIEW_H - 12, 260, 22).setInteractive().on('pointerdown', () => this.esci());
    this.tweens.add({ targets: indietro, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    this.ctrl = new Controls(this);
    this.time.delayedCall(250, () => { this.pronto = true; });
    this.mostra();
  }

  private cambia(d: number): void {
    this.scelta = (this.scelta + d + MODI.length) % MODI.length;
    sfx('menu'); this.mostra();
  }

  private esci(): void {
    if (!this.pronto) return;
    this.pronto = false; sfx('conferma');
    this.scene.start('Title');
  }

  private pulisci(): void { this.righe.forEach((o) => o.destroy()); this.righe = []; }

  private mostra(): void {
    const m = MODI[this.scelta];
    this.titolo.setText(m.nome).setOrigin(0.5);
    this.pulisci();
    this.righe.push(txt(this, VIEW_W / 2, 110, 'CARICAMENTO...', 9, '#a0a8c0', 2).setOrigin(0.5));
    const n = ++this.richiesta;
    const miei = [nickSalvato(0)?.nick, nickSalvato(1)?.nick].filter(Boolean);
    void classifica(m.modo, 10).then(async (gen) => {
      if (n !== this.richiesta || !this.scene.isActive()) return;   // nel frattempo si e' cambiata classifica
      this.pulisci();
      if (!gen) {
        // server non raggiungibile: i record di questo dispositivo
        const loc = await leaderboard.top(10);
        this.righe.push(txt(this, VIEW_W / 2, 60, 'SERVER NON RAGGIUNGIBILE: RECORD DI QUESTO DISPOSITIVO', 8, '#ffb060', 2).setOrigin(0.5));
        loc.forEach((r, i) => this.righe.push(txt(this, VIEW_W / 2, 74 + i * 12,
          `${String(i + 1).padStart(2)}. ${r.nome.padEnd(14)} ${String(r.punti).padStart(7)}   ${r.data}`, 8, '#ffffff', 2).setOrigin(0.5)));
        return;
      }
      if (!gen.length) {
        this.righe.push(txt(this, VIEW_W / 2, 110, 'ANCORA NESSUNA PARTITA: SARAI IL PRIMO!', 10, '#80ff80', 3).setOrigin(0.5));
        return;
      }
      gen.forEach((r, i) => {
        const eroe = (HEROES.find((h) => h.id === r.personaggio)?.nome ?? r.personaggio).toUpperCase();
        const mio = miei.includes(r.nick);
        const col = mio ? '#80ff80' : i === 0 ? '#ffe066' : '#ffffff';
        const riga = `${String(r.pos).padStart(2)}. ${r.nick.padEnd(12)} ${String(r.punti).padStart(7)}  ${eroe.slice(0, 11).padEnd(11)}  ${r.livello.toUpperCase().padEnd(10)}  ${r.data.slice(8, 10)}/${r.data.slice(5, 7)}`;
        this.righe.push(txt(this, VIEW_W / 2, 62 + i * 12, riga, 8, col, 2).setOrigin(0.5));
      });
    });
  }

  update(): void {
    if (!this.pronto) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    if ((s.sx || s.dx) && this.time.now - this.ultimo > 200) { this.ultimo = this.time.now; this.cambia(s.dx ? 1 : -1); }
    if (s.confermaTap || s.pausaTap) this.esci();
    this.ctrl.flush();
  }
}
