import { SHEETS } from './sprites';
// ============================================================================
// CONTENUTI DEL GIOCO: eroi, armi, nemici, livelli, boss.
// Qui si cambiano i numeri (vita, danni, ondate) senza toccare il motore.
// ============================================================================

export const VIEW_W = 384;
export const VIEW_H = 216;
export const GROUND_Y = 180; // linea dei piedi

// ---------------------------------------------------------------------------
// EROI (lo sprite è il foglio `hero_<id>` generato da tools/build_assets.py)
// ---------------------------------------------------------------------------
export interface HeroDef { id: string; nome: string; motto: string; arma: string }

const ELENCO_EROI: HeroDef[] = [
  { id: 'daniele', nome: 'DANIELE', motto: 'Cintura nera di pazienza', arma: 'pistola' },
  { id: 'marco', nome: 'MARCO', motto: 'Il primo ad arrivare al bar', arma: 'pistola' },
  { id: 'paolo', nome: 'PAOLO', motto: 'Sempre pronto per un altro giro', arma: 'pistola' },
  { id: 'michela', nome: 'MICHELA', motto: 'Arcobaleno con la mira', arma: 'pistola' },
  { id: 'roberto', nome: 'ROBERTO', motto: 'Muscoli prima, domande dopo', arma: 'pistola' },
  { id: 'vero', nome: 'VERO', motto: 'Corre più veloce dei guai', arma: 'pistola' },
  { id: 'mattia', nome: 'MATTIA', motto: 'Dipinge anche a colpi di pistola', arma: 'pistola' },
];
/** Eroi giocabili: solo quelli che hanno il foglio in grafica/personaggi. Un foglio nuovo con un
 *  nome non in elenco compare lo stesso, con un motto generico. */
export const HEROES: HeroDef[] = [
  ...ELENCO_EROI.filter((h) => SHEETS[`hero_${h.id}`]),
  ...Object.keys(SHEETS).filter((k) => k.startsWith('hero_') && !ELENCO_EROI.some((h) => `hero_${h.id}` === k))
    .map((k) => ({ id: k.slice(5), nome: k.slice(5).toUpperCase(), motto: 'Nuovo arrivato al Bucaneve', arma: 'pistola' })),
];
export const getHero = (id: string | null): HeroDef => HEROES.find((h) => h.id === id) ?? HEROES[0];

// ---------------------------------------------------------------------------
// ARMI
// ---------------------------------------------------------------------------
export interface WeaponDef {
  id: string; nome: string;
  danno: number; cadenza: number; velocita: number; munizioni: number;
  colpiPerSparo: number; dispersione: number; gittata: number; colore: number;
  perforante?: boolean; esplosivo?: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  pistola: { id: 'pistola', nome: 'PISTOLA', danno: 10, cadenza: 0.17, velocita: 420, munizioni: -1, colpiPerSparo: 1, dispersione: 0, gittata: 400, colore: 0xfff3a0 },
  mitragliatrice: { id: 'mitragliatrice', nome: 'MITRAGLIATRICE', danno: 8, cadenza: 0.07, velocita: 520, munizioni: 200, colpiPerSparo: 1, dispersione: 3, gittata: 440, colore: 0xffe066 },
  fucile: { id: 'fucile', nome: 'FUCILE A POMPA', danno: 14, cadenza: 0.55, velocita: 380, munizioni: 30, colpiPerSparo: 4, dispersione: 11, gittata: 160, colore: 0xffd0a0 },
  lanciarazzi: { id: 'lanciarazzi', nome: 'LANCIARAZZI', danno: 55, cadenza: 0.75, velocita: 300, munizioni: 20, colpiPerSparo: 1, dispersione: 0, gittata: 460, colore: 0xff8040, esplosivo: 42 },
  fiamma: { id: 'fiamma', nome: 'LANCIAFIAMME', danno: 5, cadenza: 0.045, velocita: 230, munizioni: 240, colpiPerSparo: 1, dispersione: 7, gittata: 110, colore: 0xff9030, perforante: true },
};

