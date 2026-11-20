// ============================================================================
// HOLY SLUG - i due boss della chiesa. Usano la stessa base dei boss di Buca Slug (BossBase):
// vita, lampo quando vengono colpiti, punti, frasi, collisioni con i colpi del giocatore.
//
// GRISO (anziano, lento): si avvicina e frusta col rosario da vicino; da lontano lancia la Bibbia
//   ad arco. Sotto meta' vita lancia due Bibbie di fila.
// DON ANTONIO (grosso, lentissimo): asperge l'acqua santa a ventaglio, lancia la teglia di lasagne
//   ad arco e la sbatte a terra mandando due ondate di lasagna rasoterra (da saltare).
// Ogni attacco ha un preavviso visibile (posa di carica + lampeggio o "!").
// ============================================================================
import Phaser from 'phaser';
import { GROUND_Y } from './content/defs';
import { BossBase, World, GRAVITY, setPose } from './entities';
import { GRISO, DON_ANTONIO, FRASI_GRISO, FRASI_DON } from './content/holy';
import { CH_ROSARIO_GRISO } from './content/chiesa';
import { SHEETS } from './content/sprites';
import { sfx, voce } from './core/audio';

/** Velocita' (vx, vy) per un lancio ad arco da (x0,y0) che atterra a terra vicino a `xBersaglio` in T secondi. */
function arco(x0: number, y0: number, xBersaglio: number, T: number): { vx: number; vy: number } {
  const dx = Phaser.Math.Clamp(xBersaglio - x0, -240, 240);
  return { vx: dx / T, vy: (GROUND_Y - 8 - y0 - 0.5 * GRAVITY * 0.6 * T * T) / T };
}

/** Morte comune: posa di colpo, poi cade all'indietro ruotando sui piedi e svanisce. */
function cadi(b: BossBase, dt: number, posa: string): void {
  b.mortoT += dt;
  setPose(b.sprite, b.sheet, posa);
  const k = Phaser.Math.Clamp((b.mortoT - 0.25) / 0.45, 0, 1);
  b.sprite.setPosition(Math.round(b.x * 1.5) / 1.5, b.y).setFlipX(!b.guardaDx).setAngle((b.guardaDx ? -1 : 1) * 84 * k * k);
  b.sprite.clearTint();
  if (b.mortoT > 1.5) b.sprite.setAlpha(Math.max(0, 1 - (b.mortoT - 1.5) * 1.5));
}

export class Griso extends BossBase {
  nome = GRISO.nome; sottotitolo = GRISO.sottotitolo; punti = GRISO.punti;
  private prossimo = 1.0; private colpito = false; private lanci = 0; private frustate = 0;
  private voceMorte = false;
  constructor(w: World, x: number) { super(w, 'boss_griso', x, GRISO.vita); }
  box(): Phaser.Geom.Rectangle { return new Phaser.Geom.Rectangle(this.x - 12, this.y - 66, 24, 66); }

  /** Voce di combattimento ("voce Griso"): non a ogni attacco, mai piu' di una ogni 6 s. */
  private parla(prob = 0.5): void { if (Math.random() < prob) voce('griso_voce', 6); }

