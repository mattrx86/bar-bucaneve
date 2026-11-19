// ============================================================================
// Comandi: tastiera + touch. Ogni giocatore riceve un Controls con il suo schema e il
// resto del gioco non sa da dove arrivino i comandi.
//
//  - 'tutti'  UN giocatore (e menu): tutte le tastiere insieme, come sempre.
//             Frecce o WASD · J/M/Z/Ctrl spara · K/Spazio/X salta · L/C bomba · I pugno
//  - 'p1'     DUE giocatori, primo:  frecce · M spara · L salta · K bomba · J pugno
//  - 'p2'     DUE giocatori, secondo: WASD · 1 spara · 2 salta · 3 bomba · 4 pugno
//  Pausa (Esc o P) e conferma dei menu (Invio) valgono per tutti.
//  Pad: il primo pad collegato comanda 'tutti' e 'p1', il secondo comanda 'p2'.
//  (Xbox: levetta o croce muovono, A salta, X o dorsali sparano, B bomba, Y pugno, Start pausa.)
// ============================================================================
import Phaser from 'phaser';
import { touch } from './touch';

export type Schema = 'tutti' | 'p1' | 'p2';

/** Tasti di ogni schema. Un tasto in due schemi diversi farebbe muovere due giocatori insieme. */
const TASTI: Record<Schema, { sx: string[]; dx: string[]; su: string[]; giu: string[]; fuoco: string[]; salto: string[]; bomba: string[]; melee: string[] }> = {
  tutti: {
    sx: ['ArrowLeft', 'KeyA'], dx: ['ArrowRight', 'KeyD'], su: ['ArrowUp', 'KeyW'], giu: ['ArrowDown', 'KeyS'],
    fuoco: ['KeyJ', 'KeyM', 'ControlLeft', 'KeyZ'], salto: ['KeyK', 'Space', 'KeyX'], bomba: ['KeyL', 'KeyC'], melee: ['KeyI'],
  },
  p1: {
    sx: ['ArrowLeft'], dx: ['ArrowRight'], su: ['ArrowUp'], giu: ['ArrowDown'],
    fuoco: ['KeyM'], salto: ['KeyL'], bomba: ['KeyK'], melee: ['KeyJ'],
  },
  p2: {
    sx: ['KeyA'], dx: ['KeyD'], su: ['KeyW'], giu: ['KeyS'],
    fuoco: ['Digit1'], salto: ['Digit2'], bomba: ['Digit3'], melee: ['Digit4'],
  },
};

export interface Stato {
  sx: boolean; dx: boolean; su: boolean; giu: boolean;
  fuoco: boolean;        // tenuto premuto
  saltoTap: boolean;     // appena premuto
  bombaTap: boolean;
  meleeTap: boolean;
  pausaTap: boolean;
  confermaTap: boolean;
  /** L: audio acceso/spento (vale solo nella pausa). */
  audioTap: boolean;
}

// Tasti tenuti premuti: stato della finestra, condiviso da tutte le scene.
// Con scene.restart (strada -> cantina) un tasto già premuto non manda un nuovo keydown
// (l'autorepeat riguarda solo l'ultimo tasto premuto): con uno stato per scena il
// giocatore che teneva premuto DESTRA + SPARA si ritrovava fermo in cantina.
const tenuti = new Set<string>();
let inAscolto = false;
function ascoltaFinestra(): void {
  if (inAscolto) return;
  inAscolto = true;
  window.addEventListener('keydown', (e) => tenuti.add(e.code));
  window.addEventListener('keyup', (e) => tenuti.delete(e.code));
  window.addEventListener('blur', () => tenuti.clear());
}

const VUOTO: Stato = { sx: false, dx: false, su: false, giu: false, fuoco: false, saltoTap: false, bombaTap: false, meleeTap: false, pausaTap: false, confermaTap: false, audioTap: false };

export class Controls {
  private taps = new Set<string>();
  private schema: Schema;
  private conTouch: boolean;
  private scene: Phaser.Scene;
  private padIndex: number;
  private prevPad = new Set<number>();

