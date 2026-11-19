// Effetti sonori sintetizzati: nessun file audio da caricare.
// Quando arriveranno i suoni veri, questo file diventa un caricatore.
let ctx: AudioContext | null = null;
let muted = false;
let master: GainNode | null = null;

export function setMuted(m: boolean): void { muted = m; if (master && ctx) master.gain.setValueAtTime(m ? 0 : 0.9, ctx.currentTime); }
export function isMuted(): boolean { return muted; }

export function unlockAudio(): void {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      // Limitatore morbido in uscita: le raffiche e le esplosioni sovrapposte non vanno mai in clipping
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide?: number): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t); osc.stop(t + dur);
}

function noise(dur: number, vol: number, filterHz: number): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz;
  const gain = ctx.createGain(); gain.gain.value = vol;
  src.connect(f).connect(gain).connect(master);
  src.start(t);
}

export type Sfx = 'pistola' | 'mitra' | 'fucile' | 'razzo' | 'doppietta' | 'doppiettaVentaglio' | 'motoLancio' | 'motoImpatto' | 'salto' | 'atterra'
  | 'colpito' | 'morte' | 'nemicoColpito' | 'nemicoMorto' | 'raccolta' | 'bomba' | 'boom'
  | 'melee' | 'bossUrlo' | 'bossColpito' | 'bossMorto' | 'menu' | 'conferma' | 'allarme';

// ---------------------------------------------------------------------------
// Sintesi a strati. Ogni suono e' la somma di piccoli "strati" (scatto secco, corpo, colpo grave,
// coda) con inviluppo proprio, ritardo, filtro e posizione stereo. Nessun file esterno: tutto e'
// generato qui, quindi non c'e' latenza di caricamento e non ci sono diritti da attribuire.
// ---------------------------------------------------------------------------
interface Strato {
  /** 'n' = rumore, altrimenti forma d'onda dell'oscillatore */
  t: 'n' | OscillatorType;
  dur: number; vol: number;
  /** frequenza iniziale e finale (oscillatori) oppure del filtro (rumore) */
  f0: number; f1?: number;
  filtro?: BiquadFilterType; q?: number;
  /** ritardo di partenza in secondi */
  rit?: number;
}
let attive = 0;               // strati sonori in riproduzione: sopra il limite si scartano quelli "di coda"
let noiseBuf: AudioBuffer | null = null;
function bufferRumore(): AudioBuffer {
  if (!ctx) throw new Error('no audio');
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function strato(l: Strato, k: number, pan: number, pitch: number): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + (l.rit ?? 0);
  const gain = ctx.createGain();
  const vol = l.vol * k;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.002);          // attacco brevissimo: niente "click"
  gain.gain.exponentialRampToValueAtTime(0.0008, t + l.dur);
  let nodo: AudioNode;
  let src: AudioScheduledSourceNode;
  if (l.t === 'n') {
    const b = ctx.createBufferSource(); b.buffer = bufferRumore(); b.loop = true;
    const f = ctx.createBiquadFilter(); f.type = l.filtro ?? 'lowpass'; f.Q.value = l.q ?? 0.7;
    f.frequency.setValueAtTime(l.f0 * pitch, t);
    if (l.f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, l.f1 * pitch), t + l.dur);
    b.connect(f); nodo = f; src = b; b.start(t, Math.random() * 0.8);
  } else {
    const o = ctx.createOscillator(); o.type = l.t;
    o.frequency.setValueAtTime(l.f0 * pitch, t);
    if (l.f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, l.f1 * pitch), t + l.dur);
    nodo = o; src = o; o.start(t);
  }
  nodo.connect(gain);
  if (pan !== 0 && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(p).connect(master); }
  else gain.connect(master);
  attive++;
  src.onended = () => { attive--; };
  src.stop(t + l.dur + 0.02);
}

