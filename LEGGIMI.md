# Bar Bucaneve - prototipo 0.6

Aprite `bar-bucaneve.html` con Chrome, Edge o Firefox (doppio clic). Non serve installare nulla, non serve internet.

## Comandi
| Tasto | Azione |
| --- | --- |
| Frecce (o WASD) | muoversi, freccia giù = accovacciarsi, freccia su = sparare in alto |
| J (o Z) | sparare; da vicino diventa un pugno |
| K (o X, Spazio) | saltare |
| L (o C) | bomba |
| I | pugno |
| Esc (o P) | pausa; in pausa L accende/spegne l'audio |
| F | schermo intero (anche durante la partita) |
| Su/Giù nella scelta personaggio | difficoltà: FACILE, NORMALE, DIFFICILE |
| Pad (Xbox) | levetta/croce muovi, A salta, X o dorsali sparano, B bomba, Y pugno, Start pausa |
| Invio | conferma nei menu |

## Il livello
1. Strada di Ponte Arche: gelatai (corrono addosso con la paletta) e ubriachi (lanciano bottiglie ad arco: saltate o spostatevi). Le casse danno armi nuove.
2. Davanti al Bar Bucaneve: **Giova**. Quando lampeggia e grida "!", sta per caricare: saltatelo.
3. Dentro, in cantina: **Ettore**. La linea rossa mostra dove sparerà: spostatevi, accovacciatevi o saltate. Mentre ricarica è scoperto e prende più danni. A metà vita si arrabbia e chiama due gelatai.
4. Alla fine: punteggio e classifica (salvata nel browser di quel computer).

## Da provare e riferirmi
- Difficoltà: troppo facile o troppo difficile? (i test automatici sono fatti con un giocatore invincibile)
- Velocità di corsa e altezza del salto.
- Se qualche posa è sbagliata o storta.
- Audio provvisorio (generato dal codice). Il pad non è ancora stato provato.

## Novità della 0.3
- Colpi che "pesano": lampo bianco, piccolo rinculo, micro-pausa, bossoli.
- CONTINUE? 9..0: si riparte dalla fase in cui si è morti (strada o cantina), i punti restano.
- Difficoltà facile / normale / difficile.
- Combo (uccisioni ravvicinate moltiplicano i punti), bonus pugno, bonus PERFETTO se battete un boss senza essere colpiti.
- Scala a pixel interi e schermo intero con F.
- Nuovi nemici: gelataio che lancia palline (abbassatevi), ubriaco kamikaze (grida "!" e si butta: saltatelo), ubriaco sul balcone (sparate in alto, non blocca l'avanzata).
- Oggetti scenici in strada e in cantina; alcuni si rompono (casse, botti) e possono lasciare bombe o un gelato che ridà vita; fusti rossi e bombole esplodono (fanno male anche a voi).
- Carattere pixel in stile Metal Slug e HUD rifatto.
- Le vostre voci: Giova, Ettore (presentazione, ricarica, rabbia, morte), il gelataio ogni tanto.

## Novità della 0.4
- Niente più nemici sui balconi (sembravano volare sopra le case).
- Giunzioni della strada rifatte: niente più "palazzi fantasma".
- Checkpoint: con il CONTINUE si riparte da metà strada (dopo il cartello CHECKPOINT!) o direttamente da Giova, non dall'inizio.
- I menu si confermano solo con Invio o Spazio (sparando o saltando non si saltano più per sbaglio).
- I pallettoni di Ettore sono un po' più lenti: da lontano si schivano meglio.
- Fascia scura dietro i numeri in alto, più leggibili.

## Novità della 0.5
- Grafica molto più definita: il gioco ragiona sempre in 384x216 (stile Metal Slug), ma ora disegna a 3 volte quella risoluzione (1152x648). Personaggi, boss, oggetti e fondali mostrano tutti i dettagli dei vostri disegni invece di essere ridotti a pochi pixel.
- Il gioco si adatta alla finestra mantenendo le proporzioni.

## Novità della 0.6
- Paolo giocabile.
- La vostra grafica per casse armi (si aprono quando le prendete), proiettili, razzi, granate, lampi di sparo, esplosioni con cratere, scintille, polvere e icone delle armi nell'HUD.
- Musica: "strada" in strada e da Giova, "battaglia-ettore" in cantina, resa in stile 8 bit; si abbassa quando parlano i personaggi.
- Niente più aloni chiari attorno ai personaggi; gli occhiali di Giova non sono più trasparenti.