// ---------------------------------------------------------------------------
// NEMICI: due comportamenti, più fogli grafici ciascuno (scelti a caso)
// ---------------------------------------------------------------------------
export type EnemyType = 'gelataio' | 'ubriaco' | 'lanciagelati' | 'kamikaze' | 'balcone';
export interface EnemyDef {
  tipo: EnemyType; sheets: string[]; vita: number; velocita: number; danno: number; punti: number;
  /** mischia: corre addosso con la paletta · lancio: bottiglie ad arco · palline: palline di gelato tese
   *  carica: barcolla e poi si butta addosso · balcone: fermo su un balcone, tira bottiglie dall'alto */
  attacco: 'mischia' | 'lancio' | 'palline' | 'carica' | 'balcone';
  distanza: number; cadenza: number;
}
/** Altezza dei piedi dei nemici sul balcone (pixel dall'alto dello schermo). */
export const BALCONE_Y = 86;

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  gelataio: { tipo: 'gelataio', sheets: ['vil_gelataia', 'vil_gelataio1', 'vil_gelataio2'], vita: 22, velocita: 58, danno: 12, punti: 100, attacco: 'mischia', distanza: 30, cadenza: 1.1 },
  ubriaco: { tipo: 'ubriaco', sheets: ['vil_ubriaca', 'vil_ubriaco1', 'vil_ubriaco2'], vita: 30, velocita: 34, danno: 14, punti: 150, attacco: 'lancio', distanza: 130, cadenza: 2.3 },
  lanciagelati: { tipo: 'lanciagelati', sheets: ['vil_gelataio2', 'vil_gelataia'], vita: 24, velocita: 40, danno: 10, punti: 150, attacco: 'palline', distanza: 120, cadenza: 1.8 },
  kamikaze: { tipo: 'kamikaze', sheets: ['vil_ubriaco1', 'vil_ubriaco2'], vita: 26, velocita: 30, danno: 16, punti: 200, attacco: 'carica', distanza: 150, cadenza: 2.0 },
  balcone: { tipo: 'balcone', sheets: ['vil_ubriaca', 'vil_ubriaco1'], vita: 20, velocita: 0, danno: 12, punti: 300, attacco: 'balcone', distanza: 0, cadenza: 2.6 },
};

// ---------------------------------------------------------------------------
// DIFFICOLTÀ (si sceglie nella schermata dei personaggi, freccia su/giù)
// ---------------------------------------------------------------------------
export interface DiffDef { id: string; nome: string; dannoSubito: number; vitaNemici: number; vitaBoss: number; vite: number; punti: number }
export const DIFFICOLTA: DiffDef[] = [
  { id: 'facile', nome: 'FACILE', dannoSubito: 0.55, vitaNemici: 0.8, vitaBoss: 0.75, vite: 5, punti: 0.8 },
  { id: 'normale', nome: 'NORMALE', dannoSubito: 1, vitaNemici: 1, vitaBoss: 1, vite: 3, punti: 1 },
  { id: 'difficile', nome: 'DIFFICILE', dannoSubito: 1.4, vitaNemici: 1.25, vitaBoss: 1.2, vite: 2, punti: 1.3 },
];
export const getDiff = (id: string | null | undefined): DiffDef => DIFFICOLTA.find((d) => d.id === id) ?? DIFFICOLTA[1];

// ---------------------------------------------------------------------------
// LIVELLO 1: la strada (le x sono in pixel del fondale, la strada è lunga ~3350)
// Un'ondata parte quando il giocatore supera `x`. `lato` = da dove entrano.
// ---------------------------------------------------------------------------
export interface Wave { x: number; nemici: { tipo: EnemyType; lato: 'dx' | 'sx'; ritardo: number; xFisso?: number }[] }

const g = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'gelataio' as EnemyType, lato, ritardo });
const u = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'ubriaco' as EnemyType, lato, ritardo });
const l = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'lanciagelati' as EnemyType, lato, ritardo });
const k = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'kamikaze' as EnemyType, lato, ritardo });
// Nota: il tipo 'balcone' esiste ancora nel codice ma non è usato: sui fondali i balconi non sono
// sempre nello stesso punto e il nemico sembrava volare sopra le case.

