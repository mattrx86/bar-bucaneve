// ============================================================================
// Comandi: tastiera + pad. Progettato per più giocatori: ogni giocatore riceve
// un Controls diverso (tastiera, pad 0, pad 1, ...) e il resto del gioco non
// sa da dove arrivino i comandi.
// ============================================================================
import Phaser from 'phaser';

export interface Stato {
  sx: boolean; dx: boolean; su: boolean; giu: boolean;
  fuoco: boolean;        // tenuto premuto
  saltoTap: boolean;     // appena premuto
  bombaTap: boolean;
  meleeTap: boolean;
  pausaTap: boolean;
  confermaTap: boolean;
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

const VUOTO: Stato = { sx: false, dx: false, su: false, giu: false, fuoco: false, saltoTap: false, bombaTap: false, meleeTap: false, pausaTap: false, confermaTap: false };

export class Controls {
  private taps = new Set<string>();
  private padIndex: number | null;
  private scene: Phaser.Scene;
  private prevPad = new Set<number>();

  constructor(scene: Phaser.Scene, padIndex: number | null = null) {
    this.scene = scene;
    this.padIndex = padIndex;
    ascoltaFinestra();
    const kb = scene.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => { if (!e.repeat) this.taps.add(e.code); });
    scene.events.once('shutdown', () => { this.taps.clear(); });
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    if (this.padIndex === null) return null;
    const mgr = this.scene.input.gamepad;
    return mgr && mgr.total > this.padIndex ? mgr.getPad(this.padIndex) : null;
  }

  /** Legge lo stato e azzera le pressioni singole: una sola chiamata per fotogramma. */
  leggi(): Stato {
    const k = (...codes: string[]) => codes.some((c) => tenuti.has(c));
    const t = (...codes: string[]) => { let f = false; for (const c of codes) if (this.taps.delete(c)) f = true; return f; };
    const s: Stato = { ...VUOTO };
    // tastiera: sempre attiva, anche con il pad collegato
    s.sx = k('ArrowLeft', 'KeyA');
    s.dx = k('ArrowRight', 'KeyD');
    s.su = k('ArrowUp', 'KeyW');
    s.giu = k('ArrowDown', 'KeyS');
    s.fuoco = k('KeyJ', 'ControlLeft', 'KeyZ');
    s.saltoTap = t('KeyK', 'Space', 'KeyX');
    s.bombaTap = t('KeyL', 'KeyC');
    s.meleeTap = t('KeyI');
    s.pausaTap = t('Escape', 'KeyP');
    // conferma solo con Invio/Spazio: chi sta sparando (J) o saltando (K) non salta i menu per sbaglio
    s.confermaTap = t('Enter', 'NumpadEnter', 'Space');
    // pad (Xbox: A salta, B bomba, X spara, Y pugno, Start pausa/conferma)
    const p = this.padIndex === null ? null : this.pad();
    if (p) {
      const ax = p.axes.length > 0 ? p.axes[0].getValue() : 0;
      const ay = p.axes.length > 1 ? p.axes[1].getValue() : 0;
      s.sx ||= p.left || ax < -0.4; s.dx ||= p.right || ax > 0.4;
      s.su ||= p.up || ay < -0.4; s.giu ||= p.down || ay > 0.4;
      s.fuoco ||= Boolean(p.X) || p.L1 > 0.3 || p.R1 > 0.3;
      const tap = (i: number) => { const now = p.buttons[i]?.pressed ?? false; const was = this.prevPad.has(i); if (now) this.prevPad.add(i); else this.prevPad.delete(i); return now && !was; };
      const a = tap(0), b = tap(1), y = tap(3), start = tap(9);
      s.saltoTap ||= a; s.bombaTap ||= b; s.meleeTap ||= y;
      s.pausaTap ||= start; s.confermaTap ||= a || start;
    }
    return s;
  }

  /** Scarta le pressioni non lette (da chiamare a fine fotogramma). */
  flush(): void { this.taps.clear(); }
}
