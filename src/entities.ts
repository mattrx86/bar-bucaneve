// ============================================================================
// Entità: proiettili, giocatore, nemici, Giova (mini-boss), Ettore (boss).
// Fisica scritta a mano: poche entità e controllo totale sul "feel".
// Gli sprite sono strisce generate da tools/build_assets.py (SHEETS).
// ============================================================================
import Phaser from 'phaser';
import { GROUND_Y, pix, WEAPONS, WeaponDef, HeroDef, EnemyDef, GIOVA, ETTORE, FRASI_ETTORE, FRASI_GIOVA, DiffDef, BALCONE_Y } from './content/defs';
import { SHEETS } from './content/sprites';
import { sfx, voce, parla } from './core/audio';
import { fxTex, img, PROIETTILI_DISEGNATI } from './core/fx';

export const GRAVITY = 980;
const R = Math.PI / 180;

/** Imposta texture, fotogramma e origine (piedi) di uno sprite da un foglio. */
export function setPose(s: Phaser.GameObjects.Sprite, sheet: string, pose: string): void {
  const d = SHEETS[sheet];
  const i = Math.max(0, d.frames.indexOf(pose));
  const key = `sh_${sheet}`;
  if (s.texture.key !== key) s.setTexture(key, i); else s.setFrame(i);
  s.setOrigin(0.5, d.foot / d.ch).setScale(1 / d.d);
}

export interface BulletOpts {
  x: number; y: number; ang: number; speed: number; danno: number;
  tex: string; colore?: number; ostile: boolean; gittata: number;
  perforante?: boolean; esplosivo?: number; arco?: boolean; scala?: number;
  /** Chi ha sparato (indice del giocatore, 0 o 1): serve ad assegnare i punti. */
  chi?: number;
}

export interface World {
  sc: Phaser.Scene;
  sparaProiettile(o: BulletOpts): void;
  boom(x: number, y: number, grande: boolean): void;
  /** `chi` = indice del giocatore che incassa i punti (0 se non indicato). */
  punti(n: number, x?: number, y?: number, chi?: number): void;
  testo(x: number, y: number, s: string, color?: string): void;
  /** Scossa della camera: durata in ms e ampiezza in PIXEL DI GIOCO. */
  scuoti(ms: number, px: number): void;
  /** Il primo giocatore (compatibilita'): per chi deve scegliere un bersaglio usare `bersaglio`. */
  giocatore: Player;
  giocatori: Player[];
  /** Il giocatore vivo piu' vicino a `x` (se sono tutti a terra, il piu' vicino in assoluto). */
  bersaglio(x: number): Player;
  nemici: Enemy[];
  limiti(): { sx: number; dx: number };
  colpoMischia?: (area: Phaser.Geom.Rectangle, danno: number, chi?: number) => void;
  bossVicino?: (x: number, y: number) => boolean;
  /** micro-pausa del gioco (in secondi) per dare peso ai colpi */
  hitstop(s: number): void;
  /** uccisione di un nemico: gestisce combo e moltiplicatori */
  uccisione(base: number, x: number, y: number, mischia: boolean, chi?: number): void;
  bossolo(x: number, y: number, dir: number): void;
  polvere?(x: number, grande?: boolean): void;
  /** Mirino lampeggiante a terra: avvisa dove sta per cadere qualcosa. */
  mirino?(x: number): void;
  mortoNemico?(e: Enemy): void;
  giocatoreColpito(): void;
  diff: DiffDef;
}

/** Lampo bianco (o normale) su uno sprite. */
export function lampeggia(s: Phaser.GameObjects.Sprite, on: boolean, colore = 0xffffff): void {
  if (on) s.setTint(colore).setTintMode(Phaser.TintModes.FILL);
  else s.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
}

// ---------------------------------------------------------------------------
export class Bullet {
  sprite: Phaser.GameObjects.Image;
  vx: number; vy: number; vissuto = 0; morto = false;
  /** Posizione al fotogramma precedente: i colpi veloci vanno cercati lungo il tratto
   *  percorso, non nel solo punto di arrivo (a 520 px/s e 30 fps avanzano 17 px). */
  px: number; py: number;
  colpiti = new Set<unknown>();
  constructor(public w: World, public o: BulletOpts) {
    // proiettili, razzi e granate disegnati da voi (se ci sono), altrimenti quelli del codice
    const dis = PROIETTILI_DISEGNATI[o.tex] ? fxTex(PROIETTILI_DISEGNATI[o.tex], o.tex) : { key: o.tex, s: 1 };
    this.sprite = w.sc.add.image(o.x, o.y, dis.key).setDepth(60).setRotation(o.ang);
    if (o.colore !== undefined && dis.key === o.tex) this.sprite.setTint(o.colore);
    this.sprite.setScale((o.scala ?? 1) * dis.s);
    this.vx = Math.cos(o.ang) * o.speed; this.vy = Math.sin(o.ang) * o.speed;
    this.px = o.x; this.py = o.y;
  }
  update(dt: number): void {
    this.px = this.sprite.x; this.py = this.sprite.y;
    if (this.o.arco) { this.vy += GRAVITY * 0.6 * dt; this.sprite.rotation += 10 * dt; }
    else if (this.o.tex === 'bottiglia') this.sprite.rotation += Math.sign(this.vx) * 14 * dt; // bottiglia che rotola
    this.sprite.x += this.vx * dt; this.sprite.y += this.vy * dt;
    this.vissuto += Math.hypot(this.vx, this.vy) * dt;
    if (this.vissuto > this.o.gittata || this.sprite.y > GROUND_Y + 4) this.morto = true;
  }
  distruggi(): void { this.sprite.destroy(); }
}

// ---------------------------------------------------------------------------
// GIOCATORE
// ---------------------------------------------------------------------------
export interface InputState {
  sx: boolean; dx: boolean; su: boolean; giu: boolean;
  fuoco: boolean; saltoTap: boolean; bombaTap: boolean; meleeTap: boolean;
}

export class Player {
  sprite: Phaser.GameObjects.Sprite;
  sheet: string;
  x: number; y: number; vx = 0; vy = 0;
  onGround = true; guardaDx = true; crouch = false; su = false;
  vitaMax = 100; vita = 100;
  arma: WeaponDef = WEAPONS.pistola; munizioni = -1; bombe = 10;
  invuln = 0; morto = false; mortoT = 0; vince = false;
  /** Senza vite: resta fuori finche' la partita non riparte (solo in due). */
  fuori = false;
  private cadenzaT = 0; private sparoT = 0; private colpitoT = 0;
  private azione: 'melee' | 'bomba' | null = null; private azioneT = 0;
  private posa = 'idle';

