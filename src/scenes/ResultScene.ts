import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../content/defs';
import { Controls } from '../core/controls';
import { leaderboard } from '../core/save';
import { inviaPartita, classifica, nickSalvato, Modo } from '../core/classifica';
import { sfx, musica } from '../core/audio';
import { txt, zoomCamera } from '../core/ui';

/** `titolo`: scritta della vittoria (di serie 'ETTORE SCONFITTO!'; dopo la chiesa e' quella di HOLY SLUG). */
export interface Risultato { vittoria: boolean; tempo: number; giocatori: { nome: string; punti: number; eroe?: string }[]; titolo?: string;
  modo?: Modo; livello?: string }

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
    const modo: Modo = r.modo ?? 'completo';
    const nicks = r.giocatori.map((_, i) => nickSalvato(i ? 1 : 0)?.nick ?? r.giocatori[i].nome);
    const tempo = `${m}:${String(sec).padStart(2, '0')}`;
    txt(this, VIEW_W / 2, 50, due ? `TEMPO ${tempo}` : `${nicks[0]} (${r.giocatori[0].nome})   PUNTI ${r.giocatori[0].punti}   TEMPO ${tempo}`, 9).setOrigin(0.5);
    if (due) r.giocatori.forEach((g, i) => txt(this, VIEW_W / 2, 61 + i * 10, `${i + 1}P ${nicks[i]} (${g.nome})   PUNTI ${g.punti}`, 8, i ? '#60d8ff' : '#ffe066').setOrigin(0.5));
    // Invio alla classifica generale (una partita a zero punti non conta); poi la classifica.
    const yEsito = due ? 84 : 66;
    const esito = txt(this, VIEW_W / 2, yEsito, 'INVIO DEL PUNTEGGIO...', 8, '#a0a8c0').setOrigin(0.5);
    const invii = r.giocatori.map((g, i) => (g.punti > 0
      ? inviaPartita(i ? 1 : 0, { punti: g.punti, personaggio: g.eroe ?? 'eroe', livello: r.livello ?? 'strada', tempo: Math.max(1, Math.round(r.tempo)), modo, giocatori: r.giocatori.length })
      : Promise.resolve(null)));
    Promise.all(invii).then(async (es) => {
      const righe = es.map((e, i) => {
        if (!e) return '';
        const chi = due ? `${i + 1}P ` : '';
        if (!e.ok) return `${chi}${e.messaggio ?? ''}`;
        return `${chi}${e.record ? 'NUOVO RECORD PERSONALE! ' : ''}${e.posizione}° IN CLASSIFICA GENERALE`;
      }).filter((t) => t);
      esito.setText(righe.join('   ') || ' ').setColor(es.some((e) => e && e.ok) ? '#80ff80' : '#ffb060').setOrigin(0.5);
      const gen = await classifica(modo, 6);
      const y0 = due ? 100 : 84;
      const titolo = modo === 'ultimo' ? 'CLASSIFICA GENERALE - SOLO ULTIMO LIVELLO' : 'CLASSIFICA GENERALE';
      if (gen && gen.length) {
        txt(this, VIEW_W / 2, y0, titolo, 10, '#ffe066').setOrigin(0.5);
        gen.forEach((e, i) => {
          const mio = nicks.includes(e.nick);
          txt(this, VIEW_W / 2, y0 + 15 + i * 12, `${String(e.pos).padStart(2)}. ${e.nick.padEnd(12)} ${String(e.punti).padStart(7)}  ${e.livello.toUpperCase().padEnd(8)} ${e.data}`, 8, mio ? '#80ff80' : '#ffffff').setOrigin(0.5);
        });
      } else {
        // server non raggiungibile: classifica di questo dispositivo
        const top = await leaderboard.top(6);
        txt(this, VIEW_W / 2, y0, 'CLASSIFICA (SOLO QUESTO DISPOSITIVO)', 10, '#ffe066').setOrigin(0.5);
        top.forEach((e, i) => txt(this, VIEW_W / 2, y0 + 15 + i * 12, `${i + 1}. ${e.nome.padEnd(12)} ${String(e.punti).padStart(7)}  ${e.data}`, 8).setOrigin(0.5));
      }
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
