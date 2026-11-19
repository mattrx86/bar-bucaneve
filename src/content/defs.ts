import { SHEETS } from './sprites';
// ============================================================================
// CONTENUTI DEL GIOCO: eroi, armi, nemici, livelli, boss.
// Qui si cambiano i numeri (vita, danni, ondate) senza toccare il motore.
// ============================================================================

export const VIEW_W = 384;
export const VIEW_H = 216;
export const GROUND_Y = 180; // linea dei piedi
/** Il gioco ragiona in 384x216 ma disegna a 3x (1152x648): così si vedono i dettagli dei disegni. */
export const ZOOM = 3;
/** Densità dei disegni: 1 pixel d'arte = 1/1.5 px di gioco = 2 px a schermo. */
export const DENSITA = 1.5;
/** Aggancia una coordinata alla griglia dei pixel d'arte (1/1,5 px di gioco).
 *  Serve a non far "vibrare" i disegni: arrotondando al pixel di gioco intero la griglia
 *  dell'arte cadeva ora su pixel pari ora su dispari dello schermo e i bordi sfarfallavano. */
export const pix = (v: number): number => Math.round(v * DENSITA) / DENSITA;

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

// Cadenze e velocità ritoccate il 19/11: la vita dei nemici resta quella di prima
// (il livello era troppo facile perché attaccavano di rado, non perché morivano in fretta).
// Il gelataio correva a 68 px/s contro i 112 del giocatore: bastava tenere premuto
// "destra" per non essere mai raggiunti. Ora tallona senza poter sorpassare.
export const ENEMIES: Record<EnemyType, EnemyDef> = {
  gelataio: { tipo: 'gelataio', sheets: ['vil_gelataia', 'vil_gelataio1', 'vil_gelataio2'], vita: 22, velocita: 86, danno: 12, punti: 100, attacco: 'mischia', distanza: 30, cadenza: 0.8 },
  ubriaco: { tipo: 'ubriaco', sheets: ['vil_ubriaca', 'vil_ubriaco1', 'vil_ubriaco2'], vita: 30, velocita: 40, danno: 14, punti: 150, attacco: 'lancio', distanza: 130, cadenza: 1.6 },
  lanciagelati: { tipo: 'lanciagelati', sheets: ['vil_gelataio2', 'vil_gelataia'], vita: 24, velocita: 52, danno: 10, punti: 150, attacco: 'palline', distanza: 120, cadenza: 1.25 },
  kamikaze: { tipo: 'kamikaze', sheets: ['vil_ubriaco1', 'vil_ubriaco2'], vita: 26, velocita: 48, danno: 16, punti: 200, attacco: 'carica', distanza: 150, cadenza: 1.5 },
  balcone: { tipo: 'balcone', sheets: ['vil_ubriaca', 'vil_ubriaco1'], vita: 20, velocita: 0, danno: 12, punti: 300, attacco: 'balcone', distanza: 0, cadenza: 2.6 },
};

// ---------------------------------------------------------------------------
// DIFFICOLTÀ (si sceglie nella schermata dei personaggi, freccia su/giù)
// ---------------------------------------------------------------------------
/** `aggressivita` moltiplica la cadenza d'attacco delle ondate: è la manopola per
 *  rendere il livello più o meno incalzante senza toccare vita e danni. */
