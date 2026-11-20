// ============================================================================
// CLASSIFICA GENERALE (servizio sul NAS, cartella server/ del progetto).
//  - ogni giocatore sceglie un nickname: il server lo registra e risponde con un token segreto, che resta
//    in questo browser e accompagna ogni punteggio (nessuno puo' mandare punti a nome di un altro);
//  - a fine partita il punteggio va sul server; in classifica conta il migliore di ogni nickname;
//  - se il server non risponde la partita resta nella classifica locale del browser, come prima.
// ============================================================================
import { loadSave, writeSave, leaderboard } from './save';

/** Indirizzo del servizio. Per provarlo altrove: window.__API_CLASSIFICA prima di caricare il gioco. */
export const API_CLASSIFICA: string =
  (window as unknown as { __API_CLASSIFICA?: string }).__API_CLASSIFICA ?? 'https://bucaslug.mattiariccadonna.synology.me/api/';

export type Modo = 'completo' | 'ultimo';
export interface Riga { pos: number; nick: string; punti: number; personaggio: string; livello: string; tempo: number; data: string }
export interface Partita { punti: number; personaggio: string; livello: string; tempo: number; modo: Modo; giocatori: number }
export interface Esito { ok: boolean; posizione?: number; record?: boolean; messaggio?: string }

async function chiama(percorso: string, corpo?: unknown, attesaMs = 6000): Promise<{ stato: number; dati: Record<string, unknown> }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), attesaMs);
  try {
    const r = await fetch(API_CLASSIFICA + percorso, corpo === undefined
      ? { signal: ctl.signal }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctl.signal });
    let dati: Record<string, unknown> = {};
    try { dati = await r.json(); } catch { /* risposta vuota */ }
    return { stato: r.status, dati };
  } finally { clearTimeout(t); }
}

/** Token segreto nuovo: 32 byte casuali del browser, in esadecimale (64 caratteri). */
function nuovoToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Nickname e token salvati per il giocatore 1 o 2 di questo browser.
 *  `registrato` = il server ha confermato che quel nickname appartiene a questo token. */
export function nickSalvato(slot: 0 | 1): { nick: string; token: string; registrato: boolean } | null {
  const s = loadSave();
  const nick = slot ? s.nick2 : s.nick; const token = (slot ? s.token2 : s.token) ?? '';
  const reg = slot ? s.reg2 : s.reg;
  // i salvataggi delle versioni precedenti non hanno "reg": li' un token presente era sempre confermato
  return nick ? { nick, token, registrato: !!token && reg !== false } : null;
}
function salva(slot: 0 | 1, nick: string, token: string, registrato: boolean): void {
  writeSave(slot ? { nick2: nick, token2: token, reg2: registrato } : { nick, token, reg: registrato });
}

/** Il nickname scritto e' accettabile? (stesse regole del server) */
export function nickValido(n: string): string | null {
  const v = n.trim().toUpperCase();
  return /^[A-Z0-9_.-]{3,12}$/.test(v) ? v : null;
}

/** Registra il nickname per il giocatore `slot`.
 *  Il token lo crea il gioco e lo salva PRIMA di sapere com'e' andata: se la risposta del server si perde
 *  (rete lenta), al tentativo successivo si manda lo stesso token e il server riconosce la registrazione gia'
 *  fatta, invece di rispondere "nickname gia' usato". Se il server non risponde il nickname vale lo stesso
 *  (le partite restano locali) e si riprova alla prossima partita.
 *  `ripeti` = conferma col server anche un nickname gia' registrato (per esempio cancellato da phpMyAdmin). */
export async function registra(slot: 0 | 1, nick: string, ripeti = false): Promise<{ ok: boolean; messaggio: string; preso?: boolean }> {
  const prima = nickSalvato(slot);
  if (!ripeti && prima && prima.nick === nick && prima.registrato) return { ok: true, messaggio: '' };
  const token = prima && prima.nick === nick && prima.token ? prima.token : nuovoToken();
  try {
    const { stato, dati } = await chiama('giocatore.php', { nick, token }, 15000);
    // il server aggiornato rimanda lo stesso token; uno vecchio ne crea uno suo: vale quello che risponde
    if ((stato === 200 || stato === 201) && typeof dati.token === 'string') { salva(slot, nick, dati.token, true); return { ok: true, messaggio: '' }; }
    return { ok: false, messaggio: String(dati.messaggio ?? 'Errore del server'), preso: stato === 409 };
  } catch {
    salva(slot, nick, token, false);
    return { ok: true, messaggio: 'Classifica generale non raggiungibile: per ora i punti restano su questo dispositivo.' };
  }
}

