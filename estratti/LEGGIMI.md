# estratti/ — pose e oggetti singoli (GENERATO, non modificare qui)

Questa cartella viene rigenerata da `sh tools/build_all.sh`: contiene ogni posa e ogni oggetto
ritagliati dai fogli di `grafica/`, già puliti (sfondo e aloni tolti), alla risoluzione originale.

| Cartella | Contenuto |
| --- | --- |
| `hero_<nome>/` | 27 pose per eroe (`idle`, `run_01`…`run_08`, `shoot`, `death_03`…) |
| `vil_<nome>/`, `boss_giova/` | 13 pose (`walk_01`…, `attack_01`…, `hit`, `death_01`…) |
| `boss_ettore/` | 17 pose |
| `oggetti/` | 38 oggetti scenici |
| `armi/` | casse, icone, proiettili, lampi, esplosioni, polvere |

## Come ritoccare una posa (per chi lavora sulla grafica, anche ChatGPT)

1. Prendete il file da qui, per esempio `estratti/hero_marco/shoot.png`.
2. Ritoccatelo **mantenendo la stessa tela** (stessa larghezza e altezza in pixel), lo sfondo
   trasparente, il personaggio rivolto a destra e i piedi sul bordo basso, nella stessa posizione.
3. Salvatelo con **lo stesso nome** in `grafica/ritocchi/<stessa cartella>/`, per esempio
   `grafica/ritocchi/hero_marco/shoot.png`.
4. Alla rigenerazione il gioco usa il ritocco al posto della posa originale. Per tornare indietro
   basta cancellare il file in `grafica/ritocchi/`.

Non cambiate proporzioni, dimensione del personaggio o punto d'appoggio: le altre pose
della stessa animazione devono combaciare.
