// ============================================================================
// Scena di gioco. Due fasi:
//  - 'strada': la via di Ponte Arche con le ondate, poi Giova davanti al bar;
//  - 'cantina': la cantina del Bucaneve con Ettore;
//  - 'chiesa': HOLY SLUG, la chiesa gotica con Griso e Don Antonio (dopo la cantina).
// Lo stato del giocatore (punti, vite, arma) passa da una fase all'altra.
// ============================================================================
import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, GROUND_Y, WAVES, PICKUPS, ENEMIES, EnemyType, WEAPONS, getHero, HeroDef,
  DiffDef, getDiff, PROPS_STRADA, PROPS_CANTINA, PropPos, Rottura, CHECKPOINT_ONDA, pix,
} from '../content/defs';

/** Velocità massima di recupero della camera quando è rimasta indietro (px di gioco al secondo). */
const CAM_RECUPERO = 300;
import { PROPS, FX } from '../content/extra';
import { img, fxTex } from '../core/fx';
import { BG, SHEETS } from '../content/sprites';
import { Bullet, BulletOpts, Enemy, Player, World, BossBase, Giova, Ettore } from '../entities';
import { Griso, DonAntonio } from '../bossChiesa';
import { CH_BG, WAVES_CHIESA, CHECKPOINT_CHIESA, PICKUPS_CHIESA, GRISO, DON_ANTONIO } from '../content/holy';
import { ChiesaAmbiente } from './chiesa/ChiesaAmbiente';

interface Prop { s: Phaser.GameObjects.Image; def: PropPos; vita: number; rompe: Rottura }
import { Controls } from '../core/controls';
import { mostraTouch } from '../core/touch';
import { sfx, setMuted, isMuted, voce, musica, parla, setFaseAudio, sottofondo } from '../core/audio';
import { loadSave, writeSave } from '../core/save';
import { txt, zoomCamera, PixelText } from '../core/ui';
import type { Risultato } from './ResultScene';

/** Stato di un singolo giocatore: punti, vite e arma sono suoi (ogni giocatore ha le proprie vite). */
export interface PStato { punti: number; vite: number; arma: string; munizioni: number; bombe: number }
export interface Stato { tempo: number; crediti: number; checkpoint?: 'meta' | 'giova' | 'navata' | 'altare'; g: PStato[] }
export type Fase = 'strada' | 'cantina' | 'chiesa';
/** `eroi`: gli id dei personaggi scelti, uno per giocatore (1 o 2). */
interface Dati { fase: Fase; stato: Stato | null; eroi?: string[] }
const nuovoPStato = (vite: number): PStato => ({ punti: 0, vite, arma: 'pistola', munizioni: -1, bombe: 10 });
/** Colori dei due giocatori (etichette sopra la testa e nell'HUD). */
const COLORE_G = ['#ffe066', '#60d8ff'];

export class GameScene extends Phaser.Scene implements World {
  get sc(): Phaser.Scene { return this; }
  giocatori: Player[] = [];
  /** Il primo giocatore (per chi ragiona su un giocatore solo). */
  get giocatore(): Player { return this.giocatori[0]; }
  /** Il giocatore vivo piu' vicino a `x`; se sono tutti a terra, il piu' vicino in assoluto. */
  bersaglio(x: number): Player {
    const vivi = this.giocatori.filter((q) => !q.morto);
    const lista = vivi.length ? vivi : this.giocatori;
    return lista.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
  }
  /** Ascissa del giocatore piu' avanti tra quelli vivi: la camera e le ondate seguono lui. */
  private xGuida(): number {
    const vivi = this.giocatori.filter((q) => !q.morto);
    return Math.max(...(vivi.length ? vivi : this.giocatori).map((q) => q.x));
  }
  /** Ascissa del vivo piu' indietro. */
  private xRetro(): number {
    const vivi = this.giocatori.filter((q) => !q.morto);
    return Math.min(...(vivi.length ? vivi : this.giocatori).map((q) => q.x));
  }
  private eroi: HeroDef[] = [];
  private ctrls: Controls[] = [];
  private etichette: PixelText[] = [];
  nemici: Enemy[] = [];
  private proiettili: Bullet[] = [];
  private casse: { s: Phaser.GameObjects.Image; arma: string }[] = [];
  private boss: BossBase | null = null;
  /** HOLY SLUG: il secondo boss (Don Antonio) che combatte insieme al primo (Griso). */
  private boss2: BossBase | null = null;
  private ambiente: ChiesaAmbiente | null = null;
  private donArrivato = false;
  private tempoInizio = 0;
  /** Tutti i boss in campo (uno in Buca Slug, fino a due in chiesa). */
  private bossi(): BossBase[] { return [this.boss, this.boss2].filter((b): b is BossBase => !!b); }
  private hero!: HeroDef;
  private fase: Fase = 'strada';
  private larghezza = 0;
  private camX = 0;
  private bloccoDx = Infinity;   // la camera non va oltre (ondata in corso)
  private arena: { x: number } | null = null;
  private onda = 0;
  private ondaViva: Enemy[] = [];
  private st: Stato = { tempo: 0, crediti: 0, g: [nuovoPStato(3)] };
  private pausa = false;
  private finito = false;
  private uscita = false;
  private rinascitaT: number[] = [-1];
  private hud!: {
    blocchi: { vita: Phaser.GameObjects.Image[]; vite: PixelText; punti: PixelText; armi: PixelText; bombe: PixelText; armaNome: PixelText; icona: Phaser.GameObjects.Image }[];
    tempo: PixelText; combo: PixelText;
    boss: Phaser.GameObjects.Container; bossSeg: Phaser.GameObjects.Image[]; pausa: PixelText; go: Phaser.GameObjects.Container;
  };
  diff!: DiffDef;
  private congelato = 0;
  private stopCd = 0; // pausa minima tra due micro-pause piccole (raffiche di mitra)
  private combo = 0; private comboT = 0;
  private colpitoNelBoss = false;
  private props: Prop[] = [];
  private premi: { s: Phaser.GameObjects.Image; tipo: 'bombe' | 'gelato' }[] = [];
  private continua: { c: Phaser.GameObjects.Container; t: PixelText; n: number; acc: number; aperto: number; toccato?: boolean } | null = null;

  constructor() { super('Game'); }

  init(d: Dati): void {
    this.fase = d?.fase ?? 'strada';
    this.diff = getDiff(loadSave().diff);
    const ids = d?.eroi?.length ? d.eroi : [loadSave().charId];
    this.eroi = ids.slice(0, 2).map((id) => getHero(id));
    this.hero = this.eroi[0];
    this.st = d?.stato ? { ...d.stato, g: d.stato.g.map((q) => ({ ...q })) } : { tempo: 0, crediti: 0, g: this.eroi.map(() => nuovoPStato(this.diff.vite)) };
    this.congelato = 0; this.stopCd = 0; this.combo = 0; this.comboT = 0; this.colpitoNelBoss = false; this.props = []; this.premi = []; this.continua = null;
    this.nemici = []; this.proiettili = []; this.casse = []; this.boss = null; this.arena = null;
    this.boss2 = null; this.ambiente = null; this.donArrivato = false; this.tempoInizio = this.st.tempo;
    this.onda = 0; this.ondaViva = []; this.pausa = false; this.finito = false; this.uscita = false;
    this.camX = 0; this.bloccoDx = Infinity; this.rinascitaT = this.eroi.map(() => -1); this.giovaArrivato = false; this.ondaPronta = true;
    this.time.paused = false; // il Clock conserva `paused` anche dopo scene.restart
  }