/** Manda una partita. Restituisce posizione in classifica e se e' un record personale. */
export async function inviaPartita(slot: 0 | 1, p: Partita): Promise<Esito> {
  const g = nickSalvato(slot);
  if (!g) return { ok: false, messaggio: 'NESSUN NICKNAME' };
  void leaderboard.submit({ nome: g.nick, punti: p.punti, data: new Date().toLocaleDateString('sv-SE') });   // copia locale
  try {
    if (!g.registrato) {   // nickname scelto quando il server non rispondeva (o non ha risposto in tempo): si conferma adesso
      const r = await registra(slot, g.nick);
      if (r.preso) {
        // il nickname e' di qualcun altro: lo si toglie da questo dispositivo, alla prossima partita se ne sceglie uno
        writeSave(slot ? { nick2: undefined, token2: undefined, reg2: undefined } : { nick: undefined, token: undefined, reg: undefined });
        return { ok: false, messaggio: "NICKNAME DI UN ALTRO: SCEGLINE UN ALTRO" };
      }
      if (!r.ok) return { ok: false, messaggio: r.messaggio.toUpperCase() };
    }
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      const n = nickSalvato(slot)!;
      if (!n.registrato) return { ok: false, messaggio: 'CLASSIFICA GENERALE NON RAGGIUNGIBILE' };
      const { stato, dati } = await chiama('punteggio.php', { nick: n.nick, token: n.token, ...p }, 10000);
      if (stato === 201) return { ok: true, posizione: Number(dati.posizione), record: !!dati.record };
      // 401: il server non riconosce piu' questo nickname (per esempio cancellato da phpMyAdmin):
      // si riregistra una volta con lo stesso token e si riprova
      if (stato === 401 && tentativo === 0) {
        const r = await registra(slot, n.nick, true);
        if (!r.ok) return { ok: false, messaggio: r.messaggio.toUpperCase() };
        continue;
      }
      return { ok: false, messaggio: String(dati.messaggio ?? 'ERRORE DEL SERVER').toUpperCase() };
    }
    return { ok: false, messaggio: 'ERRORE DEL SERVER' };
  } catch {
    return { ok: false, messaggio: 'CLASSIFICA GENERALE NON RAGGIUNGIBILE' };
  }
}

/** Classifica generale; null se il server non risponde. */
export async function classifica(modo: Modo, n: number): Promise<Riga[] | null> {
  try {
    const { stato, dati } = await chiama(`classifica.php?modo=${modo}&n=${n}`);
    return stato === 200 && Array.isArray(dati.classifica) ? (dati.classifica as Riga[]) : null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Finestra per scrivere il nickname (un campo HTML sopra il gioco: funziona anche con la tastiera
// del telefono). I tasti premuti qui non arrivano al gioco.
// ---------------------------------------------------------------------------
export function chiediNickname(titolo: string, slot: 0 | 1, annullabile: boolean): Promise<string | null> {
  return new Promise((risolvi) => {
    const fondo = document.createElement('div');
    fondo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:"Courier New",monospace';
    const box = document.createElement('div');
    box.style.cssText = 'background:#141824;border:3px solid #ffe066;box-shadow:0 0 0 3px #000,0 8px 30px #000;padding:20px 24px;max-width:90vw;width:380px;color:#fff;text-align:center;image-rendering:pixelated';
    const prima = nickSalvato(slot)?.nick ?? '';
    box.innerHTML = `
      <div style="color:#ffe066;font-weight:bold;font-size:20px;letter-spacing:2px;margin-bottom:6px"></div>
      <div style="font-size:13px;color:#c8cce0;margin-bottom:14px">Il nome con cui apparirai nella classifica generale.<br>Da 3 a 12 tra lettere, numeri e _ - .</div>
      <input maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false"
        style="width:100%;box-sizing:border-box;font:bold 26px 'Courier New',monospace;text-transform:uppercase;text-align:center;letter-spacing:3px;background:#0c0e16;color:#80ff80;border:2px solid #60d8ff;padding:8px;outline:none">
      <div data-msg style="min-height:34px;font-size:13px;color:#ff8080;margin:10px 0 6px"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button data-ok style="font:bold 16px 'Courier New',monospace;background:#ffe066;color:#141824;border:0;padding:8px 18px;cursor:pointer">CONFERMA</button>
        <button data-no style="font:bold 16px 'Courier New',monospace;background:#3a4460;color:#fff;border:0;padding:8px 18px;cursor:pointer">ANNULLA</button>
      </div>`;
    (box.firstElementChild as HTMLElement).textContent = titolo;
    fondo.appendChild(box); document.body.appendChild(fondo);
    const inp = box.querySelector('input')!; const msg = box.querySelector('[data-msg]') as HTMLElement;
    const ok = box.querySelector('[data-ok]') as HTMLButtonElement; const no = box.querySelector('[data-no]') as HTMLButtonElement;
    if (!annullabile) no.style.display = 'none';
    inp.value = prima;
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
    // i tasti scritti qui non devono muovere il gioco (Invio, Spazio, lettere dei comandi)
    const ferma = (e: Event): void => e.stopPropagation();
    fondo.addEventListener('keydown', ferma); fondo.addEventListener('keyup', ferma);
    let occupato = false;
    const chiudi = (v: string | null): void => { fondo.remove(); risolvi(v); };
    const conferma = async (): Promise<void> => {
      if (occupato) return;
      const v = nickValido(inp.value);
      if (!v) { msg.textContent = 'Da 3 a 12 caratteri: lettere, numeri e _ - .'; return; }
      occupato = true; ok.disabled = true; msg.style.color = '#c8cce0'; msg.textContent = 'Controllo...';
      const r = await registra(slot, v);
      occupato = false; ok.disabled = false;
      if (!r.ok) { msg.style.color = '#ff8080'; msg.textContent = r.messaggio; return; }
      if (r.messaggio) { msg.style.color = '#ffe066'; msg.textContent = r.messaggio; setTimeout(() => chiudi(v), 1800); return; }
      chiudi(v);
    };
    ok.addEventListener('click', () => void conferma());
    no.addEventListener('click', () => chiudi(null));
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); void conferma(); }
      if (e.key === 'Escape' && annullabile) chiudi(null);
    });
  });
}
