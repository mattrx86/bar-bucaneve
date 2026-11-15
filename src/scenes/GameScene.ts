// ============================================================================
// Scena di gioco. Due fasi:
//  - 'strada': la via di Ponte Arche con le ondate, poi Giova davanti al bar;
//  - 'cantina': la cantina del Bucaneve con Ettore.
// Lo stato del giocatore (punti, vite, arma) passa da una fase all'altra.
// ============================================================================
import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, GROUND_Y, WAVES, PICKUPS, ENEMIES, EnemyType, WEAPONS, getHero, HeroDef,
  DiffDef, getDiff, PROPS_STRADA, PROPS_CANTINA, PropPos, Rottura, CHECKPOINT_ONDA,
} from '../content/defs';
import { PROPS, FX } from '../content/extra';
import { img, fxTex } from '../core/fx';
import { BG, SHEETS } from '../content/sprites';
import { Bullet, BulletOpts, Enemy, Player, World, BossBase, Giova, Ettore } from '../entities';

interface Prop { s: Phaser.GameObjects.Image; def: PropPos; vita: number; rompe: Rottura }
import { Controls } from '../core/controls';
import { sfx, setMuted, isMuted, voce, musica } from '../core/audio';
import { loadSave, writeSave } from '../core/save';
import { txt, zoomCamera, PixelText } from '../core/ui';
import type { Risultato } from './ResultScene';

export interface Stato { punti: number; vite: number; tempo: number; arma: string; munizioni: number; bombe: number; crediti: number; checkpoint?: 'meta' | 'giova' }
interface Dati { fase: 'strada' | 'cantina'; stato: Stato | null }

export class GameScene extends Phaser.Scene implements World {
  get sc(): Phaser.Scene { return this; }
  giocatore!: Player;
  nemici: Enemy[] = [];
  private proiettili: Bullet[] = [];
  private casse: { s: Phaser.GameObjects.Image; arma: string }[] = [];
  private boss: BossBase | null = null;
  private ctrl!: Controls;
  private hero!: HeroDef;
  private fase: 'strada' | 'cantina' = 'strada';
  private larghezza = 0;
  private camX = 0;
  private bloccoDx = Infinity;   // la camera non va oltre (ondata in corso)
  private arena: { x: number } | null = null;
  private onda = 0;
  private ondaViva: Enemy[] = [];
  private st: Stato = { punti: 0, vite: 3, tempo: 0, arma: 'pistola', munizioni: -1, bombe: 10, crediti: 0 };
  private pausa = false;
  private finito = false;
  private uscita = false;
  private rinascitaT = -1;
  private hud!: {
    vita: Phaser.GameObjects.Image[]; vite: PixelText; punti: PixelText;
    armi: PixelText; bombe: PixelText; armaNome: PixelText; icona: Phaser.GameObjects.Image; tempo: PixelText; combo: PixelText;
    boss: Phaser.GameObjects.Container; bossSeg: Phaser.GameObjects.Image[]; pausa: PixelText; go: Phaser.GameObjects.Container;
  };
  diff!: DiffDef;
  private congelato = 0;
  private stopCd = 0; // pausa minima tra due micro-pause piccole (raffiche di mitra / lanciafiamme)
  private combo = 0; private comboT = 0;
  private colpitoNelBoss = false;
  private props: Prop[] = [];
  private premi: { s: Phaser.GameObjects.Image; tipo: 'bombe' | 'gelato' }[] = [];
  private continua: { c: Phaser.GameObjects.Container; t: PixelText; n: number; acc: number; aperto: number } | null = null;

  constructor() { super('Game'); }

  init(d: Dati): void {
    this.fase = d?.fase ?? 'strada';
    this.diff = getDiff(loadSave().diff);
    this.st = d?.stato ? { ...d.stato } : { punti: 0, vite: this.diff.vite, tempo: 0, arma: 'pistola', munizioni: -1, bombe: 10, crediti: 0 };
    this.congelato = 0; this.stopCd = 0; this.combo = 0; this.comboT = 0; this.colpitoNelBoss = false; this.props = []; this.premi = []; this.continua = null;
    this.nemici = []; this.proiettili = []; this.casse = []; this.boss = null; this.arena = null;
    this.onda = 0; this.ondaViva = []; this.pausa = false; this.finito = false; this.uscita = false;
    this.camX = 0; this.bloccoDx = Infinity; this.rinascitaT = -1; this.giovaArrivato = false; this.ondaPronta = true;
    this.time.paused = false; // il Clock conserva `paused` anche dopo scene.restart
  }

