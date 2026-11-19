# Audio — Chiesa Gotica

Caricare qui esclusivamente audio destinato al livello della chiesa. L'audio verrà poi collegato alla pipeline esistente del gioco: non modificare direttamente i file audio globali o la scena di gioco.

## Cartelle
- `music/`: musica di sottofondo del livello e dell'arena.
- `sfx/`: effetti sonori ambientali e interazioni dello scenario.

## Formati consigliati
- Musica: MP3 o OGG, preferibilmente loopabile senza click; WAV solo per sorgenti brevi/non compresse.
- Effetti: WAV o OGG; MP3 accettato se già usato dalla pipeline.
- Conservare sempre una copia della sorgente originale.

## Naming suggerito
Usare nomi descrittivi, minuscoli, senza spazi e senza accenti:
- `church_navata.mp3` — musica della navata.
- `church_altar_boss.mp3` — musica dell'arena dell'altare.
- `church_ambience_wind.ogg` — vento/ambiente interno.
- `church_candle_loop.wav` — crepitio leggero delle candele.
- `church_door_open.wav` — portone.
- `church_bell.wav` — campana.
- `church_stone_step.wav` — passi su pietra, se richiesti.

Non è necessario rinominare i file prima del caricamento: se hanno già nomi propri, mantienili e annota cosa rappresentano.

## Nota
Non caricare qui musica o effetti di Griso/Don Antonio finché non decidiamo se appartengono al livello o ai singoli boss. In quel caso indicare chiaramente la destinazione nel nome o in un README dedicato.
