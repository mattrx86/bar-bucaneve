# Manifest asset — Holy Slug

Coordinate di riferimento: viewport logica 384×216, zoom 3×. I file SVG sono sorgenti vettoriali pixel-art modulari: Claude deve rasterizzarli/splittarli in PNG trasparenti e validarli in gioco. Non sono ancora tutti PNG finali né sprite già caricati nel runtime.

| Area | File | Contenuto | Stato |
|---|---|---|---|
| Background | `background/church_parallax.svg` | Navata, muratura, colonne, finestre | Sorgente SVG presente |
| Background | `background/entrance_portal.svg` | Portale monumentale d'ingresso e portone | Sorgente SVG presente |
| Architecture | `architecture/gothic_modules.svg` | Colonne, archi, portali, finestre | Sorgente SVG presente |
| Parallax | `parallax/parallax_layers.svg` | Fondale profondo, archi intermedi, pavimento | Sorgente SVG presente; gruppi separabili |
| Tilesets | `tilesets/floor_carpet.svg` | Pavimento in pietra e tappeto | Sorgente SVG presente |
| Tilesets | `tilesets/stone_floor_variants.svg` | 4 tile 64×64: pietra, variante, tappeto, crepato | Sorgente SVG presente |
| Props | `props/church_props.svg` | Panca, candeliere, croce, quadro, statua, arredi | Sorgente SVG presente |
| Foreground | `foreground/foreground_props.svg` | Panca, candelabro, detriti, drappo | Sorgente SVG presente; gruppi separabili |
| Altar | `altar/altar_and_rosette.svg` | Composizione altare e rosone | Sorgente SVG presente |
| Altar | `altar/altar_front_detail.svg` | Fronte altare e candele | Sorgente SVG presente |
| Stained glass | `stained-glass/great_rose_window.svg` | Rosone gotico policromo | Sorgente SVG presente |
| Lighting | `lighting/candle_flame.svg` | Pose fiamma preliminari | Sorgente SVG presente |
| Animations | `animations/flames_and_candles.svg` | Strip 4 frame fiamma + candela | Sorgente SVG presente; frame 32×48 |
| Character reference | `characters/chierichetto/` | 2 PNG caricati dall'utente | Riferimenti originali presenti |
| Character reference | `characters/don-antonio/` | 11 JPEG caricati dall'utente | Riferimenti originali presenti; identificare il design corretto |
| Character reference | `characters/griso/` | 1 PNG caricato dall'utente | Riferimento originale presente |
| Character reference | `characters/suora/` | 2 PNG caricati dall'utente | Riferimenti originali presenti |
| Audio | `audio/music/`, `audio/sfx/` | Musiche ed effetti | Verificare file effettivi nei branch del gioco |

## Lavoro tecnico ancora necessario
- Rasterizzare e ritagliare gli SVG in PNG con alpha; rispettare i viewBox e i gruppi nominati.
- Non usare screenshot degli atlas come sprite singoli.
- Verificare pixel art a scala nativa, trasparenza, baseline, pivot, dimensioni e continuità tile.
- Creare ulteriori varianti solo se servono al layout finale.
- Non inventare sprite alternativi di Griso o Don Antonio: usare le immagini originali fornite dall'utente e confrontarle visivamente.
- Aggiornare questo manifest con ogni PNG effettivamente esportato e con le sue dimensioni.

## Vincoli
- Non modificare gameplay, collisioni, armi, controlli, HUD, punteggi o salvataggi.
- Non cancellare o sovrascrivere gli asset originali di Buca Slug.
- Non considerare completata l'integrazione prima di build, test e screenshot verificati.

---

## Export effettivi (Buca Slug 1.4 / HOLY SLUG) — generati da `tools/build_chiesa.py`

Decisione di progetto (richiesta del 19/11): la chiesa **non sostituisce la cantina**. È un livello nuovo
(`fase: 'chiesa'`) che parte dopo la vittoria su Ettore. Cantina, strada e Bucaneve restano invariati.

Tutti i PNG sono in `progetto-chiesa/export/`, trasparenti, già alla densità del gioco (1,5 pixel di texture
per pixel di gioco). Si rigenerano con `sh tools/build_all.sh` (oppure solo
`python3 tools/build_chiesa.py progetto-chiesa src/content/chiesa.ts anteprime`): non vanno ritoccati a mano,
si correggono gli originali o i parametri dello script.