const RICETTE: Partial<Record<Sfx, Strato[]>> = {
  // Pistola: scatto secco e brillante, corpo corto, piccolo colpo grave. Il suono piu' leggero.
  pistola: [
    { t: 'n', dur: 0.05, vol: 0.10, f0: 3200, filtro: 'highpass' },
    { t: 'square', dur: 0.07, vol: 0.06, f0: 1100, f1: 240 },
    { t: 'sine', dur: 0.09, vol: 0.11, f0: 190, f1: 70 },
  ],
  // Mitragliatrice: breve, meccanica, stretta. Uno scatto metallico + un "tac" di otturatore.
  mitra: [
    { t: 'n', dur: 0.03, vol: 0.075, f0: 2600, filtro: 'bandpass', q: 1.2 },
    { t: 'sawtooth', dur: 0.045, vol: 0.045, f0: 330, f1: 120 },
    { t: 'square', dur: 0.012, vol: 0.03, f0: 2100, rit: 0.022 },
  ],
  // Fucile a pompa: colpo pesante, esplosivo, con coda e rumore della pompa che riarma.
  fucile: [
    { t: 'n', dur: 0.06, vol: 0.13, f0: 2200, filtro: 'highpass' },
    { t: 'n', dur: 0.24, vol: 0.20, f0: 2600, f1: 350, filtro: 'lowpass' },
    { t: 'sine', dur: 0.30, vol: 0.20, f0: 120, f1: 36 },
    { t: 'sawtooth', dur: 0.14, vol: 0.07, f0: 260, f1: 70 },
    { t: 'n', dur: 0.4, vol: 0.05, f0: 700, f1: 200, filtro: 'lowpass', rit: 0.08 },
    { t: 'square', dur: 0.03, vol: 0.035, f0: 1500, f1: 700, rit: 0.27 },
    { t: 'square', dur: 0.035, vol: 0.04, f0: 900, f1: 420, rit: 0.34 },
  ],
  // Lanciarazzi: lancio profondo (sbuffo che sale) piu' un colpo sordo.
  razzo: [
    { t: 'n', dur: 0.5, vol: 0.12, f0: 500, f1: 2600, filtro: 'bandpass', q: 0.9 },
    { t: 'sine', dur: 0.32, vol: 0.17, f0: 100, f1: 38 },
    { t: 'sawtooth', dur: 0.4, vol: 0.06, f0: 150, f1: 55 },
    { t: 'n', dur: 0.05, vol: 0.09, f0: 1800, filtro: 'highpass' },
  ],
  // Doppietta di Ettore: DUE canne in rapida successione (0 e 0,10 s), molto piu' grave e lunga
  // del fucile del giocatore, poi lo scatto di apertura delle canne. Non assomiglia a nessun'altra arma.
  doppietta: [
    { t: 'n', dur: 0.05, vol: 0.12, f0: 1800, filtro: 'highpass' },
    { t: 'n', dur: 0.32, vol: 0.18, f0: 1500, f1: 200, filtro: 'lowpass' },
    { t: 'sine', dur: 0.40, vol: 0.22, f0: 82, f1: 28 },
    { t: 'sawtooth', dur: 0.2, vol: 0.07, f0: 180, f1: 50 },
    { t: 'n', dur: 0.05, vol: 0.12, f0: 1800, filtro: 'highpass', rit: 0.1 },
    { t: 'n', dur: 0.36, vol: 0.18, f0: 1300, f1: 180, filtro: 'lowpass', rit: 0.1 },
    { t: 'sine', dur: 0.44, vol: 0.22, f0: 70, f1: 25, rit: 0.1 },
    { t: 'n', dur: 0.7, vol: 0.05, f0: 520, f1: 140, filtro: 'lowpass', rit: 0.14 },
    { t: 'square', dur: 0.03, vol: 0.04, f0: 640, f1: 260, rit: 0.42 },
    { t: 'square', dur: 0.03, vol: 0.04, f0: 900, f1: 380, rit: 0.48 },
  ],
  // Ventaglio: la stessa doppietta, ma con un fischio di aria spostata in piu' che annuncia il ventaglio largo.
  doppiettaVentaglio: [
    { t: 'n', dur: 0.05, vol: 0.12, f0: 1800, filtro: 'highpass' },
    { t: 'n', dur: 0.36, vol: 0.19, f0: 1700, f1: 180, filtro: 'lowpass' },
    { t: 'sine', dur: 0.46, vol: 0.23, f0: 76, f1: 26 },
    { t: 'sawtooth', dur: 0.25, vol: 0.08, f0: 200, f1: 45 },
    { t: 'n', dur: 0.06, vol: 0.12, f0: 1800, filtro: 'highpass', rit: 0.1 },
    { t: 'n', dur: 0.4, vol: 0.19, f0: 1400, f1: 160, filtro: 'lowpass', rit: 0.1 },
    { t: 'sine', dur: 0.5, vol: 0.23, f0: 64, f1: 24, rit: 0.1 },
    { t: 'n', dur: 0.5, vol: 0.07, f0: 600, f1: 3000, filtro: 'bandpass', q: 1.5, rit: 0.12 },
    { t: 'n', dur: 0.8, vol: 0.05, f0: 480, f1: 120, filtro: 'lowpass', rit: 0.16 },
  ],
  // Moto lanciata: sforzo grave + rombo di motore che sale + sibilo in volo.
  motoLancio: [
    { t: 'sawtooth', dur: 0.5, vol: 0.10, f0: 70, f1: 210 },
    { t: 'square', dur: 0.5, vol: 0.04, f0: 140, f1: 420, rit: 0.02 },
    { t: 'n', dur: 0.7, vol: 0.10, f0: 300, f1: 2200, filtro: 'bandpass', q: 0.8, rit: 0.05 },
    { t: 'sine', dur: 0.25, vol: 0.14, f0: 90, f1: 40 },
  ],
  // Moto che si schianta: botto, lamiera, coda di rottami.
  motoImpatto: [
    { t: 'sine', dur: 0.7, vol: 0.26, f0: 80, f1: 26 },
    { t: 'n', dur: 0.5, vol: 0.22, f0: 1600, f1: 160, filtro: 'lowpass' },
    { t: 'n', dur: 0.25, vol: 0.12, f0: 1400, filtro: 'bandpass', q: 3, rit: 0.03 },
    { t: 'square', dur: 0.2, vol: 0.05, f0: 520, f1: 190, rit: 0.04 },
    { t: 'square', dur: 0.14, vol: 0.04, f0: 760, f1: 300, rit: 0.13 },
    { t: 'n', dur: 0.9, vol: 0.07, f0: 420, f1: 110, filtro: 'lowpass', rit: 0.1 },
  ],
  // Esplosione: sub, rombo, crepitio e coda lunga.
  boom: [
    { t: 'sine', dur: 0.7, vol: 0.22, f0: 78, f1: 26 },
    { t: 'n', dur: 0.55, vol: 0.19, f0: 1500, f1: 160, filtro: 'lowpass' },
    { t: 'n', dur: 0.18, vol: 0.09, f0: 2800, filtro: 'highpass', rit: 0.03 },
    { t: 'n', dur: 0.9, vol: 0.06, f0: 360, f1: 100, filtro: 'lowpass', rit: 0.1 },
  ],
};

