# Bar Bucaneve - prototipo 1.1

Aprite `bar-bucaneve.html` con Chrome, Edge o Firefox (doppio clic). Non serve installare nulla, non serve internet.

## Comandi
Nel menu iniziale scegliete **1 GIOCATORE** o **2 GIOCATORI** (frecce su/giù e Invio, oppure subito i tasti 1 e 2).

### Un giocatore
| Tasto | Azione |
| --- | --- |
| Frecce (o WASD) | muoversi, freccia giù = accovacciarsi, freccia su = sparare in alto |
| J (o M, Z) | sparare; da vicino diventa un pugno |
| K (o X, Spazio) | saltare |
| L (o C) | bomba |
| I | pugno |

### Due giocatori, stessa tastiera
| | muoversi | sparare | saltare | bomba | pugno |
| --- | --- | --- | --- | --- | --- |
| **Giocatore 1** | frecce | M | L | K | J |
| **Giocatore 2** | W A S D | 1 | 2 | 3 | 4 |

Ognuno ha le sue vite, i suoi punti, la sua arma. Sopra la testa c'è l'etichetta 1P / 2P. Chi resta senza vite aspetta fuori; se cadono tutti e due, CONTINUE. Ettore e Giova hanno più vita quando siete in due.

### Per tutti
| Tasto | Azione |
| --- | --- |
| Esc (o P) | pausa; in pausa L accende/spegne l'audio |
| F | schermo intero (anche durante la partita) |
| Su/Giù nella scelta personaggio | difficoltà: FACILE, NORMALE, DIFFICILE |
| Invio | conferma nei menu |
| Pad (Xbox) | il primo pad è il giocatore 1, il secondo il giocatore 2: levetta/croce muovi, A salta, X o dorsali sparano, B bomba, Y pugno, Start pausa |

### Telefono e tablet
I comandi compaiono da soli: croce a sinistra (su = mirare in alto, giù = accovacciarsi), a destra SPARA, SALTA, BOMBA e PUGNO, in alto pausa (II) e schermo intero. Si possono premere più tasti insieme. Nei menu si tocca: sul titolo "1 GIOCATORE" o "2 GIOCATORI", sulla scelta si tocca il personaggio (due volte per confermare) e la scritta della difficoltà per cambiarla. In due giocatori i comandi touch sono del giocatore 1. Giocate in orizzontale; un tocco sul titolo mette anche lo schermo intero.
Su un computer con schermo touch il pannello compare alla prima ditata e sparisce appena si usa la tastiera.

## Il livello
1. Strada di Ponte Arche: gelatai (corrono addosso con la paletta) e ubriachi (lanciano bottiglie ad arco: saltate o spostatevi). Le casse danno armi nuove. **Bombole e fusti rossi esplodono**: sparateci quando ci passano accanto i nemici e ne porta via diversi in un colpo (ma state lontani, l'esplosione fa male anche a voi). Bidoni e cassonetti si sfasciano e a volte lasciano un premio. Regola pratica: le botte e le casse di legno fanno parte del disegno del fondale e non si rompono, tutto quello che è di metallo sì.
2. Davanti al Bar Bucaneve: **Giova**. Quando lampeggia e grida "!", sta per caricare: saltatelo.
3. Dentro, in cantina: **Ettore**, in tre fasi. Sopra la testa compare sempre un avviso che dice *cosa* sta per fare, e ogni attacco si schiva in modo diverso:
   - **"!"** doppietta mirata addosso: spostatevi o abbassatevi;
   - **"!!"** ventaglio largo di pallettoni, dal pavimento al soffitto, con **un varco**: trovate il buco e infilatevici;
   - **"BOTTIGLIE!"** cadono dall'alto sui cerchietti rossi segnati a terra: cambiate posto;
   - **"SALTA!"** bottiglia che rotola sul pavimento: si salta, abbassarsi non basta.
   Da vicino non è più al sicuro: sotto il metro vi tira una botta con il calcio della doppietta.
   Mentre **ricarica** è scoperto e prende più danni: è lì che si recupera terreno. Sulla sua barra della vita ci sono due tacche: al 62% si arrabbia (e chiama due gelatai), sotto il 28% passa all'ultima fase, più veloce, con quattro scariche di fila e due rinforzi.
4. Alla fine: punteggio e classifica (salvata nel browser di quel computer).

## Da provare e riferirmi
- Difficoltà: troppo facile o troppo difficile? Ho alzato parecchio la pressione (nemici più veloci, che attaccano più spesso, e ondate più numerose). Se risulta troppo dura, ditemelo: si abbassa cambiando un numero solo. Ricordate che FACILE adesso è davvero più morbido.
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
- Musica: "strada" in strada e da Giova, "battaglia-ettore" in cantina; si abbassa quando parlano i personaggi.
- Niente più aloni chiari attorno ai personaggi; gli occhiali di Giova non sono più trasparenti.

## Novità della 0.7
- Nuovi fondali della strada e nuova cantina. I personaggi camminano sulla strada (non più sul marciapiede) e in cantina sul pavimento; i marciapiedi sono alla stessa altezza in tutti i pezzi.
- Tutte le immagini hanno la stessa grandezza di pixel (2x2 pixel dello schermo per ogni pixel dei disegni): personaggi, casse, effetti e fondali sono coerenti.
- Musica come suoneria polifonica: le note dei vostri brani suonate da onde quadre a 3 voci + basso + tamburi, senza voce.
- Più voci: gelatai e ubriachi parlano (voci ricavate cambiando il timbro delle registrazioni), la gelataia a volte lascia le bombe.
- Proiettili del mitra, fiamme, vetri e schegge ora usano la vostra grafica.

## Novità della 0.8
- Musica della strada: il nuovo brano strumentale, reso suoneria polifonica 8 bit.
- Ogni posa e ogni oggetto ritagliati e puliti sono in `estratti/`; per correggerne uno basta metterlo in `grafica/ritocchi/` (vedi `estratti/LEGGIMI.md`).

## Novità della 1.1
- Musica vera (i vostri mp3 interi, non più la suoneria a onde quadre), a volume basso rispetto a voci ed effetti.
- Due giocatori sulla stessa tastiera, comandi touch per telefono e tablet, pad collegato davvero.
- Ettore con più del doppio della vita e molto più rapido a sparare.