  create(): void {
    zoomCamera(this);
    this.hero = getHero(loadSave().charId);
    const pezzi = this.fase === 'strada' ? BG.street.parts : BG.cellar.parts;
    this.larghezza = this.fase === 'strada' ? BG.street.w : BG.cellar.w;
    const dens = this.fase === 'strada' ? BG.street.d : BG.cellar.d;
    pezzi.forEach((_, i) => this.add.image(i * 512, 0, `bg_${this.fase === 'strada' ? 'street' : 'cellar'}_${i}`).setOrigin(0).setDepth(0).setScale(1 / dens));

    if (this.fase === 'strada') {
      // insegna del bar (ChatGPT non scrive bene le lettere: la mettiamo noi)
      const cx = BG.street.barX + BG.street.barW / 2;
      this.add.rectangle(cx, 101, 104, 15, 0x2a1408).setStrokeStyle(1, 0xd8a040).setDepth(2);
      txt(this, cx, 101, 'BAR BUCANEVE', 9, '#ffe066', 2).setOrigin(0.5).setDepth(3);
      for (const p of PICKUPS) this.casse.push({ s: img(this, p.x, GROUND_Y, `cassa_${p.arma}`, 'cassa').setOrigin(0.5, 1).setDepth(40), arma: p.arma });
    }

    for (const pp of this.fase === 'strada' ? PROPS_STRADA : PROPS_CANTINA) {
      const d = PROPS[pp.nome]; if (!d) continue;
      const im = this.add.image(pp.x, GROUND_Y + 2 + (pp.dy ?? 0), `prop_${pp.nome}`).setOrigin(0.5, 1).setDepth(30).setScale(1 / d.d);
      if (pp.rompe) this.props.push({ s: im, def: pp, vita: pp.vita ?? 20, rompe: pp.rompe });
    }

    this.giocatore = new Player(this, this.hero, 60);
    const p = this.giocatore;
    p.prendiArma(this.st.arma); if (this.st.munizioni !== -1 || p.arma.munizioni !== -1) p.munizioni = this.st.munizioni;
    p.bombe = this.st.bombe;

    // ripartenza da un checkpoint (dopo un CONTINUE)
    if (this.fase === 'strada' && this.st.checkpoint) {
      const arenaX = Math.round(BG.street.barX + (BG.street.barW - VIEW_W) / 2);
      if (this.st.checkpoint === 'giova') { this.onda = WAVES.length; p.x = arenaX + 30; this.camX = arenaX - 60; }
      else { this.onda = CHECKPOINT_ONDA; p.x = WAVES[CHECKPOINT_ONDA].x - 110; this.camX = Math.max(0, p.x - 150); }
      for (const c of this.casse) if (c.s.x < p.x) c.s.destroy();
    }

    this.ctrl = new Controls(this);
    this.creaHud();
    this.cameras.main.fadeIn(400);

    if (this.fase === 'strada') {
      musica('strada');
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
      const p = this.giocatore;
      const linea = new Phaser.Geom.Line(p.x, o.y, o.x, o.y);
      const bersagli: { box: Phaser.Geom.Rectangle; colpisci: () => void }[] = [];
      for (const e of this.nemici) if (!e.morto) bersagli.push({ box: e.box(), colpisci: () => e.danno(o.danno, Math.sign(o.x - p.x)) });
      const b = this.boss;
      if (b && !b.morto && b.attivo) bersagli.push({ box: b.box(), colpisci: () => b.danno(o.danno) });
      const t = bersagli.find((q) => Phaser.Geom.Intersects.LineToRectangle(linea, q.box));
      if (t) {
        if (o.esplosivo) { this.boom(o.x, o.y, true); t.colpisci(); } else { t.colpisci(); this.scintilla(o.x, o.y); }
        if (!o.perforante) return;
      }
    }
    this.proiettili.push(new Bullet(this, o));
  }
  punti(n: number, x?: number, y?: number): void {
    this.st.punti += n;
    if (x !== undefined && y !== undefined) this.testo(x, y, `+${n}`, '#ffe066');
  }
  testo(x: number, y: number, s: string, color = '#ffffff'): void {
    const t = txt(this, x, y, s, 9, color).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 1100, delay: 300, onComplete: () => t.destroy() });
  }
  scuoti(ms: number, amt: number): void { this.cameras.main.shake(ms, amt); }
  boom(x: number, y: number, grande: boolean): void {
    // esplosione disegnata (8 fotogrammi) se c'è, altrimenti quella del codice
    const dis = !!FX.boom_0;
    const k = grande ? 1.25 : 0.7;
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
    sfx('boom'); if (grande) this.scuoti(160, 0.01);
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
  uccisione(base: number, x: number, y: number, mischia: boolean): void {
    this.combo++; this.comboT = 2.4;
    const molt = Math.min(5, 1 + Math.floor((this.combo - 1) / 2));
    const n = Math.round((base * molt + (mischia ? 50 : 0)) * this.diff.punti);
    this.punti(n, x, y);
    if (molt > 1) { this.hud.combo.setText(`COMBO X${molt}`).setVisible(true).setAlpha(1); }
    if (Phaser.Math.Between(0, 99) < 6) voce('gelataio_pepite', 8, 0.9);
  }
  giocatoreColpito(): void { this.colpitoNelBoss = true; }
  bossVicino(x: number, y: number): boolean {
    const b = this.boss;
    return !!b && !b.morto && b.attivo && Math.abs(b.x - x) < 34 && Math.abs(b.y - y) < 30;
  }
  colpoMischia(area: Phaser.Geom.Rectangle, danno: number): void {
    if (this.boss && !this.boss.morto && Phaser.Geom.Intersects.RectangleToRectangle(area, this.boss.box())) this.boss.danno(Math.round(danno * 0.5));
  }

  // ------------------------------------------------------------------ ciclo
  update(_t: number, dms: number): void {
    const dt = Math.min(dms / 1000, 1 / 30);
    // micro-pausa sui colpi: prima di leggere i comandi, così le pressioni (salto, bomba) non vanno perse
    if (this.congelato > 0 && !this.pausa && !this.continua) { this.congelato -= dms / 1000; return; }
    const inp = this.ctrl.leggi();
    if (inp.pausaTap && !this.finito && !this.uscita) {
      this.pausa = !this.pausa; this.hud.pausa.setVisible(this.pausa);
      // ferma anche timer (ondate, arrivo dei boss) e animazioni, non solo l'update
      this.time.paused = this.pausa;
      if (this.pausa) this.tweens.pauseAll(); else this.tweens.resumeAll();
    }
    if (this.pausa) {
      if (inp.bombaTap) { setMuted(!isMuted()); writeSave({ muted: isMuted() }); }
      this.ctrl.flush(); return;
    }
    if (this.continua) { this.aggiornaContinua(dt, inp); this.ctrl.flush(); return; }
    this.stopCd = Math.max(0, this.stopCd - dt);
    if (!this.finito) this.st.tempo += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; this.hud.combo.setVisible(false); } }

    const p = this.giocatore;
    p.update(dt, this.uscita || this.finito ? { sx: false, dx: this.uscita, su: false, giu: false, fuoco: false, saltoTap: false, bombaTap: false, meleeTap: false } : inp);
    this.aggiornaCamera(dt);
    if (this.fase === 'strada') this.aggiornaStrada();
    for (const e of this.nemici) e.update(dt);
    this.boss?.update(dt);
    this.aggiornaProiettili(dt);
    this.aggiornaCasse();
    this.aggiornaPremi();
    this.pulisci();
    this.gestisciMorte(dt);
    this.aggiornaHud();
    this.ctrl.flush();
  }

  private aggiornaCamera(dt: number): void {
    const p = this.giocatore;
    if (this.arena) {
      this.camX = Phaser.Math.Linear(this.camX, this.arena.x, Math.min(1, dt * 4));
      if (Math.abs(this.camX - this.arena.x) < 0.5) this.camX = this.arena.x;
    } else {
      const voluto = Math.min(p.x - 150, this.bloccoDx - VIEW_W);
      if (voluto > this.camX) this.camX = voluto; // si va solo avanti, come in Metal Slug
    }
    this.camX = Phaser.Math.Clamp(this.camX, 0, this.larghezza - VIEW_W);
    this.cameras.main.setScroll(Math.round(this.camX), 0);
  }

  private aggiornaStrada(): void {
    const p = this.giocatore;
    // ondate
    if (this.onda < WAVES.length && p.x > WAVES[this.onda].x) {
      if (this.onda === CHECKPOINT_ONDA && this.st.checkpoint !== 'giova') { this.st.checkpoint = 'meta'; this.annuncio('CHECKPOINT!', 'SE PERDETE RIPARTITE DA QUI'); }
      const w = WAVES[this.onda++];
      this.bloccoDx = this.camX + VIEW_W + 40;
      for (const n of w.nemici) {
        this.time.delayedCall(n.ritardo * 1000, () => {
          const x = n.xFisso ?? (n.lato === 'dx' ? this.camX + VIEW_W + 24 : this.camX - 24);
          const e = this.spawn(n.tipo, x);
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
      this.bloccoDx = Infinity; this.mostraGo();
    }
    // arena di Giova davanti al bar
    const arenaX = Math.round(BG.street.barX + (BG.street.barW - VIEW_W) / 2);
    if (!this.arena && !this.giovaArrivato && this.onda >= WAVES.length && this.bloccoDx === Infinity && p.x > arenaX + 90) {
      this.arena = { x: arenaX }; this.giovaArrivato = true; this.st.checkpoint = 'giova';
      this.time.delayedCall(700, () => {
        this.boss = new Giova(this, arenaX + VIEW_W + 40);
        this.colpitoNelBoss = false;
        this.boss.onMorte = () => this.bonusPerfetto();
        this.mostraBossHud();
        this.annuncio('GIOVA', 'IL BUTTAFUORI DEL BUCANEVE');
      });
    }
    // Giova battuto: si entra nel bar
    if (this.boss && this.boss.morto && this.boss.mortoT > 1.6 && !this.uscita) {
      this.hud.boss.setVisible(false);
      if (!this.hud.go.visible) { this.mostraGo('ENTRA NEL BAR'); }
      this.arena = null; this.bloccoDx = Infinity;
      if (p.x > this.larghezza - 30) {
        this.uscita = true;
        this.cameras.main.fadeOut(600);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ fase: 'cantina', stato: this.statoGiocatore() }));
      }
    }
  }
  private ondaPronta = true;
  private giovaArrivato = false;

  private spawn(tipo: EnemyType, x: number): Enemy {
    const def = ENEMIES[tipo];
    const e = new Enemy(this, def, Phaser.Utils.Array.GetRandom(def.sheets), x);
    this.nemici.push(e);
    return e;
  }

  private aggiornaProiettili(dt: number): void {
    const p = this.giocatore;
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
        if (!p.morto && p.box().contains(x, y)) {
          p.danno(b.o.danno); b.morto = true;
          if (b.o.tex === 'bottiglia') this.cocci(x, y);
        }
        continue;
      }
      for (const pr of this.props) {
        if (pr.vita <= 0 || !pr.s.getBounds().contains(x, y)) continue;
        if (b.o.esplosivo) { b.morto = true; break; }
        this.dannoProp(pr, b.o.danno); if (!b.o.perforante) { b.morto = true; break; }
      }
      if (b.morto) { if (b.o.esplosivo) this.esplodi(b); continue; }
      for (const e of this.nemici) {
        if (e.morto || b.colpiti.has(e) || !e.box().contains(x, y)) continue;
        if (b.o.esplosivo) { b.morto = true; break; }
        e.danno(b.o.danno, Math.sign(b.vx)); b.colpiti.add(e);
        if (!b.o.perforante) { b.morto = true; break; }
      }
      if (!b.morto && this.boss && !this.boss.morto && this.boss.attivo && !b.colpiti.has(this.boss) && this.boss.box().contains(x, y)) {
        if (b.o.esplosivo) b.morto = true;
        else { this.boss.danno(b.o.danno); b.colpiti.add(this.boss); if (!b.o.perforante) b.morto = true; }
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
    for (const e of this.nemici) if (!e.morto && Math.hypot(e.x - x, e.y - 24 - y) < r + 14) e.danno(b.o.danno, Math.sign(e.x - x));
    if (this.boss && !this.boss.morto && Math.abs(this.boss.x - x) < r + 30) this.boss.danno(b.o.danno);
    for (const pr of this.props) if (pr.vita > 0 && Math.abs(pr.s.x - x) < r + 10) this.dannoProp(pr, 99);
  }

  // ------------------------------------------------------------------ oggetti distruttibili
  private dannoProp(pr: Prop, n: number): void {
    if (pr.vita <= 0 || !pr.s.active) return; // già distrutto (es. due esplosioni vicine in catena)
    pr.vita -= n;
    pr.s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(50, () => pr.s.active && pr.s.setTintMode(Phaser.TintModes.MULTIPLY));
    if (pr.vita > 0) { sfx('nemicoColpito'); return; }
    const x = pr.s.x, y = pr.s.y - pr.s.height / 2;
    this.punti(Math.round(50 * this.diff.punti), x, y - 10);
    if (pr.rompe === 'esplode') {
      this.boom(x, y, true);
      for (const e of this.nemici) if (!e.morto && Math.abs(e.x - x) < 50) e.danno(80, Math.sign(e.x - x));
      if (this.boss && !this.boss.morto && Math.abs(this.boss.x - x) < 60) this.boss.danno(60);
      const p = this.giocatore; if (!p.morto && Math.abs(p.x - x) < 34) p.danno(15);
      for (const q of this.props) if (q !== pr && q.vita > 0 && Math.abs(q.s.x - x) < 60) this.time.delayedCall(150, () => this.dannoProp(q, 99));
    } else {
      sfx('nemicoMorto');
      const tex = pr.rompe === 'vetro' ? 'px' : 'scheggia';
      for (let i = 0; i < 9; i++) {
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
    const p = this.giocatore;
    for (const q of this.premi) {
      if (!q.s.active || p.morto || Math.abs(q.s.x - p.x) > 12 || p.y < GROUND_Y - 20) continue;
      sfx('raccolta');
      if (q.tipo === 'bombe') { p.bombe += 5; this.testo(p.x, p.y - 62, 'BOMBE +5', '#80ff80'); }
      else { p.vita = Math.min(p.vitaMax, p.vita + 30); this.testo(p.x, p.y - 62, 'GELATO! +VITA', '#80ff80'); }
      q.s.destroy();
    }
    this.premi = this.premi.filter((q) => q.s.active);
  }
  private scintilla(x: number, y: number): void {
    if (FX.scintille_1) {
      const s = img(this, x, y, Math.random() < 0.5 ? 'scintille_1' : 'scintille_2', 'flame', 0.6).setDepth(65).setAngle(Phaser.Math.Between(0, 359));
      this.tweens.add({ targets: s, alpha: 0, duration: 140, onComplete: () => s.destroy() });
      return;
    }
    const s = this.add.image(x, y, 'flame').setTint(0xfff0a0).setScale(0.5).setDepth(65);
    this.tweens.add({ targets: s, alpha: 0, scale: 0.1, duration: 120, onComplete: () => s.destroy() });
  }
  private cocci(x: number, y: number): void {
    sfx('nemicoColpito');
    for (let i = 0; i < 5; i++) {
      const s = this.add.image(x, Math.min(y, GROUND_Y - 2), 'px').setTint(i % 2 ? 0x4f8a3a : 0xc8e0a0).setScale(2).setDepth(62);
      this.tweens.add({ targets: s, x: x + Phaser.Math.Between(-14, 14), y: s.y - Phaser.Math.Between(4, 14), alpha: 0, duration: 380, onComplete: () => s.destroy() });
    }
  }

  private aggiornaCasse(): void {
    const p = this.giocatore;
    for (const c of this.casse) {
      if (!c.s.active || p.morto) continue;
      if (Math.abs(c.s.x - p.x) < 14 && p.y > GROUND_Y - 20) {
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
    const p = this.giocatore;
    // a partita finita (vittoria o game over già deciso) niente più rinascite né vite perse
    if (p.morto && this.rinascitaT < 0 && !this.finito) this.rinascitaT = 1.6;
    if (this.rinascitaT >= 0 && !this.finito) {
      this.rinascitaT -= dt;
      if (this.rinascitaT < 0) {
        this.st.vite--;
        if (this.st.vite <= 0) this.apriContinua();
        else { p.rinasci(this.camX + 70); this.testo(p.x, GROUND_Y - 80, 'FORZA!', '#80ff80'); }
      }
    }
    // vittoria finale
    if (this.fase === 'cantina' && this.boss?.morto && !this.finito && this.boss.mortoT > 1.2) {
      p.vince = true; this.finito = true; this.hud.boss.setVisible(false);
      const bonus = Math.max(0, Math.round(3000 - this.st.tempo * 10)) + this.st.vite * 1000;
      this.punti(bonus);
      this.annuncio('MISSIONE COMPIUTA!', `BONUS ${bonus}`);
      this.time.delayedCall(3200, () => this.fine(true));
    }
  }

  private fine(vittoria: boolean): void {
    this.finito = true;
    const r: Risultato = { vittoria, punti: this.st.punti, tempo: this.st.tempo, nome: this.hero.nome };
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Result', r));
  }

  private statoGiocatore(): Stato {
    const p = this.giocatore;
    return { ...this.st, arma: p.arma.id, munizioni: p.munizioni, bombe: p.bombe };
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
      e.onFase2 = () => {
        // a metà vita chiama rinforzi
        this.time.delayedCall(400, () => { this.spawn('gelataio', this.camX - 20); this.spawn('gelataio', this.camX + VIEW_W + 20); });
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
    this.time.delayedCall(900, () => { this.punti(n); this.annuncio('PERFETTO!', `NESSUN COLPO SUBITO +${n}`, 44); });
  }

  // ------------------------------------------------------------------ continue (come in sala giochi)
  private apriContinua(): void {
    this.finito = true;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(210);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.6).setOrigin(0));
    c.add(txt(this, VIEW_W / 2, 64, 'CONTINUE?', 22, '#ffe066').setOrigin(0.5));
    const t = txt(this, VIEW_W / 2, 104, '9', 28, '#ff6060').setOrigin(0.5);
    c.add(t);
    c.add(txt(this, VIEW_W / 2, 150, this.fase === 'cantina' ? 'INVIO: RIPARTI DALLA CANTINA' : 'INVIO: RIPARTI DALLA STRADA', 9).setOrigin(0.5));
    c.add(txt(this, VIEW_W / 2, 164, 'I PUNTI RESTANO, SI RIPARTE CON LA PISTOLA', 8, '#c8d0e0').setOrigin(0.5));
    this.continua = { c, t, n: 9, acc: 0, aperto: 0 };
    sfx('allarme');
  }
  private aggiornaContinua(dt: number, inp: { confermaTap: boolean; fuoco: boolean; saltoTap: boolean }): void {
    const k = this.continua!; k.acc += dt; k.aperto += dt;
    // mezzo secondo di attesa: chi stava martellando il tasto di fuoco (J) non continua per sbaglio
    if (inp.confermaTap && k.aperto > 0.5) {
      this.st.crediti++;
      const stato: Stato = { ...this.st, vite: this.diff.vite, arma: 'pistola', munizioni: -1, bombe: 10 };
      this.continua = null;
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ fase: this.fase, stato }));
      return;
    }
    if (k.acc >= 1) {
      k.acc -= 1; k.n--; sfx('menu');
      if (k.n < 0) { this.continua = null; this.fine(false); return; }
      k.t.setText(String(k.n));
    }
  }

  // ------------------------------------------------------------------ HUD (in stile Metal Slug)
  private creaHud(): void {
    const D = 100;
    const fix = <T extends Phaser.GameObjects.GameObject & { setScrollFactor: (n: number) => T; setDepth: (n: number) => T }>(o: T): T => o.setScrollFactor(0).setDepth(D);
    // fascia scura dietro l'HUD: i numeri restano leggibili anche sulle facciate chiare
    fix(this.add.rectangle(0, 0, VIEW_W, 34, 0x000000, 0.45).setOrigin(0));
    // sinistra: punteggio, barra della vita, vite
    const punti = fix(txt(this, 106, 2, '0', 10, '#ffffff').setOrigin(1, 0));
    fix(this.add.rectangle(4, 12, 103, 8, 0x0a0c18).setOrigin(0).setStrokeStyle(1, 0x7890c0));
    const vita = [] as Phaser.GameObjects.Image[];
    for (let i = 0; i < 20; i++) vita.push(fix(this.add.image(6 + i * 5, 13, 'seg').setOrigin(0)));
    const vite = fix(txt(this, 4, 22, '1UP=3', 9, '#ffe066'));
    // riquadro ARMS / BOMB
    fix(this.add.rectangle(112, 2, 70, 22, 0x0a0c18, 0.75).setOrigin(0).setStrokeStyle(1, 0x7890c0));
    fix(txt(this, 115, 4, 'ARMS', 8, '#80d0ff'));
    fix(txt(this, 150, 4, 'BOMB', 8, '#80d0ff'));
    const armi = fix(txt(this, 128, 13, '∞', 9, '#ffe066').setOrigin(0.5, 0));
    const bombe = fix(txt(this, 162, 13, '10', 9, '#ffe066').setOrigin(0.5, 0));
    const icona = fix(img(this, 113, 26, 'icona_pistola', 'px').setOrigin(0, 0));
    if (FX.icona_bomba) fix(img(this, 175, 13, 'icona_bomba', 'px', 0.6).setOrigin(0.5, 0));
    const armaNome = fix(txt(this, FX.icona_pistola ? 133 : 113, 28, '', 8, '#c0ffc0'));
    // centro: tempo grande
    const tempo = fix(txt(this, VIEW_W / 2 + 20, 2, '0:00', 16, '#ffe066').setOrigin(0.5, 0));
    const combo = fix(txt(this, VIEW_W / 2 + 20, 24, '', 9, '#ff6060').setOrigin(0.5, 0).setVisible(false));
    // destra: ritratto e nome
    fix(this.add.rectangle(VIEW_W - 34, 2, 30, 30, 0x0a0c18).setOrigin(0).setStrokeStyle(1, 0xffe066));
    const sh = SHEETS[`hero_${this.hero.id}`];
    const ritr = fix(this.add.sprite(VIEW_W - 19, 0, `sh_hero_${this.hero.id}`, sh.frames.indexOf('idle')).setOrigin(0.5, 0));
    const top = Math.max(0, sh.foot - 56 * sh.d);
    ritr.setScale(1 / sh.d).setCrop(sh.cw / 2 - 14 * sh.d, top, 28 * sh.d, 29 * sh.d); ritr.y = 3 - top / sh.d;
    fix(txt(this, VIEW_W - 37, 4, this.hero.nome, 8, '#ffffff').setOrigin(1, 0));
    fix(txt(this, VIEW_W - 37, 14, this.diff.nome, 8, '#c8d0e0').setOrigin(1, 0));
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
    this.hud = { vita, vite, punti, armi, bombe, armaNome, icona, tempo, combo, boss, bossSeg, pausa, go };
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
  }
  private annuncio(a: string, b: string, dy = 0): void {
    const t1 = txt(this, VIEW_W / 2, 64 + dy, a, 16, '#ffe066').setOrigin(0.5).setScrollFactor(0).setDepth(150);
    const t2 = txt(this, VIEW_W / 2, 86 + dy, b, 9).setOrigin(0.5).setScrollFactor(0).setDepth(150);
    this.tweens.add({ targets: [t1, t2], alpha: 0, delay: 2000, duration: 500, onComplete: () => { t1.destroy(); t2.destroy(); } });
  }
  private aggiornaHud(): void {
    const p = this.giocatore;
    const n = Math.ceil((Math.max(0, p.vita) / p.vitaMax) * 20);
    this.hud.vita.forEach((sg, i) => sg.setTexture(i < n ? 'seg' : 'seg_vuoto'));
    this.hud.vite.setText(`1UP=${Math.max(0, this.st.vite)}`);
    this.hud.punti.setText(String(this.st.punti));
    this.hud.armi.setText(p.munizioni < 0 ? '∞' : String(p.munizioni));
    this.hud.bombe.setText(String(p.bombe));
    this.hud.armaNome.setText(p.arma.id === 'pistola' ? '' : p.arma.nome);
    const ic = fxTex(`icona_${p.arma.id}`, 'px');
    if (this.hud.icona.texture.key !== ic.key) this.hud.icona.setTexture(ic.key).setScale(ic.s);
    this.hud.icona.setVisible(!!FX[`icona_${p.arma.id}`]);
    const m = Math.floor(this.st.tempo / 60), sec = Math.floor(this.st.tempo % 60);
    this.hud.tempo.setText(`${m}:${String(sec).padStart(2, '0')}`);
    if (this.boss) {
      const k = Math.ceil((this.boss.vita / this.boss.vitaMax) * 26);
      this.hud.bossSeg.forEach((sg, i) => sg.setVisible(i < k));
    }
  }
}