  update(dt: number): void {
    const p = this.w.bersaglio(this.x); const now = this.w.sc.time.now / 1000;
    this.lampo = Math.max(0, this.lampo - dt);
    if (this.morto) {
      // la voce di morte parte una volta sola, all'inizio della caduta, e nessun'altra voce la interrompe
      if (!this.voceMorte) { this.voceMorte = true; voce('griso_morte', 0, 1.1, true); }
      cadi(this, dt, 'hit'); return;
    }
    const lim = this.w.limiti();
    const dx = p.x - this.x, dist = Math.abs(dx);
    const rabbia = this.vita < this.vitaMax * 0.5;
    this.t += dt;
    switch (this.st) {
      case 'entra':
        this.guardaDx = false; this.x -= 40 * dt;
        this.disegna(`walk_0${(Math.floor(now * 6) % 4) + 1}`);
        if (this.x < lim.dx - 60) { this.st = 'cammina'; this.t = 0; this.attivo = true; this.frase(FRASI_GRISO); voce('griso_sisi'); }
        break;
      case 'cammina': {
        this.guardaDx = dx > 0;
        const v = dist > 70 ? Math.sign(dx) * (rabbia ? 52 : 40) : 0;
        this.x = Phaser.Math.Clamp(this.x + v * dt, lim.sx + 20, lim.dx - 20);
        this.disegna(v ? `walk_0${(Math.floor(now * 7) % 4) + 1}` : (Math.floor(now * 2) % 2 ? 'idle' : 'idle_02'));
        this.prossimo -= dt;
        if (this.prossimo > 0 || p.morto) break;
        // vicino: sferzata col rosario; a media distanza: lancia il rosario; lontano: la Bibbia
        if (dist < 60 && this.frustate < 2) { this.st = 'frusta'; this.frustate++; }
        else if (dist < 190 && Math.random() < 0.55) { this.st = 'rosario'; this.frustate = 0; }
        else { this.st = 'bibbia'; this.lanci = rabbia ? 2 : 1; this.frustate = 0; }
        this.t = 0; this.colpito = false;
        if (this.st !== 'frusta') this.parla(0.45);
        break;
      }
      case 'frusta': {
        // corpo a corpo: rosario alzato (preavviso), poi la sferzata davanti a se'. Il rosario resta in mano.
        const pre = rabbia ? 0.4 : 0.5;
        this.disegna(this.t < pre ? 'frusta_01' : this.t < pre + 0.18 ? 'frusta_02' : 'pugni');
        if (this.t < pre && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= pre + 0.12) {
          this.colpito = true; sfx('melee');
          const d = this.guardaDx ? 1 : -1;
          const a = new Phaser.Geom.Rectangle(this.x + (d > 0 ? 4 : -56), this.y - 54, 52, 32);
          for (const q of this.w.giocatori) if (!q.morto && Phaser.Geom.Intersects.RectangleToRectangle(a, q.box())) q.danno(GRISO.danno);
        }
        if (this.t > pre + 0.6) { this.st = 'cammina'; this.prossimo = 0.5 + Math.random() * 0.6; }
        break;
      }
      case 'rosario': {
        // rosario alzato -> dietro la testa -> lo scaglia: parte dal punto in cui il foglio originale lo
        // disegna in volo (CH_ROSARIO_GRISO), vola teso e girando verso il giocatore (si salta o ci si abbassa)
        this.guardaDx = dx > 0;
        const pre = rabbia ? 0.38 : 0.48;
        this.disegna(this.t < pre ? 'frusta_01' : this.t < pre + 0.16 ? 'frusta_02' : this.t < pre + 0.5 ? 'frusta_03' : 'recupero_01');
        if (this.t < pre && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= pre + 0.16) {
          this.colpito = true;
          const d = this.guardaDx ? 1 : -1;
          const k = this.sprite.scaleX * SHEETS.boss_griso.d;               // scala del boss in scena
          const x0 = this.x + d * CH_ROSARIO_GRISO[0] * k, y0 = this.y + CH_ROSARIO_GRISO[1] * k;
          const yb = Phaser.Math.Clamp(p.y - 30, GROUND_Y - 50, GROUND_Y - 22);   // altezza del petto del bersaglio
          const ang = Math.atan2(yb - y0, Math.max(40, Math.abs(p.x - x0)) * d);
          this.w.sparaProiettile({ x: x0, y: y0, ang: d > 0 ? Math.max(-0.35, Math.min(0.35, ang)) : ang, speed: rabbia ? 230 : 200, danno: GRISO.danno,
            tex: 'pallina', disegno: 'rosario_griso', ostile: true, gittata: 420, gira: d * 14, impatto: 0x8a4a20 });
          sfx('melee');
        }
        if (this.t > pre + 0.9) { this.st = 'cammina'; this.prossimo = 0.6 + Math.random() * 0.6; }
        break;
      }
      case 'bibbia': {
        // Bibbia sotto il braccio -> alzata sopra la testa (preavviso) -> carica -> braccio teso: la Bibbia
        // lascia la mano proprio nel fotogramma del braccio teso, dalla mano, e vola ad arco girando
        this.guardaDx = dx > 0;
        const f = this.t < 0.28 ? 'bibbia_01' : this.t < 0.56 ? 'bibbia_02' : this.t < 0.7 ? 'bibbia_03' : 'bibbia_04';
        this.disegna(f);
        if (this.t >= 0.28 && this.t < 0.56 && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= 0.7) {
          this.colpito = true;
          const d = this.guardaDx ? 1 : -1, x0 = this.x + 26 * d, y0 = this.y - 46;
          const v = arco(x0, y0, p.x, 0.8);
          this.w.sparaProiettile({ x: x0, y: y0, ang: Math.atan2(v.vy, v.vx), speed: Math.hypot(v.vx, v.vy), danno: GRISO.danno,
            tex: 'pallina', disegno: 'bibbia', ostile: true, gittata: 900, arco: true, gira: d * 9, impatto: 0x7a4a24 });
          sfx('bomba');
        }
        if (this.t > 1.05) {
          this.lanci--;
          if (this.lanci > 0) { this.t = 0; this.colpito = false; }       // seconda Bibbia: la riprende da sotto il braccio
          else { this.st = 'recupero'; this.t = 0; }
        }
        break;
      }
      case 'recupero': // fiato corto: resta scoperto un attimo
        this.disegna(this.t < 0.35 ? 'recupero_01' : 'recupero_02');
        if (this.t > 0.8) { this.st = 'cammina'; this.prossimo = 0.4 + Math.random() * 0.8; if (Math.random() < 0.3) { this.frase(FRASI_GRISO); voce('griso_sisi', 10); } }
        break;
    }
    this.sprite.setAngle(0);
  }
}