/** Minimo di secondi tra due riproduzioni dello stesso suono (anti-mitragliamento audio). */
const PAUSA_MIN: Partial<Record<Sfx, number>> = { pistola: 0.05, mitra: 0.045, fucile: 0.1, razzo: 0.1, doppietta: 0.25, doppiettaVentaglio: 0.25, boom: 0.06, nemicoColpito: 0.04, bossColpito: 0.05 };

// ---------------------------------------------------------------------------
// CAMPIONI DELLE ARMI (spari reali CC0, vedi grafica/sfx/CREDITI.md). Ogni suono ha piu' varianti
// scelte a caso; intonazione e volume variano un poco a ogni colpo. I suoni sintetizzati restano
// come rinforzo dei bassi (volume ridotto) e come ripiego finche' il campione non e' decodificato.
// ---------------------------------------------------------------------------
const campioni: Record<string, (AudioBuffer | null)[]> = {};
const VOL_CAMPIONE: Partial<Record<Sfx, number>> = { pistola: 0.5, mitra: 0.36, fucile: 0.7, razzo: 0.6, boom: 0.62, motoImpatto: 0.7, doppietta: 0.85, doppiettaVentaglio: 0.85 };
const VARIA_CAMPIONE: Partial<Record<Sfx, number>> = { pistola: 0.06, mitra: 0.1, fucile: 0.05, razzo: 0.04, boom: 0.08, motoImpatto: 0.05, doppietta: 0.03, doppiettaVentaglio: 0.03 };
const SINTESI_CON_CAMPIONE = 0.22;
function preparaCampioni(): void {
  if (!ctx) return;
  for (const nome of Object.keys(SFX)) {
    if (campioni[nome]) continue;
    campioni[nome] = SFX[nome].map(() => null);
    SFX[nome].forEach((d, i) => {
      try {
        const bin = atob(d.split(',')[1]);
        const arr = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
        ctx!.decodeAudioData(arr.buffer).then(b => { campioni[nome][i] = b; }, () => { /* resta il suono sintetico */ });
      } catch { /* idem */ }
    });
  }
}
/** Suona una variante a caso del campione. Restituisce false se non e' ancora pronto. */
function suonaCampione(name: Sfx, k: number, pan: number): boolean {
  const lista = campioni[name];
  if (!ctx || !master || !lista) return false;
  const pronti = lista.filter((b): b is AudioBuffer => !!b);
  if (!pronti.length) return false;
  const b = pronti[Math.floor(Math.random() * pronti.length)];
  const src = ctx.createBufferSource(); src.buffer = b;
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 2 * (VARIA_CAMPIONE[name] ?? 0.05);
  const g = ctx.createGain(); g.gain.value = (VOL_CAMPIONE[name] ?? 0.6) * k * (0.9 + Math.random() * 0.2);
  src.connect(g);
  if (pan !== 0 && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(master); }
  else g.connect(master);
  attive++;
  src.onended = () => { attive--; };
  src.start();
  return true;
}

