# HOLY SLUG — pacchetto grafico e handoff

Holy Slug è il livello successivo a Buca Slug. Questa cartella raccoglie i riferimenti originali forniti dall'utente e il kit grafico preliminare per costruire la chiesa gotica.

## Asset grafici disponibili
- `background/church_parallax.svg` — composizione della navata.
- `background/entrance_portal.svg` — ingresso monumentale.
- `architecture/gothic_modules.svg` — moduli architettonici.
- `parallax/parallax_layers.svg` — fondale, archi e pavimento su gruppi distinti.
- `tilesets/floor_carpet.svg` — pavimento e tappeto.
- `tilesets/stone_floor_variants.svg` — 4 tile 64×64.
- `props/church_props.svg` — props di chiesa.
- `foreground/foreground_props.svg` — elementi di primo piano.
- `altar/altar_and_rosette.svg`, `altar/altar_front_detail.svg` — altare e dettagli.
- `stained-glass/great_rose_window.svg` — rosone gotico policromo.
- `lighting/candle_flame.svg`, `animations/flames_and_candles.svg` — fiamme e strip animata.

## Riferimenti personaggi originali
- `characters/chierichetto/` — 2 PNG.
- `characters/don-antonio/` — 11 JPEG di riferimento.
- `characters/griso/` — 1 PNG.
- `characters/suora/` — 2 PNG.

Queste immagini sono riferimenti originali, non necessariamente spritesheet pronti per Phaser. Non sostituirle con personaggi inventati.

## Stato reale
Il kit ambientale è composto da sorgenti SVG modulari. Non è ancora una libreria PNG rasterizzata e testata nel gioco. Claude deve completare rasterizzazione, slicing, trasparenze, pivot, baseline e integrazione, documentando ogni esportazione nel manifest. I riferimenti personaggi devono essere ispezionati e validati; non presumere che siano sprite runtime.

## Procedura
1. Leggere `technical/CLAUDE_HANDOFF.md` e `asset-manifest/ASSET_MANIFEST.md`.
2. Rasterizzare in PNG con pixel netti e trasparenza reale.
3. Estrarre atlas e gruppi in asset indipendenti.
4. Verificare tile seams, dimensioni, pivot e baseline a 384×216 logici.
5. Integrare solo dopo aver verificato il branch principale e senza modificare Buca Slug.
6. Eseguire build, test e una partita completa di Holy Slug.

Non considerare il progetto pronto solo perché gli SVG sono presenti: il livello deve essere effettivamente giocabile dall'inizio alla fine.
