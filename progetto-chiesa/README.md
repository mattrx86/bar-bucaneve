# Chiesa Gotica — pacchetto ambiente

## Stato consegna
Sono presenti i primi asset modulari vettoriali a geometria pixelata (SVG, `shape-rendering: crispEdges`), organizzati per funzione. Sono sorgenti grafici di partenza, non ancora sprite PNG rasterizzati né integrati nel gioco.

## Asset presenti
- `background/church_parallax.svg`: fondale lungo della navata, muratura, colonne e finestre.
- `architecture/gothic_modules.svg`: moduli di colonne, archi, portali e finestre.
- `tilesets/floor_carpet.svg`: pavimentazione in pietra e tappeto.
- `props/church_props.svg`: panca, candeliere, croce, quadro, statua e arredi.
- `altar/altar_and_rosette.svg`: altare e rosone/vetrata di fondo.
- `lighting/candle_flame.svg`: tre pose di fiamma per animazione ambientale.

## Regole di integrazione
1. Non modificare gameplay, collisioni, armi, personaggi giocabili, nemici, boss, HUD, input o salvataggi.
2. Non sovrascrivere gli asset della cantina: sostituire solo l'ambientazione dopo test.
3. Prima rasterizzare gli SVG in PNG alla scala richiesta dal progetto; usare nearest-neighbour per ogni successivo ridimensionamento. Non applicare antialiasing.
4. Ritagliare i singoli moduli dagli atlas usando le coordinate visibili nel viewBox e documentare ogni rettangolo sorgente nel manifest.
5. Verificare trasparenze, baseline e tile seams in Phaser. Gli SVG qui presenti hanno sfondo scuro di riferimento: rimuoverlo/mascherarlo quando si estraggono gli sprite trasparenti.
6. Mantenere il contratto tecnico della fase esistente finché il nuovo scenario non è stato validato.

## Da completare prima della release
- Rasterizzazione e slicing in PNG trasparenti.
- Varianti aggiuntive di panche, statue, candelabri e detriti.
- Vetrata completa ad alta leggibilità e layer luce separati.
- Loop di fiamma e tremolio luce.
- Test di continuità del fondale e del pavimento.
- Integrazione nel livello e test build.

## Personaggi e audio
Gli asset dei personaggi, le musiche e gli effetti sonori forniti dall'utente devono essere mantenuti intatti. Prima di integrarli, individuare i file effettivi nel branch sorgente e registrare i percorsi nel manifest. Non duplicare file già presenti nel progetto.
