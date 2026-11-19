# Musica

Mettete qui i brani in `.mp3`. Servono due pezzi:

| Dove suona | Nome del file |
| --- | --- |
| Strada di Ponte Arche | `Strada.mp3` |
| Cantina, scontro con Ettore | `Ettore.mp3` |

Maiuscole e minuscole non contano, e il gioco riconosce anche nomi simili
(per esempio `battaglia-ettore.mp3` va bene lo stesso).

**Cosa succede ai brani.** Non vengono usati così come sono: `tools/chiptune.py` li
ricava nota per nota e li risuona con onde quadre, basso triangolare e rumore per la
batteria, cioè li trasforma in una suoneria polifonica da arcade anni 90. Vengono presi
i primi 150 secondi, che poi girano in ciclo. Quindi scegliete brani con un tema
riconoscibile: le voci spariscono, resta la melodia.

Dopo aver caricato un brano, scrivetemi in chat: **"prendi gli aggiornamenti"**.