  constructor(public w: World, public def: HeroDef, x: number, public idx = 0) {
    this.x = x; this.y = GROUND_Y;
    this.sheet = `hero_${def.id}`;
    this.sprite = w.sc.add.sprite(x, GROUND_Y, `sh_${this.sheet}`, 0).setDepth(50);
    this.arma = WEAPONS[def.arma] ?? WEAPONS.pistola;
  }

  /** Punta dell'arma nella posa attuale (misurata sul disegno). */
  bocca(): { x: number; y: number; ang: number } {
    const S = SHEETS[this.sheet].muzzle;
    const m = S[this.posa] ?? S.shoot;
    // La quota resta quella della posa di tiro: nelle pose di corsa la canna è disegnata
    // più in basso, e il flusso di proiettili si abbassava di 15 px fermandosi e ballava
    // da un fotogramma all'altro (misurati fino a 9 px di oscillazione su alcuni eroi).
    const my = this.posa.startsWith('run_') ? S.shoot[1] : m[1];
    const dir = this.guardaDx ? 1 : -1;
    const ang = this.su ? -Math.PI / 2 : (this.guardaDx ? 0 : Math.PI);
    return { x: this.x + m[0] * dir, y: this.y + my, ang };
  }
  box(): Phaser.Geom.Rectangle {
    const h = this.crouch ? 30 : 46;
    return new Phaser.Geom.Rectangle(this.x - 9, this.y - h, 18, h);
  }
  prendiArma(id: string): void {
    const a = WEAPONS[id]; if (!a) return;
    this.arma = a; this.munizioni = a.munizioni;
    if (a.id !== 'pistola') parla([this.def.id, 'eroe'], 'arma', 0.8);
  }
  danno(n: number): void {
    if (this.invuln > 0 || this.morto || this.vince) return;
    this.vita -= Math.round(n * this.w.diff.dannoSubito); this.invuln = 0.75; this.colpitoT = 0.3;
    sfx('colpito'); this.w.scuoti(140, 3); this.w.giocatoreColpito();
    if (this.vita > 0) parla([this.def.id, 'eroe'], 'colpito', 0.5);
    if (this.vita <= 0) this.muori();
  }
  muori(): void {
    if (this.morto) return;
    this.morto = true; this.mortoT = 0; this.vita = 0;
    this.vx = this.guardaDx ? -60 : 60; this.vy = -170; this.onGround = false;
    sfx('morte'); parla([this.def.id, 'eroe'], 'muore', 1, 0);
  }
  rinasci(x: number): void {
    this.morto = false; this.mortoT = 0; this.vita = this.vitaMax; this.invuln = 2.2;
    this.x = x; this.y = GROUND_Y - 60; this.vx = 0; this.vy = 0; this.onGround = false;
    this.arma = WEAPONS.pistola; this.munizioni = -1; this.bombe = Math.max(this.bombe, 5);
  }

  update(dt: number, inp: InputState): void {
    const t = this.w.sc.time.now / 1000;
    this.invuln = Math.max(0, this.invuln - dt);
    this.cadenzaT = Math.max(0, this.cadenzaT - dt);
    this.sparoT = Math.max(0, this.sparoT - dt);
    this.colpitoT = Math.max(0, this.colpitoT - dt);
    this.azioneT = Math.max(0, this.azioneT - dt); if (this.azioneT === 0) this.azione = null;
    const lim = this.w.limiti();

    if (this.morto) {
      this.mortoT += dt;
      this.vy += GRAVITY * dt; this.y += this.vy * dt; this.x += this.vx * dt;
      if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.vx = 0; }
      const step = this.mortoT < 0.15 ? 'hit' : this.mortoT < 0.35 ? 'death_01' : this.mortoT < 0.6 ? 'death_02' : 'death_03';
      this.mostra(step); return;
    }
    if (this.vince) {
      this.vx = 0; this.mostra(Math.floor(t * 2.5) % 2 ? 'win_01' : 'win_02'); return;
    }

    this.crouch = inp.giu && this.onGround;
    const vuoleSx = inp.sx && !this.crouch, vuoleDx = inp.dx && !this.crouch;
    if (vuoleDx) this.guardaDx = true;
    if (vuoleSx) this.guardaDx = false;
    this.su = inp.su && !this.crouch;

