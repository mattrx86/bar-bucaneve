// Salvataggio e classifica locale.
// La classifica passa da LeaderboardService: per renderla condivisa si
// sostituisce l'implementazione con una che chiama un'API, senza toccare il gioco.
const KEY = 'bar-bucaneve-save';
const VERSION = 1;

export interface Entry { nome: string; punti: number; data: string }
export interface SaveData { v: number; charId: string | null; muted: boolean; record: Entry[]; diff?: string; /** ultimo modo scelto: 1 o 2 giocatori */ giocatori?: number; /** personaggio del secondo giocatore */ charId2?: string | null;
  /** nickname e token della classifica generale (giocatore 1 e 2), vedi core/classifica.ts */ nick?: string; token?: string; nick2?: string; token2?: string;
  /** false = token creato qui ma il server non ha ancora confermato la registrazione (rete assente o lenta) */ reg?: boolean; reg2?: boolean }

const DEFAULT: SaveData = { v: VERSION, charId: null, muted: false, record: [] };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, record: [] };
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null || d.v !== VERSION) return { ...DEFAULT, record: [] };
    return { ...DEFAULT, ...d, record: Array.isArray(d.record) ? d.record : [] };
  } catch { return { ...DEFAULT, record: [] }; }
}

export function writeSave(patch: Partial<SaveData>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadSave(), ...patch, v: VERSION })); } catch { /* ignora */ }
}

export interface LeaderboardService {
  submit(e: Entry): Promise<number>;
  top(n: number): Promise<Entry[]>;
}

class LocalBoard implements LeaderboardService {
  async submit(e: Entry): Promise<number> {
    const lista = loadSave().record.slice();
    lista.push(e);
    lista.sort((a, b) => b.punti - a.punti);
    const pos = lista.indexOf(e) + 1;
    writeSave({ record: lista.slice(0, 10) });
    return pos <= 10 ? pos : 0;
  }
  async top(n: number): Promise<Entry[]> { return loadSave().record.slice(0, n); }
}

export const leaderboard: LeaderboardService = new LocalBoard();