export const WAVES: Wave[] = [
  { x: 120, nemici: [g('dx', 0), g('dx', 1.2)] },
  { x: 340, nemici: [u('dx', 0), g('dx', 0.8)] },
  { x: 560, nemici: [g('dx', 0), g('sx', 0.6), l('dx', 1.4)] },
  { x: 780, nemici: [u('dx', 0), l('dx', 0.8), g('dx', 2.2)] },
  { x: 1000, nemici: [g('dx', 0), k('dx', 0.5), g('sx', 1.2), l('dx', 2.0)] },
  // --- checkpoint a metà strada (vedi CHECKPOINT_ONDA)
  { x: 1240, nemici: [u('dx', 0), l('dx', 0.6), g('dx', 1.6), u('sx', 2.4)] },
  { x: 1480, nemici: [g('dx', 0), l('dx', 0.4), k('dx', 1.2), u('dx', 1.8)] },
  { x: 1720, nemici: [u('dx', 0), g('dx', 0.5), g('sx', 1.4), k('dx', 2.0), l('dx', 2.6)] },
  { x: 1940, nemici: [g('dx', 0), u('dx', 0.6), k('dx', 1.2), g('sx', 1.8), l('dx', 2.2)] },
];
/** Indice dell'ondata da cui si riparte con il CONTINUE se si è superata metà strada. */
export const CHECKPOINT_ONDA = 5;

export const PICKUPS: { x: number; arma: string }[] = [
  { x: 450, arma: 'mitragliatrice' },
  { x: 900, arma: 'fucile' },
  { x: 1360, arma: 'lanciarazzi' },
  { x: 1840, arma: 'mitragliatrice' },
  { x: 2080, arma: 'fiamma' },
];

// ---------------------------------------------------------------------------
// OGGETTI SCENICI (foglio "oggetti"). `rompe`: si distrugge sparando.
//   legno/vetro = va in pezzi e a volte lascia un premio · esplode = esplosione (fa male anche a voi!)
// Le giunzioni tra i pezzi di fondale sono a x ~ 680, 1346, 2012, 2678: lì mettiamo oggetti grossi.
// ---------------------------------------------------------------------------
export type Rottura = 'legno' | 'vetro' | 'esplode';
export interface PropPos { nome: string; x: number; rompe?: Rottura; vita?: number; dy?: number }
export const PROPS_STRADA: PropPos[] = [
  { nome: 'cono', x: 110 }, { nome: 'transenna', x: 260 }, { nome: 'cassa_vino', x: 330, rompe: 'vetro', vita: 20 },
  { nome: 'sedia', x: 625 }, { nome: 'ombrellone', x: 652 }, { nome: 'tavolo', x: 678 },
  { nome: 'fusto_rosso', x: 760, rompe: 'esplode', vita: 30 }, { nome: 'pianta', x: 930 }, { nome: 'casse_rosse', x: 1060, rompe: 'vetro', vita: 20 },
  { nome: 'carretto', x: 1164 }, { nome: 'botte', x: 1290, rompe: 'legno', vita: 35 }, { nome: 'gomme', x: 1420 },
  { nome: 'bombole', x: 1530, rompe: 'esplode', vita: 30 }, { nome: 'cassonetto', x: 1615 }, { nome: 'cestino', x: 1650 },
  { nome: 'scatoloni', x: 1780, rompe: 'legno', vita: 15 }, { nome: 'fusto_rosso', x: 1900, rompe: 'esplode', vita: 30 },
  { nome: 'sacchi_rifiuti', x: 2010 }, { nome: 'pianta', x: 2121 }, { nome: 'ombrellone', x: 2250 }, { nome: 'tavolo', x: 2278 },
  { nome: 'vetrina_gelati', x: 2690 },
];
export const PROPS_CANTINA: PropPos[] = [
  { nome: 'botti_pila', x: 34 }, { nome: 'casse_rosse', x: 120, rompe: 'vetro', vita: 20 },
  { nome: 'fusto', x: 300, rompe: 'esplode', vita: 30 }, { nome: 'fusti_pallet', x: 505 },
];

// ---------------------------------------------------------------------------
// BOSS
// ---------------------------------------------------------------------------
export const GIOVA = { nome: 'GIOVA', sottotitolo: 'IL BUTTAFUORI DEL BUCANEVE', vita: 600, danno: 18, punti: 2000 };
export const ETTORE = { nome: 'ETTORE', sottotitolo: 'IL BARISTA CON LA DOPPIETTA', vita: 1500, danno: 16, punti: 5000 };

export const FRASI_ETTORE = ['VEI CHI CHE TE MATO!', 'CHI HA TOCCATO IL MIO GELATO?', 'QUI SI PAGA PRIMA!', 'ADESSO TI SISTEMO IO!'];
export const FRASI_GIOVA = ['STASERA NON SI ENTRA.', 'LISTA CHIUSA!', 'NON SEI IN LISTA, AMICO.'];