    const velMax = 112;
    const target = (vuoleDx ? velMax : 0) - (vuoleSx ? velMax : 0);
    const acc = this.onGround ? 1400 : 760;
    this.vx = Phaser.Math.Linear(this.vx, target, Math.min(1, (acc * dt) / velMax));
    if (Math.abs(this.vx) < 4) this.vx = 0;
    if (inp.saltoTap && this.onGround && !this.crouch) { this.vy = -330; this.onGround = false; sfx('salto'); }
    this.vy += GRAVITY * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y >= GROUND_Y) { if (!this.onGround) sfx('atterra'); this.y = GROUND_Y; this.vy = 0; this.onGround = true; }
    this.x = Phaser.Math.Clamp(this.x, lim.sx + 12, lim.dx - 12);

    if (inp.meleeTap && !this.azione) this.melee();
    else if (inp.bombaTap && this.bombe > 0 && !this.azione) this.lanciaBomba();
    else if (inp.fuoco && this.cadenzaT <= 0 && this.azione !== 'melee') {
      // da vicino il fuoco diventa un colpo corpo a corpo, come in Metal Slug
      const vicino = this.w.nemici.find((e) => !e.morto && Math.abs(e.x - this.x) < 26 && Math.abs(e.y - this.y) < 20 && (e.x > this.x) === this.guardaDx);
      const b = this.w.bossVicino?.(this.x, this.y);
      if ((vicino || b) && !this.su) this.melee(); else this.spara();
    }

    let posa: string;
    if (this.azione === 'melee') posa = this.azioneT > 0.28 ? 'melee_01' : this.azioneT > 0.12 ? 'melee_02' : 'melee_03';
    else if (this.azione === 'bomba') posa = this.azioneT > 0.26 ? 'bomb_01' : this.azioneT > 0.12 ? 'bomb_02' : 'bomb_03';
    else if (this.colpitoT > 0) posa = 'hit';
    else if (!this.onGround) posa = this.su ? 'shoot_up' : this.sparoT > 0 ? 'jump_shoot' : 'jump';
    else if (this.crouch) posa = this.sparoT > 0 ? 'crouch_shoot' : 'crouch';
    else if (this.su) posa = 'shoot_up';
    else if (this.sparoT > 0 && Math.abs(this.vx) < 10) posa = 'shoot';
    else if (Math.abs(this.vx) > 10) posa = `run_0${(Math.floor(t * 13) % 8) + 1}`;
    else posa = 'idle';
    this.mostra(posa);
  }

  private mostra(posa: string): void {
    this.posa = posa;
    setPose(this.sprite, this.sheet, posa);
    this.sprite.setPosition(pix(this.x), pix(this.y)).setFlipX(!this.guardaDx);
    this.sprite.setAlpha(this.invuln > 0 && !this.morto ? (Math.floor(this.w.sc.time.now / 60) % 2 ? 0.4 : 1) : 1);
  }

  private spara(): void {
    const a = this.arma;
    this.cadenzaT = a.cadenza; this.sparoT = 0.22;
    if (this.munizioni > 0) { this.munizioni--; if (this.munizioni === 0) { this.arma = WEAPONS.pistola; this.munizioni = -1; } }
    // aggiorna subito la posa, così il colpo parte dalla canna giusta
    this.posa = this.su ? 'shoot_up' : !this.onGround ? 'jump_shoot' : this.crouch ? 'crouch_shoot' : Math.abs(this.vx) > 10 ? this.posa : 'shoot';
    const b = this.bocca();
    for (let i = 0; i < a.colpiPerSparo; i++) {
      const sp = a.dispersione ? Phaser.Math.FloatBetween(-a.dispersione, a.dispersione) * R : 0;
      this.w.sparaProiettile({
        x: b.x, y: b.y, ang: b.ang + sp, speed: a.velocita, danno: a.danno,
        tex: a.id === 'lanciarazzi' ? 'rocket' : a.id === 'fiamma' ? 'flame' : 'bullet',
        colore: a.colore, ostile: false, gittata: a.gittata, perforante: a.perforante, esplosivo: a.esplosivo,
        scala: a.id === 'fiamma' ? 0.9 : 1, chi: this.idx,
      });
    }
    const fl = img(this.w.sc, b.x, b.y, a.id === 'pistola' ? 'lampo_1' : 'lampo_2', 'flash0').setOrigin(0, 0.5).setDepth(61).setRotation(b.ang);
    this.w.sc.tweens.add({ targets: fl, alpha: 0, duration: 70, onComplete: () => fl.destroy() });
    if (a.id !== 'fiamma' && a.id !== 'lanciarazzi') this.w.bossolo(this.x + (this.guardaDx ? 4 : -4), b.y + 3, this.guardaDx ? -1 : 1);
    sfx(a.id === 'mitragliatrice' ? 'mitra' : a.id === 'fucile' ? 'fucile' : a.id === 'lanciarazzi' ? 'razzo' : a.id === 'fiamma' ? 'fiamma' : 'pistola');
  }

  private lanciaBomba(): void {
    this.bombe--; this.azione = 'bomba'; this.azioneT = 0.38; sfx('bomba');
    const d = this.guardaDx ? 1 : -1;
    this.w.sparaProiettile({
      x: this.x + 6 * d, y: this.y - 50, ang: this.guardaDx ? -55 * R : Math.PI + 55 * R,
      speed: 250, danno: 60, tex: 'bomba', ostile: false, gittata: 900, esplosivo: 46, arco: true, chi: this.idx,
    });
  }

  private melee(): void {
    this.azione = 'melee'; this.azioneT = 0.4; sfx('melee');
    const d = this.guardaDx ? 1 : -1;
    const area = new Phaser.Geom.Rectangle(this.x + (d > 0 ? 0 : -34), this.y - 46, 34, 40);
    for (const e of this.w.nemici) {
      if (!e.morto && Phaser.Geom.Intersects.RectangleToRectangle(area, e.box())) e.danno(30, d, true, this.idx);
    }
    this.w.colpoMischia?.(area, 30, this.idx);
  }
}

// ---------------------------------------------------------------------------
// NEMICI: gelatai, ubriachi, lanciagelati, kamikaze, ubriaco sul balcone
// ---------------------------------------------------------------------------
export class Enemy {
  sprite: Phaser.GameObjects.Sprite;
  x: number; y = GROUND_Y; vx = 0;
  vita: number; morto = false; mortoT = 0; guardaDx = false;
  private stato: 'cammina' | 'attacco' | 'colpito' | 'carica' | 'stordito' = 'cammina';
  private t = 0; private attT: number; private lampo = 0; private colpo = false;
  private oscilla = Math.random() * 6;
  private entrato = false;
  private polvereFatta = false;
  /** chi parla: gelataia, gelataio, ubriaca, ubriaco (dal nome del foglio) */
  readonly chi: string;
  private cadeVy = 0;
  private alto: boolean;
  /** Moltiplicatore di aggressivita' dell'ondata: >1 = attacca piu' spesso. */
  fretta = 1;

  constructor(public w: World, public def: EnemyDef, public sheet: string, x: number, fretta = 1) {
    this.x = x; this.fretta = fretta; this.vita = Math.round(def.vita * w.diff.vitaNemici);
    this.alto = def.attacco === 'balcone';
    if (this.alto) this.y = BALCONE_Y;
    this.attT = Phaser.Math.FloatBetween(0.3, def.cadenza) / fretta;
    this.chi = sheet.replace('vil_', '').replace(/\d+$/, '');
    this.sprite = w.sc.add.sprite(x, this.y, `sh_${sheet}`, 0).setDepth(this.alto ? 20 : 45);
    if (this.alto) this.sprite.setScale(0.85);
  }
  box(): Phaser.Geom.Rectangle {
    // Il riquadro era 20x48 contro figure alte fino a 64: testa e cappello erano immuni.
    // Resta comunque piu' stretto del disegno, per non punire chi passa accanto.
    const h = this.alto ? 46 : 56;
    return new Phaser.Geom.Rectangle(this.x - 12, this.y - h, 24, h);
  }

  danno(n: number, dir = 0, mischia = false, chi = 0): boolean {
    if (this.morto) return false;
    this.vita -= n; this.lampo = 0.07;
    if (!this.alto) this.x += (dir || (this.guardaDx ? -1 : 1)) * 2.5; // piccolo rinculo
    if (this.vita <= 0) {
      this.morto = true; this.mortoT = 0; this.vx = dir * 50 || (this.guardaDx ? -50 : 50);
      if (this.alto) { this.cadeVy = -80; this.vx = 0; }
      sfx('nemicoMorto'); this.w.hitstop(0.06);
      parla(this.chi, 'muore', 0.55, 1.5);
      this.w.mortoNemico?.(this);
      this.w.uccisione(this.def.punti, this.x, this.y - 50, mischia, chi);
      return true;
    }
    sfx('nemicoColpito'); this.w.hitstop(0.025);
    if (this.stato !== 'attacco' && this.stato !== 'carica') { this.stato = 'colpito'; this.t = 0.18; }
    return false;
  }

