# Prompt per generare i fondali dipinti della chiesa

Da usare con un generatore di immagini (ChatGPT immagini, Gemini, Midjourney...) **nella stessa conversazione**,
un pezzo alla volta, nell'ordine. Salvate ogni risultato con il nome indicato in `progetto-chiesa/fondali/`.
Regole tecniche: vedi `LEGGIMI.md` in questa cartella.

---

## 1. Prompt di stile (da incollare per primo, una volta sola)

> Stiamo creando i fondali di un videogioco run-and-gun a scorrimento orizzontale in stile arcade Neo Geo anni '90
> (il riferimento è il livello di dettaglio di Metal Slug, ma **senza copiare scene, edifici o elementi di quel gioco**).
> Ambientazione: l'interno di una chiesa gotica di montagna, antica, buia, un po' in rovina.
>
> Stile obbligatorio per tutte le immagini:
> - pixel art dipinta a mano, densissima di dettagli, pixel netti e grandi (come una schermata arcade 304×224 ingrandita),
>   niente sfocature, niente sfumature digitali morbide, niente resa 3D o fotografica;
> - vista laterale piatta da palcoscenico, nessuna prospettiva a punto di fuga, il pavimento è una fascia orizzontale;
> - pietra grigio-bruna con blocchi, giunti, crepe, muschio, fuliggine, intonaco scrostato; legno quasi nero; ferro
>   brunito; tessuti cremisi e oro consumati;
> - luce calda di candele e bracieri contro luce fredda blu-viola che entra dalle vetrate; ombre profonde;
> - tanti oggetti raccontati a pixel: panche, inginocchiatoi, candelabri di ferro, statue di santi rovinate,
>   quadri anneriti, drappi strappati, lapidi, ex voto, ragnatele, calcinacci, una scala a pioli, secchi, libri di canto;
> - **nessun personaggio, nessuna scritta, nessun logo**;
> - formato **1536×1024**; il pavimento su cui si cammina è all'altezza dell'**83% dell'immagine** (circa y=850);
>   nella fascia tra il 40% e l'83% dell'altezza non mettere oggetti davanti che coprirebbero i personaggi;
> - i bordi sinistro e destro devono poter continuare nell'immagine successiva: stessa altezza del pavimento,
>   stesso muro, stessa luce.
>
> Rispondi solo "pronto" e aspetta le richieste dei singoli pezzi.

---

## 2. Un prompt per pezzo

**`ingresso.png`**
> Pezzo 1 di 9: l'ingresso. A sinistra l'interno della controfacciata con un grande portone di legno ferrato aperto, a sesto
> acuto, da cui entra una lama di luce lunare azzurra e si intravede la notte con la neve; acquasantiera di marmo, lapidi
> nel muro, una bussola di legno, i primi banchi. A destra il muro continua verso la navata.

**`navata_01.png`**
> Pezzo 2 di 9: la navata, prima campata. Continua il pezzo precedente. Pilastri a fascio, archi a sesto acuto, in alto
> una monofora con vetrata blu e rossa, un confessionale di legno scuro, un candelabro di ferro acceso, banchi.

**`navata_02.png`**
> Pezzo 3 di 9: continua la navata. Nicchia con statua di santo con una mano rotta, ex voto appesi, una cappellina laterale
> con candele votive accese, un drappo cremisi strappato.

**`navata_03.png`**
> Pezzo 4 di 9: continua la navata. Il pulpito di legno intagliato con la sua scaletta, un grande quadro annerito, calcinacci
> caduti dalla volta, una trave crollata appoggiata al muro (sullo sfondo, non davanti).

**`navata_04.png`**
> Pezzo 5 di 9: continua la navata. Una vetrata più grande e colorata che getta luce colorata sul pavimento, un
> inginocchiatoio, un organo a canne in alto sulla cantoria, ragnatele.

**`navata_05.png`**
> Pezzo 6 di 9: continua la navata. Fonte battesimale di pietra, stendardi delle confraternite, una scala a pioli e
> un'impalcatura di restauro abbandonata con secchi di calce.

**`navata_06.png`**
> Pezzo 7 di 9: continua la navata. Ultimi banchi, lampade a olio appese a catene, una lapide spezzata nel pavimento,
> tracce di cera colata, la luce che si fa più calda avvicinandosi all'altare.

**`navata_07.png`**
> Pezzo 8 di 9: continua la navata e prepara il presbiterio. Balaustra di marmo con cancelletto aperto, due grandi
> candelabri, la volta più alta, si intravede l'inizio dell'abside a destra.

**`altare.png`**
> Pezzo 9 di 9: l'arena finale, un'inquadratura monumentale e simmetrica. Al centro l'altare maggiore di marmo con
> tovaglia ricamata e candele accese, sopra un **grande rosone gotico policromo** che domina la parete di fondo e
> proietta luce colorata sul pavimento; ai lati due candelabri alti, colonne, drappi. Pavimento libero e piano per il
> combattimento, all'83% dell'altezza. A sinistra il bordo continua il pezzo precedente.

---

## 3. Facoltativo: primo piano

**`primo_piano_01.png`**
> Stesso stile. Su **fondo verde puro #00FF00** (nient'altro sul fondo): una fila di schienali di banchi di legno scuro
> visti di lato, solo nella parte più bassa dell'immagine (sotto l'85% dell'altezza), più due candelabri di ferro alti
> e sottili ai lati. Formato 1536×1024. Gli oggetti sono in controluce, molto scuri.

---

## 4. Se un pezzo non va

- **pavimento troppo alto o basso**: "rifai uguale, ma con il pavimento all'83% dell'altezza";
- **prospettiva**: "rifai in vista laterale piatta, senza punto di fuga";
- **troppo liscio o sfocato**: "più pixel art, pixel più grandi e netti, più dettagli a mano, niente sfumature";
- **non continua il precedente**: "il bordo sinistro deve continuare esattamente il bordo destro del pezzo precedente".