  create(): void {
    zoomCamera(this);
    if (this.fase === 'chiesa') {
      this.ambiente = new ChiesaAmbiente(this);
      this.larghezza = this.ambiente.larghezza;
      for (const p of PICKUPS_CHIESA) this.casse.push({ s: img(this, p.x, GROUND_Y, `cassa_${p.arma}`, 'cassa').setOrigin(0.5, 1).setDepth(40), arma: p.arma });
    } else {
    const pezzi = this.fase === 'strada' ? BG.street.parts : BG.cellar.parts;
    this.larghezza = this.fase === 'strada' ? BG.street.w : BG.cellar.w;
    const dens = this.fase === 'strada' ? BG.street.d : BG.cellar.d;
    pezzi.forEach((_, i) => this.add.image(i * 512, 0, `bg_${this.fase === 'strada' ? 'street' : 'cellar'}_${i}`).setOrigin(0).setDepth(0).setScale(1 / dens));
    }

    if (this.fase === 'strada') {
      // insegna del bar (ChatGPT non scrive bene le lettere: la mettiamo noi)
      const cx = BG.street.barX + BG.street.barW / 2;
      this.add.rectangle(cx, 101, 104, 15, 0x2a1408).setStrokeStyle(1, 0xd8a040).setDepth(2);
      txt(this, cx, 101, 'BAR BUCANEVE', 9, '#ffe066', 2).setOrigin(0.5).setDepth(3);
      for (const p of PICKUPS) this.casse.push({ s: img(this, p.x, GROUND_Y, `cassa_${p.arma}`, 'cassa').setOrigin(0.5, 1).setDepth(40), arma: p.arma });
    }

    for (const pp of this.fase === 'strada' ? PROPS_STRADA : this.fase === 'cantina' ? PROPS_CANTINA : []) {
      const d = PROPS[pp.nome]; if (!d) continue;
      const im = this.add.image(pp.x, GROUND_Y + 2 + (pp.dy ?? 0), `prop_${pp.nome}`).setOrigin(0.5, 1).setDepth(pp.z ?? 30).setScale(1 / d.d);
      if (pp.rompe) this.props.push({ s: im, def: pp, vita: pp.vita ?? 20, rompe: pp.rompe });
    }

    this.giocatori = this.eroi.map((h, i) => new Player(this, h, 60 + i * 24, i));
    this.giocatori.forEach((p, i) => {
      const g = this.st.g[i];
      p.prendiArma(g.arma); if (g.munizioni !== -1 || p.arma.munizioni !== -1) p.munizioni = g.munizioni;
      p.bombe = g.bombe;
    });

    // ripartenza da un checkpoint (dopo un CONTINUE)
    if (this.fase === 'strada' && this.st.checkpoint) {
      const arenaX = Math.round(BG.street.barX + (BG.street.barW - VIEW_W) / 2);
      if (this.st.checkpoint === 'giova') { this.onda = WAVES.length; this.giocatori.forEach((p, i) => { p.x = arenaX + 30 + i * 24; }); this.camX = arenaX - 60; }
      else { this.onda = CHECKPOINT_ONDA; this.giocatori.forEach((p, i) => { p.x = WAVES[CHECKPOINT_ONDA].x - 110 + i * 24; }); this.camX = Math.max(0, this.giocatori[0].x - 150); }
      for (const c of this.casse) if (c.s.x < this.giocatori[0].x) c.s.destroy();
    }
    // HOLY SLUG: ripartenza a meta' navata o davanti all'altare
    if (this.fase === 'chiesa' && this.st.checkpoint) {
      if (this.st.checkpoint === 'altare') { this.onda = WAVES_CHIESA.length; this.giocatori.forEach((p, i) => { p.x = CH_BG.arenaX + 30 + i * 24; }); this.camX = CH_BG.arenaX - 60; }
      else { this.onda = CHECKPOINT_CHIESA; this.giocatori.forEach((p, i) => { p.x = WAVES_CHIESA[CHECKPOINT_CHIESA].x - 110 + i * 24; }); this.camX = Math.max(0, this.giocatori[0].x - 150); }
      for (const c of this.casse) if (c.s.x < this.giocatori[0].x) c.s.destroy();
      this.casse = this.casse.filter((c) => c.s.active);
    }

    this.ctrls = this.eroi.length === 2 ? [new Controls(this, 'p1'), new Controls(this, 'p2')] : [new Controls(this)];
    // in due, un'etichetta sopra la testa dice chi e' chi
    this.etichette = this.eroi.length === 2
      ? this.giocatori.map((_, i) => txt(this, 0, 0, `${i + 1}P`, 8, COLORE_G[i]).setOrigin(0.5, 1).setDepth(95))
      : [];
    mostraTouch(true);
    this.events.once('shutdown', () => { mostraTouch(false); sottofondo(null); });
    this.creaHud();
    this.cameras.main.fadeIn(400);

    setFaseAudio(this.fase === 'strada' ? 'strada' : this.fase === 'chiesa' ? 'chiesa' : 'ettore');
    if (this.fase === 'chiesa') {
      musica('chiesa');
      this.ambiente!.apriPortone(); sfx('bossUrlo');
      this.time.delayedCall(600, () => parla([this.hero.id, 'eroe'], 'via'));
      this.annuncio('HOLY SLUG', 'MISSIONE 2: LA CHIESA');
    } else if (this.fase === 'strada') {
      musica('strada');
      this.time.delayedCall(600, () => parla([this.hero.id, 'eroe'], 'via'));
      this.annuncio('MISSIONE 1', 'ARRIVA AL BAR BUCANEVE');
    } else {
      this.introEttore();
    }
  }