  update(dt: number): void {
    const p = this.w.bersaglio(this.x);
    if (this.morto) {
      this.mortoT += dt; this.x += this.vx * dt; this.vx *= 0.92;
      if (this.alto) { // cade giù dal balcone
        this.cadeVy += GRAVITY * dt; this.y = Math.min(GROUND_Y, this.y + this.cadeVy * dt);
      }
      const f = this.mortoT < 0.12 ? 'hit' : this.mortoT < 0.3 ? 'death_01' : this.mortoT < 0.5 ? 'death_02' : 'death_03';
      if (f === 'death_03' && !this.polvereFatta) { this.polvereFatta = true; this.w.polvere?.(this.x); }
      setPose(this.sprite, this.sheet, f);
      this.sprite.setPosition(pix(this.x), pix(this.y)).setFlipX(!this.guardaDx);
      lampeggia(this.sprite, false);
      if (this.mortoT > 1.4) this.sprite.setAlpha(Math.max(0, 1 - (this.mortoT - 1.4) * 2.5));
      return;
    }
    this.lampo = Math.max(0, this.lampo - dt);
    const dx = p.x - this.x, dist = Math.abs(dx);
    this.guardaDx = dx > 0;
    this.attT -= dt;
    let posa = 'walk_01';
    const now = this.w.sc.time.now / 1000;
    const A = this.def.attacco;
    const lim0 = this.w.limiti();

    if (this.stato === 'colpito') {
      this.t -= dt; posa = 'hit'; if (this.t <= 0) this.stato = 'cammina';
    } else if (this.stato === 'stordito') {
      this.t -= dt; posa = 'death_01'; if (this.t <= 0) { this.stato = 'cammina'; this.attT = this.def.cadenza / this.fretta; }
    } else if (this.stato === 'carica') {
      // kamikaze: corre addosso; se manca il bersaglio inciampa e resta a terra un attimo
      this.x += this.vx * dt; this.t += dt;
      posa = `walk_0${(Math.floor(now * 16) % 6) + 1}`;
      this.guardaDx = this.vx > 0;
      // in carica è curvo in avanti: colpisce solo la parte bassa, così si può saltare (come la carica di Giova)
      if (!this.colpo && Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(this.x - 10, this.y - 34, 20, 34), p.box())) { this.colpo = true; p.danno(this.def.danno); }
      const lim = this.w.limiti();
      if (this.t > 1.3 || this.x < lim.sx + 12 || this.x > lim.dx - 12) { this.stato = 'stordito'; this.t = 1.1; this.w.testo(this.x, this.y - 54, 'OPS!', '#c8d0e0'); }
    } else if (this.stato === 'attacco') {
      this.t += dt;
      if (A === 'mischia') {
        // 0-0.38 preavviso (alza la paletta), 0.38-0.55 colpo, poi recupero
        posa = this.t < 0.38 ? 'attack_01' : this.t < 0.6 ? 'attack_02' : 'attack_03';
        if (!this.colpo && this.t >= 0.38) {
          this.colpo = true;
          const d = this.guardaDx ? 1 : -1;
          const area = new Phaser.Geom.Rectangle(this.x + (d > 0 ? 0 : -32), this.y - 44, 32, 40);
          if (!p.morto && Phaser.Geom.Intersects.RectangleToRectangle(area, p.box())) p.danno(this.def.danno);
        }
        if (this.t > 0.9) { this.stato = 'cammina'; this.attT = this.def.cadenza / this.fretta; }
      } else if (A === 'carica') {
        // preavviso: si ferma, lampeggia e grida "!" prima di buttarsi
        posa = 'attack_01';
        if (Math.floor(now * 12) % 2) this.lampo = 0.02;
        if (this.t > 0.6) { this.stato = 'carica'; this.t = 0; this.colpo = false; this.vx = Math.sign(dx || 1) * 150; sfx('allarme'); }
      } else {
        posa = this.t < 0.5 ? 'attack_01' : this.t < 0.75 ? 'attack_02' : 'attack_03';
        if (!this.colpo && this.t >= 0.5) { this.colpo = true; this.lancia(); }
        if (this.t > 1.05) { this.stato = 'cammina'; this.attT = (this.def.cadenza + Math.random() * 0.6) / this.fretta; }
      }
    } else {
      // avvicinamento
      const want = this.def.distanza;
      let v = 0;
      if (A !== 'balcone') {
        if (dist > want + 6) v = Math.sign(dx) * this.def.velocita;
        else if ((A === 'lancio' || A === 'palline') && dist < want - 40) v = -Math.sign(dx) * this.def.velocita * 0.7;
        if (A === 'lancio' || A === 'carica') v += Math.sin(now * 3 + this.oscilla) * 14; // barcolla
        if (!this.entrato) v = Math.sign(dx) * Math.max(this.def.velocita, 50); // prima entra nello schermo
      }
      this.x += v * dt;
      posa = Math.abs(v) > 6 ? `walk_0${(Math.floor(now * 9 + this.oscilla) % 6) + 1}` : 'walk_01';
      const fuori = this.x < lim0.sx + 8 || this.x > lim0.dx - 8;
      const inRange = !fuori && (A === 'mischia' ? dist < want + 10 : A === 'carica' ? dist < want + 20 : A === 'balcone' ? dist < 240 : dist < 210);
      if (inRange && this.entrato && this.attT <= 0 && !p.morto) {
        this.stato = 'attacco'; this.t = 0; this.colpo = false;
        parla(this.chi, A === 'lancio' || A === 'palline' ? 'lancio' : 'attacco', 0.3, 2);
        if (A === 'carica') this.w.testo(this.x, this.y - 58, '!', '#ff5050');
      }
    }
    // una volta entrato nello schermo non ne esce più (altrimenti diventa irraggiungibile)
    const lim = this.w.limiti();
    if (!this.entrato && this.x > lim.sx + 10 && this.x < lim.dx - 10) { this.entrato = true; parla(this.chi, 'spawn', 0.35, 3); }
    if (this.entrato && !this.alto) this.x = Phaser.Math.Clamp(this.x, lim.sx + 10, lim.dx - 10); // il balcone resta dov'è
    if (!this.alto) {
      // separazione: i nemici non si sovrappongono troppo
      for (const o of this.w.nemici) {
        if (o !== this && !o.morto && !o.alto && Math.abs(o.x - this.x) < 14) this.x += (this.x < o.x ? -1 : 1) * 20 * dt;
      }
    }
    setPose(this.sprite, this.sheet, posa);
    this.sprite.setPosition(pix(this.x), pix(this.y)).setFlipX(!this.guardaDx);
    lampeggia(this.sprite, this.lampo > 0);
  }

  private lancia(): void {
    const p = this.w.bersaglio(this.x);
    const d = this.guardaDx ? 1 : -1;
    const sc = this.alto ? 0.85 : 1;
    const x0 = this.x + 10 * d, y0 = this.y - 48 * sc;
    if (this.def.attacco === 'palline') {
      // pallina di gelato tesa, ad altezza petto: si evita abbassandosi o saltando
      // (il riquadro accovacciato è alto 30 px e il bordo conta: a 30 px colpiva anche chi si abbassava)
      const y = this.y - 36;
      this.w.sparaProiettile({ x: this.x + 12 * d, y, ang: this.guardaDx ? 0 : Math.PI, speed: 150, danno: this.def.danno, tex: 'pallina', ostile: true, gittata: 340 });
      sfx('bomba'); return;
    }
    // traiettoria ad arco che atterra vicino al giocatore: si evita saltando o spostandosi
    const T = this.alto ? 1.05 : 0.95, dxp = Phaser.Math.Clamp(p.x - x0, -230, 230);
    const vx = dxp / T, vy = (GROUND_Y - 6 - y0 - 0.5 * GRAVITY * 0.6 * T * T) / T;
    this.w.sparaProiettile({ x: x0, y: y0, ang: Math.atan2(vy, vx), speed: Math.hypot(vx, vy), danno: this.def.danno, tex: 'bottiglia', ostile: true, gittata: 900, arco: true });
    sfx('bomba');
  }

  distruggi(): void { this.sprite.destroy(); }
}

