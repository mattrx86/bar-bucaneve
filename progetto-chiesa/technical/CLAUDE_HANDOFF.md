# HANDOFF CLAUDE — HOLY SLUG

Holy Slug è il livello successivo a Buca Slug. Deve essere giocabile dall'inizio alla fine e avere lo stesso grado di completezza raggiunto da Buca Slug. Questo branch contiene ora riferimenti originali dei personaggi e un primo kit grafico SVG più articolato. Non è ancora un pacchetto PNG pronto runtime.

## Prima di intervenire
1. Analizza il branch di gioco più aggiornato e studia Buca Slug.
2. Confronta questo branch con il branch principale; non sovrascrivere il lavoro più recente.
3. Leggi `README.md`, `art-direction/ART_DIRECTION.md`, `technical/INTEGRATION_PLAN.md` e `asset-manifest/ASSET_MANIFEST.md`.
4. Esamina TUTTE le immagini originali in `characters/`. Ci sono 2 PNG del chierichetto, 11 JPEG di Don Antonio, 1 PNG di Griso e 2 PNG della suora. Sono riferimenti caricati dall'utente: non inventare design sostitutivi e non scartarli.
5. Cerca nel repository e nei branch tutti i file audio caricati dall'utente; non presumere che siano già copiati in `audio/`.

## Kit grafico presente
- `background/church_parallax.svg`: composizione navata.
- `background/entrance_portal.svg`: portale d'ingresso.
- `architecture/gothic_modules.svg`: moduli gotici.
- `parallax/parallax_layers.svg`: gruppi separati per fondale, archi intermedi e pavimento.
- `tilesets/floor_carpet.svg` e `tilesets/stone_floor_variants.svg`: pavimento e tappeto.
- `props/church_props.svg`: atlas props.
- `foreground/foreground_props.svg`: panca, candelabro, detriti e drappo.
- `altar/altar_and_rosette.svg` e `altar/altar_front_detail.svg`: altare.
- `stained-glass/great_rose_window.svg`: rosone policromo.
- `lighting/candle_flame.svg` e `animations/flames_and_candles.svg`: fiamme.

## Obbligo: pipeline asset
1. Rasterizza ogni SVG a risoluzione pixel-art nativa appropriata, senza antialiasing.
2. Estrai i gruppi con id in PNG separati con trasparenza alpha.
3. Gli SVG con più gruppi sono atlas/sorgenti: NON usarli come un singolo sprite.
4. Per i tiles 64×64 della strip `stone_floor_variants.svg`, estrai esattamente i 4 riquadri indicati.
5. Per `flames_and_candles.svg`, i primi quattro frame fiamma sono 32×48 ciascuno; estraili in PNG separati o in spritesheet verificato.
6. Controlla che i fondi siano realmente trasparenti e che non restino rettangoli scuri di preview.
7. Aggiungi al manifest ogni PNG esportato con dimensioni, pivot, baseline, frame e percorso.

## Personaggi
- Usa i riferimenti originali dell'utente in `characters/don-antonio/` e `characters/griso/`.
- Determina quale immagine di Don Antonio è il riferimento definitivo prima di produrre sprite o animazioni.
- Non ridisegnare o alterare identità, proporzioni e dettagli caratteristici dei boss.
- La presenza di immagini di riferimento NON significa che esistano già spritesheet pronti per il gioco: verificarne formato, trasparenza e frame.

## Gameplay e non regressione
Holy Slug deve diventare un vero secondo livello: ingresso, navata scorrevole, incontri, ondate, ostacoli, arena altare, boss Griso e Don Antonio, vittoria e transizione di campagna. Riutilizza i sistemi di Buca Slug senza cambiare player, armi, nemici esistenti, collisioni, input, HUD, punteggi o salvataggi. Non cancellare la cantina originale.

## Collaudo
Eseguire build e test esistenti, provare il livello dall'inizio alla fine, verificare tile seams, layer order, trasparenze, baseline, animazioni, audio e assenza di regressioni. Consegnare screenshot e lista di file effettivamente integrati. Non dichiarare il livello completo se è soltanto una scena statica o se gli asset sono ancora sorgenti non rasterizzate.
