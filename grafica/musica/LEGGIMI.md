# Musica

Mettete qui i brani in `.mp3`. Servono due pezzi:

| Dove suona | Nome del file |
| --- | --- |
| Strada di Ponte Arche (e Giova) | `Strada.mp3` |
| Cantina, scontro con Ettore | `Ettore.mp3` |

Maiuscole e minuscole non contano, e il gioco riconosce anche nomi simili
(per esempio `battaglia-ettore.mp3` va bene lo stesso).

**Cosa succede ai brani.** Dalla 1.1 vengono usati così come sono: interi, in ciclo, con
una breve dissolvenza all'inizio e alla fine. Il build li ricomprime in mp3 stereo a 80 kbit
e li porta tutti allo stesso livello sonoro (-16 LUFS), quindi un brano registrato piano non
suona più piano di un altro. Il volume in gioco è basso di proposito (sotto voci ed effetti,
e si abbassa ancora quando parla un personaggio): si regola con `VOL_MUSICA` in
`src/core/audio.ts`.

Il file finisce dentro `bar-bucaneve.html` (circa 3 MB ogni 4 minuti di brano): evitate brani
molto lunghi o il file diventa pesante da scaricare.

Dopo aver caricato un brano, scrivetemi in chat: **"prendi gli aggiornamenti"**.
