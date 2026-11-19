# Bar Bucaneve - prototipo 1.0

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
- `richieste/`: **richieste di modifica degli amici** (istruzioni + materiali). Le eseguo solo quando me lo dite; vedi `richieste/LEGGIMI.md`.

## Novità 1.0 (collaudo e messa a punto arcade)
- **Scossa della camera**: era 9 volte più forte del previsto. `camera.shake()` moltiplica l'"intensità" per la larghezza del canvas (1152) e di nuovo per lo zoom: un colpo subito spostava lo schermo di 24 px logici (72 a schermo) e, siccome i fondali sono alti esattamente 216 px, scopriva il nero sopra e trascinava l'HUD. Ora `scuoti()` prende l'ampiezza **in pixel di gioco**, è solo orizzontale, cala nel tempo e resta dentro i bordi del mondo.
- **Camera**: tolto il salto di schermo. Quando un'ondata finiva, il blocco cadeva di colpo e la camera si teleportava fino a 222 px (misurati 106 px in un fotogramma). Ora recupera il ritardo a velocità limitata (300 px/s). Scorrimento e sprite agganciati alla griglia dei pixel d'arte (`pix()` in `defs.ts`) e smorzamento dell'arena indipendente dal frame rate.
- **Ettore** in tre fasi con quattro attacchi (mirato, ventaglio con varco, bottiglie dall'alto su mirini a terra, bottiglia che rotola), pallettoni da 270 a 330/375/420 px/s, ricarica e pause più corte, preavviso contato in secondi veri (prima il moltiplicatore di velocità della fase 2 lo accorciava).
- **Difficoltà**: il gelataio correva a 68 px/s contro i 112 del giocatore, quindi bastava tenere premuto "destra" per non essere mai raggiunti: ora 86 (tallona senza sorpassare), kamikaze 48, lanciagelati 52. Cadenze dei nemici più strette, ondate più numerose e con più ingressi da sinistra, moltiplicatore `fretta` crescente ondata per ondata, invulnerabilità dopo un colpo da 1 s a 0,75 s, e una nuova manopola `aggressivita` per difficoltà (FACILE 0,72 · NORMALE 1 · DIFFICILE 1,2). La vita dei nemici non è stata toccata.
- **Colpi e riquadri**: i proiettili ora si cercano lungo il tratto percorso nel fotogramma e non più nel solo punto di arrivo (a 520 px/s ne saltavano uno ogni due su bersagli larghi 20 px); riquadri dei nemici da 20x48 a 24x56 (prima testa e cappello erano immuni), Giova 34x76, Ettore 64x116.
- **Canna del giocatore**: correndo la quota del tiro si abbassava di 15 px e oscillava fino a 9 px da un fotogramma all'altro; ora la quota è fissa a quella della posa di tiro.
- **Ettore da vicino**: la canna disegnata sporge 100 px dal centro, così standogli addosso i pallettoni nascevano già alle spalle del giocatore (8 scariche su 15 sprecate). Ora l'uscita si accorcia con la distanza e sotto i 62 px risponde con una botta di calcio della doppietta.
- **Esplosioni**: il disegno copriva un terzo del raggio che uccide; ora è al doppio della scala (multiplo intero, pixel netti) con due scoppi secondari sfalsati.
- **Oggetti distruttibili**: rimessi in numero ridotto e in posizioni scelte (bombole e fusti esplosivi prima delle ondate grosse), ingranditi del 30% (`SCALA_OGGETTI` in `build_extra.py`), con scossa e micro-pausa anche quando si rompono senza esplodere. In cantina nessuno: farebbero da scudo a Ettore.

## Novità 0.9
- Contorno scuro a gradini su tutti i personaggi, fondali leggermente meno saturi (pipeline pixel v1).
- Ettore: niente più linea rossa; avviso "!" prima di ogni mira, seconda fase con 3 raffiche; lampo quando colpito limitato a uno ogni 150 ms.
- Tolti gli oggetti scenici sparsi su strada e cantina.
- Casse più grandi (30 px); l'animazione di apertura mantiene la scala della cassa chiusa.
- Percorso di `giova.png` con ripiego sul vecchio percorso; strumento anteprime `tools/visual_lab.py`.

## Comandi di sviluppo
```
sh tools/build_all.sh                         # rigenera tutto -> bar-bucaneve.html
npx tsc --noEmit -p . && npx vite build      # -> dist/index.html (file unico)
python3 tests/play.py /tmp/shots              # partita automatica intera
python3 tests/boss.py /tmp/boss               # solo i due boss
```

## Installazione per lo sviluppo
`npm install` (serve Node.js), poi i comandi sopra.
