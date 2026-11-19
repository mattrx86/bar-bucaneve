// Colore dei proiettili di ogni personaggio. UNICO punto da modificare per cambiare un colore.
// `h` = tinta in gradi (0-360); `s` e `v` = moltiplicatori di saturazione e luminosita' (1 = invariati).
// Mattia non c'e': i suoi proiettili restano quelli originali disegnati nel foglio armi.
export interface ColoreProiettile { h: number; s?: number; v?: number }
export const COLORE_PROIETTILI: Record<string, ColoreProiettile> = {
  vero: { h: 278 },                 // viola
  michela: { h: 328, s: 0.78, v: 1.08 }, // rosa
  roberto: { h: 196, v: 1.05 },     // azzurro
  marco: { h: 125 },                // verde
  daniele: { h: 18 },               // arancione (piu' rosso del giallo-oro originale)
  paolo: { h: 0 },                  // rosso
};
/** Disegni (nomi dei fotogrammi del foglio armi) che portano il colore del personaggio. */
export const DISEGNI_COLORATI = ['proiettile', 'razzo', 'granata', 'lampo_1', 'lampo_2'];
