# Progetto Chiesa Gotica — Bar Bucaneve

Questa cartella raccoglie esclusivamente la progettazione e gli asset del nuovo scenario **Chiesa Gotica**, destinato a sostituire visivamente e come ambientazione l'attuale livello della cantina.

> **Stato:** handoff artistico/tecnico in preparazione. Non è ancora integrato nel gioco e non contiene ancora gli sprite finali di Griso e Don Antonio.

## Regole fondamentali
- Non modificare strada, personaggi giocabili, nemici, armi, collisioni, combattimento, HUD o logica dei boss già esistente.
- Non sovrascrivere gli asset della cantina: conservarli finché il nuovo scenario non è integrato e verificato.
- La chiesa deve riutilizzare il flusso di caricamento e rendering già adottato dal progetto.
- Griso e Don Antonio arriveranno come asset separati in un secondo momento: predisporre lo spazio, non inventare né disegnare versioni definitive.
- Gli elementi ambientali devono restare indipendenti dai personaggi e dalle entità di gameplay.

## Specifiche di riferimento
- Gioco: Phaser 4.2.1 + TypeScript + Vite.
- Coordinate logiche: 384 × 216.
- Zoom: 3×.
- Densità artistica di riferimento: DENSITA = 1.5; aggancio alla griglia tramite `pix()`.
- Linea del terreno attuale: GROUND_Y = 180.
- Pipeline esistente: sorgenti in `grafica/`, elaborazione tramite `tools/build_assets.py`, contenuti generati in `src/content/`.

## Cartelle
- `art-direction/`: direzione artistica e criteri di accettazione.
- `technical/`: integrazione prevista nel codice.
- `asset-manifest/`: elenco degli asset richiesti e stato.
- `reference/`: immagini di riferimento e studi preliminari.
- `background/`, `architecture/`, `foreground/`, `props/`, `altar/`, `stained-glass/`, `animations/`, `lighting/`, `parallax/`, `tilesets/`: destinazioni degli asset finali.

Le cartelle saranno popolate con PNG e sorgenti effettivi quando gli asset modulari saranno pronti. Non considerare una tavola di presentazione come uno spritesheet pronto per il gioco.
