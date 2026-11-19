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
