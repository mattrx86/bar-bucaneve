# BUCA SLUG - prototipo 1.3

Run'n'gun stile Metal Slug. Strada di Ponte Arche (gelatai e ubriachi) -> Giova davanti al Bar Bucaneve -> Ettore in cantina.

## Per giocare
Scaricate `bar-bucaneve.html` e apritelo con doppio clic (Chrome, Edge o Firefox). Istruzioni in `LEGGIMI.md`.

## Comandi
**Un giocatore**: frecce/WASD muovi, J/M/Z/Ctrl spara (da vicino: pugno), K/X/Spazio salta, L/C bomba, I pugno, Esc/P pausa (in pausa L = audio).

**Due giocatori sulla stessa tastiera** (nel menu: "2 GIOCATORI" o tasto 2):

| | muove | spara | salta | bomba | pugno |
| --- | --- | --- | --- | --- | --- |
| **1P** | frecce | M | L | K | J |
| **2P** | W A S D | 1 | 2 | 3 | 4 |

**Touch** (telefono/tablet): croce a sinistra, SPARA/SALTA/BOMBA/PUGNO a destra, pausa e schermo intero in alto. Compare da solo su schermi touch.

## Struttura
- `grafica/`: **i file originali** (fogli sprite, fondali, oggetti, voci). Qui caricano gli amici; istruzioni in `grafica/LEGGIMI.md`.
- `tools/build_all.sh`: rigenera tutto da `grafica/` e produce `bar-bucaneve.html`.
- `tools/build_assets.py` + `tools/sheet.py`: taglia i fotogrammi, toglie sfondi e aloni, scala, allinea i piedi, unisce i fondali -> `src/content/sprites.ts`.
- `tools/build_extra.py`: oggetti scenici e voci (ffmpeg) -> `src/content/extra.ts`.
- `src/content/defs.ts`: eroi, armi, nemici, ondate, boss (i numeri si cambiano qui).
- `src/entities.ts`: giocatore, nemici, Giova, Ettore.
- `src/scenes/`: Boot, Title, Select, Game (fasi strada e cantina), Result.
- `richieste/`: **richieste di modifica degli amici** (istruzioni + materiali). Le eseguo solo quando me lo dite; vedi `richieste/LEGGIMI.md`.

