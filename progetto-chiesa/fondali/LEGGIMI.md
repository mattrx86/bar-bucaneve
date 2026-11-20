# Fondali dipinti della chiesa (HOLY SLUG)

Mettete qui le immagini dipinte della chiesa. Quando ci sono, il gioco le usa **al posto** dei fondali
disegnati da codice. Quando non ci sono, restano quelli disegnati da codice.
Il metodo è lo stesso dei fondali della strada di Buca Slug: le immagini vengono scalate, allineate sulla
riga dei piedi e cucite una dopo l'altra con una sfumatura sulla giunzione.

## File da caricare (nomi esatti, PNG o JPG)

| File | Cosa contiene | Quanti |
|---|---|---|
| `ingresso.png` | interno della controfacciata con il portone monumentale (il giocatore parte qui, a sinistra) | 1 |
| `navata_01.png` … `navata_07.png` | la navata, campata dopo campata, in ordine da sinistra a destra | 6–8 |
| `altare.png` | l'arena dei boss: altare al centro, grande rosone sopra, candelabri; deve stare tutto in un'inquadratura | 1 |
| `primo_piano_01.png` … | *(facoltativo)* oggetti davanti ai personaggi (panche, candelabri, colonne) su **fondo verde puro #00FF00** o PNG trasparente | 0–3 |
| `lontano_01.png` … | *(facoltativo, avanzato)* parete lontana per la parallasse; serve solo se nei pezzi principali archi e finestre sono **magenta puro #FF00FF** o trasparenti | 0–2 |

**Misure consigliate:** ogni immagine **1536×1024** (formato 3:2), come quelle della strada.
Con 1 ingresso, 7 navate e 1 altare la chiesa viene lunga circa 2900 px di gioco, quanto quella di adesso.
Ondate di nemici e casse si ridistribuiscono da sole sulla lunghezza reale.

## Regole perché i pezzi si cuciano bene

1. **Riga dei piedi all'83% dell'altezza.** In un'immagine alta 1024 il pavimento su cui camminano i personaggi deve
   stare intorno a **y = 850**. Sotto ci può essere ancora pavimento: viene tagliato.
2. **Nessun personaggio** e nessuna scritta nelle immagini.
3. **Vista laterale piatta** (come un palcoscenico), senza prospettiva a punto di fuga. Il pavimento è una fascia orizzontale.
4. **Bordi che continuano:** il bordo destro di ogni pezzo e il bordo sinistro del successivo devono avere la stessa
   altezza di pavimento, lo stesso muro e la stessa luce. Il programma cerca da solo la giunzione migliore nei 150 px vicini ai bordi.
5. **Fascia di gioco pulita:** tra il 40% e l'83% dell'altezza (dove si muovono i personaggi) niente oggetti in primo
   piano che coprano. Dettagli ricchi sopra, sotto e sullo sfondo.
6. **Stessa palette e stessa luce** in tutti i pezzi: generateli nella stessa conversazione, chiedendo ogni volta
   "stesso stile, stessa palette, continua il pezzo precedente".

## Regolazioni facoltative: `fondali.json`

```json
{
  "piede_predefinito": 0.833,
  "piede": { "navata_03.png": 0.85, "altare.png": 0.86 },
  "fiamme": [ { "x": 2830, "y": 120, "k": 0.8 } ],
  "luci":   [ { "x": 2830, "y": 118, "r": 50 }, { "x": 2908, "y": 60, "r": 90, "rosone": true } ],
  "rosone": { "x": 2908, "y": 60, "r": 45 }
}
```

- `piede`: se in un'immagine il pavimento non è all'83%, si indica qui la frazione giusta per quel file
  (es. 0.85 = pavimento a 85% dell'altezza).
- `fiamme` e `luci`: candele animate e aloni da mettere sopra i punti del dipinto, in pixel di gioco sul fondale
  cucito. Dopo la prima build il fondale cucito si trova in `progetto-chiesa/export/chiesa_navata_dipinta.png`: lì si leggono le
  coordinate (dividere i pixel dell'immagine per 1,5).

## Dopo il caricamento

`sh tools/build_all.sh` (oppure chiedete a Claude di "prendere i fondali della chiesa"). Il resoconto scrive
`fondali: DIPINTI` se li ha trovati.