export class DonAntonio extends BossBase {
  nome = DON_ANTONIO.nome; sottotitolo = DON_ANTONIO.sottotitolo; punti = DON_ANTONIO.punti;
  private prossimo = 1.2; private colpito = false; private turno = 0; private versoEntrata: 1 | -1 = 1;
  constructor(w: World, x: number, daSinistra = true) {
    super(w, 'boss_donantonio', x, DON_ANTONIO.vita);
    this.versoEntrata = daSinistra ? 1 : -1;
  }
  box(): Phaser.Geom.Rectangle { return new Phaser.Geom.Rectangle(this.x - 19, this.y - 76, 38, 76); }

  update(dt: number): void {
    const p = this.w.bersaglio(this.x); const now = this.w.sc.time.now / 1000;
    this.lampo = Math.max(0, this.lampo - dt);
    if (this.morto) {
      // Don Antonio ha le sue pose di caduta nel foglio originale: si usano quelle
      this.mortoT += dt;
      this.disegna(this.mortoT < 0.2 ? 'hit' : this.mortoT < 0.45 ? 'death_01' : this.mortoT < 0.75 ? 'death_02' : this.mortoT < 1.05 ? 'death_03' : 'death_04');
      this.sprite.clearTint();
      if (this.mortoT > 1.8) this.sprite.setAlpha(Math.max(0, 1 - (this.mortoT - 1.8) * 1.5));
      return;
    }
    const lim = this.w.limiti();
    const dx = p.x - this.x, dist = Math.abs(dx);
    const rabbia = this.vita < this.vitaMax * 0.5;
    this.t += dt;
    switch (this.st) {
      case 'entra':
        this.guardaDx = this.versoEntrata > 0; this.x += this.versoEntrata * 46 * dt;
        this.disegna(`walk_0${(Math.floor(now * 7) % 4) + 1}`);
        if ((this.versoEntrata > 0 && this.x > lim.sx + 60) || (this.versoEntrata < 0 && this.x < lim.dx - 60)) {
          this.st = 'cammina'; this.t = 0; this.attivo = true;
          this.w.testo(this.x, this.y - 100, 'DOVE SEI GRISO?!', '#ffe066'); voce('donantonio_dovesei');
        }
        break;
      case 'cammina': {
        this.guardaDx = dx > 0;
        const v = dist > 90 ? Math.sign(dx) * (rabbia ? 38 : 30) : dist < 50 ? -Math.sign(dx) * 26 : 0;
        this.x = Phaser.Math.Clamp(this.x + v * dt, lim.sx + 24, lim.dx - 24);
        this.disegna(v ? `walk_0${(Math.floor(now * 6) % 4) + 1}` : 'idle');
        this.prossimo -= dt;
        if (this.prossimo > 0 || p.morto) break;
        // giro di attacchi: acqua santa, lasagna lanciata, acqua santa, schianto della teglia
        const giro = ['asperge', 'lancio', 'asperge', 'schianto'];
        this.st = giro[this.turno++ % giro.length]; this.t = 0; this.colpito = false;
        if (this.st === 'schianto') { sfx('allarme'); this.w.testo(this.x, this.y - 96, '!', '#ff5050'); }
        if (Math.random() < 0.3) { const i = Math.random() < 0.5 ? 1 : 2; this.frase([FRASI_DON[i]]); voce(`donantonio_cani_${i}`, 6); }
        break;
      }
      case 'asperge': {
        // intinge l'aspersorio nel secchiello, lo alza e spruzza un ventaglio di gocce
        this.guardaDx = dx > 0;
        const f = this.t < 0.25 ? 'intinge_01' : this.t < 0.5 ? 'intinge_02' : this.t < 0.75 ? 'alza' : this.t < 0.9 ? 'asperge_01' : 'asperge_02';
        this.disegna(f);
        if (this.t >= 0.5 && this.t < 0.75 && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= 0.9) {
          this.colpito = true;
          const d = this.guardaDx ? 1 : -1, n = rabbia ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const ang = (d > 0 ? 0 : Math.PI) + d * (-0.55 + (i / (n - 1)) * 0.75);
            this.w.sparaProiettile({ x: this.x + 26 * d, y: this.y - 56, ang, speed: 150 + Math.random() * 30, danno: Math.round(DON_ANTONIO.danno * 0.5), tex: 'pallina', disegno: 'goccia', ostile: true, gittata: 420, arco: true });
          }
          sfx('nemicoColpito');
        }
        if (this.t > 1.3) { this.st = 'cammina'; this.prossimo = rabbia ? 0.5 : 0.9; }
        break;
      }
      case 'lancio': {
        // teglia al petto -> sopra la testa -> lancio ad arco verso il giocatore
        this.guardaDx = dx > 0;
        const f = this.t < 0.35 ? 'lasagna_petto' : this.t < 0.6 ? 'lasagna_alza' : this.t < 0.85 ? 'lasagna_alto' : 'idle';
        this.disegna(f);
        if (this.t >= 0.35 && this.t < 0.85 && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= 0.85) {
          this.colpito = true;
          const d = this.guardaDx ? 1 : -1, x0 = this.x + 6 * d, y0 = this.y - 92;
          const v = arco(x0, y0, p.x, 1.0);
          this.w.sparaProiettile({ x: x0, y: y0, ang: Math.atan2(v.vy, v.vx), speed: Math.hypot(v.vx, v.vy), danno: DON_ANTONIO.danno, tex: 'pallina', disegno: 'lasagna', ostile: true, gittata: 900, arco: true, gira: 6, impatto: 0xd06a20 });
          sfx('bomba');
        }
        if (this.t > 1.25) { this.st = 'cammina'; this.prossimo = rabbia ? 0.6 : 1.0; }
        break;
      }
      case 'schianto': {
        // si china con la teglia (preavviso lungo), la sbatte a terra: due ondate rasoterra da saltare
        const f = this.t < 0.35 ? 'lasagna_basso' : this.t < 0.85 ? 'lasagna_china' : this.t < 1.0 ? 'schianto_01' : 'schianto_02';
        this.disegna(f);
        if (this.t < 0.85 && Math.floor(now * 14) % 2) this.lampo = 0.02;
        if (!this.colpito && this.t >= 0.9) {
          this.colpito = true; this.w.scuoti(220, 4); sfx('motoImpatto');
          for (const d of [1, -1]) {
            this.w.sparaProiettile({ x: this.x + 18 * d, y: GROUND_Y - 7, ang: d > 0 ? 0 : Math.PI, speed: rabbia ? 175 : 150, danno: DON_ANTONIO.danno, tex: 'pallina', disegno: 'lasagna', ostile: true, gittata: 330, scala: 0.6, impatto: 0xd06a20 });
          }
        }
        if (this.t > 1.6) { this.st = 'cammina'; this.prossimo = rabbia ? 0.7 : 1.1; }
        break;
      }
    }
    this.sprite.setAngle(0);
  }
}