// ---------------------------------------------------------------------------
// BOSS: base comune
// ---------------------------------------------------------------------------
export abstract class BossBase {
  sprite: Phaser.GameObjects.Sprite;
  x: number; y = GROUND_Y; guardaDx = false;
  vita: number; vitaMax: number; morto = false; mortoT = 0; attivo = false;
  protected lampo = 0; protected st = 'entra'; protected t = 0;
  private ultimoLampo = -Infinity;
  abstract nome: string; abstract sottotitolo: string; abstract punti: number;
  onMorte?: () => void;
  constructor(public w: World, public sheet: string, x: number, vita: number) {
    vita = Math.round(vita * w.diff.vitaBoss);
    this.x = x; this.vita = vita; this.vitaMax = vita;
    this.sprite = w.sc.add.sprite(x, GROUND_Y, `sh_${sheet}`, 0).setDepth(48);
  }
  abstract box(): Phaser.Geom.Rectangle;
  abstract update(dt: number): void;
  moltiplicatore(): number { return 1; }
  danno(n: number, chi = 0): void {
    if (this.morto || !this.attivo) return;
    this.vita -= n * this.moltiplicatore();
    // Raffreddamento del flash: il fuoco continuo non deve trasformare il boss in una sagoma bianca.
    const ora = this.w.sc.time.now;
    if (ora - this.ultimoLampo >= 150) { this.lampo = 0.055; this.ultimoLampo = ora; }
    sfx('bossColpito'); this.w.hitstop(0.012);
    if (this.vita <= 0) { this.vita = 0; this.morto = true; this.mortoT = 0; sfx('bossMorto'); this.w.sc.time.delayedCall(900, () => this.w.polvere?.(this.x, true)); this.w.hitstop(0.25); this.w.punti(Math.round(this.punti * this.w.diff.punti), this.x, this.y - 90, chi); this.w.scuoti(500, 6); this.onMorte?.(); }
  }
  protected disegna(posa: string): void {
    setPose(this.sprite, this.sheet, posa);
    this.sprite.setPosition(pix(this.x), this.y).setFlipX(!this.guardaDx);
    lampeggia(this.sprite, this.lampo > 0);
  }
  protected frase(lista: string[]): void {
    this.w.testo(this.x, this.y - (this.sheet === 'boss_ettore' ? 130 : 92), Phaser.Utils.Array.GetRandom(lista), '#ffe066');
  }
}

// ---------------------------------------------------------------------------
// GIOVA, il buttafuori: calcio da vicino e carica attraverso l'arena
// ---------------------------------------------------------------------------
export class Giova extends BossBase {
  nome = GIOVA.nome; sottotitolo = GIOVA.sottotitolo; punti = GIOVA.punti;
  private colpito = false; private velCarica = 0; private prossimo = 1.2; private calci = 0;
  constructor(w: World, x: number) { super(w, 'boss_giova', x, GIOVA.vita); }
  box(): Phaser.Geom.Rectangle { return new Phaser.Geom.Rectangle(this.x - 17, this.y - 76, 34, 76); }

