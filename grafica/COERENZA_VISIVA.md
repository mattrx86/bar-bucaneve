# BUCA SLUG — Specifica di coerenza visiva

Stato: specifica operativa preliminare. Non modifica gli asset sorgente.

## Obiettivo

Uniformare la resa di tutti gli elementi già esistenti affinché appartengano allo stesso gioco arcade 2D ispirato alla resa Neo Geo / Metal Slug. Il lavoro è di rifinitura e coordinamento, non di redesign.

## Vincolo assoluto: identità e contenuto invariati

Sono da preservare integralmente:
- tutti i personaggi giocabili già presenti;
- tutti i nemici e i boss già presenti;
- tutti i fondali e le ambientazioni già presenti;
- oggetti, armi, casse e props già presenti, salvo la rimozione selettiva degli oggetti scenici casuali richiesta dal direttore creativo.

Non si ridisegnano, reinterpretano, sostituiscono o rigenerano personaggi, nemici, boss o fondali. Non si cambiano volti, capelli, corporatura, abbigliamento, pose caratteristiche, silhouette, composizione degli ambienti o contenuto narrativo. I PNG originali restano sempre intatti e conservati.

## Cosa si può correggere

### 1. Coerenza dei pixel e dei contorni
- Portare gli elementi a una densità di pixel coerente con la risoluzione logica e con la pipeline del gioco.
- Eliminare antialiasing incoerente, aloni chiari, frange semitrasparenti e pixel isolati sui bordi, senza erodere dettagli distintivi.
- Rendere i contorni più leggibili e coerenti per peso e contrasto. Non applicare un contorno nero artificiale uniforme se rischia di deformare la silhouette o chiudere dettagli interni.
- Evitare filtri bilineari e ricampionamenti che producano bordi morbidi. Preferire nearest-neighbor per le trasformazioni pixel.
- Non imporre una quantizzazione cromatica aggressiva: la palette va armonizzata solo dopo confronto visivo con gli originali.

### 2. Personaggi, nemici e boss
- Conservare ogni sprite e ogni frame originale.
- Correggere soltanto resa dei bordi, pixel erratici, alone e coerenza di scala.
- Mantenere identici ingombro, proporzioni, punti di appoggio e registrazione tra i frame.
- Non introdurre nuove pose e non rimuovere dettagli del disegno.
- Le modifiche devono essere reversibili e confrontabili con il PNG originale.

### 3. Fondali
- Conservare integralmente soggetti, architettura, oggetti, disposizione e composizione dei fondali originali.
- Coordinare contrasto, saturazione e luminanza per fare emergere i personaggi senza cambiare l'immagine.
- La resa desiderata è leggermente opaca/slavata e meno contrastata rispetto ai personaggi, come nella reference stilistica approvata dall'utente.
- Non applicare una semplice trasparenza alpha globale al fondale: su un fondale opaco ciò può mostrare il colore di clear del canvas e creare un risultato errato. Simulare l'aspetto opaco tramite correzione tonale e cromatica controllata.
- Non sfocare l'intero fondale.

### 4. Profondità di campo e parallasse
- Prima scelta: separazione in piani soltanto se la struttura originale del fondale lo consente senza ricostruire o inventare parti mancanti.
- Eventuale profondità con differenze moderate di contrasto, saturazione e velocità di parallasse.
- Blur selettivo solo su piani lontani e solo dopo aver verificato che il pixel art non diventi fotografico o morbido.
- Gli elementi gameplay, piattaforme e collisioni devono rimanere perfettamente leggibili e allineati.
- La profondità di campo è un effetto opzionale: la coerenza pixel art viene prima.

### 5. Oggetti scenici e pickup
- Rimuovere solo gli oggetti decorativi casuali posizionati a terra quando interferiscono con la lettura del livello, come richiesto.
- Non rimuovere casse funzionali, pickup, munizioni, oggetti distruttibili o elementi necessari al gameplay.
- Le casse e gli oggetti rimanenti devono avere dimensione leggibile alla risoluzione nativa, densità pixel e peso del contorno coerenti con i personaggi e con il terreno.
- Non ingrandire un asset con interpolazione morbida: usare nearest-neighbor e verificare la silhouette alla scala effettiva di gioco.

### 6. Effetti arcade
- Effetti dedicati e coerenti: muzzle flash, proiettili, impatti, scintille, esplosioni, fumo, polvere, detriti e crateri.
- Animazioni brevi, leggibili e disegnate a frame, con silhouette e palette coerenti.
- Evitare raggi laser o linee moderne non richieste.
- Gli effetti non devono coprire permanentemente i personaggi o rendere il gameplay illeggibile.

## Inventario delle sorgenti grafiche in main

### Personaggi
- `grafica/personaggi/Marco.png`
- `grafica/personaggi/Mattia.png`
- `grafica/personaggi/Daniele.png`
- `grafica/personaggi/paolo.png`
- `grafica/personaggi/Michela.png`
- `grafica/personaggi/Roberto.png`
- `grafica/personaggi/Vero.png`

### Nemici
- `grafica/livello1-strada/gelatai/gelataia.png`
- `grafica/livello1-strada/gelatai/gelataio1.png`
- `grafica/livello1-strada/gelatai/gelataio2.png`
- `grafica/livello1-strada/ubriachi/ubriaca.png`
- `grafica/livello1-strada/ubriachi/ubriaco1.png`
- `grafica/livello1-strada/ubriachi/ubriaco2.png`

### Boss e fondali
- `grafica/livello2-bucaneve/giova.png`
- `grafica/livello2-bucaneve/fondale/esterno.png`
- `grafica/livello3-cantina/boss-ettore/pose.png`
- `grafica/livello3-cantina/boss-ettore/ritratto.png`
- `grafica/livello3-cantina/fondale/cantina.png`
- `grafica/livello1-strada/fondali/1.png` … `4.png`

### Props ed effetti
- `grafica/oggetti/oggetti.png`
- `grafica/oggetti/armi.png`

## Metodo di lavoro obbligatorio

1. Scaricare e archiviare gli originali; non sovrascriverli.
2. Analizzare dimensioni, alpha, palette, densità e scala di ciascuna famiglia.
3. Preparare una tavola comparativa prima/dopo con un campione per famiglia.
4. Verificare i campioni alla risoluzione logica del gioco e allo zoom effettivo.
5. Approvare prima la resa dei personaggi, poi nemici/boss, oggetti/effetti e infine fondali.
6. Applicare le correzioni in batch solo dopo l'approvazione del campione.
7. Integrare gli output in una cartella derivata dedicata; mai sovrascrivere `grafica/` originale.
8. Verificare sprite sheet, frame, baseline, trasparenza, collisioni, build e schermate reali.

## Criterio di approvazione

Un asset è approvato quando, mostrato accanto agli altri asset originali alla scala reale di gioco, conserva esattamente la propria identità e appare parte dello stesso universo visivo: pixel coerenti, contorni puliti, contrasto appropriato, palette armonizzata e leggibilità arcade.