const ultimoSfx: Partial<Record<Sfx, number>> = {};
/** Suoni "di coda" e non essenziali che si scartano se ci sono gia' troppi strati in corso. */
const ESSENZIALI = new Set<Sfx>(['pistola', 'mitra', 'fucile', 'razzo', 'doppietta', 'doppiettaVentaglio', 'motoLancio', 'motoImpatto', 'colpito', 'morte', 'bossUrlo']);

/** `k` = volume relativo, `pan` = posizione stereo da -1 (sinistra) a 1 (destra). */
export function sfx(name: Sfx, k = 1, pan = 0): void {
  if (!ctx || !master || muted) return;
  const ora = ctx.currentTime;
  const minimo = PAUSA_MIN[name] ?? 0;
  if (minimo && ultimoSfx[name] !== undefined && ora - ultimoSfx[name]! < minimo) return;
  ultimoSfx[name] = ora;
  if (attive > 60 && !ESSENZIALI.has(name)) return;
  if (!campioni[name] && SFX[name]) preparaCampioni();   // decodifica al primo bisogno (il primo colpo usa la sintesi)
  const conCampione = suonaCampione(name, k, pan);
  const ric = RICETTE[name];
  if (ric) {
    if (conCampione) { for (const l of ric) strato(l, k * SINTESI_CON_CAMPIONE, pan, 1); return; }
    // piccola variazione di intonazione a ogni colpo: le raffiche non suonano come un campione ripetuto
    const pitch = 1 + (Math.random() - 0.5) * (name === 'mitra' ? 0.12 : 0.06);
    for (const l of ric) strato(l, k, pan, pitch);
    return;
  }
  switch (name) {
    case 'salto': tone(300, 0.13, 'square', 0.05, 640); break;
    case 'atterra': noise(0.07, 0.05, 500); break;
    case 'colpito': tone(240, 0.26, 'square', 0.1, 70); noise(0.1, 0.08, 1200); break;
    case 'morte': tone(340, 0.7, 'sawtooth', 0.11, 50); break;
    case 'nemicoColpito': noise(0.05, 0.05, 1800); break;
    case 'nemicoMorto': tone(420, 0.22, 'square', 0.07, 120); noise(0.12, 0.06, 1400); break;
    case 'raccolta': tone(660, 0.09, 'square', 0.06, 990); tone(990, 0.12, 'square', 0.05, 1320); break;
    case 'bomba': tone(260, 0.12, 'triangle', 0.05, 520); break;
    case 'melee': noise(0.08, 0.09, 2400); tone(200, 0.1, 'square', 0.06, 90); break;
    case 'bossUrlo': tone(150, 0.5, 'sawtooth', 0.12, 95); break;
    case 'bossColpito': noise(0.06, 0.07, 900); break;
    case 'bossMorto': noise(0.9, 0.2, 500); tone(70, 1.0, 'sawtooth', 0.14, 25); break;
    case 'menu': tone(520, 0.05, 'square', 0.045); break;
    case 'conferma': tone(700, 0.08, 'square', 0.06, 1050); break;
    case 'allarme': tone(880, 0.07, 'square', 0.05); break;
  }
}

