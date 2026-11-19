# Effetti sonori delle armi (campioni)

Tutti i file `.ogg` di questa cartella vengono dal pacchetto **"25 CC0 bang / firework SFX"** di **rubberduck**
(OpenGameArt: https://opengameart.org/content/25-cc0-bang-firework-sfx), licenza **CC0 1.0 (ppubblico dominio)**:
uso libero anche commerciale, nessuna attribuzione richiesta (la citiamo lo stesso per correttezza).

Copia scaricata dal repository pubblico https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds
(cartella `25-CC0-bang-sfx`, anch'esso CC0-1.0; testo della licenza in `LICENSE-CC0.txt`).

| File usato | Dove suona |
| --- | --- |
| `shot_02`, `shot_03` | pistola |
| `shot_01`, `shot_03` | mitragliatrice (ritagliati a ~0,12 s) |
| `bang_06`, `bang_09` | fucile a pompa |
| `cannon_02` | lancio del lanciarazzi |
| `bang_03`, `cannon_01`, `cannon_04` | esplosioni, schianto della moto |
| `bang_06` + `bang_09` | doppietta di Ettore (due botti sfalsati, intonati piu' in basso) |

`tools/build_extra.py` li ritaglia, li intona, li filtra e li incorpora come WAV a 32 kHz mono. I suoni sintetizzati
del codice (`src/core/audio.ts`) restano come rinforzo dei bassi e come ripiego se un campione non si carica.
