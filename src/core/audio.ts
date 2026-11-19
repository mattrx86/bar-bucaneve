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
      master.connect(ctx.destination);
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

export type Sfx = 'pistola' | 'mitra' | 'fucile' | 'razzo' | 'fiamma' | 'salto' | 'atterra'
  | 'colpito' | 'morte' | 'nemicoColpito' | 'nemicoMorto' | 'raccolta' | 'bomba' | 'boom'
  | 'melee' | 'bossUrlo' | 'bossColpito' | 'bossMorto' | 'menu' | 'conferma' | 'allarme';

export function sfx(name: Sfx): void {
  switch (name) {
    case 'pistola': tone(620, 0.09, 'square', 0.07, 180); noise(0.06, 0.06, 2600); break;
    case 'mitra': tone(420, 0.055, 'square', 0.055, 150); noise(0.04, 0.05, 2200); break;
    case 'fucile': noise(0.16, 0.14, 1500); tone(180, 0.16, 'sawtooth', 0.08, 50); break;
    case 'razzo': noise(0.3, 0.1, 900); tone(140, 0.3, 'sawtooth', 0.09, 40); break;
    case 'fiamma': noise(0.09, 0.045, 700); break;
    case 'salto': tone(300, 0.13, 'square', 0.05, 640); break;
    case 'atterra': noise(0.07, 0.05, 500); break;
    case 'colpito': tone(240, 0.26, 'square', 0.1, 70); noise(0.1, 0.08, 1200); break;
    case 'morte': tone(340, 0.7, 'sawtooth', 0.11, 50); break;
    case 'nemicoColpito': noise(0.05, 0.05, 1800); break;
    case 'nemicoMorto': tone(420, 0.22, 'square', 0.07, 120); noise(0.12, 0.06, 1400); break;
    case 'raccolta': tone(660, 0.09, 'square', 0.06, 990); tone(990, 0.12, 'square', 0.05, 1320); break;
    case 'bomba': tone(260, 0.12, 'triangle', 0.05, 520); break;
    case 'boom': noise(0.45, 0.17, 700); tone(90, 0.45, 'sawtooth', 0.12, 30); break;
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
import { VOCI, MUSICA } from '../content/extra';
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
export function preparaVoci(): void { if (ctx) for (const n of Object.keys(VOCI)) void decodifica(n); }

/** Suona una voce. `pausa` = secondi minimi tra due usi della stessa voce. Una voce alla volta. */
export function voce(nome: string, pausa = 0, volume = 1): void {
  if (!ctx || !master || muted) return;
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
    const scelte = Object.keys(VOCI).filter((k) => k === base || new RegExp(`^${base}_\\d+$`).test(k));
    if (!scelte.length) continue;
    ultimaFrase = ctx.currentTime;
    voce(scelte[Math.floor(Math.random() * scelte.length)], pausa);
    return true;
  }
  return false;
}
