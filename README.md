# Bar Bucaneve - prototipo 0.8

Run'n'gun stile Metal Slug. Strada di Ponte Arche (gelatai e ubriachi) -> Giova davanti al Bar Bucaneve -> Ettore in cantina.

## Per giocare
Scaricate `bar-bucaneve.html` e apritelo con doppio clic (Chrome, Edge o Firefox). Istruzioni in `LEGGIMI.md`.

## Comandi
Frecce/WASD muovi, J/Z/Ctrl spara (da vicino: pugno), K/X/Spazio salta, L/C bomba, I pugno, Esc/P pausa (in pausa L = audio).

## Struttura
- `grafica/`: **i file originali** (fogli sprite, fondali, oggetti, voci). Qui caricano gli amici; istruzioni in `grafica/LEGGIMI.md`.
- `tools/build_all.sh`: rigenera tutto da `grafica/` e produce `bar-bucaneve.html`.
- `tools/build_assets.py` + `tools/sheet.py`: taglia i fotogrammi, toglie sfondi e aloni, scala, allinea i piedi, unisce i fondali -> `src/content/sprites.ts`.
- `tools/build_extra.py`: oggetti scenici e voci (ffmpeg) -> `src/content/extra.ts`.
- `src/content/defs.ts`: eroi, armi, nemici, ondate, boss (i numeri si cambiano qui).
- `src/entities.ts`: giocatore, nemici, Giova, Ettore.
- `src/scenes/`: Boot, Title, Select, Game (fasi strada e cantina), Result.

## Comandi di sviluppo
```
sh tools/build_all.sh                         # rigenera tutto -> bar-bucaneve.html
npx tsc --noEmit -p . && npx vite build      # -> dist/index.html (file unico)
python3 tests/play.py /tmp/shots              # partita automatica intera
python3 tests/boss.py /tmp/boss               # solo i due boss
```

## Installazione per lo sviluppo
`npm install` (serve Node.js), poi i comandi sopra.
