import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../content/defs';
import { Controls } from '../core/controls';
import { leaderboard } from '../core/save';
import { sfx } from '../core/audio';
import { txt } from '../core/ui';

export interface Risultato { vittoria: boolean; punti: number; tempo: number; nome: string }

export class ResultScene extends Phaser.Scene {
  private ctrl!: Controls;
  private pronto = false;
  private entrata = 0;
  constructor() { super('Result'); }
  create(r: Risultato): void {
    this.pronto = false; // la scena viene riusata: senza questo il ritardo anti-tasto vale solo la prima volta
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0c0e16).setOrigin(0);
    txt(this, VIEW_W / 2, 26, r.vittoria ? 'ETTORE SCONFITTO!' : 'GAME OVER', 20, r.vittoria ? '#ffe066' : '#ff6060', 5).setOrigin(0.5);
    const m = Math.floor(r.tempo / 60), s = Math.floor(r.tempo % 60);
    txt(this, VIEW_W / 2, 52, `${r.nome}   PUNTI ${r.punti}   TEMPO ${m}:${String(s).padStart(2, '0')}`, 10).setOrigin(0.5);
    // data locale AAAA-MM-GG; una partita a zero punti non entra in classifica
    const invio = r.punti > 0
      ? leaderboard.submit({ nome: r.nome, punti: r.punti, data: new Date().toLocaleDateString('sv-SE') })
      : Promise.resolve(0);
    invio.then((pos) => {
      if (pos) txt(this, VIEW_W / 2, 68, `NUOVO RECORD: ${pos}° POSTO!`, 10, '#80ff80').setOrigin(0.5);
      return leaderboard.top(6);
    }).then((top) => {
      txt(this, VIEW_W / 2, 88, 'CLASSIFICA', 11, '#ffe066').setOrigin(0.5);
      top.forEach((e, i) => txt(this, VIEW_W / 2, 104 + i * 13, `${i + 1}. ${e.nome.padEnd(8)} ${String(e.punti).padStart(7)}  ${e.data}`, 9).setOrigin(0.5));
    });
    const p = txt(this, VIEW_W / 2, VIEW_H - 12, 'INVIO per giocare ancora', 9).setOrigin(0.5);
    this.tweens.add({ targets: p, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    sfx(r.vittoria ? 'raccolta' : 'morte');
    this.ctrl = new Controls(this);
    this.entrata = this.time.now;
    this.time.delayedCall(700, () => { this.pronto = true; });
  }
  update(): void {
    if (!this.pronto) { this.ctrl.flush(); return; }
    const s = this.ctrl.leggi();
    // 2,5 s di attesa: chi sta ancora premendo fuoco non salta la schermata per sbaglio
    if (s.confermaTap && this.time.now - this.entrata > 2500) this.scene.start('Select');
    this.ctrl.flush();
  }
}
