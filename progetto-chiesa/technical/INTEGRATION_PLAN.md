# Piano di integrazione tecnica

## Stato attuale osservato
Il progetto usa Phaser 4.2.1, TypeScript e Vite. La viewport logica è 384×216, zoom 3×, densità artistica 1.5 e terreno a Y=180. La scena di gioco carica attualmente i fondali da `BG.street` o `BG.cellar` e disegna le parti a intervalli di 512 unità. `BootScene` carica le immagini definite in `BG`.

## Obiettivo d'integrazione
La chiesa sostituirà l'ambientazione della fase attualmente denominata `cantina`. Per minimizzare il rischio, mantenere inizialmente invariato il contratto di avvio della fase e la progressione esistente; la sostituzione deve riguardare fondali, layer, props e presentazione ambientale, non la logica di gioco.

## Architettura suggerita
1. Aggiungere una definizione `BG.church` o equivalente in `src/content/sprites.ts`, senza eliminare `BG.cellar`.
2. Caricare gli asset della chiesa in `BootScene.preload()` usando chiavi con prefisso `church_`.
3. Creare un modulo dedicato, ad esempio `src/scenes/church/ChurchEnvironment.ts`, responsabile solo di rendering ambientale, layer e animazioni.
4. Istanziare il modulo dalla scena di gioco quando la fase corrente è quella oggi chiamata `cantina`.
5. Lasciare a `GameScene` il controllo della camera e della progressione. I layer devono seguire la camera con fattori di scroll differenziati, senza alterare coordinate del mondo o collisioni.
6. Tenere props decorativi fuori da `this.props` e da ogni sistema di danno/collisione, salvo richiesta esplicita successiva.
7. Implementare le fiamme come sprite animation o atlas/spritesheet; sfasare i tempi di partenza per evitare sincronizzazione.
8. Per il flicker, usare piccoli overlay/additive light sprites o una funzione di alpha/scale per singola sorgente. Evitare shader o pipeline custom se non già supportati dal progetto.
9. La vetrata può avere un overlay cromatico animato separato; non applicare filtri globali alla scena che compromettano la leggibilità.

## Parallasse
Layer suggeriti:
- L0: fondale lontano, pareti e finestre (scroll factor basso).
- L1: dettagli di fondo, statue e quadri (scroll factor intermedio).
- L2: architettura principale, colonne e archi (coerente col piano del mondo).
- L3: props in primo piano (scroll factor leggermente superiore, solo se non coprono l'azione).
- L4: polvere e pulviscolo (scroll factor basso o nullo, profondità controllata).

Non applicare parallasse alla superficie di gioco/terreno in modo da creare slittamento rispetto ai personaggi.

## Sicurezza d'integrazione
- Non rinominare la fase `cantina` finché tutti i punti che la referenziano non sono stati aggiornati e testati.
- Non rimuovere asset o codice della cantina durante la prima integrazione.
- Non modificare entità, armi, nemici, boss, collisioni, input, HUD, salvataggi o punteggi.
- Gli asset di Griso e Don Antonio saranno integrati soltanto dopo la loro consegna.
- Non dichiarare il lavoro verificato senza eseguire `npm run build` e un controllo visivo nel gioco.

## Test richiesti
- Build TypeScript/Vite senza errori.
- Ingresso, navata e altare raccordati.
- Camera e parallasse senza jitter.
- Personaggi e proiettili leggibili davanti a ogni layer.
- Decorazioni senza collider e senza interazioni involontarie.
- Animazioni fiamme indipendenti e loop senza scatti.
- Arena finale interamente visibile nella progressione prevista.