### Personaggi (fogli a celle uguali; pivot = centro dei piedi; baseline = riga `foot` della cella)
| File | Origine | Cella (px texture) | Baseline | Altezza in gioco | Pose |
|---|---|---|---|---|---|
| `vil_chierichetto_rosso.png` | `characters/chierichetto/Spritesheet del chierichetto pixel art.png` | 118×87 | 85 | 44 | walk_01–06, attack_01–03, hit, death_01–03, idle |
| `vil_chierichetto_blu.png` | `characters/chierichetto/Sprites del chierichetto in pixel art blu e oro.png` | 118×85 | 83 | 44 | come sopra |
| `vil_suora_blu.png` | `characters/suora/Foglio Sprite della Suora Guerriera.png` | 128×90 | 88 | 48 | come sopra |
| `vil_suora_nera.png` | `characters/suora/Foglio sprite pixel art della suora guerriera.png` | 130×86 | 84 | 48 | come sopra |
| `boss_griso.png` | `characters/griso/Sprite di Sacerdote Pixel Art.png` | 204×115 | 113 | 68 | idle, idle_02, walk_01–04, pugni, frusta_01–03, bibbia_01–04, hit, recupero_01–02 |
| `boss_donantonio.png` | `characters/don-antonio/` (foglio 10.40.01 + le 10 pose con la teglia) | 212×133 | 131 | 80 | idle, walk_01–04, intinge_01–02, alza, asperge_01–02, hit, death_01–04, lasagna_basso/petto/alza/alto/china, schianto_01–02 |

Note sui riferimenti:
- **Don Antonio**: riferimento definitivo = foglio `WhatsApp Image 2026-11-19 at 10.40.01 PM.jpeg` (camminata, aspersorio,
  caduta). Le 10 immagini `10.48.19 PM*.jpeg` sono pose singole con la teglia: hanno una scala diversa, riallineata sulla posa
  eretta con la teglia al petto. La posa `(5)` (teglia a terra, mani protese) non è usata.
- **Griso**: il foglio non ha pose di colpo/caduta: in gioco cade ruotando sulla posa `hit` (nessun disegno inventato).
  Le due pose della frusta col rosario si toccano nel foglio e vengono separate sulla colonna più vuota.
- **Suora blu**: due pose d'attacco sono fuse nel foglio originale; si usano le tre pose pulite.

### Proiettili e oggetti (`fx_*.png`, misure in pixel di gioco)
| File | Origine | Misure |
|---|---|---|
| `fx_turibolo_rosso.png`, `fx_turibolo_blu.png` | proiettile nei fogli dei chierichetti | 19×9, 19×11 |
| `fx_rosario_blu.png`, `fx_rosario_nera.png` | proiettile nei fogli delle suore | 17×6 |
| `fx_bibbia.png` | Bibbia in volo nel foglio di Griso | 16×12 |
| `fx_lasagna.png` | teglia ritagliata dalla posa `10.48.19 PM(1)` (mani tolte) | 31×11 |
| `fx_goccia.png` | goccia d'acqua santa disegnata (non è un personaggio) | 3×5 |
| `fx_fiamma_0…3.png` | `animations/flames_and_candles.svg`, gruppi `flame-0…3` (32×48 → alti 10 px) | 6×10 |
| `fx_porta.png` | `background/entrance_portal.svg`, gruppo `door` (si divide in due ante in gioco) | 162×165 |

### Fondali (strisce larghe, in gioco divise in pezzi da 512 px)
| File | Contenuto | Larghezza (gioco) | Scorrimento |
|---|---|---|---|
| `chiesa_lontano.png` | parete con monofore a vetrate, nicchie con statua, quadri, stendardi | 1750 | 0,5 (parallasse) |
| `chiesa_navata.png` | controfacciata col portale (0–430), navata con pilastri e archi acuti (430–2716), abside con rosone e altare (2716–3100), pavimento e tappeto | 3100 | 1 (mondo) |
| `chiesa_primo.png` | schienali delle panche (sotto i piedi) e stendardi in alto, scuriti in controluce | 3516 | 1,15 |

Moduli SVG usati: `stone_floor_variants.svg` (4 tile), `entrance_portal.svg` (pietra, decori, torce, portone),
`great_rose_window.svg`, `altar_front_detail.svg`, `foreground_props.svg` (candelabro, panca, macerie, stendardo),
`flames_and_candles.svg` (candela e fiamme), `church_props.svg` (statua, quadro, lapide, separati per componenti).
Non usati: `church_parallax.svg`, `parallax_layers.svg`, `gothic_modules.svg`, `altar_and_rosette.svg`,
`candle_flame.svg`, `floor_carpet.svg` (sostituiti da muratura, archi e tappeto disegnati a pixel nello script, con la stessa palette).
Le tinte piatte degli SVG ricevono grana retinata, luce dall'alto a sinistra, ombra e contorno scuro.

Posizioni di fiamme, aloni, raggi di luce, portone e rosone: esportate in `CH_BG` (`src/content/chiesa.ts`).
