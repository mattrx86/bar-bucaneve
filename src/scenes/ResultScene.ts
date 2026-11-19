import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../content/defs';
import { Controls } from '../core/controls';
import { leaderboard } from '../core/save';
import { sfx, musica } from '../core/audio';
import { txt, zoomCamera } from '../core/ui';

/** `titolo`: scritta della vittoria (di serie 'ETTORE SCONFITTO!'; dopo la chiesa e' quella di HOLY SLUG). */
export interface Risultato { vittoria: boolean; tempo: number; giocatori: { nome: string; punti: number }[]; titolo?: string }

export class ResultScene extends Phaser.Scene {
  private ctrl!: Controls;
  private pronto = false;
  private entrata = 0;
  constructor() { super('Result'); }
  create(r: Risultato): void {
    zoomCamera(this);
    this.pronto = false; // la scena viene riusata: senza questo il ritardo anti-tasto vale solo la prima volta
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0c0e16).setOrigin(0);
    txt(this, VIEW_W / 2, 26, r.vittoria ? (r.titolo ?? 'ETTORE SCONFITTO!') : 'GAME OVER', 20, r.vittoria ? '#ffe066' : '#ff6060', 5).setOrigin(0.5);
    const m = Math.floor(r.tempo / 60), sec = Math.floor(r.tempo % 60);
    const due = r.giocatori.length > 1;
    txt(this, VIEW_W / 2, 52, due ? `TEMPO ${m}:${String(sec).padStart(2, '0')}` : `${r.giocatori[0].nome}   PUNTI ${r.giocatori[0].punti}   TEMPO ${m}:${String(sec).padStart(2, '0')}`, 10).setOrigin(0.5);
    if (due) r.giocatori.forEach((g, i) => txt(this, VIEW_W / 2, 64 + i * 11, `${i + 1}P ${g.nome}   PUNTI ${g.punti}`, 9, i ? '#60d8ff' : '#ffe066').setOrigin(0.5));
    // data locale AAAA-MM-GG; una partita a zero punti non entra in classifica.
    // In due ogni giocatore entra in classifica col proprio punteggio.
    const data = new Date().toLocaleDateString('sv-SE');
    Promise.all(r.giocatori.map((g) => (g.punti > 0 ? leaderboard.submit({ nome: g.nome, punti: g.punti, data }) : Promise.resolve(0))))
      .then((posti) => {
        const migliore = Math.min(...posti.filter((n) => n > 0), Infinity);
        if (migliore !== Infinity) txt(this, VIEW_W / 2, due ? 88 : 68, `NUOVO RECORD: ${migliore}° POSTO!`, 10, '#80ff80').setOrigin(0.5);
        return leaderboard.top(6);
      }).then((top) => {
        const y0 = due ? 102 : 88;
        txt(this, VIEW_W / 2, y0, 'CLASSIFICA', 11, '#ffe066').setOrigin(0.5);
        top.forEach((e, i) => txt(this, VIEW_W / 2, y0 + 16 + i * 12, `${i + 1}. ${e.nome.padEnd(8)} ${String(e.punti).padStart(7)}  ${e.data}`, 9).setOrigin(0.5));
      });
    const p = txt(this, VIEW_W / 2, VIEW_H - 12, 'INVIO O TOCCO PER GIOCARE ANCORA', 9).setOrigin(0.5);
    this.tweens.add({ targets: p, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    musica(null);
    sfx(r.vittoria ? 'raccolta' : 'morte');
    this.ctrl = new Controls(this);
    this.entrata = this.time.now;
    this.time.delayedCall(700, () => { this.pronto = true; });
    this.input.on('pointerdown', () => { if (this.pronto && this.time.now - this.entrata > 2500) this.scene.start('Select'); });
  }
  update(): void {
    if (!this.pronto) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    // 2,5 s di attesa: chi sta ancora premendo fuoco non salta la schermata per sbaglio
    if (s.confermaTap && this.time.now - this.entrata > 2500) this.scene.start('Select');
    this.ctrl.flush();
  }
}