  /** `schema`: quali tasti. `conTouch`: se leggere anche i comandi sullo schermo (solo il primo giocatore). */
  constructor(scene: Phaser.Scene, schema: Schema = 'tutti', conTouch = schema !== 'p2') {
    this.schema = schema; this.conTouch = conTouch; this.scene = scene;
    this.padIndex = schema === 'p2' ? 1 : 0;
    ascoltaFinestra();
    const kb = scene.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => { if (!e.repeat) this.taps.add(e.code); });
    scene.events.once('shutdown', () => { this.taps.clear(); });
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const mgr = this.scene.input.gamepad;
    return mgr && mgr.total > this.padIndex ? mgr.getPad(this.padIndex) : null;
  }

  /** Legge lo stato e azzera le pressioni singole: una sola chiamata per fotogramma. */
  leggi(): Stato {
    const k = (codes: string[]) => codes.some((c) => tenuti.has(c));
    const t = (codes: string[]) => { let f = false; for (const c of codes) if (this.taps.delete(c)) f = true; return f; };
    const T = TASTI[this.schema];
    const s: Stato = { ...VUOTO };
    s.audioTap = this.taps.has('KeyL'); // senza consumarlo: in partita L e' anche bomba/salto
    s.sx = k(T.sx); s.dx = k(T.dx); s.su = k(T.su); s.giu = k(T.giu);
    s.fuoco = k(T.fuoco);
    s.saltoTap = t(T.salto);
    s.bombaTap = t(T.bomba);
    s.meleeTap = t(T.melee);
    // Pausa e conferma valgono per tutti. La conferma e' solo Invio (o Spazio con lo schema
    // singolo): chi sta sparando o saltando non salta i menu per sbaglio.
    s.pausaTap = t(['Escape', 'KeyP']);
    s.confermaTap = t(this.schema === 'tutti' ? ['Enter', 'NumpadEnter', 'Space'] : ['Enter', 'NumpadEnter']);
    if (this.conTouch && touch.attivo) {
      s.sx ||= touch.sx; s.dx ||= touch.dx; s.su ||= touch.su; s.giu ||= touch.giu; s.fuoco ||= touch.fuoco;
      const tt = (n: 'salto' | 'bomba' | 'melee' | 'pausa') => touch.taps.delete(n);
      if (tt('salto')) s.saltoTap = true;
      if (tt('bomba')) s.bombaTap = true;
      if (tt('melee')) s.meleeTap = true;
      if (tt('pausa')) s.pausaTap = true;
    }
    try { this.leggiPad(s); } catch { /* un pad strano non deve mai fermare il gioco */ }
    return s;
  }

  /** Aggiunge i comandi del pad (se collegato). */
  private leggiPad(s: Stato): void {
    const p = this.pad(); if (!p) return;
    const ax = p.axes.length > 0 ? p.axes[0].getValue() : 0;
    const ay = p.axes.length > 1 ? p.axes[1].getValue() : 0;
    s.sx ||= p.left || ax < -0.4; s.dx ||= p.right || ax > 0.4;
    s.su ||= p.up || ay < -0.4; s.giu ||= p.down || ay > 0.4;
    s.fuoco ||= Boolean(p.X) || p.L1 > 0.3 || p.R1 > 0.3;
    const tap = (i: number) => { const ora = p.buttons[i]?.pressed ?? false; const era = this.prevPad.has(i); if (ora) this.prevPad.add(i); else this.prevPad.delete(i); return ora && !era; };
    const a = tap(0), b = tap(1), y = tap(3), start = tap(9);
    s.saltoTap ||= a; s.bombaTap ||= b; s.meleeTap ||= y;
    s.pausaTap ||= start; s.confermaTap ||= a || start;
  }

  /** Scarta le pressioni non lette (da chiamare a fine fotogramma). */
  flush(): void { this.taps.clear(); if (this.conTouch) touch.taps.clear(); }
}
