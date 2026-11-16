# BUCA SLUG — Art Direction

Versione: 0.1  
Stato: standard di riferimento per la produzione e revisione degli asset.

## 1. Riferimento artistico

La reference approvata è lo screenshot arcade fornito dal direttore creativo: personaggi leggibili e molto dettagliati, contorni scuri, ombreggiatura a gruppi di pixel, fondali materici e meno contrastati, effetti di combattimento disegnati come sprite dedicati.

L'obiettivo è una pixel art 2D da run-and-gun arcade anni Novanta, con identità originale BUCA SLUG. Non usare filtri automatici per simulare la pixel art e non mescolare stili pittorici differenti.

## 2. Vincoli tecnici del progetto

Valori attualmente presenti nella pipeline:
- Risoluzione logica: 384 × 216.
- Zoom di rendering: 3×.
- Densità massima delle texture: 1,5 pixel texture per pixel logico (`DMAX = 1.5`).
- Altezza di riferimento degli eroi: 54 pixel logici.
- Altezza di riferimento Ettore: 120 pixel logici.
- Il motore e le coordinate di gioco devono restare invariati durante la prima fase di uniformazione artistica.

A densità 1,5, un pixel della texture occupa circa 2 × 2 pixel sul rendering a schermo. Tutti gli asset che condividono la scena devono rispettare questa densità, salvo eccezioni motivate e documentate.

## 3. Linguaggio visivo

### Personaggi
- Silhouette immediatamente distinguibile anche a dimensione di gioco.
- Contorno scuro coerente, generalmente di un pixel della texture.
- Ombre a blocchi e piani cromatici leggibili; evitare gradienti morbidi e antialiasing.
- Dettagli interni sufficienti a caratterizzare volto, abbigliamento, equipaggiamento e animazione.
- Orientamento standard verso destra.
- Proporzioni, altezza e punto d'appoggio coerenti tra tutti i frame della stessa animazione.
- Nessun alone chiaro o bordo sporco attorno alla trasparenza.

### Fondali
- Maggiore ricchezza di texture rispetto a una semplice illustrazione piatta.
- Saturazione e contrasto moderati rispetto ai personaggi in primo piano.
- Profondità ottenuta con valori, palette e dettaglio, non con sfocatura fotografica.
- Pavimento e linea di appoggio devono combaciare con `GROUND_Y`.
- Evitare dettagli ad alto contrasto dietro alle sagome dei giocatori e agli elementi HUD.

### Oggetti e casse
- Stessa densità di pixel, contorno e logica di ombreggiatura dei personaggi.
- Dimensione apparente adeguata alla risoluzione di gioco: evitare oggetti troppo piccoli o dettagliati in modo illeggibile.
- Trasparenza pulita e punto di appoggio coerente con il terreno.
- Gli oggetti scenici non devono confondersi con pickup e casse funzionali.

### Effetti
- Proiettili, lampi di bocca da fuoco, scintille, esplosioni e fumo devono essere sprite dedicati quando disponibili.
- Animazioni frame-by-frame con silhouette leggibile a ogni fotogramma.
- Durata, scala e punto d'origine coerenti con l'arma o l'evento che li genera.
- Evitare raggi, linee o indicatori moderni se non appartengono al linguaggio visivo del gioco.

## 4. Regole per gli sprite sheet

La pipeline legge le pose in righe e nell'ordine indicato in `grafica/LEGGIMI.md`. Non cambiare numero, ordine o disposizione delle pose senza aggiornare insieme documentazione, parser e codice che usa i nomi dei frame.

Conteggi attuali:
- Eroi: 27 pose in 5 righe.
- Gelatai, ubriachi e Giova: 13 pose in 3 righe.
- Ettore: 17 pose in 4 righe.
- Oggetti scenici: 38 oggetti in 5 righe.

Per ogni foglio:
- mantenere la stessa scala in tutte le pose;
- lasciare spazio sufficiente tra componenti adiacenti;
- evitare che ombre, fumo o effetti di una posa tocchino la posa vicina;
- non cambiare dimensioni del personaggio tra frame;
- mantenere i piedi allineati alla stessa baseline, salvo salti o pose esplicitamente aeree;
- usare PNG RGBA trasparente quando possibile.

## 5. Processo di approvazione

Ogni nuova famiglia di asset va verificata prima di sostituire quella esistente:

1. Preparare un campione piccolo ma rappresentativo.
2. Elaborarlo con la pipeline reale del repository.
3. Confrontarlo a dimensione nativa di gioco, non soltanto ingrandito.
4. Verificare trasparenza, contorni, baseline, densità e leggibilità.
5. Integrarlo su un fondale reale e accanto a un personaggio già approvato.
6. Solo dopo l'approvazione, estendere lo standard agli altri asset.

## 6. Vincoli di manutenzione

- `grafica/` resta la sorgente originale degli asset.
- `src/content/sprites.ts` e `src/content/extra.ts` sono file generati: non modificarli manualmente.
- Prima di cambiare `tools/build_assets.py` o `tools/sheet.py`, verificare tutte le famiglie di asset che dipendono dalla funzione interessata.
- Non modificare la risoluzione logica, lo zoom o le collisioni durante il solo lavoro di art direction.
- Ogni modifica deve essere verificata con la build e con screenshot del gioco.
- Lavorare su branch dedicato e proporre le modifiche tramite Pull Request; non intervenire direttamente su `main`.

## 7. Criterio di qualità

Un asset è approvabile soltanto se, inserito nella schermata di gioco, sembra appartenere allo stesso universo visivo degli altri: stessa scala dei pixel, peso del contorno, livello di dettaglio, palette, illuminazione e qualità dell'animazione. La somiglianza a una reference non deve compromettere la leggibilità o l'identità originale di BUCA SLUG.