// ---------------------------------------------------------------------------
// VOCI REGISTRATE (mp3 incorporati): decodificate al primo uso.
// ---------------------------------------------------------------------------
import { VOCI, MUSICA, VOCI_FASE, SFX } from '../content/extra';
/** Stadio in corso: le voci messe in voci/<stadio>/ si sentono solo li' ('strada', 'bucaneve', 'ettore'). null = tutte. */
let faseAudio: string | null = null;
export function setFaseAudio(f: string | null): void { faseAudio = f; }
/** Una voce di stadio `fv` si sente nello stadio in corso? Lo spiazzo del Bucaneve e' ancora la strada:
 *  le voci della strada continuano anche quando c'e' Giovanni (non il contrario). */
function valeInFase(fv: string | undefined): boolean {
  if (!fv || !faseAudio || fv === faseAudio) return true;
  return faseAudio === 'bucaneve' && fv === 'strada';
}

/** Sottofondo di uno stadio: un brano corto (es. "sottofondo boss giova") suonato SOPRA la musica,
 *  una volta subito e poi ogni `ogni` secondi, finche' non si chiama sottofondo(null). */
let sottTimer: ReturnType<typeof setInterval> | null = null;
export function sottofondo(nome: string | null, ogni = 0, volume = 0.8): void {
  if (sottTimer) { clearInterval(sottTimer); sottTimer = null; }
  if (!nome || !ctx) return;
  const suona = (): void => {
    void decodificaMusica(nome).then((b) => {
      if (!b || !ctx || !master || muted) return;
      const src = ctx.createBufferSource(); src.buffer = b;
      const g = ctx.createGain(); g.gain.value = VOL_MUSICA * 2.4 * volume;
      src.connect(g).connect(master); src.start();
    });
  };
  suona();
  if (ogni > 0) sottTimer = setInterval(suona, ogni * 1000);
}
const buffers: Record<string, AudioBuffer | null> = {};
let ultimaVoce: AudioBufferSourceNode | null = null;
const ultimoUso: Record<string, number> = {};

