# Direzione artistica — Chiesa Gotica

## Obiettivo
Sostituire la cantina come ambientazione con una chiesa medievale gotica lugubre, attraversabile in orizzontale, che culmina in un'arena boss dominata da un grande rosone/vetrata.

## Linguaggio visivo
- Pixel art dipinta, densa e leggibile, con silhouette nette e pixel coerenti con gli asset esistenti.
- Riferimento estetico: arcade run-and-gun anni Novanta / Metal Slug; evitare imitazioni letterali di asset proprietari.
- Pietra basaltica/grigio-bruna, legno quasi nero, ferro brunito, tessuti cremisi; luci calde delle candele e accenti freddi/cromatici dalla vetrata.
- Texture costruite a pixel: blocchi di pietra, crepe, giunti, bordi consumati, fuliggine e detriti.
- Evitare blur, gradienti digitali morbidi, antialiasing, texture fotografiche e resa 3D.

## Composizione e leggibilità
- Il piano di gioco e la fascia in cui si muovono personaggi/proiettili devono rimanere relativamente puliti.
- Colonne, panche e candelabri in primo piano non devono coprire stabilmente i personaggi.
- Dettagli ad alto contrasto e vetrata riservati soprattutto allo sfondo e all'arena.
- Variare finestre, quadri, statue, drappi e danni murari per evitare pattern ripetuti evidenti.

## Progressione ambientale
1. **Ingresso:** portone monumentale in legno ferrato, soglia in pietra e luce fredda proveniente dall'esterno.
2. **Navata:** moduli architettonici raccordabili, archi a sesto acuto, colonne, finestre laterali, panche, statue, quadri, drappi, candelabri e tappeto.
3. **Altare / arena:** composizione unica e più monumentale, grande vetrata policroma, altare, candelabri e luce colorata proiettata sulla pietra.

## Arena boss
L'arena deve essere riconoscibile già da lontano. La vetrata occupa una parte importante della parete di fondo e rimane leggibile anche nella viewport 384×216. L'altare è un elemento scenografico di sfondo: non deve interferire con la superficie di movimento.

I personaggi Griso e Don Antonio saranno forniti successivamente. Non creare design sostitutivi e non vincolare le loro dimensioni o posizioni a sprite non ancora ricevuti.

## Standard di produzione
- Trasparenza reale per props e layer sovrapponibili.
- Pixel art a risoluzione nativa: niente upscaling per simulare dettaglio.
- Pivot documentati, origine coerente e piedi/allineamenti verificabili.
- Palette condivisa e contorni coerenti con i personaggi del gioco.
- Animazioni brevi in loop, con frame discreti e leggibili.
