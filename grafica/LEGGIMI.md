# Cartella `grafica`: qui mettete i vostri file

Tutto quello che vedete e sentite nel gioco parte da qui. Voi caricate i file, poi in chat scrivete **"prendi gli aggiornamenti"**: io li scarico, rigenero il gioco, lo provo e carico la nuova versione di `bar-bucaneve.html`. **Niente succede in automatico:** finché non me lo dite, non tocco nulla.

Per chiedere **modifiche al gioco** (non solo grafica: nemici, boss, audio, livelli) usate la cartella [`richieste/`](../richieste/LEGGIMI.md) o una Issue "Richiesta di modifica".

## Come caricare un file (dal sito di GitHub)

1. Aprite https://github.com/mattrx86/bar-bucaneve ed entrate nella cartella giusta (es. `grafica` → `personaggi`).
2. In alto a destra: **Add file → Upload files**.
3. Trascinate i file. Se il file ha **lo stesso nome** di uno già presente, lo sostituisce.
4. In basso scrivete due parole su cosa avete cambiato (es. "nuovo foglio di Paolo") e premete **Commit changes**.

Per cancellare un file: apritelo, menu **⋯** in alto a destra → **Delete file** → Commit changes.

## Cosa va in ogni cartella

| Cartella | Cosa | Nome dei file | Formato |
| --- | --- | --- | --- |
| `personaggi/` | un foglio per eroe, **27 pose** in 5 righe (vedi sotto) | il nome dell'eroe: `Paolo.png`, `Marco.png`… Il nome del file diventa il nome nel gioco | PNG, sfondo trasparente, bianco o nero |
| `livello1-strada/fondali/` | facciate della strada, si attaccano **in ordine di nome** | `01.png`, `02.png`, `03.png`… | PNG pieno, formato orizzontale come gli attuali |
| `livello1-strada/gelatai/` | un foglio per ogni gelataio, **13 pose** | nome libero (`gelataia.png`) | PNG |
| `livello1-strada/ubriachi/` | un foglio per ogni ubriaco, **13 pose** | nome libero | PNG |
| `livello2-bucaneve/fondale/` | facciata del Bar Bucaneve (arena di Giova) | `esterno.png` | PNG pieno |
| `livello2-bucaneve/boss-giova/` | Giova, **13 pose** | `giova.png` | PNG |
| `livello3-cantina/fondale/` | la cantina (arena di Ettore) | `cantina.png` | PNG pieno |
| `livello3-cantina/boss-ettore/` | Ettore: pose (**17**) e ritratto grande | `pose.png`, `ritratto.png` | PNG |
| `oggetti/` | foglio degli oggetti scenici (38 oggetti in 5 righe) | `oggetti.png` | PNG trasparente |
| `voci/` | voci registrate | vedi elenco sotto | `.m4a` `.mp3` `.wav` (anche dal telefono) |
| `musica/` | brani (non ancora usati nel gioco) | `strada`, `boss`… | `.mp3` |

I nomi dei file **non devono avere spazi né accenti**.

### Disposizione dei fogli (il programma taglia le pose in base alla posizione)

**Eroi, 5 righe:**
1. fermo, salto, accovacciato, spara, spara in alto, accovacciato che spara, salto che spara (7)
2. colpito, morte 1, morte 2, morte 3 a terra (4)
3. corsa: 8 fotogrammi
4. pugno ×3, lancio bomba ×3 (6)
5. esultanza ×2

**Gelatai, ubriachi, Giova, 3 righe:** camminata ×6 · attacco ×3 · colpito + morte ×3

**Ettore (`pose.png`), 4 righe:** camminata ×4 · fermo, mira 1, mira 2, sparo · rinculo, ricarica ×3 · colpito + morte ×4

Regole: personaggio rivolto **a destra**, pose **ben distanziate** (non devono toccarsi), stessa scala in tutto il foglio, niente scritte.

### Voci: i nomi che il gioco usa

| File | Quando si sente |
| --- | --- |
| `giova_ciao` | Giova entra in scena |
| `ettore_intro` | presentazione di Ettore ("vei chi che te mato") |
| `ettore_borbottio` | Ettore ricarica la doppietta |
| `ettore_dunebuggy` | Ettore si arrabbia (metà vita) |
| `ettore_muore` | Ettore sconfitto |
| `gelataio_pepite` | ogni tanto quando muore un nemico |

### Voci che il gioco usa da solo, se le registrate

Nome del file = `chi_quando`. Potete fare più versioni della stessa frase aggiungendo `_1`, `_2`… (es. `ubriaco_spawn_1.m4a`, `ubriaco_spawn_2.m4a`): il gioco ne sceglie una a caso.

| chi | quando (`_spawn` entra in scena, `_attacco`, `_lancio`, `_muore`…) |
| --- | --- |
| `gelataia`, `gelataio` | `_spawn`, `_attacco`, `_lancio`, `_muore`; la gelataia anche `_bombe` ("prenditi queste bombe!", quando lascia le bombe) |
| `ubriaca`, `ubriaco` | `_spawn`, `_lancio`, `_muore` |
| `giova` | `_ciao`, `_carica`, `_muore` |
| ogni eroe (`daniele`, `marco`, `paolo`…) oppure `eroe` per tutti | `_via` (inizio), `_colpito`, `_muore`, `_arma` (prende un'arma), `_combo` |

Finché una voce manca, per gelatai, ubriachi e Giova ne ricavo una cambiando il timbro delle registrazioni che ci sono già (più acuta, più grave, "ubriaca"). Appena caricate quella vera, vince la vostra.

## Ritocchi di singole pose

Ogni posa ritagliata e pulita si trova in `estratti/` (fuori da `grafica/`). Per correggerne una
senza rifare tutto il foglio, mettete la versione ritoccata, **stessa tela e stesso nome**, in
`grafica/ritocchi/<cartella>/<posa>.png`. Istruzioni complete in `estratti/LEGGIMI.md`.

## Attenzione

- Il repository è **pubblico**: chiunque può vedere e scaricare questi file (anche le voci).
- Non serve ridimensionare niente: scala, ritaglio, pulizia dei bordi e allineamento li faccio io.