export interface DiffDef { id: string; nome: string; dannoSubito: number; vitaNemici: number; vitaBoss: number; vite: number; punti: number; aggressivita: number }
export const DIFFICOLTA: DiffDef[] = [
  { id: 'facile', nome: 'FACILE', dannoSubito: 0.5, vitaNemici: 0.75, vitaBoss: 0.75, vite: 5, punti: 0.8, aggressivita: 0.72 },
  { id: 'normale', nome: 'NORMALE', dannoSubito: 1, vitaNemici: 1, vitaBoss: 1, vite: 3, punti: 1, aggressivita: 1 },
  { id: 'difficile', nome: 'DIFFICILE', dannoSubito: 1.4, vitaNemici: 1.25, vitaBoss: 1.2, vite: 2, punti: 1.3, aggressivita: 1.2 },
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

/** Ondate del 19/11: più nemici, ritardi più corti e più ingressi da sinistra, così si è
 *  presi in mezzo invece di sparare solo verso destra. `fretta` accelera gli attacchi
 *  dell'intera ondata (1 = cadenza normale): è la progressione di difficoltà del livello. */
export const WAVES: (Wave & { fretta?: number })[] = [
  // apertura morbida: si impara a sparare
  { x: 134, nemici: [g('dx', 0), g('dx', 1.0)] },
  { x: 380, nemici: [u('dx', 0), g('dx', 0.7), g('sx', 1.6)] },
  { x: 626, nemici: [g('dx', 0), g('sx', 0.5), l('dx', 1.1), g('dx', 2.0)], fretta: 1.05 },
  { x: 871, nemici: [u('dx', 0), l('dx', 0.6), g('dx', 1.3), g('sx', 2.0)], fretta: 1.1 },
  { x: 1117, nemici: [g('dx', 0), k('dx', 0.4), g('sx', 1.0), l('dx', 1.6), g('dx', 2.3)], fretta: 1.15 },
  // --- checkpoint a metà strada (vedi CHECKPOINT_ONDA): da qui si stringe
  { x: 1386, nemici: [u('dx', 0), l('dx', 0.5), g('dx', 1.0), u('sx', 1.7), g('dx', 2.4)], fretta: 1.2 },
  { x: 1654, nemici: [g('dx', 0), l('dx', 0.3), k('dx', 0.9), u('dx', 1.5), g('sx', 2.1)], fretta: 1.25 },
  { x: 1922, nemici: [u('dx', 0), g('dx', 0.4), g('sx', 1.0), k('dx', 1.5), l('dx', 2.0), g('dx', 2.6)], fretta: 1.3 },
  { x: 2168, nemici: [g('dx', 0), u('dx', 0.5), k('dx', 0.9), g('sx', 1.4), l('dx', 1.8), k('sx', 2.5)], fretta: 1.35 },
  // ultima ondata prima di Giova: due kamikaze e pressione da entrambi i lati
  { x: 2407, nemici: [u('dx', 0), g('dx', 0.4), g('sx', 0.9), k('dx', 1.4), k('sx', 2.0), l('dx', 2.5)], fretta: 1.4 },
];
/** Indice dell'ondata da cui si riparte con il CONTINUE se si è superata metà strada. */
export const CHECKPOINT_ONDA = 5;

export const PICKUPS: { x: number; arma: string }[] = [
  { x: 503, arma: 'mitragliatrice' },
  { x: 1006, arma: 'fucile' },
  { x: 1520, arma: 'lanciarazzi' },
  { x: 2056, arma: 'mitragliatrice' },
  { x: 2325, arma: 'fiamma' },
];

// ---------------------------------------------------------------------------
// OGGETTI SCENICI (foglio "oggetti"). `rompe`: si distrugge sparando.
//   legno/vetro = va in pezzi e a volte lascia un premio · esplode = esplosione (fa male anche a voi!)
// Strada lunga ~3100 px (4 facciate + il bar a x~2390). Posizioni riscalate dopo i fondali del 15/11.
// ---------------------------------------------------------------------------
export type Rottura = 'legno' | 'vetro' | 'esplode';
export interface PropPos { nome: string; x: number; rompe?: Rottura; vita?: number; dy?: number }
// Gli oggetti puramente decorativi restano tolti: erano sparsi a caso e sporcavano la strada.
// Questi pochi invece servono al gioco e stanno dove serve: una bombola o un fusto appena prima
// di ogni ondata grossa, da far saltare quando i nemici ci passano accanto (l'esplosione fa 80
// di danno nel raggio di 50 px e si incatena agli oggetti vicini), e qualche cassa che lascia
// un premio. Sono tutti oggetti "industriali" (bombole, fusti, bidoni, cassonetti):
// i fondali sono pieni di botte e casse di legno DIPINTE, che non si rompono, e mettere
// fra loro casse di legno vere non faceva capire a cosa valesse la pena sparare.
// In cantina non ce ne sono: durante lo scontro con Ettore farebbero da scudo ai
// suoi colpi e nasconderebbero i pallettoni.
export const PROPS_STRADA: PropPos[] = [
  { nome: 'bidone_latte', x: 300, rompe: 'legno', vita: 20 },
  { nome: 'bombole', x: 600, rompe: 'esplode', vita: 24 },
  { nome: 'cassonetto', x: 845, rompe: 'legno', vita: 26 },
  { nome: 'fusto_rosso', x: 1090, rompe: 'esplode', vita: 24 },
  { nome: 'bidone_latte', x: 1360, rompe: 'legno', vita: 20 },
  { nome: 'bombole', x: 1630, rompe: 'esplode', vita: 24 },
  { nome: 'cassonetto', x: 1895, rompe: 'legno', vita: 26 },
  { nome: 'fusto_rosso', x: 2140, rompe: 'esplode', vita: 24 },
  { nome: 'bombole', x: 2380, rompe: 'esplode', vita: 24 },
];
export const PROPS_CANTINA: PropPos[] = [];

// ---------------------------------------------------------------------------
// BOSS
// ---------------------------------------------------------------------------
export const GIOVA = { nome: 'GIOVA', sottotitolo: 'IL BUTTAFUORI DEL BUCANEVE', vita: 600, danno: 18, punti: 2000 };
export const ETTORE = { nome: 'ETTORE', sottotitolo: 'IL BARISTA CON LA DOPPIETTA', vita: 1500, danno: 16, punti: 5000 };

export const FRASI_ETTORE = ['VEI CHI CHE TE MATO!', 'CHI HA TOCCATO IL MIO GELATO?', 'QUI SI PAGA PRIMA!', 'ADESSO TI SISTEMO IO!'];
export const FRASI_GIOVA = ['STASERA NON SI ENTRA.', 'LISTA CHIUSA!', 'NON SEI IN LISTA, AMICO.'];