async function decodifica(nome: string): Promise<AudioBuffer | null> {
  if (nome in buffers) return buffers[nome];
  buffers[nome] = null;
  const d = VOCI[nome]; if (!d || !ctx) return null;
  try {
    const bin = atob(d.split(',')[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    buffers[nome] = await ctx.decodeAudioData(arr.buffer);
  } catch { buffers[nome] = null; }
  return buffers[nome];
}
/** Precarica tutte le voci (dopo il primo tasto, quando l'audio è sbloccato). */
export function preparaVoci(): void { preparaCampioni(); if (ctx) for (const n of Object.keys(VOCI)) void decodifica(n); }

/** Suona una voce. `pausa` = secondi minimi tra due usi della stessa voce. Una voce alla volta. */
export function voce(nome: string, pausa = 0, volume = 1): void {
  if (!ctx || !master || muted) return;
  if (!valeInFase(VOCI_FASE[nome])) return;   // voce di un altro stadio
  const now = ctx.currentTime;
  if (pausa && ultimoUso[nome] !== undefined && now - ultimoUso[nome] < pausa) return;
  ultimoUso[nome] = now;
  void decodifica(nome).then((b) => {
    if (!b || !ctx || !master) return;
    try { ultimaVoce?.stop(); } catch { /* già finita */ }
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(); g.gain.value = volume;
    src.connect(g).connect(master); src.start();
    ultimaVoce = src;
    abbassaMusica(b.duration);
  });
}

// ---------------------------------------------------------------------------
// MUSICA (i vostri brani, interi, in mp3): un brano alla volta, in ciclo,
// si abbassa da sola mentre parla una voce.
// ---------------------------------------------------------------------------
/** Musica sotto a voci ed effetti: i brani sono normalizzati a -16 LUFS dal build, qui si abbassano. */
const VOL_MUSICA = 0.25;
const musBuf: Record<string, AudioBuffer | null> = {};
let musSrc: AudioBufferSourceNode | null = null;
let musGain: GainNode | null = null;
let musNome: string | null = null;

/** Trova il brano anche se il file è stato caricato con un nome diverso da quello che
 *  il gioco chiede: "battaglia-ettore" accetta anche `Ettore.mp3`, "strada" anche
 *  `Strada.mp3`. Così chi carica la musica non deve indovinare il nome esatto. */
function risolviMusica(nome: string): string | null {
  if (MUSICA[nome]) return nome;
  const chiavi = Object.keys(MUSICA);
  for (const p of nome.split('-').reverse()) if (MUSICA[p]) return p;
  return chiavi.find((k) => k.includes(nome) || nome.includes(k)) ?? null;
}
async function decodificaMusica(nome: string): Promise<AudioBuffer | null> {
  if (nome in musBuf) return musBuf[nome];
  musBuf[nome] = null;
  const vero = risolviMusica(nome);
  const d = vero ? MUSICA[vero] : undefined; if (!d || !ctx) return null;
  try {
    const bin = atob(d.split(',')[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    musBuf[nome] = await ctx.decodeAudioData(arr.buffer);
  } catch { musBuf[nome] = null; }
  return musBuf[nome];
}
/** Avvia un brano in ciclo (null = silenzio). Se è già quello in corso non fa nulla. */
export function musica(nome: string | null): void {
  if (!ctx || !master) return;
  if (nome === musNome) return;
  musNome = nome;
  if (musSrc && musGain) {
    const vecchio = musSrc, g = musGain;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    setTimeout(() => { try { vecchio.stop(); } catch { /* già ferma */ } }, 1200);
    musSrc = null; musGain = null;
  }
  if (!nome) return;
  void decodificaMusica(nome).then((b) => {
    if (!b || !ctx || !master || musNome !== nome) return;
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(VOL_MUSICA, ctx.currentTime, 0.4);
    src.connect(g).connect(master); src.start();
    musSrc = src; musGain = g;
  });
}
function abbassaMusica(sec: number): void {
  if (!ctx || !musGain) return;
  const t = ctx.currentTime;
  musGain.gain.cancelScheduledValues(t);
  musGain.gain.setTargetAtTime(VOL_MUSICA * 0.3, t, 0.08);
  musGain.gain.setTargetAtTime(VOL_MUSICA, t + sec, 0.3);
}

/**
 * Fa parlare un personaggio: cerca tra le voci quelle che si chiamano `<chi>_<evento>` o
 * `<chi>_<evento>_1`, `_2`... e ne sceglie una a caso. `chi` può essere un elenco (si usa il
 * primo che ha la voce). `prob` = probabilità che parli, così non parlano sempre tutti.
 */
let ultimaFrase = 0;
export function parla(chi: string | string[], evento: string, prob = 1, pausa = 4): boolean {
  if (Math.random() > prob || !ctx) return false;
  if (ctx.currentTime - ultimaFrase < 0.7) return false; // non accavallare le frasi
  for (const c of Array.isArray(chi) ? chi : [chi]) {
    const base = `${c}_${evento}`;
    const scelte = Object.keys(VOCI).filter((k) => (k === base || new RegExp(`^${base}_\\d+$`).test(k)) && valeInFase(VOCI_FASE[k]));
    if (!scelte.length) continue;
    ultimaFrase = ctx.currentTime;
    voce(scelte[Math.floor(Math.random() * scelte.length)], pausa);
    return true;
  }
  return false;
}
