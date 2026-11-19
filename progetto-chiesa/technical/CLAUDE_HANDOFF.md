# Handoff Claude — Chiesa Gotica

Obiettivo: completare e integrare l'ambientazione gotica come sostituzione visiva della cantina, senza cambiare alcuna meccanica.

## Prima di intervenire
- Analizza il branch più aggiornato del gioco e confrontalo con questo branch.
- Individua dove sono stati caricati i personaggi, la musica e gli SFX dell'utente: potrebbero essere su un branch diverso. Non presumere che le cartelle audio di questo progetto contengano già i file.
- Leggi README, ART_DIRECTION, INTEGRATION_PLAN e ASSET_MANIFEST.
- Verifica le dimensioni reali di ogni SVG e crea una pipeline ripetibile di rasterizzazione/slicing.

## Asset ambiente disponibili
Usa i file SVG in background/, architecture/, tilesets/, props/, altar/ e lighting/ come sorgenti di partenza. Gli atlas sono studi modulari: estrai ogni elemento in PNG trasparente separato, elimina i fondi scuri di preview, preserva pixel netti e crea varianti necessarie per comporre la scena. Non caricare un atlas intero come singolo oggetto in-game.

## Risultato richiesto
- Navata laterale scorrevole con almeno 3 segmenti raccordabili.
- Layer parallax distinti: fondale profondo, finestre/vetrate, architettura, props, foreground.
- Pavimento modulare con tappeto continuo.
- Props collocati su baseline coerenti e con depth sorting.
- Arena finale con altare e vetrata monumentale.
- Fiamme animate e luce calda discreta, senza effetti che compromettano la leggibilità.
- Tutti gli asset registrati in un manifest con dimensioni, pivot, baseline, frame e percorso.

## Vincoli assoluti
Non modificare player, nemici, boss logic, armi, collisioni, input, HUD, punteggi, salvataggi o sistemi di gioco. Non cancellare la cantina originale. Non inventare sprite di Griso o Don Antonio: usare esclusivamente i file forniti dall'utente dopo averli identificati.

## Verifica
Eseguire build e test esistenti, verificare screenshot a risoluzione nativa e zoom 3×, controllare tile seams, trasparenze, layer order e assenza di regressioni. Consegnare elenco file generati e istruzioni per riprodurre la pipeline.