  update(dt: number): void {
    const p = this.w.bersaglio(this.x); const now = this.w.sc.time.now / 1000;
    this.lampo = Math.max(0, this.lampo - dt);
    if (this.morto) {
      this.mortoT += dt;
      this.disegna(this.mortoT < 0.15 ? 'hit' : this.mortoT < 0.4 ? 'death_01' : this.mortoT < 0.7 ? 'death_02' : 'death_03');
      return;
    }
    const lim = this.w.limiti();
    const dx = p.x - this.x;
    this.t += dt;
    switch (this.st) {
      case 'entra':
        this.guardaDx = false; this.x -= 50 * dt;
        this.disegna(`walk_0${(Math.floor(now * 8) % 6) + 1}`);
        if (this.x < lim.dx - 70) { this.st = 'pausa'; this.t = 0; this.attivo = true; this.frase(FRASI_GIOVA); voce('giova_ciao'); }
        break;
      case 'pausa': // si avvicina camminando
        this.guardaDx = dx > 0;
        if (Math.abs(dx) > 34) { this.x += Math.sign(dx) * 62 * dt; this.disegna(`walk_0${(Math.floor(now * 9) % 6) + 1}`); }
        else this.disegna('walk_01');
        this.prossimo -= dt;
        if (this.calci >= 2 && this.prossimo <= 0) { this.st = 'arretra'; this.t = 0; this.calci = 0; }
        else if (Math.abs(dx) < 46 && this.prossimo <= 0) { this.st = 'calcio'; this.t = 0; this.colpito = false; this.calci++; }
        else if (this.prossimo <= -1.4 || (this.prossimo <= 0 && Math.abs(dx) > 120)) { this.st = 'preCarica'; this.t = 0; sfx('allarme'); this.w.testo(this.x, this.y - 92, '!', '#ff5050'); }
        break;
      case 'calcio': // preavviso 0.45 s, poi calcio
        this.disegna(this.t < 0.45 ? 'attack_01' : this.t < 0.7 ? 'attack_02' : 'attack_03');
        if (!this.colpito && this.t >= 0.45) {
          this.colpito = true; sfx('melee');
          const d = this.guardaDx ? 1 : -1;
          const a = new Phaser.Geom.Rectangle(this.x + (d > 0 ? 0 : -46), this.y - 50, 46, 34);
          if (Phaser.Geom.Intersects.RectangleToRectangle(a, p.box())) p.danno(GIOVA.danno);
        }
        if (this.t > 1.0) { this.st = 'pausa'; this.prossimo = 0.8 + Math.random() * 0.8; }
        break;
      case 'arretra': { // prende la rincorsa
        this.guardaDx = dx > 0;
        const via = dx > 0 ? -1 : 1;
        this.x = Phaser.Math.Clamp(this.x + via * 95 * dt, lim.sx + 30, lim.dx - 30);
        this.disegna(`walk_0${(Math.floor(now * 10) % 6) + 1}`);
        this.sprite.setFlipX(via > 0);
        if (Math.abs(dx) > 150 || this.t > 1.6 || this.x <= lim.sx + 31 || this.x >= lim.dx - 31) { this.st = 'preCarica'; this.t = 0; sfx('allarme'); this.w.testo(this.x, this.y - 92, '!', '#ff5050'); }
        break;
      }
      case 'preCarica': // si abbassa e lampeggia: sta per caricare, bisogna saltare
        this.guardaDx = dx > 0;
        this.disegna('attack_01');
        this.sprite.setTint(Math.floor(now * 14) % 2 ? 0xffd060 : 0xffffff);
        if (this.t > 0.75) { parla('giova', 'carica'); this.st = 'carica'; this.t = 0; this.velCarica = (this.guardaDx ? 1 : -1) * 250; this.colpito = false; }
        break;
      case 'carica':
        this.x += this.velCarica * dt;
        this.disegna(`walk_0${(Math.floor(now * 18) % 6) + 1}`);
        // in carica è curvo in avanti: colpisce solo la parte bassa (36 px), così si può saltare
        // (il salto arriva a ~53 px: con il box intero di 72 px la carica era inevitabile)
        if (!this.colpito && Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(this.x - 14, this.y - 36, 28, 36), p.box())) { this.colpito = true; p.danno(GIOVA.danno); }
        if (this.x < lim.sx + 26 || this.x > lim.dx - 26) {
          this.x = Phaser.Math.Clamp(this.x, lim.sx + 26, lim.dx - 26);
          this.w.scuoti(200, 4); this.st = 'stordito'; this.t = 0;
        }
        break;
      case 'stordito': // dopo la carica resta scoperto un attimo
        this.disegna('hit');
        if (this.t > 0.9) { this.st = 'pausa'; this.prossimo = 1.0 + Math.random(); }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// ETTORE, il barista con la doppietta.
// Ciclo: cammina -> mira (linea rossa = preavviso) -> sparo -> mira -> sparo -> ricarica.
// In ricarica è scoperto e prende più danno. Sotto metà vita: fase 2, più veloce.
// ---------------------------------------------------------------------------
export type AttaccoEttore = 'mirato' | 'ventaglio' | 'pioggia' | 'rasoterra';

export class Ettore extends BossBase {
  nome = ETTORE.nome; sottotitolo = ETTORE.sottotitolo; punti = ETTORE.punti;
  fase2 = false;
  /** 1 = doppietta mirata · 2 = aggiunge ventaglio e bottiglie dall'alto · 3 = tutto, più veloce */
  fase = 1;
  private colpi = 0; private mira: { x: number; y: number; ang: number } | null = null;
  private camminaT = 1.0;
  private avvisoMira = false;
  private attacco: AttaccoEttore = 'mirato';
  private colpoVicino = false;
  /** Tempo della preparazione contato in secondi VERI: il moltiplicatore di velocita'
   *  delle fasi 2 e 3 accorcia tutto il resto, ma non il preavviso, che deve restare
   *  leggibile (misurato: senza questo in fase 3 scendeva a 0,41 s). */
  private miraT = 0;
  private ultimo: AttaccoEttore | null = null;
  onFase2?: () => void;
  onFase3?: () => void;
  constructor(w: World, x: number) {
    super(w, 'boss_ettore', x, ETTORE.vita);
  }

  /** Sceglie il prossimo attacco: più la vita scende, più il repertorio si allarga.
   *  Non ripete mai due volte di fila lo stesso, così il ritmo resta vario. */
  private scegliAttacco(): AttaccoEttore {
    const lista: AttaccoEttore[] = this.fase === 1 ? ['mirato']
      : this.fase === 2 ? ['mirato', 'mirato', 'ventaglio', 'pioggia']
      : ['mirato', 'ventaglio', 'ventaglio', 'pioggia', 'rasoterra', 'rasoterra'];
    const possibili = lista.filter((a) => a !== this.ultimo);
    const scelto = Phaser.Utils.Array.GetRandom(possibili.length ? possibili : lista);
    this.ultimo = scelto;
    return scelto;
  }

  /** Quante scariche di fila prima di dover ricaricare. */
  private scaricheMassime(): number { return this.fase === 3 ? 5 : this.fase === 2 ? 4 : 3; }

  /** Durata del preavviso: sempre abbastanza da poter reagire, anche in fase 3. */
  private durataMira(): number {
    if (this.attacco === 'ventaglio') return 0.8;
    if (this.attacco === 'pioggia') return 0.75;
    if (this.attacco === 'rasoterra') return 0.8; // la bottiglia rotola: il salto va preparato
    return this.fase === 3 ? 0.55 : this.fase === 2 ? 0.62 : (this.colpi === 0 ? 0.7 : 0.55);
  }
  /** Chi sta prendendo di mira (in due giocatori ne sceglie uno a caso a ogni preparazione,
   *  cosi' non basta che uno faccia da esca stando vicino mentre l'altro spara da lontano). */
  private obiettivo: Player | null = null;
  private scegliObiettivo(): void {
    const vivi = this.w.giocatori.filter((q) => !q.morto);
    this.obiettivo = vivi.length ? Phaser.Utils.Array.GetRandom(vivi) : null;
  }
  private bers(): Player { return this.obiettivo && !this.obiettivo.morto ? this.obiettivo : this.w.bersaglio(this.x); }
  box(): Phaser.Geom.Rectangle { return new Phaser.Geom.Rectangle(this.x - 32, this.y - 116, 64, 116); }
  moltiplicatore(): number { return this.st === 'ricarica' ? 1.6 : 1; }

  private bocca(): { x: number; y: number } {
    const m = SHEETS.boss_ettore.muzzle.tele_02;
    // La canna disegnata sporge 100 px dal centro: da vicino i pallettoni nascevano
    // gia' oltre il giocatore e gli passavano alle spalle (misurate 8 scariche su 15
    // sprecate cosi'). L'uscita si accorcia fino a meta' della distanza reale.
    const dist = Math.abs(this.bers().x - this.x);
    const avanti = Math.min(m[0], Math.max(16, dist * 0.5));
    return { x: this.x + avanti * (this.guardaDx ? 1 : -1), y: this.y + m[1] };
  }

  update(dt: number): void {
    const p = this.w.bersaglio(this.x); const now = this.w.sc.time.now / 1000;
    this.lampo = Math.max(0, this.lampo - dt);
    if (this.morto) {
      this.mortoT += dt;
      const f = this.mortoT < 0.2 ? 'hit' : this.mortoT < 0.5 ? 'death_01' : this.mortoT < 0.8 ? 'death_02' : this.mortoT < 1.1 ? 'death_03' : 'death_04';
      this.disegna(f); return;
    }
    if (this.fase === 1 && this.vita < this.vitaMax * 0.62) {
      this.fase = 2; this.fase2 = true;
      this.frase(['ADESSO MI ARRABBIO!']); sfx('bossUrlo'); voce('ettore_dunebuggy'); this.w.scuoti(300, 4); this.onFase2?.();
    }
    if (this.fase === 2 && this.vita < this.vitaMax * 0.28) {
      this.fase = 3;
      this.frase(['FUORI DAL MIO BAR!']); sfx('bossUrlo'); this.w.scuoti(420, 6); this.onFase3?.();
    }
    const vel = this.fase === 3 ? 1.5 : this.fase === 2 ? 1.3 : 1;
    const lim = this.w.limiti();
    const dx = p.x - this.x;
    this.t += dt * vel;
    switch (this.st) {
      case 'entra':
        this.guardaDx = false; this.x -= 40 * dt;
        this.disegna(`walk_0${(Math.floor(now * 6) % 4) + 1}`);
        if (this.x < lim.dx - 80) { this.st = 'cammina'; this.t = 0; this.attivo = true; this.frase(FRASI_ETTORE); }
        break;
      case 'cammina': {
        this.guardaDx = dx > 0;
        const d = Math.abs(dx); let v = 0;
        if (d > 170) v = Math.sign(dx) * 46; else if (d < 90) v = -Math.sign(dx) * 40;
        this.x = Phaser.Math.Clamp(this.x + v * vel * dt, lim.sx + 40, lim.dx - 40);
        this.disegna(v !== 0 ? `walk_0${(Math.floor(now * 6 * vel) % 4) + 1}` : 'idle');
        // Stargli incollato era la strategia ottimale e senza rischio: da vicino
        // risponde con una botta di calcio della doppietta invece di limitarsi ad arretrare.
        if (Math.abs(dx) < 62 && this.camminaT < 0.45) {
          this.st = 'calcio'; this.t = 0; this.colpoVicino = false;
          this.w.testo(this.x, this.y - 126, '!', '#ff5050'); sfx('allarme');
          break;
        }
        this.camminaT -= dt * vel;
        if (this.camminaT <= 0) { this.st = 'mira'; this.t = 0; this.miraT = 0; this.colpi = 0; this.mira = null; this.avvisoMira = false; this.attacco = this.scegliAttacco(); this.scegliObiettivo(); }
        break;
      }
      case 'mira': {
        // Il segnale parte all'inizio di OGNI preparazione, prima che Ettore blocchi la mira,
        // e dice anche QUALE attacco sta arrivando: così la difficoltà sta nella reazione,
        // non nell'indovinare.
        this.miraT += dt;
        const t = this.bers(); // in due, ogni preparazione prende di mira uno dei giocatori vivi
        const durata = this.durataMira();
        if (!this.avvisoMira) {
          this.avvisoMira = true;
          const avviso = this.attacco === 'ventaglio' ? '!!' : this.attacco === 'pioggia' ? 'BOTTIGLIE!' : this.attacco === 'rasoterra' ? 'SALTA!' : '!';
          const colore = this.attacco === 'mirato' ? '#ffe066' : this.attacco === 'rasoterra' ? '#80d0ff' : '#ff8040';
          this.w.testo(this.x, this.y - 126, avviso, colore);
          sfx('allarme');
          if (this.attacco === 'pioggia') this.segnaPioggia();
        }
        this.guardaDx = t.x > this.x;
        this.disegna(this.miraT < 0.25 ? 'tele_01' : 'tele_02');
        const b = this.bocca();
        if (this.miraT >= 0.25 && !this.mira) {
          const ang = Math.atan2((t.y - (t.crouch ? 18 : 30)) - b.y, t.x - b.x);
          const lim2 = this.guardaDx ? [-0.45, 0.35] : [Math.PI - 0.35, Math.PI + 0.45];
          let a = ang; if (!this.guardaDx && a < 0) a += Math.PI * 2;
          this.mira = { ...b, ang: Phaser.Math.Clamp(a, lim2[0], lim2[1]) };
        }
        if (this.miraT >= durata && this.mira) this.spara();
        break;
      }
      case 'sparo':
        this.disegna(this.t < 0.12 ? 'shoot_01' : 'shoot_02');
        if (this.t > (this.attacco === 'ventaglio' ? 0.45 : 0.3)) {
          if (this.colpi < this.scaricheMassime()) {
            this.st = 'mira'; this.t = 0; this.miraT = 0; this.mira = null; this.avvisoMira = false; this.scegliObiettivo();
            // dentro la stessa serie può cambiare attacco: è qui che nasce il ritmo arcade
            if (this.fase > 1) this.attacco = this.scegliAttacco();
          } else { this.st = 'ricarica'; this.t = 0; this.w.testo(this.x, this.y - 128, 'RICARICA!', '#ffe066'); voce('ettore_borbottio', 9, 0.8); }
        }
        break;
      case 'calcio': {
        this.guardaDx = dx > 0;
        this.disegna(this.t < 0.38 ? 'tele_01' : 'shoot_01');
        if (!this.colpoVicino && this.t >= 0.38) {
          this.colpoVicino = true; sfx('melee'); this.w.scuoti(140, 3);
          const d = this.guardaDx ? 1 : -1;
          const a = new Phaser.Geom.Rectangle(this.x + (d > 0 ? 0 : -58), this.y - 62, 58, 62);
          if (!p.morto && Phaser.Geom.Intersects.RectangleToRectangle(a, p.box())) p.danno(ETTORE.danno);
        }
        if (this.t > 0.9) { this.st = 'cammina'; this.t = 0; this.camminaT = 0.2 + Math.random() * 0.3; }
        break;
      }
      case 'ricarica': {
        // Finestra di vulnerabilità: prende 1,6 volte il danno. Si accorcia con le fasi,
        // ma non sparisce mai: è l'unico momento in cui si recupera terreno.
        const durataRic = this.fase === 3 ? 0.7 : this.fase === 2 ? 0.85 : 1.05;
        this.disegna(this.t < durataRic * 0.32 ? 'reload_01' : this.t < durataRic * 0.68 ? 'reload_02' : 'reload_03');
        if (this.t > durataRic) {
          this.st = 'cammina'; this.t = 0;
          this.camminaT = this.fase === 3 ? 0.1 + Math.random() * 0.2 : this.fase === 2 ? 0.2 + Math.random() * 0.3 : 0.3 + Math.random() * 0.45;
          if (Math.random() < 0.35) this.frase(FRASI_ETTORE);
        }
        break;
      }
    }
  }

  /** Mirini a terra dove cadranno le bottiglie: si vedono prima del lancio. */
  private bersagliPioggia: number[] = [];
  private segnaPioggia(): void {
    const lim = this.w.limiti();
    const n = this.fase === 3 ? 4 : 3;
    const vivi = this.w.giocatori.filter((q) => !q.morto);
    const px = (vivi.length ? vivi : this.w.giocatori)[0].x;
    this.bersagliPioggia = [];
    for (let i = 0; i < n; i++) {
      // una cade addosso a ciascun giocatore vivo, le altre intorno: bisogna muoversi, non restare fermi
      const x = i < vivi.length ? vivi[i].x : Phaser.Math.Clamp(px + Phaser.Math.Between(-110, 110), lim.sx + 16, lim.dx - 16);
      this.bersagliPioggia.push(x);
      this.w.mirino?.(x);
    }
  }

  private spara(): void {
    if (!this.mira) return;
    this.colpi++; this.st = 'sparo'; this.t = 0;
    switch (this.attacco) {
      case 'ventaglio': this.sparaVentaglio(); break;
      case 'pioggia': this.lanciaBottiglie(); break;
      case 'rasoterra': this.rotolaBottiglie(); break;
      default: this.sparaMirato();
    }
    this.x -= (this.guardaDx ? 1 : -1) * 6; // rinculo
  }

  /** Velocità dei pallettoni: cresce a ogni fase (era fissa a 270, troppo lenta). */
  private velPallettoni(): number { return this.fase === 3 ? 420 : this.fase === 2 ? 375 : 330; }

  /** Doppietta mirata: ventaglio stretto puntato addosso. Si evita spostandosi o abbassandosi. */
  private sparaMirato(): void {
    if (!this.mira) return;
    const n = this.fase === 3 ? 9 : this.fase === 2 ? 8 : 5;
    const spread = this.fase === 3 ? 11 : this.fase === 2 ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = this.mira.ang + ((i / (n - 1)) * 2 - 1) * spread * R;
      this.w.sparaProiettile({ x: this.mira.x, y: this.mira.y, ang: a, speed: this.velPallettoni(), danno: ETTORE.danno, tex: 'pellet', ostile: true, gittata: 440 });
    }
    this.lampoCanna(1.3);
    sfx('fucile'); this.w.scuoti(120, 3);
  }

  /** Ventaglio largo con UN BUCO: copre tutta l'altezza ma lascia un varco da infilare. */
  private sparaVentaglio(): void {
    if (!this.mira) return;
    const dir = this.guardaDx ? 1 : -1;
    const n = 9;
    const buco = Phaser.Math.Between(2, n - 3); // il varco non è mai all'estremo
    for (let i = 0; i < n; i++) {
      if (i === buco || i === buco + 1) continue;
      // dal basso (rasoterra) fino in alto, sul lato del giocatore
      const a = (this.guardaDx ? 0 : Math.PI) + dir * (((i / (n - 1)) * 2 - 1) * 34 - 8) * R;
      this.w.sparaProiettile({ x: this.mira.x, y: this.mira.y, ang: a, speed: this.velPallettoni() * 0.78, danno: ETTORE.danno, tex: 'pellet', ostile: true, gittata: 460 });
    }
    this.lampoCanna(1.6);
    sfx('fucile'); this.w.scuoti(170, 4);
  }

  /** Bottiglie dal soffitto sui mirini già mostrati: obbliga a cambiare posto. */
  private lanciaBottiglie(): void {
    const bersagli = this.bersagliPioggia.length ? this.bersagliPioggia : [this.bers().x];
    bersagli.forEach((x, i) => {
      this.w.sc.time.delayedCall(i * 110, () => {
        this.w.sparaProiettile({ x, y: 6, ang: Math.PI / 2, speed: 150, danno: ETTORE.danno, tex: 'bottiglia', ostile: true, gittata: 400, arco: true });
      });
    });
    this.bersagliPioggia = [];
    sfx('bomba'); this.w.scuoti(90, 2);
  }

  /** Bottiglie fatte rotolare sul pavimento: si saltano, non si schivano stando fermi. */
  private rotolaBottiglie(): void {
    const dir = this.guardaDx ? 1 : -1;
    const n = this.fase === 3 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.w.sc.time.delayedCall(i * 260, () => {
        this.w.sparaProiettile({
          x: this.x + dir * 20, y: GROUND_Y - 7, ang: this.guardaDx ? 0 : Math.PI,
          speed: 210, danno: ETTORE.danno, tex: 'bottiglia', ostile: true, gittata: 460,
        });
      });
    }
    sfx('bomba'); this.w.scuoti(80, 2);
  }

  private lampoCanna(k: number): void {
    if (!this.mira) return;
    const fl = img(this.w.sc, this.mira.x, this.mira.y, 'lampo_3', 'flash0', k).setOrigin(0, 0.5).setDepth(61).setRotation(this.mira.ang);
    this.w.sc.tweens.add({ targets: fl, alpha: 0, duration: 90, onComplete: () => fl.destroy() });
  }
}
