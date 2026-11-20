// ============================================================================
// HOLY SLUG - il livello della chiesa (dopo la cantina di Ettore).
// Questo modulo unisce all'avvio il materiale generato da tools/build_chiesa.py (src/content/chiesa.ts)
// ai cataloghi del gioco (fogli, disegni, musica, voci) e contiene i numeri del livello.
// Va importato una volta sola, prima delle scene (lo fa src/main.ts).
// ============================================================================
import { SHEETS } from './sprites';
import { FX, MUSICA, VOCI, VOCI_FASE } from './extra';
import { CH_SHEETS, CH_FX, CH_MUSICA, CH_VOCI, CH_BG } from './chiesa';
import type { EnemyType, Wave } from './defs';

Object.assign(SHEETS, CH_SHEETS);
Object.assign(FX, CH_FX);
Object.assign(MUSICA, CH_MUSICA);
Object.assign(VOCI, CH_VOCI);
// le voci della chiesa si sentono solo in chiesa
for (const k of Object.keys(CH_VOCI)) VOCI_FASE[k] = 'chiesa';

export { CH_BG };

// ---------------------------------------------------------------------------
// ONDATE DELLA NAVATA (x in pixel di gioco; la navata va da 430 a 2716, poi l'arena dell'altare).
// Stesso schema delle ondate della strada: un'ondata parte quando il giocatore supera `x`,
// la camera si ferma finche' non e' finita. `fretta` accelera gli attacchi dell'ondata.
// ---------------------------------------------------------------------------
const c = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'chierichetto' as EnemyType, lato, ritardo });
const s = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'suora' as EnemyType, lato, ritardo });
const k = (lato: 'dx' | 'sx', ritardo: number) => ({ tipo: 'suoracarica' as EnemyType, lato, ritardo });
export const WAVES_CHIESA: (Wave & { fretta?: number })[] = [
  // ingresso: due chierichetti per prendere le misure
  { x: 300, nemici: [c('dx', 0), c('dx', 1.1)] },
  { x: 560, nemici: [s('dx', 0), c('dx', 0.6), c('sx', 1.5)] },
  { x: 820, nemici: [c('dx', 0), k('dx', 0.6), s('dx', 1.2), c('sx', 2.0)], fretta: 1.1 },
  { x: 1080, nemici: [s('dx', 0), c('dx', 0.5), c('sx', 1.1), s('dx', 1.8)], fretta: 1.15 },
  // --- checkpoint a meta' navata (CHECKPOINT_CHIESA)
  { x: 1340, nemici: [k('dx', 0), c('dx', 0.5), s('sx', 1.0), c('dx', 1.6), k('sx', 2.3)], fretta: 1.2 },
  { x: 1600, nemici: [c('dx', 0), s('dx', 0.4), c('sx', 0.9), k('dx', 1.5), s('dx', 2.1)], fretta: 1.25 },
  { x: 1860, nemici: [s('dx', 0), c('dx', 0.4), k('sx', 1.0), c('dx', 1.5), s('sx', 2.0), c('dx', 2.6)], fretta: 1.3 },
  { x: 2120, nemici: [c('dx', 0), k('dx', 0.5), s('dx', 0.9), c('sx', 1.4), k('sx', 2.0), s('dx', 2.5)], fretta: 1.35 },
  // ultima, davanti all'altare
  { x: 2380, nemici: [s('dx', 0), c('dx', 0.3), c('sx', 0.8), k('dx', 1.3), s('sx', 1.9), k('dx', 2.4)], fretta: 1.4 },
];
export const CHECKPOINT_CHIESA = 4;
// Le x qui sopra sono pensate per una chiesa lunga 3100 px. Con i fondali dipinti la lunghezza dipende
// dalle immagini: ondate e casse si ridistribuiscono in proporzione lungo la navata (arena esclusa).
const SCALA_X = (CH_BG.arenaX) / (3100 - 384);
if (Math.abs(SCALA_X - 1) > 0.01) for (const w of WAVES_CHIESA) w.x = Math.round(w.x * SCALA_X);
/** Casse d'arma lungo la navata (stesso sistema della strada). */
export const PICKUPS_CHIESA: { x: number; arma: string }[] = [
  { x: 690, arma: 'mitragliatrice' },
  { x: 1220, arma: 'fucile' },
  { x: 1730, arma: 'lanciarazzi' },
  { x: 2250, arma: 'mitragliatrice' },
];
if (Math.abs(SCALA_X - 1) > 0.01) for (const p of PICKUPS_CHIESA) p.x = Math.round(p.x * SCALA_X);

// ---------------------------------------------------------------------------
// BOSS FINALI. Griso entra per primo; a meta' della sua vita arriva Don Antonio a cercarlo
// ("DOVE SEI GRISO?") e da li' combattono insieme. Si vince quando sono a terra tutti e due.
// ---------------------------------------------------------------------------
export const GRISO = { nome: 'GRISO', sottotitolo: 'ROSARIO E BIBBIA', vita: 1000, danno: 14, punti: 4000 };
export const DON_ANTONIO = { nome: 'DON ANTONIO', sottotitolo: 'ACQUA SANTA E LASAGNE', vita: 1700, danno: 18, punti: 6000 };
export const FRASI_GRISO = ['SI, SI...', 'FUORI DALLA CHIESA!', 'IN GINOCCHIO!'];
export const FRASI_DON = ['DOVE SEI GRISO?!', 'SIETE DEI CANI!', 'SIETE PEGGIO DEI CANI!', 'LE MIE LASAGNE!'];