## Novità 1.3
- **Il gioco si chiama BUCA SLUG** (titolo, scheda del browser, documenti). Il file resta `bar-bucaneve.html` come il repository, così i vostri link non cambiano; "Bar Bucaneve" è il locale vero dove arriva Giova.
- **Schermata del titolo** con la vostra grafica (`grafica/titolo/schermata.png`, ridotta a 576x324 con pixel netti) e titolo/menu su veli scuri per leggersi bene.
- **Nomi**: Fole (Roberto), Sgan (Mattia), Dandan (Daniele), Paul (Paolo), Ganzoia (Marco), Pippa (Michela), Vero (Veronica), Giovanni (Giova). Cambiano solo i nomi mostrati; i nomi dei file e degli id restano gli stessi, quindi cartelle e voci già caricate funzionano.
- **Audio per stadio**: le voci si mettono in `grafica/voci/strada`, `grafica/voci/bucaneve` o `grafica/voci/ettore` e suonano solo in quello stadio (le voci derivate da prefisso `giova_`/`ettore_` seguono lo stesso criterio). Un file chiamato `sottofondo <nome>` diventa musica di quello stadio (`sottofondo boss giova` parte quando entra Giovanni). `.mp4` accettato come estensione.
- **Musica del menu** (`grafica/musica/Menu.mp3`) in titolo e selezione; parte al primo tasto o clic (il browser non permette l'audio prima).
- **Suoni delle armi con spari veri**: campioni CC0 del pacchetto "25 CC0 bang / firework SFX" di rubberduck (OpenGameArt), in `grafica/sfx/` con `CREDITI.md` e licenza. Pistola, mitra, fucile, lanciarazzi, esplosioni, schianto della moto e doppietta di Ettore (due botti ravvicinati e più gravi). Ogni colpo sceglie una variante a caso con piccola variazione d'intonazione. I suoni sintetizzati restano a basso volume come rinforzo dei bassi e come ripiego. Nota: non posso ascoltare l'audio, i livelli sono normalizzati ma vanno giudicati a orecchio.

## Novità 1.2
- **Lanciafiamme tolto** da armi, casse, icone, suoni e logica (la cassa a x=2325 ora contiene il fucile a pompa).
- **Punto di sparo corretto**: in corsa i colpi nascevano all'altezza della testa. Il difetto era doppio: la 1.0 forzava la quota della posa di tiro, e la misura della canna nei fotogrammi di corsa trovava il naso (che sporge più della pistola, tenuta sotto il mento). Ora la misura in corsa guarda sotto il mento e `Player.bocca()` usa la canna misurata sul fotogramma mostrato. Verificato su 7 eroi x 10 pose x 2 versi (`tests/arma_mano.py`).
- **Mitragliatrice in mano** (`grafica/personaggi/Mitragliatrice...png`): sovrapposta alla mano, segue posa, verso e (in alto) rotazione; i colpi escono dalla sua canna. Ancoraggio in `ARMA_MANO` (`src/content/defs.ts`). Fucile e lanciarazzi non hanno ancora il disegno in mano (vedi la richiesta a ChatGPT nel rapporto).
- **Colori dei proiettili per personaggio**: mappa unica in `src/content/colori.ts` (Vero viola, Michela rosa, Roberto azzurro, Marco verde, Daniele arancione, Paolo rosso, Mattia invariato). Al caricamento si crea una copia ricolorata di proiettile, razzo, granata e lampo di bocca: cambia solo la tinta dei pixel colorati, contorni, riflessi e grigi restano. Verificato su tutte le armi (`tests/colori.py`).
- **Suoni delle armi riscritti** (`src/core/audio.ts`): ogni arma è un insieme di strati (scatto, corpo, colpo grave, coda) generati dal codice, con piccola variazione d'intonazione a ogni colpo, posizione stereo secondo la posizione sullo schermo, limitatore in uscita, pausa minima per suono e tetto agli strati contemporanei. (Dalla 1.3 sopra questi strati suonano campioni reali, vedi Novità 1.3.)
- **Doppietta di Ettore**: suono nuovo a due canne (due botti a 0,10 s, molto più grave del fucile del giocatore) con scatto di apertura; la prima scarica di una serie è piena, le successive al 75%. Il ventaglio ha una variante con fischio d'aria.
- **Ettore** cammina al doppio della velocità (92 px/s, animazione al doppio); i tempi di preavviso degli attacchi non sono cambiati.
- **Moto CRE**: appena Ettore perde la prima delle tre barre di vita (66,7%) afferra la moto e la scaglia (foglio di 14 fotogrammi, i primi 11 usati in ordine). Parte una volta sola (flag impostato subito, quindi anche con danni enormi in un colpo), preavviso di circa 1,6 s con un mirino a terra, traiettoria ad arco, 32 di danno in volo oppure allo schianto, esplosione, e poi riprende il comportamento normale. Le fasi 2 e 3 aspettano la fine dell'evento. Prova: `tests/ettore_moto.py`.
- **Bottiglia** verde originale (`grafica/oggetti/Bottiglia Verde Pixel Art.png`) per gli ubriachi della strada, con area di impatto di 9 px.
- **Strada**: 14 oggetti nuovi (`Sprite di strada urbana rétro.png`, sfondo tolto per colore) e la pila di casse: 5 si rompono sparando (pila di casse, distributore, bagno chimico, bancale, quadro elettrico che esplode) e 9 sono scenografia di sfondo che non intralcia né ferma i colpi. Posizioni in `PROPS_STRADA`.

## Novità 1.1
- **Musica**: ora si usano i brani veri (`grafica/musica/*.mp3`), interi e non più trasformati in suoneria a onde quadre. Il build li ricomprime in mp3 stereo a 80 kbit e li porta tutti allo stesso livello (loudnorm -16 LUFS); in gioco suonano a volume basso (`VOL_MUSICA` in `src/core/audio.ts`, 0,25), sotto a voci ed effetti, e si abbassano ancora mentre parla un personaggio. `tools/chiptune.py` resta nel progetto ma non è più usato.
- **Due giocatori sulla stessa tastiera**: punti, vite, armi e barra della vita separati; la camera segue chi è più avanti; chi finisce le vite resta fuori finché l'altro è vivo, se cadono entrambi parte il CONTINUE. Ettore prende di mira uno dei due a caso a ogni attacco, e le bottiglie cadono su entrambi. In due i boss hanno più vita (Giova x1,5, Ettore x1,6) e i nemici attaccano un po' più spesso (x1,15). In classifica entra ogni giocatore col suo punteggio.
- **Comandi touch**: pannello HTML sopra il gioco (`src/core/touch.ts`), multi-touch vero (si muove, spara e salta insieme). Su telefono il primo tocco mette lo schermo intero e prova a bloccare l'orientamento orizzontale.
- **Pad**: il supporto al pad era documentato ma non era mai collegato; ora il primo pad comanda 1P (e il menu) e il secondo comanda 2P.
- **Ettore più duro**: vita da 1500 a 3200; cadenza di fuoco misurata da 22,7/29,6 a 36,9/45,3 scariche al minuto (fasi 1 e 2, riportate a 60 fps); una scarica in più prima di ricaricare in ogni fase, pause tra le serie e ricarica più corte, preavviso ridotto di circa 0,1 s (resta sopra 0,55 s). Il "!" prima di ogni attacco c'è sempre.

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