  // ------------------------------------------------------------------ mondo
  limiti(): { sx: number; dx: number } { return { sx: this.camX, dx: this.camX + VIEW_W }; }
  sparaProiettile(o: BulletOpts): void {
    // colpo a bruciapelo: la canna è già oltre il bersaglio, quindi controlliamo il tratto spalla-canna
    if (!o.ostile && !o.arco) {
      const chi = o.chi ?? 0;
      const p = this.giocatori[chi] ?? this.giocatore;
      const linea = new Phaser.Geom.Line(p.x, o.y, o.x, o.y);
      const bersagli: { box: Phaser.Geom.Rectangle; colpisci: () => void }[] = [];
      for (const e of this.nemici) if (!e.morto) bersagli.push({ box: e.box(), colpisci: () => e.danno(o.danno, Math.sign(o.x - p.x), false, chi) });
      for (const b of this.bossi()) if (!b.morto && b.attivo) bersagli.push({ box: b.box(), colpisci: () => b.danno(o.danno, chi) });
      const t = bersagli.find((q) => Phaser.Geom.Intersects.LineToRectangle(linea, q.box));
      if (t) {
        if (o.esplosivo) { this.boom(o.x, o.y, true); t.colpisci(); } else { t.colpisci(); this.scintilla(o.x, o.y); }
        if (!o.perforante) return;
      }
    }
    this.proiettili.push(new Bullet(this, o));
  }
  punti(n: number, x?: number, y?: number, chi = 0): void {
    (this.st.g[chi] ?? this.st.g[0]).punti += n;
    if (x !== undefined && y !== undefined) this.testo(x, y, `+${n}`, '#ffe066');
  }
  testo(x: number, y: number, s: string, color = '#ffffff'): void {
    const t = txt(this, x, y, s, 9, color).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 1100, delay: 300, onComplete: () => t.destroy() });
  }
  /** Scossa della camera, ampiezza in PIXEL DI GIOCO (il campo è 384x216).
   *  Non si usa `camera.shake()`: la sua "intensità" viene moltiplicata per la larghezza
   *  del canvas (1152) e poi di nuovo per lo zoom (3), cioè x3456, e un semplice colpo
   *  subito spostava lo schermo di 24 px logici (72 a schermo) scoprendo il nero sopra
   *  il fondale, che è alto esattamente VIEW_H. Qui la scossa è solo orizzontale, cala
   *  nel tempo e resta dentro i bordi del mondo, quindi non scopre mai il nero. */
  scuoti(ms: number, px: number): void {
    if (this.scossaT > 0 && px <= this.scossaAmp) return; // una scossa forte non viene annullata da una debole
    this.scossaAmp = px; this.scossaDur = ms / 1000; this.scossaT = this.scossaDur;
  }
  private scossaT = 0; private scossaDur = 1; private scossaAmp = 0;
  /** Mirino a terra: cerchietto che lampeggia dove sta per arrivare qualcosa dall'alto. */
  mirino(x: number): void {
    const m = this.add.circle(x, GROUND_Y - 2, 7).setStrokeStyle(1, 0xff6040).setDepth(28);
    const c = this.add.rectangle(x, GROUND_Y - 2, 11, 1, 0xff6040).setDepth(28);
    this.tweens.add({ targets: [m, c], alpha: 0.15, duration: 110, yoyo: true, repeat: 4,
      onComplete: () => { m.destroy(); c.destroy(); } });
  }
  boom(x: number, y: number, grande: boolean): void {
    // esplosione disegnata (8 fotogrammi) se c'è, altrimenti quella del codice
    const dis = !!FX.boom_0;
    // Il disegno piu' grande e' alto 34 px: con 1.25 copriva un terzo del raggio che
    // uccide (60 px per i nemici, 76 per il boss) e si vedevano nemici cadere senza
    // essere sfiorati. 2 e' un multiplo intero: i pixel restano netti.
    const k = grande ? 2 : 0.8;
    if (grande) for (const [dx2, dy2, rit] of [[-17, -4, 70], [17, -9, 140]] as [number, number, number][]) {
      this.time.delayedCall(rit, () => this.scoppietto(x + dx2, y + dy2));
    }
    const s = dis ? img(this, x, y, 'boom_0', 'boom0', k).setOrigin(0.5, 0.75) : this.add.image(x, y, 'boom0').setScale(grande ? 1.2 : 0.6);
    s.setDepth(70);
    let i = 0;
    this.time.addEvent({ delay: dis ? 60 : 45, repeat: 7, callback: () => {
      i++;
      if (i >= 8) { s.destroy(); return; }
      if (dis) { const t = fxTex(`boom_${i}`, 'boom0'); s.setTexture(t.key).setScale(t.s * k); } else s.setTexture(`boom${i}`);
    } });
    if (dis && grande) { // cratere annerito a terra
      const c = img(this, x, GROUND_Y + 3, 'cratere', 'fumo', 0.8).setOrigin(0.5, 1).setDepth(29);
      this.tweens.add({ targets: c, alpha: 0, delay: 2500, duration: 800, onComplete: () => c.destroy() });
    }
    sfx('boom'); if (grande) this.scuoti(160, 4);
  }
  /** Scoppio secondario, piu' piccolo: riempie il raggio dell'esplosione grande. */
  private scoppietto(x: number, y: number): void {
    const s = img(this, x, y, 'boom_1', 'boom1', 1.1).setOrigin(0.5, 0.75).setDepth(69);
    let i = 1;
    this.time.addEvent({ delay: 55, repeat: 5, callback: () => {
      i++; if (i >= 7) { s.destroy(); return; }
      const t = fxTex(`boom_${i}`, `boom${i}`); s.setTexture(t.key).setScale(t.s * 1.1);
    } });
  }
  hitstop(sec: number): void {
    // i colpi piccoli in raffica non devono rallentare tutto il gioco: al massimo uno ogni 0,25 s
    if (sec < 0.05 && this.stopCd > 0) return;
    this.congelato = Math.max(this.congelato, sec); this.stopCd = 0.25;
  }
  bossolo(x: number, y: number, dir: number): void {
    const b = this.add.image(x, y, 'bossolo').setDepth(55);
    const dx = dir * Phaser.Math.Between(8, 16);
    this.tweens.add({ targets: b, x: x + dx, duration: 380 });
    this.tweens.add({ targets: b, y: y - 10, duration: 140, ease: 'Quad.out', yoyo: false, onComplete: () => {
      this.tweens.add({ targets: b, y: GROUND_Y - 1, angle: 360, duration: 240, ease: 'Quad.in', onComplete: () => {
        this.tweens.add({ targets: b, alpha: 0, delay: 500, duration: 300, onComplete: () => b.destroy() });
      } });
    } });
  }
  uccisione(base: number, x: number, y: number, mischia: boolean, chi = 0): void {
    this.combo++; this.comboT = 2.4;
    const molt = Math.min(5, 1 + Math.floor((this.combo - 1) / 2));
    const n = Math.round((base * molt + (mischia ? 50 : 0)) * this.diff.punti);
    this.punti(n, x, y, chi);
    if (molt > 1) { this.hud.combo.setText(`COMBO X${molt}`).setVisible(true).setAlpha(1); }
    if (Phaser.Math.Between(0, 99) < 6) voce('gelataio_pepite', 8, 0.9);
    if (molt >= 3) parla([this.hero.id, 'eroe'], 'combo', 0.5);
  }
  giocatoreColpito(): void { this.colpitoNelBoss = true; }
  /** La gelataia, quando cade, a volte lascia le bombe ("prenditi queste bombe!"). */
  mortoNemico(e: Enemy): void {
    if (e.chi === 'gelataia' && Math.random() < 0.45) {
      this.premi.push({ s: img(this, e.x, GROUND_Y, 'cassa_bombe', 'premio_bombe', 0.75).setOrigin(0.5, 1).setDepth(41), tipo: 'bombe' });
      this.time.delayedCall(250, () => parla('gelataia', 'bombe', 1, 0));
    }
  }
  bossVicino(x: number, y: number): boolean {
    const b = this.boss;
    return !!b && !b.morto && b.attivo && Math.abs(b.x - x) < 34 && Math.abs(b.y - y) < 30;
  }
  colpoMischia(area: Phaser.Geom.Rectangle, danno: number, chi = 0): void {
    for (const b of this.bossi()) if (!b.morto && Phaser.Geom.Intersects.RectangleToRectangle(area, b.box())) b.danno(Math.round(danno * 0.5), chi);
  }

  // ------------------------------------------------------------------ ciclo
  update(_t: number, dms: number): void {
    const dt = Math.min(dms / 1000, 1 / 30);
    // micro-pausa sui colpi: prima di leggere i comandi, così le pressioni (salto, bomba) non vanno perse
    if (this.congelato > 0 && !this.pausa && !this.continua) { this.congelato -= dms / 1000; return; }
    const inps = this.ctrls.map((c) => c.leggi());
    const flush = () => this.ctrls.forEach((c) => c.flush());
    if (inps.some((i) => i.pausaTap) && !this.finito && !this.uscita) {
      this.pausa = !this.pausa; this.hud.pausa.setVisible(this.pausa);
      // ferma anche timer (ondate, arrivo dei boss) e animazioni, non solo l'update
      this.time.paused = this.pausa;
      if (this.pausa) this.tweens.pauseAll(); else this.tweens.resumeAll();
    }
    if (this.pausa) {
      if (inps.some((i) => i.audioTap)) { setMuted(!isMuted()); writeSave({ muted: isMuted() }); }
      flush(); return;
    }
    if (this.continua) { this.aggiornaContinua(dt, { confermaTap: inps.some((i) => i.confermaTap) }); flush(); return; }
    this.stopCd = Math.max(0, this.stopCd - dt);
    if (!this.finito) this.st.tempo += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; this.hud.combo.setVisible(false); } }

    const fermo = { sx: false, dx: this.uscita, su: false, giu: false, fuoco: false, saltoTap: false, bombaTap: false, meleeTap: false };
    this.giocatori.forEach((p, i) => p.update(dt, this.uscita || this.finito ? fermo : inps[i]));
    this.etichette.forEach((t, i) => {
      const p = this.giocatori[i];
      // le etichette stanno a due quote diverse: se i due si sovrappongono restano leggibili
      t.setVisible(!p.morto).setPosition(pix(p.x), pix(p.y - 62 - i * 9));
    });
    this.aggiornaCamera(dt);
    if (this.fase === 'strada') this.aggiornaStrada();
    else if (this.fase === 'chiesa') this.aggiornaChiesa();
    this.ambiente?.update(dt, this.camX);
    for (const e of this.nemici) e.update(dt);
    this.boss?.update(dt);
    this.boss2?.update(dt);
    this.aggiornaProiettili(dt);
    this.aggiornaCasse();
    this.aggiornaPremi();
    this.pulisci();
    this.gestisciMorte(dt);
    this.aggiornaHud();
    flush();
  }

  private aggiornaCamera(dt: number): void {
    if (this.arena) {
      // smorzamento esponenziale: stessa curva a 30, 60 o 144 fotogrammi al secondo
      this.camX = Phaser.Math.Linear(this.camX, this.arena.x, 1 - Math.exp(-5 * dt));
      if (Math.abs(this.camX - this.arena.x) < 0.5) this.camX = this.arena.x;
    } else {
      const voluto = Math.min(this.xGuida() - 150, this.bloccoDx - VIEW_W);
      if (voluto > this.camX) {
        // Si va solo avanti, come in Metal Slug, ma MAI di scatto. Quando un'ondata
        // finisce, il blocco si toglie di colpo e il giocatore è spesso appiccicato al
        // bordo destro: prima la camera ci saltava sopra (misurati 106 px in un solo
        // fotogramma). Ora recupera il ritardo a velocità limitata, in ~1 s.
        const ritardo = voluto - this.camX;
        this.camX = Math.min(voluto, this.camX + Math.min(ritardo * 9, CAM_RECUPERO) * dt);
      }
    }
    this.camX = Phaser.Math.Clamp(this.camX, 0, this.larghezza - VIEW_W);
    // scossa: orizzontale, in calo, e sempre dentro i bordi del mondo
    let off = 0;
    if (this.scossaT > 0) {
      this.scossaT = Math.max(0, this.scossaT - dt);
      off = (Math.random() * 2 - 1) * this.scossaAmp * (this.scossaT / this.scossaDur);
    }
    const sx = Phaser.Math.Clamp(this.camX + off, 0, this.larghezza - VIEW_W);
    // agganciata alla griglia dei pixel d'arte: niente tremolio sui fondali
    this.cameras.main.setScroll(pix(sx), 0);
  }

  private aggiornaStrada(): void {
    const xg = this.xGuida();
    // ondate
    if (this.onda < WAVES.length && xg > WAVES[this.onda].x) {
      if (this.onda === CHECKPOINT_ONDA && this.st.checkpoint !== 'giova') { this.st.checkpoint = 'meta'; this.annuncio('CHECKPOINT!', 'SE PERDETE RIPARTITE DA QUI'); }
      const w = WAVES[this.onda++];
      this.bloccoDx = this.camX + VIEW_W + 40;
      for (const n of w.nemici) {
        this.time.delayedCall(n.ritardo * 1000, () => {
          const x = n.xFisso ?? (n.lato === 'dx' ? this.camX + VIEW_W + 24 : this.camX - 24);
          const e = this.spawn(n.tipo, x, (w.fretta ?? 1) * this.aggressivita());
          // chi è sul balcone non blocca l'avanzata: si può ignorare o abbattere sparando in alto
          if (n.tipo !== 'balcone') this.ondaViva.push(e);
        });
      }
      this.ondaViva = this.ondaViva.filter((e) => !e.morto);
      this.time.delayedCall(Math.max(...w.nemici.map((n) => n.ritardo)) * 1000 + 50, () => { this.ondaPronta = true; });
      this.ondaPronta = false;
    }
    const vivi = this.ondaViva.some((e) => !e.morto);
    if (this.ondaPronta && !vivi && this.bloccoDx !== Infinity) {
      this.bloccoDx = Infinity; this.mostraGo(); this.dietroT = 0;
    } else if (this.bloccoDx !== Infinity && vivi) {
      // Un nemico rimasto alle spalle tiene chiuso il cancello dell'ondata mentre il
      // giocatore e' incollato al bordo destro e guarda a destra: senza un segnale
      // sembra che il gioco si sia bloccato. Dopo 2,5 s compare una freccia a sinistra.
      const xr = this.xRetro();
      const tutti = this.ondaViva.filter((e) => !e.morto).every((e) => e.x < xr - 20);
      this.dietroT = tutti ? this.dietroT + 1 / 60 : 0;
      if (this.dietroT > 2.5) { this.dietroT = -3; this.segnalaDietro(); }
      else if (this.dietroT < 0) this.dietroT += 1 / 60;
    }
    // arena di Giova davanti al bar
    const arenaX = Math.round(BG.street.barX + (BG.street.barW - VIEW_W) / 2);
    if (!this.arena && !this.giovaArrivato && this.onda >= WAVES.length && this.bloccoDx === Infinity && xg > arenaX + 90) {
      this.arena = { x: arenaX }; this.giovaArrivato = true; this.st.checkpoint = 'giova';
      // la musica della strada continua anche con Giovanni; il suo "sottofondo" suona sopra, a intervalli
      setFaseAudio('bucaneve');
      voce('barista_femmina');
      this.time.delayedCall(700, () => {
        this.boss = new Giova(this, arenaX + VIEW_W + 40);
        this.scalaBoss(this.boss, 1.5);
        this.colpitoNelBoss = false;
        this.boss.onMorte = () => { parla('giova', 'muore', 1, 0); sottofondo(null); this.bonusPerfetto(); };
        this.time.delayedCall(2400, () => { if (this.boss && !this.boss.morto) sottofondo('giova', 14); });
        this.mostraBossHud();
        this.annuncio('GIOVANNI', 'IL BUTTAFUORI DEL BUCANEVE');
      });
    }
    // Giova battuto: si entra nel bar
    if (this.boss && this.boss.morto && this.boss.mortoT > 1.6 && !this.uscita) {
      this.hud.boss.setVisible(false);
      if (!this.hud.go.visible) { this.mostraGo('ENTRA NEL BAR'); }
      this.arena = null; this.bloccoDx = Infinity;
      if (xg > this.larghezza - 30) {
        this.uscita = true;
        this.cameras.main.fadeOut(600);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ fase: 'cantina', stato: this.statoGiocatore(), eroi: this.eroi.map((h) => h.id) }));
      }
    }
  }
  // ------------------------------------------------------------------ HOLY SLUG: la chiesa
  /** Navata: ondate come in strada (stesso cancello, stessa freccia "DIETRO!"), poi l'arena dell'altare. */
  private aggiornaChiesa(): void {
    const xg = this.xGuida();
    if (this.onda < WAVES_CHIESA.length && xg > WAVES_CHIESA[this.onda].x) {
      if (this.onda === CHECKPOINT_CHIESA && this.st.checkpoint !== 'altare') { this.st.checkpoint = 'navata'; this.annuncio('CHECKPOINT!', 'SE PERDETE RIPARTITE DA QUI'); }
      const w = WAVES_CHIESA[this.onda++];
      this.bloccoDx = this.camX + VIEW_W + 40;
      for (const n of w.nemici) {
        this.time.delayedCall(n.ritardo * 1000, () => {
          const x = n.lato === 'dx' ? this.camX + VIEW_W + 24 : this.camX - 24;
          this.ondaViva.push(this.spawn(n.tipo, x, (w.fretta ?? 1) * this.aggressivita()));
        });
      }
      this.ondaViva = this.ondaViva.filter((e) => !e.morto);
      this.time.delayedCall(Math.max(...w.nemici.map((n) => n.ritardo)) * 1000 + 50, () => { this.ondaPronta = true; });
      this.ondaPronta = false;
    }
    const vivi = this.ondaViva.some((e) => !e.morto);
    if (this.ondaPronta && !vivi && this.bloccoDx !== Infinity) {
      this.bloccoDx = Infinity; this.mostraGo(); this.dietroT = 0;
    } else if (this.bloccoDx !== Infinity && vivi) {
      const xr = this.xRetro();
      const tutti = this.ondaViva.filter((e) => !e.morto).every((e) => e.x < xr - 20);
      this.dietroT = tutti ? this.dietroT + 1 / 60 : 0;
      if (this.dietroT > 2.5) { this.dietroT = -3; this.segnalaDietro(); }
      else if (this.dietroT < 0) this.dietroT += 1 / 60;
    }
    // arena dell'altare: entra Griso
    const arenaX = CH_BG.arenaX;
    if (!this.arena && !this.giovaArrivato && this.onda >= WAVES_CHIESA.length && this.bloccoDx === Infinity && xg > arenaX + 90) {
      this.arena = { x: arenaX }; this.giovaArrivato = true; this.st.checkpoint = 'altare';
      musica('chiesa_boss');
      this.time.delayedCall(900, () => {
        const g = new Griso(this, arenaX + VIEW_W + 40);
        this.scalaBoss(g, 1.5);
        g.onMorte = () => this.bossFinaleMorto();
        this.colpitoNelBoss = false;
        this.boss = g;
        this.mostraBossHud();
        this.annuncio(GRISO.nome, GRISO.sottotitolo);
      });
    }
    // a meta' della vita di Griso (o se cade prima) arriva Don Antonio a cercarlo, da sinistra
    const g = this.boss;
    if (g && !this.donArrivato && (g.morto || g.vita < g.vitaMax * 0.5)) {
      this.donArrivato = true;
      this.time.delayedCall(g.morto ? 1200 : 300, () => {
        const d = new DonAntonio(this, this.camX - 40, true);
        this.scalaBoss(d, 1.5);
        d.onMorte = () => this.bossFinaleMorto();
        this.boss2 = d;
        (this.hud.boss.list[1] as PixelText).setText(`${GRISO.nome} E ${DON_ANTONIO.nome}`);
        this.annuncio(DON_ANTONIO.nome, DON_ANTONIO.sottotitolo, 30);
        sfx('bossUrlo'); this.scuoti(260, 3);
        // due chierichetti al seguito
        this.time.delayedCall(2200, () => { this.spawn('chierichetto', this.camX + VIEW_W + 20); });
      });
    }
  }
  /** Bonus "perfetto" solo quando sono a terra tutti e due i boss della chiesa. */
  private bossFinaleMorto(): void {
    if (this.boss2 && this.bossi().every((b) => b.morto)) this.bonusPerfetto();
  }

  private dietroT = 0;
  /** Freccia rossa lampeggiante a sinistra: "il nemico che manca è dietro di te". */
  private segnalaDietro(): void {
    const f = this.add.image(26, 92, 'freccia').setScrollFactor(0).setDepth(195).setFlipX(true).setTint(0xff6040);
    const t = txt(this, 26, 108, 'DIETRO!', 8, '#ff8080').setOrigin(0.5).setScrollFactor(0).setDepth(195);
    this.tweens.add({ targets: [f, t], alpha: 0.15, duration: 280, yoyo: true, repeat: 5,
      onComplete: () => { f.destroy(); t.destroy(); } });
  }
  private ondaPronta = true;
  private giovaArrivato = false;

  /** In due i nemici attaccano un po' piu' spesso e i boss hanno piu' vita: due pistole fanno il doppio del danno. */
  private aggressivita(): number { return this.diff.aggressivita * (this.eroi.length > 1 ? 1.15 : 1); }
  private scalaBoss(b: BossBase, k2: number): void {
    if (this.eroi.length < 2) return;
    b.vitaMax = Math.round(b.vitaMax * k2); b.vita = b.vitaMax;
  }

  private spawn(tipo: EnemyType, x: number, fretta = 1): Enemy {
    const def = ENEMIES[tipo];
    const e = new Enemy(this, def, Phaser.Utils.Array.GetRandom(def.sheets), x, fretta);
    this.nemici.push(e);
    return e;
  }

  private aggiornaProiettili(dt: number): void {
    for (const b of this.proiettili) {
      b.update(dt);
      if (b.morto) {
        if (b.o.esplosivo) this.esplodi(b);
        else if (b.o.tex === 'bottiglia') this.cocci(b.sprite.x, b.sprite.y);
        continue;
      }
      const x = b.sprite.x, y = b.sprite.y;
      if (x < this.camX - 30 || x > this.camX + VIEW_W + 30) { b.morto = true; continue; }
      if (b.o.ostile) {
        const tratto2 = new Phaser.Geom.Line(b.px, b.py, x, y);
        // la bottiglia disegnata e' grande (16 px): oltre al tratto percorso conta un quadrato di 9 px attorno al centro
        const sq = b.o.disegno ? new Phaser.Geom.Rectangle(x - 4.5, y - 4.5, 9, 9) : null;
        const p = this.giocatori.find((q) => !q.morto && (Phaser.Geom.Intersects.LineToRectangle(tratto2, q.box()) || (sq && Phaser.Geom.Intersects.RectangleToRectangle(sq, q.box()))));
        if (p) {
          p.danno(b.o.danno); b.morto = true;
          if (b.o.tex === 'bottiglia') this.cocci(x, y);
        }
        continue;
      }
      const tratto = new Phaser.Geom.Line(b.px, b.py, x, y);
      for (const pr of this.props) {
        if (pr.vita <= 0 || !Phaser.Geom.Intersects.LineToRectangle(tratto, pr.s.getBounds())) continue;
        if (b.o.esplosivo) { b.morto = true; break; }
        this.dannoProp(pr, b.o.danno, b.o.chi ?? 0); if (!b.o.perforante) { b.morto = true; break; }
      }
      if (b.morto) { if (b.o.esplosivo) this.esplodi(b); continue; }
      for (const e of this.nemici) {
        if (e.morto || b.colpiti.has(e) || !Phaser.Geom.Intersects.LineToRectangle(tratto, e.box())) continue;
        if (b.o.esplosivo) { b.morto = true; break; }
        e.danno(b.o.danno, Math.sign(b.vx), false, b.o.chi ?? 0); b.colpiti.add(e); this.scintilla(x, y);
        if (!b.o.perforante) { b.morto = true; break; }
      }
      for (const bo of this.bossi()) {
        if (b.morto || bo.morto || !bo.attivo || b.colpiti.has(bo) || !Phaser.Geom.Intersects.LineToRectangle(tratto, bo.box())) continue;
        if (b.o.esplosivo) b.morto = true;
        else { bo.danno(b.o.danno, b.o.chi ?? 0); b.colpiti.add(bo); if (!b.o.perforante) b.morto = true; }
        if (!b.o.esplosivo) this.scintilla(x, y);
      }
      if (b.morto && b.o.esplosivo) this.esplodi(b);
    }
  }
  private esplodi(b: Bullet): void {
    if (b.o.tex === 'esploso') return;
    b.o.tex = 'esploso';
    const x = b.sprite.x, y = Math.min(b.sprite.y, GROUND_Y - 4), r = b.o.esplosivo ?? 30;
    this.boom(x, y, r > 40);
    const chi = b.o.chi ?? 0;
    for (const e of this.nemici) if (!e.morto && Math.hypot(e.x - x, e.y - 24 - y) < r + 14) e.danno(b.o.danno, Math.sign(e.x - x), false, chi);
    for (const bo of this.bossi()) if (!bo.morto && Math.abs(bo.x - x) < r + 30) bo.danno(b.o.danno, chi);
    for (const pr of this.props) if (pr.vita > 0 && Math.abs(pr.s.x - x) < r + 10) this.dannoProp(pr, 99, chi);
  }

  // ------------------------------------------------------------------ oggetti distruttibili
  private dannoProp(pr: Prop, n: number, chi = 0): void {
    if (pr.vita <= 0 || !pr.s.active) return; // già distrutto (es. due esplosioni vicine in catena)
    pr.vita -= n;
    pr.s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(50, () => pr.s.active && pr.s.setTintMode(Phaser.TintModes.MULTIPLY));
    if (pr.vita > 0) { sfx('nemicoColpito'); return; }
    const x = pr.s.x, y = pr.s.y - pr.s.height / 2;
    this.punti(Math.round(50 * this.diff.punti), x, y - 10, chi);
    if (pr.rompe === 'esplode') {
      this.boom(x, y, true);
      for (const e of this.nemici) if (!e.morto && Math.abs(e.x - x) < 50) e.danno(80, Math.sign(e.x - x), false, chi);
      for (const bo of this.bossi()) if (!bo.morto && Math.abs(bo.x - x) < 60) bo.danno(60, chi);
      for (const p of this.giocatori) if (!p.morto && Math.abs(p.x - x) < 34) p.danno(15);
      for (const q of this.props) if (q !== pr && q.vita > 0 && Math.abs(q.s.x - x) < 60) this.time.delayedCall(150, () => this.dannoProp(q, 99, chi));
    } else {
      sfx('nemicoMorto'); this.hitstop(0.05); this.scuoti(110, 2);
      const tex = pr.rompe === 'vetro' ? 'px' : 'scheggia';
      if (this.detriti(x, y, 0.8)) { this.polvere(x); }
      else for (let i = 0; i < 9; i++) {
        const sp = this.add.image(x, y, tex).setDepth(62).setScale(pr.rompe === 'vetro' ? 2 : 1);
        if (pr.rompe === 'vetro') sp.setTint(i % 2 ? 0x4f8a3a : 0xc8e0a0);
        this.tweens.add({ targets: sp, x: x + Phaser.Math.Between(-24, 24), y: y - Phaser.Math.Between(0, 20), alpha: 0, angle: 180, duration: 500, onComplete: () => sp.destroy() });
      }
      // a volte lascia un premio
      const r = Math.random();
      if (r < 0.35) this.premi.push({ s: (r < 0.15 ? img(this, x, GROUND_Y, 'cassa_bombe', 'premio_bombe', 0.75) : this.add.image(x, GROUND_Y, 'premio_gelato')).setOrigin(0.5, 1).setDepth(41), tipo: r < 0.15 ? 'bombe' : 'gelato' });
    }
    pr.s.destroy();
  }
  private aggiornaPremi(): void {
    for (const q of this.premi) {
      const p = this.giocatori.find((g) => !g.morto && Math.abs(q.s.x - g.x) <= 12 && g.y >= GROUND_Y - 20);
      if (!q.s.active || !p) continue;
      sfx('raccolta');
      if (q.tipo === 'bombe') { p.bombe += 5; this.testo(p.x, p.y - 62, 'BOMBE +5', '#80ff80'); }
      else { p.vita = Math.min(p.vitaMax, p.vita + 30); this.testo(p.x, p.y - 62, 'GELATO! +VITA', '#80ff80'); }
      q.s.destroy();
    }
    this.premi = this.premi.filter((q) => q.s.active);
  }
  private scintilla(x: number, y: number): void {
    if (FX.scintille_1) {
      const s = img(this, x, y, Math.random() < 0.5 ? 'scintille_1' : 'scintille_2', 'scintilla', 0.6).setDepth(65).setAngle(Phaser.Math.Between(0, 359));
      this.tweens.add({ targets: s, alpha: 0, duration: 140, onComplete: () => s.destroy() });
      return;
    }
    const s = this.add.image(x, y, 'scintilla').setTint(0xfff0a0).setScale(0.5).setDepth(65);
    this.tweens.add({ targets: s, alpha: 0, scale: 0.1, duration: 120, onComplete: () => s.destroy() });
  }
  /** Pezzi che volano via: usa i detriti disegnati, altrimenti quadratini del codice. */
  private detriti(x: number, y: number, scala = 0.6): boolean {
    if (!FX.detriti) return false;
    const s = img(this, x, y, 'detriti', 'px', scala).setDepth(62).setFlipX(Math.random() < 0.5);
    this.tweens.add({ targets: s, y: y - 8, alpha: 0, duration: 450, onComplete: () => s.destroy() });
    return true;
  }
  private cocci(x: number, y: number): void {
    sfx('nemicoColpito');
    if (this.detriti(x, Math.min(y, GROUND_Y - 4), 0.5)) return;
    for (let i = 0; i < 5; i++) {
      const s = this.add.image(x, Math.min(y, GROUND_Y - 2), 'px').setTint(i % 2 ? 0x4f8a3a : 0xc8e0a0).setScale(2).setDepth(62);
      this.tweens.add({ targets: s, x: x + Phaser.Math.Between(-14, 14), y: s.y - Phaser.Math.Between(4, 14), alpha: 0, duration: 380, onComplete: () => s.destroy() });
    }
  }

  private aggiornaCasse(): void {
    for (const c of this.casse) {
      if (!c.s.active) continue;
      const p = this.giocatori.find((g) => !g.morto && Math.abs(c.s.x - g.x) < 14 && g.y > GROUND_Y - 20);
      if (p) {
        p.prendiArma(c.arma); sfx('raccolta');
        this.testo(p.x, p.y - 62, WEAPONS[c.arma].nome + '!', '#80ff80');
        this.apriCassa(c.s.x);
        c.s.destroy();
      }
    }
  }

  /** Cassa che si apre (6 fotogrammi disegnati) quando la si raccoglie. */
  private apriCassa(x: number): void {
    if (!FX.apre_1) return;
    const s = img(this, x, GROUND_Y, 'apre_1', 'cassa').setOrigin(0.5, 1).setDepth(41);
    let i = 1;
    this.time.addEvent({ delay: 70, repeat: 5, callback: () => {
      i++;
      if (i <= 6) { const t = fxTex(`apre_${i}`, 'cassa'); s.setTexture(t.key).setScale(t.s); }
      if (i === 6) this.tweens.add({ targets: s, alpha: 0, delay: 400, duration: 300, onComplete: () => s.destroy() });
    } });
  }
  /** Sbuffo di polvere (morti, atterraggi pesanti). */
  polvere(x: number, grande = false): void {
    if (!FX.polvere_1) return;
    const s = img(this, x, GROUND_Y + 1, grande ? 'polvere_3' : 'polvere_2', 'fumo', 0.8).setOrigin(0.5, 1).setDepth(46);
    this.tweens.add({ targets: s, alpha: 0, y: GROUND_Y - 3, duration: 600, onComplete: () => s.destroy() });
  }

  private pulisci(): void {
    this.proiettili = this.proiettili.filter((b) => { if (b.morto) b.distruggi(); return !b.morto; });
    this.nemici = this.nemici.filter((e) => {
      const via = (e.morto && e.mortoT > 1.9) || e.x < this.camX - 160 || e.x > this.camX + VIEW_W + 220;
      if (via) { e.distruggi(); if (!e.morto) e.morto = true; }
      return !via;
    });
  }

  private gestisciMorte(dt: number): void {
    // a partita finita (vittoria o game over già deciso) niente più rinascite né vite perse
    this.giocatori.forEach((p, i) => {
      if (p.fuori) return;
      if (p.morto && this.rinascitaT[i] < 0 && !this.finito) this.rinascitaT[i] = 1.6;
      if (this.rinascitaT[i] < 0 || this.finito) return;
      this.rinascitaT[i] -= dt;
      if (this.rinascitaT[i] >= 0) return;
      const g = this.st.g[i];
      g.vite--;
      if (g.vite <= 0) {
        // senza vite: resta fuori. Se c'e' ancora un compagno in gioco si va avanti in uno,
        // altrimenti parte il CONTINUE per tutti.
        p.fuori = true; p.sprite.setVisible(false); p.nascondiArma();
        this.testo(p.x, GROUND_Y - 80, this.giocatori.length > 1 ? `${i + 1}P FUORI!` : 'FINITO!', '#ff8080');
        if (this.giocatori.every((q) => q.fuori)) this.apriContinua();
      } else {
        // il secondo rientra un po' piu' in la', cosi' i due non nascono sovrapposti
        p.rinasci(this.camX + 70 + i * 40); this.testo(p.x, GROUND_Y - 80, 'FORZA!', '#80ff80');
      }
    });
    // Ettore battuto: si va in chiesa (HOLY SLUG) con punti, vite e armi
    if (this.fase === 'cantina' && this.boss?.morto && !this.finito && this.boss.mortoT > 1.2) {
      this.giocatori.forEach((p) => { p.vince = true; });
      this.finito = true; this.hud.boss.setVisible(false);
      // stesso bonus di fine missione di prima (tempo + vite), poi si prosegue in chiesa
      const tempoBonus = Math.max(0, Math.round(3000 - this.st.tempo * 10));
      this.giocatori.forEach((_, i) => this.punti(tempoBonus + Math.max(0, this.st.g[i].vite) * 1000, undefined, undefined, i));
      this.annuncio('MISSIONE COMPIUTA!', `BONUS TEMPO ${tempoBonus} + VITE`);
      this.time.delayedCall(2600, () => this.annuncio('PROSSIMA FERMATA', 'LA CHIESA', 40));
      this.time.delayedCall(4600, () => {
        this.cameras.main.fadeOut(700);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ fase: 'chiesa', stato: { ...this.statoGiocatore(), checkpoint: undefined }, eroi: this.eroi.map((h) => h.id) }));
      });
    }
    // vittoria finale: in chiesa, Griso e Don Antonio entrambi a terra
    const bossiFinali = this.bossi();
    if (this.fase === 'chiesa' && this.donArrivato && bossiFinali.length === 2 && bossiFinali.every((b) => b.morto && b.mortoT > 1.2) && !this.finito) {
      this.giocatori.forEach((p) => { p.vince = true; });
      this.finito = true; this.hud.boss.setVisible(false);
      // bonus tempo sul tempo passato in chiesa (non su tutta la partita)
      const tempoBonus = Math.max(0, Math.round(3000 - (this.st.tempo - this.tempoInizio) * 10));
      this.giocatori.forEach((_, i) => this.punti(tempoBonus + Math.max(0, this.st.g[i].vite) * 1000, undefined, undefined, i));
      this.annuncio('HOLY SLUG COMPIUTA!', `BONUS TEMPO ${tempoBonus} + VITE`);
      this.time.delayedCall(3200, () => this.fine(true));
    }
  }

  private fine(vittoria: boolean): void {
    this.finito = true;
    const r: Risultato = {
      vittoria, tempo: this.st.tempo, titolo: this.fase === 'chiesa' ? 'HOLY SLUG COMPIUTA!' : undefined,
      giocatori: this.eroi.map((h, i) => ({ nome: h.nome, punti: this.st.g[i].punti })),
    };
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', r));
  }

  private statoGiocatore(): Stato {
    return { ...this.st, g: this.giocatori.map((p, i) => ({ ...this.st.g[i], arma: p.arma.id, munizioni: p.munizioni, bombe: p.bombe })) };
  }

  // ------------------------------------------------------------------ cantina
  private introEttore(): void {
    this.finito = true; // blocca i comandi durante la presentazione
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.75).setOrigin(0));
    const r = this.add.image(VIEW_W - 90, VIEW_H, 'ettore_ritratto').setOrigin(0.5, 1).setScale(1 / SHEETS.ettore_ritratto.d);
    c.add(r);
    c.add(txt(this, 20, 70, 'ETTORE', 26, '#ff5040', 6));
    c.add(txt(this, 22, 102, 'IL BARISTA CON LA DOPPIETTA', 9));
    c.add(txt(this, 22, 124, '"VEI CHI CHE TE MATO!"', 9, '#ffe066'));
    r.x += 160; this.tweens.add({ targets: r, x: VIEW_W - 90, duration: 400, ease: 'Back.out' });
    sfx('bossUrlo');
    this.time.delayedCall(350, () => voce('ettore_intro'));
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
      this.finito = false;
      musica('battaglia-ettore');
      const e = new Ettore(this, this.camX + VIEW_W + 40); // appena fuori dallo schermo, non in fondo alla cantina
      this.scalaBoss(e, 1.6);
      e.onFase2 = () => {
        // a 62% di vita chiama rinforzi
        this.time.delayedCall(400, () => { this.spawn('gelataio', this.camX - 20); this.spawn('gelataio', this.camX + VIEW_W + 20); });
      };
      e.onFase3 = () => {
        // ultimo quarto: due ubriachi che tirano bottiglie mentre Ettore tiene sotto tiro
        this.time.delayedCall(500, () => { this.spawn('ubriaco', this.camX - 20); this.spawn('lanciagelati', this.camX + VIEW_W + 20); });
      };
      e.onMorte = () => { voce('ettore_muore'); this.bonusPerfetto(); };
      this.colpitoNelBoss = false;
      this.boss = e;
      this.mostraBossHud();
    });
  }

  /** Bonus se il boss è stato battuto senza mai essere colpiti. */
  private bonusPerfetto(): void {
    if (this.colpitoNelBoss) return;
    const n = Math.round(3000 * this.diff.punti);
    this.time.delayedCall(900, () => { this.giocatori.forEach((_, i) => this.punti(n, undefined, undefined, i)); this.annuncio('PERFETTO!', `NESSUN COLPO SUBITO +${n}`, 44); });
  }

  // ------------------------------------------------------------------ continue (come in sala giochi)
  private apriContinua(): void {
    this.finito = true;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(210);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.6).setOrigin(0));
    c.add(txt(this, VIEW_W / 2, 64, 'CONTINUE?', 22, '#ffe066').setOrigin(0.5));
    const t = txt(this, VIEW_W / 2, 104, '9', 28, '#ff6060').setOrigin(0.5);
    c.add(t);
    c.add(txt(this, VIEW_W / 2, 150, this.fase === 'cantina' ? 'INVIO O TOCCO: RIPARTI DALLA CANTINA' : this.fase === 'chiesa' ? 'INVIO O TOCCO: RIPARTI DALLA CHIESA' : 'INVIO O TOCCO: RIPARTI DALLA STRADA', 9).setOrigin(0.5));
    c.add(txt(this, VIEW_W / 2, 164, 'I PUNTI RESTANO, SI RIPARTE CON LA PISTOLA', 8, '#c8d0e0').setOrigin(0.5));
    this.continua = { c, t, n: 9, acc: 0, aperto: 0 };
    // da touch: un tocco sul campo (fuori dai pulsanti) conferma, come INVIO
    this.input.on('pointerdown', () => { if (this.continua && this.continua.aperto > 0.5) this.continua.toccato = true; });
    sfx('allarme');
  }
  private aggiornaContinua(dt: number, inp: { confermaTap: boolean }): void {
    const k = this.continua!; k.acc += dt; k.aperto += dt;
    // mezzo secondo di attesa: chi stava martellando il tasto di fuoco (J) non continua per sbaglio
    if ((inp.confermaTap || k.toccato) && k.aperto > 0.5) {
      this.st.crediti++;
      const stato: Stato = { ...this.st, g: this.st.g.map((q) => ({ ...nuovoPStato(this.diff.vite), punti: q.punti })) };
      this.continua = null;
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ fase: this.fase, stato, eroi: this.eroi.map((h) => h.id) }));
      return;
    }
    if (k.acc >= 1) {
      k.acc -= 1; k.n--; sfx('menu');
      if (k.n < 0) { this.continua = null; this.fine(false); return; }
      k.t.setText(String(k.n));
    }
  }

  // ------------------------------------------------------------------ HUD (in stile Metal Slug)
  /** Un giocatore: punteggio, barra della vita, vite, riquadro ARMS/BOMB. `ox` = spostamento orizzontale. */
  private creaBlocco(i: number, ox: number, due: boolean): { vita: Phaser.GameObjects.Image[]; vite: PixelText; punti: PixelText; armi: PixelText; bombe: PixelText; armaNome: PixelText; icona: Phaser.GameObjects.Image } {
    const D = 100;
    const fix = <T extends Phaser.GameObjects.GameObject & { setScrollFactor: (n: number) => T; setDepth: (n: number) => T }>(o: T): T => o.setScrollFactor(0).setDepth(D);
    const col = COLORE_G[i];
    const punti = fix(txt(this, ox + 106, 2, '0', 10, '#ffffff').setOrigin(1, 0));
    if (due) fix(txt(this, ox + 4, 2, `${i + 1}P`, 10, col));
    fix(this.add.rectangle(ox + 4, 12, 103, 8, 0x0a0c18).setOrigin(0).setStrokeStyle(1, due ? Phaser.Display.Color.HexStringToColor(col).color : 0x7890c0));
    const vita = [] as Phaser.GameObjects.Image[];
    for (let k = 0; k < 20; k++) vita.push(fix(this.add.image(ox + 6 + k * 5, 13, 'seg').setOrigin(0)));
    const vite = fix(txt(this, ox + 4, 22, '1UP=3', 9, '#ffe066'));
    fix(this.add.rectangle(ox + 112, 2, 70, 22, 0x0a0c18, 0.75).setOrigin(0).setStrokeStyle(1, 0x7890c0));
    fix(txt(this, ox + 115, 4, 'ARMS', 8, '#80d0ff'));
    fix(txt(this, ox + 150, 4, 'BOMB', 8, '#80d0ff'));
    const armi = fix(txt(this, ox + 128, 13, '∞', 9, '#ffe066').setOrigin(0.5, 0));
    const bombe = fix(txt(this, ox + 162, 13, '10', 9, '#ffe066').setOrigin(0.5, 0));
    const icona = fix(img(this, ox + 113, 26, 'icona_pistola', 'px').setOrigin(0, 0));
    if (FX.icona_bomba) fix(img(this, ox + 175, 13, 'icona_bomba', 'px', 0.6).setOrigin(0.5, 0));
    const armaNome = fix(txt(this, ox + (FX.icona_pistola ? 133 : 113), 28, '', 8, '#c0ffc0'));
    return { vita, vite, punti, armi, bombe, armaNome, icona };
  }

  private creaHud(): void {
    const D = 100;
    const fix = <T extends Phaser.GameObjects.GameObject & { setScrollFactor: (n: number) => T; setDepth: (n: number) => T }>(o: T): T => o.setScrollFactor(0).setDepth(D);
    const due = this.eroi.length === 2;
    // fascia scura dietro l'HUD: i numeri restano leggibili anche sulle facciate chiare
    fix(this.add.rectangle(0, 0, VIEW_W, 34, 0x000000, 0.45).setOrigin(0));
    // sinistra: primo giocatore; in due, il secondo sta a destra con lo stesso disegno
    const blocchi = this.eroi.map((_, i) => this.creaBlocco(i, i * 194, due));
    // centro: tempo grande (in due va sotto la fascia: in alto non c'e' piu' posto)
    const tempo = due
      ? fix(txt(this, VIEW_W / 2, 36, '0:00', 10, '#ffe066').setOrigin(0.5, 0))
      : fix(txt(this, VIEW_W / 2 + 20, 2, '0:00', 16, '#ffe066').setOrigin(0.5, 0));
    const combo = fix(txt(this, due ? VIEW_W / 2 : VIEW_W / 2 + 20, due ? 46 : 24, '', 9, '#ff6060').setOrigin(0.5, 0).setVisible(false));
    // destra (un solo giocatore): ritratto e nome
    if (!due) {
      fix(this.add.rectangle(VIEW_W - 34, 2, 30, 30, 0x0a0c18).setOrigin(0).setStrokeStyle(1, 0xffe066));
      const sh = SHEETS[`hero_${this.hero.id}`];
      const ritr = fix(this.add.sprite(VIEW_W - 19, 0, `sh_hero_${this.hero.id}`, sh.frames.indexOf('idle')).setOrigin(0.5, 0));
      const top = Math.max(0, sh.foot - 56 * sh.d);
      ritr.setScale(1 / sh.d).setCrop(sh.cw / 2 - 14 * sh.d, top, 28 * sh.d, 29 * sh.d); ritr.y = 3 - top / sh.d;
      fix(txt(this, VIEW_W - 37, 4, this.hero.nome, 8, '#ffffff').setOrigin(1, 0));
      fix(txt(this, VIEW_W - 37, 14, this.diff.nome, 8, '#c8d0e0').setOrigin(1, 0));
    }
    // barra del boss in basso
    const boss = this.add.container(VIEW_W / 2 - 66, VIEW_H - 14).setScrollFactor(0).setDepth(D).setVisible(false);
    boss.add(this.add.rectangle(-2, -2, 134, 10, 0x0a0c18).setOrigin(0).setStrokeStyle(1, 0xc04040));
    const bossNome = txt(this, 0, -12, '', 8, '#ff8080');
    boss.add(bossNome);
    const bossSeg: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 26; i++) { const sg = this.add.image(i * 5, 0, 'seg_boss').setOrigin(0); boss.add(sg); bossSeg.push(sg); }
    const pausa = fix(txt(this, VIEW_W / 2, VIEW_H / 2, 'PAUSA\nESC RIPRENDI   L AUDIO ON/OFF   F SCHERMO INTERO', 9, '#ffffff').setAlign('center').setOrigin(0.5).setVisible(false));
    const go = this.add.container(VIEW_W - 50, 70).setScrollFactor(0).setDepth(D).setVisible(false);
    go.add(txt(this, 0, 0, 'AVANTI', 13, '#ffe066').setOrigin(0.5));
    go.add(this.add.image(0, 18, 'freccia'));
    this.hud = { blocchi, tempo, combo, boss, bossSeg, pausa, go };
  }
  private mostraGo(testo = 'AVANTI'): void {
    const g = this.hud.go; (g.list[0] as PixelText).setText(testo).setOrigin(0.5);
    g.setVisible(true); g.setAlpha(1);
    this.tweens.add({ targets: g, alpha: 0.2, duration: 300, yoyo: true, repeat: 5, onComplete: () => g.setVisible(testo !== 'AVANTI') });
  }
  private mostraBossHud(): void {
    if (!this.boss) return;
    this.hud.boss.setVisible(true);
    (this.hud.boss.list[1] as PixelText).setText(this.boss.nome);
    // Tacche sulle soglie delle fasi di Ettore: si vede arrivare il momento in cui si incattivisce.
    if (this.boss instanceof Ettore) {
      for (const [q, col] of [[0.62, 0xffa040], [0.28, 0xff4040]] as [number, number][]) {
        this.hud.boss.add(this.add.rectangle(Math.round(q * 130) - 1, -2, 1, 10, col).setOrigin(0).setDepth(1));
      }
    }
  }
  private annuncio(a: string, b: string, dy = 0): void {
    const t1 = txt(this, VIEW_W / 2, 64 + dy, a, 16, '#ffe066').setOrigin(0.5).setScrollFactor(0).setDepth(150);
    const t2 = txt(this, VIEW_W / 2, 86 + dy, b, 9).setOrigin(0.5).setScrollFactor(0).setDepth(150);
    this.tweens.add({ targets: [t1, t2], alpha: 0, delay: 2000, duration: 500, onComplete: () => { t1.destroy(); t2.destroy(); } });
  }
  private aggiornaHud(): void {
    this.giocatori.forEach((p, i) => {
      const h = this.hud.blocchi[i], g = this.st.g[i];
      const n = Math.ceil((Math.max(0, p.vita) / p.vitaMax) * 20);
      h.vita.forEach((sg, k) => sg.setTexture(k < n ? 'seg' : 'seg_vuoto'));
      h.vite.setText(p.fuori ? 'FUORI' : `1UP=${Math.max(0, g.vite)}`);
      h.punti.setText(String(g.punti));
      h.armi.setText(p.munizioni < 0 ? '∞' : String(p.munizioni));
      h.bombe.setText(String(p.bombe));
      h.armaNome.setText(p.arma.id === 'pistola' ? '' : p.arma.nome);
      const ic = fxTex(`icona_${p.arma.id}`, 'px');
      if (h.icona.texture.key !== ic.key) h.icona.setTexture(ic.key).setScale(ic.s);
      h.icona.setVisible(!!FX[`icona_${p.arma.id}`]);
    });
    const m = Math.floor(this.st.tempo / 60), sec = Math.floor(this.st.tempo % 60);
    this.hud.tempo.setText(`${m}:${String(sec).padStart(2, '0')}`);
    if (this.boss) {
      // con due boss la barra e' la vita che resta a tutti e due insieme
      const bb = this.bossi();
      const k = Math.ceil((bb.reduce((a, b) => a + Math.max(0, b.vita), 0) / bb.reduce((a, b) => a + b.vitaMax, 0)) * 26);
      this.hud.bossSeg.forEach((sg, i) => sg.setVisible(i < k));
    }
  }
}
