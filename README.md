# Bar Bucaneve - prototipo 0.4

Run'n'gun stile Metal Slug. Strada di Ponte Arche (gelatai e ubriachi) -> Giova davanti al Bar Bucaneve -> Ettore in cantina.

## Per giocare
Scaricate `bar-bucaneve.html` e apritelo con doppio clic (Chrome, Edge o Firefox). Istruzioni in `LEGGIMI.md`.

## Comandi
Frecce/WASD muovi, J/Z/Ctrl spara (da vicino: pugno), K/X/Spazio salta, L/C bomba, I pugno, Esc/P pausa (in pausa L = audio).

## Struttura
- `tools/build_assets.py` + `tools/sheet.py`: legge il pacchetto grafico (cartelle Characters / Stage...), taglia i fotogrammi, toglie sfondi e aloni, scala, allinea i piedi, genera `src/content/sprites.ts`.
- `src/content/defs.ts`: eroi, armi, nemici, ondate, boss (i numeri si cambiano qui).
- `src/entities.ts`: giocatore, nemici, Giova, Ettore.
- `src/scenes/`: Boot, Title, Select, Game (fasi strada e cantina), Result.

## Comandi di sviluppo
```
python3 tools/build_assets.py <cartella_pacchetto> src/content/sprites.ts <cartella_anteprime>
npx tsc --noEmit -p . && npx vite build      # -> dist/index.html (file unico)
python3 tests/play.py /tmp/shots              # partita automatica intera
python3 tests/boss.py /tmp/boss               # solo i due boss
```

## Installazione per lo sviluppo
`npm install` (serve Node.js), poi i comandi sopra.
